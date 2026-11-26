// Animation procédurale des personnages, sans fichier d'animation et sans allocation par image.
// Marche, petite course et course se mélangent selon la vitesse ; les pieds suivent une foulée accordée à la vitesse et à
// la longueur des jambes (foulee) : au sol pendant l'appui, le pied roule du talon à la pointe sans glisser ; le bassin
// descend quand les deux pieds sont au sol et remonte au passage, d'après ce que les jambes atteignent (cinématique
// inverse : pied jamais en l'air pendant l'appui). Au repos : respiration,
// transfert de poids, coups d'œil, parfois un regard au téléphone. Regard vers un point, téléphone en main,
// signe de la main, pose assise, mains sur le volant, saut de côté, recul contre un mur.
import * as THREE from 'three';
import { OS, DIM, accessoires } from './perso.js';
import { angle, borne, entre, mix, lisse, amortir } from './outils.js';

const PI = Math.PI, TAU = 2 * Math.PI;
// lissage exponentiel indépendant de la cadence ; dt = 0 : on se place d'un coup
const kl = (dt, r) => (dt === 0 ? 1 : amortir(dt, r));

// temporaires partagés
const UN = new THREE.Vector3(1, 1, 1);
const mB = new THREE.Matrix4(), mP = new THREE.Matrix4(), mT = new THREE.Matrix4(), mBi = new THREE.Matrix4(), mPi = new THREE.Matrix4();
const qB = new THREE.Quaternion(), qP = new THREE.Quaternion(), qPi = new THREE.Quaternion(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
const FK = Array.from({ length: 6 }, () => new THREE.Quaternion());
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), vTel = new THREE.Vector3(), vOeil = new THREE.Vector3(), vG = new THREE.Vector3(), vB = new THREE.Vector3();
const ex = new THREE.Vector3(), ey = new THREE.Vector3(), ez = new THREE.Vector3(), mR = new THREE.Matrix4(), qTel = new THREE.Quaternion();
const eul = new THREE.Euler(0, 0, 0, 'YXZ');
const _t = new THREE.Vector3(), _n = new THREE.Vector3(), _u = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4();
const JAMBES = [[OS.cuisseG, 1, 0], [OS.cuisseD, -1, 0.5]];
// poste de conduite du tracteur (repère de sa caisse) : assise, plancher, centre et rayon du volant ; le van donne le sien (p.poste)
const POSTE_TRACTEUR = { assise: 1.5, plancher: 1.24, volant: new THREE.Vector3(0, 1.9, -0.18), rayon: 0.2 };
const BRAS = [OS.brasG, OS.coudeG, OS.mainG, OS.brasD, OS.coudeD, OS.mainD];
// pose debout gardée le temps de la mélanger à la pose au volant (monter, descendre)
const MEMO = Array.from({ length: 32 }, () => new THREE.Quaternion()), vMemo = new THREE.Vector3();

/* ---------------------------------------------------------------- la foulée
   Repère du personnage : origine au sol sous le bassin, z vers l'avant. La chaussure (perso.js) : du talon à la
   cheville, de la cheville à la pointe (là où le pied plie), hauteur de la cheville au-dessus du sol. */
const TALON = 0.065, POINTE = 0.15, CH = DIM.cheville, L1 = DIM.cuisse, L2 = DIM.tibia;
// (poseDebout calcule sur place, sans petite fonction qui rende un nombre : V8 le mettrait en boîte à chaque appel)
// Les deux pieds, et les réglages de la foulée, rangés dans des tableaux de nombres : passés à une fonction ou rangés dans
// un objet, les nombres à virgule seraient mis en boîte par V8, à chaque image. Pour le pied j, à partir de 6j : cheville
// x, y, z, inclinaison du pied (positive : pointe en bas), lacet, pliure du genou. Foulée : phase du pied, part de l'appui,
// chemin au sol, foulée, course (0 à 1), levée.
const PIEDS = new Float64Array(12), X = 0, Y = 1, Z = 2, TG = 3, LACET = 4, F = 5;
const FOU = new Float64Array(6), Q = 0, BETA = 1, PAS = 2, FS = 3, W = 4, LEVER = 5;
// La cheville quand le talon pivote au sol, la pointe relevée de t ; quand la pointe pivote au sol, le talon levé de t.
// zf : la cheville du pied à plat ; y : au-dessus de sa hauteur à plat
function talon(zf, t, R, k) { R[k + Z] = zf - TALON + TALON * Math.cos(t) - CH * Math.sin(t); R[k + Y] = TALON * Math.sin(t) + CH * Math.cos(t) - CH; R[k + TG] = -t; }
function pointe(zf, t, R, k) { R[k + Z] = zf + POINTE - POINTE * Math.cos(t) + CH * Math.sin(t); R[k + Y] = POINTE * Math.sin(t) + CH * Math.cos(t) - CH; R[k + TG] = t; }
// Le pied à la phase q de sa foulée (0 : le talon touche le sol). Appui (q < beta) : il recule à la vitesse du corps
// (immobile au sol) en roulant : le talon pivote au sol, pointe relevée, puis le pied est à plat, puis il pivote sur la
// pointe, talon levé ; il se pose moins loin devant que là où il quitte le sol derrière (en courant, presque sous le
// corps). Envol : de la pointe qui quitte le sol au talon qui le touche, immobile au sol aux deux bouts (courbe d'Hermite
// dont les tangentes suivent le sol : il ne glisse ni au décollage ni à l'atterrissage), levé de « lever », plus tôt que
// plus tard (le talon remonte en courant). La pliure du genou à garder à l'appui (amorti après l'attaque du talon) fixe la
// hauteur du bassin. w : 0 marche, 1 course (on attaque par le milieu du pied, on pousse plus fort sur la pointe, le
// genou plie davantage). Lit FOU, écrit dans PIEDS à partir de k.
function foulee(k) {
  const R = PIEDS, q = FOU[Q], beta = FOU[BETA], pas = FOU[PAS], S = FOU[FS], w = FOU[W], lever = FOU[LEVER];
  const a0 = 0.44 - 0.04 * w, th0 = 0.3 * (1 - w), u1 = 0.14, u2 = 0.55 - 0.2 * w, ph1 = 0.75 + 0.2 * w;
  if (q < beta) {
    const u = q / beta, zf = pas * (a0 - u);
    if (u < u1) talon(zf, th0 * (1 - u / u1) ** 2, R, k);
    else if (u < u2) { R[k + Z] = zf; R[k + Y] = 0; R[k + TG] = 0; }
    else pointe(zf, ph1 * ((u - u2) / (1 - u2)) ** 1.5, R, k);
    R[k + F] = mix(0.08 + 0.18 * Math.exp(-(((u - 0.18) / 0.12) ** 2)), 0.35 + 0.35 * Math.sin(PI * u), w);
    return;
  }
  const u = (q - beta) / (1 - beta), u2c = u * u, u3 = u2c * u;
  pointe(pas * (a0 - 1), ph1, R, k); const z0 = R[k + Z], y0 = R[k + Y];
  talon(pas * a0, th0, R, k); const z1 = R[k + Z], y1 = R[k + Y];
  const c = 0.15 + 0.25 * w; // la levée penche vers le début de l'envol (sommet ramené à 1)
  R[k + Z] = z0 + (z1 - z0) * (3 * u2c - 2 * u3) - (1 - beta) * S * (2 * u3 - 3 * u2c + u);
  R[k + Y] = mix(y0, y1, lisse(u)) + lever * (Math.sin(PI * u) + c * Math.sin(TAU * u)) / (1 + 1.35 * c * c);
  R[k + TG] = mix(ph1, -th0, entre(0.05, 0.8, u));
  R[k + F] = mix(0.1, 0.35, w);
}

// Cinématique inverse à deux os. a : os haut, b : os bas (articulation en charnière sur son axe x).
// cible et pole dans le repère du parent de a. sens +1 : bras (l'avant-bras plie vers l'avant) ; -1 : jambe.
function ik(a, b, l1, l2, cible, pole, sens) {
  _t.subVectors(cible, a.position);
  let d = _t.length();
  if (d < 1e-5) { _t.set(0, -1, 0); d = 1e-5; } else _t.multiplyScalar(1 / d);
  d = borne(d, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.9995);
  const cA = borne((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), sA = Math.sqrt(1 - cA * cA);
  _n.copy(pole).addScaledVector(_t, -pole.dot(_t));
  if (_n.lengthSq() < 1e-8) _n.set(0, _t.z, -_t.y);
  _n.normalize();
  _u.copy(_t).multiplyScalar(cA).addScaledVector(_n, sA); // direction de l'os haut
  _y.copy(_u).negate();
  _x.crossVectors(_t, _n).multiplyScalar(sens).normalize();
  _z.crossVectors(_x, _y);
  a.quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
  const cB = borne((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1);
  b.rotation.set(-sens * (PI - Math.acos(cB)), 0, 0);
}

export class Anim {
  constructor(m) {
    this.m = m; this.o = m.os;
    for (const i of [OS.bassin, OS.ventre, OS.poitrine, OS.tete]) this.o[i].rotation.order = 'YXZ';
    const r = Math.random;
    this.ph = r(); this.va = 0; this.wPas = 0; this.bank = 0; this.pench = 0; this.resp = r() * 10;
    this.ry = 0; this.rp = 0; this.cy = 0; this.cp = 0; this.tCoup = 1 + r() * 3;
    this.poids = 0; this.poidsC = r() < 0.5 ? 1 : -1; this.tPoids = 2 + r() * 5;
    this.wTel = 0; this.envie = 0; this.tEnvie = 8 + r() * 20; this.repos = 0;
    this.wSalut = 0; this.salut = 0; this.tSalut = 0;
    this.conduite = false; this.hp = 0; this.px = 0; this.pz = 0; this.braq = 0; this.lat = 0;
    this.meche = 0; this.mecheV = 0; this.telVu = false; this.vt = 0;
    this.wServ = 0; this.wVerre = 0;
    this.wPorte = 0; this.wOutil = 0; this.accroupi = 0; this.pile = new THREE.Vector3(0, 0.95, 0.36); this.pileL = 0.2;
  }

  // dt = 0 : tout se place d'un coup (placement, changement de personnage)
  poser(dt, p, t) {
    const o = this.o, m = this.m, g = m.groupe;
    const conduite = p.assis && p.conduite;
    const r = Math.random;

    /* ------------------------------------------------ états lissés et petites envies */
    this.va += ((p.assis ? 0 : p.vr) - this.va) * kl(dt, 10);
    const va = Math.abs(this.va), sens = this.va < -0.05 ? -1 : 1;
    const immobile = va < 0.2 && !conduite && p.saut === 0;
    this.repos = immobile ? this.repos + dt : 0;
    this.resp += dt;
    // transfert de poids d'une jambe sur l'autre
    if ((this.tPoids -= dt) <= 0) { this.tPoids = 3 + r() * 6; this.poidsC = r() < 0.2 ? 0 : -Math.sign(this.poidsC || 1); }
    this.poids += ((immobile ? this.poidsC : 0) - this.poids) * kl(dt, 1.8);
    // coups d'œil autour de soi
    if ((this.tCoup -= dt) <= 0) {
      this.tCoup = immobile ? 1.5 + r() * 3.5 : 3 + r() * 5;
      const a = immobile ? 1 : 0.45;
      if (r() < 0.35) { this.cy = 0; this.cp = 0; } else { this.cy = (r() * 2 - 1) * 0.95 * a; this.cp = (r() - 0.6) * 0.25 * a; }
    }
    // de temps en temps, un regard au téléphone quand on attend
    if (immobile && this.repos > 4 && this.envie <= 0 && (this.tEnvie -= dt) <= 0) { this.envie = 2.5 + r() * 3.5; this.tEnvie = 14 + r() * 24; }
    if (!immobile) this.envie = 0;
    this.envie = Math.max(0, this.envie - dt);
    // porter une pile de cartons (gestes.js) : p.porte est la pile, un groupe enfant du personnage (repère du personnage) ;
    // on s'accroupit d'autant plus qu'elle est basse (la prendre sur la palette, la poser au sol)
    const pile = p.porte;
    if (pile) { this.pile.copy(pile.position); this.pileL = (pile.userData.demi || 0.18) * pile.scale.x; } // une pile de cartons, ou le chèque (gestes.js)
    this.wPorte += ((pile ? 1 : 0) - this.wPorte) * kl(dt, 8);
    this.accroupi += ((pile ? borne((0.92 - pile.position.y) / 0.55, 0, 1) : 0) - this.accroupi) * kl(dt, 9);
    if (pile || p.outil) this.envie = 0;
    this.wTel += (((p.telephone || this.envie > 0) && !conduite && !pile && !p.outil ? 1 : 0) - this.wTel) * kl(dt, 5);
    // signe de la main
    if (this.salut > 0) this.salut -= dt;
    this.tSalut = Math.max(0, this.tSalut - dt);
    this.wSalut += ((this.salut > 0.25 && !conduite ? 1 : 0) - this.wSalut) * kl(dt, 7);

    /* ------------------------------------------------ regard : lacet et tangage de la tête par rapport au corps */
    let cy = this.cy, cp = this.cp;
    if (p.regard) {
      let X, Y, Z, cap;
      if (conduite) { X = p.pos.x; Z = p.pos.z; Y = 2.2; cap = (g.parent.rotation.y + (g.parent.parent ? g.parent.parent.rotation.y : 0)); }
      else if (p.assis) { X = g.position.x; Z = g.position.z; Y = g.position.y + 1.45 * m.echelle; cap = g.rotation.y; }
      else { X = p.pos.x; Z = p.pos.z; Y = p.pos.y + 1.68 * m.echelle; cap = p.hv; }
      const dx = p.regard.x - X, dz = p.regard.z - Z, ly = angle(Math.atan2(dx, dz) - cap);
      if (Math.abs(ly) < 2.6) { cy = borne(ly, -1.35, 1.35); cp = borne(Math.atan2(Y - p.regard.y, Math.hypot(dx, dz)), -0.5, 0.6); }
    } else if (conduite) { cy = cy * 0.3; cp = 0.05; }
    if (this.wTel > 0.01) { cy = mix(cy, -0.2, this.wTel); cp = mix(cp, 0.52, this.wTel); }
    if (this.wSalut > 0.01) { cy *= 1 - this.wSalut * 0.5; cp = mix(cp, -0.05, this.wSalut); }
    this.ry += (cy - this.ry) * kl(dt, 4.5); this.rp += (cp - this.rp) * kl(dt, 4.5);

    const br = Math.sin(this.resp * TAU / 3.8) * (immobile || p.assis ? 0.016 : 0.006);
    if (p.transition != null && p.assis) this.poseTransition(dt, p, t, br, conduite);
    else if (conduite) this.poseConduite(dt, p, t, br);
    else if (p.assis) this.poseAssise(br, p);
    else this.poseDebout(dt, p, va, sens, br);
    this.conduite = conduite;
    if (p.appuis) this.poseAppuis(p.appuis);

    /* ------------------------------------------------ la pile de cartons, tenue des deux mains par le carton du bas */
    if (this.wPorte > 0.01) {
      const P = this.pile, l = this.pileL + 0.03;
      this.brasIK(0, P.x + l, P.y + 0.02, P.z - 0.03, 0.8, -0.5, -0.5, this.wPorte);
      this.brasIK(3, P.x - l, P.y + 0.02, P.z - 0.03, -0.8, -0.5, -0.5, this.wPorte);
    }

    /* ------------------------------------------------ un outil tenu des deux mains (parvis.js : la lance du nettoyeur) :
       p.outil = { d: [x, y, z], g: [x, y, z] }, où vont la main droite et la main gauche, dans le repère du personnage */
    this.wOutil += ((p.outil ? 1 : 0) - this.wOutil) * kl(dt, 6);
    if (this.wOutil > 0.01 && p.outil) {
      const { d, g } = p.outil;
      this.brasIK(3, d[0], d[1], d[2], -0.8, -0.6, -0.3, this.wOutil);
      this.brasIK(0, g[0], g[1], g[2], 0.8, -0.6, -0.3, this.wOutil);
    }

    /* ------------------------------------------------ la main gauche sur une poignée (gestes.js : une portière qu'on
       ouvre ou referme) : p.saisir = { x, y, z, w }, dans le repère du personnage, w de 0 à 1 */
    const sa = p.saisir;
    if (sa && sa.w > 0.01) this.brasIK(0, sa.x, sa.y, sa.z, 0.7, -0.5, -0.6, sa.w);

    /* ------------------------------------------------ téléphone en main (main droite, l'autre vient le tenir) */
    const yB = o[OS.bassin].position.y;
    if (this.wTel > 0.01) {
      vTel.set(-0.085, yB + 0.47, 0.28);
      vOeil.set(0, yB + 0.76, 0.08);
      ex.subVectors(vOeil, vTel).normalize();              // l'écran regarde les yeux (paume vers +x)
      ey.set(0, 1, 0).addScaledVector(ex, -ex.y).normalize().negate(); // les doigts vers le haut de l'écran
      ez.crossVectors(ex, ey);
      qTel.setFromRotationMatrix(mR.makeBasis(ex, ey, ez));
      // poignet = centre du téléphone moins son décalage dans la main
      v1.copy(vTel).addScaledVector(ex, -0.043).addScaledVector(ey, 0.072).addScaledVector(ez, -0.004);
      this.brasIK(3, v1.x, v1.y, v1.z, -0.7, -0.7, -0.2, this.wTel);
      this.mainVers(3, qTel, this.wTel);
      this.brasIK(0, vTel.x + 0.08, vTel.y - 0.065, vTel.z - 0.005, 0.7, -0.7, -0.2, this.wTel * 0.85);
    }
    const telVu = this.wTel > 0.45;
    if (telVu !== this.telVu) { this.telVu = telVu; o[OS.tel].scale.setScalar(telVu ? 1 : 0.001); }

    /* ------------------------------------------------ servir un verre (bouteille à droite, verre à gauche) ; boire (verre à droite) */
    this.wServ += ((p.service ? 1 : 0) - this.wServ) * kl(dt, 9);
    if (p.service || (m.acc && m.acc.bouteille.visible)) this.poseService(p.service, yB, this.wServ);
    this.wVerre += ((p.verre > 0 ? 1 : 0) - this.wVerre) * kl(dt, 7);
    if (p.verre > 0 || (m.acc && m.acc.verre.visible && !p.service)) this.poseBoire(p, yB, this.wVerre);

    /* ------------------------------------------------ signe de la main (bras droit levé, l'avant-bras balance) */
    if (this.wSalut > 0.01) {
      const w = this.wSalut, osc = Math.sin(t * 11);
      for (let i = 3; i < 6; i++) FK[i].copy(o[BRAS[i]].quaternion);
      o[OS.brasD].rotation.set(-0.25, 0, -2.45); o[OS.coudeD].rotation.set(-0.3, 0, -0.2 + 0.5 * osc); o[OS.mainD].rotation.set(0, -1.35, 0.1);
      for (let i = 3; i < 6; i++) { q1.copy(o[BRAS[i]].quaternion); o[BRAS[i]].quaternion.copy(FK[i]).slerp(q1, w); }
      o[OS.tete].rotation.z += 0.08 * w; o[OS.tete].rotation.x += 0.05 * w * Math.sin(t * 5.5);
    }

    /* ------------------------------------------------ queue de cheval : balance avec les pas et pend malgré la tête */
    if (m.queue) {
      const tete = o[OS.tete].rotation, inclin = o[OS.bassin].rotation.x + o[OS.ventre].rotation.x + o[OS.poitrine].rotation.x + tete.x;
      const vise = 0.12 + Math.min(0.5, va * 0.08) - inclin * 0.85 + (p.saut > 0 ? -0.4 : 0);
      this.mecheV += ((vise - this.meche) * 60 - this.mecheV * 7) * Math.min(dt, 0.05);
      this.meche += this.mecheV * Math.min(dt, 0.05);
      if (dt === 0) { this.meche = vise; this.mecheV = 0; }
      o[OS.meche].rotation.set(this.meche, 0, 0.25 * Math.sin(TAU * this.ph) * Math.min(1, va) - tete.z - tete.y * 0.3);
    }
  }

  // Bras par cinématique inverse, mélangé à la pose déjà posée. c : 0 gauche, 3 droit ; cible et pôle dans le repère du personnage.
  brasIK(c, x, y, z, px, py, pz, w) {
    const o = this.o, a = o[BRAS[c]], b = o[BRAS[c + 1]];
    if (w < 0.999) { FK[c].copy(a.quaternion); FK[c + 1].copy(b.quaternion); }
    v1.set(x, y, z).applyMatrix4(mPi);
    v2.set(px, py, pz).applyQuaternion(qPi);
    ik(a, b, DIM.bras, DIM.avantBras, v1, v2, 1);
    if (w < 0.999) {
      q1.copy(a.quaternion); a.quaternion.copy(FK[c]).slerp(q1, w);
      q1.copy(b.quaternion); b.quaternion.copy(FK[c + 1]).slerp(q1, w);
    }
  }

  // Jambe : cheville en (x, y, z) dans le repère du personnage, pied incliné (tangage) et tourné (lacet)
  jambe(i, sg, x, y, z, tangage, lacet, poleY = 0) {
    const o = this.o, cuisse = o[i], genou = o[i + 1], pied = o[i + 2];
    v1.set(x, y, z).applyMatrix4(mBi);
    v2.set(sg * 0.12, poleY, 1);
    ik(cuisse, genou, DIM.cuisse, DIM.tibia, v1, v2, -1);
    q1.copy(qB).multiply(cuisse.quaternion).multiply(genou.quaternion).invert();
    q2.setFromEuler(eul.set(tangage, lacet, 0));
    pied.quaternion.multiplyQuaternions(q1, q2);
  }

  // Matrices du bassin et de la poitrine dans le repère du personnage (pour placer pieds et mains)
  reperes() {
    const o = this.o, b = o[OS.bassin], v = o[OS.ventre], p = o[OS.poitrine];
    mB.compose(b.position, b.quaternion, UN);
    mP.copy(mB).multiply(mT.compose(v.position, v.quaternion, UN)).multiply(mT.compose(p.position, p.quaternion, UN));
    mBi.copy(mB).invert(); mPi.copy(mP).invert();
    qB.copy(b.quaternion); qP.copy(qB).multiply(v.quaternion).multiply(p.quaternion); qPi.copy(qP).invert();
  }

  /* ---------------------------------------------------------------- debout : repos, marche, course */
  poseDebout(dt, p, va, sens, br) {
    const o = this.o, dm = this.m.dim, E = this.m.echelle;
    const tourne = borne(Math.abs(p.om) / 2.2, 0, 1) * (1 - entre(0.4, 1.2, va));
    this.wPas += ((tourne > 0.2 ? 1 : 0) - this.wPas) * kl(dt, 8);
    const wg = entre(0.03, 0.5, va), w = entre(2.4, 4.6, va);
    // Cadence (cycles de deux pas par seconde). En marchant, la foulée suit la longueur des jambes (relation d'Alexander :
    // foulée / jambe = 2,3 x (v² / g x jambe)^0,3, ici un peu allongée) : des jambes courtes font des pas plus courts et
    // plus vifs ; en courant, la cadence monte doucement avec la vitesse. Foulée (S, repère du personnage : à son échelle,
    // sinon les pieds glisseraient) ; part du cycle où le pied est au sol (beta), chemin qu'il y fait (pas).
    const jw = (L1 + L2) * E, vw = Math.max(va, 0.03);
    const cad = mix(vw / (2.45 * jw * Math.pow(vw * vw / (9.81 * jw), 0.3)), 1.3 + 0.1 * va, w);
    this.ph += dt * Math.max(va > 0.03 ? cad : 0, this.wPas * 1.7) * sens;
    this.ph -= Math.floor(this.ph);
    const ph = this.ph, beta = 0.6 - 0.3 * w, S = va > 0.03 ? va / (cad * E) : 0, pas = Math.min(beta * S, 1.05);
    const lever = ((0.03 + 0.06 * Math.min(1, va / 1.4)) * (1 - w) + 0.26 * w) * wg + 0.07 * this.wPas * (1 - wg);
    const c1 = Math.cos(TAU * ph), s1 = Math.sin(TAU * ph);
    const choc = p.choc * p.choc, sj = p.saut > 0 ? Math.sin(PI * p.saut) : 0, att = p.atterri / 0.28;
    this.bank += (-borne(p.om * va * 0.035, -0.22, 0.22) - this.bank) * kl(dt, 6);
    this.pench += (borne(p.acc * 0.03, -0.14, 0.2) - this.pench) * kl(dt, 5);
    const cr = this.accroupi;

    // pieds : où est chaque cheville (repère du personnage), son inclinaison ; mélangés à la pose de repos à l'arrêt
    const avance = sj * 0.2, monte = sj * 0.26, recule = -sj * 0.12, monteD = sj * 0.4;
    FOU[BETA] = beta; FOU[PAS] = pas; FOU[FS] = S; FOU[W] = w; FOU[LEVER] = lever;
    for (let j = 0; j < 2; j++) {
      const sg = JAMBES[j][1], P = PIEDS, k = 6 * j;
      const q = ph + JAMBES[j][2];
      FOU[Q] = q - Math.floor(q);
      foulee(k);
      const libre = (1 - wg) * Math.max(0, -sg * this.poids); // le pied qui ne porte pas avance un peu
      P[k + X] = sg * (dm.xh + 0.014 + 0.018 * (1 - wg) - 0.014 * w);
      P[k + Y] = DIM.cheville + P[k + Y] * Math.max(wg, this.wPas) + (sg > 0 ? monte : monteD);
      P[k + Z] = P[k + Z] * wg + 0.06 * libre + (sg > 0 ? avance : recule);
      P[k + TG] = P[k + TG] * wg - 0.3 * sj; P[k + LACET] = sg * (0.06 + 0.1 * (1 - wg) + 0.08 * libre);
    }

    // bassin : rotation avec les jambes, bascule sur la jambe d'appui, inclinaison dans les virages. Sa hauteur suit ce
    // que les jambes atteignent : bas quand les deux pieds sont au sol, haut quand la jambe d'appui passe sous lui
    // (le balancement de la marche), jamais plus haut que la pose voulue ; en courant, il plonge à l'appui.
    const lacetB = -0.13 * wg * (1 - 0.5 * w) * c1;
    const roulisB = 0.07 * wg * (1 - w) * s1 + 0.045 * this.poids * (1 - wg);
    const bx = 0.03 * this.poids * (1 - wg) + 0.032 * s1 * wg * (1 - w) - this.bank * 0.35, bz = -0.06 * choc - 0.12 * cr;
    let yb = DIM.yBassin - 0.014 + wg * (0.011 * (1 - w) - 0.062 * w) - 0.04 * w * wg * Math.cos(2 * TAU * (ph - beta / 2));
    if (wg > 0.001) {
      for (let j = 0; j < 2; j++) {
        // la hanche au plus haut pour que la jambe atteigne sa cheville, le genou plié de f (longueur de la jambe : Le²)
        const sg = JAMBES[j][1], P = PIEDS, k = 6 * j, Le2 = L1 * L1 + L2 * L2 + 2 * L1 * L2 * Math.cos(P[k + F]);
        const dx = P[k + X] - bx - sg * dm.xh, dz = P[k + Z] - bz + sg * dm.xh * Math.sin(lacetB);
        const haut = P[k + Y] + Math.sqrt(Math.max(0.01, Le2 - dx * dx - dz * dz)) - DIM.yHanche - sg * dm.xh * roulisB + (1 - wg) * 0.3;
        // le plus petit des deux, raccordé sans cassure sur 2 cm
        const h = Math.max(0.02 - Math.abs(yb - haut), 0) / 0.02;
        yb = Math.min(yb, haut) - h * h * 0.005;
      }
    }
    const b = o[OS.bassin];
    b.position.set(bx, yb - 0.13 * att - 0.4 * cr, bz);
    b.rotation.set(0.03 + 0.05 * w + 0.35 * cr, lacetB, roulisB + this.bank * 0.5);
    // buste : penché en courant et en accélérant, épaules en contre-rotation, respiration, regard ; penché pour ramasser
    const marche = wg * (1 - w), hoche = 0.022 * marche * Math.cos(2 * TAU * (ph - 0.08));
    const pen = 0.025 + 0.045 * marche + 0.14 * w + this.pench - 0.5 * choc + 0.3 * sj + 0.25 * cr;
    o[OS.ventre].rotation.set(pen * 0.45 + br * 0.3, -lacetB * 0.5 + this.ry * 0.12, -roulisB * 0.8 + this.bank * 0.3);
    o[OS.poitrine].rotation.set(pen * 0.55 - br + this.rp * 0.12 + hoche * 0.4, -lacetB * (0.8 + 0.35 * marche) + this.ry * 0.22, -roulisB * (0.25 + 0.25 * marche) + this.bank * 0.2);
    o[OS.tete].rotation.set(-pen * 0.75 - 0.45 * choc + this.rp * 0.85 - hoche, lacetB * 0.3 + this.ry * 0.66, -roulisB * 0.1 - this.bank * 0.6);
    this.reperes();
    for (let j = 0, k = 0; j < 2; j++, k += 6) this.jambe(JAMBES[j][0], JAMBES[j][1], PIEDS[k + X], PIEDS[k + Y], PIEDS[k + Z], PIEDS[k + TG], PIEDS[k + LACET]);

    // bras : balancier opposé aux jambes, un peu plus devant que derrière, la main vient vers le milieu en avançant ; coudes
    // pliés en courant ; bras levés en sautant, en avant au choc. Au repos, un peu écartés du corps, coudes légèrement
    // pliés (des bras tout droits collés au corps font mannequin)
    const A = mix(0.56 * Math.min(1, va / 1.3), 0.75, w) * wg * sens, retard = 0.06 * (1 - w);
    const cG = Math.cos(TAU * (ph - 0.5 - retard)), cD = Math.cos(TAU * (ph - retard)), flot = Math.sin(this.resp * 0.9) * 0.02, devant = 0.1 * marche;
    const eG = Math.cos(TAU * (ph - 0.5 - 2 * retard)), eD = Math.cos(TAU * (ph - 2 * retard)); // le coude, encore un peu plus en retard
    const dedansG = 0.07 * marche * Math.max(0, cG), dedansD = 0.07 * marche * Math.max(0, cD), ecart = 0.115 + 0.05 * marche + 0.1 * w;
    o[OS.brasG].rotation.set(-A * cG - 0.04 - devant - 0.9 * choc - 0.5 * sj + flot, 0.06 * marche * cG, ecart + 1.9 * sj - dedansG);
    o[OS.brasD].rotation.set(-A * cD - 0.04 - devant - 0.9 * choc - 0.5 * sj - flot, -0.06 * marche * cD, -(ecart + 1.9 * sj - dedansD));
    o[OS.coudeG].rotation.set(mix(-0.28 - 0.7 * Math.max(0, eG) * wg - 0.06 * marche, -1.5 + 0.25 * cG, w) - 0.6 * choc - 0.5 * sj, 0, 0);
    o[OS.coudeD].rotation.set(mix(-0.28 - 0.7 * Math.max(0, eD) * wg - 0.06 * marche, -1.5 + 0.25 * cD, w) - 0.6 * choc - 0.5 * sj, 0, 0);
    // les mains : détendues, le poignet qui suit un peu le balancement
    o[OS.mainG].rotation.set(-0.14 - 0.2 * w + 0.12 * marche * eG, 0.1, 0.08);
    o[OS.mainD].rotation.set(-0.14 - 0.2 * w + 0.12 * marche * eD, -0.1, -0.08);
    // La canne de certains aînés (perso.js, main gauche) : le bras qui la tient balance à peine, et le poignet la garde
    // droite, l'embout près du sol ; elle avance avec le pas
    if (this.m.traits && this.m.traits.canne) {
      const bg = o[OS.brasG].rotation, cg = o[OS.coudeG].rotation;
      bg.x = bg.x * 0.3 - 0.04; cg.x = cg.x * 0.5 - 0.1;
      o[OS.mainG].rotation.x = -(bg.x + cg.x) - 0.06;
    }
  }

  /* ---------------------------------------------------------------- assis sur un banc ou une chaise */
  poseAssise(br, p) {
    // (p.y0 : la hauteur du sol sous la chaise ; les terrasses et les bancs du village du château sont sur son plateau)
    const o = this.o, g = this.m.groupe, s = this.m.echelle, dm = this.m.dim, y0 = (p && p.y0) || 0;
    const yB = (y0 + 0.56 - g.position.y) / s + 0.1, yP = (y0 - g.position.y) / s + DIM.cheville;
    o[OS.bassin].position.set(0, yB, -0.02);
    o[OS.bassin].rotation.set(-0.14, 0, 0.02 * this.poids);
    o[OS.ventre].rotation.set(0.1 + br * 0.3, this.ry * 0.12, 0);
    o[OS.poitrine].rotation.set(0.08 - br + this.rp * 0.12, this.ry * 0.22, -0.02 * this.poids);
    o[OS.tete].rotation.set(-0.02 + this.rp * 0.85, this.ry * 0.66, 0);
    this.reperes();
    for (let j = 0; j < 2; j++) { const sg = JAMBES[j][1]; this.jambe(JAMBES[j][0], sg, sg * (dm.xh + 0.04), yP, 0.42 + (sg * this.poids > 0 ? 0.06 : 0), 0, sg * 0.12, 0.6); }
    // mains posées sur les cuisses ; au portable (p.clavier), un peu penché, les mains sur le clavier
    if (p && p.clavier) {
      o[OS.ventre].rotation.x += 0.12; o[OS.poitrine].rotation.x += 0.1; this.reperes();
      const yC = (y0 + 0.82 - g.position.y) / s;
      this.brasIK(0, 0.15, yC, 0.62, 0.7, -0.5, -0.6, 1);
      this.brasIK(3, -0.15, yC, 0.62, -0.7, -0.5, -0.6, 1);
      o[OS.mainG].rotation.set(0.25, 0, 0.2); o[OS.mainD].rotation.set(0.25, 0, -0.2);
      return;
    }
    this.brasIK(0, dm.xh + 0.03, yB + 0.06, 0.24, 0.6, -0.4, -1, 1);
    this.brasIK(3, -dm.xh - 0.03, yB + 0.06, 0.24, -0.6, -0.4, -1, 1);
    o[OS.mainG].rotation.set(-0.5, 0, 0.3); o[OS.mainD].rotation.set(-0.5, 0, -0.3);
  }

  /* ---------------------------------------------------------------- au volant (tracteur ou van) */
  poseConduite(dt, p, t, br) {
    const o = this.o, g = this.m.groupe, s = this.m.echelle, dm = this.m.dim, gp = g.position;
    // braquage déduit du mouvement du tracteur (h' = v / 2,3 x tan(braquage)) si main.js ne le donne pas
    const hp = (g.parent.rotation.y + (g.parent.parent ? g.parent.parent.rotation.y : 0));
    if (this.conduite && dt > 0) {
      const om = angle(hp - this.hp) / dt, vx = (p.pos.x - this.px) / dt, vz = (p.pos.z - this.pz) / dt;
      const vt = vx * Math.sin(hp) + vz * Math.cos(hp);
      if (Math.abs(vt) > 0.4) this.braq += (Math.atan(om * 2.3 / vt) - this.braq) * kl(dt, 10);
      else this.braq += (0 - this.braq) * kl(dt, 1);
      this.lat += (borne(om * vt, -8, 8) - this.lat) * kl(dt, 4);
      this.vt = vt;
    } else { this.braq = 0; this.lat = 0; this.vt = 0; }
    this.hp = hp; this.px = p.pos.x; this.pz = p.pos.z;
    const vol = p.volant ?? this.braq;
    const sec = Math.sin(t * 19) * 0.006 * Math.min(1, Math.abs(this.vt || 0) / 4);
    const roul = borne(this.lat * 0.012, -0.12, 0.12);

    const P = p.poste || POSTE_TRACTEUR;
    const yB = (P.assise - (p.creux || 0) - gp.y) / s + 0.1 + sec, yP = (P.plancher - gp.y) / s + DIM.cheville;
    o[OS.bassin].position.set(0, yB, -0.03);
    o[OS.bassin].rotation.set(-0.12, 0, roul * 0.3);
    o[OS.ventre].rotation.set(0.1 + br * 0.3, this.ry * 0.12, roul * 0.5);
    o[OS.poitrine].rotation.set(0.1 - br, this.ry * 0.2 + vol * 0.12, roul * 0.4);
    o[OS.tete].rotation.set(0.0 + this.rp * 0.85, this.ry * 0.66 + vol * 0.45, -roul * 1.2);
    this.reperes();
    for (let j = 0; j < 2; j++) { const sg = JAMBES[j][1]; this.jambe(JAMBES[j][0], sg, sg * (dm.xh + 0.05), yP, 0.5, 0, sg * 0.1, 0.5); }
    // mains sur le volant (centre et rayon dans le repère du véhicule), qui tournent avec lui
    const cx = (P.volant.x - gp.x) / s, cy = (P.volant.y - gp.y) / s, cz = (P.volant.z - gp.z) / s - 0.025, R = P.rayon / s;
    // plan de la jante : vertical pour le tracteur (prise d'origine) ; incliné pour le van (son « midi » monte et s'éloigne,
    // les doigts passent la jante vers l'avant et le bas)
    const inc = P.inclinaison, uy = inc === undefined ? 1 : -Math.sin(inc), uz = inc === undefined ? 0 : Math.cos(inc);
    const fy = inc === undefined ? 0 : -Math.cos(inc), fz = inc === undefined ? 1 : -Math.sin(inc);
    for (let c = 0; c <= 3; c += 3) {
      const sg = c === 0 ? 1 : -1, a = sg * 1.2 + vol * 1.8;
      const gx = cx + Math.sin(a) * R, gy = cy + Math.cos(a) * R * uy, gz = cz + Math.cos(a) * R * uz;
      // prise : les doigts traversent la jante (vers l'avant et le moyeu), la paume tournée vers le moyeu
      v2.set(-Math.sin(a), -Math.cos(a) * uy, -Math.cos(a) * uz);   // vers le moyeu
      ey.set(v2.x * 0.35, v2.y * 0.35 + fy, v2.z * 0.35 + fz).normalize(); // direction des doigts
      v2.addScaledVector(ey, -v2.dot(ey)).normalize();
      ex.copy(v2).multiplyScalar(-sg);                                // paume = -x (gauche) ou +x (droite)
      ey.negate();                                                    // les doigts sont le -y de la main
      ez.crossVectors(ex, ey);
      qTel.setFromRotationMatrix(mR.makeBasis(ex, ey, ez));
      // poignet = prise moins la position de la paume dans la main
      v1.set(gx, gy, gz).addScaledVector(ex, sg * 0.02).addScaledVector(ey, 0.085);
      this.brasIK(c, v1.x, v1.y, v1.z, sg * 0.8, -0.6, -0.3, 1);
      this.mainVers(c, qTel, 1);
    }
  }

  /* ---------------------------------------------------------------- monter dans un véhicule, en descendre, temps par temps
     (gestes.js : appuis) : les pieds posés sur le sol, les marches, les barreaux, le plancher, les mains sur les poignées ;
     le bassin jamais plus haut que ce que les pieds posés permettent : le corps ne monte que quand la jambe d'en haut
     pousse et que celle d'en bas quitte sa marche (Teddy, 25/11/2026 : « on dirait qu'il fait du toboggan »).
     A (repère du personnage, Float64Array) : [0] poids des jambes posées, [1] buste penché, [2] poids du bassin retenu,
     puis chaque pied (x, y de la semelle, z, tangage, lacet ; gauche à 3, droit à 8) et chaque main (x, y, z du poignet,
     poids ; gauche à 13, droite à 17). */
  poseAppuis(A) {
    const o = this.o, dm = this.m.dim, wj = A[0], pen = A[1];
    if (pen) { o[OS.ventre].rotation.x += pen * 0.55; o[OS.poitrine].rotation.x += pen * 0.45; o[OS.tete].rotation.x -= pen * 0.55; }
    if (wj > 0.001 && A[2] > 0.001) {
      const bp = o[OS.bassin].position, Lm = (L1 + L2) * 0.975;
      let yb = bp.y;
      for (let j = 0; j < 2; j++) {
        // la hanche au plus haut pour que la jambe atteigne sa cheville (raccordé sans cassure sur 3 cm)
        const k = 3 + 5 * j, dx = A[k] - bp.x - JAMBES[j][1] * dm.xh, dz = A[k + 2] - bp.z;
        const haut = A[k + 1] + CH + Math.sqrt(Math.max(0.0025, Lm * Lm - dx * dx - dz * dz)) - DIM.yHanche;
        const h = Math.max(0.03 - Math.abs(yb - haut), 0) / 0.03;
        yb = Math.min(yb, haut) - h * h * 0.0075;
      }
      bp.y += (yb - bp.y) * wj * A[2];
    }
    this.reperes();
    if (wj > 0.001) for (let j = 0; j < 2; j++) { const k = 3 + 5 * j; this.jambeW(JAMBES[j][0], JAMBES[j][1], A[k], A[k + 1] + CH, A[k + 2], A[k + 3], A[k + 4], wj); }
    if (A[16] > 0.01) this.brasIK(0, A[13], A[14], A[15], 0.8, -0.45, -0.5, A[16]);
    if (A[20] > 0.01) this.brasIK(3, A[17], A[18], A[19], -0.8, -0.45, -0.5, A[20]);
  }
  // une jambe (jambe) mélangée à la pose déjà posée, de w
  jambeW(i, sg, x, y, z, tangage, lacet, w) {
    const o = this.o;
    if (w >= 0.999) { this.jambe(i, sg, x, y, z, tangage, lacet); return; }
    for (let k = 0; k < 3; k++) FK[k].copy(o[i + k].quaternion);
    this.jambe(i, sg, x, y, z, tangage, lacet);
    for (let k = 0; k < 3; k++) { q1.copy(o[i + k].quaternion); o[i + k].quaternion.copy(FK[k]).slerp(q1, w); }
  }

  /* ---------------------------------------------------------------- monter dans un véhicule, en descendre ; s'asseoir sur une
     chaise, se lever (gestes.js). p.transition : 0 debout, 1 assis (au volant ou sur la chaise) ; les deux poses sont
     calculées puis mélangées os par os. Les mains ne prennent le volant qu'à la fin (sa position suppose le personnage
     déjà tourné vers l'avant) ; on se baisse pour passer. */
  poseTransition(dt, p, t, br, conduite) {
    const o = this.o, w = p.transition, n = o.length;
    this.poseDebout(dt, p, 0, 1, br);
    for (let i = 0; i < n; i++) MEMO[i].copy(o[i].quaternion);
    vMemo.copy(o[OS.bassin].position);
    if (conduite) this.poseConduite(dt, p, t, br); else this.poseAssise(br);
    const wb = entre(0.8, 1, w);
    for (let i = 0; i < n; i++) { q1.copy(o[i].quaternion); o[i].quaternion.copy(MEMO[i]).slerp(q1, BRAS.includes(i) ? wb : w); }
    v1.copy(o[OS.bassin].position); o[OS.bassin].position.copy(vMemo).lerp(v1, w);
    const baisse = Math.sin(PI * w) * (p.baisse ?? 0.3);
    o[OS.ventre].rotation.x += baisse * 0.6; o[OS.poitrine].rotation.x += baisse * 0.5; o[OS.tete].rotation.x -= baisse * 0.5;
  }

  // Servir : S = { t, duree }. On lève le verre et la bouteille, on verse, on range la bouteille, on tend le verre ;
  // à 80 % le verre passe à l'autre (main.js), puis les bras redescendent.
  poseService(S, yB, w) {
    const A = accessoires(this.m);
    if (!S) { A.bouteille.visible = false; A.verre.visible = false; return; }
    const u = borne(S.t / S.duree, 0, 1), wg = entre(0, 0.1, u) * (1 - entre(0.84, 1, u)) * w;
    const tend = entre(0.6, 0.78, u), verse = entre(0.13, 0.22, u) * (1 - entre(0.5, 0.58, u));
    // le verre, main gauche : devant la poitrine, puis tendu
    vG.set(0.07 - 0.05 * tend, yB + 0.27 + 0.09 * tend, 0.33 + 0.15 * tend);
    A.verre.visible = u < 0.8 && wg > 0.05; A.verre.position.copy(vG); A.verre.rotation.set(0, 0, 0);
    A.vin.scale.y = Math.max(0.02, entre(0.2, 0.52, u));
    this.brasIK(0, vG.x + 0.035, vG.y + 0.01, vG.z - 0.06, 0.7, -0.7, -0.2, wg);
    // la bouteille, main droite : au repos contre soi, penchée au-dessus du verre pendant qu'on verse, puis rangée
    const rz = -0.35 - 1.55 * verse, mx = -Math.sin(rz) * 0.3, my = Math.cos(rz) * 0.3; // goulot dans le repère de la bouteille tournée
    vB.set(-0.12, yB + 0.16, 0.26);
    v2.set(vG.x - mx, vG.y + 0.17 - my, vG.z + 0.01);
    vB.lerp(v2, verse);
    A.bouteille.visible = wg > 0.05 && u < 0.66; A.bouteille.position.copy(vB); A.bouteille.rotation.set(0, 0, rz);
    // poignet : sur le corps de la bouteille (un tiers de sa hauteur), décalé vers l'extérieur
    v1.set(vB.x - Math.sin(rz) * 0.1 - 0.04, vB.y + Math.cos(rz) * 0.1 - 0.03, vB.z - 0.05);
    this.brasIK(3, v1.x, v1.y, v1.z, -0.7, -0.7, -0.2, wg * (1 - entre(0.6, 0.68, u)));
  }

  // Boire : p.tVerre (s depuis qu'on a reçu le verre) ; on le reçoit, on trinque (« Santé ! »), on boit, on le baisse
  poseBoire(p, yB, w) {
    const A = accessoires(this.m), t = p.tVerre || 0, o = this.o;
    if (!(p.verre > 0)) { A.verre.visible = false; return; }
    const sante = entre(0.4, 1.0, t) * (1 - entre(1.5, 1.9, t)), boit = entre(1.6, 2.1, t) * (1 - entre(3.3, 3.8, t));
    const baisse = entre(3.4, 4.0, t);
    vG.set(-0.05, yB + 0.38, 0.42);                                   // reçu, bras tendu
    vG.lerp(v1.set(-0.1, yB + 0.62, 0.34), sante);                    // levé pour trinquer
    vG.lerp(v1.set(-0.03, yB + 0.64, 0.17), boit);                    // au bord des lèvres
    vG.lerp(v1.set(-0.09, yB + 0.33, 0.24), baisse * (1 - boit));     // redescendu, vide
    A.verre.visible = w > 0.05; A.verre.position.copy(vG); A.verre.rotation.set(-1.15 * boit, 0, 0);
    A.vin.scale.y = Math.max(0.02, 1 - entre(1.9, 3.3, t));
    this.brasIK(3, vG.x - 0.035, vG.y + 0.01, vG.z - 0.06, -0.7, -0.7, -0.2, w);
    o[OS.tete].rotation.x -= 0.22 * boit * w;                         // la tête part un peu en arrière en buvant
  }

  // Oriente la main (c : 0 gauche, 3 droite) selon q, exprimé dans le repère du personnage
  mainVers(c, q, w) {
    const o = this.o;
    q1.copy(qP).multiply(o[BRAS[c]].quaternion).multiply(o[BRAS[c + 1]].quaternion).invert().multiply(q);
    o[BRAS[c + 2]].quaternion.slerp(q1, w);
  }
}
