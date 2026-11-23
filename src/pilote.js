// Conduite assistée au doigt : tant que le doigt est posé sans tourner, le véhicule suit l'itinéraire de la mission
// (sur la file de droite), règle sa vitesse dans les virages, ralentit derrière une voiture et s'arrête à la destination.
// Le joueur reprend la main dès qu'il glisse le doigt sur le côté (main.js).
import { borne } from './outils.js';

const VOIE = 1.6;          // décalage vers la droite de l'itinéraire sur la départementale (on roule à droite)
const surRoute = (a, b) => Math.abs(a[1] - 10) < 2.5 && Math.abs(b[1] - 10) < 2.5; // segment le long de la départementale (z = 10)
const CROISIERE = { tracteur: 8.5, van: 12.5, voiture: 14 }; // vitesse de croisière (m/s)
const SONDE = { x: 0, z: 0 }; // point d'essai devant ou derrière le véhicule (demi-tour)
const COINS = [0, 0.8, -0.8]; // milieu et coins du pare-chocs, sondés pendant un demi-tour

// l'itinéraire décalé sur la file de droite de la départementale (ailleurs, chemins et rues étroites : au milieu)
function decaler(route) {
  const n = route.length, out = [];
  for (let i = 0; i < n; i++) {
    let rx = 0, rz = 0, m = 0;
    for (const [a, b] of [[i - 1, i], [i, i + 1]]) {
      if (a < 0 || b >= n) continue;
      const dx = route[b][0] - route[a][0], dz = route[b][1] - route[a][1], l = Math.hypot(dx, dz) || 1, k = surRoute(route[a], route[b]) ? VOIE : 0;
      rx += -dz / l * k; rz += dx / l * k; m++; // droite de la direction (dx, dz)
    }
    // jusqu'au bout sur sa file (un arrêt au bord de la départementale) ; hors de la départementale, rien ne bouge
    const k = !m ? 0 : 1 / m;
    out.push({ x: route[i][0] + rx * k, z: route[i][1] + rz * k });
  }
  return out;
}

export class Pilote {
  constructor() { this.route = null; this.P = null; this.i = 0; this.actif = false; this.demi = null; }
  // nouvel itinéraire (ou aucun) : on repart du segment le plus proche
  prendre(route) {
    if (route === this.route) return;
    this.route = route; this.P = route && route.length > 1 ? decaler(route) : null; this.i = -1; this.demi = null;
  }
  // position de p projetée sur le segment i : paramètre (0 au début, 1 à la fin)
  param(i, p) {
    const A = this.P[i], B = this.P[i + 1], dx = B.x - A.x, dz = B.z - A.z, l2 = dx * dx + dz * dz || 1;
    return ((p.x - A.x) * dx + (p.z - A.z) * dz) / l2;
  }
  // commande { gaz, braq } pour le véhicule tr (Tracteur de vehicules.js) vers la cible de la mission, ou null
  commande(tr, genre, cible, voitures, col) {
    const P = this.P;
    this.actif = false;
    if (!P) return null;
    const pos = tr.pos;
    // segment de départ : le plus proche du véhicule ; ensuite on avance quand on a dépassé le bout du segment
    if (this.i < 0) {
      let dmin = 1e9;
      for (let i = 0; i < P.length - 1; i++) {
        const t = borne(this.param(i, pos), 0, 1), x = P[i].x + (P[i + 1].x - P[i].x) * t, z = P[i].z + (P[i + 1].z - P[i].z) * t;
        const d = Math.hypot(x - pos.x, z - pos.z);
        if (d < dmin) { dmin = d; this.i = i; }
      }
    }
    while (this.i < P.length - 2 && this.param(this.i, pos) > 1) this.i++;
    // loin de l'itinéraire (on est parti ailleurs) : pas d'assistance, on reprendra en revenant dessus
    {
      const A = P[this.i], B = P[this.i + 1], t0 = borne(this.param(this.i, pos), 0, 1);
      const ecart = Math.hypot(A.x + (B.x - A.x) * t0 - pos.x, A.z + (B.z - A.z) * t0 - pos.z);
      if (ecart > 15) { this.i = -1; return null; }
    }
    // point visé à L mètres devant, le long de l'itinéraire
    const av = Math.abs(tr.v), L = 5.5 + av * 0.65;
    let i = this.i, t = borne(this.param(i, pos), 0, 1), reste = L;
    let x = P[i].x + (P[i + 1].x - P[i].x) * t, z = P[i].z + (P[i + 1].z - P[i].z) * t;
    while (reste > 0) {
      const B = P[i + 1], d = Math.hypot(B.x - x, B.z - z);
      if (d >= reste || i >= P.length - 2) { const k = d > 1e-6 ? Math.min(1, reste / d) : 0; x += (B.x - x) * k; z += (B.z - z) * k; break; }
      reste -= d; x = B.x; z = B.z; i++;
    }
    // poursuite : angle des roues qui amène le véhicule sur le point visé (positif : à gauche)
    const h = tr.h, sx = Math.sin(h), cz = Math.cos(h), dx = x - pos.x, dz = z - pos.z;
    const lon = dx * sx + dz * cz, lat = dx * cz - dz * sx, Ld = Math.hypot(dx, dz) || 1;
    const T = tr.T, emp = tr.d.emp, ecartAngle = Math.atan2(lat, lon);
    // le point visé est derrière : demi-tour en trois temps (en avant braqué à gauche, en arrière braqué à droite,
    // puis on repart), comme dans une rue étroite ; on change de temps au bout de l'angle voulu ou contre un obstacle
    if (!this.demi && Math.abs(ecartAngle) > 1.9 && av < 3) this.demi = { phase: 0, t: 0, h0: h, x: pos.x, z: pos.z, tp: 0 };
    if (this.demi) {
      const D = this.demi, tourne = Math.abs(((h - D.h0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      D.t += 1 / 60; D.tp += 1 / 60;
      // coincé (il pousse sans avancer) : on change de temps
      let coince = false;
      if (D.tp > 1.2) { coince = Math.hypot(pos.x - D.x, pos.z - D.z) < 0.35; D.tp = 0; D.x = pos.x; D.z = pos.z; }
      // un obstacle (mur, arbre, poteau) juste devant, ou juste derrière en reculant
      // la place est-elle libre juste devant (s = 1) ou juste derrière (s = -1) : décor, l'autre véhicule, les voitures ;
      // on sonde trois points (milieu et coins)
      const libre = s => {
        const o = s > 0 ? tr.d.off[0] : tr.d.off[1], k = o + s * (tr.d.r + 1.0);
        for (const c of COINS) {
          const px = pos.x + sx * k + cz * c, pz = pos.z + cz * k - sx * c;
          SONDE.x = px; SONDE.z = pz;
          if (col && col.resoudre(SONDE, 0.6)) return false;
          for (const a of tr.autres) for (const ao of a.d.off) if (Math.hypot(px - (a.pos.x + Math.sin(a.h) * ao), pz - (a.pos.z + Math.cos(a.h) * ao)) < a.d.r + 0.6) return false;
          // les voitures : là où elles sont, et là où elles seront dans 1,5 s (une voiture lancée arrive vite)
          for (let j = 0; j < voitures.length; j++) {
            const v = voitures[j], dz = pz - v.z;
            if (Math.abs(dz) > 2.2) continue;
            const a0 = v.x - 1.1, a1 = v.x + 1.1 + Math.abs(v.v) * 1.5 * (v.sens > 0 ? 1 : 0), b0 = v.x - 1.1 - Math.abs(v.v) * 1.5 * (v.sens < 0 ? 1 : 0), b1 = v.x + 1.1;
            const x0 = Math.min(a0, b0), x1 = Math.max(a1, b1), ex = px < x0 ? x0 - px : px > x1 ? px - x1 : 0;
            if (Math.hypot(ex, dz) < 1.6) return false;
          }
        }
        return true;
      };
      // fini quand le point visé est devant ; si l'on recule encore, on freine d'abord (pas d'élan vers un obstacle)
      if (Math.abs(ecartAngle) < 0.9) { this.demi = null; if (tr.v < -0.2) { this.actif = true; return { gaz: 1, braq: 0 }; } }
      else if (D.phase === 0) {
        if (D.t > 0.25 && (tourne > 1.5 || !libre(1) || coince || D.t > 7)) { D.phase = 1; D.t = 0; D.tp = 0; D.h0 = h; }
        else { this.actif = true; return { gaz: borne((2.2 - tr.v) * 0.9, -1, 1), braq: 1 }; }
      }
      if (this.demi && D.phase === 1) {
        if (D.t > 0.25 && (!libre(-1) || (D.t > 1 && (tourne > 1.4 || coince)) || D.t > 6)) { D.phase = 0; D.t = 0; D.tp = 0; D.h0 = h; }
        else { this.actif = true; return { gaz: tr.v > 0.2 ? -1 : -0.8, braq: -1 }; }
      }
    }
    let delta = lon > 0.5 ? Math.atan(2 * emp * (lat / Ld) / Ld) : (lat >= 0 ? 1 : -1) * T.braqMax;
    delta = borne(delta, -T.braqMax, T.braqMax);
    const lim = Math.min(T.braqMax, Math.atan(emp * T.alat / Math.max(0.01, av * av)));
    const braq = borne(delta / lim, -1, 1);
    // vitesse : croisière, moins vite en virage, dans les vignes et près de la destination ; derrière une voiture
    let vc = (CROISIERE[genre] || 8) * (1 - 0.75 * Math.min(1, Math.abs(delta) / T.braqMax));
    if (lon <= 0.5) vc = 2.2;
    if (tr.vignes) vc = Math.min(vc, T.vmaxVigne * 0.85);
    if (cible) {
      const d = Math.hypot(cible.x - pos.x, cible.z - pos.z);
      vc = Math.min(vc, d < 4.2 ? 0 : Math.sqrt(2 * 2.4 * (d - 4.2)));
    }
    // un autre véhicule du joueur, garé sur le passage : on s'arrête avant (on le contourne à la main) ; mesuré le long de
    // la direction du point visé (pas du capot : pendant un virage, il balaie à côté)
    for (const a of tr.autres) {
      const ux = dx / Ld, uz = dz / Ld, ex = a.pos.x - pos.x, ez = a.pos.z - pos.z, lo = ex * ux + ez * uz, la = ex * uz - ez * ux;
      if (lo > 0 && lo < 9 && Math.abs(la) < a.d.r + tr.d.r * 0.85) vc = Math.min(vc, lo < 5.5 ? 0 : (lo - 5.5) * 1.2);
    }
    for (let k = 0; k < voitures.length; k++) {
      const v = voitures[k], ex = v.x - pos.x, ez = v.z - pos.z, lo = ex * sx + ez * cz, la = ex * cz - ez * sx;
      if (lo > 0 && lo < 20 && Math.abs(la) < 2.2) vc = Math.min(vc, lo < 8 ? 0 : v.v * 0.9);
    }
    // céder le passage : au bout d'un chemin ou d'une rue (on roule vers la départementale), on arrive assez lentement
    // pour pouvoir s'arrêter au bord ; on s'y arrête tant qu'une voiture arrive, d'un côté ou de l'autre (environ 4 s
    // d'avance)
    const bord = Math.abs(pos.z - 10) - 6.2;
    if (bord > -1.5 && bord < 40 && Math.sign(10 - pos.z) * cz > 0.5) {
      let arrive = false;
      for (let k = 0; k < voitures.length; k++) {
        const v = voitures[k], ex = (pos.x - v.x) * v.sens; // > 0 : elle vient vers nous
        if (ex > -7 && ex < 7 + v.v * 3.6) { arrive = true; break; }
      }
      const vs = Math.sqrt(2 * 2.4 * Math.max(0, bord));
      vc = Math.min(vc, arrive ? vs : vs + 3);
    }
    // tourner à gauche depuis la départementale (vers les Grands Champs, la rue de la place) : on coupe la file d'en face ;
    // on s'arrête bien avant le coin, encore dans sa file (sinon la voiture d'en face nous voit dans la sienne et s'arrête
    // dans l'entrée du chemin), tant qu'une voiture arrive en face (environ 4 s d'avance)
    if (Math.abs(pos.z - 10) < 3) {
      for (let k = this.i + 1; k < P.length - 1 && k <= this.i + 3; k++) {
        const A = P[k], B = P[k + 1];
        if (Math.abs(A.z - 10) > 3) break;
        if (Math.abs(B.z - 10) < 6 || (B.z - 10) * (pos.z - 10) >= 0) continue;
        const dC = Math.hypot(A.x - pos.x, A.z - pos.z);
        if (dC < 40) {
          for (let j = 0; j < voitures.length; j++) {
            const v = voitures[j], ex = (pos.x - v.x) * v.sens; // > 0 : elle vient vers nous
            // (arrêtée, elle nous laisse passer)
            if (v.sens * sx < 0 && v.v > 0.5 && ex > -5 && ex < 8 + v.v * 4) { vc = Math.min(vc, Math.sqrt(2 * 2.4 * Math.max(0, dC - 9))); break; }
          }
        }
        break;
      }
    }
    const gaz = vc < 0.05 && tr.v < 0.3 ? 0 : borne((vc - tr.v) * 0.9, -1, 1);
    this.actif = true;
    return { gaz, braq };
  }
}

// vitesse de croisière au doigt quand on conduit soi-même (sans itinéraire, ou en tournant)
export const croisiere = genre => CROISIERE[genre] || 8;
