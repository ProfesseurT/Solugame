// La remorque de palox de la mission 3 (l'habillage) et le chariot élévateur de l'imprimerie (Teddy, 24/11/2026 : « les
// quantités seront beaucoup plus grosses, donc on oblige le tracteur qui vient attraper une remorque remplie de palox de
// bouteilles qu'on va emmener à l'imprimerie »).
// - remorque() : une remorque agricole plateau, à timon et à tandem, chargée de six palox de bouteilles tirées-bouchées.
// - Attelage : la remorque, posée (une boîte du décor) ou attelée au tracteur (cinématique d'une remorque à timon : elle
//   suit le point d'attelage, sans se mettre en portefeuille ; posée sur le relief ; elle bute contre le décor, et le
//   tracteur avec elle ; attelé, le tracteur est plus lourd).
// - etapesAtteler, etapesDeteler : les gestes, en étapes pour gestes.js ; peutAtteler : assez près, assez aligné.
// - chariot() : un chariot élévateur à mât ; Dechargement : il porte les palox de la remorque dételée dans le hangar,
//   conduit par l'étiqueteur (asseoir, descendre).
// Repère de la remorque : origine au sol sous le milieu du tandem, avant (le timon) vers +z, +x à gauche. Repère du
// chariot : origine au sol au milieu de l'empattement, les fourches vers +z, +x à gauche. Rien n'est alloué par image.
import * as THREE from 'three';
import { B, C, T, MAT, fusion, teinter, compacter } from './modeles.js';
import { Atelier, barre, bloc, roue, feuxDomaine, gyrophare, fixe } from './engins.js';
import { sol } from './relief.js';
import { angle, borne, lisse, mix } from './outils.js';

const TAU = Math.PI * 2;
// la remorque : l'anneau du timon (z, y), le plateau (dessus à BY), les six palox (centres le long de z, de l'arrière vers
// l'avant), le tandem (deux essieux), ses roues
const REMORQUE = { RZ: 5.0, RY: 0.55, BY: 1.06, Z0: -3.25, Z1: 2.95, W: 2.3, PZ: [-2.735, -1.705, -0.675, 0.355, 1.385, 2.415] };
const ESSIEUX = [0.58, -0.58], VOIE = 0.86, RR = 0.42;
const PALOX = { w: 1.2, l: 1.0, h: 0.76, plancher: 0.1 }; // en travers, le long, de haut ; dessous du plancher (patins)
const MAXI = 1.25;    // angle de portefeuille (rad) : la remorque ne tourne pas plus par rapport au tracteur
const ATT_Z = -2.2;   // le point d'attelage du tracteur, derrière son centre (engins.js : tracteur().attelage)
const BOUGE = 0.04;   // une remorque qui entrerait de plus dans le décor bute (m)

const ROUGE = '#a5392d', ROUGE_F = '#7c2a22', GALVA = '#aeb5bc', NOIR = '#1e1e22', GRIS = '#3b3d44', FONCE = '#2b2c31';
const peint = (g, c) => teinter(g, c, T.carrosserie);
const bois = (g, c) => teinter(g, c, T.bois);

/* ---------------------------------------------------------------- un palox de bouteilles tirées-bouchées
   Caisse-palette de bois à claire-voie, 1,2 m (en travers) sur 1 m (le long) et 0,76 m, sur trois patins dans le sens des
   fourches ; dedans, les bouteilles couchées, tête-bêche, se devinent entre les planches (une masse de verre sombre) et
   se voient dessus : la couche du haut, 14 rangées de 3, le bouchon au bout du col. Géométrie partagée par tous les
   palox ; origine au sol sous le milieu. Les bouteilles sont rangées en dernier : la passe d'ombre s'arrête avant elles
   (ombrePalox), la caisse et la masse de verre font déjà toute l'ombre ; leurs bouts cachés (contre l'épaule, le col, le
   bouchon) n'ont pas de couvercle. */
// habille : les bouteilles habillées (le lendemain, mission 3) : la capsule bordeaux sur le col, l'étiquette crème
const geoPaloxP = {};
let nOmbrePalox = 0;
function geoPalox(habille = false) {
  if (geoPaloxP[habille]) return geoPaloxP[habille];
  const { w: W, l: D, h: H } = PALOX, L = [], B1 = '#c9a46a', B2 = '#b48c56', B3 = '#9c7646', V = '#1f3b2a', BOUCHON = '#c9a46a';
  for (const z of [-0.42, 0, 0.42]) L.push(bois(B(W, 0.1, 0.1, B3, 0, 0.05, z), B3));
  L.push(bois(B(W, 0.025, D, B2, 0, 0.1125, 0), B2));
  for (const sx of [1, -1]) for (const sz of [1, -1]) L.push(bois(B(0.07, H - 0.1, 0.07, B3, sx * (W / 2 - 0.035), 0.1 + (H - 0.1) / 2, sz * (D / 2 - 0.035)), B3));
  for (let k = 0; k < 4; k++) {
    const y = 0.215 + k * 0.155;
    for (const sz of [1, -1]) L.push(bois(B(W - 0.02, 0.11, 0.022, k % 2 ? B1 : B2, 0, y, sz * (D / 2 - 0.011)), k % 2 ? B1 : B2));
    for (const sx of [1, -1]) L.push(bois(B(0.022, 0.11, D - 0.06, k % 2 ? B2 : B1, sx * (W / 2 - 0.011), y, 0), k % 2 ? B2 : B1));
  }
  // la masse des bouteilles, et la couche du dessus : couchées le long de z, tête-bêche d'une rangée à l'autre
  L.push(B(W - 0.07, 0.5, D - 0.07, '#152a1d', 0, 0.125 + 0.25, 0));
  if (!nOmbrePalox) for (const g of L) nOmbrePalox += g.attributes.position.count; // (la même caisse pour les deux)
  const y = 0.625 + 0.036;
  for (let r = 0; r < 14; r++) {
    const x = -W / 2 + 0.075 + r * 0.0808;
    for (let k = 0; k < 3; k++) {
      const s = (r + k) % 2 ? 1 : -1, zc = -D / 2 + 0.035 + 0.155 + k * 0.31; // le milieu de la bouteille
      // corps (0,2 m), épaule, col, bouchon ; le fond vers -s, le col vers +s. Couvercles : le fond du corps, le bout
      // du col autour du bouchon, le bout du bouchon (le haut du cylindre couché est son bout vers +z)
      const versCol = s > 0 ? 1 : 2, versFond = s > 0 ? 2 : 1;
      L.push(C(0.036, 0.036, 0.2, 5, V, x, y, zc - s * 0.05, 'z', 0, versFond));
      L.push(C(s > 0 ? 0.015 : 0.036, s > 0 ? 0.036 : 0.015, 0.045, 5, V, x, y, zc + s * 0.0725, 'z', 0, 0));
      if (habille) {
        L.push(C(0.0175, 0.0175, 0.075, 5, '#7d2333', x, y, zc + s * 0.13, 'z', 0, versCol));
        L.push(C(0.037, 0.037, 0.08, 5, '#efe4c8', x, y, zc - s * 0.05, 'z', 0, 0));
      } else {
        L.push(C(0.0145, 0.0145, 0.06, 5, V, x, y, zc + s * 0.125, 'z', 0, versCol));
        L.push(C(0.012, 0.012, 0.012, 5, BOUCHON, x, y, zc + s * 0.159, 'z', 0, versCol));
      }
    }
  }
  return (geoPaloxP[habille] = compacter(fusion(L)));
}
// les palox de la remorque : les bouteilles nues (tirées-bouchées) ou habillées
export { lever };
export function habillerPalox(R, habille) { R.palox.geometry = geoPalox(habille); ombrePalox(R.palox); }
// la passe d'ombre d'un palox (ou de plusieurs, en instances) : la caisse seule (les bouteilles sont dedans)
function ombrePalox(m) {
  const g = m.geometry;
  m.onBeforeShadow = () => g.setDrawRange(0, nOmbrePalox);
  m.onAfterShadow = () => g.setDrawRange(0, Infinity);
  return m;
}

// deux roues d'un essieu (géométries de roue(), centrées) fusionnées en une, à ± voie
function paire(gG, gD, voie) {
  const a = gG.clone(), b = gD.clone();
  a.translate(voie, 0, 0); b.translate(-voie, 0, 0);
  return compacter(fusion([a, b]));
}
const M4 = new THREE.Matrix4(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
// montrer ou cacher le palox k de la remorque (caché : réduit à rien, à sa place)
function montrerPalox(R, k, vu) {
  const P = R.palox;
  if (P.userData.vu[k] === vu) return;
  P.userData.vu[k] = vu;
  P.setMatrixAt(k, vu ? M4.makeTranslation(0, REMORQUE.BY, REMORQUE.PZ[k]) : ZERO);
  P.instanceMatrix.needsUpdate = true;
}

/* ---------------------------------------------------------------- la remorque
   Plateau de 6,2 m sur 2,3 sur un tandem à lames, timon en A et son anneau, béquille repliable à manivelle, plancher de
   bois, rive galvanisée et ses ranchers, tablier avant à barreaux, ridelle arrière basse, ridelles latérales qui se
   rabattent (pour décharger au chariot), feux et catadioptres, plaque, bavettes, coffre à outils, flexibles. */
export function remorque() {
  const groupe = new THREE.Group(); groupe.rotation.order = 'YXZ';
  const { RZ, RY, BY, Z0, Z1, W } = REMORQUE, zc = (Z0 + Z1) / 2, lg = Z1 - Z0, at = new Atelier(), L = [];
  // châssis : deux longerons en I, traverses ; le tandem : lames, mains de ressort, balanciers, essieux
  for (const s of [1, -1]) {
    const x = s * 0.55;
    L.push(peint(B(0.07, 0.17, lg - 0.1, ROUGE, x, 0.86, zc), ROUGE), peint(B(0.16, 0.025, lg - 0.1, ROUGE, x, 0.957, zc), ROUGE), peint(B(0.16, 0.025, lg - 0.1, ROUGE, x, 0.763, zc), ROUGE));
    for (const z of ESSIEUX) {
      for (let k = 0; k < 4; k++) L.push(B(0.07, 0.022, 0.92 - k * 0.17, FONCE, x, RR + 0.07 + k * 0.024, z));
      L.push(B(0.08, 0.06, 0.1, GRIS, x, RR + 0.04, z));
      for (const d of [-0.47, 0.47]) L.push(peint(B(0.06, 0.22, 0.06, ROUGE_F, x, 0.63, z + d), ROUGE_F));
    }
    L.push(peint(B(0.1, 0.2, 0.32, ROUGE_F, x, 0.62, 0), ROUGE_F)); // le balancier, entre les deux essieux
  }
  for (const z of ESSIEUX) L.push(C(0.045, 0.045, 2 * VOIE - 0.18, 8, NOIR, 0, RR, z, 'x'));
  for (let z = Z0 + 0.15; z < Z1; z += 0.86) L.push(peint(B(2.2, 0.09, 0.07, ROUGE, 0, 0.93, z), ROUGE));
  // le plancher : des lames de bois le long, et la rive galvanisée tout autour ; les ranchers sous la rive
  for (let i = 0; i < 15; i++) { const c = ['#9a7b55', '#a3825a', '#8f7250'][i % 3]; L.push(bois(B(0.146, 0.04, lg - 0.02, c, -W / 2 + 0.08 + i * 0.152, BY - 0.02, zc), c)); }
  for (const s of [1, -1]) {
    L.push(peint(B(0.06, 0.15, lg, GALVA, s * (W / 2 - 0.03), BY - 0.06, zc), GALVA));
    for (let z = Z0 + 0.45; z < Z1 - 0.2; z += 1.03) L.push(peint(B(0.06, 0.13, 0.07, ROUGE, s * (W / 2 + 0.02), BY - 0.12, z), ROUGE));
    // catadioptres orange sur le côté
    for (const z of [Z0 + 0.3, zc, Z1 - 0.3]) L.push(B(0.01, 0.05, 0.08, '#d07a22', s * (W / 2 + 0.005), BY - 0.07, z));
  }
  for (const z of [Z0, Z1]) L.push(peint(B(W, 0.15, 0.06, GALVA, 0, BY - 0.06, z), GALVA));
  // le tablier avant : deux montants, la lisse du haut, trois barreaux galvanisés, une jambe de force
  for (const s of [1, -1]) {
    L.push(peint(B(0.08, 0.95, 0.08, ROUGE, s * (W / 2 - 0.05), BY + 0.47, Z1 + 0.02), ROUGE));
    barre(at, [s * (W / 2 - 0.05), BY + 0.5, Z1 + 0.05], [s * (W / 2 - 0.2), BY, Z1 + 0.45], 0.022, ROUGE_F, T.carrosserie);
  }
  L.push(peint(B(W - 0.02, 0.08, 0.08, ROUGE, 0, BY + 0.94, Z1 + 0.02), ROUGE));
  for (const y of [0.22, 0.46, 0.7]) L.push(peint(B(W - 0.16, 0.1, 0.03, GALVA, 0, BY + y, Z1 + 0.035), GALVA));
  // la ridelle arrière, basse, et ses charnières ; les feux, les catadioptres, la plaque, les bavettes
  L.push(peint(B(W - 0.02, 0.3, 0.035, GALVA, 0, BY + 0.15, Z0 - 0.045), GALVA));
  for (const x of [-0.8, 0, 0.8]) L.push(B(0.12, 0.05, 0.05, GRIS, x, BY + 0.02, Z0 - 0.06));
  L.push(B(W - 0.1, 0.12, 0.08, NOIR, 0, 0.74, Z0 - 0.04));
  for (const s of [1, -1]) {
    L.push(B(0.26, 0.1, 0.03, '#24262a', s * 0.92, 0.74, Z0 - 0.095), B(0.14, 0.07, 0.01, '#9a1820', s * 0.88, 0.74, Z0 - 0.112), B(0.07, 0.07, 0.01, '#d07a22', s * 1.0, 0.74, Z0 - 0.112));
    at.tri([s * 0.62, 0.68, Z0 - 0.1], [s * 0.74, 0.68, Z0 - 0.1], [s * 0.68, 0.79, Z0 - 0.1], '#c0261c', 0, [0, 0, -1]);
    L.push(B(0.36, 0.42, 0.015, NOIR, s * VOIE, 0.46, -1.13));
  }
  L.push(B(0.36, 0.13, 0.015, '#ecebe3', 0.25, 0.6, Z0 - 0.09), B(0.38, 0.15, 0.01, '#2c2c2e', 0.25, 0.6, Z0 - 0.082));
  // les garde-boue au-dessus des roues, sous le plateau
  for (const s of [1, -1]) L.push(B(0.4, 0.025, 2.1, NOIR, s * VOIE, RR + 0.47, 0));
  // le timon en A, sa tête et l'anneau (à plat) ; le coffre à outils ; les flexibles lovés
  for (const s of [1, -1]) barre(at, [s * 0.55, 0.86, Z1 - 0.1], [s * 0.07, 0.64, 4.35], 0.045, ROUGE, T.carrosserie);
  barre(at, [0, 0.64, 4.3], [0, RY + 0.01, RZ - 0.05], 0.05, ROUGE, T.carrosserie);
  L.push(peint(B(0.2, 0.08, 0.3, ROUGE_F, 0, 0.6, 4.35), ROUGE_F));
  L.push(teinter(new THREE.TorusGeometry(0.055, 0.02, 4, 10).rotateX(Math.PI / 2).translate(0, RY, RZ), '#5d6168', T.carrosserie));
  L.push(peint(B(0.44, 0.3, 0.3, GRIS, 0, 0.98, 3.55), GRIS), B(0.46, 0.03, 0.32, '#4a4c54', 0, 1.14, 3.55), B(0.08, 0.04, 0.02, '#9a9da3', 0, 1.0, 3.71));
  for (const [x, c] of [[0.14, '#c0392b'], [0.24, '#e0b13a'], [-0.18, NOIR]]) {
    barre(at, [x, 0.72, 3.8], [x * 0.8, 0.71, 4.4], 0.012, NOIR, 0);
    L.push(B(0.05, 0.05, 0.08, c, x * 0.8, 0.71, 4.44));
  }
  const corps = fixe(new THREE.Mesh(compacter(fusion([...at.geos(), ...L])), MAT));
  corps.castShadow = true; corps.receiveShadow = true; corps.name = 'remorque';
  groupe.add(corps);

  // les quatre roues (jante grise, flanc intérieur fermé : on le voit sous le plateau), deux par essieu : un maillage
  // par essieu, qui tourne autour de lui
  const roues = ESSIEUX.map(z => { const m = new THREE.Mesh(paire(roue(RR, 0.3, 14, 1, true, '#c9ccd1'), roue(RR, 0.3, 14, -1, true, '#c9ccd1'), VOIE), MAT); m.position.set(0, RR, z); m.castShadow = true; groupe.add(m); return m; });
  // la béquille : elle pivote sous le timon (baissée : debout, pied au sol ; levée : couchée vers l'arrière) ; sa manivelle
  const bequille = new THREE.Group(); bequille.position.set(0.1, 0.62, 4.15); groupe.add(bequille);
  bequille.add(fixe(new THREE.Mesh(compacter(fusion([
    peint(B(0.075, 0.42, 0.075, GRIS, 0, -0.21, 0), GRIS), B(0.05, 0.22, 0.05, '#7d828a', 0, -0.5, 0), B(0.2, 0.025, 0.2, FONCE, 0, -0.605, 0),
    B(0.12, 0.06, 0.06, GRIS, 0, 0.02, 0), B(0.02, 0.02, 0.16, '#9a9da3', 0.07, 0.06, 0.08), C(0.022, 0.022, 0.06, 6, NOIR, 0.07, 0.06, 0.17, 'x'),
  ])), MAT)));
  // la goupille de l'attelage, au-dessus de l'anneau (sortie) ou à travers (mise)
  const goupille = new THREE.Mesh(compacter(fusion([C(0.017, 0.017, 0.24, 6, '#9a9da3', 0, 0, 0), C(0.03, 0.03, 0.025, 8, '#c0392b', 0, 0.12, 0), B(0.006, 0.08, 0.04, '#9a9da3', 0, 0.06, 0.03)])), MAT);
  goupille.position.set(0, RY + 0.2, RZ); groupe.add(goupille);
  // les ridelles latérales : une charnière au bas de la rive, elles se rabattent vers l'extérieur ; feux stop
  const ridelles = [1, -1].map(s => {
    const g = new THREE.Group(); g.position.set(s * (W / 2 + 0.01), BY, zc); groupe.add(g);
    g.add(fixe(new THREE.Mesh(compacter(fusion([peint(B(0.03, 0.3, lg - 0.1, GALVA, 0, 0.15, 0), GALVA), ...[0.07, 0.23].map(y => peint(B(0.045, 0.03, lg - 0.1, '#959ca4', s * 0.008, y, 0), '#959ca4'))])), MAT)));
    g.children[0].receiveShadow = true;
    g.userData.s = s;
    return g;
  });
  const feux = feuxDomaine(groupe, [[0.14, 0.07, 0.01, 0.88, 0.74, Z0 - 0.118]], null);
  // les six palox, sur le plateau : un seul appel de dessin (instances) ; ils partent un par un sur le chariot
  // (Dechargement : montrerPalox)
  const palox = fixe(ombrePalox(new THREE.InstancedMesh(geoPalox(), MAT, 6)));
  palox.castShadow = true; palox.receiveShadow = true; palox.name = 'palox';
  palox.userData.vu = [true, true, true, true, true, true];
  REMORQUE.PZ.forEach((z, k) => palox.setMatrixAt(k, M4.makeTranslation(0, BY, z)));
  palox.computeBoundingSphere();
  groupe.add(palox);
  return {
    groupe, corps, roues, bequille, goupille, ridelles, feux, palox,
    // emprise au sol (repère de la remorque) : ce que le personnage contourne, attelée (gestes.js : contourner)
    dims: { emprise: [[-W / 2 - 0.05, W / 2 + 0.05, Z0 - 0.15, Z1 + 0.1], [-0.3, 0.3, Z1, RZ + 0.1]] },
  };
}

/* ---------------------------------------------------------------- la remorque, posée ou attelée
   col : les collisions (posée, la remorque est une boîte tournée ; attelée, elle n'en a plus et c'est elle qui bute).
   pos : le milieu du tandem, au sol (et pos.veh : elle-même, pour les voitures de la départementale, comme un véhicule
   du joueur : h, d.off, d.r) ; h : son cap ; tr : le tracteur (vehicules.js) quand elle est attelée. */
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const PE = { x: 0, y: 0, z: 0, debout: { x: 0, z: 0, h: 0 }, cap: 0 }; // (pointEchantillon)
// Deux rectangles orientés se recouvrent-ils ? Centre, demi-largeur (le long de l'axe x du rectangle : (co, -si)),
// demi-profondeur (le long de son axe z : (si, co)), comme les boîtes tournées du décor (collisions.js : boiteO).
// Séparés si, sur l'un des quatre axes, l'écart des centres dépasse la somme des demi-projections.
function recouvre(ax, az, ahw, ahd, aco, asi, bx, bz, bhw, bhd, bco, bsi) {
  const dx = bx - ax, dz = bz - az;
  for (let k = 0; k < 4; k++) {
    const ux = k === 0 ? aco : k === 1 ? asi : k === 2 ? bco : bsi, uz = k === 0 ? -asi : k === 1 ? aco : k === 2 ? -bsi : bco;
    const ra = ahw * Math.abs(ux * aco - uz * asi) + ahd * Math.abs(ux * asi + uz * aco);
    const rb = bhw * Math.abs(ux * bco - uz * bsi) + bhd * Math.abs(ux * bsi + uz * bco);
    if (Math.abs(dx * ux + dz * uz) > ra + rb) return false;
  }
  return true;
}
export class Attelage {
  constructor(modele, col) {
    this.r = modele; this.col = col; this.pos = new THREE.Vector3(); this.pos.veh = this; this.h = 0; this.v = 0;
    this.d = { off: [2.2, -1.9], r: 1.35 };               // pour les voitures (vehicules.js : cercles)
    this.tr = null; this.T0 = null; this.boite = null; this.bute = false;
    this.rot = 0; this.tg = 0; this.rl = 0; this.y = 0;
    this.bequilleK = 1; this.goupilleK = 0; this.ridelleK = [0, 0];
    this.prec = { x: 0, z: 0, h: 0, ok: false };
    this.vu = [NaN, NaN, NaN, NaN]; // béquille, goupille, ridelles au dernier calcul (posée, rien ne change : rien à refaire)
  }
  get attelee() { return !!this.tr; }
  // posée là (dételée, la béquille baissée)
  poser(x, z, h) {
    if (this.tr) this.deteler();
    this.pos.set(x, 0, z); this.h = h; this.v = 0; this.bequilleK = 1; this.goupilleK = 0;
    this.poserBoite(); this.sync(0); this.vu[0] = NaN;
  }
  // plus là du tout (main.js : la remorque pas encore préparée) : plus de boîte
  retirer() { if (this.boite) { this.col.retirer(this.boite); this.boite = null; } }
  poserBoite() {
    if (this.boite) this.col.retirer(this.boite);
    const { Z0, Z1, W } = REMORQUE, zc = (Z0 + Z1) / 2, fx = Math.sin(this.h), fz = Math.cos(this.h);
    this.boite = this.col.boiteO(this.pos.x + fx * zc, this.pos.z + fz * zc, W + 0.1, Z1 - Z0 + 0.1, this.h);
  }
  // l'anneau du timon, au sol (monde)
  anneau(out) { const fx = Math.sin(this.h), fz = Math.cos(this.h); out.x = this.pos.x + fx * REMORQUE.RZ; out.z = this.pos.z + fz * REMORQUE.RZ; return out; }
  // un point du repère de la remorque (x, y, z) dans le monde (y : au-dessus du sol sous la remorque)
  versMonde(x, y, z, out) {
    const c = Math.cos(this.h), s = Math.sin(this.h);
    out.x = this.pos.x + x * c + z * s; out.z = this.pos.z - x * s + z * c; out.y = this.y + y;
    return out;
  }
  // Attelée au tracteur tr (son modèle a attelage) : plus de boîte ; le tracteur s'alourdit (il accélère et freine moins
  // vite, roule un peu moins vite)
  atteler(tr) {
    this.tr = tr; tr.remorque = this;
    if (this.boite) { this.col.retirer(this.boite); this.boite = null; }
    this.T0 = tr.T;
    tr.T = { ...tr.T, acc: tr.T.acc * 0.62, accAr: tr.T.accAr * 0.6, frein: tr.T.frein * 0.72, vmax: Math.min(tr.T.vmax, 10.5), vmaxAr: Math.min(tr.T.vmaxAr, 2.6), alat: tr.T.alat * 0.85 };
    this.bequilleK = 0; this.goupilleK = 1;
    this.prec.ok = false;
  }
  // dételée : elle reste où elle est, béquille baissée ; elle redevient une boîte du décor
  deteler() {
    const tr = this.tr;
    if (!tr) return;
    tr.T = this.T0; tr.remorque = null; this.tr = null; this.v = 0;
    this.bequilleK = 1; this.goupilleK = 0;
    this.poserBoite();
  }
  // Chaque image, après le véhicule (main.js ; aussi pendant les gestes : la remorque suit le tracteur qui roule tout
  // seul). bloquer : elle bute contre le décor (faux quand un geste mène le tracteur) ; voitures : celles de la
  // départementale (elles comptent aussi).
  maj(dt, bloquer = true, voitures = null) {
    const tr = this.tr;
    if (tr) {
      const fx = Math.sin(tr.h), fz = Math.cos(tr.h), hx = tr.pos.x + fx * ATT_Z, hz = tr.pos.z + fz * ATT_Z;
      // le cap de la remorque : vers le point d'attelage ; pas de portefeuille (angle borné avec le tracteur)
      let h = Math.atan2(hx - this.pos.x, hz - this.pos.z);
      const da = angle(h - tr.h);
      if (Math.abs(da) > MAXI) h = tr.h + Math.sign(da) * MAXI;
      const nx = hx - Math.sin(h) * REMORQUE.RZ, nz = hz - Math.cos(h) * REMORQUE.RZ;
      if (bloquer && this.prec.ok && this.heurte(nx, nz, h, voitures)) {
        // elle bute : le tracteur revient où il était (on ne la traîne pas dans le mur)
        const P = this.prec, av = Math.abs(tr.v);
        tr.pos.x = P.x; tr.pos.z = P.z; tr.h = P.h;
        if (av > 2.2) tr.chocVu = Math.max(tr.chocVu, Math.min(1, av / 9));
        tr.v = 0; tr.vT = 0; tr.lacet = 0; tr.sync(0, 0);
        this.bute = true; this.v = 0;
      } else {
        const d = (nx - this.pos.x) * Math.sin(h) + (nz - this.pos.z) * Math.cos(h);
        this.v = dt > 0 ? d / dt : 0;
        this.pos.x = nx; this.pos.z = nz; this.h = h; this.bute = false;
      }
      this.prec.x = tr.pos.x; this.prec.z = tr.pos.z; this.prec.h = tr.h; this.prec.ok = true;
    } else {
      const u = this.vu;
      if (u[0] === this.bequilleK && u[1] === this.goupilleK && u[2] === this.ridelleK[0] && u[3] === this.ridelleK[1]) return;
      u[0] = this.bequilleK; u[1] = this.goupilleK; u[2] = this.ridelleK[0]; u[3] = this.ridelleK[1];
    }
    this.sync(dt);
  }
  // La remorque, à la place (x, z, h), entrerait-elle dans le décor (son plateau, un rectangle, contre chaque boîte proche,
  // même un poteau fin), un autre véhicule du joueur ou une voiture (leurs cercles) ? De BOUGE près.
  heurte(x, z, h, voitures) {
    const { Z0, Z1, W } = REMORQUE, co = Math.cos(h), si = Math.sin(h), zc = (Z0 + Z1) / 2;
    const cx = x + si * zc, cz = z + co * zc, hw = W / 2 - BOUGE, hd = (Z1 - Z0) / 2 - BOUGE;
    const col = this.col, CASE = 8, e = hw * Math.abs(co) + hd * Math.abs(si), f = hw * Math.abs(si) + hd * Math.abs(co);
    col.vu++;
    for (let ix = Math.floor((cx - e) / CASE); ix <= Math.floor((cx + e) / CASE); ix++) for (let iz = Math.floor((cz - f) / CASE); iz <= Math.floor((cz + f) / CASE); iz++) {
      const l = col.cases.get(col.cle(ix, iz));
      if (!l) continue;
      for (let i = 0; i < l.length; i++) {
        const b = l[i];
        if (b.vu === col.vu || b.fantome) continue;
        b.vu = col.vu;
        const o = b.o;
        if (o ? recouvre(cx, cz, hw, hd, co, si, o.cx, o.cz, o.hw, o.hd, o.co, o.si)
          : recouvre(cx, cz, hw, hd, co, si, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, (b.x1 - b.x0) / 2, (b.z1 - b.z0) / 2, 1, 0)) return true;
      }
    }
    const dansRect = (px, pz, r) => {
      const dx = px - cx, dz = pz - cz, lx = dx * co - dz * si, lz = dx * si + dz * co;
      const ex = Math.max(0, Math.abs(lx) - hw), ez = Math.max(0, Math.abs(lz) - hd);
      return ex * ex + ez * ez < r * r;
    };
    if (this.tr) for (const a of this.tr.autres) {
      const ax = Math.sin(a.h), az = Math.cos(a.h);
      for (const ao of a.d.off) if (dansRect(a.pos.x + ax * ao, a.pos.z + az * ao, a.d.r)) return true;
    }
    if (voitures) for (let j = 0; j < voitures.length; j++) {
      const vo = voitures[j];
      for (let k = -1; k <= 1; k += 2) if (dansRect(vo.x + k * 1.1 * vo.sens, vo.z, 0.95)) return true;
    }
    return false;
  }
  // un personnage (cercle p, r) repoussé hors de la remorque attelée (posée, c'est sa boîte du décor qui l'arrête)
  pousser(p, r) {
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, lim = 3.5 + r; // (le plateau tient dans un carré de 3,5 m autour du tandem)
    if (!this.tr || dx > lim || dx < -lim || dz > lim || dz < -lim) return false;
    const { Z0, Z1, W } = REMORQUE, c = Math.cos(this.h), s = Math.sin(this.h);
    let lx = dx * c - dz * s, lz = dx * s + dz * c;
    const qx = borne(lx, -W / 2, W / 2), qz = borne(lz, Z0, Z1), ex = lx - qx, ez = lz - qz, d2 = ex * ex + ez * ez;
    if (d2 >= r * r) return false;
    if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; lx += ex * k; lz += ez * k; }
    else if (W / 2 - Math.abs(lx) < Math.min(lz - Z0, Z1 - lz)) lx = Math.sign(lx || 1) * (W / 2 + r);
    else lz = lz - Z0 < Z1 - lz ? Z0 - r : Z1 + r;
    p.x = this.pos.x + lx * c + lz * s; p.z = this.pos.z - lx * s + lz * c;
    return true;
  }
  // Le point où l'on prend un échantillon, à pied : le dessus du palox de l'arrière, au bord du côté le plus proche de
  // (px, pz) ; debout : où se tenir, au sol à côté de la remorque, tourné vers elle. Rempli dans out (par défaut, le même
  // objet à chaque appel : main.js le demande à chaque image pour placer l'étiquette).
  pointEchantillon(px, pz, out = PE) {
    const { W, PZ, BY } = REMORQUE, gx = Math.cos(this.h), gz = -Math.sin(this.h);
    const s = (px - this.pos.x) * gx + (pz - this.pos.z) * gz >= 0 ? 1 : -1, z = PZ[0], d = out.debout;
    this.versMonde(s * 0.42, BY + 0.69, z, out);
    this.versMonde(s * (W / 2 + 0.55), 0, z, V1); d.x = V1.x; d.z = V1.z; d.h = Math.atan2(-s * gx, -s * gz);
    out.cap = this.h; // (le cap de la remorque)
    return out;
  }
  // Posée sur le relief : le tandem au sol ; attelée, l'avant tenu par l'attelage du tracteur ; posée, par la béquille.
  // Les roues tournent, la béquille, la goupille et les ridelles suivent leur état.
  sync(dt) {
    const R = this.r, { RZ, RY } = REMORQUE, h = this.h, c = Math.cos(h), s = Math.sin(h), x = this.pos.x, z = this.pos.z;
    const yG = sol(x + VOIE * c, z - VOIE * s), yD = sol(x - VOIE * c, z + VOIE * s);
    this.y = (yG + yD) / 2;
    let yAv;
    if (this.tr) {
      // la hauteur de l'attelage du tracteur (son groupe, sans la caisse)
      const g = this.tr.m.groupe; g.updateMatrix();
      yAv = V1.copy(this.tr.m.attelage || V2.set(0, RY, ATT_Z)).applyMatrix4(g.matrix).y;
    } else yAv = sol(x + s * 4.15, z + c * 4.15) + RY;
    const tg = Math.atan2(this.y + RY - yAv, RZ), rl = Math.atan2(yG - yD, 2 * VOIE);
    const k = dt > 0 ? 1 - Math.exp(-dt * 12) : 1;
    this.tg += (tg - this.tg) * k; this.rl += (rl - this.rl) * k;
    R.groupe.position.set(x, this.y, z); R.groupe.rotation.set(this.tg, h, this.rl);
    this.rot += this.v * dt / RR;
    for (const m of R.roues) m.rotation.x = this.rot;
    R.bequille.rotation.x = (1 - this.bequilleK) * Math.PI / 2;
    R.goupille.position.y = RY + 0.2 - 0.2 * this.goupilleK;
    for (let i = 0; i < 2; i++) R.ridelles[i].rotation.z = -R.ridelles[i].userData.s * this.ridelleK[i] * Math.PI;
    // feux stop : ceux du tracteur
    if (R.feux.stop) { const on = !!(this.tr && this.tr.m.feux && this.tr.m.feux.stop && this.tr.m.feux.stop.visible); if (R.feux.stop.visible !== on) R.feux.stop.visible = on; }
  }
  // les palox remis sur la remorque (une partie qui repart de zéro ; ou, la nuit, rechargés à l'imprimerie)
  recharger() {
    for (let k = 0; k < 6; k++) montrerPalox(this.r, k, true);
    this.ridelleK[0] = this.ridelleK[1] = 0;
  }
  // vide (rangée sous le hangar, hors de la mission 3)
  vider() {
    for (let k = 0; k < 6; k++) montrerPalox(this.r, k, false);
    this.ridelleK[0] = this.ridelleK[1] = 0;
  }
}

/* ---------------------------------------------------------------- atteler, dételer (gestes.js)
   G : les gestes du joueur ; v : le véhicule du joueur (le tracteur : { p, m, genre }) ; att : l'Attelage ;
   o : { couper() : le moteur coupé (main.js), sorti(), installe() : comme pour descendre et monter }. */
// le point d'attelage du tracteur tr, au sol (monde)
function attelageDe(tr, out) { out.x = tr.pos.x + Math.sin(tr.h) * ATT_Z; out.z = tr.pos.z + Math.cos(tr.h) * ATT_Z; return out; }
const PA = { x: 0, z: 0 }, PB = { x: 0, z: 0 };
// Assez près et assez aligné pour atteler : le tracteur presque arrêté, tourné comme la remorque (à 40° près), son
// attelage devant l'anneau (de 0 à 12 m), pas trop de côté (à 6 m près, et moins quand il est tout près)
export function peutAtteler(tr, att) {
  if (!tr || att.tr || Math.abs(tr.v) > 1.2 || !tr.m.attelage) return false;
  if (Math.cos(angle(tr.h - att.h)) < 0.77) return false;
  att.anneau(PA); attelageDe(tr, PB);
  const fx = Math.sin(att.h), fz = Math.cos(att.h), dx = PB.x - PA.x, dz = PB.z - PA.z;
  const lon = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx);
  return lon > -0.4 && lon < 12 && lat < Math.min(6, 1.2 + Math.max(0, lon) * 0.85);
}
// Un chemin [x, z] lissé (Bézier) d'une pose (x0, z0, cap h0) à une autre (x3, z3, h3), parcouru en marche avant, ou en
// marche arrière (recul : le véhicule regarde à l'opposé du sens de la marche) ; n points
export function chemin(x0, z0, h0, x3, z3, h3, recul, n = 28) {
  const s = recul ? -1 : 1, d = Math.hypot(x3 - x0, z3 - z0), c = Math.max(0.5, d * 0.42);
  const x1 = x0 + s * Math.sin(h0) * c, z1 = z0 + s * Math.cos(h0) * c, x2 = x3 - s * Math.sin(h3) * c, z2 = z3 - s * Math.cos(h3) * c, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, e = 3 * (1 - t) * t * t, f = t ** 3;
    pts.push([a * x0 + b * x1 + e * x2 + f * x3, a * z0 + b * z1 + e * z2 + f * z3]);
  }
  return pts;
}
// un chemin en marche avant par une suite de poses [x, z, cap] (une courbe de l'une à l'autre)
export function parPoses(P) { const pts = [[P[0][0], P[0][1]]]; for (let i = 1; i < P.length; i++) pts.push(...chemin(...P[i - 1], ...P[i], false, 18).slice(1)); return pts; }
const longueur = pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };
// une poignée invisible que les mains vont prendre (anim.js : porte), une par personnage
function poignee(G) {
  const m = G.j.m;
  if (!m.poignee) { m.poignee = new THREE.Group(); m.poignee.userData.demi = 0.06; m.groupe.add(m.poignee); }
  return m.poignee;
}
// se tenir à côté du timon (côté gauche de la remorque : celui du marchepied du tracteur), à la hauteur z (repère de la
// remorque), tourné vers lui
function aCoteDuTimon(G, att, z) {
  const P = { x: 0, y: 0, z: 0 };
  return G.allerA(() => att.versMonde(0.58, 0, z, P), () => att.h - Math.PI / 2);
}
// les mains sur un point du repère de la remorque, le temps d'une étape : on s'accroupit d'autant qu'il est bas
function mains(G, att, x, y, z, duree, maj, fin) {
  const W = new THREE.Vector3();
  return {
    duree,
    debut: () => { const p = poignee(G); G.j.porte = p; },
    maj: (dt, t, u) => {
      const p = poignee(G); att.versMonde(x, y, z, W); G.local(W, p.position);
      maj(u);
      G.immobile(dt, t);
      if (u >= 1 && G.j.porte === p) { G.j.porte = null; fin?.(); }
    },
  };
}
// Atteler : le tracteur, arrêté devant le timon, recule tout seul jusqu'à l'anneau ; on descend, on lève la béquille, on
// met la goupille ; la remorque est attelée ; on remonte
export function etapesAtteler(G, v, att, o) {
  const tr = v.p, A = att.anneau({ x: 0, z: 0 }), h = att.h;
  const x3 = A.x - Math.sin(h) * ATT_Z, z3 = A.z - Math.cos(h) * ATT_Z; // le tracteur, son attelage sur l'anneau
  const pts = chemin(tr.pos.x, tr.pos.z, tr.h, x3, z3, h, true), d = longueur(pts);
  return [
    G.rouler(v, pts, 1.2 + d / 1.25, true), { action: o.couper },
    ...G.etapesDescendre(v, o.sorti),
    ...aCoteDuTimon(G, att, 4.05),
    mains(G, att, 0.17, 0.68, 4.32, 1.3, u => { att.bequilleK = 1 - lisse((u - 0.15) / 0.75); }),
    ...aCoteDuTimon(G, att, 4.85),
    mains(G, att, 0, REMORQUE.RY + 0.2, REMORQUE.RZ, 0.9, u => { att.goupilleK = lisse((u - 0.3) / 0.5); }, () => att.atteler(tr)),
    ...G.etapesMonter(v, o.installe),
  ];
}
// Atteler avec de l'aide (mission 3 : le salarié au domaine, Julien à l'imprimerie ; Teddy, 25/11/2026 : « l'employé
// m'aide à attacher la remorque ») : on reste au volant ; le tracteur fait d'abord, s'il le faut, sa manœuvre
// (o.manoeuvre : un chemin [x, z] en marche avant), puis recule tout seul jusqu'à l'anneau ; celui qui aide (GA : ses
// gestes ; o.lancer(etapes) : les lui fait jouer, et dit quand c'est fini) va au timon, lève la béquille, met la goupille,
// et s'écarte. o.couper : le moteur coupé ; o.cadre(a, b) : la caméra cadre l'attelage, du côté de celui qui aide.
export function etapesAttelerAide(G, v, att, GA, o) {
  const tr = v.p, h = att.h, A = { x: 0, z: 0 }, P = { x: 0, y: 0, z: 0 };
  att.anneau(A);
  const x3 = A.x - Math.sin(h) * ATT_Z, z3 = A.z - Math.cos(h) * ATT_Z; // le tracteur, son attelage sur l'anneau
  const e = [];
  if (o.manoeuvre) e.push(G.rouler(v, o.manoeuvre, 1.4 + longueur(o.manoeuvre) / 2.0, false));
  // le recul, calculé une fois la manœuvre faite (le tracteur est là où elle l'a mené)
  const recul = { duree: 1, r: null, debut: () => {
    const pts = chemin(tr.pos.x, tr.pos.z, tr.h, x3, z3, h, true);
    recul.r = G.rouler(v, pts, 1.3 + longueur(pts) / 1.2, true); recul.duree = recul.r.duree; recul.r.debut();
  }, maj: (...a) => recul.r.maj(...a) };
  let fait = false;
  e.push(recul, { action: () => {
    o.couper();
    o.cadre?.(att.versMonde(0.58, 0, 4.4, P), A);
    o.lancer([
      ...aCoteDuTimon(GA, att, 4.05),
      mains(GA, att, 0.17, 0.68, 4.32, 1.3, u => { att.bequilleK = 1 - lisse((u - 0.15) / 0.75); }),
      ...aCoteDuTimon(GA, att, 4.85),
      mains(GA, att, 0, REMORQUE.RY + 0.2, REMORQUE.RZ, 0.9, u => { att.goupilleK = lisse((u - 0.3) / 0.5); }, () => att.atteler(tr)),
      // il s'écarte, sur le côté de la remorque, et fait signe que c'est bon
      ...GA.allerA(() => att.versMonde(2.1, 0, 2.6, P), () => att.h + Math.PI / 2 + 0.6),
      { action: () => { GA.j.saluer(); } },
      { duree: 0.9, maj: (dt, t) => GA.immobile(dt, t) },
    ], () => { fait = true; });
  } }, { maj: (dt, t) => { G.immobile(dt, t); return fait; } });
  return e;
}
// Dételer : (si depot { x, z, h } : le tracteur avance d'abord tout seul pour poser la remorque à cette place) ; on
// descend, on baisse la béquille, on ôte la goupille ; la remorque est dételée ; on remonte, le tracteur avance de
// quelques mètres
export function etapesDeteler(G, v, att, o) {
  const tr = v.p, e = [];
  if (o.depot) {
    // la place de la remorque encore devant (plus de 1,5 m) : le tracteur avance tout seul jusqu'à l'y poser, la fin
    // tout droit (elle s'aligne derrière) ; déjà là, ou dépassée : on la dételle où elle est
    const D = o.depot, fx = Math.sin(D.h), fz = Math.cos(D.h), ax = D.x + fx * REMORQUE.RZ, az = D.z + fz * REMORQUE.RZ;
    const x3 = ax - fx * ATT_Z, z3 = az - fz * ATT_Z, devant = (x3 - tr.pos.x) * Math.sin(tr.h) + (z3 - tr.pos.z) * Math.cos(tr.h);
    if (devant > 1.5) {
      const l = Math.min(7, devant - 0.5), x2 = x3 - fx * l, z2 = z3 - fz * l;
      const pts = devant - l > 1 ? chemin(tr.pos.x, tr.pos.z, tr.h, x2, z2, D.h, false) : [[tr.pos.x, tr.pos.z], [x2, z2]];
      for (let k = 1; k <= Math.round(l / 0.5); k++) pts.push([x2 + fx * k * 0.5, z2 + fz * k * 0.5]);
      e.push(G.rouler(v, pts, 1.5 + longueur(pts) / 1.6, false));
    }
  }
  e.push({ action: o.couper }, ...G.etapesDescendre(v, o.sorti), ...aCoteDuTimon(G, att, 4.05),
    mains(G, att, 0.17, 0.68, 4.32, 1.3, u => { att.bequilleK = lisse((u - 0.15) / 0.75); }),
    ...aCoteDuTimon(G, att, 4.85),
    mains(G, att, 0, REMORQUE.RY + 0.2, REMORQUE.RZ, 0.9, u => { att.goupilleK = 1 - lisse((u - 0.2) / 0.5); }, () => att.deteler()),
    ...G.etapesMonter(v, o.installe));
  // le tracteur avance de 6 m (ce chemin-là est calculé au moment d'avancer : le tracteur peut avoir bougé)
  let r = null;
  e.push({
    duree: 2.6,
    debut: () => {
      const pts = [];
      for (let k = 0; k <= 12; k++) pts.push([tr.pos.x + Math.sin(tr.h) * k * 0.5, tr.pos.z + Math.cos(tr.h) * k * 0.5]);
      r = G.rouler(v, pts, 2.6, false); r.debut();
    },
    maj: (dt, t, u, T) => r.maj(dt, t, u, T),
  });
  return e;
}

/* ---------------------------------------------------------------- le chariot élévateur
   Chariot à contrepoids, jaune : châssis, capot sous le siège, contrepoids arrondi et sa bouteille de gaz, protège-
   conducteur à quatre montants et toit à barreaux (phares de travail, gyrophare orange), planche de bord, colonne et
   volant ; le mât à deux étages (le second monte quand les fourches passent 1,2 m), ses vérins d'inclinaison et de
   levée, ses chaînes ; le tablier, son dosseret et deux fourches ; roues motrices à l'avant, directrices à l'arrière. */
const CHARIOT = { FZ: 1.74, assise: 1.04, plancher: 0.74 }; // FZ : le milieu des fourches (repère du chariot)
export function chariot() {
  const groupe = new THREE.Group(), caisse = new THREE.Group(); groupe.add(caisse);
  const JAUNE = '#e0b13a', CONTRE = '#3a3c42', MAT_C = '#3b3d44', at = new Atelier(), L = [], j = g => peint(g, JAUNE);
  // châssis, capot, garde-boue ; le contrepoids, arrondi en haut, et la bouteille de gaz couchée dessus
  L.push(B(0.64, 0.34, 1.9, FONCE, 0, 0.34, -0.15));
  L.push(j(B(1.1, 0.16, 1.25, JAUNE, 0, 0.66, 0.05)), j(B(0.82, 0.26, 0.75, JAUNE, 0, 0.87, -0.42)));
  for (const s of [1, -1]) L.push(j(B(0.2, 0.06, 0.62, JAUNE, s * 0.45, 0.76, 0.6)));
  bloc(at, [[-0.56, 0.18, -1.2], [0.56, 0.18, -1.2], [0.56, 0.18, -0.72], [-0.56, 0.18, -0.72], [-0.5, 1.02, -1.14], [0.5, 1.02, -1.14], [0.5, 1.02, -0.72], [-0.5, 1.02, -0.72]], CONTRE, T.carrosserie);
  L.push(peint(B(1.0, 0.06, 0.4, JAUNE, 0, 1.04, -0.93), JAUNE));
  L.push(C(0.15, 0.15, 0.72, 10, '#5f86a8', 0, 1.22, -0.98, 'x'), C(0.035, 0.035, 0.06, 6, '#9a9da3', 0.38, 1.22, -0.98, 'x'), B(0.06, 0.2, 0.06, FONCE, -0.3, 1.12, -0.98), B(0.06, 0.2, 0.06, FONCE, 0.3, 1.12, -0.98));
  for (const s of [1, -1]) L.push(B(0.1, 0.07, 0.02, '#9a1820', s * 0.42, 0.88, -1.205), B(0.06, 0.07, 0.02, '#d07a22', s * 0.3, 0.88, -1.205));
  L.push(B(0.14, 0.1, 0.12, FONCE, 0, 0.32, -1.24)); // l'attelage arrière
  // le plancher, la planche de bord (deux cadrans) et la colonne de direction ; le siège, son dossier, ses accoudoirs
  L.push(B(0.72, 0.03, 0.42, '#3a3c42', 0, 0.74, 0.32), j(B(0.86, 0.32, 0.16, JAUNE, 0, 0.92, 0.62)));
  for (const x of [-0.12, 0.12]) at.poly(Array.from({ length: 8 }, (_, i) => [x + Math.cos(i / 8 * TAU) * 0.045, 1.0 + Math.sin(i / 8 * TAU) * 0.045, 0.538]), '#e8e4dc', 0, [0, 0, -1]);
  barre(at, [0, 0.96, 0.52], [0, 1.31, 0.17], 0.03, NOIR, 0);
  L.push(B(0.46, 0.09, 0.42, NOIR, 0, CHARIOT.assise - 0.045, -0.4));
  bloc(at, [[-0.23, 1.02, -0.6], [0.23, 1.02, -0.6], [0.23, 1.02, -0.68], [-0.23, 1.02, -0.68], [-0.21, 1.5, -0.66], [0.21, 1.5, -0.66], [0.21, 1.5, -0.74], [-0.21, 1.5, -0.74]], NOIR, 0);
  for (const s of [1, -1]) L.push(B(0.05, 0.05, 0.3, NOIR, s * 0.27, 1.18, -0.42));
  // le protège-conducteur : deux montants avant penchés, deux arrière, le cadre du toit, ses barreaux ; phares de travail
  for (const s of [1, -1]) {
    barre(at, [s * 0.48, 0.82, 0.6], [s * 0.46, 2.08, 0.42], 0.035, FONCE, 0);
    barre(at, [s * 0.48, 1.0, -0.88], [s * 0.46, 2.08, -0.9], 0.035, FONCE, 0);
    L.push(B(0.06, 0.06, 1.38, FONCE, s * 0.46, 2.1, -0.24), B(0.12, 0.1, 0.1, NOIR, s * 0.46, 2.0, 0.5), B(0.09, 0.07, 0.01, '#f4efe2', s * 0.46, 2.0, 0.556));
  }
  for (const z of [0.42, -0.9]) L.push(B(0.98, 0.06, 0.06, FONCE, 0, 2.1, z));
  for (let i = 0; i < 6; i++) L.push(B(0.035, 0.035, 1.3, FONCE, -0.36 + i * 0.144, 2.12, -0.24));
  // le mât extérieur (deux montants, deux traverses), les vérins d'inclinaison, le vérin de levée
  for (const s of [1, -1]) {
    L.push(B(0.075, 2.12, 0.13, MAT_C, s * 0.31, 1.13, 0.98));
    barre(at, [s * 0.4, 0.62, 0.62], [s * 0.33, 1.05, 0.93], 0.03, '#8a9098', T.carrosserie);
  }
  for (const y of [0.2, 2.15]) L.push(B(0.7, 0.08, 0.08, MAT_C, 0, y, 0.98));
  L.push(C(0.05, 0.05, 1.7, 8, '#8a9098', 0, 0.95, 0.92));
  const corps = fixe(new THREE.Mesh(compacter(fusion([...at.geos(), ...L])), MAT)); corps.castShadow = true; corps.receiveShadow = true; caisse.add(corps);
  // le mât intérieur : il monte avec les fourches au-delà de 1,2 m ; les chaînes
  const mat2 = new THREE.Group(); caisse.add(mat2);
  mat2.add(fixe(new THREE.Mesh(compacter(fusion([B(0.06, 2.0, 0.09, '#4a4c54', 0.235, 1.12, 1.03), B(0.06, 2.0, 0.09, '#4a4c54', -0.235, 1.12, 1.03), B(0.56, 0.07, 0.07, '#4a4c54', 0, 2.1, 1.03),
    C(0.06, 0.06, 0.12, 8, FONCE, 0, 2.1, 1.0, 'x'), B(0.025, 1.6, 0.02, '#26272b', 0.08, 1.3, 1.07), B(0.025, 1.6, 0.02, '#26272b', -0.08, 1.3, 1.07)])), MAT)));
  // le tablier : origine au-dessus des fourches (leur dessus, à la hauteur de levée), dosseret, deux fourches
  const tablier = new THREE.Group(); tablier.position.set(0, 0.08, 1.08); caisse.add(tablier);
  const T2 = [B(0.92, 0.36, 0.06, GRIS, 0, 0.27, -0.01)];
  for (const y of [0.62, 0.88, 1.12]) T2.push(B(0.92, 0.04, 0.04, FONCE, 0, y, -0.01));
  for (const x of [-0.44, -0.15, 0.15, 0.44]) T2.push(B(0.04, 0.72, 0.04, FONCE, x, 0.8, -0.01));
  for (const s of [1, -1]) T2.push(B(0.1, 0.56, 0.045, NOIR, s * 0.3, 0.255, 0.04), B(0.1, 0.045, 1.16, NOIR, s * 0.3, -0.0225, 0.62), B(0.1, 0.02, 0.06, NOIR, s * 0.3, -0.035, 1.2));
  tablier.add(fixe(new THREE.Mesh(compacter(fusion(T2)), MAT)));
  tablier.children[0].castShadow = true;
  // volant (il tourne), roues motrices à l'avant, directrices à l'arrière (sur leurs pivots)
  const support = new THREE.Group(); support.position.set(0, 1.33, 0.15); support.rotation.x = -0.8; caisse.add(fixe(support));
  const volant = new THREE.Mesh(compacter(fusion([teinter(new THREE.TorusGeometry(0.16, 0.018, 4, 12).rotateX(Math.PI / 2), '#1f1f23'), B(0.3, 0.02, 0.035, '#2a2a2e'), C(0.035, 0.035, 0.04, 8, JAUNE, 0, 0.01, 0), C(0.018, 0.018, 0.07, 6, '#2a2a2e', 0.12, 0.04, 0)])), MAT);
  support.add(volant);
  const rouesAv = [new THREE.Mesh(paire(roue(0.3, 0.22, 12, 1, true, '#c9ccd1'), roue(0.3, 0.22, 12, -1, true, '#c9ccd1'), 0.43), MAT)];
  rouesAv[0].position.set(0, 0.3, 0.62); rouesAv[0].castShadow = true; groupe.add(rouesAv[0]);
  const pivots = [1, -1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.38, 0.22, -0.72); groupe.add(g); return g; });
  const rouesAr = pivots.map((g, i) => { const m = new THREE.Mesh(roue(0.22, 0.17, 10, i ? -1 : 1, true, '#c9ccd1'), MAT); g.add(m); return m; });
  const gyro = gyrophare(caisse, 0, 2.2, -0.78);
  return {
    groupe, caisse, corps, mat2, tablier, volant, rouesAv, rouesAr, pivots, gyro,
    siege: new THREE.Vector3(0, CHARIOT.plancher - 0.62, -0.4),
    poste: { assise: CHARIOT.assise, plancher: CHARIOT.plancher, volant: new THREE.Vector3(0, 1.33, 0.15), rayon: 0.16, inclinaison: -0.8 },
  };
}
// Le transpalette du domaine (Teddy, 25/11/2026 : « un transpalette », rangé dans le hangar ; Marc s'en sert à la fin de
// la mission 3 pour rentrer les palox au chai) : un gerbeur électrique à plateforme, pour lever les palox du plateau de la
// remorque (1,06 m) : le bloc moteur et la batterie, le mât et son mât intérieur, le tablier et ses deux fourches (mêmes
// cotes que le chariot élévateur : FZ), les longerons et leurs galets sous les fourches, la plateforme où l'on se tient
// debout, ses gardes, le timon et sa poignée ; la roue motrice braque. Même interface que le chariot (Dechargement).
// Où se tient celui qui le conduit, et où vont ses mains sur la poignée (repère du transpalette ; repère du personnage).
export const TRANSPALETTE = { pied: new THREE.Vector3(0, 0, -0.52), mains: { d: [-0.17, 1.08, 0.3], g: [0.17, 1.08, 0.3] } };
export function transpalette() {
  const groupe = new THREE.Group(), caisse = new THREE.Group(); groupe.add(caisse);
  const OR = '#d9662a', MAT_C = '#3b3d44', at = new Atelier(), L = [];
  // le bloc moteur et la batterie, son capot, le tableau (clé, voyants), le bouton d'arrêt d'urgence
  L.push(peint(B(0.84, 1.02, 0.98, OR, 0, 0.66, 0.38), OR), B(0.86, 0.05, 1.0, FONCE, 0, 1.19, 0.38), B(0.86, 0.12, 1.0, FONCE, 0, 0.18, 0.38));
  L.push(B(0.36, 0.12, 0.2, '#2b2b30', 0, 1.25, -0.02), B(0.05, 0.03, 0.02, '#3ddc84', -0.08, 1.29, -0.12), C(0.035, 0.035, 0.05, 8, '#c0392b', 0.1, 1.3, -0.04));
  // la plateforme et ses deux gardes ; le timon (son bras, la poignée et ses deux poignées tournantes)
  L.push(B(0.64, 0.05, 0.5, '#2b2b30', 0, 0.12, -0.42), B(0.6, 0.012, 0.44, '#55585e', 0, 0.147, -0.42));
  for (const s of [1, -1]) { barre(at, [s * 0.38, 0.15, -0.2], [s * 0.38, 0.98, -0.2], 0.025, FONCE, 0); barre(at, [s * 0.38, 0.98, -0.2], [s * 0.38, 0.98, -0.7], 0.025, FONCE, 0); }
  barre(at, [0, 0.95, -0.12], [0, 1.08, -0.24], 0.035, NOIR, 0);
  L.push(B(0.46, 0.06, 0.07, NOIR, 0, 1.08, -0.25));
  for (const s of [1, -1]) L.push(C(0.032, 0.032, 0.1, 8, '#26272b', s * 0.2, 1.08, -0.25, 'x'));
  // le mât (deux montants, deux traverses, le vérin) ; les longerons sous les fourches et leurs galets
  for (const s of [1, -1]) L.push(B(0.075, 2.06, 0.12, MAT_C, s * 0.31, 1.13, 0.94));
  for (const y of [0.22, 2.13]) L.push(B(0.7, 0.08, 0.08, MAT_C, 0, y, 0.94));
  L.push(C(0.045, 0.045, 1.6, 8, '#8a9098', 0, 0.98, 0.88));
  for (const s of [1, -1]) L.push(B(0.13, 0.1, 1.32, FONCE, s * 0.47, 0.09, 1.55));
  const corps = fixe(new THREE.Mesh(compacter(fusion([...at.geos(), ...L])), MAT)); corps.castShadow = true; corps.receiveShadow = true; caisse.add(corps);
  // le mât intérieur
  const mat2 = new THREE.Group(); caisse.add(mat2);
  mat2.add(fixe(new THREE.Mesh(compacter(fusion([B(0.06, 1.95, 0.09, '#4a4c54', 0.235, 1.1, 0.99), B(0.06, 1.95, 0.09, '#4a4c54', -0.235, 1.1, 0.99), B(0.56, 0.07, 0.07, '#4a4c54', 0, 2.06, 0.99),
    B(0.025, 1.5, 0.02, '#26272b', 0.08, 1.25, 1.03), B(0.025, 1.5, 0.02, '#26272b', -0.08, 1.25, 1.03)])), MAT)));
  // le tablier : son dosseret, deux fourches (le palox posé : mêmes cotes que le chariot)
  const tablier = new THREE.Group(); tablier.position.set(0, 0.08, 1.08); caisse.add(tablier);
  const T2 = [B(0.8, 0.34, 0.06, GRIS, 0, 0.25, -0.01)];
  for (const x of [-0.38, 0, 0.38]) T2.push(B(0.04, 0.56, 0.04, FONCE, x, 0.6, -0.01));
  T2.push(B(0.8, 0.04, 0.04, FONCE, 0, 0.88, -0.01));
  for (const s of [1, -1]) T2.push(B(0.1, 0.45, 0.045, NOIR, s * 0.3, 0.2, 0.04), B(0.1, 0.045, 1.16, NOIR, s * 0.3, -0.0225, 0.62), B(0.1, 0.02, 0.06, NOIR, s * 0.3, -0.035, 1.2));
  tablier.add(fixe(new THREE.Mesh(compacter(fusion(T2)), MAT)));
  tablier.children[0].castShadow = true;
  // la roue motrice (elle braque), les galets sous les longerons ; un gyrophare
  const pivot = new THREE.Group(); pivot.position.set(0, 0.13, 0.35); groupe.add(pivot);
  const motrice = new THREE.Mesh(roue(0.13, 0.1, 10, 1, true, '#c9ccd1'), MAT); pivot.add(motrice);
  const galets = new THREE.Mesh(paire(roue(0.07, 0.08, 8, 1, false, '#c9ccd1'), roue(0.07, 0.08, 8, -1, false, '#c9ccd1'), 0.47), MAT);
  galets.position.set(0, 0.07, 2.12); groupe.add(galets);
  const gyro = gyrophare(caisse, 0.3, 1.24, 0.8);
  return { groupe, caisse, corps, mat2, tablier, volant: new THREE.Object3D(), rouesAv: [galets], rouesAr: [motrice], pivots: [pivot], gyro };
}
// la hauteur des fourches (le dessus des lames, au-dessus du sol) ; le mât intérieur suit au-delà de 1,2 m
function lever(ch, y) {
  ch.tablier.position.y = y;
  ch.mat2.position.y = Math.max(0, y - 1.2);
}
// L'étiqueteur s'assoit au volant du chariot (p : un Pieton), ou en descend, à côté, du côté gauche
export function asseoir(p, ch) {
  ch.caisse.add(p.m.groupe); p.m.groupe.position.copy(ch.siege); p.m.groupe.rotation.set(0, 0, 0);
  p.assis = true; p.poste = ch.poste; p.volant = 0; p.porte = null; p.v = 0; p.transition = null; p.salut = false; p.regard = null;
  p.pos.set(ch.groupe.position.x, 0, ch.groupe.position.z);
}
export function descendre(p, ch, scene) {
  const g = ch.groupe, h = g.rotation.y;
  scene.add(p.m.groupe);
  p.assis = false; p.poste = null; p.volant = undefined;
  p.placer(g.position.x + Math.cos(h) * 1.0, g.position.z - Math.sin(h) * 1.0, h + Math.PI / 2);
}

/* ---------------------------------------------------------------- le déchargement
   Le chariot part de sa place, vient au flanc de la remorque dételée (le côté tourné vers le hangar), rabat sa ridelle,
   glisse ses fourches sous un palox, le soulève, recule, le porte bas jusque derrière la grande porte, y fait demi-tour
   en deux temps, avance fourches devant jusqu'à sa place, l'y pose (en rang, deux par deux l'un sur l'autre), recule,
   refait demi-tour et ressort ; six fois. Le palox suit
   les fourches (rattaché au tablier) ; posé, il devient une boîte du décor (au sol seulement). maj(dt, t) ; fini ;
   avancement (de 0 à 1) ; finir() : tout de suite à la fin (une partie reprise). Chemins calculés une fois, au départ.
   ch : chariot() ; att : la remorque, dételée ; L : { chariot : sa place { x, z, h }, stock : six places { x, y, z, h }
   (le milieu du palox au sol, h : le cap du chariot qui le pose) } ; conducteur : un Pieton assis au volant (asseoir),
   ou null ; col, scene ; vite : vitesse de la scène. */
const V3 = new THREE.Vector3();
export class Dechargement {
  // L : la pose de départ du chariot (L.chariot), les places (L.stock) ; à l'imprimerie, la porte du hangar (L.porte) ; au
  // chai du domaine (L.chai : Marc et le transpalette, mission 3), l'autre manœuvre ; habille : les palox habillés
  constructor({ ch, att, L, conducteur = null, col, scene, vite = 1, habille = false }) {
    this.ch = ch; this.att = att; this.p = conducteur; this.col = col; this.scene = scene; this.vite = vite;
    this.x = L.chariot.x; this.z = L.chariot.z; this.h = L.chariot.h; this.y = 0.08; this.braq = 0; this.rotAv = 0; this.rotAr = 0;
    this.i = 0; this.T = 0; this.fini = false; this.rel = 0;
    this.boites = []; // les palox posés au sol, boîtes du décor (gardées : on pourra les retirer)
    // le palox sur les fourches (un maillage, rattaché au tablier) ; ceux posés dans le hangar (instances, un appel)
    this.porte = ombrePalox(new THREE.Mesh(geoPalox(habille), MAT)); this.porte.castShadow = true; this.porte.visible = false; ch.tablier.add(this.porte);
    this.stock = ombrePalox(new THREE.InstancedMesh(geoPalox(habille), MAT, 6)); this.stock.count = 0; this.stock.castShadow = true; this.stock.receiveShadow = true; this.stock.name = 'palox posés';
    scene.add(this.stock);
    const { RZ, PZ, BY } = REMORQUE, FZ = CHARIOT.FZ;
    att.r.groupe.updateMatrixWorld(true);
    // le côté de la remorque tourné vers les places du hangar ; le cap du chariot qui la regarde
    let sx = 0, sz = 0;
    for (const s of L.stock) { sx += s.x / L.stock.length; sz += s.z / L.stock.length; }
    const gx = Math.cos(att.h), gz = -Math.sin(att.h), cote = (sx - att.pos.x) * gx + (sz - att.pos.z) * gz >= 0 ? 1 : -1;
    const hf = Math.atan2(-cote * gx, -cote * gz), fx = Math.sin(hf), fz = Math.cos(hf);
    // les palox, du plus proche du milieu des places au plus loin ; chacun sa place (deux par deux, en rang)
    const palox = PZ.map((z, k) => { const w = att.versMonde(0, BY, z, { x: 0, y: 0, z: 0 }); return { k, x: w.x, z: w.z, y: w.y }; });
    palox.sort((a, b) => a.z - b.z || a.x - b.x);
    const places = L.stock.map((s, k) => ({ ...s, k })).sort((a, b) => a.z - b.z || a.y - b.y);
    const E = this.etapes = [];
    const pose = (x, z, h) => ({ x, z, h });
    let cur = pose(this.x, this.z, this.h);
    const route = (b, recul, v) => { const pts = chemin(cur.x, cur.z, cur.h, b.x, b.z, b.h, recul, 26), L2 = longueur(pts); E.push({ t: 'route', pts, recul, duree: 0.7 + L2 / v }); cur = b; };
    const droit = (b, recul, v) => { const pts = [[cur.x, cur.z], [b.x, b.z]]; E.push({ t: 'route', pts, recul, duree: 0.6 + Math.hypot(b.x - cur.x, b.z - cur.z) / v }); cur = b; };
    const fourches = (y, duree) => E.push({ t: 'fourches', y, duree });
    // le demi-tour en deux temps, juste derrière la grande porte : on y entre en marche arrière, palox devant, cap à l'est
    // (k0) ; on recule en braquant jusqu'à regarder le nord ou le sud (k1) ; on repart en avant, en tournant vers l'ouest,
    // jusqu'à la pile. Vers le sud pour les rangs du nord de la porte, vers le nord pour celui du sud.
    const PX = L.porte ? L.porte.x : 0;
    const tour = zj => (zj <= 27.7 ? { k0: pose(PX + 0.5, 27.5, Math.PI / 2), k1: pose(PX - 1.5, 29.5, Math.PI) } : { k0: pose(PX + 0.5, 27.8, Math.PI / 2), k1: pose(PX - 1.5, 25.8, 0) });
    E.push({ t: 'ridelle', cote, duree: 0.9 }, { t: 'gyro', on: true });
    if (L.chai) {
      // Au chai du domaine (Marc et le transpalette) : on prend le palox côté chai, on recule en quart de tour (le nez au
      // nord), on repart en avant vers la grande porte, on entre, le palox devant, et on le pose sur la pile, fourches vers
      // l'est (devant les cuves) ; on recule en quart de tour (le nez au nord), on ressort par la porte vers l'ouest.
      const kB = pose(L.chai.dehors.x, L.chai.dehors.z, Math.PI / 2), kC = pose(L.chai.retour.x, L.chai.retour.z, Math.PI), kD = pose(L.chai.dehors.x - 0.4, L.chai.dehors.z - 0.2, -Math.PI / 2);
      palox.forEach((P, n) => {
        const S = places[n], hs = S.h, sxs = Math.sin(hs), szs = Math.cos(hs);
        const prise = pose(P.x - fx * FZ, P.z - fz * FZ, hf), avant = pose(prise.x - fx * 1.75, prise.z - fz * 1.75, hf);
        const kA = pose(avant.x - fx * 2.1, avant.z + 2.2, Math.PI);
        const posee = pose(S.x - sxs * FZ, S.z - szs * FZ, hs), attente = pose(posee.x - sxs * 1.7, posee.z - szs * 1.7, hs);
        fourches(0.3, 0.5);
        if (n > 0) route(kD, false, 1.6);
        route(avant, false, 2.0);
        fourches(P.y + PALOX.plancher, 0.7);
        droit(prise, false, 0.9);
        E.push({ t: 'prendre', k: P.k }); fourches(P.y + PALOX.plancher + 0.16, 0.6);
        droit(avant, true, 0.9);
        fourches(0.3, 0.6);
        route(kA, true, 1.3);
        route(kB, false, 1.8);
        route(attente, false, 1.4);
        fourches(S.y + 0.04 + PALOX.plancher + 0.13, 0.7);
        droit(posee, false, 0.8);
        fourches(S.y + 0.04 + PALOX.plancher, 0.5); E.push({ t: 'poser', k: P.k, S });
        fourches(S.y + 0.04 + PALOX.plancher - 0.05, 0.3);
        droit(attente, true, 0.9);
        fourches(0.3, 0.5); route(kC, true, 1.3);
      });
    } else palox.forEach((P, n) => {
      const S = places[n], hs = S.h, sxs = Math.sin(hs), szs = Math.cos(hs), D = tour(S.z), dernier = n === palox.length - 1;
      const prise = pose(P.x - fx * FZ, P.z - fz * FZ, hf), avant = pose(prise.x - fx * 1.75, prise.z - fz * 1.75, hf);
      const posee = pose(S.x - sxs * FZ, S.z - szs * FZ, hs), attente = pose(posee.x - sxs * 1.6, posee.z - szs * 1.6, hs);
      fourches(0.3, 0.5);
      route(avant, false, 2.4);
      fourches(P.y + PALOX.plancher, 0.7); // le dessus des lames sous le plancher du palox, entre ses patins
      droit(prise, false, 0.9);
      E.push({ t: 'prendre', k: P.k }); fourches(P.y + PALOX.plancher + 0.16, 0.6);
      droit(avant, true, 0.9);
      fourches(0.3, 0.6);
      route(D.k0, true, 2.0);
      route(D.k1, true, 1.3);
      route(attente, false, 1.3);
      fourches(S.y + 0.04 + PALOX.plancher + 0.13, 0.7);
      droit(posee, false, 0.8);
      fourches(S.y + 0.04 + PALOX.plancher, 0.5); E.push({ t: 'poser', k: P.k, S });
      fourches(S.y + 0.04 + PALOX.plancher - 0.05, 0.3);
      droit(attente, true, 0.9);
      if (!dernier) { fourches(0.3, 0.5); route(D.k1, true, 1.3); }
    });
    fourches(0.08, 0.8);
    E.push({ t: 'gyro', on: false });
    this.duree = E.reduce((s, e) => s + (e.duree || 0), 0); this.fait = 0;
    this.placer();
    if (this.ch.boite) { col.retirer(this.ch.boite); this.ch.boite = null; }
  }
  get avancement() { return this.fini ? 1 : Math.min(1, this.fait / this.duree); }
  // le chariot à sa pose (x, z, h), ses roues, son volant, ses fourches ; le conducteur avec lui
  placer(dt = 0, t = 0) {
    const ch = this.ch;
    ch.groupe.position.set(this.x, sol(this.x, this.z), this.z); ch.groupe.rotation.y = this.h; // (sur la dalle : relief.js)
    lever(ch, this.y);
    for (const m of ch.rouesAv) m.rotation.x = this.rotAv;
    for (const m of ch.rouesAr) m.rotation.x = this.rotAr;
    for (const g of ch.pivots) g.rotation.y = this.braq;
    ch.volant.rotation.y = -this.braq * 4;
    if (ch.gyro.visible) ch.gyro.rotation.y += dt * 8;
    // le conducteur (assis, enfant du chariot) : animé seulement quand le chariot se voit (voirChariot)
    const p = this.p;
    if (p && ch.groupe.visible) { p.pos.set(this.x, 0, this.z); p.volant = -this.braq * 3; p.sync(dt, t); }
  }
  maj(dt, t) {
    if (this.fini) return;
    dt *= this.vite;
    const e = this.etapes[this.i];
    if (!e) { this.fin(); return; }
    this.T += dt;
    const u = e.duree ? Math.min(1, this.T / e.duree) : 1;
    if (e.t === 'route') this.rouler(e, u, dt);
    else if (e.t === 'fourches') { if (e.y0 === undefined) e.y0 = this.y; this.y = mix(e.y0, e.y, lisse(u)); }
    else if (e.t === 'ridelle') this.att.ridelleK[e.cote > 0 ? 0 : 1] = lisse(u);
    else if (e.t === 'gyro') this.ch.gyro.visible = e.on;
    else if (e.t === 'prendre') this.prendre(e.k);
    else if (e.t === 'poser') this.poser(e.k, e.S);
    if (e.t === 'ridelle') this.att.sync(0);
    this.placer(dt, t);
    if (u >= 1) { this.fait += e.duree || 0; this.i++; this.T = 0; if (e.t === 'fourches') e.y0 = undefined; }
  }
  // le long du chemin (départ et arrivée en douceur) ; cap : la tangente (marche arrière : à l'opposé) ; les roues
  // arrière braquent d'après la courbure
  rouler(e, u, dt) {
    const pts = e.pts, n = pts.length;
    if (!e.cum) { e.cum = [0]; for (let i = 1; i < n; i++) e.cum.push(e.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
    const cum = e.cum, Lt = cum[n - 1], s = lisse(u) * Lt;
    let i = 1; while (i < n - 1 && cum[i] < s) i++;
    const a = pts[i - 1], b = pts[i], f = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
    const ds = Math.hypot(x - this.x, z - this.z);
    if (Lt > 1e-3 && (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 > 1e-8) {
      const h = Math.atan2(b[0] - a[0], b[1] - a[1]) + (e.recul ? Math.PI : 0), dh = angle(h - this.h);
      this.braq = ds > 1e-4 ? borne(-Math.atan(1.34 * dh / ds) * (e.recul ? -1 : 1), -0.9, 0.9) : this.braq;
      this.h = angle(this.h + dh);
    }
    const sg = e.recul ? -1 : 1;
    this.rotAv += sg * ds / 0.3; this.rotAr += sg * ds / 0.22;
    this.x = x; this.z = z;
    if (u >= 1) this.braq *= 0.5;
  }
  // le palox k passe sur les fourches : il quitte la remorque, celui du tablier (au milieu des fourches, son plancher sur
  // elles) le remplace ; il garde son cap par rapport au chariot
  prendre(k) {
    montrerPalox(this.att.r, k, false);
    this.rel = angle(this.att.h - this.h);
    this.porte.position.set(0, -PALOX.plancher, CHARIOT.FZ - 1.08); this.porte.rotation.set(0, this.rel, 0); this.porte.visible = true;
  }
  // le palox posé à sa place S (au sol du hangar ou sur un autre) ; au sol, une boîte du décor
  poser(k, S) {
    const st = this.stock, n = st.count;
    M4.makeRotationY(S.h + this.rel).setPosition(S.x, S.y + 0.04, S.z);
    st.setMatrixAt(n, M4); st.count = n + 1; st.instanceMatrix.needsUpdate = true; st.computeBoundingSphere();
    if (S.y < 0.1) this.boites.push(this.col.boiteO(S.x, S.z, PALOX.w + 0.05, PALOX.l + 0.05, S.h + this.rel));
    this.porte.visible = false;
  }
  // tout de suite à la fin : les palox à leurs places, le chariot à sa dernière pose, fourches basses
  finir() {
    while (!this.fini) { const e = this.etapes[this.i]; if (!e) { this.fin(); break; } this.T = e.duree || 0; this.maj(e.duree ? e.duree / this.vite : 0, 0); }
  }
  // la nuit (mission 3) : les palox habillés sont repartis sur la remorque ; le hangar est vide
  vider() {
    this.stock.count = 0;
    for (const b of this.boites) this.col.retirer(b);
    this.boites.length = 0;
  }
  fin() {
    this.fini = true; this.ch.gyro.visible = false;
    const g = this.ch.groupe;
    this.ch.boite = this.col.boiteO(g.position.x + Math.sin(this.h) * 0.25, g.position.z + Math.cos(this.h) * 0.25, 1.2, 3.1, this.h);
  }
}
// Le chariot à sa place (au début du jeu), une boîte du décor ; voir : dessiné de près seulement
export function placerChariot(ch, P, col) {
  ch.groupe.position.set(P.x, sol(P.x, P.z), P.z); ch.groupe.rotation.y = P.h; lever(ch, 0.08);
  if (ch.boite) col.retirer(ch.boite);
  ch.boite = col.boiteO(P.x + Math.sin(P.h) * 0.25, P.z + Math.cos(P.h) * 0.25, 1.2, 3.1, P.h);
}
export function voirChariot(ch, cx, cz) { const dx = cx - ch.groupe.position.x, dz = cz - ch.groupe.position.z, vu = dx * dx + dz * dz < 8100; if (ch.groupe.visible !== vu) ch.groupe.visible = vu; }
