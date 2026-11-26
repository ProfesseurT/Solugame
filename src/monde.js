// Le monde : un village de la Loire, son domaine, ses vignes d'automne et les collines,
// à l'heure dorée. Tout est construit en code au chargement (aucun fichier à télécharger).
// Le décor fixe est fusionné par quartiers (et par secteurs au loin) : l'élagage hors champ
// et hors de la zone d'ombre ne dessine que ce qui sert.
import * as THREE from 'three';
import { B, C, S, toit, teinter, fusion, poser, deplacer, tournerY, indexer, definirInterieur, MAT_VITRINE, MAT, MAT_VENT, matiere, detailler, T, SOLEIL, GLSL_BRUME, UNI } from './modeles.js';
import { hasard, lisse, assombrir, bruit, hache, angle } from './outils.js';
import { Atelier, camion, figer } from './engins.js';
import { chariot } from './remorque.js';
import { SOLU, ENTREE, FENETRES, VITRINES, VITRINE, PORTE_ATELIER, PORTE_ATLAS, interieurSolumatic, panneauxSolumatic } from './solumatic.js';
import { logoSolumatic } from './logo.js';
import { naturelle, forme, sol, avantRoute, procheRoute, ZONE, GRILLE, FIN, ROUTE as TRACE, CHATEAU, COUR, DEMI, VERGE, reserve, dansZA, ZA } from './relief.js';

export { SOLEIL };
export const BRUME = '#efb68a';
export const ECH = 1.5; // pixels par mètre sur le fond de la mini-carte
export const CARTE0 = 380, CARTE1 = 260; // le fond de la mini-carte va de -380 à 260 m (x et z) : la zone de jeu, la route du château, la zone d'activités
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
// placées et dessinées à la fin : de la plus haute à la plus basse, en rangées (peu de vide), le canevas créé à la hauteur
// exacte (rien de vide en mémoire graphique ; il reste loin des 4 096 pixels qu'acceptent bien des téléphones).
class Atlas {
  constructor() { this.geos = []; this.geosL = []; this.cases = []; }
  // réserve une case w x h (pixels) pour un dessin ; place un rectangle w3 x h3 (mètres) dans le monde. lumineux : sans
  // éclairage ni ombre (l'intérieur allumé d'une boutique)
  poser(w, h, dessin, w3, h3, x, y, z, rot, lumineux = false) {
    const g = new THREE.PlaneGeometry(w3, h3);
    g.rotateY(rot); g.translate(x, y, z);
    (lumineux ? this.geosL : this.geos).push(g);
    const k = { w, h, dessin, g, copies: [] };
    this.cases.push(k);
    return k;
  }
  // Un autre rectangle du monde (g : une géométrie de plan, déjà posée) qui montre la même case k, ou la bande [u0, u1] de
  // sa largeur : un panneau répété, le dos d'un drapeau, les chiffres d'une marelle (l'école) ; rien de plus dans l'atlas
  copie(k, g, u0 = 0, u1 = 1) { this.geos.push(g); k.copies.push({ g, u0, u1 }); }
  maillage() {
    // le rangement « en ligne d'horizon » : les cases de la plus large à la plus étroite, chacune posée là où son haut monte
    // le moins (puis le plus à gauche), à 4 pixels de ses voisines ; ciel : le dessus de ce qui est déjà posé, en segments.
    // (2 410 pixels de haut au lieu de 3 990 en rangées dans l'ordre d'arrivée ; 2 080 au mieux)
    let ciel = [{ x: 0, y: 0, w: 1024 }], H = 0;
    for (const k of [...this.cases].sort((a, b) => b.w - a.w || b.h - a.h)) {
      let mieux = null;
      for (let i = 0; i < ciel.length && ciel[i].x + k.w <= 1024; i++) {
        let y = 0;
        for (let j = i, reste = k.w; reste > 0; j++) { y = Math.max(y, ciel[j].y); reste -= ciel[j].w; }
        if (!mieux || y < mieux.y) mieux = { x: ciel[i].x, y };
      }
      k.px = mieux.x; k.py = mieux.y; H = Math.max(H, mieux.y + k.h);
      const x0 = mieux.x, x1 = Math.min(1024, x0 + k.w + 4), neuf = [];
      for (const q of ciel) {
        if (q.x + q.w <= x0 || q.x >= x1) { neuf.push(q); continue; }
        if (q.x < x0) neuf.push({ x: q.x, y: q.y, w: x0 - q.x });
        if (q.x <= x0) neuf.push({ x: x0, y: mieux.y + k.h + 4, w: x1 - x0 });
        if (q.x + q.w > x1) neuf.push({ x: x1, y: q.y, w: q.x + q.w - x1 });
      }
      ciel = neuf.filter((q, i) => q.w > 0).reduce((l, q) => { const d = l[l.length - 1]; if (d && d.y === q.y) d.w += q.w; else l.push({ ...q }); return l; }, []);
    }
    H = Math.ceil((H + 1) / 4) * 4;
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = H;
    const c = cv.getContext('2d');
    for (const { px, py, w, h, dessin, g, copies } of this.cases) {
      c.save(); c.translate(px, py); c.beginPath(); c.rect(0, 0, w, h); c.clip(); dessin(c, w, h); c.restore();
      for (const { g: gc, u0, u1 } of [{ g, u0: 0, u1: 1 }, ...copies]) {
        const uv = gc.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (px + (u0 + uv.getX(i) * (u1 - u0)) * w) / 1024, 1 - (py + (1 - uv.getY(i)) * h) / H);
      }
    }
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
      // de l'herbe dans la zone de jeu et dans la zone d'activités (ses pelouses, ses bas-côtés), des champs ailleurs
      const pre = Math.hypot(x, z) < 200 || dansZA(x, z, 6);
      if (pre) c.copy(herbes[Math.floor(hache(Math.floor(x / 13), Math.floor(z / 13)) * herbes.length)]);
      else c.copy(champs[Math.floor(hache(Math.floor(x / 55) + 7, Math.floor(z / 48) - 3) * champs.length)]);
      for (let k = 0; k < 3; k++) { cols[(i + k) * 3] = c.r; cols[(i + k) * 3 + 1] = c.g; cols[(i + k) * 3 + 2] = c.b; types[i + k] = pre ? T.herbe : T.champ; }
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
  // Les maisons de la route du château (Teddy, 24/11/2026 : « ajoute des maisons sur la route ») : de place en place,
  // d'un côté puis de l'autre, en retrait de la route et face à elle, là où le sol est presque plat sous la maison et à
  // hauteur de la chaussée (ni sur un remblai, ni contre un déblai, loin des lacets). Choisies avant le terrain (des prés
  // autour d'elles, pas de champ, ni d'arbre des collines) ; bâties avec le château (chateau). Leur propre tirage au sort.
  // (les parcelles de vigne : x0, z0, x1, z1, cépage ; plantées plus bas)
  const PARCELLES = [
    [-165, -110, -125, -20, 'chenin'], [-58, -110, -12, -25, 'cabernet'], [0, -110, 50, -25, 'chenin'],
    [145, -110, 178, -10, 'cabernet'], [-160, 25, -112, 100, 'chenin'], [-106, 25, -60, 100, 'cabernet'],
    [-50, 30, -8, 108, 'cabernet'], [-2, 30, 36, 108, 'chenin'], [60, 34, 172, 110, 'cabernet'],
  ];
  // L'entrepôt de l'imprimeur-étiqueteur (mission 3, l'habillage), dans la zone d'activités, à l'est du bourg (relief.js :
  // ZA ; Teddy, 25/11/2026) : le hangar (dessiné en x de 151,5 à 171,5, z de 20,5 à 32,5 ; murs de h mètres ; grande porte
  // sectionnelle au pignon est, z de p0 à p1, ph de haut), sa cour en enrobé à l'est (deux rectangles) et l'accès depuis
  // la départementale, entre deux poteaux. Dessiné à sa première place (EN, COUR_EN : les coordonnées du dessin), il est
  // posé DX_EN mètres plus à l'est : chaque géométrie est déplacée, et tout ce qui touche le monde (collisions, taches,
  // plan, enseignes, éclairage intérieur, bouteilles de la ligne, lieux) passe par ce décalage. Bâti plus bas (entrepot) ;
  // aucun tirage au sort.
  const EN = { x0: 151.5, x1: 171.5, z0: 20.5, z1: 32.5, h: 6.6, p0: 25, p1: 30, ph: 4.6, LX: 163 }, DX_EN = 53.5;
  const COUR_EN = [[171.5, 19.5, 186, 32.5], [173.5, 32.5, 186, 47], [175.2, 13.5, 183.2, 19.5]];
  // un point du monde (à m mètres près) dans le hangar, sa cour ou son accès : ni herbe haute ni arbre n'y poussent
  const dansEntrepot = (x, z, m) => { x -= DX_EN; return (x > EN.x0 - m && x < EN.x1 + m && z > EN.z0 - m && z < EN.z1 + m)
    || COUR_EN.some(([x0, z0, x1, z1]) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m); };
  const plusTard = []; // des collisions posées une fois les herbes semées (elles ne changent pas leur tirage au sort)
  const interieurs = []; // les intérieurs où le soleil n'entre pas : le chai, l'entrepôt (modeles.js : definirInterieur)
  const MAISONS_ROUTE = [];
  {
    const R = TRACE, rr = hasard(9127);
    let derniere = -999, cote = 1;
    for (let i = 60; i < R.n - 120; i += 3) {
      if (i - derniere < 30) continue;
      const a = Math.max(0, i - 3), b = Math.min(R.n - 1, i + 3), l = Math.hypot(R.x[b] - R.x[a], R.z[b] - R.z[a]), tx = (R.x[b] - R.x[a]) / l, tz = (R.z[b] - R.z[a]) / l;
      for (const s of [cote, -cote]) {
        const w = 8.5 + Math.floor(rr() * 4), d = 7.5 + rr() * 1.5, h = 5.6 + rr() * 1.4, off = VERGE + 4.5 + d / 2;
        const x = R.x[i] - tz * s * off, z = R.z[i] + tx * s * off, rot = Math.atan2(R.x[i] - x, R.z[i] - z), co = Math.cos(rot), si = Math.sin(rot);
        const coins = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [x + u * co + v * si, z + v * co - u * si]);
        const ys = coins.map(([cx, cz]) => sol(cx, cz)), y0 = Math.min(...ys), y1 = Math.max(...ys);
        if (y1 - y0 > 2.2 || Math.abs(sol(x, z) - R.y[i]) > 3) continue;
        if (coins.some(([cx, cz]) => procheRoute(cx, cz, VERGE + 3).d < VERGE + 1.5)) continue; // une autre partie de la route
        if (Math.hypot(x - CHATEAU.x, z - CHATEAU.z) < CHATEAU.plateau + 22 || MAISONS_ROUTE.some(m => Math.hypot(m.x - x, m.z - z) < 24)) continue;
        if (coins.some(([cx, cz]) => PARCELLES.some(([x0, z0, x1, z1]) => cx > x0 - 8 && cx < x1 + 8 && cz > z0 - 8 && cz < z1 + 8))) continue; // pas dans les vignes
        // le seuil (la façade, côté route) au-dessus du sol ; un soubassement de pierre jusqu'au point le plus bas
        const yb = Math.max(ys[2], ys[3]) + 0.03;
        MAISONS_ROUTE.push({ i, s, x, z, w, d, h, rot, tx, tz, y: yb, socle: yb - y0, genre: MAISONS_ROUTE.length % 3 });
        derniere = i; cote = -s; break;
      }
    }
  }
  const presMaison = (x, z, m) => MAISONS_ROUTE.some(o => Math.hypot(o.x - x, o.z - z) < Math.max(o.w, o.d) / 2 + m);
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
        const pre = Math.hypot(x, z) < 200 || reserve(x, z, 8) || presMaison(x, z, 12);
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
  for (const pts0 of CHEMINS) {
    // (dessiné à partir du bord nord de l'aire de remplissage, qu'il ne traverse plus ; le réseau part du milieu de l'aire)
    const pts = pts0[0][0] === -86 && pts0[0][1] === -66 ? [[-86.3, -71.6], ...pts0.slice(1)] : pts0;
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
  surf.push(B(6, 0.09, 8.5, '#aaa69d', -86, 0, -67)); // l'aire de remplissage : un béton clair (ses détails : plus bas)
  surf.push(B(22, 0.055, 8, '#cfc1a0', -69, 0, -76)); rect(-80, -80, -58, -72, '#cfc1a0'); // devant le hangar, du gravier
  rect(-89, -71.25, -83, -62.75, '#a9a399');
  // parking de l'église
  surf.push(B(12, 0.055, 9, '#cfc1a0', 121, 0, -59.5));
  rect(115, -64, 127, -55, '#cfc1a0');
  // chemin des Grands Champs et placette du hameau (le hameau lui-même : hameau())
  // il commence au bord de la chaussée (z = 13,5) : il ne recouvre ni la route ni sa ligne de rive
  surf.push(B(4.6, 0.06, 111, '#c9b993', -55, 0, 69), B(27, 0.062, 19, '#c9b993', -56, 0, 133));
  rect(-57.3, 13.5, -52.7, 124.5, '#c9b993'); rect(-69.5, 123.5, -42.5, 142.5, '#c9b993');
  // la cour de l'entrepôt de l'imprimeur : un enrobé neuf (pas de plaques de reprise), son accès depuis la départementale ;
  // devant la grande porte, un seuil de béton et la zone de chargement hachurée de jaune ; les places du personnel ; des
  // bordures le long de la vigne et au bord de la cour
  {
    const ENR = '#4f5158', JAUNE = '#e0b13a', S0 = surf.length;
    for (const [x0, z0, x1, z1] of COUR_EN) { surf.push(B(x1 - x0, 0.06, z1 - z0, ENR, (x0 + x1) / 2, 0, (z0 + z1) / 2)); rect(x0 + DX_EN, z0, x1 + DX_EN, z1, '#5d6068'); }
    surf.push(B(1.4, 0.075, EN.p1 - EN.p0 + 1.2, '#a9a399', EN.x1 + 0.7, 0, (EN.p0 + EN.p1) / 2));
    const zc = (EN.p0 + EN.p1) / 2;
    for (const z of [EN.p0 - 0.3, EN.p1 + 0.3]) surf.push(B(3.6, 0.07, 0.12, JAUNE, EN.x1 + 2.2, 0, z));
    surf.push(B(0.12, 0.07, EN.p1 - EN.p0 + 0.72, JAUNE, EN.x1 + 4.0, 0, zc));
    for (let k = -2; k <= 2; k++) surf.push(B(0.1, 0.068, 2.3, JAUNE, EN.x1 + 2.7, 0, zc + k * 1.15, 0.7));
    for (const x of [173.95, 176.25]) surf.push(B(0.1, 0.066, 4.6, '#ece6d4', x, 0, 44.0)); // la place du personnel (lieux.garees)
    for (const [x0, z0, x1, z1] of [[171.5, 19.4, 175.2, 19.6], [183.2, 19.4, 186, 19.6], [173.4, 32.5, 173.6, 47], [173.5, 46.9, 186, 47.1]]) surf.push(B(x1 - x0, 0.14, z1 - z0, BORDURE, (x0 + x1) / 2, 0, (z0 + z1) / 2));
    for (let i = S0; i < surf.length; i++) deplacer(surf[i], DX_EN, 0, 0); // (dessiné à sa première place)
    // la zone d'activités, au nord de la route (zoneActivites) : la rue de la zone, de la départementale à la grille de
    // Solumatic ; le parvis de Solumatic (son parking : cinq places, la première pour les personnes handicapées), la
    // terrasse au nord, l'allée de la pelouse ; la cour de la tonnellerie (gravier et terre battue)
    surf.push(B(6, 0.06, 51.2, ENR, 208.5, 0, -19.0)); rect(205.5, -44.6, 211.5, 6.6, '#5d6068');
    surf.push(B(41.5, 0.06, 8.9, ENR, 216.45, 0, -49.25)); rect(195.7, -53.7, 237.2, -44.8, '#5d6068');
    surf.push(B(2.5, 0.064, 5.0, '#2e5fa8', 214.25, 0, -47.3));
    for (let x = 213; x <= 225.6; x += 2.5) surf.push(B(0.1, 0.066, 5.0, '#ece6d4', x, 0, -47.3));
    surf.push(B(9.2, 0.07, 4.3, '#bdb19b', 207.6, 0, -82.45), B(2.6, 0.07, 9.4, '#bdb19b', 223.2, 0, -58.4), B(1.4, 0.07, 12.0, '#bdb19b', 222.7, 0, -69.1)); rect(203.0, -84.6, 212.2, -80.3, '#bdb19b'); rect(221.9, -63.1, 224.5, -53.7, '#bdb19b');
    surf.push(B(37.5, 0.05, 44.4, '#b5aa94', 230.75, 0, -19.8)); rect(212, -42, 249.5, 2.4, '#c9bea6');
    surf.push(B(7.2, 0.062, 9.0, '#8f8778', 229.8, 0, -36.1)); // (la terre noircie autour de la chauffe)
  }

  // vignes d'automne : chenin (jaune) et cabernet franc (rouge)
  const PAL = {
    chenin: ['#e2b23a', '#d9a832', '#eac24a', '#cfa13a', '#bca73e', '#e6b845'],
    cabernet: ['#c2562e', '#b0402c', '#d0702f', '#9e3a2e', '#c98a34', '#b84a35'],
  };
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
  // Les petits-bois d'une fenêtre de w x hh (deux battants de trois carreaux) : le meneau, deux traverses, plaqués sur la
  // vitre, en quadrilatères tournés vers f (six triangles par fenêtre) ; axe 'z' : une façade, 'x' : un pignon
  const petitsBois = (x, y, z, f, axe = 'z', w = 0.74, hh = 1.1, c = '#efe7d6') => {
    const P = [], p = (u, v) => (axe === 'z' ? [x + u, v, z] : [x, v, z - u]);
    const q = (u0, u1, v0, v1) => { const a = p(u0, v0), b = p(u1, v0), cc = p(u1, v1), d = p(u0, v1); if (f > 0) P.push(...a, ...b, ...cc, ...a, ...cc, ...d); else P.push(...a, ...cc, ...b, ...a, ...d, ...cc); };
    q(-0.025, 0.025, y - hh / 2, y + hh / 2);
    for (const dy of [-hh / 6, hh / 6]) q(-w / 2, w / 2, y + dy - 0.013, y + dy + 0.013);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
    return teinter(g, c);
  };
  const fenetre = (L, x, y, z, f, volets, pierre) => {
    if (pierre) plaque(x, y, z + f * 0.006, 'z', f, 1.2, 1.58);
    L.push(B(0.98, 1.34, 0.08, '#efe7d6', x, y, z + f * 0.02));
    L.push(B(0.74, 1.1, 0.1, rnd() < 0.2 ? '#4a3a2a' : '#2f3c4f', x, y, z + f * 0.035), petitsBois(x, y, z + f * 0.087, f)); // certaines fenêtres sont déjà allumées
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
    const fond = (lx, l3, h3, y, porte) => { const p = facade(o, lx, 0.012), W = porte ? 80 : 320; atlas.poser(W, Math.round(W * h3 / l3), (c, w2, h2) => peindreInterieur(c, w2, h2, o.boutique, porte), l3, h3, p.x, y + (o.y || 0), p.z, p.rot, true); };
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
    } else if (genre === 'labo') {
      // le laboratoire d'œnologie : en haut, des flacons d'échantillon (du rouge, une étiquette blanche, un bouchon) ; au
      // milieu, des erlenmeyers à moitié pleins et un portoir d'éprouvettes ; en bas, l'ébulliomètre de laiton et sa lampe,
      // un analyseur blanc à l'écran allumé
      const VERRE_L = '#d6e6ea', VIN = ['#6e1f2e', '#7a2233', '#a8662a', '#d9c27a'];
      for (let x = g0 + 0.12; x < g1 - 0.08; x += 0.17) {
        L.push(C(0.027, 0.027, 0.13, 6, coul(['#3a1820', '#4a1f28', '#26301f']), x, 1.85 + 0.08, z), C(0.012, 0.012, 0.035, 6, '#f4f1ea', x, 1.85 + 0.165, z));
        L.push(B(0.045, 0.04, 0.008, '#f7f5ef', x, 1.85 + 0.075, z + 0.028));
      }
      for (let x = g0 + 0.2, k = 0; x < g1 - 0.2; x += 0.34, k++) {
        if (k % 3 === 2) {
          // portoir : sa planche, cinq éprouvettes debout, du vin au fond
          L.push(B(0.3, 0.025, 0.08, '#f4f1ea', x, 1.38, z), B(0.3, 0.02, 0.08, '#f4f1ea', x, 1.43, z));
          for (let i = -2; i <= 2; i++) L.push(C(0.009, 0.009, 0.12, 5, VERRE_L, x + i * 0.055, 1.385 + 0.06, z), C(0.0085, 0.0085, 0.05, 5, coul(VIN), x + i * 0.055, 1.385 + 0.025, z));
          continue;
        }
        L.push(C(0.013, 0.05, 0.1, 8, VERRE_L, x, 1.315 + 0.05, z), C(0.013, 0.013, 0.045, 8, VERRE_L, x, 1.315 + 0.12, z), C(0.034, 0.048, 0.035, 8, coul(VIN), x, 1.315 + 0.018, z));
      }
      L.push(C(0.045, 0.055, 0.2, 8, '#c9a55a', g0 + 0.3, 0.68 + 0.1, z0 + 0.1), C(0.007, 0.007, 0.26, 5, '#f4f1ea', g0 + 0.3, 0.68 + 0.33, z0 + 0.1), C(0.035, 0.03, 0.05, 8, '#2b2b30', g0 + 0.3, 0.68 + 0.025, z0 + 0.1));
      L.push(B(0.36, 0.24, 0.18, '#e8eaec', g1 - 0.35, 0.68 + 0.12, z0 + 0.1), B(0.2, 0.1, 0.01, '#dfeef8', g1 - 0.38, 0.68 + 0.16, z0 + 0.195), B(0.06, 0.03, 0.01, '#2f9e63', g1 - 0.22, 0.68 + 0.07, z0 + 0.195));
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
    const r = hasard(W * 31 + H + (genre || '').length * 7), sol = H * 0.82, labo = genre === 'labo';
    let g = c.createLinearGradient(0, 0, 0, H);
    if (labo) { g.addColorStop(0, '#f4f7f8'); g.addColorStop(0.6, '#dde6e9'); g.addColorStop(0.82, '#b8c5cb'); g.addColorStop(1, '#7d8a90'); }
    else { g.addColorStop(0, '#f7dfb2'); g.addColorStop(0.55, '#e3b47a'); g.addColorStop(0.82, '#b07a46'); g.addColorStop(1, '#6e4a2c'); }
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const lampes = porte ? [W / 2] : [W * 0.2, W * 0.5, W * 0.8];
    if (labo) {
      // un laboratoire : faïence blanche aux murs, sol de résine grise, néons
      c.strokeStyle = 'rgba(110,130,140,0.22)'; c.lineWidth = 1;
      for (let x = 0; x < W; x += 22) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, sol); c.stroke(); }
      for (let y = 0; y < sol; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      c.fillStyle = '#6f7c84'; c.fillRect(0, sol, W, H - sol);
      for (const x of lampes) {
        const rg = c.createRadialGradient(x, H * 0.08, 2, x, H * 0.08, H * 0.6);
        rg.addColorStop(0, 'rgba(240,248,255,0.9)'); rg.addColorStop(1, 'rgba(240,248,255,0)');
        c.fillStyle = rg; c.fillRect(0, 0, W, H);
        c.fillStyle = '#fbfdff'; c.fillRect(x - 34, H * 0.05, 68, 7);
      }
      // étagères de flacons et de verrerie
      for (const y of [H * 0.24, H * 0.4]) {
        c.fillStyle = '#c9d3d8'; c.fillRect(W * 0.04, y, W * 0.92, 4);
        for (let x = W * 0.06; x < W * 0.93; x += 9 + r() * 5) {
          const h = 10 + r() * 9;
          c.fillStyle = ['#3a1820', '#4a1f28', '#cfe0ea', '#26301f', '#a8662a'][Math.floor(r() * 5)]; c.fillRect(x, y - h, 6, h);
          c.fillStyle = '#f7f5ef'; c.fillRect(x, y - h * 0.6, 6, 3);
        }
      }
      // la paillasse : plan de travail noir, placards blancs ; dessus, un analyseur à l'écran allumé, une centrifugeuse, des
      // flacons d'échantillon en rang
      const yp = sol - H * 0.22;
      c.fillStyle = '#e8ecee'; c.fillRect(W * 0.03, yp + 6, W * 0.94, sol - yp - 6);
      c.strokeStyle = 'rgba(90,100,110,0.45)'; for (let x = W * 0.03; x < W * 0.97; x += 46) { c.strokeRect(x + 2, yp + 10, 42, sol - yp - 14); }
      c.fillStyle = '#2b2d33'; c.fillRect(W * 0.02, yp, W * 0.96, 7);
      if (!porte) {
        c.fillStyle = '#f2f4f5'; c.fillRect(W * 0.12, yp - 34, 64, 34); c.fillStyle = '#7fc4e0'; c.fillRect(W * 0.12 + 8, yp - 28, 30, 18);
        c.fillStyle = '#d8dde0'; c.beginPath(); c.ellipse(W * 0.62, yp - 12, 24, 12, 0, 0, 7); c.fill(); c.fillStyle = '#9aa6ad'; c.fillRect(W * 0.62 - 24, yp - 12, 48, 12);
      }
      for (let x = W * (porte ? 0.2 : 0.32); x < W * (porte ? 0.8 : 0.5); x += 11) { c.fillStyle = '#3a1820'; c.fillRect(x, yp - 16, 7, 16); c.fillStyle = '#f7f5ef'; c.fillRect(x, yp - 10, 7, 4); }
    } else {
      c.fillStyle = '#7a5434'; c.fillRect(0, sol, W, H - sol); // parquet
      for (let x = 0; x < W; x += 18) { c.fillStyle = x % 36 ? '#6a4a2e' : '#83603e'; c.fillRect(x, sol, 9, H - sol); }
    }
    if (!labo) for (const x of lampes) {
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
    if (labo) { /* (dessiné plus haut) */ } else if (genre === 'cave') {
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
    const t = labo ? '30,40,48' : '40,24,12';
    g.addColorStop(0, `rgba(${t},0.45)`); g.addColorStop(0.12, `rgba(${t},0)`); g.addColorStop(0.88, `rgba(${t},0)`); g.addColorStop(1, `rgba(${t},0.45)`);
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
      // (tirage : une maison qui reçoit une devanture après coup, le laboratoire : on tire quand même au sort les fenêtres
      // qu'elle remplace, la suite du tirage du monde ne bouge pas)
      if (e === 0 && o.vitrine) { if (o.tirage && i !== porte) rnd(); continue; }
      if (e === 0 && i === porte) {
        if (pierre) plaque(x, 1.24, d / 2 + 0.006, 'z', 1, 1.45, 2.48);
        const pc = o.porteC || '#5b3a2a', pf = d / 2 + 0.11;
        L.push(B(1.15, 2.25, 0.12, pc, x, 1.12, d / 2 + 0.04), B(1.5, 0.14, 0.42, '#cbbf9f', x, 0.07, d / 2 + 0.21));
        // la porte ancienne : deux panneaux moulurés en bas, le haut vitré et son croisillon, le bouton et la fente de laiton
        for (const s of [-1, 1]) L.push(B(0.38, 0.95, 0.02, assombrir(pc, 0.8), x + s * 0.24, 0.64, pf));
        L.push(B(0.84, 0.62, 0.02, '#2f3c4f', x, 1.68, pf), B(0.035, 0.62, 0.03, pc, x, 1.68, pf + 0.006), B(0.84, 0.035, 0.03, pc, x, 1.68, pf + 0.006));
        L.push(S(0.035, '#c9a55a', x + 0.42, 1.08, pf + 0.03), B(0.24, 0.045, 0.015, '#c9a55a', x, 1.26, pf));
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
    if (Math.abs(Math.sin(2 * (o.rot || 0))) > 1e-3) {
      // une maison de biais (le village du château, tournée vers lui ; la route du château) : sa boîte tournée, son
      // contour sur la mini-carte
      const r0 = o.rot || 0, co = Math.cos(r0), si = Math.sin(r0);
      col.boiteO(o.x, o.z, w, d, r0).haut = true;
      plan.push({ t: 'p', pts: [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z]) => [o.x + x * co + z * si, o.z + z * co - x * si]) });
      return o;
    }
    // collision : la maison, et sa devanture (36 cm devant la façade) ; une devanture ajoutée après coup (le laboratoire) a
    // sa boîte à part, posée une fois les herbes semées (leur tirage au sort ne bouge pas)
    const tourne = Math.abs(Math.sin(o.rot || 0)) > 0.5, av = o.vitrine && !o.tirage ? 0.36 : 0, r0 = o.rot || 0;
    const bx = col.boiteC(o.x + Math.sin(r0) * av / 2, o.z + Math.cos(r0) * av / 2, tourne ? d + av : w, tourne ? w : d + av);
    bx.haut = true;
    if (o.vitrine && o.tirage) {
      const a = d / 2 + 0.18, cx = o.x + Math.sin(r0) * a, cz = o.z + Math.cos(r0) * a;
      plusTard.push(() => { col.boiteC(cx, cz, tourne ? 0.36 : w, tourne ? w : 0.36).haut = true; });
    }
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
    // la halle du chai : quatre murs (40 cm), la façade ouverte à la grande porte (lx de -1,8 à 1,8, 5 m de haut : l'enjambeur
    // y passe, Teddy, 25/11/2026)
    L.push(B(20.6, h, 0.4, TUF, 2.7, h / 2, -5.8), B(0.4, h, 11.2, TUF, 12.8, h / 2, 0), B(0.4, h, 11.2, TUF, -7.4, h / 2, 0));
    L.push(B(5.8, h, 0.4, TUF, -4.7, h / 2, 5.8), B(11.2, h, 0.4, TUF, 7.4, h / 2, 5.8), B(3.6, h - 5.0, 0.4, TUF, 0, 5.0 + (h - 5.0) / 2, 5.8));
    L.push(B(0.36, 5.1, 0.16, '#d8cbb0', -1.98, 2.55, 6.06), B(0.36, 5.1, 0.16, '#d8cbb0', 1.98, 2.55, 6.06), B(4.32, 0.36, 0.16, '#d8cbb0', 0, 5.18, 6.06)); // encadrement de pierre
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
    H2.push(B(0.02, 1.15, 3.6, '#e6d4b0', -75.58, 5.575, -52));
    for (const z of [-57, -52.5, -48, -43.5]) H2.push(B(11.2, 0.28, 0.24, '#6b4a30', -70, 5.85, z)); // entraits de la charpente
    for (const z of [-56.5, -51.5, -46.5, -41.5]) H2.push(C(0.01, 0.01, 0.8, 4, FER, -70, 5.45, z), C(0.06, 0.32, 0.24, 10, FER, -70, 4.98, z), C(0.14, 0.14, 0.04, 8, '#ffe1a0', -70, 4.86, z));
    // cuves inox : fût, chapeau conique et son trou d'homme, pieds, porte basse, vanne ; le tube de niveau (le vin à sa
    // hauteur), l'ardoise de la cuvée à la craie, la plaque du numéro ; une flaque sous la vanne ; l'échelle sur l'une
    const cuves = [-57.6, -54.3, -51, -47.7, -44.4], NIVEAU = [2.75, 1.9, 3.05, 1.25, 2.4];
    cuves.forEach((z, i) => {
      H2.push(C(0.9, 0.9, 3.0, 14, INOX, -65.6, 2.0, z), C(0.12, 0.9, 0.45, 14, INOX, -65.6, 3.72, z), C(0.9, 0.55, 0.3, 14, INOX, -65.6, 0.35, z));
      for (const y of [1.15, 2.55, 3.48]) H2.push(C(0.915, 0.915, 0.04, 14, JOINT, -65.6, y, z)); // cordons de soudure
      for (const [dx, dz] of [[0.55, 0.55], [-0.55, 0.55], [0.55, -0.55], [-0.55, -0.55]]) H2.push(B(0.07, 0.5, 0.07, INOX, -65.6 + dx, 0.25, z + dz));
      H2.push(B(0.06, 0.5, 0.42, '#8e959c', -66.48, 1.0, z), C(0.05, 0.05, 0.22, 6, '#8e959c', -66.6, 0.62, z, 'x'), C(0.07, 0.07, 0.03, 8, '#c0392b', -66.72, 0.62, z, 'x'));
      H2.push(B(0.32, 0.16, 0.012, '#f1e8d2', -66.5, 2.4, z, Math.PI / 2)); // plaque : numéro de la cuve
      H2.push(C(0.2, 0.22, 0.1, 12, INOX, -65.6, 3.99, z), B(0.2, 0.03, 0.03, FER, -65.6, 4.06, z)); // trou d'homme du haut, sa poignée
      // le tube de niveau, transparent, et le vin dedans ; ses deux raccords
      const xt = -66.47, zt = z + 0.42, n = NIVEAU[i];
      H2.push(B(0.028, 2.6, 0.028, '#d4dade', xt, 1.95, zt), B(0.034, n - 0.66, 0.034, '#5a1a24', xt, 0.66 + (n - 0.66) / 2, zt));
      for (const y of [0.66, 3.25]) H2.push(B(0.12, 0.05, 0.05, INOX, xt + 0.06, y, zt));
      // l'ardoise : la cuvée à la craie (trois traits)
      H2.push(B(0.014, 0.3, 0.42, '#2b2f2c', -66.52, 1.72, z - 0.04));
      for (const [y, l] of [[1.8, 0.3], [1.72, 0.22], [1.64, 0.26]]) H2.push(B(0.006, 0.022, l, '#e8e4d8', -66.53, y, z - 0.04 - (0.3 - l) / 2));
      H2.push(C(0.34, 0.34, 0.004, 12, '#77726a', -66.85, 0.064, z));
      if (i === 2) { // l'échelle : deux montants, des barreaux, deux crochets sur le bord du chapeau
        const ex = -66.7, ez = z - 0.45;
        for (const dz of [-0.21, 0.21]) H2.push(B(0.045, 3.72, 0.05, FER, ex, 1.86, ez + dz), B(0.36, 0.045, 0.05, FER, ex + 0.16, 3.68, ez + dz));
        for (let y = 0.28; y < 3.6; y += 0.3) H2.push(B(0.035, 0.035, 0.42, FER, ex, y, ez));
      }
    });
    // la thermorégulation : deux conduites le long du mur, derrière les cuves (l'eau froide, l'eau chaude), un départ vers
    // le chapeau de chaque cuve
    for (const [y, c, dz] of [[4.42, '#3b6ea5', -0.09], [4.58, '#a5392d', 0.09]]) {
      H2.push(C(0.04, 0.04, 15.6, 6, c, -64.56, y, -51.0, 'z'));
      for (const z of cuves) H2.push(C(0.028, 0.028, 0.64, 6, c, -64.88, y, z + dz, 'x', 0, 0), C(0.028, 0.028, y - 3.78, 6, c, -65.2, (y + 3.78) / 2, z + dz, 'y', 0, 1), C(0.045, 0.045, 0.06, 8, '#c9a55a', -65.2, y - 0.25, z + dz), S(0.03, c, -65.2, y, z + dz));
    }
    // les barriques sur leur chantier, contre le pignon : deux madriers, onze couchées, dix par-dessus, dans les creux ; la
    // bonde et la cuvée à la craie sur le fond de celles du dessus
    H2.push(B(8.4, 0.12, 0.12, '#5a3f2b', -70.65, 0.06, -40.55), B(8.4, 0.12, 0.12, '#5a3f2b', -70.65, 0.06, -40.05));
    for (let i = 0; i < 11; i++) H2.push(deplacer(geoBarrique('z'), -74.4 + i * 0.74, 0.47, -40.3));
    for (let i = 0; i < 10; i++) {
      const x = -74.03 + i * 0.74;
      H2.push(deplacer(geoBarrique('z'), x, 1.064, -40.3), C(0.035, 0.035, 0.06, 6, i % 3 ? '#5a3f2b' : '#e8e4d8', x, 1.41, -40.3));
      H2.push(B(0.16 + (i % 3) * 0.03, 0.022, 0.006, '#e8e4d8', x, 1.1, -40.78), B(0.1, 0.022, 0.006, '#e8e4d8', x - 0.02, 1.04, -40.78));
    }
    // pressoir pneumatique : la cuve couchée sur son bâti, sa porte, la trémie, le tableau de commande
    const PX = -68.6, PZ = -42.7;
    H2.push(C(0.82, 0.82, 2.9, 14, INOX, PX, 1.55, PZ, 'x'), B(3.2, 0.12, 1.3, FER, PX, 0.55, PZ));
    for (const x of [PX - 1.1, PX + 1.1]) H2.push(C(0.835, 0.835, 0.05, 14, JOINT, x, 1.55, PZ, 'x'));
    for (const dx of [-1.3, 1.3]) for (const dz of [-0.5, 0.5]) H2.push(B(0.1, 0.55, 0.1, FER, PX + dx, 0.27, PZ + dz));
    H2.push(B(0.7, 0.5, 0.05, '#8e959c', PX, 2.1, PZ + 0.8), B(1.0, 0.5, 0.9, INOX, PX, 2.6, PZ), B(0.4, 0.6, 0.25, '#e8e4d8', PX + 1.9, 1.0, PZ + 1.0), B(0.3, 0.2, 0.02, '#2b2b30', PX + 1.9, 1.1, PZ + 1.13));
    for (const [dx, c] of [[-0.08, '#2f9e63'], [0.08, '#c0392b']]) H2.push(C(0.025, 0.025, 0.02, 8, c, PX + 1.9 + dx, 0.85, PZ + 1.13, 'z'));
    // égrappoir-fouloir sur roues
    H2.push(B(1.4, 0.6, 0.7, INOX, -73.6, 0.75, -41.9), B(1.5, 0.35, 0.9, INOX, -73.6, 1.2, -41.9));
    for (const dx of [-0.55, 0.55]) H2.push(C(0.16, 0.16, 0.08, 8, FER, -73.6 + dx, 0.16, -41.45, 'z'));
    // la pompe à vin sur son chariot : moteur rouge, corps inox, deux roues, la poignée, le coffret ; un tuyau jusqu'à la
    // vanne de la quatrième cuve, l'autre enroulé par terre
    {
      const X = -67.6, Z = -46.1, TV = '#b8543a';
      H2.push(B(0.9, 0.05, 0.5, FER, X, 0.3, Z));
      for (const dz of [-0.28, 0.28]) H2.push(C(0.15, 0.15, 0.06, 10, '#1e1e22', X - 0.28, 0.15, Z + dz, 'z'), C(0.06, 0.06, 0.07, 8, '#9aa1a8', X - 0.28, 0.15, Z + dz, 'z'));
      H2.push(B(0.05, 0.25, 0.05, FER, X + 0.38, 0.17, Z));
      H2.push(C(0.17, 0.17, 0.44, 12, '#c0392b', X + 0.1, 0.52, Z, 'x'), C(0.18, 0.18, 0.04, 12, '#8e2a22', X + 0.33, 0.52, Z, 'x'));
      H2.push(C(0.14, 0.14, 0.22, 12, INOX, X - 0.24, 0.5, Z, 'x'), C(0.05, 0.05, 0.16, 8, INOX, X - 0.3, 0.68, Z), C(0.05, 0.05, 0.16, 8, INOX, X - 0.18, 0.68, Z - 0.12, 'z'));
      for (const dz of [-0.2, 0.2]) H2.push(B(0.03, 0.55, 0.03, FER, X + 0.44, 0.58, Z + dz));
      H2.push(B(0.03, 0.03, 0.43, FER, X + 0.44, 0.86, Z), B(0.16, 0.2, 0.12, '#e8e4d8', X + 0.12, 0.8, Z), C(0.02, 0.02, 0.02, 8, '#2f9e63', X + 0.12, 0.84, Z + 0.065, 'z'));
      tuyau(H2, [[X - 0.3, 0.76, Z], [X - 0.34, 0.6, Z + 0.22], [X - 0.38, 0.1, Z + 0.45], [X - 0.75, 0.1, Z + 0.75], [X - 1.35, 0.1, Z + 0.9], [-69.6 + 0.6, 0.1, -45.1]], 0.045, TV);
      rouleau(H2, -69.6, 0.1, -45.1, 0.6, 0.045, TV, 'y', 2);
      tuyau(H2, [[X - 0.18, 0.76, Z - 0.2], [X - 0.2, 0.5, Z - 0.45], [X - 0.15, 0.1, Z - 0.75], [X + 0.25, 0.1, Z - 1.1], [X + 0.6, 0.1, Z - 1.45], [-66.88, 0.3, -47.66], [-66.76, 0.62, -47.7]], 0.045, TV);
    }
    // un tuyau enroulé, accroché au pignon au-dessus des barriques ; un autre au mur, près de la porte
    H2.push(B(0.08, 0.08, 0.3, FER, -72.2, 2.98, -39.57), B(0.08, 0.08, 0.3, FER, -74.9, 2.6, -39.57));
    rouleau(H2, -72.2, 2.52, -39.5, 0.45, 0.045, '#b8543a', 'z', 2, -1);
    rouleau(H2, -74.9, 2.15, -39.5, 0.4, 0.04, '#d9dcd2', 'z', 2, -1);
    // l'établi et ses outils, les seaux ; les palettes de cartons vides pliés ; la palette des commandes du jour
    H2.push(B(0.7, 0.06, 2.2, '#9a7b55', -75.15, 0.9, -57.2), B(0.06, 0.9, 0.06, '#6b4a30', -74.9, 0.45, -58.2), B(0.06, 0.9, 0.06, '#6b4a30', -74.9, 0.45, -56.2), B(0.04, 1.0, 2.2, '#8d7c66', -75.5, 1.55, -57.2));
    for (let i = 0; i < 5; i++) H2.push(B(0.05, 0.25 + (i % 2) * 0.1, 0.05, ['#c0392b', '#2b2b30', '#c9a55a'][i % 3], -75.45, 1.6, -58 + i * 0.35));
    H2.push(B(0.3, 0.16, 0.5, '#c0392b', -75.15, 1.01, -57.75), B(0.06, 0.18, 0.1, '#2b2b30', -75.15, 1.02, -56.7), C(0.05, 0.05, 0.12, 8, '#c9a55a', -75.0, 0.99, -56.95)); // la caisse à outils, le bec verseur, l'entonnoir
    for (const z of [-56.4, -57.6]) H2.push(C(0.15, 0.13, 0.3, 8, ['#2e86de', '#e0b13a'][z < -57 ? 1 : 0], -73.9, 0.15, z));
    for (const [x, z] of [[-73.2, -58.2], [-71.8, -58.2]]) {
      H2.push(B(1.2, 0.14, 1.0, '#9a7b55', x, 0.07, z)); // palette de cartons vides, pliés en piles
      for (let k = 0; k < 3; k++) for (const dx of [-0.29, 0.29]) for (const dz of [-0.24, 0.24]) H2.push(B(0.56, 0.32, 0.46, (k + (dx > 0) + (dz > 0)) % 2 ? '#b98a55' : '#ad7f4c', x + dx, 0.31 + k * 0.33, z + dz));
    }
    H2.push(B(1.2, 0.14, 1.0, '#9a7b55', -71.4, 0.07, -48.1)); // la palette du jour (lieux.palette)
    // au mur du bureau : le tableau des cuves à la craie ; le lave-mains inox, son robinet, l'essuie-mains ; l'enrouleur
    // d'eau ; la raclette et le balai appuyés au mur ; une grille d'évacuation au sol
    H2.push(B(1.7, 1.05, 0.03, '#6b4a30', -71.5, 1.95, -59.15), B(1.6, 0.95, 0.03, '#2b2f2c', -71.5, 1.95, -59.13));
    for (let k = 0; k < 5; k++) { const y = 2.3 - k * 0.17; H2.push(B(0.22, 0.03, 0.006, '#e8e4d8', -72.12, y, -59.11), B(0.5 + ((k * 37) % 5) * 0.08, 0.025, 0.006, '#e8e4d8', -71.55, y, -59.11), B(0.18, 0.025, 0.006, k === 1 ? '#e0b12a' : '#e8e4d8', -70.95, y, -59.11)); }
    H2.push(B(0.9, 0.24, 0.5, INOX, -69.4, 0.86, -58.9), B(0.76, 0.01, 0.36, '#6f767d', -69.4, 0.985, -58.88), B(0.9, 0.32, 0.02, INOX, -69.4, 1.14, -59.15));
    for (const dx of [-0.4, 0.4]) for (const dz of [-0.2, 0.2]) H2.push(B(0.04, 0.74, 0.04, INOX, -69.4 + dx, 0.37, -58.9 + dz));
    H2.push(C(0.015, 0.015, 0.3, 6, INOX, -69.4, 1.15, -59.1), B(0.03, 0.03, 0.2, INOX, -69.4, 1.29, -59.0), B(0.08, 0.04, 0.03, '#c0392b', -69.4, 1.12, -59.1));
    H2.push(B(0.28, 0.32, 0.12, '#e8e4d8', -68.7, 1.55, -59.11), B(0.2, 0.02, 0.02, '#9aa0a6', -68.7, 1.38, -59.05), B(0.08, 0.16, 0.08, '#4a9a5a', -69.75, 1.06, -59.05));
    // (l'enrouleur : son tambour couché le long du mur, le tuyau vert enroulé, deux joues, la platine, la manivelle)
    H2.push(B(0.36, 0.12, 0.04, '#5d6b78', -67.75, 1.2, -59.16), C(0.2, 0.2, 0.18, 14, '#2f6b3a', -67.75, 1.2, -58.97, 'x', 0, 0));
    for (const dx of [-0.1, 0.1]) H2.push(C(0.25, 0.25, 0.02, 14, '#8d9196', -67.75 + dx, 1.2, -58.97, 'x'), B(0.02, 0.06, 0.2, '#5d6b78', -67.75 + dx, 1.2, -59.06));
    H2.push(C(0.02, 0.02, 0.32, 6, '#e0b12a', -67.75, 1.2, -58.97, 'x'), B(0.02, 0.14, 0.02, '#e0b12a', -67.58, 1.14, -58.97));
    tuyau(H2, [[-67.75, 1.0, -58.95], [-67.72, 0.55, -58.85], [-67.65, 0.1, -58.7], [-67.9, 0.1, -58.3], [-68.2, 0.1, -58.4]], 0.022, '#2f6b3a');
    tuyau(H2, [[-70.62, 0.09, -58.72], [-70.62, 1.45, -59.12]], 0.013, '#9a7b55'); H2.push(B(0.45, 0.07, 0.05, '#2b2b30', -70.62, 0.07, -58.7));
    tuyau(H2, [[-70.25, 0.2, -58.8], [-70.25, 1.5, -59.12]], 0.013, '#9a7b55'); H2.push(B(0.3, 0.18, 0.08, '#c9a55a', -70.25, 0.13, -58.75));
    H2.push(B(0.3, 0.008, 0.3, '#3a3a3e', -69.4, 0.064, -58.2));
    for (let k = -2; k <= 2; k++) H2.push(B(0.26, 0.01, 0.025, '#8e959c', -69.4, 0.07, -58.2 + k * 0.055));
    // la rigole le long des cuves : sa grille
    for (let z = -57.4; z < -42.5; z += 0.25) H2.push(B(0.17, 0.012, 0.03, '#78736b', -66.8, 0.07, z));
    // au mur de la porte : l'armoire électrique et ses gaines, le détecteur de gaz carbonique (au ras du sol : le gaz est
    // lourd), l'extincteur et son panneau ; les étagères des produits du chai ; le ventilateur d'extraction en haut
    H2.push(B(0.16, 0.85, 0.6, '#d9dcdf', -75.5, 1.6, -54.7), B(0.012, 0.8, 0.008, '#9aa0a6', -75.415, 1.6, -54.7), B(0.012, 0.12, 0.12, '#e0b12a', -75.415, 1.85, -54.55), B(0.02, 0.06, 0.03, '#2b2b30', -75.41, 1.6, -54.47));
    for (const dz of [-0.18, 0, 0.18]) H2.push(B(0.05, 3.75, 0.05, '#9aa0a6', -75.52, 3.9, -54.7 + dz));
    H2.push(B(0.05, 0.05, 10.0, '#9aa0a6', -75.52, 5.6, -50.3));
    H2.push(B(0.06, 0.16, 0.11, '#e8e4d8', -75.53, 0.45, -54.0), B(0.065, 0.03, 0.03, '#c0392b', -75.5, 0.5, -54.0));
    H2.push(C(0.085, 0.085, 0.5, 10, '#c0392b', -75.45, 0.95, -49.55), B(0.06, 0.1, 0.06, '#2b2b30', -75.45, 1.25, -49.55), B(0.04, 0.3, 0.04, '#2b2b30', -75.38, 1.0, -49.45), B(0.03, 0.06, 0.14, '#5d6b78', -75.55, 1.15, -49.55));
    H2.push(B(0.012, 0.26, 0.2, '#c0392b', -75.56, 1.65, -49.55), B(0.014, 0.12, 0.07, '#f1e8d2', -75.555, 1.65, -49.55));
    {
      const X = -75.3, Z = -47.9, h = 1.9;
      for (const dx of [-0.22, 0.22]) for (const dz of [-0.95, 0.95]) H2.push(B(0.035, h, 0.035, '#5d6b78', X + dx, h / 2, Z + dz));
      for (const y of [0.12, 0.62, 1.12, 1.62]) H2.push(B(0.5, 0.025, 1.94, '#8d9196', X, y, Z));
      // dessus : bidons, sacs, cartons des produits du chai (levures, tanins, bentonite, sulfites), pots
      for (const [y, items] of [[0.14, [[-0.6, 0.36, 0.34, '#f1e8d2'], [-0.15, 0.36, 0.34, '#f1e8d2'], [0.45, 0.3, 0.5, '#e8e4d8']]], [0.64, [[-0.65, 0.3, 0.3, '#2e86de'], [-0.25, 0.3, 0.3, '#2e86de'], [0.2, 0.22, 0.25, '#c9a55a'], [0.6, 0.22, 0.25, '#c9a55a']]], [1.14, [[-0.6, 0.2, 0.2, '#e0b13a'], [-0.3, 0.2, 0.2, '#e0b13a'], [0.1, 0.26, 0.3, '#ad7f4c'], [0.55, 0.26, 0.3, '#b98a55']]], [1.64, [[-0.55, 0.18, 0.22, '#f1e8d2'], [-0.2, 0.18, 0.22, '#d9dcdf'], [0.35, 0.22, 0.36, '#ad7f4c']]]])
        for (const [dz, hh, w, c] of items) H2.push(B(0.36, hh, w, c, X + 0.02, y + 0.015 + hh / 2, Z + dz));
    }
    H2.push(B(0.6, 0.6, 0.06, '#9aa0a6', -67.6, 5.1, -39.46), C(0.24, 0.24, 0.05, 12, '#2b2b30', -67.6, 5.1, -39.5, 'z'));
    H2.push(B(0.42, 0.05, 0.012, '#5d6b78', -67.6, 5.1, -39.53), B(0.05, 0.42, 0.012, '#5d6b78', -67.6, 5.1, -39.53));
    // une palette de bouteilles vides, filmée (couches de verre et intercalaires) ; un fût debout pour goûter : deux
    // bouteilles, trois verres, le crachoir
    {
      const X = -74.75, Z = -44.0;
      H2.push(B(1.2, 0.14, 1.0, '#9a7b55', X, 0.07, Z));
      for (let k = 0; k < 4; k++) H2.push(B(1.14, 0.3, 0.96, '#2c4a36', X, 0.31 + k * 0.32, Z), B(1.17, 0.02, 0.99, '#c9a46a', X, 0.47 + k * 0.32, Z));
      H2.push(B(1.18, 0.04, 1.0, '#d8e2dc', X, 1.42, Z));
      H2.push(deplacer(geoBarrique('y'), -73.1, 0.475, -45.7));
      for (const [dx, dz] of [[-0.08, 0.05], [0.06, -0.08]]) H2.push(C(0.037, 0.037, 0.2, 8, '#1f3b2a', -73.1 + dx, 1.05, -45.7 + dz), C(0.014, 0.022, 0.08, 6, '#1f3b2a', -73.1 + dx, 1.19, -45.7 + dz), C(0.016, 0.016, 0.03, 6, '#5b1424', -73.1 + dx, 1.245, -45.7 + dz));
      for (const [dx, dz] of [[0.14, 0.12], [-0.16, -0.12], [0.18, -0.1]]) H2.push(C(0.03, 0.022, 0.07, 8, '#cfdde3', -73.1 + dx, 1.07, -45.7 + dz), C(0.004, 0.004, 0.06, 4, '#cfdde3', -73.1 + dx, 1.0, -45.7 + dz), C(0.025, 0.025, 0.005, 8, '#cfdde3', -73.1 + dx, 0.955, -45.7 + dz));
      H2.push(C(0.13, 0.1, 0.22, 10, INOX, -72.55, 0.11, -45.55));
    }
    // les fenêtres, vues de dedans (le jour derrière) : leur cadre de bois, l'appui
    for (const [x, z, s] of [...[-56.5, -45.5, -41.2].map(z => [-75.59, z, 1]), ...[-58.3, -54, -49.7, -45.3, -41].map(z => [-64.41, z, -1])]) {
      H2.push(B(0.03, 1.1, 0.74, '#3d5f8e', x, 1.75, z));
      for (const dz of [-0.4, 0.4]) H2.push(B(0.05, 1.2, 0.06, '#8d7c66', x + s * 0.02, 1.75, z + dz));
      for (const y of [1.17, 2.33]) H2.push(B(0.05, 0.06, 0.86, '#8d7c66', x + s * 0.02, y, z));
      H2.push(B(0.02, 1.1, 0.03, '#8d7c66', x + s * 0.025, 1.75, z), B(0.16, 0.04, 0.9, '#d8cbb0', x + s * 0.08, 1.14, z));
    }
    const halle = new THREE.Mesh(fusion(H2), MAT);
    halle.receiveShadow = true; halle.castShadow = false; halle.name = 'chai'; // dedans, le soleil est coupé (definirInterieur) : l'ombre du toit ne compte qu'au-dessus des murs
    scene.add(halle);
    o.halle = halle; // dessiné seulement de près, porte ouverte, ou quand on est dedans (main.js)
    // ce qui arrête : cuves, chantiers, pressoir, égrappoir, pompe, établi, palettes
    for (const z of cuves) col.boiteC(-65.6, z, 1.9, 1.9).haut = true;
    for (const [x0, z0, x1, z1] of [[-75, -40.8, -66.1, -39.4], [-70.2, -43.4, -67.0, -42.0], [-74.4, -42.4, -72.8, -41.4], [-68.1, -46.45, -67.1, -45.75], [-75.6, -58.3, -74.8, -56.1], [-73.8, -58.7, -71.2, -57.7],
      [-69.9, -59.2, -68.9, -58.6], [-75.6, -48.9, -75.05, -46.9], [-75.4, -44.55, -74.1, -43.45], [-75.6, -55.05, -75.35, -54.35]]) col.boite(x0, z0, x1, z1);
    col.boiteC(-73.1, -45.7, 0.72, 0.72);
    // la grande porte : deux vantaux de planches sur leurs gonds, qui s'ouvrent vers la cour (main.js les anime)
    const vantail = s => {
      const g = new THREE.Group(), L2 = [];
      L2.push(B(0.08, 4.9, 1.8, '#5b3a2a', 0, 2.45, s * 0.9));
      for (const y of [0.5, 2.45, 4.4]) L2.push(B(0.1, 0.16, 1.7, '#4a3324', -0.02, y, s * 0.9));
      L2.push(B(0.06, 0.06, 0.18, '#2b2b30', -0.06, 2.0, s * 1.6));
      const m = new THREE.Mesh(fusion(L2), MAT); m.castShadow = true; m.receiveShadow = true; g.add(m);
      g.position.set(-76.02, 0, s > 0 ? -53.8 : -50.2); scene.add(g);
      return g;
    };
    o.porteChai = { a: vantail(1), b: vantail(-1), k: 0, col: col.boite(-76.4, -53.8, -75.6, -50.2) }; // épaisse comme le mur : la caméra du dehors ne passe pas entre deux relevés
    o.porteChai.col.haut = true;
    interieurs.push({ min: [-75.8, -1, -59.4], max: [-64.2, 6.3, -39.2], lampes: [-56.5, -51.5, -46.5, -41.5].map(z => [-70, 5.0, z]) });


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
      bati.push(C(0.2, 0.28, 3.5, 6, '#5e4a36', x, 1.75, z), S(r, pick(['#c9a23a', '#b8642c', '#7f9046']), x, 3.4 + r * 0.6, z, 1, 0.9, 1, 1)); // (le tronc entre dans le feuillage)
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
  // un tuyau souple, de point en point ([x, y, z]) : des tronçons de cylindre sans couvercle, un nœud à chaque coude
  const tuyau = (L, pts, r, c, seg = 6) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const g = C(r, r, l, seg, c, 0, 0, 0, 'y', 0, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3((b[0] - a[0]) / l, (b[1] - a[1]) / l, (b[2] - a[2]) / l)));
      L.push(deplacer(g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2));
      if (i < pts.length - 1) L.push(S(r, c, b[0], b[1], b[2]));
    }
  };
  // un tuyau enroulé : n spires de rayon R autour de (x, y, z), à plat (axe 'y') ou accroché à un mur perpendiculaire à
  // l'axe 'x' ou 'z' ; les spires se décalent de s * 2r le long de l'axe (s : vers l'intérieur de la pièce)
  const rouleau = (L, x, y, z, R, r, c, axe = 'y', n = 2, s = 1) => {
    const pts = [];
    for (let k = 0; k <= n * 14; k++) {
      const a = k / 14 * Math.PI * 2, rr = R * (1 - 0.04 * k / 14), u = Math.cos(a) * rr, v = Math.sin(a) * rr, w = s * k / 14 * r * 2.1;
      pts.push(axe === 'y' ? [x + u, y + w, z + v] : axe === 'x' ? [x + w, y + u, z + v] : [x + u, y + v, z + w]);
    }
    tuyau(L, pts, r, c);
  };
  const chai = chaiEtBureau();
  {
    enseigne('CHAI', facade(chai, 0, 0.12), 5.75, 2.2, 0.62, '#5b3a2a', '#f1e2c4');
  }
  /* -- Le parvis du chai (Teddy, 24/11/2026 : « des artefacts viticoles, réalistes, et que ça vive »). Au nord de la grande
     porte, le chantier des barriques, le poste de rinçage (une barrique couchée sur son berceau d'inox, le nettoyeur haute
     pression et son tuyau, une flaque, le caniveau à grille), des barriques rincées debout qui s'égouttent ; dans le coin
     contre le muret, une remorque plateau chargée de caisses de vendange que l'on range sur des palettes, deux palox ;
     près du bureau, un demi-fût planté (le vieux pressoir à cage est près de l'arbre de la cour). Ceux qui y travaillent, les caisses (en instances), le
     chien, les moineaux : parvis.js. Rien sur les passages des véhicules (la cour, la porte, le bureau), ni sur la marche
     arrière qui ressort du chai (chai.js, cheminSortie). */
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
  // (jusqu'aux pieds du rinceur, entre ses deux places)
  tuyau(bati, [[-81.3, -47.35], [-81.0, -46.95], [-80.5, -46.9], [-80.1, -46.8], [-79.75, -46.85], [-79.45, -46.7]].map(([x, z]) => [x, 0.05, z]), 0.022, '#1e1e22', 5);
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
  // (le vieux pressoir à cage, qui était ici, est près de l'arbre de la cour : le chemin du hangar passe là)
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
  // le portail : ses deux piliers de tuffeau, et au-dessus (Teddy, 25/11/2026 : « un truc en fer forgé, plus haut ; quand on
  // passe dessous ou qu'on le voit de derrière ») une arche de fer forgé : montants doubles et leurs pointes, deux arcs
  // reliés de barreaux, volutes, une grappe au sommet, le nom du domaine découpé dans le fer (lisible des deux côtés), deux
  // lanternes sur les piliers. Le plus bas à 5 m : l'enjambeur (4,4 m) passe dessous.
  {
    const FER = '#25262a', Z = -33.5;
    const fer = (x0, y0, x1, y1, e = 0.05) => { const l = Math.hypot(x1 - x0, y1 - y0), g = new THREE.BoxGeometry(l, e, e); g.rotateZ(Math.atan2(y1 - y0, x1 - x0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, Z); return teinter(g, FER); };
    const anneau = (x, y, r, arc = Math.PI * 2, rot = 0, e = 0.02) => { const g = new THREE.TorusGeometry(r, e, 4, 14, arc); g.rotateZ(rot); g.translate(x, y, Z); return teinter(g, FER); };
    const L = [];
    for (const s of [-1, 1]) {
      const x = -90 + s * 3.0;
      for (const dx of [-0.17, 0.17]) { L.push(fer(x + dx, 2.8, x + dx, 5.6, 0.055), teinter(C(0, 0.05, 0.18, 4, FER, x + dx, 5.69, Z), FER)); }
      for (const y of [3.3, 4.1, 4.85]) L.push(fer(x - 0.17, y, x + 0.17, y, 0.04));
      L.push(anneau(x, 3.7, 0.13), anneau(x, 4.47, 0.13));
      // la volute, au pied de l'arche, côté intérieur ; la lanterne sur le pilier
      L.push(anneau(x - s * 0.55, 5.32, 0.2, Math.PI * 1.5, s > 0 ? Math.PI : -Math.PI / 2), anneau(x - s * 0.55, 5.32, 0.09, Math.PI * 1.5, s > 0 ? Math.PI : -Math.PI / 2));
      L.push(B(0.26, 0.05, 0.26, FER, x, 2.83, Z), B(0.18, 0.28, 0.18, '#ffe1a0', x, 3.0, Z), C(0, 0.17, 0.14, 4, FER, x, 3.21, Z, 'y', Math.PI / 4));
    }
    // deux barres droites, les deux arcs (une demi-ellipse chacun), les barreaux entre eux
    L.push(fer(-93.2, 5.0, -86.8, 5.0, 0.06), fer(-93.2, 5.14, -86.8, 5.14, 0.04));
    const arc = (a, b, y0, k) => { const P = []; for (let i = 0; i <= 18; i++) { const t = Math.PI * (1 - i / 18); P.push([-90 + a * Math.cos(t), y0 + b * Math.sin(t)]); } return P; };
    const ext = arc(3.2, 1.35, 5.45), int = arc(2.95, 0.72, 5.36);
    for (let i = 1; i < ext.length; i++) { L.push(fer(ext[i - 1][0], ext[i - 1][1], ext[i][0], ext[i][1], 0.06), fer(int[i - 1][0], int[i - 1][1], int[i][0], int[i][1], 0.045)); }
    for (let i = 2; i < ext.length - 1; i += 2) if (i !== 8 && i !== 10) L.push(fer(int[i][0], int[i][1], ext[i][0], ext[i][1], 0.035));
    // la grappe au sommet, sa feuille, sa vrille
    for (const [dx, dy] of [[0, 0], [-0.1, 0.02], [0.1, 0.02], [-0.05, -0.09], [0.05, -0.09], [0, -0.18], [-0.15, 0.1], [0.15, 0.1], [0, 0.11]]) L.push(teinter(S(0.058, FER, -90 + dx, 6.46 + dy, Z), FER));
    L.push(teinter(S(0.2, FER, -89.78, 6.66, Z, 1.1, 0.7, 0.2), FER), anneau(-90.25, 6.68, 0.1, Math.PI * 1.4, 0.3, 0.012));
    bati.push(...L);
    // le nom du domaine, découpé dans le fer : deux plaques de l'atlas, l'une vers la route, l'autre vers la cour
    const lettres = (c, W, H) => {
      c.clearRect(0, 0, W, H); c.fillStyle = FER; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold ${Math.round(H * 0.8)}px Georgia, 'Times New Roman', serif`; c.fillText('DOMAINE DU CLOS LIBRE', W / 2, H * 0.54);
    };
    atlas.poser(768, 70, lettres, 4.6, 0.42, -90, 5.56, Z + 0.02, 0);
    atlas.poser(768, 70, lettres, 4.6, 0.42, -90, 5.56, Z - 0.02, Math.PI);
  }
  /* -- Le hangar ouvert (Teddy, 25/11/2026 : « un gros garage ouvert pour ranger le tracteur, l'enjambeur, un transpalette
     et d'autres machines, derrière le chai, un peu caché mais accessible ») : au nord-est de la cour, derrière le bout du
     chai (x de -76,5 à -60, z de -94 à -80), ouvert au sud ; trois travées de 5,5 m (le tracteur, l'enjambeur, le
     transpalette et l'atelier) sous un toit de bac acier à deux pans (5 m à l'égout : l'enjambeur passe) ; soubassement de
     parpaings et bardage de planches, poteaux d'acier en façade, dalle de béton, néons ; au fond de la troisième travée,
     l'établi, le panneau d'outils, les étagères (bidons, huile), des pneus, un broyeur ; dehors, la cuve à gazole et sa
     pompe. On y va par la cour, entre l'aire de remplissage et le bout du chai (lieux.reseau ; le vieux pressoir, qui était
     là, est passé près de l'arbre). */
  {
    const x0 = -76.5, x1 = -60, z0 = -94, z1 = -80, H = 5.0, BLOC = '#b5b0a6', BARD = '#6e5a44', ACIER = '#5d6b78', xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
    const L = [];
    L.push(B(x1 - x0, 0.1, z1 - z0, '#a3a29c', xm, 0.0, zm));
    const mur = (w, d, x, z) => L.push(B(w, 1.2, d, BLOC, x, 0.6, z), B(w, H - 1.2, d, BARD, x, 1.2 + (H - 1.2) / 2, z));
    mur(x1 - x0, 0.25, xm, z0 + 0.125); mur(0.25, z1 - z0, x0 + 0.125, zm); mur(0.25, z1 - z0, x1 - 0.125, zm);
    // les couvre-joints du bardage, dedans et dehors
    for (let x = x0 + 0.55; x < x1 - 0.3; x += 0.55) L.push(B(0.06, H - 1.25, 0.03, '#5e4a36', x, 1.2 + (H - 1.2) / 2, z0 - 0.015), B(0.06, H - 1.25, 0.03, '#5e4a36', x, 1.2 + (H - 1.2) / 2, z0 + 0.265));
    for (let z = z0 + 0.55; z < z1 - 0.3; z += 0.55) for (const x of [x0 - 0.015, x1 + 0.015]) L.push(B(0.03, H - 1.25, 0.06, '#5e4a36', x, 1.2 + (H - 1.2) / 2, z));
    // les poteaux d'acier, la sablière de façade ; le toit à deux pans (les pignons en bardage) ; trois néons
    for (const x of [x0 + 0.13, -71, -65.5, x1 - 0.13]) L.push(B(0.22, H, 0.22, ACIER, x, H / 2, z1 - 0.13));
    for (const x of [-71, -65.5]) L.push(B(0.2, H, 0.2, ACIER, x, H / 2, z0 + 0.35));
    L.push(B(x1 - x0, 0.32, 0.22, ACIER, xm, H - 0.16, z1 - 0.13), B(x1 - x0, 0.32, 0.2, ACIER, xm, H - 0.16, z0 + 0.35));
    L.push(...toit(x1 - x0, z1 - z0, 1.4, '#8d9196', xm, H, zm, false, { mur: BARD, dessous: '#9aa0a6', faitiere: '#7d8288', egout: 0.6 }));
    for (const x of [-73.75, -68.25, -62.75]) L.push(B(0.12, 0.06, 1.5, '#eef0f2', x, H + 0.35, zm), B(0.03, 0.4, 0.03, '#2b2b30', x, H + 0.55, zm));
    // l'établi au fond de la troisième travée, son étau ; le panneau d'outils ; les étagères de bidons ; des pneus ; le broyeur
    L.push(B(2.8, 0.08, 0.75, '#9a7b55', -62.6, 0.9, z0 + 0.65), B(2.7, 0.04, 0.6, '#7d6b55', -62.6, 0.3, z0 + 0.65));
    for (const x of [-63.9, -61.3]) for (const dz of [0.35, 0.95]) L.push(B(0.07, 0.9, 0.07, '#5e4a36', x, 0.45, z0 + dz));
    L.push(B(0.2, 0.14, 0.16, '#3b5f8e', -61.6, 1.01, z0 + 0.5), B(0.04, 0.04, 0.3, '#9aa0a6', -61.6, 1.02, z0 + 0.62));
    L.push(B(2.4, 1.1, 0.04, '#c9b48a', -62.6, 1.75, z0 + 0.28));
    for (const [x, y, w, h, c] of [[-63.5, 1.95, 0.05, 0.42, '#2b2b30'], [-63.2, 1.85, 0.32, 0.05, '#c0392b'], [-62.9, 1.95, 0.04, 0.5, '#2b2b30'], [-62.5, 1.9, 0.08, 0.3, '#e0b12a'], [-62.1, 1.95, 0.05, 0.45, '#2b2b30'], [-61.8, 1.7, 0.3, 0.05, '#2b2b30'], [-61.5, 2.0, 0.06, 0.25, '#c0392b']]) L.push(B(w, h, 0.03, c, x, y, z0 + 0.31));
    for (let k = 0; k < 4; k++) L.push(B(0.42, 0.03, 2.2, '#8d9196', x1 - 0.48, 0.35 + k * 0.5, -88.0));
    for (const x of [x1 - 0.68, x1 - 0.28]) for (const z of [-89.05, -86.95]) L.push(B(0.04, 1.85, 0.04, '#8d9196', x, 0.93, z));
    for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) L.push(B(0.3, 0.38, 0.2, ['#c0392b', '#2f6b3a', '#e0b12a', '#2b2b30'][(i + k) % 4], x1 - 0.48, 0.56 + k * 0.5, -88.8 + i * 0.5));
    for (let k = 0; k < 4; k++) L.push(C(0.42, 0.42, 0.26, 12, '#1e1e22', -61.2, 0.14 + k * 0.27, -91.6), C(0.24, 0.24, 0.27, 10, '#55585e', -61.2, 0.14 + k * 0.27, -91.6));
    L.push(B(1.9, 0.45, 1.2, '#c0392b', -63.4, 0.5, -89.6), B(1.95, 0.08, 1.25, '#9a2f22', -63.4, 0.76, -89.6), B(0.3, 0.35, 0.3, '#3a3a3e', -63.4, 0.95, -89.6), C(0.2, 0.2, 1.95, 10, '#2b2b30', -63.4, 0.22, -90.15, 'x'));
    for (const dx of [-0.35, 0.35]) L.push(B(0.06, 0.6, 0.06, '#3a3a3e', -63.4 + dx, 1.1, -89.05));
    // des taches d'huile sous les deux premières travées, un bidon, un balai
    for (const [x, z, r] of [[-73.75, -86.9, 0.6], [-74.2, -88.6, 0.35], [-68.25, -86.4, 0.5]]) L.push(C(r, r, 0.004, 12, '#4f4c47', x, 0.052, z));
    L.push(B(0.2, 0.32, 0.14, '#c0392b', -71.6, 0.21, -93.3), C(0.012, 0.012, 1.3, 4, '#9a7b55', -76.0, 0.75, -92.8, 'y'), B(0.35, 0.08, 0.06, '#5e4a36', -76.0, 0.1, -92.8));
    // dehors, à l'ouest : la cuve à gazole sur son bac de rétention, sa pompe et son pistolet
    L.push(B(1.4, 0.3, 2.4, '#8d9196', -78.3, 0.15, -86.5), C(0.62, 0.62, 2.0, 14, '#2f6b3a', -78.3, 0.95, -86.5, 'z'), B(0.25, 0.5, 0.2, '#c0392b', -78.3, 1.75, -85.5), C(0.03, 0.03, 0.9, 5, '#1e1e22', -77.9, 1.1, -85.4));
    bati.push(...L);
    contact.jupe(x0 - 0.05, z0 - 0.05, x1 + 0.05, z0 + 0.25, 1.4, 0.4);
    plan.push({ t: 'b', x0, z0, x1, z1 });
    plusTard.push(() => {
      for (const [a, b, c, d] of [[x0, z0, x1, z0 + 0.25], [x0, z0, x0 + 0.25, z1], [x1 - 0.25, z0, x1, z1]]) col.boite(a, b, c, d).haut = true;
      for (const x of [x0 + 0.13, -71, -65.5, x1 - 0.13]) col.boiteC(x, z1 - 0.13, 0.26, 0.26);
      for (const [a, b, c, d] of [[-64.0, z0, -61.2, z0 + 1.05], [x1 - 0.72, -89.2, x1, -86.8], [-61.65, -92.05, -60.75, -91.15], [-64.4, -90.4, -62.4, -89.0], [-79.0, -87.7, -77.6, -85.3]]) col.boite(a, b, c, d);
    });
  }
  /* -- L'arbre centenaire, au milieu de la cour (Teddy, 25/11/2026 : « un arbre centenaire au milieu, avec un peu d'herbe
     autour ») : un vieux chêne, tronc épais, empattement, cinq maîtresses branches et un grand houppier ; un rond d'herbe
     bordé de tuffeau, un banc circulaire autour du tronc, des feuilles tombées ; le vieux pressoir à cage à côté. */
  {
    const X = -99.5, Z = -46.5, ECORCE = '#5a4636';
    const branche = (a, b, r0, r1) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz), g = new THREE.CylinderGeometry(r1, r0, l, 7, 1, false);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / l, dy / l, dz / l)));
      g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      return teinter(g, ECORCE, T.bois);
    };
    const L = [];
    L.push(teinter(C(0.62, 0.95, 4.4, 10, ECORCE, X, 2.2, Z), ECORCE, T.bois), teinter(C(0.95, 1.35, 0.55, 10, ECORCE, X, 0.27, Z), ECORCE, T.bois));
    const tete = [X, 4.2, Z];
    for (const [dx, dy, dz, r] of [[3.6, 3.3, 0.8, 0.3], [-3.2, 3.6, -1.4, 0.32], [0.9, 4.0, 3.5, 0.28], [-1.1, 3.8, -3.6, 0.3], [0.3, 5.4, 0.2, 0.34]]) L.push(branche(tete, [X + dx, 4.2 + dy, Z + dz], 0.5, r));
    // le houppier : de grosses touffes (le vent les balance un peu)
    const FEU = ['#6f8a3a', '#8a8f3a', '#a6823a', '#5d7a36', '#7d8a3c'];
    [[0, 10.0, 0, 4.3], [3.6, 8.4, 0.9, 3.3], [-3.3, 8.6, -1.4, 3.4], [0.9, 8.2, 3.6, 3.1], [-1.1, 8.5, -3.7, 3.2], [2.6, 10.9, -2.1, 2.7], [-2.4, 10.8, 2.2, 2.6], [-3.8, 7.6, 2.0, 2.2], [3.5, 7.8, -2.6, 2.3]].forEach(([dx, y, dz, r], i) => {
      const c = FEU[i % FEU.length], g = teinter(S(r, c, X + dx, y, Z + dz, 1, 0.78, 1, 1), c, T.feuillage), p = g.attributes.position, w = new Float32Array(p.count);
      for (let k = 0; k < p.count; k++) w[k] = 0.2 + 0.5 * Math.max(0, (p.getY(k) - (y - r * 0.78)) / (r * 1.56));
      g.setAttribute('aVent', new THREE.BufferAttribute(w, 1)); L.push(g);
    });
    // le rond d'herbe, sa bordure de tuffeau, le banc circulaire, des feuilles tombées
    L.push(teinter(C(4.3, 4.3, 0.07, 28, '#8a9a4c', X, 0.035, Z), '#8a9a4c', T.herbe));
    for (let i = 0; i < 24; i++) { const a = (i + 0.5) / 24 * Math.PI * 2; L.push(B(0.2, 0.22, 1.14, '#ebe0c6', X + Math.cos(a) * 4.42, 0.11, Z + Math.sin(a) * 4.42, -a)); }
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * Math.PI * 2, r = 1.55;
      L.push(B(0.42, 0.05, 1.2, '#9a7b55', X + Math.cos(a) * r, 0.46, Z + Math.sin(a) * r, -a), B(0.06, 0.44, 0.06, '#5e4a36', X + Math.cos(a) * (r + 0.12), 0.22, Z + Math.sin(a) * (r + 0.12)));
    }
    for (let i = 0; i < 40; i++) { const a = i * 2.39996, r = 1.6 + (i * 0.37) % 2.5; L.push(B(0.18, 0.006, 0.12, ['#c9822f', '#a6532a', '#d9a832', '#8a5a2a'][i % 4], X + Math.cos(a) * r, 0.075, Z + Math.sin(a) * r, a)); }
    bati.push(...L);
    contact.tache(X, Z, 7, 7, 0.32);
    plan.push({ t: 'a', x: X, z: Z, r: 6.5 });
    col.boiteC(X, Z, 6.1, 6.1).haut = false; // le rond (les cailloux de la cour ne s'y sèment pas)
    // le vieux pressoir à cage (il était près du bureau du chai) : la maie de pierre et son bec, la cage de douelles
    // cerclée de fer, le mouton, la vis et sa barre
    {
      const x = -104.8, z = -53.0, CER = '#3a3a3e';
      bati.push(B(1.7, 0.45, 1.7, '#cfc3a8', x, 0.225, z), B(1.5, 0.04, 1.5, '#a99a82', x, 0.44, z), B(0.3, 0.12, 0.34, '#cfc3a8', x + 0.98, 0.33, z));
      bati.push(C(0.58, 0.58, 0.85, 16, '#6b4a30', x, 0.88, z));
      for (const y of [0.6, 0.9, 1.2]) bati.push(C(0.6, 0.6, 0.05, 16, CER, x, y, z));
      bati.push(B(1.2, 0.18, 0.28, '#5b3a2a', x, 1.42, z), B(0.28, 0.18, 1.2, '#5b3a2a', x, 1.6, z));
      bati.push(C(0.06, 0.06, 1.3, 8, '#2b2b30', x, 2.2, z), C(0.13, 0.13, 0.2, 8, '#2b2b30', x, 1.85, z), B(1.7, 0.07, 0.07, '#5b3a2a', x, 1.88, z, 0.6));
      col.boiteC(x, z, 1.7, 1.7);
      contact.jupe(x - 0.85, z - 0.85, x + 0.85, z + 0.85, 0.5, 0.3);
    }
  }
  /* -- Le parking des visiteurs, à l'ouest de la cour, sous le vieux cèdre : trois places entre des rondins (on s'y gare le
     nez vers l'ouest ; hors de la sortie du van et du passage de la maison), le panneau */
  {
    for (const z of [-48.1, -50.7, -53.3, -55.9]) bati.push(teinter(C(0.11, 0.11, 4.6, 7, '#6b4a30', -112.5, 0.11, z, 'x'), '#6b4a30', T.bois));
    panneau((c, W, H) => {
      c.fillStyle = '#efe4cb'; c.fillRect(0, 0, W, H); c.strokeStyle = '#5a3f2b'; c.lineWidth = 7; c.strokeRect(5, 5, W - 10, H - 10);
      c.fillStyle = '#2c4f8a'; c.beginPath(); c.roundRect(W * 0.08, H * 0.18, H * 0.64, H * 0.64, 10); c.fill();
      c.fillStyle = '#ffffff'; c.font = `bold ${Math.round(H * 0.5)}px Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('P', W * 0.08 + H * 0.32, H * 0.52);
      c.fillStyle = '#5a3f2b'; c.font = `bold ${Math.round(H * 0.28)}px Georgia, serif`; c.textAlign = 'left'; c.fillText('Visiteurs', W * 0.08 + H * 0.78, H * 0.52);
    }, 1.3, 0.5, -110.4, 1.3, -46.7, Math.PI / 2);
  }
  /* -- l'aire de remplissage (mission 2 ; Teddy, 24/11/2026 : « une espèce de fosse pour le tracteur, avec des détails ») :
     un bac de béton entre deux murets de rétention, où le tracteur entre par le sud et ressort au nord vers les vignes
     (le muret ouest s'ouvre pour aller à la cuve d'eau) ; joints de dilatation, caniveau central à grille qui mène à la
     fosse de récupération, regard du débourbeur ; la cuve d'eau de 1 000 L dans sa cage, son tuyau jusqu'à la potence,
     le compteur d'eau, la vanne, la potence au-dessus de la cuve du pulvérisateur ; la réserve d'eau claire pour se
     laver les mains ; l'armoire fermée des produits, le bac de rétention et ses bidons, l'extincteur ; des bornes
     jaunes. Lieux : lieux.aire (le tracteur s'arrête au milieu, tourné vers le nord), aire.cuve. */
  {
    const BET = '#aaa69d', MUR = '#bab5ab', JAUNE = '#e0b12a', NOIR2 = '#1e1e22', GRIS = '#6a6d74';
    // les murets : à l'est d'un tenant, à l'ouest en deux, ouverts devant la cuve d'eau ; leurs bouts peints en jaune et noir
    const muret = (x, z0, z1, h) => {
      const z = (z0 + z1) / 2, l = z1 - z0;
      bati.push(B(0.24, h, l, MUR, x, h / 2, z), B(0.3, 0.03, l + 0.04, '#cdc8bd', x, h + 0.015, z));
      for (const zb of [z0 + 0.1, z1 - 0.1]) for (let k = 0; k < 2; k++) bati.push(B(0.25, h / 2, 0.2, k ? NOIR2 : JAUNE, x, h / 4 + k * h / 2 + 0.002, zb));
      col.boite(x - 0.12, z0, x + 0.12, z1);
    };
    muret(-82.88, -71.25, -62.75, 0.3); muret(-89.12, -71.25, -68.4, 0.3); muret(-89.12, -66.6, -62.75, 0.3);
    // joints de dilatation, les deux rebords en pente à l'entrée et à la sortie
    for (const z of [-69.1, -66.9, -64.7]) bati.push(B(5.76, 0.006, 0.03, '#7d796f', -86, 0.047, z));
    for (const z of [-62.55, -71.45]) bati.push(B(6, 0.05, 0.42, BET, -86, 0.02, z));
    // le caniveau central à grille, la fosse de récupération au nord, le regard du débourbeur
    bati.push(B(0.34, 0.012, 7.3, NOIR2, -86, 0.05, -66.85), B(0.42, 0.014, 7.38, GRIS, -86, 0.048, -66.85));
    for (let z = -70.35; z < -63.3; z += 0.36) bati.push(B(0.3, 0.016, 0.04, '#8d9298', -86, 0.054, z));
    bati.push(B(1.1, 0.014, 1.1, GRIS, -86, 0.049, -70.85), B(0.96, 0.012, 0.96, NOIR2, -86, 0.051, -70.85));
    for (let k = -4; k <= 4; k++) bati.push(B(0.03, 0.016, 0.92, '#8d9298', -86 + k * 0.105, 0.056, -70.85));
    bati.push(C(0.42, 0.42, 0.05, 14, '#5d6066', -90.6, 0.03, -71.9), C(0.36, 0.36, 0.055, 14, '#3a3a3e', -90.6, 0.035, -71.9));
    // la cuve d'eau de 1 000 L dans sa cage, sur son socle ; son tuyau, le compteur d'eau, la vanne, la potence
    {
      const x = -90.2, z = -67.5;
      bati.push(B(1.3, 0.5, 1.3, '#8f8a80', x, 0.25, z), B(1.15, 1.05, 1.15, '#eef0ec', x, 1.03, z), C(0.16, 0.16, 0.1, 10, '#2f6db0', x, 1.6, z));
      for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) bati.push(B(0.05, 1.15, 0.05, '#9aa1a8', x + dx, 1.08, z + dz));
      for (const y of [0.6, 1.08, 1.56]) bati.push(B(1.24, 0.04, 1.24, '#9aa1a8', x, y, z));
      bati.push(C(0.07, 0.07, 0.16, 8, NOIR2, x + 0.5, 0.62, z + 0.45, 'x'));
      col.boiteC(x, z, 1.4, 1.4);
      contact.jupe(x - 0.65, z - 0.65, x + 0.65, z + 0.65, 0.6, 0.35);
    }
    // la potence : assez haute pour que la cabine de l'enjambeur passe dessous ; son tuyau tombe sur le couvercle de sa
    // cuve quand il s'arrête au milieu de l'aire, tourné vers le nord (enjambeur.js : pulve.remplissage)
    const ZP = -64.5;
    bati.push(manche([-89.7, 0.08, -67.0], [-89.65, 0.08, ZP], 0.035, '#2f6db0'), manche([-89.65, 0.08, ZP], [-89.65, 0.9, ZP], 0.035, '#2f6db0'));
    bati.push(B(0.16, 4.9, 0.16, '#5d6b78', -89.65, 2.45, ZP), B(3.8, 0.12, 0.12, '#5d6b78', -87.8, 4.6, ZP), manche([-89.65, 3.7, ZP], [-88.7, 4.6, ZP], 0.04, '#5d6b78'));
    bati.push(B(0.3, 0.3, 0.2, '#2f6db0', -89.5, 1.25, ZP), B(0.16, 0.16, 0.02, '#dfe6ea', -89.5, 1.28, ZP + 0.11), C(0.12, 0.12, 0.03, 10, '#c0392b', -89.45, 0.95, ZP + 0.14, 'z'));
    bati.push(manche([-86.1, 4.6, ZP], [-86.05, 3.82, ZP + 0.05], 0.045, NOIR2), C(0.06, 0.05, 0.16, 8, GRIS, -86.05, 3.75, ZP + 0.05));
    col.boiteC(-89.65, ZP, 0.35, 0.35);
    // la réserve d'eau claire pour se laver les mains, son robinet
    bati.push(B(0.42, 0.5, 0.32, '#eef0ec', -90.4, 1.0, -64.6), B(0.08, 0.75, 0.08, GRIS, -90.4, 0.38, -64.6), C(0.02, 0.02, 0.12, 6, '#9aa1a8', -90.4, 0.72, -64.42, 'z'));
    col.boiteC(-90.4, -64.6, 0.45, 0.35);
    // des bornes jaunes devant la cuve et la potence
    for (const z of [-69.6, -65.4]) { bati.push(C(0.08, 0.08, 0.9, 8, JAUNE, -89.55, 0.45, z), C(0.085, 0.085, 0.08, 8, NOIR2, -89.55, 0.7, z)); col.boiteC(-89.55, z, 0.2, 0.2); }
    // l'armoire fermée des produits et son pictogramme, le bac de rétention et ses bidons, l'extincteur
    bati.push(B(1.3, 1.9, 0.6, '#55705a', -83.4, 0.95, -71.4), B(1.32, 0.06, 0.62, '#3e5244', -83.4, 1.92, -71.4), B(0.3, 0.3, 0.02, '#e8b923', -83.4, 1.3, -71.09), B(0.2, 0.2, 0.025, NOIR2, -83.4, 1.3, -71.085));
    bati.push(B(0.03, 0.22, 0.02, '#9aa1a8', -83.15, 1.0, -71.09), B(1.0, 0.22, 0.72, '#2f6b3a', -82.05, 0.11, -71.35));
    for (const [dx, c] of [[-0.3, '#f1f1ee'], [0, '#f1f1ee'], [0.3, '#2f6db0']]) bati.push(B(0.24, 0.34, 0.16, c, -82.05 + dx, 0.39, -71.35), C(0.03, 0.03, 0.04, 6, dx > 0 ? '#f1f1ee' : '#2f6db0', -82.05 + dx + 0.06, 0.58, -71.35));
    bati.push(C(0.07, 0.07, 0.42, 8, '#c0392b', -84.25, 1.0, -71.12), B(0.06, 0.04, 0.05, NOIR2, -84.25, 1.24, -71.08));
    col.boiteC(-83.4, -71.4, 1.4, 0.7); col.boiteC(-82.05, -71.35, 1.05, 0.75);
    contact.jupe(-84.05, -71.7, -82.75, -71.1, 0.6, 0.35);
    // (plus de panneau à l'entrée : Teddy, 25/11/2026, « c'est moche »)
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
  // Côté sud ; en x = 128, le laboratoire d'œnologie (mission 3 : on y dépose l'échantillon de la cuvée) : une devanture
  // bleu-gris, sa verrerie en vitrine, l'intérieur carrelé de blanc, l'enseigne et une plaque de laiton près de la porte
  let labo = null;
  for (const [x, w, d, h] of [[40, 10, 8, 6.5], [54, 9, 8, 7], [68, 12, 9, 6.4], [84, 10, 8, 7], [100, 10, 8, 6.6], [114, 11, 9, 7.2], [128, 10, 8, 6.4], [142, 12, 9, 6.8]]) {
    const o = maison({ x, z: 18.5 + d / 2, w, d, h, rot: Math.PI, volets: pick(VOLETS), ...(x === 128 ? { vitrine: '#4f6272', boutique: 'labo', porteC: '#4f6272', tirage: true } : {}) });
    if (x !== 128) continue;
    labo = o; portes.labo = o.entree;
    enseigne('LABORATOIRE D\'ŒNOLOGIE', facade(o, -w * 0.14, 0.37), 3.05, 6.2, 0.54, '#4f6272', '#f3efe6');
    const p = facade(o, w / 2 - 0.42, 0.012);
    atlas.poser(160, 112, (c, W, H) => {
      const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#e4c578'); g.addColorStop(0.5, '#c9a55a'); g.addColorStop(1, '#a8873e');
      c.fillStyle = g; c.fillRect(0, 0, W, H); c.strokeStyle = '#7d6328'; c.lineWidth = 4; c.strokeRect(5, 5, W - 10, H - 10);
      c.fillStyle = '#2b2414'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 19px Georgia, serif'; c.fillText('LABORATOIRE', W / 2, H * 0.33);
      c.font = '14px Georgia, serif'; c.fillText('Analyses des vins', W / 2, H * 0.57); c.fillText('Dépôt d\'échantillons', W / 2, H * 0.76);
    }, 0.5, 0.35, p.x, 1.55, p.z, p.rot);
  }
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

  /* ------------------------------------------------------------ l'école
     Teddy, 26/11/2026 : « il manque une école dans ce village et des enfants ; ils sont à l'école, dans une enceinte
     fermée, avec des jeux d'enfants dans la cour ; l'école sera belle ». L'École des Tilleuls, à l'est de la place, entre
     les jardins de la rangée nord de la départementale et l'église : une école communale de la Loire, en tuffeau et
     ardoise, tournée vers sa cour (à l'ouest). Au milieu, le pavillon : la porte et ses marches, la devise gravée au-dessus
     (bandeau), « ÉCOLE » gravé dans la frise, le fronton et son horloge (ses aiguilles : ecole.js), les deux drapeaux, le
     campanile et sa cloche (ecole.js) ; de part et d'autre, une aile de classe aux grandes fenêtres (derrière la vitre, la
     classe peinte et les dessins d'enfants : ecole.js). La cour, en enrobé : le préau, deux tilleuls (un banc rond autour
     du premier), la marelle, l'escargot, des points de couleur, le terrain et son but peints au sol, un panier de
     basket ; les jeux des petits sur un sol souple (la structure à toboggan, le portique et ses deux balançoires, deux jeux
     à ressort, le bac à sable) ; le potager et la cabane ; des bancs, une jardinière. L'enceinte : un mur bahut et sa
     grille du côté de la place (on voit la cour), des murs de moellons ailleurs, les piliers du portail (ses vantaux :
     ecole.js). Dehors : le parvis pavé qui longe la grille, les barrières devant le portail, la plaque, le panneau
     d'affichage, les panneaux « École » sur les routes, deux passages piétons (la départementale, la rue de la place).
     On n'y entre jamais : toute l'enceinte est une boîte de collision (posée après les herbes : leur tirage au sort ne
     bouge pas ; celles qui y tombent sont réduites à rien) ; le bâtiment arrête aussi la caméra. Rien n'est tiré au sort.
     Devant le portail, au nord des barrières (x de 112,4 à 113,9, z de -35,8 à -38,6), la place d'un range-vélos. */
  const ECOLE = { x0: 114.3, x1: 143.7, z0: -39.6, z1: -8.4 }, PARVIS_E = { x0: 108.5, x1: 114.5, z0: -29.3, z1: -9.8 };
  const dansEcole = (x, z, m = 0) => (x > ECOLE.x0 - m && x < ECOLE.x1 + m && z > ECOLE.z0 - m && z < ECOLE.z1 + m) || (x > PARVIS_E.x0 - m && x < PARVIS_E.x1 && z > PARVIS_E.z0 && z < PARVIS_E.z1 + m);
  // Les chemins des enfants, de chez eux au portail de l'école : la porte de leur maison (dans la rue de la place, sur la
  // place, le long de la départementale, de part et d'autre), les trottoirs (au bord de la rue de la place, qui n'en a
  // pas), les deux passages piétons, la place, le sas des barrières. Dans l'autre sens, le soir.
  const DEVANT_ECOLE = [[103.5, -31.2], [110.6, -33.4], [112.8, -33.0]], RUE_EST = [[97.6, 2.6], [97.6, -26.0], ...DEVANT_ECOLE];
  const ZEBRE = [[92.3, -26.8], [98.3, -27.0], ...DEVANT_ECOLE], TRAVERSEE = [[101.5, 14.2], [101.5, 5.8], [99.6, 3.6], ...RUE_EST];
  const CHEMINS_ECOLE = [
    [[99.6, -22.0], [99.6, -28.2], ...DEVANT_ECOLE], [[99.6, -11.8], [99.5, -28.2], ...DEVANT_ECOLE],
    [[90.3, -26.0], ...ZEBRE], [[90.3, -16.25], [91.6, -17.0], ...ZEBRE],
    [[108.0, -65.5], [109.3, -61.5], [109.3, -37.6], [110.6, -34.2], [112.8, -33.0]],
    [[72.3, -38.0], [76.2, -37.4], [86.0, -33.6], [100.5, -32.2], [110.6, -33.4], [112.8, -33.0]],
    [[72.3, -58.0], [76.5, -56.8], [88.0, -50.5], [100.5, -32.2], [110.6, -33.4], [112.8, -33.0]],
    [[124.0, 1.9], [124.0, 3.6], [99.6, 3.6], ...RUE_EST], [[137.0, 1.9], [137.0, 3.6], [99.6, 3.6], ...RUE_EST],
    [[48.25, 1.9], [48.25, 3.6], [92.3, 3.6], ...ZEBRE], [[34.0, 1.9], [34.0, 3.6], [92.3, 3.6], ...ZEBRE],
    [[114.0, 18.2], [114.0, 16.4], [103.0, 16.4], ...TRAVERSEE], [[84.0, 18.2], [84.0, 16.4], [100.0, 16.4], ...TRAVERSEE],
    [[142.0, 18.2], [142.0, 16.4], [103.0, 16.4], ...TRAVERSEE], [[68.0, 18.2], [68.0, 16.4], [100.0, 16.4], ...TRAVERSEE],
  ];
  const lieuxEcole = ecole();
  function ecole() {
    const L = [], D = []; // le bâti (fusionné avec son quartier) ; les petits détails (dessinés de près : proches)
    const FER = '#2b3a33', MOEL = MOELLONS[0], ENROBE = '#78736b', BLANC = '#ece6d4', JAUNE = '#e0b13a', ROUGE = '#c8443a', VERT = '#3f8a4f', BOIS = '#9a7b55', BOIS2 = '#6b4a30';
    // un pavé tourné autour de x ou de z, posé en (x, y, z)
    const Bx = (w, h, d, c, x, y, z, rx) => deplacer(B(w, h, d, c).rotateX(rx), x, y, z);
    const Bz = (w, h, d, c, x, y, z, rz) => deplacer(B(w, h, d, c).rotateZ(rz), x, y, z);
    // un trait peint au sol de a à b (largeur l)
    const trait = (ax, az, bx, bz, l, c, P = L) => { const dx = bx - ax, dz = bz - az; P.push(B(Math.hypot(dx, dz) + l * 0.5, 0.01, l, c, (ax + bx) / 2, 0.046, (az + bz) / 2, Math.atan2(-dz, dx))); };
    const cercle = (x, z, r, l, c, n = 20, a0 = 0, a1 = Math.PI * 2) => { for (let i = 0; i < n; i++) { const p = a0 + (a1 - a0) * i / n, q = a0 + (a1 - a0) * (i + 1) / n; trait(x + Math.cos(p) * r, z + Math.sin(p) * r, x + Math.cos(q) * r, z + Math.sin(q) * r, l, c); } };
    // une inscription gravée dans la pierre : les lettres en creux (l'ombre en haut à gauche, la lumière en bas à droite)
    const grave = (txt, taille, fond) => (c, W, H) => {
      c.fillStyle = fond; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(120,104,80,0.55)'; c.lineWidth = 3; c.strokeRect(3, 3, W - 6, H - 6);
      c.font = `${taille}px Georgia, 'Times New Roman', serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(255,250,236,0.85)'; c.fillText(txt, W / 2 + 1.5, H / 2 + 3.5);
      c.fillStyle = '#6f6250'; c.fillText(txt, W / 2, H / 2 + 2);
      c.fillStyle = '#9d8f76'; c.fillText(txt, W / 2 + 0.8, H / 2 + 2.8);
    };

    /* -- le sol : la cour en enrobé (sous le bâtiment aussi), le parvis pavé qui longe la grille jusqu'à la place */
    L.push(B(ECOLE.x1 - ECOLE.x0, 0.08, ECOLE.z1 - ECOLE.z0, ENROBE, (ECOLE.x0 + ECOLE.x1) / 2, 0, (ECOLE.z0 + ECOLE.z1) / 2));
    L.push(B(PARVIS_E.x1 - PARVIS_E.x0, 0.08, PARVIS_E.z1 - PARVIS_E.z0, '#cdb998', (PARVIS_E.x0 + PARVIS_E.x1) / 2, 0, (PARVIS_E.z0 + PARVIS_E.z1) / 2));
    rect(ECOLE.x0, ECOLE.z0, ECOLE.x1, ECOLE.z1, '#8f8a80'); rect(PARVIS_E.x0, PARVIS_E.z0, PARVIS_E.x1, PARVIS_E.z1, '#cdb998');

    /* -- l'enceinte : à l'ouest, côté place, un mur bahut et sa grille (barreaux à pointe de lance, deux lisses), des
       piliers de tuffeau ; le portail entre deux piliers plus hauts (ses vantaux : ecole.js) ; ailleurs, des murs de
       moellons et leur chaperon, plus haut derrière le préau */
    const XG = 114.5, PZ0 = -31.45, PZ1 = -34.55;
    const piliers = [-8.65, -12.5, -16.35, -20.2, -24.05, -27.9, PZ0 + 0.3, PZ1 - 0.3, -37.0, -39.4];
    for (let i = 0; i < piliers.length - 1; i++) {
      const za = piliers[i] - 0.28, zb = piliers[i + 1] + 0.28;
      if (i === 6) continue; // le portail
      const zc = (za + zb) / 2, l = za - zb;
      L.push(B(0.4, 0.72, l, MOEL, XG, 0.36, zc), B(0.48, 0.08, l + 0.02, APPUI, XG, 0.76, zc));
      L.push(B(0.03, 0.04, l, FER, XG, 0.9, zc), B(0.03, 0.04, l, FER, XG, 1.82, zc));
      for (let z = za - 0.07; z > zb; z -= 0.13) D.push(B(0.022, 1.2, 0.022, FER, XG, 1.38, z), C(0, 0.024, 0.08, 4, FER, XG, 2.02, z, 'y', Math.PI / 4));
    }
    for (const z of piliers) {
      const haut = z === PZ0 + 0.3 || z === PZ1 - 0.3 ? 2.5 : 2.05;
      L.push(B(0.56, haut, 0.56, TUF, XG, haut / 2, z), B(0.68, 0.1, 0.68, APPUI, XG, haut + 0.05, z));
      if (haut > 2.1) L.push(S(0.17, APPUI, XG, haut + 0.27, z, 1, 1, 1, 1), B(0.22, 0.06, 0.22, APPUI, XG, haut + 0.12, z));
      else L.push(C(0, 0.42, 0.22, 4, APPUI, XG, haut + 0.21, z, 'y', Math.PI / 4));
    }
    contact.jupe(XG - 0.2, ECOLE.z0, XG + 0.2, ECOLE.z1, 0.5, 0.3);
    const mur = (x0, z0, x1, z1, h) => {
      L.push(B(x1 - x0, h, z1 - z0, MOEL, (x0 + x1) / 2, h / 2, (z0 + z1) / 2), B(x1 - x0 + 0.1, 0.12, z1 - z0 + 0.1, APPUI, (x0 + x1) / 2, h + 0.06, (z0 + z1) / 2));
      contact.jupe(x0, z0, x1, z1, 0.9, 0.42);
      plan.push({ t: 'b', x0, z0, x1, z1 });
    };
    mur(XG + 0.2, -8.65, 122.0, -8.2, 2.2); mur(122.0, -8.65, 133.4, -8.2, 3.5); mur(133.4, -8.65, ECOLE.x1, -8.2, 2.2); // au sud (derrière les jardins)
    mur(ECOLE.x1 - 0.45, ECOLE.z0, ECOLE.x1, -8.65, 2.2); // à l'est (les vignes)
    mur(XG + 0.2, ECOLE.z0, ECOLE.x1 - 0.45, -39.2, 2.2); // au nord (l'église)

    /* -- le bâtiment : deux ailes de classe d'un étage sous un grand toit d'ardoise, le pavillon au milieu, plus haut, en
       avancée ; la façade à l'ouest (sur la cour) */
    const XF = 133.6, XB = 142.4, XM = (XF + XB) / 2, ZS = -12.4, ZN = -37.2, ZP = -24.8, PW = 7.0, XP = 132.9, HW = 5.6, HP = 8.4, SOCLE = '#b9a98b';
    const fenetresClasse = [];
    for (const [za, zb] of [[ZS, ZP + PW / 2], [ZP - PW / 2, ZN]]) {
      const zc = (za + zb) / 2, l = za - zb;
      L.push(B(XB - XF, HW, l, TUF, XM, HW / 2, zc), B(XB - XF + 0.14, 0.9, l, SOCLE, XM, 0.45, zc));
      L.push(...toit(XB - XF, l, 3.2, ARD, XM, HW, zc, true, { mur: TUF }));
      for (const s of [-1, 1]) L.push(B(0.2, 0.28, l, APPUI, XM + s * ((XB - XF) / 2 + 0.07), HW - 0.2, zc));
      // la souche de cheminée, sur le pan de derrière
      L.push(B(0.6, 2.9, 0.7, APPUI, XB - 1.9, 7.6, zc), B(0.74, 0.1, 0.84, PIERRE, XB - 1.9, 9.1, zc), B(0.14, 0.28, 0.14, '#9a5a3e', XB - 1.9, 9.28, zc + 0.15), B(0.14, 0.28, 0.14, '#9a5a3e', XB - 1.9, 9.28, zc - 0.15));
      for (const k of [-1, 0, 1]) {
        const zw = zc + k * 2.7;
        fenetresClasse.push(zw);
        // les grandes fenêtres de classe (côté cour) : l'encadrement de pierre, l'appui, le linteau et sa clé ; le cadre et
        // les petits bois blancs (la vitre et la classe derrière : vitres, ecole.js)
        L.push(B(0.05, 2.98, 0.18, APPUI, XF - 0.025, 2.3, zw - 0.84), B(0.05, 2.98, 0.18, APPUI, XF - 0.025, 2.3, zw + 0.84), B(0.3, 0.1, 1.9, APPUI, XF - 0.13, 0.95, zw), B(0.08, 0.34, 1.96, APPUI, XF - 0.04, 3.8, zw), B(0.12, 0.46, 0.3, TAILLE, XF - 0.07, 3.82, zw));
        L.push(B(0.06, 2.66, 0.08, '#efe7d6', XF - 0.065, 2.3, zw - 0.75), B(0.06, 2.66, 0.08, '#efe7d6', XF - 0.065, 2.3, zw + 0.75), B(0.06, 0.08, 1.58, '#efe7d6', XF - 0.065, 3.6, zw), B(0.06, 0.08, 1.58, '#efe7d6', XF - 0.065, 1.0, zw));
        D.push(B(0.04, 2.56, 0.05, '#efe7d6', XF - 0.07, 2.3, zw), B(0.04, 0.04, 1.5, '#efe7d6', XF - 0.07, 1.86, zw), B(0.04, 0.04, 1.5, '#efe7d6', XF - 0.07, 2.73, zw), B(0.04, 0.04, 1.5, '#efe7d6', XF - 0.07, 3.17, zw));
        vitresB.push(B(0.01, 2.6, 1.5, '#3a5068', XF - 0.055, 2.3, zw));
        // derrière : des fenêtres plus simples (les vignes)
        L.push(B(0.08, 2.5, 1.36, '#efe7d6', XB + 0.03, 2.3, zw), B(0.1, 2.3, 1.16, '#2f3c4f', XB + 0.05, 2.3, zw), B(0.24, 0.08, 1.5, APPUI, XB + 0.1, 1.02, zw));
        D.push(B(0.03, 2.3, 0.04, '#efe7d6', XB + 0.1, 2.3, zw), B(0.03, 0.04, 1.16, '#efe7d6', XB + 0.1, 2.7, zw));
      }
      // le pignon du bout : un œil-de-bœuf dans son anneau de pierre
      const zg = za === ZS ? ZS + 0.06 : ZN - 0.06, sg = za === ZS ? 1 : -1;
      L.push(C(0.5, 0.5, 0.1, 16, APPUI, XM, HW + 1.15, zg, 'z'), C(0.36, 0.36, 0.12, 16, '#2f3c4f', XM, HW + 1.15, zg + sg * 0.01, 'z'));
    }
    // les chaînes d'angle des ailes (tuffeau lisse, un bloc sur deux plus long)
    for (const [x, z, s] of [[XF, ZS, 1], [XF, ZN, -1], [XB, ZS, 1], [XB, ZN, -1]]) for (let i = 0, y = 1.15; y < HW - 0.4; i++, y += 0.5) {
      const l = i % 2 ? 0.32 : 0.56;
      plaque(x + (x === XF ? -0.006 : 0.006), y, z - s * l / 2, 'x', x === XF ? -1 : 1, l, 0.46);
    }
    // le pavillon : rez-de-chaussée (la porte, deux fenêtres), le bandeau et la devise, l'étage (trois fenêtres), la frise
    // et « ÉCOLE », la corniche, le fronton (le pignon du toit) et son horloge ; les pilastres d'angle
    {
      const xc = (XP + XB) / 2;
      L.push(B(XB - XP, HP, PW, TUF, xc, HP / 2, ZP), B(XB - XP + 0.14, 0.9, PW + 0.14, SOCLE, xc, 0.45, ZP));
      L.push(...toit(XB - XP, PW, 3.0, ARD2, xc, HP, ZP, false, { mur: TUF }));
      L.push(B(0.12, 0.34, PW + 0.1, APPUI, XP - 0.06, 4.17, ZP), B(0.26, 0.3, PW + 0.24, APPUI, XP - 0.11, HP - 0.15, ZP), B(0.18, 0.12, PW + 0.12, APPUI, XP - 0.07, HP - 0.36, ZP));
      for (const s of [-1, 1]) L.push(B(0.12, HP - 0.9, 0.6, TAILLE, XP - 0.06, 0.9 + (HP - 0.9) / 2, ZP + s * (PW / 2 - 0.3)));
      // la porte : l'encadrement, l'imposte vitrée, le noir du couloir (on le voit quand les vantaux s'ouvrent : ecole.js) ;
      // trois marches de pierre
      L.push(B(0.08, 3.45, 2.4, TAILLE, XP - 0.04, 2.24, ZP), B(0.12, 0.08, 2.6, APPUI, XP - 0.07, 3.93, ZP), B(0.02, 2.78, 1.84, '#231f1c', XP - 0.085, 1.9, ZP));
      vitresB.push(B(0.01, 0.42, 1.8, '#3a5068', XP - 0.1, 3.56, ZP));
      D.push(B(0.03, 0.06, 1.84, '#efe7d6', XP - 0.1, 3.32, ZP), B(0.03, 0.42, 0.04, '#efe7d6', XP - 0.1, 3.56, ZP), B(0.03, 0.42, 0.04, '#efe7d6', XP - 0.1, 3.56, ZP - 0.45), B(0.03, 0.42, 0.04, '#efe7d6', XP - 0.1, 3.56, ZP + 0.45));
      for (let k = 0; k < 3; k++) L.push(B(1.0 - k * 0.33, 0.17, 3.0 - k * 0.2, '#cbbf9f', XP - 0.5 + k * 0.165, 0.085 + k * 0.17, ZP));
      // deux fenêtres au rez-de-chaussée, trois à l'étage
      for (const [zw, y, hh, w] of [[ZP - 2.3, 2.4, 2.2, 1.0], [ZP + 2.3, 2.4, 2.2, 1.0], [ZP - 1.8, 5.85, 1.6, 0.95], [ZP, 5.85, 1.6, 0.95], [ZP + 1.8, 5.85, 1.6, 0.95]]) {
        L.push(B(0.05, hh + 0.3, w + 0.32, APPUI, XP - 0.025, y, zw), B(0.08, hh + 0.12, w + 0.12, '#efe7d6', XP - 0.04, y, zw), B(0.1, hh - 0.04, w - 0.08, '#2f3c4f', XP - 0.05, y, zw), B(0.28, 0.08, w + 0.4, APPUI, XP - 0.13, y - hh / 2 - 0.12, zw));
        D.push(B(0.03, hh - 0.04, 0.04, '#efe7d6', XP - 0.105, y, zw), B(0.03, 0.04, w - 0.08, '#efe7d6', XP - 0.105, y + hh / 6, zw), B(0.03, 0.04, w - 0.08, '#efe7d6', XP - 0.105, y - hh / 6, zw));
      }
      // la frise : « ÉCOLE » gravé dans un cartouche ; le bandeau : la devise gravée au-dessus de la porte
      L.push(B(0.06, 0.78, 3.5, TAILLE, XP - 0.03, 7.45, ZP));
      atlas.poser(384, 80, grave('ÉCOLE', 64, '#e6dcc6'), 3.2, 0.66, XP - 0.065, 7.45, ZP, -Math.PI / 2);
      atlas.poser(768, 44, grave('LIBERTÉ   ÉGALITÉ   FRATERNITÉ', 30, '#ddd1b6'), 5.6, 0.31, XP - 0.125, 4.17, ZP, -Math.PI / 2);
      // l'horloge du fronton : le cadran émaillé (ses aiguilles : ecole.js) dans un anneau de pierre ; un œil-de-bœuf derrière
      L.push(C(0.66, 0.66, 0.1, 24, APPUI, XP - 0.03, HP + 1.15, ZP, 'x'));
      atlas.poser(128, 128, (c, W, H) => {
        c.clearRect(0, 0, W, H);
        c.fillStyle = '#26262a'; c.beginPath(); c.arc(W / 2, H / 2, W / 2 - 1, 0, 7); c.fill();
        c.fillStyle = '#f6f2e6'; c.beginPath(); c.arc(W / 2, H / 2, W / 2 - 6, 0, 7); c.fill();
        c.fillStyle = '#1d1d1d'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 13px Georgia, serif';
        const R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
        for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = W / 2 - 9, r1 = i % 5 ? r0 - 3 : r0 - 6; c.lineWidth = i % 5 ? 1 : 2; c.beginPath(); c.moveTo(W / 2 + Math.sin(a) * r0, H / 2 - Math.cos(a) * r0); c.lineTo(W / 2 + Math.sin(a) * r1, H / 2 - Math.cos(a) * r1); c.strokeStyle = '#1d1d1d'; c.stroke(); }
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = W / 2 - 25; c.fillText(R[i], W / 2 + Math.sin(a) * r, H / 2 - Math.cos(a) * r); }
      }, 1.08, 1.08, XP - 0.09, HP + 1.15, ZP, -Math.PI / 2);
      L.push(C(0.42, 0.42, 0.1, 16, APPUI, XB + 0.03, HP + 1.15, ZP, 'x'), C(0.3, 0.3, 0.12, 16, '#2f3c4f', XB + 0.04, HP + 1.15, ZP, 'x'));
      // les deux drapeaux au-dessus de la porte, sur leurs hampes penchées, écartées de la façade (on les voit de face comme
      // de côté) : le tricolore au nord, le drapeau européen au sud (ses étoiles : l'atlas, des deux côtés). U : le long de
      // la hampe ; N : vers le bas, dans le plan du drapeau ; W : la normale du drapeau
      for (const s of [-1, 1]) {
        const z = ZP + s * 1.45, a = [XP - 0.1, 4.55, z], al = 0.5, be = 0.6, l = 1.8;
        const U = new THREE.Vector3(-Math.cos(be) * Math.cos(al), Math.sin(al), s * Math.sin(be) * Math.cos(al)), N = new THREE.Vector3(-Math.cos(be) * Math.sin(al), -Math.cos(al), s * Math.sin(be) * Math.sin(al));
        const Hn = N.clone().negate(), W = new THREE.Vector3().crossVectors(U, Hn).normalize(), base = new THREE.Matrix4().makeBasis(U, Hn, W);
        const b = [a[0] + U.x * l, a[1] + U.y * l, a[2] + U.z * l];
        L.push(manche(a, b, 0.024, '#d8d8d8'), B(0.1, 0.1, 0.1, '#9a8a5a', XP - 0.05, 4.55, z), S(0.045, '#c9a55a', b[0] + U.x * 0.04, b[1] + U.y * 0.04, b[2] + U.z * 0.04));
        const centre = d => [a[0] + U.x * d + N.x * 0.36, a[1] + U.y * d + N.y * 0.36, a[2] + U.z * d + N.z * 0.36];
        if (s < 0) [['#2b4ea2', 0.62], ['#f4f1ea', 0.95], ['#d23a3a', 1.28]].forEach(([c, d]) => { const [cx, cy, cz] = centre(d + 0.165); L.push(deplacer(B(0.33, 0.66, 0.025, c).applyMatrix4(base), cx, cy, cz)); });
        else {
          const [cx, cy, cz] = centre(1.11), envers = new THREE.Matrix4().makeBasis(U.clone().negate(), Hn, W.clone().negate());
          const k = atlas.poser(132, 88, (c, Wd, Hd) => {
            c.fillStyle = '#1f3c96'; c.fillRect(0, 0, Wd, Hd); c.fillStyle = '#f2c230';
            for (let i = 0; i < 12; i++) {
              const t = i / 12 * Math.PI * 2, x0 = Wd / 2 + Math.sin(t) * Hd * 0.33, y0 = Hd / 2 - Math.cos(t) * Hd * 0.33;
              c.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 2.4 : 5.6, u = j / 10 * Math.PI * 2; c.lineTo(x0 + Math.sin(u) * r, y0 - Math.cos(u) * r); } c.fill();
            }
          }, 0.001, 0.001, cx, -2, cz, 0);
          atlas.copie(k, new THREE.PlaneGeometry(0.99, 0.66).applyMatrix4(base).translate(cx + W.x * 0.006, cy + W.y * 0.006, cz + W.z * 0.006));
          atlas.copie(k, new THREE.PlaneGeometry(0.99, 0.66).applyMatrix4(envers).translate(cx - W.x * 0.006, cy - W.y * 0.006, cz - W.z * 0.006));
        }
      }
      // le campanile sur le faîtage, côté fronton : quatre poteaux, la poutre de la cloche (la cloche : ecole.js), un toit
      // pointu d'ardoise, la girouette
      const xk = XP + 1.4;
      for (const [dx, dz] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) L.push(B(0.1, 1.75, 0.1, BOIS2, xk + dx, 11.75, ZP + dz));
      L.push(B(1.0, 0.1, 0.1, '#5a3f2b', xk, 12.56, ZP), B(1.04, 0.12, 1.04, BOIS2, xk, 12.66, ZP), B(1.0, 0.14, 1.0, BOIS2, xk, 10.95, ZP));
      L.push(C(0, 0.78, 0.78, 4, ARD, xk, 13.1, ZP, 'y', Math.PI / 4), B(0.03, 0.7, 0.03, '#2b2b30', xk, 13.8, ZP), B(0.55, 0.04, 0.03, '#2b2b30', xk, 13.92, ZP), C(0, 0.05, 0.12, 4, '#2b2b30', xk - 0.3, 13.92, ZP, 'x'));
      contact.jupe(XP - 0.1, ZP - PW / 2, XB, ZP + PW / 2, 1.5, 0.45);
    }
    contact.jupe(XF, ZN, XB, ZS, 1.6, 0.5);
    plan.push({ t: 'b', x0: XF, z0: ZN, x1: XB, z1: ZS }, { t: 'b', x0: XP, z0: ZP - PW / 2, x1: XF, z1: ZP + PW / 2 });

    /* -- le préau, contre le mur du sud : une dalle, quatre colonnes de fonte, la poutre, un toit d'ardoise à un pan, le
       dessous en planches ; dessous, deux bancs, la rangée de portemanteaux (des manteaux, des sacs), un panneau de liège
       couvert de dessins */
    {
      const x0 = 122.0, x1 = 133.0, z0 = -12.95, z1 = -8.65, xc = (x0 + x1) / 2;
      L.push(B(x1 - x0, 0.12, z1 - z0, '#8f8a80', xc, 0.06, (z0 + z1) / 2));
      for (const x of [x0 + 0.3, 125.9, 129.5, x1 - 0.3]) L.push(C(0.075, 0.095, 2.95, 8, FER, x, 1.6, z0 + 0.2), C(0.13, 0.13, 0.12, 8, FER, x, 3.06, z0 + 0.2), C(0.12, 0.12, 0.1, 8, FER, x, 0.17, z0 + 0.2));
      L.push(B(x1 - x0, 0.24, 0.2, '#5e4a36', xc, 3.18, z0 + 0.2));
      const a = Math.atan2(0.55, 4.9);
      L.push(Bx(x1 - x0 + 0.6, 0.14, 5.0, ARD2, xc, 3.4, -10.95, -a), Bx(x1 - x0 + 0.4, 0.03, 4.8, BOIS2, xc, 3.31, -10.95, -a));
      for (const x of [124.6, 129.0]) {
        L.push(B(2.6, 0.06, 0.4, BOIS, x, 0.48, -9.1), B(2.6, 0.32, 0.05, BOIS, x, 0.78, -8.92));
        for (const dx of [-1.1, 1.1]) L.push(B(0.06, 0.45, 0.38, FER, x + dx, 0.27, -9.1));
      }
      L.push(B(9.6, 0.12, 0.04, BOIS, xc, 1.42, -8.66));
      const MANTEAUX = ['#c0392b', '#2e86de', '#f1c40f', '#8e44ad', '#16a085', '#e67e22', '#e84393', '#2c3e50'];
      for (let i = 0; i < 26; i++) {
        const x = x0 + 0.95 + i * 0.36;
        D.push(B(0.03, 0.08, 0.06, '#c9a55a', x, 1.38, -8.63));
        if (i % 3 === 1) D.push(B(0.3, 0.55, 0.1, MANTEAUX[i % 8], x, 1.08, -8.6)); // un manteau
        else if (i % 5 === 3) D.push(B(0.24, 0.3, 0.1, MANTEAUX[(i + 3) % 8], x, 1.17, -8.6)); // un sac
      }
      // le panneau de liège et ses dessins (des feuilles de couleur)
      L.push(B(2.2, 1.0, 0.04, '#b98a55', 131.3, 2.15, -8.64));
      for (let i = 0; i < 10; i++) D.push(B(0.36, 0.27, 0.01, ['#f7f3ea', '#fdf2c7', '#e8f2fb', '#fbe3e8'][i % 4], 130.45 + (i % 5) * 0.42, 1.9 + Math.floor(i / 5) * 0.42 + (i % 2) * 0.04, -8.615));
      for (let i = 0; i < 10; i++) D.push(B(0.16, 0.12, 0.005, ['#e74c3c', '#27ae60', '#f39c12', '#2980b9', '#8e44ad'][i % 5], 130.45 + (i % 5) * 0.42 + 0.03, 1.9 + Math.floor(i / 5) * 0.42 + 0.02, -8.61));
      contact.tache(xc, -10.8, 6.5, 2.6, 0.32);
    }

    /* -- le coin des petits : le sol souple ; le portique et ses deux balançoires (les sièges et les chaînes : ecole.js) ;
       la structure à toboggan (l'escalier, la plateforme, son toit, le toboggan) ; deux jeux à ressort (les ressorts : le
       jeu lui-même, qui se balance, est dans ecole.js) ; le bac à sable */
    L.push(B(11.0, 0.03, 9.4, '#4f8a4a', 120.6, 0.045, -18.2), B(2.6, 0.032, 4.6, '#b8463a', 116.6, 0.046, -16.5), B(2.0, 0.032, 2.0, '#3f6fa8', 120.5, 0.047, -20.9));
    const XS = 116.6, YS = 2.25, ZB = [-15.75, -17.25];
    L.push(C(0.07, 0.07, 4.3, 8, BOIS2, XS, YS, -16.5, 'z'));
    for (const z of [-14.55, -18.45]) {
      L.push(manche([XS, YS + 0.05, z], [XS - 1.15, 0, z], 0.065, BOIS2), manche([XS, YS + 0.05, z], [XS + 1.15, 0, z], 0.065, BOIS2), B(1.3, 0.07, 0.07, BOIS2, XS, 0.85, z));
      contact.tache(XS, z, 1.3, 0.35, 0.25);
    }
    for (const z of ZB) for (const dz of [-0.2, 0.2]) L.push(B(0.06, 0.06, 0.06, '#5d5d63', XS, YS - 0.08, z + dz));
    const TB = { x: 121.0, z: -15.6, y: 1.06 };
    L.push(B(1.25, 0.08, 1.25, BOIS, TB.x, TB.y, TB.z));
    for (const [dx, dz] of [[-0.58, -0.58], [0.58, -0.58], [-0.58, 0.58], [0.58, 0.58]]) L.push(B(0.1, 2.55, 0.1, BOIS2, TB.x + dx, 1.27, TB.z + dz));
    L.push(C(0, 1.05, 0.85, 4, ROUGE, TB.x, 2.95, TB.z, 'y', Math.PI / 4), B(1.24, 0.58, 0.04, VERT, TB.x, 1.42, TB.z - 0.6), B(1.24, 0.58, 0.04, VERT, TB.x, 1.42, TB.z + 0.6));
    D.push(C(0.16, 0.16, 0.03, 12, JAUNE, TB.x, 1.42, TB.z - 0.63, 'z'), C(0.16, 0.16, 0.03, 12, '#e84393', TB.x, 1.42, TB.z + 0.63, 'z'));
    for (let k = 0; k < 5; k++) L.push(B(0.32, 0.05, 0.66, BOIS, 118.86 + 0.32 * k + 0.16, 0.21 * (k + 1) - 0.025, TB.z));
    for (const s of [-1, 1]) L.push(manche([118.7, 0.02, TB.z + s * 0.36], [120.42, 1.1, TB.z + s * 0.36], 0.04, BOIS2), manche([118.7, 0.8, TB.z + s * 0.38], [120.42, 1.85, TB.z + s * 0.38], 0.025, JAUNE), B(0.05, 0.8, 0.05, BOIS2, 118.72, 0.4, TB.z + s * 0.38));
    {
      const a = Math.atan2(TB.y - 0.22, 2.8), l = Math.hypot(2.8, TB.y - 0.22), cx = TB.x + 0.6 + 1.4, cy = (TB.y + 0.22) / 2 + 0.02;
      L.push(Bz(l, 0.05, 0.56, JAUNE, cx, cy, TB.z, -a), Bz(l, 0.16, 0.04, JAUNE, cx, cy + 0.08, TB.z - 0.3, -a), Bz(l, 0.16, 0.04, JAUNE, cx, cy + 0.08, TB.z + 0.3, -a));
      L.push(B(0.7, 0.05, 0.56, JAUNE, 124.75, 0.2, TB.z), B(0.7, 0.14, 0.04, JAUNE, 124.75, 0.27, TB.z - 0.3), B(0.7, 0.14, 0.04, JAUNE, 124.75, 0.27, TB.z + 0.3));
      for (const s of [-1, 1]) L.push(B(0.07, 0.62, 0.07, BOIS2, 123.0, 0.31, TB.z + s * 0.24), B(0.06, 0.2, 0.06, BOIS2, 124.75, 0.1, TB.z + s * 0.24));
      contact.tache(122.6, TB.z, 2.8, 0.9, 0.28);
    }
    const RESSORTS = [{ x: 119.4, z: -20.4, h: -Math.PI / 2, y: 0.66 }, { x: 121.6, z: -21.6, h: -Math.PI / 2, y: 0.66 }];
    for (const r of RESSORTS) {
      L.push(C(0.3, 0.3, 0.04, 12, '#5a5a60', r.x, 0.07, r.z));
      for (let k = 0; k < 6; k++) L.push(C(0.1, 0.1, 0.035, 10, '#c0392b', r.x, 0.13 + k * 0.065, r.z));
    }
    {
      const x = 124.7, z = -19.7;
      for (const s of [-1, 1]) L.push(B(2.6, 0.3, 0.14, BOIS, x, 0.15, z + s * 1.23), B(0.14, 0.3, 2.6, BOIS, x + s * 1.23, 0.15, z));
      L.push(B(2.34, 0.2, 2.34, '#d9c28b', x, 0.12, z), C(0.24, 0.32, 0.22, 8, '#cdb67e', x + 0.45, 0.32, z - 0.5), C(0.06, 0.09, 0.18, 6, '#cdb67e', x + 0.32, 0.5, z - 0.38), C(0.06, 0.09, 0.18, 6, '#cdb67e', x + 0.6, 0.5, z - 0.6));
      D.push(C(0.09, 0.07, 0.14, 8, ROUGE, x - 0.6, 0.29, z + 0.55), C(0.08, 0.06, 0.13, 8, '#2e86de', x + 0.7, 0.29, z + 0.6), B(0.04, 0.03, 0.42, JAUNE, x - 0.3, 0.24, z + 0.1, 0.6), B(0.14, 0.02, 0.1, JAUNE, x - 0.18, 0.24, z + 0.28, 0.6));
      contact.jupe(x - 1.3, z - 1.3, x + 1.3, z + 1.3, 0.4, 0.25);
    }

    /* -- le potager (deux bacs de bois, des choux, des poireaux, un arrosoir) et la cabane des jeux, dans le coin sud-ouest */
    for (const x of [118.3, 120.6]) {
      L.push(B(2.0, 0.4, 0.9, BOIS, x, 0.2, -9.4), B(1.88, 0.05, 0.78, '#6f5238', x, 0.42, -9.4));
      for (let i = 0; i < 4; i++) D.push(S(0.13, ['#5d8a36', '#6f9a3e', '#4f7a32'][i % 3], x - 0.7 + i * 0.47, 0.52, -9.4, 1, 0.8, 1, 1));
      for (let i = 0; i < 6; i++) D.push(C(0.018, 0.02, 0.3, 4, '#7fae5a', x - 0.75 + i * 0.3, 0.6, -9.12));
    }
    D.push(C(0.11, 0.12, 0.2, 8, '#2f7d4a', 121.9, 0.14, -9.9), manche([121.98, 0.16, -9.9], [122.25, 0.3, -9.9], 0.015, '#2f7d4a'));
    L.push(B(1.9, 2.0, 2.0, BOIS2, 115.9, 1.0, -9.75), Bx(2.3, 0.08, 2.5, ARD2, 115.9, 2.12, -9.75, -0.12), B(0.8, 1.7, 0.04, '#5a3f2b', 115.9, 0.88, -10.77), B(0.5, 0.4, 0.04, '#2f3c4f', 115.2, 1.4, -10.77));
    D.push(S(0.03, '#c9a55a', 116.2, 0.9, -10.8));
    contact.jupe(114.95, -10.75, 116.85, -8.75, 0.6, 0.35);

    /* -- les tilleuls : un tronc, un houppier de touffes que le vent balance ; un banc rond autour du premier, une grille de
       fonte au pied du second */
    const tilleul = (X, Z) => {
      L.push(teinter(C(0.2, 0.3, 3.6, 8, '#6a5441', X, 1.8, Z), '#6a5441', T.bois));
      L.push(teinter(C(0.08, 0.13, 1.6, 6, '#6a5441', X + 0.55, 3.9, Z - 0.3, 'y'), '#6a5441', T.bois));
      [[0, 5.6, 0, 2.6], [1.4, 4.9, 0.6, 1.9], [-1.3, 5.0, -0.7, 1.9], [0.5, 6.6, -0.9, 1.7], [-0.6, 4.6, 1.3, 1.6]].forEach(([dx, y, dz, r], i) => {
        const c = ['#c9a845', '#b9a23c', '#d9b04a', '#a3a240', '#c79a3a'][i], g = teinter(S(r, c, X + dx, y, Z + dz, 1, 0.82, 1, 1), c, T.feuillage), p = g.attributes.position, w = new Float32Array(p.count);
        for (let k = 0; k < p.count; k++) w[k] = 0.25 + 0.55 * Math.max(0, (p.getY(k) - (y - r * 0.82)) / (r * 1.64));
        g.setAttribute('aVent', new THREE.BufferAttribute(w, 1)); L.push(g);
      });
      contact.tache(X, Z, 3.0, 3.0, 0.3);
      plan.push({ t: 'a', x: X, z: Z, r: 2.6 });
    };
    const T1 = { x: 118.6, z: -37.0 }, T2 = { x: 129.4, z: -18.4 };
    tilleul(T1.x, T1.z); tilleul(T2.x, T2.z);
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * Math.PI * 2, r = 1.15;
      L.push(B(0.42, 0.05, 0.92, BOIS, T1.x + Math.cos(a) * r, 0.42, T1.z + Math.sin(a) * r, -a), B(0.06, 0.4, 0.06, FER, T1.x + Math.cos(a) * (r + 0.1), 0.2, T1.z + Math.sin(a) * (r + 0.1)));
    }
    L.push(C(0.8, 0.8, 0.02, 16, FER, T2.x, 0.05, T2.z));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI; D.push(B(1.55, 0.015, 0.03, '#1f2a25', T2.x, 0.065, T2.z, a)); }

    /* -- les bancs contre la façade, la jardinière de pierre */
    const BANCS = [{ x: 132.35, z: -21.0, h: -Math.PI / 2 }, { x: 132.35, z: -31.4, h: -Math.PI / 2 }];
    for (const b of BANCS) {
      L.push(B(0.42, 0.06, 1.9, BOIS, b.x, 0.45, b.z), B(0.05, 0.38, 1.9, BOIS, b.x + 0.22, 0.78, b.z));
      for (const dz of [-0.8, 0.8]) L.push(B(0.42, 0.44, 0.06, FER, b.x + 0.02, 0.22, b.z + dz));
      contact.tache(b.x, b.z, 0.5, 1.1, 0.25);
    }
    L.push(B(0.62, 0.5, 1.8, MOEL, 132.5, 0.25, -16.5), B(0.7, 0.06, 1.88, APPUI, 132.5, 0.53, -16.5), B(0.5, 0.04, 1.68, '#6f5238', 132.5, 0.5, -16.5));
    for (let i = 0; i < 3; i++) L.push(S(0.32, ['#4f7a32', '#5d8a36', '#3f6a2a'][i], 132.5, 0.78, -17.1 + i * 0.6, 1, 0.8, 1, 1));

    /* -- peint au sol : la marelle (de la Terre au Ciel, ses chiffres), l'escargot, des points de couleur, le terrain (ses
       lignes jaunes, son rond central) ; le but et son filet, le panier de basket contre le mur du nord */
    const MARELLE = { x: 116.0, z0: -23.55, p: 0.55 };
    {
      const { x, z0, p } = MARELLE, w = 0.3, cases = [[0], [0], [0], [-1, 1], [0], [-1, 1]];
      cases.forEach((c, i) => {
        const za = z0 - i * p, zb = za - p, lg = c.length > 1 ? 0.6 : 0.3;
        trait(x - lg, za, x + lg, za, 0.05, BLANC); trait(x - lg, zb, x + lg, zb, 0.05, BLANC);
        trait(x - lg, za, x - lg, zb, 0.05, BLANC); trait(x + lg, za, x + lg, zb, 0.05, BLANC);
        if (c.length > 1) trait(x, za, x, zb, 0.05, BLANC);
      });
      const zc = z0 - 6 * p;
      cercle(x, zc, 0.6, 0.05, BLANC, 10, Math.PI, Math.PI * 2);
      trait(x - 0.45, z0 + 0.15, x + 0.45, z0 + 0.15, 0.04, JAUNE); // la ligne de la Terre
      // les chiffres et le Ciel : une bande de l'atlas, une case par chiffre
      const k = atlas.poser(360, 40, (c, W, H) => {
        c.clearRect(0, 0, W, H); c.fillStyle = '#f4efe2'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'bold 30px Arial, sans-serif';
        for (let i = 0; i < 8; i++) c.fillText(String(i + 1), 20 + i * 40, 22);
        c.font = 'bold 22px Arial, sans-serif'; c.fillText('CIEL', 340, 22);
      }, 0.001, 0.001, x, -2, z0, 0);
      const num = (i, cx, cz, w3) => atlas.copie(k, new THREE.PlaneGeometry(w3, 0.26).rotateX(-Math.PI / 2).translate(cx, 0.053, cz), i * 40 / 360, (i * 40 + (i === 8 ? 80 : 40)) / 360);
      [[0, x, 0], [1, x, 1], [2, x, 2], [3, x - 0.3, 3], [4, x + 0.3, 3], [5, x, 4], [6, x - 0.3, 5], [7, x + 0.3, 5]].forEach(([i, cx, r]) => num(i, cx, z0 - (r + 0.5) * p, 0.26));
      num(8, x, zc - 0.3, 0.52);
    }
    const ESCARGOT = { x: 123.0, z: -36.6 };
    {
      const n = 64;
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, a0 = t0 * Math.PI * 4.6, a1 = t1 * Math.PI * 4.6, r0 = 1.5 - 1.25 * t0, r1 = 1.5 - 1.25 * t1;
        trait(ESCARGOT.x + Math.cos(a0) * r0, ESCARGOT.z + Math.sin(a0) * r0, ESCARGOT.x + Math.cos(a1) * r1, ESCARGOT.z + Math.sin(a1) * r1, 0.05, BLANC);
        if (i % 4 === 0 && i < n - 8) trait(ESCARGOT.x + Math.cos(a0) * r0, ESCARGOT.z + Math.sin(a0) * r0, ESCARGOT.x + Math.cos(a0) * (r0 - 0.3), ESCARGOT.z + Math.sin(a0) * (r0 - 0.3), 0.04, BLANC);
      }
      L.push(C(0.22, 0.22, 0.012, 12, ROUGE, ESCARGOT.x, 0.046, ESCARGOT.z));
    }
    {
      const COUL = [ROUGE, JAUNE, '#3f7fc0', VERT];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) L.push(C(0.2, 0.2, 0.012, 12, COUL[(i + j) % 4], 127.6 + i * 0.6, 0.046, -14.4 - j * 0.6));
    }
    const TERRAIN = { x0: 125.6, x1: 131.6, z0: -38.85, z1: -25.8 };
    {
      const { x0, x1, z0, z1 } = TERRAIN, zm = (z0 + z1) / 2;
      trait(x0, z0, x0, z1, 0.06, JAUNE); trait(x1, z0, x1, z1, 0.06, JAUNE); trait(x0, z1, x1, z1, 0.06, JAUNE); trait(x0, zm, x1, zm, 0.06, JAUNE);
      cercle((x0 + x1) / 2, zm, 1.0, 0.06, JAUNE, 18);
      cercle((x0 + x1) / 2, z0, 1.6, 0.06, JAUNE, 9, 0, Math.PI);
    }
    const BUT = { x: 128.6, z: -38.9, l: 2.0, h: 1.2 };
    {
      const { x, z, l, h } = BUT;
      for (const s of [-1, 1]) L.push(B(0.07, h, 0.07, '#f1f1ee', x + s * l / 2, h / 2, z), B(0.05, h, 0.05, '#f1f1ee', x + s * l / 2, h / 2, z - 0.22), B(0.05, 0.05, 0.24, '#f1f1ee', x + s * l / 2, h, z - 0.11));
      L.push(B(l + 0.07, 0.07, 0.07, '#f1f1ee', x, h, z));
      for (let i = 0; i <= 10; i++) D.push(B(0.012, h, 0.012, '#d9dcd8', x - l / 2 + i * l / 10, h / 2, z - 0.24));
      for (let i = 1; i <= 4; i++) D.push(B(l, 0.012, 0.012, '#d9dcd8', x, i * h / 5, z - 0.24));
      for (let i = 0; i <= 10; i++) D.push(B(0.012, 0.012, 0.24, '#d9dcd8', x - l / 2 + i * l / 10, h, z - 0.12));
    }
    {
      const x = 120.6, z = -39.1;
      L.push(B(1.1, 0.74, 0.05, '#f1f1ee', x, 2.85, z), B(0.42, 0.3, 0.052, ROUGE, x, 2.72, z), B(0.36, 0.24, 0.054, '#f1f1ee', x, 2.72, z));
      L.push(teinter(new THREE.TorusGeometry(0.22, 0.016, 4, 14).rotateX(Math.PI / 2).translate(x, 2.55, z + 0.27), '#d35400'), B(0.04, 0.04, 0.12, '#d35400', x, 2.55, z + 0.06));
      D.push(C(0.21, 0.14, 0.36, 8, '#eeeeea', x, 2.36, z + 0.27, 'y', 0, 0));
    }

    /* -- dehors : les barrières devant le portail (un sas qui s'ouvre vers la place), la plaque de l'école sur un pilier du
       portail, le panneau d'affichage ; les passages piétons de la départementale (devant la rue de la place) et de la
       rue de la place (à l'entrée de la place) ; les panneaux « École » (enfants) sur les routes qui y mènent et ceux des
       passages piétons */
    const BARRIERES = [-30.55, -35.45];
    for (const z of BARRIERES) {
      const xa = 112.3, xb = 114.2, VB = '#2f6b3a';
      L.push(manche([xa, 1.0, z], [xb, 1.0, z], 0.025, VB), manche([xa, 0.3, z], [xb, 0.3, z], 0.025, VB));
      for (const x of [xa, xb]) L.push(B(0.05, 1.02, 0.05, VB, x, 0.51, z));
      for (let x = xa + 0.12; x < xb - 0.05; x += 0.12) D.push(B(0.015, 0.7, 0.015, VB, x, 0.65, z));
      L.push(B(0.56, 0.34, 0.03, '#f4f1ea', (xa + xb) / 2, 0.66, z), B(0.6, 0.38, 0.025, ROUGE, (xa + xb) / 2, 0.66, z));
      contact.tache((xa + xb) / 2, z, 1.0, 0.2, 0.2);
    }
    atlas.poser(192, 132, (c, W, H) => {
      c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(0, 0, W, H, 14); c.fill();
      c.fillStyle = '#1f3f8a'; c.beginPath(); c.roundRect(5, 5, W - 10, H - 10, 11); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.roundRect(10, 10, W - 20, H - 20, 8); c.stroke();
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 30px Georgia, serif'; c.fillText('ÉCOLE', W / 2, 36);
      c.font = 'bold 21px Georgia, serif'; c.fillText('DES TILLEULS', W / 2, 68);
      c.font = '13px Georgia, serif'; c.fillText('maternelle et élémentaire', W / 2, 98);
    }, 0.52, 0.36, XG - 0.29, 1.55, PZ0 + 0.3, -Math.PI / 2);
    {
      const x = 113.9, z = -29.35;
      L.push(B(0.1, 0.95, 1.15, '#2f5d50', x, 1.4, z), C(0.035, 0.035, 0.95, 6, '#2f5d50', x, 0.47, z - 0.4), C(0.035, 0.035, 0.95, 6, '#2f5d50', x, 0.47, z + 0.4), B(0.14, 0.06, 1.2, '#24473d', x, 1.9, z));
      vitresB.push(B(0.01, 0.82, 1.02, '#3a5068', x - 0.065, 1.4, z));
      atlas.poser(224, 180, (c, W, H) => {
        c.fillStyle = '#b98a55'; c.fillRect(0, 0, W, H);
        for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(90,60,30,${0.1 + (i % 5) * 0.03})`; c.fillRect((i * 37) % W, (i * 53) % H, 2, 2); }
        const feuille = (x0, y0, w, h, r, fond) => { c.save(); c.translate(x0 + w / 2, y0 + h / 2); c.rotate(r); c.fillStyle = fond; c.fillRect(-w / 2, -h / 2, w, h); c.restore(); };
        feuille(10, 12, 92, 120, -0.03, '#fbf8f0');
        c.fillStyle = '#2b2b30'; c.font = 'bold 16px Georgia, serif'; c.textAlign = 'center'; c.fillText('Menu', 56, 34);
        c.fillStyle = '#6a6a72'; for (let i = 0; i < 6; i++) c.fillRect(22, 46 + i * 13, 50 + (i * 17) % 22, 3);
        feuille(112, 10, 100, 76, 0.04, '#fdf2c7');
        c.fillStyle = '#2b2b30'; c.font = 'bold 14px Georgia, serif'; c.fillText('Garderie', 162, 32);
        c.font = '12px Georgia, serif'; c.fillText('7 h 30 · 8 h 30', 162, 52); c.fillText('16 h 30 · 18 h 30', 162, 70);
        feuille(116, 96, 92, 72, -0.05, '#ffffff');
        c.fillStyle = '#f1c40f'; c.beginPath(); c.arc(140, 116, 10, 0, 7); c.fill();
        c.fillStyle = '#c0392b'; c.fillRect(160, 124, 30, 24); c.fillStyle = '#8e2a3b'; c.beginPath(); c.moveTo(156, 125); c.lineTo(175, 108); c.lineTo(194, 125); c.fill();
        c.fillStyle = '#27ae60'; c.fillRect(120, 150, 84, 6);
        for (const [px, py] of [[56, 14], [162, 12], [162, 98]]) { c.fillStyle = '#c0392b'; c.beginPath(); c.arc(px, py, 3, 0, 7); c.fill(); }
      }, 0.98, 0.79, x - 0.06, 1.4, z, -Math.PI / 2);
    }
    // les passages piétons : des bandes blanches de 50 cm, dans l'axe de la chaussée
    for (let z = 7.45; z < 12.6; z += 1.0) L.push(B(2.5, 0.01, 0.5, BLANC, 101.5, 0.04, z));
    for (let x = 92.75; x < 97.4; x += 1.0) L.push(B(0.5, 0.01, 2.4, BLANC, x, 0.036, -27.0));
    // les panneaux : un dessin de l'atlas pour chaque sorte, recopié ; le dos gris, le poteau
    const panneauX = (k, w, h, x, y, z, rot, tri) => {
      if (k.premier) k.premier = false; else atlas.copie(k, new THREE.PlaneGeometry(w, h).rotateY(rot).translate(x, y, z));
      const g = tri ? new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, -h / 2, 0, 0, h / 2, 0, w / 2, -h / 2, 0], 3)) : new THREE.PlaneGeometry(w * 0.96, h * 0.96);
      g.computeVertexNormals(); g.rotateY(rot + Math.PI); g.translate(x - Math.sin(rot) * 0.02, y, z - Math.cos(rot) * 0.02);
      L.push(teinter(g, '#8d9196'), C(0.04, 0.04, y, 6, '#b9bcc2', x - Math.sin(rot) * 0.04, y / 2, z - Math.cos(rot) * 0.04));
      return [x, z];
    };
    const POTEAUX = [];
    {
      const SIGNES = [[99.0, -5.6, 0], [84.5, 6.1, -Math.PI / 2], [119.5, 13.95, Math.PI / 2]];
      const k = atlas.poser(128, 112, (c, W, H) => {
        c.clearRect(0, 0, W, H);
        const tri = (m, f) => { c.beginPath(); c.moveTo(W / 2, m); c.lineTo(W - m * 1.15, H - m * 0.6); c.lineTo(m * 1.15, H - m * 0.6); c.closePath(); c.fillStyle = f; c.fill(); };
        tri(2, '#c8202a'); tri(15, '#ffffff');
        // deux enfants qui marchent, le plus grand tient le plus petit par la main
        c.fillStyle = '#1d1d1d';
        const enfant = (x, y, k) => { c.beginPath(); c.arc(x, y - 22 * k, 5 * k, 0, 7); c.fill(); c.beginPath(); c.moveTo(x - 4 * k, y - 16 * k); c.lineTo(x + 5 * k, y - 16 * k); c.lineTo(x + 4 * k, y - 2 * k); c.lineTo(x + 9 * k, y + 12 * k); c.lineTo(x + 4 * k, y + 13 * k); c.lineTo(x, y + 3 * k); c.lineTo(x - 5 * k, y + 13 * k); c.lineTo(x - 9 * k, y + 11 * k); c.lineTo(x - 4 * k, y - 2 * k); c.closePath(); c.fill(); };
        enfant(56, 78, 1.05); enfant(78, 82, 0.82);
        c.lineWidth = 3; c.strokeStyle = '#1d1d1d'; c.beginPath(); c.moveTo(61, 68); c.lineTo(73, 72); c.stroke();
      }, 0.9, 0.79, SIGNES[0][0], 2.25, SIGNES[0][1], SIGNES[0][2]);
      k.premier = true;
      for (const [x, z, r] of SIGNES) POTEAUX.push(panneauX(k, 0.9, 0.79, x, 2.25, z, r, true));
      const kp = atlas.poser(96, 96, (c, W, H) => {
        c.fillStyle = '#1f5fae'; c.beginPath(); c.roundRect(0, 0, W, H, 8); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(W / 2, 10); c.lineTo(W - 10, H - 12); c.lineTo(10, H - 12); c.closePath(); c.fill();
        c.fillStyle = '#1d1d1d'; for (let i = 0; i < 4; i++) c.fillRect(24 + i * 13, H - 22, 8, 6);
        c.beginPath(); c.arc(W / 2 + 2, 34, 5, 0, 7); c.fill();
        c.lineWidth = 4; c.strokeStyle = '#1d1d1d'; c.beginPath(); c.moveTo(W / 2 + 1, 40); c.lineTo(W / 2 - 2, 56); c.lineTo(W / 2 - 9, 68); c.moveTo(W / 2 - 2, 56); c.lineTo(W / 2 + 7, 68); c.moveTo(W / 2 - 8, 48); c.lineTo(W / 2 + 9, 47); c.stroke();
      }, 0.55, 0.55, 100.0, 2.35, 6.15, -Math.PI / 2);
      kp.premier = true;
      POTEAUX.push(panneauX(kp, 0.55, 0.55, 100.0, 2.35, 6.15, -Math.PI / 2), panneauX(kp, 0.55, 0.55, 103.0, 2.35, 13.85, Math.PI / 2));
    }

    finirPlaques(L);
    bati.push(...L);
    proches.push(...D);
    // les collisions, une fois les herbes semées : l'enceinte entière (on n'y entre jamais), le bâtiment (il arrête aussi la
    // caméra), les barrières, le panneau d'affichage, les poteaux des panneaux
    plusTard.push(() => {
      col.boite(ECOLE.x0, ECOLE.z0, ECOLE.x1, ECOLE.z1).haut = false;
      col.boite(XP - 0.1, ZN, XB, ZS).haut = true;
      for (const z of BARRIERES) col.boite(112.25, z - 0.08, 114.3, z + 0.08);
      col.boiteC(113.9, -29.35, 0.2, 1.2);
      for (const [x, z] of POTEAUX) col.boiteC(x, z, 0.15, 0.15);
    });

    /* -- ce que ecole.js fait vivre : le portail, la porte, l'horloge, la cloche, les fenêtres des classes, les jeux, les
       chemins dans la cour (des points de passage, voir ecole.js) et ceux qui ramènent les enfants chez eux */
    return {
      zone: ECOLE, parvis: PARVIS_E,
      portail: { x: XG, z: (PZ0 + PZ1) / 2, z0: PZ0, z1: PZ1, dehors: { x: 112.8, z: -33.0 }, dedans: { x: 116.1, z: -33.0 } },
      porte: { x: XP - 0.08, z: ZP, l: 1.8, h: 2.78, y: 0.51, dehors: { x: 131.6, z: ZP } },
      horloge: { x: XP - 0.11, y: HP + 1.15, z: ZP },
      cloche: { x: XP + 1.4, y: 12.5, z: ZP },
      classes: { x: XF - 0.012, fenetres: fenetresClasse, y0: 1.0, y1: 3.6, w: 1.5, ailes: [[ZS, ZP + PW / 2], [ZP - PW / 2, ZN]] },
      balancoires: ZB.map(z => ({ x: XS, y: YS - 0.08, z, L: 1.7, h: -Math.PI / 2 })),
      toboggan: { pied: { x: 118.35, z: TB.z }, bas0: { x: 118.75, z: TB.z }, haut: { x: 120.45, z: TB.z, y: TB.y + 0.04 }, assise: { x: 121.62, z: TB.z, y: TB.y + 0.04 }, fin: { x: 124.42, y: 0.25 }, bas: { x: 125.0, z: TB.z, y: 0.25 } },
      ressorts: RESSORTS, sable: { x: 124.7, z: -19.7, y: 0.22 }, marelle: MARELLE, escargot: ESCARGOT, terrain: TERRAIN, but: BUT,
      corde: { a: { x: 119.4, z: -24.6 }, b: { x: 123.2, z: -24.6 } }, ronde: { x: 121.6, z: -29.4, r: 1.35 }, billes: { x: 128.4, z: -20.6 },
      bancs: BANCS, rond: { x: T1.x, z: T1.z, r: 1.15, y: 0.42 }, chat: { x0: 126.8, x1: 132.0, z0: -23.6, z1: -14.4 },
      perchoirs: [{ x: 132.5, z: -16.0, y: 0.56 }, { x: 132.5, z: -17.0, y: 0.56 }, { x: 127.0, z: -13.1, y: 0.12 }, { x: 130.5, z: -13.1, y: 0.12 }],
      preau: { x0: 122.6, x1: 132.6, z0: -12.4, z1: -9.6 },
      // les points de passage de la cour (on va de l'un à l'autre, jamais à travers un jeu) et leurs liens
      noeuds: { G: [116.1, -33.0], A1: [124.4, -32.6], A2: [124.6, -27.0], H: [125.2, -25.0], D: [131.6, -24.8], Z1: [124.6, -23.0], M1: [118.3, -27.0], P1: [127.2, -22.4], P2: [127.4, -14.0], N1: [124.4, -37.9], E1: [132.0, -27.6] },
      liens: [['G', 'A1'], ['A1', 'A2'], ['A2', 'H'], ['H', 'D'], ['H', 'Z1'], ['A2', 'M1'], ['M1', 'G'], ['Z1', 'P1'], ['H', 'P1'], ['P1', 'D'], ['P1', 'P2'], ['A1', 'N1'], ['N1', 'G'], ['D', 'E1'], ['E1', 'A1']],
      // les chemins de la maison au portail (le premier point : devant chez soi ; le dernier : devant le portail)
      chemins: CHEMINS_ECOLE.map(c => c.map(([x, z]) => ({ x, z }))),
      // là où l'on traverse une rue (on attend qu'aucune voiture n'arrive) : la départementale, la rue de la place
      passages: [{ x0: 101.5, z0: 14.2, x1: 101.5, z1: 5.8 }, { x0: 98.3, z0: -27.0, x1: 92.3, z1: -26.8 }],
    };
  }

  /* ------------------------------------------------------------ le château et sa colline (relief.js)
     La route du château part de la départementale (x = -176) et monte en 520 m (11 % au plus) jusqu'au plateau du
     sommet, parapets du côté du vide ; la route du tour, pavée, fait le tour du château ; les maisons du village la
     bordent, tournées vers lui (manoirs à tourelle, pans de bois, tuffeau), un belvédère au sud-est. Le château : corps
     de logis en tuffeau, grandes croisées, lucarnes à fronton, hautes cheminées, deux grosses tours rondes au sud
     (mâchicoulis, toits en poivrière), deux ailes et leur cour d'honneur au nord, fermée par un châtelet d'entrée ;
     jardins à la française, mur de clôture. Son propre tirage au sort (le reste du monde ne bouge pas). */
  /* Le village du château qui vit (Teddy, 25/11/2026 : « de l'activité au château : des gens, des voitures, des
     restaurants, des terrasses ») : le trottoir pavé tout autour de la route du tour (ouvert devant la route), l'enseigne
     et la terrasse des deux restaurants et du café (un platelage de bois, des jardinières aux deux bouts, des tables
     rondes et leurs chaises, l'assiette et le verre de chaque place, une carafe ou une bouteille, des parasols au bord de
     la rue, l'ardoise du menu près de la porte ; le passage devant la porte reste libre), des places de stationnement
     sur le trottoir (les voitures : main.js, GAREES). Appelé par chateau() une fois ses maisons posées ; son propre
     tirage au sort (le reste du monde ne bouge pas). Ce qui vit (les gens, les voitures qui roulent) : village.js. */
  function villageTerrasses(RESTOS, RF, jA, rBord, surf) {
    const CH = CHATEAU, Y = CH.y, rv = hasard(9157), V = villageChateau;
    // le trottoir pavé, du bord du tour aux façades
    {
      const p = [], n = 192, r0 = CH.tour + DEMI + 0.22, r1 = RF - 0.05, sauf = (DEMI + 0.7) / rBord;
      for (let k = 0; k < n; k++) {
        const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2;
        if (Math.abs(angle((a0 + a1) / 2 - jA)) < sauf) continue;
        const P = (r, a) => [CH.x + Math.cos(a) * r, Y + 0.035, CH.z + Math.sin(a) * r];
        p.push(...P(r0, a0), ...P(r1, a1), ...P(r1, a0), ...P(r0, a0), ...P(r0, a1), ...P(r1, a1));
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
      surf.push(teinter(g, '#bdb19b'));
    }
    // les réverbères (mêmes places que dans chateau()) : ni table ni voiture dessous
    const lampes = [];
    for (let k = 0; k < 12; k++) {
      const b = k / 12 * Math.PI * 2 + 0.2, x = CH.x + Math.cos(b) * (CH.tour + 4.6), z = CH.z + Math.sin(b) * (CH.tour + 4.6);
      if (procheRoute(x, z, 8).d >= 6.5) lampes.push([x, z]);
    }
    const presLampe = (x, z, d) => lampes.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < d);
    const tourne = (h, lx, lz) => [lx * Math.cos(h) + lz * Math.sin(h), -lx * Math.sin(h) + lz * Math.cos(h)];
    for (const R of RESTOS) {
      const o = R.o;
      if (!o) continue;
      const w = o.w, xp = w * 0.33, P = (lx, av) => facade(o, lx, av), places = [], tables = [];
      enseigne(R.nom, P(-w * 0.14, 0.37), Y + 3.05, Math.min(5.8, w * 0.58), 0.54, R.c, '#f3e7c9');
      // le platelage et ses lames
      { const q = P(0, 1.55); bati.push(B(w - 0.5, 0.06, 2.9, '#8d7c66', q.x, Y + 0.03, q.z, o.rot)); }
      for (let k = 0; k < 9; k++) { const q = P(0, 0.25 + k * 0.32); bati.push(B(w - 0.5, 0.004, 0.025, '#6e5a44', q.x, Y + 0.062, q.z, o.rot)); }
      // les jardinières aux deux bouts, fleuries
      for (const sg of [-1, 1]) {
        const q = P(sg * (w / 2 - 0.3), 1.6);
        bati.push(B(0.42, 0.45, 2.5, '#6b4a30', q.x, Y + 0.25, q.z, o.rot), teinter(B(0.36, 0.3, 2.4, '#4f7a3a', q.x, Y + 0.6, q.z, o.rot), '#4f7a3a', T.feuillage));
        for (let k = 0; k < 6; k++) { const f = P(sg * (w / 2 - 0.3), 0.6 + k * 0.4); bati.push(S(0.08, ['#d23a4a', '#f4f1ea', '#e0457a'][Math.floor(rv() * 3)], f.x, Y + 0.78, f.z)); }
        col.boiteO(q.x, q.z, 0.42, 2.5, o.rot);
      }
      // les tables, deux rangs (sous le store, puis au bord de la rue sous les parasols), sauf devant la porte
      for (const av of [1.25, 2.55]) for (let lx = -w / 2 + 1.25; lx <= w / 2 - 1.2; lx += 2.05) {
        if (Math.abs(lx - xp) < 1.25) continue;
        const t = P(lx, av);
        if (presLampe(t.x, t.z, 1.4)) continue;
        bati.push(C(0.36, 0.36, 0.035, 12, '#ece5d8', t.x, Y + 0.74, t.z), C(0.03, 0.03, 0.72, 6, '#2d2d33', t.x, Y + 0.37, t.z), C(0.2, 0.22, 0.03, 8, '#2d2d33', t.x, Y + 0.015, t.z));
        tables.push({ x: t.x, z: t.z, y: Y, lx, av });
        for (const sg of [-1, 1]) {
          const c = P(lx + sg * 0.62, av), h = Math.atan2(t.x - c.x, t.z - c.z), fx = Math.sin(h), fz = Math.cos(h);
          bati.push(B(0.42, 0.05, 0.4, R.chaise, c.x, Y + 0.45, c.z, h), B(0.42, 0.42, 0.04, R.chaise, c.x - fx * 0.19, Y + 0.7, c.z - fz * 0.19, h));
          for (const [ax, az] of [[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.16], [0.17, 0.16]]) { const [ox, oz] = tourne(h, ax, az); bati.push(B(0.03, 0.44, 0.03, '#2d2d33', c.x + ox, Y + 0.22, c.z + oz)); }
          // son couvert : l'assiette, le verre à sa droite
          const px = t.x + (c.x - t.x) * 0.36, pz = t.z + (c.z - t.z) * 0.36, [gx, gz] = tourne(h, -0.16, 0.06);
          bati.push(C(0.12, 0.12, 0.012, 10, '#fbfbfa', px, Y + 0.764, pz), C(0.028, 0.022, 0.1, 6, '#d6e6ea', px + gx, Y + 0.81, pz + gz));
          places.push({ x: c.x, z: c.z, h, y: Y });
        }
        if (rv() < 0.6) bati.push(C(0.045, 0.05, 0.24, 8, rv() < 0.5 ? '#3a1820' : '#cfe6f2', t.x, Y + 0.88, t.z));
        if (av > 2) bati.push(C(0.025, 0.025, 1.75, 5, '#e8e4dc', t.x, Y + 1.63, t.z), C(0, 1.25, 0.42, 8, R.c, t.x, Y + 2.68, t.z), C(1.25, 1.25, 0.06, 8, '#f3e7c9', t.x, Y + 2.46, t.z, 'y', 0, 0));
        col.boiteO(t.x, t.z, 1.9, 0.9, o.rot);
        contact.tache(t.x, t.z, 0.95, 0.95, 0.25, Y + 0.07);
      }
      // l'ardoise du menu, près de la porte
      {
        const q = P(xp + 1.05, 0.7), nx = Math.sin(o.rot), nz = Math.cos(o.rot);
        bati.push(B(0.62, 0.86, 0.05, '#6b4a30', q.x, Y + 0.55, q.z, o.rot));
        for (const sg of [-1, 1]) { const l = P(xp + 1.05 + sg * 0.26, 0.6); bati.push(B(0.04, 0.95, 0.04, '#6b4a30', l.x, Y + 0.47, l.z, o.rot)); }
        const titre = R.genre === 'bar' ? 'Le café' : 'Menu du jour', lignes = R.genre === 'bar' ? ['Café, thé, chocolat', 'Jus de pommes', 'Glaces', 'Gâteau maison'] : R.nom.startsWith('CRÊPERIE') ? ['Galettes', 'Crêpes', 'Cidre', 'Formule midi'] : ['Rillettes', 'Fouées', 'Tarte Tatin', 'Plat du jour'];
        atlas.poser(128, 176, (c, W, H) => {
          c.fillStyle = '#23272a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#8a6a48'; c.lineWidth = 8; c.strokeRect(4, 4, W - 8, H - 8);
          c.fillStyle = '#f2efe6'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.font = 'italic bold 19px Georgia, serif'; c.fillText(titre, W / 2, 26);
          c.font = '14px Georgia, serif'; lignes.forEach((l, i) => c.fillText(l, W / 2, 58 + i * 26));
        }, 0.54, 0.74, q.x + nx * 0.03, Y + 0.56, q.z + nz * 0.03, o.rot);
        col.boiteC(q.x, q.z, 0.6, 0.6);
      }
      // (axes : la maison, pour passer de la façade, lx le long et av devant, au monde : village.js)
      V.restos.push({ nom: R.nom, genre: R.genre, places, tables, ac: R.ac, c: R.c, porte: { x: o.entree.x, z: o.entree.z, rot: o.entree.rot, y: Y }, axes: { x: o.x, z: o.z, d: o.d, rot: o.rot } });
    }
    // des places de stationnement sur le trottoir (un pavage plus sombre) : loin des terrasses, du belvédère, de la route,
    // des réverbères ; une voiture sur chacune, garée dans un sens ou dans l'autre
    const prises = RESTOS.filter(R => R.o).map(R => [R.ac, (R.o.w / 2 + 1.8) / RF]), choisis = [];
    const COUL = ['#8a3a32', '#2f4a6b', '#d8cfa6', '#5c6f8a', '#e9e6de', '#3b3f46', '#6c8f4e'];
    for (let a = -Math.PI; a < Math.PI && choisis.length < 6; a += 0.13) {
      const x = CH.x + Math.cos(a) * 36.4, z = CH.z + Math.sin(a) * 36.4;
      if (procheRoute(x, z, 12).d < 10 || Math.abs(angle(a - Math.PI / 4)) < 0.5 || presLampe(x, z, 3.6)) continue;
      if (prises.some(([b, l]) => Math.abs(angle(a - b)) < l) || choisis.some(b => Math.abs(angle(a - b)) < 0.62)) continue;
      choisis.push(a);
      const h = Math.atan2(-Math.sin(a), Math.cos(a)) + (rv() < 0.5 ? Math.PI : 0);
      surf.push(B(2.3, 0.05, 5.4, '#a89c88', x, Y + 0.03, z, h));
      V.garees.push([x, z, h, COUL[Math.floor(rv() * COUL.length)], sol(x, z)]);
    }
  }
  const arbresChateau = []; // [x, z, type, y] : versés avec les autres arbres
  // le village du château qui vit (village.js) : ses restaurants et leurs terrasses (places assises, tables, porte), les
  // bancs du belvédère, les voitures garées sur les trottoirs (main.js : GAREES), les maisons
  const villageChateau = { restos: [], bancs: [], garees: [], maisons: [] };
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
    // un enrobé net, ses deux lignes de rive, ses bas-côtés en gravier (Teddy, 24/11/2026 : « la route doit être propre
    // partout »)
    const ENROBE = '#4f5158';
    surf.push(ruban(0, iFin, -DEMI, DEMI, 0.045, ENROBE), ruban(0, iFin, DEMI, DEMI + 0.55, 0.035, '#cfc1a0'), ruban(0, iFin, -DEMI - 0.55, -DEMI, 0.035, '#cfc1a0'));
    surf.push(ruban(0, iFin - 4, DEMI - 0.34, DEMI - 0.2, 0.05, LIGNE), ruban(0, iFin - 4, -DEMI + 0.2, -DEMI + 0.34, 0.05, LIGNE));
    // le raccord avec le tour : du dernier profil de la route jusqu'au bord extérieur des pavés, qu'il épouse
    const jA = Math.atan2(R.z[iFin] - CH.z, R.x[iFin] - CH.x), rBord = CH.tour + DEMI;
    {
      const a = iFin - 2, b = iFin, l = Math.hypot(R.x[b] - R.x[a], R.z[b] - R.z[a]), tx = (R.x[b] - R.x[a]) / l, tz = (R.z[b] - R.z[a]) / l;
      for (const [dg, dd, dy, c] of [[-DEMI, DEMI, 0.045, ENROBE], [DEMI, DEMI + 0.55, 0.035, '#cfc1a0'], [-DEMI - 0.55, -DEMI, 0.035, '#cfc1a0']]) {
        const P = dlat => { const x = R.x[iFin] - tz * dlat, z = R.z[iFin] + tx * dlat; return [x, R.y[iFin] + dy, z]; };
        const surBord = q => { const dx = q[0] - CH.x, dz = q[2] - CH.z, k = rBord / Math.hypot(dx, dz); return [CH.x + dx * k, Y + dy, CH.z + dz * k]; };
        const A = P(dg), Bq = P(dd), Cq = surBord(A), Dq = surBord(Bq), p = [];
        for (const [u, v, w] of [[A, Bq, Cq], [Bq, Dq, Cq]]) {
          const ny = (v[2] - u[2]) * (w[0] - u[0]) - (v[0] - u[0]) * (w[2] - u[2]);
          p.push(...u, ...(ny >= 0 ? v : w), ...(ny >= 0 ? w : v));
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
        surf.push(teinter(g, c));
      }
    }
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
        if (MAISONS_ROUTE.some(m => m.s === s && Math.abs(m.i - i) < 4)) continue; // l'allée d'une maison
        const bx = R.x[i] - tz * s * (DEMI + 1.1), bz = R.z[i] + tx * s * (DEMI + 1.1), by = sol(bx, bz);
        bati.push(B(0.14, 1.0, 0.14, '#f1ece2', bx, by + 0.5, bz, cap), B(0.15, 0.2, 0.15, '#1d1d1d', bx, by + 0.78, bz, cap));
        col.boiteC(bx, bz, 0.2, 0.2);
      }
      for (const s of [1, -1]) {
        const vide = vides[s > 0 ? 0 : 1][i];
        const px = R.x[i] - tz * s * 6.6, pz = R.z[i] + tx * s * 6.6;
        if (vide) bati.push(B(0.42, 0.78, 2.12, '#cdbf9f', px, R.y[i] + 0.33, pz, cap), B(0.52, 0.1, 2.12, APPUI, px, R.y[i] + 0.76, pz, cap));
        else if (i - dernierArbre > 16 && R.y[i] > 3 && !presMaison(R.x[i] - tz * s * 9.6, R.z[i] + tx * s * 9.6, 3)) {
          dernierArbre = i;
          const ax = R.x[i] - tz * s * 9.6, az = R.z[i] + tx * s * 9.6;
          arbresChateau.push([ax, az, pick(['chene', 'platane', 'chene']), sol(ax, az)]);
        }
      }
    }

    // les maisons de la route (choisies plus haut : MAISONS_ROUTE) : face à la route, sur un soubassement de pierre côté
    // pente ; une allée de gravier de la route à la porte, qui suit le sol ; la boîte aux lettres au bord de la route ; un
    // arbre au fond du jardin
    const allee = (pts, larg, c) => {
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz);
        const g = B(larg, 0.04, l + 0.08, c), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dx / l, dy / l, dz / l));
        g.applyQuaternion(q); bati.push(deplacer(g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2));
      }
    };
    const rm = hasard(4405);
    for (const m of MAISONS_ROUTE) {
      const { x, z, y, w, d, h, rot, genre, i, s, tx, tz } = m, ENDUITS2 = ['#e6d4b0', '#ead9bb', '#e9d2a8'];
      maison({ x, z, y, w, d, h, rot, volets: genre === 1 ? null : VOLETS[Math.floor(rm() * VOLETS.length)], mur: genre === 1 ? ENDUITS2[Math.floor(rm() * 3)] : genre === 0 ? TUF : undefined,
        tourelle: genre === 0 && w >= 10, colombages: genre === 1, lucarnes: true });
      if (m.socle > 0.04) bati.push(B(w + 0.24, m.socle + 0.35, d + 0.24, '#b9a98b', x, y - (m.socle + 0.35) / 2, z, rot));
      const vx = Math.sin(rot), vz = Math.cos(rot), pts = [];
      for (let k = 0; k <= 3; k++) {
        const t = k / 3, d0 = DEMI + 0.55, d1 = VERGE + 4.5 - 0.3, dl = d0 + (d1 - d0) * t, px = R.x[i] - tz * s * dl, pz = R.z[i] + tx * s * dl;
        pts.push([px, Math.max(sol(px, pz), k === 3 ? y : -99) + 0.035, pz]);
      }
      allee(pts, 1.3, '#cfc1a0');
      const bx = R.x[i] - tz * s * (DEMI + 0.9) + tx * 1.4, bz = R.z[i] + tx * s * (DEMI + 0.9) + tz * 1.4, by = sol(bx, bz);
      bati.push(B(0.08, 1.05, 0.08, '#4a3324', bx, by + 0.52, bz), B(0.42, 0.3, 0.3, pick(['#2f5d50', '#8e2a3b', '#2f4a6b']), bx, by + 1.15, bz, rot), B(0.3, 0.025, 0.015, '#d9cdb2', bx + vx * 0.155, by + 1.2, bz + vz * 0.155, rot));
      col.boiteC(bx, bz, 0.4, 0.4);
      const ax = x - vx * (d / 2 + 4.5), az = z - vz * (d / 2 + 4.5);
      if (procheRoute(ax, az, 9).d > 8.5) arbresChateau.push([ax, az, rm() < 0.5 ? 'chene' : 'cedre', sol(ax, az)]);
    }

    // la route du tour : petits pavés entre deux bordures ; l'allée et la cour du château, en gravier
    const anneau = (r0, r1, y, couleur, n = 96, sauf = 0) => {
      const p = [];
      for (let k = 0; k < n; k++) {
        const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2;
        if (sauf && Math.abs(angle((a0 + a1) / 2 - jA)) < sauf) continue; // ouverte devant la route
        const P = (r, a) => [CH.x + Math.cos(a) * r, y, CH.z + Math.sin(a) * r];
        p.push(...P(r0, a0), ...P(r1, a1), ...P(r1, a0), ...P(r0, a0), ...P(r0, a1), ...P(r1, a1));
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.computeVertexNormals();
      return teinter(g, couleur);
    };
    surf.push(anneau(CH.tour - DEMI, CH.tour + DEMI, Y + 0.045, PAVES), anneau(CH.tour - DEMI - 0.22, CH.tour - DEMI, Y + 0.11, BORDURE), anneau(CH.tour + DEMI, CH.tour + DEMI + 0.22, Y + 0.11, BORDURE, 192, (DEMI + 0.7) / rBord));
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
      // ses fenêtres : la vitre sur un fond de pierre, l'encadrement mouluré qui la dépasse, la croix de pierre (meneau et
      // traverse), l'appui
      if (fen) for (const a of dirs) for (let y = 3.4; y < h - 2; y += 4) {
        const sx = Math.sin(a), sz = Math.cos(a), p = (o, w, hh, d, c, dy = 0, dl = 0) => L.push(B(w, hh, d, c, x + sx * (r + o) + sz * dl, y + dy, z + sz * (r + o) - sx * dl, a));
        p(0.02, 1.45, 2.3, 0.1, TAILLE); p(0.05, 1.0, 1.8, 0.12, verre());
        for (const s of [1, -1]) { p(0.08, 0.16, 2.12, 0.1, TAILLE, 0, s * 0.58); p(0.08, 1.32, 0.16, 0.1, TAILLE, s * 0.98); }
        p(0.1, 0.1, 1.8, 0.06, TAILLE); p(0.1, 1.0, 0.1, 0.06, TAILLE, 0.36); p(0.12, 1.55, 0.12, 0.32, APPUI, -1.12);
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
      col.boiteO(CH.x + x, CH.z + z, 2.85, 0.45, Math.PI / 2 - a);
    }
    for (const q of [[-12.4, 17.1, -1.6, 25.4], [1.6, 17.1, 12.4, 25.4], [19.1, -8.4, 25.9, 8.4], [-25.9, -8.4, -19.1, 8.4]]) cols.push(q); // les parterres
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
    // Trois maisons reçoivent une devanture (Teddy, 25/11/2026 : « de l'activité au château, des restaurants, des
    // terrasses ») : deux restaurants et un café, la première maison de genre 2 près de chaque angle visé (à côté de
    // l'arrivée de la route, à côté du belvédère, face aux jardins) ; elle tire quand même au sort les fenêtres que sa
    // devanture remplace (tirage : le village ne bouge pas)
    const RESTOS = [
      { a: -1.86, nom: 'LE RELAIS DES TOURELLES', c: '#7a2233', genre: 'resto', chaise: '#2d2d33' },
      { a: 1.14, nom: 'CAFÉ DE LA POIVRIÈRE', c: '#2f4a6b', genre: 'bar', chaise: '#b08a5a' },
      { a: 2.27, nom: 'CRÊPERIE DU CHÂTELET', c: '#2f5d50', genre: 'resto', chaise: '#2d2d33' },
    ];
    let a = -Math.PI / 2 + 0.05, n = 0;
    while (a < Math.PI * 1.5 - 0.05) {
      const w = 8 + Math.floor(rnd() * 5), d = 7.5 + rnd() * 1.5, h = 5.8 + rnd() * 1.8, dem = w / 2 + 0.4;
      const ac = a + dem / RF;
      if (!libre(ac, dem)) { a += 0.06; continue; }
      const r = RF + d / 2, x = CH.x + Math.cos(ac) * r, z = CH.z + Math.sin(ac) * r;
      const genre = n % 3, rot = Math.atan2(-Math.cos(ac), -Math.sin(ac));
      const R0 = genre === 2 ? RESTOS.find(q => !q.o && Math.abs(angle(ac - q.a)) < 0.45) : null;
      const om = maison({
        x, z, y: Y, w, d, h, rot, volets: genre === 1 ? null : pick(VOLETS),
        mur: genre === 1 ? pick(['#e6d4b0', '#ead9bb', '#e9d2a8']) : genre === 0 ? TUF : undefined,
        tourelle: genre === 0 && w >= 9, colombages: genre === 1, lucarnes: true,
        ...(R0 ? { vitrine: R0.c, boutique: R0.genre, banne: R0.c, porteC: R0.c, tirage: true } : {}),
      });
      if (R0) { R0.o = om; R0.ac = ac; }
      villageChateau.maisons.push({ ac, x, z, w, d, rot });
      // mur de jardin jusqu'à la maison suivante
      const ecart = 1.6 + rnd() * 2.2, a1 = ac + dem / RF, a2 = a1 + ecart / RF;
      const am = (a1 + a2) / 2, xm = CH.x + Math.cos(am) * (RF + 0.6), zm = CH.z + Math.sin(am) * (RF + 0.6);
      bati.push(B(ecart + 0.3, 1.9, 0.5, '#cdbf9f', xm, Y + 0.95, zm, Math.PI / 2 - am), B(ecart + 0.4, 0.12, 0.62, APPUI, xm, Y + 1.94, zm, Math.PI / 2 - am));
      col.boiteO(xm, zm, ecart + 0.3, 0.5, Math.PI / 2 - am);
      a = a2; n++;
    }
    villageTerrasses(RESTOS, RF, jA, rBord, surf);
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
        villageChateau.bancs.push({ x: xb, z: zb, h: rb, y: Y });
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
    // pas d'arbre des collines dans les vignes ni sur leurs chemins (ils arrêtent : on y fait demi-tour en tracteur)
    const dSeg = (x, z, [ax, az], [bx, bz]) => { const ux = bx - ax, uz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * ux + (z - az) * uz) / (ux * ux + uz * uz))); return Math.hypot(x - ax - ux * t, z - az - uz * t); };
    const presVigne = (x, z) => PARCELLES.some(([x0, z0, x1, z1]) => x > x0 - 12 && x < x1 + 12 && z > z0 - 12 && z < z1 + 12)
      || CHEMINS.some(pts => pts.some((q, i) => i > 0 && dSeg(x, z, pts[i - 1], q) < 7));
    for (let i = 0; i < 300; i++) {
      const a = rnd() * Math.PI * 2, r = 205 + rnd() * 230, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(z - 10) < 28 || naturelle(x, z) < 3) continue; // (mêmes tirages qu'avant la route du château)
      const t = rnd() < 0.3 ? 'peuplier' : 'chene';
      if (!reserve(x, z) && !presMaison(x, z, 6) && !presVigne(x, z) && !dansZA(x, z, 8)) arbres.push([x, z, t, sol(x, z)]); // (la zone d'activités : tirés, pas plantés)
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
      // tronc (th), centre, largeur et demi-hauteur du feuillage : le tronc monte jusqu'au milieu du bas du feuillage (Teddy,
      // 25/11/2026 : « il y a un espace entre le tronc et les feuilles » ; le bas d'un feuillage peu facetté est plus haut
      // que son rayon, et le vent le balance)
      const [th, fy, fx, fyS] = t === 'peuplier' ? [5.5, 8.2, 1.3, 4.2] : t === 'platane' ? [4.5, 5.6, 2.7, 2.1] : t === 'cedre' ? [4.6, 6, 4.2, 2.6] : [3.4, 4.6, 2.6, 2.2];
      q.setFromAxisAngle(axe, rnd() * 6.28);
      const tr = copie(modele.tronc, t === 'platane' ? '#a99a7c' : '#6a5441');
      tr.applyMatrix4(m.compose(p.set(x, y, z), q, e.set(k * (t === 'cedre' ? 1.8 : 1), th * k, k * (t === 'cedre' ? 1.8 : 1))));
      const fe = copie(y ? modele.fe0 : modele.fe1, pick(FEU[t]));
      fe.applyMatrix4(m.compose(p.set(x, y + fy * k, z), q, e.set(fx * k, fyS * k, fx * k * (0.9 + rnd() * 0.2))));
      // le chêne qui poussait là où est maintenant l'entrepôt de l'imprimeur : ses tirages sont faits (le reste du monde ne
      // bouge pas), il n'est pas planté
      if (y === 0 && dansEntrepot(x, z, 0)) continue;
      // de même, le peuplier à l'est de l'entrée de l'allée du domaine : une remorque qui y entre en venant du bourg
      // passe à l'intérieur du virage (mission 3)
      if (t === 'peuplier' && z === -3.5 && x > -86 && x < -76) continue;
      bati.push(tr, fe);
      col.boiteC(x, z, 0.6 * k * (t === 'cedre' ? 1.8 : 1), 0.6 * k * (t === 'cedre' ? 1.8 : 1)); // tous arrêtent : les collines se parcourent
      if (y === 0) {
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
    if (!reserve(x, z, 4) && !presMaison(x, z, 4) && !dansZA(x, z, 6)) bati.push(C(0.78, 0.78, 1.25, 12, '#d6b058', x, sol(x, z) + 0.72, z, 'z', rot));
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
  panneau(direction('Domaine du Clos Libre', 30), 2.2, 0.36, -93.8, 2.0, 5.6, 0); // (à l'ouest de l'allée : hors du virage d'un tracteur et de sa remorque qui y entrent en venant du bourg)
  panneau(direction('Château', 34), 1.5, 0.34, -172.2, 2.0, 5.6, 0); // à l'embranchement de la route du château

  /* ------------------------------------------------------------ l'entrepôt de l'imprimeur-étiqueteur (mission 3)
     Un prestataire d'habillage, au sud-est après la dernière maison du bourg : un hangar moderne en bardage métallique
     nervuré, sa grande porte sectionnelle ouverte sur la cour (pignon est), la porte de service et le bureau vitré dans
     l'angle nord-est, l'enseigne tournée vers la départementale. Dedans, vue par la porte : la ligne d'habillage (table
     d'entrée des bouteilles nues, tirées-bouchées ; convoyeur ; le monobloc : distributeur de capsules et étiqueteuse,
     ses bobines d'étiquettes ; table de sortie des bouteilles habillées), l'imprimante d'étiquettes, les rayonnages de
     bobines, palettes de cartons, établi, néons. L'intérieur est un maillage à part, sans ombre portée, dessiné de près
     seulement (maj) ; le soleil y est coupé, les néons éclairent (definirInterieur). Les bouteilles qui avancent sont des
     instances : une bouteille nue passe dans le monobloc et en ressort habillée (ligne.maj). Dans la cour (son enrobé :
     plus haut) : chariot élévateur, palettes, bobines sur palette, benne, mât d'éclairage ; la voiture du personnel est
     garée (lieux.garees). Coordonnées du monde ; rien n'est tiré au sort ; les collisions sont posées après les herbes. */
  function entrepot() {
    const { x0, x1, z0, z1, h, p0, p1, ph, LX } = EN, L = [], I = [], ep = 0.2, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
    const BARD = '#b9c0c6', NERV = '#aab2b9', BANDE = '#3f5a73', SOCLE = '#8f8a80', ALU = '#c9ccd1', GRIS = '#5f656d';
    const VERRE_E = '#2d3846', INOX = '#a3aab2', JAUNE = '#e0b13a', NOIR = '#2b2b30', PANNEAU = '#e3e7ea', PLAFOND = '#dde2e6', PAL = '#9a7b55', CARTON = '#b98a55';
    // un pan : le long de x (en z = c) ou de z (en x = c), de u0 à u1, de y0 à y1, d'épaisseur e
    const pan = (liste, axe, c, u0, u1, y0, y1, coul, e) => liste.push(axe === 'x' ? B(u1 - u0, y1 - y0, e, coul, (u0 + u1) / 2, (y0 + y1) / 2, c) : B(e, y1 - y0, u1 - u0, coul, c, (y0 + y1) / 2, (u0 + u1) / 2));
    // Les quatre murs et leurs baies : les fenêtres du bureau (long pan nord, x de 167,2 à 171 ; pignon est, z de 21 à
    // 22,4), la porte de service (pignon est, z de 22,9 à 23,9), la grande porte (z de p0 à p1). [u0, u1, ouverture (y0, y1)]
    const BAIES = {
      nord: [[x0, 167.2], [167.2, 171.0, 1.0, 2.3], [171.0, x1]],
      sud: [[x0, x1]], ouest: [[z0, z1]],
      est: [[z0, 21.0], [21.0, 22.4, 1.0, 2.3], [22.4, 22.9], [22.9, 23.9, 0, 2.2], [23.9, p0], [p0, p1, 0, ph], [p1, z1]],
    };
    const MURS = { nord: ['x', z0, -1], sud: ['x', z1, 1], ouest: ['z', x0, -1], est: ['z', x1, 1] }; // axe, face extérieure, sens
    for (const [nom, [axe, f, s]] of Object.entries(MURS)) {
      const cm = f - s * ep / 2, ci = f - s * (ep + 0.01); // le milieu du mur, sa face intérieure (panneaux clairs)
      for (const [u0, u1, a, b] of BAIES[nom]) {
        const morceaux = a === undefined ? [[0, h]] : [[0, a], [b, h]].filter(([y0, y1]) => y1 - y0 > 0.01);
        for (const [y0, y1] of morceaux) {
          pan(L, axe, cm, u0, u1, y0, y1, BARD, ep);
          pan(I, axe, ci, Math.max(u0, (axe === 'x' ? x0 : z0) + ep), Math.min(u1, (axe === 'x' ? x1 : z1) - ep), y0, Math.min(y1, 5.95), PANNEAU, 0.02);
        }
        // nervures du bardage (sur les pans pleins), soubassement de béton (sauf aux portes)
        if (a === undefined) for (let u = u0 + 0.3; u < u1 - 0.2; u += 0.6) L.push(axe === 'x' ? B(0.09, h - 1.2, 0.04, NERV, u, 0.45 + (h - 1.2) / 2, f + s * 0.02) : B(0.04, h - 1.2, 0.09, NERV, f + s * 0.02, 0.45 + (h - 1.2) / 2, u));
        if (a !== 0) pan(L, axe, f + s * 0.03, u0, u1, 0, 0.45, SOCLE, 0.06);
      }
      // le bandeau bleu en haut du mur, la couvertine ; une plinthe grise côté intérieur (sauf au pignon des portes)
      const [lo, hi] = axe === 'x' ? [x0, x1] : [z0, z1];
      pan(L, axe, f + s * 0.025, lo - 0.05, hi + 0.05, h - 0.75, h, BANDE, 0.05);
      pan(L, axe, cm, lo - 0.08, hi + 0.08, h, h + 0.06, ALU, 0.32);
      if (nom !== 'est') pan(I, axe, f - s * (ep + 0.025), lo + ep, hi - ep, 0, 1.0, '#9aa3aa', 0.02);
    }
    // le toit plat derrière l'acrotère, ses lanterneaux ; les descentes d'eau aux angles
    L.push(B(x1 - x0 - 0.4, 0.2, z1 - z0 - 0.4, '#8a9098', xm, 6.1, zm));
    for (const x of [156, 161.5, 167]) L.push(B(1.3, 0.12, 3.1, ALU, x, 6.26, zm), B(1.2, 0.3, 3.0, '#dfe8ee', x, 6.4, zm));
    for (const [x, z] of [[x0 - 0.1, z0 - 0.1], [x1 + 0.1, z0 - 0.1], [x0 - 0.1, z1 + 0.1], [x1 + 0.1, z1 + 0.1]]) L.push(C(0.06, 0.06, h, 6, '#8a9098', x, h / 2, z));
    // la grande porte : son cadre, deux appliques, deux bornes jaunes ; la porte de service, son auvent, sa lampe
    const pc = (p0 + p1) / 2;
    L.push(B(0.12, ph + 0.1, 0.14, GRIS, x1 + 0.06, (ph + 0.1) / 2, p0 - 0.07), B(0.12, ph + 0.1, 0.14, GRIS, x1 + 0.06, (ph + 0.1) / 2, p1 + 0.07), B(0.12, 0.14, p1 - p0 + 0.28, GRIS, x1 + 0.06, ph + 0.07, pc));
    for (const z of [p0 - 0.55, p1 + 0.55]) L.push(B(0.3, 0.14, 0.2, NOIR, x1 + 0.15, ph + 0.5, z), B(0.2, 0.05, 0.14, '#ffe1a0', x1 + 0.2, ph + 0.42, z));
    for (const z of [p0 - 0.35, p1 + 0.35]) L.push(C(0.09, 0.09, 1.0, 8, JAUNE, x1 + 0.5, 0.5, z), C(0.093, 0.093, 0.12, 8, NOIR, x1 + 0.5, 0.75, z));
    L.push(B(0.05, 2.15, 0.96, GRIS, x1 - ep / 2, 1.075, 23.4), B(0.04, 0.03, 0.12, ALU, x1 - 0.05, 1.05, 23.75));
    L.push(B(1.0, 0.08, 1.5, ALU, x1 + 0.5, 2.55, 23.4), B(0.6, 0.04, 0.04, GRIS, x1 + 0.3, 2.35, 22.75), B(0.6, 0.04, 0.04, GRIS, x1 + 0.3, 2.35, 24.05));
    L.push(B(0.2, 0.12, 0.14, NOIR, x1 + 0.1, 2.85, 23.4), B(0.14, 0.05, 0.1, '#ffe1a0', x1 + 0.14, 2.8, 23.4));
    // les fenêtres du bureau : vitrage teinté, montants d'aluminium, appui
    L.push(B(3.8, 1.3, 0.04, VERRE_E, 169.1, 1.65, z0 + ep / 2), B(3.9, 0.06, 0.28, ALU, 169.1, 0.98, z0 + 0.04));
    for (const x of [167.2, 168.47, 169.73, 171.0]) L.push(B(0.06, 1.3, 0.24, ALU, x, 1.65, z0 + ep / 2));
    L.push(B(0.04, 1.3, 1.4, VERRE_E, x1 - ep / 2, 1.65, 21.7), B(0.28, 0.06, 1.5, ALU, x1 - 0.04, 0.98, 21.7));
    for (const z of [21.0, 22.4]) L.push(B(0.24, 1.3, 0.06, ALU, x1 - ep / 2, 1.65, z));
    // le long pan sud et le pignon ouest : sous le bandeau, la bande de plaques translucides qui éclaire le hangar ; au sud,
    // la porte de secours, son pictogramme et son applique ; à l'ouest, le coffret électrique et le compteur de gaz
    for (const [axe, c, s, lo, hi] of [['x', z1, 1, x0 + 0.5, x1 - 0.5], ['z', x0, -1, z0 + 0.5, z1 - 0.5]]) {
      pan(L, axe, c + s * 0.05, lo, hi, 4.85, 5.6, '#dfe8ee', 0.03);
      for (const y of [4.83, 5.62]) pan(L, axe, c + s * 0.07, lo - 0.04, hi + 0.04, y - 0.03, y + 0.03, ALU, 0.04);
      for (let u = lo; u <= hi + 0.01; u += (hi - lo) / Math.round((hi - lo) / 1.25)) pan(L, axe, c + s * 0.07, u - 0.03, u + 0.03, 4.8, 5.65, ALU, 0.04);
    }
    {
      const xp = 162.5, f = z1;
      L.push(B(1.1, 2.2, 0.08, GRIS, xp, 1.1, f + 0.05), B(0.95, 2.1, 0.05, '#7d8288', xp, 1.05, f + 0.08), B(0.5, 0.04, 0.06, '#c0392b', xp, 1.05, f + 0.12), B(0.4, 0.15, 0.03, '#2e9e4f', xp, 2.45, f + 0.06));
      L.push(B(0.2, 0.12, 0.14, NOIR, xp + 0.9, 2.6, f + 0.08), B(0.14, 0.05, 0.1, '#ffe1a0', xp + 0.9, 2.55, f + 0.12), B(1.6, 0.03, 0.9, '#8f8a80', xp, 0.015, f + 0.45));
      I.push(B(0.95, 2.1, 0.02, '#7d8288', xp, 1.05, f - ep - 0.02));
      L.push(B(0.14, 0.9, 0.6, '#c9ccd1', x0 - 0.08, 1.25, 30.0), B(0.02, 0.06, 0.2, NOIR, x0 - 0.16, 1.4, 30.0), B(0.14, 0.5, 0.4, '#e0b13a', x0 - 0.08, 0.8, 28.9), C(0.03, 0.03, 0.8, 6, '#e0b13a', x0 - 0.06, 0.4, 28.5));
    }
    // l'enseigne, tournée vers la départementale ; celle de la grande porte
    enseigne('IMPRIMERIE SAINT-VINCENT', { x: 160.5 + DX_EN, z: z0 - 0.07, rot: Math.PI }, 4.55, 10.4, 1.0, BANDE, '#f4f1ea');
    enseigne('ÉTIQUETTES · HABILLAGE', { x: 160.5 + DX_EN, z: z0 - 0.07, rot: Math.PI }, 3.6, 5.4, 0.5, '#f4f1ea', BANDE);
    enseigne('IMPRIMERIE SAINT-VINCENT', { x: x1 + DX_EN + 0.07, z: pc, rot: Math.PI / 2 }, 5.25, 5.0, 0.55, BANDE, '#f4f1ea');

    /* -- la cour : deux piles de palettes vides, une palette de bobines d'étiquettes filmées près de l'angle du hangar, la
       benne à cartons, un mât d'éclairage (le chariot élévateur, qui décharge les palox, est à part : remorque.js) */
    {
      for (const [x, z, n] of [[184.9, 27.9, 7], [184.9, 29.2, 4]]) {
        for (let i = 0; i < n; i++) L.push(B(0.8, 0.13, 1.2, i % 2 ? PAL : '#8a6e4c', x, 0.07 + i * 0.145, z));
        contact.tache(x + DX_EN, z, 0.6, 0.8, 0.3);
      }
      L.push(B(1.2, 0.14, 0.8, PAL, 172.75, 0.07, 31.75));
      for (const dx of [-0.29, 0.29]) for (const dz of [-0.2, 0.2]) for (let k = 0; k < 3; k++) {
        L.push(C(0.19, 0.19, 0.12, 12, k === 2 ? '#efe4c8' : '#f7f5ef', 172.75 + dx, 0.2 + k * 0.125, 31.75 + dz));
        if (k === 2) L.push(C(0.055, 0.055, 0.012, 8, '#8d7c66', 172.75 + dx, 0.39, 31.75 + dz));
      }
      contact.tache(172.75 + DX_EN, 31.75, 0.8, 0.6, 0.3);
      L.push(B(2.0, 1.3, 3.8, '#3d5a4a', 182.8, 0.8, 44.0), B(2.1, 0.1, 3.9, '#2f4a3c', 182.8, 1.5, 44.0), B(1.8, 0.1, 3.6, '#c9a87a', 182.8, 1.4, 44.0));
      for (const z of [42.4, 45.6]) L.push(B(2.2, 0.15, 0.3, '#2f4a3c', 182.8, 0.08, z));
      contact.tache(182.8 + DX_EN, 44.0, 1.4, 2.2, 0.35);
      L.push(C(0.07, 0.1, 6.4, 6, GRIS, 185.6, 3.2, 33.6), B(1.1, 0.08, 0.1, GRIS, 185.1, 6.35, 33.6), B(0.5, 0.12, 0.3, NOIR, 184.6, 6.3, 33.6), B(0.4, 0.04, 0.22, '#ffe1a0', 184.6, 6.23, 33.6));
    }
    for (const g of L) deplacer(g, DX_EN, 0, 0);
    bati.push(...L);
    contact.jupe(x0 + DX_EN - 0.07, z0 - 0.07, x1 + DX_EN + 0.07, z1 + 0.07, 1.6, 0.45);
    plan.push({ t: 'b', x0: x0 + DX_EN, z0, x1: x1 + DX_EN, z1 });

    /* -- dedans : le sol de béton et ses allées jaunes, le plafond, la charpente, les néons, la porte sectionnelle
       enroulée sous le plafond, le bureau vitré */
    I.push(B(x1 - x0 - 0.4, 0.04, z1 - z0 - 0.4, SOCLE, xm, 0.02, zm), B(x1 - x0 - 0.4, 0.04, z1 - z0 - 0.4, PLAFOND, xm, 5.95, zm));
    for (const x of [LX + 1.25, LX - 2.1]) I.push(B(0.09, 0.006, z1 - z0 - 1.4, JAUNE, x, 0.043, zm));
    I.push(B(x1 - LX - 1.6, 0.006, 0.09, JAUNE, (x1 + LX + 1.25) / 2 - 0.1, 0.043, 24.8));
    for (const x of [156.5, 161.5, 166.5]) {
      for (const z of [z0 + ep + 0.13, z1 - ep - 0.13]) I.push(B(0.24, 5.9, 0.24, BANDE, x, 2.95, z));
      I.push(B(0.2, 0.4, z1 - z0 - 0.4, BANDE, x, 5.7, zm));
    }
    for (const x of [154.5, 158.5, 162.5, 166.5, 170.0]) for (const z of [24.0, 29.0]) {
      I.push(B(1.5, 0.07, 0.2, '#8a9098', x, 5.42, z), B(1.4, 0.04, 0.12, '#eef0f2', x, 5.37, z));
      for (const d of [-0.6, 0.6]) I.push(C(0.006, 0.006, 0.5, 4, NOIR, x + d, 5.7, z));
    }
    I.push(B(4.4, 0.06, p1 - p0 + 0.1, ALU, x1 - 2.45, ph + 0.32, pc));
    for (const z of [p0 - 0.02, p1 + 0.02]) I.push(B(4.4, 0.06, 0.06, GRIS, x1 - 2.45, ph + 0.26, z), B(0.06, ph + 0.3, 0.08, GRIS, x1 - ep - 0.05, (ph + 0.3) / 2, z + (z < pc ? 0.06 : -0.06)));
    I.push(B(0.35, 0.3, 0.45, GRIS, x1 - 4.75, ph + 0.32, pc + 1.0));
    {
      // le bureau vitré, dans l'angle nord-est : allège, vitrage, montants ; sa porte ; son plafond ; dedans, un bureau,
      // l'écran, la chaise, un classeur, une plante
      const bx0 = 166.6, bx1 = x1 - ep, bz0 = z0 + ep, bz1 = 24.4;
      I.push(B(bx1 - bx0, 1.0, 0.1, PANNEAU, (bx0 + bx1) / 2, 0.5, bz1), B(bx1 - bx0, 1.55, 0.03, '#3d5f8e', (bx0 + bx1) / 2, 1.78, bz1), B(bx1 - bx0, 0.08, 0.12, ALU, (bx0 + bx1) / 2, 2.6, bz1));
      for (const x of [bx0, 168.2, 169.8, bx1]) I.push(B(0.06, 1.6, 0.12, ALU, x, 1.8, bz1));
      I.push(B(0.1, 1.0, 23.2 - bz0, PANNEAU, bx0, 0.5, (bz0 + 23.2) / 2), B(0.03, 1.55, 23.2 - bz0, '#3d5f8e', bx0, 1.78, (bz0 + 23.2) / 2), B(0.12, 0.08, bz1 - bz0, ALU, bx0, 2.6, (bz0 + bz1) / 2));
      I.push(B(0.04, 2.1, 0.92, '#3d5f8e', bx0, 1.05, 23.7), B(0.07, 2.16, 0.06, ALU, bx0, 1.08, 23.22), B(0.07, 2.16, 0.06, ALU, bx0, 1.08, 24.2), B(0.06, 0.04, 0.14, ALU, bx0 + 0.04, 1.05, 23.35));
      I.push(B(bx1 - bx0, 0.05, bz1 - bz0, PLAFOND, (bx0 + bx1) / 2, 2.68, (bz0 + bz1) / 2));
      I.push(B(1.6, 0.05, 0.7, PAL, 169.4, 0.75, 21.15));
      for (const [x, z] of [[168.7, 20.88], [170.1, 20.88], [168.7, 21.42], [170.1, 21.42]]) I.push(B(0.05, 0.73, 0.05, NOIR, x, 0.365, z));
      I.push(B(0.5, 0.32, 0.03, NOIR, 169.3, 1.0, 20.95), B(0.46, 0.28, 0.035, '#dfeef8', 169.3, 1.0, 20.965), B(0.06, 0.16, 0.06, NOIR, 169.3, 0.84, 20.95));
      I.push(B(0.46, 0.06, 0.46, '#3b3f48', 169.4, 0.47, 21.95), B(0.46, 0.5, 0.05, '#3b3f48', 169.4, 0.78, 22.2), C(0.025, 0.025, 0.4, 6, NOIR, 169.4, 0.24, 21.95));
      I.push(B(0.46, 1.2, 0.5, '#8d949c', 167.0, 0.6, 21.0), C(0.15, 0.12, 0.3, 8, '#b5532e', 170.9, 0.15, 23.9), S(0.25, '#4f7a32', 170.9, 0.55, 23.9, 1, 1.3, 1, 1));
    }
    /* -- la ligne d'habillage, le long de z en x = LX : la table d'entrée (z de 21,7 à 23,4), le convoyeur (de 23,4 à
       29,4), le monobloc autour de z = 26,7 (corps sur le côté ouest, capot au-dessus du convoyeur, bobines d'étiquettes
       sur sa face ouest, distributeur de capsules au-dessus, écran de commande côté est), la table de sortie (de 29,4 à
       31,3) ; une palette de cartons de bouteilles nues pour la nourrir, une de cartons vides pour ranger les habillées */
    const ZM = 26.7, ZC0 = 23.4, LC = 6.0, YB = 0.892;
    const table = (zc, lz) => {
      I.push(B(1.2, 0.05, lz, INOX, LX, 0.875, zc), B(0.03, 0.05, lz, ALU, LX - 0.6, 0.925, zc), B(0.03, 0.05, lz, ALU, LX + 0.6, 0.925, zc));
      for (const dx of [-0.55, 0.55]) for (const dz of [-lz / 2 + 0.05, lz / 2 - 0.05]) I.push(B(0.05, 0.85, 0.05, GRIS, LX + dx, 0.425, zc + dz));
    };
    table(22.55, 1.7); table(30.35, 1.9);
    I.push(B(1.2, 0.05, 0.03, ALU, LX, 0.925, 21.72), B(1.2, 0.05, 0.03, ALU, LX, 0.925, 31.28));
    I.push(B(0.36, 0.1, LC, '#8e959c', LX, 0.84, ZC0 + LC / 2), B(0.26, 0.012, LC, '#3a3c42', LX, 0.886, ZC0 + LC / 2));
    for (const s of [-1, 1]) I.push(B(0.02, 0.05, LC, ALU, LX + s * 0.13, 0.95, ZC0 + LC / 2));
    for (const z of [23.6, 25.1, 28.1, 29.2]) for (const s of [-1, 1]) I.push(B(0.05, 0.8, 0.05, GRIS, LX + s * 0.15, 0.4, z));
    I.push(C(0.08, 0.08, 0.25, 8, GRIS, LX + 0.3, 0.72, 23.65, 'x'));
    I.push(B(0.95, 1.3, 2.2, '#e8eaec', LX - 0.68, 0.65, ZM), B(1.35, 0.32, 2.2, '#e8eaec', LX - 0.45, 1.62, ZM), B(0.97, 0.06, 2.22, BANDE, LX - 0.68, 1.3, ZM));
    for (const dz of [-1.05, 1.05]) I.push(B(0.06, 0.62, 0.06, ALU, LX + 0.19, 1.15, ZM + dz));
    for (const dz of [-0.45, 0.35]) I.push(B(0.3, 0.32, 0.22, '#c9ccd1', LX - 0.26, 1.18, ZM + dz));
    for (const dz of [-0.5, 0.55]) I.push(C(0.3, 0.3, 0.02, 14, ALU, LX - 1.17, 0.95, ZM + dz, 'x'), C(0.26, 0.26, 0.09, 14, '#f7f5ef', LX - 1.23, 0.95, ZM + dz, 'x'), C(0.07, 0.07, 0.1, 8, '#8d7c66', LX - 1.235, 0.95, ZM + dz, 'x'));
    I.push(C(0.2, 0.1, 0.45, 10, INOX, LX - 0.5, 2.0, ZM - 0.8), C(0.19, 0.19, 0.03, 10, '#7d2333', LX - 0.5, 2.215, ZM - 0.8), B(0.06, 0.3, 0.06, ALU, LX - 0.3, 1.78, ZM - 0.8));
    I.push(B(0.3, 0.04, 0.04, GRIS, LX + 0.4, 1.5, ZM + 1.25), B(0.04, 0.32, 0.46, NOIR, LX + 0.55, 1.5, ZM + 1.25), B(0.045, 0.26, 0.4, '#dfeef8', LX + 0.57, 1.5, ZM + 1.25));
    I.push(C(0.035, 0.035, 0.1, 8, '#2f9e63', LX - 0.3, 1.83, ZM + 0.9), C(0.035, 0.035, 0.1, 8, JAUNE, LX - 0.3, 1.93, ZM + 0.9), C(0.035, 0.035, 0.1, 8, '#c0392b', LX - 0.3, 2.03, ZM + 0.9));
    const palette = (x, z, n, couches, vide) => {
      I.push(B(0.8, 0.14, 1.2, PAL, x, 0.07, z));
      for (let k = 0; k < couches; k++) for (let i = 0; i < n; i++) I.push(B(0.38, vide ? 0.04 : 0.3, 0.54, (i + k) % 2 ? CARTON : '#ad7f4c', x + (i % 2 ? 0.2 : -0.2), 0.14 + (vide ? 0.02 + k * 0.045 : 0.15 + k * 0.31), z + (i < 2 ? -0.28 : 0.28)));
    };
    palette(165.0, 22.3, 4, 3, false); palette(LX + 1.55, 30.6, 4, 6, true);
    I.push(B(0.4, 0.3, 0.27, CARTON, LX + 0.95, 0.15, 31.2), B(0.4, 0.02, 0.27, '#8a6a3a', LX + 0.95, 0.31, 31.2));
    // à l'ouest : rayonnages de bobines d'étiquettes et de cartons, l'imprimante d'étiquettes, l'établi, des palettes
    {
      const r = hasard(7781), BOB = ['#f7f5ef', '#efe4c8', '#f4f1ea', '#c9a87a', '#e8eaec'];
      for (const z of [21.2, 23.85, 26.5, 29.15, 31.8]) for (const x of [151.8, 153.1]) I.push(B(0.08, 4.3, 0.08, BANDE, x, 2.15, z));
      for (const y of [1.4, 2.75, 4.1]) {
        for (const x of [151.8, 153.1]) I.push(B(0.06, 0.1, 10.6, '#d0702f', x, y, 26.5));
        I.push(B(1.3, 0.03, 10.6, '#9a8a72', 152.45, y + 0.065, 26.5));
        for (let z = 21.5; z < 31.6; z += 0.5) {
          if (r() < 0.25) continue;
          if (r() < 0.6) { const c = BOB[Math.floor(r() * BOB.length)]; for (let k = 0; k < 1 + Math.floor(r() * 3); k++) I.push(C(0.2, 0.2, 0.1, 10, c, 152.45, y + 0.13 + k * 0.105, z)); }
          else I.push(B(0.55, 0.3 + r() * 0.25, 0.42, r() < 0.5 ? CARTON : '#ad7f4c', 152.45, y + 0.25, z));
        }
      }
      for (let z = 21.9; z < 31.5; z += 1.3) { I.push(B(1.0, 0.13, 1.2, PAL, 152.45, 0.07, z)); for (let k = 0; k < 2; k++) I.push(B(0.9, 0.42, 1.1, k ? CARTON : '#ad7f4c', 152.45, 0.35 + k * 0.43, z)); }
      I.push(B(3.0, 1.15, 1.1, '#e8eaec', 155.6, 0.575, 21.65), B(2.8, 0.3, 0.9, '#c9ccd1', 155.6, 1.3, 21.65), B(3.02, 0.06, 1.12, BANDE, 155.6, 1.15, 21.65));
      I.push(C(0.28, 0.28, 0.32, 14, '#f7f5ef', 153.85, 0.85, 21.65, 'z'), C(0.22, 0.22, 0.32, 14, '#efe4c8', 157.35, 0.85, 21.65, 'z'));
      I.push(B(0.5, 0.32, 0.04, NOIR, 156.6, 1.62, 22.22), B(0.44, 0.26, 0.045, '#dfeef8', 156.6, 1.62, 22.24));
      I.push(B(2.4, 0.06, 0.6, PAL, 156.2, 0.9, 31.95), B(2.4, 1.0, 0.03, '#8d7c66', 156.2, 1.65, 32.27));
      for (const x of [155.1, 157.3]) I.push(B(0.06, 0.87, 0.5, GRIS, x, 0.435, 31.95));
      for (let i = 0; i < 6; i++) I.push(B(0.05, 0.25 + (i % 3) * 0.08, 0.04, ['#c0392b', NOIR, '#c9a55a'][i % 3], 155.4 + i * 0.35, 1.7, 32.24));
      palette(159.8, 31.5, 4, 2, false);
    }
    for (const g of I) deplacer(g, DX_EN, 0, 0);
    const inte = new THREE.Mesh(fusion(I), MAT);
    inte.receiveShadow = true; inte.castShadow = false; inte.name = 'entrepôt'; inte.visible = false;
    scene.add(inte);
    interieurs.push({ min: [x0 + DX_EN + 0.1, -1, z0 + 0.1], max: [x1 + DX_EN - 0.1, 6.0, z1 - 0.1], lampes: [155, 161, 167].flatMap(x => [[x + DX_EN, 5.2, 24], [x + DX_EN, 5.2, 29]]), couleur: [0.92, 0.96, 1.0] });

    /* -- les bouteilles : nues (verre sombre, bouchon apparent : tirées-bouchées) et habillées (capsule bordeaux, étiquette
       crème devant, côté ouest ; contre-étiquette blanche et son QR code derrière, côté est, vers la porte). Deux maillages
       en instances : les 24 premières avancent sur le convoyeur (ligne.maj) ; les autres attendent sur la table d'entrée
       ou sont rangées sur la table de sortie. Une bouteille cachée est réduite à rien, à sa place. Pas de couvercle aux
       bouts cachés (le fond sur la table, contre l'épaule, sous le bouchon ou la capsule). */
    const corps = col => [C(0.037, 0.037, 0.21, 7, '#1f3b2a', 0, 0.105, 0, 'y', 0, 0), C(0.016, 0.037, 0.06, 7, '#1f3b2a', 0, 0.24, 0, 'y', 0, 0), C(0.016, 0.016, 0.06, 7, '#1f3b2a', 0, 0.3, 0, 'y', 0, col)];
    const nue = fusion([...corps(1), C(0.0135, 0.0135, 0.012, 6, '#c9a86a', 0, 0.336, 0, 'y', 0, 1)]);
    const habillee = fusion([...corps(0), C(0.0175, 0.0175, 0.066, 7, '#7d2333', 0, 0.312, 0, 'y', 0, 1), B(0.006, 0.085, 0.058, '#efe4c8', -0.036, 0.118, 0),
      B(0.007, 0.012, 0.05, '#7d2333', -0.0365, 0.137, 0), B(0.006, 0.07, 0.05, '#f7f5ef', 0.036, 0.108, 0), B(0.007, 0.024, 0.024, '#2b2b30', 0.0365, 0.1, 0.009)]);
    const NF = 24, PAS = LC / NF;
    const nues = new THREE.InstancedMesh(nue, MAT, NF + 35), habs = new THREE.InstancedMesh(habillee, MAT, NF + 40), mm = new THREE.Matrix4();
    let k = NF;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) nues.setMatrixAt(k++, mm.makeTranslation(LX - 0.4 + i * 0.2, 0.9, 21.9 + j * 0.2));
    k = NF;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 8; j++) habs.setMatrixAt(k++, mm.makeTranslation(LX - 0.4 + i * 0.2, 0.9, 29.65 + j * 0.2));
    for (let i = 0; i < NF; i++) { nues.setMatrixAt(i, mm.identity()); habs.setMatrixAt(i, mm); }
    const A = nues.instanceMatrix.array, H = habs.instanceMatrix.array;
    // les bouteilles du convoyeur, avancées de d mètres : avant le monobloc nues, après habillées
    const placer = d => {
      for (let i = 0; i < NF; i++) {
        const z = ZC0 + (d + i * PAS) % LC, fait = z > ZM ? 1 : 0, o = i * 16;
        A[o] = A[o + 5] = A[o + 10] = 1 - fait; A[o + 12] = LX; A[o + 13] = YB; A[o + 14] = z;
        H[o] = H[o + 5] = H[o + 10] = fait; H[o + 12] = LX; H[o + 13] = YB; H[o + 14] = z;
      }
      envoyer(nues); envoyer(habs);
    };
    // seules les matrices des bouteilles du convoyeur partent vers la carte graphique
    const envoyer = im => { const m = im.instanceMatrix; m.clearUpdateRanges(); m.addUpdateRange(0, NF * 16); m.needsUpdate = true; };
    placer(0.1);
    for (const im of [nues, habs]) { im.castShadow = false; im.receiveShadow = true; im.name = 'bouteilles'; im.visible = false; im.position.x = DX_EN; im.updateMatrix(); im.computeBoundingSphere(); scene.add(im); }
    let parcouru = 0.1;
    const ligne = {
      // dt ; marche : la ligne tourne ; cx, cz : la caméra (de loin, ou bouteilles cachées, rien n'est calculé)
      maj(dt, marche, cx, cz) {
        if (!marche || !nues.visible) return;
        const dx = cx - LX - DX_EN, dz = cz - ZM;
        if (dx * dx + dz * dz > 2500) return;
        parcouru += dt * 0.32; // 32 cm/s : une bouteille toutes les trois quarts de seconde
        placer(parcouru % LC);
      },
      // dessinés seulement de près (monde.maj)
      voir(cx, cz) { const dx = cx - xm - DX_EN, dz = cz - zm, d2 = dx * dx + dz * dz; inte.visible = d2 < 4900; nues.visible = habs.visible = d2 < 2500; },
    };

    /* -- les collisions (posées après les herbes) : les murs (la grande porte laisse passer), le bureau, la ligne et le
       matériel ; dans la cour, le chariot, les palettes, les bobines, la benne, le mât, les bornes */
    plusTard.push(() => {
      const cb = (a, b, c, d) => col.boite(a + DX_EN, b, c + DX_EN, d);
      for (const [a, b, c, d] of [[x0, z0, x1, z0 + ep], [x0, z1 - ep, x1, z1], [x0, z0, x0 + ep, z1], [x1 - ep, z0, x1, p0], [x1 - ep, p1, x1, z1]]) cb(a, b, c, d).haut = true;
      for (const [a, b, c, d] of [[166.55, z0, x1, 24.47], [LX - 0.62, 21.68, LX + 0.62, 23.42], [LX - 0.2, 23.4, LX + 0.2, 29.4], [LX - 1.42, ZM - 1.1, LX + 0.25, ZM + 1.1],
        [LX - 0.62, 29.4, LX + 0.62, 31.32], [164.6, 21.7, 165.4, 22.9], [LX + 1.15, 30.0, LX + 1.95, 31.2], [151.7, 21.1, 153.2, 31.9], [153.6, 21.05, 157.55, 22.25],
        [154.95, 31.6, 157.45, z1 - ep], [159.4, 30.9, 160.2, 32.1], [184.5, 27.3, 185.3, 29.8], [172.15, 31.35, 173.35, 32.15],
        [181.75, 42.05, 183.85, 45.95], [185.5, 33.5, 185.7, 33.7]]) cb(a, b, c, d);
      for (const z of [p0 - 0.35, p1 + 0.35]) col.boiteC(x1 + DX_EN + 0.5, z, 0.2, 0.2);
    });
    return ligne;
  }
  const ligne = entrepot();

  /* ------------------------------------------------------------ la zone d'activités des Coteaux (relief.js : ZA)
     À la sortie du bourg vers l'est, de part et d'autre de la départementale (Teddy, 25/11/2026 : « une petite zone
     industrielle avec 2 ou 3 boîtes, à l'extérieur du village ; il y aura notre bureau aussi, de Solumatic ») : au sud,
     l'imprimerie Saint-Vincent (entrepot) ; au nord, une rue (x de 205,5 à 211,5) qui monte de la départementale jusqu'à
     la grille de Solumatic, au fond, en retrait (Teddy : « pas en bordure de route ») ; à l'est de la rue, la tonnellerie
     du Coteau et son parvis ; à l'ouest, un lot à vendre. Coordonnées du monde ; rien n'est tiré au sort ; collisions
     posées après les herbes. Le bâti fusionné avec son quartier ; le toit de Solumatic à part (il disparaît quand on est
     dedans), son intérieur à part (dessiné seulement dedans ou porte ouverte : solumatic.js). */
  function zoneActivites() {
    const L = [], boites = [];
    const GRIS_F = '#3b3f46', ALU = '#c9ccd1', VERRE = '#2d3846', FER = '#3a3a3e';
    const bat = (x0, z0, x1, z1) => { contact.jupe(x0 - 0.07, z0 - 0.07, x1 + 0.07, z1 + 0.07, 1.6, 0.45); plan.push({ t: 'b', x0, z0, x1, z1 }); };
    // un feuillage qui bouge au vent (poids croissant vers le haut ; k : sa part de vent)
    const feuille = (g, c, k = 1) => {
      g = teinter(g, c, T.feuillage);
      const p = g.attributes.position, n = p.count, w = new Float32Array(n);
      let y0 = Infinity, y1 = -Infinity;
      for (let i = 0; i < n; i++) { const y = p.getY(i); if (y < y0) y0 = y; if (y > y1) y1 = y; }
      for (let i = 0; i < n; i++) w[i] = k * (0.25 + 0.75 * (p.getY(i) - y0) / Math.max(0.01, y1 - y0));
      g.setAttribute('aVent', new THREE.BufferAttribute(w, 1));
      return g;
    };
    const tronc = (x, z, r, h, c = '#5e4a36') => L.push(teinter(C(r * 0.6, r, h, 6, c, x, h / 2, z), c, T.bois));
    // des arbres plantés là (pas tirés au sort) : sapin (des cônes étagés), feuillu, cyprès
    const sapin = (x, z, h = 11) => {
      tronc(x, z, 0.24, h * 0.35);
      for (let k = 0; k < 4; k++) { const y0 = h * (0.16 + k * 0.2), hh = h * (0.4 - k * 0.055), r = h * (0.22 - k * 0.042); L.push(feuille(C(0, r, hh, 8, k % 2 ? '#2f4a2e' : '#36532f', x, y0 + hh / 2, z), k % 2 ? '#2f4a2e' : '#36532f', 0.5)); }
      boites.push([x - 0.4, z - 0.4, x + 0.4, z + 0.4]); plan.push({ t: 'a', x, z, r: h * 0.2 }); contact.tache(x, z, h * 0.2, h * 0.2, 0.3);
    };
    const feuillu = (x, z, h = 8, c = '#6f8a3a', c2 = '#8a8f3a') => {
      tronc(x, z, 0.24, h * 0.6, '#6a5441');
      L.push(feuille(S(h * 0.32, c, x, h * 0.66, z, 1, 0.82, 1, 1), c), feuille(S(h * 0.2, c2, x + h * 0.14, h * 0.8, z - h * 0.08, 1, 0.9, 1, 0), c2));
      boites.push([x - 0.35, z - 0.35, x + 0.35, z + 0.35]); plan.push({ t: 'a', x, z, r: h * 0.3 }); contact.tache(x, z, h * 0.26, h * 0.26, 0.3);
    };
    const cypres = (x, z, h = 10) => {
      tronc(x, z, 0.16, h * 0.2);
      L.push(feuille(S(1, '#2c4a2c', x, h * 0.55, z, 0.95, h * 0.46, 0.95, 1), '#2c4a2c', 0.6));
      boites.push([x - 0.35, z - 0.35, x + 0.35, z + 0.35]); plan.push({ t: 'a', x, z, r: 1 });
    };
    // une haie taillée (charmille), d'un point à l'autre : des tronçons d'un mètre et demi, le dessus arrondi, un peu inégale
    const HAIE = ['#3f5a2c', '#4a6632', '#56723a'];
    let nH = 0;
    const haie = (xa, za, xb, zb, h = 1.85, ep = 0.9) => {
      const l = Math.hypot(xb - xa, zb - za), n = Math.max(1, Math.round(l / 1.5)), a = Math.atan2(xb - xa, zb - za), s = l / n;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = xa + (xb - xa) * t, z = za + (zb - za) * t, c = HAIE[nH % 3], hh = h + ((nH * 37) % 7) / 7 * 0.16 - 0.08;
        nH++;
        L.push(feuille(B(ep, hh - 0.2, s + 0.04, c, x, (hh - 0.2) / 2, z, a), c, 0.2), feuille(B(ep * 0.78, 0.22, s + 0.02, HAIE[(nH + 1) % 3], x, hh - 0.11, z, a), HAIE[(nH + 1) % 3], 0.35));
      }
      if (Math.abs(xb - xa) < 0.01 || Math.abs(zb - za) < 0.01) boites.push([Math.min(xa, xb) - ep / 2, Math.min(za, zb) - ep / 2, Math.max(xa, xb) + ep / 2, Math.max(za, zb) + ep / 2]);
      else plusTard.push(() => { col.boiteO((xa + xb) / 2, (za + zb) / 2, ep, l, a).haut = false; });
      plan.push({ t: 'l', pts: [[xa, za], [xb, zb]], c: '#4a6632', w: ep });
    };
    // une table de pique-nique en bois : le plateau, deux bancs, les pieds
    const pique = (x, z, rot = 0) => {
      const r = (lx, lz) => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];
      const pb = (w, h, d, c, lx, y, lz) => { const [X, Z] = r(lx, lz); L.push(B(w, h, d, c, X, y, Z, rot)); };
      for (const k of [-0.27, -0.09, 0.09, 0.27]) pb(1.8, 0.045, 0.17, '#9a7b55', 0, 0.74, k);
      for (const s of [-1, 1]) { pb(1.8, 0.045, 0.27, '#9a7b55', 0, 0.45, s * 0.6); }
      for (const e of [-0.62, 0.62]) { for (const s of [-1, 1]) pb(0.07, 0.74, 0.07, '#7d6b55', e, 0.37, s * 0.26); pb(0.07, 0.06, 1.5, '#7d6b55', e, 0.4, 0); }
      const q = Math.abs(Math.sin(rot)) > 0.5; boites.push(q ? [x - 0.8, z - 1.0, x + 0.8, z + 1.0] : [x - 1.0, z - 0.8, x + 1.0, z + 0.8]);
      contact.tache(x, z, 1.1, 0.9, 0.25);
    };

    /* -- la rue de la zone : bordures, arbres d'alignement à l'ouest, lampadaires à l'est, une borne d'incendie */
    for (const x of [205.42, 211.58]) L.push(B(0.16, 0.14, 50.6, '#d9cdb2', x, 0, -18.9));
    for (const z of [-6, -18, -30, -40]) feuillu(203.6, z, 6.5, '#8a8f3a', '#a6823a');
    for (const z of [-8, -28]) {
      L.push(C(0.06, 0.09, 5.4, 6, GRIS_F, 212.4, 2.7, z), B(1.0, 0.07, 0.1, GRIS_F, 211.95, 5.4, z), B(0.5, 0.1, 0.36, '#ffe1a0', 211.5, 5.33, z));
      boites.push([212.25, z - 0.15, 212.55, z + 0.15]);
    }
    L.push(C(0.12, 0.14, 0.7, 8, '#c0392b', 204.6, 0.35, -21.5), C(0.14, 0.14, 0.1, 8, '#c0392b', 204.6, 0.72, -21.5), C(0.05, 0.05, 0.3, 6, '#c0392b', 204.6, 0.5, -21.5, 'x'));
    boites.push([204.4, -21.7, 204.8, -21.3]);
    // le lot à vendre, à l'ouest de la rue
    panneau((c, W, H) => {
      c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, W, H); c.fillStyle = '#2c3e66'; c.fillRect(0, 0, W, H * 0.34);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f4f1ea'; c.font = 'bold 30px Arial, sans-serif'; c.fillText('ZA des Coteaux', W / 2, H * 0.17);
      c.fillStyle = '#2c3e66'; c.font = 'bold 34px Arial, sans-serif'; c.fillText('Lot disponible', W / 2, H * 0.58);
      c.font = '22px Arial, sans-serif'; c.fillText('à vendre', W / 2, H * 0.82);
    }, 1.8, 1.2, 196, 1.6, -14, 0);

    /* -- Solumatic, au fond : un rez-de-chaussée de 21,95 x 26,2 m à toit plat (les photos de Teddy ; le plan des bureaux,
       redressé : solumatic.js). La devanture, au sud, sur le parvis et la grille (Teddy, 26/11/2026 : l'atelier, Soleil et
       Atlas y donnent) : les deux vitrines de l'atelier sous un auvent, leurs rideaux métalliques levés, deux projecteurs ;
       les fenêtres de Soleil sous la bâche au logo ; la fenêtre et la double porte vitrée d'Atlas (une sortie de secours).
       La façade est, sur l'allée : la double porte de l'atelier, l'entrée (parement de pierre, porte vitrée, marquise), les
       fenêtres de Mars, Terre, Vénus et Mercure. Au nord et à l'ouest, les fenêtres des bureaux, le groupe de clim. Toutes
       ont leur volet roulant à moitié baissé. Le toit : bac acier clair au-dessus du rang de la devanture, membrane sombre
       et six lanterneaux ailleurs. Autour, une haie de charmille, la grille coulissante, le parvis et le parking, l'allée de
       l'entrée, une terrasse au nord, la pelouse à l'est, des tables de pique-nique, de grands sapins. Dedans, l'extérieur
       n'est plus dessiné : l'intérieur (un maillage à part, son plafond, ses écrans) se suffit à lui-même. */
    const I = interieurSolumatic();
    const toitS = [];
    let porteSolu, bache;
    {
      const { x0, x1, z0, z1, ep, H } = SOLU, X0 = x0 - ep, X1 = x1 + ep, Z0 = z0 - ep, Z1 = z1 + ep, HT = H + 0.35;
      const ENDUIT = '#e3ddcf', JOINT = '#cbc4b4', SOCLE = '#a8a49b', BLANC = '#f2f3f1', PIERRE = '#d3c4a3';
      const e0 = ENTREE.z - ENTREE.l / 2, e1 = ENTREE.z + ENTREE.l / 2, PIER0 = -63.35, PIER1 = -60.15; // (le parement de l'entrée, en z)
      const PT = PORTE_ATELIER, PA = PORTE_ATLAS, XA = x1 - 6.55; // (l'auvent, au-dessus de l'atelier)
      // les murs (creux : on entre), percés à la porte d'entrée ; le socle ; la couvertine de l'acrotère
      const mur = (w, d, x, z, y0 = 0) => L.push(B(w, HT - y0, d, ENDUIT, x, (y0 + HT) / 2, z));
      mur(ep, Z1 - Z0, x0 - ep / 2, (Z0 + Z1) / 2); mur(x1 - x0, ep, (x0 + x1) / 2, z0 - ep / 2); mur(x1 - x0, ep, (x0 + x1) / 2, z1 + ep / 2);
      mur(ep, e0 - Z0, x1 + ep / 2, (Z0 + e0) / 2); mur(ep, Z1 - e1, x1 + ep / 2, (e1 + Z1) / 2); mur(ep, ENTREE.l, x1 + ep / 2, ENTREE.z, ENTREE.h);
      L.push(B(X1 - X0 + 0.04, 0.32, 0.04, SOCLE, (X0 + X1) / 2, 0.16, Z0 - 0.02), B(0.04, 0.32, Z1 - Z0, SOCLE, X0 - 0.02, 0.16, (Z0 + Z1) / 2));
      for (const [a, b] of [[X0, PA.x - PA.l / 2 - 0.1], [PA.x + PA.l / 2 + 0.1, X1]]) L.push(B(b - a, 0.32, 0.04, SOCLE, (a + b) / 2, 0.16, Z1 + 0.02));
      for (const [a, b] of [[Z0, e0 - 0.1], [e1 + 0.1, PT.z - PT.l / 2 - 0.1], [PT.z + PT.l / 2 + 0.1, Z1]]) L.push(B(0.04, 0.32, b - a, SOCLE, X1 + 0.02, 0.16, (a + b) / 2));
      toitS.push(B(X1 - X0 + 0.1, 0.05, 0.42, ALU, (X0 + X1) / 2, HT + 0.02, Z0 + 0.15), B(X1 - X0 + 0.1, 0.05, 0.42, ALU, (X0 + X1) / 2, HT + 0.02, Z1 - 0.15));
      toitS.push(B(0.42, 0.05, Z1 - Z0, ALU, X0 + 0.15, HT + 0.02, (Z0 + Z1) / 2), B(0.42, 0.05, Z1 - Z0, ALU, X1 - 0.15, HT + 0.02, (Z0 + Z1) / 2));
      // les joints des panneaux d'enduit (tous les 2,4 m), hors du parement de pierre
      for (let x = X0 + 2.4; x < X1 - 0.5; x += 2.4) L.push(B(0.03, HT - 0.4, 0.02, JOINT, x, HT / 2 + 0.15, Z0 - 0.01), B(0.03, HT - 0.4, 0.02, JOINT, x, HT / 2 + 0.15, Z1 + 0.01));
      for (let z = Z0 + 2.4; z < Z1 - 0.5; z += 2.4) { L.push(B(0.02, HT - 0.4, 0.03, JOINT, X0 - 0.01, HT / 2 + 0.15, z)); if (z < PIER0 - 0.1 || z > PIER1 + 0.1) L.push(B(0.02, HT - 0.4, 0.03, JOINT, X1 + 0.01, HT / 2 + 0.15, z)); }
      // le parement de pierre de l'entrée, autour de la porte
      const parement = (d, z, y0) => L.push(B(0.06, HT - 0.13 - y0, d, PIERRE, X1 + 0.03, (y0 + HT - 0.13) / 2, z));
      parement(e0 - PIER0, (PIER0 + e0) / 2, 0.32); parement(PIER1 - e1, (e1 + PIER1) / 2, 0.32); parement(ENTREE.l + 0.02, ENTREE.z, ENTREE.h + 0.12);
      // une fenêtre (ou une vitrine) vue de dehors : le cadre blanc, la vitre, le volet roulant à moitié baissé (ses lames),
      // son coffre, l'appui ; m : le mur, p : la position le long, l : la largeur
      const fenetre = (m, p, l, y0 = 0.95, y1 = 2.25, volet = true) => {
        const ns = m === 's' || m === 'n', o = m === 's' || m === 'e' ? 1 : -1, hy = y1 - y0, ym = (y0 + y1) / 2;
        const fx = ns ? p : m === 'e' ? X1 : X0, fz = ns ? (m === 's' ? Z1 : Z0) : p;
        const pose = (w, h, d, c, y, av, le = 0) => L.push(ns ? B(w, h, d, c, fx + le, y, fz + o * av) : B(d, h, w, c, fx + o * av, y, fz + le));
        pose(l + 0.12, hy + 0.12, 0.05, volet ? BLANC : GRIS_F, ym, 0.02); pose(l - 0.06, hy - 0.04, 0.03, VERRE, ym, 0.045);
        const n = Math.ceil(l / 1.35); for (let i = 1; i < n; i++) pose(0.05, hy, 0.04, volet ? BLANC : GRIS_F, ym, 0.05, -l / 2 + i * l / n);
        if (volet) { pose(l - 0.06, hy * 0.48, 0.035, '#e9ebe8', y1 - hy * 0.24, 0.05); for (let y = y1 - hy * 0.48 + 0.08; y < y1; y += 0.09) pose(l - 0.06, 0.012, 0.04, '#cfd2cf', y, 0.055); }
        pose(l + 0.16, 0.22, 0.2, BLANC, y1 + 0.17, 0.08); if (y0 > 0.5) pose(l + 0.2, 0.05, 0.16, '#b9b6ae', y0 - 0.05, 0.08);
      };
      for (const [m, p, l] of FENETRES) fenetre(m, p, l);
      // les vitrines de l'atelier : l'alu sombre, leur rideau métallique levé (le coffre, les coulisses), l'auvent blanc
      // au-dessus de l'atelier, deux projecteurs
      for (const x of VITRINES) {
        fenetre('s', x, VITRINE.l, VITRINE.y0, VITRINE.y1, false);
        L.push(B(VITRINE.l + 0.3, 0.3, 0.3, BLANC, x, 2.62, Z1 + 0.15), B(0.08, VITRINE.y1, 0.1, '#9aa0a6', x - VITRINE.l / 2 - 0.12, VITRINE.y1 / 2, Z1 + 0.05), B(0.08, VITRINE.y1, 0.1, '#9aa0a6', x + VITRINE.l / 2 + 0.12, VITRINE.y1 / 2, Z1 + 0.05));
        toitS.push(B(0.3, 0.22, 0.12, GRIS_F, x, 3.62, Z1 + 0.1), B(0.26, 0.16, 0.02, '#fff6d8', x, 3.6, Z1 + 0.17));
      }
      toitS.push(B(X1 - XA + 0.2, 0.14, 1.15, BLANC, (XA + X1) / 2, 3.32, Z1 + 0.57), B(X1 - XA + 0.2, 0.22, 0.04, '#dcdedb', (XA + X1) / 2, 3.25, Z1 + 1.15));
      // la double porte vitrée d'Atlas, la sortie de secours (son pictogramme vert)
      L.push(B(PA.l + 0.16, PA.h + 0.08, 0.1, GRIS_F, PA.x, (PA.h + 0.08) / 2, Z1 + 0.02), B(PA.l - 0.1, PA.h - 0.1, 0.03, VERRE, PA.x, PA.h / 2, Z1 + 0.07), B(0.07, PA.h - 0.05, 0.05, GRIS_F, PA.x, PA.h / 2, Z1 + 0.08));
      L.push(B(PA.l + 0.3, 0.03, 0.5, '#8f8a80', PA.x, 0.015, Z1 + 0.25), B(0.4, 0.15, 0.03, '#2e9e4f', PA.x, PA.h + 0.25, Z1 + 0.03));
      // la double porte de l'atelier (tôle laquée, ses poignées), la petite marquise au-dessus
      L.push(B(0.1, PT.h + 0.08, PT.l + 0.16, GRIS_F, X1 + 0.02, (PT.h + 0.08) / 2, PT.z), B(0.03, PT.h - 0.05, PT.l - 0.06, '#d6d8da', X1 + 0.07, PT.h / 2, PT.z), B(0.04, PT.h - 0.05, 0.04, '#b9bcbf', X1 + 0.08, PT.h / 2, PT.z));
      for (const d of [-1, 1]) L.push(B(0.06, 0.03, 0.18, '#7d8288', X1 + 0.1, 1.05, PT.z + d * 0.12));
      L.push(B(0.9, 0.08, PT.l + 0.4, GRIS_F, X1 + 0.45, PT.h + 0.35, PT.z));
      toitS.push(B(0.12, 0.22, 0.3, GRIS_F, X1 + 0.1, 3.62, PT.z), B(0.02, 0.16, 0.26, '#fff6d8', X1 + 0.17, 3.6, PT.z));
      // l'entrée : l'encadrement d'aluminium, la marquise, l'applique, le paillasson, la plaque au logo
      L.push(B(0.12, ENTREE.h + 0.08, 0.08, GRIS_F, X1 + 0.02, (ENTREE.h + 0.08) / 2, e0 - 0.04), B(0.12, ENTREE.h + 0.08, 0.08, GRIS_F, X1 + 0.02, (ENTREE.h + 0.08) / 2, e1 + 0.04), B(0.12, 0.08, ENTREE.l + 0.16, GRIS_F, X1 + 0.02, ENTREE.h + 0.04, ENTREE.z));
      L.push(B(1.2, 0.08, 2.0, GRIS_F, X1 + 0.6, 2.72, ENTREE.z), B(1.1, 0.02, 1.9, '#b8c8d4', X1 + 0.6, 2.77, ENTREE.z));
      L.push(B(0.12, 0.22, 0.14, GRIS_F, X1 + 0.08, 2.3, e0 - 0.45), B(0.02, 0.1, 0.1, '#ffe1a0', X1 + 0.15, 2.26, e0 - 0.45));
      L.push(B(0.7, 0.02, 1.2, '#3a3a3a', X1 + 0.45, 0.075, ENTREE.z));
      atlas.poser(512, 121, (c, W, H) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); logoSolumatic(c, 16, 6, W - 32); }, 0.56, 0.132, X1 + 0.065, 1.55, e0 - 0.45, Math.PI / 2);
      // la bâche au logo, au-dessus des fenêtres de Soleil : sa propre texture, accrochée au toit
      {
        const bx = (x1 - 6.55 + x1 - 13.67) / 2, by = 3.2, bw = 5.6, bh = 1.28, cv = document.createElement('canvas');
        toitS.push(B(bw + 0.06, bh + 0.06, 0.03, '#d8d9d6', bx, by, Z1 + 0.02));
        cv.width = 1024; cv.height = 234;
        const c = cv.getContext('2d'), W = cv.width, H2 = cv.height, w = W * 0.86;
        c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H2);
        logoSolumatic(c, (W - w) / 2, (H2 - w * 378 / 1602) / 2, w);
        c.fillStyle = '#c8cac6'; for (const [x, y] of [[10, 10], [W - 10, 10], [10, H2 - 10], [W - 10, H2 - 10], [W / 2, 10], [W / 2, H2 - 10]]) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        bache = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh).translate(bx, by, Z1 + 0.04), new THREE.MeshLambertMaterial({ map: tex }));
        bache.name = 'bâche Solumatic'; bache.matrixAutoUpdate = false; bache.renderOrder = ORDRE.bati;
      }
      // les descentes d'eaux pluviales, aux angles ; le groupe de clim, au nord, sous le mur aveugle de Saturne
      for (const [x, z] of [[X0 + 0.15, Z0 - 0.12], [X1 - 0.15, Z0 - 0.12], [X1 + 0.12, Z1 - 0.15], [X0 - 0.12, Z1 - 0.15]]) toitS.push(C(0.05, 0.05, HT, 6, '#9aa0a6', x, HT / 2, z));
      L.push(B(1.0, 0.75, 0.38, '#d8dadc', x0 + 2.2, 0.6, Z0 - 0.3), C(0.28, 0.28, 0.02, 12, '#55585e', x0 + 2.2, 0.62, Z0 - 0.5, 'z'), B(0.05, 0.05, 0.5, '#9aa0a6', x0 + 1.8, 0.2, Z0 - 0.25), B(0.05, 0.05, 0.5, '#9aa0a6', x0 + 2.6, 0.2, Z0 - 0.25));
      boites.push([x0 + 1.65, Z0 - 0.55, x0 + 2.75, Z0]);
      bat(X0, Z0, X1, Z1);
      // les murs arrêtent ; la porte d'entrée fermée aussi (gestes.js passe sans s'arrêter) ; dedans, ce qui est meublé
      // arrête (solumatic.js) ; le bâtiment compte pour la caméra du dehors sans arrêter personne (fantome)
      boites.push([X0, Z0, x0, Z1], [x0, Z0, x1, z0], [x0, z1, x1, Z1], [x1, Z0, X1, e0], [x1, e1, X1, Z1]);
      plusTard.push(() => {
        const pc = col.boite(x1, e0, X1, e1); pc.haut = true; lieux.solumatic.colPorte = pc; // (fantome le temps de la passer)
        for (const [a, b, c, d] of I.boites) col.boite(a, b, c, d);
        for (const [cx, cz, w, d, r] of I.tournees) col.boiteO(cx, cz, w, d, r);
        const f = col.boite(x0, z0, x1, z1); f.haut = true; f.fantome = true;
      });
      // la porte vitrée : un vantail sur ses gonds (côté sud), qui s'ouvre vers l'intérieur (gestes.js : passer) ; il tourne
      // dans un repère posé le long du mur est
      {
        const cadre = new THREE.Group(), g = new THREE.Group(), l = ENTREE.l - 0.02, h = ENTREE.h - 0.02;
        const m = new THREE.Mesh(fusion([B(l, h, 0.05, GRIS_F, l / 2, h / 2, 0), B(l - 0.14, h - 0.16, 0.06, '#3d5f8e', l / 2, h / 2 + 0.02, 0), B(0.03, 0.9, 0.06, '#c9ccd1', l - 0.12, 1.05, 0.06), B(0.03, 0.9, 0.06, '#c9ccd1', l - 0.12, 1.05, -0.06)]), MAT);
        m.castShadow = true; m.receiveShadow = true; g.add(m);
        cadre.position.set(x1 + ep / 2, 0, e1 - 0.01); cadre.rotation.y = Math.PI / 2; cadre.add(g); scene.add(cadre);
        porteSolu = g;
      }
      // le toit (à part) : la dalle, le bac acier nervuré au-dessus de la devanture, la membrane et ses lanterneaux, la
      // clim, les ventilations
      const ZB = z1 - 8.15;
      toitS.push(B(x1 - x0, 0.12, z1 - ZB, '#c5c9cd', (x0 + x1) / 2, H - 0.04, (ZB + z1) / 2), B(x1 - x0, 0.1, ZB - z0, '#4a4f58', (x0 + x1) / 2, H - 0.05, (z0 + ZB) / 2));
      for (let x = x0 + 0.25; x < x1; x += 0.33) toitS.push(B(0.05, 0.05, z1 - ZB, '#b4b8bd', x, H + 0.04, (ZB + z1) / 2));
      for (const x of [204.0, 210.9, 217.8]) for (const z of [-67.0, -74.5]) toitS.push(B(1.3, 0.3, 1.3, '#e8eaec', x, H + 0.1, z), S(0.62, '#eef3f6', x, H + 0.25, z, 1, 0.42, 1, 1));
      toitS.push(B(1.5, 0.85, 0.95, ALU, 210.9, H + 0.42, -70.6), C(0.32, 0.32, 0.04, 12, '#55585e', 210.9, H + 0.86, -70.6), B(1.2, 0.7, 0.8, ALU, 203.2, H + 0.35, -77.6));
      for (const [x, z] of [[213.6, -65.2], [208.4, -64.6], [212.2, -72.0]]) toitS.push(C(0.08, 0.08, 0.6, 6, '#9aa0a6', x, H + 0.3, z), C(0.13, 0.13, 0.08, 6, '#9aa0a6', x, H + 0.62, z));
    }
    const toitSolu = new THREE.Mesh(indexer(fusion(toitS), true), MAT);
    toitSolu.castShadow = true; toitSolu.receiveShadow = true; toitSolu.renderOrder = ORDRE.bati; toitSolu.name = 'toit Solumatic';
    toitSolu.matrixAutoUpdate = false; toitSolu.add(bache); scene.add(toitSolu);
    // l'intérieur, ses affiches et ses écrans (dessinés seulement dedans ou porte ouverte) ; dedans, le soleil coupé, des
    // lampes pièce par pièce (definirInterieur : une pièce n'est éclairée que par les siennes, les couloirs par les leurs)
    const interieurSolu = new THREE.Mesh(indexer(fusion(I.geos), true), MAT);
    interieurSolu.castShadow = false; interieurSolu.receiveShadow = true; interieurSolu.name = 'intérieur Solumatic'; interieurSolu.visible = false;
    const vitresSolu = new THREE.Mesh(indexer(fusion(I.vitres), true), new THREE.MeshBasicMaterial({ color: '#d9e6ef' }));
    vitresSolu.name = 'vitres Solumatic'; vitresSolu.matrixAutoUpdate = false;
    interieurSolu.matrixAutoUpdate = false; interieurSolu.add(...panneauxSolumatic(I.affiches, I.ecrans), vitresSolu); scene.add(interieurSolu);
    interieurs.push({ min: [SOLU.x0 - 0.12, -1, SOLU.z0 - 0.12], max: [SOLU.x1 + 0.12, SOLU.HP + 0.06, SOLU.z1 + 0.12], pieces: I.pieces, lampes: I.lampes, couleur: [1.0, 0.97, 0.92], force: 1.4, portee: 0.2, fond: [0.62, 0.62, 0.6], relief: true });
    // le parvis : la grille coulissante (ouverte, rangée le long de la haie), ses poteaux, la boîte aux lettres, l'interphone
    {
      for (const x of [205.25, 211.75]) L.push(B(0.22, 1.9, 0.22, GRIS_F, x, 0.95, -44.6), B(0.26, 0.05, 0.26, GRIS_F, x, 1.92, -44.6));
      L.push(B(6.2, 0.05, 0.05, GRIS_F, 202.15, 1.65, -45.25), B(6.2, 0.06, 0.06, GRIS_F, 202.15, 0.12, -45.25), B(6.6, 0.02, 0.1, '#7d8288', 208.5, 0.07, -44.6));
      for (let x = 199.15; x <= 205.15; x += 0.12) L.push(B(0.025, 1.55, 0.025, GRIS_F, x, 0.88, -45.25));
      for (const x of [199.2, 202.15, 205.1]) L.push(C(0.07, 0.07, 0.04, 8, '#2b2b30', x, 0.07, -45.25, 'x'));
      L.push(B(0.36, 0.42, 0.22, '#e9ebe8', 212.05, 1.15, -44.35), B(0.3, 0.03, 0.02, '#2b2b30', 212.05, 1.28, -44.23), B(0.12, 0.2, 0.04, '#2b2b30', 211.6, 1.35, -44.45));
      boites.push([199.0, -45.4, 205.3, -45.1]);
      atlas.poser(512, 121, (c, W, H) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); logoSolumatic(c, 16, 6, W - 32); }, 0.62, 0.146, 211.75, 1.5, -44.475, 0);
    }
    // la haie (au sud, la grille ; à l'est, la pelouse ; au nord-est, un arrondi) ; les arbres ; les tables de pique-nique
    haie(188.4, -44.6, 205.1, -44.6); haie(211.9, -44.6, 237.4, -44.6); haie(237.4, -44.6, 237.4, -80.5);
    { let px = 237.4, pz = -80.5; for (let k = 1; k <= 4; k++) { const a = k / 4 * Math.PI / 2, x = 230.3 + Math.cos(a) * 7.1, z = -80.5 - Math.sin(a) * 7.1; haie(px, pz, x, z); px = x; pz = z; } }
    haie(230.3, -87.6, 188.4, -87.6); haie(188.4, -87.6, 188.4, -44.6);
    sapin(191.0, -49.5, 12); sapin(190.6, -61.5, 13.5); sapin(191.2, -73.5, 11.5); cypres(192.8, -84.5, 10); cypres(195.2, -85.0, 9);
    sapin(234.0, -84.0, 12.5); feuillu(232.2, -58.5, 8.5); feuillu(229.0, -76.5, 7.5, '#5d7a36', '#6f8a3a'); feuillu(214.5, -83.5, 7, '#8a8f3a', '#a6823a');
    pique(227.4, -61.5, Math.PI / 2); pique(231.0, -66.0, Math.PI / 2 + 0.2); pique(227.4, -71.0, Math.PI / 2); pique(205.4, -82.4); pique(209.8, -82.4);
    // deux bornes lumineuses le long de l'allée de la pelouse
    for (const [x, z] of [[224.8, -55.5], [224.8, -61.5], [223.9, -69]]) { L.push(C(0.08, 0.08, 0.8, 8, GRIS_F, x, 0.4, z), C(0.085, 0.085, 0.1, 8, '#ffe1a0', x, 0.72, z)); boites.push([x - 0.15, z - 0.15, x + 0.15, z + 0.15]); }

    /* -- la tonnellerie du Coteau, à l'est de la rue (x de 212 à 249,5, z de -42 à 2,4). L'atelier, une vieille bâtisse
       de moellons (chaînes de tuffeau, toit d'ardoise, sa cheminée), la grande porte coulissante ouverte sur la cour (la
       pénombre, une barrique en cours, la lueur du feu) ; contre lui, l'appentis de la chauffe : trois barriques « en
       rose » sur leur brasero (le feu, la fumée : tonnellerie.js) ; devant la porte, le poste du cercleur ; les cercles
       et les fonds contre le mur ; deux barriques en essai d'eau ; le parc à merrains (douelles empilées en croisillons,
       qui sèchent dehors deux ou trois ans) le long de la route, les grumes de chêne, le stock de barriques finies (en
       pyramides, filmées sur palettes), le camion de livraison, le chariot élévateur ; un muret le long de la route, une
       palissade le long de la rue. */
    {
      const MO = '#cdbf9f', TU = '#ebe0c6', SOMBRE = '#1e1a16', BOIS_V = '#5b3a2a', CHENE = '#c9a87a', GRIS_B = '#a59a86', GRIS_B2 = '#978c78';
      const x0 = 233, x1 = 249, z0 = -40, z1 = -16, H = 5.0, P0 = -31, P1 = -25.5, PH = 4.2, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2, XR = 235.4;
      // l'atelier : le volume, la façade ouest percée de la grande porte (une alcôve dans la pénombre derrière)
      L.push(B(x1 - XR, H, z1 - z0, MO, (XR + x1) / 2, H / 2, zm));
      L.push(B(XR - x0, H, P0 - z0, MO, (x0 + XR) / 2, H / 2, (z0 + P0) / 2), B(XR - x0, H, z1 - P1, MO, (x0 + XR) / 2, H / 2, (P1 + z1) / 2), B(XR - x0, H - PH, P1 - P0, MO, (x0 + XR) / 2, (H + PH) / 2, (P0 + P1) / 2));
      L.push(B(XR - x0, 0.04, P1 - P0, '#6b665e', (x0 + XR) / 2, 0.02, (P0 + P1) / 2), B(0.04, PH, P1 - P0, SOMBRE, XR - 0.02, PH / 2, (P0 + P1) / 2));
      L.push(B(0.6, 0.5, 2.2, '#4a3a2a', XR - 0.05, 1.1, -28.2)); // la lueur du feu, au fond
      barrique(234.6, 0.475, -29.6, 'y', false); barrique(234.4, 0.475, -26.6, 'y', false);
      L.push(B(0.8, 0.85, 1.8, '#6b4a30', 234.8, 0.43, -28.1), C(0.02, 0.02, 0.9, 4, FER, 234.2, 3.7, -28.2), C(0.12, 0.2, 0.18, 8, FER, 234.2, 3.2, -28.2), C(0.1, 0.1, 0.03, 8, '#ffe1a0', 234.2, 3.1, -28.2));
      // chaînes d'angle et encadrement de la porte en tuffeau ; le soubassement ; deux fenêtres par façade ; le toit, la cheminée
      for (const [x, z] of [[x0, z0], [x0, z1], [x1, z0], [x1, z1]]) for (let k = 0; k < 9; k++) { const lg = k % 2 ? 0.34 : 0.56; L.push(B(lg, 0.5, lg, TU, x + (x < xm ? lg / 2 - 0.02 : -lg / 2 + 0.02), 0.27 + k * 0.53, z + (z < zm ? lg / 2 - 0.02 : -lg / 2 + 0.02))); }
      for (const z of [P0 - 0.2, P1 + 0.2]) L.push(B(0.12, PH + 0.1, 0.4, TU, x0 - 0.04, (PH + 0.1) / 2, z));
      L.push(B(0.12, 0.45, P1 - P0 + 0.8, TU, x0 - 0.04, PH + 0.25, (P0 + P1) / 2));
      L.push(B(x1 - x0 + 0.1, 0.4, z1 - z0 + 0.1, '#a99a82', xm, 0.2, zm));
      for (const z of [-37.0, -20.0]) L.push(B(0.06, 1.3, 1.1, '#2f3c4f', x0 - 0.03, 2.4, z), B(0.1, 0.1, 1.3, TU, x0 - 0.05, 1.72, z), B(0.1, 0.12, 1.3, TU, x0 - 0.05, 3.1, z), petitsBois(x0 - 0.063, 2.4, z, -1, 'x', 1.1, 1.3, '#5b3a2a'));
      for (const x of [237.5, 245.0]) L.push(B(1.1, 1.3, 0.06, '#2f3c4f', x, 2.4, z1 + 0.03), B(1.3, 0.1, 0.1, TU, x, 1.72, z1 + 0.05), B(1.3, 0.12, 0.1, TU, x, 3.1, z1 + 0.05), petitsBois(x, 2.4, z1 + 0.063, 1, 'z', 1.1, 1.3, '#5b3a2a'));
      L.push(...toit(x1 - x0, z1 - z0, 3.4, ARD, xm, H, zm, true, { mur: MO }));
      L.push(B(0.8, 4.6, 0.8, '#8c5a44', 245.0, H + 2.3, -36.0), B(0.9, 0.12, 0.9, '#6e4a3a', 245.0, H + 4.62, -36.0));
      // la grande porte de planches, ouverte : glissée au nord sur son rail
      L.push(B(0.12, PH, 5.7, BOIS_V, x0 - 0.12, PH / 2, P0 - 2.9), B(0.14, 0.12, 12.2, FER, x0 - 0.1, PH + 0.12, -31.3));
      for (const y of [0.5, 2.1, 3.7]) L.push(B(0.14, 0.18, 5.5, '#4a3324', x0 - 0.16, y, P0 - 2.9));
      enseigne('TONNELLERIE DU COTEAU', { x: x0 - 0.06, z: (P0 + P1) / 2, rot: -Math.PI / 2 }, PH + 0.75, 6.4, 0.6, '#efe4cb', '#5a3f2b');
      enseigne('TONNELLERIE DU COTEAU', { x: xm, z: z1 + 0.06, rot: 0 }, 3.75, 7.2, 0.62, '#efe4cb', '#5a3f2b');
      bat(x0, z0, x1, z1);
      boites.push([x0 - 0.2, z0, x1, z1]);
      // l'appentis de la chauffe, contre la façade, au nord de la porte : poteaux, pannes, toit de tôle ondulée, sol noirci
      {
        const a0 = 226.6, za = -40.2, zb = -32.0;
        for (const z of [za + 0.2, (za + zb) / 2, zb - 0.2]) { L.push(B(0.18, 3.1, 0.18, '#6b4a30', a0, 1.55, z)); boites.push([a0 - 0.12, z - 0.12, a0 + 0.12, z + 0.12]); }
        L.push(B(0.16, 0.2, zb - za, '#6b4a30', a0, 3.15, (za + zb) / 2));
        const lt = x0 - a0 + 0.6;
        const tole = B(lt, 0.05, zb - za + 0.4, '#8d9196', (a0 + x0) / 2 - 0.3, 3.62, (za + zb) / 2); L.push(tole);
        for (let z = za; z <= zb; z += 0.25) L.push(B(lt, 0.03, 0.05, '#7d8288', (a0 + x0) / 2 - 0.3, 3.66, z));
        L.push(B(x0 - a0, 0.03, zb - za, '#6b665e', (a0 + x0) / 2, 0.035, (za + zb) / 2));
        // les trois barriques en chauffe : montées « en rose » (les douelles serrées en haut par deux cercles, écartées en
        // bas), le haut noirci par le feu, le dedans sombre ; le feu (tonnellerie.js) au milieu
        const geoRose = () => {
          const at = new Atelier(), n = 14, H2 = 0.95, r = y => 0.42 - 0.13 * (y / H2) ** 0.8, P = (a, y, k = 1) => [Math.cos(a) * r(y) * k, y, Math.sin(a) * r(y) * k];
          const Y = [0, 0.3, 0.6, 0.76, 0.8, 0.86, 0.9, H2];
          for (let b = 0; b < Y.length - 1; b++) for (let i = 0; i < n; i++) {
            const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, am = (a0 + a1) / 2, cer = b === 3 || b === 5;
            const col = cer ? FER : Y[b] >= 0.6 ? (i % 2 ? '#3a2414' : '#4a2e1a') : i % 2 ? '#8a5530' : '#7a4a2a';
            at.quad(P(a0, Y[b]), P(a1, Y[b]), P(a1, Y[b + 1]), P(a0, Y[b + 1]), col, cer ? 0 : T.bois, [Math.cos(am), 0, Math.sin(am)]);
            at.quad(P(a0, Y[b], 0.93), P(a1, Y[b], 0.93), P(a1, Y[b + 1], 0.93), P(a0, Y[b + 1], 0.93), '#24160c', 0, [-Math.cos(am), 0, -Math.sin(am)]);
          }
          for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; at.quad(P(a0, H2), P(a1, H2), P(a1, H2, 0.93), P(a0, H2, 0.93), '#2a1a10', 0, [0, 1, 0]); }
          return fusion(at.geos());
        };
        for (const z of [-38.6, -36.1, -33.6]) {
          L.push(deplacer(geoRose(), 229.6, 0.02, z), C(0.2, 0.24, 0.2, 8, '#2b2b30', 229.6, 0.1, z), C(0.17, 0.17, 0.02, 8, '#c0501e', 229.6, 0.21, z));
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; L.push(B(0.05, 0.12, 0.05, '#2a2420', 229.6 + Math.cos(a) * 0.44, 0.06, z + Math.sin(a) * 0.44)); }
          boites.push([229.05, z - 0.55, 230.15, z + 0.55]);
          contact.tache(229.6, z, 0.75, 0.75, 0.55);
        }
        // le cabestan (le treuil qui serre le pied des douelles), le seau d'eau et le goupillon, le bac de copeaux
        L.push(B(0.12, 1.3, 0.12, FER, 231.2, 0.65, -37.4), C(0.08, 0.08, 0.35, 8, FER, 231.2, 1.15, -37.4, 'x'), B(0.04, 0.3, 0.04, '#6b4a30', 231.4, 1.0, -37.4));
        L.push(C(0.16, 0.13, 0.3, 8, '#6f7579', 231.0, 0.15, -34.7), C(0.015, 0.015, 1.1, 4, '#9a7b55', 231.1, 0.55, -34.5));
        L.push(B(0.9, 0.5, 0.7, '#6b4a30', 227.3, 0.25, -39.55), B(0.82, 0.12, 0.62, '#c9a87a', 227.3, 0.52, -39.55));
        boites.push([231.0, -37.6, 231.5, -37.2], [226.85, -39.9, 227.75, -39.2]);
        plan.push({ t: 'b', x0: a0, z0: za, x1: x0, z1: zb });
      }
      // le poste du cercleur, devant la porte : une barrique sur son billot, des cercles posés contre
      L.push(C(0.36, 0.38, 0.22, 10, '#6b4a30', 228.4, 0.11, -27.6)); barrique(228.4, 0.7, -27.6, 'y', false);
      for (let i = 0; i < 3; i++) L.push(C(0.33, 0.33, 0.045, 14, FER, 227.55 + i * 0.05, 0.36, -26.3, 'x', 0.12, 0));
      boites.push([227.9, -28.1, 228.9, -27.1]);
      contact.tache(228.4, -27.6, 0.6, 0.6, 0.35);
      // contre la façade, au sud de la porte : les cercles neufs appuyés, une pile de fonds, des bottes de douelles
      for (let i = 0; i < 8; i++) L.push(C(0.33 + (i % 3) * 0.01, 0.33 + (i % 3) * 0.01, 0.045, 14, FER, x0 - 0.28 + i * 0.012, 0.34, -23.6 + i * 0.09, 'x', 0.08, 0));
      L.push(B(1.1, 0.14, 1.1, '#9a7b55', 231.8, 0.07, -20.6)); for (let k = 0; k < 9; k++) L.push(C(0.29, 0.29, 0.035, 12, k % 2 ? CHENE : '#bf9a68', 231.8, 0.16 + k * 0.038, -20.6));
      for (const z of [-18.6, -18.0]) { for (let i = 0; i < 6; i++) L.push(B(0.09, 1.0, 0.03, CHENE, x0 - 0.3 + (i % 3) * 0.1, 0.52, z + Math.floor(i / 3) * 0.04, 0.05)); L.push(B(0.34, 0.04, 0.1, FER, x0 - 0.2, 0.7, z)); }
      boites.push([231.2, -24.1, x0, -17.6]);
      // l'essai d'eau : deux barriques pleines, debout, le tuyau, la flaque
      barrique(225.8, 0.475, -22.6, 'y', false); barrique(225.0, 0.475, -22.4, 'y', false);
      L.push(C(0.025, 0.025, 3.2, 6, '#2e86de', 226.4, 0.03, -24.2, 'z', 0.3), B(1.8, 0.012, 1.2, '#8f877a', 225.4, 0.07, -21.7));
      boites.push([224.5, -23.1, 226.3, -21.9]);
      // le parc à merrains, le long de la route : des piles carrées de douelles croisées, sur leurs madriers
      for (const [z, vieux] of [[-9.6, true], [-5.8, true], [-2.0, false]]) for (const x of [236.4, 239.2, 242.0, 244.8, 247.6]) {
        for (const dz of [-0.4, 0.4]) L.push(B(1.3, 0.1, 0.12, '#5e4a36', x, 0.05, z + dz));
        for (let k = 0; k < 14; k++) for (let i = 0; i < 4; i++) {
          const c = vieux ? ((k + i) % 3 ? GRIS_B : GRIS_B2) : ((k + i) % 3 ? CHENE : '#bf9a68'), y = 0.13 + k * 0.095, o = -0.45 + i * 0.3;
          L.push(k % 2 ? B(1.15, 0.05, 0.1, c, x, y, z + o) : B(0.1, 0.05, 1.15, c, x + o, y, z));
        }
        boites.push([x - 0.62, z - 0.62, x + 0.62, z + 0.62]);
        contact.tache(x, z, 0.7, 0.7, 0.3);
      }
      // les grumes de chêne, couchées sur leurs cales, leurs bouts clairs, un numéro peint
      for (const [y, z, r] of [[0.42, -21.0, 0.4], [0.4, -20.1, 0.38], [0.44, -19.15, 0.42], [1.08, -20.55, 0.36], [1.1, -19.6, 0.37]]) {
        L.push(C(r, r * 1.05, 6.0, 10, '#5e4a36', 220.0, y, z, 'x'));
        for (const s of [-1, 1]) L.push(C(r - 0.02, r - 0.02, 0.02, 10, '#d6b88a', 220.0 + s * 3.0, y, z, 'x'));
      }
      for (const x of [218.0, 222.0]) L.push(B(0.2, 0.12, 2.6, '#6b4a30', x, 0.06, -20.1));
      L.push(B(0.02, 0.18, 0.25, '#c0392b', 223.02, 0.44, -21.0));
      boites.push([216.9, -21.5, 223.1, -18.7]);
      // le stock de barriques finies : deux pyramides couchées, des barriques filmées sur palettes, des debout
      for (const [px, pz] of [[215.6, -8.0], [215.6, -3.2]]) {
        const rangs = [[-0.66, 0, 0.66], [-0.33, 0.33], [0]];
        rangs.forEach((r, k) => { for (const dz of r) barrique(px, 0.36 + k * 0.62, pz + dz * 1.05, 'z', k === 2); });
        L.push(B(0.12, 0.1, 2.8, '#5a3f2b', px - 0.35, 0.05, pz), B(0.12, 0.1, 2.8, '#5a3f2b', px + 0.35, 0.05, pz));
        boites.push([px - 0.55, pz - 1.35, px + 0.55, pz + 1.35]); contact.tache(px, pz, 0.7, 1.5, 0.35);
      }
      for (const [x, z] of [[219.6, -8.2], [219.6, -5.6], [222.2, -8.2]]) {
        L.push(B(1.4, 0.14, 1.4, '#9a7b55', x, 0.07, z), B(1.46, 1.02, 1.46, '#e3e9ec', x, 0.65, z), B(1.4, 0.03, 1.4, '#d0d8dc', x, 1.17, z));
        for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) L.push(C(0.28, 0.28, 0.02, 10, '#b98a5a', x + dx, 1.19, z + dz));
        boites.push([x - 0.75, z - 0.75, x + 0.75, z + 0.75]); contact.tache(x, z, 0.85, 0.85, 0.3);
      }
      for (const [x, z] of [[222.4, -5.3], [223.1, -5.9], [222.3, -6.1]]) barrique(x, 0.475, z, 'y', false);
      boites.push([221.7, -6.6, 223.7, -4.7]);
      // le camion de livraison, garé devant l'entrée de la cour, chargé de barriques debout (sanglées), le nom de la
      // tonnellerie sur ses portières ; le chariot élévateur, garé près du stock (le même que celui de l'imprimerie, figé)
      {
        const cx = 217.6, cz = -34.6, K = camion('#2f4a3a'), [zp0] = K.long;
        poser(K.geos, cx, cz, 0, L);
        for (const dx of [-0.55, 0.55]) for (let k = 0; k < 4; k++) barrique(cx + dx, K.plateau + 0.475, cz + zp0 + 0.55 + k * 0.82, 'y', false);
        for (let k = 0; k < 4; k++) { const z = cz + zp0 + 0.55 + k * 0.82; L.push(B(2.3, 0.03, 0.06, '#e8962a', cx, K.plateau + 0.96, z)); for (const s of [1, -1]) L.push(B(0.02, 0.5, 0.06, '#e8962a', cx + s * 1.16, K.plateau + 0.72, z)); }
        for (const s of [1, -1]) atlas.poser(512, 200, (c, W, H) => {
          c.clearRect(0, 0, W, H); c.fillStyle = '#efe3c8'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.font = 'bold 70px Georgia, serif'; c.fillText('Tonnellerie', W / 2, H * 0.3); c.font = 'italic 56px Georgia, serif'; c.fillText('du Coteau', W / 2, H * 0.74);
        }, 0.78, 0.3, cx + s * 1.152, 1.52, cz + 2.66, s * Math.PI / 2);
        boites.push([cx - 1.45, cz - 3.4, cx + 1.45, cz + 3.5]); contact.tache(cx, cz, 1.5, 3.6, 0.4);
      }
      {
        const cx = 224.6, cz = -13.6;
        poser(figer(chariot().groupe), cx, cz, Math.PI, L);
        boites.push([cx - 0.65, cz - 2.35, cx + 0.65, cz + 1.3]); contact.tache(cx, cz - 0.4, 0.7, 1.4, 0.3);
      }
      // un tas de copeaux, une brouette
      L.push(C(0.2, 1.1, 0.55, 10, '#c9a87a', 226.0, 0.27, -41.0), C(0.05, 0.9, 0.3, 10, '#b98f5a', 226.4, 0.5, -41.2));
      L.push(B(0.6, 0.3, 0.9, '#2f6f8f', 226.6, 0.5, -24.0, 0.3), C(0.18, 0.18, 0.08, 8, '#2b2b30', 226.75, 0.18, -23.55, 'x'), B(0.04, 0.04, 0.9, '#6b4a30', 226.3, 0.55, -24.6, 0.3), B(0.04, 0.04, 0.9, '#6b4a30', 226.75, 0.55, -24.7, 0.3));
      boites.push([225.0, -42.0, 227.0, -40.0], [226.2, -24.5, 227.0, -23.4]);
      // le muret le long de la route, la palissade le long de la rue (l'entrée de la cour, au nord : z de -42 à -29)
      L.push(B(36.5, 0.8, 0.4, MO, 231.25, 0.4, 2.6), B(36.6, 0.08, 0.5, TU, 231.25, 0.84, 2.6));
      boites.push([213.0, 2.4, 249.5, 2.8]);
      for (let z = 2.2; z > -29; z -= 2.4) L.push(B(0.12, 1.2, 0.12, '#6b4a30', 212.6, 0.6, z));
      for (const y of [0.45, 0.95]) L.push(B(0.06, 0.12, 31.2, '#8a6a48', 212.6, y, -13.4));
      boites.push([212.45, -29, 212.75, 2.4]);
      panneau((c, W, H) => {
        c.fillStyle = '#efe4cb'; c.fillRect(0, 0, W, H); c.strokeStyle = '#5a3f2b'; c.lineWidth = 8; c.strokeRect(6, 6, W - 12, H - 12);
        c.fillStyle = '#5a3f2b'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'bold 30px Georgia, serif'; c.fillText('Tonnellerie', W / 2, H * 0.3); c.fillText('du Coteau', W / 2, H * 0.55);
        c.font = 'italic 19px Georgia, serif'; c.fillText('barriques de chêne', W / 2, H * 0.8);
      }, 1.6, 1.1, 214.2, 1.7, 3.1, 0);
    }

    /* -- le panneau de la zone, à son entrée (côté bourg) ; des lampadaires le long de la route */
    panneau((c, W, H) => {
      c.fillStyle = '#2c3e66'; c.fillRect(0, 0, W, H); c.fillStyle = '#f6f1e8'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 30px Arial, sans-serif'; c.fillText('ZA des Coteaux', W / 2, H * 0.17);
      c.fillRect(W * 0.08, H * 0.29, W * 0.84, 2);
      c.font = 'bold 21px Arial, sans-serif';
      ['Imprimerie Saint-Vincent', 'Solumatic', 'Tonnellerie du Coteau'].forEach((t, i) => c.fillText(t, W / 2, H * (0.44 + i * 0.19)));
    }, 1.8, 1.4, 187.5, 2.0, 16.4, -Math.PI / 2);
    // (au sud, pas devant l'accès de l'imprimerie, x de 228,7 à 236,7 ; au nord, pas devant la rue)
    for (const [x, z] of [[195, 4.6], [214.5, 4.6], [231, 4.6], [196, 16.4], [214, 16.4], [243, 16.4]]) {
      L.push(C(0.06, 0.09, 5.4, 6, '#3b3f46', x, 2.7, z), B(0.1, 0.07, 1.0, '#3b3f46', x, 5.4, z + (z < 10 ? 0.45 : -0.45)), B(0.36, 0.1, 0.5, '#ffe1a0', x, 5.33, z + (z < 10 ? 0.9 : -0.9)));
      boites.push([x - 0.15, z - 0.15, x + 0.15, z + 0.15]);
    }
    bati.push(...L);
    plusTard.push(() => { for (const [a, b, c, d] of boites) col.boite(a, b, c, d).haut = d - b > 4 || c - a > 4; });
    return { porteSolu, toitSolu, interieurSolu, vitresSolu, gens: I.gens, murs: I.murs, portes: I.portes, babyfoot: I.babyfoot };
  }
  const za = zoneActivites();
  definirInterieur(interieurs); // le chai et l'entrepôt : le soleil coupé, les lampes
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
        // dans l'entrepôt de l'imprimeur, sa cour et son accès (mission 3) : tirée au sort comme avant (la suite du tirage
        // ne bouge pas), mais réduite à rien
        const s = dansEntrepot(x, z, 0.6) || (x > -80 && x < -58 && z > -95 && z < -72) || dansEcole(x, z, 0.4) ? 0 : 1; // (ni dans le hangar du domaine, ni devant ; ni dans l'école, ni sur son parvis)
        m.compose(pv.set(x, 0, z), q, e.set(k * s, k * (0.8 + rnd() * 0.5) * s, k * s));
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
  carte.width = carte.height = (CARTE0 + CARTE1) * ECH;
  {
    const c = carte.getContext('2d');
    const X = x => (x + CARTE0) * ECH, Z = z => (z + CARTE0) * ECH;
    // le fond : l'herbe, les surfaces, les rangs, les arbres, les bâtiments
    const fond = () => {
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
    };
    fond();
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
    // la zone d'activités, hors de la zone de jeu, reste claire
    c.save(); c.beginPath(); c.rect(X(ZA.x0), Z(ZA.z0), (ZA.x1 - ZA.x0) * ECH, (ZA.z1 - ZA.z0) * ECH); c.clip(); fond(); c.restore();
  }

  const lieux = {
    depart: { x: -99, z: -55, h: 0 },
    // le tracteur rangé dans le hangar, derrière le chai (sa travée, le nez vers la sortie) ; le van dans la cour : on
    // choisit l'un ou l'autre pour la tournée
    tracteur: { x: -73.75, z: -87.5, h: 0 },
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
      [[-90, 10], [-90, -1], [-90, -38], [-90, -44], [-87.5, -51.9], [-82.8, -58.4]], // l'allée du domaine, jusqu'à la sortie du chai
      // l'entrée de l'allée en venant du bourg (ou la sortie vers lui) : un virage arrondi, pas un angle droit (un tracteur
      // et sa remorque y passent sans couper le coin)
      [[-80, 10], [-86.5, 6.2], [-90, -1]],
      [[-90, -38], [-84, -45], [-82.8, -54], [-81.4, -59.4]],              // la cour, jusqu'au bureau du chai
      [[-90, -38], [-87, -45], [-86.5, -50.6], [-82.5, -52]],              // la cour, jusqu'à la grande porte du chai
      [[-90, 10], [-80, 10], [-55, 10], [95, 10], [110.5, 9.4]],           // la départementale (l'épicerie, La Treille)
      [[110.5, 9.4], [176, 10], [205, 10], [212, 10], [176 + DX_EN, 10]], // vers l'est : le laboratoire, la zone d'activités
      // la rue de la zone d'activités, jusqu'au parvis de Solumatic : on y entre en biais, d'un côté ou de l'autre
      [[205, 10], [208.5, 4.5], [208.5, -42], [208.5, -48]], [[212, 10], [208.5, 4.5]],
      // l'accès de l'entrepôt (lieux.entrepot.arret) : en biais depuis la départementale, sans angle droit (la conduite
      // assistée ne passe au tronçon suivant qu'une fois le bout du précédent dépassé : dans un angle droit coupé court,
      // elle croirait le point visé derrière elle et ferait demi-tour), puis tout droit vers le sud, au milieu de la cour :
      // un tracteur et sa remorque y entrent alignés, la remorque se pose le long de la grande porte (lieux.entrepot.depot)
      [[176 + DX_EN, 10], [179 + DX_EN, 14.8], [179 + DX_EN, 21], [179 + DX_EN, 38.9]],
      [[95, 10], [95, -30]],                                               // la rue de la place, en montant
      // la boucle du bourg, à sens unique : la place, la Cave du Pressoir, le Bar Le Cep, et l'on redescend
      { sens: true, points: [[95, -30], [86, -40], [78, -46], [81.5, -56], [88, -53.5], [100.5, -53], [101, -40], [96, -27], [95, 8], [95, 10]] },
      [[-55, 10], [-55, 124], [-53.2, 134.5]],                             // le chemin des Grands Champs, jusqu'à l'auberge
      [[-84, -45], [-86.5, -56], [-86, -66]],                              // la cour, jusqu'à l'aire de remplissage
      [[-86.5, -56], [-86.5, -50.6]],                                      // de l'aire ou du hangar, tout droit vers la porte du chai
      // le hangar (derrière le bout du chai) : entre l'aire et le bureau du chai, puis la travée du tracteur, celle de l'enjambeur
      [[-86.5, -56], [-82.0, -60.0], [-80.4, -64.0], [-79.6, -68.5], [-77.0, -72.8], [-74.2, -75.6], [-73.75, -79.0], [-73.75, -84.5]],
      [[-74.2, -75.6], [-69.4, -76.6], [-68.25, -79.0], [-68.25, -84.5]],
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
  lieux.maisonsRoute = MAISONS_ROUTE; // les maisons de la route du château (essais)
  lieux.chateau = villageChateau; // le village du château qui vit (village.js ; main.js : ses voitures garées)
  lieux.ecole = lieuxEcole; // l'école (ecole.js : les enfants, les adultes, le portail, la porte, les jeux, l'horloge, la cloche)
  // l'enjambeur (enjambeur.js), rangé dans le hangar, la travée du milieu, le nez vers la sortie ; le transpalette (le
  // gerbeur électrique de Marc : transpalette.js) dans la troisième travée, contre le poteau, à côté de la remorque rangée
  lieux.enjambeur = { x: -68.25, z: -87.2, h: 0 };
  lieux.transpalette = { x: -64.45, z: -84.4, h: 0 };
  lieux.portes = portes; // la porte de chaque client (clients.js) : { x, z, rot } devant le seuil, la façade tournée de rot
  // deux voitures de visiteurs sur le parking du domaine ; au hameau des Grands Champs, une voiture sur le gravier devant
  // la maison de l'ouest (x de -72 à -64, z de 123 à 133), à côté de sa porte (elle était garée dedans) ; la voiture du
  // personnel de l'imprimerie, garée dans la cour de l'entrepôt, entre ses deux lignes blanches
  lieux.garees = [[-112.4, -49.4, -Math.PI / 2, '#e9e6de'], [-112.4, -54.6, -Math.PI / 2, '#5c6f8a'], [118.5, -59.5, 0, '#5c6f8a'], [123, -59.5, 0, '#8a3a32'], [100.5, -77.5, Math.PI / 2, '#d8cfa6'], [-61.4, 131.6, Math.PI - 0.06, '#6c8f4e'], [175.1 + DX_EN, 44.0, 0, '#2f4a6b'],
    // le parking de Solumatic : trois places prises, le nez vers le bâtiment
    [216.75, -47.3, Math.PI, '#c9cdd2'], [219.25, -47.3, Math.PI, '#1f2a3a'], [224.25, -47.3, Math.PI, '#f2efe6']];
  /* Mission 3, l'habillage. Le laboratoire d'œnologie (rangée sud du bourg, x = 128) : l'œnologue attend sur le trottoir,
     à côté de sa porte, tourné vers la route ; le véhicule s'arrête sur la départementale, devant. L'entrepôt de
     l'imprimeur-étiqueteur : arret, la balise et le bout de l'itinéraire, dans la cour, cap au sud ; la conduite assistée
     s'arrête 4,2 m avant (pilote.js) : le van se gare vers z = 27,4, le long de la grande porte, son flanc droit (porte
     coulissante) tourné vers elle ; figurant, l'étiqueteur qui attend au nord de la porte, devant la porte de service,
     tourné vers la cour (les piles déchargées se posent devant lui, au nord de l'arrière du van) ; porte, devant le seuil
     de la grande porte (rot : la façade tournée vers l'est) ; ligne, une caméra posée dans le hangar, près de la porte,
     qui regarde la ligne d'habillage tourner (monde.ligne.maj) ; bouteille, la première bouteille habillée sur la table de
     sortie ; zone, le hangar. */
  {
    const p = portes.labo;
    lieux.figurants.labo = { x: +(p.x + 0.77).toFixed(2), z: 17.35, h: Math.PI };
    lieux.arrets.labo = { x: lieux.figurants.labo.x, z: 11.2 };
  }
  /* La remorque de palox (mission 3, remorque.js) : remorque, sa place au domaine (le milieu de son tandem, son cap) :
     sur l'herbe, le long de l'allée, à l'ouest, hors de la cour, le timon vers la départementale ; on vient se mettre
     devant en tracteur par l'allée (approche : la balise ; la conduite assistée s'arrête 4,2 m avant, le tracteur tourné vers
     la départementale, à 6 m devant l'anneau et 4,5 m de côté : il recule tout seul jusqu'à l'anneau). À l'entrepôt :
     arret, la balise et le bout de l'itinéraire, au milieu de la cour ; la conduite assistée s'arrête 4,2 m avant, le
     tracteur vers z = 34,7 et sa remorque vers z = 27,5, le long de la grande porte ; depot, la place où on la dételle
     (le milieu de son tandem) ; chariot, la place du chariot élévateur, au nord de la porte, tourné vers le sud ; stock,
     les six places des palox dans le hangar, près de la ligne d'habillage, en trois rangs de deux, l'un sur l'autre (le
     milieu du palox au sol ; y : posé sur le sol ou sur un autre ; h : le cap du chariot qui le pose, fourches vers la ligne). */
  lieux.remorque = { x: -94.5, z: -22, h: 0, approche: { x: -90, z: -4.8 } };
  // Le reste du temps, elle est rangée vide sous le hangar, dans la troisième travée, le timon vers la cour (Teddy,
  // 26/11/2026 : « pas tout le temps dehors, rangée près du carport ») : elle ne sort devant le domaine que pour la
  // mission 3 (Marc la prépare). Sa boîte : x de -63,4 à -61,0, z de -88,7 à -82,4 (le broyeur commence à -89).
  lieux.remorque.range = { x: -62.2, z: -85.4, h: 0 };
  // Au retour de l'imprimerie (mission 3), la remorque des bouteilles habillées se pose au chai : dans la cour, juste
  // derrière le portail, dans l'axe de l'allée, le timon vers le chai et la maison (chai : le milieu de son tandem ; arret :
  // la balise, sur l'allée ; le tracteur avance tout seul pour l'y poser, puis on la dételle)
  lieux.remorque.chai = { x: -90, z: -46, h: Math.PI, arret: { x: -90, z: -42 } };
  {
    const X = DX_EN;
    lieux.entrepot = {
      arret: { x: 179 + X, z: 38.9, h: 0 },
      depot: { x: 179 + X, z: 27.5, h: 0 },
      chariot: { x: 174.2 + X, z: 21.5, h: 0 },
      stock: [26.0, 27.6, 29.2].flatMap(z => [0, 0.78].map(y => ({ x: 165.4 + X, y, z, h: -Math.PI / 2 }))),
      figurant: { x: 172.9 + X, z: 23.4, h: Math.PI / 2 },
      porte: { x: 172.1 + X, z: (EN.p0 + EN.p1) / 2, rot: Math.PI / 2 },
      ligne: { camera: { x: 169.9 + X, y: 2.5, z: 31.0 }, centre: { x: EN.LX + X, y: 1.0, z: 26.6 } },
      bouteille: { x: EN.LX + X, y: 0.9, z: 29.65 },
      zone: { x0: EN.x0 + X, z0: EN.z0, x1: EN.x1 + X, z1: EN.z1 },
      // le lendemain de la livraison (mission 3), la remorque rechargée des palox habillés, tournée vers la sortie, au
      // fond de la cour (retour) ; arrivee : la balise en venant la chercher (on s'arrête à l'entrée de la cour) ; virage :
      // la manœuvre avant de reculer sur l'anneau (le tracteur va se mettre en travers à l'est de la cour)
      retour: { x: 179 + X, z: 40, h: Math.PI }, arrivee: { x: 179 + X, z: 21 }, virage: [182.7 + X, 24.5, Math.PI / 2],
    };
  }
  // les bureaux de Solumatic (solumatic.js) : devant la porte d'entrée (façade est), dehors et dedans ; le cap pour entrer
  // (vers l'ouest) ; son vantail (gestes.js : passer) ; ceux qui y travaillent (leur place, leur rôle) ; les cloisons (pour
  // la caméra, et pour savoir qui l'on voit) ; le baby-foot d'Atlas
  lieux.solumatic = { dehors: { x: SOLU.x1 + 1.75, z: ENTREE.z }, seuil: { x: SOLU.x1 + 0.15, z: ENTREE.z }, dedans: { x: SOLU.x1 - 1.3, z: ENTREE.z }, cap: -Math.PI / 2, battant: { obj: za.porteSolu, a: 1.45 }, gens: za.gens, murs: za.murs, portes: za.portes, babyfoot: za.babyfoot };
  // les collisions qui attendaient que les herbes soient semées : la devanture du laboratoire, l'entrepôt et sa cour
  for (const f of plusTard) f();

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
    ligne.voir(cx, cz); // l'intérieur de l'entrepôt et ses bouteilles : de près seulement
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

  return { ciel, soleil: soleilL, hemi, carte, lieux, panneaux: [enseignes], nuages: ciel.children[1], regler, maj, ombres, nuit, porteBureau: chai.porte, interieurBureau: chai.interieur, porteChai: chai.porteChai, halleChai: chai.halle, moulin, vignes, traiter, retraiter, ligne, porteSolu: za.porteSolu, toitSolu: za.toitSolu, interieurSolu: za.interieurSolu, vitresSolu: za.vitresSolu };
}
