// Les personnages : un seul maillage par personnage (peau rigide : chaque pièce suit un os avec un poids de 1),
// donc un seul appel de dessin (plus un pour l'ombre). Visage, mains, cheveux, tenues de travail ou de ville.
// L'animation (marche, course, repos, conduite, téléphone, salut) est dans anim.js.
//
// Matière : une seule pour tous les personnages, avec une seule texture (l'atlas de atlas.js : visages, yeux, main,
// toile, jean, maille, matelassé, cuir, cheveux...). Chaque pièce porte des coordonnées de texture calculées dans le
// repère du personnage (elles bougent avec lui) et le numéro de sa zone dans l'atlas (attribut aMat). La couleur
// de la pièce (teint, couleur de la veste) reste portée par les sommets : la texture la module.
// Normales lissées (sauf aux arêtes vives : boîtes, bords des cheveux), pour des formes rondes sans plus de triangles.
import * as THREE from 'three';
import { B, C, S, MAT, teinter, fusion, icosa, compacter, deplacer, indexer } from './modeles.js';
import { Z, ZONE, GLSL_ZONES, FX, FY, OEIL, LA, HA, texturePersos } from './atlas.js';
import { hasard, lisse, assombrir } from './outils.js';

/* ---------------------------------------------------------------- héros */

export const HEROS = {
  // veste matelassée à col orange, pantalon de travail, bottes, casquette, barbe, étui de sécateur à la ceinture
  vigneron: { heros: true, peau: '#e2ad84', cheveux: '#3f2a1c', coiffure: 'court', barbe: true, tenue: 'veste', haut: '#2c3e66', col: '#ff7a2f', matelasse: true,
    bas: '#5d6248', chaussures: '#4a3424', bottes: true, chapeau: 'casquette', chapeauC: '#8e2a3b', iris: '#4a3322',
    taille: 1.02, corpulence: 1.08, epaules: 1.1, secateur: true, tissuBas: 'toile' },
  // gilet matelassé sans manches sur un haut orange, queue de cheval qui sort de la casquette, silhouette plus fine
  vigneronne: { heros: true, femme: true, peau: '#efc19c', cheveux: '#a3462a', coiffure: 'queue', barbe: false, tenue: 'gilet', haut: '#2c3e66', manches: '#e8743b', col: '#ff7a2f', matelasse: true,
    bas: '#5d6248', chaussures: '#4a3424', bottes: true, chapeau: 'casquette', chapeauC: '#8e2a3b', iris: '#3d6b4a',
    taille: 0.95, corpulence: 0.94, epaules: 0.92, hanches: 1.08, secateur: true, tissuBas: 'toile' },
};

/* ---------------------------------------------------------------- squelette */

// 18 os. Repère du personnage : y vers le haut, il regarde vers +z, sa gauche est +x.
export const OS = { bassin: 0, ventre: 1, poitrine: 2, tete: 3, brasG: 4, coudeG: 5, mainG: 6, brasD: 7, coudeD: 8, mainD: 9,
  cuisseG: 10, genouG: 11, piedG: 12, cuisseD: 13, genouD: 14, piedD: 15, tel: 16, meche: 17 };
const PARENT = [-1, 0, 1, 2, 2, 4, 5, 2, 7, 8, 0, 10, 11, 0, 13, 14, 9, 3];
// Longueurs communes (unités du modèle, avant l'échelle du groupe) : la variété vient de l'échelle et des largeurs.
export const DIM = { yBassin: 0.98, yHanche: -0.06, cuisse: 0.44, tibia: 0.40, cheville: 0.08, bras: 0.29, avantBras: 0.25, yEpaule: 0.245 };

/* ---------------------------------------------------------------- enfants (l'école : ecole.js)
   Un enfant (o.age, de 3 à 11 ans) a le même squelette de 18 os ; seules leurs longueurs changent (perso rend m.dim, que
   lit anim.js) : la tête plus grosse par rapport au corps (5 têtes de haut à 3 ans, 6,4 à 11 ans, 7,3 pour un adulte du
   jeu), les jambes plus courtes (de 40 à 46 % de la taille, 49 pour un adulte), les bras un peu plus courts, le cou
   enfoncé (l'os de la tête descend d'autant qu'elle grossit : le cou ne s'allonge pas). La taille (o.hauteur, de 0,95 à
   1,45 m) vient de l'échelle du groupe. Hauteur du modèle : bassin (cheville, tibia, cuisse, hanche), ventre et
   poitrine (0,545), le haut du crâne (0,32 x TETE x kt) ; d'où kt et kj pour n têtes de haut et une part f de jambes. */
export function proportionsEnfant(a) {
  const n = 5 + (a - 3) * 0.18, f = 0.4 + (a - 3) * 0.0075, tete = 0.24 * TETE, haut = 0.32 * TETE;
  const jambes = DIM.cuisse + DIM.tibia, autre = -DIM.yHanche + 0.545 + 0.1; // (0,1 : l'os de la tête descend de 0,1 (kt - 1))
  const kt = autre / (tete * n * (1 - f) - (haut - 0.1)), Hm = tete * n * kt, kj = (f * Hm - DIM.cheville) / jambes;
  return { kj, kt, ka: 0.88 + 0.12 * (a - 3) / 8, dyT: 0.1 * (kt - 1), Hm, hauteur: 0.95 + (a - 3) * 0.0625 };
}
// (le cartable d'un enfant est porté par l'os du téléphone, qu'il n'a pas : rattaché à la poitrine, sur son dos)
const PARENT_ENFANT = PARENT.map((p, i) => (i === OS.tel ? OS.poitrine : p));

/* ---------------------------------------------------------------- matière
   Lambert lissé, texture de l'atlas. Les coordonnées de texture (attribut uv, entiers 16 bits) valent uv / UVK : la
   répétition de la texture (repeat = UVK) les remet à l'échelle dans le shader. Pour une zone pavée, uv compte des
   motifs (le shader garde la partie fractionnaire) ; pour une zone entière, uv va de 0 à 1 sur la zone.
   Couleur = texel x couleur du sommet (x GAIN : 204 est le multiplicateur 1) là où alpha vaut 1, texel seul là où il
   vaut 0. Les dérivées sont prises sur les coordonnées continues (pas de couture à la répétition), et les zones pavées
   ne descendent pas sous le niveau 3 de mipmap (au-delà, le filtrage déborderait de leur marge de 8 px). */
const UVK = 64;
const GAIN = 1 / Math.pow((204 / 255 + 0.055) / 1.055, 2.4);
const GLSL_TEXEL = `{
  int iz = int(vZone + 0.5);
  vec4 zr = ZONES[iz];
  vec2 t = vMapUv * zr.zw, dx = dFdx(t), dy = dFdy(t);
  if (iz < NB_PAVES) {
    vec2 ex = dx * vec2(${LA}.0, ${HA}.0), ey = dy * vec2(${LA}.0, ${HA}.0);
    float m2 = max(dot(ex, ex), dot(ey, ey));
    if (m2 > 64.0) { float k = 8.0 * inversesqrt(m2); dx *= k; dy *= k; }
  }
  vec4 tp = textureGrad(map, zr.xy + fract(vMapUv) * zr.zw, dx, dy);
  diffuseColor.rgb *= mix(vec3(1.0), vColor * ${GAIN.toFixed(4)}, tp.a) * tp.rgb;
}`;
// Une instance à part de la matière du décor : three.js range les objets d'une même matière par distance ; mêler
// maillages animés et décor ferait changer de programme à chaque alternance. Idem pour l'ombre.
const MAT_PERSO = new THREE.MeshLambertMaterial({ vertexColors: true });
MAT_PERSO.onBeforeCompile = sh => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aMat;\nflat varying float vZone;')
    .replace('#include <uv_vertex>', '#include <uv_vertex>\nvZone = aMat;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nflat varying float vZone;\n' + GLSL_ZONES)
    .replace('#include <map_fragment>', GLSL_TEXEL)
    .replace('#include <color_fragment>', '');
};
MAT_PERSO.customProgramCacheKey = () => 'perso';
const OMBRE_PERSO = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });

/* ---------------------------------------------------------------- pièces : forme, zone, coordonnées de texture */

const fonce = (c, k = 0.78) => assombrir(c, k);

// Finit une pièce : couleur, zone de l'atlas, coordonnées de texture. Normales : celles de la pièce (boîtes, cylindres et
// boules de modeles.js, volumes par anneaux, crâne et cheveux), sinon lissées ici (petites pièces faites à la main).
function finir(g, c, zone, uv) {
  teinter(g, c);
  if (!g.attributes.normal) lisser(g);
  g.attributes.aMat.array.fill(zone);
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
const nouvelle = P => { const g = new THREE.BufferGeometry(); g.setAttribute('position', P instanceof Float32Array ? new THREE.BufferAttribute(P, 3) : new THREE.Float32BufferAttribute(P, 3)); return g; };

// Projection sur les faces d'une boîte (selon l'axe dominant de chaque triangle) : pour les petites pièces pavées
function uvBoite(g, zone) {
  const p = g.attributes.position.array, uv = new Float32Array(p.length / 3 * 2), z = ZONE[zone];
  if (!z.pave) { uv.fill(0.5); return uv; }
  const su = 1 / z.tu, sv = 1 / z.tv;
  for (let f = 0; f < p.length; f += 9) {
    const ax = p[f + 3] - p[f], ay = p[f + 4] - p[f + 1], az = p[f + 5] - p[f + 2], bx = p[f + 6] - p[f], by = p[f + 7] - p[f + 1], bz = p[f + 8] - p[f + 2];
    const nx = Math.abs(ay * bz - az * by), ny = Math.abs(az * bx - ax * bz), nz = Math.abs(ax * by - ay * bx);
    for (let k = 0; k < 9; k += 3) {
      const x = p[f + k], y = p[f + k + 1], w = p[f + k + 2], o = (f + k) / 3 * 2;
      if (ny >= nx && ny >= nz) { uv[o] = x * su; uv[o + 1] = w * sv; } else if (nx >= nz) { uv[o] = w * su; uv[o + 1] = y * sv; } else { uv[o] = x * su; uv[o + 1] = y * sv; }
    }
  }
  return uv;
}
// Projection sphérique autour de (cx, cy, cz) : u autour (tours entiers du motif), v du sommet vers le bas (cheveux, barbe)
function uvSphere(g, zone, cx, cy, cz, R) {
  const p = g.attributes.position.array, n = p.length / 3, uv = new Float32Array(n * 2), z = ZONE[zone];
  const tours = Math.max(1, Math.round(2 * Math.PI * R / z.tu)), kv = R / z.tv;
  const th = new Float32Array(n), axe = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = p[i * 3] - cx, y = p[i * 3 + 1] - cy, w = p[i * 3 + 2] - cz, h = Math.hypot(x, w);
    th[i] = Math.atan2(x, w); axe[i] = h < 1e-5 ? 1 : 0;
    uv[i * 2 + 1] = Math.atan2(h, y) * kv;
  }
  for (let i = 0; i < n; i += 3) {
    let a = th[i], b = th[i + 1], c = th[i + 2];
    // couture à l'arrière (passage de -pi à pi) : on recolle les angles d'un même triangle
    if (Math.max(a, b, c) - Math.min(a, b, c) > Math.PI) { if (a < 0) a += 2 * Math.PI; if (b < 0) b += 2 * Math.PI; if (c < 0) c += 2 * Math.PI; }
    // sommet sur l'axe (pôle) : l'angle des deux autres
    if (axe[i]) a = (b + c) / 2; if (axe[i + 1]) b = (a + c) / 2; if (axe[i + 2]) c = (a + b) / 2;
    const k = tours / (2 * Math.PI);
    uv[i * 2] = a * k; uv[i * 2 + 2] = b * k; uv[i * 2 + 4] = c * k;
  }
  return uv;
}
// Projection de face sur la zone d'un visage (repère de la tête, centre du crâne en (0, yc))
function uvVisage(g, yc) {
  const p = g.attributes.position.array, n = p.length / 3, uv = new Float32Array(n * 2), b = v => Math.min(0.998, Math.max(0.002, v));
  for (let i = 0; i < n; i++) { uv[i * 2] = b((p[i * 3] + FX) / (2 * FX)); uv[i * 2 + 1] = b((FY - (p[i * 3 + 1] - yc)) / (2 * FY)); }
  return uv;
}
// Projection plane (axes x et y de la pièce) : u de 0 à 1 sur la largeur ; v sur la hauteur, ou en motifs (kv)
function uvPlan(g, w, h, kv) {
  const p = g.attributes.position.array, n = p.length / 3, uv = new Float32Array(n * 2), b = v => Math.min(0.998, Math.max(0.002, v));
  for (let i = 0; i < n; i++) { uv[i * 2] = b(p[i * 3] / w + 0.5); uv[i * 2 + 1] = kv ? p[i * 3 + 1] * kv : b(0.5 - p[i * 3 + 1] / h); }
  return uv;
}

const M4 = new THREE.Matrix4(), EUL = new THREE.Euler();
// Boîte (w, h, d) : coordonnées de texture prises avant de la tourner (rx, ry, rz), puis posée en (x, y, z)
function boite(w, h, d, c, zone, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = B(w, h, d, c);
  const uv = zone === Z.poche ? uvPlan(g, w, h) : zone === Z.fermeture ? uvPlan(g, w, h, 1 / ZONE[zone].tv) : uvBoite(g, zone);
  finir(g, c, zone, uv);
  if (rx || ry || rz) g.applyMatrix4(M4.makeRotationFromEuler(EUL.set(rx, ry, rz)));
  return deplacer(g, x, y, z);
}
// Boule à facettes de modeles.js, ou cylindre : coordonnées de texture par projection sur les faces
const habiller = (g, c, zone) => finir(g, c, zone, uvBoite(g, zone));
// Boule de modeles.js (S) aux normales lisses : celles de l'ellipsoïde de centre (x, y, z) et de demi-axes (ax, ay, az)
function ellipsoide(g, x, y, z, ax, ay, az) {
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  for (let i = 0; i < p.length; i += 3) {
    const nx = (p[i] - x) / (ax * ax), ny = (p[i + 1] - y) / (ay * ay), nz = (p[i + 2] - z) / (az * az), l = Math.hypot(nx, ny, nz) || 1;
    n[i] = nx / l; n[i + 1] = ny / l; n[i + 2] = nz / l;
  }
  return g;
}
const boulette = (r, c, zone, x, y, z, sx = 1, sy = 1, sz = 1, detail = 0) => habiller(ellipsoide(S(r, c, x, y, z, sx, sy, sz, detail), x, y, z, r * sx, r * sy, r * sz), c, zone);

// Volume par anneaux [y, rx, rz, dz, dx], du bas vers le haut, n côtés (une face vers l'avant).
// Coordonnées de texture : u autour (des tours entiers de motif pour une zone pavée, 0 à 1 pour une zone entière ;
// miroir : main droite), v le long de l'axe ((y - v0) x kv, par défaut en motifs). Les couvercles prolongent le flanc.
function loft(an, n, c, zone, capBas = true, capHaut = true, o = {}) {
  const z = ZONE[zone], na = an.length, nv = ((na - 1) * 6 + ((capBas ? 1 : 0) + (capHaut ? 1 : 0)) * 3) * n;
  const P = new Float32Array(nv * 3), UV = new Float32Array(nv * 2), sn = new Float32Array(n + 1), cs = new Float32Array(n + 1), U = new Float32Array(n + 1);
  let tours = o.tours;
  if (tours === undefined) {
    let per = 0;
    for (const r of an) per += 2 * Math.PI * Math.sqrt((r[1] * r[1] + r[2] * r[2]) / 2);
    tours = z.pave ? Math.max(1, Math.round(per / na / z.tu)) : 1;
  }
  const kv = o.kv ?? (z.pave ? 1 / z.tv : 1), v0 = o.v0 ?? 0;
  for (let j = 0; j <= n; j++) { const a = Math.PI / n + j * 2 * Math.PI / n; sn[j] = Math.sin(a); cs[j] = Math.cos(a); U[j] = (o.miroir ? 1 - j / n - 1 / n : j / n) * tours; }
  // normales lisses de la grille : différences entre voisins (autour et le long), tournées vers l'extérieur
  const NG = new Float32Array(na * n * 3), X = (r, j) => (r[4] || 0) + sn[j] * r[1], Zc = (r, j) => (r[3] || 0) + cs[j] * r[2];
  for (let i = 0; i < na; i++) {
    const r = an[i], a = an[Math.max(0, i - 1)], b = an[Math.min(na - 1, i + 1)];
    for (let j = 0; j < n; j++) {
      const jp = (j + 1) % n, jm = (j + n - 1) % n;
      const tx = X(r, jp) - X(r, jm), tz = Zc(r, jp) - Zc(r, jm);                       // autour (horizontal)
      const ux = X(b, j) - X(a, j), uy = b[0] - a[0], uz = Zc(b, j) - Zc(a, j);           // le long
      let nx = uy * tz, ny = uz * tx - ux * tz, nz = -uy * tx;
      if (nx * (X(r, j) - (r[4] || 0)) + nz * (Zc(r, j) - (r[3] || 0)) < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz) || 1, o = (i * n + j) * 3;
      NG[o] = nx / l; NG[o + 1] = ny / l; NG[o + 2] = nz / l;
    }
  }
  const N = new Float32Array(nv * 3);
  let k = 0;
  const pt = (r, j, v, i, ny) => {
    P[k * 3] = X(r, j); P[k * 3 + 1] = r[0]; P[k * 3 + 2] = Zc(r, j); UV[k * 2] = U[j]; UV[k * 2 + 1] = v;
    if (ny) N[k * 3 + 1] = ny; else { const o = (i * n + j % n) * 3; N[k * 3] = NG[o]; N[k * 3 + 1] = NG[o + 1]; N[k * 3 + 2] = NG[o + 2]; }
    k++;
  };
  const centre = (r, u, v, ny) => { P[k * 3] = r[4] || 0; P[k * 3 + 1] = r[0]; P[k * 3 + 2] = r[3] || 0; UV[k * 2] = u; UV[k * 2 + 1] = v; N[k * 3 + 1] = ny; k++; };
  for (let i = 0; i < na - 1; i++) {
    const r = an[i], s = an[i + 1], va = (r[0] - v0) * kv, vb = (s[0] - v0) * kv;
    for (let j = 0; j < n; j++) { pt(r, j, va, i); pt(r, j + 1, va, i); pt(s, j + 1, vb, i + 1); pt(r, j, va, i); pt(s, j + 1, vb, i + 1); pt(s, j, vb, i + 1); }
  }
  // couvercles plats : prolongent le flanc (le centre prend le u du milieu de chaque triangle)
  if (capBas) { const r = an[0], v = (r[0] - v0) * kv; for (let j = 0; j < n; j++) { centre(r, (U[j] + U[j + 1]) / 2, v, -1); pt(r, j + 1, v, 0, -1); pt(r, j, v, 0, -1); } }
  if (capHaut) { const r = an[na - 1], v = (r[0] - v0) * kv; for (let j = 0; j < n; j++) { centre(r, (U[j] + U[j + 1]) / 2, v, 1); pt(r, j, v, 0, 1); pt(r, j + 1, v, 0, 1); } }
  const g = nouvelle(P);
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  return finir(g, c, zone, UV);
}
// Rayon d'un loft à la hauteur y (pour poser bandes, poches et fermetures sur la surface)
function rayon(an, y) {
  if (y <= an[0][0]) return an[0];
  for (let i = 1; i < an.length; i++) if (y <= an[i][0]) {
    const a = an[i - 1], b = an[i], t = (y - a[0]) / (b[0] - a[0]);
    return [y, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, (a[3] || 0) + ((b[3] || 0) - (a[3] || 0)) * t];
  }
  return an[an.length - 1];
}
// Bande qui épouse un loft (ceinture, ourlet, poignet), agrandie de k
const bande = (an, y0, y1, k, c, zone, n = 8, o) => { const a = rayon(an, y0), b = rayon(an, y1); return loft([[y0, a[1] * k, a[2] * k, a[3]], [y1, b[1] * k, b[2] * k, b[3]]], n, c, zone, true, true, o); };
const NT = 12, NM = 9; // pans du buste et du bassin, des membres (plus de pans : des formes plus rondes, moins de « boîte »)
const avant = (an, y) => { const r = rayon(an, y); return (r[3] || 0) + r[2] * Math.cos(Math.PI / NT); }; // face avant du buste

// Col autour de la base du cou : anneaux [h, rx, rz, dz] le long de son axe, incliné (plus bas devant, comme la base du
// cou entre les clavicules et la nuque), posé sur la poitrine, à la taille du cou (k)
const INC = 0.36, Y_COL = 0.312, Z_COL = -0.008, aCol = (an, k) => an.map(([h, a, b, d]) => [h, a * k, b * k, d]);
function col(an, c, zone, k) {
  const g = loft(aCol(an, k), NT, c, zone, false, false);
  g.applyMatrix4(M4.makeRotationX(INC));
  return deplacer(g, 0, Y_COL, Z_COL);
}
// Point du devant d'un col en x, à la hauteur h le long de son axe, à e de sa surface
function surCol(an, k, x, h, e) {
  const r = rayon(aCol(an, k), h), u = Math.min(1, Math.abs(x) / r[1]), z = (r[3] || 0) + r[2] * Math.sqrt(1 - u * u) + e;
  return [x, Y_COL + h * Math.cos(INC) - z * Math.sin(INC), Z_COL + h * Math.sin(INC) + z * Math.cos(INC)];
}
// Sangle (bretelle, cordon de tablier) en x sur le haut du buste (loft an) : monte devant aux hauteurs yAv, passe sur
// l'épaule, redescend derrière aux hauteurs yAr. Fines boîtes d'un point au suivant, à e de la surface.
const QS = new THREE.Quaternion(), AXE_Y = new THREE.Vector3(0, 1, 0), DIR = new THREE.Vector3();
const AXE_BAS = new THREE.Vector3(0, -1, 0);
// Barre de section l x ep du point a au point b (dépasse de rab à chaque bout)
function barre(a, b, l, ep, c, zone, rab = 0) {
  if (b[1] < a[1]) [a, b] = [b, a]; // toujours du bas vers le haut : la plus petite rotation garde la largeur à plat
  DIR.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const g = B(l, DIR.length() + rab * 2, ep, c);
  finir(g, c, zone, uvBoite(g, zone));
  g.applyMatrix4(M4.makeRotationFromQuaternion(QS.setFromUnitVectors(AXE_Y, DIR.normalize())));
  return deplacer(g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
}
// Point de la surface d'un loft en (x, y), devant (s = 1) ou derrière (s = -1), à e de la surface
const surLoft = (an, x, y, s, e) => { const r = rayon(an, y), k = Math.min(1, Math.abs(x) / r[1]); return [x, y, (r[3] || 0) + s * (r[2] * Math.sqrt(1 - k * k) + e)]; };
function sangle(an, x, yAv, yAr, l, e, c, zone) {
  let yh = yAv[yAv.length - 1];
  while (yh < 0.4 && rayon(an, yh)[1] > Math.abs(x)) yh += 0.002; // le dessus de l'épaule à cette distance du milieu
  const pts = [...yAv.map(y => surLoft(an, x, y, 1, e)), [x, yh + e, rayon(an, yh)[3] || 0], ...yAr.map(y => surLoft(an, x, y, -1, e))], out = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(barre(pts[i], pts[i + 1], l, e * 1.5, c, zone, e));
  return fusion(out);
}

// Échange y et z (un loft construit le long de y devient couché le long de z : chaussures), et remet les triangles à l'endroit
function coucher(g) {
  for (const nom of ['position', 'normal']) { const p = g.attributes[nom].array; for (let i = 0; i < p.length; i += 3) { const y = p[i + 1]; p[i + 1] = p[i + 2]; p[i + 2] = y; } }
  for (const nom of ['position', 'normal', 'color', 'aMat', 'uv']) {
    const a = g.attributes[nom].array, k = g.attributes[nom].itemSize;
    for (let f = 0; f < a.length; f += 3 * k) for (let j = 0; j < k; j++) { const t = a[f + k + j]; a[f + k + j] = a[f + 2 * k + j]; a[f + 2 * k + j] = t; }
  }
  return g;
}

// Numéro du sommet d'origine de chaque sommet de la boule unité dépliée (icosa) : sert à lisser sans chercher les voisins
const IDS = new Map();
function idsIcosa(detail) {
  let r = IDS.get(detail);
  if (r) return r;
  const p = icosa(detail).attributes.position.array, n = p.length / 3, ids = new Int32Array(n), m = new Map();
  for (let i = 0; i < n; i++) {
    const k = Math.round(p[i * 3] * 1e4) + ',' + Math.round(p[i * 3 + 1] * 1e4) + ',' + Math.round(p[i * 3 + 2] * 1e4);
    let v = m.get(k); if (v === undefined) m.set(k, v = m.size); ids[i] = v;
  }
  IDS.set(detail, r = { ids, nb: m.size });
  return r;
}
// Boule déformée (tête, cheveux, barbe) : f reçoit les coordonnées sur la sphère unité et renvoie un facteur de rayon.
// Là où f rentre les sommets sous la peau (facteur sous le seuil), les facettes entièrement cachées sont retirées.
// Renvoie la géométrie (positions et normales lissées, arêtes vives gardées au bord des cheveux).
function boule(rx, ry, rz, x, y, z, detail, f, jaw = 0, seuil = 0.999, relief = null) {
  const g0 = icosa(detail), p = g0.attributes.position, { ids, nb } = idsIcosa(detail);
  const garde = f ? new Uint8Array(p.count) : null;
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i), uy = p.getY(i), uz = p.getZ(i);
    const k = f ? f(ux, uy, uz) : 1;
    if (f) garde[i] = k >= seuil ? 1 : 0;
    // mâchoire plus étroite que le crâne (surtout vers le menton), menton un peu en avant
    const t = uy < 0 ? -uy : 0, kx = 1 - jaw * t * t * t, kz = 1 - jaw * 0.45 * t * t;
    p.setXYZ(i, x + ux * rx * k * kx, y + uy * ry * k, z + uz * rz * k * kz + (uz > 0 ? jaw * 0.1 * t * rz + (relief ? relief(ux, uy, uz) * rz * k : 0) : 0));
  }
  let P = p.array, I = ids;
  if (f) {
    let n = 0;
    for (let i = 0; i < p.count; i += 3) if (garde[i] || garde[i + 1] || garde[i + 2]) n += 3;
    P = new Float32Array(n * 3); I = new Int32Array(n);
    for (let i = 0, o = 0; i < p.count; i += 3) if (garde[i] || garde[i + 1] || garde[i + 2]) {
      P.set(p.array.subarray(i * 3, i * 3 + 9), o * 3); I[o] = ids[i]; I[o + 1] = ids[i + 1]; I[o + 2] = ids[i + 2]; o += 3;
    }
  }
  return lisser(nouvelle(P), I, nb);
}
// Sépare les triangles d'une géométrie (positions et normales) selon f(centre x, y, z) : [vrais, faux]
function separer(g, f) {
  const p = g.attributes.position.array, nm = g.attributes.normal.array, A = [], An = [], Bf = [], Bn = [];
  for (let i = 0; i < p.length; i += 9) {
    const oui = f((p[i] + p[i + 3] + p[i + 6]) / 3, (p[i + 1] + p[i + 4] + p[i + 7]) / 3, (p[i + 2] + p[i + 5] + p[i + 8]) / 3);
    const d = oui ? A : Bf, dn = oui ? An : Bn;
    for (let j = 0; j < 9; j++) { d.push(p[i + j]); dn.push(nm[i + j]); }
  }
  const avec = (P, N) => { const g = nouvelle(P); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); return g; };
  return [avec(A, An), avec(Bf, Bn)];
}
// Petite pièce posée sur le visage (œil, sourcil, nez) : triangles tournés vers l'extérieur de la tête (centre c)
function surVisage(P, UV, cx, cy, cz) {
  for (let i = 0; i < P.length; i += 9) {
    const ax = P[i + 3] - P[i], ay = P[i + 4] - P[i + 1], az = P[i + 5] - P[i + 2], bx = P[i + 6] - P[i], by = P[i + 7] - P[i + 1], bz = P[i + 8] - P[i + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const mx = (P[i] + P[i + 3] + P[i + 6]) / 3 - cx, my = (P[i + 1] + P[i + 4] + P[i + 7]) / 3 - cy, mz = (P[i + 2] + P[i + 5] + P[i + 8]) / 3 - cz;
    if (nx * mx + ny * my + nz * mz < 0) {
      for (let j = 0; j < 3; j++) { const t = P[i + 3 + j]; P[i + 3 + j] = P[i + 6 + j]; P[i + 6 + j] = t; }
      const k = i / 3 * 2; for (let j = 0; j < 2; j++) { const t = UV[k + 2 + j]; UV[k + 2 + j] = UV[k + 4 + j]; UV[k + 4 + j] = t; }
    }
  }
  return nouvelle(P);
}

/* ---------------------------------------------------------------- normales lissées
   Chaque sommet prend la moyenne (pondérée par l'aire) des faces qui le touchent et qui ne font pas avec la sienne un
   angle de plus de 60° : les volumes ronds (7 ou 8 côtés, boules) deviennent lisses, les boîtes et les bords nets le restent. */
let TABLE = new Int32Array(0);
// ids (facultatif) : numéro du sommet d'origine de chaque sommet (boules), qui évite de chercher les positions communes
function lisser(g, ids = null, nb = 0) {
  const p = g.attributes.position.array, nv = p.length / 3, nf = nv / 3;
  const fn = new Float32Array(nf * 3), fu = new Float32Array(nf * 3);
  for (let f = 0; f < nf; f++) {
    const i = f * 9, ax = p[i + 3] - p[i], ay = p[i + 4] - p[i + 1], az = p[i + 5] - p[i + 2], bx = p[i + 6] - p[i], by = p[i + 7] - p[i + 1], bz = p[i + 8] - p[i + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, l = Math.hypot(nx, ny, nz) || 1;
    fn[f * 3] = nx; fn[f * 3 + 1] = ny; fn[f * 3 + 2] = nz; fu[f * 3] = nx / l; fu[f * 3 + 1] = ny / l; fu[f * 3 + 2] = nz / l;
  }
  // sommets de même position (au dixième de millimètre) : table de hachage ouverte, chaînés derrière le premier vu
  const tete = new Int32Array(nv), suiv = new Int32Array(nv);
  if (ids) {
    if (TABLE.length < nb) TABLE = new Int32Array(nb * 2);
    TABLE.fill(-1, 0, nb);
    for (let i = 0; i < nv; i++) { const j = TABLE[ids[i]]; if (j < 0) { TABLE[ids[i]] = i; tete[i] = i; suiv[i] = -1; } else { tete[i] = j; suiv[i] = suiv[j]; suiv[j] = i; } }
  } else {
  let taille = 1024; while (taille < nv * 2) taille <<= 1;
  if (TABLE.length < taille) TABLE = new Int32Array(taille);
  const tab = TABLE, masque = taille - 1, Q = new Int32Array(nv * 3);
  tab.fill(-1, 0, taille);
  for (let i = 0; i < nv; i++) {
    const qx = Math.round(p[i * 3] * 1e4), qy = Math.round(p[i * 3 + 1] * 1e4), qz = Math.round(p[i * 3 + 2] * 1e4);
    Q[i * 3] = qx; Q[i * 3 + 1] = qy; Q[i * 3 + 2] = qz;
    let h = (Math.imul(qx, 73856093) ^ Math.imul(qy, 19349663) ^ Math.imul(qz, 83492791)) & masque, j;
    while ((j = tab[h]) >= 0 && (Q[j * 3] !== qx || Q[j * 3 + 1] !== qy || Q[j * 3 + 2] !== qz)) h = (h + 1) & masque;
    if (j < 0) { tab[h] = i; tete[i] = i; suiv[i] = -1; } else { tete[i] = j; suiv[i] = suiv[j]; suiv[j] = i; }
  }
  }
  const n = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    const f = (i / 3) | 0, ux = fu[f * 3], uy = fu[f * 3 + 1], uz = fu[f * 3 + 2];
    let sx = 0, sy = 0, sz = 0;
    for (let j = tete[i]; j >= 0; j = suiv[j]) {
      const h = (j / 3) | 0;
      if (ux * fu[h * 3] + uy * fu[h * 3 + 1] + uz * fu[h * 3 + 2] > 0.5) { sx += fn[h * 3]; sy += fn[h * 3 + 1]; sz += fn[h * 3 + 2]; }
    }
    const l = Math.hypot(sx, sy, sz) || 1;
    n[i * 3] = sx / l; n[i * 3 + 1] = sy / l; n[i * 3 + 2] = sz / l;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}

/* ---------------------------------------------------------------- variété des passants */

let compteur = 0;
const clarte = c => { const k = new THREE.Color(c); return 0.3 * k.r + 0.59 * k.g + 0.11 * k.b; };
// Complète les options manquantes (taille, corpulence, tenue, chaussures...) de façon déterministe
function completer(o) {
  if (o.heros || o.age) return o; // (un enfant de l'école : tout est donné par ecole.js)
  let h = 2166136261;
  const s = JSON.stringify(o) + '#' + (compteur++);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  const r = hasard(h), pick = a => a[Math.floor(r() * a.length)];
  const femme = o.femme ?? !!(o.fine || (!o.barbe && (['queue', 'chignon', 'long', 'carre'].includes(o.coiffure) || r() < 0.12)));
  const q = { ...o, femme };
  if (femme && o.coiffure !== 'chauve' && r() < 0.4) q.coiffure = pick(['long', 'carre', 'queue', 'chignon']);
  if (femme && o.coiffure === 'chauve') q.coiffure = 'carre';
  q.taille = o.taille ?? (femme ? 0.9 + r() * 0.1 : 0.94 + r() * 0.12);
  q.corpulence = o.corpulence ?? 0.86 + r() * r() * 0.42;
  q.epaules = o.epaules ?? (femme ? 0.9 : 1 + r() * 0.08);
  q.hanches = o.hanches ?? (femme ? 1.07 : 1);
  q.tenue = o.tenue ?? (o.tablier ? 'chemise' : pick(femme ? ['veste', 'pull', 'robe', 'jupe', 'chemise', 'gilet', 'pull'] : ['veste', 'pull', 'chemise', 'salopette', 'gilet', 'pull']));
  q.manches = o.manches ?? pick(['#e9e1cf', '#c8553d', '#8fa7c4', '#d9d2c0', '#6f8f5e']);
  q.chaussures = o.chaussures ?? pick(['#2a2420', '#4a3424', '#3b3b42', '#6b5a48', '#20232a', '#7a6a58']);
  q.bottes = o.bottes ?? (!femme && r() < 0.18);
  if (q.bottes && !o.chaussures) q.chaussures = pick(['#2f4a32', '#3a3a3a', '#4a3424']);
  q.collant = o.collant ?? pick(['#2e2a2c', '#4a3c3a', '#3b4150', fonce(o.peau, 0.9)]);
  q.iris = o.iris ?? pick(['#3b2a1e', '#4a3322', '#3d5a7a', '#4c6b3f', '#2a2a2a']);
  if (!o.chapeau && r() < 0.16) { q.chapeau = pick(['bonnet', 'paille', 'bonnet']); q.chapeauC = pick(['#7a2233', '#2f4a6b', '#c8553d', '#3b3b3b']); }
  if (q.tenue === 'veste' && o.col === undefined && r() < 0.5) q.col = fonce(o.haut, 0.7);
  q.matelasse = o.matelasse ?? ((q.tenue === 'veste' || q.tenue === 'gilet') && r() < 0.5);
  // tirés après les autres : les tenues déjà vues restent les mêmes
  const bc = new THREE.Color(o.bas || '#444');
  q.tissuBas = o.tissuBas ?? (bc.b > bc.r * 1.15 ? (r() < 0.8 ? 'jean' : 'toile') : pick(['toile', 'toile', 'velours', 'jean']));
  q.carreaux = o.carreaux ?? (!o.tablier && r() < 0.45);
  q.imprime = o.imprime ?? r() < 0.5;
  q.malRase = o.malRase ?? (!femme && clarte(o.cheveux || '#2b1d0e') < 0.3 && r() < 0.5);
  return q;
}

/* ---------------------------------------------------------------- accessoires : la bouteille et le verre
   Créés à la première utilisation, enfants du groupe du personnage (même repère que les os), cachés le reste du temps :
   aucun coût de dessin tant qu'on ne sert pas. Géométries partagées par tous les personnages. */
let geoAcc = null;
export function accessoires(m) {
  if (m.acc) return m.acc;
  if (!geoAcc) {
    // bouteille de rouge : corps, épaule, col, capsule bordeaux, étiquette crème (axe y, fond à l'origine)
    const bouteille = fusion([C(0.036, 0.036, 0.19, 8, '#1f3b2a', 0, 0.095, 0), C(0.014, 0.036, 0.05, 8, '#1f3b2a', 0, 0.215, 0),
      C(0.013, 0.014, 0.07, 6, '#1f3b2a', 0, 0.275, 0), C(0.015, 0.015, 0.03, 6, '#8e2a3b', 0, 0.3, 0), C(0.0375, 0.0375, 0.075, 8, '#f1e8d2', 0, 0.1, 0)]);
    // verre à pied (bol clair) et le vin, à part pour se remplir et se vider
    const verre = fusion([C(0.03, 0.03, 0.006, 8, '#dce8ee', 0, 0.003, 0), C(0.005, 0.005, 0.075, 5, '#dce8ee', 0, 0.04, 0),
      C(0.036, 0.02, 0.07, 8, '#cfe0ea', 0, 0.112, 0)]);
    const vin = C(0.031, 0.019, 0.042, 8, '#7d1c30', 0, 0.021, 0); // fond du vin à l'origine : se remplit par l'échelle en y
    geoAcc = { bouteille, verre, vin };
  }
  const mk = g => { const x = new THREE.Mesh(g, MAT); x.visible = false; x.castShadow = false; m.groupe.add(x); return x; };
  const verre = mk(geoAcc.verre), vin = mk(geoAcc.vin);
  verre.add(vin); vin.position.set(0, 0.083, 0); vin.visible = true; vin.scale.y = 0.02;
  m.acc = { bouteille: mk(geoAcc.bouteille), verre, vin };
  return m.acc;
}

/* ---------------------------------------------------------------- peau souple
   Chaque pièce suit son os ; un sommet proche d'une jointure suit aussi l'os voisin, d'autant plus qu'il en est près
   (jusqu'à la moitié, à la jointure même). Coudes, genoux, épaules, hanches, taille et cou se plient en courbe au lieu
   de se casser comme ceux d'un pantin. x, y : position du sommet par rapport à son os, au repos. Rend [os voisin, poids]
   ou null. */
function liens(i, x, y) {
  switch (i) {
    case 0: // bassin : le ventre au-dessus ; en dessous, la cuisse de son côté (une jupe suit un peu les jambes)
      if (y > 0.04) return [1, 0.45 * lisse((y - 0.04) / 0.07)];
      if (y < -0.05 && Math.abs(x) > 0.015) return [x > 0 ? OS.cuisseG : OS.cuisseD, 0.4 * lisse((-0.05 - y) / 0.08)];
      return null;
    case 1: // ventre : le bassin en bas, la poitrine en haut
      if (y < 0.02) return [0, 0.5 * lisse((0.02 - y) / 0.07)];
      if (y > 0.15) return [2, 0.45 * lisse((y - 0.15) / 0.07)];
      return null;
    case 2: return y < 0.03 ? [1, 0.5 * lisse((0.03 - y) / 0.07)] : null; // poitrine : le ventre en bas
    case 3: return y < 0.05 ? [2, 0.6 * lisse((0.05 - y) / 0.08)] : null; // le bas du cou suit la poitrine
    case 4: case 7: // haut du bras : l'épaule suit la poitrine, le bas suit l'avant-bras
      if (y > -0.07) return [2, 0.5 * lisse((y + 0.07) / 0.08)];
      if (y < -0.23) return [i + 1, 0.5 * lisse((-0.23 - y) / 0.06)];
      return null;
    case 5: case 8: // avant-bras : le coude suit le bras, le poignet un peu la main
      if (y > -0.06) return [i - 1, 0.5 * lisse((y + 0.06) / 0.06)];
      if (y < -0.215) return [i + 1, 0.3 * lisse((-0.215 - y) / 0.035)];
      return null;
    case 6: case 9: return y > -0.025 ? [i - 1, 0.3 * lisse((y + 0.025) / 0.025)] : null;
    case 10: case 13: // cuisse : la hanche suit le bassin, le bas suit le tibia
      if (y > -0.1) return [0, 0.5 * lisse((y + 0.1) / 0.1)];
      if (y < -0.37) return [i + 1, 0.5 * lisse((-0.37 - y) / 0.07)];
      return null;
    case 11: case 14: return y > -0.07 ? [i - 1, 0.5 * lisse((y + 0.07) / 0.07)] : null; // le genou suit la cuisse
  }
  return null;
}

/* ---------------------------------------------------------------- le personnage */

// Tête (repère de l'os de la tête) : centre du crâne en (0, YC, ZC), demi-axes RX, RY, RZ. Proportions d'adulte :
// 17,6 cm de large, 24 cm du menton au sommet, yeux à mi-hauteur.
const YC = 0.2, ZC = 0.017, RX = 0.088, RY = 0.12, RZ = 0.108;
const TETE = 1.06; // la tête et ce qu'elle porte, un peu plus grandes que leur modèle : des proportions moins « poupée »

// Relief du visage (sphère unité : x vers sa gauche, y vers le haut, z vers l'avant ; yeux à y = 0, x = 0,36) : une
// avancée vers l'avant, en unités du demi-axe z, sur la face avant seulement. Arcades, orbites, pommettes, bouche,
// menton ; joues un peu creusées chez l'homme. Le crâne, les cheveux, la barbe et ce qu'on pose sur le visage (yeux,
// sourcils, nez) suivent le même relief : rien ne flotte ni ne s'enfonce.
const cloche = (d, s) => Math.exp(-(d * d) / (s * s));
function reliefVisage(femme) {
  return (x, y, z) => {
    if (z <= 0) return 0;
    const ax = Math.abs(x), avant = Math.min(1, z * 1.6);
    const d = 0.032 * cloche(y - 0.25, 0.07) * cloche(x, 0.5)          // arcades
      - 0.012 * cloche(y + 0.01, 0.1) * cloche(ax - 0.36, 0.14)          // orbites
      + 0.045 * cloche(y + 0.2, 0.13) * cloche(ax - 0.56, 0.15)          // pommettes
      - (femme ? 0.008 : 0.025) * cloche(y + 0.48, 0.13) * cloche(ax - 0.6, 0.14) // joues sous les pommettes
      + 0.03 * cloche(y + 0.52, 0.12) * cloche(x, 0.32)                  // bouche
      + 0.05 * cloche(y + 0.86, 0.1) * cloche(x, 0.26)                   // menton
      - 0.015 * cloche(y - 0.55, 0.15) * cloche(x, 0.6);                 // front qui fuit un peu
    return d * avant;
  };
}

// Renvoie { groupe, maillage, os, dim, ... } : groupe est l'objet à ajouter à la scène (ou au tracteur).
export function perso(o0) {
  if (!MAT_PERSO.map) { MAT_PERSO.map = texturePersos(); MAT_PERSO.map.repeat.set(UVK, UVK); }
  const o = completer(o0);
  const peau = o.peau, ch = o.cheveux || '#2b1d0e', haut = o.haut, bas = o.bas, chau = o.chaussures || '#2a2420';
  const femme = !!(o.femme || o.fine);
  // un enfant (proportionsEnfant) : jambes (kj), tête (kt), bras (ka), l'os de la tête plus bas (dyT) ; rj : des jambes
  // un peu plus fines qu'à leur longueur
  const PE = o.age ? proportionsEnfant(o.age) : null, kj = PE ? PE.kj : 1, kt = PE ? PE.kt : 1, ka = PE ? PE.ka : 1, rj = Math.sqrt(kj);
  const K = o.corpulence ?? 1, E = (o.epaules ?? 1) * (0.93 + 0.07 * K), H = (o.hanches ?? 1) * (0.95 + 0.05 * K);
  const tenue = o.tenue || 'veste';
  const jupe = tenue === 'robe' || tenue === 'jupe';
  const manche = tenue === 'gilet' ? (o.manches || '#e9e1cf') : haut;
  const avantBras = tenue === 'chemise' || tenue === 'robe' ? peau : manche;
  const jambe = jupe ? (o.collant || '#2e2a2c') : bas;
  const ventre = Math.max(0, K - 1) * 0.09 + (o.ventre || 0);
  const cou = PE ? 0.043 : femme ? 0.053 : 0.061 * (0.8 + 0.2 * K), kCol = 0.4 + 0.6 * cou / 0.061; // rayon du cou ; taille des cols
  // matières (zones de l'atlas)
  const zChemise = o.carreaux && !o.tablier ? Z.carreaux : Z.chemise;
  const zHaut = { veste: o.matelasse ? Z.matelasse : Z.toile, gilet: o.matelasse ? Z.matelasse : Z.toile, pull: Z.maille, chemise: zChemise, salopette: zChemise, jupe: zChemise, robe: o.imprime ? Z.imprime : Z.chemise }[tenue] ?? Z.toile;
  const zManche = tenue === 'gilet' ? (o.heros ? Z.maille : Z.chemise) : zHaut;
  const zBas = { jean: Z.jean, velours: Z.velours }[o.tissuBas] ?? Z.toile;
  const zJupe = tenue === 'robe' ? zHaut : (o.imprime ? Z.imprime : Z.toile);
  const zJambe = jupe ? Z.chemise : zBas;
  const zOurlet = tenue === 'pull' || (tenue === 'veste' && o.matelasse) ? Z.cotes : Z.toile;

  // positions des os au repos (relatives au parent)
  const xe = 0.178 * E, xh = 0.09 * H;
  const L1 = DIM.cuisse * kj, L2 = DIM.tibia * kj, LB = DIM.bras * ka, LA = DIM.avantBras * ka, yB = DIM.cheville + L1 + L2 - DIM.yHanche;
  const P = [
    [0, yB, 0], [0, 0.07, 0], [0, 0.2, 0], [0, 0.275 - (PE ? PE.dyT : 0), 0.016],
    [xe, DIM.yEpaule, -0.01], [0, -LB, 0], [0, -LA, 0],
    [-xe, DIM.yEpaule, -0.01], [0, -LB, 0], [0, -LA, 0],
    [xh, DIM.yHanche, 0], [0, -L1, 0], [0, -L2, 0],
    [-xh, DIM.yHanche, 0], [0, -L1, 0], [0, -L2, 0],
    PE ? [0, 0.12, -0.19] : [0, -0.07, 0], [0, 0.205, -0.1], // (un enfant : son cartable, sur le dos)
  ];
  const G = P.map(() => []);
  const add = (i, ...g) => G[i].push(...g);

  /* bassin : hanches, ceinture, étui de sécateur ; jupe ou robe */
  const anB = [[-0.125, 0.12 * H, 0.085], [-0.085, 0.152 * H * K, 0.1 * K], [-0.02, 0.166 * H * K, 0.113 * K, -0.006], [0.05, 0.158 * H * K, 0.108 * K], [0.1, 0.152 * K * (1 + (H - 1) * 0.4), 0.104 * K + ventre * 0.3]];
  const cJupe = tenue === 'robe' ? haut : bas;
  add(0, loft(anB, NT, jupe ? cJupe : bas, jupe ? zJupe : zBas));
  if (jupe) {
    const long = (tenue === 'robe' ? -0.5 : -0.46) * kj;
    add(0, loft([[long, 0.27 * H, 0.25, 0.025], [-0.2, 0.205 * H * K, 0.165 * K, 0.005], [0.02, 0.17 * H * K, 0.118 * K], [0.1, 0.156 * K, 0.108 * K]], 14, cJupe, zJupe, false, true));
    add(0, loft([[long, 0.276 * H, 0.256, 0.025], [long + 0.025, 0.272 * H, 0.252, 0.025]], 14, fonce(cJupe, 0.8), zJupe, false, false));
  }
  // ceinture visible seulement sous une chemise rentrée (veste, gilet et pull la couvrent)
  const longue = tenue === 'veste' || tenue === 'gilet' || tenue === 'pull';
  if (!longue && tenue !== 'salopette' && tenue !== 'robe') {
    add(0, bande(anB, 0.05, 0.095, 1.03, '#2a2520', Z.ceinture, NT, { kv: 1 / 0.045, v0: 0.05 }), boite(0.048, 0.036, 0.012, '#c9a55a', Z.uni, 0, 0.072, avant(anB, 0.072) * 1.03 + 0.004));
  }
  if (o.secateur) add(0, boite(0.04, 0.12, 0.065, '#5a3a28', Z.cuir, -0.178 * H * K, -0.07, 0.03, 0, 0, -0.08),
    boite(0.016, 0.06, 0.016, '#c0392b', Z.uni, -0.176 * H * K, 0.015, 0.045, 0, 0, 0.15), boite(0.016, 0.06, 0.016, '#c0392b', Z.uni, -0.182 * H * K, 0.015, 0.018, 0, 0, -0.15));

  /* ventre et poitrine (le corps se plie en deux endroits) */
  const anV = [[longue ? -0.1 : -0.03, (longue ? 0.172 * H : 0.152) * K, (longue ? 0.118 : 0.105) * K + ventre * 0.3], [0.08, 0.16 * K + ventre * 0.3, 0.112 * K + ventre, ventre * 0.6], [0.21, 0.17 * K * E, 0.114 * K + ventre * 0.3, ventre * 0.2]];
  const buste = femme && !PE ? 0.016 : 0;
  // poitrine un peu en avant, haut du dos arrondi ; le haut monte en pente douce des épaules à la base du cou (trapèzes),
  // plus haut derrière que devant
  const anP = [[-0.02, 0.17 * K * E, 0.114 * K + ventre * 0.3], [0.1, 0.188 * E * K, 0.122 * K + buste, 0.006 + buste * 0.7], [0.2, 0.194 * E * K, 0.118 * K, -0.006],
    [0.245, 0.182 * E, 0.104, -0.006], [0.27, 0.168 * E, 0.095, -0.012], [0.298, 0.134 * E, 0.08, -0.019], [0.32, 0.095, 0.064, -0.025], [0.34, 0.068, 0.047, -0.03]];
  // le motif garde la même hauteur du ventre à la poitrine (os l'un au-dessus de l'autre, 20 cm d'écart)
  add(1, loft(anV, NT, haut, zHaut)); add(2, loft(anP, NT, haut, zHaut, true, true, { v0: -0.2 }));
  const ourlet = fonce(haut, 0.72);
  if (tenue === 'veste' || tenue === 'gilet') {
    // fermeture, poches plaquées, col montant, ourlet
    add(1, boite(0.012, 0.31, 0.01, '#1d1d22', Z.fermeture, 0, 0.055, avant(anV, 0.055) + 0.003),
      boite(0.085, 0.07, 0.012, ourlet, Z.poche, 0.085 * K, 0.0, avant(anV, 0.0) - 0.012, 0, 0.32), boite(0.085, 0.07, 0.012, ourlet, Z.poche, -0.085 * K, 0.0, avant(anV, 0.0) - 0.012, 0, -0.32));
    add(2, boite(0.012, 0.25, 0.01, '#1d1d22', Z.fermeture, 0, 0.1, avant(anP, 0.1) + 0.003), boite(0.07, 0.06, 0.012, ourlet, Z.poche, 0.075, 0.14, avant(anP, 0.14) - 0.006, 0, 0.3));
    add(2, col([[-0.025, 0.096, 0.092, 0.004], [0, 0.09, 0.084, 0], [0.058, 0.082, 0.077, -0.016]], o.col || ourlet, Z.toile, kCol)); // col montant
    add(1, bande(anV, -0.1, -0.07, 1.035, ourlet, zOurlet, NT));
  } else if (tenue === 'pull') {
    add(1, bande(anV, -0.1, -0.05, 1.03, ourlet, Z.cotes, NT));
    add(2, col([[-0.02, 0.092, 0.088, 0.004], [0, 0.086, 0.081, 0], [0.03, 0.08, 0.076, -0.006]], ourlet, Z.cotes, kCol)); // col rond en côtes
    if (o.col && o.col !== haut) add(2, boite(0.03, 0.03, 0.01, o.col, Z.chemise, 0.03, 0.282, 0.075, 0.5, 0, 0.5), boite(0.03, 0.03, 0.01, o.col, Z.chemise, -0.03, 0.282, 0.075, 0.5, 0, -0.5));
  } else if (tenue === 'chemise' || tenue === 'salopette' || tenue === 'jupe') {
    // col de chemise et boutons
    // col de chemise : le pied autour du cou, les pointes rabattues du haut du col sur la poitrine
    const cc0 = o.col || '#f3eee6', anCol = [[-0.02, 0.09, 0.086, 0.004], [0, 0.085, 0.08, 0], [0.038, 0.079, 0.075, -0.01]];
    add(2, col(anCol, cc0, Z.chemise, kCol), ...[1, -1].map(s => barre(surCol(anCol, kCol, s * 0.02, 0.034, 0.003), surLoft(anP, s * 0.048, 0.266, 1, 0.004), 0.03, 0.005, cc0, Z.chemise)));
    for (let i = 0; i < 3; i++) add(2, boite(0.012, 0.012, 0.006, '#ece6da', Z.uni, 0, 0.2 - i * 0.075, avant(anP, 0.2 - i * 0.075) + 0.003));
  } else if (tenue === 'robe') {
    add(1, bande(anV, -0.03, 0.0, 1.03, fonce(haut, 0.6), Z.toile, NT));
    add(2, col([[-0.02, 0.092, 0.088, 0.004], [0, 0.086, 0.081, 0], [0.012, 0.084, 0.079, -0.002]], fonce(haut, 0.85), Z.toile, kCol)); // encolure
  }
  if (tenue === 'salopette') {
    // bavette et bretelles
    add(1, boite(0.2 * K, 0.24, 0.016, bas, zBas, 0, 0.09, avant(anV, 0.09) + 0.004));
    add(2, boite(0.19 * K, 0.1, 0.016, bas, zBas, 0, 0.03, avant(anP, 0.03) + 0.006), boite(0.035, 0.016, 0.02, '#c9a55a', Z.uni, 0.07, 0.07, avant(anP, 0.07) + 0.012), boite(0.035, 0.016, 0.02, '#c9a55a', Z.uni, -0.07, 0.07, avant(anP, 0.07) + 0.012));
    for (const s of [1, -1]) add(2, sangle(anP, s * 0.092, [0.07, 0.17, 0.24, 0.28], [0.28, 0.2, 0.1, 0.0], 0.035, 0.008, bas, zBas));
  }
  if (o.tablier) {
    const t = o.tablier;
    add(0, boite(0.33 * H * K, 0.5, 0.012, t, Z.toile, 0, -0.18, avant(anB, 0.0) + 0.03, -0.08));
    add(1, boite(0.25 * K, 0.22, 0.012, t, Z.toile, 0, 0.08, avant(anV, 0.08) + 0.006));
    add(2, boite(0.22 * K, 0.16, 0.012, t, Z.toile, 0, 0.06, avant(anP, 0.06) + 0.008));
    for (const s of [1, -1]) add(2, sangle(anP, s * 0.074, [0.13, 0.22, 0.28, 0.31], [0.3], 0.014, 0.006, fonce(t), Z.toile));
  }

  /* tête : cou, crâne, visage (projeté de face), yeux, sourcils, nez, oreilles, cheveux, couvre-chef */
  const T = 3, yc = YC, zc = ZC, rx = RX, ry = RY, rz = RZ, jaw = femme || PE ? 0.36 : 0.24;
  // surface du visage (sans ses facettes) : z en (x, y), y compté depuis le centre du crâne
  const relief = reliefVisage(femme || !!PE);
  const surface = (x, y) => {
    const uy = y / ry, t = uy < 0 ? -uy : 0, kx = 1 - jaw * t * t * t, kz = 1 - jaw * 0.45 * t * t, ux = x / (rx * kx), r2 = 1 - ux * ux - uy * uy;
    const uz = r2 > 0 ? Math.sqrt(r2) : 0;
    return zc + uz * rz * kz + jaw * 0.1 * t * rz + relief(ux, uy, uz) * rz;
  };
  // cou : une colonne épaisse, un peu penchée vers l'avant, qui sort des trapèzes ; la nuque remonte jusqu'à l'occiput
  // (elle cache le bas du crâne), la gorge rejoint le dessous de la mâchoire
  add(T, loft([[-0.07, cou * 1.3, cou * 1.12, -0.03], [-0.01, cou * 1.08, cou * 1.0, -0.02], [0.05, cou * 1.0, cou * 1.0, -0.01], [0.11, cou * 0.98, cou * 1.06, -0.002], [0.155, cou * 0.92, cou * 0.95, -0.01]], 12, peau, Z.peau));
  const zVisage = femme ? Z.visageF : (o.barbe || o.malRase) ? Z.visageB : Z.visageH;
  {
    const [face, crane] = separer(boule(rx, ry, rz, 0, yc, zc, 3, null, jaw, 0.999, relief), (x, y, z) => z > zc - 0.012);
    add(T, finir(face, peau, zVisage, uvVisage(face, yc)), finir(crane, peau, Z.peau, uvBoite(crane, Z.peau)));
  }
  // yeux : amande posée sur le visage, blanc et iris dessinés (couleur de l'iris = couleur des sommets)
  for (const s of [1, -1]) {
    const ex = s * 0.0315, w = OEIL.w / 2, h = OEIL.h, Pt = [], Uv = [];
    const pts = [...OEIL.haut, ...OEIL.bas.slice(1, -1).reverse()]; // contour : coin intérieur, haut, coin extérieur, bas
    const sommet = (a, b) => { const x = ex + s * a * w, y = b * h; Pt.push(x, yc + y, surface(x, y) + 0.0004); Uv.push((a / OEIL.a + 1) / 2, 0.5 - b / (2 * OEIL.b)); };
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; sommet(0, 0.03); sommet(p[0], p[1]); sommet(q[0], q[1]); }
    add(T, finir(surVisage(Pt, Uv, 0, yc, zc - 0.05), o.iris || '#3b2a1e', s > 0 ? Z.oeilG : Z.oeilD, new Float32Array(Uv)));
  }
  // sourcils : bande posée sur le visage, couleur des cheveux un peu plus sombre, poils dans le sens du sourcil
  {
    const arc = femme ? [[0.013, 0.0195, 0.0019], [0.027, 0.0262, 0.0021], [0.041, 0.0266, 0.0016], [0.054, 0.0205, 0.0008]] : [[0.012, 0.019, 0.0026], [0.026, 0.0245, 0.0028], [0.041, 0.0245, 0.0022], [0.054, 0.0185, 0.0011]];
    const zs = ZONE[Z.cheveux];
    for (const s of [1, -1]) {
      const Pt = [], Uv = [];
      const sommet = (k, e) => { const [x0, y0, ep] = arc[k], x = s * x0, y = y0 + e * ep; Pt.push(x, yc + y, surface(x, y) + 0.0007); Uv.push((e + 1) * ep / zs.tu, k * 0.014 / zs.tv); };
      for (let k = 0; k < 3; k++) { sommet(k, -1); sommet(k + 1, -1); sommet(k + 1, 1); sommet(k, -1); sommet(k + 1, 1); sommet(k, 1); }
      add(T, finir(surVisage(Pt, Uv, 0, yc, zc - 0.05), fonce(ch, 0.92), Z.cheveux, new Float32Array(Uv)));
    }
  }
  // nez : arête, bout, ailes, dessous (narines dessinées), posé sur le visage ; même projection que le visage.
  // Rangées du haut vers le bas : [y, demi-largeur, saillie au milieu, saillie des bords] ; section arrondie (cinq colonnes).
  {
    const R = [[0.016, 0.007, 0.0015, -0.001], [0.0, 0.0075, 0.006, -0.0008], [-0.016, 0.0085, 0.011, -0.0005], [-0.03, 0.011, 0.0175, 0.002], [-0.04, 0.0155, 0.0115, 0.0015], [-0.0465, 0.011, -0.001, -0.001]]
      .map(([y, l, a, b]) => (PE ? [y * 0.9, l * 0.82, a * 0.7, b * 0.7] : [y, l, a, b])); // (un enfant : un petit nez)
    const CO = [-1, -0.5, 0, 0.5, 1], Pt = [];
    const q = (k, c) => { const [y, l, dm, db] = R[k], x = c * l; Pt.push(x, yc + y, surface(x, y) + db + (dm - db) * (1 - c * c)); };
    for (let k = 0; k < R.length - 1; k++) for (let i = 0; i < 4; i++) { const a = CO[i], b = CO[i + 1]; q(k, a); q(k, b); q(k + 1, b); q(k, a); q(k + 1, b); q(k + 1, a); }
    const g = surVisage(Pt, new Array(Pt.length / 3 * 2).fill(0), 0, yc, zc - 0.03);
    add(T, finir(g, peau, zVisage, uvVisage(g, yc)));
  }
  // oreilles : du sourcil au bas du nez, juste derrière le milieu de la tête
  for (const s of [1, -1]) add(T, boulette(1, peau, Z.peau, s * rx * 0.97, yc - 0.01, zc - 0.014, 0.0095, 0.032, 0.02, 1));
  // cheveux : la forme du crâne agrandie de k. Un champ dit où il y en a (positif dedans, en unités de la sphère) :
  // l'épaisseur monte de zéro à k sur une bande de largeur w, et rentre sous la peau au-dehors. La lisière (épaisseur
  // nulle) suit ainsi une courbe douce au lieu des arêtes des facettes ; les facettes enfouies sont retirées. Même boule
  // que le crâne, agrandie depuis le même centre : la lisière est la courbe où l'épaisseur s'annule, sans festons.
  const coif = o.coiffure;
  const rampe = (k, d, w) => 1 + (k - 1) * Math.max(-1.6, Math.min(1, d / w));
  const cheveux = (k, champ, sx = 1, sy = 1, sz = 1, dy = 0, c = ch, zone = Z.cheveux) => {
    const g = boule(rx * k * sx, ry * k * sy, rz * k * sz, 0, yc + dy, zc, 3, (x, y, z) => rampe(k, champ(x, y, z), 0.09) / k, jaw, 0.975 / k, relief);
    return finir(g, c, zone, uvSphere(g, zone, 0, yc + dy, zc, rx * k));
  };
  const nuque = z => 0.2 * Math.min(1, Math.max(0, -z * 2.5)); // les cheveux descendent plus bas derrière, jusqu'à la nuque
  const court = (x, y, z) => Math.max(y - 0.5, Math.min(0.25 - z, y + 0.42 + nuque(z)), Math.min(Math.abs(x) - 0.82, y + 0.1, 0.5 - z));
  if (coif === 'chauve') add(T, cheveux(1.045, (x, y, z) => Math.min(0.25 - y, y + 0.5 + nuque(z) * 0.6, 0.3 - z)));
  else if (coif === 'carre') add(T, cheveux(1.06, (x, y, z) => Math.max(y - 0.42, Math.min(0.02 - z, y + 0.62))), cheveux(1.1, (x, y, z) => Math.min(-0.08 - z, y + 0.62, 0.6 - y), 1, 1, 1, -0.012));
  else if (coif === 'long') {
    add(T, cheveux(1.06, (x, y, z) => Math.max(y - 0.42, Math.min(0.02 - z, y + 0.6))));
    // longueur qui tombe dans le dos, en mèches
    add(T, loft([[yc - 0.3, 0.085, 0.032, zc - 0.085], [yc - 0.17, 0.092, 0.042, zc - 0.078], [yc - 0.05, 0.088, 0.055, zc - 0.058], [yc + 0.03, 0.07, 0.05, zc - 0.045]], 8, ch, Z.cheveux, true, false));
  } else add(T, cheveux(coif === 'court' ? 1.05 : 1.06, court));
  if (coif === 'chignon') { const g = S(0.052, ch, 0, yc + 0.07, zc - 0.105, 1, 0.9, 1, 1); add(T, finir(g, ch, Z.cheveux, uvSphere(g, Z.cheveux, 0, yc + 0.07, zc - 0.105, 0.052))); }
  if (coif === 'queue') {
    add(17, loft([[-0.025, 0.034, 0.034, -0.012], [0.005, 0.034, 0.034, -0.012]], 8, '#8e2a3b', Z.toile),
      loft([[-0.27, 0.012, 0.012, -0.05], [-0.18, 0.034, 0.03, -0.035], [-0.06, 0.044, 0.04, -0.02], [0.0, 0.036, 0.034, -0.01]], 7, ch, Z.cheveux));
  }
  // Coiffures d'enfant (l'école, Teddy, 26/11/2026 : « les enfants divers ») : ce qui dépasse de la coupe courte posée
  // plus haut. Couettes (deux touffes nouées sur les côtés), nattes (deux tresses derrière les oreilles), tresses fines
  // (des nattes plaquées qui tombent derrière, une perle au bout), cheveux crépus en boule, boucles. Portées par l'os de
  // la tête. el : la couleur des élastiques et des perles.
  {
    const el = o.elastique || '#e84393', dirige = (g, d, x, y, z) => { g.applyMatrix4(M4.makeRotationFromQuaternion(QS.setFromUnitVectors(AXE_BAS, DIR.set(d[0], d[1], d[2]).normalize()))); return deplacer(g, x, y, z); };
    if (coif === 'couettes') for (const s of [1, -1]) {
      const ax = s * rx * 0.98, ay = yc + 0.035, az = zc - 0.035, d = [s * 0.75, -0.62, -0.2];
      add(T, dirige(loft([[-0.14, 0.008, 0.008], [-0.1, 0.03, 0.026], [-0.045, 0.037, 0.032], [0, 0.022, 0.02]], 7, ch, Z.cheveux, true, true), d, ax, ay, az),
        dirige(loft([[-0.012, 0.024, 0.024], [0.006, 0.024, 0.024]], 8, el, Z.uni), d, ax, ay, az));
    }
    if (coif === 'nattes') for (const s of [1, -1]) {
      const x0 = s * 0.072, y0 = yc - 0.035, z0 = zc - 0.075;
      for (let k = 0; k < 7; k++) {
        const t = k / 6, x = x0 + s * 0.018 * t + (k % 2 ? 0.006 : -0.006), y = y0 - 0.035 * k, z = z0 - 0.012 * t;
        add(T, boulette(0.019 - 0.004 * t, ch, Z.cheveux, x, y, z, 1, 1.25, 0.95, 1));
      }
      add(T, loft([[y0 - 0.27, 0.006, 0.006, z0 - 0.012, x0 + s * 0.018], [y0 - 0.235, 0.017, 0.016, z0 - 0.012, x0 + s * 0.018]], 6, ch, Z.cheveux),
        loft([[y0 - 0.238, 0.017, 0.017, z0 - 0.012, x0 + s * 0.018], [y0 - 0.222, 0.017, 0.017, z0 - 0.012, x0 + s * 0.018]], 6, el, Z.uni));
    }
    if (coif === 'tresses') for (let k = 0; k < 11; k++) {
      // tout autour de l'arrière de la tête, de la tempe à l'autre tempe ; plus longues derrière
      const a = Math.PI * (0.62 + 0.76 * k / 10), cx = Math.sin(a) * rx * 1.02, cz = zc + Math.cos(a) * rz * 1.0, l = 0.2 + 0.08 * Math.sin(Math.PI * k / 10);
      add(T, loft([[yc - 0.02 - l, 0.008, 0.008, cz - 0.01, cx * 1.06], [yc - 0.03, 0.011, 0.011, cz, cx]], 4, ch, Z.cheveux, false, false),
        boulette(0.012, el, Z.uni, cx * 1.06, yc - 0.03 - l, cz - 0.01));
    }
    // cheveux crépus en boule : un volume rond qui déborde de la tête, plus haut, la lisière dégagée sur le front et les tempes
    if (coif === 'afro') add(T, cheveux(1.26, (x, y, z) => Math.max(y - 0.4, Math.min(0.28 - z, y + 0.3 + nuque(z)), Math.min(Math.abs(x) - 0.78, y + 0.05, 0.42 - z)), 1.04, 1.08, 1.02, 0.03, ch, Z.barbe));
    if (coif === 'boucles') for (let k = 0; k < 16; k++) {
      // des boucles serrées sur le dessus, les côtés et l'arrière (pas sur le front)
      const a = k * 2.39996, el2 = 0.25 + 0.95 * ((k * 0.618) % 1), ux = Math.cos(el2) * Math.sin(a), uy = Math.sin(el2) * 0.9 - 0.12, uz = Math.cos(el2) * Math.cos(a);
      if (uz > 0.35 && uy < 0.55) continue;
      add(T, boulette(0.03, ch, Z.barbe, ux * rx * 1.04, yc + uy * ry * 1.02, zc + uz * rz * 1.02, 1, 0.85, 1, 1));
    }
  }
  // Barbe courte. Du favori, juste devant l'oreille, la ligne des joues descend en courbe jusqu'aux commissures ; la
  // moustache sous le nez ; la bouche dégagée (les lèvres se voient) ; rien derrière l'oreille (avant : une cagoule). Bord irrégulier, comme
  // des poils ; mince sur les joues, du volume au menton. Le visage « B » (barbe de quelques jours) est dessous : le bord
  // se fond dans l'ombre de barbe.
  if (o.barbe) {
    const haut = ax => (ax >= 0.9 ? -0.04 : ax >= 0.6 ? -0.37 + (ax - 0.6) / 0.3 * 0.33 : ax >= 0.32 ? -0.47 + (ax - 0.32) / 0.28 * 0.1 : -0.425);
    const champ = (x, y, z) => {
      const ax = Math.abs(x), poils = 0.022 * Math.sin(x * 23 + y * 7) + 0.016 * Math.sin(y * 31 - x * 9);
      // devant, sous la ligne, hors de la bouche (une ellipse autour des lèvres, de -0,56 à -0,70)
      // vers l'arrière : jusqu'au plan de l'oreille en haut, jusqu'à l'angle de la mâchoire (sous l'oreille) en bas
      return Math.min(haut(ax) + poils - y, z + 0.05 + 0.22 * lisse((-0.3 - y) / 0.4), Math.max((Math.hypot(ax / 0.31, (y + 0.635) / 0.1) - 1) * 0.1, 0.3 - z));
    };
    const KB = 1.065, epais = (y, z) => 1.016 + 0.045 * lisse((-0.74 - y) / 0.2) * lisse((z - 0.1) / 0.4); // épaisse au menton
    const g = boule(rx * KB, ry * KB, rz * KB, 0, yc, zc, 3, (x, y, z) => rampe(epais(y, z), champ(x, y, z), 0.05) / KB, jaw, 0.985 / KB, relief);
    add(T, finir(g, fonce(ch, 1.12), Z.barbe, uvSphere(g, Z.barbe, 0, yc, zc, rx))); // un peu plus claire que les cheveux
  }
  // lunettes : montures seules (les yeux restent visibles)
  if (o.lunettes) {
    const zl = surface(0.0315, 0) + 0.012, m = '#222';
    // la face (cercles, pont), puis la charnière qui rejoint la tempe et la branche qui longe la tête jusqu'à l'oreille
    const ch0 = [0.071, yc + 0.011, surface(0.071, 0.011) + 0.005];
    for (const s of [1, -1]) add(T, boite(0.05, 0.005, 0.005, m, Z.uni, s * 0.0315, yc + 0.013, zl), boite(0.05, 0.004, 0.005, m, Z.uni, s * 0.0315, yc - 0.013, zl),
      boite(0.004, 0.03, 0.005, m, Z.uni, s * 0.057, yc, zl), boite(0.004, 0.026, 0.005, m, Z.uni, s * 0.006, yc, zl + 0.001),
      barre([s * 0.056, yc + 0.011, zl - 0.002], [s * ch0[0], ch0[1], ch0[2]], 0.005, 0.005, m, Z.uni, 0.002),
      barre([s * ch0[0], ch0[1], ch0[2]], [s * 0.095, yc + 0.01, zc + 0.03], 0.004, 0.005, m, Z.uni, 0.002),
      barre([s * 0.095, yc + 0.01, zc + 0.03], [s * 0.094, yc + 0.004, zc - 0.022], 0.004, 0.005, m, Z.uni, 0.002));
  }
  const cc = o.chapeauC || '#1f2a44';
  if (o.chapeau === 'casquette') {
    // calotte, visière arrondie et un peu tombante, petit écusson
    add(T, habiller(ellipsoide(S(1, cc, 0, yc + 0.055, zc - 0.004, rx * 1.2, 0.075, rz * 1.13, 1), 0, yc + 0.055, zc - 0.004, rx * 1.2, 0.075, rz * 1.13), cc, Z.toile));
    const Pt = [], N = 7, y0 = yc + 0.043, zv = zc - 0.004 + rz * 1.13 * 0.8;
    const bordV = i => { const a = Math.PI * i / (N - 1), x = -Math.cos(a) * 0.092, zz = Math.sin(a) * 0.072; return [x, y0 - 0.012 * (x / 0.092) ** 2 - 0.16 * zz, zv + zz]; };
    for (let i = 0; i < N - 1; i++) {
      const a = bordV(i), b = bordV(i + 1), c0 = [0, y0, zv - 0.01];
      Pt.push(...c0, ...a, ...b);                                        // dessus
      Pt.push(c0[0], c0[1] - 0.008, c0[2], b[0], b[1] - 0.008, b[2], a[0], a[1] - 0.008, a[2]); // dessous
      Pt.push(...a, b[0], b[1] - 0.008, b[2], ...b, ...a, a[0], a[1] - 0.008, a[2], b[0], b[1] - 0.008, b[2]); // tranche
    }
    const v = nouvelle(Pt);
    add(T, finir(v, cc, Z.toile, uvBoite(v, Z.toile)));
    add(T, boite(0.03, 0.017, 0.005, '#e9e1d0', Z.uni, 0, yc + 0.083, zc - 0.004 + rz * 1.13 * 0.925, -0.4));
  }
  if (o.chapeau === 'beret') { const g = boule(0.12, 0.048, 0.125, 0.01, yc + 0.096, zc - 0.022, 1, null); add(T, finir(g, cc, Z.feutre, uvSphere(g, Z.feutre, 0.01, yc + 0.096, zc - 0.022, 0.12)), boite(0.01, 0.022, 0.01, cc, Z.feutre, 0.013, yc + 0.145, zc - 0.022)); }
  if (o.chapeau === 'paille') add(T, habiller(C(0.215, 0.215, 0.012, 12, '#d8c07a', 0, yc + 0.068, zc - 0.006), '#d8c07a', Z.paille), habiller(C(0.098, 0.11, 0.1, 10, '#d8c07a', 0, yc + 0.12, zc - 0.006), '#d8c07a', Z.paille), habiller(C(0.112, 0.112, 0.026, 10, cc, 0, yc + 0.086, zc - 0.006), cc, Z.toile));
  if (o.chapeau === 'bonnet') add(T, cheveux(1.1, (x, y) => y - 0.18, 1, 1.12, 1, 0.012, cc, Z.cotes), loft([[yc, rx * 1.12, rz * 1.1, zc], [yc + 0.045, rx * 1.1, rz * 1.08, zc]], 10, fonce(cc, 0.8), Z.cotes, false, false));
  // (un enfant : le pompon du bonnet ; l'écharpe nouée autour du cou, un pan qui tombe devant ; la capuche de la doudoune)
  // (le bonnet d'un enfant, « tuque » : porté plus haut, le revers au-dessus des sourcils, les yeux dégagés ; son pompon)
  if (o.chapeau === 'tuque') add(T, cheveux(1.1, (x, y, z) => y - 0.36 + 0.12 * Math.max(0, -z), 1, 1.14, 1, 0.018, cc, Z.cotes), loft([[yc + 0.048, rx * 1.1, rz * 1.06, zc - 0.004], [yc + 0.09, rx * 1.08, rz * 1.04, zc - 0.004]], 10, fonce(cc, 0.8), Z.cotes, false, false));
  if ((o.chapeau === 'bonnet' || o.chapeau === 'tuque') && o.pompon) add(T, boulette(0.036, o.pompon, Z.cotes, 0, yc + 0.018 + ry * 1.254 + 0.02, zc - 0.006, 1, 0.92, 1, 1));
  if (o.echarpe) {
    const anE = [[-0.032, 0.108, 0.104, 0.006], [0, 0.103, 0.098, 0], [0.042, 0.094, 0.09, -0.012]];
    add(2, col(anE, o.echarpe, Z.maille, kCol), barre(surCol(anE, kCol, 0.045, 0.004, 0.006), surLoft(anP, 0.07, 0.1, 1, 0.022), 0.055, 0.016, o.echarpe, Z.maille),
      barre(surLoft(anP, 0.07, 0.11, 1, 0.024), surLoft(anP, 0.072, 0.085, 1, 0.024), 0.058, 0.018, fonce(o.echarpe, 0.75), Z.cotes));
  }
  if (o.capuche) add(2, boulette(0.105, haut, zHaut, 0, 0.29, -0.115, 1.05, 0.62, 0.55, 1));

  /* bras : épaule, coude, main (paume et doigts d'un seul tenant, pouce) */
  for (const [i, s] of [[4, 1], [7, -1]]) {
    const anH = [[-0.29 * ka, 0.047 * K, 0.049 * K], [-0.14 * ka, 0.055 * K, 0.056 * K], [-0.04, 0.059 * K, 0.058 * K], [-0.01, 0.056 * K, 0.055 * K], [0.01, 0.047 * K, 0.047 * K], [0.023, 0.03 * K, 0.031 * K], [0.028, 0.008, 0.008]];
    const anA = [[-0.245 * ka, 0.035 * K, 0.033 * K], [-0.1 * ka, 0.049 * K, 0.046 * K], [0, 0.048 * K, 0.047 * K]];
    const zA = avantBras === peau ? Z.peau : zManche;
    add(i, loft(anH, NM, manche, zManche));
    add(i + 1, boulette(0.049 * K, avantBras, zA, 0, 0, 0), loft(anA, NM, avantBras, zA));
    if (avantBras === peau) add(i, bande(anH, -0.3 * ka, -0.24 * ka, 1.12, manche, zManche, NM));
    else add(i + 1, bande(anA, -0.245 * ka, -0.215 * ka, 1.08, fonce(manche, 0.8), zManche === Z.matelasse || zManche === Z.maille ? Z.cotes : zManche, NM));
    // main : la paume (épaisseur en x, largeur en z), les doigts qui s'enroulent vers la paume (-s x), le pouce devant
    const kh = femme ? 0.9 : 1, L = 0.17 * kh, dz = 0.004;
    const mo = { kv: -1 / L, miroir: s < 0 };
    add(i + 2, loft([[-0.088 * kh, 0.0135 * kh, 0.041 * kh, dz, -s * 0.001], [-0.045 * kh, 0.0165 * kh, 0.04 * kh, dz], [0, 0.017 * kh, 0.03 * kh, dz]], 8, peau, Z.main, false, true, mo),
      loft([[-0.17 * kh, 0.0072 * kh, 0.028 * kh, dz, -s * 0.034 * kh], [-0.155 * kh, 0.0095 * kh, 0.037 * kh, dz, -s * 0.026 * kh], [-0.125 * kh, 0.011 * kh, 0.04 * kh, dz, -s * 0.011 * kh], [-0.085 * kh, 0.0125 * kh, 0.041 * kh, dz, -s * 0.001]], 8, peau, Z.main, true, false, mo),
      loft([[-0.09 * kh, 0.0072 * kh, 0.0082 * kh, 0.057 * kh, -s * 0.022 * kh], [-0.072 * kh, 0.0092 * kh, 0.0102 * kh, 0.055 * kh, -s * 0.018 * kh], [-0.046 * kh, 0.011 * kh, 0.0125 * kh, 0.046 * kh, -s * 0.012 * kh], [-0.018 * kh, 0.0115 * kh, 0.015 * kh, 0.03 * kh, -s * 0.006 * kh]], 6, peau, Z.pouce, true, false, { kv: -1 / (0.072 * kh), v0: -0.018 * kh, miroir: s < 0 }));
  }
  // téléphone dans la main droite (paume vers +x), caché tant que l'os « tel » est à l'échelle 0
  if (!PE) add(16, boite(0.012, 0.132, 0.066, '#1c1c22', Z.uni, 0.043, -0.002, 0.004), boite(0.003, 0.114, 0.056, '#9fd8ff', Z.uni, 0.0505, 0.002, 0.004));
  // le cartable d'un enfant, sur son dos (os 16, rattaché à la poitrine : caché tant qu'il est à l'échelle 0, comme le
  // téléphone) : le sac, son rabat, la poche de devant, la bande qui brille, la poignée ; les bretelles sur les épaules
  // (posées sur la poitrine, ramenées dans le repère de l'os)
  if (PE && o.cartable) {
    const c = o.cartable, cf = fonce(c, 0.78), y0 = P[16][1], z0 = P[16][2];
    add(16, boite(0.25, 0.29, 0.12, c, Z.toile, 0, -0.02, 0), boite(0.256, 0.12, 0.126, cf, Z.toile, 0, 0.085, -0.002), boite(0.19, 0.12, 0.035, cf, Z.toile, 0, -0.085, -0.075),
      boite(0.2, 0.022, 0.006, '#f2f0e8', Z.uni, 0, -0.03, -0.0945), barre([-0.045, 0.13, 0.01], [0.045, 0.13, 0.01], 0.012, 0.014, '#2b2b30', Z.uni, 0.01));
    for (const s of [1, -1]) { const g = sangle(anP, s * 0.075, [0.06, 0.16, 0.24], [0.28, 0.24, 0.2], 0.03, 0.009, '#2b2b30', Z.toile); add(16, deplacer(g, 0, -y0, -z0)); }
  }

  /* jambes : cuisse, genou, chaussure ou botte */
  for (const [i, s] of [[10, 1], [13, -1]]) {
    // (un enfant : les longueurs multipliées par kj, les largeurs par rj ; la hanche reste à la largeur du bassin)
    const anC = [[-0.44 * kj, 0.058 * rj, 0.06 * rj], [-0.2 * kj, 0.077 * K * rj, 0.08 * K * rj], [0, 0.087 * K * H, 0.09 * K]];
    const anJ = [[-0.4, 0.04, 0.044], [-0.3, 0.046, 0.05, -0.004], [-0.16, 0.057, 0.066, -0.012], [-0.06, 0.059, 0.064, -0.008], [0, 0.058, 0.06]].map(([y, a, b, d]) => [y * kj, a * rj, b * rj, (d || 0) * rj]);
    add(i, boulette(0.08 * K, jambe, zJambe, s * 0.004, -0.015, 0), loft(anC, NM, jambe, zJambe));
    add(i + 1, boulette(0.06 * rj, jambe, zJambe, 0, 0, 0), loft(anJ, NM, jambe, zJambe));
    if (o.bottes) add(i + 1, loft([[-0.41 * kj, 0.054 * rj, 0.058 * rj], [-0.19 * kj, 0.061 * rj, 0.068 * rj, -0.008]], NM, chau, Z.cuir), loft([[-0.2 * kj, 0.066 * rj, 0.073 * rj, -0.008], [-0.2 * kj + 0.02, 0.066 * rj, 0.073 * rj, -0.008]], NM, fonce(chau, 0.75), Z.cuir));
    else if (!jupe) add(i + 1, bande(anJ, -0.4 * kj, -0.4 * kj + 0.05, 1.18, jambe, zJambe, NM));
    // chaussure : volume couché le long du pied (talon, cou-de-pied, bout arrondi) sur une semelle débordante
    const kp = femme ? 0.9 : 1;
    const dessus = loft([[-0.078 * kp, 0.036 * kp, 0.03, -0.047], [-0.045 * kp, 0.046 * kp, 0.044, -0.036], [0.06 * kp, 0.048 * kp, 0.034, -0.045], [0.165 * kp, 0.045 * kp, 0.021, -0.054], [0.212 * kp, 0.022 * kp, 0.012, -0.058]], 8, chau, Z.cuir);
    const semelle = loft([[-0.082 * kp, 0.038 * kp, 0.008, -0.073], [-0.045 * kp, 0.051 * kp, 0.009, -0.072], [0.06 * kp, 0.053 * kp, 0.009, -0.072], [0.165 * kp, 0.05 * kp, 0.009, -0.072], [0.218 * kp, 0.026 * kp, 0.008, -0.071]], 6, '#1a1714', Z.semelle);
    add(i + 2, coucher(dessus), coucher(semelle));
  }

  /* assemblage : chaque pièce suit son os ; près d'une jointure, elle suit aussi l'os voisin (peau souple, voir liens) */
  const W = [], PAR = PE ? PARENT_ENFANT : PARENT;
  for (let i = 0; i < P.length; i++) {
    const p = PAR[i] < 0 ? [0, 0, 0] : W[PAR[i]];
    W.push([p[0] + P[i][0], p[1] + P[i][1], p[2] + P[i][2]]);
  }
  const parts = [];
  for (let i = 0; i < G.length; i++) {
    if (!G[i].length) continue;
    for (const g of G[i]) deplacer(g, W[i][0], W[i][1], W[i][2]);
    const g = fusion(G[i]), n = g.attributes.position.count, pa = g.attributes.position.array;
    const si = new Uint8Array(n * 4), sw = new Uint8Array(n * 4);
    // (les seuils des jointures, pour des membres de longueur d'adulte : ceux d'un enfant, plus courts, sont ramenés)
    const ky = i >= OS.cuisseG && i !== OS.piedG && i < OS.piedD ? kj : i === OS.brasG || i === OS.coudeG || i === OS.brasD || i === OS.coudeD ? ka : 1;
    for (let k = 0; k < n; k++) {
      const l = liens(i, pa[k * 3] - W[i][0], (pa[k * 3 + 1] - W[i][1]) / ky);
      const w = l ? Math.round(l[1] * 255) : 0;
      si[k * 4] = i; sw[k * 4] = 255 - w;
      if (w) { si[k * 4 + 1] = l[0]; sw[k * 4 + 1] = w; }
    }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4, true));
    parts.push(g);
  }
  const geo = compacter(indexer(fusion(parts))); // indexée : chaque sommet n'est calculé (et déformé par les os) qu'une fois
  // coordonnées de texture sur 16 bits (uv / UVK)
  {
    const a = geo.attributes.uv.array, q = new Int16Array(a.length), k = 32767 / UVK;
    for (let i = 0; i < a.length; i++) { const v = a[i] * k; q[i] = v >= 32767 ? 32767 : v <= -32767 ? -32767 : v + (v < 0 ? -0.5 : 0.5); }
    geo.setAttribute('uv', new THREE.BufferAttribute(q, 2, true));
  }
  const os = P.map(p => { const b = new THREE.Bone(); b.position.set(p[0], p[1], p[2]); return b; });
  for (let i = 1; i < os.length; i++) os[PAR[i]].add(os[i]);
  const maillage = new THREE.SkinnedMesh(geo, MAT_PERSO);
  maillage.add(os[0]);
  maillage.bind(new THREE.Skeleton(os));
  maillage.castShadow = true; maillage.receiveShadow = true;
  maillage.customDepthMaterial = OMBRE_PERSO;
  // sphère englobante fixe (sinon three.js la calcule une fois, dans la première pose)
  maillage.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.95, 0.1), 1.35);
  os[OS.tel].scale.setScalar(0.001);
  os[OS.tete].scale.setScalar(TETE * kt); // après bind : la tête (cou, cheveux, couvre-chef compris) un peu plus grande

  const groupe = new THREE.Group();
  const echelle = PE ? (o.hauteur ?? PE.hauteur) / PE.Hm : 0.96 * (o.taille ?? 1);
  groupe.scale.setScalar(echelle);
  groupe.add(maillage);
  // caché (lui, ou son maillage : trop loin, derrière une cloison), il ne fait plus recalculer les matrices de ses 18 os à
  // chaque image : three.js ne descend dans un enfant que si son matrixWorldAutoUpdate est vrai
  Object.defineProperty(groupe, 'matrixWorldAutoUpdate', { get: () => groupe.visible && maillage.visible, set() {}, configurable: true });
  return { groupe, maillage, os, echelle, femme, queue: coif === 'queue', enfant: !!PE, dim: { xh, xe, H, K, L1, L2, yB, bras: LB, avantBras: LA } };
}
