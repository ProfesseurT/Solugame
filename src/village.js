// Le village du château, qui vit (Teddy, 25/11/2026 : « faut mettre de l'activité au château, des gens, des voitures,
// des restaurants, des terrasses »). Le décor est dans monde.js (villageTerrasses : les deux restaurants et le café, leurs
// terrasses, le trottoir pavé, les places de stationnement ; chateau : le belvédère) ; ici, ce qui bouge :
// - aux terrasses, des gens attablés : un verre à la main (ils boivent de temps en temps) ou les mains sur les genoux, ils
//   se regardent, lèvent les yeux vers qui passe ; un serveur par terrasse, son plateau, qui va de la porte à une table
//   par l'allée entre les deux rangs, s'y arrête (on le regarde), revient et rentre ;
// - des touristes flânent sur le bord intérieur de la route du tour, dans la cour d'honneur, dans l'allée du châtelet ;
//   ils s'arrêtent pour prendre le château en photo (le téléphone levé, un flash) ; ils s'écartent du véhicule qui
//   arrive, comme les passants du bourg (main.js : passantVit, le mode WTF compris) ;
// - au belvédère, deux personnes assises sur les bancs, deux à la balustrade qui regardent la vallée (et la photographient) ;
// - deux voitures montent du bourg par la route du château, font le tour (dans le sens inverse des aiguilles d'une montre,
//   sur la file extérieure), redescendent, attendent au stop de la départementale et remontent quand personne ne regarde ;
//   elles ralentissent dans les lacets, s'arrêtent derrière ce qui leur barre la route (le joueur, un véhicule, un
//   touriste, l'autre voiture), klaxonnent, s'allument la nuit ; on peut les emprunter (main.js).
// Les gens ne sont créés que quand on approche du château (deux par image), animés de près, moins souvent plus loin,
// cachés au-delà de 260 m ; les terrasses servent de 11 h à 23 h, les touristes viennent de 8 h 30 à 19 h 30 (ils
// n'arrivent ni ne partent sous les yeux). Les voitures roulent toujours (un point sur un chemin, rien de plus).
import * as THREE from 'three';
import { C, fusion, MAT } from './modeles.js';
import { Pieton, Passant } from './pieton.js';
import { ROUTE, CHATEAU, DEMI, sol } from './relief.js';
import { VILLAGE } from './textes.js';
import { hasard, angle, versAngle, borne } from './outils.js';

const LIBRE = { resoudre: () => false, rangs: () => false }; // le serveur suit l'allée de sa terrasse
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const PORTE_PLATEAU = [0, 1.0, 0.34]; // le plateau du serveur, devant lui (repère du personnage, en mètres)

/* ---------------------------------------------------------------- le chemin des voitures
   De la départementale au château par la file de droite, le tour par la file extérieure, la descente par l'autre file ;
   un point par mètre (x, z, le sol y), la vitesse permise d'après la courbure (et 6 m/s sur le tour). */
function cheminVoitures() {
  const R = ROUTE, CH = CHATEAU, brut = [];
  let iFin = R.n - 1;
  while (iFin > 0 && Math.hypot(R.x[iFin] - CH.x, R.z[iFin] - CH.z) < CH.tour + DEMI + 0.2) iFin--;
  const voie = 1.55, surRoute = (i, sens) => {
    const a = Math.max(0, i - 2), b = Math.min(R.n - 1, i + 2), l = Math.hypot(R.x[b] - R.x[a], R.z[b] - R.z[a]) || 1;
    const fx = (R.x[b] - R.x[a]) / l * sens, fz = (R.z[b] - R.z[a]) / l * sens;
    return [R.x[i] - fz * voie, R.z[i] + fx * voie, 1]; // (la droite de qui roule : -fz, fx)
  };
  for (let i = 2; i <= iFin; i++) brut.push(surRoute(i, 1));
  const jA = Math.atan2(R.z[iFin] - CH.z, R.x[iFin] - CH.x), rv = CH.tour + 1.5, nT = Math.round(2 * Math.PI * rv);
  for (let k = 0; k <= nT; k++) { const a = jA - 0.16 - k / nT * (2 * Math.PI - 0.32); brut.push([CH.x + Math.cos(a) * rv, CH.z + Math.sin(a) * rv, 2]); }
  for (let i = iFin; i >= 2; i--) brut.push(surRoute(i, -1));
  // rééchantillonné tous les mètres
  const X = [], Z = [], T = [];
  let reste = 0;
  X.push(brut[0][0]); Z.push(brut[0][1]); T.push(brut[0][2]);
  for (let i = 1; i < brut.length; i++) {
    let [ax, az] = brut[i - 1];
    const [bx, bz, t] = brut[i];
    let d = Math.hypot(bx - ax, bz - az);
    while (d + reste >= 1) { const u = (1 - reste) / d; ax += (bx - ax) * u; az += (bz - az) * u; X.push(ax); Z.push(az); T.push(t); d = Math.hypot(bx - ax, bz - az); reste = 0; }
    reste += d;
  }
  const n = X.length, Y = new Float32Array(n), V = new Float32Array(n);
  for (let i = 0; i < n; i++) Y[i] = sol(X[i], Z[i]);
  const cap = i => { const a = Math.max(0, i - 3), b = Math.min(n - 1, i + 3); return Math.atan2(X[b] - X[a], Z[b] - Z[a]); };
  for (let i = 0; i < n; i++) {
    const k = Math.abs(angle(cap(Math.min(n - 1, i + 3)) - cap(Math.max(0, i - 3)))) / 6;
    V[i] = Math.max(3.5, Math.min(T[i] === 2 ? 6 : 10, Math.sqrt(2.4 / Math.max(k, 1e-4))));
  }
  return { X: Float32Array.from(X), Z: Float32Array.from(Z), Y, V, n, L: n - 1 };
}

/* ---------------------------------------------------------------- une voiture qui monte au château
   Même interface que les voitures de la départementale pour ce qui s'en sert (main.js : x, z, v, mesh, conducteur, cri ;
   vehicules.js : cogner, et son axe ax, az pour les deux cercles du choc). */
class VoitureTour {
  constructor(mesh, chemin, s) {
    this.mesh = mesh; this.C = chemin; this.s = s; this.v = 0; this.a = 0; this.arret = 0; this.klaxon = false;
    this.attente = 0; this.detresse = 0; this.x = 0; this.y = 0; this.z = 0; this.ax = 0; this.az = 1; this.h = 0;
    this.feux = mesh.userData.feux || null; mesh.rotation.order = 'YXZ'; this.conducteur = null; this.cri = null;
    this.poser();
  }
  // un véhicule (ou le personnage) la touche : elle s'arrête, feux de détresse
  cogner(qui, nx, nz, force) { this.v *= 0.3; this.a = 0; this.detresse = Math.max(this.detresse, (force ?? 0.5) > 0.6 ? 4 : 1); }
  poser() {
    const C = this.C, i = Math.min(C.n - 2, Math.max(0, Math.floor(this.s))), f = borne(this.s - i, 0, 1);
    this.x = C.X[i] + (C.X[i + 1] - C.X[i]) * f; this.z = C.Z[i] + (C.Z[i + 1] - C.Z[i]) * f; this.y = C.Y[i] + (C.Y[i + 1] - C.Y[i]) * f;
    const a = Math.max(0, i - 2), b = Math.min(C.n - 1, i + 3), hx = C.X[b] - C.X[a], hz = C.Z[b] - C.Z[a], l = Math.hypot(hx, hz) || 1;
    this.ax = hx / l; this.az = hz / l; this.h = Math.atan2(this.ax, this.az);
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.set(-Math.atan2(C.Y[b] - C.Y[a], l), this.h, 0);
  }
  // devant elle (dans sa file, 18 m) : l'écart libre jusqu'à ce qui la gêne (un véhicule : on s'arrête plus loin)
  ecart(liste, libre) {
    for (let k = 0; k < liste.length; k++) {
      const o = liste[k];
      if (!o || o === this) continue;
      const ex = o.x - this.x, ez = o.z - this.z, lo = ex * this.ax + ez * this.az, la = ex * this.az - ez * this.ax;
      if (lo > 0 && lo < 18 && Math.abs(la) < 1.9) libre = Math.min(libre, lo - (o.veh || o.C ? 6 : 3.2));
    }
    return libre;
  }
  // renvoie vrai quand elle klaxonne
  update(dt, obstacles, gens, autres) {
    if (dt <= 0) return false;
    const C = this.C, i = Math.min(C.n - 1, Math.floor(this.s));
    let libre = this.ecart(autres, this.ecart(gens, this.ecart(obstacles, 1e9)));
    libre = Math.min(libre, C.L - 0.8 - this.s); // le stop, en bas
    // vitesse voulue : celle du chemin (en anticipant les lacets), l'écart, l'arrêt après un choc
    let cible = C.V[i];
    for (let k = 4; k <= 28; k += 4) { const j = Math.min(C.n - 1, i + k); cible = Math.min(cible, Math.sqrt(C.V[j] * C.V[j] + 5 * k)); }
    const marge = Math.max(0, libre);
    cible = Math.min(cible, marge / 1.2, Math.sqrt(5 * marge));
    if (this.detresse > 0) { this.detresse -= dt; cible = 0; }
    let aV = borne((cible - this.v) * 2, -7, 2.2);
    if (libre < 0.6) aV = -9;
    this.a += borne(aV - this.a, -14 * dt, 4 * dt);
    this.v = borne(this.v + this.a * dt, 0, 10);
    if (libre < 0.2 && this.v > 0) this.v = 0;
    this.s = Math.min(C.L, this.s + this.v * dt);
    // arrêtée devant quelque chose : elle klaxonne une fois
    let cri = false;
    if (this.v < 0.3 && libre < 8 && C.L - this.s > 2) { this.arret += dt; if (this.arret > 1.3 && !this.klaxon) { this.klaxon = true; cri = true; } } else { this.arret = 0; this.klaxon = false; }
    this.attente = this.s >= C.L - 1.2 && this.v < 0.1 ? this.attente + dt : 0;
    const ess = this.mesh.userData.essieux;
    if (ess) { const r = this.v * dt / this.mesh.userData.rayon; for (const e of ess) e.rotation.x += r; }
    this.poser();
    if (this.feux) {
      const on = (this.detresse > 0) && (performance.now() % 700 < 380);
      this.feux.g.visible = on; this.feux.d.visible = on;
      this.feux.stop.visible = this.a < -0.7 || (this.v < 0.4 && libre < 12);
    }
    return cri;
  }
}

/* ---------------------------------------------------------------- un touriste
   Un passant (pieton.js : il s'écarte du véhicule qui arrive) qui flâne sur un anneau (le bord intérieur de la route du
   tour : jamais loin de là où il est) ou dans un rectangle, et qui s'arrête souvent pour prendre le château en photo. */
class Touriste extends Passant {
  constructor(modele, zone, rnd, vise) { super(modele, zone, rnd); this.vise = vise; this.photo = false; this.tFlash = 0; this.pause = false; }
  nouvelleCible() {
    const z = this.zone, r = this.rnd;
    if (!z.anneau) { super.nouvelleCible(); return; }
    const p = this.p ? this.p.pos : null, a0 = p && (p.x || p.z) ? Math.atan2(p.z - z.cz, p.x - z.cx) : r() * Math.PI * 2;
    const a = a0 + (r() - 0.5) * 0.7, rr = z.r0 + r() * (z.r1 - z.r0);
    this.cible.x = z.cx + Math.cos(a) * rr; this.cible.z = z.cz + Math.sin(a) * rr;
  }
}

export class Village {
  // c : { scene, camera, hud, lieux, unPassant(extra, r), voiture(couleur) : son maillage (dans la scène), conducteur(vo),
  // passantVit(p, dt, danger, ecraseur) : comme un passant du bourg, emettre } (main.js)
  constructor(c) {
    this.c = c; this.L = c.lieux.chateau; this.gens = []; this.file = []; this.prepare = false; this.vus = true; this.n = 0; this.garees = [];
    this.chemin = cheminVoitures(); this.voitures = []; this.r = hasard(3311); this.pos = [];
    const CH = CHATEAU;
    this.centre = { x: CH.x, z: CH.z };
  }
  // les voitures : créées avec les autres habitants (main.js : peupler), l'une en bas, l'autre à mi-chemin
  creerVoitures() { [[0, '#c9a23a'], [this.chemin.L * 0.55, '#4f6272']].forEach(([s, c]) => this.nouvelleVoiture(c, s)); }
  nouvelleVoiture(couleur, s = 0, cri = null) {
    const vo = new VoitureTour(this.c.voiture(couleur), this.chemin, s);
    vo.couleur = couleur; vo.teinte = new THREE.Color(couleur).getHex(); vo.cri = cri || this.c.hud.etiquette('Tût tût !', 'bulle');
    this.voitures.push(vo); this.c.conducteur(vo);
    return vo;
  }
  retirer(vo) { const i = this.voitures.indexOf(vo); if (i >= 0) this.voitures.splice(i, 1); }

  // ceux qui viendront, dans l'ordre (créés deux par image quand on approche)
  preparer() {
    this.prepare = true;
    const L = this.L, r = this.r, CH = CHATEAU;
    for (const R of L.restos) {
      R.places.forEach((pl, i) => { if (r() < 0.55) this.file.push(() => this.attable(R, i, r)); });
      this.file.push(() => this.serveur(R, r));
    }
    const chateau = { x: CH.x, y: CH.y + 8, z: CH.z + 6 };
    for (let i = 0; i < 8; i++) this.file.push(() => this.touriste({ anneau: true, cx: CH.x, cz: CH.z, r0: CH.tour - 2.7, r1: CH.tour - 1.7 }, r, chateau));
    for (let i = 0; i < 3; i++) this.file.push(() => this.touriste({ x0: CH.x - 8, z0: CH.z - 12, x1: CH.x + 8, z1: CH.z - 4.5 }, r, { x: CH.x, y: CH.y + 9, z: CH.z }));
    for (let i = 0; i < 2; i++) this.file.push(() => this.touriste({ x0: CH.x - 2.8, z0: CH.z - 27, x1: CH.x + 2.8, z1: CH.z - 17.5 }, r, { x: CH.x, y: CH.y + 5, z: CH.z - 15 }));
    L.bancs.forEach((b, i) => { if (i !== 1) this.file.push(() => this.surBanc(b, r)); });
    for (const da of [-0.13, 0.11]) this.file.push(() => this.contemple(da, r));
  }
  ajouter(g) {
    g.p.m.groupe.visible = this.vus; g.etq = g.etq || this.c.hud.etiquette('', 'bulle'); g.tParle = 0; g.i = 0; g.dtA = 0; g.present = true;
    this.gens.push(g);
  }
  // attablé : à la place i de la terrasse R, un verre à la main (sept sur dix) ; il regarde son voisin
  attable(R, i, r) {
    const pl = R.places[i], p = new Pieton(this.c.unPassant({}, r));
    p.assis = true; p.y0 = pl.y; p.h = pl.h;
    p.m.groupe.position.set(pl.x, pl.y - 0.34, pl.z); p.m.groupe.rotation.y = pl.h;
    const boit = r() < 0.7;
    if (boit) { p.verre = 1; p.tVerre = 4.3; }
    p.sync(0, 0); p.pos.copy(p.m.groupe.position);
    this.c.scene.add(p.m.groupe);
    const v = R.places[i ^ 1];
    this.ajouter({ p, genre: 'table', R, y: pl.y, boit, t: r() * 14, voisin: v ? { x: v.x, y: pl.y + 1.15, z: v.z } : null, nom: 'attables' });
  }
  // le serveur de la terrasse R : chemise blanche, tablier noir, son plateau (deux verres, une carafe)
  serveur(R, r) {
    const p = new Pieton(this.c.unPassant({ tenue: 'chemise', haut: '#f4f1ea', col: '#f4f1ea', bas: '#1d1d1d', tablier: '#1d1d1d', chapeau: null, barbe: false }, r));
    const A = R.axes, E = p.m.echelle;
    const P = (lx, av) => ({ x: A.x + Math.sin(A.rot) * (A.d / 2 + av) + Math.cos(A.rot) * lx, z: A.z + Math.cos(A.rot) * (A.d / 2 + av) - Math.sin(A.rot) * lx });
    const lxP = (R.porte.x - A.x) * Math.cos(A.rot) - (R.porte.z - A.z) * Math.sin(A.rot);
    const plateau = new THREE.Group();
    plateau.add(new THREE.Mesh(fusion([C(0.2, 0.2, 0.02, 12, '#c9ccd1', 0, 0, 0), C(0.03, 0.025, 0.1, 6, '#d6e6ea', -0.07, 0.06, 0.02), C(0.03, 0.025, 0.1, 6, '#d6e6ea', 0.05, 0.06, -0.04), C(0.04, 0.045, 0.18, 8, '#3a1820', 0.02, 0.1, 0.08)]), MAT));
    plateau.userData.demi = 0.2; plateau.scale.setScalar(1 / E); plateau.position.set(PORTE_PLATEAU[0] / E, PORTE_PLATEAU[1] / E, PORTE_PLATEAU[2] / E);
    p.m.groupe.add(plateau); p.porte = plateau;
    p.placer(R.porte.x, R.porte.z, A.rot);
    this.c.scene.add(p.m.groupe);
    this.ajouter({ p, genre: 'serveur', R, P, lxP, etat: 'dedans', t: 1 + r() * 4, pts: [], k: 0, table: 0, plateau, nom: 'serveur' });
  }
  touriste(zone, r, vise) {
    const t = new Touriste(this.c.unPassant({ chapeau: r() < 0.3 ? 'casquette' : null }, r), zone, r, vise);
    t.cri = this.c.hud.etiquette('', 'bulle'); t.p.etq = t.cri; t.bulle = 0;
    this.c.scene.add(t.p.m.groupe);
    this.ajouter({ p: t.p, t, genre: 'touriste', etq: t.cri, nom: 'touristes' });
  }
  // au belvédère : assis sur un banc, tourné vers la vallée
  surBanc(b, r) {
    const p = new Pieton(this.c.unPassant({}, r));
    p.assis = true; p.y0 = b.y; p.h = b.h;
    p.m.groupe.position.set(b.x, b.y - 0.34, b.z); p.m.groupe.rotation.y = b.h;
    p.sync(0, 0); p.pos.copy(p.m.groupe.position);
    this.c.scene.add(p.m.groupe);
    this.ajouter({ p, genre: 'banc', y: b.y, t: r() * 20, nom: 'belvedere' });
  }
  // à la balustrade du belvédère, qui regarde la vallée ; de temps en temps, une photo
  contemple(da, r) {
    const CH = CHATEAU, b = Math.PI / 4 + da, x = CH.x + Math.cos(b) * (CH.tour + 6.0), z = CH.z + Math.sin(b) * (CH.tour + 6.0);
    const p = new Pieton(this.c.unPassant({}, r));
    p.placer(x, z, Math.atan2(Math.cos(b), Math.sin(b)));
    this.c.scene.add(p.m.groupe);
    this.ajouter({ p, genre: 'balustrade', t: 3 + r() * 10, photo: false, nom: 'belvedere', h0: p.h });
  }

  // (x, z) est devant la caméra, à moins de 70 m
  vu(x, z) {
    const cam = this.c.camera, dx = x - cam.position.x, dz = z - cam.position.z, d = Math.hypot(dx, dz);
    if (d > 70) return false;
    if (d < 6) return true;
    cam.getWorldDirection(v1);
    return (dx * v1.x + dz * v1.z) / d > 0.35;
  }
  // un flash d'appareil photo, au téléphone levé
  flash(p) {
    const fx = Math.sin(p.h), fz = Math.cos(p.h);
    this.c.emettre(p.pos.x + fx * 0.32 - fz * 0.08, p.pos.y + 1.42, p.pos.z + fz * 0.32 + fx * 0.08, 0, 0, 0, 0.12, 0xffffff, 0.3, 0);
  }
  // qui passe tout près, à pied, est salué de temps en temps
  parler(g, c, d, dt) {
    g.tParle -= dt;
    if (!c.aPied || d > 2.8 || g.tParle > 0) return;
    g.tParle = 45;
    const l = VILLAGE[g.nom];
    if (!g.p.assis) g.p.saluer();
    this.c.hud.bulle(g.etq, l[g.i++ % l.length], 3);
  }

  // À chaque image. c : { t, minutes, ego, aPied, danger, ecraseur, obstacles (main.js : OBSTACLES) } ; klaxon(v) : une
  // voiture qui klaxonne (main.js joue le son et la bulle)
  maj(dt, c, klaxon) {
    const cam = this.c.camera.position, dc = Math.hypot(cam.x - this.centre.x, cam.z - this.centre.z);
    // les voitures roulent toujours ; on voit leur conducteur de près
    this.pos.length = 0;
    for (const g of this.gens) if (g.genre === 'touriste' && g.p.m.groupe.visible) this.pos.push(g.p.pos);
    for (const v of this.voitures) {
      if (v.update(dt, c.obstacles, this.pos, this.voitures) && Math.hypot(v.x - c.ego.x, v.z - c.ego.z) < 50) klaxon(v);
      // en bas, au stop : elle remonte (une autre arrive du bourg) quand personne ne regarde
      if (v.attente > 5 && !this.vu(v.x, v.z)) { v.s = 0; v.v = 4; v.attente = 0; v.poser(); }
      const co = v.conducteur;
      if (co) {
        const pres = (v.x - cam.x) ** 2 + (v.z - cam.z) ** 2 < 6400;
        if (co.m.groupe.visible !== pres) co.m.groupe.visible = pres;
        if (pres) { co.pos.set(v.x, v.y, v.z); co.sync(dt, c.t); }
      }
      if (v.cri && v.cri.vu) this.c.hud.placer(v.cri, v.x, v.y + 2.0, v.z, true);
    }
    // les gens : seulement quand on approche du château
    const pres = dc < 260;
    if (pres && !this.prepare) this.preparer();
    if (pres !== this.vus) {
      this.vus = pres;
      for (const g of this.gens) g.p.m.groupe.visible = pres && g.present && !(g.genre === 'serveur' && g.etat === 'dedans');
      for (const m of this.garees) m.visible = pres; // (les voitures garées du village : main.js)
    }
    if (!pres) return;
    for (let k = 0; k < 2 && this.file.length; k++) this.file.shift()();
    const m = ((c.minutes % 1440) + 1440) % 1440, terrasse = m >= 660 && m < 1380, balade = m >= 510 && m < 1170;
    this.n++;
    for (const g of this.gens) {
      const p = g.p, voulu = g.genre === 'table' || g.genre === 'serveur' ? terrasse : balade;
      // ils arrivent et partent hors de la vue
      if (g.present !== voulu && !this.vu(p.pos.x, p.pos.z)) { g.present = voulu; p.m.groupe.visible = voulu && !(g.genre === 'serveur' && g.etat === 'dedans'); }
      if (!g.present) continue;
      // de près, à chaque image ; plus loin, une image sur trois ; au-delà de 150 m, rien
      const d2 = (p.pos.x - cam.x) ** 2 + (p.pos.z - cam.z) ** 2;
      if (d2 > 22500) continue;
      g.dtA += dt;
      if (d2 > 3600 && (this.n + this.gens.indexOf(g)) % 3) continue;
      const dtg = g.dtA; g.dtA = 0;
      const de = Math.hypot(c.ego.x - p.pos.x, c.ego.z - p.pos.z);
      if (g.genre === 'table') this.majTable(g, dtg, c, de);
      else if (g.genre === 'serveur') this.majServeur(g, dtg, c, de);
      else if (g.genre === 'touriste') this.majTouriste(g, dtg, c);
      else if (g.genre === 'banc') { g.t -= dtg; if (g.t < 0) { p.telephone = !p.telephone; g.t = p.telephone ? 6 + Math.random() * 6 : 14 + Math.random() * 20; } p.regard = c.aPied && de < 3.5 ? v2.set(c.ego.x, 1.6 + c.ego.y, c.ego.z) : null; p.sync(dtg, c.t); this.parler(g, c, de, dtg); }
      else if (g.genre === 'balustrade') this.majBalustrade(g, dtg, c, de);
      if (g.etq && g.etq.vu) this.c.hud.placer(g.etq, p.pos.x, (g.y ?? p.pos.y) + (p.assis ? 1.75 : 2.3), p.pos.z, true);
    }
  }
  // attablé : il boit une gorgée de temps en temps (le verre se remplit d'une gorgée à l'autre), regarde son voisin, le
  // serveur qui vient à sa table, ou qui passe tout près
  majTable(g, dt, c, de) {
    const p = g.p;
    if (g.boit) {
      p.tVerre = Math.min(4.3, p.tVerre + dt);
      if ((g.t -= dt) <= 0) { g.t = 10 + Math.random() * 16; p.tVerre = 1.45; }
    }
    const sv = this.gens.find(s => s.genre === 'serveur' && s.R === g.R && s.etat === 'sert');
    p.regard = c.aPied && de < 3.2 ? v2.set(c.ego.x, 1.6 + c.ego.y, c.ego.z) : sv && Math.hypot(sv.p.pos.x - p.pos.x, sv.p.pos.z - p.pos.z) < 2.2 ? v2.set(sv.p.pos.x, sv.p.pos.y + 1.6, sv.p.pos.z) : g.voisin;
    p.sync(dt, c.t);
    this.parler(g, c, de, dt);
  }
  // le serveur : de la porte, par l'allée entre les deux rangs, jusqu'à une table ; il s'y arrête, tourné vers elle ; il
  // revient par le même chemin et rentre (quelques secondes dedans)
  majServeur(g, dt, c, de) {
    const p = g.p, R = g.R;
    g.t -= dt;
    let dx = 0, dz = 0, f = 0;
    if (g.etat === 'dedans') {
      if (g.t > 0) return;
      const T = R.tables[g.table = (g.table + 1 + Math.floor(Math.random() * 2)) % R.tables.length];
      g.pts = [g.P(g.lxP, 0.55), g.P(g.lxP, 1.9), g.P(T.lx, 1.9)]; g.k = 0; g.etat = 'aller';
      p.placer(R.porte.x, R.porte.z, R.axes.rot); p.m.groupe.visible = true;
    }
    if (g.etat === 'aller' || g.etat === 'retour') {
      const q = g.pts[g.k], ex = q.x - p.pos.x, ez = q.z - p.pos.z, d = Math.hypot(ex, ez);
      if (d < 0.12) {
        if (++g.k >= g.pts.length) {
          if (g.etat === 'aller') { g.etat = 'sert'; g.t = 3 + Math.random() * 2; }
          else { g.etat = 'dedans'; g.t = 4 + Math.random() * 5; p.m.groupe.visible = false; return; }
        }
      } else { dx = ex / d; dz = ez / d; f = 1; }
    } else if (g.etat === 'sert') {
      const T = R.tables[g.table];
      p.h = versAngle(p.h, Math.atan2(T.x - p.pos.x, T.z - p.pos.z), dt * 5);
      if (g.t <= 0) { g.etat = 'retour'; g.pts = [g.P(g.lxP, 1.9), g.P(g.lxP, 0.55), { x: R.porte.x, z: R.porte.z }]; g.k = 0; }
    }
    p.regard = c.aPied && de < 3 ? v2.set(c.ego.x, 1.6 + c.ego.y, c.ego.z) : null;
    p.update(dt, dx, dz, f, false, LIBRE, c.t, f ? 1.05 : undefined);
    this.parler(g, c, de, dt);
  }
  // le touriste : un passant (il s'écarte du véhicule) ; à chaque pause, une fois sur deux, il prend le château en photo
  majTouriste(g, dt, c) {
    const t = g.t, p = t.p;
    this.c.passantVit(t, dt, c.danger, c.ecraseur);
    const enPause = t.attente > 0 && t.fuite <= 0 && t.ecrase <= 0;
    if (enPause && !t.pause) { t.photo = t.rnd() < 0.55; t.tFlash = 1.2 + t.rnd(); }
    t.pause = enPause;
    p.telephone = enPause && t.photo;
    if (enPause && t.photo) {
      p.h = versAngle(p.h, Math.atan2(t.vise.x - p.pos.x, t.vise.z - p.pos.z), dt * 3);
      if ((t.tFlash -= dt) <= 0) { this.flash(p); t.tFlash = 2.5 + t.rnd() * 3; }
    }
    const de = Math.hypot(c.ego.x - p.pos.x, c.ego.z - p.pos.z);
    if (t.bulle <= 0 && c.aPied) this.parler(g, c, de, dt);
  }
  // à la balustrade : il regarde la vallée, parfois la prend en photo
  majBalustrade(g, dt, c, de) {
    const p = g.p;
    if ((g.t -= dt) <= 0) { g.photo = !g.photo; g.t = g.photo ? 5 : 9 + Math.random() * 12; g.tFlash = 1.5; }
    p.telephone = g.photo;
    if (g.photo && (g.tFlash -= dt) <= 0) { this.flash(p); g.tFlash = 3; }
    p.h = versAngle(p.h, g.h0, dt * 2);
    p.regard = c.aPied && de < 3 ? v2.set(c.ego.x, 1.6 + c.ego.y, c.ego.z) : null;
    p.update(dt, 0, 0, 0, false, LIBRE, c.t);
    this.parler(g, c, de, dt);
  }

  // les taches de contact ; vu(m, x, z) : main.js, ombrePerso (dessiné ou non selon la distance)
  taches(t, vu) {
    if (!this.vus) return;
    for (const g of this.gens) {
      const p = g.p;
      if (!g.present || !p.m.groupe.visible) continue;
      const x = p.assis ? p.m.groupe.position.x : p.pos.x, z = p.assis ? p.m.groupe.position.z : p.pos.z;
      // assis, à plus de 90 m (une silhouette derrière une table) : ni dessiné, ni sa tache
      if (p.assis && (x - this.c.camera.position.x) ** 2 + (z - this.c.camera.position.z) ** 2 > 8100) { if (p.m.maillage.visible) p.m.maillage.visible = false; continue; }
      if (vu(p.m, x, z)) t.poser(x, z, 0.4, 0.4, 0, g.y ?? p.pos.y);
    }
  }
}
