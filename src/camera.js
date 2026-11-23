// La caméra : elle suit le personnage ou le véhicule, cadre une scène (gestes.js), se pose dans une pièce (le bureau et
// la halle du chai), tourne autour du personnage sur l'accueil.
import * as THREE from 'three';
import { angle, borne, amortir as lisser } from './outils.js';
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
    const dist = (vehicule ? 9.4 + 2.8 * kv : 6.2 + 0.5 * kv) * this.zoom;
    const haut = (vehicule ? 4.6 + 0.8 * kv : 3.0) * (0.75 + 0.25 * this.zoom);
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
    this.pos.set(camX, this.cy + Math.max(hh, this.plancher), camZ);
    this.regard.set(px + yx * 3.2, this.cy + (vehicule ? 1.8 : 1.6) + Math.max(0, -this.tangage) * 4, pz + yz * 3.2);
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
  // vue de l'accueil : tour lent autour d'un point
  // large : le personnage se place à droite du titre ; étroit : en haut de l'écran
  orbite(t, cx, cz, large) {
    const a = 0.55 + Math.sin(t * 0.09) * 0.4, r = large ? 8.5 : 7;
    const px = cx + Math.sin(a) * r, pz = cz + Math.cos(a) * r;
    this.c.position.set(px, large ? 2.6 : 3.4, pz);
    const dx = (cx - px) / r, dz = (cz - pz) / r;
    if (large) this.c.lookAt(cx + dz * 2.6, 1.5, cz - dx * 2.6);
    else this.c.lookAt(cx - dx * 2.5, 0, cz - dz * 2.5); // vise devant le personnage : il monte dans le cadre
    this.pret = false;
  }
}
