// L'enjambeur du domaine (mission 2 : la journée de traitement ; Teddy, 24/11/2026 : « un enjambeur, aussi détaillé que le
// tracteur. C'est avec ça qu'on pulvérise, avec une extension »). Un tracteur vigneron en portique, qui enjambe un rang :
// ses quatre roues roulent au milieu des deux inter-rangs voisins (voie de 2,2 m : l'écartement des rangs du jeu), le rang
// passe sous le portique (2,3 m de garde au sol ; les vignes du jeu montent à 1,9 m, les piquets de tête à 2,1 m). En haut,
// la cabine vitrée à l'avant (une vitre basse, devant les pieds, montre le rang sous le conducteur), le moteur derrière
// elle, la cuve du pulvérisateur à l'arrière ; une échelle et un palier à gauche pour monter. Les roues avant tournent
// autour de leur jambe (le pivot est dans la jambe, la roue déportée vers l'extérieur).
// Le pulvérisateur, l'« extension » : la cuve, une soufflerie à l'arrière et ses gaines, une rampe qui porte deux descentes
// de part et d'autre du rang enjambé, et deux bras qui se déplient pour porter celles des deux rangs voisins (face par
// face : trois rangs traités à chaque passage) ; repliés le long du portique sur la route (deplierEnjambeur).
// Couleurs et formes originales (bleu canard et crème, sans marque). Repère : avant vers +z, +x à gauche, origine au sol
// au milieu de l'empattement (comme le tracteur, engins.js).
import * as THREE from 'three';
import { B, C, T, MAT, MAT_VITRE, fusion, teinter, deplacer } from './modeles.js';
import { Atelier, bloc, barre, coque, decor, fond, plaque, pneuAgricole, eclairage, feuxDomaine, gyrophare, VITRE } from './engins.js';

const TAU = Math.PI * 2;
// voie (demi), rayon des roues, position des essieux, jambes (x), bas du portique, dessus du plancher
const VOIE = 1.1, R = 0.5, ZR = -1.25, ZV = 1.25, XJ = 0.86, YP = 2.3, YD = 2.5;
// la cabine : côtés, arrière, avant au plancher et au toit, toit
const XC = 0.8, ZC0 = 0.36, ZC1 = 1.98, ZC1H = 1.84, YT = 4.04;
// la rampe et ses bras : hauteur, position le long de l'axe, charnières des bras ; descentes (x) du rang enjambé et des
// rangs voisins (de part et d'autre de chaque rang, à 0,55 m de son axe)
const YR = 2.4, ZRA = -2.32, XCH = 1.32, DESC = [0.55, 1.65, 2.75];
const LADDER = { x: 1.36, z0: 0.13, z1: 0.57, pas: 0.3 };

// Un garde-boue en arc au-dessus d'une roue (centre cx, cy, cz ; demi-largeur w ; rayon r), avec son rebord
function gardeBoue(at, cx, cy, cz, w, r, col, ty) {
  const arc = [];
  for (let i = 0; i <= 10; i++) { const f = (24 + i * 132 / 10) * Math.PI / 180; arc.push([cz + r * Math.cos(f), cy + r * Math.sin(f), f]); }
  for (let i = 0; i < arc.length - 1; i++) {
    const [za, ya, fa] = arc[i], [zb, yb] = arc[i + 1], n = [0, Math.sin(fa), Math.cos(fa)];
    at.quad([cx - w, ya, za], [cx + w, ya, za], [cx + w, yb, zb], [cx - w, yb, zb], col, ty, n);
    at.quad([cx - w, ya - 0.02, za], [cx + w, ya - 0.02, za], [cx + w, yb - 0.02, zb], [cx - w, yb - 0.02, zb], '#1e1e22', 0, [0, -n[1], -n[2]]);
    const k = (r - 0.06) / r;
    for (const s of [1, -1]) at.quad([cx + s * w, ya, za], [cx + s * w, yb, zb], [cx + s * w, cy + (yb - cy) * k, cz + (zb - cz) * k], [cx + s * w, cy + (ya - cy) * k, cz + (za - cz) * k], col, ty, [s, 0, 0]);
  }
}

export function enjambeur() {
  const groupe = new THREE.Group();
  const caisse = new THREE.Group(); groupe.add(caisse);
  const CANARD = '#25656e', CANARD_F = '#1c4c53', CREME = '#efe3c6', GRIS = '#3b3d44', FONCE = '#2b2c31', NOIR = '#1e1e22';
  const ACIER = '#5d6b78', BLANC = '#eef0ec', PEINT = T.carrosserie;
  const at = new Atelier(), atV = new Atelier(), corps = [];
  const peint = (g, c = CANARD) => teinter(g, c, PEINT);

  /* -- le portique : deux longerons au-dessus des roues, trois traverses, le plancher par-dessus (le rang passe dessous) ;
     goussets aux jambes, filet crème le long des longerons */
  for (const s of [1, -1]) {
    corps.push(peint(B(0.16, 0.16, 4.17, CANARD, s * XJ, YP + 0.08, -0.035)));
    corps.push(peint(B(0.012, 0.035, 3.9, CREME, s * (XJ + 0.086), YP + 0.06, -0.035), CREME));
    for (const z of [ZR, ZV]) corps.push(peint(B(0.2, 0.28, 0.34, CANARD_F, s * XJ, YP - 0.1, z), CANARD_F));
  }
  corps.push(peint(B(1.88, 0.16, 0.16, CANARD, 0, YP + 0.08, 1.97)), peint(B(1.88, 0.16, 0.16, CANARD, 0, YP + 0.08, -2.04)));
  corps.push(B(1.72, 0.12, 0.12, GRIS, 0, YP + 0.06, 0.0));
  corps.push(B(1.9, 0.04, 4.17, FONCE, 0, YD - 0.02, -0.035));
  // la protection avant (une barre basse sous la traverse, pour écarter les sarments) et le crochet
  corps.push(B(1.5, 0.08, 0.08, NOIR, 0, YP - 0.08, 2.03), B(0.14, 0.1, 0.12, NOIR, 0, YP - 0.02, 2.1));

  /* -- les jambes arrière : le haut peint, le fourreau de suspension, le bas en acier, le moteur de roue au moyeu */
  for (const s of [1, -1]) {
    corps.push(peint(B(0.13, 1.22, 0.18, CANARD, s * XJ, 1.69, ZR)));
    corps.push(C(0.085, 0.085, 0.34, 8, '#9aa1a8', s * XJ, 0.98, ZR), C(0.1, 0.1, 0.06, 8, GRIS, s * XJ, 1.12, ZR));
    corps.push(B(0.1, 0.5, 0.14, FONCE, s * XJ, 0.68, ZR));
    corps.push(C(0.16, 0.16, 0.16, 10, GRIS, s * (XJ + 0.06), R, ZR, 'x'), C(0.09, 0.09, 0.05, 8, FONCE, s * (XJ + 0.16), R, ZR, 'x'));
    // le flexible hydraulique du moteur de roue, le long de la jambe
    barre(at, [s * (XJ - 0.08), 2.2, ZR - 0.06], [s * (XJ - 0.08), 0.62, ZR - 0.06], 0.012, NOIR, 0);
    // les garde-boue arrière, tenus par une console sur la jambe
    gardeBoue(at, s * VOIE, R, ZR, 0.17, 0.6, CANARD, PEINT);
    corps.push(B(0.2, 0.05, 0.06, FONCE, s * (XJ + 0.12), 1.06, ZR));
    // le haut des jambes avant (le bas tourne avec la roue : pivots)
    corps.push(peint(B(0.13, 1.12, 0.18, CANARD, s * XJ, 1.74, ZV)));
    corps.push(C(0.085, 0.085, 0.2, 8, '#9aa1a8', s * XJ, 1.12, ZV), C(0.1, 0.1, 0.06, 8, GRIS, s * XJ, 1.2, ZV));
  }

  /* -- la cabine : bandeau peint en bas, montants sombres, grandes vitres (une matière transparente : on voit le
     conducteur), vitre basse à l'avant pour voir le rang sous soi, porte à gauche côté échelle, toit débordant */
  const Y0 = YD, YB = YD + 0.16;
  const avZ = y => ZC1 + (ZC1H - ZC1) * (y - Y0) / (YT - Y0); // la face avant, un peu inclinée
  // le bandeau bas (côtés, arrière), le seuil avant sous la vitre basse
  for (const s of [1, -1]) at.quad([s * XC, Y0, ZC0], [s * XC, Y0, ZC1], [s * XC, YB, avZ(YB)], [s * XC, YB, ZC0], CANARD, PEINT, [s, 0, 0]);
  at.quad([XC, Y0, ZC0], [-XC, Y0, ZC0], [-XC, YB, ZC0], [XC, YB, ZC0], CANARD, PEINT, [0, 0, -1]);
  at.quad([XC, Y0, ZC1], [-XC, Y0, ZC1], [-XC, Y0 + 0.08, avZ(Y0 + 0.08)], [XC, Y0 + 0.08, avZ(Y0 + 0.08)], CANARD, PEINT, [0, 0.1, 1]);
  // le filet crème du bandeau, sur les côtés et à l'arrière
  plaque(at, 0.7, -0.7, Y0 + 0.07, Y0 + 0.1, ZC0 - 0.002, -1, CREME, PEINT, false);
  for (const s of [1, -1]) at.quad([s * (XC + 0.002), Y0 + 0.07, ZC0 + 0.1], [s * (XC + 0.002), Y0 + 0.07, ZC1 - 0.1], [s * (XC + 0.002), Y0 + 0.1, ZC1 - 0.1], [s * (XC + 0.002), Y0 + 0.1, ZC0 + 0.1], CREME, PEINT, [s, 0, 0]);
  // les montants : aux quatre coins, au milieu des côtés (derrière la porte à gauche), la traverse de la vitre basse
  for (const s of [1, -1]) {
    barre(at, [s * XC, Y0, ZC0], [s * XC, YT, ZC0], 0.035, FONCE, 0);
    barre(at, [s * XC, Y0, ZC1], [s * XC, YT, ZC1H], 0.035, FONCE, 0);
    barre(at, [s * XC, YB, 1.12], [s * XC, YT, 1.12], 0.025, FONCE, 0);
    barre(at, [s * XC, YB, ZC0], [s * XC, YB, avZ(YB)], 0.022, FONCE, 0);
  }
  barre(at, [XC, 2.98, avZ(2.98)], [-XC, 2.98, avZ(2.98)], 0.025, FONCE, 0);
  barre(at, [XC, YT - 0.02, ZC1H], [-XC, YT - 0.02, ZC1H], 0.03, FONCE, 0);
  barre(at, [XC, YT - 0.02, ZC0], [-XC, YT - 0.02, ZC0], 0.03, FONCE, 0);
  barre(at, [XC, YB, ZC0], [-XC, YB, ZC0], 0.022, FONCE, 0);
  // la porte (à gauche) : son cadre, sa poignée, sa charnière
  barre(at, [XC + 0.01, YB, 0.4], [XC + 0.01, YT - 0.05, 0.4], 0.018, FONCE, 0);
  barre(at, [XC + 0.01, YT - 0.05, 0.4], [XC + 0.01, YT - 0.05, 1.08], 0.018, FONCE, 0);
  corps.push(B(0.03, 0.03, 0.16, '#9aa1a8', XC + 0.03, 3.2, 1.0), B(0.04, 0.08, 0.04, FONCE, XC + 0.02, 3.4, 0.42), B(0.04, 0.08, 0.04, FONCE, XC + 0.02, 2.8, 0.42));
  // les vitres (transparentes) : les côtés (deux panneaux, la porte à gauche), l'arrière au-dessus du capot, l'avant en deux
  for (const s of [1, -1]) {
    atV.poly([[s * XC, YB, ZC0 + 0.04], [s * XC, YB, 1.1], [s * XC, YT - 0.04, 1.1], [s * XC, YT - 0.04, ZC0 + 0.04]], VITRE, undefined, [s, 0, 0]);
    atV.poly([[s * XC, YB, 1.14], [s * XC, YB, avZ(YB) - 0.04], [s * XC, YT - 0.04, avZ(YT) - 0.04], [s * XC, YT - 0.04, 1.14]], VITRE, undefined, [s, 0, 0]);
  }
  atV.poly([[XC - 0.04, 3.5, ZC0], [-XC + 0.04, 3.5, ZC0], [-XC + 0.04, YT - 0.04, ZC0], [XC - 0.04, YT - 0.04, ZC0]], VITRE, undefined, [0, 0, -1]);
  atV.poly([[XC - 0.04, Y0 + 0.09, avZ(Y0 + 0.09)], [-XC + 0.04, Y0 + 0.09, avZ(Y0 + 0.09)], [-XC + 0.04, 2.96, avZ(2.96)], [XC - 0.04, 2.96, avZ(2.96)]], VITRE, undefined, [0, 0.1, 1]);
  atV.poly([[XC - 0.04, 3.0, avZ(3.0)], [-XC + 0.04, 3.0, avZ(3.0)], [-XC + 0.04, YT - 0.04, avZ(YT - 0.04)], [XC - 0.04, YT - 0.04, avZ(YT - 0.04)]], VITRE, undefined, [0, 0.1, 1]);
  // l'essuie-glace, au bas du pare-brise
  barre(at, [0.05, 3.03, avZ(3.03) + 0.02], [0.5, 3.45, avZ(3.45) + 0.02], 0.008, NOIR, 0);
  // le toit débordant (peint, dessus crème), le bloc de climatisation, l'antenne
  bloc(at, [[0.88, YT, 0.26], [-0.88, YT, 0.26], [-0.88, YT, 2.06], [0.88, YT, 2.06], [0.86, YT + 0.1, 0.28], [-0.86, YT + 0.1, 0.28], [-0.86, YT + 0.1, 2.02], [0.86, YT + 0.1, 2.02]], CANARD, PEINT);
  corps.push(peint(B(1.6, 0.025, 1.66, CREME, 0, YT + 0.112, 1.15), CREME));
  corps.push(B(0.9, 0.16, 0.5, BLANC, 0, YT + 0.2, 0.62), B(0.6, 0.02, 0.36, '#9aa1a8', 0, YT + 0.29, 0.62));
  corps.push(C(0.006, 0.01, 0.3, 4, NOIR, -0.62, YT + 0.25, 0.5));
  // les phares de travail, aux quatre coins du toit
  for (const s of [1, -1]) for (const [z, sz] of [[2.08, 1], [0.24, -1]]) {
    corps.push(B(0.14, 0.09, 0.08, FONCE, s * 0.6, YT + 0.02, z));
    plaque(at, s * 0.55, s * 0.65, YT - 0.01, YT + 0.05, z + sz * 0.042, sz, '#f4efe2', T.vitre, false);
  }

  /* -- dans la cabine : plancher, siège à suspension, accoudoir et sa manette, console et écran, colonne de direction,
     pédales */
  corps.push(B(1.5, 0.02, 1.55, NOIR, 0, YD + 0.01, 1.17));
  corps.push(B(0.3, 0.2, 0.3, NOIR, 0, YD + 0.12, 0.62), B(0.5, 0.1, 0.48, '#2a2a2e', 0, 2.92, 0.64));
  bloc(at, [[-0.24, 2.97, 0.47], [0.24, 2.97, 0.47], [0.24, 2.97, 0.36], [-0.24, 2.97, 0.36], [-0.22, 3.58, 0.41], [0.22, 3.58, 0.41], [0.22, 3.58, 0.3], [-0.22, 3.58, 0.3]], '#2a2a2e', 0);
  corps.push(B(0.3, 0.14, 0.08, '#2a2a2e', 0, 3.68, 0.34));
  for (const s of [1, -1]) corps.push(B(0.07, 0.06, 0.36, '#2a2a2e', s * 0.29, 3.1, 0.66));
  corps.push(B(0.12, 0.08, 0.16, '#26282c', -0.31, 3.16, 0.8), C(0.022, 0.02, 0.1, 6, '#1a1b1e', -0.31, 3.24, 0.82), C(0.03, 0.03, 0.03, 8, '#c0392b', -0.31, 3.3, 0.82));
  bloc(at, [[-0.7, YD, 1.62], [0.7, YD, 1.62], [0.7, YD, 1.95], [-0.7, YD, 1.95], [-0.7, 2.98, 1.7], [0.7, 2.98, 1.7], [0.7, 2.98, 1.86], [-0.7, 2.98, 1.86]], '#26282c', 0);
  at.quad([0.18, 2.99, 1.72], [-0.18, 2.99, 1.72], [-0.18, 3.13, 1.68], [0.18, 3.13, 1.68], '#3d5f7e', T.vitre, [0, 0.6, -1]);
  barre(at, [0, 2.95, 1.6], [0, 3.32, 1.17], 0.028, '#222', 0);
  for (const s of [1, -1]) { const p = B(0.09, 0.02, 0.13, '#4a4c54'); p.rotateX(-0.6); corps.push(deplacer(p, s * 0.16, YD + 0.12, 1.42)); }

  /* -- le palier et l'échelle, à gauche : le plancher du palier (caillebotis), son garde-corps, l'échelle et ses
     montants qui remontent en mains courantes ; la réserve d'eau claire pour se laver les mains */
  corps.push(B(0.62, 0.04, 1.08, FONCE, 1.13, YD - 0.02, 0.23));
  for (let z = -0.28; z < 0.76; z += 0.08) corps.push(B(0.6, 0.006, 0.02, '#4a4c54', 1.13, YD + 0.002, z));
  corps.push(B(0.06, 0.18, 1.04, GRIS, 1.13, YD - 0.12, 0.23));
  barre(at, [1.42, YD, -0.3], [1.42, YD + 1.0, -0.3], 0.02, '#e0b12a', 0);
  barre(at, [1.42, YD + 1.0, -0.3], [1.42, YD + 1.0, 0.08], 0.02, '#e0b12a', 0);
  barre(at, [1.42, YD + 0.5, -0.3], [1.42, YD + 0.5, 0.08], 0.016, '#e0b12a', 0);
  barre(at, [1.42, YD + 1.0, -0.3], [XC + 0.03, YD + 1.0, -0.3], 0.02, '#e0b12a', 0);
  barre(at, [XC + 0.05, 2.75, ZC0 + 0.03], [XC + 0.05, 3.6, ZC0 + 0.03], 0.016, '#e0b12a', 0); // poignée, à l'entrée de la porte
  {
    const { x, z0, z1, pas } = LADDER;
    for (const z of [z0, z1]) {
      barre(at, [x, 0.18, z], [x, YD + 0.95, z], 0.022, '#9aa1a8', 0);
      barre(at, [x, YD + 0.95, z], [XC + 0.32, YD + 0.95, z], 0.02, '#9aa1a8', 0);
    }
    for (let y = 0.3; y < YD - 0.1; y += pas) barre(at, [x, y, z0], [x, y, z1], 0.017, '#c4c8cd', 0);
    // ses attaches au palier et au longeron
    barre(at, [x, YD - 0.04, z0], [XJ + 0.08, YD - 0.12, z0], 0.016, GRIS, 0);
    barre(at, [x, YD - 0.04, z1], [XJ + 0.08, YD - 0.12, z1], 0.016, GRIS, 0);
  }
  corps.push(B(0.36, 0.44, 0.26, BLANC, 1.16, YD + 0.24, -0.16), C(0.06, 0.06, 0.04, 8, '#2f6db0', 1.16, YD + 0.48, -0.16), C(0.012, 0.012, 0.1, 6, '#9aa1a8', 1.16, YD + 0.1, -0.02, 'z'));

  /* -- le moteur, derrière la cabine : un capot en sections arrondies, ses ouïes, la cheminée d'échappement (pare-chaleur,
     chapeau), le préfiltre à air, le bouchon de réservoir */
  const zsM = [-0.88, -0.82, 0.24, 0.3];
  const capot = coque(at, zsM, (z, i) => {
    const k = i === 0 || i === 3 ? 0.9 : 1, t = i === 0 || i === 3 ? 0.04 : 0;
    return [[0, 3.42 - t], [0.5 * k, 3.42 - t], [0.66 * k, 3.36 - t], [0.74 * k, 3.22 - t], [0.74 * k, YD]];
  }, () => [CANARD, PEINT], false);
  fond(at, capot.A[0], CANARD, PEINT, -1); fond(at, capot.A[3], CANARD, PEINT, 1);
  decor(at, capot, 3, -0.66, 0.08, 0.12, 0.78, 0.004, '#232428', 0);
  for (let z = -0.62; z < 0.06; z += 0.07) decor(at, capot, 3, z, z + 0.024, 0.12, 0.78, 0.007, '#4a4c54', PEINT);
  decor(at, capot, 3, -0.82, 0.24, 0.84, 0.9, 0.003, CREME, PEINT);
  corps.push(C(0.05, 0.05, 0.04, 8, FONCE, 0.3, 3.44, 0.0));
  corps.push(C(0.06, 0.06, 1.0, 8, '#26272b', -0.52, 3.72, -0.6), C(0.085, 0.085, 0.42, 10, '#5a5d66', -0.52, 3.56, -0.6));
  { const ch = B(0.13, 0.012, 0.13, '#26272b'); ch.rotateX(0.5); corps.push(deplacer(ch, -0.52, 4.24, -0.62)); }
  corps.push(C(0.075, 0.075, 0.36, 8, FONCE, 0.52, 3.6, -0.05), C(0.11, 0.08, 0.12, 8, '#4a4c54', 0.52, 3.84, -0.05));

  /* -- les feux : phares de route aux bouts de la traverse avant, clignotants ; feux arrière (rouge et orange) aux bouts
     de la traverse arrière ; le gyrophare sur le toit */
  for (const s of [1, -1]) {
    corps.push(B(0.18, 0.13, 0.08, FONCE, s * 0.62, YP + 0.0, 2.08), B(0.06, 0.05, 0.03, '#d07a22', s * 0.78, YP + 0.0, 2.1));
    plaque(at, s * 0.55, s * 0.69, YP - 0.05, YP + 0.05, 2.122, 1, '#f4efe2', T.vitre, false);
    corps.push(B(0.06, 0.12, 0.2, '#24262a', s * 0.86, YP - 0.08, -2.15), B(0.02, 0.08, 0.07, '#9a1820', s * 0.89, YP - 0.08, -2.2), B(0.02, 0.08, 0.07, '#d07a22', s * 0.89, YP - 0.08, -2.11));
    corps.push(B(0.12, 0.06, 0.02, '#ecebe3', s * 0.55, YP - 0.08, -2.13)); // feu de recul
  }
  corps.push(C(0.07, 0.08, 0.04, 10, FONCE, 0.5, YT + 0.14, 0.62 + 0.0), C(0.055, 0.06, 0.1, 10, '#e88a2a', 0.5, YT + 0.21, 0.62));
  // les rétroviseurs, au bout de leurs bras, de part et d'autre du pare-brise
  for (const s of [1, -1]) {
    barre(at, [s * XC, 3.72, 1.86], [s * 1.12, 3.8, 1.88], 0.014, FONCE, 0);
    corps.push(B(0.04, 0.24, 0.16, FONCE, s * 1.14, 3.7, 1.88));
    at.quad([s * 1.13, 3.6, 1.8], [s * 1.13, 3.8, 1.8], [s * 1.13, 3.8, 1.96], [s * 1.13, 3.6, 1.96], '#8ea2b4', T.vitre, [0, 0, -1]);
  }

  /* -- le pulvérisateur, l'« extension » (m.pulve) : la cuve, la soufflerie et ses gaines, la rampe et les deux descentes du
     rang enjambé (fondues avec la caisse : un appel de dessin de moins) ; les deux bras (sur leurs charnières) et les
     descentes des rangs voisins. Une descente : un tube, sa gaine, deux mains de pulvérisation tournées vers le rang
     qu'elle traite. */
  const pulve = pulverisateurEnjambeur(caisse, corps, { BLANC, NOIR, ACIER, GRIS, CANARD_F, PEINT });

  const c = new THREE.Mesh(fusion([...at.geos(), ...corps]), MAT); c.castShadow = true; c.receiveShadow = true; caisse.add(c);
  const vitres = new THREE.Mesh(fusion(atV.geos()), MAT_VITRE); vitres.receiveShadow = true; caisse.add(vitres);

  // le volant : incliné vers le conducteur, il tourne autour de sa colonne (tm.volant.rotation.y)
  const volantCentre = new THREE.Vector3(0, 3.34, 1.14), volantInclinaison = -0.55;
  const support = new THREE.Group(); support.position.copy(volantCentre); support.rotation.x = volantInclinaison; caisse.add(support);
  const volant = new THREE.Mesh(fusion([
    teinter(new THREE.TorusGeometry(0.18, 0.021, 4, 14).rotateX(Math.PI / 2), '#1f1f23'),
    B(0.34, 0.024, 0.04, '#2a2a2e'), B(0.04, 0.024, 0.19, '#2a2a2e', 0, 0, -0.085), C(0.045, 0.045, 0.05, 8, CANARD, 0, 0.01, 0),
  ]), MAT);
  support.add(volant);

  /* -- les roues : à l'arrière sur le châssis ; à l'avant, chacune sur un pivot dans sa jambe (la roue déportée vers
     l'extérieur, le bas de la jambe et le garde-boue tournent avec elle), les deux pivots sur un essieu qui oscille */
  const mk = (geo, parent, x, y, z) => { const m = new THREE.Mesh(geo, MAT); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const P = [pneuAgricole(R, 0.26, 18, 1, 14), pneuAgricole(R, 0.26, 18, -1, 14)];
  const rouesAr = [mk(P[0], groupe, VOIE, R, ZR), mk(P[1], groupe, -VOIE, R, ZR)];
  const essieu = new THREE.Group(); essieu.position.set(0, R, ZV); groupe.add(essieu);
  const pivots = [1, -1].map(s => { const p = new THREE.Group(); p.position.set(s * XJ, 0, 0); essieu.add(p); return p; });
  const rouesAv = [mk(P[0], pivots[0], VOIE - XJ, 0, 0), mk(P[1], pivots[1], -(VOIE - XJ), 0, 0)];
  [1, -1].forEach((s, i) => {
    const atJ = new Atelier();
    gardeBoue(atJ, s * (VOIE - XJ), 0, 0, 0.17, 0.6, CANARD, PEINT);
    const g = [...atJ.geos(), B(0.1, 0.66, 0.14, FONCE, 0, 0.3, 0), C(0.16, 0.16, 0.16, 10, GRIS, s * 0.06, 0, 0, 'x'), B(0.2, 0.05, 0.06, FONCE, s * 0.12, 0.56, 0)];
    pivots[i].add(new THREE.Mesh(fusion(g), MAT)); // (sans ombre portée : sous le portique, elle ne se voit pas)
  });

  // emprise au sol (repère de la caisse) : tout l'enjambeur, bras repliés compris (gestes.js : on le contourne)
  const dims = {
    rAr: R, rAv: R, yAr: R, yAv: R, emp: ZV - ZR, off: [1.15, -1.15], r: 1.3, pivot: new THREE.Vector3(0, 0.55, 0),
    zAr: ZR, zAv: ZV, xAr: VOIE, xAv: VOIE, assise: 2.97, plancher: YD + 0.05,
    emprise: [[-1.36, 1.46, -2.45, 2.18]],
  };
  // la montée (gestes.js : MONTEES.enjambeur) : l'échelle (ses montants, l'écart de ses barreaux, combien), le palier, la
  // porte de la cabine et sa poignée
  let barreaux = 0; for (let y = 0.3; y < YD - 0.1; y += LADDER.pas) barreaux++; // (comme on les a posés)
  const montee = {
    genre: 'enjambeur', echelle: { ...LADDER, n: barreaux }, palier: YD,
    porte: { x: XC, z: ZC0 }, poignee: [XC + 0.06, 3.05, ZC0 + 0.03],
  };
  return {
    groupe, caisse, rouesAr, rouesAv, pivots, essieu, volant, siege: new THREE.Vector3(0, 2.97 - 0.88, 0.62),
    dims, volantCentre, volantRayon: 0.18, volantInclinaison, montee, plafond: () => YT - 0.03,
    echappement: [-0.52, 4.26, -0.62], pulve,
    phares: eclairage({ av: [0.62, YP, 2.13], ar: [0.9, YP - 0.08, -2.245] }, caisse, groupe),
    feux: feuxDomaine(caisse, [[0.03, 0.085, 0.075, 0.9, YP - 0.08, -2.2]], [[0.13, 0.065, 0.025, 0.55, YP - 0.08, -2.135]]),
    gyro: gyrophare(caisse, 0.5, YT + 0.21, 0.62),
  };
}

// Le pulvérisateur de l'enjambeur : ce qui ne bouge pas va dans fixe (fondu avec la caisse) ; le groupe (enfant de la
// caisse, à son origine : sa matrixWorld place les buses) porte les bras. Rend { groupe, bras, buses, z, demi,
// remplissage, ouvert }.
function pulverisateurEnjambeur(caisse, fixe, { BLANC, NOIR, ACIER, GRIS, CANARD_F, PEINT }) {
  const groupe = new THREE.Group(); caisse.add(groupe);
  const at = new Atelier(), corps = fixe;
  // la cuve de 1 000 L, à l'arrière du plancher : arrondie, ses deux sangles, son couvercle jaune (le point de remplissage),
  // sa jauge, sa vanne
  const zsC = [-2.1, -2.04, -0.98, -0.92];
  const cuve = coque(at, zsC, (z, i) => {
    const k = i === 0 || i === 3 ? 0.92 : 1, t = i === 0 || i === 3 ? 0.05 : 0;
    return [[0, 3.5 - t], [0.58 * k, 3.5 - t], [0.74 * k, 3.43 - t], [0.78 * k, 3.3 - t], [0.78 * k, 2.6], [0.72 * k, YD]];
  }, () => [BLANC, PEINT], false);
  fond(at, cuve.A[0], BLANC, PEINT, -1); fond(at, cuve.A[3], BLANC, PEINT, 1);
  for (const z of [-1.82, -1.18]) for (let k = 0; k < 4; k++) decor(at, cuve, k, z, z + 0.05, 0, 1, 0.006, GRIS, 0);
  corps.push(C(0.17, 0.17, 0.06, 12, '#e0b12a', 0, 3.53, -1.5), B(0.2, 0.03, 0.03, '#b8901f', 0, 3.57, -1.5));
  corps.push(C(0.018, 0.018, 0.72, 6, '#cfe0ea', 0.79, 2.98, -1.02), B(0.04, 0.72, 0.012, '#2f6db0', 0.8, 2.98, -1.05));
  corps.push(C(0.05, 0.05, 0.12, 8, '#c0392b', -0.62, 2.62, -0.95, 'z'));
  // la soufflerie, derrière la cuve : sa volute, sa grille (des anneaux), son moyeu ; les gaines vers la rampe
  corps.push(C(0.46, 0.46, 0.28, 18, CANARD_F, 0, 2.98, -2.24, 'z'), C(0.4, 0.4, 0.02, 18, NOIR, 0, 2.98, -2.39, 'z'));
  for (const r of [0.12, 0.22, 0.32]) corps.push(C(r, r, 0.012, 16, '#5a5d66', 0, 2.98, -2.402, 'z'), C(r - 0.03, r - 0.03, 0.014, 16, NOIR, 0, 2.98, -2.402, 'z'));
  corps.push(C(0.07, 0.07, 0.06, 10, '#9aa1a8', 0, 2.98, -2.42, 'z'));
  for (const s of [1, -1]) {
    barre(at, [s * 0.36, 2.72, -2.28], [s * 0.9, YR + 0.05, ZRA], 0.055, NOIR, 0);
    barre(at, [s * 0.9, YR + 0.05, ZRA], [s * (XCH - 0.06), YR + 0.05, ZRA], 0.05, NOIR, 0);
  }
  // la rampe (fixe jusqu'aux charnières des bras), ses deux attaches à la traverse arrière
  corps.push(B(2 * XCH, 0.08, 0.08, ACIER, 0, YR, ZRA));
  for (const s of [1, -1]) corps.push(B(0.08, 0.1, 0.3, ACIER, s * 0.62, YR, ZRA + 0.16), B(0.12, 0.16, 0.12, NOIR, s * XCH, YR, ZRA));
  // une descente en x, de la rampe (YR) à 0,55 m du sol, ses mains tournées vers s (le rang qu'elle traite) ; dy : la
  // hauteur du repère où on la pose (0 pour le groupe, YR pour un bras)
  const descente = (L, x, z, s, dy) => {
    L.push(B(0.05, YR - 0.55, 0.05, ACIER, x, (YR + 0.55) / 2 - dy, z), C(0.022, 0.022, YR - 0.75, 6, NOIR, x - s * 0.05, (YR + 0.75) / 2 - dy, z + 0.03));
    for (const y of [0.85, 1.32]) L.push(B(0.12, 0.09, 0.15, NOIR, x + s * 0.05, y - dy, z), B(0.02, 0.07, 0.11, '#d8dde2', x + s * 0.115, y - dy, z));
    L.push(C(0.03, 0.03, 0.05, 6, '#e0b12a', x, 0.55 - dy, z));
  };
  for (const s of [1, -1]) descente(corps, s * DESC[0], ZRA, -s, 0);
  corps.push(...at.geos());
  // les bras : la poutre, sa membrure basse et ses diagonales, la gaine, les deux descentes ; sur leur charnière
  const bras = [1, -1].map(s => {
    const L = [], atB = new Atelier(), l = 1.6;
    L.push(B(l, 0.07, 0.07, ACIER, s * l / 2, 0, 0), B(l * 0.84, 0.035, 0.035, ACIER, s * l * 0.46, -0.2, 0));
    for (let k = 0; k < 4; k++) barre(atB, [s * (0.08 + k * 0.34), -0.2, 0], [s * (0.25 + k * 0.34), 0, 0], 0.014, ACIER, 0);
    barre(atB, [s * 0.04, 0.06, 0.04], [s * (DESC[2] - XCH), 0.06, 0.04], 0.035, NOIR, 0);
    descente(L, s * (DESC[1] - XCH), 0, s, YR);
    descente(L, s * (DESC[2] - XCH), 0, -s, YR);
    const ch = new THREE.Group(); ch.position.set(s * XCH, YR, ZRA); ch.userData.s = s; groupe.add(ch);
    ch.add(new THREE.Mesh(fusion([...atB.geos(), ...L]), MAT)); // (tubes fins : sans ombre portée)
    return ch;
  });
  // les buses (repère du groupe, bras dépliés) : une par descente, à mi-hauteur des feuilles
  const buses = [];
  for (const s of [1, -1]) for (const d of DESC) buses.push(new THREE.Vector3(s * d, 1.08, ZRA));
  return { groupe, bras, buses, z: ZRA, demi: 3.0, remplissage: new THREE.Vector3(0, 3.56, -1.5), ouvert: 1 };
}

// Les bras s'ouvrent (k 1) ou se replient (k 0) : repliés, ils se rangent le long du portique, vers l'avant ; en route, ils
// se soulèvent un peu (le vérin). Sans allocation.
export function deplierEnjambeur(m, k) {
  const P = m.pulve;
  P.ouvert = k;
  const a = (1 - k) * Math.PI / 2 * 0.98, lev = Math.sin(Math.PI * k) * 0.12;
  for (const b of P.bras) { const s = b.userData.s; b.rotation.set(0, -s * a, s * lev); }
}
