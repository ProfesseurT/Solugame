// Modèles 3D « low poly » construits en code : formes simples, couleurs par sommet,
// facettes visibles. Aucun fichier externe, tout est original.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Direction du soleil (vers le soleil), bas sur l'horizon : l'heure dorée
export const SOLEIL = new THREE.Vector3(-0.75, 0.42, 0.55).normalize();

/* ---------------------------------------------------------------- textures procédurales
   Pas d'images : la carte graphique dessine les matières à partir de la position dans le monde
   (pierre en assises, ardoises, asphalte, pavés, gravier, herbe, terre, bois, feuillage) et fait
   refléter le ciel aux vitres et à l'eau. Le type de matière vient de la couleur (table TYPES). */
// carrosserie : peinture vernie des véhicules (reflet du ciel, éclat du soleil), appliquée à toute couleur par
// teinter(g, couleur, T.carrosserie) : elle n'a pas de couleur réservée dans TYPES.
export const T = { lisse: 0, pierre: 1, ardoise: 2, asphalte: 3, herbe: 4, gravier: 5, terre: 6, bois: 7, feuillage: 8, vitre: 9, paves: 10, eau: 11, peinture: 12, champ: 13, lampe: 14, allumee: 15, carrosserie: 16, moellon: 17, enduit: 18, petitsPaves: 19 };
const TYPES = new Map(Object.entries({
  '#ebe0c6': T.pierre, '#b9a98b': T.pierre, '#d9cdb2': T.pierre, '#efe6d3': T.pierre, '#a99a82': T.pierre,
  '#cfc3a8': T.pierre, '#e3dac6': T.pierre, '#cbbf9f': T.pierre, '#d8cbb0': T.pierre,
  '#5d626e': T.ardoise, '#686d78': T.ardoise, '#62666f': T.ardoise,
  '#55575f': T.asphalte, '#ece6d4': T.peinture,
  '#c9b993': T.gravier, '#cfc1a0': T.gravier,
  '#cdb998': T.paves, '#bdb19b': T.paves,
  '#7a5c3f': T.terre, '#6f5238': T.terre,
  '#8a9a4c': T.herbe, '#7f9046': T.herbe,
  '#6e5a44': T.bois, '#5e4a36': T.bois,
  '#5b3a2a': T.bois, '#7a4a2a': T.bois, '#6b4a30': T.bois, '#9a7b55': T.bois, '#4a3324': T.bois, '#3e4f63': T.bois, '#6e1f2e': T.bois,
  '#5a3f2b': T.bois, '#8d7c66': T.bois, '#7d6b55': T.bois,
  '#2f3c4f': T.vitre, '#3a5068': T.vitre, '#3d5f8e': T.vitre, '#2d3846': T.vitre,
  '#4f93b8': T.eau, '#ffe1a0': T.lampe, '#4a3a2a': T.allumee,
  // vieilles bâtisses : murs en moellons, enduits à la chaux ; petits pavés des rues, vieille chaussée du bourg
  '#cdbf9f': T.moellon, '#c7b593': T.moellon, '#d3c4a3': T.moellon,
  '#e6d4b0': T.enduit, '#ead9bb': T.enduit, '#dfcaa4': T.enduit, '#e9d2a8': T.enduit,
  '#a89c88': T.petitsPaves, '#b1a58f': T.petitsPaves, '#78736b': T.asphalte,
  '#a3aab2': T.carrosserie, '#757c85': T.carrosserie, // inox des cuves et du pressoir : il brille
  '#8f8a80': T.asphalte, // béton du chai
  '#6e4227': T.bois, // douelles plus sombres des barriques (parvis du chai)
  '#8f877a': T.eau, // les flaques du parvis : elles reflètent le ciel
}));

// Uniformes partagés par toutes les matières du décor : le temps (vent, eau) et la distance
// au-delà de laquelle le détail procédural passe en version allégée (réglée par la qualité).
// uNuit : 0 en plein jour (la lumière dorée), 1 en pleine nuit (main.js, d'après l'heure ; monde.js : nuit)
export const UNI = { uTemps: { value: 0 }, uLoin: { value: 140 }, uNuit: { value: 0 } };

// Bruit tuilable 128 x 128 : R grain fin, G grandes taches, B mouchetis, A plaques
function bruitTuilable() {
  const N = 128, d = new Uint8Array(N * N * 4);
  const couche = (L, graine) => {
    const v = new Float32Array(L * L);
    for (let i = 0; i < v.length; i++) { const s = Math.sin(i * 12.9898 + graine * 78.233) * 43758.5453; v[i] = s - Math.floor(s); }
    return (x, y) => {
      const fx = x / N * L, fy = y / N * L, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const u = tx * tx * (3 - 2 * tx), w = ty * ty * (3 - 2 * ty);
      const a = v[(iy % L) * L + ix % L], b = v[(iy % L) * L + (ix + 1) % L], c = v[((iy + 1) % L) * L + ix % L], e = v[((iy + 1) % L) * L + (ix + 1) % L];
      return (a + (b - a) * u) * (1 - w) + (c + (e - c) * u) * w;
    };
  };
  const fin = [couche(32, 1), couche(64, 2)], gros = [couche(4, 3), couche(8, 4)], plaques = couche(16, 5);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4, s = Math.sin((x * 7 + y * 131) * 12.9898) * 43758.5453;
    d[i] = 255 * (fin[0](x, y) * 0.65 + fin[1](x, y) * 0.35);
    d[i + 1] = 255 * (gros[0](x, y) * 0.6 + gros[1](x, y) * 0.4);
    d[i + 2] = 255 * (s - Math.floor(s));
    d[i + 3] = 255 * plaques(x, y);
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}
export const BRUIT = bruitTuilable();

// Cailloux tuilables, 256 x 256 pour 0,9 m de sol : des galets ronds de 2 à 6 cm, de taille et de teinte variées, semés
// au hasard (un par case d'une grille, décalé), entre eux des gravillons plus petits et du sable. R : relief (0 au sable,
// bombé au milieu des galets), G : teinte, B et A : la pente (normale en x et z, de 0 à 1), pour éclairer chaque galet de
// biais dans le shader sans autre lecture.
function caillouxTuilables() {
  const N = 256, d = new Uint8Array(N * N * 4), h = new Float32Array(N * N), ton = new Float32Array(N * N);
  const ha = (i, j, k) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
  // Une couche de cailloux : cases de C pixels (C divise N : la texture se raccorde), un caillou par case (sauf une sur
  // « vide »), rayon de r0 à r1 cases. Chaque caillou est tiré une fois, puis peint sur les pixels qu'il couvre.
  const couche = (C, r0, r1, vide, haut, graine) => {
    const NC = N / C;
    for (let my = 0; my < NC; my++) for (let mx = 0; mx < NC; mx++) {
      if (ha(mx, my, graine) < vide) continue;
      const px = (mx + 0.5 + 0.5 * (ha(mx, my, graine + 1) - 0.5)) * C, py = (my + 0.5 + 0.5 * (ha(mx, my, graine + 2) - 0.5)) * C;
      const a = ha(mx, my, graine + 3) * Math.PI, ca = Math.cos(a), sa = Math.sin(a), e = 0.65 + 0.35 * ha(mx, my, graine + 4);
      const r = C * (r0 + (r1 - r0) * ha(mx, my, graine + 5)), zh = haut * (0.75 + 0.25 * ha(mx, my, graine + 6)), tc = ha(mx, my, graine + 7);
      for (let y = Math.floor(py - r) - 1; y <= py + r + 1; y++) for (let x = Math.floor(px - r) - 1; x <= px + r + 1; x++) {
        const dx = x + 0.5 - px, dy = y + 0.5 - py, u = (dx * ca + dy * sa) / r, v = (-dx * sa + dy * ca) / (r * e), q = 1 - u * u - v * v;
        if (q <= 0) continue;
        const i = ((y + N) % N) * N + (x + N) % N, z = Math.sqrt(q) * zh; // un dôme ; de l'autre côté du bord, il revient (tuile)
        if (z > h[i]) { h[i] = z; ton[i] = tc; }
      }
    }
  };
  ton.fill(0.35); // le sable
  couche(8, 0.3, 0.55, 0.15, 0.55, 20);   // gravillons
  couche(16, 0.32, 0.62, 0.3, 1, 10);     // galets
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, gx = h[y * N + (x + 1) % N] - h[y * N + (x + N - 1) % N], gz = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
    d[i * 4] = 255 * h[i]; d[i * 4 + 1] = 255 * ton[i];
    d[i * 4 + 2] = 255 * Math.min(1, Math.max(0, 0.5 - gx * 1.2)); d[i * 4 + 3] = 255 * Math.min(1, Math.max(0, 0.5 - gz * 1.2));
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}
export const CAILLOUX = caillouxTuilables();

const V3 = v => `vec3(${v.x.toFixed(4)}, ${v.y.toFixed(4)}, ${v.z.toFixed(4)})`;
const V2 = v => { const l = Math.hypot(v.x, v.z); return `vec2(${(v.x / l).toFixed(4)}, ${(v.z / l).toFixed(4)})`; };

/* ---------------------------------------------------------------- ambiance commune à toutes les matières
   Brume qui s'éclaire du côté du soleil et s'allège en hauteur, étalonnage des couleurs dans la
   conversion finale, ombres filtrées à 4 lectures au lieu de 17 (palier moyen). Tout est fait dans
   les shaders existants : aucune passe plein écran en plus. */
// k : cosinus entre la direction regardée et le soleil. Puissances par multiplications (moins chères que pow).
export const GLSL_BRUME = `
const vec3 SOLEIL_DIR = ${V3(SOLEIL)};
// le jour, d'après la couleur de la brume (claire le jour, bleu nuit la nuit) : la lueur du soleil s'éteint avec lui
float cl_jour(vec3 base) { return smoothstep(0.12, 0.55, max(base.r, max(base.g, base.b))); }
vec3 cl_brumeLarge(vec3 base, float k) {
  float s = max(k, 0.0), s2 = s * s, s4 = s2 * s2;
  return base * mix(vec3(0.86, 0.84, 0.98), vec3(1.0), smoothstep(-0.7, 0.2, k)) + vec3(1.0, 0.62, 0.3) * (s4 * s * 0.42 * cl_jour(base));
}
float cl_halo(float k) {
  float s = max(k, 0.0), s2 = s * s, s4 = s2 * s2, s8 = s4 * s4, s16 = s8 * s8;
  return s16 * s8 * s4 * 0.55;
}
vec3 cl_brume(vec3 base, vec3 d) {
  float k = dot(d, SOLEIL_DIR);
  return cl_brumeLarge(base, k) + vec3(1.0, 0.62, 0.3) * cl_halo(k) * cl_jour(base);
}`;
{
  const C = THREE.ShaderChunk;
  // le décalage caméra vers point est passé dans le repère du monde dès le sommet (interpolation exacte)
  C.fog_pars_vertex = '#ifdef USE_FOG\n varying float vFogDepth;\n varying vec3 vFogMonde;\n#endif';
  C.fog_vertex = '#ifdef USE_FOG\n vFogDepth = - mvPosition.z;\n vFogMonde = mvPosition.xyz * mat3( viewMatrix );\n#endif';
  C.fog_pars_fragment = `#ifdef USE_FOG
 uniform vec3 fogColor;
 varying float vFogDepth;
 varying vec3 vFogMonde;
 #ifdef FOG_EXP2
  uniform float fogDensity;
 #else
  uniform float fogNear;
  uniform float fogFar;
 #endif
 ${GLSL_BRUME}
#endif`;
  C.fog_fragment = `#ifdef USE_FOG
 #ifdef FOG_EXP2
  float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  float fogLoin = 1e9;
 #else
  float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  float fogLoin = fogFar;
 #endif
 // rien à faire en deçà du début de la brume (la plupart des pixels)
 if ( fogFactor > 0.0 ) {
  // plus légère en hauteur : les crêtes des collines se détachent ; pleine au très loin
  fogFactor *= 1.0 - 0.38 * smoothstep( 5.0, 42.0, cameraPosition.y + vFogMonde.y ) * ( 1.0 - smoothstep( fogLoin, fogLoin * 1.6, vFogDepth ) );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, cl_brume( fogColor, normalize( vFogMonde ) ), fogFactor );
 }
#endif`;
  // Étalonnage : tons neutres, ombres un peu bleutées, hautes lumières dorées, saturation légère
  C.tonemapping_pars_fragment = C.tonemapping_pars_fragment.replace('vec3 CustomToneMapping( vec3 color ) { return color; }', `vec3 CustomToneMapping( vec3 color ) {
  color = NeutralToneMapping( color );
  float l = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
  color = mix( vec3( l ), color, 1.12 );
  color += vec3( 0.03, 0.012, -0.028 ) * smoothstep( 0.4, 1.0, l );
  color += vec3( -0.012, -0.002, 0.026 ) * ( 1.0 - smoothstep( 0.02, 0.42, l ) );
  return saturate( color );
}`);
  // PCF à 4 lectures, interpolées (bord d'ombre adouci sur un texel) au lieu des 17 lectures d'origine
  C.shadowmap_pars_fragment = C.shadowmap_pars_fragment.replace(/#if defined\( SHADOWMAP_TYPE_PCF \)\n[\s\S]*?(?=#elif defined\( SHADOWMAP_TYPE_PCF_SOFT \))/, `#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			vec2 st = shadowCoord.xy * shadowMapSize - 0.5;
			vec2 f = fract( st );
			vec2 uv = ( floor( st ) + 0.5 ) * texelSize;
			shadow = mix(
				mix( texture2DCompare( shadowMap, uv, shadowCoord.z ), texture2DCompare( shadowMap, uv + vec2( texelSize.x, 0.0 ), shadowCoord.z ), f.x ),
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, texelSize.y ), shadowCoord.z ), texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ), f.x ),
				f.y );
		`);
  // l'ombre s'efface en douceur au bord de la zone couverte par la carte (pas de coupure nette au loin)
  C.shadowmap_pars_fragment = C.shadowmap_pars_fragment.replace('\t\treturn mix( 1.0, shadow, shadowIntensity );', `\t\tvec2 bordOmbre = abs( shadowCoord.xy * 2.0 - 1.0 );
		shadow = mix( shadow, 1.0, smoothstep( 0.78, 1.0, max( bordOmbre.x, bordOmbre.y ) ) );
		return mix( 1.0, shadow, shadowIntensity );`);
}

const GLSL = `
uniform sampler2D tBruit;
uniform sampler2D tCailloux;
uniform float uNuit;
uniform float uTemps;
uniform float uLoin;
varying vec3 vPosM;
varying float vMat;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 normaleMonde() { return normalize(cross(dFdx(vPosM), dFdy(vPosM))); }
const vec2 SOLEIL_XZ = ${V2(SOLEIL)}; // vers le soleil, au sol
// éclat moyen de chaque matière, pour la version allégée au loin
const float KLOIN[20] = float[20](1.0, 0.92, 0.9, 0.96, 0.94, 1.0, 0.92, 0.88, 0.9, 1.0, 0.9, 1.0, 0.86, 0.96, 1.0, 1.0, 1.0, 0.9, 0.97, 0.84);
vec3 cl_detail(vec3 col) {
  vec3 an = abs(normaleMonde());
  bool sol = an.y > 0.7;
  vec2 uv = sol ? vPosM.xz : (an.x > an.z ? vPosM.zy : vPosM.xy);
  int m = int(vMat + 0.5);
  float g = texture(tBruit, uv * 0.061 + 0.37).g;
  // fausse occlusion ambiante : le pied de tout ce qui est vertical s'assombrit près du sol
  float pied = sol ? 1.0 : mix(m == 1 ? 0.7 : 0.8, 1.0, smoothstep(0.0, m == 1 ? 1.6 : 1.1, vPosM.y));
  if (distance(vPosM, cameraPosition) > uLoin) {
    if (m == 4) col *= mix(vec3(0.8, 0.92, 0.73), vec3(1.16, 1.06, 0.8), g);
    return col * KLOIN[m] * (0.93 + 0.14 * g) * pied;
  }
  float f = texture(tBruit, uv * 0.73).r;
  float k = 0.95 + 0.1 * f;
  if (m == 1) {
    if (!sol) {
      float r = floor(uv.y / 0.36), x = uv.x / 0.64 + r * 0.5;
      vec2 fr = vec2(fract(x), fract(uv.y / 0.36));
      float joint = max(step(fr.x, 0.035), step(fr.y, 0.06));
      k *= mix(0.93 + 0.09 * h21(vec2(floor(x), r)), 0.82, joint);
    }
    k *= 0.9 + 0.14 * g;
  } else if (m == 2) {
    float r = floor(vPosM.y / 0.2), x = (vPosM.x + vPosM.z) / 0.3 + r * 0.5;
    vec2 fr = vec2(fract(x), fract(vPosM.y / 0.2));
    k = 0.86 + 0.16 * h21(vec2(floor(x), r)) + 0.06 * f;
    k *= mix(1.0, 0.72, step(fr.y, 0.12)) * mix(1.0, 0.86, step(fr.x, 0.04));
    k *= 0.9 + 0.16 * g;
  } else if (m == 3) {
    float s = texture(tBruit, uv * 2.9).b;
    k = (0.82 + 0.3 * s * s + 0.08 * f) * (0.9 + 0.2 * g);
    k *= mix(1.0, 0.86, smoothstep(0.62, 0.7, texture(tBruit, uv * 0.11).a));
  } else if (m == 4) {
    float s = texture(tBruit, uv * 1.7).b;
    float t2 = texture(tBruit, uv * 0.017 + 0.71).g;
    col *= mix(vec3(0.78, 0.9, 0.72), vec3(1.2, 1.08, 0.8), g * 0.7 + t2 * 0.3);
    k = 0.8 + 0.32 * s * f + 0.06;
  } else if (m == 5) {
    // cailloux (tCailloux : 0,9 m de côté) : chaque galet sa teinte et son relief, éclairé du côté du soleil ; le sable
    // entre eux, plus sombre, grenu ; par-dessus, les grandes taches du sol
    vec4 c = texture(tCailloux, uv / 0.9);
    float relief = dot(c.ba * 2.0 - 1.0, SOLEIL_XZ), galet = smoothstep(0.0, 0.25, c.r);
    k = mix(0.74 + 0.16 * f, 0.8 + 0.3 * c.r, galet) * (0.78 + 0.44 * c.g) * (1.0 + 0.45 * relief) * (0.92 + 0.12 * g);
    col *= mix(vec3(0.94, 0.97, 1.04), vec3(1.07, 1.0, 0.88), c.g);
  } else if (m == 6) {
    // terre travaillée : mottes et sillons dans le sens des rangs (axe z)
    k = 0.8 + 0.24 * texture(tBruit, uv * 2.3).b + 0.06 * sin(vPosM.x * 9.0 + f * 4.0);
    col = mix(col, col * vec3(0.92, 1.12, 0.78), smoothstep(0.5, 0.75, g) * 0.8);
  } else if (m == 7) {
    float id = floor(uv.x / 0.17);
    k = 0.84 + 0.07 * sin((uv.y + f * 0.4) * 32.0 + h21(vec2(id, 1.0)) * 6.0) + 0.12 * h21(vec2(id, 3.0));
    k *= mix(1.0, 0.72, step(fract(uv.x / 0.17), 0.07));
  } else if (m == 8) {
    float s = texture(tBruit, uv * 1.9).b;
    k = 0.7 + 0.42 * s * (0.65 + 0.35 * f) + 0.08 * g;
  } else if (m == 10) {
    vec2 p = uv / 0.3, c = floor(p), fr = fract(p + vec2(mod(c.y, 2.0) * 0.5, 0.0));
    float joint = max(step(fr.x, 0.08), step(fract(p.y), 0.08));
    k = (0.86 + 0.16 * h21(floor(p + vec2(mod(c.y, 2.0) * 0.5, 0.0)))) * mix(1.0, 0.7, joint) * (0.94 + 0.1 * f);
  } else if (m == 11) {
    vec2 t = vec2(uTemps * 0.05, uTemps * 0.03);
    k = 0.7 + 0.2 * texture(tBruit, vPosM.xz * 0.3 + t).g + 0.1 * texture(tBruit, vPosM.xz * 0.5 - t.yx).g;
  } else if (m == 12) {
    k = mix(0.7, 1.0, smoothstep(0.25, 0.6, texture(tBruit, uv * 1.3).r));
  } else if (m == 13) {
    k = 0.9 + 0.06 * sin(dot(vPosM.xz, vec2(0.5, 0.3))) + 0.12 * g;
  } else if (m == 16) {
    // peinture lisse, sans grain ; la saleté de la route sur le bas de caisse (d'après la hauteur : elle suit la voiture)
    k = 0.98 + 0.04 * g;
    col = mix(col, col * vec3(0.7, 0.64, 0.56) + vec3(0.035, 0.03, 0.02), (1.0 - smoothstep(0.16, 0.56, vPosM.y)) * 0.6);
  } else if (m == 17 || m == 18) {
    // moellons : rangs, pierres de longueur inégale, joints de mortier clair ; l'enduit à la chaux (18) les couvre,
    // sauf là où il est tombé (plaques), et se salit par endroits
    float hr = 0.27, r = floor(uv.y / hr), lx = 0.32 + 0.3 * h21(vec2(r, 5.0)), xx = uv.x / lx + h21(vec2(r, 2.0)) * 3.0;
    vec2 c = vec2(floor(xx), r), fr = vec2(fract(xx), fract(uv.y / hr)), ed = min(fr, 1.0 - fr) * vec2(lx, hr);
    // chaque pierre ne remplit pas toute sa case : hauteur et longueur propres, le reste est du mortier et des cales
    float hs = 0.6 + 0.4 * h21(c + 4.0), ws = 0.72 + 0.28 * h21(c + 7.0);
    float j = max(1.0 - smoothstep(0.01, 0.035, min(ed.x, ed.y) + 0.02 * (f - 0.5)), max(smoothstep(hs - 0.08, hs, fr.y), smoothstep(ws - 0.06, ws, fr.x)) * 0.8);
    float km = mix((0.8 + 0.28 * h21(c)) * (0.92 + 0.14 * g) * mix(1.0, 0.9, 1.0 - smoothstep(0.0, 0.25, fr.y)), 1.04, j); // le bas de chaque pierre un peu dans l'ombre
    vec3 cm = mix(col * mix(vec3(1.0), vec3(1.06, 1.0, 0.9), h21(c + 9.0) * 0.6), col * vec3(1.08, 1.06, 1.0), j);
    if (m == 17) { col = cm; k = km * (0.96 + 0.08 * f); }
    else {
      // l'enduit tombe surtout en pied de mur (l'humidité), par plaques aux bords irréguliers
      float m0 = texture(tBruit, uv * 0.09 + 0.5).a + 0.24 * (1.0 - smoothstep(0.5, 1.8, vPosM.y)) + 0.12 * (f - 0.5);
      float tombe = smoothstep(0.8, 0.84, m0) * smoothstep(0.55, 0.75, vPosM.y);
      float ke = (0.95 + 0.08 * g + 0.04 * f) * mix(1.0, 0.9, smoothstep(0.55, 0.8, texture(tBruit, uv * 0.05).g));
      col = mix(col, cm * vec3(0.9, 0.88, 0.84), tombe);
      k = mix(ke, km * 0.95, tombe);
    }
  } else if (m == 19) {
    // petits pavés de grès : rangs décalés, pavés bombés (bords plus sombres), joints creux
    vec2 p = uv / vec2(0.16, 0.14);
    float rr = floor(p.y);
    vec2 q = vec2(p.x + mod(rr, 2.0) * 0.5 + h21(vec2(rr, 4.0)) * 0.3, p.y), c = floor(q), fr = fract(q), ed = min(fr, 1.0 - fr);
    float bord = min(ed.x * 0.16, ed.y * 0.14);
    k = (0.8 + 0.3 * h21(c)) * mix(0.84, 1.0, smoothstep(0.0, 0.05, bord)) * (0.93 + 0.12 * f) * (0.9 + 0.16 * g);
    k = mix(k, 0.55, 1.0 - smoothstep(0.006, 0.02, bord));
    col *= mix(vec3(1.0), vec3(1.05, 0.98, 0.9), h21(c + 3.0));
  }
  return col * k * pied;
}`;
// Lumières propres : vitres et eau qui reflètent le ciel, fenêtres allumées, réverbères
const GLSL_EMISSIF = `
{
  int me = int(vMat + 0.5);
  if (me == 9 || me == 15) {
    vec3 nW = normaleMonde(), vd = normalize(cameraPosition - vPosM);
    if (dot(nW, vd) < 0.0) nW = -nW;
    vec3 r = reflect(-vd, nW);
    vec3 ciel = mix(vec3(1.0, 0.7, 0.48), vec3(0.3, 0.4, 0.7), clamp(r.y * 2.5, 0.0, 1.0)) * mix(1.0, 0.12, uNuit); // la nuit, le ciel reflété s'assombrit
    float fr = pow(1.0 - max(dot(nW, vd), 0.0), 3.0);
    totalEmissiveRadiance += ciel * (me == 15 ? 0.06 + 0.3 * fr : 0.16 + 0.55 * fr);
    if (me == 15) totalEmissiveRadiance += vec3(1.0, 0.58, 0.26) * (0.42 + 0.1 * sin(vPosM.y * 9.0 + vPosM.x * 3.0)) * (1.0 + 0.8 * uNuit); // fenêtres allumées
  } else if (me == 11) {
    vec2 t = vec2(uTemps * 0.05, uTemps * 0.035), p = vPosM.xz * 0.35;
    float a = texture(tBruit, p + t).g, b = texture(tBruit, p + t + vec2(0.04, 0.0)).g, c = texture(tBruit, p + t + vec2(0.0, 0.04)).g;
    vec3 n = normalize(vec3((a - b) * 3.0, 1.0, (a - c) * 3.0)), vd = normalize(cameraPosition - vPosM);
    vec3 r = reflect(-vd, n);
    vec3 ciel = mix(vec3(0.95, 0.62, 0.45), vec3(0.3, 0.4, 0.68), clamp(r.y * 1.6, 0.0, 1.0));
    float fr = 0.1 + 0.6 * pow(1.0 - max(dot(n, vd), 0.0), 5.0);
    totalEmissiveRadiance += (ciel * fr * 0.45 + vec3(1.0, 0.8, 0.5) * pow(max(dot(r, ${V3(SOLEIL)}), 0.0), 120.0) * 1.2) * mix(1.0, 0.12, uNuit);
  } else if (me == 14) {
    totalEmissiveRadiance += vec3(1.0, 0.82, 0.5) * (1.1 + 1.2 * uNuit); // réverbères : plus vifs la nuit
  } else if (me == 16) {
    // carrosserie : le vernis reflète le ciel (ou le sol, vers le bas), surtout en incidence rasante, et un petit éclat du soleil
    vec3 nW = normaleMonde(), vd = normalize(cameraPosition - vPosM);
    vec3 r = reflect(-vd, nW);
    vec3 ciel = r.y > 0.0 ? mix(vec3(1.0, 0.72, 0.5), vec3(0.34, 0.45, 0.75), clamp(r.y * 2.2, 0.0, 1.0))
                          : mix(vec3(0.55, 0.45, 0.34), vec3(0.16, 0.15, 0.13), clamp(-r.y * 5.0, 0.0, 1.0));
    float c = 1.0 - max(dot(nW, vd), 0.0), c2 = c * c;
    float s = max(dot(r, ${V3(SOLEIL)}), 0.0), s2 = s * s, s4 = s2 * s2, s8 = s4 * s4, s16 = s8 * s8;
    totalEmissiveRadiance += (ciel * (0.035 + 0.42 * c2 * c2 * c) + vec3(1.0, 0.85, 0.6) * (s16 * s16 * 0.55)) * mix(1.0, 0.15, uNuit);
  }
}`;
// Vitres qu'on traverse du regard (matière MAT_VITRE) : plus opaques en incidence rasante, comme une vraie vitre
// (a0 : opacité de face ; une vitrine de boutique est plus claire qu'une vitre de voiture)
const GLSL_ALPHA = a0 => `
{
  vec3 nT = normaleMonde(), vT = normalize(cameraPosition - vPosM);
  float cT = 1.0 - abs(dot(nT, vT));
  diffuseColor.a = ${a0.toFixed(2)} + ${(0.95 - a0).toFixed(2)} * cT * cT;
}`;
// Vent : balancement doux et rafales qui traversent le paysage (position dans le monde, temps)
const GLSL_VENT = `
vec3 cl_vent(vec3 w, float t) {
  float rafale = 0.5 + 0.5 * sin(t * 0.31 + w.x * 0.035 + w.z * 0.025);
  float ph = t + w.x * 0.27 + w.z * 0.21;
  return vec3(sin(ph) + 0.35 * sin(ph * 2.7 + 1.3), 0.0, 0.55 * cos(ph * 0.83)) * rafale;
}`;

// Ajoute le détail procédural à une matière Lambert : type lu par sommet (aMat) ou fixe.
// Options : vent [amplitude, y bas, y haut, vitesse] (balancement des instances selon la hauteur locale),
// ventSommets (poids de vent lu dans l'attribut aVent des géométries fusionnées),
// teinteFeuillage (la couleur d'instance ne teinte que le feuillage), ondule (rangs de vigne irréguliers),
// transparente (vitre traversée du regard : opacité selon l'angle de vue).
export function detailler(m, typeFixe, o = {}) {
  const attr = typeFixe === undefined, vent = o.vent, vs0 = !vent && attr && o.ventSommets;
  m.onBeforeCompile = sh => {
    sh.uniforms.tBruit = { value: BRUIT }; sh.uniforms.tCailloux = { value: CAILLOUX }; sh.uniforms.uNuit = UNI.uNuit;
    sh.uniforms.uTemps = UNI.uTemps; sh.uniforms.uLoin = UNI.uLoin;
    if (vent) sh.uniforms.uVent = { value: new THREE.Vector4(...vent) };
    const poids = vent ? 'float pv = clamp((position.y - uVent.y) / (uVent.z - uVent.y), 0.0, 1.0); pv *= pv * uVent.x; float tv = uTemps * uVent.w;' + (attr ? ' pv *= step(7.5, aMat) * step(aMat, 8.5);' : '')
      : vs0 ? 'float pv = aVent * 0.16; float tv = uTemps * 1.6;' : '';
    let vs = sh.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vPosM;
varying float vMat;
uniform float uTemps;
${attr ? 'attribute float aMat;' : ''}
${vs0 ? 'attribute float aVent;' : ''}
${vent ? 'uniform vec4 uVent;' : ''}
${GLSL_VENT}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
${poids ? `{
  ${poids}
  #ifdef USE_INSTANCING
  vec3 wv = (modelMatrix * (instanceMatrix * vec4(transformed, 1.0))).xyz;
  #else
  vec3 wv = (modelMatrix * vec4(transformed, 1.0)).xyz;
  #endif
  vec3 dv = vec3(0.0);
  ${o.ondule ? `if (aMat > 7.5 && aMat < 8.5 && position.y > 0.62) {
    dv.x = (0.55 * sin(wv.z * 1.7 + wv.x * 2.3) + 0.45 * sin(wv.z * 0.61 + 1.7)) * 0.1 * sign(position.x);
    dv.y = (0.6 * sin(wv.z * 1.25 + wv.x * 0.7) + 0.4 * sin(wv.z * 3.1 + 0.4)) * (position.y > 1.5 ? 0.13 : 0.05);
  }` : ''}
  if (pv > 0.0) dv += cl_vent(wv, tv) * pv;
  #ifdef USE_INSTANCING
  mat3 im = mat3(instanceMatrix);
  dv = (dv * im) / vec3(dot(im[0], im[0]), dot(im[1], im[1]), dot(im[2], im[2]));
  #endif
  transformed += dv;
}` : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
  { vec4 pm = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    pm = instanceMatrix * pm;
  #endif
    vPosM = (modelMatrix * pm).xyz; vMat = ${attr ? 'aMat' : typeFixe.toFixed(1)}; }`);
    if (o.teinteFeuillage) vs = vs.replace('#include <color_vertex>', `vColor = vec3(1.0);
#ifdef USE_COLOR
  vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
  if (aMat > 7.5 && aMat < 8.5) vColor *= instanceColor;
#endif`);
    sh.vertexShader = vs;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = cl_detail(diffuseColor.rgb);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + (attr ? GLSL_EMISSIF : '') + (o.transparente ? GLSL_ALPHA(o.transparente === true ? 0.42 : o.transparente) : ''));
  };
  const cle = 'cl-' + (attr ? 'attr' : typeFixe) + (vent ? '-v' : '') + (vs0 ? '-s' : '') + (o.teinteFeuillage ? '-t' : '') + (o.ondule ? '-o' : '') + (o.transparente ? '-tr' + o.transparente : '');
  m.customProgramCacheKey = () => cle;
  return m;
}
// Matière pour des instances (vignes, arbres) : type fixe, couleur par instance ou unique
export const matiere = (type, couleur, parSommet, o) => detailler(new THREE.MeshLambertMaterial({ flatShading: true, vertexColors: !!parSommet, ...(couleur ? { color: couleur } : {}) }), type, o);

// Une seule matière pour presque tout le décor : couleurs et types portés par les sommets.
export const MAT = detailler(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
// La même, pour les quartiers du décor qui contiennent des feuillages agités par le vent (attribut aVent).
export const MAT_VENT = detailler(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), undefined, { ventSommets: true });
// Vitres qu'on traverse du regard (cabine du van) : la même matière, transparente, vue des deux côtés, en une passe.
// Elle reflète le ciel comme les autres vitres et devient plus opaque en incidence rasante. Ne projette pas d'ombre.
export const MAT_VITRE = detailler(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }), undefined, { transparente: true });
// Vitrines des boutiques : presque invisibles de face (on voit l'intérieur), réfléchissantes en biais
export const MAT_VITRINE = detailler(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }), undefined, { transparente: 0.12 });

const tmpC = new THREE.Color();

// Couleur (et type de matière) sur tous les sommets d'une géométrie. Les couleurs écrites en texte ne sont lues
// qu'une fois (des milliers de pièces partagent quelques dizaines de teintes).
const TEINTES = new Map();
function colorer(g, couleur, type) {
  if (typeof couleur === 'string') { let c = TEINTES.get(couleur); if (!c) TEINTES.set(couleur, c = new THREE.Color(couleur)); tmpC.copy(c); }
  else tmpC.set(couleur);
  const n = g.attributes.position.count, a = new Float32Array(n * 3), t = new Float32Array(n);
  const ty = type ?? (typeof couleur === 'string' ? TYPES.get(couleur.toLowerCase()) || 0 : 0);
  for (let i = 0; i < n; i++) { a[i * 3] = tmpC.r; a[i * 3 + 1] = tmpC.g; a[i * 3 + 2] = tmpC.b; t[i] = ty; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.setAttribute('aMat', new THREE.BufferAttribute(t, 1));
  return g;
}
function finir(g, couleur, type) {
  if (g.index) g = g.toNonIndexed();
  for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
  return colorer(g, couleur, type);
}

export const teinter = (g, c, type) => finir(g, c, type);

// Déplacer, tourner autour de la verticale : directement sur les sommets (les fonctions de three.js passent
// par une matrice 4 x 4 et recalculent les normales même pour une simple translation)
export function deplacer(g, x, y, z) {
  const p = g.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) { p[i] += x; p[i + 1] += y; p[i + 2] += z; }
  g.boundingBox = null; g.boundingSphere = null;
  return g;
}
export function tournerY(g, a) {
  const co = Math.cos(a), si = Math.sin(a);
  for (const k of ['position', 'normal']) {
    const at = g.attributes[k];
    if (!at) continue;
    const v = at.array;
    for (let i = 0; i < v.length; i += 3) { const x = v[i], z = v[i + 2]; v[i] = x * co + z * si; v[i + 2] = z * co - x * si; }
  }
  g.boundingBox = null; g.boundingSphere = null;
  return g;
}

// Gabarits : les sommets d'une forme unité (pavé, cylindre, boule), dépliés une seule fois. Les milliers de pavés,
// cylindres et boules du décor et des personnages s'en déduisent par simple calcul, sans repasser par les classes
// de géométrie de three.js (démarrage nettement plus court, résultat identique).
const GAB = new Map();
function gabarit(cle, fab) {
  let g = GAB.get(cle);
  if (!g) { const s = fab(), d = s.index ? s.toNonIndexed() : s; g = { p: d.attributes.position.array, n: d.attributes.normal.array }; GAB.set(cle, g); }
  return g;
}
function geo(p, n, couleur, type) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return colorer(g, couleur, type);
}
// Boule unité à facettes (copie neuve, sans couleur), pour les formes déformées (têtes, cheveux)
export function icosa(detail) {
  const G = gabarit('s' + detail, () => new THREE.IcosahedronGeometry(1, detail)), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(G.p.slice(), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(G.n.slice(), 3));
  return g;
}

// Pavé centré en (x, y, z), tourné de ry autour de la verticale
export function B(w, h, d, c, x = 0, y = 0, z = 0, ry = 0) {
  const G = gabarit('b', () => new THREE.BoxGeometry(1, 1, 1)), N = G.p.length;
  const p = new Float32Array(N), n = new Float32Array(N), co = Math.cos(ry), si = Math.sin(ry);
  for (let i = 0; i < N; i += 3) {
    const px = G.p[i] * w, pz = G.p[i + 2] * d, nx = G.n[i], nz = G.n[i + 2];
    p[i] = px * co + pz * si + x; p[i + 1] = G.p[i + 1] * h + y; p[i + 2] = pz * co - px * si + z;
    n[i] = nx * co + nz * si; n[i + 1] = G.n[i + 1]; n[i + 2] = nz * co - nx * si;
  }
  return geo(p, n, c);
}
// Cylindre (axe y par défaut, 'x' ou 'z' pour le coucher). Même ordre de sommets que CylinderGeometry :
// le flanc, puis le couvercle du haut et celui du bas (absents si leur rayon est nul).
export function C(rh, rb, h, seg, c, x = 0, y = 0, z = 0, axe = 'y', ry = 0) {
  const G = gabarit('c' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg));
  const nCote = seg * 6, nCap = seg * 3, nv = nCote + (rh > 0 ? nCap : 0) + (rb > 0 ? nCap : 0);
  const p = new Float32Array(nv * 3), n = new Float32Array(nv * 3), pente = (rb - rh) / h, co = Math.cos(ry), si = Math.sin(ry);
  let o = 0;
  const copier = (debut, fin, flanc) => {
    for (let k = debut; k < fin; k++, o += 3) {
      const i = k * 3, r = G.p[i + 1] > 0 ? rh : rb;
      let px = G.p[i] * r, py = G.p[i + 1] * h, pz = G.p[i + 2] * r, nx = G.n[i], ny = G.n[i + 1], nz = G.n[i + 2];
      if (flanc) { const l = Math.hypot(nx, pente, nz); nx /= l; ny = pente / l; nz /= l; }
      if (ry) { const a = px * co + pz * si, b = nx * co + nz * si; pz = pz * co - px * si; px = a; nz = nz * co - nx * si; nx = b; }
      if (axe === 'x') { const a = -py, b = -ny; py = px; px = a; ny = nx; nx = b; }
      else if (axe === 'z') { const a = -pz, b = -nz; pz = py; py = a; nz = ny; ny = b; }
      p[o] = px + x; p[o + 1] = py + y; p[o + 2] = pz + z;
      n[o] = nx; n[o + 1] = ny; n[o + 2] = nz;
    }
  };
  copier(0, nCote, true);
  if (rh > 0) copier(nCote, nCote + nCap, false);
  if (rb > 0) copier(nCote + nCap, nCote + 2 * nCap, false);
  return geo(p, n, c);
}
// Boule à facettes, déformable
export function S(r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, detail = 0) {
  const G = gabarit('s' + detail, () => new THREE.IcosahedronGeometry(1, detail)), N = G.p.length;
  const p = new Float32Array(N), n = new Float32Array(N), kx = r * sx, ky = r * sy, kz = r * sz;
  for (let i = 0; i < N; i += 3) {
    p[i] = G.p[i] * kx + x; p[i + 1] = G.p[i + 1] * ky + y; p[i + 2] = G.p[i + 2] * kz + z;
    const nx = G.n[i] / sx, ny = G.n[i + 1] / sy, nz = G.n[i + 2] / sz, l = Math.hypot(nx, ny, nz) || 1;
    n[i] = nx / l; n[i + 1] = ny / l; n[i + 2] = nz / l;
  }
  return geo(p, n, c);
}
// Toit à deux pans sur des murs w x d dont le haut est en y, faîtage parallèle à x (ou à z si surZ), haut de ht. Un vrai
// toit : pans épais (ep) qui reposent sur les murs, débord à l'égout (egout) et aux rives (rive), dessous en voliges,
// tuiles faîtières ; les pignons sont des murs (couleur mur) dans le plan des murs. Rien ne laisse passer le jour entre
// les murs et le toit, quel que soit l'angle de vue. Rend les morceaux (à fusionner avec le reste du décor).
export function toit(w, d, ht, c, x = 0, y = 0, z = 0, surZ = false, o = {}) {
  if (surZ) [w, d] = [d, w];
  const e = o.egout ?? 0.4, r = o.rive ?? 0.22, ep = o.ep ?? 0.2;
  const a = w / 2, b = d / 2, A = a + r, E = b + e, k = ht / E;
  const yb = v => k * (b - Math.abs(v)), yh = v => yb(v) + ep; // dessous, dessus du pan
  const dessus = [], dessous = [], bords = [], pignons = [];
  // un quadrilatère p0..p3, tourné vers n (l'ordre des sommets est corrigé au besoin)
  const quad = (P, p0, p1, p2, p3, n) => {
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
    const sens = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2];
    if (sens < 0) [p1, p3] = [p3, p1];
    P.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
  };
  for (const s of [1, -1]) {
    quad(dessus, [-A, yh(E), s * E], [A, yh(E), s * E], [A, yh(0), 0], [-A, yh(0), 0], [0, 1, s * k]);
    quad(dessous, [-A, yb(E), s * E], [A, yb(E), s * E], [A, yb(0), 0], [-A, yb(0), 0], [0, -1, -s * k]);
    quad(bords, [-A, yb(E), s * E], [A, yb(E), s * E], [A, yh(E), s * E], [-A, yh(E), s * E], [0, 0, s]); // égout
    for (const t of [1, -1]) quad(bords, [t * A, yb(E), s * E], [t * A, yb(0), 0], [t * A, yh(0), 0], [t * A, yh(E), s * E], [t, 0, 0]); // rives
    const tri = [s * a, 0, -b, s * a, 0, b, s * a, yb(0), 0];
    if (s < 0) pignons.push(...tri); else pignons.push(tri[3], tri[4], tri[5], tri[0], tri[1], tri[2], tri[6], tri[7], tri[8]);
  }
  const parts = [[dessus.concat(bords), c], [dessous, o.dessous || '#5a3f2b'], [pignons, o.mur || '#ebe0c6']].map(([P, coul]) => {
    const q = new THREE.BufferGeometry();
    q.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    q.computeVertexNormals();
    return colorer(q, coul);
  });
  parts.push(B(2 * A + 0.04, 0.12, 0.3, o.faitiere || '#8c5a44', 0, yh(0) - 0.01, 0));
  for (const q of parts) { if (surZ) tournerY(q, Math.PI / 2); deplacer(q, x, y, z); }
  return parts;
}

// Attributs compactés pour la carte graphique, une fois la géométrie finie : normale sur 3 octets, couleur sur
// 3 ou 4 octets, type de matière et poids du vent sur 1 octet (au lieu de 4 octets par nombre). La mémoire des
// sommets est divisée par deux, et la carte graphique en lit deux fois moins à chaque image.
// Les normales ne servent qu'au décalage des ombres (l'éclairage à facettes les recalcule par pixel).
// Un attribut partagé par plusieurs géométries (morceaux du terrain) n'est compacté qu'une fois.
const COMPACTS = new WeakMap();
export function compacter(g) {
  const a = g.attributes, octets = (src, Type, k) => {
    const d = new Type(src.length);
    for (let i = 0; i < src.length; i++) { const v = src[i]; d[i] = Math.round((v > 1 ? 1 : v < -1 ? -1 : v) * k); }
    return d;
  };
  const remplacer = (nom, fab) => {
    const at = a[nom];
    if (!at || !(at.array instanceof Float32Array)) return;
    let c = COMPACTS.get(at);
    if (!c) COMPACTS.set(at, c = fab(at));
    g.setAttribute(nom, c);
  };
  remplacer('normal', at => new THREE.BufferAttribute(octets(at.array, Int8Array, 127), 3, true));
  remplacer('color', at => new THREE.BufferAttribute(octets(at.array, Uint8Array, 255), at.itemSize, true));
  remplacer('aVent', at => new THREE.BufferAttribute(octets(at.array, Uint8Array, 255), 1, true));
  remplacer('aMat', at => new THREE.BufferAttribute(Uint8Array.from(at.array), 1));
  return g;
}

// Intérieurs où le soleil n'entre pas (le chai) : dans la boîte (min, max), la lumière directe du soleil est coupée (la
// carte d'ombre plongerait tout dans le noir sous le toit) et des suspensions éclairent (lampes : [x, y, z]) ; le ciel
// n'y donne qu'un peu. Toutes les matières éclairées passent par ce morceau de shader de three.js : personnages, véhicules
// et décor sont éclairés pareil. Fondu de 25 cm aux murs. À appeler avant la compilation des shaders.
export function definirInterieur(min, max, lampes) {
  const C = THREE.ShaderChunk, v = p => `vec3(${p.map(n => n.toFixed(2)).join(', ')})`;
  C.lights_fragment_begin = C.lights_fragment_begin
    .replace('vec3 geometryPosition = - vViewPosition;', `vec3 geometryPosition = - vViewPosition;
vec3 cl_pm = ( vec4( geometryPosition - viewMatrix[ 3 ].xyz, 0.0 ) * viewMatrix ).xyz;
vec3 cl_di = max( ${v(min)} - cl_pm, cl_pm - ${v(max)} );
float cl_dehors = smoothstep( -0.12, 0.12, max( cl_di.x, max( cl_di.y, cl_di.z ) ) );`)
    .replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= cl_dehors;') + `
#if defined( RE_IndirectDiffuse )
if ( cl_dehors < 1.0 ) {
  vec3 cl_l = vec3( 0.0 );
  ${lampes.map(p => `{ vec3 d = cl_pm - ${v(p)}; cl_l += vec3( 1.0, 0.86, 0.68 ) * 1.5 / ( 1.0 + dot( d, d ) * 0.05 ); }`).join('\n  ')}
  irradiance = mix( vec3( 0.5, 0.49, 0.47 ) + cl_l, irradiance, cl_dehors ); // dedans : une pénombre neutre, pas le ciel
}
#endif`;
}

// Géométrie indexée : les sommets identiques (même position, mêmes attributs) ne sont gardés qu'une fois. Sans index, la
// carte graphique calcule chaque sommet autant de fois qu'il touche de triangles (un coin de pavé : six fois) ; avec,
// elle réutilise le calcul. sansNormale : les normales ne servent qu'au décalage des ombres (l'éclairage à facettes est
// calculé par pixel) ; on fusionne donc les sommets des faces voisines d'une même pièce, puis on recalcule des normales
// moyennes. Les doublons d'une géométrie dépliée sont des copies exactes : on compare les bits des nombres (vue entière
// des tableaux), par hachage à adressage ouvert, sans arrondi, sans chaîne ni objet par sommet.
let TAB = new Int32Array(0);
export function indexer(g, sansNormale = false) {
  if (g.index) return g;
  if (sansNormale) g.deleteAttribute('normal');
  const noms = Object.keys(g.attributes), A = noms.map(n => g.attributes[n]), na = A.length, nv = g.attributes.position.count;
  // tous les attributs vus comme des entiers 32 bits (bits des flottants ; octets recopiés) : un seul type de tableau,
  // le compilateur JavaScript spécialise la boucle
  const V = A.map(a => (a.array instanceof Float32Array ? new Uint32Array(a.array.buffer, a.array.byteOffset, a.array.length) : Uint32Array.from(a.array))), S = A.map(a => a.itemSize);
  const P = V[noms.indexOf('position')];
  let taille = 1024; while (taille < nv * 2) taille <<= 1;
  if (TAB.length < taille) TAB = new Int32Array(taille);
  TAB.fill(-1, 0, taille);
  const masque = taille - 1, uniques = new Int32Array(nv), index = new Uint32Array(nv);
  let nu = 0;
  for (let i = 0; i < nv; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    // les flottants « ronds » ont leurs bits de poids faible à zéro : on brasse (finaliseur de murmur) avant de garder ceux-là
    let h = Math.imul(x ^ (x >>> 16), 0x2c1b3c6d) ^ Math.imul(y ^ (y >>> 15), 0x297a2d39) ^ Math.imul(z ^ (z >>> 13), 0x5bd1e995), u;
    h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h &= masque;
    for (;;) {
      u = TAB[h];
      if (u < 0) break;
      const j = uniques[u];
      let ok = P[j * 3] === x && P[j * 3 + 1] === y && P[j * 3 + 2] === z;
      for (let k = 0; ok && k < na; k++) {
        const v = V[k], s = S[k], a = i * s, b = j * s;
        for (let c = 0; c < s; c++) if (v[a + c] !== v[b + c]) { ok = false; break; }
      }
      if (ok) break;
      h = (h + 1) & masque;
    }
    if (u < 0) { u = nu++; uniques[u] = i; TAB[h] = u; }
    index[i] = u;
  }
  for (let k = 0; k < na; k++) {
    const a = A[k], s = a.itemSize, src = a.array, dst = new src.constructor(nu * s);
    for (let u = 0; u < nu; u++) { const o = uniques[u] * s; for (let j = 0; j < s; j++) dst[u * s + j] = src[o + j]; }
    g.setAttribute(noms[k], new THREE.BufferAttribute(dst, s, a.normalized));
  }
  g.setIndex(new THREE.BufferAttribute(nu < 65536 ? Uint16Array.from(index) : index, 1));
  if (sansNormale) {
    // normales moyennes (somme des normales des faces, pondérées par leur aire), directement sur les tableaux
    const p = g.attributes.position.array, n = new Float32Array(nu * 3);
    for (let t = 0; t < nv; t += 3) {
      const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      n[a] += nx; n[a + 1] += ny; n[a + 2] += nz; n[b] += nx; n[b + 1] += ny; n[b + 2] += nz; n[c] += nx; n[c + 1] += ny; n[c + 2] += nz;
    }
    for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
    g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  }
  return g;
}
export function fusion(liste) {
  const g = mergeGeometries(liste, false);
  for (const x of liste) x.dispose();
  return g;
}
// Place une liste de géométries locales (façade vers +z) à (x, z) avec une rotation (et à la hauteur y)
export function poser(liste, x, z, rot, dest, y = 0) {
  for (const g of liste) { if (rot) tournerY(g, rot); deplacer(g, x, y, z); dest.push(g); }
}
