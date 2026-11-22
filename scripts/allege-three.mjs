// Allège three.js dans le paquet (plugin esbuild branché par scripts/build.mjs), sans rien changer
// à ce que le jeu affiche ni à son comportement. Il ne touche qu'à node_modules/three/build/three.module.js,
// au moment où esbuild le lit (rien n'est modifié sur le disque). Tout se règle seul d'après src/ :
// ce que src/ nomme (classe, macro, morceau de shader, méthode) est toujours gardé.
//
//  1. Shaders jamais compilés : three range ses shaders en morceaux (ShaderChunk) assemblés par #include,
//     et un shader complet par type de matière (ShaderLib). On ne garde que les matières que le jeu crée
//     (classes cherchées dans src/, plus « depth » pour les cartes d'ombre) et les morceaux qu'elles incluent,
//     de proche en proche, plus tout morceau nommé dans src/. Un morceau retiré qui servirait quand même
//     ferait une erreur bien visible (« Can not resolve #include <...> ») : rien ne disparaît en silence.
//  2. GLSL élagué : blocs #if des fonctions que le jeu n'utilise jamais (MACROS_RARES : envMap, matières
//     physiques, lumières ponctuelles...), puis fonctions GLSL que plus rien n'appelle. Le préprocesseur et
//     le compilateur les auraient jetées de toute façon : la carte graphique reçoit le même programme.
//  3. GLSL minifié : indentation, commentaires et espaces superflus retirés ; les directives restent seules
//     sur leur ligne. Chaque texte minifié est relu et comparé lexème par lexème : le build s'arrête au moindre écart.
//     Les morceaux que le jeu modifie par remplacement de texte gardent leurs lignes telles quelles s'il le faut
//     (détecté seul : motifs des .replace(...) de src/), et le build vérifie que chaque motif trouve toujours sa cible.
//  4. Code mort retenu seulement par des affectations au chargement du module (animation, chargeurs) :
//     enveloppé dans une fonction marquée pure, que esbuild retire si rien ne s'en sert (et garde intacte sinon).
//  5. Bouchons : ce que le moteur de rendu prépare toujours mais que le jeu n'utilise jamais (cubemaps et PMREM,
//     WebXR, lancer de rayons, lecture de pixels et copies de textures, transmission, blocs d'uniformes, morphose).
//     Ils répondent comme l'original tant que rien n'est demandé, et lèvent une erreur claire (allegeAbsent)
//     si un jour on leur demande quelque chose. Chacun saute tout seul si src/ nomme la fonction concernée.
//
// Vérifié le 22/11/2026 (three 0.170.0) : à chaque palier, mêmes programmes, mêmes sources une fois préprocessées
// (fonctions jamais appelées mises à part), mêmes shaders traduits par ANGLE (ce que reçoit la carte graphique)
// et mêmes images, au bruit de la carte graphique près, qu'avec three.js intact. À refaire après toute mise à jour
// de three : le plugin s'arrête avec un message clair s'il ne reconnaît plus le fichier, mais ne voit pas tout.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ShaderChunk, ShaderLib } from 'three';

// Motifs que src/ cherche avec .replace(...) (chaîne ou expression régulière littérale) : le jeu modifie ainsi
// des morceaux de shader de three (src/modeles.js). Un morceau dont la minification casserait un de ces motifs
// reste « intact » : ses lignes gardées sont celles de three, on n'y retire que des lignes entières.
const MOTIF_REPLACE = /\.replace\(\s*('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[gimsuy]*)/g;
function motifsDuJeu(jeu) {
  const motifs = [];
  for (const [, lit] of jeu.matchAll(MOTIF_REPLACE)) {
    try {
      if (lit[0] === '/') { const f = lit.lastIndexOf('/'); motifs.push(new RegExp(lit.slice(1, f), lit.slice(f + 1))); }
      else if (lit[0] === '"') motifs.push(JSON.parse(lit));
      else motifs.push(JSON.parse('"' + lit.slice(1, -1).replace(/\\'/g, "'").replace(/(^|[^\\])((?:\\\\)*)"/g, '$1$2\\"') + '"'));
    } catch { /* littéral que JSON ne sait pas lire (\x41...) : ignoré */ }
  }
  return motifs;
}
const trouve = (motif, texte) => typeof motif === 'string' ? texte.includes(motif) : new RegExp(motif.source, motif.flags.replace('g', '')).test(texte);

/* ------------------------------------------------------------------ GLSL */

// Découpe un texte GLSL (sans directive) en lexèmes, comme le fait le compilateur (le plus long d'abord).
const LEXEME = /0[xX][0-9a-fA-F]+[uU]?|\d+\.\d*(?:[eE][+-]?\d+)?[fF]?|\.\d+(?:[eE][+-]?\d+)?[fF]?|\d+(?:[eE][+-]?\d+)?[uUfF]?|[A-Za-z_]\w*|<<=|>>=|\+\+|--|<<|>>|<=|>=|==|!=|&&|\|\||\^\^|\+=|-=|\*=|\/=|%=|&=|\^=|\|=|\S/g;
const lexemes = s => s.match(LEXEME) || [];

// Recolle des lexèmes avec le moins d'espaces possible : un espace seulement là où, sans lui, deux lexèmes
// n'en feraient plus qu'un (deux mots, « - - », « / * »...).
function recoller(lx) {
  let out = '', a = '';
  for (const t of lx) {
    if (a) {
      const l = lexemes(a + t);
      if (l.length !== 2 || l[0] !== a || l[1] !== t || /[/*]$/.test(a) && /^[/*]/.test(t)) out += ' ';
    }
    out += t; a = t;
  }
  return out;
}

// Une directive, réduite au plus court sans changer son sens.
function directive(ligne) {
  const m = ligne.match(/^#\s*(\w+)\s*([\s\S]*)$/);
  if (!m) return ligne;
  const [, nom, reste] = m;
  switch (nom) {
    case 'include': {
      const i = reste.match(/^<([\w\d./]+)>$/);
      if (!i) throw new Error('allege-three : #include inattendu : ' + ligne);
      return '#include <' + i[1] + '>';
    }
    case 'define': {
      // #define NOM(a, b) corps : la parenthèse collée au nom fait une macro à paramètres, à garder collée
      const d = ligne.match(/^#\s*define\s+(\w+)(\([^)]*\))?\s*([\s\S]*)$/);
      return '#define ' + d[1] + (d[2] ? recoller(lexemes(d[2])) : '') + (d[3] ? ' ' + recoller(lexemes(d[3])) : '');
    }
    case 'if': case 'elif':
      return '#' + nom + ' ' + recoller(lexemes(reste));
    default: // ifdef, ifndef, undef, else, endif, pragma, extension, version, error...
      return ('#' + nom + ' ' + reste.replace(/\s+/g, ' ')).trim();
  }
}

// Retire les commentaires (le GLSL n'a pas de chaînes de caractères) ; un commentaire sur plusieurs lignes laisse un saut de ligne.
const sansCommentaires = src => src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, c => c.startsWith('//') ? '' : (c.includes('\n') ? '\n' : ' '));

// Minifie un texte GLSL.
export function minifierGlsl(src) {
  const sans = sansCommentaires(src);
  const lignes = [];
  let code = [];
  const vider = () => { if (code.length) { lignes.push(recoller(code)); code = []; } };
  for (const brute of sans.split('\n')) {
    const l = brute.trim();
    if (!l) continue;
    if (l[0] === '#') { vider(); lignes.push(directive(l)); }
    else code.push(...lexemes(l));
  }
  vider();
  return lignes.join('\n');
}

// Résumé du sens d'un texte GLSL : ses lexèmes, avec les directives séparées et marquées. Deux textes
// de même résumé donnent le même programme. Sert à vérifier chaque minification.
function sens(src) {
  const sans = sansCommentaires(src);
  const r = [];
  for (const brute of sans.split('\n')) {
    const l = brute.trim();
    if (!l) continue;
    if (l[0] === '#') {
      const fn = /^#\s*define\s+\w+\(/.test(l); // macro à paramètres (parenthèse collée au nom)
      r.push('\n#' + (fn ? 'f' : ''), ...lexemes(l.slice(1)), '#\n');
    } else r.push(...lexemes(l));
  }
  return r.join('\u0001');
}

function minifierVerifie(nom, src) {
  const min = minifierGlsl(src);
  if (sens(min) !== sens(src)) throw new Error('allege-three : la minification change le sens du GLSL de ' + nom);
  return min;
}

// Macros que three ne définit que pour une fonction précise (matière, lumière, carte de texture...).
// Si src/ ne nomme pas cette fonction (motif) ni la macro elle-même, la macro n'est jamais définie
// (ou vaut 0 pour les nombres de lumières et de plans de coupe, que three écrit en toutes lettres).
const MACROS_RARES = [
  [/envMap|\.environment\s*=/, 'USE_ENVMAP ENVMAP_TYPE_CUBE ENVMAP_TYPE_CUBE_UV ENVMAP_MODE_REFLECTION ENVMAP_MODE_REFRACTION ENVMAP_BLENDING_MULTIPLY ENVMAP_BLENDING_MIX ENVMAP_BLENDING_ADD'],
  [/lightMap/, 'USE_LIGHTMAP'],
  [/aoMap/, 'USE_AOMAP'],
  [/bumpMap/, 'USE_BUMPMAP'],
  [/normalMap|anisotropy/, 'USE_NORMALMAP USE_NORMALMAP_TANGENTSPACE USE_NORMALMAP_OBJECTSPACE USE_TANGENT'],
  [/displacementMap/, 'USE_DISPLACEMENTMAP'],
  [/specularMap/, 'USE_SPECULARMAP'],
  [/emissiveMap/, 'USE_EMISSIVEMAP DECODE_VIDEO_TEXTURE_EMISSIVE'],
  [/alphaMap/, 'USE_ALPHAMAP'],
  [/alphaHash/, 'USE_ALPHAHASH'],
  [/alphaToCoverage/, 'ALPHA_TO_COVERAGE'],
  [/dithering/, 'DITHERING'],
  [/premultipliedAlpha/, 'PREMULTIPLIED_ALPHA'],
  [/logarithmicDepthBuffer/, 'USE_LOGDEPTHBUF'],
  [/morph/i, 'USE_MORPHTARGETS USE_MORPHNORMALS USE_MORPHCOLORS USE_INSTANCING_MORPH'],
  [/BatchedMesh/, 'USE_BATCHING USE_BATCHING_COLOR'],
  [/LightProbe/, 'USE_LIGHT_PROBES'],
  [/PointLight/, 'NUM_POINT_LIGHTS NUM_POINT_LIGHT_SHADOWS DISTANCE'],
  [/SpotLight/, 'NUM_SPOT_LIGHTS NUM_SPOT_LIGHT_SHADOWS NUM_SPOT_LIGHT_MAPS NUM_SPOT_LIGHT_COORDS NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS'],
  [/RectAreaLight/, 'NUM_RECT_AREA_LIGHTS'],
  [/clippingPlanes|clipIntersection|localClippingEnabled/, 'NUM_CLIPPING_PLANES UNION_CLIPPING_PLANES'],
  [/MeshStandardMaterial|MeshPhysicalMaterial/, 'STANDARD PHYSICAL IOR USE_SPECULAR USE_SPECULAR_COLORMAP USE_SPECULAR_INTENSITYMAP '
    + 'USE_CLEARCOAT USE_CLEARCOATMAP USE_CLEARCOAT_ROUGHNESSMAP USE_CLEARCOAT_NORMALMAP USE_IRIDESCENCE USE_IRIDESCENCEMAP '
    + 'USE_IRIDESCENCE_THICKNESSMAP USE_SHEEN USE_SHEEN_COLORMAP USE_SHEEN_ROUGHNESSMAP USE_ANISOTROPY USE_ANISOTROPYMAP '
    + 'USE_TRANSMISSION USE_TRANSMISSIONMAP USE_THICKNESSMAP USE_DISPERSION USE_METALNESSMAP USE_ROUGHNESSMAP RE_IndirectSpecular RE_Direct_RectArea'],
  [/MeshPhongMaterial/, 'PHONG'],
  [/MeshToonMaterial/, 'TOON USE_GRADIENTMAP'],
  [/MeshMatcapMaterial/, 'MATCAP USE_MATCAP'],
  [/MeshNormalMaterial/, 'NORMAL'],
  [/PointsMaterial/, 'USE_POINTS_UV USE_SIZEATTENUATION'],
  [/VSMShadowMap/, 'SHADOWMAP_TYPE_VSM'],
  [/VideoTexture/, 'DECODE_VIDEO_TEXTURE'],
  [/FogExp2/, 'FOG_EXP2'],
];

// Valeur d'une expression de #if : un nombre si elle est connue d'avance, null sinon.
// « imp » : macros jamais définies (defined() faux, valeur 0).
function evaluer(expr, imp) {
  const t = lexemes(expr);
  let i = 0;
  const voir = () => t[i], prendre = x => { if (x !== undefined && t[i] !== x) throw new Error('allege-three : #if illisible : ' + expr); return t[i++]; };
  const ou = (a, b) => (a !== null && a !== 0) || (b !== null && b !== 0) ? 1 : a === 0 && b === 0 ? 0 : null;
  const et = (a, b) => a === 0 || b === 0 ? 0 : a !== null && b !== null ? 1 : null;
  const cmp = { '==': (a, b) => a === b, '!=': (a, b) => a !== b, '<': (a, b) => a < b, '>': (a, b) => a > b, '<=': (a, b) => a <= b, '>=': (a, b) => a >= b };
  function primaire() {
    const x = prendre();
    if (x === '(') { const v = expOu(); prendre(')'); return v; }
    if (x === '!') { const v = primaire(); return v === null ? null : +!v; }
    if (x === 'defined') {
      const par = voir() === '(' && prendre('(');
      const n = prendre();
      if (par) prendre(')');
      return imp.has(n) ? 0 : null;
    }
    if (/^\d+$/.test(x)) return Number(x);
    if (/^[A-Za-z_]\w*$/.test(x)) return imp.has(x) ? 0 : null;
    throw new Error('allege-three : #if illisible : ' + expr);
  }
  function expCmp() {
    let a = primaire();
    while (cmp[voir()]) { const o = prendre(), b = primaire(); a = a === null || b === null ? null : +cmp[o](a, b); }
    return a;
  }
  function expEt() { let a = expCmp(); while (voir() === '&&') { prendre(); a = et(a, expCmp()); } return a; }
  function expOu() { let a = expEt(); while (voir() === '||') { prendre(); a = ou(a, expEt()); } return a; }
  const v = expOu();
  if (i !== t.length) throw new Error('allege-three : #if illisible : ' + expr);
  return v;
}

// Retire d'un texte GLSL les blocs #if... qui ne peuvent jamais être compilés (macros « imp » jamais définies),
// et les directives des blocs toujours compilés ; les conditions incertaines restent telles quelles.
// Comme le préprocesseur le ferait de toute façon, quelles que soient les autres macros.
function elaguer(src, imp) {
  const out = [], pile = [];
  const actif = () => pile.every(f => f.sortie);
  for (const brute of src.split('\n')) {
    const l = brute.trim();
    const d = l.match(/^#\s*(if|ifdef|ifndef|elif|else|endif)\b\s*(.*)$/);
    if (!d) { if (actif()) out.push(brute); continue; }
    const [, nom, reste] = d;
    const f = pile[pile.length - 1];
    if (nom === 'if' || nom === 'ifdef' || nom === 'ifndef') {
      if (!actif()) { pile.push({ sortie: false, mort: true }); continue; }
      const v = nom === 'if' ? evaluer(reste, imp) : imp.has(reste.trim()) ? +(nom === 'ifndef') : null;
      if (v === null) { out.push(brute); pile.push({ sortie: true, pris: false, emis: true }); }
      else pile.push({ sortie: !!v, pris: !!v, emis: false });
    } else if (nom === 'elif') {
      if (f.mort) continue;
      if (f.pris) { f.sortie = false; continue; }
      const v = evaluer(reste, imp);
      if (v === null) { out.push(f.emis ? brute : brute.replace(/#\s*elif/, '#if')); f.emis = true; f.sortie = true; }
      else if (v) { if (f.emis) out.push('#else'); f.pris = true; f.sortie = true; }
      else f.sortie = false;
    } else if (nom === 'else') {
      if (f.mort) continue;
      if (f.pris) { f.sortie = false; continue; }
      if (f.emis) out.push(brute);
      f.pris = !f.emis; f.sortie = true;
    } else { // endif
      pile.pop();
      if (f.emis) out.push(brute);
    }
  }
  if (pile.length) throw new Error('allege-three : #if sans #endif');
  return out.join('\n');
}

// Définitions de fonctions de premier niveau d'un texte GLSL, par lignes [i0, i1]. « entiere » : elle occupe
// des lignes entières, sans directive à l'intérieur ; seules celles-là sont retirées (lignes supprimées en bloc).
function definitions(texte) {
  const lignes = texte.split('\n'), defs = [];
  let prof = 0, decl = null, cour = null;
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i].trim();
    if (l[0] === '#') { if (prof === 0) decl = null; else if (cour) cour.directive = true; continue; }
    const t = lexemes(l);
    for (let k = 0; k < t.length; k++) {
      const x = t[k];
      if (prof === 0) { if (!decl) decl = { i, k, lx: [] }; decl.lx.push(x); }
      if (x === '{') {
        if (prof === 0) {
          // « type nom( ... ) { » : une définition de fonction (sinon structure, ou instruction d'un morceau inclus dans main)
          const lx = decl.lx;
          cour = null;
          if (lx[lx.length - 2] === ')') {
            let p = 0, j = lx.length - 2;
            for (; j >= 0; j--) { if (lx[j] === ')') p++; else if (lx[j] === '(' && --p === 0) break; }
            if (j > 0 && /^[A-Za-z_]\w*$/.test(lx[j - 1]) && !/^(if|for|while|switch)$/.test(lx[j - 1])) cour = { nom: lx[j - 1], i0: decl.i, k0: decl.k };
          }
        }
        prof++;
      } else if (x === '}') {
        if (--prof === 0) {
          if (cour) { cour.i1 = i; cour.entiere = cour.k0 === 0 && k === t.length - 1 && !cour.directive; defs.push(cour); }
          cour = null; decl = null;
        }
      } else if (x === ';' && prof === 0) decl = null;
    }
  }
  return defs;
}

// Retire les fonctions GLSL que rien n'appelle : ni les morceaux gardés, ni les noms « vivants » (code GLSL du jeu,
// fonctions appelées par le code que three génère). Recommence tant qu'une suppression en libère d'autres.
function retirerFonctions(textes, cles, vivants) {
  const retirees = new Set();
  for (;;) {
    const compte = new Map();
    for (const k of cles) for (const w of lexemes(textes[k])) compte.set(w, (compte.get(w) || 0) + 1);
    const parNom = new Map();
    for (const k of cles) {
      const lignes = textes[k].split('\n');
      for (const d of definitions(textes[k])) {
        const e = parNom.get(d.nom) || { soi: 0, defs: [] };
        e.soi += lexemes(lignes.slice(d.i0, d.i1 + 1).join('\n')).filter(w => w === d.nom).length;
        e.defs.push({ ...d, k });
        parNom.set(d.nom, e);
      }
    }
    const aRetirer = [];
    for (const [nom, e] of parNom) {
      if (vivants.has(nom) || compte.get(nom) > e.soi || !e.defs.every(d => d.entiere)) continue;
      aRetirer.push(...e.defs); retirees.add(nom);
    }
    if (!aRetirer.length) return retirees;
    for (const d of aRetirer.sort((a, b) => b.i0 - a.i0)) {
      const lignes = textes[d.k].split('\n');
      lignes.splice(d.i0, d.i1 - d.i0 + 1);
      textes[d.k] = lignes.join('\n');
    }
  }
}

/* ------------------------------------------------------------------ outils de texte */

// Bloc qui commence à la ligne « debut » (exacte, en colonne 0) et finit à la première ligne « fin » qui suit.
function bloc(txt, debut, fin, depuis = 0) {
  const a = txt.indexOf('\n' + debut + '\n', depuis);
  if (a < 0) throw new Error('allege-three : introuvable dans three.module.js : ' + debut);
  const b = txt.indexOf('\n' + fin + '\n', a + debut.length);
  if (b < 0) throw new Error('allege-three : fin introuvable pour : ' + debut);
  return [a + 1, b + fin.length + 2];
}

function remplacerUneFois(txt, avant, apres) {
  const i = txt.indexOf(avant);
  if (i < 0 || txt.indexOf(avant, i + 1) >= 0) throw new Error('allege-three : motif absent ou multiple : ' + avant.slice(0, 80));
  return txt.slice(0, i) + apres + txt.slice(i + avant.length);
}

/* ------------------------------------------------------------------ bouchons (code injecté dans three) */

// Erreur claire si un jour le jeu demande ce qui a été retiré.
const ABSENT = `function allegeAbsent( quoi ) {
	throw new Error( 'allege-three : ' + quoi + ' retiré du build pour alléger le jeu (voir scripts/allege-three.mjs)' );
}`;

// Mêmes réponses que les originaux tant qu'aucune texture n'est à convertir (le cas du jeu : ni envMap,
// ni environnement, ni fond texturé) ; les conversions, elles, n'existent plus.
const BOUCHON_CUBEMAPS = `function WebGLCubeMaps() {
	function get( texture ) {
		if ( texture && texture.isTexture && ( texture.mapping === EquirectangularReflectionMapping || texture.mapping === EquirectangularRefractionMapping ) ) allegeAbsent( 'La conversion en cubemap' );
		return texture;
	}
	return { get: get, dispose: function () {} };
}`;
const BOUCHON_CUBEUVMAPS = `function WebGLCubeUVMaps() {
	function get( texture ) {
		if ( texture && texture.isTexture && ( texture.mapping === EquirectangularReflectionMapping || texture.mapping === EquirectangularRefractionMapping || texture.mapping === CubeReflectionMapping || texture.mapping === CubeRefractionMapping ) ) allegeAbsent( 'PMREMGenerator (envMap des matières standard)' );
		return texture;
	}
	return { get: get, dispose: function () {} };
}`;

// Ce que le moteur de rendu lit de renderer.xr hors session : désactivé, jamais présenté, pas de capteur de profondeur.
const BOUCHON_XR = `class WebXRManager extends EventDispatcher {
	constructor() {
		super();
		const absent = function () { allegeAbsent( 'WebXR' ); };
		this.cameraAutoUpdate = true;
		this.enabled = false;
		this.isPresenting = false;
		this.getController = this.getControllerGrip = this.getHand = this.setSession = absent;
		this.getCamera = this.updateCamera = this.getDepthSensingMesh = absent;
		this.getSession = function () { return null; };
		this.getEnvironmentBlendMode = function () {};
		this.hasDepthSensing = function () { return false; };
		this.setAnimationLoop = function () {};
		this.dispose = function () {};
	}
}`;

// Blocs d'uniformes : le moteur ne les touche que si une ShaderMaterial en déclare (uniformsGroups non vide).
const BOUCHON_UBO = `function WebGLUniformsGroups() {
	const absent = function () { allegeAbsent( 'Les blocs d\\'uniformes (uniformsGroups)' ); };
	return { bind: absent, update: absent, dispose: function () {} };
}`;
// Morphose : le moteur n'appelle update() que si la géométrie a des morphAttributes.
const BOUCHON_MORPH = `function WebGLMorphtargets() {
	return { update: function () { allegeAbsent( 'La morphose (morphAttributes)' ); } };
}`;

/* ------------------------------------------------------------------ le plugin */

export default function allegeThree({ srcDir, journal = console.log } = {}) {
  return {
    name: 'allege-three',
    setup(b) {
      b.onLoad({ filter: /three[\\/]build[\\/]three\.module\.js$/ }, async ({ path }) => {
        let txt = await readFile(path, 'utf8');
        const avant = txt.length;

        // Ce que le jeu utilise, lu dans src/
        let jeu = '';
        for (const f of await readdir(srcDir)) if (f.endsWith('.js')) jeu += await readFile(join(srcDir, f), 'utf8') + '\n';
        const nomme = re => re.test(jeu);
        const motifs = motifsDuJeu(jeu);
        // morceaux qu'il faut laisser intacts (lignes de three) : ceux dont la minification ferait rater un motif du jeu
        const intacts = new Set(Object.keys(ShaderChunk).filter(k => motifs.some(m => trouve(m, ShaderChunk[k]) && !trouve(m, minifierGlsl(sansCommentaires(ShaderChunk[k]))))));

        // 1. matières gardées (table shaderIDs de three : classe de matière -> entrée de ShaderLib)
        const ids = Object.fromEntries([...txt.match(/const shaderIDs = \{([\s\S]*?)\};/)[1].matchAll(/(\w+): '(\w+)'/g)].map(m => [m[1], m[2]]));
        const gardes = new Set(['depth']); // cartes d'ombre des lumières directionnelles (MeshDepthMaterial interne)
        for (const [classe, id] of Object.entries(ids)) if (nomme(new RegExp('\\b' + classe + '\\b'))) gardes.add(id);
        if (nomme(/\bPointLight\b/)) gardes.add('distanceRGBA');
        if (gardes.has('physical')) gardes.add('standard');
        const cubes = nomme(/\.background\s*=|\.environment\s*=|envMap|CubeTexture|CubeCamera|PMREM|fromEquirectangularTexture|CubeRenderTarget/);
        if (cubes) for (const id of ['background', 'backgroundCube', 'cube', 'equirect']) gardes.add(id);

        // morceaux gardés : ceux des matières gardées, ceux que three lit directement, ceux que src/ nomme, de proche en proche
        const racines = new Set();
        for (const id of gardes) {
          for (const [k, v] of Object.entries(ShaderChunk)) if (v === ShaderLib[id].vertexShader || v === ShaderLib[id].fragmentShader) racines.add(k);
        }
        for (const m of txt.matchAll(/ShaderChunk\[ '(\w+)' \]/g)) racines.add(m[1]);
        for (const k of Object.keys(ShaderChunk)) if (nomme(new RegExp('\\b' + k + '\\b'))) racines.add(k);
        // et ceux qu'incluent les shaders écrits dans le code de three (cubemaps, PMREM ; ombre VSM), quand ils peuvent servir
        const jsSansGlsl = txt.replace(/^(?:var|const) [\w$]+ = ".*";$/gm, '');
        const glslVsm = [...txt.matchAll(/^const (?:vertex|fragment) = (".*");$/gm)].map(m => JSON.parse(m[1])).join('\n');
        if (cubes) for (const m of jsSansGlsl.matchAll(/#include <(\w+)>/g)) racines.add(m[1]);
        if (nomme(/\bVSMShadowMap\b/)) for (const m of glslVsm.matchAll(/#include <(\w+)>/g)) racines.add(m[1]);
        const fermeture = textes => {
          const vus = new Set();
          const inclure = s => { for (const m of s.matchAll(/^[ \t]*#include +<([\w\d./]+)>/gm)) garder(m[1]); };
          const garder = k => { if (!vus.has(k)) { vus.add(k); inclure(textes[k]); } };
          for (const k of racines) garder(k);
          inclure(jeu);
          return vus;
        };

        // 2. macros jamais définies : fonction absente de src/, macro jamais nommée dans src/ ni définie par un morceau
        const imp = new Set();
        for (const [motif, noms] of MACROS_RARES) if (!nomme(motif)) for (const n of noms.split(' ')) if (!nomme(new RegExp('\\b' + n + '\\b'))) imp.add(n);
        for (const k of fermeture(ShaderChunk)) for (const m of ShaderChunk[k].matchAll(/^\s*#\s*(?:define|undef)\s+(\w+)/gm)) imp.delete(m[1]);
        // texte de chaque morceau débarrassé de ce qui ne peut jamais être compilé (sauf morceaux intacts)
        const textes = {};
        for (const [k, v] of Object.entries(ShaderChunk)) textes[k] = intacts.has(k) ? elaguer(v, imp) : elaguer(sansCommentaires(v), imp);
        const morceaux = fermeture(textes);
        // fonctions GLSL jamais appelées : « vivantes » si nommées dans src/ ou dans une chaîne du code de three
        // (ce que WebGLProgram écrit en tête des shaders), plus main et les XToneMapping que src/ choisit
        const vivants = new Set(['main', ...(jeu.match(/[A-Za-z_]\w*/g) || [])]);
        for (const m of jeu.matchAll(/\b(\w+)ToneMapping\b/g)) vivants.add(m[1] + 'ToneMapping');
        for (const m of jsSansGlsl.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)) for (const w of m[0].match(/[A-Za-z_]\w*/g) || []) vivants.add(w);
        if (nomme(/\bVSMShadowMap\b/)) for (const w of glslVsm.match(/[A-Za-z_]\w*/g) || []) vivants.add(w);
        const fonctionsRetirees = retirerFonctions(textes, [...morceaux], vivants);

        // réécrit l'objet ShaderChunk : retire les morceaux non gardés (leurs textes deviennent du code mort)
        const [c0, c1] = bloc(txt, 'const ShaderChunk = {', '};');
        const entrees = [...txt.slice(c0, c1).matchAll(/^\t(\w+): ([\w$]+),?$/gm)].map(m => ({ cle: m[1], v: m[2] }));
        if (entrees.length !== Object.keys(ShaderChunk).length) throw new Error('allege-three : lecture de ShaderChunk incomplète');
        const gardees = entrees.filter(e => morceaux.has(e.cle));
        txt = txt.slice(0, c0) + 'const ShaderChunk = {\n' + gardees.map(e => `\t${e.cle}: ${e.v}`).join(',\n') + '\n};\n' + txt.slice(c1);

        // réécrit ShaderLib : retire les matières non gardées
        const [l0, l1] = bloc(txt, 'const ShaderLib = {', '};');
        const lib = txt.slice(l0, l1);
        const parts = lib.slice(lib.indexOf('{') + 1, lib.lastIndexOf('}')).split(/\n(?=\t\w+: \{\n)/).filter(p => p.trim());
        if (parts.length !== Object.keys(ShaderLib).length - 1) throw new Error('allege-three : lecture de ShaderLib incomplète');
        const libGardee = parts.filter(p => gardes.has(p.match(/^\t(\w+):/)[1])).map(p => p.replace(/,?\s*$/, ''));
        txt = txt.slice(0, l0) + 'const ShaderLib = {\n\n' + libGardee.join(',\n\n') + '\n\n};\n' + txt.slice(l1);
        if (!gardes.has('physical')) {
          const [p0, p1] = bloc(txt, 'ShaderLib.physical = {', '};');
          txt = txt.slice(0, p0) + txt.slice(p1);
        }

        // 3. minifie le texte des morceaux gardés (sauf les morceaux intacts, seulement élagués) ;
        // chaque motif que le jeu cherche dans un morceau doit encore y être trouvé
        let glslAvant = 0, glslApres = 0;
        const parVar = new Map(gardees.map(e => [e.v, e.cle]));
        txt = txt.replace(/^(var|const) ([\w$]+) = ("(?:[^"\\\n]|\\.)*");$/gm, (tout, mot, v, lit) => {
          const cle = parVar.get(v);
          if (!cle) return tout;
          const src = JSON.parse(lit);
          if (src !== ShaderChunk[cle]) throw new Error('allege-three : texte inattendu pour ' + cle);
          const min = intacts.has(cle) ? textes[cle] : minifierVerifie(cle, textes[cle]);
          // (un motif qui ne visait que du code jamais compilé, retiré à l'élagage, ne compte pas)
          for (const m of motifs) if (trouve(m, textes[cle]) && !trouve(m, min)) throw new Error(`allege-three : src/ cherche ${m} dans le morceau ${cle}, qui ne le contient plus une fois minifié`);
          glslAvant += src.length; glslApres += min.length;
          return `${mot} ${v} = ${JSON.stringify(min)};`;
        });

        // shaders de l'ombre « VSM » (flou de la carte d'ombre) : minifiés, ou vidés si le jeu ne s'en sert pas
        txt = txt.replace(/^const (vertex|fragment) = ("(?:[^"\\\n]|\\.)*");$/gm, (tout, v, lit) => {
          const src = JSON.parse(lit);
          const min = nomme(/\bVSMShadowMap\b/) ? minifierVerifie('vsm ' + v, src) : '';
          glslAvant += src.length; glslApres += min.length;
          return `const ${v} = ${JSON.stringify(min)};`;
        });

        // 4. code mort retenu par des affectations au chargement : enveloppé dans une fonction pure
        for (const nom of ['KeyframeTrack', 'BooleanKeyframeTrack', 'ColorKeyframeTrack', 'NumberKeyframeTrack', 'QuaternionKeyframeTrack',
          'StringKeyframeTrack', 'VectorKeyframeTrack', 'Loader', 'PropertyBinding']) {
          const tete = txt.match(new RegExp('\\nclass ' + nom + '\\b[^\\n]*\\{(\\})?\\n'));
          if (!tete) throw new Error('allege-three : classe introuvable : ' + nom);
          const a = tete.index + 1;
          let b = tete[1] ? a + tete[0].length - 1 : txt.indexOf('\n}\n', a) + 3; // classe sur une ligne ou bloc fermé en colonne 0
          // les affectations qui suivent la classe (« Nom.x = ... ; » sur une ou plusieurs lignes)
          const suite = new RegExp('^\\n*' + nom + '\\.[\\s\\S]*?;\\n(?=\\n|' + nom + '\\.)');
          for (let m; (m = txt.slice(b).match(suite));) b += m[0].length;
          const def = txt.slice(a, b);
          txt = txt.slice(0, a) + `const ${nom} = /*@__PURE__*/ (() => {\n${def}\nreturn ${nom};\n})();\n` + txt.slice(b);
        }
        for (const v of ['_reservedRe', '_trackRe']) txt = remplacerUneFois(txt, `\nconst ${v} = new RegExp(`, `\nconst ${v} = /*@__PURE__*/ new RegExp(`);

        // 5. bouchons : ce que le moteur de rendu prépare toujours mais dont le jeu ne se sert jamais
        const bouchons = [];
        const remplacerBloc = (debut, par) => { const [a, z] = bloc(txt, debut, '}'); txt = txt.slice(0, a) + par + '\n' + txt.slice(z); };
        // corps d'une méthode (ou fonction interne) remplacé par une erreur claire ; repérée par le début exact
        // de sa première ligne, elle finit à la première ligne « } » (ou « }; ») au même retrait
        const boucher = (debut, quoi) => {
          const ind = debut.match(/^\t*/)[0];
          let n = 0;
          for (let i = 0; (i = txt.indexOf('\n' + debut, i)) >= 0; n++) {
            const a = txt.indexOf('\n', i + 1) + 1;
            const f = txt.slice(a).match(new RegExp('^' + ind + '\\};?$', 'm'));
            if (!f) throw new Error('allege-three : fin introuvable pour ' + debut);
            txt = txt.slice(0, a) + ind + '\tallegeAbsent( ' + JSON.stringify(quoi) + ' );\n' + txt.slice(a + f.index);
            i = a;
          }
          if (!n) throw new Error('allege-three : introuvable dans three.module.js : ' + debut);
        };
        txt = remplacerUneFois(txt, '\nfunction WebGLAnimation() {', '\n' + ABSENT + '\nfunction WebGLAnimation() {');
        // cubemaps, et avec elles PMREMGenerator, CubeCamera, WebGLCubeRenderTarget ; et l'envoi d'une texture cube,
        // qui ne sert qu'aux uniformes samplerCube (aucun dans les shaders gardés ni dans src/)
        if (!cubes) {
          remplacerBloc('function WebGLCubeMaps( renderer ) {', BOUCHON_CUBEMAPS);
          remplacerBloc('function WebGLCubeUVMaps( renderer ) {', BOUCHON_CUBEUVMAPS);
          bouchons.push('cubemaps et PMREM');
          if (!nomme(/samplerCube/) && ![...morceaux].some(k => textes[k].includes('samplerCube'))) {
            boucher('\tfunction uploadCubeTexture( ', 'Les textures cube (samplerCube)');
            bouchons.push('textures cube');
          }
        }
        if (!nomme(/\.xr\.|WebXR|XRSession|VRButton|ARButton|immersive-/)) {
          remplacerBloc('class WebXRManager extends EventDispatcher {', BOUCHON_XR);
          bouchons.push('WebXR');
        }
        // lancer de rayons : seul Raycaster appelle les méthodes raycast, et le jeu ne s'en sert pas
        if (!nomme(/raycast|Raycaster|_computeIntersections/i)) {
          boucher('\traycast( raycaster, intersects ) {', 'Le lancer de rayons (Raycaster)');
          boucher('\t_computeIntersections( raycaster, intersects, rayLocalSpace ) {', 'Le lancer de rayons (Raycaster)');
          bouchons.push('raycast');
        }
        // méthodes du moteur de rendu que src/ n'appelle jamais (lecture de pixels, copies de textures, préchargements)
        for (const m of ['readRenderTargetPixels', 'readRenderTargetPixelsAsync', 'copyFramebufferToTexture', 'copyTextureToTexture',
          'copyTextureToTexture3D', 'initRenderTarget', 'initTexture']) {
          if (!nomme(new RegExp('\\b' + m + '\\b'))) { boucher(`\t\tthis.${m} = `, 'WebGLRenderer.' + m); bouchons.push(m); }
        }
        // passe de transmission (verre, matières physiques transmissives) : jamais sans MeshPhysicalMaterial
        if (!nomme(/MeshPhysicalMaterial|transmission/)) {
          boucher('\t\tfunction renderTransmissionPass( ', 'La transmission (MeshPhysicalMaterial)');
          bouchons.push('transmission');
        }
        // blocs d'uniformes (UBO) des ShaderMaterial et cibles de morphose (morphAttributes) : jamais utilisés
        if (!nomme(/uniformsGroups|UniformsGroup/)) {
          remplacerBloc('function WebGLUniformsGroups( gl, info, capabilities, state ) {', BOUCHON_UBO);
          bouchons.push('UBO');
        }
        if (!nomme(/morph/i)) {
          remplacerBloc('function WebGLMorphtargets( gl, capabilities, textures ) {', BOUCHON_MORPH);
          bouchons.push('morphose');
        }

        journal(`allege-three : matières gardées ${[...gardes].join(', ')} ; morceaux de shader ${gardees.length}/${entrees.length} (intacts : ${[...intacts].join(', ') || 'aucun'}) ; `
          + `GLSL élagué (${imp.size} macros jamais définies, ${fonctionsRetirees.size} fonctions jamais appelées) et minifié ${(glslAvant / 1024).toFixed(0)} -> ${(glslApres / 1024).toFixed(0)} Ko ; bouchons : ${bouchons.join(', ') || 'aucun'} ; source three ${(avant / 1024).toFixed(0)} -> ${(txt.length / 1024).toFixed(0)} Ko`);
        return { contents: txt, loader: 'js' };
      });
    },
  };
}
