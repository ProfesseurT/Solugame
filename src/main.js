// Tournée générale : boucle de jeu, assemblage du monde, des personnages et de l'interface.
import * as THREE from 'three';
import { construireMonde, BRUME, SOLEIL } from './monde.js';
import { UNI, MAT, MAT_VITRE, compacter, indexer } from './modeles.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Collisions } from './collisions.js';
import { tracteur, van, voiture } from './engins.js';
import { perso, HEROS } from './perso.js';
import { Pieton, Passant } from './pieton.js';
import { Tracteur, Voiture, natureSol } from './vehicules.js';
import { Camera } from './camera.js';
import { Controles } from './controles.js';
import { Hud } from './hud.js';
import { Telephone } from './telephone.js';
import { PC } from './pc.js';
import { Mission } from './mission.js';
import { son } from './audio.js';
import { versAngle, hasard, $, lisse } from './outils.js';
import { Pilote, croisiere } from './pilote.js';
import { Gestes, pileCartons } from './gestes.js';
import { FIN, DIALOGUES, REPLIQUES_VERRE, CHOCS_VOITURE } from './textes.js';
import { Paliers } from './qualite.js';
import { Particules, Taches, Traces } from './particules.js';
import { Bureau } from './bureau.js';
import { Reseau, longueur } from './reseau.js';

const T0 = performance.now(); // mesures du démarrage (banc d'essai)
// Polices : la feuille de Google Fonts est préchargée sans bloquer la page (une feuille de style bloquante retenait tout le
// script du jeu jusqu'à son arrivée, une à deux secondes sur un réseau mobile lent). Le texte s'affiche aussitôt, la police
// arrive ensuite (display=swap). Les panneaux du décor sont dessinés avec des polices du système.
{ const l = $('polices'); if (l) l.rel = 'stylesheet'; }
const tactile = matchMedia('(pointer: coarse)').matches;
const stocke = { lire(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, ecrire(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* navigation privée */ } } };

/* ------------------------------------------------------------------ rendu */
const canvas = $('vue');
let renderer;
try {
  // anticrénelage (MSAA) sur ordinateur seulement, et pas sur un écran haute densité : l'image y est déjà calculée en double
  // résolution, le MSAA quadruplerait encore le travail de la carte graphique pour un gain invisible
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !tactile && (window.devicePixelRatio || 1) < 1.5, stencil: false, powerPreference: 'high-performance' });
} catch (e) {
  $('erreur').hidden = false;
  throw e;
}
renderer.shadowMap.enabled = true;
renderer.shadowMap.autoUpdate = false; // la carte d'ombre n'est recalculée que lorsqu'on le demande (voir boucle)
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.CustomToneMapping; // tons neutres + étalonnage heure dorée (modeles.js)
renderer.toneMappingExposure = 1.06;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(BRUME, 60, 290);
const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 1300);
const col = new Collisions();
const t0Monde = performance.now();
const monde = construireMonde(scene, col, { mobile: tactile });
// le décor ne bouge plus : ses matrices sont calculées une fois pour toutes (le ciel, lui, suit la caméra)
for (const o of scene.children) if (o !== monde.ciel) o.traverse(x => { if (x.isMesh || x.isLine) { x.updateMatrix(); x.matrixAutoUpdate = false; } });
const mesures = { debut: Math.round(T0), construction: Math.round(performance.now() - t0Monde) };
const L = monde.lieux;

/* ------------------------------------------------------------------ paliers de qualité (qualite.js) */
const paliers = new Paliers({
  renderer, scene, camera, monde, tactile, mesures, redimensionner,
  // réglages propres au jeu : au-delà de 1,6 fois la fin de la brume tout est couleur de brume, inutile de le dessiner
  regler(q) { monde.ciel.scale.setScalar((q.brume[1] * 1.6 + 60) * 0.9 / 800); regarder(); taches.mat.opacity = q.tache; },
});
// Jusqu'où la caméra dessine : loin dehors (la brume du palier) ; dans le bureau du chai, la pièce seulement (le monde
// extérieur, derrière les murs, n'est pas dessiné, ni le ciel)
let vueDedans = false;
function regarder(dedans = vueDedans) {
  vueDedans = dedans;
  camera.far = dedans ? 16 : paliers.q.brume[1] * 1.6 + 60; camera.updateProjectionMatrix();
  monde.ciel.visible = !dedans;
}
// Repère de la lumière (le même que celui de la caméra d'ombre) : on cale son centre sur la grille de texels
const LX = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SOLEIL).normalize();
const LY = new THREE.Vector3().crossVectors(SOLEIL, LX);
const DIR = new THREE.Vector3(), CIBLE = new THREE.Vector3();
let nOmbre = 0;

const rnd = hasard(7);
const pick = a => a[Math.floor(rnd() * a.length)];
const FEUILLES_CAB = [0xc2562e, 0xb0402c, 0xd0702f], FEUILLES_CHE = [0xe2b23a, 0xd9a832, 0xeac24a];
const GRAVIERS = [0xcfc1a0, 0xb9ab88, 0xe0d4b4], MOTTES = [0x6b4a30, 0x5a3e28, 0x7a5c3f];

/* ------------------------------------------------------------------ marque de mission */
const marque = new THREE.Group();
{
  const orange = '#ff7a2f';
  const anneau = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.85, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: orange, transparent: true, opacity: 0.9, depthWrite: false }));
  anneau.position.y = 0.14;
  const fleche = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 4).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: orange }));
  const faisceau = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 70, 18, 1, true).translate(0, 35, 0),
    new THREE.MeshBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
  marque.add(anneau, fleche, faisceau);
  marque.userData = { anneau, fleche };
  marque.visible = false;
  scene.add(marque);
}

/* ------------------------------------------------------------------ particules et ombres de contact (particules.js) */
const particules = new Particules(scene, camera, rnd), emettre = particules.emettre;
const taches = new Taches(scene);
const traces = new Traces(scene);

/* ------------------------------------------------------------------ personnages, tracteur, voitures */
let choixHeros = stocke.lire('tournee-generale-heros') === 'vigneronne' ? 'vigneronne' : 'vigneron';
let joueur = new Pieton(perso(HEROS[choixHeros]));
scene.add(joueur.m.groupe);
joueur.placer(L.depart.x, L.depart.z, L.depart.h);

// Les deux véhicules du domaine : le tracteur et le van. On livre avec l'un ou l'autre.
// tr (physique) et tm (modèle) désignent le véhicule courant : celui qu'on conduit, ou le dernier conduit.
const VEHICULES = [];
function creerVehicule(genre, modele, lieu, poste) {
  scene.add(modele.groupe);
  const p = new Tracteur(modele, genre);
  p.placer(lieu.x, lieu.z, lieu.h);
  const v = { genre, m: modele, p, poste };
  VEHICULES.push(v);
  return v;
}
const vTracteur = creerVehicule('tracteur', tracteur(), L.tracteur, null);
const mVan = van();
// poste de conduite du van pour l'animation : assise, plancher, volant (centre, rayon, inclinaison de la jante)
const vVan = creerVehicule('van', mVan, L.van, { assise: mVan.dims.assise, plancher: mVan.dims.plancher, volant: mVan.volantCentre, rayon: mVan.volantRayon, inclinaison: mVan.volantInclinaison });
vTracteur.p.autre = vVan.p; vVan.p.autre = vTracteur.p;
vTracteur.p.pos.veh = vTracteur.p; vVan.p.pos.veh = vVan.p; // les voitures voient leur emprise (vehicules.js, obstacles)
let veh = vTracteur, tr = veh.p, tm = veh.m;
const pilote = new Pilote(); // conduite assistée au doigt (pilote.js)

const PEAUX = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#d4a373'];
const CHEV = ['#2b1d0e', '#6b4423', '#b55239', '#d9c08c', '#c9c9c9', '#151515'];
const HAUTS = ['#c0392b', '#2e86de', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400', '#7f8c8d', '#e84393', '#34495e', '#f1ece2'];
const BAS = ['#2c3e50', '#34495e', '#5d4037', '#455a64', '#1e272e', '#6d4c41', '#8a7f6a'];
const unPassant = extra => perso({
  peau: pick(PEAUX), cheveux: pick(CHEV), coiffure: pick(['court', 'court', 'chauve', 'chignon', 'queue']), barbe: rnd() < 0.25,
  haut: pick(HAUTS), bas: pick(BAS), chapeau: rnd() < 0.2 ? 'beret' : rnd() < 0.12 ? 'casquette' : null, chapeauC: pick(['#1f2a44', '#3b3b3b', '#7a2233']),
  lunettes: rnd() < 0.2, ...extra,
});
// Les habitants du bourg (passants, clients, figurants assis) ne se voient pas depuis l'accueil : ils sont créés juste
// après la première image 3D, ou au plus tard au lancement de la partie. Le bouton Jouer s'allume d'autant plus tôt.
// Même ordre de création qu'avant (mêmes tirages au sort, mêmes tenues).
const passants = [], figurants = [], assis = [];
let peuple = false, peuplePrevu = false;
// les clients, devant chez eux (ils se tournent vers vous quand vous approchez), et des figurants assis
const CLIENTS_3D = {
  cave: { peau: '#e8b896', cheveux: '#9a9a9a', coiffure: 'chauve', barbe: true, haut: '#f0ece4', col: '#f0ece4', bas: '#2f2f35', tablier: '#3b2a26', lunettes: true },
  bar: { peau: '#b07a4f', cheveux: '#151515', coiffure: 'court', barbe: true, haut: '#1f3b4d', col: '#f2d488', bas: '#2c2c30', tablier: '#e9e3d6' },
  treille: { peau: '#f1c27d', cheveux: '#6b4423', coiffure: 'chignon', haut: '#f4f1ea', col: '#f4f1ea', bas: '#34343a', tablier: '#f4f1ea' },
  // l'épicier en retard de paiement, devant sa boutique, le chèque prêt
  epicerie: { peau: '#d9a27e', cheveux: '#5a4a3a', coiffure: 'court', barbe: true, haut: '#7a5c3f', col: '#e9e1cf', bas: '#2f3440', tablier: '#2f4a6b' },
  // le patron de l'Auberge du Moulin, le prospect, en veste de cuisine
  auberge: { peau: '#c68642', cheveux: '#2b1d0e', coiffure: 'court', haut: '#f4f1ea', col: '#f4f1ea', bas: '#2f2f35', tablier: '#5a6b2f' },
};
const VISAGE = new THREE.Vector3();
function peupler() {
  if (peuple) return;
  peuple = true;
  for (let i = 0; i < 7; i++) {
    const p = new Passant(unPassant(), L.place, rnd);
    scene.add(p.p.m.groupe);
    p.bulle = 0; p.cri = hud.etiquette('Hé !', 'bulle'); p.p.etq = p.cri;
    passants.push(p);
  }
  const client3D = id => {
    const p = new Pieton(perso(CLIENTS_3D[id])), l = L.figurants[id];
    scene.add(p.m.groupe); p.placer(l.x, l.z, l.h);
    figurants.push({ p, l, id });
  };
  for (const id of ['cave', 'bar', 'treille']) client3D(id);
  for (const s of [L.banc, ...L.terrasse.slice(0, 2)]) {
    const p = new Pieton(unPassant(s === L.banc ? { chapeau: 'beret', chapeauC: '#1f2a44', cheveux: '#c9c9c9' } : {}));
    p.assis = true;
    p.m.groupe.position.set(s.x, -0.34, s.z); p.m.groupe.rotation.y = s.h;
    p.sync(0, 0); p.pos.copy(p.m.groupe.position); p.etq = hud.etiquette('', 'bulle');
    scene.add(p.m.groupe); assis.push(p);
  }
  client3D('epicerie'); // créés en derniers : les autres gardent leurs tirages au sort (tenues)
  client3D('auberge');
}
// voitures garées (immobiles)
const voituresM = [];
// voitures garées : immobiles, fusionnées par quartier de 64 m (carrosseries, vitres), chaque quartier élagué hors champ
const garees = new Map();
for (const [x, z, r, c] of L.garees) {
  const m = voiture(c); m.position.set(x, 0, z); m.rotation.y = r; m.updateMatrix(); voituresM.push(m);
  const k = Math.floor(x / 64) + ',' + Math.floor(z / 64);
  if (!garees.has(k)) garees.set(k, [[], []]);
  garees.get(k)[0].push(m.userData.corps.clone().applyMatrix4(m.matrix)); garees.get(k)[1].push(m.userData.vitres.clone().applyMatrix4(m.matrix));
  const tourne = Math.abs(Math.sin(r)) > 0.5;
  const b = col.boiteC(x, z, tourne ? 3.9 : 1.75, tourne ? 1.75 : 3.9); b.haut = false;
}
for (const [gc, gv] of garees.values()) {
  const c = new THREE.Mesh(mergeGeometries(gc), MAT), v = new THREE.Mesh(mergeGeometries(gv), MAT_VITRE);
  c.castShadow = true; c.receiveShadow = true; c.name = 'voitures garées'; v.renderOrder = 3; v.name = 'vitres garées';
  scene.add(c, v);
}
const voitures = [];
[[-120, 1, 11], [60, -1, 10.5], [230, 1, 12], [-260, -1, 11.5]].forEach(([x, s, v], i) => {
  const c = ['#d64541', '#f2efe6', '#3867a8', '#6c8f4e'][i], m = voiture(c, undefined, true);
  scene.add(m); voituresM.push(m);
  const vo = new Voiture(m, x, s, v); vo.teinte = new THREE.Color(c).getHex(); // éclats de carrosserie à sa couleur
  voitures.push(vo);
});

// géométries finies : indexées (véhicules, voitures, cartons : chaque sommet calculé une fois), attributs compactés (deux
// fois moins de mémoire et de lectures pour la carte graphique). Le terrain (morceaux d'un même tampon) reste tel quel.
{
  const vues = new Set();
  scene.traverse(o => {
    if (!o.geometry || vues.has(o.geometry)) return;
    vues.add(o.geometry);
    if (!o.geometry.index && !o.isSkinnedMesh && o.geometry.drawRange.count === Infinity && o.material && o.material.flatShading) indexer(o.geometry, true);
    compacter(o.geometry);
  });
  mesures.persos = Math.round(performance.now() - T0);
}

/* ------------------------------------------------------------------ jeu */
const cam = new Camera(camera);
const hud = new Hud(monde.carte);
const ctrl = new Controles(canvas, $('stick'));
cam.lier(ctrl);

let dejaConduit = false;
const reseau = new Reseau(L.reseau); // routes et chemins : l'itinéraire d'un point à un autre (mission.js, pilote.js)
const jeu = {
  // longueur de la tournée des arrêts ids, au départ du domaine (sortie du chai) : écran Tournée du bureau
  longueurTournee(ids) {
    let l = 0, a = { x: L.route0[0], z: L.route0[1] };
    for (const id of ids) { const b = L.arrets[id]; l += longueur(reseau.itineraire(a, b)); a = b; }
    return l;
  },
  hud, lieux: L, vehicules: VEHICULES, reseau,
  get tr() { return tr; }, get tm() { return tm; }, get veh() { return veh; },
  basculerRadio() {
    const on = son.basculerRadio();
    stocke.ecrire('tournee-generale-radio', on ? 'on' : 'off');
    if (this.auVolant) hud.radio(on, tactile);
    return on;
  },
  auVolant: false, ventes: 0, minutes: 17 * 60 + 40, heureTxt: '17:40',
  get choixHeros() { return choixHeros; },
  get joueur() { return joueur; },
  distance(p) { const o = this.auVolant ? tr.pos : joueur.pos; return Math.hypot(o.x - p.x, o.z - p.z); },
  dansChai: false, // dans la halle du chai, ou sur son seuil : la caméra est posée au fond de la halle
  // devant la grande porte du chai, dans son axe, ou déjà dedans (mission.js : le chargement commence)
  get devantChai() { const o = this.auVolant ? tr.pos : joueur.pos; return this.dansChai || (o.x > -84 && o.x < -64.3 && Math.abs(o.z + 52) < 3); },
  changerHeros(h) {
    if (h === choixHeros || !HEROS[h] || gestes.actif) return;
    choixHeros = h; stocke.ecrire('tournee-generale-heros', h);
    const ancien = joueur;
    joueur = new Pieton(perso(HEROS[h]));
    joueur.pos.copy(ancien.pos); joueur.h = ancien.h; joueur.assis = ancien.assis;
    ancien.m.groupe.removeFromParent();
    ancien.m.groupe.traverse(o => { if (o.isSkinnedMesh) { o.geometry.dispose(); o.skeleton.dispose(); } });
    if (this.auVolant) { tm.caisse.add(joueur.m.groupe); joueur.m.groupe.position.copy(tm.siege); }
    else scene.add(joueur.m.groupe);
    joueur.sync(0, temps);
    for (const b of document.querySelectorAll('.perso')) b.setAttribute('aria-pressed', String(b.dataset.h === h));
  },
  finVue: false,
  finDemo() { $('fin').hidden = false; this.finVue = true; ctrl.relacher(); },
};
const tel = new Telephone(jeu);
const mission = new Mission(jeu);
const pc = new PC(jeu);
const gestes = new Gestes({ jeu, scene, col, porte: monde.porteBureau }); // monter, descendre, porter les cartons, le bureau du chai (gestes.js)
// la palette des commandes du jour dans le chai : les piles prévues par la mission, en carré (mission.js les montre signées)
{
  const pal = new THREE.Group(); pal.position.set(L.palette.x, 0, L.palette.z); scene.add(pal);
  const off = [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]];
  mission.palette = mission.pilesPrevues().map((p, i) => {
    const g = pileCartons(p.n); g.position.set(off[i][0], L.palette.y + 0.14, off[i][1]); g.visible = false; pal.add(g); // montrée une fois signée
    return { ...p, groupe: g };
  });
}
jeu.tel = tel; jeu.mission = mission; jeu.pc = pc; jeu.gestes = gestes;

// étiquettes posées dans le monde
const etqMonter = hud.etiquette(tactile ? 'Monter' : 'Monter (E)', 'action', () => agir());
const etqServir = hud.etiquette(tactile ? 'Servir un verre' : 'Servir un verre (E)', 'action');
const etqDescendre = hud.etiquette(tactile ? 'Descendre' : 'Descendre (E)', 'action', () => agir());
const etqCible = hud.etiquette('', 'cible');
// le bureau du chai (bureau.js) : ses étiquettes, le chèque posé sur le bureau en bois
const bureau = new Bureau({ jeu, monde, scene, gestes, hud, ctrl, cam, mission, pc, tel, tactile, regarder });
const ETQ_ACTION = [...bureau.etiquettes, etqServir, etqMonter, etqDescendre]; // celles qui se touchent (toucher)
for (const v of voitures) v.cri = hud.etiquette('Tût tût !', 'bulle');
// le choix de la radio est gardé d'une partie à l'autre ; son bandeau se touche pour la couper ou la rallumer
son.radioCoupee = stocke.lire('tournee-generale-radio') === 'off';
$('radio').addEventListener('click', e => { e.stopPropagation(); if (jeu.auVolant) { son.jouer('tap'); jeu.basculerRadio(); } });

// point de sortie des gaz d'échappement : la cheminée verticale du tracteur, le pot bas à l'arrière du van
function echappement(sx, sz) {
  if (veh.genre === 'van') return [tr.pos.x - sx * 2.3 + sz * 0.45, 0.35, tr.pos.z - sz * 2.3 - sx * 0.45];
  return [tr.pos.x + sx * 1.45 + sz * 0.3, 2.55, tr.pos.z + sz * 1.45 - sx * 0.3];
}
// En dérapage : traces de pneus sur l'asphalte et les pavés, fumée des pneus (ou poussière ailleurs) derrière les roues arrière
const POUSSIERE = { gravier: 0xcfc1a0, herbe: 0x9a8f6a, vigne: 0x7a5c3f };
function derapage(dt) {
  const g = tr.glisse, D = tr.d;
  if (g < 0.18 || Math.abs(tr.v) + Math.abs(tr.vT) < 1.5) { traces.lever(); return; }
  const fx = Math.sin(tr.h), fz = Math.cos(tr.h), zr = D.zAr ?? -0.9, xr = D.xAr ?? 0.98, dur = tr.sol === 'asphalte' || tr.sol === 'paves';
  for (let k = 0; k < 2; k++) {
    const s = k ? -1 : 1, x = tr.pos.x + fx * zr + fz * xr * s, z = tr.pos.z + fz * zr - fx * xr * s;
    if (dur) traces.marquer(k, x, z, veh.genre === 'van' ? 0.22 : 0.4); else traces.lever();
    if (rnd() < dt * 26 * g) emettre(x, 0.25, z, (rnd() - 0.5) * 0.8, 0.5 + rnd() * 0.6, (rnd() - 0.5) * 0.8, 1.1, dur ? 0xd9d5cc : POUSSIERE[tr.sol] ?? 0xcfc1a0, dur ? 1.1 : 0.9, -0.25);
  }
}
// le véhicule à portée de main (le plus proche, à moins de 5 m), ou null
function vehiculeProche() {
  let best = null, dmin = 5;
  for (const v of VEHICULES) { const d = Math.hypot(joueur.pos.x - v.p.pos.x, joueur.pos.z - v.p.pos.z); if (d < dmin) { dmin = d; best = v; } }
  return best;
}
// Installé au volant (fin de la montée, gestes.js) : le moteur démarre
function auVolant(v) {
  veh = v; tr = v.p; tm = v.m;
  jeu.auVolant = true;
  joueur.poste = v.poste; joueur.assis = true; joueur.v = 0; joueur.sync(0, temps);
  son.jouer('moteur-on'); son.radio(true); hud.radio(son.radioAllumee, tactile);
  if (tactile && !dejaConduit) { dejaConduit = true; hud.dire(DIALOGUES.conduite); }
  const sx = Math.sin(tr.h), sz = Math.cos(tr.h), [ex, ey, ez] = echappement(sx, sz);
  for (let i = 0; i < 8; i++) emettre(ex, ey, ez, (rnd() - 0.5) * 0.6, 1.2 + rnd(), (rnd() - 0.5) * 0.6, 0.9, 0x7d7a85, 1, -0.4);
}
// On monte (gestes.js : on va à la portière ou au marchepied, on s'installe), puis le moteur démarre
function monter(v) {
  if (gestes.actif) return;
  veh = v; tr = v.p; tm = v.m;
  ctrl.relacher();
  gestes.monter(v, () => auVolant(v));
}
// Le véhicule reste à l'arrêt (il repartait seul), moteur et radio coupés
function couperMoteur() { tr.v = 0; tr.vT = 0; tr.fm = 0; tr.pedale = 0; tr.frein = 0; son.radio(false); son.moteur(false, 0); }
const aPied = () => { jeu.auVolant = false; };
// On coupe le moteur, puis on descend à gauche (gestes.js)
function descendre() {
  if (gestes.actif) return;
  couperMoteur(); ctrl.relacher();
  gestes.descendre(veh, aPied, () => {});
}
// Les cartons (mission.js) : charger ceux de la palette du chai, décharger ceux d'un client, puis remonter au volant
let accelerVu = false;
// Au chai : les portes s'ouvrent, le véhicule entre tout seul jusqu'à la palette, on charge dedans, il ressort en marche
// arrière dans la cour, le nez vers le chemin du domaine (gestes.js : rouler). La caméra est posée dans la halle.
function cheminEntree(x0, z0, h0, D) { // déjà sur le seuil ou dedans : droit vers la place, sans repasser par la porte
  const P3 = x0 < -78.3 ? [-77.8, D.z] : [D.x, D.z], c = Math.max(1, Math.hypot(P3[0] - x0, P3[1] - z0) * 0.45);
  const P1 = [x0 + Math.sin(h0) * c, z0 + Math.cos(h0) * c], P2 = [P3[0] - c, P3[1]], pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, d = 3 * (1 - t) * t * t, e = t ** 3;
    pts.push([a * x0 + b * P1[0] + d * P2[0] + e * P3[0], a * z0 + b * P1[1] + d * P2[1] + e * P3[1]]);
  }
  for (let x = P3[0] + 0.5; x < D.x; x += 0.5) pts.push([x, D.z]);
  pts.push([D.x, D.z]);
  return pts;
}
function cheminSortie(D) { // tout droit hors de la porte, puis en arc ; finit au départ de la tournée (lieux.route0)
  const pts = [];
  for (let x = D.x; x > -79.6; x -= 0.5) pts.push([x, D.z]);
  for (let i = 0; i <= 20; i++) { const f = i / 20 * 2.2; pts.push([-79.6 - 4 * Math.sin(f), D.z - 4 * (1 - Math.cos(f))]); }
  return pts;
}
jeu.auChai = false;
jeu.charger = (piles, place, fin) => {
  const v = veh, p = v.p, D = L.chaiDedans, x0 = p.pos.x, z0 = p.pos.z, h0 = p.h;
  if (!accelerVu) { accelerVu = true; hud.dire(DIALOGUES.accelerer(tactile)); }
  jeu.auChai = true; cam.pret = false;
  const entree = cheminEntree(x0, z0, h0, D);
  p.pos.set(D.x, 0, D.z); p.h = D.h; // les gestes se calculent le véhicule à sa place, dans le chai
  gestes.charger(v, piles, { sorti: aPied, place, installe: () => auVolant(v) },
    [gestes.rouler(v, entree, 4.4), { action: couperMoteur }],
    [gestes.rouler(v, cheminSortie(D), 5.4, true), { action: () => { jeu.auChai = false; cam.pret = false; cam.yaw = p.h; fin(); } }]);
  p.pos.set(x0, 0, z0); p.h = h0;
};
jeu.decharger = (f, cols, ajout, fin) => { couperMoteur(); gestes.decharger(veh, f, cols, { sorti: aPied, ajout, fin }); };
// À l'épicerie : arrêté devant, on descend, on va au comptoir, l'épicier parle et donne le chèque, on remonte ; à pied, on
// va seulement au comptoir (gestes.js : cheque)
jeu.chercherCheque = (f, dialogue, recu) => {
  const v = jeu.auVolant ? veh : null;
  if (v) couperMoteur();
  gestes.cheque(v, f, { sorti: aPied, installe: () => auVolant(v), dire: fin => hud.dire(dialogue, fin), recu });
};
jeu.remonter = v => { if (!jeu.auVolant && !gestes.actif) gestes.remonter(v, () => auVolant(v)); };
function agir() {
  if (tel.ouvert || pc.ouvert || jeu.finVue || etat !== 'jeu' || joueur.service || gestes.actif) return; // pas pendant un geste
  if (bureau.agir()) return; // la porte, le chèque, le portable (bureau.js)
  if (jeu.auVolant) { if (Math.abs(tr.v) < 1.5) descendre(); return; }
  if (servable) { servir(servable); return; }
  const v = vehiculeProche();
  if (v) monter(v);
}
const proj = new THREE.Vector3();
function toucher(tp) {
  if (tel.ouvert || pc.ouvert || gestes.actif) return;
  for (const e of ETQ_ACTION) {
    if (e.el.hidden) continue;
    const r = e.el.getBoundingClientRect();
    if (tp.x > r.left - 12 && tp.x < r.right + 12 && tp.y > r.top - 12 && tp.y < r.bottom + 12) { agir(); return; }
  }
  const v = !jeu.auVolant && !jeu.dedans && !joueur.service && vehiculeProche();
  if (!v) return;
  proj.set(v.p.pos.x, 1.6, v.p.pos.z).project(camera);
  const sx = (proj.x + 1) / 2 * largeur, sy = (1 - proj.y) / 2 * hauteurE;
  if (proj.z < 1 && Math.hypot(sx - tp.x, sy - tp.y) < 95) monter(v);
}

/* ------------------------------------------------------------------ boucle */
let etat = 'accueil', temps = 0, tSon = 0, pasPrec = 0, tEtq = 0, largeur = 1, hauteurE = 1;
let camLibre = false, minuteAff = -1;
const DANGER = { x: 0, z: 0, v: 0 }, OBSTACLES = [null, null, null];
// les véhicules du domaine, même garés, sont des obstacles : on repousse un cercle (x, z, r) hors de leurs deux cercles
function horsDesVehicules(p, r) {
  for (const { p: e } of VEHICULES) {
    const ax = Math.sin(e.h), az = Math.cos(e.h);
    for (const off of e.d.off) {
      const cx = e.pos.x + ax * off, cz = e.pos.z + az * off;
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz, R = e.d.r + r;
      if (d2 < R * R) { const d = Math.sqrt(d2) || 0.001; p.x = cx + dx / d * R; p.z = cz + dz / d * R; }
    }
  }
}
// À pied contre une voiture qui roule : on est repoussé (petit saut de côté si elle va vite), elle pile et klaxonne
function horsDesVoitures() {
  const j = joueur;
  for (const v of voitures) {
    for (let k = -1; k <= 1; k += 2) {
      const cx = v.x + k * 1.1 * v.sens, dx = j.pos.x - cx, dz = j.pos.z - v.z, d2 = dx * dx + dz * dz, R = 1.0 + j.r;
      if (d2 >= R * R) continue;
      const d = Math.sqrt(d2) || 0.001;
      j.pos.x = cx + dx / d * R; j.pos.z = v.z + dz / d * R;
      if (v.v > 1.5) { j.sauter(dx / d, dz / d); v.cogner(j, -dx / d, -dz / d, 0.3); }
      else if (!v.klaxon) { v.klaxon = true; son.jouer('klaxon'); v.cri.el.textContent = 'Tût tût !'; v.cri.t = 1.6; v.cri.vu = true; }
    }
  }
}

/* ------------------------------------------------------------------ servir un verre de vin aux passants
   À pied, près d'un passant (ou d'un figurant assis à la terrasse) : « Servir un verre ». On verse, on tend le verre,
   il trinque et boit. Une fois par personne et par minute. */
let servable = null;          // le Pieton qu'on peut servir, ou null
let nVerres = 0;
const SERVICE = 3.2;          // durée du geste (s)
// les passants, les figurants assis ; le prospect, le temps de la dégustation (mission.js)
function candidats(f) { for (const p of passants) f(p.p, 2.1); for (const p of assis) f(p, 2.5); for (const x of figurants) if (x.p.servable) f(x.p, 2.4); }
jeu.prospectServable = on => { for (const x of figurants) if (x.id === 'auberge') x.p.servable = on; };
let dServable = 1e9;
function essayerServable(p, portee) {
  if (p.verre > 0 || p.sautT > 0 || (p.servi && temps - p.servi < 60)) return;
  const d = Math.hypot(p.pos.x - joueur.pos.x, p.pos.z - joueur.pos.z);
  if (d < portee && d < dServable) { dServable = d; servable = p; }
}
function chercherServable() {
  servable = null;
  if (jeu.auVolant || tel.ouvert || pc.ouvert || joueur.service || joueur.sautT > 0 || gestes.actif) return;
  dServable = 1e9;
  candidats(essayerServable);
}
function servir(p) {
  joueur.service = { t: 0, duree: SERVICE, cible: p, donne: false };
  p.aServir = true; p.servi = temps;
  joueur.h = Math.atan2(p.pos.x - joueur.pos.x, p.pos.z - joueur.pos.z); joueur.v = 0;
  son.jouer('bouchon');
  if (nVerres === 0 && !p.servable) hud.dire(DIALOGUES.verre);
}
// le geste avance ; au bon moment le verre change de main ; celui qui boit le garde quelques secondes
function majService(dt) {
  const S = joueur.service;
  if (S) {
    S.t += dt;
    const p = S.cible;
    p.h = versAngle(p.h, Math.atan2(joueur.pos.x - p.pos.x, joueur.pos.z - p.pos.z), dt * 6);
    if (S.t > SERVICE * 0.2 && !S.verse) { S.verse = true; son.jouer('verser'); }
    if (S.t > SERVICE * 0.8 && !S.donne) { S.donne = true; p.verre = 5; p.tVerre = 0; p.aServir = false; nVerres++; if (p.servable) mission.degustee(); }
    if (S.t >= SERVICE) joueur.service = null;
  }
  dtVerre = dt;
  candidats(boire);
}
// celui qui a reçu un verre le boit ; il trinque au bout de 0,6 s
let dtVerre = 0;
function boire(p) {
  if (!(p.verre > 0)) return;
  const avant = p.tVerre;
  p.tVerre += dtVerre; p.verre -= dtVerre;
  if (avant < 0.6 && p.tVerre >= 0.6) {
    son.jouer('tchin');
    const b = p.etq;
    if (b) { b.el.textContent = pick(REPLIQUES_VERRE); b.t = 2.4; b.vu = true; }
  }
  if (p.verre <= 0) p.verre = 0;
}

function miseAJour(dt) {
  const dtm = tel.ouvert || pc.ouvert ? dt * 0.3 : dt;
  for (const a of ctrl.actions) {
    if (a === 'agir') agir();
    else if (a === 'tel' && $('fin').hidden && !pc.ouvert) tel.basculer();
    else if (a === 'son') son.basculer();
    else if (a === 'radio') jeu.basculerRadio();
    else if (a === 'echap' && tel.ouvert && mission.peutFermer()) tel.fermer();
    else if (a === 'echap' && pc.ouvert) { pc.fermer(); mission.fermerPC(); jeu.leverPortable(); }
  }
  ctrl.actions.length = 0;
  for (const tp of ctrl.touchers) toucher(tp);
  ctrl.touchers.length = 0;

  // entrées, dans le repère de la caméra
  let ix = ctrl.jx + ctrl.kx, iy = ctrl.jy + ctrl.ky;
  if (tel.ouvert || pc.ouvert || !$('fin').hidden) ix = iy = 0;
  const force = Math.min(1, Math.hypot(ix, iy));
  const a = cam.yaw, fx = Math.sin(a), fz = Math.cos(a);
  let wx = fx * -iy - fz * ix, wz = fz * -iy + fx * ix;
  const wl = Math.hypot(wx, wz) || 1; wx /= wl; wz /= wl;

  joueur.telephone = tel.ouvert; // le personnage lève son téléphone quand on l'ouvre
  bureau.avant(); // assis au portable : les mains sur le clavier ; après un appel passé depuis le portable, on y revient
  if (gestes.actif) {
    // un geste se joue (monter, descendre, porter les cartons) : il mène le personnage ; le véhicule reste à l'arrêt.
    // Doigt posé ou touche de direction enfoncée : une scène de cartons se joue trois fois plus vite.
    const vite = gestes.cadre && (ctrl.id !== null || ctrl.kx || ctrl.ky) ? 3 : 1;
    gestes.update(dtm * vite, temps);
    if (jeu.auVolant && !gestes.roule) tr.update(dtm, 0, 0, col, voitures, temps); // (le véhicule qui roule tout seul : gestes.js)
  } else if (jeu.auVolant) {
    let gaz = 0, braq = 0, fm = false;
    const libre = !tel.ouvert && !pc.ouvert && !jeu.finVue;
    pilote.prendre(mission.route);
    jeu.pilote = false;
    if (ctrl.clavier && libre) { gaz = -ctrl.ky; braq = -ctrl.kx; }
    else if (ctrl.id !== null && libre) {
      // Au doigt : doigt posé = on avance. Sur l'itinéraire de la mission, le véhicule le suit tout seul (vitesse réglée,
      // arrêt à destination). Glisser sur le côté : on tourne soi-même ; vers le bas : freiner, puis reculer ;
      // vers le haut : un peu plus vite.
      const sx = ctrl.jx, sy = ctrl.jy, ax = Math.abs(sx), tourne = ax > 0.2;
      const volant = tourne ? -Math.sign(sx) * Math.pow((ax - 0.2) / 0.8, 1.2) : 0;
      // vers le bas : freiner ; vers le bas et sur le côté, lancé : frein à main, le véhicule part en dérapage
      if (sy > 0.45) { gaz = -Math.min(1, (sy - 0.45) / 0.4); braq = volant; if (ax > 0.35 && tr.v > 4) { fm = true; gaz *= 0.3; } }
      else {
        const auto = tourne ? null : pilote.commande(tr, veh.genre, mission.cible, voitures, col);
        if (auto) { gaz = auto.gaz; braq = auto.braq; jeu.pilote = true; }
        else {
          braq = volant;
          const vc = croisiere(veh.genre) * (sy < -0.4 ? 1.35 : 1) * (1 - 0.45 * Math.abs(braq)) * (tr.vignes ? 0.45 : 1);
          gaz = Math.max(-1, Math.min(1, (vc - tr.v) * 0.9));
        }
      }
    } else if (tactile && libre) gaz = tr.v > 0.3 ? -0.5 : 0; // doigt levé : on s'arrête en douceur
    if (ctrl.fm && libre) fm = true;
    tr.update(dtm, gaz, braq, col, voitures, temps, fm);
    derapage(dtm);
    joueur.volant = tr.braq; // les mains suivent la direction
    joueur.pos.copy(tr.pos); joueur.sync(dtm, temps);
    if (tr.chocVu > 0.15) { son.jouer('choc'); cam.secousse = tr.chocVu; try { navigator.vibrate?.(40); } catch (_) { /* rien */ } }
    // fumée d'échappement et feuilles quand on roule dans les vignes
    const sx = Math.sin(tr.h), sz = Math.cos(tr.h);
    if (rnd() < dtm * (3 + Math.abs(tr.v) * 0.4)) {
      const [ex, ey, ez] = echappement(sx, sz), k = veh.genre === 'van' ? -0.3 : 0.8;
      emettre(ex, ey, ez, sx * tr.v * k + (rnd() - 0.5) * 0.4, (veh.genre === 'van' ? 0.3 : 1) + rnd() * 0.6, sz * tr.v * k + (rnd() - 0.5) * 0.4, 0.7, 0x8a8790, veh.genre === 'van' ? 0.5 : 0.75, -0.3);
    }
    if (tr.vignes && Math.abs(tr.v) > 0.8 && rnd() < dtm * 30) {
      let c = null;
      for (const q of col.parcelles) if (tr.pos.x > q.x0 - 2 && tr.pos.x < q.x1 + 2 && tr.pos.z > q.z0 - 2 && tr.pos.z < q.z1 + 2) { c = q; break; }
      const teinte = c && c.cep === 'cabernet' ? pick(FEUILLES_CAB) : pick(FEUILLES_CHE);
      emettre(tr.pos.x + (rnd() - 0.5) * 2, 1.2 + rnd(), tr.pos.z + (rnd() - 0.5) * 2, (rnd() - 0.5) * 3, 2 + rnd() * 2, (rnd() - 0.5) * 3, 2.2, teinte, 0.9, 5);
    }
    tSon -= dt;
    if (tSon <= 0) { tSon = 0.1; son.moteur(true, tr.v, tr); }
    // gravillons projetés sur le gravier, mottes de terre dans les vignes, derrière les roues arrière
    const avr = Math.abs(tr.v);
    if ((tr.sol === 'gravier' || tr.sol === 'vigne') && avr > 1.5 && rnd() < dtm * avr * 1.2) {
      const cote = rnd() < 0.5 ? 0.98 : -0.98, bx = tr.pos.x - sx * 1.3 + sz * cote, bz = tr.pos.z - sz * 1.3 - sx * cote;
      const gr = tr.sol === 'gravier', k = gr ? 0.25 : 0.35;
      emettre(bx, 0.3, bz, -sx * tr.v * k + (rnd() - 0.5), 1.2 + rnd() * 1.6, -sz * tr.v * k + (rnd() - 0.5), 0.9, gr ? pick(GRAVIERS) : pick(MOTTES), gr ? 0.4 : 0.7, 9);
    }
  } else {
    // en train de servir : on ne bouge pas
    if (joueur.service) joueur.update(dtm, 0, 0, 0, false, col, temps);
    else joueur.update(dtm, wx, wz, force, ctrl.courir, col, temps);
    horsDesVehicules(joueur.pos, joueur.r);
    horsDesVoitures();
    // un pas chaque fois qu'un pied se pose (jambe au bout de son balancement)
    const pp = Math.floor(joueur.anim.ph * 2); // la foulée (anim.js) fait deux pas par cycle
    if (pp !== pasPrec) { pasPrec = pp; if (joueur.v > 0.5) son.pas(natureSol(joueur.pos.x, joueur.pos.z, col), joueur.v); }
  }
  const ego = jeu.auVolant ? tr.pos : joueur.pos;
  son.ambiance(dt, ego.x, ego.z, jeu.minutes, !jeu.auVolant);

  // la vie du bourg
  if (jeu.auVolant) { DANGER.x = tr.pos.x; DANGER.z = tr.pos.z; DANGER.v = tr.v; DANGER.h = tr.h; }
  const danger = jeu.auVolant ? DANGER : null;
  for (const p of passants) {
    if (p.update(dtm, danger, col, temps)) { p.cri.el.textContent = 'Hé !'; p.cri.t = 1.6; p.cri.vu = true; }
    horsDesVehicules(p.p.pos, 0.34);
    if (p.cri.vu) hud.placer(p.cri, p.p.pos.x, 2.3, p.p.pos.z, true);
  }
  // les clients se tournent vers vous, vous regardent et font signe quand vous arrivez
  for (const { p, l } of figurants) {
    const pres = Math.hypot(p.pos.x - ego.x, p.pos.z - ego.z) < 12;
    p.h = pres ? Math.atan2(ego.x - p.pos.x, ego.z - p.pos.z) : l.h;
    p.salut = pres; p.regard = pres ? VISAGE.set(ego.x, jeu.auVolant ? 2.4 : 1.6, ego.z) : null;
    p.sync(dtm, temps);
  }
  for (const p of assis) { p.sync(dtm, temps); if (p.etq && p.etq.vu) hud.placer(p.etq, p.m.groupe.position.x, 1.9, p.m.groupe.position.z, true); }
  majService(dtm);
  const obstacles = OBSTACLES; obstacles[0] = ego; obstacles[1] = vTracteur.p.pos; obstacles[2] = vVan.p.pos;
  for (const v of voitures) {
    if (v.update(dtm, obstacles, voitures)) {
      if (Math.hypot(v.x - ego.x, v.z - ego.z) < 50) { son.jouer('klaxon'); v.cri.el.textContent = 'Tût tût !'; v.cri.t = 1.6; v.cri.vu = true; }
    }
    // touchée : secousse (vehicules.js), choc, éclats de carrosserie, le conducteur râle
    if (v.cogne) {
      v.cogne = false;
      if (v.choc > 0.3) {
        son.jouer('choc'); son.jouer('klaxon');
        v.cri.el.textContent = pick(CHOCS_VOITURE); v.cri.t = 2.4; v.cri.vu = true;
        for (let i = 0; i < 10; i++) emettre(v.x + (rnd() - 0.5) * 1.5, 0.6 + rnd() * 0.5, v.z + (rnd() - 0.5) * 1.5, (rnd() - 0.5) * 3, 1.5 + rnd() * 2, (rnd() - 0.5) * 3, 1.4, rnd() < 0.5 ? v.teinte : 0x2a2a2e, 0.5, 9);
      }
    }
    if (v.cri.vu) hud.placer(v.cri, v.x, 2.4, v.z, true);
  }

  particules.fontaine(dtm, L.fontaine);

  mission.update(dt);
  tel.update(dt);
  pc.update(dt);

  // horloge : une minute de jeu toutes les 2 secondes
  jeu.minutes += dtm / 2;
  const m = Math.floor(jeu.minutes);
  if (m !== minuteAff) { // le texte n'est refait qu'une fois par minute de jeu
    minuteAff = m;
    jeu.heureTxt = String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    hud.heure(jeu.heureTxt);
  }

  // marque de mission et étiquettes
  const cible = mission.cible;
  marque.visible = !!cible && !jeu.dedans;
  if (cible) {
    marque.position.set(cible.x, 0, cible.z);
    const u = marque.userData, k = 1 + Math.sin(temps * 4) * 0.06;
    u.anneau.scale.set(k, 1, k); u.fleche.position.y = 3.2 + Math.sin(temps * 3) * 0.35; u.fleche.rotation.y = temps * 1.6;
    tEtq -= dt;
    if (tEtq <= 0) {
      tEtq = 0.25;
      const d = Math.round(Math.hypot(cible.x - ego.x, cible.z - ego.z));
      etqCible.el.textContent = mission.nomCible + ' · ' + d + ' m';
    }
  }
  hud.placer(etqCible, cible ? cible.x : 0, 4.6, cible ? cible.z : 0, !!cible && !tel.ouvert && !jeu.dedans);
  // le bureau du chai : ses étiquettes (les autres s'effacent devant elles), la pièce dessinée seulement si on la voit
  const pcPres = bureau.maj();
  // la grande porte du chai : ouverte quand on vient charger, ou qu'on s'en approche ; la halle n'est dessinée que de près
  {
    const PC = monde.porteChai, etC = mission.aCharger.length > 0 || mission.etape === 'chargement';
    const ouvrir = jeu.auChai || jeu.dansChai || (etC && jeu.distance(L.chai) < 30) || Math.hypot(ego.x + 76, ego.z + 52) < 7;
    PC.k += ((ouvrir ? 1 : 0) - PC.k) * Math.min(1, dt * 1.6);
    const a = 1.7 * lisse(PC.k); PC.a.rotation.y = -a; PC.b.rotation.y = a; PC.col.fantome = PC.k > 0.5; // ouverte, elle n'arrête personne, mais compte toujours pour la caméra du dehors (le linteau)
    const cx = camera.position.x, cz = camera.position.z, dedansC = cx > -76 && cx < -64 && cz > -59.6 && cz < -39;
    monde.halleChai.visible = jeu.auChai || dedansC || (PC.k > 0.02 && (cx + 70) * (cx + 70) + (cz + 49) * (cz + 49) < 2500);
  }
  chercherServable();
  const vp = !pcPres && !jeu.dedans && !jeu.auVolant && !tel.ouvert && !servable && !joueur.service && !gestes.actif ? vehiculeProche() : null;
  if (vp) { const t = vp.genre === 'van' ? (tactile ? 'Monter dans le van' : 'Monter dans le van (E)') : (tactile ? 'Monter' : 'Monter (E)'); if (etqMonter.el.textContent !== t) etqMonter.el.textContent = t; }
  hud.placer(etqMonter, vp ? vp.p.pos.x : 0, vp && vp.genre === 'van' ? 3.0 : 3.6, vp ? vp.p.pos.z : 0, !!vp);
  hud.placer(etqServir, servable ? servable.pos.x : 0, servable && servable.assis ? 1.9 : 2.5, servable ? servable.pos.z : 0, !!servable && !pcPres);
  hud.placer(etqDescendre, tr.pos.x, 3.8, tr.pos.z, jeu.auVolant && !tel.ouvert && Math.abs(tr.v) < 0.8 && !hud.parle && !gestes.actif);

  // caméra, soleil, ciel ; dans le bureau du chai, la caméra de la pièce ; un geste qui se regarde (charger, décharger) a
  // son cadre
  // La halle du chai : dedans ou sur le seuil, la caméra est posée au fond de la halle (la caméra qui suit buterait sur les
  // murs et monterait dans le toit). On passe de l'une à l'autre d'un coup, sans travelling à travers le mur ; il faut être
  // bien entré pour basculer dedans, bien sorti pour revenir dehors (pas de va-et-vient sur le seuil).
  if (!jeu.auChai) {
    // en sortant le nez dehors, la caméra qui suit serait collée au mur : on garde celle de la halle quelques mètres de plus
    const x = ego.x, z = ego.z, sortant = Math.sin(jeu.auVolant ? tr.h : joueur.h) < -0.3;
    const seuil = jeu.dansChai ? (sortant ? (jeu.auVolant ? -82.5 : -80) : -78.6) : -76.4, large = jeu.dansChai ? 4 : 2.6;
    const dans = z > -59.3 && z < -39.3 && x < -64.3 && (x > -75.6 || (x > seuil && Math.abs(z + 52) < large));
    if (dans !== jeu.dansChai) { jeu.dansChai = dans; cam.pret = false; if (!dans) cam.yaw = jeu.auVolant ? tr.h : joueur.h; }
  }
  if (!camLibre && jeu.dedans) bureau.camera(dt);
  else if (!camLibre && (jeu.auChai || jeu.dansChai)) { // dehors, le véhicule est derrière le mur : on regarde la porte
    const S = L.chaiSalle;
    cam.salle(dt, S, Math.max(ego.x, -73.5), ego.z, false);
    cam.yaw = Math.atan2(S.centre.x - S.camera.x, S.centre.z - S.camera.z); // les commandes, dans le sens de la vue
  }
  else if (!camLibre && gestes.cadre) cam.cadrer(dt, gestes.cadre, col);
  else if (!camLibre) cam.suivre(dt, ego.x, ego.z, jeu.auVolant ? tr.h : joueur.h, jeu.auVolant ? tr.v : joueur.v, jeu.auVolant, col, jeu.auVolant ? tr : null);
  hud.carte(ego.x, ego.z, cam.yaw, jeu.auVolant ? tr.h : joueur.h, cible, jeu.auVolant ? 1.45 : 2.2, mission.couleur, mission.route);
}

// Le cadre d'ombre suit le joueur, décalé vers l'avant de la caméra (rien de perdu derrière elle),
// et se cale sur la grille de texels dans le repère de la lumière (pas de scintillement en marchant).
// La matrice d'ombre ne change que lorsque la carte est recalculée : carte et matrice restent d'accord.
function placerLumiere(x, z) {
  monde.ciel.position.copy(camera.position);
  const q = paliers.q;
  if (!q.ombres) return;
  camera.getWorldDirection(DIR);
  const l = Math.hypot(DIR.x, DIR.z) || 1, av = q.boite * 0.26;
  const sc = monde.soleil.shadow.camera, px = (sc.right - sc.left) / q.ombreTaille, py = (sc.top - sc.bottom) / q.ombreTaille;
  const cx = x + DIR.x / l * av, cz = z + DIR.z / l * av;
  const u = Math.round((cx * LX.x + cz * LX.z) / px) * px, v = Math.round((cx * LY.x + cz * LY.z) / py) * py, w = cx * SOLEIL.x + cz * SOLEIL.z;
  CIBLE.copy(LX).multiplyScalar(u).addScaledVector(LY, v).addScaledVector(SOLEIL, w);
  monde.soleil.target.position.copy(CIBLE);
  monde.soleil.position.copy(CIBLE).addScaledVector(SOLEIL, 100);
}
// Taches de contact de tout ce qui bouge (et des voitures garées)
// Un personnage à plus de 32 m de la caméra n'est plus dessiné dans la carte d'ombre (ses os, deux fois par image) : de
// si loin, sa tache de contact suffit
const OMBRE_PERSO2 = 32 * 32;
const ombrePerso = (m, x, z) => { const dx = x - camera.position.x, dz = z - camera.position.z; m.maillage.castShadow = dx * dx + dz * dz < OMBRE_PERSO2; };
function majTaches() {
  const t = taches;
  t.debut();
  if (!jeu.auVolant) t.poser(joueur.pos.x, joueur.pos.z, 0.42, 0.42, 0);
  for (const v of VEHICULES) t.poser(v.m.groupe.position.x, v.m.groupe.position.z, v.genre === 'van' ? 1.15 : 1.2, v.genre === 'van' ? 2.5 : 2.1, v.m.groupe.rotation.y);
  for (const p of passants) { t.poser(p.p.pos.x, p.p.pos.z, 0.4, 0.4, 0); ombrePerso(p.p.m, p.p.pos.x, p.p.pos.z); }
  for (const f of figurants) { t.poser(f.p.pos.x, f.p.pos.z, 0.4, 0.4, 0); ombrePerso(f.p.m, f.p.pos.x, f.p.pos.z); }
  for (const p of assis) { t.poser(p.m.groupe.position.x, p.m.groupe.position.z, 0.45, 0.45, 0); ombrePerso(p.m, p.m.groupe.position.x, p.m.groupe.position.z); }
  for (const m of voituresM) t.poser(m.position.x, m.position.z, 1.1, 2.25, m.rotation.y);
  t.fin();
}
// Tout ce qui précède le dessin d'une image : décor animé, ombre, herbe proche
function avantRendu(ego) {
  UNI.uTemps.value = temps;
  if (camLibre) ego = camera.position; // caméra posée à la main (captures) : l'ombre suit ce qu'on regarde
  placerLumiere(ego.x, ego.z);
  majTaches();
  monde.maj(camera.position.x, camera.position.z);
  // dans le bureau, la pièce ne reçoit pas d'ombre portée : on ne recalcule pas la carte d'ombre
  const q = paliers.q;
  if (q.ombres && !jeu.dedans && ++nOmbre >= q.ombrePas) {
    nOmbre = 0; renderer.shadowMap.needsUpdate = true;
    const c = monde.soleil.shadow.camera;
    monde.ombres(monde.soleil.target.position, c.right, c.top);
  }
}
const rendre = () => renderer.render(scene, camera);

// Cadence : 60 images/s au plus (un écran à 90 ou 120 Hz en demanderait jusqu'à deux fois plus, pour rien : chauffe
// et batterie), 30 sur l'accueil et derrière le téléphone, 15 derrière le PC et la carte de fin (monde voilé et
// ralenti). Seuils en ms un peu sous l'intervalle visé : on reste calé sur la synchro de l'écran.
let dernier = performance.now();
function boucle(maintenant) {
  requestAnimationFrame(boucle);
  if (document.hidden || !paliers.pret) { dernier = maintenant; return; }
  const enJeu = etat === 'jeu', voile = enJeu && (pc.ouvert || jeu.finVue);
  const pas = voile ? 60 : !enJeu || tel.ouvert ? 29 : 12.5;
  if (maintenant - dernier < pas) return;
  const tDebut = performance.now();
  const ms = maintenant - dernier;
  const dt = Math.min(voile ? 0.1 : 0.05, ms / 1000);
  dernier = maintenant;
  temps += dt;
  if (etat === 'accueil') {
    cam.orbite(temps, joueur.pos.x, joueur.pos.z, largeur > hauteurE * 1.15);
    joueur.sync(dt, temps);
    for (const { p } of figurants) p.sync(dt, temps);
  } else miseAJour(dt);
  particules.maj(dt);
  if (monde.nuages) monde.nuages.rotation.y += dt * 0.004; // les nuages dérivent
  monde.moulin.rotation.x -= dt * 0.35; // les ailes du moulin des Grands Champs
  const ego = etat === 'jeu' && jeu.auVolant ? tr.pos : joueur.pos;
  avantRendu(ego);
  hud.update(dt, camera, largeur, hauteurE);
  // téléphone, PC ou carte de fin : monde voilé, dessiné à cadence réduite (voir plus haut), sans mesure
  if (enJeu && (tel.ouvert || voile)) { rendre(); return; }
  // le bourg se peuple une fois la première image affichée
  if (!peuplePrevu) { peuplePrevu = true; setTimeout(peupler, 30); }
  // les premières images compilent les shaders ; ensuite la sonde mesure le vrai coût d'une image (qualite.js)
  paliers.rendreImage(rendre, tDebut);
}

function redimensionner() {
  const el = $('jeu');
  largeur = el.clientWidth; hauteurE = el.clientHeight;
  renderer.setSize(largeur, hauteurE, false);
  camera.aspect = largeur / hauteurE;
  camera.fov = camera.aspect < 0.8 ? 72 : 60;
  camera.updateProjectionMatrix();
}
addEventListener('resize', redimensionner);
redimensionner();
paliers.appliquer(paliers.q);
// toujours compiler au démarrage (appliquer ne le fait que si le type d'ombre change : sinon l'image restait noire)
if (!paliers.nCompil) paliers.compiler();

/* ------------------------------------------------------------------ écrans */
for (const b of document.querySelectorAll('.perso')) {
  b.setAttribute('aria-pressed', String(b.dataset.h === choixHeros));
  b.addEventListener('click', () => jeu.changerHeros(b.dataset.h));
}
$('jouer').addEventListener('click', () => {
  peupler();
  ctrl.actions.length = 0; ctrl.touchers.length = 0; // rien de ce qui a été tapé sur l'accueil n'est rejoué
  son.demarrer();
  if (tactile) { try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (_) { /* refusé */ } }
  $('accueil').hidden = true; $('hud').hidden = false;
  etat = 'jeu';
  cam.yaw = joueur.h; cam.pret = false;
  mission.demarrer();
  dernier = performance.now();
});
$('poche').addEventListener('click', () => { if (etat === 'jeu' && $('fin').hidden && !pc.ouvert) { son.jouer('tap'); tel.basculer(); } });
$('fin-titre').textContent = FIN.titre;
$('fin-texte').textContent = FIN.texte;
$('fin-suite').replaceChildren(...FIN.suite.map(s => { const li = document.createElement('li'); li.textContent = s; return li; }));
$('continuer').addEventListener('click', () => { $('fin').hidden = true; jeu.finVue = false; ctrl.actions.length = 0; });

document.addEventListener('gesturestart', e => e.preventDefault());
requestAnimationFrame(boucle);
$('jouer').disabled = false;
mesures.script = Math.round(performance.now() - T0);

// banc de test (simulation sans affichage, mesure du coût d'une image)
window.CL = {
  jeu, mission, ctrl, camera, renderer, scene, monde, mesures,
  get tr() { return tr; },
  vehicule(genre) { return VEHICULES.find(v => v.genre === genre); },
  passants() { return passants.map(p => p.p); },
  get pilote() { return pilote; },
  voitures() { return voitures; },
  get qualite() { return paliers.q; },
  get pret() { return paliers.pret; },
  get ratio() { return paliers.ratio; },
  palier(nom) { paliers.forcer(nom); }, // impose un palier (essais)
  get etat() { return etat; },
  get joueur() { return joueur; },
  jouer() { $('jouer').click(); },
  teleporter(x, z, h = 0) { if (jeu.auVolant) tr.placer(x, z, h); else joueur.placer(x, z, h); cam.yaw = h; cam.pret = false; },
  agir,
  // laisse le geste en cours se jouer jusqu'au bout, en comptant les images où le personnage traverse un véhicule
  finirGeste(n = 900) { for (let i = 0; i < n && gestes.actif; i++) { this.step(1); if (this.dansVehicule()) this.traversees++; } },
  traversees: 0,
  // le personnage, à pied, est-il dans l'emprise d'un véhicule du domaine ? (il ne doit jamais les traverser)
  dansVehicule(marge = 0.12) {
    if (joueur.assis || joueur.m.groupe.parent !== scene) return null;
    for (const v of VEHICULES) {
      const h = v.p.h, c = Math.cos(h), s = Math.sin(h), dx = joueur.pos.x - v.p.pos.x, dz = joueur.pos.z - v.p.pos.z, x = dx * c - dz * s, z = dx * s + dz * c;
      for (const [x0, x1, z0, z1] of v.m.dims.emprise) if (x > x0 - marge && x < x1 + marge && z > z0 - marge && z < z1 + marge) return v.genre;
    }
    return null;
  },
  // caméra posée à la main pour les captures de vérification
  photo(px, py, pz, tx, ty, tz) { camLibre = px !== undefined; if (camLibre) { camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); } },
  step(n = 60, dt = 1 / 60) {
    paliers.pret = true; // essais : on n'attend pas la compilation en tâche de fond
    for (let i = 0; i < n; i++) { temps += dt; miseAJour(dt); particules.maj(dt); hud.update(dt, camera, largeur, hauteurE); }
    avantRendu(jeu.auVolant ? tr.pos : joueur.pos);
  },
  // coût de chaque étape d'une image (ms), la dernière colonne = attente de la carte graphique
  profil(n = 120) {
    const T = { jeu: 0, particules: 0, avantRendu: 0, hud: 0, rendu: 0, gpu: 0 }, dt = 1 / 60;
    for (let i = 0; i < n; i++) {
      const a = performance.now(); temps += dt; miseAJour(dt);
      const b = performance.now(); particules.maj(dt);
      const c = performance.now(); avantRendu(jeu.auVolant ? tr.pos : joueur.pos);
      const d = performance.now(); hud.update(dt, camera, largeur, hauteurE);
      const e = performance.now(); rendre();
      const f = performance.now(); paliers.attendreGPU();
      const g = performance.now();
      T.jeu += b - a; T.particules += c - b; T.avantRendu += d - c; T.hud += e - d; T.rendu += f - e; T.gpu += g - f;
    }
    for (const k in T) T[k] = +(T[k] / n).toFixed(3);
    return T;
  },
  // ce que le jeu occupe : objets de la scène, mémoire de la carte graphique (estimée), programmes
  memoire() {
    let objets = 0, auto = 0, maillages = 0;
    const geos = new Set(), texs = new Set();
    scene.traverse(o => {
      objets++; if (o.matrixAutoUpdate) auto++;
      if (o.geometry) { maillages++; geos.add(o.geometry); }
      if (o.material) for (const m of [].concat(o.material)) for (const k of ['map', 'alphaMap', 'normalMap']) if (m[k]) texs.add(m[k]);
    });
    let octGeo = 0, sommets = 0;
    const tampons = new Set(); // des géométries partagent leurs tampons (morceaux du terrain) : comptés une fois
    for (const g of geos) {
      for (const k in g.attributes) { const t = g.attributes[k].array; if (tampons.has(t)) continue; tampons.add(t); octGeo += t.byteLength; if (k === 'position') sommets += g.attributes[k].count; }
      if (g.index && !tampons.has(g.index.array)) { tampons.add(g.index.array); octGeo += g.index.array.byteLength; }
    }
    let octTex = 0;
    for (const t of texs) { const im = t.image; if (im && im.width) octTex += im.width * im.height * 4 * (t.generateMipmaps ? 1.33 : 1); }
    const sm = monde.soleil.shadow.map; if (sm) octTex += sm.width * sm.height * 4;
    const Mo = x => +(x / 1048576).toFixed(1);
    return { objets, matrixAutoUpdate: auto, maillages, geometries: geos.size, sommets, geoMo: Mo(octGeo), texMo: Mo(octTex), programmes: renderer.info.programs.length, tasJSMo: performance.memory ? Mo(performance.memory.usedJSHeapSize) : null };
  },
  bench(n = 120) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) { temps += 1 / 60; miseAJour(1 / 60); particules.maj(1 / 60); avantRendu(jeu.auVolant ? tr.pos : joueur.pos); rendre(); }
    paliers.attendreGPU();
    const ms = (performance.now() - t0) / n;
    // une image de plus pour compter aussi la passe d'ombre (comptée avant la remise à zéro de three.js)
    const inf = renderer.info; inf.autoReset = false; inf.reset(); renderer.shadowMap.needsUpdate = !!paliers.q.ombres; rendre(); inf.autoReset = true;
    return ms.toFixed(2) + ' ms par image, ' + inf.render.calls + ' appels de dessin, ' + inf.render.triangles + ' triangles (ombres comprises), qualité ' + paliers.q.nom + ', ratio ' + paliers.ratio;
  },
};
