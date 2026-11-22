// Banc d'essai des personnages : une scène nue (sol, ciel, soleil du jeu) avec les héros et des passants,
// pour juger modèles et poses de près. Construit un petit paquet à part (esbuild) depuis src/perso.js et src/pieton.js.
//
// Usage : node scripts/essai-perso.mjs <scenario> [dossier]
//   galerie   héros et passants alignés, de face et de dos
//   marche    images d'une marche, d'une petite course et d'une course, de profil
//   poses     téléphone, salut, assis, regard, saut, recul, au volant
//   perf      coût du calcul des poses (ms pour 14 personnages) et croissance du tas
//   alloc     octets alloués par appel (update, sync, poser...) : seuls restent les nombres mis en boîte par V8
//   debug     positions monde des os au volant
import puppeteer from 'puppeteer-core';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [scenario = 'galerie', dossier = 'perso-banc'] = process.argv.slice(2);
const sortie = join(root, 'essais', dossier);
await mkdir(sortie, { recursive: true });

const code = `
import * as THREE from 'three';
import { perso, HEROS } from '../src/perso.js';
import { Pieton, Passant } from '../src/pieton.js';
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#efb68a');
scene.add(new THREE.HemisphereLight('#cfcde3', '#9a6a45', 1.8));
const sol = new THREE.DirectionalLight('#ffb46e', 3.1);
sol.position.set(-0.75, 0.42, 0.55).normalize().multiplyScalar(30); sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048); const sc = sol.shadow.camera; sc.left = sc.bottom = -12; sc.right = sc.top = 12; sc.far = 80;
sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.04;
scene.add(sol, sol.target);
const terre = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#c9b993' }));
terre.receiveShadow = true; scene.add(terre);
for (let i = -20; i <= 20; i += 2) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 40), new THREE.MeshBasicMaterial({ color: '#a8987a' })); l.position.set(i, 0.003, 0); scene.add(l); const m = l.clone(); m.rotation.y = Math.PI / 2; m.position.set(0, 0.003, i); scene.add(m); }
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 200);
const col = { nx: 0, nz: 0, resoudre() { return false; }, rangs() { return false; } };
window.B = { THREE, scene, camera, renderer, perso, HEROS, Pieton, Passant, col,
  creer(o, x, z, h) { const p = new Pieton(perso(o)); scene.add(p.m.groupe); p.placer(x, z, h); return p; },
  vue(px, py, pz, tx, ty, tz, fov = 35) { camera.fov = fov; camera.updateProjectionMatrix(); camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); },
  rendre() { renderer.render(scene, camera); },
};
`;
const res = await build({ stdin: { contents: code, resolveDir: join(root, 'scripts'), loader: 'js' }, bundle: true, format: 'iife', write: false, logLevel: 'error' });
const page0 = join(sortie, 'banc.html');
await writeFile(page0, `<!doctype html><meta charset="utf-8"><style>body{margin:0;overflow:hidden}</style><body><script>${res.outputFiles[0].text.replace(/<\/script/g, '<\\/script')}</script>`);

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1280,800', '--enable-precise-memory-info', '--js-flags=--expose-gc'], defaultViewport: { width: 1280, height: 800 } });
const page = await navigateur.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') erreurs.push(m.type() + ': ' + m.text()); else console.log('page:', m.text()); });
await page.goto('file://' + page0, { waitUntil: 'load' });
await page.waitForFunction(() => window.B, { timeout: 20000 });
const ev = (f, ...a) => page.evaluate(f, ...a);
const capture = async nom => { await page.screenshot({ path: join(sortie, nom + '.jpg'), type: 'jpeg', quality: 88 }); console.log('capture', join('essais', dossier, nom + '.jpg')); };

if (scenario === 'galerie') {
  await ev(() => {
    const P = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#d4a373'], CH = ['#2b1d0e', '#6b4423', '#b55239', '#d9c08c', '#c9c9c9', '#151515'];
    const HA = ['#c0392b', '#2e86de', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400', '#7f8c8d', '#e84393', '#34495e', '#f1ece2'];
    const BA = ['#2c3e50', '#34495e', '#5d4037', '#455a64', '#1e272e', '#6d4c41', '#8a7f6a'];
    let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; const pk = a => a[Math.floor(r() * a.length)];
    B.creer(B.HEROS.vigneron, -0.6, 0, 0); B.creer(B.HEROS.vigneronne, 0.6, 0, 0);
    window.L = [];
    for (let i = 0; i < 12; i++) {
      const o = { peau: pk(P), cheveux: pk(CH), coiffure: pk(['court', 'court', 'chauve', 'chignon', 'queue']), barbe: r() < 0.25, haut: pk(HA), bas: pk(BA),
        chapeau: r() < 0.2 ? 'beret' : r() < 0.12 ? 'casquette' : null, chapeauC: pk(['#1f2a44', '#3b3b3b', '#7a2233']), lunettes: r() < 0.2 };
      L.push(B.creer(o, -5.5 + (i % 6) * 2.2, -3 - Math.floor(i / 6) * 2.5, 0));
    }
    B.creer({ peau: '#e8b896', cheveux: '#9a9a9a', coiffure: 'chauve', barbe: true, haut: '#f0ece4', col: '#f0ece4', bas: '#2f2f35', tablier: '#3b2a26', lunettes: true }, 4, 1.5, 0);
    B.creer({ peau: '#f1c27d', cheveux: '#6b4423', coiffure: 'chignon', haut: '#f4f1ea', col: '#f4f1ea', bas: '#34343a', tablier: '#f4f1ea' }, 5.4, 1.5, 0);
    B.vue(0, 1.45, 4.2, 0, 1.0, 0, 32); B.rendre();
  });
  await capture('heros-face');
  await ev(() => { B.vue(0, 1.5, -3.4, 0, 1.05, 0, 32); B.rendre(); }); await capture('heros-dos');
  await ev(() => { B.vue(0, 1.7, 1.25, 0, 1.62, 0, 24); B.rendre(); }); await capture('visages');
  await ev(() => { B.vue(-1.1, 1.72, 0.5, -0.4, 1.66, 0, 22); B.rendre(); }); await capture('visages-34');
  await ev(() => { B.vue(2.2, 1.3, 1.2, 0, 1.0, 0, 32); B.rendre(); }); await capture('heros-profil');
  await ev(() => { B.vue(0, 3.2, 8, 0, 0.8, -4, 50); B.rendre(); }); await capture('passants');
}

if (scenario === 'marche') {
  // planche : chaque personnage marche sur un tapis puis on l'aligne (la pose est dans les os) ; 8 instants par ligne
  for (const [nom, force, courir] of [['marche', 0.12, false], ['petite-course', 0.7, false], ['course', 1, true], ['arret', 0.7, false]]) {
    await ev((force, courir, arret) => {
      for (const c of [...B.scene.children]) if (c.isGroup) B.scene.remove(c);
      ['vigneron', 'vigneronne'].forEach((h, r) => {
        for (let i = 0; i < 8; i++) {
          const j = B.creer(B.HEROS[h], 0, 0, 0);
          const n = 90 + i * (arret ? 5 : 4);
          for (let f = 0; f < n; f++) j.update(1 / 60, 0, 1, arret && f > 90 ? 0 : force, courir, B.col, f / 60);
          j.m.groupe.position.set(-4.2 + i * 1.2, 0, -r * 2.2); j.m.groupe.rotation.y = Math.PI / 2;
        }
      });
      B.vue(0.2, 1.3, 9.5, 0, 0.6, -1.1, 42); B.rendre();
    }, force, courir, nom === 'arret');
    await capture('planche-' + nom);
  }
  // demi-tour : on court vers +z puis on demande -z
  await ev(() => {
    for (const c of [...B.scene.children]) if (c.isGroup) B.scene.remove(c);
    for (let i = 0; i < 8; i++) {
      const j = B.creer(B.HEROS.vigneronne, 0, 0, 0);
      for (let f = 0; f < 60; f++) j.update(1 / 60, 0, 1, 0.5, false, B.col, f / 60);
      for (let f = 0; f < 2 + i * 4; f++) j.update(1 / 60, 0, -1, 0.5, false, B.col, f / 60);
      j.m.groupe.position.set(-4.2 + i * 1.2, 0, 0);
    }
    B.vue(0.2, 2.2, 7.5, 0, 0.6, 0, 42); B.rendre();
  });
  await capture('planche-demi-tour');
}

if (scenario === 'poses') {
  await ev(() => {
    window.T = B.creer(B.HEROS.vigneron, -1.6, 0, 0.3); T.telephone = true;
    window.S = B.creer(B.HEROS.vigneronne, 0, 0, -0.2);
    window.R = B.creer(B.HEROS.vigneron, 1.6, 0, -0.3); R.regard = new B.THREE.Vector3(4, 1.6, 3);
    for (let i = 0; i < 40; i++) { const t = i / 60; T.sync(1 / 60, t); R.sync(1 / 60, t); if (i === 2) S.saluer(); S.sync(1 / 60, t); }
    B.vue(0, 1.5, 4.6, 0, 1.1, 0, 34); B.rendre();
  });
  await capture('telephone-salut-regard');
  await ev(() => { B.vue(-0.9, 1.75, 0.9, -1.6, 1.4, 0, 30); B.rendre(); }); await capture('telephone-pres');
  // assis sur un banc (comme main.js : groupe à y = -0,34)
  await ev(() => {
    for (const c of [...B.scene.children]) if (c.isGroup) B.scene.remove(c);
    const banc = new B.THREE.Mesh(new B.THREE.BoxGeometry(2, 0.1, 0.55), new B.THREE.MeshLambertMaterial({ color: '#6b4a30' })); banc.position.set(0, 0.48, -0.15); B.scene.add(banc);
    const a = B.creer(B.HEROS.vigneronne, -0.5, 0, 0); a.assis = true; a.m.groupe.position.set(-0.5, -0.34, 0); a.sync(0, 0);
    const b = B.creer({ peau: '#f1c27d', cheveux: '#c9c9c9', coiffure: 'court', haut: '#34495e', bas: '#2c3e50', chapeau: 'beret', chapeauC: '#1f2a44' }, 0.5, 0, 0); b.assis = true; b.m.groupe.position.set(0.5, -0.34, 0); b.sync(0, 0);
    for (let i = 0; i < 30; i++) { a.sync(1 / 60, i / 60); b.sync(1 / 60, i / 60); }
    B.vue(1.8, 1.2, 2.6, 0, 0.6, 0, 34); B.rendre();
  });
  await capture('assis');
  // saut de côté et recul
  await ev(() => {
    for (const c of [...B.scene.children]) if (c.isGroup) B.scene.remove(c);
    const s = B.creer(B.HEROS.vigneron, -1, 0, 0); s.sauter(1, 0);
    for (let i = 0; i < 16; i++) s.update(1 / 60, 0, 0, 0, false, B.col, i / 60);
    const c = B.creer(B.HEROS.vigneronne, 1.2, 0, 0); c.v = 5; c.choc = 1; c.v = -1.1;
    for (let i = 0; i < 8; i++) c.update(1 / 60, 0, 0, 0, false, B.col, i / 60);
    B.vue(0, 1.4, 5, 0, 1.0, 0, 36); B.rendre();
  });
  await capture('saut-recul');
  // au volant : un faux tracteur (siège, plancher, volant) comme dans engins.js
  for (const [nom, braq] of [['volant-droit', 0], ['volant-gauche', 0.5], ['volant-droite', -0.5]]) {
    await ev(braq => {
      for (const c of [...B.scene.children]) if (c.isGroup || c.userData.tr) B.scene.remove(c);
      const T = B.THREE, tr = new T.Group(); tr.userData.tr = true; B.scene.add(tr);
      const M = new T.MeshLambertMaterial({ color: '#3b3d44' }), O = new T.MeshLambertMaterial({ color: '#ef7a2c' });
      const bx = (w, h, d, x, y, z, m = M) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; tr.add(b); };
      bx(1.3, 0.08, 1.2, 0, 1.2, -0.6); bx(0.5, 0.14, 0.46, 0, 1.42, -0.62); bx(0.5, 0.55, 0.1, 0, 1.72, -0.86); bx(0.86, 0.78, 1.6, 0, 1.22, 1.02, O);
      const v = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.04, 14).rotateX(Math.PI / 2), M); v.position.set(0, 1.9, -0.18); tr.add(v);
      const c = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.55, 5), M); c.position.set(0, 1.62, -0.12); tr.add(c);
      const j = new B.Pieton(B.perso(B.HEROS.vigneron)); tr.add(j.m.groupe); j.m.groupe.position.set(0, 0.62, -0.62); j.assis = true; j.volant = braq; j.sync(0, 0);
      for (let i = 0; i < 20; i++) j.sync(1 / 60, i / 60);
      B.vue(1.6, 2.6, 1.4, 0, 1.8, -0.3, 40); B.rendre();
    }, braq);
    await capture(nom);
  }
  await ev(() => { B.vue(0.2, 2.5, -2.4, 0, 1.9, -0.2, 40); B.rendre(); }); await capture('volant-dos');
}

if (scenario === 'debug') {
  const r = await ev(() => {
    const T = B.THREE, tr = new T.Group(); B.scene.add(tr);
    const j = new B.Pieton(B.perso(B.HEROS.vigneron)); tr.add(j.m.groupe); j.m.groupe.position.set(0, 0.62, -0.62); j.assis = true; j.volant = 0; j.sync(0, 0);
    j.sync(1 / 60, 0);
    B.scene.updateMatrixWorld(true);
    const o = j.m.os, w = i => { const v = new T.Vector3(); o[i].getWorldPosition(v); return v.toArray().map(x => x.toFixed(3)).join(' '); };
    return ['epauleG ' + w(4), 'coudeG ' + w(5), 'mainG ' + w(6), 'epauleD ' + w(7), 'coudeD ' + w(8), 'mainD ' + w(9), 'bassin ' + w(0), 'piedG ' + w(12)].join('\n');
  });
  console.log(r);
}

if (scenario === 'esquive') {
  // un « tracteur » fonce droit sur un passant (avec ou sans cap donné) : saute-t-il à temps ?
  const r = await ev(() => {
    let s = 9; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const out = [];
    for (const avecCap of [true, false]) for (let k = 0; k < 8; k++) {
      const P = new B.Passant(B.perso({ peau: '#e0ac69', haut: '#c0392b', bas: '#34495e' }), { x0: -1, z0: -1, x1: 1, z1: 1 }, rnd);
      P.attente = 99; const v = 5 + k, dec = (rnd() - 0.5) * 1.6;
      const d = { x: P.p.pos.x + dec, z: P.p.pos.z - 20, v, h: avecCap ? 0 : undefined };
      let dmin = 99, saute = false;
      for (let f = 0; f < 300; f++) {
        d.z += v / 60; if (!avecCap) delete d.h;
        P.update(1 / 60, d, B.col, f / 60);
        if (P.p.sautT > 0) saute = true;
        dmin = Math.min(dmin, Math.hypot(P.p.pos.x - d.x, P.p.pos.z - d.z));
      }
      out.push((avecCap ? 'cap  ' : 'deduit') + ' v ' + v + ' décalage ' + dec.toFixed(2) + ' : ' + (saute ? 'saute' : 'ne saute pas') + ', distance mini ' + dmin.toFixed(2));
      B.scene.remove(P.p.m.groupe);
    }
    return out.join('\n');
  });
  console.log(r);
}

if (scenario === 'alloc') {
  const r = await ev(() => {
    const j = B.creer(B.HEROS.vigneron, 0, 0, 0), a = j.anim, T = B.THREE;
    for (let f = 0; f < 300; f++) j.update(1 / 60, 0, 1, 0.5, false, B.col, f / 60);
    const v = new T.Vector3(0.1, 0.2, 0.3), q = new T.Quaternion(), e = new T.Euler(0.1, 0.2, 0.3), bone = j.m.os[4];
    const essais = {
      update: f => j.update(1 / 60, 0, 1, 0.5, false, B.col, f / 60),
      sync: f => j.sync(1 / 60, f / 60),
      poser: f => a.poser(1 / 60, j, f / 60),
      poseDebout: f => a.poseDebout(1 / 60, j, 2, 1, 0.01),
      reperes: f => a.reperes(),
      jambe: f => a.jambe(10, 1, 0.1, 0.08, 0.1 + 0.01 * Math.sin(f), 0.1, 0.1, 0),
      rotationSet: f => bone.rotation.set(0.1 * Math.sin(f), 0.2, 0.3),
      quatSetFromEuler: f => q.setFromEuler(e.set(0.1 * Math.sin(f), 0.2, 0.3)),
      vecNormalize: f => v.set(Math.sin(f), 0.2, 0.3).normalize(),
    };
    const out = [];
    for (const [nom, fn] of Object.entries(essais)) {
      for (let f = 0; f < 2000; f++) fn(f);
      gc(); gc(); const m0 = performance.memory.usedJSHeapSize;
      for (let f = 0; f < 20000; f++) fn(f);
      const m1 = performance.memory.usedJSHeapSize;
      out.push(nom.padEnd(18) + ((m1 - m0) / 20000).toFixed(1) + ' octets par appel');
    }
    return out.join('\n');
  });
  console.log(r);
}

if (scenario === 'perf') {
  const r = await ev(() => {
    const L = [];
    for (let i = 0; i < 14; i++) L.push(B.creer(i % 2 ? B.HEROS.vigneron : B.HEROS.vigneronne, i, 0, 0));
    L[0].telephone = true; L[1].assis = true;
    const t0 = performance.now();
    for (let f = 0; f < 600; f++) for (let i = 0; i < L.length; i++) { if (i < 2) L[i].sync(1 / 60, f / 60); else L[i].update(1 / 60, 0, 1, (i % 5) / 5, false, B.col, f / 60); }
    const cout = ((performance.now() - t0) / 600).toFixed(3);
    // allocations : le tas ne doit pas grossir pendant 3000 images (sans ramasse-miettes entre deux mesures)
    const tr = new B.THREE.Group(); B.scene.add(tr); tr.add(L[2].m.groupe); L[2].m.groupe.position.set(0, 0.62, -0.62); L[2].assis = true; L[3].salut = true;
    const pas = f => { for (let i = 0; i < L.length; i++) { if (i < 4) L[i].sync(1 / 60, f / 60); else L[i].update(1 / 60, Math.sin(f / 50), Math.cos(f / 50), (i % 5) / 5, i % 3 === 0, B.col, f / 60); } };
    for (let f = 0; f < 600; f++) pas(f);
    gc(); gc();
    const M = new Float64Array(31); M[0] = performance.memory.usedJSHeapSize;
    for (let f = 0; f < 3000; f++) { pas(f); if (f % 100 === 99) M[(f + 1) / 100] = performance.memory.usedJSHeapSize; }
    let baisse = 0; for (let i = 1; i < 31; i++) if (M[i] < M[i - 1]) baisse++;
    return cout + ' ms par image ; tas : ' + ((M[30] - M[0]) / 1024).toFixed(1) + ' Ko de plus après 3000 images, ' + baisse + ' passages du ramasse-miettes';
  });
  console.log('poses de 14 personnages :', r);
}

await navigateur.close();
if (erreurs.length) { console.log('\nERREURS :\n' + [...new Set(erreurs)].join('\n')); process.exit(1); }
console.log('\nAucune erreur.');
