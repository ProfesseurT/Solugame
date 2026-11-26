// Les vélos et les cyclistes (Teddy, 26/11/2026 : « on doit pouvoir voir des vélos dans la rue aussi, avec des cyclistes
// qui circulent »).
// - Les modèles (construire) : cadre en tubes, roues (pneu, jante, rayons, moyeu), fourche, potence, cintre et poignées,
//   selle et tige, pédalier (plateau dentelé, manivelles, pédales et leurs catadioptres), chaîne, garde-boue,
//   porte-bagages, panier d'osier, béquille, phare et feu arrière, sonnette. Cinq genres : vélo de ville (cadre ouvert à
//   double tube, cintre hollandais, pneus à flancs crème, carter de chaîne, panier), vélo de course (cintre de route,
//   jantes hautes, bidon), VTT (fourche suspendue, pneus à crampons, freins à disque), vélo à assistance électrique
//   (batterie sur le tube oblique, moteur au pédalier, écran au cintre, sacoche) et vélo d'enfant (petites roues,
//   franges aux poignées).
// - Un vélo qui roule est un seul maillage à peau (un appel de dessin, plus son ombre) : huit os, le cadre, la direction
//   (sur l'axe incliné de la douille), les deux roues, le pédalier, les deux pédales (elles restent à plat), la selle (à
//   la hauteur des jambes de son cycliste).
// - Garé, il est figé en géométries du décor de son quartier (aucun appel de dessin de plus) : veloGare, rangeVelos
//   (des arceaux, ou un râtelier pince-roues, garnis), pour monde.js.
// - Les cyclistes (Velos) : voir plus bas.
import * as THREE from 'three';
import { T, MAT, UNI, fusion, teinter, compacter, indexer } from './modeles.js';
import { Atelier, matieresPhares } from './engins.js';
import { Pieton } from './pieton.js';
import { perso, OS, DIM } from './perso.js';
import { VL } from './anim.js';
import { ROUTE, CHATEAU, sol } from './relief.js';
import { hasard, angle, borne, amortir } from './outils.js';
import { VELOS as REPLIQUES } from './textes.js';

const TAU = Math.PI * 2;

/* ---------------------------------------------------------------- petits outils de géométrie (points [x, y, z]) */
const plus = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const moins = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const vect = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const entre3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const miroir = p => [-p[0], p[1], p[2]];

// Un tube à n pans de a à b (rayon r au début, rb à la fin). bouts : fermer le début (1), la fin (2), les deux (3).
// allonge : il dépasse un peu de ses deux bouts (les coudes d'une suite de tubes ne laissent pas de jour).
// (REDUIT : un vélo garé, plus léger, a deux pans de moins à chaque tube)
let REDUIT = 0;
function tube(at, a, b, r, n, col, ty, bouts = 0, rb = r, allonge = 0) {
  n = Math.max(3, n - REDUIT);
  const d = unit(moins(b, a));
  if (allonge) { a = plus(a, d, -allonge); b = plus(b, d, allonge); }
  let u = vect(d, [0, 1, 0]);
  if (Math.hypot(u[0], u[1], u[2]) < 1e-3) u = vect(d, [1, 0, 0]);
  u = unit(u); const v = vect(d, u);
  const A = [], B2 = [];
  for (let k = 0; k < n; k++) {
    const t = k / n * TAU + Math.PI / n, c = Math.cos(t), s = Math.sin(t), o = [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s];
    A.push(plus(a, o, r)); B2.push(plus(b, o, rb));
  }
  for (let k = 0; k < n; k++) {
    const k2 = (k + 1) % n;
    at.quad(A[k], A[k2], B2[k2], B2[k], col, ty, plus(moins(A[k], a), moins(A[k2], a)));
  }
  if (bouts & 1) at.poly(A, col, ty, [-d[0], -d[1], -d[2]]);
  if (bouts & 2) at.poly(B2, col, ty, d);
}
// une suite de tubes (un cintre, un tube cintré) ; bouts : fermer le premier et le dernier bout
function suite(at, pts, r, n, col, ty, bouts = 0) {
  for (let i = 1; i < pts.length; i++) tube(at, pts[i - 1], pts[i], r, n, col, ty, (i === 1 ? bouts & 1 : 0) | (i === pts.length - 1 ? bouts & 2 : 0), r, i > 1 && i < pts.length - 1 ? r * 0.7 : 0);
}
// un pavé de centre c, de demi-tailles (hx, hy, hz), tourné autour de x de rx
function pave(at, c, hx, hy, hz, col, ty, rx = 0) {
  const co = Math.cos(rx), si = Math.sin(rx), P = [];
  for (const [sx, sy, sz] of [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]]) {
    const y = sy * hy, z = sz * hz;
    P.push([c[0] + sx * hx, c[1] + y * co - z * si, c[2] + y * si + z * co]);
  }
  const F = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  for (const f of F) { const m = [0, 0, 0]; for (const i of f) { m[0] += P[i][0] / 4 - c[0] / 4; m[1] += P[i][1] / 4 - c[1] / 4; m[2] += P[i][2] / 4 - c[2] / 4; } at.quad(P[f[0]], P[f[1]], P[f[2]], P[f[3]], col, ty, m); }
}
// un disque plat dans le plan x = cte, tourné vers sx (+1 ou -1) ; dents : une facette sur deux du bord plus courte
function disque(at, x, cy, cz, r, n, col, ty, sx, r0 = 0) {
  for (let k = 0; k < n; k++) {
    const a0 = k / n * TAU, a1 = (k + 1) / n * TAU;
    const p0 = [x, cy + Math.cos(a0) * r, cz + Math.sin(a0) * r], p1 = [x, cy + Math.cos(a1) * r, cz + Math.sin(a1) * r];
    if (r0) at.quad([x, cy + Math.cos(a0) * r0, cz + Math.sin(a0) * r0], p0, p1, [x, cy + Math.cos(a1) * r0, cz + Math.sin(a1) * r0], col, ty, [sx, 0, 0]);
    else at.tri([x, cy, cz], p0, p1, col, ty, [sx, 0, 0]);
  }
}
// Révolution d'un profil [r, x] autour de l'axe x (centré à l'origine) : n facettes. couleur(j, k) : [couleur, type] de la
// bande j (entre les points j et j + 1 du profil) à la facette k. rk(i, k) : retouche du rayon du point i du profil au
// méridien k (crampons : un méridien sur deux plus haut, sans jour entre les facettes). Le dehors de chaque facette : à
// l'opposé du centre du profil.
function revolution(at, profil, n, couleur, centre, rk) {
  for (let k = 0; k < n; k++) {
    const a0 = k / n * TAU, a1 = (k + 1) / n * TAU, am = (a0 + a1) / 2;
    const P = (q, a, i, m) => { const r = q[0] + (rk ? rk(i, m) : 0); return [q[1], Math.cos(a) * r, Math.sin(a) * r]; };
    for (let j = 0; j < profil.length - 1; j++) {
      const c = couleur(j, k);
      if (!c) continue;
      const p = profil[j], q = profil[j + 1], mr = (p[0] + q[0]) / 2 - centre[0], mx = (p[1] + q[1]) / 2 - centre[1];
      at.quad(P(p, a0, j, k), P(q, a0, j + 1, k), P(q, a1, j + 1, k + 1), P(p, a1, j, k + 1), c[0], c[1], [mx, Math.cos(am) * mr, Math.sin(am) * mr]);
    }
  }
}

/* ---------------------------------------------------------------- les genres
   Repère du vélo : origine au sol, à mi-chemin des deux roues ; +z vers l'avant, +x à sa gauche, y vers le haut.
   R : rayon de la roue pneu compris ; t : hauteur du pneu ; l : sa demi-largeur ; emp : empattement ; bb : boîtier de
   pédalier [y, z] ; mani : longueur des manivelles ; xp : écart du milieu des pédales ; aS, aD : angles du tube de selle et
   de la douille sur l'horizontale ; st : longueur du tube de selle ; douille : [y du bas, longueur] ; selle : hauteur de la
   selle au-dessus du haut du tube (avant réglage) ; cintre : 'hollandais', 'route' ou 'plat' ; potence : [montée, avance] ;
   largeur : demi-largeur du cintre. */
export const GENRES = {
  ville: { R: 0.35, t: 0.045, l: 0.022, emp: 1.12, bb: [0.28, -0.12], mani: 0.17, xp: 0.115, aS: 1.22, aD: 1.22, st: 0.5, douille: [0.6, 0.2],
    selle: 0.1, cintre: 'hollandais', potence: [0.13, 0.02], largeur: 0.29, rayons: 16, ouvert: true, gardeBoue: true, porteBagages: true, panier: true,
    bequille: true, carter: true, phare: true, flanc: '#e6dcc2', vitesse: 4.4 },
  course: { R: 0.34, t: 0.026, l: 0.013, emp: 0.99, bb: [0.27, -0.09], mani: 0.172, xp: 0.11, aS: 1.29, aD: 1.27, st: 0.53, douille: [0.7, 0.15],
    selle: 0.12, cintre: 'route', potence: [0.02, 0.11], largeur: 0.21, rayons: 20, jante: '#202226', janteH: 0.04, bidon: true, vitesse: 8 },
  vtt: { R: 0.37, t: 0.058, l: 0.03, emp: 1.14, bb: [0.33, -0.12], mani: 0.172, xp: 0.12, aS: 1.27, aD: 1.17, st: 0.44, douille: [0.74, 0.13],
    selle: 0.14, cintre: 'plat', potence: [0.04, 0.07], largeur: 0.36, rayons: 16, jante: '#26282c', crampons: true, suspension: true, disques: true, vitesse: 5.2 },
  vae: { R: 0.35, t: 0.045, l: 0.025, emp: 1.14, bb: [0.29, -0.11], mani: 0.17, xp: 0.12, aS: 1.22, aD: 1.2, st: 0.47, douille: [0.66, 0.18],
    selle: 0.1, cintre: 'plat', potence: [0.12, 0.05], largeur: 0.31, rayons: 16, trapeze: true, gardeBoue: true, porteBagages: true, bequille: true,
    phare: true, batterie: true, sacoche: true, vitesse: 6 },
  enfant: { R: 0.2, t: 0.04, l: 0.022, emp: 0.76, bb: [0.2, -0.08], mani: 0.11, xp: 0.085, aS: 1.2, aD: 1.2, st: 0.3, douille: [0.42, 0.12],
    selle: 0.08, cintre: 'plat', potence: [0.12, 0.0], largeur: 0.24, rayons: 12, gardeBoue: true, carter: true, franges: true, bequille: true, vitesse: 2.4, ouvertEnfant: true },
};
const PNEU = '#202022', ALU = '#c4c8cd', NOIR = '#26282c', ACIER = '#b9bec4', CUIR = '#563a28', OSIER = '#a8834e', OSIER2 = '#8a6a3c';

/* ---------------------------------------------------------------- une roue (repère : centre à l'origine, axe x) */
function roue(at, G, n, fin) {
  const R = G.R, t = G.t, l = G.l, rj = R - t, hj = G.janteH || 0.022, jante = G.jante || ALU, tyJ = T.carrosserie;
  // le pneu : du talon, d'un côté de la jante, au talon de l'autre, par l'épaule et la bande de roulement (garé : sans
  // l'arrondi de l'épaule)
  const P = fin ? [[rj, l * 0.78], [R - t * 0.42, l], [R - t * 0.06, l * 0.62], [R, l * 0.2], [R, -l * 0.2], [R - t * 0.06, -l * 0.62], [R - t * 0.42, -l], [rj, -l * 0.78]]
    : [[rj, l * 0.78], [R - t * 0.42, l], [R, l * 0.4], [R, -l * 0.4], [R - t * 0.42, -l], [rj, -l * 0.78]];
  const flanc = G.flanc, dern = P.length - 2;
  revolution(at, P, G.crampons ? n + (n % 2) : n, (j, k) => (flanc && (j === 0 || j === dern) ? [flanc, 0] : [PNEU, 0]), [R - t * 0.5, 0],
    G.crampons ? (i, m) => (m % 2 && i >= 1 && i <= P.length - 2 ? (i === 1 || i === P.length - 2 ? 0.004 : 0.009) : 0) : null);
  // la jante : ses deux flancs et son fond
  revolution(at, [[rj, l * 0.7], [rj - hj, l * 0.5], [rj - hj, -l * 0.5], [rj, -l * 0.7]], n, () => [jante, tyJ], [rj - hj * 0.4, 0]);
  // les rayons, croisés : chacun part d'un flasque du moyeu, en biais, vers la jante (un sur deux de chaque côté)
  const nr = fin ? G.rayons : Math.round(G.rayons * 0.3) * 2, rm = 0.03, ry = rj - hj;
  for (let i = 0; i < nr; i++) {
    const a = i / nr * TAU, s = i % 2 ? 1 : -1, b = a + s * (i % 4 < 2 ? 0.45 : -0.45);
    tube(at, [s * 0.03, Math.cos(b) * rm, Math.sin(b) * rm], [s * 0.004, Math.cos(a) * ry, Math.sin(a) * ry], 0.0024, 3, ACIER, T.carrosserie);
  }
  // le moyeu et ses flasques
  tube(at, [-0.05, 0, 0], [0.05, 0, 0], 0.017, 6, ALU, T.carrosserie, 3);
  for (const s of [1, -1]) disque(at, s * 0.03, 0, 0, 0.034, 8, ALU, T.carrosserie, s);
  // la valve
  tube(at, [0, ry, 0], [0, ry - 0.035, 0], 0.004, 4, ALU, T.carrosserie, 2);
  // les catadioptres de rayons (vélos de ville), le disque de frein (VTT)
  if (G.flanc || G.porteBagages) for (const s of [1, -1]) pave(at, [0.012 * s, Math.cos(1.2 + s) * rj * 0.58, Math.sin(1.2 + s) * rj * 0.58], 0.006, 0.03, 0.012, '#f08a24', 0);
  if (G.disques) { disque(at, 0.052, 0, 0, 0.08, 12, '#a9adb2', T.carrosserie, 1, 0.055); disque(at, 0.052, 0, 0, 0.056, 6, '#2a2c30', 0, 1); }
}

/* ---------------------------------------------------------------- le modèle
   construire(genre, couleur, o) : les géométries de chaque os, dans le repère du vélo, au repos (manivelle droite en
   bas, direction droite, selle au plus bas) ; les points utiles (D) ; os() fait le squelette. o : { panier : ce qu'il y a
   dans le panier ('baguette', 'poireaux', 'fleurs', null), detail : 1 (qui roule) ou 0 (garé, plus léger), bequille :
   'pliee' ou 'depliee', lumiere : un phare (pour ceux qui roulent le soir), selle2 : couleur de la selle }. */
const OS_VELO = ['cadre', 'direction', 'roueAv', 'roueAr', 'pedalier', 'pedaleG', 'pedaleD', 'selle'];
export function construire(genre, couleur, o = {}) {
  const G = GENRES[genre], fin = o.detail !== 0, nR = fin ? 20 : 12;
  REDUIT = fin ? 0 : 2;
  const at = {}; for (const k of OS_VELO) at[k] = new Atelier();
  const PEINT = T.carrosserie, c = couleur, cS = o.selle2 || (genre === 'ville' ? CUIR : '#1d1e21');
  const R = G.R, A = [0, R, -G.emp / 2], F = [0, R, G.emp / 2], BB = [0, G.bb[0], G.bb[1]];
  const dS = [0, Math.sin(G.aS), -Math.cos(G.aS)], dD = [0, Math.sin(G.aD), -Math.cos(G.aD)];
  const ST = plus(BB, dS, G.st); // le haut du tube de selle
  // la douille : sur l'axe de direction, qui passe 4,5 cm derrière l'axe de la roue avant (le déport de la fourche) ; son
  // bas à la hauteur douille[0]
  const nF = [0, Math.cos(G.aD), Math.sin(G.aD)], Q = plus(F, nF, -0.045);
  const HB = plus(Q, dD, (G.douille[0] - Q[1]) / dD[1]), HT = plus(HB, dD, G.douille[1]);
  const rT = genre === 'vtt' ? 0.026 : genre === 'enfant' ? 0.019 : genre === 'course' ? 0.018 : 0.021, nT = fin ? 7 : 5;
  const cad = at.cadre;
  // -- le cadre
  if (G.ouvert) {
    // cadre ouvert (col de cygne), à double tube : on enjambe sans lever la jambe
    suite(cad, [plus(HT, dD, -0.04), [0, HT[1] - 0.16, HT[2] - 0.12], [0, 0.46, 0.08], [0, BB[1] + 0.05, BB[2] + 0.07], BB], rT, nT, c, PEINT);
    suite(cad, [plus(HB, dD, 0.03), [0, HB[1] - 0.14, HB[2] - 0.12], [0, 0.4, 0.1], [0, BB[1] + 0.03, BB[2] + 0.08]], rT * 0.85, nT, c, PEINT);
  } else if (G.ouvertEnfant) {
    suite(cad, [plus(HB, dD, 0.05), [0, BB[1] + 0.12, BB[2] + 0.14], BB], rT, nT, c, PEINT);
    tube(cad, plus(HT, dD, -0.03), plus(ST, dS, -0.1), rT * 0.9, nT, c, PEINT, 0, rT * 0.9, 0.01);
  } else if (G.trapeze) {
    // le cadre trapèze du vélo électrique : tube oblique épais (la batterie dessus), tube horizontal abaissé
    tube(cad, BB, plus(HB, dD, 0.03), rT * 1.35, nT, c, PEINT, 0, rT * 1.25, 0.01);
    tube(cad, plus(HT, dD, -0.05), plus(ST, dS, -0.17), rT, nT, c, PEINT, 0, rT, 0.01);
  } else {
    tube(cad, BB, plus(HB, dD, 0.02), rT * 1.15, nT, c, PEINT, 0, rT * 1.15, 0.01); // tube oblique
    tube(cad, plus(HT, dD, -0.02), plus(ST, dS, genre === 'vtt' ? -0.07 : -0.02), rT, nT, c, PEINT, 0, rT, 0.01); // tube horizontal
  }
  tube(cad, BB, ST, rT, nT, c, PEINT, 2); // tube de selle
  tube(cad, plus(HB, dD, -0.02), plus(HT, dD, 0.01), rT * 1.25, nT, c, PEINT, 3); // douille
  // haubans et bases, des deux côtés, jusqu'aux pattes de la roue arrière
  for (const s of [1, -1]) {
    const pa = [s * 0.06, A[1] + 0.01, A[2] + 0.01];
    tube(cad, [s * 0.025, BB[1], BB[2] - 0.02], pa, rT * 0.62, 5, c, PEINT, 0, rT * 0.5);
    tube(cad, [s * 0.022, ...plus(ST, dS, -0.035).slice(1)], pa, rT * 0.55, 5, c, PEINT, 0, rT * 0.45);
    pave(cad, [s * 0.062, A[1], A[2]], 0.006, 0.018, 0.022, c, PEINT);
  }
  // le boîtier de pédalier
  tube(cad, [0.045, BB[1], BB[2]], [-0.045, BB[1], BB[2]], 0.024, 6, c, PEINT, 3);
  // -- la chaîne (côté droit) : brin du haut et brin du bas, du plateau au pignon ; dérailleur ; le carter des vélos de ville
  const xc = -0.07, rp = genre === 'enfant' ? 0.07 : 0.1, rg = 0.04;
  tube(cad, [xc, BB[1] + rp, BB[2]], [xc, A[1] + rg, A[2]], 0.005, 3, '#3a3a3e', 0);
  tube(cad, [xc, BB[1] - rp, BB[2]], [xc, A[1] - rg, A[2]], 0.005, 3, '#3a3a3e', 0);
  if (G.carter) {
    // un carter plat qui couvre le brin du haut et le plateau
    const z0 = BB[2] + rp + 0.02, z1 = A[2] + 0.02, y0 = BB[1] + rp + 0.03, y1 = A[1] + rg + 0.03;
    cad.quad([xc - 0.022, y0, z0], [xc - 0.022, y1, z1], [xc - 0.022, y1 - 0.06, z1], [xc - 0.022, y0 - 0.09, z0], G.flanc ? c : '#2a2a2e', G.flanc ? PEINT : 0, [-1, 0, 0]);
    cad.quad([xc - 0.022, y0, z0], [xc + 0.012, y0, z0], [xc + 0.012, y1, z1], [xc - 0.022, y1, z1], G.flanc ? c : '#2a2a2e', G.flanc ? PEINT : 0, [0, 1, 0]);
  } else if (genre !== 'enfant') pave(cad, [-0.08, A[1] - 0.09, A[2] + 0.02], 0.012, 0.04, 0.025, '#2b2d31', 0); // dérailleur arrière
  // -- garde-boue arrière, porte-bagages, feu arrière, béquille
  const arc = (centre, r, a0, a1, w, col, ty, n) => {
    for (let k = 0; k < n; k++) {
      const t0 = a0 + (a1 - a0) * k / n, t1 = a0 + (a1 - a0) * (k + 1) / n;
      // (un garde-boue bombé : le dessus, deux bords qui descendent de part et d'autre du pneu)
      const p = (t, rr, x) => [x, centre[1] + Math.cos(t) * rr, centre[2] + Math.sin(t) * rr], q = at[centre === F ? 'direction' : 'cadre'];
      q.quad(p(t0, r, w * 0.6), p(t0, r, -w * 0.6), p(t1, r, -w * 0.6), p(t1, r, w * 0.6), col, ty, [0, Math.cos((t0 + t1) / 2), Math.sin((t0 + t1) / 2)]);
      for (const s of [1, -1]) q.quad(p(t0, r, s * w * 0.6), p(t1, r, s * w * 0.6), p(t1, r - 0.022, s * w), p(t0, r - 0.022, s * w), col, ty, [s, 0.6 * Math.cos((t0 + t1) / 2), 0.6 * Math.sin((t0 + t1) / 2)]);
    }
  };
  const nA = fin ? 10 : 7;
  if (G.gardeBoue) arc(A, R + 0.022, 0.5, -2.05, G.l + 0.022, genre === 'enfant' ? '#f2f0ea' : c, PEINT, nA);
  if (G.porteBagages) {
    const y = R + 0.12, z0 = A[2] - 0.2, z1 = A[2] + 0.22;
    for (const s of [1, -1]) {
      tube(cad, [s * 0.065, y, z0], [s * 0.065, y, z1], 0.006, 4, '#2a2a2e', 0, 3);
      tube(cad, [s * 0.065, y, z0 + 0.02], [s * 0.06, A[1], A[2]], 0.005, 4, '#2a2a2e', 0);
      tube(cad, [s * 0.065, y, z1], [s * 0.03, ...plus(ST, dS, -0.07).slice(1)], 0.005, 4, '#2a2a2e', 0);
    }
    for (const z of [z0, (z0 + z1) / 2, z1]) tube(cad, [0.065, y, z], [-0.065, y, z], 0.005, 4, '#2a2a2e', 0);
    // le feu arrière, au bout du porte-bagages, et son catadioptre
    pave(cad, [0, y - 0.02, z0 - 0.015], 0.03, 0.018, 0.012, '#b8231c', 0);
    if (G.sacoche) pave(cad, [-0.11, y - 0.13, A[2] + 0.02], 0.045, 0.13, 0.15, o.sacoche || '#2f4a6b', 0);
  } else pave(cad, [0, ST[1] - 0.06, ST[2] - 0.045], 0.016, 0.022, 0.01, '#b8231c', 0); // un petit feu sur la tige de selle
  if (G.bequille && o.bequille !== 'depliee') tube(cad, [0.05, BB[1] - 0.02, BB[2] - 0.07], [0.07, A[1] + 0.02, A[2] + 0.12], 0.009, 4, NOIR, 0, 2);
  if (G.bequille && o.bequille === 'depliee') tube(cad, [0.05, BB[1] - 0.02, BB[2] - 0.07], [0.2, 0.0, BB[2] - 0.2], 0.009, 4, NOIR, 0, 2);
  // -- batterie et moteur (vélo à assistance électrique) ; bidon (course)
  if (G.batterie) {
    const a = plus(BB, unit(moins(HB, BB)), 0.12), b = plus(BB, unit(moins(HB, BB)), 0.47), m = entre3(a, b, 0.5), d = unit(moins(b, a));
    const rx = Math.atan2(d[2], d[1]), dessus = [0, d[2], -d[1]]; // (le dessus du tube oblique, vers le tube horizontal)
    pave(cad, plus(m, dessus, 0.05), 0.038, 0.18, 0.033, '#2b2e33', 0, rx);
    pave(cad, plus(b, dessus, 0.05), 0.03, 0.02, 0.028, '#8d9298', T.carrosserie, rx);
    pave(cad, plus(m, dessus, 0.085), 0.008, 0.012, 0.006, '#6fd38a', 0, rx); // le voyant de charge
    pave(cad, [0, BB[1] - 0.02, BB[2] + 0.03], 0.05, 0.075, 0.09, '#24272b', 0);
  }
  if (G.bidon) {
    const d = unit(moins(HB, BB)), m = plus(plus(BB, d, 0.25), [0, d[2], -d[1]], 0.05);
    tube(cad, plus(m, d, -0.09), plus(m, d, 0.09), 0.034, 7, o.bidon || '#e9e6de', 0, 3);
  }
  // -- la direction : fourche, potence, cintre, poignées, leviers, sonnette, garde-boue et panier, phare
  const dir = at.direction, PI2 = Math.PI / 2;
  const tete = plus(HT, dD, 0.015); // le jeu de direction
  tube(dir, plus(HT, dD, 0.005), tete, rT * 1.35, 6, '#2b2d31', 0, 2);
  const couronne = plus(HB, dD, -0.025);
  if (G.suspension) {
    for (const s of [1, -1]) {
      const h0 = [s * 0.058, couronne[1] - 0.02, couronne[2] + 0.005], pied = [s * 0.058, F[1], F[2]];
      const mi = entre3(h0, pied, 0.42);
      tube(dir, h0, mi, 0.017, 6, '#c9ccd0', T.carrosserie, 0);
      tube(dir, plus(mi, unit(moins(h0, pied)), 0.04), pied, 0.024, 6, '#1d1e21', 0, 2);
    }
    pave(dir, [0, couronne[1] - 0.02, couronne[2] + 0.005], 0.075, 0.018, 0.03, '#1d1e21', 0);
    pave(dir, [0, F[1] + 0.17, F[2] - 0.015], 0.06, 0.012, 0.018, '#1d1e21', 0); // l'arceau
  } else {
    for (const s of [1, -1]) suite(dir, [[s * 0.035, couronne[1], couronne[2]], [s * 0.05, couronne[1] - 0.12, couronne[2] + 0.04], [s * 0.052, F[1], F[2]]], rT * 0.6, 5, c, PEINT);
    pave(dir, couronne, 0.05, 0.014, 0.025, c, PEINT);
  }
  pave(dir, [0, F[1], F[2]], 0.055, 0.006, 0.006, '#9aa0a6', T.carrosserie); // les écrous de l'axe
  if (G.gardeBoue) arc(F, R + 0.022, -0.55, 1.7, G.l + 0.022, genre === 'enfant' ? '#f2f0ea' : c, PEINT, Math.max(5, nA - 2));
  // la potence : elle monte dans l'axe, puis avance ; le collier du cintre
  const pot = plus(tete, dD, G.potence[0]), coll = [0, pot[1] + 0.01, pot[2] + G.potence[1]];
  tube(dir, tete, pot, 0.014, 6, ALU, T.carrosserie);
  tube(dir, pot, coll, 0.015, 6, ALU, T.carrosserie, 2);
  // le cintre et les poignées ; prise : où se tient la main gauche (la droite en miroir) ; doigts, paume : l'orientation de
  // la main gauche (anim.js : poseVelo)
  const L = G.largeur, y = coll[1], z = coll[2];
  let prise, cintre, doigts, paume;
  if (G.cintre === 'hollandais') {
    cintre = [[0, y, z], [0.1, y + 0.005, z + 0.02], [0.2, y + 0.02, z - 0.02], [L - 0.02, y + 0.035, z - 0.12], [L, y + 0.04, z - 0.2]];
    prise = [L - 0.01, y + 0.04, z - 0.17];
    doigts = [0.62, -0.42, 0.66]; paume = [-0.35, -0.82, 0.45];
  } else if (G.cintre === 'route') {
    cintre = [[0, y, z], [0.12, y, z], [L - 0.02, y, z + 0.005], [L, y - 0.005, z + 0.06], [L, y - 0.03, z + 0.12], [L, y - 0.1, z + 0.12], [L, y - 0.14, z + 0.07], [L, y - 0.14, z - 0.01]];
    prise = [L, y + 0.025, z + 0.1];
    doigts = [0.05, -0.32, 0.95]; paume = [-0.78, -0.62, 0.05];
  } else {
    cintre = [[0, y, z], [0.12, y + 0.01, z - 0.005], [L, y + 0.025, z - 0.035]];
    prise = [L - 0.055, y + 0.022, z - 0.03];
    doigts = [0.1, -0.35, 0.93]; paume = [0, -0.93, -0.36];
  }
  const tapis = G.cintre === 'route' ? (o.guidoline || '#1d1e21') : ALU;
  for (const s of [1, -1]) {
    const pts = cintre.map(p => [p[0] * s, p[1], p[2]]);
    suite(dir, pts, 0.012, 6, tapis, G.cintre === 'route' ? 0 : T.carrosserie, 2);
    if (G.cintre === 'route') {
      // les cocottes (leviers de frein et de vitesse) : le corps posé sur le cintre, le levier qui descend
      pave(dir, [s * L, y + 0.02, z + 0.11], 0.016, 0.022, 0.035, '#18191b', 0, -0.5);
      tube(dir, [s * L, y + 0.01, z + 0.135], [s * L, y - 0.11, z + 0.145], 0.007, 4, '#2b2d31', 0, 2);
    } else {
      // la poignée, le levier de frein devant
      const g0 = G.cintre === 'hollandais' ? [s * (L - 0.016), y + 0.038, z - 0.11] : [s * (L - 0.11), y + 0.019, z - 0.026], g1 = s > 0 ? plus(cintre[cintre.length - 1], [0, 0, 0]) : miroir(cintre[cintre.length - 1]);
      tube(dir, g0, plus(g1, unit(moins(g1, g0)), 0.01), 0.017, 6, G.cintre === 'hollandais' ? CUIR : '#1d1e21', 0, 2);
      const lv = plus(g0, [0, 0, 0.012]);
      tube(dir, lv, plus(lv, [s * 0.09, -0.012, 0.03]), 0.006, 4, ALU, T.carrosserie, 2);
      if (G.franges) for (let k = 0; k < 4; k++) tube(dir, plus(g1, [0, 0, 0]), plus(g1, [s * (0.01 + k * 0.008), -0.08 - k * 0.01, -0.02 + k * 0.012]), 0.004, 3, k % 2 ? '#ff6fae' : '#ffffff', 0);
    }
  }
  // la sonnette, sur le cintre, à gauche ; l'écran du vélo électrique au milieu
  if (genre !== 'course') {
    const sb = G.cintre === 'hollandais' ? [0.15, y + 0.03, z] : [L - 0.15, y + 0.04, z - 0.02];
    tube(dir, sb, plus(sb, [0, 0.022, 0]), 0.024, 8, '#d7dadd', T.carrosserie, 2, 0.008);
  }
  if (G.batterie) pave(dir, [0, y + 0.04, z - 0.01], 0.035, 0.012, 0.025, '#1d1e21', 0, -0.4), pave(dir, [0, y + 0.048, z - 0.013], 0.028, 0.004, 0.018, '#6fd3e8', 0, -0.4);
  // le phare : sur la fourche, sous le panier (vélo de ville) ou au cintre
  let lampe = null;
  if (G.phare || o.lumiere) {
    lampe = G.panier ? [0, couronne[1] + 0.02, couronne[2] + 0.07] : [0.05, y - 0.03, z + 0.03];
    tube(dir, lampe, plus(lampe, [0, 0, 0.05]), 0.026, 8, '#2b2d31', 0, 0, 0.03);
    pave(dir, plus(lampe, [0, 0, 0.052]), 0.021, 0.021, 0.004, '#ffe1a0', 0); // la glace (une lampe : elle luit un peu, même de jour)
  }
  // le panier d'osier, devant le cintre, et ce qu'il porte
  if (G.panier) {
    const pc = [0, y - 0.1, z + 0.2], w = 0.17, h = 0.13, d = 0.13;
    const coins = (yy, k) => [[-w * k, yy, pc[2] - d * k], [w * k, yy, pc[2] - d * k], [w * k, yy, pc[2] + d * k], [-w * k, yy, pc[2] + d * k]];
    const bas = coins(pc[1] - h, 0.9), haut = coins(pc[1] + h, 1);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, m = [(bas[i][0] + bas[j][0]) / 2, 0, (bas[i][2] + bas[j][2]) / 2 - pc[2]];
      dir.quad(bas[i], bas[j], haut[j], haut[i], OSIER, 0, m);
      dir.quad(bas[j], bas[i], haut[i], haut[j], OSIER2, 0, [-m[0], 0, -m[2]]); // le dedans
      for (const t of [0.33, 0.66]) tube(dir, entre3(bas[i], haut[i], t), entre3(bas[j], haut[j], t), 0.006, 3, OSIER2, 0); // la vannerie
      tube(dir, haut[i], haut[j], 0.012, 4, OSIER2, 0); // le bord
    }
    dir.poly(bas, OSIER2, 0, [0, 1, 0]);
    tube(dir, [0, coll[1] - 0.02, coll[2] + 0.01], [0, pc[1], pc[2] - d], 0.008, 4, NOIR, 0); // la patte
    for (const s of [1, -1]) tube(dir, [s * 0.1, pc[1] - h, pc[2]], [s * 0.05, F[1] + 0.03, F[2]], 0.005, 4, NOIR, 0); // les tringles
    if (o.panier === 'baguette') { tube(dir, [0.05, pc[1] - 0.08, pc[2] - 0.06], [-0.04, pc[1] + 0.3, pc[2] + 0.08], 0.03, 6, '#d39b52', 0, 3); tube(dir, [-0.08, pc[1] - 0.08, pc[2] - 0.02], [-0.1, pc[1] + 0.12, pc[2] + 0.06], 0.035, 6, '#e8e2d2', 0, 2); }
    if (o.panier === 'poireaux') for (const dx of [-0.05, 0, 0.05]) { tube(dir, [dx, pc[1] - 0.08, pc[2]], [dx * 1.6, pc[1] + 0.12, pc[2] + 0.04], 0.018, 5, '#ede8d4', 0, 1); tube(dir, [dx * 1.6, pc[1] + 0.12, pc[2] + 0.04], [dx * 2.4, pc[1] + 0.33, pc[2] + 0.1], 0.02, 5, '#4f7a3a', 0, 2, 0.026); }
    if (o.panier === 'fleurs') { for (const dx of [-0.05, 0.04]) tube(dir, [dx, pc[1] - 0.05, pc[2]], [dx * 1.5, pc[1] + 0.2, pc[2] + 0.03], 0.006, 3, '#4f7a3a', 0); tube(dir, [-0.1, pc[1] + 0.18, pc[2] + 0.03], [0.1, pc[1] + 0.26, pc[2] + 0.05], 0.06, 6, '#d04a6b', 0, 3, 0.05); }
  }
  // -- les roues (chacune dans son repère, posée à son axe), le pédalier, les pédales, la selle
  roue(at.roueAv, G, nR, fin); roue(at.roueAr, G, nR, fin);
  {
    const p = at.pedalier, M = G.mani, x0 = -0.07;
    // le plateau : une couronne dentelée (une facette sur deux plus courte), son araignée
    const n = fin ? 24 : 16;
    for (let k = 0; k < n; k++) {
      const a0 = k / n * TAU, a1 = (k + 1) / n * TAU, rr = k % 2 ? rp : rp - 0.006;
      const q = (a, r) => [x0, Math.cos(a) * r, Math.sin(a) * r];
      p.quad(q(a0, rp * 0.72), q(a0, rr), q(a1, rr), q(a1, rp * 0.72), '#9aa0a6', T.carrosserie, [-1, 0, 0]);
      p.quad(q(a0, rr), q(a0, rp * 0.72), q(a1, rp * 0.72), q(a1, rr), '#9aa0a6', T.carrosserie, [1, 0, 0]);
      p.quad([x0 - 0.003, Math.cos(a0) * rr, Math.sin(a0) * rr], [x0 + 0.003, Math.cos(a0) * rr, Math.sin(a0) * rr], [x0 + 0.003, Math.cos(a1) * rr, Math.sin(a1) * rr], [x0 - 0.003, Math.cos(a1) * rr, Math.sin(a1) * rr], '#9aa0a6', T.carrosserie, [0, Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2)]);
    }
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4; tube(p, [x0, 0, 0], [x0, Math.cos(a) * rp * 0.75, Math.sin(a) * rp * 0.75], 0.008, 4, '#2b2d31', 0); }
    // l'axe et les deux manivelles (au repos : la droite en bas, la gauche en haut)
    tube(p, [0.075, 0, 0], [-0.08, 0, 0], 0.011, 6, '#2b2d31', 0, 3);
    tube(p, [-0.082, 0, 0], [-G.xp + 0.035, -M, 0], 0.011, 5, '#3a3c40', T.carrosserie, 3);
    tube(p, [0.077, 0, 0], [G.xp - 0.035, M, 0], 0.011, 5, '#3a3c40', T.carrosserie, 3);
    // les pédales : une plateforme, son axe, deux catadioptres orange
    for (const [k, s] of [['pedaleG', 1], ['pedaleD', -1]]) {
      const q = at[k], lp = genre === 'enfant' ? 0.035 : 0.045;
      tube(q, [-s * 0.035, 0, 0], [s * 0.04, 0, 0], 0.006, 4, ALU, T.carrosserie);
      pave(q, [s * 0.01, 0, 0], lp, 0.011, 0.035, genre === 'course' ? '#2b2d31' : '#1d1e21', 0);
      if (genre !== 'course') for (const z of [0.036, -0.036]) pave(q, [s * 0.01, 0, z], lp * 0.6, 0.006, 0.002, '#f08a24', 0);
    }
  }
  // la selle et sa tige (dans le repère de l'os de la selle : le haut du tube de selle, au repos)
  {
    const q = at.selle, haut = G.selle, sp = plus([0, 0, 0], dS, haut);
    tube(q, plus([0, 0, 0], dS, -0.22), sp, 0.0135, 6, genre === 'course' ? NOIR : ALU, T.carrosserie, 0);
    const y0 = sp[1] + 0.03, z0 = sp[2], large = genre === 'ville' ? 0.11 : genre === 'vae' ? 0.09 : genre === 'enfant' ? 0.07 : 0.07;
    const nez = genre === 'ville' ? 0.11 : 0.16, cul = genre === 'ville' ? 0.1 : 0.12, ep = genre === 'ville' ? 0.035 : 0.022;
    // un pavé biseauté : large à l'arrière, étroit au nez, bombé dessus
    const P = [[-large, y0 - ep, z0 - cul], [large, y0 - ep, z0 - cul], [0.022, y0 - ep * 0.6, z0 + nez], [-0.022, y0 - ep * 0.6, z0 + nez],
      [-large * 0.92, y0 + ep * 0.5, z0 - cul + 0.01], [large * 0.92, y0 + ep * 0.5, z0 - cul + 0.01], [0.018, y0 + ep * 0.15, z0 + nez - 0.005], [-0.018, y0 + ep * 0.15, z0 + nez - 0.005]];
    const F2 = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], cm = [0, y0, z0];
    for (const f of F2) { const m = [0, 0, 0]; for (const i of f) { m[0] += (P[i][0] - cm[0]) / 4; m[1] += (P[i][1] - cm[1]) / 4; m[2] += (P[i][2] - cm[2]) / 4; } q.quad(P[f[0]], P[f[1]], P[f[2]], P[f[3]], cS, 0, m); }
    // le chariot sous la selle ; les deux ressorts de la selle de ville
    tube(q, [0, y0 - ep, z0 - 0.04], [0, y0 - ep, z0 + 0.08], 0.006, 4, '#2b2d31', 0);
    if (genre === 'ville') for (const s of [1, -1]) tube(q, [s * 0.06, y0 - ep, z0 - 0.07], [s * 0.05, y0 - ep - 0.06, z0 - 0.06], 0.012, 6, '#2b2d31', 0, 2);
  }
  // os : position au repos (dans le repère du vélo) ; roues et pédales : leur géométrie est faite autour de leur axe
  REDUIT = 0;
  const geos = {};
  for (const k of OS_VELO) geos[k] = at[k].geos();
  const place = (liste, p) => { for (const g of liste) { const a = g.attributes.position.array; for (let i = 0; i < a.length; i += 3) { a[i] += p[0]; a[i + 1] += p[1]; a[i + 2] += p[2]; } } };
  place(geos.roueAv, F); place(geos.roueAr, A); place(geos.pedalier, BB);
  place(geos.pedaleG, plus(BB, [G.xp, G.mani, 0])); place(geos.pedaleD, plus(BB, [-G.xp, -G.mani, 0]));
  place(geos.selle, ST);
  const D = {
    genre, G, R, A, F, BB, ST, dS, dD, HB, HT, mani: G.mani, xp: G.xp, prise, doigts: unit(doigts), paume: unit(paume), lampe, cintre: G.cintre,
    // le dessus de la selle, au repos (sur l'os de la selle : il suit son réglage)
    selle: plus(plus(ST, dS, G.selle), [0, 0.03 + (genre === 'ville' ? 0.035 : 0.022) * 0.4, -0.01]),
    feu: G.porteBagages ? [0, R + 0.1, A[2] - 0.22] : [0, ST[1] - 0.06, ST[2] - 0.06],
  };
  return { geos, D };
}

// Le squelette d'un vélo construit : huit os à leur place de repos (os[0] : le cadre, à l'origine)
function squelette(D) {
  const os = OS_VELO.map(() => new THREE.Bone());
  const [cadre, direction, roueAv, roueAr, pedalier, pedaleG, pedaleD, selle] = os;
  cadre.add(direction, roueAr, pedalier, selle);
  // la direction tourne autour de l'axe de la douille (incliné vers l'arrière) : son repère a y le long de cet axe
  direction.position.set(...D.HB); direction.rotation.set(-(Math.PI / 2 - D.G.aD), 0, 0, 'XYZ');
  direction.add(roueAv);
  direction.updateMatrix();
  const F = new THREE.Vector3(...D.F).applyMatrix4(direction.matrix.clone().invert());
  roueAv.position.copy(F);
  roueAr.position.set(...D.A); pedalier.position.set(...D.BB); selle.position.set(...D.ST);
  pedalier.add(pedaleG, pedaleD);
  pedaleG.position.set(D.xp, D.mani, 0); pedaleD.position.set(-D.xp, -D.mani, 0);
  return os;
}
// Poser un squelette : braquage, angle des roues, angle du pédalier (0 : manivelle droite en bas ; en avançant, il croît),
// réglage de la selle (le long du tube)
function poserOs(os, D, braq, roue, mani, selle) {
  os[1].rotation.y = braq;
  os[2].rotation.x = roue; os[3].rotation.x = roue;
  os[4].rotation.x = mani; os[5].rotation.x = -mani; os[6].rotation.x = -mani;
  os[7].position.set(D.ST[0], D.ST[1] + D.dS[1] * selle, D.ST[2] + D.dS[2] * selle);
}

// Un vélo qui roule : un maillage à peau (les géométries de chaque os, chacune liée à son os d'un poids de 1)
const OMBRE_VELO = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); // (le programme d'ombre des personnages : déjà compilé)
function veloRoulant(genre, couleur, o) {
  const { geos, D } = construire(genre, couleur, o);
  const parts = [];
  OS_VELO.forEach((k, i) => {
    if (!geos[k].length) return;
    const g = fusion(geos[k]), n = g.attributes.position.count, si = new Uint8Array(n * 4), sw = new Uint8Array(n * 4);
    for (let j = 0; j < n; j++) { si[j * 4] = i; sw[j * 4] = 255; }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4, true));
    parts.push(g);
  });
  const geo = compacter(indexer(fusion(parts), true));
  const os = squelette(D);
  const mesh = new THREE.SkinnedMesh(geo, MAT);
  mesh.add(os[0]); mesh.bind(new THREE.Skeleton(os));
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.6, 0), 1.25);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.customDepthMaterial = OMBRE_VELO;
  return { mesh, os, D };
}

// Un vélo garé, figé : ses géométries dans son repère (le vélo vers +z, au sol), à fondre dans le décor. o : { braq, roue,
// mani, selle (réglage), penche (vers sa gauche, rad), bequille, panier... }
export function veloGare(genre, couleur, o = {}) {
  const { geos, D } = construire(genre, couleur, { ...o, detail: 0, bequille: o.bequille });
  const os = squelette(D);
  poserOs(os, D, o.braq ?? 0, o.roue ?? 0, o.mani ?? 0.6, o.selle ?? 0.08);
  const racine = new THREE.Object3D(); racine.add(os[0]); racine.rotation.z = -(o.penche ?? 0); racine.updateMatrixWorld(true);
  const liste = [], inv = new THREE.Matrix4(), m = new THREE.Matrix4();
  // la pose de repos de chaque os (pour passer de sa géométrie de repos à sa pose)
  const repos = squelette(D); const rr = new THREE.Object3D(); rr.add(repos[0]); rr.updateMatrixWorld(true);
  OS_VELO.forEach((k, i) => {
    if (!geos[k].length) return;
    inv.copy(repos[i].matrixWorld).invert(); m.multiplyMatrices(os[i].matrixWorld, inv);
    for (const g of geos[k]) { g.applyMatrix4(m); liste.push(g); }
  });
  return [fusion(liste)]; // (une géométrie par vélo : le décor de son quartier en fond moins)
}

/* ---------------------------------------------------------------- les vélos garés
   rangeVelos(dest, col, x, z, rot, o) : un range-vélos garni, posé en (x, z), tourné de rot (comme le décor : modeles.js,
   poser) ; dest reçoit les géométries (une Grille de monde.js : elles se fondent dans le décor du quartier), col les
   boîtes de collision. Repère du range-vélos : la rangée le long de x, les vélos le long de z (l'avant vers +z).
   o : { type : 'arceaux' (des arceaux en U renversé, un vélo de chaque côté) ou 'ratelier' (un râtelier pince-roues, les
   roues avant dans les fentes ; pour une école), n : le nombre de places, garnis : combien de vélos (au hasard des places),
   genres : la liste où tirer les genres (par défaut ville, vae, course, vtt ; 'enfant' pour une école), graine }. */
const COULEURS = {
  ville: ['#2f5d50', '#8e2a3b', '#e9e1cf', '#2a3e5c', '#c9a23a', '#33343a'],
  course: ['#c0392b', '#f2efe6', '#1f1f24', '#2e86de', '#16a085'],
  vtt: ['#e84e1b', '#3a4a2a', '#202428', '#7a8c3a'],
  vae: ['#5d6b72', '#f2efe6', '#2a3e5c', '#8c9aa1'],
  enfant: ['#e84393', '#16a085', '#f1c40f', '#2e86de', '#e74c3c'],
};
export function rangeVelos(dest, col, x, z, rot, o = {}) {
  const r = hasard(o.graine ?? Math.round(x * 131 + z * 71)), pick = a => a[Math.floor(r() * a.length)];
  const n = o.n ?? 4, type = o.type ?? 'arceaux', genres = o.genres ?? ['ville', 'ville', 'vae', 'course', 'vtt'];
  const co = Math.cos(rot), si = Math.sin(rot), L = [];
  const W = (lx, lz) => [x + lx * co + lz * si, z + lz * co - lx * si];
  const at = new Atelier(), GALVA = '#9aa0a6';
  let places = [];
  if (type === 'ratelier') {
    // un râtelier : deux longerons bas, une fente (deux arceaux serrés) tous les 45 cm
    const pas = 0.45, l = (n - 1) * pas / 2 + 0.3;
    for (const y of [0.12, 0.34]) tube(at, [-l, y, 0], [l, y, 0], 0.016, 5, GALVA, T.carrosserie, 3);
    for (const s of [-1, 1]) tube(at, [s * l, 0, -0.25], [s * l, 0.36, 0], 0.016, 5, GALVA, T.carrosserie, 0);
    for (let i = 0; i < n; i++) {
      const px = -((n - 1) * pas) / 2 + i * pas;
      for (const s of [-1, 1]) suite(at, [[px + s * 0.03, 0.0, -0.18], [px + s * 0.03, 0.42, -0.02], [px + s * 0.03, 0.42, 0.05], [px + s * 0.03, 0.12, 0.12]], 0.006, 4, GALVA, T.carrosserie);
      places.push({ x: px, z: -0.25, h: 0, roueDans: true });
    }
    if (col) col.boiteO(x + 0 * co, z, (n - 1) * pas + 0.7, 0.5, rot);
  } else {
    // des arceaux : un U renversé de 0,75 m de haut, tous les 1,1 m ; un vélo de chaque côté, le long de l'arceau
    const pas = 1.1;
    for (let i = 0; i < n; i++) {
      const px = -((n - 1) * pas) / 2 + i * pas, h = 0.75, d = 0.36;
      suite(at, [[px, 0, -d], [px, h - 0.12, -d], [px, h - 0.02, -d + 0.08], [px, h, 0], [px, h - 0.02, d - 0.08], [px, h - 0.12, d], [px, 0, d]], 0.024, 6, o.couleurArceau || GALVA, T.carrosserie);
      // (un de chaque côté, tête-bêche : les cintres ne se gênent pas)
      for (const s of [-1, 1]) places.push({ x: px + s * 0.3, z: s * 0.16, h: s > 0 ? 0 : Math.PI, cote: s });
      if (col) col.boiteO(W(px, 0)[0], W(px, 0)[1], 0.75, 1.0, rot);
    }
  }
  L.push(fusion(at.geos()));
  // les vélos : au hasard des places
  const k = o.garnis ?? Math.ceil(places.length * 0.6);
  const libres = places.slice();
  for (let i = 0; i < k && libres.length; i++) {
    const p = libres.splice(Math.floor(r() * libres.length), 1)[0];
    const genre = pick(genres), c = pick(COULEURS[genre]);
    // (appuyé contre son arceau : il penche vers lui, à sa droite)
    const g = veloGare(genre, c, { braq: (r() - 0.5) * 0.5, roue: r() * 6, mani: r() * 6, selle: genre === 'enfant' ? 0.02 + r() * 0.08 : 0.04 + r() * 0.14, penche: p.cote ? -0.035 : 0, panier: genre === 'ville' && r() < 0.3 ? 'fleurs' : null, selle2: genre === 'ville' && r() < 0.4 ? '#1d1e21' : undefined });
    // le vélo posé à sa place (la roue avant dans la fente du râtelier : on le recule d'une demi-longueur)
    const dz = p.roueDans ? -GENRES[genre].emp / 2 - GENRES[genre].R * 0.45 : (r() - 0.5) * 0.2;
    for (const gg of g) { if (p.h) gg.rotateY(p.h); gg.translate(p.x, 0, p.z + dz + (p.roueDans ? 0.55 : 0)); L.push(gg); }
    if (col && p.roueDans) { const c2 = W(p.x, dz + 0.55); col.boiteO(c2[0], c2[1], 0.4, GENRES[genre].emp + 0.5, rot); }
  }
  const y = o.y ?? sol(x, z); // (au sol : le plateau du château est à 31 m)
  for (const g of L) { if (rot) g.rotateY(rot); g.translate(x, y, z); dest.push(g); }
  return k;
}
// Un vélo posé seul : sur sa béquille, ou appuyé contre un mur (penche vers sa gauche, le cintre tourné contre le mur), en
// (x, z), tourné de rot. Sa boîte de collision.
export function veloSeul(dest, col, x, z, rot, genre, couleur, o = {}) {
  const contre = o.contre ?? 0; // contre un mur : de quel côté (+1 : à sa gauche, -1 : à sa droite), 0 : sur sa béquille
  const g = veloGare(genre, couleur, { ...o, bequille: contre ? 'pliee' : 'depliee', penche: contre ? contre * 0.16 : 0.1, braq: contre ? contre * 0.5 : o.braq ?? 0.25 });
  const y = o.y ?? sol(x, z);
  for (const gg of g) { if (rot) gg.rotateY(rot); gg.translate(x, y, z); dest.push(gg); }
  if (col) col.boiteO(x, z, 0.5, GENRES[genre].emp + GENRES[genre].R * 2 - 0.1, rot);
}

/* ---------------------------------------------------------------- les chemins des cyclistes
   Une ligne brisée de points [x, z, g, d] : la ligne que suit le cycliste (au bord droit de sa voie), g et d : de combien il
   peut s'en écarter à gauche (doubler, contourner) et à droite (se ranger). Ses coins arrondis (rayon r, ou le 5e nombre du
   point), puis un point tous les 50 cm : x, z, cap, courbure, pente, vitesse permise (2 m/s² de côté au plus, il penche).
   ferme : une boucle. evts : [x, z, genre, durée] posés sur la ligne ('stop' : on s'arrête et l'on regarde avant de
   s'engager ; 'cede' : on tourne à gauche, on laisse passer ceux d'en face ; 'pause' : on s'arrête un moment). */
const PAS = 0.5;
function arrondir(pts, r) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const A = pts[i - 1], B = pts[i], C = pts[i + 1];
    const ux = B[0] - A[0], uz = B[1] - A[1], lu = Math.hypot(ux, uz), wx = C[0] - B[0], wz = C[1] - B[1], lw = Math.hypot(wx, wz);
    if (lu < 1e-3 || lw < 1e-3) continue;
    const phi = Math.acos(borne((ux * wx + uz * wz) / (lu * lw), -1, 1));
    if (phi < 0.03) { out.push(B); continue; }
    const t = Math.min((B[4] ?? r) * Math.tan(phi / 2), lu * 0.5, lw * 0.5), re = t / Math.tan(phi / 2);
    const p1 = [B[0] - ux / lu * t, B[1] - uz / lu * t], p2 = [B[0] + wx / lw * t, B[1] + wz / lw * t], gauche = ux * wz - uz * wx < 0;
    // le centre : du côté où l'on tourne (à gauche de (ux, uz) : (uz, -ux))
    const cx = p1[0] + (gauche ? uz : -uz) / lu * re, cz = p1[1] + (gauche ? -ux : ux) / lu * re;
    const a0 = Math.atan2(p1[1] - cz, p1[0] - cx), a2 = Math.atan2(p2[1] - cz, p2[0] - cx), n = Math.max(2, Math.ceil(phi / 0.12));
    const da = angle(a2 - a0); // (l'arc le plus court : moins d'un demi-tour)
    for (let k = 0; k <= n; k++) { const a = a0 + da * k / n; out.push([cx + Math.cos(a) * re, cz + Math.sin(a) * re, B[2], B[3]]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// un arc de cercle de centre (cx, cz), de rayon r, de l'angle a0 à a1 (points [x, z, g, d])
function arcDe(cx, cz, r, a0, a1, g, d) {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.25)), l = [];
  for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; l.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, g, d]); }
  return l;
}
// une ligne décalée de dd vers sa droite (la droite de qui roule : (-fz, fx))
function decaler(pts, dd, g, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] - (b[1] - a[1]) / l * dd, p[1] + (b[0] - a[0]) / l * dd, g, d];
  });
}
class Chemin {
  constructor(nom, pts0, o = {}) {
    this.nom = nom; this.ferme = !!o.ferme;
    const pts = o.brut ? pts0.slice() : arrondir(pts0, o.r ?? 3);
    if (this.ferme) pts.push(pts[0]);
    // un point tous les PAS mètres
    const X = [pts[0][0]], Z = [pts[0][1]], Gl = [pts[0][2]], Dr = [pts[0][3]];
    let reste = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d < 1e-6) continue;
      let l = PAS - reste;
      while (l <= d) { const u = l / d; X.push(a[0] + (b[0] - a[0]) * u); Z.push(a[1] + (b[1] - a[1]) * u); Gl.push(b[2]); Dr.push(b[3]); l += PAS; }
      reste = d - (l - PAS);
    }
    if (this.ferme && Math.hypot(X[X.length - 1] - X[0], Z[Z.length - 1] - Z[0]) < PAS * 0.6) { X.pop(); Z.pop(); Gl.pop(); Dr.pop(); }
    const n = X.length;
    this.n = n; this.L = this.ferme ? n * PAS : (n - 1) * PAS;
    this.X = Float32Array.from(X); this.Z = Float32Array.from(Z); this.G = Float32Array.from(Gl); this.D = Float32Array.from(Dr);
    this.Y = new Float32Array(n); this.H = new Float32Array(n); this.K = new Float32Array(n); this.P = new Float32Array(n); this.V = new Float32Array(n);
    const j = k => (this.ferme ? (k + n) % n : Math.max(0, Math.min(n - 1, k)));
    for (let i = 0; i < n; i++) { this.Y[i] = sol(X[i], Z[i]); this.H[i] = Math.atan2(X[j(i + 1)] - X[j(i - 1)], Z[j(i + 1)] - Z[j(i - 1)]); }
    for (let i = 0; i < n; i++) {
      const a = j(i - 2), b = j(i + 2), ds = (this.ferme ? 4 : b - a) * PAS || PAS;
      this.K[i] = angle(this.H[b] - this.H[a]) / ds;
      this.P[i] = (this.Y[b] - this.Y[a]) / ds;
      this.V[i] = Math.min(13, Math.sqrt(2.0 / Math.max(Math.abs(this.K[i]), 1e-4)));
    }
    this.evts = (o.evts || []).map(([x, z, genre, duree]) => ({ s: this.projeter(x, z), genre, duree: duree || 0, x, z })).sort((a, b) => a.s - b.s);
  }
  // l'abscisse du point de la ligne le plus proche de (x, z) (à portee mètres de s0, si s0 est donné)
  projeter(x, z, s0, portee = 1e9) {
    let best = 0, dmin = Infinity;
    for (let i = 0; i < this.n; i++) {
      if (s0 !== undefined && Math.abs(this.ecartS(s0, i * PAS)) > portee) continue;
      const d = (this.X[i] - x) ** 2 + (this.Z[i] - z) ** 2;
      if (d < dmin) { dmin = d; best = i; }
    }
    return best * PAS;
  }
  // l'abscisse ramenée sur le chemin (une boucle : modulo sa longueur)
  ramener(s) { return this.ferme ? ((s % this.L) + this.L) % this.L : borne(s, 0, this.L); }
  // de combien b est devant a (une boucle : entre -L/2 et L/2)
  ecartS(a, b) { let d = b - a; if (this.ferme) { d = ((d % this.L) + this.L) % this.L; if (d > this.L / 2) d -= this.L; } return d; }
  // l'indice du point juste avant s
  indice(s) { const i = Math.floor(s / PAS); return this.ferme ? ((i % this.n) + this.n) % this.n : Math.max(0, Math.min(this.n - 2, i)); }
  suivant(i) { return this.ferme ? (i + 1) % this.n : Math.min(this.n - 1, i + 1); }
  // le point du chemin en s : O.x, O.z, O.h (cap), O.g, O.d (écarts permis), O.i (indice)
  point(s, O) {
    const i = this.indice(s), k = this.suivant(i), f = borne(s / PAS - Math.floor(s / PAS), 0, 1);
    O.x = this.X[i] + (this.X[k] - this.X[i]) * f; O.z = this.Z[i] + (this.Z[k] - this.Z[i]) * f;
    O.h = this.H[i] + angle(this.H[k] - this.H[i]) * f; O.g = this.G[i]; O.d = this.D[i]; O.i = i;
    return O;
  }
}

// Les chemins : la départementale dans les deux sens (au bord droit), la route du château (on monte, le tour, on redescend,
// le stop d'en bas), le bourg (la départementale, à gauche dans la rue de la place, la boucle autour de la place, on
// redescend, le stop, à gauche sur la départementale), autour de la fontaine de la place (un enfant et sa mère), le chemin
// des Grands Champs (un VTT, demi-tour au bout sur l'herbe).
function chemins() {
  const E = 12.55, O = 7.45; // le bord droit de la départementale vers l'est, vers l'ouest (juste en dedans de la ligne de rive)
  const C = {};
  C.est = new Chemin('est', [[-335, E, 4.3, 0.45], [335, E, 4.3, 0.45]]);
  C.ouest = new Chemin('ouest', [[335, O, 4.3, 0.45], [-335, O, 4.3, 0.45]]);
  // la route du château : 2,3 m à droite de l'axe (la route fait 6 m), le tour par son bord extérieur
  {
    const R = ROUTE, CH = CHATEAU, voie = 2.3;
    let iFin = R.n - 1;
    while (iFin > 0 && Math.hypot(R.x[iFin] - CH.x, R.z[iFin] - CH.z) < CH.tour + 3.2) iFin--;
    let i0 = 0; while (i0 < R.n - 1 && R.z[i0] > 3.0) i0++;
    const cote = (i, s) => {
      const a = Math.max(0, i - 2), b = Math.min(R.n - 1, i + 2), l = Math.hypot(R.x[b] - R.x[a], R.z[b] - R.z[a]) || 1;
      const fx = (R.x[b] - R.x[a]) / l, fz = (R.z[b] - R.z[a]) / l;
      return [R.x[i] - fz * voie * s, R.z[i] + fx * voie * s, 4.4, 0.45];
    };
    const monte = [], descend = [];
    for (let i = i0; i <= iFin; i += 3) monte.push(cote(i, 1));
    for (let i = iFin; i >= i0; i -= 3) descend.push(cote(i, -1));
    const jA = Math.atan2(R.z[iFin] - CH.z, R.x[iFin] - CH.x), rv = CH.tour + 2.3, tour = [];
    for (let k = 0, nT = 40; k <= nT; k++) { const a = jA - 0.2 - k / nT * (TAU - 0.4); tour.push([CH.x + Math.cos(a) * rv, CH.z + Math.sin(a) * rv, 3.5, 0.45]); }
    const bas = descend[descend.length - 1];
    C.chateau = new Chemin('chateau', [[-120, O, 4.3, 0.45], [monte[0][0], O, 4.3, 0.45, 2.4], ...monte, ...tour, ...descend, [bas[0], O, 4.3, 0.45, 2.4], [-335, O, 4.3, 0.45]], {
      evts: [[bas[0], bas[1] + 1.4, 'stop']],
    });
  }
  // le bourg
  {
    const boucle = decaler([[95, -30], [86, -40], [78, -46], [81.5, -56], [88, -53.5], [100.5, -53], [101, -40], [96, -27]], 0.9, 1.6, 1.0);
    C.bourg = new Chemin('bourg', [[-60, E, 4.3, 0.45], [96.6, E, 4.3, 0.45, 3.5], [96.6, -24, 2.8, 0.6], ...boucle, [93.4, -22, 2.8, 0.6], [93.4, E, 2.8, 0.6, 3.5], [335, E, 4.3, 0.45]], {
      evts: [[90.5, E, 'cede'], [93.4, 5.3, 'stop']],
    });
  }
  // autour de la fontaine (une boucle) ; une pause de temps en temps
  {
    const l = [];
    for (let k = 0; k < 40; k++) { const a = k / 40 * TAU; l.push([95 + Math.cos(a) * 4.5, -46 + Math.sin(a) * 4.5, 1.2, 0.6]); }
    C.place = new Chemin('place', l, { ferme: true, brut: true, evts: [[95, -41.5, 'pause', 7]] });
  }
  // le chemin des Grands Champs : au bord droit, demi-tour au bout (un large arc, sur l'herbe), une pause en remontant
  {
    const g = 1.6, d = 0.9;
    C.gc = new Chemin('gc', [[-55.9, 60, g, d], [-55.9, 112, g, d], [-56.8, 117.4, g, d], ...arcDe(-55, 120.4, 2.3, Math.PI, 0, g, d), [-53.2, 117.4, g, d], [-54.1, 112, g, d],
      [-54.1, 27, g, d], [-53.2, 22.6, g, d], ...arcDe(-55, 19.8, 2.3, 0, -Math.PI, g, d), [-56.8, 22.6, g, d], [-55.9, 27, g, d], [-55.9, 59.5, g, d]], {
      ferme: true, r: 2, evts: [[-54.1, 72, 'pause', 6]],
    });
  }
  return C;
}

/* ---------------------------------------------------------------- qui roule
   Chacun : son chemin, sa place au départ (s0), son genre de vélo et sa couleur, sa vitesse sur le plat, ses heures (en
   minutes depuis minuit), ce qu'il porte (perso.js ; chapeau 'casque' : le casque est ajouté ici, sur la tête), son panier ;
   lumiere : il roule encore le soir, phare allumé ; suit : il suit celui-là (la mère derrière son enfant). En décembre :
   vestes matelassées, bonnets, coupe-vent et manches longues. */
const DEFS = [
  { chemin: 'est', s0: 30, genre: 'course', couleur: '#c0392b', vc: 8.2, h: [420, 1155], casque: '#f2f0ea',
    p: { peau: '#e0ac69', cheveux: '#2b1d0e', coiffure: 'court', barbe: false, tenue: 'gilet', haut: '#1f2a44', manches: '#e84e1b', bas: '#1b1c1f', chaussures: '#1b1c1f', lunettes: true, taille: 1.0, corpulence: 0.9 } },
  { chemin: 'est', s0: 300, genre: 'ville', couleur: '#2f5d50', vc: 4.4, h: [450, 1230], lumiere: true, panier: 'baguette',
    p: { femme: true, peau: '#f1c27d', cheveux: '#6b4423', coiffure: 'carre', tenue: 'veste', matelasse: true, haut: '#7a2233', col: '#5a1626', bas: '#2c3e50', chapeau: 'bonnet', chapeauC: '#e9e1cf', taille: 0.95 } },
  { chemin: 'ouest', s0: 150, genre: 'vae', couleur: '#f2efe6', vc: 6.0, h: [420, 1290], lumiere: true, casque: '#5d6b72', sacoche: '#7a2233',
    p: { peau: '#ffdbac', cheveux: '#c9c9c9', coiffure: 'chauve', barbe: true, tenue: 'veste', matelasse: true, haut: '#2f4a6b', bas: '#5d4037', lunettes: true, taille: 0.98, corpulence: 1.1 } },
  { chemin: 'ouest', s0: 470, genre: 'course', couleur: '#1f1f24', vc: 7.6, h: [480, 1125], casque: '#1f1f24', guidoline: '#16a085',
    p: { femme: true, peau: '#c68642', cheveux: '#151515', coiffure: 'queue', tenue: 'gilet', haut: '#16a085', manches: '#f2efe6', bas: '#1b1c1f', chaussures: '#f2efe6', lunettes: true, taille: 0.97 } },
  { chemin: 'chateau', s0: 260, genre: 'course', couleur: '#2e86de', vc: 7.4, h: [480, 1110], casque: '#c0392b', bidon: '#f1c40f',
    p: { peau: '#e8b896', cheveux: '#b55239', coiffure: 'court', barbe: true, tenue: 'pull', haut: '#f1c40f', bas: '#1b1c1f', chaussures: '#1b1c1f', taille: 1.02, corpulence: 0.88 } },
  { chemin: 'chateau', s0: 820, genre: 'vae', couleur: '#5d6b72', vc: 5.6, h: [540, 1080], casque: '#e9e6de', sacoche: '#2f5d50',
    p: { femme: true, peau: '#ffdbac', cheveux: '#d9c08c', coiffure: 'queue', tenue: 'veste', matelasse: true, haut: '#c8553d', bas: '#34495e', taille: 0.94 } },
  { chemin: 'bourg', s0: 110, genre: 'ville', couleur: '#8e2a3b', vc: 4.1, h: [450, 1170], lumiere: true, panier: 'poireaux', selle2: '#563a28',
    p: { peau: '#e0ac69', cheveux: '#9a9a9a', coiffure: 'court', barbe: true, tenue: 'veste', matelasse: true, haut: '#6d4c41', bas: '#2c3e50', chapeau: 'beret', chapeauC: '#1f2a44', taille: 0.97, corpulence: 1.05 } },
  { chemin: 'bourg', s0: 420, genre: 'vtt', couleur: '#e84e1b', vc: 5.0, h: [480, 1140], casque: '#202428',
    p: { peau: '#8d5524', cheveux: '#151515', coiffure: 'court', tenue: 'pull', haut: '#27ae60', bas: '#34495e', chaussures: '#e9e6de', taille: 0.9, corpulence: 0.86 } },
  { chemin: 'place', s0: 6, genre: 'enfant', couleur: '#e84393', vc: 2.3, h: [540, 1110], casque: '#f1c40f',
    p: { peau: '#f1c27d', cheveux: '#6b4423', coiffure: 'queue', femme: true, tenue: 'veste', matelasse: true, haut: '#2e86de', bas: '#34495e', chaussures: '#e84393', taille: 0.62, corpulence: 0.9 } },
  { chemin: 'place', s0: 0.5, genre: 'ville', couleur: '#e9e1cf', vc: 2.5, h: [540, 1110], suit: 8, panier: 'fleurs', casque: '#2a3e5c',
    p: { femme: true, peau: '#f1c27d', cheveux: '#2b1d0e', coiffure: 'chignon', tenue: 'veste', matelasse: true, haut: '#2a3e5c', bas: '#3b3b42', taille: 0.95 } },
  { chemin: 'gc', s0: 20, genre: 'vtt', couleur: '#3a4a2a', vc: 5.2, h: [480, 1080], casque: '#e84e1b',
    p: { peau: '#d4a373', cheveux: '#3f2a1c', coiffure: 'court', barbe: true, tenue: 'gilet', haut: '#3a4a2a', manches: '#d35400', bas: '#202428', chaussures: '#3b3b42', taille: 1.03 } },
];

// Le casque, posé sur l'os de la tête d'un personnage (repère de la tête : perso.js, le crâne centré en (0, 0,2, 0,017)) :
// une coque à aérations, la jugulaire ; une visière pour le VTT
const geoCasques = new Map();
function casque(couleur, visiere) {
  const cle = couleur + visiere;
  if (geoCasques.has(cle)) return geoCasques.get(cle);
  const at = new Atelier(), c = [0, 0.214, 0.0], rx = 0.112, ry = 0.112, rz = 0.142, nL = 14, nH = 5;
  const P = (a, b) => [c[0] + Math.sin(a) * Math.cos(b) * rx, c[1] + Math.sin(b) * ry, c[2] + Math.cos(a) * Math.cos(b) * rz * (Math.cos(a) < 0 ? 1.08 : 1)];
  for (let i = 0; i < nL; i++) for (let j = 0; j < nH; j++) {
    const a0 = i / nL * TAU, a1 = (i + 1) / nL * TAU, b0 = -0.18 + j / nH * (Math.PI / 2 + 0.18), b1 = -0.18 + (j + 1) / nH * (Math.PI / 2 + 0.18);
    const fente = j >= 2 && j < 4 && i % 2 === 0 && Math.abs(Math.sin((a0 + a1) / 2)) < 0.8; // les aérations, en long
    const p = [P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)], m = plus(moins(entre3(p[0], p[2], 0.5), c), [0, 0, 0]);
    at.quad(p[0], p[1], p[2], p[3], fente ? '#1d1e21' : couleur, fente ? 0 : T.carrosserie, m);
  }
  // le bord, plus sombre, et la jugulaire
  for (let i = 0; i < nL; i++) { const a0 = i / nL * TAU, a1 = (i + 1) / nL * TAU, q0 = P(a0, -0.18), q1 = P(a1, -0.18); at.quad(q0, q1, plus(q1, [0, -0.012, 0]), plus(q0, [0, -0.012, 0]), '#1d1e21', 0, moins(q0, c)); }
  for (const s of [1, -1]) tube(at, [s * 0.095, 0.17, 0.0], [s * 0.03, 0.06, 0.06], 0.004, 3, '#1d1e21', 0);
  if (visiere) at.quad([-0.08, 0.255, 0.13], [0.08, 0.255, 0.13], [0.07, 0.245, 0.175], [-0.07, 0.245, 0.175], '#1d1e21', 0, [0, 1, 0.3]);
  const g = compacter(indexer(fusion(at.geos()), true));
  geoCasques.set(cle, g);
  return g;
}

// temporaires partagés (aucune allocation par image)
const PT = { x: 0, z: 0, h: 0, g: 0, d: 0, i: 0 }, PT2 = { x: 0, z: 0, h: 0, g: 0, d: 0, i: 0 }, SONDE = { x: 0, z: 0 };
const qDir = new THREE.Quaternion(), vA = new THREE.Vector3(), AXE = new THREE.Vector3(), mInv = new THREE.Matrix4();
const ETATS_PIED = { saute: 1, terre: 1, va: 1, releve: 1 };

class Cycliste {
  constructor(V, def, i) {
    this.V = V; this.def = def; this.i = i; this.genre = def.genre; this.G = GENRES[def.genre]; this.ch = null; // (son chemin : à la première mise à jour)
    this.s = def.s0; this.v = def.vc * 0.8; this.vc = def.vc; this.dec = 0; this.decV = 0; this.decPlan = 0; this.pente = 0;
    // pour les voitures et le véhicule du joueur : un obstacle étroit (vehicules.js : cercles, deux cercles le long de l'axe)
    this.x = 1e5; this.y = 0; this.z = 1e5; this.h = 0; this.ax = 0; this.az = 1; this.velo = true; this.r = 0.45; this.demi = 0.95; this.dc = 0.48; this.rc = 0.36;
    this.actif = false; this.present = false; this.etat = 'roule'; this.fin = false;
    this.incl = 0; this.inclV = 0; this.braq = 0; this.roue = 0; this.mani = Math.random() * TAU; this.dan = 0; this.pied = 0; this.arretT = 0; this.cadence = 0;
    this.om = 0; this.hPrec = null; this.selleE = 0.1; this.contour = null; this.cede = 0; this.tSonne = 0; this.tDit = 0; this.danger = false; this.decDanger = 0; this.bloqueT = 0;
    this.evt = null; this.evtFait = null; this.attente = 0; this.regarde = 0; this.tours = 0; this.sautePause = false; this.roueLibre = false;
    this.m = null; this.p = null; this.casque = null; this.dtA = 0; this.vu = false; this.attendu = false; this.attenduP = false;
    this.sx = 0; this.sz = 0; this.svx = 0; this.svz = 0; this.tE = 0; this.chute = 0; this.cote = 1; this.source = null; this.outil = null; // (à pied : le vélo couché)
    this.sauts = 0; this.touches = 0; // (essais : combien de fois il a sauté ; touché par un véhicule, ce qui ne doit pas arriver)
    this.cri = V.c.hud.etiquette('', 'bulle');
    this.regard = new THREE.Vector3(); this.Vp = new Float64Array(VL.N); // (la pose demandée au personnage : anim.js, poseVelo)
    this.lampe = null;
  }

  // le modèle : le vélo (un maillage à peau), puis le cycliste (une image plus tard), son casque, ses feux
  construireVelo() {
    const d = this.def, V = this.V;
    const v = veloRoulant(this.genre, d.couleur, { panier: d.panier, lumiere: d.lumiere, sacoche: d.sacoche, bidon: d.bidon, guidoline: d.guidoline, selle2: d.selle2 });
    const groupe = new THREE.Group(), incline = new THREE.Group();
    groupe.rotation.order = 'YXZ'; groupe.add(incline); incline.add(v.mesh);
    groupe.visible = false; groupe.name = 'vélo';
    V.c.scene.add(groupe);
    this.m = { groupe, incline, mesh: v.mesh, os: v.os, D: v.D };
    // les feux, la nuit (engins.js : les glaces des phares, leur halo ; une flaque de lumière devant)
    if (d.lumiere) {
      const M = matieresPhares(), D = v.D, G = [];
      const disque2 = (p, r, coul, sz) => { const g = new THREE.CircleGeometry(r, 10); if (sz < 0) g.rotateY(Math.PI); g.translate(p[0], p[1], p[2]); G.push(teinter(g, coul)); };
      // le phare suit la direction : dans le repère de son os
      const os = v.os[1]; os.updateMatrix(); mInv.copy(os.matrix).invert();
      vA.set(D.lampe[0], D.lampe[1], D.lampe[2] + 0.06).applyMatrix4(mInv);
      const gAv = []; { const g = new THREE.CircleGeometry(0.03, 10); g.translate(vA.x, vA.y, vA.z); gAv.push(teinter(g, '#fff6e2')); const h = new THREE.CircleGeometry(0.13, 10); h.translate(vA.x, vA.y, vA.z - 0.005); gAv.push(teinter(h, '#2e2a24')); }
      const av = new THREE.Mesh(fusion(gAv), M.glaces); av.renderOrder = 5; os.add(av);
      disque2([D.feu[0], D.feu[1], D.feu[2] - 0.02], 0.025, '#ff2a1a', -1); disque2([D.feu[0], D.feu[1], D.feu[2] - 0.025], 0.09, '#3a0a06', -1);
      const ar = new THREE.Mesh(fusion(G), M.glaces); ar.renderOrder = 5; incline.add(ar);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4.5).rotateX(-Math.PI / 2).translate(0, 0.05, D.F[2] + 2.5), M.flaque); fl.renderOrder = 4;
      groupe.add(fl);
      this.lampe = { av, ar, fl }; av.visible = ar.visible = fl.visible = false;
    }
  }
  construireCycliste() {
    const d = this.def, V = this.V, o = { ...d.p };
    if (d.casque) o.chapeau = 'casque'; // (perso.js ne dessine rien : le casque est ajouté sur l'os de la tête)
    const p = new Pieton(perso(o));
    p.assis = true; p.velo = this.Vp; p.m.maillage.castShadow = false;
    this.m.incline.add(p.m.groupe);
    if (d.casque) { const k = new THREE.Mesh(casque(d.casque, this.genre === 'vtt'), MAT); k.castShadow = false; p.m.os[OS.tete].add(k); this.casque = k; }
    this.p = p;
    this.reglerSelle();
  }
  // la selle à la hauteur de ses jambes : à la pédale du bas, le genou encore un peu plié (95 % de la jambe)
  reglerSelle() {
    const D = this.m.D, s = this.p.m.echelle, jambe = (DIM.cuisse + DIM.tibia) * s * 0.95, CH = DIM.cheville * s, Lb = 0.11 * s, pt = 0.36;
    const cheville = [D.xp, D.BB[1] - D.mani + 0.016 + CH * Math.cos(pt) + Lb * Math.sin(pt), D.BB[2] + CH * Math.sin(pt) - Lb * Math.cos(pt)];
    let a = -0.08, b = 0.42;
    for (let k = 0; k < 24; k++) {
      const e = (a + b) / 2, sel = plus(D.selle, D.dS, e), hanche = [this.p.m.dim.xh * s, sel[1] + 0.05 * s, sel[2] - 0.035 * s];
      if (Math.hypot(hanche[0] - cheville[0], hanche[1] - cheville[1], hanche[2] - cheville[2]) > jambe) b = e; else a = e;
    }
    this.selleE = (a + b) / 2;
  }

  // vu de la caméra : devant elle, à moins de 75 m (on n'apparaît ni ne disparaît sous les yeux)
  vuDe(cam, dirX, dirZ) {
    const dx = this.x - cam.x, dz = this.z - cam.z, d = Math.hypot(dx, dz);
    if (d > 75) return false;
    if (d < 8) return true;
    return (dx * dirX + dz * dirZ) / d > 0.3;
  }
}

/* ---------------------------------------------------------------- les cyclistes
   Velos(c) : c = { scene, camera, hud, col, son }. maj(dt, E) à chaque image (main.js : bourg), E = { t, minutes, ego, joueur
   (à pied, ou null), conduit (le véhicule conduit : Tracteur, ou null), vehicules (ceux du joueur), remorque, voitures (de
   la départementale), autres (du château), passants (des Pieton), pousser(p, r) (hors des véhicules du joueur), wtf }.
   Ils roulent toujours (un point sur un chemin) ; de près, ils voient ce qui les gêne. Créés quand la caméra approche
   (le vélo, puis le cycliste, une image chacun), animés de près, une image sur trois plus loin, cachés au-delà de 190 m.
   Comportement : la vitesse du plat, moins vite en montée (en danseuse, par moments, sur un vélo de course ou un VTT),
   roue libre en descente ; ralentir dans les virages ; suivre ce qui roule devant ; s'arrêter et regarder au stop, laisser
   passer ceux d'en face avant de tourner à gauche ; devant un obstacle (le joueur, un passant, un véhicule arrêté), freiner,
   sonner, mettre pied à terre, le contourner s'il y a la place (et que rien n'arrive en face) ; un véhicule du joueur
   derrière lui ou en face sur un chemin étroit : il se range ; lancé sur lui : il s'écarte vite, et en dernier recours
   saute de côté, le vélo couché par terre, le relève en râlant et repart. Personne n'est jamais blessé, ni aplati (même en
   mode WTF). */
export class Velos {
  constructor(c) {
    this.c = c; this.ch = null; // (les chemins : à la première mise à jour, après la première image)
    this.liste = DEFS.map((d, i) => new Cycliste(this, d, i));
    this.n = 0; this.file = []; this.tRoue = 0; this.sonnettes = 0;
    // le premier vélo, tout de suite (caché) : la matière des vélos (une peau) est compilée avec les autres au démarrage
    this.liste[0].construireVelo();
    this.obs = []; for (let k = 0; k < 96; k++) this.obs.push({ x: 0, z: 0, r: 0, vx: 0, vz: 0, joueur: false, vehJ: false, auto: false, cyc: null, ref: null });
    this.nObs = 0;
  }
  get cyclistes() { return this.liste; }
  // un obstacle de plus pour cette image (réserve réutilisée)
  ajout(x, z, r, vx, vz, joueur, vehJ, auto, cyc, ref) {
    if (this.nObs >= this.obs.length) return;
    const o = this.obs[this.nObs++];
    o.x = x; o.z = z; o.r = r; o.vx = vx; o.vz = vz; o.joueur = joueur; o.vehJ = vehJ; o.auto = auto; o.cyc = cyc; o.ref = ref;
  }
  // ce qui peut gêner les cyclistes, cette image : le joueur à pied, les véhicules du joueur et la remorque (deux cercles),
  // les voitures (deux cercles), les passants, les autres cyclistes
  recenser(E) {
    this.nObs = 0;
    if (E.joueur) { const j = E.joueur; this.ajout(j.pos.x, j.pos.z, 0.38, Math.sin(j.h) * j.v, Math.cos(j.h) * j.v, true, false, false, null, j); }
    for (const v of E.vehicules) {
      const p = v.p, fx = Math.sin(p.h), fz = Math.cos(p.h);
      for (const off of p.d.off) this.ajout(p.pos.x + fx * off, p.pos.z + fz * off, p.d.r, fx * p.v, fz * p.v, false, true, false, null, p);
    }
    if (E.remorque && E.remorque.r.groupe.visible) {
      const a = E.remorque, fx = Math.sin(a.h), fz = Math.cos(a.h);
      for (const off of a.d.off) this.ajout(a.pos.x + fx * off, a.pos.z + fz * off, a.d.r, fx * a.v, fz * a.v, false, true, false, null, a);
    }
    for (const v of E.voitures) for (let k = -1; k <= 1; k += 2) this.ajout(v.x + k * 1.1 * v.sens, v.z, 1.0, v.sens * v.v, 0, false, false, true, null, v);
    for (const v of E.autres) for (let k = -1; k <= 1; k += 2) this.ajout(v.x + k * 1.1 * v.ax, v.z + k * 1.1 * v.az, 1.0, v.ax * v.v, v.az * v.v, false, false, true, null, v);
    for (const p of E.passants) if (p.m.groupe.visible) this.ajout(p.pos.x, p.pos.z, 0.36, Math.sin(p.h) * p.v, Math.cos(p.h) * p.v, false, false, false, null, p);
    for (const c of this.liste) if (c.actif) this.ajout(c.etat === 'roule' ? c.x : c.sx, c.etat === 'roule' ? c.z : c.sz, 0.42, c.ax * c.v, c.az * c.v, false, false, false, c, c);
  }

  maj(dt, E) {
    if (!this.ch) { this.ch = chemins(); for (const c of this.liste) c.ch = this.ch[c.def.chemin]; }
    const cam = this.c.camera.position, dir = this.c.camera.getWorldDirection(vA), dl = Math.hypot(dir.x, dir.z) || 1, dX = dir.x / dl, dZ = dir.z / dl;
    const m = ((E.minutes % 1440) + 1440) % 1440, nuit = UNI.uNuit.value > 0.15;
    this.n++;
    this.recenser(E);
    // une création par image : le vélo, puis le cycliste
    if (this.file.length) { const f = this.file.shift(); f(); }
    this.E = E;
    for (const c of this.liste) {
      const d = c.def, voulu = m >= d.h[0] && m < d.h[1];
      // ils arrivent et partent hors de la vue, et loin du joueur (là où ils en sont de leur chemin)
      if (voulu !== c.present) {
        if (voulu) this.placer(c);
        const de0 = Math.hypot(c.x - E.ego.x, c.z - E.ego.z);
        if (!c.vuDe(cam, dX, dZ) && de0 > 30 && c.etat === 'roule') {
          c.present = c.actif = voulu;
          if (!voulu) { c.x = c.z = c.sx = c.sz = 1e5; if (c.m) c.m.groupe.visible = false; c.vu = false; c.cri.vu = false; }
        } else if (voulu) { c.x = c.z = 1e5; }
      }
      if (!c.actif) continue;
      const dc = Math.hypot(c.x - cam.x, c.z - cam.z), de = Math.hypot(c.x - E.ego.x, c.z - E.ego.z);
      const proche = dc < 150 || de < 60;
      if (c.etat === 'roule') this.rouler(c, dt, E, proche);
      else this.aPied(c, dt, E);
      // le bout d'un chemin ouvert : on recommence au début quand personne ne regarde
      if (c.fin && !c.vuDe(cam, dX, dZ) && de > 40) { c.s = 0; c.fin = false; c.contour = null; c.evtFait = null; this.placer(c); }
      // le modèle : créé en approchant, montré de près
      const voir = dc < (c.vu ? 190 : 170) && c.present;
      if (voir && !c.m && !c.attendu) { c.attendu = true; this.file.push(() => c.construireVelo()); }
      if (voir && c.m && !c.p && !c.attenduP) { c.attenduP = true; this.file.push(() => c.construireCycliste()); }
      const pret = voir && !!c.m && !!c.p;
      if (pret !== c.vu) { c.vu = pret; if (c.m) c.m.groupe.visible = pret; if (c.p && ETATS_PIED[c.etat]) c.p.m.groupe.visible = pret; }
      if (c.lampe) { const on = nuit && pret && c.etat === 'roule'; if (c.lampe.av.visible !== on) c.lampe.av.visible = c.lampe.ar.visible = c.lampe.fl.visible = on; }
      if (!pret) continue;
      // animé de près à chaque image, une image sur trois plus loin ; plus du tout quand il n'est plus dessiné (taches :
      // au-delà de la distance des personnages du palier, le cycliste et son vélo disparaissent ensemble)
      c.dtA += dt;
      if (dc > 60 && ((this.n + c.i) % 3 || (c.etat === 'roule' && !c.m.mesh.visible))) continue;
      const dtA = c.dtA; c.dtA = 0;
      this.dessiner(c, dtA, E.t, dc);
      if (c.cri.vu) this.c.hud.placer(c.cri, ETATS_PIED[c.etat] ? c.p.pos.x : c.x, (ETATS_PIED[c.etat] ? c.p.pos.y : c.y) + (c.genre === 'enfant' ? 1.6 : 2.25), ETATS_PIED[c.etat] ? c.p.pos.z : c.z, true);
    }
    // la roue libre qui cliquette, du cycliste le plus proche qui ne pédale pas
    if ((this.tRoue -= dt) <= 0) {
      this.tRoue = 0.22;
      let best = null, dmin = 14;
      for (const c of this.liste) if (c.actif && c.etat === 'roule' && c.roueLibre && c.v > 1.5) { const d = Math.hypot(c.x - E.ego.x, c.z - E.ego.z); if (d < dmin) { dmin = d; best = c; } }
      if (best) this.c.son.roueLibre(1 - dmin / 14, best.v);
    }
  }

  // posé à sa place sur son chemin (au départ, ou là où il en était), sur sa ligne
  placer(c) {
    c.etat = 'roule'; c.dec = 0; c.decV = 0; c.contour = null; c.v = Math.min(c.vc, 3); c.hPrec = null; c.pied = 0; c.chute = 0;
    const ch = c.ch;
    ch.point(c.s, PT);
    c.x = PT.x; c.z = PT.z; c.y = sol(PT.x, PT.z); c.h = PT.h; c.ax = Math.sin(PT.h); c.az = Math.cos(PT.h);
  }

  // un pas de route
  rouler(c, dt, E, proche) {
    const ch = c.ch, def = c.def;
    ch.point(c.s, PT);
    const i = PT.i, tx = Math.sin(PT.h), tz = Math.cos(PT.h), nx = tz, nz = -tx; // (la gauche de qui roule)
    const pente = ch.P[i];
    // la vitesse voulue : celle du plat, moins en montée (le vélo électrique aide), plus en descente ; les virages devant
    let vc = c.vc;
    if (pente > 0.005) vc /= 1 + pente * (c.genre === 'vae' ? 2.5 : 7.5);
    else if (pente < -0.02) vc = Math.min(c.genre === 'course' ? 12 : 9, vc * (1 - pente * 5));
    for (let k = 2; k <= 40; k += 2) { const j = ch.ferme ? (i + k) % ch.n : Math.min(ch.n - 1, i + k); vc = Math.min(vc, Math.sqrt(ch.V[j] * ch.V[j] + 2 * 1.6 * k * PAS)); }
    let frein = 2.6, decPlan = 0, latMax = 0.6 + 0.12 * c.v;
    // l'événement suivant du chemin (stop, cède le passage, pause)
    let evt = null, de = 1e9;
    for (const e of ch.evts) { const d = ch.ecartS(c.s, e.s); if (d > -1.5 && d < de && d < 40) { de = d; evt = e; } }
    if (evt !== c.evt) { c.evt = evt; c.attente = 0; c.regarde = 0; c.evtFait = null; if (evt && evt.genre === 'pause') c.sautePause = c.tours++ % 2 === 1; }
    // (déjà passé la ligne : rien à attendre)
    if (evt && evt !== c.evtFait && de < -0.4) c.evtFait = evt;
    if (evt && evt !== c.evtFait && proche && !(evt.genre === 'pause' && def.suit)) {
      let doit = true;
      if (evt.genre === 'cede') doit = !this.voieLibre(evt, c, E, true);
      if (evt.genre === 'pause' && c.sautePause) doit = false;
      if (doit) {
        vc = Math.min(vc, Math.sqrt(2 * 2.0 * Math.max(0, de - 0.2)));
        if (de < 0.8 && c.v < 0.35) {
          c.attente += dt;
          const assez = evt.genre === 'pause' ? c.attente > (evt.duree * (0.7 + 0.6 * ((c.i * 7 + c.tours) % 5) / 5)) : c.attente > 1.3;
          if (assez && (evt.genre === 'pause' || this.voieLibre(evt, c, E, evt.genre === 'cede'))) c.evtFait = evt;
        }
      } else c.evtFait = evt;
      if (evt.genre === 'stop' || evt.genre === 'cede') c.regarde = de < 6 ? c.regarde + dt : 0;
    }
    // le suiveur (la mère derrière son enfant) : la même vitesse, à sa distance
    if (def.suit) {
      const t = this.liste[c.i - 1];
      if (t.actif) { const d = ch.ecartS(c.s, t.s) - def.suit; vc = Math.min(vc, Math.max(0, t.v + d * 0.6)); if (d < -def.suit * 0.5) vc = 0; }
    }
    // ce qui gêne, devant
    if (proche) {
      let bloque = null, gapB = 1e9, laB = 0;
      decPlan = c.contour ? c.contour.dec : 0;
      for (let k = 0; k < this.nObs; k++) {
        const o = this.obs[k];
        if (o.cyc === c) continue;
        const rx = o.x - c.x, rz = o.z - c.z;
        if (rx > 32 || rx < -32 || rz > 32 || rz < -32) continue;
        const lo = rx * tx + rz * tz, la = rx * nx + rz * nz + c.dec;
        if (lo < -0.6 || lo > 30) continue;
        if (Math.abs(la - decPlan) > o.r + 0.42) continue;
        const vlo = o.vx * tx + o.vz * tz, gap = lo - o.r - 0.9;
        if (vlo > 0.6) vc = Math.min(vc, Math.max(0, vlo + (gap - 2.2) * 0.7)); // il roule devant : on le suit
        else {
          vc = Math.min(vc, Math.sqrt(2 * 2.6 * Math.max(0, gap - 0.7)));
          if (gap < 3) frein = 5;
          if (gap < gapB) { gapB = gap; bloque = o; laB = la; }
        }
      }
      if (c.contour && ch.ecartS(c.s, c.contour.fin) < 0) c.contour = null;
      // un obstacle arrêté devant : on sonne (le joueur, un passant). Quelqu'un à pied : on s'arrête, pied à terre, on
      // attend un peu qu'il s'écarte, puis on le contourne s'il y a la place ; un véhicule arrêté : on le contourne.
      const pieton = !!bloque && (bloque.joueur || bloque.ref instanceof Pieton);
      c.bloqueT = pieton && gapB < 3 && c.v < 0.25 ? (c.bloqueT || 0) + dt : bloque ? (c.bloqueT || 0) : 0;
      if (bloque) {
        if (gapB < 9 && (pieton || bloque.vehJ) && c.tSonne <= 0 && Math.hypot(c.x - E.ego.x, c.z - E.ego.z) < 45) { this.sonner(c); c.tSonne = 4.5 + (c.i % 3); }
        if (gapB < 12 && !c.contour && (!pieton || c.bloqueT > 1.8)) this.contourner(c, bloque, laB, gapB, PT);
      }
      // un véhicule du joueur, derrière dans le même sens ou en face sur un chemin étroit : on se range ; lancé sur lui :
      // on s'écarte vite, et en dernier recours, on saute
      const r = this.vehicule(c, E, tx, tz, nx, nz, dt);
      if (r === 'saute') return;
      if (c.cede > 0) { decPlan = Math.min(decPlan, -PT.d); vc = Math.min(vc, c.cede > 1 ? 0 : 2.2); }
      if (c.danger) { decPlan = c.decDanger; latMax = 2.6; frein = 5; vc = Math.min(vc, 1.6); }
      c.decPlan = decPlan;
    } else { c.contour = null; c.cede = 0; c.danger = false; c.decPlan = 0; }
    c.tSonne -= dt; c.tDit -= dt;
    // la vitesse : on accélère doucement, on freine plus fort
    const acc = c.genre === 'vae' ? 1.2 : c.genre === 'enfant' ? 0.7 : 0.95;
    const dv = vc - c.v;
    c.v += borne(dv, -frein * dt, acc * dt);
    if (c.v < 0.02 && vc < 0.05) c.v = 0;
    // de côté : vers la ligne prévue, à la vitesse d'un vélo qui se déporte
    const lim = Math.min(PT.g + (c.danger ? 1.2 : 0), 5), limD = PT.d + (c.danger || c.cede ? 1.1 : 0);
    const dCible = borne(c.decPlan, -limD, lim);
    const vLat = borne((dCible - c.dec) * 1.6, -latMax, latMax) * (c.v > 0.15 || c.danger ? 1 : 0);
    c.decV += (vLat - c.decV) * amortir(dt, 6);
    c.dec += c.decV * dt;
    // on avance
    c.s += c.v * dt;
    if (ch.ferme) c.s = ch.ramener(c.s);
    else if (c.s >= ch.L - 0.5) { c.s = ch.L - 0.5; c.v = 0; c.fin = true; }
    ch.point(c.s, PT);
    const nX = Math.cos(PT.h), nZ = -Math.sin(PT.h);
    c.x = PT.x + nX * c.dec; c.z = PT.z + nZ * c.dec; c.y = sol(c.x, c.z);
    c.h = PT.h + Math.atan2(c.decV, Math.max(c.v, 0.6));
    c.ax = Math.sin(c.h); c.az = Math.cos(c.h);
    // ce qu'il fait des pieds : pédaler, roue libre (descente, freinage, avant un arrêt), pied à terre à l'arrêt
    c.arretT = c.v < 0.3 ? c.arretT + dt : 0;
    c.roueLibre = c.v > 0.4 && (pente < -0.025 || dv < -0.4 || frein > 3);
    c.pente = pente;
  }

  // Un véhicule du joueur. Rend 'saute' quand le cycliste vient de sauter.
  vehicule(c, E, tx, tz, nx, nz, dt) {
    c.cede = Math.max(0, c.cede - dt); c.danger = false;
    const p = E.conduit;
    if (!p) return null;
    const vv = p.v, sg = vv < 0 ? -1 : 1, ux = Math.sin(p.h) * sg, uz = Math.cos(p.h) * sg;
    // (sa demi-largeur, d'après son emprise ; son nez, d'après ses cercles : calculés une fois)
    if (p.demiL === undefined) { p.demiL = Math.max(...p.m.dims.emprise.map(e => Math.max(-e[0], e[1]))); p.nez = Math.max(...p.d.off) + p.d.r; }
    const hw = p.demiL, av = p.nez;
    // où est le cycliste par rapport au véhicule : devant (along), de côté (cross, positif à gauche du véhicule)
    const px = c.x - p.pos.x, pz = c.z - p.pos.z, along = px * ux + pz * uz, cross = px * uz - pz * ux;
    const vrel = Math.abs(vv) - c.v * (c.ax * ux + c.az * uz);
    if (Math.abs(vv) > 2.2 && along > -1 && along < 4 + Math.abs(vv) * 1.6 && Math.abs(cross) < hw + 1.05 && vrel > 1.2) {
      const ttc = (along - av * 0.55 - 0.6) / vrel;
      // de quel côté s'écarter : celui où il est déjà par rapport au véhicule (ou, pile devant, celui qui a de la place)
      const sEsc = Math.abs(cross) > 0.25 ? Math.sign(cross) : (c.i % 2 ? 1 : -1);
      const ex = sEsc * uz, ez = -sEsc * ux; // (la gauche du véhicule : (uz, -ux))
      if (ttc < 0.75 && Math.abs(cross) < hw + 0.55) { this.sauter(c, ex, ez, p); return 'saute'; }
      // s'écarter : de quoi passer à côté du véhicule (hw + 0,9 m de son axe), le long de sa ligne
      const kN = ex * nx + ez * nz, besoin = hw + 1.0 - Math.abs(cross);
      c.danger = true;
      c.decDanger = Math.abs(kN) > 0.25 ? c.dec + Math.sign(kN) * besoin / Math.max(0.5, Math.abs(kN)) : c.dec; // (il arrive de côté : on freine sur place)
      if (c.tDit <= 0 && Math.hypot(c.x - E.ego.x, c.z - E.ego.z) < 40) { this.dire(c, REPLIQUES.attention); c.tDit = 4; this.c.son.sonnette(0.9); }
      return null;
    }
    // il vient derrière, dans le même sens (ou attend derrière) ; il arrive en face sur un chemin étroit : on se range
    const bx = p.pos.x - c.x, bz = p.pos.z - c.z, lo = bx * tx + bz * tz, la = bx * nx + bz * nz;
    const meme = Math.sin(p.h) * tx + Math.cos(p.h) * tz;
    if (lo < -1 && lo > -16 && Math.abs(la) < hw + 1.6 && meme * sg > 0.6 && Math.abs(vv) > 0.3) c.cede = Math.max(c.cede, lo > -9 && Math.abs(vv) < 1.5 ? 2 : 1);
    if (lo > 2 && lo < 24 && Math.abs(la) < hw + 1.4 && meme * sg < -0.6 && Math.abs(vv) > 0.3 && PT.g < 3) c.cede = Math.max(c.cede, lo < 11 ? 2 : 1); // (PT : là où il est, rouler)
    return null;
  }

  // la voie est-elle libre au stop (ou pour tourner à gauche : seulement ceux d'en face) ? Les voitures et le véhicule
  // du joueur à moins de 5 s, qui viennent vers le carrefour
  voieLibre(e, c, E, face) {
    for (const v of E.voitures) if (!this.passeLoin(e, c, face, v.x, v.z, v.sens * v.v, 0)) return false;
    for (const v of E.autres) if (!this.passeLoin(e, c, face, v.x, v.z, v.ax * v.v, v.az * v.v)) return false;
    const p = E.conduit;
    if (p && !this.passeLoin(e, c, face, p.pos.x, p.pos.z, Math.sin(p.h) * p.v, Math.cos(p.h) * p.v)) return false;
    return true;
  }
  // ce qui roule en (x, z) à (vx, vz) ne coupera pas le chemin au carrefour e avant 5 s (ou va ailleurs, ou roule dans notre
  // sens quand on tourne à gauche)
  passeLoin(e, c, face, x, z, vx, vz) {
    const rx = e.x - x, rz = e.z - z, d = Math.hypot(rx, rz), v = Math.hypot(vx, vz);
    if (d < 7) return false;
    if (v < 0.8 || d > 60) return true;
    if (face && (vx * c.ax + vz * c.az) / v > -0.5) return true;
    return (rx * vx + rz * vz) / (d * v) < 0.5 || d / v > 5;
  }

  // contourner un obstacle arrêté : passer à gauche ou à droite, à 75 cm de lui, si le chemin le permet, que rien d'autre
  // n'est dans le passage, que le décor est libre et que rien n'arrive en face
  contourner(c, o, la, gap, P) {
    const ch = c.ch, g = la + o.r + 0.8, dr = la - o.r - 0.8, droite = Math.abs(dr - c.dec) < Math.abs(g - c.dec);
    const tx = Math.sin(P.h), tz = Math.cos(P.h), nx = tz, nz = -tx;
    for (let essai = 0; essai < 2; essai++) {
      const d = (essai === 0) === droite ? dr : g; // (le côté le plus proche d'abord)
      if (d > P.g || d < -P.d) continue;
      let libre = true;
      for (let k = 0; k < this.nObs && libre; k++) {
        const q = this.obs[k];
        if (q === o || q.ref === o.ref || q.cyc === c) continue;
        const rx = q.x - c.x, rz = q.z - c.z, lo = rx * tx + rz * tz, la2 = rx * nx + rz * nz + c.dec;
        if (lo > gap - 4 && lo < gap + 6 && Math.abs(la2 - d) < q.r + 0.55) libre = false;
        // en face, dans la voie où l'on passe : une voiture, un véhicule qui arrive
        const vlo = q.vx * tx + q.vz * tz;
        if ((q.auto || q.vehJ) && vlo < -1 && lo > 0 && lo < 70 && Math.abs(la2 - d) < 2.4) libre = false;
      }
      for (let u = -2; u <= 3 && libre; u += 2.5) {
        ch.point(ch.ramener(c.s + gap + 1 + u), PT2);
        SONDE.x = PT2.x + Math.cos(PT2.h) * d; SONDE.z = PT2.z - Math.sin(PT2.h) * d;
        if (this.c.col.resoudre(SONDE, 0.3) || this.c.col.rangs(SONDE, 0.3, false)) libre = false;
      }
      if (libre) { c.contour = { dec: d, fin: ch.ramener(c.s + gap + o.r * 2 + 3.5) }; return true; }
    }
    return false;
  }

  sonner(c) {
    this.sonnettes++;
    const d = Math.hypot(c.x - this.E.ego.x, c.z - this.E.ego.z);
    this.c.son.sonnette(borne(1.15 - d / 40, 0, 1));
    this.dire(c, REPLIQUES.sonnette);
  }
  dire(c, l) { this.c.hud.bulle(c.cri, l[(c.i + this.n) % l.length], 2.2); }

  // Le dernier recours : il saute de côté (ex, ez : vers où), le vélo poussé du même côté glisse et se couche
  sauter(c, ex, ez, veh) {
    c.etat = 'saute'; c.tE = 0; c.sauts = (c.sauts || 0) + 1;
    c.sx = c.x; c.sz = c.z; c.svx = ex * 3.4 + c.ax * c.v * 0.5; c.svz = ez * 3.4 + c.az * c.v * 0.5;
    // (le vélo tombe du côté où il glisse : sa gauche, ou sa droite)
    c.cote = ex * Math.cos(c.h) - ez * Math.sin(c.h) >= 0 ? 1 : -1; c.inclV = 0; c.chute = 0;
    c.v = 0; c.contour = null; c.danger = false; c.cede = 0;
    c.source = veh;
    const p = c.p;
    if (p) {
      this.c.scene.add(p.m.groupe);
      p.assis = false; p.velo = null; p.outil = null;
      p.placer(c.x + ex * 0.35, c.z + ez * 0.35, c.h);
      p.sauter(ex, ez);
      p.m.groupe.visible = c.vu;
    }
    this.dire(c, REPLIQUES.saute);
    this.c.son.sonnette(0.4);
  }

  // À pied, à côté de son vélo : le vélo glisse et se couche ; on se relève, on attend que le véhicule soit passé, on va au
  // vélo, on le relève (les mains au cintre), on remonte et l'on repart en râlant
  aPied(c, dt, E) {
    c.tE += dt;
    const k = Math.exp(-dt * 3.2);
    c.sx += c.svx * dt; c.sz += c.svz * dt; c.svx *= k; c.svz *= k;
    // il penche puis tombe (la pesanteur), rebondit un peu
    const cible = c.cote * 1.36;
    if (c.etat !== 'releve' && c.chute < 1) {
      c.inclV += c.cote * 7 * dt; c.incl += c.inclV * dt;
      if (Math.abs(c.incl) >= 1.36) { c.incl = cible; c.inclV = -c.inclV * 0.18; c.chute = 1; if (c.vu) this.c.son.chuteVelo(borne(1.1 - Math.hypot(c.sx - E.ego.x, c.sz - E.ego.z) / 35, 0, 1)); }
    }
    c.x = c.sx; c.z = c.sz; c.y = sol(c.sx, c.sz);
    const p = c.p;
    if (!p) { if (c.tE > 3) this.remonter(c); return; }
    const veh = c.source, loin = !veh || Math.hypot(veh.pos.x - c.sx, veh.pos.z - c.sz) > 7 || Math.abs(veh.v) < 0.5;
    if (c.etat === 'saute') {
      p.update(dt, 0, 0, 0, false, this.c.col, E.t);
      if (c.tE > 0.9) { c.etat = 'terre'; c.tE = 0; this.dire(c, REPLIQUES.chute); }
    } else if (c.etat === 'terre') {
      // il regarde le véhicule, râle ; puis va au vélo
      if (veh) p.regard = c.regard.set(veh.pos.x, c.y + 1.6, veh.pos.z);
      p.update(dt, 0, 0, 0, false, this.c.col, E.t);
      if (c.tE > 2.2 && loin) { c.etat = 'va'; c.tE = 0; p.regard = null; }
    } else if (c.etat === 'va') {
      // à côté du cintre, du côté du dessus du vélo couché
      const hx = Math.sin(c.h), hz = Math.cos(c.h), gx = Math.cos(c.h), gz = -Math.sin(c.h), s = -c.cote;
      const tx = c.sx + gx * s * 0.62 + hx * 0.3, tz = c.sz + gz * s * 0.62 + hz * 0.3, dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.2 || c.tE > 8) { c.etat = 'releve'; c.tE = 0; p.placer(tx, tz, c.h); }
      else p.update(dt, dx / d, dz / d, 1, false, this.c.col, E.t, Math.min(1.3, 0.4 + d));
    } else if (c.etat === 'releve') {
      // il relève le vélo, les mains au cintre
      const u = Math.min(1, c.tE / 1.3), e = u * u * (3 - 2 * u);
      c.incl = cible * (1 - e) + 0.12 * e; // (relevé, il penche un peu à gauche : le pied y sera à terre)
      p.h = c.h; p.update(dt, 0, 0, 0, false, this.c.col, E.t);
      if (c.m) this.mainsAuCintre(c, p);
      if (u >= 1) this.remonter(c);
    }
    E.pousser(p.pos, 0.34);
  }
  // pendant qu'il relève son vélo : ses mains sur les poignées (repère du personnage)
  mainsAuCintre(c, p) {
    const D = c.m.D, g = c.m.groupe;
    g.position.set(c.sx, c.y, c.sz); g.rotation.set(0, c.h, 0); c.m.incline.rotation.z = -c.incl; g.updateMatrixWorld(true);
    p.m.groupe.updateMatrixWorld(true); mInv.copy(p.m.groupe.matrixWorld).invert();
    const out = c.outil || (c.outil = { g: [0, 0, 0], d: [0, 0, 0] });
    for (let k = 0; k < 2; k++) {
      const sx = k ? -1 : 1, q = k ? out.d : out.g;
      vA.set(D.prise[0] * sx, D.prise[1], D.prise[2]).applyMatrix4(c.m.incline.matrixWorld).applyMatrix4(mInv);
      q[0] = vA.x; q[1] = vA.y; q[2] = vA.z;
    }
    p.outil = out;
  }
  // il remonte : sur sa ligne, là où est le vélo, pied à terre ; il repart
  remonter(c) {
    const ch = c.ch, s = ch.projeter(c.sx, c.sz, c.s, 25);
    ch.point(s, PT);
    c.s = s; c.dec = (c.sx - PT.x) * Math.cos(PT.h) - (c.sz - PT.z) * Math.sin(PT.h);
    c.dec = borne(c.dec, -PT.d - 1.2, PT.g + 1.2);
    c.etat = 'roule'; c.v = 0; c.incl = 0.12; c.pied = 1; c.arretT = 1; c.chute = 0; c.hPrec = null;
    const p = c.p;
    if (p) {
      p.outil = null; p.regard = null; p.assis = true; p.velo = c.Vp; p.sautT = 0; p.saut = 0;
      c.m.incline.add(p.m.groupe); p.m.groupe.position.set(0, 0, 0); p.m.groupe.rotation.set(0, 0, 0); p.m.groupe.visible = true;
    }
    this.dire(c, REPLIQUES.repart);
  }

  // la pose du vélo et du cycliste
  dessiner(c, dt, t, dc) {
    const m = c.m, D = m.D, G = c.G, V = c.Vp, p = c.p;
    if (c.etat === 'roule') {
      // le virage : de combien le cap tourne ; on penche d'autant (la vitesse, le virage), un peu de flottement au pas
      if (c.hPrec === null || dt <= 0) c.om = 0; else c.om += (angle(c.h - c.hPrec) / dt - c.om) * amortir(dt, 8);
      c.hPrec = c.h;
      const lent = 1 - Math.min(1, c.v / 2.2);
      // pied à terre : à l'arrêt (et l'on se lève de la selle pour repartir)
      const piedC = c.arretT > 0.12 ? 1 : c.v > 0.9 ? 0 : c.pied;
      c.pied += borne(piedC - c.pied, -2.2 * dt, 3.5 * dt);
      // en danseuse : en montée, sur un vélo de course ou un VTT, par moments
      const danC = c.pente > 0.055 && c.v > 1 && !c.roueLibre && (c.genre === 'course' || c.genre === 'vtt') && Math.floor(c.s / 40) % 3 !== 1 ? 1 : 0;
      c.dan += borne(danC - c.dan, -1.5 * dt, 1.5 * dt);
      // le pédalier : on pédale (la cadence suit la vitesse), roue libre (les pédales à plat), on remonte la pédale droite
      // devant soi pour repartir
      const TH = c.mani;
      if (c.pied > 0.05 || c.arretT > 0) {
        const vise = -2.2 + Math.round((TH + 2.2) / TAU) * TAU;
        c.mani += borne(vise - TH, -3 * dt, 3 * dt);
      } else if (c.roueLibre) {
        const vise = Math.PI / 2 + Math.round((TH - Math.PI / 2) / Math.PI) * Math.PI;
        c.mani += borne(vise - TH, -2.5 * dt, 2.5 * dt);
      } else {
        const rpm = (c.dan > 0.5 ? 58 : 52) + 36 * Math.min(1, c.v / Math.max(1, c.vc));
        c.cadence = rpm / 60 * TAU;
        c.mani += c.cadence * dt * Math.min(1, 0.3 + c.v);
      }
      c.roue += c.v * dt / D.R;
      const lean = Math.atan(c.v * c.om / 9.81);
      const inclC = borne(lean, -0.5, 0.5) * (1 - c.pied) - 0.075 * Math.sin(c.mani) * c.dan + 0.03 * Math.sin(t * 2.1 + c.i) * lent * (1 - c.pied) + 0.12 * c.pied;
      c.incl += (inclC - c.incl) * amortir(dt, 7);
      const braqC = Math.atan(G.emp * c.om / Math.max(c.v, 0.7)) + 0.06 * Math.sin(t * 2.6 + c.i * 1.7) * lent * (1 - c.pied) + 0.16 * c.pied;
      c.braq += (borne(braqC, -0.7, 0.7) - c.braq) * amortir(dt, 6);
      m.groupe.position.set(c.x, c.y, c.z);
      m.groupe.rotation.set(-Math.atan(c.pente || 0), c.h, 0);
    } else {
      m.groupe.position.set(c.sx, c.y, c.sz); m.groupe.rotation.set(0, c.h, 0);
    }
    m.incline.rotation.z = -c.incl;
    poserOs(m.os, D, c.braq, c.roue, c.mani, c.selleE);
    m.mesh.castShadow = dc < 45;
    if (!p || c.etat !== 'roule') return; // (à pied : aPied le mène)
    // le cycliste : ce qu'il demande à son personnage (anim.js : poseVelo), dans le repère du vélo penché
    p.pos.set(c.x, c.y, c.z); p.h = c.h;
    {
      V[VL.selle] = D.selle[0] + D.dS[0] * c.selleE; V[VL.selle + 1] = D.selle[1] + D.dS[1] * c.selleE; V[VL.selle + 2] = D.selle[2] + D.dS[2] * c.selleE;
      // les poignées, tournées avec la direction autour de l'axe de la douille
      AXE.set(D.dD[0], D.dD[1], D.dD[2]); qDir.setFromAxisAngle(AXE, c.braq);
      for (let j = 0; j < 2; j++) {
        const k = j ? VL.mainD : VL.mainG, sx = j ? -1 : 1;
        vA.set(D.prise[0] * sx - D.HB[0], D.prise[1] - D.HB[1], D.prise[2] - D.HB[2]).applyQuaternion(qDir);
        V[k] = vA.x + D.HB[0]; V[k + 1] = vA.y + D.HB[1]; V[k + 2] = vA.z + D.HB[2];
      }
      vA.set(D.doigts[0], D.doigts[1], D.doigts[2]).applyQuaternion(qDir); V[VL.doigts] = vA.x; V[VL.doigts + 1] = vA.y; V[VL.doigts + 2] = vA.z;
      vA.set(D.paume[0], D.paume[1], D.paume[2]).applyQuaternion(qDir); V[VL.paume] = vA.x; V[VL.paume + 1] = vA.y; V[VL.paume + 2] = vA.z;
      const Lc = D.mani, co = Math.cos(c.mani), si = Math.sin(c.mani);
      V[VL.pedG] = D.xp; V[VL.pedG + 1] = D.BB[1] + Lc * co; V[VL.pedG + 2] = D.BB[2] + Lc * si;
      V[VL.pedD] = -D.xp; V[VL.pedD + 1] = D.BB[1] - Lc * co; V[VL.pedD + 2] = D.BB[2] - Lc * si;
      V[VL.mani] = c.mani; V[VL.danseuse] = c.dan; V[VL.pied] = c.pied; V[VL.roulis] = c.incl;
      // le pied gauche à terre : à côté du vélo, au sol (le sol vu du vélo penché)
      const X = 0.3, Zs = D.BB[2] + 0.12, ci = Math.cos(c.incl), sn = Math.sin(c.incl);
      V[VL.sol] = X * ci; V[VL.sol + 1] = X * sn; V[VL.sol + 2] = Zs;
      // il regarde à gauche et à droite au stop ; le joueur qui le gêne ; devant lui sinon
      if (c.regarde > 0) { const a = c.h + (Math.floor(c.regarde / 0.9) % 2 ? -1.2 : 1.2); p.regard = c.regard.set(c.x + Math.sin(a) * 10, c.y + 1.4, c.z + Math.cos(a) * 10); }
      else p.regard = null;
    }
    p.sync(dt, t);
  }

  // le joueur à pied ne traverse pas un vélo (deux cercles le long du vélo)
  pousser(q, r) {
    for (const c of this.liste) {
      if (!c.actif || !c.vu) continue;
      const x = c.etat === 'roule' ? c.x : c.sx, z = c.etat === 'roule' ? c.z : c.sz;
      if (Math.abs(q.x - x) > 2 || Math.abs(q.z - z) > 2) continue;
      for (let k = -1; k <= 1; k += 2) {
        const cx = x + c.ax * 0.45 * k, cz = z + c.az * 0.45 * k, dx = q.x - cx, dz = q.z - cz, d2 = dx * dx + dz * dz, R = 0.32 + r;
        if (d2 < R * R) { const d = Math.sqrt(d2) || 0.001; q.x = cx + dx / d * R; q.z = cz + dz / d * R; }
      }
    }
  }
  // un véhicule du joueur le touche (vehicules.js : (nx, nz), du véhicule vers lui) : s'il roulait, il saute, à l'écart
  cogner(c, qui, nx, nz) {
    if (c.etat !== 'roule') return;
    c.touches = (c.touches || 0) + 1;
    this.sauter(c, nx, nz, qui && qui.pos ? qui : null);
  }
  // les taches de contact (main.js : majTaches) ; vu(m, x, z) : le personnage dessiné ou non selon la distance
  taches(t, vu) {
    for (const c of this.liste) {
      if (!c.vu) continue;
      if (c.etat === 'roule') {
        // (le vélo suit son cycliste : dessiné ou non selon la distance, comme les passants)
        const vis = vu(c.p.m, c.x, c.z);
        if (c.m.mesh.visible !== vis) { c.m.mesh.visible = vis; if (c.casque) c.casque.visible = vis; }
        if (vis) t.poser(c.x, c.z, 0.24, 0.95, c.h, c.y);
      } else { t.poser(c.sx, c.sz, 0.5, 0.9, c.h, c.y); if (vu(c.p.m, c.p.pos.x, c.p.pos.z)) t.poser(c.p.pos.x, c.p.pos.z, 0.38, 0.38, 0, c.p.pos.y); }
    }
  }
}
// (pour les voitures du joueur : vehicules.js appelle cogner(qui, nx, nz) sur ce qu'il heurte)
Cycliste.prototype.cogner = function (qui, nx, nz) { this.V.cogner(this, qui, nx, nz); };
