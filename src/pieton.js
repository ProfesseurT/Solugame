// Le personnage à pied et les passants : déplacement (accélération et freinage doux, virages, demi-tour,
// recul contre un mur, saut de côté) ; la pose est calculée par anim.js.
import * as THREE from 'three';
import { Anim } from './anim.js';
import { angle, versAngle, borne, mix } from './outils.js';

const SAUT = 0.55; // durée d'un saut de côté (s)
const ECRASE = 2.6, RELEVE = 0.45; // mode WTF : aplati (s), dont le temps de se regonfler

/* ---------------------------------------------------------------- personnage à pied */
export class Pieton {
  constructor(modele) {
    this.m = modele; this.pos = new THREE.Vector3(); this.h = 0; this.v = 0;
    this.r = 0.34; this.assis = false;
    // propriétés que le jeu peut régler
    this.regard = null;      // point du monde {x, y, z} à regarder (la tête et le buste suivent), ou null
    this.telephone = false;  // vrai : sort son téléphone et le regarde
    this.volant = null;      // au volant : angle de braquage (rad, positif à gauche) ; null : déduit du mouvement du tracteur
    this.salut = false;      // vrai : quelqu'un à saluer (un signe de la main chaque fois que ça devient vrai)
    this.poste = null;       // au volant du van : son poste de conduite (assise, plancher, volant) ; null : le tracteur
    this.service = null;     // en train de servir un verre : { t, duree, cible } (main.js)
    this.transition = null;  // monter dans un véhicule, en descendre : 0 debout, 1 au volant (gestes.js) ; null sinon
    this.porte = null;       // la pile de cartons qu'on porte (un groupe enfant du personnage, gestes.js), ou null
    this.clavier = false;    // assis au portable du bureau du chai : les mains sur le clavier
    this.verre = 0;          // un verre à la main : secondes qui restent ; tVerre : depuis quand on l'a
    this.tVerre = 0; this.aServir = false; this.servi = -1e9;
    // état du mouvement (lu par l'animation)
    this.hv = 0; this.vr = 0; this.om = 0; this.acc = 0;
    this.choc = 0; this.saut = 0; this.sautT = 0; this.sx = 0; this.sz = 0; this.atterri = 0;
    this.conduite = false; this.maj = false; this.salutAvant = false;
    this.anim = new Anim(modele);
  }
  placer(x, z, h) { this.pos.set(x, 0, z); this.h = h; this.hv = h; this.v = 0; this.vr = 0; this.sautT = 0; this.saut = 0; this.choc = 0; this.sync(0); }
  // un signe de la main (pas plus d'un toutes les 6 s)
  saluer() { const a = this.anim; if (a.tSalut <= 0) { a.salut = 1.9; a.tSalut = 6; } }
  // saut de côté dans la direction (dx, dz)
  sauter(dx, dz) {
    if (this.sautT > 0 || this.assis) return;
    const l = Math.hypot(dx, dz) || 1;
    this.sautT = SAUT; this.sx = dx / l; this.sz = dz / l;
  }
  // dx, dz : direction voulue dans le monde (normée), force 0..1 ; vitesse : vitesse voulue imposée (passants)
  update(dt, dx, dz, force, courir, col, t, vitesse) {
    const px = this.pos.x, pz = this.pos.z, h0 = this.h;
    if (this.choc > 0) this.choc = Math.max(0, this.choc - dt / 0.5);
    if (this.atterri > 0) this.atterri = Math.max(0, this.atterri - dt);
    if (this.sautT > 0) {
      // en l'air : élan de côté, petite parabole, le corps se tourne vers le saut
      this.sautT -= dt;
      const u = 1 - Math.max(0, this.sautT) / SAUT;
      this.pos.x += this.sx * 4.4 * dt; this.pos.z += this.sz * 4.4 * dt;
      this.pos.y = 0.4 * Math.sin(Math.PI * u);
      this.saut = u;
      this.h = versAngle(this.h, Math.atan2(this.sx, this.sz), 14 * dt);
      if (this.sautT <= 0) { this.pos.y = 0; this.saut = 0; this.atterri = 0.28; this.v = 2.4; }
    } else {
      let cible = 0;
      if (force > 0.08 && this.choc < 0.5) {
        cible = vitesse ?? (courir || force > 0.82 ? 5.6 : 1.3 + 2.6 * force);
        const voulu = Math.atan2(dx, dz), ecart = Math.abs(angle(voulu - this.h));
        // on tourne vite à l'arrêt (demi-tour sur place), moins vite lancé
        const vif = this.v < 1.5 ? 10 : Math.max(5.5, 10 - (this.v - 1.5) * 1.1);
        this.h = versAngle(this.h, voulu, vif * dt);
        // on ralentit pour un virage serré, on freine pour un demi-tour
        if (ecart > 0.6) cible *= Math.max(0.08, Math.cos(Math.min(1.5, (ecart - 0.6) * 1.1)));
      }
      // accélération et freinage doux (m/s²)
      const dv = cible - this.v, a = dv > 0 ? (this.v < 1.5 ? 9 : 6.5) : 11;
      this.v += borne(dv * Math.min(1, dt * 8), -a * dt, a * dt);
      if (Math.abs(this.v) > 0.003) { this.pos.x += Math.sin(this.h) * this.v * dt; this.pos.z += Math.cos(this.h) * this.v * dt; }
    }
    // collisions ; lancé contre un mur, on recule d'un pas
    let nx = 0, nz = 0, touche = false;
    if (col.resoudre(this.pos, this.r)) { touche = true; nx += col.nx; nz += col.nz; }
    if (col.rangs(this.pos, this.r, true)) { touche = true; nx += col.nx; nz += col.nz; }
    if (touche && this.choc === 0 && this.sautT <= 0 && this.v > 2.4) {
      const n = Math.hypot(nx, nz) || 1;
      if ((Math.sin(this.h) * nx + Math.cos(this.h) * nz) / n < -0.55) { this.choc = 1; this.v = -1.1; }
    }
    // vitesse réelle (bloqué contre un mur, on ne marche pas sur place), rotation, accélération
    if (dt > 0) {
      const vr = ((this.pos.x - px) * Math.sin(this.h) + (this.pos.z - pz) * Math.cos(this.h)) / dt;
      this.acc += ((vr - this.vr) / dt - this.acc) * Math.min(1, dt * 6);
      this.vr = vr;
      this.om = angle(this.h - h0) / dt;
    }
    this.hv = this.h; this.maj = true;
    this.sync(dt, t);
  }
  sync(dt, t = 0) {
    const g = this.m.groupe;
    if (this.salut && !this.salutAvant) this.saluer();
    this.salutAvant = this.salut;
    if (!this.assis) {
      if (!this.maj) {
        // sans update (clients devant leur commerce) : le corps se tourne vers h en quelques pas
        const h0 = this.hv;
        this.hv = dt > 0 ? versAngle(this.hv, this.h, 4.5 * dt) : this.h;
        this.om = dt > 0 ? angle(this.hv - h0) / dt : 0;
        this.vr = 0;
      }
      g.position.copy(this.pos); g.rotation.y = this.hv;
    }
    this.maj = false;
    this.conduite = this.assis && !!g.parent && !g.parent.isScene;
    this.anim.poser(dt, this, t);
  }
}

/* ---------------------------------------------------------------- passants */
export class Passant {
  constructor(modele, zone, rnd) {
    this.p = new Pieton(modele); this.zone = zone; this.rnd = rnd;
    this.cible = { x: 0, z: 0 }; this.attente = rnd() * 3; this.fuite = 0; this.bulle = 0;
    // chacun son pas : flâneur, pressé
    this.allure = rnd() < 0.15 ? 1.9 + rnd() * 0.4 : 0.9 + rnd() * 0.65;
    this.vu = new THREE.Vector3(); this.tVu = 0; this.ux = 0; this.uz = 1; this.dx = NaN; this.dz = 0; this.fx = 0; this.fz = 0;
    this.ecrase = 0; // mode WTF : aplati par un véhicule, secondes qui restent avant d'être tout à fait relevé
    this.nouvelleCible();
    this.p.placer(this.cible.x, this.cible.z, rnd() * 6.28);
    this.nouvelleCible();
  }
  nouvelleCible() {
    const z = this.zone, r = this.rnd;
    this.cible.x = z.x0 + r() * (z.x1 - z.x0); this.cible.z = z.z0 + r() * (z.z1 - z.z0);
  }
  // Mode WTF : un véhicule lui roule dessus. Il s'aplatit comme une crêpe, reste par terre, puis se regonfle d'un coup,
  // avec un rebond (un gag de dessin animé : personne n'est blessé). Rend faux s'il l'est déjà.
  ecraser() {
    if (this.ecrase > 0) return false;
    this.ecrase = ECRASE; this.fuite = 0; this.p.sautT = 0;
    return true;
  }
  // danger : véhicule {x, z, v} (h facultatif : son cap ; wtf : mode WTF, il ne s'écarte pas) ; renvoie true quand le
  // passant vient de crier, 'releve' quand il se relève après avoir été aplati
  update(dt, danger, col, t) {
    const p = this.p;
    let dx = 0, dz = 0, f = 0, cri = false, vit;
    this.bulle = Math.max(0, this.bulle - dt);
    if (this.ecrase > 0) {
      this.ecrase -= dt;
      const g = p.m.groupe, E = p.m.echelle, u = ECRASE - this.ecrase;
      let sy = 0.1, sxz = 1.5;
      if (u < 0.06) { sy = mix(1, 0.1, u / 0.06); sxz = mix(1, 1.5, u / 0.06); }
      else if (this.ecrase < RELEVE) {
        const r = 1 - Math.max(0, this.ecrase) / RELEVE, k = Math.min(1, r * 1.6), b = Math.sin(Math.PI * r);
        sy = 0.1 + 0.9 * k + 0.28 * b; sxz = 1.5 - 0.5 * k - 0.1 * b;
      }
      g.scale.set(E * sxz, E * sy, E * sxz);
      p.update(dt, 0, 0, 0, false, col, t);
      if (this.ecrase > 0) return false;
      g.scale.setScalar(E);
      // relevé : il s'en va en râlant, à l'écart de celui qui l'a aplati
      if (danger) { const ex = p.pos.x - danger.x, ez = p.pos.z - danger.z, l = Math.hypot(ex, ez) || 1; this.fx = ex / l; this.fz = ez / l; this.fuite = 1.4; }
      this.bulle = 4;
      return 'releve';
    }
    if (danger) {
      // direction du véhicule : son cap s'il est donné, sinon son dernier déplacement
      if (danger.h !== undefined) { const s = danger.v < 0 ? -1 : 1; this.ux = Math.sin(danger.h) * s; this.uz = Math.cos(danger.h) * s; }
      else if (!Number.isNaN(this.dx)) {
        const mx = danger.x - this.dx, mz = danger.z - this.dz, l = Math.hypot(mx, mz);
        if (l > 1e-3) { this.ux = mx / l; this.uz = mz / l; }
      }
      this.dx = danger.x; this.dz = danger.z;
      const ex = p.pos.x - danger.x, ez = p.pos.z - danger.z, d = Math.hypot(ex, ez);
      // Mode WTF : il essaie toujours de s'écarter, mais réagit plus tard (on peut l'attraper) ; le nez dans son téléphone,
      // il ne voit rien venir
      const wtf = danger.wtf, distrait = wtf && (p.telephone || p.anim.wTel > 0.5);
      if (distrait) {
        if (Math.abs(danger.v) > 1.5 && d < 3 && this.bulle <= 0) { this.bulle = 4; cri = true; }
      } else if (Math.abs(danger.v) > 1.5) {
        const devant = ex * this.ux + ez * this.uz, cote = ex * this.uz - ez * this.ux, portee = wtf ? 1.2 + Math.abs(danger.v) * 0.5 : 2.5 + Math.abs(danger.v) * 0.9;
        if (devant > -0.5 && devant < portee && Math.abs(cote) < 2.4 && p.sautT <= 0 && this.fuite < 0.3) {
          // il fonce droit dessus : saut de côté, hors de sa trajectoire
          const s = Math.abs(cote) > 0.15 ? Math.sign(cote) : (this.rnd() < 0.5 ? 1 : -1);
          p.sauter(this.uz * s, -this.ux * s);
          this.fuite = 1.5; this.fx = this.uz * s; this.fz = -this.ux * s;
          if (this.bulle <= 0) { this.bulle = 4; cri = true; }
        } else if (d < (wtf ? 4 : 6)) {
          this.fuite = Math.max(this.fuite, 1.2); this.fx = ex / (d || 1); this.fz = ez / (d || 1);
          if (this.bulle <= 0) { this.bulle = 4; cri = true; }
        }
      }
      // on regarde passer le tracteur
      if (d < 16 && Math.abs(danger.v) > 0.5) { this.vu.set(danger.x, 1.6, danger.z); this.tVu = 1.2; }
    } else this.dx = NaN;
    if (p.aServir || p.verre > 0) {
      // on lui sert un verre, ou il le boit : il s'arrête (main.js le tourne vers celui qui sert)
      this.attente = Math.max(this.attente, 1);
    } else if (this.fuite > 0) {
      this.fuite -= dt; dx = this.fx; dz = this.fz; f = 1; vit = 3.4; // petite course pour s'écarter
    } else if (this.attente > 0) {
      this.attente -= dt;
    } else {
      dx = this.cible.x - p.pos.x; dz = this.cible.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.5) {
        // une pause, parfois longue (on regarde autour, on consulte son téléphone)
        this.attente = this.rnd() < 0.25 ? 6 + this.rnd() * 9 : 0.8 + this.rnd() * 4;
        this.nouvelleCible(); dx = dz = 0;
      } else { dx /= d; dz /= d; f = 1; vit = Math.min(this.allure, 0.35 + d * 0.9); }
    }
    this.tVu -= dt;
    p.regard = this.tVu > 0 ? this.vu : null;
    p.update(dt, dx, dz, f, false, col, t, vit);
    return cri;
  }
}
