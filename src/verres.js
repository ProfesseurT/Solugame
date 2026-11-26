// Servir un verre de vin : à pied, près d'un passant, d'un figurant assis à la terrasse (ou du prospect, le temps de la
// dégustation : mission.js), l'étiquette « Servir un verre ». On verse, on tend le verre, il trinque et boit ; une fois
// par personne et par minute. Le personnage ne boit jamais. Les poses sont dans anim.js (poseService, poseBoire).
import { versAngle } from './outils.js';
import { son } from './audio.js';
import { DIALOGUES, REPLIQUES_VERRE } from './textes.js';

const SERVICE = 3.2; // durée du geste (s)

export class Verres {
  // c : { jeu, hud, mission, candidats(f) : appelle f(personne, portée) pour chacun de ceux qu'on peut servir,
  //       hasard() : tirage au sort du jeu (la réplique de celui qui trinque) }
  constructor(c) {
    this.c = c;
    this.servable = null; // le Pieton qu'on peut servir, ou null
    this.n = 0;           // verres servis
    this.temps = 0; this.dt = 0; this.dmin = 1e9;
    // appelés pour chaque candidat : créés une fois (pas d'allocation par image)
    this.essayer = (p, portee) => {
      if (p.verre > 0 || p.sautT > 0 || (p.servi && this.temps - p.servi < 60)) return;
      const j = this.c.jeu.joueur, d = Math.hypot(p.pos.x - j.pos.x, p.pos.z - j.pos.z);
      if (d < portee && d < this.dmin) { this.dmin = d; this.servable = p; }
    };
    this.boire = p => this.boit(p);
  }
  // qui peut-on servir ? (libre : à pied, rien d'autre en cours)
  chercher(libre) {
    this.servable = null;
    if (!libre) return;
    this.dmin = 1e9;
    this.c.candidats(this.essayer);
  }
  servir(p) {
    const j = this.c.jeu.joueur;
    j.service = { t: 0, duree: SERVICE, cible: p, donne: false };
    p.aServir = true; p.servi = this.temps;
    j.h = Math.atan2(p.pos.x - j.pos.x, p.pos.z - j.pos.z); j.v = 0;
    son.jouer('bouchon');
    if (this.n === 0 && !p.servable) this.c.hud.dire(DIALOGUES.verre);
  }
  // le geste avance ; au bon moment le verre change de main ; celui qui boit le garde quelques secondes
  maj(dt, temps) {
    this.temps = temps; this.dt = dt;
    const j = this.c.jeu.joueur, S = j.service;
    if (S) {
      S.t += dt;
      const p = S.cible;
      p.h = versAngle(p.h, Math.atan2(j.pos.x - p.pos.x, j.pos.z - p.pos.z), dt * 6);
      if (S.t > SERVICE * 0.2 && !S.verse) { S.verse = true; son.jouer('verser'); }
      // (celui qui l'a demandé : le prospect de la tournée, ou un restaurateur du coin, restaurateurs.js : surServi)
      if (S.t > SERVICE * 0.8 && !S.donne) { S.donne = true; p.verre = 5; p.tVerre = 0; p.aServir = false; this.n++; if (p.servable) { if (p.surServi) p.surServi(); else this.c.mission.degustee(); } }
      if (S.t >= SERVICE) j.service = null;
    }
    this.c.candidats(this.boire);
  }
  // celui qui a reçu un verre le boit ; il trinque au bout de 0,6 s
  boit(p) {
    if (!(p.verre > 0)) return;
    const avant = p.tVerre;
    p.tVerre += this.dt; p.verre -= this.dt;
    if (avant < 0.6 && p.tVerre >= 0.6) {
      son.jouer('tchin');
      if (p.etq) this.c.hud.bulle(p.etq, REPLIQUES_VERRE[Math.floor(this.c.hasard() * REPLIQUES_VERRE.length)], 2.4);
    }
    if (p.verre <= 0) p.verre = 0;
  }
}
