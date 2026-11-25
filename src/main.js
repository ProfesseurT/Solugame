// Tournée générale : boucle de jeu, assemblage du monde, des personnages et de l'interface.
import * as relief from './relief.js';
import * as THREE from 'three';
import { construireMonde, BRUME, SOLEIL } from './monde.js';
import { UNI, compacter, indexer, MAT } from './modeles.js';
import { Collisions } from './collisions.js';
import { tracteur, van, voiture, voitureConduite, allumerPhares } from './engins.js';
import { perso, HEROS } from './perso.js';
import { Pieton, Passant } from './pieton.js';
import { Tracteur, Voiture, natureSol } from './vehicules.js';
import { Camera } from './camera.js';
import { Controles } from './controles.js';
import { Hud } from './hud.js';
import { Telephone } from './telephone.js';
import { PC } from './pc.js';
import { Mission, COULEUR } from './mission.js';
import { enjambeur, deplierEnjambeur } from './enjambeur.js';
import { remorque, Attelage, peutAtteler, etapesAtteler, etapesDeteler, chariot, placerChariot, voirChariot, asseoir as asseoirChariot, descendre as descendreChariot, Dechargement } from './remorque.js';
import { Traitement } from './mission2.js';
import { Habillage } from './mission3.js';
import { son } from './audio.js';
import { hasard, lisse, $ } from './outils.js';
import { Pilote, croisiere } from './pilote.js';
import { Gestes, pileCartons } from './gestes.js';
import { FIN, DIALOGUES, CHOCS_VOITURE, VOITURES as REPLIQUES, TRAITEMENT, HABILLAGE, PHYTO, LP_URL, MISSIONS } from './textes.js';
import { Paliers } from './qualite.js';
import { Particules, Taches, Traces, EffetsVehicule } from './particules.js';
import { Bureau } from './bureau.js';
import { Chai } from './chai.js';
import { Verres } from './verres.js';
import { Clients } from './clients.js';
import { Parvis } from './parvis.js';
import { SAUVE } from './sauvegarde.js';
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

/* ------------------------------------------------------------------ marque de mission */
const marque = new THREE.Group();
{
  const anneau = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.85, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COULEUR, transparent: true, opacity: 0.9, depthWrite: false }));
  anneau.position.y = 0.14;
  const fleche = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 4).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: COULEUR }));
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
const parvis = new Parvis({ scene, camera, emettre }); // le parvis du chai : ceux qui y travaillent, le chien, les moineaux
const traces = new Traces(scene);
const effets = new EffetsVehicule(particules, traces, col, rnd); // fumée, traces, feuilles, gravillons du véhicule conduit

/* ------------------------------------------------------------------ personnages, tracteur, voitures */
let choixHeros = stocke.lire('tournee-generale-heros') === 'vigneronne' ? 'vigneronne' : 'vigneron';
let joueur = new Pieton(perso(HEROS[choixHeros]));
scene.add(joueur.m.groupe);
joueur.placer(L.depart.x, L.depart.z, L.depart.h);

// Les véhicules du joueur : le tracteur et le van du domaine (on livre avec l'un ou l'autre), et les voitures qu'il a
// empruntées (ou volées, en mode WTF). tr (physique) et tm (modèle) désignent le véhicule courant : celui qu'on conduit,
// ou le dernier conduit. VEH_CARTE : repérés sur la mini-carte quand on est à pied ; OBSTACLES : ce que voient les
// voitures de la départementale (le joueur, puis chaque véhicule, avec son emprise).
const VEHICULES = [], VEH_CARTE = [], OBSTACLES = [null];
function creerVehicule(genre, modele, lieu, poste) {
  scene.add(modele.groupe);
  const p = new Tracteur(modele, genre);
  p.placer(lieu.x, lieu.z, lieu.h);
  p.pos.veh = p;
  const v = { genre, m: modele, p, poste };
  VEHICULES.push(v); VEH_CARTE.push(p); OBSTACLES.push(p.pos);
  for (const a of VEHICULES) a.p.autres = VEHICULES.filter(b => b !== a).map(b => b.p); // on ne se traverse pas
  return v;
}
// poste de conduite pour l'animation (van, voitures) : assise, plancher, volant (centre, rayon, inclinaison de la jante)
const posteDe = m => ({ assise: m.dims.assise, plancher: m.dims.plancher, volant: m.volantCentre, rayon: m.volantRayon, inclinaison: m.volantInclinaison, plafond: m.plafond });
const vTracteur = creerVehicule('tracteur', tracteur(), L.tracteur, null);
const mVan = van();
creerVehicule('van', mVan, L.van, posteDe(mVan));
// l'enjambeur (enjambeur.js), garé dans la cour, les bras de son pulvérisateur repliés : c'est lui qui pulvérise (mission 2)
const mEnj = enjambeur(); deplierEnjambeur(mEnj, 0);
const vEnjambeur = creerVehicule('enjambeur', mEnj, L.enjambeur, posteDe(mEnj));
let veh = vTracteur, tr = veh.p, tm = veh.m;
// La remorque de palox du Clos 2025 (mission 3 ; remorque.js), garée au domaine, chargée ; seul le tracteur la tire.
// Posée, c'est une boîte du décor ; attelée, elle suit le tracteur (Attelage.maj, à chaque image) et repousse les piétons.
const mRem = remorque();
scene.add(mRem.groupe);
const att = new Attelage(mRem, col);
att.poser(L.remorque.x, L.remorque.z, L.remorque.h);
OBSTACLES.push(att.pos); // les voitures de la départementale la voient
// (pour contourner à pied, gestes.js : la remorque attelée comme un véhicule de plus)
const remorqueContour = { p: att, m: mRem, genre: 'remorque' };
// Le chariot élévateur de l'imprimerie : à sa place dans la cour ; il décharge les palox (Dechargement)
const mChariot = chariot();
scene.add(mChariot.groupe);
placerChariot(mChariot, L.entrepot.chariot, col);
let dech = null;
const pilote = new Pilote(); // conduite assistée au doigt (pilote.js)

const PEAUX = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#d4a373'];
const CHEV = ['#2b1d0e', '#6b4423', '#b55239', '#d9c08c', '#c9c9c9', '#151515'];
const HAUTS = ['#c0392b', '#2e86de', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400', '#7f8c8d', '#e84393', '#34495e', '#f1ece2'];
const BAS = ['#2c3e50', '#34495e', '#5d4037', '#455a64', '#1e272e', '#6d4c41', '#8a7f6a'];
// un passant tiré au sort (r : le tirage au sort, celui du jeu par défaut)
const unPassant = (extra, r = rnd) => {
  const pk = a => a[Math.floor(r() * a.length)];
  return perso({
    peau: pk(PEAUX), cheveux: pk(CHEV), coiffure: pk(['court', 'court', 'chauve', 'chignon', 'queue']), barbe: r() < 0.25,
    haut: pk(HAUTS), bas: pk(BAS), chapeau: r() < 0.2 ? 'beret' : r() < 0.12 ? 'casquette' : null, chapeauC: pk(['#1f2a44', '#3b3b3b', '#7a2233']),
    lunettes: r() < 0.2, ...extra,
  });
};
// Les habitants du bourg (passants, clients, figurants assis) ne se voient pas depuis l'accueil : ils sont créés juste
// après la première image 3D, ou au plus tard au lancement de la partie. Le bouton Jouer s'allume d'autant plus tôt.
// Même ordre de création qu'avant (mêmes tirages au sort, mêmes tenues) ; les gens de la rue, ajoutés ensuite, ont leur
// propre tirage au sort (ils ne changent rien aux autres).
const passants = [], assis = [];
// les trottoirs de la départementale dans le bourg, la rue de la place : les gens de la rue y vont et viennent
const RUES = [[28, 3.9, 152, 5.9], [28, 3.9, 152, 5.9], [28, 3.9, 152, 5.9], [28, 14.2, 152, 16.6], [28, 14.2, 152, 16.6], [28, 14.2, 152, 16.6],
  [93.2, -27, 96.8, 1], [93.2, -27, 96.8, 1]].map(([x0, z0, x1, z1]) => ({ x0, z0, x1, z1 }));
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
  // mission 3 : Hélène, l'œnologue, en blouse blanche ; Julien, l'étiqueteur de l'imprimerie, en bleu de travail
  labo: { femme: true, peau: '#f0c8a0', cheveux: '#3b2a1a', coiffure: 'chignon', haut: '#f4f6f8', col: '#f4f6f8', bas: '#3a3f4a', tablier: '#f4f6f8', lunettes: true },
  entrepot: { peau: '#d9a27e', cheveux: '#2b1d0e', coiffure: 'court', barbe: true, tenue: 'salopette', haut: '#3c5a8a', col: '#e9e1cf', bas: '#3c5a8a', chapeau: 'casquette', chapeauC: '#e84e1b' },
};
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
    clients.ajouter(p, l, id);
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
  // les gens de la rue
  const rr = hasard(31);
  for (const zone of RUES) {
    const p = new Passant(unPassant({}, rr), zone, rr);
    scene.add(p.p.m.groupe);
    p.bulle = 0; p.cri = hud.etiquette('Hé !', 'bulle'); p.p.etq = p.cri;
    passants.push(p);
  }
  // les conducteurs des voitures de la départementale
  for (const vo of voitures) asseoirConducteur(vo);
  parvis.peupler(hud); // le rinceur et la porteuse du parvis du chai (tenues fixées : rien ne change pour les autres)
  // l'œnologue devant son labo, l'étiqueteur devant l'entrepôt de l'imprimerie (mission 3), créés en derniers
  for (const [id, l] of [['labo', L.figurants.labo], ['entrepot', L.entrepot.figurant]]) {
    const p = new Pieton(perso(CLIENTS_3D[id]));
    scene.add(p.m.groupe); p.placer(l.x, l.z, l.h);
    gens3.ajouter(p, l, id);
  }
  habillage.c.oeno = gens3.liste[0]; habillage.c.etiq = gens3.liste[1];
}
// Un conducteur au volant d'une voiture de la départementale (son propre tirage au sort) ; on le voit par les vitres
const rConducteurs = hasard(53), rPietons = hasard(59);
function asseoirConducteur(vo) {
  const p = new Pieton(unPassant({}, rConducteurs)), P = vo.mesh.userData.poste;
  vo.mesh.add(p.m.groupe); p.m.groupe.position.copy(P.siege);
  p.assis = true; p.poste = P; p.volant = 0; p.m.maillage.castShadow = false;
  p.caler();
  vo.conducteur = p;
}
// Il descend de la voiture qu'on lui prend (v : sa jumelle, où il est déjà assis) : il ouvre sa portière et descend, et
// nous la laisse ouverte ; en mode WTF, on lui a ouvert la portière et il en tombe (gestes.js : tomber). Puis il devient
// un passant du bas-côté de sa voie : il nous la prête de bon cœur, ou il s'enfuit en criant au voleur. sorti() : il a
// quitté son siège ; debout() : il est sur ses pieds, à l'écart.
const GESTES_PNJ = []; // les gestes en cours des autres (main.js les fait avancer : bourg)
function conducteurDescend(p, v, sorti, debout) {
  const G = new Gestes({ jeu, scene, col, acteur: p }), vole = jeu.wtf;
  G.lancer(vole ? G.tomber(v, sorti) : G.etapesDescendre(v, sorti, false), () => {
    debout?.();
    const x = p.pos.x, z = p.pos.z;
    const zone = z > 10 ? { x0: x - 30, z0: 14.4, x1: x + 30, z1: 16.6 } : { x0: x - 30, z0: 3.9, x1: x + 30, z1: 5.9 };
    const pa = new Passant(p.m, zone, rPietons);
    pa.p.placer(x, z, p.h);
    pa.cri = hud.etiquette('', 'bulle'); pa.p.etq = pa.cri; pa.bulle = 4;
    if (vole) {
      const ex = x - joueur.pos.x, ez = z - joueur.pos.z, l = Math.hypot(ex, ez) || 1;
      pa.fx = ex / l; pa.fz = ez / l; pa.fuite = 2.2;
      hud.bulle(pa.cri, pick(REPLIQUES.volee), 2.4);
    } else hud.bulle(pa.cri, pick(REPLIQUES.pretee), 3.2);
    passants.push(pa);
  });
  GESTES_PNJ.push(G);
}
// les modèles de toutes les voitures, garées et qui roulent (leur ombre de contact : majTaches)
const voituresM = [];
// voitures garées : immobiles, chacune son maillage (en mode WTF, on peut la voler), et sa boîte de collision
const GAREES = [];
for (const [x, z, r, c] of L.garees) {
  const m = voiture(c); m.position.set(x, 0, z); m.rotation.y = r; m.receiveShadow = true; m.name = 'voiture garée';
  scene.add(m); voituresM.push(m);
  const tourne = Math.abs(Math.sin(r)) > 0.5;
  const b = col.boiteC(x, z, tourne ? 3.9 : 1.75, tourne ? 1.75 : 3.9); b.haut = false;
  GAREES.push({ m, x, z, h: r, boite: b });
}
// les voitures de la départementale, avec leur conducteur (assis à la première image : peupler)
const voitures = [];
function creerVoiture(x, sens, vmax, c) {
  const m = voiture(c, undefined, true);
  scene.add(m); voituresM.push(m);
  const vo = new Voiture(m, x, sens, vmax); vo.teinte = new THREE.Color(c).getHex(); // éclats de carrosserie à sa couleur
  voitures.push(vo);
  return vo;
}
[[-120, 1, 11], [60, -1, 10.5], [230, 1, 12], [-260, -1, 11.5]].forEach(([x, s, v], i) => creerVoiture(x, s, v, ['#d64541', '#f2efe6', '#3867a8', '#6c8f4e'][i]));

// géométries finies : indexées (véhicules, voitures, cartons : chaque sommet calculé une fois), attributs compactés (deux
// fois moins de mémoire et de lectures pour la carte graphique). Le terrain (morceaux d'un même tampon) reste tel quel.
// Aussi pour ce qui arrive en cours de partie (une voiture qu'on prend).
const FINIES = new Set();
function finir(racine) {
  racine.traverse(o => {
    if (!o.geometry || FINIES.has(o.geometry)) return;
    FINIES.add(o.geometry);
    if (!o.geometry.index && !o.isSkinnedMesh && o.geometry.drawRange.count === Infinity && o.material && o.material.flatShading) indexer(o.geometry, true);
    compacter(o.geometry);
  });
}
finir(scene);
mesures.persos = Math.round(performance.now() - T0);

/* ------------------------------------------------------------------ jeu */
const cam = new Camera(camera);
const hud = new Hud(monde.carte, tactile);
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
  // ce que le personnage contourne à pied (gestes.js) : les véhicules, et la remorque quand elle est attelée (posée, elle
  // est une boîte du décor)
  get aContourner() { return att.attelee ? [...VEHICULES, remorqueContour] : VEHICULES; },
  get tr() { return tr; }, get tm() { return tm; }, get veh() { return veh; },
  basculerRadio() {
    const on = son.basculerRadio();
    stocke.ecrire('tournee-generale-radio', on ? 'on' : 'off');
    if (this.auVolant) hud.radio(on, tactile);
    return on;
  },
  auVolant: false, ventes: 0, minutes: 17 * 60 + 40, heureTxt: '17:40',
  // Mode WTF (Réglages ; décision de Teddy du 23/11/2026) : on vole les voitures, même garées, et l'on aplatit les
  // passants (un gag : ils se relèvent en râlant). Sinon, on emprunte une voiture à son conducteur. Gardé d'une partie à
  // l'autre.
  wtf: stocke.lire('tournee-generale-wtf') === 'on',
  basculerWtf() {
    this.wtf = !this.wtf; stocke.ecrire('tournee-generale-wtf', this.wtf ? 'on' : 'off');
    hud.dire(DIALOGUES.wtf(this.wtf));
    return this.wtf;
  },
  get choixHeros() { return choixHeros; },
  get joueur() { return joueur; },
  distance(p) { const o = this.auVolant ? tr.pos : joueur.pos; return Math.hypot(o.x - p.x, o.z - p.z); },
  // devant la grande porte du chai, dans son axe, ou déjà dedans (mission.js : le chargement commence)
  get devantChai() { return chai.devant(this.auVolant ? tr.pos : joueur.pos); },
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
    if (etat === 'accueil') allerPlan(0); // l'accueil montre le personnage choisi
  },
  finVue: false,
  tactile,
  // la carte de fin d'une mission (F : textes.js, FIN ou TRAITEMENT.finCarte), avec la prévente du registre après la 2
  finDemo() { montrerFin(FIN, false); },
  // une mission gagnée (sauvegarde.js : on pourra la rejouer depuis le téléphone) ; la mission du moment
  gagner(id) { SAUVE.gagner(id); sauver(); },
  get enCoursId() { return habillage.actif ? 'habillage' : traitement.actif ? 'traitement' : 'tournee'; },
  finMission2() { montrerFin(TRAITEMENT.finCarte, true); },
  finMission3() { montrerFin(HABILLAGE.finCarte, false); },
};
// la carte de fin d'une mission : son lien (la prévente du registre après la 2, viticode.fr après la 3)
function montrerFin(F, phyto) {
  $('fin-sur').textContent = F.sur; $('fin-titre').textContent = F.titre; $('fin-texte').textContent = F.texte; $('fin-h').textContent = F.h;
  $('fin-suite').replaceChildren(...F.suite.map(s => { const li = document.createElement('li'); li.textContent = s; return li; }));
  const cta = $('fin-cta'), lien = phyto ? { t: PHYTO.cta, u: LP_URL, c: 'cta cyan' } : F.cta ? { t: F.cta, u: F.url, c: 'cta viticode' } : null;
  cta.hidden = !lien;
  if (lien) { cta.textContent = lien.t; cta.href = lien.u; cta.className = lien.c; }
  if (phyto) $('fin-phyto').textContent = PHYTO.titre + ' ' + PHYTO.texte;
  $('fin-phyto').hidden = !phyto;
  $('continuer').textContent = F.bouton;
  $('fin').hidden = false; jeu.finVue = true; ctrl.relacher();
}
const tel = new Telephone(jeu);
const mission = new Mission(jeu);
// La mission 2 (mission2.js) : le pulvérisateur de l'enjambeur (ses bras se déplient dans les parcelles du jour)
const pulve = mEnj.pulve;
const traitement = new Traitement(jeu, { monde, particules, pulve, deplier: (P, k) => deplierEnjambeur(mEnj, k), v: new THREE.Vector3(), rnd: hasard(97) });
jeu.traitement = traitement;
// La mission 3 (mission3.js) : la remorque de palox du Clos 2025 et le chariot élévateur de l'imprimerie (jeu.remorque,
// jeu.chariot, plus bas)
const habillage = new Habillage(jeu, {});
jeu.habillage = habillage;
// La remorque et le chariot, pour la mission 3 (mission3.js)
jeu.remorque = {
  get ici() { return att.pos; },          // la remorque (la balise de l'échantillon, à pied)
  approche: L.remorque.approche,         // où le tracteur vient se mettre devant le timon (la balise pour atteler)
  get attelee() { return att.attelee; },
  peutAtteler: () => jeu.auVolant && veh.genre === 'tracteur' && peutAtteler(tr, att),
  atteler(fin) { const v = veh; couperMoteur(); ctrl.relacher(); gestes.lancer(etapesAtteler(gestes, v, att, { couper: couperMoteur, sorti: aPied, installe: () => auVolant(v) }), fin); },
  deteler(fin) { const v = veh; couperMoteur(); ctrl.relacher(); gestes.lancer(etapesDeteler(gestes, v, att, { couper: couperMoteur, sorti: aPied, installe: () => auVolant(v), depot: L.entrepot.depot }), fin); },
  debout: () => att.pointEchantillon(joueur.pos.x, joueur.pos.z).debout,
  pointEchantillon: () => att.pointEchantillon(joueur.pos.x, joueur.pos.z),
};
// Julien (l'étiqueteur) va à son chariot, s'assoit, rentre les six palox près de la ligne, en descend (remorque.js)
const VITE_CHARIOT = 2.5;
jeu.chariot = {
  get fini() { return !!dech && dech.fini; },
  get avancement() { return dech ? dech.avancement : 0; },
  lancer() {
    const f = gens3.liste[1], G = f.gestes, C = L.entrepot.chariot, P = { x: C.x + 1.1, z: C.z };
    f.etat = 'range'; G.g = null; f.p.salut = false; f.p.regard = null;
    G.lancer([...G.allerA(() => P, () => -Math.PI / 2), {
      action: () => { asseoirChariot(f.p, mChariot); dech = new Dechargement({ ch: mChariot, att, L: L.entrepot, conducteur: f.p, col, scene, vite: VITE_CHARIOT }); },
    }]);
  },
};
// déchargement fini (ou repris fini) : Julien descend de son chariot, près des palox
function finDechargement() {
  const f = gens3.liste[1];
  if (f.p.assis) descendreChariot(f.p, mChariot, scene);
  f.etat = 'range'; f.gestes.g = null; f.p.m.groupe.visible = true;
}
// l'œnologue et l'étiqueteur (créés dans peupler) : comme les clients, ils se tournent vers vous et font signe ; leur
// affaire faite (l'échantillon donné, les cartons livrés), ils rentrent au labo ou à l'entrepôt (clients.js)
L.portes.entrepot = L.entrepot.porte;
const gens3 = new Clients({ jeu, scene, col, mission: { fait: id => habillage.fait(id), arretDe: id => id, deposes: [] } });
// la mission qui mène la balise, l'itinéraire et l'objectif
const enCours = () => (habillage.actif ? habillage : traitement.actif ? traitement : mission);
const clients = new Clients({ jeu, scene, col, mission }); // devant leur boutique, puis dedans (clients.js)
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
const etqMonter = hud.action('Monter'), etqServir = hud.action('Servir un verre'), etqDescendre = hud.action('Descendre'), etqPrendre = hud.action('Emprunter la voiture'), etqDormir = hud.action('Rentrer dormir');
const etqEchantillon = hud.action('Prendre un échantillon'); // mission 3 : un palox de la remorque
const etqCible = hud.etiquette('', 'cible');
// le bureau du chai (bureau.js) : ses étiquettes, le chèque posé sur le bureau en bois
const bureau = new Bureau({ jeu, monde, scene, gestes, hud, ctrl, cam, mission, pc, tel, regarder });
const ETQ_ACTION = [...bureau.etiquettes, etqEchantillon, etqServir, etqMonter, etqDescendre, etqPrendre, etqDormir]; // celles qui se touchent (toucher)
for (const v of voitures) v.cri = hud.etiquette('Tût tût !', 'bulle');
// le choix de la radio est gardé d'une partie à l'autre ; son bandeau se touche pour la couper ou la rallumer
son.radioCoupee = stocke.lire('tournee-generale-radio') === 'off';
$('radio').addEventListener('click', e => { e.stopPropagation(); if (jeu.auVolant) { son.jouer('tap'); jeu.basculerRadio(); } });

/* ------------------------------------------------------------------ monter, conduire, descendre ; les gestes de la mission */
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
  effets.demarrer(v);
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
jeu.remplir = (cuve, debut, fin) => {
  const v = veh;
  couperMoteur(); ctrl.relacher();
  gestes.lancer([
    ...gestes.etapesDescendre(v, aPied),
    ...gestes.allerA(() => ({ x: cuve.x + 1.15, z: cuve.z - 1.0 }), () => -Math.PI / 2),
    { action: debut },
    { duree: 2.6, maj: (dt, t) => gestes.immobile(dt, t) },
    ...gestes.etapesMonter(v, () => auVolant(v)),
  ], fin);
};
// On coupe le moteur, puis on descend à gauche (gestes.js)
function descendre() {
  if (gestes.actif) return;
  couperMoteur(); ctrl.relacher();
  gestes.descendre(veh, aPied, () => {});
}
// Les cartons (mission.js) : charger ceux de la palette du chai (chai.js : le véhicule entre, on charge dedans, il
// ressort), décharger ceux d'un client, puis remonter au volant
const chai = new Chai({ jeu, monde, mission, gestes, cam, hud, tactile, conduite: { couperMoteur, auVolant, aPied },
  // on vient charger : la grande porte s'ouvre (la tournée : ce qui est signé ; l'habillage : les cartons du Clos)
  aCharger: () => enCours() === mission && (mission.aCharger.length > 0 || mission.etape === 'chargement') });
jeu.charger = (piles, place, fin) => chai.charger(piles, place, fin);
jeu.decharger = (f, cols, ajout, fin) => { couperMoteur(); gestes.decharger(veh, f, cols, { sorti: aPied, ajout, fin }); };
// À l'épicerie : arrêté devant, on descend, on va au comptoir, l'épicier parle et donne le chèque, on remonte ; à pied, on
// va seulement au comptoir (gestes.js : cheque)
jeu.chercherCheque = (f, dialogue, recu) => {
  const v = jeu.auVolant ? veh : null;
  if (v) couperMoteur();
  gestes.cheque(v, f, { sorti: aPied, installe: () => auVolant(v), dire: fin => hud.dire(dialogue, fin), recu });
};
// Chez le prospect : arrêté devant, on descend et l'on va le voir ; à pied, on y va (gestes.js : aborder). Rend le
// véhicule dont on est descendu (on y remonte après la dégustation), ou null.
jeu.aborder = (f, dialogue) => {
  const v = jeu.auVolant ? veh : null;
  if (v) couperMoteur();
  gestes.aborder(v, f, { sorti: aPied, dire: fin => hud.dire(dialogue, fin) });
  return v;
};
// Au labo (mission 3) : arrêté devant, on descend ; on va voir l'œnologue, elle parle, on lui tend l'échantillon
// (donne()), on remonte ; fin() quand tout est fait. À pied, on y va.
jeu.donner = (f, dialogue, donne, fin) => {
  const v = jeu.auVolant ? veh : null;
  if (v) couperMoteur();
  gestes.donner(v, f, { sorti: aPied, installe: () => auVolant(v), dire: fin2 => hud.dire(dialogue, fin2), donne, fin });
};
// Retourner au volant après une livraison ou une visite : seulement si l'on est encore à côté du véhicule (le bon de
// livraison peut se signer plus tard, ailleurs : au bureau du chai, assis au portable...)
jeu.remonter = v => {
  if (jeu.auVolant || gestes.actif || jeu.dedans || joueur.assis || Math.hypot(joueur.pos.x - v.p.pos.x, joueur.pos.z - v.p.pos.z) > 15) return;
  gestes.remonter(v, () => auVolant(v));
};
/* ------------------------------------------------------------------ les voitures des autres
   Une voiture de la départementale arrêtée (on s'est planté devant elle : elle attend), à portée de main : son conducteur
   nous la prête (ou, en mode WTF, on la lui vole) ; en mode WTF, aussi une voiture garée. On prend sa place : une jumelle
   qu'on conduit (engins.js : voitureConduite) remplace celle qui roulait ou attendait. La départementale retrouve une
   voiture, au loin, 20 s plus tard. */
const REMPLACER = [];
function voitureProche() {
  let best = null, dmin = 4.5;
  for (const v of voitures) {
    if (!v.conducteur || Math.abs(v.v) > 0.6) continue;
    const d = Math.hypot(joueur.pos.x - v.x, joueur.pos.z - v.z);
    if (d < dmin) { dmin = d; best = v; }
  }
  if (jeu.wtf) for (const g of GAREES) { const d = Math.hypot(joueur.pos.x - g.x, joueur.pos.z - g.z) - 0.8; if (d < dmin) { dmin = d; best = g; } }
  return best;
}
function prendreVoiture(c) {
  if (gestes.actif) return;
  const ia = voitures.includes(c), mesh = ia ? c.mesh : c.m, h = ia ? c.mesh.rotation.y : c.h, { nom, couleur } = mesh.userData;
  const m = voitureConduite(couleur, nom);
  finir(m.groupe);
  const v = creerVehicule('voiture', m, { x: c.x, z: c.z, h }, posteDe(m));
  let libre = true, debout = true, tLibre = 0; // la place du conducteur ; lui, sur ses pieds (depuis tLibre)
  const p = ia ? c.conducteur : null;
  if (ia) {
    // son conducteur passe dans la jumelle, à sa place (il y attend qu'on vienne lui ouvrir, en mode WTF)
    c.conducteur = null; libre = false; debout = false;
    m.caisse.add(p.m.groupe); p.m.groupe.position.copy(m.siege); p.m.groupe.rotation.set(0, 0, 0);
    p.poste = v.poste; p.pos.set(c.x, 0, c.z); p.sync(0, temps);
    voitures.splice(voitures.indexOf(c), 1);
    c.cri.vu = false;
    REMPLACER.push({ t: temps + 20, sens: c.sens, vmax: c.vmax, couleur, cri: c.cri });
  } else { GAREES.splice(GAREES.indexOf(c), 1); col.retirer(c.boite); }
  scene.remove(mesh); voituresM.splice(voituresM.indexOf(mesh), 1);
  veh = v; tr = v.p; tm = v.m;
  ctrl.relacher();
  const monter = () => auVolant(v);
  if (ia && jeu.wtf) {
    // mode WTF : on va jusqu'à sa portière, on l'ouvre, il en tombe ; on monte une fois qu'il s'est relevé et écarté
    gestes.lancer([
      ...gestes.versMontee(v), gestes.portiere(v, 1),
      { action: () => conducteurDescend(p, v, () => { libre = true; }, () => { debout = true; }) },
      { maj: (dt, t, u, T) => { gestes.immobile(dt, t); if (debout && !tLibre) tLibre = T; return (tLibre && T > tLibre + 0.4) || T > 8; } },
      ...gestes.etapesMonter(v, monter, true),
    ]);
    return;
  }
  // sinon il descend, nous laisse la portière ouverte et s'écarte ; puis on monte
  if (ia) conducteurDescend(p, v, () => { libre = true; });
  gestes.lancer([
    { maj: (dt, t, u, T) => { gestes.immobile(dt, t); return (libre && T > 0.6) || T > 8; } },
    ...gestes.etapesMonter(v, monter),
  ]);
}
function agir() {
  if (tel.ouvert || pc.ouvert || jeu.finVue || etat !== 'jeu' || joueur.service || gestes.actif) return; // pas pendant un geste
  if (bureau.agir()) return; // la porte, le chèque, le portable (bureau.js)
  if (habillage.echantillonProche) { habillage.prendreEchantillon(); return; } // mission 3 : le carton ouvert du chai
  if (jeu.auVolant) { if (Math.abs(tr.v) < 1.5) descendre(); return; }
  if (verres.servable) { verres.servir(verres.servable); return; }
  if (presMaison()) { dormir(); return; }
  const v = vehiculeProche();
  if (v) { monter(v); return; }
  const vc = voitureProche();
  if (vc) prendreVoiture(vc);
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
const DANGER = { x: 0, z: 0, v: 0, h: 0, wtf: false };
// le passant en p touche-t-il le véhicule e (l'un de ses deux cercles, à la distance où l'on repousse un passant :
// sinon le pare-chocs le pousserait devant lui sans jamais l'atteindre) ?
function sousVehicule(e, p) {
  const ax = Math.sin(e.h), az = Math.cos(e.h);
  for (const off of e.d.off) if (Math.hypot(p.x - e.pos.x - ax * off, p.z - e.pos.z - az * off) < e.d.r + 0.36) return true;
  return false;
}
// les véhicules du joueur, même garés, sont des obstacles : on repousse un cercle (x, z, r) hors de leurs deux cercles
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
      else if (!v.klaxon) { v.klaxon = true; son.jouer('klaxon'); hud.bulle(v.cri, 'Tût tût !', 1.6); }
    }
  }
}

/* ------------------------------------------------------------------ servir un verre de vin (verres.js)
   les passants, les figurants assis ; le prospect, le temps de la dégustation (mission.js) */
const verres = new Verres({ jeu, hud, mission, hasard: rnd,
  candidats(f) { for (const p of passants) f(p.p, 2.1); for (const p of assis) f(p, 2.5); for (const x of clients.liste) if (x.p.servable) f(x.p, 2.4); } });
jeu.prospectServable = on => { for (const x of clients.liste) if (x.id === 'auberge') x.p.servable = on; };

// les actions (touche E, téléphone, son, radio, échap) et les touchers courts sur l'écran
function lireEntrees() {
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
}

// Au volant. Au doigt : doigt posé = on avance. Sur l'itinéraire de la mission, le véhicule le suit tout seul (vitesse
// réglée, arrêt à destination : pilote.js). Glisser sur le côté : on tourne soi-même ; vers le bas : freiner, puis
// reculer ; vers le bas et sur le côté, lancé : frein à main (dérapage) ; vers le haut : un peu plus vite ; doigt levé :
// on s'arrête en douceur. Au clavier et à la manette : à la main.
// (dernier : faux pour les pas de conduite en plus d'une image accélérée : le personnage, les effets et le son ne se
// calculent qu'une fois par image)
function conduire(dt, dtm, dernier = true) {
  let gaz = 0, braq = 0, fm = false;
  const libre = !tel.ouvert && !pc.ouvert && !jeu.finVue;
  const M = enCours();
  pilote.prendre(M.route);
  jeu.pilote = false;
  // mission 2 : l'enjambeur engagé dans un rang fait toute la parcelle tout seul (passages, demi-tours) ; on ne gère que
  // l'avance (Teddy, 24/11/2026) : doigt posé ou flèche du haut, il avance ; glissé vers le bas ou flèche du bas, il
  // freine ; rien, il s'arrête. Le volant (doigt de côté, flèches de côté) ne fait rien.
  const engage = M === traitement && traitement.engage && libre ? pilote.commande(tr, veh.genre, M.cible, voitures, col, true) : null;
  if (engage) {
    const avance = ctrl.clavier ? (ctrl.ky < 0 ? 1 : ctrl.ky > 0 ? -1 : 0) : ctrl.id !== null ? (ctrl.jy > 0.45 ? -1 : 1) : 0;
    braq = engage.braq; jeu.pilote = true;
    gaz = avance > 0 ? engage.gaz : tr.v > 0.3 ? (avance < 0 ? -1 : -0.6) : tr.v < -0.3 ? 0.6 : 0;
  }
  else if (ctrl.clavier && libre) {
    gaz = -ctrl.ky; braq = -ctrl.kx;
    // dans une parcelle du jour, la bouillie prête (mission2.js) : flèche du haut seule, le guidage suit les passages
    if (M === traitement && traitement.guidage && ctrl.ky < 0 && !ctrl.kx) { const auto = pilote.commande(tr, veh.genre, M.cible, voitures, col); if (auto) { gaz = auto.gaz; braq = auto.braq; jeu.pilote = true; } }
  }
  else if (ctrl.id !== null && libre) {
    const sx = ctrl.jx, sy = ctrl.jy, ax = Math.abs(sx), tourne = ax > 0.2;
    const volant = tourne ? -Math.sign(sx) * Math.pow((ax - 0.2) / 0.8, 1.2) : 0;
    if (sy > 0.45) { gaz = -Math.min(1, (sy - 0.45) / 0.4); braq = volant; if (ax > 0.5 && sy > 0.55 && tr.v > 6) { fm = true; gaz *= 0.3; } } // frein à main : un geste franc, lancé
    else {
      const auto = tourne ? null : pilote.commande(tr, veh.genre, M.cible, voitures, col);
      if (auto) { gaz = auto.gaz; braq = auto.braq; jeu.pilote = true; }
      else {
        braq = volant;
        const vc = croisiere(veh.genre) * (sy < -0.4 ? 1.35 : 1) * (1 - 0.45 * Math.abs(braq)) * (tr.vignes ? 0.45 : 1);
        gaz = Math.max(-1, Math.min(1, (vc - tr.v) * 0.9));
      }
    }
  } else if (tactile && libre) gaz = tr.v > 0.3 ? -0.5 : 0;
  if (ctrl.fm && libre) fm = true;
  tr.update(dtm, gaz, braq, col, voitures, temps, fm);
  if (M === traitement) traitement.pas(dtm); // les rampes traitent les rangs qu'elles survolent
  if (!dernier) return;
  joueur.volant = tr.braq; // les mains suivent la direction
  joueur.pos.copy(tr.pos); joueur.sync(dtm, temps);
  if (tr.chocVu > 0.15) { son.jouer('choc'); cam.secousse = tr.chocVu; try { navigator.vibrate?.(40); } catch (_) { /* rien */ } }
  effets.maj(dtm, veh); // fumée, traces de dérapage, feuilles dans les vignes, gravillons
  tSon -= dt;
  if (tSon <= 0) { tSon = 0.1; son.moteur(true, tr.v, tr); }
}

// À pied : le manche (doigt, souris) et le clavier, dans le repère de la caméra ; immobile pendant qu'on sert un verre
const MARCHE = 1.6; // m/s, au clavier sans Maj
function marcher(dtm) {
  let ix = ctrl.jx + ctrl.kx, iy = ctrl.jy + ctrl.ky;
  if (tel.ouvert || pc.ouvert || !$('fin').hidden) ix = iy = 0;
  const force = Math.min(1, Math.hypot(ix, iy));
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
  let wx = fx * -iy - fz * ix, wz = fz * -iy + fx * ix;
  const wl = Math.hypot(wx, wz) || 1; wx /= wl; wz /= wl;
  // au clavier, les flèches font marcher et Maj courir ; au doigt et à la manette, on marche ou l'on court selon l'appui
  if (joueur.service) joueur.update(dtm, 0, 0, 0, false, col, temps);
  else joueur.update(dtm, wx, wz, force, ctrl.courir, col, temps, ctrl.fleches && !ctrl.courir ? MARCHE : undefined);
  horsDesVehicules(joueur.pos, joueur.r);
  if (att.attelee) att.pousser(joueur.pos, joueur.r);
  horsDesVoitures();
  // un pas chaque fois qu'un pied se pose (la foulée, anim.js, fait deux pas par cycle)
  const pp = Math.floor(joueur.anim.ph * 2);
  if (pp !== pasPrec) { pasPrec = pp; if (joueur.v > 0.5) son.pas(natureSol(joueur.pos.x, joueur.pos.z, col), joueur.v); }
}

// La vie du bourg : les passants (ils s'écartent du véhicule qui arrive), les clients (ils se tournent vers vous et font
// signe ; leur affaire faite, ils rangent leurs cartons et rentrent : clients.js), les figurants assis, les verres qu'on
// boit, les voitures de la départementale
const PARVIS_C = { t: 0, minutes: 0, ego: null, aPied: true, danger: null, pousser: (p, r) => horsDesVehicules(p, r) };
function bourg(dtm, ego) {
  if (jeu.auVolant) { DANGER.x = tr.pos.x; DANGER.z = tr.pos.z; DANGER.v = tr.v; DANGER.h = tr.h; }
  DANGER.wtf = jeu.wtf;
  const danger = jeu.auVolant ? DANGER : null, ecraseur = jeu.wtf && jeu.auVolant && Math.abs(tr.v) > 2.5;
  for (const p of passants) {
    const r = p.update(dtm, danger, col, temps);
    if (r === 'releve') hud.bulle(p.cri, pick(REPLIQUES.releve), 2.2);
    else if (r) hud.bulle(p.cri, 'Hé !', 1.6);
    // mode WTF : le véhicule lancé lui passe dessus, il s'aplatit (il se relève quelques secondes plus tard)
    if (ecraseur && p.ecrase <= 0 && sousVehicule(tr, p.p.pos) && p.ecraser()) {
      son.jouer('pouet'); son.jouer('choc'); cam.secousse = Math.max(cam.secousse, 0.3);
      hud.bulle(p.cri, pick(REPLIQUES.ecrase), 1.4);
    }
    if (p.ecrase <= 0) { horsDesVehicules(p.p.pos, 0.34); if (att.attelee) att.pousser(p.p.pos, 0.34); }
    if (p.cri.vu) hud.placer(p.cri, p.p.pos.x, 2.3, p.p.pos.z, true);
  }
  clients.maj(dtm, temps, ego, jeu.auVolant);
  gens3.maj(dtm, temps, ego, jeu.auVolant);
  PARVIS_C.t = temps; PARVIS_C.minutes = jeu.minutes; PARVIS_C.ego = ego; PARVIS_C.aPied = !jeu.auVolant; PARVIS_C.danger = danger;
  parvis.maj(dtm, PARVIS_C);
  for (const p of assis) { p.sync(dtm, temps); if (p.etq && p.etq.vu) hud.placer(p.etq, p.m.groupe.position.x, 1.9, p.m.groupe.position.z, true); }
  verres.maj(dtm, temps);
  OBSTACLES[0] = ego;
  // les gestes des autres (un conducteur qui descend de sa voiture)
  for (let i = GESTES_PNJ.length - 1; i >= 0; i--) { GESTES_PNJ[i].update(dtm, temps); if (!GESTES_PNJ[i].actif) GESTES_PNJ.splice(i, 1); }
  // une voiture prise est remplacée au loin, avec un nouveau conducteur
  for (let i = REMPLACER.length - 1; i >= 0; i--) {
    const r = REMPLACER[i];
    if (temps < r.t) continue;
    REMPLACER.splice(i, 1);
    const vo = creerVoiture(-340 * r.sens, r.sens, r.vmax, r.couleur); vo.cri = r.cri;
    asseoirConducteur(vo);
  }
  for (const v of voitures) {
    // son conducteur, vu par les vitres : animé de près seulement
    const c = v.conducteur;
    if (c) {
      const dx = v.x - camera.position.x, dz = v.z - camera.position.z, pres = dx * dx + dz * dz < 6400;
      if (c.m.groupe.visible !== pres) c.m.groupe.visible = pres;
      if (pres) { c.pos.set(v.x, 0, v.z); c.sync(dtm, temps); }
    }
    if (v.update(dtm, OBSTACLES, voitures) && Math.hypot(v.x - ego.x, v.z - ego.z) < 50) { son.jouer('klaxon'); hud.bulle(v.cri, 'Tût tût !', 1.6); }
    // touchée : secousse (vehicules.js), choc, éclats de carrosserie, le conducteur râle
    if (v.cogne) {
      v.cogne = false;
      if (v.choc > 0.3) {
        son.jouer('choc'); son.jouer('klaxon');
        hud.bulle(v.cri, pick(CHOCS_VOITURE), 2.4);
        for (let i = 0; i < 10; i++) emettre(v.x + (rnd() - 0.5) * 1.5, 0.6 + rnd() * 0.5, v.z + (rnd() - 0.5) * 1.5, (rnd() - 0.5) * 3, 1.5 + rnd() * 2, (rnd() - 0.5) * 3, 1.4, rnd() < 0.5 ? v.teinte : 0x2a2a2e, 0.5, 9);
      }
    }
    if (v.cri.vu) hud.placer(v.cri, v.x, 2.4, v.z, true);
  }
}

// l'horloge : une minute de jeu toutes les 2 secondes ; le texte n'est refait qu'une fois par minute de jeu ; la nuit
// tombe avec l'heure
function horloge(dtm) {
  jeu.minutes += dtm / 2;
  const m = Math.floor(jeu.minutes);
  if (m === minuteAff) return;
  minuteAff = m;
  jeu.heureTxt = String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  hud.heure(jeu.heureTxt);
  majNuit();
}
// La nuit d'après l'heure : 0 en plein jour (la lumière dorée), 1 en pleine nuit ; le soir tombe de 18 h 40 à 19 h 50, le
// jour se lève de 6 h 20 à 7 h 30. Refaite une fois par minute de jeu.
function nuitA(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  if (m >= 450 && m <= 1120) return 0;
  if (m > 1120 && m < 1190) return lisse((m - 1120) / 70);
  if (m >= 380 && m < 450) return 1 - lisse((m - 380) / 70);
  return 1;
}
function majNuit() { const n = nuitA(jeu.minutes); if (n !== UNI.uNuit.value) { monde.nuit(n); allumerPhares(lisse((n - 0.15) / 0.5)); } }
// Les phares, la nuit : ceux des voitures de la départementale, et du véhicule qu'on conduit (moteur en marche)
function phares() {
  const on = UNI.uNuit.value > 0.15;
  const allumer = (ph, a) => { if (ph.groupe.visible !== a) { ph.groupe.visible = a; ph.flaque.visible = a; } };
  for (const v of voitures) allumer(v.mesh.userData.phares, on);
  for (const v of VEHICULES) allumer(v.m.phares, on && v === veh && (jeu.auVolant || gestes.roule));
}

/* ------------------------------------------------------------------ rentrer dormir
   Devant la porte de la maison du domaine, « Rentrer dormir » : on entre, fondu au noir, et l'on ressort au matin, 7 h, le
   lendemain (ou le jour même, en pleine nuit après minuit). La journée de travail continue où elle en était. */
// Après la tournée de Noël (mission.js : dodo), le réveil se fait le lendemain matin (Teddy, 24/11/2026) : le tracteur et
// le van à leur place, le pulvérisateur attelé au tracteur ; la mission 2 commence (mission2.js)
let mission2 = false, mission3 = false, resAff = true;
function lendemain() {
  mission.aller('libre');
  parvis.lendemain();
  vTracteur.p.placer(L.tracteur.x, L.tracteur.z, L.tracteur.h);
  const vv = VEHICULES.find(v => v.genre === 'van'); vv.p.placer(L.van.x, L.van.z, L.van.h);
  vEnjambeur.p.placer(L.enjambeur.x, L.enjambeur.z, L.enjambeur.h);
  mission2 = true;
}
// Après la journée de traitement (mission2.js : dodo), le réveil se fait le jeudi (Teddy, 24/11/2026) : les véhicules à
// leur place, vides ; la remorque de palox du Clos 2025 au domaine ; la mission 3 commence (mission3.js)
function surlendemain() {
  mission.aller('libre');
  if (traitement.actif) traitement.aller('libre');
  parvis.lendemain('habillage');
  for (const v of VEHICULES) {
    const l = v.genre === 'tracteur' ? L.tracteur : v.genre === 'van' ? L.van : v.genre === 'enjambeur' ? L.enjambeur : null;
    if (l) v.p.placer(l.x, l.z, l.h);
    if (v.m.cartons) for (const c of v.m.cartons) c.visible = false;
    v.p.charge = 0;
  }
  for (const p of mission.palette) p.groupe.visible = false;
  // la remorque de palox au domaine, chargée, dételée ; le chariot à sa place dans la cour de l'imprimerie
  att.poser(L.remorque.x, L.remorque.z, L.remorque.h); att.recharger();
  mission3 = true;
}
const presMaison = () => !jeu.auVolant && !jeu.dedans && Math.hypot(joueur.pos.x - L.maison.x, joueur.pos.z - L.maison.z) < 2.2;
function dormir() {
  const P = L.maison;
  ctrl.relacher();
  gestes.lancer([
    ...gestes.allerA(() => P, () => Math.PI),
    { action: () => { $('fondu').classList.add('noir'); son.jouer('portiere'); } },
    { duree: 1.1, maj: (dt, t) => gestes.immobile(dt, t) },
    {
      action: () => {
        const jour = Math.floor(jeu.minutes / 1440), h = jeu.minutes - jour * 1440;
        jeu.minutes = (h >= 420 ? jour + 1 : jour) * 1440 + 420;
        horloge(0);
        joueur.placer(L.depart.x, L.depart.z, L.depart.h); cam.yaw = L.depart.h; cam.pret = false; // sorti dans la cour (dos au mur, la caméra y entrerait)
        if (mission.etape === 'dodo') lendemain();
        else if (traitement.etape === 'dodo') surlendemain();
      },
    },
    { duree: 0.5, maj: (dt, t) => gestes.immobile(dt, t) },
    {
      action: () => {
        $('fondu').classList.remove('noir'); son.jouer('claque');
        if (mission2) { mission2 = false; traitement.demarrer(); } else if (mission3) { mission3 = false; habillage.demarrer(); } else hud.banniere('Bonjour !', 'Le lendemain matin, 7 h', 3);
      },
    },
  ]);
}

// La balise de la mission et son étiquette (nom, distance) ; les étiquettes d'action : le bureau du chai d'abord (les
// autres s'effacent devant elles), servir un verre, monter, descendre
function reperes(dt, ego, cible) {
  marque.visible = !!cible && !jeu.dedans;
  if (cible) {
    marque.position.set(cible.x, 0, cible.z);
    const u = marque.userData, k = 1 + Math.sin(temps * 4) * 0.06;
    u.anneau.scale.set(k, 1, k); u.fleche.position.y = 3.2 + Math.sin(temps * 3) * 0.35; u.fleche.rotation.y = temps * 1.6;
    if ((tEtq -= dt) <= 0) {
      tEtq = 0.25;
      etqCible.el.textContent = enCours().nomCible + ' · ' + Math.round(Math.hypot(cible.x - ego.x, cible.z - ego.z)) + ' m';
    }
  }
  hud.placer(etqCible, cible ? cible.x : 0, 4.6, cible ? cible.z : 0, !!cible && !tel.ouvert && !jeu.dedans);
  const pcPres = bureau.maj();
  verres.chercher(!jeu.auVolant && !tel.ouvert && !pc.ouvert && !joueur.service && joueur.sautT <= 0 && !gestes.actif);
  const servable = verres.servable;
  // devant la porte de la maison du domaine : rentrer dormir
  const dodo = !pcPres && !servable && !tel.ouvert && !joueur.service && !gestes.actif && presMaison();
  hud.placer(etqDormir, L.maison.x, 2.6, L.maison.z - 0.4, dodo);
  { const ok = habillage.echantillonProche && !tel.ouvert && !pcPres, P = ok ? jeu.remorque.pointEchantillon() : null; hud.placer(etqEchantillon, P ? P.x : 0, P ? P.y + 0.6 : 0, P ? P.z : 0, ok); }
  const vp = !dodo && !pcPres && !jeu.dedans && !jeu.auVolant && !tel.ouvert && !servable && !joueur.service && !gestes.actif ? vehiculeProche() : null;
  if (vp) hud.libeller(etqMonter, vp.genre === 'van' ? 'Monter dans le van' : vp.genre === 'voiture' ? 'Monter dans la voiture' : vp.genre === 'enjambeur' ? 'Monter dans l\'enjambeur' : 'Monter');
  hud.placer(etqMonter, vp ? vp.p.pos.x : 0, vp ? vp.p.pos.y + ({ van: 3.0, voiture: 2.3, enjambeur: 4.9 }[vp.genre] ?? 3.6) : 0, vp ? vp.p.pos.z : 0, !!vp);
  // une voiture des autres, à emprunter (ou à voler, en mode WTF)
  const vc = !vp && !pcPres && !jeu.dedans && !jeu.auVolant && !tel.ouvert && !servable && !joueur.service && !gestes.actif ? voitureProche() : null;
  if (vc) hud.libeller(etqPrendre, jeu.wtf ? 'Voler la voiture' : 'Emprunter la voiture');
  hud.placer(etqPrendre, vc ? vc.x : 0, 2.3, vc ? vc.z : 0, !!vc);
  hud.placer(etqServir, servable ? servable.pos.x : 0, servable && servable.assis ? 1.9 : 2.5, servable ? servable.pos.z : 0, !!servable && !pcPres);
  hud.placer(etqDescendre, tr.pos.x, tr.pos.y + (veh.genre === 'enjambeur' ? 5.0 : 3.8), tr.pos.z, jeu.auVolant && !tel.ouvert && Math.abs(tr.v) < 0.8 && !hud.parle && !gestes.actif);
}

function miseAJour(dt) {
  const dtm = tel.ouvert || pc.ouvert ? dt * 0.3 : dt; // derrière le téléphone ou le portable, le monde ralentit
  lireEntrees();
  joueur.telephone = tel.ouvert; // le personnage lève son téléphone quand on l'ouvre
  bureau.avant(); // assis au portable : les mains sur le clavier ; après un appel passé depuis le portable, on y revient
  if (gestes.actif) {
    // un geste se joue (monter, descendre, porter les cartons) : il mène le personnage ; le véhicule reste à l'arrêt.
    // Doigt posé ou touche de direction enfoncée : une scène de cartons se joue trois fois plus vite.
    const vite = gestes.cadre && (ctrl.id !== null || ctrl.kx || ctrl.ky) ? 3 : 1;
    gestes.update(dtm * vite, temps);
    if (jeu.auVolant && !gestes.roule) tr.update(dtm, 0, 0, col, voitures, temps); // (le véhicule qui roule tout seul : gestes.js)
  } else if (jeu.auVolant) {
    // en traitant les rangs (mission2.js), doigt posé ou touche enfoncée : la scène va trois fois plus vite (trois pas de
    // conduite par image)
    const k = (traitement.pulverise || traitement.engage) && enCours() === traitement && (ctrl.id !== null || ctrl.ky < 0) ? 3 : 1;
    for (let i = 0; i < k; i++) conduire(dt, dtm, i === k - 1);
  }
  else marcher(dtm);
  // la remorque attelée suit le tracteur (aussi pendant un geste : il recule tout seul pour atteler) ; le chariot de
  // l'imprimerie décharge les palox (mission 3)
  att.maj(dtm, !gestes.roule, voitures);
  if (dech && !dech.fini) { dech.maj(dtm, temps); if (dech.fini) finDechargement(); }
  const ego = jeu.auVolant ? tr.pos : joueur.pos, cap = jeu.auVolant ? tr.h : joueur.h;
  son.ambiance(dt, ego.x, ego.z, jeu.minutes, !jeu.auVolant);
  bourg(dtm, ego);
  phares();
  particules.fontaine(dtm, L.fontaine);
  enCours().update(dt);
  // la ligne d'habillage tourne dès que les premiers palox sont rentrés (mission 3) ; le chariot, dessiné de près
  if (monde.ligne) monde.ligne.maj(dtm, habillage.decharge || (!!dech && dech.avancement > 0.15), camera.position.x, camera.position.z);
  voirChariot(mChariot, camera.position.x, camera.position.z);
  // la barre d'état du téléphone : sans réseau en bas des Grands Champs (mission 2)
  { const res = !traitement.actif || traitement.reseau; if (res !== resAff) { resAff = res; $('tel-res').textContent = res ? '4G' : 'Pas de service'; } }
  tel.update(dt);
  pc.update(dt);
  horloge(dtm);
  const cible = enCours().cible;
  reperes(dt, ego, cible);
  chai.maj(dt, ego, cap, camera.position); // la grande porte, la halle dessinée de près, dedans ou dehors (chai.js)

  // la caméra : dans le bureau du chai, celle de la pièce ; dans la halle du chai, celle de la halle ; un geste qui se
  // regarde (charger, décharger, le chèque) a son cadre ; sinon, elle suit
  if (camLibre) { /* posée à la main (captures) */ }
  else if (jeu.dedans) bureau.camera(dt);
  else if (chai.camera(dt, ego)) { /* posée au fond de la halle */ }
  else if (gestes.cadre) cam.cadrer(dt, gestes.cadre, col);
  else {
    // en dérive, la caméra suit à moitié la direction où l'on glisse (on voit le véhicule de trois quarts, en travers)
    let capCam = cap;
    if (jeu.auVolant && tr.v > 3 && Math.abs(tr.vT) > 0.8) capCam = cap + Math.atan2(tr.vT, tr.v) * 0.55 * Math.min(1, (Math.abs(tr.vT) - 0.8) / 2.5);
    cam.suivre(dt, ego.x, ego.z, capCam, jeu.auVolant ? tr.v : joueur.v, jeu.auVolant, col, jeu.auVolant ? tr : null, ego.y);
  }
  hud.carte(ego.x, ego.z, cam.yaw, cap, cible, jeu.auVolant ? 1.45 : 2.2, COULEUR, enCours().route, jeu.auVolant ? null : VEH_CARTE);
}

// Le cadre d'ombre suit le joueur, décalé vers l'avant de la caméra (rien de perdu derrière elle),
// et se cale sur la grille de texels dans le repère de la lumière (pas de scintillement en marchant).
// La matrice d'ombre ne change que lorsque la carte est recalculée : carte et matrice restent d'accord.
function placerLumiere(x, z, y = 0) {
  monde.ciel.position.copy(camera.position);
  const q = paliers.q;
  if (!q.ombres) return;
  camera.getWorldDirection(DIR);
  const l = Math.hypot(DIR.x, DIR.z) || 1, av = q.boite * 0.26;
  const sc = monde.soleil.shadow.camera, px = (sc.right - sc.left) / q.ombreTaille, py = (sc.top - sc.bottom) / q.ombreTaille;
  const cx = x + DIR.x / l * av, cz = z + DIR.z / l * av;
  const u = Math.round((cx * LX.x + cz * LX.z) / px) * px, v = Math.round((cx * LY.x + y * LY.y + cz * LY.z) / py) * py, w = cx * SOLEIL.x + y * SOLEIL.y + cz * SOLEIL.z;
  CIBLE.copy(LX).multiplyScalar(u).addScaledVector(LY, v).addScaledVector(SOLEIL, w);
  monde.soleil.target.position.copy(CIBLE);
  monde.soleil.position.copy(CIBLE).addScaledVector(SOLEIL, 100);
}
// Taches de contact de tout ce qui bouge (et des voitures garées)
// Un personnage à plus de 32 m de la caméra n'est plus dessiné dans la carte d'ombre (ses os, deux fois par image) : de
// si loin, sa tache de contact suffit
const OMBRE_PERSO2 = 32 * 32;
// Plus loin que q.persos (100 à 200 m selon le palier : une dizaine de pixels, déjà dans la brume), il n'est plus dessiné
// du tout, ni sa tache. Rend vrai s'il l'est.
const ombrePerso = (m, x, z) => {
  const dx = x - camera.position.x, dz = z - camera.position.z, d2 = dx * dx + dz * dz, L = paliers.q.persos, vu = d2 < L * L;
  m.maillage.castShadow = d2 < OMBRE_PERSO2;
  if (m.maillage.visible !== vu) m.maillage.visible = vu;
  return vu;
};
const TACHES = { tracteur: [1.2, 2.1], van: [1.15, 2.5], voiture: [0.95, 2.05], enjambeur: [1.35, 2.25] }; // demi-largeur, demi-longueur
function majTaches() {
  const t = taches;
  t.debut();
  if (!jeu.auVolant) t.poser(joueur.pos.x, joueur.pos.z, 0.42, 0.42, 0, joueur.pos.y);
  for (const v of VEHICULES) { const [lx, lz] = TACHES[v.genre], g = v.m.groupe; t.poser(g.position.x, g.position.z, lx, lz, 0, g.position.y, g.quaternion); }
  { const g = mRem.groupe; t.poser(g.position.x, g.position.z, 1.2, 3.15, 0, g.position.y, g.quaternion); } // la remorque de palox
  if (mChariot.groupe.visible) { const g = mChariot.groupe; t.poser(g.position.x, g.position.z, 0.62, 1.35, 0, 0, g.quaternion); }
  for (const p of passants) if (ombrePerso(p.p.m, p.p.pos.x, p.p.pos.z)) t.poser(p.p.pos.x, p.p.pos.z, 0.4, 0.4, 0, p.p.pos.y);
  for (const f of clients.liste) if (clients.dehors(f) && ombrePerso(f.p.m, f.p.pos.x, f.p.pos.z)) t.poser(f.p.pos.x, f.p.pos.z, 0.4, 0.4, 0);
  for (const f of gens3.liste) if (gens3.dehors(f) && ombrePerso(f.p.m, f.p.pos.x, f.p.pos.z)) t.poser(f.p.pos.x, f.p.pos.z, 0.4, 0.4, 0);
  for (const p of assis) if (ombrePerso(p.m, p.m.groupe.position.x, p.m.groupe.position.z)) t.poser(p.m.groupe.position.x, p.m.groupe.position.z, 0.45, 0.45, 0);
  for (const m of voituresM) t.poser(m.position.x, m.position.z, 1.1, 2.25, m.rotation.y);
  parvis.taches(t, ombrePerso);
  t.fin();
}
// Tout ce qui précède le dessin d'une image : décor animé, ombre, herbe proche
function avantRendu(ego) {
  UNI.uTemps.value = temps;
  if (camLibre) ego = camera.position; // caméra posée à la main (captures) : l'ombre suit ce qu'on regarde
  placerLumiere(ego.x, ego.z, camLibre ? 0 : ego.y);
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
  if (etat === 'accueil') vitrine(dt);
  else { miseAJour(dt); if ((tSauve += dt) > 4) { tSauve = 0; sauver(); } }
  particules.maj(dt);
  if (monde.nuages) monde.nuages.rotation.y += dt * 0.004; // les nuages dérivent
  monde.moulin.rotation.x -= dt * 0.35; // les ailes du moulin des Grands Champs
  const ego = etat === 'accueil' ? VISE : etat === 'jeu' && jeu.auVolant ? tr.pos : joueur.pos;
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

/* ------------------------------------------------------------------ l'accueil
   Derrière le titre, des plans du monde qui glissent lentement, enchaînés par un fondu au noir ; le bourg vit (passants,
   voitures, parvis du chai). Le premier plan, et chaque fois qu'on change de personnage : le personnage choisi, dans la
   cour du domaine (posé là pour l'accueil ; lancer le remet au départ). de, a : la caméra ; vise, viseA : ce qu'elle
   regarde ; decale : de combien le sujet s'écarte du titre (camera.js : plan). */
const PLANS = [
  { nom: 'Le domaine', duree: 9, heros: [-92, -56, -0.93], de: [-96.1, 1.65, -53.1], a: [-95.3, 1.5, -53.7], vise: [-92, 1.2, -56], decale: 0.3, decaleV: 0.16 },
  { nom: 'Les Perrières', duree: 8, de: [-152, 9, -104], a: [-141, 7.5, -93], vise: [-95, 2, -52], viseA: [-92, 2, -54], decale: 0.2 },
  { nom: 'Le bourg', duree: 8, de: [80.5, 5.4, -30], a: [85, 4.3, -33.8], vise: [95, 1.6, -46], decale: 0.25 },
  { nom: 'Les Grands Champs', duree: 8, de: [-71, 5.2, 172], a: [-63, 5.8, 165], vise: [-36, 6.5, 147], decale: 0.2 },
  { nom: 'Le château', duree: 9, de: [-224, 44, -233], a: [-236, 43, -245], vise: [-280, 38, -287], decale: 0.15 },
];
const FONDU = 0.55, VISE = new THREE.Vector3(), LOIN = { x: 1e4, y: 0, z: 1e4 }; // (personne ne réagit à la caméra de l'accueil)
let iPlan = -1, tPlan = 0, noir = false, planFige = null;
function vitrine(dt) {
  if (iPlan < 0) allerPlan(0);
  let P = PLANS[iPlan];
  if (!planFige && (tPlan += dt) > P.duree) { allerPlan((iPlan + 1) % PLANS.length); P = PLANS[iPlan]; }
  const fondu = !planFige && tPlan > P.duree - FONDU;
  if (fondu !== noir) { noir = fondu; $('fondu').classList.toggle('noir', noir); if (noir) $('plan-nom').classList.add('cache'); }
  cam.plan(P, planFige ? planFige.u : tPlan / P.duree, largeur > hauteurE * 1.15);
  VISE.set(P.vise[0], P.vise[1] - 1.2, P.vise[2]); // (l'ombre suit ce qu'on regarde)
  joueur.sync(dt, temps);
  if (peuple) bourg(dt, LOIN);
}
function allerPlan(i) {
  iPlan = i; tPlan = 0;
  const h = PLANS[i].heros;
  if (h) joueur.placer(h[0], h[1], h[2]);
  joueur.regard = h ? camera.position : null; // le personnage regarde la caméra
  const n = $('plan-nom'); n.textContent = PLANS[i].nom; n.classList.remove('cache');
}

/* ------------------------------------------------------------------ écrans */
for (const b of document.querySelectorAll('.perso')) {
  b.setAttribute('aria-pressed', String(b.dataset.h === choixHeros));
  b.addEventListener('click', () => jeu.changerHeros(b.dataset.h));
}
// Jouer : la mission 1 ; ou directement la mission 2 ou la 3 (la tournée prend un bon quart d'heure)
function lancer(m) { // 'tournee', 'traitement', 'habillage', ou 'reprendre' (la partie enregistrée)
  peupler();
  ctrl.actions.length = 0; ctrl.touchers.length = 0; // rien de ce qui a été tapé sur l'accueil n'est rejoué
  son.demarrer();
  if (tactile) { try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (_) { /* refusé */ } }
  $('accueil').hidden = true; $('hud').hidden = false;
  noir = false; $('fondu').classList.remove('noir', 'lent');
  joueur.placer(L.depart.x, L.depart.z, L.depart.h); joueur.regard = null; // (l'accueil l'avait posé pour son plan)
  etat = 'jeu';
  cam.yaw = joueur.h; cam.pret = false;
  if (m === 'reprendre') reprendrePartie(SAUVE.partie);
  else if (m === 'traitement') { lendemain(); mission2 = false; jeu.minutes = 1440 + 420; horloge(0); traitement.demarrer(); } // le lendemain d'une tournée faite, 7 h
  else if (m === 'habillage') { surlendemain(); mission3 = false; jeu.minutes = 2 * 1440 + 420; horloge(0); habillage.demarrer(); } // le jour d'après, 7 h
  else mission.demarrer();
  dernier = performance.now();
}

/* ------------------------------------------------------------------ sauvegarde (sauvegarde.js)
   La partie s'enregistre toute seule, toutes les quatre secondes de jeu et quand on quitte la page, à un moment sûr :
   aucun geste en cours (monter, charger, livrer), rien au chai, et la mission dans un état qu'on sait reprendre
   (mission.js, mission2.js : stable, instantane). À l'accueil, « Continuer » la reprend, au domaine. */
let tSauve = 0;
function sauver() {
  if (etat !== 'jeu' || gestes.actif || chai.auChai || chai.dansChai) return;
  const M = enCours();
  if (!M.stable) return;
  SAUVE.enregistrer({ mission: jeu.enCoursId, minutes: jeu.minutes, ventes: jeu.ventes, etat: M.instantane(), quand: Date.now() });
}
addEventListener('pagehide', sauver);
document.addEventListener('visibilitychange', () => { if (document.hidden) sauver(); });
// Reprendre la partie enregistrée : l'avancement (mission.js, mission2.js : reprendre), puis ce qui se voit (les piles
// signées sur la palette, les cartons chargés dans leur véhicule, les clients servis rentrés chez eux, le chèque sur le
// bureau, l'argent, les étoiles) ; on est au domaine, à pied, les véhicules à leur place.
function reprendrePartie(P) {
  jeu.minutes = P.minutes; jeu.ventes = P.ventes || 0; hud.argent(jeu.ventes);
  if (P.mission === 'habillage') {
    surlendemain(); mission3 = false; horloge(0);
    habillage.reprendre(P.etat);
    gens3.reprendre();
    // la remorque déjà livrée : dételée dans la cour de l'imprimerie, les palox rentrés (ou qu'on rentre tout de suite)
    if (habillage.livre) {
      const D = L.entrepot.depot;
      att.poser(D.x, D.z, D.h);
      dech = new Dechargement({ ch: mChariot, att, L: L.entrepot, conducteur: null, col, scene, vite: VITE_CHARIOT });
      dech.finir(); finDechargement();
      const f = gens3.liste[1], S = L.entrepot.stock[0]; f.p.placer(S.x + 1.6, S.z - 1.4, Math.PI / 2);
    }
  } else if (P.mission === 'traitement') {
    lendemain(); mission2 = false; horloge(0);
    traitement.reprendre(P.etat);
  } else {
    horloge(0);
    mission.reprendre(P.etat);
    for (const p of mission.palette) p.groupe.visible = mission.client(p.client).statut === 'signee';
    for (const v of VEHICULES) {
      const Pl = mission.places[v.genre];
      if (!Pl || !v.m.cartons) continue;
      let n = 0; Pl.forEach((id, i) => { v.m.cartons[i].visible = !!id; if (id) n++; }); v.p.charge = n;
    }
    clients.reprendre();
    bureau.cheque.visible = ['depose', 'saisi'].includes(mission.retardataire.statut);
    hud.etoiles(mission.etoiles);
  }
  joueur.placer(L.depart.x, L.depart.z, L.depart.h); cam.yaw = L.depart.h; cam.pret = false;
  hud.banniere(MISSIONS.reprise, MISSIONS.enCours[libelle(P)], 3);
}
// ce qu'on dit de la partie enregistrée (à l'accueil, à la reprise) : la mission, ou rentrer dormir, ou tout est gagné
const libelle = P => (P.mission === 'traitement' && ['dodo', 'libre'].includes(P.etat.etape) ? 'dodo' : P.mission === 'habillage' && P.etat.etape === 'libre' ? 'libre' : P.mission);
// Les missions de l'accueil (Teddy, 25/11/2026 : « les niveaux ne sont pas accessibles dès le début ») : la 1 toujours ;
// chacune des suivantes quand la précédente est gagnée (ou elle-même déjà gagnée). Le grand bouton : « Continuer » la
// partie enregistrée, sinon « Jouer » la première mission ouverte et pas encore gagnée.
const IDS = MISSIONS.liste.map(M => M.id);
const ouverte = (G, i) => i === 0 || !!G[IDS[i - 1]] || !!G[IDS[i]];
let aJouer = IDS[0];
function missionsAccueil() {
  const G = SAUVE.gagnees, P = SAUVE.partie, reprise = !!(P && P.etat);
  const k = IDS.findIndex((id, i) => ouverte(G, i) && !G[id]);
  aJouer = IDS[Math.max(0, k)];
  for (const b of document.querySelectorAll('.mi')) {
    const i = IDS.indexOf(b.dataset.m), M = MISSIONS.liste[i], ok = ouverte(G, i), g = !!G[M.id];
    b.disabled = !ok;
    b.classList.toggle('verrou', !ok); b.classList.toggle('gagnee', g); b.classList.toggle('suivante', ok && !g && !reprise && M.id === aJouer);
    b.setAttribute('aria-label', `${M.n}, ${M.titre} : ${g ? 'gagnée, à rejouer' : ok ? 'à jouer' : `fermée, elle s'ouvre quand la ${MISSIONS.liste[i - 1].n.toLowerCase()} est gagnée`}`);
  }
  const M = MISSIONS.liste[IDS.indexOf(aJouer)];
  $('jouer-t').textContent = reprise ? 'Continuer' : 'Jouer';
  $('jouer-s').textContent = reprise ? MISSIONS.enCours[libelle(P)] : `${M.n} · ${M.titre}`;
}
$('jouer').addEventListener('click', () => lancer(SAUVE.partie?.etat ? 'reprendre' : aJouer));
for (const b of document.querySelectorAll('.mi')) b.addEventListener('click', () => { if (!b.disabled) lancer(b.dataset.m); });
$('poche').addEventListener('click', () => { if (etat === 'jeu' && $('fin').hidden && !pc.ouvert) { son.jouer('tap'); tel.basculer(); } });
// (la carte de fin se remplit quand elle s'affiche : montrerFin)
$('continuer').addEventListener('click', () => { $('fin').hidden = true; jeu.finVue = false; ctrl.actions.length = 0; });

document.addEventListener('gesturestart', e => e.preventDefault());
requestAnimationFrame(boucle);
$('jouer').disabled = false;
missionsAccueil();
{ const aLancer = SAUVE.aLancer(); if (aLancer) lancer(aLancer); } // une mission rejouée depuis le téléphone : tout de suite
mesures.script = Math.round(performance.now() - T0);

// banc de test (simulation sans affichage, mesure du coût d'une image)
window.CL = {
  jeu, mission, clients, ctrl, camera, renderer, scene, monde, mesures, GAREES, relief, cam, traitement, pulve, parvis,
  habillage, gens3, tel, attelage: att, mRem, mChariot, get dech() { return dech; },
  // la tournée de Noël faite d'un coup (essais) : on rentre dormir, la mission 2 commence au réveil
  versMission2() { mission.aller('dodo'); joueur.placer(L.maison.x, L.maison.z + 1, Math.PI); dormir(); this.finirGeste(); },
  // la journée de traitement faite d'un coup (essais) : on rentre dormir, la mission 3 commence au réveil
  versMission3() { traitement.etape = 'dodo'; joueur.placer(L.maison.x, L.maison.z + 1, Math.PI); dormir(); this.finirGeste(); },
  get voitureProche() { return voitureProche(); },
  sauver() { sauver(); return SAUVE.partie; }, SAUVE, lancer,
  // l'accueil : le plan i figé à la fraction u (captures), ou qui reprend son cours (u omis)
  plan(i, u) { allerPlan(i); planFige = u == null ? null : { u }; }, PLANS,
  get tr() { return tr; },
  vehicule(genre) { return VEHICULES.find(v => v.genre === genre); },
  passants() { return passants.map(p => p.p); },
  get gens() { return passants; }, // les passants eux-mêmes (Passant : attente, ecrase...)
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
