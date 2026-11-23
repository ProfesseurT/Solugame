// Le réseau des routes et des chemins (lieux.reseau, monde.js) : l'itinéraire le plus court d'un point à un autre, pour
// la conduite assistée et la mini-carte. Chaque ligne est une suite de points [x, z] ; deux lignes se rejoignent par un
// point commun (mêmes coordonnées). Une ligne { sens: true, points } ne se parcourt que dans son sens (la boucle du bourg).

export class Reseau {
  constructor(lignes) {
    this.n = []; this.adj = []; this.seg = []; // noeuds {x, z}, voisins [{ to, w }], segments { a, b, l, sens }
    const noeud = p => {
      for (let i = 0; i < this.n.length; i++) if (Math.abs(this.n[i].x - p[0]) < 0.05 && Math.abs(this.n[i].z - p[1]) < 0.05) return i;
      this.n.push({ x: p[0], z: p[1] }); this.adj.push([]); return this.n.length - 1;
    };
    for (const L of lignes) {
      const pts = Array.isArray(L) ? L : L.points, sens = !Array.isArray(L) && L.sens;
      for (let i = 1; i < pts.length; i++) {
        const a = noeud(pts[i - 1]), b = noeud(pts[i]), l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        this.seg.push({ a, b, l, sens });
        this.adj[a].push({ to: b, w: l });
        if (!sens) this.adj[b].push({ to: a, w: l });
      }
    }
  }
  // le point du réseau le plus proche de p : { s (segment), t (0 en a, 1 en b), x, z }
  projeter(p) {
    let best = null, dmin = 1e9;
    for (let s = 0; s < this.seg.length; s++) {
      const S = this.seg[s], A = this.n[S.a], B = this.n[S.b], dx = B.x - A.x, dz = B.z - A.z;
      const t = Math.max(0, Math.min(1, ((p.x - A.x) * dx + (p.z - A.z) * dz) / (dx * dx + dz * dz || 1)));
      const x = A.x + dx * t, z = A.z + dz * t, d = Math.hypot(p.x - x, p.z - z);
      if (d < dmin) { dmin = d; best = { s, t, x, z }; }
    }
    return best;
  }
  // l'itinéraire de a à b (points {x, z}) : liste de points [x, z], du point du réseau le plus proche de a à celui le
  // plus proche de b (Dijkstra ; le réseau est petit)
  itineraire(a, b) {
    const P = this.projeter(a), Q = this.projeter(b), N = this.n.length, D = N, F = N + 1;
    const dist = new Float64Array(N + 2).fill(Infinity), prec = new Int32Array(N + 2).fill(-1), vu = new Uint8Array(N + 2);
    const sP = this.seg[P.s], sQ = this.seg[Q.s];
    // départ : vers les deux bouts de son segment (vers b seulement sur un sens unique)
    const depuisD = [{ to: sP.b, w: (1 - P.t) * sP.l }];
    if (!sP.sens) depuisD.push({ to: sP.a, w: P.t * sP.l });
    // arrivée : depuis les deux bouts de son segment (depuis a seulement sur un sens unique)
    const versF = new Map([[sQ.a, Q.t * sQ.l]]);
    if (!sQ.sens) versF.set(sQ.b, (1 - Q.t) * sQ.l);
    // même segment, arrivée devant soi : tout droit
    if (P.s === Q.s && (!sP.sens || Q.t >= P.t)) depuisD.push({ to: F, w: Math.abs(Q.t - P.t) * sP.l });
    dist[D] = 0;
    for (;;) {
      let u = -1, du = Infinity;
      for (let i = 0; i < N + 2; i++) if (!vu[i] && dist[i] < du) { du = dist[i]; u = i; }
      if (u < 0 || u === F) break;
      vu[u] = 1;
      const voisins = u === D ? depuisD : this.adj[u];
      for (const { to, w } of voisins) if (du + w < dist[to]) { dist[to] = du + w; prec[to] = u; }
      if (u < N && versF.has(u) && du + versF.get(u) < dist[F]) { dist[F] = du + versF.get(u); prec[F] = u; }
    }
    const pts = [[Q.x, Q.z]];
    for (let u = prec[F]; u >= 0 && u !== D; u = prec[u]) pts.push([this.n[u].x, this.n[u].z]);
    pts.push([P.x, P.z]);
    pts.reverse();
    // deux points confondus (départ ou arrivée sur un noeud) : un seul
    return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.05);
  }
}

// longueur d'une ligne [x, z]
export function longueur(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; }
// distance de p {x, z} à une ligne [x, z]
export function ecart(pts, p) {
  let dmin = 1e9;
  for (let i = 1; i < pts.length; i++) {
    const A = pts[i - 1], B = pts[i], dx = B[0] - A[0], dz = B[1] - A[1];
    const t = Math.max(0, Math.min(1, ((p.x - A[0]) * dx + (p.z - A[1]) * dz) / (dx * dx + dz * dz || 1)));
    dmin = Math.min(dmin, Math.hypot(p.x - A[0] - dx * t, p.z - A[1] - dz * t));
  }
  return dmin;
}
