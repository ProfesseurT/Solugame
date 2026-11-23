// Entrées : un manche invisible au doigt (ou à la souris), deux doigts pour tourner la caméra,
// le clavier, la manette, les touchers courts.
// zone morte ronde d'un stick de manette, puis remise à l'échelle 0..1
import { borne } from './outils.js';
function morte(x, y, z) {
  const m = Math.hypot(x, y);
  if (m < z) return 0;
  return Math.min(1, (m - z) / (1 - z)) / m;
}

export class Controles {
  constructor(zone, rond) {
    this.jx = 0; this.jy = 0;   // manche, repère écran (x à droite, y vers le bas)
    this.kx = 0; this.ky = 0;   // clavier et manette (stick gauche, gâchettes)
    this.courir = false;
    this.fm = false;            // frein à main : espace, ou X / RB à la manette (au volant)
    this.actions = [];          // 'agir', 'tel', 'son', 'radio', 'echap'
    this.touchers = [];         // touchers courts {x, y}
    this.actif = true;
    this.id = null; this.R = 58; this.echelle = 1;
    this.touches = new Set();
    this.rond = rond; this.bouton = rond.firstElementChild;
    // caméra à la main : rotations à consommer (radians), zoom (facteur), recentrage ; touches et stick droit
    this.cam = { x: 0, y: 0, zoom: 1, recentrer: false };
    this.kcam = 0; this.kcamY = 0;
    this.doigts = new Map();    // doigts posés : id -> {x, y}
    this.geste = null;          // geste à deux doigts {a, b, mx, my, d}
    this.ignores = new Set();   // doigts à ignorer jusqu'à ce qu'ils se lèvent
    this.souris = null;         // glisser de caméra à la souris (clic droit ou Alt)
    this.clav = { x: 0, y: 0, cx: 0, cy: 0, courir: false, fm: false };
    this.pad = { x: 0, y: 0, cx: 0, cy: 0, courir: false, fm: false, b: [] };
    this.tPad = 0;

    this.rayon();
    addEventListener('resize', () => this.rayon());

    zone.addEventListener('pointerdown', e => {
      if (!this.actif) return;
      if (e.pointerType === 'mouse' && (e.button === 2 || e.button === 1 || e.altKey)) {
        this.souris = { id: e.pointerId, x: e.clientX, y: e.clientY };
        try { zone.setPointerCapture(e.pointerId); } catch (_) { /* ignoré */ }
        e.preventDefault();
        return;
      }
      this.doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.geste || this.doigts.size > 2) { this.ignores.add(e.pointerId); return; }
      if (this.doigts.size === 2) {
        // deuxième doigt : le manche s'efface, les deux doigts tournent la caméra
        let a = null;
        for (const k of this.doigts.keys()) if (k !== e.pointerId) a = k;
        const A = this.doigts.get(a), B = this.doigts.get(e.pointerId);
        this.ignores.delete(a);
        this.geste = { a, b: e.pointerId, mx: (A.x + B.x) / 2, my: (A.y + B.y) / 2, d: Math.hypot(A.x - B.x, A.y - B.y) };
        this.id = null; this.jx = this.jy = 0; this.montrer(false);
        try { zone.setPointerCapture(e.pointerId); } catch (_) { /* ignoré */ }
        e.preventDefault();
        return;
      }
      if (this.id !== null) return;
      this.id = e.pointerId; this.ox = this.sx = e.clientX; this.oy = this.sy = e.clientY;
      this.t0 = performance.now(); this.loin = 0;
      try { zone.setPointerCapture(e.pointerId); } catch (_) { /* ignoré */ }
      this.montrer(true);
      e.preventDefault();
    });
    zone.addEventListener('pointermove', e => {
      const s = this.souris;
      if (s && e.pointerId === s.id) {
        this.cam.x += (e.clientX - s.x) * 0.0065; this.cam.y += (e.clientY - s.y) * 0.0045;
        s.x = e.clientX; s.y = e.clientY;
        return;
      }
      const p = this.doigts.get(e.pointerId);
      if (p) { p.x = e.clientX; p.y = e.clientY; }
      const g = this.geste;
      if (g && (e.pointerId === g.a || e.pointerId === g.b)) {
        const A = this.doigts.get(g.a), B = this.doigts.get(g.b);
        if (!A || !B) return;
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, d = Math.hypot(A.x - B.x, A.y - B.y);
        const k = 2.6 / Math.max(300, Math.min(innerWidth, innerHeight)); // un glissé sur toute la largeur : environ 150°
        this.cam.x += (mx - g.mx) * k; this.cam.y += (my - g.my) * k * 0.7;
        if (g.d > 30 && d > 30) this.cam.zoom *= Math.pow(g.d / d, 0.8); // pincer : la caméra s'éloigne, écarter : elle s'approche
        g.mx = mx; g.my = my; g.d = d;
        return;
      }
      if (e.pointerId !== this.id) return;
      let dx = e.clientX - this.ox, dy = e.clientY - this.oy;
      this.loin = Math.max(this.loin, Math.hypot(e.clientX - this.sx, e.clientY - this.sy));
      const d = Math.hypot(dx, dy);
      if (d > this.R) { this.ox += dx / d * (d - this.R); this.oy += dy / d * (d - this.R); dx = e.clientX - this.ox; dy = e.clientY - this.oy; }
      this.jx = dx / this.R; this.jy = dy / this.R;
      if (Math.hypot(this.jx, this.jy) < 0.12) this.jx = this.jy = 0;
      this.dessiner(dx, dy);
    });
    const fin = e => {
      if (this.souris && e.pointerId === this.souris.id) { this.souris = null; return; }
      this.doigts.delete(e.pointerId);
      if (this.ignores.delete(e.pointerId)) return;
      const g = this.geste;
      if (g && (e.pointerId === g.a || e.pointerId === g.b)) {
        // fin du geste : le doigt qui reste ne devient pas un manche (pas de départ imprévu)
        const autre = e.pointerId === g.a ? g.b : g.a;
        if (this.doigts.has(autre)) this.ignores.add(autre);
        this.geste = null;
        return;
      }
      if (e.pointerId !== this.id) return;
      if (this.loin < 12 && performance.now() - this.t0 < 300) this.touchers.push({ x: e.clientX, y: e.clientY });
      this.id = null; this.jx = this.jy = 0; this.montrer(false);
    };
    zone.addEventListener('pointerup', fin);
    zone.addEventListener('pointercancel', fin);
    zone.addEventListener('contextmenu', e => e.preventDefault());
    zone.addEventListener('wheel', e => { this.cam.zoom *= Math.exp(borne(e.deltaY, -200, 200) * 0.0012); }, { passive: true });

    // ZQSD (codes physiques, donc aussi WASD), flèches ; caméra : J L (tourner), I K (hauteur), C (derrière)
    const DIR = {
      KeyW: 'h', ArrowUp: 'h', KeyS: 'b', ArrowDown: 'b', KeyA: 'g', ArrowLeft: 'g', KeyD: 'd', ArrowRight: 'd',
      KeyJ: 'cg', KeyL: 'cd', KeyI: 'ch', KeyK: 'cb',
    };
    addEventListener('keydown', e => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (DIR[e.code]) { this.touches.add(DIR[e.code]); e.preventDefault(); }
      else if (e.key === 'Shift') this.clav.courir = true;
      else if (e.code === 'Space') { this.clav.fm = true; e.preventDefault(); }
      else if (!e.repeat && (k === 'e' || e.key === 'Enter')) this.actions.push('agir');
      else if (!e.repeat && k === 't') this.actions.push('tel');
      else if (!e.repeat && k === 'm') this.actions.push('son');
      else if (!e.repeat && e.code === 'KeyR') this.actions.push('radio');
      else if (!e.repeat && e.code === 'KeyC') this.cam.recentrer = true;
      else if (e.key === 'Escape') this.actions.push('echap');
      this.majClavier();
    });
    addEventListener('keyup', e => {
      if (DIR[e.code]) this.touches.delete(DIR[e.code]);
      if (e.key === 'Shift') this.clav.courir = false;
      if (e.code === 'Space') this.clav.fm = false;
      this.majClavier();
    });
    addEventListener('blur', () => { this.touches.clear(); this.clav.courir = false; this.clav.fm = false; this.majClavier(); this.relacher(); });

    // manette : lue à chaque image tant qu'il y en a une de branchée
    addEventListener('gamepadconnected', () => this.lancerManette());
    try { if (navigator.getGamepads && [...navigator.getGamepads()].some(g => g)) this.lancerManette(); } catch (_) { /* rien */ }
  }

  // rayon du manche selon la taille de l'écran (le dessin du rond est mis à l'échelle)
  rayon() {
    const c = Math.min(innerWidth || 390, innerHeight || 844);
    this.R = borne(Math.round(c * 0.15), 46, 84);
    this.echelle = this.R / 58;
  }
  majClavier() {
    const t = this.touches, c = this.clav;
    c.x = (t.has('d') ? 1 : 0) - (t.has('g') ? 1 : 0);
    c.y = (t.has('b') ? 1 : 0) - (t.has('h') ? 1 : 0);
    c.cx = (t.has('cd') ? 1 : 0) - (t.has('cg') ? 1 : 0);
    c.cy = (t.has('cb') ? 1 : 0) - (t.has('ch') ? 1 : 0);
    this.combiner();
  }
  combiner() {
    const c = this.clav, p = this.pad;
    this.kx = borne(c.x + p.x, -1, 1); this.ky = borne(c.y + p.y, -1, 1);
    this.kcam = borne(c.cx + p.cx, -1, 1); this.kcamY = borne(c.cy + p.cy, -1, 1);
    this.courir = c.courir || p.courir;
    this.fm = c.fm || p.fm;
  }

  lancerManette() {
    if (this.tPad) return;
    const f = () => { this.tPad = this.lireManette() ? requestAnimationFrame(f) : 0; };
    this.tPad = requestAnimationFrame(f);
  }
  // disposition standard : stick gauche avancer et tourner, gâchettes accélérer (RT) et freiner (LT),
  // A agir, Y téléphone, B retour, X courir (au volant : frein à main, comme RB), LB radio, stick droit caméra (clic : derrière)
  lireManette() {
    let gp = null;
    try {
      const l = navigator.getGamepads ? navigator.getGamepads() : null;
      if (l) for (let i = 0; i < l.length; i++) if (l[i] && l[i].connected) { gp = l[i]; break; }
    } catch (_) { gp = null; }
    const p = this.pad;
    if (!gp) { p.x = p.y = p.cx = p.cy = 0; p.courir = p.fm = false; this.combiner(); return false; }
    const ax = i => gp.axes[i] || 0, bt = i => (gp.buttons[i] && gp.buttons[i].value) || 0;
    const k = morte(ax(0), ax(1), 0.16), kc = morte(ax(2), ax(3), 0.18);
    const rt = bt(7), lt = bt(6);
    p.x = ax(0) * k;
    p.y = rt > 0.05 || lt > 0.05 ? lt - rt : ax(1) * k;
    p.cx = ax(2) * kc; p.cy = ax(3) * kc;
    p.courir = bt(2) > 0.5;
    p.fm = bt(2) > 0.5 || bt(5) > 0.5; // au volant, X ou RB : frein à main
    const appui = i => { const on = bt(i) > 0.5, avant = p.b[i]; p.b[i] = on; return on && !avant; };
    if (appui(0)) this.actions.push('agir');
    if (appui(3)) this.actions.push('tel');
    if (appui(1)) this.actions.push('echap');
    if (appui(11)) this.cam.recentrer = true;
    if (appui(4)) this.actions.push('radio'); // LB : la radio
    this.combiner();
    return true;
  }

  relacher() {
    this.id = null; this.jx = this.jy = 0; this.montrer(false);
    this.doigts.clear(); this.ignores.clear(); this.geste = null; this.souris = null;
  }
  montrer(on) {
    this.rond.style.opacity = on ? '1' : '0';
    if (on) { this.rond.style.transform = `translate(${this.ox}px, ${this.oy}px) scale(${this.echelle})`; this.bouton.style.transform = 'translate(0px, 0px)'; }
  }
  dessiner(dx, dy) {
    const s = this.echelle;
    this.rond.style.transform = `translate(${this.ox}px, ${this.oy}px) scale(${s})`;
    this.bouton.style.transform = `translate(${dx / s}px, ${dy / s}px)`;
  }
  get clavier() { return this.kx !== 0 || this.ky !== 0; }
}
