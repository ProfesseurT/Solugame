// Les bureaux de Solumatic, au fond de la zone d'activités des Coteaux (Teddy, 25/11/2026 : « tu vas reprendre
// l'entreprise Solumatic, le vrai logo dessus » ; « on est sur un rez-de-chaussée unique » ; « il va être en retrait dans
// la zone industrielle » ; « on va pouvoir rentrer dedans » ; puis le plan des bureaux, « tu peux commencer à faire des
// trucs »). Le bâtiment est dessiné dans monde.js (zoneActivites) ; ici : sa place, le plan de l'intérieur et son
// mobilier, et le jeu (entrer, sortir, la vue plongeante, ceux qui y travaillent).
//
// Le plan de Teddy (un rectangle, 587 x 704 pixels à 27,5 pixels par mètre : 21,3 x 25,6 m dedans) est posé tourné : son
// côté gauche est la façade sud (le parvis, la grille de la rue), son haut est à l'ouest. En haut du plan, l'atelier, la
// salle serveurs et la salle à manger ; à gauche le hall d'entrée, le réfectoire, deux bureaux ; au milieu un bloc
// (chaufferie, trois sanitaires, réserve, buanderie) entouré du couloir ; à droite le bureau 7 ; en bas les bureaux 3 à 6.
// Seule la disposition des pièces est reprise. Le passage entre le hall et le couloir de droite est élargi à un mètre (le
// plan n'y laisse qu'un trait).
import * as THREE from 'three';
import { B, C, S, fusion, MAT } from './modeles.js';
import { perso } from './perso.js';
import { Pieton } from './pieton.js';
import { SOLUMATIC as TXT } from './textes.js';
import { $ } from './outils.js';

const PX = 27.5, X0 = 196, Z1 = -54;
const wx = py => X0 + (py - 43) / PX, wz = px => Z1 - (px - 200) / PX;
// l'intérieur (les faces intérieures des murs extérieurs) ; murs de 30 cm, 3,6 m sous l'acrotère ; cloisons de 2,75 m
export const SOLU = { x0: X0, x1: wx(747), z0: wz(787), z1: Z1, ep: 0.3, H: 3.6, HC: 2.75 };
// une pièce du plan [px0, py0, px1, py1] : son rectangle dans le monde
const piece = ([a, b, c, d]) => ({ x0: wx(b), x1: wx(d), z0: wz(c), z1: wz(a) });
const P = {
  atelier: piece([200, 43, 374.5, 236]), serveurs: piece([374.5, 43, 576.5, 236]), manger: piece([576.5, 43, 787, 298]),
  refectoire: piece([200, 326, 319, 473]), b1: piece([200, 473, 319, 555.5]), b2: piece([200, 555.5, 319, 637.5]),
  b3: piece([200, 637.5, 448.5, 747]), b4: piece([448.5, 637.5, 539.5, 747]), b5: piece([539.5, 637.5, 668.5, 747]),
  b6: piece([668.5, 583, 787, 747]), b7: piece([632, 298, 787, 547]),
  chaufferie: piece([393, 298, 457.5, 390.5]), san3: piece([457.5, 298, 548, 390.5]), san1: piece([393, 390.5, 457.5, 473]),
  san2: piece([457.5, 390.5, 548, 473]), reserve: piece([393, 473, 448.5, 574]), buanderie: piece([448.5, 473, 548, 574]),
  hall: piece([200, 236, 576.5, 326]),
};
// l'entrée : une porte vitrée dans la façade sud, au bout du hall, en face de la grille
export const ENTREE = { x: +wx(281).toFixed(2), l: 1.0, h: 2.2 };
// les fenêtres des murs extérieurs : [mur, position le long, largeur] (sud et nord : x ; est et ouest : z)
export const FENETRES = [
  ['s', +((P.refectoire.x0 + P.refectoire.x1) / 2).toFixed(2), 1.5], ['s', +((P.b1.x0 + P.b1.x1) / 2).toFixed(2), 1.3],
  ['s', +((P.b2.x0 + P.b2.x1) / 2).toFixed(2), 1.3], ['s', +((P.b3.x0 + P.b3.x1) / 2).toFixed(2), 1.5],
  ['e', -56.4, 1.4], ['e', -60.7, 1.4], ['e', -64.7, 1.3], ['e', -68.7, 1.3], ['e', -73.2, 1.3],
  ['n', 203.2, 1.4], ['n', 208.3, 1.5], ['n', 212.4, 1.5], ['n', 218.6, 1.4],
  ['o', -57.2, 1.3],
];
// la porte-fenêtre de la salle à manger, sur la pelouse au nord ; les deux portes de l'atelier (rideaux métalliques)
export const PORTE_FENETRE = { x: 199.3, l: 1.8 }, RIDEAUX = [197.85, 201.15];

const BLANC = '#eeece6', CADRE = '#d9d5cc', BOIS = '#b9935f', NOIR = '#24262b', GRIS = '#8d9196', ECRAN = '#151a22';
const ORANGE = '#ef6c26';

/* ---------------------------------------------------------------- l'intérieur
   Rend { geos, boites (ce qui arrête : [x0, z0, x1, z1]), lampes, postes (où sont assis ceux qui travaillent) }. Tout en
   coordonnées du monde. Les cloisons sont coupées à 2,75 m : on voit dedans d'en haut (le toit n'est pas dessiné). */
export function interieurSolumatic() {
  const G = [], boites = [], postes = [];
  const e = 0.1, HC = SOLU.HC;
  const col = (x0, z0, x1, z1) => boites.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
  /* -- les sols : le couloir en carrelage clair, chaque pièce le sien */
  const sol = (r, c, y = 0.022) => G.push(B(r.x1 - r.x0, 0.02, r.z1 - r.z0, c, (r.x0 + r.x1) / 2, y - 0.01, (r.z0 + r.z1) / 2));
  sol({ x0: SOLU.x0, x1: SOLU.x1, z0: SOLU.z0, z1: SOLU.z1 }, '#c9cac5', 0.016);
  const MOQUETTE = '#7c8591', PARQUET = '#b99a72', CARRELAGE = '#dfe2e1', BETON = '#a3a29c';
  for (const k of ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7']) sol(P[k], MOQUETTE);
  sol({ x0: P.b7.x0, x1: wx(583), z0: P.b7.z0, z1: wz(668.5) }, MOQUETTE); // le bureau 7, jusqu'au mur du bureau 6
  for (const k of ['refectoire', 'manger']) sol(P[k], PARQUET);
  for (const k of ['san1', 'san2', 'san3']) sol(P[k], CARRELAGE);
  for (const k of ['atelier', 'chaufferie', 'reserve', 'buanderie']) sol(P[k], BETON);
  sol(P.serveurs, '#b9bec4'); // faux plancher
  for (let z = P.serveurs.z0 + 0.6; z < P.serveurs.z1; z += 0.6) G.push(B(P.serveurs.x1 - P.serveurs.x0, 0.004, 0.02, '#9da3aa', (P.serveurs.x0 + P.serveurs.x1) / 2, 0.024, z));
  for (let x = P.serveurs.x0 + 0.6; x < P.serveurs.x1; x += 0.6) G.push(B(0.02, 0.004, P.serveurs.z1 - P.serveurs.z0, '#9da3aa', x, 0.024, (P.serveurs.z0 + P.serveurs.z1) / 2));

  /* -- les murs extérieurs, côté intérieur : la peinture, les fenêtres (le jour derrière), la porte d'entrée */
  const { x0, x1, z0, z1 } = SOLU;
  const ouvert = (a, b, trous) => { // les morceaux de [a, b] hors des trous [c, l]
    const r = []; let p = a;
    for (const [c, l] of [...trous].sort((u, v) => u[0] - v[0])) { if (c - l / 2 > p) r.push([p, c - l / 2]); p = Math.max(p, c + l / 2); }
    if (b > p) r.push([p, b]);
    return r;
  };
  // (coupés à la hauteur des cloisons, comme les murs : monde.js met le reste avec le toit)
  for (const [a, b] of ouvert(x0, x1, [[ENTREE.x, ENTREE.l]])) G.push(B(b - a, HC, 0.02, BLANC, (a + b) / 2, HC / 2, z1 - 0.01));
  G.push(B(ENTREE.l, HC - ENTREE.h, 0.02, BLANC, ENTREE.x, (HC + ENTREE.h) / 2, z1 - 0.01));
  G.push(B(x1 - x0, HC, 0.02, BLANC, (x0 + x1) / 2, HC / 2, z0 + 0.01), B(0.02, HC, z1 - z0, BLANC, x0 + 0.01, HC / 2, (z0 + z1) / 2), B(0.02, HC, z1 - z0, BLANC, x1 - 0.01, HC / 2, (z0 + z1) / 2));
  for (const [m, p, l] of FENETRES) {
    const ns = m === 's' || m === 'n', s = m === 's' ? -1 : m === 'n' ? 1 : m === 'e' ? -1 : 1;
    const fx = ns ? p : m === 'e' ? x1 : x0, fz = ns ? (m === 's' ? z1 : z0) : p, k = 0.025 * s;
    // la vitre (le jour), son cadre blanc, l'appui, le volet roulant à moitié descendu (vu de dedans : sa lame basse)
    if (ns) G.push(B(l, 1.3, 0.02, '#a9c4dc', fx, 1.6, fz + k), B(l + 0.1, 0.06, 0.04, CADRE, fx, 0.92, fz + k * 1.6), B(l + 0.1, 0.05, 0.04, CADRE, fx, 2.27, fz + k * 1.6), B(l, 0.42, 0.024, '#f4f4f2', fx, 2.05, fz + k * 1.2), B(0.05, 1.3, 0.04, CADRE, fx, 1.6, fz + k * 1.6), B(l + 0.2, 0.04, 0.2, '#e6e2da', fx, 0.9, fz + k * 4));
    else G.push(B(0.02, 1.3, l, '#a9c4dc', fx + k, 1.6, fz), B(0.04, 0.06, l + 0.1, CADRE, fx + k * 1.6, 0.92, fz), B(0.04, 0.05, l + 0.1, CADRE, fx + k * 1.6, 2.27, fz), B(0.024, 0.42, l, '#f4f4f2', fx + k * 1.2, 2.05, fz), B(0.04, 1.3, 0.05, CADRE, fx + k * 1.6, 1.6, fz), B(0.2, 0.04, l + 0.2, '#e6e2da', fx + k * 4, 0.9, fz));
    // un radiateur sous la fenêtre
    if (ns) G.push(B(l * 0.8, 0.5, 0.08, '#f2f2ef', fx, 0.45, fz + k * 4)); else G.push(B(0.08, 0.5, l * 0.8, '#f2f2ef', fx + k * 4, 0.45, fz));
  }
  // la porte-fenêtre de la salle à manger (nord), les rideaux métalliques de l'atelier vus de dedans (sud)
  G.push(B(PORTE_FENETRE.l, 2.2, 0.02, '#a9c4dc', PORTE_FENETRE.x, 1.12, z0 + 0.025), B(0.06, 2.2, 0.04, CADRE, PORTE_FENETRE.x, 1.12, z0 + 0.04));
  for (const x of RIDEAUX) {
    G.push(B(2.7, 2.45, 0.03, '#dcdedf', x, 1.225, z1 - 0.03));
    for (let y = 0.2; y < 2.45; y += 0.16) G.push(B(2.7, 0.015, 0.035, '#c2c5c8', x, y, z1 - 0.03));
    G.push(B(0.08, 2.45, 0.1, '#7d8288', x - 1.39, 1.225, z1 - 0.06), B(0.08, 2.45, 0.1, '#7d8288', x + 1.39, 1.225, z1 - 0.06), B(2.9, 0.3, 0.36, '#d6d8da', x, 2.58, z1 - 0.18));
  }
  // l'encadrement de la porte d'entrée
  G.push(B(0.07, ENTREE.h, 0.32, CADRE, ENTREE.x - ENTREE.l / 2 - 0.035, ENTREE.h / 2, z1 + 0.12), B(0.07, ENTREE.h, 0.32, CADRE, ENTREE.x + ENTREE.l / 2 + 0.035, ENTREE.h / 2, z1 + 0.12), B(ENTREE.l + 0.14, 0.07, 0.32, CADRE, ENTREE.x, ENTREE.h + 0.035, z1 + 0.12));

  /* -- les cloisons, d'après le plan : ['h', py, px0, px1, portes] (le long de z, en x = wx(py)) ou ['v', px, py0, py1,
     portes] (le long de x, en z = wz(px)) ; une porte : [position sur le plan, côté où s'ouvre son battant (+1, -1)] */
  const CLOISONS = [
    ['h', 236, 200, 576.5, [[300, -1], [505, -1]]], ['h', 298, 576.5, 787, [[604, -1]]],
    ['h', 326, 200, 319, []], ['h', 473, 200, 319, []], ['h', 555.5, 200, 319, []], ['h', 637.5, 200, 668.5, [[410, 1], [494, 1], [604, 1]]],
    ['h', 547, 632, 668.5, []], ['h', 583, 668.5, 787, []],
    ['h', 298, 393, 548, [[425, 1], [503, 1]]], ['h', 390.5, 393, 548, []], ['h', 473, 393, 548, []], ['h', 574, 393, 548, [[421, -1], [500, -1]]],
    ['v', 374.5, 43, 236, []], ['v', 576.5, 43, 298, []], ['v', 319, 326, 637.5, [[440, 1], [514, 1], [596, 1]]],
    ['v', 448.5, 637.5, 747, []], ['v', 539.5, 637.5, 747, []], ['v', 668.5, 547, 747, [[615, -1]]], ['v', 632, 298, 547, [[420, -1]]],
    ['v', 393, 298, 574, [[432, -1]]], ['v', 457.5, 298, 473, []], ['v', 448.5, 473, 574, []], ['v', 548, 298, 574, [[432, 1]]],
  ];
  const PORTE = 0.9;
  for (const [o, c, a, b, portes] of CLOISONS) {
    const le = o === 'h' ? [wz(b), wz(a)] : [wx(a), wx(b)], fixe = o === 'h' ? wx(c) : wz(c);
    const trous = portes.map(([p]) => [o === 'h' ? wz(p) : wx(p), PORTE]);
    for (const [u, v] of ouvert(le[0], le[1], trous)) {
      if (v - u < 0.02) continue;
      if (o === 'h') { G.push(B(e, HC, v - u, BLANC, fixe, HC / 2, (u + v) / 2)); col(fixe - e / 2, u, fixe + e / 2, v); }
      else { G.push(B(v - u, HC, e, BLANC, (u + v) / 2, HC / 2, fixe)); col(u, fixe - e / 2, v, fixe + e / 2); }
    }
    // les portes : l'huisserie, le battant ouvert contre la cloison (du côté s), sa poignée
    for (const [p, s] of portes) {
      const m = o === 'h' ? wz(p) : wx(p), a0 = m - PORTE / 2, a1 = m + PORTE / 2;
      if (o === 'h') {
        G.push(B(0.14, 2.08, 0.05, CADRE, fixe, 1.04, a0), B(0.14, 2.08, 0.05, CADRE, fixe, 1.04, a1), B(0.14, 0.05, PORTE + 0.05, CADRE, fixe, 2.08, m));
        G.push(B(0.82, 2.02, 0.04, BOIS, fixe + s * 0.44, 1.02, a1 - 0.04), B(0.03, 0.03, 0.12, '#c9ccd1', fixe + s * 0.78, 1.0, a1 - 0.1));
        col(fixe + (s > 0 ? 0.05 : -0.86), a1 - 0.07, fixe + (s > 0 ? 0.86 : -0.05), a1 - 0.01);
      } else {
        G.push(B(0.05, 2.08, 0.14, CADRE, a0, 1.04, fixe), B(0.05, 2.08, 0.14, CADRE, a1, 1.04, fixe), B(PORTE + 0.05, 0.05, 0.14, CADRE, m, 2.08, fixe));
        G.push(B(0.04, 2.02, 0.82, BOIS, a1 - 0.04, 1.02, fixe + s * 0.44), B(0.12, 0.03, 0.03, '#c9ccd1', a1 - 0.1, 1.0, fixe + s * 0.78));
        col(a1 - 0.07, fixe + (s > 0 ? 0.05 : -0.86), a1 - 0.01, fixe + (s > 0 ? 0.86 : -0.05));
      }
    }
  }

  /* -- le mobilier */
  // un repère tourné : (lx, lz) autour de (x, z), lz vers l'avant (cap h)
  const R = (x, z, h) => (lx, lz) => [x + lx * Math.cos(h) + lz * Math.sin(h), z - lx * Math.sin(h) + lz * Math.cos(h)];
  const boite = (r, h, w, hh, d, c, lx, y, lz) => { const [X, Z] = r(lx, lz); G.push(B(w, hh, d, c, X, y, Z, h)); };
  // l'emprise d'un meuble (cap multiple d'un quart de tour) : w de large, d de profond, autour de (lx, lz)
  const emprise = (r, h, w, d, lx = 0, lz = 0) => { const [X, Z] = r(lx, lz), q = Math.abs(Math.sin(h)) > 0.5; col(X - (q ? d : w) / 2, Z - (q ? w : d) / 2, X + (q ? d : w) / 2, Z + (q ? w : d) / 2); };
  // une chaise de bureau (cap h : vers où l'on regarde assis) : piètement étoile, vérin, assise, dossier
  const chaise = (x, z, h, c = '#2f3a4a') => {
    const r = R(x, z, h);
    for (let k = 0; k < 5; k++) { const a = h + k * 1.2566; G.push(B(0.04, 0.03, 0.3, NOIR, x + Math.sin(a) * 0.14, 0.06, z + Math.cos(a) * 0.14, a)); }
    G.push(C(0.025, 0.025, 0.36, 6, '#9aa0a6', x, 0.25, z));
    boite(r, h, 0.48, 0.08, 0.46, c, 0, 0.47, 0.02); boite(r, h, 0.44, 0.55, 0.06, c, 0, 0.8, -0.24);
  };
  // un poste de travail (cap h : la personne assise regarde vers h) : le plan de travail, ses pieds, deux écrans,
  // le clavier, la souris, l'unité centrale, la chaise ; la place assise dans postes si assis
  const poste = (x, z, h, o = {}) => {
    const r = R(x, z, h), w = o.w || 1.4;
    boite(r, h, w, 0.03, 0.72, o.plan || '#e9e4da', 0, 0.74, 0.55);
    for (const s of [-1, 1]) boite(r, h, 0.04, 0.72, 0.66, GRIS, s * (w / 2 - 0.05), 0.37, 0.55);
    boite(r, h, w - 0.1, 0.3, 0.02, GRIS, 0, 0.55, 0.88);
    const ec = o.ecrans ?? 2;
    for (let i = 0; i < ec; i++) {
      const lx = ec === 1 ? 0 : (i - 0.5) * 0.58;
      boite(r, h, 0.54, 0.33, 0.025, ECRAN, lx, 1.07, 0.78); boite(r, h, 0.5, 0.29, 0.005, i % 2 ? '#3a6ea5' : '#e8eef4', lx, 1.07, 0.765);
      boite(r, h, 0.05, 0.17, 0.04, NOIR, lx, 0.84, 0.8); boite(r, h, 0.2, 0.012, 0.15, NOIR, lx, 0.762, 0.8);
    }
    boite(r, h, 0.44, 0.02, 0.14, '#2b2d31', 0, 0.765, 0.55); boite(r, h, 0.06, 0.02, 0.1, '#2b2d31', 0.32, 0.765, 0.55);
    if (!o.portable) boite(r, h, 0.2, 0.42, 0.45, '#1f2125', -w / 2 + 0.2, 0.22, 0.6);
    if (o.mug) { const [X, Z] = r(-0.45, 0.4); G.push(C(0.04, 0.04, 0.1, 8, o.mug, X, 0.81, Z)); }
    if (o.papiers) boite(r, h, 0.21, 0.03, 0.29, '#f6f4ee', 0.5, 0.77, 0.45);
    emprise(r, h, w, 0.72, 0, 0.55);
    if (o.chaise !== false) chaise(x, z, h);
    if (o.assis) postes.push({ x, z, h });
  };
  const armoire = (x, z, h, w = 0.9, c = '#d9d5cc', n = 3) => {
    const r = R(x, z, h);
    boite(r, h, w, 1.95, 0.42, c, 0, 0.975, 0);
    for (let k = 0; k < n; k++) for (let i = 0; i < 6; i++) boite(r, h, w / 7.5, 0.3, 0.3, ['#c0392b', '#2e86de', '#e0b13a', '#3f7d4a', '#8e44ad', '#f4f4f2'][(i + k) % 6], -w / 2 + w / 7 * (i + 0.7), 0.4 + k * 0.55, 0.06);
    emprise(r, h, w, 0.42);
  };
  const plante = (x, z, k = 1) => {
    G.push(C(0.17 * k, 0.13 * k, 0.4 * k, 8, '#d8d2c6', x, 0.2 * k, z), S(0.32 * k, '#4f7a3a', x, 0.62 * k, z, 1, 1.3, 1, 1), S(0.22 * k, '#5f8f44', x + 0.08, 0.88 * k, z - 0.05, 1, 1.4, 1, 0));
    col(x - 0.2, z - 0.2, x + 0.2, z + 0.2);
  };
  const tableR = (x, z, w, d, c = '#e9e4da') => {
    G.push(B(w, 0.04, d, c, x, 0.74, z));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.push(B(0.05, 0.72, 0.05, GRIS, x + sx * (w / 2 - 0.06), 0.36, z + sz * (d / 2 - 0.06)));
    col(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  };
  const chaiseS = (x, z, h, c = '#3a4a5c') => { // une chaise de réunion ou de cantine
    const r = R(x, z, h);
    boite(r, h, 0.42, 0.04, 0.42, c, 0, 0.46, 0); boite(r, h, 0.42, 0.42, 0.04, c, 0, 0.7, -0.2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) boite(r, h, 0.025, 0.46, 0.025, '#9aa0a6', sx * 0.18, 0.23, sz * 0.18);
  };
  const extincteur = (x, z) => G.push(C(0.08, 0.08, 0.5, 8, '#c0392b', x, 0.4, z), C(0.03, 0.04, 0.08, 6, NOIR, x, 0.69, z), B(0.2, 0.25, 0.02, '#c0392b', x, 1.45, z));

  // le hall d'entrée : la banque d'accueil (façade orange), un canapé, une table basse, des plantes, la fontaine à eau
  {
    const h = P.hall;
    G.push(B(0.6, 1.05, 1.8, '#f2f0ea', h.x1 - 0.55, 0.525, -57.3), B(0.04, 0.9, 1.8, ORANGE, h.x1 - 0.87, 0.5, -57.3), B(0.75, 0.04, 1.9, '#e9e4da', h.x1 - 0.6, 1.07, -57.3));
    G.push(B(0.36, 0.25, 0.03, ECRAN, h.x1 - 0.45, 1.22, -57.0, Math.PI / 2 + 0.3));
    col(h.x1 - 0.9, -58.25, h.x1, -56.35);
    G.push(B(0.85, 0.42, 2.0, '#3d4f66', h.x0 + 0.45, 0.21, -62.2), B(0.25, 0.4, 2.0, '#3d4f66', h.x0 + 0.17, 0.6, -62.2), B(0.8, 0.12, 1.9, '#4f6580', h.x0 + 0.48, 0.48, -62.2));
    col(h.x0, -63.2, h.x0 + 0.9, -61.2);
    plante(h.x0 + 0.4, -60.6, 1.2); plante(h.x1 - 0.35, -54.45); plante(h.x0 + 0.35, -64.2, 1.1);
    G.push(B(0.32, 1.1, 0.32, '#e8eaec', h.x0 + 0.25, 0.55, -66.9), C(0.13, 0.13, 0.4, 8, '#8fc3e6', h.x0 + 0.25, 1.3, -66.9));
    col(h.x0, -67.1, h.x0 + 0.45, -66.7);
    extincteur(h.x0 + 0.12, -55.2);
  }
  // le réfectoire : deux tables et leurs chaises, le plan de travail (cafetière, bouilloire), le réfrigérateur
  {
    const r = P.refectoire;
    for (const x of [r.x0 + 1.25, r.x0 + 3.25]) {
      tableR(x, -56.2, 1.2, 0.8, '#f0ede6');
      for (const s of [-1, 1]) { chaiseS(x - 0.3, -56.2 + s * 0.62, s > 0 ? Math.PI : 0); chaiseS(x + 0.3, -56.2 + s * 0.62, s > 0 ? Math.PI : 0); }
    }
    // le plan de travail contre le mur du bureau 1 (est) : la cafetière, la bouilloire ; le réfrigérateur au bout
    G.push(B(0.6, 0.9, 2.6, '#f2f0ea', r.x1 - 0.32, 0.45, -55.7), B(0.64, 0.04, 2.65, '#5a5d63', r.x1 - 0.32, 0.92, -55.7));
    G.push(B(0.3, 0.4, 0.32, NOIR, r.x1 - 0.3, 1.14, -55.0), C(0.08, 0.09, 0.24, 8, '#c9ccd1', r.x1 - 0.3, 1.06, -56.2));
    G.push(B(0.62, 1.8, 0.6, '#e8eaec', r.x1 - 0.34, 0.9, -57.5)); col(r.x1 - 0.66, -57.82, r.x1, -54.4);
  }
  // le bureau 1 et le bureau 2 : un poste face à la fenêtre (sud), une armoire
  poste((P.b1.x0 + P.b1.x1) / 2, -55.55, 0, { assis: true, mug: '#ef6c26', papiers: true }); armoire(P.b1.x1 - 0.3, -57.6, -Math.PI / 2, 0.9);
  poste((P.b2.x0 + P.b2.x1) / 2, -55.55, 0, { mug: '#2e86de' }); armoire(P.b2.x0 + 0.3, -57.6, Math.PI / 2, 0.9); plante(P.b2.x1 - 0.35, -57.9);
  // le bureau 3 : trois postes le long des fenêtres (est)
  poste(P.b3.x1 - 1.3, -55.6, Math.PI / 2, { assis: true, papiers: true });
  poste(P.b3.x1 - 1.3, -58.6, Math.PI / 2, { mug: '#f4f4f2' });
  poste(P.b3.x1 - 1.3, -61.6, Math.PI / 2, { papiers: true });
  armoire(P.b3.x0 + 0.3, -60.0, Math.PI / 2, 1.2); plante(P.b3.x0 + 0.35, -54.5);
  // les bureaux 4 et 5 : un poste face à la fenêtre (est), une armoire ; le 5 a une petite table ronde
  poste(P.b4.x1 - 1.3, -64.7, Math.PI / 2, { ecrans: 1, mug: '#ef6c26' }); armoire(P.b4.x0 + 0.3, -65.8, Math.PI / 2, 1.0);
  poste(P.b5.x1 - 1.3, -68.7, Math.PI / 2, { assis: true }); armoire(P.b5.x0 + 0.3, -67.0, Math.PI / 2, 1.0);
  G.push(C(0.45, 0.45, 0.03, 12, '#e9e4da', P.b5.x0 + 1.3, 0.74, -70.2), C(0.04, 0.04, 0.72, 6, GRIS, P.b5.x0 + 1.3, 0.37, -70.2)); col(P.b5.x0 + 0.85, -70.65, P.b5.x0 + 1.75, -69.75);
  // le bureau 6 : un poste face à la fenêtre (nord), un tableau blanc
  poste(218.6, P.b6.z0 + 1.35, Math.PI, { mug: '#3f7d4a', papiers: true }); armoire(P.b6.x1 - 0.3, -72.0, -Math.PI / 2, 0.9);
  G.push(B(1.6, 1.0, 0.03, '#fbfbfa', 218.4, 1.5, P.b6.z1 - 0.06), B(1.66, 0.05, 0.06, GRIS, 218.4, 0.98, P.b6.z1 - 0.07));
  // le bureau 7 : un plateau de quatre postes en vis-à-vis, une table de réunion, l'écran au mur
  {
    const zc = (P.b7.z0 + P.b7.z1) / 2 - 0.3;
    for (const [x, as] of [[207.3, [true, false]], [209.1, [false, true]]]) { poste(x, zc + 0.92, Math.PI, { assis: as[0], papiers: true }); poste(x, zc - 0.92, 0, { assis: as[1], mug: '#ef6c26' }); }
    tableR(212.6, zc, 1.0, 2.2, '#b99a72');
    for (const dz of [-0.6, 0, 0.6]) { chaiseS(211.85, zc + dz, Math.PI / 2, '#ef6c26'); chaiseS(213.35, zc + dz, -Math.PI / 2, '#ef6c26'); }
    G.push(B(1.5, 0.86, 0.06, ECRAN, P.b7.x1 - 1.6, 1.55, P.b7.z0 + 0.06), B(1.42, 0.78, 0.005, '#2c5b8c', P.b7.x1 - 1.6, 1.55, P.b7.z0 + 0.095));
    plante(P.b7.x0 + 0.4, P.b7.z0 + 0.4, 1.3); armoire(P.b7.x0 + 0.3, zc, Math.PI / 2, 1.2);
  }
  // l'atelier : établis le long des murs, des unités centrales ouvertes, des cartons, une étagère, un diable
  {
    const a = P.atelier;
    G.push(B(0.75, 0.05, 4.4, '#9a7b55', a.x0 + 0.45, 0.9, -57.3), B(0.7, 0.85, 0.05, GRIS, a.x0 + 0.45, 0.45, -55.2), B(0.7, 0.85, 0.05, GRIS, a.x0 + 0.45, 0.45, -59.4));
    for (const [z, c] of [[-55.9, '#1f2125'], [-57.0, '#d9d5cc'], [-58.3, '#1f2125']]) G.push(B(0.45, 0.42, 0.2, c, a.x0 + 0.5, 1.14, z));
    G.push(B(0.5, 0.32, 0.02, ECRAN, a.x0 + 0.3, 1.15, -57.6, Math.PI / 2), B(0.12, 0.08, 0.3, '#e0b13a', a.x0 + 0.55, 0.96, -56.4));
    col(a.x0, -59.5, a.x0 + 0.85, -55.1);
    G.push(B(3.6, 0.05, 0.75, '#9a7b55', (a.x0 + a.x1) / 2 + 0.6, 0.9, a.z0 + 0.45)); col((a.x0 + a.x1) / 2 - 1.2, a.z0, (a.x0 + a.x1) / 2 + 2.4, a.z0 + 0.85);
    for (const dx of [-1.6, 0, 1.6]) G.push(B(0.05, 0.88, 0.7, GRIS, (a.x0 + a.x1) / 2 + 0.6 + dx, 0.44, a.z0 + 0.45));
    G.push(B(0.24, 0.12, 0.3, '#2b2d31', (a.x0 + a.x1) / 2 - 0.3, 0.98, a.z0 + 0.4), B(0.4, 0.3, 0.3, '#d9d5cc', (a.x0 + a.x1) / 2 + 1.2, 1.08, a.z0 + 0.42));
    for (let k = 0; k < 4; k++) G.push(B(1.8, 0.03, 0.45, GRIS, a.x1 - 0.3, 0.3 + k * 0.5, -55.25, Math.PI / 2));
    for (let k = 0; k < 4; k++) for (let i = 0; i < 3; i++) G.push(B(0.4, 0.3, 0.38, (i + k) % 2 ? '#b98a55' : '#ad7f4c', a.x1 - 0.3, 0.47 + k * 0.5, -55.85 + i * 0.6));
    col(a.x1 - 0.55, -56.2, a.x1, -54.3);
    for (const [x, z, n] of [[199.6, -55.4, 2], [200.3, -55.3, 3], [200.9, -56.0, 1]]) for (let k = 0; k < n; k++) G.push(B(0.5, 0.36, 0.4, k % 2 ? '#b98a55' : '#c49a64', x, 0.18 + k * 0.37, z, k * 0.2));
    col(199.3, -56.3, 201.2, -55.05);
  }
  // la salle serveurs : quatre baies (portes vitrées, leurs voyants), le chemin de câbles, l'onduleur, la clim au mur
  {
    const s = P.serveurs, xb = (s.x0 + s.x1) / 2 + 0.3;
    for (let i = 0; i < 4; i++) {
      const z = -61.5 - i * 0.66;
      G.push(B(1.05, 2.0, 0.62, '#1c1e22', xb, 1.0, z), B(0.01, 1.84, 0.54, '#2a3442', xb - 0.53, 1.0, z));
      for (let k = 0; k < 9; k++) G.push(B(0.012, 0.018, 0.03, ['#3ddc84', '#3ddc84', '#4aa3ff', '#ffb02e'][(k + i) % 4], xb - 0.535, 0.35 + k * 0.17, z - 0.18 + ((k * 7 + i) % 5) * 0.08));
    }
    G.push(B(0.3, 0.1, 2.9, '#e0b13a', xb, 2.2, -62.5)); col(xb - 0.55, -63.85, xb + 0.55, -61.15);
    G.push(B(0.7, 1.1, 0.5, '#2b2d31', s.x0 + 0.5, 0.55, -66.9), B(0.2, 0.04, 0.003, '#3ddc84', s.x0 + 0.5, 0.95, -66.64)); col(s.x0, -67.2, s.x0 + 0.85, -66.6);
    G.push(B(0.95, 0.32, 0.24, '#f4f4f2', s.x1 - 0.13, 2.3, -64.5, Math.PI / 2));
    extincteur(s.x1 - 0.15, -61.0);
  }
  // la salle à manger : la cuisine le long du mur ouest (éléments bas et hauts, évier, plaques, réfrigérateur, micro-ondes,
  // machine à café), la grande table et ses huit chaises, une plante
  {
    const m = P.manger;
    G.push(B(0.62, 0.9, 5.6, '#f2f0ea', m.x0 + 0.32, 0.45, -71.6), B(0.66, 0.04, 5.6, '#5a5d63', m.x0 + 0.33, 0.92, -71.6));
    G.push(B(0.36, 0.7, 4.0, '#f2f0ea', m.x0 + 0.19, 1.9, -71.0), B(0.5, 0.05, 0.6, '#c9ccd1', m.x0 + 0.33, 0.95, -70.0), B(0.5, 0.02, 0.6, '#2b2d31', m.x0 + 0.33, 0.95, -72.4));
    G.push(B(0.42, 0.28, 0.32, '#2b2d31', m.x0 + 0.3, 1.08, -73.6), B(0.3, 0.38, 0.28, NOIR, m.x0 + 0.3, 1.13, -69.2), B(0.66, 1.85, 0.66, '#d6d9dc', m.x0 + 0.34, 0.93, -68.25));
    col(m.x0, -74.4, m.x0 + 0.68, -67.9);
    tableR(201.6, -71.4, 1.0, 3.0, '#b99a72');
    for (const dz of [-1.05, -0.35, 0.35, 1.05]) { chaiseS(200.85, -71.4 + dz, Math.PI / 2, '#3f7d4a'); chaiseS(202.35, -71.4 + dz, -Math.PI / 2, '#3f7d4a'); }
    plante(m.x1 - 0.4, m.z0 + 0.45, 1.3); plante(m.x0 + 0.4, m.z0 + 0.4);
  }
  // la chaufferie : la chaudière murale, le ballon d'eau chaude, les tuyaux
  {
    const c = P.chaufferie;
    G.push(B(0.6, 0.85, 0.4, '#f2f2ef', c.x0 + 1.0, 1.55, c.z0 + 0.25), C(0.3, 0.3, 1.5, 12, '#e8eaec', c.x1 - 0.45, 0.85, c.z0 + 0.45));
    for (const dx of [-0.15, 0, 0.15]) G.push(C(0.02, 0.02, 1.1, 6, '#b87333', c.x0 + 1.0 + dx, 0.6, c.z0 + 0.15));
    G.push(C(0.025, 0.025, 2.2, 6, '#b87333', (c.x0 + c.x1) / 2, 2.2, c.z0 + 0.12, 'x'));
    col(c.x0 + 0.65, c.z0, c.x1, c.z0 + 0.8);
  }
  // les sanitaires : la cuvette et son réservoir, le lavabo et son miroir, le distributeur de papier
  // (la porte du sanitaire 2 est au nord : sa cuvette et son lavabo de l'autre côté)
  for (const k of ['san1', 'san2', 'san3']) {
    const s = P[k], xm = (s.x0 + s.x1) / 2, sg = k === 'san2' ? -1 : 1, zf = sg > 0 ? s.z0 : s.z1, zl = sg > 0 ? s.z1 : s.z0;
    G.push(B(0.38, 0.4, 0.55, '#fbfbfa', xm, 0.2, zf + sg * 0.42), B(0.4, 0.35, 0.18, '#fbfbfa', xm, 0.6, zf + sg * 0.1), B(0.36, 0.04, 0.45, '#fbfbfa', xm, 0.42, zf + sg * 0.45));
    G.push(B(0.5, 0.15, 0.4, '#fbfbfa', s.x1 - 0.3, 0.82, zl - sg * 0.7), B(0.02, 0.6, 0.45, '#cfe0ea', s.x1 - 0.06, 1.45, zl - sg * 0.7), B(0.04, 0.25, 0.18, '#d8dadc', s.x0 + 0.06, 1.1, zf + sg * 0.9));
    col(xm - 0.22, zf, xm + 0.22, zf + sg * 0.72); col(s.x1 - 0.55, zl - sg * 0.95, s.x1, zl - sg * 0.45);
  }
  // la réserve : des étagères de cartons d'archives et de ramettes
  {
    const r = P.reserve;
    for (const [x, z, rot, w] of [[r.x0 + 0.3, (r.z0 + r.z1) / 2, Math.PI / 2, 1.8], [(r.x0 + r.x1) / 2 + 0.3, r.z0 + 0.3, 0, 2.6]]) {
      const q = R(x, z, rot);
      for (let k = 0; k < 4; k++) { boite(q, rot, w, 0.03, 0.45, GRIS, 0, 0.3 + k * 0.5, 0); for (let i = 0; i < Math.floor(w / 0.42); i++) boite(q, rot, 0.36, 0.28, 0.38, (i + k) % 3 ? '#e9e1cf' : '#ffffff', -w / 2 + 0.24 + i * 0.42, 0.46 + k * 0.5, 0); }
      emprise(q, rot, w, 0.45);
    }
  }
  // la buanderie : lave-linge et sèche-linge, un évier, le seau et son balai, une étagère de produits
  {
    const b = P.buanderie;
    G.push(B(0.6, 0.85, 0.6, '#fbfbfa', b.x0 + 0.4, 0.43, b.z1 - 0.95), B(0.6, 0.85, 0.6, '#fbfbfa', b.x0 + 0.4, 1.3, b.z1 - 0.95), C(0.2, 0.2, 0.02, 12, '#8d9196', b.x0 + 0.71, 0.48, b.z1 - 0.95, 'x'));
    G.push(C(0.16, 0.13, 0.3, 8, '#2e86de', b.x1 - 0.5, 0.15, b.z0 + 0.5), C(0.015, 0.015, 1.3, 4, '#c9a55a', b.x1 - 0.3, 0.65, b.z0 + 0.3));
    for (let k = 0; k < 3; k++) G.push(B(1.4, 0.03, 0.35, GRIS, (b.x0 + b.x1) / 2, 1.0 + k * 0.45, b.z0 + 0.2));
    for (let i = 0; i < 6; i++) G.push(C(0.05, 0.05, 0.22, 6, ['#2e86de', '#e0b13a', '#c0392b', '#3f7d4a'][i % 4], (b.x0 + b.x1) / 2 - 0.55 + i * 0.22, 1.13 + (i % 2) * 0.45, b.z0 + 0.2));
    col(b.x0, b.z1 - 1.3, b.x0 + 0.72, b.z1 - 0.6); col(b.x1 - 0.7, b.z0, b.x1, b.z0 + 0.7);
  }
  // le couloir : la photocopieuse, des plantes, des extincteurs, un panneau d'affichage
  G.push(B(0.7, 1.1, 0.65, '#e8eaec', 208.0, 0.55, -58.75), B(0.6, 0.12, 0.6, '#c9ccd1', 208.0, 1.16, -58.75)); col(207.65, -59.1, 208.35, -58.4);
  plante(206.7, -60.6); plante(215.6, -70.6, 1.1); plante(215.0, -69.5);
  extincteur(215.42, -63.6); extincteur(206.4, -69.6);
  G.push(B(1.0, 0.8, 0.02, '#c9a87a', 211.75, 1.5, wz(319) - 0.06), B(0.21, 0.29, 0.004, '#f6f4ee', 211.5, 1.6, wz(319) - 0.075), B(0.21, 0.29, 0.004, '#fde3a7', 212.0, 1.45, wz(319) - 0.075));

  // les lampes (modeles.js : definirInterieur) : six, aux carrefours des pièces
  const lampes = [[199.5, 2.6, -57.2], [199.5, 2.6, -71.5], [204.6, 2.6, -60.5], [210.0, 2.6, -72.2], [219.6, 2.6, -58.6], [214.0, 2.6, -67.5]];
  return { geos: G, boites, lampes, postes };
}

/* ---------------------------------------------------------------- le jeu
   Entrer et sortir par la porte d'entrée (gestes.js : passer, le fondu au noir au seuil) ; dedans, le toit n'est plus
   dessiné, la caméra plonge d'en haut et suit (camera.js : plongee), les commandes suivent son axe. Ceux qui travaillent
   là (cinq, assis à leur poste, les mains sur le clavier) sont créés à la première visite. */
export class Solumatic {
  // c : { jeu, monde, scene, gestes, hud, ctrl, cam, tel, regarder(dedans, loin) } (main.js)
  constructor(c) {
    this.c = c; this.L = c.monde.lieux.solumatic; this.employes = []; this.vu = false;
    const h = c.hud;
    this.etq = { entrer: h.action('Entrer chez Solumatic'), sortir: h.action('Sortir') };
    this.etiquettes = Object.values(this.etq);
    this.porte = c.monde.porteSolu;
  }
  pres(p, d) { const j = this.c.jeu.joueur.pos; return Math.hypot(j.x - p.x, j.z - p.z) < d; }
  get dedans() { return this.c.jeu.dedans === 'solumatic'; }
  get porteDehors() { const j = this.c.jeu; return !j.dedans && !j.auVolant && this.pres(this.L.dehors, 2.4); }
  get porteDedans() { return this.dedans && this.pres(this.L.dedans, 1.6); }
  agir() {
    if (this.porteDedans) { this.passer(false); return true; }
    if (this.porteDehors) { this.passer(true); return true; }
    return false;
  }
  passer(entrer) {
    const c = this.c;
    c.ctrl.relacher();
    if (entrer) this.peupler();
    // la porte fermée arrête (on n'entre pas sans la passer) ; le temps de la passer, plus
    const pc = this.L.colPorte;
    if (pc) pc.fantome = true;
    c.gestes.passer(this.L, entrer, {
      fondu: noir => $('fondu').classList.toggle('noir', noir),
      passe: () => { c.jeu.dedans = entrer ? 'solumatic' : false; c.regarder(entrer, 46); c.cam.pret = false; c.cam.yaw = entrer ? Math.PI : 0; this.voir(); },
      fin: () => { if (pc) pc.fantome = false; },
    });
  }
  // le toit, ou l'intérieur (dedans, ou porte ouverte : par l'embrasure, on voit le hall)
  voir() {
    const m = this.c.monde, d = this.dedans;
    m.toitSolu.visible = !d;
    m.interieurSolu.visible = d || this.porte.rotation.y > 0.01;
    for (const p of this.employes) p.m.groupe.visible = d;
  }
  // ceux qui travaillent là : à leur poste, les mains sur le clavier (créés une fois)
  peupler() {
    if (this.employes.length) return;
    const T = [
      { femme: true, peau: '#f1c27d', cheveux: '#5a3a22', coiffure: 'carre', tenue: 'pull', haut: '#ef6c26', bas: '#2f3440', lunettes: true },
      { peau: '#e0ac69', cheveux: '#2b1d0e', coiffure: 'court', barbe: true, tenue: 'chemise', haut: '#e9eef4', bas: '#2f3440' },
      { femme: true, peau: '#c68642', cheveux: '#151515', coiffure: 'queue', tenue: 'chemise', haut: '#3d5a80', bas: '#34343a' },
      { peau: '#f0c8a0', cheveux: '#8a6a48', coiffure: 'court', tenue: 'pull', haut: '#3f7d4a', bas: '#3b4150', lunettes: true },
      { peau: '#d9a27e', cheveux: '#3b2a1a', coiffure: 'court', tenue: 'veste', haut: '#2c3e66', bas: '#2f2f35' },
    ];
    this.L.postes.forEach((s, i) => {
      const p = new Pieton(perso({ ...T[i % T.length], chapeau: null }));
      p.assis = true; p.clavier = true;
      p.m.groupe.position.set(s.x, -0.34, s.z); p.m.groupe.rotation.y = s.h; p.h = s.h;
      p.sync(0, 0); p.pos.copy(p.m.groupe.position); p.etq = this.c.hud.etiquette('', 'bulle');
      p.m.groupe.visible = false; p.ph = i * 1.7; p.tParle = 0; p.i = i;
      this.c.scene.add(p.m.groupe); this.employes.push(p);
    });
  }
  // les étiquettes de la porte ; dedans, ceux qui travaillent (ils lèvent les yeux, saluent qui passe tout près) ; rend
  // vrai si une étiquette est proposée
  maj(dt, t) {
    const c = this.c, libre = !c.tel.ouvert && !c.gestes.actif, h = c.hud, L = this.L;
    const dehors = libre && this.porteDehors, dedans = libre && this.porteDedans;
    h.placer(this.etq.entrer, L.seuil.x, 2.6, L.seuil.z + 0.3, dehors);
    h.placer(this.etq.sortir, L.seuil.x, 2.3, L.seuil.z - 0.5, dedans);
    const vu = this.dedans || this.porte.rotation.y > 0.01;
    if (vu !== this.vu) { this.vu = vu; this.voir(); }
    if (this.dedans) {
      const j = c.jeu.joueur.pos;
      for (const p of this.employes) {
        const d = Math.hypot(j.x - p.pos.x, j.z - p.pos.z);
        // le regard : l'écran, et de temps en temps, qui passe près
        p.regard = d < 3.2 ? { x: j.x, y: 1.6, z: j.z } : null;
        p.tParle -= dt;
        if (d < 2.4 && p.tParle <= 0) { p.tParle = 45; p.saluer(); h.bulle(p.etq, TXT.bonjour[p.i++ % TXT.bonjour.length], 3); }
        p.sync(dt, t + p.ph);
        if (p.etq.vu) h.placer(p.etq, p.pos.x, 1.75, p.pos.z, true);
      }
    }
    return dehors || dedans;
  }
  camera(dt) { const j = this.c.jeu.joueur.pos; this.c.cam.plongee(dt, j.x, j.z); }
}
