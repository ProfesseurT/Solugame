// Construit, depuis src/ (la source lisible) :
//  - index.html    : page complète minifiée, prête pour GitHub Pages ou tout hébergeur statique ;
//  - dist/jeu.html : fragment minifié, publié en Artifact claude.ai pour les essais.
// Le moteur 3D (three.js) est inclus dans le fichier : aucune dépendance au chargement. Il est allégé de ce que
// le jeu n'utilise jamais (shaders, code mort), sans rien changer à l'image : voir scripts/allege-three.mjs.
// Refuse tout tiret cadratin ou demi-cadratin (charte du client).
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build, transform } from 'esbuild';
import allegeThree from './allege-three.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');

for (const f of await readdir(srcDir)) {
  const txt = await readFile(join(srcDir, f), 'utf8');
  if (/[–—]/.test(txt)) {
    // on attend que le message soit écrit : vers un tube (npm run verifie), l'écriture est différée sur macOS
    await new Promise(ok => process.stderr.write(`Tiret cadratin ou demi-cadratin trouvé dans src/${f} : interdit par la charte.\n`, ok));
    process.exit(1);
  }
}

const src = await readFile(join(srcDir, 'index.html'), 'utf8');
const a = src.indexOf('<style>'), b = src.indexOf('</style>');
const head = src.slice(0, a).replace(/>\s*\n\s*</g, '><').trim();
const css = (await transform(src.slice(a + 7, b), { loader: 'css', minify: true, charset: 'utf8' })).code.trim();
const body = src.slice(b + 8).replace(/<!--[\s\S]*?-->/g, '').replace(/>\s*\n\s*</g, '><').trim();

const res = await build({
  entryPoints: [join(srcDir, 'main.js')], bundle: true, minify: true, format: 'iife', target: 'es2020',
  charset: 'utf8', legalComments: 'none', write: false, logLevel: 'warning',
  plugins: [allegeThree({ srcDir })],
});
const js = res.outputFiles[0].text.trim().replace(/<\/script/gi, '<\\/script');
// L'accueil s'affiche d'abord : le jeu (construction du monde, des personnages...) ne démarre qu'après la première image
// de la page. Sinon l'écran reste vide pendant toute la construction (une demi-seconde à une seconde sur téléphone).
// Filet : départ au plus tard après 300 ms (cadre caché, où requestAnimationFrame ne tourne pas).
const depart = `(()=>{let p=0;const f=()=>{if(p)return;p=1;${js}};requestAnimationFrame(()=>setTimeout(f));setTimeout(f,300)})();`;

const fragment = `${head}<style>${css}</style>${body}<script>${depart}</script>\n`;
const page = '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  + '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 8 8%27 shape-rendering=%27crispEdges%27><path fill=%27%236fcf5a%27 d=%27M4 0h2v1H4z%27/><path fill=%27%23ef7a2c%27 d=%27M2 1h4v1H2zM1 2h6v2H1zM2 4h4v2H2zM3 6h2v1H3z%27/></svg>">'
  + `${head}<style>${css}</style></head><body>${body}<script>${depart}</script></body></html>\n`;

await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist', 'jeu.html'), fragment);
await writeFile(join(root, 'index.html'), page);

const ko = n => (n / 1024).toFixed(0) + ' Ko';
console.log(`index.html ${ko(Buffer.byteLength(page))} (compressé ${ko(gzipSync(page, { level: 9 }).length)})`);
