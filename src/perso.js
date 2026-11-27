// Les personnages : un seul maillage par personnage (chaque pièce suit son os ; près d'une jointure, aussi l'os voisin :
// liens), donc un seul appel de dessin (plus un pour l'ombre). Une tête sculptée (une grille serrée sur le visage, son
// relief : reliefVisage), des yeux (globe, paupières, cils, le clignement), un nez, des oreilles, des mains à cinq doigts
// (main), des cheveux qui ont du volume et dont la lisière se fond dans la peau, des mèches, des tenues de travail ou de
// ville ; un casque-micro (o.casque), un badge (o.badge), une cigarette (cigarette). L'animation (marche, course, repos,
// conduite, téléphone, salut, bureau, parler, fumer) est dans anim.js.
//
// Matière : une seule pour tous les personnages, avec une seule texture (l'atlas de atlas.js : visages, yeux, main,
// toile, jean, maille, matelassé, cuir, cheveux...). Chaque pièce porte des coordonnées de texture calculées dans le
// repère du personnage (elles bougent avec lui) et le numéro de sa zone dans l'atlas (attribut aMat). La couleur
// de la pièce (teint, couleur de la veste) reste portée par les sommets : la texture la module.
// Normales lissées (sauf aux arêtes vives : boîtes, bords des cheveux), pour des formes rondes sans plus de triangles.
import * as THREE from 'three';
import { B, C, S, MAT, T as TM, teinter, fusion, icosa, deplacer } from './modeles.js';
import { Z, ZONE, GLSL_ZONES, FX, FY, OEIL, LA, HA, texturePersos } from './atlas.js';
import { hasard, lisse, entre, assombrir } from './outils.js';

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
// Les mêmes, d'une autre apparence (Réglages du téléphone : « Apparence ») : même tenue de travail ; une peau foncée, un
// dégradé et une barbe courte ; une peau brune, des tresses nouées en queue sous la casquette
HEROS.vigneron2 = { ...HEROS.vigneron, peau: '#613e2d', cheveux: '#17120f', nature: 'crepu', coiffure: 'degrade', barbe: 'courte', iris: '#2a1d16' };
HEROS.vigneronne2 = { ...HEROS.vigneronne, peau: '#a87757', cheveux: '#22170f', nature: 'crepu', coiffure: 'tresses', attache: true, iris: '#3b2a1e' };

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
// Le lustre de la peau : un reflet doux du soleil (ombre comprise) sur le visage et les mains, ajouté à la couleur, pas
// multiplié par elle. Presque rien sur une peau claire ; sur une peau foncée, il dessine le front, l'arête du nez, les
// pommettes, le menton : un visage foncé n'est ni gris ni plat. Un reflet plus large et plus faible sur les cheveux (des
// cheveux noirs restent des cheveux, pas un casque). (directLight : le soleil, tel que l'a laissé la boucle des lumières
// de three.js, ombre et intérieurs compris.)
// La lumière qui enveloppe : sur la peau, le passage de la lumière à l'ombre est doux et chaud (la lumière traverse un
// peu la peau : les joues, le nez, les oreilles, les doigts rosissent au bord de l'ombre) ; sur les étoffes, un peu plus
// doux que du plâtre. Le liseré : le ciel sur les bords du personnage (vus de biais), qui le détache du décor.
const zones = l => l.map(n => `iz2 == ${Z[n]}`).join(' || ');
const GLSL_LUSTRE = `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0
{
  int iz2 = int(vZone + 0.5);
  bool peau = ${zones(['peau', 'visageH', 'visageB', 'visageF', 'main', 'pouce'])};
  float ks = peau ? 0.035 : (${zones(['cheveux', 'crepu', 'tresses', 'locks', 'barbe'])}) ? 0.016 : 0.0;
  float nl0 = dot(geometryNormal, directLight.direction), nl = max(nl0, 0.0);
  if (ks > 0.0) {
    vec3 lh = normalize(directLight.direction + geometryViewDir);
    float nh = max(dot(geometryNormal, lh), 0.0);
    reflectedLight.directDiffuse += directLight.color * (ks * pow(nh, ks > 0.02 ? 18.0 : 7.0) * nl);
  }
  float w = peau ? 0.55 : 0.25, en = max(0.0, (nl0 + w) / (1.0 + w)) - nl;
  reflectedLight.directDiffuse += directLight.color * BRDF_Lambert(material.diffuseColor) * (peau ? vec3(0.72, 0.36, 0.26) : vec3(0.45)) * max(en, 0.0);
}
#endif
#if defined( RE_IndirectDiffuse )
{
  float rim = 1.0 - max(dot(geometryNormal, geometryViewDir), 0.0);
  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert(material.diffuseColor) * (rim * rim * rim * 0.7);
}
#endif`;
MAT_PERSO.onBeforeCompile = sh => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aMat;\nflat varying float vZone;')
    .replace('#include <uv_vertex>', '#include <uv_vertex>\nvZone = aMat;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nflat varying float vZone;\n' + GLSL_ZONES)
    .replace('#include <map_fragment>', GLSL_TEXEL)
    .replace('#include <color_fragment>', '')
    .replace('#include <lights_fragment_end>', GLSL_LUSTRE);
};
MAT_PERSO.customProgramCacheKey = () => 'perso';
const OMBRE_PERSO = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });

/* ---------------------------------------------------------------- pièces : forme, zone, coordonnées de texture */

const fonce = (c, k = 0.78) => assombrir(c, k);
// mélange de deux couleurs (t de 0 à 1 : la peau qui se devine sous des cheveux rasés) ; le dedans des mains foncées
const melange = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

// Finit une pièce : couleur, zone de l'atlas, coordonnées de texture. Normales : celles de la pièce (boîtes, cylindres et
// boules de modeles.js, volumes par anneaux, crâne et cheveux), sinon lissées ici (petites pièces faites à la main). La
// couleur et la zone restent sur la pièce (userData) : l'assemblage les écrit directement dans les tableaux compacts.
function finir(g, c, zone, uv) {
  if (!g.attributes.normal) lisser(g);
  g.userData.c = c; g.userData.z = zone;
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
function uvSphere(g, zone, cx, cy, cz, R, ech = 1) { // (ech : motif agrandi, des boucles plus grosses que le crépu)
  const p = g.attributes.position.array, n = p.length / 3, uv = new Float32Array(n * 2), z = ZONE[zone];
  const tours = Math.max(1, Math.round(2 * Math.PI * R / (z.tu * ech))), kv = R / (z.tv * ech);
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
// miroir : main droite), v le long de l'axe ((y - v0) x kv, par défaut en motifs ; ech : motif agrandi). Les couvercles
// prolongent le flanc.
function loft(an, n, c, zone, capBas = true, capHaut = true, o = {}) {
  const z = ZONE[zone], na = an.length, nv = ((na - 1) * 6 + ((capBas ? 1 : 0) + (capHaut ? 1 : 0)) * 3) * n;
  const P = new Float32Array(nv * 3), UV = new Float32Array(nv * 2), sn = new Float32Array(n + 1), cs = new Float32Array(n + 1), U = new Float32Array(n + 1);
  let tours = o.tours;
  if (tours === undefined) {
    let per = 0;
    for (const r of an) per += 2 * Math.PI * Math.sqrt((r[1] * r[1] + r[2] * r[2]) / 2);
    tours = z.pave ? Math.max(1, Math.round(per / na / (z.tu * (o.ech || 1)))) : 1;
  }
  const kv = o.kv ?? (z.pave ? 1 / (z.tv * (o.ech || 1)) : 1), v0 = o.v0 ?? 0;
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
// (rend la liste des morceaux)
function sangle(an, x, yAv, yAr, l, e, c, zone) {
  let yh = yAv[yAv.length - 1];
  while (yh < 0.4 && rayon(an, yh)[1] > Math.abs(x)) yh += 0.002; // le dessus de l'épaule à cette distance du milieu
  const pts = [...yAv.map(y => surLoft(an, x, y, 1, e)), [x, yh + e, rayon(an, yh)[3] || 0], ...yAr.map(y => surLoft(an, x, y, -1, e))], out = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(barre(pts[i], pts[i + 1], l, e * 1.5, c, zone, e));
  return out;
}

// Échange y et z (un loft construit le long de y devient couché le long de z : chaussures), et remet les triangles à l'endroit
function coucher(g) {
  for (const nom of ['position', 'normal']) { const p = g.attributes[nom].array; for (let i = 0; i < p.length; i += 3) { const y = p[i + 1]; p[i + 1] = p[i + 2]; p[i + 2] = y; } }
  for (const nom in g.attributes) {
    const a = g.attributes[nom].array, k = g.attributes[nom].itemSize;
    for (let f = 0; f < a.length; f += 3 * k) for (let j = 0; j < k; j++) { const t = a[f + k + j]; a[f + k + j] = a[f + 2 * k + j]; a[f + 2 * k + j] = t; }
  }
  return g;
}

// Gonfle des pièces autour de l'axe de leur os (x et z multipliés par f) : un vêtement épais par-dessus (doudoune, manteau)
function gonfler(liste, f) {
  for (const g of liste) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) { p[i] *= f; p[i + 2] *= f; } }
}
// Éclaircit le dedans des mains des peaux foncées (la paume, l'intérieur des doigts et du pouce, plus clairs) : la couleur
// des sommets dont la normale regarde vers la paume (-s x) va vers PAUME, de k au plus (fait à l'assemblage)
function paume(g, s, k) { g.userData.paume = [s, k]; return g; }

// Gabarits des boules : la sphère unité, ses sommets (U, nb) et ses triangles (T : numéros des sommets). detail : celui de
// l'icosaèdre de three.js (detail d : 20 (d + 1)² triangles) ; 'tete' : une grille en latitude et longitude, serrée sur le
// visage (yeux, nez, bouche, menton : un centimètre entre deux rangées) et lâche derrière la tête, sous les cheveux.
const GABS = new Map();
// rangées (y sur la sphère unité, du sommet au menton) et colonnes (angle depuis l'avant, en degrés)
const RANGS_TETE = [1, 0.7, 0.46, 0.3, 0.19, 0.09, 0, -0.09, -0.19, -0.29, -0.38, -0.46, -0.545, -0.59, -0.62, -0.655, -0.7, -0.76, -0.83, -0.9, -1];
const COLS_TETE = [0, 9, 18, 28, 40, 54, 72, 100, 140, 180];
function gabaritBoule(detail) {
  let G = GABS.get(detail);
  if (G) return G;
  if (detail === 'tete') {
    const cols = [...COLS_TETE.slice(1, -1).reverse().map(a => -a), ...COLS_TETE.slice(0, -1)].map(a => a * Math.PI / 180), nc = cols.length, nr = RANGS_TETE.length;
    const U = [0, 1, 0], T = [], id = (r, c) => (r === 0 ? 0 : r === nr - 1 ? 1 + (nr - 2) * nc : 1 + (r - 1) * nc + ((c % nc) + nc) % nc);
    for (let r = 1; r < nr - 1; r++) { const y = RANGS_TETE[r], s = Math.sqrt(1 - y * y); for (const a of cols) U.push(s * Math.sin(a), y, s * Math.cos(a)); }
    U.push(0, -1, 0);
    for (let c = 0; c < nc; c++) {
      T.push(id(0, c), id(1, c), id(1, c + 1));
      for (let r = 1; r < nr - 2; r++) T.push(id(r, c), id(r + 1, c), id(r + 1, c + 1), id(r, c), id(r + 1, c + 1), id(r, c + 1));
      T.push(id(nr - 2, c), id(nr - 1, c), id(nr - 2, c + 1));
    }
    G = { U: new Float32Array(U), T: new Int32Array(T), nb: U.length / 3 };
  } else {
    const p = icosa(detail).attributes.position.array, n = p.length / 3, T = new Int32Array(n), m = new Map(), U = [];
    for (let i = 0; i < n; i++) {
      const k = Math.round(p[i * 3] * 1e4) + ',' + Math.round(p[i * 3 + 1] * 1e4) + ',' + Math.round(p[i * 3 + 2] * 1e4);
      let v = m.get(k); if (v === undefined) { m.set(k, v = m.size); U.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); } T[i] = v;
    }
    G = { U: new Float32Array(U), T, nb: m.size };
  }
  GABS.set(detail, G);
  return G;
}
// Boule déformée (tête, cheveux, barbe) : f reçoit les coordonnées sur la sphère unité et renvoie un facteur de rayon.
// Là où f rentre les sommets sous la peau (facteur sous le seuil), les facettes entièrement cachées sont retirées ; cache
// (facultatif) aussi : une fonction des coordonnées qui dit qu'un sommet est caché (sous des cheveux épais). Chaque sommet
// n'est calculé qu'une fois. Renvoie la géométrie (positions et normales lissées, arêtes vives gardées au bord des cheveux).
function boule(rx, ry, rz, x, y, z, detail, f, jaw = 0, seuil = 0.999, relief = null, cache = null) {
  const { U, T, nb } = gabaritBoule(detail), Q = new Float32Array(nb * 3), garde = new Uint8Array(nb), KS = new Float32Array(nb);
  for (let i = 0; i < nb; i++) {
    let ux = U[i * 3], uy = U[i * 3 + 1], uz = U[i * 3 + 2];
    const k = KS[i] = f ? f(ux, uy, uz) : 1;
    // (une tête : le crâne moins pointu, plus large en haut qu'un ellipsoïde ; un profil en superellipse au-dessus des yeux)
    if (jaw && uy > 0.05) { const h = Math.sqrt(1 - uy * uy), e = Math.pow(1 - Math.pow(uy, 2.6), 1 / 2.6) / (h || 1); ux *= e; uz *= e; }
    garde[i] = k >= seuil && !(cache && cache(ux, uy, uz)) ? 1 : 0;
    // mâchoire plus étroite que le crâne (surtout vers le menton), menton un peu en avant
    const t = uy < 0 ? -uy : 0, kx = 1 - jaw * t * t * t, kz = 1 - jaw * 0.45 * t * t;
    Q[i * 3] = x + ux * rx * k * kx; Q[i * 3 + 1] = y + uy * ry * k;
    Q[i * 3 + 2] = z + uz * rz * k * kz + (uz > 0 ? jaw * 0.1 * t * rz + (relief ? relief(ux, uy, uz) * rz * k : 0) : 0);
  }
  let n = 0;
  for (let i = 0; i < T.length; i += 3) if (garde[T[i]] || garde[T[i + 1]] || garde[T[i + 2]]) n += 3;
  const P = new Float32Array(n * 3), I = new Int32Array(n), K = new Float32Array(n);
  for (let i = 0, o = 0; i < T.length; i += 3) if (garde[T[i]] || garde[T[i + 1]] || garde[T[i + 2]]) {
    for (let j = 0; j < 3; j++, o++) { const v = T[i + j]; I[o] = v; K[o] = KS[v]; P[o * 3] = Q[v * 3]; P[o * 3 + 1] = Q[v * 3 + 1]; P[o * 3 + 2] = Q[v * 3 + 2]; }
  }
  const g = lisser(nouvelle(P), I, nb);
  g.userData.k = K; // (le facteur de chaque sommet : l'épaisseur des cheveux)
  return g;
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
  if (o.heros || typeof o.age === 'number') return o; // (un enfant de l'école : tout est donné par ecole.js ; o.age en années)
  let h = 2166136261;
  const s = JSON.stringify(o) + '#' + (compteur++);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  const r = hasard(h), pick = a => a[Math.floor(r() * a.length)];
  const femme = o.femme ?? !!(o.fine || (!o.barbe && (['queue', 'chignon', 'long', 'carre'].includes(o.coiffure) || r() < 0.12)));
  const q = { ...o, femme };
  // (une apparence tirée par tirerApparence est complète : on n'y touche pas)
  if (femme && !o.apparence && o.coiffure !== 'chauve' && r() < 0.4) q.coiffure = pick(['long', 'carre', 'queue', 'chignon']);
  if (femme && !o.apparence && o.coiffure === 'chauve') q.coiffure = 'carre';
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
  if (!o.chapeau && !o.apparence && r() < 0.16) { q.chapeau = pick(['bonnet', 'beret', 'bonnet']); q.chapeauC = pick(['#7a2233', '#2f4a6b', '#c8553d', '#3b3b3b']); } // (décembre : plus de chapeau de paille)
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

/* ---------------------------------------------------------------- apparences : teints, cheveux, âges, silhouettes
   Teddy, 26/11/2026 : « les adultes aussi, une diversité demandée ». Une vraie palette de teints, des cheveux de toutes
   natures et de toutes couleurs, des âges (jeunes, adultes, aînés), des tailles et des corpulences, des barbes, des
   lunettes, des couvre-chefs (foulard, bonnet, béret, chapeau, casquette) et, en décembre, manteaux, doudounes et
   écharpes. tirerApparence(r, o) tire tout cela d'un coup avec le tirage au sort r ; les couleurs du haut et du bas, un
   tablier, une tenue de travail viennent de celui qui appelle. Des ensembles plausibles (teint, nature et couleur des
   cheveux, yeux), mêlés, sans caricature : un seul visage pour tous, ce sont la peau, les cheveux, l'âge et la tenue qui
   changent. */

// Les teints, du plus clair au plus foncé (sous-tons rosés, neutres, dorés). Les foncés restent chauds et assez saturés :
// l'atlas multiplie cette couleur (ombres, lèvres, sourcils, relief du visage restent lisibles, ni gris ni plats).
export const TEINTS = ['#f6dccd', '#f3d1b8', '#efc7a4', '#eabd96', '#e4b38a', '#dca97e', '#d29f78', '#c5926c', '#b78562',
  '#a87757', '#96694b', '#835a40', '#724b36', '#613e2d', '#523326', '#43291e', '#372119'];
// Les couleurs naturelles des cheveux, et celles des aînés
export const CHEVEUX = {
  noir: '#17120f', brunNoir: '#22170f', brun: '#2b1d0e', chatainFonce: '#3f2a1c', chatain: '#5e3d24', chatainClair: '#7f5a36',
  blondFonce: '#9c7a4a', blond: '#c4a26a', blondClair: '#dcc28e', roux: '#a3462a', cuivre: '#b55a32', auburn: '#6b2f1e',
  poivreSel: '#6e6a66', gris: '#9a9894', grisClair: '#b9b6b0', blanc: '#dedbd4',
};
const YEUX = { bleu: '#3d5a7a', vert: '#4c6b3f', gris: '#5e6a72', noisette: '#6b4a2a', brun: '#3b2a1e', noir: '#1f1612' };
// Ensembles plausibles : poids, teints (indices de TEINTS), nature des cheveux, leurs couleurs, les yeux, la part des
// femmes qui portent le foulard. Mêlés au hasard, sans exclusive (un foulard, des boucles, des yeux clairs partout).
const PROFILS = [
  { p: 44, t: [0, 7], nat: { lisse: 7, boucle: 2 }, ch: { chatainFonce: 3, chatain: 3, chatainClair: 2, brun: 2, blondFonce: 1.5, blond: 1.2, blondClair: 0.6, roux: 0.5, cuivre: 0.3, auburn: 0.4 },
    yeux: { bleu: 3, vert: 1.5, gris: 1, noisette: 2, brun: 3 }, foulard: 0.03 },
  { p: 16, t: [4, 11], nat: { lisse: 3, boucle: 4, crepu: 0.6 }, ch: { noir: 2, brunNoir: 3, brun: 2, chatainFonce: 1 }, yeux: { brun: 4, noisette: 2, noir: 2, vert: 0.5 }, foulard: 0.3 },
  { p: 20, t: [10, 16], nat: { crepu: 9, boucle: 1 }, ch: { noir: 3, brunNoir: 3, brun: 1 }, yeux: { brun: 3, noir: 3 }, foulard: 0.15 },
  { p: 8, t: [2, 8], nat: { lisse: 1 }, ch: { noir: 3, brunNoir: 2, brun: 0.5 }, yeux: { brun: 2, noir: 3 }, foulard: 0.02 },
  { p: 6, t: [7, 13], nat: { lisse: 3, boucle: 2 }, ch: { noir: 3, brunNoir: 2, brun: 1 }, yeux: { brun: 3, noir: 2 }, foulard: 0.15 },
  { p: 6, t: [6, 12], nat: { boucle: 3, crepu: 2 }, ch: { brunNoir: 2, brun: 2, chatainFonce: 1.5, chatain: 1 }, yeux: { brun: 3, noisette: 2, vert: 1 }, foulard: 0.06 },
];
// Les coiffures (poids) selon la nature des cheveux et l'âge ; les styles communs (court, carré, chignon, queue...)
// prennent la texture de la nature des cheveux (perso : o.nature)
const COIFFURES = {
  femme: {
    lisse: { long: 3, carre: 3, queue: 3, chignon: 2, court: 1, degrade: 0.2 },
    boucle: { boucles: 5, queue: 2, chignon: 2, carre: 1, long: 0.6 },
    crepu: { afro: 3, tresses: 4, locks: 2, crepu: 2, chignon: 2, rase: 0.3 },
  },
  homme: {
    lisse: { court: 5, degrade: 3, rase: 1, long: 0.35 },
    boucle: { court: 3, boucles: 1.5, degrade: 2 },
    crepu: { crepu: 3, degrade: 4, rase: 2, locks: 1.2, afro: 0.6, tresses: 0.5 },
  },
  aineF: { carre: 3, court: 4, chignon: 3 },
  aineH: { chauve: 4, court: 4, rase: 1.2, degrade: 0.4 },
  fille: {
    lisse: { queue: 4, long: 3, carre: 2, chignon: 1 },
    boucle: { boucles: 3, queue: 3, carre: 1 },
    crepu: { tresses: 4, chignon: 3, afro: 2, crepu: 1 },
  },
  garcon: {
    lisse: { court: 5, degrade: 2 },
    boucle: { court: 3, boucles: 2, degrade: 1 },
    crepu: { crepu: 4, degrade: 3, rase: 1 },
  },
};
// Ce qu'on met par-dessus en décembre, et les couvre-chefs, selon l'âge (poids)
const DEHORS = {
  jeune: { doudoune: 9, manteau: 3, veste: 4, pull: 3, gilet: 1 },
  adulte: { manteau: 7, doudoune: 5, veste: 4, pull: 2.4, gilet: 1.6 },
  aine: { manteau: 10, doudoune: 2.4, veste: 4, gilet: 2, pull: 1.6 },
  enfant: { doudoune: 6, manteau: 1.5, veste: 1.5, pull: 1 },
};
const COUVRE = {
  homme: { jeune: { bonnet: 0.2, casquette: 0.12 }, adulte: { bonnet: 0.12, casquette: 0.08, beret: 0.03, feutre: 0.03 }, aine: { beret: 0.18, feutre: 0.12, casquette: 0.08, bonnet: 0.06 }, enfant: { bonnet: 0.2, pompon: 0.06, casquette: 0.06 } },
  femme: { jeune: { bonnet: 0.12, pompon: 0.12 }, adulte: { bonnet: 0.1, pompon: 0.04, beret: 0.05, feutre: 0.03 }, aine: { bonnet: 0.06, beret: 0.08, feutre: 0.06 }, enfant: { pompon: 0.2, bonnet: 0.1 } },
};
const C_COUVRE = { bonnet: ['#7a2233', '#2f4a6b', '#c8553d', '#3b3b3b', '#e0b13a', '#d9d2c0', '#2f4a32'], pompon: ['#c8553d', '#e9e1cf', '#7a2233', '#2f4a6b', '#8a6a8a'],
  beret: ['#1f2a44', '#2b2b30', '#5e2530', '#3a4a3a'], feutre: ['#3a3330', '#5a4a3a', '#2b2b30', '#6b5a44'], casquette: ['#1f2a44', '#3b3b3b', '#7a2233', '#2f4a32', '#c8553d'] };
const C_MANTEAU = ['#b08850', '#26324a', '#3a3d42', '#1e1e22', '#5e2530', '#2f4a3a', '#7d7f84', '#c8b89a', '#6b4a35', '#8a2f2f'];
const C_DOUDOUNE = ['#1f2a44', '#2e3b2c', '#8e2a3b', '#e0b13a', '#c8553d', '#3c6e8f', '#111215', '#d8d4cc', '#5a6b2f', '#6a4a7a'];
const C_ECHARPE = ['#c8553d', '#7a2233', '#e0b13a', '#2f4a6b', '#d9d2c0', '#3f6b4f', '#8a6a8a', '#b5502f', '#5a5f66'];
const C_FOULARD = ['#2f3a4a', '#6b2d3a', '#d9c8b4', '#1d1d22', '#4a5a3a', '#8a6a8a', '#c26a4a', '#e8e2d8', '#3c5a7a', '#a8806a'];
const C_LUNETTES = ['#222222', '#222222', '#5a3a22', '#b89a5a', '#3a4a6a', '#7a2233', '#8a8f96'];
// un nom tiré d'après ses poids ({ nom: poids })
function selon(r, poids) {
  let s = 0, d = null;
  for (const k in poids) s += poids[k];
  let x = r() * s;
  for (const k in poids) { d = k; x -= poids[k]; if (x < 0) return k; }
  return d;
}
// Une apparence complète pour perso(), tirée avec r (une fonction qui rend un nombre de 0 à 1). o (tout est facultatif) :
//  femme (sinon tiré, une fois sur deux), age ('jeune', 'adulte', 'aine' ; sinon tiré), enfant (des coiffures d'enfant,
//  ni barbe, ni foulard, ni canne, ni cheveux gris ; taille et corpulence laissées à celui qui appelle), profil (l'indice
//  rendu pour un parent : l'enfant lui ressemble) et teint (indice dans TEINTS), hiver (dehors en décembre : manteau,
//  doudoune, écharpe, bonnet ; une doudoune et un bonnet à pompon pour beaucoup d'enfants), actif (au travail : jeune ou
//  adulte), assis (pas de manteau long), canne (permise aux aînés qui marchent), couvreChef (false : aucun), chapeau (un
//  couvre-chef voulu, s'il va avec la coiffure ; null : aucun), foulard (false : jamais ; true : toujours, pour une
//  femme).
// Rend les options de perso() (seulement celles qui sont tirées), plus age, profil et teint (indices) ; apparence: true.
export function tirerApparence(r, o = {}) {
  const pk = a => a[Math.floor(r() * a.length)], enfant = !!o.enfant;
  const femme = o.femme ?? r() < 0.5;
  const age = enfant ? 'enfant' : o.age ?? selon(r, o.actif ? { jeune: 0.4, adulte: 0.6 } : { jeune: 0.26, adulte: 0.44, aine: 0.3 });
  const aine = age === 'aine', jeune = age === 'jeune';
  let profil = o.profil;
  if (profil === undefined) { let x = r() * PROFILS.reduce((s, p) => s + p.p, 0); profil = 0; while (profil < PROFILS.length - 1 && (x -= PROFILS[profil].p) >= 0) profil++; }
  const P = PROFILS[profil];
  const teint = Math.max(0, Math.min(TEINTS.length - 1, o.teint ?? P.t[0] + Math.floor(r() * (P.t[1] - P.t[0] + 1))));
  const a = { apparence: true, femme, age, profil, teint, peau: TEINTS[teint] };
  // cheveux : nature, couleur (gris et blancs avec l'âge), coiffure
  let nature = selon(r, P.nat);
  if (aine && femme && nature === 'lisse' && r() < 0.35) nature = 'boucle'; // la mise en plis
  a.nature = nature;
  const gris = aine ? r() < 0.88 : age === 'adulte' && r() < (femme ? 0.06 : 0.16);
  a.cheveux = CHEVEUX[gris ? (aine ? selon(r, { poivreSel: 1, gris: 2, grisClair: 2, blanc: 2 }) : 'poivreSel') : selon(r, P.ch)];
  const table = enfant ? COIFFURES[femme ? 'fille' : 'garcon'][nature] : aine ? COIFFURES[femme ? 'aineF' : 'aineH'] : COIFFURES[femme ? 'femme' : 'homme'][nature];
  a.coiffure = selon(r, table);
  if ((a.coiffure === 'tresses' || a.coiffure === 'locks') && r() < (femme ? 0.45 : 0.6)) a.attache = true; // en queue, dans le dos
  a.iris = YEUX[selon(r, P.yeux)];
  a.nez = 0.92 + r() * 0.24;
  // le foulard (hijab) : les cheveux dessous ne se voient pas
  if (femme && !enfant && o.foulard !== false && (o.foulard || r() < P.foulard)) a.foulard = pk(C_FOULARD);
  // barbe, ou rasé de près, ou de quelques jours
  if (!femme && !enfant) {
    if (r() < (aine ? 0.4 : jeune ? 0.36 : 0.42)) a.barbe = selon(r, aine ? { courte: 2, pleine: 3, moustache: 2.5, bouc: 0.6 } : jeune ? { courte: 4, bouc: 3, pleine: 1.5, moustache: 0.6 } : { courte: 4, pleine: 2, bouc: 2, moustache: 1.2 });
    else a.barbe = false;
    a.malRase = !a.barbe && !aine && r() < 0.3;
  } else { a.barbe = false; a.malRase = false; }
  // lunettes
  a.lunettes = r() < (enfant ? 0.08 : aine ? 0.62 : jeune ? 0.12 : 0.28);
  if (a.lunettes) a.lunettesC = pk(C_LUNETTES);
  // silhouette : taille, corpulence (de mince à forte), épaules, hanches, ventre ; le dos un peu voûté de certains aînés
  if (!enfant) {
    const t2 = r() + r();
    a.taille = (femme ? 0.88 + t2 * 0.07 : 0.92 + t2 * 0.085) * (aine ? 0.975 : 1);
    a.corpulence = Math.min(1.34, 0.82 + Math.pow(r(), 1.5) * 0.5 + (aine ? 0.04 : jeune ? -0.03 : 0));
    a.epaules = femme ? 0.86 + r() * 0.1 : 0.96 + r() * 0.14;
    a.hanches = femme ? 1.0 + r() * 0.16 : 0.96 + r() * 0.06;
    if (!femme && !jeune && a.corpulence > 1.05 && r() < 0.45) a.ventre = 0.01 + r() * 0.03;
    if (aine && r() < 0.65) a.voute = 0.4 + r() * 0.6;
    if (aine && o.canne && r() < 0.45) a.canne = pk(['#4a3424', '#2a2420', '#6b4a30', '#8a8f96']);
  }
  // chaussures : baskets blanches de certains jeunes, cuir des aînés
  if (jeune && r() < 0.28) a.chaussures = pk(['#e8e6e0', '#d9d6cf']);
  else if (aine && r() < 0.6) a.chaussures = pk(['#4a3424', '#2a2420', '#3b2a20']);
  // dehors en décembre : ce qu'on met par-dessus, l'écharpe, le bonnet
  if (o.hiver) {
    let t = selon(r, DEHORS[age]);
    if (o.assis && t === 'manteau') t = r() < 0.5 ? 'doudoune' : 'veste';
    if (t === 'manteau') a.haut = pk(C_MANTEAU);
    if (t === 'doudoune') { a.haut = pk(C_DOUDOUNE); a.matelasse = true; }
    a.tenue = t;
    if (!a.foulard && r() < (t === 'manteau' ? 0.6 : t === 'doudoune' ? 0.35 : 0.4)) { a.echarpe = pk(C_ECHARPE); a.echarpeZ = pk([Z.maille, Z.cotes, Z.carreaux]); }
  }
  // couvre-chef : dehors seulement, et pas sur une coiffure qui dépasserait (afro, boucles, chignon, tresses attachées)
  const libre = !a.foulard && !['afro', 'boucles', 'chignon'].includes(a.coiffure) && !(a.attache && a.coiffure === 'tresses');
  if (o.chapeau !== undefined) { if (o.chapeau && libre) { a.chapeau = o.chapeau; a.chapeauC = pk(C_COUVRE[o.chapeau] || C_COUVRE.casquette); } } // imposé (null : aucun)
  else if (o.hiver && o.couvreChef !== false && libre) {
    const c = COUVRE[femme ? 'femme' : 'homme'][age];
    let x = r();
    for (const k in c) { x -= c[k]; if (x < 0) { a.chapeau = k; a.chapeauC = pk(C_COUVRE[k]); break; } }
  }
  for (const k in a) if (a[k] === undefined) delete a[k];
  return a;
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

/* ---------------------------------------------------------------- la cigarette (anim.js : p.fume)
   Créée à la première bouffée, enfant de l'os de la main droite : tenue entre l'index et le majeur, le filtre du côté de la
   paume (vers la bouche quand on la porte aux lèvres), le bout allumé de l'autre côté. Le bout est de la matière des
   fenêtres allumées du décor (modeles.js, T.allumee) : il rougeoie, davantage la nuit ; pas de nouvelle matière.
   Repère de la main : FILTRE (le bout du filtre) et BOUT (le bout allumé). Géométrie partagée par tous. */
export const CIG = { pos: [0.004, -0.104, 0.018], filtre: [0.034, -0.104, 0.018], bout: [-0.05, -0.104, 0.018] };
let geoCig = null;
export function cigarette(m) {
  if (m.cig) return m.cig;
  if (!geoCig) geoCig = fusion([C(0.0042, 0.0042, 0.056, 6, '#f2efe8', -0.019, 0, 0, 'x'), C(0.0043, 0.0043, 0.02, 6, '#d08a44', 0.019, 0, 0, 'x'),
    C(0.0039, 0.0039, 0.003, 6, '#8a8580', -0.0485, 0, 0, 'x'), teinter(C(0.0041, 0.0041, 0.0035, 6, '#ff5a1e', -0.0525, 0, 0, 'x'), '#ff5a1e', TM.allumee)]);
  const x = new THREE.Mesh(geoCig, MAT);
  x.castShadow = false; x.visible = false; x.position.set(CIG.pos[0], CIG.pos[1], CIG.pos[2]);
  m.os[OS.mainD].add(x);
  return (m.cig = x);
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

/* ---------------------------------------------------------------- mains
   La main (repère de l'os : y vers le bout des doigts en descendant, la paume vers -s x, le pouce devant, vers +z) : la
   paume, quatre doigts et le pouce, chacun un tube de trois phalanges, détendus : un peu fléchis vers la paume, un peu
   écartés, l'index le plus droit, l'auriculaire le plus fléchi. Une seule pose pour tout (pendante, au volant, sur le
   clavier, autour du téléphone ou du verre) : la main est rigide. Coordonnées de texture (atlas : main) : u autour (le dos
   du côté sin > 0), v de 0 (poignet) à 0,5 (jointures) sur la paume, de 0,5 à 1 (le bout) sur chaque doigt. */
const DOIGTS = [ // [z de la base, longueurs des phalanges, rayon, flexion des trois jointures, écart]
  [0.026, [0.039, 0.024, 0.02], 0.0092, [0.2, 0.38, 0.24], 0.04], [0.0085, [0.044, 0.028, 0.021], 0.0096, [0.24, 0.42, 0.26], 0.0],
  [-0.0085, [0.041, 0.026, 0.02], 0.0091, [0.28, 0.46, 0.28], -0.035], [-0.0245, [0.032, 0.02, 0.018], 0.008, [0.32, 0.5, 0.3], -0.09]];
const V3 = (x, y, z) => [x, y, z], ajoute = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norme = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const vect = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scal = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// Tube le long d'une ligne brisée : pts, rayons R ([vers le dos, de côté] par point), n côtés ; dos : le côté de l'ongle,
// lat : l'axe de côté ; un bout arrondi au-delà du dernier anneau ; u autour (sin > 0 : le dos), v de v0 à v1 le long
function tube(pts, R, n, dos, lat, c, zone, v0, v1) {
  const m = pts.length, A = [], C = [];
  let long = 0; const Lc = [0];
  for (let i = 1; i < m; i++) Lc.push(long += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  let t = [0, -1, 0];
  for (let i = 0; i < m; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)];
    t = norme([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    let e2 = norme(ajoute(lat, t, -scal(lat, t))), e1 = vect(e2, t);
    if (scal(e1, dos) < 0) e1 = [-e1[0], -e1[1], -e1[2]];
    const anneau = [];
    for (let j = 0; j <= n; j++) { const an = Math.PI / n + j * 2 * Math.PI / n; anneau.push(ajoute(ajoute(pts[i], e1, Math.sin(an) * R[i][0]), e2, Math.cos(an) * R[i][1])); }
    A.push(anneau); C.push(pts[i]);
  }
  const bout = ajoute(pts[m - 1], t, R[m - 1][1] * 0.85), P = [], UV = [], vl = i => v0 + (v1 - v0) * Lc[i] / (long + R[m - 1][1] * 0.85);
  const tri = (a, b, c2, ua, ub, uc, ctr) => {
    const nn = vect([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c2[0] - a[0], c2[1] - a[1], c2[2] - a[2]]);
    if (scal(nn, [a[0] - ctr[0], a[1] - ctr[1], a[2] - ctr[2]]) < 0) { [b, c2] = [c2, b]; [ub, uc] = [uc, ub]; }
    P.push(...a, ...b, ...c2); UV.push(...ua, ...ub, ...uc);
  };
  for (let i = 0; i < m - 1; i++) for (let j = 0; j < n; j++) {
    const ctr = [(C[i][0] + C[i + 1][0]) / 2, (C[i][1] + C[i + 1][1]) / 2, (C[i][2] + C[i + 1][2]) / 2];
    tri(A[i][j], A[i][j + 1], A[i + 1][j + 1], [j / n, vl(i)], [(j + 1) / n, vl(i)], [(j + 1) / n, vl(i + 1)], ctr);
    tri(A[i][j], A[i + 1][j + 1], A[i + 1][j], [j / n, vl(i)], [(j + 1) / n, vl(i + 1)], [j / n, vl(i + 1)], ctr);
  }
  for (let j = 0; j < n; j++) tri(A[m - 1][j], A[m - 1][j + 1], bout, [j / n, vl(m - 1)], [(j + 1) / n, vl(m - 1)], [(j + 0.5) / n, v1], C[m - 1]);
  return finir(nouvelle(P), c, zone, new Float32Array(UV));
}
function main(s, kh, c) {
  const L = [], dos = [s, 0, 0], lat = [0, 0, 1];
  // la paume : du poignet aux jointures, plus large et plus plate vers les doigts
  L.push(loft([[-0.086 * kh, 0.0135 * kh, 0.041 * kh, 0.002, -s * 0.0015], [-0.045 * kh, 0.0162 * kh, 0.04 * kh, 0.003], [0, 0.0168 * kh, 0.029 * kh, 0.004]], 8, c, Z.main, true, false, { kv: 0.5 / (0.086 * kh), v0: -0.086 * kh, miroir: s < 0 }));
  // (u de la paume : de 0 à 1 autour, v de 0 aux jointures à 0,5 au poignet : retourné pour aller du poignet aux doigts)
  { const uv = L[0].attributes.uv.array; for (let i = 1; i < uv.length; i += 2) uv[i] = 0.5 - uv[i]; }
  for (const [z0, lg, r, fl, ec] of DOIGTS) {
    // la flexion tourne vers la paume (-s x), l'écart vers z
    let d = norme([0, -Math.cos(ec), Math.sin(ec)]), p = [-s * 0.0025 * kh, -0.082 * kh, z0 * kh], ang = 0;
    const pts = [p], R = [[r * 0.82 * kh, r * kh]];
    for (let k = 0; k < 3; k++) {
      ang += fl[k];
      const dk = norme([-s * Math.sin(ang), d[1] * Math.cos(ang), d[2] * Math.cos(ang)]);
      p = ajoute(p, dk, lg[k] * kh); pts.push(p); R.push([r * (0.8 - 0.07 * k) * kh, r * (0.95 - 0.08 * k) * kh]);
    }
    L.push(tube(pts, R, 6, dos, lat, c, Z.main, 0.5, 1));
  }
  // le pouce : de la base de la paume, côté de l'index, vers l'avant et vers la paume ; deux phalanges
  {
    const b = [-s * 0.008 * kh, -0.024 * kh, 0.022 * kh], d0 = norme([-s * 0.26, -0.84, 0.46]), d1 = norme([-s * 0.32, -0.9, 0.22]), d2 = norme([-s * 0.36, -0.93, 0.05]);
    const p1 = ajoute(b, d0, 0.032 * kh), p2 = ajoute(p1, d1, 0.028 * kh), p3 = ajoute(p2, d2, 0.023 * kh);
    L.push(tube([b, p1, p2, p3], [[0.013 * kh, 0.015 * kh], [0.0112 * kh, 0.0122 * kh], [0.0098 * kh, 0.0106 * kh], [0.009 * kh, 0.0096 * kh]], 6, norme([s * 0.6, 0.1, 0.8]), norme([-s * 0.7, 0, 0.7]), c, Z.pouce, 0, 1));
  }
  return L;
}

/* ---------------------------------------------------------------- assemblage
   Les pièces de chaque os (dépliées : trois sommets par triangle) sont écrites directement dans les tableaux compacts que
   lit la carte graphique : position, normale (3 octets), couleur (3 octets), zone de l'atlas (1 octet), coordonnées
   de texture (16 bits : uv / UVK), os et poids (4 + 4 octets). Les sommets identiques d'une même pièce (même position,
   même normale, mêmes coordonnées de texture) ne sont gardés qu'une fois (table de hachage) : la géométrie est indexée,
   chaque sommet n'est calculé (et déformé par les os) qu'une fois. Sans fusion intermédiaire ni recopie : la création d'un
   personnage coûte moitié moins. */
let TH = new Int32Array(0), TS = new Int32Array(0), MARQUE = 0; // table de hachage : numéro du sommet, pièce qui l'a écrit
const OCTETS = new Map(), PAUME = [180, 122, 102];
// (les couleurs se calculent en octets sRGB ; la carte graphique les reçoit linéaires, comme celles du chien, même matière)
const LIN = Uint8Array.from({ length: 256 }, (_, i) => { const c = i / 255; return Math.round(255 * (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))); });
// une couleur en octets sRGB
function octets(c) {
  let o = OCTETS.get(c);
  if (!o) { const h = typeof c === 'string' && c.length === 7 && c[0] === '#' ? parseInt(c.slice(1), 16) : new THREE.Color(c ?? '#808080').getHex(); o = [(h >> 16) & 255, (h >> 8) & 255, h & 255]; OCTETS.set(c, o); }
  return o;
}
function assembler(G, W, kj, ka) {
  let nv = 0, max = 0;
  for (const L of G) for (const g of L) { const n = g.attributes.position.count; nv += n; if (n > max) max = n; }
  let taille = 64; while (taille < max * 2) taille <<= 1;
  if (TH.length < taille) { TH = new Int32Array(taille); TS = new Int32Array(taille); MARQUE = 0; }
  const masque = taille - 1, kuv = 32767 / UVK;
  const POS = new Float32Array(nv * 3), QP = new Int32Array(nv * 3), NOR = new Int8Array(nv * 3), UVQ = new Int16Array(nv * 2), COL = new Uint8Array(nv * 3), ZON = new Uint8Array(nv);
  const SI = new Uint8Array(nv * 4), SW = new Uint8Array(nv * 4), IDX = new Uint32Array(nv);
  let nu = 0, ni = 0;
  const q16 = v => { v *= kuv; return v >= 32767 ? 32767 : v <= -32767 ? -32767 : Math.round(v); }, q8 = v => Math.round((v > 1 ? 1 : v < -1 ? -1 : v) * 127);
  for (let i = 0; i < G.length; i++) {
    if (!G[i].length) continue;
    const wx = W[i][0], wy = W[i][1], wz = W[i][2];
    // (les seuils des jointures, pour des membres de longueur d'adulte : ceux d'un enfant, plus courts, sont ramenés)
    const ky = i >= OS.cuisseG && i !== OS.piedG && i < OS.piedD ? kj : i === OS.brasG || i === OS.coudeG || i === OS.brasD || i === OS.coudeD ? ka : 1;
    for (const g of G[i]) {
      MARQUE++;
      const p = g.attributes.position.array, n = g.attributes.normal.array, u = g.attributes.uv.array, cnt = p.length / 3;
      const c0 = octets(g.userData.c), zone = g.userData.z, cs = g.userData.cs, pm = g.userData.paume;
      for (let k = 0; k < cnt; k++) {
        const x = p[k * 3] + wx, y = p[k * 3 + 1] + wy, z = p[k * 3 + 2] + wz;
        const qx = Math.round(x * 1e5), qy = Math.round(y * 1e5), qz = Math.round(z * 1e5);
        const nx = q8(n[k * 3]), ny = q8(n[k * 3 + 1]), nz = q8(n[k * 3 + 2]), uu = q16(u[k * 2]), vv = q16(u[k * 2 + 1]);
        let h = Math.imul(qx, 73856093) ^ Math.imul(qy, 19349663) ^ Math.imul(qz, 83492791) ^ Math.imul((nx & 255) | (ny & 255) << 8 | (nz & 255) << 16, 0x2c1b3c6d) ^ Math.imul((uu & 65535) | vv << 16, 0x5bd1e995);
        h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h &= masque;
        let j = -1;
        while (TS[h] === MARQUE) {
          const e = TH[h];
          if (QP[e * 3] === qx && QP[e * 3 + 1] === qy && QP[e * 3 + 2] === qz && NOR[e * 3] === nx && NOR[e * 3 + 1] === ny && NOR[e * 3 + 2] === nz && UVQ[e * 2] === uu && UVQ[e * 2 + 1] === vv) { j = e; break; }
          h = (h + 1) & masque;
        }
        if (j < 0) {
          j = nu++; TS[h] = MARQUE; TH[h] = j;
          POS[j * 3] = x; POS[j * 3 + 1] = y; POS[j * 3 + 2] = z; QP[j * 3] = qx; QP[j * 3 + 1] = qy; QP[j * 3 + 2] = qz;
          NOR[j * 3] = nx; NOR[j * 3 + 1] = ny; NOR[j * 3 + 2] = nz; UVQ[j * 2] = uu; UVQ[j * 2 + 1] = vv; ZON[j] = zone;
          let r = c0[0], gg = c0[1], b = c0[2];
          if (cs) { r = cs[k * 3]; gg = cs[k * 3 + 1]; b = cs[k * 3 + 2]; }
          if (pm) { const w = pm[1] * Math.max(0, Math.min(1, (-pm[0] * n[k * 3] - 0.35) * 2)); r += (PAUME[0] - r) * w; gg += (PAUME[1] - gg) * w; b += (PAUME[2] - b) * w; }
          COL[j * 3] = LIN[(r + 0.5) | 0]; COL[j * 3 + 1] = LIN[(gg + 0.5) | 0]; COL[j * 3 + 2] = LIN[(b + 0.5) | 0];
          const l = liens(i, x - wx, (y - wy) / ky), w = l ? Math.round(l[1] * 255) : 0;
          SI[j * 4] = i; SW[j * 4] = 255 - w;
          if (w) { SI[j * 4 + 1] = l[0]; SW[j * 4 + 1] = w; }
        }
        IDX[ni++] = j;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(POS.slice(0, nu * 3), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(NOR.slice(0, nu * 3), 3, true));
  geo.setAttribute('color', new THREE.BufferAttribute(COL.slice(0, nu * 3), 3, true));
  geo.setAttribute('aMat', new THREE.BufferAttribute(ZON.slice(0, nu), 1));
  geo.setAttribute('uv', new THREE.BufferAttribute(UVQ.slice(0, nu * 2), 2, true));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(SI.slice(0, nu * 4), 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(SW.slice(0, nu * 4), 4, true));
  geo.setIndex(new THREE.BufferAttribute(nu < 65536 ? Uint16Array.from(IDX.subarray(0, ni)) : IDX.slice(0, ni), 1));
  return geo;
}

/* ---------------------------------------------------------------- le personnage */

// Tête (repère de l'os de la tête) : centre du crâne en (0, YC, ZC), demi-axes RX, RY, RZ. Proportions d'adulte :
// 17,6 cm de large, 24 cm du menton au sommet, yeux à mi-hauteur.
const YC = 0.2, ZC = 0.017, RX = 0.088, RY = 0.12, RZ = 0.108;
const TETE = 1.06; // la tête et ce qu'elle porte, un peu plus grandes que leur modèle : des proportions moins « poupée »

// Relief du visage (sphère unité : x vers sa gauche, y vers le haut, z vers l'avant ; yeux à y = 0, x = 0,36 ; bouche à
// y = -0,62) : une avancée vers l'avant, en unités du demi-axe z, sur la face avant seulement. Le front qui fuit, les
// arcades (marquées chez l'homme), la racine du nez, les orbites un peu creusées sous l'arcade, les pommettes, les joues
// (creusées chez l'homme), le museau (l'arcade des dents), les deux lèvres et la fente de la bouche, le creux sous la
// lèvre, le menton. La grille de la tête (gabarit 'tete') a ses rangées sur ces traits. Le crâne, les cheveux, la barbe
// et ce qu'on pose sur le visage (yeux, paupières, sourcils, nez) suivent le même relief : rien ne flotte ni ne s'enfonce.
const cloche = (d, s) => Math.exp(-(d * d) / (s * s));
function reliefVisage(femme, enfant) {
  const ka = femme ? 0.62 : 1, ke = enfant ? 0.55 : 1;
  return (x, y, z) => {
    if (z <= 0) return 0;
    const ax = Math.abs(x), avant = Math.min(1, z * 1.6);
    const d = 0.05 * cloche(ax, 0.3) * cloche(y + 0.2, 0.62)                        // l'axe du visage, en avant des côtés
      + 0.04 * ka * ke * cloche(y - 0.23, 0.075) * cloche(ax - 0.2, 0.34)           // arcades
      + 0.022 * ke * cloche(y - 0.13, 0.08) * cloche(x, 0.13)                       // glabelle, racine du nez
      - 0.03 * cloche(y - 0.02, 0.1) * cloche(ax - 0.37, 0.15)                      // orbites
      + 0.05 * cloche(y + 0.21, 0.12) * cloche(ax - 0.55, 0.16)                     // pommettes
      - (femme ? 0.008 : 0.024) * cloche(y + 0.48, 0.12) * cloche(ax - 0.62, 0.13)  // joues sous les pommettes
      + 0.045 * cloche(y + 0.6, 0.15) * cloche(x, 0.34)                             // le museau
      + 0.02 * cloche(y + 0.585, 0.035) * cloche(x, 0.2)                            // lèvre du haut
      - 0.014 * cloche(y + 0.62, 0.018) * cloche(x, 0.2)                            // la fente de la bouche
      + (femme ? 0.028 : 0.024) * cloche(y + 0.66, 0.032) * cloche(x, 0.18)         // lèvre du bas
      - 0.018 * cloche(y + 0.73, 0.04) * cloche(x, 0.2)                             // le creux sous la lèvre
      + 0.055 * cloche(y + 0.85, 0.09) * cloche(x, 0.26)                            // menton
      - 0.015 * cloche(y - 0.55, 0.15) * cloche(x, 0.6);                            // front qui fuit un peu
    return d * avant;
  };
}

// Oreille (côté s : 1 gauche, -1 droite) posée sur le côté de la tête (demi-largeur rx), centrée en (yb, zb), à l'échelle
// k : le pavillon, une coquille tournée vers l'extérieur, plus détachée de la tête derrière que devant ; l'ourlet (hélix)
// en bourrelet sur le bord du haut et de l'arrière, l'anthélix en relief, la conque creusée au milieu (plus sombre), le
// lobe en bas ; devant, collée à la joue. Anneaux autour de la conque : [part du contour, relief (m), assombri].
const OREILLE = [[0.4, -0.001, 0.8], [0.66, 0.0032, 1], [0.84, 0.0016, 0.93], [1, 0.0036, 1]];
function oreille(s, c, rx, yb, zb, k) {
  const N = 10, H = 0.031 * k, L = 0.0175 * k, cp = octets(c), P = [], F = [], D = [];
  // u vers l'arrière, v vers le haut, n vers l'extérieur ; a : 0 en haut, puis vers l'arrière, le bas, l'avant
  const pt = (r, a, dn) => {
    const ca = Math.cos(a), sa = Math.sin(a), lobe = ca < 0 ? 1 - 0.3 * ca * ca : 1, devant = sa < 0;
    const u = sa * L * r * lobe * (devant ? 0.6 : 1), v = ca * H * r * (ca < 0 ? 0.92 : 1);
    const n = 0.002 + 0.6 * Math.max(0, u) + dn * k * (devant ? 0.3 : 1) * (ca < -0.75 ? 0.5 : 1);
    return [s * (rx + n), yb + v, zb - u];
  };
  const A = OREILLE.map(([r, d]) => Array.from({ length: N }, (_, j) => pt(r, (j + 0.5) / N * 2 * Math.PI, d))), O = pt(0, 0, -0.0035);
  const ext = [s, 0, 0];
  const tri = (a, b, c, fa, fb, fc, dir) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    if ((uy * vz - uz * vy) * dir[0] + (uz * vx - ux * vz) * dir[1] + (ux * vy - uy * vx) * dir[2] < 0) { [b, c] = [c, b]; [fb, fc] = [fc, fb]; }
    P.push(...a, ...b, ...c); F.push(fa, fb, fc);
  };
  for (let j = 0; j < N; j++) {
    const i = (j + 1) % N;
    tri(O, A[0][j], A[0][i], 0.62, OREILLE[0][2], OREILLE[0][2], ext);
    for (let r = 0; r < A.length - 1; r++) { const f0 = OREILLE[r][2], f1 = OREILLE[r + 1][2]; tri(A[r][j], A[r][i], A[r + 1][i], f0, f0, f1, ext); tri(A[r][j], A[r + 1][i], A[r + 1][j], f0, f1, f1, ext); }
    // le dos du pavillon, du bord jusqu'à la tête
    const b0 = A[A.length - 1][j], b1 = A[A.length - 1][i], t0 = [s * (rx - 0.003), b0[1] * 0.85 + yb * 0.15, b0[2] * 0.85 + zb * 0.15], t1 = [s * (rx - 0.003), b1[1] * 0.85 + yb * 0.15, b1[2] * 0.85 + zb * 0.15];
    const dir = [-0.3 * s, (b0[1] + b1[1]) / 2 - yb, (b0[2] + b1[2]) / 2 - zb];
    tri(b0, b1, t1, 0.85, 0.85, 0.75, dir); tri(b0, t1, t0, 0.85, 0.75, 0.75, dir);
  }
  const g = nouvelle(P), cs = new Uint8Array(F.length * 3);
  for (let i = 0; i < F.length; i++) for (let j = 0; j < 3; j++) cs[i * 3 + j] = cp[j] * F[i];
  g.userData.cs = cs;
  return finir(g, c, Z.peau, uvBoite(g, Z.peau));
}

// Renvoie { groupe, maillage, os, dim, ... } : groupe est l'objet à ajouter à la scène (ou au tracteur). Options nouvelles
// (27/11/2026) : casque (vrai, ou sa couleur : le casque-micro de bureau, par-dessus la coiffure), badge (vrai, ou la
// couleur du cordon). Rend aussi paupieres (le clignement : pas de queue de cheval) et mecheZ (anim.js).
export function perso(o0) {
  if (!MAT_PERSO.map) { MAT_PERSO.map = texturePersos(); MAT_PERSO.map.repeat.set(UVK, UVK); }
  const o = completer(o0);
  const peau = o.peau || TEINTS[5], ch = o.cheveux || '#2b1d0e', haut = o.haut || '#5a6b7a', bas = o.bas || '#2c3e50', chau = o.chaussures || '#2a2420';
  const femme = !!(o.femme || o.fine);
  // un enfant (proportionsEnfant) : jambes (kj), tête (kt), bras (ka), l'os de la tête plus bas (dyT) ; rj : des jambes
  // un peu plus fines qu'à leur longueur
  const PE = typeof o.age === 'number' ? proportionsEnfant(o.age) : null, kj = PE ? PE.kj : 1, kt = PE ? PE.kt : 1, ka = PE ? PE.ka : 1, rj = Math.sqrt(kj);
  const K = o.corpulence ?? 1, E = (o.epaules ?? 1) * (0.93 + 0.07 * K), H = (o.hanches ?? 1) * (0.95 + 0.05 * K);
  // (manteau, doudoune : une veste, longue en laine ou gonflée ; tenue0 garde ce qu'elle est)
  const tenue0 = o.tenue || 'veste', tenue = tenue0 === 'manteau' || tenue0 === 'doudoune' ? 'veste' : tenue0;
  const jupe = tenue === 'robe' || tenue === 'jupe';
  const manche = tenue === 'gilet' ? (o.manches || '#e9e1cf') : haut;
  const avantBras = tenue === 'chemise' || tenue === 'robe' ? peau : manche;
  const jambe = jupe ? (o.collant || '#2e2a2c') : bas;
  const ventre = Math.max(0, K - 1) * 0.09 + (o.ventre || 0);
  const cou = PE ? 0.043 : femme ? 0.053 : 0.061 * (0.8 + 0.2 * K), kCol = 0.4 + 0.6 * cou / 0.061; // rayon du cou ; taille des cols
  // matières (zones de l'atlas)
  const zChemise = o.carreaux && !o.tablier ? Z.carreaux : Z.chemise;
  const zHaut = tenue0 === 'manteau' ? Z.feutre : tenue0 === 'doudoune' ? Z.matelasse : { veste: o.matelasse ? Z.matelasse : Z.toile, gilet: o.matelasse ? Z.matelasse : Z.toile, pull: Z.maille, chemise: zChemise, salopette: zChemise, jupe: zChemise, robe: o.imprime ? Z.imprime : Z.chemise }[tenue] ?? Z.toile;
  const zManche = tenue === 'gilet' ? (o.heros ? Z.maille : Z.chemise) : zHaut;
  const zBas = { jean: Z.jean, velours: Z.velours }[o.tissuBas] ?? Z.toile;
  const zJupe = tenue === 'robe' ? zHaut : (o.imprime ? Z.imprime : Z.toile);
  const zJambe = jupe ? Z.chemise : zBas;
  const zOurlet = tenue === 'pull' || (tenue === 'veste' && o.matelasse) ? Z.cotes : Z.toile;

  // positions des os au repos (relatives au parent)
  const xe = 0.178 * E, xh = 0.09 * H;
  const L1 = DIM.cuisse * kj, L2 = DIM.tibia * kj, LB = DIM.bras * ka, LA = DIM.avantBras * ka, yB = DIM.cheville + L1 + L2 - DIM.yHanche;
  const aQueue = o.coiffure === 'queue' || (!!o.attache && !o.foulard);
  const P = [
    [0, yB, 0], [0, 0.07, 0], [0, 0.2, 0], [0, 0.275 - (PE ? PE.dyT : 0), 0.016],
    [xe, DIM.yEpaule, -0.01], [0, -LB, 0], [0, -LA, 0],
    [-xe, DIM.yEpaule, -0.01], [0, -LB, 0], [0, -LA, 0],
    [xh, DIM.yHanche, 0], [0, -L1, 0], [0, -L2, 0],
    [-xh, DIM.yHanche, 0], [0, -L1, 0], [0, -L2, 0],
    PE ? [0, 0.12, -0.19] : [0, -0.07, 0], aQueue ? [0, 0.205, -0.1] : [0, YC + OEIL.h * 0.52, ZC + 0.07], // (un enfant : son cartable, sur le dos ; sans queue de cheval, l'os de la mèche porte les paupières : le clignement)
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
  // les poches de derrière du pantalon (piqûres : l'atlas), un peu tournées pour suivre les fesses
  if (!jupe && tenue0 !== 'manteau') for (const sg of [1, -1]) { const q = surLoft(anB, sg * 0.068 * H * K, -0.075, -1, 0.002); add(0, boite(0.068, 0.072, 0.006, fonce(bas, 0.86), Z.poche, q[0], q[1], q[2], -0.08, -sg * 0.32, 0)); }
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
    if (tenue0 !== 'manteau') add(1, boite(0.012, 0.31, 0.01, '#1d1d22', Z.fermeture, 0, 0.055, avant(anV, 0.055) + 0.003)); // (le manteau se boutonne)
    add(1,
      boite(0.085, 0.07, 0.012, ourlet, Z.poche, 0.085 * K, 0.0, avant(anV, 0.0) - 0.012, 0, 0.32), boite(0.085, 0.07, 0.012, ourlet, Z.poche, -0.085 * K, 0.0, avant(anV, 0.0) - 0.012, 0, -0.32));
    if (tenue0 !== 'manteau') add(2, boite(0.012, 0.25, 0.01, '#1d1d22', Z.fermeture, 0, 0.1, avant(anP, 0.1) + 0.003), boite(0.07, 0.06, 0.012, ourlet, Z.poche, 0.075, 0.14, avant(anP, 0.14) - 0.006, 0, 0.3));
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
    // (les pointes : deux triangles minces, de part et d'autre de l'ouverture, rabattus sur la poitrine)
    add(2, col(anCol, cc0, Z.chemise, kCol));
    for (const sg of [1, -1]) {
      const A = surCol(anCol, kCol, sg * 0.007, 0.036, 0.003), Bp = surCol(anCol, kCol, sg * 0.04, 0.028, 0.003), Cp = surLoft(anP, sg * 0.036, 0.268, 1, 0.005);
      const d = (q, e) => [q[0], q[1], q[2] - e], Pp = [...A, ...Bp, ...Cp, ...d(A, 0.002), ...d(Cp, 0.002), ...d(Bp, 0.002)];
      const g = surVisage(Pp, new Array(12).fill(0), 0, 0.15, -0.05);
      add(2, finir(g, cc0, Z.chemise, uvBoite(g, Z.chemise)));
    }
    for (let i = 0; i < 3; i++) add(2, boite(0.012, 0.012, 0.006, '#ece6da', Z.uni, 0, 0.2 - i * 0.075, avant(anP, 0.2 - i * 0.075) + 0.003));
  } else if (tenue === 'robe') {
    add(1, bande(anV, -0.03, 0.0, 1.03, fonce(haut, 0.6), Z.toile, NT));
    add(2, col([[-0.02, 0.092, 0.088, 0.004], [0, 0.086, 0.081, 0], [0.012, 0.084, 0.079, -0.002]], fonce(haut, 0.85), Z.toile, kCol)); // encolure
  }
  if (tenue === 'salopette') {
    // bavette et bretelles
    add(1, boite(0.2 * K, 0.24, 0.016, bas, zBas, 0, 0.09, avant(anV, 0.09) + 0.004));
    add(2, boite(0.19 * K, 0.1, 0.016, bas, zBas, 0, 0.03, avant(anP, 0.03) + 0.006), boite(0.035, 0.016, 0.02, '#c9a55a', Z.uni, 0.07, 0.07, avant(anP, 0.07) + 0.012), boite(0.035, 0.016, 0.02, '#c9a55a', Z.uni, -0.07, 0.07, avant(anP, 0.07) + 0.012));
    for (const s of [1, -1]) add(2, ...sangle(anP, s * 0.092, [0.07, 0.17, 0.24, 0.28], [0.28, 0.2, 0.1, 0.0], 0.035, 0.008, bas, zBas));
  }
  if (o.tablier) {
    const t = o.tablier;
    add(0, boite(0.33 * H * K, 0.5, 0.012, t, Z.toile, 0, -0.18, avant(anB, 0.0) + 0.03, -0.08));
    add(1, boite(0.25 * K, 0.22, 0.012, t, Z.toile, 0, 0.08, avant(anV, 0.08) + 0.006));
    add(2, boite(0.22 * K, 0.16, 0.012, t, Z.toile, 0, 0.06, avant(anP, 0.06) + 0.008));
    for (const s of [1, -1]) add(2, ...sangle(anP, s * 0.074, [0.13, 0.22, 0.28, 0.31], [0.3], 0.014, 0.006, fonce(t), Z.toile));
  }
  // Manteau de laine et doudoune, par-dessus (décembre) : le buste et les manches gonflés de f (le drap, le duvet), le
  // manteau qui descend au-dessus du genou (comme une jupe, il suit un peu les jambes), boutonné, ses revers ; la
  // doudoune et sa capuche roulée dans le dos
  const f = tenue0 === 'doudoune' ? 1.085 : tenue0 === 'manteau' ? 1.03 : 1;
  if (f > 1) for (const i of [1, 2]) gonfler(G[i], f);
  if (tenue0 === 'manteau') {
    const hb = -0.42;
    add(0, loft([[hb, 0.215 * H * K, 0.19 * K, 0.014], [-0.2, 0.2 * H * K, 0.155 * K, 0.006], [0.0, 0.18 * H * K, 0.13 * K + ventre * 0.3], [0.08, 0.172 * K, 0.124 * K + ventre * 0.3]], 14, haut, Z.feutre, false, true),
      loft([[hb - 0.002, 0.219 * H * K, 0.194 * K, 0.014], [hb + 0.022, 0.216 * H * K, 0.191 * K, 0.014]], 14, fonce(haut, 0.82), Z.feutre, false, false),
      barre([0.012, hb + 0.024, 0.014 + 0.19 * K + 0.004], [0.012, -0.03, 0.135 * K + 0.004], 0.012, 0.006, fonce(haut, 0.7), Z.feutre)); // le bord du pan de devant
    for (const y of [0.0, 0.1]) add(1, boite(0.018, 0.018, 0.008, '#2a2420', Z.uni, 0.03, y, avant(anV, y) * f + 0.004));
    for (const y of [0.05, 0.15]) add(2, boite(0.018, 0.018, 0.008, '#2a2420', Z.uni, 0.03, y, avant(anP, y) * f + 0.004));
    const anCol = [[-0.025, 0.096, 0.092, 0.004], [0, 0.09, 0.084, 0], [0.058, 0.082, 0.077, -0.016]];
    if (!o.foulard) for (const s of [1, -1]) add(2, barre(surCol(anCol, kCol * f, s * 0.03, 0.02, 0.004), surLoft(anP, s * 0.07, 0.17, 1, 0.006 + avant(anP, 0.17) * (f - 1)), 0.05, 0.007, fonce(haut, 0.9), Z.feutre));
  }
  if (tenue0 === 'doudoune') add(2, loft([[0.25, 0.085, 0.045, -0.115 * f], [0.31, 0.096, 0.06, -0.106 * f], [0.36, 0.074, 0.048, -0.09 * f]], 10, haut, Z.matelasse));

  /* tête : cou, crâne, visage (projeté de face), yeux et paupières, sourcils, nez, oreilles, cheveux, couvre-chef */
  const T = 3, yc = YC, zc = ZC, rx = RX, ry = RY, rz = RZ, jaw = femme || PE ? 0.36 : 0.24;
  // surface du visage (sans ses facettes) : z en (x, y), y compté depuis le centre du crâne
  const relief = reliefVisage(femme, !!PE);
  const surface = (x, y) => {
    const uy = y / ry, t = uy < 0 ? -uy : 0, kx = 1 - jaw * t * t * t, kz = 1 - jaw * 0.45 * t * t;
    const e = uy > 0.05 ? Math.pow(1 - Math.pow(uy, 2.6), 1 / 2.6) / Math.sqrt(1 - uy * uy) : 1, ux = x / (rx * kx * e), r2 = 1 - ux * ux - uy * uy;
    const uz = r2 > 0 ? Math.sqrt(r2) : 0;
    return zc + uz * e * rz * kz + jaw * 0.1 * t * rz + relief(ux * e, uy, uz * e) * rz;
  };
  // cou : une colonne épaisse, un peu penchée vers l'avant, qui sort des trapèzes ; la nuque remonte jusqu'à l'occiput
  // (elle cache le bas du crâne), la gorge rejoint le dessous de la mâchoire ; la pomme d'Adam d'un homme
  add(T, loft([[-0.07, cou * 1.3, cou * 1.12, -0.03], [-0.01, cou * 1.08, cou * 1.0, -0.02], [0.05, cou * 1.0, cou * (femme || PE ? 1.0 : 1.05), -0.01 + (femme || PE ? 0 : 0.003)], [0.11, cou * 0.98, cou * 1.06, -0.002], [0.155, cou * 0.92, cou * 0.95, -0.01]], 12, peau, Z.peau));
  const zVisage = femme ? Z.visageF : (o.malRase || (o.barbe && o.barbe !== 'moustache' && o.barbe !== 'bouc')) ? Z.visageB : Z.visageH;
  // Yeux. Le globe (blanc, iris, pupille, reflet : l'atlas ; la couleur de l'iris est celle des sommets), bombé, un peu
  // plus grand que la fente : son bord passe sous les paupières. Les paupières : un bourrelet autour de la fente, épais en
  // haut (le pli), mince en bas, qui rejoint la peau ; le trait des cils, le pli, l'ombre sous l'arcade sont peints sur
  // elles (atlas : visages, même projection que le visage). Contour de la fente : OEIL (atlas.js), en largeurs et hauteurs
  // d'œil : coin intérieur, le haut jusqu'au coin extérieur, puis le bas.
  {
    const contour = [...OEIL.haut, ...OEIL.bas.slice(1, -1).reverse()], nc = contour.length, nH = OEIL.haut.length, w = OEIL.w / 2, h = OEIL.h;
    for (const s of [1, -1]) {
      const ex = s * 0.0315, pos = (a, b, e) => { const x = ex + s * a * w, y = b * h; return [x, yc + y, surface(x, y) + e]; };
      // le globe : un centre, un anneau à mi-chemin, le contour agrandi de 12 % (qui plonge sous les paupières)
      const Pt = [], Uv = [], c0 = [0, 0.03];
      const sommet = (a, b, r) => { Pt.push(...pos(a, b, 0.0011 + 0.0016 * (1 - r * r))); Uv.push((a / OEIL.a + 1) / 2, 0.5 - b / (2 * OEIL.b)); };
      for (let i = 0; i < nc; i++) {
        const p = contour[i], q = contour[(i + 1) % nc], m = (P, k) => [c0[0] + (P[0] - c0[0]) * k, c0[1] + (P[1] - c0[1]) * k];
        const p1 = m(p, 0.55), q1 = m(q, 0.55), p2 = m(p, 1.12), q2 = m(q, 1.12);
        sommet(...c0, 0); sommet(...p1, 0.55); sommet(...q1, 0.55);
        sommet(...p1, 0.55); sommet(...p2, 1.12); sommet(...q2, 1.12); sommet(...p1, 0.55); sommet(...q2, 1.12); sommet(...q1, 0.55);
      }
      add(T, finir(surVisage(Pt, Uv, 0, yc, zc - 0.05), o.iris || '#3b2a1e', s > 0 ? Z.oeilG : Z.oeilD, new Float32Array(Uv)));
      // les paupières : le bord de la fente, le bourrelet, la peau (trois anneaux) ; les coins s'étirent vers l'extérieur
      const an = k => contour.map(([a, b], i) => {
        const coin = i === 0 || i === nH - 1, hautP = i < nH, c = 1 - a * a;
        if (k === 0) return pos(a, b, coin ? 0.0011 : hautP ? 0.0013 + 0.0013 * c : 0.0011 + 0.0005 * c);
        if (k === 1) return coin ? pos(a * 1.2, b, 0.0011) : hautP ? pos(a * 1.04, b + 0.2 + 0.12 * c, 0.0016 + 0.0013 * c) : pos(a * 1.04, b - 0.12, 0.0009 + 0.0003 * c);
        return coin ? pos(a * 1.42, b + 0.04, 0.0004) : hautP ? pos(a * 1.12, b + 0.48 + 0.14 * c, 0.0004) : pos(a * 1.1, b - 0.32, 0.0004);
      });
      const A = [an(0), an(1), an(2)], Pp = [];
      for (let k = 0; k < 2; k++) for (let i = 0; i < nc; i++) { const j = (i + 1) % nc; Pp.push(...A[k][i], ...A[k][j], ...A[k + 1][j], ...A[k][i], ...A[k + 1][j], ...A[k + 1][i]); }
      const g = surVisage(Pp, new Array(Pp.length / 3 * 2).fill(0), 0, yc, zc - 0.05);
      add(T, finir(g, peau, zVisage, uvVisage(g, yc)));
      // les paupières fermées (sur l'os de la mèche, en son repère) : un dôme de peau sur le globe ; ouvertes, l'os les
      // écrase dans le pli (anim.js : cligner)
      if (!aQueue) {
        const Pf = [], o17 = P[17], ferme = (a, b, r) => { const q = pos(a, b, 0.0018 + 0.0016 * (1 - r * r)); Pf.push(q[0] - o17[0], q[1] - o17[1], q[2] - o17[2]); };
        for (let i = 0; i < nc; i++) { const p = contour[i], q = contour[(i + 1) % nc]; ferme(...c0, 0); ferme(p[0] * 1.03, p[1] * 1.03, 1); ferme(q[0] * 1.03, q[1] * 1.03, 1); }
        const gf = surVisage(Pf, new Array(Pf.length / 3 * 2).fill(0), 0, yc - o17[1], zc - 0.05 - o17[2]);
        { const q = gf.attributes.position.array; for (let i = 0; i < q.length; i += 3) { q[i] += o17[0]; q[i + 1] += o17[1]; q[i + 2] += o17[2]; } finir(gf, peau, zVisage, uvVisage(gf, yc)); for (let i = 0; i < q.length; i += 3) { q[i] -= o17[0]; q[i + 1] -= o17[1]; q[i + 2] -= o17[2]; } }
        add(17, gf);
      }
    }
  }
  // sourcils : une bande bombée posée sur l'arcade, couleur des cheveux un peu plus sombre, poils dans le sens du sourcil ;
  // plus épais et plus droits chez un homme, plus fins et arqués chez une femme ; la tête du sourcil (près du nez) plus
  // large que la queue
  {
    const arc = femme ? [[0.011, 0.0185, 0.0021], [0.022, 0.0245, 0.0024], [0.034, 0.0278, 0.002], [0.046, 0.0262, 0.0014], [0.056, 0.0205, 0.0007]]
      : [[0.01, 0.0185, 0.003], [0.021, 0.0232, 0.0033], [0.033, 0.0252, 0.003], [0.045, 0.0246, 0.0022], [0.056, 0.0195, 0.001]];
    const zs = ZONE[Z.cheveux], n = arc.length;
    for (const s of [1, -1]) {
      const Pt = [], Uv = [];
      const sommet = (k, e) => { const [x0, y0, ep] = arc[k], x = s * x0, y = y0 + e * ep; Pt.push(x, yc + y, surface(x, y) + 0.0009 + 0.0007 * (1 - e * e)); Uv.push((e + 1) * ep / zs.tu, k * 0.012 / zs.tv); };
      for (let k = 0; k < n - 1; k++) for (const [e0, e1] of [[-1, 0], [0, 1]]) { sommet(k, e0); sommet(k + 1, e0); sommet(k + 1, e1); sommet(k, e0); sommet(k + 1, e1); sommet(k, e1); }
      add(T, finir(surVisage(Pt, Uv, 0, yc, zc - 0.05), fonce(ch, 0.9), Z.cheveux, new Float32Array(Uv)));
    }
  }
  // Nez : la racine entre les yeux, l'arête, le bout arrondi, les ailes qui s'évasent, le dessous (narines peintes), posé
  // sur le visage ; même projection que le visage. Rangées du haut vers le bas : [y, demi-largeur, saillie au milieu,
  // saillie des bords, ailes] ; section arrondie (sept colonnes).
  {
    const R = [[0.022, 0.0072, 0.0006, -0.0012, 0], [0.008, 0.0075, 0.0035, -0.001, 0], [-0.008, 0.008, 0.0078, -0.0008, 0], [-0.022, 0.0092, 0.0125, 0, 0],
      [-0.032, 0.0118, 0.0172, 0.0022, 0.0015], [-0.0395, 0.0158, 0.0178, 0.003, 0.0032], [-0.0455, 0.015, 0.0115, 0.0012, 0.002], [-0.0495, 0.0085, 0.0012, -0.0012, 0]]
      .map(([y, l, a, b, e]) => (PE ? [y * 0.9, l * 0.84, a * 0.72, b * 0.7, e * 0.7] : [y, l, a, b, e])); // (un enfant : un petit nez)
    if (o.nez) for (let k = 3; k < R.length; k++) R[k][1] *= o.nez; // un nez plus ou moins large (le bout, les ailes)
    const CO = [-1, -0.7, -0.38, 0, 0.38, 0.7, 1], Pt = [];
    const q = (k, c) => { const [y, l, dm, db, e] = R[k], x = c * l, cc = 1 - c * c; Pt.push(x, yc + y, surface(x, y) + db + (dm - db) * cc * (1.25 - 0.25 * cc) + e * cloche(Math.abs(c) - 0.8, 0.28)); };
    for (let k = 0; k < R.length - 1; k++) for (let i = 0; i < CO.length - 1; i++) { const a = CO[i], b = CO[i + 1]; q(k, a); q(k, b); q(k + 1, b); q(k, a); q(k + 1, b); q(k + 1, a); }
    const g = surVisage(Pt, new Array(Pt.length / 3 * 2).fill(0), 0, yc, zc - 0.03);
    add(T, finir(g, peau, zVisage, uvVisage(g, yc)));
  }
  // oreilles : du sourcil au bas du nez, juste derrière le milieu de la tête
  for (const s of [1, -1]) add(T, oreille(s, peau, rx, yc - 0.012, zc - 0.016, PE ? 0.9 : femme ? 0.92 : 1));
  // cheveux : la forme du crâne agrandie de k. Un champ dit où il y en a (positif dedans, en unités de la sphère) :
  // l'épaisseur monte de zéro à k sur une bande de largeur w, et rentre sous la peau au-dehors. La lisière (épaisseur
  // nulle) suit ainsi une courbe douce au lieu des arêtes des facettes ; les facettes enfouies sont retirées. Même boule
  // que le crâne, agrandie depuis le même centre : la lisière est la courbe où l'épaisseur s'annule, sans festons. Là où
  // les cheveux sont clairsemés (la lisière), leur couleur se fond dans celle de la peau : pas de casque. Chaque couche
  // est notée (couches) : le crâne caché dessous n'est pas dessiné.
  const coif = o.coiffure, voile = !!o.foulard, couches = [], epaisseurs = [];
  // la nature des cheveux donne leur texture et leur volume : lisses (mèches), bouclés (le motif crépu agrandi), crépus
  const zCh = o.nature === 'crepu' || o.nature === 'boucle' ? Z.crepu : Z.cheveux, eCh = o.nature === 'boucle' ? 2.3 : 1, kN = zCh === Z.crepu ? 0.035 : 0;
  const rampe = (k, d, w) => 1 + (k - 1) * Math.max(-1.6, Math.min(1, d / w));
  const cP = octets(peau), CHEVEUX_Z = [Z.cheveux, Z.crepu, Z.tresses, Z.locks];
  // (w : largeur de la bande où l'épaisseur monte ; detail : finesse de la boule ; ech : motif agrandi)
  // (vol : l'épaisseur sur le dessus de la tête, en plus : des cheveux qui ont du volume, pas une calotte d'épaisseur égale)
  const cheveux = (k, champ, sx = 1, sy = 1, sz = 1, dy = 0, c = ch, zone = zCh, w = 0.09, detail = 4, ech = zone === zCh ? eCh : 1, vol = 0) => {
    const ep = (x, y, z) => rampe(vol ? 1 + (k - 1) * (1 + vol * (y > 0 ? y * y : 0)) : k, champ(x, y, z), w);
    const g = boule(rx * k * sx, ry * k * sy, rz * k * sz, 0, yc + dy, zc, detail, (x, y, z) => ep(x, y, z) / k, jaw, 0.975 / k, relief);
    const seuil = Math.min(1.035, 1 + 0.6 * (k - 1)); // (sous une coupe rasée, mince, le crâne est caché aussi)
    couches.push((x, y, z) => ep(x, y, z) >= seuil); epaisseurs.push(ep);
    if (CHEVEUX_Z.includes(zone)) {
      // la lisière : de la peau aux cheveux sur le premier tiers de l'épaisseur
      const K = g.userData.k, cc = octets(c), cs = new Uint8Array(K.length * 3);
      for (let i = 0; i < K.length; i++) { const t = entre(0.05, 0.42, (K[i] * k - 1) / (k - 1)); for (let j = 0; j < 3; j++) cs[i * 3 + j] = cP[j] + (cc[j] - cP[j]) * t; }
      g.userData.cs = cs;
    }
    return finir(g, c, zone, uvSphere(g, zone, 0, yc + dy, zc, rx * k, ech));
  };
  const nuque = z => 0.2 * Math.min(1, Math.max(0, -z * 2.5)); // les cheveux descendent plus bas derrière, jusqu'à la nuque
  // Le point de la tête dans la direction (ux, uy, uz) de la sphère unité, agrandi de f : la même forme que boule
  const pointTete = (ux, uy, uz, f) => {
    if (uy > 0.05) { const e = Math.pow(1 - Math.pow(uy, 2.6), 1 / 2.6) / Math.sqrt(1 - uy * uy); ux *= e; uz *= e; }
    const t = uy < 0 ? -uy : 0, kx = 1 - jaw * t * t * t, kz = 1 - jaw * 0.45 * t * t;
    return [ux * rx * f * kx, yc + uy * ry * f, zc + uz * rz * f * kz + (uz > 0 ? jaw * 0.1 * t * rz + relief(ux, uy, uz) * rz * f : 0)];
  };
  // Des mèches (cheveux lisses) : des cartes effilées posées sur la lisière d'une couche (champ, épaisseur k), qui en
  // cassent la ligne droite : la frange, les tempes, la nuque. De l'angle a0 à a1 (0 : devant, en degrés), n mèches, qui
  // descendent de L sous la lisière (unités de la sphère), larges de l (radians) ; leur longueur et leur angle varient.
  const meches = (champ, k, a0, a1, n, L, l = 0.17) => {
    const Pm = [], Um = [], zs = ZONE[Z.cheveux];
    for (let i = 0; i < n; i++) {
      const a = (a0 + (a1 - a0) * (i + 0.5) / n) * Math.PI / 180 + 0.04 * Math.sin(i * 7.3), va = ((i * 0.618) % 1);
      const d = (yy, da = 0) => { const h = Math.sqrt(Math.max(0, 1 - yy * yy)); return [h * Math.sin(a + da), yy, h * Math.cos(a + da)]; };
      let y = 0.97; while (y > -0.7 && champ(...d(y)) > 0) y -= 0.015;
      if (y >= 0.95 || y <= -0.7) continue;
      const yr = y + 0.09, yp = y - L * (0.7 + 0.6 * va), ym = (yr + yp) / 2, dv = 0.05 * Math.sin(i * 3.1);
      const P = (yy, da, f) => pointTete(...d(yy, da), f);
      // (la pointe : émoussée, une mèche, pas une dent)
      const rl = P(yr, -l / 2, k * 0.985), rr = P(yr, l / 2, k * 0.985), ml = P(ym, -l * 0.36 + dv, 1 + (k - 1) * 0.6), mr = P(ym, l * 0.36 + dv, 1 + (k - 1) * 0.6);
      const tl = P(yp, -l * 0.3 + dv * 1.6, 1.016 + 0.002 * (i % 2)), tr = P(yp, l * 0.3 + dv * 1.6, 1.016 + 0.002 * (i % 2));
      Pm.push(...rl, ...rr, ...mr, ...rl, ...mr, ...ml, ...ml, ...mr, ...tr, ...ml, ...tr, ...tl);
      const u1 = l * rx / zs.tu, v1 = (yr - yp) * ry / zs.tv;
      Um.push(0, 0, u1, 0, u1 * 0.86, v1 / 2, 0, 0, u1 * 0.86, v1 / 2, u1 * 0.14, v1 / 2, u1 * 0.14, v1 / 2, u1 * 0.86, v1 / 2, u1 * 0.66, v1, u1 * 0.14, v1 / 2, u1 * 0.66, v1, u1 * 0.34, v1);
    }
    if (!Pm.length) return;
    // normales : celles de la tête (les mèches sont éclairées comme les cheveux) ; la pointe se fond un peu dans la peau
    const g = surVisage(Pm, Um, 0, yc, zc), q = g.attributes.position.array, N = new Float32Array(q.length), cs = new Uint8Array(q.length), cc = octets(ch);
    for (let i = 0; i < q.length; i += 3) {
      const nx = q[i] / (rx * rx), ny = (q[i + 1] - yc) / (ry * ry), nz = (q[i + 2] - zc) / (rz * rz), ln = Math.hypot(nx, ny, nz);
      N[i] = nx / ln; N[i + 1] = ny / ln; N[i + 2] = nz / ln;
    }
    const uvs = g.attributes.position.count;
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    finir(g, ch, Z.cheveux, new Float32Array(Um));
    const U2 = g.attributes.uv.array, vmax = Math.max(...Array.from({ length: uvs }, (_, i) => U2[i * 2 + 1]));
    for (let i = 0; i < uvs; i++) { const t = 0.35 * entre(0.4, 1, U2[i * 2 + 1] / vmax); for (let j = 0; j < 3; j++) cs[i * 3 + j] = cc[j] + (cP[j] - cc[j]) * t; }
    g.userData.cs = cs;
    add(T, g);
  };
  // (une frange pour une personne aux cheveux longs sur deux : d'après ses couleurs, sans rien tirer au sort)
  const lisses = zCh === Z.cheveux, frange = ((octets(ch)[0] + 3 * octets(peau)[1] + (o.iris ? octets(o.iris)[2] : 0)) & 1) === 0;
  // (la lisière du front remonte aux tempes)
  const court = (x, y, z) => Math.max(y - 0.5 - 0.1 * cloche(Math.abs(x) - 0.45, 0.17), Math.min(0.25 - z, y + 0.42 + nuque(z)), Math.min(Math.abs(x) - 0.82, y + 0.1, 0.5 - z));
  // ce qui tombe dans le dos (tresses, locks, boucles), derrière la nuque, jusqu'à « bas » sous le centre du crâne ; l : sa
  // largeur
  const dos = (bas, zone, ech, l = 1) => loft([[yc - bas, 0.086 * l, 0.03, zc - 0.135], [yc - 0.17, 0.095 * l, 0.04, zc - 0.112], [yc - 0.05, 0.092 * l, 0.054, zc - 0.07],
    [yc + 0.03, 0.074, 0.05, zc - 0.05]], 8, ch, zone, true, false, { ech });
  // en queue (os de la mèche, qui balance) : l'attache, puis la queue (e : plus épaisse, L : plus longue)
  const queue = (zone, ech, e = 1, L = 0.27) => add(17, loft([[-0.025, 0.034 * e, 0.034 * e, -0.012], [0.005, 0.034 * e, 0.034 * e, -0.012]], 8, '#8e2a3b', Z.toile),
    loft([[-L, 0.012 * e, 0.012 * e, -0.05], [-L * 0.66, 0.034 * e, 0.03 * e, -0.035], [-0.06, 0.044 * e, 0.04 * e, -0.02], [0.0, 0.036 * e, 0.034 * e, -0.01]], 7, ch, zone, true, true, { ech }));
  if (voile) {
    // Le foulard (hijab) : il couvre la tête, les oreilles et le cou, et encadre le visage (un ovale du front au menton) ;
    // drapé sur la poitrine et le haut du dos (sur l'os de la poitrine : la tête tourne dedans). Les cheveux sont dessous.
    const fc = o.foulard, zf = Z.chemise;
    add(T, cheveux(1.11, (x, y, z) => Math.max(Math.hypot(x / 0.6, (y + 0.2) / 0.74) - 1, 0.28 - z) * 0.7, 1.02, 1.03, 1.02, 0.006, fc, zf, 0.08));
    // (le pan tombe sur les épaules et le haut de la poitrine, plus bas devant que derrière)
    add(2, loft([[0.13, 0.198 * E * K, 0.13 * K + buste * 0.9, 0.012], [0.2, 0.2 * E * K, 0.126 * K + buste * 0.5, 0.004], [0.255, 0.188 * E, 0.112, -0.006], [0.3, 0.15 * E, 0.096, -0.014],
      [0.345, 0.088, 0.078, -0.02], [0.4, 0.07, 0.07, -0.016]].map(([y, a, b, d]) => [y, a * f, b * f, d * f]), NT, fc, zf, true, false));
    add(2, loft([[0.07, 0.11 * E * K, 0.05, 0.1 * K + buste * 1.6], [0.14, 0.15 * E * K, 0.05, 0.095 * K + buste]].map(([y, a, b, d]) => [y, a * f, b, d * f]), NT, fc, zf, true, false));
  } else if (coif === 'chauve') add(T, cheveux(1.045, (x, y, z) => Math.min(0.25 - y, y + 0.5 + nuque(z) * 0.6, 0.3 - z)));
  else if (coif === 'carre') {
    const cc0 = (x, y, z) => Math.max(y - 0.42, Math.min(0.02 - z, y + 0.62));
    add(T, cheveux(1.06 + kN, cc0, 1, 1, 1, 0, ch, zCh, 0.09, 4, eCh, 0.9), cheveux(1.1 + kN, (x, y, z) => Math.min(-0.08 - z, y + 0.62, 0.6 - y), 1, 1, 1, -0.012));
    if (lisses && frange) meches(cc0, 1.06, -70, 70, 11, 0.11, 0.34);
  }
  else if (coif === 'long') {
    { const cl = (x, y, z) => Math.max(y - 0.42, Math.min(0.02 - z, y + 0.6)); add(T, cheveux(1.06 + kN, cl, 1, 1, 1, 0, ch, zCh, 0.09, 4, eCh, 0.9)); if (lisses && frange) meches(cl, 1.06, -70, 70, 11, 0.12, 0.34); }
    // longueur qui tombe dans le dos, en mèches
    add(T, loft([[yc - 0.3, 0.085, 0.032, zc - 0.085], [yc - 0.17, 0.092, 0.042, zc - 0.078], [yc - 0.05, 0.088, 0.055, zc - 0.058], [yc + 0.03, 0.07, 0.05, zc - 0.045]], 8, ch, zCh, true, false, { ech: eCh }));
  } else if (coif === 'afro') {
    // l'afro : une boule de cheveux crépus autour de la tête, plus large que haute, le front dégagé (une boule plus fine)
    add(T, cheveux(1.52, (x, y, z) => Math.max(y - 0.46, Math.min(0.3 - z, y + 0.42 + nuque(z)), Math.min(Math.abs(x) - 0.78, y + 0.12, 0.52 - z)), 1.06, 1.0, 1.02, 0.03, ch, Z.crepu, 0.34, 4, 1));
  } else if (coif === 'boucles') {
    // boucles jusqu'à la mâchoire, du volume, et des boucles dans la nuque
    add(T, cheveux(1.2 + kN * 0.5, (x, y, z) => Math.max(y - 0.44, Math.min(0.18 - z, y + 0.78), Math.min(Math.abs(x) - 0.74, y + 0.5, 0.42 - z)), 1.04, 1, 1.02, 0, ch, zCh, 0.2));
    add(T, dos(0.22, zCh, eCh, 1.12));
  } else if (coif === 'degrade') {
    // coupe à blanc sur les côtés : du volume sur le dessus ; les côtés et la nuque rasés de près (la peau se devine)
    add(T, cheveux(1.07 + kN, (x, y, z) => Math.min(court(x, y, z), y - 0.2 - 0.36 * Math.max(0, z - 0.2))), cheveux(1.022, court, 1, 1, 1, 0, melange(ch, peau, 0.45), Z.barbe, 0.09, 3));
  } else if (coif === 'rase') add(T, cheveux(1.012, court, 1, 1, 1, 0, melange(ch, peau, 0.55), Z.barbe, 0.09, 3)); // rasé : une ombre
  else if (coif === 'tresses' || coif === 'locks') {
    // tresses (box braids) ou locks : du sommet vers la nuque ; en queue dans le dos, ou qui tombent dans le dos (les locks
    // aussi de chaque côté, derrière les oreilles)
    const zt = coif === 'tresses' ? Z.tresses : Z.locks, lk = coif === 'locks';
    add(T, cheveux(lk ? 1.075 : 1.055, court, 1, 1, 1, 0, ch, zt));
    if (o.attache) queue(zt, 1, lk ? 1.35 : 1.25, lk ? 0.36 : 0.44);
    else {
      add(T, dos(lk ? 0.32 : 0.46, zt, 1, lk ? 1.12 : 1.06));
      if (lk) for (const s of [1, -1]) add(T, loft([[yc - 0.21, 0.024, 0.03, zc - 0.035, s * 0.084], [yc - 0.06, 0.028, 0.04, zc - 0.032, s * 0.09], [yc + 0.0, 0.026, 0.04, zc - 0.03, s * 0.088]], 6, ch, zt, true, false));
    }
  } else {
    // court, crépu court, chignon, queue
    const kc = coif === 'court' ? 1.05 + kN : 1.06 + kN;
    add(T, cheveux(kc, court, 1, 1, 1, 0, ch, zCh, 0.09, 4, eCh, coif === 'court' ? 1.3 : 0.8));
  }
  if (!voile && coif === 'chignon') { const g = S(0.052 + kN * 0.4, ch, 0, yc + 0.07, zc - 0.105, 1, 0.9, 1, 1); add(T, finir(g, ch, zCh, uvSphere(g, zCh, 0, yc + 0.07, zc - 0.105, 0.052, eCh))); }
  if (!voile && coif === 'queue') queue(zCh, eCh);
  // Coiffures d'enfant (l'école, Teddy, 26/11/2026 : « les enfants divers ») : ce qui dépasse de la coupe courte posée
  // plus haut. Couettes (deux touffes nouées sur les côtés), nattes (deux tresses derrière les oreilles) ; les tresses, les
  // cheveux crépus en boule et les boucles sont ceux de tout le monde, plus haut. Portées par l'os de la tête. el : la
  // couleur des élastiques.
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
  }
  // Barbe courte. Du favori, juste devant l'oreille, la ligne des joues descend en courbe jusqu'aux commissures ; la
  // moustache sous le nez ; la bouche dégagée (les lèvres se voient) ; rien derrière l'oreille (avant : une cagoule). Bord irrégulier, comme
  // des poils ; mince sur les joues, du volume au menton. Le visage « B » (barbe de quelques jours) est dessous : le bord
  // se fond dans l'ombre de barbe.
  if (o.barbe) {
    // (o.barbe : true ou 'courte' ; 'pleine', plus épaisse et plus haut sur les joues ; 'bouc', la moustache et le menton ;
    // 'moustache' seule)
    const sb = o.barbe === true ? 'courte' : o.barbe, pleine = sb === 'pleine';
    const haut = ax => (ax >= 0.9 ? -0.04 : ax >= 0.6 ? -0.37 + (ax - 0.6) / 0.3 * 0.33 : ax >= 0.32 ? -0.47 + (ax - 0.32) / 0.28 * 0.1 : -0.425);
    const champ = (x, y, z) => {
      const ax = Math.abs(x), poils = 0.022 * Math.sin(x * 23 + y * 7) + 0.016 * Math.sin(y * 31 - x * 9);
      // devant, sous la ligne, hors de la bouche (une ellipse autour des lèvres, de -0,56 à -0,70)
      // vers l'arrière : jusqu'au plan de l'oreille en haut, jusqu'à l'angle de la mâchoire (sous l'oreille) en bas
      const bouche = Math.max((Math.hypot(ax / 0.31, (y + 0.635) / 0.1) - 1) * 0.1, 0.3 - z);
      if (sb === 'moustache') return Math.min(0.3 - ax, y + 0.545 + 0.3 * Math.max(0, ax - 0.2), -0.41 - y, z - 0.3, bouche); // sous le nez, au-dessus de la lèvre
      const c = Math.min(haut(ax) + poils - (pleine ? 0.05 : 0) - y, z + 0.05 + 0.22 * lisse((-0.3 - y) / 0.4), bouche);
      return sb === 'bouc' ? Math.min(c, 0.27 - ax + 0.5 * Math.max(0, -0.8 - y)) : c; // le bouc : le milieu seulement
    };
    const KB = pleine ? 1.08 : 1.065, epais = sb === 'moustache' ? () => 1.03 // épaisse au menton
      : (y, z) => (pleine ? 1.024 : 1.016) + (pleine ? 0.085 : 0.045) * lisse((-0.74 - y) / 0.2) * lisse((z - 0.1) / 0.4);
    const g = boule(rx * KB, ry * KB, rz * KB, 0, yc, zc, 'tete', (x, y, z) => rampe(epais(y, z), champ(x, y, z), 0.05) / KB, jaw, 0.985 / KB, relief);
    couches.push((x, y, z) => rampe(epais(y, z), champ(x, y, z), 0.05) >= 1.01); // (la peau sous la barbe n'est pas dessinée)
    add(T, finir(g, fonce(ch, 1.12), Z.barbe, uvSphere(g, Z.barbe, 0, yc, zc, rx))); // un peu plus claire que les cheveux
  }
  // lunettes : montures seules (les yeux restent visibles)
  if (o.lunettes) {
    const zl = surface(0.0315, 0) + 0.012, m = o.lunettesC || '#222';
    // la face (cercles, pont), puis la charnière qui rejoint la tempe et la branche qui longe la tête jusqu'à l'oreille
    const ch0 = [0.071, yc + 0.011, surface(0.071, 0.011) + 0.005];
    for (const s of [1, -1]) add(T, boite(0.05, 0.005, 0.005, m, Z.uni, s * 0.0315, yc + 0.013, zl), boite(0.05, 0.004, 0.005, m, Z.uni, s * 0.0315, yc - 0.013, zl),
      boite(0.004, 0.03, 0.005, m, Z.uni, s * 0.057, yc, zl), boite(0.004, 0.026, 0.005, m, Z.uni, s * 0.006, yc, zl + 0.001),
      barre([s * 0.056, yc + 0.011, zl - 0.002], [s * ch0[0], ch0[1], ch0[2]], 0.005, 0.005, m, Z.uni, 0.002),
      barre([s * ch0[0], ch0[1], ch0[2]], [s * 0.095, yc + 0.01, zc + 0.03], 0.004, 0.005, m, Z.uni, 0.002),
      barre([s * 0.095, yc + 0.01, zc + 0.03], [s * 0.094, yc + 0.004, zc - 0.022], 0.004, 0.005, m, Z.uni, 0.002));
  }
  // Le casque-micro de bureau (o.casque : vrai, ou sa couleur ; Solumatic) : l'arceau par-dessus les cheveux (il suit la
  // coiffure : posé sur le dessus de la couche la plus épaisse), deux oreillettes et leurs coussinets, la perche du micro
  // qui part de l'oreillette gauche et vient devant la bouche, la mousse du micro
  if (o.casque) {
    const kc = o.casque === true ? '#2b2d31' : o.casque, mousse = '#3a3d44', zA = zc - 0.012;
    // la surface (cheveux compris) dans la direction (x, y, z) de la sphère unité, à e de plus
    const dessus = (x, y, z, e) => {
      const l = Math.hypot(x, y, z), ux = x / l, uy = y / l, uz = z / l;
      let k = 1; for (const f of epaisseurs) k = Math.max(k, f(ux, uy, uz));
      const sp = uy > 0.05 ? Math.pow(1 - Math.pow(uy, 2.6), 1 / 2.6) / Math.sqrt(1 - uy * uy) : 1, px = ux * sp * rx * k, py = uy * ry * k, pz = uz * sp * rz * k, m = 1 + e / Math.hypot(px, py, pz);
      return [px * m, yc + py * m, zc + pz * m];
    };
    const arc = [];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + Math.PI * i / 8; arc.push(dessus(Math.sin(a), Math.cos(a) + 0.02, -0.12, 0.006)); }
    const cote = s => { const p0 = dessus(s, -0.08, -0.12, 0.004); return Math.max(Math.abs(p0[0]), rx + 0.008); };
    // les bouts de l'arceau descendent jusqu'au haut des oreillettes
    for (const [i, s] of [[0, -1], [8, 1]]) arc[i] = [s * (cote(s) + 0.013), Math.min(arc[i][1], yc + 0.02), arc[i][2]];
    for (let i = 0; i < 8; i++) add(T, barre(arc[i], arc[i + 1], 0.02, 0.006, kc, Z.uni, 0.003));
    for (const s of [1, -1]) {
      const x = s * (cote(s) + 0.012);
      add(T, habiller(C(0.031, 0.031, 0.017, 10, kc, x, yc - 0.014, zA, 'x'), kc, Z.uni), habiller(C(0.034, 0.034, 0.01, 10, mousse, x - s * 0.012, yc - 0.014, zA, 'x'), mousse, Z.uni),
        habiller(C(0.019, 0.019, 0.004, 8, '#55595f', x + s * 0.01, yc - 0.014, zA, 'x'), '#55595f', Z.uni));
    }
    // la perche : de l'oreillette gauche, le long de la joue, jusque devant le coin de la bouche
    const xg = cote(1) + 0.02, pb = [0.028, yc - 0.074, surface(0.028, -0.074) + 0.018];
    const pts = [[xg, yc - 0.02, zA + 0.012], [xg - 0.004, yc - 0.05, zA + 0.05], [rx * 0.82, yc - 0.07, surface(rx * 0.7, -0.07) + 0.012], pb];
    for (let i = 0; i < 3; i++) add(T, barre(pts[i], pts[i + 1], 0.0055, 0.0055, kc, Z.uni, 0.002));
    add(T, boulette(0.009, mousse, Z.crepu, pb[0] - 0.004, pb[1], pb[2], 1.3, 1, 1, 1));
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
  if (o.chapeau === 'bonnet' || o.chapeau === 'pompon') add(T, cheveux(1.1, (x, y) => y - 0.18, 1, 1.12, 1, 0.012, cc, Z.cotes), loft([[yc, rx * 1.12, rz * 1.1, zc], [yc + 0.045, rx * 1.1, rz * 1.08, zc]], 10, fonce(cc, 0.8), Z.cotes, false, false));
  if (o.chapeau === 'pompon') add(T, boulette(0.036, o.pomponC || '#ece6da', Z.crepu, 0, yc + 0.166, zc - 0.004, 1, 0.9, 1, 1)); // le pompon, en laine bouclée
  if (o.chapeau === 'feutre') {
    // le chapeau de feutre des aînés : la calotte pincée au sommet, le ruban, le bord
    const zh = zc - 0.006;
    add(T, loft([[yc + 0.04, rx * 1.14, rz * 1.1, zh], [yc + 0.1, rx * 1.1, rz * 1.04, zh], [yc + 0.135, rx * 0.98, rz * 0.9, zh - 0.004], [yc + 0.148, rx * 0.7, rz * 0.6, zh - 0.006]], 12, cc, Z.feutre),
      loft([[yc + 0.046, rx * 1.152, rz * 1.112, zh], [yc + 0.068, rx * 1.15, rz * 1.11, zh]], 12, fonce(cc, 0.5), Z.toile, false, false),
      loft([[yc + 0.04, 0.152, 0.168, zh], [yc + 0.048, 0.15, 0.166, zh]], 16, cc, Z.feutre));
  }
  // (le bonnet d'un enfant, « tuque » : porté plus haut, le revers au-dessus des sourcils, les yeux dégagés ; son pompon)
  if (o.chapeau === 'tuque') add(T, cheveux(1.1, (x, y, z) => y - 0.36 + 0.12 * Math.max(0, -z), 1, 1.14, 1, 0.018, cc, Z.cotes), loft([[yc + 0.048, rx * 1.1, rz * 1.06, zc - 0.004], [yc + 0.09, rx * 1.08, rz * 1.04, zc - 0.004]], 10, fonce(cc, 0.8), Z.cotes, false, false));
  if ((o.chapeau === 'bonnet' || o.chapeau === 'tuque') && o.pompon) add(T, boulette(0.036, o.pompon, Z.cotes, 0, yc + 0.018 + ry * 1.254 + 0.02, zc - 0.006, 1, 0.92, 1, 1));
  if (o.capuche) add(2, boulette(0.105, haut, zHaut, 0, 0.29, -0.115, 1.05, 0.62, 0.55, 1));
  // le crâne et le visage : la grille serrée sur le visage (gabarit 'tete'), sans les facettes cachées sous des cheveux
  // épais, un foulard, un bonnet
  {
    const cache = couches.length ? (x, y, z) => { for (const f of couches) if (f(x, y, z)) return true; return false; } : null;
    const [face, crane] = separer(boule(rx, ry, rz, 0, yc, zc, 'tete', null, jaw, 0.999, relief, cache), (x, y, z) => z > zc - 0.012);
    add(T, finir(face, peau, zVisage, uvVisage(face, yc)), finir(crane, peau, Z.peau, uvBoite(crane, Z.peau)));
  }

  /* bras : épaule, coude, main (paume et doigts d'un seul tenant, pouce) */
  for (const [i, s] of [[4, 1], [7, -1]]) {
    // (le haut du bras : le biceps devant, le deltoïde qui arrondit l'épaule ; l'avant-bras : plus large près du coude, le
    // poignet plat)
    const anH = [[-0.29 * ka, 0.046 * K, 0.048 * K], [-0.2 * ka, 0.05 * K, 0.054 * K, 0.002], [-0.12 * ka, 0.054 * K, 0.057 * K, 0.004], [-0.04, 0.059 * K, 0.058 * K], [-0.01, 0.057 * K, 0.055 * K], [0.008, 0.049 * K, 0.047 * K, 0, -s * 0.004], [0.019, 0.035 * K, 0.034 * K, 0, -s * 0.01], [0.025, 0.013, 0.013, 0, -s * 0.014]]; // (le haut rentre dans l'épaule : pas d'épaulette)
    const anA = avantBras === peau ? [[-0.245 * ka, 0.027 * K, 0.034 * K], [-0.2 * ka, 0.032 * K, 0.039 * K], [-0.12 * ka, 0.043 * K, 0.046 * K, 0.002], [-0.05 * ka, 0.049 * K, 0.049 * K, 0.002], [0, 0.048 * K, 0.047 * K]]
      : [[-0.245 * ka, 0.036 * K, 0.038 * K], [-0.16 * ka, 0.043 * K, 0.044 * K], [-0.07 * ka, 0.049 * K, 0.049 * K, 0.002], [0, 0.048 * K, 0.047 * K]]; // (une manche : plus ample)
    const zA = avantBras === peau ? Z.peau : zManche;
    add(i, loft(anH, NM, manche, zManche));
    add(i + 1, boulette(0.049 * K, avantBras, zA, 0, 0, 0), loft(anA, NM, avantBras, zA));
    if (avantBras === peau) add(i, bande(anH, -0.3 * ka, -0.24 * ka, 1.12, manche, zManche, NM));
    else add(i + 1, bande(anA, -0.245 * ka, -0.215 * ka, 1.08, fonce(manche, 0.8), zManche === Z.matelasse || zManche === Z.maille ? Z.cotes : zManche, NM));
    add(i + 2, ...main(s, femme ? 0.9 : 1, peau));
  }
  if (f > 1) for (const i of [4, 5, 7, 8]) gonfler(G[i], tenue0 === 'doudoune' ? 1.13 : 1.05); // les manches du manteau, de la doudoune
  // le dedans des mains, plus clair sur une peau foncée (la paume, l'intérieur des doigts)
  { const k = 0.32 * Math.max(0, Math.min(1, (0.3 - clarte(peau)) / 0.27)); if (k > 0) for (const [i, s] of [[6, 1], [9, -1]]) for (const g of G[i]) paume(g, s, k); }
  // La canne de certains aînés, dans la main gauche (la droite tient le téléphone, le verre) : la poignée dans le poing, le
  // fût jusqu'au sol, l'embout de caoutchouc
  if (o.canne) {
    const L = 0.86, cn = o.canne;
    add(6, habiller(C(0.0105, 0.0105, L, 6, cn, -0.012, -0.075 - L / 2, 0.004, 'y', 0, 2), cn, Z.uni), habiller(C(0.012, 0.012, 0.11, 6, cn, -0.012, -0.075, 0.014, 'z'), cn, Z.uni),
      habiller(C(0.0135, 0.0135, 0.03, 6, '#1a1714', -0.012, -0.06 - L, 0.004), '#1a1714', Z.uni));
  }
  // L'écharpe : un tour épais autour du cou, un pan qui pend devant (sur la poitrine : la tête tourne dedans)
  if (o.echarpe) {
    const ec = o.echarpe, ze = o.echarpeZ ?? Z.maille, sur = (x, y, e) => { const q = surLoft(anP, x, y, 1, e); return [q[0] * f, q[1], q[2] * f]; };
    add(2, loft([[0.266, 0.122 * E * f, 0.106 * f, -0.008], [0.296, 0.114 * f, 0.103 * f, -0.012], [0.33, 0.1 * f, 0.093 * f, -0.016], [0.358, 0.086 * f, 0.083 * f, -0.016]], 12, ec, ze));
    const pts = [sur(0.045, 0.27, 0.03), sur(0.052, 0.19, 0.016), sur(0.056, 0.1, 0.014), sur(0.058, 0.0, 0.014)];
    for (let i = 0; i < 3; i++) add(2, barre(pts[i], pts[i + 1], 0.07, 0.016, ec, ze, 0.004));
    add(2, boite(0.07, 0.012, 0.018, fonce(ec, 0.78), ze, pts[3][0], pts[3][1] - 0.004, pts[3][2])); // la frange
  }
  // Le badge au cordon (o.badge : vrai, ou la couleur du cordon) : le cordon passe derrière la nuque, descend de chaque
  // côté du cou et se rejoint sur la poitrine, au mousqueton ; la carte, blanche, un bandeau de couleur en haut
  if (o.badge) {
    const bc = o.badge === true ? '#ef6c26' : o.badge, sur = (x, y, e) => { const q = surLoft(anP, x, y, 1, e); return [q[0] * f, q[1], q[2] * f]; };
    const yb = 0.1, bas = sur(0, yb + 0.05, 0.008);
    for (const sg of [1, -1]) {
      const pts = [[sg * 0.03, 0.352, -0.062], [sg * 0.064, 0.33, -0.02], [sg * 0.07, 0.31, 0.03], sur(sg * 0.05, 0.24, 0.005), sur(sg * 0.02, 0.17, 0.007), bas];
      for (let i = 0; i < pts.length - 1; i++) add(2, barre(pts[i], pts[i + 1], 0.011, 0.003, bc, Z.toile, 0.002));
    }
    add(2, barre([-0.03, 0.352, -0.062], [0.03, 0.352, -0.062], 0.011, 0.003, bc, Z.toile, 0.002));
    const z0 = sur(0, yb, 0.01)[2];
    add(2, boite(0.012, 0.022, 0.006, '#9aa0a6', Z.uni, 0, yb + 0.05, z0 + 0.001), boite(0.056, 0.084, 0.003, '#f4f2ec', Z.uni, 0, yb, z0), boite(0.057, 0.018, 0.0035, bc, Z.uni, 0, yb + 0.033, z0 + 0.0003));
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
    for (const s of [1, -1]) for (const g of sangle(anP, s * 0.075, [0.06, 0.16, 0.24], [0.28, 0.24, 0.2], 0.03, 0.009, '#2b2b30', Z.toile)) add(16, deplacer(g, 0, -y0, -z0));
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

  // Le dos un peu voûté de certains aînés (o.voute, de 0 à 1) : le haut du dos s'arrondit, le buste penche en avant (dans
  // sa forme : l'animation n'en sait rien), la tête et les épaules suivent ; la tête reste droite, un peu en avant
  if (o.voute) {
    const a = 0.16 * o.voute, ca = Math.cos(a), sa = Math.sin(a);
    for (const g of G[2]) {
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      for (let k = 0; k < p.length; k += 3) {
        const y = p[k + 1], z = p[k + 2] < 0 ? p[k + 2] - 0.028 * o.voute * cloche(y - 0.2, 0.1) : p[k + 2];
        p[k + 1] = y * ca - z * sa; p[k + 2] = y * sa + z * ca;
        const ny = n[k + 1], nz = n[k + 2]; n[k + 1] = ny * ca - nz * sa; n[k + 2] = ny * sa + nz * ca;
      }
    }
    for (const i of [OS.tete, OS.brasG, OS.brasD]) { const [x, y, z] = P[i]; P[i] = [x, y * ca - z * sa, y * sa + z * ca]; }
  }

  /* assemblage : chaque pièce suit son os ; près d'une jointure, elle suit aussi l'os voisin (peau souple, voir liens) */
  const W = [], PAR = PE ? PARENT_ENFANT : PARENT;
  for (let i = 0; i < P.length; i++) {
    const p = PAR[i] < 0 ? [0, 0, 0] : W[PAR[i]];
    W.push([p[0] + P[i][0], p[1] + P[i][1], p[2] + P[i][2]]);
  }
  const geo = assembler(G, W, kj, ka);
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
  if (!aQueue) { os[OS.meche].scale.y = 0.03; os[OS.meche].position.z -= 0.004; } // les yeux ouverts (anim.js : le clignement)
  os[OS.tete].scale.setScalar(TETE * kt); // après bind : la tête (cou, cheveux, couvre-chef compris) un peu plus grande

  const groupe = new THREE.Group();
  const echelle = PE ? (o.hauteur ?? PE.hauteur) / PE.Hm : 0.96 * (o.taille ?? 1);
  groupe.scale.setScalar(echelle);
  groupe.add(maillage);
  // caché (lui, ou son maillage : trop loin, derrière une cloison), il ne fait plus recalculer les matrices de ses 18 os à
  // chaque image : three.js ne descend dans un enfant que si son matrixWorldAutoUpdate est vrai
  Object.defineProperty(groupe, 'matrixWorldAutoUpdate', { get: () => groupe.visible && maillage.visible, set() {}, configurable: true });
  // (traits : l'apparence complète, pour les bancs ; aine : il marche plus lentement, pieton.js ; enfant : l'école)
  return { groupe, maillage, os, echelle, femme, queue: aQueue, paupieres: !aQueue, mecheZ: P[17][2], enfant: !!PE, dim: { xh, xe, H, K, L1, L2, yB, bras: LB, avantBras: LA }, traits: o, aine: o.age === 'aine' };
}
