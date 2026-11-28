// Les visiteurs des portes ouvertes (mission 4, le jour J ; Teddy, 28/11/2026 : « le jour de la porte ouverte, il faut
// que l'ordinateur du bureau soit mis quelque part au niveau du parvis pour gérer la caisse [...] sur une dizaine de
// clients [...] ensuite, c'est son employé qui viendra la remplacer. Et toi, le joueur, tu iras faire déguster ton vin à
// différents invités »). Ils arrivent au domaine en voiture (elle apparaît garée sur une place du parking quand on ne la
// regarde pas) ou à pied par l'allée, passent le portail, flânent dans la cour, regardent le vieux chêne, goûtent au bar
// de dégustation (ils y restent un moment), se servent au buffet, font la queue à la caisse et repartent (la voiture
// disparaît hors de la vue). Des couples, des amis, des familles avec leurs enfants, de tous âges et de toutes
// apparences (perso.js : tirerApparence, en hiver). L'implantation : monde.js, lieux.portes (la caisse et sa file, le
// bar, le buffet, la sono, l'entrée, le parking des visiteurs).
// L'interface avec la mission (mission4.js) :
// - ouvrir(plein) : les portes ouvrent (10 h), les visiteurs commencent à arriver (plein : la cour déjà remplie, derrière
//   un fondu : une partie reprise) ; fermer() : c'est fini, ils repartent tous ; la nuit, plus personne ;
// - ouvrirCaisse() : la file de la caisse se forme ; les dix clients de PORTES.clients s'y présentent dans l'ordre, chacun
//   à son apparence (fem, coul) et avec les siens (un couple, une famille) ; comptoir : le visiteur arrivé devant la caisse
//   (sa fiche : comptoir.def), ou null ; il dit bonjour ; servi(ticket) : son ticket est fait, il s'en va avec ses achats
//   (un sac, un coffret ou des cartons), le suivant avance ;
// - releve() : Marc tient la caisse (mission4.js le mène) ; des visiteurs passent chez lui, attendent quelques secondes et
//   repartent servis ; nServis repart de zéro ;
// - candidats(f) : ceux qu'on peut servir au bar de dégustation (verres.js : f(personne, portée)) et ceux qui boivent leur
//   verre ; nServis : combien ont eu leur verre (depuis la relève) ; jamais un enfant ;
// - maj(dt, E) à chaque image (main.js : bourg ; E = { t, minutes, ego, joueur, aPied, danger, pousser }) ;
//   taches(t, vu) : leurs ombres de contact, et celles de leurs voitures ; positions(f) : où ils sont (f(x, z, r)).
// Légèreté : rien de calculé tant que les portes ne sont pas ouvertes (et qu'il ne reste personne) ; les personnages créés
// en étapes (perso.js : persoPas, une étape par image) quand la caméra approche de la cour ; animés de près, une image sur
// deux ou trois plus loin, figés au loin ; une grille de marche de la cour (les boîtes du décor) et un champ de distance
// par endroit où l'on va, calculés une fois (un par image) ; pas d'allocation par image.
import * as THREE from 'three';
import { persoPas, tirerApparence, OS } from './perso.js';
import { Pieton } from './pieton.js';
import { voiture } from './engins.js';
import { pileCartons } from './gestes.js';
import { B, fusion, MAT } from './modeles.js';
import { son } from './audio.js';
import { PORTES as P, PORTES_VISITEURS as TX } from './textes.js';
import { hasard, borne, heureDe } from './outils.js';
import { sol } from './relief.js';

const CHENE = { x: -99.5, z: -46.5 };    // l'arbre centenaire au milieu de la cour (monde.js)
const SORTIE = { x: -90.6, z: 2.5 };     // l'allée du domaine, au bord de la départementale : qui vient et repart à pied
const ARRIVEES = [[-90.3, -19], [-89.5, -12], [-90.9, -5], [-90.6, 2.5]]; // où apparaît qui vient à pied (du plus proche du portail au plus loin)
const COUR = { x: -92, z: -45 };         // le milieu de la cour (distances de la caméra, du son)
const GRILLE = { x0: -117, z0: -67, x1: -73, z1: 6, pas: 0.4, marge: 0.3 }; // la grille de marche : la cour, l'allée, le parking
const POP = 20;                          // une vingtaine de visiteurs à la fois, au plus
const FIGE = 160;                        // plus loin (la caméra, du milieu de la cour), tout s'arrête : de si loin, on ne les voit pas
const CREER = 230;                       // les personnages sont créés quand la caméra est à moins de 230 m de la cour
const PRES = 25, MOYEN = 60;             // animés à chaque image de près, une image sur deux, puis sur trois
const ADULTE_R = 0.34, ENFANT_R = 0.26;
const PORT = [0, 0.95, 0.36];            // les cartons dans les bras (gestes.js : PORT)
// les groupes de visiteurs, en plus des dix clients : adultes, enfants
const GROUPES = [[2, 0], [2, 2], [1, 0], [3, 0], [2, 0], [1, 1], [2, 0], [1, 0], [2, 0]];
// qui accompagne chaque client (PORTES.clients, id) : 'f' une femme, 'h' un homme, un nombre : un enfant de cet âge
const AVEC = { robin: ['f'], diallo: ['f', 5, 8], karim: ['f'] };
// les couleurs des vêtements (sous le manteau ou la doudoune que tire tirerApparence)
const HAUTS = ['#c0392b', '#2e86de', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400', '#7f8c8d', '#e84393', '#34495e', '#f1ece2'];
const BAS = ['#2c3e50', '#34495e', '#5d4037', '#455a64', '#1e272e', '#6d4c41', '#8a7f6a'];
const DOUDOUNES = ['#e74c3c', '#f1c40f', '#3498db', '#e84393', '#1abc9c', '#9b59b6', '#ff7f50', '#27ae60', '#5dade2', '#ff6fa8'];
const LAINES = ['#f1c40f', '#e74c3c', '#ecf0f1', '#9b59b6', '#3498db', '#e84393', '#27ae60', '#ff7f50'];
// les voitures des visiteurs : des couleurs déjà garées ailleurs (monde.js, lieux.garees), leur modèle est déjà construit
const COULEURS = ['#8a3a32', '#2f4a6b', '#e9e6de', '#6c8f4e', '#c9cdd2', '#1f2a3a', '#d8cfa6', '#5c6f8a'];
const VINS = new Set(P.produits.filter(p => ['rouges', 'blancs', 'bulles'].includes(p.famille)).map(p => p.id));
const V = new THREE.Vector3(), VU = new THREE.Vector3();

// L'implantation des portes ouvertes (monde.js) : lieux.portes, ou l'objet de lieux qui a la caisse, le bar et le buffet
// (le nom peut changer : lieux.portes sert aussi aux portes des boutiques des clients)
function implantation(L) {
  if (L.portes && L.portes.caisse && L.portes.bar) return L.portes;
  for (const k in L) { const o = L[k]; if (o && typeof o === 'object' && o.caisse && o.bar && o.buffet && o.parking) return o; }
  return null;
}

/* ---------------------------------------------------------------- les achats qu'on emporte
   Le sac de papier kraft et le coffret de Noël sont tenus dans la main droite (enfants de l'os de la main, comme la
   cigarette de perso.js : ils suivent le bras qui balance) ; les cartons (six bouteilles ou plus), dans les bras (anim.js :
   p.porte, comme la pile de gestes.js). Géométries partagées, créées au premier achat. */
let geoSac = null, geoCoffret = null;
function sac() {
  return geoSac || (geoSac = fusion([B(0.11, 0.3, 0.25, '#b98a55', 0, -0.3, 0.02), B(0.112, 0.014, 0.252, '#a07444', 0, -0.158, 0.02),
    B(0.012, 0.07, 0.012, '#7a5530', 0, -0.12, 0.08), B(0.012, 0.07, 0.012, '#7a5530', 0, -0.12, -0.04), B(0.112, 0.07, 0.09, '#7a2233', 0, -0.3, 0.02)]));
}
function coffret() {
  return geoCoffret || (geoCoffret = fusion([B(0.12, 0.34, 0.27, '#5e2530', 0, -0.33, 0.02), B(0.122, 0.035, 0.272, '#c9a55a', 0, -0.25, 0.02),
    B(0.03, 0.08, 0.03, '#c9a55a', 0, -0.12, 0.02), B(0.06, 0.012, 0.012, '#c9a55a', 0, -0.155, 0.02)]));
}

/* ---------------------------------------------------------------- la grille de marche de la cour
   La cour, l'allée et le parking en cases de 40 cm ; ce qui arrête (les boîtes du décor : murs, murets, le chêne, les
   tables de l'événement, sauf les voitures des visiteurs) grossi d'un peu moins que la largeur d'une personne. Pour chaque
   endroit où l'on va (une place au bar, la file, une voiture...), un champ de distance (Dijkstra, huit voisins, sans couper
   les coins), calculé une fois : on y marche en descendant le champ, en visant deux mètres devant. Rien d'écrit en dur :
   une table déplacée, le chemin suit. */
class Grille {
  constructor(col, exclues) {
    const G = GRILLE, p = G.pas;
    this.x0 = G.x0; this.z0 = G.z0; this.p = p; this.nx = Math.ceil((G.x1 - G.x0) / p); this.nz = Math.ceil((G.z1 - G.z0) / p);
    this.n = this.nx * this.nz; this.b = new Uint8Array(this.n);
    const vues = new Set();
    for (let ix = Math.floor(G.x0 / 8); ix <= Math.floor(G.x1 / 8); ix++) for (let iz = Math.floor(G.z0 / 8); iz <= Math.floor(G.z1 / 8); iz++) {
      const l = col.cases.get(col.cle(ix, iz));
      if (l) for (const b of l) if (!vues.has(b)) { vues.add(b); if (!b.fantome && !exclues.has(b)) this.marquer(b, G.marge); }
    }
    // (le tas de la recherche : gardé d'un champ à l'autre)
    this.tasK = new Int32Array(this.n * 6); this.tasD = new Uint16Array(this.n * 6);
  }
  marquer(b, m) {
    const p = this.p, i0 = Math.max(0, Math.floor((b.x0 - m - this.x0) / p)), i1 = Math.min(this.nx - 1, Math.floor((b.x1 + m - this.x0) / p));
    const j0 = Math.max(0, Math.floor((b.z0 - m - this.z0) / p)), j1 = Math.min(this.nz - 1, Math.floor((b.z1 + m - this.z0) / p));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const cx = this.x0 + (i + 0.5) * p, cz = this.z0 + (j + 0.5) * p;
      let dedans;
      if (b.o) { const o = b.o, dx = cx - o.cx, dz = cz - o.cz; dedans = Math.abs(dx * o.co - dz * o.si) < o.hw + m && Math.abs(dx * o.si + dz * o.co) < o.hd + m; }
      else dedans = cx > b.x0 - m && cx < b.x1 + m && cz > b.z0 - m && cz < b.z1 + m;
      if (dedans) this.b[j * this.nx + i] = 1;
    }
  }
  case(x, z) { const i = Math.floor((x - this.x0) / this.p), j = Math.floor((z - this.z0) / this.p); return i < 0 || j < 0 || i >= this.nx || j >= this.nz ? -1 : j * this.nx + i; }
  libre(k) { return k >= 0 && this.b[k] === 0; }
  cx(k) { return this.x0 + (k % this.nx + 0.5) * this.p; }
  cz(k) { return this.z0 + (Math.floor(k / this.nx) + 0.5) * this.p; }
  // la case libre la plus proche de (x, z), en anneaux jusqu'à 2,4 m : son numéro, ou -1
  proche(x, z) {
    const i0 = Math.floor((x - this.x0) / this.p), j0 = Math.floor((z - this.z0) / this.p);
    for (let r = 0; r < 7; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = i0 + di, j = j0 + dj;
      if (i >= 0 && j >= 0 && i < this.nx && j < this.nz && this.b[j * this.nx + i] === 0) return j * this.nx + i;
    }
    return -1;
  }
  // Le champ de distance jusqu'à la case k0 (2 par pas droit, 3 en diagonale), calculé par tranches : lancer, puis
  // avancer(C, n) à chaque image (n cases de plus) jusqu'à ce qu'il rende vrai. Toute la cour d'un coup coûte 1,5 à
  // 2,5 ms (6 à 10 ms au processeur ralenti quatre fois) : par tranches de 2 500 cases, 0,3 ms par image. Un seul à la fois
  // (le tas est celui de la grille).
  lancer(k0) {
    const f = new Uint16Array(this.n).fill(65535);
    f[k0] = 0; this.tasK[0] = k0; this.tasD[0] = 0;
    return { f, m: 1 };
  }
  avancer(C, budget) {
    const nx = this.nx, nz = this.nz, b = this.b, f = C.f, K = this.tasK, D = this.tasD, max = K.length;
    let m = C.m;
    while (m > 0 && budget-- > 0) {
      const k = K[0], d = D[0], lk = K[--m], ld = D[m];
      let i = 0;
      for (;;) { let c = 2 * i + 1; if (c >= m) break; if (c + 1 < m && D[c + 1] < D[c]) c++; if (D[c] >= ld) break; K[i] = K[c]; D[i] = D[c]; i = c; }
      K[i] = lk; D[i] = ld;
      if (d > f[k]) continue;
      const ci = k % nx, cj = (k - ci) / nx;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i2 = ci + di, j2 = cj + dj;
        if (i2 < 0 || j2 < 0 || i2 >= nx || j2 >= nz) continue;
        const k2 = j2 * nx + i2;
        if (b[k2]) continue;
        if (di && dj && (b[cj * nx + i2] || b[j2 * nx + ci])) continue; // (sans couper les coins)
        const d2 = d + (di && dj ? 3 : 2);
        if (d2 < f[k2] && m < max) {
          f[k2] = d2;
          let j = m++;
          while (j > 0) { const pa = (j - 1) >> 1; if (D[pa] <= d2) break; K[j] = K[pa]; D[j] = D[pa]; j = pa; }
          K[j] = k2; D[j] = d2;
        }
      }
    }
    C.m = m;
    return m === 0;
  }
  // tout d'un coup (essais)
  champ(k0) { const C = this.lancer(k0); this.avancer(C, 1e9); return C.f; }
  // la case voisine qui descend le plus le champ f (k si aucune ne descend)
  descente(k, f) {
    const nx = this.nx, ci = k % nx, cj = (k - ci) / nx, b = this.b;
    let best = k, bv = f[k];
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const i2 = ci + di, j2 = cj + dj;
      if (i2 < 0 || j2 < 0 || i2 >= nx || j2 >= this.nz) continue;
      const k2 = j2 * nx + i2;
      if (b[k2] || (di && dj && (b[cj * nx + i2] || b[j2 * nx + ci]))) continue;
      if (f[k2] < bv) { bv = f[k2]; best = k2; }
    }
    return best;
  }
}

/* ---------------------------------------------------------------- les visiteurs */
export class Visiteurs {
  // c : { jeu, scene, camera, col, hud, son, lieux }
  constructor(c) {
    this.c = c;
    this.actif = false;     // les portes sont ouvertes (des visiteurs dans la cour)
    this.comptoir = null;   // le visiteur devant la caisse
    this.nServis = 0;       // verres servis au bar de dégustation (depuis la relève)
    this.marc = false;      // Marc tient la caisse
    this.L = null;          // l'implantation (monde.js : lieux.portes), trouvée à la première ouverture
    this.gens = [];         // tous les visiteurs (leur personnage créé en approchant)
    this.groupes = [];      // les groupes : les visiteurs, puis les dix clients
    this.clients = [];      // les dix groupes des clients de la caisse, dans l'ordre de PORTES.clients
    this.file = [];         // la file de la caisse : file[0] au comptoir
    this.places = [];       // le parking : chaque place et sa voiture
    this.spots = [];        // les endroits où l'on va
    this.grille = null; this.nBoites = -1; this.mesBoites = new Set();
    this.aCreer = []; this.enCreation = null; this.aChamp = []; this.calcul = null;
    this.caisse = false;    // la file de la caisse est ouverte
    this.iCaisse = 0;       // le rang du client attendu au comptoir (PORTES.clients)
    this.prochain = 0;      // le prochain client à prendre la file
    this.nMarc = 0;         // les visiteurs servis par Marc, après la relève
    this.tArrivee = 0; this.tClient = 0; this.nArrivees = 0; this.presents = 0; this.mPrec = null; this.n = 0;
    this.tSon = 0; this.tFoule = 0; this.tParle = 0; this.rnd = hasard(4404);
    this.bulles = [];       // quelques bulles partagées (une étiquette chacune) : qui parle
  }

  /* ------------------------------------------------------------ l'interface */
  ouvrir(plein = false) {
    if (!this.preparer()) return;
    this.actif = true; this.mPrec = null;
    if (plein) this.remplir();
  }
  fermer() {
    this.actif = false; this.caisse = false; this.comptoir = null;
    for (const v of this.file) v.enFile = false;
    this.file.length = 0;
    for (const g of this.groupes) if (g.etat === 'cour' || g.etat === 'file') this.partir(g);
  }
  ouvrirCaisse() {
    if (!this.actif) this.ouvrir();
    if (!this.L) return;
    this.caisse = true;
    // (une partie reprise : les clients déjà servis ne reviennent pas)
    const i = this.c.jeu.portes?.caisse?.i || 0;
    while (this.iCaisse < i && this.iCaisse < this.clients.length) this.servi(null);
    if (this.prochain < this.iCaisse) this.prochain = this.iCaisse;
  }
  // le ticket du client au comptoir est fait (mission4.js : encaisser) : il part avec ses achats, le suivant avance
  servi(ticket) {
    const g = this.clients[this.iCaisse];
    this.comptoir = null;
    if (!g) { if (this.file[0]) this.serviMarc(this.file[0]); return; }
    this.iCaisse++;
    g.fini = true;
    if (this.prochain < this.iCaisse) this.prochain = this.iCaisse;
    const v = g.chef, k = this.file.indexOf(v);
    if (k >= 0) { this.file.splice(k, 1); v.enFile = false; this.ranger(); }
    if (g.etat === 'cour' || g.etat === 'file') {
      this.emporter(v, g.def.achats);
      if (ticket !== null) this.dire(v, this.choix(TX.merci), 2.4);
      this.partir(g);
    }
  }
  releve() { this.marc = true; this.nServis = 0; }
  // verres.js : ceux qu'on peut servir au bar de dégustation, et ceux qui boivent leur verre
  candidats(f) {
    for (let i = 0; i < this.gens.length; i++) { const v = this.gens[i], p = v.p; if (p && v.present && (p.servable || p.verre > 0)) f(p, 2.4); }
  }
  // où ils sont (le chien ne les traverse pas : main.js peut les lui passer, chien.js gens)
  positions(f) { for (const v of this.gens) if (v.present) f(v.p.pos.x, v.p.pos.z, v.r); }

  /* ------------------------------------------------------------ la mise en place (une fois) */
  preparer() {
    if (this.L) return true;
    const L = implantation(this.c.lieux);
    if (!L) return false;
    this.L = L;
    const S = (sorte, x, z, h, rx, ry, rz) => { const s = { id: this.spots.length, sorte, x, z, x0: x, z0: z, h, regard: rx === undefined ? null : new THREE.Vector3(rx, ry, rz), f: null, k: -1, pris: null, demande: false }; this.spots.push(s); return s; };
    const vers = (x, z, ax, az) => Math.atan2(ax - x, az - z);
    // le bar de dégustation et le buffet : leurs places, tournées vers la table
    this.bar = L.bar.places.map(([x, z]) => S('bar', x, z, vers(x, z, L.bar.x, L.bar.z), L.bar.x, 1.0, L.bar.z));
    this.buffet = L.buffet.places.map(([x, z]) => S('buffet', x, z, vers(x, z, L.buffet.x, L.buffet.z), L.buffet.x, 0.9, L.buffet.z));
    // autour du vieux chêne (sur la bordure de son rond d'herbe), le nez en l'air
    this.chene = [0.2, 0.7, 1.75, 2.85, 3.45, 4.55, 5.25].map(a => { const x = CHENE.x + Math.cos(a) * 5.2, z = CHENE.z + Math.sin(a) * 5.2; return S('chene', x, z, vers(x, z, CHENE.x, CHENE.z), CHENE.x, 7.5, CHENE.z); });
    // ce qu'on regarde en flânant : l'arche du portail, les barriques du chai, la sono, la maison, le vieux pressoir, la
    // grande porte du chai, les vignes par-dessus le muret ; le milieu de la cour (on regarde autour de soi)
    const so = L.sono;
    this.flane = [
      S('flane', -88.6, -37.6, vers(-88.6, -37.6, -90, -33.5), -90, 5.6, -33.5), S('flane', -81.8, -42.6, vers(-81.8, -42.6, -77, -44.5), -77, 1.0, -44.5),
      S('flane', so.x + 2.0, so.z - 2.2, vers(so.x + 2.0, so.z - 2.2, so.x, so.z), so.x, 1.0, so.z), S('flane', -97.8, -54.2, vers(-97.8, -54.2, -100, -60), -100, 4.5, -60),
      S('flane', -102.9, -51.6, vers(-102.9, -51.6, -104.8, -53), -104.8, 1.0, -53), S('flane', -78.6, -51.0, vers(-78.6, -51.0, -70, -51.5), -70, 1.5, -51.5),
      S('flane', -96.5, -36.0, Math.PI, -96.5, 1.5, -20), S('flane', -89.5, -45.5, 0),
    ];
    // la file de la caisse, tournée vers le comptoir
    const ca = L.caisse;
    this.slots = ca.file.map(([x, z], j) => { const a = j ? ca.file[j - 1] : [ca.x, ca.z]; return S('file', x, z, vers(x, z, a[0], a[1])); });
    this.sortie = S('sortie', SORTIE.x, SORTIE.z, 0);
    // le parking : une voiture par place (cachée, sa boîte de collision fantôme tant qu'elle n'est pas là) ; où l'on monte
    // dedans : sur le côté tourné vers le portail, ou au bout si une voiture voisine est trop près
    const autres = [...L.parking.map(([x, z, h]) => [x, z, h]), ...(this.c.lieux.garees || []).map(([x, z, h]) => [x, z, h])];
    const pres = (x, z, sauf) => autres.some(([ax, az, ah]) => {
      if (ax === sauf[0] && az === sauf[1]) return false;
      const t = Math.abs(Math.sin(ah)) > 0.5, hx = (t ? 3.9 : 1.75) / 2, hz = (t ? 1.75 : 3.9) / 2;
      return Math.hypot(Math.max(0, Math.abs(x - ax) - hx), Math.max(0, Math.abs(z - az) - hz)) < 1.1;
    });
    L.parking.forEach(([x, z, h], k) => {
      const t = Math.abs(Math.sin(h)) > 0.5, e = L.entree;
      let px, pz;
      if (!t) { px = x + Math.sign(e.x - x) * 1.6; pz = z; } else { px = x; pz = z + Math.sign(e.z - z) * 1.6; }
      if (pres(px, pz, [x, z])) { if (!t) { px = x; pz = z + Math.sign(e.z - z) * 2.8; } else { px = x + Math.sign(e.x - x) * 2.8; pz = z; } }
      const b = this.c.col.boiteC(x, z, t ? 3.9 : 1.75, t ? 1.75 : 3.9); b.haut = false; b.fantome = true; this.mesBoites.add(b);
      this.places.push({ k, x, z, h, m: null, boite: b, g: null, spot: S('park', px, pz, vers(px, pz, x, z)) });
    });
    // les visiteurs : les groupes, les clients ; leur apparence tirée d'avance (créés en approchant)
    const generaux = GROUPES.map(([a, e], i) => this.groupe(null, -1, a, e, hasard(7100 + i * 37)));
    P.clients.forEach((def, k) => this.clients.push(this.groupe(def, k, 1, 0, hasard(8200 + k * 53))));
    // l'ordre de création : les premiers arrivés d'abord (un client, un groupe, ...)
    for (let i = 0; i < Math.max(generaux.length, this.clients.length); i++) for (const g of [this.clients[i], generaux[i]]) if (g) for (const v of g.membres) this.aCreer.push(v);
    // les bulles : quatre étiquettes partagées
    for (let i = 0; i < 4; i++) this.bulles.push({ o: this.c.hud.etiquette('', 'bulle'), v: null });
    return true;
  }
  // un groupe : def (un client de la caisse) ou null, a adultes, e enfants ; r : son tirage au sort (l'apparence)
  groupe(def, k, a, e, r) {
    const g = { id: this.groupes.length, def, k, membres: [], chef: null, etat: 'absent', act: null, spot: null, tAct: 0, tTotal: 0, voiture: -1, programme: 0,
      tRetour: 0, fini: false, caisse: false, dit: false, bar: false };
    const pk = l => l[Math.floor(r() * l.length)];
    const adulte = (femme, age, profil, coul) => {
      const ap = tirerApparence(r, { femme, hiver: true, age, profil, canne: false });
      const o = { haut: pk(HAUTS), bas: pk(BAS), ...ap };
      if (coul) o.haut = coul;
      return this.membre(g, o, false, ap);
    };
    const enfant = (age, parent) => {
      const ap = tirerApparence(r, { enfant: true, hiver: true, profil: parent.ap.profil, teint: parent.ap.teint + Math.floor(r() * 3) - 1 }), doud = pk(DOUDOUNES), sorte = r();
      const o = { ...ap, age, hauteur: 0.95 + (age - 3) * 0.0625 + (r() - 0.5) * 0.05, tenue: sorte < 0.7 ? 'veste' : 'pull', haut: doud, matelasse: true, col: doud, manches: pk(LAINES),
        capuche: sorte < 0.7 && r() < 0.5, bas: pk(BAS), tissuBas: r() < 0.6 ? 'jean' : 'velours', collant: pk(['#e84393', '#2c3e50', '#8e44ad']), chaussures: pk(['#e74c3c', '#2c3e50', '#f4f1ea', '#3498db', '#2b2b30']),
        bottes: r() < 0.2, chapeau: ap.chapeau || 'aucun', chapeauC: ap.chapeauC || pk(LAINES), pompon: pk(LAINES), echarpe: r() < 0.5 ? pk(LAINES) : null,
        corpulence: 0.95 + r() * 0.12, epaules: 0.92, hanches: 1, carreaux: false, imprime: false, lunettes: !!ap.lunettes };
      return this.membre(g, o, true, ap);
    };
    if (def) {
      // le client de la caisse : à son apparence (fem, coul) ; ceux qui l'accompagnent (même âge, souvent même famille)
      const chef = adulte(!!def.fem, r() < 0.3 ? 'jeune' : r() < 0.6 ? 'adulte' : 'aine', undefined, def.coul);
      for (const q of AVEC[def.id] || []) { if (typeof q === 'number') enfant(q, chef); else adulte(q === 'f', chef.ap.age, r() < 0.7 ? chef.ap.profil : undefined); }
    } else {
      // un couple (le plus souvent un homme et une femme, du même âge), des amis, quelqu'un seul ; avec des enfants, des
      // parents jeunes ou d'âge moyen
      const f0 = r() < 0.5, age = e ? (r() < 0.5 ? 'jeune' : 'adulte') : r() < 0.3 ? 'jeune' : r() < 0.65 ? 'adulte' : 'aine';
      const chef = adulte(f0, age);
      for (let i = 1; i < a; i++) adulte(i === 1 && r() < 0.85 ? !f0 : r() < 0.5, a === 2 || e ? age : undefined, e && r() < 0.6 ? chef.ap.profil : undefined);
      for (let i = 0; i < e; i++) enfant(4 + Math.floor(r() * 8), chef);
    }
    g.chef = g.membres[0]; g.chef.def = def;
    this.groupes.push(g);
    return g;
  }
  membre(g, o, enfant, ap) {
    const v = { i: this.gens.length, g, def: null, o, ap, enfant, p: null, present: false, r: enfant ? ENFANT_R : ADULTE_R,
      allure: enfant ? 1.3 : ap.age === 'aine' ? 0.85 : ap.age === 'jeune' ? 1.3 : 1.15, haut: enfant ? 1.55 : 2.25,
      etat: 'repos', spot: null, tx: 0, tz: 0, th: 0, regard: null, place: null, enFile: false, servi: false, tRep: 0, salue: false, dit: false,
      dtA: 0, tBloque: 0, dBest: 1e9, tProche: 0, tCote: 0, cx: 0, cz: 0, accessoire: null, pile: null, bul: null, tMarc: 0, parent: null };
    if (enfant) v.parent = g.membres.find(m => !m.enfant) || null;
    g.membres.push(v); this.gens.push(v);
    return v;
  }
  // la grille de marche, refaite si le décor a changé (une table posée, retirée : la mission installe l'événement) ; un
  // endroit où l'on ne peut pas se tenir (une table posée dessus) glisse à la case libre la plus proche
  majGrille() {
    const n = this.c.col.boites.length;
    if (this.grille && n === this.nBoites) return;
    this.nBoites = n;
    const G = this.grille = new Grille(this.c.col, this.mesBoites);
    for (const s of this.spots) {
      s.f = null; s.demande = false; s.k = G.proche(s.x0, s.z0);
      if (s.k >= 0 && !G.libre(G.case(s.x0, s.z0))) { s.x = G.cx(s.k); s.z = G.cz(s.k); } else { s.x = s.x0; s.z = s.z0; }
    }
    this.aChamp.length = 0; this.calcul = null;
  }

  /* ------------------------------------------------------------ créer, montrer, cacher */
  // une étape de création par image (persoPas) ; fini : tout d'un coup (quelqu'un qui doit être là maintenant)
  creer(v, fini) {
    if (v.p) return true;
    if (!this.enCreation || this.enCreation.v !== v) {
      if (fini && this.enCreation) { const e = this.enCreation; let r = e.it.next(); while (!r.done) r = e.it.next(); this.finCreation(e.v, r.value); }
      this.enCreation = { v, it: persoPas(v.o) };
    }
    const e = this.enCreation;
    let r = e.it.next();
    while (fini && !r.done) r = e.it.next();
    if (!r.done) return false;
    this.finCreation(v, r.value);
    return true;
  }
  // créer d'abord ceux de ce groupe (un client attendu à la caisse)
  prioriser(g) {
    for (let i = g.membres.length - 1; i >= 0; i--) { const v = g.membres[i], k = this.aCreer.indexOf(v); if (k > 0) { this.aCreer.splice(k, 1); this.aCreer.unshift(v); } }
  }
  finCreation(v, m) {
    this.enCreation = null;
    const p = v.p = new Pieton(m);
    p.r = v.r; m.groupe.visible = false;
    p.surServi = () => this.surServi(v);
    this.c.scene.add(m.groupe);
    const k = this.aCreer.indexOf(v); if (k >= 0) this.aCreer.splice(k, 1);
  }
  montrer(v, x, z, h) {
    this.creer(v, true);
    const p = v.p;
    p.placer(x, z, h); p.m.groupe.visible = true; p.servable = false; p.verre = 0; p.aServir = false; p.regard = null; p.salut = false;
    v.present = true; v.etat = 'repos'; v.servi = false; v.salue = false; v.dit = false; v.tBloque = 0; v.dBest = 1e9; v.tCote = 0; v.tMarc = 0;
    v.tx = x; v.tz = z; v.th = h;
    this.presents++;
  }
  cacher(v) {
    if (!v.present) return;
    const p = v.p;
    p.m.groupe.visible = false; p.servable = false; p.porte = null; p.regard = null;
    if (v.accessoire) v.accessoire.visible = false;
    if (v.pile) v.pile.visible = false;
    if (v.place) { v.place.pris = null; v.place = null; }
    if (v.enFile) { const k = this.file.indexOf(v); if (k >= 0) this.file.splice(k, 1); v.enFile = false; this.ranger(); }
    if (this.comptoir === v) this.comptoir = null;
    for (const b of this.bulles) if (b.v === v) { b.v = null; b.o.t = 0; b.o.vu = false; }
    v.present = false;
    this.presents--;
  }
  // le point (x, z) est-il sous les yeux de la caméra ? (ils arrivent et repartent hors de la vue)
  vu(x, z) {
    const cam = this.c.camera, dx = x - cam.position.x, dz = z - cam.position.z, d = Math.hypot(dx, dz);
    if (d > 80) return false;
    if (d < 8) return true;
    cam.getWorldDirection(VU);
    return (dx * VU.x + dz * VU.z) / d > 0.35;
  }
  // une voiture garée apparaît (ou disparaît) sur sa place ; sa boîte de collision avec elle. Son modèle (engins.js, une
  // couleur déjà garée ailleurs : sa géométrie est déjà construite), créé la première fois, immobile (sa matrice une fois)
  garer(pl, on) {
    if (on && !pl.m) {
      const m = pl.m = voiture(COULEURS[pl.k % COULEURS.length]);
      m.position.set(pl.x, sol(pl.x, pl.z), pl.z); m.rotation.y = pl.h; m.receiveShadow = true; m.name = 'voiture de visiteur';
      m.matrixAutoUpdate = false; m.updateMatrix();
      this.c.scene.add(m);
    }
    if (pl.m) pl.m.visible = on;
    pl.boite.fantome = !on;
    if (!on) pl.g = null;
  }
  // la place est-elle libre ? (personne, aucun véhicule du joueur, pas sous les yeux)
  placeLibre(pl) {
    if (pl.g || this.vu(pl.x, pl.z) || this.vu(pl.spot.x, pl.spot.z)) return false;
    const j = this.c.jeu.joueur.pos;
    if (Math.hypot(j.x - pl.x, j.z - pl.z) < 3.5) return false;
    for (const ve of this.c.jeu.vehicules || []) if (Math.hypot(ve.p.pos.x - pl.x, ve.p.pos.z - pl.z) < 5) return false;
    return true;
  }

  /* ------------------------------------------------------------ arriver, choisir, repartir */
  // le groupe arrive : en voiture (une place libre, hors de la vue) ou à pied par l'allée ; forcer : même sous les yeux
  arriver(g, forcer = false) {
    let pl = null, sx = 0, sz = 0;
    if (g.membres.length > 1 || this.rnd() < 0.6) for (const q of this.places) if (this.placeLibre(q)) { pl = q; break; }
    if (pl) { sx = pl.spot.x; sz = pl.spot.z; }
    else {
      const a = ARRIVEES.find(([x, z]) => !this.vu(x, z));
      if (a) { sx = a[0]; sz = a[1]; } else if (forcer) { sx = SORTIE.x; sz = SORTIE.z; } else return false;
    }
    for (const v of g.membres) this.creer(v, true);
    if (pl) { this.garer(pl, true); pl.g = g; g.voiture = pl.k; } else g.voiture = -1;
    // (côte à côte, face à la cour)
    const h = Math.atan2(COUR.x - sx, COUR.z - sz), n = g.membres.length;
    g.membres.forEach((v, i) => { const o = (i - (n - 1) / 2) * 0.7; this.montrer(v, sx + Math.cos(h) * o, sz - Math.sin(h) * o, h); });
    g.etat = 'cour'; g.act = null; g.programme = 2 + Math.floor(this.rnd() * 3); g.dit = false; g.caisse = false; g.tTotal = 0;
    this.nArrivees++;
    return true;
  }
  // la cour déjà remplie (une partie reprise, derrière un fondu) : des groupes posés à leur activité
  remplir() {
    this.majGrille();
    let n = 0;
    for (const g of this.groupes) {
      if (g.def || g.etat !== 'absent' || n + g.membres.length > POP * 0.7) continue;
      for (const v of g.membres) this.creer(v, true);
      const pl = this.places.find(q => !q.g && !this.c.jeu.vehicules?.some(ve => Math.hypot(ve.p.pos.x - q.x, ve.p.pos.z - q.z) < 5));
      if (pl && this.rnd() < 0.7) { this.garer(pl, true); pl.g = g; g.voiture = pl.k; } else g.voiture = -1;
      g.etat = 'cour'; g.act = null; g.programme = 2 + Math.floor(this.rnd() * 3); g.caisse = false; g.tTotal = 0;
      for (const v of g.membres) this.montrer(v, COUR.x, COUR.z, 0);
      this.choisir(g, true);
      n += g.membres.length;
    }
  }
  // l'activité suivante du groupe : le bar, le buffet, le chêne, flâner ; ou repartir (passer à la caisse avant, chez Marc)
  choisir(g, poser = false) {
    this.liberer(g);
    if (!g.def && g.programme <= 0) {
      if (this.marc && !g.caisse && this.rnd() < 0.6 && this.file.length < this.slots.length && this.prochain >= this.clients.length) { g.caisse = true; this.enFile(g); return; }
      this.partir(g); return;
    }
    g.programme--;
    const adultes = g.membres.filter(v => !v.enfant), degust = this.c.jeu.portes?.etape === 'degustation';
    const libresBar = this.bar.filter(s => !s.pris).length, libresBuf = this.buffet.filter(s => !s.pris).length;
    const poids = [
      ['bar', libresBar >= adultes.length && g.act !== 'bar' ? (degust ? 7 : 3) : 0],
      ['buffet', libresBuf >= 1 && g.act !== 'buffet' ? 2 : 0],
      ['chene', g.act !== 'chene' && this.chene.some(s => !s.pris) ? 2 : 0],
      ['flane', this.flane.some(s => !s.pris) ? 2 : 0],
    ];
    let tot = 0; for (const [, w] of poids) tot += w;
    let x = this.rnd() * tot, act = 'flane';
    for (const [k, w] of poids) { x -= w; if (x < 0 && w > 0) { act = k; break; } }
    g.act = act; g.bar = act === 'bar';
    if (act === 'bar' || act === 'buffet') {
      // chacun sa place, la plus proche de celle du premier ; les enfants près d'un parent, un pas en arrière ; sans place
      // (le buffet plein), derrière le premier
      const L = act === 'bar' ? this.bar : this.buffet, t = act === 'bar' ? this.L.bar : this.L.buffet;
      let s0 = null;
      for (const v of adultes) {
        let best = null, bd = 1e9;
        for (const s of L) if (!s.pris) { const d = s0 ? Math.hypot(s.x - s0.x, s.z - s0.z) : this.rnd(); if (d < bd) { bd = d; best = s; } }
        if (best) { best.pris = v; v.place = best; if (!s0) s0 = best; this.viser(v, best, best.x, best.z, best.h, best.regard); }
        else { const a = s0 || L[0], ex = a.x - t.x, ez = a.z - t.z, l = Math.hypot(ex, ez) || 1; this.viser(v, a, a.x + ex / l * 1.1, a.z + ez / l * 1.1, a.h, a.regard); }
      }
      g.spot = s0;
      g.tAct = act === 'bar' ? 30 + this.rnd() * 30 : 12 + this.rnd() * 14;
    } else {
      const L = act === 'chene' ? this.chene : this.flane, libres = L.filter(s => !s.pris), s = libres[Math.floor(this.rnd() * libres.length)];
      if (!s) {
        // (tout est pris) : on reste là un moment, à regarder autour de soi
        g.act = 'flane'; g.spot = null; g.tAct = 5 + this.rnd() * 5;
        for (const v of g.membres) { v.etat = 'repos'; v.tx = v.p.pos.x; v.tz = v.p.pos.z; v.th = v.p.h; v.regard = null; v.spot = null; }
        return;
      }
      s.pris = g; g.spot = s;
      const n = adultes.length, cx = Math.cos(s.h), sx = -Math.sin(s.h); // (côte à côte, perpendiculaires à ce qu'on regarde)
      adultes.forEach((v, i) => { const o = (i - (n - 1) / 2) * 0.8; this.viser(v, s, s.x + cx * o, s.z + sx * o, s.h, s.regard); });
      g.tAct = act === 'chene' ? 8 + this.rnd() * 9 : 6 + this.rnd() * 8;
    }
    for (const v of g.membres) if (v.enfant) this.suivreParent(v);
    if (poser) for (const v of g.membres) { v.p.placer(v.tx, v.tz, v.th); }
  }
  // un enfant se tient près d'un parent (un pas de côté, en arrière)
  suivreParent(v, suivre = false) {
    const pa = v.parent || v.g.chef, s = pa.spot, k = v.i % 2 ? 1 : -1;
    const fx = Math.sin(pa.th), fz = Math.cos(pa.th);
    this.viser(v, s, pa.tx - fx * 0.7 + fz * 0.55 * k, pa.tz - fz * 0.7 - fx * 0.55 * k, pa.th, pa.regard, suivre);
  }
  // quelqu'un du groupe a un verre en main, ou se le fait servir (on attend qu'il ait fini) ; tous arrivés ; un adulte pas
  // encore servi (des boucles : rien d'alloué à chaque image)
  occupe(g) { for (const v of g.membres) if (v.p.aServir || v.p.verre > 0) return true; return false; }
  arrives(g) { for (const v of g.membres) if (v.etat !== 'repos') return false; return true; }
  aServir(g) { for (const v of g.membres) if (!v.enfant && !v.servi) return true; return false; }
  crees(g) { for (const v of g.membres) if (!v.p) return false; return true; }
  // où va le visiteur v : en passant par l'endroit s (son champ de distance), jusqu'au point (x, z), tourné vers h
  // (suivre : le même but qui se déplace, un enfant derrière son parent : on garde la mesure du progrès)
  viser(v, s, x, z, h, regard, suivre = false) {
    v.spot = s; v.tx = x; v.tz = z; v.th = h; v.regard = regard || null;
    if (!suivre || v.etat === 'repos') { v.etat = 'va'; v.tBloque = 0; v.dBest = 1e9; v.tProche = 0; }
  }
  liberer(g) {
    for (const v of g.membres) if (v.place) { v.place.pris = null; v.place = null; }
    if (g.spot && g.spot.pris === g) g.spot.pris = null;
    g.spot = null;
  }
  // le payeur prend la file (un client de la caisse, ou un visiteur chez Marc) ; les siens se tiennent à côté
  enFile(g) {
    this.liberer(g);
    g.etat = 'file'; g.act = null;
    const v = g.chef;
    v.enFile = true; v.tMarc = 0;
    this.file.push(v);
    this.ranger();
  }
  // chacun à sa place dans la file (après qu'un client est servi : on avance)
  ranger() {
    for (let j = 0; j < this.file.length; j++) {
      const v = this.file[j], s = this.slots[Math.min(j, this.slots.length - 1)];
      this.viser(v, s, s.x, s.z, s.h, null);
      const g = v.g, fx = Math.sin(s.h), fz = Math.cos(s.h);
      let n = 0;
      for (const m of g.membres) if (m !== v) { n++; const o = n === 1 ? [0.0, 0.85] : n === 2 ? [-0.55, 1.35] : [0.5, 1.4]; this.viser(m, s, s.x - fx * o[0] - fz * o[1], s.z - fz * o[0] + fx * o[1], s.h, null); }
    }
  }
  partir(g) {
    this.liberer(g);
    if (g.chef.enFile) { const k = this.file.indexOf(g.chef); if (k >= 0) this.file.splice(k, 1); g.chef.enFile = false; this.ranger(); }
    if (this.comptoir && this.comptoir.g === g) this.comptoir = null;
    g.etat = 'part'; g.act = null; g.tTotal = 0;
    const s = g.voiture >= 0 ? this.places[g.voiture].spot : this.sortie;
    g.spot = s;
    g.membres.forEach((v, i) => { const o = (i - (g.membres.length - 1) / 2) * 0.75; this.viser(v, s, s.x + Math.cos(s.h) * o, s.z - Math.sin(s.h) * o, s.h, null); });
  }
  // le groupe est arrivé à sa voiture (ou au bout de l'allée) : il disparaît, avec la voiture, quand personne ne regarde
  disparaitre(g) {
    for (const v of g.membres) this.cacher(v);
    if (g.voiture >= 0) this.garer(this.places[g.voiture], false);
    g.voiture = -1; g.etat = 'absent'; g.act = null; g.tRetour = 60 + this.rnd() * 40;
  }
  // ce qu'on emporte : des cartons (six bouteilles ou plus), le coffret de Noël, ou un sac
  emporter(v, achats) {
    let b = 0, cof = 0;
    for (const [id, q] of achats || []) { if (VINS.has(id)) b += q; if (id === 'coffret') cof += q; }
    const p = v.p, m = p.m;
    if (b >= 6) {
      if (!v.pile) { v.pile = pileCartons(1); v.pile.scale.setScalar(1 / m.echelle); m.groupe.add(v.pile); }
      const n = Math.min(3, Math.ceil(b / 6));
      v.pile.count = n; v.pile.userData.n = n; v.pile.computeBoundingSphere();
      v.pile.position.set(PORT[0], PORT[1], PORT[2]); v.pile.visible = true; p.porte = v.pile;
      return;
    }
    const geo = cof ? coffret() : sac();
    if (!v.accessoire) { v.accessoire = new THREE.Mesh(geo, MAT); v.accessoire.castShadow = false; m.os[OS.mainD].add(v.accessoire); }
    v.accessoire.geometry = geo; v.accessoire.visible = true;
  }
  // chez Marc (après la relève) : quelques secondes au comptoir, puis on repart servi
  serviMarc(v) {
    const k = this.file.indexOf(v);
    if (k >= 0) { this.file.splice(k, 1); v.enFile = false; this.ranger(); }
    const r = this.rnd();
    this.nMarc++;
    this.emporter(v, r < 0.2 ? [['clos2025', 6]] : r < 0.32 ? [['coffret', 1]] : [['closRouge', 2]]);
    this.dire(v, this.choix(TX.merci), 2.2);
    this.partir(v.g);
  }
  // le verre servi au bar (verres.js) : on le compte ; la réplique après la première gorgée
  surServi(v) {
    if (v.servi) return;
    v.servi = true; v.p.servable = false; v.tRep = 0.75;
    this.nServis++;
    const g = v.g;
    if (g.act === 'bar') g.tAct = Math.max(g.tAct, 0) + 8 + this.rnd() * 6;
  }

  /* ------------------------------------------------------------ à chaque image */
  maj(dt, E) {
    if (!this.L) { if (this.actif) this.preparer(); return; }
    if (!this.actif && this.presents === 0) { this.sons(0, 0); return; }
    const jeu = this.c.jeu, m = heureDe(E.minutes), cam = this.c.camera.position;
    const ouvertes = this.actif && m >= P.ouverture && m < P.fermeture, nuit = m >= 19 * 60 + 30 || m < 7 * 60;
    // un saut dans le temps (une nuit, un fondu), ou la nuit : plus personne ; la cour remplie si c'est encore ouvert
    const saut = this.mPrec !== null && Math.abs(E.minutes - this.mPrec) > 20;
    this.mPrec = E.minutes;
    if (saut || nuit) {
      if (this.presents > 0) { for (const g of this.groupes) if (g.etat !== 'absent') this.disparaitre(g); this.file.length = 0; this.comptoir = null; }
      if (saut && ouvertes && !nuit) this.remplir();
      if (nuit) { this.sons(0, 0); return; }
    }
    if (this.actif && m >= P.fermeture) this.fermer();
    const dc = Math.hypot(cam.x - COUR.x, cam.z - COUR.z);
    // les personnages, créés en approchant (une étape par image)
    if (this.aCreer.length && dc < CREER) this.creer(this.enCreation ? this.enCreation.v : this.aCreer[0], false);
    if (dc > FIGE) { this.sons(0, 0); return; }
    this.majGrille();
    // les champs de distance demandés, un à la fois, par tranches (en attendant, on marche droit au but)
    if (!this.calcul && this.aChamp.length) { const s = this.aChamp.shift(); if (s.k >= 0) this.calcul = { s, C: this.grille.lancer(s.k) }; }
    if (this.calcul && this.grille.avancer(this.calcul.C, 2500)) { this.calcul.s.f = this.calcul.C.f; this.calcul = null; }
    this.n++;
    // les arrivées : vite au début, puis pour garder la cour pleine ; les clients d'abord quand la caisse est ouverte
    this.tArrivee -= dt;
    for (const g of this.groupes) if (g.etat === 'absent' && g.tRetour > 0) g.tRetour -= dt;
    if (this.caisse && ouvertes) {
      // la caisse ouverte : les clients attendus bientôt arrivent tout de suite (créés en priorité ; sous les yeux s'il le faut,
      // au bout de trois secondes)
      for (let k = this.iCaisse; k < Math.min(this.clients.length, this.iCaisse + 7); k++) {
        const g = this.clients[k];
        if (g.etat !== 'absent' || g.fini) continue;
        if (!this.crees(g)) { this.prioriser(g); break; }
        this.tClient -= dt;
        if (this.tClient <= 0 && this.arriver(g, this.tClient < -3)) this.tClient = 1.2;
        break;
      }
    }
    if (ouvertes && this.tArrivee <= 0 && this.presents < POP) {
      // (avant la caisse, les quatre premiers clients arrivent parmi les premiers visiteurs, un groupe sur deux)
      let g = null;
      if (this.nArrivees % 2 === 0) for (const c of this.clients) if (c.etat === 'absent' && !c.fini && c.k < this.iCaisse + 4 && this.crees(c)) { g = c; break; }
      if (!g) for (const c of this.groupes) if (!c.def && c.etat === 'absent' && c.tRetour <= 0 && this.crees(c) && this.presents + c.membres.length <= POP) { g = c; break; }
      if (g && this.arriver(g)) this.tArrivee = this.presents < 10 ? 2 + this.rnd() * 2 : 6 + this.rnd() * 6;
      else this.tArrivee = 1;
    }
    // la caisse : le prochain client prend la file (dans l'ordre), le comptoir, Marc après la relève
    if (this.caisse) {
      while (this.prochain < this.clients.length && this.clients[this.prochain].fini) this.prochain++;
      const g = this.clients[this.prochain];
      if (g && g.etat === 'cour' && this.file.length < this.slots.length && !this.occupe(g)) { this.enFile(g); this.prochain++; }
      const v = this.file[0];
      const arrive = v && Math.hypot(v.p.pos.x - this.slots[0].x, v.p.pos.z - this.slots[0].z) < 0.6;
      if (v && arrive && v.g.def) {
        if (this.comptoir !== v) { this.comptoir = v; this.dire(v, TX.bonjour[v.g.def.id] || 'Bonjour !', 2.6); }
      } else this.comptoir = null;
      if (v && arrive && !v.g.def && this.marc && (v.tMarc += dt) > 4.5 + (v.i % 3)) this.serviMarc(v);
    }
    // les groupes : l'activité, son temps, la suivante ; repartir
    for (const g of this.groupes) if (g.etat !== 'absent') this.decider(g, dt, E);
    // chacun : marcher, s'arrêter, regarder ; animés de près à chaque image, plus loin une image sur deux ou trois (qui
    // se tient sans bouger, dès 12 m) ; à chaque image quand un véhicule lancé approche
    const J = E.joueur, dg = E.danger && Math.abs(E.danger.v) > 1 ? E.danger : null;
    for (const v of this.gens) {
      if (!v.present) continue;
      const p = v.p, d2 = (p.pos.x - cam.x) ** 2 + (p.pos.z - cam.z) ** 2;
      v.dtA += dt;
      const pas = d2 < (v.etat === 'repos' ? 144 : PRES * PRES) ? 1 : d2 < MOYEN * MOYEN ? 2 : 3;
      if (pas > 1 && (this.n + v.i) % pas && !p.aServir && p.sautT <= 0 && !(dg && (p.pos.x - dg.x) ** 2 + (p.pos.z - dg.z) ** 2 < 225)) continue;
      const dtv = v.dtA; v.dtA = 0;
      this.vivre(v, dtv, E, J);
    }
    // personne ne se traverse ; ni le joueur à pied, ni les véhicules
    this.ecarter(J);
    for (const v of this.gens) if (v.present) E.pousser?.(v.p.pos, v.r);
    this.majBulles();
    this.sons(dc, E);
  }
  // le groupe g : ce qu'il fait, combien de temps, la suite
  decider(g, dt, E) {
    if (g.etat === 'cour') {
      if (g.act === null) { this.choisir(g); return; }
      g.tTotal += dt;
      const chef = g.chef;
      if (chef.etat !== 'repos') return; // (pas encore arrivé)
      g.tAct -= dt;
      if (this.occupe(g)) return;
      // au bar, pendant la dégustation, on attend qu'on vienne servir (pas plus de deux minutes de plus)
      if (g.act === 'bar' && !g.def && g.tAct > -120 && this.c.jeu.portes?.etape === 'degustation' && this.aServir(g)) return;
      if (g.tAct <= 0) this.choisir(g);
    } else if (g.etat === 'part') {
      // (arrivés à la voiture, au bout de l'allée ; ou une minute plus tard, où qu'ils soient : ils disparaîtront hors de la vue)
      if (this.arrives(g) || (g.tTotal += dt) > 60) g.etat = 'fin';
    } else if (g.etat === 'fin') {
      const c = g.chef.p.pos;
      if (!this.vu(c.x, c.z) && (g.voiture < 0 || !this.vu(this.places[g.voiture].x, this.places[g.voiture].z))) this.disparaitre(g);
    }
  }
  // un visiteur : un véhicule qui fonce sur lui (un saut de côté), le verre qu'on lui sert, marcher, s'arrêter, regarder
  vivre(v, dt, E, J) {
    const p = v.p, col = this.c.col, t = E.t;
    const dg = E.danger;
    if (dg && Math.abs(dg.v) > 1.5 && p.sautT <= 0) {
      const sg = Math.sign(dg.v), fx = Math.sin(dg.h) * sg, fz = Math.cos(dg.h) * sg, rx = p.pos.x - dg.x, rz = p.pos.z - dg.z;
      const devant = rx * fx + rz * fz, cote = rx * fz - rz * fx;
      if (devant > -0.5 && devant < 3 + Math.abs(dg.v) * 0.9 && Math.abs(cote) < 2.4) {
        const s = Math.abs(cote) > 0.15 ? Math.sign(cote) : (v.i % 2 ? 1 : -1);
        p.sauter(fz * s, -fx * s); this.dire(v, this.choix(TX.saut), 1.6);
      }
    }
    if (p.sautT > 0) { p.update(dt, 0, 0, 0, false, col, t); v.etat = v.etat === 'repos' ? 'va' : v.etat; return; }
    // on lui sert un verre, il le boit : il ne bouge pas (verres.js le tourne vers celui qui sert)
    if (p.aServir || p.verre > 0) {
      p.update(dt, 0, 0, 0, false, col, t);
      if (v.tRep > 0 && p.tVerre > 0 && (v.tRep -= dt) <= 0) this.dire(v, this.choix(TX.verre), 3);
      return;
    }
    // un enfant suit son parent qui marche
    if (v.enfant && v.etat !== 'repos' && v.parent && v.parent.etat === 'va') this.suivreParent(v, true);
    let dx = v.tx - p.pos.x, dz = v.tz - p.pos.z;
    const d = Math.hypot(dx, dz);
    // tout près sans pouvoir y être (quelqu'un, un véhicule garé dessus) : au bout de trois secondes, on s'arrête là (pas
    // dans la file : on y attend sa place ; pas un enfant dont le parent marche encore)
    if (v.etat === 'va' && d < 1.0 && !v.enFile && !(v.enfant && v.parent && v.parent.etat === 'va') && (v.tProche += dt) > 3) { v.tx = p.pos.x; v.tz = p.pos.z; v.etat = 'repos'; p.v = 0; }
    if (v.etat === 'va' && d > 0.22) {
      // la direction : de près, droit au but ; sinon en descendant le champ de distance de l'endroit visé
      if (d > 2.2 && v.spot) this.direction(v, p.pos.x, p.pos.z);
      else { V.x = dx / d; V.z = dz / d; }
      // bloqué (pas de progrès depuis deux secondes) : un pas de côté
      if (d < v.dBest - 0.25) { v.dBest = d; v.tBloque = 0; } else if ((v.tBloque += dt) > 2.2) { v.tBloque = 0; v.dBest = d; v.tCote = 0.8; const s = v.i % 2 ? 1 : -1; v.cx = -V.z * s; v.cz = V.x * s; }
      if (v.tCote > 0) { v.tCote -= dt; V.x = v.cx; V.z = v.cz; }
      const vit = Math.min(p.porte ? 1.0 : v.allure, 0.35 + d * 0.9);
      p.regard = J && Math.hypot(J.pos.x - p.pos.x, J.pos.z - p.pos.z) < 4 ? REGARD.set(J.pos.x, J.pos.y + 1.6, J.pos.z) : null;
      p.update(dt, V.x, V.z, 1, false, col, t, vit);
      // en arrivant, ils croisent le joueur : l'invitation reçue
      if (J && !v.g.dit && v === v.g.chef && v.g.etat === 'cour' && v.g.tTotal < 40 && Math.hypot(J.pos.x - p.pos.x, J.pos.z - p.pos.z) < 5) { v.g.dit = true; this.dire(v, this.choix(TX.arrivee), 3); }
      return;
    }
    if (v.etat === 'va') { v.etat = 'repos'; p.v = 0; v.salue = false; }
    else if (d > 0.7) { v.etat = 'va'; v.tBloque = 0; v.dBest = 1e9; v.tProche = 0; } // (écarté de sa place par un voisin, par un saut : il y revient)
    // arrêté : tourné vers ce qu'il regarde ; vers le joueur qui passe à pied (il le salue une fois)
    p.h = v.th;
    const dj = J ? Math.hypot(J.pos.x - p.pos.x, J.pos.z - p.pos.z) : 1e9;
    if (dj < 5 && !v.enFile) {
      p.regard = REGARD.set(J.pos.x, J.pos.y + 1.6, J.pos.z);
      if (dj < 3.2 && !v.salue && !p.porte && !v.accessoire?.visible) {
        v.salue = true; p.salut = true;
        if (this.tParle <= 0) this.dire(v, this.choix(v.enfant ? TX.enfant : v.place && v.place.sorte === 'bar' && !v.servi ? TX.attente : v.place && v.place.sorte === 'buffet' ? TX.buffet : TX.salut), 2.6);
      } else p.salut = false;
    } else { p.regard = v.regard; p.salut = false; }
    // au bar, pas encore servi : on peut lui servir un verre (jamais à un enfant)
    p.servable = !v.enfant && !v.servi && !!v.place && v.place.sorte === 'bar' && v.g.etat === 'cour';
    if (col.resoudre(p.pos, p.r)) { /* (poussé contre le décor par un voisin : ramené) */ }
    p.sync(dt, t);
  }
  // la direction (V) pour aller vers v.tx, v.tz par le champ de distance de v.spot (demandé s'il n'est pas encore là)
  direction(v, x, z) {
    const s = v.spot, G = this.grille;
    if (!s.f) {
      if (!s.demande && s.k >= 0) { s.demande = true; this.aChamp.push(s); }
      const dx = v.tx - x, dz = v.tz - z, d = Math.hypot(dx, dz) || 1; V.x = dx / d; V.z = dz / d; return;
    }
    let k = G.case(x, z);
    if (!G.libre(k)) k = G.proche(x, z);
    if (k < 0 || s.f[k] === 65535) { const dx = v.tx - x, dz = v.tz - z, d = Math.hypot(dx, dz) || 1; V.x = dx / d; V.z = dz / d; return; }
    let c = k;
    for (let i = 0; i < 5; i++) { const n = G.descente(c, s.f); if (n === c) break; c = n; }
    let ax = G.cx(c), az = G.cz(c);
    if (s.f[c] === 0) { ax = v.tx; az = v.tz; }
    const dx = ax - x, dz = az - z, d = Math.hypot(dx, dz);
    if (d < 0.05) { const ex = v.tx - x, ez = v.tz - z, l = Math.hypot(ex, ez) || 1; V.x = ex / l; V.z = ez / l; return; }
    V.x = dx / d; V.z = dz / d;
  }
  // personne ne se traverse : deux visiteurs trop près s'écartent l'un de l'autre ; le joueur à pied les écarte
  ecarter(J) {
    const G = this.gens, n = G.length;
    for (let i = 0; i < n; i++) {
      const a = G[i];
      if (!a.present || a.p.sautT > 0) continue;
      const pa = a.p.pos;
      for (let j = i + 1; j < n; j++) {
        const b = G[j];
        if (!b.present) continue;
        const pb = b.p.pos, dx = pb.x - pa.x, dz = pb.z - pa.z, R = (a.r + b.r) * 0.92, d2 = dx * dx + dz * dz;
        if (d2 >= R * R) continue;
        const d = Math.sqrt(d2) || 0.01, k = (R - d) / d * 0.5;
        // (celui qui est à sa place, au bar ou dans la file, bouge moins que celui qui passe)
        const ka = a.etat === 'repos' && b.etat !== 'repos' ? 0.25 : b.etat === 'repos' && a.etat !== 'repos' ? 1.75 : 1;
        pa.x -= dx * k * ka; pa.z -= dz * k * ka; pb.x += dx * k * (2 - ka); pb.z += dz * k * (2 - ka);
      }
      if (J) {
        const dx = pa.x - J.pos.x, dz = pa.z - J.pos.z, R = a.r + 0.34, d2 = dx * dx + dz * dz;
        if (d2 < R * R) { const d = Math.sqrt(d2) || 0.01; pa.x = J.pos.x + dx / d * R; pa.z = J.pos.z + dz / d * R; }
      }
    }
  }

  /* ------------------------------------------------------------ les bulles, le son */
  choix(l) { return l[Math.floor(this.rnd() * l.length)]; }
  // v dit texte pendant duree secondes (une des bulles partagées)
  dire(v, texte, duree) {
    let b = this.bulles.find(x => x.v === v) || this.bulles.find(x => x.o.t <= 0) || null;
    if (!b) { b = this.bulles[0]; for (const x of this.bulles) if (x.o.t < b.o.t) b = x; }
    b.v = v; this.c.hud.bulle(b.o, texte, duree);
    this.tParle = 4;
  }
  majBulles() {
    this.tParle -= 1 / 60;
    for (const b of this.bulles) {
      const v = b.v;
      if (!v) continue;
      if (b.o.t <= 0 || !v.present) { b.v = null; continue; }
      const p = v.p.pos;
      this.c.hud.placer(b.o, p.x, p.y + v.haut, p.z, v.p.m.groupe.visible);
    }
  }
  // la rumeur de la foule et la sono, seulement près de la cour (audio.js)
  sons(dc, E) {
    if (!E) { if (this.tSon !== -1) { son.sono(0); this.tSon = -1; } return; }
    const dt = 1 / 60;
    if ((this.tSon -= dt) > 0) return;
    this.tSon = 0.12;
    const e = E.ego, so = this.L.sono, enVehicule = !E.aPied, dedans = !!this.c.jeu.dedans;
    const m = heureDe(E.minutes), ouvertes = this.actif && m >= P.ouverture && m < P.fermeture;
    const ds = Math.hypot(e.x - so.x, e.z - so.z), ks = ouvertes ? borne(1 - (ds - 6) / 40, 0, 1) * (enVehicule || dedans ? 0.35 : 1) : 0;
    son.sono(ks);
    if ((this.tFoule -= 0.12) > 0) return;
    this.tFoule = 0.35;
    const df = Math.hypot(e.x - COUR.x, e.z - COUR.z), kf = borne(1 - (df - 4) / 42, 0, 1) * (dedans ? 0.3 : 1);
    son.foule(kf * Math.min(1, this.presents / 8), this.presents);
  }

  /* ------------------------------------------------------------ les ombres de contact */
  taches(t, vu) {
    if (!this.L || (!this.actif && this.presents === 0)) return;
    for (const v of this.gens) {
      if (!v.present) continue;
      const p = v.p;
      if (vu(p.m, p.pos.x, p.pos.z)) t.poser(p.pos.x, p.pos.z, v.enfant ? 0.3 : 0.4, v.enfant ? 0.3 : 0.4, 0, p.pos.y);
    }
    for (const pl of this.places) if (pl.m && pl.m.visible) t.poser(pl.x, pl.z, 1.1, 2.25, pl.h, 0);
  }
}
const REGARD = new THREE.Vector3();
