// Collisions au sol, en 2D : boîtes alignées (bâtiments, troncs, murets), rangs de vigne,
// limites du monde. Grille de 8 m pour ne tester que les obstacles proches.
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

  // Pousse le cercle (p.x, p.z, r) hors d'une boîte. Renvoie true s'il y avait contact.
  pousser(p, r, b) {
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
        if (b.vu === this.vu) continue;
        b.vu = this.vu;
        if (this.pousser(p, r, b)) touche = true;
      }
    }
    if (p.x < -LIMITE) { p.x = -LIMITE; this.nx = 1; this.nz = 0; touche = true; }
    if (p.x > LIMITE) { p.x = LIMITE; this.nx = -1; this.nz = 0; touche = true; }
    if (p.z < -LIMITE) { p.z = -LIMITE; this.nx = 0; this.nz = 1; touche = true; }
    if (p.z > LIMITE) { p.z = LIMITE; this.nx = 0; this.nz = -1; touche = true; }
    return touche;
  }

  // Un point est-il dans un bâtiment ? (sert à garder la caméra dehors)
  dedans(x, z) {
    const l = this.cases.get(this.cle(Math.floor(x / CASE), Math.floor(z / CASE)));
    if (!l) return false;
    for (let i = 0; i < l.length; i++) { const b = l[i]; if (b.haut && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true; }
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
