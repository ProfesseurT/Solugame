// Le relief : plat dans la zone de jeu, collines autour, vallée pour la départementale ; au nord-ouest, la colline du
// château (collines adoucies, plateau aplani au sommet) et la route qui y monte depuis la départementale, taillée dans
// la pente (déblais et remblais, talus). Ce relief retouché est porté par une grille fine (2,6 m), alignée sur le grand
// terrain (15,5 m) : le terrain dessiné (monde.js) et le sol où l'on marche et roule (sol) sont les mêmes triangles,
// ici comme ailleurs.
import { lisse, bruit, mix } from './outils.js';

// Le relief naturel des collines (inchangé depuis le début : le monde lointain garde sa forme)
export function naturelle(x, z) {
  const r = Math.hypot(x, z);
  if (r < 192) return 0;
  const k = lisse((r - 192) / 150);
  const h = k * (14 + 34 * bruit(x * 0.007 + 3, z * 0.007 - 2) + 7 * bruit(x * 0.03, z * 0.03));
  return h * lisse((Math.abs(z - 10) - 9) / 50);
}
// Autour du château, les collines sont adoucies d'un tiers (sinon aucune route ne monte à moins de 15 %)
function adoucir(x, z) {
  const dx = Math.max(-320 - x, 0, x + 165), dz = Math.max(-345 - z, 0, z + 125);
  return 1 - 0.32 * (1 - lisse(Math.hypot(dx, dz) / 45));
}

/* ---------------------------------------------------------------- le château, la route
   Le château au sommet (centre x, z ; plateau aplani à y, sur un rayon plateau) ; la route du tour (rayon tour) ; la
   route du château, de la départementale au tour (points de passage, lissés). DEMI : demi-largeur de la chaussée ;
   VERGE : demi-largeur aplanie (chaussée et bas-côtés), assez large pour qu'aucun triangle de la grille fine qui touche
   la chaussée ne monte sur le talus. */
export const CHATEAU = { x: -280, z: -285, y: 31, tour: 32, plateau: 50 };
export const DEMI = 3, VERGE = 6.8, PENTE = 0.11;
const PASSAGES = [[-176, 6.5], [-176, -70], [-172, -120], [-160, -170], [-142, -220], [-132, -265], [-140, -305], [-175, -333], [-225, -345], [-265, -338], [CHATEAU.x, CHATEAU.z - CHATEAU.tour]];

// Catmull-Rom par les points de passage, rééchantillonné tous les mètres
const cr = (p0, p1, p2, p3, t, t2, t3) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
function echantillonner(P) {
  const pts = [], Q = [P[0], ...P, P[P.length - 1]];
  for (let i = 1; i < Q.length - 2; i++) {
    const a = Q[i - 1], b = Q[i], c = Q[i + 1], d = Q[i + 2], n = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) * 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      pts.push([cr(a[0], b[0], c[0], d[0], t, t2, t3), cr(a[1], b[1], c[1], d[1], t, t2, t3)]);
    }
  }
  pts.push(P[P.length - 1]);
  const out = [pts[0]];
  let reste = 1;
  for (let i = 1; i < pts.length; i++) {
    let [ax, az] = pts[i - 1];
    const [bx, bz] = pts[i];
    let d = Math.hypot(bx - ax, bz - az);
    while (d >= reste) { const t = reste / d; ax += (bx - ax) * t; az += (bz - az) * t; out.push([ax, az]); d -= reste; reste = 1; }
    reste -= d;
  }
  return out;
}

/* ---------------------------------------------------------------- la zone d'activités
   À l'est du bourg, de part et d'autre de la départementale (Teddy, 25/11/2026 : « plutôt dans une zone industrielle, une
   petite avec 2 ou 3 boîtes, à l'extérieur du village ») : l'imprimerie Saint-Vincent, le bureau de Solumatic, une
   tonnellerie (monde.js : zoneActivites) ; au nord de la route, la rue de la zone monte jusqu'à Solumatic, au fond (z
   jusqu'à -88). Ses bâtiments sont posés à y = 0 : le terrain y est à plat, raccordé aux collines sur 30 m (au nord-est,
   un talus). Le rectangle à plat déborde d'une maille du grand terrain (15,5 m) autour de ce qui est bâti : les mailles
   qui le touchent ont leurs quatre sommets à zéro. */
export const ZA = { x0: 186, x1: 258, z0: -100, z1: 62, bati: { x0: 186, x1: 250, z0: -89, z1: 49 } };
const plat = (x, z) => { const dx = Math.max(ZA.x0 - x, 0, x - ZA.x1), dz = Math.max(ZA.z0 - z, 0, z - ZA.z1); return 1 - lisse(Math.hypot(dx, dz) / 30); };
// un point (à m mètres près) de ce qui est bâti dans la zone : ni arbre des collines, ni balle de foin, ni herbe haute
export const dansZA = (x, z, m = 0) => x > ZA.bati.x0 - m && x < ZA.bati.x1 + m && z > ZA.bati.z0 - m && z < ZA.bati.z1 + m;

// Le relief avant la route : collines adoucies, plateau du château aplani (talus d'autant plus large que l'écart est grand),
// la zone d'activités à plat
export function avantRoute(x, z) {
  let h = naturelle(x, z) * adoucir(x, z);
  if (x > ZA.x0 - 40) h *= 1 - plat(x, z);
  const C = CHATEAU, d = Math.hypot(x - C.x, z - C.z);
  if (d < C.plateau + 40) { const W = Math.min(30, 10 + 1.2 * Math.abs(h - C.y)); h = mix(C.y, h, lisse((d - C.plateau) / W)); }
  return h;
}

// La route : x, z, y (hauteur de la chaussée) de chaque mètre ; profil : le relief lissé, la pente bornée, à plat dans
// la zone de jeu, au niveau du plateau en arrivant
const S = echantillonner(PASSAGES), N = S.length;
export const ROUTE = { x: new Float32Array(N), z: new Float32Array(N), y: new Float32Array(N), n: N };
{
  const R = ROUTE, hn = new Float64Array(N), C = CHATEAU;
  for (let i = 0; i < N; i++) { R.x[i] = S[i][0]; R.z[i] = S[i][1]; hn[i] = avantRoute(S[i][0], S[i][1]); }
  // hauteurs imposées : à plat dans la zone de jeu, le plateau en arrivant (NaN : libre)
  const fixe = new Float64Array(N);
  for (let i = 0; i < N; i++) fixe[i] = Math.hypot(R.x[i], R.z[i]) < 188 ? 0 : Math.hypot(R.x[i] - C.x, R.z[i] - C.z) < C.plateau - 4 ? C.y : NaN;
  const fixer = y => { for (let i = 0; i < N; i++) if (fixe[i] === fixe[i]) y[i] = fixe[i]; };
  const lisser = (y, k) => { const o = new Float64Array(N); for (let i = 0; i < N; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - k); j <= Math.min(N - 1, i + k); j++) { s += y[j]; c++; } o[i] = s / c; } return o; };
  const borner = (y, n) => {
    for (let passe = 0, bouge = 1; passe < n && bouge > 1e-5; passe++) {
      bouge = 0;
      for (let i = 0; i < N; i++) if (fixe[i] === fixe[i]) { bouge = Math.max(bouge, Math.abs(y[i] - fixe[i])); y[i] = fixe[i]; }
      for (let i = 1; i < N; i++) { if (fixe[i] === fixe[i]) continue; const v = Math.min(Math.max(y[i], y[i - 1] - PENTE), y[i - 1] + PENTE); bouge = Math.max(bouge, Math.abs(v - y[i])); y[i] = v; }
      for (let i = N - 2; i >= 0; i--) { if (fixe[i] === fixe[i]) continue; const v = Math.min(Math.max(y[i], y[i + 1] - PENTE), y[i + 1] + PENTE); bouge = Math.max(bouge, Math.abs(v - y[i])); y[i] = v; }
    }
  };
  let y = lisser(hn, 20);
  borner(y, 300);
  // raccords en douceur (courbes en long), et de nouveau la pente bornée jusqu'au plateau
  for (let k = 0; k < 3; k++) { y = lisser(y, 8); fixer(y); }
  borner(y, 60); fixer(y);
  for (let i = 0; i < N; i++) R.y[i] = y[i];
}

// Le point de la route le plus proche (à moins de portee m) : rend sa distance (ou Infinity), son indice et sa hauteur
// dans PROCHE. Les échantillons sont rangés dans une grille de 12 m.
const CASE = 12, CASES = new Map();
for (let i = 0; i < N; i++) {
  const k = Math.floor(ROUTE.x[i] / CASE) * 4096 + Math.floor(ROUTE.z[i] / CASE);
  let l = CASES.get(k); if (!l) CASES.set(k, l = []); l.push(i);
}
export const PROCHE = { d: Infinity, i: 0, y: 0 };
export function procheRoute(x, z, portee) {
  const P = PROCHE, n = Math.ceil(portee / CASE), cx = Math.floor(x / CASE), cz = Math.floor(z / CASE);
  let d2 = portee * portee, best = -1;
  for (let a = cx - n; a <= cx + n; a++) for (let b = cz - n; b <= cz + n; b++) {
    const l = CASES.get(a * 4096 + b);
    if (!l) continue;
    for (const i of l) { const dx = ROUTE.x[i] - x, dz = ROUTE.z[i] - z, e = dx * dx + dz * dz; if (e < d2) { d2 = e; best = i; } }
  }
  P.i = best; P.d = best < 0 ? Infinity : Math.sqrt(d2); P.y = best < 0 ? 0 : ROUTE.y[best];
  return P;
}

// Le relief retouché, en un point : la route posée sur le relief, ses talus (d : distance à l'axe, y : hauteur de la
// chaussée au plus près)
const PORTEE = VERGE + 26;
const talus = (h, d, y) => d < PORTEE ? mix(y, h, lisse((d - VERGE) / Math.min(24, 4 + 1.4 * Math.abs(h - y)))) : h;
export function forme(x, z) {
  const h = avantRoute(x, z);
  if (x > -90 || x < -300 || z < -380 || (z > -70 && (x > -140 || x < -212))) return h; // loin de la route
  const q = procheRoute(x, z, PORTEE);
  return talus(h, q.d, q.y);
}

/* ---------------------------------------------------------------- les grilles
   Le grand terrain : 1 700 m de côté, 110 mailles (monde.js) ; sommet (i, j) en x = -850 + i x PAS, z = -850 + j x PAS ;
   chaque maille coupée en deux triangles par la diagonale qui va de (i, j + 1) à (i + 1, j) (celle de PlaneGeometry). La
   grille fine couvre les mailles i0..i1, j0..j1 du grand terrain, chacune en FIN x FIN ; ses sommets du bord suivent les
   arêtes du grand terrain (pas de fente entre les deux). */
export const GRAND = { taille: 1700, n: 110 };
const PAS = GRAND.taille / GRAND.n, BORD = -GRAND.taille / 2;
export const FIN = 6;
export const ZONE = { i0: 32, i1: 49, j0: 31, j1: 50 };
ZONE.x0 = BORD + ZONE.i0 * PAS; ZONE.x1 = BORD + ZONE.i1 * PAS; ZONE.z0 = BORD + ZONE.j0 * PAS; ZONE.z1 = BORD + ZONE.j1 * PAS;
ZONE.nx = (ZONE.i1 - ZONE.i0) * FIN; ZONE.nz = (ZONE.j1 - ZONE.j0) * FIN; ZONE.pas = PAS / FIN;
// hauteurs de la grille fine, sommet (a, b) en GRILLE[b * (nx + 1) + a]
export const GRILLE = new Float32Array((ZONE.nx + 1) * (ZONE.nz + 1));
{
  const Z = ZONE, L = Z.nx + 1, D2 = new Float32Array(GRILLE.length).fill(Infinity), YR = new Float32Array(GRILLE.length);
  // la route la plus proche de chaque sommet, d'un seul balayage : chaque mètre de route marque les sommets à sa portée
  for (let i = 0; i < N; i++) {
    const x = ROUTE.x[i], z = ROUTE.z[i];
    const a0 = Math.max(0, Math.ceil((x - PORTEE - Z.x0) / Z.pas)), a1 = Math.min(Z.nx, Math.floor((x + PORTEE - Z.x0) / Z.pas));
    const b0 = Math.max(0, Math.ceil((z - PORTEE - Z.z0) / Z.pas)), b1 = Math.min(Z.nz, Math.floor((z + PORTEE - Z.z0) / Z.pas));
    for (let b = b0; b <= b1; b++) {
      const dz = Z.z0 + b * Z.pas - z;
      for (let a = a0; a <= a1; a++) { const dx = Z.x0 + a * Z.pas - x, d2 = dx * dx + dz * dz, k = b * L + a; if (d2 < D2[k]) { D2[k] = d2; YR[k] = ROUTE.y[i]; } }
    }
  }
  for (let b = 0; b <= Z.nz; b++) for (let a = 0; a <= Z.nx; a++) {
    const x = Z.x0 + a * Z.pas, z = Z.z0 + b * Z.pas;
    let h;
    if (a === 0 || a === Z.nx || b === 0 || b === Z.nz) {
      // sur le bord : sur l'arête du grand terrain, entre ses deux sommets
      const bordX = a === 0 || a === Z.nx, k = (bordX ? b : a) % FIN, t = k / FIN, m = Math.floor((bordX ? b : a) / FIN);
      if (bordX) h = mix(forme(x, Z.z0 + m * PAS), forme(x, Z.z0 + (m + 1) * PAS), t);
      else h = mix(forme(Z.x0 + m * PAS, z), forme(Z.x0 + (m + 1) * PAS, z), t);
      if (k === 0) h = forme(x, z);
    } else { const k = b * L + a; h = talus(avantRoute(x, z), Math.sqrt(D2[k]), YR[k]); }
    GRILLE[b * L + a] = h;
  }
}

// hauteur dans une maille (fx, fz entre 0 et 1), sommets ha (0,0), hd (1,0), hb (0,1), hc (1,1)
const maille = (ha, hd, hb, hc, fx, fz) => fx + fz <= 1 ? ha + (hd - ha) * fx + (hb - ha) * fz : hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);

// Le sol où l'on marche et roule (et où l'on pose les arbres) : les triangles mêmes du terrain dessiné
export function sol(x, z) {
  const Z = ZONE;
  if (x > Z.x0 && x < Z.x1 && z > Z.z0 && z < Z.z1) {
    const u = (x - Z.x0) / Z.pas, v = (z - Z.z0) / Z.pas, a = Math.min(Z.nx - 1, Math.floor(u)), b = Math.min(Z.nz - 1, Math.floor(v)), L = Z.nx + 1, k = b * L + a;
    return maille(GRILLE[k], GRILLE[k + 1], GRILLE[k + L], GRILLE[k + L + 1], u - a, v - b);
  }
  if (x * x + z * z < 170 * 170) return 0; // au cœur du monde, tout est plat
  const u = (x - BORD) / PAS, v = (z - BORD) / PAS, i = Math.floor(u), j = Math.floor(v);
  const x0 = BORD + i * PAS, z0 = BORD + j * PAS;
  return maille(forme(x0, z0), forme(x0 + PAS, z0), forme(x0, z0 + PAS), forme(x0 + PAS, z0 + PAS), u - i, v - j);
}

/* ---------------------------------------------------------------- où l'on peut aller
   Partout, collines comprises (Teddy, 24/11/2026 : « on doit pouvoir aller partout, dans l'herbe et tout »), jusqu'à
   MONDE mètres du centre : au-delà, la brume, et plus rien à voir. Les obstacles sont dans collisions.js (les maisons du
   village du château, ses murs, les arbres des collines). SORTIE : le point permis le plus proche et la normale. */
export const MONDE = 470;
export const LARGE = VERGE - 0.8; // demi-largeur de la chaussée et de ses bas-côtés, de part et d'autre de l'axe de la route
// la cour du château et son allée (repère du château : x vers l'est, z vers le sud), en gravier
export const COUR = [[-10, -14, 10, 0.5], [-3.6, -30, 3.6, -14]];
export const SORTIE = { x: 0, z: 0, nx: 0, nz: 0 };
export function permis(x, z, r = 0) { return x * x + z * z < (MONDE - r) * (MONDE - r); }
export function ramener(x, z, r) {
  const d = Math.hypot(x, z) || 1, k = (MONDE - r - 0.01) / d, S = SORTIE;
  S.x = x * k; S.z = z * k; S.nx = -x / d; S.nz = -z / d;
  return Math.max(0, d - (MONDE - r));
}

// Ce que la route et le château réservent (pas d'arbre des collines, pas de balle de foin) : marge en mètres
export function reserve(x, z, marge = 0) {
  const C = CHATEAU;
  if (Math.hypot(x - C.x, z - C.z) < C.plateau + 12 + marge) return true;
  return procheRoute(x, z, VERGE + 6 + marge).d < VERGE + 6 + marge;
}
// la chaussée (pour la nature du sol) : 'asphalte' sur la route du château, 'paves' sur le tour, null ailleurs
export function chaussee(x, z) {
  const C = CHATEAU, d = Math.hypot(x - C.x, z - C.z);
  if (d < C.plateau + 2) {
    if (Math.abs(d - C.tour) < DEMI) return 'paves';
    const dx = x - C.x, dz = z - C.z;
    for (const [x0, z0, x1, z1] of COUR) if (dx > x0 && dx < x1 && dz > z0 && dz < z1) return 'gravier';
  }
  if (x > ZONE.x1 + 30 || z > -60 && (x > -170 || x < -182)) return null;
  return procheRoute(x, z, DEMI + 0.4).d < DEMI + 0.2 ? 'asphalte' : null;
}
