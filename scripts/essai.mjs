// Banc d'essai : ouvre le jeu (index.html construit) dans Chrome sans fenêtre, joue un scénario,
// mesure et fait des captures. Chaque lancement a son propre Chrome : plusieurs essais peuvent tourner en même temps.
//
// Usage : node scripts/essai.mjs <scenario> [LARGEURxHAUTEUR] [dossier]
//   accueil   capture de l'écran d'accueil
//   parcours  joue toute la mission (3 commandes, 3 livraisons, 3 factures) et vérifie chaque étape ; VEHICULE=van : en van
//   conduite  toute la tournée en conduite assistée au doigt (VEHICULE=van : en van)
//   perf      mesure le coût d'une image à plusieurs endroits du monde (et le rythme réel sur 3 s)
//   photo     captures en jeu à des endroits fixes (domaine, route, bourg, place, personnage de près)
//   poids     démarrage (ms), mémoire, coût de chaque étape d'une image ; LENT=4 simule un processeur 4 fois plus lent,
//             QUALITE=faible|moyen|haut impose un palier
// Sortie : texte sur la console ; captures dans essais/<dossier>/ ; code 1 si une erreur JS est apparue.
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [scenario = 'parcours', taille = '390x844', dossier = scenario] = process.argv.slice(2);
const [W, H] = taille.split('x').map(Number);
const sortie = join(root, 'essais', dossier);
await mkdir(sortie, { recursive: true });

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const navigateur = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`],
  defaultViewport: { width: W, height: H, deviceScaleFactor: W < 600 ? 2 : 1, isMobile: W < 600, hasTouch: W < 600 },
});
const page = await navigateur.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') erreurs.push(m.type() + ': ' + m.text()); });
const LENT = Number(process.env.LENT || 1);
if (LENT > 1) await page.emulateCPUThrottling(LENT);
await page.goto('file://' + join(root, 'index.html') + (process.env.QUALITE ? '?qualite=' + process.env.QUALITE : ''), { waitUntil: 'load' });
await page.waitForFunction(() => window.CL, { timeout: 20000 });
const ev = (f, ...a) => page.evaluate(f, ...a);
const capture = async nom => { await new Promise(r => setTimeout(r, 250)); await page.screenshot({ path: join(sortie, nom + '.jpg'), type: 'jpeg', quality: 85 }); console.log('capture', join('essais', dossier, nom + '.jpg')); };
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'ÉCHEC ') + msg); if (!cond) erreurs.push('échec : ' + msg); };

if (scenario === 'accueil') {
  await new Promise(r => setTimeout(r, 600));
  await capture('accueil-tot');
  await new Promise(r => setTimeout(r, 3000));
  await capture('accueil');
}

if (scenario === 'parcours') {
  const r = await ev(async VEH => {
    const q = s => document.querySelector(s), m = CL.mission, T = CL.jeu.tel, log = [];
    const clic = s => { const e = q(s); if (!e) throw new Error('absent : ' + s + ' (appli ' + T.app + ', étape ' + m.etape + ')'); if (e.disabled) throw new Error('désactivé : ' + s); e.click(); };
    const saisir = n => { for (let i = 0; i < n; i++) clic('[data-a="qte:1"]'); clic('[data-a="signer"]'); };
    CL.jouer(); CL.step(260); q('#poche').click();
    clic('[data-a="rappel:cave"]'); CL.step(900);
    log.push(['quantité à zéro au départ, envoi impossible', m.client('cave').cartons === 0 && q('[data-a="signer"]').disabled]);
    saisir(1);
    log.push(['mauvaise quantité refusée (1 au lieu de 6)', m.client('cave').statut === 'commande']);
    saisir(5);
    log.push(['bonne quantité envoyée (6)', m.client('cave').statut === 'envoyee']);
    clic('[data-a="ouvrir:bureau"]'); clic('[data-a="rappel:treille"]'); CL.step(700); saisir(3);
    clic('[data-a="ouvrir:bureau"]'); clic('[data-a="rappel:bar"]'); clic('[data-a="msg"]');
    CL.step(400); T.action('cmd:bar'); saisir(2);
    log.push(['3 commandes envoyées, on attend encore la tâche du règlement', m.nbEnvoyees === 3 && m.etape === 'rappels']);
    clic('[data-a="ouvrir:bureau"]'); clic('[data-a="cheque"]'); CL.step(2);
    log.push(['règlement en retard ajouté à la tournée, on attend encore le prospect', m.retardataire.statut === 'attendu' && m.etape === 'rappels']);
    clic('[data-a="prospect"]'); T.fermer(); CL.step(2);
    log.push(['prospect ajouté à la tournée (5 tâches du jour sur 5)', m.prospect.statut === 'attendu' && m.nbTaches === 5 && m.etape === 'chai']);
    CL.step(1500);
    log.push(['3 commandes signées', m.clients.every(c => c.statut === 'signee')]);
    // VEHICULE=van : la tournée en van au lieu du tracteur
    const genre = VEH;
    { const p = CL.vehicule(genre).p.pos; CL.teleporter(p.x + 2.4, p.z, 0); } // à côté du véhicule choisi
    CL.step(3); CL.agir(); CL.finirGeste();
    log.push(['monté dans ' + (genre === 'van' ? 'le van' : 'le tracteur'), CL.jeu.auVolant && CL.jeu.veh.genre === genre]);
    // garé là où la conduite assistée s'arrête : on descend, on charge la palette, on remonte (gestes.js)
    CL.teleporter(-83.4, -47.4, 2.83); CL.step(30);
    log.push(['chargement commencé (on descend du véhicule)', m.etape === 'chargement' && CL.jeu.gestes.actif]);
    CL.finirGeste(4000); CL.step(5);
    log.push(['chargement fait (' + CL.tr.charge + ' cartons), palette vide, de nouveau au volant', m.etape === 'tournee' && CL.tr.charge === 11 && m.palette.every(p => !p.groupe.visible) && CL.jeu.auVolant]);
    T.ouvrir('tournee');
    log.push(['tournée à 5 arrêts', document.querySelectorAll('#app .arret').length === 5]);
    clic('[data-a="tournee"]');
    { const a = CL.jeu.lieux.arrets.epicerie; CL.teleporter(a.x - 3, a.z, Math.PI / 2); CL.step(30); CL.step(900); }
    log.push(['chèque récupéré à l\'épicerie', m.retardataire.statut === 'recupere' && m.arret === 1]);
    for (const id of ['cave', 'bar', 'treille']) {
      const a = CL.jeu.lieux.arrets[id]; CL.teleporter(a.x + 3, a.z, -Math.PI / 2); CL.step(30); CL.finirGeste(4000); CL.step(10);
      log.push(['cartons posés et bon de livraison ouvert chez ' + id, T.ouvert && T.app === 'bl' && m.blPret]);
      T.encre = 200; q('#bt-livrer').disabled = false; clic('#bt-livrer'); CL.step(10);
      log.push(['livré chez ' + id, m.client(id).statut === 'livree']);
      CL.finirGeste(2000); CL.step(5);
      log.push(['de nouveau au volant après ' + id, CL.jeu.auVolant]);
    }
    log.push(['véhicule vide, 11 cartons posés devant les clients', CL.jeu.tm.cartons.every(c => !c.visible) && m.deposes.reduce((s, p) => s + p.userData.n, 0) === 11]);
    // le prospect, aux Grands Champs : on descend, on lui sert un verre, il goûte, la visite est notée dans le bureau
    { const a = CL.jeu.lieux.arrets.auberge; CL.teleporter(a.x, a.z - 4, 0); CL.step(30); }
    log.push(['chez le prospect, Auberge du Moulin', m.prospect.statut === 'visite' && m.cible === null]);
    CL.agir(); CL.finirGeste(); CL.step(5);
    { const f = CL.jeu.lieux.figurants.auberge; CL.jeu.joueur.placer(f.x - 1.6, f.z, Math.PI / 2); } CL.step(5); CL.agir();
    for (let n = 0; n < 2400 && m.prospect.statut !== 'a_rappeler'; n++) CL.step(1);
    T.ouvrir('bureau');
    log.push(['dégustation, visite notée dans le bureau, à rappeler', m.prospect.statut === 'a_rappeler' && m.etape === 'retour' && document.querySelector('#app').textContent.includes('À rappeler')]);
    T.fermer();
    { const p = CL.tr.pos; CL.jeu.joueur.placer(p.x + 2.4, p.z, 0); } CL.step(3); CL.agir(); CL.finirGeste(); CL.step(3);
    // retour : garé devant le bureau du chai, on descend, on entre (porte, fondu), on dépose le chèque, on s'assoit au portable
    const BU = CL.jeu.lieux.bureau;
    CL.teleporter(-81.4, -59.4, Math.PI); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
    CL.jeu.joueur.placer(BU.dehors.x - 0.6, BU.dehors.z, Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
    log.push(['entré dans le bureau du chai (porte refermée)', CL.jeu.dedans && Math.abs(CL.monde.porteBureau.rotation.y) < 0.01 && !CL.jeu.pc.ouvert]);
    CL.jeu.joueur.placer(-72.6, -63.4, Math.PI / 2); CL.step(5); CL.agir(); CL.step(5);
    log.push(['chèque déposé sur le bureau, portable pas encore ouvert', m.retardataire.statut === 'depose' && !CL.jeu.pc.ouvert]);
    CL.agir(); CL.finirGeste(); CL.step(5);
    log.push(['assis au portable, Vitisoft ouvert', CL.jeu.pc.ouvert && CL.jeu.pc.onglet === 'vitisoft' && CL.joueur.assis]);
    clic('[data-a="onglet:bureau"]');
    log.push(['le bureau aussi, sur le portable', !!q('#pc .pt-bureau .onglets') && !!q('#pc [data-a="ouvrir:tournee"]')]);
    clic('[data-a="onglet:vitisoft"]');
    clic('[data-a="vue:reglements"]'); clic('[data-a="regler"]');
    log.push(['règlement saisi dans Vitisoft', m.retardataire.statut === 'saisi']);
    clic('[data-a="vue:commandes"]');
    for (const id of ['cave', 'bar', 'treille']) { clic(`[data-a="fac:${id}"]`); clic(`[data-a="env:${id}"]`); CL.step(80); }
    log.push(['3 factures transmises (' + CL.jeu.ventes + ' €)', m.toutTransmis && Math.abs(CL.jeu.ventes - 640.2) < 0.01]);
    log.push(['Vitisoft ne se ferme pas tant que la DRM manque', !q('.vs-fin')]);
    clic('[data-a="vue:drm"]'); clic('[data-a="drm"]'); CL.step(100);
    log.push(['DRM du mois dernier calculée', m.drm === 'faite']);
    clic('.vs-fin [data-a="fermer"]'); CL.step(560);
    log.push(['carte de fin', !q('#fin').hidden]);
    return log;
  }, process.env.VEHICULE || 'tracteur').catch(e => [['scénario interrompu : ' + e.message, false]]);
  for (const [msg, c] of r) ok(c, msg);
  await capture('fin');
}

if (scenario === 'conduite') {
  // toute la tournée en conduite assistée au doigt (doigt posé, sans tourner) : VEHICULE=van pour le van
  const r = await ev(VEH => {
    const q = s => document.querySelector(s), m = CL.mission, T = CL.jeu.tel, J = CL.jeu, log = [];
    const saisir = n => { for (let i = 0; i < n; i++) q('[data-a="qte:1"]').click(); q('[data-a="signer"]').click(); };
    CL.jouer(); CL.step(260); q('#poche').click(); q('[data-a="rappel:cave"]').click(); CL.step(900); saisir(6);
    q('[data-a="ouvrir:bureau"]').click(); q('[data-a="rappel:treille"]').click(); CL.step(700); saisir(3);
    q('[data-a="ouvrir:bureau"]').click(); q('[data-a="rappel:bar"]').click(); q('[data-a="msg"]').click(); CL.step(400); T.action('cmd:bar'); saisir(2);
    q('[data-a="ouvrir:bureau"]').click(); q('[data-a="cheque"]').click(); q('[data-a="prospect"]').click(); T.fermer(); CL.step(1500);
    { const p = CL.vehicule(VEH).p.pos; CL.teleporter(p.x + 2.4, p.z, 0); } CL.step(3); CL.agir(); CL.finirGeste(); CL.step(3);
    const C = CL.ctrl; C.id = 1; C.jx = 0; C.jy = 0;
    let t = 0, chocs = 0, arret = 0, bloque = false;
    for (let k = 0; k < 60 * 400 && m.etape !== 'pc'; k++) {
      if (T.ouvert && T.app === 'bl') { T.encre = 200; q('#bt-livrer').disabled = false; q('#bt-livrer').click(); }
      // chez le prospect : descendre, lui servir un verre, attendre qu'il ait goûté, remonter et reposer le doigt
      if (m.prospect.statut === 'visite' && !J.gestes.actif && !T.ouvert) {
        if (J.auVolant) { CL.agir(); CL.finirGeste(); }
        const f = J.lieux.figurants.auberge; J.joueur.placer(f.x - 1.6, f.z, Math.PI / 2); CL.step(5); CL.agir();
        for (let n = 0; n < 2400 && m.prospect.statut !== 'a_rappeler'; n++) CL.step(1);
        { const p = CL.tr.pos; J.joueur.placer(p.x + 2.4, p.z, 0); } CL.step(3); CL.agir(); CL.finirGeste(); C.id = 1;
      }
      if (m.etape === 'tournee' && !T.ouvert) { T.ouvrir('tournee'); q('[data-a="tournee"]').click(); }
      if (m.etape === 'retour' && J.distance(J.lieux.pc) < 6.5 && Math.abs(CL.tr.v) < 0.5) break;
      CL.step(1); t += 1 / 60;
      if (CL.tr.chocVu > 0.15) chocs++;
      if (Math.abs(CL.tr.v) < 0.25 && !T.ouvert && !m.attenteBL && !m.attenteCheque && m.etape !== 'chargement') arret += 1 / 60; else arret = 0;
      if (arret > 15) { bloque = true; break; }
    }
    C.id = null;
    log.push(['tournée complète en conduite assistée (' + VEH + ', ' + Math.round(t) + ' s de jeu)', !bloque && m.clients.every(c => c.statut === 'livree') && m.retardataire.statut === 'recupere' && J.distance(J.lieux.pc) < 6.5]);
    log.push(['aucun choc en route (' + chocs + ')', chocs === 0]);
    return log;
  }, process.env.VEHICULE || 'tracteur').catch(e => [['scénario interrompu : ' + e.message, false]]);
  for (const [msg, c] of r) ok(c, msg);
}

if (scenario === 'perf') {
  await ev(() => { CL.jouer(); CL.step(30); });
  await new Promise(r => setTimeout(r, 1500)); // chauffe (compilation des shaders)
  for (const [nom, x, z, h] of [['domaine', -99, -55, 0], ['route', -30, 10, Math.PI / 2], ['bourg', 60, 10, Math.PI / 2], ['place', 95, -30, Math.PI], ['vignes', -130, 60, 0]]) {
    const r = await ev((x, z, h) => { CL.teleporter(x, z, h); CL.step(60); CL.bench(30); return CL.bench(120); }, x, z, h);
    console.log(`${nom.padEnd(8)} ${r}`);
  }
  const ips = await ev(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res((n / 3).toFixed(0)); }; requestAnimationFrame(f); }));
  console.log('images par seconde réelles (Chrome sans fenêtre) :', ips);
}

if (scenario === 'poids') {
  await page.waitForFunction(() => window.CL && CL.mesures.pret, { timeout: 60000, polling: 50 });
  const m = await ev(() => ({ ...CL.mesures, nav: performance.getEntriesByType('navigation')[0].domInteractive, fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0 }));
  console.log(`processeur ralenti x${LENT}`);
  console.log(`démarrage : accueil affiché à ${m.fcp.toFixed(0)} ms, page lue ${m.nav.toFixed(0)} ms, moteur prêt (three.js et modules) ${m.debut} ms, monde construit en ${m.construction} ms, script fini à +${m.script} ms, image 3D prête à ${m.pret} ms`);
  console.log('mémoire accueil', JSON.stringify(await ev(() => CL.memoire())));
  await ev(() => { CL.jouer(); CL.step(30); });
  await new Promise(r => setTimeout(r, 1500));
  for (const [nom, x, z, h] of [['domaine', -99, -55, 0], ['bourg', 60, 10, Math.PI / 2], ['place', 95, -30, Math.PI], ['vignes', -130, 60, 0]]) {
    const r = await ev((x, z, h) => { CL.teleporter(x, z, h); CL.step(60); CL.profil(20); return CL.profil(120); }, x, z, h);
    const tot = Object.values(r).reduce((a, b) => a + b, 0);
    console.log(`${nom.padEnd(8)} total ${tot.toFixed(2)} ms  ` + Object.entries(r).map(([k, v]) => k + ' ' + v.toFixed(2)).join('  '));
  }
  await ev(() => { { const p = CL.vehicule('tracteur').p.pos; CL.teleporter(p.x + 2.2, p.z, 0); } CL.step(3); CL.agir(); CL.finirGeste(); CL.teleporter(-30, 10, Math.PI / 2); CL.ctrl.ky = -1; CL.step(60); });
  const r = await ev(() => { CL.profil(20); return CL.profil(120); });
  console.log(`conduite total ${Object.values(r).reduce((a, b) => a + b, 0).toFixed(2)} ms  ` + Object.entries(r).map(([k, v]) => k + ' ' + v.toFixed(2)).join('  '));
  console.log('mémoire jeu', JSON.stringify(await ev(() => CL.memoire())), 'qualité', await ev(() => CL.qualite.nom + ' ratio ' + CL.ratio));
}

if (scenario === 'photo') {
  await ev(() => { CL.jouer(); CL.step(30); });
  const vues = {
    domaine: [-84, 4, -36, -99, 1.5, -58], route: [-20, 3.2, 13, 40, 3, 8], bourg: [10, 3.2, 13, 60, 3, 6],
    place: [88, 4.5, -30, 82, 3, -66], vignes: [-118, 3, 22, -140, 1, 60],
  };
  for (const [nom, v] of Object.entries(vues)) { await ev(v => { CL.photo(...v); CL.step(2); }, v); await capture(nom); }
  await ev(() => { const j = CL.joueur; j.placer(-96, -47, 0.5); CL.step(2); CL.photo(j.pos.x + 1.2, 1.75, j.pos.z + 2.4, j.pos.x, 1.15, j.pos.z); });
  await capture('personnage');
  await ev(() => { CL.photo(); { const p = CL.vehicule('tracteur').p.pos; CL.teleporter(p.x + 2.2, p.z, 0); } CL.step(3); CL.agir(); CL.finirGeste(); CL.teleporter(-30, 10, Math.PI / 2); CL.ctrl.ky = -1; CL.step(90); CL.ctrl.ky = 0; });
  await capture('conduite');
}

await navigateur.close();
if (erreurs.length) { console.log('\nERREURS :\n' + [...new Set(erreurs)].join('\n')); process.exit(1); }
console.log('\nAucune erreur.');
