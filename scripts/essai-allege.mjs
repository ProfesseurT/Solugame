// Banc d'essai de l'allègement de three.js (scripts/allege-three.mjs) : compare le jeu construit avec et sans.
// À lancer après une mise à jour de three, ou quand le jeu se met à utiliser une fonction de three qu'il n'utilisait pas.
//
// Usage : npm run build, puis node scripts/essai-allege.mjs [LARGEURxHAUTEUR]   (390x844 par défaut)
// Les deux versions partagent la page de index.html ; seul le script diffère (même esbuild, plugin en plus ou non).
// À chaque palier (faible, moyen, haut), pour chaque version, dans Chrome sans fenêtre :
//  - vues fixes rendues en temps figé (boucle du jeu arrêtée, hasard fixe, polices web bloquées), pixels relevés ;
//  - partie complète (scénario du parcours) puis passage aux cinq endroits du banc perf ;
//  - relevé des programmes créés, des sources GLSL envoyées et de leur traduction par ANGLE (WEBGL_debug_shaders).
// Doit finir sur « Équivalent. » : mêmes programmes, mêmes sources une fois préprocessées (fonctions jamais appelées
// mises à part, le compilateur les jette), mêmes traductions par ANGLE, mêmes images au bruit de la carte graphique près.
import puppeteer from 'puppeteer-core';
import { build } from 'esbuild';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import allegeThree from './allege-three.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [W, H] = (process.argv[2] || '390x844').split('x').map(Number);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/* ------------------------------------------------------------------ les deux pages */

const page0 = await readFile(join(root, 'index.html'), 'utf8');
const a = page0.indexOf('<script>') + 8, z = page0.lastIndexOf('</script>');
const paquet = async plugins => (await build({
  entryPoints: [join(root, 'src', 'main.js')], bundle: true, minify: true, format: 'iife', target: 'es2020',
  charset: 'utf8', legalComments: 'none', write: false, logLevel: 'warning', plugins,
})).outputFiles[0].text.trim().replace(/<\/script/gi, '<\\/script');
const dossier = await mkdtemp(join(tmpdir(), 'essai-allege-'));
const pages = {};
for (const [nom, plugins] of [['sans', []], ['avec', [allegeThree({ srcDir: join(root, 'src'), journal: () => {} })]]]) {
  const js = await paquet(plugins);
  pages[nom] = join(dossier, nom + '.html');
  await writeFile(pages[nom], page0.slice(0, a) + js + page0.slice(z));
  console.log(`${nom.padEnd(4)} three allégé : ${nom === 'avec' ? 'oui' : 'non'}, script ${(js.length / 1024).toFixed(0)} Ko`);
}

/* ------------------------------------------------------------------ relevés dans Chrome */

const VUES = {
  domaine: [-84, 4, -36, -99, 1.5, -58], route: [-20, 3.2, 13, 40, 3, 8], bourg: [10, 3.2, 13, 60, 3, 6],
  place: [88, 4.5, -30, 82, 3, -66], vignes: [-118, 3, 22, -140, 1, 60], ciel: [0, 30, 0, 300, 60, 100],
};

async function relever(fichier, palier) {
  const nav = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--enable-privileged-webgl-extensions', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', `--window-size=${W},${H}`],
    defaultViewport: { width: W, height: H, deviceScaleFactor: W < 600 ? 2 : 1, isMobile: W < 600, hasTouch: W < 600 },
  });
  const page = await nav.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource/.test(m.text())) erreurs.push(m.type() + ': ' + m.text()); });
  // polices web bloquées (les panneaux dessinés au démarrage dépendraient de l'instant où elles arrivent)
  await page.setRequestInterception(true);
  page.on('request', q => { if (/fonts\.(googleapis|gstatic)\.com/.test(q.url())) q.abort(); else q.continue(); });
  await page.evaluateOnNewDocument(() => {
    // temps figé (seul CL.step avance) et hasard fixe ; sources GLSL et traductions relevées à chaque compilation
    window.requestAnimationFrame = () => 0;
    Math.random = () => 0.37;
    window.__src = []; window.__trad = [];
    const C = WebGL2RenderingContext.prototype, source = C.shaderSource, compiler = C.compileShader;
    C.shaderSource = function (sh, s) { window.__src.push(s); return source.call(this, sh, s); };
    C.compileShader = function (sh) {
      const r = compiler.call(this, sh), e = this.getExtension('WEBGL_debug_shaders');
      window.__trad.push(e ? e.getTranslatedShaderSource(sh) : '');
      return r;
    };
  });
  await page.goto('file://' + fichier + '?qualite=' + palier, { waitUntil: 'load' });
  await page.waitForFunction(() => window.CL, { timeout: 20000 });
  const r = await page.evaluate(async VUES => {
    const images = {};
    // pixels : empreinte exacte et sommes par blocs (16 x 32) pour mesurer un écart
    const relevePixels = async () => {
      const gl = CL.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, b = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b);
      const blocs = [];
      for (let by = 0; by < 32; by++) for (let bx = 0; bx < 16; bx++) {
        let s = 0;
        for (let y = Math.floor(by * h / 32); y < Math.floor((by + 1) * h / 32); y++) for (let x = Math.floor(bx * w / 16); x < Math.floor((bx + 1) * w / 16); x++) { const i = (y * w + x) * 4; s += b[i] + b[i + 1] + b[i + 2]; }
        blocs.push(s);
      }
      const d = new Uint8Array(await crypto.subtle.digest('SHA-256', b));
      return { empreinte: [...d].map(x => x.toString(16).padStart(2, '0')).join(''), blocs };
    };
    CL.jouer(); CL.step(30);
    for (const [nom, v] of Object.entries(VUES)) { CL.photo(...v); CL.step(2); CL.bench(1); images[nom] = await relevePixels(); }
    const j = CL.joueur; j.placer(-96, -47, 0.5); CL.step(2); CL.photo(j.pos.x + 1.2, 1.75, j.pos.z + 2.4, j.pos.x, 1.15, j.pos.z); CL.step(1); CL.bench(1);
    images.personnage = await relevePixels();
    CL.photo();
    // la partie complète (comme le scénario « parcours » de scripts/essai.mjs), puis les endroits du banc perf
    const q = s => document.querySelector(s), m = CL.mission, T = CL.jeu.tel;
    const clic = s => { const e = q(s); if (!e) throw new Error('absent : ' + s); e.click(); };
    let parcours = 'complet';
    try {
      const saisir = n => { for (let i = 0; i < n; i++) clic('[data-a="qte:1"]'); clic('[data-a="signer"]'); };
      CL.step(260); q('#poche').click();
      clic('[data-a="rappel:cave"]'); CL.step(900); saisir(6);
      clic('[data-a="ouvrir:bureau"]'); clic('[data-a="rappel:treille"]'); CL.step(700); saisir(3);
      clic('[data-a="ouvrir:bureau"]'); clic('[data-a="rappel:bar"]'); clic('[data-a="msg"]');
      CL.step(400); T.action('cmd:bar'); saisir(2); clic('[data-a="ouvrir:bureau"]'); clic('[data-a="cheque"]'); T.fermer(); CL.step(1500);
      { const p = CL.vehicule('tracteur').p.pos; CL.teleporter(p.x + 2.2, p.z, 0); } CL.step(3); CL.agir(); CL.finirGeste(); CL.teleporter(-83.4, -47.4, 2.83); CL.step(30); CL.finirGeste(4000); CL.step(5); CL.bench(1);
      T.ouvrir('tournee'); clic('[data-a="tournee"]');
      { const a = CL.jeu.lieux.arrets.epicerie; CL.teleporter(a.x - 3, a.z, Math.PI / 2); CL.step(930); CL.bench(1); }
      for (const id of ['cave', 'bar', 'treille']) {
        const a = CL.jeu.lieux.arrets[id]; CL.teleporter(a.x + 3, a.z, -Math.PI / 2); CL.step(30); CL.finirGeste(4000); CL.step(10); CL.bench(1);
        T.encre = 200; q('#bt-livrer').disabled = false; clic('#bt-livrer'); CL.step(10); CL.finirGeste(2000);
      }
      CL.teleporter(-80.5, -52, -Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
      CL.jeu.joueur.placer(-78.0, -50.5, -Math.PI / 2); CL.step(5); CL.agir(); CL.step(5); CL.agir(); CL.step(5);
      clic('[data-a="vue:reglements"]'); clic('[data-a="regler"]'); clic('[data-a="vue:commandes"]');
      for (const id of ['cave', 'bar', 'treille']) { clic(`[data-a="fac:${id}"]`); clic(`[data-a="env:${id}"]`); CL.step(80); }
      clic('[data-a="vue:drm"]'); clic('[data-a="drm"]'); CL.step(100);
      clic('.vs-fin [data-a="fermer"]'); CL.step(560); CL.bench(1);
      if (!m.toutFait || q('#fin').hidden) parcours = 'inachevé';
    } catch (e) { parcours = 'interrompu : ' + e.message; }
    for (const [x, z, h] of [[-99, -55, 0], [-30, 10, Math.PI / 2], [60, 10, Math.PI / 2], [95, -30, Math.PI], [-130, 60, 0]]) { CL.teleporter(x, z, h); CL.step(60); CL.bench(2); }
    return { images, parcours, qualite: CL.qualite.nom, programmes: CL.renderer.info.programs.map(p => p.cacheKey) };
  }, VUES);
  const s = await page.evaluate(() => ({ sources: window.__src, traductions: window.__trad }));
  await nav.close();
  return { ...r, ...s, erreurs };
}

/* ------------------------------------------------------------------ comparaison */

const LEXEME = /0[xX][0-9a-fA-F]+[uU]?|\d+\.\d*(?:[eE][+-]?\d+)?[fF]?|\.\d+(?:[eE][+-]?\d+)?[fF]?|\d+(?:[eE][+-]?\d+)?[uUfF]?|[A-Za-z_]\w*|<<=|>>=|\+\+|--|<<|>>|<=|>=|==|!=|&&|\|\||\^\^|\+=|-=|\*=|\/=|%=|&=|\^=|\|=|\S/g;
const lex = s => s.match(LEXEME) || [];

// Valeur d'une expression de #if : macros remplacées par leur valeur, defined() évalué, opérateurs du préprocesseur
function valeur(expr, macros) {
  const t = [];
  const developper = (s, prof) => {
    const l = lex(s);
    for (let i = 0; i < l.length; i++) {
      if (l[i] === 'defined') { let n; if (l[i + 1] === '(') { n = l[i + 2]; i += 3; } else n = l[++i]; t.push(macros.has(n) ? '1' : '0'); }
      else if (/^[A-Za-z_]/.test(l[i])) { const v = macros.get(l[i]); if (v && v.trim() && prof < 8) { t.push('('); developper(v, prof + 1); t.push(')'); } else t.push('0'); }
      else t.push(l[i]);
    }
  };
  developper(expr, 0);
  let i = 0;
  const NIVEAUX = [['||'], ['&&'], ['==', '!='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/', '%']];
  const OPS = { '||': (a, b) => +(a || b), '&&': (a, b) => +(a && b), '==': (a, b) => +(a === b), '!=': (a, b) => +(a !== b), '<': (a, b) => +(a < b),
    '>': (a, b) => +(a > b), '<=': (a, b) => +(a <= b), '>=': (a, b) => +(a >= b), '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b, '/': (a, b) => Math.trunc(a / b), '%': (a, b) => a % b };
  const unaire = () => {
    const x = t[i++];
    if (x === '(') { const v = binaire(0); i++; return v; }
    if (x === '!') return +!unaire();
    if (x === '-') return -unaire();
    if (x === '+') return unaire();
    return parseInt(x, 10) || 0;
  };
  const binaire = n => {
    if (n === NIVEAUX.length) return unaire();
    let a = binaire(n + 1);
    while (NIVEAUX[n].includes(t[i])) { const o = t[i++]; a = OPS[o](a, binaire(n + 1)); }
    return a;
  };
  return !!binaire(0);
}

// Source GLSL d'un programme passée au préprocesseur : lexèmes du code compilé, directives restantes à part
function pretraiter(src) {
  const sans = src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, c => c.startsWith('//') ? '' : (c.includes('\n') ? '\n' : ' '));
  const macros = new Map(), pile = [], r = [];
  const actif = () => pile.every(f => f.on);
  for (const brute of sans.split('\n')) {
    const l = brute.trim(); if (!l) continue;
    const d = l.match(/^#\s*(\w+)\s*(.*)$/);
    if (!d) { if (actif()) r.push(...lex(l)); continue; }
    const [, nom, reste] = d;
    if (nom === 'if' || nom === 'ifdef' || nom === 'ifndef') {
      const parent = actif();
      const v = parent && (nom === 'if' ? valeur(reste, macros) : nom === 'ifdef' ? macros.has(reste.trim()) : !macros.has(reste.trim()));
      pile.push({ on: v, pris: v, parent });
    } else if (nom === 'elif') { const f = pile.at(-1); if (f.pris || !f.parent) f.on = false; else { f.on = valeur(reste, macros); f.pris = f.on; } }
    else if (nom === 'else') { const f = pile.at(-1); f.on = f.parent && !f.pris; f.pris = true; }
    else if (nom === 'endif') pile.pop();
    else if (actif()) {
      if (nom === 'define') { const m = reste.match(/^(\w+)(\([^)]*\))?\s*(.*)$/); macros.set(m[1], m[2] ? 'FN' : m[3]); }
      else if (nom === 'undef') macros.delete(reste.trim());
      r.push('#' + nom, ...lex(reste), '#');
    }
  }
  return sansFonctionsMortes(r).join(' ');
}

// Retire d'un programme préprocessé les fonctions que rien n'appelle (comme le compilateur)
function sansFonctionsMortes(t) {
  for (;;) {
    const defs = []; let prof = 0, debut = 0, nom = null;
    for (let i = 0; i < t.length; i++) {
      const x = t[i];
      if (prof === 0 && x[0] === '#') { while (t[++i] !== '#'); debut = i + 1; continue; }
      if (x === '{') {
        if (prof === 0) { nom = null; if (t[i - 1] === ')') { let p = 0, j = i - 1; for (; j >= 0; j--) { if (t[j] === ')') p++; else if (t[j] === '(' && --p === 0) break; } nom = t[j - 1]; } }
        prof++;
      } else if (x === '}') { if (--prof === 0) { if (nom) defs.push({ nom, a: debut, b: i }); debut = i + 1; } }
      else if (x === ';' && prof === 0) debut = i + 1;
    }
    const compte = new Map(); for (const x of t) compte.set(x, (compte.get(x) || 0) + 1);
    const soi = new Map(); for (const d of defs) soi.set(d.nom, (soi.get(d.nom) || 0) + t.slice(d.a, d.b + 1).filter(x => x === d.nom).length);
    const morts = defs.filter(d => d.nom !== 'main' && compte.get(d.nom) === soi.get(d.nom));
    if (!morts.length) return t;
    const enlever = new Set(); for (const d of morts) for (let i = d.a; i <= d.b; i++) enlever.add(i);
    t = t.filter((_, i) => !enlever.has(i));
  }
}

// Les noms internes d'ANGLE (ANGLE_s2a...) sont numérotés d'après tout le texte lu : renumérotés avant de comparer
const canon = s => { const m = new Map(); return s.replace(/\bANGLE_s[0-9a-f]+\b/g, t => { if (!m.has(t)) m.set(t, 'ANGLE_s#' + m.size); return m.get(t); }); };
const memes = (x, y) => { const a = [...new Set(x)].sort(), b = [...new Set(y)].sort(); return a.length === b.length && a.every((v, i) => v === b[i]); };

// Écart d'image toléré : la carte graphique ne rend pas toujours deux fois la même image au bit près
// (quelques unités sur un bloc de plusieurs milliers de pixels) ; une vraie différence se compte en milliers.
const BRUIT = 64;

let ok = true;
for (const palier of ['faible', 'moyen', 'haut']) {
  const S = await relever(pages.sans, palier), A = await relever(pages.avec, palier);
  const pS = S.sources.map(pretraiter), pA = A.sources.map(pretraiter);
  const tS = S.traductions.map(canon), tA = A.traductions.map(canon);
  const progs = memes(S.programmes, A.programmes), sources = memes(pS, pA), trad = memes(tS, tA);
  let bitPres = 0, blocs = 0, pire = 0;
  for (const v of Object.keys(S.images)) {
    if (S.images[v].empreinte === A.images[v].empreinte) bitPres++;
    S.images[v].blocs.forEach((x, i) => { const d = Math.abs(x - A.images[v].blocs[i]); if (d) blocs++; pire = Math.max(pire, d); });
  }
  const images = pire <= BRUIT;
  const gS = S.sources.reduce((n, s) => n + s.length, 0), gA = A.sources.reduce((n, s) => n + s.length, 0);
  console.log(`\n${palier} (palier réel ${S.qualite} / ${A.qualite}) ; parcours ${S.parcours} / ${A.parcours}`);
  console.log(`  programmes      ${S.programmes.length} / ${A.programmes.length}  ${progs ? 'identiques' : 'DIFFÉRENTS'}`);
  console.log(`  sources GLSL    ${new Set(pS).size} / ${new Set(pA).size}  ${sources ? 'identiques une fois préprocessées' : 'DIFFÉRENTES'}  (${(gS / 1024).toFixed(0)} -> ${(gA / 1024).toFixed(0)} Ko envoyés)`);
  console.log(`  traduites ANGLE ${new Set(tS).size} / ${new Set(tA).size}  ${trad ? 'identiques' : 'DIFFÉRENTES'}${tS.every(t => t) ? '' : '  (extension WEBGL_debug_shaders absente)'}`);
  console.log(`  images          ${bitPres}/${Object.keys(S.images).length} identiques au bit près ; blocs différents ${blocs}, écart max ${pire} (bruit toléré ${BRUIT})  ${images ? 'OK' : 'DIFFÉRENTES'}`);
  for (const e of [...new Set([...S.erreurs, ...A.erreurs])]) console.log('  erreur : ' + e.slice(0, 300));
  if (!progs || !sources || !trad || !images || S.erreurs.length || A.erreurs.length || S.parcours !== 'complet' || A.parcours !== 'complet') ok = false;
}
await rm(dossier, { recursive: true, force: true });
console.log(ok ? '\nÉquivalent.' : '\nÉCART : l\'allègement change quelque chose (voir ci-dessus).');
process.exit(ok ? 0 : 1);
