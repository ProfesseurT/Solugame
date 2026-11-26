// Les véhicules du joueur (tracteur, van, voitures empruntées) et les voitures de la départementale.
import * as THREE from 'three';
import { angle, versAngle, borne, bruit, amortir as lisser } from './outils.js';
import { sol as solEn, chaussee } from './relief.js';

/* ---------------------------------------------------------------- nature du sol
   D'après les surfaces dessinées dans monde.js (routes, place, cour, parcelles) : à reprendre
   si une route ou une cour change de place. Sert au roulement du tracteur, à ses cahots et aux pas.
   Renvoie 'asphalte', 'paves', 'gravier', 'herbe' ou 'vigne' (terre des parcelles). */
export function natureSol(x, z, col) {
  if (col) {
    const P = col.parcelles;
    for (let i = 0; i < P.length; i++) { const q = P[i]; if (x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1) return 'vigne'; }
  }
  if (x > 76 && x < 114 && z > -63 && z < -29) return 'paves';            // place
  if (x > 87 && x < 103 && z > -82 && z < -72) return 'paves';            // parvis de la mairie
  if (x > 25 && x < 155 && ((z > 2.5 && z < 6.5) || (z > 13.5 && z < 17.5))) return 'paves'; // trottoirs du bourg
  if (x > 70 && x < 120 && z > 6.5 && z < 13.5) return 'paves';           // cœur du bourg pavé
  if (z > 6.5 && z < 13.5) return 'asphalte';                              // départementale
  if (x > 92 && x < 98 && z > -80 && z < 6.5) return 'paves';             // rue de la place, en petits pavés
  if (x > -92 && x < -88 && z > -34 && z < 6.5) return 'gravier';         // chemin du domaine
  if (x > -115 && x < -62 && z > -72 && z < -34) return 'gravier';        // cour du domaine
  return chaussee(x, z) || 'herbe';                                        // la route du château, le tour (relief.js)
}

// Caractère de chaque sol : bosses (m), fréquence des bosses (par m), résistance au roulement (m/s²), adhérence
const SOLS = {
  asphalte: { A: 0.004, f: 0.9, res: 0.32, grip: 1 },
  paves: { A: 0.012, f: 2.6, res: 0.4, grip: 0.95 },
  gravier: { A: 0.016, f: 1.7, res: 0.5, grip: 0.85 },
  herbe: { A: 0.022, f: 0.7, res: 0.6, grip: 0.8 },
  vigne: { A: 0.05, f: 1.1, res: 1.15, grip: 0.75 },
};

// le relief invisible sous les roues, entre -0,5 et 0,5
const bosse = (x, z) => bruit(x, z) - 0.5;
// ressort amorti : nouvelle vitesse de x vers la cible c (pulsation w, amortissement z)
const ressort = (dt, x, v, c, w, z) => v + (w * w * (c - x) - 2 * z * w * v) * dt;

/* ---------------------------------------------------------------- tracteur et van
   Une seule physique, réglée par véhicule : dimensions (modèle : rayons et hauteur des roues, empattement,
   cercles de collision, point de roulis) et tempérament (TEMPERAMENTS : vitesses, reprise, direction, rapports). */
export const TEMPERAMENTS = {
  // le tracteur : lent, tenace, à l'aise dans les vignes
  tracteur: { vmax: 12.5, vmaxVigne: 4.2, vmaxAr: 3.8, vmaxArVigne: 2.4, acc: 3.8, accAr: 2.2, frein: 6.5, alat: 6.2, braqMax: 0.6, volant: 6,
    rapports: [0, 3.4, 7.4, 99], resVigne: 1, ressorts: 1, tenue: 0.45, survirage: 0 },
  // le van : plus vif et plus rapide sur la route, mal à l'aise entre les rangs
  van: { vmax: 19, vmaxVigne: 2.8, vmaxAr: 4.5, vmaxArVigne: 1.8, acc: 4.6, accAr: 2.6, frein: 8, alat: 7.6, braqMax: 0.55, volant: 7,
    rapports: [0, 4.2, 8.6, 13.2, 99], resVigne: 1.6, ressorts: 0.7, tenue: 0.8, survirage: 0.08 },
  // l'enjambeur : un portique haut, lent sur la route (25 à 30 km/h), chez lui dans les rangs (c'est son métier : peu de
  // résistance, il les enjambe) ; lourd en haut, il penche et tangue doucement ; braque court (rayon d'environ 3,6 m)
  enjambeur: { vmax: 8.3, vmaxVigne: 3.4, vmaxAr: 2.8, vmaxArVigne: 1.8, acc: 2.4, accAr: 1.6, frein: 5.5, alat: 4.2, braqMax: 0.6, volant: 5,
    rapports: [0, 2.6, 5.4, 99], resVigne: 0.5, ressorts: 0.85, tenue: 0.25, survirage: 0 },
  // une voiture empruntée (ou volée, en mode WTF) : la plus vive, accrocheuse sur la route, perdue dans les vignes
  voiture: { vmax: 23, vmaxVigne: 2.4, vmaxAr: 5, vmaxArVigne: 1.6, acc: 5.6, accAr: 3, frein: 9.5, alat: 8.6, braqMax: 0.58, volant: 8,
    rapports: [0, 5, 10, 15.5, 99], resVigne: 2.2, ressorts: 0.55, tenue: 1, survirage: 0.16 },
};
const DIMS = { rAr: 0.78, rAv: 0.45, yAr: 0.78, yAv: 0.45, emp: 2.25, off: [1.05, -0.95], r: 1.12, pivot: new THREE.Vector3(0, 0.75, -0.35) };
const DEUX = [{ x: 0, z: 0 }, { x: 0, z: 0 }];
const tv = new THREE.Vector3();

export class Tracteur {
  constructor(modele, genre = 'tracteur') {
    this.m = modele; this.genre = genre; this.T = TEMPERAMENTS[genre]; this.d = { ...DIMS, ...(modele.dims || {}) };
    this.pos = new THREE.Vector3(); this.h = 0; this.v = 0; this.braq = 0;
    // dérive : vitesse de côté (m/s, positive vers la gauche du véhicule), frein à main lissé 0..1, glissement 0..1
    this.vT = 0; this.fm = 0; this.glisse = 0; this.derive = 0;
    this.rotR = 0; this.rotA = 0; this.vignes = false; this.choc = 0; this.chocVu = 0; this.charge = 0;
    this.autres = []; // les autres véhicules du joueur (main.js), qu'on ne traverse pas
    this.sol = 'gravier';
    // commandes lissées
    this.pedale = 0; this.frein = 0; this.tRecul = 0; this.lacet = 0;
    // pour le son et la caméra : régime 0..1, effort 0..1, rapport, cahots 0..1, frottement contre un mur 0..1
    this.regime = 0.15; this.effort = 0; this.rapport = 1; this.cahot = 0; this.frotte = 0;
    this.volant = 0; this.aLong = 0; this.aLat = 0;
    // caisse sur ressorts : roulis, tangage, pompage et leurs vitesses ; essieu avant oscillant
    this.rl = 0; this.rlv = 0; this.tg = 0; this.tgv = 0; this.pp = 0; this.ppv = 0; this.es = 0; this.esv = 0;
    // la pente sous les roues (relief.js) : en long (positive en montée), le véhicule penché d'autant (tangage, roulis)
    this.pente = 0; this.solTg = 0; this.solRl = 0;
    modele.groupe.rotation.order = 'YXZ';
  }
  placer(x, z, h) {
    this.pos.set(x, 0, z); this.h = h; this.v = 0; this.vT = 0; this.fm = 0; this.glisse = 0; this.derive = 0; this.lacet = 0; this.pedale = this.frein = 0; this.braq = 0;
    this.rl = this.rlv = this.tg = this.tgv = this.pp = this.ppv = this.es = this.esv = 0;
    this.solTg = this.solRl = null; // posé d'un coup sur la pente
    this.sync(0, 0);
  }
  // gaz -1..1 (NaN : doigt posé, on garde la vitesse), braq -1..1 (positif : à gauche), fm : frein à main (0 ou 1)
  update(dt, gaz, braq, col, voitures, t, fm = 0) {
    if (dt <= 0) return;
    const S = SOLS[this.sol] || SOLS.herbe, vign = this.vignes, T = this.T, EMP = this.d.emp;
    const av0 = Math.abs(this.v);

    /* -- pédales : on part, on freine et on recule en douceur */
    const garder = Number.isNaN(gaz);
    let pousse = 0, frein = 0;
    if (!garder) {
      if (gaz > 0.02) { if (this.v < -0.05) frein = gaz; else pousse = gaz; this.tRecul = 0; }
      else if (gaz < -0.02) {
        if (this.v > 0.05) { frein = -gaz; this.tRecul = 0; }
        else { this.tRecul += dt; if (this.tRecul > 0.35 || this.v < -0.05) pousse = gaz; else frein = -gaz; } // court arrêt avant la marche arrière
      } else this.tRecul = 0;
    }
    this.pedale += borne(pousse - this.pedale, -5 * dt, 2.6 * dt);
    this.frein += borne(frein - this.frein, -8 * dt, 5 * dt);
    this.fm += ((fm ? 1 : 0) - this.fm) * lisser(dt, fm ? 12 : 5);

    /* -- vitesse */
    const vmax = vign ? T.vmaxVigne : T.vmax, vmaxAr = vign ? T.vmaxArVigne : T.vmaxAr;
    let acc = 0;
    if (this.pedale > 0.01) {
      const r = Math.max(0, this.v) / vmax;
      acc += this.pedale * T.acc * S.grip * Math.max(0, 1 - r * r);
    } else if (this.pedale < -0.01) {
      const r = Math.max(0, -this.v) / vmaxAr;
      acc += this.pedale * T.accAr * S.grip * Math.max(0, 1 - r * r);
    }
    // résistance : roulement (en partie compensé par le moteur), air, frein moteur quand on lâche ;
    // rien quand le doigt est posé (la vitesse est gardée)
    let res = 0;
    if (!garder) res = S.res * (vign ? T.resVigne : 1) * (1 - 0.6 * Math.abs(this.pedale)) + 0.0015 * av0 * av0 + (Math.abs(this.pedale) < 0.05 ? 1.3 : 0);
    if (this.v > vmax) res += 1.2 + (this.v - vmax) * 1.6;      // entrée dans les vignes trop vite
    if (this.v < -vmaxAr) res += 1.5;
    res += 0.1 * Math.abs(this.aLat);                            // les pneus frottent dans les virages serrés
    res += this.frein * T.frein * S.grip;
    res += this.fm * T.frein * 0.28 * S.grip;                    // frein à main : les roues arrière bloquées
    const vAvant = this.v;
    this.v += acc * dt;
    const dres = res * dt;
    if (Math.abs(this.v) <= dres && Math.abs(acc) < 0.01) this.v = 0;
    else this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), dres);
    if (this.frein > 0.01 && vAvant !== 0 && Math.sign(this.v) !== Math.sign(vAvant)) this.v = 0; // le frein ne fait pas reculer
    // la pente : on ralentit en montée, on prend de l'élan en descente (doigt posé, la vitesse est gardée ; arrêté sans
    // pédale, le frein tient)
    if (!garder && (Math.abs(this.v) > 0.4 || Math.abs(this.pedale) > 0.05)) this.v -= 9.81 * 0.8 * this.pente * dt;
    this.aLong += ((this.v - vAvant) / dt - this.aLong) * lisser(dt, 12);
    const av = Math.abs(this.v);

    /* -- dérive : le frein à main, ou un gros freinage en plein virage, fait perdre l'adhérence de côté ; l'arrière part.
       Une fois en travers, on tient la glisse à l'accélérateur (plus longtemps en voiture qu'en tracteur) et on la règle
       au volant : contre-braquer redresse. Lâchée, l'arrière raccroche en douceur. derive 0..1 : monte vite, retombe
       lentement ; beta : angle de glisse (positif : le véhicule glisse vers sa gauche) */
    // (un peu moins sensible, Teddy, 24/11/2026 : un freinage plus fort et plus vite pour partir en travers ; l'accélérateur
    // tient une glisse déjà lancée, il n'en lance pas une en virage ; l'adhérence revient un peu plus vite)
    const freinVirage = this.frein > 0.7 && av > 9 && Math.abs(braq) > 0.45 ? (this.frein - 0.7) * 2 : 0;
    const beta = Math.atan2(this.vT, Math.max(1, av));
    const tenue = this.pedale > 0.25 && av > 4 && this.derive > 0.3 && Math.abs(beta) > 0.14 ? (0.32 + 0.4 * this.pedale) * T.tenue : 0;
    // à fond et en butée de volant, bien lancée, une voiture survire : l'arrière se dérobe un peu
    const survire = this.pedale > 0.9 && Math.abs(braq) > 0.95 && av > 12 ? T.survirage : 0;
    const cibleD = Math.min(1, this.fm * Math.min(1, av / 3) + freinVirage * 0.6 + tenue + survire);
    this.derive += (cibleD - this.derive) * lisser(dt, cibleD > this.derive ? 7 : 2.3);
    const derive = this.derive;

    /* -- direction : angle borné par l'adhérence (au-delà en dérive), volant qui tourne à vitesse finie et revient seul */
    const lim0 = Math.min(T.braqMax, Math.atan(EMP * T.alat * S.grip / Math.max(0.01, av * av)));
    const lim = lim0 + (T.braqMax - lim0) * derive;
    const cible = borne(braq, -1, 1) * lim;
    const rentre = Math.abs(cible) < Math.abs(this.braq) || cible * this.braq < 0;
    const vit = (rentre ? 2.4 : 1.35) / (1 + av * 0.07) * (1 + 1.4 * derive); // en dérive, on contre-braque vite
    this.braq += borne(cible - this.braq, -vit * dt, vit * dt);
    this.volant = this.braq * T.volant;
    let lacetCin = (this.v / EMP) * Math.tan(this.braq) * (1 + 0.55 * derive); // en dérive, l'arrière fait pivoter
    if (vign && av > 0.5) lacetCin += Math.sin(t * 2.7 + this.pos.z * 0.9) * 0.05 * Math.min(1, av / 3); // les ornières font louvoyer
    // pas de toupie : au-delà de 45 degrés de glisse, la rotation qui l'aggrave s'éteint (le volant n'y peut plus rien)
    const exces = Math.abs(beta) - 0.78;
    if (exces > 0 && lacetCin * beta < 0) lacetCin *= Math.max(0, 1 - exces * 5);
    this.lacet += (lacetCin - this.lacet) * lisser(dt, 9 - 5 * derive); // en dérive, la rotation a de l'élan
    if (exces > 0 && this.lacet * beta < 0) this.lacet *= 1 - Math.min(1, exces * 4) * lisser(dt, 8);
    const dh = this.lacet * dt;
    this.h = angle(this.h + dh);
    // la vitesse ne tourne pas avec le véhicule : ce qui reste de côté, les pneus le freinent jusqu'à leur adhérence
    // (en conduite normale, ils l'effacent entièrement ; en dérive, le véhicule glisse en travers)
    const cd = Math.cos(dh), sd = Math.sin(dh), vL = this.v * cd + this.vT * sd;
    this.vT = this.vT * cd - this.v * sd;
    this.v = vL;
    const adh = T.alat * S.grip * 1.2 * (1 - 0.8 * derive) * (1 + Math.max(0, exces) * 5) * dt;
    this.vT -= Math.sign(this.vT) * Math.min(Math.abs(this.vT), adh);
    // glisser de côté freine (moins quand on accélère dans la glisse : les roues arrière poussent)
    this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), Math.abs(this.vT) * (0.42 - 0.3 * derive * Math.max(0, this.pedale)) * dt);
    if (derive > 0.2 && this.pedale > 0 && this.v > 0) this.v += this.pedale * T.acc * 0.3 * derive * dt; // les roues arrière poussent dans la glisse
    this.glisse = Math.min(1, Math.abs(this.vT) / 3.5);
    this.aLat = this.v * this.lacet;
    let fx = Math.sin(this.h), fz = Math.cos(this.h);
    this.pos.x += (fx * this.v + fz * this.vT) * dt; this.pos.z += (fz * this.v - fx * this.vT) * dt;

    /* -- deux cercles (avant, arrière) contre le décor, les voitures et l'autre véhicule du domaine */
    let touche = false, nx = 0, nz = 0;
    const OFF = this.d.off, RC = this.d.r;
    for (let i = 0; i < 2; i++) {
      const c = DEUX[i]; c.x = this.pos.x + fx * OFF[i]; c.z = this.pos.z + fz * OFF[i];
      const ox = c.x, oz = c.z;
      if (col.resoudre(c, RC)) { touche = true; nx += col.nx; nz += col.nz; }
      for (let j = 0; j < voitures.length; j++) {
        const vo = voitures[j];
        // ses deux cercles le long de son axe (sur la départementale : x, dans son sens ; au château : ax, az, village.js ;
        // un cycliste, velos.js : deux petits cercles, dc et rc)
        const ax = vo.ax ?? vo.sens, az = vo.az ?? 0, dc = vo.dc ?? 1.1;
        for (let k = -1; k <= 1; k += 2) {
          const vx = vo.x + k * dc * ax, vz = vo.z + k * dc * az, dx = c.x - vx, dz = c.z - vz, d2 = dx * dx + dz * dz, R = RC + (vo.rc ?? 1.0);
          if (d2 < R * R && d2 > 1e-6) {
            const d = Math.sqrt(d2), p = (R - d) / d; c.x += dx * p; c.z += dz * p; touche = true; nx += dx / d; nz += dz / d;
            vo.cogner(this, -dx / d, -dz / d); // la voiture encaisse le choc
          }
        }
      }
      for (const a of this.autres) { // les autres véhicules du joueur, garés (deux cercles eux aussi)
        const ax = Math.sin(a.h), az = Math.cos(a.h);
        for (const o of a.d.off) {
          const dx = c.x - (a.pos.x + ax * o), dz = c.z - (a.pos.z + az * o), d2 = dx * dx + dz * dz, R = RC + a.d.r;
          if (d2 < R * R && d2 > 1e-6) { const d = Math.sqrt(d2), p = (R - d) / d; c.x += dx * p; c.z += dz * p; touche = true; nx += dx / d; nz += dz / d; }
        }
      }
      this.pos.x += c.x - ox; this.pos.z += c.z - oz;
    }
    this.chocVu = 0;
    let frotte = 0;
    if (touche) {
      this.vT *= 0.4;
      const n = Math.hypot(nx, nz) || 1; nx /= n; nz /= n;
      const sv = this.v >= 0 ? 1 : -1, fn = fx * nx + fz * nz, dot = fn * sv; // dot < 0 : on pousse contre l'obstacle
      if (dot < -0.8 && av > 2.5) { // de face : on rebondit
        this.chocVu = Math.min(1, av / 10); this.v *= -0.2; this.pedale = 0;
      } else if (dot < 0) {
        // en biais : on longe l'obstacle, on perd un peu de vitesse et le tracteur s'aligne dessus
        const s = -dot;
        this.v -= sv * Math.min(av, (1.5 + 5 * s) * s * dt * Math.max(1, av * 0.4));
        const tx = fx - fn * nx, tz = fz - fn * nz;
        if (tx * tx + tz * tz > 1e-4) this.h = versAngle(this.h, Math.atan2(tx, tz), dt * Math.min(2.2, 0.45 * av + 0.3) * (0.4 + s));
        frotte = Math.min(1, av / 6) * (0.4 + s);
      } else if (av > 0.5) frotte = 0.15;
    }
    this.frotte += (frotte - this.frotte) * lisser(dt, frotte > this.frotte ? 20 : 6);
    fx = Math.sin(this.h); fz = Math.cos(this.h);

    /* -- sol sous les roues */
    DEUX[0].x = this.pos.x + fx; DEUX[0].z = this.pos.z + fz;
    this.vignes = col.rangs(DEUX[0], 0.85, false) || col.rangs(this.pos, 0.85, false);
    const sol = natureSol(this.pos.x, this.pos.z, col);
    this.sol = this.vignes ? 'vigne' : sol === 'vigne' ? 'herbe' : sol; // bout de parcelle hors des rangs : tournière en herbe

    /* -- moteur : rapports, régime, effort (pour le son) */
    const RAPPORTS = T.rapports;
    let rap = 1;
    while (rap < RAPPORTS.length - 1 && av > RAPPORTS[rap] + (rap >= this.rapport ? 0.25 : -0.25)) rap++;
    this.rapport = rap;
    const lo = RAPPORTS[rap - 1], hi = Math.min(RAPPORTS[rap], T.vmax);
    const dansRapport = borne((av - lo) / (hi - lo), 0, 1);
    const charge = Math.abs(this.pedale);
    const regCible = av < 0.3 ? 0.12 + charge * 0.3 : 0.22 + dansRapport * 0.72 + charge * 0.06;
    this.regime += (regCible - this.regime) * lisser(dt, regCible < this.regime ? 9 : 5);
    this.effort += ((garder ? 0.35 : charge) + this.frein * 0.1 - this.effort) * lisser(dt, 8);

    this.sync(dt, t);
  }

  sync(dt, t) {
    const m = this.m, S = SOLS[this.sol] || SOLS.herbe, av = Math.abs(this.v), D = this.d, EMP = D.emp, K = this.T.ressorts;
    // le sol sous les quatre roues (relief.js) : hauteur, pente en long, dévers ; la caisse suit (en douceur)
    {
      const fx = Math.sin(this.h), fz = Math.cos(this.h), x = this.pos.x, z = this.pos.z;
      const zv = D.zAv ?? 1.35, xv = D.xAv ?? 0.84, zr = -(D.zAr ?? -0.9), xr = D.xAr ?? 0.98;
      const avG = solEn(x + fx * zv + fz * xv, z + fz * zv - fx * xv), avD = solEn(x + fx * zv - fz * xv, z + fz * zv + fx * xv);
      const arG = solEn(x - fx * zr + fz * xr, z - fz * zr - fx * xr), arD = solEn(x - fx * zr - fz * xr, z - fz * zr + fx * xr);
      const av2 = (avG + avD) / 2, ar2 = (arG + arD) / 2, L = zv + zr;
      this.pente = (av2 - ar2) / L;
      const tg = Math.atan2(ar2 - av2, L), rl = Math.atan2((avG + arG) - (avD + arD), xv + xr + xv + xr);
      const k = this.solTg === null || dt <= 0 ? 1 : lisser(dt, 14);
      this.solTg = this.solTg === null ? tg : this.solTg + (tg - this.solTg) * k; this.solRl = this.solRl === null ? rl : this.solRl + (rl - this.solRl) * k;
      this.pos.y = ar2 + (av2 - ar2) * zr / L;
    }
    m.groupe.position.set(this.pos.x, this.pos.y, this.pos.z); m.groupe.rotation.set(this.solTg, this.h, this.solRl);
    this.rotR += this.v * (1 - this.fm) * dt / D.rAr; this.rotA += this.v * dt / D.rAv; // frein à main : l'arrière ne tourne plus
    m.rouesAr[0].rotation.x = m.rouesAr[1].rotation.x = this.rotR;
    m.rouesAv[0].rotation.x = m.rouesAv[1].rotation.x = this.rotA;
    m.pivots[0].rotation.y = m.pivots[1].rotation.y = this.braq;
    if (m.volant) m.volant.rotation.y = this.volant;
    // feux stop au freinage (et au frein à main), feux de recul en marche arrière, gyrophare du tracteur quand il roule
    const F = m.feux;
    if (F) {
      const stop = this.frein > 0.12 || this.fm > 0.3, recul = this.v < -0.15;
      if (F.stop && F.stop.visible !== stop) F.stop.visible = stop;
      if (F.recul && F.recul.visible !== recul) F.recul.visible = recul;
    }
    if (m.gyro) { const on = Math.abs(this.v) > 1.2; if (m.gyro.visible !== on) m.gyro.visible = on; if (on) m.gyro.rotation.y += dt * 8; }
    if (dt > 0) {
      // relief sous les quatre roues (plus marqué en roulant)
      const fx = Math.sin(this.h), fz = Math.cos(this.h), lx = fz, lz = -fx;
      const A = S.A * Math.min(1, 0.35 + av / 3) * K, f = S.f;
      const x = this.pos.x, z = this.pos.z;
      const zv = D.zAv ?? 1.35, xv = D.xAv ?? 0.84, zr = -(D.zAr ?? -0.9), xr = D.xAr ?? 0.98; // position des roues
      const avG = bosse((x + fx * zv + lx * xv) * f, (z + fz * zv + lz * xv) * f) * A;
      const avD = bosse((x + fx * zv - lx * xv) * f + 17, (z + fz * zv - lz * xv) * f) * A;
      const arG = bosse((x - fx * zr + lx * xr) * f + 31, (z - fz * zr + lz * xr) * f) * A;
      const arD = bosse((x - fx * zr - lx * xr) * f, (z - fz * zr - lz * xr) * f + 53) * A;
      // cibles : la caisse se cabre en accélérant, plonge au freinage, penche vers l'extérieur du virage, suit le relief
      const tgC = -0.009 * borne(this.aLong, -8, 8) + ((arG + arD) - (avG + avD)) * 0.5 / EMP;
      const rlC = 0.009 * borne(this.aLat, -8, 8) + (arG - arD) / (2 * xr) * 0.6;
      const ppC = (avG + avD + arG + arD) * 0.25 + (av < 0.2 ? Math.sin(t * 38) * 0.004 : Math.sin(t * 31) * 0.002);
      const esC = (avG - avD) / (2 * xv) * 1.2;
      // ressorts amortis (un peu de rebond, c'est plaisant)
      this.tgv = ressort(dt, this.tg, this.tgv, tgC, 9, 0.32); this.tg += this.tgv * dt;
      this.rlv = ressort(dt, this.rl, this.rlv, rlC, 8, 0.3); this.rl += this.rlv * dt;
      this.ppv = ressort(dt, this.pp, this.ppv, ppC, 14, 0.35); this.pp += this.ppv * dt;
      this.esv = ressort(dt, this.es, this.esv, esC, 12, 0.3); this.es += this.esv * dt;
      this.tg = borne(this.tg, -0.08, 0.08); this.rl = borne(this.rl, -0.09, 0.09); this.es = borne(this.es, -0.05, 0.05);
      this.cahot = borne(Math.abs(this.ppv) * 1.5 + Math.abs(this.rlv) * 0.6 + (this.sol === 'vigne' ? 0.25 : 0) * Math.min(1, av / 3), 0, 1);
    }
    // la caisse roule et tangue autour de PIVOT ; l'essieu avant oscille ; petits sauts des roues dans les vignes
    const c = m.caisse, PIVOT = D.pivot;
    c.rotation.set(this.tg * K, 0, this.rl * K);
    tv.copy(PIVOT).applyQuaternion(c.quaternion);
    c.position.set(PIVOT.x - tv.x, PIVOT.y - tv.y + this.pp, PIVOT.z - tv.z);
    if (m.essieu) m.essieu.rotation.z = this.es;
    m.rouesAr[0].position.y = m.rouesAr[1].position.y = D.yAr + (this.sol === 'vigne' ? Math.max(0, this.pp) * 0.6 : 0);
  }
}

/* ---------------------------------------------------------------- voitures sur la départementale */
const LONG = 4.2; // longueur d'une voiture (m)
// Un obstacle : un véhicule du domaine (o.veh) compte par ses deux cercles de collision, dans le sens où il est tourné (en
// travers au bout d'un chemin, il dépasse sur la route) ; un personnage, par un cercle de 0,9 m. Il est dans une voie si
// l'un de ses cercles en est plus près que la demi-largeur d'une voiture (0,86 m), plus son rayon, plus 25 cm de marge.
// Au-delà, on se croise sans se toucher : un véhicule arrêté entre deux voies, pour livrer côté nord, ne bloque plus les
// deux sens à la fois (chacun attendait l'autre). cercles(o) remplit CER ([x, z, rayon, demi-longueur]) et rend leur nombre.
const CER = [[0, 0, 0, 0], [0, 0, 0, 0]];
// plus loin que ça de l'axe d'une voie, un obstacle n'y touche pas : son cercle le plus écarté (la remorque : 2,2 m devant
// son milieu, 1,35 m de rayon) reste hors de la voie (1,11 m plus son rayon)
const LOIN_VOIE = 5.5;
function cercles(o) {
  const p = o.veh;
  if (!p) { const c = CER[0]; c[0] = o.x; c[1] = o.z; c[2] = o.r ?? 0.9; c[3] = o.demi ?? 2.4; return 1; } // (un cycliste : r, demi ; velos.js)
  const sx = Math.sin(p.h), cz = Math.cos(p.h);
  for (let k = 0; k < 2; k++) { const c = CER[k], off = p.d.off[k]; c[0] = o.x + sx * off; c[1] = o.z + cz * off; c[2] = p.d.r; c[3] = p.d.r; }
  return 2;
}
export class Voiture {
  constructor(mesh, x, sens, vmax) {
    this.mesh = mesh; this.x = x; this.sens = sens; this.vmax = vmax; this.v = vmax; this.a = 0;
    this.zVoie = sens > 0 ? 11.7 : 8.3; this.zAutre = sens > 0 ? 8.3 : 11.7;
    this.z = this.zVoie; this.arret = 0; this.klaxon = false; this.obst = null;
    // choc : secousse (tangage et roulis amortis), arrêt, feux de détresse, le conducteur râle
    this.choc = 0; this.tChoc = 0; this.detresse = 0; this.secX = 0; this.secXv = 0; this.secZ = 0; this.secZv = 0; this.cogne = false;
    // dépassement : 0 dans sa voie, 1 clignote, 2 déboîte et double, 3 se rabat
    this.dep = 0; this.tDep = 0; this.xPasse = 0; this.tCl = 0; this.cligno = 0; // cligno : 1 à gauche, -1 à droite
    // un cycliste qu'on double (velos.js) : on le suit un moment, puis on passe à cheval sur la ligne du milieu (zPasse)
    this.passe = null; this.zPasse = this.zAutre; this.suivi = 0; this.immobile = 0;
    this.base = sens > 0 ? Math.PI / 2 : -Math.PI / 2;
    mesh.rotation.y = this.base;
    mesh.position.set(x, solEn(x, this.z), this.z); // (les roues sur la chaussée, pas dans sa dalle : relief.js)
    this.feux = mesh.userData.feux || null;
  }
  // devant moi, dans la voie z : écart libre (m) jusqu'au plus proche obstacle ou voiture
  ecart(obstacles, voitures, z) {
    let libre = 1e9, obst = null;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (Math.abs(o.z - z) > LOIN_VOIE) continue; // (garé loin de la route : aucun de ses cercles n'y touche)
      const n = cercles(o);
      for (let k = 0; k < n; k++) {
        const c = CER[k], dx = (c[0] - this.x) * this.sens - LONG / 2 - c[3];
        if (dx > -5 && dx < libre && Math.abs(c[1] - z) < 1.11 + c[2]) { libre = dx; obst = o; }
      }
    }
    for (let i = 0; i < voitures.length; i++) {
      const o = voitures[i];
      if (o === this || Math.abs(o.z - z) > 2.4) continue;
      const dx = (o.x - this.x) * this.sens - LONG;
      if (dx > -LONG * 0.5 && dx < libre) { libre = dx; obst = null; }
    }
    this.obst = obst;
    return libre;
  }
  // la voie d'en face est-elle libre pour doubler ? (portee : jusqu'où l'on regarde les voitures d'en face)
  voieLibre(obstacles, voitures, portee = 120) {
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (Math.abs(o.z - this.zAutre) > LOIN_VOIE) continue;
      const n = cercles(o);
      for (let k = 0; k < n; k++) {
        const c = CER[k], dx = (c[0] - this.x) * this.sens;
        if (dx > -6 && dx < 40 && Math.abs(c[1] - this.zAutre) < 1.11 + c[2]) return false;
      }
    }
    for (let i = 0; i < voitures.length; i++) {
      const o = voitures[i];
      if (o === this) continue;
      const dx = (o.x - this.x) * this.sens;
      if (dx > -12 && dx < portee && (o.sens !== this.sens || o.dep)) return false;
    }
    return true;
  }
  // un véhicule (ou le personnage) la touche : (nx, nz) direction du choc vers la voiture ; force selon la vitesse
  cogner(qui, nx, nz, force) {
    const f = force ?? Math.min(1, Math.abs(qui.v || 0) / 6 + 0.25);
    if (this.tChoc < 0.6 && f <= this.choc + 0.2) return; // contact qui dure : un seul choc
    // la caisse encaisse : elle penche dans le sens du choc (repère de la voiture : avant = sens de la route)
    const av = nx * this.sens, lat = nz * this.sens;
    this.secXv += av * 3.2 * f; this.secZv += lat * 4 * f;
    this.choc = Math.max(this.choc, f); this.tChoc = 0; this.cogne = true;
    this.v *= 0.3; this.a = 0;
    if (f > 0.6) this.detresse = 4; // un vrai choc : elle reste arrêtée, feux de détresse (un frôlement : juste un coup de frein)
  }
  // obstacles : liste de points {x, z} ; renvoie true quand elle klaxonne
  update(dt, obstacles, voitures) {
    if (dt <= 0) return false;
    this.tChoc += dt; this.choc = Math.max(0, this.choc - dt * 0.8);
    // secousse amortie de la caisse après un choc
    this.secXv = ressort(dt, this.secX, this.secXv, 0, 9, 0.25); this.secX += this.secXv * dt;
    this.secZv = ressort(dt, this.secZ, this.secZv, 0, 10, 0.25); this.secZ += this.secZv * dt;
    this.secX = borne(this.secX, -0.12, 0.12); this.secZ = borne(this.secZ, -0.12, 0.12);
    if (this.detresse > 0) this.detresse -= dt;
    const libre = this.ecart(obstacles, voitures, this.dep === 2 ? this.zPasse : this.z);
    // vitesse voulue : garder 1,2 s d'écart et pouvoir s'arrêter à 2 m en freinant à 2,5 m/s² ;
    // accélération et freinage progressifs (à-coups bornés)
    // devant le tracteur ou le van, on s'arrête plus loin : il doit pouvoir manœuvrer (demi-tour en trois temps)
    const marge = Math.max(0, libre - (this.obst && this.obst.veh ? 6 : 2));
    let cible = Math.min(this.vmax, marge / 1.2, Math.sqrt(5 * marge));
    if (this.detresse > 0) cible = 0; // arrêtée le temps de reprendre ses esprits
    if (this.dep === 2 && !this.passe && Math.abs(this.z - this.zVoie) < 2.2) cible = Math.min(cible, 1.5); // déboîte au pas
    let aV = borne((cible - this.v) * 2, -7, 2.2);
    if (libre < 1) aV = -9;
    this.a += borne(aV - this.a, -14 * dt, 4 * dt);
    this.v += this.a * dt;
    if (this.v < 0) { this.v = 0; if (this.a < 0) this.a = 0; }
    if (this.v > this.vmax) this.v = this.vmax;
    if (libre < 0.2 && this.v > 0) this.v = 0;

    let cri = false;
    if (this.v < 0.3 && libre < 8) {
      this.arret += dt;
      if (this.arret > 1.3 && !this.klaxon) { this.klaxon = true; cri = true; }
    } else { this.arret = 0; this.klaxon = false; }

    // doubler ce qui bloque la route (le tracteur arrêté, le personnage), si la voie d'en face est libre
    // (un véhicule du joueur qui manœuvre, un demi-tour : on ne le double qu'une fois resté immobile un moment)
    this.immobile = this.obst && this.obst.veh && Math.abs(this.obst.veh.v) > 0.3 ? 0 : this.immobile + dt;
    if (this.dep === 0 && this.obst && this.arret > 2 && this.immobile > 2.5 && this.voieLibre(obstacles, voitures)) { this.dep = 1; this.tDep = 0; this.xPasse = this.obst.x; this.passe = null; this.zPasse = this.zAutre; }
    // derrière un cycliste (velos.js) : on le suit à sa vitesse, puis, rien n'arrivant en face (de loin : doubler un vélo
    // prend du temps), on le double à cheval sur la ligne du milieu (1,5 m entre lui et nous). Si quelqu'un arrive en face
    // quand on est encore derrière lui, on se rabat derrière ; à sa hauteur, on finit ; devant lui, on se rabat devant.
    if (this.dep === 0 && this.obst && this.obst.velo && libre < 16) {
      this.suivi += dt;
      if (this.suivi > 1.2 && this.voieLibre(obstacles, voitures, 230)) { this.dep = 1; this.tDep = 0; this.passe = this.obst; this.zPasse = this.zVoie + (this.zAutre - this.zVoie) * 0.55; }
    } else if (this.dep === 0) this.suivi = Math.min(0, this.suivi + dt);
    if (this.passe && (this.dep === 1 || this.dep === 2) && !this.voieLibre(obstacles, voitures, 80)) {
      const av = (this.x - this.passe.x) * this.sens;
      if (av < -3.2) { this.dep = 3; this.tDep = 0; this.passe = null; this.suivi = -4; }
      else if (av > 4.6) { this.dep = 3; this.tDep = 0; this.passe = null; }
    }
    if (this.dep) this.tDep += dt;
    if (this.dep === 1 && this.tDep > 1.1) this.dep = 2;
    if (this.dep === 2 && (this.x - (this.passe ? this.passe.x : this.xPasse)) * this.sens > 9 && this.ecart(obstacles, voitures, this.zVoie) > 3) { this.dep = 3; this.tDep = 0; this.passe = null; }
    if (this.dep === 3 && Math.abs(this.z - this.zVoie) < 0.05) this.dep = 0;
    const zC = this.dep === 2 ? this.zPasse : this.zVoie;
    const dz = borne(zC - this.z, -1.7 * dt, 1.7 * dt);
    this.z += dz;
    this.cligno = this.dep === 1 || (this.dep === 2 && Math.abs(this.z - this.zPasse) > 0.3) ? 1 : this.dep === 3 ? -1 : 0;

    this.x += this.sens * this.v * dt;
    // les roues tournent (un maillage par essieu, engins.js)
    const ess = this.mesh.userData.essieux;
    if (ess) { const a = this.v * dt / this.mesh.userData.rayon; for (const e of ess) e.rotation.x += a; }
    if (this.x * this.sens > 340) { this.x = -340 * this.sens; this.dep = 0; this.z = this.zVoie; this.passe = null; }
    this.mesh.position.set(this.x, solEn(this.x, this.z), this.z);
    // la voiture s'oriente un peu quand elle change de voie ; la caisse se secoue après un choc
    this.mesh.rotation.set(this.secX, this.base - Math.atan2(dz / dt, Math.max(2, this.v)) * this.sens, this.secZ, 'YXZ');

    if (this.feux) {
      this.tCl += dt;
      const on = this.tCl % 0.7 < 0.38;
      // repère de la voiture : +x à sa gauche ; on double à gauche, on se rabat à droite
      const det = this.detresse > 0 && on; // feux de détresse : les deux clignotants
      this.feux.g.visible = (this.cligno === 1 && on) || det;
      this.feux.d.visible = (this.cligno === -1 && on) || det;
      this.feux.stop.visible = this.a < -0.7 || (this.v < 0.4 && libre < 12);
    }
    return cri;
  }
}
