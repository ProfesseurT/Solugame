// Les bureaux de Solumatic, au fond de la zone d'activités des Coteaux (Teddy, 25/11/2026 : « tu vas reprendre
// l'entreprise Solumatic, le vrai logo dessus » ; « on est sur un rez-de-chaussée unique » ; « on va pouvoir rentrer
// dedans »). Le bâtiment est dessiné dans monde.js (zoneActivites) ; ici : sa place, le plan de l'intérieur, son mobilier,
// ses écrans et ses affiches, ceux qui y travaillent, et le jeu (entrer, sortir, la caméra à hauteur d'homme).
//
// Le plan (Teddy, 26/11/2026 : le plan d'évacuation affiché dans l'entrée, photographié de biais et redressé, 21,35 x
// 25,6 m dedans) est posé tourné d'un demi-tour : son haut (l'ancien atelier, Soleil, Atlas, « qui donnent sur la
// devanture ») est la façade sud, sur le parvis et la grille ; sa gauche (l'entrée, Mars, Terre, Vénus, Mercure) est la
// façade est. Les pièces (Teddy, 26 et 27/11/2026) : Jupiter, le développement ; Uranus, le bureau du patron ; Neptune,
// celui de l'associé ; Saturne, les commerciales ; Mercure, une salle de réunion ; Atlas, la grande salle (« une belle
// télé, un baby-foot, des tables en U ») ; Mars, la cuisine ; l'ancien atelier, le plateau de la maintenance (« c'est un
// plateau téléphonique, pas un bureau de réparation ») ; Soleil, le plateau de la formation à distance (« c'est pareil,
// un plateau d'appel pour faire des formations à distance ») ; Terre et Vénus, deux bureaux ; au milieu, la chaufferie
// (au fioul), les sanitaires, le local ménage, les moyens généraux, entourés du couloir. Seule la disposition des pièces
// est reprise du plan (ni l'adresse, ni le reste du document). Qui est où : textes.js, EQUIPE.
import * as THREE from 'three';
import { B, C, S, fusion, UNI } from './modeles.js';
import { perso, persoPas, tirerApparence, OS } from './perso.js';
import { Pieton } from './pieton.js';
import { logoSolumatic } from './logo.js';
import { SOLUMATIC as TXT, EQUIPE } from './textes.js';
import { $, hasard, jourDe, heureDe, ouvert, dateJeu, HORAIRES, angle, lisse } from './outils.js';

// Le plan en mètres : u vers la droite du plan (l'ouest), v vers le bas (le nord), depuis l'angle intérieur en haut à
// gauche (au sud-est). Agrandi de 30 % (Teddy, 27/11/2026 : « augmenter les proportions de 30 %, afin qu'on puisse se
// déplacer plus facilement ») : un mètre du plan fait K mètres dans le monde (X, Z) ; les portes et le mobilier gardent
// leur vraie taille. Murs extérieurs de 30 cm, 4 m sous l'acrotère ; dedans, un faux plafond à 3 m.
export const K = 1.3;
const XE = 226, ZS = -60, LU = 21.35, LV = 25.6;
const X = u => XE - K * u, Z = v => ZS - K * v;
export const SOLU = { x0: X(LU), x1: XE, z0: Z(LV), z1: ZS, ep: 0.3, H: 4.0, HC: 3.05, HP: 3.0 };
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
// la hauteur des fenêtres (appui, linteau), la même dehors (monde.js) et dedans
export const FEN = { y0: 0.9, y1: 2.55 };
// plus de vitrines dans la devanture (Teddy, 27/11/2026 : « à droite du panneau, c'est aussi des fenêtres pas des portes
// fenêtres ») : l'atelier, devenu un plateau téléphonique, a ses fenêtres comme les autres (VITRINE reste pour mémoire)
export const VITRINES = [], VITRINE = { l: 1.8, y0: 0.45, y1: 2.4 };
// les fenêtres des murs extérieurs : [mur, position le long, largeur] (sud et nord : x ; est et ouest : z). Au sud, la
// devanture : juste après la baie d'Atlas, une suite régulière (2,2 m d'axe en axe, sauf aux cloisons), celles de Soleil
// sous la bâche, puis celles du plateau téléphonique. Toutes à 25 cm au moins des cloisons qui touchent le mur.
export const FENETRES = [
  ...[16.35, 14.65, 12.6, 10.9, 9.2, 7.5, 5.0, 3.3, 1.6].map(u => ['s', X(u), 1.6]),
  ['e', Z(11.2), 2.0], ['e', Z(14.22), 2.0], ['e', Z(17.05), 2.0], ['e', Z(19.67), 2.0], ['e', Z(22.75), 2.0],
  ['n', X(4.98), 2.0], ['n', X(7.92), 2.0], ['n', X(10.9), 2.0], ['n', X(13.85), 2.0],
  ['o', Z(4.8), 2.0], ['o', Z(7.08), 2.0], ['o', Z(10.6), 2.0], ['o', Z(13.4), 2.0], ['o', Z(16.45), 2.0], ['o', Z(19.08), 2.0],
  ['o', Z(21.88), 2.0], ['o', Z(24.5), 2.0],
];

/* Les cloisons du plan, en mètres (axes) : ['u', u, v0, v1, portes] (le long de v) ou ['v', v, u0, u1, portes] (le long
   de u). Une porte : [centre (en mètres du plan), largeur (en vrais mètres : le plan grandit, pas les portes), charnière
   (-1 : au début, 1 : à la fin, 0 : double porte), côté où s'ouvre le battant (-1, 1), angle d'ouverture (0 : fermée),
   plaque (une case de la texture, posée du côté d'où l'on vient)]. Les portes qui donneraient dans un couloir s'ouvrent du
   côté de la pièce, la charnière contre le mur voisin : ouvert, le battant est rangé contre lui. */
const D = Math.PI / 2, A = 2.9;
const CLOISONS = [
  ['u', 6.5, 0, 6.2, [[3.62, 1.7, 0, 1, D, 'p:soleil']]],                                         // maintenance | Soleil
  ['v', 6.2, 0, 6.5, [[5.95, 1.0, 1, -1, D, 'p:atelier']]],                                       // maintenance | couloir
  ['v', 6.2, 6.5, 13.72, []],                                                                     // Soleil | couloir
  ['u', 13.72, 0, 8.15, [[7.18, 1.05, -1, 1, A, 'p:atlas']]],                                     // Soleil, couloir | Atlas
  ['v', 9.2, 0, 4.77, []],                                                                        // entrée | Mars
  ['u', 4.77, 7.7, 21.5, [[9.75, 0.95, -1, -1, D, 'p:mars'], [14.95, 1.0, 1, -1, D], [15.95, 0.9, -1, -1, D, 'p:terre'], [19.0, 0.95, -1, -1, D, 'p:venus']]],
  ['v', 15.45, 0, 4.77, []], ['v', 18.5, 0, 4.77, []],                                           // Mars | Terre | Vénus
  ['v', 21.5, 0, 9.15, [[5.45, 1.1, -1, 1, A, 'p:mercure']]],                                     // Vénus, couloir | Mercure
  ['u', 9.15, 21.5, LV + 0.15, []],                                                               // Mercure | Neptune
  ['v', 21.5, 9.15, 12.45, [[11.95, 1.0, 1, 1, D, 'p:neptune']]],                                 // couloir | Neptune
  ['u', 12.45, 21.5, LV + 0.15, []],                                                              // Neptune | Uranus
  ['v', 21.55, 12.45, 16.95, [[16.45, 1.0, 1, 1, D, 'p:uranus']]],                               // couloir | Uranus
  ['u', 16.95, 18.85, LV + 0.15, [[19.65, 1.0, 1, 1, D, 'p:jupiter'], [20.65, 1.0, -1, 1, D, 'p:saturne']]], // couloir | Jupiter, Saturne
  ['v', 20.15, 16.95, LU + 0.15, []],                                                             // Jupiter | Saturne
  ['v', 18.85, 15.62, 16.95, []],
  ['u', 15.62, 8.15, 18.85, [[14.3, 1.8, 0, 1, D, 'p:jupiter']]],                                 // couloir | Jupiter
  ['v', 8.15, 13.72, LU + 0.15, [[14.75, 1.0, 1, -1, A], [18.6, 2.0, 0, 1, D]]],                 // Atlas | couloir, Jupiter
  // le bloc du milieu : chaufferie, sanitaires, local ménage, moyens généraux (la chaufferie et le local ménage fermés)
  ['v', 8.15, 6.7, 13.72, [[9.18, 0.95, -1, 1, 0, 'p:chaufferie']]],
  ['u', 6.7, 8.15, 19.7, [[14.9, 0.95, 1, 1, D, 'p:sanitaires'], [18.6, 0.95, -1, 1, 0, 'p:menage']]],
  ['v', 19.7, 6.7, 13.72, []],
  ['u', 13.72, 8.15, 19.7, [[8.65, 1.0, -1, -1, D, 'p:sanitaires'], [14.85, 0.95, 1, -1, D, 'p:sanitaires'], [15.9, 1.0, -1, -1, D, 'p:moyens']]],
  ['u', 9.8, 8.15, 12.05, []], ['v', 12.05, 6.7, 13.72, []], ['v', 15.4, 6.7, 13.72, []], ['u', 9.1, 15.4, 19.7, []],
  ['u', 9.95, 12.05, 15.4, [[12.9, 0.8, -1, -1, 0], [14.65, 0.8, -1, -1, 0]]], ['u', 11.9, 12.05, 15.4, [[12.9, 0.8, -1, 1, 0]]],
  ['v', 13.75, 9.95, 11.9, []],
  ['v', 10.75, 9.8, 13.72, [[10.75, 0.8, -1, -1, 0], [12.65, 0.8, -1, -1, 0]]], ['u', 11.7, 10.75, 12.05, []],
];
// les plaques des portes : le nom de la pièce, ce qu'on y fait (ou qui), la couleur de sa planète
const PLAQUES = {
  atelier: ['Maintenance', 'Plateau du support', '#ef6c26'], soleil: ['Soleil', 'Formation à distance', '#f2b632'], atlas: ['Atlas', 'Grande salle', '#7d8a99'],
  mars: ['Mars', 'Cuisine', '#c0392b'], terre: ['Terre', 'Données · Formation', '#2e86de'], venus: ['Vénus', 'Développement web', '#e0b13a'],
  mercure: ['Mercure', 'Salle de réunion', '#9aa0a6'], neptune: ['Neptune', 'Teddy Pereira', '#3a6ea5'], uranus: ['Uranus', 'Thomas Petit', '#5fb3c4'],
  saturne: ['Saturne', 'Commerce', '#d8b47a'], jupiter: ['Jupiter', 'Développement', '#c98b5b'], chaufferie: ['Chaufferie', 'Accès réservé', null],
  sanitaires: ['Sanitaires', '', null], menage: ['Local ménage', '', null], moyens: ['Moyens généraux', 'Impression · Courrier', null],
};

// les couleurs : murs et plafond (modeles.js : leurs matières), huisseries, portes, mobilier
const MUR = '#f1efea', MUR2 = '#e9e7e1', PLAFOND = '#f2f1ec', PLINTHE = '#d6d4cd', HUIS = '#e2e1dc', PORTE_B = '#c9aa7e', INOX = '#b9bdc2';
const NOIR = '#24262b', GRIS = '#8d9196', ECRAN = '#151a22', ORANGE = '#ef6c26', VITRE = '#3a5068', ALU = '#d3d6d9', PIED = '#3a3d43';
const PLAN = '#e7e2d8', CHENE = '#cdb48c', BLANC = '#f4f3ef', POT = '#e6e1d6', FEUILLES = ['#4f7a3a', '#5f8f44', '#3f6a32', '#6a9a4c'];
const GRES = '#cfd1cf', CARRO = '#d8d9d4', CARRO2 = '#e3e5e3', PARQUET = '#a98a62', NOYER = '#8a6d5a', STORE = '#e8e6df';
const TISSU = ['#4f6a7a', '#8f9a82', '#c96f3b', '#3d4652', '#b9b4aa', '#7d8a99'];
const MANTEAUX = ['#2b2f38', '#4a3a2e', '#6b2e2e', '#2f4a3c', '#7a6a58', '#1f2d44', '#8a8f96', '#3a2a3e'];
// les caps : vers la devanture (le sud), vers le nord, l'est, l'ouest
const SUD = 0, NORD = Math.PI, EST = Math.PI / 2, OUEST = -Math.PI / 2;
const LAMPE_Y = 2.62; // (la hauteur des lampes, pour le shader : sous les dalles lumineuses du faux plafond)

/* ---------------------------------------------------------------- les écrans, les affiches, les plaques
   Une seule texture, peinte une fois au démarrage : le plan d'évacuation, le logo, les écrans de chaque métier (le code et
   l'intégration continue des développeurs, Le bureau des commerciales, la prise en main à distance et les tickets du
   support, la visio et Vitisoft de la formation, l'import de données, le site web, la carte des partenaires), la file
   d'appels du plateau, les télés, les tableaux blancs écrits au feutre, les affiches (les noms des logiciels, sans rien
   promettre), le calendrier de décembre 2026, le cadran des horloges, les pictogrammes (sortie de secours, extincteur,
   défibrillateur), le voyant « En formation », les chevalets au nom de chacun, les plaques des portes. 1024 pixels de large,
   la hauteur d'après ce qu'elle porte : les cases sont rangées en ligne d'horizon, des plus hautes aux plus basses
   (CASES : [x, y, largeur, hauteur]). */
const L_E = [256, 144], L_TB = [256, 160], L_AF = [96, 136];
const TAILLES = {
  plan: [280, 380], kakemono: [128, 320], tele: [400, 225], appels: [400, 225], kanban: [336, 200], logo: [512, 121],
  code: L_E, code2: L_E, build: L_E, crm: L_E, priseEnMain: L_E, tickets: L_E, visio: L_E, logiciel: L_E, donnees: L_E, site: L_E,
  partenaires: L_E, bureau: L_E, bienvenue: L_E, teleMercure: L_E, mail: L_E,
  'tb:support': L_TB, 'tb:jupiter': L_TB, 'tb:saturne': L_TB, 'tb:mercure': L_TB, 'tb:formation': L_TB, 'tb:venus': L_TB,
  vitisoft: L_AF, viticode: L_AF, lebureau: L_AF, vignes: L_AF, chateau: L_AF, equipe: L_AF, calendrier: L_AF,
  liege: [160, 112], horloge: [96, 96], defib: [64, 80], extinct: [48, 48], baes: [64, 28], enFormation: [128, 36], led: [16, 16],
};
for (const e of EQUIPE) TAILLES['nom:' + e.id] = [192, 40];
for (const k in PLAQUES) TAILLES['p:' + k] = [176, 44];
const TEX_L = 1024, CASES = {};
let TEX_H = 0;
{
  const ciel = new Int32Array(TEX_L), liste = Object.entries(TAILLES).sort((a, b) => b[1][1] - a[1][1] || b[1][0] - a[1][0]);
  for (const [nom, [w, h]] of liste) {
    let bx = 0, by = 1e9;
    for (let x = 0; x + w <= TEX_L; x++) {
      if (x && ciel[x] === ciel[x - 1]) continue;
      let m = 0; for (let i = x; i < x + w; i++) if (ciel[i] > m) m = ciel[i];
      if (m < by) { by = m; bx = x; }
    }
    CASES[nom] = [bx, by, w, h];
    for (let i = bx; i < Math.min(TEX_L, bx + w + 2); i++) ciel[i] = by + h + 2;
    TEX_H = Math.max(TEX_H, by + h);
  }
  TEX_H = Math.ceil(TEX_H / 4) * 4;
}
const EQ = Object.fromEntries(EQUIPE.map(e => [e.id, e]));

function peindre(c) {
  const r = hasard(5);
  const R = (x, y, w, h, f) => { c.fillStyle = f; c.fillRect(x, y, w, h); };
  const T = (t, x, y, taille, f, gras = true, al = 'center', ital = false) => { c.fillStyle = f; c.font = `${ital ? 'italic ' : ''}${gras ? 'bold ' : ''}${taille}px Arial, sans-serif`; c.textAlign = al; c.textBaseline = 'middle'; c.fillText(t, x, y); };
  const rond = (x, y, ra, f) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, ra, 0, 7); c.fill(); };
  const arr = (x, y, w, h, ra, f) => { c.fillStyle = f; c.beginPath(); c.moveTo(x + ra, y); c.arcTo(x + w, y, x + w, y + h, ra); c.arcTo(x + w, y + h, x, y + h, ra); c.arcTo(x, y + h, x, y, ra); c.arcTo(x, y, x + w, y, ra); c.closePath(); c.fill(); };
  const trait = (pts, f, l = 2) => { c.strokeStyle = f; c.lineWidth = l; c.lineCap = 'round'; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); };
  const cadre = (x, y, w, h, f, l = 2) => { c.strokeStyle = f; c.lineWidth = l; c.strokeRect(x + l / 2, y + l / 2, w - l, h - l); };
  const degrade = (x, y, w, h, a, b) => { const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(x, y, w, h); };
  const lignes = (x, y, n, pas, l0, l1, f, ep = 3) => { for (let i = 0; i < n; i++) R(x, y + i * pas, l0 + r() * (l1 - l0), ep, f); };
  // une personne en buste (la visio) : les épaules, le cou, la tête, les cheveux
  const buste = (cx, by, k, veste, peau, cheveux) => {
    c.fillStyle = veste; c.beginPath(); c.moveTo(cx - 34 * k, by); c.quadraticCurveTo(cx - 30 * k, by - 26 * k, cx, by - 28 * k); c.quadraticCurveTo(cx + 30 * k, by - 26 * k, cx + 34 * k, by); c.fill();
    R(cx - 5 * k, by - 34 * k, 10 * k, 8 * k, peau); rond(cx, by - 44 * k, 12 * k, peau);
    c.fillStyle = cheveux; c.beginPath(); c.arc(cx, by - 47 * k, 12.5 * k, Math.PI, 0); c.fill();
  };
  // une fenêtre de logiciel : le fond, la barre de titre
  const appli = (x, y, w, h, fond, barre) => { R(x, y, w, h, fond); R(x, y, w, 12, barre); for (let i = 0; i < 3; i++) rond(x + 7 + i * 8, y + 6, 2.5, ['#ff5f57', '#febc2e', '#28c840'][i]); };
  const P = {
    // le plan d'évacuation : les pièces du plan, les sorties en vert, « Vous êtes ici » en rouge
    plan(x0, y0, w, h) {
      const k = 11, ox = x0 + (w - LU * k) / 2, oy = y0 + 56;
      R(x0, y0, w, h, '#f6f5f0'); R(x0, y0, w, 40, '#2c3e66'); T('Plan d\'évacuation', x0 + w / 2, y0 + 20, 20, '#ffffff');
      R(ox, oy, LU * k, LV * k, '#ffffff');
      c.strokeStyle = '#1d1d1d'; c.lineWidth = 3; c.strokeRect(ox, oy, LU * k, LV * k); c.lineWidth = 1.5;
      for (const [o, m, a, b] of CLOISONS) { c.beginPath(); if (o === 'u') { c.moveTo(ox + m * k, oy + a * k); c.lineTo(ox + m * k, oy + b * k); } else { c.moveTo(ox + a * k, oy + m * k); c.lineTo(ox + b * k, oy + m * k); } c.stroke(); }
      const noms = [['Support', 3.2, 3], ['Soleil', 10.1, 3], ['Atlas', 17.5, 3.5], ['Mars', 2.35, 12.3], ['Terre', 2.35, 17], ['Vénus', 2.35, 20], ['Mercure', 4.5, 23.6], ['Neptune', 10.8, 23.6], ['Uranus', 14.7, 23.6], ['Saturne', 19.2, 23], ['Jupiter', 18.5, 14]];
      for (const [n, u, v] of noms) T(n, ox + u * k, oy + v * k, 10, '#1d1d1d', false);
      c.strokeStyle = '#2e9e4f'; c.lineWidth = 2; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(ox + 5.7 * k, oy + 20.5 * k); c.lineTo(ox + 5.7 * k, oy + 7.1 * k); c.lineTo(ox - 0.5 * k, oy + 7.1 * k); c.stroke(); c.setLineDash([]);
      for (const [u, v] of [[-0.6, 7.03], [18.55, -0.6], [-0.6, 5.0]]) rond(ox + u * k, oy + v * k, 5, '#2e9e4f');
      rond(ox + 1.2 * k, oy + 6.9 * k, 6, '#d0312d');
      R(x0 + 10, y0 + h - 30, 14, 14, '#d0312d'); T('Vous êtes ici', x0 + 30, y0 + h - 23, 13, '#1d1d1d', true, 'left');
      R(x0 + 150, y0 + h - 30, 14, 14, '#2e9e4f'); T('Sortie', x0 + 170, y0 + h - 23, 13, '#1d1d1d', true, 'left');
    },
    logo(x, y, w, h) { R(x, y, w, h, '#ffffff'); logoSolumatic(c, x + 16, y + 6, w - 32); },
    led(x, y, w, h) { R(x, y, w, h, '#f4f6f8'); R(x + 2, y + 2, w - 4, h - 4, '#ffffff'); },
    // le bloc de secours au-dessus des portes : la porte, le bonhomme qui court, la flèche
    baes(x, y, w, h) {
      R(x, y, w, h, '#1f9d55'); R(x + 4, y + 4, 14, h - 8, '#ffffff'); R(x + 6, y + 6, 10, h - 12, '#1f9d55');
      rond(x + 30, y + 7, 3, '#ffffff'); trait([[x + 29, y + 11], [x + 27, y + 18], [x + 22, y + 23]], '#ffffff', 3); trait([[x + 27, y + 18], [x + 33, y + 23]], '#ffffff', 3); trait([[x + 24, y + 13], [x + 34, y + 13]], '#ffffff', 2.5);
      trait([[x + 42, y + h / 2], [x + 58, y + h / 2]], '#ffffff', 3); trait([[x + 52, y + h / 2 - 6], [x + 58, y + h / 2], [x + 52, y + h / 2 + 6]], '#ffffff', 3);
    },
    enFormation(x, y, w, h) { R(x, y, w, h, '#b3261e'); R(x + 3, y + 3, w - 6, h - 6, '#d33a2c'); rond(x + 16, y + h / 2, 6, '#ffd7d0'); T('EN FORMATION', x + w / 2 + 8, y + h / 2 + 1, 15, '#ffffff'); },
    // le code : un éditeur sombre, l'arborescence, des lignes en couleurs, en retrait ; code2 : la relecture (les lignes
    // ajoutées en vert, retirées en rouge)
    code(x, y, w, h, relecture) {
      R(x, y, w, h, '#1e2430'); R(x, y, w, 12, '#141821'); R(x + 36, y + 2, 46, 10, '#1e2430'); R(x + 84, y + 2, 46, 10, '#262d3b');
      R(x, y + 12, 34, h - 12, '#191e28'); for (let i = 0; i < 11; i++) R(x + 5 + (i % 3 ? 6 : 0), y + 18 + i * 10, 14 + r() * 12, 3, i === 4 ? '#82aaff' : '#59617a');
      const cols = ['#c792ea', '#82aaff', '#c3e88d', '#f78c6c', '#89ddff', '#ffcb6b', '#a6accd'];
      for (let i = 0; i < 13; i++) {
        const py = y + 17 + i * 8.6;
        if (relecture && (i === 4 || i === 5 || i === 9)) R(x + 36, py - 2, w - 36, 8, i === 9 ? '#3a2228' : '#1f3a2a');
        R(x + 39, py, 8, 3, '#4b5263');
        let px = x + 52 + Math.floor(r() * 4) * 10;
        for (let j = 0, n = 1 + Math.floor(r() * 4); j < n && px < x + w - 16; j++) { const l = 10 + r() * 40; R(px, py, l, 3.5, cols[Math.floor(r() * cols.length)]); px += l + 5; }
      }
      if (!relecture) { R(x + 34, y + h - 30, w - 34, 30, '#11141b'); for (let i = 0; i < 3; i++) R(x + 40, y + h - 25 + i * 8, 50 + r() * 90, 3, i === 2 ? '#3ddc84' : '#a6accd'); }
    },
    code2(x, y, w, h) { P.code(x, y, w, h, true); },
    // l'intégration continue : des chaînes d'étapes, réussies, en cours, une en échec
    build(x, y, w, h) {
      R(x, y, w, h, '#f6f7f9'); R(x, y, w, 16, '#24292f'); T('Intégration continue', x + 8, y + 8, 9, '#ffffff', true, 'left');
      for (let i = 0; i < 5; i++) {
        const py = y + 30 + i * 22, etat = [0, 0, 1, 0, 2][i];
        R(x + 8, py - 8, w - 16, 18, '#ffffff'); rond(x + 18, py + 1, 5, ['#2da44e', '#bf8700', '#cf222e'][etat]);
        R(x + 30, py - 2, 40 + r() * 20, 4, '#57606a');
        for (let k = 0; k < 5; k++) { const sx = x + 120 + k * 24; if (k) R(sx - 18, py, 12, 2, '#d0d7de'); rond(sx, py + 1, 5, k < 3 || etat === 0 ? '#2da44e' : etat === 1 && k === 3 ? '#bf8700' : etat === 2 && k === 3 ? '#cf222e' : '#d0d7de'); }
      }
    },
    // Le bureau, chez les commerciales : la barre, les onglets, « Ma journée », les rappels et un petit agenda
    crm(x, y, w, h) {
      R(x, y, w, h, '#fbfaf8'); R(x, y, w, 16, '#33363d'); rond(x + 10, y + 8, 4, ORANGE); T('Le bureau', x + 18, y + 8.5, 9, '#ffffff', true, 'left');
      R(x, y + 16, 40, h - 16, '#f1ede6'); for (let i = 0; i < 6; i++) R(x + 7, y + 25 + i * 14, 26, 6, i === 1 ? ORANGE : '#c9c4ba');
      T('Ma journée', x + 48, y + 26, 11, '#2b2d31', true, 'left');
      for (let i = 0; i < 4; i++) { const py = y + 38 + i * 24; arr(x + 48, py, 132, 20, 4, '#ffffff'); rond(x + 58, py + 10, 5, ['#5fb87a', ORANGE, '#e0b13a', '#2e86de'][i]); R(x + 68, py + 5, 50 + r() * 40, 4, '#5a5f68'); R(x + 68, py + 12, 30 + r() * 40, 3, '#a7abb3'); }
      R(x + 188, y + 26, 60, 60, '#ffffff'); for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) R(x + 191 + i * 11, y + 30 + j * 13, 9, 10, (i + j * 5) % 7 === 3 ? '#f3d1bd' : '#eeeae3');
      arr(x + 188, y + 96, 60, 16, 4, ORANGE); T('Appeler', x + 218, y + 104.5, 9, '#ffffff');
    },
    // le support : la prise en main à distance (le poste d'un vigneron, Vitisoft ouvert, la flèche de la souris) ; la
    // liste des tickets
    priseEnMain(x, y, w, h) {
      R(x, y, w, h, '#2a2f38'); R(x, y, w, 14, '#2e9e4f'); T('Prise en main à distance', x + 8, y + 7.5, 9, '#ffffff', true, 'left'); arr(x + w - 36, y + 2, 30, 10, 3, '#c0392b'); T('Fin', x + w - 21, y + 7.5, 8, '#ffffff');
      P.logiciel(x + 8, y + 20, w - 16, h - 26);
      c.fillStyle = '#ffffff'; c.strokeStyle = '#111111'; c.lineWidth = 1.2; c.beginPath(); const mx = x + 150, my = y + 70; c.moveTo(mx, my); c.lineTo(mx, my + 16); c.lineTo(mx + 4, my + 12); c.lineTo(mx + 8, my + 19); c.lineTo(mx + 10, my + 18); c.lineTo(mx + 7, my + 11); c.lineTo(mx + 12, my + 11); c.closePath(); c.fill(); c.stroke();
    },
    tickets(x, y, w, h) {
      R(x, y, w, h, '#ffffff'); R(x, y, w, 16, '#3b4a63'); T('Tickets', x + 8, y + 8.5, 10, '#ffffff', true, 'left');
      for (let i = 0; i < 4; i++) arr(x + 60 + i * 44, y + 3, 38, 10, 5, i ? '#56657d' : ORANGE);
      for (let i = 0; i < 8; i++) {
        const py = y + 22 + i * 15; if (i % 2) R(x, py - 2, w, 15, '#f5f7fa');
        T('#' + (4512 + i * 7), x + 6, py + 5.5, 8, '#56657d', true, 'left'); R(x + 44, py + 3, 70 + r() * 60, 4, '#5a5f68');
        arr(x + w - 50, py + 1, 42, 10, 5, ['#e8833a', '#2e86de', '#2da44e'][(i * 2 + 1) % 3]);
      }
    },
    // la formation à distance : la visio (le vigneron devant ses vignes, sa propre image dans le coin, les boutons) ;
    // Vitisoft, montré pendant la formation
    visio(x, y, w, h) {
      R(x, y, w, h, '#1c1f24');
      const vx = x + 4, vy = y + 4, vw = w - 8, vh = h - 30;
      degrade(vx, vy, vw, vh * 0.55, '#a9c8e4', '#e7eef2'); R(vx, vy + vh * 0.55, vw, vh * 0.45, '#7d9a55');
      for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#4f6d34' : '#5e7d3e'; c.beginPath(); c.moveTo(vx + vw / 2, vy + vh * 0.55); c.lineTo(vx + i * vw / 8 - 10, vy + vh); c.lineTo(vx + i * vw / 8 + 6, vy + vh); c.fill(); }
      buste(vx + vw * 0.45, vy + vh, 1.35, '#4a5a3a', '#d9a77c', '#4a3524');
      arr(vx + 4, vy + vh - 14, 58, 11, 3, 'rgba(0,0,0,0.55)'); T('Domaine', vx + 33, vy + vh - 8, 8, '#ffffff');
      R(x + w - 74, y + h - 70, 66, 40, '#f3efe8'); R(x + w - 74, y + h - 70, 66, 6, ORANGE); buste(x + w - 41, y + h - 30, 0.55, '#2b2f3a', '#c58c62', '#2a1d14');
      for (let i = 0; i < 4; i++) rond(x + w / 2 - 36 + i * 24, y + h - 13, 8, i === 3 ? '#d93025' : '#3c4043');
    },
    logiciel(x, y, w, h) {
      R(x, y, w, h, '#f3f4f6'); R(x, y, w, 14, '#111111'); T('VITISOFT', x + 6, y + 7.5, 8.5, '#ffffff', true, 'left'); R(x + w - 60, y + 5, 52, 4, '#6b6f78');
      R(x, y + 14, 44, h - 14, '#ffffff'); for (let i = 0; i < 7; i++) R(x + 6, y + 22 + i * 11, i % 3 ? 26 : 32, 4, i === 2 ? ORANGE : '#b8bcc4');
      const tw = (w - 60) / 3;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const tx = x + 50 + i * (tw + 4), ty = y + 20 + j * ((h - 26) / 2); R(tx, ty, tw, (h - 34) / 2, '#ffffff'); R(tx, ty, tw, 3, ['#2e86de', ORANGE, '#2da44e', '#8e44ad', '#e0b13a', '#16a085'][i + j * 3]); R(tx + 5, ty + 9, tw * 0.5, 4, '#5a5f68'); R(tx + 5, ty + 18, tw * 0.3, 7, '#2b2d31'); }
    },
    // l'import des données d'un nouveau client : le tableau, les colonnes reconnues, la barre d'avancement
    donnees(x, y, w, h) {
      R(x, y, w, h, '#ffffff'); R(x, y, w, 14, '#3b6e8f'); T('Import', x + 6, y + 7.5, 9, '#ffffff', true, 'left');
      for (let j = 0; j < 9; j++) for (let i = 0; i < 7; i++) { const cx = x + 4 + i * 36, cy = y + 20 + j * 11; R(cx, cy, 35, 10, j === 0 ? '#dfe6ec' : i === 2 && j > 0 ? '#e9f5ec' : '#ffffff'); c.strokeStyle = '#d5dbe0'; c.lineWidth = 0.6; c.strokeRect(cx, cy, 35, 10); if (j) R(cx + 3, cy + 4, 8 + r() * 22, 2.5, '#7b808a'); else R(cx + 3, cy + 3, 22, 4, '#3b6e8f'); }
      R(x + 6, y + h - 16, w - 12, 8, '#e4e8ec'); R(x + 6, y + h - 16, (w - 12) * 0.72, 8, '#3b6e8f');
    },
    // le site web : le navigateur, la page d'accueil (les vignes au couchant, le titre, trois encarts, le bouton)
    site(x, y, w, h) {
      R(x, y, w, h, '#e8eaed'); arr(x + 30, y + 3, 190, 10, 5, '#ffffff');
      const py = y + 16, ph = 56; degrade(x, py, w, ph, '#f2a65a', '#f6d9a8');
      for (let i = 0; i < 7; i++) { c.fillStyle = '#4d5d2f'; c.beginPath(); c.moveTo(x + w / 2, py + ph * 0.45); c.lineTo(x + i * w / 6 - 12, py + ph); c.lineTo(x + i * w / 6 + 4, py + ph); c.fill(); }
      R(x + 20, py + 14, 110, 8, '#ffffff'); R(x + 20, py + 26, 80, 5, '#ffffff'); arr(x + 20, py + 36, 44, 12, 6, ORANGE);
      R(x, py + ph, w, h - ph - 16, '#ffffff'); for (let i = 0; i < 3; i++) { R(x + 10 + i * 82, py + ph + 10, 74, 34, '#f4f1ec'); R(x + 16 + i * 82, py + ph + 16, 40, 4, '#5a5f68'); R(x + 16 + i * 82, py + ph + 24, 56, 3, '#a7abb3'); R(x + 16 + i * 82, py + ph + 30, 50, 3, '#a7abb3'); }
    },
    // les partenaires : la carte de France, des épingles, la liste
    partenaires(x, y, w, h) {
      R(x, y, w, h, '#f7f8fa'); R(x, y, w, 14, '#2c3e66'); T('Partenaires', x + 6, y + 7.5, 9, '#ffffff', true, 'left');
      const F = [[0.36, 0.02], [0.52, 0.06], [0.63, 0.14], [0.78, 0.2], [0.8, 0.34], [0.74, 0.45], [0.78, 0.56], [0.86, 0.72], [0.72, 0.8], [0.6, 0.82], [0.5, 0.92], [0.32, 0.86], [0.18, 0.82], [0.24, 0.62], [0.2, 0.48], [0.14, 0.4], [0.02, 0.3], [0.18, 0.22], [0.3, 0.2], [0.3, 0.1]];
      const mx = x + 10, my = y + 20, ms = 116;
      c.fillStyle = '#dfe7ee'; c.strokeStyle = '#9fb3c8'; c.lineWidth = 1.5; c.beginPath(); F.forEach(([u, v], i) => (i ? c.lineTo(mx + u * ms, my + v * ms) : c.moveTo(mx + u * ms, my + v * ms))); c.closePath(); c.fill(); c.stroke();
      for (const [u, v, f] of [[0.38, 0.42, ORANGE], [0.3, 0.6, '#2e86de'], [0.6, 0.18, ORANGE], [0.66, 0.4, '#2e86de'], [0.56, 0.66, ORANGE], [0.74, 0.26, '#2e86de'], [0.48, 0.46, ORANGE]]) { rond(mx + u * ms, my + v * ms - 4, 4, f); R(mx + u * ms - 0.8, my + v * ms - 2, 1.6, 5, f); }
      for (let i = 0; i < 6; i++) { R(x + 140, y + 24 + i * 18, 108, 14, '#ffffff'); rond(x + 148, y + 31 + i * 18, 3, i % 2 ? '#2e86de' : ORANGE); R(x + 156, y + 29 + i * 18, 40 + r() * 40, 4, '#5a5f68'); }
    },
    // un bureau d'ordinateur : le fond, deux fenêtres, la barre des tâches
    bureau(x, y, w, h) {
      degrade(x, y, w, h, '#3a6ea5', '#89b4d9'); appli(x + 14, y + 12, 150, 92, '#f4f6f9', '#dfe5ec'); lignes(x + 24, y + 32, 6, 10, 60, 120, '#9aa6b4');
      appli(x + 120, y + 40, 124, 80, '#ffffff', '#e8ecf1'); R(x + 128, y + 58, 108, 50, '#eef3f8'); R(x, y + h - 12, w, 12, '#20262e'); for (let i = 0; i < 6; i++) R(x + 30 + i * 16, y + h - 9, 10, 6, ['#ef6c26', '#2e86de', '#2da44e', '#e0b13a', '#8e44ad', '#d0d7de'][i]);
    },
    // la messagerie : la liste des courriels, celui qu'on lit
    mail(x, y, w, h) {
      R(x, y, w, h, '#ffffff'); R(x, y, w, 14, '#2e86de'); R(x, y + 14, 90, h - 14, '#f4f6f9');
      for (let i = 0; i < 8; i++) { const py = y + 20 + i * 15; if (i === 1) R(x, py - 3, 90, 15, '#dbe8f6'); rond(x + 8, py + 4, 3.5, ['#ef6c26', '#2e86de', '#2da44e', '#8e44ad'][i % 4]); R(x + 15, py + 1, 50 + r() * 20, 3, '#3b3f46'); R(x + 15, py + 7, 40 + r() * 25, 2.5, '#9aa0a6'); }
      R(x + 98, y + 22, 120, 6, '#2b2d31'); lignes(x + 98, y + 38, 8, 9, 90, 150, '#7b808a');
    },
    bienvenue(x, y, w, h) { R(x, y, w, h, '#ffffff'); logoSolumatic(c, x + 28, y + 30, w - 56); T('Bienvenue', x + w / 2, y + 100, 20, ORANGE); R(x + w / 2 - 40, y + 116, 80, 3, '#d9d5cc'); },
    teleMercure(x, y, w, h) {
      R(x, y, w, h, '#ffffff'); R(x, y, 6, h, ORANGE); T('Ordre du jour', x + 18, y + 22, 18, '#2b2d31', true, 'left');
      for (let i = 0; i < 4; i++) { rond(x + 24, y + 50 + i * 20, 4, ORANGE); R(x + 34, y + 47 + i * 20, 70 + r() * 100, 6, '#5a5d63'); }
      logoSolumatic(c, x + w - 82, y + h - 24, 72); T('1 / 6', x + 20, y + h - 14, 9, '#9aa0a6', false, 'left');
    },
    // la télé d'Atlas : le logo, un bandeau orange
    tele(x, y, w, h) { R(x, y, w, h, '#ffffff'); logoSolumatic(c, x + 40, y + 62, w - 80); R(x, y + h - 30, w, 30, ORANGE); R(x, y + h - 34, w, 4, '#c85a1f'); },
    // la file d'appels du plateau : quatre compteurs (fictifs), qui est en ligne, les appels heure par heure
    appels(x, y, w, h) {
      R(x, y, w, h, '#14213d'); T('File d\'appels · Support', x + 14, y + 18, 16, '#ffffff', true, 'left');
      [['En attente', '2', '#f2b632'], ['En ligne', '4', '#3ddc84'], ['Disponibles', '2', '#5fb3f4'], ['Tickets du jour', '23', '#ffffff']].forEach(([l, n, f], i) => {
        const tx = x + 12 + i * 96; arr(tx, y + 34, 88, 58, 6, '#1f2f52'); T(n, tx + 44, y + 58, 26, f); T(l, tx + 44, y + 82, 10, '#a9bbd9', false);
      });
      const qui = EQUIPE.filter(e => e.piece === 'atelier');
      qui.forEach((e, i) => { const py = y + 110 + i * 17; rond(x + 20, py, 5, i % 3 === 1 ? '#5fb3f4' : '#3ddc84'); T(e.prenom, x + 32, py + 1, 11, '#ffffff', false, 'left'); T(i % 3 === 1 ? 'Disponible' : 'En ligne', x + 150, py + 1, 10, '#a9bbd9', false, 'left'); });
      for (let i = 0; i < 9; i++) { const b = 14 + r() * 60; R(x + 236 + i * 17, y + h - 16 - b, 11, b, i === 8 ? '#3ddc84' : '#4a6fa5'); }
      R(x + 232, y + h - 16, 160, 1.5, '#a9bbd9'); T('Appels par heure', x + 312, y + 112, 10, '#a9bbd9', false);
    },
    // le tableau des tâches de Jupiter : quatre colonnes, des post-it
    kanban(x, y, w, h) {
      R(x, y, w, h, '#fbfbf8'); c.strokeStyle = '#9aa0a6'; c.lineWidth = 2;
      ['À faire', 'En cours', 'À relire', 'Fait'].forEach((t, i) => { const cx = x + i * w / 4; T(t, cx + w / 8, y + 14, 13, '#2b2d31'); if (i) { c.beginPath(); c.moveTo(cx, y + 6); c.lineTo(cx, y + h - 6); c.stroke(); } });
      const pi = ['#ffe36e', '#9fe0a8', '#8fd1ff', '#ffb0b0', '#ffd08a'];
      for (let i = 0; i < 4; i++) for (let j = 0, n = [5, 3, 2, 6][i]; j < n; j++) { const px = x + i * w / 4 + 8 + (j % 2) * 38, py = y + 30 + Math.floor(j / 2) * 40; R(px, py, 32, 32, pi[Math.floor(r() * pi.length)]); R(px + 4, py + 8, 18 + r() * 6, 2, '#5a5d63'); R(px + 4, py + 14, 12 + r() * 10, 2, '#5a5d63'); }
    },
    // les tableaux blancs, au feutre
    tb(x, y, w, h, quoi) {
      R(x, y, w, h, '#fbfbf8'); R(x, y + h - 3, w, 3, '#e6e6e2');
      const B_ = '#1f5fbf', Ro = '#c23b30', N = '#2b2d31', Ve = '#2e8b4f', F = (t, px, py, s, f, al = 'left') => T(t, px, py, s, f, false, al, true);
      if (quoi === 'support') {
        F('Planning de la semaine', x + 10, y + 14, 14, B_);
        ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].forEach((d, i) => F(d, x + 70 + i * 36, y + 34, 11, N, 'center'));
        EQUIPE.filter(e => e.piece === 'atelier').forEach((e, j) => { F(e.prenom, x + 10, y + 52 + j * 17, 10, N); for (let i = 0; i < 5; i++) if ((i + j) % 4) trait([[x + 62 + i * 36, y + 52 + j * 17], [x + 66 + i * 36, y + 56 + j * 17], [x + 76 + i * 36, y + 46 + j * 17]], (i + j) % 3 ? Ve : B_, 2); else F('R', x + 70 + i * 36, y + 52 + j * 17, 11, Ro, 'center'); });
      } else if (quoi === 'jupiter') {
        const boite = (bx, by, t) => { c.strokeStyle = B_; c.lineWidth = 2; c.strokeRect(bx, by, 60, 28); F(t, bx + 30, by + 14, 11, N, 'center'); };
        boite(x + 14, y + 22, 'Appli'); boite(x + 100, y + 22, 'API'); boite(x + 186, y + 22, 'Base'); boite(x + 100, y + 96, 'Tests');
        trait([[x + 74, y + 36], [x + 100, y + 36]], N); trait([[x + 160, y + 36], [x + 186, y + 36]], N); trait([[x + 130, y + 50], [x + 130, y + 96]], Ro); F('v2 ?', x + 140, y + 74, 12, Ro); F('Ne pas effacer', x + 10, y + h - 14, 10, Ro);
      } else if (quoi === 'saturne') {
        F('Cette semaine', x + 10, y + 16, 14, B_);
        for (let i = 0; i < 5; i++) { const b = 24 + r() * 60; c.strokeStyle = i === 4 ? Ve : B_; c.lineWidth = 2; c.strokeRect(x + 26 + i * 34, y + h - 26 - b, 20, b); F(['L', 'M', 'M', 'J', 'V'][i], x + 36 + i * 34, y + h - 14, 10, N, 'center'); }
        F('Bravo l\'équipe !', x + 196, y + 40, 12, Ve, 'center'); c.strokeStyle = Ro; c.lineWidth = 2; c.beginPath(); c.arc(x + 214, y + 80, 16, 0, 7); c.stroke(); c.beginPath(); c.arc(x + 214, y + 82, 9, 0.3, Math.PI - 0.3); c.stroke(); rond(x + 208, y + 75, 2, Ro); rond(x + 220, y + 75, 2, Ro);
      } else if (quoi === 'mercure') {
        c.strokeStyle = B_; c.lineWidth = 2; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, 44, 18, 0, 0, 7); c.stroke(); F('Salon des vins', x + w / 2, y + h / 2, 12, N, 'center');
        [['Stand', -100, -52], ['Démos', 70, -54], ['Planning', -104, 50], ['Goodies', 74, 52]].forEach(([t, dx, dy]) => { trait([[x + w / 2 + dx * 0.4, y + h / 2 + dy * 0.4], [x + w / 2 + dx * 0.75, y + h / 2 + dy * 0.75]], N); F(t, x + w / 2 + dx, y + h / 2 + dy, 12, dx < 0 ? Ro : Ve, 'center'); });
      } else if (quoi === 'formation') {
        F('Parcours de formation', x + 10, y + 16, 14, B_);
        ['Prise en main', 'Commandes', 'Factures', 'DRM'].forEach((t, i) => { c.strokeStyle = N; c.lineWidth = 1.6; c.strokeRect(x + 14, y + 36 + i * 28, 14, 14); if (i < 2) trait([[x + 16, y + 43 + i * 28], [x + 21, y + 48 + i * 28], [x + 30, y + 34 + i * 28]], Ve, 2.4); F((i + 1) + '. ' + t, x + 38, y + 44 + i * 28, 12, N); });
      } else {
        c.strokeStyle = N; c.lineWidth = 1.6; c.strokeRect(x + 12, y + 12, w - 24, h - 30); R(x + 12, y + 12, w - 24, 14, '#e8e8e4'); c.strokeRect(x + 24, y + 34, w - 48, 40);
        trait([[x + 24, y + 34], [x + w - 24, y + 74]], N, 1); trait([[x + w - 24, y + 34], [x + 24, y + 74]], N, 1);
        for (let i = 0; i < 3; i++) c.strokeRect(x + 24 + i * 72, y + 84, 62, 36); F('Accueil', x + 18, y + 20, 10, B_); F('mobile d\'abord !', x + w - 16, y + h - 10, 11, Ro, 'right');
      }
    },
    // les affiches : les noms des logiciels (rien de promis), deux paysages, la photo de l'équipe, le calendrier
    affiche(x, y, w, h, nom) {
      const titre = (t, f, fond) => { if (fond) R(x, y + h - 32, w, 32, fond); T(t, x + w / 2, y + h - 16, 14, f); };
      if (nom === 'vitisoft') { R(x, y, w, h, '#2b2d31'); for (const [dx, dy] of [[0, 0], [-11, 13], [11, 13], [-5, 26], [6, 26], [0, 39]]) rond(x + w / 2 + dx, y + 34 + dy, 8, '#8e2c48'); R(x + w / 2 - 1, y + 16, 2, 12, '#5a7a3a'); titre('Vitisoft', '#ffffff'); }
      else if (nom === 'viticode') { R(x, y, w, h, '#ffffff'); cadre(x, y, w, h, '#2b2d31', 4); const q = 6; for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if ((i < 3 && j < 3) || (i > 5 && j < 3) || (i < 3 && j > 5) || r() < 0.45) R(x + w / 2 - 27 + i * q, y + 20 + j * q, q, q, '#2b2d31'); titre('Viticode', '#2b2d31'); }
      else if (nom === 'lebureau') { R(x, y, w, h, ORANGE); arr(x + w / 2 - 18, y + 16, 36, 62, 6, '#ffffff'); R(x + w / 2 - 14, y + 24, 28, 44, '#33363d'); for (let i = 0; i < 4; i++) R(x + w / 2 - 10, y + 29 + i * 9, 20, 5, i === 1 ? ORANGE : '#8a8f96'); titre('Le bureau', '#ffffff'); }
      else if (nom === 'vignes') { degrade(x, y, w, h * 0.5, '#9cc3e6', '#f3e4c4'); c.fillStyle = '#6f8f4a'; c.beginPath(); c.moveTo(x, y + h * 0.48); c.quadraticCurveTo(x + w * 0.5, y + h * 0.36, x + w, y + h * 0.5); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.fill(); for (let i = 0; i < 8; i++) trait([[x + w / 2, y + h * 0.46], [x - 30 + i * 22, y + h]], '#3f5a2a', 3); cadre(x, y, w, h, '#ffffff', 5); }
      else if (nom === 'chateau') { degrade(x, y, w, h * 0.62, '#f29e5c', '#f9d9a0'); R(x, y + h * 0.62, w, h * 0.38, '#5a7fa3'); c.fillStyle = '#3a3340'; R(x + 22, y + 52, 52, 30, '#3a3340'); for (const [tx, tw] of [[16, 14], [66, 14], [40, 12]]) { R(x + tx, y + 44, tw, 38, '#3a3340'); c.beginPath(); c.moveTo(x + tx - 3, y + 44); c.lineTo(x + tx + tw / 2, y + 22); c.lineTo(x + tx + tw + 3, y + 44); c.fill(); } cadre(x, y, w, h, '#ffffff', 5); }
      else if (nom === 'equipe') { R(x, y, w, h, '#3b3f46'); R(x + 5, y + 5, w - 10, h - 10, '#c9d6df'); R(x + 5, y + h * 0.62, w - 10, h * 0.38 - 5, '#8aa070'); for (let i = 0; i < 7; i++) { const px = x + 14 + i * 11.5, py = y + 62 + (i % 2) * 8; R(px - 5, py, 10, 22, ['#ef6c26', '#2e86de', '#3f7d4a', '#8e44ad', '#2b2d31', '#e0b13a', '#c0392b'][i]); rond(px, py - 5, 5, ['#e0ac69', '#8d5524', '#f1c27d', '#c68642', '#ffdbac', '#a0673c', '#e8b98a'][i]); } }
      else if (nom === 'calendrier') {
        R(x, y, w, h, '#ffffff'); R(x, y, w, 26, '#c0392b'); T('Décembre 2026', x + w / 2, y + 13, 11, '#ffffff');
        ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((d, i) => T(d, x + 9 + i * 13, y + 36, 8, '#5a5d63'));
        for (let d = 1; d <= 31; d++) { const k = d + 0, i = (k) % 7, j = Math.floor((k) / 7); T(String(d), x + 9 + i * 13, y + 50 + j * 15, 8, i > 4 ? '#c0392b' : '#2b2d31', d === 25); }
      }
    },
    // le liège de la cuisine : des notes punaisées
    liege(x, y, w, h) {
      R(x, y, w, h, '#7a5a3a'); R(x + 5, y + 5, w - 10, h - 10, '#c49a6c'); for (let i = 0; i < 260; i++) R(x + 5 + r() * (w - 12), y + 5 + r() * (h - 12), 2, 2, r() < 0.5 ? '#b0875a' : '#d4ab7c');
      [[14, 12, 40, 50, '#ffffff'], [62, 18, 34, 34, '#ffe36e'], [104, 10, 44, 56, '#ffffff'], [24, 68, 54, 34, '#ffb0b0'], [92, 70, 52, 32, '#9fe0a8']].forEach(([px, py, pw, ph, f], i) => { R(x + px, y + py, pw, ph, f); lignes(x + px + 4, y + py + 8, Math.floor(ph / 9), 7, pw * 0.4, pw * 0.8, '#7b808a', 2); rond(x + px + pw / 2, y + py + 3, 3, ['#c0392b', '#2e86de', '#2da44e', '#e0b13a', '#8e44ad'][i]); });
    },
    // le cadran des horloges (les aiguilles sont à part : elles tournent avec l'heure du jeu)
    horloge(x, y, w, h) {
      R(x, y, w, h, '#ffffff'); rond(x + w / 2, y + h / 2, w / 2 - 1, '#2b2d31'); rond(x + w / 2, y + h / 2, w / 2 - 6, '#fbfbf8');
      for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, l = i % 5 ? 3 : 8, ra = w / 2 - 9; trait([[x + w / 2 + Math.sin(a) * ra, y + h / 2 - Math.cos(a) * ra], [x + w / 2 + Math.sin(a) * (ra - l), y + h / 2 - Math.cos(a) * (ra - l)]], '#2b2d31', i % 5 ? 1 : 2.5); }
      T('12', x + w / 2, y + 24, 11, '#2b2d31'); T('6', x + w / 2, y + h - 23, 11, '#2b2d31'); T('3', x + w - 23, y + h / 2 + 1, 11, '#2b2d31'); T('9', x + 23, y + h / 2 + 1, 11, '#2b2d31');
    },
    defib(x, y, w, h) { arr(x, y, w, h, 6, '#1f9d55'); c.fillStyle = '#ffffff'; c.beginPath(); const cx = x + w / 2, cy = y + 34; c.moveTo(cx, cy + 16); c.bezierCurveTo(cx - 26, cy - 2, cx - 12, cy - 22, cx, cy - 8); c.bezierCurveTo(cx + 12, cy - 22, cx + 26, cy - 2, cx, cy + 16); c.fill(); trait([[cx + 2, cy - 10], [cx - 4, cy + 1], [cx + 4, cy + 1], [cx - 2, cy + 12]], '#1f9d55', 3); trait([[x + 14, y + h - 14], [x + w - 14, y + h - 14]], '#ffffff', 3); },
    extinct(x, y, w, h) { R(x, y, w, h, '#d0312d'); arr(x + 17, y + 14, 14, 28, 5, '#ffffff'); R(x + 20, y + 8, 8, 7, '#ffffff'); trait([[x + 28, y + 11], [x + 37, y + 9], [x + 38, y + 18]], '#ffffff', 2.5); },
    // l'oriflamme derrière les formatrices (la caméra la voit) : le logo, des bandes aux couleurs, les noms des logiciels
    kakemono(x, y, w, h) {
      R(x, y, w, h, '#ffffff'); logoSolumatic(c, x + 8, y + 22, w - 16);
      c.fillStyle = ORANGE; c.beginPath(); c.moveTo(x, y + h * 0.58); c.lineTo(x + w, y + h * 0.48); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.fill();
      c.fillStyle = '#33363d'; c.beginPath(); c.moveTo(x, y + h * 0.7); c.lineTo(x + w, y + h * 0.62); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.fill();
      ['Vitisoft', 'Viticode', 'Le bureau'].forEach((t, i) => T(t, x + w / 2, y + h * 0.76 + i * 18, 13, '#ffffff'));
    },
    // un chevalet : le prénom, le nom
    nom(x, y, w, h, id) { const e = EQ[id]; R(x, y, w, h, '#fbfbf8'); R(x, y, 6, h, ORANGE); T(e.prenom, x + 14, y + (e.nom ? 14 : h / 2 + 1), 18, '#2b2d31', true, 'left'); if (e.nom) T(e.nom, x + 14, y + 31, 12, '#6b6f78', false, 'left'); },
    // une plaque de porte : la planète de la pièce, son nom, ce qu'on y fait
    plaque(x, y, w, h, k) {
      const [n, s, f] = PLAQUES[k]; degrade(x, y, w, h, '#eceef0', '#c9ccd0'); cadre(x, y, w, h, '#9aa0a6', 1.5);
      const tx = f ? x + 40 : x + 12; if (f) { rond(x + 21, y + h / 2, 13, f); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(x + 17, y + h / 2 - 4, 5, 0, 7); c.fill(); }
      T(n, tx, y + (s ? 16 : h / 2 + 1), 17, '#2b2d31', true, 'left'); if (s) T(s, tx, y + 33, 11, '#5a5d63', false, 'left');
    },
  };
  for (const [nom, [x, y, w, h]] of Object.entries(CASES)) {
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    const [k, q] = nom.split(':');
    if (k === 'nom') P.nom(x, y, w, h, q); else if (k === 'p') P.plaque(x, y, w, h, q); else if (k === 'tb') P.tb(x, y, w, h, q);
    else if (P[k]) P[k](x, y, w, h); else P.affiche(x, y, w, h, k);
    c.restore();
  }
}
// Les panneaux texturés : affiches (éclairées comme la pièce) et écrans (lumineux : écrans, dalles lumineuses, voyants).
// [{ zone, x, y, z, rot, w, h, bas }] : un rectangle tourné de rot autour de la verticale (bas : posé à plat, tourné vers
// le bas, une dalle du faux plafond). Mémoire : une texture de 1024 x TEX_H.
export function panneauxSolumatic(affiches, ecrans) {
  const cv = document.createElement('canvas'); cv.width = TEX_L; cv.height = TEX_H;
  peindre(cv.getContext('2d'));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const maillage = (liste, mat, nom) => {
    const geos = liste.map(({ zone, x, y, z, rot, w, h, bas }) => {
      const [px, py, pw, ph] = CASES[zone], g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (px + 0.5 + uv.getX(i) * (pw - 1)) / TEX_L, 1 - (py + 0.5 + (1 - uv.getY(i)) * (ph - 1)) / TEX_H);
      if (bas) g.rotateX(Math.PI / 2); g.rotateY(rot); g.translate(x, y, z);
      return g;
    });
    const m = new THREE.Mesh(fusion(geos), mat); m.name = nom; m.matrixAutoUpdate = false;
    return m;
  };
  const ecr = maillage(ecrans, new THREE.MeshBasicMaterial({ map: tex }), 'écrans Solumatic');
  ecr.userData.tex = tex;
  return [maillage(affiches, new THREE.MeshLambertMaterial({ map: tex }), 'affiches Solumatic'), ecr];
}

/* ---------------------------------------------------------------- l'intérieur
   Rend { geos, vitres (les vitres, vues de dedans : le jour derrière), boites (ce qui arrête : [x0, z0, x1, z1]), tournees
   (les battants ouverts : [cx, cz, largeur, épaisseur, rot]), murs et portes (pour la caméra : les cloisons, les
   embrasures ouvertes), pieces et lampes (pour la lumière : lumiere, ses réglages), affiches, ecrans, gens (leur poste),
   babyfoot }. Tout en coordonnées du monde, déduites des pièces (P), du plan (X, Z) et de SOLU : rien n'est écrit en dur,
   le bâtiment peut encore bouger. Ce qui sert à ceux qui y vivent (les lieux du café, de l'imprimante, du baby-foot, de
   la réunion ; les horloges ; le poste de Vanessa) est rangé dans VIE. */
const VIE = { postes: {}, cafe: [], repas: [], imprimante: [], reunion: [], horloges: [], cibles: {}, plantes: [] };
export function interieurSolumatic() {
  const G = [], V = [], boites = [], tournees = [], murs = [], portes = [], affiches = [], ecrans = [], gens = [];
  const e = 0.1, HP = SOLU.HP, HPO = 2.1, { x0, x1, z0, z1 } = SOLU;
  const col = (a, b, c, d) => boites.push([Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d)]);
  const affiche = (zone, x, y, z, rot, w, h, lumineux = false, bas = false) => (lumineux ? ecrans : affiches).push({ zone, x, y, z, rot, w, h, bas });
  const ouvert = (a, b, trous) => { // les morceaux de [a, b] hors des trous [centre, largeur]
    const r = []; let p = a;
    for (const [c, l] of [...trous].sort((s, t) => s[0] - t[0])) { if (c - l / 2 > p) r.push([p, c - l / 2]); p = Math.max(p, c + l / 2); }
    if (b > p) r.push([p, b]);
    return r;
  };
  // un repère tourné : (lx, lz) autour de (x, z), lz vers l'avant (cap h)
  const R = (x, z, h) => (lx, lz) => [x + lx * Math.cos(h) + lz * Math.sin(h), z - lx * Math.sin(h) + lz * Math.cos(h)];
  const bx = (r, h, w, hh, d, c, lx, y, lz) => { const [X_, Z_] = r(lx, lz); G.push(B(w, hh, d, c, X_, y, Z_, h)); };
  const cy = (r, ra, hh, c, lx, y, lz, seg = 8) => { const [X_, Z_] = r(lx, lz); G.push(C(ra, ra, hh, seg, c, X_, y, Z_)); };
  // l'emprise d'un meuble (cap multiple d'un quart de tour) : w de large, d de profond, autour de (lx, lz)
  const emprise = (r, h, w, d, lx = 0, lz = 0) => { const [X_, Z_] = r(lx, lz), q = Math.abs(Math.sin(h)) > 0.5; col(X_ - (q ? d : w) / 2, Z_ - (q ? w : d) / 2, X_ + (q ? d : w) / 2, Z_ + (q ? w : d) / 2); };
  const quad = (r, h, zone, lx, y, lz, w, hh, lumineux) => { const [X_, Z_] = r(lx, lz); affiche(zone, X_, y, Z_, h, w, hh, lumineux); };

  /* -- les trous des murs (portes, fenêtres) : pour poser au mur sans les couvrir. { o : l'axe que suit le mur, c : sa
     coordonnée fixe, a, b : le trou } */
  const TROUS = [];
  const trou = (o, c, p, l) => TROUS.push({ o, c, a: p - l / 2, b: p + l / 2 });
  for (const [m, p, l] of FENETRES) trou(m === 's' || m === 'n' ? 'x' : 'z', { s: z1, n: z0, e: x1, o: x0 }[m], p, l);
  for (const x of VITRINES) trou('x', z1, x, VITRINE.l);
  trou('z', x1, ENTREE.z, ENTREE.l); trou('z', x1, PORTE_ATELIER.z, PORTE_ATELIER.l); trou('x', z1, PORTE_ATLAS.x, PORTE_ATLAS.l);
  for (const [o, cc, , , ps] of CLOISONS) for (const [m, l] of ps) trou(o === 'u' ? 'z' : 'x', o === 'u' ? X(cc) : Z(cc), o === 'u' ? Z(m) : X(m), l);
  // où poser, sur le mur d'une pièce (cote : 's', 'n', 'e', 'o'), une chose de largeur w, au plus près de p : la position
  // le long du mur, ou null (ni sur une fenêtre, ni sur une porte, ni dans un coin)
  const surMur = (q, cote, p, w, marge = 0.12) => {
    const o = cote === 's' || cote === 'n' ? 'x' : 'z', c = { s: q.z1, n: q.z0, e: q.x1, o: q.x0 }[cote];
    const lo = o === 'x' ? q.x0 : q.z0, hi = o === 'x' ? q.x1 : q.z1, t = TROUS.filter(T => T.o === o && Math.abs(T.c - c) < 0.2);
    const ok = s => s - w / 2 > lo + marge && s + w / 2 < hi - marge && t.every(T => s + w / 2 + marge < T.a || s - w / 2 - marge > T.b);
    for (let k = 0; k < 600; k++) { const s = p + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.05; if (ok(s)) return s; }
    return null;
  };
  // la même, posée : fn(x, z, h) au pied du mur, h tourné vers la pièce
  const auMur = (q, cote, p, w, fn, marge) => {
    const s = surMur(q, cote, p, w, marge); if (s == null) return;
    const h = { s: NORD, n: SUD, e: OUEST, o: EST }[cote];
    if (cote === 's' || cote === 'n') fn(s, cote === 's' ? q.z1 : q.z0, h); else fn(cote === 'e' ? q.x1 : q.x0, s, h);
  };

  /* -- les sols : le grès du couloir et de l'entrée, la moquette en dalles des bureaux, le parquet des salles de réunion
     et des bureaux de la direction, le carrelage de la cuisine et des sanitaires ; le faux plafond */
  const sol = (q, c, y = 0.022) => G.push(B(q.x1 - q.x0, 0.02, q.z1 - q.z0, c, (q.x0 + q.x1) / 2, y - 0.01, (q.z0 + q.z1) / 2));
  sol(SOLU, GRES, 0.016);
  for (const [k, c] of [['atelier', '#56606b'], ['soleil', '#6a7f8f'], ['terre', '#5b6573'], ['venus', '#5b6573'], ['saturne', '#6b6f78'], ['jupiter', '#4c5563']]) sol(P[k], c);
  sol(piece([16.95, 18.9, 17.05, 20.1]), '#4c5563'); // (le pas de la porte de Jupiter, au fond)
  for (const [k, c] of [['atlas', PARQUET], ['mercure', PARQUET], ['neptune', '#b08d63'], ['uranus', NOYER]]) sol(P[k], c);
  for (const k of ['mars', 'sanit1', 'sanit2', 'sanit3', 'wc']) sol(P[k], k === 'mars' ? CARRO : CARRO2);
  G.push(B(x1 - x0, 0.03, z1 - z0, PLAFOND, (x0 + x1) / 2, HP + 0.015, (z0 + z1) / 2));

  /* -- la lumière, pièce par pièce (modeles.js : definirInterieur ; une pièce n'est éclairée que par ses lampes) : des
     dalles lumineuses de 60 cm dans la trame du faux plafond, une lampe du shader sous chacune ; les couloirs, le reste */
  const pieces = [], lampes = [];
  const dalleLED = (x, z) => {
    const X_ = (Math.floor(x / 0.6) + 0.5) * 0.6, Z_ = (Math.floor(z / 0.6) + 0.5) * 0.6;
    G.push(B(0.6, 0.014, 0.6, ALU, X_, HP - 0.007, Z_)); affiche('led', X_, HP - 0.015, Z_, 0, 0.55, 0.55, true, true);
    return [X_, LAMPE_Y, Z_];
  };
  const eclairer = (q, nx, nz) => {
    const L = [];
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) L.push(dalleLED(q.x0 + (i + 0.5) * (q.x1 - q.x0) / nx, q.z0 + (k + 0.5) * (q.z1 - q.z0) / nz));
    pieces.push({ x0: q.x0 - 0.04, x1: q.x1 + 0.04, z0: q.z0 - 0.04, z1: q.z1 + 0.04, lampes: L });
  };
  for (const [k, nx, nz] of [['atelier', 3, 3], ['soleil', 3, 3], ['atlas', 3, 3], ['hall', 2, 1], ['mars', 2, 3], ['terre', 2, 1], ['venus', 2, 1], ['mercure', 4, 2],
    ['neptune', 1, 2], ['uranus', 2, 2], ['saturne', 2, 3], ['jupiter', 2, 5], ['sanit1', 1, 1], ['sanit2', 1, 1], ['sanit3', 1, 1], ['moyens', 2, 1]]) eclairer(P[k], nx, nz);
  // les couloirs : le long de leur milieu
  const cE = (X(4.77) + X(6.7)) / 2, cO = (X(13.72) + X(15.62)) / 2, cH = (Z(6.2) + Z(8.15)) / 2, cB = (Z(19.7) + Z(21.5)) / 2;
  for (const [x, z] of [[X(8.5), cH], [X(11.6), cH], [cE, cH], [cE, Z(11)], [cE, Z(14.2)], [cE, Z(17.4)], [cE, cB], [X(9.5), cB], [X(12.5), cB], [cO, cB], [cO, Z(17.4)], [cO, Z(14)], [cO, Z(10.6)], [(X(15.62) + X(16.95)) / 2, Z(20.2)]]) lampes.push(dalleLED(x, z));

  /* -- les détails du plafond et des murs : détecteurs de fumée, cassettes de clim, grilles de ventilation, interrupteurs,
     prises, thermostats, blocs de secours, extincteurs, horloges */
  const detecteur = (x, z) => G.push(C(0.055, 0.06, 0.035, 10, '#f4f4f2', x, HP - 0.018, z), C(0.012, 0.012, 0.006, 6, '#c0392b', x + 0.03, HP - 0.037, z));
  const clim = (x, z) => {
    const X_ = (Math.floor(x / 0.6) + 0.5) * 0.6, Z_ = (Math.floor(z / 0.6) + 0.5) * 0.6;
    G.push(B(0.6, 0.03, 0.6, '#f0f0ee', X_, HP - 0.015, Z_), B(0.3, 0.006, 0.3, '#c9ccd0', X_, HP - 0.032, Z_));
    for (let i = 0; i < 4; i++) { const a = i * D; G.push(B(0.36, 0.008, 0.06, '#e2e3e1', X_ + Math.sin(a) * 0.22, HP - 0.034, Z_ + Math.cos(a) * 0.22, a)); }
  };
  const grille = (x, z) => { G.push(B(0.3, 0.012, 0.3, '#eeeeec', x, HP - 0.006, z)); for (let i = 0; i < 5; i++) G.push(B(0.24, 0.004, 0.02, '#9aa0a6', x, HP - 0.013, z - 0.1 + i * 0.05)); };
  // au mur (x, z au pied du mur, h vers la pièce)
  const interrupteur = (x, z, h, y = 1.1) => { const r = R(x, z, h); bx(r, h, 0.085, 0.085, 0.012, '#f6f6f4', 0, y, 0.006); bx(r, h, 0.035, 0.05, 0.008, '#e8e8e6', 0, y, 0.014); };
  const prise = (x, z, h, y = 0.3) => { const r = R(x, z, h); bx(r, h, 0.08, 0.08, 0.012, '#f6f6f4', 0, y, 0.006); for (const s of [-1, 1]) bx(r, h, 0.009, 0.009, 0.004, '#5a5d63', s * 0.012, y, 0.013); };
  // une goulotte le long du mur (PVC blanc, à 0,9 m), ses prises et ses prises réseau ; de a à b le long du mur
  const goulotte = (q, cote, a, b, y = 0.9) => {
    const ns = cote === 's' || cote === 'n', c = { s: q.z1, n: q.z0, e: q.x1, o: q.x0 }[cote], n = cote === 's' || cote === 'e' ? -1 : 1, h = { s: NORD, n: SUD, e: OUEST, o: EST }[cote];
    for (const [s0, s1] of ouvert(a, b, TROUS.filter(T => T.o === (ns ? 'x' : 'z') && Math.abs(T.c - c) < 0.2).map(T => [(T.a + T.b) / 2, T.b - T.a + 0.2]))) {
      if (s1 - s0 < 0.4) continue;
      G.push(ns ? B(s1 - s0, 0.09, 0.05, '#f6f6f4', (s0 + s1) / 2, y, c + n * 0.025) : B(0.05, 0.09, s1 - s0, '#f6f6f4', c + n * 0.025, y, (s0 + s1) / 2));
      for (let s_ = s0 + 0.35; s_ < s1 - 0.2; s_ += 1.2) for (const k of [0, 1, 2]) { const [px, pz] = ns ? [s_ + k * 0.085, c + n * 0.05] : [c + n * 0.05, s_ + k * 0.085]; G.push(B(0.075, 0.075, 0.008, k === 2 ? '#2e86de' : '#ececea', px, y, pz, h)); }
    }
  };
  const thermostat = (x, z, h) => { const r = R(x, z, h); bx(r, h, 0.12, 0.09, 0.025, '#f4f4f2', 0, 1.5, 0.013); bx(r, h, 0.06, 0.028, 0.004, '#34495e', 0, 1.51, 0.027); };
  const baes = (x, z, h, y = 2.32) => { const r = R(x, z, h); bx(r, h, 0.34, 0.13, 0.07, '#f4f4f2', 0, y, 0.035); quad(r, h, 'baes', 0, y, 0.0712, 0.29, 0.1, true); };
  const extincteur = (x, z, h) => {
    const r = R(x, z, h); cy(r, 0.08, 0.52, '#c0392b', 0, 0.48, 0.14, 10); cy(r, 0.03, 0.08, NOIR, 0, 0.78, 0.14, 6); bx(r, h, 0.04, 0.025, 0.12, NOIR, 0.05, 0.8, 0.1);
    bx(r, h, 0.05, 0.08, 0.08, '#5a5d63', 0, 0.62, 0.04); quad(r, h, 'extinct', 0, 1.55, 0.004, 0.18, 0.18);
  };
  // une horloge au mur : le boîtier (un cylindre couché contre le mur), le cadran ; ses aiguilles tournent (Solumatic)
  const horlogeMur = (x, z, h, y, k) => { const [X_, Z_] = R(x, z, h)(0, 0.02); G.push(C(k / 2 + 0.014, k / 2 + 0.014, 0.04, 20, '#2b2d31', X_, y, Z_, 'z', h)); const [X2, Z2] = R(x, z, h)(0, 0.042); affiche('horloge', X2, y, Z2, h, k, k); VIE.horloges.push({ x: X2, y, z: Z2, h, k }); };
  const cadre = (x, z, h, w, hh, zone, y = 1.55, fond = '#2b2d31') => { const r = R(x, z, h); bx(r, h, w + 0.04, hh + 0.04, 0.025, fond, 0, y, 0.0125); quad(r, h, zone, 0, y, 0.026, w, hh); };
  const tableau = (x, z, h, w, hh, zone, y = 1.45) => {
    const r = R(x, z, h); bx(r, h, w + 0.06, hh + 0.06, 0.03, '#c9ccd1', 0, y, 0.015); bx(r, h, w + 0.1, 0.03, 0.08, '#c9ccd1', 0, y - hh / 2 - 0.05, 0.05);
    for (let i = 0; i < 3; i++) bx(r, h, 0.11, 0.018, 0.018, ['#1f5fbf', '#c23b30', '#2b2d31'][i], -w / 3 + i * 0.13, y - hh / 2 - 0.025, 0.06);
    bx(r, h, 0.12, 0.04, 0.05, '#3b3f46', w / 3, y - hh / 2 - 0.015, 0.055);
    if (zone) quad(r, h, zone, 0, y, 0.031, w, hh); else bx(r, h, w, hh, 0.005, '#fbfbf8', 0, y, 0.032);
  };
  const tele = (x, z, h, w, hh, zone, y = 1.45) => { const r = R(x, z, h); bx(r, h, w + 0.03, hh + 0.03, 0.05, '#101215', 0, y, 0.035); quad(r, h, zone, 0, y, 0.0605, w, hh, true); bx(r, h, 0.05, 0.012, 0.012, '#3a3d43', w / 2 - 0.05, y - hh / 2 - 0.006, 0.062); };
  const plaque = (x, z, h, zone, y = 1.55) => { const r = R(x, z, h); bx(r, h, 0.19, 0.055, 0.006, '#b9bdc2', 0, y, 0.003); quad(r, h, zone, 0, y, 0.0065, 0.18, 0.045); };

  /* -- les murs extérieurs, côté intérieur : la peinture, percée des fenêtres et des portes ; les embrasures, les
     fenêtres (vitre, châssis, ouvrants, poignées ; derrière, le volet roulant à moitié baissé), l'appui, le store
     enrouleur, le radiateur et son robinet ; les portes */
  const PROF = 0.22; // (la profondeur de l'embrasure : la vitre est au milieu du mur)
  const rs = hasard(17);
  const facade = (m) => {
    const ns = m === 's' || m === 'n', c = { s: z1, n: z0, e: x1, o: x0 }[m], n = m === 's' || m === 'e' ? -1 : 1; // n : vers l'intérieur
    const a = ns ? x0 : z0, b = ns ? x1 : z1;
    // le long du mur, de s0 à s1, de y0 à y1, à p du nu du mur (p > 0 : dans l'épaisseur du mur), épais de ep
    const pan = (s0, s1, y0, y1, p, ep, coul, liste = G) => liste.push(ns ? B(s1 - s0, y1 - y0, ep, coul, (s0 + s1) / 2, (y0 + y1) / 2, c - n * p) : B(ep, y1 - y0, s1 - s0, coul, c - n * p, (y0 + y1) / 2, (s0 + s1) / 2));
    const ouv = [];
    for (const [mm, p, l] of FENETRES) if (mm === m) ouv.push({ p, l, y0: FEN.y0, y1: FEN.y1, f: true, rad: true });
    if (m === 's') { for (const x of VITRINES) ouv.push({ p: x, l: VITRINE.l, y0: VITRINE.y0, y1: VITRINE.y1, f: true }); ouv.push({ p: PORTE_ATLAS.x, l: PORTE_ATLAS.l, y0: 0, y1: PORTE_ATLAS.h, porte: 'atlas' }); }
    if (m === 'e') ouv.push({ p: ENTREE.z, l: ENTREE.l, y0: 0, y1: ENTREE.h, porte: 'entree' });
    // la peinture, autour des trous ; la plinthe
    const morceaux = ouvert(a, b, ouv.map(o => [o.p, o.l]));
    for (const [s0, s1] of morceaux) { pan(s0, s1, 0, HP, -0.01, 0.02, MUR); pan(s0, s1, 0, 0.08, -0.026, 0.012, PLINTHE); }
    for (const o of ouv) {
      const s0 = o.p - o.l / 2, s1 = o.p + o.l / 2, hy = o.y1 - o.y0;
      pan(s0, s1, o.y1, HP, -0.01, 0.02, MUR);
      if (o.y0 > 0) { pan(s0, s1, 0, o.y0, -0.01, 0.02, MUR); pan(s0 - 0.02, s1 + 0.02, 0, 0.08, -0.026, 0.012, PLINTHE); }
      // l'embrasure : les deux tableaux, le linteau
      const pr = o.porte === 'entree' ? 0.3 : PROF;
      for (const s of [s0 - 0.01, s1 + 0.01]) pan(s - 0.01, s + 0.01, o.y0, o.y1, pr / 2 - 0.01, pr, MUR2);
      pan(s0, s1, o.y1 - 0.01, o.y1 + 0.01, pr / 2 - 0.01, pr, MUR2);
      if (o.porte === 'entree') { // la porte vitrée est le battant du dehors (monde.js) ; son seuil
        pan(s0, s1, 0, 0.02, 0.14, 0.32, '#9aa0a6'); continue;
      }
      if (o.porte === 'atlas') {
        // la double porte vitrée d'Atlas (une sortie de secours) : les vitres, le cadre, les barres antipanique
        pan(s0, s1, 0.02, o.y1 - 0.02, PROF, 0.02, VITRE, V);
        pan(s0, s1, 0, 0.02, PROF / 2, PROF, '#9aa0a6'); pan(o.p - 0.035, o.p + 0.035, 0, o.y1, PROF - 0.02, 0.05, GRIS);
        for (const s of [s0 + 0.03, s1 - 0.03]) pan(s - 0.03, s + 0.03, 0, o.y1, PROF - 0.02, 0.05, GRIS);
        pan(s0, s1, o.y1 - 0.05, o.y1, PROF - 0.02, 0.05, GRIS); pan(s0, s1, 0, 0.12, PROF - 0.02, 0.05, GRIS);
        for (const d of [-1, 1]) { pan(o.p + d * o.l / 4 - o.l / 4 + 0.12, o.p + d * o.l / 4 + o.l / 4 - 0.12, 0.98, 1.04, PROF - 0.1, 0.05, '#c0392b'); }
        continue;
      }
      // la fenêtre : la vitre au fond de l'embrasure, le volet roulant du dehors à moitié baissé derrière
      pan(s0, s1, o.y0, o.y1, PROF + 0.01, 0.02, VITRE, V);
      const hv = hy * 0.48; pan(s0, s1, o.y1 - hv, o.y1, PROF + 0.04, 0.02, '#dfe1de'); for (let y = o.y1 - hv + 0.08; y < o.y1; y += 0.085) pan(s0, s1, y, y + 0.01, PROF + 0.025, 0.012, '#c7cac6');
      // le châssis (PVC blanc) : le dormant, les ouvrants, leurs poignées
      const CH = '#ecebe7', nO = o.l > 1.3 ? 2 : 1;
      pan(s0, s1, o.y0, o.y0 + 0.06, PROF - 0.02, 0.06, CH); pan(s0, s1, o.y1 - 0.06, o.y1, PROF - 0.02, 0.06, CH);
      pan(s0, s0 + 0.06, o.y0, o.y1, PROF - 0.02, 0.06, CH); pan(s1 - 0.06, s1, o.y0, o.y1, PROF - 0.02, 0.06, CH);
      if (nO === 2) pan(o.p - 0.045, o.p + 0.045, o.y0, o.y1, PROF - 0.02, 0.08, CH);
      for (const s of nO === 2 ? [o.p - 0.07, o.p + 0.07] : [s1 - 0.1]) pan(s - 0.012, s + 0.012, o.y0 + hy * 0.42, o.y0 + hy * 0.5, PROF - 0.075, 0.03, '#d6d7d4');
      // l'appui (une tablette de pierre claire), le store enrouleur (son coffre, la toile plus ou moins descendue)
      pan(s0 - 0.06, s1 + 0.06, o.y0 - 0.03, o.y0, PROF / 2 - 0.04, PROF + 0.08, '#e3ddd2');
      if (o.f) {
        const k = 0.12 + rs() * 0.42;
        pan(s0 + 0.02, s1 - 0.02, o.y1 - 0.09, o.y1 - 0.01, 0.06, 0.08, '#e9e9e6'); pan(s0 + 0.05, s1 - 0.05, o.y1 - 0.09 - hy * k, o.y1 - 0.09, 0.07, 0.008, STORE); pan(s0 + 0.05, s1 - 0.05, o.y1 - 0.11 - hy * k, o.y1 - 0.09 - hy * k, 0.07, 0.02, '#c9ccd0');
      }
      // le radiateur sous la fenêtre : le panneau, sa grille, ses côtés, le robinet thermostatique, les tuyaux
      if (o.rad) {
        const lr = Math.min(o.l * 0.9, 1.6), r0 = o.p - lr / 2, r1 = o.p + lr / 2;
        pan(r0, r1, 0.16, 0.68, -0.09, 0.07, '#f2f2ef'); pan(r0, r1, 0.68, 0.69, -0.09, 0.06, '#dcdcd8');
        for (let i = 0; i < 3; i++) pan(r0, r1, 0.3 + i * 0.13, 0.305 + i * 0.13, -0.127, 0.004, '#e2e2de');
        pan(r1 + 0.02, r1 + 0.07, 0.12, 0.6, -0.09, 0.05, '#f2f2ef'); pan(r1 + 0.03, r1 + 0.06, 0.6, 0.68, -0.09, 0.06, '#e8e8e4');
        pan(r0 + 0.05, r0 + 0.07, 0.022, 0.16, -0.06, 0.02, '#d6d6d2'); pan(r1 + 0.04, r1 + 0.06, 0.022, 0.12, -0.06, 0.02, '#d6d6d2');
      }
    }
  };
  for (const m of ['s', 'n', 'e', 'o']) facade(m);
  murs.push([x0 - 0.3, z0 - 0.3, x0, z1 + 0.3], [x1, z0 - 0.3, x1 + 0.3, z1 + 0.3], [x0 - 0.3, z0 - 0.3, x1 + 0.3, z0], [x0 - 0.3, z1, x1 + 0.3, z1 + 0.3]);
  // la double porte de l'atelier (fermée, une sortie de secours) : les vantaux de tôle, le cadre, les barres antipanique
  {
    const PT = PORTE_ATELIER, pz = PT.z;
    G.push(B(0.04, PT.h, PT.l, '#d6d8da', x1 - 0.03, PT.h / 2, pz), B(0.05, PT.h, 0.04, GRIS, x1 - 0.05, PT.h / 2, pz), B(0.06, 0.08, PT.l + 0.12, GRIS, x1 - 0.04, PT.h + 0.04, pz));
    for (const d of [-1, 1]) G.push(B(0.06, PT.h + 0.08, 0.06, GRIS, x1 - 0.04, PT.h / 2, pz + d * (PT.l / 2 + 0.03)), B(0.08, 0.05, PT.l / 2 - 0.2, '#c0392b', x1 - 0.1, 1.0, pz + d * PT.l / 4));
  }

  /* -- les cloisons et leurs portes : la peinture, les plinthes, l'huisserie et ses chambranles, l'imposte jusqu'au plafond,
     le battant (bois clair, poignées, plaque de propreté) ouvert ou fermé ; la plaque de la pièce côté couloir ;
     l'interrupteur et le bloc de secours côté pièce */
  for (const [o, cc, a, b, ps] of CLOISONS) {
    // (bornées aux murs extérieurs : le plan les fait parfois dépasser de quelques centimètres)
    const U = o === 'u', fixe = U ? X(cc) : Z(cc), S_ = U ? Z : X, s0 = Math.max(Math.min(S_(a), S_(b)), U ? z0 : x0), s1 = Math.min(Math.max(S_(a), S_(b)), U ? z1 : x1);
    // une boîte le long du mur, de sa à sb, épaisse de ep, décalée de n, de y0 à y1
    const le = (sa, sb, ep, n, y0, y1, c) => G.push(U ? B(ep, y1 - y0, sb - sa, c, fixe + n, (y0 + y1) / 2, (sa + sb) / 2) : B(sb - sa, y1 - y0, ep, c, (sa + sb) / 2, (y0 + y1) / 2, fixe + n));
    const rect = (sa, sb, ep = e) => (U ? [fixe - ep / 2, sa, fixe + ep / 2, sb] : [sa, fixe - ep / 2, sb, fixe + ep / 2]);
    const pt = (s, n) => (U ? [fixe + n, s] : [s, fixe + n]); // un point (s le long du mur, n de côté) dans le monde
    const face = n => (U ? (n > 0 ? EST : OUEST) : (n > 0 ? SUD : NORD)); // le cap d'une chose posée du côté n
    for (const [sa, sb] of ouvert(s0, s1, ps.filter(p => p[4]).map(([m, l]) => [S_(m), l]))) {
      if (sb - sa < 0.02) continue;
      le(sa, sb, e, 0, 0, HP, MUR); col(...rect(sa, sb)); murs.push(rect(sa, sb));
      for (const n of [-1, 1]) le(sa, sb, 0.012, n * (e / 2 + 0.006), 0, 0.08, PLINTHE);
    }
    for (const [m, l, ch, s, ang, pl] of ps) {
      const sm = S_(m), nS = -s; // nS : le côté (dans le monde) où s'ouvre le battant
      // l'huisserie : les montants, la traverse ; les chambranles des deux côtés
      for (const d of [-1, 1]) { const sj = sm + d * (l / 2 + 0.025); le(sj - 0.025, sj + 0.025, e + 0.03, 0, 0, HPO + 0.05, HUIS); for (const n of [-1, 1]) le(sj - 0.03 + d * 0.025, sj + 0.03 + d * 0.025, 0.012, n * (e / 2 + 0.021), 0, HPO + 0.08, HUIS); }
      le(sm - l / 2 - 0.05, sm + l / 2 + 0.05, e + 0.03, 0, HPO, HPO + 0.05, HUIS);
      for (const n of [-1, 1]) le(sm - l / 2 - 0.11, sm + l / 2 + 0.11, 0.012, n * (e / 2 + 0.021), HPO + 0.02, HPO + 0.08, HUIS);
      const loquet = sm + (ch || 1) * (l / 2 + 0.2); // (le côté de la poignée, hors du battant)
      if (pl) { const [px, pz] = pt(loquet, -nS * (e / 2 + 0.001)); plaque(px, pz, face(-nS), pl); }
      if (!ang) {
        // fermée : le battant des deux côtés, les poignées
        le(sm - l / 2 + 0.005, sm + l / 2 - 0.005, e + 0.035, 0, 0.01, HPO - 0.005, PORTE_B);
        const sp = sm + (ch || 1) * (l / 2 - 0.09);
        for (const n of [-1, 1]) { le(sp - 0.012, sp + 0.012, 0.03, n * (e / 2 + 0.03), 0.98, 1.06, INOX); le(sp - (ch || 1) * 0.12, sp, 0.022, n * (e / 2 + 0.05), 1.01, 1.035, INOX); }
        continue;
      }
      le(sm - l / 2, sm + l / 2, e, 0, HPO + 0.05, HP, MUR); portes.push(rect(sm - l / 2, sm + l / 2)); // l'imposte ; l'embrasure (camera.js : interieur)
      if (pl && pl !== 'p:sanitaires') {
        const [ix, iz] = pt(sm + (ch || 1) * (l / 2 + 0.16), nS * (e / 2 + 0.001)); interrupteur(ix, iz, face(nS));
        const [bx_, bz_] = pt(sm, nS * (e / 2 + 0.001)); baes(bx_, bz_, face(nS));
      }
      // le battant (ou les deux) : tourné de ang autour de sa charnière, du côté nS
      const battant = (sh, dir, w) => {
        const hn = nS * (e / 2 + 0.03), ca = Math.cos(ang), sa = Math.sin(ang);
        const [hx, hz] = pt(sh, hn), [tx, tz] = pt(sh + dir * w * ca, hn + nS * w * sa);
        const cx = (hx + tx) / 2, cz = (hz + tz) / 2, rot = Math.atan2(-(tz - hz), tx - hx), nx = Math.sin(rot), nz = Math.cos(rot);
        G.push(B(w - 0.03, HPO - 0.03, 0.042, PORTE_B, cx, (HPO - 0.03) / 2 + 0.008, cz, rot), B(w - 0.06, 0.18, 0.046, INOX, cx, 0.11, cz, rot));
        const ax = hx + (tx - hx) * 0.9, az = hz + (tz - hz) * 0.9;
        for (const d of [-1, 1]) G.push(B(0.025, 0.07, 0.012, INOX, ax + nx * d * 0.028, 1.02, az + nz * d * 0.028, rot), B(0.13, 0.022, 0.022, INOX, ax - (tx - hx) / w * 0.055 + nx * d * 0.05, 1.03, az - (tz - hz) / w * 0.055 + nz * d * 0.05, rot));
        G.push(B(0.25, 0.04, 0.05, '#c9ccd0', hx + (tx - hx) * 0.2 + nx * 0.045, HPO - 0.06, hz + (tz - hz) * 0.2 + nz * 0.045, rot)); // (le ferme-porte)
        tournees.push([cx, cz, w, 0.07, rot]);
      };
      if (ch === 0) { battant(sm - l / 2, 1, l / 2); battant(sm + l / 2, -1, l / 2); } else battant(sm - ch * l / 2, ch, l);
    }
  }

  /* -- le mobilier */
  // une chaise de bureau (cap h : vers où l'on regarde assis) : piètement étoile et roulettes, vérin, assise et dossier en
  // tissu, accoudoirs
  const chaise = (x, z, h, c = TISSU[3], o = {}) => {
    const r = R(x, z, h);
    for (let k = 0; k < 5; k++) { const a = h + k * 1.2566 + 0.3; G.push(B(0.035, 0.03, 0.29, NOIR, x + Math.sin(a) * 0.15, 0.075, z + Math.cos(a) * 0.15, a), B(0.04, 0.04, 0.04, '#3b3f46', x + Math.sin(a) * 0.29, 0.03, z + Math.cos(a) * 0.29, a)); }
    G.push(C(0.024, 0.024, 0.34, 6, '#9aa0a6', x, 0.27, z), C(0.045, 0.045, 0.08, 8, NOIR, x, 0.12, z));
    bx(r, h, 0.5, 0.07, 0.48, c, 0, 0.47, 0.03); bx(r, h, 0.46, 0.06, 0.44, NOIR, 0, 0.42, 0.03);
    bx(r, h, 0.46, 0.52, 0.06, c, 0, 0.86, -0.25); bx(r, h, 0.06, 0.3, 0.05, NOIR, 0, 0.6, -0.26);
    if (o.accoudoirs !== false) for (const s of [-1, 1]) { bx(r, h, 0.035, 0.2, 0.035, NOIR, s * 0.265, 0.6, 0.0); bx(r, h, 0.06, 0.025, 0.24, '#30333a', s * 0.265, 0.71, 0.02); }
    if (o.col !== false) col(x - 0.23, z - 0.23, x + 0.23, z + 0.23);
  };
  // une chaise de réunion ou de cuisine : quatre pieds de métal, l'assise et le dossier
  const chaiseS = (x, z, h, c = '#3a4a5c', o = {}) => {
    const r = R(x, z, h);
    bx(r, h, 0.45, 0.05, 0.43, c, 0, 0.46, 0); bx(r, h, 0.45, 0.36, 0.04, c, 0, 0.76, -0.21); bx(r, h, 0.4, 0.03, 0.03, '#9aa0a6', 0, 0.58, -0.2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(r, h, 0.025, 0.44, 0.025, '#9aa0a6', sx * 0.19, 0.22, sz * 0.18);
    if (o.col !== false) col(x - 0.22, z - 0.22, x + 0.22, z + 0.22);
  };
  const tabouret = (x, z, c = '#2b2d31') => { G.push(C(0.17, 0.17, 0.05, 12, c, x, 0.76, z), C(0.02, 0.025, 0.72, 6, '#9aa0a6', x, 0.37, z), C(0.2, 0.2, 0.02, 12, '#9aa0a6', x, 0.01, z), C(0.14, 0.14, 0.015, 12, '#9aa0a6', x, 0.3, z)); col(x - 0.17, z - 0.17, x + 0.17, z + 0.17); };
  const table = (x, z, w, d, c = PLAN, pied = PIED, haut = 0.74, o = {}) => {
    G.push(B(w, 0.035, d, c, x, haut - 0.0175, z), B(w - 0.004, 0.012, d - 0.004, '#3b3f46', x, haut - 0.04, z));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.push(B(0.05, haut - 0.05, 0.05, pied, x + sx * (w / 2 - 0.08), (haut - 0.05) / 2, z + sz * (d / 2 - 0.08)));
    if (o.col !== false) col(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  };
  const tableRonde = (x, z, ra, c = PLAN, haut = 0.74) => { G.push(C(ra, ra, 0.035, 20, c, x, haut - 0.0175, z), C(0.035, 0.035, haut - 0.04, 8, PIED, x, haut / 2, z), C(0.24, 0.26, 0.03, 14, PIED, x, 0.015, z)); col(x - ra * 0.75, z - ra * 0.75, x + ra * 0.75, z + ra * 0.75); };
  const mug = (x, z, y, c) => { G.push(C(0.04, 0.036, 0.095, 10, c, x, y + 0.048, z), C(0.033, 0.033, 0.004, 8, '#4a2f1f', x, y + 0.09, z), B(0.012, 0.05, 0.03, c, x + 0.045, y + 0.05, z)); };
  // une pièce couchée le long de +z depuis l'origine, levée de elev au-dessus de l'horizontale, tournée de a, posée en (x, y, z)
  const RX = new THREE.Matrix4(), RY = new THREE.Matrix4();
  const orienter = (g, elev, a, x, y, z) => { g.applyMatrix4(RX.makeRotationX(-elev)); g.applyMatrix4(RY.makeRotationY(a)); return g.translate(x, y, z); };
  const plante = (x, z, genre = 'ficus', k = 1, collision = true) => {
    const rp = hasard(Math.floor(x * 73 + z * 31) >>> 0), F = () => FEUILLES[Math.floor(rp() * FEUILLES.length)];
    const pr = genre === 'petite' ? 0.07 : 0.19 * k, ph = genre === 'petite' ? 0.09 : 0.4 * k;
    G.push(C(pr, pr * 0.78, ph, 12, genre === 'petite' ? '#d8cfc2' : POT, x, ph / 2, z), C(pr * 0.92, pr * 0.92, 0.01, 10, '#4a3a2c', x, ph - 0.015, z));
    if (genre === 'ficus') { G.push(C(0.02, 0.03, 1.0 * k, 6, '#6b5238', x, ph + 0.45 * k, z)); for (let i = 0; i < 7; i++) { const a = i * 2.4 + rp(), rr = 0.12 + rp() * 0.14; G.push(S(0.16 + rp() * 0.12, F(), x + Math.sin(a) * rr, ph + (0.75 + i * 0.12 + rp() * 0.1) * k, z + Math.cos(a) * rr, 1, 0.85, 1, 1)); } }
    else if (genre === 'sansevieria') { for (let i = 0; i < 10; i++) { const a = i * 0.7 + rp(), hh = (0.45 + rp() * 0.4) * k; G.push(orienter(B(0.06, 0.012, hh, i % 3 ? '#3f6a32' : '#5a7f3e', 0, 0, hh / 2), 1.25 + rp() * 0.25, a, x + Math.sin(a) * 0.04, ph - 0.02, z + Math.cos(a) * 0.04)); } }
    else if (genre === 'strelitzia') {
      // de grandes feuilles au bout de tiges qui s'écartent, chacune penchée à sa façon
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4 + rp(), L = (0.4 + rp() * 0.5) * k, el = 1.1 + rp() * 0.32, l = (0.3 + rp() * 0.16) * k, w = (0.15 + rp() * 0.07) * k;
        G.push(orienter(C(0.008, 0.011, L, 5, '#4a7034', 0, 0, L / 2, 'z'), el, a, x, ph - 0.02, z));
        G.push(orienter(S(1, F(), 0, 0, l / 2, w / 2, 0.012, l / 2), 0.15 + rp() * 0.6, a, x + Math.cos(el) * Math.sin(a) * L, ph + Math.sin(el) * L, z + Math.cos(el) * Math.cos(a) * L));
      }
    }
    else if (genre === 'kentia') {
      // le palmier d'appartement : des palmes qui montent puis retombent
      G.push(C(0.02, 0.025, 0.55 * k, 6, '#6b7a3a', x, ph + 0.27 * k, z));
      for (let i = 0; i < 10; i++) {
        const a = i * 0.7 + rp() * 0.3, y0 = ph + (0.42 + (i % 3) * 0.13) * k, L1 = (0.3 + rp() * 0.12) * k, L2 = (0.3 + rp() * 0.12) * k, e1 = 0.7 + rp() * 0.35, c = F();
        G.push(orienter(B(0.12 * k, 0.01, L1, c, 0, 0, L1 / 2), e1, a, x, y0, z));
        G.push(orienter(B(0.1 * k, 0.01, L2, c, 0, 0, L2 / 2), -0.2 - rp() * 0.4, a, x + Math.cos(e1) * Math.sin(a) * L1, y0 + Math.sin(e1) * L1, z + Math.cos(e1) * Math.cos(a) * L1));
      }
    }
    else if (genre === 'cactus') { G.push(C(0.07, 0.08, 0.5 * k, 8, '#4f7a3a', x, ph + 0.25 * k, z), C(0.035, 0.035, 0.2 * k, 6, '#4f7a3a', x + 0.09, ph + 0.32 * k, z), S(0.07, '#4f7a3a', x, ph + 0.5 * k, z, 1, 0.7, 1)); }
    else if (genre === 'petite') { for (let i = 0; i < 4; i++) G.push(S(0.035, F(), x + (rp() - 0.5) * 0.06, ph + 0.03, z + (rp() - 0.5) * 0.06, 1, 0.8, 1)); }
    else if (genre === 'pothos') { for (let i = 0; i < 12; i++) { const a = i * 1.3, dd = 0.08 + (i % 4) * 0.05; G.push(S(0.05, F(), x + Math.sin(a) * dd, ph - (i % 5) * 0.08 + 0.04, z + Math.cos(a) * dd, 1, 0.6, 1)); } }
    if (collision && genre !== 'petite' && genre !== 'pothos') col(x - pr - 0.03, z - pr - 0.03, x + pr + 0.03, z + pr + 0.03);
    if (k >= 1 && (genre === 'ficus' || genre === 'kentia' || genre === 'strelitzia')) VIE.plantes.push([x, z, 0.5 * k]); // (son feuillage, à hauteur de la caméra : elle s'arrête devant, camera.js)
  };
  // un portemanteau sur pied, ses manteaux et une écharpe
  const portemanteau = (x, z, n = 3) => {
    const rp = hasard(Math.floor(x * 13 + z * 7) >>> 0);
    G.push(C(0.02, 0.02, 1.75, 6, NOIR, x, 0.88, z), C(0.2, 0.22, 0.03, 12, NOIR, x, 0.015, z));
    for (let k = 0; k < 4; k++) G.push(B(0.16, 0.025, 0.025, NOIR, x + Math.sin(k * D) * 0.08, 1.7, z + Math.cos(k * D) * 0.08, k * D));
    for (let k = 0; k < n; k++) { const a = k * 2.2 + rp(), c = MANTEAUX[Math.floor(rp() * MANTEAUX.length)]; G.push(B(0.36, 0.85, 0.12, c, x + Math.sin(a) * 0.17, 1.2, z + Math.cos(a) * 0.17, a + D), B(0.26, 0.1, 0.14, c, x + Math.sin(a) * 0.12, 1.63, z + Math.cos(a) * 0.12, a + D)); }
    if (n > 1) G.push(B(0.12, 0.6, 0.03, ['#c0392b', '#e0b13a', '#2e86de'][Math.floor(rp() * 3)], x + 0.05, 1.3, z - 0.1, 0.4));
    col(x - 0.28, z - 0.28, x + 0.28, z + 0.28);
  };
  const poubelle = (x, z, c = '#3b3f46') => G.push(C(0.13, 0.11, 0.32, 10, c, x, 0.16, z), C(0.125, 0.125, 0.01, 10, '#2b2d31', x, 0.315, z));
  const sac = (x, z, h, c) => { const r = R(x, z, h); bx(r, h, 0.3, 0.36, 0.15, c, 0, 0.18, 0); bx(r, h, 0.2, 0.14, 0.04, c, 0, 0.2, 0.09); bx(r, h, 0.03, 0.22, 0.02, NOIR, -0.08, 0.38, -0.02); bx(r, h, 0.03, 0.22, 0.02, NOIR, 0.08, 0.38, -0.02); };
  // contre un mur : (x, z) au pied du mur, h vers la pièce ; le repère du meuble, profond de p, au milieu de sa profondeur
  const auPied = (x, z, h, p) => { const [cx, cz] = R(x, z, h)(0, p / 2 + 0.01); return R(cx, cz, h); };
  // une armoire à portes (cap h : sa façade) ; une étagère ouverte et ses classeurs ou ses livres
  const armoire = (x, z, h, w = 1.0, haut = 1.95, c = '#e9e7e1') => {
    const r = auPied(x, z, h, 0.45); bx(r, h, w, haut, 0.45, c, 0, haut / 2, 0); bx(r, h, 0.004, haut - 0.06, 0.005, '#c9c6bf', 0, haut / 2, 0.226);
    for (const s of [-1, 1]) bx(r, h, 0.015, 0.16, 0.025, '#9aa0a6', s * 0.04, haut * 0.52, 0.235);
    bx(r, h, w, 0.06, 0.4, '#3a3d43', 0, 0.03, 0.01); emprise(r, h, w, 0.45);
  };
  const etagere = (x, z, h, w = 1.0, haut = 1.8, n = 4, c = '#e9e7e1', livres = false) => {
    const r = auPied(x, z, h, 0.38), rp = hasard(Math.floor(x * 11 + z * 17) >>> 0);
    for (const s of [-1, 1]) bx(r, h, 0.025, haut, 0.38, c, s * (w / 2 - 0.0125), haut / 2, 0);
    bx(r, h, w, haut, 0.012, c, 0, haut / 2, -0.184);
    for (let k = 0; k <= n; k++) bx(r, h, w - 0.05, 0.022, 0.36, c, 0, 0.04 + k * (haut - 0.06) / n, 0);
    for (let k = 0; k < n; k++) for (let px = -w / 2 + 0.06; px < w / 2 - 0.08;) {
      const ep = livres ? 0.025 + rp() * 0.035 : 0.065, hh = livres ? 0.18 + rp() * 0.1 : 0.3;
      if (rp() < 0.12) { px += 0.12; continue; }
      bx(r, h, ep, hh, livres ? 0.2 + rp() * 0.06 : 0.28, livres ? ['#7a2233', '#1f3b4d', '#c9a55a', '#3f7d4a', '#e9e1cf', '#2b2d31', '#8e44ad'][Math.floor(rp() * 7)] : ['#c0392b', '#2e86de', '#e0b13a', '#3f7d4a', '#2b2d31', '#f4f4f2'][Math.floor(rp() * 6)], px + ep / 2, 0.06 + k * (haut - 0.06) / n + hh / 2, 0.02);
      px += ep + 0.005;
    }
    emprise(r, h, w, 0.38);
  };
  // les casiers du personnel (deux colonnes de portes, leurs serrures, leurs numéros)
  const casiers = (x, z, h, nx = 4, ny = 3) => {
    const r = auPied(x, z, h, 0.45), w = nx * 0.3, haut = ny * 0.6; bx(r, h, w, haut, 0.45, '#cfd3d6', 0, haut / 2, 0);
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { bx(r, h, 0.28, 0.58, 0.01, j % 2 ? '#3f6a8c' : '#4a789c', -w / 2 + 0.15 + i * 0.3, 0.3 + j * 0.6, 0.228); bx(r, h, 0.02, 0.05, 0.01, '#d9dcdf', -w / 2 + 0.26 + i * 0.3, 0.32 + j * 0.6, 0.236); for (let k = 0; k < 3; k++) bx(r, h, 0.16, 0.01, 0.004, '#2d4f6b', -w / 2 + 0.15 + i * 0.3, 0.48 + j * 0.6 + k * 0.025, 0.234); }
    emprise(r, h, w, 0.45);
  };
  // un canapé, un fauteuil (cap h : vers où l'on regarde assis), une table basse, un pouf
  const canape = (x, z, h, w = 2.0, c = TISSU[0]) => {
    const r = R(x, z, h); bx(r, h, w, 0.22, 0.85, c, 0, 0.25, 0); bx(r, h, w, 0.45, 0.2, c, 0, 0.6, -0.33); for (const s of [-1, 1]) bx(r, h, 0.16, 0.36, 0.85, c, s * (w / 2 - 0.08), 0.48, 0);
    for (let i = 0; i < 2; i++) bx(r, h, w / 2 - 0.2, 0.1, 0.62, c, (i - 0.5) * (w / 2 - 0.16), 0.41, 0.08);
    for (const s of [-1, 1]) for (const t of [-1, 1]) bx(r, h, 0.04, 0.14, 0.04, NOIR, s * (w / 2 - 0.08), 0.07, t * 0.36);
    emprise(r, h, w, 0.85);
  };
  const fauteuil = (x, z, h, c = TISSU[2]) => { const r = R(x, z, h); bx(r, h, 0.7, 0.2, 0.7, c, 0, 0.3, 0); bx(r, h, 0.7, 0.42, 0.14, c, 0, 0.6, -0.28); for (const s of [-1, 1]) bx(r, h, 0.12, 0.3, 0.7, c, s * 0.29, 0.45, 0); bx(r, h, 0.5, 0.08, 0.5, c, 0, 0.44, 0.04); for (const s of [-1, 1]) for (const t of [-1, 1]) bx(r, h, 0.03, 0.2, 0.03, '#6b4a30', s * 0.3, 0.1, t * 0.3); emprise(r, h, 0.7, 0.7); };
  const tableBasse = (x, z, w, d, c = CHENE) => { G.push(B(w, 0.035, d, c, x, 0.4, z)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.push(C(0.02, 0.02, 0.38, 6, NOIR, x + sx * (w / 2 - 0.05), 0.19, z + sz * (d / 2 - 0.05))); col(x - w / 2, z - d / 2, x + w / 2, z + d / 2); };
  const lampadaire = (x, z) => { G.push(C(0.16, 0.18, 0.03, 12, NOIR, x, 0.015, z), C(0.012, 0.012, 1.5, 6, NOIR, x, 0.76, z), C(0.17, 0.22, 0.24, 12, '#efe6d0', x, 1.55, z)); col(x - 0.18, z - 0.18, x + 0.18, z + 0.18); };
  // l'oriflamme au logo derrière une formatrice (le fond que voit la caméra) : le pied, le mât, la toile
  const kakemono = (x, z, h) => { const r = R(x, z, h); bx(r, h, 0.85, 0.08, 0.22, '#c9ccd0', 0, 0.04, 0); bx(r, h, 0.84, 2.0, 0.01, '#f4f4f2', 0, 1.09, 0); quad(r, h, 'kakemono', 0, 1.09, 0.006, 0.8, 2.0); bx(r, h, 0.86, 0.025, 0.025, '#9aa0a6', 0, 2.1, 0); emprise(r, h, 0.85, 0.22); };
  // des panneaux acoustiques au mur (tissu tendu) : une mosaïque de carrés de trois couleurs
  const acoustique = (x, z, h, nx, ny, y0 = 1.35, cote = 0.55) => { const r = R(x, z, h); for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) if ((i * 7 + j * 3) % 5 !== 4) bx(r, h, cote - 0.02, cote - 0.02, 0.045, TISSU[[0, 3, 5, 0, 2, 3][(i + j * 2) % 6]], (i - (nx - 1) / 2) * cote, y0 + j * cote, 0.023); };
  // un poste de travail (cap h : la personne assise regarde vers h) : le plateau, son piètement, la goulotte, le voile ;
  // les écrans (des cases de la texture), le clavier, la souris ; ce qu'il y a dessus (chevalet au nom, mug, lampe,
  // casque, téléphone, papiers, plante, photo, portable) ; dessous (l'unité centrale, la corbeille, le sac) ; la chaise.
  // qui : quelqu'un de l'équipe y est assis (textes.js : EQUIPE)
  const poste = (x, z, h, o = {}) => {
    const r = R(x, z, h), w = o.w || 1.4, d = 0.75, av = 0.55, H = 0.74, rp = hasard(Math.floor(x * 97 + z * 41) >>> 0);
    bx(r, h, w, 0.03, d, o.plan || PLAN, 0, H - 0.015, av); bx(r, h, w - 0.01, 0.006, d - 0.01, '#bdb6a8', 0, H - 0.033, av);
    for (const s of [-1, 1]) { bx(r, h, 0.06, H - 0.04, 0.06, PIED, s * (w / 2 - 0.09), (H - 0.04) / 2, av); bx(r, h, 0.07, 0.035, d - 0.1, PIED, s * (w / 2 - 0.09), 0.0175, av); bx(r, h, 0.05, 0.04, d - 0.12, PIED, s * (w / 2 - 0.09), H - 0.055, av); }
    bx(r, h, w - 0.22, 0.05, 0.05, PIED, 0, H - 0.06, av + d / 2 - 0.15); bx(r, h, w - 0.34, 0.07, 0.11, '#2f3237', 0, H - 0.1, av + d / 2 - 0.12); // la poutre, la goulotte
    if (o.ilot) bx(r, h, w, 0.5, 0.035, o.panneau || TISSU[0], 0, H + 0.25, av + d / 2);
    if (o.voile !== false) bx(r, h, w - 0.2, 0.34, 0.015, '#bfc3c7', 0, 0.48, av + d / 2 - 0.05);
    // les écrans, un peu tournés vers qui est assis ; la webcam
    const zones = o.zones || ['bureau', 'bureau'], n = zones.length, ec = o.grand ? 1.18 : 1;
    zones.forEach((zone, i) => {
      const lx = (i - (n - 1) / 2) * 0.6 * ec, rot = -(i - (n - 1) / 2) * 0.3, [ex, ez] = r(lx, av + 0.2), hr = h + rot, rr = R(ex, ez, hr);
      bx(rr, hr, 0.6 * ec, 0.36 * ec, 0.022, ECRAN, 0, 1.1, 0); quad(rr, hr + Math.PI, zone, 0, 1.1, -0.0115, 0.565 * ec, 0.318 * ec, true);
      bx(rr, hr, 0.05, 0.22, 0.03, '#2b2d31', 0, 0.86, 0.03); bx(rr, hr, 0.22, 0.012, 0.16, '#2b2d31', 0, H + 0.006, 0.03); bx(rr, hr, 0.12, 0.1, 0.03, '#2b2d31', 0, 1.06, 0.028);
      if (o.webcam && i === (n - 1) >> 1) { bx(rr, hr, 0.1, 0.035, 0.04, NOIR, 0, 1.1 + 0.18 * ec + 0.02, 0); bx(rr, hr, 0.02, 0.02, 0.006, '#4a90d9', 0, 1.1 + 0.18 * ec + 0.02, -0.022); }
      if (o.postit && i === 0) for (let k = 0; k < 2; k++) bx(rr, hr, 0.06, 0.06, 0.003, ['#ffe36e', '#ffb0b0', '#9fe0a8'][k], -0.27 * ec + k * 0.07, 1.1 + 0.15 * ec, -0.013);
    });
    bx(r, h, 0.45, 0.022, 0.15, '#2b2d31', 0, H + 0.011, av - 0.17); bx(r, h, 0.42, 0.006, 0.12, '#4a4e55', 0, H + 0.024, av - 0.17);
    bx(r, h, 0.24, 0.003, 0.2, '#30343a', -0.37, H + 0.0015, av - 0.15); bx(r, h, 0.06, 0.022, 0.1, '#3b3f46', -0.37, H + 0.011, av - 0.15); // (la souris, à droite)
    if (o.nom) { const lx = -w / 2 + 0.17, [ex, ez] = r(lx, av - 0.24), hn = h + Math.PI + 0.5; G.push(B(0.21, 0.06, 0.03, '#f4f4f2', ex, H + 0.03, ez, hn)); const [qx, qz] = R(ex, ez, hn)(0, 0.0155); affiche('nom:' + o.nom, qx, H + 0.03, qz, hn, 0.2, 0.042); }
    if (o.mug) mug(...r(-w / 2 + 0.38, av - 0.05), H, o.mug);
    if (o.lampe) { const [lx, lz] = r(w / 2 - 0.14, av + 0.24); G.push(C(0.07, 0.07, 0.02, 10, '#2b2d31', lx, H + 0.01, lz), C(0.01, 0.01, 0.38, 5, '#2b2d31', lx, H + 0.2, lz)); bx(r, h, 0.02, 0.02, 0.26, '#2b2d31', w / 2 - 0.14, H + 0.4, av + 0.12); const [hx, hz] = r(w / 2 - 0.14, av - 0.01); G.push(C(0.05, 0.07, 0.08, 10, o.lampe, hx, H + 0.36, hz)); }
    if (o.casque) { const [cx, cz] = r(-w / 2 + 0.16, av + 0.18); G.push(C(0.05, 0.06, 0.012, 8, NOIR, cx, H + 0.006, cz), C(0.008, 0.008, 0.26, 5, NOIR, cx, H + 0.13, cz)); bx(r, h, 0.04, 0.14, 0.16, NOIR, -w / 2 + 0.16, H + 0.27, av + 0.18); for (const s of [-1, 1]) bx(r, h, 0.05, 0.07, 0.07, '#3b3f46', -w / 2 + 0.16, H + 0.2, av + 0.18 + s * 0.08); }
    if (o.tel) { bx(r, h, 0.19, 0.05, 0.21, '#2b2d31', -w / 2 + 0.3, H + 0.025, av + 0.05); bx(r, h, 0.05, 0.045, 0.21, '#3b3f46', -w / 2 + 0.23, H + 0.07, av + 0.05); bx(r, h, 0.1, 0.002, 0.06, '#8fb4cc', -w / 2 + 0.33, H + 0.051, av + 0.1); }
    if (o.papiers) { bx(r, h, 0.21, 0.025, 0.297, '#f6f4ee', w / 2 - 0.25, H + 0.0125, av - 0.1, 0); bx(r, h, 0.18, 0.015, 0.25, ['#c0392b', '#2e86de', '#2b2d31'][Math.floor(rp() * 3)], w / 2 - 0.27, H + 0.033, av + 0.18); }
    if (o.plante) plante(...r(w / 2 - 0.12, av + 0.28), 'petite', 1, false); // (sur le bureau : hauteur relative à 0, posée à H)
    if (o.portable) { const [px, pz] = r(-w / 2 + 0.33, av - 0.08), hp = h + 0.25, rr = R(px, pz, hp); bx(rr, hp, 0.33, 0.016, 0.23, '#c9ccd0', 0, H + 0.008, 0); bx(rr, hp, 0.33, 0.22, 0.012, '#c9ccd0', 0, H + 0.12, 0.12); quad(rr, hp + Math.PI, o.portable, 0, H + 0.125, 0.113, 0.3, 0.19, true); }
    if (o.photo) bx(r, h, 0.12, 0.09, 0.015, '#2b2d31', w / 2 - 0.1, H + 0.045, av + 0.05);
    if (o.tour !== false) { bx(r, h, 0.2, 0.42, 0.44, '#1f2125', w / 2 - 0.2, 0.21, av + 0.08); bx(r, h, 0.006, 0.02, 0.02, '#3ddc84', w / 2 - 0.2 - 0.1, 0.36, av - 0.14); }
    poubelle(...r(-w / 2 + 0.22, av + 0.2), '#4a4e55');
    if (o.sac) sac(...r(w / 2 + 0.22, -0.05), h + 0.3, o.sac);
    bx(r, h, 0.014, H - 0.1, 0.014, NOIR, w / 2 - 0.36, (H - 0.1) / 2, av + d / 2 - 0.1); // (un câble jusqu'au plancher)
    emprise(r, h, w, d, 0, av);
    if (o.chaise !== false) chaise(x, z, h, o.chaiseC || TISSU[3]);
    if (o.qui) {
      gens.push({ id: o.qui, x, z, h, assis: true, clavier: o.clavier !== false });
      // où se lever (derrière la chaise, ou à côté), où venir le voir (à côté du bureau, du côté le plus libre)
      VIE.postes[o.qui] = { x, z, h, lever: [r(0, -0.75), r(0.7, -0.15), r(-0.7, -0.15)], visite: [[...r(w / 2 + 0.4, 0.15), h - D], [...r(-w / 2 - 0.4, 0.15), h + D], [...r(0.35, -0.75), h]] };
    }
  };
  // une place assise sur une chaise de réunion ou de cuisine (où l'on se lève : derrière elle)
  const place = (liste, x, z, h, c, regard) => { chaiseS(x, z, h, c); const r = R(x, z, h); liste.push({ x, z, h, regard, lever: [r(0, -0.7), r(0.6, -0.2), r(-0.6, -0.2)] }); };

  // ---- l'entrée : le logo au mur, la console et ses dépliants, le banc, le portemanteau, le porte-parapluies, la plante,
  // l'écran d'accueil, le plan d'évacuation (« Vous êtes ici »), le paillasson, l'extincteur
  {
    const q = P.hall, cz = (q.z0 + q.z1) / 2;
    auMur(q, 's', (q.x0 + q.x1) / 2 + 0.4, 2.1, (x, z, h) => {
      const r = R(x, z, h); bx(r, h, 2.1, 0.55, 0.03, '#ffffff', 0, 1.78, 0.015); quad(r, h, 'logo', 0, 1.78, 0.031, 2.0, 0.47); bx(r, h, 2.1, 0.03, 0.04, ORANGE, 0, 1.49, 0.02);
      bx(r, h, 1.4, 0.035, 0.4, CHENE, 0, 0.82, 0.22); for (const s of [-1, 1]) bx(r, h, 0.04, 0.8, 0.36, '#2b2d31', s * 0.62, 0.4, 0.22); emprise(r, h, 1.4, 0.4, 0, 0.22);
      for (let i = 0; i < 4; i++) bx(r, h, 0.1, 0.008, 0.2, ['#ef6c26', '#ffffff', '#2b2d31', '#8e2c48'][i], -0.45 + i * 0.13, 0.842 + i * 0.004, 0.2);
      const [cx, cz] = r(0.45, 0.22); G.push(C(0.12, 0.08, 0.07, 12, '#d8d2c6', cx, 0.87, cz));
    });
    auMur(q, 'n', (q.x0 + q.x1) / 2, 2.0, (x, z, h) => { const r = R(x, z, h); bx(r, h, 1.8, 0.07, 0.42, CHENE, 0, 0.45, 0.25); bx(r, h, 1.8, 0.4, 0.06, TISSU[0], 0, 0.75, 0.05); for (const s of [-1, 1]) bx(r, h, 0.05, 0.42, 0.4, NOIR, s * 0.82, 0.21, 0.25); emprise(r, h, 1.8, 0.46, 0, 0.24); });
    auMur(q, 'n', q.x1 - 1.35, 0.62, (x, z, h) => cadre(x, z, h, 0.42, 0.57, 'plan', 1.5, '#f4f4f2'));
    portemanteau(q.x0 + 1.0, q.z0 + 0.4, 3);
    G.push(C(0.12, 0.12, 0.5, 10, '#3b3f46', q.x1 - 0.3, 0.25, ENTREE.z - ENTREE.l / 2 - 0.35), C(0.01, 0.01, 0.75, 4, '#2b2d31', q.x1 - 0.28, 0.45, ENTREE.z - ENTREE.l / 2 - 0.33)); col(q.x1 - 0.45, ENTREE.z - ENTREE.l / 2 - 0.5, q.x1, ENTREE.z - ENTREE.l / 2 - 0.2);
    plante(q.x1 - 0.4, q.z0 + 0.4, 'kentia', 1.25);
    { const r = R(X(4.77) + e / 2, Z(8.45), EST); bx(r, EST, 1.0, 0.6, 0.04, '#101215', 0, 1.6, 0.02); quad(r, EST, 'bienvenue', 0, 1.6, 0.041, 0.95, 0.535, true); }
    G.push(B(1.3, 0.012, 1.0, '#3a3a3a', q.x1 - 0.75, 0.03, ENTREE.z), B(1.26, 0.004, 0.96, '#4a4a48', q.x1 - 0.75, 0.038, ENTREE.z));
    extincteur(q.x1, ENTREE.z + ENTREE.l / 2 + 0.3, OUEST);
    interrupteur(q.x1, ENTREE.z - ENTREE.l / 2 - 0.16, OUEST); baes(q.x1, ENTREE.z, OUEST, ENTREE.h + 0.22); thermostat(X(4.77) + e / 2, Z(9.0), EST);
    detecteur((q.x0 + q.x1) / 2, cz);
    VIE.entree = { x: q.x1 - 1.0, z: ENTREE.z, h: OUEST };
  }

  // ---- la maintenance, un plateau téléphonique : un îlot de six postes (deux écrans : la prise en main à distance, les
  // tickets ; casque-micro ; cloisonnettes acoustiques), le grand écran de la file d'appels, le tableau blanc, les casiers,
  // le portemanteau, une table haute pour les points rapides, des plantes ; au-dessus de la double porte de Soleil, le
  // voyant « En formation »
  {
    const q = P.atelier, ci = q.x0 + (q.x1 - q.x0) * 0.53, zi = q.z1 - 3.55;
    const qui = ['clement', 'cindy', 'ophelie', 'hugo', 'lorette', 'raphael'], mugs = ['#ef6c26', null, '#f4f4f2', '#2e86de', null, '#3f7d4a'];
    qui.forEach((id, i) => {
      const lx = ((i % 3) - 1) * 1.4, rg = i < 3 ? 1 : -1;
      poste(ci + lx, zi + rg * 0.945, rg > 0 ? NORD : SUD, { qui: id, nom: id, zones: ['priseEnMain', 'tickets'], ilot: false, voile: true, mug: mugs[i], postit: i % 2 === 0, plante: i === 4, lampe: null, sac: i % 3 === 1 ? MANTEAUX[i] : null, chaiseC: TISSU[3] });
    });
    // la cloison acoustique du milieu, les cloisonnettes entre les postes
    G.push(B(4.24, 0.56, 0.05, TISSU[5], ci, 0.74 + 0.28, zi), B(4.24, 0.02, 0.06, ALU, ci, 1.31, zi));
    for (const lx of [-2.1, -0.7, 0.7, 2.1]) for (const rg of [-1, 1]) G.push(B(0.03, 0.42, 0.72, TISSU[lx === -0.7 || lx === 0.7 ? 0 : 5], ci + lx, 0.95, zi + rg * 0.4));
    auMur(q, 'n', ci + 0.5, 2.0, (x, z, h) => { tele(x, z, h, 1.78, 1.0, 'appels', 1.78); });
    auMur(q, 'e', q.z1 - 2.7, 1.8, (x, z, h) => tableau(x, z, h, 1.6, 0.98, 'tb:support'));
    auMur(q, 'n', q.x0 + 2.1, 1.25, (x, z, h) => casiers(x, z, h, 4, 3));
    portemanteau(q.x0 + 0.5, q.z1 - 0.55, 4);
    tableRonde(q.x0 + 1.45, q.z1 - 1.95, 0.36, CHENE, 1.05); tabouret(q.x0 + 0.95, q.z1 - 1.75); tabouret(q.x0 + 1.95, q.z1 - 2.25);
    plante(q.x1 - 0.5, q.z1 - 0.5, 'ficus', 1.25); plante(q.x0 + 2.95, q.z0 + 0.35, 'sansevieria');
    auMur(q, 'n', q.x1 - 0.9, 0.45, (x, z, h) => horlogeMur(x, z, h, 2.3, 0.34));
    auMur(q, 'e', q.z0 + 1.6, 0.4, (x, z, h) => cadre(x, z, h, 0.3, 0.42, 'calendrier', 1.6, '#f4f4f2'));
    extincteur(q.x0, q.z0 + 0.65, EST); thermostat(q.x0, q.z1 - 1.4, EST);
    goulotte(q, 'n', q.x0 + 3.0, q.x1 - 0.3); goulotte(q, 's', q.x0 + 0.9, q.x1 - 0.9, 0.95);
    clim(ci - 1.2, zi - 0.3); clim(ci + 1.8, q.z1 - 1.4); detecteur(ci, q.z0 + 1.2); detecteur(q.x0 + 1.5, q.z1 - 1.5);
    // le voyant « En formation » au-dessus de la double porte, côté plateau du support
    { const pz = Z(3.62), xp = X(6.5) + e / 2; G.push(B(0.06, 0.12, 0.38, '#2b2d31', xp + 0.03, 2.32, pz)); affiche('enFormation', xp + 0.061, 2.32, pz, EST, 0.34, 0.096, true); }
    VIE.cibles.atelier = [ci, q.z0 + 1.1];
  }

  // ---- Soleil, le plateau de la formation à distance : deux postes de formatrice (trois écrans : Vitisoft, la visio avec
  // un vigneron, la messagerie ; la webcam, un anneau lumineux sur pied, le casque-micro), derrière chacune l'oriflamme au
  // logo pour la caméra, des panneaux acoustiques au mur, une petite table, une bibliothèque, le tableau du parcours
  {
    const q = P.soleil;
    const anneau = (x, z, h) => { const r = R(x, z, h); G.push(C(0.12, 0.14, 0.02, 10, NOIR, x, 0.01, z), C(0.012, 0.012, 1.4, 5, NOIR, x, 0.71, z)); const [ax, az] = r(0, 0); G.push(C(0.17, 0.17, 0.025, 20, '#f6f6f4', ax, 1.45, az, 'z', h), C(0.12, 0.12, 0.03, 16, '#2b2d31', ax, 1.45, az, 'z', h), C(0.02, 0.02, 0.05, 6, NOIR, ax, 1.45, az, 'z', h)); };
    // Emma, contre le mur du couloir, regarde au nord ; Emilie, contre le mur d'Atlas, regarde à l'ouest
    const A_ = [q.x0 + 6.0, q.z0 + 0.975], B_ = [q.x0 + 0.975, q.z1 - 3.3];
    poste(A_[0], A_[1], NORD, { qui: 'emma', nom: 'emma', w: 1.8, zones: ['logiciel', 'visio', 'mail'], webcam: true, mug: '#f4f4f2', papiers: true, plante: true });
    anneau(...R(A_[0], A_[1], NORD)(1.05, 0.62), NORD + Math.PI - 0.5);
    kakemono(A_[0], A_[1] + 1.35, NORD);
    acoustique(A_[0], q.z0, SUD, 5, 2, 1.62, 0.56);
    poste(B_[0], B_[1], OUEST, { qui: 'emilie', nom: 'emilie', w: 1.8, zones: ['logiciel', 'visio', 'mail'], webcam: true, mug: ORANGE, postit: true });
    anneau(...R(B_[0], B_[1], OUEST)(-1.05, 0.62), OUEST + Math.PI + 0.5);
    kakemono(B_[0] + 1.35, B_[1], OUEST);
    acoustique(q.x0, B_[1], EST, 5, 2, 1.62, 0.56);
    tableRonde(q.x0 + 3.7, q.z1 - 2.0, 0.45, '#f4f3ef'); chaiseS(q.x0 + 3.1, q.z1 - 2.0, EST, TISSU[2]); chaiseS(q.x0 + 4.3, q.z1 - 2.0, OUEST, TISSU[2]);
    auMur(q, 'e', q.z1 - 1.5, 1.2, (x, z, h) => etagere(x, z, h, 1.1, 1.7, 4, '#e9e7e1', true));
    auMur(q, 'o', q.z0 + 1.7, 1.6, (x, z, h) => tableau(x, z, h, 1.4, 0.88, 'tb:formation'));
    plante(q.x0 + 0.55, q.z1 - 0.55, 'strelitzia', 1.15); plante(q.x1 - 0.5, q.z0 + 0.5, 'kentia', 1.2); plante(q.x0 + 2.4, q.z0 + 0.4, 'sansevieria');
    portemanteau(q.x1 - 0.45, q.z1 - 0.45, 2);
    auMur(q, 'n', q.x0 + 2.3, 0.45, (x, z, h) => horlogeMur(x, z, h, 2.35, 0.32));
    auMur(q, 'n', q.x1 - 1.2, 0.5, (x, z, h) => cadre(x, z, h, 0.36, 0.5, 'chateau'));
    thermostat(q.x1, q.z1 - 2.6, OUEST); clim((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2); detecteur(q.x0 + 2.5, q.z0 + 2.5); detecteur(q.x1 - 2.5, q.z1 - 2.5);
    VIE.cibles.soleil = [q.x0 + 4.4, q.z0 + 2.6];
  }

  // ---- Atlas, la grande salle : la belle télé au mur est et sa console, les tables en U tournées vers elle, le baby-foot,
  // le canapé près des fenêtres, le tableau blanc, des plantes, l'horloge au-dessus de la sortie de secours
  const babyfoot = {};
  {
    const q = P.atlas, zTV = (q.z1 + Z(6.2)) / 2 - 0.4;
    tele(q.x1, zTV, OUEST, 2.1, 1.18, 'tele', 1.55);
    { const r = R(q.x1, zTV, OUEST); bx(r, OUEST, 1.9, 0.55, 0.45, '#2b2d31', 0, 0.3, 0.26); bx(r, OUEST, 1.92, 0.03, 0.47, CHENE, 0, 0.59, 0.26); bx(r, OUEST, 0.5, 0.08, 0.1, NOIR, 0.4, 0.64, 0.3); G.push(C(0.1, 0.1, 0.03, 12, '#3b3f46', ...((p) => [p[0], 0.62, p[1]])(r(-0.5, 0.3)))); emprise(r, OUEST, 1.9, 0.45, 0, 0.26); }
    const BOIS_U = CHENE, xb = q.x0 + 2.1, zs = zTV + 1.8, zn = zTV - 1.8, xa1 = q.x1 - 3.3;
    table(xb, zTV, 0.75, zs - zn + 0.75, BOIS_U, '#2b2d31'); table((xb + 0.375 + xa1) / 2, zs, xa1 - xb - 0.375, 0.75, BOIS_U, '#2b2d31'); table((xb + 0.375 + xa1) / 2, zn, xa1 - xb - 0.375, 0.75, BOIS_U, '#2b2d31');
    const U_C = TISSU[2];
    for (let i = 0; i < 4; i++) { const x = xb + 0.9 + i * (xa1 - xb - 1.2) / 3; chaiseS(x, zs + 0.72, NORD, U_C); chaiseS(x, zn - 0.72, SUD, U_C); }
    for (const dz of [-1, 0, 1]) chaiseS(xb - 0.72, zTV + dz, EST, U_C);
    for (let i = 0; i < 3; i++) { mug(xb + 1.6 + i * 1.1, zs - 0.1, 0.74, ['#f4f4f2', ORANGE, '#2e86de'][i]); G.push(C(0.035, 0.035, 0.24, 8, '#cfe0ea', xb + 2.0 + i * 1.0, 0.86, zn + 0.1)); }
    // le baby-foot : la caisse, le terrain vert, ses lignes, les buts, les huit barres et leurs joueurs (rouges, bleus)
    const bxf = q.x1 - 3.5, bzf = q.z0 + 1.2;
    Object.assign(babyfoot, { x: bxf, z: bzf, cotes: [{ x: bxf - 0.78, z: bzf, h: EST, cote: -1 }, { x: bxf + 0.78, z: bzf, h: OUEST, cote: 1 }] });
    G.push(B(0.76, 0.3, 1.2, '#4a3324', bxf, 0.6, bzf), B(0.68, 0.01, 1.12, '#2f8a3a', bxf, 0.755, bzf), B(0.68, 0.012, 0.012, '#e8e8e8', bxf, 0.762, bzf));
    for (const s of [-1, 1]) G.push(B(0.05, 0.2, 1.2, '#4a3324', bxf + s * 0.355, 0.85, bzf), B(0.76, 0.2, 0.05, '#4a3324', bxf, 0.85, bzf + s * 0.585), B(0.2, 0.08, 0.02, '#1d1d1d', bxf, 0.8, bzf + s * 0.558), B(0.08, 0.45, 0.08, '#3a2a1e', bxf - 0.3, 0.22, bzf + s * 0.5), B(0.08, 0.45, 0.08, '#3a2a1e', bxf + 0.3, 0.22, bzf + s * 0.5));
    [-0.48, -0.34, -0.2, -0.07, 0.07, 0.2, 0.34, 0.48].forEach((dz, i) => {
      G.push(C(0.008, 0.008, 1.3, 6, '#c9ccd1', bxf, 0.85, bzf + dz, 'x'));
      const n = [1, 2, 5, 3, 3, 5, 2, 1][i], rouge = [0, 1, 3, 5].includes(i), poignee = rouge ? 1 : -1;
      G.push(C(0.018, 0.018, 0.1, 6, '#1d1d1d', bxf + poignee * 0.68, 0.85, bzf + dz, 'x'));
      for (let k = 0; k < n; k++) { const px = bxf + (k - (n - 1) / 2) * 0.58 / n; G.push(B(0.03, 0.08, 0.02, rouge ? '#c0392b' : '#2e5fa8', px, 0.81, bzf + dz), S(0.016, '#f1c27d', px, 0.87, bzf + dz)); }
    });
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) G.push(B(0.012, 0.012, 0.012, '#f4f4f2', bxf + s * 0.39, 0.97, bzf - 0.08 + k * 0.035));
    col(bxf - 0.4, bzf - 0.62, bxf + 0.4, bzf + 0.62);
    // le coin canapé, sous les fenêtres ouest
    canape(q.x0 + 0.6, q.z0 + 2.4, EST, 2.0, TISSU[3]); tableBasse(q.x0 + 1.75, q.z0 + 2.4, 0.9, 0.6);
    G.push(C(0.12, 0.1, 0.06, 10, '#d8d2c6', q.x0 + 1.75, 0.45, q.z0 + 2.3));
    auMur(q, 'o', q.z1 - 2.6, 1.6, (x, z, h) => tableau(x, z, h, 1.45, 0.9, null));
    plante(q.x1 - 0.5, q.z1 - 0.5, 'ficus', 1.3); plante(q.x0 + 0.5, q.z0 + 0.5, 'strelitzia', 1.2); plante(q.x0 + 0.5, q.z1 - 0.5, 'kentia', 1.25);
    auMur(q, 'n', bxf, 0.5, (x, z, h) => cadre(x, z, h, 0.36, 0.5, 'vitisoft', 1.7));
    auMur(q, 'n', q.x0 + 1.3, 0.5, (x, z, h) => cadre(x, z, h, 0.36, 0.5, 'viticode', 1.7));
    horlogeMur(PORTE_ATLAS.x, q.z1, NORD, 2.72, 0.36);
    baes(PORTE_ATLAS.x + PORTE_ATLAS.l / 2 + 0.4, q.z1, NORD, 2.3);
    thermostat(q.x1, q.z0 + 3.2, OUEST); extincteur(q.x1, q.z1 - 0.9, OUEST);
    clim(xb + 2.0, zTV); clim(bxf - 1.5, q.z0 + 1.8); detecteur(q.x0 + 2.5, q.z1 - 1.0); detecteur(q.x1 - 2.0, q.z0 + 3.0);
    for (const dz of [-2.5, 2.5]) prise(q.x1, zTV + dz, OUEST);
    VIE.cibles.atlas = [bxf - 1.6, bzf + 1.0];
  }

  // ---- Mars, la cuisine : le plan de travail le long du mur (meubles bas, plan en bois, évier et robinet, lave-vaisselle,
  // la machine à café, la bouilloire, le micro-ondes, la crédence carrelée, les placards hauts), le grand réfrigérateur et
  // ses magnets, le tri des déchets ; la grande table, ses chaises, la corbeille de fruits ; la table haute près de la
  // fenêtre, ses tabourets ; la fontaine à eau, le liège et ses notes, l'horloge
  {
    const q = P.mars, xd = X(4.77) + 1.08, zc = q.z1 - 0.32, L_ = q.x1 - 0.72 - xd;
    // les meubles bas, le plan de travail, la crédence, les placards hauts
    G.push(B(L_, 0.86, 0.6, BLANC, xd + L_ / 2, 0.47, zc), B(L_, 0.1, 0.55, '#3b3f46', xd + L_ / 2, 0.05, zc + 0.02), B(L_ + 0.02, 0.04, 0.64, '#b08d63', xd + L_ / 2, 0.92, zc));
    for (let i = 0; i < Math.floor(L_ / 0.6); i++) G.push(B(0.004, 0.76, 0.01, '#d9d7d0', xd + 0.6 * (i + 1), 0.5, zc - 0.302), B(0.2, 0.015, 0.02, '#9aa0a6', xd + 0.3 + 0.6 * i, 0.82, zc - 0.31));
    G.push(B(L_, 0.58, 0.012, CARRO2, xd + L_ / 2, 1.23, q.z1 - 0.006));
    G.push(B(L_, 0.7, 0.35, BLANC, xd + L_ / 2, 1.9, q.z1 - 0.175), B(L_, 0.02, 0.33, '#e2e1dc', xd + L_ / 2, 1.54, q.z1 - 0.17));
    for (let i = 0; i < Math.floor(L_ / 0.6); i++) G.push(B(0.004, 0.66, 0.01, '#d9d7d0', xd + 0.6 * (i + 1), 1.9, q.z1 - 0.352), B(0.015, 0.15, 0.02, '#9aa0a6', xd + 0.55 + 0.6 * i, 1.66, q.z1 - 0.36));
    col(xd, q.z1 - 0.65, xd + L_, q.z1);
    // l'évier, le robinet ; le lave-vaisselle
    const xe = xd + 1.5; G.push(B(0.55, 0.015, 0.42, '#c9ccd1', xe, 0.945, zc), B(0.48, 0.01, 0.36, '#8d9196', xe, 0.94, zc), C(0.014, 0.014, 0.3, 6, '#c9ccd1', xe, 1.08, q.z1 - 0.1), B(0.025, 0.025, 0.2, '#c9ccd1', xe, 1.22, q.z1 - 0.19), C(0.03, 0.03, 0.12, 8, '#2e86de', xe + 0.35, 1.0, zc));
    G.push(B(0.6, 0.76, 0.01, '#e8eaec', xd + 0.9, 0.48, zc - 0.305), B(0.45, 0.02, 0.025, '#9aa0a6', xd + 0.9, 0.8, zc - 0.315));
    // la machine à café (à grain), deux tasses ; la bouilloire, le micro-ondes, un égouttoir de mugs
    const xc = xd + 2.55; G.push(B(0.32, 0.44, 0.42, '#1f2125', xc, 1.16, zc + 0.02), B(0.26, 0.2, 0.01, '#c9ccd1', xc, 1.22, zc - 0.19), B(0.12, 0.03, 0.1, '#2b2d31', xc, 1.005, zc - 0.14), B(0.08, 0.05, 0.004, '#4a90d9', xc, 1.3, zc - 0.196));
    for (const s of [-0.05, 0.05]) G.push(C(0.03, 0.025, 0.06, 8, '#f4f4f2', xc + s, 1.05, zc - 0.13));
    G.push(C(0.08, 0.09, 0.22, 10, '#f4f4f2', xc + 0.4, 1.05, zc), B(0.06, 0.12, 0.03, '#2b2d31', xc + 0.48, 1.07, zc));
    G.push(B(0.5, 0.3, 0.38, '#d6d9dc', xd + L_ - 0.35, 1.09, zc), B(0.32, 0.2, 0.012, '#1d1d1d', xd + L_ - 0.4, 1.09, zc - 0.196), B(0.06, 0.2, 0.012, '#9aa0a6', xd + L_ - 0.17, 1.09, zc - 0.196));
    for (let i = 0; i < 6; i++) mug(xd + 0.3 + (i % 3) * 0.1, zc + (i < 3 ? 0.05 : -0.08), 0.94, ['#ef6c26', '#f4f4f2', '#2e86de', '#3f7d4a', '#2b2d31', '#c0392b'][i]);
    // le réfrigérateur et ses magnets ; le tri des déchets
    { const xf = q.x1 - 0.37, zf = q.z1 - 0.36; G.push(B(0.7, 1.86, 0.66, '#e8eaec', xf, 0.93, zf), B(0.68, 0.006, 0.01, '#c9ccd0', xf, 1.2, zf - 0.33), B(0.03, 0.5, 0.03, '#9aa0a6', xf - 0.28, 1.5, zf - 0.345), B(0.03, 0.3, 0.03, '#9aa0a6', xf - 0.28, 0.9, zf - 0.345)); for (let i = 0; i < 9; i++) G.push(B(0.05, 0.04 + (i % 3) * 0.015, 0.008, ['#c0392b', '#e0b13a', '#2e86de', '#3f7d4a', '#f4f4f2', ORANGE][i % 6], xf - 0.2 + (i % 4) * 0.12, 1.4 + Math.floor(i / 4) * 0.12, zf - 0.334)); G.push(B(0.12, 0.17, 0.004, '#ffffff', xf + 0.1, 1.55, zf - 0.334)); col(xf - 0.35, zf - 0.33, xf + 0.35, q.z1); }
    { const xw = X(4.77) + e / 2 + 0.21; for (let i = 0; i < 3; i++) { const z = Z(11.3) - i * 0.34; G.push(B(0.4, 0.6, 0.31, ['#e0b13a', '#3f7d4a', '#5a5d63'][i], xw, 0.3, z), B(0.4, 0.03, 0.31, ['#c99a20', '#2f6a3a', '#3b3f46'][i], xw, 0.615, z)); } col(xw - 0.2, Z(11.3) - 0.85, xw + 0.2, Z(11.3) + 0.17); }
    VIE.cafe.push({ x: xc, z: zc - 0.72, h: SUD, regard: { x: xc, y: 1.2, z: zc } }, { x: xc + 0.6, z: zc - 0.75, h: SUD - 0.4, regard: { x: xc, y: 1.4, z: zc - 0.7 } }, { x: xc - 0.7, z: zc - 0.85, h: SUD + 0.6, regard: { x: xc, y: 1.4, z: zc - 0.7 } });
    // la grande table et ses chaises (on y déjeune), la corbeille de fruits
    const xt = xd + 1.95, zt = (q.z0 + q.z1) / 2 + 0.2;
    table(xt, zt, 0.95, 2.4, '#f0ede6', '#2b2d31');
    for (const dz of [-0.8, 0, 0.8]) { place(VIE.repas, xt - 0.72, zt + dz, EST, '#3f7d4a', { x: xt + 0.7, y: 1.1, z: zt + dz }); place(VIE.repas, xt + 0.72, zt + dz, OUEST, '#3f7d4a', { x: xt - 0.7, y: 1.1, z: zt + dz }); }
    place(VIE.repas, xt, zt - 1.55, SUD, '#3f7d4a', { x: xt, y: 1.1, z: zt }); place(VIE.repas, xt, zt + 1.55, NORD, '#3f7d4a', { x: xt, y: 1.1, z: zt });
    G.push(C(0.16, 0.1, 0.07, 12, '#c49a6c', xt, 0.775, zt)); for (let i = 0; i < 5; i++) G.push(S(0.04, ['#e8833a', '#c0392b', '#e0b13a', '#7fae3e', '#e8833a'][i], xt + Math.sin(i * 1.3) * 0.06, 0.82 + (i % 2) * 0.03, zt + Math.cos(i * 1.3) * 0.06, 1, 1, 1));
    // la table haute, ses tabourets ; la fontaine à eau ; le liège, l'horloge, une plante sur le frigo
    const zh = q.z0 + 1.3; tableRonde(q.x1 - 0.95, zh, 0.4, '#f4f3ef', 1.05); tabouret(q.x1 - 1.45, zh + 0.2); tabouret(q.x1 - 0.5, zh - 0.35);
    VIE.cafe.push({ x: q.x1 - 1.45, z: zh - 0.45, h: EST - 0.5, regard: { x: q.x1 - 0.8, y: 1.5, z: zh } });
    auMur(q, 'n', xd + 0.6, 0.4, (x, z, h) => { const r = R(x, z, h); bx(r, h, 0.32, 1.0, 0.32, '#e8eaec', 0, 0.5, 0.2); bx(r, h, 0.32, 0.06, 0.32, '#c9ccd0', 0, 1.03, 0.2); const [fx, fz] = r(0, 0.2); G.push(C(0.13, 0.13, 0.42, 12, '#8fc3e6', fx, 1.27, fz), C(0.11, 0.11, 0.02, 12, '#5fa5d4', fx, 1.49, fz)); bx(r, h, 0.06, 0.04, 0.02, '#2e86de', -0.06, 0.92, 0.37); bx(r, h, 0.06, 0.04, 0.02, '#c0392b', 0.06, 0.92, 0.37); emprise(r, h, 0.34, 0.34, 0, 0.2); });
    auMur(q, 'n', (q.x0 + q.x1) / 2 + 0.4, 0.8, (x, z, h) => cadre(x, z, h, 0.8, 0.56, 'liege', 1.5, '#7a5a3a'));
    auMur(q, 'n', q.x1 - 0.8, 0.4, (x, z, h) => horlogeMur(x, z, h, 2.3, 0.32));
    plante(q.x1 - 0.37, q.z1 - 0.36, 'pothos', 1, false); // (sur le frigo : posée à 1,86 m)
    thermostat(X(4.77) + e / 2, (q.z0 + q.z1) / 2, EST); prise(xd + 3.4, q.z1, NORD, 1.1); prise(xd + 0.6, q.z1, NORD, 1.1);
    grille(q.x0 + 1.0, q.z1 - 1.0); detecteur((q.x0 + q.x1) / 2, zt); clim((q.x0 + q.x1) / 2, zt + 2.0);
    VIE.cibles.mars = [xt - 1.4, zt - 1.6];
  }

  // ---- Terre : Jessica (les données) contre le mur sud, Charlene (la formation) contre le mur nord ; une armoire, une
  // plante ; Vénus : Vincent (le web), tourné vers la porte, deux chaises, une bibliothèque, le tableau du site
  {
    const q = P.terre, xm = (q.x0 + q.x1) / 2 + 0.3;
    poste(xm, q.z1 - 0.975, SUD, { qui: 'jessica', nom: 'jessica', w: 1.6, zones: ['donnees', 'donnees'], mug: '#8e44ad', papiers: true, lampe: '#f4f4f2', plante: true });
    poste(xm, q.z0 + 0.975, NORD, { qui: 'charlene', nom: 'charlene', w: 1.6, zones: ['logiciel', 'visio'], webcam: true, casque: true, mug: ORANGE, postit: true });
    auMur(q, 'o', q.z0 + 0.8, 0.95, (x, z, h) => armoire(x, z, h, 0.9, 1.25));
    plante(q.x1 - 0.45, q.z1 - 0.45, 'sansevieria', 1.1);
    auMur(q, 's', q.x0 + 1.2, 0.4, (x, z, h) => cadre(x, z, h, 0.3, 0.42, 'calendrier', 1.6, '#f4f4f2'));
    detecteur((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2); prise(xm - 0.5, q.z1, NORD); prise(xm + 0.5, q.z0, SUD);
    VIE.cibles.terre = [q.x0 + 1.6, (q.z0 + q.z1) / 2];
  }
  {
    const q = P.venus, zm = (q.z0 + q.z1) / 2;
    poste(q.x1 - 1.3, zm - 0.1, OUEST, { qui: 'vincent', nom: 'vincent', w: 1.8, zones: ['site', 'code'], mug: '#2b2d31', lampe: '#2b2d31', papiers: true, portable: 'site' });
    chaiseS(q.x1 - 3.0, zm - 0.5, EST, TISSU[0]); chaiseS(q.x1 - 3.0, zm + 0.35, EST, TISSU[0]);
    auMur(q, 'n', q.x0 + 1.4, 1.2, (x, z, h) => etagere(x, z, h, 1.2, 1.9, 5, '#e9e7e1', true));
    auMur(q, 's', q.x0 + 2.8, 1.6, (x, z, h) => tableau(x, z, h, 1.4, 0.85, 'tb:venus'));
    plante(q.x1 - 0.45, q.z0 + 0.45, 'kentia', 1.1);
    detecteur((q.x0 + q.x1) / 2, zm); prise(q.x1, zm + 1.2, OUEST);
    VIE.cibles.venus = [q.x0 + 1.5, zm];
  }

  // ---- Mercure, la salle de réunion : la grande table, ses chaises, la pieuvre de conférence, des carnets, des
  // bouteilles ; la télé au mur ouest ; le tableau blanc ; la crédence et son thermos ; le paperboard ; des plantes ; le
  // portemanteau
  {
    const q = P.mercure, zt = (q.z0 + q.z1) / 2, xt0 = q.x0 + 1.45, xt1 = xt0 + 4.2, xt = (xt0 + xt1) / 2;
    table(xt, zt, xt1 - xt0, 1.2, CHENE, '#2b2d31');
    const tv = { x: q.x0 + 0.06, y: 1.42, z: zt };
    for (let i = 0; i < 4; i++) { const x = xt0 + 0.55 + i * 1.05; place(VIE.reunion, x, zt + 0.95, NORD, TISSU[0], tv); place(VIE.reunion, x, zt - 0.95, SUD, TISSU[0], tv); }
    place(VIE.reunion, xt1 + 0.62, zt, OUEST, TISSU[0], tv);
    G.push(C(0.12, 0.14, 0.03, 3, '#2b2d31', xt, 0.755, zt)); for (let i = 0; i < 4; i++) { const x = xt0 + 0.55 + i * 1.05; G.push(B(0.15, 0.012, 0.21, i % 2 ? '#2b2d31' : '#c0392b', x, 0.746, zt + 0.35), C(0.03, 0.03, 0.2, 8, '#d6e6ee', x + 0.25, 0.84, zt - 0.3)); }
    tele(q.x0, zt, EST, 1.7, 0.96, 'teleMercure', 1.45);
    auMur(q, 's', q.x1 - 3.2, 1.9, (x, z, h) => tableau(x, z, h, 1.8, 0.95, 'tb:mercure'));
    auMur(q, 'n', q.x1 - 2.4, 1.7, (x, z, h) => { const r = R(x, z, h); bx(r, h, 1.6, 0.85, 0.45, '#2b2d31', 0, 0.43, 0.24); bx(r, h, 1.62, 0.03, 0.47, CHENE, 0, 0.87, 0.24); const [tx, tz] = r(-0.4, 0.24); G.push(C(0.07, 0.07, 0.3, 10, '#c9ccd1', tx, 1.03, tz)); for (let i = 0; i < 4; i++) mug(...r(0.1 + i * 0.12, 0.24), 0.885, '#f4f4f2'); emprise(r, h, 1.6, 0.45, 0, 0.24); });
    { const x = xt1 + 1.4, z = q.z0 + 0.8; G.push(B(0.7, 0.9, 0.02, '#fbfbf8', x, 1.4, z, 0.4), B(0.72, 0.04, 0.05, '#2b2d31', x, 1.86, z, 0.4)); for (const s of [-1, 1]) G.push(B(0.025, 1.85, 0.025, '#2b2d31', x + Math.cos(0.4) * s * 0.33, 0.92, z - Math.sin(0.4) * s * 0.33)); G.push(B(0.025, 1.4, 0.025, '#2b2d31', x - Math.sin(0.4) * 0.3, 0.7, z - Math.cos(0.4) * 0.3)); col(x - 0.4, z - 0.4, x + 0.4, z + 0.3); }
    plante(q.x1 - 0.5, q.z0 + 0.5, 'ficus', 1.2); plante(q.x0 + 0.45, q.z1 - 0.45, 'sansevieria');
    portemanteau(q.x1 - 0.45, q.z1 - 0.5, 2);
    auMur(q, 'e', q.z0 + 0.9, 0.45, (x, z, h) => horlogeMur(x, z, h, 2.3, 0.32));
    thermostat(q.x1, q.z1 - 1.6, OUEST); clim(xt, zt); detecteur(xt1 + 1.2, zt); prise(q.x0, zt + 1.2, EST);
    VIE.cibles.mercure = [xt1 + 1.2, zt + 1.0]; VIE.tvReunion = tv;
  }

  // ---- Neptune (Teddy) et Uranus (Thomas) : le bureau tourné vers la porte, la chaise des visiteurs ; à Uranus, le grand
  // bureau de bois sombre, la bibliothèque, deux fauteuils et leur table basse ; des plantes, des cadres
  {
    const q = P.neptune, xm = (q.x0 + q.x1) / 2 + 0.3;
    poste(xm, q.z0 + 1.75, SUD, { qui: 'teddy', nom: 'teddy', w: 1.6, zones: ['crm', 'bureau'], plan: '#d7c3a0', papiers: true, mug: '#2e86de', tel: true, lampe: '#2b2d31', portable: 'crm', chaiseC: '#1d1d1d', photo: true });
    chaiseS(xm - 0.45, q.z1 - 1.9, NORD, '#5a5d63'); chaiseS(xm + 0.45, q.z1 - 1.9, NORD, '#5a5d63');
    auMur(q, 'e', q.z1 - 1.5, 1.2, (x, z, h) => etagere(x, z, h, 1.1, 1.9, 5, '#e9e7e1', false));
    plante(q.x1 - 0.45, q.z0 + 0.45, 'strelitzia'); auMur(q, 'o', q.z1 - 2.6, 0.5, (x, z, h) => cadre(x, z, h, 0.36, 0.5, 'lebureau'));
    auMur(q, 'o', q.z0 + 1.2, 0.5, (x, z, h) => cadre(x, z, h, 0.36, 0.5, 'vignes'));
    detecteur(xm, (q.z0 + q.z1) / 2); prise(q.x0, q.z0 + 0.6, EST);
    VIE.cibles.neptune = [xm, q.z1 - 1.0];
  }
  {
    const q = P.uranus, xm = (q.x0 + q.x1) / 2 + 0.4;
    poste(xm, q.z0 + 1.8, SUD, { qui: 'thomas', nom: 'thomas', w: 2.0, zones: ['bureau'], grand: true, plan: '#6a4b35', papiers: true, mug: '#f4f4f2', tel: true, lampe: '#c9a55a', chaiseC: '#1d1d1d', photo: true, portable: 'mail' });
    chaiseS(xm - 0.5, q.z1 - 2.0, NORD, '#5a5d63'); chaiseS(xm + 0.5, q.z1 - 2.0, NORD, '#5a5d63');
    auMur(q, 'e', q.z0 + 1.5, 1.7, (x, z, h) => etagere(x, z, h, 1.6, 2.0, 5, '#6b4a30', true));
    fauteuil(q.x1 - 1.1, q.z1 - 0.6, NORD); fauteuil(q.x1 - 0.55, q.z1 - 1.45, OUEST, TISSU[2]); tableBasse(q.x1 - 1.15, q.z1 - 1.45, 0.6, 0.6, '#6a4b35');
    plante(q.x0 + 0.5, q.z0 + 0.5, 'kentia', 1.25); auMur(q, 'o', q.z0 + 2.2, 0.5, (x, z, h) => cadre(x, z, h, 0.36, 0.5, 'viticode'));
    auMur(q, 'o', q.z1 - 2.6, 0.5, (x, z, h) => cadre(x, z, h, 0.36, 0.5, 'equipe'));
    detecteur(xm, (q.z0 + q.z1) / 2); thermostat(q.x0, q.z1 - 1.4, EST);
    VIE.cibles.uranus = [xm - 1.0, q.z1 - 1.0];
  }

  // ---- Saturne, les commerciales : un îlot de quatre postes (Le bureau à l'écran, un téléphone chacune), le poste de
  // Vanessa (à part : rangé quand elle n'est pas là) ; le tableau de la semaine, une armoire, le portemanteau, une plante
  {
    const q = P.saturne, xi = q.x0 + 2.75, zi = (q.z0 + q.z1) / 2 - 0.45;
    const P4 = [['romane', -0.945, 0.7, EST], ['alice', 0.945, 0.7, OUEST], ['camila', -0.945, -0.7, EST], ['vanessa', 0.945, -0.7, OUEST]];
    for (const [id, dx, dz, h] of P4) {
      const v = id === 'vanessa';
      poste(xi + dx, zi + dz, h, { qui: id, nom: id, zones: v ? ['crm'] : ['crm', 'mail'], ilot: true, panneau: TISSU[1], tel: true, mug: v ? null : ['#c0392b', '#f4f4f2', ORANGE][P4.findIndex(p => p[0] === id)], papiers: !v, postit: id === 'alice', plante: id === 'camila', chaise: !v, tour: !v, sac: v ? null : MANTEAUX[id.length] });
      if (v) VIE.vanessa = { x: xi + dx, z: zi + dz, h };
    }
    auMur(q, 'n', xi, 1.8, (x, z, h) => tableau(x, z, h, 1.6, 0.95, 'tb:saturne'));
    auMur(q, 's', q.x0 + 1.2, 1.2, (x, z, h) => armoire(x, z, h, 1.1, 1.25));
    portemanteau(q.x0 + 0.5, q.z0 + 0.5, 4); plante(q.x1 - 0.5, q.z0 + 0.5, 'ficus', 1.2);
    auMur(q, 'e', q.z0 + 1.6, 0.4, (x, z, h) => horlogeMur(x, z, h, 2.3, 0.32));
    thermostat(q.x1, q.z0 + 2.6, OUEST); clim(xi, zi); detecteur(xi, q.z1 - 1.0); goulotte(q, 'e', q.z0 + 0.4, q.z1 - 1.3);
    VIE.cibles.saturne = [q.x1 - 0.9, zi - 1.4];
  }

  // ---- Jupiter, le développement : l'îlot des quatre développeurs (deux écrans de code), le poste de Jérémie (les
  // partenariats), les placards, le tableau des tâches, l'écran de l'intégration continue, le tableau blanc de
  // l'architecture, le coin canapé (canapé, pouf, table basse, lampadaire, tapis), des plantes, le portemanteau
  {
    const q = P.jupiter, xi = q.x0 + 3.25, zi = q.z1 - 4.9;
    const D4 = [['dylan', -0.945, 0.7, EST], ['emeline', 0.945, 0.7, OUEST], ['nathan', -0.945, -0.7, EST], ['kevin', 0.945, -0.7, OUEST]];
    D4.forEach(([id, dx, dz, h], i) => poste(xi + dx, zi + dz, h, { qui: id, nom: id, zones: ['code', i % 2 ? 'build' : 'code2'], ilot: true, panneau: TISSU[2], mug: ['#3f7d4a', '#2b2d31', '#f4f4f2', ORANGE][i], postit: i !== 1, plante: i === 1, portable: i === 3 ? 'code' : null, sac: MANTEAUX[i + 3] }));
    G.push(S(0.03, '#f2c94c', xi - 0.25, 0.77, zi + 0.35, 1, 0.8, 1.2), S(0.018, '#f2c94c', xi - 0.25, 0.81, zi + 0.37, 1, 1, 1)); // (le canard en plastique)
    poste(q.x0 + 2.0, q.z0 + 4.7, EST, { qui: 'jeremie', nom: 'jeremie', w: 1.6, zones: ['partenaires', 'crm'], tel: true, mug: '#c0392b', papiers: true, lampe: '#2b2d31', photo: true });
    // les placards du plan, le tableau des tâches, l'écran de l'intégration continue, le tableau de l'architecture
    auMur(q, 'e', q.z1 - 1.65, 3.0, (x, z, h) => { const r = R(x, z, h); bx(r, h, 3.0, 2.4, 0.6, '#e6e3dc', 0, 1.2, 0.3); for (const lx of [-0.75, 0.75]) { bx(r, h, 0.004, 2.3, 0.006, '#c9c6bf', lx, 1.17, 0.601); bx(r, h, 0.02, 0.2, 0.03, '#9aa0a6', lx + 0.06, 1.1, 0.615); bx(r, h, 0.02, 0.2, 0.03, '#9aa0a6', lx - 0.06, 1.1, 0.615); } bx(r, h, 0.004, 2.3, 0.006, '#c9c6bf', 0, 1.17, 0.601); emprise(r, h, 3.0, 0.6, 0, 0.3); });
    auMur(q, 'e', q.z1 - 5.2, 1.8, (x, z, h) => tableau(x, z, h, 1.6, 0.95, 'kanban'));
    auMur(q, 'e', q.z0 + 5.2, 1.3, (x, z, h) => tele(x, z, h, 1.2, 0.675, 'build', 1.65));
    auMur(q, 'e', q.z0 + 3.0, 1.5, (x, z, h) => tableau(x, z, h, 1.35, 0.84, 'tb:jupiter'));
    // le coin canapé, au fond
    { const zc_ = q.z0 + 0.6; G.push(B(2.6, 0.012, 1.8, '#8f9a82', q.x0 + 2.2, 0.028, zc_ + 1.0)); canape(q.x0 + 2.0, zc_, SUD, 2.0, TISSU[5]); tableBasse(q.x0 + 2.0, zc_ + 1.15, 1.0, 0.55); G.push(S(0.32, TISSU[2], q.x0 + 3.65, 0.25, zc_ + 1.2, 1, 0.75, 1, 1)); col(q.x0 + 3.35, zc_ + 0.9, q.x0 + 3.95, zc_ + 1.5); lampadaire(q.x0 + 0.55, zc_); mug(q.x0 + 1.8, zc_ + 1.1, 0.42, '#f4f4f2'); G.push(B(0.25, 0.02, 0.32, '#2b2d31', q.x0 + 2.2, 0.425, zc_ + 1.2, 0.3)); }
    plante(q.x0 + 0.5, q.z1 - 0.5, 'ficus', 1.3); plante(q.x1 - 0.5, q.z0 + 1.9, 'strelitzia', 1.1); plante(q.x0 + 0.5, q.z0 + 3.4, 'kentia', 1.2);
    portemanteau(q.x0 + 1.25, q.z1 - 0.5, 4);
    auMur(q, 'o', (q.z0 + q.z1) / 2 + 0.3, 0.45, (x, z, h) => horlogeMur(x, z, h, 2.35, 0.32));
    auMur(q, 'o', q.z1 - 1.2, 0.5, (x, z, h) => cadre(x, z, h, 0.36, 0.5, 'equipe'));
    thermostat(q.x1, q.z0 + 4.2, OUEST); clim(xi, zi); clim(xi, q.z0 + 4.0); detecteur(xi + 1.5, q.z1 - 2.0); detecteur(xi, q.z0 + 2.5); goulotte(q, 'o', q.z0 + 0.5, q.z1 - 0.5);
    VIE.cibles.jupiter = [xi + 2.0, zi];
  }

  // ---- le bloc du milieu : les sanitaires (lavabos, miroir, distributeurs, sèche-mains, les cabines fermées), les moyens
  // généraux (le grand copieur, les ramettes, les fournitures, deux baies de serveurs, le destructeur, les casiers du
  // courrier). La chaufferie et le local ménage restent fermés.
  const lavabos = (q, cote, n) => auMur(q, cote, cote === 's' || cote === 'n' ? (q.x0 + q.x1) / 2 : (q.z0 + q.z1) / 2, n * 0.7 + 0.2, (x, z, h) => {
    const r = R(x, z, h); bx(r, h, n * 0.7 + 0.2, 0.06, 0.5, '#f4f4f2', 0, 0.84, 0.25); bx(r, h, n * 0.7, 0.75, 0.01, '#cfe0ea', 0, 1.5, 0.006);
    for (let i = 0; i < n; i++) { const lx = (i - (n - 1) / 2) * 0.7; bx(r, h, 0.4, 0.04, 0.3, '#e6e8e9', lx, 0.86, 0.26); cy(r, 0.012, 0.15, '#c9ccd1', lx, 0.95, 0.06, 6); bx(r, h, 0.1, 0.16, 0.08, '#f4f4f2', lx + 0.3, 1.25, 0.04); }
    bx(r, h, 0.3, 0.32, 0.12, '#e8eaec', n * 0.35 + 0.35, 1.35, 0.06); bx(r, h, 0.28, 0.4, 0.12, '#f4f4f2', -n * 0.35 - 0.35, 1.3, 0.06);
    emprise(r, h, n * 0.7 + 0.2, 0.5, 0, 0.25);
  });
  const cabines = (q, n) => { const w = (q.x1 - q.x0 - 0.2) / n; for (let i = 0; i < n; i++) { const x = q.x0 + 0.1 + (i + 0.5) * w; if (i) G.push(B(0.03, 1.9, 1.4, '#9fb4c2', x - w / 2, 1.05, q.z0 + 0.72)); G.push(B(w - 0.12, 1.8, 0.035, '#a9bfcc', x, 1.02, q.z0 + 1.42), B(0.03, 0.03, 0.03, '#c0392b', x + w / 2 - 0.15, 1.0, q.z0 + 1.44)); } col(q.x0, q.z0, q.x1, q.z0 + 1.45); };
  { lavabos(P.sanit1, 's', 2); cabines(P.sanit1, 2); grille((P.sanit1.x0 + P.sanit1.x1) / 2, P.sanit1.z0 + 2.4); poubelle(P.sanit1.x1 - 0.4, P.sanit1.z1 - 0.3, '#c9ccd0'); VIE.cibles.sanit1 = [(P.sanit1.x0 + P.sanit1.x1) / 2, P.sanit1.z1 - 1.4]; }
  { const q = P.sanit2; lavabos(q, 'n', 1); G.push(B(0.38, 0.42, 0.65, '#f4f4f2', q.x0 + 0.4, 0.21, (q.z0 + q.z1) / 2), B(0.42, 0.06, 0.5, '#f4f4f2', q.x0 + 0.4, 0.44, (q.z0 + q.z1) / 2 + 0.05), B(0.2, 0.6, 0.38, '#f4f4f2', q.x0 + 0.12, 0.7, (q.z0 + q.z1) / 2), C(0.02, 0.02, 0.6, 6, '#c9ccd1', q.x0 + 0.4, 0.8, (q.z0 + q.z1) / 2 + 0.45, 'x')); col(q.x0, (q.z0 + q.z1) / 2 - 0.4, q.x0 + 0.75, (q.z0 + q.z1) / 2 + 0.45); grille((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2); VIE.cibles.sanit2 = [q.x1 - 1.0, (q.z0 + q.z1) / 2]; }
  { const q = P.sanit3; lavabos(q, 's', 1); grille((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2); VIE.cibles.sanit3 = [(q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2 + 0.6]; }
  {
    const q = P.moyens, zc_ = q.z1 - 2.0;
    // le copieur : le corps, le chargeur, l'écran tactile, les bacs, la sortie ; une ramette ouverte à côté
    { const x = q.x0 + 0.42, r = R(x, zc_, EST); bx(r, EST, 0.65, 0.95, 0.6, '#e8eaec', 0, 0.48, 0); bx(r, EST, 0.6, 0.12, 0.55, '#c9ccd1', 0, 1.01, 0); bx(r, EST, 0.25, 0.04, 0.18, '#3a6ea5', 0.15, 1.09, 0.2); for (let i = 0; i < 3; i++) bx(r, EST, 0.6, 0.005, 0.01, '#9aa0a6', 0, 0.2 + i * 0.18, 0.3); bx(r, EST, 0.34, 0.03, 0.25, '#f6f4ee', -0.05, 0.82, 0.32); bx(r, EST, 0.3, 0.004, 0.22, '#ffffff', -0.05, 0.84, 0.33); emprise(r, EST, 0.65, 0.6); VIE.imprimante.push({ x: x + 0.8, z: zc_, h: OUEST, regard: { x, y: 1.0, z: zc_ } }, { x: x + 1.2, z: zc_ + 0.75, h: OUEST - 0.4, regard: { x, y: 1.0, z: zc_ } }); }
    for (let k = 0; k < 4; k++) { G.push(B(1.8, 0.03, 0.45, GRIS, q.x1 - 1.2, 0.3 + k * 0.5, q.z1 - 0.25)); for (let i = 0; i < 4; i++) G.push(B(0.3, 0.2, 0.4, (i + k) % 2 ? '#f6f4ee' : '#e9e1cf', q.x1 - 1.95 + i * 0.5, 0.42 + k * 0.5, q.z1 - 0.25)); }
    for (const dx of [-2.1, -0.3]) G.push(B(0.03, 1.8, 0.45, GRIS, q.x1 + dx, 0.9, q.z1 - 0.25));
    col(q.x1 - 2.15, q.z1 - 0.5, q.x1 - 0.25, q.z1);
    for (let i = 0; i < 2; i++) { const x = q.x1 - 0.4 - i * 0.65, z = q.z0 + 0.55; G.push(B(0.62, 2.0, 1.0, '#1c1e22', x, 1.0, z), B(0.54, 1.84, 0.01, '#2a3442', x, 1.0, z + 0.505)); for (let k = 0; k < 9; k++) G.push(B(0.03, 0.018, 0.012, ['#3ddc84', '#3ddc84', '#4aa3ff', '#ffb02e'][(k + i) % 4], x - 0.18 + ((k * 7 + i) % 5) * 0.08, 0.35 + k * 0.17, z + 0.512)); }
    col(q.x1 - 1.05, q.z0, q.x1, q.z0 + 1.1);
    G.push(B(0.4, 0.65, 0.32, '#2b2d31', q.x0 + 0.3, 0.33, q.z0 + 0.3)); col(q.x0, q.z0, q.x0 + 0.5, q.z0 + 0.5);
    table(q.x0 + 2.4, q.z0 + 0.6, 1.6, 0.7, '#e7e2d8');
    for (let i = 0; i < 6; i++) G.push(B(0.24, 0.1 + (i % 3) * 0.05, 0.31, ['#f6f4ee', '#e0b13a', '#c49a6c'][i % 3], q.x0 + 1.85 + (i % 3) * 0.3, 0.8 + Math.floor(i / 3) * 0.12, q.z0 + 0.6));
    auMur(q, 'n', q.x0 + 1.2, 0.9, (x, z, h) => { const r = R(x, z, h); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) bx(r, h, 0.2, 0.15, 0.3, '#d9d5cc', -0.3 + i * 0.2, 1.2 + j * 0.16, 0.15); emprise(r, h, 0.8, 0.3, 0, 0.15); });
    grille((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2); detecteur(q.x0 + 1.2, (q.z0 + q.z1) / 2);
    VIE.cibles.moyens = [q.x0 + 1.4, zc_ - 0.6];
  }

  // ---- les couloirs : la fontaine à eau, des plantes, les extincteurs, le défibrillateur, le tableau électrique, des
  // affiches, les plans d'évacuation, les blocs de secours, une horloge ; le banc du couloir
  {
    const fE = X(4.77) - e / 2, fB = X(6.7) + e / 2, fO = X(15.62) + e / 2, fBo = X(13.72) - e / 2, hS = Z(6.2) - e / 2, hB = Z(8.15) + e / 2, bS = Z(19.7) - e / 2, bN = Z(21.5) + e / 2;
    // (fE : le mur de Mars, Terre, Vénus côté couloir ; fB : le bloc du milieu côté est ; fBo : le bloc côté ouest ; fO :
    // le mur de Jupiter ; hS, hB : le couloir du haut ; bS, bN : celui du bas)
    { const r = R(fE, Z(12.3), OUEST); bx(r, OUEST, 0.32, 1.0, 0.32, '#e8eaec', 0, 0.5, 0.17); bx(r, OUEST, 0.32, 0.06, 0.32, '#c9ccd0', 0, 1.03, 0.17); const [fx, fz] = r(0, 0.17); G.push(C(0.13, 0.13, 0.42, 12, '#8fc3e6', fx, 1.27, fz)); col(fE - 0.34, Z(12.3) - 0.17, fE, Z(12.3) + 0.17); }
    extincteur(fB, Z(10.6), EST); extincteur(fBo, Z(11.0), OUEST); extincteur(cE + 0.95, hS, NORD); extincteur(X(9.8), bS, NORD);
    { const r = R(fB, Z(17.2), EST); bx(r, EST, 0.34, 0.42, 0.14, '#f4f4f2', 0, 1.45, 0.07); quad(r, EST, 'defib', 0, 1.45, 0.141, 0.3, 0.38); }
    { const r = R(X(7.4), hB, SUD); bx(r, SUD, 0.6, 0.8, 0.16, '#d9dcdf', 0, 1.55, 0.08); bx(r, SUD, 0.004, 0.76, 0.005, '#9aa0a6', 0, 1.55, 0.161); bx(r, SUD, 0.02, 0.1, 0.02, '#5a5d63', 0.22, 1.55, 0.17); bx(r, SUD, 0.08, 0.06, 0.004, '#f2b632', -0.18, 1.85, 0.161); bx(r, SUD, 0.08, 1.05, 0.06, '#e9e9e6', 0.2, 2.47, 0.04); }
    cadre(X(9.0), hS, NORD, 0.36, 0.5, 'vitisoft'); cadre(X(10.5), hS, NORD, 0.36, 0.5, 'viticode'); cadre(X(12.2), hS, NORD, 0.36, 0.5, 'lebureau');
    cadre(fE, Z(17.4), OUEST, 0.42, 0.57, 'plan', 1.5, '#f4f4f2'); cadre(fBo, Z(18.4), OUEST, 0.42, 0.57, 'plan', 1.5, '#f4f4f2');
    cadre(fB, Z(11.8), EST, 0.36, 0.5, 'vignes'); cadre(fO, Z(11.2), EST, 0.36, 0.5, 'chateau'); cadre(fO, Z(16.6), EST, 0.36, 0.5, 'equipe');
    cadre(X(8.0), bS, NORD, 0.36, 0.5, 'vitisoft'); cadre(X(11.5), bS, NORD, 0.36, 0.5, 'vignes');
    horlogeMur(X(10.4), hB, SUD, 2.3, 0.32);
    plante(cE + 0.8, Z(20.0), 'kentia', 1.15); plante(fBo - 0.35, Z(20.0) + 0.3, 'sansevieria'); plante(X(12.9), hS - 0.35, 'strelitzia', 1.0);
    { const r = R(fB, Z(16.0), EST); bx(r, EST, 1.2, 0.06, 0.38, CHENE, 0, 0.45, 0.2); for (const s of [-1, 1]) bx(r, EST, 0.05, 0.42, 0.36, NOIR, s * 0.55, 0.21, 0.2); emprise(r, EST, 1.2, 0.4, 0, 0.2); }
    baes(fE, Z(8.2), OUEST); baes(cE, bN, SUD); baes(X(11.0), hS, NORD);
    for (const [x, z] of [[cE, Z(10)], [cE, Z(16)], [X(10), cH], [X(10), cB], [cO, Z(12)], [cO, Z(18)]]) detecteur(x, z);
    for (const z of [Z(13), Z(18.2)]) prise(fE, z, OUEST);
  }

  VIE.babyfoot = babyfoot; VIE.boites = boites; VIE.tournees = tournees;
  const lumiere = { couleur: [1.0, 0.97, 0.93], force: 1.25, portee: 0.17, fond: [0.6, 0.6, 0.59], relief: true, allumage: true }; // (allumage : éteintes quand le bureau est vide, la classe Solumatic)
  return { geos: G, vitres: V, boites, tournees, murs, portes, pieces, lampes, lumiere, affiches, ecrans, gens, babyfoot };
}

/* ---------------------------------------------------------------- la grille de marche
   Ceux qui y travaillent marchent d'un point à un autre par les couloirs et les portes : la grille du plan (15 cm), ce
   qui arrête (les cloisons, les meubles, les battants ouverts) grossi de la largeur d'une personne ; le chemin le plus
   court (A*, huit voisins, sans couper les coins), puis tendu (on file en ligne droite tant que rien ne gêne). Rien
   d'écrit en dur : un meuble déplacé, le chemin suit. */
class Grille {
  constructor(boites, tournees, marge = 0.28, pas = 0.15) {
    const { x0, x1, z0, z1 } = SOLU;
    this.x0 = x0; this.z0 = z0; this.p = pas; this.nx = Math.ceil((x1 - x0) / pas); this.nz = Math.ceil((z1 - z0) / pas);
    const n = this.nx * this.nz, b = this.b = new Uint8Array(n);
    const marquer = (a, c, d, f) => {
      const i0 = Math.max(0, Math.floor((a - marge - x0) / pas)), i1 = Math.min(this.nx - 1, Math.floor((d + marge - x0) / pas));
      const j0 = Math.max(0, Math.floor((c - marge - z0) / pas)), j1 = Math.min(this.nz - 1, Math.floor((f + marge - z0) / pas));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const cx = x0 + (i + 0.5) * pas, cz = z0 + (j + 0.5) * pas;
        if (cx > a - marge && cx < d + marge && cz > c - marge && cz < f + marge) b[j * this.nx + i] = 1;
      }
    };
    for (const [a, c, d, f] of boites) marquer(a, c, d, f);
    for (const [cx, cz, w, , r] of tournees) { const ux = Math.cos(r), uz = -Math.sin(r); for (let s = -w / 2; s <= w / 2 + 1e-6; s += 0.08) marquer(cx + ux * s, cz + uz * s, cx + ux * s, cz + uz * s); }
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) { const cx = x0 + (i + 0.5) * pas, cz = z0 + (j + 0.5) * pas; if (cx < x0 + marge || cx > x1 - marge || cz < z0 + marge || cz > z1 - marge) b[j * this.nx + i] = 1; }
    // (la recherche : tableaux typés gardés d'une fois sur l'autre, rien d'alloué par case ; tour : le numéro de la
    // recherche, qui dit si g et ferme sont de celle-ci, sans tout remettre à zéro ; ev : les cases autour de qui gêne)
    this.g = new Float32Array(n); this.de = new Int32Array(n); this.tg = new Uint32Array(n); this.tf = new Uint32Array(n); this.tour = 0;
    this.ev = new Uint8Array(n); this.evL = []; this.R = null;
    this.tasF = new Float32Array(2 * n); this.tasK = new Int32Array(2 * n);
    // les chemins déjà cherchés (sans personne à éviter), d'un point à un autre au centimètre près : les allers et retours
    // du café, de l'imprimante, des réunions ne se cherchent qu'une fois
    this.cache = new Map();
  }
  ij(x, z) { return [Math.floor((x - this.x0) / this.p), Math.floor((z - this.z0) / this.p)]; }
  bloque(i, j) { if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return true; const k = j * this.nx + i; return this.b[k] === 1 || this.ev[k] === 1; }
  libre(x, z) { return !this.bloque(Math.floor((x - this.x0) / this.p), Math.floor((z - this.z0) / this.p)); }
  // la case libre la plus proche (en anneaux, jusqu'à 1,5 m) : son numéro, ou -1
  proche(x, z) {
    const i0 = Math.floor((x - this.x0) / this.p), j0 = Math.floor((z - this.z0) / this.p);
    for (let k = 0; k < 10; k++) for (let dj = -k; dj <= k; dj++) for (let di = -k; di <= k; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== k || this.bloque(i0 + di, j0 + dj)) continue;
      return (j0 + dj) * this.nx + i0 + di;
    }
    return -1;
  }
  // rien ne gêne en ligne droite de a à b ? Chaque case que traverse le segment (pas à pas d'une case à la suivante,
  // Amanatides et Woo), plus sûr et dix fois moins de calculs qu'un point tous les 7 cm
  vue(ax, az, bx, bz) {
    const p = this.p, fx = (ax - this.x0) / p, fz = (az - this.z0) / p, gx = (bx - this.x0) / p, gz = (bz - this.z0) / p;
    let i = Math.floor(fx), j = Math.floor(fz);
    const i1 = Math.floor(gx), j1 = Math.floor(gz), dx = gx - fx, dz = gz - fz, si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1;
    const ddx = dx ? Math.abs(1 / dx) : 1e30, ddz = dz ? Math.abs(1 / dz) : 1e30;
    let tx = dx ? (dx > 0 ? i + 1 - fx : fx - i) * ddx : 1e30, tz = dz ? (dz > 0 ? j + 1 - fz : fz - j) * ddz : 1e30;
    for (let n = Math.abs(i1 - i) + Math.abs(j1 - j) + 1; n > 0; n--) {
      if (this.bloque(i, j)) return false;
      if (tx < tz) { tx += ddx; i += si; } else { tz += ddz; j += sj; }
    }
    return true;
  }
  // les cases autour de qui gêne (evite : { x, z, r }), marquées le temps d'une recherche
  marquer(e) {
    const p = this.p, r = e.r, i0 = Math.max(0, Math.floor((e.x - r - this.x0) / p)), i1 = Math.min(this.nx - 1, Math.floor((e.x + r - this.x0) / p));
    const j0 = Math.max(0, Math.floor((e.z - r - this.z0) / p)), j1 = Math.min(this.nz - 1, Math.floor((e.z + r - this.z0) / p));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const cx = this.x0 + (i + 0.5) * p, cz = this.z0 + (j + 0.5) * p;
      if ((cx - e.x) ** 2 + (cz - e.z) ** 2 < r * r) { const k = j * this.nx + i; this.ev[k] = 1; this.evL.push(k); }
    }
  }
  // le chemin de a à b : une liste de points [x, z] (le premier après a, le dernier b), ou null ; evite : { x, z, r }.
  // Un chemin rendu peut être partagé (le cache) : on ne le modifie pas. D'un coup (les essais) ; dans le jeu, lancer
  // puis avancer, quelques milliers de cases par image (solumatic : chemins)
  chemin(ax, az, bx, bz, evite = null) { let r = this.lancer(ax, az, bx, bz, evite); while (r === undefined) r = this.avancer(1e9); return r; }
  get occupee() { return this.R !== null && this.R !== undefined; }
  // Lance une recherche (une seule à la fois) : rend le chemin s'il est déjà connu (le cache), direct (rien ne gêne) ou
  // impossible (null) ; sinon undefined, et avancer le rendra.
  lancer(ax, az, bx, bz, evite = null) {
    const cle = evite ? null : Math.round(ax * 100) + ',' + Math.round(az * 100) + '>' + Math.round(bx * 100) + ',' + Math.round(bz * 100);
    if (cle) { const c = this.cache.get(cle); if (c !== undefined) return c; }
    if (evite) this.marquer(evite);
    const R = this.R = { ax, az, bx, bz, cle, a: -1, b: -1, bi: 0, bj: 0, T: 0, n: 0 };
    if (this.vue(ax, az, bx, bz)) return this.finir([[bx, bz]]);
    R.a = this.proche(ax, az); R.b = this.proche(bx, bz);
    if (R.a < 0 || R.b < 0) return this.finir(null);
    R.bi = R.b % this.nx; R.bj = (R.b - R.bi) / this.nx; R.T = ++this.tour;
    this.g[R.a] = 0; this.de[R.a] = -1; this.tg[R.a] = R.T; this.tasF[0] = 0; this.tasK[0] = R.a; R.n = 1;
    return undefined;
  }
  // (abandonner la recherche en cours, sans rien retenir)
  abandonner() { if (this.R) this.R.cle = null; this.finir(null); }
  finir(res) {
    const R = this.R; this.R = null;
    for (const k of this.evL) this.ev[k] = 0;
    this.evL.length = 0;
    if (R && R.cle) { if (this.cache.size > 400) this.cache.clear(); this.cache.set(R.cle, res); }
    return res;
  }
  // A* sur la grille, huit voisins, sans couper les coins ; tas binaire dans deux tableaux typés. Fouille au plus max
  // cases ; rend le chemin (ou null) quand c'est fini, undefined sinon.
  avancer(max) {
    const R = this.R; if (!R) return null;
    const nx = this.nx, nz = this.nz, g = this.g, de = this.de, tg = this.tg, tf = this.tf, T = R.T, B = this.b, EV = this.ev, F = this.tasF, K = this.tasK, cap = F.length;
    const b = R.b, bi = R.bi, bj = R.bj;
    let n = R.n, trouve = false;
    // (la distance à vol d'oiseau sur la grille, un peu forcée : on fouille trois fois moins de cases pour un chemin à
    // peine plus long, que le tendu redresse de toute façon)
    const hf = k => { const i = k % nx, di = Math.abs(i - bi), dj = Math.abs((k - i) / nx - bj); return 1.5 * (di > dj ? di + 0.414 * dj : dj + 0.414 * di); };
    const pousser = (k, f) => {
      if (n >= cap) return;
      let i = n++;
      while (i > 0) { const q = (i - 1) >> 1; if (F[q] <= f) break; F[i] = F[q]; K[i] = K[q]; i = q; }
      F[i] = f; K[i] = k;
    };
    while (n > 0 && max-- > 0) {
      const k = K[0], fl = F[--n], kl = K[n];
      // (le dernier remonte à la racine et redescend)
      let i = 0;
      for (;;) { const c1 = 2 * i + 1; if (c1 >= n) break; const c = c1 + 1 < n && F[c1 + 1] < F[c1] ? c1 + 1 : c1; if (F[c] >= fl) break; F[i] = F[c]; K[i] = K[c]; i = c; }
      F[i] = fl; K[i] = kl;
      if (tf[k] === T) continue; tf[k] = T;
      if (k === b) { trouve = true; break; }
      const ci = k % nx, cj = (k - ci) / nx, gk = g[k];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = ci + di, jj = cj + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
        const kk = jj * nx + ii;
        if (B[kk] || EV[kk] || (di && dj && (B[k + di] || EV[k + di] || B[k + dj * nx] || EV[k + dj * nx]))) continue;
        const ng = gk + (di && dj ? 1.414 : 1);
        if (tg[kk] !== T || ng < g[kk]) { tg[kk] = T; g[kk] = ng; de[kk] = k; pousser(kk, ng + hf(kk)); }
      }
    }
    R.n = n;
    if (!trouve) return n > 0 ? undefined : this.finir(null);
    const pts = []; for (let k = b; k !== -1; k = de[k]) { const i = k % nx; pts.push([this.x0 + (i + 0.5) * this.p, this.z0 + ((k - i) / nx + 0.5) * this.p]); }
    pts.reverse(); pts.push([R.bx, R.bz]);
    // tendu : de chaque point, on file en ligne droite jusqu'au plus loin qu'on voit (pas seulement jusqu'au premier qu'on
    // ne voit plus : moins de coudes, on ralentit moins)
    const res = []; let cx = R.ax, cz = R.az, i = 0;
    while (i < pts.length - 1) { let j = i + 1; for (let k = i + 2; k < pts.length; k++) if (this.vue(cx, cz, pts[k][0], pts[k][1])) j = k; res.push(pts[j]); cx = pts[j][0]; cz = pts[j][1]; i = j; }
    return this.finir(res);
  }
}

/* ---------------------------------------------------------------- les horaires
   Teddy (27/11/2026) : « tu mets en place des horaires aussi, y'a toujours Romane qui arrive avant et qui fume devant le
   bureau ». Le bureau est ouvert de l'arrivée de Romane au départ du dernier (outils.js : HORAIRES.solumatic, ouvert), du
   lundi au vendredi. Chacun son heure d'arrivée (de 8 h à 9 h 15) et de départ (de 17 h à 18 h 45), la même d'un jour à
   l'autre à quelques minutes près ; à midi, certains déjeunent à Mars, les autres sortent ; Vanessa, les jours pairs du
   jeu (le mardi 8 et le jeudi 10 décembre), de 9 h 30 à 17 h. Romane arrive la première, vers 7 h 45, et fume devant
   l'entrée jusque vers 8 h 15 ; elle ressort fumer vers 10 h 30 et après le déjeuner. */
const graine = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const HORAIRE = {};
function horaire(e, jour) {
  const cle = e.id + ':' + jour;
  if (HORAIRE[cle]) return HORAIRE[cle];
  const [o, f] = HORAIRES.solumatic, rb = hasard(graine(e.id)), rj = hasard(graine(e.id) ^ Math.imul(jour + 1, 7919)), j = () => (rj() - 0.5) * 8;
  let arrivee = 8 * 60 + rb() * 75 + j(), depart = 17 * 60 + rb() * 105 + j();
  const mars = rb() < 0.55 && !['thomas', 'teddy'].includes(e.id), m0 = 12 * 60 + rb() * 30 + j(), midi = [m0, m0 + (mars ? 40 + rb() * 15 : 55 + rb() * 25)];
  const pauses = [];
  if (e.freelance) { arrivee = 9 * 60 + 30 + j() / 2; depart = 17 * 60 + j() / 2; }
  if (e.id === 'romane') {
    arrivee = 7 * 60 + 45 + j() / 1.6; depart = 17 * 60 + 30 + j(); midi[0] = 12 * 60 + 20 + j() / 2; midi[1] = 13 * 60 + j() / 2;
    pauses.push([arrivee, 8 * 60 + 15 + j() / 2], [10 * 60 + 30 + j(), 10 * 60 + 41 + j()], [midi[1] + 4, midi[1] + 14]);
  }
  return (HORAIRE[cle] = { arrivee: Math.max(o, arrivee), depart: Math.min(f, depart), midi, repas: e.id === 'romane' || mars ? 'mars' : 'dehors', pauses });
}
// où doit être e à la minute m du jeu : 'absent', 'poste' (dedans, à son poste ou ailleurs dans les bureaux), 'repas' (à
// Mars, à table), 'fume' (dehors, devant l'entrée)
function etatVoulu(e, m) {
  const jour = jourDe(m), sem = (jour + 2) % 7; // (le jour 0 est un mardi)
  if (sem === 0 || sem === 6 || !ouvert(m, 'solumatic') || (e.freelance && jour % 2)) return 'absent';
  const H = horaire(e, jour), h = heureDe(m);
  if (h < H.arrivee || h >= H.depart) return 'absent';
  for (const [a, b] of H.pauses) if (h >= a && h < b) return 'fume';
  if (h >= H.midi[0] && h < H.midi[1]) return H.repas === 'mars' ? 'repas' : 'absent';
  return 'poste';
}
// la prochaine arrivée (celle de Romane), en minutes du jeu, à partir de m
function prochaineArrivee(m) {
  const romane = EQ.romane;
  for (let j = jourDe(m), k = 0; k < 8; j++, k++) { const sem = (j + 2) % 7; if (sem === 0 || sem === 6) continue; const a = j * 1440 + horaire(romane, j).arrivee; if (a > m) return a; }
  return m;
}
const heureTxt = m => { const h = Math.floor(m / 60), mi = Math.round(m % 60 / 5) * 5; return mi >= 60 ? `${h + 1} h` : mi ? `${h} h ${String(mi).padStart(2, '0')}` : `${h} h`; };

/* ---------------------------------------------------------------- le jeu
   Entrer et sortir par la porte d'entrée (gestes.js : passer, le fondu au noir au seuil) ; fermée quand il n'y a
   personne (les horaires). Dedans, l'extérieur n'est plus dessiné ni calculé (main.js : isoler), la caméra suit à hauteur
   d'homme, sous le plafond, et les murs la rapprochent (camera.js : interieur). Ceux qui y travaillent sont créés en
   approchant du bâtiment, un toutes les trois images ; ne sont animés que ceux qu'on voit (aucun mur entre la caméra et
   eux), et d'autant moins souvent qu'ils sont loin. Chacun a son poste ; de temps en temps, trois ou quatre au plus s'en
   lèvent : le café de Mars, l'imprimante des moyens généraux, le baby-foot d'Atlas (deux par deux), une réunion à
   Mercure, un collègue à son poste ; ils y vont par les couloirs (la grille de marche), contournent qui est devant eux,
   reviennent et se rassoient. Sur les deux plateaux, on parle au casque, pas tous à la fois. Dedans, on les voit arriver
   par la porte d'entrée et repartir ; dehors, ça se fait hors de la vue, et un saut dans le temps met chacun où il doit
   être. Romane fume devant l'entrée (dehors, elle vit même quand les autres sont cachés). */
const LIBRE = { resoudre: () => false, rangs: () => false }, NUIT_VITRE = new THREE.Color(), VT = new THREE.Vector3(), VT2 = new THREE.Vector3();
// ceux qui parlent au casque ou au téléphone : la part du temps où ils sont en ligne, et combien au plus à la fois par pièce
const APPELS = { support: 0.62, manager: 0.35, formation: 0.72, commerciale: 0.4, freelance: 0.4, partenariats: 0.3, formatrice: 0.2, associe: 0.15, patron: 0.12 };
const CLAVIER = { dev: 1, donnees: 1, devweb: 1, support: 0.6, manager: 0.5, commerciale: 0.4, freelance: 0.4, partenariats: 0.5, formatrice: 0.6, formation: 0.3, associe: 0.4, patron: 0.3 };
// devant l'entrée, là où Romane fume, à côté du cendrier sur pied (monde.js : lieux.solumatic.fumeur, cendrier), tournée
// vers l'est et le parvis
const FUME = { x: SOLU.x1 + 1.9, z: ENTREE.z - 2.0, h: 1.0 };

export class Solumatic {
  // c : { jeu, monde, scene, camera, gestes, hud, ctrl, cam, tel, son, emettre (particules.js : la fumée), regarder(dedans,
  // loin), isoler(oui), garder(objet) : un objet de la scène qui reste quand l'extérieur est retiré } (main.js)
  constructor(c) {
    this.c = c; this.L = c.monde.lieux.solumatic; this.gens = []; this.vu = false; this.n = 0; this.img = 0; this.tc = 0; this.tBulle = 0;
    if (this.L.fumeur) Object.assign(FUME, { x: this.L.fumeur.x, z: this.L.fumeur.z });
    this.P = P; this.V = VIE; this.tAct = 15; this.tVoix = 0; this.mPrec = null; this.tH = 0; this.tFume = 0;
    this.enCreation = null; this.attenteCh = []; this.cherche = null; this.ligneFerme = null;
    const h = c.hud;
    this.etq = { entrer: h.action('Entrer chez Solumatic'), sortir: h.action('Sortir') };
    this.etiquettes = Object.values(this.etq);
    this.porte = c.monde.porteSolu;
    // l'ordre de création : Romane d'abord (dehors, on la voit avant d'entrer), puis le plan
    this.ordre = [...this.L.gens].sort((a, b) => (b.id === 'romane') - (a.id === 'romane'));
    // la balle du baby-foot ; elle et ceux qui y travaillent restent dans la scène quand l'extérieur en est retiré (ils y
    // sont directement : assis, un personnage dont le parent n'est pas la scène serait au volant, anim.js)
    this.balle = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshLambertMaterial({ color: '#f4f4f2' }));
    this.balle.visible = false; c.scene.add(this.balle); c.garder(this.balle);
    this.bf = { s: 0, t: 0, vs: 0.9, vt: 0.4, tBut: 0, tToc: 0 };
    this.rnd = hasard(31);
    this.aiguilles(); this.posteVanessa(); this.eteints();
  }
  /* -- les écrans et les lampes (Teddy, 28/11/2026 : la nuit, le bureau vide restait allumé). L'écran d'un poste s'éteint
     quand son occupant n'est pas dans le bâtiment : un voile sombre posé devant (un seul maillage pour tous ; replié, un
     écran allumé ne se dessine pas). Les lampes s'éteignent quand il n'y a plus personne (modeles.js : UNI.uLampes, des
     veilleuses dans les couloirs) et leurs dalles lumineuses avec ; les blocs de secours restent allumés. Les écrans et
     les dalles sont lus dans le maillage des écrans (panneauxSolumatic : quatre sommets par panneau, dans l'ordre) :
     chaque écran de bureau va au poste qu'il regarde. */
  eteints() {
    const it = this.c.monde.interieurSolu, ecr = it.children.find(o => o.name === 'écrans Solumatic'), aff = it.children.find(o => o.name === 'affiches Solumatic');
    // (les matières éclairées dedans prennent l'interrupteur des lampes ; les autres le liraient à zéro)
    for (const m of [aff && aff.material, this.balle.material, this.aig.material]) if (m) { m.onBeforeCompile = sh => { sh.uniforms.uLampes = UNI.uLampes; }; m.needsUpdate = true; }
    this.lum = 1; this.ecransDe = {}; this.voileOk = false;
    if (!ecr) return;
    const P = ecr.geometry.attributes.position.array, U = ecr.geometry.attributes.uv.array, nq = P.length / 12, postes = Object.entries(VIE.postes).map(([id, q]) => ({ id, x: q.x + Math.sin(q.h) * 0.75, z: q.z + Math.cos(q.h) * 0.75, px: q.x, pz: q.z }));
    // la case de la texture d'un panneau (CASES), d'après ses coordonnées de texture : ce qu'il montre
    const zoneDe = i => { const u = (U[i * 8] + U[i * 8 + 6]) / 2 * TEX_L, v = (1 - (U[i * 8 + 1] + U[i * 8 + 7]) / 2) * TEX_H; for (const k in CASES) { const [x, y, w, h] = CASES[k]; if (u > x && u < x + w && v > y && v < y + h) return k; } return null; };
    const COMMUNS = new Set(['tele', 'appels', 'bienvenue', 'teleMercure', 'enFormation']);
    const E = [], D = [];
    for (let i = 0; i < nq; i++) {
      const o = i * 12, cx = (P[o] + P[o + 3] + P[o + 6] + P[o + 9]) / 4, cy = (P[o + 1] + P[o + 4] + P[o + 7] + P[o + 10]) / 4, cz = (P[o + 2] + P[o + 5] + P[o + 8] + P[o + 11]) / 4;
      // la face avant : (v2 - v0) x (v1 - v0) (PlaneGeometry)
      const ax = P[o + 6] - P[o], ay = P[o + 7] - P[o + 1], az = P[o + 8] - P[o + 2], bx = P[o + 3] - P[o], by = P[o + 4] - P[o + 1], bz = P[o + 5] - P[o + 2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const zone = zoneDe(i);
      if (zone === 'led') { D.push([o, nx, ny, nz]); continue; } // une dalle lumineuse du faux plafond : avec les lampes
      if (COMMUNS.has(zone)) { D.push([o, nx, ny, nz]); continue; } // les télés, la file d'appels, l'accueil : éteints avec les lampes
      if (zone === 'baes' || zone === 'horloge' || cy < 0.7 || cy > 1.45 || Math.abs(ny) > 0.3) continue; // (les blocs de secours restent allumés)
      let best = null, bd = 0.95;
      for (const q of postes) { const d = Math.hypot(cx - q.x, cz - q.z); if (d < bd && (q.px - cx) * nx + (q.pz - cz) * nz > 0) { bd = d; best = q; } }
      if (best) E.push([o, nx, ny, nz, best.id]);
    }
    // un maillage de voiles : les quadrilatères, avancés de 2 mm devant leur panneau
    const voile = (L, couleur, nom) => {
      const pos = new Float32Array(L.length * 12), idx = [];
      L.forEach(([o, nx, ny, nz], k) => { for (let v = 0; v < 4; v++) { pos[k * 12 + v * 3] = P[o + v * 3] + nx * 0.002; pos[k * 12 + v * 3 + 1] = P[o + v * 3 + 1] + ny * 0.002; pos[k * 12 + v * 3 + 2] = P[o + v * 3 + 2] + nz * 0.002; } idx.push(k * 4, k * 4 + 2, k * 4 + 1, k * 4 + 2, k * 4 + 3, k * 4 + 1); });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: couleur, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
      m.name = nom; m.matrixAutoUpdate = false; m.frustumCulled = false; m.userData.vrai = pos; it.add(m); return m;
    };
    // (le voile des dalles et des écrans communs : une dalle éteinte, gris bleuté dans la pénombre ; l'écran, presque noir)
    this.voileE = voile(E, '#0c0f14', 'écrans éteints'); this.voileD = voile(D, '#22252b', 'dalles et télés éteintes');
    this.voileD.visible = false;
    E.forEach((e, k) => (this.ecransDe[e[4]] = this.ecransDe[e[4]] || []).push(k));
    this.allumes = {}; // (l'écran de chacun, allumé ou non : refait seulement quand ça change)
  }
  // les écrans de qui est là s'allument (leur voile replié), les autres s'éteignent ; les lampes, s'il y a quelqu'un
  majEcrans() {
    if (!this.voileE) return;
    const pos = this.voileE.geometry.attributes.position, A = pos.array, V = this.voileE.userData.vrai;
    let change = false;
    for (const g of this.gens) {
      const la = g.etat === 'poste' || g.etat === 'repas', Q = this.ecransDe[g.id];
      if (!Q || this.allumes[g.id] === la) continue;
      this.allumes[g.id] = la; change = true;
      for (const k of Q) for (let v = 0; v < 4; v++) for (let c = 0; c < 3; c++) A[k * 12 + v * 3 + c] = la ? V[k * 12 + c] : V[k * 12 + v * 3 + c];
    }
    if (change) pos.needsUpdate = true;
  }
  get grille() { return this._g || (this._g = new Grille(VIE.boites, VIE.tournees)); }
  // (essais) une grille de marche faite d'autres boîtes (tout ce qui arrête dans le bâtiment : collisions.js), les bords
  grilleDe(boites, tournees, marge, pas) { return new Grille(boites, tournees, marge, pas); }
  get bords() { return SOLU; }
  // le chemin d'un point à un autre (essais : marge, la largeur de qui marche ; pas, la finesse de la grille)
  chemin(ax, az, bx, bz, marge, pas) { if (marge == null) return this.grille.chemin(ax, az, bx, bz); const k = marge + ':' + pas; this._gs = this._gs || {}; return (this._gs[k] = this._gs[k] || new Grille(VIE.boites, VIE.tournees, marge, pas)).chemin(ax, az, bx, bz); }

  /* -- les aiguilles des horloges (elles marquent l'heure du jeu) ; le portable de Vanessa, ouvert ou fermé */
  aiguilles() {
    const n = VIE.horloges.length * 2, g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0.5);
    this.aig = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: '#1d1f24' }), n); this.aig.name = 'aiguilles'; this.aig.frustumCulled = false;
    this.c.monde.interieurSolu.add(this.aig); this.mAig = -1;
  }
  majAiguilles() {
    const m = Math.floor(this.c.jeu.minutes); if (m === this.mAig) return; this.mAig = m;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), Sc = new THREE.Vector3(), Pv = new THREE.Vector3(), hm = heureDe(m);
    VIE.horloges.forEach((o, i) => {
      for (let k = 0; k < 2; k++) {
        const a = k ? (hm % 60) / 60 * Math.PI * 2 : (hm % 720) / 720 * Math.PI * 2, l = o.k * (k ? 0.42 : 0.28);
        E.set(0, o.h, -a, 'YXZ'); Q.setFromEuler(E); Sc.set(k ? 0.008 : 0.012, l, 0.004); Pv.set(o.x + Math.sin(o.h) * (0.003 + k * 0.004), o.y, o.z + Math.cos(o.h) * (0.003 + k * 0.004));
        this.aig.setMatrixAt(i * 2 + k, M.compose(Pv, Q, Sc));
      }
    });
    this.aig.instanceMatrix.needsUpdate = true;
  }
  posteVanessa() {
    const v = VIE.vanessa, it = this.c.monde.interieurSolu; if (!v) return;
    const r = R2(v.x, v.z, v.h), hp = v.h + 0.15, [lx, lz] = r(0, 0.45), rl = R2(lx, lz, hp);
    const mk = (liste, nom) => { const m = new THREE.Mesh(fusion(liste), it.material); m.name = nom; m.matrixAutoUpdate = false; it.add(m); return m; };
    const chaise = lz_ => { const [x, z] = r(0, lz_), [dx, dz] = R2(x, z, v.h)(0, -0.25); return [B(0.5, 0.07, 0.48, TISSU[3], x, 0.47, z, v.h), B(0.46, 0.52, 0.06, TISSU[3], dx, 0.86, dz, v.h), C(0.024, 0.024, 0.34, 6, '#9aa0a6', x, 0.27, z), C(0.28, 0.28, 0.04, 5, NOIR, x, 0.07, z)]; };
    // là : le portable ouvert (Le bureau à l'écran), son mug, sa chaise reculée ; pas là : le portable fermé, la chaise
    // rangée sous le bureau
    const [ax, az] = rl(0, 0.12), [mx, mz] = r(-0.45, 0.35);
    this.vLa = mk([B(0.34, 0.016, 0.24, '#c9ccd0', lx, 0.748, lz, hp), B(0.34, 0.23, 0.012, '#c9ccd0', ax, 0.87, az, hp), C(0.04, 0.036, 0.095, 10, '#e0b13a', mx, 0.79, mz), ...chaise(-0.1)], 'poste de Vanessa (là)');
    const [ex, ez] = rl(0, 0.113), g = new THREE.PlaneGeometry(0.31, 0.2), uv = g.attributes.uv, [px, py, pw, ph] = CASES.crm;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (px + uv.getX(i) * pw) / TEX_L, 1 - (py + (1 - uv.getY(i)) * ph) / TEX_H);
    g.rotateY(hp + Math.PI); g.translate(ex, 0.875, ez);
    const ecr = it.children.find(o => o.name === 'écrans Solumatic');
    this.vEcran = new THREE.Mesh(g, ecr ? ecr.material : new THREE.MeshBasicMaterial()); this.vEcran.matrixAutoUpdate = false; this.vEcran.name = 'écran de Vanessa'; it.add(this.vEcran);
    this.vPas = mk([B(0.34, 0.03, 0.24, '#c9ccd0', lx, 0.755, lz, hp), ...chaise(0.2)], 'poste de Vanessa (pas là)');
    this.vPas.visible = false;
  }

  pres(p, d) { const j = this.c.jeu.joueur.pos; return Math.hypot(j.x - p.x, j.z - p.z) < d; }
  get dedans() { return this.c.jeu.dedans === 'solumatic'; }
  get porteDehors() { const j = this.c.jeu; return !j.dedans && !j.auVolant && this.pres(this.L.dehors, 2.4); }
  get porteDedans() { return this.dedans && this.pres(this.L.dedans, 1.6); }
  // la porte s'ouvre s'il y a quelqu'un (ou si Romane est déjà là, dehors, à fumer)
  get ouverte() { const m = this.c.jeu.minutes; return EQUIPE.some(e => etatVoulu(e, m) !== 'absent'); }
  get quand() { const m = this.c.jeu.minutes, a = prochaineArrivee(m), ja = jourDe(a), j = jourDe(m); return (ja === j ? 'à ' : ja === j + 1 ? 'demain à ' : dateJeu(ja, 'semaine') + ' à ') + heureTxt(heureDe(a)); }
  agir() {
    if (this.porteDedans) { this.passer(false); return true; }
    if (this.porteDehors) {
      if (this.ouverte) { this.taireFerme(); this.passer(true); }
      else if (!this.ligneFerme) {
        // (gardée, pour la taire si la porte s'ouvre pendant qu'on la lit ; une seule à la fois)
        const H = this.c.hud; H.dire([{ qui: '', txt: TXT.ferme(this.quand) }]); this.ligneFerme = H.file.length ? H.file[H.file.length - 1] : H.ligne;
      }
      return true;
    }
    return false;
  }
  taireFerme() {
    const H = this.c.hud, l = this.ligneFerme; this.ligneFerme = null;
    if (!l) return;
    if (H.ligne === l) H.tLigne = Math.min(H.tLigne, 0.15); else { const i = H.file.indexOf(l); if (i >= 0) H.file.splice(i, 1); }
  }
  passer(entrer) {
    const c = this.c;
    c.ctrl.relacher();
    if (entrer) { while (this.n < this.ordre.length) this.creer(); this.horaires(true); }
    this.oublierChemins();
    // la porte fermée arrête (on n'entre pas sans la passer) ; le temps de la passer, plus
    const pc = this.L.colPorte;
    if (pc) pc.fantome = true;
    c.gestes.passer(this.L, entrer, {
      fondu: noir => $('fondu').classList.toggle('noir', noir),
      passe: () => {
        c.jeu.dedans = entrer ? 'solumatic' : false; c.regarder(entrer, 52); c.isoler(entrer);
        c.cam.pret = false; c.cam.yaw = entrer ? OUEST : EST; this.voir();
        if (!entrer) c.jeu.joueur.m.groupe.visible = true;
      },
      fin: () => { if (pc) pc.fantome = false; },
    });
  }
  // le toit, ou l'intérieur (dedans, ou porte ouverte : par l'embrasure, on voit l'entrée) ; derrière les vitres, le jour
  // (un ciel clair) ou la nuit ; qui se voit (dedans : ceux qui sont là ; dehors : Romane, si elle fume)
  voir() {
    this.c.monde.vitresSolu.material.color.set('#d9e6ef').lerp(NUIT_VITRE.set('#1c2536'), UNI.uNuit.value);
    const m = this.c.monde, d = this.dedans;
    m.toitSolu.visible = !d;
    m.interieurSolu.visible = d || this.porte.rotation.y > 0.01;
    for (const g of this.gens) g.p.m.groupe.visible = g.mode !== 'cache' && (g.dehors ? !d : d);
    if (this.vLa) { const la = this.gens.some(g => g.id === 'vanessa' && g.etat !== 'absent'); this.vLa.visible = this.vEcran.visible = la; this.vPas.visible = !la; }
  }
  // Une personne de plus (dans l'ordre : Romane d'abord) ; son apparence, tirée d'après son nom (textes.js : EQUIPE). En
  // approchant, une étape par image (perso.js : persoPas, neuf étapes de 0,25 ms en moyenne) ; d'un coup (fini) en entrant.
  // Rend vrai quand la personne est là.
  creer(fini = true) {
    if (!this.enCreation) {
      const s = this.ordre[this.n], e = EQ[s.id], ra = hasard(graine(e.id) ^ 0x502e); // (le sel : onze coiffures, treize teints)
      const a = tirerApparence(ra, { femme: e.silhouette === 'femme', actif: true, couvreChef: false, chapeau: null });
      // le casque-micro sur les deux plateaux ; le badge au cordon orange, pour tout le monde (perso.js)
      const o = { ...a, tenue: e.tenue, haut: e.haut, bas: e.bas, casque: ['support', 'manager', 'formation'].includes(e.role), badge: ORANGE };
      for (const k of ['col', 'lunettes', 'tissuBas', 'coiffure']) if (e[k] !== undefined) o[k] = e[k];
      if (o.lunettes && !o.lunettesC) o.lunettesC = '#2b2d31';
      this.enCreation = { s, e, o, it: persoPas(o) };
    }
    const C = this.enCreation;
    let r = C.it.next();
    while (fini && !r.done) r = C.it.next();
    if (!r.done) return false;
    this.enCreation = null;
    const { s, e, o } = C, p = new Pieton(r.value);
    const g = { p, s, e, id: e.id, role: e.role, etq: this.c.hud.etiquette('', 'bulle'), tParle: 0, i: this.n, ph: this.n * 1.7, t: this.rnd() * 8, vu: true, dtA: 0,
      mode: 'cache', etat: 'absent', dehors: false, casque: o.casque, home: { x: s.x, z: s.z, h: s.h, clavier: s.clavier, lever: VIE.postes[e.id].lever }, tApp: 5 + this.rnd() * 20, parle: false,
      siege: null, tache: null, trajet: null, tr: null, ecran: -1 };
    p.m.groupe.visible = false; this.c.scene.add(p.m.groupe); this.c.garder(p.m.groupe); this.gens.push(g); this.n++;
    if (e.id === 'romane') this.romane = g;
    this.placerSelon(g, etatVoulu(e, this.c.jeu.minutes));
    return true;
  }

  /* -- les poses : assis (à son poste, à table, en réunion), debout quelque part, caché (pas là) ; marcher. S'asseoir et
     se lever se jouent (0,6 s, anim.js : poseTransition) quand on les voit ; d'un coup sinon (un saut dans le temps, hors
     de la vue). Teddy (28/11/2026) : debout à côté de sa chaise, on « sautait » dessus. */
  // devant un siège : où l'on se tient avant de s'asseoir, et en se relevant (l'assise est derrière les mollets)
  devant(l) { return { x: l.x + Math.sin(l.h) * 0.14, z: l.z + Math.cos(l.h) * 0.14 }; }
  // où l'on passe pour aller s'asseoir et en revenant : à côté de la chaise de préférence (de derrière, on la traverserait)
  cote(l) { const L = l.lever || []; for (const q of [L[1], L[2], L[0]]) if (q && this.grille.libre(q[0], q[1])) return q; return null; }
  // la voit-on faire ? (dedans, devant la caméra)
  doux(g) { return this.dedans && !g.dehors && g.vu && g.p.m.groupe.visible; }
  asseoir(g, l, doux = false) {
    const p = g.p, grp = p.m.groupe;
    p.clavier = !!l.clavier; p.regard = l.regard || null; p.parle = false; p.outil = null; p.fume = false; p.assis = true;
    g.siege = l; g.dehors = false;
    if (doux && this.doux(g)) {
      // on se tourne vers le bureau (ou la table), puis on se baisse en reculant sur l'assise
      g.tr = { u: 0, d: 0.65, leve: false, x0: p.pos.x, z0: p.pos.z, h0: p.hv, x1: l.x, z1: l.z, h1: l.h, y: p.pos.y, suite: null };
      p.transition = 0; grp.position.set(p.pos.x, p.pos.y, p.pos.z); grp.rotation.y = p.hv; g.mode = 'assoit';
      this.montrer(g); return;
    }
    g.tr = null; p.transition = null;
    grp.position.set(l.x, 0, l.z); grp.rotation.y = l.h; p.h = p.hv = l.h; p.sync(0, 0); p.pos.copy(grp.position);
    g.mode = 'assis'; this.montrer(g);
  }
  // se lever de son siège (en se redressant, un pas en avant, 0,6 s ; d'un coup si on ne le voit pas), puis suite()
  lever(g, suite) {
    const p = g.p, grp = p.m.groupe, l = g.siege || { x: grp.position.x, z: grp.position.z, h: grp.rotation.y }, d = this.devant(l);
    p.clavier = false; p.parle = false; p.regard = null;
    if (this.doux(g) && g.mode === 'assis') {
      g.tr = { u: 0, d: 0.6, leve: true, x0: grp.position.x, z0: grp.position.z, h0: grp.rotation.y, x1: d.x, z1: d.z, h1: grp.rotation.y, y: grp.position.y, suite };
      p.transition = 1; g.mode = 'leve'; return;
    }
    p.assis = false; p.transition = null; g.tr = null; g.siege = null;
    p.placer(d.x, d.z, l.h); suite();
  }
  // une image de la transition (vivre) ; à la fin, assis, ou debout et la suite
  transition(g, dt, t) {
    const p = g.p, T = g.tr, grp = p.m.groupe;
    T.u = Math.min(1, T.u + dt / T.d);
    if (T.leve) {
      // le buste se redresse, le corps passe au-dessus des pieds
      const kp = lisse((T.u - 0.2) / 0.8);
      grp.position.set(T.x0 + (T.x1 - T.x0) * kp, T.y, T.z0 + (T.z1 - T.z0) * kp);
      p.transition = 1 - lisse(T.u);
    } else {
      const kr = lisse(T.u / 0.55), kp = lisse((T.u - 0.25) / 0.75);
      grp.position.set(T.x0 + (T.x1 - T.x0) * kp, T.y, T.z0 + (T.z1 - T.z0) * kp); grp.rotation.y = T.h0 + angle(T.h1 - T.h0) * kr;
      p.transition = lisse((T.u - 0.15) / 0.85);
    }
    p.h = p.hv = grp.rotation.y; p.pos.set(grp.position.x, grp.position.y, grp.position.z);
    p.sync(dt, t + g.ph);
    if (T.u < 1) return;
    g.tr = null; p.transition = null;
    if (T.leve) { p.assis = false; g.siege = null; p.v = 0; p.vr = 0; g.mode = 'debout'; if (T.suite) T.suite(); }
    else { grp.position.set(T.x1, 0, T.z1); grp.rotation.y = T.h1; p.h = p.hv = T.h1; p.pos.copy(grp.position); g.mode = 'assis'; }
  }
  // debout à un lieu ; doux : arrivé en marchant, on s'y tourne (sans sauter d'un coup vers son cap)
  debout(g, l, dehors = false, doux = false) {
    const p = g.p; p.assis = false; p.clavier = false; p.parle = false; p.outil = null; p.transition = null; g.tr = null;
    if (doux) { p.h = l.h; p.v = 0; p.vr = 0; p.acc = 0; } else p.placer(l.x, l.z, l.h);
    p.regard = l.regard || null; g.mode = 'debout'; g.siege = null; g.dehors = dehors; this.montrer(g);
  }
  cacher(g) { const p = g.p; p.assis = false; p.parle = false; p.fume = false; p.outil = null; p.transition = null; g.tr = null; g.mode = 'cache'; g.siege = null; g.dehors = false; g.tache = null; g.trajet = null; this.montrer(g); if (this.reserve) for (const k in this.reserve) if (this.reserve[k] === g) delete this.reserve[k]; }
  montrer(g) { g.p.m.groupe.visible = g.mode !== 'cache' && (g.dehors ? !this.dedans : this.dedans); g.p.fume = g.dehors && g.mode === 'debout'; }
  // Marcher jusqu'à (x, z), puis fin (un dernier pas : devant un siège) s'il y en a un ; apres() une fois arrivé. Assis,
  // on se lève d'abord, puis on passe à côté de sa chaise. Le chemin est demandé tout de suite (chemins : il arrive en
  // une ou quelques images ; on attend debout).
  marcher(g, x, z, apres, fin = null) {
    const p = g.p;
    if (g.mode === 'cache') return;
    const T_ = g.trajet = { ch: null, k: 0, x, z, apres, fin, prem: null, ax: p.pos.x, az: p.pos.z, evite: null, attente: 0, tRefait: 0 };
    p.regard = null;
    if (g.mode === 'assis' || g.mode === 'assoit' || g.mode === 'leve') {
      const l = g.siege || g.home, q = this.cote(l), d = this.devant(l);
      if (q) { T_.prem = q; T_.ax = q[0]; T_.az = q[1]; } else { T_.ax = d.x; T_.az = d.z; }
      if (g.mode === 'assoit') { g.tr = null; g.mode = 'assis'; }
      if (g.mode === 'assis') this.lever(g, () => { if (g.trajet) g.mode = 'marche'; });
    } else { g.mode = 'marche'; p.transition = null; g.tr = null; }
    this.demander(g);
  }
  // aller à un lieu (assis ou debout), puis y rester t secondes, puis fin()
  aller(g, l, assis, t, fin, type) {
    g.tache = { type, t, fin, l, arrive: false };
    if (assis) {
      const q = this.cote(l) || [l.x, l.z], d = this.devant(l);
      this.marcher(g, q[0], q[1], () => { this.asseoir(g, l, true); if (g.tache) g.tache.arrive = true; }, [d.x, d.z]);
    } else this.marcher(g, l.x, l.z, () => { this.debout(g, l, false, true); if (g.tache) g.tache.arrive = true; });
  }
  // rentrer à son poste et s'y rasseoir
  rentrer(g) { g.tache = null; this.aller(g, g.home, true, 0, null, 'rentrer'); g.tache = null; }

  /* -- les chemins demandés (marcher, contourner) : une recherche à la fois, au plus 2 500 cases fouillées par image (un
     chemin à travers le bâtiment en fouille de quelques centaines à 15 000 : 0,3 ms en moyenne, jusqu'à 1,4 ms d'un
     coup) ; un chemin déjà connu (le cache de la grille : les allers et retours) est rendu tout de suite. */
  demander(g) { if (!this.attenteCh.includes(g)) this.attenteCh.push(g); }
  chemins() {
    const G = this.grille;
    for (let n = 0; n < 6; n++) {
      if (!this.cherche) {
        const g = this.attenteCh.shift(); if (!g) return;
        const T_ = g.trajet; if (!T_ || (T_.ch && !T_.evite) || g.mode === 'cache') continue;
        const r = G.lancer(T_.ax, T_.az, T_.x, T_.z, T_.evite);
        if (r === undefined) this.cherche = { g, T_, R: G.R };
        else { this.livrer(g, T_, r); continue; }
      }
      const C = this.cherche;
      if (G.R !== C.R) { this.cherche = null; this.attenteCh.unshift(C.g); continue; } // (une recherche d'essai l'a remplacée)
      const r = G.avancer(2500);
      if (r === undefined) return;
      this.cherche = null; this.livrer(C.g, C.T_, r);
      return;
    }
  }
  livrer(g, T_, r) {
    if (g.trajet !== T_) return; // (il a changé d'avis entre-temps)
    const contourne = !!T_.evite; T_.evite = null;
    if (!r) {
      if (contourne) return; // (pas de détour : il attend que ça passe)
      // pas de chemin (rare) : il y est d'un coup, quand on ne regarde pas
      g.p.placer(T_.fin ? T_.fin[0] : T_.x, T_.fin ? T_.fin[1] : T_.z, g.p.h); g.trajet = null; g.mode = 'debout'; T_.apres(); return;
    }
    const ch = T_.prem || T_.fin ? [] : r;
    if (ch !== r) { if (T_.prem) ch.push(T_.prem); ch.push(...r); if (T_.fin) ch.push(T_.fin); }
    T_.prem = null; T_.ch = ch; T_.k = 0; T_.attente = 0;
  }
  // (une recherche en cours abandonnée : on entre ou l'on sort)
  oublierChemins() { if (this.cherche && this.grille.R === this.cherche.R) this.grille.abandonner(); this.cherche = null; this.attenteCh.length = 0; }
  // pose selon l'état, d'un coup (un saut dans le temps, ou dehors : hors de la vue)
  placerSelon(g, etat) {
    this.liberer(g); g.etat = etat; g.tache = null; g.trajet = null; g.tr = null; g.p.transition = null;
    if (etat === 'absent') this.cacher(g);
    else if (etat === 'fume') this.debout(g, FUME, true);
    else if (etat === 'repas') { const l = this.prendre('repas', VIE.repas, g); if (l) { this.asseoir(g, l); g.tache = { type: 'repas', t: 1e9, l, arrive: true }; } else this.asseoir(g, g.home); }
    else this.asseoir(g, g.home);
  }
  // les places réservées (une personne à la fois : une chaise de Mars, de Mercure, un coin du baby-foot, l'imprimante...)
  prendre(cle, liste, g) { this.reserve = this.reserve || {}; for (let i = 0; i < liste.length; i++) { const k = cle + i; if (!this.reserve[k]) { this.reserve[k] = g; return liste[i]; } } return null; }
  liberer(g) { if (this.reserve) for (const k in this.reserve) if (this.reserve[k] === g) delete this.reserve[k]; if (this.visite && (this.visite.a === g || this.visite.b === g)) { this.visite.b.p.regard = null; this.visite = null; } if (g.p.outil) g.p.outil = null; }

  /* -- les horaires : chacun là où il doit être ; dedans, sans saut dans le temps, on les voit arriver et repartir */
  horaires(sauter = false) {
    const m = this.c.jeu.minutes, nat = !sauter && this.dedans && this.mPrec != null && m - this.mPrec >= 0 && m - this.mPrec < 3;
    this.mPrec = m;
    for (const g of this.gens) {
      const v = etatVoulu(g.e, m);
      if (sauter && g.tache && g.tache.type === 'sortir') { this.placerSelon(g, v); continue; } // (on revient : il est parti)
      if (v === g.etat) continue;
      const avant = g.etat, entre = avant === 'absent' || avant === 'fume', sort = v === 'absent' || v === 'fume';
      // dehors, ou un saut dans le temps : d'un coup, hors de la vue
      if (!nat || (entre && sort)) { this.placerSelon(g, v); continue; }
      this.liberer(g); g.etat = v; g.tache = null;
      if (entre) {
        // il arrive : de la porte d'entrée à son poste (ou à table)
        this.debout(g, VIE.entree);
        const l = v === 'repas' && this.prendre('repas', VIE.repas, g);
        if (l) this.aller(g, l, true, 1e9, null, 'repas'); else this.rentrer(g);
      } else if (sort) {
        // il s'en va : jusqu'à la porte, puis plus là (ou dehors, fumer)
        g.tache = { type: 'sortir', t: 0, arrive: false };
        this.marcher(g, VIE.entree.x, VIE.entree.z, () => { g.tache = null; if (v === 'fume') this.debout(g, FUME, true); else this.cacher(g); });
      } else if (v === 'repas') { const l = this.prendre('repas', VIE.repas, g); if (l) this.aller(g, l, true, 1e9, null, 'repas'); }
      else this.rentrer(g);
    }
    this.voir(); this.majEcrans();
  }

  /* -- la vie : qui part de son poste, pour faire quoi (trois ou quatre au plus loin de leur poste) */
  planifier(dt) {
    this.tAct -= dt; if (this.tAct > 0) return;
    this.tAct = 6 + this.rnd() * 10;
    const loin = this.gens.filter(g => g.tache && g.tache.type !== 'repas' || g.mode === 'marche').length;
    if (loin >= 3) return;
    const libres = this.gens.filter(g => g.etat === 'poste' && g.mode === 'assis' && g.siege === g.home && !g.tache && !g.parle && (!['support', 'formation'].includes(g.role) || this.rnd() < 0.35));
    if (!libres.length) return;
    const pk = () => libres.splice(Math.floor(this.rnd() * libres.length), 1)[0], x = this.rnd();
    if (x < 0.3) { const g = pk(), l = this.prendre('cafe', VIE.cafe, g); if (l) this.aller(g, l, false, 22 + this.rnd() * 25, () => this.rentrer(g), 'cafe'); }
    else if (x < 0.48) { const g = pk(), l = this.prendre('imprimante', VIE.imprimante, g); if (l) this.aller(g, l, false, 8 + this.rnd() * 12, () => this.rentrer(g), 'imprimante'); }
    else if (x < 0.66 && libres.length >= 2 && !this.joueursBF) {
      const a = pk(), b = pk(), fin = () => { this.joueursBF = null; for (const g of [a, b]) { g.p.outil = null; g.mains = null; if (g.tache && g.tache.type === 'babyfoot') this.rentrer(g); } };
      this.joueursBF = [a, b]; const t = 60 + this.rnd() * 50;
      VIE.babyfoot.cotes.forEach((l, i) => this.aller([a, b][i], { ...l, regard: { x: VIE.babyfoot.x, y: 0.8, z: VIE.babyfoot.z } }, false, t, fin, 'babyfoot'));
    } else if (x < 0.8 && libres.length >= 2 && loin <= 1) {
      const n = 2 + (this.rnd() < 0.5 && libres.length > 2 ? 1 : 0), qui = [], t = 70 + this.rnd() * 70;
      for (let i = 0; i < n; i++) qui.push(pk());
      for (const g of qui) { const l = this.prendre('reunion', VIE.reunion, g); if (l) this.aller(g, l, true, t, () => { this.liberer(g); this.rentrer(g); }, 'reunion'); }
    } else {
      const a = pk(), b = this.gens.filter(g => g !== a && g.etat === 'poste' && g.mode === 'assis' && g.siege === g.home && !g.tache)[0 | this.rnd() * 6];
      const V_ = b && VIE.postes[b.id], spot = V_ && V_.visite.find(([vx, vz]) => this.grille.libre(vx, vz));
      if (spot && !this.visite) { this.visite = { a, b }; this.aller(a, { x: spot[0], z: spot[1], h: spot[2] }, false, 14 + this.rnd() * 16, () => { if (this.visite) { this.visite.b.p.regard = null; this.visite = null; } this.rentrer(a); }, 'visite'); }
    }
  }
  // au casque ou au téléphone : chacun ses appels, pas tous à la fois (sur un plateau, deux sur trois au plus)
  appels(dt) {
    for (const g of this.gens) {
      const k = APPELS[g.role]; if (!k) continue;
      g.tApp -= dt;
      const aSonPoste = g.mode === 'assis' && g.siege === g.home && !g.tache;
      if (g.parle && (!aSonPoste || g.tApp <= 0)) { g.parle = false; g.tApp = (1 - k) * (20 + this.rnd() * 40); }
      else if (!g.parle && aSonPoste && g.tApp <= 0) {
        const piece = g.e.piece; let enLigne = 0, tous = 0;
        for (const o of this.gens) if (o.e.piece === piece) { if (o.parle) enLigne++; if (o.etat === 'poste') tous++; }
        if (enLigne < Math.max(1, Math.ceil(tous * 0.67))) { g.parle = true; g.tApp = k * (25 + this.rnd() * 50); if (this.dedans && g.vu && ['support', 'manager'].includes(g.role)) this.c.son.tonalite?.(this.prox(g, 10)); }
        else g.tApp = 4 + this.rnd() * 6;
      }
      g.p.parle = g.parle || (g.tache && g.tache.arrive && ['reunion', 'repas', 'visite', 'cafe'].includes(g.tache.type) && Math.sin(this.c.jeu.minutes * 3 + g.ph) > 0.3);
    }
  }
  prox(g, d) { const j = this.c.jeu.joueur.pos, q = g.p.assis ? g.p.m.groupe.position : g.p.pos; return Math.max(0, 1 - Math.hypot(j.x - q.x, j.z - q.z) / d); }

  // les étiquettes de la porte ; dehors, en approchant, ceux qui y travaillent sont créés, Romane vit devant l'entrée ;
  // dedans, ils vivent. Rend vrai si une étiquette est proposée
  maj(dt, t) {
    const c = this.c, libre = !c.tel.ouvert && !c.gestes.actif, h = c.hud, L = this.L;
    const dehors = libre && this.porteDehors, dedans = libre && this.porteDedans;
    if (dehors) h.libeller(this.etq.entrer, this.ouverte ? 'Entrer chez Solumatic' : TXT.etiquetteFerme(this.quand));
    h.placer(this.etq.entrer, L.seuil.x + 0.3, 2.6, L.seuil.z, dehors);
    h.placer(this.etq.sortir, L.seuil.x - 0.5, 2.3, L.seuil.z, dedans);
    const vu = this.dedans || this.porte.rotation.y > 0.01;
    if (vu !== this.vu) { this.vu = vu; this.voir(); }
    if ((this.tH -= dt) <= 0) { this.tH = 0.5; this.horaires(); }
    // les lampes : allumées tant que quelqu'un est dans le bâtiment (le dernier les éteint en partant), en une demi-seconde
    let la = 0; for (const g of this.gens) if (g.mode !== 'cache' && !g.dehors) { la = 1; break; }
    if (this.lum !== la) { this.lum = Math.abs(la - this.lum) < 0.02 ? la : this.lum + (la - this.lum) * Math.min(1, dt * 5); UNI.uLampes.value = this.lum; if (this.voileD) this.voileD.visible = this.lum < 0.5; }
    if (this.dedans && this.img % 60 === 0) this.voir(); // (la nuit qui tombe, derrière les vitres)
    // la porte s'est ouverte (Romane est arrivée, elle a la clé) : le « fermé » qu'on venait d'entendre n'a plus cours
    if (this.ligneFerme) { if (h.ligne !== this.ligneFerme && !h.file.includes(this.ligneFerme)) this.ligneFerme = null; else if (this.ouverte) this.taireFerme(); }
    if (!this.dedans) {
      // (un personnage coûte 2 ms à créer, 8 à 10 sur un téléphone lent : une étape par image, neuf par personne, en
      // approchant à moins de 60 m ; persoPas)
      const e = c.jeu.auVolant ? c.jeu.tr.pos : c.jeu.joueur.pos;
      if (this.n < this.ordre.length && Math.hypot(e.x - (SOLU.x0 + SOLU.x1) / 2, e.z - (SOLU.z0 + SOLU.z1) / 2) < 60) this.creer(false);
      this.fumer(dt, t);
      return dehors || dedans;
    }
    this.majAiguilles();
    this.vivre(dt, t);
    return dehors || dedans;
  }
  // Romane devant l'entrée : elle fume, regarde qui passe, le salue ; la fumée (un filet au bout de la cigarette, une
  // bouffée de temps en temps)
  fumer(dt, t) {
    const g = this.romane; if (!g || !g.dehors || g.mode !== 'debout') { if (g) this.c.hud.placer(g.etq, 0, 0, 0, false); return; }
    const c = this.c, p = g.p, cam = c.camera.position, dc = Math.hypot(cam.x - p.pos.x, cam.z - p.pos.z);
    if (dc > 90) return;
    const j = c.jeu.auVolant ? c.jeu.tr.pos : c.jeu.joueur.pos, d = Math.hypot(j.x - p.pos.x, j.z - p.pos.z);
    p.regard = d < 7 ? this.vers(g, j.x, 1.6, j.z) : null;
    g.tParle -= dt; this.tBulle -= dt;
    if (d < 3.5 && g.tParle <= 0 && this.tBulle <= 0 && !c.gestes.actif && !c.jeu.auVolant) { g.tParle = 40; this.tBulle = 3.7; p.saluer(); c.hud.bulle(g.etq, `${g.e.prenom} : ${TXT.fume[g.i++ % TXT.fume.length]}`, 3.2); }
    if (g.etq.vu) c.hud.placer(g.etq, p.pos.x, 2.25, p.pos.z, true);
    if (dc < 45) p.update(dt, 0, 0, 0, false, LIBRE, t + g.ph);
    if (dc > 40 || !c.emettre) return;
    // le bout de la cigarette (anim.js : p.bout ; sinon, la main droite) ; la bouffée, de la bouche, vers l'avant, à chaque
    // expiration (p.bouffee, p.bouche ; sinon, de temps en temps)
    const os = p.m.os, main = os && os[OS.mainD], tete = os && os[OS.tete];
    if (p.bout) VT.copy(p.bout); else if (main) main.getWorldPosition(VT); else VT.set(p.pos.x + Math.sin(p.h + 0.6) * 0.25, 1.0, p.pos.z + Math.cos(p.h + 0.6) * 0.25);
    this.tFume -= dt;
    if (this.tFume <= 0) { this.tFume = 0.34; c.emettre(VT.x, VT.y + 0.03, VT.z, 0.05 + (this.rnd() - 0.5) * 0.06, 0.16 + this.rnd() * 0.06, 0.03 + (this.rnd() - 0.5) * 0.06, 1.8, this.rnd() < 0.5 ? 0xc9c9c6 : 0xb9bab8, 0.11, -0.05, 0); }
    if (p.bouffee) {
      const hx = Math.sin(p.hv ?? p.h), hz = Math.cos(p.hv ?? p.h);
      if (p.bouche) VT2.copy(p.bouche); else { if (tete) tete.getWorldPosition(VT2); else VT2.set(p.pos.x, 1.6, p.pos.z); VT2.x += hx * 0.14; VT2.y -= 0.06; VT2.z += hz * 0.14; }
      for (let i = 0; i < 7; i++) c.emettre(VT2.x, VT2.y, VT2.z, hx * (0.35 + this.rnd() * 0.25) + (this.rnd() - 0.5) * 0.12, 0.12 + this.rnd() * 0.1, hz * (0.35 + this.rnd() * 0.25) + (this.rnd() - 0.5) * 0.12, 1.6 + this.rnd() * 0.6, 0xe6e6e2, 0.3 + this.rnd() * 0.12, -0.04, 0);
    }
  }
  // le voit-on ? (tout près, ou aucun mur entre la caméra et lui : libre, écrit sur place, sans nombre en argument)
  revoir(g, gp, cam) {
    const ax = cam.x, az = cam.z, dx = gp.x - ax, dz = gp.z - az, M = this.L.murs;
    let v = dx * dx + dz * dz < 6.25;
    if (!v) {
      v = true;
      for (let i = 0; i < M.length && v; i++) {
        const m = M[i]; let t0 = 0, t1 = 1;
        if (Math.abs(dx) < 1e-6) { if (ax < m[0] || ax > m[2]) continue; } else { let a = (m[0] - ax) / dx, b = (m[2] - ax) / dx; if (a > b) { const c = a; a = b; b = c; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
        if (Math.abs(dz) < 1e-6) { if (az < m[1] || az > m[3]) continue; } else { let a = (m[1] - az) / dz, b = (m[3] - az) / dz; if (a > b) { const c = a; a = b; b = c; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
        v = false;
      }
    }
    if (v !== g.vu) { g.vu = v; g.p.m.maillage.visible = v; }
  }
  // Aucun mur entre (ax, az) et (bx, bz) ? (les cloisons du plan, en boîtes ; méthode des tranches)
  libre(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, M = this.L.murs;
    for (let i = 0; i < M.length; i++) {
      const m = M[i], x0 = m[0], z0 = m[1], x1 = m[2], z1 = m[3];
      let t0 = 0, t1 = 1;
      if (Math.abs(dx) < 1e-6) { if (ax < x0 || ax > x1) continue; } else { let a = (x0 - ax) / dx, b = (x1 - ax) / dx; if (a > b) { const c = a; a = b; b = c; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
      if (Math.abs(dz) < 1e-6) { if (az < z0 || az > z1) continue; } else { let a = (z0 - az) / dz, b = (z1 - az) / dz; if (a > b) { const c = a; a = b; b = c; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
      return false;
    }
    return true;
  }
  // la nature du sol sous les pieds (le bruit des pas) : la moquette des bureaux, le carrelage et le parquet ailleurs
  sol(x, z) {
    for (const k of ['atelier', 'soleil', 'terre', 'venus', 'saturne', 'jupiter']) { const q = P[k]; if (x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1) return 'herbe'; }
    return 'asphalte';
  }
  vivre(dt, t) {
    const c = this.c, h = c.hud, j = c.jeu.joueur.pos, cam = c.camera.position, img = ++this.img, son = c.son;
    const revoir = img % 6 === 0; // (qui voit-on ? refait toutes les six images)
    this.tBulle -= dt;
    this.chemins();
    this.planifier(dt); this.appels(dt);
    this.babyfoot(dt, t);
    let voix = 0, bulle = false;
    for (const g of this.gens) {
      const p = g.p;
      if (g.mode === 'cache' || g.dehors) { if (g.etq.vu) h.placer(g.etq, 0, 0, 0, false); continue; }
      const gp = p.assis ? p.m.groupe.position : p.pos;
      if (revoir) this.revoir(g, gp, cam);
      const d = Math.hypot(j.x - gp.x, j.z - gp.z);
      if (g.mode === 'marche') this.pas(g, dt, t, j);
      // s'asseoir, se lever : chaque image (0,6 s), vu ou pas (qui ne se voit plus finit d'un coup)
      else if (g.tr) { if (g.vu) this.transition(g, dt, t); else { g.tr.u = 1; this.transition(g, 0, t); } }
      // la tâche en cours : le temps qui passe une fois arrivé
      if (g.tache && g.tache.arrive && (g.mode === 'assis' || g.mode === 'debout')) { g.tache.t -= dt; if (g.tache.t <= 0 && g.tache.fin) { const f = g.tache.fin; g.tache.fin = null; f(); } }
      // il lève les yeux vers qui passe tout près, le salue de temps en temps (un seul à la fois), avec son prénom
      g.tParle -= dt;
      if (g.vu && d < 2.4 && g.tParle <= 0 && this.tBulle <= 0 && !c.gestes.actif && !bulle) {
        // (la bulle dure 3,2 s, plus son fondu : la suivante attend qu'elle soit partie, jamais deux à la fois)
        g.tParle = 45; this.tBulle = 3.7; bulle = true; if (g.mode === 'debout' && !(g.tache && g.tache.type === 'babyfoot')) p.saluer();
        const l = (g.tache && g.tache.arrive && TXT[g.tache.type]) || TXT[g.role] || TXT.bonjour; h.bulle(g.etq, `${g.e.prenom} : ${l[g.i++ % l.length]}`, 3.2);
      }
      if (g.etq.vu) h.placer(g.etq, gp.x, p.assis ? 1.75 : 2.25, gp.z, g.vu);
      if (g.parle && g.vu && d < 9) voix = Math.max(voix, 1 - d / 9);
      if (!g.vu || g.mode === 'marche' || g.tr) continue;
      // animé à chaque image de près, une sur deux à moins de 12 m, une sur quatre au-delà
      g.dtA += dt;
      const pas = d < 6 ? 1 : d < 12 ? 2 : 4;
      if ((img + g.i) % pas) continue;
      const dA = g.dtA; g.dtA = 0;
      this.attitude(g, d, j);
      // (debout : sync, qui tourne le corps vers son cap en quelques pas ; arrivé en marchant, on se tourne vers le café,
      // l'imprimante, le collègue, sans pivoter d'un coup)
      p.sync(dA, t + g.ph);
      if (g.mode === 'assis' && p.clavier && !g.parle && g.siege === g.home) { g.t -= dA; if (g.t <= 0 && d < 7) { g.t = 0.4 + this.rnd() * 1.6 / (CLAVIER[g.role] || 0.3); son.clavier(Math.max(0, 1 - d / 7)); } }
    }
    // les voix étouffées au casque, les plateaux (audio.js)
    if ((this.tVoix -= dt) <= 0) { this.tVoix = 0.5 + this.rnd() * 0.9; if (voix > 0.05) son.voix?.(voix); }
  }
  // (o marche-t-il, et vers où nous allons ?)
  memeSens(o, ux, uz) {
    const T = o.trajet; if (!T || !T.ch || T.k >= T.ch.length || T.attente > 0) return false;
    const q = T.ch[T.k], dx = q[0] - o.p.pos.x, dz = q[1] - o.p.pos.z, l = Math.hypot(dx, dz) || 1;
    return (dx * ux + dz * uz) / l > 0.5;
  }
  // (o, en (ox, oz), est-il juste devant p qui marche vers (ux, uz) ?)
  devantDe(p, ux, uz, ox, oz) { const rx = ox - p.pos.x, rz = oz - p.pos.z, av = rx * ux + rz * uz; return av > 0.05 && av < 1.0 && Math.abs(rx * uz - rz * ux) < 0.55; }
  // marcher le long de son chemin ; quelqu'un devant (le joueur, un collègue qui marche) : on le contourne (le chemin
  // refait autour de lui), ou l'on attend
  pas(g, dt, t, j) {
    const p = g.p, T_ = g.trajet;
    if (!T_) { g.mode = 'debout'; return; }
    // (le chemin n'est pas encore là : on attend, debout ; redemandé s'il a été oublié, en entrant ou en sortant)
    if (!T_.ch) { if (!this.cherche || this.cherche.g !== g) this.demander(g); if (g.vu) p.sync(dt, t + g.ph); return; }
    if (T_.k >= T_.ch.length) { g.trajet = null; g.mode = 'debout'; T_.apres(); return; }
    const pt = T_.ch[T_.k], tx = pt[0], tz = pt[1], ex = tx - p.pos.x, ez = tz - p.pos.z, dd = Math.hypot(ex, ez), dernier = T_.k === T_.ch.length - 1;
    if (dd < (dernier ? 0.12 : 0.3)) { T_.k++; return; }
    const ux = ex / dd, uz = ez / dd;
    T_.tRefait -= dt;
    let gx = 0, gz = 0, gr = 0;
    if (this.devantDe(p, ux, uz, j.x, j.z)) { gx = j.x; gz = j.z; gr = 0.7; }
    // (un collègue devant, qui marche dans le même sens : on le suit, sans s'arrêter derrière lui à chaque pas)
    else for (const o of this.gens) if (o !== g && o.mode === 'marche' && !o.dehors && this.devantDe(p, ux, uz, o.p.pos.x, o.p.pos.z)) { if (g.i > o.i && !this.memeSens(o, ux, uz)) { gx = o.p.pos.x; gz = o.p.pos.z; gr = 0.55; } break; }
    if (gr) {
      T_.attente += dt;
      // le contourner : un autre chemin, autour de lui (demandé ; en attendant, on attend)
      if (T_.attente > 0.5 && T_.tRefait <= 0 && !T_.evite) { T_.tRefait = 1.2; T_.evite = { x: gx, z: gz, r: gr }; T_.ax = p.pos.x; T_.az = p.pos.z; this.demander(g); }
      if (g.vu) p.update(dt, 0, 0, 0, false, LIBRE, t + g.ph); return;
    }
    T_.attente = 0;
    // (on ralentit en arrivant, et un peu à chaque coude)
    const v = Math.min(1.25, (dernier ? 0.35 : 0.75) + dd * 1.6);
    if (g.vu) p.update(dt, ux, uz, 1, false, LIBRE, t + g.ph, v);
    else { p.h = p.hv = Math.atan2(ux, uz); p.pos.x += ux * v * dt; p.pos.z += uz * v * dt; p.m.groupe.position.set(p.pos.x, p.pos.y, p.pos.z); p.m.groupe.rotation.y = p.h; }
  }
  // où il regarde : qui passe tout près, son écran, son collègue (la visite), la télé (la réunion)
  attitude(g, d, j) {
    const p = g.p;
    if (g.tache && g.tache.type === 'babyfoot' && g.tache.arrive) return; // (la balle : babyfoot)
    if (this.visite && this.visite.b === g && this.visite.a.tache && this.visite.a.tache.arrive) { const a = this.visite.a.p.pos; p.regard = this.vers(g, a.x, 1.6, a.z); return; }
    if (this.visite && this.visite.a === g && g.tache && g.tache.arrive) { const b = this.visite.b.p.m.groupe.position; p.regard = this.vers(g, b.x, 1.15, b.z); return; }
    if (d < 3) { p.regard = this.vers(g, j.x, 1.6, j.z); return; }
    p.regard = (g.siege && g.siege.regard) || (g.mode === 'debout' && g.tache && g.tache.l && g.tache.l.regard) || null;
  }
  // le baby-foot : la balle va et vient, les joueurs tirent et poussent leurs barres, un but de temps en temps
  babyfoot(dt, t) {
    const b = this.bf, BF = VIE.babyfoot, J = this.joueursBF, prets = J && J.every(g => g.tache && g.tache.type === 'babyfoot' && g.tache.arrive && g.mode === 'debout');
    const cam = this.c.camera.position, pres = Math.hypot(cam.x - BF.x, cam.z - BF.z) < 14;
    this.balle.visible = pres && this.dedans;
    if (J) for (const [i, g] of J.entries()) { if (prets && !g.mains) { g.mains = { d: [-0.22, 0.9, 0.38], g: [0.22, 0.9, 0.38] }; g.cote = BF.cotes[i].cote; } if (prets) g.p.outil = g.mains; }
    if (!prets) { this.balle.position.set(BF.x + 0.1, 0.78, BF.z + 0.4); if (J) for (const g of J) if (g.mains && !(g.tache && g.tache.type === 'babyfoot')) { g.p.outil = null; g.mains = null; } return; }
    if (!pres) return;
    b.tBut -= dt; b.tToc -= dt;
    if (b.tBut > 0) { b.s = 0; b.t = 0; } else {
      b.s += b.vs * dt; b.t += b.vt * dt;
      if (Math.abs(b.t) > 0.3) { b.t = Math.sign(b.t) * 0.3; b.vt = -b.vt; }
      // une barre la frappe : elle repart, plus ou moins vite
      if (b.tToc <= 0 && this.rnd() < dt * 3.2) { b.vs = -Math.sign(b.vs) * (0.6 + this.rnd() * 1.4); b.vt = (this.rnd() - 0.5) * 1.2; b.tToc = 0.25; this.c.son.babyfoot(Math.max(0, 1 - Math.hypot(cam.x - BF.x, cam.z - BF.z) / 12)); }
      if (Math.abs(b.s) > 0.56) {
        if (Math.abs(b.t) < 0.1) {
          // un but (le cri du buteur, s'il n'y a pas déjà une bulle : jamais deux à la fois)
          const g = J[b.s > 0 ? 0 : 1], cri = TXT.but[Math.floor(this.rnd() * TXT.but.length)];
          if (this.tBulle <= 0) { this.tBulle = 2.7; this.c.hud.bulle(g.etq, `${g.e.prenom} : ${cri}`, 2.2); }
          b.tBut = 1.6; b.vs = (this.rnd() < 0.5 ? -1 : 1) * 0.9; this.c.son.babyfoot(1);
        }
        else { b.s = Math.sign(b.s) * 0.56; b.vs = -b.vs; }
      }
    }
    this.balle.position.set(BF.x + b.t, 0.78, BF.z + b.s);
    // les mains sur les barres : elles poussent et tirent, plus vite quand la balle est de leur côté
    for (const g of J) {
      const k = 1 + 2 * Math.max(0, -g.cote * b.s), ph = t * (5 + k * 3) + g.ph;
      g.mains.d[2] = 0.38 + Math.sin(ph) * 0.05 * k; g.mains.g[2] = 0.38 + Math.sin(ph * 1.3 + 1) * 0.05 * k;
      g.mains.d[1] = 0.9 + Math.sin(ph * 0.7) * 0.015; g.mains.g[1] = 0.9 + Math.cos(ph * 0.9) * 0.015;
      g.p.regard = this.vers(g, this.balle.position.x, 0.8, this.balle.position.z);
    }
  }
  // un point à regarder, gardé par personne (sans objet neuf à chaque image)
  vers(g, x, y, z) { const r = g.rg || (g.rg = { x: 0, y: 0, z: 0 }); r.x = x; r.y = y; r.z = z; return r; }
  // les taches de contact de ceux qui sont debout (main.js : majTaches)
  taches(T) { for (const g of this.gens) if (g.vu && !g.p.assis && g.mode !== 'cache' && !g.dehors) T.poser(g.p.pos.x, g.p.pos.z, 0.4, 0.4, 0); }
  // la caméra à hauteur d'homme ; de tout près (dos au mur), on ne se voit plus
  camera(dt) {
    const c = this.c, j = c.jeu.joueur, d = c.cam.interieur(dt, j.pos.x, j.pos.z, j.h, j.v, this.L.murs, SOLU.HP, this.L.portes, VIE.plantes);
    const voir = d > 0.45 || c.gestes.actif;
    if (j.m.groupe.visible !== voir) j.m.groupe.visible = voir;
  }
  // (essais) envoyer quelqu'un faire quelque chose : 'cafe', 'imprimante', 'babyfoot' (avec un autre), 'reunion'
  envoyer(id, type, autre) {
    const g = this.gens.find(o => o.id === id); if (!g || g.etat !== 'poste') return false;
    if (type === 'babyfoot') { const b = this.gens.find(o => o.id === autre); this.joueursBF = [g, b]; const fin = () => { this.joueursBF = null; for (const o of [g, b]) { o.p.outil = null; o.mains = null; if (o.tache && o.tache.type === 'babyfoot') this.rentrer(o); } }; VIE.babyfoot.cotes.forEach((l, i) => this.aller([g, b][i], { ...l, regard: { x: VIE.babyfoot.x, y: 0.8, z: VIE.babyfoot.z } }, false, 40, fin, 'babyfoot')); return true; }
    const liste = { cafe: VIE.cafe, imprimante: VIE.imprimante, reunion: VIE.reunion }[type], l = this.prendre(type, liste, g);
    if (!l) return false;
    this.aller(g, l, type === 'reunion', 12, () => { this.liberer(g); this.rentrer(g); }, type); return true;
  }
  // (essais) où en est chacun
  etats() { return this.gens.map(g => { const q = g.p.assis ? g.p.m.groupe.position : g.p.pos; return { id: g.id, etat: g.etat, mode: g.mode, dehors: g.dehors, x: +q.x.toFixed(2), z: +q.z.toFixed(2), tache: g.tache && g.tache.type, parle: g.parle, visible: g.p.m.groupe.visible }; }); }
  piece(x, z) { for (const k in P) { const q = P[k]; if (x > q.x0 - 0.05 && x < q.x1 + 0.05 && z > q.z0 - 0.05 && z < q.z1 + 0.05) return k; } return null; }
}
const R2 = (x, z, h) => (lx, lz) => [x + lx * Math.cos(h) + lz * Math.sin(h), z - lx * Math.sin(h) + lz * Math.cos(h)];
