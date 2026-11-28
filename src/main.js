// Tournée générale : boucle de jeu, assemblage du monde, des personnages et de l'interface.
import * as relief from './relief.js';
import * as THREE from 'three';
import { construireMonde, BRUME, SOLEIL } from './monde.js';
import { UNI, compacter, indexer, MAT } from './modeles.js';
import { Collisions } from './collisions.js';
import { tracteur, van, voiture, voitureConduite, allumerPhares, geoCartonOuvert } from './engins.js';
import { perso, HEROS, tirerApparence } from './perso.js';
import { Pieton, Passant } from './pieton.js';
import { Tracteur, Voiture, natureSol } from './vehicules.js';
import { Camera } from './camera.js';
import { Controles } from './controles.js';
import { Hud } from './hud.js';
import { Telephone } from './telephone.js';
import { PC } from './pc.js';
import { Mission, COULEUR } from './mission.js';
import { enjambeur, deplierEnjambeur } from './enjambeur.js';
import { remorque, Attelage, peutAtteler, etapesAttelerAide, etapesDeteler, habillerPalox, parPoses, chariot, placerChariot, voirChariot, asseoir as asseoirChariot, descendre as descendreChariot, Dechargement, transpalette, TRANSPALETTE } from './remorque.js';
import { Traitement } from './mission2.js';
import { Habillage } from './mission3.js';
import { son } from './audio.js';
import { hasard, lisse, $, ouvert, dateJeu, jourDe, heureDe, majuscule } from './outils.js';
import { Pilote, croisiere } from './pilote.js';
import { Gestes, pileCartons } from './gestes.js';
import { FIN, DIALOGUES, CHOCS_VOITURE, VOITURES as REPLIQUES, TRAITEMENT, HABILLAGE, PHYTO, LP_URL, MISSIONS, CHIEN, GUIDE_VEHICULE as GV } from './textes.js';
import { Paliers } from './qualite.js';
import { Particules, Taches, Traces, EffetsVehicule } from './particules.js';
import { Bureau } from './bureau.js';
import { Solumatic } from './solumatic.js';
import { Chai } from './chai.js';
import { Verres } from './verres.js';
import { Clients } from './clients.js';
import { Parvis } from './parvis.js';
import { Chien } from './chien.js';
import { Tonnellerie } from './tonnellerie.js';
import { Village } from './village.js';
import { Restaurateurs } from './restaurateurs.js';
import { Velos, VeloJoueur, modeleVelo, gareProche, prendreGare, GARES } from './velos.js';
import { Ecole } from './ecole.js';
import { SAUVE } from './sauvegarde.js';
import { Reseau, longueur, ecart } from './reseau.js';

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
  regler(q) { monde.ciel.scale.setScalar((q.brume[1] * 1.6 + 60) * 0.9 / 800); regarder(vueDedans, vueLoin); taches.mat.opacity = q.tache; }, // (dedans, la vue garde sa portée : chez Solumatic, tout le bâtiment)
});
// Jusqu'où la caméra dessine : loin dehors (la brume du palier) ; dans le bureau du chai, la pièce seulement (le monde
// extérieur, derrière les murs, n'est pas dessiné, ni le ciel) ; chez Solumatic, tout le bâtiment (loin), et de plus près
// (la caméra frôle les cloisons : son plan proche à 8 cm)
let vueDedans = false, vueLoin = 16;
function regarder(dedans = vueDedans, loin = 16) {
  vueDedans = dedans; if (dedans) vueLoin = loin;
  camera.far = dedans ? vueLoin : paliers.q.brume[1] * 1.6 + 60; camera.near = dedans && vueLoin > 20 ? 0.08 : 0.3; camera.updateProjectionMatrix();
  monde.ciel.visible = !dedans;
}
// Chez Solumatic, l'extérieur n'est ni dessiné ni calculé : on retire de la scène tout ce qui n'est pas l'intérieur (la
// lumière, le personnage, la porte d'entrée, ceux qui y travaillent, les taches de contact restent) et on le remet en
// sortant (solumatic.js : passer, derrière le fondu au noir). Le rendu ne parcourt plus le monde, la carte d'ombre n'est
// plus refaite, la vie du bourg attend (bourg : seuls l'œnologue, l'étiqueteur et Marc continuent, la mission 3 en
// dépend).
let isoles = null;
const GARDES = new Set();
function isoler(oui) {
  if (oui && !isoles) {
    isoles = scene.children.filter(o => !GARDES.has(o));
    scene.remove(...isoles);
  } else if (!oui && isoles) { scene.add(...isoles); isoles = null; }
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
const tonnellerie = new Tonnellerie({ scene, camera, emettre }); // la tonnellerie de la zone d'activités : le feu, ceux qui y travaillent
const traces = new Traces(scene);
const effets = new EffetsVehicule(particules, traces, col, rnd); // fumée, traces, feuilles, gravillons du véhicule conduit

/* ------------------------------------------------------------------ personnages, tracteur, voitures */
let choixHeros = stocke.lire('tournee-generale-heros') || 'vigneron';
if (!HEROS[choixHeros]) choixHeros = 'vigneron';
let joueur = new Pieton(perso(HEROS[choixHeros]));
scene.add(joueur.m.groupe);
joueur.placer(L.depart.x, L.depart.z, L.depart.h);

// Les véhicules du joueur : le tracteur et le van du domaine (on livre avec l'un ou l'autre), et les voitures qu'il a
// empruntées (ou volées, en mode WTF). tr (physique) et tm (modèle) désignent le véhicule courant : celui qu'on conduit,
// ou le dernier conduit. VEH_CARTE : repérés sur la mini-carte quand on est à pied ; OBSTACLES : ce que voient les
// voitures de la départementale (le joueur, puis chaque véhicule, avec son emprise).
const VEHICULES = [], VEH_CARTE = [], OBSTACLES = [null], LOINS = []; // (LOINS : cachés au-delà de la brume, voirLoin)
function creerVehicule(genre, modele, lieu, poste, Physique = Tracteur) {
  scene.add(modele.groupe); LOINS.push(modele.groupe);
  const p = new Physique(modele, genre);
  p.placer(lieu.x, lieu.z, lieu.h);
  p.pos.veh = p;
  const v = { genre, m: modele, p, poste };
  VEHICULES.push(v); OBSTACLES.push(p.pos);
  if (genre !== 'velo') VEH_CARTE.push(p); // (un vélo laissé quelque part n'est pas repéré sur la mini-carte)
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
// La remorque de palox du Clos 2025 (mission 3 ; remorque.js) ; seul le tracteur la tire. Rangée vide sous le hangar
// (L.remorque.range) ; Marc la sort, chargée, devant le domaine pour la mission 3 (jeu.remorque.preparer).
// Posée, c'est une boîte du décor ; attelée, elle suit le tracteur (Attelage.maj, à chaque image) et repousse les piétons.
const mRem = remorque();
scene.add(mRem.groupe); LOINS.push(mRem.groupe);
const att = new Attelage(mRem, col);
att.poser(L.remorque.range.x, L.remorque.range.z, L.remorque.range.h); att.vider();
OBSTACLES.push(att.pos); // les voitures de la départementale la voient
// (pour contourner à pied, gestes.js : la remorque attelée comme un véhicule de plus)
const remorqueContour = { p: att, m: mRem, genre: 'remorque' };
// Le chariot élévateur de l'imprimerie : à sa place dans la cour ; il décharge les palox (Dechargement)
const mChariot = chariot();
scene.add(mChariot.groupe);
placerChariot(mChariot, L.entrepot.chariot, col);
let dech = null;
// Le transpalette du domaine (un gerbeur électrique : remorque.js), rangé dans le hangar ; à la fin de la mission 3, Marc
// rentre avec lui les palox au chai (jeu.marc, plus bas)
const mTP = transpalette();
scene.add(mTP.groupe);
placerChariot(mTP, L.transpalette, col);
let dechChai = null;
const pilote = new Pilote(); // conduite assistée au doigt (pilote.js)

const HAUTS = ['#c0392b', '#2e86de', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400', '#7f8c8d', '#e84393', '#34495e', '#f1ece2'];
const BAS = ['#2c3e50', '#34495e', '#5d4037', '#455a64', '#1e272e', '#6d4c41', '#8a7f6a'];
// Un passant tiré au sort (r : le tirage au sort, celui du jeu par défaut ; oa : options de l'apparence, perso.js
// tirerApparence : age, assis, canne...). Il prend à r autant de tirages qu'avant, dans le même ordre (ce qui est tiré
// ensuite, trajets compris, ne bouge pas) ; ils servent de graine à son apparence, tirée à part (teint, cheveux, âge,
// silhouette, et dehors en décembre : manteau, doudoune, écharpe, bonnet). Une tenue de travail (un tablier, une tenue
// imposée) reste telle quelle, portée par un jeune ou un adulte.
const unPassant = (extra = {}, r = rnd, oa = {}) => {
  const pk = a => a[Math.floor(r() * a.length)];
  const g0 = r(), g1 = r(), g2 = r(), g3 = r(), haut = pk(HAUTS), bas = pk(BAS);
  let g4 = r(); if (g4 >= 0.2) g4 += r();
  const g5 = r(), g6 = r();
  const ra = hasard(Math.floor(g0 * 2147483647) ^ Math.floor(g1 * 65536) << 15 ^ Math.floor((g2 + g3 + g4 + g5 + g6) * 1e6));
  const travail = !!(extra.tablier || extra.tenue);
  return perso({ haut, bas, ...tirerApparence(ra, { hiver: !travail, actif: travail, ...oa }), ...extra });
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
  // (les traits, perso.js : un caviste âgé à la barbe blanche, un barman au dégradé, une cheffe aux tresses...)
  cave: { age: 'aine', voute: 0.5, peau: '#e8b896', cheveux: '#dedbd4', coiffure: 'chauve', barbe: 'pleine', haut: '#f0ece4', col: '#f0ece4', bas: '#2f2f35', tablier: '#3b2a26', lunettes: true, lunettesC: '#5a3a22' },
  bar: { peau: '#523326', cheveux: '#17120f', nature: 'crepu', coiffure: 'degrade', barbe: 'courte', iris: '#1f1612', haut: '#1f3b4d', col: '#f2d488', bas: '#2c2c30', tablier: '#e9e3d6' },
  treille: { femme: true, peau: '#724b36', cheveux: '#22170f', nature: 'crepu', coiffure: 'tresses', attache: true, iris: '#3b2a1e', haut: '#f4f1ea', col: '#f4f1ea', bas: '#34343a', tablier: '#f4f1ea' },
  // l'épicier en retard de paiement, devant sa boutique, le chèque prêt
  epicerie: { peau: '#e4b38a', cheveux: '#5a4a3a', coiffure: 'court', barbe: 'moustache', haut: '#7a5c3f', col: '#e9e1cf', bas: '#2f3440', tablier: '#2f4a6b' },
  // le patron de l'Auberge du Moulin, le prospect, en veste de cuisine
  auberge: { peau: '#c5926c', cheveux: '#17120f', coiffure: 'degrade', haut: '#f4f1ea', col: '#f4f1ea', bas: '#2f2f35', tablier: '#5a6b2f' },
  // mission 3 : Hélène, l'œnologue, en blouse blanche ; Julien, l'étiqueteur de l'imprimerie, en bleu de travail ; Marc,
  // le salarié du domaine, en salopette verte
  labo: { femme: true, peau: '#f0c8a0', cheveux: '#3b2a1a', coiffure: 'chignon', haut: '#f4f6f8', col: '#f4f6f8', bas: '#3a3f4a', tablier: '#f4f6f8', lunettes: true },
  entrepot: { peau: '#d9a27e', cheveux: '#2b1d0e', coiffure: 'court', barbe: true, tenue: 'salopette', haut: '#3c5a8a', col: '#e9e1cf', bas: '#3c5a8a', chapeau: 'casquette', chapeauC: '#e84e1b' },
  salarie: { peau: '#e0ac69', cheveux: '#7a5230', coiffure: 'court', tenue: 'salopette', haut: '#5a6b2f', col: '#e9e1cf', bas: '#5a6b2f', chapeau: 'casquette', chapeauC: '#2f4a6b' },
};
function peupler() {
  if (peuple) return;
  peuple = true;
  for (let i = 0; i < 7; i++) {
    const p = new Passant(unPassant({}, rnd, { canne: true }), L.place, rnd);
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
    const p = new Pieton(unPassant({}, rnd, s === L.banc ? { age: 'aine', assis: true, chapeau: 'beret' } : { assis: true }));
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
    const p = new Passant(unPassant({}, rr, { canne: true }), zone, rr);
    scene.add(p.p.m.groupe);
    p.bulle = 0; p.cri = hud.etiquette('Hé !', 'bulle'); p.p.etq = p.cri;
    passants.push(p);
  }
  // les conducteurs des voitures de la départementale
  for (const vo of voitures) asseoirConducteur(vo);
  parvis.peupler(hud); // le rinceur et la porteuse du parvis du chai (tenues fixées : rien ne change pour les autres)
  tonnellerie.peupler(hud); // le cercleur, le chauffeur, la rouleuse de la tonnellerie (tenues fixées)
  // l'œnologue devant son labo, l'étiqueteur devant l'entrepôt de l'imprimerie (mission 3), créés en derniers
  for (const [id, l] of [['labo', L.figurants.labo], ['entrepot', L.entrepot.figurant], ['salarie', L.remorque]]) {
    const p = new Pieton(perso(CLIENTS_3D[id]));
    scene.add(p.m.groupe); p.placer(l.x, l.z, l.h);
    gens3.ajouter(p, l, id);
  }
  habillage.c.oeno = gens3.liste[0]; habillage.c.etiq = gens3.liste[1]; habillage.c.salarie = gens3.liste[2];
  // Marc n'est là que le jour de l'habillage, la remorque préparée (jeu.remorque.preparer) ; le soir, il rentre à la maison
  // du domaine, par la cour (clients.js : horaires ; son chemin dépend d'où il attend)
  { const f = gens3.liste[2]; f.etat = 'dedans'; f.p.m.groupe.visible = false; f.porte = PORTE_MAISON; f.chemin = DU_CHAI; }
  village.creerVoitures(); // les deux voitures qui montent au château, en derniers (rien ne change pour les autres)
}
// Un conducteur au volant d'une voiture de la départementale (son propre tirage au sort) ; on le voit par les vitres
const rConducteurs = hasard(53), rPietons = hasard(59);
function asseoirConducteur(vo, r = rConducteurs) {
  const p = new Pieton(unPassant({}, r, { assis: true })), P = vo.mesh.userData.poste;
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
function conducteurDescend(p, v, sorti, debout, autour = false) {
  const G = new Gestes({ jeu, scene, col, acteur: p }), vole = jeu.wtf;
  G.lancer(vole ? G.tomber(v, sorti) : G.etapesDescendre(v, sorti, false), () => {
    debout?.();
    const x = p.pos.x, z = p.pos.z;
    const zone = autour ? { x0: x - 6, z0: z - 6, x1: x + 6, z1: z + 6 } : z > 10 ? { x0: x - 30, z0: 14.4, x1: x + 30, z1: 16.6 } : { x0: x - 30, z0: 3.9, x1: x + 30, z1: 5.9 };
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
for (const [x, z, r, c, y = 0] of [...L.garees, ...L.chateau.garees]) { // (y : le village du château, sur son plateau)
  const m = voiture(c); m.position.set(x, y, z); m.rotation.y = r; m.receiveShadow = true; m.name = 'voiture garée';
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
cam.toits = L.toits; // (sous le toit du hangar, la caméra reste sous la charpente)
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
    if (this.auVolant && veh.genre === 'velo') { tm.incline.add(joueur.m.groupe); joueur.velo = tr.Vp; } // (en selle : velos.js)
    else if (this.auVolant) { tm.caisse.add(joueur.m.groupe); joueur.m.groupe.position.copy(tm.siege); }
    else scene.add(joueur.m.groupe);
    joueur.sync(0, temps);
    for (const b of document.querySelectorAll('.perso')) b.setAttribute('aria-pressed', String(b.dataset.h === h.replace('2', ''))); // (l'autre apparence compte)
    if (etat === 'accueil') allerPlan(0); // l'accueil montre le personnage choisi
  },
  finVue: false,
  tactile,
  // la carte de fin d'une mission (F : textes.js, FIN ou TRAITEMENT.finCarte), avec la prévente du registre après la 2
  finDemo() { const h = heureDe(this.minutes); montrerFin(h >= 18 * 60 || h < 5 * 60 ? FIN : { ...FIN, texte: FIN.texteJour }, false); },
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
  get ici() { return att.pos; },          // la remorque (au domaine : où Marc attend)
  approche: L.remorque.approche,         // où le tracteur vient se mettre devant le timon (la balise pour atteler)
  get attelee() { return att.attelee; },
  peutAtteler: () => jeu.auVolant && veh.genre === 'tracteur' && peutAtteler(tr, att),
  // atteler avec l'aide de f (Marc au domaine, Julien à l'imprimerie : une entrée de gens3) ; virage : une manœuvre avant
  // de reculer sur l'anneau (à l'imprimerie, le lendemain)
  atteler(f, fin, virage = null) {
    const v = veh; couperMoteur(); ctrl.relacher();
    gestes.lancer(etapesAttelerAide(gestes, v, att, f.gestes, {
      manoeuvre: virage ? parPoses([[tr.pos.x, tr.pos.z, tr.h], virage]) : null, couper: couperMoteur,
      cadre: (a, b) => gestes.cadrerEntre(a, b, v),
      lancer: (etapes, fait) => {
        f.etat = 'range'; f.gestes.g = null; f.p.salut = false; f.p.regard = null; f.p.m.groupe.visible = true;
        f.gestes.lancer(etapes, () => {
          f.etat = 'dehors'; f.l = { x: f.p.pos.x, z: f.p.pos.z, h: f.p.h }; fait();
          // Marc, au domaine : il a fini d'aider, il rentre à la maison (Teddy, 25/11/2026)
          // (par le portail, puis à l'est de l'arbre de la cour)
          if (f === gens3.liste[2]) { const G = f.gestes; f.etat = 'range'; G.lancer([...G.allerA(() => VERS_MAISON[0], () => Math.PI), ...G.allerA(() => VERS_MAISON[1], () => Math.PI), ...G.allerA(() => VERS_MAISON[2], () => -2.6), ...G.entrer(PORTE_MAISON)], () => { f.etat = 'dedans'; }); }
        });
      },
    }), fin);
  },
  // dételer, la remorque posée à la place depot (le tracteur avance tout seul pour l'y mettre)
  deteler(depot, fin) { const v = veh; couperMoteur(); ctrl.relacher(); gestes.lancer(etapesDeteler(gestes, v, att, { couper: couperMoteur, sorti: aPied, installe: () => auVolant(v), depot }), fin); },
  // rangée vide sous le hangar (le matin de l'habillage, avant que Marc la prépare ; le lendemain de la mission 3) ; le
  // transpalette à côté ; Marc pas là
  ranger() {
    const R = L.remorque.range;
    att.poser(R.x, R.z, R.h); att.vider();
    placerChariot(mTP, L.transpalette, col);
    const f = gens3.liste[2]; if (f) { f.etat = 'dedans'; f.p.m.groupe.visible = false; }
  },
  // préparée par Marc : chargée, à sa place au bord de l'allée ; il attend à côté, côté allée, près du timon
  preparer() {
    att.poser(L.remorque.x, L.remorque.z, L.remorque.h); att.recharger(); habillerPalox(mRem, false);
    const f = gens3.liste[2], P = att.versMonde(2.0, 0, 2.2, { x: 0, y: 0, z: 0 });
    if (f) { f.l = { x: P.x, z: P.z, h: att.h + Math.PI / 2 }; f.p.placer(P.x, P.z, f.l.h); f.etat = 'dehors'; f.p.m.groupe.visible = true; f.ferme = false; f.chemin = VERS_MAISON; }
  },
  // l'habillage fini : les palox habillés rechargés à l'imprimerie, la remorque tournée vers la sortie ; Julien à côté ;
  // le hangar vide
  habillee() {
    const R = L.entrepot.retour;
    att.poser(R.x, R.z, R.h);
    // (une partie reprise : le déchargement d'abord refait d'un coup, puis les palox remis sur la remorque)
    if (!dech) { dech = new Dechargement({ ch: mChariot, att, L: L.entrepot, conducteur: null, col, scene, vite: VITE_CHARIOT }); dech.finir(); }
    dech.vider(); placerChariot(mChariot, L.entrepot.chariot, col);
    att.recharger(); habillerPalox(mRem, true);
    const f = gens3.liste[1];
    if (f.p.assis) descendreChariot(f.p, mChariot, scene);
    const P = att.versMonde(-2.2, 0, 3.4, { x: 0, y: 0, z: 0 });
    f.gestes.g = null; f.l = { x: P.x, z: P.z, h: att.h - Math.PI / 2 }; f.p.placer(P.x, P.z, f.l.h); f.etat = 'dehors'; f.p.m.groupe.visible = true;
  },
};
// Marc et le transpalette (mission 3, Teddy, 25/11/2026 : « à la fin, Marc vient aider à décharger la remorque dans le chai
// avec le transpalette ») : quand on reprend la remorque à l'imprimerie (on est loin), il sort le transpalette du hangar et
// attend devant le chai ; la remorque posée, il rentre les six palox au chai (remorque.js : Dechargement, L.chai : on les
// pose devant les cuves, deux par pile), debout sur la plateforme, les mains au timon ; puis il en descend.
const PORTE_MAISON = { x: L.maison.x, z: L.maison.z - 0.2, rot: 0 }; // (la porte de la maison du domaine, façade au sud)
const VERS_MAISON = [{ x: -90.6, z: -30.5 }, { x: -90.6, z: -38.5 }, { x: -94.2, z: -52.5 }]; // de l'allée à la porte : le portail, la cour
const DU_CHAI = [{ x: -94.2, z: -52.5 }]; // de devant le chai à la porte : la cour, au sud de l'arbre
const CHAI3 = {
  chariot: { x: -84.6, z: -50.6, h: -Math.PI / 2 }, chai: { dehors: { x: -78.6, z: -52.1 }, retour: { x: -73.4, z: -50.2 } },
  stock: [-56.5, -55.1, -53.7].flatMap(z => [0, 0.78].map(y => ({ x: -68.5, y, z, h: Math.PI / 2 }))),
};
jeu.marc = {
  // il attend devant le chai, sur le transpalette
  attendre() {
    const f = gens3.liste[2], P = CHAI3.chariot;
    placerChariot(mTP, P, col); mTP.groupe.visible = true;
    f.gestes.g = null; f.etat = 'pilote'; f.p.m.groupe.visible = true; f.p.outil = TRANSPALETTE.mains;
    this.surPlateforme(0, 0);
  },
  // la remorque posée : il rentre les palox ; fin quand le dernier est posé (il descend, à côté de la grande porte)
  decharger(fin) {
    if (gens3.liste[2].etat !== 'pilote') this.attendre();
    dechChai = new Dechargement({ ch: mTP, att, L: CHAI3, conducteur: null, col, scene, vite: 3.4, habille: true });
    this.fin = fin;
  },
  // debout sur la plateforme : le personnage suit le transpalette (pas d'enfant : il marche après), les mains au timon
  surPlateforme(dt, t) {
    const f = gens3.liste[2], p = f.p, g = mTP.groupe, h = g.rotation.y, P = TRANSPALETTE.pied;
    p.pos.set(g.position.x + Math.sin(h) * P.z, 0, g.position.z + Math.cos(h) * P.z); p.h = p.hv = h; p.v = 0; p.maj = true;
    p.sync(dt, t); p.m.groupe.position.y += 0.15; // (sur la plateforme)
  },
  maj(dt, t) {
    if (!dechChai || dechChai.fini) return;
    dechChai.maj(dt, t);
    this.surPlateforme(dt, t);
    if (dechChai.fini) {
      // il descend, va devant la grande porte, se tourne vers la cour
      const f = gens3.liste[2], G = f.gestes, D = { x: -78.4, z: -50.6 };
      f.p.outil = null; f.etat = 'range';
      G.lancer([...G.allerA(() => D, () => -Math.PI / 2)], () => { f.etat = 'dehors'; f.l = { x: D.x, z: D.z, h: -Math.PI / 2 }; f.chemin = DU_CHAI; });
      const fin = this.fin; this.fin = null; if (fin) fin();
    }
  },
  // une partie reprise, la mission finie : les palox au chai, le transpalette garé dedans
  ranges() {
    dechChai = new Dechargement({ ch: mTP, att, L: CHAI3, conducteur: null, col, scene, vite: 3.4, habille: true });
    dechChai.finir();
  },
};
// le carton ouvert du chai, près de la palette (mission 3) : on y prend une bouteille, l'échantillon pour le labo
const CARTON3 = { x: L.palette.x, y: 0.36, z: L.palette.z + 1.05 }; // (le haut des bouteilles)
jeu.carton = CARTON3;
const cartonOuvert = new THREE.Mesh(geoCartonOuvert(), MAT);
cartonOuvert.position.set(CARTON3.x, relief.sol(CARTON3.x, CARTON3.z), CARTON3.z); cartonOuvert.castShadow = true; cartonOuvert.receiveShadow = true; cartonOuvert.visible = false;
scene.add(cartonOuvert);
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
// (leurs heures d'ouverture : le labo, l'imprimerie, le domaine ; outils.js, HORAIRES ; mission3.js)
const gens3 = new Clients({ jeu, scene, col, mission: { fait: id => habillage.fait(id), arretDe: id => id, deposes: [],
  horaire: id => habillage.horaire(id), occupe: id => habillage.occupeAvec(id), veut: id => habillage.veut(id) } });
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
const etqVelo = hud.action('Prendre le vélo'); // (un vélo garé, ou celui d'un cycliste : veloProche)
const etqMonter = hud.action('Monter'), etqServir = hud.action('Servir un verre'), etqDescendre = hud.action('Descendre'), etqPrendre = hud.action('Emprunter la voiture'), etqDormir = hud.action('Rentrer dormir');
const etqEchantillon = hud.action('Prendre un échantillon'); // mission 3 : le carton ouvert du chai
const etqPresenter = hud.action(''); // les restaurateurs du coin : « Présenter nos vins » (restaurateurs.js)
const etqCible = hud.etiquette('', 'cible');
// le bureau du chai (bureau.js) : ses étiquettes, le chèque posé sur le bureau en bois
const bureau = new Bureau({ jeu, monde, scene, gestes, hud, ctrl, cam, mission, pc, tel, regarder });
// les bureaux de Solumatic, dans la zone d'activités (solumatic.js) : la porte d'entrée, ceux qui y travaillent
for (const o of [monde.soleil, monde.soleil.target, monde.hemi, monde.interieurSolu, monde.porteSolu.parent, joueur.m.groupe, taches.im]) GARDES.add(o);
const solu = new Solumatic({ jeu, monde, scene, gestes, hud, ctrl, cam, tel, son, camera, regarder, isoler, emettre, garder: o => GARDES.add(o) });
const ETQ_ACTION = [...bureau.etiquettes, ...solu.etiquettes, etqEchantillon, etqServir, etqPresenter, etqMonter, etqDescendre, etqPrendre, etqDormir, etqVelo]; // celles qui se touchent (toucher)
// Le chien du domaine (chien.js) : il vit dans la cour, s'écarte de tout véhicule qui roule vers lui, se laisse caresser,
// dort à la maison. mobiles : ce qui peut rouler (les véhicules du joueur, la remorque, le transpalette de Marc) ; gens :
// ce qu'il ne traverse pas (le joueur à pied, les ouvriers du parvis, Marc)
const EMPRISE_TP = [[-0.55, 0.55, -0.8, 2.25]];
const chien = new Chien({
  scene, camera, hud, son, col, parvis, modele: () => joueur.m.maillage,
  mobiles(f) {
    for (let i = 0; i < VEHICULES.length && i < 14; i++) { const v = VEHICULES[i]; f(i, v.p.pos.x, v.p.pos.z, v.p.h, v.m.dims.emprise); }
    f(14, att.pos.x, att.pos.z, att.h, mRem.dims.emprise);
    f(15, mTP.groupe.position.x, mTP.groupe.position.z, mTP.groupe.rotation.y, EMPRISE_TP);
  },
  gens(f) {
    if (!jeu.auVolant && !jeu.dedans && joueur.m.groupe.visible && !joueur.caresse) f(joueur.pos.x, joueur.pos.z, 0.32);
    for (let i = 0; i < parvis.ouvriers.length; i++) { const o = parvis.ouvriers[i]; if (o.present) f(o.p.pos.x, o.p.pos.z, 0.32); }
    const marc = gens3.liste[2]; if (marc && marc.p.m.groupe.visible) f(marc.p.pos.x, marc.p.pos.z, 0.34);
  },
});
parvis.chien = chien;
const etqCaresser = hud.action('Caresser le chien'); ETQ_ACTION.push(etqCaresser);
for (const v of voitures) v.cri = hud.etiquette('Tût tût !', 'bulle');
// le village du château qui vit (village.js) : ses terrasses, ses touristes, ses deux voitures qui montent et
// redescendent (comme celles de la départementale : un conducteur, des phares, on les emprunte) ; AUTOS : toutes les
// voitures qui roulent, pour les chocs du véhicule qu'on conduit et la conduite assistée
const rVillage = hasard(61);
const village = new Village({
  scene, camera, hud, lieux: L, unPassant, emettre,
  voiture: c => { const m = voiture(c, undefined, true); scene.add(m); voituresM.push(m); return m; },
  conducteur: vo => asseoirConducteur(vo, rVillage),
  passantVit: (p, dt, danger, ecraseur) => passantVit(p, dt, danger, ecraseur),
});
village.garees = GAREES.filter(g => g.m.position.y > 20).map(g => g.m); // (les voitures garées du château : cachées de loin, comme ses gens)
// les restaurateurs du coin (restaurateurs.js) : huit tenanciers devant leur restaurant, à découvrir à pied ; le bureau les
// relance, ils commandent (ou pas) ; des missions cachées, hors des trois missions
const restos = new Restaurateurs({ jeu, scene, hud, camera, col });
jeu.restos = restos;
const AUTOS = [];
// les cyclistes (velos.js) : sur la départementale, dans le bourg, vers le château, sur le chemin des Grands Champs ; les
// voitures les voient (OBSTACLES : elles ralentissent, les doublent), le véhicule qu'on conduit et la conduite assistée
// aussi (AUTOS, à chaque image)
const velos = new Velos({ scene, camera, hud, col, son });
for (const c of velos.cyclistes) OBSTACLES.push(c);
const PIETONS = []; // (ceux que les cyclistes évitent : les passants du bourg, les touristes du château)
const VELOS_C = { t: 0, minutes: 0, ego: null, joueur: null, conduit: null, vehicules: VEHICULES, remorque: att, voitures, autres: village.voitures, passants: PIETONS, pousser: (p, r) => horsDesVehicules(p, r), wtf: false };
// l'école des Tilleuls (ecole.js) : ses enfants, ses adultes, les parents ; créés quand on approche. Dans la rue, chacun
// est un obstacle pour les voitures de la départementale (OBSTACLES) et pour le véhicule qu'on conduit et sa conduite
// assistée (AUTOS : une voiture immobile, sans emprise) : on ne leur roule jamais dessus, même en mode WTF
const ecole = new Ecole({ scene, camera, lieux: L });
OBSTACLES.push(...ecole.obstacles);
// le choix de la radio est gardé d'une partie à l'autre ; son bandeau se touche pour la couper ou la rallumer
son.radioCoupee = stocke.lire('tournee-generale-radio') === 'off';
$('radio').addEventListener('click', e => { e.stopPropagation(); if (jeu.auVolant) { son.jouer('tap'); jeu.basculerRadio(); } });

/* ------------------------------------------------------------------ monter, conduire, descendre ; les gestes de la mission */
// le véhicule à portée de main (le plus proche, à moins de 5 m), ou null
function vehiculeProche() {
  let best = null, dmin = 5;
  // (un vélo : à moins de 1,6 m)
  for (const v of VEHICULES) { const d = Math.hypot(joueur.pos.x - v.p.pos.x, joueur.pos.z - v.p.pos.z) + (v.genre === 'velo' ? 3.4 : 0); if (d < dmin) { dmin = d; best = v; } }
  return best;
}
// Installé au volant (fin de la montée, gestes.js) : le moteur démarre
function auVolant(v) {
  veh = v; tr = v.p; tm = v.m;
  jeu.auVolant = true;
  if (v.genre === 'velo') { joueur.v = 0; return; } // (en selle : velos.js, MONTAGE ; ni moteur, ni radio)
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
  aCharger: () => enCours() === mission && (mission.aCharger.length > 0 || mission.etape === 'chargement'),
  ouverte: () => !!dechChai && !dechChai.fini });
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
  for (const v of village.voitures) {
    if (!v.conducteur || Math.abs(v.v) > 0.6) continue;
    const d = Math.hypot(joueur.pos.x - v.x, joueur.pos.z - v.z);
    if (d < dmin) { dmin = d; best = v; }
  }
  if (jeu.wtf) for (const g of GAREES) { const d = Math.hypot(joueur.pos.x - g.x, joueur.pos.z - g.z) - 0.8; if (d < dmin) { dmin = d; best = g; } }
  return best;
}
function prendreVoiture(c) {
  if (gestes.actif) return;
  const iv = village.voitures.includes(c), ia = iv || voitures.includes(c), mesh = ia ? c.mesh : c.m, h = ia ? c.mesh.rotation.y : c.h, { nom, couleur } = mesh.userData;
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
    if (iv) village.retirer(c); else voitures.splice(voitures.indexOf(c), 1);
    c.cri.vu = false;
    REMPLACER.push({ t: temps + 20, sens: c.sens, vmax: c.vmax, couleur, cri: c.cri, village: iv });
  } else { GAREES.splice(GAREES.indexOf(c), 1); col.retirer(c.boite); }
  scene.remove(mesh); voituresM.splice(voituresM.indexOf(mesh), 1);
  veh = v; tr = v.p; tm = v.m;
  ctrl.relacher();
  const monter = () => auVolant(v);
  if (ia && jeu.wtf) {
    // mode WTF : on va jusqu'à sa portière, on l'ouvre, il en tombe ; on monte une fois qu'il s'est relevé et écarté
    gestes.lancer([
      ...gestes.versMontee(v), gestes.portiere(v, 1),
      { action: () => conducteurDescend(p, v, () => { libre = true; }, () => { debout = true; }, iv) },
      { maj: (dt, t, u, T) => { gestes.immobile(dt, t); if (debout && !tLibre) tLibre = T; return (tLibre && T > tLibre + 0.4) || T > 8; } },
      ...gestes.etapesMonter(v, monter, true),
    ]);
    return;
  }
  // sinon il descend, nous laisse la portière ouverte et s'écarte ; puis on monte
  if (ia) conducteurDescend(p, v, () => { libre = true; }, undefined, iv);
  gestes.lancer([
    { maj: (dt, t, u, T) => { gestes.immobile(dt, t); return (libre && T > 0.6) || T > 8; } },
    ...gestes.etapesMonter(v, monter),
  ]);
}
/* ------------------------------------------------------------------ les vélos (Teddy, 28/11/2026 : « permettre au personnage
   de prendre et faire du vélo, tous les vélos »)
   À pied, tout près : un vélo garé (velos.js : GARES ; il disparaît du décor, un vélo qui roule le remplace, à sa place et
   dans sa pose), ou celui d'un cycliste arrêté devant nous (il nous le prête et s'en va à pied ; en mode WTF, on le lui
   vole). Il devient un véhicule du joueur (VeloJoueur) : on le relève, on l'enfourche ; on en descend comme d'un autre
   véhicule (la béquille, ou couché sur le côté) ; on le reprend (« Monter sur le vélo »). Un vélo laissé, un véhicule le
   pousse (il glisse : VELOS_J, glisser). */
const VELOS_J = [];
function veloProche() {
  const g = gareProche(joueur.pos.x, joueur.pos.z);
  if (g) return { gare: g, x: g.x, y: g.y, z: g.z };
  const c = velos.empruntable(joueur.pos.x, joueur.pos.z);
  return c ? { cycliste: c, x: c.x, y: c.y, z: c.z } : null;
}
function prendreVelo(s) {
  if (gestes.actif) return;
  let v;
  if (s.gare) {
    const G = s.gare;
    prendreGare(G, col);
    const m = modeleVelo(G.genre, G.couleur, { panier: G.o.panier, selle2: G.o.selle2 }, true);
    v = creerVehicule('velo', m, { x: G.x, z: G.z, h: G.h }, null, VeloJoueur);
    v.p.poser(G);
  } else {
    const r = velos.ceder(s.cycliste, jeu.wtf);
    v = creerVehicule('velo', r.m, { x: r.x, z: r.z, h: r.h }, null, VeloJoueur);
    v.p.poser(r);
  }
  VELOS_J.push(v);
  monter(v);
}
function agir() {
  if (tel.ouvert || pc.ouvert || jeu.finVue || etat !== 'jeu' || joueur.service || gestes.actif) return; // pas pendant un geste
  if (bureau.agir()) return; // la porte, le chèque, le portable (bureau.js)
  if (solu.agir()) return; // la porte d'entrée de Solumatic (solumatic.js)
  if (habillage.echantillonProche) { habillage.prendreEchantillon(); return; } // mission 3 : le carton ouvert du chai
  if (jeu.auVolant) { if (Math.abs(tr.v) < 1.5) descendre(); return; }
  if (verres.servable) { verres.servir(verres.servable); return; }
  if (restos.presentable) { restos.presenter(restos.presentable); return; } // un restaurateur du coin
  if (presMaison()) { dormir(); return; }
  if (chien.caressable(joueur.pos)) { caresser(); return; }
  const v = vehiculeProche();
  if (v) { monter(v); return; }
  const vl = !jeu.dedans && veloProche();
  if (vl) { prendreVelo(vl); return; }
  const vc = voitureProche();
  if (vc) prendreVoiture(vc);
}
// Caresser le chien (chien.js, gestes.js) : on s'agenouille près de lui ; une réplique dans une bulle (son propre tirage)
function caresser() { ctrl.relacher(); gestes.caresser(chien, () => hud.bulle(chien.etqJ, CHIEN.caresse[Math.floor(chien.rnd() * CHIEN.caresse.length)], 2.6)); }
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
// (appelé pour chaque passant à chaque image : un véhicule loin du cercle est écarté avant tout calcul d'angle)
function horsDesVehicules(p, r) {
  for (let i = 0; i < VEHICULES.length; i++) {
    const e = VEHICULES[i].p, lim = 2.4 + e.d.r + r;
    if (Math.abs(p.x - e.pos.x) > lim || Math.abs(p.z - e.pos.z) > lim) continue;
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
  candidats(f) { for (const p of passants) f(p.p, 2.1); for (const p of assis) f(p, 2.5); for (const x of clients.liste) if (x.p.servable) f(x.p, 2.4); restos.candidats(f); } });
jeu.prospectServable = on => { for (const x of clients.liste) if (x.id === 'auberge') x.p.servable = on; };

// les actions (touche E, téléphone, son, radio, échap) et les touchers courts sur l'écran
function lireEntrees() {
  for (const a of ctrl.actions) {
    if (a === 'agir') agir();
    else if (a === 'tel' && $('fin').hidden && !pc.ouvert) tel.basculer();
    else if (a === 'son') son.basculer();
    else if (a === 'radio' && !(jeu.auVolant && veh.genre === 'velo')) jeu.basculerRadio(); // (pas de radio à vélo)
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
// Le bon véhicule (Teddy, 26/11/2026 : « guider sur les véhicules à prendre pour faire certaines missions, sinon ça peut
// devenir complexe, l'enjambeur tout ça ») : la mission en cours dit celui que demande l'étape (vehiculeVoulu : un genre,
// une liste, ou le véhicule où sont les cartons, et pourquoi) ; à pied ou dans un autre, jeu.guide : la balise va sur le
// plus proche de ceux qui conviennent (son nom, l'itinéraire jusqu'à lui), l'objectif dit lequel, où et pourquoi, une
// phrase le rappelle une fois par étape (loin de lui à pied, ou en montant dans un autre)
let guideIt = null, guideDit = '', tGuide = 0;
function ouEst(v) {
  const p = v.p.pos, H = L.toits[0];
  if (p.x > H.x0 && p.x < H.x1 && p.z > H.z0 && p.z < H.z1) return GV.ou.hangar;
  if (p.x > -116 && p.x < -78 && p.z > -66 && p.z < -28) return GV.ou.cour;
  return GV.ou.loin;
}
function guider(dt) {
  const M = enCours(), w = M && M.vehiculeVoulu;
  jeu.guide = null;
  if (!w || jeu.dedans || gestes.actif || etat !== 'jeu') { guideIt = null; hud.guide(null); return; }
  const ok = v => Array.isArray(w.v) ? w.v.includes(v.genre) : typeof w.v === 'string' ? v.genre === w.v : v === w.v;
  if (jeu.auVolant && ok(veh)) { guideIt = null; hud.guide(null); return; }
  const o = jeu.auVolant ? tr.pos : joueur.pos;
  let best = null, dmin = 1e9;
  for (const v of VEHICULES) if (ok(v)) { const d = Math.hypot(v.p.pos.x - o.x, v.p.pos.z - o.z); if (d < dmin) { dmin = d; best = v; } }
  if (!best) { guideIt = null; hud.guide(null); return; }
  // l'itinéraire jusqu'à lui : refait s'il a bougé ou si l'on s'en écarte
  const P = best.p.pos;
  if ((tGuide -= dt) <= 0 || !guideIt || guideIt.v !== best) {
    tGuide = 0.5;
    if (!guideIt || guideIt.v !== best || Math.hypot(guideIt.x - P.x, guideIt.z - P.z) > 3 || ecart(guideIt.pts, o) > 25) guideIt = { v: best, x: P.x, z: P.z, pts: reseau.itineraire(o, P) };
  }
  // la ligne sous l'objectif : où il est (« L'enjambeur : sous le hangar, derrière le chai ») ; une liste : chacun et où
  const raison = GV.raisons[w.raison] || '', liste = Array.isArray(w.v) ? w.v : [best.genre];
  const ligne = liste.map(g => { const v = g === best.genre ? best : VEHICULES.find(x => x.genre === g); return v ? GV.ligne(GV.noms[g], ouEst(v)) : ''; }).filter(Boolean).join(' · ');
  jeu.guide = { v: best, lieu: P, nom: GV.balise[best.genre] || 'Véhicule', route: guideIt.pts, ligne };
  hud.guide(ligne);
  // une phrase, une fois par étape et par véhicule voulu : dans un autre véhicule, ou à pied loin de lui
  const cle = (M === mission ? 'm1' : M === traitement ? 'm2' : 'm3') + ':' + M.etape + ':' + liste.join('+');
  if (cle !== guideDit && !hud.parle && !tel.ouvert && (jeu.auVolant || dmin > 15)) {
    guideDit = cle;
    hud.dire((jeu.auVolant ? GV.mauvais : GV.pied)(liste.map(g => GV.noms[g]).join(' ou '), raison));
  }
}
function conduire(dt, dtm, dernier = true) {
  let gaz = 0, braq = 0, fm = false;
  const libre = !tel.ouvert && !pc.ouvert && !jeu.finVue;
  const M = enCours(), G = jeu.guide;
  pilote.prendre(G ? G.route : M.route); // (dans le mauvais véhicule : vers le bon)
  jeu.pilote = false;
  // mission 2 : l'enjambeur engagé dans un rang fait toute la parcelle tout seul (passages, demi-tours) ; on ne gère que
  // l'avance (Teddy, 24/11/2026) : doigt posé ou flèche du haut, il avance ; glissé vers le bas ou flèche du bas, il
  // freine ; rien, il s'arrête. Le volant (doigt de côté, flèches de côté) ne fait rien.
  const engage = M === traitement && traitement.engage && libre ? pilote.commande(tr, veh.genre, M.cible, AUTOS, col, true) : null;
  if (engage) {
    const avance = ctrl.clavier ? (ctrl.ky < 0 ? 1 : ctrl.ky > 0 ? -1 : 0) : ctrl.id !== null ? (ctrl.jy > 0.45 ? -1 : 1) : 0;
    braq = engage.braq; jeu.pilote = true;
    gaz = avance > 0 ? engage.gaz : tr.v > 0.3 ? (avance < 0 ? -1 : -0.6) : tr.v < -0.3 ? 0.6 : 0;
  }
  else if (ctrl.clavier && libre) {
    gaz = -ctrl.ky; braq = -ctrl.kx;
    // dans une parcelle du jour, la bouillie prête (mission2.js) : flèche du haut seule, le guidage suit les passages
    if (M === traitement && traitement.guidage && ctrl.ky < 0 && !ctrl.kx) { const auto = pilote.commande(tr, veh.genre, M.cible, AUTOS, col); if (auto) { gaz = auto.gaz; braq = auto.braq; jeu.pilote = true; } }
  }
  else if (ctrl.id !== null && libre) {
    const sx = ctrl.jx, sy = ctrl.jy, ax = Math.abs(sx), tourne = ax > 0.2;
    const volant = tourne ? -Math.sign(sx) * Math.pow((ax - 0.2) / 0.8, 1.2) : 0;
    if (sy > 0.45) { gaz = -Math.min(1, (sy - 0.45) / 0.4); braq = volant; if (ax > 0.5 && sy > 0.55 && tr.v > 6) { fm = true; gaz *= 0.3; } } // frein à main : un geste franc, lancé
    else {
      const auto = tourne ? null : pilote.commande(tr, veh.genre, G ? G.lieu : M.cible, AUTOS, col);
      if (auto) { gaz = auto.gaz; braq = auto.braq; jeu.pilote = true; }
      else {
        braq = volant;
        const vc = (tr.croisiere || croisiere(veh.genre)) * (sy < -0.4 ? 1.35 : 1) * (1 - 0.45 * Math.abs(braq)) * (tr.vignes ? 0.45 : 1);
        gaz = Math.max(-1, Math.min(1, (vc - tr.v) * 0.9));
      }
    }
  } else if (tactile && libre) gaz = tr.v > 0.3 ? -0.5 : 0;
  if (ctrl.fm && libre) fm = true;
  // mission 2 : une parcelle finie, l'enjambeur s'arrête tout seul au bout (on la note avant la suivante : mission2.js)
  if (M === traitement && traitement.tArret > 0) { gaz = tr.v > 0.3 ? -1 : tr.v < -0.3 ? 1 : 0; braq = 0; fm = false; }
  tr.update(dtm, gaz, braq, col, AUTOS, temps, fm);
  if (M === traitement) traitement.pas(dtm); // les rampes traitent les rangs qu'elles survolent
  if (!dernier) return;
  if (veh.genre === 'velo') {
    // à vélo (velos.js : la pose est posée par le vélo) ; un choc ; la roue libre qui cliquette
    joueur.pos.copy(tr.pos); joueur.sync(dtm, temps);
    if (tr.chocVu > 0.15) { son.jouer('choc'); cam.secousse = tr.chocVu * 0.6; }
    if ((tSon -= dt) <= 0) { tSon = 0.22; if (tr.roueLibre && tr.v > 1.5) son.roueLibre(0.75, tr.v); }
    return;
  }
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
  velos.pousser(joueur.pos, joueur.r); // (on ne traverse pas un vélo)
  // un pas chaque fois qu'un pied se pose (la foulée, anim.js, fait deux pas par cycle)
  const pp = Math.floor(joueur.anim.ph * 2);
  if (pp !== pasPrec) { pasPrec = pp; if (joueur.v > 0.5) son.pas(jeu.dedans === 'solumatic' ? solu.sol(joueur.pos.x, joueur.pos.z) : natureSol(joueur.pos.x, joueur.pos.z, col), joueur.v); }
}

// La vie du bourg : les passants (ils s'écartent du véhicule qui arrive), les clients (ils se tournent vers vous et font
// signe ; leur affaire faite, ils rangent leurs cartons et rentrent : clients.js), les figurants assis, les verres qu'on
// boit, les voitures de la départementale
// Marc s'écarte d'un véhicule du joueur qui fonce sur lui (Teddy, 25/11/2026 : « il s'échappe si on essaie de l'écraser, en
// criant : attention aux accidents du travail, ça va te coûter cher ») : un saut de côté (clients.js le joue), le cri
const V_ESQ = new THREE.Vector3();
function esquiver(f, dt) {
  const p = f.p;
  f.tCri = Math.max(0, (f.tCri || 0) - dt);
  if (p.etq && p.etq.vu) hud.placer(p.etq, p.pos.x, 2.25, p.pos.z, p.m.groupe.visible);
  if (!jeu.auVolant || !p.m.groupe.visible || f.etat === 'dedans' || f.etat === 'pilote' || p.sautT > 0 || Math.abs(tr.v) < 1.6) return;
  const sg = Math.sign(tr.v), fx = Math.sin(tr.h) * sg, fz = Math.cos(tr.h) * sg, rx = p.pos.x - tr.pos.x, rz = p.pos.z - tr.pos.z;
  const devant = rx * fx + rz * fz, cote = rx * fz - rz * fx;
  if (devant < 0 || devant > 3 + Math.abs(tr.v) * 0.9 || Math.abs(cote) > 2.2) return;
  // du côté où il est déjà, s'il y a la place d'atterrir (sinon de l'autre : une remorque, un mur)
  const libre = k => [1.2, 2.4].every(l => !col.resoudre(V_ESQ.set(p.pos.x + fz * k * l, 0, p.pos.z - fx * k * l), 0.34));
  let s = cote >= 0 ? 1 : -1;
  if (!libre(s) && libre(-s)) s = -s;
  p.sauter(fz * s, -fx * s);
  if (!p.etq) p.etq = hud.etiquette('', 'bulle');
  if (f.tCri <= 0) { f.tCri = 5; hud.bulle(p.etq, HABILLAGE.dialogues.marcCri, 2.8); son.jouer('erreur'); }
}
const PARVIS_C = { t: 0, minutes: 0, ego: null, aPied: true, danger: null, pousser: (p, r) => horsDesVehicules(p, r) };
const VILLAGE_C = { t: 0, minutes: 0, ego: null, aPied: true, danger: null, ecraseur: false, obstacles: OBSTACLES };
const RESTOS_C = { t: 0, minutes: 0, ego: null, aPied: true, danger: null, pousser: (p, r) => horsDesVehicules(p, r) };
const ECOLE_C = { t: 0, minutes: 0, ego: null, danger: null, voitures }; // (l'école : ils attendent aux passages piétons qu'aucune voiture n'arrive)
// un passant (du bourg, ou un touriste du château) : il s'écarte du véhicule qui arrive (il crie) ; en mode WTF, le
// véhicule lancé lui passe dessus, il s'aplatit (il se relève quelques secondes plus tard)
function passantVit(p, dtm, danger, ecraseur) {
  const r = p.update(dtm, danger, col, temps);
  if (r === 'releve') hud.bulle(p.cri, pick(REPLIQUES.releve), 2.2);
  else if (r) hud.bulle(p.cri, 'Hé !', 1.6);
  if (ecraseur && p.ecrase <= 0 && sousVehicule(tr, p.p.pos) && p.ecraser()) {
    son.jouer('pouet'); son.jouer('choc'); cam.secousse = Math.max(cam.secousse, 0.3);
    hud.bulle(p.cri, pick(REPLIQUES.ecrase), 1.4);
  }
  if (p.ecrase <= 0) { horsDesVehicules(p.p.pos, 0.34); if (att.attelee) att.pousser(p.p.pos, 0.34); }
  if (p.cri.vu) hud.placer(p.cri, p.p.pos.x, p.p.pos.y + 2.3, p.p.pos.z, true);
}
const klaxonVillage = v => { son.jouer('klaxon'); hud.bulle(v.cri, 'Tût tût !', 1.6); };
function bourg(dtm, ego) {
  if (jeu.auVolant) { DANGER.x = tr.pos.x; DANGER.z = tr.pos.z; DANGER.v = tr.v; DANGER.h = tr.h; }
  DANGER.wtf = jeu.wtf;
  const danger = jeu.auVolant ? DANGER : null, ecraseur = jeu.wtf && jeu.auVolant && Math.abs(tr.v) > 2.5 && veh.genre !== 'velo'; // (à vélo, on n'aplatit personne)
  if (!isoles) {
    for (const p of passants) passantVit(p, dtm, danger, ecraseur);
    clients.maj(dtm, temps, ego, jeu.auVolant);
  }
  gens3.maj(dtm, temps, ego, jeu.auVolant);
  { const marc = gens3.liste[2]; if (marc) {
    // (la remorque reprise à l'imprimerie, il attend devant le chai, sur le transpalette ; le soir, il en descend et rentre
    // chez lui ; le matin, il revient, pas sous nos yeux : on est loin, ou c'est le réveil)
    const dom = ouvert(jeu.minutes, 'domaine');
    if (habillage.sms && habillage.attelee && !habillage.marc && marc.etat === 'dedans' && dom && (Math.hypot(ego.x - CHAI3.chariot.x, ego.z - CHAI3.chariot.z) > 40 || $('fondu').classList.contains('noir'))) jeu.marc.attendre();
    if (marc.etat === 'pilote' && !habillage.marc && !dom) { marc.p.outil = null; marc.etat = 'dehors'; marc.l = { x: marc.p.pos.x, z: marc.p.pos.z, h: marc.p.h }; marc.chemin = DU_CHAI; }
    jeu.marc.maj(dtm, temps);
    esquiver(marc, dtm);
  } }
  if (isoles) return; // (chez Solumatic, le bourg attend ; seuls l'œnologue, l'étiqueteur et Marc continuent : la mission 3)
  PARVIS_C.t = temps; PARVIS_C.minutes = jeu.minutes; PARVIS_C.ego = ego; PARVIS_C.aPied = !jeu.auVolant; PARVIS_C.danger = danger;
  parvis.maj(dtm, PARVIS_C);
  chien.maj(dtm, PARVIS_C);
  tonnellerie.maj(dtm, PARVIS_C);
  VILLAGE_C.t = temps; VILLAGE_C.minutes = jeu.minutes; VILLAGE_C.ego = ego; VILLAGE_C.aPied = !jeu.auVolant; VILLAGE_C.danger = danger; VILLAGE_C.ecraseur = ecraseur;
  village.maj(dtm, VILLAGE_C, klaxonVillage);
  ECOLE_C.t = temps; ECOLE_C.minutes = jeu.minutes; ECOLE_C.ego = ego; ECOLE_C.danger = danger;
  ecole.maj(dtm, ECOLE_C);
  RESTOS_C.t = temps; RESTOS_C.minutes = jeu.minutes; RESTOS_C.ego = ego; RESTOS_C.aPied = !jeu.auVolant; RESTOS_C.danger = danger;
  restos.maj(dtm, RESTOS_C); // les restaurateurs du coin, devant leur restaurant
  PIETONS.length = 0; for (const p of passants) PIETONS.push(p.p); for (const g of village.gens) if (g.genre === 'touriste') PIETONS.push(g.p);
  VELOS_C.t = temps; VELOS_C.minutes = jeu.minutes; VELOS_C.ego = ego; VELOS_C.joueur = jeu.auVolant || ego === LOIN ? null : joueur; VELOS_C.conduit = jeu.auVolant ? tr : null; VELOS_C.wtf = jeu.wtf;
  velos.maj(dtm, VELOS_C);
  AUTOS.length = 0; for (const v of voitures) AUTOS.push(v); for (const v of village.voitures) AUTOS.push(v); for (const c of velos.cyclistes) if (c.actif) AUTOS.push(c);
  for (const o of ecole.obstacles) if (o.x < 1e5) AUTOS.push(o);
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
    if (r.village) { village.nouvelleVoiture(r.couleur, 0, r.cri); continue; }
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
  for (const v of village.voitures) allumer(v.mesh.userData.phares, on);
  for (const v of VEHICULES) allumer(v.m.phares, on && v === veh && (jeu.auVolant || gestes.roule));
}

/* ------------------------------------------------------------------ rentrer dormir
   Devant la porte de la maison du domaine, « Rentrer dormir » : on entre, fondu au noir, et l'on ressort au matin, 7 h, le
   lendemain (ou le jour même, en pleine nuit après minuit). La journée de travail continue où elle en était. */
// Après la tournée de Noël (mission.js : dodo), le réveil se fait le lendemain matin (Teddy, 24/11/2026) : le tracteur, le
// van et l'enjambeur à leur place ; la mission 2 commence (mission2.js)
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
  // la remorque de palox rangée vide sous le hangar (Marc la sortira, chargée, pendant qu'on est au labo) ; le carton
  // ouvert du chai
  jeu.remorque.ranger(); cartonOuvert.visible = true;
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
        // la nuit de l'habillage : le tracteur, le van et l'enjambeur rangés dans la cour au réveil (le tracteur est peut-être
        // resté à l'imprimerie)
        else if (habillage.attendNuit) for (const v of VEHICULES) { const l = L[v.genre]; if (l) v.p.placer(l.x, l.z, l.h); }
        // la mission 3 finie : la remorque, vide, et le transpalette rangés sous le hangar pendant la nuit
        else if (habillage.etape === 'libre' && !att.attelee) jeu.remorque.ranger();
        // les professionnels, à 7 h : ceux qui étaient rentrés pour la nuit ressortent (clients.js : reveil)
        clients.reveil(); gens3.reveil();
      },
    },
    { duree: 0.5, maj: (dt, t) => gestes.immobile(dt, t) },
    {
      action: () => {
        $('fondu').classList.remove('noir'); son.jouer('claque');
        if (mission2) { mission2 = false; traitement.demarrer(); } else if (mission3) { mission3 = false; habillage.demarrer(); }
        else if (habillage.attendNuit) habillage.reveil(); // l'habillage fini pendant la nuit : le message de l'imprimerie
        else {
          hud.banniere('Bonjour !', `${majuscule(dateJeu(jourDe(jeu.minutes)))}, 7 h`, 3);
          if (enCours() === mission) mission.reveil(); // la tournée pas finie : le bureau dit ce qui reste
        }
      },
    },
  ]);
}

// La balise de la mission et son étiquette (nom, distance) ; les étiquettes d'action : le bureau du chai d'abord (les
// autres s'effacent devant elles), servir un verre, monter, descendre
const HAUT_MONTER = { van: 3.0, voiture: 2.3, enjambeur: 4.9, velo: 1.75 }; // hauteur de l'étiquette « Monter » (le tracteur : 3,6 m)
function reperes(dt, ego, cible) {
  marque.visible = !!cible && !jeu.dedans;
  if (cible) {
    marque.position.set(cible.x, 0, cible.z);
    const u = marque.userData, k = 1 + Math.sin(temps * 4) * 0.06;
    u.anneau.scale.set(k, 1, k); u.fleche.position.y = 3.2 + Math.sin(temps * 3) * 0.35; u.fleche.rotation.y = temps * 1.6;
    if ((tEtq -= dt) <= 0) {
      tEtq = 0.25;
      etqCible.el.textContent = (jeu.guide ? jeu.guide.nom : enCours().nomCible) + ' · ' + Math.round(Math.hypot(cible.x - ego.x, cible.z - ego.z)) + ' m';
    }
  }
  hud.placer(etqCible, cible ? cible.x : 0, 4.6, cible ? cible.z : 0, !!cible && !tel.ouvert && !jeu.dedans);
  const pcPres = bureau.maj() || solu.maj(dt, temps);
  verres.chercher(!jeu.auVolant && !tel.ouvert && !pc.ouvert && !joueur.service && joueur.sautT <= 0 && !gestes.actif);
  const servable = verres.servable;
  // un restaurateur du coin, tout près, à pied : « Présenter nos vins » (ou lui parler, déjà rencontré)
  restos.chercher(!jeu.auVolant && !jeu.dedans && !tel.ouvert && !pc.ouvert && !joueur.service && joueur.sautT <= 0 && !gestes.actif && !servable && !pcPres);
  const pr = restos.presentable;
  if (pr) hud.libeller(etqPresenter, restos.libelle(pr));
  hud.placer(etqPresenter, pr ? pr.p.pos.x : 0, pr ? pr.p.pos.y + 2.5 : 0, pr ? pr.p.pos.z : 0, !!pr);
  // devant la porte de la maison du domaine : rentrer dormir
  const dodo = !pcPres && !servable && !pr && !tel.ouvert && !joueur.service && !gestes.actif && presMaison();
  hud.placer(etqDormir, L.maison.x, 2.6, L.maison.z - 0.4, dodo);
  // le chien, tout près, à pied : le caresser (avant de monter dans un véhicule)
  const caresse = !dodo && !pcPres && !servable && !jeu.dedans && !jeu.auVolant && !tel.ouvert && !joueur.service && !gestes.actif && chien.caressable(joueur.pos);
  hud.placer(etqCaresser, chien.x, chien.g.position.y + 1.1, chien.z, caresse);
  hud.placer(etqEchantillon, CARTON3.x, CARTON3.y + 0.8, CARTON3.z, habillage.echantillonProche && !tel.ouvert && !pcPres);
  const vp = !caresse && !dodo && !pcPres && !pr && !jeu.dedans && !jeu.auVolant && !tel.ouvert && !servable && !joueur.service && !gestes.actif ? vehiculeProche() : null;
  if (vp) hud.libeller(etqMonter, vp.genre === 'van' ? 'Monter dans le van' : vp.genre === 'voiture' ? 'Monter dans la voiture' : vp.genre === 'enjambeur' ? 'Monter dans l\'enjambeur' : vp.genre === 'velo' ? 'Monter sur le vélo' : 'Monter');
  hud.placer(etqMonter, vp ? vp.p.pos.x : 0, vp ? vp.p.pos.y + (HAUT_MONTER[vp.genre] ?? 3.6) : 0, vp ? vp.p.pos.z : 0, !!vp);
  // un vélo garé, ou celui d'un cycliste arrêté devant nous (à emprunter, ou à voler en mode WTF)
  const vl = !vp && !caresse && !pcPres && !jeu.dedans && !jeu.auVolant && !tel.ouvert && !servable && !joueur.service && !gestes.actif ? veloProche() : null;
  if (vl) hud.libeller(etqVelo, vl.gare ? 'Prendre le vélo' : jeu.wtf ? 'Voler le vélo' : 'Emprunter le vélo');
  hud.placer(etqVelo, vl ? vl.x : 0, vl ? vl.y + (vl.gare ? 1.45 : 2.3) : 0, vl ? vl.z : 0, !!vl);
  // une voiture des autres, à emprunter (ou à voler, en mode WTF)
  const vc = !vp && !vl && !caresse && !pcPres && !jeu.dedans && !jeu.auVolant && !tel.ouvert && !servable && !joueur.service && !gestes.actif ? voitureProche() : null;
  if (vc) hud.libeller(etqPrendre, jeu.wtf ? 'Voler la voiture' : 'Emprunter la voiture');
  hud.placer(etqPrendre, vc ? vc.x : 0, 2.3 + (vc ? vc.y ?? (vc.m ? vc.m.position.y : 0) : 0), vc ? vc.z : 0, !!vc); // (au château : sur son plateau)
  hud.placer(etqServir, servable ? servable.pos.x : 0, servable && servable.assis ? 1.9 : 2.5, servable ? servable.pos.z : 0, !!servable && !pcPres);
  hud.placer(etqDescendre, tr.pos.x, tr.pos.y + (veh.genre === 'enjambeur' ? 5.0 : veh.genre === 'velo' ? 2.35 : 3.8), tr.pos.z, jeu.auVolant && !tel.ouvert && Math.abs(tr.v) < 0.8 && !hud.parle && !gestes.actif);
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
    if (jeu.auVolant && !gestes.roule) tr.update(dtm, 0, 0, col, AUTOS, temps); // (le véhicule qui roule tout seul : gestes.js)
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
  for (let i = 0; i < VELOS_J.length; i++) { const p = VELOS_J[i].p; if (p.bouge) p.glisser(dtm, temps, col); } // (un vélo laissé, poussé)
  if (dech && !dech.fini) { dech.maj(dtm, temps); if (dech.fini) finDechargement(); }
  const ego = jeu.auVolant ? tr.pos : joueur.pos, cap = jeu.auVolant ? tr.h : joueur.h;
  son.ambiance(dt, ego.x, ego.z, jeu.minutes, !jeu.auVolant || veh.genre === 'velo', !!jeu.dedans); // (à vélo, on entend les oiseaux comme à pied)
  bourg(dtm, ego);
  phares();
  if (!isoles) particules.fontaine(dtm, L.fontaine);
  guider(dt); // le bon véhicule pour l'étape en cours (avant la mission : son objectif le reprend)
  enCours().update(dt);
  restos.update(dt); // les restaurateurs du coin : relances, signatures, notifications (jamais par-dessus une mission)
  // la ligne d'habillage tourne dès que les premiers palox sont rentrés (mission 3) ; le chariot, dessiné de près
  if (monde.ligne && !isoles) monde.ligne.maj(dtm, habillage.decharge || (!!dech && dech.avancement > 0.15), camera.position.x, camera.position.z);
  voirChariot(mChariot, camera.position.x, camera.position.z);
  voirChariot(mTP, camera.position.x, camera.position.z);
  // la barre d'état du téléphone : sans réseau en bas des Grands Champs (mission 2)
  { const res = !traitement.actif || traitement.reseau; if (res !== resAff) { resAff = res; $('tel-res').textContent = res ? '4G' : 'Pas de service'; } }
  tel.update(dt);
  pc.update(dt);
  horloge(dtm);
  const cible = jeu.guide ? jeu.guide.lieu : enCours().cible;
  reperes(dt, ego, cible);
  chai.maj(dt, ego, cap, camera.position); // la grande porte, la halle dessinée de près, dedans ou dehors (chai.js)

  // la caméra : dans le bureau du chai, celle de la pièce ; dans la halle du chai, celle de la halle ; un geste qui se
  // regarde (charger, décharger, le chèque) a son cadre ; sinon, elle suit
  if (camLibre) { /* posée à la main (captures) */ }
  else if (jeu.dedans === 'solumatic') solu.camera(dt);
  else if (jeu.dedans) bureau.camera(dt);
  else if (chai.camera(dt, ego)) { /* posée au fond de la halle */ }
  else if (gestes.cadre) cam.cadrer(dt, gestes.cadre, col);
  else {
    // en dérive, la caméra suit à moitié la direction où l'on glisse (on voit le véhicule de trois quarts, en travers)
    let capCam = cap;
    if (jeu.auVolant && tr.v > 3 && Math.abs(tr.vT) > 0.8) capCam = cap + Math.atan2(tr.vT, tr.v) * 0.55 * Math.min(1, (Math.abs(tr.vT) - 0.8) / 2.5);
    cam.suivre(dt, ego.x, ego.z, capCam, jeu.auVolant ? tr.v : joueur.v, jeu.auVolant, col, jeu.auVolant ? tr : null, ego.y);
  }
  hud.carte(ego.x, ego.z, cam.yaw, cap, cible, jeu.auVolant ? 1.45 : 2.2, COULEUR, jeu.guide ? jeu.guide.route : enCours().route, jeu.auVolant ? null : VEH_CARTE);
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
const TACHES = { tracteur: [1.2, 2.1], van: [1.15, 2.5], voiture: [0.95, 2.05], enjambeur: [1.35, 2.25], velo: [0.28, 0.95] }; // demi-largeur, demi-longueur
function majTaches() {
  const t = taches;
  t.debut();
  if (!jeu.auVolant && joueur.m.groupe.visible) t.poser(joueur.pos.x, joueur.pos.z, 0.42, 0.42, 0, joueur.pos.y);
  if (isoles) { solu.taches(t); t.fin(); return; } // (chez Solumatic : ceux qui y sont, debout)
  for (const v of VEHICULES) { const [lx, lz] = TACHES[v.genre], g = v.m.groupe; t.poser(g.position.x, g.position.z, lx, lz, 0, g.position.y, g.quaternion); }
  { const g = mRem.groupe; t.poser(g.position.x, g.position.z, 1.2, 3.15, 0, g.position.y, g.quaternion); } // la remorque de palox
  if (mChariot.groupe.visible) { const g = mChariot.groupe; t.poser(g.position.x, g.position.z, 0.62, 1.35, 0, 0, g.quaternion); }
  for (const p of passants) if (ombrePerso(p.p.m, p.p.pos.x, p.p.pos.z)) t.poser(p.p.pos.x, p.p.pos.z, 0.4, 0.4, 0, p.p.pos.y);
  for (const f of clients.liste) if (clients.dehors(f) && ombrePerso(f.p.m, f.p.pos.x, f.p.pos.z)) t.poser(f.p.pos.x, f.p.pos.z, 0.4, 0.4, 0);
  for (const f of gens3.liste) if (gens3.dehors(f) && ombrePerso(f.p.m, f.p.pos.x, f.p.pos.z)) t.poser(f.p.pos.x, f.p.pos.z, 0.4, 0.4, 0);
  for (const p of assis) if (ombrePerso(p.m, p.m.groupe.position.x, p.m.groupe.position.z)) t.poser(p.m.groupe.position.x, p.m.groupe.position.z, 0.45, 0.45, 0);
  velos.taches(t, ombrePerso); // (les vélos et leurs cyclistes)
  for (const m of voituresM) t.poser(m.position.x, m.position.z, 1.1, 2.25, m.rotation.y, m.position.y);
  parvis.taches(t, ombrePerso);
  chien.taches(t, ombrePerso);
  tonnellerie.taches(t, ombrePerso);
  village.taches(t, ombrePerso);
  restos.taches(t, ombrePerso);
  ecole.taches(t, ombrePerso);
  t.fin();
}
// Les véhicules du joueur et la remorque, au-delà de la brume, ne se voient plus : ni dessinés, ni leur ombre. La brume
// (modeles.js) se compte dans l'axe de la caméra ; sous 5 m de haut, à 6 m de sa fin, elle couvre déjà tout à moins d'un
// demi-ton près (smoothstep) ; plus haut (sur les collines), elle n'est pleine qu'à 1,6 fois sa fin. R : la
// demi-longueur du plus long (la remorque, timon compris), de la marge.
const AXE = new THREE.Vector3();
function voirLoin() {
  camera.getWorldDirection(AXE);
  const c = camera.position, fin = scene.fog.far, R = 6;
  for (let i = 0; i < LOINS.length; i++) {
    const g = LOINS[i], p = g.position, prof = (p.x - c.x) * AXE.x + (p.y - c.y) * AXE.y + (p.z - c.z) * AXE.z - R;
    const vu = prof < (p.y + 4.6 < 5 ? fin - 6 : fin * 1.6);
    if (g.visible !== vu) g.visible = vu;
  }
}
// Tout ce qui précède le dessin d'une image : décor animé, ombre, herbe proche
function avantRendu(ego) {
  UNI.uTemps.value = temps;
  if (camLibre) ego = camera.position; // caméra posée à la main (captures) : l'ombre suit ce qu'on regarde
  placerLumiere(ego.x, ego.z, camLibre ? 0 : ego.y);
  voirLoin();
  majTaches();
  if (!isoles) monde.maj(camera.position.x, camera.position.z);
  // dans le bureau, la pièce ne reçoit pas d'ombre portée : on ne recalcule pas la carte d'ombre
  const q = paliers.q;
  if (q.ombres && !jeu.dedans && ++nOmbre >= q.ombrePas) {
    nOmbre = 0; renderer.shadowMap.needsUpdate = true;
    const c = monde.soleil.shadow.camera;
    monde.ombres(monde.soleil.target.position, c.right, c.top);
  }
}
// Les matrices, avant chaque rendu. three.js (r170) recalcule à chaque image celles de tout ce qui est dans la scène, caché
// ou non : les 18 os de chaque personnage lointain ou derrière une cloison comme les autres (le matrixWorldAutoUpdate que
// perso.js et chien.js font suivre à leur visibilité ne coupe que la matrice du groupe : three.js descend quand même dans
// ses enfants, et les force). On descend soi-même, sans entrer sous ce qui ne se met pas à jour (un personnage, le chien,
// cachés) : ses os seront recalculés dès qu'il se remontrera (ce qu'on lit de ses os ailleurs passe par updateWorldMatrix).
// Le reste à l'identique ; une classe qui a sa propre mise à jour (SkinnedMesh : bindMatrixInverse) la garde. Matrices
// recalculées par image : au bourg 2 250 -> 1 310, sur la place 2 250 -> 1 360, au domaine 2 270 -> 680, au château
// 3 140 -> 1 220.
{
  const MAJ0 = THREE.Object3D.prototype.updateMatrixWorld;
  const descendre = (o, force) => {
    if (o.updateMatrixWorld !== MAJ0) { o.updateMatrixWorld(force); return; }
    if (o.matrixAutoUpdate) o.updateMatrix();
    if (o.matrixWorldNeedsUpdate || force) { o.matrixWorld.multiplyMatrices(o.parent.matrixWorld, o.matrix); o.matrixWorldNeedsUpdate = false; force = true; }
    const e = o.children;
    for (let i = 0; i < e.length; i++) if (e[i].matrixWorldAutoUpdate !== false) descendre(e[i], force);
  };
  scene.updateMatrixWorld = function (force) {
    if (this.matrixAutoUpdate) this.updateMatrix();
    if (this.matrixWorldNeedsUpdate || force) { this.matrixWorld.copy(this.matrix); this.matrixWorldNeedsUpdate = false; force = true; }
    const e = this.children;
    for (let i = 0; i < e.length; i++) if (e[i].matrixWorldAutoUpdate !== false) descendre(e[i], force);
  };
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
  // vigneron ou vigneronne, en gardant l'apparence choisie dans les Réglages (perso.js : HEROS, vigneron2...)
  b.setAttribute('aria-pressed', String(b.dataset.h === choixHeros.replace('2', '')));
  b.addEventListener('click', () => jeu.changerHeros(b.dataset.h + (choixHeros.endsWith('2') ? '2' : '')));
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
  if (etat === 'jeu' && restos.rencontres.length) restos.sauver(); // (les restaurateurs du coin, à part : toujours dans un état sûr)
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
    // la remorque : cachée (pas encore préparée), à sa place au domaine, dans la cour de l'imprimerie (les palox rentrés,
    // ou qu'on rentre tout de suite), rechargée des palox habillés, ou posée au chai
    const H = habillage;
    if (H.prete) jeu.remorque.preparer(); // (Marc à sa place au domaine, au bord de l'allée)
    if (H.rentree) { const C = L.remorque.chai; att.poser(C.x, C.z, C.h); habillerPalox(mRem, true); jeu.marc.ranges(); } // (les palox rentrés au chai par Marc)
    else if (H.sms) jeu.remorque.habillee();
    else if (H.livre) {
      const D = L.entrepot.depot;
      att.poser(D.x, D.z, D.h);
      dech = new Dechargement({ ch: mChariot, att, L: L.entrepot, conducteur: null, col, scene, vite: VITE_CHARIOT });
      dech.finir(); finDechargement();
      const f = gens3.liste[1], S = L.entrepot.stock[0]; f.p.placer(S.x + 1.6, S.z - 1.4, Math.PI / 2);
    }
    if (H.echantillon !== 'aucun') cartonOuvert.visible = true; // (cinq bouteilles sur six : celle du labo est partie)
    // la remorque attelée au départ, Marc est rentré à la maison (il ressort pour le déchargement au chai : jeu.marc)
    if (H.livre || H.sms || H.rentree) { const f = gens3.liste[2]; f.etat = 'dedans'; f.p.m.groupe.visible = false; }
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
  jeu, mission, clients, ctrl, camera, renderer, scene, monde, mesures, GAREES, relief, cam, traitement, pulve, parvis, solu, tonnellerie, village, velos, ecole, mTP, get dechChai() { return dechChai; }, get isoles() { return isoles; },
  habillage, gens3, tel, attelage: att, mRem, mChariot, get dech() { return dech; }, col, restos,
  perso, tirerApparence, Pieton, unPassant, // (les personnages : planches de visages, banc diversite)
  // la tournée de Noël faite d'un coup (essais) : on rentre dormir, la mission 2 commence au réveil
  versMission2() { mission.aller('dodo'); joueur.placer(L.maison.x, L.maison.z + 1, Math.PI); dormir(); this.finirGeste(); },
  // rentrer dormir d'un coup (essais) : devant la porte de la maison, le geste joué jusqu'au bout ; 7 h, le lendemain
  dormir() { if (jeu.auVolant) return; joueur.placer(L.maison.x, L.maison.z + 1, Math.PI); dormir(); this.finirGeste(); this.step(2); },
  // remonter dans un véhicule laissé ailleurs (essais) : à côté, d'un côté puis de l'autre, jusqu'à être au volant (dans le
  // bourg, un passant tout près fait passer « Servir un verre » devant « Monter »)
  remonter(genre) {
    const v = genre ? VEHICULES.find(x => x.genre === genre) : veh;
    this.finirGeste();
    for (let k = 0; k < 40 && !(jeu.auVolant && veh === v); k++) {
      const a = k * 0.5; joueur.placer(v.p.pos.x + Math.cos(a) * 2.6, v.p.pos.z + Math.sin(a) * 2.6, 0); this.step(2);
      if (bureau.porteDehors || presMaison()) continue; // (devant la porte du bureau du chai ou de la maison, agir y entrerait)
      agir(); this.finirGeste(); for (let n = 0; n < 600 && joueur.service; n++) this.step(1); this.step(2);
    }
    return jeu.auVolant && veh === v;
  },
  // la journée de traitement faite d'un coup (essais) : on rentre dormir, la mission 3 commence au réveil
  versMission3() { traitement.etape = 'dodo'; joueur.placer(L.maison.x, L.maison.z + 1, Math.PI); dormir(); this.finirGeste(); },
  get voitureProche() { return voitureProche(); },
  // les vélos (essais : banc velo) : celui qu'on peut prendre ici, le prendre, ceux qu'on a pris
  get veloProche() { return veloProche(); }, prendreVelo, velosJ: VELOS_J, gares: GARES,
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
    // (une texture peinte à l'envoi, sans copie gardée, dit ce qu'elle occupe : modeles.js, texturePeinte ; lire son image la
    // repeindrait)
    for (const t of texs) { if (t.userData.octets) { octTex += t.userData.octets; continue; } const im = t.image; if (im && im.width) octTex += im.width * im.height * 4 * (t.generateMipmaps ? 1.33 : 1); }
    const sm = monde.soleil.shadow.map; if (sm) octTex += sm.width * sm.height * 4;
    const Mo = x => +(x / 1048576).toFixed(1);
    return { objets, matrixAutoUpdate: auto, maillages, geometries: geos.size, sommets, geoMo: Mo(octGeo), texMo: Mo(octTex), programmes: renderer.info.programs.length, tasJSMo: performance.memory ? Mo(performance.memory.usedJSHeapSize) : null };
  },
  bench(n = 120) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) { temps += 1 / 60; miseAJour(1 / 60); particules.maj(1 / 60); avantRendu(jeu.auVolant ? tr.pos : joueur.pos); rendre(); }
    paliers.attendreGPU();
    const ms = (performance.now() - t0) / n;
    // une image de plus pour compter aussi la passe d'ombre (comptée avant la remise à zéro de three.js), là où le jeu la fait
    // (dedans, la carte d'ombre n'est pas recalculée : avantRendu)
    const inf = renderer.info; inf.autoReset = false; inf.reset(); renderer.shadowMap.needsUpdate = !!paliers.q.ombres && !jeu.dedans; rendre(); inf.autoReset = true;
    return ms.toFixed(2) + ' ms par image, ' + inf.render.calls + ' appels de dessin, ' + inf.render.triangles + ' triangles (ombres comprises), qualité ' + paliers.q.nom + ', ratio ' + paliers.ratio;
  },
};
window.CL.chien = chien; // le chien du domaine (essais)
