// Gestes du personnage : de courtes séquences qui se jouent toutes seules, étape par étape. Monter dans le tracteur ou le
// van (on va à la portière ou au marchepied, on ouvre, on s'installe, on referme), en descendre. Pendant un geste, le
// joueur ne commande plus le personnage et le véhicule reste à l'arrêt (main.js).
// Repère d'un véhicule : avant vers +z, +x à gauche, le côté du conducteur.
import * as THREE from 'three';
import { son } from './audio.js';
import { versAngle } from './outils.js';

const lisse = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
const OUVERTE = -1.15; // angle de la portière du van grande ouverte (rad)

// Montée de chaque véhicule, dans le repère de sa caisse : chemin des pieds (x, y, z) depuis le sol jusqu'au poste de
// conduite, durée, et le moment où l'on commence à s'asseoir (fraction du chemin).
const MONTEES = {
  // marchepied devant la roue arrière gauche, plancher, siège
  tracteur: { chemin: [[1.3, 0, 0.12], [0.84, 0.7, 0.1], [0.42, 1.24, -0.28], [0, 1.24, -0.62]], duree: 1.25, assis: 0.45, baisse: 0.15 },
  // juste derrière la portière (hors de son passage), dans l'ouverture, le seuil, le siège
  van: { chemin: [[1.25, 0, -0.45], [1.2, 0, 0.05], [0.95, 0.06, 0.12], [0.55, 0.45, 0.0], [0.38, 0.45, -0.05]], duree: 1.25, assis: 0.35, baisse: 0.6 },
};

const vT = new THREE.Vector3();
// point du repère du véhicule (x, z) dans le monde
function versMonde(v, l, out) {
  const h = v.p.h, c = Math.cos(h), s = Math.sin(h);
  out.x = v.p.pos.x + l[0] * c + l[2] * s; out.z = v.p.pos.z - l[0] * s + l[2] * c;
  return out;
}
// point du chemin de montée à la fraction u (segments parcourus à vitesse égale)
function surChemin(ch, u, out) {
  const n = ch.length - 1, s = Math.min(n - 1e-6, Math.max(0, u) * n), i = Math.floor(s), f = s - i;
  return out.set(mix(ch[i][0], ch[i + 1][0], f), mix(ch[i][1], ch[i + 1][1], f), mix(ch[i][2], ch[i + 1][2], f));
}

export class Gestes {
  // c : { jeu, scene, col }
  constructor(c) { this.c = c; this.g = null; this.cible = { x: 0, z: 0 }; }
  get actif() { return this.g !== null; }

  // enchaîne les étapes : { duree, debut(), maj(dt, t, u, T) } ; sans durée, l'étape dure tant que maj ne rend pas vrai
  lancer(etapes, fin) { this.g = { etapes, i: 0, T: 0, fin }; etapes[0].debut?.(); }
  update(dt, t) {
    const G = this.g;
    if (!G) return;
    const e = G.etapes[G.i];
    G.T += dt;
    const fini = e.maj(dt, t, e.duree ? lisse(G.T / e.duree) : 0, G.T);
    if (e.duree ? G.T < e.duree : !fini) return;
    G.i++; G.T = 0;
    if (G.i < G.etapes.length) G.etapes[G.i].debut?.();
    else { this.g = null; G.fin?.(); }
  }

  // le personnage marche jusqu'au point l (repère du véhicule), puis se tourne vers le cap h (fonction)
  allerA(v, l, cap) {
    const J = () => this.c.jeu.joueur, C = this.cible;
    return [{
      maj: (dt, t, u, T) => {
        const j = J(); versMonde(v, l, C);
        const dx = C.x - j.pos.x, dz = C.z - j.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.12 || T > 4) return true;
        j.update(dt, dx, dz, 1, false, this.c.col, t, Math.min(1.5, 0.35 + d * 1.6));
        return false;
      },
    }, {
      duree: 0.3,
      maj: (dt, t) => { const j = J(); j.h = versAngle(j.h, cap(), dt * 9); j.update(dt, 0, 0, 0, false, this.c.col, t); },
    }];
  }
  // la portière du van s'ouvre (sens 1) ou se referme (sens -1)
  portiere(v, sens) {
    const pt = v.m.porte;
    return {
      duree: sens > 0 ? 0.45 : 0.35,
      debut: () => { if (sens > 0) son.jouer('portiere'); },
      maj: (dt, t, u) => {
        pt.rotation.y = OUVERTE * (sens > 0 ? u : 1 - u);
        if (sens < 0 && u >= 1 && !this.claque) { this.claque = true; son.jouer('claque'); }
        const j = this.c.jeu.joueur;
        if (j.assis) j.sync(dt, t); else j.update(dt, 0, 0, 0, false, this.c.col, t);
      },
    };
  }

  // Monter dans le véhicule v ; fin() quand on est installé (main.js passe en conduite)
  monter(v, fin) {
    const M = MONTEES[v.genre], ch = M.chemin, porte = !!v.m.porte, J = () => this.c.jeu.joueur;
    this.claque = false;
    const etapes = this.allerA(v, ch[0], () => v.p.h - Math.PI / 2);
    if (porte) etapes.push(this.portiere(v, 1));
    etapes.push({
      duree: M.duree,
      debut: () => {
        const j = J();
        v.m.caisse.add(j.m.groupe);
        j.assis = true; j.poste = v.poste; j.transition = 0; j.baisse = M.baisse; j.v = 0;
        this.marche = false;
      },
      maj: (dt, t, u) => {
        const j = J(), g = j.m.groupe;
        surChemin(ch, u, g.position);
        g.rotation.set(0, mix(-Math.PI / 2, 0, lisse((u - 0.3) / 0.7)), 0);
        j.transition = lisse((u - M.assis) / (1 - M.assis));
        if (!porte && !this.marche && u > 0.25) { this.marche = true; son.jouer('marche'); }
        j.sync(dt, t);
        g.getWorldPosition(vT); j.pos.x = vT.x; j.pos.z = vT.z; // la caméra suit
      },
    });
    if (porte) etapes.push(this.portiere(v, -1));
    this.lancer(etapes, () => {
      const j = J();
      j.transition = null; j.baisse = undefined;
      j.m.groupe.position.copy(v.m.siege); j.m.groupe.rotation.set(0, 0, 0);
      fin();
    });
  }

  // Descendre du véhicule v : sorti() quand on pose le pied au sol (main.js repasse à pied), fin() quand tout est fini
  descendre(v, sorti, fin) {
    const M = MONTEES[v.genre], ch = M.chemin, porte = !!v.m.porte, J = () => this.c.jeu.joueur;
    this.claque = false;
    const etapes = [];
    if (porte) etapes.push(this.portiere(v, 1));
    etapes.push({
      duree: M.duree * 0.9,
      debut: () => { const j = J(); j.transition = 1; j.baisse = M.baisse; this.marche = false; },
      maj: (dt, t, u) => {
        const j = J(), g = j.m.groupe;
        surChemin(ch, 1 - u, g.position);
        g.rotation.set(0, mix(0, Math.PI / 2, lisse((u - 0.15) / 0.6)), 0);
        j.transition = 1 - lisse((1 - u - M.assis) / (1 - M.assis));
        if (!porte && !this.marche && u > 0.7) { this.marche = true; son.jouer('marche'); }
        j.sync(dt, t);
        g.getWorldPosition(vT); j.pos.x = vT.x; j.pos.z = vT.z;
        if (u >= 1) {
          // pied au sol : le personnage revient dans la scène, à côté du véhicule, tourné vers l'extérieur
          this.c.scene.add(g);
          versMonde(v, ch[0], this.cible);
          j.pos.set(this.cible.x, 0, this.cible.z); this.c.col.resoudre(j.pos, j.r);
          j.h = j.hv = v.p.h + Math.PI / 2; j.v = 0;
          j.assis = false; j.transition = null; j.baisse = undefined; j.poste = null;
          j.sync(dt, t);
          sorti();
        }
      },
    });
    if (porte) etapes.push(this.portiere(v, -1));
    this.lancer(etapes, fin);
  }
}
