// L'école qui vit (Teddy, 26/11/2026 : « il manque une école dans ce village et des enfants. Ils sont soit à l'école, dans
// une enceinte fermée, avec des jeux d'enfants dans la cour, et dans les horaires de non-école ils ne sont plus là, ils
// rentrent. Aucune interaction avec eux. L'école sera belle et les enfants divers »). Le décor est dans monde.js (ecole :
// le bâtiment, la cour, ses jeux, l'enceinte, les chemins) ; ici, ce qui vit :
// - vingt-quatre enfants de 3 à 11 ans (perso.js, o.age : la tête plus grosse, les jambes plus courtes), filles et
//   garçons, tous les teints, des couettes, des nattes, des tresses, des cheveux crépus, des boucles, des carrés, des
//   queues de cheval ; en doudoune, bonnet à pompon, écharpe ; le cartable sur le dos pour venir et repartir ;
// - leur journée (jour 0 : mardi 8 décembre ; mercredi : centre de loisirs ; samedi et dimanche : personne) : la garderie
//   de 7 h 30, les arrivées vers 8 h 20 (avec un parent pour les plus petits), la classe (la cour est vide ; aux fenêtres,
//   les élèves à leur pupitre), les récréations de 10 h et de 15 h, la cour pleine après la cantine, la sortie de 16 h 30
//   (les parents attendent devant le portail), la garderie jusqu'à 18 h 30 ; ils viennent et rentrent à pied, par les
//   trottoirs et les passages piétons (ils attendent qu'aucune voiture n'arrive), jusqu'à la porte de chez eux. Tout se
//   déduit de l'heure : arrivé après coup (au réveil), on trouve chacun où il doit être (posé d'un coup, hors de la vue) ;
// - les jeux : deux balançoires (le siège bouge avec l'enfant, qui « pompe »), le toboggan (l'escalier, s'asseoir, glisser,
//   les bras en l'air), deux jeux à ressort, le bac à sable, la corde à sauter (deux qui la tournent, un qui saute, les
//   autres attendent leur tour), la marelle à cloche-pied (aller jusqu'au Ciel, demi-tour, retour), la ronde (on se tient
//   la main ; à la fin de la chanson, tout le monde s'accroupit), le ballon (des passes, des tirs au but, le gardien plonge,
//   on lève les bras), les billes, chat perché (on se perche sur la jardinière ou au bord du préau), le banc rond (on
//   discute, les jambes se balancent) ; et ceux qui se promènent, deux par deux ;
// - les adultes : la maîtresse, le maître, l'animatrice ; ils surveillent (les bras croisés, les mains dans le dos),
//   ouvrent le portail pour qui arrive ou repart, et le referment ; la porte de l'école s'ouvre pour qui entre ou sort ;
// - la cloche du campanile sonne la classe, les récréations et la sortie ; l'horloge du fronton donne l'heure du jeu ; un
//   fond sonore de cour de récréation, seulement près de l'école et quand ils jouent (audio.js).
// Aucune interaction : ni étiquette, ni salut, ni verre ; jamais aplatis (même en mode WTF : ce ne sont pas des passants) ;
// dehors, les voitures et la conduite assistée les voient (obstacles), et ils s'écartent d'un véhicule qui approche.
// Légèreté : rien n'est créé avant qu'on approche (à moins de 200 m, une personne par image) ; animés de près, une image sur
// trois au-delà de 60 m, cachés au-delà de 120 m (les jeux, le portail, la cloche aussi) ; à plus de 215 m de l'école, rien
// ne se calcule ; les ombres portées des enfants à moins de 12 m (plus loin, leur tache de contact) ; aucune allocation par image.
import * as THREE from 'three';
import { perso, OS } from './perso.js';
import { Pieton } from './pieton.js';
import { B, C, S, fusion, MAT, UNI } from './modeles.js';
import { son } from './audio.js';
import { hasard, angle, versAngle, borne, lisse, mix } from './outils.js';

const LIBRE = { resoudre: () => false, rangs: () => false }; // dans la cour et sur les chemins : des chemins dégagés
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), e1 = new THREE.Euler(0, 0, 0, 'YXZ');
const AXE_Y = new THREE.Vector3(0, 1, 0), AXE_Z = new THREE.Vector3(0, 0, 1), m4 = new THREE.Matrix4();
const P1 = { x: 0, z: 0, h: 0 }, P2 = { x: 0, z: 0, h: 0 }, QA = { x: 0, z: 0, d: false }, QB = { x: 0, z: 0, d: false }; // points temporaires
// la marelle : l'ordre des cases (de la Terre au Ciel, demi-tour, retour), les cases doubles (les deux pieds)
const ORDRE_MARELLE = [0, 1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1, 0, -1], DOUBLES = [false, false, false, true, false, true, true];
// une case de la marelle (i < 0 : la Terre) : son milieu, simple ou double
function caseMarelle(Mr, i, Q) { Q.d = DOUBLES[i] || false; Q.x = Mr.x; Q.z = i < 0 ? Mr.z0 + 0.45 : Mr.z0 - (i + 0.5) * Mr.p - (i === 6 ? 0.1 : 0); return Q; }
// du bas du toboggan au pied de l'escalier, en contournant la structure par le sud
const RETOUR_TOB = [{ x: 125.8, z: -13.9 }, { x: 118.4, z: -13.9 }];

/* ---------------------------------------------------------------- l'emploi du temps
   jeu.minutes : les minutes depuis le jour 0 (mardi 8 décembre 2026) à minuit. Une minute de jeu toutes les 2 s. */
const jourDe = m => Math.floor(m / 1440), heureDe = m => m - jourDe(m) * 1440;
// mardi, mercredi, jeudi, vendredi, samedi, dimanche, lundi
const SORTES = ['ecole', 'loisirs', 'ecole', 'ecole', 'ferme', 'ferme', 'ecole'];
const sorteDe = m => SORTES[((jourDe(m) % 7) + 7) % 7];
// la cour ouverte (minutes du jour) : un jour d'école, la garderie du matin et les arrivées (jusqu'à 8 h 30), les
// récréations (10 h, 15 h), la cour après la cantine (11 h 55 à 13 h 25), la sortie et la garderie du soir (16 h 30 à
// 18 h 30) ; le mercredi, le centre de loisirs (de 8 h à 18 h), le déjeuner et le calme dedans (12 h à 13 h 30)
const COUR = { ecole: [[450, 510], [600, 615], [715, 805], [900, 915], [990, 1115]], loisirs: [[480, 720], [810, 1085]] };
const SONNERIES = { ecole: [510, 600, 615, 805, 900, 915, 990], loisirs: [] };
const dansCour = (sorte, hm) => { const P = COUR[sorte]; if (!P) return false; for (let i = 0; i < P.length; i++) if (hm >= P[i][0] && hm < P[i][1]) return true; return false; };
// la classe : on voit les élèves aux fenêtres
const enClasse = (sorte, hm) => sorte === 'ecole' && hm >= 510 && hm < 990 && !dansCour(sorte, hm) && !(hm >= 690 && hm < 715);

/* ---------------------------------------------------------------- les enfants
   [âge, fille, teint (0 très clair à 10 très foncé), coiffure, foyer (lieux.ecole.chemins : le chemin de chez lui)] */
const ENFANTS = [
  [3, 1, 2, 'couettes', 0], [4, 0, 8, 'court', 7], [4, 1, 10, 'afro', 12], [5, 0, 0, 'boucles', 5], [5, 1, 6, 'nattes', 3],
  [6, 0, 4, 'court', 0], [6, 1, 9, 'tresses', 9], [7, 0, 1, 'court', 1], [7, 1, 5, 'queue', 10], [7, 0, 10, 'afro', 12],
  [8, 1, 3, 'carre', 2], [8, 0, 7, 'boucles', 6], [8, 1, 8, 'chignon', 7], [9, 0, 2, 'court', 4], [9, 1, 0, 'long', 8],
  [9, 0, 6, 'court', 11], [10, 1, 9, 'tresses', 13], [10, 0, 4, 'boucles', 3], [10, 1, 1, 'queue', 14], [11, 0, 8, 'afro', 9],
  [11, 1, 5, 'long', 2], [3, 0, 3, 'court', 6], [11, 0, 0, 'court', 13], [6, 1, 7, 'couettes', 11],
];
const PEAUX = ['#fde4d0', '#f8d5bc', '#f1c6a4', '#e8b48a', '#d9a06e', '#c68642', '#a8693a', '#8d5524', '#6b3f22', '#4f2e1a', '#3b2314'];
const CHEV_CLAIRS = ['#e8cd8a', '#d6ad62', '#a8763e', '#7a4e2c', '#b5532e', '#4a3222', '#2b1d12'], CHEV_FONCES = ['#1a1410', '#22170f', '#2b1d12', '#3b2a1a'];
const DOUDOUNES = ['#e74c3c', '#f1c40f', '#3498db', '#e84393', '#1abc9c', '#9b59b6', '#ff7f50', '#2c3e50', '#27ae60', '#f39c12', '#5dade2', '#ff6fa8', '#c0392b', '#16a085'];
const BAS_E = ['#3b5b8c', '#2c3e50', '#2b2b30', '#6d4c41', '#4a5a7a', '#5b3a55', '#34495e'];
const LAINES = ['#f1c40f', '#e74c3c', '#ecf0f1', '#9b59b6', '#3498db', '#e84393', '#27ae60', '#ff7f50', '#2c3e50'];
const CARTABLES = ['#e74c3c', '#2e86de', '#f1c40f', '#8e44ad', '#16a085', '#e67e22', '#e84393', '#2c3e50', '#27ae60'];
// les foyers : [le matin à la garderie (heure d'arrivée), le soir à la garderie (heure où l'on vient le chercher), le
// mercredi au centre de loisirs] ; une heure du jour en minutes, ou 0
const FOYERS = {
  0: [458, 1090, 1], 7: [472, 1045, 1], 3: [485, 0, 0], 12: [0, 1070, 1], 6: [0, 1102, 1], 11: [0, 1015, 0], 5: [0, 0, 1], 14: [0, 0, 1],
};
// Les adultes de l'école : la maîtresse, le maître, l'animatrice (rôle, apparence)
const ADULTES = [
  { nom: 'maitresse', o: { femme: true, peau: '#c68642', cheveux: '#1a1410', coiffure: 'chignon', tenue: 'veste', haut: '#7a2233', col: '#e9e1cf', bas: '#2c2c34', tissuBas: 'toile', lunettes: true, echarpe: '#e8c07a' } },
  { nom: 'maitre', o: { femme: false, peau: '#f1c6a4', cheveux: '#6b4423', coiffure: 'court', barbe: true, tenue: 'pull', haut: '#2f5d50', col: '#f3eee6', bas: '#3b4150', tissuBas: 'velours', lunettes: false } },
  { nom: 'animatrice', o: { femme: true, peau: '#8d5524', cheveux: '#151515', coiffure: 'queue', tenue: 'veste', haut: '#e0802f', col: '#f4f1ea', bas: '#2b3a55', tissuBas: 'jean', chapeau: 'bonnet', chapeauC: '#2f4a6b' } },
];

// les jeux de la cour, par préférence selon l'âge (les petits, les moyens, les grands)
const PREFS = [
  ['balancoire', 'toboggan', 'ressort', 'sable', 'ronde'],
  ['toboggan', 'ronde', 'corde', 'marelle', 'balancoire', 'chat', 'billes'],
  ['ballon', 'corde', 'marelle', 'chat', 'billes', 'banc'],
];

export class Ecole {
  // c : { scene, camera, lieux } (main.js)
  constructor(c) {
    this.c = c; this.E = c.lieux.ecole; this.gens = []; this.enfants = []; this.parents = []; this.adultes = []; this.file = [];
    this.prepare = false; this.vus = false; this.n = 0; this.ouverture = 0; this.porteO = 0; this.cle = -1; this.tSon = 0;
    this.sonnee = -1; this.tCloche = 0; this.minuteH = -1; this.allumee = -1; this.classeLu = -1;
    this.centre = { x: (this.E.zone.x0 + this.E.zone.x1) / 2, z: (this.E.zone.z0 + this.E.zone.z1) / 2 };
    // les obstacles que voient les voitures et la conduite assistée : un par personne dans la rue (main.js les ajoute
    // aux listes OBSTACLES et AUTOS) ; loin de tout quand ils ne servent pas
    this.obstacles = Array.from({ length: 32 }, () => ({ x: 1e6, z: 1e6, v: 0, sens: 1, ax: 0, az: 0, cogner() {} }));
    // les chemins : longueurs cumulées (de la porte de la maison au portail)
    this.chemins = this.E.chemins.map(pts => { const l = [0]; for (let i = 1; i < pts.length; i++) l.push(l[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z)); return { pts, l, L: l[l.length - 1], tr: [] }; });
    // les traversées de rue de chaque chemin (dans le sens de l'aller) : [début, fin] en mètres
    for (const ch of this.chemins) for (let i = 1; i < ch.pts.length; i++) for (const P of this.E.passages) {
      const a = ch.pts[i - 1], b = ch.pts[i], sur = q => Math.hypot(q.x - P.x0, q.z - P.z0) < 0.6 || Math.hypot(q.x - P.x1, q.z - P.z1) < 0.6;
      if (sur(a) && sur(b)) ch.tr.push([ch.l[i - 1], ch.l[i]]);
    }
    // les points de passage de la cour et le plus court chemin de l'un à l'autre (Floyd, une fois)
    const N = Object.keys(this.E.noeuds); this.noms = N; this.nd = N.map(k => ({ x: this.E.noeuds[k][0], z: this.E.noeuds[k][1] }));
    const n = N.length, D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : 1e9))), S0 = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => j));
    for (const [a, b] of this.E.liens) { const i = N.indexOf(a), j = N.indexOf(b), d = Math.hypot(this.nd[i].x - this.nd[j].x, this.nd[i].z - this.nd[j].z); D[i][j] = D[j][i] = d; }
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (D[i][k] + D[k][j] < D[i][j]) { D[i][j] = D[i][k] + D[k][j]; S0[i][j] = S0[i][k]; }
    this.suivant = S0;
    // les jeux qui gênent une ligne droite (on passe alors par les points de passage)
    this.gene = [[115.2, -18.7, 118.0, -14.3], [118.4, -16.3, 125.6, -14.8], [123.3, -21.1, 126.1, -18.3], [117.2, -38.4, 120.0, -35.6], [128.5, -19.3, 130.3, -17.5],
      [131.9, -22.1, 133.6, -15.5], [131.9, -32.5, 133.6, -30.3], [119.9, -30.9, 123.3, -27.9], [118.9, -22.2, 122.2, -19.8]];
    this.jeux = {};
  }

  /* ---------------------------------------------------------------- création (quand on approche) */
  preparer() {
    this.prepare = true;
    const E = this.E, sc = this.c.scene;
    this.objets = [];
    const ajouter = m => { sc.add(m); this.objets.push(m); m.visible = false; return m; };
    this.grands = []; // (ce qui se voit de loin : les vantaux, les battants, les classes ; le reste, de près)
    // le portail : deux vantaux de grille (barreaux à pointe de lance, deux traverses), sur leurs gonds
    const vantail = l => { const L = [B(l, 0.05, 0.04, '#2b3a33', l / 2, 0.15, 0), B(l, 0.05, 0.04, '#2b3a33', l / 2, 1.55, 0), B(0.06, 1.75, 0.05, '#2b3a33', 0.03, 0.95, 0), B(0.06, 1.75, 0.05, '#2b3a33', l - 0.03, 0.95, 0)];
      for (let x = 0.12; x < l - 0.06; x += 0.12) L.push(B(0.022, 1.68, 0.022, '#2b3a33', x, 0.95, 0), C(0, 0.025, 0.08, 4, '#2b3a33', x, 1.83, 0, 'y', Math.PI / 4));
      L.push(B(0.6, 0.3, 0.025, '#2b3a33', l / 2, 1.2, 0)); return fusion(L); };
    const P = E.portail, lp = (P.z0 - P.z1) / 2 - 0.02;
    this.vantaux = [[P.z0, Math.PI / 2], [P.z1, -Math.PI / 2]].map(([z, r]) => { const g = new THREE.Group(), m = new THREE.Mesh(vantail(lp), MAT); m.castShadow = true; g.add(m); g.position.set(P.x, 0.02, z); g.rotation.y = r; g.userData.r = r; this.grands.push(g); return ajouter(g); });
    // la porte de l'école : deux battants de bois peint, un panneau vitré en haut
    const battant = l => fusion([B(l, 2.74, 0.06, '#2f5d50', l / 2, 1.37, 0), B(l - 0.16, 0.8, 0.02, '#3a5068', l / 2, 2.05, 0.035), B(l - 0.2, 0.8, 0.02, '#284b40', l / 2, 0.75, 0.035), B(0.05, 0.16, 0.06, '#c9a55a', l - 0.1, 1.2, 0.05)]);
    const Po = E.porte;
    this.battants = [[Po.z - Po.l / 2, -Math.PI / 2], [Po.z + Po.l / 2, Math.PI / 2]].map(([z, r]) => { const g = new THREE.Group(), m = new THREE.Mesh(battant(Po.l / 2 - 0.01), MAT); g.add(m); g.position.set(Po.x - 0.02, Po.y, z); g.rotation.y = r; g.userData.r = r; this.grands.push(g); return ajouter(g); });
    // la cloche du campanile et l'horloge du fronton (deux aiguilles : une instance chacune)
    this.cloche = ajouter(new THREE.Group());
    this.cloche.add(new THREE.Mesh(fusion([C(0.08, 0.2, 0.3, 10, '#b08d3a', 0, -0.2, 0), C(0.21, 0.21, 0.04, 10, '#9a7a30', 0, -0.36, 0), B(0.05, 0.1, 0.05, '#2b2b30', 0, -0.02, 0), S(0.035, '#5a4a2a', 0, -0.4, 0)]), MAT));
    this.cloche.position.set(E.cloche.x, E.cloche.y, E.cloche.z);
    const gA = new THREE.BoxGeometry(0.035, 1, 0.025); gA.translate(0, 0.5, 0);
    this.aiguilles = ajouter(new THREE.InstancedMesh(gA, new THREE.MeshLambertMaterial({ color: '#1d1d1d' }), 2));
    // les balançoires : deux chaînes et le siège, sous la poutre du portique (le groupe tourne autour d'elle)
    this.balancoires = E.balancoires.map(b => {
      const g = new THREE.Group(), L = [];
      for (const dz of [-0.2, 0.2]) L.push(B(0.02, b.L, 0.02, '#8d9196', 0, -b.L / 2, dz));
      L.push(B(0.2, 0.04, 0.48, '#2b2b30', 0, -b.L - 0.02, 0), B(0.18, 0.02, 0.46, '#c0392b', 0, -b.L + 0.005, 0));
      const m = new THREE.Mesh(fusion(L), MAT); m.castShadow = true; g.add(m);
      g.position.set(b.x, b.y, b.z); g.userData = { th: 0, w: 0, b };
      return ajouter(g);
    });
    // les jeux à ressort : une coccinelle et un petit cheval, sur leur ressort (ils se balancent)
    this.ressorts = E.ressorts.map((r, i) => {
      const g = new THREE.Group(), L = [];
      if (i === 0) { L.push(S(0.3, '#c0392b', 0, 0.2, 0, 0.8, 0.55, 1.15, 1), S(0.17, '#1d1d1d', 0, 0.26, 0.33, 1, 0.9, 0.8, 1)); for (const [x, z] of [[0.13, 0.05], [-0.13, 0.05], [0.12, -0.2], [-0.12, -0.2]]) L.push(S(0.05, '#1d1d1d', x, 0.33, z, 1, 0.5, 1)); }
      else L.push(S(0.28, '#e0b13a', 0, 0.2, 0, 0.7, 0.6, 1.2, 1), C(0.07, 0.09, 0.32, 8, '#e0b13a', 0, 0.42, 0.3, 'y'), S(0.13, '#e0b13a', 0, 0.6, 0.38, 0.8, 0.9, 1.2, 1), S(0.05, '#5a3f2b', 0, 0.68, 0.3, 0.6, 1.5, 0.6));
      L.push(C(0.015, 0.015, 0.34, 6, '#2b2b30', 0, 0.48, 0.22, 'x'), S(0.03, '#2b2b30', 0.17, 0.48, 0.22), S(0.03, '#2b2b30', -0.17, 0.48, 0.22), B(0.5, 0.03, 0.08, '#2b2b30', 0, 0.02, 0.15));
      const m = new THREE.Mesh(fusion(L), MAT); m.castShadow = true; g.add(m);
      g.position.set(r.x, 0.5, r.z); g.rotation.order = 'YXZ'; g.rotation.y = r.h; g.userData = { a: 0, r };
      return ajouter(g);
    });
    // la corde à sauter : un arc dans son plan, qui tourne autour de l'axe des deux mains ; le ballon ; les billes
    const Cd = E.corde, lc = Cd.b.x - Cd.a.x - 0.7, nc = 18, Lc = [];
    for (let i = 0; i < nc; i++) {
      const s0 = i / nc, s1 = (i + 1) / nc, d = s => 0.12 + 0.72 * Math.sin(Math.PI * s), y0 = d(s0), y1 = d(s1), x0 = s0 * lc, x1 = s1 * lc, l = Math.hypot(x1 - x0, y1 - y0);
      const g = B(l + 0.01, 0.02, 0.02, '#e84393'); g.rotateZ(Math.atan2(y1 - y0, x1 - x0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, 0); Lc.push(g);
    }
    this.cordeM = ajouter(new THREE.Group()); this.cordeM.add(new THREE.Mesh(fusion(Lc), MAT));
    this.cordeM.position.set(Cd.a.x + 0.35, 0.74, Cd.a.z); this.cordeM.userData.lc = lc;
    this.ballon = ajouter(new THREE.Mesh(fusion([S(0.11, '#f4f1ea', 0, 0, 0, 1, 1, 1, 1), S(0.112, '#c0392b', 0, 0, 0, 1, 0.35, 1, 1)]), MAT));
    this.ballon.castShadow = true;
    this.billes = ajouter(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.022, 1), new THREE.MeshLambertMaterial({ color: '#ffffff' }), 6));
    const TB = ['#3fa9f5', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#ecf0f1'], cc = new THREE.Color();
    for (let i = 0; i < 6; i++) this.billes.setColorAt(i, cc.set(TB[i]));
    this.bil = Array.from({ length: 6 }, (_, i) => ({ x: i < 3 ? E.billes.x + (i - 1) * 0.05 : 1e4, z: E.billes.z + (i < 3 ? 0.03 * (i % 2) : 0), vx: 0, vz: 0 }));
    this.bil.forEach((b, i) => { m4.makeTranslation(b.x, 0.065, b.z); this.billes.setMatrixAt(i, m4); });
    // les classes, derrière les grandes fenêtres : peintes une fois (deux bandes : la classe en cours, la classe vide)
    this.classes = ajouter(this.peindreClasses()); this.grands.push(this.classes);
    // les enfants, les adultes, les parents : créés un par image, dans cet ordre
    const r = hasard(4242);
    ENFANTS.forEach((d, i) => this.file.push(() => this.creerEnfant(d, i, r)));
    for (const a of ADULTES) this.file.push(() => this.creerAdulte(a));
    const foyers = [...new Set(ENFANTS.map(d => d[4]))].sort((a, b) => a - b);
    for (const f of foyers) this.file.push(() => this.creerParent(f, hasard(900 + f)));
    this.jeux = this.creerJeux();
  }

  // Les classes vues par les fenêtres : le mur jaune pâle, le tableau noir et sa craie, la frise de l'alphabet, des dessins
  // et une carte au mur, les pupitres ; en classe, les élèves assis (leurs têtes, de dos) et la maîtresse au tableau. Sur
  // les vitres, des flocons de papier et des sapins découpés (décembre), des dessins. Une texture de 512 x 512 (la moitié
  // du haut : la classe en cours ; du bas : vide), un maillage (six fenêtres).
  peindreClasses() {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
    const c = cv.getContext('2d'), r = hasard(77);
    const K = this.E.classes, lw = K.ailes[0][0] - K.ailes[0][1], hh = K.y1 - K.y0, W = 512, H = 256;
    for (let v = 0; v < 2; v++) {
      const y0 = v * H, px = x => x / lw * W, py = y => y0 + (1 - (y - K.y0) / hh) * H; // de l'aile (m) au canevas
      c.fillStyle = '#efe3bd'; c.fillRect(0, y0, W, H);
      c.fillStyle = '#d9c99a'; c.fillRect(0, py(1.3), W, py(K.y0) - py(1.3)); // le soubassement peint
      // le tableau noir, la craie
      c.fillStyle = '#5a3f2b'; c.fillRect(px(2.4), py(3.25), px(4.1), py(2.0) - py(3.25)); c.fillStyle = '#26443a'; c.fillRect(px(2.47), py(3.2), px(3.96), py(2.06) - py(3.2));
      c.strokeStyle = 'rgba(240,240,232,0.85)'; c.lineWidth = 1.5; c.font = '13px Georgia, serif'; c.fillStyle = 'rgba(240,240,232,0.85)';
      c.fillText('Bonjour !', px(2.75), py(2.95)); c.fillText('12 + 7 = 19', px(4.4), py(2.6)); c.beginPath(); c.moveTo(px(2.7), py(2.4)); c.lineTo(px(4.0), py(2.4)); c.stroke();
      // la frise de l'alphabet, des dessins, une carte, une horloge
      for (let i = 0; i < 26; i++) { c.fillStyle = ['#e74c3c', '#3498db', '#f1c40f', '#27ae60'][i % 4]; c.fillRect(px(0.2 + i * 0.32), py(3.55), px(0.28) - 1, py(3.35) - py(3.55)); c.fillStyle = '#fff'; c.font = 'bold 9px Arial'; c.fillText(String.fromCharCode(65 + i), px(0.2 + i * 0.32) + 3, py(3.39)); }
      for (let i = 0; i < 6; i++) { const x = 0.3 + i * 0.32, y = 2.9 - (i % 2) * 0.3; c.fillStyle = '#fdfaf2'; c.fillRect(px(x), py(y + 0.22), px(0.26), py(y) - py(y + 0.22)); c.fillStyle = ['#e74c3c', '#27ae60', '#3498db', '#f39c12', '#9b59b6', '#e84393'][i]; c.beginPath(); c.arc(px(x + 0.13), py(y + 0.11), 4, 0, 7); c.fill(); }
      c.fillStyle = '#9cc9e3'; c.fillRect(px(6.7), py(3.1), px(1.4), py(2.2) - py(3.1)); c.fillStyle = '#8fbf6a'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(px(6.9 + r() * 1.0), py(2.4 + r() * 0.6), 4 + r() * 6, 0, 7); c.fill(); }
      c.fillStyle = '#fff'; c.beginPath(); c.arc(px(5.7), py(3.0), 9, 0, 7); c.fill(); c.strokeStyle = '#333'; c.lineWidth = 1; c.stroke();
      // les pupitres et les chaises, en rangs ; en classe, des têtes d'enfants (de dos) et la maîtresse
      for (let k = 0; k < 2; k++) for (let i = 0; i < 7; i++) {
        const x = 0.5 + i * 1.18 + k * 0.4, y = 1.45 - k * 0.12;
        if (v === 0 && (i + k) % 5 !== 3) {
          const tete = ['#2b1d12', '#e8cd8a', '#1a1410', '#7a4e2c', '#b5532e', '#3b2a1a'][(i * 3 + k) % 6], haut = ['#e74c3c', '#3498db', '#f1c40f', '#e84393', '#1abc9c', '#9b59b6'][(i + k * 2) % 6];
          c.fillStyle = haut; c.fillRect(px(x + 0.12), py(y + 0.42), px(0.36), py(y) - py(y + 0.42));
          c.fillStyle = tete; c.beginPath(); c.arc(px(x + 0.3), py(y + 0.55), 7.5, 0, 7); c.fill();
        }
        c.fillStyle = '#b07a46'; c.fillRect(px(x), py(y + 0.12), px(0.62), 4); c.fillStyle = '#7a5434'; c.fillRect(px(x + 0.04), py(y + 0.1), 3, py(y - 0.5) - py(y + 0.1)); c.fillRect(px(x + 0.55), py(y + 0.1), 3, py(y - 0.5) - py(y + 0.1));
      }
      if (v === 0) { c.fillStyle = '#7a2233'; c.fillRect(px(3.2), py(2.3), px(0.36), py(1.1) - py(2.3)); c.fillStyle = '#1a1410'; c.beginPath(); c.arc(px(3.38), py(2.42), 8, 0, 7); c.fill(); c.fillStyle = '#c68642'; c.beginPath(); c.arc(px(3.38), py(2.42), 6, 0, 7); c.fill(); }
      // la profondeur : les bords et le bas plus sombres
      const g = c.createLinearGradient(0, y0, 0, y0 + H); g.addColorStop(0, 'rgba(40,30,20,0.25)'); g.addColorStop(0.5, 'rgba(40,30,20,0)'); g.addColorStop(1, 'rgba(40,30,20,0.35)'); c.fillStyle = g; c.fillRect(0, y0, W, H);
      // sur les vitres (au premier plan, des deux bandes pareil) : des flocons et des sapins de papier, des dessins
      K.fenetres.slice(0, 3).forEach((zw, i) => {
        const xc = px(zw - K.ailes[0][1]) , d = W / lw * 0.75;
        for (let k = 0; k < 4; k++) { const fx = xc - d * 0.7 + r() * d * 1.4, fy = py(3.3 - r() * 0.6); c.strokeStyle = '#ffffff'; c.lineWidth = 2; for (let a = 0; a < 3; a++) { const t = a * Math.PI / 3; c.beginPath(); c.moveTo(fx - Math.cos(t) * 7, fy - Math.sin(t) * 7); c.lineTo(fx + Math.cos(t) * 7, fy + Math.sin(t) * 7); c.stroke(); } }
        const sx = xc - d * 0.45 + i * 5, sy = py(1.75);
        c.fillStyle = '#2e8b4a'; c.beginPath(); c.moveTo(sx, sy - 26); c.lineTo(sx + 13, sy); c.lineTo(sx - 13, sy); c.fill(); c.fillStyle = '#f1c40f'; c.beginPath(); c.arc(sx, sy - 27, 3, 0, 7); c.fill();
        c.fillStyle = '#fdfaf2'; c.fillRect(xc + d * 0.15, py(2.25), 26, 20); c.fillStyle = '#f39c12'; c.beginPath(); c.arc(xc + d * 0.15 + 8, py(2.25) + 7, 4, 0, 7); c.fill(); c.fillStyle = '#3498db'; c.fillRect(xc + d * 0.15 + 4, py(2.25) + 14, 18, 4);
      });
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(1, 0.5);
    // une fenêtre : la partie de la classe qu'elle montre (la même texture pour les deux ailes)
    const P = [];
    for (const zw of K.fenetres) {
      const aile = K.ailes.find(([a, b]) => zw < a && zw > b), u0 = (zw - K.w / 2 - aile[1]) / lw, u1 = (zw + K.w / 2 - aile[1]) / lw;
      const g = new THREE.PlaneGeometry(K.w, hh); g.rotateY(-Math.PI / 2); g.translate(K.x, (K.y0 + K.y1) / 2, zw);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0));
      P.push(g);
    }
    const m = new THREE.Mesh(fusion(P), new THREE.MeshBasicMaterial({ map: tex, fog: true }));
    m.userData.tex = tex;
    return m;
  }

  /* ---------------------------------------------------------------- les personnages */
  modele(o) { const m = perso(o); return m; }
  entite(m, genre) {
    const p = new Pieton(m);
    this.c.scene.add(m.groupe); m.groupe.visible = false;
    const e = { p, m, genre, phase: 'maison', route: [], ri: 0, s: 0, lat: 0, latV: 0, act: null, pret: false, rang: 0, dtA: 0, vu: false, ch: null, attente: 0, but: { x: 0, z: 0 }, leader: null, tenu: false, tob: 'file', R: new THREE.Vector3(),
      J: { g: null, u: 0, p: 0, cx: 0.3, k: 0, v: null, h: 0.13, air: 0.55, deux: false, pied: 1, corde: false, bras: false, parle: 0, dphi: 0, dy: 0, baisse: 0, mg: null, md: null, MG: [0, 0, 0], MD: [0, 0, 0], wg: 1, wd: 1 } };
    e.J.dphi = Math.random() * 6;
    this.gens.push(e);
    return e;
  }
  creerEnfant([age, fille, teint, coiffure, foyer], i, r) {
    const pk = a => a[Math.floor(r() * a.length)], fonce = teint >= 6, femme = !!fille;
    const doud = DOUDOUNES[(i * 5 + 3) % DOUDOUNES.length], laine = pk(LAINES), sorte = r();
    const o = {
      age, femme, peau: PEAUX[teint], cheveux: fonce ? pk(CHEV_FONCES) : CHEV_CLAIRS[(i * 3 + teint) % CHEV_CLAIRS.length], coiffure, barbe: false, malRase: false,
      tenue: sorte < 0.62 ? 'veste' : sorte < 0.82 ? 'gilet' : 'pull', haut: doud, matelasse: true, col: doud, manches: pk(LAINES), capuche: sorte < 0.62 && r() < 0.6,
      bas: femme && r() < 0.35 ? pk(['#e84393', '#5b3a55', '#2c3e50', '#8e44ad']) : pk(BAS_E), tissuBas: r() < 0.6 ? 'jean' : 'velours', collant: pk(['#e84393', '#2c3e50', '#8e44ad']),
      chaussures: pk(['#e74c3c', '#2c3e50', '#f4f1ea', '#3498db', '#2b2b30', '#e84393']), bottes: r() < 0.25, iris: fonce ? '#2a1a10' : pk(['#3b2a1e', '#3d5a7a', '#4c6b3f', '#5a7a9a']),
      chapeau: coiffure === 'afro' || coiffure === 'couettes' || coiffure === 'tresses' ? 'aucun' : r() < 0.55 ? 'tuque' : 'aucun', chapeauC: laine, pompon: pk(LAINES),
      echarpe: r() < 0.5 ? pk(LAINES) : null, cartable: CARTABLES[(i * 7) % CARTABLES.length], elastique: pk(['#e84393', '#f1c40f', '#3498db', '#ffffff', '#e74c3c']),
      corpulence: 0.95 + r() * 0.12, epaules: 0.92, hanches: 1, carreaux: false, imprime: false, lunettes: age >= 8 && r() < 0.18,
      hauteur: 0.95 + (age - 3) * 0.0625 + (r() - 0.5) * 0.06,
    };
    if (femme && o.tenue === 'pull' && r() < 0.5) o.tenue = 'robe';
    const e = this.entite(this.modele(o), 'enfant');
    const F = FOYERS[foyer] || [0, 0, 0];
    e.def = { age, femme, teint, coiffure, foyer, i, garderieMatin: F[0], garderieSoir: F[1], loisirs: !!F[2], hauteur: o.hauteur, peau: o.peau };
    e.ch = this.chemins[foyer];
    // l'heure d'arrivée au portail, de départ (minutes du jour), la vitesse (m/s) ; les frères et sœurs ensemble
    const rf = hasard(31 + foyer * 7), aMin = 492 + Math.floor(rf() * 15), dMin = 991 + Math.floor(rf() * 7);
    e.arr = F[0] || aMin; e.dep = F[1] || dMin; e.arrL = 482 + Math.floor(rf() * 45); e.depL = 1022 + Math.floor(rf() * 50);
    e.vit = 1.05 + rf() * 0.12; e.course = 2.4 + age * 0.17 + r() * 0.3; e.marche = 0.95 + age * 0.035;
    e.gouts = PREFS[age <= 5 ? 0 : age <= 8 ? 1 : 2]; e.prefs = e.gouts;
    m_cartable(e, false);
    this.enfants.push(e);
    // les frères et sœurs suivent le plus grand (ou leur parent : creerParent)
    const aine = this.enfants.find(k => k !== e && k.def.foyer === foyer);
    if (aine) e.frere = aine;
  }
  creerAdulte(a) {
    const e = this.entite(this.modele({ ...a.o, taille: a.o.femme ? 0.95 : 1.02, corpulence: 1, chapeau: a.o.chapeau || null }), 'adulte');
    e.nom = a.nom; e.def = { nom: a.nom }; e.vitM = 1.15;
    this.adultes.push(e);
  }
  // Un parent par foyer qui accompagne : le matin, il amène les enfants jusqu'au portail et repart ; le soir, il vient les
  // chercher (toujours à la garderie). Les plus grands (8 ans et plus, sans garderie) vont seuls à l'école.
  creerParent(f, r) {
    const kids = this.enfants.filter(k => k.def.foyer === f), petit = Math.min(...kids.map(k => k.def.age)), F = FOYERS[f] || [0, 0, 0];
    const accompagne = petit <= 7 || F[0] || F[1] || F[2];
    if (!accompagne) return;
    const pk = a => a[Math.floor(r() * a.length)], teint = borne(kids[0].def.teint + Math.floor(r() * 3) - 1, 0, 10), femme = r() < 0.6;
    const e = this.entite(this.modele({
      femme, peau: PEAUX[teint], cheveux: teint >= 6 ? pk(CHEV_FONCES) : pk(CHEV_CLAIRS), coiffure: femme ? pk(['carre', 'long', 'queue', 'chignon']) : pk(['court', 'court', 'chauve']),
      barbe: !femme && r() < 0.35, tenue: pk(['veste', 'veste', 'pull', 'gilet']), haut: pk(['#2c3e50', '#7a2233', '#3b5b8c', '#5a6b2f', '#8a7f6a', '#1e272e', '#c0392b', '#d9a03a']),
      bas: pk(['#2c3e50', '#1e272e', '#5d4037', '#3b4150']), lunettes: r() < 0.25, echarpe: r() < 0.5 ? pk(LAINES) : null, chapeau: r() < 0.2 ? 'bonnet' : null, chapeauC: pk(LAINES), matelasse: r() < 0.6,
    }), 'parent');
    e.def = { foyer: f }; e.ch = this.chemins[f]; e.enfants = kids; e.vit = kids[0].vit;
    for (const k of kids) k.parent = e;
    e.telephone = r() < 0.5; // en attendant devant le portail, un coup d'œil à son téléphone
    this.parents.push(e);
  }

  /* ---------------------------------------------------------------- se déplacer */
  // le plus proche point de passage
  noeud(x, z) { let k = 0, d = 1e9; for (let i = 0; i < this.nd.length; i++) { const e = Math.hypot(this.nd[i].x - x, this.nd[i].z - z); if (e < d) { d = e; k = i; } } return k; }
  // une ligne droite de a à b traverse-t-elle un jeu ?
  bloque(ax, az, bx, bz) {
    for (const [x0, z0, x1, z1] of this.gene) {
      let t0 = 0, t1 = 1;
      const dx = bx - ax, dz = bz - az, p = [-dx, dx, -dz, dz], q = [ax - x0, x1 - ax, az - z0, z1 - az];
      let dedans = true;
      for (let k = 0; k < 4; k++) {
        if (p[k] === 0) { if (q[k] < 0) { dedans = false; break; } continue; }
        const t = q[k] / p[k];
        if (p[k] < 0) { if (t > t1) { dedans = false; break; } if (t > t0) t0 = t; } else { if (t < t0) { dedans = false; break; } if (t < t1) t1 = t; }
      }
      if (dedans && t1 - t0 > 0.02) return true;
    }
    return false;
  }
  // Aller à (x, z) dans la cour : tout droit si rien ne gêne, sinon par les points de passage. (Calculé une fois par but :
  // la route est un tableau réutilisé.)
  allerA(e, x, z) {
    const R = e.route, p = e.p.pos, N = this.nd;
    R.length = 0; e.ri = 0; e.but.x = x; e.but.z = z;
    if (this.bloque(p.x, p.z, x, z)) {
      // un détour par un seul point de passage, le plus court ; sinon, d'un point qu'on voit à un point d'où l'on voit le
      // but, par le plus court chemin entre les points de passage
      let best = -1, db = 1e9;
      for (let k = 0; k < N.length; k++) {
        const d = Math.hypot(N[k].x - p.x, N[k].z - p.z) + Math.hypot(N[k].x - x, N[k].z - z);
        if (d < db && !this.bloque(p.x, p.z, N[k].x, N[k].z) && !this.bloque(N[k].x, N[k].z, x, z)) { db = d; best = k; }
      }
      if (best >= 0) R.push(N[best]);
      else {
        let i = -1, j = -1, di = 1e9, dj = 1e9;
        for (let k = 0; k < N.length; k++) {
          const a = Math.hypot(N[k].x - p.x, N[k].z - p.z), b = Math.hypot(N[k].x - x, N[k].z - z);
          if (a < di && !this.bloque(p.x, p.z, N[k].x, N[k].z)) { di = a; i = k; }
          if (b < dj && !this.bloque(N[k].x, N[k].z, x, z)) { dj = b; j = k; }
        }
        if (i < 0) i = this.noeud(p.x, p.z);
        if (j < 0) j = this.noeud(x, z);
        R.push(N[i]);
        for (let k = 0; i !== j && k < 12; k++) { i = this.suivant[i][j]; R.push(N[i]); }
      }
    }
    R.push(e.but);
  }
  // suit sa route ; rend vrai une fois arrivé
  avancer(e, dt, t, vit) {
    const R = e.route, p = e.p;
    if (e.ri >= R.length) { p.update(dt, 0, 0, 0, false, LIBRE, t); return true; }
    const q = R[e.ri], dx = q.x - p.pos.x, dz = q.z - p.pos.z, d = Math.hypot(dx, dz), fin = e.ri === R.length - 1;
    if (d < (fin ? 0.12 : 0.6)) { e.ri++; if (fin) { p.update(dt, 0, 0, 0, false, LIBRE, t); return true; } return false; }
    p.update(dt, dx / d, dz / d, 1, false, LIBRE, t, fin ? Math.min(vit, 0.4 + d * 1.6) : vit);
    return false;
  }
  // un point d'un chemin de la maison au portail, à s mètres de la porte, décalé de lat mètres sur la droite de qui va
  // dans le sens « sens » ; le cap de qui avance
  surChemin(ch, s, lat, sens, P) {
    s = borne(s, 0, ch.L);
    let i = 1;
    while (i < ch.pts.length - 1 && ch.l[i] < s) i++;
    const a = ch.pts[i - 1], b = ch.pts[i], l = ch.l[i] - ch.l[i - 1] || 1, u = (s - ch.l[i - 1]) / l;
    const fx = (b.x - a.x) / l * sens, fz = (b.z - a.z) / l * sens;
    P.x = a.x + (b.x - a.x) * u - fz * lat; P.z = a.z + (b.z - a.z) * u + fx * lat; P.h = Math.atan2(fx, fz);
    return P;
  }

  /* ---------------------------------------------------------------- la journée de chacun */
  // Où un enfant doit être à la minute m : 'maison', 'aller' (s : mètres faits depuis chez lui), 'cour', 'classe',
  // 'retour' (s : mètres faits depuis le portail). Écrit dans e.voulu et e.sv.
  voulu(e, m) {
    const sorte = sorteDe(m), hm = heureDe(m), d = e.def;
    e.voulu = 'maison'; e.sv = 0;
    if (sorte === 'ferme' || (sorte === 'loisirs' && !d.loisirs)) return;
    const arr = sorte === 'loisirs' ? e.arrL : e.arr, dep = sorte === 'loisirs' ? e.depL : e.dep, tA = e.ch.L / (2 * e.vit);
    if (hm < arr - tA) return;
    if (hm < arr) { e.voulu = 'aller'; e.sv = (hm - (arr - tA)) * 2 * e.vit; return; }
    if (hm < dep) { e.voulu = dansCour(sorte, hm) ? 'cour' : 'classe'; return; }
    if (hm < dep + tA) { e.voulu = 'retour'; e.sv = (hm - dep) * 2 * e.vit; }
  }
  // Un parent : le matin, il amène (aller avec eux), attend un instant devant le portail, repart ; le soir, il arrive un
  // peu avant (aller), attend devant le portail, repart avec eux (retour).
  voulParent(e, m) {
    const sorte = sorteDe(m), hm = heureDe(m), k = e.enfants[0], F = FOYERS[e.def.foyer] || [0, 0, 0];
    e.voulu = 'maison'; e.sv = 0;
    if (sorte === 'ferme' || (sorte === 'loisirs' && !F[2])) return;
    const arr = sorte === 'loisirs' ? k.arrL : k.arr, dep = sorte === 'loisirs' ? k.depL : k.dep, tA = e.ch.L / (2 * e.vit);
    const matin = k.def.age <= 7 || F[0] || sorte === 'loisirs', soir = k.def.age <= 7 || F[1] || sorte === 'loisirs';
    if (matin) {
      if (hm >= arr - tA && hm < arr) { e.voulu = 'aller'; e.sv = (hm - (arr - tA)) * 2 * e.vit; return; }
      if (hm >= arr && hm < arr + 1.5) { e.voulu = 'attente'; return; }
      if (hm >= arr + 1.5 && hm < arr + 1.5 + tA) { e.voulu = 'retour'; e.sv = (hm - arr - 1.5) * 2 * e.vit; return; }
    }
    if (soir) {
      const av = 3 + (e.def.foyer % 4);
      if (hm >= dep - av - tA && hm < dep - av) { e.voulu = 'aller'; e.sv = (hm - (dep - av - tA)) * 2 * e.vit; return; }
      if (hm >= dep - av && hm < dep) { e.voulu = 'attente'; return; }
      if (hm >= dep && hm < dep + tA) { e.voulu = 'retour'; e.sv = (hm - dep) * 2 * e.vit; }
    }
  }
  // Les adultes de l'école : présents quand la cour est ouverte (ou le portail occupé) ; l'animatrice à la garderie et le
  // mercredi ; la maîtresse et le maître les jours d'école, de 8 h 10 à 17 h
  voulAdulte(e, m) {
    const sorte = sorteDe(m), hm = heureDe(m);
    e.voulu = 'classe'; // (dans l'école : en classe, à la cantine)
    if (sorte === 'ferme') { e.voulu = 'maison'; return; }
    const ouvert = dansCour(sorte, hm);
    if (e.nom === 'animatrice') { if (sorte === 'loisirs' ? ouvert : ouvert && (hm < 510 || hm >= 715 && hm < 805 || hm >= 990)) e.voulu = 'cour'; if (hm >= 1115 || hm < 445) e.voulu = 'maison'; return; }
    if (sorte === 'loisirs') { if (e.nom === 'maitre' && ouvert) e.voulu = 'cour'; else e.voulu = 'maison'; return; }
    if (hm < 490 || hm >= 1020) { e.voulu = 'maison'; return; }
    if (ouvert || (hm >= 490 && hm < 510)) e.voulu = 'cour';
  }

  /* ---------------------------------------------------------------- les jeux */
  creerJeux() {
    const E = this.E, J = {};
    const jeu = (nom, max, min, o = {}) => (J[nom] = { nom, max, min, membres: [], ...o });
    jeu('balancoire', 2, 1); jeu('toboggan', 3, 1, { occupe: null }); jeu('ressort', 2, 1); jeu('sable', 2, 1);
    jeu('corde', 5, 3, { phi: 0, saut: 0, tJ: 0 }); jeu('marelle', 3, 1, { case: 0, t: 0, joueur: 0 }); jeu('ronde', 6, 3, { psi: 0, sens: 1, t: 0 });
    jeu('ballon', 5, 3, { b: { x: 0, y: 0.11, z: 0, vx: 0, vy: 0, vz: 0 }, porteur: -1, vers: -1, tP: 0, passes: 0, fete: 0, tireur: -1 });
    jeu('billes', 3, 2, { tour: 0, t: 0 }); jeu('banc', 4, 1, { t: 0 }); jeu('chat', 5, 3, { chat: 0, tC: 0 }); jeu('balade', 99, 1);
    jeu('attente', 99, 1); jeu('rang', 99, 1);
    return J;
  }
  // Répartit ceux qui sont dans la cour entre les jeux (quand la cour change : une récréation qui commence, un enfant
  // qu'on vient chercher) : chacun son premier choix tant qu'il y a de la place ; un jeu qui n'a pas assez de joueurs
  // renvoie les siens à leur choix suivant ; ce qui reste se promène.
  repartir(dansLaCour, sorte, hm) {
    const J = this.jeux;
    for (const k in J) J[k].membres.length = 0;
    const attente = sorte === 'ecole' && hm >= 490 && hm < 510; // avant la classe, on attend la cloche sous le préau
    // chacun ses goûts : la liste de son âge, commencée ailleurs selon l'enfant et selon la récréation (on ne joue pas
    // toujours au même jeu)
    const tour = jourDe(this.minutes || 0) * 5 + Math.floor(hm / 90);
    for (const e of dansLaCour) { const L = e.gouts, k = (e.def.i * 5 + tour) % L.length; e.prefs = [...L.slice(k), ...L.slice(0, k), 'balade']; }
    const choix = new Map();
    for (const e of dansLaCour) {
      if (attente && !e.def.garderieMatin) { J.attente.membres.push(e); choix.set(e, -1); continue; }
      choix.set(e, 0);
    }
    for (let passe = 0; passe < 8; passe++) {
      let change = false;
      for (const e of dansLaCour) {
        let c = choix.get(e);
        if (c < 0) continue;
        while (c < e.prefs.length && J[e.prefs[c]].membres.length >= J[e.prefs[c]].max) c++;
        const nom = e.prefs[Math.min(c, e.prefs.length - 1)];
        if (!J[nom].membres.includes(e)) J[nom].membres.push(e);
        choix.set(e, c);
      }
      for (const k in J) {
        const j = J[k];
        if (k === 'balade' || k === 'attente' || !j.membres.length || j.membres.length >= j.min) continue;
        for (const e of j.membres) choix.set(e, choix.get(e) + 1);
        j.membres.length = 0; change = true;
      }
      if (!change) break;
      for (const k in J) if (k !== 'attente') J[k].membres.length = 0;
    }
    // chacun prend sa place dans son jeu (et y va)
    for (const k in J) J[k].membres.forEach((e, i) => { if (e.act !== J[k] || e.rang !== i) { e.act = J[k]; e.rang = i; e.pret = false; e.versJeu = true; e.tob = 'file'; e.perche = null; } });
  }
  // la place d'un joueur dans son jeu (où il va avant de jouer)
  place(e, P) {
    const E = this.E, j = e.act, i = e.rang;
    switch (j.nom) {
      case 'balancoire': { const b = E.balancoires[i]; P.x = b.x + 0.9; P.z = b.z; break; }
      case 'toboggan': P.x = E.toboggan.pied.x - 0.3 - i * 0.55; P.z = E.toboggan.pied.z + 0.9; break;
      case 'ressort': { const r = E.ressorts[i]; P.x = r.x + 0.55; P.z = r.z + 0.4; break; }
      case 'sable': P.x = E.sable.x - 0.45 + i * 0.9; P.z = E.sable.z + 0.35 - i * 0.7; break;
      case 'corde': { const C = E.corde; if (i === 0) { P.x = C.a.x; P.z = C.a.z; } else if (i === 1) { P.x = C.b.x; P.z = C.b.z; } else { P.x = (C.a.x + C.b.x) / 2 + (i - 2) * 0.55 - 0.2; P.z = C.a.z + 1.6; } break; }
      case 'marelle': P.x = E.marelle.x - 0.35 + i * 0.55; P.z = E.marelle.z0 + 0.7; break;
      case 'ronde': { const a = i / Math.max(1, j.membres.length) * Math.PI * 2; P.x = E.ronde.x + Math.cos(a) * E.ronde.r; P.z = E.ronde.z + Math.sin(a) * E.ronde.r; break; }
      case 'ballon': { const T = E.terrain; if (i === 0) { P.x = E.but.x; P.z = E.but.z + 0.6; } else { P.x = mix(T.x0 + 1, T.x1 - 1, ((i * 0.37) % 1)); P.z = mix(T.z0 + 3, T.z1 - 1, ((i * 0.61) % 1)); } break; }
      case 'billes': { const a = i / 3 * Math.PI * 2 + 0.4; P.x = E.billes.x + Math.cos(a) * 0.55; P.z = E.billes.z + Math.sin(a) * 0.55; break; }
      case 'banc': { const a = i * 0.9 + 0.3; P.x = E.rond.x + Math.cos(a) * (E.rond.r + 0.55); P.z = E.rond.z + Math.sin(a) * (E.rond.r + 0.55); break; }
      case 'chat': { const Z = E.chat; P.x = mix(Z.x0, Z.x1, ((i * 0.43 + 0.2) % 1)); P.z = mix(Z.z0, Z.z1, ((i * 0.71 + 0.1) % 1)); break; }
      case 'attente': { P.x = 123.6 + (i % 7) * 1.25 + (Math.floor(i / 7) % 2) * 0.6; P.z = -11.6 - Math.floor(i / 7) * 0.9; break; }
      case 'rang': { P.x = E.porte.dehors.x - 0.5 - Math.floor(i / 2) * 0.55; P.z = E.porte.z + (i % 2 ? 0.35 : -0.35); break; }
      default: { // balade : deux par deux, d'un bout de la cour à l'autre
        const pts = [[119.0, -33.2], [124.0, -33.8], [127.5, -24.4], [121.5, -26.5], [130.0, -26.2], [118.0, -31.0]], q = pts[(i + Math.floor((e.tB || 0))) % pts.length];
        P.x = q[0] + (i % 2) * 0.5; P.z = q[1] + (i % 2) * 0.3;
      }
    }
    return P;
  }
  // Posé d'un coup dans la cour (arrivé après coup, ou hors de la vue) : à sa place s'il a déjà un jeu, sinon sous le
  // préau ; il ira à son jeu (posé d'un coup lui aussi, tant qu'on ne le voit pas)
  poserDansCour(e) {
    this.debout(e); e.p.jeu = null;
    if (e.act) { const P = this.place(e, P1); e.p.placer(P.x, P.z, e.p.h); }
    else e.p.placer(124 + (e.def.i % 8) * 1.1, -11.6 - (e.def.i % 2) * 0.8, 0);
    e.pret = false; e.versJeu = true; e.route.length = 0; e.ri = 0;
    e.phase = 'cour';
  }
  // se relever d'un siège (balançoire, toboggan, jeu à ressort, banc) ou descendre d'un perchoir : droit, au sol
  debout(e) {
    const g = e.m.groupe;
    if (e.p.assis || g.rotation.x !== 0 || g.rotation.z !== 0) { e.p.assis = false; g.rotation.set(0, e.p.hv, 0); }
    if (g.position.y !== e.p.pos.y && e.genre === 'enfant' && e.tob !== 'monte') g.position.y = e.p.pos.y;
  }

  /* ---------------------------------------------------------------- à chaque image
     c : { t, minutes, ego, aPied, danger (le véhicule du joueur : x, z, v, h, ou null), autos (les voitures qui roulent) } */
  maj(dt, c) {
    const cam = this.c.camera.position, E = this.E;
    const dc = Math.hypot(cam.x - this.centre.x, cam.z - this.centre.z);
    // (coupe : l'école sans personne, pour mesurer ce qu'elle coûte : banc d'essai)
    if (this.coupe) { if (!this.cache) { this.cache = true; this.vus = false; this.proche = undefined; this.vuLoin = undefined; for (const e of this.gens) e.m.groupe.visible = false; for (const o of this.objets || []) o.visible = false; for (const o of this.obstacles) { o.x = 1e6; o.z = 1e6; } } return; }
    this.cache = false;
    if (!this.prepare) { if (dc < 200) this.preparer(); else return; }
    // loin de l'école (au domaine, au château) : rien ne se calcule, personne n'est dessiné ; on reposera chacun d'après
    // l'heure en revenant (hors de la vue)
    if (dc > 215) { if (!this.loin) { this.loin = true; this.vus = false; this.proche = undefined; this.vuLoin = undefined; for (const e of this.gens) e.m.groupe.visible = false; for (const o of this.objets) o.visible = false; for (const o of this.obstacles) { o.x = 1e6; o.z = 1e6; } } return; }
    this.loin = false;
    for (let k = 0; k < 1 && this.file.length; k++) this.file.shift()();
    const pres = dc < 215;
    if (pres !== this.vus) this.vus = pres;
    // (le portail, la porte, la cloche, les jeux qui bougent, les classes : de petites choses, dessinées à moins de 120 m)
    // (les petites choses qui bougent, à moins de 70 m ; le portail, la porte et les classes, à moins de 120 m)
    const proche = dc < 70, vuLoin = dc < 120;
    if (vuLoin !== this.vuLoin) { this.vuLoin = vuLoin; for (const o of this.grands) o.visible = vuLoin; }
    if (proche !== this.proche) { this.proche = proche; for (const o of this.objets) if (!this.grands.includes(o)) o.visible = proche; if (proche) { this.cordeM.visible = false; this.ballon.visible = false; } }
    const m = c.minutes, sorte = sorteDe(m), hm = heureDe(m);
    this.sorte = sorte; this.hm = hm; this.minutes = m;
    // ce qui est loin ne se calcule pas (les états se déduisent de l'heure : on les reposera en revenant) ; mais les gens
    // dans la rue, avec les voitures, se calculent toujours
    this.n++;
    // la journée de chacun
    for (const e of this.enfants) this.voulu(e, m);
    for (const e of this.parents) this.voulParent(e, m);
    for (const e of this.adultes) this.voulAdulte(e, m);
    // qui est dans la cour (ou y va) : quand ça change, on répartit les jeux
    let cle = 0; // (un bit par enfant : rien d'alloué)
    for (const e of this.enfants) if (e.voulu === 'cour' && (e.phase === 'cour' || e.phase === 'sortirPorte')) cle |= 1 << e.def.i;
    // (et toutes les heures et demie : on change de jeu pendant la longue pause de midi)
    const tour = jourDe(m) * 5 + Math.floor(hm / 90);
    if (cle !== this.cle || tour !== this.tourR) { this.cle = cle; this.tourR = tour; const L = this.enfants.filter(e => e.voulu === 'cour' && (e.phase === 'cour' || e.phase === 'sortirPorte')); this.repartir(L, sorte, hm); }
    // l'horloge, la cloche, la porte, le portail, les classes
    if (pres) this.decor(dt, c, sorte, hm);
    // chacun : sa phase, son déplacement, sa pose
    this.tPorte = (this.tPorte || 0) - dt;
    this.attendPortail = 0; this.versPorteN = 0; this.appel = 0;
    for (const e of this.parents) { e.tenu = false; if (e.phase === 'attente') this.appel++; }
    for (const e of this.enfants) if (e.phase === 'aller' && e.ch.L - e.s < 8) this.appel++;
    for (const e of this.gens) this.vivre(e, dt, c);
    // les jeux de la cour : à chaque image de près ; une image sur trois de loin, une sur six quand on ne voit pas la cour
    this.dtJ = (this.dtJ || 0) + dt;
    if (pres) {
      const dy = Math.hypot(cam.x - 124, cam.z - -24), loin = dy > 60 ? (this.vu(124, -24) || this.vu(118, -17) || this.vu(128, -33) ? 3 : 6) : 1;
      if (this.n % loin === 0) { this.jouer(this.dtJ, c); this.dtJ = 0; }
      this.sons(dt, c);
    }
    // les obstacles des voitures : ceux qui sont dans la rue
    let k = 0;
    for (const e of this.gens) {
      if (k >= this.obstacles.length) break;
      if (!e.m.groupe.visible || e.phase === 'cour' || e.phase === 'dedans' || e.phase === 'maison' || e.phase === 'versPorte' || e.phase === 'sortirPorte') continue;
      const o = this.obstacles[k++]; o.x = e.p.pos.x; o.z = e.p.pos.z;
    }
    for (; k < this.obstacles.length; k++) { const o = this.obstacles[k]; if (o.x === 1e6) break; o.x = 1e6; o.z = 1e6; }
  }

  // vu : (x, z) est devant la caméra, à moins de 80 m
  vu(x, z) {
    const cam = this.c.camera, dx = x - cam.position.x, dz = z - cam.position.z, d = Math.hypot(dx, dz);
    if (d > 80) return false;
    if (d < 8) return true;
    cam.getWorldDirection(v1);
    return (dx * v1.x + dz * v1.z) / d > 0.3;
  }
  montrer(e, oui) { if (e.m.groupe.visible !== oui) e.m.groupe.visible = oui; }

  // La vie d'une personne : passer d'une phase à l'autre d'après ce qu'elle doit faire, se déplacer, se poser.
  vivre(e, dt, c) {
    const p = e.p, cam = this.c.camera.position, E = this.E;
    const d2 = (p.pos.x - cam.x) ** 2 + (p.pos.z - cam.z) ** 2, vu = this.vu(p.pos.x, p.pos.z);
    e.vu = vu;
    const V = e.voulu;
    // --- les transitions
    if (V === 'maison') {
      if (e.phase === 'aller' || e.phase === 'retour') { if (!vu) { e.phase = 'maison'; } }
      else if (e.phase !== 'maison') { if (!vu || e.phase === 'dedans') e.phase = 'maison'; else if (e.phase === 'cour') { if (e.genre === 'adulte') this.versPorte(e); else if (e.genre === 'enfant') this.versSortie(e); } }
    } else if (V === 'aller') {
      if (e.phase === 'maison' || e.phase === 'dedans') {
        const P = this.surChemin(e.ch, e.sv, 0, 1, P1);
        if (!this.vu(P.x, P.z) || e.sv < 2.5) { e.phase = 'aller'; e.s = e.sv; e.lat = 0; this.poserChemin(e); }
      } else if (e.phase === 'aller' && !vu && Math.abs(e.s - e.sv) > 3) { e.s = e.sv; this.poserChemin(e); }
      else if (e.phase === 'retour' && !vu) { e.phase = 'aller'; e.s = e.sv; this.poserChemin(e); }
    } else if (V === 'attente') {
      if (e.phase !== 'attente' && e.phase !== 'aller') { if (!vu) { e.phase = 'attente'; this.poserAttente(e); } }
      else if (e.phase === 'aller' && e.s >= e.ch.L - 0.05) { e.phase = 'attente'; this.allerAttente(e); }
    } else if (V === 'cour') {
      if (e.genre === 'adulte') {
        if (e.phase !== 'cour') { if (!vu) { e.phase = 'cour'; this.placerAdulte(e, true); } else if (e.phase !== 'sortirPorte') this.sortirPorte(e); }
      } else if (e.phase === 'maison' || e.phase === 'retour' || e.phase === 'attente') { if (!vu) this.poserDansCour(e); }
      else if (e.phase === 'dedans') { if (!vu) this.poserDansCour(e); else this.sortirPorte(e); }
      else if (e.phase === 'versPorte' || e.phase === 'rang') { e.phase = 'cour'; e.pret = false; e.versJeu = true; }
      else if (e.phase === 'aller' && e.s >= e.ch.L - 0.05 && !e.leader) this.entrer(e);
      else if (e.phase === 'aller' && !vu && e.s < e.ch.L - 0.05) { this.poserDansCour(e); }
    } else if (V === 'classe') {
      if (e.genre === 'adulte' && e.phase !== 'dedans') { if (!vu || e.phase === 'maison') e.phase = 'dedans'; else if (e.phase !== 'versPorte') this.versPorte(e); }
      else if (e.phase === 'cour' || e.phase === 'sortirPorte' || e.phase === 'entrer') { if (!vu) e.phase = 'dedans'; else if (e.phase !== 'entrer') this.versPorte(e); }
      else if (e.phase === 'maison' || e.phase === 'retour' || (e.phase === 'aller' && !vu)) e.phase = 'dedans';
      else if (e.phase === 'aller' && e.s >= e.ch.L - 0.05 && !e.leader) this.entrer(e);
    } else if (V === 'retour') {
      if (e.genre === 'parent') {
        if (e.phase === 'attente') { if (this.enfantsSortis(e) || !vu) { e.phase = 'retour'; e.s = 0; e.lat = 0; p.telephone = false; } }
        else if (e.phase !== 'retour') { if (!vu) { e.phase = 'retour'; e.s = e.sv; this.poserChemin(e); } }
        else if (!vu && Math.abs(e.s - e.sv) > 3) { e.s = e.sv; this.poserChemin(e); }
      } else if (e.phase === 'cour' || e.phase === 'dedans' || e.phase === 'sortirPorte' || e.phase === 'versPorte') {
        if (!vu) { e.phase = 'retour'; e.s = e.sv; this.poserChemin(e); } else if (e.phase === 'dedans') this.sortirPorte(e); else if (e.phase !== 'sortirPorte') this.versSortie(e);
      } else if (e.phase === 'maison' || e.phase === 'aller') { if (!vu) { e.phase = 'retour'; e.s = e.sv; this.poserChemin(e); } }
      else if (e.phase === 'retour' && !vu && Math.abs(e.s - e.sv) > 3 && !e.leader) { e.s = e.sv; this.poserChemin(e); }
    }
    // --- visible ?
    const montre = e.phase !== 'maison' && e.phase !== 'dedans' && this.vus && d2 < 14400; // (au-delà de 120 m, un enfant fait moins de dix pixels : ni dessiné, ni animé)
    this.montrer(e, montre);
    m_cartable(e, e.genre === 'enfant' && (e.phase === 'aller' || e.phase === 'retour' || e.phase === 'entrer' || e.phase === 'portail' || (e.phase === 'cour' && e.act && (e.act.nom === 'attente' || e.act.nom === 'rang')) || e.phase === 'versSortie'));
    if (!montre && e.phase !== 'aller' && e.phase !== 'retour') return;
    // --- de près, à chaque image ; plus loin, une image sur trois ; au-delà de 120 m, rien (on reposera d'après l'heure)
    e.dtA += dt;
    if (d2 > 14400) { if (e.phase === 'aller' || e.phase === 'retour') { e.s = e.sv; } return; }
    if (d2 > 3600 && (this.n + (e.def.i || 0)) % 3) return;
    const dtg = e.dtA; e.dtA = 0;
    this.bouger(e, dtg, c);
  }
  poserChemin(e) { this.debout(e); const P = this.surChemin(e.ch, e.phase === 'retour' ? e.ch.L - e.s : e.s, e.lat, e.phase === 'retour' ? -1 : 1, P2); e.p.placer(P.x, P.z, P.h); e.p.jeu = null; }
  poserAttente(e) { const D = this.E.portail.dehors, k = this.parents.indexOf(e); e.p.placer(D.x - 1.1 - (k % 3) * 0.7, D.z + ((k % 5) - 2) * 0.9, Math.PI / 2); e.p.jeu = null; }
  allerAttente(e) { const D = this.E.portail.dehors, k = this.parents.indexOf(e); e.route.length = 0; e.ri = 0; e.but.x = D.x - 1.1 - (k % 3) * 0.7; e.but.z = D.z + ((k % 5) - 2) * 0.9; e.route.push(e.but); }
  enfantsSortis(e) { for (const k of e.enfants) if (!(k.phase === 'retour' || k.phase === 'maison' || k.voulu !== 'retour')) return false; return true; }
  // entrer dans la cour par le portail (une fois ouvert), puis aller à son jeu ou à la porte
  entrer(e) { e.phase = 'entrer'; e.route.length = 0; e.ri = 0; const P = this.E.portail; e.route.push(P.dehors, P.dedans); e.p.jeu = null; }
  // sortir de la cour : aller au portail (le traverser une fois ouvert), puis le chemin du retour
  versSortie(e) { e.phase = 'versSortie'; e.act = null; this.debout(e); e.p.jeu = null; e.tob = 'file'; this.allerA(e, this.E.portail.dedans.x, this.E.portail.dedans.z); }
  versPorte(e) { e.phase = 'versPorte'; e.act = null; this.debout(e); e.p.jeu = null; e.tob = 'file'; const D = this.E.porte.dehors; this.allerA(e, D.x, D.z); }
  // sortir par la porte de l'école : un par un (un tous les quarts de seconde), de part et d'autre du seuil ; rend faux si
  // ce n'est pas encore son tour
  sortirPorte(e) {
    if (this.tPorte > 0) return false;
    this.tPorte = e.genre === 'adulte' ? 0.4 : 0.22; this.kPorte = (this.kPorte || 0) + 1;
    e.phase = 'sortirPorte'; this.debout(e); e.p.placer(this.E.porte.x - 0.3, this.E.porte.z + ((this.kPorte % 3) - 1) * 0.35, -Math.PI / 2); e.p.jeu = null;
    e.route.length = 0; e.ri = 0; e.route.push(this.E.porte.dehors);
    return true;
  }
  placerAdulte(e, poser) { const P = this.posteAdulte(e, P1); if (poser) e.p.placer(P.x, P.z, 0); e.route.length = 0; e.ri = 0; e.but.x = P.x; e.but.z = P.z; e.route.push(e.but); }
  // où se tient un adulte : au portail s'il y a du passage, sinon à son poste de surveillance
  posteAdulte(e, P) {
    const E = this.E, hm = this.hm;
    if (e === this.gardien) { P.x = E.portail.dedans.x + 0.5; P.z = E.portail.z0 + 0.3; return P; }
    const k = this.adultes.indexOf(e), tour = Math.floor((hm + k * 7) / 4) % 3;
    const POSTES = [[[130.8, -23.0], [127.0, -26.0], [129.8, -28.5]], [[121.0, -30.8], [124.8, -33.6], [119.0, -24.0]], [[118.2, -19.6], [122.8, -17.6], [126.0, -12.2]]];
    const q = POSTES[k][tour]; P.x = q[0]; P.z = q[1];
    return P;
  }

  // se déplacer et se poser, selon sa phase
  bouger(e, dt, c) {
    const p = e.p, t = c.t, E = this.E;
    switch (e.phase) {
      case 'aller': case 'retour': this.marcherChemin(e, dt, c); break;
      case 'attente': {
        // devant le portail (un parent) : il y va, puis attend, tourné vers le portail
        if (this.avancer(e, dt, t, 1.1)) { p.h = versAngle(p.h, Math.PI / 2, dt * 3); p.telephone = e.telephone && !this.enfantsDehors(e); }
        if (!e.tenu && p.jeu) p.jeu = null;
        break;
      }
      case 'entrer': {
        this.attendPortail++;
        const i = e.ri;
        if (i === 1 && this.ouverture < 0.85) { p.update(dt, 0, 0, 0, false, LIBRE, t); p.h = versAngle(p.h, Math.PI / 2, dt * 4); break; }
        if (this.avancer(e, dt, t, e.marche || 1)) { e.phase = 'cour'; e.pret = false; e.versJeu = true; if (e.voulu === 'classe') this.versPorte(e); }
        break;
      }
      case 'versSortie': {
        this.attendPortail++;
        if (e.ri >= e.route.length - 1 && e.route[e.route.length - 1] === this.E.portail.dehors && this.ouverture < 0.85) { p.update(dt, 0, 0, 0, false, LIBRE, t); break; }
        if (this.avancer(e, dt, t, (e.marche || 1) * 1.3)) {
          if (e.route[e.route.length - 1] !== this.E.portail.dehors) { e.route.length = 0; e.ri = 0; e.route.push(this.E.portail.dehors); }
          else { e.phase = 'retour'; e.s = 0; e.lat = 0; }
        }
        break;
      }
      case 'versPorte': {
        this.versPorteN++;
        if (this.avancer(e, dt, t, e.genre === 'adulte' ? 1.2 : (e.marche || 1) * 1.3)) {
          // devant la porte : on attend qu'elle soit ouverte, on entre
          if (this.porteO > 0.8) { if (this.avancer2(e, dt, t)) e.phase = 'dedans'; }
          else p.h = versAngle(p.h, Math.PI / 2, dt * 4);
        }
        break;
      }
      case 'sortirPorte': {
        this.versPorteN++;
        if (this.porteO < 0.7) { p.update(dt, 0, 0, 0, false, LIBRE, t); break; }
        if (this.avancer(e, dt, t, e.genre === 'adulte' ? 1.2 : e.course || 2)) {
          if (e.genre === 'adulte') { e.phase = 'cour'; this.placerAdulte(e, false); }
          else if (e.voulu === 'retour' || e.voulu === 'maison') this.versSortie(e);
          else { e.phase = 'cour'; e.pret = false; e.versJeu = true; }
        }
        break;
      }
      case 'cour': {
        if (e.genre === 'adulte') { this.surveiller(e, dt, c); break; }
        if (!e.act) { p.update(dt, 0, 0, 0, false, LIBRE, t); break; }
        if (e.versJeu) {
          // aller à sa place dans son jeu (en courant, la récréation est courte), puis jouer ; hors de la vue, on y est
          const P = this.place(e, P2);
          if (!e.vu) { this.debout(e); p.jeu = null; p.placer(P.x, P.z, p.h); e.versJeu = false; e.pret = true; e.tob = 'file'; break; }
          if (Math.hypot(P.x - e.but.x, P.z - e.but.z) > 0.3 || !e.route.length) this.allerA(e, P.x, P.z);
          p.jeu = null; this.debout(e);
          if (this.avancer(e, dt, t, e.act.nom === 'attente' || e.act.nom === 'rang' || e.act.nom === 'balade' ? e.marche : e.course * 0.8)) { e.versJeu = false; e.pret = true; e.tJ = 0; }
        }
        // (les jeux les mènent : jouer)
        break;
      }
    }
  }
  // franchir la porte (deux pas vers l'intérieur) : rend vrai quand on est dedans
  avancer2(e, dt, t) { const p = e.p, x = this.E.porte.x + 0.2; p.update(dt, 1, 0, 1, false, LIBRE, t, 1); return p.pos.x > x - 0.25; }
  enfantsDehors(e) { for (const k of e.enfants) if (k.phase === 'versSortie' || (k.phase === 'retour' && k.s < 2)) return true; return false; }

  // Marcher le long de son chemin : on suit son parent (ou son aîné) ; on attend au bord d'un passage piéton qu'aucune
  // voiture n'arrive ; on s'écarte d'un véhicule qui approche (on s'arrête, on fait un pas de côté, hors de sa trajectoire)
  marcherChemin(e, dt, c) {
    const p = e.p, ch = e.ch, retour = e.phase === 'retour', sens = retour ? -1 : 1;
    // le chef de file : le parent qui marche avec eux ; sinon l'aîné, s'il va du même côté
    const par = e.parent, chef = par && par.phase === e.phase && par.m.groupe.visible ? par : e.frere && e.frere.phase === e.phase && e.frere.m.groupe.visible ? e.frere : null;
    e.leader = chef;
    let s = e.s + e.vit * dt;
    if (chef) {
      const k = chef === par ? par.enfants.indexOf(e) : 1;
      s = chef.s - 0.35 - 0.3 * Math.floor(k / 2); e.latV = chef.lat + (k % 2 ? -0.62 : 0.62);
    } else e.latV = 0;
    // le soir, le parent attend encore devant le portail : on reste près de lui
    if (retour && par && par.phase === 'attente') s = e.s;
    // un passage piéton devant : on attend qu'aucune voiture n'arrive (ni le véhicule du joueur)
    const sA = retour ? ch.L - s : s;
    for (let i = 0; i < ch.tr.length; i++) {
      const debut = retour ? ch.tr[i][1] : ch.tr[i][0], avant = retour ? debut - sA : sA - debut;
      if (avant > -0.7 && avant < 0.05 && this.voitureArrive(p.pos.x, p.pos.z, c)) s = e.s;
    }
    // un véhicule qui approche : on s'arrête et l'on s'écarte de sa trajectoire
    const D = c.danger;
    this.surChemin(ch, retour ? ch.L - e.s : e.s, 0, sens, P1);
    if (D && Math.abs(D.v) > 1) {
      const sx = Math.sin(D.h) * Math.sign(D.v), sz = Math.cos(D.h) * Math.sign(D.v), dx = p.pos.x - D.x, dz = p.pos.z - D.z, d = Math.hypot(dx, dz), av = dx * sx + dz * sz;
      if (d < 8 && av > -1.5) {
        s = e.s;
        let ax = dx - av * sx, az = dz - av * sz; const l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
        e.latV += 1.1 * (ax * -Math.cos(P1.h) + az * Math.sin(P1.h));
      }
    }
    e.s = borne(s, 0, ch.L);
    e.lat += borne(e.latV - e.lat, -dt * 1.6, dt * 1.6);
    const P = this.surChemin(ch, retour ? ch.L - e.s : e.s, e.lat, sens, P1);
    const dx = P.x - p.pos.x, dz = P.z - p.pos.z, d = Math.hypot(dx, dz);
    if (d > 4) p.placer(P.x, P.z, P.h);
    else if (d > 0.04) p.update(dt, dx / d, dz / d, 1, false, LIBRE, c.t, Math.min(2.2, d / Math.max(dt, 1e-3)));
    else { p.update(dt, 0, 0, 0, false, LIBRE, c.t); p.h = versAngle(p.h, P.h, dt * 3); }
    // la main dans celle de son parent (les petits)
    if (e.genre === 'enfant') this.tenir(e, chef && chef === par && e.def.age <= 6 ? chef : null);
    else if (e.genre === 'parent' && !e.tenu && p.jeu) p.jeu = null;
    // au bout du chemin
    if (e.s >= ch.L - 0.02) {
      if (retour) { e.phase = 'maison'; this.montrer(e, false); }
      else if (e.genre === 'parent') { if (e.voulu === 'attente' || e.voulu === 'aller') { e.phase = 'attente'; this.allerAttente(e); } }
      else if (!chef) this.entrer(e);
    }
  }
  // Une voiture arrive-t-elle sur le passage (environ 4 s d'avance) ? Le véhicule du joueur, lancé, tout près ?
  voitureArrive(x, z, c) {
    const A = c.voitures;
    if (A) for (let i = 0; i < A.length; i++) { const v = A[i]; if (v.v > 1 && Math.abs(v.z - z) < 12) { const ex = (x - v.x) * v.sens; if (ex > -4 && ex < 6 + v.v * 4) return true; } }
    const D = c.danger;
    return !!D && Math.abs(D.v) > 0.8 && Math.hypot(D.x - x, D.z - z) < 18;
  }
  // La main d'un petit dans celle de son parent : un point entre eux deux, à hauteur de la main du petit (qui lève un peu le
  // bras ; le parent baisse le sien)
  tenir(e, chef) {
    const p = e.p, J = e.J;
    if (!chef || Math.hypot(p.pos.x - chef.p.pos.x, p.pos.z - chef.p.pos.z) > 1.25) { if (p.jeu === J && J.g === 'debout') p.jeu = null; return; } // (trop loin : chacun ses mains)
    const mx = (p.pos.x + chef.p.pos.x) / 2, mz = (p.pos.z + chef.p.pos.z) / 2, y = 0.3 + e.m.echelle * 0.5;
    J.g = 'debout'; p.jeu = J;
    this.local(e, mx, y, mz, J.MD);
    if (J.MD[0] < 0) { J.md = J.MD; J.mg = null; } else { J.MG[0] = J.MD[0]; J.MG[1] = J.MD[1]; J.MG[2] = J.MD[2]; J.mg = J.MG; J.md = null; }
    const K = chef.J; K.g = 'debout'; chef.p.jeu = K; chef.tenu = true;
    this.local(chef, mx, y, mz, K.MD);
    if (K.MD[0] < 0) { K.md = K.MD; K.mg = null; } else { K.MG[0] = K.MD[0]; K.MG[1] = K.MD[1]; K.MG[2] = K.MD[2]; K.mg = K.MG; K.md = null; }
  }
  // un point du monde dans le repère du personnage (unités du modèle) : pour ses mains
  local(e, x, y, z, R) {
    const p = e.p, g = p.m.groupe, h = p.assis ? g.rotation.y : p.hv, co = Math.cos(h), si = Math.sin(h), E = e.m.echelle;
    const dx = x - g.position.x, dz = z - g.position.z;
    R[0] = (dx * co - dz * si) / E; R[1] = (y - g.position.y) / E; R[2] = (dx * si + dz * co) / E;
    return R;
  }

  /* ---------------------------------------------------------------- les adultes */
  surveiller(e, dt, c) {
    const p = e.p, P = this.posteAdulte(e, P2);
    if (Math.hypot(P.x - e.but.x, P.z - e.but.z) > 0.3) { e.route.length = 0; e.ri = 0; e.but.x = P.x; e.but.z = P.z; e.route.push(e.but); }
    const J = e.J;
    if (this.avancer(e, dt, c.t, e === this.gardien ? 1.6 : 1.0)) {
      // à son poste : les bras croisés ou les mains dans le dos ; il regarde les enfants (le plus proche qui joue)
      J.g = e.nom === 'maitre' ? 'dos' : 'croise'; J.mg = null; J.md = null; p.jeu = e === this.gardien ? null : J;
      let k = null, dmin = 1e9;
      for (const x of this.enfants) if (x.phase === 'cour' && x.m.groupe.visible) { const d = (x.p.pos.x - p.pos.x) ** 2 + (x.p.pos.z - p.pos.z) ** 2; if (d < dmin) { dmin = d; k = x; } }
      if (e === this.gardien) p.h = versAngle(p.h, -Math.PI / 2, dt * 3);
      else if (k) { e.R.set(k.p.pos.x, 0.8, k.p.pos.z); p.regard = e.R; p.h = versAngle(p.h, Math.atan2(k.p.pos.x - p.pos.x, k.p.pos.z - p.pos.z), dt * 1.2); }
    } else { p.jeu = null; p.regard = null; }
  }

  /* ---------------------------------------------------------------- le décor qui bouge */
  decor(dt, c, sorte, hm) {
    const E = this.E;
    // le portail : un adulte (le gardien) y va quand quelqu'un arrive ou repart ; il s'ouvre quand il y est
    const besoin = this.attendPortail > 0 || this.appel > 0;
    if (besoin && (!this.gardien || this.gardien.phase !== 'cour')) { let best = null, dmin = 1e9; for (const a of this.adultes) if (a.phase === 'cour') { const d = Math.hypot(a.p.pos.x - E.portail.dedans.x, a.p.pos.z - E.portail.dedans.z); if (d < dmin) { dmin = d; best = a; } } this.gardien = best; this.tGardien = 0; }
    if (!besoin && this.gardien && this.ouverture < 0.05 && (this.tGardien = (this.tGardien || 0) + dt) > 4) this.gardien = null;
    if (besoin) this.tGardien = 0;
    const auPortail = this.gardien && Math.hypot(this.gardien.p.pos.x - E.portail.dedans.x - 0.5, this.gardien.p.pos.z - E.portail.z0 - 0.3) < 0.8;
    // personne de l'école dans la cour (le soir, la garderie finie) : le portail s'ouvre quand même pour qui passe
    const ouvrir = this.attendPortail > 0 && (auPortail || !this.adultes.length || !this.gardien) ? 1 : 0;
    this.ouverture += borne(ouvrir - this.ouverture, -dt * 0.9, dt * 0.9);
    const f = lisse(this.ouverture);
    this.vantaux[0].rotation.y = Math.PI / 2 * (1 - 0.92 * f); this.vantaux[1].rotation.y = -Math.PI / 2 * (1 - 0.92 * f);
    // la porte de l'école : ouverte tant que quelqu'un entre ou sort
    const po = this.versPorteN > 0 ? 1 : 0;
    this.porteO += borne(po - this.porteO, -dt * 1.2, dt * 1.6);
    const fo = lisse(this.porteO);
    this.battants[0].rotation.y = -Math.PI / 2 - 1.7 * fo; this.battants[1].rotation.y = Math.PI / 2 + 1.7 * fo;
    // les aiguilles de l'horloge, une fois par minute de jeu
    const mn = Math.floor(c.minutes);
    if (mn !== this.minuteH) {
      this.minuteH = mn;
      const h = heureDe(mn), H = E.horloge;
      [[((h / 60) % 12) / 12 * Math.PI * 2, 0.27], [(h % 60) / 60 * Math.PI * 2, 0.4]].forEach(([a, l], i) => {
        q1.setFromAxisAngle(v1.set(1, 0, 0), a);
        m4.compose(v2.set(H.x - 0.01 * i, H.y, H.z), q1, v1.set(1, l, 1)); this.aiguilles.setMatrixAt(i, m4);
      });
      this.aiguilles.instanceMatrix.needsUpdate = true;
    }
    // la cloche : à chaque sonnerie, elle se balance (et sonne : sons)
    const S = SONNERIES[sorte] || [];
    for (const s of S) if (hm >= s && hm < s + 1 && this.sonnee !== jourDe(c.minutes) * 1440 + s) { this.sonnee = jourDe(c.minutes) * 1440 + s; this.tCloche = 4.5; this.sonner = true; }
    if (this.tCloche > 0) { this.tCloche -= dt; this.cloche.rotation.z = Math.sin(this.tCloche * 9) * 0.55 * Math.min(1, this.tCloche); } else this.cloche.rotation.z = 0;
    // les classes : les élèves aux fenêtres pendant la classe ; éclairées le jour, sombres la nuit
    const en = enClasse(sorte, hm) ? 1 : 0;
    if (en !== this.classeLu) { this.classeLu = en; this.classes.userData.tex.offset.y = en ? 0.5 : 0; }
    const nuit = UNI.uNuit.value, k = (en ? 0.95 : 0.72) * (1 - 0.82 * nuit);
    if (Math.abs(k - this.allumee) > 0.01) { this.allumee = k; this.classes.material.color.setScalar(k); }
  }

  /* ---------------------------------------------------------------- les jeux qui se jouent */
  jouer(dt, c) {
    const J = this.jeux, t = c.t, E = this.E;
    for (const k in J) {
      const j = J[k];
      if (!j.membres.length) { this.repos(j, dt); continue; }
      const prets = j.prets || (j.prets = []);
      prets.length = 0;
      for (const e of j.membres) if (e.phase === 'cour' && e.pret && e.m.groupe.visible) prets.push(e);
      switch (k) {
        case 'balancoire': this.balancoire(j, prets, dt, t); break;
        case 'toboggan': this.toboggan(j, dt, t); break;
        case 'ressort': this.ressort(j, prets, dt, t); break;
        case 'sable': for (const e of prets) { const J0 = e.J; J0.g = 'accroupi'; J0.v = 'sable'; J0.mg = J0.md = null; e.p.jeu = J0; this.debout(e); this.regarde(e, E.sable.x, E.sable.z, dt); e.p.update(dt, 0, 0, 0, false, LIBRE, t); e.m.groupe.position.y = E.sable.y; } break;
        case 'corde': this.corde(j, prets, dt, t); break;
        case 'marelle': this.marelle(j, prets, dt, t); break;
        case 'ronde': this.ronde(j, prets, dt, t); break;
        case 'ballon': this.foot(j, prets, dt, t); break;
        case 'billes': this.jeuBilles(j, prets, dt, t); break;
        case 'banc': this.banc(j, prets, dt, t); break;
        case 'chat': this.chat(j, prets, dt, t); break;
        default: // balade, attente, rang : on se tient là, on discute, on repart (la balade)
          for (const e of prets) {
            e.p.jeu = null; this.debout(e);
            if (k === 'balade') { e.tB = (e.tB || 0) + dt / 9; const P = this.place(e, P2); if (Math.hypot(P.x - e.p.pos.x, P.z - e.p.pos.z) > 0.8) { e.pret = false; e.versJeu = true; } }
            const voisin = j.membres[e.rang ^ 1];
            if (voisin && voisin.m.groupe.visible) { e.R.set(voisin.p.pos.x, voisin.m.echelle * 1.4, voisin.p.pos.z); e.p.regard = e.R; this.regarde(e, voisin.p.pos.x, voisin.p.pos.z, dt * 0.5); } else e.p.regard = null;
            e.p.update(dt, 0, 0, 0, false, LIBRE, t);
          }
      }
    }
  }
  // en attendant son tour (la corde, la marelle) : on tape dans ses mains, de temps en temps (pour encourager celui qui joue)
  applaudir(e, t) {
    const J = e.J, u = (t * 0.45 + e.J.dphi) % 3;
    if (u > 1.4) { e.p.jeu = null; return; }
    const y = e.m.dim.yB + 0.42, ec = 0.03 + 0.07 * Math.abs(Math.sin(t * 9 + J.dphi));
    J.g = 'debout'; J.MG[0] = ec; J.MG[1] = y; J.MG[2] = 0.22; J.MD[0] = -ec; J.MD[1] = y; J.MD[2] = 0.22; J.mg = J.MG; J.md = J.MD;
    e.p.jeu = J;
  }
  // tourner vers (x, z)
  regarde(e, x, z, vit) { e.p.h = versAngle(e.p.h, Math.atan2(x - e.p.pos.x, z - e.p.pos.z), vit * 4); }
  // un jeu sans joueurs se remet au repos (les balançoires s'arrêtent, la corde est posée...)
  repos(j, dt) {
    if (j.nom === 'balancoire') for (const g of this.balancoires) { g.userData.th *= Math.exp(-dt * 0.8); g.rotation.z = g.userData.th; }
    if (j.nom === 'ressort') for (const g of this.ressorts) { g.rotation.x *= Math.exp(-dt * 3); }
    if (j.nom === 'corde') { this.cordeM.visible = false; }
    if (j.nom === 'ballon') this.ballon.visible = false;
  }
  // assis sur un siège (le groupe du personnage posé sur le siège, tourné avec lui)
  asseoirSur(e, x, y, z, h, inclinaison, roulis = 0) {
    const g = e.m.groupe;
    e.p.assis = true;
    q1.setFromAxisAngle(AXE_Y, h); q2.setFromAxisAngle(v1.set(Math.cos(h), 0, -Math.sin(h)), inclinaison); // (incliné autour de son axe gauche-droite)
    g.quaternion.multiplyQuaternions(q2, q1);
    if (roulis) { q2.setFromAxisAngle(v1.set(Math.sin(h), 0, Math.cos(h)), roulis); g.quaternion.premultiply(q2); }
    g.position.set(x, y, z); e.p.pos.set(x, 0, z);
  }

  // Les balançoires : le siège oscille (pendule) ; on pompe (les jambes tendues en allant vers l'avant)
  balancoire(j, prets, dt, t) {
    for (let i = 0; i < this.balancoires.length; i++) {
      const g = this.balancoires[i];
      const e = j.membres[i], U = g.userData, b = U.b;
      if (!e || !prets.includes(e)) { U.th *= Math.exp(-dt * 0.8); g.rotation.z = U.th; if (e && e.phase === 'cour') e.p.assis = false; continue; }
      const w = Math.sqrt(9.81 / b.L), A = 0.35 + 0.12 * Math.min(1, e.def.age / 8);
      U.w = (U.w || 0) + dt * w; U.a = Math.min(A, (U.a || 0) + dt * 0.08);
      const th = U.a * Math.sin(U.w), om = U.a * w * Math.cos(U.w);
      U.th = th; g.rotation.z = th;
      // le siège : sous la poutre, au bout des chaînes ; l'enfant regarde vers l'ouest (la place), le siège tourné de th
      const sx = b.x + Math.sin(th) * (b.L + 0.0), sy = b.y - Math.cos(th) * b.L + 0.02;
      this.asseoirSur(e, sx, sy, b.z, b.h, 0);
      q1.setFromAxisAngle(AXE_Z, th); e.m.groupe.quaternion.premultiply(q1);
      const J0 = e.J; J0.g = 'balancoire'; J0.p = lisse(0.5 - 0.5 * Math.cos(U.w)); J0.cx = 0.2 / e.m.echelle; J0.mg = J0.md = null;
      e.p.jeu = J0; e.p.regard = null; e.p.sync(dt, t);
    }
  }
  // Le toboggan : chacun son tour monte l'escalier, s'assoit en haut, glisse (les bras en l'air pour les grands), se
  // relève en bas et revient en courant faire la queue
  toboggan(j, dt, t) {
    const T = this.E.toboggan;
    for (const e of j.membres) {
      if (e.phase !== 'cour' || !e.pret) continue;
      const p = e.p, J0 = e.J;
      e.tob = e.tob || 'file';
      if (e.tob === 'file') {
        // attendre son tour au pied de l'escalier
        p.jeu = null; this.debout(e);
        if (!j.occupe) { j.occupe = e; e.tob = 'pied'; e.route.length = 0; e.ri = 0; e.route.push(T.pied); }
        else { this.regarde(e, T.haut.x, T.haut.z, dt); p.update(dt, 0, 0, 0, false, LIBRE, t); }
      } else if (e.tob === 'pied') { if (this.avancer(e, dt, t, e.marche)) { e.tob = 'monte'; } }
      else if (e.tob === 'monte') {
        // l'escalier : on monte en marchant, la hauteur suit les marches
        p.update(dt, 1, 0, 1, false, LIBRE, t, 0.65);
        const u = borne((p.pos.x - T.bas0.x) / (T.haut.x - T.bas0.x), 0, 1);
        e.m.groupe.position.y = u * T.haut.y;
        if (p.pos.x >= T.haut.x) { e.tob = 'assis'; e.tT = 0; }
      } else if (e.tob === 'assis' || e.tob === 'glisse') {
        e.tT += dt;
        let x = T.assise.x, y = T.assise.y, pente = 0;
        if (e.tob === 'assis') { if (e.tT > 0.55) { e.tob = 'glisse'; e.tT = 0; } }
        else {
          const u = Math.min(1, e.tT * e.tT * 0.95);
          const pa = Math.atan2(T.assise.y - T.fin.y, T.fin.x - T.assise.x);
          if (u < 1) { x = mix(T.assise.x, T.fin.x, u); y = mix(T.assise.y, T.fin.y, u); pente = pa; }
          else { const v = Math.min(1, (e.tT - 1.026) * 2.2); x = mix(T.fin.x, T.bas.x, v); y = T.fin.y; if (v >= 1) { e.tob = 'releve'; e.tT = 0; if (j.occupe === e) j.occupe = null; } }
        }
        this.asseoirSur(e, x, y + 0.05, T.assise.z, Math.PI / 2, pente); // (assis sur le fond du toboggan, entre ses rebords)
        J0.g = 'glisse'; J0.bras = e.tob === 'glisse' && e.def.age >= 6 && e.tT > 0.25; J0.mg = J0.md = null; p.jeu = J0; p.sync(dt, t);
      } else if (e.tob === 'releve') {
        e.tT += dt; this.debout(e); p.jeu = null;
        if (e.tT < 0.05) p.placer(T.bas.x + 0.1, T.bas.z, Math.PI / 2);
        p.update(dt, 0, 0, 0, false, LIBRE, t);
        if (e.tT > 0.3) { e.tob = 'retour'; e.route.length = 0; e.ri = 0; e.but.x = T.pied.x - 0.3 - e.rang * 0.55; e.but.z = T.pied.z + 0.9; e.route.push(RETOUR_TOB[0], RETOUR_TOB[1], e.but); }
      } else if (e.tob === 'retour') { if (this.avancer(e, dt, t, e.course * 0.75)) e.tob = 'file'; }
    }
    if (j.occupe && !j.membres.includes(j.occupe)) j.occupe = null;
  }
  // Les jeux à ressort : on se balance d'avant en arrière, assis sur la coccinelle ou le petit cheval
  ressort(j, prets, dt, t) {
    for (let i = 0; i < this.ressorts.length; i++) {
      const g = this.ressorts[i];
      const e = j.membres[i], r = g.userData.r;
      if (!e || !prets.includes(e)) { g.rotation.x *= Math.exp(-dt * 3); continue; }
      const a = 0.26 * Math.sin(t * 4.0 + i) + 0.06 * Math.sin(t * 7.3 + i * 2);
      g.rotation.x = a;
      // le siège du jeu, dans le repère du jeu (incliné de a) : on y pose l'enfant, tourné comme lui
      v1.set(0, 0.36, -0.05).applyEuler(g.rotation).add(g.position);
      this.asseoirSur(e, v1.x, v1.y, v1.z, r.h, a);
      const J0 = e.J; J0.g = 'ressort'; J0.k = a; J0.mg = J0.md = null; e.p.jeu = J0; e.p.sync(dt, t);
    }
  }
  // La corde à sauter : deux la tournent (la main suit le bout de la corde), un saute au milieu quand elle passe en bas,
  // les autres attendent leur tour ; au bout de quelques sauts, le sauteur cède sa place
  corde(j, prets, dt, t) {
    const C0 = this.E.corde, M = j.membres, g = this.cordeM;
    const tourneurs = M[0] && M[1] && prets.includes(M[0]) && prets.includes(M[1]);
    g.visible = this.proche && (tourneurs || !!(M[0] && prets.includes(M[0])));
    const w = Math.PI * 2 * 1.35;
    if (tourneurs) j.phi += dt * w;
    g.rotation.x = tourneurs ? j.phi : Math.PI * 0.98; // posée par terre tant qu'on ne la tourne pas
    // le bruit de la corde qui claque par terre
    const bas = Math.cos(j.phi) < -0.97;
    if (bas && !j.bas && tourneurs) { j.claque = true; } j.bas = bas;
    // les tourneurs : face à face, une main au bout de la corde
    const lc = g.userData.lc, ca = Math.cos(j.phi), sa = Math.sin(j.phi), r = 0.12;
    for (let i = 0; i < 2; i++) {
      const e = M[i]; if (!e || !prets.includes(e)) continue;
      const ex = i === 0 ? C0.a.x + 0.35 : C0.a.x + 0.35 + lc, h = i === 0 ? Math.PI / 2 : -Math.PI / 2;
      this.debout(e); e.p.h = versAngle(e.p.h, h, dt * 5);
      const J0 = e.J; J0.g = 'debout'; e.p.jeu = J0;
      this.local(e, ex, 0.74 + r * ca, C0.a.z + r * sa, J0.MD); J0.md = J0.MD; J0.mg = null;
      e.p.update(dt, 0, 0, 0, false, LIBRE, t);
    }
    // le sauteur et ceux qui attendent
    j.tJ += dt;
    const att = j.att || (j.att = []);
    att.length = 0;
    for (let i = 2; i < M.length; i++) if (prets.includes(M[i])) att.push(M[i]);
    if (att.length && j.tJ > 5 + (j.saut % 3)) { j.tJ = 0; j.saut++; }
    for (let k = 0; k < att.length; k++) {
      const e = att[k];
      const actif = tourneurs && k === j.saut % att.length, J0 = e.J;
      this.debout(e);
      if (actif) {
        const x = (C0.a.x + C0.b.x) / 2, z = C0.a.z;
        if (Math.hypot(e.p.pos.x - x, e.p.pos.z - z) > 0.15) { e.p.jeu = null; e.p.update(dt, x - e.p.pos.x, z - e.p.pos.z, 1, false, LIBRE, t, 2); continue; }
        e.p.h = versAngle(e.p.h, 0, dt * 6);
        J0.g = 'saut'; J0.corde = false; J0.air = 0.42; J0.h = 0.14; J0.mg = J0.md = null;
        // en l'air quand la corde passe en bas (phi = pi)
        J0.u = (((j.phi - Math.PI) / (Math.PI * 2) + 0.21) % 1 + 1) % 1;
        e.p.jeu = J0; e.p.update(dt, 0, 0, 0, false, LIBRE, t);
      } else {
        const P = this.place(e, P2);
        if (Math.hypot(P.x - e.p.pos.x, P.z - e.p.pos.z) > 0.2) { e.p.jeu = null; e.p.update(dt, P.x - e.p.pos.x, P.z - e.p.pos.z, 1, false, LIBRE, t, 1.6); }
        else { this.applaudir(e, t); this.regarde(e, (C0.a.x + C0.b.x) / 2, C0.a.z, dt); e.p.update(dt, 0, 0, 0, false, LIBRE, t); }
      }
    }
  }
  // La marelle : le joueur saute à cloche-pied de case en case (les deux pieds dans les cases doubles et au Ciel), fait
  // demi-tour au Ciel, revient ; puis c'est au suivant
  marelle(j, prets, dt, t) {
    const Mr = this.E.marelle, ordre = ORDRE_MARELLE;
    const C = caseMarelle;
    const M = prets;
    if (!M.length) return;
    const joueur = M[j.joueur % M.length];
    if (joueur !== j.dernier) { j.dernier = joueur; j.t = 0; j.case = 0; }
    for (let i_e = 0; i_e < M.length; i_e++) {
      const e = M[i_e];
      const J0 = e.J;
      this.debout(e);
      if (e !== joueur) {
        const P = this.place(e, P2);
        if (Math.hypot(P.x - e.p.pos.x, P.z - e.p.pos.z) > 0.2) { e.p.jeu = null; e.p.update(dt, P.x - e.p.pos.x, P.z - e.p.pos.z, 1, false, LIBRE, t, 1.2); }
        else { this.applaudir(e, t); this.regarde(e, joueur.p.pos.x, joueur.p.pos.z, dt); e.p.update(dt, 0, 0, 0, false, LIBRE, t); }
        continue;
      }
      // le joueur : au départ, sur la Terre
      if (j.case === 0 && j.t === 0) { const D = C(Mr, -1, QA); if (Math.hypot(D.x - e.p.pos.x, D.z - e.p.pos.z) > 0.15) { e.p.jeu = null; e.p.update(dt, D.x - e.p.pos.x, D.z - e.p.pos.z, 1, false, LIBRE, t, 1.2); continue; } }
      j.t += dt;
      const duree = 0.52, k = Math.floor(j.t / duree), u = (j.t % duree) / duree;
      if (k >= ordre.length - 1) { j.t = 0; j.case = 0; j.joueur++; e.p.jeu = null; continue; }
      j.case = k + 1;
      const a = C(Mr, k === 0 ? -1 : ordre[k - 1], QA), b = C(Mr, ordre[k], QB), demiTour = ordre[k] === 6 && ordre[k - 1] === 6;
      const air = 0.55, uu = Math.min(1, u / air);
      e.p.pos.x = mix(a.x, b.x, uu); e.p.pos.z = mix(a.z, b.z, uu);
      const versCiel = k < 7 || (k === 7 && u < 0.5);
      e.p.h = demiTour ? mix(Math.PI, 0, lisse(u)) : versCiel ? Math.PI : 0;
      J0.g = 'cloche'; J0.u = u; J0.air = air; J0.h = 0.12; J0.deux = b.d; J0.pied = 1; J0.mg = J0.md = null;
      e.p.jeu = J0; e.p.sync(dt, t);
    }
  }
  // La ronde : on tourne en se tenant la main (les mains jointes à mi-chemin du voisin) ; à la fin de la chanson, tout le
  // monde s'accroupit, puis on repart dans l'autre sens
  ronde(j, prets, dt, t) {
    const R = this.E.ronde, M = prets, n = M.length;
    if (n < 3) { for (const e of M) { e.p.jeu = null; e.p.update(dt, 0, 0, 0, false, LIBRE, t); } return; }
    j.t += dt;
    const cycle = 9.5, u = j.t % cycle, accroupi = u > 7.4 && u < 8.8;
    if (j.t > cycle) { j.t -= cycle; j.sens = -j.sens; }
    if (!accroupi) j.psi += dt * 0.5 * j.sens;
    for (let i = 0; i < M.length; i++) {
      const e = M[i];
      const a = j.psi + i / n * Math.PI * 2, x = R.x + Math.cos(a) * R.r, z = R.z + Math.sin(a) * R.r;
      const J0 = e.J; this.debout(e);
      // vers sa place (il tourne avec les autres) ; tourné à moitié vers le centre
      const dx = x - e.p.pos.x, dz = z - e.p.pos.z, d = Math.hypot(dx, dz);
      const tang = Math.atan2(-Math.sin(a) * j.sens, Math.cos(a) * j.sens), centre = Math.atan2(R.x - x, R.z - z);
      J0.g = accroupi ? 'accroupi' : 'debout'; J0.v = null; J0.dy = 0.04;
      e.p.jeu = J0;
      if (d > 0.05) e.p.update(dt, dx / d, dz / d, 1, false, LIBRE, t, Math.min(1.6, d / Math.max(dt, 1e-3)));
      else e.p.update(dt, 0, 0, 0, false, LIBRE, t);
      e.p.h = tang + angle(centre - tang) * 0.55;
      // les mains : à mi-chemin de chaque voisin
      const g0 = M[(i + 1) % n], g1 = M[(i + n - 1) % n];
      const y = (accroupi ? 0.42 : 0.62) * Math.min(e.m.echelle, g0.m.echelle) / 0.7;
      this.local(e, (e.p.pos.x + g0.p.pos.x) / 2, y, (e.p.pos.z + g0.p.pos.z) / 2, J0.MG);
      this.local(e, (e.p.pos.x + g1.p.pos.x) / 2, y, (e.p.pos.z + g1.p.pos.z) / 2, J0.MD);
      if (J0.MG[0] < J0.MD[0]) { for (let k = 0; k < 3; k++) { const x0 = J0.MG[k]; J0.MG[k] = J0.MD[k]; J0.MD[k] = x0; } }
      J0.mg = J0.MG; J0.md = J0.MD;
    }
  }
  // Le ballon : des passes (on court au-devant de la balle, on l'arrête du pied), des tirs au but (le gardien plonge),
  // on lève les bras après un but ; le gardien relance
  foot(j, prets, dt, t) {
    const T = this.E.terrain, Bu = this.E.but, b = j.b, M = prets;
    if (M.length < 2) { this.ballon.visible = false; for (const e of M) { e.p.jeu = null; e.p.update(dt, 0, 0, 0, false, LIBRE, t); } return; }
    this.ballon.visible = this.proche;
    if (j.porteur < 0 && j.vers < 0) { const e = M[M.length > 1 ? 1 : 0]; b.x = e.p.pos.x; b.z = e.p.pos.z - 0.4; b.y = 0.11; b.vx = b.vy = b.vz = 0; j.porteur = M.indexOf(e); }
    // la balle : roule, rebondit, freine ; bute contre les bords du terrain et le filet du but
    b.vy -= 9.81 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y < 0.11) { b.y = 0.11; b.vy = Math.abs(b.vy) > 1 ? -b.vy * 0.45 : 0; const f = Math.exp(-dt * 0.9); b.vx *= f; b.vz *= f; }
    if (b.x < T.x0 - 0.5 || b.x > T.x1 + 0.6) { b.vx = -b.vx * 0.5; b.x = borne(b.x, T.x0 - 0.5, T.x1 + 0.6); }
    if (b.z > T.z1 + 0.8) { b.vz = -b.vz * 0.5; b.z = T.z1 + 0.8; }
    const dansBut = Math.abs(b.x - Bu.x) < Bu.l / 2 - 0.1 && b.y < Bu.h;
    if (b.z < Bu.z - (dansBut ? 0.15 : -0.2)) { if (dansBut && j.fete <= 0 && j.tireur >= 0) j.fete = 2.2; b.vz = Math.abs(b.vz) * 0.25; b.z = Bu.z - (dansBut ? 0.15 : -0.2); b.vx *= 0.5; }
    this.ballon.position.set(b.x, b.y, b.z); this.ballon.rotation.x -= b.vz * dt / 0.11; this.ballon.rotation.z += b.vx * dt / 0.11;
    j.fete = Math.max(0, j.fete - dt);
    const g = M[0]; // le gardien
    for (let i = 0; i < M.length; i++) {
      const e = M[i];
      const J0 = e.J, p = e.p; this.debout(e);
      J0.mg = J0.md = null;
      if (e.tir > 0) { e.tir -= dt; J0.g = 'tir'; J0.u = 1 - e.tir / 0.5; p.jeu = J0; p.update(dt, 0, 0, 0, false, LIBRE, t); continue; }
      if (e === g) {
        // le gardien suit la balle sur sa ligne ; il plonge si un tir arrive
        const x = borne(b.x, Bu.x - Bu.l / 2 + 0.3, Bu.x + Bu.l / 2 - 0.3), z = Bu.z + 0.45;
        if (b.vz < -4 && b.z < Bu.z + 4 && b.z > Bu.z + 1 && p.sautT <= 0 && Math.abs(b.x - p.pos.x) > 0.3) p.sauter(Math.sign(b.x - p.pos.x), 0);
        J0.g = 'debout'; p.jeu = null; if (j.fete > 0 && j.tireur >= 0) { J0.g = 'debout'; }
        const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
        p.update(dt, d > 0.1 ? dx / d : 0, d > 0.1 ? dz / d : 0, d > 0.1 ? 1 : 0, false, LIBRE, t, Math.min(2.5, d * 3));
        p.h = 0;
        // il attrape la balle arrêtée devant lui et relance
        if (Math.hypot(b.x - p.pos.x, b.z - p.pos.z) < 0.6 && Math.hypot(b.vx, b.vz) < 2.5 && j.fete <= 0) { j.porteur = 0; j.vers = -1; }
        if (j.porteur === 0) { b.x = p.pos.x; b.z = p.pos.z + 0.4; b.vx = b.vz = 0; b.y = 0.11; this.passer(j, e, M, 1 + Math.floor(Math.random() * (M.length - 1)), 6.5, 0.6); }
        continue;
      }
      // les autres : vers la balle si elle vient à eux, sinon à leur place ; celui qui l'a la pousse, puis passe ou tire
      if (j.fete > 0 && i === j.tireur) { J0.g = 'debout'; J0.MG[0] = 0.22; J0.MG[1] = 1.95; J0.MG[2] = 0.1; J0.MD[0] = -0.22; J0.MD[1] = 1.95; J0.MD[2] = 0.1; J0.mg = J0.MG; J0.md = J0.MD; p.jeu = J0; p.update(dt, 0, 0, 0, false, LIBRE, t); continue; }
      let x, z, vit = e.course * 0.7;
      if (j.porteur === i) {
        // il pousse la balle devant lui vers le but
        const cx = Bu.x + (i % 2 ? 1.2 : -1.2), cz = Bu.z + 5.5;
        x = b.x - (cx - b.x) * 0.05; z = b.z + 0.38; vit = e.course * 0.45;
        const d = Math.hypot(x - p.pos.x, z - p.pos.z);
        if (d < 0.5) { b.vx = (cx - b.x) * 0.18; b.vz = (cz - b.z) * 0.18; j.tP += dt; }
        if (j.tP > 1.3) {
          j.tP = 0; j.passes++;
          if (j.passes % 3 === 0 && b.z < Bu.z + 8) { this.tirer(j, e, i); }
          else this.passer(j, e, M, 1 + ((i + Math.floor(Math.random() * (M.length - 2))) % (M.length - 1)), 5.5, 0.15);
        }
      } else if (j.vers === i) { x = b.x + b.vx * 0.35; z = b.z + b.vz * 0.35 + 0.3; vit = e.course * 0.8; if (Math.hypot(b.x - p.pos.x, b.z - p.pos.z) < 0.55 && b.y < 0.4) { j.porteur = i; j.vers = -1; b.vx *= 0.2; b.vz *= 0.2; } }
      else { const P = this.place(e, P2); x = P.x; z = P.z; vit = e.course * 0.4; }
      J0.g = 'debout'; p.jeu = null;
      const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.12) p.update(dt, dx / d, dz / d, 1, false, LIBRE, t, Math.min(vit, d * 2.5));
      else { p.update(dt, 0, 0, 0, false, LIBRE, t); this.regarde(e, b.x, b.z, dt); }
    }
  }
  passer(j, e, M, i, vit, loft) {
    const b = j.b, r = M[i] || M[1];
    if (!r) return;
    const dx = r.p.pos.x - b.x, dz = r.p.pos.z - b.z, d = Math.hypot(dx, dz) || 1;
    b.vx = dx / d * vit; b.vz = dz / d * vit; b.vy = loft * vit * 0.5; b.y = 0.12;
    j.porteur = -1; j.vers = M.indexOf(r); j.tireur = -1; e.tir = 0.5; this.coup = true;
  }
  tirer(j, e, i) {
    const b = j.b, Bu = this.E.but, x = Bu.x + (Math.random() - 0.5) * (Bu.l - 0.4), dx = x - b.x, dz = Bu.z - 0.3 - b.z, d = Math.hypot(dx, dz) || 1;
    b.vx = dx / d * 8.5; b.vz = dz / d * 8.5; b.vy = 1.6 + Math.random(); j.porteur = -1; j.vers = -1; j.tireur = i; e.tir = 0.5; this.coup = true;
  }
  // Les billes : accroupis autour du tas, chacun son tour pousse sa bille du pouce ; elles roulent et s'arrêtent
  jeuBilles(j, prets, dt, t) {
    const Bi = this.E.billes, M = prets;
    j.t += dt;
    if (j.t > 2.6) { j.t = 0; j.tour++; const k = M.length ? j.tour % M.length : 0, e = M[k]; if (e) { const b = this.bil[3 + k]; b.x = e.p.pos.x + (Bi.x - e.p.pos.x) * 0.45; b.z = e.p.pos.z + (Bi.z - e.p.pos.z) * 0.45; b.vx = (Bi.x - b.x) * 1.6; b.vz = (Bi.z - b.z) * 1.6; } }
    for (let k = 0; k < M.length; k++) {
      const e = M[k];
      const J0 = e.J, ba = this.bil[3 + (j.tour % M.length)]; this.debout(e); J0.g = 'accroupi'; J0.v = 'billes';
      if (ba && ba.x < 1e3) { e.R.set(ba.x, 0.05, ba.z); e.p.regard = e.R; } // on suit des yeux la bille qui roule J0.k = k === j.tour % M.length ? lisse(Math.max(0, 1 - Math.abs(j.t - 0.25) * 4)) : 0; J0.mg = J0.md = null;
      e.p.jeu = J0; this.regarde(e, Bi.x, Bi.z, dt); e.p.update(dt, 0, 0, 0, false, LIBRE, t);
    }
    // les billes roulent
    for (let i = 0; i < 6; i++) {
      const b = this.bil[i]; if (i >= 3 && i - 3 >= M.length) { b.x = 1e4; continue; }
      if (b.x > 1e3) { const e = M[i - 3]; b.x = e.p.pos.x + (Bi.x - e.p.pos.x) * 0.45; b.z = e.p.pos.z + (Bi.z - e.p.pos.z) * 0.45; b.vx = b.vz = 0; }
      b.x += b.vx * dt; b.z += b.vz * dt; const f = Math.exp(-dt * 2.2); b.vx *= f; b.vz *= f;
      m4.makeTranslation(b.x, 0.065, b.z); this.billes.setMatrixAt(i, m4);
    }
    this.billes.instanceMatrix.needsUpdate = true;
  }
  // Le banc rond : assis tout autour du tilleul, on discute (on se tourne vers son voisin, une main parle), les jambes
  // se balancent
  banc(j, prets, dt, t) {
    const R = this.E.rond, M = prets;
    j.t += dt;
    const parleur = Math.floor(j.t / 3.2) % Math.max(1, M.length);
    for (let k = 0; k < M.length; k++) {
      const e = M[k];
      const a = e.rang * 0.9 + 0.3, x = R.x + Math.cos(a) * (R.r + 0.08), z = R.z + Math.sin(a) * (R.r + 0.08), h = Math.atan2(Math.cos(a), Math.sin(a));
      const J0 = e.J; J0.g = 'banc'; J0.parle = mix(J0.parle, k === parleur ? 1 : 0, Math.min(1, dt * 3)); J0.mg = J0.md = null;
      e.p.assis = true; e.p.siege = R.y; e.p.y0 = 0;
      e.m.groupe.position.set(x, 0, z); e.m.groupe.rotation.set(0, h, 0); e.m.groupe.quaternion.setFromEuler(e1.set(0, h, 0)); e.p.pos.set(x, 0, z);
      const o = M[(k + 1) % M.length] !== e ? M[(k + 1) % M.length] : null;
      if (o) { e.R.set(o.p.pos.x, 0.85, o.p.pos.z); e.p.regard = e.R; } else e.p.regard = null;
      e.p.jeu = J0; e.p.sync(dt, t);
    }
  }
  // Chat perché : le chat court après le plus proche qui n'est pas perché ; on se perche (la jardinière, le bord du
  // préau) ou l'on fuit ; attrapé, on devient le chat (il compte un instant, les mains sur les yeux)
  chat(j, prets, dt, t) {
    const Z = this.E.chat, M = prets, PER = this.E.perchoirs;
    if (M.length < 2) { for (const e of M) { e.p.jeu = null; e.p.update(dt, 0, 0, 0, false, LIBRE, t); } return; }
    const chat = M[j.chat % M.length];
    j.tC = Math.max(0, j.tC - dt);
    let proie = null, dmin = 1e9;
    for (const e of M) { if (e === chat || e.perche) continue; const d = Math.hypot(e.p.pos.x - chat.p.pos.x, e.p.pos.z - chat.p.pos.z); if (d < dmin) { dmin = d; proie = e; } }
    for (let i_e = 0; i_e < M.length; i_e++) {
      const e = M[i_e];
      const p = e.p; this.debout(e); p.jeu = null; e.J.mg = e.J.md = null;
      let x = p.pos.x, z = p.pos.z, vit = e.course;
      if (e === chat) {
        if (j.tC > 0) { p.update(dt, 0, 0, 0, false, LIBRE, t); e.J.g = 'debout'; e.J.MG[0] = 0.06; e.J.MG[1] = 1.55; e.J.MG[2] = 0.14; e.J.MD[0] = -0.06; e.J.MD[1] = 1.55; e.J.MD[2] = 0.14; e.J.mg = e.J.MG; e.J.md = e.J.MD; p.jeu = e.J; e.m.groupe.position.y = 0; continue; }
        if (proie) { x = proie.p.pos.x; z = proie.p.pos.z; if (dmin < 0.55) { j.chat = M.indexOf(proie); j.tC = 1.6; proie.perche = null; } }
        vit = e.course * 0.92;
      } else {
        const dc = Math.hypot(p.pos.x - chat.p.pos.x, p.pos.z - chat.p.pos.z);
        e.tP = (e.tP || 0) + dt;
        if (e.perche) { x = e.perche.x; z = e.perche.z; if (e.tP > 4 && dc > 2.5) { e.perche = null; e.tP = 0; } }
        else if (dc < 3.6 && j.tC <= 0) {
          // se percher sur le perchoir libre le plus proche, s'il est plus près que le chat ; sinon fuir
          let best = null, db = 1e9;
          for (const q of PER) { let pris = false; for (const o of M) if (o.perche === q) pris = true; if (pris) continue; const d = Math.hypot(q.x - p.pos.x, q.z - p.pos.z); if (d < db && d < dc + 0.5) { db = d; best = q; } }
          if (best) { e.perche = best; e.tP = 0; x = best.x; z = best.z; }
          else { const ux = (p.pos.x - chat.p.pos.x) / (dc || 1), uz = (p.pos.z - chat.p.pos.z) / (dc || 1); x = borne(p.pos.x + ux * 3, Z.x0, Z.x1); z = borne(p.pos.z + uz * 3, Z.z0, Z.z1); }
        } else { const P = this.place(e, P2); x = P.x; z = P.z; vit = e.course * 0.35; }
      }
      const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.1) p.update(dt, dx / d, dz / d, 1, false, LIBRE, t, Math.min(vit, d * 3));
      else { p.update(dt, 0, 0, 0, false, LIBRE, t); this.regarde(e, chat.p.pos.x, chat.p.pos.z, dt); }
      e.m.groupe.position.y = e.perche && d < 0.3 ? e.perche.y : 0;
    }
  }

  /* ---------------------------------------------------------------- les sons de la cour */
  sons(dt, c) {
    const ego = c.ego, E = this.E;
    const dx = Math.max(E.zone.x0 - ego.x, 0, ego.x - E.zone.x1), dz = Math.max(E.zone.z0 - ego.z, 0, ego.z - E.zone.z1), d = Math.hypot(dx, dz);
    const k = borne(1 - d / 70, 0, 1);
    if (this.sonner) { this.sonner = false; son.cloche(borne(1 - d / 160, 0, 1)); }
    if (k <= 0) { this.coup = false; return; }
    let n = 0; for (const e of this.enfants) if (e.phase === 'cour' && e.pret) n++;
    this.tSon -= dt;
    if (this.tSon <= 0 && n >= 2) { this.tSon = 0.28 + Math.random() * 0.3; son.recre(k * k, n); }
    if (this.coup) { this.coup = false; son.ballon(k); }
    if (this.jeux.corde && this.jeux.corde.claque) { this.jeux.corde.claque = false; son.corde(k); }
  }

  // les taches de contact ; vu(m, x, z) : main.js, ombrePerso (dessiné ou non selon la distance)
  taches(t, vu) {
    if (!this.vus) return;
    const cam = this.c.camera.position;
    for (const e of this.gens) {
      const g = e.m.groupe;
      if (!g.visible) continue;
      const x = g.position.x, z = g.position.z, r = e.genre === 'enfant' ? 0.28 : 0.4;
      if (vu(e.m, x, z)) t.poser(x, z, r, r, 0, Math.max(0, g.position.y - (e.p.assis ? 0.5 : 0)));
      if (e.genre === 'enfant' && e.m.maillage.castShadow && (x - cam.x) ** 2 + (z - cam.z) ** 2 > 144) e.m.maillage.castShadow = false;
    }
  }
}

// le cartable : sur le dos pour venir et repartir, posé en classe le reste du temps (l'os 16 à l'échelle 0)
function m_cartable(e, oui) {
  if (e.genre !== 'enfant' || e.cartable === oui) return;
  e.cartable = oui; e.m.os[OS.tel].scale.setScalar(oui ? 1 : 0.001);
}
