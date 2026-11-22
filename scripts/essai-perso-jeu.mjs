// Vérifie dans le vrai jeu (index.html construit) les mouvements des personnages :
// recul contre un mur, passants qui sautent de côté devant le tracteur, client qui se tourne, captures.
// Usage : node scripts/essai-perso-jeu.mjs [dossier]
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dossier = process.argv[2] || 'perso-jeu';
const sortie = join(root, 'essais', dossier);
await mkdir(sortie, { recursive: true });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1280,800'], defaultViewport: { width: 1280, height: 800 } });
const page = await navigateur.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') erreurs.push(m.type() + ': ' + m.text()); });
await page.goto('file://' + join(root, 'index.html'), { waitUntil: 'load' });
await page.waitForFunction(() => window.CL, { timeout: 20000 });
const ev = (f, ...a) => page.evaluate(f, ...a);
const capture = async nom => { await new Promise(r => setTimeout(r, 200)); await page.screenshot({ path: join(sortie, nom + '.jpg'), type: 'jpeg', quality: 85 }); console.log('capture', join('essais', dossier, nom + '.jpg')); };
const ok = (c, m) => { console.log((c ? 'OK   ' : 'ÉCHEC ') + m); if (!c) erreurs.push('échec : ' + m); };

await ev(() => { CL.jouer(); CL.step(30); });

// 1. course contre le mur du chai : recul
const choc = await ev(() => {
  const j = CL.joueur; CL.teleporter(-90, -52, Math.PI / 2); CL.step(2);
  CL.ctrl.ky = -1; CL.ctrl.courir = true; let max = 0;
  for (let i = 0; i < 200; i++) { CL.step(1); max = Math.max(max, j.choc); }
  CL.ctrl.ky = 0; CL.ctrl.courir = false; CL.step(60);
  return { max, x: j.pos.x.toFixed(2) };
});
ok(choc.max > 0.5, `recul contre le mur (choc ${choc.max.toFixed(2)}, arrêté en x = ${choc.x})`);

// 2. tracteur lancé à travers la place : les passants sautent de côté
const persos = () => ev(() => { const sc = CL.joueur.m.groupe.parent; return sc.children.filter(c => c.isGroup && c.children[0]?.isSkinnedMesh).length; });
console.log('personnages dans la scène :', await persos());
const saut = await ev(async () => {
  const sc = CL.joueur.m.groupe.parent;
  const gens = sc.children.filter(c => c.isGroup && c.children[0]?.isSkinnedMesh && c !== CL.joueur.m.groupe);
  { const p = CL.vehicule('tracteur').p.pos; CL.teleporter(p.x + 2.2, p.z, 0); } CL.step(3); CL.agir();
  let max = 0, vus = 0;
  // on vise trois passants l'un après l'autre : le tracteur part à 14 m et fonce droit sur eux
  for (let k = 0; k < 3; k++) {
    const g = gens.filter(c => c.position.y === 0 && c.position.x > 80 && c.position.x < 110 && c.position.z > -58 && c.position.z < -34)[k];
    if (!g) break;
    // approche sur une ligne libre (la fontaine est en (95 ; -46))
    const gx = g.position.x, gz = g.position.z;
    if (Math.abs(gz + 46) > 3.5) CL.teleporter(gx < 95 ? gx - 14 : gx + 14, gz, gx < 95 ? Math.PI / 2 : -Math.PI / 2);
    else CL.teleporter(gx, gz + 14, Math.PI);
    CL.ctrl.ky = -1;
    for (let i = 0; i < 110; i++) { CL.step(1); for (const c of gens) { if (c.position.y > 0.05) vus++; max = Math.max(max, c.position.y); } }
    CL.ctrl.ky = 0; CL.step(90);
  }
  return { max, vus };
});
ok(saut.max > 0.2, `un passant a sauté de côté (hauteur ${saut.max.toFixed(2)} m, ${saut.vus} images en l'air)`);
await ev(() => { CL.photo(92, 2.2, -38, 95, 1, -48); CL.step(2); });
await capture('place-apres');

// 3. le client de la cave se tourne vers le joueur, au repos il respire (pose qui change)
const client = await ev(() => {
  if (CL.jeu.auVolant) { CL.teleporter(70, -46, 0); CL.step(5); CL.agir(); CL.step(5); }
  CL.photo();
  const sc = CL.joueur.m.groupe.parent, L = CL.jeu.lieux.figurants.cave;
  const g = sc.children.find(c => c.isGroup && c.children[0]?.isSkinnedMesh && Math.hypot(c.position.x - L.x, c.position.z - L.z) < 0.5);
  const h0 = g.rotation.y;
  CL.teleporter(L.x + 5, L.z + 4, 0); CL.step(5);
  const h1 = g.rotation.y; CL.step(90);
  return { h0: h0.toFixed(2), h1: h1.toFixed(2), h2: g.rotation.y.toFixed(2), vise: Math.atan2(5, 4).toFixed(2) };
});
ok(Math.abs(client.h2 - client.vise) < 0.1 && client.h1 !== client.h2, `client de la cave tourné vers le joueur en douceur (${client.h0} -> ${client.h1} -> ${client.h2}, visé ${client.vise})`);
await ev(() => { const j = CL.joueur; CL.photo(j.pos.x - 2, 1.9, j.pos.z + 2.6, j.pos.x - 2.5, 1.2, j.pos.z - 2); CL.step(2); });
await capture('client');

// 4. le joueur au repos sort parfois son téléphone ; course de dos et de face
await ev(() => { const j = CL.joueur; j.placer(-96, -47, 0.5); j.telephone = true; CL.step(40); CL.photo(j.pos.x - 0.8, 2.3, j.pos.z - 1.6, j.pos.x, 1.3, j.pos.z); CL.step(1); });
await capture('telephone-dos');
await ev(() => { const j = CL.joueur; j.telephone = false; CL.photo(); CL.teleporter(-60, 10, Math.PI / 2); CL.ctrl.ky = -1; CL.ctrl.courir = true; CL.step(70); });
await capture('course-dos');
await ev(() => { CL.ctrl.ky = 0; CL.ctrl.courir = false; CL.ctrl.ky = -0.3; CL.step(60); });
await capture('marche-dos');
await ev(() => { CL.ctrl.ky = 0; CL.step(30); });
// terrasse du bar et banc (figurants assis), place de près
await ev(() => { CL.teleporter(84, -50, Math.PI); CL.step(20); CL.photo(84.5, 2.0, -55.5, 82, 0.8, -61); CL.step(2); });
await capture('terrasse');
await ev(() => { CL.photo(100, 1.9, -36, 96, 1.0, -44); CL.step(2); });
await capture('place-pres');

await navigateur.close();
if (erreurs.length) { console.log('\nERREURS :\n' + [...new Set(erreurs)].join('\n')); process.exit(1); }
console.log('\nAucune erreur.');
