// Gestes du personnage : de courtes séquences qui se jouent toutes seules, étape par étape. Monter dans le tracteur ou le
// van (on va à la portière ou au marchepied, on ouvre, on s'installe, on referme), en descendre ; charger les cartons de
// la palette du chai dans le véhicule ; les décharger devant un client. Pendant un geste, le joueur ne commande plus le
// personnage et le véhicule reste à l'arrêt (main.js) ; la caméra cadre la scène (cadre).
// Repère d'un véhicule : avant vers +z, +x à gauche, le côté du conducteur.
import * as THREE from 'three';
import { son } from './audio.js';
import { versAngle, angle } from './outils.js';
import { MAT } from './modeles.js';
import { geoCarton, PAS_CARTON } from './engins.js';

const lisse = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
const angleVers = (a, b) => angle(b - a); // le plus court chemin de l'angle a à l'angle b
const OUVERTE = -1.15;  // angle de la portière du van grande ouverte (rad)
const GLISSE = 0.78;    // course de la porte coulissante vers l'arrière (m)
const PORT = new THREE.Vector3(0, 0.95, 0.36); // la pile dans les bras : centre du carton du bas (repère du personnage)
const DEMI = 0.18;      // demi-largeur d'un carton
const BRAS = 0.62;      // portée des bras, à plat (repère du personnage) : plus loin, on tire ou on pousse la pile
const vR = new THREE.Vector3();
// le point p ramené à portée de bras (même hauteur)
function aPortee(p, out) { out.copy(p); const l = Math.hypot(p.x, p.z); if (l > BRAS) { out.x *= BRAS / l; out.z *= BRAS / l; } return out; }

// Montée de chaque véhicule, dans le repère de sa caisse : chemin des pieds (x, y, z) depuis le sol jusqu'au poste de
// conduite, durée, et le moment où l'on commence à s'asseoir (fraction du chemin).
const MONTEES = {
  // marchepied devant la roue arrière gauche, plancher, siège
  tracteur: { chemin: [[1.3, 0, 0.12], [0.84, 0.7, 0.1], [0.42, 1.24, -0.28], [0, 1.24, -0.62]], duree: 1.25, assis: 0.45, baisse: 0.15 },
  // juste derrière la portière (hors de son passage), dans l'ouverture, le seuil, le siège
  van: { chemin: [[1.25, 0, -0.45], [1.2, 0, 0.05], [0.95, 0.06, 0.12], [0.55, 0.45, 0.0], [0.38, 0.45, -0.05]], duree: 1.25, assis: 0.35, baisse: 0.6 },
};
// ordre de remplissage des colonnes de cartons depuis le côté où l'on se tient : d'abord les plus éloignées
const ORDRE = { tracteur: { droite: [2, 5, 1, 4, 0, 3], gauche: [0, 3, 1, 4, 2, 5] }, van: { droite: [0, 3, 1, 4, 2, 5] } };

const vT = new THREE.Vector3(), vA = new THREE.Vector3();
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
// Cadre d'une scène entre deux points a et b (monde) : la caméra regarde de côté, du côté opposé au véhicule v
// (sinon il cache tout)
function cadreEntre(a, b, v) {
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, ux = b.x - a.x, uz = b.z - a.z, l = Math.hypot(ux, uz) || 1;
  const nx = uz / l, nz = -ux / l, s = (v.p.pos.x - mx) * nx + (v.p.pos.z - mz) * nz > 0 ? -1 : 1;
  return { x: mx, z: mz, h: Math.atan2(-s * nx, -s * nz) };
}
// une pile de n cartons (3 au plus) ; sa position est celle du carton du bas
export function pileCartons(n) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(geoCarton(), MAT); m.position.y = i * PAS_CARTON; m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  montrer(g, n);
  return g;
}
function montrer(pile, n) { pile.children.forEach((m, i) => { m.visible = i < n; }); pile.userData.n = n; }

export class Gestes {
  // c : { jeu, scene, col }
  constructor(c) { this.c = c; this.g = null; this.cible = { x: 0, z: 0 }; this.cadre = null; }
  get actif() { return this.g !== null; }
  get j() { return this.c.jeu.joueur; }

  // enchaîne les étapes : { duree, debut(), maj(dt, t, u, T) } ; sans durée, l'étape dure tant que maj ne rend pas vrai ;
  // { action() } : fait tout de suite, sans attendre
  lancer(etapes, fin) {
    this.g = { etapes, i: -1, T: 0, fin };
    this.suivante();
  }
  suivante() {
    const G = this.g;
    for (;;) {
      G.i++; G.T = 0;
      if (G.i >= G.etapes.length) { this.g = null; this.cadre = null; G.fin?.(); return; }
      const e = G.etapes[G.i];
      if (e.action) { e.action(); if (this.g !== G) return; continue; }
      e.debut?.();
      return;
    }
  }
  update(dt, t) {
    const G = this.g;
    if (!G) return;
    const e = G.etapes[G.i];
    G.T += dt;
    const fini = e.maj(dt, t, e.duree ? lisse(G.T / e.duree) : 0, G.T);
    if (e.duree ? G.T >= e.duree : fini) this.suivante();
  }
  // le personnage reste sur place (anim, regard), le temps d'une étape
  immobile(dt, t) { const j = this.j; if (j.assis) j.sync(dt, t); else j.update(dt, 0, 0, 0, false, this.c.col, t); }

  /* ------------------------------------------------------------ briques */
  // marcher jusqu'au point p() (monde, {x, z}), puis se tourner vers le cap cap()
  allerA(p, cap) {
    let limite = 4;
    return [{
      debut: () => { const q = p(), j = this.j; limite = 3 + Math.hypot(q.x - j.pos.x, q.z - j.pos.z) / 1.1; },
      maj: (dt, t, u, T) => {
        const j = this.j, q = p(), dx = q.x - j.pos.x, dz = q.z - j.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.12 || T > limite) return true;
        j.update(dt, dx, dz, 1, false, this.c.col, t, Math.min(j.porte ? 1.6 : 1.9, 0.4 + d * 1.8));
        return false;
      },
    }, {
      duree: 0.22,
      maj: (dt, t) => { const j = this.j; j.h = versAngle(j.h, cap(), dt * 12); j.update(dt, 0, 0, 0, false, this.c.col, t); },
    }];
  }
  // aller à un point du repère du véhicule, tourné vers le cap (relatif au véhicule)
  allerVers(v, l, capRel) { return this.allerA(() => versMonde(v, l, this.cible), () => v.p.h + capRel); }
  // la portière du van s'ouvre (sens 1) ou se referme (sens -1)
  portiere(v, sens) {
    const pt = v.m.porte;
    let claque = false;
    return {
      duree: sens > 0 ? 0.45 : 0.35,
      debut: () => { if (sens > 0) son.jouer('portiere'); },
      maj: (dt, t, u) => {
        pt.rotation.y = OUVERTE * (sens > 0 ? u : 1 - u);
        if (sens < 0 && u >= 1 && !claque) { claque = true; son.jouer('claque'); }
        this.immobile(dt, t);
      },
    };
  }
  // la porte coulissante du van : elle s'écarte du flanc puis glisse vers l'arrière (sens 1), ou l'inverse
  coulissante(v, sens) {
    const pt = v.m.coulissante;
    let claque = false;
    return {
      duree: 0.6,
      debut: () => { if (sens > 0) son.jouer('portiere'); },
      maj: (dt, t, u) => {
        const k = sens > 0 ? u : 1 - u;
        pt.position.set(-0.06 * Math.min(1, k * 4), 0, -GLISSE * Math.max(0, (k - 0.15) / 0.85));
        if (sens < 0 && u >= 1 && !claque) { claque = true; son.jouer('claque'); }
        this.immobile(dt, t);
      },
    };
  }
  // la pile portée par le personnage (créée une fois par personnage), à l'échelle du monde
  pile() {
    const m = this.j.m;
    if (!m.pile) { m.pile = pileCartons(0); m.pile.scale.setScalar(1 / m.echelle); m.pile.visible = false; m.groupe.add(m.pile); }
    return m.pile;
  }
  // point du monde dans le repère du personnage
  local(w, out) { const g = this.j.m.groupe; g.updateMatrixWorld(); return g.worldToLocal(out.copy(w)); }
  // prendre n cartons dont le carton du bas est en src() (monde) ; avant() cache ceux qu'on prend. Trop loin, on tire
  // d'abord la pile jusqu'à soi ; puis on se baisse (selon sa hauteur) et on la soulève.
  prendre(src, n, avant) {
    const P = () => this.pile();
    return {
      duree: 0.85,
      debut: () => { avant(); const p = P(); montrer(p, n); p.visible = true; this.j.porte = p; son.jouer('carton'); },
      maj: (dt, t, u, T) => {
        const s = this.local(src(vA), vT), r = aPortee(s, vR);
        P().position.copy(s).lerp(r, lisse(T / 0.28)).lerp(PORT, lisse((T - 0.35) / 0.5));
        this.immobile(dt, t);
      },
    };
  }
  // poser la pile portée, le carton du bas en dst() (monde) ; trop loin, on la pose à portée puis on la pousse au fond.
  // apres() montre les cartons posés là.
  poser(dst, apres) {
    const P = () => this.pile();
    return {
      duree: 0.8,
      maj: (dt, t, u, T) => {
        const d = this.local(dst(vA), vT), r = aPortee(d, vR);
        P().position.copy(PORT).lerp(r, lisse(T / 0.45)).lerp(d, lisse((T - 0.45) / 0.3));
        if (T > 0.5) this.j.porte = null; // la pile glisse au fond : les mains la lâchent
        this.immobile(dt, t);
        if (T + dt >= 0.8 && P().visible) { P().visible = false; this.j.porte = null; apres(); son.jouer('carton'); }
      },
    };
  }

  /* ------------------------------------------------------------ monter, descendre */
  etapesMonter(v, fin) {
    const M = MONTEES[v.genre], ch = M.chemin, porte = !!v.m.porte;
    const etapes = this.allerVers(v, ch[0], -Math.PI / 2);
    if (porte) etapes.push(this.portiere(v, 1));
    let marche = false;
    etapes.push({
      duree: M.duree,
      debut: () => {
        const j = this.j;
        v.m.caisse.add(j.m.groupe);
        j.assis = true; j.poste = v.poste; j.transition = 0; j.baisse = M.baisse; j.v = 0;
      },
      maj: (dt, t, u) => {
        const j = this.j, g = j.m.groupe;
        surChemin(ch, u, g.position);
        g.rotation.set(0, mix(-Math.PI / 2, 0, lisse((u - 0.3) / 0.7)), 0);
        j.transition = lisse((u - M.assis) / (1 - M.assis));
        if (!porte && !marche && u > 0.25) { marche = true; son.jouer('marche'); }
        j.sync(dt, t);
        g.getWorldPosition(vT); j.pos.x = vT.x; j.pos.z = vT.z; // la caméra suit
      },
    });
    if (porte) etapes.push(this.portiere(v, -1));
    etapes.push({
      action: () => {
        const j = this.j;
        j.transition = null; j.baisse = undefined;
        j.m.groupe.position.copy(v.m.siege); j.m.groupe.rotation.set(0, 0, 0);
        fin();
      },
    });
    return etapes;
  }
  etapesDescendre(v, sorti) {
    const M = MONTEES[v.genre], ch = M.chemin, porte = !!v.m.porte;
    const etapes = [];
    if (porte) etapes.push(this.portiere(v, 1));
    let marche = false;
    etapes.push({
      duree: M.duree * 0.9,
      debut: () => { const j = this.j; j.transition = 1; j.baisse = M.baisse; },
      maj: (dt, t, u) => {
        const j = this.j, g = j.m.groupe;
        surChemin(ch, 1 - u, g.position);
        g.rotation.set(0, mix(0, Math.PI / 2, lisse((u - 0.15) / 0.6)), 0);
        j.transition = 1 - lisse((1 - u - M.assis) / (1 - M.assis));
        if (!porte && !marche && u > 0.7) { marche = true; son.jouer('marche'); }
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
    return etapes;
  }
  // Monter dans le véhicule v ; fin() quand on est installé (main.js passe en conduite)
  monter(v, fin) { this.lancer(this.etapesMonter(v, fin)); }
  // Descendre du véhicule v : sorti() quand on pose le pied au sol (main.js repasse à pied)
  descendre(v, sorti, fin) { this.lancer(this.etapesDescendre(v, sorti), fin); }

  /* ------------------------------------------------------------ les cartons */
  // le côté du véhicule où l'on se tient pour charger ou décharger : le plus proche du point (x, z)
  cote(v, x, z) {
    const ch = v.m.chargeur;
    let best = null, dmin = 1e9;
    for (const k in ch) { versMonde(v, [ch[k][0], 0, ch[k][1]], this.cible); const d = Math.hypot(this.cible.x - x, this.cible.z - z); if (d < dmin) { dmin = d; best = k; } }
    return best;
  }
  // se tenir au côté k du véhicule, tourné vers lui
  auVehicule(v, k) {
    const [x, z] = v.m.chargeur[k];
    return this.allerVers(v, [x, 0, z], x < 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  // centre du carton du bas de la colonne c du véhicule, dans le monde
  colonneMonde(v, c, out) { v.m.groupe.updateMatrixWorld(true); return v.m.caisse.localToWorld(out.copy(v.m.cartons[3 * c].position)); }
  ouvrirCote(v) { return v.m.coulissante ? [this.coulissante(v, 1)] : []; }
  fermerCote(v) { return v.m.coulissante ? [this.coulissante(v, -1)] : []; }

  // Au chai : on descend, on porte les piles de la palette jusqu'au véhicule (la plus proche d'abord), on remonte.
  // piles : [{ groupe, client, n }] posées sur la palette ; place(c, pile) : la pile est rangée dans la colonne c ;
  // fin() : tout est chargé et l'on est remonté au volant.
  charger(v, piles, { sorti, place, installe }) {
    const ptPal = { x: 0, z: 0 };
    const k = this.cote(v, piles[0].groupe.position.x, piles[0].groupe.position.z);
    const [lx, lz] = v.m.chargeur[k];
    const spot = versMonde(v, [lx, 0, lz], { x: 0, z: 0 });
    const ordre = [...piles].sort((a, b) => Math.hypot(a.groupe.position.x - spot.x, a.groupe.position.z - spot.z) - Math.hypot(b.groupe.position.x - spot.x, b.groupe.position.z - spot.z));
    const cols = ORDRE[v.genre][k];
    const pal = piles[0].groupe.parent;
    this.cadre = cadreEntre(spot, pal.position, v);
    const etapes = [...this.etapesDescendre(v, sorti), ...this.ouvrirCote(v)];
    ordre.forEach((p, i) => {
      const c = cols[i], g = p.groupe;
      // devant la pile, du côté du véhicule
      const devant = () => {
        g.getWorldPosition(vA);
        const dx = spot.x - vA.x, dz = spot.z - vA.z, l = Math.hypot(dx, dz) || 1;
        ptPal.x = vA.x + dx / l * 0.62; ptPal.z = vA.z + dz / l * 0.62; return ptPal;
      };
      etapes.push(...this.allerA(devant, () => { g.getWorldPosition(vA); return Math.atan2(vA.x - ptPal.x, vA.z - ptPal.z); }));
      etapes.push(this.prendre(w => g.getWorldPosition(w), p.n, () => { g.visible = false; }));
      etapes.push(...this.auVehicule(v, k));
      etapes.push(this.poser(w => this.colonneMonde(v, c, w), () => {
        for (let l = 0; l < p.n; l++) v.m.cartons[3 * c + l].visible = true;
        place(c, p);
      }));
    });
    etapes.push(...this.fermerCote(v), ...this.etapesMonter(v, installe));
    this.lancer(etapes);
  }

  // Chez un client : on descend, on porte ses colonnes jusqu'à lui et on les pose à ses pieds, en rang ; fin() quand
  // c'est fait (le client signe ensuite le bon de livraison). f : où il se tient {x, z, h} ; cols : [{ c, n }].
  // Les piles posées restent devant lui (ajout(pile) les garde).
  decharger(v, f, cols, { sorti, ajout, fin }) {
    const fx = Math.sin(f.h), fz = Math.cos(f.h), k = this.cote(v, f.x + fx, f.z + fz);
    const pt = { x: 0, z: 0 }, pose = new THREE.Vector3();
    const spot = this.auVehicule(v, k);
    versMonde(v, [v.m.chargeur[k][0], 0, v.m.chargeur[k][1]], this.cible);
    this.cadre = cadreEntre(this.cible, f, v);
    const etapes = [...this.etapesDescendre(v, sorti), ...this.ouvrirCote(v)];
    cols.forEach(({ c, n }, i) => {
      // en rang, à 0,9 m devant le client
      const dec = (i - (cols.length - 1) / 2) * 0.44;
      const sol = () => pose.set(f.x + fx * 0.9 + fz * dec, DEMI - 0.04, f.z + fz * 0.9 - fx * dec);
      etapes.push(...spot);
      etapes.push(this.prendre(w => this.colonneMonde(v, c, w), n, () => { for (let l = 0; l < 3; l++) v.m.cartons[3 * c + l].visible = false; }));
      etapes.push(...this.allerA(() => { sol(); pt.x = pose.x + fx * 0.6; pt.z = pose.z + fz * 0.6; return pt; }, () => f.h + Math.PI));
      etapes.push(this.poser(w => w.copy(sol()), () => {
        const p = pileCartons(n); p.position.copy(pose); p.rotation.y = f.h; this.c.scene.add(p); ajout(p);
      }));
    });
    this.lancer(etapes, fin);
  }

  /* ------------------------------------------------------------ le bureau du chai (monde.js : la pièce, sa porte) */
  // la porte du bureau s'ouvre vers l'intérieur (sens 1) ou se referme (sens -1)
  porteBureau(sens) {
    const pt = this.c.porte;
    let claque = false;
    return {
      duree: sens > 0 ? 0.5 : 0.45,
      debut: () => { if (sens > 0) son.jouer('portiere'); },
      maj: (dt, t, u) => {
        pt.rotation.y = -1.45 * (sens > 0 ? u : 1 - u);
        if (sens < 0 && u >= 1 && !claque) { claque = true; son.jouer('claque'); }
        this.immobile(dt, t);
      },
    };
  }
  // Passer la porte : on y va, elle s'ouvre, on passe le seuil ; au seuil, fondu au noir et la caméra change de côté
  // (passe), puis on avance et elle se referme. B : lieux.bureau ; entrer : vers l'intérieur, sinon vers la cour.
  passer(B, entrer, { fondu, passe, fin }) {
    const cap = entrer ? Math.PI / 2 : -Math.PI / 2, a = entrer ? B.dehors : B.dedans, b = entrer ? B.dedans : B.dehors;
    this.lancer([
      ...this.allerA(() => a, () => cap),
      this.porteBureau(1),
      ...this.allerA(() => B.seuil, () => cap),
      { action: () => fondu(true) },
      { duree: 0.25, maj: (dt, t) => this.immobile(dt, t) }, // le temps du fondu au noir (index.html, #fondu)
      { action: () => { passe(); fondu(false); } },
      ...this.allerA(() => b, () => cap + (entrer ? 0.4 : 0)),
      this.porteBureau(-1),
    ], fin);
  }
  // S'asseoir au portable : devant la chaise, on s'y assoit en se tournant vers le bureau ; assis() quand c'est fait
  asseoir(B, assis) {
    const A = { x: 0, z: 0, h: 0 }, C = B.chaise;
    this.lancer([
      ...this.allerA(() => B.devant, () => Math.atan2(C.x - B.devant.x, C.z - B.devant.z)),
      {
        duree: 0.9,
        debut: () => { const j = this.j; A.x = j.pos.x; A.z = j.pos.z; A.h = j.h; j.assis = true; j.transition = 0; j.baisse = 0.1; j.v = 0; },
        maj: (dt, t, u) => {
          const j = this.j, g = j.m.groupe, k = lisse(u * 1.3);
          g.position.set(mix(A.x, C.x, k), 0, mix(A.z, C.z, k)); g.rotation.set(0, A.h + angleVers(A.h, C.h) * k, 0);
          j.transition = lisse((u - 0.2) / 0.8);
          j.sync(dt, t); j.pos.x = g.position.x; j.pos.z = g.position.z; j.h = g.rotation.y;
        },
      },
      { action: () => { const j = this.j; j.transition = null; j.baisse = undefined; j.clavier = true; assis(); } },
    ]);
  }
  // Se lever du portable, revenir devant la chaise
  lever(B, fin) {
    const C = B.chaise;
    this.lancer([{
      duree: 0.8,
      debut: () => { const j = this.j; j.clavier = false; j.transition = 1; j.baisse = 0.1; },
      maj: (dt, t, u) => {
        const j = this.j, g = j.m.groupe;
        g.position.set(mix(C.x, B.devant.x, lisse((u - 0.3) / 0.7)), 0, mix(C.z, B.devant.z, lisse((u - 0.3) / 0.7)));
        j.transition = 1 - lisse(u / 0.8);
        j.sync(dt, t); j.pos.x = g.position.x; j.pos.z = g.position.z;
      },
    }, {
      action: () => {
        const j = this.j;
        j.pos.set(B.devant.x, 0, B.devant.z); j.h = j.hv = C.h; j.v = 0;
        j.assis = false; j.transition = null; j.baisse = undefined; j.sync(0.016, 0);
      },
    }], fin);
  }

  // Après la livraison : on referme la porte coulissante (van), on retourne au volant
  remonter(v, installe) {
    const k = Object.keys(v.m.chargeur)[0];
    this.lancer([...(v.m.coulissante && v.m.coulissante.position.z < -0.1 ? [...this.auVehicule(v, k), ...this.fermerCote(v)] : []), ...this.etapesMonter(v, installe)]);
  }
}
