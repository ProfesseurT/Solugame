// Gestes du personnage (et des clients : clients.js) : de courtes séquences qui se jouent toutes seules, étape par étape. Monter dans le tracteur ou le
// van (on va à la portière ou au marchepied, on ouvre, on s'installe, on referme), en descendre ; charger les cartons de
// la palette du chai dans le véhicule ; les décharger devant un client. Pendant un geste, le joueur ne commande plus le
// personnage et le véhicule reste à l'arrêt (main.js) ; la caméra cadre la scène (cadre).
// Repère d'un véhicule : avant vers +z, +x à gauche, le côté du conducteur.
import * as THREE from 'three';
import { son } from './audio.js';
import { versAngle, angle, lisse, mix, borne } from './outils.js';
import { MAT } from './modeles.js';
import { geoCarton, geoCheque, geoBouteille, PAS_CARTON } from './engins.js';

const angleVers = (a, b) => angle(b - a); // le plus court chemin de l'angle a à l'angle b
const OUVERTE = -1.15;  // angle de la portière du van grande ouverte (rad)
const GLISSE = 0.78;    // course de la porte coulissante vers l'arrière (m)
const PORT = new THREE.Vector3(0, 0.95, 0.36); // la pile dans les bras : centre du carton du bas (repère du personnage)
const DEMI = 0.18;      // demi-largeur d'un carton
const BRAS = 0.62;      // portée des bras, à plat (repère du personnage) : plus loin, on tire ou on pousse la pile
const vR = new THREE.Vector3();
// le point p ramené à portée de bras (même hauteur)
function aPortee(p, out) { out.copy(p); const l = Math.hypot(p.x, p.z); if (l > BRAS) { out.x *= BRAS / l; out.z *= BRAS / l; } return out; }

/* ---------------------------------------------------------------- monter, descendre : temps par temps
   Une montée (Teddy, 25/11/2026 : « on dirait qu'il fait du toboggan, il faut un truc plus naturel ») : l'état de départ,
   au sol, puis, temps par temps, où vont le corps (son origine, aux pieds), son cap, chaque pied (la semelle), chaque
   main (le poignet, ou null : libre), combien il est assis (0 debout, 1 au volant), combien les jambes restent posées
   (1 : sur leurs appuis ; 0 : la pose au volant), le buste penché. Repère de la caisse (avant vers +z, +x à gauche, le
   côté du conducteur). Un pied bouge à la fois (un pas : le pied de tête, puis l'autre ; un échelon : une main, puis le
   pied de l'autre côté) ; les pieds posés ne glissent pas, le bassin ne monte que si les jambes le portent (anim.js :
   poseAppuis). Descendre, c'est la montée à rebours, un peu plus vite. */
const PI2 = Math.PI / 2;
// les deux pieds d'un corps debout en (x, y, z), tourné de cap, écartés de e de part et d'autre : [gauche, droit]
function pieds(x, y, z, cap, e = 0.095) { const lx = Math.cos(cap) * e, lz = -Math.sin(cap) * e; return [[x + lx, y, z + lz], [x - lx, y, z - lz]]; }
// Construit une montée : depart = { corps, cap } au sol ; chaque temps { d, t ('pas', 'echelon', 'assis'), corps, cap,
// pieds: [g, d] (undefined : il reste), mains: [g, d] (undefined : elle reste ; null : lâchée), assis, jambes, penche,
// premier (le pied de tête : 0 gauche, 1 droit) }. Rend les états (S[0] au départ, S[i] à la fin du temps i) et les temps.
function construire(depart, temps, opts) {
  const c = depart.corps, S0 = { corps: c, cap: depart.cap, pieds: pieds(c[0], c[1], c[2], depart.cap), lacets: [depart.cap, depart.cap], mains: [null, null], assis: 0, jambes: 1, penche: 0 };
  const S = [S0];
  for (const T of temps) {
    const P = S[S.length - 1], cap = T.cap ?? P.cap;
    const E = { corps: T.corps ?? P.corps, cap, pieds: P.pieds.slice(), lacets: P.lacets.slice(), mains: P.mains.slice(), assis: T.assis ?? P.assis, jambes: T.jambes ?? P.jambes, penche: T.penche ?? P.penche };
    for (let j = 0; j < 2; j++) {
      if (T.pieds && T.pieds[j]) { E.pieds[j] = T.pieds[j]; E.lacets[j] = cap; }
      if (T.mains && T.mains[j] !== undefined) E.mains[j] = T.mains[j];
    }
    S.push(E);
  }
  return { S, temps, depart, ...opts };
}
// Les montées, d'après le véhicule (construites une fois, gardées sur son modèle)
const MONTEES = {
  // le tracteur : deux marchepieds devant la roue arrière gauche (engins.js), le plancher du poste ; la main droite sur la
  // poignée, la gauche sur le montant des marches, puis sur la planche de bord, puis sur le volant ; face au poste, on se
  // tourne vers l'avant et l'on s'assoit
  tracteur: () => {
    const M1 = 0.44, M2 = 0.84, F = 1.24;
    return construire({ corps: [1.22, 0, 0.12], cap: -PI2 }, [
      { d: 0.5, t: 'pas', pieds: [[0.8, M1, 0.21], [0.8, M1, 0.03]], corps: [0.9, M1, 0.12], mains: [[0.9, 1.17, 0.25], [0.77, 1.42, -0.19]], penche: 0.28 },
      { d: 0.46, t: 'pas', premier: 1, pieds: [[0.79, M2, 0.21], [0.79, M2, 0.03]], corps: [0.88, M2, 0.12], mains: [[0.33, 1.72, 0.13], [0.76, 1.64, -0.31]], penche: 0.22 },
      { d: 0.44, t: 'pas', pieds: [[0.5, F, 0.2], [0.5, F, 0.02]], corps: [0.57, F, 0.11], mains: [[0.2, 1.86, -0.16], undefined], penche: 0.1 },
      { d: 0.42, t: 'pas', premier: 1, cap: 0, corps: [0.08, F, -0.34], pieds: [[0.18, F, -0.3], [-0.02, F, -0.32]], mains: [undefined, null], penche: 0.04 },
      { d: 0.5, t: 'assis', corps: [0, F, -0.62], assis: 1, jambes: 0, mains: [null, null], penche: 0 },
    ], { son: 'marche', baisse: 0.12 });
  },
  // le van : la portière ouverte, on entre dans l'ouverture, le pied gauche sur le plancher de la cabine, la main gauche
  // au montant, la droite au dossier ; on se hisse et l'on s'assoit en se tournant vers l'avant
  van: () => {
    const F = 0.45;
    return construire({ corps: [1.25, 0, -0.45], cap: -PI2 }, [
      { d: 0.45, t: 'pas', corps: [1.24, 0, 0.02], cap: -1.35, pieds: pieds(1.24, 0, 0.02, -1.35) },
      { d: 0.48, t: 'pas', pieds: [[0.76, F, 0.14], undefined], corps: [0.98, 0.2, 0.03], cap: -1.15, mains: [[0.92, 1.42, 0.42], [0.78, 1.02, -0.36]], penche: 0.25 },
      { d: 0.62, t: 'assis', corps: [0.38, F, -0.05], cap: 0, pieds: [undefined, [0.3, F, 0.25]], assis: 1, jambes: 0, mains: [null, null], penche: 0.05 },
    ], { baisse: 0.6 });
  },
  // une voiture (engins.js : voitureConduite ; montee : W, la demi-largeur, z, l'arrière de la portière) : on longe la
  // voiture jusqu'à l'ouverture, on se tourne dos au siège, on s'assoit au bord en baissant la tête, les pieds dehors,
  // puis on pivote en rentrant les jambes
  voiture: m => {
    const { W, z } = m.montee, s = m.siege;
    return construire({ corps: [W + 0.42, 0, z - 0.42], cap: 0 }, [
      { d: 0.5, t: 'pas', premier: 1, corps: [W + 0.3, 0, s.z], cap: PI2, pieds: pieds(W + 0.3, 0, s.z, PI2, 0.11) },
      { d: 0.55, t: 'assis', corps: [W - 0.12, 0, s.z], assis: 0.72, penche: 0.18 },
      { d: 0.6, t: 'assis', corps: [s.x, 0, s.z], cap: 0, pieds: [[s.x + 0.1, 0.36, s.z + 0.45], [s.x - 0.1, 0.36, s.z + 0.45]], assis: 1, jambes: 0, penche: 0 },
    ], { baisse: 0.75 });
  },
  // l'enjambeur (enjambeur.js : montee, son échelle et son palier) : face à l'échelle, les mains sur les montants, on
  // grimpe une main puis le pied de l'autre côté, barreau par barreau ; on passe sur le palier, on va à la porte, la main
  // sur la poignée, on entre en se baissant (la tête sous le toit) et l'on s'assoit
  enjambeur: m => {
    const E = m.montee, { x, z0, z1, pas, n } = E.echelle, YD = E.palier, zm = (z0 + z1) / 2, xp = x + 0.11, xc = x + 0.3, xm = x + 0.06;
    const T = [{ d: 0.45, t: 'pas', corps: [xc + 0.04, 0, zm], pieds: pieds(xc + 0.04, 0, zm, -PI2, 0.09), mains: [[xm, 1.25, z1 - 0.02], [xm, 1.25, z0 + 0.02]], penche: 0.12 }];
    const y = [0, 0];
    for (let k = 1; k <= n; k++) {
      const f = k % 2 ? 0 : 1, c = 1 - f; // le pied gauche aux barreaux impairs ; la main de l'autre côté monte d'abord
      y[f] = pas * k + 0.017;
      const pp = [undefined, undefined], mm = [undefined, undefined];
      pp[f] = [xp, y[f], f ? zm - 0.09 : zm + 0.09];
      mm[c] = [xm, Math.min(YD + 0.88, 1.4 + pas * k), c ? z0 + 0.02 : z1 - 0.02];
      T.push({ d: 0.34, t: 'echelon', pieds: pp, mains: mm, corps: [xc, (y[0] + y[1]) / 2, zm], penche: 0.08 });
    }
    // sur le palier : le pied resté en bas d'abord (la main de l'autre côté en haut du montant), puis l'autre
    const f = n % 2 ? 1 : 0, mh = [undefined, undefined];
    mh[1 - f] = [xm, YD + 0.88, 1 - f ? z0 + 0.02 : z1 - 0.02];
    const pp = [undefined, undefined]; pp[f] = [x - 0.08, YD, f ? zm - 0.09 : zm + 0.09];
    T.push({ d: 0.48, t: 'echelon', pieds: pp, mains: mh, corps: [x + 0.12, YD - 0.25, zm], penche: 0.15 });
    T.push({ d: 0.44, t: 'pas', premier: 1 - f, pieds: pieds(x - 0.1, YD, zm, -PI2, 0.09), corps: [x - 0.1, YD, zm], mains: [[x - 0.2, YD + 0.93, z1 - 0.02], [x - 0.2, YD + 0.93, z0 + 0.02]], penche: 0.05 });
    // à la porte, la main droite sur la poignée ; on entre en se baissant, tourné vers le siège ; on s'assoit
    const P = E.porte, Y = YD + 0.05;
    T.push({ d: 0.5, t: 'pas', corps: [P.x + 0.2, Y, P.z + 0.1], cap: -1.25, pieds: pieds(P.x + 0.2, Y, P.z + 0.1, -1.25, 0.09), mains: [null, E.poignee], penche: 0.1 });
    T.push({ d: 0.6, t: 'assis', corps: [P.x - 0.3, Y, P.z + 0.22], cap: -0.55, pieds: [[P.x - 0.32, Y, P.z + 0.38], [P.x - 0.2, Y, P.z + 0.12]], assis: 0.45, jambes: 0.7, penche: 0.38 });
    T.push({ d: 0.5, t: 'assis', corps: [m.siege.x, Y, m.siege.z], cap: 0, assis: 1, jambes: 0, mains: [null, null], penche: 0 });
    return construire({ corps: [xc + 0.42, 0, zm], cap: -PI2 }, T, { son: 'marche', baisse: 0.55 });
  },
};
const montee = v => v.m.appuis || (v.m.appuis = MONTEES[v.m.montee?.genre || v.genre](v.m));
// Les fenêtres d'un temps (fractions de sa durée) : le corps ; le pied de tête, l'autre (un seul pied : le premier) ; les mains
const FEN = {
  pas: { c: [0.14, 0.9], p1: [0, 0.5], p2: [0.4, 0.92], p: [0, 0.62], m: [0, 0.45] },
  echelon: { c: [0.3, 1], p1: [0.22, 0.75], p2: [0.22, 0.75], p: [0.22, 0.75], m: [0, 0.42] },
  assis: { c: [0, 1], p1: [0, 0.6], p2: [0.25, 0.85], p: [0, 0.7], m: [0, 0.5] },
};
const fen = (f, w) => borne((f - w[0]) / (w[1] - w[0]), 0, 1);
// ordre de remplissage des colonnes de cartons depuis le côté où l'on se tient : d'abord les plus éloignées
const ORDRE = { tracteur: { droite: [2, 5, 1, 4, 0, 3], gauche: [0, 3, 1, 4, 2, 5], arriere: [0, 1, 2, 3, 4, 5] }, van: { droite: [0, 3, 1, 4, 2, 5] } };

const vT = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
// point du repère du véhicule (x, z) dans le monde
function versMonde(v, l, out) {
  const h = v.p.h, c = Math.cos(h), s = Math.sin(h);
  out.x = v.p.pos.x + l[0] * c + l[2] * s; out.z = v.p.pos.z - l[0] * s + l[2] * c;
  return out;
}
// Contourner un véhicule : le segment a-b (repère du véhicule) coupe-t-il le rectangle [x0, x1, z0, z1] ? (découpage de
// Liang-Barsky)
function coupe(a, b, r) {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dz = b.z - a.z;
  for (const [p, q] of [[-dx, a.x - r[0]], [dx, r[1] - a.x], [-dz, a.z - r[2]], [dz, r[3] - a.z]]) {
    if (Math.abs(p) < 1e-9) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t1 - t0 > 1e-4;
}
const MARGE = 0.24, TOUR = 0.62; // le corps contre l'emprise ; distance des coins du détour
const SANS_MURS = { nx: 0, nz: 0, resoudre: () => false, rangs: () => false }; // passer une porte : rien n'arrête
// point du monde dans le repère du véhicule, et l'inverse
function versLocal(v, p) { const h = v.p.h, c = Math.cos(h), s = Math.sin(h), dx = p.x - v.p.pos.x, dz = p.z - v.p.pos.z; return { x: dx * c - dz * s, z: dx * s + dz * c }; }
function depuisLocal(v, l) { const h = v.p.h, c = Math.cos(h), s = Math.sin(h); return { x: v.p.pos.x + l.x * c + l.z * s, z: v.p.pos.z - l.x * s + l.z * c }; }
// Le chemin a-b sans traverser le véhicule v : tel quel s'il ne coupe pas son emprise, sinon par un ou deux de ses coins
// (élargis), le plus court. Rend les points intermédiaires (repère du monde).
function contourner(v, a, b) {
  const E = v.m.dims.emprise;
  if (!E) return [];
  const R = E.map(([x0, x1, z0, z1]) => [x0 - MARGE, x1 + MARGE, z0 - MARGE, z1 + MARGE]);
  const dans = (p, r) => p.x > r[0] && p.x < r[1] && p.z > r[2] && p.z < r[3];
  // un bout du segment tout contre le véhicule (on va s'y tenir : marchepied, côté du plateau) : l'emprise exacte suffit
  const libre = (p, q) => R.every((r, i) => !coupe(p, q, dans(p, r) || dans(q, r) ? E[i] : r));
  const la = versLocal(v, a), lb = versLocal(v, b);
  if (libre(la, lb)) return [];
  const X0 = Math.min(...E.map(r => r[0])) - TOUR, X1 = Math.max(...E.map(r => r[1])) + TOUR;
  const Z0 = Math.min(...E.map(r => r[2])) - TOUR, Z1 = Math.max(...E.map(r => r[3])) + TOUR;
  const C = [{ x: X1, z: Z1 }, { x: X0, z: Z1 }, { x: X0, z: Z0 }, { x: X1, z: Z0 }];
  const cands = [];
  for (let i = 0; i < 4; i++) { cands.push([C[i]]); cands.push([C[i], C[(i + 1) % 4]]); cands.push([C[(i + 1) % 4], C[i]]); }
  let best = null, lmin = 1e9;
  for (const c of cands) {
    const pts = [la, ...c, lb];
    let l = 0, ok = true;
    for (let i = 1; i < pts.length && ok; i++) { ok = libre(pts[i - 1], pts[i]); l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); }
    if (ok && l < lmin) { lmin = l; best = c; }
  }
  return best ? best.map(p => depuisLocal(v, p)) : [];
}
// Cadre d'une scène entre deux points a et b (monde) : la caméra regarde de côté, du côté opposé au véhicule v
// (sinon il cache tout)
function cadreEntre(a, b, v) {
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, ux = b.x - a.x, uz = b.z - a.z, l = Math.hypot(ux, uz) || 1;
  const nx = uz / l, nz = -ux / l, s = (v.p.pos.x - mx) * nx + (v.p.pos.z - mz) * nz > 0 ? -1 : 1;
  return { x: mx, z: mz, h: Math.atan2(-s * nx, -s * nz) };
}
// une pile de n cartons (3 au plus), dessinée d'un seul appel (instances) ; sa position est celle du carton du bas
const M_PILE = new THREE.Matrix4();
export function pileCartons(n) {
  const g = new THREE.InstancedMesh(geoCarton(), MAT, 3);
  for (let i = 0; i < 3; i++) g.setMatrixAt(i, M_PILE.makeTranslation(0, i * PAS_CARTON, 0));
  g.castShadow = true; g.receiveShadow = true; g.name = 'pile';
  montrer(g, n);
  return g;
}
function montrer(pile, n) { pile.count = n; pile.userData.n = n; pile.computeBoundingSphere(); }

export class Gestes {
  // c : { jeu, scene, col, porte : la porte du bureau du chai (monde.js), acteur : celui qui fait les gestes (un client,
  // clients.js ; par défaut le personnage du joueur) }
  constructor(c) { this.c = c; this.g = null; this.cible = { x: 0, z: 0 }; this.cadre = null; this.roule = false; }
  get actif() { return this.g !== null; }
  get j() { return this.c.acteur || this.c.jeu.joueur; }

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
  // marcher jusqu'au point p() (monde, {x, z}), puis se tourner vers le cap cap() ; en contournant les véhicules du
  // domaine (jamais à travers) : par les coins de leur emprise, sans s'arrêter aux points de passage
  allerA(p, cap) {
    let limite = 4, pts = [], k = 0;
    return [{
      debut: () => {
        const j = this.j, q = p();
        pts = [];
        let a = { x: j.pos.x, z: j.pos.z };
        for (const v of this.c.jeu.aContourner || this.c.jeu.vehicules) { const d = contourner(v, a, q); if (d.length) { pts.push(...d); a = d[d.length - 1]; } }
        k = 0;
        let l = 0, b = j.pos;
        for (const c of [...pts, q]) { l += Math.hypot(c.x - b.x, c.z - b.z); b = c; }
        limite = 3 + l / 1.1;
      },
      maj: (dt, t, u, T) => {
        const j = this.j, fin = k >= pts.length, q = fin ? p() : pts[k], dx = q.x - j.pos.x, dz = q.z - j.pos.z, d = Math.hypot(dx, dz);
        const vmax = j.porte ? 1.6 : 1.9;
        if (!fin && d < 0.45) { k++; return false; }
        if ((fin && d < 0.12) || T > limite) return true;
        j.update(dt, dx, dz, 1, false, this.c.col, t, fin ? Math.min(vmax, 0.4 + d * 1.8) : vmax);
        return false;
      },
    }, {
      duree: 0.22,
      maj: (dt, t) => { const j = this.j; j.h = versAngle(j.h, cap(), dt * 12); j.update(dt, 0, 0, 0, false, this.c.col, t); },
    }];
  }
  // aller à un point du repère du véhicule, tourné vers le cap (relatif au véhicule)
  allerVers(v, l, capRel) { return this.allerA(() => versMonde(v, l, this.cible), () => v.p.h + capRel); }
  // un battant (porte sur ses gonds, objet pt) s'ouvre jusqu'à l'angle ouverte (sens 1) ou se referme (sens -1), en
  // duree secondes, depuis là où il est (déjà ouvert : rien ne bouge) : grincement à l'ouverture, claquement à la fermeture.
  // Une portière (poignee : la poignée, dans le repère du battant) bouge comme une vraie (Teddy, 24/11/2026 : « plus
  // réaliste ») : la serrure se décolle, elle s'ouvre avec de l'élan et rebondit un peu sur sa butée ; refermée, elle
  // accélère, claque et rebondit à peine. Debout à côté, on la tient par la poignée, de la main gauche (anim.js : saisir).
  battant(pt, ouverte, sens, duree, poignee = null) {
    let claque = false, a0 = 0, bouge = false;
    const but = sens > 0 ? ouverte : 0, j = () => this.j, sg = Math.sign(ouverte) || -1;
    return {
      duree: poignee ? duree * 1.3 : duree,
      debut: () => { a0 = pt.rotation.y; const deja = Math.abs(a0 - but) < 0.05; claque = deja; bouge = !deja; if (sens > 0 && !deja) son.jouer('portiere'); },
      maj: (dt, t, u) => {
        if (!poignee) pt.rotation.y = mix(a0, but, u);
        else if (!bouge) { /* déjà là où elle doit être */ } else if (sens > 0) {
          // la serrure (un petit à-coup), puis l'élan, la butée dépassée de 6 %, le retour
          const v = Math.max(0, (u - 0.12) / 0.88), c1 = 1.2, c3 = c1 + 1, k = v <= 0 ? 0 : 1 + c3 * (v - 1) ** 3 + c1 * (v - 1) ** 2;
          pt.rotation.y = u < 0.12 ? a0 + sg * 0.03 * Math.sin(Math.PI * u / 0.12) : mix(a0, but, k);
        } else {
          // elle se referme de plus en plus vite, claque, rebondit d'un rien
          const v = Math.min(1, u / 0.82);
          pt.rotation.y = u < 0.82 ? mix(a0, 0, v * v) : sg * 0.035 * Math.sin(Math.PI * (u - 0.82) / 0.18);
          if (u >= 0.82 && !claque) { claque = true; son.jouer('claque'); }
        }
        if (!poignee && sens < 0 && u >= 1 && !claque) { claque = true; son.jouer('claque'); }
        // debout à côté (pas assis dedans) : la main gauche sur la poignée, le temps du mouvement
        const a = j();
        if (poignee && bouge && a && !a.assis) {
          pt.updateWorldMatrix(true, false); a.m.groupe.updateWorldMatrix(true, false);
          vA.copy(poignee).applyMatrix4(pt.matrixWorld); a.m.groupe.worldToLocal(vA);
          const w = sens > 0 ? lisse(u / 0.14) * (1 - lisse((u - 0.62) / 0.3)) : lisse(u / 0.2) * (1 - lisse((u - 0.7) / 0.2));
          a.saisir = a.saisir || { x: 0, y: 0, z: 0, w: 0 };
          a.saisir.x = vA.x; a.saisir.y = vA.y; a.saisir.z = vA.z; a.saisir.w = w;
        }
        if (u >= 1 && j() && j().saisir) j().saisir.w = 0;
        this.immobile(dt, t);
      },
    };
  }
  // la portière du van, ou d'une voiture (son angle d'ouverture : porteOuverte ; sa poignée : poignee)
  portiere(v, sens) { return this.battant(v.m.porte, v.m.porteOuverte ?? OUVERTE, sens, sens > 0 ? 0.5 : 0.36, v.m.poignee || null); }
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
  // d'abord la pile jusqu'à soi (soulevée de arc au-dessus d'une ridelle) ; puis on se baisse (selon sa hauteur) et on
  // la soulève.
  prendre(src, n, avant, arc = 0) {
    const P = () => this.pile(), h = new THREE.Vector3();
    return {
      duree: 0.95,
      debut: () => { avant(); const p = P(); montrer(p, n); p.visible = true; this.j.porte = p; son.jouer('carton'); },
      maj: (dt, t, u, T) => {
        const s = this.local(src(vA), vT), r = aPortee(s, vR), k = arc / this.j.m.echelle;
        h.set(0, k, 0);
        // soulever, tirer à hauteur, redescendre à portée, puis dans les bras
        P().position.copy(s).addScaledVector(h, lisse(T / 0.15)).lerp(vB.copy(r).add(h), lisse((T - 0.15) / 0.25))
          .lerp(r, lisse((T - 0.4) / 0.1)).lerp(PORT, lisse((T - 0.5) / 0.45));
        this.immobile(dt, t);
      },
    };
  }
  // poser la pile portée, le carton du bas en dst() (monde) ; trop loin, on la pose à portée puis on la pousse au fond
  // (en passant à arc au-dessus d'une ridelle). apres() montre les cartons posés là.
  poser(dst, apres, arc = 0) {
    const P = () => this.pile(), h = new THREE.Vector3();
    return {
      duree: 0.9,
      maj: (dt, t, u, T) => {
        const d = this.local(dst(vA), vT), r = aPortee(d, vR), k = arc / this.j.m.echelle;
        h.set(0, k, 0);
        P().position.copy(PORT).lerp(vB.copy(r).add(h), lisse(T / 0.45)).lerp(vC.copy(d).add(h), lisse((T - 0.45) / 0.25)).lerp(d, lisse((T - 0.7) / 0.15));
        if (T > 0.5) this.j.porte = null; // la pile glisse au fond : les mains la lâchent
        this.immobile(dt, t);
        if (T + dt >= 0.9 && P().visible) { P().visible = false; this.j.porte = null; apres(); son.jouer('carton'); }
      },
    };
  }

  /* ------------------------------------------------------------ monter, descendre */
  // Aller au pied de la montée du véhicule v (au sol, tourné comme il faut pour monter)
  versMontee(v) { const D = montee(v).depart; return this.allerVers(v, D.corps, D.cap); }
  // La montée de v jouée temps par temps (sens 1), ou à rebours (sens -1 : descendre) ; vitesse : facteur des durées.
  // debut() et fin() : à l'étape de départ et d'arrivée (le personnage passe dans la caisse, en revient)
  appuis(v, sens, vitesse, debut, fin) {
    const M = montee(v), S = M.S, T = M.temps, n = T.length, cum = [0], A = new Float64Array(21);
    for (const t of T) cum.push(cum[cum.length - 1] + t.d / vitesse);
    const D = cum[n], C = [0, 0, 0], P = [0, 0, 0], pose = [false, false];
    let kAvant = -1;
    return {
      duree: D,
      debut: () => { kAvant = -1; debut?.(); },
      maj: (dt, t, u, Tg) => {
        const j = this.j, g = j.m.groupe, s = j.m.echelle, tt = sens > 0 ? Math.min(Tg, D) : Math.max(0, D - Tg);
        let k = 0; while (k < n - 1 && tt > cum[k + 1]) k++;
        const f = (tt - cum[k]) / (cum[k + 1] - cum[k]), B = T[k], W = FEN[B.t], a = S[k], b = S[k + 1];
        if (k !== kAvant) { kAvant = k; pose[0] = pose[1] = true; }
        // le corps
        const uc = lisse(fen(f, W.c));
        for (let i = 0; i < 3; i++) C[i] = mix(a.corps[i], b.corps[i], uc);
        const cap = a.cap + angle(b.cap - a.cap) * uc, co = Math.cos(cap), si = Math.sin(cap);
        g.position.set(C[0], C[1], C[2]); g.rotation.set(0, cap, 0);
        const assis = mix(a.assis, b.assis, uc);
        j.transition = assis;
        A[0] = mix(a.jambes, b.jambes, uc); A[1] = mix(a.penche, b.penche, uc); A[2] = 1 - assis;
        // repère du personnage : (point de la caisse - corps), tourné de -cap, à son échelle
        const loc = (q, k0) => {
          const dx = q[0] - C[0], dz = q[2] - C[2];
          A[k0] = (dx * co - dz * si) / s; A[k0 + 1] = (q[1] - C[1]) / s; A[k0 + 2] = (dx * si + dz * co) / s;
        };
        // les pieds : celui qui bouge se lève, passe au-dessus de la marche et se pose ; l'autre reste où il est
        const bouge0 = a.pieds[0] !== b.pieds[0], bouge1 = a.pieds[1] !== b.pieds[1], deux = bouge0 && bouge1, prem = B.premier || 0;
        for (let i = 0; i < 2; i++) {
          const k0 = 3 + 5 * i, p0 = a.pieds[i], p1 = b.pieds[i], sg = i ? -1 : 1;
          let lacet = b.lacets[i], tg = 0;
          if (p0 === p1) loc(p1, k0);
          else {
            const uf = fen(f, deux ? (i === prem ? W.p1 : W.p2) : W.p), h = lisse(borne((uf - 0.15) / 0.85, 0, 1));
            const dy = p1[1] - p0[1], lev = Math.min(0.2, 0.07 + Math.abs(dy) * 0.3);
            P[0] = mix(p0[0], p1[0], h); P[2] = mix(p0[2], p1[2], h);
            P[1] = mix(p0[1], p1[1], lisse(borne(uf / 0.75, 0, 1))) + lev * Math.sin(Math.PI * uf);
            loc(P, k0);
            tg = 0.35 * Math.sin(Math.PI * uf);
            lacet = a.lacets[i] + angle(b.lacets[i] - a.lacets[i]) * uf;
            // un bruit de pied quand il se pose (à la montée sur la marche, à la descente sur celle d'en dessous)
            const posee = sens > 0 ? uf >= 1 : uf <= 0;
            if (posee && !pose[i] && M.son) son.jouer(M.son);
            pose[i] = posee;
          }
          A[k0 + 3] = tg; A[k0 + 4] = angle(lacet - cap) + sg * 0.06;
        }
        // les mains : vers leur prise (ou lâchées), en passant un peu en arrière d'une prise à l'autre
        const um = lisse(fen(f, W.m));
        for (let i = 0; i < 2; i++) {
          const k0 = 13 + 4 * i, m0 = a.mains[i], m1 = b.mains[i];
          if (!m0 && !m1) { A[k0 + 3] = 0; continue; }
          if (m0 && m1 && m0 !== m1) {
            for (let c = 0; c < 3; c++) P[c] = mix(m0[c], m1[c], um);
            const r = Math.sin(Math.PI * um) * 0.07; P[0] += si * r; P[2] += co * r; P[1] += r * 0.5;
            loc(P, k0); A[k0 + 3] = 1;
          } else { loc(m1 || m0, k0); A[k0 + 3] = m1 ? (m0 ? 1 : um) : 1 - um; }
        }
        j.appuis = A;
        j.sync(dt, t);
        g.getWorldPosition(vT); j.pos.x = vT.x; j.pos.z = vT.z; // la caméra suit
        if (Tg >= D) fin?.();
      },
    };
  }
  // (place : on est déjà devant la portière ouverte)
  etapesMonter(v, fin, place = false) {
    if (v.m.montage) return v.m.montage.monter(this, v, fin); // (un vélo : velos.js, MONTAGE)
    const M = montee(v), porte = !!v.m.porte;
    const etapes = place ? [] : this.versMontee(v);
    if (porte && !place) etapes.push(this.portiere(v, 1));
    etapes.push(this.appuis(v, 1, 1, () => {
      const j = this.j, g = j.m.groupe;
      v.m.caisse.add(g);
      j.assis = true; j.poste = v.poste; j.v = 0;
      // dans une voiture : à sa place d'abord, le temps de mesurer sa tête sous le toit (pieton.js : caler)
      g.position.copy(v.m.siege); g.rotation.set(0, 0, 0); j.caler();
      j.transition = 0; j.baisse = M.baisse;
    }));
    if (porte) etapes.push(this.portiere(v, -1));
    etapes.push({
      action: () => {
        const j = this.j;
        j.transition = null; j.baisse = undefined; j.appuis = null;
        j.m.groupe.position.copy(v.m.siege); j.m.groupe.rotation.set(0, 0, 0);
        fin();
      },
    });
    return etapes;
  }
  etapesDescendre(v, sorti, fermer = true) {
    if (v.m.montage) return v.m.montage.descendre(this, v, sorti);
    const M = montee(v), porte = !!v.m.porte, D = M.depart;
    const etapes = [];
    if (porte) etapes.push(this.portiere(v, 1));
    etapes.push(this.appuis(v, -1, 1.2, () => { const j = this.j; j.transition = 1; j.baisse = M.baisse; }, () => {
      // pied au sol : le personnage revient dans la scène, au pied de la montée, tourné comme il y est arrivé
      const j = this.j, g = j.m.groupe;
      this.c.scene.add(g);
      versMonde(v, D.corps, this.cible);
      j.pos.set(this.cible.x, 0, this.cible.z); this.c.col.resoudre(j.pos, j.r);
      j.h = j.hv = v.p.h + D.cap; j.v = 0;
      j.assis = false; j.transition = null; j.baisse = undefined; j.poste = null; j.appuis = null;
      j.sync(0, 0);
      sorti();
    }));
    if (porte && fermer) etapes.push(this.portiere(v, -1)); // (fermer faux : on la laisse ouverte à qui monte ensuite)
    return etapes;
  }
  // Monter dans le véhicule v ; fin() quand on est installé (main.js passe en conduite)
  monter(v, fin) { this.lancer(this.etapesMonter(v, fin)); }
  // Descendre du véhicule v : sorti() quand on pose le pied au sol (main.js repasse à pied)
  descendre(v, sorti, fin) { this.lancer(this.etapesDescendre(v, sorti), fin); }
  // Mode WTF : on lui vole sa voiture, il en tombe. La portière s'ouvre (si on ne l'a pas déjà ouverte), il est éjecté (encore assis, il se déplie en
  // l'air), tombe sur le dos au pied de la voiture, la tête au loin, reste un instant par terre, puis se relève ; sorti()
  // quand il a quitté son siège, fin à la fin (main.js : il s'enfuit)
  tomber(v, sorti) {
    const j = () => this.j, A = new THREE.Vector3(), B = new THREE.Vector3();
    let psi = 0;
    const W = v.m.dims.emprise[0][1], s = v.m.siege, ouverte = Math.abs(v.m.porte.rotation.y - v.m.porteOuverte) < 0.05;
    return [...(ouverte ? [] : [this.portiere(v, 1)]), {
      action: () => {
        const g = j().m.groupe;
        g.getWorldPosition(A); this.c.scene.attach(g); g.rotation.order = 'YXZ';
        // face à la voiture, les pieds contre elle, couché sur le dos : la tête au loin
        psi = v.p.h - Math.PI / 2;
        versMonde(v, [W + 0.45, 0, s.z], B); B.y = 0;
        j().transition = 1; j().baisse = 0;
      },
    }, {
      duree: 0.45,
      maj: (dt, t, u) => {
        const p = j(), g = p.m.groupe;
        g.position.set(mix(A.x, B.x, u), mix(A.y, 0.12, u) + Math.sin(Math.PI * u) * 0.3, mix(A.z, B.z, u));
        g.rotation.set(-1.5 * u, psi, 0);
        p.transition = 1 - 0.6 * u;
        p.sync(dt, t);
        if (u >= 1) { p.pos.set(B.x, 0, B.z); sorti(); }
      },
    }, {
      duree: 0.65,
      maj: (dt, t, u, T) => { const p = j(), g = p.m.groupe; g.rotation.x = -1.5 + Math.sin(T * 9) * 0.04 * (1 - u); p.transition = 0.4 * (1 - u); p.sync(dt, t); },
    }, {
      duree: 0.55,
      maj: (dt, t, u) => { const p = j(), g = p.m.groupe; g.rotation.x = -1.5 * (1 - u); g.position.y = 0.12 * (1 - u); p.sync(dt, t); },
    }, {
      action: () => {
        const p = j(), g = p.m.groupe;
        g.rotation.set(0, psi + Math.PI, 0); g.rotation.order = 'XYZ';
        p.assis = false; p.transition = null; p.baisse = undefined; p.poste = null;
        p.placer(B.x, B.z, psi + Math.PI); // debout, dos à la voiture
      },
    }];
  }

  /* ------------------------------------------------------------ le véhicule roule tout seul (au chai)
     Le long d'un chemin (points [x, z] serrés), en duree secondes, départ et arrivée en douceur ; recul : en marche
     arrière (le véhicule regarde à l'opposé du sens de la marche). Les roues tournent et braquent, le moteur tourne ; la
     physique est suspendue (main.js : roule). */
  rouler(v, chemin, duree, recul = false) {
    const p = v.p, n = chemin.length, cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(chemin[i][0] - chemin[i - 1][0], chemin[i][1] - chemin[i - 1][1]));
    const L = cum[n - 1];
    let sAvant = 0, hAvant = 0, tSon = 0;
    const cap = i => { const a = chemin[Math.max(0, i - 1)], b = chemin[Math.min(n - 1, i + 1)]; return Math.atan2(b[0] - a[0], b[1] - a[1]) + (recul ? Math.PI : 0); };
    return {
      duree,
      debut: () => { this.roule = true; sAvant = 0; hAvant = cap(0); },
      maj: (dt, t, u) => {
        const s = u * L;
        let i = 1; while (i < n - 1 && cum[i] < s) i++;
        const a = chemin[i - 1], b = chemin[i], f = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
        const h = angle(cap(i - 1) + angle(cap(i) - cap(i - 1)) * f), ds = s - sAvant;
        p.pos.set(a[0] + (b[0] - a[0]) * f, 0, a[1] + (b[1] - a[1]) * f);
        p.v = dt > 0 ? (recul ? -ds : ds) / dt : 0; p.vT = 0;
        p.braq = ds > 1e-4 ? Math.max(-0.55, Math.min(0.55, Math.atan(p.d.emp * angle(h - hAvant) / ds) * (recul ? -1 : 1))) : p.braq;
        p.h = h; sAvant = s; hAvant = h;
        p.sync(dt, t);
        this.j.sync(dt, t);
        if ((tSon -= dt) <= 0) { tSon = 0.1; son.moteur(true, p.v, p); }
        if (u >= 1) { p.v = 0; p.braq = 0; this.roule = false; }
      },
    };
  }

  /* ------------------------------------------------------------ les cartons */
  // le côté du véhicule où l'on se tient pour charger ou décharger : le plus proche du point (x, z) parmi ceux où l'on
  // peut se tenir (pas contre un mur, une table, une voiture garée) ; s'il n'y en a aucun, le plus proche
  cote(v, x, z) {
    const ch = v.m.chargeur, sonde = { x: 0, z: 0 };
    let best = null, dmin = 1e9;
    for (const pass of [true, false]) {
      for (const k in ch) {
        versMonde(v, [ch[k][0], 0, ch[k][1]], this.cible);
        sonde.x = this.cible.x; sonde.z = this.cible.z;
        if (pass && this.c.col.resoudre(sonde, 0.34)) continue;
        const d = Math.hypot(this.cible.x - x, this.cible.z - z);
        if (d < dmin) { dmin = d; best = k; }
      }
      if (best) return best;
    }
    return best;
  }
  // se tenir au côté k du véhicule, tourné vers lui
  auVehicule(v, k) {
    const [x, z] = v.m.chargeur[k];
    return this.allerVers(v, [x, 0, z], Math.abs(x) < 0.01 ? 0 : x < 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  // centre du carton du bas de la colonne c du véhicule, dans le monde
  colonneMonde(v, c, out) { v.m.groupe.updateMatrixWorld(true); return v.m.caisse.localToWorld(out.copy(v.m.cartons[3 * c].position)); }
  ouvrirCote(v) { return v.m.coulissante ? [this.coulissante(v, 1)] : []; }
  fermerCote(v) { return v.m.coulissante ? [this.coulissante(v, -1)] : []; }

  // Au chai : on descend, on porte les piles de la palette jusqu'au véhicule (la plus proche d'abord), on remonte.
  // piles : [{ groupe, client, n }] posées sur la palette ; place(c, pile) : la pile est rangée dans la colonne c ;
  // fin() : tout est chargé et l'on est remonté au volant.
  charger(v, piles, { sorti, place, installe }, avant = [], apres = []) {
    const ptPal = { x: 0, z: 0 };
    const k = this.cote(v, piles[0].groupe.position.x, piles[0].groupe.position.z);
    const [lx, lz] = v.m.chargeur[k];
    const spot = versMonde(v, [lx, 0, lz], { x: 0, z: 0 });
    const ordre = [...piles].sort((a, b) => Math.hypot(a.groupe.position.x - spot.x, a.groupe.position.z - spot.z) - Math.hypot(b.groupe.position.x - spot.x, b.groupe.position.z - spot.z));
    const cols = ORDRE[v.genre][k].filter(c => !v.m.cartons[3 * c].visible); // les colonnes encore vides (déjà chargé une fois)
    const pal = piles[0].groupe.parent;
    this.cadre = cadreEntre(spot, pal.position, v);
    const etapes = [...avant, ...this.etapesDescendre(v, sorti), ...this.ouvrirCote(v)];
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
      }, v.m.ridelle || 0));
    });
    etapes.push(...this.fermerCote(v), ...this.etapesMonter(v, installe), ...apres);
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
      etapes.push(this.prendre(w => this.colonneMonde(v, c, w), n, () => { for (let l = 0; l < 3; l++) v.m.cartons[3 * c + l].visible = false; }, v.m.ridelle || 0));
      etapes.push(...this.allerA(() => { sol(); pt.x = pose.x + fx * 0.6; pt.z = pose.z + fz * 0.6; return pt; }, () => f.h + Math.PI));
      etapes.push(this.poser(w => w.copy(sol()), () => {
        const p = pileCartons(n); p.position.copy(pose); p.rotation.y = f.h; this.c.scene.add(p); ajout(p);
      }));
    });
    this.lancer(etapes, fin);
  }

  // Aller parler à quelqu'un devant chez lui (f : {x, z, h}) : arrêté devant (v), on descend ; on se tient face à lui, à
  // dist mètres ; il parle (dire(fin) : le dialogue, fin() à la dernière réplique). À pied (v nul), on y va. La caméra le
  // regarde en face, un peu de biais, depuis la rue.
  etapesAborder(v, f, dist, sorti, dire) {
    const fx = Math.sin(f.h), fz = Math.cos(f.h), devant = { x: f.x + fx * dist, z: f.z + fz * dist };
    let parle = false;
    this.cadre = { x: (devant.x + f.x) / 2, z: (devant.z + f.z) / 2, h: f.h + Math.PI + 0.5 };
    const etapes = v ? [...this.etapesDescendre(v, sorti)] : [];
    etapes.push(...this.allerA(() => devant, () => f.h + Math.PI));
    etapes.push({ debut: () => { parle = false; dire(() => { parle = true; }); }, maj: (dt, t) => { this.immobile(dt, t); return parle; } });
    return etapes;
  }
  // Le prospect : on va le voir, il nous accueille ; on reste devant lui, à portée pour lui servir un verre (main.js)
  aborder(v, f, { sorti, dire }) { this.lancer(this.etapesAborder(v, f, 1.6, sorti, dire)); }
  // Le chèque de l'épicerie : on va au comptoir face à l'épicier ; il parle et tend le chèque, qu'on regarde des deux
  // mains avant de le ranger (recu()) ; on remonte (installe()). À pied : seulement le comptoir.
  cheque(v, f, { sorti, installe, dire, recu }) {
    const etapes = this.etapesAborder(v, f, 1.05, sorti, dire);
    const papier = () => {
      const m = this.j.m;
      if (!m.cheque) { m.cheque = new THREE.Mesh(geoCheque(), MAT); m.cheque.userData.demi = 0.05; m.cheque.scale.setScalar(1 / m.echelle); m.groupe.add(m.cheque); }
      return m.cheque;
    };
    etapes.push({
      duree: 1.7,
      // tendu par l'épicier, pris des deux mains, regardé (incliné vers les yeux), puis rangé dans la poche
      debut: () => { const c = papier(); c.visible = true; c.rotation.set(-0.9, 0, 0); this.j.porte = c; son.jouer('tap'); },
      maj: (dt, t, u, T) => {
        const c = papier(), k = lisse(T / 0.45), r = lisse((T - 1.3) / 0.4);
        c.position.set(0, mix(1.05, 1.22, k) - r * 0.4, mix(0.62, 0.34, k));
        if (T > 1.35) this.j.porte = null;
        this.immobile(dt, t);
        if (T + dt >= 1.7 && c.visible) { c.visible = false; this.j.porte = null; recu(); }
      },
    });
    if (v) etapes.push(...this.etapesMonter(v, installe));
    this.lancer(etapes);
  }

  /* ------------------------------------------------------------ une bouteille du Clos (mission 3 : l'habillage) */
  // la bouteille dans les mains de l'acteur (créée une fois par personnage, à l'échelle du monde) : nue (tirée-bouchée)
  // ou habillée. Un groupe : les mains la tiennent par le milieu (anim.js : porte), le verre dépasse au-dessus.
  bouteille(habillee) {
    const m = this.j.m, k = habillee ? 'btH' : 'btN';
    if (!m[k]) {
      const g = new THREE.Group(), b = new THREE.Mesh(geoBouteille(habillee), MAT);
      b.position.y = -0.12 / m.echelle; b.scale.setScalar(1 / m.echelle); b.castShadow = false; g.add(b);
      g.userData.demi = 0.05; g.visible = false; m.groupe.add(g); m[k] = g;
    }
    return m[k];
  }
  // L'échantillon : on va au palox (src : { x, y, z } dans le monde, le haut des bouteilles), on en sort une bouteille,
  // on la regarde, on la range ; fin() quand c'est fait
  echantillon(src, fin) {
    const devant = { x: 0, z: 0 }, w = new THREE.Vector3();
    this.lancer([
      ...this.allerA(() => {
        const j = this.j, dx = j.pos.x - src.x, dz = j.pos.z - src.z, l = Math.hypot(dx, dz) || 1;
        devant.x = src.x + dx / l * 0.55; devant.z = src.z + dz / l * 0.55; return devant;
      }, () => Math.atan2(src.x - devant.x, src.z - devant.z)),
      {
        duree: 2.1,
        debut: () => { const b = this.bouteille(false); b.visible = true; this.j.porte = b; son.jouer('tap'); },
        maj: (dt, t, u, T) => {
          const b = this.bouteille(false), s = this.local(w.set(src.x, src.y, src.z), vT);
          // sortie du palox, montée jusqu'aux yeux, regardée, puis rangée (dans la poche de la veste)
          b.position.copy(s).lerp(vB.set(0, 1.1, 0.3), lisse(T / 0.7));
          b.position.y -= lisse((T - 1.6) / 0.4) * 0.3;
          if (T > 1.7) this.j.porte = null;
          this.immobile(dt, t);
          if (T + dt >= 2.1 && b.visible) { b.visible = false; this.j.porte = null; }
        },
      },
    ], fin);
  }
  // cadrer une scène entre deux points (monde), la caméra du côté opposé au véhicule v (le geste en cours la garde)
  cadrerEntre(a, b, v) { this.cadre = cadreEntre(a, b, v); }
  // tendre la bouteille qu'on tient (habillée ou nue) à celui qui est devant soi : donne() quand elle change de main
  tendre(habillee, donne) {
    return {
      duree: 1.5,
      debut: () => { const b = this.bouteille(habillee); b.visible = true; b.position.set(0, 0.95, 0.3); this.j.porte = b; son.jouer('tap'); },
      maj: (dt, t, u, T) => {
        const b = this.bouteille(habillee), k = lisse(T / 0.6);
        b.position.set(0, 0.95 + k * 0.12, 0.3 + k * 0.22);
        this.immobile(dt, t);
        if (T > 1.05 && b.visible) { b.visible = false; this.j.porte = null; donne(); }
      },
    };
  }
  // Donner l'échantillon à quelqu'un devant chez lui (f : { x, z, h }) : arrêté devant (v), on descend ; on va le voir,
  // il parle (dire) ; on lui tend la bouteille (donne) ; on remonte (installe) ; fin()
  donner(v, f, { sorti, installe, dire, donne, fin }) {
    const etapes = this.etapesAborder(v, f, 1.15, sorti, dire);
    etapes.push(this.tendre(false, donne), { duree: 0.5, maj: (dt, t) => this.immobile(dt, t) });
    if (v) etapes.push(...this.etapesMonter(v, installe));
    this.lancer(etapes, fin);
  }

  /* ------------------------------------------------------------ entrer dans une boutique, en ressortir (clients.js) */
  // porte : { x, z, rot } devant le seuil, la façade tournée de rot. On va devant la porte, on la passe (sans buter sur le
  // mur : on traverse la vitre peinte, qui le cache peu à peu) et l'on disparaît dedans, avec ce qu'on porte
  // (loin : jusqu'où l'on va après le seuil avant de disparaître ; plus loin quand la porte est grande ouverte)
  entrer(porte, loin = 1.1) {
    const dedans = { x: porte.x - Math.sin(porte.rot) * loin, z: porte.z - Math.cos(porte.rot) * loin };
    return [...this.allerA(() => porte, () => porte.rot + Math.PI), {
      maj: (dt, t, u, T) => {
        const j = this.j, dx = dedans.x - j.pos.x, dz = dedans.z - j.pos.z, d = Math.hypot(dx, dz);
        j.update(dt, dx, dz, 1, false, SANS_MURS, t, Math.min(1.3, 0.3 + d * 2));
        return d < 0.15 || T > 2 + loin;
      },
    }, { action: () => { const j = this.j; j.m.groupe.visible = false; if (j.m.pile) j.m.pile.visible = false; j.porte = null; j.v = 0; } }];
  }
  // ressortir (après un voyage à l'intérieur), sur le seuil, tourné vers la rue ; attente : le temps passé dedans
  sortir(porte, attente) {
    return [{ duree: attente, maj: () => {} },
      { action: () => { const j = this.j; j.placer(porte.x, porte.z, porte.rot); j.m.groupe.visible = true; } }];
  }

  /* ------------------------------------------------------------ le bureau du chai (monde.js : la pièce, sa porte) */
  // la porte du bureau, qui s'ouvre vers l'intérieur (ou celle de B.battant : { obj, a }, l'angle ouvert)
  porteBureau(sens, B) { const P = B && B.battant; return this.battant(P ? P.obj : this.c.porte, P ? P.a : -1.45, sens, sens > 0 ? 0.5 : 0.45); }
  // Passer la porte : on y va, elle s'ouvre, on passe le seuil ; au seuil, fondu au noir et la caméra change de côté
  // (passe), puis on avance et elle se referme. B : lieux.bureau (ou lieux.solumatic : B.cap, le cap pour entrer, et
  // B.battant, sa porte) ; entrer : vers l'intérieur, sinon vers dehors.
  passer(B, entrer, { fondu, passe, fin }) {
    const c0 = B.cap ?? Math.PI / 2, cap = entrer ? c0 : c0 + Math.PI, a = entrer ? B.dehors : B.dedans, b = entrer ? B.dedans : B.dehors;
    this.lancer([
      ...this.allerA(() => a, () => cap),
      this.porteBureau(1, B),
      ...this.allerA(() => B.seuil, () => cap),
      { action: () => fondu(true) },
      { duree: 0.25, maj: (dt, t) => this.immobile(dt, t) }, // le temps du fondu au noir (index.html, #fondu)
      { action: () => { passe(); fondu(false); } },
      ...this.allerA(() => b, () => cap + (entrer ? 0.4 : 0)),
      this.porteBureau(-1, B),
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
    const ouverte = v.m.coulissante && v.m.coulissante.position.z < -0.1;
    this.lancer([...(ouverte ? [...this.auVehicule(v, Object.keys(v.m.chargeur)[0]), ...this.fermerCote(v)] : []), ...this.etapesMonter(v, installe)]);
  }

  /* ------------------------------------------------------------ caresser le chien (chien.js ; Teddy, 26/11/2026) */
  // Il s'arrête et se tourne vers nous (couché, il reste couché et se met sur le dos) ; on va devant lui (ou à côté de son
  // poitrail), on s'agenouille (anim.js : caresse), la main droite sur sa tête et sa nuque (ou sur son ventre), on le
  // caresse ; il remue la queue, lèche la main, gémit de plaisir ; on se relève. dire() : une réplique, une fois à genoux.
  // La caméra regarde la scène de côté. S'il s'en va (un véhicule arrive), on se relève aussitôt.
  caresser(chien, dire, fin) {
    const place = { x: 0, z: 0, h: 0 }, cadre = { x: 0, z: 0, h: 0 }, main = new THREE.Vector3(), l = new THREE.Vector3(), C = { x: 0, y: 0, z: 0, w: 0 };
    let dit = false;
    this.lancer([
      { action: () => { chien.debutCaresse(this.j.pos.x, this.j.pos.z, place, cadre); this.cadre = cadre; } },
      ...this.allerA(() => place, () => place.h),
      {
        debut: () => { const j = this.j; j.caresse = C; C.w = 0; j.regard = chien.teteMonde; j.v = 0; },
        maj: (dt, t, u, T) => {
          const parti = chien.etat !== 'caresse';
          chien.pendantCaresse(T, main); this.local(main, l);
          C.x = l.x; C.y = l.y; C.z = l.z;
          C.w = parti ? Math.max(0, C.w - dt * 3) : lisse(T / 0.6) * (1 - lisse((T - 4.6) / 0.55));
          if (!dit && T > 0.9 && !parti) { dit = true; dire(); }
          this.immobile(dt, t);
          return T > 5.2 || (parti && C.w <= 0);
        },
      },
      { action: () => { const j = this.j; j.caresse = null; j.regard = null; chien.finCaresse(); } },
    ], fin);
  }
}
