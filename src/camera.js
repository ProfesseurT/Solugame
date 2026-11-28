// La caméra : elle suit le personnage ou le véhicule, cadre une scène (gestes.js), se pose dans une pièce (le bureau et
// la halle du chai), suit à hauteur d'homme dans les bureaux de Solumatic, enchaîne les plans de l'accueil.
import * as THREE from 'three';
import { angle, borne, amortir as lisser, lisse } from './outils.js';
import { sol } from './relief.js';

/* ---------------------------------------------------------------- caméra qui suit
   Suivi souple, avec un peu d'avance dans le sens de la marche ; plus loin, plus haut et plus large
   quand le tracteur prend de la vitesse. Les bâtiments rapprochent la caméra sans à-coup (elle rentre
   vite, ressort lentement). On peut la tourner à la main (deux doigts, souris, clavier, manette) :
   elle revient derrière toute seule après un moment. */

export class Camera {
  constructor(cam) {
    this.c = cam; this.yaw = 0; this.pos = new THREE.Vector3(); this.regard = new THREE.Vector3();
    this.pret = false; this.secousse = 0; this.dist = 6.2; this.haut = 2.9;
    this.cx = 0; this.cz = 0; this.cy = 0; // point suivi, lissé (cy : la hauteur du sol, sur la colline du château)
    this.plancher = 0;              // au-dessus du relief derrière soi (lissé)
    this.ax = 0; this.az = 0;       // avance dans le sens de la marche, lissée
    this.dCol = 99;                 // distance laissée libre par les bâtiments, lissée
    this.tMain = 99;                // temps depuis la dernière rotation à la main
    this.tangage = 0;               // hauteur choisie à la main (négatif : plus bas)
    this.zoom = 1;                  // distance choisie à la main (pincer, molette)
    this.fovBase = cam.fov; this.fovPose = cam.fov; this.fovPlus = 0;
    this.ctrl = null; this.tb = 0; this.recentre = false;
    this.toits = [];                // les zones couvertes où l'on entre en véhicule (main.js : le hangar du domaine)
  }
  // relie la caméra aux commandes (deux doigts, souris, touches J L I K, stick droit de la manette)
  lier(ctrl) { this.ctrl = ctrl; }
  tourner(dyaw, dtang) {
    this.yaw = angle(this.yaw + dyaw);
    this.tangage = borne(this.tangage + dtang, -0.32, 0.7);
    this.tMain = 0;
  }
  suivre(dt, x, z, h, v, vehicule, col, engin = null, y = 0) {
    /* -- à la main */
    const ct = this.ctrl;
    if (ct) {
      const r = ct.cam;
      if (r.x || r.y) { this.tourner(-r.x, r.y); r.x = r.y = 0; }
      if (ct.kcam || ct.kcamY) this.tourner(-ct.kcam * 2.1 * dt, ct.kcamY * 1.1 * dt);
      if (r.zoom !== 1) { this.zoom = borne(this.zoom * r.zoom, 0.6, 1.6); r.zoom = 1; }
      if (r.recentrer) { r.recentrer = false; this.tMain = 99; this.recentre = true; }
    }
    this.tMain += dt;
    const pret = this.pret, av = Math.abs(v);

    /* -- distance, hauteur et champ de vision selon la vitesse */
    const kv = vehicule ? Math.min(1, av / 12.5) : Math.min(1, av / 5.6);
    // l'enjambeur, haut de 4 m : la caméra recule, monte et regarde plus haut (sa cabine, le rang qu'il enjambe)
    const grand = vehicule && engin && engin.genre === 'enjambeur' ? 1 : 0;
    // à vélo : plus près et plus bas qu'en voiture, un peu plus loin qu'à pied
    const velo = vehicule && engin && engin.genre === 'velo' ? 1 : 0;
    const dist = (vehicule ? (9.4 + 2.8 * kv + 1.8 * grand) * (1 - 0.36 * velo) : 6.2 + 0.5 * kv) * this.zoom;
    const haut = (vehicule ? (4.6 + 0.8 * kv + 2.2 * grand) * (1 - 0.4 * velo) : 3.0) * (0.75 + 0.25 * this.zoom);
    const kd = pret ? lisser(dt, 2.2) : 1;
    this.dist += (dist - this.dist) * kd; this.haut += (haut - this.haut) * kd;
    this.fovPlus += ((vehicule ? 9 * kv * kv : 2.5 * kv * kv) - this.fovPlus) * (pret ? lisser(dt, 1.8) : 1);

    /* -- revient derrière après un délai si on l'a tournée à la main ; sinon suit le cap */
    const delai = vehicule ? 1.6 : 2.6;
    if (!pret) { this.tMain = 99; this.tangage = 0; }
    if (this.tMain > delai) {
      const reprise = Math.min(1, (this.tMain - delai) / 1.2);
      const d = angle(h - this.yaw);
      let k;
      if (vehicule) k = v > 0.4 ? 2.1 * Math.min(1, av / 4) : v < -0.4 ? 0.5 : 0;
      else { const face = (1 + Math.cos(d)) / 2; k = 1.5 * Math.min(1, av / 3) * face * face; } // à pied, ne se retourne pas quand on revient vers elle
      if (this.recentre) { k = Math.max(k, 4); if (Math.abs(d) < 0.03) this.recentre = false; } // recentrage demandé (touche C) : franchement derrière
      this.yaw = angle(this.yaw + d * lisser(dt, k * reprise));
      this.tangage *= 1 - lisser(dt, 0.9 * reprise);
    }

    /* -- point suivi, avec de l'avance dans le sens de la marche */
    const fx = Math.sin(h), fz = Math.cos(h);
    const la = vehicule ? borne(v * 0.3, -1.2, 3.6) : borne(v * 0.22, 0, 1.2);
    const ka = pret ? lisser(dt, 2.4) : 1;
    this.ax += (fx * la - this.ax) * ka; this.az += (fz * la - this.az) * ka;
    const kc = pret ? lisser(dt, 11) : 1;
    this.cx += (x + this.ax - this.cx) * kc; this.cz += (z + this.az - this.cz) * kc; this.cy += (y - this.cy) * (pret ? lisser(dt, 6) : 1);
    let px = this.cx, pz = this.cz;
    // lancé contre un bâtiment, l'avance peut faire entrer le point suivi dans le mur : on la raccourcit (sinon la caméra
    // bute dès le départ, se colle au point et monte dans le toit)
    if (col.dedans(px, pz) && !col.dedans(x, z)) {
      for (let k = 0; k < 4 && col.dedans(px, pz); k++) { px = x + (px - x) * 0.5; pz = z + (pz - z) * 0.5; }
      if (col.dedans(px, pz)) { px = x; pz = z; }
    }

    /* -- les bâtiments : on cherche le premier obstacle entre le point suivi et la caméra */
    const yx = Math.sin(this.yaw), yz = Math.cos(this.yaw);
    let libre = this.dist + 0.6;
    const n = Math.ceil(libre / 0.45);
    for (let s = 1; s <= n; s++) {
      const dd = libre * s / n;
      if (col.dedans(px - yx * dd, pz - yz * dd)) { libre = Math.max(1.6, libre * (s - 1) / n - 0.5); break; }
    }
    if (!pret) this.dCol = libre;
    else this.dCol += (libre - this.dCol) * lisser(dt, libre < this.dCol ? 14 : 1.8);
    const d = Math.min(this.dist, this.dCol);
    const hh = Math.max(1.1, this.haut + this.tangage * this.dist) + (this.dist - d) * 0.45;

    // en descente, le relief derrière soi monte : la caméra reste au-dessus (en douceur)
    const camX = px - yx * d, camZ = pz - yz * d, sous = sol(camX, camZ) + 1.3 - this.cy;
    this.plancher += (sous - this.plancher) * (pret ? lisser(dt, sous > this.plancher ? 9 : 3) : 1);
    // sous un toit (le hangar, Teddy, 26/11/2026 : « ça nous coince sous le toit ») : la caméra reste sous la charpente quand
    // elle y est, ou quand le véhicule y est (vue de dehors, sous l'avant-toit) ; elle y descend et en remonte en douceur, à
    // mesure qu'on y entre ou qu'on en sort (k : de 2,5 m dehors à 1 m dedans)
    let yc = this.cy + Math.max(hh, this.plancher);
    for (let i = 0; i < this.toits.length; i++) {
      const T = this.toits[i];
      const dC = Math.min(camX - T.x0, T.x1 - camX, camZ - T.z0, T.z1 - camZ), dV = Math.min(x - T.x0, T.x1 - x, z - T.z0, T.z1 - z);
      const k = lisse(borne((Math.max(dC, dV) + 2.5) / 3.5, 0, 1));
      if (k > 0) yc = Math.min(yc, T.y + (1 - k) * 8);
    }
    this.pos.set(camX, yc, camZ);
    this.regard.set(px + yx * 3.2, this.cy + (vehicule ? 1.8 + 1.2 * grand : 1.6) + Math.max(0, -this.tangage) * 4, pz + yz * 3.2);
    this.pret = true;

    /* -- secousses : choc (main règle secousse), cahots du tracteur, ronron du moteur ; bruit doux, pas de hasard */
    this.tb += dt;
    if (this.secousse > 0) this.secousse = Math.max(0, this.secousse - dt * 2.2);
    let amp = this.secousse * this.secousse * 0.3;
    if (engin) amp += (engin.cahot || 0) * 0.06 + (Math.abs(engin.v) > 0.1 ? 0.004 : 0.006);
    const t = this.tb;
    const ox = (Math.sin(t * 31.7) + 0.6 * Math.sin(t * 17.3 + 1.3)) * amp * 0.5;
    const oy = (Math.sin(t * 27.1 + 0.7) + 0.6 * Math.sin(t * 13.9 + 2.1)) * amp * 0.5;
    this.c.position.set(this.pos.x + ox * yz, this.pos.y + oy, this.pos.z - ox * yx);
    this.c.lookAt(this.regard.x, this.regard.y + oy * 0.4, this.regard.z);

    /* -- champ de vision : main le règle selon l'écran (redimensionner), on ajoute la vitesse par-dessus */
    if (Math.abs(this.c.fov - this.fovPose) > 1e-3) this.fovBase = this.c.fov;
    const fov = this.fovBase + this.fovPlus;
    if (Math.abs(fov - this.c.fov) > 0.02) { this.c.fov = fov; this.c.updateProjectionMatrix(); }
    this.fovPose = this.c.fov;
  }
  // une scène cadrée (gestes.js : charger, décharger) : la caméra vient doucement dans l'axe c.h, autour du point (c.x, c.z) ;
  // tournée à la main, elle reste où on la met un moment
  cadrer(dt, c, col) {
    if (this.tMain > 1.5) this.yaw = angle(this.yaw + angle(c.h - this.yaw) * lisser(dt, 1.6));
    this.suivre(dt, c.x, c.z, c.h, 0, false, col, null, sol(c.x, c.z));
  }
  // Dans le bureau du chai (B : lieux.bureau) : la caméra posée dans un coin suit le personnage (x, z) du regard ; au
  // portable (proche), elle passe derrière son épaule
  salle(dt, B, x, z, proche) {
    const P = proche ? B.prise : B.camera, k = this.pret ? lisser(dt, proche ? 2.2 : 3.2) : 1;
    const rx = proche ? B.portable.x : B.centre.x + (x - B.centre.x) * 0.6, rz = proche ? B.portable.z : B.centre.z + (z - B.centre.z) * 0.6;
    this.pos.x += (P.x - this.pos.x) * k; this.pos.y += (P.y - this.pos.y) * k; this.pos.z += (P.z - this.pos.z) * k;
    this.regard.x += (rx - this.regard.x) * k; this.regard.y += ((proche ? B.portable.y : B.centre.y) - this.regard.y) * k; this.regard.z += (rz - this.regard.z) * k;
    this.c.position.copy(this.pos); this.c.lookAt(this.regard);
    if (Math.abs(this.c.fov - this.fovBase) > 0.02) { this.c.fov = this.fovBase; this.c.updateProjectionMatrix(); }
    this.fovPose = this.c.fov; this.fovPlus = 0;
    this.pret = true;
  }
  // Dans les bureaux de Solumatic (solumatic.js) : la caméra suit derrière le personnage, à hauteur d'homme, sous le faux
  // plafond ; on la tourne à la main comme dehors (pincer : plus près, plus loin), elle revient derrière toute seule. Les
  // cloisons la rapprochent (murs : des boîtes [x0, z0, x1, z1] ; elle reste à 25 cm de leur face) : elle rentre vite,
  // ressort lentement, et monte un peu quand elle est tout près. Rend sa distance au personnage (de tout près, main.js ne
  // le dessine plus).
  // (plantes : [x, z, rayon] du feuillage des grandes plantes, à la hauteur de la caméra : dans un angle, elle s'arrête
  // devant au lieu d'entrer dans le feuillage et de ne plus montrer qu'un mur de feuilles ; Solumatic, 28/11/2026)
  interieur(dt, x, z, h, v, murs, plafond, portes = [], plantes = []) {
    const ct = this.ctrl;
    if (ct) {
      const r = ct.cam;
      if (r.x || r.y) { this.tourner(-r.x, r.y); r.x = r.y = 0; }
      if (ct.kcam || ct.kcamY) this.tourner(-ct.kcam * 2.1 * dt, ct.kcamY * 1.1 * dt);
      if (r.zoom !== 1) { this.zoom = borne(this.zoom * r.zoom, 0.6, 1.4); r.zoom = 1; }
      if (r.recentrer) { r.recentrer = false; this.tMain = 99; this.recentre = true; }
    }
    this.tMain += dt;
    const pret = this.pret, av = Math.abs(v);
    if (!pret) { this.tMain = 99; this.tangage = 0; }
    if (this.tMain > 2.2) {
      const reprise = Math.min(1, (this.tMain - 2.2) / 1.2), d = angle(h - this.yaw), face = (1 + Math.cos(d)) / 2;
      let k = 1.7 * Math.min(1, av / 2.5) * face * face;
      if (this.recentre) { k = Math.max(k, 4); if (Math.abs(d) < 0.03) this.recentre = false; }
      this.yaw = angle(this.yaw + d * lisser(dt, k * reprise));
      this.tangage *= 1 - lisser(dt, 0.9 * reprise);
    }
    // le point suivi : la nuque, avec un peu d'avance dans le sens de la marche
    const la = borne(v * 0.16, 0, 0.6), ka = pret ? lisser(dt, 2.4) : 1;
    this.ax += (Math.sin(h) * la - this.ax) * ka; this.az += (Math.cos(h) * la - this.az) * ka;
    const kc = pret ? lisser(dt, 12) : 1;
    this.cx += (x + this.ax - this.cx) * kc; this.cz += (z + this.az - this.cz) * kc;
    const px = this.cx, pz = this.cz, yx = Math.sin(this.yaw), yz = Math.cos(this.yaw);
    // jusqu'où reculer sans entrer dans un mur (à 25 cm près) ; la première embrasure traversée (sP) : on y passe sous le
    // linteau, la caméra plus bas
    const D = 2.6 * this.zoom, m = 0.25;
    let libre = D, sP = 0;
    for (let s = 0.08; s <= D + 0.1; s += 0.08) {
      const qx = px - yx * s, qz = pz - yz * s;
      let dedans = false;
      for (let i = 0; i < murs.length; i++) { const b = murs[i]; if (qx > b[0] - m && qx < b[2] + m && qz > b[1] - m && qz < b[3] + m) { dedans = true; break; } }
      if (dedans) { libre = Math.max(0.15, s - 0.08); break; }
      // (une plante tout contre soi n'avance pas la caméra jusque dans la tête : 0,6 m au moins)
      let plante = false;
      if (s > 0.5) for (let i = 0; i < plantes.length; i++) { const p = plantes[i], ex = qx - p[0], ez = qz - p[1]; if (ex * ex + ez * ez < p[2] * p[2]) { plante = true; break; } }
      if (plante) { libre = Math.max(0.6, s - 0.08); break; }
      if (!sP) for (let i = 0; i < portes.length; i++) { const b = portes[i]; if (qx > b[0] - 0.1 && qx < b[2] + 0.1 && qz > b[1] - 0.1 && qz < b[3] + 0.1) { sP = s; break; } }
    }
    if (!pret) this.dCol = libre;
    else this.dCol += (libre - this.dCol) * lisser(dt, libre < this.dCol ? 16 : 2.2);
    const d = Math.min(D, this.dCol), el = 0.3 + this.tangage * 0.45;
    let hy = Math.min(plafond - 0.3, 1.55 + d * Math.sin(el) + (D - d) * 0.18);
    // la ligne de la nuque à la caméra passe sous le linteau (2,1 m) de l'embrasure qu'elle traverse ; la hauteur lissée
    if (sP && sP < d) hy = Math.min(hy, 1.55 + 0.42 * d / sP);
    this.hInt = pret && this.hInt != null ? this.hInt + (hy - this.hInt) * lisser(dt, 5) : hy; hy = this.hInt;
    this.pos.set(px - yx * d * Math.cos(el), hy, pz - yz * d * Math.cos(el));
    this.regard.set(px + yx * 1.6, 1.15 - Math.max(0, -this.tangage) * 1.5 + Math.max(0, this.tangage) * 0.5, pz + yz * 1.6);
    this.c.position.copy(this.pos); this.c.lookAt(this.regard);
    const fov = this.fovBase + 6;
    if (Math.abs(this.c.fov - this.fovPose) > 1e-3) this.fovBase = this.c.fov;
    if (Math.abs(fov - this.c.fov) > 0.02) { this.c.fov = fov; this.c.updateProjectionMatrix(); }
    this.fovPose = this.c.fov; this.fovPlus = 6;
    this.pret = true;
    return d;
  }
  // Un plan de l'accueil (main.js : PLANS), à la fraction u de sa durée : la caméra glisse de P.de à P.a en regardant de
  // P.vise à P.viseA. Large : le sujet passe à droite du titre ; étroit : en haut de l'écran, au-dessus des boutons.
  plan(P, u, large) {
    const c = this.c, d = P.de, a = P.a, v = P.vise, w = P.viseA || v;
    c.position.set(d[0] + (a[0] - d[0]) * u, d[1] + (a[1] - d[1]) * u, d[2] + (a[2] - d[2]) * u);
    const tx = v[0] + (w[0] - v[0]) * u, ty = v[1] + (w[1] - v[1]) * u, tz = v[2] + (w[2] - v[2]) * u;
    const dx = tx - c.position.x, dz = tz - c.position.z, l = Math.hypot(dx, dz) || 1, k = l * (P.decale ?? 0.3);
    // vise à gauche du sujet (il passe à droite), ou plus bas (il monte dans le cadre)
    if (large) this.regard.set(tx + dz / l * k, ty, tz - dx / l * k); else this.regard.set(tx, ty - l * (P.decaleV ?? P.decale * 0.75), tz);
    c.lookAt(this.regard);
    this.pret = false;
  }
}
