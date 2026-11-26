// Le chien du domaine (Teddy, 26/11/2026 : « on va travailler sur le chien. Le chien ne pourra jamais être écrasé, il se
// lève et court dès qu'on essaie de rouler sur lui, il se balade aléatoirement sur le parvis. Une commande permet de le
// caresser. Il dort à l'intérieur la nuit. Tu améliores grandement le design du chien aussi. »).
//
// Un beauceron (berger de Beauce), noir et feu : environ 65 cm au garrot, tête longue, oreilles naturelles mi-tombantes,
// queue longue portée basse qui finit en crochet (en J) ; les marques feu (« rouge écureuil ») aux pattes (les « bas
// rouges », jusqu'au tiers du membre, plus haut à l'intérieur), au-dessus des yeux, au museau et aux joues, sous la gorge,
// au poitrail (deux taches), sous la queue ; double ergot aux pattes arrière ; truffe noire, yeux bruns.
//
// Le modèle : un seul maillage animé (un SkinnedMesh de 28 os, comme les personnages : la même matière et la même texture,
// donc pas de programme de plus ; le poil est la zone « barbe » de l'atlas, un grain court et serré, couché le long du
// corps et des pattes), construit en code au premier passage près du domaine (5 ms) : volumes tournés le long d'un axe
// (corps, cou, tête, mâchoire, oreilles, queue, chaque segment de patte), environ 6 000 triangles ; couleurs par sommet (le
// noir et le feu fondus l'un dans l'autre) ; peau souple aux jointures du dos, du cou, de la tête et de la queue.
//
// L'animation est procédurale, sans allocation par image : des postures (debout, assis, couché en sphinx, couché sur le
// flanc pour dormir, sur le dos pour qu'on le caresse, l'étirement), mélangées os par os ; aux allures (pas, trot, galop),
// les pieds sont posés au sol et n'y glissent pas (chaque pied reste où il s'est posé, puis va se poser plus loin, à la
// cadence de l'allure ; cinématique inverse de chaque patte), le dos ondule au galop ; la tête regarde, la queue remue
// selon l'humeur, les oreilles bougent, la mâchoire s'ouvre quand il halète, la langue lèche.
//
// Ce qu'il fait : il se balade dans la cour au hasard (son propre tirage au sort), flaire, s'assoit, va boire, va voir les
// ouvriers, suit un peu le joueur à pied, se couche sur sa couverture, sous le chêne ou contre la maison ; le soir (vers
// 20 h) il rentre à la maison par la porte, le matin (après 7 h) il en ressort et s'étire. Un véhicule qui roule vers lui
// (conduit, mené par un geste, la conduite assistée, la remorque, le transpalette de Marc) : il se lève d'un bond et part au
// galop du côté libre, bien hors de son chemin ; garde-fou, il n'est jamais dans l'emprise d'un véhicule (repoussé). Il
// n'arrête personne : ni la conduite assistée, ni les gestes. On le caresse (main.js : « Caresser le chien » ; gestes.js).
// Dessiné et animé à moins de 70 m de la caméra seulement ; plus loin, rien n'est calculé (sauf un véhicule qui roule tout
// près de lui).
import * as THREE from 'three';
import { compacter } from './modeles.js';
import { Z } from './atlas.js';
import { sol } from './relief.js';
import { hasard, hache, angle, versAngle, borne, lisse, entre, mix, amortir } from './outils.js';

const PI = Math.PI, TAU = 2 * PI;
// le poil : la zone de l'atlas des personnages aux poils courts (un grain serré : les mèches des cheveux faisaient des rayures)
const FOURRURE = Z.barbe;
const kl = (dt, r) => amortir(dt, r);

/* ---------------------------------------------------------------- couleurs */
const NOIR = new THREE.Color('#221a15'), FEU = new THREE.Color('#a0501f'), TMP = new THREE.Color();
const C_TRUFFE = new THREE.Color('#0e0c0b'), C_COUSSINET = new THREE.Color('#1f1a17'), C_GRIFFE = new THREE.Color('#38302a');
const C_OEIL = new THREE.Color('#2a1509'), C_REFLET = new THREE.Color('#e8eef2'), C_BOUCHE = new THREE.Color('#4c1c22');
const C_LANGUE = new THREE.Color('#c35a6a'), C_DENT = new THREE.Color('#ece6d6'), C_LEVRE = new THREE.Color('#0d0b0a');

/* ---------------------------------------------------------------- squelette
   Repère du chien : y vers le haut, il regarde vers +z, sa gauche est +x ; l'origine au sol, sous le milieu du corps.
   Les pattes sont droites (verticales) dans la pose de construction ; la pose debout les plie. */
const BASSIN = 0, DOS = 1, POITRINE = 2, COU = 3, TETE = 4, MACH = 5, LANGUE = 6, OREG = 7, ORED = 8, Q1 = 9, Q2 = 10, Q3 = 11;
// les pattes : avant gauche, avant droite, arrière gauche, arrière droite ; quatre os chacune (épaule ou hanche, coude ou
// grasset, poignet ou jarret, pied)
const AV = { y: 0.47, z: 0.31, x: 0.092, L: [0.19, 0.26, 0.075] }, AR = { y: 0.52, z: -0.31, x: 0.092, L: [0.21, 0.26, 0.13] };
const JAMBES = [
  { s: 1, av: true, os: [12, 13, 14, 15], parent: POITRINE, D: AV },
  { s: -1, av: true, os: [16, 17, 18, 19], parent: POITRINE, D: AV },
  { s: 1, av: false, os: [20, 21, 22, 23], parent: BASSIN, D: AR },
  { s: -1, av: false, os: [24, 25, 26, 27], parent: BASSIN, D: AR },
];
const NOS = 28;
// la tête un peu plus forte que ses volumes (largeur, hauteur, longueur) : celle d'un chien de berger, pas d'un lévrier
const TETE_K = [1.1, 1.08, 1];
// position de chaque os dans la pose de construction (repère du chien), son parent
const POS = [], PAR = [];
const os = (i, p, x, y, z) => { POS[i] = [x, y, z]; PAR[i] = p; };
os(BASSIN, -1, 0, 0.56, -0.24); os(DOS, BASSIN, 0, 0.59, -0.02); os(POITRINE, DOS, 0, 0.6, 0.19); os(COU, POITRINE, 0, 0.6, 0.31);
os(TETE, COU, 0, 0.83, 0.47); os(MACH, TETE, 0, 0.8, 0.52); os(LANGUE, MACH, 0, 0.792, 0.56);
os(OREG, TETE, 0.054, 0.89, 0.478); os(ORED, TETE, -0.054, 0.89, 0.478);
os(Q1, BASSIN, 0, 0.585, -0.41); os(Q2, Q1, 0, 0.585, -0.55); os(Q3, Q2, 0, 0.585, -0.69);
for (const J of JAMBES) {
  const { x, y, z, L } = J.D, X = J.s * x;
  os(J.os[0], J.parent, X, y, z); os(J.os[1], J.os[0], X, y - L[0], z); os(J.os[2], J.os[1], X, y - L[0] - L[1], z); os(J.os[3], J.os[2], X, y - L[0] - L[1] - L[2], z);
}
// le coussinet, sous l'os du pied (repère du pied, posé à plat) ; les pieds au repos, debout (repère du chien)
const PIED_Y = -0.03, PIED_Z = 0.018;
const NEUTRE = [[0.095, 0.2], [-0.095, 0.2], [0.092, -0.4], [-0.092, -0.4]];

// le paturon au repos (de l'articulation au pied, vers l'avant, rad) : l'avant un peu incliné, l'arrière presque droit
const PATURON = [0.3, 0.3, 0.12, 0.12];

/* ---------------------------------------------------------------- construction : volumes tournés
   Une forme : des anneaux (superellipses) le long d'un axe, dans le plan perpendiculaire à l'axe ; R : la largeur (vers la
   référence, x par défaut), U = axe x R : la hauteur (b au-dessus, bb au-dessous ; ab rétrécit le bas : la carène du
   poitrail). Sommets partagés (indexés), normales lissées ; coordonnées de texture : u autour (en motifs entiers), v le
   long de l'axe (le poil couché dans le sens de la forme). Couleur : feu(x, y, z) de 0 (noir) à 1 (feu), ou fixe.
   Peau : os(x, y, z, t) -> [os1, poids1, os2]. */
class Forme {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.m = []; this.si = []; this.sw = []; this.ix = []; }
  get nv() { return this.p.length / 3; }
  sommet(x, y, z, u, v, col, zone, b1, w1, b2) {
    this.p.push(x, y, z); this.n.push(0, 0, 0); this.uv.push(u, v); this.c.push(col.r, col.g, col.b); this.m.push(zone);
    const w = Math.round(borne(w1, 0, 1) * 255);
    this.si.push(b1, w < 255 ? b2 : 0, 0, 0); this.sw.push(w, 255 - w, 0, 0);
  }
  // normales lissées des sommets à partir de s0, d'après les triangles à partir de i0 ; anneaux de n + 1 sommets : la
  // couture moyennée, un anneau réduit à un point (un bout fermé) aussi
  normales(s0, i0, n, m) {
    const P = this.p, N = this.n, I = this.ix;
    for (let t = i0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const k of [a, b, c]) { N[k] += nx; N[k + 1] += ny; N[k + 2] += nz; }
    }
    for (let i = 0; i < m; i++) {
      const r0 = (s0 + i * (n + 1)) * 3, r1 = r0 + n * 3, point = P[r0] === P[r0 + 3] && P[r0 + 1] === P[r0 + 4] && P[r0 + 2] === P[r0 + 5];
      if (point) {
        let sx = 0, sy = 0, sz = 0;
        for (let k = 0; k <= n; k++) { sx += N[r0 + k * 3]; sy += N[r0 + k * 3 + 1]; sz += N[r0 + k * 3 + 2]; }
        for (let k = 0; k <= n; k++) { N[r0 + k * 3] = sx; N[r0 + k * 3 + 1] = sy; N[r0 + k * 3 + 2] = sz; }
      } else for (let j = 0; j < 3; j++) { const s = N[r0 + j] + N[r1 + j]; N[r0 + j] = s; N[r1 + j] = s; }
    }
    for (let k = s0 * 3; k < N.length; k += 3) { const l = Math.hypot(N[k], N[k + 1], N[k + 2]) || 1; N[k] /= l; N[k + 1] /= l; N[k + 2] /= l; }
  }
}
const vD = new THREE.Vector3(), vR = new THREE.Vector3(), vU = new THREE.Vector3(), X0 = new THREE.Vector3(1, 0, 0);
// anneaux : [{ c: [x, y, z], a, b, bb, ab, p, o (décalage le long de U), d (axe imposé) }] ; o : { zone, feu, couleur,
// os, ref, tu, tv }
function loft(F, an, n, o) {
  const s0 = F.nv, i0 = F.ix.length, m = an.length, ref = o.ref || X0, zone = o.zone ?? FOURRURE;
  let per = 0;
  for (const A of an) per = Math.max(per, PI * (A.a + (A.b + (A.bb ?? A.b)) / 2));
  const tu = o.tu ?? 0.07, tv = o.tv ?? 0.12, tours = Math.max(1, Math.round(per / tu));
  let s = 0;
  for (let i = 0; i < m; i++) {
    const A = an[i], c = A.c;
    if (A.d) vD.set(A.d[0], A.d[1], A.d[2]).normalize();
    else { const a = an[Math.max(0, i - 1)].c, b = an[Math.min(m - 1, i + 1)].c; vD.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); }
    vR.copy(ref).addScaledVector(vD, -ref.dot(vD)).normalize(); vU.crossVectors(vD, vR);
    if (i) { const a = an[i - 1].c; s += Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]); }
    const ex = 2 / (A.p || 2.2), t = m > 1 ? i / (m - 1) : 0;
    for (let k = 0; k <= n; k++) {
      const th = -PI / 2 + TAU * k / n, cs = Math.cos(th), sn = Math.sin(th);
      const pc = Math.sign(cs) * Math.abs(cs) ** ex, ps = Math.sign(sn) * Math.abs(sn) ** ex;
      const ax = A.a * (ps < 0 && A.ab ? mix(1, A.ab, -ps) : 1), hy = ps >= 0 ? A.b : (A.bb ?? A.b);
      const lx = ax * pc, ly = hy * ps + (A.o || 0);
      const x = c[0] + vR.x * lx + vU.x * ly, y = c[1] + vR.y * lx + vU.y * ly, z = c[2] + vR.z * lx + vU.z * ly;
      const col = o.couleur ? (typeof o.couleur === 'function' ? o.couleur(x, y, z, ly) : o.couleur) : TMP.copy(NOIR).lerp(FEU, o.feu ? borne(o.feu(x, y, z, lx, ly, t), 0, 1) : 0);
      const b = typeof o.os === 'number' ? null : o.os(x, y, z, t);
      F.sommet(x, y, z, k / n * tours, s / tv, col, A.zone ?? zone, b ? b[0] : o.os, b ? b[1] : 1, b ? b[2] : 0);
    }
  }
  for (let i = 0; i < m - 1; i++) for (let k = 0; k < n; k++) {
    const a = s0 + i * (n + 1) + k, b = a + 1, c = a + n + 1, d = c + 1;
    F.ix.push(a, b, c, b, d, c);
  }
  F.normales(s0, i0, n, m);
}
// un anneau de plus entre deux (Catmull-Rom sur les centres et les tailles) : une forme plus lisse, sans plus de données
function affiner(an) {
  const r = [], cr = (a, b, c, d) => -0.0625 * a + 0.5625 * b + 0.5625 * c - 0.0625 * d;
  for (let i = 0; i < an.length; i++) {
    r.push(an[i]);
    if (i === an.length - 1) break;
    const A = an[Math.max(0, i - 1)], B = an[i], C = an[i + 1], D = an[Math.min(an.length - 1, i + 2)], m = { c: [0, 0, 0] };
    for (let k = 0; k < 3; k++) m.c[k] = cr(A.c[k], B.c[k], C.c[k], D.c[k]);
    for (const k of ['a', 'b', 'bb', 'ab', 'p']) if (B[k] !== undefined) m[k] = Math.max(0, cr(A[k] ?? B[k], B[k], C[k] ?? B[k], D[k] ?? C[k] ?? B[k]));
    // (près d'un bout fermé, la moitié de l'anneau voisin)
    if (!B.a || !C.a) { m.a = (B.a + C.a) / 2; m.b = (B.b + C.b) / 2; if (B.bb !== undefined) m.bb = ((B.bb ?? B.b) + (C.bb ?? C.b)) / 2; }
    if (B.d) m.d = B.d;
    r.push(m);
  }
  return r;
}
// ellipsoïde de centre c, de demi-axes (rx, ry, rz), son axe le long de z (ou de o.d) ; nr anneaux
function boule(F, c, rx, ry, rz, n, nr, o) {
  const an = [], d = o.d || [0, 0, 1], l = Math.hypot(d[0], d[1], d[2]);
  for (let j = 0; j <= nr; j++) {
    const f = PI * j / nr, k = -Math.cos(f) * rz / l, r = Math.sin(f);
    an.push({ c: [c[0] + d[0] * k, c[1] + d[1] * k, c[2] + d[2] * k], a: rx * r, b: ry * r, p: 2, d });
  }
  loft(F, an, n, { tu: 0.05, tv: 0.05, ...o });
}
// un cône (griffe, croc) de la base b (rayon r) à la pointe p
function cone(F, b, p, r, o) {
  const d = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
  loft(F, [{ c: b, a: 0, b: 0, d }, { c: b, a: r, b: r, p: 2, d }, { c: p, a: 0, b: 0, d }], 4, { tu: 0.05, tv: 0.05, zone: Z.uni, ...o });
}

/* ---------------------------------------------------------------- les marques feu (repère du chien, pose de construction) */
const doux = (r0, r1, d) => 1 - entre(r0, r1, d);
// au poitrail (deux taches), sous la gorge, sous la queue
function feuCorps(x, y, z) {
  const poitrail = Math.max(doux(0.026, 0.044, Math.hypot(x - 0.047, y - 0.455, z - 0.398)), doux(0.026, 0.044, Math.hypot(x + 0.047, y - 0.455, z - 0.398)));
  const gorge = doux(0.018, 0.036, Math.hypot(x, (y - 0.742) * 0.8, z - 0.5));
  const queue = doux(0.022, 0.04, Math.hypot(x, y - 0.522, z + 0.462));
  return Math.max(poitrail, gorge, queue);
}
// la tête : au-dessus des yeux, le museau (les côtés et le dessous, pas le chanfrein), les joues
function feuTete(x, y, z) {
  const sourcils = Math.max(doux(0.009, 0.017, Math.hypot(x - 0.04, y - 0.882, z - 0.556)), doux(0.009, 0.017, Math.hypot(x + 0.04, y - 0.882, z - 0.556)));
  const yc = z < 0.6 ? 0.836 : 0.822, museau = entre(0.575, 0.615, z) * (1 - entre(yc - 0.002, yc + 0.012, y));
  const joues = entre(0.5, 0.575, z) * (1 - entre(0.818, 0.834, y)) * entre(0.026, 0.046, Math.abs(x));
  return Math.max(sourcils, museau, joues);
}
// une patte : la hauteur au-dessus du sol, debout (h), et le côté intérieur (vers le corps) : les « bas rouges » montent
// jusqu'au tiers du membre, un peu plus haut à l'intérieur
const basRouge = (h, dedans, haut) => 1 - entre(haut - 0.02, haut + 0.025, h - 0.035 * dedans);

/* ---------------------------------------------------------------- le modèle */
function construire() {
  const F = new Forme();
  // peau du corps : le bassin, le dos, la poitrine, fondus le long du corps
  const osCorps = (x, y, z) => (z < -0.2 ? [BASSIN, 1, DOS] : z < -0.06 ? [BASSIN, 1 - lisse((z + 0.2) / 0.14), DOS] : z < 0.07 ? [DOS, 1, POITRINE] : z < 0.19 ? [DOS, 1 - lisse((z - 0.07) / 0.12), POITRINE] : [POITRINE, 1, DOS]);
  // le corps : de la pointe des fesses au poitrail. [z, dessus, dessous, demi-largeur, carène, forme]
  const CORPS = [[-0.475, 0.555, 0.52, 0, 1, 2], [-0.462, 0.578, 0.485, 0.05, 1, 2.1], [-0.435, 0.595, 0.458, 0.088, 1, 2.2], [-0.395, 0.608, 0.442, 0.112, 0.95, 2.3],
    [-0.335, 0.617, 0.436, 0.126, 0.92, 2.3], [-0.265, 0.621, 0.433, 0.126, 0.9, 2.3], [-0.185, 0.622, 0.428, 0.12, 0.88, 2.2], [-0.105, 0.624, 0.415, 0.122, 0.85, 2.2],
    [-0.025, 0.628, 0.385, 0.134, 0.8, 2.2], [0.055, 0.637, 0.352, 0.143, 0.74, 2.2], [0.125, 0.651, 0.332, 0.146, 0.7, 2.2], [0.195, 0.663, 0.326, 0.144, 0.68, 2.2],
    [0.255, 0.661, 0.33, 0.138, 0.68, 2.2], [0.305, 0.642, 0.35, 0.126, 0.72, 2.2], [0.35, 0.603, 0.385, 0.104, 0.8, 2.1], [0.383, 0.558, 0.425, 0.076, 0.9, 2.05],
    [0.405, 0.512, 0.465, 0.04, 1, 2], [0.413, 0.49, 0.49, 0, 1, 2]];
  loft(F, affiner(CORPS.map(([z, h, b, a, ab, p]) => ({ c: [0, (h + b) / 2, z], a, b: (h - b) / 2, ab, p, d: [0, 0, 1] }))), 16, { feu: feuCorps, os: osCorps, tu: 0.035, tv: 0.09 });

  // le cou : du poitrail et du garrot jusque sous le crâne (U : vers le haut et l'arrière ; b : la crête, bb : la gorge)
  const COUS = [[0.265, 0.545, 0.118, 0.145], [0.315, 0.605, 0.108, 0.13], [0.365, 0.672, 0.096, 0.116], [0.41, 0.74, 0.084, 0.098], [0.445, 0.795, 0.073, 0.082], [0.47, 0.84, 0.058, 0.064], [0.485, 0.862, 0, 0]];
  loft(F, affiner(COUS.map(([z, y, a, b]) => ({ c: [0, y, z], a, b, p: 2.2 }))), 16, {
    feu: feuCorps, tu: 0.035, tv: 0.09,
    os: (x, y, z, t) => (t < 0.12 ? [POITRINE, 1, COU] : t < 0.4 ? [POITRINE, 1 - lisse((t - 0.12) / 0.28), COU] : t < 0.72 ? [COU, 1, TETE] : [COU, 1 - lisse((t - 0.72) / 0.28) * 0.7, TETE]),
  });
  // la tête : du crâne à la truffe. [z, centre, demi-largeur, dessus, dessous, forme]
  const TETES = [[0.428, 0.848, 0, 0, 0, 2], [0.438, 0.85, 0.044, 0.04, 0.044, 2.1], [0.46, 0.853, 0.066, 0.059, 0.065, 2.2], [0.49, 0.853, 0.076, 0.063, 0.071, 2.2],
    [0.52, 0.85, 0.075, 0.06, 0.069, 2.2], [0.55, 0.845, 0.066, 0.051, 0.062, 2.2], [0.578, 0.837, 0.054, 0.04, 0.052, 2.2], [0.605, 0.828, 0.045, 0.032, 0.046, 2.2],
    [0.64, 0.823, 0.042, 0.03, 0.044, 2.3], [0.675, 0.822, 0.04, 0.029, 0.041, 2.3], [0.7, 0.822, 0.037, 0.026, 0.037, 2.3], [0.716, 0.823, 0.03, 0.021, 0.029, 2.2], [0.725, 0.824, 0, 0, 0, 2]];
  loft(F, TETES.map(([z, y, a, b, bb, p]) => ({ c: [0, y, z], a, b, bb, p, d: [0, 0, 1] })), 18, { feu: feuTete, os: TETE, tu: 0.03, tv: 0.06 });

  // la mâchoire (le dessus : l'intérieur de la bouche) ; l'intérieur de la bouche, sous le museau
  const MACHS = [[0.512, 0.8, 0, 0, 0], [0.52, 0.797, 0.048, 0.012, 0.023], [0.56, 0.792, 0.042, 0.011, 0.021], [0.61, 0.789, 0.035, 0.009, 0.018], [0.655, 0.789, 0.03, 0.008, 0.015], [0.69, 0.791, 0.022, 0.007, 0.012], [0.705, 0.793, 0, 0, 0]];
  loft(F, MACHS.map(([z, y, a, b, bb]) => ({ c: [0, y, z], a, b, bb, p: 2.2, d: [0, 0, 1] })), 14, { os: MACH, couleur: (x, y, z, ly) => (ly > 0.004 ? C_BOUCHE : TMP.copy(NOIR).lerp(FEU, 0.92)) });
  loft(F, [[0.53, 0], [0.56, 0.033], [0.64, 0.03], [0.69, 0.018], [0.705, 0]].map(([z, a]) => ({ c: [0, 0.794, z], a, b: 0.004, p: 2, d: [0, 0, 1] })), 10, { os: TETE, couleur: C_BOUCHE, zone: Z.uni });
  // les babines : de la lèvre du haut (la tête) à celle du bas (la mâchoire), de chaque côté ; elles s'étirent quand la
  // gueule s'ouvre (le coin de la bouche)
  for (const s of [1, -1]) {
    const s0 = F.nv, i0 = F.ix.length, N = 6;
    for (let i = 0; i <= N; i++) {
      const z = 0.53 + i / N * 0.11, w = mix(0.046, 0.035, i / N) * s;
      F.sommet(w, 0.795, z, 0.5, 0.5, C_LEVRE, Z.uni, TETE, 1, 0); F.sommet(w, 0.786, z, 0.5, 0.5, C_LEVRE, Z.uni, MACH, 1, 0);
    }
    for (let i = 0; i < N; i++) { const a = s0 + i * 2; if (s > 0) F.ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else F.ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    for (let i = 0; i <= N * 2 + 1; i++) F.n.splice((s0 + i) * 3, 3, s, 0, 0);
    void i0;
  }
  // la langue (sur l'os de la langue), les crocs
  boule(F, [0, 0.795, 0.615], 0.024, 0.006, 0.055, 8, 4, { os: LANGUE, couleur: C_LANGUE, zone: Z.uni });
  for (const s of [1, -1]) {
    cone(F, [s * 0.02, 0.801, 0.688], [s * 0.019, 0.789, 0.69], 0.0035, { os: TETE, couleur: C_DENT });
    cone(F, [s * 0.018, 0.794, 0.676], [s * 0.018, 0.805, 0.679], 0.003, { os: MACH, couleur: C_DENT });
  }
  // la truffe et ses narines ; les yeux (bruns, un reflet)
  boule(F, [0, 0.827, 0.713], 0.027, 0.02, 0.016, 12, 6, { os: TETE, couleur: C_TRUFFE, zone: Z.cuir });
  for (const s of [1, -1]) {
    boule(F, [s * 0.01, 0.822, 0.727], 0.0055, 0.0038, 0.003, 5, 2, { os: TETE, couleur: C_LEVRE, zone: Z.uni });
    boule(F, [s * 0.0475, 0.852, 0.566], 0.012, 0.0105, 0.012, 9, 5, { os: TETE, couleur: C_OEIL, zone: Z.uni, d: [s * 0.45, 0, 0.9] });
    boule(F, [s * 0.0538, 0.857, 0.5745], 0.0024, 0.0024, 0.002, 4, 2, { os: TETE, couleur: C_REFLET, zone: Z.uni });
  }
  // les oreilles, naturelles, mi-tombantes : elles montent un peu en dehors, la pointe se replie vers l'avant
  for (const [s, b] of [[1, OREG], [-1, ORED]]) {
    const [ox, oy, oz] = POS[b];
    const OR = [[0, -0.01, 0, 0.046, 0.008], [0.012, 0.022, 0, 0.043, 0.008], [0.022, 0.048, 0.004, 0.037, 0.007], [0.03, 0.065, 0.014, 0.03, 0.006], [0.036, 0.064, 0.03, 0.021, 0.005], [0.04, 0.053, 0.043, 0.011, 0.004], [0.042, 0.044, 0.05, 0, 0]];
    loft(F, OR.map(([x, y, z, a, e]) => ({ c: [ox + s * x, oy + y, oz + z], a, b: e, p: 2 })), 10, { os: (x, y) => (y < oy + 0.012 ? [b, lisse((y - oy + 0.008) / 0.02), TETE] : [b, 1, TETE]), tu: 0.05, tv: 0.05 });
  }
  // la queue : longue, garnie, attachée bas ; feu dessous, à la base
  const QUEUES = [[-0.4, 0.036], [-0.44, 0.042], [-0.5, 0.046], [-0.57, 0.045], [-0.64, 0.042], [-0.71, 0.037], [-0.77, 0.03], [-0.81, 0.022], [-0.835, 0.012], [-0.848, 0]];
  loft(F, QUEUES.map(([z, r]) => ({ c: [0, 0.585, z], a: r, b: r * 0.92, bb: r * 1.25, p: 2, d: [0, 0, -1] })), 12, { tu: 0.035, tv: 0.08,
    feu: (x, y, z) => (y < 0.58 ? 1 - entre(-0.5, -0.43, -z) : 0) * 0.85,
    os: (x, y, z) => (z > -0.51 ? [Q1, 1, Q2] : z < -0.59 ? (z > -0.65 ? [Q2, 1, Q3] : z < -0.73 ? [Q3, 1, Q2] : [Q2, 1 - lisse((-0.65 - z) / 0.08), Q3]) : [Q1, 1 - lisse((-0.51 - z) / 0.08), Q2]),
  });
  // les pattes, droites (de haut en bas) ; [y relatif à l'os, demi-largeur, devant, derrière]
  for (const J of JAMBES) {
    const { s, av } = J, [b1, b2, b3, b4] = J.os, X = POS[b1][0], par = J.parent;
    const seg = (b, rings, haut, n = 10) => {
      const [bx, by, bz] = POS[b];
      loft(F, rings.map(([y, a, f, r, oz = 0]) => ({ c: [bx, by + y, bz + oz], a, b: f, bb: r, p: 2.2, d: [0, -1, 0] })), n, {
        feu: (x, y) => basRouge(haut(y - by), borne(-(x - X) * s / 0.03, 0, 1), av ? 0.155 : 0.19), tu: 0.03, tv: 0.07,
        os: b === b1 ? (x, y) => (y > by + 0.03 ? [b, 0.5 + 0.5 * lisse((by + 0.07 - y) / 0.04), par] : [b, 1, par]) : b,
      });
    };
    if (av) {
      // l'épaule et le bras ; le coude ; l'avant-bras ; le poignet ; le paturon
      seg(b1, [[0.06, 0.022, 0.03, 0.034], [0.03, 0.044, 0.056, 0.062], [-0.03, 0.05, 0.062, 0.066], [-0.1, 0.046, 0.052, 0.06], [-0.17, 0.04, 0.04, 0.05], [-0.205, 0, 0, 0]], () => 0.5, 12);
      boule(F, [X, POS[b2][1] + 0.008, POS[b2][2] - 0.024], 0.033, 0.038, 0.032, 8, 4, { os: b2 });
      seg(b2, [[0.025, 0.04, 0.042, 0.048], [-0.03, 0.039, 0.04, 0.045], [-0.1, 0.034, 0.035, 0.036], [-0.18, 0.029, 0.03, 0.029], [-0.245, 0.026, 0.027, 0.025], [-0.268, 0, 0, 0]], y => 0.36 + y);
      boule(F, [X, POS[b3][1], POS[b3][2] + 0.002], 0.028, 0.029, 0.028, 8, 4, { os: b3, couleur: FEU });
      seg(b3, [[0.012, 0.026, 0.026, 0.026], [-0.04, 0.025, 0.026, 0.024], [-0.07, 0.026, 0.028, 0.025], [-0.088, 0, 0, 0]], y => 0.1 + y);
      // l'ergot de devant, à l'intérieur du paturon
      cone(F, [X - s * 0.018, POS[b3][1] - 0.035, POS[b3][2] - 0.006], [X - s * 0.024, POS[b3][1] - 0.05, POS[b3][2] - 0.002], 0.005, { os: b3, couleur: TMP.copy(FEU).multiplyScalar(0.85).clone(), zone: FOURRURE });
    } else {
      // la cuisse (la culotte, garnie derrière) ; le grasset ; la jambe ; la pointe du jarret ; le canon
      seg(b1, [[0.07, 0.035, 0.045, 0.05], [0.035, 0.064, 0.075, 0.1], [-0.03, 0.07, 0.08, 0.122], [-0.1, 0.064, 0.07, 0.115], [-0.17, 0.052, 0.058, 0.08], [-0.21, 0.042, 0.048, 0.054], [-0.235, 0, 0, 0]], () => 0.45, 12);
      boule(F, [X, POS[b2][1] + 0.004, POS[b2][2] + 0.012], 0.04, 0.042, 0.036, 8, 4, { os: b2 });
      seg(b2, [[0.015, 0.046, 0.05, 0.062], [-0.05, 0.042, 0.045, 0.068], [-0.12, 0.035, 0.034, 0.056], [-0.19, 0.028, 0.027, 0.036], [-0.25, 0.024, 0.023, 0.025], [-0.272, 0, 0, 0]], y => 0.331 + y * 0.66);
      boule(F, [X, POS[b3][1] + 0.008, POS[b3][2] - 0.026], 0.019, 0.026, 0.018, 8, 4, { os: b3, feu: () => 1 });
      seg(b3, [[0.012, 0.025, 0.024, 0.026], [-0.06, 0.023, 0.023, 0.023], [-0.12, 0.024, 0.026, 0.023], [-0.142, 0, 0, 0]], y => 0.156 + y);
      // le double ergot, à l'intérieur du canon, bas : deux doigts l'un au-dessus de l'autre, et leurs griffes
      for (const [dy, dz] of [[-0.082, -0.004], [-0.103, 0.002]]) {
        const c = [X - s * 0.026, POS[b3][1] + dy, POS[b3][2] + dz];
        boule(F, c, 0.009, 0.013, 0.01, 5, 3, { os: b3, feu: () => 1, d: [0, 1, 0] });
        cone(F, [c[0] - s * 0.004, c[1] - 0.008, c[2] + 0.004], [c[0] - s * 0.008, c[1] - 0.016, c[2] + 0.01], 0.0032, { os: b3, couleur: C_GRIFFE });
      }
    }
    // le pied : le dessus (feu), les quatre doigts, les griffes ; le coussinet dessous
    const [px, py, pz] = POS[b4], k = av ? 1 : 0.92;
    const piedC = (x, y) => (y < py - 0.026 ? C_COUSSINET : TMP.copy(FEU).multiplyScalar(0.95));
    boule(F, [px, py - 0.011, pz + 0.014 * k], 0.034 * k, 0.023, 0.04 * k, 10, 4, { os: b4, couleur: piedC });
    for (const [dx, dz] of [[0.013, 0.051], [-0.013, 0.051], [0.031, 0.039], [-0.031, 0.039]]) {
      const c = [px + dx * k, py - 0.017, pz + dz * k];
      boule(F, c, 0.012 * k, 0.012, 0.014, 5, 3, { os: b4, couleur: piedC });
      cone(F, [c[0], c[1] + 0.002, c[2] + 0.009], [c[0], c[1] - 0.009, c[2] + 0.02], 0.0034, { os: b4, couleur: C_GRIFFE });
    }
  }
  // la tête, plus forte (plus large et plus haute, pas plus longue) : autour de son os, ce qu'il porte (crâne, mâchoire,
  // langue, oreilles) ; les os qu'elle porte aussi (construire n'est appelé qu'une fois)
  {
    const [tx, ty, tz] = POS[TETE], TT = new Set([TETE, MACH, LANGUE, OREG, ORED]), P = F.p, N = F.n;
    for (let i = 0; i < F.nv; i++) {
      if (!TT.has(F.si[i * 4])) continue;
      P[i * 3] = tx + (P[i * 3] - tx) * TETE_K[0]; P[i * 3 + 1] = ty + (P[i * 3 + 1] - ty) * TETE_K[1]; P[i * 3 + 2] = tz + (P[i * 3 + 2] - tz) * TETE_K[2];
      N[i * 3] /= TETE_K[0]; N[i * 3 + 1] /= TETE_K[1]; N[i * 3 + 2] /= TETE_K[2];
      const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; N[i * 3] /= l; N[i * 3 + 1] /= l; N[i * 3 + 2] /= l;
    }
    for (const b of [MACH, LANGUE, OREG, ORED]) { const p = POS[b]; p[0] = tx + (p[0] - tx) * TETE_K[0]; p[1] = ty + (p[1] - ty) * TETE_K[1]; p[2] = tz + (p[2] - tz) * TETE_K[2]; }
  }
  // la géométrie : indexée, compactée (coordonnées de texture sur 16 bits : uv / UVK, comme les personnages)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(F.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(F.n, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(F.c, 3));
  g.setAttribute('aMat', new THREE.Float32BufferAttribute(F.m, 1));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint8Array(F.si), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(new Uint8Array(F.sw), 4, true));
  g.setIndex(F.nv < 65536 ? new THREE.Uint16BufferAttribute(F.ix, 1) : new THREE.Uint32BufferAttribute(F.ix, 1));
  return { g, uv: F.uv };
}

/* ---------------------------------------------------------------- postures
   Les paramètres d'une posture, mélangés linéairement : le bassin (hauteur, recul, tangage, roulis), le tangage du dos,
   de la poitrine, du cou, de la tête ; la queue (trois os) ; les oreilles ; puis chaque patte (écart, quatre angles). */
const BY = 0, BZ = 1, BRX = 2, BRZ = 3, DRX = 4, PRX = 5, CRX = 6, TRX = 7, QA = 8, QB = 9, QC = 10, ORE = 11, PATTES = 12, NP = PATTES + 20;
function posture(o) {
  const P = new Float32Array(NP);
  P[BY] = o.by ?? 0.56; P[BZ] = o.bz ?? -0.24; P[BRX] = o.brx || 0; P[BRZ] = o.brz || 0; P[DRX] = o.drx || 0; P[PRX] = o.prx || 0; P[CRX] = o.crx || 0; P[TRX] = o.trx || 0;
  [P[QA], P[QB], P[QC]] = o.q || [-1.32, -0.12, 0.5]; P[ORE] = o.ore || 0;
  for (let j = 0; j < 4; j++) {
    const J = JAMBES[j], A = o[['avG', 'avD', 'arG', 'arD'][j]] || o[J.av ? 'av' : 'ar'];
    if (!A) continue;
    P[PATTES + j * 5] = A[0] * J.s; for (let k = 1; k < 5; k++) P[PATTES + j * 5 + k] = A[k];
  }
  return P;
}
const DEBOUT = 0, ASSIS = 1, SPHINX = 2, FLANC = 3, SURDOS = 4, ETIRE = 5, NPOST = 6;
const POSTURES = [
  posture({ crx: 0.24, trx: 0.06 }), // (les pattes : par cinématique inverse, au démarrage ; la queue pend, en crochet)
  posture({ by: 0.3, brx: -0.72, drx: 0.12, prx: 0.1, crx: -0.06, trx: 0.6, q: [-0.45, 0.65, 0.45], av: [0.02, 0.5, 0, -0.3, 0.3], ar: [0.14, -0.52, 2.72, -2.95, 1.5] }),
  posture({ by: 0.2, brx: -0.06, drx: 0.03, crx: -0.12, trx: 0.38, q: [-0.95, 0.75, 0.4], av: [0.04, -0.85, -0.67, 0, 1.57], ar: [0.36, -1.27, 2.95, -3.08, 1.5] }),
  posture({ by: 0.2, brz: 1.42, drx: 0.02, prx: 0.04, crx: 0.9, trx: -0.25, q: [-0.25, 0.25, 0.3], ore: 0.4, av: [0.1, -0.55, -0.35, 0.35, 0.8], avD: [0.2, -0.3, -0.5, 0.5, 0.7], ar: [0.12, -0.65, 1.0, -0.45, 0.7], arD: [0.22, -0.4, 0.8, -0.3, 0.6] }),
  posture({ by: 0.2, brz: 2.65, drx: 0.05, crx: 0.55, trx: 0.2, q: [-0.15, 0.2, 0.3], ore: 0.6, av: [0.15, -1.0, 1.9, 0.9, 0.5], ar: [0.5, -1.15, 1.85, -1.0, 0.5] }),
  posture({ by: 0.4, brx: 0.48, drx: 0.06, prx: 0.12, crx: -0.65, trx: 0.25, q: [-0.3, 0.1, 0.4], av: [0.04, -1.75, -0.45, 0, 1.57], ar: [0.05, -0.55, 0.6, -0.55, 0.5] }),
];
// les chemins d'une posture à l'autre (on s'assoit avant de se coucher, on roule sur le flanc avant de se mettre sur le dos)
const VIA = { [DEBOUT]: { [SPHINX]: [ASSIS], [FLANC]: [ASSIS, SPHINX], [SURDOS]: [ASSIS, SPHINX, FLANC] }, [ASSIS]: { [FLANC]: [SPHINX], [SURDOS]: [SPHINX, FLANC] },
  [SPHINX]: { [SURDOS]: [FLANC] }, [FLANC]: { [DEBOUT]: [SPHINX], [ASSIS]: [SPHINX], [ETIRE]: [SPHINX] }, [SURDOS]: { [DEBOUT]: [FLANC, SPHINX], [ASSIS]: [FLANC, SPHINX], [SPHINX]: [FLANC], [ETIRE]: [FLANC, SPHINX] } };

/* ---------------------------------------------------------------- allures : décalage de chaque pied dans le cycle (avant
   gauche, avant droit, arrière gauche, arrière droit), part du cycle au sol, levée des pieds */
const PAS = { off: [0.25, 0.75, 0, 0.5], beta: 0.64, lev: 0.05 };
const TROT = { off: [0, 0.5, 0.5, 0], beta: 0.42, lev: 0.08 };
const GALOP = { off: [0.48, 0.38, 0, 0.1], beta: 0.3, lev: 0.12 };
const SMAX = 0.42; // le plus long chemin d'un pied au sol (m) : au-delà, la cadence monte
// points de contact (os, x, y, z dans son repère) : le plus bas touche le sol, couché ou assis
const CONTACTS = [];
for (const J of JAMBES) { CONTACTS.push([J.os[3], 0, PIED_Y, PIED_Z], [J.os[2], 0, 0, 0], [J.os[1], 0, 0.01, J.av ? -0.03 : 0.012]); }
CONTACTS.push([POITRINE, 0, -0.24, 0.1], [POITRINE, 0, -0.18, 0.2], [DOS, 0, -0.2, 0.05], [BASSIN, 0, -0.1, 0.05], [BASSIN, 0, -0.06, -0.21], [BASSIN, 0, -0.02, -0.17],
  [DOS, 0.125, -0.05, 0.05], [DOS, -0.125, -0.05, 0.05], [POITRINE, 0.125, -0.05, 0], [POITRINE, -0.125, -0.05, 0], [BASSIN, 0.15, -0.06, -0.08], [BASSIN, -0.15, -0.06, -0.08],
  [DOS, 0, 0.04, 0], [POITRINE, 0, 0.06, 0], [BASSIN, 0, 0.05, 0], [TETE, 0, -0.05, 0.1], [TETE, 0.06, 0, 0.05], [TETE, -0.06, 0, 0.05], [TETE, 0, 0.06, 0.04], [Q2, 0, -0.03, 0], [Q3, 0, -0.025, -0.1]);

/* ---------------------------------------------------------------- la cour (monde.js : lieux)
   Où il va : la cour du domaine, à l'ouest du chai (il n'entre ni dans le chai ni dans son bureau), entre le muret du
   portail et l'aire de remplissage ; il ne sort pas du domaine. La porte de la maison (façade au sud, en z = -59) : il y
   entre le soir, en ressort le matin. Ses couchages, hors des passages des véhicules (la cour, la grande porte du chai, le
   chemin du hangar, la marche arrière qui ressort du chai, là où Marc manœuvre le transpalette) : sa couverture contre le
   bureau du chai, le rond d'herbe du chêne (côté est), contre la façade de la maison, à côté de la porte. Sa gamelle. Où il
   monte la garde : au portail (il regarde la route). */
const COUR = { x0: -113, x1: -76.3, z0: -71, z1: -34.5 };
const PORTE = { x: -100, z: -59.4, dehors: -57.7 };
const COUCHAGES = [{ x: -77.25, z: -63.4, h: -PI / 2, p: 0.6 }, { x: -95.75, z: -46.6, h: PI, p: 0.22 }, { x: -102.7, z: -58.2, h: PI / 2, p: 0.18 }];
const GAMELLE = { x: -77.95, z: -62.75 };
const GUET = { x: -95.2, z: -35.5, h: 0 };
// l'aire de remplissage : ni but ni couchage
const dansAire = (x, z) => x > -91.5 && x < -80.5 && z < -61;
// vitesses (m/s) : au pas, au trot, au galop
const V_PAS = 1.15, V_TROT = 2.8, V_GALOP = 7.6;
// les états où on peut le caresser
const CARESSABLE = new Set(['couche', 'assis', 'debout', 'flaire', 'boit', 'guet', 'visite', 'suit', 'salue', 'apres', 'va', 'etire']);

// temporaires partagés
const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(), INV = new THREE.Matrix4(), SONDE = new THREE.Vector3();
const ANG = new Float32Array(20), FK = new Float32Array(NP);

export class Chien {
  // c : { scene, camera, hud, son, col, parvis, modele() : le maillage d'un personnage (sa matière et celle de son ombre),
  // mobiles(f) : chaque véhicule qui peut rouler, f(k, x, z, cap, emprises) ; gens(f) : ceux qu'on ne traverse pas,
  // f(x, z, r) }
  constructor(c) {
    this.c = c; this.rnd = hasard(97);
    this.m = null; this.g = new THREE.Group(); this.g.visible = false; this.g.name = 'chien';
    // l'état : position (au sol, sous le milieu du corps), cap, vitesse
    this.x = -77.25; this.z = -63.4; this.h = -PI / 2; this.v = 0; this.om = 0;
    this.W = new Float32Array(NPOST); this.W[SPHINX] = 1; this.post = SPHINX; this.file = []; this.vitePost = 3;
    this.ph = 0; this.wIK = 0;
    // chaque pied : où il est (x, y, z), d'où il est parti (ax, az), où il se posera (lx, lz), en l'air ou non ; son paturon
    // (p3, au décollage a3) et son pied (p4)
    this.pieds = JAMBES.map(() => ({ x: 0, z: 0, y: 0, ax: 0, az: 0, lx: 0, lz: 0, vol: false, saute: false, p3: 0, a3: 0, p4: 0 }));
    // la tête (lacet, tangage ; coups d'œil), la queue, les oreilles, la gueule
    this.ly = 0; this.lp = 0; this.tCoup = 2; this.cy = 0; this.cp = 0;
    this.queueA = 0.1; this.queueF = 4; this.queuePh = 0; this.queueH = 0; this.oreilles = 0; this.halete = 0; this.gueule = 0; this.langue = 0; this.leche = 0; this.flaire = 0;
    this.teteMonde = new THREE.Vector3();
    this.dehors = true; this.penche = 0;
    this.force = null; // (essais, captures : une posture imposée)
    // ce qu'il fait (etat), depuis quand, jusqu'à quand ; où il va (cx, cz), à quelle allure, et ensuite (suite, hFin)
    this.etat = 'couche'; this.tEtat = 0; this.duree = 40; this.cible = false; this.cx = 0; this.cz = 0; this.allure = 0; this.suite = null; this.hFin = null; this.hVoulu = null;
    this.tBloque = 0; this.sansMurs = false; this.dort = false; this.tDort = 8; this.spot = COUCHAGES[0];
    this.voulu = true; this.minPrec = NaN; this.vuJoueur = 99; this.tSalut = 0; this.tAboie = 0; this.envieSuivre = 0; this.arretJ = 0;
    this.humeur = 0; this.peur = 0; this.essouffle = 0; this.bond = 0; this.tSon = 0; this.qui = null; this.tPas = 0;
    // l'heure (minutes du jour) ; un point libre trouvé (px, pz) ; une sonde (sx, sz, sOk)
    this.m24 = 0; this.px = 0; this.pz = 0; this.sx = 0; this.sz = 0; this.sOk = true; this.sonderMobile = null;
    // les véhicules (mobiles) : leur dernière position et leur vitesse (estimée d'une image à l'autre)
    this.mx = new Float64Array(16); this.mz = new Float64Array(16); this.mv = new Float64Array(16); this.mvu = new Uint8Array(16); this.dtM = 0;
    this.menace = false; this.mT = 1e9; this.mk = -1; this.calme = 0;
    this.ml = { x: 0, z: 0, h: 0, lx: 0, lz: 0, X0: 0, X1: 0, Z0: 0, Z1: 0, v: 0 };
    this.voirMobile = (k, x, z, h, E) => this.evaluer(k, x, z, h, E);
    this.pousserMobile = (k, x, z, h, E) => this.horsDe(k, x, z, h, E);
    this.pousserGens = (x, z, r) => this.horsDeGens(x, z, r);
    this.etq = c.hud.etiquette('', 'bulle'); this.etqJ = c.hud.etiquette('', 'bulle');
    // le pas du joueur (suivre à côté de lui) ; le geste de la caresse
    this.ejx = 0; this.ejz = 0; this.jvx = 0; this.jvz = 0; this.dJ = 99; this.qJ = null;
    this.caresse = { T: 0, dos: false };
  }

  /* ------------------------------------------------------------ le modèle, au premier passage près du domaine */
  construireMaillage() {
    const mod = this.c.modele();
    const { g, uv } = construire();
    // coordonnées de texture sur 16 bits, comme les personnages : uv / répétition de la texture de l'atlas
    const UVK = mod.material.map ? mod.material.map.repeat.x : 64, q = new Int16Array(uv.length), k = 32767 / UVK;
    for (let i = 0; i < uv.length; i++) { const v = uv[i] * k; q[i] = v >= 32767 ? 32767 : v <= -32767 ? -32767 : Math.round(v); }
    g.setAttribute('uv', new THREE.BufferAttribute(q, 2, true));
    compacter(g);
    const osL = POS.map((p, i) => { const b = new THREE.Bone(), P = PAR[i] < 0 ? [0, 0, 0] : POS[PAR[i]]; b.position.set(p[0] - P[0], p[1] - P[1], p[2] - P[2]); return b; });
    for (let i = 1; i < NOS; i++) osL[PAR[i]].add(osL[i]);
    for (const i of [BASSIN, DOS, POITRINE, COU, TETE]) osL[i].rotation.order = 'YXZ';
    const maillage = new THREE.SkinnedMesh(g, mod.material);
    maillage.add(osL[0]);
    maillage.bind(new THREE.Skeleton(osL));
    maillage.castShadow = true; maillage.receiveShadow = true; maillage.customDepthMaterial = mod.customDepthMaterial;
    maillage.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.45, 0), 1.25);
    maillage.name = 'chien';
    this.g.add(maillage);
    // caché, il ne fait plus recalculer les matrices de ses os (comme les personnages)
    const gr = this.g;
    Object.defineProperty(gr, 'matrixWorldAutoUpdate', { get: () => gr.visible && maillage.visible, set() {}, configurable: true });
    this.c.scene.add(gr);
    this.m = { maillage, os: osL, nTri: g.index.count / 3 };
    this.os = osL;
    // la pose debout : les pattes par cinématique inverse, les pieds à leur place de repos
    const D = POSTURES[DEBOUT];
    gr.position.set(0, 0, 0); gr.rotation.set(0, 0, 0);
    this.poserFK(D);
    gr.updateMatrixWorld(true);
    for (let j = 0; j < 4; j++) {
      vA.set(NEUTRE[j][0], 0, NEUTRE[j][1]);
      this.ikPatte(j, vA, PATURON[j], 0, 0, D, PATTES + j * 5);
    }
    this.pieds.forEach((p, j) => { p.x = NEUTRE[j][0]; p.z = NEUTRE[j][1]; });
  }

  /* ------------------------------------------------------------ pose : les os d'après les paramètres P */
  poserFK(P) {
    const o = this.os;
    o[BASSIN].position.set(0, P[BY], P[BZ]); o[BASSIN].rotation.set(P[BRX], 0, P[BRZ]);
    o[DOS].rotation.set(P[DRX], 0, 0); o[POITRINE].rotation.set(P[PRX], 0, 0);
    o[COU].rotation.set(P[CRX], 0, 0); o[TETE].rotation.set(P[TRX], 0, 0);
    o[Q1].rotation.set(P[QA], 0, 0); o[Q2].rotation.set(P[QB], 0, 0); o[Q3].rotation.set(P[QC], 0, 0);
    for (let j = 0; j < 4; j++) this.poserPatte(j, P, PATTES + j * 5);
  }
  poserPatte(j, A, k) {
    const b = JAMBES[j].os, o = this.os;
    o[b[0]].rotation.set(A[k + 1], 0, A[k]); o[b[1]].rotation.set(A[k + 2], 0, 0); o[b[2]].rotation.set(A[k + 3], 0, 0); o[b[3]].rotation.set(A[k + 4], 0, 0);
  }

  // Une patte par cinématique inverse : le coussinet en F (monde), le paturon incliné de p3 (de l'articulation au pied, vers
  // l'avant, par rapport à la verticale), le pied de p4 (pointe en bas) ; cap : le cap du chien. Écrit l'écart et les quatre
  // angles dans A à partir de k. Les matrices des os du corps doivent être à jour.
  ikPatte(j, F, p3, p4, cap, A, k) {
    const J = JAMBES[j], L = J.D.L, par = this.os[J.parent], haut = this.os[J.os[0]], fx = Math.sin(cap), fz = Math.cos(cap);
    // le pied (l'os), au-dessus du coussinet ; l'articulation du bas (poignet ou jarret), au bout du paturon
    const s3 = Math.sin(p3), c3 = Math.cos(p3);
    vB.set(F.x - fx * PIED_Z - fx * L[2] * s3, F.y - PIED_Y + L[2] * c3, F.z - fz * PIED_Z - fz * L[2] * s3);
    vB.applyMatrix4(INV.copy(par.matrixWorld).invert());
    const dx = vB.x - haut.position.x, dy = vB.y - haut.position.y, dz = vB.z - haut.position.z;
    const abd = Math.atan2(dx, Math.max(0.05, -dy)), dv = Math.hypot(dx, dy) * (dy < 0 ? 1 : -1);
    const d = borne(Math.hypot(dz, dv), Math.abs(L[0] - L[1]) + 1e-3, (L[0] + L[1]) * 0.999);
    const beta = Math.atan2(dz, dv), a1 = Math.acos(borne((L[0] * L[0] + d * d - L[1] * L[1]) / (2 * L[0] * d), -1, 1));
    const p1 = J.av ? beta - a1 : beta + a1, ez = L[0] * Math.sin(p1), ev = L[0] * Math.cos(p1);
    const p2 = Math.atan2(dz - ez, dv - ev);
    const e = par.matrixWorld.elements, tp = Math.atan2(-e[9], Math.hypot(e[8], e[10]));
    const p3l = p3 + tp;
    A[k] = abd; A[k + 1] = -p1; A[k + 2] = -(p2 - p1); A[k + 3] = -(p3l - p2); A[k + 4] = p4 + p3;
  }

  // les postures : le poids de chacune va vers celle visée (par les postures intermédiaires) ; vite : se lever d'un bond
  viser(p, vite = 3) {
    this.vitePost = vite;
    if (p === this.post && !this.file.length) return;
    const fin = this.file.length ? this.file[this.file.length - 1] : this.post;
    if (fin === p) return;
    const de = this.dominante(), via = vite > 6 ? null : VIA[de] && VIA[de][p];
    this.file.length = 0;
    if (via) for (const q of via) this.file.push(q);
    this.file.push(p);
  }
  dominante() { let b = 0; for (let i = 1; i < NPOST; i++) if (this.W[i] > this.W[b]) b = i; return b; }
  majPostures(dt) {
    if (this.file.length) {
      const p = this.file[0];
      if (this.W[p] > (this.file.length > 1 ? 0.85 : 0.999)) { this.post = p; this.file.shift(); }
    }
    const cible = this.file.length ? this.file[0] : this.post, k = kl(dt, this.vitePost);
    let s = 0;
    for (let i = 0; i < NPOST; i++) { this.W[i] += ((i === cible ? 1 : 0) - this.W[i]) * k; s += this.W[i]; }
    for (let i = 0; i < NPOST; i++) this.W[i] /= s;
    if (!this.file.length && this.W[cible] > 0.999) this.post = cible;
  }

  /* ------------------------------------------------------------ les pieds aux allures
     Chaque pied a sa phase dans le cycle (décalée selon l'allure) ; au sol, il reste où il s'est posé ; en l'air, il va de
     là où il a quitté le sol jusqu'à sa place de repos telle qu'elle sera au milieu du prochain appui (le chien avance et
     tourne pendant ce temps). Arrêté, un pied ne se lève que s'il est loin de sa place (on tourne sur place, on a été
     poussé). Écrit dans p : la position du pied (x, y, z), le paturon (p3) et le pied (p4). */
  majPieds(dt) {
    const v = this.v, va = Math.abs(v), wt = entre(1.5, 2.1, va), wg = entre(3.9, 4.9, va);
    const beta = mix(mix(PAS.beta, TROT.beta, wt), GALOP.beta, wg), lev = mix(mix(PAS.lev, TROT.lev, wt), GALOP.lev, wg);
    let f = va < 0.05 ? 1.7 : mix(mix(0.75 + 0.55 * va, 1.5 + 0.3 * va, wt), 2.2 + 0.18 * va, wg);
    f = Math.max(f, va * beta / SMAX, Math.abs(this.om) > 0.3 ? 1.8 : 0);
    this.ph = (this.ph + f * dt) % 1;
    this.wt = wt; this.wg = wg; this.f = f;
    const h = this.h, ch = Math.cos(h), sh = Math.sin(h), bouge = va > 0.06 || Math.abs(this.om) > 0.25;
    const vx = sh * v, vz = ch * v;
    for (let j = 0; j < 4; j++) {
      const p = this.pieds[j], J = JAMBES[j], nx = NEUTRE[j][0], nz = NEUTRE[j][1];
      const o = mix(mix(PAS.off[j], TROT.off[j], wt), GALOP.off[j], wg), q = (this.ph + o) % 1;
      // la place de repos du pied, maintenant (monde)
      const rx = this.x + nx * ch + nz * sh, rz = this.z - nx * sh + nz * ch;
      if (q >= beta) {
        const u = (q - beta) / (1 - beta);
        if (!p.vol && !p.saute) {
          if (bouge || Math.hypot(p.x - rx, p.z - rz) > 0.05) { p.vol = true; p.ax = p.x; p.az = p.z; p.a3 = p.p3; } else p.saute = true;
        }
        if (p.vol) {
          // là où il se posera : sa place au milieu du prochain appui
          const T = (1 - q) / f + beta / (2 * f), hh = h + this.om * T, c2 = Math.cos(hh), s2 = Math.sin(hh);
          p.lx = this.x + vx * T + nx * c2 + nz * s2; p.lz = this.z + vz * T - nx * s2 + nz * c2;
          const k = lisse(u * 1.08);
          p.x = mix(p.ax, p.lx, k); p.z = mix(p.az, p.lz, k);
          const sn = Math.sin(PI * u);
          p.y = lev * (J.av ? 1 : 0.85) * (sn + 0.25 * Math.sin(TAU * u)) * (bouge ? 1 : 0.6);
          // en l'air : le poignet se plie (le pied part en arrière), le jarret aussi ; la pointe tombe
          p.p3 = mix(p.a3, J.av ? -0.75 - 0.75 * wt : -0.35 - 0.3 * wt, Math.sin(PI * Math.min(1, u * 1.15)) ** 0.8);
          if (u > 0.6) p.p3 = mix(p.p3, PATURON[j] + 0.15, entre(0.6, 1, u));
          p.p4 = 0.55 * sn;
        }
      } else {
        if (p.vol) { p.x = p.lx; p.z = p.lz; p.vol = false; }
        p.saute = false; p.y = 0;
        // au sol : le paturon suit le pied (devant : il se tend vers l'avant ; en fin d'appui, le talon se lève)
        const e = (p.x - rx) * sh + (p.z - rz) * ch;
        p.p3 = PATURON[j] + borne(e * 1.3, -0.45, 0.35);
        p.p4 = borne(-(e + 0.1) * 3.5, 0, 0.6);
      }
      // poussé loin, ou d'un coup ailleurs : le pied reprend sa place
      if (Math.hypot(p.x - rx, p.z - rz) > 0.8) { p.x = rx; p.z = rz; p.vol = false; p.y = 0; }
    }
  }
  // les pieds à leur place de repos (on se relève, on apparaît)
  replacerPieds() {
    const ch = Math.cos(this.h), sh = Math.sin(this.h);
    for (let j = 0; j < 4; j++) { const p = this.pieds[j], nx = NEUTRE[j][0], nz = NEUTRE[j][1]; p.x = this.x + nx * ch + nz * sh; p.z = this.z - nx * sh + nz * ch; p.y = 0; p.vol = false; p.saute = false; p.p3 = PATURON[j]; p.p4 = 0; }
  }

  /* ------------------------------------------------------------ l'animation de l'image */
  animer(dt, t) {
    const o = this.os, W = this.W, g = this.g;
    this.majPostures(dt);
    FK.fill(0);
    for (let p = 0; p < NPOST; p++) { const w = W[p]; if (w < 1e-4) continue; const P = POSTURES[p]; for (let i = 0; i < NP; i++) FK[i] += P[i] * w; }
    const wik = W[DEBOUT], va = Math.abs(this.v);
    if (wik > 0.02 && this.wIK <= 0.02) this.replacerPieds();
    this.wIK = wik;
    if (wik > 0.02) this.majPieds(dt);
    // le corps aux allures : il monte et descend à chaque appui, ondule au galop, penche dans les virages
    const wt = this.wt || 0, wg = this.wg || 0, ph = this.ph, s1 = Math.sin(TAU * ph), c2 = Math.cos(2 * TAU * ph), mv = Math.min(1, va / 0.5) * wik;
    FK[BY] += mv * ((-0.008 * (1 - wt) - 0.016 * wt * (1 - wg)) * c2 + wg * (0.026 * Math.sin(TAU * ph + 0.6) - 0.025));
    FK[BRX] += mv * wg * 0.1 * Math.sin(TAU * ph + 0.3);
    FK[DRX] += mv * wg * -0.09 * Math.sin(TAU * ph + 1.0);
    FK[PRX] += mv * wg * 0.07 * Math.sin(TAU * ph + 1.6);
    FK[TRX] += mv * (0.035 * (1 - wt) * c2 - wg * 0.08 * Math.sin(TAU * ph + 1.6));
    FK[BRZ] += wik * borne(-this.om * va * 0.02, -0.14, 0.14) + mv * (1 - wt) * 0.02 * s1;
    // la queue : plus haute quand il court, selon l'humeur ; les oreilles en arrière au galop
    FK[QA] += this.queueH + mv * (0.25 * wt + 0.55 * wg);
    // la respiration ; le halètement
    FK[DRX] += 0.01 * Math.sin(t * 2.6) + this.halete * 0.012 * Math.sin(t * 19);
    // flairer : le nez au sol
    FK[CRX] += this.flaire * 0.95 * wik; FK[TRX] += this.flaire * 0.35 * wik;
    this.poserFK(FK);
    // le regard : le cou et la tête se tournent ; la tête se penche (curieux) ; il flaire (petits coups de nez)
    o[COU].rotation.y = this.ly * 0.4 + borne(this.om * 0.12, -0.25, 0.25) * wik;
    o[COU].rotation.x -= this.lp * 0.4;
    o[TETE].rotation.y = this.ly * 0.6; o[TETE].rotation.x -= this.lp * 0.6 - this.flaire * 0.04 * Math.sin(t * 15);
    o[TETE].rotation.z = this.penche || 0;
    o[DOS].rotation.y = borne(this.om * 0.08, -0.18, 0.18) * wik + mv * (1 - wt) * 0.04 * Math.sin(TAU * ph + 0.4);
    o[POITRINE].rotation.y = borne(this.om * 0.08, -0.18, 0.18) * wik;
    // la queue remue (le bout suit avec un temps de retard) ; au galop, elle flotte
    this.queuePh += dt * this.queueF;
    const qa = this.queueA + mv * wg * 0.12;
    o[Q1].rotation.y = qa * Math.sin(this.queuePh); o[Q2].rotation.y = qa * 0.9 * Math.sin(this.queuePh - 0.7); o[Q3].rotation.y = qa * 0.7 * Math.sin(this.queuePh - 1.4);
    // les oreilles : dressées (attentif), au repos, couchées en arrière (content, ou il court) ; elles ballottent
    const ore = this.oreilles - FK[ORE] - mv * (0.35 * wt + 0.6 * wg), bat = mv * 0.08 * Math.sin(2 * TAU * ph + 0.8);
    const ox = (ore >= 0 ? 0.18 * ore : 0.85 * ore) + bat, oz = 0.18 - (ore < 0 ? 0.25 * ore : 0.1 * ore);
    o[OREG].rotation.set(ox, 0, -oz); o[ORED].rotation.set(ox, 0, oz);
    // la gueule (il halète, il lèche) et la langue
    o[MACH].rotation.x = this.gueule;
    const L = o[LANGUE];
    L.position.z = POS[LANGUE][2] - POS[MACH][2] + 0.048 * this.langue + 0.05 * this.leche;
    L.position.y = POS[LANGUE][1] - POS[MACH][1] + 0.004 * this.langue;
    L.rotation.x = 0.38 * this.langue - 0.55 * this.leche;
    // le corps à sa place, les pattes
    g.position.set(this.x, sol(this.x, this.z), this.z); g.rotation.y = this.h;
    g.updateMatrixWorld(true);
    if (wik > 0.02) {
      for (let j = 0; j < 4; j++) {
        const p = this.pieds[j];
        vC.set(p.x, g.position.y + p.y, p.z);
        this.ikPatte(j, vC, p.p3, p.p4, this.h, ANG, j * 5);
        const k = PATTES + j * 5;
        for (let i = 0; i < 5; i++) ANG[j * 5 + i] = mix(FK[k + i], ANG[j * 5 + i], wik);
        this.poserPatte(j, ANG, j * 5);
      }
    }
    // couché, assis : le plus bas du corps (ou des pattes) touche le sol
    if (wik < 0.98) {
      if (wik > 0.02) g.updateMatrixWorld(true);
      let min = 1e9;
      for (let i = 0; i < CONTACTS.length; i++) { const C = CONTACTS[i]; vA.set(C[1], C[2], C[3]).applyMatrix4(o[C[0]].matrixWorld); if (vA.y < min) min = vA.y; }
      g.position.y += (g.position.y - min) * (1 - wik);
    }
    // se lever d'un bond (il fuit)
    if (this.bond > 0) g.position.y += 0.1 * Math.sin(PI * (1 - this.bond));
    o[TETE].getWorldPosition(this.teteMonde);
  }

  /* ------------------------------------------------------------ à chaque image (main.js : bourg)
     c : { t, minutes, ego (le joueur ou son véhicule), aPied } */
  maj(dt, c) {
    const cam = this.c.camera.position;
    this.heures(c.minutes);
    const dCam = Math.hypot(cam.x - this.x, cam.z - this.z), pres = this.dehors && dCam < 70;
    if (pres && !this.m) this.construireMaillage();
    // le matin, il sort de la maison
    if (!this.dehors && this.voulu) this.sortir();
    if (this.g.visible !== pres) { this.g.visible = pres; if (pres) this.replacerPieds(); }
    if (!this.dehors) { this.c.hud.placer(this.etq, 0, 0, 0, false); return; }
    // les véhicules : leur vitesse, la menace la plus pressante
    this.dtM = dt; this.mT = 1e9; this.mk = -1;
    this.c.mobiles(this.voirMobile);
    this.menace = this.mk >= 0;
    // loin de la caméra, rien n'est calculé (sauf un véhicule qui roule vers lui)
    if (!pres && !this.menace) return;
    this.comportement(dt, c);
    this.deplacer(dt);
    if (!pres || !this.m) { this.majPostures(dt); return; }
    this.expression(dt, c);
    if (this.force != null) this.viser(this.force, 6);
    this.animer(dt, c.t);
    if (this.etq.vu) this.c.hud.placer(this.etq, this.x, this.g.position.y + 1.05, this.z, true);
    if (this.etqJ.vu) this.c.hud.placer(this.etqJ, c.ego.x, 2.05, c.ego.z, true);
  }

  // l'heure : dehors de 7 h 05 (à 7 h 17, selon le jour) à 20 h (à 20 h 10) ; la nuit, à la maison. Un saut dans le temps
  // (on a dormi, une mission lancée au matin) : il est d'emblée où il doit être
  heures(minutes) {
    const m = ((minutes % 1440) + 1440) % 1440, jour = Math.floor(minutes / 1440);
    const sortie = 425 + Math.floor(hache(jour, 3) * 12), rentree = 1195 + Math.floor(hache(jour, 5) * 15);
    this.voulu = m >= sortie && m < rentree;
    this.m24 = m;
    const saut = !(Math.abs(minutes - this.minPrec) < 15);
    this.minPrec = minutes;
    if (!saut) return;
    if (!this.voulu) { this.etat = 'dedans'; this.dehors = false; this.cible = false; this.v = 0; this.g.visible = false; }
    else if (this.dehors && this.etat !== 'fuit') { this.x = COUCHAGES[0].x; this.z = COUCHAGES[0].z; this.h = COUCHAGES[0].h; this.coucher(COUCHAGES[0], true); }
  }

  /* ------------------------------------------------------------ les véhicules
     Pour chacun (main.js : mobiles) : sa vitesse le long de son cap, estimée d'une image à l'autre (conduit, mené par un
     geste ou la conduite assistée, tiré : tout ce qui bouge) ; le chien dans son repère. S'il roule, le chien est menacé
     s'il est dans son couloir (sa largeur et une marge, devant lui sur la distance qu'il parcourt en 1,6 s, plus 2,2 m), ou
     tout près ; la menace retenue est celle du premier contact. */
  evaluer(k, x, z, h, E) {
    const px = this.mx[k], pz = this.mz[k], c = Math.cos(h), s = Math.sin(h);
    this.mx[k] = x; this.mz[k] = z;
    let v = 0;
    if (this.mvu[k] && this.dtM > 0) { const dx = x - px, dz = z - pz; if (Math.abs(dx) + Math.abs(dz) < 3) v = (dx * s + dz * c) / this.dtM; }
    this.mvu[k] = 1;
    const vk = this.mv[k] = this.mv[k] + (v - this.mv[k]) * 0.5;
    const dx = this.x - x, dz = this.z - z;
    if (Math.abs(vk) < 0.3 || Math.abs(dx) > 45 || Math.abs(dz) > 45) return;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    let X0 = 1e9, X1 = -1e9, Z0 = 1e9, Z1 = -1e9;
    for (let i = 0; i < E.length; i++) { const r = E[i]; if (r[0] < X0) X0 = r[0]; if (r[1] > X1) X1 = r[1]; if (r[2] < Z0) Z0 = r[2]; if (r[3] > Z1) Z1 = r[3]; }
    const A = Math.abs(vk) * 1.6 + 2.2, M = 1.1;
    const couloir = lx > X0 - M && lx < X1 + M && (vk > 0 ? lz > Z0 - M && lz < Z1 + A : lz > Z0 - A && lz < Z1 + M);
    const pres = lx > X0 - 1.5 && lx < X1 + 1.5 && lz > Z0 - 1.5 && lz < Z1 + 1.5;
    if (!couloir && !pres) return;
    const t = (vk > 0 ? Math.max(0, lz - Z1) : Math.max(0, Z0 - lz)) / Math.abs(vk);
    if (t >= this.mT) return;
    this.mT = t; this.mk = k;
    const L = this.ml; L.x = x; L.z = z; L.h = h; L.lx = lx; L.lz = lz; L.X0 = X0; L.X1 = X1; L.Z0 = Z0; L.Z1 = Z1; L.v = vk;
  }
  // Garde-fou : jamais dans l'emprise d'un véhicule (de 25 cm de plus s'il roule) ; poussé de côté, hors de son chemin
  horsDe(k, x, z, h, E) {
    const dx0 = this.x - x, dz0 = this.z - z;
    if (Math.abs(dx0) > 8 || Math.abs(dz0) > 8) return;
    const c = Math.cos(h), s = Math.sin(h), roule = Math.abs(this.mv[k]) > 0.3, r = roule ? 0.5 : 0.24, fx = Math.sin(this.h), fz = Math.cos(this.h);
    for (let n = 0; n < 2; n++) {
      // les deux bouts du corps (le poitrail, l'arrière-train)
      const o = n ? -0.3 : 0.28, dx = this.x + fx * o - x, dz = this.z + fz * o - z;
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      for (let i = 0; i < E.length; i++) {
        const R = E[i];
        if (lx < R[0] - r || lx > R[1] + r || lz < R[2] - r || lz > R[3] + r) continue;
        // le plus court pour en sortir ; de côté s'il roule (jamais devant lui)
        const g = lx - (R[0] - r), d = R[1] + r - lx, ar = lz - (R[2] - r), av = R[3] + r - lz;
        let ex = 0, ez = 0;
        if (roule || Math.min(g, d) < Math.min(ar, av)) ex = g < d ? -g : d; else ez = ar < av ? -ar : av;
        this.x += ex * c + ez * s; this.z += -ex * s + ez * c;
        if (roule && this.etat !== 'fuit') { this.mk = k; this.menace = true; }
      }
    }
  }
  // ceux qu'on ne traverse pas (le joueur à pied, les ouvriers, Marc) : il s'écarte
  horsDeGens(x, z, r) {
    if (this.etat === 'caresse') return;
    const dx = this.x - x, dz = this.z - z, R = r + 0.3, d2 = dx * dx + dz * dz;
    if (d2 >= R * R) return;
    const d = Math.sqrt(d2) || 0.01; this.x = x + dx / d * R; this.z = z + dz / d * R;
  }

  /* ------------------------------------------------------------ se déplacer
     Vers (cx, cz) s'il a un but : il tourne (moins vite lancé), ralentit pour arriver, n'avance que debout ; contre les murs,
     les barriques, les véhicules garés (deux cercles, le poitrail et l'arrière-train) ; dans la cour ; hors des véhicules
     et des gens. */
  deplacer(dt) {
    let vc = 0, hc = this.hVoulu;
    if (this.cible) {
      const dx = this.cx - this.x, dz = this.cz - this.z, d = Math.hypot(dx, dz);
      if (d < (this.etat === 'fuit' ? 0.6 : 0.22)) { this.cible = false; this.hVoulu = this.hFin; hc = this.hFin; }
      else {
        hc = Math.atan2(dx, dz);
        const err = Math.abs(angle(hc - this.h));
        vc = Math.min(this.allure, Math.sqrt(2 * (this.etat === 'fuit' ? 9 : 3.2) * Math.max(0, d - 0.12)) + 0.25) * (err > 1.5 ? 0.12 : err > 0.8 ? 0.45 : 1);
      }
    }
    const fuit = this.etat === 'fuit', taux = (this.v < 0.5 ? 3.4 : this.v < 3 ? 3 : 2.4) + (fuit ? 3.5 : 0), h0 = this.h;
    if (hc != null) this.h = versAngle(this.h, hc, taux * dt);
    this.om = dt > 0 ? angle(this.h - h0) / dt : 0;
    // debout d'abord (se lever d'un bond quand il fuit)
    vc *= Math.min(1, this.W[DEBOUT] * (fuit ? 2.5 : 1.2)) ** 2;
    const acc = fuit ? 15 : this.allure > 3 ? 7 : 4, dec = fuit ? 12 : 7;
    this.v += borne(vc - this.v, -dec * dt, acc * dt);
    const x0 = this.x, z0 = this.z;
    this.x += Math.sin(this.h) * this.v * dt; this.z += Math.cos(this.h) * this.v * dt;
    if (!this.sansMurs) {
      // contre le décor : le poitrail, puis l'arrière-train
      const fx = Math.sin(this.h), fz = Math.cos(this.h), col = this.c.col;
      for (let n = 0; n < 2; n++) {
        const o = n ? -0.3 : 0.27;
        SONDE.set(this.x + fx * o, 0, this.z + fz * o);
        if (col.resoudre(SONDE, 0.21)) { this.x = SONDE.x - fx * o; this.z = SONDE.z - fz * o; }
      }
      this.x = borne(this.x, COUR.x0, COUR.x1); this.z = borne(this.z, COUR.z0, COUR.z1);
      this.c.gens(this.pousserGens);
    }
    this.c.mobiles(this.pousserMobile);
    // bloqué (contre un mur, la porteuse sur le chemin) : il renonce
    const avance = Math.hypot(this.x - x0, this.z - z0);
    this.tBloque = this.cible && vc > 0.4 && avance < vc * dt * 0.25 ? this.tBloque + dt : 0;
  }

  /* ------------------------------------------------------------ ce qu'il fait */
  aller(x, z, v, suite, hFin = null) {
    this.etat = 'va'; this.tEtat = 0; this.cible = true; this.cx = borne(x, COUR.x0, COUR.x1); this.cz = borne(z, COUR.z0, COUR.z1);
    this.allure = v; this.suite = suite; this.hFin = hFin; this.hVoulu = null; this.tBloque = 0; this.sansMurs = false;
    this.viser(DEBOUT, 4);
  }
  // un point libre (ni mur, ni véhicule garé, ni l'aire de remplissage), à une distance de r0 à r1 d'ici
  pointLibre(r0, r1) {
    for (let n = 0; n < 12; n++) {
      const a = this.rnd() * TAU, r = r0 + this.rnd() * (r1 - r0), x = borne(this.x + Math.sin(a) * r, COUR.x0 + 0.5, COUR.x1 - 0.5), z = borne(this.z + Math.cos(a) * r, COUR.z0 + 0.5, COUR.z1 - 0.5);
      if (this.libre(x, z, 0.5)) { this.px = x; this.pz = z; return true; }
    }
    return false;
  }
  libre(x, z, r) {
    if (dansAire(x, z)) return false;
    SONDE.set(x, 0, z);
    if (this.c.col.resoudre(SONDE, r)) return false;
    this.sx = x; this.sz = z; this.sOk = true;
    this.c.mobiles(this.sonderMobile || (this.sonderMobile = (k, X, Z, h, E) => {
      const c = Math.cos(h), s = Math.sin(h), dx = this.sx - X, dz = this.sz - Z, lx = dx * c - dz * s, lz = dx * s + dz * c;
      for (let i = 0; i < E.length; i++) { const R = E[i]; if (lx > R[0] - 1 && lx < R[1] + 1 && lz > R[2] - 1 && lz < R[3] + 1) this.sOk = false; }
    }));
    return this.sOk;
  }
  // se coucher à un couchage (direct : il y est déjà)
  coucher(sp, direct = false) {
    this.spot = sp;
    if (!direct && Math.hypot(sp.x - this.x, sp.z - this.z) > 0.3) { this.aller(sp.x, sp.z, V_PAS, 'couche', sp.h); return; }
    const soir = this.m24 >= 1110 || this.m24 < 450;
    this.etat = 'couche'; this.tEtat = 0; this.duree = soir ? 40 + this.rnd() * 60 : 18 + this.rnd() * 30; this.dort = false; this.tDort = 8 + this.rnd() * 12; this.cible = false; this.hVoulu = sp.h;
    if (direct) { this.h = sp.h; this.W.fill(0); this.W[SPHINX] = 1; this.post = SPHINX; this.file.length = 0; this.v = 0; }
    this.viser(SPHINX, 2.5);
  }
  faire(nom, duree) {
    this.etat = nom; this.tEtat = 0; this.duree = duree; this.cible = false; this.tPas = 0;
    this.viser(nom === 'assis' || nom === 'guet' || nom === 'visite' || nom === 'salue' ? ASSIS : nom === 'etire' ? ETIRE : DEBOUT, nom === 'etire' ? 2.2 : 3);
  }
  // ce qu'il fait ensuite, au hasard (son propre tirage)
  choisir(c) {
    if (!this.voulu) { this.rentrer(); return; }
    const r = this.rnd(), soir = this.m24 >= 1110 || this.m24 < 450, joueur = c.aPied && this.dJ < 9;
    if (joueur && this.envieSuivre > 0 && r < 0.4) { this.envieSuivre = 0; this.suivre(); return; }
    const k = this.rnd(), O = this.c.parvis.ouvriers;
    let nO = 0; for (let i = 0; i < O.length; i++) if (O[i].present) nO++;
    if (soir ? k < 0.6 : k < 0.15) {
      let u = this.rnd(), sp = COUCHAGES[0];
      for (const s of COUCHAGES) { if (u < s.p) { sp = s; break; } u -= s.p; }
      if (!this.libre(sp.x, sp.z, 0.3)) sp = COUCHAGES[0];
      this.coucher(sp);
    } else if (k < (soir ? 0.85 : 0.5)) {
      // une balade : un point au hasard, au pas (parfois au trot) ; là, il flaire, ou s'arrête et regarde
      if (this.pointLibre(4, 16)) this.aller(this.px, this.pz, this.rnd() < 0.3 ? V_TROT : V_PAS, this.rnd() < 0.7 ? 'flaire' : 'debout');
      else this.faire('debout', 3);
    } else if (k < 0.57) this.faire('assis', 5 + this.rnd() * 7);
    else if (k < 0.65) this.aller(GUET.x, GUET.z, this.rnd() < 0.5 ? V_TROT : V_PAS, 'guet', GUET.h);
    else if (k < 0.72) this.aller(GAMELLE.x + 0.02, GAMELLE.z + 0.62, V_PAS, 'boit', PI);
    else if (k < 0.88 && nO) {
      // voir un ouvrier : s'asseoir près de lui, le regarder travailler
      let i = Math.floor(this.rnd() * nO), o = null;
      for (let j = 0; j < O.length && !o; j++) if (O[j].present && i-- === 0) o = O[j];
      const p = o.p.pos;
      for (let n = 0; n < 8; n++) {
        const a = this.rnd() * TAU, x = p.x + Math.sin(a) * 1.5, z = p.z + Math.cos(a) * 1.5;
        if (this.libre(x, z, 0.4)) { this.qui = p; this.aller(x, z, V_PAS, 'visite', Math.atan2(p.x - x, p.z - z)); return; }
      }
      this.faire('flaire', 4);
    } else this.faire('flaire', 3 + this.rnd() * 4);
  }
  suivre() { this.etat = 'suit'; this.tEtat = 0; this.duree = 20 + this.rnd() * 25; this.cible = false; this.arretJ = 0; this.viser(DEBOUT, 4); }
  rentrer() { this.aller(PORTE.x, PORTE.dehors, V_PAS, 'porte', PI); }
  // il part au galop du côté où il est, hors du couloir du véhicule (de l'autre côté si un mur l'en empêche) ; couché, il
  // se relève d'un bond ; il aboie
  fuir() {
    const deja = this.etat === 'fuit';
    this.etat = 'fuit'; this.tEtat = 0; this.calme = 0; this.cible = true; this.allure = V_GALOP; this.suite = null; this.hFin = null; this.hVoulu = null; this.sansMurs = false;
    if (!deja && this.W[DEBOUT] < 0.6) this.bond = 1;
    this.viser(DEBOUT, 16);
    this.refuge();
    if (!deja && this.tAboie <= 0) { this.tAboie = 12; this.aboyer(); }
  }
  refuge() {
    const L = this.ml, c = Math.cos(L.h), s = Math.sin(L.h), cote = L.lx >= (L.X0 + L.X1) / 2 ? 1 : -1, M = 2.4;
    for (let n = 0; n < 2; n++) {
      const sg = n ? -cote : cote, d = Math.max(1.6, sg > 0 ? L.X1 + M - L.lx : L.lx - (L.X0 - M));
      // de côté, en s'écartant aussi un peu vers l'arrière du véhicule
      const ux = sg * c - 0.25 * Math.sign(L.v) * s, uz = -sg * s - 0.25 * Math.sign(L.v) * c, ul = Math.hypot(ux, uz);
      const x = borne(this.x + ux / ul * d, COUR.x0 + 0.4, COUR.x1 - 0.4), z = borne(this.z + uz / ul * d, COUR.z0 + 0.4, COUR.z1 - 0.4);
      // assez loin de côté (pas trop rogné par le bord de la cour), et le chemin libre
      const lx = (x - L.x) * c - (z - L.z) * s;
      if ((sg > 0 ? lx < L.X1 + 1.4 : lx > L.X0 - 1.4) && n === 0) continue;
      let ok = true;
      for (let f = 0.35; f <= 1.01 && ok; f += 0.325) { SONDE.set(mix(this.x, x, f), 0, mix(this.z, z, f)); if (this.c.col.resoudre(SONDE, 0.3)) ok = false; }
      if (!ok && n === 0) continue;
      this.cx = x; this.cz = z; return;
    }
    // rien de libre de côté : droit devant le véhicule, loin
    const sv = Math.sign(L.v) || 1;
    this.cx = borne(this.x + s * sv * 9 + c * cote * 2, COUR.x0 + 0.4, COUR.x1 - 0.4); this.cz = borne(this.z + c * sv * 9 - s * cote * 2, COUR.z0 + 0.4, COUR.z1 - 0.4);
  }
  aboyer() {
    this.c.son.chien('aboie', this.kSon());
    this.c.hud.bulle(this.etq, 'Wouf ! Wouf !', 1.4);
  }
  kSon() { const p = this.c.camera.position; return borne(1 - Math.hypot(p.x - this.x, p.z - this.z) / 35, 0, 1); }

  comportement(dt, c) {
    this.tEtat += dt; this.tAboie -= dt; this.tSalut -= dt;
    const e = c.ego;
    this.dJ = c.aPied ? Math.hypot(e.x - this.x, e.z - this.z) : 99;
    this.qJ = e;
    // le pas du joueur (sa direction, lissée) : le chien le suit à côté de lui, pas dans son dos (ni devant la caméra)
    if (dt > 0 && Math.abs(e.x - this.ejx) + Math.abs(e.z - this.ejz) < 2) { const k = kl(dt, 3); this.jvx += ((e.x - this.ejx) / dt - this.jvx) * k; this.jvz += ((e.z - this.ejz) / dt - this.jvz) * k; }
    this.ejx = e.x; this.ejz = e.z;
    // le joueur arrive (à pied, de loin) : il a envie de le suivre, ou de venir le saluer
    if (this.dJ < 7 && this.vuJoueur > 12) { this.envieSuivre = 1; if (this.tSalut <= 0 && (this.etat === 'assis' || this.etat === 'debout' || this.etat === 'flaire' || (this.etat === 'couche' && !this.dort)) && this.rnd() < 0.45) { this.tSalut = 50; this.etat = 'salue'; this.tEtat = 0; this.cible = false; } }
    this.vuJoueur = this.dJ < 9 ? 0 : this.vuJoueur + dt;
    // un véhicule roule vers lui : il fuit (une fois à l'abri, il regarde le véhicule)
    if (this.menace && this.etat !== 'porte' && this.etat !== 'dedans') {
      if (this.etat !== 'fuit') this.fuir();
      else {
        // toujours dans son couloir (le véhicule a tourné) : un autre refuge
        const L = this.ml, c2 = Math.cos(L.h), s2 = Math.sin(L.h), lx = (this.cx - L.x) * c2 - (this.cz - L.z) * s2;
        if (lx > L.X0 - 1.2 && lx < L.X1 + 1.2) this.refuge();
        this.cible = true;
      }
      this.calme = 0;
    }
    // le soir, il rentre (sauf s'il fuit, si on le caresse ; déjà en route)
    if (!this.voulu && this.etat !== 'fuit' && this.etat !== 'caresse' && this.etat !== 'porte' && this.etat !== 'dedans' && !(this.etat === 'va' && this.suite === 'porte')) { this.rentrer(); return; }
    switch (this.etat) {
      case 'va':
        if (!this.cible) {
          // arrivé : il se tourne (hFin), puis fait ce qu'il était venu faire
          if (this.hFin != null && Math.abs(angle(this.h - this.hFin)) > 0.2) break;
          const s = this.suite;
          if (s === 'couche') this.coucher(this.spot, true);
          else if (s === 'porte') { this.etat = 'porte'; this.tEtat = 0; this.sansMurs = true; this.cible = true; this.cx = PORTE.x; this.cz = PORTE.z; this.allure = 0.8; }
          else if (s === 'flaire') this.faire('flaire', 3 + this.rnd() * 5);
          else if (s === 'boit') this.faire('boit', 4 + this.rnd() * 3);
          else if (s === 'guet') this.faire('guet', 10 + this.rnd() * 14);
          else if (s === 'visite') this.faire('visite', 10 + this.rnd() * 12);
          else if (s === 'debout') this.faire('debout', 2 + this.rnd() * 4);
          else this.choisir(c);
        } else if (this.tBloque > 1.5) this.choisir(c);
        break;
      case 'couche':
        // il somnole, puis dort sur le flanc ; quelqu'un vient tout près : il se réveille, lève la tête, la queue bat
        if (!this.dort && this.tEtat > this.tDort && this.dJ > 5 && this.rnd() < dt * 0.3) { this.dort = true; this.viser(FLANC, 1.4); }
        if (this.dort && this.dJ < 3.5) { this.dort = false; this.viser(SPHINX, 3); }
        if (this.tEtat > this.duree) { if (this.post === FLANC || this.dort) this.faire('etire', 2.4); else this.choisir(c); }
        break;
      case 'etire':
        if (this.tEtat > 1.9) this.viser(DEBOUT, 3);
        if (this.tEtat > this.duree) this.choisir(c);
        break;
      case 'flaire':
        // le nez au sol, quelques pas lents d'un endroit à l'autre
        if (!this.cible && this.tEtat - this.tPas > 1.1 && this.rnd() < 0.5) { this.tPas = this.tEtat; if (this.pointLibre(0.4, 1.3)) { this.cible = true; this.cx = this.px; this.cz = this.pz; this.allure = 0.45; } }
        if (this.tEtat > this.duree) this.choisir(c);
        break;
      case 'boit': case 'assis': case 'debout': case 'guet': case 'visite': case 'apres':
        if (this.etat === 'visite') { let la = false; const O = this.c.parvis.ouvriers; for (let i = 0; i < O.length; i++) if (O[i].present && O[i].p.pos === this.qui) la = true; if (!la) this.duree = 0; }
        if (this.etat === 'apres' && this.tEtat > this.duree && this.rnd() < 0.5) { this.suivre(); break; }
        if (this.tEtat > this.duree) this.choisir(c);
        break;
      case 'salue': {
        // il vient devant le joueur, s'assoit, le regarde, la queue bat
        const vx = e.x - this.x, vz = e.z - this.z, d = Math.hypot(vx, vz);
        if (d > 1.25 && this.tEtat < 5) { this.cible = true; this.cx = e.x - vx / d * 1.0; this.cz = e.z - vz / d * 1.0; this.allure = d > 4 ? V_TROT : V_PAS; this.viser(DEBOUT, 4); }
        else { this.cible = false; this.hVoulu = Math.atan2(vx, vz); if (this.v < 0.2) this.viser(ASSIS, 3); }
        if (this.tEtat > 8 || this.dJ > 12) this.choisir(c);
        break;
      }
      case 'suit': {
        // il suit le joueur à pied, un peu en retrait ; s'il s'arrête, il s'assoit à côté ; pas hors de la cour
        if (!c.aPied || this.dJ > 25 || this.tEtat > this.duree) { this.faire('debout', 3); break; }
        const d = this.dJ, vx = e.x - this.x, vz = e.z - this.z, jv = Math.hypot(this.jvx, this.jvz);
        // sa place : à côté du joueur (du côté où il est déjà), un peu en arrière ; le joueur arrêté : près de lui
        let px = e.x - vx / (d || 1) * 1.5, pz = e.z - vz / (d || 1) * 1.5;
        if (jv > 0.5) {
          const fx = this.jvx / jv, fz = this.jvz / jv, cote = (this.x - e.x) * fz - (this.z - e.z) * fx >= 0 ? 1 : -1;
          px = e.x + fz * cote * 1.25 - fx * 0.5; pz = e.z - fx * cote * 1.25 - fz * 0.5;
        }
        const dp = Math.hypot(px - this.x, pz - this.z);
        if (dp > 0.6 && (jv > 0.5 || d > 2.2)) {
          this.cible = true; this.cx = px; this.cz = pz; this.allure = dp > 6 ? V_TROT * 1.2 : dp > 2.5 ? V_TROT : Math.max(V_PAS, jv * 1.05); this.arretJ = 0; this.viser(DEBOUT, 4);
        } else {
          this.cible = false; this.hVoulu = Math.atan2(vx, vz);
          if ((this.arretJ += dt) > 1.4) this.viser(ASSIS, 3);
        }
        break;
      }
      case 'fuit':
        if (!this.menace) this.calme += dt;
        if (this.calme > 0.7 && (!this.cible || this.v < 1)) { this.faire('debout', 2 + this.rnd() * 2); this.etat = 'alerte'; }
        break;
      case 'alerte':
        if (this.tEtat > this.duree) this.choisir(c);
        break;
      case 'porte':
        // il passe la porte de la maison (il y entre, ou en sort)
        {
          const entre = this.cz < PORTE.dehors - 0.5;
          if (!this.cible || (entre && this.z <= PORTE.z + 0.25)) {
            if (entre) { this.etat = 'dedans'; this.dehors = false; this.cible = false; this.v = 0; this.g.visible = false; this.sansMurs = false; }
            else { this.sansMurs = false; this.faire('etire', 2.4); }
          }
        }
        break;
      case 'dedans':
        break;
      case 'caresse':
        break;
    }
  }
  // le matin : il sort de la maison par la porte, s'étire
  sortir() {
    this.dehors = true; this.etat = 'porte'; this.tEtat = 0; this.sansMurs = true;
    this.x = PORTE.x; this.z = PORTE.z; this.h = 0; this.v = 0; this.cible = true; this.cx = PORTE.x; this.cz = PORTE.dehors + 0.6; this.allure = 0.9; this.hFin = 0;
    this.W.fill(0); this.W[DEBOUT] = 1; this.post = DEBOUT; this.file.length = 0; this.replacerPieds();
  }

  /* ------------------------------------------------------------ la tête, la queue, les oreilles, la gueule */
  expression(dt, c) {
    const e = this.qJ, et = this.etat, t = c.t, k = kl(dt, 4);
    // ce qu'il regarde : le joueur tout près, le véhicule qui l'a fait fuir, l'ouvrier qu'il est venu voir, la route
    let rx = 0, rz = 0, ry = 0.9, voit = false;
    if (et === 'alerte' || et === 'fuit') { const L = this.ml; rx = L.x; rz = L.z; ry = 1; voit = this.tEtat > 0.3; }
    else if (et === 'caresse' || et === 'salue' || et === 'apres' || et === 'suit' || (this.dJ < 4.5 && !this.dort && et !== 'flaire' && et !== 'boit')) { rx = e.x; rz = e.z; ry = 1.55; voit = true; }
    else if (et === 'visite' && this.qui) { rx = this.qui.x; rz = this.qui.z; ry = 1.1; voit = true; }
    else if (et === 'guet') { rx = this.x + Math.sin(this.h + 0.4 * Math.sin(t * 0.3)) * 10; rz = this.z + Math.cos(this.h + 0.4 * Math.sin(t * 0.3)) * 10; ry = 0.5; voit = true; }
    let ly = 0, lp = 0;
    if (voit) {
      const dx = rx - this.x, dz = rz - this.z, d = Math.hypot(dx, dz) || 1, a = angle(Math.atan2(dx, dz) - this.h);
      if (Math.abs(a) < 2.4) { ly = borne(a, -1.15, 1.15); lp = borne(Math.atan2(ry - this.teteMonde.y, d), -0.45, 0.5); }
    } else if (!this.dort && et !== 'flaire' && et !== 'boit') {
      // de temps en temps, un coup d'œil ailleurs
      if ((this.tCoup -= dt) <= 0) { this.tCoup = 1.5 + this.rnd() * 3.5; const r = this.rnd(); this.cy = r < 0.35 ? 0 : (this.rnd() * 2 - 1) * 0.9; this.cp = (this.rnd() - 0.5) * 0.3; }
      ly = this.cy; lp = this.cp;
    }
    if (this.dort) { ly = 0; lp = -0.1; }
    this.ly += (ly - this.ly) * k; this.lp += (lp - this.lp) * k;
    // la tête penchée (curieux) quand le joueur est tout près et immobile
    const curieux = this.dJ < 2.6 && (et === 'assis' || et === 'debout' || et === 'salue' || et === 'suit') ? Math.sign(Math.sin(t * 0.7)) * 0.28 : 0;
    this.penche += (curieux - this.penche) * kl(dt, 5);
    // l'humeur : content près du joueur (caressé : ravi) ; la peur après un véhicule
    const content = et === 'caresse' ? 1 : et === 'salue' || et === 'apres' ? 0.85 : et === 'suit' ? 0.6 : this.dJ < 4 ? 0.45 : 0;
    this.humeur += (content - this.humeur) * kl(dt, 2);
    this.peur = Math.max(0, this.peur - dt * 0.25); if (et === 'fuit') this.peur = 1;
    // la queue : elle bat d'autant plus qu'il est content (couché, elle balaie le sol) ; la peur la baisse ; elle se lève
    // quand il guette
    const qa = this.dort ? 0 : 0.06 + 0.62 * this.humeur * (1 - this.peur);
    this.queueA += (qa - this.queueA) * kl(dt, 3); this.queueF = 3 + 7 * this.humeur;
    this.queueH += ((et === 'guet' || et === 'alerte' ? 0.35 : 0) + 0.25 * this.humeur - 0.3 * this.peur - this.queueH) * kl(dt, 3);
    // les oreilles : dressées quand il guette ou regarde, couchées quand il est content ou a eu peur
    const ore = this.dort ? -0.2 : et === 'guet' || et === 'alerte' || (voit && this.humeur < 0.3) ? 0.8 : -0.75 * Math.max(this.humeur - 0.3, this.peur) / 0.7;
    this.oreilles += (ore - this.oreilles) * kl(dt, 5);
    // il halète après avoir couru (et quand on le caresse) ; la gueule s'ouvre, la langue sort
    this.essouffle = Math.max(this.essouffle, Math.abs(this.v) > 4 ? 1 : 0) - dt / 25;
    const hal = Math.max(0, Math.min(1, this.essouffle), et === 'caresse' ? 0.7 : 0, et === 'boit' ? 0.3 : 0);
    this.halete += (hal - this.halete) * kl(dt, 2);
    this.gueule = this.halete * (0.2 + 0.05 * Math.sin(t * 19)) + this.leche * 0.12;
    this.langue = this.halete;
    // flairer, boire : le nez au sol
    this.flaire += ((et === 'flaire' || et === 'boit' ? 1 : 0) - this.flaire) * kl(dt, 3);
    // un petit bond pour se lever quand il fuit
    if (this.bond > 0) this.bond = Math.max(0, this.bond - dt * 3);
    // des sons : il lape à la gamelle, halète tout près
    if ((this.tSon -= dt) <= 0) {
      this.tSon = 0.5;
      if (et === 'boit' && this.tEtat > 0.6) this.c.son.chien('lape', this.kSon());
      else if (this.halete > 0.5) this.c.son.chien('halete', this.kSon() * this.halete);
    }
  }

  /* ------------------------------------------------------------ le caresser (main.js : agir ; gestes.js : caresser) */
  // à pied, tout près, et calme
  caressable(p) {
    return !!this.m && this.g.visible && this.dehors && CARESSABLE.has(this.etat) && !this.menace && Math.abs(this.v) < 1.6 && Math.hypot(p.x - this.x, p.z - this.z) < 1.9;
  }
  // Le geste commence : il s'arrête et se tourne vers le joueur (couché, il reste couché et se mettra sur le dos). Rend la
  // place du joueur (out : x, z, h) : devant lui, ou à côté de son poitrail s'il est couché ; le cadre de la caméra (de côté,
  // du côté où elle est déjà)
  debutCaresse(px, pz, out, cadre) {
    const couche = this.post === SPHINX || this.post === FLANC || this.W[SPHINX] + this.W[FLANC] > 0.5;
    const C = this.caresse; C.dos = couche && this.rnd() < 0.7; C.T = 0;
    this.etat = 'caresse'; this.tEtat = 0; this.cible = false; this.v = 0; this.dort = false;
    let ax, az;
    if (couche) {
      // à côté du poitrail, du côté du joueur
      const lx = Math.cos(this.h), lz = -Math.sin(this.h), sg = (px - this.x) * lx + (pz - this.z) * lz >= 0 ? 1 : -1;
      ax = lx * sg; az = lz * sg; this.hVoulu = this.h;
    } else { const d = Math.hypot(px - this.x, pz - this.z) || 1; ax = (px - this.x) / d; az = (pz - this.z) / d; this.hVoulu = Math.atan2(ax, az); }
    // la place la plus proche qui soit libre
    const base = Math.atan2(ax, az), D = couche ? 0.72 : 0.86, fx = couche ? Math.sin(this.h) * 0.12 : 0, fz = couche ? Math.cos(this.h) * 0.12 : 0;
    for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, PI]) {
      const x = this.x + fx + Math.sin(base + da) * D, z = this.z + fz + Math.cos(base + da) * D;
      SONDE.set(x, 0, z);
      if (!this.c.col.resoudre(SONDE, 0.3) || da === PI) { out.x = x; out.z = z; break; }
    }
    const cx = couche ? this.x + fx : this.x + Math.sin(this.hVoulu) * 0.35, cz = couche ? this.z + fz : this.z + Math.cos(this.hVoulu) * 0.35;
    out.h = Math.atan2(cx - out.x, cz - out.z);
    this.viser(C.dos ? SURDOS : couche ? this.post : ASSIS, 3);
    // la caméra : de côté, à mi-chemin
    const mx = (out.x + this.x) / 2, mz = (out.z + this.z) / 2, cam = this.c.camera.position;
    let h = out.h + PI / 2 - 0.35;
    if ((cam.x - mx) * Math.sin(h) + (cam.z - mz) * Math.cos(h) > 0) h += PI + 0.7;
    cadre.x = mx; cadre.z = mz; cadre.h = h;
  }
  // pendant le geste (T : secondes depuis qu'on s'est agenouillé) : il remue la queue, lèche la main, gémit de plaisir ;
  // out : où va la main (monde) : le haut de la tête et la nuque, ou le ventre s'il est sur le dos
  pendantCaresse(T, out) {
    const C = this.caresse, o = this.os;
    if (C.T < 0.5 && T >= 0.5) this.c.son.chien('content', 1);
    if (C.T < 2.6 && T >= 2.6) this.c.son.chien('content', 1);
    C.T = T;
    this.leche = !C.dos && T > 1.6 && T < 3.0 ? 0.5 + 0.5 * Math.sin(T * 17) : 0;
    const va = 0.5 + 0.5 * Math.sin(T * TAU / 1.15);
    if (!o) { out.set(this.x, 0.6, this.z); return out; }
    if (C.dos) out.set(0, -0.12 + 0.02 * va, -0.03 + 0.14 * va).applyMatrix4(o[POITRINE].matrixWorld);
    else out.set(0, 0.1, 0.05 - 0.13 * va).applyMatrix4(o[TETE].matrixWorld);
    return out;
  }
  finCaresse() {
    if (this.etat !== 'caresse') return;
    this.leche = 0; this.faire('apres', 2.5); this.humeur = 1;
  }

  taches(t, vu) {
    if (!this.m || !this.g.visible) return;
    const couche = this.W[FLANC] + this.W[SURDOS];
    if (vu(this.m, this.x, this.z)) t.poser(this.x, this.z, 0.3 + 0.12 * couche, 0.58, this.h, sol(this.x, this.z));
  }
}

