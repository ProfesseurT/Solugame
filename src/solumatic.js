// Les bureaux de Solumatic, au fond de la zone d'activités des Coteaux (Teddy, 25/11/2026 : « tu vas reprendre
// l'entreprise Solumatic, le vrai logo dessus » ; « on est sur un rez-de-chaussée unique » ; « on va pouvoir rentrer
// dedans »). Le bâtiment est dessiné dans monde.js (zoneActivites) ; ici : sa place, le plan de l'intérieur, son mobilier,
// ses écrans et ses affiches, ceux qui y travaillent, et le jeu (entrer, sortir, la caméra à hauteur d'homme).
//
// Le plan (Teddy, 26/11/2026 : le plan d'évacuation affiché dans l'entrée, photographié de biais et redressé, 21,35 x
// 25,6 m dedans) est posé tourné d'un demi-tour : son haut (l'atelier, Soleil, Atlas, « qui donnent sur la devanture »)
// est la façade sud, sur le parvis et la grille ; sa gauche (la porte de l'atelier, l'entrée, Mars, Terre, Vénus, Mercure)
// est la façade est. Les pièces, d'après Teddy : Jupiter, la salle des développeurs ; Uranus, le bureau du patron ;
// Neptune, celui de son associé ; Saturne, les commerciaux (quatre) ; Mercure, une salle de réunion ; Atlas, la grande
// salle de réunion (« une belle télé, un baby-foot, des tables en U ») ; Mars, la cuisine ; l'atelier et Soleil, la
// maintenance et la formation ; « souvent des îlots de bureaux ». Terre et Vénus, deux bureaux ; au milieu, la
// chaufferie (au fioul), les sanitaires, le local ménage, les moyens généraux, entourés du couloir. Seule la disposition
// des pièces est reprise du plan (ni l'adresse, ni le reste du document).
import * as THREE from 'three';
import { B, C, S, fusion, UNI } from './modeles.js';
import { perso } from './perso.js';
import { Pieton } from './pieton.js';
import { logoSolumatic } from './logo.js';
import { SOLUMATIC as TXT } from './textes.js';
import { $, hasard } from './outils.js';

// Le plan en mètres : u vers la droite du plan (l'ouest), v vers le bas (le nord), depuis l'angle intérieur en haut à
// gauche (au sud-est). Murs extérieurs de 30 cm, 3,6 m sous l'acrotère ; dedans, un faux plafond à 2,7 m.
const XE = 221.6, ZS = -54, LU = 21.35, LV = 25.6;
const X = u => XE - u, Z = v => ZS - v;
export const SOLU = { x0: X(LU), x1: XE, z0: Z(LV), z1: ZS, ep: 0.3, H: 3.6, HC: 2.75, HP: 2.7 };
// une pièce du plan [u0, v0, u1, v1] : son rectangle dans le monde
const piece = ([u0, v0, u1, v1]) => ({ x0: X(u1), x1: X(u0), z0: Z(v1), z1: Z(v0) });
const P = {
  atelier: piece([0, 0, 6.45, 6.15]), soleil: piece([6.55, 0, 13.67, 6.15]), atlas: piece([13.77, 0, LU, 8.1]),
  hall: piece([0, 6.25, 4.72, 9.15]), mars: piece([0, 9.25, 4.72, 15.4]), terre: piece([0, 15.5, 4.72, 18.45]),
  venus: piece([0, 18.55, 4.72, 21.45]), mercure: piece([0, 21.55, 9.1, LV]), neptune: piece([9.2, 21.55, 12.4, LV]),
  uranus: piece([12.5, 21.6, 16.9, LV]), saturne: piece([17.0, 20.2, LU, LV]), jupiter: piece([15.67, 8.2, LU, 20.1]),
  chaufferie: piece([6.75, 8.2, 9.75, 12.0]), sanit1: piece([9.85, 8.2, 13.67, 12.0]), sanit2: piece([6.75, 12.1, 9.9, 15.35]),
  wc: piece([10.0, 12.1, 11.85, 15.35]), sanit3: piece([11.95, 12.1, 13.67, 15.35]), menage: piece([6.75, 15.45, 9.05, 19.65]),
  moyens: piece([9.15, 15.45, 13.67, 19.65]),
};

// l'entrée : une porte vitrée dans la façade est, au bout de l'entrée ; la double porte de l'atelier, juste au sud ; la
// double porte vitrée d'Atlas, dans la devanture
export const ENTREE = { z: +Z(7.03).toFixed(2), l: 1.05, h: 2.2 };
export const PORTE_ATELIER = { z: Z(5.0), l: 2.0, h: 2.3 };
export const PORTE_ATLAS = { x: X(18.55), l: 2.7, h: 2.3 };
// les deux vitrines de l'atelier, dans la devanture (rideaux métalliques levés le jour)
export const VITRINES = [X(1.9), X(4.7)], VITRINE = { l: 1.8, y0: 0.45, y1: 2.4 };
// les fenêtres des murs extérieurs : [mur, position le long, largeur] (sud et nord : x ; est et ouest : z)
export const FENETRES = [
  ['s', X(7.68), 1.85], ['s', X(10.68), 1.85], ['s', X(16.57), 1.15],
  ['e', Z(11.2), 1.6], ['e', Z(14.22), 1.85], ['e', Z(17.05), 1.8], ['e', Z(19.67), 1.95], ['e', Z(22.75), 2.0],
  ['n', X(4.98), 1.95], ['n', X(7.92), 1.95], ['n', X(10.9), 2.0], ['n', X(13.85), 1.9],
  ['o', Z(4.8), 2.0], ['o', Z(7.08), 2.05], ['o', Z(10.6), 2.7], ['o', Z(13.4), 2.5], ['o', Z(16.45), 3.0], ['o', Z(19.08), 1.75],
  ['o', Z(21.88), 2.75], ['o', Z(24.5), 1.9],
];

/* Les cloisons du plan, en mètres (axes) : ['u', u, v0, v1, portes] (le long de v) ou ['v', v, u0, u1, portes] (le long
   de u). Une porte : [centre, largeur, charnière (-1 : au début, 1 : à la fin, 0 : double porte), côté où s'ouvre le
   battant (-1, 1), angle d'ouverture (0 : fermée)]. Les portes qui donneraient dans un couloir s'ouvrent du côté de la
   pièce, contre le mur : on passe sans se cogner. */
const D = Math.PI / 2, A = 2.9;
const CLOISONS = [
  ['u', 6.5, 0, 6.2, [[3.62, 1.45, 0, 1, D]]],                                         // atelier | Soleil
  ['v', 6.2, 0, 6.5, [[5.85, 1.0, 1, 1, D]]],                                         // atelier | entrée
  ['v', 6.2, 6.5, 13.72, []],                                                          // Soleil | couloir
  ['u', 13.72, 0, 8.15, [[7.18, 1.05, -1, 1, A]]],                                     // Soleil, couloir | Atlas
  ['v', 9.2, 0, 4.77, []],                                                             // entrée | Mars
  ['u', 4.77, 7.7, 21.5, [[9.97, 0.95, -1, -1, D], [14.55, 1.0, 1, -1, D], [16.17, 0.85, -1, -1, D], [19.22, 0.95, -1, -1, D]]],
  ['v', 15.45, 0, 4.77, []], ['v', 18.5, 0, 4.77, []],                                // Mars | Terre | Vénus
  ['v', 21.5, 0, 9.15, [[5.45, 1.1, -1, 1, D]]],                                       // Vénus, couloir | Mercure
  ['u', 9.15, 21.5, LV + 0.15, []],                                                    // Mercure | Neptune
  ['v', 21.5, 9.15, 12.45, [[11.78, 1.15, 1, 1, D]]],                                  // couloir | Neptune
  ['u', 12.45, 21.5, LV + 0.15, []],                                                   // Neptune | Uranus
  ['v', 21.55, 12.45, 16.95, [[16.28, 1.15, 1, 1, D]]],                                // couloir | Uranus
  ['u', 16.95, 18.85, LV + 0.15, [[19.5, 1.2, -1, 1, D], [20.82, 1.2, 1, 1, D]]],     // couloir | Jupiter, Saturne
  ['v', 20.15, 16.95, LU + 0.15, []],                                                  // Jupiter | Saturne
  ['v', 18.85, 15.62, 16.95, []],
  ['u', 15.62, 8.15, 18.85, [[14.3, 1.6, 0, 1, D]]],                                   // couloir | Jupiter
  ['v', 8.15, 13.72, LU + 0.15, [[14.75, 1.0, 1, -1, A], [18.6, 2.0, 0, 1, D]]],      // Atlas | couloir, Jupiter
  // le bloc du milieu : chaufferie, sanitaires, local ménage, moyens généraux
  ['v', 8.15, 6.7, 13.72, [[9.18, 0.95, -1, 1, D]]],
  ['u', 6.7, 8.15, 19.7, [[14.38, 0.95, -1, 1, D], [18.6, 1.0, -1, 1, D]]],
  ['v', 19.7, 6.7, 13.72, []],
  ['u', 13.72, 8.15, 19.7, [[10.1, 1.0, -1, -1, D], [14.05, 1.0, 1, -1, D], [16.0, 1.0, -1, -1, D]]],
  ['u', 9.8, 8.15, 12.05, []], ['v', 12.05, 6.7, 13.72, []], ['v', 15.4, 6.7, 13.72, []], ['u', 9.1, 15.4, 19.7, []],
  ['u', 9.95, 12.05, 15.4, [[12.9, 0.7, -1, -1, 0], [14.65, 0.7, -1, -1, 0]]], ['u', 11.9, 12.05, 15.4, [[12.9, 0.7, -1, 1, 0]]],
  ['v', 13.75, 9.95, 11.9, []],
  ['v', 10.75, 9.8, 13.72, [[10.75, 0.7, -1, -1, 0], [12.65, 0.7, -1, -1, 0]]], ['u', 11.7, 10.75, 12.05, []],
];

const BLANC = '#eeece6', CADRE = '#d9d5cc', BOIS = '#b9935f', NOIR = '#24262b', GRIS = '#8d9196', ECRAN = '#151a22';
const ORANGE = '#ef6c26', VITRE = '#3a5068', PLAFOND = '#f1f0eb', LED = '#eef0f2', PLAN = '#e9e4da', PARQUET = '#9a7b55';
// les caps : vers la devanture (le sud), vers le nord, l'est, l'ouest
const SUD = 0, NORD = Math.PI, EST = Math.PI / 2, OUEST = -Math.PI / 2;

/* ---------------------------------------------------------------- les écrans et les affiches
   Une seule petite texture (1024 x 512), peinte une fois : le plan d'évacuation de l'entrée, le logo, les écrans (le code
   des développeurs, le logiciel des commerciaux, un bureau, la diapositive de la formation, la télé d'Atlas), le tableau
   des tâches de Jupiter, deux affiches. Ses cases : [x, y, largeur, hauteur] en pixels. */
const ATLAS = {
  plan: [0, 0, 280, 380], logo: [284, 0, 512, 121], bureau: [800, 0, 224, 126],
  code: [284, 125, 256, 144], crm: [544, 125, 256, 144], formation: [804, 130, 220, 124],
  tele: [284, 273, 400, 225], kanban: [688, 258, 336, 200], ventes: [688, 462, 336, 50],
  vitisoft: [0, 384, 90, 128], viticode: [94, 384, 90, 128], equipe: [188, 384, 92, 128],
};
function peindre(c) {
  const R = (x, y, w, h, f) => { c.fillStyle = f; c.fillRect(x, y, w, h); };
  const T = (t, x, y, taille, f, gras = true, al = 'center') => { c.fillStyle = f; c.font = `${gras ? 'bold ' : ''}${taille}px Arial, sans-serif`; c.textAlign = al; c.textBaseline = 'middle'; c.fillText(t, x, y); };
  const r = hasard(5);
  // le plan d'évacuation : les pièces du plan, les sorties en vert, « Vous êtes ici » en rouge
  {
    const [x0, y0, w, h] = ATLAS.plan, k = 11, ox = x0 + (w - LU * k) / 2, oy = y0 + 60;
    R(x0, y0, w, h, '#f6f5f0'); R(x0, y0, w, 40, '#2c3e66'); T('Plan d\'évacuation', x0 + w / 2, y0 + 20, 20, '#ffffff');
    c.strokeStyle = '#1d1d1d'; c.lineWidth = 3; c.strokeRect(ox, oy, LU * k, LV * k); c.lineWidth = 1.5;
    for (const [o, m, a, b] of CLOISONS) { c.beginPath(); if (o === 'u') { c.moveTo(ox + m * k, oy + a * k); c.lineTo(ox + m * k, oy + b * k); } else { c.moveTo(ox + a * k, oy + m * k); c.lineTo(ox + b * k, oy + m * k); } c.stroke(); }
    const noms = [['Atelier', 3.2, 3], ['Soleil', 10.1, 3], ['Atlas', 17.5, 3.5], ['Mars', 2.35, 12.3], ['Terre', 2.35, 17], ['Vénus', 2.35, 20], ['Mercure', 4.5, 23.6], ['Neptune', 10.8, 23.6], ['Uranus', 14.7, 23.6], ['Saturne', 19.2, 23], ['Jupiter', 18.5, 14]];
    for (const [n, u, v] of noms) T(n, ox + u * k, oy + v * k, 10, '#1d1d1d', false);
    c.fillStyle = '#2e9e4f'; for (const [u, v] of [[-0.6, 7.03], [18.55, -0.6]]) { c.beginPath(); c.arc(ox + u * k, oy + v * k, 5, 0, 7); c.fill(); }
    c.fillStyle = '#d0312d'; c.beginPath(); c.arc(ox + 1.2 * k, oy + 6.9 * k, 6, 0, 7); c.fill();
    R(x0 + 10, y0 + h - 34, 16, 16, '#d0312d'); T('Vous êtes ici', x0 + 32, y0 + h - 26, 14, '#1d1d1d', true, 'left');
  }
  // le logo, sur fond blanc
  { const [x, y, w, h] = ATLAS.logo; R(x, y, w, h, '#ffffff'); logoSolumatic(c, x + 16, y + 6, w - 32); }
  // un écran de bureau : une fenêtre claire, sa barre bleue, des lignes
  {
    const [x, y, w, h] = ATLAS.bureau; R(x, y, w, h, '#eef1f5'); R(x, y, w, 14, '#2c5b8c'); R(x, y + 14, 46, h - 14, '#dfe5ec');
    for (let i = 0; i < 8; i++) { R(x + 54, y + 24 + i * 12, 60 + r() * 90, 5, '#9aa6b4'); R(x + 6, y + 24 + i * 12, 32, 5, '#b4bfcc'); }
  }
  // le code des développeurs : un éditeur sombre, des lignes en couleurs, en retrait
  {
    const [x, y, w, h] = ATLAS.code; R(x, y, w, h, '#1e2430'); R(x, y, 34, h, '#191e28'); R(x, y, w, 10, '#141821');
    const cols = ['#c792ea', '#82aaff', '#c3e88d', '#f78c6c', '#89ddff', '#ffcb6b', '#a6accd'];
    for (let i = 0; i < 15; i++) {
      let px = x + 40 + Math.floor(r() * 4) * 12; const py = y + 15 + i * 8.5;
      R(x + 8, py, 14, 4, '#4b5263');
      for (let j = 0, n = 1 + Math.floor(r() * 4); j < n && px < x + w - 20; j++) { const l = 12 + r() * 46; R(px, py, l, 4, cols[Math.floor(r() * cols.length)]); px += l + 6; }
    }
  }
  // le logiciel des commerciaux : un tableau clair, une colonne orange, des lignes
  {
    const [x, y, w, h] = ATLAS.crm; R(x, y, w, h, '#fbfbfa'); R(x, y, w, 16, '#33363d'); R(x, y + 16, 40, h - 16, '#f1ede6');
    for (let i = 0; i < 4; i++) R(x + 8, y + 26 + i * 14, 24, 6, i === 1 ? ORANGE : '#c9c4ba');
    R(x + 48, y + 24, w - 56, 14, '#f3e3d6');
    for (let i = 0; i < 8; i++) { R(x + 48, y + 44 + i * 12, w - 56, 1, '#e2ded6'); R(x + 52, y + 47 + i * 12, 50 + r() * 40, 4, '#7b808a'); R(x + 160, y + 47 + i * 12, 30 + r() * 30, 4, '#a7abb3'); R(x + w - 30, y + 46 + i * 12, 18, 6, ['#5fb87a', '#e0b13a', ORANGE][i % 3]); }
  }
  // la diapositive de la formation
  {
    const [x, y, w, h] = ATLAS.formation; R(x, y, w, h, '#ffffff'); R(x, y, w, 26, ORANGE); T('Formation', x + w / 2, y + 13, 16, '#ffffff');
    for (let i = 0; i < 5; i++) { c.fillStyle = ORANGE; c.beginPath(); c.arc(x + 20, y + 44 + i * 16, 3, 0, 7); c.fill(); R(x + 30, y + 42 + i * 16, 70 + r() * 90, 5, '#5a5d63'); }
  }
  // la télé d'Atlas : le logo, un bandeau orange
  { const [x, y, w, h] = ATLAS.tele; R(x, y, w, h, '#ffffff'); logoSolumatic(c, x + 40, y + 62, w - 80); R(x, y + h - 30, w, 30, ORANGE); R(x, y + h - 34, w, 4, '#c85a1f'); }
  // le tableau des tâches de Jupiter : quatre colonnes, des post-it
  {
    const [x, y, w, h] = ATLAS.kanban; R(x, y, w, h, '#fbfbf8'); c.strokeStyle = '#9aa0a6'; c.lineWidth = 2;
    ['À faire', 'En cours', 'À relire', 'Fait'].forEach((t, i) => { const cx = x + i * w / 4; T(t, cx + w / 8, y + 14, 13, '#2b2d31'); if (i) { c.beginPath(); c.moveTo(cx, y + 6); c.lineTo(cx, y + h - 6); c.stroke(); } });
    const pi = ['#ffe36e', '#9fe0a8', '#8fd1ff', '#ffb0b0', '#ffd08a'];
    for (let i = 0; i < 4; i++) for (let j = 0, n = [5, 3, 2, 6][i]; j < n; j++) R(x + i * w / 4 + 8 + (j % 2) * 38, y + 30 + Math.floor(j / 2) * 40, 32, 32, pi[Math.floor(r() * pi.length)]);
  }
  // le tableau blanc des commerciaux : des barres au feutre
  { const [x, y, w, h] = ATLAS.ventes; R(x, y, w, h, '#fbfbf8'); for (let i = 0; i < 10; i++) { const b = 8 + r() * 32; R(x + 14 + i * 31, y + h - 4 - b, 18, b, i % 3 ? '#2e86de' : ORANGE); } }
  // deux affiches (les noms des logiciels, sans rien promettre), la photo de l'équipe
  {
    const aff = ([x, y, w, h], nom, fond, texte, motif) => { R(x, y, w, h, fond); R(x + 6, y + 6, w - 12, h - 12, texte === '#ffffff' ? fond : '#ffffff'); motif(x, y, w, h); T(nom, x + w / 2, y + h - 22, 14, texte); };
    aff(ATLAS.vitisoft, 'Vitisoft', '#2b2d31', '#ffffff', (x, y, w) => { c.fillStyle = '#8e2c48'; for (const [dx, dy] of [[0, 0], [-10, 12], [10, 12], [-5, 24], [5, 24], [0, 36]]) { c.beginPath(); c.arc(x + w / 2 + dx, y + 30 + dy, 7, 0, 7); c.fill(); } });
    aff(ATLAS.viticode, 'Viticode', '#ffffff', '#2b2d31', (x, y, w) => { const q = 6; for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if ((i < 3 && j < 3) || (i > 5 && j < 3) || (i < 3 && j > 5) || r() < 0.45) R(x + w / 2 - 27 + i * q, y + 22 + j * q, q, q, '#2b2d31'); });
    const [x, y, w, h] = ATLAS.equipe; R(x, y, w, h, '#3b3f46'); R(x + 5, y + 5, w - 10, h - 10, '#c9d6df'); R(x + 5, y + h * 0.62, w - 10, h * 0.38 - 5, '#8aa070');
    for (let i = 0; i < 6; i++) { const px = x + 14 + i * 13, py = y + 58 + (i % 2) * 8; c.fillStyle = ['#ef6c26', '#2e86de', '#3f7d4a', '#8e44ad', '#2b2d31', '#e0b13a'][i]; c.fillRect(px - 5, py, 10, 22); c.fillStyle = '#e0ac69'; c.beginPath(); c.arc(px, py - 5, 5, 0, 7); c.fill(); }
  }
}
// Les panneaux texturés : affiches (éclairées comme la pièce) et écrans (lumineux). q : [{ zone, x, y, z, rot, w, h }]
export function panneauxSolumatic(affiches, ecrans) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
  peindre(cv.getContext('2d'));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const maillage = (liste, mat, nom) => {
    const geos = liste.map(({ zone, x, y, z, rot, w, h }) => {
      const [px, py, pw, ph] = ATLAS[zone], g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (px + uv.getX(i) * pw) / 1024, 1 - (py + (1 - uv.getY(i)) * ph) / 512);
      g.rotateY(rot); g.translate(x, y, z);
      return g;
    });
    const m = new THREE.Mesh(fusion(geos), mat); m.name = nom; m.matrixAutoUpdate = false;
    return m;
  };
  return [maillage(affiches, new THREE.MeshLambertMaterial({ map: tex }), 'affiches Solumatic'), maillage(ecrans, new THREE.MeshBasicMaterial({ map: tex }), 'écrans Solumatic')];
}

/* ---------------------------------------------------------------- l'intérieur
   Rend { geos, vitres (les vitres, vues de dedans : le jour derrière), boites (ce qui arrête : [x0, z0, x1, z1]),
   tournees (les battants ouverts : [cx, cz, largeur, épaisseur, rot]), murs et portes (pour la caméra : les cloisons, les
   embrasures ouvertes), pieces et lampes (pour la lumière), affiches, ecrans, gens (ceux qui y travaillent : leur place et
   leur rôle), babyfoot }. Tout en coordonnées du monde. */
export function interieurSolumatic() {
  const G = [], V = [], boites = [], tournees = [], murs = [], portes = [], affiches = [], ecrans = [], gens = [];
  const e = 0.1, HP = SOLU.HP, HPO = 2.1;
  const col = (x0, z0, x1, z1) => boites.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
  // une boîte du plan [u0, v0, u1, v1], de y0 à y1
  const PB = (u0, v0, u1, v1, y0, y1, c) => G.push(B(Math.abs(u1 - u0), y1 - y0, Math.abs(v1 - v0), c, X((u0 + u1) / 2), (y0 + y1) / 2, Z((v0 + v1) / 2)));
  const colP = (u0, v0, u1, v1, liste = boites) => liste.push([X(Math.max(u0, u1)), Z(Math.max(v0, v1)), X(Math.min(u0, u1)), Z(Math.min(v0, v1))]);
  const affiche = (zone, x, y, z, rot, w, h, lumineux = false) => (lumineux ? ecrans : affiches).push({ zone, x, y, z, rot, w, h });
  const ouvert = (a, b, trous) => { // les morceaux de [a, b] hors des trous [c, l]
    const r = []; let p = a;
    for (const [c, l] of [...trous].sort((s, t) => s[0] - t[0])) { if (c - l / 2 > p) r.push([p, c - l / 2]); p = Math.max(p, c + l / 2); }
    if (b > p) r.push([p, b]);
    return r;
  };

  /* -- les sols : le couloir en carrelage clair, chaque pièce le sien ; le faux plafond, ses dalles et ses luminaires */
  const sol = (q, c, y = 0.022) => G.push(B(q.x1 - q.x0, 0.02, q.z1 - q.z0, c, (q.x0 + q.x1) / 2, y - 0.01, (q.z0 + q.z1) / 2));
  sol({ x0: SOLU.x0, x1: SOLU.x1, z0: SOLU.z0, z1: SOLU.z1 }, '#c9cac5', 0.016);
  for (const k of ['terre', 'venus', 'saturne', 'jupiter', 'soleil']) sol(P[k], k === 'jupiter' ? '#6f7a88' : '#7c8591');
  sol(piece([16.95, 18.9, 17.05, 20.1]), '#6f7a88'); // (le bas de Jupiter, au pas de sa porte)
  for (const k of ['atlas', 'mercure', 'neptune', 'uranus']) sol(P[k], PARQUET);
  for (const k of ['mars', 'hall', 'sanit1', 'sanit2', 'sanit3', 'wc']) sol(P[k], '#dfe2e1');
  for (const k of ['atelier', 'chaufferie', 'menage', 'moyens']) sol(P[k], '#a3a29c');
  PB(0, 0, LU, LV, HP, HP + 0.03, PLAFOND);
  for (let u = 0.6; u < LU; u += 0.6) PB(u - 0.012, 0, u + 0.012, LV, HP - 0.008, HP, '#d6d5cf');
  for (let v = 0.6; v < LV; v += 0.6) PB(0, v - 0.012, LU, v + 0.012, HP - 0.008, HP, '#d6d5cf');

  /* -- les lampes, pièce par pièce (modeles.js : definirInterieur ; une pièce n'est éclairée que par les siennes) ; leurs
     dalles lumineuses au plafond */
  const pieces = [];
  const eclairer = (q, pts) => {
    pieces.push({ x0: q.x0 - 0.04, x1: q.x1 + 0.04, z0: q.z0 - 0.04, z1: q.z1 + 0.04, lampes: pts.map(([x, z]) => [x, 2.35, z]) });
    for (const [x, z] of pts) G.push(B(0.6, 0.02, 0.6, LED, x, HP - 0.012, z), B(0.64, 0.012, 0.64, '#c9ccd1', x, HP - 0.004, z));
  };
  eclairer(P.atelier, [[218.4, -55.9], [218.4, -58.6]]); eclairer(P.soleil, [[209.9, -57.1], [213.1, -57.1]]);
  eclairer(P.atlas, [[203.6, -56.2], [206.1, -56.2], [203.6, -59.9], [206.4, -60.4]]); eclairer(P.hall, [[219.2, -61.7]]);
  eclairer(P.mars, [[219.2, -65.0], [219.2, -67.9]]); eclairer(P.terre, [[219.2, -71.0]]); eclairer(P.venus, [[219.2, -74.0]]);
  eclairer(P.mercure, [[214.6, -77.6], [218.6, -77.6]]); eclairer(P.neptune, [[210.8, -77.6]]); eclairer(P.uranus, [[206.9, -77.6]]);
  eclairer(P.saturne, [[202.4, -75.9], [202.4, -78.2]]); eclairer(P.jupiter, [[202.9, -63.6], [202.9, -66.4], [202.9, -69.3], [202.9, -72.2]]);
  eclairer(P.chaufferie, [[213.3, -64.1]]); eclairer(P.sanit1, [[209.8, -63.4]]); eclairer(P.sanit2, [[213.3, -67.7]]); eclairer(P.sanit3, [[208.8, -67.7]]);
  eclairer(P.menage, [[213.7, -71.5]]); eclairer(P.moyens, [[210.2, -71.5]]); eclairer(P.wc, [[210.7, -67.7]]);
  // les couloirs : ce qui n'est dans aucune pièce
  const lampesCouloir = [[212.3, -61.2], [215.9, -61.2], [215.9, -66.0], [215.9, -71.0], [215.9, -74.6], [211.0, -74.6], [206.9, -74.6], [206.9, -70.0], [206.9, -65.0]];
  for (const [x, z] of lampesCouloir) G.push(B(0.6, 0.02, 0.6, LED, x, HP - 0.012, z), B(0.64, 0.012, 0.64, '#c9ccd1', x, HP - 0.004, z));

  /* -- les murs extérieurs, côté intérieur : la peinture, les fenêtres (vitres, cadres, appuis, radiateurs), les portes */
  const { x0, x1, z0, z1 } = SOLU;
  for (const [a, b] of ouvert(z0, z1, [[ENTREE.z, ENTREE.l]])) G.push(B(0.02, HP, b - a, BLANC, x1 - 0.01, HP / 2, (a + b) / 2));
  G.push(B(0.02, HP - ENTREE.h, ENTREE.l, BLANC, x1 - 0.01, (HP + ENTREE.h) / 2, ENTREE.z));
  G.push(B(x1 - x0, HP, 0.02, BLANC, (x0 + x1) / 2, HP / 2, z1 - 0.01), B(x1 - x0, HP, 0.02, BLANC, (x0 + x1) / 2, HP / 2, z0 + 0.01), B(0.02, HP, z1 - z0, BLANC, x0 + 0.01, HP / 2, (z0 + z1) / 2));
  murs.push([x0 - 0.3, z0 - 0.3, x0, z1 + 0.3], [x1, z0 - 0.3, x1 + 0.3, z1 + 0.3], [x0 - 0.3, z0 - 0.3, x1 + 0.3, z0], [x0 - 0.3, z1, x1 + 0.3, z1 + 0.3]);
  // une fenêtre vue de dedans : la vitre (le ciel s'y reflète, il s'assombrit la nuit), le cadre et ses meneaux, l'appui
  // et le radiateur ; ns : sur un mur sud ou nord ; s : vers l'intérieur
  const fenetre = (m, p, l, y0 = 0.92, y1 = 2.25, radiateur = true) => {
    const ns = m === 's' || m === 'n', s = m === 's' || m === 'e' ? -1 : 1;
    const fx = ns ? p : m === 'e' ? x1 : x0, fz = ns ? (m === 's' ? z1 : z0) : p, k = 0.025 * s, hy = y1 - y0, ym = (y0 + y1) / 2;
    const pose = (w, h, d, c, y, av, le = 0) => G.push(ns ? B(w, h, d, c, fx + le, y, fz + av) : B(d, h, w, c, fx + av, y, fz + le));
    V.push(ns ? B(l, hy, 0.02, VITRE, fx, ym, fz + k) : B(0.02, hy, l, VITRE, fx + k, ym, fz));
    if (radiateur) { const hv = hy * 0.48; pose(l, hv, 0.012, '#dfe1de', y1 - hv / 2, k * 1.4); for (let y = y1 - hv + 0.09; y < y1; y += 0.09) pose(l, 0.01, 0.016, '#c7cac6', y, k * 1.5); }
    pose(l + 0.1, 0.06, 0.04, CADRE, y0 - 0.03, k * 1.6); pose(l + 0.1, 0.05, 0.04, CADRE, y1 + 0.02, k * 1.6);
    for (const d of [-1, 1]) pose(0.05, hy, 0.04, CADRE, ym, k * 1.6, d * l / 2);
    const n = Math.ceil(l / 1.35); for (let i = 1; i < n; i++) pose(0.05, hy, 0.04, CADRE, ym, k * 1.6, -l / 2 + i * l / n);
    pose(l + 0.2, 0.04, 0.2, '#e6e2da', y0 - 0.06, k * 4);
    if (radiateur) pose(Math.min(l * 0.8, 1.6), 0.5, 0.08, '#f2f2ef', 0.45, k * 4);
  };
  for (const [m, p, l] of FENETRES) fenetre(m, p, l);
  for (const x of VITRINES) fenetre('s', x, VITRINE.l, VITRINE.y0, VITRINE.y1, false);
  // les portes extérieures fermées : la double porte vitrée d'Atlas (et sa barre antipanique), celle de l'atelier
  {
    const PA = PORTE_ATLAS, l = PA.l;
    V.push(B(l, PA.h, 0.02, VITRE, PA.x, PA.h / 2, z1 - 0.03)); G.push(B(0.06, PA.h, 0.05, GRIS, PA.x, PA.h / 2, z1 - 0.04), B(l + 0.12, 0.08, 0.06, GRIS, PA.x, PA.h + 0.04, z1 - 0.04));
    for (const d of [-1, 1]) G.push(B(0.06, PA.h, 0.05, GRIS, PA.x + d * l / 2, PA.h / 2, z1 - 0.04), B(l / 2 - 0.2, 0.05, 0.08, '#c0392b', PA.x + d * l / 4, 1.0, z1 - 0.09));
    const PT = PORTE_ATELIER;
    G.push(B(0.03, PT.h, PT.l, '#d6d8da', x1 - 0.03, PT.h / 2, PT.z), B(0.05, PT.h, 0.04, GRIS, x1 - 0.05, PT.h / 2, PT.z), B(0.06, 0.08, PT.l + 0.12, GRIS, x1 - 0.04, PT.h + 0.04, PT.z));
    for (const d of [-1, 1]) G.push(B(0.08, 0.05, PT.l / 2 - 0.2, '#c0392b', x1 - 0.09, 1.0, PT.z + d * PT.l / 4));
    // l'encadrement de la porte d'entrée
    G.push(B(0.32, ENTREE.h, 0.07, CADRE, x1 + 0.12, ENTREE.h / 2, ENTREE.z - ENTREE.l / 2 - 0.035), B(0.32, ENTREE.h, 0.07, CADRE, x1 + 0.12, ENTREE.h / 2, ENTREE.z + ENTREE.l / 2 + 0.035), B(0.32, 0.07, ENTREE.l + 0.14, CADRE, x1 + 0.12, ENTREE.h + 0.035, ENTREE.z));
  }

  /* -- les cloisons et leurs portes : l'huisserie, l'imposte jusqu'au plafond, le battant ouvert (ou fermé) */
  for (const [o, c, a, b, portes] of CLOISONS) {
    const rect = (s0, s1) => (o === 'u' ? [c - e / 2, s0, c + e / 2, s1] : [s0, c - e / 2, s1, c + e / 2]);
    for (const [s0, s1] of ouvert(a, b, portes.filter(p => p[4]).map(([m, l]) => [m, l]))) {
      if (s1 - s0 < 0.02) continue;
      const q = rect(s0, s1); PB(...q, 0, HP, BLANC); colP(...q); colP(...q, murs);
    }
    for (const [m, l, ch, s, ang] of portes) {
      const q = rect(m - l / 2, m + l / 2);
      // l'huisserie : deux montants et la traverse, plus épais que la cloison
      const jamb = d => { const sm = m + d * (l / 2 + 0.025); if (o === 'u') PB(c - 0.07, sm - 0.025, c + 0.07, sm + 0.025, 0, 2.1, CADRE); else PB(sm - 0.025, c - 0.07, sm + 0.025, c + 0.07, 0, 2.1, CADRE); };
      jamb(-1); jamb(1);
      if (o === 'u') PB(c - 0.07, m - l / 2 - 0.05, c + 0.07, m + l / 2 + 0.05, 2.06, 2.12, CADRE); else PB(m - l / 2 - 0.05, c - 0.07, m + l / 2 + 0.05, c + 0.07, 2.06, 2.12, CADRE);
      if (!ang) {
        // fermée (les cabinets) : le battant des deux côtés, la poignée
        if (o === 'u') PB(c - 0.065, m - l / 2 + 0.02, c + 0.065, m + l / 2 - 0.02, 0.02, 2.04, BOIS); else PB(m - l / 2 + 0.02, c - 0.065, m + l / 2 - 0.02, c + 0.065, 0.02, 2.04, BOIS);
        continue;
      }
      PB(...q, HPO, HP, BLANC); colP(q[0], q[1], q[2], q[3], portes); // l'imposte ; l'embrasure (camera.js : interieur)
      // le battant (ou les deux) : tourné de ang autour de sa charnière, du côté s
      const battant = (sh, dir, w) => { // sh : la charnière le long du mur ; dir : vers l'autre montant
        const pu = ang, tA = sh + dir * w * Math.cos(pu), tP = c + s * (0.05 + w * Math.sin(pu)), hP = c + s * 0.05;
        const [hu, hv] = o === 'u' ? [hP, sh] : [sh, hP], [tu, tv] = o === 'u' ? [tP, tA] : [tA, tP];
        const hx = X(hu), hz = Z(hv), tx = X(tu), tz = Z(tv), cx = (hx + tx) / 2, cz = (hz + tz) / 2, rot = Math.atan2(-(tz - hz), tx - hx);
        G.push(B(w - 0.02, 2.02, 0.04, BOIS, cx, 1.03, cz, rot));
        const ax = hx + (tx - hx) * 0.88, az = hz + (tz - hz) * 0.88, nx = -Math.sin(rot), nz = -Math.cos(rot);
        for (const d of [-1, 1]) G.push(B(0.12, 0.025, 0.025, '#c9ccd1', ax + nx * d * 0.04, 1.0, az + nz * d * 0.04, rot));
        tournees.push([cx, cz, w, 0.07, rot]);
      };
      if (ch === 0) { battant(m - l / 2, 1, l / 2); battant(m + l / 2, -1, l / 2); } else battant(m + ch * l / 2, -ch, l);
    }
  }

  /* -- le mobilier */
  // un repère tourné : (lx, lz) autour de (x, z), lz vers l'avant (cap h)
  const R = (x, z, h) => (lx, lz) => [x + lx * Math.cos(h) + lz * Math.sin(h), z - lx * Math.sin(h) + lz * Math.cos(h)];
  const boite = (r, h, w, hh, d, c, lx, y, lz) => { const [Xb, Zb] = r(lx, lz); G.push(B(w, hh, d, c, Xb, y, Zb, h)); };
  // l'emprise d'un meuble (cap multiple d'un quart de tour) : w de large, d de profond, autour de (lx, lz)
  const emprise = (r, h, w, d, lx = 0, lz = 0) => { const [Xb, Zb] = r(lx, lz), q = Math.abs(Math.sin(h)) > 0.5; col(Xb - (q ? d : w) / 2, Zb - (q ? w : d) / 2, Xb + (q ? d : w) / 2, Zb + (q ? w : d) / 2); };
  // un écran (une case de la texture) posé dans le repère r, tourné vers l'arrière (vers qui est assis)
  const ecranR = (r, h, zone, lx, y, lz, w, hh) => { const [Xb, Zb] = r(lx, lz); affiche(zone, Xb, y, Zb, h + Math.PI, w, hh, true); };
  // une chaise de bureau (cap h : vers où l'on regarde assis) : piètement étoile, vérin, assise, dossier
  const chaise = (x, z, h, c = '#2f3a4a') => {
    const r = R(x, z, h);
    for (let k = 0; k < 5; k++) { const a = h + k * 1.2566; G.push(B(0.04, 0.03, 0.3, NOIR, x + Math.sin(a) * 0.14, 0.06, z + Math.cos(a) * 0.14, a)); }
    G.push(C(0.025, 0.025, 0.36, 6, '#9aa0a6', x, 0.25, z));
    boite(r, h, 0.48, 0.08, 0.46, c, 0, 0.47, 0.02); boite(r, h, 0.44, 0.55, 0.06, c, 0, 0.8, -0.24);
  };
  // un poste de travail (cap h : la personne assise regarde vers h) : le plateau, ses pieds, un ou deux écrans (une case
  // de la texture), le clavier, la souris, la chaise ; ilot : dos à dos avec un autre, un panneau entre les deux ; qui
  // (un rôle) : quelqu'un y est assis
  const poste = (x, z, h, o = {}) => {
    const r = R(x, z, h), w = o.w || 1.4, d = 0.75, av = 0.55;
    boite(r, h, w, 0.03, d, o.plan || PLAN, 0, 0.74, av);
    for (const s of [-1, 1]) boite(r, h, 0.05, 0.72, d - 0.1, GRIS, s * (w / 2 - 0.06), 0.37, av);
    if (o.ilot) boite(r, h, w, 0.42, 0.03, o.panneau || '#7d8794', 0, 0.98, av + d / 2);
    else boite(r, h, w - 0.1, 0.3, 0.02, GRIS, 0, 0.55, av + d / 2 - 0.05);
    const n = o.ecrans ?? 2;
    for (let i = 0; i < n; i++) {
      const lx = n === 1 ? 0 : (i - 0.5) * 0.6, rot = n === 1 ? 0 : -(i - 0.5) * 0.35, rr = R(...r(lx, av + 0.22), h + rot);
      boite(rr, h + rot, 0.56, 0.34, 0.025, ECRAN, 0, 1.07, 0); ecranR(rr, h + rot, o.zone || 'bureau', 0, 1.07, -0.014, 0.52, 0.3);
      boite(rr, h + rot, 0.05, 0.17, 0.04, NOIR, 0, 0.84, 0.02); boite(rr, h + rot, 0.2, 0.012, 0.15, NOIR, 0, 0.762, 0.02);
    }
    boite(r, h, 0.44, 0.02, 0.14, '#2b2d31', 0, 0.765, av - 0.05); boite(r, h, 0.06, 0.02, 0.1, '#2b2d31', 0.32, 0.765, av - 0.05);
    if (o.tour) boite(r, h, 0.2, 0.42, 0.45, '#1f2125', -w / 2 + 0.2, 0.22, av + 0.05);
    if (o.mug) { const [Xb, Zb] = r(-0.45, av - 0.1); G.push(C(0.04, 0.04, 0.1, 8, o.mug, Xb, 0.81, Zb)); }
    if (o.papiers) boite(r, h, 0.21, 0.03, 0.29, '#f6f4ee', 0.5, 0.77, av - 0.05);
    if (o.telephone) { boite(r, h, 0.18, 0.05, 0.2, '#2b2d31', -0.5, 0.78, av + 0.1); boite(r, h, 0.05, 0.04, 0.2, '#3b3f46', -0.56, 0.82, av + 0.1); }
    emprise(r, h, w, d, 0, av);
    if (o.chaise !== false) chaise(x, z, h, o.chaiseC);
    if (o.qui) gens.push({ x, z, h, role: o.qui, assis: true, clavier: o.clavier !== false });
  };
  // une armoire de rangement (cap h : sa façade), ses classeurs
  const armoire = (x, z, h, w = 0.9, c = '#d9d5cc', n = 3, haut = 1.95) => {
    const r = R(x, z, h);
    boite(r, h, w, haut, 0.42, c, 0, haut / 2, 0);
    for (let k = 0; k < n; k++) for (let i = 0; i < 6; i++) boite(r, h, w / 7.5, 0.3, 0.3, ['#c0392b', '#2e86de', '#e0b13a', '#3f7d4a', '#8e44ad', '#f4f4f2'][(i + k) % 6], -w / 2 + w / 7 * (i + 0.7), 0.4 + k * 0.55, 0.06);
    emprise(r, h, w, 0.42);
  };
  const plante = (x, z, k = 1) => {
    G.push(C(0.17 * k, 0.13 * k, 0.4 * k, 8, '#d8d2c6', x, 0.2 * k, z), S(0.32 * k, '#4f7a3a', x, 0.62 * k, z, 1, 1.3, 1, 1), S(0.22 * k, '#5f8f44', x + 0.08, 0.88 * k, z - 0.05, 1, 1.4, 1, 0));
    col(x - 0.2, z - 0.2, x + 0.2, z + 0.2);
  };
  const table = (x, z, w, d, c = PLAN, pied = GRIS) => {
    G.push(B(w, 0.04, d, c, x, 0.74, z));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.push(B(0.05, 0.72, 0.05, pied, x + sx * (w / 2 - 0.08), 0.36, z + sz * (d / 2 - 0.08)));
    col(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  };
  const chaiseS = (x, z, h, c = '#3a4a5c') => { // une chaise de réunion ou de cuisine
    const r = R(x, z, h);
    boite(r, h, 0.44, 0.05, 0.42, c, 0, 0.46, 0); boite(r, h, 0.44, 0.4, 0.04, c, 0, 0.72, -0.2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) boite(r, h, 0.025, 0.46, 0.025, '#9aa0a6', sx * 0.18, 0.23, sz * 0.18);
  };
  // une place assise sur une chaise de réunion (qui y est assis, et ce qu'il regarde)
  const assis = (x, z, h, role, regard, c) => { chaiseS(x, z, h, c); if (role) gens.push({ x, z, h, role, assis: true, clavier: false, regard }); };
  const extincteur = (x, z) => G.push(C(0.08, 0.08, 0.5, 8, '#c0392b', x, 0.4, z), C(0.03, 0.04, 0.08, 6, NOIR, x, 0.69, z), B(0.2, 0.25, 0.02, '#c0392b', x, 1.45, z));
  // un tableau blanc au mur (cap h : vers la pièce), son auget, ce qui y est dessiné (une case de la texture)
  const tableau = (x, z, h, w, hh, zone) => {
    const r = R(x, z, h); boite(r, h, w + 0.06, hh + 0.06, 0.03, '#c9ccd1', 0, 1.5, 0.015); boite(r, h, w + 0.1, 0.03, 0.08, '#c9ccd1', 0, 1.5 - hh / 2 - 0.05, 0.05);
    if (zone) { const [Xb, Zb] = r(0, 0.033); affiche(zone, Xb, 1.5, Zb, h, w, hh); } else boite(r, h, w, hh, 0.005, '#fbfbf8', 0, 1.5, 0.032);
  };
  // une télé au mur (cap h : vers la pièce), son image
  const tele = (x, z, h, w, hh, zone, y = 1.45) => { const r = R(x, z, h); boite(r, h, w + 0.04, hh + 0.04, 0.05, '#101215', 0, y, 0.025); const [Xb, Zb] = r(0, 0.052); affiche(zone, Xb, y, Zb, h, w, hh, true); };
  const cadreMur = (x, z, h, w, hh, zone) => { const r = R(x, z, h); boite(r, h, w + 0.04, hh + 0.04, 0.025, '#2b2d31', 0, 1.55, 0.012); const [Xb, Zb] = r(0, 0.026); affiche(zone, Xb, 1.55, Zb, h, w, hh); };

  // l'entrée : le banc, le portemanteau, une plante, le plan d'évacuation au mur (« Vous êtes ici »), le logo en face de la
  // porte, le paillasson
  {
    const h = P.hall;
    G.push(B(2.0, 0.08, 0.5, '#3d4f66', 219.3, 0.45, h.z0 + 0.3), B(2.0, 0.42, 0.08, '#3d4f66', 219.3, 0.7, h.z0 + 0.06));
    for (const dx of [-0.9, 0.9]) G.push(B(0.05, 0.42, 0.45, NOIR, 219.3 + dx, 0.21, h.z0 + 0.3));
    col(218.3, h.z0, 220.3, h.z0 + 0.58);
    plante(h.x1 - 0.35, h.z0 + 0.35, 1.2);
    G.push(C(0.02, 0.02, 1.75, 6, NOIR, h.x0 + 0.35, 0.88, h.z0 + 0.35), C(0.22, 0.22, 0.02, 8, NOIR, h.x0 + 0.35, 0.02, h.z0 + 0.35));
    for (let k = 0; k < 4; k++) G.push(B(0.16, 0.03, 0.03, NOIR, h.x0 + 0.35 + Math.sin(k * 1.57) * 0.08, 1.7, h.z0 + 0.35 + Math.cos(k * 1.57) * 0.08, k * 1.57));
    G.push(B(0.35, 0.6, 0.18, '#4f6580', h.x0 + 0.45, 1.25, h.z0 + 0.32)); col(h.x0 + 0.1, h.z0 + 0.1, h.x0 + 0.6, h.z0 + 0.6);
    cadreMur(219.6, h.z1 - 0.02, NORD, 0.56, 0.76, 'plan');
    { const r = R(h.x0 + 0.02, -62.45, EST); boite(r, EST, 1.44, 0.4, 0.02, '#ffffff', 0, 1.65, 0.01); const [Xb, Zb] = r(0, 0.022); affiche('logo', Xb, 1.65, Zb, EST, 1.36, 0.32); }
    G.push(B(0.9, 0.012, 1.3, '#3a3a3a', h.x1 - 0.55, 0.03, ENTREE.z));
    extincteur(h.x0 + 0.45, h.z1 - 0.1);
  }
  // l'atelier (la maintenance) : l'établi du milieu et le technicien, l'établi de dépannage, les étagères de PC en attente,
  // une baie de test, des cartons, un diable ; devant chaque vitrine, un ordinateur exposé
  {
    const a = P.atelier;
    table(218.4, -57.2, 2.4, 1.0, '#9a7b55', '#5a5d63');
    G.push(B(0.22, 0.45, 0.48, '#1f2125', 217.9, 0.99, -57.0), B(0.02, 0.4, 0.42, '#3a8e5a', 218.02, 0.99, -57.0), B(0.5, 0.06, 0.35, '#3b3f46', 219.0, 0.79, -57.2), B(0.04, 0.3, 0.25, '#d9d5cc', 219.3, 0.92, -57.05));
    G.push(B(0.3, 0.012, 0.22, '#c0392b', 217.3, 0.765, -56.9), B(0.12, 0.05, 0.08, '#e0b13a', 218.6, 0.785, -56.95));
    chaise(218.4, -58.0, SUD, '#ef6c26'); gens.push({ x: 218.4, z: -58.0, h: SUD, role: 'technicien', assis: true, clavier: true });
    // l'établi le long du mur nord, deux écrans de test, une soudure ; au-dessus, un panneau d'outils
    const r = R(218.3, a.z0 + 0.4, SUD);
    boite(r, SUD, 3.0, 0.05, 0.7, '#9a7b55', 0, 0.9, 0); for (const s of [-1, 0, 1]) boite(r, SUD, 0.05, 0.88, 0.6, GRIS, s * 1.45, 0.44, 0);
    for (const dx of [-0.9, 0.2]) { const mx = 218.3 + dx, mz = a.z0 + 0.3; G.push(B(0.5, 0.3, 0.025, ECRAN, mx, 1.15, mz), B(0.05, 0.2, 0.04, NOIR, mx, 0.98, mz - 0.03)); affiche('bureau', mx, 1.15, mz + 0.014, SUD, 0.46, 0.26, true); }
    boite(r, SUD, 1.6, 0.7, 0.02, '#c9a87a', 0, 1.75, -0.33); for (let i = 0; i < 7; i++) boite(r, SUD, 0.04, 0.25, 0.03, ['#c0392b', '#2b2d31', '#e0b13a'][i % 3], -0.6 + i * 0.2, 1.75, -0.31);
    emprise(r, SUD, 3.0, 0.7); chaise(217.4, a.z0 + 1.15, NORD);
    // les étagères de PC en attente, le long du mur est (au sud de la porte de l'atelier)
    for (let k = 0; k < 4; k++) G.push(B(0.5, 0.03, 3.0, GRIS, a.x1 - 0.3, 0.3 + k * 0.5, -55.95));
    for (const dz of [-1.45, 1.45]) G.push(B(0.05, 1.9, 0.05, GRIS, a.x1 - 0.52, 0.95, -55.95 + dz), B(0.05, 1.9, 0.05, GRIS, a.x1 - 0.08, 0.95, -55.95 + dz));
    for (let k = 0; k < 4; k++) for (let i = 0; i < 5; i++) if ((i + k) % 4) G.push(B(0.42, 0.36, 0.2, (i + k) % 3 ? '#1f2125' : '#d9d5cc', a.x1 - 0.3, 0.5 + k * 0.5, -57.1 + i * 0.55));
    col(a.x1 - 0.55, -57.5, a.x1, -54.4);
    // la baie de test, dans l'angle sud-ouest ; des cartons, le diable
    G.push(B(0.6, 1.8, 0.8, '#1c1e22', a.x0 + 0.35, 0.9, a.z1 - 0.5), B(0.01, 1.6, 0.6, '#2a3442', a.x0 + 0.66, 0.9, a.z1 - 0.5));
    for (let k = 0; k < 8; k++) G.push(B(0.012, 0.018, 0.03, ['#3ddc84', '#4aa3ff', '#ffb02e'][k % 3], a.x0 + 0.665, 0.4 + k * 0.17, a.z1 - 0.7 + (k % 4) * 0.12));
    col(a.x0, a.z1 - 0.9, a.x0 + 0.66, a.z1);
    for (const [x, z, n] of [[220.55, -55.35, 2], [220.55, -55.95, 1]]) for (let k = 0; k < n; k++) G.push(B(0.5, 0.36, 0.4, k % 2 ? '#b98a55' : '#c49a64', x, 0.18 + k * 0.37, z, k * 0.2));
    col(220.25, -56.25, 220.85, -55.05);
    G.push(B(0.45, 1.2, 0.05, '#c0392b', a.x0 + 0.4, 0.62, -55.8, 0.2), B(0.5, 0.04, 0.3, '#2b2d31', a.x0 + 0.4, 0.05, -55.65, 0.2)); col(a.x0 + 0.1, -56.0, a.x0 + 0.7, -55.5);
    // devant les vitrines : un portable ouvert et un écran sur un présentoir
    for (const x of VITRINES) {
      G.push(B(1.1, 0.7, 0.5, '#f2f0ea', x, 0.35, a.z1 - 0.45), B(1.14, 0.04, 0.54, '#2b2d31', x, 0.72, a.z1 - 0.45), B(0.34, 0.015, 0.24, '#3b3f46', x - 0.2, 0.75, a.z1 - 0.45));
      G.push(B(0.5, 0.3, 0.025, ECRAN, x + 0.25, 0.98, a.z1 - 0.5), B(0.05, 0.2, 0.04, NOIR, x + 0.25, 0.8, a.z1 - 0.47)); affiche('logo', x + 0.25, 0.98, a.z1 - 0.514, NORD, 0.46, 0.11, true);
      col(x - 0.55, a.z1 - 0.7, x + 0.55, a.z1);
    }
  }
  // Soleil (la formation) : la télé au mur ouest, la table du formateur, deux rangs de tables avec leurs portables
  {
    const s = P.soleil;
    tele(s.x0 + 0.01, -57.1, EST, 1.9, 1.07, 'formation', 1.55);
    tableau(s.x0 + 0.01, -59.2, EST, 1.2, 0.8);
    table(209.0, -55.0, 1.4, 0.7); G.push(B(0.34, 0.015, 0.24, '#3b3f46', 209.0, 0.77, -55.0)); chaiseS(209.0, -54.45, NORD);
    const places = [[210.6, -55.4], [210.6, -56.2], [210.6, -58.0], [210.6, -58.8], [212.6, -55.4], [212.6, -56.2], [212.6, -58.0], [212.6, -58.8]];
    const qui = [true, false, true, false, false, true, false, true];
    for (const zc of [-55.8, -58.4]) for (const xc of [210.6, 212.6]) table(xc - 0.55, zc, 0.7, 1.6);
    places.forEach(([x, z], i) => { chaise(x, z, OUEST, '#ef6c26'); G.push(B(0.34, 0.015, 0.24, '#3b3f46', x - 0.5, 0.77, z)); const rr = R(x - 0.66, z, OUEST); boite(rr, OUEST, 0.32, 0.21, 0.012, '#3b3f46', 0, 0.87, 0); ecranR(rr, OUEST, 'formation', 0, 0.87, -0.008, 0.29, 0.17); if (qui[i]) gens.push({ x, z, h: OUEST, role: 'stagiaire', assis: true, clavier: true }); });
    gens.push({ x: 208.75, z: -56.4, h: EST, role: 'formateur', assis: false });
    plante(s.x1 - 0.35, s.z1 - 0.35, 1.2); plante(s.x0 + 0.35, s.z0 + 0.4);
  }
  // Atlas (la grande salle de réunion) : la belle télé au mur est, les tables en U tournées vers elle, le baby-foot, des
  // plantes ; trois personnes regardent la télé, deux jouent au baby-foot
  const TV = { x: 207.8, y: 1.5, z: -56.9 };
  const babyfoot = { x: 206.3, z: -60.2 };
  {
    const a = P.atlas;
    tele(a.x1 - 0.01, TV.z, OUEST, 1.9, 1.07, 'tele', TV.y);
    G.push(B(0.42, 0.55, 1.8, '#2b2d31', a.x1 - 0.22, 0.28, TV.z), B(0.44, 0.03, 1.82, '#9a7b55', a.x1 - 0.22, 0.57, TV.z)); col(a.x1 - 0.45, TV.z - 0.9, a.x1, TV.z + 0.9);
    const BOIS_U = '#c8b08a', U_C = '#ef6c26';
    table(203.5, -55.4, 3.2, 0.7, BOIS_U, '#2b2d31'); table(203.5, -58.4, 3.2, 0.7, BOIS_U, '#2b2d31'); table(201.6, -56.9, 0.7, 3.7, BOIS_U, '#2b2d31');
    const reg = { x: TV.x, y: TV.y, z: TV.z };
    [[202.6, -54.72, NORD, null], [203.6, -54.72, NORD, 'reunion'], [204.6, -54.72, NORD, null], [202.6, -59.08, SUD, 'reunion'], [203.6, -59.08, SUD, null], [204.6, -59.08, SUD, null],
      [200.92, -55.9, EST, null], [200.92, -56.9, EST, 'reunion'], [200.92, -57.9, EST, null]].forEach(([x, z, h, r]) => assis(x, z, h, r, reg, U_C));
    // le baby-foot : la caisse, le terrain vert, ses lignes, les buts, les huit barres et leurs joueurs (rouges, bleus)
    const bx = babyfoot.x, bz = babyfoot.z;
    G.push(B(0.76, 0.3, 1.2, '#4a3324', bx, 0.6, bz), B(0.68, 0.01, 1.12, '#2f8a3a', bx, 0.755, bz), B(0.68, 0.012, 0.012, '#e8e8e8', bx, 0.762, bz));
    for (const s of [-1, 1]) G.push(B(0.05, 0.2, 1.2, '#4a3324', bx + s * 0.355, 0.85, bz), B(0.76, 0.2, 0.05, '#4a3324', bx, 0.85, bz + s * 0.585), B(0.2, 0.08, 0.02, '#1d1d1d', bx, 0.8, bz + s * 0.558), B(0.08, 0.45, 0.08, '#3a2a1e', bx - 0.3, 0.22, bz + s * 0.5), B(0.08, 0.45, 0.08, '#3a2a1e', bx + 0.3, 0.22, bz + s * 0.5));
    [-0.48, -0.34, -0.2, -0.07, 0.07, 0.2, 0.34, 0.48].forEach((dz, i) => {
      G.push(C(0.008, 0.008, 1.3, 6, '#c9ccd1', bx, 0.85, bz + dz, 'x'));
      const n = [1, 2, 5, 3, 3, 5, 2, 1][i], rouge = [0, 1, 3, 5].includes(i), poignee = rouge ? 1 : -1;
      G.push(C(0.018, 0.018, 0.1, 6, '#1d1d1d', bx + poignee * 0.68, 0.85, bz + dz, 'x'));
      for (let k = 0; k < n; k++) { const px = bx + (k - (n - 1) / 2) * 0.58 / n; G.push(B(0.03, 0.08, 0.02, rouge ? '#c0392b' : '#2e5fa8', px, 0.81, bz + dz), S(0.016, '#f1c27d', px, 0.87, bz + dz)); }
    });
    col(bx - 0.4, bz - 0.62, bx + 0.4, bz + 0.62);
    gens.push({ x: bx - 0.78, z: bz, h: EST, role: 'babyfoot', assis: false, cote: -1 }, { x: bx + 0.78, z: bz, h: OUEST, role: 'babyfoot', assis: false, cote: 1 });
    plante(a.x0 + 0.4, a.z1 - 0.4, 1.3); plante(a.x0 + 0.4, a.z0 + 0.45, 1.2); plante(a.x1 - 0.35, a.z1 - 0.35, 1.1);
    cadreMur(a.x0 + 0.02, -55.9, EST, 0.36, 0.5, 'vitisoft');
  }
  // Mars (la cuisine) : les éléments le long du mur sud (évier, plaques, machine à café, micro-ondes), les placards hauts,
  // le réfrigérateur, la table et ses chaises, une table haute près de la fenêtre
  {
    const m = P.mars, zc = m.z1 - 0.32;
    G.push(B(2.8, 0.9, 0.62, '#f2f0ea', 219.5, 0.45, zc), B(2.84, 0.04, 0.66, '#5a5d63', 219.5, 0.92, zc), B(2.8, 0.7, 0.36, '#f2f0ea', 219.5, 1.85, m.z1 - 0.19));
    G.push(B(0.55, 0.04, 0.42, '#c9ccd1', 218.6, 0.945, zc), C(0.015, 0.015, 0.3, 6, '#c9ccd1', 218.6, 1.08, m.z1 - 0.12));
    G.push(B(0.6, 0.02, 0.5, '#2b2d31', 220.0, 0.945, zc), B(0.32, 0.42, 0.34, NOIR, 219.3, 1.15, zc + 0.02), B(0.08, 0.04, 0.06, '#c9ccd1', 219.3, 1.02, zc - 0.17));
    G.push(B(0.5, 0.3, 0.38, '#d6d9dc', 220.55, 1.1, zc), B(0.36, 0.2, 0.02, '#1d1d1d', 220.55, 1.1, zc - 0.2));
    G.push(B(0.62, 1.85, 0.62, '#d6d9dc', m.x1 - 0.35, 0.93, m.z1 - 0.35), B(0.03, 0.6, 0.02, '#9aa0a6', m.x1 - 0.6, 1.2, m.z1 - 0.67));
    col(218.05, m.z1 - 0.7, m.x1, m.z1);
    for (let i = 0; i < 4; i++) G.push(C(0.04, 0.04, 0.1, 8, ['#ef6c26', '#f4f4f2', '#2e86de', '#3f7d4a'][i], 218.0 + i * 0.12, 0.99, zc + 0.15));
    table(219.0, -66.6, 1.8, 0.9, '#f0ede6');
    for (const dx of [-0.6, 0, 0.6]) { chaiseS(219.0 + dx, -66.0, NORD, '#3f7d4a'); chaiseS(219.0 + dx, -67.2, SUD, '#3f7d4a'); }
    gens.push({ x: 219.6, z: -67.2, h: SUD, role: 'pause', assis: true, clavier: false, telephone: true });
    G.push(C(0.35, 0.35, 0.04, 14, '#f0ede6', 220.6, 1.08, -68.3), C(0.04, 0.04, 1.06, 6, GRIS, 220.6, 0.53, -68.3), C(0.25, 0.25, 0.02, 12, GRIS, 220.6, 0.01, -68.3));
    col(220.3, -68.6, 220.9, -68.0);
    gens.push({ x: 220.6, z: -67.6, h: NORD, role: 'cafe', assis: false, regard: { x: 220.1, y: 1.6, z: -68.8 } }, { x: 220.1, z: -68.85, h: 0.6, role: 'cafe', assis: false, regard: { x: 220.6, y: 1.6, z: -67.6 } });
    plante(m.x1 - 0.35, m.z0 + 0.35);
  }
  // Terre et Vénus : deux bureaux, deux postes sous la fenêtre, une armoire
  for (const [k, qui] of [['terre', 'bureau'], ['venus', 'bureau']]) {
    const q = P[k], zm = (q.z0 + q.z1) / 2;
    poste(q.x1 - 0.95, zm + 0.6, EST, { w: 1.2, qui, mug: '#ef6c26', papiers: true });
    poste(q.x1 - 0.95, zm - 0.6, EST, { w: 1.2, ecrans: 1, telephone: true });
    armoire(q.x0 + 0.3, q.z0 + 0.75, EST, 1.1); plante(q.x0 + 1.3, q.z0 + 0.3);
  }
  // Mercure (salle de réunion) : la grande table, dix chaises, l'écran au mur ouest, un tableau blanc ; trois personnes
  {
    const m = P.mercure;
    table(217.0, -77.65, 4.2, 1.1, '#c8b08a', '#2b2d31');
    const reg = (x, z) => ({ x, y: 1.15, z });
    [[215.4, -76.92, NORD, null], [216.4, -76.92, NORD, 'reunion', reg(217.6, -78.4)], [217.6, -76.92, NORD, null], [218.6, -76.92, NORD, null],
      [215.4, -78.38, SUD, null], [216.4, -78.38, SUD, null], [217.6, -78.38, SUD, 'reunion', reg(219.6, -77.65)], [218.6, -78.38, SUD, null],
      [214.5, -77.65, EST, null], [219.6, -77.65, OUEST, 'reunion', reg(216.4, -76.9)]].forEach(([x, z, h, r, rg]) => assis(x, z, h, r, rg, '#2e86de'));
    tele(m.x0 + 0.01, -77.65, EST, 1.5, 0.84, 'tele', 1.5);
    tableau(219.3, m.z1 - 0.01, NORD, 1.6, 0.9);
    plante(m.x1 - 0.4, m.z0 + 0.4, 1.2); plante(m.x0 + 0.35, m.z0 + 0.35);
  }
  // Neptune (l'associé) : le bureau tourné vers la porte, la chaise des visiteurs, l'armoire
  {
    const n = P.neptune;
    poste(211.0, -78.75, SUD, { w: 1.6, qui: 'associe', ecrans: 2, plan: '#c8b08a', papiers: true, mug: '#2e86de', telephone: true, chaiseC: '#1d1d1d' });
    chaiseS(210.8, -76.95, NORD, '#5a5d63'); armoire(n.x1 - 0.25, -76.6, OUEST, 1.0); plante(n.x0 + 0.35, n.z0 + 0.35);
    cadreMur(n.x0 + 0.02, -77.6, EST, 0.36, 0.5, 'equipe');
  }
  // Uranus (le patron) : le grand bureau de bois sombre, le fauteuil, deux chaises, la bibliothèque, une plante
  {
    const u = P.uranus;
    poste(207.3, -78.85, SUD, { w: 1.9, qui: 'patron', ecrans: 1, plan: '#6b4a30', papiers: true, mug: '#f4f4f2', telephone: true, chaiseC: '#1d1d1d' });
    chaiseS(206.8, -77.0, NORD, '#5a5d63'); chaiseS(207.8, -77.0, NORD, '#5a5d63');
    { const r = R(u.x1 - 0.22, -76.9, OUEST); boite(r, OUEST, 1.6, 2.0, 0.38, '#6b4a30', 0, 1.0, 0); for (let k = 0; k < 4; k++) { boite(r, OUEST, 1.5, 0.03, 0.34, '#5a3f2b', 0, 0.42 + k * 0.45, 0.02); for (let i = 0; i < 9; i++) if ((i * 3 + k) % 5) boite(r, OUEST, 0.08, 0.3, 0.24, ['#7a2233', '#1f3b4d', '#c9a55a', '#3f7d4a', '#e9e1cf'][(i + k) % 5], -0.68 + i * 0.16, 0.6 + k * 0.45, 0.04); } emprise(r, OUEST, 1.6, 0.38); }
    plante(u.x0 + 0.4, u.z0 + 0.4, 1.3); cadreMur(u.x0 + 0.02, -77.6, EST, 0.36, 0.5, 'viticode');
  }
  // Saturne (les commerciaux) : un îlot de quatre postes, chacun son téléphone ; le tableau des ventes ; une armoire
  {
    const s = P.saturne;
    for (const z of [-76.4, -77.8]) {
      poste(201.29, z, EST, { ilot: true, zone: 'crm', qui: 'commercial', telephone: true, papiers: z < -77 });
      poste(203.11, z, OUEST, { ilot: true, zone: 'crm', qui: 'commercial', telephone: true, mug: '#ef6c26' });
    }
    tableau(202.4, s.z1 - 0.01, NORD, 1.6, 0.7, 'ventes');
    armoire(203.9, s.z0 + 0.25, SUD, 1.0); plante(s.x0 + 0.35, s.z0 + 0.35, 1.2);
  }
  // Jupiter (les développeurs) : deux îlots de six postes, deux écrans chacun (du code), le tableau des tâches, les deux
  // placards du plan, une imprimante, des plantes
  {
    const j = P.jupiter, occ = [true, true, false, true, true, true, true, false, true, true, true, false];
    let i = 0;
    for (const z0 of [-64.0, -68.8]) for (let k = 0; k < 3; k++) {
      const z = z0 - k * 1.4;
      poste(201.95, z, EST, { ilot: true, zone: 'code', qui: occ[i++] ? 'dev' : null, mug: k === 1 ? '#3f7d4a' : null, panneau: '#ef6c26' });
      poste(203.77, z, OUEST, { ilot: true, zone: 'code', qui: occ[i++] ? 'dev' : null, papiers: k === 2, panneau: '#ef6c26' });
    }
    { const r = R(205.55, -64.03, OUEST); boite(r, OUEST, 3.65, 2.4, 0.74, '#e6e3dc', 0, 1.2, 0); for (const lx of [-0.91, 0.91]) { boite(r, OUEST, 0.02, 2.2, 0.01, '#c9c6bf', lx, 1.12, 0.37); boite(r, OUEST, 0.02, 0.2, 0.03, '#9aa0a6', lx + 0.06, 1.1, 0.38); boite(r, OUEST, 0.02, 0.2, 0.03, '#9aa0a6', lx - 0.06, 1.1, 0.38); } emprise(r, OUEST, 3.65, 0.74); }
    tableau(j.x1 - 0.06, -66.7, OUEST, 1.4, 0.83, 'kanban');
    G.push(B(0.6, 0.5, 0.55, '#e8eaec', 205.4, 0.65, -71.9), B(0.62, 0.4, 0.57, '#5a5d63', 205.4, 0.2, -71.9)); col(205.1, -72.2, j.x1, -71.6);
    plante(j.x0 + 0.4, j.z1 - 0.45, 1.3); plante(j.x0 + 0.4, j.z0 + 0.4, 1.2); plante(204.2, j.z0 + 0.4);
    cadreMur(j.x0 + 0.02, -62.9, EST, 0.36, 0.5, 'equipe');
  }
  // la chaufferie : la chaudière au fioul (son brûleur), la cuve, les tuyaux
  {
    const c = P.chaufferie;
    G.push(B(0.8, 1.25, 0.7, '#f2f2ef', c.x1 - 0.6, 0.63, c.z0 + 0.5), B(0.3, 0.25, 0.3, '#c0392b', c.x1 - 0.6, 0.85, c.z0 + 0.95), C(0.09, 0.09, 1.4, 8, '#9aa0a6', c.x1 - 0.6, 1.95, c.z0 + 0.45));
    G.push(C(0.55, 0.55, 1.5, 14, '#d8cfa8', c.x0 + 0.75, 0.75, c.z0 + 0.75), C(0.03, 0.03, 0.3, 6, '#5a5d63', c.x0 + 0.75, 1.6, c.z0 + 0.75));
    for (const dx of [-0.15, 0, 0.15]) G.push(C(0.02, 0.02, 1.1, 6, '#b87333', c.x1 - 0.6 + dx, 0.6, c.z0 + 0.12));
    G.push(C(0.025, 0.025, 2.6, 6, '#b87333', (c.x0 + c.x1) / 2, 2.3, c.z0 + 0.12, 'x'));
    col(c.x0 + 0.15, c.z0, c.x1, c.z0 + 1.35);
  }
  // les sanitaires : les lavabos et leurs miroirs, le sèche-mains ; les cabinets sont fermés
  for (const [q, lav, zm, s] of [[P.sanit1, [209.0, 210.2], P.sanit1.z1, -1], [P.sanit2, [213.4], P.sanit2.z0, 1], [P.sanit3, [208.8], P.sanit3.z0, 1]]) {
    for (const x of lav) { G.push(B(0.5, 0.15, 0.4, '#fbfbfa', x, 0.82, zm + s * 0.2), B(0.45, 0.6, 0.02, '#cfe0ea', x, 1.45, zm + s * 0.015), C(0.012, 0.012, 0.12, 6, '#c9ccd1', x, 0.95, zm + s * 0.06)); col(x - 0.27, Math.min(zm, zm + s * 0.4), x + 0.27, Math.max(zm, zm + s * 0.4)); }
    G.push(B(0.28, 0.3, 0.12, '#e8eaec', q.x1 - 0.4, 1.3, q.z1 - 0.08));
  }
  // le local ménage : le chariot, les étagères de produits, le seau et son balai
  {
    const m = P.menage;
    G.push(B(0.5, 0.9, 0.8, '#2e5fa8', m.x0 + 0.45, 0.45, -71.0), B(0.42, 0.3, 0.3, '#e0b13a', m.x0 + 0.45, 1.05, -70.8)); col(m.x0 + 0.15, -71.45, m.x0 + 0.75, -70.55);
    for (let k = 0; k < 3; k++) G.push(B(1.5, 0.03, 0.35, GRIS, 213.5, 0.9 + k * 0.45, m.z0 + 0.2));
    for (let i = 0; i < 6; i++) G.push(C(0.05, 0.05, 0.24, 6, ['#2e86de', '#e0b13a', '#c0392b', '#3f7d4a'][i % 4], 212.9 + i * 0.24, 1.04 + (i % 3) * 0.45, m.z0 + 0.2));
    G.push(C(0.16, 0.13, 0.3, 8, '#e0b13a', 213.1, 0.15, -69.9), C(0.015, 0.015, 1.3, 4, '#c9a55a', 213.22, 0.65, -69.82));
    col(212.7, m.z0, 214.3, m.z0 + 0.4); col(212.9, -70.15, 213.35, -69.6);
  }
  // les moyens généraux : le grand copieur, les ramettes, les fournitures, deux baies de serveurs, le destructeur
  {
    const m = P.moyens;
    G.push(B(0.75, 1.05, 0.65, '#e8eaec', m.x0 + 1.6, 0.53, m.z0 + 0.4), B(0.7, 0.1, 0.6, '#c9ccd1', m.x0 + 1.6, 1.1, m.z0 + 0.4), B(0.25, 0.04, 0.18, '#3a6ea5', m.x0 + 1.4, 1.17, m.z0 + 0.25)); col(m.x0 + 1.2, m.z0, m.x0 + 2.0, m.z0 + 0.75);
    for (let k = 0; k < 4; k++) { G.push(B(1.8, 0.03, 0.45, GRIS, m.x1 - 1.2, 0.3 + k * 0.5, m.z1 - 0.25)); for (let i = 0; i < 4; i++) G.push(B(0.3, 0.2, 0.4, (i + k) % 2 ? '#f6f4ee' : '#e9e1cf', m.x1 - 1.95 + i * 0.5, 0.42 + k * 0.5, m.z1 - 0.25)); }
    col(m.x1 - 2.1, m.z1 - 0.5, m.x1 - 0.3, m.z1);
    for (let i = 0; i < 2; i++) {
      const z = -71.2 - i * 0.65;
      G.push(B(1.05, 2.0, 0.62, '#1c1e22', m.x0 + 0.55, 1.0, z), B(0.01, 1.84, 0.54, '#2a3442', m.x0 + 1.08, 1.0, z));
      for (let k = 0; k < 9; k++) G.push(B(0.012, 0.018, 0.03, ['#3ddc84', '#3ddc84', '#4aa3ff', '#ffb02e'][(k + i) % 4], m.x0 + 1.09, 0.35 + k * 0.17, z - 0.18 + ((k * 7 + i) % 5) * 0.08));
    }
    col(m.x0, -72.2, m.x0 + 1.1, -70.85);
    G.push(B(0.4, 0.65, 0.32, '#2b2d31', m.x1 - 0.3, 0.33, m.z0 + 0.3)); col(m.x1 - 0.5, m.z0, m.x1, m.z0 + 0.5);
  }
  // les couloirs : des plantes, les extincteurs, la fontaine à eau, le tableau électrique, les affiches
  plante(209.0, -60.6); plante(207.45, -72.4);
  extincteur(214.6, -60.34); extincteur(215.05, -71.9); extincteur(207.75, -66.5); extincteur(211.0, -73.84);
  G.push(B(0.32, 1.1, 0.32, '#e8eaec', 215.12, 0.55, -66.6), C(0.13, 0.13, 0.4, 8, '#8fc3e6', 215.12, 1.3, -66.6)); col(214.95, -66.8, 215.3, -66.4);
  G.push(B(0.06, 0.8, 0.5, '#9aa0a6', 206.03, 1.4, -65.4));
  cadreMur(212.5, -60.26, NORD, 0.36, 0.5, 'vitisoft'); cadreMur(210.3, -60.26, NORD, 0.36, 0.5, 'viticode');
  cadreMur(216.77, -66.2, OUEST, 0.36, 0.5, 'equipe'); cadreMur(212.0, -73.76, NORD, 0.36, 0.5, 'vitisoft'); cadreMur(209.5, -73.76, NORD, 0.36, 0.5, 'viticode');

  const lampes = lampesCouloir.map(([x, z]) => [x, 2.35, z]);
  return { geos: G, vitres: V, boites, tournees, murs, portes, pieces, lampes, affiches, ecrans, gens, babyfoot };
}

/* ---------------------------------------------------------------- le jeu
   Entrer et sortir par la porte d'entrée (gestes.js : passer, le fondu au noir au seuil). Dedans, l'extérieur n'est plus
   dessiné ni calculé (main.js : isoler), la caméra suit à hauteur d'homme, sous le plafond, et les murs la rapprochent
   (camera.js : interieur). Ceux qui y travaillent sont créés en approchant du bâtiment, un toutes les trois images ; ne sont animés
   que ceux qu'on voit (aucun mur entre la caméra et eux), et d'autant moins souvent qu'ils sont loin. */
const LIBRE = { resoudre: () => false, rangs: () => false }, NUIT_VITRE = new THREE.Color();
// le passage d'un employé entre Jupiter et la cuisine : la double porte, le couloir de droite, celui du bas, celui de
// gauche, la première porte de Mars, la machine à café
const CAFE = [[204.6, -68.3], [206.0, -68.3], [206.9, -68.4], [206.9, -74.6], [215.9, -74.6], [215.9, -63.97], [217.3, -63.97], [218.95, -64.3]];
// les tenues, d'après le rôle (le reste tiré au sort)
const TENUES = {
  patron: { tenue: 'veste', haut: '#2c3e66', col: '#e9eef4', bas: '#2f2f35', coiffure: 'court', lunettes: true },
  associe: { tenue: 'chemise', haut: '#e9eef4', bas: '#2f3440', coiffure: 'court', barbe: true },
  commercial: { tenue: 'chemise' }, technicien: { tenue: 'pull', haut: '#ef6c26' }, formateur: { tenue: 'chemise', haut: '#f4f1ea' },
};
const PEAUX = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#d4a373'], CHEV = ['#2b1d0e', '#6b4423', '#b55239', '#d9c08c', '#151515', '#5a3a22'];
const HAUTS = ['#2e86de', '#3f7d4a', '#8e44ad', '#34495e', '#7f8c8d', '#c0392b', '#16a085', '#f1ece2', '#2b2d31', '#e0b13a'], BAS = ['#2c3e50', '#34495e', '#1e272e', '#455a64', '#2f3440'];

export class Solumatic {
  // c : { jeu, monde, scene, camera, gestes, hud, ctrl, cam, tel, son, regarder(dedans, loin), isoler(oui), garder(objet) :
  // un objet de la scène qui reste quand l'extérieur est retiré } (main.js)
  constructor(c) {
    this.c = c; this.L = c.monde.lieux.solumatic; this.gens = []; this.vu = false; this.n = 0; this.img = 0; this.tc = 0; this.tBulle = 0;
    const h = c.hud;
    this.etq = { entrer: h.action('Entrer chez Solumatic'), sortir: h.action('Sortir') };
    this.etiquettes = Object.values(this.etq);
    this.porte = c.monde.porteSolu;
    // la balle du baby-foot ; elle et ceux qui y travaillent restent dans la scène quand l'extérieur en est retiré (ils y
    // sont directement : assis, un personnage dont le parent n'est pas la scène serait au volant, anim.js)
    this.balle = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshLambertMaterial({ color: '#f4f4f2' }));
    this.balle.visible = false; c.scene.add(this.balle); c.garder(this.balle);
    this.bf = { s: 0, t: 0, vs: 0.9, vt: 0.4, tBut: 0, tToc: 0 };
    this.rnd = hasard(31);
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
    if (entrer) while (this.n < this.L.gens.length) this.creer();
    // la porte fermée arrête (on n'entre pas sans la passer) ; le temps de la passer, plus
    const pc = this.L.colPorte;
    if (pc) pc.fantome = true;
    c.gestes.passer(this.L, entrer, {
      fondu: noir => $('fondu').classList.toggle('noir', noir),
      passe: () => {
        c.jeu.dedans = entrer ? 'solumatic' : false; c.regarder(entrer, 40); c.isoler(entrer);
        c.cam.pret = false; c.cam.yaw = entrer ? OUEST : EST; this.voir();
        if (!entrer) c.jeu.joueur.m.groupe.visible = true;
      },
      fin: () => { if (pc) pc.fantome = false; },
    });
  }
  // le toit, ou l'intérieur (dedans, ou porte ouverte : par l'embrasure, on voit l'entrée) ; derrière les vitres, le jour
  // (un ciel clair) ou la nuit
  voir() {
    this.c.monde.vitresSolu.material.color.set('#d9e6ef').lerp(NUIT_VITRE.set('#1c2536'), UNI.uNuit.value);
    const m = this.c.monde, d = this.dedans;
    m.toitSolu.visible = !d;
    m.interieurSolu.visible = d || this.porte.rotation.y > 0.01;
    for (const g of this.gens) g.p.m.groupe.visible = d;
  }
  // une personne de plus (dans l'ordre du plan) ; rnd : le tirage de sa tenue
  creer() {
    const s = this.L.gens[this.n], r = this.rnd, pk = a => a[Math.floor(r() * a.length)];
    const femme = r() < 0.45;
    const p = new Pieton(perso({
      femme, peau: pk(PEAUX), cheveux: pk(CHEV), coiffure: femme ? pk(['carre', 'queue', 'chignon']) : pk(['court', 'court', 'chauve']), barbe: !femme && r() < 0.3,
      tenue: pk(['pull', 'chemise', 'veste']), haut: pk(HAUTS), bas: pk(BAS), lunettes: r() < 0.3, chapeau: null, ...TENUES[s.role],
    }));
    if (s.assis) {
      p.assis = true; p.clavier = s.clavier; p.telephone = !!s.telephone;
      p.m.groupe.position.set(s.x, -0.34, s.z); p.m.groupe.rotation.y = s.h; p.h = s.h; p.sync(0, 0); p.pos.copy(p.m.groupe.position);
    } else p.placer(s.x, s.z, s.h);
    const g = { p, s, role: s.role, etq: this.c.hud.etiquette('', 'bulle'), tParle: 0, i: this.n, ph: this.n * 1.7, t: r() * 8, vu: true, saut: 0, dtA: 0 };
    if (s.role === 'babyfoot') { g.mains = { d: [-0.22, 0.9, 0.38], g: [0.22, 0.9, 0.38] }; p.outil = g.mains; }
    p.m.groupe.visible = this.dedans; this.c.scene.add(p.m.groupe); this.c.garder(p.m.groupe); this.gens.push(g); this.n++;
    // le premier développeur va chercher un café de temps en temps
    if (s.role === 'dev' && s.h === OUEST && !this.marcheur) { this.marcheur = g; g.marche = { k: 0, sens: 0, t: 25 + r() * 20, x0: s.x, z0: s.z, h0: s.h }; }
  }
  // Aucun mur entre (ax, az) et (bx, bz) ? (les cloisons du plan, en boîtes ; méthode des tranches)
  libre(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    for (const [x0, z0, x1, z1] of this.L.murs) {
      let t0 = 0, t1 = 1;
      if (Math.abs(dx) < 1e-6) { if (ax < x0 || ax > x1) continue; } else { let a = (x0 - ax) / dx, b = (x1 - ax) / dx; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
      if (Math.abs(dz) < 1e-6) { if (az < z0 || az > z1) continue; } else { let a = (z0 - az) / dz, b = (z1 - az) / dz; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
      return false;
    }
    return true;
  }
  // la nature du sol sous les pieds (le bruit des pas) : la moquette des bureaux, le carrelage ailleurs
  sol(x, z) {
    for (const k of ['terre', 'venus', 'saturne', 'jupiter', 'soleil']) { const q = P[k]; if (x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1) return 'herbe'; }
    return 'asphalte';
  }
  // les étiquettes de la porte ; dehors, en approchant, ceux qui y travaillent sont créés ; dedans, ils vivent. Rend vrai
  // si une étiquette est proposée
  maj(dt, t) {
    const c = this.c, libre = !c.tel.ouvert && !c.gestes.actif, h = c.hud, L = this.L;
    const dehors = libre && this.porteDehors, dedans = libre && this.porteDedans;
    h.placer(this.etq.entrer, L.seuil.x + 0.3, 2.6, L.seuil.z, dehors);
    h.placer(this.etq.sortir, L.seuil.x - 0.5, 2.3, L.seuil.z, dedans);
    const vu = this.dedans || this.porte.rotation.y > 0.01;
    if (vu !== this.vu) { this.vu = vu; this.voir(); }
    if (this.dedans && this.img % 60 === 0) this.voir(); // (la nuit qui tombe, derrière les vitres)
    if (!this.dedans) {
      // (un personnage coûte 3 ms à créer : un toutes les trois images, en approchant à moins de 60 m)
      const e = c.jeu.auVolant ? c.jeu.tr.pos : c.jeu.joueur.pos;
      if (this.n < L.gens.length && ++this.tc % 3 === 0 && Math.hypot(e.x - (SOLU.x0 + SOLU.x1) / 2, e.z - (SOLU.z0 + SOLU.z1) / 2) < 60) this.creer();
      return dehors || dedans;
    }
    this.vivre(dt, t);
    return dehors || dedans;
  }
  vivre(dt, t) {
    const c = this.c, h = c.hud, j = c.jeu.joueur.pos, cam = c.camera.position, img = ++this.img, son = c.son;
    // qui voit-on ? (refait toutes les six images)
    const revoir = img % 6 === 0;
    this.tBulle -= dt; // (un seul parle à la fois)
    this.babyfoot(dt, t);
    for (const g of this.gens) {
      const p = g.p, gp = p.assis ? p.m.groupe.position : p.pos;
      if (revoir) { const v = Math.hypot(gp.x - cam.x, gp.z - cam.z) < 2.5 || this.libre(cam.x, cam.z, gp.x, gp.z); if (v !== g.vu) { g.vu = v; p.m.maillage.visible = v; } }
      if (g.marche) this.marcher(g, dt, t, j);
      const d = Math.hypot(j.x - gp.x, j.z - gp.z);
      // il lève les yeux vers qui passe tout près, le salue de temps en temps (un seul à la fois)
      g.tParle -= dt;
      if (g.vu && d < 2.4 && g.tParle <= 0 && this.tBulle <= 0 && !c.gestes.actif) {
        g.tParle = 45; this.tBulle = 3; if (!p.assis && g.role !== 'babyfoot') p.saluer();
        const l = TXT[g.role] || TXT.bonjour; h.bulle(g.etq, l[g.i++ % l.length], 3);
      }
      if (g.etq.vu) h.placer(g.etq, gp.x, p.assis ? 1.75 : 2.25, gp.z, g.vu);
      if (!g.vu && !g.marche) continue;
      // animé à chaque image de près, une sur deux à moins de 12 m, une sur quatre au-delà
      g.dtA += dt;
      const pas = d < 6 ? 1 : d < 12 ? 2 : 4;
      if ((img + g.ph * 7) % pas >= 1 && !g.marche) continue;
      const dA = g.dtA; g.dtA = 0;
      this.attitude(g, d, j, dA, t);
      if (g.marche && g.marche.sens) continue; // (marcher a déjà animé)
      if (p.assis) p.sync(dA, t + g.ph); else p.update(dA, 0, 0, 0, false, LIBRE, t + g.ph);
      if (g.role === 'dev' || g.role === 'commercial' || g.role === 'stagiaire') { g.t -= dA; if (g.t <= 0 && d < 7 && p.clavier) { g.t = 0.4 + this.rnd() * 1.6; son.clavier(Math.max(0, 1 - d / 7)); } }
    }
  }
  // où il regarde : son écran, qui passe tout près, son voisin de réunion, la télé, son collègue ; le formateur se tourne
  // vers la télé puis vers la salle, et parle avec les mains
  attitude(g, d, j, dt, t) {
    const p = g.p, s = g.s;
    if (d < 3 && !g.marche?.sens) { p.regard = { x: j.x, y: 1.6, z: j.z }; return; }
    if (g.role === 'formateur') {
      g.t -= dt;
      if (g.t <= 0) { g.t = 3 + this.rnd() * 4; g.versTele = !g.versTele; if (!g.versTele && this.rnd() < 0.6) p.saluer(); }
      p.regard = g.versTele ? { x: SOLU.x1 - 13.6, y: 1.55, z: -57.1 } : { x: 211.6, y: 1.1, z: -57.1 };
      return;
    }
    p.regard = s.regard || null;
    if (g.role === 'cafe') { g.t -= dt; if (g.t <= 0) { g.t = 4 + this.rnd() * 5; p.saluer(); } }
  }
  // l'aller et retour d'un développeur jusqu'à la machine à café
  marcher(g, dt, t, j) {
    const m = g.marche, p = g.p;
    if (!m.sens) {
      m.t -= dt;
      if (m.t > 0) return;
      // il se lève : debout à côté de sa chaise, il part
      m.sens = 1; m.k = 0; p.assis = false; p.clavier = false; p.placer(m.x0 + 0.5, m.z0, EST); p.m.maillage.visible = true; g.vu = true;
    }
    const pts = m.sens > 0 ? CAFE : [...CAFE].reverse().concat([[m.x0 + 0.5, m.z0]]);
    if (m.pause > 0) { m.pause -= dt; p.update(dt, 0, 0, 0, false, LIBRE, t); if (m.pause <= 0) { m.sens = -1; m.k = 0; } return; }
    const [tx, tz] = pts[m.k], ex = tx - p.pos.x, ez = tz - p.pos.z, dd = Math.hypot(ex, ez);
    // quelqu'un devant lui (le joueur) : il attend
    const jx = j.x - p.pos.x, jz = j.z - p.pos.z, gene = Math.hypot(jx, jz) < 1.0 && (jx * ex + jz * ez) > 0;
    if (dd < 0.15) {
      if (++m.k >= pts.length) {
        if (m.sens > 0) { m.pause = 9; p.h = SUD; p.update(dt, 0, 0, 0, false, LIBRE, t); return; }
        // revenu : il se rassoit
        m.sens = 0; m.t = 50 + this.rnd() * 40; p.assis = true; p.clavier = true; p.regard = null; p.m.groupe.position.set(m.x0, -0.34, m.z0); p.m.groupe.rotation.y = m.h0; p.h = m.h0; p.sync(0, 0); p.pos.copy(p.m.groupe.position);
        return;
      }
    }
    p.update(dt, gene ? 0 : ex / (dd || 1), gene ? 0 : ez / (dd || 1), gene ? 0 : 1, false, LIBRE, t, Math.min(1.25, 0.3 + dd * 1.5));
  }
  // le baby-foot : la balle va et vient, les joueurs tirent et poussent leurs barres, un but de temps en temps
  babyfoot(dt, t) {
    const b = this.bf, BF = this.L.babyfoot, joueurs = this.gens.filter(g => g.role === 'babyfoot');
    if (joueurs.length < 2) return;
    const cam = this.c.camera.position, pres = Math.hypot(cam.x - BF.x, cam.z - BF.z) < 14;
    this.balle.visible = pres && this.dedans;
    if (!pres) return;
    b.tBut -= dt; b.tToc -= dt;
    if (b.tBut > 0) { b.s = 0; b.t = 0; } else {
      b.s += b.vs * dt; b.t += b.vt * dt;
      if (Math.abs(b.t) > 0.3) { b.t = Math.sign(b.t) * 0.3; b.vt = -b.vt; }
      // une barre la frappe : elle repart, plus ou moins vite
      if (b.tToc <= 0 && this.rnd() < dt * 3.2) { b.vs = -Math.sign(b.vs) * (0.6 + this.rnd() * 1.4); b.vt = (this.rnd() - 0.5) * 1.2; b.tToc = 0.25; this.c.son.babyfoot(Math.max(0, 1 - Math.hypot(cam.x - BF.x, cam.z - BF.z) / 12)); }
      if (Math.abs(b.s) > 0.56) {
        if (Math.abs(b.t) < 0.1) { const g = joueurs[b.s > 0 ? 0 : 1]; this.c.hud.bulle(g.etq, TXT.but[Math.floor(this.rnd() * TXT.but.length)], 2.2); b.tBut = 1.6; b.vs = (this.rnd() < 0.5 ? -1 : 1) * 0.9; this.c.son.babyfoot(1); }
        else { b.s = Math.sign(b.s) * 0.56; b.vs = -b.vs; }
      }
    }
    this.balle.position.set(BF.x + b.t, 0.78, BF.z + b.s);
    // les mains sur les barres : elles poussent et tirent, plus vite quand la balle est de leur côté
    for (const g of joueurs) {
      const k = 1 + 2 * Math.max(0, -g.s.cote * b.s), ph = t * (5 + k * 3) + g.ph;
      g.mains.d[2] = 0.38 + Math.sin(ph) * 0.05 * k; g.mains.g[2] = 0.38 + Math.sin(ph * 1.3 + 1) * 0.05 * k;
      g.mains.d[1] = 0.9 + Math.sin(ph * 0.7) * 0.015; g.mains.g[1] = 0.9 + Math.cos(ph * 0.9) * 0.015;
      g.p.regard = { x: this.balle.position.x, y: 0.8, z: this.balle.position.z };
    }
  }
  // les taches de contact de ceux qui sont debout (main.js : majTaches)
  taches(T) { for (const g of this.gens) if (g.vu && !g.p.assis) T.poser(g.p.pos.x, g.p.pos.z, 0.4, 0.4, 0); }
  // la caméra à hauteur d'homme ; de tout près (dos au mur), on ne se voit plus
  camera(dt) {
    const c = this.c, j = c.jeu.joueur, d = c.cam.interieur(dt, j.pos.x, j.pos.z, j.h, j.v, this.L.murs, SOLU.HP, this.L.portes);
    const voir = d > 0.45 || c.gestes.actif;
    if (j.m.groupe.visible !== voir) j.m.groupe.visible = voir;
  }
}
