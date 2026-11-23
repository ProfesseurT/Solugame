// Banc d'essai : ouvre le jeu (index.html construit) dans Chrome sans fenêtre, joue un scénario,
// mesure et fait des captures. Chaque lancement a son propre Chrome : plusieurs essais peuvent tourner en même temps.
//
// Usage : node scripts/essai.mjs <scenario> [LARGEURxHAUTEUR] [dossier]
//   accueil   capture de l'écran d'accueil
//   parcours  joue toute la mission (3 commandes, 3 livraisons, 3 factures) et vérifie chaque étape ; VEHICULE=van : en van
//   souple    la journée à la carte : le chèque seul, une tournée avec ce qui est déjà signé, un arrêt seul, chargement
//             en deux fois (VEHICULE=van : en van)
//   nuit      au clavier, marcher et courir (Maj) ; la nuit qui tombe, les phares ; rentrer dormir, le matin revient
//   voitures  les voitures des autres : conducteurs, emprunt, remplacement, pas de cartons ; mode WTF : vol, passant aplati
//   aides     les cas limites qui doivent toujours finir : objectif juste, relance du bureau, aides devant un client pas
//             prêt, prospect quitté sans verre, chèque déposé en cours de journée, bon de livraison rouvert
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
    CL.jouer(); CL.step(260);
    // pas d'anachronisme : avant tout appel, ni commande dans le bureau, ni dans Vitisoft ; rien à facturer, rien à encaisser
    const P = CL.jeu.pc, vs = vue => { P.onglet = 'vitisoft'; P.vue = vue; P.afficher(); return q('#pc-ecran').textContent; };
    log.push(['au départ, Vitisoft n\'a aucune commande, rien à facturer ni à encaisser', vs('commandes').includes('Aucune commande arrivée') && !vs('accueil').includes('Facturer') && !vs('accueil').includes('Saisir le règlement') && !q('#pc-ecran [data-a="regler"]')]);
    q('#poche').click(); clic('[data-a="ouvrir:commande"]');
    log.push(['au départ, le bureau n\'a pas encore de commande', q('#app').textContent.includes('Pas encore de commande')]);
    log.push(['au départ, palette du chai vide', m.palette.every(p => !p.groupe.visible)]);
    clic('[data-a="ouvrir:bureau"]');
    clic('[data-a="rappel:cave"]'); CL.step(900);
    log.push(['quantité à zéro au départ, envoi impossible', m.client('cave').cartons === 0 && q('[data-a="signer"]').disabled]);
    saisir(1);
    log.push(['mauvaise quantité refusée (1 au lieu de 6)', m.client('cave').statut === 'commande']);
    saisir(5);
    log.push(['bonne quantité envoyée (6)', m.client('cave').statut === 'envoyee']);
    clic('[data-a="ouvrir:bureau"]'); clic('[data-a="rappel:treille"]'); CL.step(700); saisir(3);
    clic('[data-a="ouvrir:bureau"]'); clic('[data-a="rappel:bar"]'); clic('[data-a="msg"]');
    CL.step(400); T.action('cmd:bar'); saisir(2);
    log.push(['3 commandes envoyées, on attend encore la tâche du règlement', m.nbEnvoyees === 3 && m.etape === 'journee']);
    clic('[data-a="ouvrir:bureau"]'); clic('[data-a="cheque"]'); CL.step(2);
    log.push(['règlement en retard ajouté à la tournée, on attend encore le prospect', m.retardataire.statut === 'attendu' && m.etape === 'journee']);
    clic('[data-a="prospect"]'); T.fermer(); CL.step(2);
    log.push(['prospect ajouté à la tournée (5 tâches du jour sur 5)', m.prospect.statut === 'attendu' && m.nbTaches === 5 && m.etape === 'journee']);
    log.push(['sur la palette, seulement les cartons des commandes signées', m.palette.every(p => p.groupe.visible === (m.client(p.client).statut === 'signee'))]);
    CL.step(1500);
    log.push(['3 commandes signées, leurs cartons sur la palette du chai', m.clients.every(c => c.statut === 'signee') && m.palette.every(p => p.groupe.visible)]);
    log.push(['signées, elles sont arrivées dans Vitisoft ; pas encore à facturer', (vs('commandes').match(/C-119[456]/g) || []).length === 3 && !vs('accueil').includes('Facturer')]);
    P.vue = 'accueil';
    // VEHICULE=van : la tournée en van au lieu du tracteur
    const genre = VEH;
    { const p = CL.vehicule(genre).p.pos; CL.teleporter(p.x + 2.4, p.z, 0); } // à côté du véhicule choisi
    CL.step(3); CL.agir(); CL.finirGeste();
    log.push(['monté dans ' + (genre === 'van' ? 'le van' : 'le tracteur'), CL.jeu.auVolant && CL.jeu.veh.genre === genre]);
    // garé là où la conduite assistée s'arrête : on descend, on charge la palette, on remonte (gestes.js)
    CL.teleporter(-83.4, -47.4, 2.83); CL.step(30);
    log.push(['chargement commencé (on descend du véhicule)', m.etape === 'chargement' && CL.jeu.gestes.actif]);
    CL.finirGeste(4000); CL.step(5);
    log.push(['chargement fait (' + CL.tr.charge + ' cartons), palette vide, de nouveau au volant, 5 arrêts prêts', m.etape === 'journee' && CL.tr.charge === 11 && m.palette.every(p => !p.groupe.visible) && CL.jeu.auVolant && m.arretsPrets.length === 5]);
    T.ouvrir('tournee');
    log.push(['tournée à 5 arrêts', document.querySelectorAll('#app .arret').length === 5]);
    clic('[data-a="tournee"]');
    log.push(['tournée lancée : 5 arrêts, d\'abord l\'épicerie', m.etape === 'livraisons' && m.tour.length === 5 && m.arretCourant === 'epicerie']);
    { const a = CL.jeu.lieux.arrets.epicerie; CL.teleporter(a.x - 3, a.z, Math.PI / 2); CL.step(30); }
    log.push(['à l\'épicerie, on descend chercher le chèque', CL.jeu.gestes.actif && m.attenteCheque]);
    { let pied = false; for (let n = 0; n < 3000 && CL.jeu.gestes.actif; n++) { CL.step(1); if (!CL.jeu.auVolant) pied = true; } CL.step(5);
      log.push(['chèque récupéré au comptoir, remonté au volant', pied && m.retardataire.statut === 'recupere' && m.arretCourant === 'cave' && CL.jeu.auVolant]); }
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
    log.push(['les clients ont rangé leurs cartons et sont rentrés dans leur boutique', CL.clients.liste.length === 5 && CL.clients.liste.every(f => f.etat === 'dedans' && !f.p.m.groupe.visible) && m.deposes.every(p => !p.visible)]);
    log.push(['pendant les gestes, le personnage ne traverse jamais un véhicule (' + CL.traversees + ' images)', CL.traversees === 0]);
    return log;
  }, process.env.VEHICULE || 'tracteur').catch(e => [['scénario interrompu : ' + e.message, false]]);
  for (const [msg, c] of r) ok(c, msg);
  await capture('fin');
}

if (scenario === 'souple') {
  // la journée à la carte : on va chercher le chèque seul ; on charge les deux commandes déjà signées et on part en tournée
  // avec elles ; on prend ensuite la troisième, on la charge (deuxième chargement, même véhicule) et on va la livrer seule ;
  // enfin le prospect, seul : tout est fait dehors, retour au bureau du chai
  const r = await ev(async VEH => {
    const q = s => document.querySelector(s), m = CL.mission, T = CL.jeu.tel, J = CL.jeu, L = J.lieux, log = [];
    const clic = s => { const e = q(s); if (!e) throw new Error('absent : ' + s + ' (appli ' + T.app + ', étape ' + m.etape + ')'); if (e.disabled) throw new Error('désactivé : ' + s); e.click(); };
    const saisir = n => { for (let i = 0; i < n; i++) clic('[data-a="qte:1"]'); clic('[data-a="signer"]'); };
    const geste = () => { for (let n = 0; n < 4000 && J.gestes.actif; n++) CL.step(1); CL.step(5); };
    const livrer = id => { const a = L.arrets[id]; CL.teleporter(a.x + 3, a.z, -Math.PI / 2); CL.step(30); CL.finirGeste(4000); CL.step(10); T.encre = 200; q('#bt-livrer').disabled = false; clic('#bt-livrer'); CL.step(10); CL.finirGeste(2000); CL.step(5); };
    const auChai = () => { CL.teleporter(-83.4, -47.4, 2.83); CL.step(30); geste(); };
    CL.jouer(); CL.step(260);
    q('#poche').click(); clic('[data-a="ouvrir:bureau"]'); clic('[data-a="cheque"]');
    clic('[data-a="ouvrir:tournee"]');
    log.push(['seul le chèque est prêt : tournée d\'un arrêt possible', m.arretsPrets.join() === 'epicerie' && !!q('[data-a="aller:epicerie"]')]);
    clic('[data-a="aller:epicerie"]');
    log.push(['en route pour l\'épicerie seule', m.etape === 'livraisons' && m.tour.join() === 'epicerie' && !T.ouvert]);
    { const p = CL.vehicule(VEH).p.pos; CL.teleporter(p.x + 2.4, p.z, 0); } CL.step(3); CL.agir(); CL.finirGeste();
    { const a = L.arrets.epicerie; CL.teleporter(a.x - 3, a.z, Math.PI / 2); CL.step(30); geste(); }
    log.push(['chèque récupéré, arrêt fini : retour à la journée', m.retardataire.statut === 'recupere' && m.etape === 'journee' && J.auVolant]);
    // deux commandes signées, la troisième pas encore prise
    T.ouvrir('bureau'); clic('[data-a="rappel:cave"]'); CL.step(900); saisir(6);
    clic('[data-a="ouvrir:bureau"]'); clic('[data-a="rappel:treille"]'); CL.step(700); saisir(3); T.fermer();
    CL.step(1500);
    log.push(['deux commandes signées, leurs piles sur la palette', m.client('cave').statut === 'signee' && m.client('treille').statut === 'signee' && m.palette.filter(p => p.groupe.visible).length === 3 && m.cible === L.chai]);
    auChai();
    log.push(['chargées toutes les deux (9 cartons), la troisième pas encore commandée', m.client('cave').statut === 'chargee' && m.client('treille').statut === 'chargee' && m.client('bar').statut === 'a_traiter' && CL.tr.charge === 9]);
    T.ouvrir('tournee');
    log.push(['tournée avec ce qui est signé : 2 arrêts prêts', m.arretsPrets.join() === 'cave,treille' && q('[data-a="tournee"]').textContent.includes('2 arrêts')]);
    clic('[data-a="tournee"]');
    livrer('cave');
    log.push(['livré chez cave, tournée continue vers La Treille', m.client('cave').statut === 'livree' && m.arretCourant === 'treille']);
    livrer('treille');
    log.push(['livré chez La Treille, tournée finie, retour à la journée', m.client('treille').statut === 'livree' && m.etape === 'journee' && J.auVolant]);
    // la troisième commande : message, réponse, saisie, signature ; deuxième chargement, dans les colonnes libres
    T.ouvrir('bureau'); clic('[data-a="rappel:bar"]'); clic('[data-a="msg"]'); CL.step(400); T.action('cmd:bar'); saisir(2); clic('[data-a="ouvrir:bureau"]'); clic('[data-a="prospect"]'); T.fermer();
    CL.step(1500);
    auChai();
    log.push(['deuxième chargement : le bar (2 cartons)', m.client('bar').statut === 'chargee' && CL.tr.charge === 2]);
    T.ouvrir('tournee'); clic('[data-a="aller:bar"]');
    log.push(['un seul arrêt : le bar', m.tour.join() === 'bar']);
    livrer('bar');
    log.push(['livré chez le bar', m.client('bar').statut === 'livree' && m.etape === 'journee']);
    T.ouvrir('tournee'); clic('[data-a="aller:auberge"]');
    { const a = L.arrets.auberge; CL.teleporter(a.x, a.z - 4, 0); CL.step(30); }
    CL.agir(); CL.finirGeste(); CL.step(5);
    { const f = L.figurants.auberge; J.joueur.placer(f.x - 1.6, f.z, Math.PI / 2); } CL.step(5); CL.agir();
    for (let n = 0; n < 2400 && m.prospect.statut !== 'a_rappeler'; n++) CL.step(1);
    log.push(['prospect rencontré : tout est fait dehors, retour au bureau du chai', m.prospect.statut === 'a_rappeler' && m.etape === 'retour' && m.cible === L.pc]);
    log.push(['11 cartons posés devant les clients, véhicule vide', m.deposes.reduce((s, p) => s + p.userData.n, 0) === 11 && CL.vehicule(VEH).m.cartons.every(c => !c.visible)]);
    log.push(['pendant les gestes, le personnage ne traverse jamais un véhicule (' + CL.traversees + ' images)', CL.traversees === 0]);
    return log;
  }, process.env.VEHICULE || 'tracteur').catch(e => [['scénario interrompu : ' + e.message, false]]);
  for (const [msg, c] of r) ok(c, msg);
}

if (scenario === 'aides') {
  // ce qui garantit qu'on finit : l'objectif juste à chaque instant, la relance du bureau, ce qui manque quand on s'arrête
  // chez un client pas prêt, le prospect qu'on quitte sans lui servir un verre (visite à refaire), le chèque déposé en
  // cours de journée, le bon de livraison qu'on retrouve en rouvrant le téléphone et dont la signature ne s'efface pas
  const r = await ev(async () => {
    const q = s => document.querySelector(s), m = CL.mission, T = CL.jeu.tel, J = CL.jeu, L = J.lieux, log = [];
    const clic = s => { const e = q(s); if (!e) throw new Error('absent : ' + s + ' (appli ' + T.app + ', étape ' + m.etape + ')'); if (e.disabled) throw new Error('désactivé : ' + s); e.click(); };
    const saisir = n => { for (let i = 0; i < n; i++) clic('[data-a="qte:1"]'); clic('[data-a="signer"]'); };
    const geste = () => { for (let n = 0; n < 4000 && J.gestes.actif; n++) CL.step(1); CL.step(5); };
    const objectif = () => q('#objectif').textContent;
    const dit = () => [J.hud.ligne, ...J.hud.file].filter(Boolean).map(l => l.txt).join(' ');
    const silence = () => { J.hud.vider(); CL.step(9 * 60); }; // les répliques en cours se taisent, l'aide peut revenir
    const auChai = () => { CL.teleporter(-83.4, -47.4, 2.83); CL.step(30); geste(); };
    const arret = id => { const a = L.arrets[id]; CL.teleporter(a.x + 3, a.z, -Math.PI / 2); CL.step(30); };
    const appeler = id => { clic(`[data-a="rappel:${id}"]`); for (let n = 0; n < 3000 && T.app === 'appel'; n++) CL.step(1); CL.step(2); };
    try {
    CL.jouer(); CL.step(260);
    log.push(['au départ : « Regardez votre téléphone », pastille sur le téléphone', objectif() === 'Regardez votre téléphone' && T.notif === 'bureau']);
    q('#poche').click(); T.fermer(); CL.step(60);
    log.push(['téléphone refermé sans rien faire : pas de relance tout de suite', !T.notif]);
    CL.step(8 * 60);
    log.push(['relance du bureau : 5 tâches du jour à traiter', T.notif === 'bureau' && m.message === '5 tâches du jour à traiter.']);
    // en tracteur au chai, rien de commandé
    { const p = CL.vehicule('tracteur').p.pos; CL.teleporter(p.x + 2.4, p.z, 0); } CL.step(3); CL.agir(); CL.finirGeste();
    silence(); auChai();
    log.push(['au chai sans commande : « Rien à charger »', dit().includes('Rien à charger') && m.etape === 'journee']);
    silence(); arret('cave');
    log.push(['arrêté devant la Cave du Pressoir sans commande : ce qui manque', dit().includes('pas encore commandé')]);
    silence(); { const a = L.arrets.epicerie; CL.teleporter(a.x - 3, a.z, Math.PI / 2); CL.step(30); }
    log.push(['devant l\'épicerie sans avoir ajouté le passage : ce qui manque', dit().includes('ajoutez d\'abord le passage') && m.retardataire.statut === 'a_planifier']);
    T.ouvrir('bureau'); clic('[data-a="cheque"]'); T.fermer(); CL.step(30);
    log.push(['passage ajouté sur place : on descend chercher le chèque', J.gestes.actif && m.attenteCheque]);
    geste();
    log.push(['chèque récupéré, remonté au volant', m.retardataire.statut === 'recupere' && J.auVolant]);
    // le prospect : on descend le voir ; on s'en va sans lui servir un verre, puis on revient à pied
    T.ouvrir('bureau'); clic('[data-a="prospect"]'); T.fermer();
    { const a = L.arrets.auberge; CL.teleporter(a.x, a.z - 4, 0); CL.step(30); }
    log.push(['chez le prospect, on descend le voir', m.prospect.statut === 'visite' && J.gestes.actif && m.cible === null]);
    geste();
    const f = L.figurants.auberge, jp = J.joueur.pos;
    log.push(['à pied devant lui, à portée de verre ; objectif : servez-lui un verre', !J.auVolant && Math.hypot(jp.x - f.x, jp.z - f.z) < 2.2 && objectif().includes('servez un verre')]);
    J.joueur.placer(f.x - 2, f.z - 30, 0); CL.step(5);
    log.push(['parti sans lui servir un verre : la visite est à refaire', m.prospect.statut === 'attendu' && m.arretsPrets.includes('auberge')]);
    J.joueur.placer(f.x - 3.6, f.z, Math.PI / 2); CL.step(5); geste();
    log.push(['revenu à pied : il nous accueille de nouveau', m.prospect.statut === 'visite' && !J.gestes.actif]);
    CL.agir();
    for (let n = 0; n < 2400 && m.prospect.statut !== 'a_rappeler'; n++) CL.step(1);
    log.push(['il goûte, la visite est notée ; pas de retour au volant (venu à pied)', m.prospect.statut === 'a_rappeler' && !J.auVolant && !J.gestes.actif]);
    // le chèque, déposé au bureau du chai en pleine journée ; le règlement saisi tout de suite dans Vitisoft
    const BU = L.bureau;
    J.joueur.placer(BU.dehors.x - 0.6, BU.dehors.z, Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
    J.joueur.placer(-72.6, -63.4, Math.PI / 2); CL.step(5); CL.agir(); CL.step(5);
    log.push(['chèque déposé en cours de journée', m.retardataire.statut === 'depose' && m.etape === 'journee']);
    CL.agir(); CL.finirGeste(); CL.step(5);
    log.push(['assis au portable : Vitisoft s\'ouvre (le règlement est à saisir)', J.pc.ouvert && J.pc.onglet === 'vitisoft']);
    clic('[data-a="vue:reglements"]'); clic('[data-a="regler"]');
    clic('[data-a="quitter"]'); CL.finirGeste(); CL.step(5);
    log.push(['règlement saisi ; levé du portable, la journée continue', m.retardataire.statut === 'saisi' && !J.pc.ouvert && m.etape === 'journee' && objectif().startsWith('Le bureau')]);
    J.joueur.placer(BU.dedans.x + 0.3, BU.dedans.z, -Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
    // la Cave du Pressoir : pendant la saisie, l'objectif donne la quantité ; commande signée puis chargée
    T.ouvrir('bureau'); appeler('cave');
    log.push(['pendant la saisie : « saisissez 6 cartons »', objectif().includes('saisissez 6 cartons')]);
    saisir(6); T.fermer(); CL.step(12 * 60);
    { const p = CL.vehicule('tracteur').p.pos; J.joueur.placer(p.x + 2.4, p.z, 0); } CL.step(3); CL.agir(); CL.finirGeste();
    auChai();
    log.push(['la cave chargée seule', m.client('cave').statut === 'chargee']);
    // La Treille : commande envoyée juste avant la livraison de la cave ; elle signe pendant qu'on fait signer le bon
    T.ouvrir('bureau'); appeler('treille'); saisir(3); T.fermer();
    arret('cave'); CL.finirGeste(4000); CL.step(10);
    log.push(['cartons posés, bon de livraison ouvert', T.ouvert && T.app === 'bl' && m.blPret]);
    T.fermer(); CL.step(5);
    log.push(['bon refermé sans signer : l\'objectif le rappelle', objectif() === 'Faites signer le bon de livraison à la Cave du Pressoir']);
    T.ouvrir('accueil'); T.fermer(); q('#poche').click();
    log.push(['le téléphone rouvert va droit au bon de livraison', T.ouvert && T.app === 'bl']);
    T.encre = 50;
    for (let n = 0; n < 900 && m.client('treille').statut === 'envoyee'; n++) CL.step(1);
    log.push(['La Treille signe pendant la signature du bon : rien ne s\'efface', m.client('treille').statut === 'signee' && T.app === 'bl' && T.encre === 50]);
    T.encre = 200; q('#bt-livrer').disabled = false; clic('#bt-livrer'); CL.step(10); CL.finirGeste(2000); CL.step(5);
    log.push(['livré chez la cave, de nouveau au volant', m.client('cave').statut === 'livree' && J.auVolant]);
    // le bar, puis le reste : tout fait dehors, le chèque déjà déposé : retour au bureau pour Vitisoft
    T.ouvrir('bureau'); clic('[data-a="rappel:bar"]'); clic('[data-a="msg"]'); T.fermer(); CL.step(400); T.ouvrir('bureau'); T.action('cmd:bar'); saisir(2); T.fermer();
    CL.step(15 * 60); auChai();
    log.push(['La Treille et le bar chargés', m.client('treille').statut === 'chargee' && m.client('bar').statut === 'chargee']);
    for (const id of ['bar', 'treille']) { arret(id); CL.finirGeste(4000); CL.step(10); T.encre = 200; q('#bt-livrer').disabled = false; clic('#bt-livrer'); CL.step(10); CL.finirGeste(2000); CL.step(5); }
    log.push(['tout est fait dehors, le chèque déjà déposé : « Vitisoft, sur le portable »', m.etape === 'retour' && objectif() === 'Rentrez au bureau du chai : Vitisoft, sur le portable' && m.cible === L.pc]);
    CL.teleporter(-81.4, -59.4, Math.PI); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
    J.joueur.placer(BU.dehors.x - 0.6, BU.dehors.z, Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
    log.push(['dans le bureau : « Asseyez-vous au portable »', J.dedans && objectif().startsWith('Asseyez-vous')]);
    J.joueur.placer(-72.6, -63.4, Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
    clic('[data-a="vue:commandes"]');
    for (const id of ['cave', 'bar', 'treille']) { clic(`[data-a="fac:${id}"]`); clic(`[data-a="env:${id}"]`); CL.step(80); }
    clic('[data-a="vue:drm"]'); clic('[data-a="drm"]'); CL.step(100);
    log.push(['tout est fait : « fermez Vitisoft »', m.toutFait && objectif() === 'Tout est fait : fermez Vitisoft']);
    clic('.vs-fin [data-a="fermer"]'); CL.step(560);
    log.push(['carte de fin', !q('#fin').hidden]);
    log.push(['pendant les gestes, le personnage ne traverse jamais un véhicule (' + CL.traversees + ' images)', CL.traversees === 0]);
    } catch (e) { log.push(['scénario interrompu : ' + e.message, false]); }
    return log;
  });
  for (const [msg, c] of r) ok(c, msg);
  await capture('fin');
}

if (scenario === 'voitures') {
  // les voitures des autres : un conducteur dans chacune ; sans le mode WTF, une voiture garée reste fermée ; plantée
  // devant elle, une voiture s'arrête et son conducteur nous la prête (il devient un passant), une autre la remplace au
  // loin ; une voiture ne charge pas de cartons au chai ; mode WTF : une voiture garée se vole, le passant qui voit venir la
  // voiture saute de côté, celui qui a le nez dans son téléphone s'aplatit puis se relève ; le conducteur d'une voiture
  // volée en tombe
  const r = await ev(async () => {
    const q = s => document.querySelector(s), m = CL.mission, T = CL.jeu.tel, J = CL.jeu, log = [];
    const clic = s => { const e = q(s); if (!e) throw new Error('absent : ' + s); e.click(); };
    const saisir = n => { for (let i = 0; i < n; i++) clic('[data-a="qte:1"]'); clic('[data-a="signer"]'); };
    const dit = () => [J.hud.ligne, ...J.hud.file].filter(Boolean).map(l => l.txt).join(' ');
    // de combien la tête (chapeau compris) d'un conducteur dépasse-t-elle sous le toit de sa voiture (négatif : elle passe)
    const depasse = (p, poste) => {
      const mesh = p.m.maillage, pos = mesh.geometry.attributes.position, par = p.m.groupe.parent, V = p.pos.clone();
      CL.scene.updateMatrixWorld(true);
      const inv = par.matrixWorld.clone().invert();
      let ex = -9;
      for (let i = 0; i < pos.count; i++) { V.fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, V); V.applyMatrix4(mesh.matrixWorld).applyMatrix4(inv); if (V.y > 1.1) ex = Math.max(ex, V.y - poste.plafond(V.z)); }
      return ex;
    };
    try {
      CL.jouer(); CL.step(60);
      log.push(['un conducteur dans chaque voiture de la départementale', CL.voitures().length === 4 && CL.voitures().every(v => v.conducteur)]);
      { const ex = CL.voitures().map(v => { const c = v.conducteur; c.m.groupe.visible = true; c.pos.set(v.x, 0, v.z); c.sync(1 / 60, 1); return depasse(c, v.mesh.userData.poste); });
        log.push(['la tête des conducteurs passe sous le toit (' + ex.map(e => (e * 100).toFixed(0)).join(', ') + ' cm)', ex.every(e => e < 0)]); }
      { const g = CL.GAREES[0]; J.joueur.placer(g.x + 2.2, g.z, -Math.PI / 2); CL.step(5); CL.agir(); CL.step(5); }
      log.push(['sans le mode WTF, une voiture garée reste fermée', !CL.voitureProche && !J.auVolant && !J.gestes.actif]);
      const v = CL.voitures().find(x => x.sens > 0);
      CL.teleporter(v.x + 30, v.zVoie, -Math.PI / 2);
      for (let i = 0; i < 900 && Math.abs(v.v) > 0.3; i++) CL.step(1);
      CL.step(30);
      log.push(['plantée devant elle, la voiture s\'arrête', Math.abs(v.v) < 0.3]);
      J.joueur.placer(v.x + 0.5, v.z - 2.3, Math.PI); CL.step(5);
      log.push(['à côté : « Emprunter la voiture »', CL.voitureProche === v && [...document.querySelectorAll('.etiquette.action')].some(e => e.textContent.startsWith('Emprunter la voiture'))]);
      const n0 = CL.gens.length;
      CL.agir(); CL.finirGeste(); CL.step(5);
      log.push(['empruntée : au volant, le conducteur est descendu, un passant de plus ; la portière refermée', J.auVolant && J.veh.genre === 'voiture' && CL.voitures().length === 3 && CL.gens.length === n0 + 1 && Math.abs(J.veh.m.porte.rotation.y) < 0.01]);
      { const ex = depasse(J.joueur, J.veh.poste); log.push(['au volant, la tête du personnage passe sous le toit (' + (ex * 100).toFixed(0) + ' cm)', ex < 0]); }
      CL.ctrl.ky = -1; CL.step(150); CL.ctrl.ky = 0;
      log.push(['elle roule (' + CL.tr.v.toFixed(1) + ' m/s)', CL.tr.v > 8]);
      CL.step(60 * 21);
      log.push(['une autre voiture la remplace sur la départementale', CL.voitures().length === 4 && CL.voitures().every(x => x.conducteur)]);
      // au chai en voiture, avec une commande signée sur la palette : rien ne se charge
      T.ouvrir('bureau'); clic('[data-a="rappel:cave"]'); for (let n = 0; n < 3000 && T.app === 'appel'; n++) CL.step(1); CL.step(2); saisir(6); T.fermer();
      CL.step(15 * 60); J.hud.vider(); CL.step(9 * 60);
      CL.teleporter(-83.4, -47.4, 2.83); CL.step(30);
      log.push(['au chai en voiture : rien ne se charge, l\'aide le dit', m.etape === 'journee' && m.client('cave').statut === 'signee' && dit().includes('Une voiture ne porte pas')]);
      CL.agir(); CL.finirGeste(); CL.step(5);
      // mode WTF : voler une voiture garée, aplatir un passant
      J.basculerWtf();
      const g = CL.GAREES[0], ng = CL.GAREES.length;
      J.joueur.placer(g.x + 2.2, g.z, -Math.PI / 2); CL.step(5);
      log.push(['mode WTF : la voiture garée se vole', CL.voitureProche === g]);
      CL.agir(); CL.finirGeste(); CL.step(5);
      log.push(['volée : au volant', J.auVolant && J.veh.genre === 'voiture' && CL.GAREES.length === ng - 1]);
      // un passant qui voit venir la voiture saute de côté ; celui qui a le nez dans son téléphone se fait aplatir
      const E = CL.gens[1];
      CL.teleporter(-100, -47, Math.PI / 2); CL.step(3); E.attente = 99; E.p.placer(-91, -47, 0);
      let saute = false; CL.ctrl.ky = -1; for (let n = 0; n < 150; n++) { CL.step(1); if (E.p.sautT > 0) saute = true; } CL.ctrl.ky = 0; CL.step(60);
      log.push(['mode WTF : le passant qui la voit venir saute de côté', saute]);
      const G = CL.gens[0];
      CL.teleporter(-100, -47, Math.PI / 2); CL.step(3); G.attente = 99; G.p.telephone = true; G.p.placer(-91, -47, 0); CL.step(40); // dans la cour : pas de circulation
      CL.ctrl.ky = -1; for (let n = 0; n < 300 && G.ecrase <= 0; n++) CL.step(1); CL.ctrl.ky = 0; CL.step(10);
      log.push(['le nez dans son téléphone, il est aplati comme une crêpe', G.ecrase > 0 && G.p.m.groupe.scale.y < 0.3]);
      CL.step(200);
      log.push(['il s\'est relevé', G.ecrase <= 0 && Math.abs(G.p.m.groupe.scale.y - G.p.m.echelle) < 0.01]);
      // voler une voiture qui roule : son conducteur tombe de la voiture, se relève et s'enfuit
      CL.agir(); CL.finirGeste(); CL.step(5); G.p.telephone = false;
      CL.step(60 * 21);
      const w = CL.voitures().find(x => x.sens > 0);
      CL.teleporter(w.x + 30, w.zVoie, -Math.PI / 2);
      for (let i = 0; i < 900 && Math.abs(w.v) > 0.3; i++) CL.step(1);
      CL.step(30); J.joueur.placer(w.x + 0.5, w.z - 2.3, Math.PI); CL.step(5);
      const d = w.conducteur, nv = CL.gens.length;
      CL.agir(); let couche = 0, ecart = null;
      for (let n = 0; n < 900 && J.gestes.actif; n++) {
        CL.step(1); couche = Math.min(couche, d.m.groupe.rotation.x);
        // quand il commence à tomber, où en est le personnage ? (devant la portière, qu'il a ouverte)
        if (ecart === null && d.m.groupe.rotation.x < -0.2) { const v = J.veh, c = v.m.montee.chemin[0], h = v.p.h, x = v.p.pos.x + c[0] * Math.cos(h) + c[2] * Math.sin(h), z = v.p.pos.z - c[0] * Math.sin(h) + c[2] * Math.cos(h); ecart = Math.hypot(J.joueur.pos.x - x, J.joueur.pos.z - z); }
      }
      CL.step(120);
      log.push(['volée : il ne tombe qu\'une fois le personnage à sa portière (' + (ecart ?? -1).toFixed(2) + ' m)', ecart !== null && ecart < 0.3]);
      log.push(['volée : son conducteur est tombé (' + couche.toFixed(2) + '), s\'est relevé, s\'enfuit', J.auVolant && couche < -1.2 && CL.gens.length === nv + 1 && Math.abs(d.m.groupe.rotation.x) < 0.01]);
      log.push(['pendant les gestes, le personnage ne traverse jamais un véhicule (' + CL.traversees + ' images)', CL.traversees === 0]);
    } catch (e) { log.push(['scénario interrompu : ' + e.message, false]); }
    return log;
  });
  for (const [msg, c] of r) ok(c, msg);
  await capture('fin');
}

if (scenario === 'nuit') {
  // au clavier, les flèches font marcher et Maj courir ; la nuit tombe avec l'heure ; devant la maison du domaine, on rentre
  // dormir et l'on ressort au matin
  const r = await ev(async () => {
    const J = CL.jeu, log = [], nuit = () => CL.monde.ciel.userData.dome.material.uniforms.uNuit.value;
    const touche = (type, code, key = code) => dispatchEvent(new KeyboardEvent(type, { code, key }));
    try {
      CL.jouer(); CL.step(60);
      CL.teleporter(-99, -50, 0); CL.step(5);
      touche('keydown', 'ArrowUp'); CL.step(90);
      const marche = CL.joueur.v;
      touche('keydown', 'ShiftLeft', 'Shift'); CL.step(60);
      const course = CL.joueur.v;
      touche('keyup', 'ShiftLeft', 'Shift'); touche('keyup', 'ArrowUp'); CL.step(30);
      log.push(['au clavier : la flèche fait marcher (' + marche.toFixed(1) + ' m/s), Maj courir (' + course.toFixed(1) + ' m/s)', Math.abs(marche - 1.6) < 0.15 && course > 5]);
      log.push(['17 h 40 : la lumière dorée', nuit() === 0]);
      J.minutes = 19 * 60 + 15; CL.step(5);
      log.push(['19 h 15 : le soir tombe (' + nuit().toFixed(2) + ')', nuit() > 0.3 && nuit() < 0.9]);
      J.minutes = 21 * 60; CL.step(5);
      const f = CL.scene.fog.color;
      log.push(['21 h : la nuit, la brume bleu nuit', nuit() === 1 && f.b > f.r && f.r < 0.1]);
      const tr = CL.vehicule('tracteur');
      log.push(['la nuit, les voitures roulent phares allumés ; le tracteur garé, éteint', CL.voitures().every(v => v.mesh.userData.phares.groupe.visible && v.mesh.userData.phares.flaque.visible) && !tr.m.phares.groupe.visible]);
      { const p = tr.p.pos; CL.teleporter(p.x + 2.4, p.z, 0); } CL.step(3); CL.agir(); CL.finirGeste(); CL.step(3);
      log.push(['au volant du tracteur, ses phares s\'allument', J.auVolant && tr.m.phares.groupe.visible && tr.m.phares.flaque.visible]);
      CL.agir(); CL.finirGeste(); CL.step(3);
      log.push(['descendu, ils s\'éteignent', !J.auVolant && !tr.m.phares.groupe.visible]);
      CL.teleporter(-100, -56.8, Math.PI); CL.step(20);
      log.push(['devant la maison : « Rentrer dormir »', [...document.querySelectorAll('.etiquette.action')].some(e => !e.hidden && e.textContent.startsWith('Rentrer dormir'))]);
      CL.agir(); CL.finirGeste(); CL.step(5);
      log.push(['on ressort au matin, 7 h, le lendemain', J.heureTxt === '07:00' && J.minutes >= 1440 + 420 && !J.gestes.actif]);
      J.minutes += 40; CL.step(5);
      log.push(['7 h 40 : le jour est revenu, phares éteints', nuit() === 0 && CL.voitures().every(v => !v.mesh.userData.phares.groupe.visible)]);
    } catch (e) { log.push(['scénario interrompu : ' + e.message, false]); }
    return log;
  });
  for (const [msg, c] of r) ok(c, msg);
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
      if (m.etape === 'journee' && m.arretsPrets.length && !m.aCharger.length && !J.gestes.actif && !T.ouvert) { T.ouvrir('tournee'); q('[data-a="tournee"]').click(); }
      if (m.etape === 'retour' && J.distance(J.lieux.pc) < 6.5 && Math.abs(CL.tr.v) < 0.5) break;
      CL.step(1); t += 1 / 60;
      if (J.gestes.actif && CL.dansVehicule()) CL.traversees++;
      if (CL.tr.chocVu > 0.15) chocs++;
      if (Math.abs(CL.tr.v) < 0.25 && !T.ouvert && !m.attenteBL && !m.attenteCheque && m.etape !== 'chargement') arret += 1 / 60; else arret = 0;
      if (arret > 15) { bloque = true; break; }
    }
    C.id = null;
    log.push(['tournée complète en conduite assistée (' + VEH + ', ' + Math.round(t) + ' s de jeu)', !bloque && m.clients.every(c => c.statut === 'livree') && m.retardataire.statut === 'recupere' && J.distance(J.lieux.pc) < 6.5]);
    log.push(['aucun choc en route (' + chocs + ')', chocs === 0]);
    log.push(['le personnage ne traverse jamais un véhicule (' + CL.traversees + ' images)', CL.traversees === 0]);
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
