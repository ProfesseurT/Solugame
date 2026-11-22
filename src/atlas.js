// L'atlas des personnages : une seule texture (1024 x 512, mipmaps), dessinée en code au premier personnage créé.
// Elle porte les visages (trois variantes), les yeux, la main, les poches, et les matières des vêtements, des cheveux
// et de la peau. Aucune image à charger.
//
// Convention (lue par le shader de perso.js) : le canal alpha dit si le texel est « teinté ».
//  - alpha 255 : le texel est un multiplicateur de la couleur du sommet (204 = x 1, 255 = x 1,25). Ainsi un seul
//    visage sert à toutes les peaux, une seule toile à toutes les couleurs de veste.
//  - alpha 0 : le texel est la couleur finale (blanc de l'œil, pupille, cils, dents de la fermeture).
//
// Deux sortes de zones :
//  - pavées (motifs qui se répètent : toile, jean, maille...) : motif de 112 px (48 px pour les petites) entouré de
//    8 px recopiés de l'autre bord, pour que le filtrage ne fasse pas de couture ; le shader répète le motif (fract) ;
//  - entières (visages, yeux, main, poche) : les coordonnées de la pièce vont de 0 à 1 sur la zone.
import * as THREE from 'three';

export const LA = 1024, HA = 512;
const NEUTRE = 204;                 // multiplicateur 1
const BORD = 8;                     // marge recopiée autour d'un motif pavé

// [nom, x, y, case (px), tu, tv (mètres couverts par un motif, en largeur et en hauteur)]
// Les zones pavées d'abord (le shader limite leur niveau de mipmap, voir perso.js).
const PAVES = [
  ['toile', 0, 256, 128, 0.09, 0.09], ['jean', 128, 256, 128, 0.075, 0.075], ['maille', 256, 256, 128, 0.1, 0.1],
  ['cotes', 384, 256, 128, 0.07, 0.07], ['matelasse', 512, 256, 128, 0.16, 0.16], ['chemise', 640, 256, 128, 0.06, 0.06],
  ['carreaux', 768, 256, 128, 0.12, 0.12], ['cuir', 896, 256, 128, 0.12, 0.12], ['peau', 0, 384, 128, 0.12, 0.12],
  ['cheveux', 128, 384, 128, 0.07, 0.12], ['barbe', 256, 384, 128, 0.05, 0.05], ['paille', 384, 384, 128, 0.08, 0.08],
  ['imprime', 512, 384, 128, 0.11, 0.11], ['velours', 640, 384, 128, 0.07, 0.07],
  ['feutre', 768, 384, 64, 0.05, 0.05], ['semelle', 832, 384, 64, 0.05, 0.05], ['fermeture', 768, 448, 64, 1, 0.03], ['ceinture', 832, 448, 64, 0.06, 1],
];
// [nom, x, y, largeur, hauteur]
const ENTIERES = [
  ['visageH', 0, 0, 256, 256], ['visageB', 256, 0, 256, 256], ['visageF', 512, 0, 256, 256],
  ['oeilG', 768, 0, 128, 64], ['oeilD', 768, 64, 128, 64], ['main', 896, 0, 128, 128],
  ['pouce', 768, 128, 64, 64], ['poche', 832, 128, 64, 64], ['uni', 768, 192, 64, 64],
];

// Z.nom : numéro de la zone (attribut aMat des personnages) ; ZONE[n] : { x, y, w, h (px, partie utile), tu, tv, pave }
export const Z = {}, ZONE = [];
for (const [nom, x, y, c, tu, tv] of PAVES) { Z[nom] = ZONE.length; ZONE.push({ nom, x: x + BORD, y: y + BORD, w: c - 2 * BORD, h: c - 2 * BORD, tu, tv, pave: true }); }
export const NB_PAVES = ZONE.length;
for (const [nom, x, y, w, h] of ENTIERES) { Z[nom] = ZONE.length; ZONE.push({ nom, x, y, w, h, tu: 1, tv: 1, pave: false }); }
// table des zones pour le shader : origine et taille en coordonnées de texture
export const GLSL_ZONES = `const int NB_PAVES = ${NB_PAVES};
const vec4 ZONES[${ZONE.length}] = vec4[${ZONE.length}](${ZONE.map(z => `vec4(${(z.x / LA).toFixed(6)}, ${(z.y / HA).toFixed(6)}, ${(z.w / LA).toFixed(6)}, ${(z.h / HA).toFixed(6)})`).join(', ')});`;

// Visage : fenêtre de projection (repère de la tête, centre du crâne) : x dans [-FX, FX], y dans [-FY, FY]
export const FX = 0.1, FY = 0.14;
// Contour de l'œil (en largeurs et hauteurs d'œil) : coin intérieur, paupière haute, coin extérieur, paupière basse.
// Le même sert à la géométrie (perso.js) et au dessin, pour que le trait des cils suive le bord.
export const OEIL = { w: 0.03, h: 0.012, haut: [[-1, 0], [-0.55, 0.44], [-0.05, 0.52], [0.45, 0.43], [1, 0.08]], bas: [[-1, 0], [-0.55, -0.3], [0, -0.38], [0.55, -0.3], [1, 0.08]], a: 1.04, b: 0.6 };

/* ---------------------------------------------------------------- bruits périodiques */

function hacher(i, g) {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(g + 0x27d4eb2f, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}
// bruit de valeur de période P (px), L cellules par période, lissé ; valeurs dans [0, 1]. Poids et indices calculés une
// fois par colonne (les mêmes pour les lignes). Un seul champ par (P, L) : les motifs (des zones différentes) le partagent.
const CACHE = new Map();
function bruit(P, L) {
  const cle = P * 1e3 + L, g = L;
  let out = CACHE.get(cle);
  if (out) return out;
  const v = new Float32Array(L * L), i0 = new Int32Array(P), i1 = new Int32Array(P), w = new Float32Array(P);
  for (let i = 0; i < v.length; i++) v[i] = hacher(i, g);
  for (let x = 0; x < P; x++) { const f = x * L / P, i = Math.floor(f), t = f - i; i0[x] = i; i1[x] = (i + 1) % L; w[x] = t * t * (3 - 2 * t); }
  out = new Float32Array(P * P);
  for (let y = 0, k = 0; y < P; y++) {
    const y0 = i0[y] * L, y1 = i1[y] * L, wy = w[y];
    for (let x = 0; x < P; x++, k++) {
      const a = v[y0 + i0[x]], b = v[y0 + i1[x]], c = v[y1 + i0[x]], d = v[y1 + i1[x]], wx = w[x];
      out[k] = (a + (b - a) * wx) * (1 - wy) + (c + (d - c) * wx) * wy;
    }
  }
  CACHE.set(cle, out);
  return out;
}
// bruit à une dimension, période P, L cellules
function bruit1(P, L, g) {
  const out = new Float32Array(P);
  for (let x = 0; x < P; x++) {
    const fx = x * L / P, ix = fx | 0, t = fx - ix, w = t * t * (3 - 2 * t);
    out[x] = hacher(ix % L, g) * (1 - w) + hacher((ix + 1) % L, g) * w;
  }
  return out;
}
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ---------------------------------------------------------------- motifs pavés
   Chaque motif remplit t (T x T pixels, périodique) : multiplicateur rouge, vert, bleu autour de 1, et la part teintée
   (1 = teinté). Ils restent proches de 1 en moyenne : la couleur choisie reste la même. Une boucle par motif (le moteur
   JavaScript la compile pour lui seul : bien plus rapide qu'une fonction appelée pour chaque pixel). */
// texel empaqueté sur 32 bits (ordre des octets du tableau : rouge, vert, bleu, alpha) ; teinté : multiplicateur x 204
const octet = v => (v > 255 ? 255 : v < 0 ? 0 : v + 0.5 | 0);
const gris = (t, i, m) => { const v = octet(m * NEUTRE); t[i] = 0xff000000 | v << 16 | v << 8 | v; };
const rvb = (t, i, r, g, b, a = 1) => { const k = a > 0 ? NEUTRE : 255; t[i] = (a > 0 ? 0xff000000 : 0) | octet(b * k) << 16 | octet(g * k) << 8 | octet(r * k); };
const MOTIFS = {
  // toile de coton sergée (vestes de travail, casquettes, tabliers) : diagonales fines, fils irréguliers, usure
  toile(T, t) {
    const f = bruit(T, 28), g = bruit(T, 4);
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) { const d = (x + y) & 3; gris(t, i, 0.98 + (d === 0 ? 0.05 : d === 2 ? -0.04 : 0) + 0.08 * (f[i] - 0.5) + 0.06 * (g[i] - 0.5)); }
  },
  // jean : sergé marqué (trame claire en diagonale), fils flammés
  jean(T, t) {
    const f = bruit(T, 56), g = bruit(T, 7), fil = bruit1(T, 112, 6);
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) {
      const d = (x - y + 1024) & 3;
      gris(t, i, 0.93 + (d === 0 ? 0.16 : d === 1 ? 0.06 : -0.06) + 0.12 * (fil[x] - 0.5) + 0.05 * (f[i] - 0.5) + 0.07 * (g[i] - 0.5));
    }
  },
  // jersey (pulls) : colonnes de mailles en V
  maille(T, t) {
    const g = bruit(T, 8), P = 2 * Math.PI / 7;
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) {
      const a = Math.abs((x & 7) - 3.5), bosse = 0.5 - 0.5 * Math.cos(P * (y + a * 0.8));
      gris(t, i, (0.86 + 0.2 * bosse) * (a > 3.1 ? 0.84 : 1) + 0.05 * (g[i] - 0.5));
    }
  },
  // côtes (poignets, bas de pull, bonnets) : sillons verticaux
  cotes(T, t) {
    const g = bruit(T, 8), col = new Float32Array(T);
    for (let x = 0; x < T; x++) col[x] = 0.8 + 0.26 * Math.sqrt(0.5 + 0.5 * Math.cos(2 * Math.PI * x / 7));
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) gris(t, i, col[x] + (y & 1 ? 0.03 : -0.03) + 0.04 * (g[i] - 0.5));
  },
  // matelassé : boudins horizontaux (deux par motif), piqûre entre deux, nylon
  matelasse(T, t) {
    const g = bruit(T, 14), h = T / 2, ligne = new Float32Array(h);
    for (let y = 0; y < h; y++) { const u = (y + 0.5) / h; ligne[y] = 0.72 + 0.4 * Math.pow(Math.sin(Math.PI * u), 0.55) - 0.08 * u; }
    for (let y = 0, i = 0; y < T; y++) {
      const yy = y % h, piq = yy === 0 || yy === h - 1;
      for (let x = 0; x < T; x++, i++) gris(t, i, ligne[yy] * (piq ? ((x >> 1) & 1 ? 0.55 : 0.7) : 1) + 0.03 * (g[i] - 0.5));
    }
  },
  // chemise (oxford) : petit damier de fils
  chemise(T, t) {
    const g = bruit(T, 28);
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) gris(t, i, 1.0 + ((((x >> 1) ^ (y >> 1)) & 1) ? 0.03 : -0.03) + 0.05 * (g[i] - 0.5));
  },
  // chemise à carreaux : bandes sombres croisées (deux carreaux par motif), un filet clair
  carreaux(T, t) {
    const g = bruit(T, 28), P = T / 2, b = new Float32Array(P), c = new Uint8Array(P);
    for (let x = 0; x < P; x++) { const u = (x + 0.5) / P; b[x] = (u < 0.32 ? 1 : 0) + (u > 0.62 && u < 0.68 ? 0.6 : 0); c[x] = u > 0.84 && u < 0.88 ? 1 : 0; }
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) {
      const px = x % P, py = y % P;
      gris(t, i, (c[px] || c[py] ? 1.16 : 1.08) - 0.22 * b[px] - 0.22 * b[py] + ((x + y) & 1 ? 0.02 : -0.02) + 0.04 * (g[i] - 0.5));
    }
  },
  // cuir (bottes, ceintures, étui) : grain, marbrures, éraflures claires
  cuir(T, t) {
    const f = bruit(T, 56), g = bruit(T, 8), r = bruit(T, 14);
    for (let i = 0; i < T * T; i++) gris(t, i, 0.98 + 0.06 * (f[i] - 0.5) + 0.1 * (g[i] - 0.5) + (r[i] > 0.72 ? (r[i] - 0.72) * 0.6 : 0));
  },
  // peau : léger modelé, un peu de rougeur par endroits
  peau(T, t) {
    const f = bruit(T, 28), g = bruit(T, 7);
    for (let i = 0; i < T * T; i++) { const m = 1.0 + 0.04 * (f[i] - 0.5), r = g[i] - 0.5; rvb(t, i, m + 0.02 * r, m - 0.025 * r, m - 0.03 * r); }
  },
  // cheveux : mèches dans le sens du motif (vertical), ondulées, reflets
  cheveux(T, t) {
    const fin = bruit1(T, 56, 17), meche = bruit1(T, 8, 18), onde = bruit(T, 4), lg = bruit(T, 14);
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) {
      const k = ((x + Math.round(10 * (onde[i] - 0.5))) % T + T) % T, m = 0.64 + 0.34 * fin[k] * (0.6 + 0.4 * lg[i]) + 0.4 * meche[k];
      rvb(t, i, m, m, m * 0.98);
    }
  },
  // barbe : poils courts frisés, quelques reflets
  barbe(T, t) {
    const f = bruit(T, 56), g = bruit(T, 14);
    for (let i = 0; i < T * T; i++) gris(t, i, 0.7 + 0.42 * f[i] + 0.26 * (hacher(i, 23) - 0.5) + 0.14 * (g[i] - 0.5));
  },
  // paille tressée (chapeau) : brins croisés
  paille(T, t) {
    const g = bruit(T, 28), brin = new Float32Array(8);
    for (let k = 0; k < 8; k++) brin[k] = 0.86 + 0.22 * Math.sin(Math.PI * (k + 0.5) / 8);
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) {
      const sens = ((x >> 3) ^ (y >> 3)) & 1;
      gris(t, i, brin[sens ? x & 7 : y & 7] + 0.06 * (g[i] - 0.5) - ((sens ? y & 7 : x & 7) === 0 ? 0.18 : 0));
    }
  },
  // tissu imprimé (robes, jupes) : petites fleurs claires semées
  imprime(T, t) {
    const g = bruit(T, 28), P = 16;
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) {
      const dx = ((x + ((y / P) & 1) * P / 2) % P) - P / 2 + 0.5, dy = (y % P) - P / 2 + 0.5, d2 = dx * dx + dy * dy;
      const fleur = d2 < 20 ? (d2 < 2.25 ? 0.85 : 1.24) : 1, m = 0.94 * fleur + 0.04 * (g[i] - 0.5);
      rvb(t, i, m, m, d2 < 20 && d2 >= 2.25 ? m * 0.97 : m);
    }
  },
  // velours côtelé (pantalons des anciens) : côtes verticales larges
  velours(T, t) {
    const g = bruit(T, 14), f = bruit(T, 56), col = new Float32Array(T);
    for (let x = 0; x < T; x++) col[x] = 0.8 + 0.26 * Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * (x + 0.5) / 8), 0.6);
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) gris(t, i, col[x] + 0.05 * (g[i] - 0.5) + 0.04 * (f[i] - 0.5));
  },
  // feutre (béret) : grain doux
  feutre(T, t) {
    const f = bruit(T, 24), g = bruit(T, 6);
    for (let i = 0; i < T * T; i++) gris(t, i, 0.98 + 0.07 * (f[i] - 0.5) + 0.05 * (g[i] - 0.5));
  },
  // semelle : caoutchouc, rainures
  semelle(T, t) {
    const g = bruit(T, 12);
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) gris(t, i, (y & 7) < 2 ? 0.62 : 0.95 + 0.05 * (g[i] - 0.5));
  },
  // fermeture à glissière : dents de métal au milieu (non teintées), ruban teinté de part et d'autre
  fermeture(T, t) {
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) {
      if (Math.abs(x - T / 2 + 0.5) < 9) { const v = ((y >> 2) + (x < T / 2 ? 0 : 1)) & 1 ? 0.78 : 0.5; rvb(t, i, v, v, v * 0.97, 0); }
      else gris(t, i, 0.9 + ((x + y) & 1 ? 0.03 : -0.03));
    }
  },
  // ceinture : cuir, deux piqûres le long des bords (v de 0 à 1 sur la hauteur)
  ceinture(T, t) {
    const g = bruit(T, 12);
    for (let y = 0, i = 0; y < T; y++) for (let x = 0; x < T; x++, i++) {
      const piq = (y === 6 || y === T - 7) && (x & 3) < 2;
      gris(t, i, (piq ? 1.18 : 0.95) + 0.08 * (g[i] - 0.5) - (y < 2 || y > T - 3 ? 0.12 : 0));
    }
  },
};

/* ---------------------------------------------------------------- écriture dans l'atlas */

// Un motif pavé : calculé une fois sur T x T, recopié avec sa marge (BORD px repris de l'autre bord)
let TUILE = null, COL = null; // tampons de travail, le temps de peindre l'atlas
function paver(px32, z, motif) {
  const T = z.w, C = T + 2 * BORD, x0 = z.x - BORD, y0 = z.y - BORD;
  motif(T, TUILE);
  for (let x = 0; x < C; x++) COL[x] = (x + T - BORD) % T;
  for (let y = 0; y < C; y++) {
    const ls = ((y + T - BORD) % T) * T;
    for (let x = 0, d = (y0 + y) * LA + x0; x < C; x++, d++) px32[d] = TUILE[ls + COL[x]];
  }
}
// Une zone entière dessinée pixel par pixel : f(u, v, o) avec u, v dans [0, 1] (centre des pixels)
function peindre(px, z, f) {
  const o = [1, 1, 1, 1];
  for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) {
    o[0] = 1; o[1] = -1; o[2] = -1; o[3] = 1;
    f((x + 0.5) / z.w, (y + 0.5) / z.h, o);
    if (o[1] < 0) o[1] = o[0];
    if (o[2] < 0) o[2] = o[0];
    const d = ((z.y + y) * LA + z.x + x) * 4, t = o[3];
    // o[3] : part teintée (0 à 1) ; teinté : multiplicateur, sinon couleur
    const k = t * NEUTRE + (1 - t) * 255;
    px[d] = k * o[0]; px[d + 1] = k * o[1]; px[d + 2] = k * o[2]; px[d + 3] = 255 * t;
  }
}

/* ---------------------------------------------------------------- visages
   Peints en multiplicateurs sur un fond neutre, par petites touches douces (chacune ne parcourt que les pixels de sa
   boîte) : ombres (orbites, sous le nez, sous la lèvre, sous le menton), pli de la paupière, narines, lèvres, joues.
   Le fond commun est peint une fois puis recopié pour les trois visages ; chacun reçoit ensuite ce qui lui est propre.
   La barbe de quelques jours est ajoutée à la fin. Repère : mètres, y vers le haut, centre du crâne. */
const NV = 256, SX = NV / (2 * FX), SY = NV / (2 * FY), PXM = 1 / SX;
// pixels couverts par une boîte en mètres : [colonne min, colonne max, ligne min, ligne max]
const cadre = (x0, x1, y0, y1) => [Math.max(0, Math.floor((x0 + FX) * SX)), Math.min(NV - 1, Math.ceil((x1 + FX) * SX)), Math.max(0, Math.floor((FY - y1) * SY)), Math.min(NV - 1, Math.ceil((FY - y0) * SY))];
const ligneY = py => FY - (py + 0.5) / SY, colonneX = px => (px + 0.5) / SX - FX;
// ligne brisée ; une courbe (trois points) est découpée en huit segments
function ligne(pts) {
  if (pts.length !== 6) return pts;
  const q = [];
  for (let k = 0; k <= 8; k++) { const t = k / 8, u = 1 - t; q.push(u * u * pts[0] + 2 * u * t * pts[2] + t * t * pts[4], u * u * pts[1] + 2 * u * t * pts[3] + t * t * pts[5]); }
  return q;
}
// Distance (au carré) de chaque pixel du cadre à une ligne brisée : chaque segment ne parcourt que les pixels de sa propre
// boîte (élargie de e). Résultat dans DIST (largeur w du cadre).
let DIST = null; // tampon de travail, le temps de peindre l'atlas
function distances(q, e, c0, c1, l0, l1) {
  const w = c1 - c0 + 1;
  DIST.fill(1e9, 0, w * (l1 - l0 + 1));
  for (let k = 0; k < q.length - 2; k += 2) {
    const ax = q[k], ay = q[k + 1], bx = q[k + 2] - ax, by = q[k + 3] - ay, l = bx * bx + by * by;
    const [s0, s1, t0, t1] = cadre(Math.min(ax, ax + bx) - e, Math.max(ax, ax + bx) + e, Math.min(ay, ay + by) - e, Math.max(ay, ay + by) + e);
    for (let py = Math.max(t0, l0); py <= Math.min(t1, l1); py++) {
      const Y = ligneY(py) - ay;
      for (let px = Math.max(s0, c0), j = (py - l0) * w + px - c0; px <= Math.min(s1, c1); px++, j++) {
        const X = colonneX(px) - ax, t = l > 0 ? Math.min(1, Math.max(0, (X * bx + Y * by) / l)) : 0, dx = X - t * bx, dy = Y - t * by, d = dx * dx + dy * dy;
        if (d < DIST[j]) DIST[j] = d;
      }
    }
  }
}
function etendue(q, e) {
  let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
  for (let k = 0; k < q.length; k += 2) { x0 = Math.min(x0, q[k]); x1 = Math.max(x1, q[k]); y0 = Math.min(y0, q[k + 1]); y1 = Math.max(y1, q[k + 1]); }
  return cadre(x0 - e, x1 + e, y0 - e, y1 + e);
}
function pinceaux(buf) {
  // tache douce (ellipse, opacité décroissante du centre au bord), assombrit
  const tache = (x, y, rx, ry, r, g, b, a) => {
    const [c0, c1, l0, l1] = cadre(x - rx, x + rx, y - ry, y + ry);
    for (let py = l0; py <= l1; py++) {
      const dy = (ligneY(py) - y) / ry;
      for (let px = c0, i = (py * NV + c0) * 3; px <= c1; px++, i += 3) {
        const dx = (colonneX(px) - x) / rx, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1) { const t = a * (1 - d); buf[i] *= 1 - t * (1 - r); buf[i + 1] *= 1 - t * (1 - g); buf[i + 2] *= 1 - t * (1 - b); }
      }
    }
  };
  // éclaircit vers k (multiplicateur)
  const clair = (x, y, rx, ry, k, a) => {
    const [c0, c1, l0, l1] = cadre(x - rx, x + rx, y - ry, y + ry);
    for (let py = l0; py <= l1; py++) {
      const dy = (ligneY(py) - y) / ry;
      for (let px = c0, i = (py * NV + c0) * 3; px <= c1; px++, i += 3) {
        const dx = (colonneX(px) - x) / rx, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1) { const t = a * (1 - d); buf[i] += (k - buf[i]) * t; buf[i + 1] += (k - buf[i + 1]) * t; buf[i + 2] += (k - buf[i + 2]) * t; }
      }
    }
  };
  // trait doux : trois passages de plus en plus fins et plus marqués, bouts arrondis
  const trait = (pts, l, r, g, b, a) => {
    const q = ligne(pts), e = 1.2 * l + 2 * PXM, [c0, c1, l0, l1] = etendue(q, e), w = c1 - c0 + 1;
    distances(q, e, c0, c1, l0, l1);
    for (let py = l0; py <= l1; py++) for (let px = c0, i = (py * NV + c0) * 3, j = (py - l0) * w; px <= c1; px++, i += 3, j++) {
      const d = Math.sqrt(DIST[j]);
      if (d > e) continue;
      for (let k = 0; k < 3; k++) {
        const t = a * PASSES[k][1] * Math.min(1, Math.max(0, (PASSES[k][0] * l / 2 - d) / PXM + 0.5));
        if (t > 0) { buf[i] *= 1 - t * (1 - r); buf[i + 1] *= 1 - t * (1 - g); buf[i + 2] *= 1 - t * (1 - b); }
      }
    }
  };
  // forme pleine : contour fait de courbes (départ, puis contrôle et arrivée pour chaque courbe), bord adouci sur un pixel ;
  // dedans ou dehors : croisements du contour, ligne par ligne
  const forme = (pts, r, g, b, a) => {
    let q = [pts[0], pts[1]];
    for (let k = 2; k < pts.length; k += 4) q = q.concat(ligne([q[q.length - 2], q[q.length - 1], pts[k], pts[k + 1], pts[k + 2], pts[k + 3]]).slice(2));
    const n = q.length, e = 2 * PXM, [c0, c1, l0, l1] = etendue(q, e), w = c1 - c0 + 1, xs = [];
    distances(q.concat([q[0], q[1]]), e, c0, c1, l0, l1);
    for (let py = l0; py <= l1; py++) {
      const Y = ligneY(py);
      xs.length = 0;
      for (let k = 0, j = n - 2; k < n; j = k, k += 2) if ((q[k + 1] > Y) !== (q[j + 1] > Y)) xs.push((q[j] - q[k]) * (Y - q[k + 1]) / (q[j + 1] - q[k + 1]) + q[k]);
      for (let px = c0, i = (py * NV + c0) * 3, j = (py - l0) * w; px <= c1; px++, i += 3, j++) {
        const X = colonneX(px);
        let dedans = false;
        for (let k = 0; k < xs.length; k++) if (X < xs[k]) dedans = !dedans;
        const d = Math.sqrt(DIST[j]) / PXM, t = a * Math.min(1, Math.max(0, dedans ? 0.5 + d : 0.5 - d));
        if (t > 0) { buf[i] *= 1 - t * (1 - r); buf[i + 1] *= 1 - t * (1 - g); buf[i + 2] *= 1 - t * (1 - b); }
      }
    }
  };
  return { tache, clair, trait, forme };
}
const PASSES = [[2.4, 0.25], [1.5, 0.45], [0.8, 0.8]];
// contour des lèvres (bouche fermée) : supérieure, inférieure
const LW = 0.022, YM = -0.0745;
const LEVRE_H = [-LW, YM, -0.012, YM + 0.004, -0.006, YM + 0.0072, -0.003, YM + 0.0078, 0, YM + 0.006, 0.003, YM + 0.0078, 0.006, YM + 0.0072, 0.012, YM + 0.004, LW, YM, 0, YM - 0.0012, -LW, YM];
const LEVRE_B = [-LW, YM, -0.01, YM - 0.0085, 0, YM - 0.0092, 0.01, YM - 0.0085, LW, YM, 0, YM - 0.001, -LW, YM];
function visageCommun(buf) {
  const { tache, clair, trait, forme } = pinceaux(buf);
  // lumières : front, arête du nez, pommettes, menton
  clair(0, 0.065, 0.045, 0.03, 1.05, 0.7);
  clair(0, -0.022, 0.006, 0.02, 1.06, 0.6);
  for (const s of [1, -1]) clair(s * 0.045, -0.012, 0.018, 0.012, 1.04, 0.5);
  clair(0, -0.1, 0.013, 0.008, 1.05, 0.6);
  // dessous du menton et de la mâchoire, tempes
  for (let py = Math.floor((FY + 0.094) * SY); py < NV; py++) {
    const a = Math.min(1, (-0.094 - (FY - (py + 0.5) / SY)) / 0.036);
    for (let i = py * NV * 3; i < (py + 1) * NV * 3; i += 3) { buf[i] *= 1 - a * 0.2; buf[i + 1] *= 1 - a * 0.26; buf[i + 2] *= 1 - a * 0.26; }
  }
  for (const s of [1, -1]) tache(s * 0.085, 0.03, 0.02, 0.05, 0.92, 0.88, 0.88, 0.6);
  for (const s of [1, -1]) {
    const x = s * 0.0315;
    // orbite, coin intérieur, pli de la paupière, cerne, fond sombre derrière l'œil (s'il bâille un peu)
    tache(x, 0.003, 0.025, 0.017, 0.86, 0.79, 0.8, 0.7);
    tache(s * 0.012, 0.004, 0.008, 0.012, 0.88, 0.8, 0.8, 0.5);
    trait([s * 0.016, 0.006, x, 0.0125, s * 0.048, 0.008], 0.0011, 0.7, 0.58, 0.56, 0.55);
    trait([s * 0.018, -0.0045, x, -0.0085, s * 0.045, -0.002], 0.0016, 0.86, 0.77, 0.77, 0.4);
    tache(x, 0.0005, 0.016, 0.0068, 0.4, 0.3, 0.28, 0.9);
    // sourcil : la géométrie le porte ; ici une ombre douce pour l'asseoir
    trait([s * 0.012, 0.019, s * 0.034, 0.027, s * 0.053, 0.019], 0.005, 0.88, 0.84, 0.84, 0.45);
  }
  // nez : flancs, ailes, narines, ombre portée sous le nez ; philtrum
  for (const s of [1, -1]) {
    trait([s * 0.0075, 0.012, s * 0.009, -0.012, s * 0.012, -0.03], 0.0035, 0.92, 0.86, 0.86, 0.45);
    trait([s * 0.011, -0.035, s * 0.018, -0.038, s * 0.0145, -0.045], 0.0016, 0.76, 0.64, 0.64, 0.6);
    tache(s * 0.0072, -0.0457, 0.0042, 0.0018, 0.32, 0.22, 0.22, 0.95);
    trait([s * 0.0035, -0.051, s * 0.0042, -0.058, s * 0.005, -0.065], 0.0018, 0.92, 0.86, 0.86, 0.45);
  }
  tache(0, -0.052, 0.016, 0.0055, 0.82, 0.74, 0.74, 0.65);
  // lèvres : la supérieure plus sombre, l'inférieure avec un reflet ; ligne de la bouche ; ombre sous la lèvre
  forme(LEVRE_H, 0.84, 0.64, 0.62, 1);
  forme(LEVRE_B, 0.9, 0.72, 0.68, 1);
  clair(0, YM - 0.0045, 0.008, 0.002, 1.05, 0.55);
  trait([-LW, YM + 0.0002, 0, YM - 0.0015, LW, YM + 0.0002], 0.0011, 0.48, 0.33, 0.32, 0.9);
  for (const s of [1, -1]) tache(s * LW, YM + 0.0002, 0.0025, 0.0018, 0.62, 0.48, 0.48, 0.8);
  tache(0, YM - 0.0135, 0.012, 0.0045, 0.87, 0.81, 0.81, 0.6);
}
// ce qui distingue les visages : sillons et joues d'homme ; lèvres plus colorées, fard léger, paupière ombrée pour une femme
function visagePropre(buf, femme) {
  const { tache, trait, forme } = pinceaux(buf);
  if (femme) {
    forme(LEVRE_H, 0.97, 0.8, 0.82, 1); forme(LEVRE_B, 0.97, 0.82, 0.84, 1);
    for (const s of [1, -1]) {
      tache(s * 0.046, -0.026, 0.022, 0.016, 1, 0.88, 0.87, 0.55);
      tache(s * 0.033, 0.009, 0.015, 0.006, 0.9, 0.84, 0.86, 0.5);
      trait([s * 0.016, 0.006, s * 0.0315, 0.0125, s * 0.048, 0.008], 0.0009, 0.72, 0.62, 0.6, 0.5);
    }
  } else for (const s of [1, -1]) {
    trait([s * 0.02, -0.042, s * 0.028, -0.056, s * 0.03, -0.073], 0.0026, 0.9, 0.83, 0.83, 0.35);
    tache(s * 0.046, -0.028, 0.022, 0.016, 1, 0.94, 0.92, 0.45);
  }
}

// Barbe de quelques jours : grisé piqueté sur le bas du visage, lèvres épargnées (visage « B »). Seulement la moitié
// basse de la zone ; la lisière (selon x) est calculée une fois par colonne.
function barbeCourte(px, z) {
  const bord = new Float32Array(z.w);
  for (let x = 0; x < z.w; x++) {
    const ax = Math.abs(((x + 0.5) / z.w * 2 - 1) * FX);
    bord[x] = ax >= 0.075 ? 0.004 : ax >= 0.045 ? -0.035 + (ax - 0.045) / 0.03 * 0.039 : ax >= 0.02 ? -0.05 + (ax - 0.02) / 0.025 * 0.015 : -0.051;
  }
  for (let y = z.h >> 1; y < z.h; y++) {
    const my = (1 - (y + 0.5) / z.h * 2) * FY, ly = (my - YM) / 0.0095;
    for (let x = 0; x < z.w; x++) {
      let m = lisse(bord[x] + 0.005, bord[x] - 0.006, my);
      if (m <= 0) continue;
      const lx = ((x + 0.5) / z.w * 2 - 1) * FX / 0.024;
      m *= lisse(0.72, 1.32, lx * lx + ly * ly);
      if (m <= 0) continue;
      const k = m * 0.8, v = k * (0.62 + 0.36 * hacher(y * 997 + x, 41)), d = ((z.y + y) * LA + z.x + x) * 4;
      px[d] *= 1 - k + v * 0.95; px[d + 1] *= 1 - k + v * 0.97; px[d + 2] *= 1 - k + v * 1.05;
    }
  }
}

/* ---------------------------------------------------------------- yeux, main, pouce, poche */

// bord haut ou bas du contour de l'œil, en hauteurs d'œil, à l'abscisse a (de -1 coin intérieur à 1 coin extérieur)
function bordOeil(pts, a) {
  for (let i = 1; i < pts.length; i++) if (a <= pts[i][0]) { const p = pts[i - 1], q = pts[i], t = (a - p[0]) / (q[0] - p[0]); return p[1] + (q[1] - p[1]) * t; }
  return pts[pts.length - 1][1];
}
// sens : +1 œil gauche du personnage (à droite sur l'image vue de face), -1 œil droit ; le reflet est du même côté pour les deux.
// Texel visé = part teintée (iris, multiplicateur de la couleur du sommet) + part non teintée (blanc, pupille, cils, reflet).
function peindreOeil(px, z, sens) {
  const W = OEIL.w / 2, H = OEIL.h, ri = 0.0057, rp = 0.0021, rayons = bruit1(64, 32, 42 + sens);
  const haut = new Float32Array(z.w), bas = new Float32Array(z.w), coinA = new Float32Array(z.w), roseA = new Float32Array(z.w);
  for (let x = 0; x < z.w; x++) {
    const a = ((x + 0.5) / z.w * 2 - 1) * OEIL.a;
    haut[x] = bordOeil(OEIL.haut, a) * H; bas[x] = bordOeil(OEIL.bas, a) * H;
    coinA[x] = 1 - 0.32 * lisse(0.55, 1.0, Math.abs(a)); roseA[x] = lisse(-0.7, -0.98, a);
  }
  for (let y = 0; y < z.h; y++) {
    const my = (0.5 - (y + 0.5) / z.h) * 2 * OEIL.b * H;
    for (let x = 0; x < z.w; x++) {
      const d0 = ((z.y + y) * LA + z.x + x) * 4, mx = ((x + 0.5) / z.w * 2 - 1) * OEIL.a * W, sousHaut = haut[x] - my, surBas = my - bas[x];
      if (sousHaut < 0.0008 || surBas < 0) { px[d0] = 23; px[d0 + 1] = 18; px[d0 + 2] = 15; px[d0 + 3] = 0; continue; } // cils, bord des paupières
      const ombre = 1 - 0.5 * Math.exp(-(sousHaut - 0.0008) / 0.0013);                     // ombre de la paupière haute
      // blanc de l'œil : rosé au coin intérieur, plus sombre aux coins, liseré de la paupière basse
      const coin = coinA[x] * ombre, rose = roseA[x], lis = surBas < 0.0004;
      let r = 255 * 0.93 * coin * (lis ? 0.75 : 1), g = 255 * (0.9 - 0.1 * rose) * coin * (lis ? 0.68 : 1), bl = 255 * (0.86 - 0.1 * rose) * coin * (lis ? 0.68 : 1);
      let t = 0;
      const d = Math.hypot(mx, my - 0.0002), bi = lisse(ri + 0.00025, ri - 0.00025, d);
      if (bi > 0) {
        // iris : fibres en rayons, cercle sombre au bord, couronne claire autour de la pupille ; pupille noire
        const k = rayons[Math.floor((Math.atan2(my, mx) / (2 * Math.PI) + 1) * 64) & 63];
        const m = (0.86 + 0.3 * (k - 0.5) + 0.2 * lisse(rp * 2.2, rp * 1.2, d) - 0.45 * lisse(ri * 0.72, ri, d)) * ombre;
        const p = lisse(rp + 0.0002, rp - 0.0002, d), iris = NEUTRE * m, pup = 255 * 0.03;
        t = bi * (1 - p);
        r = t * iris + bi * p * pup + (1 - bi) * r; g = t * iris + bi * p * pup + (1 - bi) * g; bl = t * iris + bi * p * pup + (1 - bi) * bl;
      }
      // reflet de la lumière, en haut, du même côté sur les deux yeux
      const dr = Math.hypot(mx + sens * 0.0021, my - 0.0021);
      if (dr < 0.001) { const k = lisse(0.001, 0.0006, dr); r = r * (1 - k) + 255 * k; g = g * (1 - k) + 255 * k; bl = bl * (1 - k) + 250 * k; t *= 1 - k; }
      px[d0] = r; px[d0 + 1] = g; px[d0 + 2] = bl; px[d0 + 3] = 255 * t;
    }
  }
}
// Main (paume et doigts d'un seul tenant) : u autour (angle de la section, 8 côtés), v du poignet (0) au bout des doigts (1).
// Côté dos (sin > 0) : jointures, rainures entre les doigts, ongles ; côté paume : plis, paume plus claire.
// Ce qui ne dépend que de u (position autour) est calculé une fois par colonne.
const cloche = d => { const q = 1 - d * d; return q > 0 ? q * q : 0; };
function peindreMain(px, z) {
  const N = z.w, g = bruit(N, 16), DOIGTS = [0.72, 0.24, -0.24, -0.72], col = () => new Float32Array(N);
  // par colonne (autour de la main) : côté dos ou paume, rainures, distance au doigt le plus proche
  const dos = col(), zn = col(), rain = col(), paume = col(), cJ = col(), cJ2 = col(), cOng = col(), cBord = col();
  for (let x = 0; x < N; x++) {
    const a = Math.PI / 8 + 2 * Math.PI * (x + 0.5) / N, w = Math.cos(a);
    let e = 9; for (const c of DOIGTS) e = Math.min(e, Math.abs(w - c));
    dos[x] = Math.sin(a); zn[x] = w; paume[x] = lisse(0.1, 0.6, -dos[x]);
    rain[x] = Math.max(cloche((w - 0.48) / 0.08), cloche(w / 0.08), cloche((w + 0.48) / 0.08));
    cJ[x] = 0.12 * cloche(e / 0.18); cJ2[x] = 0.08 * cloche(e / 0.15); cOng[x] = lisse(0.15, 0.11, e) * lisse(0.4, 0.6, dos[x]); cBord[x] = lisse(0.11, 0.07, e);
  }
  for (let y = 0; y < N; y++) {
    const v = (y + 0.5) / N, doigts = 0.5 * lisse(0.5, 0.58, v), ong = lisse(0.86, 0.89, v), ongB = lisse(0.89, 0.92, v);
    const j1 = cloche((v - 0.5) / 0.03), j2 = cloche((v - 0.72) / 0.022), plis = (1 - 0.14 * cloche((v - 0.53) / 0.018)) * (1 - 0.1 * cloche((v - 0.7) / 0.015)) * (1 - 0.1 * cloche((v - 0.84) / 0.015));
    for (let x = 0, i = y * N, d = ((z.y + y) * LA + z.x) * 4; x < N; x++, i++, d += 4) {
      const m = 1 + 0.04 * (g[i] - 0.5), p = paume[x];
      let r = m * (1 + 0.07 * p), gg = m * (1 + 0.01 * p), b = m * (1 - 0.01 * p), k = 1 - doigts * rain[x];
      if (dos[x] > 0.3) {
        // jointures, ongles
        k *= (1 - cJ[x] * j1) * (1 - cJ2[x] * j2);
        const o = cOng[x] * ong;
        if (o > 0) { const bd = cBord[x] * ongB; r += o * (0.9 + 0.22 * bd - r); gg += o * (0.84 + 0.18 * bd - gg); b += o * (0.84 + 0.18 * bd - b); }
      } else if (dos[x] < -0.3) {
        // plis de la paume et des phalanges
        const w = zn[x];
        k *= plis * (1 - 0.12 * cloche((v - 0.36 - 0.06 * w) / 0.018) * lisse(0.9, 0.5, w)) * (1 - 0.12 * cloche((v - 0.44 + 0.04 * w) / 0.018) * lisse(-0.9, -0.3, w));
      }
      px[d] = NEUTRE * r * k; px[d + 1] = NEUTRE * gg * k; px[d + 2] = NEUTRE * b * k; px[d + 3] = 255;
    }
  }
}
// Pouce : u autour (6 côtés), v de la base (0) au bout (1) ; ongle du côté de l'angle 0
function peindrePouce(px, z) {
  peindre(px, z, (u, v, o) => {
    const a = Math.PI / 6 + 2 * Math.PI * u, f = Math.cos(a);
    const ong = lisse(0.55, 0.75, f) * lisse(0.68, 0.74, v);
    let k = 1 - 0.1 * Math.exp(-(((v - 0.5) / 0.03) ** 2));
    o[0] = k * (1 + 0.1 * ong); o[1] = k * (1 + 0.02 * ong); o[2] = k * (1 + 0.02 * ong);
  });
}
// Poche plaquée : piqûres le long des bords, rabat en haut
function peindrePoche(px, z) {
  peindre(px, z, (u, v, o) => {
    const x = u * 64, y = v * 64, bord = Math.min(x, 64 - x, 64 - y);
    let m = 0.98 - 0.08 * lisse(0.3, 0, v);
    if ((Math.abs(bord - 4.5) < 0.8 || Math.abs(y - 15) < 0.8) && ((Math.floor(x + y) >> 1) & 1)) m = 0.7;
    if (y < 15) m *= 0.94;
    if (bord < 1.5 || y < 1.5) m *= 0.8;
    o[0] = m;
  });
}

/* ---------------------------------------------------------------- l'atlas */

let atlas = null;
export function texturePersos() {
  if (atlas) return atlas;
  DIST = new Float32Array(NV * NV); TUILE = new Uint32Array(112 * 112); COL = new Int32Array(128);
  const px = new Uint8ClampedArray(LA * HA * 4); // bornée : un multiplicateur au-dessus de 1,25 sature au lieu de déborder
  new Uint32Array(px.buffer).fill(0xff000000 | NEUTRE << 16 | NEUTRE << 8 | NEUTRE); // fond neutre, teinté
  // visages : le fond commun, recopié pour les trois, puis ce qui est propre à chacun
  {
    const commun = new Float32Array(NV * NV * 3).fill(1);
    visageCommun(commun);
    for (const [nom, femme] of [['visageH', false], ['visageB', false], ['visageF', true]]) {
      const buf = commun.slice(), z = ZONE[Z[nom]];
      visagePropre(buf, femme);
      for (let y = 0, i = 0; y < NV; y++) for (let x = 0, d = ((z.y + y) * LA + z.x) * 4; x < NV; x++, i += 3, d += 4) { px[d] = NEUTRE * buf[i]; px[d + 1] = NEUTRE * buf[i + 1]; px[d + 2] = NEUTRE * buf[i + 2]; }
    }
  }
  barbeCourte(px, ZONE[Z.visageB]);
  const px32 = new Uint32Array(px.buffer);
  for (const nom in MOTIFS) paver(px32, ZONE[Z[nom]], MOTIFS[nom]);
  peindreOeil(px, ZONE[Z.oeilG], 1); peindreOeil(px, ZONE[Z.oeilD], -1);
  peindreMain(px, ZONE[Z.main]); peindrePouce(px, ZONE[Z.pouce]); peindrePoche(px, ZONE[Z.poche]);
  const t = new THREE.DataTexture(new Uint8Array(px.buffer), LA, HA, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  // les octets ne servent qu'à l'envoi vers la carte graphique : libérés ensuite (2 Mo de moins dans le tas)
  t.onUpdate = () => { t.image.data = null; t.onUpdate = null; };
  DIST = TUILE = COL = null; CACHE.clear(); // tampons de travail rendus
  atlas = t;
  return t;
}
