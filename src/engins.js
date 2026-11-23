// Modèles du tracteur, du van de livraison et des voitures (géométrie low poly, roues séparées pour tourner).
import * as THREE from 'three';
import { B, C, T, MAT, MAT_VITRE, fusion, teinter, deplacer } from './modeles.js';

const TAU = Math.PI * 2;
const VITRE = '#2d3846'; // reconnue comme vitre (table TYPES de modeles.js) : reflète le ciel

/* ---------------------------------------------------------------- outils de carrosserie
   Les carrosseries sont faites de facettes posées une à une (coques en sections, dalles percées de fenêtres,
   blocs à huit coins) plutôt que de pavés : vraie silhouette, vitres, passages de roue. Tout finit fusionné en
   une géométrie par véhicule, avec la matière commune MAT. */

// Atelier : triangles rangés par couleur et par matière, livrés en géométries (position, normale de la facette,
// couleur et type par sommet) prêtes pour fusion(). Chaque triangle est tourné vers `ext` (direction indicative
// de l'extérieur) : l'ordre des sommets donné n'a pas d'importance.
class Atelier {
  constructor() { this.lots = new Map(); }
  tri(a, b, c, col, ty, ext) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * nx + ny * ny + nz * nz < 1e-14) return; // facette dégénérée
    const cle = col + '|' + (ty ?? '');
    let l = this.lots.get(cle);
    if (!l) this.lots.set(cle, l = { col, ty, p: [] });
    if (nx * ext[0] + ny * ext[1] + nz * ext[2] < 0) l.p.push(a[0], a[1], a[2], c[0], c[1], c[2], b[0], b[1], b[2]);
    else l.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }
  quad(a, b, c, d, col, ty, ext) { this.tri(a, b, c, col, ty, ext); this.tri(a, c, d, col, ty, ext); }
  // polygone convexe, en éventail
  poly(pts, col, ty, ext) { for (let i = 1; i < pts.length - 1; i++) this.tri(pts[0], pts[i], pts[i + 1], col, ty, ext); }
  geos() {
    const out = [];
    for (const { col, ty, p } of this.lots.values()) {
      const pos = new Float32Array(p), nor = new Float32Array(p.length);
      for (let i = 0; i < pos.length; i += 9) {
        const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2];
        const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        for (let j = 0; j < 9; j += 3) { nor[i + j] = nx; nor[i + j + 1] = ny; nor[i + j + 2] = nz; }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      out.push(teinter(g, col, ty));
    }
    return out;
  }
}

// Bloc convexe à huit coins : p[0..3] tour de la face du bas, p[4..7] ceux du haut dans le même ordre
const FACES_BLOC = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
function bloc(at, p, col, ty) {
  let cx = 0, cy = 0, cz = 0;
  for (const q of p) { cx += q[0] / 8; cy += q[1] / 8; cz += q[2] / 8; }
  for (const f of FACES_BLOC) {
    const a = p[f[0]], b = p[f[1]], c = p[f[2]], d = p[f[3]];
    at.quad(a, b, c, d, col, ty, [(a[0] + b[0] + c[0] + d[0]) / 4 - cx, (a[1] + b[1] + c[1] + d[1]) / 4 - cy, (a[2] + b[2] + c[2] + d[2]) / 4 - cz]);
  }
}
// Barre de section carrée (demi-côté r) entre deux points
function barre(at, a, b, r, col, ty) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  const u = new THREE.Vector3(0, 1, 0).cross(d); if (u.lengthSq() < 1e-6) u.set(1, 0, 0);
  u.normalize().multiplyScalar(r);
  const v = new THREE.Vector3().crossVectors(d, u).normalize().multiplyScalar(r);
  const c = (p, s, t) => [p[0] + u.x * s + v.x * t, p[1] + u.y * s + v.y * t, p[2] + u.z * s + v.z * t];
  bloc(at, [c(a, -1, -1), c(a, 1, -1), c(a, 1, 1), c(a, -1, 1), c(b, -1, -1), c(b, 1, -1), c(b, 1, 1), c(b, -1, 1)], col, ty);
}

// Dalle : un contour plan [u, v] (et ses trous) qui prend de l'épaisseur. pt(u, v, s) place un point du contour sur
// la face extérieure (s = 0) ou intérieure (s = 1) : la dalle peut être inclinée ou cintrée. ext : direction de la
// face extérieure. Options : colIn (face intérieure), colT (tranche des trous : joints de vitre).
function dalle(at, contour, trous, pt, ext, col, ty, o = {}) {
  const V = l => l.map(([u, v]) => new THREE.Vector2(u, v));
  const faces = THREE.ShapeUtils.triangulateShape(V(contour), trous.map(V));
  const tous = contour.concat(...trous);
  const P0 = tous.map(([u, v]) => pt(u, v, 0)), P1 = tous.map(([u, v]) => pt(u, v, 1));
  const inv = [-ext[0], -ext[1], -ext[2]], cIn = o.colIn ?? col, tIn = o.colIn ? o.tyIn : ty;
  for (const [i, j, k] of faces) {
    at.tri(P0[i], P0[j], P0[k], col, ty, ext);
    at.tri(P1[i], P1[j], P1[k], cIn, tIn, inv);
  }
  // tranches : le pourtour (tourné vers l'extérieur du contour), le bord des trous (tourné vers le vide du trou)
  let base = 0;
  [contour, ...trous].forEach((l, n) => {
    let aire = 0;
    for (let i = 0; i < l.length; i++) { const a = l[i], b = l[(i + 1) % l.length]; aire += a[0] * b[1] - b[0] * a[1]; }
    const sens = (aire > 0 ? 1 : -1) * (n ? 1 : -1), c = n && o.colT ? o.colT : col, t = n && o.colT ? o.tyT : ty;
    for (let i = 0; i < l.length; i++) {
      const i2 = (i + 1) % l.length, a = l[i], b = l[i2], mu = (a[0] + b[0]) / 2, mv = (a[1] + b[1]) / 2;
      const m0 = pt(mu, mv, 0.5), m1 = pt(mu - (b[1] - a[1]) * sens * 0.05, mv + (b[0] - a[0]) * sens * 0.05, 0.5);
      at.quad(P0[base + i], P0[base + i2], P1[base + i2], P1[base + i], c, t, [m1[0] - m0[0], m1[1] - m0[1], m1[2] - m0[2]]);
    }
    base += l.length;
  });
}

// Coque en sections : stations le long de z (croissant), chacune une demi-section [x, y] donnée du haut (x = 0) vers
// le bas. L'anneau complet descend côté +x, passe dessous (si `ferme`) et remonte côté -x. couleur(g, k) donne
// [couleur, type] de la facette entre les stations g et g + 1 sur le bandeau k (0 en haut ; symétrique), ou null.
function coque(at, zs, demi, couleur, ferme) {
  const A = zs.map((z, i) => {
    const H = demi(z, i);
    return [...H, ...H.slice(1).reverse().map(([x, y]) => [-x, y])].map(([x, y]) => [x, y, z]);
  });
  const N = A[0].length, n = (N - 1) / 2;
  for (let g = 0; g < zs.length - 1; g++) {
    const a = A[g], b = A[g + 1];
    for (let k = 0; k < N; k++) {
      if (k === n && !ferme) continue;
      const c = couleur(g, k <= n ? k : 2 * n - k);
      if (!c) continue;
      const k2 = (k + 1) % N;
      at.quad(a[k], a[k2], b[k2], b[k], c[0], c[1], dehors(a[k], a[k2], b[k], b[k2]));
    }
  }
  return { A, zs };
}
// direction extérieure d'un bandeau de coque : la normale, dans le plan de la section, du plus long des deux segments
function dehors(a, a2, b, b2) {
  let tx = a2[0] - a[0], ty = a2[1] - a[1];
  const sx = b2[0] - b[0], sy = b2[1] - b[1];
  if (sx * sx + sy * sy > tx * tx + ty * ty) { tx = sx; ty = sy; }
  return [-ty, tx, 0];
}
// Point de la coque (côté +x) : bandeau k, cote z, fraction v du bandeau ; décollé de e vers l'extérieur
function surCoque(co, z, k, v, e = 0, g = -1) {
  const { A, zs } = co;
  if (g < 0) { g = 0; while (g < zs.length - 2 && z > zs[g + 1]) g++; }
  const u = Math.min(1, Math.max(0, (z - zs[g]) / (zs[g + 1] - zs[g]))), a = A[g], b = A[g + 1];
  const l = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  const p = l(l(a[k], a[k + 1], v), l(b[k], b[k + 1], v), u);
  if (!e) return p;
  // normale de la facette, tournée vers l'extérieur
  const d1 = [b[k + 1][0] - a[k][0], b[k + 1][1] - a[k][1], b[k + 1][2] - a[k][2]];
  const d2 = [a[k + 1][0] - b[k][0], a[k + 1][1] - b[k][1], a[k + 1][2] - b[k][2]];
  const n = [d1[1] * d2[2] - d1[2] * d2[1], d1[2] * d2[0] - d1[0] * d2[2], d1[0] * d2[1] - d1[1] * d2[0]];
  const h = dehors(a[k], a[k + 1], b[k], b[k + 1]), sg = n[0] * h[0] + n[1] * h[1] + n[2] * h[2] < 0 ? -1 : 1;
  const ln = Math.hypot(n[0], n[1], n[2]) * sg;
  return [p[0] + n[0] / ln * e, p[1] + n[1] / ln * e, p[2] + n[2] / ln * e];
}
// Décor posé sur une coque, des deux côtés : rectangle [z0, z1] x [v0, v1] du bandeau k, décollé de e.
// Coupé aux stations : chaque morceau épouse sa facette.
function decor(at, co, k, z0, z1, v0, v1, e, col, ty) {
  const zs = co.zs, coupes = [z0, ...zs.filter(z => z > z0 + 1e-4 && z < z1 - 1e-4), z1];
  for (let i = 0; i < coupes.length - 1; i++) {
    const a = coupes[i], b = coupes[i + 1], zm = (a + b) / 2;
    let g = 0; while (g < zs.length - 2 && zm > zs[g + 1]) g++;
    const C4 = [[a, v0], [b, v0], [b, v1], [a, v1]];
    const q = C4.map(([z, v]) => surCoque(co, z, k, v, e, g)), r = surCoque(co, a, k, v0, 0, g);
    const n = [q[0][0] - r[0], q[0][1] - r[1], q[0][2] - r[2]];
    for (const s of [1, -1]) at.quad(...q.map(p => [p[0] * s, p[1], p[2]]), col, ty, [n[0] * s, n[1], n[2]]);
  }
}
// Fond d'une coque fermée (première ou dernière station), en éventail depuis le centre ; sz : +1 vers l'avant
function fond(at, anneau, col, ty, sz) {
  let cx = 0, cy = 0;
  for (const p of anneau) { cx += p[0] / anneau.length; cy += p[1] / anneau.length; }
  const c = [cx, cy, anneau[0][2]];
  for (let k = 0; k < anneau.length; k++) at.tri(c, anneau[k], anneau[(k + 1) % anneau.length], col, ty, [0, 0, sz]);
}
// Rectangle plat (vu de face) dans le plan z = cte, tourné vers sz (+1 : vers l'avant)
function plaque(at, x0, x1, y0, y1, z, sz, col, ty, miroir) {
  for (const s of miroir ? [1, -1] : [1]) at.quad([x0 * s, y0, z], [x1 * s, y0, z], [x1 * s, y1, z], [x0 * s, y1, z], col, ty, [0, 0, sz]);
}
// teinte assombrie (joints de portes) ou éclaircie
function nuance(c, k) { return '#' + new THREE.Color(c).multiplyScalar(k).getHexString(); }

/* ---------------------------------------------------------------- roues
   Pneu à n pans (bande de roulement, flanc), jante claire à rayons (une facette sur deux plus sombre : les rayons se
   lisent aussi bien à l'arrêt qu'en roulant) et cache-moyeu. Centre à l'origine, axe x, face extérieure du côté
   x > 0 (cote = 1) ou x < 0 (cote = -1). dedans : flanc intérieur (inutile quand il est caché par la caisse). */
const ROUES = new Map();
function roue(r, l, n, cote, dedans, jante = '#c4c8cd') {
  const cle = [r, l, n, cote, dedans, jante].join();
  let g = ROUES.get(cle);
  if (g) return g;
  const at = new Atelier(), h = l / 2, rj = r * 0.64, PNEU = '#1c1c20', CREUX = '#34373c';
  const P = (x, rr, a) => [x * cote, Math.cos(a) * rr, Math.sin(a) * rr], X = [cote, 0, 0];
  for (let i = 0; i < n; i++) {
    const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, am = (a0 + a1) / 2;
    at.quad(P(-h, r, a0), P(h, r, a0), P(h, r, a1), P(-h, r, a1), PNEU, 0, [0, Math.cos(am), Math.sin(am)]);
    at.quad(P(h, r, a0), P(h, rj, a0), P(h, rj, a1), P(h, r, a1), PNEU, 0, X);
    at.quad(P(h + 0.004, rj, a0), P(h + 0.004, rj * 0.45, a0), P(h + 0.004, rj * 0.45, a1), P(h + 0.004, rj, a1), i % 2 ? CREUX : jante, T.carrosserie, X);
    at.tri(P(h + 0.004, rj * 0.45, a0), P(h + 0.004, rj * 0.45, a1), P(h + 0.004, 0, 0), jante, T.carrosserie, X);
  }
  const cache = [0, 1, 2, 3, 4].map(i => P(h + 0.014, rj * 0.28, i / 5 * TAU));
  at.poly(cache, '#8d9298', T.carrosserie, X);
  if (dedans) at.poly(Array.from({ length: n }, (_, i) => P(-h, r, i / n * TAU)), PNEU, 0, [-cote, 0, 0]);
  g = fusion(at.geos());
  ROUES.set(cle, g);
  return g;
}

/* ---------------------------------------------------------------- tracteur */

export function tracteur() {
  const groupe = new THREE.Group();
  const caisse = new THREE.Group(); groupe.add(caisse);
  const OR = '#ef7a2c', GRIS = '#3b3d44', CREME = '#efe3c6';
  const corps = [
    B(0.72, 0.36, 3.1, GRIS, 0, 0.78, 0.2),
    B(0.86, 0.78, 1.6, OR, 0, 1.22, 1.02),
    B(0.88, 0.1, 1.62, '#d9661f', 0, 1.64, 1.02),
    B(0.72, 0.56, 0.05, '#25262b', 0, 1.18, 1.83),
    B(0.16, 0.12, 0.06, CREME, 0.3, 1.5, 1.84), B(0.16, 0.12, 0.06, CREME, -0.3, 1.5, 1.84),
    // garde-boue arrière
    B(0.5, 0.08, 1.5, OR, 0.95, 1.66, -0.9), B(0.5, 0.08, 1.5, OR, -0.95, 1.66, -0.9),
    B(0.06, 0.5, 1.5, OR, 0.71, 1.4, -0.9), B(0.06, 0.5, 1.5, OR, -0.71, 1.4, -0.9),
    // plancher et siège
    B(1.3, 0.08, 1.2, GRIS, 0, 1.2, -0.6),
    B(0.5, 0.14, 0.46, '#2a2a2e', 0, 1.42, -0.62),
    B(0.5, 0.55, 0.1, '#2a2a2e', 0, 1.72, -0.86),
    // colonne de direction (le volant est à part, il tourne)
    C(0.05, 0.05, 0.62, 5, '#222', 0, 1.56, -0.1, 'y'),
    // arceau et toit pare-soleil
    B(0.08, 1.55, 0.08, '#2b2b30', 0.74, 2.2, -1.3), B(0.08, 1.55, 0.08, '#2b2b30', -0.74, 2.2, -1.3),
    B(0.08, 1.55, 0.08, '#2b2b30', 0.74, 2.2, 0.05), B(0.08, 1.55, 0.08, '#2b2b30', -0.74, 2.2, 0.05),
    B(1.7, 0.09, 1.7, OR, 0, 3.0, -0.62),
    B(1.72, 0.05, 1.72, '#d9661f', 0, 2.94, -0.62),
    // échappement
    C(0.06, 0.06, 0.9, 6, '#26272b', 0.3, 2.05, 1.45),
    // plateau arrière (porte les cartons)
    B(1.3, 0.08, 0.75, '#56585f', 0, 1.25, -1.85),
    B(0.06, 0.3, 0.75, '#56585f', 0.62, 1.4, -1.85), B(0.06, 0.3, 0.75, '#56585f', -0.62, 1.4, -1.85),
  ];
  const c = new THREE.Mesh(fusion(corps), MAT); c.castShadow = true; c.receiveShadow = true; caisse.add(c);

  // volant : incliné vers le conducteur, il tourne autour de sa colonne (tm.volant.rotation.y)
  const support = new THREE.Group(); support.position.set(0, 1.88, -0.16); support.rotation.x = -0.55; caisse.add(support);
  const jante = teinter(new THREE.TorusGeometry(0.19, 0.022, 4, 14).rotateX(Math.PI / 2), '#1f1f23');
  const volant = new THREE.Mesh(fusion([
    jante,
    B(0.36, 0.025, 0.04, '#2a2a2e'), B(0.04, 0.025, 0.2, '#2a2a2e', 0, 0, -0.09),
    C(0.045, 0.045, 0.05, 8, '#ef7a2c', 0, 0.01, 0),
  ]), MAT);
  volant.castShadow = true; support.add(volant);

  const roueT = (r, l, jante) => fusion([
    C(r, r, l, 14, '#1e1e22', 0, 0, 0, 'x'),
    C(jante, jante, l + 0.02, 10, CREME, 0, 0, 0, 'x'),
    B(l + 0.04, jante * 1.7, 0.12, '#c9b991'),
    B(l + 0.04, 0.12, jante * 1.7, '#c9b991'),
  ]);
  const gR = roueT(0.78, 0.44, 0.44), gA = roueT(0.45, 0.3, 0.25);
  const mk = (geo, parent, x, y, z) => { const m = new THREE.Mesh(geo, MAT); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const rouesAr = [mk(gR, groupe, 0.98, 0.78, -0.9), mk(gR, groupe, -0.98, 0.78, -0.9)];
  // essieu avant oscillant (il penche sur les bosses), qui porte les deux pivots de direction
  const essieu = new THREE.Group(); essieu.position.set(0, 0.45, 1.35); groupe.add(essieu);
  const pivots = [new THREE.Group(), new THREE.Group()];
  pivots[0].position.set(0.84, 0, 0); pivots[1].position.set(-0.84, 0, 0);
  essieu.add(pivots[0], pivots[1]);
  const rouesAv = [mk(gA, pivots[0], 0, 0, 0), mk(gA, pivots[1], 0, 0, 0)];

  // jusqu'à 18 cartons sur le plateau (3 de large, 2 de profondeur, 3 de haut), cachés tant qu'ils ne sont pas chargés ;
  // posés sur la caisse, ils roulent et tanguent avec elle
  const cartons = [];
  const geoCarton = fusion([B(0.4, 0.28, 0.32, '#b98a55'), B(0.41, 0.03, 0.06, '#e8d9b8', 0, 0.13, 0)]);
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(geoCarton, MAT);
    m.position.set(-0.42 + (i % 3) * 0.42, 1.43 + Math.floor(i / 6) * 0.29, -1.68 - (Math.floor(i / 3) % 2) * 0.34);
    m.castShadow = true; m.visible = false; caisse.add(m); cartons.push(m);
  }
  // siège : position du conducteur dans le repère de la caisse (qui coïncide avec celui du groupe au repos)
  // dims : rayons et hauteurs des roues, empattement, cercles de collision (centres le long de l'axe, rayon), point de
  // roulis et tangage ; en plus : position des roues (z et demi-voie), dessus du siège (assise) et plancher sous les pieds
  const dims = {
    rAr: 0.78, rAv: 0.45, yAr: 0.78, yAv: 0.45, emp: 2.25, off: [1.05, -0.95], r: 1.12, pivot: new THREE.Vector3(0, 0.75, -0.35),
    zAr: -0.9, zAv: 1.35, xAr: 0.98, xAv: 0.84, assise: 1.5, plancher: 1.24,
  };
  return {
    groupe, caisse, rouesAr, rouesAv, pivots, essieu, volant, cartons, siege: new THREE.Vector3(0, 0.62, -0.62),
    dims, volantCentre: new THREE.Vector3(0, 1.9, -0.18), volantRayon: 0.2, volantInclinaison: -0.55,
  };
}

/* ---------------------------------------------------------------- van de livraison
   Fourgonnette compacte du domaine, crème avec un liseré bordeaux et une grappe sur les flancs. Caisse creuse :
   cabine (deux sièges, planche de bord, colonne de direction) et espace de chargement (plancher en bois, passages de
   roue) se voient par les vitres, qui sont transparentes (matière MAT_VITRE, une géométrie à part). Volant à gauche.
   Repère : avant vers +z, +x à gauche, origine au sol au milieu de l'empattement. */
const VAN = {
  E: 0.035,            // épaisseur des tôles
  R: 0.31,             // rayon des roues (et hauteur de leur centre)
  RA: 0.41,            // rayon des passages de roue
  X: 0.765,            // demi-voie (centre des roues)
  ZAV: 1.3, ZAR: -1.3, // essieux
};
const CREME_V = '#f1ece0', BORDEAUX = '#6d1f2f', PLAST_V = '#4a4d53', NOIR_V = '#1a1b1e', SOMBRE_V = '#2b2d32';
// demi-largeur du flanc selon la hauteur : vertical jusqu'à la ceinture, puis légèrement rentré vers le toit
const flancX = y => y <= 1.1 ? 0.9 : 0.9 - 0.07 * Math.min(1, (y - 1.1) / 0.7);
const capotY = z => 1.068 - (z - 1.3) * 0.27; // dessus du capot
const nezZ = y => 2.08 - (y - 0.54) * 0.12;   // face avant, au-dessus du pare-chocs
// grappe faite de six grains (hexagones), d'une tige et d'une feuille ; place(du, dv) donne le point 3D
function grappe(at, place, ext, r, col, ty) {
  const hexa = (cu, cv) => at.poly([0, 1, 2, 3, 4, 5].map(i => place(cu + Math.cos(i / 6 * TAU) * r, cv + Math.sin(i / 6 * TAU) * r)), col, ty, ext);
  const pas = r * 2, rang = r * 1.73;
  hexa(-pas, 0); hexa(0, 0); hexa(pas, 0); hexa(-pas / 2, -rang); hexa(pas / 2, -rang); hexa(0, -rang * 2);
  at.quad(place(-r * 0.15, r * 0.8), place(r * 0.25, r * 0.8), place(r * 0.6, r * 2.6), place(r * 0.2, r * 2.6), '#4f3a26', 0, ext);
  at.poly([place(r * 0.4, r * 1.3), place(r * 1.9, r * 1.0), place(r * 3.0, r * 2.1), place(r * 2.2, r * 3.2), place(r * 0.9, r * 2.7)], '#5d7a36', T.carrosserie, ext);
}

let geoVolantVan = null, geoCartonVan = null;
export function van() {
  const { E, R, RA, X, ZAV, ZAR } = VAN;
  const groupe = new THREE.Group();
  const caisse = new THREE.Group(); groupe.add(caisse);
  const at = new Atelier(), atV = new Atelier();
  const PEINT = T.carrosserie;
  const extra = []; // pièces faites avec B et C

  /* -- flancs : une dalle par côté, percée des passages de roue et des vitres, légèrement rentrée au-dessus de la ceinture */
  const arche = za => [-83, -55, -27, 0, 27, 55, 83].map(d => { const t = d * Math.PI / 180; return [za + RA * Math.sin(t), R + RA * Math.cos(t)]; });
  const silhouette = [[-1.96, 0.36], ...arche(ZAR), ...arche(ZAV), [1.96, 0.36], [1.96, 0.852], [1.3, 1.033], [0.62, 1.765], [-1.96, 1.765]];
  const vitreCabine = [[1.147, 1.12], [0.627, 1.67], [-0.26, 1.7], [-0.26, 1.12]];
  const vitreLaterale = [[-0.42, 1.12], [-0.42, 1.7], [-1.16, 1.7], [-1.16, 1.12]]; // porte coulissante, à droite
  for (const s of [1, -1]) {
    const trous = s > 0 ? [vitreCabine] : [vitreCabine, vitreLaterale];
    dalle(at, silhouette, trous, (u, v, f) => [s * (flancX(v) - f * E), v, u], [s, 0, 0], CREME_V, PEINT, { colIn: '#d6d0c2', tyIn: 0, colT: SOMBRE_V, tyT: 0 });
    for (const tr of trous) atV.poly(tr.map(([u, v]) => [s * (flancX(v) - E / 2), v, u]), VITRE, undefined, [s, 0, 0]);
    const F = (z, y, e = 0.005) => [s * (flancX(y) + e), y, z], ext = [s, 0, 0];
    // liseré bordeaux (une bande et un filet) tout le long
    at.quad(F(-1.96, 0.8), F(1.9, 0.8), F(1.9, 0.86), F(-1.96, 0.86), BORDEAUX, PEINT, ext);
    at.quad(F(-1.96, 0.765), F(1.9, 0.765), F(1.9, 0.778), F(-1.96, 0.778), BORDEAUX, PEINT, ext);
    // grappe sur le panneau de chargement
    grappe(at, (du, dv) => F(-1.56 + du, 1.33 + dv), ext, 0.046, BORDEAUX, PEINT);
    // joints de portes (traits sombres) : porte avant, et porte coulissante à droite
    const J = nuance(CREME_V, 0.45), trait = (a, b) => {
      const dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy), oz = -dy / l * 0.006, oy = dz / l * 0.006;
      at.quad(F(a[0] + oz, a[1] + oy, 0.007), F(b[0] + oz, b[1] + oy, 0.007), F(b[0] - oz, b[1] - oy, 0.007), F(a[0] - oz, a[1] - oy, 0.007), J, PEINT, ext);
    };
    trait([1.16, 1.1], [0.95, 0.78]); trait([0.95, 0.78], [0.87, 0.37]);
    trait([-0.28, 0.37], [-0.28, 1.76]);
    if (s < 0) { trait([-0.4, 0.37], [-0.4, 1.76]); trait([-1.18, 0.37], [-1.18, 1.76]); trait([-1.18, 1.42], [-1.95, 1.42]); }
    else at.quad(F(-1.06, 0.93), F(-0.94, 0.93), F(-0.94, 1.03), F(-1.06, 1.03), nuance(CREME_V, 0.9), PEINT, ext); // trappe à carburant
    // poignées
    extra.push(B(0.03, 0.035, 0.15, PLAST_V, s * 0.915, 1.0, -0.12));
    if (s < 0) extra.push(B(0.03, 0.035, 0.15, PLAST_V, -0.915, 1.0, -0.56));
    // rétroviseur : bras, coque, miroir
    extra.push(B(0.12, 0.035, 0.05, PLAST_V, s * 0.95, 1.13, 1.12), B(0.07, 0.21, 0.13, PLAST_V, s * 1.03, 1.2, 1.12));
    at.quad([s * 0.998, 1.105, 1.052], [s * 1.062, 1.105, 1.052], [s * 1.062, 1.295, 1.052], [s * 0.998, 1.295, 1.052], '#8ea2b4', T.vitre, [0, 0, -1]);
    // passages de roue : ciel et paroi intérieure (cachent l'intérieur), à l'avant plus profonds (les roues braquent)
    extra.push(B(0.45, 0.16, 0.84, NOIR_V, s * 0.64, 0.72, ZAV), B(0.04, 0.5, 0.84, NOIR_V, s * 0.415, 0.55, ZAV));
    extra.push(B(0.285, 0.16, 0.84, '#4a4c52', s * 0.7225, 0.72, ZAR), B(0.04, 0.4, 0.84, '#4a4c52', s * 0.6, 0.6, ZAR));
  }

  /* -- toit : section à pans coupés, prolongée vers l'arrière ; l'avant suit la pente du pare-brise */
  dalle(at, [[0.835, 1.765], [0.75, 1.86], [-0.75, 1.86], [-0.835, 1.765], [-0.8, 1.745], [0.8, 1.745]], [],
    (u, v, f) => [u, v, f ? -2.06 : 0.62 - (v - 1.745) * 0.94], [0, 0, 1], CREME_V, PEINT);
  for (const z of [-0.25, -0.85, -1.45]) at.quad([0.72, 1.864, z - 0.03], [-0.72, 1.864, z - 0.03], [-0.72, 1.864, z + 0.03], [0.72, 1.864, z + 0.03], nuance(CREME_V, 0.93), PEINT, [0, 1, 0]);

  /* -- avant : capot, face avant, coins, pare-chocs, phares, calandre, plaque */
  dalle(at, [[0.9, 1.3], [0.9, 1.96], [0.8, 2.04], [-0.8, 2.04], [-0.9, 1.96], [-0.9, 1.3]], [], (u, v, f) => [u, capotY(v) - f * E, v], [0, 1, 0], CREME_V, PEINT);
  dalle(at, [[0.8, 0.54], [0.8, 0.868], [-0.8, 0.868], [-0.8, 0.54]], [], (u, v, f) => [u, v, nezZ(v) - f * E], [0, 0, 1], CREME_V, PEINT);
  const N = (x, y, e = 0.005) => [x, y, nezZ(y) + e];
  for (const s of [1, -1]) {
    // coin avant (pan coupé entre le flanc et la face avant)
    const o = [[s * 0.9, 0.54, 1.96], [s * 0.8, 0.54, 2.08], [s * 0.8, 0.868, 2.04], [s * 0.9, 0.852, 1.96]];
    const d = o.map(([x, y, z]) => [x - s * 0.027, y, z - 0.022]);
    bloc(at, [o[0], o[1], d[1], d[0], o[3], o[2], d[2], d[3]], CREME_V, PEINT);
    // phare (glace, réflecteur) qui tourne un peu sur le coin, clignotant
    at.quad(N(s * 0.445, 0.688, 0.003), N(s * 0.8, 0.688, 0.003), N(s * 0.8, 0.852, 0.003), N(s * 0.445, 0.852, 0.003), '#2b2e33', 0, [0, 0, 1]);
    at.quad(N(s * 0.46, 0.7), N(s * 0.79, 0.7), N(s * 0.79, 0.84), N(s * 0.46, 0.84), '#dbe3e8', T.vitre, [0, 0, 1]);
    at.quad(N(s * 0.5, 0.73, 0.008), N(s * 0.62, 0.73, 0.008), N(s * 0.62, 0.81, 0.008), N(s * 0.5, 0.81, 0.008), '#f6f3ea', 0, [0, 0, 1]);
    const cf = (y, k) => [s * (0.8 + 0.1 * k + 0.004 * 0.77), y, 2.08 - (y - 0.54) * 0.12 * (1 - k) - 0.12 * k + 0.004 * 0.64];
    at.quad(cf(0.7, 0.05), cf(0.7, 0.55), cf(0.84, 0.55), cf(0.84, 0.05), '#dbe3e8', T.vitre, [s * 0.77, 0, 0.64]);
    at.quad(N(s * 0.66, 0.62), N(s * 0.78, 0.62), N(s * 0.78, 0.67), N(s * 0.66, 0.67), '#d07a22', T.carrosserie, [0, 0, 1]);
  }
  at.quad(N(-0.4, 0.58), N(0.4, 0.58), N(0.4, 0.68), N(-0.4, 0.68), '#232528', 0, [0, 0, 1]);
  at.quad(N(-0.4, 0.69, 0.006), N(0.4, 0.69, 0.006), N(0.4, 0.705, 0.006), N(-0.4, 0.705, 0.006), BORDEAUX, PEINT, [0, 0, 1]);
  grappe(at, (du, dv) => N(du, 0.645 + dv, 0.009), [0, 0, 1], 0.014, '#d9d2c2', PEINT);
  // pare-chocs avant (plastique), plaque claire
  dalle(at, [[0.93, 1.86], [0.93, 2.06], [0.84, 2.16], [-0.84, 2.16], [-0.93, 2.06], [-0.93, 1.86]], [], (u, v, f) => [u, f ? 0.24 : 0.54, v], [0, 1, 0], PLAST_V, 0);
  plaque(at, -0.26, 0.26, 0.295, 0.415, 2.165, 1, '#2c2c2e', 0);
  plaque(at, -0.25, 0.25, 0.302, 0.408, 2.168, 1, '#ecebe3', 0);
  // pare-brise, montants, auvent, essuie-glaces
  const GB = [0.862, 1.068, 1.3], GH = [0.8, 1.745, 0.63], nv = [0, 0.703, 0.711];
  atV.quad(GB, [-GB[0], GB[1], GB[2]], [-GH[0], GH[1], GH[2]], GH, VITRE, undefined, nv);
  for (const s of [1, -1]) {
    const pts = [[s * 0.9, 1.068, 1.3], [s * 0.79, 1.068, 1.3], [s * 0.73, 1.745, 0.63], [s * 0.835, 1.745, 0.63]];
    const dec = (p, e) => [p[0], p[1] + nv[1] * e, p[2] + nv[2] * e];
    bloc(at, [...pts.map(p => dec(p, -0.025)), ...pts.map(p => dec(p, 0.018))], CREME_V, PEINT);
  }
  at.quad([0.88, capotY(1.3) + 0.004, 1.3], [-0.88, capotY(1.3) + 0.004, 1.3], [-0.88, capotY(1.37) + 0.004, 1.37], [0.88, capotY(1.37) + 0.004, 1.37], '#26282c', 0, [0, 1, 0]);
  const vitreP = (x, t, e) => [x, 1.068 + 0.677 * t + nv[1] * e, 1.3 - 0.67 * t + nv[2] * e];
  for (const [x0, x1] of [[0.06, 0.62], [-0.6, -0.04]]) at.quad(vitreP(x0, 0.03, 0.01), vitreP(x1, 0.1, 0.01), vitreP(x1, 0.115, 0.01), vitreP(x0, 0.045, 0.01), '#1e1f22', 0, nv);

  /* -- arrière : deux portes vitrées, montants avec les feux, pare-chocs, plaque */
  const xAr = y => y <= 1.1 ? 0.84 : 0.84 - 0.05 * Math.min(1, (y - 1.1) / 0.665);
  const vitreAr = [[[0.07, 1.06], [0.6, 1.06], [0.6, 1.66], [0.07, 1.66]], [[-0.07, 1.06], [-0.07, 1.66], [-0.6, 1.66], [-0.6, 1.06]]];
  dalle(at, [[0.84, 0.47], [0.84, 1.1], [0.79, 1.765], [-0.79, 1.765], [-0.84, 1.1], [-0.84, 0.47]], vitreAr,
    (u, v, f) => [u, v, -2.04 + f * E], [0, 0, -1], CREME_V, PEINT, { colIn: '#d6d0c2', tyIn: 0, colT: SOMBRE_V, tyT: 0 });
  for (const tr of vitreAr) atV.poly(tr.map(([u, v]) => [u, v, -2.04 + E / 2]), VITRE, undefined, [0, 0, -1]);
  const RR = (x, y, e = 0.005) => [x, y, -2.04 - e];
  for (const s of [1, -1]) {
    // coins arrière (pans coupés), en deux hauteurs (le flanc rentre au-dessus de la ceinture)
    for (const [y0, y1] of [[0.47, 1.1], [1.1, 1.765]]) {
      const o = [[s * flancX(y0), y0, -1.96], [s * xAr(y0), y0, -2.04], [s * xAr(y1), y1, -2.04], [s * flancX(y1), y1, -1.96]];
      const d = o.map(([x, y, z]) => [x - s * 0.028, y, z + 0.021]);
      bloc(at, [o[0], o[1], d[1], d[0], o[3], o[2], d[2], d[3]], CREME_V, PEINT);
    }
    // sur le pan coupé : point à la hauteur y, fraction k de la largeur
    const cc = (y, k, e = 0.005) => { const x0 = flancX(y), x1 = xAr(y); return [s * (x0 + (x1 - x0) * k + 0.8 * e), y, -1.96 - 0.08 * k - 0.6 * e]; };
    const ext = [s * 0.8, 0, -0.6];
    // feux arrière : rouge, orange, blanc (sur le montant et le pan coupé)
    at.quad(RR(s * 0.632, 0.865, 0.003), RR(s * 0.828, 0.865, 0.003), RR(s * 0.828, 1.435, 0.003), RR(s * 0.632, 1.435, 0.003), '#24262a', 0, [0, 0, -1]);
    for (const [y0, y1, col] of [[1.12, 1.42, '#9a1820'], [1.0, 1.12, '#d07a22'], [0.88, 1.0, '#e6e4de']]) {
      at.quad(RR(s * 0.64, y0), RR(s * 0.82, y0), RR(s * 0.82, y1), RR(s * 0.64, y1), col, T.carrosserie, [0, 0, -1]);
      at.quad(cc(y0, 0.15), cc(y0, 0.9), cc(y1, 0.9), cc(y1, 0.15), col, T.carrosserie, ext);
    }
    at.quad(cc(0.8, 0), cc(0.8, 1), cc(0.86, 1), cc(0.86, 0), BORDEAUX, PEINT, ext);
    at.quad(cc(0.765, 0), cc(0.765, 1), cc(0.778, 1), cc(0.778, 0), BORDEAUX, PEINT, ext);
  }
  at.quad(RR(-0.84, 0.8), RR(0.84, 0.8), RR(0.84, 0.86), RR(-0.84, 0.86), BORDEAUX, PEINT, [0, 0, -1]);
  at.quad(RR(-0.84, 0.765), RR(0.84, 0.765), RR(0.84, 0.778), RR(-0.84, 0.778), BORDEAUX, PEINT, [0, 0, -1]);
  const JR = nuance(CREME_V, 0.45);
  for (const x of [0, 0.625, -0.625]) at.quad(RR(x - 0.006, 0.47, 0.007), RR(x + 0.006, 0.47, 0.007), RR(x + 0.006, 1.74, 0.007), RR(x - 0.006, 1.74, 0.007), JR, PEINT, [0, 0, -1]);
  at.quad(RR(-0.16, 1.71), RR(0.16, 1.71), RR(0.16, 1.742), RR(-0.16, 1.742), '#9a1820', T.carrosserie, [0, 0, -1]);
  extra.push(B(0.14, 0.035, 0.03, PLAST_V, -0.13, 1.0, -2.055));
  dalle(at, [[0.93, -1.88], [0.93, -2.06], [0.84, -2.14], [-0.84, -2.14], [-0.93, -2.06], [-0.93, -1.88]], [], (u, v, f) => [u, f ? 0.24 : 0.47, v], [0, 1, 0], PLAST_V, 0);
  plaque(at, 0.26, -0.26, 0.3, 0.42, -2.145, -1, '#2c2c2e', 0);
  plaque(at, 0.25, -0.25, 0.307, 0.413, -2.148, -1, '#ecebe3', 0);
  extra.push(C(0.032, 0.032, 0.16, 6, '#2a2a2e', -0.5, 0.3, -2.02, 'z'));

  /* -- dessous et intérieur */
  extra.push(
    B(0.8, 0.16, 3.8, NOIR_V, 0, 0.33, 0),                                   // châssis
    B(1.73, 0.05, 1.3, '#373a40', 0, 0.425, 0.25),                           // plancher de la cabine
    B(1.16, 0.15, 1.6, '#8d7c66', 0, 0.475, -1.2),                           // plancher de chargement (bois)
    B(0.285, 0.15, 0.48, '#8d7c66', 0.7225, 0.475, -0.64), B(0.285, 0.15, 0.48, '#8d7c66', -0.7225, 0.475, -0.64),
    B(0.285, 0.15, 0.28, '#8d7c66', 0.7225, 0.475, -1.86), B(0.285, 0.15, 0.28, '#8d7c66', -0.7225, 0.475, -1.86),
    B(1.73, 0.35, 0.05, SOMBRE_V, 0, 0.6, 0.88),                             // tablier
    B(0.36, 0.06, 0.16, '#202226', 0.38, 1.07, 0.87),                        // casquette du compteur
    B(0.2, 0.05, 0.025, '#222326', 0, 1.69, 0.6),                            // rétroviseur intérieur
  );
  bloc(at, [[0.865, 0.78, 0.8], [0.865, 0.8, 1.29], [-0.865, 0.8, 1.29], [-0.865, 0.78, 0.8],
    [0.865, 1.045, 0.8], [0.865, 1.065, 1.29], [-0.865, 1.065, 1.29], [-0.865, 1.045, 0.8]], '#2e3137', 0); // planche de bord
  at.quad([-0.11, 0.86, 0.796], [0.11, 0.86, 0.796], [0.11, 0.98, 0.796], [-0.11, 0.98, 0.796], '#1d2836', T.vitre, [0, 0, -1]);
  // sièges (conducteur à gauche, passager à droite)
  for (const cx of [0.38, -0.38]) {
    const TI = '#4d5566';
    bloc(at, [[cx - 0.24, 0.64, -0.24], [cx + 0.24, 0.64, -0.24], [cx + 0.24, 0.66, 0.2], [cx - 0.24, 0.66, 0.2],
      [cx - 0.24, 0.765, -0.24], [cx + 0.24, 0.765, -0.24], [cx + 0.24, 0.795, 0.2], [cx - 0.24, 0.795, 0.2]], TI, 0);
    bloc(at, [[cx - 0.24, 0.76, -0.33], [cx + 0.24, 0.76, -0.33], [cx + 0.24, 0.76, -0.21], [cx - 0.24, 0.76, -0.21],
      [cx - 0.22, 1.42, -0.45], [cx + 0.22, 1.42, -0.45], [cx + 0.22, 1.42, -0.33], [cx - 0.22, 1.42, -0.33]], TI, 0);
    extra.push(B(0.24, 0.15, 0.09, TI, cx, 1.53, -0.41), B(0.34, 0.2, 0.34, '#26282c', cx, 0.54, -0.03));
  }
  // volant (à part, il tourne) : moyeu en volantCentre, incliné vers le conducteur ; colonne fixe dans la planche
  const volantCentre = new THREE.Vector3(0.38, 1.18, 0.4), volantInclinaison = -1.1;
  const col = [0, -Math.cos(volantInclinaison), -Math.sin(volantInclinaison)], vc = volantCentre;
  barre(at, [vc.x + col[0] * 0.03, vc.y + col[1] * 0.03, vc.z + col[2] * 0.03], [vc.x + col[0] * 0.42, vc.y + col[1] * 0.42, vc.z + col[2] * 0.42], 0.028, '#26282c', 0);

  const corps = new THREE.Mesh(fusion([...at.geos(), ...extra]), MAT);
  corps.castShadow = true; corps.receiveShadow = true; caisse.add(corps);
  const vitre = new THREE.Mesh(fusion(atV.geos()), MAT_VITRE);
  vitre.receiveShadow = true; caisse.add(vitre);

  const support = new THREE.Group(); support.position.copy(volantCentre); support.rotation.x = volantInclinaison; caisse.add(support);
  if (!geoVolantVan) {
    geoVolantVan = fusion([
      teinter(new THREE.TorusGeometry(0.18, 0.019, 4, 12).rotateX(Math.PI / 2), '#1d1e22'),
      B(0.32, 0.02, 0.035, '#2a2b30'), B(0.035, 0.02, 0.17, '#2a2b30', 0, 0, -0.085),
      C(0.055, 0.055, 0.04, 8, '#2a2b30', 0, 0.012, 0),
      teinter(C(0.026, 0.026, 0.006, 8, '#000', 0, 0.034, 0), BORDEAUX, PEINT),
    ]);
  }
  const volant = new THREE.Mesh(geoVolantVan, MAT); volant.castShadow = true; support.add(volant);

  // roues : une géométrie par côté (jante vers l'extérieur), partagée par l'avant et l'arrière (et par tous les vans)
  const rG = roue(R, 0.2, 12, 1, true, '#b9bec4'), rD = roue(R, 0.2, 12, -1, true, '#b9bec4');
  const mk = (geo, parent, x, y, z) => { const m = new THREE.Mesh(geo, MAT); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const rouesAr = [mk(rG, groupe, X, R, ZAR), mk(rD, groupe, -X, R, ZAR)];
  const essieu = new THREE.Group(); essieu.position.set(0, R, ZAV); groupe.add(essieu);
  const pivots = [new THREE.Group(), new THREE.Group()];
  pivots[0].position.set(X, 0, 0); pivots[1].position.set(-X, 0, 0);
  essieu.add(pivots[0], pivots[1]);
  const rouesAv = [mk(rG, pivots[0], 0, 0, 0), mk(rD, pivots[1], 0, 0, 0)];

  // 18 cartons dans l'espace de chargement (3 de large entre les passages de roue, 3 de profondeur depuis les portes
  // arrière, 2 de haut), cachés tant qu'ils ne sont pas chargés ; on les voit par les vitres arrière et latérale
  if (!geoCartonVan) {
    const a = new Atelier();
    a.quad([-0.172, 0.1405, -0.03], [0.172, 0.1405, -0.03], [0.172, 0.1405, 0.03], [-0.172, 0.1405, 0.03], '#e8d9b8', 0, [0, 1, 0]);
    geoCartonVan = fusion([B(0.34, 0.28, 0.32, '#b98a55'), ...a.geos()]);
  }
  const cartons = [];
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(geoCartonVan, MAT);
    m.position.set(0.36 - (i % 3) * 0.36, 0.69 + Math.floor(i / 9) * 0.29, -1.79 + (Math.floor(i / 3) % 3) * 0.34);
    m.castShadow = true; m.visible = false; caisse.add(m); cartons.push(m);
  }
  const dims = {
    rAr: R, rAv: R, yAr: R, yAv: R, emp: ZAV - ZAR, off: [1.16, -1.14], r: 1.0, pivot: new THREE.Vector3(0, 0.72, -0.1),
    zAr: ZAR, zAv: ZAV, xAr: X, xAv: X, assise: 0.78, plancher: 0.45,
  };
  return {
    groupe, caisse, rouesAr, rouesAv, pivots, essieu, volant, cartons, vitre,
    siege: new THREE.Vector3(0.38, -0.1, -0.05), dims, volantCentre, volantRayon: 0.19, volantInclinaison,
  };
}

/* ---------------------------------------------------------------- voitures
   Trois silhouettes originales, choisies d'après la couleur (ou imposées) : citadine (3,8 m, hayon), berline (4,1 m,
   coffre), break (4,2 m, barres de toit). Largeur 1,72 m. Une coque basse (capot, flancs, passages de roue, pare-chocs)
   et une coque vitrée par-dessus (pare-brise, vitres, montants, toit), toutes deux en sections le long de z.
   Profils : nœuds [z, valeur] interpolés, de l'arrière vers l'avant. gh : stations de la coque vitrée [z, hauteur du
   toit (null : base d'une vitre, à la ceinture), nature de l'intervalle qui suit]. */
const lin = k => z => {
  if (z <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (z <= k[i][0]) { const [z0, a] = k[i - 1], [z1, b] = k[i]; return a + (b - a) * (z - z0) / (z1 - z0); }
  return k[k.length - 1][1];
};
// stations d'un passage de roue (centre za, rayon ra) : bords, à 50 degrés, sommet
const archeZ = (za, ra) => [za - ra, za - ra * 0.766, za, za + ra * 0.766, za + ra];
const MODELES = {
  citadine: {
    zAv: 1.2, zAr: -1.2, ra: 0.36, rr: 0.3, xr: 0.72, wr: 0.67, portes: [0.8, -0.54, -1.16], poignees: [0.0, -0.95],
    zs: [-1.9, -1.82, -1.7, ...archeZ(-1.2, 0.36), 0.75, ...archeZ(1.2, 0.36), 1.72, 1.82, 1.9],
    W: [[-1.9, 0.78], [-1.82, 0.84], [-1.7, 0.85], [1.72, 0.85], [1.82, 0.82], [1.9, 0.73]],
    yb: [[-1.9, 0.3], [-1.7, 0.2], [1.72, 0.2], [1.9, 0.29]],
    ys: [[-1.9, 0.9], [-1.82, 0.95], [-1.7, 0.96], [0.75, 0.9], [1.72, 0.8], [1.82, 0.76], [1.9, 0.7]],
    yt: [[-1.9, 0.94], [-1.82, 1.0], [-1.76, 1.01], [0.75, 0.95], [1.72, 0.85], [1.82, 0.8], [1.9, 0.74]],
    gh: [[-1.76, null, 'lunette'], [-1.44, 1.5, 'plein'], [-1.18, 1.51, 'vitre'], [-0.58, 1.51, 'montant'], [-0.5, 1.51, 'vitre'], [-0.06, 1.5, 'pare-brise'], [0.75, null]],
  },
  berline: {
    zAv: 1.3, zAr: -1.28, ra: 0.37, rr: 0.31, xr: 0.735, wr: 0.68, portes: [0.9, -0.47, -1.0], poignees: [0.1, -0.85],
    zs: [-2.06, -1.98, -1.86, ...archeZ(-1.28, 0.37).slice(0, 2), -1.45, ...archeZ(-1.28, 0.37).slice(2), 0.85, ...archeZ(1.3, 0.37), 1.88, 1.98, 2.06],
    W: [[-2.06, 0.78], [-1.98, 0.84], [-1.86, 0.86], [1.88, 0.86], [1.98, 0.83], [2.06, 0.74]],
    yb: [[-2.06, 0.32], [-1.86, 0.2], [1.88, 0.2], [2.06, 0.3]],
    ys: [[-2.06, 0.86], [-1.98, 0.92], [-1.45, 0.94], [0.85, 0.89], [1.88, 0.79], [1.98, 0.75], [2.06, 0.68]],
    yt: [[-2.06, 0.9], [-1.98, 0.98], [-1.5, 1.0], [0.85, 0.94], [1.88, 0.84], [1.98, 0.79], [2.06, 0.72]],
    gh: [[-1.45, null, 'lunette'], [-0.98, 1.42, 'vitre'], [-0.52, 1.43, 'montant'], [-0.42, 1.43, 'vitre'], [0.02, 1.43, 'pare-brise'], [0.85, null]],
  },
  break: {
    zAv: 1.3, zAr: -1.3, ra: 0.37, rr: 0.31, xr: 0.735, wr: 0.69, portes: [0.9, -0.47, -1.05], poignees: [0.1, -0.85], barres: true,
    zs: [-2.1, -2.02, -1.9, ...archeZ(-1.3, 0.37), 0.85, ...archeZ(1.3, 0.37), 1.88, 1.98, 2.06],
    W: [[-2.1, 0.79], [-2.02, 0.85], [-1.9, 0.86], [1.88, 0.86], [1.98, 0.83], [2.06, 0.74]],
    yb: [[-2.1, 0.32], [-1.9, 0.2], [1.88, 0.2], [2.06, 0.3]],
    ys: [[-2.1, 0.88], [-2.02, 0.93], [-1.9, 0.94], [0.85, 0.89], [1.88, 0.79], [1.98, 0.75], [2.06, 0.68]],
    yt: [[-2.1, 0.92], [-2.02, 0.98], [-1.98, 0.99], [0.85, 0.94], [1.88, 0.84], [1.98, 0.79], [2.06, 0.72]],
    gh: [[-1.99, null, 'lunette'], [-1.88, 1.44, 'plein'], [-1.74, 1.445, 'vitre'], [-1.16, 1.45, 'montant'], [-1.06, 1.45, 'vitre'],
      [-0.52, 1.45, 'montant'], [-0.42, 1.45, 'vitre'], [0.02, 1.45, 'pare-brise'], [0.85, null]],
  },
};
const NOMS = ['break', 'citadine', 'berline'];
const PLAST = '#232428', NOIR = '#141518', CHROME = '#cfd3d8', LAQUE = '#191a1e';

// La carrosserie (et les feux) d'un modèle : coque basse, coque vitrée, décors. Renvoie les deux coques et les profils.
function carrosserie(M, couleur, at) {
  const P = [couleur, T.carrosserie], W = lin(M.W), yb = lin(M.yb), ys = lin(M.ys), yt = lin(M.yt);
  const arche = z => {
    let y = 0;
    for (const za of [M.zAv, M.zAr]) { const d = Math.abs(z - za); if (d <= M.ra + 1e-6) y = Math.max(y, M.rr + Math.sqrt(Math.max(0, M.ra * M.ra - d * d))); }
    return y;
  };
  const zLun = M.gh[0][0], zPB = M.gh[M.gh.length - 1][0];
  // coque basse : haut, arrondi d'épaule, flanc, bas de caisse, passage de roue (ciel puis paroi), dessous
  const basse = coque(at, M.zs, z => {
    const w = W(z), b = yb(z), s = ys(z), ar = arche(z);
    return [[0, yt(z)], [w - 0.07, s + 0.05], [w, s], [w, Math.max(b + 0.12, ar)], ar ? [0.58, ar] : [w - 0.04, b + 0.05], ar ? [0.58, b] : [w - 0.12, b]];
  }, (g, k) => {
    const za = M.zs[g], zb = M.zs[g + 1], zm = (za + zb) / 2;
    if (k === 0 && zm > zLun && zm < zPB) return null; // sous la coque vitrée
    if (k >= 4) return [NOIR, 0];
    if (k === 3) return arche(za) && arche(zb) ? [NOIR, 0] : [PLAST, 0];
    return P;
  }, true);
  const A = basse.A, av = A[A.length - 1], ar = A[0];
  fond(at, av, couleur, T.carrosserie, 1);
  fond(at, ar, couleur, T.carrosserie, -1);
  // coque vitrée : toit, montants, vitres (opaques : on ne voit pas l'intérieur des voitures)
  const haute = coque(at, M.gh.map(s => s[0]), (z, i) => {
    const h = M.gh[i][1], yc = ys(z) + 0.05, xb = W(z) - 0.07;
    if (h == null) return [[0, yc + 0.01], [M.wr - 0.07, yc + 0.006], [M.wr, yc + 0.003], [xb, yc]];
    return [[0, h + 0.015], [M.wr - 0.07, h], [M.wr, h - 0.05], [xb, yc]];
  }, (g, k) => {
    const t = M.gh[g][2];
    if (k === 0) return t === 'pare-brise' || t === 'lunette' ? [VITRE] : P;
    if (k === 1) return t === 'vitre' || t === 'montant' ? [LAQUE, T.vitre] : P; // entourage noir au-dessus des vitres
    return t === 'vitre' || t === 'pare-brise' ? [VITRE] : t === 'montant' ? [LAQUE, T.vitre] : P;
  }, false);
  return { basse, haute, W, yb, ys, yt, zF: M.zs[M.zs.length - 1], zR: M.zs[0] };
}

// Feux et décors d'une voiture. e : écart à la carrosserie (les feux qui s'allument sont posés un peu devant les glaces).
// f : si donné, { stop, g, d } reçoivent les feux allumables (à la place des décors).
function optiques(at, cr, M, e, f) {
  const { basse, W, yb, ys, zF, zR } = cr;
  const wF = W(zF), sF = ys(zF), bF = yb(zF), wR = W(zR), sR = ys(zR), bR = yb(zR);
  const zf = zF + e, zr = zR - e, kAv = basse.zs.length - 2;
  if (!f) {
    // avant : phares (glace et réflecteur, la glace tourne sur le coin), calandre, entrée d'air, plaque
    plaque(at, 0.385, wF - 0.045, sF - 0.145, sF - 0.018, zf, 1, '#2b2e33', 0, true);
    plaque(at, 0.4, wF - 0.06, sF - 0.13, sF - 0.03, zf + 0.002, 1, '#dbe3e8', T.vitre, true);
    plaque(at, 0.44, 0.56, sF - 0.11, sF - 0.05, zf + 0.004, 1, '#f6f3ea', 0, true);
    decor(at, basse, 2, basse.zs[kAv] + 0.008, zF - 0.002, 0.08, 0.52, e, '#2b2e33', 0);
    decor(at, basse, 2, basse.zs[kAv] + 0.016, zF - 0.006, 0.12, 0.48, e + 0.002, '#dbe3e8', T.vitre);
    plaque(at, -0.3, 0.3, sF - 0.17, sF - 0.05, zf, 1, '#1f2125', 0);
    plaque(at, -0.3, 0.3, sF - 0.115, sF - 0.103, zf + 0.003, 1, CHROME, T.carrosserie);
    plaque(at, -0.42, 0.42, bF + 0.015, bF + 0.085, zf, 1, '#1f2125', 0);
    plaque(at, -0.25, 0.25, bF + 0.1, bF + 0.215, zf, 1, '#2c2c2e', 0);
    plaque(at, -0.24, 0.24, bF + 0.107, bF + 0.208, zf + 0.003, 1, '#ecebe3', 0);
    // arrière : feux (et leur retour sur le coin), ligne du coffre, plaque, diffuseur
    plaque(at, 0.445, wR - 0.035, sR - 0.165, sR - 0.015, zr, -1, '#24262a', 0, true);
    plaque(at, 0.46, wR - 0.05, sR - 0.15, sR - 0.03, zr - 0.002, -1, '#9a1820', T.carrosserie, true);
    plaque(at, 0.5, 0.6, sR - 0.12, sR - 0.07, zr - 0.004, -1, '#e9e6e0', T.carrosserie, true);
    decor(at, basse, 2, zR + 0.004, basse.zs[1] - 0.012, 0.04, 0.32, e, '#9a1820', T.carrosserie);
    plaque(at, -0.44, 0.44, sR - 0.19, sR - 0.178, zr, -1, nuance(at.couleur, 0.45), T.carrosserie);
    plaque(at, -0.25, 0.25, bR + 0.17, bR + 0.285, zr, -1, '#2c2c2e', 0);
    plaque(at, -0.24, 0.24, bR + 0.177, bR + 0.278, zr - 0.003, -1, '#ecebe3', 0);
    plaque(at, -(wR - 0.05), wR - 0.05, bR + 0.01, bR + 0.1, zr, -1, PLAST, 0);
    // répétiteur de clignotant sur l'aile avant
    decor(at, basse, 2, M.zAv + 0.04, M.zAv + 0.12, 0.22, 0.32, e, '#c47a2a', T.carrosserie);
    return;
  }
  // feux allumables : stop (deux feux et le troisième en haut de la lunette), clignotants gauche (+x) et droit
  plaque(f.stop, 0.46, wR - 0.16, sR - 0.15, sR - 0.03, zr, -1, '#fff', 0, true);
  // troisième feu stop : en haut de la lunette (ou du hayon), sur un dixième de sa hauteur
  const h = cr.haute, z0 = h.zs[0], z1 = h.zs[1];
  const p1 = surCoque(h, z1 - (z1 - z0) * 0.08, 0, 0.35, 0.012), p2 = surCoque(h, z1 - (z1 - z0) * 0.18, 0, 0.35, 0.012);
  f.stop.quad([-p1[0], p1[1], p1[2]], p1, p2, [-p2[0], p2[1], p2[2]], '#fff', 0, [0, 1, -1]);
  for (const [s, a] of [[1, f.g], [-1, f.d]]) {
    a.quad([s * (wR - 0.16), sR - 0.15, zr], [s * (wR - 0.05), sR - 0.15, zr], [s * (wR - 0.05), sR - 0.03, zr], [s * (wR - 0.16), sR - 0.03, zr], '#fff', 0, [0, 0, -1]);
    a.quad([s * (wF - 0.16), sF - 0.13, zf], [s * (wF - 0.06), sF - 0.13, zf], [s * (wF - 0.06), sF - 0.03, zf], [s * (wF - 0.16), sF - 0.03, zf], '#fff', 0, [0, 0, 1]);
    const q = [[M.zAv + 0.04, 0.22], [M.zAv + 0.12, 0.22], [M.zAv + 0.12, 0.32], [M.zAv + 0.04, 0.32]].map(([z, v]) => surCoque(basse, z, 2, v, e));
    a.quad(...q.map(p => [p[0] * s, p[1], p[2]]), '#fff', 0, [s, 0, 0]);
  }
}

const VOITURES = new Map(), FEUX = new Map();
// feux qui s'allument (stop, clignotants) : matières sans éclairage, partagées par toutes les voitures
const MAT_STOP = new THREE.MeshBasicMaterial({ color: '#ff2a1f' });
const MAT_CLIGNO = new THREE.MeshBasicMaterial({ color: '#ffa21a' });

// voiture(couleur [, modele]) : modele 'citadine', 'berline' ou 'break' ; sinon choisi d'après la couleur.
// Repère : avant vers +z, +x à sa gauche. userData.feux = { stop, g, d } (éteints : sans coût de dessin).
export function voiture(couleur, modele) {
  const v = parseInt(String(couleur).replace('#', ''), 16) || 0;
  const nom = MODELES[modele] ? modele : NOMS[((v >> 16) + 2 * ((v >> 8) & 255) + (v & 255)) % 3];
  const M = MODELES[nom], cle = nom + couleur;
  let geo = VOITURES.get(cle);
  if (!geo) {
    const at = new Atelier(); at.couleur = couleur;
    const cr = carrosserie(M, couleur, at);
    optiques(at, cr, M, 0.006);
    const P = [couleur, T.carrosserie], { basse, W, ys } = cr, extra = [];
    // joints de portes, poignées
    const J = nuance(couleur, 0.5);
    for (const z of M.portes) { decor(at, basse, 2, z - 0.006, z + 0.006, 0, 1, 0.004, J, T.carrosserie); decor(at, basse, 1, z - 0.006, z + 0.006, 0, 1, 0.004, J, T.carrosserie); }
    for (const z of M.poignees) decor(at, basse, 2, z - 0.07, z + 0.07, 0.1, 0.17, 0.007, CHROME, T.carrosserie);
    const iv = M.gh.findIndex(g => g[2] === 'vitre');
    decor(at, basse, 1, M.gh[iv][0], M.gh[M.gh.length - 1][0], 0, 0.4, 0.003, LAQUE, T.vitre);
    // rétroviseurs (coque peinte, miroir) au pied du montant avant
    const zm = M.gh[M.gh.length - 1][0] - 0.14, wm = W(zm), ym = ys(zm) + 0.13;
    for (const s of [1, -1]) {
      extra.push(teinter(B(0.13, 0.1, 0.075, '#000', s * (wm + 0.02), ym, zm), ...P), B(0.06, 0.03, 0.05, PLAST, s * (wm - 0.05), ym - 0.03, zm + 0.01));
      at.quad([s * (wm - 0.035), ym - 0.042, zm - 0.04], [s * (wm + 0.075), ym - 0.042, zm - 0.04], [s * (wm + 0.075), ym + 0.042, zm - 0.04], [s * (wm - 0.035), ym + 0.042, zm - 0.04], '#8ea2b4', T.vitre, [0, 0, -1]);
    }
    // barres de toit (break)
    if (M.barres) {
      const yToit = M.gh[2][1] + 0.01;
      for (const s of [1, -1]) extra.push(B(0.035, 0.03, 1.6, '#2c2d31', s * 0.5, yToit + 0.045, -0.98), B(0.05, 0.04, 0.06, '#2c2d31', s * 0.5, yToit + 0.02, -1.74), B(0.05, 0.04, 0.06, '#2c2d31', s * 0.5, yToit + 0.02, -0.22));
    }
    // roues (fusionnées : les voitures ne les font pas tourner)
    for (const [x, z] of [[M.xr, M.zAv], [-M.xr, M.zAv], [M.xr, M.zAr], [-M.xr, M.zAr]]) extra.push(deplacer(roue(M.rr, 0.2, 10, x > 0 ? 1 : -1, false).clone(), x, M.rr, z));
    geo = fusion([...at.geos(), ...extra]);
    VOITURES.set(cle, geo);
  }
  const m = new THREE.Mesh(geo, MAT); m.castShadow = true;
  // feux stop et clignotants, éteints (donc sans coût de dessin) tant qu'ils ne servent pas ; géométries partagées par modèle
  let gf = FEUX.get(nom);
  if (!gf) {
    const a = { stop: new Atelier(), g: new Atelier(), d: new Atelier() };
    optiques(null, carrosserie(M, '#fff', new Atelier()), M, 0.014, a);
    gf = { stop: fusion(a.stop.geos()), g: fusion(a.g.geos()), d: fusion(a.d.geos()) };
    FEUX.set(nom, gf);
  }
  const f = {};
  for (const k of ['stop', 'g', 'd']) { f[k] = new THREE.Mesh(gf[k], k === 'stop' ? MAT_STOP : MAT_CLIGNO); f[k].visible = false; m.add(f[k]); }
  m.userData.feux = f;
  return m;
}
