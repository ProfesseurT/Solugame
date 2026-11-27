// Animation procédurale des personnages, sans fichier d'animation et sans allocation par image.
// Marche, petite course et course se mélangent selon la vitesse ; les pieds suivent une foulée accordée à la vitesse et à
// la longueur des jambes (foulee) : au sol pendant l'appui, le pied roule du talon à la pointe sans glisser ; le bassin
// descend quand les deux pieds sont au sol et remonte au passage, d'après ce que les jambes atteignent (cinématique
// inverse : pied jamais en l'air pendant l'appui). Au repos : respiration,
// transfert de poids, coups d'œil, parfois un regard au téléphone. Regard vers un point, téléphone en main,
// signe de la main, pose assise, mains sur le volant, saut de côté, recul contre un mur.
import * as THREE from 'three';
import { OS, DIM, accessoires, cigarette, CIG } from './perso.js';
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
// à vélo (velos.js : p.velo, un Float64Array de VL.N nombres) : le dessus de la selle, les poignées gauche et droite, les
// axes des pédales gauche et droite (x, y, z, repère du vélo penché, en mètres) ; l'angle du pédalier ; danseuse et pied à
// terre (0 à 1) ; le sol sous le pied gauche ; les doigts et la paume de la main gauche (des directions) ; le roulis du vélo
export const VL = { selle: 0, mainG: 3, mainD: 6, pedG: 9, pedD: 12, mani: 15, danseuse: 16, pied: 17, sol: 18, doigts: 21, paume: 24, roulis: 27, N: 28 };
// fumer : la bouche, le filtre, la main (temporaires)
const vBouche = new THREE.Vector3(), qMain = new THREE.Quaternion();
// pose debout gardée le temps de la mélanger à la pose au volant (monter, descendre)
const MEMO = Array.from({ length: 32 }, () => new THREE.Quaternion()), vMemo = new THREE.Vector3();
// la pose de l'image d'avant, le temps qu'un enfant passe d'un jeu à l'autre (poser : lisse)
const PREC = Array.from({ length: 18 }, () => new THREE.Quaternion()), vPrec = new THREE.Vector3();

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
// (les longueurs des deux os : T[k] et T[k + 1], lues dans le tableau du personnage, Anim.long : des nombres passés en
// arguments seraient mis en boîte par V8 à chaque appel)
function ik(a, b, T, k, cible, pole, sens) {
  const l1 = T[k], l2 = T[k + 1];
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
    // cuisse, tibia, bras, avant-bras, hauteur du bassin debout (perso.js : m.dim ; un enfant les a plus courts)
    const d = m.dim;
    this.long = new Float64Array([d.L1 || DIM.cuisse, d.L2 || DIM.tibia, d.bras || DIM.bras, d.avantBras || DIM.avantBras, d.yB || DIM.yBassin]);
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
    this.wFume = 0; this.tFume = 2 + r() * 6; this.uFume = -1; this.fRepos = r() < 0.6 ? 1 : 0; this.fAutre = r() < 0.5 ? 1 : 0;
    this.wParle = 0; this.att = 0; this.tAtt = 4 + r() * 10; this.wAtt = 0; this.tCligne = 0.5 + r() * 4; this.cligne = 0;
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
    if (immobile && !m.enfant && this.repos > 4 && this.envie <= 0 && (this.tEnvie -= dt) <= 0) { this.envie = 2.5 + r() * 3.5; this.tEnvie = 14 + r() * 24; }
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
    // (un enfant qui joue : ecole.js ; quand il passe d'un jeu à l'autre, sa pose glisse de l'ancienne à la nouvelle)
    const lisse = m.enfant && this.changeJeu(p, dt);
    if (p.jeu) this.poseJeu(dt, p, t, va, sens, br);
    else if (p.velo) this.poseVelo(p, br); // à vélo (velos.js)
    else if (p.transition != null && p.assis) this.poseTransition(dt, p, t, br, conduite);
    else if (conduite) this.poseConduite(dt, p, t, br);
    else if (p.assis) this.poseAssise(br, p, t, dt);
    else this.poseDebout(dt, p, va, sens, br);
    this.conduite = conduite;
    // parler (p.parle, vrai ou de 0 à 1 ; au bureau, poseClavier s'en charge) : la tête hoche et tourne, une main accompagne
    const pa = p.parle === true ? 1 : +p.parle || 0;
    this.wParle += (pa - this.wParle) * kl(dt, 4);
    const libres = !p.fume && !pile && !p.outil && this.wTel < 0.05 && this.wSalut < 0.05 && !p.service && !(p.verre > 0) && !p.appuis && !p.saisir && !(p.caresse && p.caresse.w > 0.01) && !p.jeu && !p.velo;
    if (this.wParle > 0.01 && !(p.assis && p.clavier) && !conduite) {
      const w = this.wParle;
      o[OS.tete].rotation.x += w * (0.05 * Math.sin(t * 3.3) + 0.03 * Math.sin(t * 7.1 + 1));
      o[OS.tete].rotation.y += w * 0.14 * Math.sin(t * 0.8 + this.resp);
      o[OS.tete].rotation.z += w * 0.04 * Math.sin(t * 1.3);
      if (libres) {
        const yb = o[OS.bassin].position.y, gs = w * (0.55 + 0.45 * Math.sin(t * 0.9 + this.resp * 2));
        this.brasIK(0, 0.15 + 0.05 * Math.sin(t * 1.7), yb + 0.2 + 0.05 * Math.sin(t * 2.9), 0.26 + 0.03 * Math.sin(t * 2.3), 0.7, -0.5, -0.6, gs);
        o[OS.mainG].rotation.x -= 0.6 * gs; o[OS.mainG].rotation.y += 0.9 * gs;
      }
    }
    // Une attitude, à l'arrêt, de temps en temps (un adulte debout, les mains libres) : les mains jointes devant, dans le
    // dos, les bras croisés (pas en manteau ni en doudoune), une main sur la hanche. Fondue en 0,6 s.
    const tr = this.m.traits, debout = immobile && !p.assis && libres && !this.m.enfant && this.wParle < 0.05 && !(tr && tr.canne);
    if ((this.tAtt -= dt) <= 0) {
      this.tAtt = 6 + r() * 12;
      const x = r(), epais = tr && (tr.tenue === 'manteau' || tr.tenue === 'doudoune');
      this.att = x < 0.5 ? 0 : x < 0.65 ? 1 : x < 0.8 ? 2 : x < 0.9 && !epais ? 3 : 4;
    }
    this.wAtt += ((debout && this.repos > 2 && this.att ? 1 : 0) - this.wAtt) * kl(dt, 3);
    if (this.wAtt > 0.01 && this.att && !p.assis && !p.jeu && !p.velo) {
      const w = this.wAtt, yb = o[OS.bassin].position.y, dm = this.m.dim;
      if (this.att === 1) { this.brasIK(0, 0.035, yb - 0.07, 0.15, 0.8, -0.3, 0.2, w); this.brasIK(3, -0.035, yb - 0.06, 0.16, -0.8, -0.3, 0.2, w); }
      else if (this.att === 2) { this.brasIK(0, 0.05, yb + 0.03, -0.17, 1, -0.2, -0.6, w); this.brasIK(3, -0.05, yb + 0.05, -0.18, -1, -0.2, -0.6, w); }
      else if (this.att === 3) { this.brasIK(0, -0.11, yb + 0.37, 0.17, 1, -0.4, 0.2, w); this.brasIK(3, 0.11, yb + 0.35, 0.2, -1, -0.4, 0.2, w); }
      else this.brasIK(0, dm.xh + 0.12, yb + 0.08, 0.01, 1, -0.1, -0.4, w);
    }
    // fumer (p.fume), debout ou assis
    if (p.fume || (this.wFume > 0.01)) this.poseFume(p, t, dt, conduite);
    if (p.appuis) this.poseAppuis(p.appuis);
    if (p.caresse && p.caresse.w > 0.01 && !p.assis) this.poseCaresse(p.caresse);
    if (lisse) this.lisserJeu(dt);

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
    /* ------------------------------------------------ le clignement (perso.js : les paupières fermées, sur l'os de la mèche
       de qui n'a pas de queue de cheval ; l'œil ouvert, l'os les écrase dans le pli de la paupière et les recule) : toutes
       les 2 à 6,5 s, fermé en 80 ms, rouvert en 80 ms ; parfois deux fois de suite */
    if (m.paupieres) {
      if ((this.tCligne -= dt) <= 0) { this.tCligne = r() < 0.15 ? 0.3 : 2 + r() * 4.5; this.cligne = 0.16; }
      this.cligne = Math.max(0, this.cligne - dt);
      const c = this.cligne > 0 ? Math.sin(PI * this.cligne / 0.16) : 0, b = o[OS.meche];
      b.scale.y = 0.03 + 0.97 * c; b.position.z = m.mecheZ - 0.004 * (1 - c);
    }
  }

  // Bras par cinématique inverse, mélangé à la pose déjà posée. c : 0 gauche, 3 droit ; cible et pôle dans le repère du personnage.
  brasIK(c, x, y, z, px, py, pz, w) {
    const o = this.o, a = o[BRAS[c]], b = o[BRAS[c + 1]];
    if (w < 0.999) { FK[c].copy(a.quaternion); FK[c + 1].copy(b.quaternion); }
    v1.set(x, y, z).applyMatrix4(mPi);
    v2.set(px, py, pz).applyQuaternion(qPi);
    ik(a, b, this.long, 2, v1, v2, 1);
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
    ik(cuisse, genou, this.long, 0, v1, v2, -1);
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
    // (un enfant : ses jambes, plus courtes ; il court plus tôt, à vitesse égale, et à plus petits pas : kv, sa vitesse
    // ramenée à des jambes d'adulte, comme le nombre de Froude)
    const LG = this.long, L1 = LG[0], L2 = LG[1], enf = this.m.enfant, kv = enf ? Math.sqrt(0.806 / ((L1 + L2) * E)) : 1, vk = va * kv;
    const tourne = borne(Math.abs(p.om) / 2.2, 0, 1) * (1 - entre(0.4, 1.2, va));
    this.wPas += ((tourne > 0.2 ? 1 : 0) - this.wPas) * kl(dt, 8);
    const wg = entre(0.03, 0.5, va), w = entre(2.4, 4.6, vk);
    // Cadence (cycles de deux pas par seconde). En marchant, la foulée suit la longueur des jambes (relation d'Alexander :
    // foulée / jambe = 2,3 x (v² / g x jambe)^0,3, ici un peu allongée) : des jambes courtes font des pas plus courts et
    // plus vifs ; en courant, la cadence monte doucement avec la vitesse. Foulée (S, repère du personnage : à son échelle,
    // sinon les pieds glisseraient) ; part du cycle où le pied est au sol (beta), chemin qu'il y fait (pas).
    const jw = (L1 + L2) * E, vw = Math.max(va, 0.03);
    const cad = mix(vw / (2.45 * jw * Math.pow(vw * vw / (9.81 * jw), 0.3)), (1.3 + 0.1 * va) * (enf ? Math.sqrt(kv) : 1), w);
    this.ph += dt * Math.max(va > 0.03 ? cad : 0, this.wPas * 1.7) * sens;
    this.ph -= Math.floor(this.ph);
    const ph = this.ph, beta = 0.6 - 0.3 * w, S = va > 0.03 ? va / (cad * E) : 0, pas = Math.min(beta * S, 1.05 * (L1 + L2) / 0.84);
    const lever = ((0.03 + 0.06 * Math.min(1, vk / 1.4)) * (1 - w) + 0.26 * w * (L1 + L2) / 0.84) * wg + 0.07 * this.wPas * (1 - wg);
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
    let yb = LG[4] - 0.014 + wg * (0.011 * (1 - w) - 0.062 * w) - 0.04 * w * wg * Math.cos(2 * TAU * (ph - beta / 2));
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
    const A = mix(0.56 * Math.min(1, vk / 1.3), 0.75, w) * wg * sens, retard = 0.06 * (1 - w);
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

  // Un enfant change de jeu (s'asseoir, se relever, s'accroupir, sauter) : on garde la pose de l'image d'avant ; rend vrai
  // tant qu'il faut glisser de l'une à l'autre (lisserJeu, après la nouvelle pose)
  changeJeu(p, dt) {
    const jeu = p.jeu ? p.jeu.g : null;
    if (jeu !== this.jeuPrec) { if (this.jeuPrec !== undefined && dt > 0) this.tLisse = 0.4; this.jeuPrec = jeu; }
    if (!(this.tLisse > 0 && dt > 0)) return false;
    const o = this.o;
    for (let i = 0; i < o.length; i++) PREC[i].copy(o[i].quaternion);
    vPrec.copy(o[OS.bassin].position);
    return true;
  }
  lisserJeu(dt) {
    const o = this.o, k = 1 - Math.exp(-dt * 10);
    this.tLisse -= dt;
    for (let i = 0; i < o.length; i++) { q1.copy(o[i].quaternion); o[i].quaternion.copy(PREC[i]).slerp(q1, k); }
    v1.copy(o[OS.bassin].position); o[OS.bassin].position.copy(vPrec).lerp(v1, k);
  }

  /* ---------------------------------------------------------------- les jeux des enfants (ecole.js)
     p.jeu = { g, u, ... } : g le jeu, u sa phase (de 0 à 1) ; mg, md : où vont la main gauche et la main droite (repère du
     personnage, unités du modèle), ou null (ecole.js les calcule : tenir la main d'un autre dans la ronde, tourner la
     corde, la main dans celle de son parent). Longueurs à l'échelle des jambes de l'enfant (L : cuisse et tibia).
     - debout : marcher, courir (poseDebout), les mains où l'on veut ;
     - saut : sauter à pieds joints (la corde : J.corde, celle qu'on tourne soi-même) ; cloche : à cloche-pied (J.pied :
       1 le pied gauche, -1 le droit ; J.deux : on se reçoit sur les deux pieds, écartés, dans les cases doubles) ;
     - accroupi : J.v 'billes' (une main pousse la bille : J.k), 'sable' (les deux mains creusent), sinon les mains libres ;
     - balancoire : assis sur le siège (l'origine du groupe), les mains aux chaînes (J.cx : leur écart), J.p : de 0 les
       jambes repliées sous le siège à 1 tendues devant (on « pompe ») ; ressort : à califourchon sur le jeu à ressort,
       les pieds sur les repose-pieds, les mains aux poignées ; glisse : assis sur le toboggan, les jambes tendues, les
       bras en l'air (J.bras) ou aux bords ;
     - banc : assis (poseAssise), les jambes qui pendent se balancent, une main parle (J.parle, de 0 à 1) ;
     - tir : un coup de pied dans le ballon (J.u : l'élan, la frappe, l'accompagnement) ;
     - croise, dos : un adulte qui surveille, les bras croisés ou les mains dans le dos. */
  poseJeu(dt, p, t, va, sens, br) {
    const J = p.jeu, o = this.o, dm = this.m.dim, b = o[OS.bassin], g = J.g;
    const L = this.long[0] + this.long[1], yB0 = this.long[4], xh = dm.xh, k = L / 0.84;
    switch (g) {
      case 'saut': case 'cloche': {
        // en l'air pendant la part « air » du saut (une parabole), puis l'amorti à la réception, genoux pliés
        const u = J.u, air = J.air ?? 0.55, h = (J.h ?? 0.13) * k, enAir = u < air;
        const lift = enAir ? h * Math.sin(PI * u / air) : 0, c = enAir ? 0 : 0.07 * L * Math.sin(PI * (u - air) / (1 - air));
        b.position.set(0, yB0 - 0.02 * L - c + lift, 0);
        this.dos(0.06 + c * 1.5, 0.05 + c, 0.04 + c * 0.5, -0.08 - c, br);
        const pointe = enAir ? 0.4 * Math.sin(PI * u / air) : 0;
        if (g === 'saut' || J.deux) for (let j = 0; j < 2; j++) { const sg = JAMBES[j][1]; this.jambe(JAMBES[j][0], sg, sg * (xh + (J.deux ? 0.08 : 0.015)), CH + lift, 0.02, pointe, sg * 0.1); }
        else for (let j = 0; j < 2; j++) {
          // à cloche-pied : la jambe d'appui sous le corps, l'autre repliée derrière
          const sg = JAMBES[j][1];
          if (sg === (J.pied || 1)) this.jambe(JAMBES[j][0], sg, sg * (xh - 0.01), CH + lift, 0.03, pointe, sg * 0.08);
          else this.jambe(JAMBES[j][0], sg, sg * (xh + 0.01), CH + lift + 0.34 * L, -0.24 * L, 0.7, sg * 0.1);
        }
        const yb = b.position.y;
        if (g === 'cloche') { const d = 0.03 * Math.sin(TAU * u); for (let c0 = 0; c0 <= 3; c0 += 3) { const s = c0 ? -1 : 1; this.brasIK(c0, s * 0.4, yb + 0.24 + d, 0.08, s * 0.8, -0.6, -0.3, 1); } }
        else if (J.corde) {
          // sa corde à sauter : les mains tournent les poignées, un tour par saut
          const f = TAU * u + (J.dphi || 0);
          for (let c0 = 0; c0 <= 3; c0 += 3) { const s = c0 ? -1 : 1; this.brasIK(c0, s * 0.27, yb + 0.02 + 0.05 * Math.cos(f), 0.12 + 0.05 * Math.sin(f), s * 0.8, -0.6, -0.3, 1); }
        } else for (let c0 = 0; c0 <= 3; c0 += 3) { const s = c0 ? -1 : 1; this.brasIK(c0, s * 0.25, yb + 0.03, 0.12, s * 0.8, -0.6, -0.3, 1); }
        break;
      }
      case 'accroupi': {
        // accroupi, les cuisses presque à plat, penché en avant, les pieds écartés, les genoux devant
        const yS = CH + 0.42 * L + 0.02 + (J.dy || 0);
        b.position.set(0, yS, -0.08 * k);
        this.dos(0.35, 0.25, 0.15, -0.35 + (J.baisse || 0), br);
        for (let j = 0; j < 2; j++) { const sg = JAMBES[j][1]; this.jambe(JAMBES[j][0], sg, sg * (xh + 0.07), CH, 0.06, 0, sg * 0.25, 0); }
        if (J.v === 'billes') {
          const f = J.k || 0;
          this.brasIK(3, -0.05, 0.03 + 0.03 * (1 - f), 0.34 * k + 0.07 * f, -0.7, -0.3, -0.5, 1);
          this.brasIK(0, xh + 0.05, yS + 0.05, 0.28 * k, 0.8, -0.4, -0.5, 1);
        } else if (J.v === 'sable') {
          const s1 = Math.sin(t * 5.2 + (J.dphi || 0));
          this.brasIK(3, -0.08, 0.04 + 0.1 * Math.max(0, s1), 0.33 * k, -0.7, -0.3, -0.5, 1);
          this.brasIK(0, 0.09, 0.04 + 0.1 * Math.max(0, -s1), 0.3 * k, 0.7, -0.3, -0.5, 1);
        }
        break;
      }
      case 'balancoire': case 'ressort': case 'glisse': {
        // assis sur le jeu, dont le siège est l'origine du groupe (ecole.js le pose et le fait bouger)
        const pp = g === 'balancoire' ? J.p : 0;
        b.position.set(0, 0.1, -0.02);
        if (g === 'balancoire') this.dos(-0.12 - 0.25 * pp, 0.06 - 0.06 * pp, 0.05 - 0.05 * pp, 0.05 + 0.18 * pp, br);
        else if (g === 'ressort') this.dos(0.02 + (J.k || 0) * 0.12, 0.05, 0.04, -0.05, br);
        else this.dos(-0.3, 0.12, 0.1, 0.12, br);
        for (let j = 0; j < 2; j++) {
          const sg = JAMBES[j][1];
          if (g === 'balancoire') this.jambe(JAMBES[j][0], sg, sg * (xh + 0.02), mix(0.05 - 0.8 * L, 0.0 - 0.1 * L, pp), mix(0.04, 0.92 * L, pp), mix(0.25, -0.25, pp), sg * 0.06, 0.7);
          else if (g === 'ressort') this.jambe(JAMBES[j][0], sg, sg * (xh + 0.1), 0.06 - 0.55 * L, 0.24 * k, 0, sg * 0.15, 0.3);
          else this.jambe(JAMBES[j][0], sg, sg * (xh + 0.03), 0.07, 0.93 * L, -0.35, sg * 0.1, 0.5);
        }
        for (let c0 = 0; c0 <= 3; c0 += 3) {
          const s = c0 ? -1 : 1;
          if (g === 'balancoire') this.brasIK(c0, s * J.cx, 0.62, 0.01, s * 0.8, -0.2, -0.6, 1);
          else if (g === 'ressort') this.brasIK(c0, s * 0.09, 0.42, 0.25 * k, s * 0.8, -0.5, -0.3, 1);
          else if (J.bras) this.brasIK(c0, s * 0.26, 0.98, 0.12, s * 0.8, 0.2, -0.4, 1);
          else this.brasIK(c0, s * 0.25, 0.08, 0.06, s * 0.8, -0.5, -0.4, 1);
        }
        break;
      }
      case 'banc': {
        // assis : les jambes qui pendent se balancent l'une après l'autre ; une main accompagne ce qu'on raconte
        this.poseAssise(br, p);
        const s = this.m.echelle, gr = this.m.groupe, yP = (((p.y0) || 0) - gr.position.y) / s + CH, yb = b.position.y;
        for (let j = 0; j < 2; j++) { const sg = JAMBES[j][1]; this.jambe(JAMBES[j][0], sg, sg * (xh + 0.04), yP, 0.3 + 0.14 * Math.sin(t * 2.6 + sg * 1.3 + (J.dphi || 0)), 0.2, sg * 0.12, 0.6); }
        if (J.parle > 0.01) this.brasIK(3, -0.1 + 0.04 * Math.sin(t * 4.3), yb + 0.3 + 0.05 * Math.sin(t * 6.1), 0.27, -0.7, -0.5, -0.4, J.parle);
        break;
      }
      case 'tir': {
        // l'élan (la jambe droite part en arrière), la frappe, l'accompagnement (le pied monte devant), le retour
        this.poseDebout(dt, p, va, sens, br);
        const u = J.u, e = entre(0, 0.35, u) * (1 - entre(0.35, 0.5, u)), f = entre(0.35, 0.55, u) * (1 - entre(0.75, 1, u));
        const z = mix(mix(0.02, -0.28 * k, e), 0.5 * k, f), y = CH + mix(0.18 * L * e, 0.3 * L, f);
        b.rotation.x -= 0.15 * f; this.reperes();
        this.jambe(OS.cuisseG, 1, xh + 0.02, CH, 0.04, 0, 0.1);
        this.jambe(OS.cuisseD, -1, -xh, y, z, mix(0.3 * e, -0.2, f), -0.05);
        o[OS.brasG].rotation.set(-0.5 * f, 0, 0.6 + 0.4 * f);
        break;
      }
      case 'croise': case 'dos': {
        this.poseDebout(dt, p, va, sens, br);
        const yb = b.position.y;
        if (g === 'croise') { this.brasIK(0, -0.11, yb + 0.37, 0.16, 1, -0.4, 0.2, 1); this.brasIK(3, 0.11, yb + 0.35, 0.19, -1, -0.4, 0.2, 1); }
        else { this.brasIK(0, 0.05, yb + 0.03, -0.17, 1, -0.2, -0.6, 1); this.brasIK(3, -0.05, yb + 0.05, -0.18, -1, -0.2, -0.6, 1); }
        break;
      }
      default: this.poseDebout(dt, p, va, sens, br); // debout
    }
    // les mains où ecole.js les veut (la ronde, la corde qu'on tourne, la main dans celle d'un autre)
    if (J.mg) this.brasIK(0, J.mg[0], J.mg[1], J.mg[2], 0.8, -0.5, -0.3, J.wg ?? 1);
    if (J.md) this.brasIK(3, J.md[0], J.md[1], J.md[2], -0.8, -0.5, -0.3, J.wd ?? 1);
  }

  // le dos d'un enfant qui joue : bassin, ventre, poitrine, tête penchés (en avant : positif), le regard en plus
  dos(pb, pv, pp, pt, br) {
    const o = this.o;
    o[OS.bassin].rotation.set(pb, 0, 0.02 * this.poids);
    o[OS.ventre].rotation.set(pv + br * 0.3, this.ry * 0.12, 0);
    o[OS.poitrine].rotation.set(pp - br + this.rp * 0.12, this.ry * 0.22, 0);
    o[OS.tete].rotation.set(pt + this.rp * 0.85, this.ry * 0.66, 0);
    this.reperes();
  }

  /* ---------------------------------------------------------------- assis sur un banc ou une chaise */
  poseAssise(br, p, t = 0, dt = 0) {
    // (p.y0 : la hauteur du sol sous la chaise ; les terrasses et les bancs du village du château sont sur son plateau)
    const o = this.o, g = this.m.groupe, s = this.m.echelle, dm = this.m.dim, y0 = (p && p.y0) || 0;
    const yB = (y0 + ((p && p.siege) || 0.46) + 0.1 - g.position.y) / s + 0.1, yP = (y0 - g.position.y) / s + DIM.cheville;
    o[OS.bassin].position.set(0, yB, -0.02);
    o[OS.bassin].rotation.set(-0.14, 0, 0.02 * this.poids);
    o[OS.ventre].rotation.set(0.1 + br * 0.3, this.ry * 0.12, 0);
    o[OS.poitrine].rotation.set(0.08 - br + this.rp * 0.12, this.ry * 0.22, -0.02 * this.poids);
    o[OS.tete].rotation.set(-0.02 + this.rp * 0.85, this.ry * 0.66, 0);
    this.reperes();
    for (let j = 0; j < 2; j++) { const sg = JAMBES[j][1]; this.jambe(JAMBES[j][0], sg, sg * (dm.xh + 0.04), yP, 0.42 + (sg * this.poids > 0 ? 0.06 : 0), 0, sg * 0.12, 0.6); }
    // mains posées sur les cuisses ; au bureau (p.clavier), au travail : poseClavier
    if (p && p.clavier) { this.poseClavier(p, t, dt, (y0 + 0.82 - g.position.y) / s, yB, s); return; }
    this.brasIK(0, dm.xh + 0.03, yB + 0.06, 0.24, 0.6, -0.4, -1, 1);
    this.brasIK(3, -dm.xh - 0.03, yB + 0.06, 0.24, -0.6, -0.4, -1, 1);
    o[OS.mainG].rotation.set(-0.5, 0, 0.3); o[OS.mainD].rotation.set(-0.5, 0, -0.3);
  }

  /* ---------------------------------------------------------------- au bureau (p.clavier : assis devant un clavier)
     On travaille : on tape (penché vers l'écran, les mains qui sautillent sur les touches, par rafales), on prend la
     souris (la main droite à droite du clavier, qui glisse), on lit (plus penché, les mains posées), on s'adosse un moment
     (pas le héros, au portable : le joueur s'en sert). Un état tiré au hasard toutes les 3 à 11 s, les poses fondues l'une
     dans l'autre. p.parle (vrai, ou de 0 à 1) : on parle au casque ou au téléphone, la tête hoche et tourne, la main
     gauche fait des gestes, la droite reste sur la souris. Le clavier : à 0,82 m du sol, à p.clavierZ (m) devant soi (par
     défaut : les poignets à 0,44 m, le clavier des postes de Solumatic à 0,5 m ; le portable du héros, plus loin). yC : sa hauteur, repère du personnage. */
  poseClavier(p, t, dt, yC, yB, s) {
    const o = this.o, dm = this.m.dim, heros = !!(this.m.traits && this.m.traits.heros), B = this.bur || (this.bur = new Float64Array(16));
    const kz = p.clavierZ != null ? p.clavierZ / s : heros ? 0.62 : 0.46;
    // B : [état, minuteur, poids de taper, de la souris, de lire, d'adossé, de parler, phase de la rafale, rafale]
    if (dt === 0 || (B[1] -= dt) <= 0) {
      const r = Math.random();
      B[0] = r < 0.46 ? 0 : r < 0.72 ? 1 : r < 0.88 || heros ? 2 : 3; B[1] = 3 + Math.random() * 8;
      if (dt === 0) for (let k = 2; k < 6; k++) B[k] = k - 2 === B[0] ? 1 : 0;
    }
    const pa = p.parle === true ? 1 : +p.parle || 0, kk = kl(dt, 3);
    for (let k = 0; k < 4; k++) B[2 + k] += ((B[0] === k ? 1 : 0) - B[2 + k]) * kk;
    B[6] += (pa - B[6]) * kl(dt, 4);
    const wT = B[2], wS = B[3], wL = B[4], wA = B[5], wP = B[6];
    // la rafale : on tape par à-coups (une enveloppe lente), chaque main à son rythme
    B[7] += dt * (0.6 + 0.5 * Math.sin(t * 0.37 + this.resp));
    const raf = wT * Math.max(0, Math.sin(B[7] * 2.1) * 1.3 - 0.2);
    // le buste : penché vers l'écran pour taper, davantage pour lire, en arrière adossé
    const pen = 0.12 * wT + 0.1 * wS + 0.2 * wL - 0.1 * wA, penP = 0.1 * wT + 0.08 * wS + 0.15 * wL - 0.12 * wA;
    o[OS.ventre].rotation.x += pen; o[OS.poitrine].rotation.x += penP;
    o[OS.tete].rotation.x += 0.06 * wL - 0.06 * wA - 0.6 * this.rp * (1 - wA); // (le regard reste sur l'écran)
    o[OS.tete].rotation.y -= this.ry * 0.45 * (1 - wA);
    if (wP > 0.01) {
      // parler : la tête hoche et tourne un peu, le buste suit
      o[OS.tete].rotation.x += wP * (0.05 * Math.sin(t * 3.3) + 0.03 * Math.sin(t * 7.1 + 1));
      o[OS.tete].rotation.y += wP * 0.16 * Math.sin(t * 0.8 + this.resp);
      o[OS.tete].rotation.z += wP * 0.05 * Math.sin(t * 1.3);
      o[OS.poitrine].rotation.y += wP * 0.05 * Math.sin(t * 0.8 + this.resp);
    }
    this.reperes();
    // la main droite : sur le clavier, ou sur la souris (aussi en parlant et adossé)
    const surSouris = Math.min(1, wS + wA + wP);
    const tapD = raf * 0.012 * Math.max(0, Math.sin(t * 19.3 + 1.1)), tapG = raf * 0.012 * Math.max(0, Math.sin(t * 17.1 + 2.7));
    const xd = mix(-0.13 + 0.012 * Math.sin(t * 4.1) * wT, -0.33 + 0.02 * Math.sin(t * 1.3), surSouris);
    const yd = mix(yC + tapD, yC - 0.015, surSouris), zd = mix(kz, kz - 0.03 + 0.015 * Math.sin(t * 1.7), surSouris);
    this.brasIK(3, xd, yd, zd, -0.7, -0.5, -0.6, 1);
    o[OS.mainD].rotation.set(0.25, 0, -0.2 + 0.15 * surSouris);
    // la main gauche : sur le clavier ; posée sur la cuisse, adossé ; des gestes, en parlant (par moments)
    const geste = wP * (0.55 + 0.45 * Math.sin(t * 0.9 + this.resp * 2)), cuisse = wA * (1 - geste);
    let xg = 0.13 + 0.012 * Math.sin(t * 3.7) * wT, yg = yC + tapG, zg = kz;
    xg = mix(xg, dm.xh + 0.05, cuisse); yg = mix(yg, yB + 0.07, cuisse); zg = mix(zg, 0.3, cuisse);
    xg = mix(xg, 0.12 + 0.05 * Math.sin(t * 1.7), geste); yg = mix(yg, yC + 0.12 + 0.05 * Math.sin(t * 2.9), geste); zg = mix(zg, kz - 0.14 + 0.03 * Math.sin(t * 2.3), geste);
    this.brasIK(0, xg, yg, zg, 0.7, -0.5, -0.6, 1);
    o[OS.mainG].rotation.set(mix(0.25, -0.5, cuisse) - 0.6 * geste, 0.9 * geste, mix(0.2, 0.3, cuisse) + 0.2 * geste);
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
    const o = this.o, dm = this.m.dim, wj = A[0], pen = A[1], L1 = this.long[0], L2 = this.long[1];
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

  /* ---------------------------------------------------------------- à genoux pour caresser le chien (gestes.js : caresser)
     C = { x, y, z, w } : où va la main droite (repère du personnage), w de 0 (debout) à 1. Le genou droit à terre, le pied
     sur la pointe ; le pied gauche à plat devant, le genou levé ; le buste penché vers le chien ; la main gauche posée sur
     le genou gauche. Mélangée à la pose debout. */
  poseCaresse(C) {
    const o = this.o, dm = this.m.dim, w = C.w, b = o[OS.bassin];
    b.position.y = mix(b.position.y, 0.53, w); b.position.z = mix(b.position.z, -0.06, w);
    b.rotation.x = mix(b.rotation.x, 0.1, w); b.rotation.y = mix(b.rotation.y, 0.12, w); b.rotation.z *= 1 - w;
    o[OS.ventre].rotation.x = mix(o[OS.ventre].rotation.x, 0.3, w);
    o[OS.poitrine].rotation.x = mix(o[OS.poitrine].rotation.x, 0.24, w);
    this.reperes();
    this.jambeW(OS.cuisseG, 1, dm.xh + 0.05, CH, 0.32, 0, 0.12, w);
    this.jambeW(OS.cuisseD, -1, -dm.xh - 0.02, 0.13, -0.36, 1.15, -0.08, w);
    this.brasIK(3, C.x, C.y, C.z, -0.7, -0.5, -0.5, w);
    this.brasIK(0, dm.xh + 0.08, 0.47, 0.34, 0.6, -0.4, -1, w);
  }

  /* ---------------------------------------------------------------- à vélo (velos.js)
     p.velo : la pose demandée (indices VL), dans le repère du vélo penché, en mètres ; le personnage est posé à son origine,
     sans rotation. Assis sur la selle, le buste penché juste ce qu'il faut pour que les mains tiennent le cintre (un angle
     calculé : un vélo de ville se conduit droit, un vélo de course couché sur le cintre), les pieds sur les pédales qui
     tournent (la cheville suit la pédale ; le pied pointe vers le bas en bas du coup de pédale, le talon descend en haut),
     les mains aux poignées, le regard devant. En danseuse : debout sur les pédales, le bassin au-dessus du pédalier, qui
     balance du côté de la pédale qui descend. Pied à terre : glissé devant la selle, le pied gauche au sol, le droit sur la
     pédale haute, le corps droit quand le vélo penche. Une jambe ne tire jamais : le bassin descend s'il le faut. */
  poseVelo(p, br) {
    const o = this.o, V = p.velo, k = 1 / this.m.echelle, dm = this.m.dim;
    if (!this.colonne) { this.colonne = o[OS.ventre].position.y + o[OS.poitrine].position.y + o[OS.brasG].position.y; this.epaule = Math.abs(o[OS.brasG].position.x); }
    const dan = V[VL.danseuse], pied = V[VL.pied], th = V[VL.mani];
    // le bassin : sur la selle ; en danseuse, au-dessus des pédales ; pied à terre, glissé devant
    const bal = Math.sin(th) * 0.05 * dan;
    let bx = V[VL.selle] * k + bal, by = V[VL.selle + 1] * k + 0.105 + 0.12 * dan - 0.06 * pied, bz = V[VL.selle + 2] * k - 0.035 + 0.1 * dan + 0.2 * pied;
    // les chevilles : la plante du pied sur la pédale (ou le pied gauche au sol), le pied penché selon le tour de pédale
    for (let j = 0; j < 2; j++) {
      const P = j ? VL.pedD : VL.pedG, phi = j ? th : th + PI, tg = 0.21 + 0.14 * Math.cos(phi), c = Math.cos(tg), s = Math.sin(tg);
      let ax = V[P] * k, ay = V[P + 1] * k + 0.016 * k + CH * c + 0.11 * s, az = V[P + 2] * k + CH * s - 0.11 * c, a = tg;
      if (j === 0 && pied > 0) { ax += (V[VL.sol] * k - ax) * pied; ay += (V[VL.sol + 1] * k + CH - ay) * pied; az += (V[VL.sol + 2] * k - az) * pied; a = tg * (1 - pied); }
      PIEDS[6 * j + X] = ax; PIEDS[6 * j + Y] = ay; PIEDS[6 * j + Z] = az; PIEDS[6 * j + TG] = a;
      // la jambe atteint sa cheville : le bassin pas plus haut (raccordé sans cassure sur 3 cm)
      const sg = JAMBES[j][1], dx = ax - bx - sg * dm.xh, dz = az - bz, Lm = (L1 + L2) * 0.985;
      const haut = ay + Math.sqrt(Math.max(0.0025, Lm * Lm - dx * dx - dz * dz)) - DIM.yHanche, h = Math.max(0.03 - Math.abs(by - haut), 0) / 0.03;
      by = Math.min(by, haut) - h * h * 0.0075;
    }
    // le buste : penché pour que les épaules soient à une longueur de bras (coudes un peu pliés) des poignées
    const gy = (V[VL.mainG + 1] + V[VL.mainD + 1]) * 0.5 * k - by, gz = (V[VL.mainG + 2] + V[VL.mainD + 2]) * 0.5 * k - bz;
    // (en danseuse, les bras plus tendus et le buste plus couché, au-dessus du cintre)
    const ecart = Math.max(0, Math.abs(V[VL.mainG] - V[VL.mainD]) * 0.5 * k - this.epaule), Ls = this.colonne, dT = (0.86 + 0.06 * dan) * (DIM.bras + DIM.avantBras);
    const R = Math.hypot(gy, gz), cA = borne((R * R + Ls * Ls - (dT * dT - ecart * ecart)) / (2 * Ls * R), -1, 1);
    const al = borne(Math.max(Math.atan2(gz, gy) - Math.acos(cA), 0.6 * dan), 0.04, 1.3);
    // le corps reste droit quand le vélo penche, pied à terre ; il balance un peu en pédalant
    const roul = V[VL.roulis] * pied * 0.85 + 0.025 * Math.sin(th) * (1 - pied) + 0.06 * bal * 8;
    const b = o[OS.bassin];
    b.position.set(bx, by, bz);
    b.rotation.set(0.3 * al, -0.04 * Math.sin(th) * (1 - pied), roul);
    o[OS.ventre].rotation.set(0.3 * al + br * 0.3, this.ry * 0.1, -roul * 0.4);
    o[OS.poitrine].rotation.set(0.4 * al - br, this.ry * 0.2 + 0.03 * Math.sin(th) * (1 - pied), -roul * 0.3);
    o[OS.tete].rotation.set(-Math.min(0.95 * al, 0.95) + 0.04 + this.rp * 0.85, this.ry * 0.66, -roul * 0.3); // (le regard devant soi, la nuque relevée)
    this.reperes();
    for (let j = 0; j < 2; j++) this.jambe(JAMBES[j][0], JAMBES[j][1], PIEDS[6 * j + X], PIEDS[6 * j + Y], PIEDS[6 * j + Z], PIEDS[6 * j + TG], JAMBES[j][1] * (0.05 + 0.12 * pied * (1 - j)), 0.6);
    // les mains aux poignées : la paume (velos.js : celle de la main gauche ; la droite en miroir), les doigts autour
    const fx = V[VL.doigts], fy = V[VL.doigts + 1], fz = V[VL.doigts + 2], nx = V[VL.paume], ny = V[VL.paume + 1], nz = V[VL.paume + 2];
    for (let c = 0; c <= 3; c += 3) {
      const sg = c === 0 ? 1 : -1, P = c === 0 ? VL.mainG : VL.mainD;
      ex.set(-nx, -sg * ny, -sg * nz);
      ey.set(-sg * fx, -fy, -fz).addScaledVector(ex, -(ex.x * -sg * fx + ex.y * -fy + ex.z * -fz)).normalize();
      ez.crossVectors(ex, ey);
      qTel.setFromRotationMatrix(mR.makeBasis(ex, ey, ez));
      v1.set(V[P] * k, V[P + 1] * k, V[P + 2] * k).addScaledVector(ex, sg * 0.02).addScaledVector(ey, 0.085);
      this.brasIK(c, v1.x, v1.y, v1.z, sg * 0.8, -0.6, -0.3, 1);
      this.mainVers(c, qTel, 1);
    }
  }

  /* ---------------------------------------------------------------- fumer (p.fume : debout, ou assis)
     La cigarette (perso.js : cigarette, CIG) entre l'index et le majeur de la main droite ; le bras le long du corps ou le
     coude plié (la cigarette à hauteur de poitrine), selon les gens ; l'autre main dans la poche, ou le bras croisé sous le
     coude. Toutes les 8 à 15 s, une bouffée : la main monte, le filtre aux lèvres (la paume vers le visage), on tire, la
     main redescend, on souffle la fumée la tête un peu relevée. Le transfert du poids, les coups d'œil : ceux du repos.
     Rend, pour la fumée (particules.js) : p.bout, le bout allumé en coordonnées du monde, et p.bouffee, vrai à l'image où
     la fumée sort de la bouche (p.bouche : où). */
  poseFume(p, t, dt, conduite) {
    const o = this.o, m = this.m, dm = m.dim, fume = !!p.fume && !conduite && !(p.assis && p.clavier) && !p.velo && !p.jeu;
    this.wFume += ((fume ? 1 : 0) - this.wFume) * kl(dt, 4);
    const cig = cigarette(m), w = this.wFume;
    cig.visible = w > 0.3;
    p.bouffee = false;
    if (w <= 0.01) return;
    // la bouffée : u de 0 à 3,6 s ; la prochaine dans 8 à 15 s
    if (this.uFume < 0 && (this.tFume -= dt) <= 0 && fume) { this.uFume = 0; this.tFume = 8 + Math.random() * 7; }
    const u0 = this.uFume;
    if (this.uFume >= 0) { this.uFume += dt; if (this.uFume > 3.6) this.uFume = -1; }
    const u = this.uFume, levee = u >= 0 ? entre(0, 0.85, u) * (1 - entre(1.7, 2.5, u)) : 0, souffle = u >= 0 ? entre(2.1, 2.5, u) * (1 - entre(3.0, 3.6, u)) : 0;
    p.bouffee = fume && u0 >= 0 && u0 < 2.2 && u >= 2.2;
    this.reperes();
    const yb = o[OS.bassin].position.y, assis = p.assis;
    // la bouche (repère du personnage) : de la tête (son échelle comprise), par la poitrine
    const te = o[OS.tete], k = te.scale.x;
    vBouche.set(0, 0.126 * k, 0.116 * k).applyQuaternion(te.quaternion).add(te.position).applyMatrix4(mP);
    // au repos : la main droite le long du corps, ou le coude plié (assis : sur la cuisse, la cigarette levée)
    const coude = assis || this.fRepos;
    let x = assis ? -0.1 : -0.16, y = assis ? yb + 0.13 : yb + 0.2, z = assis ? 0.3 : 0.17;
    const wr = coude ? w * (1 - levee) : 0;
    if (wr > 0.01) this.brasIK(3, x, y, z, -0.8, -0.6, -0.2, wr);
    if (coude) o[OS.mainD].rotation.set(-0.2, -0.3, -0.5);
    // la bouffée : la paume vers le visage, les doigts vers le haut et vers l'autre épaule, le filtre aux lèvres
    if (levee > 0.01) {
      ex.set(0.3, 0, -1).normalize(); ey.set(-0.45, -0.85, -0.1); ey.addScaledVector(ex, -ey.dot(ex)).normalize(); ez.crossVectors(ex, ey);
      qMain.setFromRotationMatrix(mR.makeBasis(ex, ey, ez));
      v1.copy(vBouche).addScaledVector(ex, -CIG.filtre[0]).addScaledVector(ey, -CIG.filtre[1]).addScaledVector(ez, -CIG.filtre[2]);
      const lx = v1.x, ly = v1.y, lz = v1.z, wl = w * levee;
      this.brasIK(3, lx, ly, lz, -0.8, -0.7, -0.4, wl);
      this.mainVers(3, qMain, wl);
    }
    // l'autre main : dans la poche, ou le bras croisé sous le coude (le coude plié, debout)
    if (!assis) {
      if (this.fAutre && coude) this.brasIK(0, -0.07, yb + 0.16, 0.15, 0.8, -0.6, 0.3, w * (1 - 0.6 * levee));
      else this.brasIK(0, dm.xh + 0.1, yb - 0.05, 0.05, 0.8, -0.2, -0.3, w);
    }
    // souffler : la tête se relève un peu
    te.rotation.x -= 0.16 * souffle * w; te.rotation.y += 0.1 * souffle * w;
    // le bout allumé, en coordonnées du monde
    if (!p.bout) p.bout = new THREE.Vector3();
    cig.updateWorldMatrix(true, false);
    p.bout.set(CIG.bout[0] - CIG.pos[0], CIG.bout[1] - CIG.pos[1], CIG.bout[2] - CIG.pos[2]).applyMatrix4(cig.matrixWorld);
    if (p.bouffee) { if (!p.bouche) p.bouche = new THREE.Vector3(); p.bouche.copy(vBouche).applyMatrix4(m.maillage.matrixWorld); }
  }

  // Oriente la main (c : 0 gauche, 3 droite) selon q, exprimé dans le repère du personnage
  mainVers(c, q, w) {
    const o = this.o;
    q1.copy(qP).multiply(o[BRAS[c]].quaternion).multiply(o[BRAS[c + 1]].quaternion).invert().multiply(q);
    o[BRAS[c + 2]].quaternion.slerp(q1, w);
  }
}
