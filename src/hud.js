// Interface par-dessus le monde : mini-carte, argent, étoiles de retard, objectif,
// sous-titres, bannières, étiquettes posées sur les objets du monde.
import * as THREE from 'three';
import { ECH } from './monde.js';
import { $ } from './outils.js';

const v3 = new THREE.Vector3();
const TIRETS = [9, 6], PLEIN = [], P = { x: 0, y: 0 };

export class Hud {
  constructor(fondCarte) {
    this.fond = fondCarte;
    this.cv = $('minimap'); this.ctx = this.cv.getContext('2d');
    this.file = []; this.ligne = null; this.tLigne = 0; this.finDialogue = null;
    this.tBan = 0; this.tRadio = 0;
    this.argentV = 0; this.argentAff = 0;
    this.nEtoiles = 0;
    this.etiquettes = [];
    this.mc = { px: 1e9, pz: 0, yaw: 0, h: 0, cx: 0, cz: 0, zoom: 0, couleur: '', route: null, vk: 0, n: 0 };
  }

  /* mini-carte orientée comme la caméra : redessinée seulement si quelque chose a bougé,
     et au plus une image sur deux (30 fois par seconde suffisent à l'œil). vehs : à pied, les véhicules du domaine
     ([{ pos, h }]), repérés au bord de la carte quand ils sont loin ; au volant, null */
  carte(px, pz, yaw, h, cible, zoom, couleur, route, vehs) {
    const m = this.mc, cx = cible ? cible.x : 1e9, cz = cible ? cible.z : 1e9;
    let vk = 0;
    if (vehs) for (const v of vehs) vk += v.pos.x * 3.1 + v.pos.z * 7.3 + v.h + 1;
    if (++m.n < 2 && m.route === route) return;
    if (Math.abs(px - m.px) + Math.abs(pz - m.pz) < 0.08 && Math.abs(yaw - m.yaw) < 0.004 && Math.abs(h - m.h) < 0.01 && cx === m.cx && cz === m.cz && zoom === m.zoom && couleur === m.couleur && route === m.route && vk === m.vk) return;
    m.n = 0; m.px = px; m.pz = pz; m.yaw = yaw; m.h = h; m.cx = cx; m.cz = cz; m.zoom = zoom; m.couleur = couleur; m.route = route; m.vk = vk;
    const c = this.ctx, W = this.cv.width, R = W / 2;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#4f6a36'; c.fillRect(0, 0, W, W);
    c.save();
    c.translate(R, R); c.rotate(yaw - Math.PI);
    const k = zoom / ECH; c.scale(k, k);
    c.drawImage(this.fond, -(px + 200) * ECH, -(pz + 200) * ECH);
    if (route) {
      // l'itinéraire de la tournée, dessiné par-dessus la carte
      c.strokeStyle = couleur; c.lineWidth = 5 / k; c.lineJoin = 'round'; c.lineCap = 'round';
      TIRETS[0] = 9 / k; TIRETS[1] = 6 / k;
      c.setLineDash(TIRETS);
      c.beginPath();
      for (let i = 0; i < route.length; i++) { const X = (route[i][0] - px) * ECH, Z = (route[i][1] - pz) * ECH; if (i) c.lineTo(X, Z); else c.moveTo(X, Z); }
      c.stroke(); c.setLineDash(PLEIN);
    }
    c.restore();
    // un point du monde sur la carte (relatif au centre), ramené au bord s'il est trop loin
    const th = yaw - Math.PI, ct = Math.cos(th), st = Math.sin(th);
    const surCarte = (x, z, marge) => {
      const dx = (x - px) * zoom, dz = (z - pz) * zoom, lim = R - marge;
      let rx = dx * ct - dz * st, ry = dx * st + dz * ct;
      const d = Math.hypot(rx, ry);
      if (d > lim) { rx *= lim / d; ry *= lim / d; }
      P.x = R + rx; P.y = R + ry;
      return P;
    };
    // les véhicules du domaine (à pied) : un petit rectangle bleu cerclé de blanc (les maisons sont claires), dans le
    // sens du véhicule
    if (vehs) {
      c.fillStyle = '#3d8bff'; c.strokeStyle = '#fff'; c.lineWidth = 3;
      for (const v of vehs) {
        const q = surCarte(v.pos.x, v.pos.z, 10);
        c.save(); c.translate(q.x, q.y); c.rotate(yaw - v.h);
        c.beginPath(); c.rect(-5.5, -8.5, 11, 17); c.stroke(); c.fill();
        c.restore();
      }
    }
    if (cible) {
      const q = surCarte(cible.x, cible.z, 14);
      c.fillStyle = couleur; c.strokeStyle = '#fff'; c.lineWidth = 4;
      c.beginPath(); c.arc(q.x, q.y, 11, 0, 7); c.fill(); c.stroke();
    }
    c.translate(R, R); c.rotate(yaw - h);
    c.fillStyle = '#fff'; c.strokeStyle = '#1d1a26'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, -15); c.lineTo(11, 12); c.lineTo(0, 6); c.lineTo(-11, 12); c.closePath();
    c.stroke(); c.fill();
  }

  /* sous-titres : file de répliques */
  dire(lignes, fin) {
    this.file.push(...lignes.map(l => ({ ...l })));
    if (fin) this.file[this.file.length - 1].fin = fin;
    if (!this.ligne) this.suivante();
  }
  suivante() {
    const el = $('sous-titre');
    this.ligne = this.file.shift() || null;
    if (!this.ligne) { el.classList.remove('vu'); return; }
    el.textContent = '';
    if (this.ligne.qui) { const b = document.createElement('b'); b.textContent = this.ligne.qui + ' '; el.appendChild(b); }
    el.appendChild(document.createTextNode(this.ligne.txt));
    el.classList.add('vu');
    this.tLigne = Math.max(2.4, 1.2 + this.ligne.txt.length * 0.05);
  }
  get parle() { return !!this.ligne; }
  // oublie les répliques en attente (sauf celles qui déclenchent une suite)
  vider() { for (let i = this.file.length - 1; i >= 0; i--) if (!this.file[i].fin) this.file.splice(i, 1); if (this.ligne && !this.ligne.fin) this.tLigne = Math.min(this.tLigne, 0.2); }

  objectif(txt) {
    const el = $('objectif');
    el.textContent = txt; el.classList.remove('neuf'); void el.offsetWidth; el.classList.add('neuf');
  }
  banniere(titre, sous, duree = 4) {
    $('ban-t').textContent = titre; $('ban-s').textContent = sous || '';
    const el = $('banniere'); el.classList.remove('vu'); void el.offsetWidth; el.classList.add('vu');
    this.tBan = duree;
  }
  // bandeau de la radio, à la montée dans un véhicule ou quand on la coupe ou la rallume ; il se touche (couper, rallumer)
  radio(allumee, tactile) {
    const el = $('radio');
    el.querySelector('b').textContent = allumee ? 'Radio Sarment' : 'Radio coupée';
    el.querySelector('span').textContent = allumee ? (tactile ? 'La musette qui décoiffe · touchez pour couper' : 'La musette qui décoiffe · R pour couper')
      : (tactile ? 'Touchez pour la rallumer' : 'R pour la rallumer');
    el.classList.add('vu'); this.tRadio = 3.4;
  }
  etoiles(n) {
    const els = $('etoiles').children;
    for (let i = 0; i < els.length; i++) els[i].classList.toggle('on', i < n);
    if (n > this.nEtoiles) { const e = $('etoiles'); e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); }
    this.nEtoiles = n;
  }
  argent(v) { this.argentV = v; }
  heure(txt) { if (this.hTxt !== txt) { this.hTxt = txt; $('heure').textContent = txt; $('tel-h').textContent = txt; } }
  notifier(n) {
    const b = $('badge'); b.textContent = n || ''; b.hidden = !n;
    const p = $('poche'); p.classList.toggle('alerte', !!n);
    if (n) { p.classList.remove('vibre'); void p.offsetWidth; p.classList.add('vibre'); }
  }

  /* étiquettes accrochées à un point du monde */
  etiquette(texte, classe, auToucher) {
    // pas de bouton : un toucher court sur l'étiquette est traité par le canevas (main.js, toucher)
    const el = document.createElement('span');
    el.className = 'etiquette ' + (classe || ''); el.textContent = texte; el.hidden = true;
    $('etiquettes').appendChild(el);
    const o = { el, vu: false, x: 0, y: 0, z: 0, t: 0, sx: -1e9, sy: -1e9 };
    this.etiquettes.push(o);
    return o;
  }
  placer(o, x, y, z, vu) { o.x = x; o.y = y; o.z = z; o.vu = vu; }

  update(dt, camera, w, h) {
    if (this.ligne) {
      this.tLigne -= dt;
      if (this.tLigne <= 0) { const fin = this.ligne.fin; this.suivante(); if (fin) fin(); }
    }
    if (this.tBan > 0) { this.tBan -= dt; if (this.tBan <= 0) $('banniere').classList.remove('vu'); }
    if (this.tRadio > 0) { this.tRadio -= dt; if (this.tRadio <= 0) $('radio').classList.remove('vu'); }
    if (this.argentAff !== this.argentV) {
      const d = this.argentV - this.argentAff;
      this.argentAff += Math.sign(d) * Math.max(1, Math.min(Math.abs(d), Math.abs(d) * dt * 4));
      if (Math.abs(this.argentV - this.argentAff) < 1) this.argentAff = this.argentV;
      $('argent-v').textContent = Math.round(this.argentAff).toLocaleString('fr-FR') + ' €';
    }
    for (const o of this.etiquettes) {
      if (o.t > 0) { o.t -= dt; if (o.t <= 0) o.vu = false; }
      let vis = o.vu;
      if (vis) {
        v3.set(o.x, o.y, o.z).project(camera);
        vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
        // n'écrit dans la page que si l'étiquette a bougé d'au moins un demi-pixel
        const sx = Math.round((v3.x + 1) / 2 * w * 2) / 2, sy = Math.round((1 - v3.y) / 2 * h * 2) / 2;
        if (vis && (sx !== o.sx || sy !== o.sy)) { o.sx = sx; o.sy = sy; o.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`; }
      }
      if (o.el.hidden === vis) o.el.hidden = !vis;
    }
  }
}
