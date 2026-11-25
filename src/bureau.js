// Le bureau du chai, côté jeu : entrer et sortir par la porte (fondu au noir au seuil, la caméra passe dans un coin de
// la pièce), déposer le chèque sur le bureau en bois, s'asseoir au portable (pc.js : Le bureau et Vitisoft), se lever.
// La pièce est dans monde.js (chaiEtBureau), les gestes dans gestes.js (passer, asseoir, lever).
import * as THREE from 'three';
import { MAT } from './modeles.js';
import { geoCheque } from './engins.js';
import { $ } from './outils.js';

export class Bureau {
  // c : { jeu, monde, scene, gestes, hud, ctrl, cam, mission, pc, tel, regarder(dedans) : jusqu'où la caméra
  // dessine (main.js) }
  constructor(c) {
    this.c = c; this.B = c.monde.lieux.bureau; this.auPortable = false;
    c.jeu.dedans = false;
    const h = c.hud;
    this.etq = { depot: h.action('Déposer le chèque'), entrer: h.action('Entrer au bureau'), sortir: h.action('Sortir'), portable: h.action('S\'asseoir au portable') };
    this.etiquettes = Object.values(this.etq); // main.js : on peut les toucher
    // le chèque de l'épicerie, posé sur le bureau une fois déposé
    const B0 = this.B.depot;
    this.cheque = new THREE.Mesh(geoCheque(), MAT);
    this.cheque.position.set(B0.x, B0.y, B0.z); this.cheque.rotation.y = 0.3; this.cheque.visible = false;
    c.scene.add(this.cheque);
    c.jeu.leverPortable = () => this.lever();
  }
  // le personnage est-il à moins de d du point p ?
  pres(p, d) { const j = this.c.jeu.joueur.pos; return Math.hypot(j.x - p.x, j.z - p.z) < d; }
  // jeu.dedans : 'bureau' dans le bureau du chai ('solumatic' dans les bureaux de Solumatic : solumatic.js)
  get ici() { return this.c.jeu.dedans === 'bureau'; }
  get porteDehors() { const j = this.c.jeu; return !j.dedans && !j.auVolant && this.pres(this.B.dehors, 2.6); }
  get porteDedans() { return this.ici && this.pres(this.B.dedans, 1.5); }
  get depot() { return this.ici && this.c.mission.chequeADeposer && this.pres(this.B.depot, 2.0); }
  get chaise() { return this.ici && !this.c.mission.chequeADeposer && !this.auPortable && this.pres(this.B.chaise, 1.8); }

  // l'action (E, ou une étiquette touchée) : rend vrai si elle concernait le bureau. Dedans : sortir ; d'abord poser le
  // chèque de l'épicerie, ensuite s'asseoir au portable.
  agir() {
    if (this.ici) {
      if (this.porteDedans) this.passer(false);
      else if (this.depot) { this.c.mission.deposerCheque(); this.cheque.visible = true; }
      else if (this.chaise) this.asseoir();
      return true;
    }
    if (this.porteDehors) { this.passer(true); return true; }
    return false;
  }
  passer(entrer) {
    const c = this.c;
    c.ctrl.relacher();
    c.gestes.passer(this.B, entrer, {
      fondu: noir => $('fondu').classList.toggle('noir', noir),
      passe: () => { c.jeu.dedans = entrer ? 'bureau' : false; c.regarder(entrer); c.cam.pret = false; if (!entrer) c.cam.yaw = -Math.PI / 2; },
      fin: () => {},
    });
  }
  asseoir() {
    const c = this.c;
    c.ctrl.relacher();
    c.gestes.asseoir(this.B, () => { this.auPortable = true; c.pc.ouvrir(c.mission.ouvrirPC()); });
  }
  lever() { if (!this.auPortable) return; this.auPortable = false; this.c.gestes.lever(this.B, () => {}); }

  // avant de bouger le personnage : les mains sur le clavier quand le portable est ouvert ; après un appel passé
  // depuis le portable, on y revient
  avant() {
    const c = this.c;
    c.jeu.joueur.clavier = this.auPortable && c.pc.ouvert;
    if (this.auPortable && !c.pc.ouvert && !c.tel.ouvert && !c.gestes.actif && !c.jeu.finVue) c.pc.ouvrir();
  }
  // les étiquettes du bureau ; la pièce n'est dessinée que si on la voit (dedans, ou par la porte ouverte). Rend vrai
  // si une étiquette du bureau est proposée (main.js n'en propose alors pas d'autre).
  maj() {
    const c = this.c, B0 = this.B, libre = !c.tel.ouvert && !c.pc.ouvert && !c.gestes.actif, h = c.hud;
    const dehors = libre && this.porteDehors, dedans = libre && this.porteDedans, depot = libre && this.depot, chaise = libre && this.chaise;
    h.placer(this.etq.entrer, B0.seuil.x - 0.2, 2.55, B0.seuil.z, dehors);
    h.placer(this.etq.sortir, B0.seuil.x + 0.3, 2.3, B0.seuil.z, dedans);
    h.placer(this.etq.depot, B0.depot.x, 1.25, B0.depot.z, depot);
    h.placer(this.etq.portable, B0.chaise.x, 1.45, B0.chaise.z, chaise);
    c.monde.interieurBureau.visible = this.ici || c.monde.porteBureau.rotation.y < -0.01;
    return dehors || dedans || depot || chaise;
  }
  // la caméra dans la pièce : posée dans un coin ; au portable, derrière l'épaule
  camera(dt) { const c = this.c, j = c.jeu.joueur.pos; c.cam.salle(dt, this.B, j.x, j.z, this.auPortable && (c.pc.ouvert || c.gestes.actif)); }
}
