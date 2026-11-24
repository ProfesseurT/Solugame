// Collisions au sol, en 2D : boîtes alignées (bâtiments, troncs, murets), rangs de vigne,
// limites du monde. Grille de 8 m pour ne tester que les obstacles proches.
import { permis, ramener, SORTIE } from './relief.js';

const CASE = 8;
export const LIMITE = 186;

export class Collisions {
  constructor() {
    this.boites = [];
    this.cases = new Map();
    this.parcelles = [];
    this.vu = 0;
    this.nx = 0; this.nz = 0; // normale du dernier contact
    this.rang = { x0: 0, z0: 0, x1: 0, z1: 0, vu: 0 };
  }
  cle(ix, iz) { return (ix + 512) * 1024 + (iz + 512); }

  boite(x0, z0, x1, z1) {
    const b = { x0, z0, x1, z1, vu: 0 };
    this.boites.push(b);
    for (let ix = Math.floor(x0 / CASE); ix <= Math.floor(x1 / CASE); ix++)
      for (let iz = Math.floor(z0 / CASE); iz <= Math.floor(z1 / CASE); iz++) {
        const k = this.cle(ix, iz);
        let l = this.cases.get(k);
        if (!l) this.cases.set(k, l = []);
        l.push(b);
      }
    return b;
  }
  boiteC(cx, cz, w, d) { return this.boite(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2); }
  // Une boîte tournée (les maisons du village du château, tournées vers lui) : centre, largeur w et profondeur d dans son
  // repère, tourné de rot autour de la verticale comme le décor (modeles.js : x' = x cos + z sin, z' = z cos - x sin).
  // Rangée dans la grille par son enveloppe (x0..z1), qui sert aussi à la caméra.
  boiteO(cx, cz, w, d, rot) {
    const co = Math.cos(rot), si = Math.sin(rot), ex = (Math.abs(co) * w + Math.abs(si) * d) / 2, ez = (Math.abs(si) * w + Math.abs(co) * d) / 2;
    const b = this.boite(cx - ex, cz - ez, cx + ex, cz + ez);
    b.o = { cx, cz, hw: w / 2, hd: d / 2, co, si };
    return b;
  }
  // retire une boîte (une voiture garée qu'on vient de prendre, main.js)
  retirer(b) {
    const i = this.boites.indexOf(b);
    if (i >= 0) this.boites.splice(i, 1);
    for (const l of this.cases.values()) { const k = l.indexOf(b); if (k >= 0) l.splice(k, 1); }
  }

  // Pousse le cercle (p.x, p.z, r) hors d'une boîte. Renvoie true s'il y avait contact.
  pousser(p, r, b) {
    if (b.o) return this.pousserO(p, r, b.o);
    const cx = p.x < b.x0 ? b.x0 : p.x > b.x1 ? b.x1 : p.x;
    const cz = p.z < b.z0 ? b.z0 : p.z > b.z1 ? b.z1 : p.z;
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return false;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2), k = (r - d) / d;
      p.x += dx * k; p.z += dz * k; this.nx = dx / d; this.nz = dz / d;
    } else {
      const g = p.x - b.x0, dr = b.x1 - p.x, h = p.z - b.z0, bas = b.z1 - p.z, m = Math.min(g, dr, h, bas);
      if (m === g) { p.x = b.x0 - r; this.nx = -1; this.nz = 0; }
      else if (m === dr) { p.x = b.x1 + r; this.nx = 1; this.nz = 0; }
      else if (m === h) { p.z = b.z0 - r; this.nx = 0; this.nz = -1; }
      else { p.z = b.z1 + r; this.nx = 0; this.nz = 1; }
    }
    return true;
  }

  // la même chose contre une boîte tournée : dans son repère, puis retour dans celui du monde
  pousserO(p, r, o) {
    const dx = p.x - o.cx, dz = p.z - o.cz;
    let lx = dx * o.co - dz * o.si, lz = dx * o.si + dz * o.co, nx, nz;
    const qx = lx < -o.hw ? -o.hw : lx > o.hw ? o.hw : lx, qz = lz < -o.hd ? -o.hd : lz > o.hd ? o.hd : lz;
    const ex = lx - qx, ez = lz - qz, d2 = ex * ex + ez * ez;
    if (d2 >= r * r) return false;
    if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; lx += ex * k; lz += ez * k; nx = ex / d; nz = ez / d; }
    else {
      const m = Math.min(o.hw - lx, lx + o.hw, o.hd - lz, lz + o.hd);
      if (m === o.hw - lx) { lx = o.hw + r; nx = 1; nz = 0; } else if (m === lx + o.hw) { lx = -o.hw - r; nx = -1; nz = 0; }
      else if (m === o.hd - lz) { lz = o.hd + r; nx = 0; nz = 1; } else { lz = -o.hd - r; nx = 0; nz = -1; }
    }
    p.x = o.cx + lx * o.co + lz * o.si; p.z = o.cz + lz * o.co - lx * o.si;
    this.nx = nx * o.co + nz * o.si; this.nz = nz * o.co - nx * o.si;
    return true;
  }

  // Résout un cercle contre tout le décor proche. Renvoie true en cas de contact.
  resoudre(p, r) {
    let touche = false;
    this.vu++;
    const ix0 = Math.floor((p.x - r) / CASE), ix1 = Math.floor((p.x + r) / CASE);
    const iz0 = Math.floor((p.z - r) / CASE), iz1 = Math.floor((p.z + r) / CASE);
    for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
      const l = this.cases.get(this.cle(ix, iz));
      if (!l) continue;
      for (let i = 0; i < l.length; i++) {
        const b = l[i];
        if (b.vu === this.vu || b.fantome) continue; // fantome : compte pour la caméra (dedans), n'arrête personne
        b.vu = this.vu;
        if (this.pousser(p, r, b)) touche = true;
      }
    }
    // on va partout, collines comprises, jusqu'au bord de ce qu'on peut parcourir (relief.js : permis) ; au-delà, on y revient
    if ((p.x < -LIMITE || p.x > LIMITE || p.z < -LIMITE || p.z > LIMITE) && !permis(p.x, p.z, r)) {
      ramener(p.x, p.z, r);
      p.x = SORTIE.x; p.z = SORTIE.z; this.nx = SORTIE.nx; this.nz = SORTIE.nz;
      touche = true;
    }
    return touche;
  }

  // Un point est-il dans un bâtiment ? (sert à garder la caméra dehors)
  dedans(x, z) {
    const l = this.cases.get(this.cle(Math.floor(x / CASE), Math.floor(z / CASE)));
    if (!l) return false;
    for (let i = 0; i < l.length; i++) {
      const b = l[i];
      if (!b.haut || x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
      if (!b.o) return true;
      const o = b.o, dx = x - o.cx, dz = z - o.cz;
      if (Math.abs(dx * o.co - dz * o.si) < o.hw && Math.abs(dx * o.si + dz * o.co) < o.hd) return true;
    }
    return false;
  }

  // Parcelle de vigne : rangs parallèles à z, espacés de « ecart »
  parcelle(x0, z0, x1, z1, ecart) {
    const larg = x1 - x0 - 1.2, n = Math.floor(larg / ecart) + 1;
    const q = { x0, z0, x1, z1, ecart, n, xr: x0 + 0.6 + (larg - (n - 1) * ecart) / 2, zr0: z0 + 2.5, zr1: z1 - 2.5 };
    this.parcelles.push(q);
    return q;
  }
  // Contact avec un rang (et poussée si bloquer). Les rangs font 0,64 m de large.
  rangs(p, r, bloquer) {
    for (let i = 0; i < this.parcelles.length; i++) {
      const q = this.parcelles[i];
      if (p.x < q.x0 - r || p.x > q.x1 + r || p.z < q.zr0 - r || p.z > q.zr1 + r) continue;
      let k = Math.round((p.x - q.xr) / q.ecart);
      if (k < 0) k = 0; else if (k >= q.n) k = q.n - 1;
      const rx = q.xr + k * q.ecart, b = this.rang;
      b.x0 = rx - 0.32; b.x1 = rx + 0.32; b.z0 = q.zr0; b.z1 = q.zr1;
      if (bloquer) { if (this.pousser(p, r, b)) return true; }
      else {
        const cx = p.x < b.x0 ? b.x0 : p.x > b.x1 ? b.x1 : p.x, cz = p.z < b.z0 ? b.z0 : p.z > b.z1 ? b.z1 : p.z;
        if ((p.x - cx) ** 2 + (p.z - cz) ** 2 < r * r) return true;
      }
    }
    return false;
  }
}
