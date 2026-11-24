// Le monde : un village de la Loire, son domaine, ses vignes d'automne et les collines,
// à l'heure dorée. Tout est construit en code au chargement (aucun fichier à télécharger).
// Le décor fixe est fusionné par quartiers (et par secteurs au loin) : l'élagage hors champ
// et hors de la zone d'ombre ne dessine que ce qui sert.
import * as THREE from 'three';
import { B, C, S, toit, teinter, fusion, poser, deplacer, tournerY, indexer, definirInterieur, MAT_VITRINE, MAT, MAT_VENT, matiere, detailler, T, SOLEIL, GLSL_BRUME, UNI } from './modeles.js';
import { hasard, lisse, assombrir, bruit, hache, angle } from './outils.js';
import { Atelier } from './engins.js';
import { naturelle, forme, sol, avantRoute, procheRoute, ZONE, GRILLE, FIN, ROUTE as TRACE, CHATEAU, COUR, DEMI, reserve } from './relief.js';

export { SOLEIL };
export const BRUME = '#efb68a';
export const ECH = 1.5; // pixels par mètre sur le fond de la mini-carte
export const CARTE0 = 380; // le fond de la mini-carte va de -380 à 200 m (x et z) : la zone de jeu, la route du château
const TUF = '#ebe0c6', ARD = '#5d626e', ARD2 = '#686d78';
const FEUILLES_VIGNE = ['#b8642c', '#c9a23a', '#a6823a', '#8a8f3a'], VIGNE_VIERGE = ['#b0402c', '#c2562e', '#8e2a3b', '#d0702f', '#a8452f'];

// Relief : relief.js (plat dans la zone de jeu, collines autour, la colline du château et sa route)
export const hauteur = sol;

// Ordre de dessin des objets opaques : du plus proche au plus couvrant, pour que le test de
// profondeur écarte tôt les pixels cachés (sol dessiné après ce qui le recouvre, ciel en dernier).
export const ORDRE = { bati: 1, vegetal: 2, herbe: 3, sol: 4, ciel: 10, nuages: 11 };

// Rangement des géométries fixes par quartier de 64 m (secteurs d'angle au-delà de 195 m),
// puis fusion : un appel de dessin par quartier, élagué s'il est hors champ ou hors zone d'ombre.
// Boîte englobante (centre et demi-tailles) d'un objet qui projette une ombre, pour l'élagage fin de la passe d'ombre
const porteur = (obj, b) => ({ obj, cx: (b.min.x + b.max.x) / 2, cy: (b.min.y + b.max.y) / 2, cz: (b.min.z + b.max.z) / 2, hx: (b.max.x - b.min.x) / 2, hy: (b.max.y - b.min.y) / 2, hz: (b.max.z - b.min.z) / 2 });

// Un détail trop petit pour que son ombre se voie dans la carte d'ombre (7 cm par texel au mieux) : moins de 80 cm en
// tout sens, ou plaqué (moins de 13 cm d'épaisseur) et moins de 2,6 m de long
function petit(g) {
  const b = g.boundingBox, x = b.max.x - b.min.x, y = b.max.y - b.min.y, z = b.max.z - b.min.z;
  const grand = Math.max(x, y, z), mince = Math.min(x, y, z);
  return grand < 0.8 || (mince < 0.13 && grand < 2.6);
}
class Grille {
  constructor() { this.cases = new Map(); this.maillages = []; }
  push(...gs) {
    for (const g of gs) {
      if (!g.boundingBox) g.computeBoundingBox();
      const b = g.boundingBox, x = (b.min.x + b.max.x) / 2, z = (b.min.z + b.max.z) / 2;
      const k = Math.hypot(x, z) > 195 ? 'loin' + Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI * 2) * 10) : Math.floor(x / 64) + ',' + Math.floor(z / 64);
      let l = this.cases.get(k);
      if (!l) this.cases.set(k, l = []);
      l.push(g);
    }
    return this.cases.size;
  }
  ajouter(scene, ombre, porteurs) {
    for (let l of this.cases.values()) {
      // le vent n'existe que sur certaines géométries (feuillages) : les autres reçoivent un poids nul
      const vent = l.some(g => g.attributes.aVent);
      if (vent) for (const g of l) if (!g.attributes.aVent) g.setAttribute('aVent', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
      // Les petits détails (cadres, volets, vitres, appuis, portes plaquées, pots) sont rangés en dernier : leur ombre
      // ne fait pas un texel de la carte d'ombre, la passe d'ombre s'arrête avant eux (même maillage, rien de copié).
      let nOmbre = 0;
      if (ombre) {
        const gros = [], petits = [];
        for (const g of l) (petit(g) ? petits : gros).push(g);
        l = gros.concat(petits);
        for (const g of gros) nOmbre += g.attributes.position.count;
      }
      const geo = indexer(fusion(l), true), m = new THREE.Mesh(geo, vent ? MAT_VENT : MAT);
      if (ombre && nOmbre < geo.attributes.position.count) {
        m.onBeforeShadow = () => geo.setDrawRange(0, nOmbre);
        m.onAfterShadow = () => geo.setDrawRange(0, Infinity);
      }
      m.castShadow = ombre; m.receiveShadow = true; m.renderOrder = ORDRE.bati; m.name = ombre ? 'décor' : 'détails';
      if (!ombre) { geo.computeBoundingSphere(); this.maillages.push(m); }
      scene.add(m);
      if (ombre) { m.geometry.computeBoundingBox(); porteurs.push(porteur(m, m.geometry.boundingBox)); }
    }
    this.cases.clear();
  }
}

// Fausse occlusion ambiante et ombres de contact : bandes et taches sombres dégradées posées au sol
// (pied des murs, sous les arbres, sous les rangs de vigne). Un seul maillage transparent.
class Contact {
  constructor() { this.p = []; this.a = []; }
  tri(x0, z0, a0, x1, z1, a1, x2, z2, a2, y) { this.p.push(x0, y, z0, x1, y, z1, x2, y, z2); this.a.push(a0, a1, a2); }
  quad(ax, az, aa, bx, bz, ba, cx, cz, ca, dx, dz, da, y) { this.tri(ax, az, aa, cx, cz, ca, bx, bz, ba, y); this.tri(bx, bz, ba, cx, cz, ca, dx, dz, da, y); }
  // jupe autour d'une emprise rectangulaire : sombre contre le mur, nulle à « l » mètres
  jupe(x0, z0, x1, z1, l, a, y = 0.06) {
    const X0 = x0 - l, Z0 = z0 - l, X1 = x1 + l, Z1 = z1 + l;
    this.quad(x0, z0, a, x1, z0, a, X0, Z0, 0, X1, Z0, 0, y); // nord
    this.quad(x1, z0, a, x1, z1, a, X1, Z0, 0, X1, Z1, 0, y); // est
    this.quad(x1, z1, a, x0, z1, a, X1, Z1, 0, X0, Z1, 0, y); // sud
    this.quad(x0, z1, a, x0, z0, a, X0, Z1, 0, X0, Z0, 0, y); // ouest
  }
  // tache ronde ou ovale
  tache(x, z, rx, rz, a, y = 0.06) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const t0 = i / n * Math.PI * 2, t1 = (i + 1) / n * Math.PI * 2;
      this.tri(x, z, a, x + Math.cos(t1) * rx, z + Math.sin(t1) * rz, 0, x + Math.cos(t0) * rx, z + Math.sin(t0) * rz, 0, y);
    }
  }
  // bande le long de z, sombre au milieu
  bande(x, z0, z1, l, a, y = 0.05) {
    this.quad(x - l, z0, 0, x, z0, a, x - l, z1, 0, x, z1, a, y);
    this.quad(x, z0, a, x + l, z0, 0, x, z1, a, x + l, z1, 0, y);
  }
  maillage() {
    const g = new THREE.BufferGeometry(), n = this.a.length, c = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) c[i * 4 + 3] = this.a[i];
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 4));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#2a2238', vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.renderOrder = 1; m.name = 'contact';
    return m;
  }
}

// Panneaux et enseignes : un seul atlas dessiné en code, un seul maillage. Les cases sont réservées au fur et à mesure,
// le dessin attend la fin : le canevas est alors créé à la hauteur exacte (rien de vide en mémoire graphique).
class Atlas {
  constructor() { this.x = 0; this.y = 0; this.ligne = 0; this.geos = []; this.geosL = []; this.cases = []; }
  // réserve une case w x h (pixels) pour un dessin ; place un rectangle w3 x h3 (mètres) dans le monde. lumineux : sans
  // éclairage ni ombre (l'intérieur allumé d'une boutique)
  poser(w, h, dessin, w3, h3, x, y, z, rot, lumineux = false) {
    if (this.x + w > 1024) { this.x = 0; this.y += this.ligne + 4; this.ligne = 0; }
    const px = this.x, py = this.y;
    this.x += w + 4; this.ligne = Math.max(this.ligne, h);
    this.cases.push({ px, py, w, h, dessin });
    const g = new THREE.PlaneGeometry(w3, h3), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (px + uv.getX(i) * w) / 1024, py + (1 - uv.getY(i)) * h); // v en pixels, ramené à la fin
    g.rotateY(rot); g.translate(x, y, z);
    (lumineux ? this.geosL : this.geos).push(g);
  }
  maillage() {
    const H = Math.ceil((this.y + this.ligne) / 4) * 4, cv = document.createElement('canvas');
    cv.width = 1024; cv.height = H;
    const c = cv.getContext('2d');
    for (const { px, py, w, h, dessin } of this.cases) { c.save(); c.translate(px, py); c.beginPath(); c.rect(0, 0, w, h); c.clip(); dessin(c, w, h); c.restore(); }
    for (const g of [...this.geos, ...this.geosL]) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i) / H); }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = new THREE.Mesh(fusion(this.geos), new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5 }));
    m.renderOrder = ORDRE.bati; m.name = 'enseignes';
    if (this.geosL.length) {
      this.lumineux = new THREE.Mesh(fusion(this.geosL), new THREE.MeshBasicMaterial({ map: tex }));
      this.lumineux.renderOrder = ORDRE.bati; this.lumineux.name = 'intérieurs';
    }
    return m;
  }
}

export function construireMonde(scene, col, opts) {
  // un seul tirage au sort pour tout le monde (même graine : même monde) ; le hameau a le sien (voir hameau()), pour que
  // l'ajouter n'ait rien déplacé ailleurs
  let rnd = hasard(20261122);
  const pick = a => a[Math.floor(rnd() * a.length)];
  const plan = []; // dessin de la mini-carte
  const rect = (x0, z0, x1, z1, c) => plan.push({ t: 'r', x0, z0, x1, z1, c });
  const bati = new Grille(), proches = new Grille(), contact = new Contact(), atlas = new Atlas(), porteurs = [], vitresB = [];
  const portes = {}; // la porte de chaque client (lieux.portes)

  /* ------------------------------------------------------------ ciel
     Dôme dessiné après le décor (seuls les pixels restés vides sont calculés). Son horizon a
     exactement la couleur de la brume, éclairée du côté du soleil : le paysage s'y fond sans couture. */
  const ciel = new THREE.Group();
  const brumeC = new THREE.Color(BRUME);
  {
    // le dégradé se calcule aux sommets ; seuls les pixels proches du soleil font le halo serré et le disque
    const dome = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.ShaderMaterial({
      uniforms: { uBrume: { value: brumeC }, uMilieu: { value: new THREE.Color('#e38a78') }, uZenith: { value: new THREE.Color('#2b4888') }, uNuit: { value: 0 } },
      vertexShader: `varying vec3 vDir;
varying vec3 vCiel;
uniform vec3 uBrume, uMilieu, uZenith;
uniform float uNuit;
${GLSL_BRUME}
void main() {
  vDir = position;
  vec3 d = normalize(position);
  float y = max(d.y, 0.0), k = dot(d, SOLEIL_DIR), s = max(k, 0.0), s2 = s * s, s4 = s2 * s2, s8 = s4 * s4;
  vec3 c = mix(cl_brumeLarge(uBrume, k), uMilieu, smoothstep(0.0, 0.22, y));
  vCiel = mix(c, uZenith, smoothstep(0.12, 0.75, y)) + vec3(1.0, 0.68, 0.38) * (s8 * s2 * 0.3) * smoothstep(-0.04, 0.08, d.y) * (1.0 - uNuit);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      fragmentShader: `varying vec3 vDir;
varying vec3 vCiel;
uniform float uNuit;
${GLSL_BRUME}
void main() {
  vec3 c = vCiel;
  vec3 d = normalize(vDir);
  float k = dot(d, SOLEIL_DIR), jour = 1.0 - uNuit;
  if (k > 0.72 && jour > 0.0) {
    // le soleil couché : halo et disque s'éteignent
    float y = max(d.y, 0.0);
    c += vec3(1.0, 0.62, 0.3) * cl_halo(k) * (1.0 - smoothstep(0.0, 0.22, y)) * (1.0 - smoothstep(0.12, 0.75, y)) * jour;
    c += vec3(1.0, 0.68, 0.38) * pow(k, 120.0) * 0.9 * smoothstep(-0.04, 0.08, d.y) * jour;
    c = mix(c, vec3(5.0, 4.0, 2.8), smoothstep(0.99885, 0.9992, k) * jour);
  }
  if (uNuit > 0.0 && d.y > 0.02) {
    // les étoiles, quand la nuit tombe : une sur quelques centaines de cases du ciel, d'éclat inégal
    vec3 q = floor(d * 260.0);
    float h = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    c += vec3(0.86, 0.9, 1.0) * step(0.9968, h) * (0.5 + 0.5 * fract(h * 131.0)) * smoothstep(0.02, 0.3, d.y) * uNuit * uNuit;
  }
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    }));
    dome.renderOrder = ORDRE.ciel; dome.frustumCulled = false; dome.name = 'ciel'; ciel.add(dome); ciel.userData.dome = dome;
    // nuages roses, éclairés par en dessous (dégradé du dessous doré vers le dessus mauve)
    const nu = [];
    for (let i = 0; i < 12; i++) {
      const a = rnd() * Math.PI * 2, r = 520 + rnd() * 140, y = 95 + rnd() * 120;
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      const n = 3 + Math.floor(rnd() * 4);
      for (let k = 0; k < n; k++) nu.push(S(18 + rnd() * 16, '#ffffff', cx + (rnd() - 0.5) * 70, y + rnd() * 8, cz + (rnd() - 0.5) * 70, 1.7, 0.42, 1.2));
    }
    const g = fusion(nu), p = g.attributes.position, cc = g.attributes.color, c = new THREE.Color(), v = new THREE.Vector3();
    const bas = new THREE.Color('#ffd2a6'), haut = new THREE.Color('#e7a1a8'), lueur = new THREE.Color('#fff0d0');
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i));
      const y = v.y, lum = Math.max(0, v.normalize().dot(SOLEIL));
      c.copy(bas).lerp(haut, lisse((y - 90) / 70)).lerp(lueur, Math.pow(lum, 6) * 0.7);
      cc.setXYZ(i, c.r, c.g, c.b);
    }
    const nuages = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false }));
    nuages.renderOrder = ORDRE.nuages; nuages.frustumCulled = false; nuages.name = 'nuages'; ciel.add(nuages); ciel.userData.nuages = nuages;
  }
  scene.add(ciel);

  /* ------------------------------------------------------------ lumière */
  const hemi = new THREE.HemisphereLight('#d3cfe6', '#9a6a45', 1.75);
  scene.add(hemi);
  const soleilL = new THREE.DirectionalLight('#ffb46e', 3.15);
  soleilL.castShadow = true;
  const ts = opts.mobile ? 1024 : 2048;
  soleilL.shadow.mapSize.set(ts, ts);
  const sc = soleilL.shadow.camera;
  sc.left = -42; sc.right = 42; sc.top = 42; sc.bottom = -42; sc.near = 1; sc.far = 220;
  soleilL.shadow.bias = -0.0006; soleilL.shadow.normalBias = 0.04;
  scene.add(soleilL, soleilL.target);

  /* La nuit qui tombe : n de 0 (la lumière dorée du jeu) à 1 (pleine nuit), d'après l'heure (main.js). Le soleil bas reste
     où il est (sa direction est dans les shaders) mais s'éteint ; le ciel, la brume et les nuages passent au bleu nuit,
     les étoiles paraissent ; la lumière du soleil devient un clair de lune, pâle et bleuté (qui garde des ombres douces),
     et l'ambiance reste assez claire pour jouer ; fenêtres et réverbères brillent plus fort (modeles.js, uNuit). */
  const JOUR = { brume: new THREE.Color(BRUME), milieu: new THREE.Color('#e38a78'), zenith: new THREE.Color('#2b4888'), ciel: new THREE.Color('#d3cfe6'), sol: new THREE.Color('#9a6a45'), soleil: new THREE.Color('#ffb46e'), nuages: new THREE.Color('#ffffff') };
  const NUIT = { brume: new THREE.Color('#2b3452'), milieu: new THREE.Color('#2a3354'), zenith: new THREE.Color('#0a1130'), ciel: new THREE.Color('#a3aed6'), sol: new THREE.Color('#45404c'), soleil: new THREE.Color('#9fb3ea'), nuages: new THREE.Color('#3a4262') };
  function nuit(n) {
    UNI.uNuit.value = n;
    const D = ciel.userData.dome.material.uniforms, m = (k, c) => c.copy(JOUR[k]).lerp(NUIT[k], n);
    D.uNuit.value = n; m('brume', D.uBrume.value); m('milieu', D.uMilieu.value); m('zenith', D.uZenith.value);
    if (scene.fog) scene.fog.color.copy(D.uBrume.value);
    m('nuages', ciel.userData.nuages.material.color);
    m('ciel', hemi.color); m('sol', hemi.groundColor); hemi.intensity = 1.75 - 0.6 * n;
    m('soleil', soleilL.color); soleilL.intensity = 3.15 - 2.45 * lisse(n); // le soleil, puis la lune
  }

  /* ------------------------------------------------------------ terrain */
  {
    let g = new THREE.PlaneGeometry(1700, 1700, 110, 110);
    g.rotateX(-Math.PI / 2);
    const pa = g.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) pa[i + 1] = forme(pa[i], pa[i + 2]) - 0.02;
    // les coins du carré ne sont jamais à portée de vue (zone de jeu de 186 m, vue limitée à 620 m) : retirés ; la zone
    // retouchée autour du château a sa grille fine (plus bas)
    const ix = g.index.array, garde = [], proche = j => pa[j * 3] * pa[j * 3] + pa[j * 3 + 2] * pa[j * 3 + 2] < 830 * 830;
    const fine = (a, b, c) => { const x = (pa[a * 3] + pa[b * 3] + pa[c * 3]) / 3, z = (pa[a * 3 + 2] + pa[b * 3 + 2] + pa[c * 3 + 2]) / 3; return x > ZONE.x0 && x < ZONE.x1 && z > ZONE.z0 && z < ZONE.z1; };
    for (let i = 0; i < ix.length; i += 3) if ((proche(ix[i]) || proche(ix[i + 1]) || proche(ix[i + 2])) && !fine(ix[i], ix[i + 1], ix[i + 2])) garde.push(ix[i], ix[i + 1], ix[i + 2]);
    // Découpé en morceaux : un disque au centre, puis deux couronnes de dix secteurs. Ce qui est derrière la caméra ou
    // au-delà de sa portée n'est plus dessiné (les deux tiers des triangles du terrain, en moyenne). Les triangles sont
    // rangés par morceau avant d'être dépliés : chaque morceau est une plage du même tampon (ni copie ni mémoire en plus).
    const nT = garde.length / 3, cles = new Uint8Array(nT), ordre = new Uint32Array(nT);
    for (let t = 0; t < nT; t++) {
      const a = garde[t * 3] * 3, b = garde[t * 3 + 1] * 3, c = garde[t * 3 + 2] * 3;
      const x = (pa[a] + pa[b] + pa[c]) / 3, z = (pa[a + 2] + pa[b + 2] + pa[c + 2]) / 3, r = Math.hypot(x, z);
      cles[t] = r < 230 ? 0 : (r < 480 ? 1 : 11) + Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI * 2) * 10) % 10;
      ordre[t] = t;
    }
    ordre.sort((a, b) => cles[a] - cles[b]);
    const trie = new Uint32Array(garde.length);
    for (let j = 0; j < nT; j++) { const t = ordre[j]; trie[j * 3] = garde[t * 3]; trie[j * 3 + 1] = garde[t * 3 + 1]; trie[j * 3 + 2] = garde[t * 3 + 2]; }
    g.setIndex(new THREE.BufferAttribute(trie, 1));
    g = g.toNonIndexed();
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    const q = g.attributes.position, cols = new Float32Array(q.count * 3), types = new Float32Array(q.count), c = new THREE.Color();
    // teintes lues une fois (et non à chaque triangle)
    const herbes = ['#8ea04f', '#97a855', '#86994a', '#9aa95a'].map(h => new THREE.Color(h));
    const champs = ['#c9b46a', '#93a84e', '#d8a83c', '#b86b32', '#7d9146', '#8a6a48', '#56713d', '#a9a24f'].map(h => new THREE.Color(h));
    const qa = q.array;
    for (let i = 0; i < q.count; i += 3) {
      const o = i * 3, x = (qa[o] + qa[o + 3] + qa[o + 6]) / 3, z = (qa[o + 2] + qa[o + 5] + qa[o + 8]) / 3;
      const r = Math.hypot(x, z);
      if (r < 200) c.copy(herbes[Math.floor(hache(Math.floor(x / 13), Math.floor(z / 13)) * herbes.length)]);
      else c.copy(champs[Math.floor(hache(Math.floor(x / 55) + 7, Math.floor(z / 48) - 3) * champs.length)]);
      for (let k = 0; k < 3; k++) { cols[(i + k) * 3] = c.r; cols[(i + k) * 3 + 1] = c.g; cols[(i + k) * 3 + 2] = c.b; types[i + k] = r < 200 ? T.herbe : T.champ; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.setAttribute('aMat', new THREE.BufferAttribute(types, 1));
    // un maillage par morceau : mêmes tampons, plage de sommets à lui, sphère englobante à lui (pour l'élagage)
    for (let j = 0; j < nT;) {
      let f = j;
      while (f < nT && cles[ordre[f]] === cles[ordre[j]]) f++;
      const m = new THREE.BufferGeometry();
      for (const [nom, at] of Object.entries(g.attributes)) m.setAttribute(nom, at);
      m.setDrawRange(j * 3, (f - j) * 3);
      // sphère serrée, comme three.js la calcule : centre de la boîte, rayon jusqu'au sommet le plus loin
      const b = new THREE.Box3(), v = new THREE.Vector3(), sp = new THREE.Sphere();
      for (let i = j * 9; i < f * 9; i += 3) b.expandByPoint(v.set(qa[i], qa[i + 1], qa[i + 2]));
      b.getCenter(sp.center);
      let r2 = 0;
      for (let i = j * 9; i < f * 9; i += 3) r2 = Math.max(r2, sp.center.distanceToSquared(v.set(qa[i], qa[i + 1], qa[i + 2])));
      sp.radius = Math.sqrt(r2); m.boundingSphere = sp;
      const sol = new THREE.Mesh(m, MAT);
      sol.receiveShadow = true; sol.renderOrder = ORDRE.sol; sol.name = 'terrain';
      scene.add(sol);
      j = f;
    }
  }
  // La zone retouchée autour du château (relief.js) : sa grille fine, les triangles mêmes du sol où l'on marche ; des
  // prés le long de la route et autour du château, des champs ailleurs (comme le grand terrain). En blocs de 6 x 6
  // mailles du grand terrain, élagués hors champ.
  {
    const Z = ZONE, L = Z.nx + 1, BLOC = 6 * FIN, c = new THREE.Color();
    const herbes = ['#8ea04f', '#97a855', '#86994a', '#9aa95a'].map(h => new THREE.Color(h));
    const champs = ['#c9b46a', '#93a84e', '#d8a83c', '#b86b32', '#7d9146', '#8a6a48', '#56713d', '#a9a24f'].map(h => new THREE.Color(h));
    for (let b0 = 0; b0 < Z.nz; b0 += BLOC) for (let a0 = 0; a0 < Z.nx; a0 += BLOC) {
      const a1 = Math.min(Z.nx, a0 + BLOC), b1 = Math.min(Z.nz, b0 + BLOC), n = (a1 - a0) * (b1 - b0) * 6;
      const pos = new Float32Array(n * 3), cols = new Float32Array(n * 3), types = new Float32Array(n);
      let k = 0;
      const sommet = (a, b) => { pos[k * 3] = Z.x0 + a * Z.pas; pos[k * 3 + 1] = GRILLE[b * L + a] - 0.02; pos[k * 3 + 2] = Z.z0 + b * Z.pas; k++; };
      for (let b = b0; b < b1; b++) for (let a = a0; a < a1; a++) for (let t = 0; t < 2; t++) {
        const k0 = k;
        if (t === 0) { sommet(a, b); sommet(a, b + 1); sommet(a + 1, b); } else { sommet(a, b + 1); sommet(a + 1, b + 1); sommet(a + 1, b); }
        const x = (pos[k0 * 3] + pos[k0 * 3 + 3] + pos[k0 * 3 + 6]) / 3, z = (pos[k0 * 3 + 2] + pos[k0 * 3 + 5] + pos[k0 * 3 + 8]) / 3;
        const pre = Math.hypot(x, z) < 200 || reserve(x, z, 8);
        if (pre) c.copy(herbes[Math.floor(hache(Math.floor(x / 13), Math.floor(z / 13)) * herbes.length)]);
        else c.copy(champs[Math.floor(hache(Math.floor(x / 55) + 7, Math.floor(z / 48) - 3) * champs.length)]);
        for (let q = k0; q < k; q++) { cols[q * 3] = c.r; cols[q * 3 + 1] = c.g; cols[q * 3 + 2] = c.b; types[q] = pre ? T.herbe : T.champ; }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      g.setAttribute('aMat', new THREE.BufferAttribute(types, 1));
      g.computeVertexNormals(); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, MAT);
      m.receiveShadow = true; m.renderOrder = ORDRE.sol; m.name = 'terrain';
      scene.add(m);
    }
  }

  /* ------------------------------------------------------------ routes, place, cour, parcelles */
  const surf = [];
  const ROUTE = '#55575f', VIEILLE = '#78736b', LIGNE = '#ece6d4', TROTT = '#bdb19b', PAVES = '#a89c88', BORDURE = '#d9cdb2';
  // la départementale ; dans le bourg (x de 22 à 158) une vieille chaussée plus claire, sans bandes blanches, entre deux
  // caniveaux pavés ; au cœur du bourg (x de 70 à 120, carrefour de la rue de la place), elle est pavée
  surf.push(B(442, 0.06, 7, ROUTE, -199, 0, 10), B(136, 0.06, 7, VIEILLE, 90, 0, 10), B(262, 0.06, 7, ROUTE, 289, 0, 10));
  for (const [x0, x1] of [[-420, 22], [158, 420]]) surf.push(B(x1 - x0, 0.065, 0.14, LIGNE, (x0 + x1) / 2, 0, 6.85), B(x1 - x0, 0.065, 0.14, LIGNE, (x0 + x1) / 2, 0, 13.15));
  for (let x = -414; x < 420; x += 9) if (x < 20 || x > 160) surf.push(B(3, 0.068, 0.15, LIGNE, x, 0, 10));
  surf.push(B(136, 0.066, 0.6, PAVES, 90, 0, 6.8), B(136, 0.066, 0.6, PAVES, 90, 0, 13.2), B(50, 0.07, 6.98, PAVES, 95, 0, 10));
  rect(-200, 6.5, 200, 13.5, '#4a4c55'); rect(70, 6.5, 120, 13.5, '#a89c88');
  // trottoirs du bourg, bordés de pierre
  surf.push(B(130, 0.09, 4, TROTT, 90, 0, 4.5), B(130, 0.09, 4, TROTT, 90, 0, 15.5));
  surf.push(B(67, 0.14, 0.22, BORDURE, 58.5, 0, 6.39), B(57, 0.14, 0.22, BORDURE, 126.5, 0, 6.39), B(130, 0.14, 0.22, BORDURE, 90, 0, 13.61));
  rect(25, 2.5, 155, 6.5, TROTT); rect(25, 13.5, 155, 17.5, TROTT);
  // rue du bourg vers la place et la mairie : petits pavés ; parvis de l'église
  surf.push(B(6, 0.062, 90, PAVES, 95, 0, -35), B(3.4, 0.082, 12, '#cdb998', 113.6, 0, -46));
  rect(92, -80, 98, 6.5, '#a89c88');
  // place pavée
  surf.push(B(38, 0.08, 34, '#cdb998', 95, 0, -46));
  surf.push(B(16, 0.081, 9, '#cdb998', 95, 0, -77));
  rect(76, -63, 114, -29, '#cdb998'); rect(87, -82, 103, -72, '#cdb998');
  // chemin et cour du domaine
  surf.push(B(4, 0.06, 41.5, '#c9b993', -90, 0, -14.25));
  surf.push(B(53, 0.055, 38, '#cfc1a0', -88.5, 0, -53));
  rect(-92, -34, -88, 6.5, '#c9b993'); rect(-115, -72, -62, -34, '#cfc1a0');
  // L'aire de remplissage du pulvérisateur, au nord de la cour (dalle de béton), et les chemins de vigne qui partent
  // derrière le domaine vers le nord des Perrières et du Clos (mission 2 : la journée de traitement). Un chemin : une
  // bande de terre battue le long de ses points, à plat.
  const CHEMINS = [[[-86, -66], [-87.5, -80], [-100, -114], [-147, -114]], [[-87.5, -80], [-72, -114], [-36, -114]]];
  for (const pts of CHEMINS) {
    const p = [];
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l * 2.1, nz = (bx - ax) / l * 2.1;
      const A = [ax + nx, 0.05, az + nz], Bb = [ax - nx, 0.05, az - nz], Cc = [bx + nx, 0.05, bz + nz], D = [bx - nx, 0.05, bz - nz];
      for (const [u, v, w] of [[A, Bb, Cc], [Bb, D, Cc]]) {
        const ny = (v[2] - u[2]) * (w[0] - u[0]) - (v[0] - u[0]) * (w[2] - u[2]);
        p.push(...u, ...(ny >= 0 ? v : w), ...(ny >= 0 ? w : v));
      }
      // le coin : un disque pour raccorder deux tronçons
      if (i > 1) for (let k = 0; k < 8; k++) { const a0 = k / 8 * Math.PI * 2, a1 = (k + 1) / 8 * Math.PI * 2; p.push(ax, 0.05, az, ax + Math.cos(a1) * 2.1, 0.05, az + Math.sin(a1) * 2.1, ax + Math.cos(a0) * 2.1, 0.05, az + Math.sin(a0) * 2.1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
    surf.push(teinter(g, '#c9b993'));
    plan.push({ t: 'l', pts, c: '#c9b993', w: 4.2 });
  }
  surf.push(B(6, 0.09, 8.5, '#8f8a80', -86, 0, -67));
  rect(-89, -71.25, -83, -62.75, '#a9a399');
  // parking de l'église
  surf.push(B(12, 0.055, 9, '#cfc1a0', 121, 0, -59.5));
  rect(115, -64, 127, -55, '#cfc1a0');
  // chemin des Grands Champs et placette du hameau (le hameau lui-même : hameau())
  // il commence au bord de la chaussée (z = 13,5) : il ne recouvre ni la route ni sa ligne de rive
  surf.push(B(4.6, 0.06, 111, '#c9b993', -55, 0, 69), B(27, 0.062, 19, '#c9b993', -56, 0, 133));
  rect(-57.3, 13.5, -52.7, 124.5, '#c9b993'); rect(-69.5, 123.5, -42.5, 142.5, '#c9b993');

  // vignes d'automne : chenin (jaune) et cabernet franc (rouge)
  const PAL = {
    chenin: ['#e2b23a', '#d9a832', '#eac24a', '#cfa13a', '#bca73e', '#e6b845'],
    cabernet: ['#c2562e', '#b0402c', '#d0702f', '#9e3a2e', '#c98a34', '#b84a35'],
  };
  const PARCELLES = [
    [-165, -110, -125, -20, 'chenin'], [-58, -110, -12, -25, 'cabernet'], [0, -110, 50, -25, 'chenin'],
    [145, -110, 178, -10, 'cabernet'], [-160, 25, -112, 100, 'chenin'], [-106, 25, -60, 100, 'cabernet'],
    [-50, 30, -8, 108, 'cabernet'], [-2, 30, 36, 108, 'chenin'], [60, 34, 172, 110, 'cabernet'],
  ];
  const parcs = PARCELLES.map(([x0, z0, x1, z1, cep]) => {
    const q = col.parcelle(x0, z0, x1, z1, 2.2);
    q.cep = cep;
    surf.push(B(x1 - x0, 0.045, z1 - z0, '#7a5c3f', (x0 + x1) / 2, 0, (z0 + z1) / 2));
    // enherbement un rang sur deux, et tournières enherbées au bout des rangs
    for (let k = 0; k < q.n - 1; k += 2) surf.push(B(1.15, 0.07, q.zr1 - q.zr0 + 1.2, k % 4 ? '#8a9a4c' : '#7f9046', q.xr + (k + 0.5) * q.ecart, 0, (q.zr0 + q.zr1) / 2));
    surf.push(B(x1 - x0, 0.07, 1.6, '#7f9046', (x0 + x1) / 2, 0, z0 + 0.8), B(x1 - x0, 0.07, 1.6, '#7f9046', (x0 + x1) / 2, 0, z1 - 0.8));
    rect(x0, z0, x1, z1, '#7a5c3f');
    plan.push({ t: 'rangs', q, c: cep === 'chenin' ? '#d8ad3c' : '#bf5a30' });
    return q;
  });
  const surfaces = new THREE.Mesh(fusion(surf), MAT);
  surfaces.receiveShadow = true; surfaces.renderOrder = ORDRE.sol; surfaces.name = 'surfaces';
  scene.add(surfaces);

  /* ------------------------------------------------------------ rangs de vigne
     Une instance par travée (6 m entre deux piquets) : feuillage, souches et piquet. Le feuillage
     ondule (relief irrégulier, vent) dans le shader ; quelques manquants coupent les rangs ; fils de
     palissage, piquets de tête inclinés et leurs haubans au bout de chaque rang. Les travées sont
     rangées par blocs de 30 m : l'élagage (vue et ombre) est fin, et les blocs lointains passent
     à une géométrie simplifiée. */
  const vignes = [];
  {
    // sub : nombre de tronçons du feuillage ; loin : sans piquet ni dessous (invisibles au-delà de 45 m, et la
    // version lointaine ne porte pas d'ombre) : 18 triangles au lieu de 32
    const geoTravee = (sub, loin = false) => {
      const P = [[-0.15, 0.58], [-0.31, 1.08], [0, 1.66], [0.31, 1.08], [0.15, 0.58]];
      const pos = [], cols = [], mats = [], idx = [];
      const sommet = (x, y, z, c, m) => { pos.push(x, y, z); cols.push(c.r, c.g, c.b); mats.push(m); return mats.length - 1; };
      const blanc = new THREE.Color('#ffffff'), souche = new THREE.Color('#5a3f2b'), piquet = new THREE.Color('#8d7c66');
      for (let r = 0; r <= sub; r++) for (const [x, y] of P) sommet(x, y, -0.5 + r / sub, blanc, T.feuillage);
      for (let r = 0; r < sub; r++) for (let i = 0; i < 4; i++) { const a = r * 5 + i, b = a + 1, c = a + 5, d = a + 6; idx.push(a, c, b, b, c, d); }
      // dessous fermé : la carte d'ombre ne garde que les faces arrière, un volume ouvert laisserait passer le soleil
      if (!loin) for (let r = 0; r < sub; r++) { const a = r * 5 + 4, b = r * 5, c = a + 5, d = b + 5; idx.push(a, c, b, b, c, d); }
      for (const [i, j, k] of [[0, 1, 4], [1, 3, 4], [1, 2, 3]]) { idx.push(i, j, k); const o = sub * 5; idx.push(o + i, o + k, o + j); }
      // souches : un bandeau sombre sous le feuillage
      for (const s of [-1, 1]) {
        const a = sommet(s * 0.055, 0, -0.5, souche, T.bois), b = sommet(s * 0.055, 0.62, -0.5, souche, T.bois);
        const c = sommet(s * 0.055, 0, 0.5, souche, T.bois), d = sommet(s * 0.055, 0.62, 0.5, souche, T.bois);
        if (s < 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
      }
      // piquet au début de la travée (épaisseur en z ramenée à une travée de 6 m)
      if (!loin) {
        const bx = new THREE.BoxGeometry(0.08, 1.85, 0.08 / 6).translate(0, 0.925, -0.5 + 0.04 / 6);
        const o = mats.length, bp = bx.attributes.position;
        for (let i = 0; i < bp.count; i++) sommet(bp.getX(i), bp.getY(i), bp.getZ(i), piquet, T.bois);
        for (const i of bx.index.array) idx.push(o + i);
        bx.dispose();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      g.setAttribute('aMat', new THREE.Float32BufferAttribute(mats, 1));
      g.setIndex(idx); g.computeVertexNormals();
      return g;
    };
    const gFine = geoTravee(4), gSimple = geoTravee(1), gLoin = geoTravee(1, true);
    const matV = detailler(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), undefined, { vent: [0.05, 0.9, 1.7, 1.7], teinteFeuillage: true, ondule: true });
    const fils = [];
    const m = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), ech = new THREE.Vector3(), c = new THREE.Color();
    const PALC = { chenin: PAL.chenin.map(h => new THREE.Color(h)), cabernet: PAL.cabernet.map(h => new THREE.Color(h)) };
    // piquets de tête : deux modèles (début et fin de rang), copiés et déplacés
    const TETE = [-1, 1].map(s => teinter(new THREE.BoxGeometry(0.11, 2.1, 0.11).translate(0, 1.0, 0).rotateX(s * 0.2), '#7d6b55'));
    for (const q of parcs) {
      const pal = PALC[q.cep], blocs = new Map();
      for (let k = 0; k < q.n; k++) {
        const rx = q.xr + k * q.ecart;
        for (let z = q.zr0; z < q.zr1 - 0.5; z += 6) {
          let len = Math.min(6, q.zr1 - z);
          if (rnd() < 0.11 && len > 3) len -= 1.0 + rnd() * 1.3; // manquant : un ou deux ceps absents
          const t = bruit(rx * 0.09 + 11, z * 0.045);
          c.copy(pal[Math.min(pal.length - 1, Math.floor(t * pal.length * 1.2))]).lerp(pick(pal), 0.3);
          const cle = Math.floor((rx - q.x0) / 30) + ',' + Math.floor((z + len / 2 - q.z0) / 30);
          if (!blocs.has(cle)) blocs.set(cle, []);
          blocs.get(cle).push(rx, z + len / 2, len, 0.92 + rnd() * 0.16, 0.9 + rnd() * 0.2, c.r, c.g, c.b);
        }
        // fils de palissage, piquets de tête inclinés vers l'extérieur et haubans
        for (const y of [0.62, 1.15, 1.55]) fils.push(rx, y, q.zr0 - 0.1, rx, y, q.zr1 + 0.1);
        for (const s of [-1, 1]) {
          const zb = s < 0 ? q.zr0 - 0.15 : q.zr1 + 0.15;
          bati.push(deplacer(TETE[s < 0 ? 0 : 1].clone(), rx, 0, zb));
          fils.push(rx, 1.95, zb + s * 0.4, rx, 0, zb + s * 1.5);
        }
        contact.bande(rx, q.zr0, q.zr1, 0.85, 0.2);
      }
      // de loin, toute la parcelle en un seul appel de dessin (géométrie simplifiée, sans ombre portée)
      const nt = [...blocs.values()].reduce((a, l) => a + l.length / 8, 0), loin = new THREE.InstancedMesh(gLoin, matV, nt);
      let it = 0;
      const blocsP = [];
      for (const travees of blocs.values()) {
        const n = travees.length / 8, im = new THREE.InstancedMesh(gFine, matV, n), bb = new THREE.Box3(), i0 = it;
        let sx = 0, sz = 0;
        for (let i = 0; i < n; i++) {
          const o = i * 8;
          sx += travees[o]; sz += travees[o + 1];
          bb.expandByPoint(pos.set(travees[o] - 0.4, 0, travees[o + 1] - travees[o + 2] / 2)).expandByPoint(pos.set(travees[o] + 0.4, 2, travees[o + 1] + travees[o + 2] / 2));
          m.compose(pos.set(travees[o], 0, travees[o + 1]), quat, ech.set(travees[o + 4], travees[o + 3], travees[o + 2]));
          im.setMatrixAt(i, m); im.setColorAt(i, c.setRGB(travees[o + 5], travees[o + 6], travees[o + 7]));
          loin.setMatrixAt(it, m); loin.setColorAt(it++, c);
        }
        im.castShadow = true; im.receiveShadow = true; im.renderOrder = ORDRE.vegetal; im.name = 'vigne'; im.computeBoundingSphere();
        // (t : x du rang, z du milieu, longueur et couleur d'automne de chaque travée ; i0 : sa place dans « loin » ; traite :
        // la travée a reçu le traitement, mission2.js)
        scene.add(im); blocsP.push({ im, x: sx / n, z: sz / n, t: Float32Array.from(travees), i0, n, traite: new Uint8Array(n), b: bb.clone() });
        porteurs.push(porteur(im, bb));
      }
      loin.receiveShadow = true; loin.renderOrder = ORDRE.vegetal; loin.name = 'vigne-loin'; loin.visible = false; loin.computeBoundingSphere();
      scene.add(loin);
      vignes.push({ q, loin, blocs: blocsP });
    }
    const gf = new THREE.BufferGeometry();
    gf.setAttribute('position', new THREE.Float32BufferAttribute(fils, 3));
    const lf = new THREE.LineSegments(gf, new THREE.LineBasicMaterial({ color: '#3d3833' }));
    lf.renderOrder = ORDRE.vegetal; lf.name = 'palissage'; scene.add(lf);
    vignes.fine = gFine; vignes.simple = gSimple;
  }
  // Une travée traitée (mission2.js) : un voile bleuté de cuivre sur ses feuilles
  const VOILE = new THREE.Color('#a3c6c8'), cT = new THREE.Color();
  function teinteTravee(v, b, k) {
    const T = b.t, o = k * 8;
    cT.setRGB(T[o + 5], T[o + 6], T[o + 7]);
    if (b.traite[k]) cT.lerp(VOILE, 0.45);
    b.im.setColorAt(k, cT); v.loin.setColorAt(b.i0 + k, cT);
  }
  // Le pulvérisateur passe en (x, z) dans la parcelle v : les travées des rangs à moins de demi mètres de part et d'autre,
  // à hauteur de z, reçoivent le traitement. Rend le nombre de travées traitées à l'instant.
  // une partie reprise (sauvegarde.js) : les travées déjà traitées (une chaîne de 0 et de 1 par bloc), repeintes d'un coup
  function retraiter(v, etats) {
    v.blocs.forEach((b, j) => {
      const e = etats[j] || '';
      for (let k = 0; k < b.n; k++) if (e[k] === '1' && !b.traite[k]) { b.traite[k] = 1; teinteTravee(v, b, k); }
      const ci = b.im.instanceColor; ci.clearUpdateRanges(); ci.needsUpdate = true;
    });
    const cl = v.loin.instanceColor; cl.clearUpdateRanges(); cl.needsUpdate = true;
  }
  function traiter(v, x, z, demi) {
    let n = 0;
    for (const b of v.blocs) {
      if (x < b.b.min.x - demi || x > b.b.max.x + demi || z < b.b.min.z - 0.5 || z > b.b.max.z + 0.5) continue;
      const T = b.t;
      for (let k = 0; k < b.n; k++) {
        const o = k * 8;
        if (b.traite[k] || Math.abs(T[o] - x) > demi || Math.abs(T[o + 1] - z) > T[o + 2] / 2 + 0.3) continue;
        b.traite[k] = 1; teinteTravee(v, b, k); n++;
        // seule la couleur de cette travée part vers la carte graphique (pas tout le tampon)
        const ci = b.im.instanceColor, cl = v.loin.instanceColor;
        ci.addUpdateRange(k * 3, 3); ci.needsUpdate = true; cl.addUpdateRange((b.i0 + k) * 3, 3); cl.needsUpdate = true;
      }
    }
    return n;
  }

  /* ------------------------------------------------------------ bâtiments
     De vieilles bâtisses : murs en pierre de taille (tuffeau), en moellons ou enduits à la chaux ; sur les deux derniers,
     chaînes d'angle et encadrements en tuffeau. Corniche sous l'égout, appuis de fenêtre, seuil de pierre, souche de
     cheminée et ses pots, lucarnes sur certains toits, vigne vierge ou treille sur certaines façades. Ce qui varie d'une
     maison à l'autre est tiré d'après sa place (hm) : le tirage au sort du reste du monde ne bouge pas. */
  const MOELLONS = ['#cdbf9f', '#c7b593', '#d3c4a3'], ENDUITS = ['#e6d4b0', '#ead9bb', '#dfcaa4', '#e9d2a8'];
  const PIERRE = '#e3dac6', APPUI = '#d9cdb2', TAILLE = '#e8decb'; // TAILLE : pierre de taille lisse (chaînes, encadrements)
  // Plaque de pierre de taille posée à plat sur un mur (chaîne d'angle, encadrement) : un seul quadrilatère, à 6 mm du mur,
  // tourné vers n (axe 'x' ou 'z', sens s). Trois fois moins de triangles qu'un bloc, pour un relief qu'on ne voit pas.
  const plaques = [];
  const plaque = (x, y, z, axe, s, l, hh) => {
    const u = l / 2, v = hh / 2, a = axe === 'x' ? [x, y - v, z - u * s] : [x + u * s, y - v, z], b = axe === 'x' ? [x, y - v, z + u * s] : [x - u * s, y - v, z];
    const c = [b[0], y + v, b[2]], d = [a[0], y + v, a[2]];
    plaques.push(...a, ...c, ...b, ...a, ...d, ...c);
  };
  const finirPlaques = L => {
    if (!plaques.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(plaques, 3));
    g.computeVertexNormals();
    L.push(teinter(g, TAILLE));
    plaques.length = 0;
  };
  const fenetre = (L, x, y, z, f, volets, pierre) => {
    if (pierre) plaque(x, y, z + f * 0.006, 'z', f, 1.2, 1.58);
    L.push(B(0.98, 1.34, 0.08, '#efe7d6', x, y, z + f * 0.02));
    L.push(B(0.74, 1.1, 0.1, rnd() < 0.2 ? '#4a3a2a' : '#2f3c4f', x, y, z + f * 0.035)); // certaines fenêtres sont déjà allumées
    if (f > 0) L.push(B(1.12, 0.08, 0.2, APPUI, x, y - 0.71, z + f * 0.07)); // appui, côté rue
    if (volets) L.push(B(0.46, 1.32, 0.06, volets, x - 0.75, y, z + f * 0.05), B(0.46, 1.32, 0.06, volets, x + 0.75, y, z + f * 0.05));
  };
  // Feuilles plates (petits losanges) plaquées contre un mur, regroupées par couleur : items [x, y, z, taille, angle, couleur].
  // axe : 'x' pour un mur dont la normale est en x, 'z' pour une façade ; s : sens de la normale (vers l'extérieur).
  function feuilles(L, items, axe, s) {
    const par = new Map();
    for (const [x, y, z, t, a, c] of items) {
      let P = par.get(c);
      if (!P) par.set(c, P = []);
      const pt = (du, dv) => axe === 'x' ? [x, y + dv, z + du] : [x + du, y + dv, z];
      const ca = Math.cos(a) * t, sa = Math.sin(a) * t, p1 = pt(ca, sa), p2 = pt(-sa * 0.7, ca * 0.7), p3 = pt(-ca, -sa), p4 = pt(sa * 0.7, -ca * 0.7);
      if ((axe === 'x') === (s > 0)) P.push(...p1, ...p3, ...p2, ...p1, ...p4, ...p3); else P.push(...p1, ...p2, ...p3, ...p1, ...p3, ...p4);
    }
    for (const [c, P] of par) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.computeVertexNormals();
      L.push(teinter(g, c, T.feuillage));
    }
  }
  /* Devanture de boutique en applique : un caisson de bois peint plaqué sur le rez-de-chaussée (soubassement, pilastres,
     bandeau de l'enseigne, corniche, lanternes), une vitrine à petits bois (vraie vitre, transparente : MAT_VITRE) et une
     porte vitrée. Derrière la vitre, sur 25 cm : étagères et marchandises en volume, devant l'intérieur de la boutique
     peint en code et éclairé (atlas, matière sans ombre : une boutique allumée). Il donne la profondeur sans creuser la
     maison. V reçoit les vitres. Repère de la maison : façade en z = d / 2, x le long de la façade. */
  const BOIS_E = '#6b4a30', LUEUR = '#ffe1a0', VERRE = '#3a5068';
  function devanture(L, V, Pm, o, w, d) {
    const C = o.vitrine, CF = assombrir(C, 0.7), z0 = d / 2, vw = w * 0.56, vx = -w * 0.14, xp = w * 0.33;
    const X0 = Math.max(-w / 2 + 0.3, vx - vw / 2 - 0.3), X1 = Math.min(w / 2 - 0.3, xp + 0.85), cx = (X0 + X1) / 2, lw = X1 - X0;
    const xm = xp - 0.72, g0 = X0 + 0.13, g1 = xm - 0.13, gx = (g0 + g1) / 2, gw = g1 - g0;
    // soubassement, pilastres et leurs bases, bandeau, moulure, corniche
    L.push(B(gw + 0.26, 0.62, 0.3, C, gx, 0.31, z0 + 0.15), B(gw + 0.3, 0.06, 0.34, CF, gx, 0.64, z0 + 0.17));
    for (const x of [X0, xm, X1]) L.push(B(0.26, 2.74, 0.34, C, x, 1.37, z0 + 0.17), B(0.32, 0.26, 0.38, CF, x, 0.13, z0 + 0.19));
    L.push(B(lw + 0.26, 0.62, 0.36, C, cx, 3.05, z0 + 0.18), B(lw + 0.3, 0.07, 0.4, CF, cx, 2.72, z0 + 0.2), B(lw + 0.42, 0.11, 0.48, CF, cx, 3.41, z0 + 0.24));
    // vitrine : petits bois, traverse d'imposte, la vitre
    const nb = Math.max(2, Math.round(gw / 0.95)), pb = gw / nb;
    for (let i = 1; i < nb; i++) L.push(B(0.05, 2.06, 0.06, C, g0 + i * pb, 1.67, z0 + 0.25));
    L.push(B(gw, 0.05, 0.06, C, gx, 2.28, z0 + 0.25));
    V.push(B(gw, 2.06, 0.01, VERRE, gx, 1.67, z0 + 0.24));
    // dans la vitrine : planche du fond et, sauf au restaurant, deux étagères ; les marchandises
    L.push(B(gw, 0.04, 0.22, BOIS_E, gx, 0.66, z0 + 0.11));
    const table = o.boutique === 'resto';
    if (!table) for (const y of [1.3, 1.85]) L.push(B(gw, 0.03, 0.12, BOIS_E, gx, y, z0 + 0.07));
    marchandises(Pm, o.boutique, g0, g1, z0);
    // porte vitrée : panneau bas, montants, traverse, vitre, poignée de laiton
    const pw = X1 - xm - 0.26, px = (X1 + xm) / 2;
    L.push(B(pw, 0.85, 0.06, C, px, 0.43, z0 + 0.22), B(pw, 0.07, 0.07, C, px, 2.3, z0 + 0.22));
    for (const s of [-1, 1]) L.push(B(0.06, 1.45, 0.07, C, px + s * (pw / 2 - 0.03), 1.58, z0 + 0.22));
    L.push(B(0.04, 0.22, 0.05, '#c9a55a', px - pw / 2 + 0.14, 1.12, z0 + 0.27));
    V.push(B(pw, 1.85, 0.01, VERRE, px, 1.78, z0 + 0.21));
    o.entree = facade(o, px, 0.35); // devant le seuil (les clients y rentrent : clients.js)
    // lanternes de part et d'autre du bandeau
    for (const x of [X0, X1]) L.push(B(0.05, 0.05, 0.28, '#2b2b30', x, 3.72, z0 + 0.3), B(0.18, 0.26, 0.18, '#2b2b30', x, 3.6, z0 + 0.46), B(0.13, 0.18, 0.13, LUEUR, x, 3.58, z0 + 0.46));
    // l'intérieur peint, éclairé : derrière la vitrine et derrière la porte
    const fond = (lx, l3, h3, y, porte) => { const p = facade(o, lx, 0.012), W = porte ? 80 : 320; atlas.poser(W, Math.round(W * h3 / l3), (c, w2, h2) => peindreInterieur(c, w2, h2, o.boutique, porte), l3, h3, p.x, y, p.z, p.rot, true); };
    fond(gx, gw, 2.06, 1.67, false);
    fond(px, pw, 2.3, 1.15, true);
  }
  // Marchandises en volume dans la vitrine (petites : pas d'ombre portée, voir petit())
  function marchandises(L, genre, g0, g1, z0) {
    const r = hasard(Math.round(g0 * 997) + 13), z = z0 + 0.08, coul = a => a[Math.floor(r() * a.length)];
    if (genre === 'cave') {
      for (const y of [1.33]) for (let x = g0 + 0.1; x < g1 - 0.06; x += 0.2) L.push(C(0.032, 0.032, 0.27, 5, coul(['#1f3b2a', '#3a1820', '#26301f']), x, y + 0.14, z), B(0.05, 0.07, 0.01, '#efe4c8', x, y + 0.1, z + 0.033));
      for (let x = g0 + 0.35; x < g1 - 0.3; x += 0.75) L.push(B(0.5, 0.26, 0.18, '#9a7b55', x, 0.81, z0 + 0.1), C(0.03, 0.03, 0.12, 5, '#1f3b2a', x - 0.12, 1.0, z0 + 0.1), C(0.03, 0.03, 0.12, 5, '#3a1820', x + 0.12, 1.0, z0 + 0.1));
    } else if (genre === 'boulangerie') {
      for (let x = g0 + 0.2; x < g1 - 0.15; x += 0.3) L.push(S(0.06, '#d39443', x, 1.36, z, 1.6, 0.6, 0.9));
      for (let x = g0 + 0.3; x < g1 - 0.3; x += 0.62) {
        L.push(B(0.32, 0.2, 0.18, '#8a6a3a', x, 0.78, z0 + 0.1));
        for (const dx of [-0.08, 0, 0.08]) L.push(C(0.026, 0.026, 0.55, 5, '#d9a55a', x + dx, 1.05, z0 + 0.1));
        L.push(S(0.11, '#b9773a', x + 0.31, 0.74, z0 + 0.11, 1.15, 0.55, 0.85));
      }
    } else if (genre === 'epicerie') {
      for (const y of [1.33]) for (let x = g0 + 0.1; x < g1 - 0.06; x += 0.16) { const h = 0.1 + r() * 0.08; L.push(C(0.045, 0.045, h, 6, coul(['#d8c48a', '#c4552e', '#e8dcc0', '#7a9a4a', '#c9a55a']), x, y + h / 2 + 0.015, z), C(0.047, 0.047, 0.02, 6, coul(['#c0392b', '#2f5d3a', '#d9a832']), x, y + h + 0.025, z)); }
      for (let x = g0 + 0.3; x < g1 - 0.3; x += 0.7) { L.push(B(0.45, 0.16, 0.18, '#9a7b55', x, 0.76, z0 + 0.1)); for (let k = 0; k < 4; k++) L.push(S(0.05, coul(['#c42d3a', '#e0802f', '#9ab84a', '#e2c23a']), x - 0.15 + k * 0.1, 0.87, z0 + 0.1)); }
    } else if (genre === 'bar') {
      for (const y of [1.33]) for (let x = g0 + 0.1; x < g1 - 0.06; x += 0.18) { const h = 0.2 + r() * 0.1; L.push(C(0.03, 0.034, h, 5, coul(['#a8662a', '#2f5d3a', '#cfe0ea', '#6e1f2e', '#d9a832']), x, y + h / 2 + 0.015, z)); }
      L.push(C(0.15, 0.12, 0.3, 8, '#b5532e', g0 + 0.3, 0.83, z0 + 0.11), S(0.22, '#4f7a32', g0 + 0.3, 1.15, z0 + 0.11, 1, 1.2, 0.55));
    } else { // restaurant, auberge : une plante, l'ardoise du menu, des bougies
      L.push(C(0.15, 0.12, 0.3, 8, '#b5532e', g0 + 0.3, 0.83, z0 + 0.11), S(0.24, '#4f7a32', g0 + 0.3, 1.2, z0 + 0.11, 1, 1.3, 0.55));
      L.push(B(0.42, 0.58, 0.03, '#2b2b30', g1 - 0.4, 1.0, z0 + 0.12, 0), B(0.46, 0.04, 0.05, '#6b4a30', g1 - 0.4, 1.3, z0 + 0.12));
      for (let x = g0 + 0.9; x < g1 - 0.8; x += 0.8) L.push(C(0.025, 0.025, 0.1, 5, '#f1e8d2', x, 0.73, z0 + 0.1), B(0.02, 0.03, 0.02, LUEUR, x, 0.8, z0 + 0.1));
    }
  }
  // L'intérieur d'une boutique, peint : mur chaud éclairé par des suspensions, puis selon la boutique des rayonnages de
  // bouteilles, de pains ou de bocaux, un comptoir, ou une salle de restaurant (tables nappées, chaises, cadres)
  function peindreInterieur(c, W, H, genre, porte) {
    const k = W / 512; c.scale(k, k); W /= k; H /= k; // dessinée pour 512 px de large, mise à l'échelle
    const r = hasard(W * 31 + H + (genre || '').length * 7), sol = H * 0.82;
    let g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f7dfb2'); g.addColorStop(0.55, '#e3b47a'); g.addColorStop(0.82, '#b07a46'); g.addColorStop(1, '#6e4a2c');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#7a5434'; c.fillRect(0, sol, W, H - sol); // parquet
    for (let x = 0; x < W; x += 18) { c.fillStyle = x % 36 ? '#6a4a2e' : '#83603e'; c.fillRect(x, sol, 9, H - sol); }
    const lampes = porte ? [W / 2] : [W * 0.2, W * 0.5, W * 0.8];
    for (const x of lampes) {
      const rg = c.createRadialGradient(x, H * 0.16, 2, x, H * 0.16, H * 0.55);
      rg.addColorStop(0, 'rgba(255,244,214,0.95)'); rg.addColorStop(1, 'rgba(255,244,214,0)');
      c.fillStyle = rg; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#2b2018'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H * 0.1); c.stroke();
      c.fillStyle = '#3b2a20'; c.beginPath(); c.moveTo(x - 16, H * 0.17); c.lineTo(x + 16, H * 0.17); c.lineTo(x + 7, H * 0.1); c.lineTo(x - 7, H * 0.1); c.fill();
    }
    const etageres = (couleurs, hMin, hMax, larg) => {
      for (const y of [H * 0.34, H * 0.55, H * 0.74]) {
        c.fillStyle = '#5a3c26'; c.fillRect(W * 0.04, y, W * 0.92, 5);
        for (let x = W * 0.05; x < W * 0.94; x += larg + 2 + r() * 3) { const h = hMin + r() * (hMax - hMin); c.fillStyle = couleurs[Math.floor(r() * couleurs.length)]; c.fillRect(x, y - h, larg, h); }
      }
    };
    if (genre === 'cave') {
      etageres(['#1f3b2a', '#3a1820', '#26301f', '#4a1f28'], 18, 24, 7);
      c.fillStyle = '#6e4a2c'; for (const x of [W * 0.15, W * 0.78]) { c.beginPath(); c.ellipse(x, sol - 18, 22, 18, 0, 0, 7); c.fill(); c.strokeStyle = '#3b2a20'; c.lineWidth = 2; c.stroke(); }
    } else if (genre === 'boulangerie') {
      // étagères de miches (rondes, entaillées) ; paniers de baguettes debout ; le comptoir et sa vitrine à gâteaux
      for (const y of [H * 0.34, H * 0.55]) {
        c.fillStyle = '#5a3c26'; c.fillRect(W * 0.04, y, W * 0.92, 5);
        for (let x = W * 0.07; x < W * 0.93; x += 19 + r() * 4) {
          c.fillStyle = ['#c98a3e', '#b8742f', '#d9a050'][Math.floor(r() * 3)]; c.beginPath(); c.ellipse(x, y - 6, 9, 7, 0, Math.PI, 0); c.fill();
          c.strokeStyle = '#8a5428'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 4, y - 9); c.lineTo(x + 2, y - 5); c.stroke();
        }
      }
      for (let x = W * 0.1; x < W * 0.9; x += W * 0.2) {
        for (let k = -2; k <= 2; k++) { c.save(); c.translate(x + k * 4, H * 0.74); c.rotate(k * 0.08); c.fillStyle = '#d9a55a'; c.fillRect(-2.5, -H * 0.2, 5, H * 0.2); c.restore(); }
        c.fillStyle = '#8a6a3a'; c.fillRect(x - 14, H * 0.66, 28, H * 0.09);
      }
      c.fillStyle = '#8a5a34'; c.fillRect(W * 0.05, sol - H * 0.12, W * 0.9, H * 0.12); c.fillStyle = 'rgba(220,235,240,0.55)'; c.fillRect(W * 0.05, sol - H * 0.2, W * 0.9, H * 0.08);
      for (let x = W * 0.1; x < W * 0.9; x += 26) { c.fillStyle = ['#e8c8a0', '#8e2a3b', '#f1e8d2', '#c98a4a'][Math.floor(r() * 4)]; c.beginPath(); c.arc(x, sol - H * 0.135, 6, 0, 7); c.fill(); }
    } else if (genre === 'epicerie') {
      etageres(['#c4552e', '#e8dcc0', '#7a9a4a', '#c9a55a', '#2e6a9a', '#d9a832'], 10, 18, 9);
      c.fillStyle = '#8a5a34'; c.fillRect(W * 0.6, sol - H * 0.15, W * 0.35, H * 0.15);
    } else if (genre === 'bar') {
      etageres(['#a8662a', '#2f5d3a', '#cfe0ea', '#6e1f2e', '#d9a832'], 14, 22, 6);
      c.fillStyle = '#5a3c26'; c.fillRect(0, sol - H * 0.2, W, H * 0.2); c.fillStyle = '#c9a55a'; c.fillRect(0, sol - H * 0.21, W, 4);
      for (let x = W * 0.12; x < W; x += W * 0.18) { c.fillStyle = '#2b2018'; c.fillRect(x - 2, sol - H * 0.12, 4, H * 0.12); c.beginPath(); c.ellipse(x, sol - H * 0.12, 12, 4, 0, 0, 7); c.fill(); }
    } else { // salle de restaurant : cadres, tables nappées, chaises, bougies
      for (let x = W * 0.12; x < W * 0.9; x += W * 0.26) { c.fillStyle = '#6b4a30'; c.fillRect(x, H * 0.3, 38, 28); c.fillStyle = ['#7a8f6a', '#c98a4a', '#8e5a6a'][Math.floor(r() * 3)]; c.fillRect(x + 4, H * 0.3 + 4, 30, 20); }
      for (let x = W * 0.16; x < W; x += W * 0.3) {
        c.fillStyle = '#5a3c26'; c.fillRect(x - 30, sol - H * 0.26, 6, H * 0.26); c.fillRect(x + 24, sol - H * 0.26, 6, H * 0.26); // dossiers
        c.fillStyle = '#f4f1ea'; c.beginPath(); c.ellipse(x, sol - H * 0.15, 34, 9, 0, 0, 7); c.fill(); c.fillRect(x - 34, sol - H * 0.15, 68, H * 0.12);
        c.fillStyle = '#ffe1a0'; c.beginPath(); c.arc(x, sol - H * 0.19, 3, 0, 7); c.fill();
      }
    }
    // les bords plus sombres : de la profondeur
    g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(40,24,12,0.45)'); g.addColorStop(0.12, 'rgba(40,24,12,0)'); g.addColorStop(0.88, 'rgba(40,24,12,0)'); g.addColorStop(1, 'rgba(40,24,12,0.45)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  // o : x, z, w (façade), d (profondeur), h, rot (0 : façade vers +z), options (mur : couleur imposée)
  function maison(o) {
    const L = [], { w, d, h } = o, ht = o.ht ?? Math.min(w, d) * 0.55, surZ = d > w;
    const hm = k => hache(o.x * 0.37 + k * 1.7, o.z * 0.71 - k * 2.3);
    const genre = o.mur ? 'taille' : hm(1) < 0.42 ? 'taille' : hm(1) < 0.72 ? 'enduit' : 'moellon';
    const mur = o.mur || (genre === 'taille' ? TUF : genre === 'enduit' ? ENDUITS[Math.floor(hm(2) * 4)] : MOELLONS[Math.floor(hm(2) * 3)]);
    const pierre = genre !== 'taille', ardoise = o.toit || [ARD, ARD2, '#62666f'][Math.floor(hm(8) * 3)];
    L.push(B(w, h, d, mur, 0, h / 2, 0));
    L.push(B(w + 0.14, 0.6, d + 0.14, o.socle || '#b9a98b', 0, 0.3, 0));
    L.push(...toit(w, d, ht, ardoise, 0, h, 0, surZ, { mur }));
    // corniche sous l'égout, le long des deux pans
    if (surZ) for (const s of [1, -1]) L.push(B(0.18, 0.26, d + 0.12, APPUI, s * (w / 2 + 0.07), h - 0.2, 0));
    else for (const s of [1, -1]) L.push(B(w + 0.12, 0.26, 0.18, APPUI, 0, h - 0.2, s * (d / 2 + 0.07)));
    // chaînes d'angle : blocs de tuffeau alternés, un peu en saillie
    if (pierre) for (const sx of [1, -1]) for (const sz of [1, -1]) for (let i = 0, y = 0.85; y < h - 0.4; i++, y += 0.5) {
      const lx = i % 2 ? 0.32 : 0.56, lz = i % 2 ? 0.56 : 0.32;
      plaque(sx * (w / 2 - lx / 2), y, sz * (d / 2 + 0.006), 'z', sz, lx, 0.46);
      plaque(sx * (w / 2 + 0.006), y, sz * (d / 2 - lz / 2), 'x', sx, lz, 0.46);
    }
    // souche de cheminée, son chapeau, ses pots
    const E = (surZ ? w : d) / 2, kp = ht / (E + 0.4), faite = h + kp * E + 0.2;
    if (o.cheminee !== false) {
      const cx = surZ ? 0 : w * 0.3, cz = surZ ? d * 0.22 : 0, haut = faite + 0.95;
      L.push(B(0.78, 2.4, 0.62, APPUI, cx, haut - 1.2, cz), B(0.92, 0.1, 0.76, PIERRE, cx, haut + 0.05, cz));
      for (const dx of [-0.17, 0.17]) L.push(B(0.16, 0.3, 0.16, '#9a5a3e', cx + dx, haut + 0.25, cz));
    }
    const etages = o.etages ?? Math.max(1, Math.floor((h - 0.3) / 2.8)), nf = o.nf ?? Math.max(1, Math.floor(w / 3.1));
    const porte = o.porte ?? Math.floor(nf / 2), colX = i => -w / 2 + (i + 0.5) * w / nf;
    for (let e = 0; e < etages; e++) for (let i = 0; i < nf; i++) {
      const x = colX(i), y = 1.75 + e * 2.8;
      fenetre(L, x, y, -d / 2, -1, o.volets, pierre);
      if (e === 0 && o.vitrine) continue;
      if (e === 0 && i === porte) {
        if (pierre) plaque(x, 1.24, d / 2 + 0.006, 'z', 1, 1.45, 2.48);
        L.push(B(1.15, 2.25, 0.12, o.porteC || '#5b3a2a', x, 1.12, d / 2 + 0.04), B(1.5, 0.14, 0.42, '#cbbf9f', x, 0.07, d / 2 + 0.21));
        continue;
      }
      fenetre(L, x, y, d / 2, 1, o.volets, pierre);
      if (e >= 1 && o.fleurs !== false && rnd() < 0.45) {
        L.push(B(0.96, 0.17, 0.24, '#6b4a30', x, y - 0.74, d / 2 + 0.15), B(0.9, 0.07, 0.2, '#4f7a32', x, y - 0.63, d / 2 + 0.15));
        const fl = pick(['#d23a4a', '#e86a8a', '#c42d3a', '#f4f1ea', '#e0457a']);
        for (let k = 0; k < 5; k++) L.push(B(0.12, 0.11, 0.12, k % 2 ? fl : '#5d8a36', x - 0.36 + k * 0.18, y - 0.55 + (k % 2) * 0.03, d / 2 + 0.16));
      }
    }
    // lucarnes de tuffeau sur le pan de la façade, à l'aplomb des fenêtres
    if (!surZ && h >= 6 && o.lucarnes !== false && hm(3) < 0.6) {
      const zf = d / 2 - 0.15, y0 = h + kp * (d / 2 - zf) + 0.1, hb = 1.5 + 1.7 * kp;
      for (const i of nf >= 3 && w >= 11 ? [0, nf - 1] : [Math.floor(nf / 2)]) {
        const x = colX(i);
        L.push(B(1.3, hb, 1.6, PIERRE, x, y0 + 1.5 - hb / 2, zf - 0.8));
        L.push(...toit(1.3, 1.6, 0.62, ardoise, x, y0 + 1.5, zf - 0.8, true, { mur: PIERRE, egout: 0.12, rive: 0.14, ep: 0.12 }));
        L.push(B(0.72, 0.92, 0.07, '#efe7d6', x, y0 + 0.78, zf + 0.02), B(0.54, 0.74, 0.09, '#2f3c4f', x, y0 + 0.78, zf + 0.03));
      }
    }
    // une treille au-dessus du rez-de-chaussée (les grappes pendent), ou de la vigne vierge rougie qui grimpe au pignon
    if (!o.vitrine && o.plantes !== false) {
      const zv = d / 2 + 0.05, items = [];
      if (hm(4) < 0.3) {
        const xt = colX(porte) + 0.85;
        L.push(C(0.05, 0.08, 2.75, 5, '#5e4a36', xt, 1.37, zv + 0.03), B(w - 0.9, 0.05, 0.05, '#5e4a36', 0, 2.78, zv + 0.06));
        for (let x = -w / 2 + 0.55, i = 0; x < w / 2 - 0.45; x += 0.23, i++) for (let r = 0; r < 3; r++) {
          const j = hache(x * 4.1 + o.z, r + o.x);
          items.push([x + (j - 0.5) * 0.12, 2.62 + r * 0.17 + (j - 0.5) * 0.12, zv + 0.03 + j * 0.06, 0.15 + 0.06 * j, j * 6.3, FEUILLES_VIGNE[Math.floor(j * 4)]]);
          if (r === 0 && i % 4 === 1) L.push(teinter(S(0.075, '#3b2340', x, 2.47, zv + 0.09, 1, 1.8, 1), '#3b2340'));
        }
        feuilles(L, items, 'z', 1);
      } else if (hm(5) < 0.32) {
        // vigne vierge : une nappe de feuilles sur le pignon (sans fenêtre), qui part du pied, s'élargit et déborde sur
        // l'angle de la façade
        const sx = hm(6) < 0.5 ? 1 : -1, top = h * (0.55 + 0.35 * hm(7)), coin = [];
        for (let y = 0.25, r = 0; y < top; y += 0.2, r++) {
          const t = y / top, large = 0.35 + 2.4 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.75 + 0.25 * hache(r, o.x));
          for (let zz = d / 2 - 0.08; zz > d / 2 - large; zz -= 0.21) {
            const j = hache(zz * 3.1 + o.x, y * 5.3 + o.z);
            items.push([sx * (w / 2 + 0.03 + j * 0.06), y + (j - 0.5) * 0.12, zz + (j - 0.5) * 0.12, 0.15 + 0.08 * j, j * 6.3, VIGNE_VIERGE[Math.floor(j * 5)]]);
          }
          if (t > 0.15 && t < 0.9) for (let k = 0; k < 3; k++) {
            const j = hache(r * 1.3 + k, o.z + k);
            if (j < 0.75) coin.push([sx * (w / 2 - 0.1 - k * 0.2 - j * 0.1), y + (j - 0.5) * 0.1, d / 2 + 0.03 + j * 0.05, 0.14 + 0.07 * j, j * 6.3, VIGNE_VIERGE[Math.floor(j * 5)]]);
          }
        }
        feuilles(L, items, 'x', sx); feuilles(L, coin, 'z', 1);
      }
    }
    const V = [], Pm = [];
    if (o.vitrine) {
      devanture(L, V, Pm, o, w, d);
      if (o.banne) for (let k = 0; k < 6; k++) { // le store, sous le bandeau
        const vw = w * 0.56, vx = -w * 0.14, g = new THREE.BoxGeometry(vw / 6, 0.08, 1.4); g.rotateX(0.32);
        g.translate(vx - vw / 2 + (k + 0.5) * vw / 6, 2.56, d / 2 + 0.98);
        L.push(teinter(g, k % 2 ? '#f3ead8' : o.banne));
      }
    }
    if (o.drapeau) {
      L.push(C(0.04, 0.04, 2.6, 5, '#ddd', 0, h - 0.5, d / 2 + 0.9, 'y'));
      L.push(B(0.05, 0.6, 0.3, '#2b4ea2', 0, h + 0.4, d / 2 + 1.0), B(0.05, 0.6, 0.3, '#f4f1ea', 0, h + 0.4, d / 2 + 1.3), B(0.05, 0.6, 0.3, '#d23a3a', 0, h + 0.4, d / 2 + 1.6));
    }
    // une tourelle d'escalier ronde à l'angle de la façade, son toit en poivrière (le village du château)
    if (o.tourelle) {
      const sx = hm(9) < 0.5 ? 1 : -1, tx = sx * (w / 2 - 0.15), tz = d / 2 - 0.15, ht2 = h + 1.6;
      L.push(C(1.3, 1.3, ht2, 12, mur, tx, ht2 / 2, tz), C(1.36, 1.36, 0.22, 12, APPUI, tx, ht2 - 0.1, tz), C(0, 1.6, 3.4, 12, ardoise, tx, ht2 + 1.7, tz));
      L.push(C(0.04, 0.04, 0.9, 5, '#7a7f88', tx, ht2 + 3.7, tz));
      for (const y of [2.6, 5.2]) if (y < ht2 - 0.8) L.push(B(0.42, 0.8, 0.12, '#2f3c4f', tx + sx * 0.65, y, tz + 1.12, sx * 0.5));
    }
    // colombages : pans de bois de l'étage (sablières, poteaux aux tableaux des fenêtres, croix de Saint-André entre elles)
    if (o.colombages) {
      const z = d / 2 + 0.03, y0 = 2.95, y1 = h - 0.32, BOIS = '#6b4a30';
      L.push(B(w + 0.06, 0.22, 0.08, BOIS, 0, y0, z), B(w + 0.06, 0.2, 0.08, BOIS, 0, y1, z));
      const xs = [-w / 2 + 0.12, w / 2 - 0.12];
      for (let i = 0; i < nf; i++) xs.push(colX(i) - 0.62, colX(i) + 0.62);
      xs.sort((a, b) => a - b);
      for (const x of xs) L.push(B(0.16, y1 - y0, 0.08, BOIS, x, (y0 + y1) / 2, z));
      for (let k = 0; k + 1 < xs.length; k++) {
        const a = xs[k], b = xs[k + 1], lw = b - a;
        if (lw < 0.9 || lw > 3) continue;
        const ym = (y0 + y1) / 2, hh = y1 - y0, l = Math.hypot(lw, hh), ang = Math.atan2(hh, lw);
        for (const s of [1, -1]) { const g = new THREE.BoxGeometry(l, 0.13, 0.07); g.rotateZ(s * ang); g.translate((a + b) / 2, ym, z + 0.005); L.push(teinter(g, BOIS)); }
      }
    }
    finirPlaques(L);
    poser(L, o.x, o.z, o.rot || 0, bati, o.y);
    if (V.length) poser(V, o.x, o.z, o.rot || 0, vitresB, o.y);
    if (Pm.length) poser(Pm, o.x, o.z, o.rot || 0, proches, o.y);
    if (o.sansCol) {
      // (le village du château : les maisons tournées vers lui, hors de ce qu'on peut atteindre) sur la mini-carte
      const r0 = o.rot || 0, co = Math.cos(r0), si = Math.sin(r0);
      plan.push({ t: 'p', pts: [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z]) => [o.x + x * co + z * si, o.z + z * co - x * si]) });
      return o;
    }
    // collision : la maison, et sa devanture (36 cm devant la façade)
    const tourne = Math.abs(Math.sin(o.rot || 0)) > 0.5, av = o.vitrine ? 0.36 : 0, r0 = o.rot || 0;
    const bx = col.boiteC(o.x + Math.sin(r0) * av / 2, o.z + Math.cos(r0) * av / 2, tourne ? d + av : w, tourne ? w : d + av);
    bx.haut = true;
    plan.push({ t: 'b', x0: bx.x0, z0: bx.z0, x1: bx.x1, z1: bx.z1 });
    contact.jupe(bx.x0 - 0.07, bx.z0 - 0.07, bx.x1 + 0.07, bx.z1 + 0.07, 1.7, 0.5);
    return o;
  }
  /* Le chai (façade vers l'ouest) et, au bout sud, le bureau du chai : une vraie pièce où l'on entre par une porte de la
     façade. Même extérieur qu'une maison (mêmes fenêtres, mêmes tirages au sort), mais le volume est fait de plusieurs
     blocs qui laissent la pièce vide, la façade percée à la porte et le soubassement réduit à un rebord (sinon, vus de
     l'intérieur, leurs faces cacheraient le sol). L'intérieur est un maillage à part, éclairé sans ombre portée (sinon
     le toit le plongerait dans le noir). Repère local : lx le long de la façade (monde z = -52 + lx), lz vers la façade
     (monde x = -70 - lz). Pièce : x de -75,7 à -71,2, z de -64,7 à -59,6, plafond à 2,8 m ; porte en z = -60,6. */
  function chaiEtBureau() {
    const o = { x: -70, z: -52, w: 26, d: 12, h: 6.2, rot: -Math.PI / 2 }, { w, d, h } = o, L = [];
    const H = 2.8, PL = -9.1, PR = -8.1, PH = 2.15; // plafond de la pièce, porte (lx de PL à PR, hauteur PH)
    // la halle du chai : quatre murs (40 cm), la façade ouverte à la grande porte (lx de -1,8 à 1,8, 4,2 m de haut)
    L.push(B(20.6, h, 0.4, TUF, 2.7, h / 2, -5.8), B(0.4, h, 11.2, TUF, 12.8, h / 2, 0), B(0.4, h, 11.2, TUF, -7.4, h / 2, 0));
    L.push(B(5.8, h, 0.4, TUF, -4.7, h / 2, 5.8), B(11.2, h, 0.4, TUF, 7.4, h / 2, 5.8), B(3.6, h - 4.2, 0.4, TUF, 0, 4.2 + (h - 4.2) / 2, 5.8));
    L.push(B(0.36, 4.3, 0.16, '#d8cbb0', -1.98, 2.15, 6.06), B(0.36, 4.3, 0.16, '#d8cbb0', 1.98, 2.15, 6.06), B(4.32, 0.36, 0.16, '#d8cbb0', 0, 4.38, 6.06)); // encadrement de pierre
    L.push(B(5.4, h, 7.2, TUF, -10.3, h / 2, -2.4));            // derrière la pièce
    L.push(B(5.4, h - H, 4.8, TUF, -10.3, H + (h - H) / 2, 3.6)); // au-dessus d'elle
    L.push(B(0.3, H, 4.8, TUF, -12.85, H / 2, 3.6));            // pignon sud
    L.push(B(PL + 12.7, H, 0.3, TUF, (PL - 12.7) / 2, H / 2, 5.85), B(-7.6 - PR, H, 0.3, TUF, (PR - 7.6) / 2, H / 2, 5.85));
    L.push(B(PR - PL, H - PH, 0.3, TUF, (PL + PR) / 2, (PH + H) / 2, 5.85)); // linteau
    // soubassement : un rebord tout autour, ouvert à la porte
    const SO = '#b9a98b';
    L.push(B(PL + 13.07, 0.6, 0.22, SO, (PL - 13.07) / 2, 0.3, 5.96), B(-2.16 - PR, 0.6, 0.22, SO, (PR - 2.16) / 2, 0.3, 5.96), B(13.07 - 2.16, 0.6, 0.22, SO, (13.07 + 2.16) / 2, 0.3, 5.96));
    L.push(B(w + 0.14, 0.6, 0.22, SO, 0, 0.3, -5.96), B(0.22, 0.6, d + 0.14, SO, -12.96, 0.3, 0), B(0.22, 0.6, d + 0.14, SO, 12.96, 0.3, 0));
    L.push(...toit(w, d, Math.min(w, d) * 0.55, ARD2, 0, h, 0, false));
    for (let i = 0; i < 6; i++) {
      const x = -w / 2 + (i + 0.5) * w / 6;
      fenetre(L, x, 1.75, -d / 2, -1);
      if (i !== 2 && i !== 3) fenetre(L, x, 1.75, d / 2, 1); // pas devant la grande porte
    }
    // la fenêtre du bureau est éclairée ; la porte, son encadrement, son seuil, une applique
    L.push(B(0.74, 1.1, 0.1, '#4a3a2a', -10.83, 1.75, 6.04));
    L.push(B(0.08, 2.24, 0.34, '#6b4a30', PL - 0.02, 1.12, 5.88), B(0.08, 2.24, 0.34, '#6b4a30', PR + 0.02, 1.12, 5.88));
    L.push(B(PR - PL + 0.2, 0.1, 0.34, '#6b4a30', (PL + PR) / 2, PH + 0.08, 5.88), B(PR - PL + 0.3, 0.06, 0.5, '#cbbf9f', (PL + PR) / 2, 0.03, 6.1));
    L.push(B(0.16, 0.24, 0.12, '#2b2b30', PR + 0.4, 2.3, 6.05), B(0.1, 0.12, 0.08, '#ffe1a0', PR + 0.4, 2.27, 6.1));
    poser(L, o.x, o.z, o.rot, bati);
    enseigne('BUREAU', facade(o, (PL + PR) / 2, 0.06), 2.5, 1.1, 0.3, '#5b3a2a', '#f1e2c4');
    // collisions : le chai, le bloc derrière la pièce, les murs de la pièce ; la pièce elle-même compte comme bâtiment
    // pour la caméra du dehors, sans arrêter personne (fantome)
    for (const [x0, z0, x1, z1] of [[-76, -59.6, -75.6, -53.8], [-76, -50.2, -75.6, -39], [-64.4, -59.6, -64, -39], [-76, -39.4, -64, -39], [-76, -59.6, -64, -59.2], [-71.2, -65, -64, -59.6], [-76, -65, -75.7, -61.1], [-76, -60.1, -75.7, -59.6], [-76, -65, -71.2, -64.7]]) col.boite(x0, z0, x1, z1).haut = true;
    const ph = col.boite(-75.7, -64.7, -71.2, -59.6); ph.haut = true; ph.fantome = true;
    plan.push({ t: 'b', x0: -76, z0: -65, x1: -64, z1: -39 });
    contact.jupe(-76.07, -65.07, -63.93, -38.93, 1.7, 0.5);
    /* -- le chai lui-même (coordonnées monde) : une halle de x -75,6 à -64,4 et de z -59,2 à -39,4, où l'on entre en véhicule
       par la grande porte (z de -53,8 à -50,2). Sol de béton et sa rigole, fermes de la charpente, suspensions ; cuves
       inox le long du mur du fond, barriques sur leurs chantiers, pressoir pneumatique, égrappoir, pompe et tuyaux,
       établi, palettes. La palette des commandes du jour (lieux.palette) à droite de l'endroit où le véhicule s'arrête. */
    const H2 = [], INOX = '#a3aab2', JOINT = '#757c85', CHENE = '#8a5a34', FER = '#2f3034', BETON = '#8f8a80';
    // un plafond de planches sous la toiture (le comble n'est pas dans la zone éclairée de dedans)
    H2.push(B(11.2, 0.04, 19.8, '#6e5a44', -70, 6.1, -49.3));
    H2.push(B(11.2, 0.06, 19.8, BETON, -70, 0.03, -49.3), B(0.18, 0.065, 15, '#5f5b55', -66.8, 0.035, -50));
    // murs enduits à la chaux, côté intérieur (l'enduit se salit et tombe en pied de mur : modeles.js)
    for (const [x, z, lx, lz] of [[-75.58, -56.5, 0.02, 5.4], [-75.58, -44.8, 0.02, 10.8], [-64.42, -49.3, 0.02, 19.8], [-70, -59.18, 11.2, 0.02], [-70, -39.42, 11.2, 0.02]]) H2.push(B(lx, 6.15, lz, '#e6d4b0', x, 3.075, z));
    H2.push(B(0.02, 1.95, 3.6, '#e6d4b0', -75.58, 5.175, -52));
    for (const z of [-57, -52.5, -48, -43.5]) H2.push(B(11.2, 0.28, 0.24, '#6b4a30', -70, 5.85, z)); // entraits de la charpente
    for (const z of [-56.5, -51.5, -46.5, -41.5]) H2.push(C(0.01, 0.01, 0.8, 4, FER, -70, 5.45, z), C(0.06, 0.32, 0.24, 10, FER, -70, 4.98, z), C(0.14, 0.14, 0.04, 8, '#ffe1a0', -70, 4.86, z));
    // cuves inox : fût, chapeau conique, pieds, porte basse, vanne, échelle sur l'une
    const cuves = [-57.6, -54.3, -51, -47.7, -44.4];
    cuves.forEach((z, i) => {
      H2.push(C(0.9, 0.9, 3.0, 14, INOX, -65.6, 2.0, z), C(0.12, 0.9, 0.45, 14, INOX, -65.6, 3.72, z), C(0.9, 0.55, 0.3, 14, INOX, -65.6, 0.35, z));
      for (const y of [1.15, 2.55, 3.48]) H2.push(C(0.915, 0.915, 0.04, 14, JOINT, -65.6, y, z)); // cordons de soudure
      for (const [dx, dz] of [[0.55, 0.55], [-0.55, 0.55], [0.55, -0.55], [-0.55, -0.55]]) H2.push(B(0.07, 0.5, 0.07, INOX, -65.6 + dx, 0.25, z + dz));
      H2.push(B(0.06, 0.5, 0.42, '#8e959c', -66.48, 1.0, z), C(0.05, 0.05, 0.22, 6, '#8e959c', -66.6, 0.62, z, 'x'), C(0.07, 0.07, 0.03, 8, '#c0392b', -66.72, 0.62, z, 'x'));
      H2.push(B(0.32, 0.16, 0.012, '#f1e8d2', -66.5, 2.4, z, Math.PI / 2)); // plaque : numéro de la cuve
      if (i === 2) for (let y = 0.4; y < 3.6; y += 0.35) H2.push(B(0.04, 0.04, 0.45, FER, -66.62, y, z + 0.95));
    });
    // barriques sur leurs chantiers, deux rangs le long du pignon
    for (let k = 0; k < 2; k++) {
      H2.push(B(8.4, 0.12, 0.9, '#5a3f2b', -70.6, 0.06 + k * 0.72, -40.3));
      for (let i = 0; i < 9; i++) { const x = -74.4 + i * 0.95; H2.push(C(0.34, 0.34, 0.88, 10, k ? '#7a5230' : CHENE, x, 0.48 + k * 0.72, -40.3, 'z'), C(0.08, 0.08, 0.02, 6, '#3a2a1e', x, 0.48 + k * 0.72, -40.75, 'z')); }
    }
    // pressoir pneumatique : la cuve couchée sur son bâti, sa porte, la trémie, le tableau de commande
    const PX = -68.6, PZ = -42.7;
    H2.push(C(0.82, 0.82, 2.9, 14, INOX, PX, 1.55, PZ, 'x'), B(3.2, 0.12, 1.3, FER, PX, 0.55, PZ));
    for (const x of [PX - 1.1, PX + 1.1]) H2.push(C(0.835, 0.835, 0.05, 14, JOINT, x, 1.55, PZ, 'x'));
    for (const dx of [-1.3, 1.3]) for (const dz of [-0.5, 0.5]) H2.push(B(0.1, 0.55, 0.1, FER, PX + dx, 0.27, PZ + dz));
    H2.push(B(0.7, 0.5, 0.05, '#8e959c', PX, 2.1, PZ + 0.8), B(1.0, 0.5, 0.9, INOX, PX, 2.6, PZ), B(0.4, 0.6, 0.25, '#e8e4d8', PX + 1.9, 1.0, PZ + 1.0), B(0.3, 0.2, 0.02, '#2b2b30', PX + 1.9, 1.1, PZ + 1.13));
    // égrappoir-fouloir sur roues, pompe, tuyaux couchés
    H2.push(B(1.4, 0.6, 0.7, INOX, -73.6, 0.75, -41.9), B(1.5, 0.35, 0.9, INOX, -73.6, 1.2, -41.9));
    for (const dx of [-0.55, 0.55]) H2.push(C(0.16, 0.16, 0.08, 8, FER, -73.6 + dx, 0.16, -41.45, 'z'));
    H2.push(B(0.7, 0.45, 0.45, '#c0392b', -67.6, 0.4, -46.1), C(0.12, 0.12, 0.1, 8, FER, -67.6, 0.12, -45.85, 'z'));
    for (const [x0, z0, x1, z1] of [[-67.6, -46.4, -66.5, -47.6], [-67.9, -45.8, -68.8, -44.1], [-68.8, -44.1, -71.4, -43.9]]) {
      const l = Math.hypot(x1 - x0, z1 - z0); H2.push(C(0.06, 0.06, l, 6, '#2a2a2e', (x0 + x1) / 2, 0.07, (z0 + z1) / 2, 'z', Math.atan2(x1 - x0, z1 - z0)));
    }
    // établi et outils, seaux ; palettes de bouteilles vides filmées ; la palette des commandes du jour
    H2.push(B(0.7, 0.06, 2.2, '#9a7b55', -75.15, 0.9, -57.2), B(0.06, 0.9, 0.06, '#6b4a30', -74.9, 0.45, -58.2), B(0.06, 0.9, 0.06, '#6b4a30', -74.9, 0.45, -56.2), B(0.04, 1.0, 2.2, '#8d7c66', -75.5, 1.55, -57.2));
    for (let i = 0; i < 5; i++) H2.push(B(0.05, 0.25 + (i % 2) * 0.1, 0.05, ['#c0392b', '#2b2b30', '#c9a55a'][i % 3], -75.45, 1.6, -58 + i * 0.35));
    for (const z of [-56.4, -57.6]) H2.push(C(0.15, 0.13, 0.3, 8, ['#2e86de', '#e0b13a'][z < -57 ? 1 : 0], -73.9, 0.15, z));
    for (const [x, z] of [[-73.2, -58.2], [-71.8, -58.2]]) {
      H2.push(B(1.2, 0.14, 1.0, '#9a7b55', x, 0.07, z)); // palette de cartons vides, pliés en piles
      for (let k = 0; k < 3; k++) for (const dx of [-0.29, 0.29]) for (const dz of [-0.24, 0.24]) H2.push(B(0.56, 0.32, 0.46, (k + (dx > 0) + (dz > 0)) % 2 ? '#b98a55' : '#ad7f4c', x + dx, 0.31 + k * 0.33, z + dz));
    }
    H2.push(B(1.2, 0.14, 1.0, '#9a7b55', -71.4, 0.07, -48.1)); // la palette du jour (lieux.palette)
    // les fenêtres, vues de dedans (le jour derrière)
    for (const z of [-56.5, -45.5, -41.2]) H2.push(B(0.03, 1.1, 0.74, '#3d5f8e', -75.59, 1.75, z));
    for (const z of [-58.3, -54, -49.7, -45.3, -41]) H2.push(B(0.03, 1.1, 0.74, '#3d5f8e', -64.41, 1.75, z));
    const halle = new THREE.Mesh(fusion(H2), MAT);
    halle.receiveShadow = true; halle.castShadow = false; halle.name = 'chai'; // dedans, le soleil est coupé (definirInterieur) : l'ombre du toit ne compte qu'au-dessus des murs
    scene.add(halle);
    o.halle = halle; // dessiné seulement de près, porte ouverte, ou quand on est dedans (main.js)
    // ce qui arrête : cuves, chantiers, pressoir, égrappoir, pompe, établi, palettes
    for (const z of cuves) col.boiteC(-65.6, z, 1.9, 1.9).haut = true;
    for (const [x0, z0, x1, z1] of [[-75, -40.8, -66.1, -39.4], [-70.2, -43.4, -67.0, -42.0], [-74.4, -42.4, -72.8, -41.4], [-68, -46.4, -67.2, -45.8], [-75.6, -58.3, -74.8, -56.1], [-73.8, -58.7, -71.2, -57.7]]) col.boite(x0, z0, x1, z1);
    // la grande porte : deux vantaux de planches sur leurs gonds, qui s'ouvrent vers la cour (main.js les anime)
    const vantail = s => {
      const g = new THREE.Group(), L2 = [];
      L2.push(B(0.08, 4.1, 1.8, '#5b3a2a', 0, 2.05, s * 0.9));
      for (const y of [0.5, 2.05, 3.6]) L2.push(B(0.1, 0.16, 1.7, '#4a3324', -0.02, y, s * 0.9));
      L2.push(B(0.06, 0.06, 0.18, '#2b2b30', -0.06, 2.0, s * 1.6));
      const m = new THREE.Mesh(fusion(L2), MAT); m.castShadow = true; m.receiveShadow = true; g.add(m);
      g.position.set(-76.02, 0, s > 0 ? -53.8 : -50.2); scene.add(g);
      return g;
    };
    o.porteChai = { a: vantail(1), b: vantail(-1), k: 0, col: col.boite(-76.4, -53.8, -75.6, -50.2) }; // épaisse comme le mur : la caméra du dehors ne passe pas entre deux relevés
    o.porteChai.col.haut = true;
    definirInterieur([-75.8, -1, -59.4], [-64.2, 6.3, -39.2], [-56.5, -51.5, -46.5, -41.5].map(z => [-70, 5.0, z]));


    /* -- l'intérieur (coordonnées monde) */
    const I = [], PLATRE = '#efe4cc', LAMBRIS = '#8d7c66', BOIS = '#6b4a30', SOMBRE = '#5b3a2a';
    const xF = -75.66, xE = -71.24, zS = -64.66, zN = -59.64, cx = (xF + xE) / 2, cz = (zS + zN) / 2, lx = xE - xF, lz = zN - zS;
    I.push(B(lx, 0.04, lz, '#9a7b55', cx, 0.02, cz));                                  // parquet
    I.push(B(lx, 0.02, lz, PLATRE, cx, H - 0.01, cz));                                // plafond
    for (const z of [-63.9, -62.15, -60.4]) I.push(B(lx, 0.18, 0.16, SOMBRE, cx, H - 0.1, z)); // poutres
    // murs : plâtre au-dessus d'un lambris de bois ; la façade est percée à la porte et à la fenêtre
    const mur = (x, z, sx, sz, y0, y1, c) => I.push(B(sx, y1 - y0, sz, c, x, (y0 + y1) / 2, z));
    for (const [y0, y1, c] of [[0, 0.95, LAMBRIS], [0.95, H, PLATRE]]) {
      mur(xE, cz, 0.02, lz, y0, y1, c); mur(cx, zN, lx, 0.02, y0, y1, c); mur(cx, zS, lx, 0.02, y0, y1, c);
      // façade : du pignon à la fenêtre, de la fenêtre à la porte, de la porte au mur nord
      mur(xF, (zS - 63.33) / 2, 0.02, -63.33 - zS, y0, y1, c);
      mur(xF, (-62.33 - 61.1) / 2, 0.02, 1.23, y0, y1, c);
      mur(xF, (-60.1 + zN) / 2, 0.02, zN + 60.1, y0, y1, c);
      // sous la fenêtre et au-dessus, au-dessus de la porte
      if (y0 < 1.08) mur(xF, -62.83, 0.02, 1.0, y0, Math.min(y1, 1.08), c);
      if (y1 > 2.42) mur(xF, -62.83, 0.02, 1.0, Math.max(y0, 2.42), y1, c);
      if (y1 > PH) mur(xF, -60.6, 0.02, 1.0, Math.max(y0, PH), y1, c);
    }
    // plinthes et cimaise
    I.push(B(0.03, 0.05, lz, SOMBRE, xE - 0.02, 0.97, cz), B(lx, 0.05, 0.03, SOMBRE, cx, 0.97, zN - 0.02), B(lx, 0.05, 0.03, SOMBRE, cx, 0.97, zS + 0.02));
    // fenêtre : le jour dehors, son cadre, son appui
    I.push(B(0.02, 1.1, 0.78, '#dcecf3', xF - 0.03, 1.75, -62.83));
    I.push(B(0.06, 0.08, 1.0, '#efe7d6', xF + 0.02, 2.4, -62.83), B(0.06, 0.08, 1.0, '#efe7d6', xF + 0.02, 1.1, -62.83));
    I.push(B(0.06, 1.34, 0.08, '#efe7d6', xF + 0.02, 1.75, -63.29), B(0.06, 1.34, 0.08, '#efe7d6', xF + 0.02, 1.75, -62.37), B(0.06, 1.1, 0.04, '#efe7d6', xF + 0.02, 1.75, -62.83));
    I.push(B(0.2, 0.05, 1.1, '#efe7d6', xF + 0.09, 1.05, -62.83));
    // encadrement de la porte
    I.push(B(0.06, PH + 0.08, 0.08, BOIS, xF + 0.03, (PH + 0.08) / 2, -61.14), B(0.06, PH + 0.08, 0.08, BOIS, xF + 0.03, (PH + 0.08) / 2, -60.06), B(0.06, 0.08, 1.16, BOIS, xF + 0.03, PH + 0.04, -60.6));
    // le bureau en bois, contre le mur est : plateau, pieds, caisson ; le portable ouvert, une lampe, une tasse, des papiers
    const DX = -71.63, DZ = -62.6;
    I.push(B(0.76, 0.05, 1.6, BOIS, DX, 0.755, DZ));
    for (const [x, z] of [[-71.97, -63.36], [-71.3, -63.36], [-71.97, -61.84], [-71.3, -61.84]]) I.push(B(0.05, 0.73, 0.05, SOMBRE, x, 0.365, z));
    // caisson à tiroirs : deux façades et leurs poignées, côté chaise
    I.push(B(0.6, 0.52, 0.42, SOMBRE, -71.6, 0.46, -63.1));
    for (const y of [0.6, 0.36]) I.push(B(0.02, 0.2, 0.38, '#4a3324', -71.91, y, -63.1), B(0.02, 0.03, 0.12, '#c9a86a', -71.925, y + 0.04, -63.1));
    I.push(B(0.24, 0.018, 0.33, '#2b2d33', -71.86, 0.789, DZ)); // portable : socle (clavier côté chaise), écran levé
    {
      const ecran = B(0.014, 0.22, 0.33, '#2b2d33'), dalle = B(0.004, 0.19, 0.3, '#dfeef8');
      for (const g of [ecran, dalle]) g.rotateZ(-0.26);
      I.push(deplacer(ecran, -71.715, 0.9, DZ), deplacer(dalle, -71.725, 0.9, DZ));
    }
    I.push(C(0.07, 0.08, 0.03, 10, '#2b2b30', -71.45, 0.795, -61.95), C(0.012, 0.012, 0.38, 5, '#2b2b30', -71.45, 0.97, -61.95));
    I.push(C(0.05, 0.11, 0.12, 10, '#7d2333', -71.55, 1.14, -61.98), C(0.045, 0.045, 0.02, 8, '#ffe1a0', -71.55, 1.08, -61.98));
    I.push(C(0.04, 0.04, 0.09, 8, '#f4f1ea', -71.45, 0.825, -63.1), B(0.3, 0.006, 0.21, '#f7f5ef', -71.55, 0.783, -62.05, 0.25), B(0.3, 0.006, 0.21, '#f2eee2', -71.52, 0.788, -62.1, 0.4));
    // la chaise (on s'y assoit face au portable)
    I.push(B(0.46, 0.06, 0.46, '#3b3f48', -72.6, 0.47, DZ), B(0.05, 0.52, 0.42, '#3b3f48', -72.85, 0.8, DZ), C(0.025, 0.025, 0.4, 6, '#2a2b30', -72.6, 0.24, DZ));
    I.push(B(0.56, 0.03, 0.05, '#2a2b30', -72.6, 0.05, DZ), B(0.05, 0.03, 0.56, '#2a2b30', -72.6, 0.05, DZ));
    // étagère au mur sud : classeurs, bouteilles ; caisse de vin au pied
    const EX0 = -75.1, EX1 = -73.3, EZ = zS + 0.19;
    I.push(B(0.03, 2.0, 0.36, BOIS, EX0, 1.0, EZ), B(0.03, 2.0, 0.36, BOIS, EX1, 1.0, EZ));
    for (const y of [0.42, 0.86, 1.3, 1.74, 2.0]) I.push(B(EX1 - EX0, 0.03, 0.36, BOIS, (EX0 + EX1) / 2, y, EZ));
    const CLASSEURS = ['#8e2a3b', '#2e5a87', '#3a7a4a', '#e0b13a', '#5e596a'];
    for (const [y, n0] of [[0.875, 0], [1.315, 3]]) for (let i = 0; i < 14; i++) I.push(B(0.065, 0.32, 0.27, CLASSEURS[(i + n0) % 5], EX0 + 0.1 + i * 0.075, y + 0.16, EZ + 0.02));
    for (let i = 0; i < 6; i++) I.push(C(0.036, 0.036, 0.22, 8, '#1f3b2a', EX0 + 0.2 + i * 0.26, 1.865, EZ), C(0.014, 0.02, 0.09, 6, '#1f3b2a', EX0 + 0.2 + i * 0.26, 2.02, EZ));
    for (let i = 0; i < 5; i++) I.push(B(0.3, 0.2, 0.22, CLASSEURS[(i + 2) % 5], EX0 + 0.22 + i * 0.34, 0.535, EZ + 0.03));
    I.push(B(0.52, 0.3, 0.34, '#9a7b55', -73.95, 0.15, zS + 0.72));
    for (let i = 0; i < 6; i++) I.push(C(0.016, 0.016, 0.08, 6, '#1f3b2a', -74.13 + (i % 3) * 0.18, 0.33, zS + 0.64 + Math.floor(i / 3) * 0.16));
    // classeur métallique près de la fenêtre, plante dans le coin nord-est, portemanteau et veste
    I.push(B(0.46, 1.1, 0.5, '#8d949c', -75.38, 0.55, -63.92));
    for (const y of [0.3, 0.62, 0.94]) I.push(B(0.02, 0.012, 0.36, '#5f656d', -75.14, y, -63.92), B(0.02, 0.04, 0.12, '#c9ccd1', -75.14, y - 0.08, -63.92));
    I.push(C(0.17, 0.13, 0.32, 8, '#b5532e', -71.62, 0.16, -60.05));
    for (const [x, y, z, r] of [[-71.62, 0.62, -60.05, 0.22], [-71.5, 0.82, -60.12, 0.16], [-71.72, 0.78, -59.98, 0.15]]) I.push(S(r, '#4f7a32', x, y, z, 1, 1.2, 1, 1));
    I.push(C(0.022, 0.022, 1.75, 6, SOMBRE, -72.55, 0.875, -59.95), C(0.2, 0.2, 0.03, 8, SOMBRE, -72.55, 0.015, -59.95));
    I.push(B(0.36, 0.62, 0.14, '#2e4a3a', -72.55, 1.34, -59.86), B(0.1, 0.06, 0.1, SOMBRE, -72.45, 1.68, -59.95));
    // carte des parcelles au mur nord : un cadre, les parcelles en couleurs d'automne, la départementale
    {
      const MX = -73.75, MY = 1.7, MZ = zN - 0.02;
      I.push(B(1.5, 0.98, 0.03, SOMBRE, MX, MY, MZ), B(1.4, 0.88, 0.01, '#efe8d6', MX, MY, MZ - 0.02));
      I.push(B(1.36, 0.035, 0.012, '#6a6d75', MX, MY - 0.05, MZ - 0.025));
      const coul = ['#c2562e', '#e2b23a', '#b0402c', '#d9a832', '#d0702f', '#eac24a'];
      for (let i = 0; i < 6; i++) I.push(B(0.17, 0.22, 0.012, coul[i], MX - 0.55 + i * 0.22, MY + 0.2, MZ - 0.026));
      for (let i = 0; i < 5; i++) I.push(B(0.2, 0.18, 0.012, coul[(i + 3) % 6], MX - 0.5 + i * 0.25, MY - 0.27, MZ - 0.026));
      I.push(B(0.12, 0.1, 0.014, '#7d2333', MX - 0.62, MY + 0.03, MZ - 0.028)); // le domaine
    }
    // tapis, suspension
    I.push(B(2.0, 0.012, 1.45, '#c9a86a', -73.5, 0.046, -62.35), B(1.86, 0.014, 1.31, '#7d2333', -73.5, 0.048, -62.35));
    I.push(C(0.008, 0.008, 0.3, 4, '#2b2b30', cx, H - 0.15, cz), C(0.12, 0.24, 0.16, 10, '#2b2b30', cx, H - 0.38, cz), C(0.1, 0.1, 0.02, 8, '#ffe1a0', cx, H - 0.46, cz));
    // meubles : on ne les traverse pas
    for (const [x0, z0, x1, z1] of [[-72.0, -63.42, -71.2, -61.78], [EX0 - 0.03, zS, EX1 + 0.03, zS + 0.38], [-75.7, -64.2, -75.12, -63.64], [-71.82, -60.25, -71.4, -59.6], [-72.75, -60.15, -72.35, -59.6], [-74.25, zS, -73.65, zS + 0.9]]) col.boite(x0, z0, x1, z1);
    const dedans = new THREE.Mesh(fusion(I), MAT);
    dedans.receiveShadow = false; dedans.castShadow = false; dedans.name = 'bureau du chai';
    scene.add(dedans);
    o.interieur = dedans; // dessiné seulement quand on le voit (main.js : dedans, ou porte ouverte)

    // la porte : un battant sur sa charnière (côté nord), qui s'ouvre vers l'intérieur (rotation.y négative)
    const porte = new THREE.Group(); porte.position.set(-75.85, 0, -60.12);
    {
      const g = fusion([B(0.06, 2.1, 0.96, '#5b3a2a', 0, 1.05, -0.48), B(0.07, 0.03, 0.86, '#4a3324', 0, 1.55, -0.48), B(0.07, 0.03, 0.86, '#4a3324', 0, 0.55, -0.48),
        B(0.1, 0.04, 0.12, '#c9b36a', 0, 1.0, -0.84)]);
      const m = new THREE.Mesh(g, MAT); m.castShadow = true; m.receiveShadow = true; porte.add(m);
    }
    scene.add(porte);
    o.porte = porte;
    return o;
  }
  /* Les Grands Champs : un hameau au sud des vignes, au bout d'un chemin qui part de la départementale (x = -55, entre
     deux parcelles). Une placette, l'Auberge du Moulin (le prospect de la tournée), un moulin dont les ailes tournent
     (main.js), trois maisons, quelques arbres. Construit avec son propre tirage au sort (le reste du monde ne bouge pas). */
  function hameau() {
    const rndMonde = rnd;
    rnd = hasard(4242);
    // l'auberge, façade vers la placette (vitrine, store bordeaux, enseigne) ; terrasse
    const au = maison({ x: -44, z: 131, w: 14, d: 8, h: 5.8, rot: -Math.PI / 2, volets: '#7a8f6a', vitrine: '#5a6b2f', boutique: 'resto', banne: '#7d2333', porteC: '#4a3324' });
    portes.auberge = au.entree;
    enseigne('AUBERGE DU MOULIN', facade(au, -1.96, 0.37), 3.05, 5.2, 0.54, '#5a6b2f', '#f1e2c4');
    for (const z of [126.5, 129.5]) {
      bati.push(C(0.42, 0.42, 0.04, 10, '#efe7d6', -50.6, 0.74, z), C(0.04, 0.04, 0.72, 5, '#2b2b30', -50.6, 0.36, z), C(0.2, 0.2, 0.02, 8, '#2b2b30', -50.6, 0.01, z));
      for (const dz of [-0.7, 0.7]) bati.push(B(0.4, 0.04, 0.4, '#5b3a2a', -50.6, 0.45, z + dz), B(0.04, 0.45, 0.4, '#5b3a2a', -50.6 + (dz < 0 ? -0.2 : 0.2), 0.68, z + dz));
      col.boiteC(-50.6, z, 1.0, 2.1);
    }
    // l'ardoise de l'auberge, devant la porte
    bati.push(B(0.06, 0.9, 0.6, '#2b2b30', -49.2, 0.75, 137.6), B(0.07, 0.04, 0.66, '#6b4a30', -49.2, 1.2, 137.6), B(0.4, 0.5, 0.04, '#6b4a30', -49.05, 0.25, 137.6, 0));
    col.boiteC(-49.2, 137.6, 0.5, 0.8);
    // le moulin : tour de tuffeau, toit d'ardoise, ailes (à part : elles tournent)
    const MX = -36, MZ = 147;
    bati.push(C(2.3, 2.7, 9, 14, TUF, MX, 4.5, MZ), C(0.3, 2.6, 2.6, 14, ARD, MX, 10.3, MZ), B(1.0, 1.9, 0.12, '#5b3a2a', MX - 2.55, 0.95, MZ, Math.PI / 2));
    for (const y of [3.6, 6.6]) bati.push(B(0.7, 0.9, 0.1, '#2f3c4f', MX - 2.45, y, MZ, Math.PI / 2));
    col.boiteC(MX, MZ, 5, 5).haut = true;
    plan.push({ t: 'b', x0: MX - 2.5, z0: MZ - 2.5, x1: MX + 2.5, z1: MZ + 2.5 });
    const ailes = new THREE.Group(); ailes.position.set(MX - 2.9, 8.6, MZ);
    {
      const L = [C(0.35, 0.35, 0.5, 8, '#3a3a3e', 0, 0, 0, 'x')];
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2, bras = B(0.08, 4.4, 0.16, '#5b3a2a'), toile = B(0.03, 3.4, 1.0, '#efe7d6');
        deplacer(bras, 0, 2.3, 0); deplacer(toile, -0.05, 2.6, 0.55);
        for (const g of [bras, toile]) { g.rotateX(a); L.push(g); }
      }
      const m = new THREE.Mesh(fusion(L), MAT); m.castShadow = true; m.receiveShadow = true; ailes.add(m);
    }
    scene.add(ailes);
    // les maisons du hameau
    maison({ x: -68, z: 128, w: 10, d: 8, h: 6.2, rot: Math.PI / 2, volets: '#6b7f99' });
    maison({ x: -57, z: 149, w: 12, d: 8, h: 6.6, rot: Math.PI, volets: '#9aa3ad' });
    maison({ x: -74, z: 146, w: 8, d: 7, h: 5.6, rot: Math.PI / 2, volets: '#8e6f5a' });
    // quelques arbres, un banc, un puits
    for (const [x, z, r] of [[-62.5, 119.5, 2.1], [-47.5, 120.5, 1.8], [-30, 136, 2.4], [-79, 136, 2.2], [-45, 152, 2.0]]) {
      bati.push(C(0.2, 0.28, 2.6, 6, '#5e4a36', x, 1.3, z), S(r, pick(['#c9a23a', '#b8642c', '#7f9046']), x, 3.4 + r * 0.6, z, 1, 0.9, 1, 1));
      col.boiteC(x, z, 0.6, 0.6);
    }
    bati.push(B(1.6, 0.08, 0.4, '#6b4a30', -63.5, 0.45, 137, Math.PI / 2), B(0.1, 0.45, 0.4, '#3a3a3e', -63.5, 0.22, 136.4), B(0.1, 0.45, 0.4, '#3a3a3e', -63.5, 0.22, 137.6));
    col.boiteC(-63.5, 137, 0.5, 1.7);
    bati.push(C(0.9, 0.9, 0.8, 12, '#cfc3a8', -60, 0.4, 140.5), C(0.7, 0.7, 0.04, 12, '#2f3c4f', -60, 0.79, 140.5), B(0.1, 1.6, 0.1, '#5b3a2a', -60.8, 1.6, 140.5), B(0.1, 1.6, 0.1, '#5b3a2a', -59.2, 1.6, 140.5), B(1.8, 0.1, 0.12, '#5b3a2a', -60, 2.4, 140.5));
    col.boiteC(-60, 140.5, 1.8, 1.8);
    // panneau à l'entrée du chemin
    panneau(direction('Les Grands Champs', 34), 2.0, 0.34, -51.8, 2.0, 15.2, Math.PI / 2);
    rnd = rndMonde;
    return ailes;
  }
  // point sur la façade (coordonnées monde) : lx le long de la façade, avance devant
  const facade = (o, lx, avance) => {
    const r = o.rot || 0, a = o.d / 2 + avance;
    return { x: o.x + Math.sin(r) * a + Math.cos(r) * lx, z: o.z + Math.cos(r) * a - Math.sin(r) * lx, rot: r };
  };
  function enseigne(txt, p, y, w, h, fond, encre, bord) {
    const W = 512, H = Math.max(64, Math.round(512 * h / w));
    atlas.poser(W, H, c => {
      c.fillStyle = fond; c.fillRect(0, 0, W, H);
      c.strokeStyle = bord || encre; c.lineWidth = bord ? 18 : 6;
      const m = bord ? 12 : 10;
      c.strokeRect(m, m, W - 2 * m, H - 2 * m);
      c.fillStyle = encre; c.textAlign = 'center'; c.textBaseline = 'middle';
      // une seule mesure du texte, puis taille proportionnelle à la place disponible
      const police = n => `bold ${n}px Georgia, 'Times New Roman', serif`;
      c.font = police(100);
      const t = Math.max(12, Math.min(Math.round(H * 0.52), Math.floor(100 * (W - 60) / c.measureText(txt).width)));
      c.font = police(t);
      c.fillText(txt, W / 2, H / 2 + 3);
    }, w, h, p.x, y, p.z, p.rot);
  }

  // Domaine du Clos Libre
  const VOLETS = ['#5d7d8f', '#7a8f6a', '#9aa3ad', '#6b7f99', '#8e6f5a', '#5f8a87'];
  maison({ x: -100, z: -64, w: 16, d: 10, h: 7.2, rot: 0, volets: '#6b7f99', porteC: '#3e4f63' });
  const chai = chaiEtBureau();
  {
    enseigne('CHAI', facade(chai, 0, 0.12), 4.65, 2.2, 0.7, '#5b3a2a', '#f1e2c4');
  }
  /* -- Le parvis du chai (Teddy, 24/11/2026 : « des artefacts viticoles, réalistes, et que ça vive »). Au nord de la grande
     porte, le chantier des barriques, le poste de rinçage (une barrique couchée sur son berceau d'inox, le nettoyeur haute
     pression et son tuyau, une flaque, le caniveau à grille), des barriques rincées debout qui s'égouttent ; dans le coin
     contre le muret, une remorque plateau chargée de caisses de vendange que l'on range sur des palettes, deux palox ;
     près du bureau, un vieux pressoir à cage et un demi-fût planté. Ceux qui y travaillent, les caisses (en instances), le
     chien, les moineaux : parvis.js. Rien sur les passages des véhicules (la cour, la porte, le bureau), ni sur la marche
     arrière qui ressort du chai (chai.js, cheminSortie). */
  const FUT = '#7a4a2a', CERCLE = '#3a3a3e', INOX = '#a3aab2';
  // une barrique de 225 L, tournée (axe y, centre à l'origine) : les douelles (une sur deux un peu plus sombre), le bouge
  // au milieu (70 cm), les fonds (58 cm) et leur jable, quatre cercles de fer peints à même le bois (sans facette de plus) ;
  // une géométrie par axe, copiée pour chaque barrique (288 triangles, au lieu de 384 en cylindres empilés)
  const FUTS = {};
  const geoBarrique = axe => {
    if (!FUTS[axe]) {
      const at = new Atelier(), n = 12, L = 0.475, TOUR = Math.PI * 2, r = y => 0.29 + 0.06 * (1 - (y / L) ** 2);
      const Y = [-L, -0.43, -0.37, -0.16, -0.1, 0.1, 0.16, 0.37, 0.43, L], CER = b => b % 2 === 1;
      const P = (a, y, rr = r(y)) => [Math.cos(a) * rr, y, Math.sin(a) * rr];
      for (let b = 0; b < Y.length - 1; b++) for (let i = 0; i < n; i++) {
        const a0 = i / n * TOUR, a1 = (i + 1) / n * TOUR, am = (a0 + a1) / 2;
        at.quad(P(a0, Y[b]), P(a1, Y[b]), P(a1, Y[b + 1]), P(a0, Y[b + 1]), CER(b) ? CERCLE : i % 2 ? '#6e4227' : FUT, CER(b) ? 0 : T.bois, [Math.cos(am), 0, Math.sin(am)]);
      }
      for (const sg of [1, -1]) for (let i = 0; i < n; i++) {
        const a0 = i / n * TOUR, a1 = (i + 1) / n * TOUR, ext = [0, sg, 0];
        at.quad(P(a0, sg * L, 0.29), P(a1, sg * L, 0.29), P(a1, sg * L, 0.25), P(a0, sg * L, 0.25), '#5a3f2b', T.bois, ext);
        at.tri(P(a0, sg * L, 0.25), P(a1, sg * L, 0.25), [0, sg * L, 0], '#6b4a30', T.bois, ext);
      }
      const g = fusion(at.geos());
      if (axe === 'x') g.rotateZ(Math.PI / 2); else if (axe === 'z') g.rotateX(Math.PI / 2);
      FUTS[axe] = g;
    }
    return FUTS[axe].clone();
  };
  const barrique = (x, y, z, axe = 'x', bonde = true) => {
    bati.push(deplacer(geoBarrique(axe), x, y, z));
    if (bonde && axe !== 'y') bati.push(C(0.035, 0.035, 0.06, 6, '#5a3f2b', x, y + 0.35, z));
  };
  // le chantier contre le chai : deux madriers, six barriques couchées, cinq par-dessus, dans les creux
  bati.push(B(0.12, 0.12, 4.6, '#5a3f2b', -77.25, 0.06, -44.45), B(0.12, 0.12, 4.6, '#5a3f2b', -76.75, 0.06, -44.45));
  for (let i = 0; i < 6; i++) barrique(-77, 0.47, -46.3 + i * 0.74);
  for (let i = 0; i < 5; i++) barrique(-77, 1.064, -45.93 + i * 0.74, 'x', false);
  col.boite(-77.6, -46.75, -76.3, -42.2);
  contact.jupe(-77.5, -46.7, -76.5, -42.2, 0.8, 0.4);
  // le poste de rinçage : la barrique couchée, bonde en bas, sur deux berceaux d'inox ; la flaque, le caniveau à grille
  for (const x of [-79.88, -79.32]) bati.push(B(0.06, 0.3, 0.62, INOX, x, 0.15, -44.6), B(0.06, 0.04, 0.7, INOX, x, 0.31, -44.6));
  bati.push(B(0.62, 0.04, 0.06, INOX, -79.6, 0.04, -44.3), B(0.62, 0.04, 0.06, INOX, -79.6, 0.04, -44.9));
  barrique(-79.6, 0.64, -44.6, 'x', false);
  for (const [x, z, r] of [[-79.6, -44.45, 0.82], [-79.05, -43.8, 0.5], [-80.15, -45.25, 0.4], [-80.6, -44.2, 0.3]]) bati.push(C(r, r, 0.004, 14, '#8f877a', x, 0.031, z));
  bati.push(B(3.0, 0.008, 0.26, '#2b2b30', -79.6, 0.032, -43.35));
  for (let i = 0; i < 15; i++) bati.push(B(0.03, 0.01, 0.24, '#78736b', -81.0 + i * 0.2, 0.036, -43.35));
  col.boite(-80.1, -45.0, -79.1, -44.2);
  // le nettoyeur haute pression : caisson jaune sur deux roues, poignée, enrouleur ; son tuyau jusqu'au rinceur
  bati.push(B(0.5, 0.62, 0.62, '#e0b12a', -81.6, 0.5, -47.6), B(0.52, 0.06, 0.64, '#2b2b30', -81.6, 0.82, -47.6), B(0.04, 0.5, 0.04, '#2b2b30', -81.85, 1.05, -47.85), B(0.04, 0.5, 0.04, '#2b2b30', -81.85, 1.05, -47.35));
  bati.push(B(0.04, 0.04, 0.54, '#2b2b30', -81.85, 1.3, -47.6), C(0.17, 0.17, 0.1, 10, '#2b2b30', -81.62, 0.2, -47.95, 'z'), C(0.17, 0.17, 0.1, 10, '#2b2b30', -81.62, 0.2, -47.25, 'z'));
  bati.push(C(0.2, 0.2, 0.3, 10, '#2f4a32', -81.55, 1.0, -47.6, 'z'));
  {
    const pts = [[-81.3, -47.35], [-81.0, -46.95], [-80.5, -46.9], [-80.1, -46.8], [-79.75, -46.85], [-79.45, -46.7]]; // jusqu'aux pieds du rinceur, entre ses deux places
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], l = Math.hypot(bx - ax, bz - az);
      bati.push(C(0.022, 0.022, l + 0.04, 5, '#1e1e22', (ax + bx) / 2, 0.05, (az + bz) / 2, 'z', Math.atan2(bx - ax, bz - az)));
    }
  }
  col.boiteC(-81.6, -47.6, 0.7, 0.75);
  // l'enrouleur d'eau au mur, à côté de la porte
  bati.push(C(0.26, 0.26, 0.1, 12, '#c0392b', -76.12, 1.2, -47.9, 'x'), C(0.22, 0.22, 0.14, 12, '#2f6b3a', -76.18, 1.2, -47.9, 'x'), B(0.05, 1.1, 0.06, '#5d6b78', -76.06, 0.55, -47.9));
  // les barriques rincées, debout, bonde en bas, qui s'égouttent sur des cales
  for (const [x, z] of [[-80.3, -41.25], [-79.5, -41.25], [-79.9, -40.55]]) { bati.push(B(0.62, 0.08, 0.14, '#5a3f2b', x, 0.04, z)); barrique(x, 0.555, z, 'y'); }
  bati.push(C(0.55, 0.55, 0.004, 14, '#8f877a', -79.9, 0.031, -40.95));
  col.boite(-80.7, -41.65, -79.1, -40.15);
  contact.jupe(-80.65, -41.6, -79.15, -40.2, 0.7, 0.3);
  // la remorque plateau contre le muret : plateau, ridelles basses, châssis, deux essieux, flèche et sa roue jockey
  {
    const x0 = -85.8, x1 = -81.8, z0 = -36.5, z1 = -34.9, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
    bati.push(B(x1 - x0, 0.08, z1 - z0, '#6b4a30', xm, 0.58, zm), B(x1 - x0, 0.14, 0.12, '#8e2a2a', xm, 0.47, z0 + 0.25), B(x1 - x0, 0.14, 0.12, '#8e2a2a', xm, 0.47, z1 - 0.25));
    for (const z of [z0 + 0.03, z1 - 0.03]) bati.push(B(x1 - x0, 0.16, 0.05, '#8e2a2a', xm, 0.7, z));
    for (const x of [x0 + 0.03, x1 - 0.03]) bati.push(B(0.05, 0.16, z1 - z0, '#8e2a2a', x, 0.7, zm));
    for (const dx of [-0.36, 0.36]) for (const z of [z0 + 0.16, z1 - 0.16]) bati.push(C(0.26, 0.26, 0.2, 12, '#1e1e22', xm + dx, 0.26, z, 'z'), C(0.14, 0.14, 0.21, 10, '#9aa1a8', xm + dx, 0.26, z, 'z'));
    for (const z of [zm - 0.45, zm + 0.45]) bati.push(B(1.38, 0.1, 0.1, '#8e2a2a', x0 - 0.65, 0.4, (z + zm) / 2, Math.atan2(zm - z, 1.3)));
    bati.push(C(0.05, 0.05, 0.45, 6, '#2b2b30', x0 - 1.3, 0.22, zm), C(0.09, 0.09, 0.06, 8, '#1e1e22', x0 - 1.3, 0.09, zm, 'z'));
    col.boite(x0, z0, x1, z1);
    contact.jupe(x0, z0, x1, z1, 0.9, 0.3);
  }
  // les palettes où l'on range les caisses (les caisses : parvis.js), deux palox gris empilés au coin du chai
  for (const x of [-80.4, -79.1, -77.8]) bati.push(B(1.2, 0.14, 0.8, '#9a7b55', x, 0.07, -35.55));
  col.boite(-81.0, -35.95, -77.2, -35.15);
  for (const y of [0.38, 1.14]) bati.push(B(1.2, 0.72, 1.0, '#4f5a63', -77.0, y, -37.6), B(1.24, 0.06, 1.04, '#5c6873', -77.0, y + 0.36, -37.6));
  for (const dx of [-0.45, 0.45]) bati.push(B(0.14, 0.06, 1.0, '#4f5a63', -77.0 + dx, 0.03, -37.6));
  col.boite(-77.6, -38.1, -76.4, -37.1);
  contact.jupe(-77.6, -38.1, -76.4, -37.1, 0.8, 0.35);
  // le vieux pressoir à cage, près du bureau : la maie de pierre et son bec, la cage de douelles cerclée de fer, le mouton,
  // la vis et sa barre
  {
    const x = -79.4, z = -63.2;
    bati.push(B(1.7, 0.45, 1.7, '#cfc3a8', x, 0.225, z), B(1.5, 0.04, 1.5, '#a99a82', x, 0.44, z), B(0.3, 0.12, 0.34, '#cfc3a8', x - 0.98, 0.33, z));
    bati.push(C(0.58, 0.58, 0.85, 16, '#6b4a30', x, 0.88, z));
    for (const y of [0.6, 0.9, 1.2]) bati.push(C(0.6, 0.6, 0.05, 16, CERCLE, x, y, z));
    bati.push(B(1.2, 0.18, 0.28, '#5b3a2a', x, 1.42, z), B(0.28, 0.18, 1.2, '#5b3a2a', x, 1.6, z));
    bati.push(C(0.06, 0.06, 1.3, 8, '#2b2b30', x, 2.2, z), C(0.13, 0.13, 0.2, 8, '#2b2b30', x, 1.85, z), B(1.7, 0.07, 0.07, '#5b3a2a', x, 1.88, z, 0.6));
    col.boiteC(x, z, 1.7, 1.7);
    contact.jupe(x - 0.85, z - 0.85, x + 0.85, z + 0.85, 0.5, 0.3);
  }
  // un demi-fût planté d'un laurier, à côté de la porte du bureau
  bati.push(C(0.4, 0.36, 0.46, 12, FUT, -77.0, 0.23, -58.75), C(0.405, 0.405, 0.04, 12, CERCLE, -77.0, 0.36, -58.75), C(0.37, 0.37, 0.02, 12, '#6f5238', -77.0, 0.45, -58.75));
  bati.push(S(0.42, '#4d6b3c', -77.0, 0.92, -58.75, 1, 1.15, 1, 1), S(0.3, '#557544', -76.9, 1.3, -58.65, 1, 1, 1, 1));
  col.boiteC(-77.0, -58.75, 0.8, 0.8);
  // un bâton (manche d'outil) de a à b
  const manche = (a, b, r, c) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), g = C(r, r, l, 5, c), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3((b[0] - a[0]) / l, (b[1] - a[1]) / l, (b[2] - a[2]) / l)); g.applyQuaternion(q); return deplacer(g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); };
  // le balai et la raclette, appuyés au mur du chai près de l'enrouleur
  bati.push(manche([-76.75, 0.02, -48.75], [-76.08, 1.35, -48.68], 0.016, '#c9a55a'), B(0.06, 0.08, 0.36, '#3a3a3e', -76.78, 0.06, -48.75));
  bati.push(manche([-76.72, 0.02, -49.25], [-76.08, 1.3, -49.2], 0.016, '#c9a55a'), B(0.05, 0.1, 0.5, '#2b2b30', -76.75, 0.05, -49.25));
  // deux seaux près du poste de rinçage, l'un renversé
  bati.push(C(0.13, 0.11, 0.28, 10, '#2e86de', -81.05, 0.14, -44.85), C(0.105, 0.105, 0.012, 10, '#1d4f80', -81.05, 0.275, -44.85));
  bati.push(C(0.11, 0.13, 0.28, 10, '#e0b13a', -81.25, 0.14, -45.25));
  // les tuyaux à vin, lovés au sol à côté de la porte, et la pompe à vin sur son chariot
  for (const [x, z, y] of [[-79.25, -48.55, 0.04], [-79.2, -48.6, 0.12]]) {
    const t = teinter(new THREE.TorusGeometry(0.42, 0.042, 5, 16).rotateX(Math.PI / 2), '#a3322b'); bati.push(deplacer(t, x, y, z));
  }
  bati.push(manche([-79.6, 0.05, -48.35], [-80.3, 0.04, -47.9], 0.04, '#a3322b'));
  bati.push(B(0.5, 0.06, 0.34, '#2b2b30', -78.05, 0.24, -48.35), B(0.42, 0.26, 0.28, '#b03a2e', -78.05, 0.41, -48.35), C(0.1, 0.1, 0.3, 10, '#b03a2e', -78.05, 0.45, -48.35, 'x'));
  for (const s2 of [-1, 1]) bati.push(C(0.11, 0.11, 0.05, 10, '#1e1e22', -78.2, 0.11, -48.35 + s2 * 0.2, 'z'));
  bati.push(manche([-77.85, 0.25, -48.35], [-77.55, 0.85, -48.35], 0.014, '#2b2b30'), C(0.05, 0.05, 0.12, 8, '#9aa1a8', -78.32, 0.45, -48.35, 'x'));
  col.boite(-79.7, -49.05, -77.5, -48.05);
  // une brouette, à côté des barriques qui s'égouttent : la caisse, la roue, les brancards et les pieds
  {
    const x = -81.35, z = -40.6;
    bati.push(B(0.58, 0.05, 0.7, '#2f6b3a', x, 0.42, z), B(0.04, 0.24, 0.72, '#2f6b3a', x - 0.31, 0.56, z), B(0.04, 0.24, 0.72, '#2f6b3a', x + 0.31, 0.56, z), B(0.62, 0.24, 0.04, '#2f6b3a', x, 0.56, z - 0.37), B(0.62, 0.2, 0.04, '#2f6b3a', x, 0.53, z + 0.37));
    bati.push(C(0.19, 0.19, 0.08, 10, '#1e1e22', x, 0.19, z + 0.62, 'x'), C(0.09, 0.09, 0.085, 8, '#c0392b', x, 0.19, z + 0.62, 'x'));
    for (const s2 of [-1, 1]) bati.push(manche([x + s2 * 0.2, 0.19, z + 0.62], [x + s2 * 0.27, 0.62, z - 0.9], 0.02, '#c0392b'), B(0.03, 0.4, 0.03, '#c0392b', x + s2 * 0.22, 0.2, z - 0.25));
    col.boite(x - 0.35, z - 0.95, x + 0.35, z + 0.82);
  }
  // le transpalette, garé devant les palox
  bati.push(B(0.16, 0.05, 1.15, '#e0b12a', -79.0, 0.04, -38.75), B(0.16, 0.05, 1.15, '#e0b12a', -78.55, 0.04, -38.75), B(0.62, 0.36, 0.14, '#e0b12a', -78.78, 0.2, -38.12));
  bati.push(manche([-78.78, 0.35, -38.05], [-78.78, 1.15, -37.82], 0.02, '#2b2b30'), B(0.24, 0.04, 0.04, '#2b2b30', -78.78, 1.15, -37.82));
  col.boite(-79.1, -39.35, -78.45, -38.0);
  // la couverture et la gamelle du chien (le chien : parvis.js)
  bati.push(B(1.05, 0.03, 0.66, '#7a3f35', -77.25, 0.03, -63.4), B(0.08, 0.031, 0.64, '#c9a55a', -77.7, 0.031, -63.4), B(0.08, 0.031, 0.64, '#c9a55a', -76.8, 0.031, -63.4));
  bati.push(C(0.12, 0.09, 0.07, 10, '#a3aab2', -77.95, 0.035, -62.75), C(0.1, 0.1, 0.006, 10, '#4f93b8', -77.95, 0.072, -62.75));
  bati.push(B(1.25, 0.14, 1.05, '#9a7b55', -78.4, 0.07, -57.5));
  for (let i = 0; i < 12; i++) bati.push(B(0.4, 0.28, 0.32, '#b98a55', -78.8 + (i % 3) * 0.41, 0.28 + Math.floor(i / 6) * 0.29, -57.75 + (Math.floor(i / 3) % 2) * 0.34));
  col.boiteC(-78.4, -57.5, 1.3, 1.1);
  contact.jupe(-79.0, -58.0, -77.8, -57.0, 0.5, 0.3);
  // muret et portail
  bati.push(B(21.6, 1.1, 0.5, '#d9cdb2', -104.2, 0.55, -33.5), B(24.6, 1.1, 0.5, '#d9cdb2', -74.4, 0.55, -33.5));
  col.boite(-115, -33.75, -93.4, -33.25); col.boite(-86.6, -33.75, -62, -33.25);
  contact.jupe(-115, -33.75, -93.4, -33.25, 0.8, 0.3); contact.jupe(-86.6, -33.75, -62, -33.25, 0.8, 0.3);
  for (const x of [-93, -87]) { bati.push(B(0.8, 2.6, 0.8, TUF, x, 1.3, -33.5), B(1, 0.2, 1, '#cbbf9f', x, 2.7, -33.5)); col.boiteC(x, -33.5, 0.8, 0.8); }
  bati.push(B(6.4, 0.12, 0.12, '#2b2b30', -90, 3.25, -33.5));
  enseigne('DOMAINE DU CLOS LIBRE', { x: -90, z: -33.42, rot: 0 }, 3.65, 5.6, 0.72, '#2b2b30', '#f0d9a0');
  // l'aire de remplissage (mission 2) : une cuve d'eau de 1 000 L dans sa cage, sur un socle ; la potence et son tuyau ;
  // l'armoire fermée des produits, son pictogramme ; un caniveau qui récupère ce qui coule
  {
    const x = -90.2, z = -67.5;
    bati.push(B(1.3, 0.5, 1.3, '#8f8a80', x, 0.25, z), B(1.15, 1.05, 1.15, '#eef0ec', x, 1.03, z), C(0.16, 0.16, 0.1, 10, '#2f6db0', x, 1.6, z));
    for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) bati.push(B(0.05, 1.15, 0.05, '#9aa1a8', x + dx, 1.08, z + dz));
    for (const y of [0.6, 1.08, 1.56]) bati.push(B(1.24, 0.04, 1.24, '#9aa1a8', x, y, z));
    bati.push(B(0.12, 3.2, 0.12, '#5d6b78', -88.6, 1.6, -71.2), B(2.6, 0.1, 0.1, '#5d6b78', -87.4, 3.15, -71.2), B(0.06, 0.9, 0.06, '#1e1e22', -86.2, 2.65, -71.2));
    bati.push(B(1.3, 1.9, 0.6, '#55705a', -83.4, 0.95, -71.4), B(1.32, 0.06, 0.62, '#3e5244', -83.4, 1.92, -71.4), B(0.3, 0.3, 0.02, '#e8b923', -83.4, 1.3, -71.09), B(0.2, 0.2, 0.025, '#1e1e22', -83.4, 1.3, -71.085));
    bati.push(B(5.6, 0.04, 0.3, '#5b5e66', -86, 0.07, -62.9));
    col.boiteC(x, z, 1.4, 1.4); col.boiteC(-88.6, -71.2, 0.3, 0.3); col.boiteC(-83.4, -71.4, 1.4, 0.7);
    contact.jupe(x - 0.65, z - 0.65, x + 0.65, z + 0.65, 0.6, 0.35); contact.jupe(-84.05, -71.7, -82.75, -71.1, 0.6, 0.35);
  }

  // Le bourg : maisons le long de la départementale
  const nord = [[34, 10, 8, 6.2], [46, 9, 8, 7], [58, 11, 9, 6.5, 'boul'], [80, 9, 8, 7.5, 'epicerie'], [110, 11, 8, 6.6, 'resto'], [124, 10, 8, 7], [137, 11, 9, 6.4]];
  for (const [x, w, d, h, t] of nord) {
    const resto = t === 'resto';
    const o = maison({ x, z: 1.5 - d / 2, w, d, h, rot: 0, volets: resto ? '#2f5d50' : pick(VOLETS), vitrine: resto ? '#2f5d50' : t === 'boul' ? '#6b2a2a' : t ? '#2f4a6b' : null, boutique: resto ? 'resto' : t === 'boul' ? 'boulangerie' : t, banne: resto ? '#2f5d50' : null, porteC: resto ? '#2f5d50' : undefined });
    if (t === 'epicerie') portes.epicerie = o.entree;
    if (resto) portes.treille = o.entree;
    if (t === 'boul') enseigne('BOULANGERIE', facade(o, -w * 0.14, 0.37), 3.05, 4.6, 0.54, '#efe0b4', '#6b3d1f');
    if (resto) enseigne('RESTAURANT LA TREILLE', facade(o, -w * 0.14, 0.37), 3.05, 5.6, 0.54, '#2f5d50', '#f3e7c9');
    if (t === 'epicerie') {
      enseigne('ÉPICERIE DU BOURG', facade(o, -w * 0.14, 0.37), 3.05, 5.0, 0.54, '#2f4a6b', '#f3e7c9');
      // l'étal devant la vitrine : cageots de fruits et de légumes
      for (const [dx, fruit] of [[-2.6, '#e0802f'], [-1.6, '#c42d3a'], [-0.6, '#5d8a36']]) {
        bati.push(B(0.86, 0.46, 0.56, '#9a7b55', x + dx, 0.23, 2.2), B(0.76, 0.1, 0.46, fruit, x + dx, 0.5, 2.2));
      }
      col.boiteC(x - 1.6, 2.2, 2.9, 0.6);
    }
  }
  for (const [x, w, d, h] of [[40, 10, 8, 6.5], [54, 9, 8, 7], [68, 12, 9, 6.4], [84, 10, 8, 7], [100, 10, 8, 6.6], [114, 11, 9, 7.2], [128, 10, 8, 6.4], [142, 12, 9, 6.8]])
    maison({ x, z: 18.5 + d / 2, w, d, h, rot: Math.PI, volets: pick(VOLETS) });
  // murs de clôture en moellons entre les maisons de la rue, chaperon de tuffeau, portail de bois dans les plus longs
  function cloture(x0, x1, z, portail) {
    const H = 2.1, mc = MOELLONS[Math.floor(hache(x0, z) * 3)], seg = (u0, u1) => {
      if (u1 - u0 < 0.05) return;
      bati.push(B(u1 - u0, H, 0.45, mc, (u0 + u1) / 2, H / 2, z), B(u1 - u0 + 0.04, 0.14, 0.6, APPUI, (u0 + u1) / 2, H + 0.07, z));
    };
    if (portail && x1 - x0 > 5) {
      const cx = (x0 + x1) / 2, a0 = cx - 1.55, a1 = cx + 1.55;
      seg(x0, a0 - 0.25); seg(a1 + 0.25, x1);
      for (const x of [a0, a1]) bati.push(B(0.5, 2.5, 0.6, PIERRE, x, 1.25, z), B(0.62, 0.14, 0.72, APPUI, x, 2.57, z), S(0.16, PIERRE, x, 2.8, z));
      bati.push(B(2.6, 1.9, 0.08, '#5b3a2a', cx, 1.05, z));
      for (const y of [0.45, 1.65]) bati.push(B(2.6, 0.12, 0.12, '#4a3324', cx, y, z + 0.06), B(2.6, 0.12, 0.12, '#4a3324', cx, y, z - 0.06));
    } else seg(x0, x1);
    col.boite(x0, z - 0.25, x1, z + 0.25).haut = true;
    plan.push({ t: 'b', x0, z0: z - 0.25, x1, z1: z + 0.25 });
    contact.jupe(x0, z - 0.3, x1, z + 0.3, 0.9, 0.42);
  }
  for (const [x0, x1, p] of [[39, 41.5], [50.5, 52.5], [63.5, 75.5, 1], [84.5, 91.6, 1], [98.4, 104.5, 1], [115.5, 119], [129, 131.5]]) cloture(x0, x1, 1.25, p);
  for (const [x0, x1, p] of [[45, 49.5], [58.5, 62], [74, 79, 1], [89, 95, 1], [105, 108.5], [119.5, 123], [133, 136]]) cloture(x0, x1, 18.75, p);
  // rue de la place
  for (const z of [-14, -24]) {
    maison({ x: 86, z, w: z === -14 ? 9 : 8, d: 8, h: 6.6 + rnd(), rot: Math.PI / 2, volets: pick(VOLETS) });
    maison({ x: 104, z, w: z === -14 ? 9 : 8, d: 8, h: 6.6 + rnd(), rot: -Math.PI / 2, volets: pick(VOLETS) });
  }
  // la place : cave, bar, mairie, église
  const cave = maison({ x: 68, z: -46, w: 9, d: 8, h: 6.5, rot: Math.PI / 2, volets: '#8e2a3b', vitrine: '#6e1f2e', boutique: 'cave', banne: '#8e2a3b', porteC: '#6e1f2e' });
  enseigne('CAVE DU PRESSOIR', facade(cave, -9 * 0.14, 0.37), 3.05, 4.4, 0.54, '#7a2233', '#f5e6c8');
  portes.cave = cave.entree;
  maison({ x: 68, z: -36, w: 8, d: 8, h: 7, rot: Math.PI / 2, volets: pick(VOLETS) });
  maison({ x: 68, z: -56, w: 8, d: 8, h: 6.2, rot: Math.PI / 2, volets: pick(VOLETS) });
  const bar = maison({ x: 82, z: -70, w: 11, d: 9, h: 6.6, rot: 0, volets: '#1f3b4d', vitrine: '#1f3b4d', boutique: 'bar', banne: '#1f3b4d' });
  enseigne('BAR LE CEP', facade(bar, -11 * 0.14, 0.37), 3.05, 4.4, 0.54, '#1f3b4d', '#f2d488');
  portes.bar = bar.entree;
  maison({ x: 108, z: -70, w: 10, d: 8, h: 7, rot: 0, volets: pick(VOLETS) });
  const mairie = maison({ x: 95, z: -87, w: 14, d: 9, h: 8.2, rot: 0, volets: '#5d6f86', drapeau: true, porteC: '#3e4f63' });
  enseigne('MAIRIE', facade(mairie, 0, 0.14), 7.55, 3.2, 0.62, '#efe8da', '#2b2b3a');
  /* L'église Saint-Vincent (le patron des vignerons), façade vers la place : clocher-porche, nef, chevet arrondi.
     Repère local : la nef le long de z (clocher en z = 10), tournée de -90° (monde x = 128 - z, monde z = -46 + x). */
  {
    const L = [B(10, 9, 24, TUF, 0, 4.5, 0), B(10.2, 0.6, 24.2, '#b9a98b', 0, 0.3, 0), ...toit(10, 24, 5.2, ARD, 0, 9, 0, true, { mur: TUF })];
    // chevet en demi-cercle, son toit conique, trois petites baies
    L.push(C(3.8, 3.8, 7.2, 14, TUF, 0, 3.6, -12), C(3.9, 3.9, 0.6, 14, '#b9a98b', 0, 0.3, -12), C(0, 4.25, 3.4, 14, ARD, 0, 8.9, -12));
    for (const a of [-0.9, 0, 0.9]) {
      const x = Math.sin(a) * 3.82, z = -12 - Math.cos(a) * 3.82;
      L.push(B(0.6, 1.9, 0.12, '#3d5f8e', x, 4.0, z, Math.PI - a), deplacer(tournerY(C(0.3, 0.3, 0.12, 8, '#3d5f8e', 0, 0, 0, 'z'), Math.PI - a), x, 4.95, z));
    }
    // contreforts entre les baies de la nef ; baies en plein cintre dans leur encadrement de pierre
    for (const s of [1, -1]) {
      for (const z of [-11.4, -6.7, -2.1, 2.5, 6.9]) L.push(B(0.9, 6.2, 0.8, TUF, s * 5.45, 3.1, z), B(0.55, 1.6, 0.7, TUF, s * 5.27, 6.9, z));
      for (const z of [-9, -4.4, 0.2, 4.8]) L.push(B(0.12, 3.0, 1.3, PIERRE, s * 5.02, 4.6, z), C(0.65, 0.65, 0.12, 8, PIERRE, s * 5.02, 6.1, z, 'x'),
        B(0.14, 2.8, 0.86, '#3d5f8e', s * 5.04, 4.5, z), C(0.43, 0.43, 0.14, 8, '#3d5f8e', s * 5.04, 5.9, z, 'x'));
    }
    // croix de pierre au pignon du chevet
    L.push(B(0.2, 1.2, 0.2, PIERRE, 0, 14.6, -12.1), B(0.8, 0.2, 0.2, PIERRE, 0, 14.85, -12.1));
    // clocher : bandeau, corniche, abat-sons sur les quatre faces, horloge, porche en plein cintre, marches
    L.push(B(5.6, 17, 5.6, TUF, 0, 8.5, 10), B(5.8, 0.22, 5.8, APPUI, 0, 9.6, 10), B(6.0, 0.36, 6.0, APPUI, 0, 17.0, 10));
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (const t of [-0.75, 0.75]) {
      const x = nx * 2.83 + nz * t, z = 10 + nz * 2.83 - nx * t, ry = nx ? Math.PI / 2 : 0;
      L.push(B(0.66, 1.7, 0.1, '#2b2622', x, 14.6, z, ry), C(0.33, 0.33, 0.1, 8, '#2b2622', x, 15.45, z, nx ? 'x' : 'z'));
      for (const y of [14.0, 14.45, 14.9, 15.35]) L.push(B(0.68, 0.06, 0.16, '#6b4a30', x, y, z, ry));
    }
    L.push(C(0.85, 0.85, 0.16, 14, '#f2ead8', 0, 12.0, 12.86, 'z'), B(0.08, 0.6, 0.05, '#222', 0, 12.15, 12.96), B(0.4, 0.07, 0.05, '#222', 0.15, 12.0, 12.97));
    L.push(C(1.1, 1.1, 0.2, 14, '#3d5f8e', 0, 6.6, 12.86, 'z'), C(1.3, 1.3, 0.16, 14, PIERRE, 0, 6.6, 12.83, 'z'));
    L.push(B(2.8, 3.0, 0.16, PIERRE, 0, 1.5, 12.84), C(1.4, 1.4, 0.16, 14, PIERRE, 0, 3.0, 12.84, 'z'), B(2.0, 3.0, 0.2, '#4a3324', 0, 1.5, 12.88), C(1.0, 1.0, 0.2, 14, '#4a3324', 0, 3.0, 12.88, 'z'));
    L.push(B(4.0, 0.12, 1.5, '#cbbf9f', 0, 0.06, 13.55), B(3.4, 0.12, 0.7, '#cbbf9f', 0, 0.18, 13.2));
    // flèche d'ardoise à huit pans, croix et coq
    L.push(C(0, 3.3, 10, 8, ARD, 0, 22.2, 10, 'y', Math.PI / 8));
    L.push(C(0.1, 0.1, 0.2, 6, '#c9a55a', 0, 27.25, 10), B(0.12, 1.9, 0.12, '#2b2b30', 0, 28.2, 10), B(0.95, 0.12, 0.12, '#2b2b30', 0, 28.5, 10));
    L.push(B(0.42, 0.24, 0.05, '#c9a55a', 0, 29.3, 10), B(0.12, 0.3, 0.05, '#c9a55a', -0.22, 29.4, 10), B(0.1, 0.16, 0.05, '#c9a55a', 0.22, 29.48, 10));
    poser(L, 128, -46, -Math.PI / 2, bati);
    const b = col.boite(115.2, -51.95, 140, -40.05); b.haut = true;
    col.boite(140, -49.8, 143.85, -42.2).haut = true;
    plan.push({ t: 'b', x0: 115.2, z0: -51, x1: 140, z1: -41 }, { t: 'b', x0: 140, z0: -49.8, x1: 143.8, z1: -42.2 });
    contact.jupe(116, -52.1, 140.2, -39.9, 1.8, 0.42);
    contact.tache(140, -46, 4.6, 4.6, 0.4);
  }
  // calvaire de pierre à l'entrée du bourg, croix de fer sur son socle au carrefour du chemin des Grands Champs
  {
    const P = '#cbbf9f';
    bati.push(B(2.4, 0.3, 2.4, P, 19.5, 0.15, 0.5), B(1.8, 0.3, 1.8, P, 19.5, 0.45, 0.5), B(1.0, 0.7, 1.0, PIERRE, 19.5, 0.95, 0.5),
      B(0.32, 3.3, 0.28, PIERRE, 19.5, 2.95, 0.5), B(1.3, 0.28, 0.26, PIERRE, 19.5, 3.85, 0.5));
    col.boiteC(19.5, 0.5, 2.4, 2.4).haut = true;
    contact.jupe(18.3, -0.7, 20.7, 1.7, 0.9, 0.38);
    plan.push({ t: 'b', x0: 18.3, z0: -0.7, x1: 20.7, z1: 1.7 });
    bati.push(B(1.4, 0.35, 1.4, P, -55, 0.17, 3), B(0.7, 1.2, 0.7, PIERRE, -55, 0.95, 3), B(0.1, 2.6, 0.1, '#2b2b30', -55, 2.85, 3), B(0.9, 0.08, 0.08, '#2b2b30', -55, 3.6, 3),
      C(0.12, 0.12, 0.04, 8, '#2b2b30', -55, 3.6, 3.05, 'z'));
    col.boiteC(-55, 3, 1.4, 1.4);
    contact.jupe(-55.7, 2.3, -54.3, 3.7, 0.7, 0.35);
  }
  // fontaine (l'eau ondule et reflète le ciel), monument, bancs, réverbères, terrasse du bar
  bati.push(C(2.1, 2.3, 0.7, 14, '#d9cdb2', 95, 0.35, -46), C(1.85, 1.85, 0.1, 14, '#4f93b8', 95, 0.66, -46),
    C(0.35, 0.4, 2.0, 8, '#d9cdb2', 95, 1.4, -46), C(0.85, 0.55, 0.3, 10, '#d9cdb2', 95, 2.45, -46), C(0.72, 0.72, 0.05, 10, '#4f93b8', 95, 2.58, -46));
  col.boiteC(95, -46, 4.4, 4.4);
  contact.tache(95, -46, 3.4, 3.4, 0.38);
  bati.push(B(2.2, 0.8, 2.2, '#cfc3a8', 104, 0.4, -35), B(0.9, 4.2, 0.9, '#e3dac6', 104, 2.9, -35), C(0, 0.75, 0.8, 4, '#e3dac6', 104, 5.4, -35, 'y', Math.PI / 4));
  col.boiteC(104, -35, 2.2, 2.2);
  contact.jupe(102.9, -36.1, 105.1, -33.9, 0.9, 0.38);
  for (const [x, z] of [[86, -58.5], [104, -58.5]]) {
    bati.push(B(2, 0.1, 0.55, '#6b4a30', x, 0.48, z), B(2, 0.5, 0.08, '#6b4a30', x, 0.78, z - 0.25), B(0.1, 0.45, 0.5, '#2d2d33', x - 0.85, 0.22, z), B(0.1, 0.45, 0.5, '#2d2d33', x + 0.85, 0.22, z));
    col.boiteC(x, z, 2, 0.6);
    contact.tache(x, z, 1.4, 0.6, 0.3);
  }
  for (const [x, z] of [[78.5, -32], [111.5, -32], [78.5, -60.5], [111.5, -60.5]]) {
    bati.push(C(0.07, 0.1, 4.2, 6, '#2d2d33', x, 2.1, z), B(0.34, 0.44, 0.34, '#ffe1a0', x, 4.35, z), B(0.42, 0.06, 0.42, '#2d2d33', x, 4.6, z));
    col.boiteC(x, z, 0.4, 0.4);
    contact.tache(x, z, 0.5, 0.5, 0.35);
  }
  const terrasse = [[78.8, -62.6], [82.6, -62.6], [86.4, -62.6]];
  for (const [x, z] of terrasse) {
    bati.push(C(0.48, 0.48, 0.05, 10, '#ece5d8', x, 0.76, z), C(0.05, 0.05, 0.76, 6, '#333', x, 0.38, z),
      C(0.03, 0.03, 2.4, 5, '#ddd', x, 1.5, z), C(0, 1.35, 0.5, 8, '#1f3b4d', x, 2.55, z),
      B(0.42, 0.06, 0.42, '#2d2d33', x - 0.75, 0.46, z), B(0.42, 0.06, 0.42, '#2d2d33', x + 0.75, 0.46, z));
    col.boiteC(x, z, 2.2, 1);
    contact.tache(x, z, 1.5, 1.0, 0.25);
  }
  // panneau d'entrée d'agglomération
  bati.push(C(0.05, 0.05, 2.4, 5, '#cfcfcf', 24, 1.2, 4.2));
  enseigne('LE BOURG', { x: 24, z: 4.2, rot: -Math.PI / 2 }, 2.55, 2.2, 0.62, '#ffffff', '#1d1d1d', '#c8202a');
  bati.push(teinter(new THREE.PlaneGeometry(2.1, 0.58).rotateY(Math.PI / 2).translate(23.98, 2.55, 4.2), '#8d9196'));
  col.boiteC(24, 4.2, 0.2, 0.2);

  /* ------------------------------------------------------------ le château et sa colline (relief.js)
     La route du château part de la départementale (x = -176) et monte en 520 m (11 % au plus) jusqu'au plateau du
     sommet, parapets du côté du vide ; la route du tour, pavée, fait le tour du château ; les maisons du village la
     bordent, tournées vers lui (manoirs à tourelle, pans de bois, tuffeau), un belvédère au sud-est. Le château : corps
     de logis en tuffeau, grandes croisées, lucarnes à fronton, hautes cheminées, deux grosses tours rondes au sud
     (mâchicoulis, toits en poivrière), deux ailes et leur cour d'honneur au nord, fermée par un châtelet d'entrée ;
     jardins à la française, mur de clôture. Son propre tirage au sort (le reste du monde ne bouge pas). */
  const arbresChateau = []; // [x, z, type, y] : versés avec les autres arbres
  function chateau() {
    const rndMonde = rnd;
    rnd = hasard(7341);
    const R = TRACE, CH = CHATEAU, Y = CH.y;
    // un ruban le long de la route du château (décalages latéraux dg, dd ; à dy au-dessus de la chaussée)
    const ruban = (i0, i1, dg, dd, dy, couleur) => {
      const p = [];
      let av = null;
      for (let i = i0; ; i += 2) {
        const k = Math.min(i, i1), a = Math.max(0, k - 2), b = Math.min(R.n - 1, k + 2);
        let tx = R.x[b] - R.x[a], tz = R.z[b] - R.z[a];
        const l = Math.hypot(tx, tz); tx /= l; tz /= l;
        const y = R.y[k] + dy, cur = [R.x[k] - tz * dg, y, R.z[k] + tx * dg, R.x[k] - tz * dd, y, R.z[k] + tx * dd];
        if (av) {
          const A = av.slice(0, 3), Bb = av.slice(3), Cc = cur.slice(0, 3), D = cur.slice(3);
          for (const [u, v, w] of [[A, Bb, Cc], [Bb, D, Cc]]) {
            const ny = (v[2] - u[2]) * (w[0] - u[0]) - (v[0] - u[0]) * (w[2] - u[2]);
            p.push(...u, ...(ny >= 0 ? v : w), ...(ny >= 0 ? w : v));
          }
        }
        av = cur;
        if (k === i1) break;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.computeVertexNormals();
      return teinter(g, couleur);
    };
    // la chaussée s'arrête au bord du tour (pavé)
    let iFin = R.n - 1;
    while (iFin > 0 && Math.hypot(R.x[iFin] - CH.x, R.z[iFin] - CH.z) < CH.tour + DEMI + 0.2) iFin--;
    const surf = []; // (les surfaces du reste du monde sont déjà fusionnées : celles-ci ont leur maillage)
    surf.push(ruban(0, iFin, -DEMI, DEMI, 0.045, VIEILLE), ruban(0, iFin, DEMI, DEMI + 0.55, 0.035, '#cfc1a0'), ruban(0, iFin, -DEMI - 0.55, -DEMI, 0.035, '#cfc1a0'));
    plan.push({ t: 'l', pts: Array.from({ length: Math.ceil(R.n / 4) }, (_, k) => [R.x[Math.min(R.n - 1, k * 4)], R.z[Math.min(R.n - 1, k * 4)]]), c: '#8b857b', w: 6 });
    // parapets du côté du vide (là où le relief d'origine tombe sous la chaussée), en murets d'au moins 24 m (les
    // trous de moins de 16 m comblés) ; arbres du côté de la pente
    const vides = [1, -1].map(s => {
      const v = [];
      for (let i = 0; i < R.n; i++) {
        const a = Math.max(0, i - 2), b = Math.min(R.n - 1, i + 2), l = Math.hypot(R.x[b] - R.x[a], R.z[b] - R.z[a]);
        v.push(R.y[i] > 1.2 && avantRoute(R.x[i] - (R.z[b] - R.z[a]) / l * s * 10, R.z[i] + (R.x[b] - R.x[a]) / l * s * 10) < R.y[i] - 1.4);
      }
      const runs = (val, f) => { for (let i = 0; i < R.n;) { if (v[i] !== val) { i++; continue; } let j = i; while (j < R.n && v[j] === val) j++; f(i, j); i = j; } };
      runs(false, (i, j) => { if (i > 0 && j < R.n && j - i < 16) for (let k = i; k < j; k++) v[k] = true; });
      runs(true, (i, j) => { if (j - i < 24) for (let k = i; k < j; k++) v[k] = false; });
      return v;
    });
    let dernierArbre = -99;
    for (let i = 4; i < iFin; i += 2) {
      if (R.y[i] < 1.2) continue;
      const a = i - 2, b = i + 2, tx = (R.x[b] - R.x[a]) / Math.hypot(R.x[b] - R.x[a], R.z[b] - R.z[a]), tz = (R.z[b] - R.z[a]) / Math.hypot(R.x[b] - R.x[a], R.z[b] - R.z[a]);
      const cap = Math.atan2(tx, tz);
      // des balises blanches à bande noire au bord de la chaussée, tous les 28 m, en quinconce
      if (i % 28 === 0 && i > 80) for (const s of [1, -1]) {
        const bx = R.x[i] - tz * s * (DEMI + 1.1), bz = R.z[i] + tx * s * (DEMI + 1.1), by = sol(bx, bz);
        bati.push(B(0.14, 1.0, 0.14, '#f1ece2', bx, by + 0.5, bz, cap), B(0.15, 0.2, 0.15, '#1d1d1d', bx, by + 0.78, bz, cap));
        col.boiteC(bx, bz, 0.2, 0.2);
      }
      for (const s of [1, -1]) {
        const vide = vides[s > 0 ? 0 : 1][i];
        const px = R.x[i] - tz * s * 6.6, pz = R.z[i] + tx * s * 6.6;
        if (vide) bati.push(B(0.42, 0.78, 2.12, '#cdbf9f', px, R.y[i] + 0.33, pz, cap), B(0.52, 0.1, 2.12, APPUI, px, R.y[i] + 0.76, pz, cap));
        else if (i - dernierArbre > 16 && R.y[i] > 3) {
          dernierArbre = i;
          const ax = R.x[i] - tz * s * 9.6, az = R.z[i] + tx * s * 9.6;
          arbresChateau.push([ax, az, pick(['chene', 'platane', 'chene']), sol(ax, az)]);
        }
      }
    }

    // la route du tour : petits pavés entre deux bordures ; l'allée et la cour du château, en gravier
    const anneau = (r0, r1, y, couleur, n = 96) => {
      const p = [];
      for (let k = 0; k < n; k++) {
        const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2;
        const P = (r, a) => [CH.x + Math.cos(a) * r, y, CH.z + Math.sin(a) * r];
        p.push(...P(r0, a0), ...P(r1, a1), ...P(r1, a0), ...P(r0, a0), ...P(r0, a1), ...P(r1, a1));
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.computeVertexNormals();
      return teinter(g, couleur);
    };
    surf.push(anneau(CH.tour - DEMI, CH.tour + DEMI, Y + 0.045, PAVES), anneau(CH.tour - DEMI - 0.22, CH.tour - DEMI, Y + 0.11, BORDURE), anneau(CH.tour + DEMI, CH.tour + DEMI + 0.22, Y + 0.11, BORDURE));
    plan.push({ t: 'o', x: CH.x, z: CH.z, r: CH.tour, c: '#b8ad98', w: 6 });
    for (const [x0, z0, x1, z1] of COUR) {
      const zz0 = Math.max(z0, -(CH.tour - DEMI - 0.1));
      surf.push(B(x1 - x0, 0.07, z1 - zz0, '#cfc1a0', CH.x + (x0 + x1) / 2, Y + 0.005, CH.z + (zz0 + z1) / 2));
      rect(CH.x + x0, CH.z + zz0, CH.x + x1, CH.z + z1, '#d9cba8');
    }

    /* -- le château (repère : x vers l'est, z vers le sud, y depuis le plateau) */
    const L = [], cols = [];
    const verre = () => (rnd() < 0.22 ? '#4a3a2a' : '#2f3c4f');
    // une grande croisée (meneau et traverse de pierre) dans un mur de normale z (f = ±1) ou x (axe 'x')
    const croisee = (x, y, z, f, w, h, axe = 'z') => {
      const X = axe === 'x';
      plaque(x + (X ? f * 0.006 : 0), y, z + (X ? 0 : f * 0.006), axe, f, w + 0.5, h + 0.5);
      const b = (bw, bh, ep, c, o, dy = 0) => L.push(X ? B(ep, bh, bw, c, x + f * o, y + dy, z) : B(bw, bh, ep, c, x, y + dy, z + f * o));
      b(w, h, 0.1, verre(), 0.03);
      b(0.13, h, 0.14, TAILLE, 0.06); b(w, 0.13, 0.14, TAILLE, 0.06, h * 0.2);
      b(w + 0.42, 0.13, 0.28, APPUI, 0.1, -h / 2 - 0.08);
    };
    // une tour ronde : fût, glacis, cordon de mâchicoulis, toit en poivrière, épi ; fenêtres tournées vers dirs
    const tour = (x, z, r, h, toitH, dirs, fen = true) => {
      L.push(C(r, r, h, 18, TUF, x, h / 2, z), C(r + 0.35, r + 0.55, 1.6, 18, '#b9a98b', x, 0.8, z));
      L.push(C(r + 0.42, r + 0.12, 0.7, 18, TAILLE, x, h - 0.35, z), C(r + 0.45, r + 0.45, 0.9, 18, TUF, x, h + 0.45, z));
      for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; L.push(B(0.22, 0.5, 0.3, TAILLE, x + Math.sin(a) * (r + 0.22), h - 0.85, z + Math.cos(a) * (r + 0.22), a)); }
      L.push(C(0, r + 0.75, toitH, 18, ARD, x, h + 0.9 + toitH / 2, z), C(0.05, 0.07, 1.8, 6, '#7a7f88', x, h + 0.9 + toitH + 0.6, z), S(0.16, '#c9a23a', x, h + 0.9 + toitH + 1.5, z));
      if (fen) for (const a of dirs) for (let y = 3.4; y < h - 2; y += 4) {
        const sx = Math.sin(a), sz = Math.cos(a);
        L.push(B(1.5, 2.2, 0.1, TAILLE, x + sx * (r + 0.02), y, z + sz * (r + 0.02), a), B(1.0, 1.7, 0.12, verre(), x + sx * (r + 0.05), y, z + sz * (r + 0.05), a));
      }
      cols.push([x - r, z - r, x + r, z + r]);
    };
    // corps de logis : 30 x 11 m, trois niveaux, toit d'ardoise à forte pente, bandeaux, croisées, lucarnes, cheminées
    L.push(B(30, 12.2, 11, TUF, 0, 6.1, 6), B(30.3, 0.9, 11.3, '#b9a98b', 0, 0.45, 6));
    for (const y of [4.3, 8.3]) L.push(B(30.16, 0.22, 11.16, APPUI, 0, y, 6));
    L.push(B(30.3, 0.36, 11.3, TAILLE, 0, 12.0, 6));
    L.push(...toit(30, 11, 9, ARD, 0, 12.2, 6, false, { mur: TUF, egout: 0.45 }));
    for (const x of [-12, -8, -4, 0, 4, 8, 12]) {
      croisee(x, 2.3, 11.5, 1, 1.35, 2.4); croisee(x, 6.3, 11.5, 1, 1.35, 2.3); croisee(x, 10.2, 11.5, 1, 1.25, 1.9);
      if (Math.abs(x) > 3) { croisee(x, 2.3, 0.5, -1, 1.35, 2.4); croisee(x, 6.3, 0.5, -1, 1.35, 2.3); croisee(x, 10.2, 0.5, -1, 1.25, 1.9); }
    }
    for (const z of [3.5, 7.5]) for (const s of [1, -1]) { croisee(s * 15, 6.3, z, s, 1.3, 2.3, 'x'); croisee(s * 15, 10.2, z, s, 1.2, 1.9, 'x'); }
    // lucarnes à fronton, montées dans le plan de la façade, et leurs pinacles
    for (const [x, f] of [[-12, 1], [-4, 1], [4, 1], [12, 1], [-8, -1], [8, -1]]) {
      const z = f > 0 ? 11.3 : 0.7, zc = z - f * 1.1;
      L.push(B(2.1, 3.3, 2.2, TUF, x, 13.75, zc));
      L.push(...toit(2.2, 2.4, 1.3, ARD, x, 15.4, zc, true, { mur: TUF, egout: 0.12, rive: 0.14, ep: 0.12 }));
      L.push(B(1.2, 1.8, 0.1, verre(), x, 13.7, z + f * 0.06), B(1.7, 2.4, 0.08, TAILLE, x, 13.75, z + f * 0.035));
      for (const s of [1, -1]) L.push(C(0.05, 0.13, 1.3, 6, TAILLE, x + s * 1.1, 16.1, z), S(0.09, TAILLE, x + s * 1.1, 16.8, z));
    }
    // hautes cheminées sculptées sur le faîtage et aux pignons
    for (const [x, hc] of [[-9, 5.8], [9, 5.8], [-14, 4.6], [14, 4.6]]) {
      const yb = 12.2 + 9 * (Math.abs(x) > 13 ? 0.75 : 1);
      L.push(B(1.5, hc, 0.95, TUF, x, yb + hc / 2 - 1, 6), B(1.62, 0.18, 1.07, TAILLE, x, yb + hc * 0.55, 6), B(1.85, 0.3, 1.3, TAILLE, x, yb + hc - 0.85, 6));
      for (const dx of [-0.36, 0.36]) L.push(C(0.17, 0.2, 0.55, 8, '#9a5a3e', x + dx, yb + hc - 0.45, 6));
    }
    cols.push([-15, 0.5, 15, 11.5]);
    // les deux grosses tours du sud ; les ailes et leurs tours ; la tour d'escalier sur la cour
    tour(-15, 11.5, 3.9, 17.5, 10, [Math.PI * 1.75, Math.PI, Math.PI * 1.5]);
    tour(15, 11.5, 3.9, 17.5, 10, [Math.PI * 0.25, 0, Math.PI * 0.5]);
    for (const s of [1, -1]) {
      const xc = s * 12.5;
      L.push(B(5, 9.6, 14.5, TUF, xc, 4.8, -6.75), B(5.3, 0.9, 14.8, '#b9a98b', xc, 0.45, -6.75), B(5.16, 0.22, 14.66, APPUI, xc, 4.3, -6.75), B(5.3, 0.32, 14.8, TAILLE, xc, 9.45, -6.75));
      L.push(...toit(5, 14.5, 4.8, ARD, xc, 9.6, -6.75, true, { mur: TUF, egout: 0.35 }));
      for (const z of [-11, -7, -3]) {
        croisee(xc + s * 2.5, 2.3, z, s, 1.25, 2.3, 'x'); croisee(xc + s * 2.5, 6.4, z, s, 1.25, 2.2, 'x');
        croisee(xc - s * 2.5, 2.3, z, -s, 1.25, 2.3, 'x'); croisee(xc - s * 2.5, 6.4, z, -s, 1.25, 2.2, 'x');
      }
      cols.push(s > 0 ? [10, -14, 15, 0.5] : [-15, -14, -10, 0.5]);
      tour(xc, -14.5, 2.5, 12.5, 7, [Math.PI, s * Math.PI / 2]);
      L.push(C(0.05, 0.05, 2.6, 5, '#ddd', xc, 21.2, -14.5));
    }
    L.push(B(0.05, 0.9, 1.4, '#2b4ea2', 12.5, 22.0, -13.75 + 0.05), B(0.05, 0.9, 0.0001, '#2b4ea2', 12.5, 22.0, -13.0)); // un fanion bleu au sommet
    // tour d'escalier octogonale, au milieu de la façade sur cour ; sa porte
    L.push(C(2.7, 2.7, 15.8, 8, TUF, 0, 7.9, 0.0), C(2.8, 2.8, 0.3, 8, TAILLE, 0, 15.8, 0.0), C(0, 3.15, 6, 8, ARD, 0, 18.95, 0.0), C(0.05, 0.07, 1.6, 6, '#7a7f88', 0, 22.6, 0));
    for (const y of [4.6, 8.1, 11.6]) L.push(B(0.9, 1.5, 0.1, TAILLE, 0, y, -2.63), B(0.6, 1.2, 0.12, verre(), 0, y, -2.66));
    L.push(B(1.9, 3.1, 0.12, TAILLE, 0, 1.55, -2.61), B(1.35, 2.6, 0.14, '#5b3a2a', 0, 1.3, -2.66));
    cols.push([-2.7, -2.7, 2.7, 0.5]);
    // le châtelet d'entrée et le mur qui ferme la cour
    for (const s of [1, -1]) {
      tour(s * 3.3, -14.8, 1.75, 8.2, 5, [Math.PI], false);
      L.push(B(5.0, 3.3, 0.7, '#cdbf9f', s * 7.55, 1.65, -14.05), B(5.1, 0.18, 0.86, APPUI, s * 7.55, 3.38, -14.05));
      cols.push(s > 0 ? [5.05, -14.4, 10, -13.7] : [-10, -14.4, -5.05, -13.7]);
      L.push(B(0.14, 4.0, 1.4, '#5b3a2a', s * 1.5, 2.0, -14.1)); // les vantaux, ouverts contre le passage
    }
    L.push(B(4.8, 2.6, 1.7, TUF, 0, 5.9, -14.8), B(5.0, 0.3, 1.9, TAILLE, 0, 7.3, -14.8), B(3.3, 0.35, 1.5, TAILLE, 0, 4.55, -14.8));
    L.push(...toit(4.8, 1.7, 1.2, ARD, 0, 7.2, -14.8, false, { mur: TUF, egout: 0.2 }));
    // jardins à la française : un parterre de buis au sud (bassin rond, jet d'eau), deux à l'est et à l'ouest ; des ifs
    // taillés en cône ; le mur de clôture le long de la route du tour, ouvert devant l'allée
    const BUIS = '#4d6a34', IF = '#3f5c3c', haie = (x, z, w, d) => L.push(teinter(B(w, 0.55, d, BUIS, x, 0.27, z), BUIS, T.feuillage));
    const parterre = (x0, z0, x1, z1) => {
      const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      haie(cx, z0, w, 0.45); haie(cx, z1, w, 0.45); haie(x0, cz, 0.45, d); haie(x1, cz, 0.45, d);
      haie(cx, cz, w - 3, 0.45); haie(cx, cz, 0.45, d - 3);
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) L.push(teinter(C(0, 0.55, 2.3, 8, IF, x, 1.35, z), IF, T.feuillage), C(0.25, 0.3, 0.2, 8, '#6b4a30', x, 0.1, z));
    };
    parterre(-12, 17.5, -2, 25); parterre(2, 17.5, 12, 25); parterre(19.5, -8, 25.5, 8); parterre(-25.5, -8, -19.5, 8);
    L.push(C(2.2, 2.3, 0.6, 20, APPUI, 0, 0.3, 21.2), C(1.95, 1.95, 0.1, 20, '#4f93b8', 0, 0.52, 21.2), C(0.18, 0.28, 1.6, 8, APPUI, 0, 1.0, 21.2), S(0.32, APPUI, 0, 1.9, 21.2));
    cols.push([-2.3, 18.9, 2.3, 23.5]);
    for (let k = 0; k < 64; k++) {
      const a = (k + 0.5) / 64 * Math.PI * 2, x = Math.cos(a) * 28.4, z = Math.sin(a) * 28.4;
      if (Math.abs(x) < 4.4 && z < 0) continue; // l'allée
      L.push(B(2.85, 0.95, 0.45, '#cdbf9f', x, 0.47, z, Math.PI / 2 - a), B(2.9, 0.1, 0.55, APPUI, x, 1.0, z, Math.PI / 2 - a));
    }
    for (const s of [1, -1]) L.push(B(0.8, 2.2, 0.8, TUF, s * 4.4, 1.1, -28.2), S(0.32, TAILLE, s * 4.4, 2.45, -28.2)); // piliers du portail
    finirPlaques(L);
    poser(L, CH.x, CH.z, 0, bati, Y);
    for (const [x0, z0, x1, z1] of cols) {
      col.boite(CH.x + x0, CH.z + z0, CH.x + x1, CH.z + z1).haut = true;
      plan.push({ t: 'b', x0: CH.x + x0, z0: CH.z + z0, x1: CH.x + x1, z1: CH.z + z1 });
    }
    contact.jupe(CH.x - 15.07, CH.z + 0.43, CH.x + 15.07, CH.z + 11.57, 1.7, 0.5, Y + 0.06);

    /* -- le village : des maisons tout autour de la route du tour, tournées vers le château, sauf à l'arrivée de la
       route et au belvédère ; entre elles, des murs de jardin ; des réverbères */
    const RF = CH.tour + 6.8; // les façades
    const libre = (a, demi) => {
      for (const t of [-demi, 0, demi]) {
        const x = CH.x + Math.cos(a + t / RF) * (RF + 2), z = CH.z + Math.sin(a + t / RF) * (RF + 2);
        if (procheRoute(x, z, 12).d < 9.5) return false;
      }
      return Math.abs(angle(a - Math.PI / 4)) > 0.34; // le belvédère, au sud-est
    };
    let a = -Math.PI / 2 + 0.05, n = 0;
    while (a < Math.PI * 1.5 - 0.05) {
      const w = 8 + Math.floor(rnd() * 5), d = 7.5 + rnd() * 1.5, h = 5.8 + rnd() * 1.8, dem = w / 2 + 0.4;
      const ac = a + dem / RF;
      if (!libre(ac, dem)) { a += 0.06; continue; }
      const r = RF + d / 2, x = CH.x + Math.cos(ac) * r, z = CH.z + Math.sin(ac) * r;
      const genre = n % 3, rot = Math.atan2(-Math.cos(ac), -Math.sin(ac));
      maison({
        x, z, y: Y, w, d, h, rot, sansCol: true, volets: genre === 1 ? null : pick(VOLETS),
        mur: genre === 1 ? pick(['#e6d4b0', '#ead9bb', '#e9d2a8']) : genre === 0 ? TUF : undefined,
        tourelle: genre === 0 && w >= 9, colombages: genre === 1, lucarnes: true,
      });
      // mur de jardin jusqu'à la maison suivante
      const ecart = 1.6 + rnd() * 2.2, a1 = ac + dem / RF, a2 = a1 + ecart / RF;
      const am = (a1 + a2) / 2, xm = CH.x + Math.cos(am) * (RF + 0.6), zm = CH.z + Math.sin(am) * (RF + 0.6);
      bati.push(B(ecart + 0.3, 1.9, 0.5, '#cdbf9f', xm, Y + 0.95, zm, Math.PI / 2 - am), B(ecart + 0.4, 0.12, 0.62, APPUI, xm, Y + 1.94, zm, Math.PI / 2 - am));
      a = a2; n++;
    }
    // réverbères sur le bas-côté, du côté des maisons
    for (let k = 0; k < 12; k++) {
      const b = k / 12 * Math.PI * 2 + 0.2, x = CH.x + Math.cos(b) * (CH.tour + 4.6), z = CH.z + Math.sin(b) * (CH.tour + 4.6);
      if (procheRoute(x, z, 8).d < 6.5) continue;
      bati.push(C(0.07, 0.1, 4.2, 6, '#2d2d33', x, Y + 2.1, z), B(0.34, 0.44, 0.34, '#ffe1a0', x, Y + 4.35, z), B(0.42, 0.06, 0.42, '#2d2d33', x, Y + 4.6, z));
      col.boiteC(x, z, 0.3, 0.3);
    }
    // le belvédère : une balustrade au bord du plateau, trois bancs tournés vers la vallée
    for (let k = -6; k <= 6; k++) {
      const b = Math.PI / 4 + k * 0.045, x = CH.x + Math.cos(b) * (CH.tour + 6.6), z = CH.z + Math.sin(b) * (CH.tour + 6.6);
      bati.push(B(0.3, 0.9, 0.3, APPUI, x, Y + 0.45, z), B(1.75, 0.14, 0.34, APPUI, x, Y + 0.95, z, Math.PI / 2 - b));
      if (k % 4 === 0) {
        const xb = CH.x + Math.cos(b) * (CH.tour + 5.1), zb = CH.z + Math.sin(b) * (CH.tour + 5.1), rb = Math.PI / 2 - b;
        bati.push(B(1.9, 0.1, 0.5, '#6b4a30', xb, Y + 0.48, zb, rb), B(0.1, 0.45, 0.5, '#2d2d33', xb + Math.cos(b + Math.PI / 2) * 0.8, Y + 0.22, zb + Math.sin(b + Math.PI / 2) * 0.8, rb), B(0.1, 0.45, 0.5, '#2d2d33', xb - Math.cos(b + Math.PI / 2) * 0.8, Y + 0.22, zb - Math.sin(b + Math.PI / 2) * 0.8, rb));
        col.boiteC(xb, zb, 1.2, 1.2);
      }
    }
    // quelques arbres dans les jardins, derrière les maisons
    for (let k = 0; k < 10; k++) {
      const b = rnd() * Math.PI * 2, r = CH.plateau + 2 + rnd() * 6, x = CH.x + Math.cos(b) * r, z = CH.z + Math.sin(b) * r;
      if (procheRoute(x, z, 10).d > 8) arbresChateau.push([x, z, rnd() < 0.5 ? 'chene' : 'cedre', sol(x, z)]);
    }
    const ms = new THREE.Mesh(fusion(surf), MAT);
    ms.receiveShadow = true; ms.renderOrder = ORDRE.sol; ms.name = 'surfaces';
    scene.add(ms);
    rnd = rndMonde;
  }
  chateau();

  /* ------------------------------------------------------------ arbres
     Fusionnés avec le décor de leur quartier (aucun appel de dessin en plus) ; le feuillage porte
     un poids de vent par sommet, plus fort en haut. */
  {
    const arbres = [...arbresChateau]; // [x, z, type, y]
    for (let x = -170; x < -14; x += 9) if (Math.abs(x + 90) > 6) arbres.push([x + rnd() * 2, -3.5, 'peuplier']);
    for (let x = 26; x <= 152; x += 12) if (x < 86 || x > 104) { arbres.push([x, 4.6, 'platane']); arbres.push([x + 6, 15.4, 'platane']); }
    for (const z of [-57, -35]) arbres.push([79.5, z, 'platane']);
    for (const z of [-55, -47, -39]) arbres.push([111.5, z, 'platane']);
    for (const [x, z] of [[-6, -40], [-6, -80], [-45, -13], [-20, -16], [22, -14], [-128, 20], [-70, 19.5], [-20, 21], [-6, 60], [52, 70], [-110, -95], [-60, -10], [160, 22]]) arbres.push([x, z, 'chene']);
    arbres.push([-110, -45, 'cedre']);
    for (let i = 0; i < 300; i++) {
      const a = rnd() * Math.PI * 2, r = 205 + rnd() * 230, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(z - 10) < 28 || naturelle(x, z) < 3) continue; // (mêmes tirages qu'avant la route du château)
      const t = rnd() < 0.3 ? 'peuplier' : 'chene';
      if (!reserve(x, z)) arbres.push([x, z, t, sol(x, z)]);
    }
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Vector3(), axe = new THREE.Vector3(0, 1, 0), cc = new THREE.Color();
    // modèles construits une fois, puis copiés, recolorés et placés (bien plus rapide que de tout regénérer)
    const modele = { tronc: C(0.16, 0.26, 1, 6, '#ffffff', 0, 0.5, 0, 'y'), fe1: S(1, '#ffffff', 0, 0, 0, 1, 1, 1, 1), fe0: S(1, '#ffffff', 0, 0, 0, 1, 1, 1, 0) };
    for (const g of [modele.fe1, modele.fe0]) {
      const pf = g.attributes.position, poids = new Float32Array(pf.count);
      for (let i = 0; i < pf.count; i++) poids[i] = 0.25 + 0.75 * (pf.getY(i) + 1) / 2;
      g.setAttribute('aVent', new THREE.BufferAttribute(poids, 1));
      g.attributes.aMat.array.fill(T.feuillage);
    }
    modele.tronc.attributes.aMat.array.fill(T.bois);
    const copie = (g, couleur) => {
      const n = g.clone(), a = n.attributes.color.array;
      cc.set(couleur);
      for (let i = 0; i < a.length; i += 3) { a[i] = cc.r; a[i + 1] = cc.g; a[i + 2] = cc.b; }
      return n;
    };
    const FEU = {
      platane: ['#b9a23c', '#c9a845', '#a3a240', '#cf9d3e'], peuplier: ['#e0b53c', '#d9a733', '#e8c450'],
      chene: ['#6f8a3a', '#8a8f3a', '#a6823a', '#5d7a36', '#b0773a'], cedre: ['#3f5c3c'],
    };
    for (const [x, z, t, y = 0] of arbres) {
      const k = 0.85 + rnd() * 0.35;
      const [th, fy, fx, fyS] = t === 'peuplier' ? [5.5, 8.2, 1.3, 4.2] : t === 'platane' ? [3.6, 5.6, 2.7, 2.1] : t === 'cedre' ? [3, 6, 4.2, 2.6] : [2.8, 4.6, 2.6, 2.2];
      q.setFromAxisAngle(axe, rnd() * 6.28);
      const tr = copie(modele.tronc, t === 'platane' ? '#a99a7c' : '#6a5441');
      tr.applyMatrix4(m.compose(p.set(x, y, z), q, e.set(k * (t === 'cedre' ? 1.8 : 1), th * k, k * (t === 'cedre' ? 1.8 : 1))));
      const fe = copie(y ? modele.fe0 : modele.fe1, pick(FEU[t]));
      fe.applyMatrix4(m.compose(p.set(x, y + fy * k, z), q, e.set(fx * k, fyS * k, fx * k * (0.9 + rnd() * 0.2))));
      bati.push(tr, fe);
      if (y === 0) {
        col.boiteC(x, z, 0.6 * k, 0.6 * k);
        plan.push({ t: 'a', x, z, r: fx * k });
        contact.tache(x, z, fx * k * 0.8, fx * k * 0.8, 0.3);
      }
    }
  }

  /* ------------------------------------------------------------ détails : poteaux et fils, herbes hautes, panneaux, balles de foin */
  // poteaux électriques en bois le long de la départementale, avec trois fils qui pendent
  {
    const poteaux = [];
    for (let x = -178; x <= 178; x += 32) poteaux.push(x + (rnd() - 0.5) * 3);
    const fils = [];
    poteaux.forEach((x, i) => {
      bati.push(C(0.1, 0.14, 8.6, 6, '#6e5a44', x, 4.3, 18), B(1.5, 0.1, 0.1, '#5e4a36', x, 8.0, 18));
      for (const dx of [-0.6, 0, 0.6]) bati.push(C(0.035, 0.05, 0.16, 6, '#e8e4dc', x + dx, 8.13, 18));
      col.boiteC(x, 18, 0.3, 0.3);
      if (i) {
        const x0 = poteaux[i - 1];
        for (const dx of [-0.6, 0, 0.6]) for (let k = 0; k < 10; k++) {
          const t0 = k / 10, t1 = (k + 1) / 10, sag = t => 0.7 * 4 * t * (1 - t);
          fils.push(x0 + dx + (x - x0) * t0, 8.2 - sag(t0), 18, x0 + dx + (x - x0) * t1, 8.2 - sag(t1), 18);
        }
      }
    });
    const gf = new THREE.BufferGeometry();
    gf.setAttribute('position', new THREE.Float32BufferAttribute(fils, 3));
    scene.add(new THREE.LineSegments(gf, new THREE.LineBasicMaterial({ color: '#2b2622' })));
  }
  // réverbères le long de la rue du bourg
  for (const x of [32, 56, 80, 116, 140]) {
    bati.push(C(0.07, 0.1, 4.6, 6, '#2d2d33', x, 2.3, 2.9), B(0.12, 0.08, 1.1, '#2d2d33', x, 4.6, 3.4), B(0.34, 0.22, 0.34, '#ffe1a0', x, 4.45, 3.9));
    col.boiteC(x, 2.9, 0.3, 0.3);
  }
  // poubelles devant quelques maisons
  for (const [x, z] of [[40.5, 2.2], [63, 2.2], [119, 2.2], [52, 17.8], [96.5, 17.8], [134, 17.8]]) {
    bati.push(B(0.58, 0.95, 0.68, '#3d5a4a', x, 0.48, z), B(0.62, 0.06, 0.74, '#2f4a3c', x, 0.98, z));
    col.boiteC(x, z, 0.6, 0.7);
    contact.tache(x, z, 0.6, 0.65, 0.3, 0.1);
  }
  // balles de foin rondes sur les champs des collines
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, r = 215 + rnd() * 170, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(z - 10) < 30 || naturelle(x, z) < 2) continue;
    const rot = rnd() * 6.28;
    if (!reserve(x, z, 4)) bati.push(C(0.78, 0.78, 1.25, 12, '#d6b058', x, sol(x, z) + 0.72, z, 'z', rot));
  }

  // panneaux routiers (dessinés en code dans l'atlas, transparents autour de la forme)
  function panneau(dessin, w, h, x, y, z, rot, poteau = true) {
    const W = 256, H = Math.round(256 * h / w);
    atlas.poser(W, H, dessin, w, h, x, y, z, rot);
    bati.push(teinter(new THREE.PlaneGeometry(w * 0.96, h * 0.96).rotateY(rot + Math.PI).translate(x - Math.sin(rot) * 0.02, y, z - Math.cos(rot) * 0.02), '#8d9196'));
    if (poteau) { bati.push(C(0.04, 0.04, y, 6, '#b9bcc2', x - Math.sin(rot) * 0.04, y / 2, z - Math.cos(rot) * 0.04)); col.boiteC(x, z, 0.15, 0.15); }
  }
  // panneau de direction : une flèche blanche cerclée de noir, le nom du lieu (taille de la police en pixels)
  const direction = (texte, px) => (c, W, H) => {
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, H / 2); c.lineTo(H / 2, 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(H / 2, H); c.closePath(); c.fill();
    c.strokeStyle = '#1d1d1d'; c.lineWidth = 5; c.stroke();
    c.fillStyle = '#1d1d1d'; c.font = `bold ${px}px Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(texte, W / 2 + 18, H / 2 + 2);
  };
  const octo = (c, W, H, fond) => { c.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; c.lineTo(W / 2 + Math.cos(a) * W / 2 * 0.98, H / 2 + Math.sin(a) * H / 2 * 0.98); } c.closePath(); c.fillStyle = fond; c.fill(); };
  panneau((c, W, H) => { octo(c, W, H, '#fff'); c.save(); c.translate(W * 0.04, H * 0.04); c.scale(0.92, 0.92); octo(c, W, H, '#c8202a'); c.restore(); c.fillStyle = '#fff'; c.font = 'bold 78px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('STOP', W / 2, H / 2 + 4); }, 0.8, 0.8, 91.7, 2.2, 5.2, Math.PI);
  panneau((c, W, H) => { c.beginPath(); c.arc(W / 2, H / 2, W / 2 - 2, 0, 7); c.fillStyle = '#c8202a'; c.fill(); c.beginPath(); c.arc(W / 2, H / 2, W / 2 - 30, 0, 7); c.fillStyle = '#fff'; c.fill(); c.fillStyle = '#111'; c.font = 'bold 110px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('50', W / 2, H / 2 + 6); }, 0.7, 0.7, 24, 2.2, 16.6, -Math.PI / 2);
  panneau(direction('Domaine du Clos Libre', 30), 2.2, 0.36, -86.2, 2.0, 5.6, 0);
  panneau(direction('Château', 34), 1.5, 0.34, -172.2, 2.0, 5.6, 0); // à l'embranchement de la route du château
  const moulin = hameau();
  const enseignes = atlas.maillage();
  scene.add(enseignes);
  if (atlas.lumineux) scene.add(atlas.lumineux);
  // les vitres des boutiques, transparentes (un seul maillage)
  if (vitresB.length) { const vb = new THREE.Mesh(fusion(vitresB), MAT_VITRINE); vb.renderOrder = 3; vb.name = 'vitrines'; scene.add(vb); }

  bati.ajouter(scene, true, porteurs);
  proches.ajouter(scene, false, porteurs); // les marchandises des vitrines : seulement de près (maj)
  const ao = contact.maillage();
  scene.add(ao);

  // herbes hautes, en touffes, partout où l'herbe est libre ; rangées par cases de 48 m
  // pour n'afficher que celles qui sont proches (au loin, elles ne feraient que scintiller)
  const herbes = [];
  {
    const libre = (x, z) => {
      if (Math.abs(x) > 183 || Math.abs(z) > 183) return false;
      if (Math.abs(z - 10) < 4.6) return false;
      for (const [x0, z0, x1, z1] of PARCELLES) if (x > x0 - 0.8 && x < x1 + 0.8 && z > z0 - 0.8 && z < z1 + 0.8) return false;
      const zones = [[91, -84, 99, 10], [-93, -36, -87, 7], [-117, -74, -60, -32], [74, -65, 116, -27], [86, -84, 104, -71], [24, 2, 156, 18.4], [114, -65, 128, -54]];
      for (const [x0, z0, x1, z1] of zones) if (x > x0 && x < x1 && z > z0 && z < z1) return false;
      return !col.dedans(x, z) && !col.dedans(x + 0.8, z) && !col.dedans(x - 0.8, z) && !col.dedans(x, z + 0.8) && !col.dedans(x, z - 0.8);
    };
    const pos = [];
    for (let i = 0; i < 11000 && pos.length < 5000; i++) {
      // en grappes : près d'un point précédent une fois sur deux
      let x, z;
      if (pos.length && rnd() < 0.55) { const p = pos[Math.floor(rnd() * pos.length)]; x = p[0] + (rnd() - 0.5) * 3; z = p[1] + (rnd() - 0.5) * 3; }
      else { x = (rnd() - 0.5) * 366; z = (rnd() - 0.5) * 366; }
      if (libre(x, z)) pos.push([x, z]);
    }
    // une touffe : cinq brins, un triangle chacun (au lieu de cinq cônes)
    const P = [];
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 + 0.4, h = 0.36 + (k % 2) * 0.16, w = 0.045, cx = Math.cos(a) * 0.05, cz = Math.sin(a) * 0.05;
      P.push(cx + Math.sin(a) * w, 0, cz - Math.cos(a) * w, cx - Math.sin(a) * w, 0, cz + Math.cos(a) * w, cx + Math.cos(a) * 0.14, h, cz + Math.sin(a) * 0.14);
    }
    const gT = new THREE.BufferGeometry();
    gT.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gT.computeVertexNormals();
    const matH = matiere(T.feuillage, null, false, { vent: [0.1, 0.0, 0.52, 2.4] });
    matH.side = THREE.DoubleSide;
    const cases = new Map();
    // pas d'herbe sur le chemin des Grands Champs ni sur leur placette (filtrées après coup : le tirage reste le même)
    for (let i = pos.length - 1; i >= 0; i--) { const [x, z] = pos[i]; if ((Math.abs(x + 55) < 3 && z > 11 && z < 126) || (x > -70 && x < -42 && z > 123 && z < 143)) pos.splice(i, 1); }
    for (const [x, z] of pos) { const k = Math.floor(x / 48) + ',' + Math.floor(z / 48); if (!cases.has(k)) cases.set(k, []); cases.get(k).push(x, z); }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Vector3(), pv = new THREE.Vector3(), c = new THREE.Color(), axe = new THREE.Vector3(0, 1, 0);
    const TEINTES = ['#7f9a3e', '#94a845', '#a9a24a', '#6f8a3a', '#b8a050', '#c2a85a'].map(h => new THREE.Color(h));
    for (const l of cases.values()) {
      const n = l.length / 2, im = new THREE.InstancedMesh(gT, matH, n);
      let sx = 0, sz = 0;
      for (let i = 0; i < n; i++) {
        const x = l[i * 2], z = l[i * 2 + 1], k = 0.7 + rnd() * 0.8;
        sx += x; sz += z;
        q.setFromAxisAngle(axe, rnd() * 6.28);
        m.compose(pv.set(x, 0, z), q, e.set(k, k * (0.8 + rnd() * 0.5), k));
        im.setMatrixAt(i, m); im.setColorAt(i, c.copy(pick(TEINTES)));
      }
      im.receiveShadow = true; im.renderOrder = ORDRE.herbe; im.name = 'herbe'; im.computeBoundingSphere();
      scene.add(im);
      herbes.push({ im, n, x: sx / n, z: sz / n });
    }
  }

  // Cailloux en relief sur la cour et le chemin du domaine (le gravier est peint dans le shader : tCailloux) : de petits
  // octaèdres aplatis, en instances rangées par cases de 48 m, comptés et affichés de près comme les herbes. Leur
  // propre tirage au sort : le reste du monde ne bouge pas.
  {
    const r = hasard(97), gC = new THREE.OctahedronGeometry(1, 0), matC = matiere(T.gravier, null, false);
    const TEINTES = ['#d4c7a8', '#e2d8c0', '#bfb092', '#ece4d0', '#a99c84', '#d8c49c'].map(h => new THREE.Color(h));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), pv = new THREE.Vector3(), c = new THREE.Color();
    const cases = new Map();
    const semer = (x0, z0, x1, z1, n) => {
      for (let i = 0; i < n; i++) {
        const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
        if (col.dedans(x, z)) continue;
        const k = Math.floor(x / 48) + ',' + Math.floor(z / 48);
        if (!cases.has(k)) cases.set(k, []);
        cases.get(k).push(x, z);
      }
    };
    semer(-115, -72, -62, -34, 1700); // la cour
    semer(-91.8, -34, -88.2, 6.5, 110); // le chemin du domaine
    for (const l of cases.values()) {
      const n = l.length / 2, im = new THREE.InstancedMesh(gC, matC, n);
      let sx = 0, sz = 0;
      for (let i = 0; i < n; i++) {
        const x = l[i * 2], z = l[i * 2 + 1], t = 0.02 + 0.045 * r() * r();
        sx += x; sz += z;
        q.setFromEuler(e.set((r() - 0.5) * 0.5, r() * 6.28, (r() - 0.5) * 0.5));
        m.compose(pv.set(x, 0.028, z), q, s.set(t * (0.8 + 0.6 * r()), t * (0.45 + 0.3 * r()), t * (0.8 + 0.6 * r())));
        im.setMatrixAt(i, m); im.setColorAt(i, c.copy(TEINTES[Math.floor(r() * TEINTES.length)]));
      }
      im.receiveShadow = true; im.renderOrder = ORDRE.sol; im.name = 'cailloux'; im.computeBoundingSphere();
      scene.add(im);
      herbes.push({ im, n, x: sx / n, z: sz / n });
    }
  }

  /* ------------------------------------------------------------ mini-carte */
  const carte = document.createElement('canvas');
  carte.width = carte.height = (CARTE0 + 200) * ECH;
  {
    const c = carte.getContext('2d');
    const X = x => (x + CARTE0) * ECH, Z = z => (z + CARTE0) * ECH;
    c.fillStyle = '#86a04e'; c.fillRect(0, 0, carte.width, carte.height);
    for (const e of plan) {
      if (e.t === 'r') { c.fillStyle = e.c; c.fillRect(X(e.x0), Z(e.z0), (e.x1 - e.x0) * ECH, (e.z1 - e.z0) * ECH); }
      else if (e.t === 'rangs') {
        c.strokeStyle = e.c; c.lineWidth = 1.2; c.beginPath();
        for (let k = 0; k < e.q.n; k++) { const x = X(e.q.xr + k * e.q.ecart); c.moveTo(x, Z(e.q.zr0)); c.lineTo(x, Z(e.q.zr1)); }
        c.stroke();
      }
    }
    c.fillStyle = 'rgba(70,95,45,.9)';
    for (const e of plan) if (e.t === 'a') { c.beginPath(); c.arc(X(e.x), Z(e.z), Math.max(2, e.r * ECH * 0.8), 0, 7); c.fill(); }
    for (const e of plan) if (e.t === 'b') {
      c.fillStyle = '#efe4cb'; c.fillRect(X(e.x0), Z(e.z0), (e.x1 - e.x0) * ECH, (e.z1 - e.z0) * ECH);
      c.strokeStyle = '#7d6e58'; c.lineWidth = 1.5; c.strokeRect(X(e.x0), Z(e.z0), (e.x1 - e.x0) * ECH, (e.z1 - e.z0) * ECH);
    }
    c.fillStyle = 'rgba(40,60,30,.55)';
    const L = 186;
    c.fillRect(0, 0, carte.width, X(-L)); c.fillRect(0, X(L), carte.width, carte.height);
    c.fillRect(0, X(-L), X(-L), X(L) - X(-L)); c.fillRect(X(L), X(-L), carte.width, X(L) - X(-L));
    // hors de la zone de jeu, ce qu'on peut atteindre reste clair : la route du château, la route du tour, le château, les
    // maisons du village
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const e of plan) if (e.t === 'l') { c.strokeStyle = e.c; c.lineWidth = e.w * ECH; c.beginPath(); e.pts.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z)))); c.stroke(); }
    for (const e of plan) if (e.t === 'o') { c.strokeStyle = e.c; c.lineWidth = e.w * ECH; c.beginPath(); c.arc(X(e.x), Z(e.z), e.r * ECH, 0, 7); c.stroke(); }
    for (const e of plan) if (e.t === 'p' || (e.t === 'b' && (e.x1 < -L || e.z1 < -L))) {
      const P = e.t === 'p' ? e.pts : [[e.x0, e.z0], [e.x1, e.z0], [e.x1, e.z1], [e.x0, e.z1]];
      c.fillStyle = '#efe4cb'; c.strokeStyle = '#7d6e58'; c.lineWidth = 1.5;
      c.beginPath(); P.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z)))); c.closePath(); c.fill(); c.stroke();
    }
  }

  const lieux = {
    depart: { x: -99, z: -55, h: 0 },
    // tracteur et van garés côte à côte à l'ouest de la cour, hors du passage entre le chai et le portail :
    // on choisit l'un ou l'autre pour la tournée
    tracteur: { x: -100, z: -42, h: Math.PI / 2 },
    van: { x: -108, z: -37.5, h: Math.PI / 2 },
    chai: { x: -82, z: -52 },
    // dans le chai : où le véhicule s'arrête pour charger, la sortie en marche arrière, la caméra de la halle
    chaiDedans: { x: -70.2, z: -52, h: Math.PI / 2 }, chaiSalle: { camera: { x: -70.6, y: 4.6, z: -40.6 }, centre: { x: -70.8, y: 1.0, z: -50.5 } },
    // les clients (les trois commandes, l'épicerie, l'auberge) : où ils attendent, où le véhicule s'arrête
    figurants: { cave: { x: 74.2, z: -43.6, h: Math.PI / 2 }, bar: { x: 84.5, z: -61.3, h: 0 }, treille: { x: 112.6, z: 3.1, h: 0 }, epicerie: { x: 83.6, z: 3.1, h: 0 }, auberge: { x: -49, z: 135.6, h: -Math.PI / 2 } },
    arrets: { cave: { x: 77.8, z: -46 }, bar: { x: 81.5, z: -57.2 }, treille: { x: 110.5, z: 9.4 }, epicerie: { x: 83, z: 9.4 }, auberge: { x: -53.2, z: 134.5 } },
    // le bureau du chai (au bout sud du chai) : devant la porte, dehors et dedans ; la chaise du portable ; la caméra de
    // la pièce. pc : là où l'on va au retour de tournée (devant la porte)
    pc: { x: -77.3, z: -60.6 },
    bureau: {
      dehors: { x: -76.75, z: -60.6 }, seuil: { x: -75.9, z: -60.6 }, dedans: { x: -74.9, z: -60.75 },
      zone: { x0: -75.7, z0: -64.7, x1: -71.2, z1: -59.6 },
      chaise: { x: -72.66, z: -62.6, h: Math.PI / 2 }, devant: { x: -73.2, z: -61.9 }, depot: { x: -71.5, y: 0.79, z: -63.3 },
      portable: { x: -71.72, y: 0.9, z: -62.6 }, camera: { x: -75.25, y: 2.4, z: -64.25 }, centre: { x: -73.3, y: 1.0, z: -61.8 },
      prise: { x: -73.55, y: 1.55, z: -62.05 }, // la caméra derrière l'épaule, au portable
    },
    // la palette des commandes du jour (dessus à 0,14 m)
    palette: { x: -71.4, z: -48.1, y: 0.14 },
    banc: { x: 86, z: -58.35, h: 0 },
    terrasse: terrasse.map(([x, z]) => ({ x: x - 0.75, z, h: Math.PI / 2 })),
    place: { x0: 79, z0: -60, x1: 111, z1: -33 },
    fontaine: { x: 95, y: 2.62, z: -46 },
    // le réseau des routes et chemins (reseau.js : l'itinéraire le plus court d'un point à un autre). La conduite assistée
    // (pilote.js) le suit sur la file de droite : dans le bourg, il évite la fontaine, le monument, les bancs.
    reseau: [
      [[-90, 10], [-90, -38], [-90, -44], [-87.5, -51.9], [-82.8, -58.4]], // l'allée du domaine, jusqu'à la sortie du chai
      [[-90, -38], [-84, -45], [-82.8, -54], [-81.4, -59.4]],              // la cour, jusqu'au bureau du chai
      [[-90, -38], [-87, -45], [-86.5, -50.6], [-82.5, -52]],              // la cour, jusqu'à la grande porte du chai
      [[-90, 10], [-55, 10], [95, 10], [110.5, 9.4]],                      // la départementale (l'épicerie, La Treille)
      [[95, 10], [95, -30]],                                               // la rue de la place, en montant
      // la boucle du bourg, à sens unique : la place, la Cave du Pressoir, le Bar Le Cep, et l'on redescend
      { sens: true, points: [[95, -30], [86, -40], [78, -46], [81.5, -56], [88, -53.5], [100.5, -53], [101, -40], [96, -27], [95, 8], [95, 10]] },
      [[-55, 10], [-55, 124], [-53.2, 134.5]],                             // le chemin des Grands Champs, jusqu'à l'auberge
      [[-84, -45], [-86.5, -56], [-86, -66]],                              // la cour, jusqu'à l'aire de remplissage
      ...CHEMINS,                                                          // les chemins de vigne, derrière le domaine
    ],
    route0: [-82.8, -58.4], // où l'on part en tournée : la sortie du chai (main.js, cheminSortie)
    // l'aire de remplissage du pulvérisateur (le tracteur s'y arrête, tourné vers le nord) ; les parcelles de vigne (q :
    // collisions.js parcelle, cep), dans l'ordre de PARCELLES
    aire: { x: -86, z: -66, h: Math.PI, cuve: { x: -90.2, z: -66.5 } }, parcelles: parcs,
    maison: { x: -100, z: -58.3 }, // devant la porte de la maison du domaine : on y rentre dormir (main.js)
    // du parking du domaine au chai (par le nord du tracteur garé)
    versChai: [[-92, -38], [-87, -45], [-86.5, -50.6], [-82.5, -52]],
  };
  lieux.portes = portes; // la porte de chaque client (clients.js) : { x, z, rot } devant le seuil, la façade tournée de rot
  lieux.garees = [[-105, -49, 0.5, '#e9e6de'], [118.5, -59.5, 0, '#5c6f8a'], [123, -59.5, 0, '#8a3a32'], [100.5, -77.5, Math.PI / 2, '#d8cfa6'], [-65.5, 131.5, 0.15, '#6c8f4e']];

  /* ------------------------------------------------------------ réglages selon la qualité, mise à jour par image */
  let herbeLoin = 70, vigneLoin = 60, parcelleLoin = 90, dernierX = 1e9, dernierZ = 1e9;
  function regler(q) {
    herbeLoin = q.herbe; vigneLoin = q.vigne; parcelleLoin = q.parcelle;
    for (const h of herbes) h.im.count = Math.max(1, Math.round(h.n * q.herbeN));
    ao.material.opacity = q.ombres ? 0.85 : 1;
    dernierX = 1e9;
  }
  // n'affiche que l'herbe proche, simplifie les vignes lointaines ; ne refait le tri que si la caméra a bougé de 2 m
  function maj(cx, cz) {
    if (Math.abs(cx - dernierX) + Math.abs(cz - dernierZ) < 2) return;
    dernierX = cx; dernierZ = cz;
    const d2 = (herbeLoin + 34) * (herbeLoin + 34), v2 = (vigneLoin + 21) * (vigneLoin + 21);
    for (const h of herbes) h.im.visible = (h.x - cx) * (h.x - cx) + (h.z - cz) * (h.z - cz) < d2;
    for (const m of proches.maillages) { const c = m.geometry.boundingSphere.center, r = m.geometry.boundingSphere.radius + 45; m.visible = (c.x - cx) * (c.x - cx) + (c.z - cz) * (c.z - cz) < r * r; }
    for (const p of vignes) {
      // distance de la caméra à la parcelle : au-delà, un seul maillage pour toute la parcelle
      const q = p.q, dx = Math.max(q.x0 - cx, 0, cx - q.x1), dz = Math.max(q.z0 - cz, 0, cz - q.z1), proche = dx * dx + dz * dz < parcelleLoin * parcelleLoin;
      p.loin.visible = !proche;
      for (const v of p.blocs) {
        v.im.visible = proche;
        if (proche) v.im.geometry = (v.x - cx) * (v.x - cx) + (v.z - cz) * (v.z - cz) < v2 ? vignes.fine : vignes.simple;
      }
    }
  }

  // Élagage fin de la passe d'ombre : ne garde que les blocs dont la boîte, vue depuis le soleil, touche
  // le cadre d'ombre (les sphères englobantes de three.js en laissent passer deux fois trop, soleil bas oblige)
  const LX = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SOLEIL).normalize(), LY = new THREE.Vector3().crossVectors(SOLEIL, LX);
  function ombres(t, b, bh) {
    for (const p of porteurs) {
      const dx = p.cx - t.x, dy = p.cy - t.y, dz = p.cz - t.z;
      const ru = p.hx * Math.abs(LX.x) + p.hz * Math.abs(LX.z), rv = p.hx * Math.abs(LY.x) + p.hy * Math.abs(LY.y) + p.hz * Math.abs(LY.z);
      p.obj.castShadow = Math.abs(dx * LX.x + dz * LX.z) < b + ru && Math.abs(dx * LY.x + dy * LY.y + dz * LY.z) < bh + rv;
    }
  }

  return { ciel, soleil: soleilL, hemi, carte, lieux, panneaux: [enseignes], nuages: ciel.children[1], regler, maj, ombres, nuit, porteBureau: chai.porte, interieurBureau: chai.interieur, porteChai: chai.porteChai, halleChai: chai.halle, moulin, vignes, traiter, retraiter };
}
