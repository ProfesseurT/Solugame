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
//   chateau   la route du château : monter en tracteur et en van, le tour, retenu au bord, à pied sur la pente ; la glisse
//   sauvegarde la partie enregistrée puis reprise (« Continuer »), une mission gagnée rejouée depuis le téléphone,
//             la mission 2 reprise
//   traitement la mission 2 : rentrer dormir, le lendemain, la bouillie, trois parcelles au guidage, le Registre phyto
//             (refus, enregistrement, sans réseau puis envoyé), la carte de fin
//   habillage la mission 3 : rentrer dormir après le traitement, l'échantillon dans un palox, atteler la remorque (pas en
//             van), le labo en conduite assistée, la fiche Viticode (refus, énergie, test, langue), le QR code
//             personnalisé et envoyé, le BAT, l'imprimerie, dételer, les palox au chariot, le SMS, la carte de fin
//   fermeture la nuit, les professionnels fermés : les clients rentrent à 19 h 30, ce qui se fait seul se fait encore,
//             rentrer dormir, la tournée reprend le matin et se finit, les dates suivent (missions 2 et 3), pas d'appel
//             la nuit, le labo, Marc et l'imprimerie fermés (mission 3), la partie reprise le lendemain
//   aides     les cas limites qui doivent toujours finir : objectif juste, relance du bureau, aides devant un client pas
//             prêt, prospect quitté sans verre, chèque déposé en cours de journée, bon de livraison rouvert
//   conduite  toute la tournée en conduite assistée au doigt (VEHICULE=van : en van)
//   chien     le chien du domaine : il se balade dans la cour ; un véhicule lancé sur lui (couché, debout, assis ; tracteur,
//             van, marche arrière, mené par un geste ; mode WTF aussi) : il fuit, jamais dans l'emprise ; on le caresse ; le
//             soir il rentre, la nuit il est dedans, le matin il ressort ; il ne gêne pas le tracteur sur le chemin du hangar
//   perf      mesure le coût d'une image à plusieurs endroits du monde (et le rythme réel sur 3 s)
//   diversite tout le monde créé, ses traits comptés : teints du très clair au très foncé, toutes les coiffures, foulards,
//             femmes une fois sur deux, jeunes et aînés (voûtés, cannes), barbes, manteaux, doudounes, écharpes,
//             couvre-chefs ; triangles par personnage sous un plafond ; une apparence d'enfant ; visages au soleil, la place
//   velos     les cyclistes : ils roulent sur leurs chemins, les pieds sur les pédales, une voiture ralentit derrière un
//             cycliste et le double de loin, bloqué par le joueur il sonne, met pied à terre et le contourne, un véhicule
//             lancé sur lui (mode WTF compris) : il s'écarte ou saute, jamais touché, et repart ; la conduite assistée le
//             double sans choc ; les vélos garés ; le phare la nuit
//   solumatic les bureaux de Solumatic : les horaires (la nuit personne et la porte fermée, Romane seule qui fume devant
//             l'entrée à 7 h 54 : elle a la clé, la porte s'ouvre, plus de « fermé » à l'écran ; tout le monde à son poste à
//             10 h, Vanessa les jours pairs, les derniers qui partent le soir), entrer (l'extérieur retiré, la caméra sous le
//             plafond), les 21 et Vanessa à leur pièce, leurs noms, les casques des deux plateaux, l'écran de qui n'est pas là
//             éteint, quelqu'un qui part au café et revient se rasseoir (de près : se lever et s'asseoir en 0,6 s, sans saut),
//             le baby-foot, chaque pièce atteignable à pied, la nuit le bureau vide éteint (lampes, écrans, télés), la caméra
//             devant une plante d'angle, ressortir ; captures de chaque pièce (de jour, le soir), de Romane qui fume
//   photo     captures en jeu à des endroits fixes (domaine, route, bourg, place, personnage de près)
//   restaurateurs les restaurateurs du coin : rien avant d'aller les voir, « Présenter nos vins », la dégustation, le bureau,
//             la relance (jamais pendant un appel de mission), l'appel, une commande signée, une autre pas, la sauvegarde
//   ecole     l'école des Tilleuls : on n'y entre jamais (à pied, en tracteur, mode WTF), la récréation, la classe, la nuit,
//             le mercredi, la sortie de 16 h 30 (portail, parents), aucune étiquette, des enfants divers, ce qu'elle coûte
//   abords    les abords de Solumatic : le tour du bâtiment par la route (voiture empruntée, van, tracteur : sur sa file,
//             sans choc, revenu au départ), à pied ; la clôture arrête ; la grille ouverte ; la route dans le réseau ; la porte
//             d'entrée proposée ; la place où Romane fume ; aucune voiture garée sur la route ; la devanture dans l'ordre
//             voulu (baie, fenêtres, bâche, fenêtres) ; les lumières la nuit ; captures (devanture, trois quarts, route, dessus,
//             nuit)
//   velo      le vélo du joueur : prendre un vélo garé, le chèque à vélo, pédaler, tourner, freiner, descendre, le reprendre,
//             un vélo couché poussé par le van, la conduite assistée pas bloquée, emprunter le vélo d'un cycliste, la nuit
//   ordinateur Viticode et le Registre phyto sur le portable du bureau du chai : quatre icônes, la mission 1 (annonces),
//             une parcelle notée depuis l'ordinateur (mission 2), la fiche Viticode jusqu'à l'imprimerie (mission 3)
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
  executablePath: CHROME, headless: 'new', protocolTimeout: 600000, // (une mission entière se joue en un appel : sous la charge des bancs en parallèle, plus de 3 min)
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`],
  defaultViewport: { width: W, height: H, deviceScaleFactor: W < 600 ? 2 : 1, isMobile: W < 600, hasTouch: W < 600 },
});
const page = await navigateur.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
// (l'environnement, pas le jeu : une police de Google Fonts qui ne charge pas faute de réseau, le périphérique audio de la
// machine qui décroche quand dix navigateurs tournent ensemble ; le jeu marche sans les deux)
const HORS_JEU = /Failed to load resource: net::ERR_|AudioContext encountered an error from the audio device/;
page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !HORS_JEU.test(m.text())) erreurs.push(m.type() + ': ' + m.text()); });
const LENT = Number(process.env.LENT || 1);
if (LENT > 1) await page.emulateCPUThrottling(LENT);
await page.goto('file://' + join(root, 'index.html') + (process.env.QUALITE ? '?qualite=' + process.env.QUALITE : ''), { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.CL, { timeout: 180000 }); // (sous la charge des bancs en parallèle, le démarrage peut dépasser une minute)
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
    // le parvis du chai vit : le rinceur arrose la barrique, la porteuse range les caisses de la remorque
    { const P = CL.parvis, k0 = P.k; CL.step(60 * 25); log.push(['le parvis vit : le jet sur la barrique, ' + (P.k - k0) + ' caisses rangées en 25 s', P.ri.surB > 0.3 && P.k > k0 && P.k - k0 <= 4 && P.chien.g.visible]); }
    // pas d'anachronisme : avant tout appel, ni commande dans le bureau, ni dans Vitisoft ; rien à facturer, rien à encaisser
    const P = CL.jeu.pc, vs = vue => { P.lancer('vitisoft'); P.vue = vue; P.afficher(); return q('#pc-ecran .vs').textContent; };
    log.push(['au départ, Vitisoft n\'a aucune commande, rien à facturer ni à encaisser', vs('commandes').includes('Aucune commande arrivée') && !vs('accueil').includes('Facturer') && !vs('accueil').includes('Saisir le règlement') && !q('#pc-ecran [data-a="regler"]')]);
    P.ouvertes = []; P.fenetre = null;
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
    // si la tournée a débordé sur la nuit (19 h 30 : l'Auberge du Moulin ferme ; outils.js, HORAIRES), l'objectif propose
    // ce qui se fait seul ou de rentrer dormir : on dort, la tournée reprend le lendemain matin
    if (m.fermes) {
      log.push([`${CL.jeu.heureTxt} : l'Auberge du Moulin est fermée, l'objectif le dit`, q('#objectif').textContent.startsWith('Il fait nuit')]);
      CL.agir(); CL.finirGeste(); CL.dormir(); CL.remonter(genre);
      log.push(['le lendemain matin, de nouveau au volant, la tournée reprend : l\'Auberge du Moulin', CL.jeu.heureTxt.startsWith('07') && CL.jeu.auVolant && m.arretCourant === 'auberge']);
    }
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
    log.push(['assis au portable : le bureau de l\'ordinateur, l\'icône Vitisoft à ouvrir, l\'objectif au-dessus', CL.jeu.pc.ouvert && CL.jeu.pc.fenetre === null && !!q('.pc-ico.conseil[data-a="lancer:vitisoft"]') && q('#pc-obj').textContent.startsWith('Vitisoft') && CL.joueur.assis]);
    clic('[data-a="lancer:bureau"]');
    log.push(['le bureau aussi, dans le navigateur', !!q('#pc .pt-bureau .onglets') && !!q('#pc [data-a="ouvrir:tournee"]')]);
    clic('[data-a="lancer:vitisoft"]');
    log.push(['Vitisoft : le tableau de bord, une facture à l\'échéance dépassée', !!q('#pc .vs .vs-tu.rouge') && q('#pc .vs-tu.rouge b').textContent === '1']);
    clic('[data-a="vue:factures"]'); clic('[data-a="ouvrirReg"]'); clic('[data-a="regler"]');
    log.push(['règlement saisi dans Vitisoft', m.retardataire.statut === 'saisi']);
    clic('[data-a="vue:commandes"]');
    for (const id of ['cave', 'bar', 'treille']) { clic(`[data-a="fac:${id}"]`); clic(`[data-a="env:${id}"]`); CL.step(80); }
    log.push(['3 factures transmises (' + CL.jeu.ventes + ' €)', m.toutTransmis && Math.abs(CL.jeu.ventes - 640.2) < 0.01]);
    clic('[data-a="fermerF:vitisoft"]');
    log.push(['Vitisoft fermé avant la DRM : la mission continue', m.etape === 'pc' && CL.jeu.pc.ouvert && CL.jeu.pc.fenetre !== 'vitisoft']);
    clic('[data-a="lancer:vitisoft"]'); clic('[data-a="vue:drm"]'); clic('[data-a="drm"]'); CL.step(100);
    log.push(['DRM du mois dernier calculée, le pense-bête coché', m.drm === 'faite' && q('.pc-note').querySelectorAll('span.ok').length === 3]);
    clic('[data-a="fermerF:vitisoft"]'); CL.step(560);
    log.push(['carte de fin ; la mission 1 est enregistrée comme gagnée', !q('#fin').hidden && CL.SAUVE.gagnees.tournee === true]);
    // le soir : les ouvriers du parvis sont partis pendant la tournée, les moineaux dorment
    { const P = CL.parvis, h = CL.jeu.minutes % 1440; log.push(['le soir (' + Math.floor(h / 60) + ' h), le parvis est calme : ouvriers partis, moineaux couchés', h < 1110 || (P.ouvriers.every(o => !o.present && !o.p.m.groupe.visible) && P.oiseaux.count === 0)]); }
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
    // si la journée a débordé sur la nuit (19 h 30 : les clients ferment ; outils.js, HORAIRES) avant un arrêt qu'on va
    // faire seul : l'écran Tournée le dit (pas de « Y aller »), on rentre dormir, et l'arrêt se fait le lendemain matin
    const nuitTombee = (id, ferme) => {
      if (!m.fermes) return;
      T.ouvrir('tournee');
      log.push([`${J.heureTxt} : ${ferme}, l'écran Tournée le dit (pas de « Y aller ») ; on rentre dormir`, !q(`[data-a="aller:${id}"]`) && q('#app').textContent.includes('Fermé') && q('#app .consigne').textContent.includes('demain matin')]);
      T.fermer(); CL.agir(); CL.finirGeste(); CL.dormir(); CL.remonter(VEH);
      log.push(['le lendemain, 7 h : de nouveau au volant, l\'arrêt à faire', J.heureTxt.startsWith('07') && J.minutes > 1440 && J.auVolant && m.arretsPrets.includes(id)]);
    };
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
    nuitTombee('bar', 'le Bar Le Cep est fermé');
    T.ouvrir('tournee'); clic('[data-a="aller:bar"]');
    log.push(['un seul arrêt : le bar', m.tour.join() === 'bar']);
    livrer('bar');
    log.push(['livré chez le bar', m.client('bar').statut === 'livree' && m.etape === 'journee']);
    // le prospect, seul (la nuit tombée : on dort d'abord)
    nuitTombee('auberge', 'l\'Auberge du Moulin est fermée');
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
    log.push(['assis au portable : l\'icône Vitisoft à ouvrir (le règlement est à saisir)', J.pc.ouvert && !!q('.pc-ico.conseil[data-a="lancer:vitisoft"]')]);
    clic('[data-a="lancer:vitisoft"]'); clic('[data-a="vue:factures"]'); clic('[data-a="ouvrirReg"]'); clic('[data-a="regler"]');
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
    // la journée a débordé sur la nuit (19 h 30 : les clients ferment ; outils.js, HORAIRES) : arrêté devant le bar, on dit
    // qu'il est fermé et rien ne se livre ; l'objectif propose d'abord ce qui se fait seul (Vitisoft) ; on rentre dormir ; le
    // lendemain, le bureau dit ce qui reste, et l'on livre
    if (m.fermes) {
      silence(); arret('bar'); CL.step(30);
      log.push([`${J.heureTxt}, le bar est fermé : on le dit, rien ne se livre ; l'objectif propose Vitisoft, au bureau du chai`, dit().includes('Le Bar Le Cep est fermé à cette heure-ci') && !J.gestes.actif && m.client('bar').statut === 'chargee'
        && objectif().startsWith('Il fait nuit, les clients sont fermés : au bureau du chai, Vitisoft') && m.cible === L.pc]);
      CL.agir(); CL.finirGeste(); CL.dormir();
      log.push(['rentré dormir : 7 h, le bureau dit ce qui reste (' + m.resume + ')', J.heureTxt === '07:00' && m.resume === 'Ce matin : 2 livraisons.' && T.notif === 'bureau']);
      CL.remonter('tracteur');
    }
    for (const id of ['bar', 'treille']) { arret(id); CL.finirGeste(4000); CL.step(10); T.encre = 200; q('#bt-livrer').disabled = false; clic('#bt-livrer'); CL.step(10); CL.finirGeste(2000); CL.step(5); }
    log.push(['tout est fait dehors, le chèque déjà déposé : « Vitisoft, sur le portable »', m.etape === 'retour' && objectif() === 'Rentrez au bureau du chai : Vitisoft, sur le portable' && m.cible === L.pc]);
    CL.teleporter(-81.4, -59.4, Math.PI); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
    J.joueur.placer(BU.dehors.x - 0.6, BU.dehors.z, Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
    log.push(['dans le bureau : « Asseyez-vous au portable »', J.dedans && objectif().startsWith('Asseyez-vous')]);
    J.joueur.placer(-72.6, -63.4, Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
    clic('[data-a="lancer:vitisoft"]'); clic('[data-a="vue:commandes"]');
    for (const id of ['cave', 'bar', 'treille']) { clic(`[data-a="fac:${id}"]`); clic(`[data-a="env:${id}"]`); CL.step(80); }
    clic('[data-a="vue:drm"]'); clic('[data-a="drm"]'); CL.step(100);
    log.push(['tout est fait : « fermez Vitisoft »', m.toutFait && objectif() === 'Tout est fait : fermez Vitisoft']);
    clic('[data-a="fermerF:vitisoft"]'); CL.step(560);
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
      // aucune voiture garée ne mord sur un bâtiment (Teddy, 26/11/2026 : celle du hameau était encastrée dans une maison) :
      // quinze points de son emprise, testés comme la caméra teste les murs
      { const dans = CL.GAREES.filter(g => { const co = Math.cos(g.h), si = Math.sin(g.h); return [-0.85, 0, 0.85].some(lx => [-1.9, -1, 0, 1, 1.9].some(lz => CL.col.dedans(g.x + lx * co + lz * si, g.z + lz * co - lx * si))); });
        log.push([`aucune des ${CL.GAREES.length} voitures garées n'est dans un bâtiment` + (dans.length ? ` (${dans.map(g => g.x.toFixed(1) + ', ' + g.z.toFixed(1)).join(' ; ')})` : ''), CL.GAREES.length >= 16 && !dans.length]); }
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
      // (la course traverse la cour vers l'est, entre l'arbre et le muret)
      const E = CL.gens[1];
      CL.teleporter(-104, -40, Math.PI / 2); CL.step(3); E.attente = 99; E.p.placer(-95, -40, 0); // (au sud de l'arbre de la cour)
      // qu'il ne sorte pas son téléphone en attendant (un tirage au hasard) : il doit voir venir la voiture
      { const A = E.p.anim; A.repos = 0; A.envie = 0; A.tEnvie = 99; A.wTel = 0; E.p.telephone = false; }
      let saute = false; CL.ctrl.ky = -1; for (let n = 0; n < 150; n++) { CL.step(1); if (E.p.sautT > 0) saute = true; } CL.ctrl.ky = 0; CL.step(60);
      log.push(['mode WTF : le passant qui la voit venir saute de côté', saute]);
      const G = CL.gens[0];
      CL.teleporter(-104, -40, Math.PI / 2); CL.step(3); G.attente = 99; G.p.telephone = true; G.p.placer(-95, -40, 0); CL.step(40); // dans la cour : pas de circulation
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
        if (ecart === null && d.m.groupe.rotation.x < -0.2) { const v = J.veh, c = v.m.appuis.depart.corps, h = v.p.h, x = v.p.pos.x + c[0] * Math.cos(h) + c[2] * Math.sin(h), z = v.p.pos.z - c[0] * Math.sin(h) + c[2] * Math.cos(h); ecart = Math.hypot(J.joueur.pos.x - x, J.joueur.pos.z - z); }
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

if (scenario === 'chateau') {
  // le village du château qui vit ; la route du château (relief.js) : en tracteur puis en van, on monte jusqu'au tour sans quitter la chaussée, le
  // véhicule posé sur le sol, la caméra jamais sous le relief ; on fait le tour du château ; hors de la route, on est
  // retenu ; à pied, les pieds sur la pente ; en voiture, une glisse se tient à l'accélérateur et au volant
  const r = await ev(async () => {
    const J = CL.jeu, R = CL.relief.ROUTE, sol = CL.relief.sol, C = CL.relief.CHATEAU, log = [];
    const angleDe = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    const monter = genre => {
      const v = CL.vehicule(genre);
      for (let k = 0; k < 40 && !(J.auVolant && J.veh === v); k++) {
        const a = k * 0.5; J.joueur.placer(v.p.pos.x + Math.cos(a) * 2.6, v.p.pos.z + Math.sin(a) * 2.6, 0); CL.step(2);
        CL.agir(); CL.finirGeste(); CL.step(2);
      }
      return J.auVolant && J.veh === v;
    };
    const descendre = () => { CL.ctrl.kx = 0; CL.ctrl.ky = 1; for (let k = 0; k < 600 && Math.abs(CL.tr.v) > 0.3; k++) CL.step(1); CL.ctrl.ky = 0; CL.step(30); CL.agir(); CL.finirGeste(); CL.step(5); return !J.auVolant; };
    // suivre des points (x, z) de près : 9 m devant, à vmax au plus ; m : mesures
    const suivre = (P, vmax, maxT, m) => {
      let i = 0, T = 0;
      while (T < maxT) {
        const p = CL.tr.pos;
        let best = i, bd = 1e9;
        for (let k = Math.max(0, i - 5); k < Math.min(P.length, i + 40); k++) { const d = Math.hypot(P[k][0] - p.x, P[k][1] - p.z); if (d < bd) { bd = d; best = k; } }
        i = best;
        if (i >= P.length - 12) return true;
        const t = P[Math.min(P.length - 1, i + 9)], err = angleDe(Math.atan2(t[0] - p.x, t[1] - p.z) - CL.tr.h);
        CL.ctrl.kx = -Math.max(-1, Math.min(1, err * 2.5)); CL.ctrl.ky = CL.tr.v < vmax ? -1 : 0;
        CL.step(1); T += 1 / 60;
        m.sol = Math.max(m.sol, Math.abs(CL.tr.pos.y - sol(p.x, p.z)));
        if (CL.camera.position.y < sol(CL.camera.position.x, CL.camera.position.z) + 0.4) m.cam++;
        if (CL.tr.frotte > 0.5) m.chocs++;
        m.ecart = Math.max(m.ecart, bd);
        if (T > 3 && R.y[Math.min(R.n - 1, i)] > 3) m.vmin = Math.min(m.vmin, CL.tr.v);
      }
      return false;
    };
    const route = Array.from({ length: R.n }, (_, k) => [R.x[k], R.z[k]]);
    try {
      CL.jouer(); CL.step(30);
      // le village du château vit (village.js) : trois terrasses, des voitures garées sur le trottoir, à la hauteur du
      // plateau ; de près, ceux qui y déjeunent, les serveurs, les touristes (ils bougent, prennent des photos), le
      // belvédère ; deux voitures qui montent, s'arrêtent devant le joueur (on peut l'emprunter), repartent, s'allument
      // la nuit
      {
        const V = CL.village, LC = J.lieux.chateau, G = () => V.gens, n = k => G().filter(g => g.genre === k).length;
        log.push(['le village : trois terrasses (' + LC.restos.map(q => q.places.length).join(', ') + ' places), ' + LC.garees.length + ' voitures garées sur le trottoir, sur le plateau',
          LC.restos.length === 3 && LC.restos.every(q => q.places.length >= 8 && q.tables.length >= 4) && LC.garees.length >= 4 && LC.garees.every(g => Math.abs(g[4] - C.y) < 0.2) && CL.GAREES.filter(g => g.m.position.y > C.y - 0.5).length === LC.garees.length]);
        J.minutes = 13 * 60; J.joueur.placer(C.x, C.z - 24, 0); CL.step(60 * 2);
        const avant = G().filter(g => g.genre === 'touriste').map(g => [g.p.pos.x, g.p.pos.z]);
        let servi = 0, photo = 0;
        for (let k = 0; k < 100; k++) { CL.step(15); if (G().some(g => g.genre === 'serveur' && g.etat === 'sert')) servi++; if (G().some(g => g.genre === 'touriste' && g.p.telephone)) photo++; }
        const bouge = G().filter(g => g.genre === 'touriste').filter((g, i) => Math.hypot(g.p.pos.x - avant[i][0], g.p.pos.z - avant[i][1]) > 1).length;
        log.push(['de près, le village vit : ' + n('table') + ' attablés, ' + n('serveur') + ' serveurs (à une table ' + servi + ' fois sur 100), ' + n('touriste') + ' touristes (' + bouge + ' ont bougé ; une photo ' + photo + ' fois sur 100), ' + (n('banc') + n('balustrade')) + ' au belvédère',
          n('table') >= 12 && n('serveur') === 3 && n('touriste') >= 12 && bouge >= 8 && servi > 5 && photo > 5 && n('banc') + n('balustrade') === 4]);
        const v = V.voitures[0], s0 = v.s;
        CL.step(60 * 10);
        const roule = v.s - s0, i = Math.min(v.C.n - 1, Math.floor(v.s) + 14);
        J.joueur.placer(v.C.X[i], v.C.Z[i], 0); CL.step(60 * 5);
        const d = Math.hypot(J.joueur.pos.x - v.x, J.joueur.pos.z - v.z), arret = v.v < 0.3, klaxon = v.klaxon;
        // (l'étiquette, ou ce que le jeu proposerait : un touriste tout près fait passer « Servir un verre » devant)
        const emprunte = CL.voitureProche === v || [...document.querySelectorAll('.etiquette.action')].some(e => !e.hidden && e.textContent.startsWith('Emprunter la voiture'));
        J.joueur.placer(C.x, C.z - 24, 0); CL.step(60 * 4);
        log.push(['une voiture monte au château (' + roule.toFixed(0) + ' m en 10 s) ; devant le joueur, elle s\'arrête (à ' + d.toFixed(1) + ' m) et klaxonne, on peut l\'emprunter (' + [arret, klaxon, emprunte].join(' ') + ') ; elle repart (' + v.v.toFixed(1) + ' m/s)', roule > 40 && arret && d > 2.5 && klaxon && emprunte && v.v > 1.5]);
        J.minutes = 21 * 60; CL.step(10);
        log.push(['la nuit, les voitures du château roulent phares allumés', V.voitures.length === 2 && V.voitures.every(w => w.mesh.userData.phares.groupe.visible)]);
        J.minutes = 13 * 60; CL.step(5);
        for (const w of [...V.voitures]) { w.mesh.visible = false; V.retirer(w); } // (les essais de la route qui suivent : la route libre)
      }
      for (const genre of ['tracteur', 'van']) {
        if (!monter(genre)) { log.push([genre + ' : monté', false]); continue; }
        CL.teleporter(-176, 2, Math.PI); CL.step(20);
        const m = { sol: 0, cam: 0, chocs: 0, ecart: 0, vmin: 99 };
        const ok = suivre(route, genre === 'tracteur' ? 12 : 16, 120, m);
        log.push([genre + ' : monté au château (' + CL.tr.pos.y.toFixed(1) + ' m), sur la chaussée (écart ' + m.ecart.toFixed(1) + ' m), posé sur le sol (' + (m.sol * 100).toFixed(0) + ' cm), sans choc, la caméra au-dessus du relief ; au plus lent dans la montée ' + m.vmin.toFixed(1) + ' m/s',
          ok && Math.abs(CL.tr.pos.y - C.y) < 0.3 && m.ecart < 4 && m.sol < 0.15 && m.chocs === 0 && m.cam === 0 && m.vmin > 6]);
        // en roulant, le gyrophare du tracteur tourne ; au freinage, les feux stop s'allument (et rien en marche avant pour le recul)
        { const F = CL.vehicule(genre).m, gyro = genre !== 'tracteur' || F.gyro.visible; CL.ctrl.ky = 1; CL.step(6); const stop = F.feux.stop.visible, recul = F.feux.recul ? F.feux.recul.visible : false; CL.ctrl.ky = 0;
          log.push([genre + ' : ' + (genre === 'tracteur' ? 'le gyrophare tourne en roulant, ' : '') + 'les feux stop s\'allument au freinage', gyro && stop && !recul]); }
        if (genre === 'tracteur') {
          // le tour du château, dans le sens des aiguilles d'une montre vu d'en haut, depuis l'arrivée de la route
          CL.ctrl.ky = 1; for (let k = 0; k < 300 && Math.abs(CL.tr.v) > 0.3; k++) CL.step(1); CL.ctrl.ky = 0;
          CL.teleporter(C.x, C.z - C.tour, Math.PI / 2); CL.step(10);
          const a0 = Math.atan2(CL.tr.pos.z - C.z, CL.tr.pos.x - C.x), tour = Array.from({ length: 220 }, (_, k) => { const a = a0 + k / 200 * Math.PI * 2; return [C.x + Math.cos(a) * C.tour, C.z + Math.sin(a) * C.tour]; });
          const mt = { sol: 0, cam: 0, chocs: 0, ecart: 0, vmin: 99 }, fini = suivre(tour, 9, 60, mt);
          log.push(['le tour du château, sans choc ni sortie (écart ' + mt.ecart.toFixed(1) + ' m, ' + mt.chocs + ' images de frottement, fini ' + fini + ')', fini && mt.chocs === 0 && mt.ecart < 3.5 && mt.cam === 0]);
          // hors de la route : on va dans l'herbe, dans la pente, posé sur le sol
          // (des deux côtés, en biais : un arbre du bord de route peut arrêter d'un côté)
          const k = 300; let ecartSol = 0, dMax = 0;
          for (const cote of [Math.PI / 2 + 0.5, -Math.PI / 2 - 0.5]) {
            CL.teleporter(R.x[k], R.z[k], Math.atan2(R.x[k + 1] - R.x[k], R.z[k + 1] - R.z[k]) + cote); CL.step(5);
            CL.ctrl.kx = 0; CL.ctrl.ky = -1;
            for (let n = 0; n < 240; n++) { CL.step(1); ecartSol = Math.max(ecartSol, Math.abs(CL.tr.pos.y - CL.relief.sol(CL.tr.pos.x, CL.tr.pos.z))); }
            CL.ctrl.ky = 0; CL.step(30);
            dMax = Math.max(dMax, CL.relief.procheRoute(CL.tr.pos.x, CL.tr.pos.z, 200).d);
          }
          const q = { d: dMax };
          log.push(['hors de la route, on roule dans l\'herbe (' + q.d.toFixed(0) + ' m de l\'axe), posé sur la pente (' + (ecartSol * 100).toFixed(0) + ' cm)', q.d > CL.relief.LARGE + 6 && ecartSol < 0.5]);
        }
        log.push([genre + ' : descendu', descendre()]);
        if (genre === 'van') {
          // à pied, contre une maison de la route du château (tournée de biais) : on ne la traverse pas
          const M = J.lieux.maisonsRoute[3], vx = Math.sin(M.rot), vz = Math.cos(M.rot);
          J.joueur.placer(M.x + vx * (M.d / 2 + 3), M.z + vz * (M.d / 2 + 3), M.rot + Math.PI); CL.step(5);
          CL.ctrl.ky = -1; CL.step(240); CL.ctrl.ky = 0; CL.step(5);
          const dx = J.joueur.pos.x - M.x, dz = J.joueur.pos.z - M.z, prof = dx * vx + dz * vz;
          log.push(['à pied, une maison de la route du château arrête (' + J.lieux.maisonsRoute.length + ' maisons ; ' + prof.toFixed(2) + ' m de son centre)', J.lieux.maisonsRoute.length >= 8 && prof > M.d / 2 + 0.2]);
        }
      }
      // à pied sur la pente : les pieds sur le sol
      { const k = 250; J.joueur.placer(R.x[k], R.z[k], Math.atan2(R.x[k + 1] - R.x[k], R.z[k + 1] - R.z[k])); CL.step(3);
        let e = 0; CL.ctrl.ky = -1; for (let n = 0; n < 180; n++) { CL.step(1); e = Math.max(e, Math.abs(J.joueur.m.groupe.position.y - sol(J.joueur.pos.x, J.joueur.pos.z))); } CL.ctrl.ky = 0;
        log.push(['à pied dans la montée, les pieds sur le sol (' + (e * 100).toFixed(0) + ' cm), y compris en montant (' + J.joueur.pos.y.toFixed(1) + ' m)', e < 0.02 && J.joueur.pos.y > 5]); }
      // une voiture (mode WTF : celle d'en face) : frein à main dans un virage, puis on tient la glisse au volant
      { J.basculerWtf(); const g = CL.GAREES[0]; J.joueur.placer(g.x + 2.2, g.z, -Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
        // (départ assez à l'ouest : la glisse finit dans l'herbe, avant les rangs du Clos qui la freineraient)
        CL.teleporter(-185, 11.7, Math.PI / 2); CL.step(5);
        CL.ctrl.ky = -1; for (let k = 0; k < 400 && CL.tr.v < 17; k++) CL.step(1);
        let tenue = 0, bmax = 0, vmin = 99;
        // (mesuré jusqu'au premier choc : la glisse peut finir contre un mur ou un cycliste, selon l'endroit où elle mène ;
        // c'est la tenue de route qu'on vérifie, et elle doit tenir 2,5 s au moins avant. Un cycliste sur le chemin compte
        // comme un choc : il saute de côté, ou la voiture pousse son vélo couché, velos.js, et ne s'arrête plus dessus)
        const cyclistes = () => CL.velos.cyclistes.reduce((a, c) => a + (c.sauts || 0), 0) + CL.velos.pousses;
        let cy0 = -1;
        for (let k = 0; k < 300; k++) {
          const tr = CL.tr, beta = Math.atan2(tr.vT, Math.max(1, Math.abs(tr.v))), T = k / 60;
          if (T < 0.45) { CL.ctrl.kx = -1; CL.ctrl.fm = true; } else { CL.ctrl.fm = false; CL.ctrl.kx = Math.max(-1, Math.min(1, -(beta + 0.5) * 2)); }
          CL.ctrl.ky = -1; CL.step(1);
          if (T > 1.5 && cy0 < 0) cy0 = cyclistes();
          if (T > 1.5 && (tr.chocVu > 0.15 || cyclistes() !== cy0)) break;
          if (T > 1.5) { if (Math.abs(beta) > 0.3) tenue += 1 / 60; vmin = Math.min(vmin, tr.v); }
          bmax = Math.max(bmax, Math.abs(beta));
        }
        CL.ctrl.kx = 0; CL.ctrl.ky = 0;
        log.push(['en voiture, la glisse se tient à l\'accélérateur (' + tenue.toFixed(1) + ' s sur 3,5, à ' + vmin.toFixed(1) + ' m/s au moins), sans tête-à-queue (' + (bmax * 57.3).toFixed(0) + ' degrés au plus)', tenue > 2.5 && vmin > 9 && bmax < 1.3]); }
    } catch (e) { log.push(['scénario interrompu : ' + e.message, false]); }
    return log;
  });
  for (const [msg, c] of r) ok(c, msg);
  await capture('fin');
}

if (scenario === 'sauvegarde') {
  // la sauvegarde : une tournée avancée (commande chargée dans le tracteur, une signée sur la palette, une livrée, le chèque
  // récupéré, le prospect ajouté) s'enregistre ; la page rechargée, « Continuer » la reprend telle quelle, au domaine ; la
  // mission 1 gagnée se rejoue depuis le téléphone (app Missions, avec confirmation) ; la mission 2 avancée (une parcelle
  // en partie traitée, le registre) se reprend aussi
  const attendre = () => page.waitForFunction(() => window.CL && !document.querySelector('#jouer').disabled, { timeout: 60000 });
  const r1 = await ev(() => {
    const m = CL.mission, J = CL.jeu, log = [], mi = id => document.querySelector(`.mi[data-m="${id}"]`);
    // une première partie : seule la mission 1 est ouverte, les deux autres attendent que la précédente soit gagnée
    log.push(['accueil, première fois : la mission 1 ouverte, les missions 2 et 3 fermées ; « Jouer » lance la mission 1', !mi('tournee').disabled && mi('traitement').disabled && mi('habillage').disabled
      && mi('traitement').classList.contains('verrou') && mi('habillage').classList.contains('verrou') && document.querySelector('#jouer-t').textContent === 'Jouer' && document.querySelector('#jouer-s').textContent.includes('Mission 1')]);
    mi('habillage').click();
    log.push(['une mission fermée ne se lance pas', !document.querySelector('#accueil').hidden && CL.etat === 'accueil']);
    CL.jouer(); CL.step(260);
    const tr = CL.vehicule('tracteur'), [cave, bar, treille] = m.clients;
    cave.cartons = 6; cave.statut = 'chargee'; cave.veh = tr; m.places.tracteur = [...Array(6).fill('cave'), ...Array(12).fill(null)];
    for (let i = 0; i < 6; i++) tr.m.cartons[i].visible = true;
    bar.cartons = 2; bar.statut = 'signee'; treille.cartons = 3; treille.statut = 'livree';
    m.retardataire.statut = 'recupere'; m.prospect.statut = 'attendu'; m.etoiles = 1; J.minutes = 18 * 60 + 12;
    const P = CL.sauver();
    log.push(['la partie s\'enregistre (tournée, à 18 h 12)', !!P && P.mission === 'tournee' && P.etat.clients[0].s === 'chargee' && P.minutes === 18 * 60 + 12]);
    return log;
  });
  for (const [msg, c] of r1) ok(c, msg);
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await attendre();
  const r2 = await ev(() => {
    const q = s => document.querySelector(s), m = CL.mission, J = CL.jeu, log = [];
    log.push(['à l\'accueil : « Continuer » la tournée en cours ; la mission 2 toujours fermée', q('#jouer-t').textContent === 'Continuer' && q('#jouer-s').textContent.includes('tournée') && q('.mi[data-m="traitement"]').disabled]);
    // (la page a pu tourner quelques secondes avant de se recharger : la sauvegarde faite en la quittant a l'heure d'alors)
    const H = CL.SAUVE.partie.minutes;
    q('#jouer').click(); CL.step(30);
    const tr = CL.vehicule('tracteur'), [cave, bar, treille] = m.clients;
    log.push(['reprise : les commandes où elles en étaient, le chèque, le prospect, l\'heure', cave.statut === 'chargee' && cave.veh === tr && bar.statut === 'signee' && treille.statut === 'livree'
      && m.retardataire.statut === 'recupere' && m.prospect.statut === 'attendu' && Math.abs(J.minutes - H) < 1 && H >= 18 * 60 + 12 && m.etape === 'journee']);
    log.push(['ce qui se voit : 6 cartons dans le tracteur, la commande du bar sur la palette, La Treille rentrée chez elle', tr.m.cartons.filter(c => c.visible).length === 6 && tr.p.charge === 6
      && m.palette.filter(p => p.groupe.visible).every(p => p.client === 'bar') && m.palette.some(p => p.groupe.visible)
      && CL.clients.liste.find(f => f.id === 'treille').etat === 'dedans' && CL.clients.liste.find(f => f.id === 'cave').etat === 'dehors']);
    log.push(['reprise au domaine, à pied', !J.auVolant && Math.hypot(J.joueur.pos.x - J.lieux.depart.x, J.joueur.pos.z - J.lieux.depart.z) < 1]);
    // la mission 1 gagnée : le téléphone propose de la rejouer
    CL.SAUVE.gagner('tournee');
    q('#poche').click(); J.tel.action('ouvrir:missions');
    const t = q('#app').textContent;
    log.push(['le téléphone, app Missions : la tournée gagnée, la journée de traitement à venir', t.includes('Gagnée') && t.includes('À venir') && !!q('#app [data-a="rejouer:tournee"]') && !q('#app [data-a="rejouer:traitement"]')]);
    q('#app [data-a="rejouer:tournee"]').click();
    log.push(['rejouer demande confirmation', !!q('#app [data-a="rejouerOk:tournee"]') && q('#app').textContent.includes('remplacée')]);
    return log;
  });
  for (const [msg, c] of r2) ok(c, msg);
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), ev(() => document.querySelector('#app [data-a="rejouerOk:tournee"]').click())]);
  await attendre(); await new Promise(r => setTimeout(r, 300));
  const r3 = await ev(() => {
    const q = s => document.querySelector(s), m = CL.mission, log = [];
    CL.step(300);
    log.push(['la tournée rejouée : lancée tout de suite, du début, la mission gagnée le reste', q('#accueil').hidden && m.clients.every(c => c.statut === 'a_traiter') && m.retardataire.statut === 'a_planifier'
      && Math.floor(CL.jeu.minutes) < 17 * 60 + 50 && CL.SAUVE.gagnees.tournee === true]);
    // la mission 2, avancée : la bouillie prête, les Perrières en partie traitées, une ligne au registre
    CL.versMission2(); CL.step(400);
    const T = CL.traitement, p = T.parcelles[0], q0 = p.q;
    T.messageLu(); T.prete = true; T.aller('traiter');
    for (let x = q0.x0 + 2; x < (q0.x0 + q0.x1) / 2; x += 2.5) p.faites += CL.monde.traiter(p.v, x, (q0.z0 + q0.z1) / 2, 3.6);
    T.registre.unshift({ quand: 'essai', parcelles: ['Les Perrières'], produits: [], cibles: [], stade: '', par: 'essai', statut: 'attente' });
    const P = CL.sauver(), b = p.v.blocs.map(x => Array.from(x.traite).join(''));
    log.push(['la journée de traitement s\'enregistre (' + p.faites + ' travées traitées)', !!P && P.mission === 'traitement' && P.etat.prete && P.etat.parcelles[0].f === p.faites && p.faites > 0]);
    return [log, b, p.faites];
  });
  for (const [msg, c] of r3[0]) ok(c, msg);
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await attendre();
  const r4 = await ev(([b, f]) => {
    const q = s => document.querySelector(s), log = [];
    q('#jouer').click(); CL.step(60);
    const T = CL.traitement, p = T.parcelles[0];
    log.push(['reprise de la mission 2 : la bouillie prête, la parcelle traitée en partie (mêmes travées), le registre', T.etape === 'traiter' && T.prete && p.faites === f
      && p.v.blocs.every((x, j) => Array.from(x.traite).join('') === b[j]) && T.registre[0].par === 'essai' && T.registre[0].statut === 'attente' && CL.jeu.minutes > 1440]);
    return log;
  }, [r3[1], r3[2]]);
  for (const [msg, c] of r4) ok(c, msg);
  // la mission 3, avancée : la fiche publiée, le BAT validé, la remorque livrée à l'imprimerie, les palox rentrés ; le SMS
  // pas encore arrivé
  const r5 = await ev(() => {
    const H = CL.habillage, log = [];
    CL.versMission3(); CL.step(300);
    H.messageLu(); H.echantillon = 'depose'; H.bulletin = true;
    for (const k of ['nom', 'millesime', 'appellation', 'lot']) H.remplir(k);
    H.couleur('Rouge'); for (let i = 0; i < 4; i++) H.degre(1); H.ingredient('raisins'); H.bio(); H.ingredient('sulfites');
    for (let i = 0; i < 8; i++) H.valeur('glucides', 1); for (let i = 0; i < 2; i++) H.valeur('sucres', 1);
    H.calculer(); H.publier(); H.telecharger(); H.envoyer(); H.bat = 'recu'; H.accord();
    H.annonce = true; H.livre = true; H.decharge = true; H.minDecharge = CL.jeu.minutes;
    CL.step(60 * 4);
    const P = CL.sauver();
    log.push(['l\'habillage s\'enregistre (fiche publiée, BAT validé, remorque livrée, palox rentrés)', !!P && P.mission === 'habillage' && P.etat.publiee && P.etat.bat === 'ok' && P.etat.livre && P.etat.decharge && P.etat.annonce && !P.etat.sms]);
    return log;
  });
  for (const [msg, c] of r5) ok(c, msg);
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await attendre();
  const r6 = await ev(() => {
    const q = s => document.querySelector(s), H = CL.habillage, J = CL.jeu, L = J.lieux, log = [];
    log.push(['à l\'accueil : « Continuer » l\'habillage ; la tournée gagnée (médaille), la mission 2 ouverte, la 3 fermée (la 2 pas encore gagnée)', q('#jouer-t').textContent === 'Continuer' && q('#jouer-s').textContent.includes('habillage')
      && q('.mi[data-m="tournee"]').classList.contains('gagnee') && !q('.mi[data-m="traitement"]').disabled && q('.mi[data-m="habillage"]').disabled]);
    q('#jouer').click(); CL.step(60);
    const D = L.entrepot.depot, p = J.remorque.ici;
    log.push(['reprise de la mission 3 : la fiche publiée (12,5 % vol, 299,6 kJ), le BAT validé, la remorque dételée dans la cour de l\'imprimerie, les palox rentrés, l\'œnologue rentrée, Marc rentré à la maison ; rentrer dormir',
      H.etape === 'jour' && H.publiee && H.fiche.degre === 12.5 && H.fiche.energie.kj === 299.6 && H.fiche.ingr.has('sulfites') && H.bat === 'ok' && H.livre && H.decharge
      && !J.remorque.attelee && Math.hypot(p.x - D.x, p.z - D.z) < 0.5 && CL.dech && CL.dech.fini && CL.gens3.liste[0].etat === 'dedans' && CL.gens3.liste[2].etat === 'dedans' && H.cible === L.maison && CL.jeu.minutes > 2 * 1440]);
    CL.teleporter(L.maison.x, L.maison.z + 1, Math.PI); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(60 * 6);
    const E = L.entrepot.retour;
    log.push(['rentré dormir : au réveil, le message de l\'imprimerie ; la remorque rechargée, tournée vers la sortie', H.sms && Math.hypot(J.remorque.ici.x - E.x, J.remorque.ici.z - E.z) < 0.5 && CL.dech.stock.count === 0]);
    const P2 = CL.sauver();
    log.push(['et cela s\'enregistre', !!P2 && P2.etat.sms]);
    return log;
  });
  for (const [msg, c] of r6) ok(c, msg);
}

if (scenario === 'traitement') {
  // la mission 2 : après la tournée, on rentre dormir ; au réveil, le lendemain, le message de Claire ; en tracteur, la bouillie
  // à l'aire de remplissage ; les Perrières et le Clos traités au guidage (flèche du haut) ; le Registre phyto refuse ce
  // qui ne correspond pas à ce qui a été fait, puis enregistre ; les Grands Champs, notés sans réseau, partent quand ça
  // capte ; la carte de fin
  const r = await ev(async () => {
    const J = CL.jeu, T = CL.traitement, tel = J.tel, log = [];
    const obj = () => document.querySelector('#objectif')?.textContent || '', toast = () => document.querySelector('#app .ph-toast')?.textContent || '';
    // traiter une parcelle : l'enjambeur posé à son entrée, flèche du haut tenue (le guidage l'engage dans un rang, puis il
    // fait toute la parcelle) ; une fois engagé, la flèche de droite tenue un moment : il ne dévie pas (on ne gère que
    // l'avance) ; rend la parcelle, la durée, l'écart maximal à l'axe du passage pendant le coup de volant, engagé ou non
    const traiter = (id, x, z) => {
      const p = T.parcelles.find(q => q.id === id);
      CL.teleporter(x, z, 0); CL.step(10);
      let n = 0, engage = false, ecartMax = 0, volant = 0; CL.ctrl.ky = -1;
      for (; n < 60 * 200 && !p.traitee; n++) {
        CL.step(1);
        if (T.engage) engage = true;
        // un coup de volant à droite, engagé, au milieu d'un passage
        if (T.engage && volant < 120 && T.pulverise) {
          CL.ctrl.kx = 1; volant++;
          const q = p.q, tr = CL.tr, k = Math.round((tr.pos.x - q.xr) / q.ecart);
          ecartMax = Math.max(ecartMax, Math.abs(tr.pos.x - (q.xr + k * q.ecart)));
        } else CL.ctrl.kx = 0;
      }
      CL.ctrl.ky = 0; CL.ctrl.kx = 0; CL.step(30);
      return [p, n / 60, ecartMax, engage, volant];
    };
    const noter = ids => {
      tel.ouvrir('phyto'); tel.action('rp-nouveau');
      for (const id of ids) tel.action('rp-cocher:' + id);
      tel.action('rp-suite');
      for (let i = 0; i < 3; i++) tel.action('rp-dose:cuivre:1');
      tel.action('rp-suite'); tel.action('rp-suite'); tel.action('rp-cible:Mildiou'); tel.action('rp-suite');
      tel.action('rp-enregistrer');
    };
    try {
      CL.jouer(); CL.step(30);
      log.push(['avant la mission 2, le Registre phyto annonce la mission', (tel.ouvrir('phyto'), document.querySelector('#app').textContent.includes('Mission 2')) && !T.actif]);
      tel.fermer();
      CL.versMission2(); CL.step(300);
      log.push(['au réveil, le lendemain : la mission 2, le message de Claire', T.actif && J.minutes >= 1440 + 420 && J.minutes < 1440 + 480 && tel.notif === 'messages' && obj().includes('Claire')]);
      tel.ouvrir('messages'); tel.action('fil:claire'); tel.fermer(); CL.step(60);
      log.push(['message lu : monter dans l\'enjambeur', T.etape === 'preparer' && obj().includes('enjambeur')]);
      // le tracteur ne pulvérise pas : à l'aire, il faut l'enjambeur
      { const t = CL.vehicule('tracteur').p.pos; CL.teleporter(t.x + 2.4, t.z, 0); } CL.step(3); CL.agir(); CL.finirGeste(); CL.step(3);
      CL.teleporter(-86, -66, Math.PI); CL.step(40);
      log.push(['en tracteur à l\'aire : pas de bouillie, on dit qu\'il faut l\'enjambeur', !T.prete && !J.gestes.actif && document.querySelector('#sous-titre').textContent.includes('enjambeur')]);
      CL.agir(); CL.finirGeste(); CL.step(3);
      const v = CL.vehicule('enjambeur');
      for (let k = 0; k < 40 && !J.auVolant; k++) { const a = k * 0.5; J.joueur.placer(v.p.pos.x + Math.cos(a) * 2.8, v.p.pos.z + Math.sin(a) * 2.8, 0); CL.step(2); CL.agir(); CL.finirGeste(); CL.step(2); }
      CL.teleporter(-86, -66, Math.PI); CL.step(20); CL.finirGeste(3000); CL.step(10); // (l'échelle, en bas et en haut : plus long)
      log.push(['à l\'aire de remplissage, la bouillie est prête ; on est de nouveau au volant de l\'enjambeur', T.prete && T.etape === 'traiter' && J.auVolant && J.veh.genre === 'enjambeur']);
      const [p1, t1, e1, g1, k1] = traiter('perrieres', -147, -116);
      log.push([`Les Perrières traitées (${t1.toFixed(0)} s) : engagé dans un rang, l'enjambeur fait toute la parcelle, à plus de 97 %, puis s'arrête au bout`, p1.traitee && g1 && t1 < 160 && Math.abs(CL.tr.v) < 0.5]);
      log.push([`engagé, le volant ne fait rien : la flèche de droite tenue ${(k1 / 60).toFixed(1)} s, il reste sur le rang (écart ${e1.toFixed(2)} m)`, k1 >= 60 && e1 < 0.6]);
      // une saisie par parcelle (Teddy, 26/11/2026) : on dit laquelle noter et quelle appli ouvrir ; le téléphone vibre,
      // l'icône du Registre phyto est mise en évidence ; la parcelle suivante attend
      log.push(['ensuite : noter Les Perrières, tout de suite (l\'objectif dit le téléphone et l\'appli ; le Registre phyto vibre)', obj().startsWith('Notez Les Perrières dans le Registre phyto') && tel.notif === 'phyto' && !T.cible]);
      tel.ouvrir('accueil');
      log.push(['l\'écran d\'accueil : la notification du Registre phyto, son icône mise en évidence', !!document.querySelector('#app .ph-notif[data-a="ouvrir:phyto"]') && !!document.querySelector('#app .ph-ico.conseil [class~="phyto"]')]);
      tel.fermer();
      { // dans Le Clos sans avoir noté Les Perrières : les rampes restent repliées, on dit de noter d'abord
        const c = T.parcelles.find(q => q.id === 'clos');
        CL.teleporter(-36, -116, 0); CL.step(10); CL.ctrl.ky = -1; CL.step(300); CL.ctrl.ky = 0; CL.step(20);
        log.push(['dans Le Clos sans avoir noté Les Perrières : rien n\'est traité, on dit de noter d\'abord', c.faites === 0 && !T.guidage && T.ouvert < 0.05 && T.aideCle === 'noter']);
      }
      tel.ouvrir();
      const cons = () => document.querySelector('#app .consigne')?.textContent || '';
      log.push(['le téléphone s\'ouvre sur le Registre phyto : la consigne, « Noter un traitement » mis en évidence', tel.app === 'phyto' && cons().includes('Noter un traitement') && !!document.querySelector('#app [data-a="rp-nouveau"].guide')]);
      tel.action('rp-nouveau');
      log.push(['étape 1 : la consigne dit de cocher Les Perrières, mise en évidence', cons().includes('Cochez Les Perrières') && !!document.querySelector('#app .rp-case.guide[data-a="rp-cocher:perrieres"]')]);
      tel.action('rp-cocher:clos'); tel.action('rp-suite');
      const refusP = tel.app === 'phytoP' && toast().includes('pas encore traitée');
      tel.action('rp-cocher:clos'); tel.action('rp-cocher:perrieres');
      const suiteVue = !!document.querySelector('#app [data-a="rp-suite"].guide');
      tel.action('rp-suite');
      const guideDose = cons().includes('1,5 kg/ha') && !!document.querySelector('#app [data-a="rp-dose:cuivre:1"].guide');
      tel.action('rp-dose:synthese:1'); tel.action('rp-suite'); const refusBio = tel.app === 'phytoD' && toast().includes('bio');
      tel.action('rp-dose:synthese:-1'); tel.action('rp-dose:soufre:1'); tel.action('rp-suite'); const refusCuve = tel.app === 'phytoD' && toast().includes('pas dans la cuve');
      tel.action('rp-dose:soufre:-1'); for (let i = 0; i < 2; i++) tel.action('rp-dose:cuivre:1'); tel.action('rp-suite');
      const refusDose = tel.app === 'phytoD' && toast().includes('1,5 kg/ha');
      tel.action('rp-dose:cuivre:1'); tel.action('rp-suite'); tel.action('rp-suite'); tel.action('rp-cible:Oïdium'); tel.action('rp-suite');
      const refusCible = tel.app === 'phytoC' && !!document.querySelector('#app .rp-puce.guide[data-a="rp-cible:Mildiou"]');
      tel.action('rp-cible:Oïdium'); tel.action('rp-cible:Mildiou'); tel.action('rp-suite'); tel.action('rp-enregistrer');
      log.push(['le registre guide chaque écran (la parcelle, le + de la dose, la cible, Suivant quand c\'est juste)', suiteVue && guideDose]);
      log.push(['le registre refuse une parcelle pas traitée, un produit pas bio, le soufre (pas dans la cuve), une mauvaise dose, une autre cible', refusP && refusBio && refusCuve && refusDose && refusCible]);
      log.push(['enregistré : une ligne de plus, Les Perrières seules, envoyée, qui dit qui a saisi et quand ; la suite : Le Clos', T.registre.length === 3 && T.registre[0].parcelles.join() === 'Les Perrières' && T.registre[0].statut === 'envoye' && T.registre[0].par.startsWith('vous') && !/· 0/.test(T.registre[0].quand) && cons().includes('Le Clos')]);
      tel.fermer(); CL.step(30);
      log.push(['le téléphone fermé : direction Le Clos (parcelle 2 sur 3)', obj().includes('Le Clos') && obj().includes('2 sur 3') && !T.aDire]);
      const [p2, t2, e2, g2] = traiter('clos', -36, -116);
      log.push([`Le Clos traité (${t2.toFixed(0)} s), puis à noter`, p2.traitee && g2 && t2 < 160 && obj().startsWith('Notez Le Clos')]);
      tel.ouvrir('phyto'); tel.action('rp-nouveau'); tel.action('rp-cocher:perrieres'); tel.action('rp-suite');
      const refusDeja = tel.app === 'phytoP' && toast().includes('déjà notée');
      tel.action('rp-cocher:perrieres'); tel.fermer(); T.saisie = null;
      noter(['clos']);
      log.push(['Le Clos : Les Perrières refusées (déjà notées), puis Le Clos noté et envoyé', refusDeja && T.registre.length === 4 && T.registre[0].parcelles.join() === 'Le Clos' && T.registre[0].statut === 'envoye']);
      tel.fermer(); CL.step(30);
      const [p3, t3] = traiter('grandschamps', -29, 24);
      log.push([`Les Grands Champs traités (${t3.toFixed(0)} s) ; pas de réseau : la noter quand même, sur place`, p3.traitee && !T.reseau && obj().startsWith('Sans réseau, notez quand même Les Grands Champs') && document.querySelector('#tel-res').textContent === 'Pas de service']);
      tel.ouvrir('phyto'); tel.action('rp-nouveau'); tel.action('rp-cocher:grandschamps'); tel.action('rp-suite');
      for (let i = 0; i < 3; i++) tel.action('rp-dose:cuivre:1');
      tel.action('rp-suite'); tel.action('rp-suite'); tel.action('rp-cible:Mildiou'); tel.action('rp-suite');
      const consSans = cons().includes('Pas de réseau ici');
      tel.action('rp-enregistrer');
      log.push(['sans réseau : la consigne le dit ; noté, en attente d\'envoi ; l\'appli dit qu\'il partira dès que ça capte', consSans && T.registre[0].statut === 'attente' && toast().includes('quand ça capte') && !!document.querySelector('#app .rp-sync.non') && cons().includes('remontez vers la route')]);
      tel.fermer(); CL.step(30);
      log.push(['objectif : remonter vers la route', obj().includes('ça capte')]);
      CL.teleporter(-55, 12, Math.PI); CL.step(200);
      log.push(['le réseau revient : envoyé, la journée de traitement est finie', T.registre[0].statut === 'envoye' && T.etape === 'fin']);
      CL.step(60 * 7);
      log.push(['la carte de fin, avec la prévente du registre ; la mission 2 est enregistrée comme gagnée', J.finVue && document.querySelector('#fin-titre').textContent.includes('Registre phyto') && !document.querySelector('#fin-cta').hidden && CL.SAUVE.gagnees.traitement === true]);
    } catch (e) { log.push(['scénario interrompu : ' + e.message, false]); }
    return log;
  });
  for (const [msg, c] of r) ok(c, msg);
  await capture('fin');
}

if (scenario === 'habillage') {
  // la mission 3 (Teddy, 25/11/2026) : après la journée de traitement, on rentre dormir ; au réveil, le message de
  // l'imprimerie ; la remorque pas encore là ; l'échantillon à pied, au carton ouvert du chai ; en van, en conduite
  // assistée, jusqu'au labo ; l'œnologue ; Marc prépare la remorque ; le bulletin ; la fiche Viticode, refusée tant
  // qu'elle ne correspond pas au bulletin, publiée, testée (l'âge, la langue) ; le QR code personnalisé (le titre et la
  // valeur énergétique gardés), téléchargé, envoyé ; le BAT validé ; de retour au domaine, Marc dit que la remorque est
  // prête ; le van ne l'attelle pas ; le tracteur recule, Marc attelle (on reste au volant) ; jusqu'à l'imprimerie, dans
  // la zone d'activités ; on dételle ; Julien rentre les six palox au chariot élévateur ; on rentre dormir ; le message
  // de l'imprimerie (photo, lien de la fiche) ; on va reprendre la remorque, Julien attelle ; on la ramène au chai, on la
  // dételle ; la carte de fin
  const r = await ev(async () => {
    const J = CL.jeu, H = CL.habillage, R = J.remorque, tel = J.tel, L = J.lieux, log = [];
    const obj = () => document.querySelector('#objectif')?.textContent || '', toast = () => document.querySelector('#app .ph-toast')?.textContent || '', app = () => document.querySelector('#app').textContent;
    const dit = () => document.querySelector('#sous-titre').textContent;
    const essai = (a, attendu) => { tel.action(a); return toast().includes(attendu); };
    // conduite assistée au doigt jusqu'à ce que but() soit vrai : durée, chocs, butées de la remorque
    const rouler = (but, max = 60 * 150) => {
      const C = CL.ctrl; let t = 0, chocs = 0, butees = 0, arret = 0;
      C.id = 1; C.jx = 0; C.jy = 0;
      for (let k = 0; k < max && !but(); k++) {
        CL.step(1); t += 1 / 60;
        if (CL.tr.chocVu > 0.15) chocs++;
        if (CL.attelage.bute) butees++;
        if (Math.abs(CL.tr.v) < 0.25 && !J.gestes.actif) arret += 1 / 60; else arret = 0;
        if (arret > 12) break;
      }
      C.id = null;
      return { t: Math.round(t), chocs, butees, ok: but() };
    };
    const monterDans = genre => { const v = CL.vehicule(genre), p = v.p.pos; CL.teleporter(p.x + Math.cos(v.p.h) * 2.4, p.z - Math.sin(v.p.h) * 2.4, 0); CL.step(3); CL.agir(); CL.finirGeste(); CL.step(3); return J.auVolant && J.veh.genre === genre; };
    let marc, julien;
    try {
      CL.jouer(); CL.step(30);
      marc = CL.gens3.liste[2]; julien = CL.gens3.liste[1];
      tel.ouvrir('viticode');
      log.push(['avant la mission 3, Viticode l\'annonce', app().includes('mission 3') && !H.actif]);
      tel.fermer();
      CL.versMission2(); CL.step(60); CL.versMission3(); CL.step(300);
      log.push(['au réveil, le jeudi : la mission 3, le message de l\'imprimerie ; la remorque est rangée vide sous le hangar, Marc pas encore là',
        H.actif && J.minutes >= 2 * 1440 + 420 && J.minutes < 2 * 1440 + 480 && !R.attelee && Math.hypot(R.ici.x - L.remorque.range.x, R.ici.z - L.remorque.range.z) < 0.5 && CL.mRem.palox.userData.vu.every(v => !v) && marc.etat === 'dedans' && tel.notif === 'messages' && obj().includes('imprimerie')]);
      tel.ouvrir('messages'); tel.action('fil:imprimerie'); tel.fermer(); CL.step(60);
      log.push(['message lu : l\'échantillon, au chai', H.etape === 'jour' && obj().includes('chai') && H.cible === J.carton]);
      // l'échantillon, à pied, au carton ouvert du chai
      CL.teleporter(J.carton.x - 1.0, J.carton.z, Math.PI / 2); CL.step(10);
      log.push(['au carton ouvert du chai : « Prendre un échantillon »', H.echantillonProche]);
      CL.agir(); CL.finirGeste(); CL.step(5);
      log.push(['échantillon pris ; la balise : le labo', H.echantillon === 'pris' && H.cible === L.arrets.labo && obj().includes('labo')]);
      // en van, en conduite assistée, jusqu'au labo
      log.push(['au volant du van', monterDans('van')]);
      const a = rouler(() => J.gestes.actif && H.occupe);
      log.push([`en van, en conduite assistée jusqu'au labo (${a.t} s) : aucun choc (${a.chocs})`, a.ok && a.chocs === 0]);
      CL.finirGeste(3000); CL.step(60 * 4);
      log.push(['échantillon donné, l\'œnologue le rentre au labo ; pendant ce temps, Marc a préparé la remorque, à sa place', H.echantillon === 'depose' && CL.gens3.liste[0].etat !== 'dehors' && J.auVolant
        && CL.mRem.palox.userData.vu.every(v => v) && Math.hypot(R.ici.x - L.remorque.x, R.ici.z - L.remorque.z) < 0.5 && marc.etat === 'dehors' && obj().includes('Marc')]);
      CL.step(60 * 26);
      log.push(['le bulletin arrive (Messages)', H.bulletin && tel.notif === 'messages' && H.fil === 'labo']);
      tel.ouvrir('messages'); tel.action('fil:labo');
      log.push(['le bulletin : 12,5 % vol, glucides 0,8 g, sucres 0,2 g', app().includes('12,5 % vol') && app().includes('0,8 g') && app().includes('0,2 g')]);
      tel.action('ouvrir:viticode'); tel.action('vc-fiche');
      const refus = [];
      refus.push(essai('vc-publier', 'Remplissez'));
      for (const k of ['nom', 'millesime', 'appellation', 'lot']) tel.action('vc-remplir:' + k);
      tel.action('vc-couleur:Blanc'); refus.push(essai('vc-publier', 'rouge'));
      tel.action('vc-couleur:Rouge'); for (let i = 0; i < 4; i++) tel.action('vc-degre:1');
      refus.push(essai('vc-publier', 'raisins'));
      tel.action('vc-ingr:raisins'); refus.push(essai('vc-publier', 'feuille'));
      tel.action('vc-bio'); refus.push(essai('vc-publier', 'sulfites'));
      tel.action('vc-ingr:sulfites'); tel.action('vc-ingr:gomme'); refus.push(essai('vc-publier', 'Gomme arabique'));
      tel.action('vc-ingr:gomme'); refus.push(essai('vc-publier', 'Glucides'));
      for (let i = 0; i < 8; i++) tel.action('vc-val:glucides:1');
      for (let i = 0; i < 2; i++) tel.action('vc-val:sucres:1');
      refus.push(essai('vc-publier', 'énergie'));
      tel.action('vc-label:Bio'); tel.action('vc-calculer');
      const e = H.fiche.energie;
      log.push(['la fiche refuse ce qui ne correspond pas au bulletin : champs, couleur, raisins, bio, sulfites, un ingrédient en trop, glucides, énergie', refus.length === 8 && refus.every(x => x)]);
      log.push([`l'énergie calculée : ${e.kj} kJ, ${e.kcal} kcal (alcool 29 kJ/g, glucides 17 kJ/g)`, e.kj === 299.6 && e.kcal === 72.24]);
      tel.action('vc-publier'); CL.step(10);
      log.push([`publiée : son QR code (objectif : ${obj()})`, H.publiee && tel.app === 'vcQr' && obj().includes('testez')]);
      tel.action('vc-tester');
      log.push(['« Testez-moi ! » : d\'abord « Avez-vous plus de 18 ans ? »', app().includes('Avez-vous plus de 18 ans')]);
      tel.action('vc-age:oui');
      const fiche = document.querySelector('#app').innerHTML;
      log.push(['la fiche : raisins bio, sulfites en gras, 299.6 kj / 72.24 kcal, le label bio', H.testee && fiche.includes('Raisins*') && fiche.includes('<b>Sulfites</b>') && fiche.includes('299.6 kj / 72.24 kcal') && fiche.includes('Agriculture biologique')]);
      tel.action('vc-langues'); tel.action('vc-lg:de');
      log.push(['en allemand : Zutaten, Nährwertdeklaration', app().includes('Zutaten') && app().includes('Nährwertdeklaration')]);
      tel.action('vc-fermer-test'); tel.action('vc-telecharger');
      tel.action('vc-regler:titre:0'); const sansTitre = essai('vc-dl', 'Ingrédients');
      tel.action('vc-regler:titre:1'); tel.action('vc-regler:pied:0'); const sansPied = essai('vc-dl', 'valeur énergétique');
      tel.action('vc-regler:pied:1'); tel.action('vc-regler:couleur:#8e2a3b');
      log.push(['le QR code ne se télécharge pas sans le titre « Ingrédients » ni sans la valeur énergétique', sansTitre && sansPied && !H.telecharge]);
      tel.action('vc-dl');
      log.push(['téléchargé : la feuille de partage, l\'imprimerie', H.telecharge && tel.app === 'vcPartage' && app().includes('Imprimerie Saint-Vincent')]);
      tel.action('vc-envoyer'); CL.step(60 * 6);
      log.push(['envoyé ; le BAT de l\'imprimerie arrive', H.envoye && H.bat === 'recu' && tel.app === 'messages']);
      tel.action('vc-accord'); CL.step(120);
      log.push(['BAT validé ; la balise : la remorque, au domaine', H.bat === 'ok' && H.cible === R.approche && app().includes('j\'imprime')]);
      tel.fermer(); CL.step(5);
      // de retour au domaine, en van : Marc dit que la remorque est prête ; le van ne l'attelle pas
      const c = rouler(() => H.annonce || J.gestes.actif);
      log.push([`de retour au domaine en van (${c.t} s, en ${CL.tr.pos.x.toFixed(0)}, ${CL.tr.pos.z.toFixed(0)}) : Marc dit que la remorque est prête`, H.annonce && dit().includes('prête')]);
      CL.teleporter(-90, -9, 0); CL.step(60 * 9);
      log.push(['en van devant le timon : pas d\'attelage, il faut le tracteur', J.auVolant && J.veh.genre === 'van' && !J.gestes.actif && !R.attelee && H.aideCle === 'remorque']);
      CL.agir(); CL.finirGeste(); CL.step(3);
      CL.vehicule('van').p.placer(L.van.x, L.van.z, L.van.h); CL.step(3);
      // le tracteur : arrêté devant le timon, il recule tout seul ; Marc attelle ; on reste au volant
      monterDans('tracteur');
      CL.teleporter(-90, -9, 0); CL.step(30);
      log.push(['en tracteur devant le timon, l\'attelage commence', J.gestes.actif && H.occupe]);
      let descendu = false, timon = 9;
      for (let n = 0; n < 4000 && J.gestes.actif; n++) { CL.step(1); if (!J.auVolant) descendu = true; const A = CL.attelage.anneau({ x: 0, z: 0 }); timon = Math.min(timon, Math.hypot(marc.p.pos.x - A.x, marc.p.pos.z - A.z)); }
      CL.step(10);
      log.push([`attelée par Marc (il est allé au timon : à ${timon.toFixed(1)} m de l'anneau), on est resté au volant ; la balise : l'imprimerie`, R.attelee && H.attelee && !descendu && J.auVolant && J.veh.genre === 'tracteur'
        && timon < 1.2 && ['range', 'dehors'].includes(marc.etat) && H.cible === L.entrepot.depot]);
      const d = rouler(() => J.gestes.actif && H.occupe);
      log.push([`en conduite assistée jusqu'à l'imprimerie, dans la zone d'activités (${d.t} s) : aucun choc, la remorque ne bute pas (${d.chocs}, ${d.butees}) ; on dételle ; Marc, lui, est rentré à la maison`, d.ok && d.chocs === 0 && d.butees === 0 && marc.etat === 'dedans' && !marc.p.m.groupe.visible]);
      CL.finirGeste(4000); CL.step(10);
      { const D = L.entrepot.depot, p = R.ici;
        log.push([`dételée dans la cour, à ${Math.hypot(p.x - D.x, p.z - D.z).toFixed(1)} m de sa place ; Julien va à son chariot`, H.livre && !R.attelee && Math.hypot(p.x - D.x, p.z - D.z) < 2.5 && obj().includes('chariot')]); }
      let n = 0; for (; n < 60 * 150 && !H.decharge; n++) CL.step(1);
      CL.step(10);
      log.push([`les six palox rentrés au chariot (${Math.round(n / 60)} s) ; la ligne tourne ; l'habillage prend l'après-midi : rentrer dormir (objectif : ${obj()})`, H.decharge && J.chariot.fini && obj().includes('dormir') && H.cible === L.maison]);
      // rentrer dormir : au réveil, le message de l'imprimerie ; la remorque rechargée, tournée vers la sortie
      CL.agir(); CL.finirGeste(); CL.step(3);
      CL.teleporter(L.maison.x, L.maison.z + 1, Math.PI); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(60 * 6);
      const E = L.entrepot.retour;
      log.push(['au réveil, le vendredi : le message de l\'imprimerie ; la remorque rechargée de palox habillés, tournée vers la sortie ; le tracteur rentré au domaine',
        H.sms && tel.notif === 'messages' && J.minutes >= 3 * 1440 + 420 && Math.hypot(R.ici.x - E.x, R.ici.z - E.z) < 0.5 && Math.abs(CL.attelage.h - E.h) < 0.01
        && Math.hypot(CL.vehicule('tracteur').p.pos.x - L.tracteur.x, CL.vehicule('tracteur').p.pos.z - L.tracteur.z) < 1 && obj().includes('imprimerie')]);
      tel.ouvrir('messages'); tel.action('fil:imprimerie');
      log.push(['le message : la photo de la bouteille habillée, le lien de sa fiche', app().includes('sont habillés') && !!document.querySelector('#app [data-a="vc-tester:sms"]') && !!document.querySelector('#app .bat.photo')]);
      tel.action('vc-tester:sms'); tel.action('vc-age:oui');
      log.push(['le lien du message : la fiche du Clos', app().includes('Ingrédients')]);
      tel.action('vc-fermer-test'); tel.fermer(); CL.step(10);
      // la reprendre : en tracteur, arrêté à l'entrée de la cour ; il se met en travers, recule ; Julien attelle
      monterDans('tracteur');
      const f = rouler(() => J.gestes.actif && H.occupe);
      log.push([`en tracteur jusqu'à l'imprimerie (${f.t} s) : aucun choc (${f.chocs}) ; Julien vient atteler`, f.ok && f.chocs === 0]);
      descendu = false;
      for (let k = 0; k < 5000 && J.gestes.actif; k++) { CL.step(1); if (!J.auVolant) descendu = true; }
      CL.step(10);
      log.push([`attelée par Julien, on est resté au volant, le tracteur tourné vers la sortie (cap ${CL.tr.h.toFixed(2)}) ; Marc attend devant le chai, sur le transpalette`, R.attelee && H.attelee && !descendu && Math.cos(CL.tr.h) < -0.95 && julien.etat === 'dehors' && H.cible === L.remorque.chai.arret
        && marc.etat === 'pilote' && Math.hypot(CL.mTP.groupe.position.x + 84.6, CL.mTP.groupe.position.z + 50.6) < 0.5]);
      const g = rouler(() => J.gestes.actif && H.occupe);
      log.push([`jusqu'au chai (${g.t} s) : aucun choc, la remorque ne bute pas (${g.chocs}, ${g.butees}) ; on la pose`, g.ok && g.chocs === 0 && g.butees === 0]);
      CL.finirGeste(5000); CL.step(10);
      { const C = L.remorque.chai, p = R.ici;
        log.push([`posée au chai, à ${Math.hypot(p.x - C.x, p.z - C.z).toFixed(1)} m de sa place ; Marc rentre les palox au transpalette, la grande porte s'ouvre`, H.marc && !H.rentree && !R.attelee && Math.hypot(p.x - C.x, p.z - C.z) < 2.5 && H.etape === 'jour' && !!CL.dechChai && obj().includes('Marc')]); }
      // Marc range les six palox au chai : sur le transpalette, les mains au timon ; la mission est gagnée quand c'est fait
      { let n = 0, haut = 0; const D = () => CL.dechChai;
        for (; n < 60 * 240 && !D().fini; n++) { CL.step(1); haut = Math.max(haut, CL.mTP.tablier.position.y); }
        log.push([`Marc a rangé les six palox au chai en ${(n / 60).toFixed(0)} s (fourches montées à ${haut.toFixed(2)} m), deux par pile devant les cuves ; la porte était ouverte ; la mission 3 est gagnée`,
          D().fini && D().stock.count === 6 && haut > 1.1 && H.rentree && !H.marc && H.etape === 'fin' && CL.SAUVE.gagnees.habillage === true && CL.monde.porteChai.k > 0.5]); }
      CL.step(60 * 7);
      log.push(['la carte de fin, avec viticode.fr', J.finVue && document.querySelector('#fin-titre').textContent.includes('Viticode') && !document.querySelector('#fin-cta').hidden && document.querySelector('#fin-cta').href.startsWith('https://viticode.fr')]);
    } catch (e) { log.push(['scénario interrompu : ' + e.message + ' ' + (e.stack || '').split('\n')[1], false]); }
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
      CL.teleporter(-93, -58, 0); CL.step(5); // (dans la cour, à l'est de l'arbre)
      touche('keydown', 'ArrowUp'); CL.step(90);
      const marche = CL.joueur.v;
      touche('keydown', 'ShiftLeft', 'Shift'); CL.step(60);
      const course = CL.joueur.v;
      touche('keyup', 'ShiftLeft', 'Shift'); touche('keyup', 'ArrowUp'); CL.step(30);
      log.push(['au clavier : la flèche fait marcher (' + marche.toFixed(1) + ' m/s), Maj courir (' + course.toFixed(1) + ' m/s)', Math.abs(marche - 1.6) < 0.15 && course > 5]);
      log.push(['17 h 40 : la lumière dorée', nuit() === 0]);
      // la zone d'activités : la tonnellerie vit (le feu, le cercleur, la rouleuse) ; on entre chez Solumatic par la façade
      // est (l'extérieur est retiré de la scène, la caméra à hauteur d'homme, ceux qui y travaillent), les cloisons et les
      // meubles arrêtent, quelqu'un de l'équipe va chercher un café, le baby-foot joue ; on ressort, tout revient
      {
        const T = CL.tonnellerie, S = CL.solu, M = CL.monde, LS = M.lieux.solumatic, etq = t => [...document.querySelectorAll('.etiquette.action')].some(e => !e.hidden && e.textContent.startsWith(t));
        CL.teleporter(222.5, -30.5, 0.9); CL.step(60 * 20);
        log.push(['la tonnellerie vit : le cercleur frappe (' + T.ce.coups + ' coups en 20 s), le feu brûle, la rouleuse roule sa barrique (' + T.ro.etat + ')', T.ce.coups >= 18 && T.flammes.visible && T.ro.etat === 'roule' && T.futs.some(f => f.visible)]);
        CL.teleporter(LS.dehors.x + 0.6, LS.dehors.z, -Math.PI / 2); CL.step(20);
        const propose = etq('Entrer chez Solumatic'), n0 = CL.scene.children.length;
        CL.agir(); CL.finirGeste(); CL.step(10);
        const n1 = CL.scene.children.length, c = CL.camera.position, j = CL.joueur.pos, la = S.gens.filter(g => g.etat !== 'absent');
        log.push(['chez Solumatic : « Entrer », dedans, l\'extérieur retiré de la scène (' + n0 + ' -> ' + n1 + ' objets), ' + S.gens.length + ' de l\'équipe, ' + la.length + ' encore là', propose && J.dedans === 'solumatic' && CL.isoles && n1 < 60 && M.interieurSolu.visible && S.gens.length === 22 && la.length >= 4 && la.every(g => g.p.m.groupe.visible || g.dehors)]);
        log.push(['la caméra suit à hauteur d\'homme, sous le plafond (y = ' + c.y.toFixed(2) + ', à ' + Math.hypot(c.x - j.x, c.z - j.z).toFixed(2) + ' m)', c.y > 1.5 && c.y < 2.75 && Math.hypot(c.x - j.x, c.z - j.z) > 0.4]);
        const H = S.P.hall; CL.teleporter((H.x0 + H.x1) / 2, H.z0 + 2.2, Math.PI); CL.step(3);
        touche('keydown', 'ArrowUp'); CL.step(60 * 4); touche('keyup', 'ArrowUp'); CL.step(10);
        const zN = CL.joueur.pos.z;
        log.push(['dedans, on marche dans l\'entrée jusqu\'au banc, qui arrête (z = ' + zN.toFixed(2) + ')', zN > H.z0 + 0.5 && zN < H.z0 + 1.15]);
        const m = la.find(g => g.etat === 'poste' && g.mode === 'assis' && !g.tache), x0 = m && m.home.x, z0 = m && m.home.z;
        if (m) S.envoyer(m.id, 'cafe');
        CL.teleporter(S.V.cibles.atlas[0], S.V.cibles.atlas[1], Math.PI); CL.step(60 * 26);
        const loin = m ? Math.hypot(m.p.pos.x - x0, m.p.pos.z - z0) : 0;
        log.push([(m ? m.e.prenom : 'personne') + ' se lève et va jusqu\'à la cuisine (' + loin.toFixed(1) + ' m de sa place)', m && loin > 6 && !m.p.assis]);
        const deux = S.gens.filter(g => g.etat === 'poste' && g.mode === 'assis' && !g.tache && g !== m), b0 = S.balle.position.z;
        if (deux.length >= 2) S.envoyer(deux[0].id, 'babyfoot', deux[1].id);
        CL.step(60 * 30); // (de la maintenance à Atlas, par les couloirs : 25 m à pied, et l'on se lève d'abord)
        log.push(['au baby-foot, la balle roule', S.balle.visible && Math.abs(S.balle.position.z - b0) > 0.01]);
        CL.teleporter(LS.dedans.x - 0.3, LS.dedans.z, Math.PI / 2); CL.step(10);
        const sortir = etq('Sortir');
        CL.agir(); CL.finirGeste(); CL.step(5);
        log.push(['on ressort : dehors, l\'extérieur revenu (' + CL.scene.children.length + ' objets), le toit, l\'intérieur plus dessiné', sortir && !J.dedans && !CL.isoles && CL.scene.children.length === n0 && M.toitSolu.visible && !M.interieurSolu.visible && CL.joueur.pos.x > LS.seuil.x - 0.2 && CL.joueur.m.groupe.visible]);
        CL.teleporter(-93, -58, 0); CL.step(5);
      }
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
      // le domaine : le tracteur et l'enjambeur rangés dans le hangar, derrière le chai ; le transpalette dans la troisième
      // travée ; Marc (mission 3) s'écarte en criant quand on fonce sur lui en tracteur
      {
        const L = J.lieux, tr = CL.vehicule('tracteur'), en = CL.vehicule('enjambeur'), dans = (v, l) => Math.hypot(v.p.pos.x - l.x, v.p.pos.z - l.z) < 0.5;
        log.push(['le tracteur, l\'enjambeur et le transpalette rangés dans le hangar', dans(tr, L.tracteur) && dans(en, L.enjambeur) && L.tracteur.z < -80 && Math.hypot(CL.mTP.groupe.position.x - L.transpalette.x, CL.mTP.groupe.position.z - L.transpalette.z) < 0.5]);
        J.remorque.preparer(); const m = CL.gens3.liste[2];
        { const p = tr.p.pos; CL.teleporter(p.x + 2.4, p.z, 0); } CL.step(3); CL.agir(); CL.finirGeste();
        CL.tr.placer(m.p.pos.x + 0.3, m.p.pos.z + 16, Math.PI); CL.step(5);
        CL.ctrl.ky = -1; let saut = false, dmin = 99;
        for (let i = 0; i < 240; i++) { CL.step(1); if (m.p.sautT > 0) saut = true; dmin = Math.min(dmin, Math.hypot(CL.tr.pos.x - m.p.pos.x, CL.tr.pos.z - m.p.pos.z)); }
        CL.ctrl.ky = 0; CL.step(30);
        log.push([`Marc s'écarte du tracteur qui fonce sur lui (au plus près : ${dmin.toFixed(1)} m), en criant`, saut && dmin > 1.6 && m.p.etq && m.p.etq.el.textContent.startsWith('Attention aux accidents du travail')]);
      }
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
    let t = 0, chocs = 0, arret = 0, bloque = false, nuits = 0;
    for (let k = 0; k < 60 * 400 && m.etape !== 'pc'; k++) {
      if (T.ouvert && T.app === 'bl') { T.encre = 200; q('#bt-livrer').disabled = false; q('#bt-livrer').click(); }
      // 19 h 30 : les clients ferment (outils.js, HORAIRES) ; on lève le doigt, on descend, on rentre dormir ; le matin, on
      // remonte et la tournée reprend où elle en était (l'itinéraire refait depuis là où le véhicule est resté)
      if (m.fermes && !J.gestes.actif && !T.ouvert) {
        C.id = null; for (let n = 0; n < 600 && Math.abs(CL.tr.v) > 0.3; n++) CL.step(1);
        CL.agir(); CL.finirGeste(); CL.dormir(); nuits++;
        CL.remonter(); C.id = 1; arret = 0;
        continue;
      }
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
    log.push(['tournée complète en conduite assistée (' + VEH + ', ' + Math.round(t) + ' s de jeu' + (nuits ? ', reprise au matin après ' + nuits + ' nuit' : '') + ')', !bloque && m.clients.every(c => c.statut === 'livree') && m.retardataire.statut === 'recupere' && J.distance(J.lieux.pc) < 6.5]);
    log.push(['aucun choc en route (' + chocs + ')', chocs === 0]);
    log.push(['le personnage ne traverse jamais un véhicule (' + CL.traversees + ' images)', CL.traversees === 0]);
    return log;
  }, process.env.VEHICULE || 'tracteur').catch(e => [['scénario interrompu : ' + e.message, false]]);
  for (const [msg, c] of r) ok(c, msg);
}

if (scenario === 'perf') {
  await ev(() => { CL.jouer(); CL.step(30); });
  await new Promise(r => setTimeout(r, 1500)); // chauffe (compilation des shaders)
  for (const [nom, x, z, h] of [['domaine', -99, -55, 0], ['route', -30, 10, Math.PI / 2], ['bourg', 60, 10, Math.PI / 2], ['place', 95, -30, Math.PI], ['vignes', -130, 60, 0], ['solumatic', 208.5, -38, Math.PI]]) {
    const r = await ev((x, z, h) => { CL.teleporter(x, z, h); CL.step(60); CL.bench(30); return CL.bench(120); }, x, z, h);
    console.log(`${nom.padEnd(8)} ${r}`);
  }
  const ips = await ev(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res((n / 3).toFixed(0)); }; requestAnimationFrame(f); }));
  console.log('images par seconde réelles (Chrome sans fenêtre) :', ips);
}

if (scenario === 'abords') {
  // Les abords de Solumatic (Teddy, 27/11/2026 : « y'a une route qui fait le tour du bureau avec des arbres de l'autre côté
  // de la route et une clôture » ; la devanture : « à gauche [...] la baie vitrée avec un porche en fibre de verre au dessus,
  // [...] les fenêtres tombent juste après. à droite du panneau, c'est aussi des fenêtres pas des portes fenêtres ») : le
  // tour du bâtiment par la route, depuis la rue, la grille passée, en voiture empruntée, en van et en tracteur (sur sa
  // file, sans choc, revenu au départ) ; le tour à pied ; la clôture arrête, de dedans comme de dehors ; la route dans le
  // réseau ; la porte d'entrée proposée ; la place où Romane fume, libre, et le cendrier ; aucune voiture garée sur la
  // route ; la devanture dans l'ordre voulu ; la nuit, les lumières ; des captures.
  const r = await ev(async () => {
    const J = CL.jeu, LS = J.lieux.solumatic, SI = LS.site, log = [];
    const angleDe = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    const ecart = (P, x, z) => { let d = 1e9; for (let i = 1; i < P.length; i++) { const [ax, az] = P[i - 1], [bx, bz] = P[i], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; };
    // des points tous les mètres le long d'une ligne
    const echantillons = P => { const o = [P[0]]; for (let i = 1; i < P.length; i++) { const [ax, az] = P[i - 1], [bx, bz] = P[i], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az))); for (let k = 1; k <= n; k++) o.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); } return o; };
    const axe = LS.tour(0, 12), file = LS.tour(1.5, 12);
    // le chemin : la rue, la grille, puis la file de droite tout autour, jusqu'au raccord
    const chemin = echantillons([[SI.rue + 1.5, -36], [SI.rue + 1.5, SI.s + 3], ...file.slice(1)]);
    // suivre des points de près (comme le banc chateau) : 7 m devant, à vmax au plus ; m : mesures (chocs : images de
    // frottement ; hors : la plus grande distance à l'axe de la route, une fois sur elle)
    const suivre = (P, vmax, maxT, m) => {
      let i = 0, T = 0;
      while (T < maxT) {
        const p = CL.tr.pos;
        let best = i, bd = 1e9;
        for (let k = Math.max(0, i - 5); k < Math.min(P.length, i + 30); k++) { const d = Math.hypot(P[k][0] - p.x, P[k][1] - p.z); if (d < bd) { bd = d; best = k; } }
        i = best;
        if (i >= P.length - 3) { CL.ctrl.kx = 0; CL.ctrl.ky = 0; return true; }
        // (plus lentement dans les virages : la direction du chemin, 12 m plus loin)
        const t = P[Math.min(P.length - 1, i + 7)], u = P[Math.min(P.length - 1, i + 12)], err = angleDe(Math.atan2(t[0] - p.x, t[1] - p.z) - CL.tr.h);
        const vire = Math.abs(angleDe(Math.atan2(u[0] - t[0], u[1] - t[1]) - Math.atan2(t[0] - P[i][0], t[1] - P[i][1]))) > 0.3, vm = vire ? Math.min(vmax, 4.5) : vmax;
        CL.ctrl.kx = -Math.max(-1, Math.min(1, err * 2.5)); CL.ctrl.ky = CL.tr.v < vm ? -1 : CL.tr.v > vm + 1 ? 1 : 0;
        CL.step(1); T += 1 / 60;
        if (CL.tr.frotte > 0.5) { m.chocs++; if (!m.ou) m.ou = p.x.toFixed(1) + ', ' + p.z.toFixed(1); }
        if (p.z < SI.s) { const h = ecart(axe, p.x, p.z); if (h > m.hors) { m.hors = h; m.loin = p.x.toFixed(1) + ', ' + p.z.toFixed(1); } }
      }
      CL.ctrl.kx = 0; CL.ctrl.ky = 0;
      return false;
    };
    const arreter = () => { CL.ctrl.kx = 0; CL.ctrl.ky = 1; for (let k = 0; k < 600 && Math.abs(CL.tr.v) > 0.3; k++) CL.step(1); CL.ctrl.ky = 0; CL.step(20); };
    const monter = genre => {
      const v = CL.vehicule(genre);
      for (let k = 0; k < 40 && !(J.auVolant && J.veh === v); k++) { const a = k * 0.5; J.joueur.placer(v.p.pos.x + Math.cos(a) * 2.6, v.p.pos.z + Math.sin(a) * 2.6, 0); CL.step(2); CL.agir(); CL.finirGeste(); CL.step(2); }
      return J.auVolant && J.veh === v;
    };
    const descendre = () => { arreter(); CL.agir(); CL.finirGeste(); CL.step(5); return !J.auVolant; };
    // (fini, le véhicule est reposé hors du site, en retour : la suite et les captures ont la route libre)
    const tour = (nom, vmax, retour) => {
      CL.teleporter(SI.rue + 1.5, -36, Math.PI); CL.step(20);
      const m = { chocs: 0, hors: 0 }, fini = suivre(chemin, vmax, 90, m), p = CL.tr.pos, d = Math.hypot(p.x - file[file.length - 1][0], p.z - file[file.length - 1][1]);
      log.push([nom + ' : de la rue, par la grille, le tour du bâtiment par la route, sur sa file (' + m.hors.toFixed(1) + ' m de l\'axe au plus' + (m.hors > 2.6 ? ', en ' + m.loin : '') + '), sans choc (' + m.chocs + (m.ou ? ', en ' + m.ou : '') + '), revenu au départ (à ' + d.toFixed(1) + ' m)', fini && m.chocs === 0 && m.hors < 2.6 && d < 6]);
      arreter(); CL.teleporter(...retour); CL.step(10);
    };
    try {
      CL.jouer(); CL.step(60); J.minutes = 11 * 60; CL.step(2);
      // en voiture : celle d'un conducteur de la départementale, qu'il nous prête
      {
        const v = CL.voitures().find(x => x.sens > 0);
        CL.teleporter(v.x + 30, v.zVoie, -Math.PI / 2);
        for (let i = 0; i < 900 && Math.abs(v.v) > 0.3; i++) CL.step(1);
        CL.step(30); J.joueur.placer(v.x + 0.5, v.z - 2.3, Math.PI); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
        if (J.auVolant && J.veh.genre === 'voiture') tour('en voiture', 9, [196, -24, 0]); else log.push(['en voiture : empruntée', false]);
        descendre();
      }
      // à pied : le tour par la route (à 1 m du trottoir), en courant ; la direction voulue, d'après la caméra (main.js : marcher)
      {
        const P = echantillons(LS.tour(-SI.L / 2 + 1, 12));
        J.joueur.placer(P[0][0], P[0][1], Math.PI / 2); CL.step(10);
        let i = 0, T = 0, bloque = 0;
        while (T < 120 && i < P.length - 2) {
          const p = J.joueur.pos;
          while (i < P.length - 2 && Math.hypot(P[i][0] - p.x, P[i][1] - p.z) < 1.2) i++;
          const t = P[Math.min(P.length - 1, i + 1)], l = Math.hypot(t[0] - p.x, t[1] - p.z) || 1, wx = (t[0] - p.x) / l, wz = (t[1] - p.z) / l, fx = Math.sin(CL.cam.yaw), fz = Math.cos(CL.cam.yaw);
          CL.ctrl.kx = -fz * wx + fx * wz; CL.ctrl.ky = -fx * wx - fz * wz;
          CL.step(1); T += 1 / 60;
          if (T > 1 && J.joueur.v < 0.3) bloque++;
        }
        CL.ctrl.kx = 0; CL.ctrl.ky = 0; CL.step(10);
        const d = Math.hypot(J.joueur.pos.x - P[P.length - 1][0], J.joueur.pos.z - P[P.length - 1][1]);
        log.push(['à pied : le tour du bâtiment (' + T.toFixed(0) + ' s), jamais arrêté (' + bloque + ' images), revenu au départ (à ' + d.toFixed(1) + ' m)', d < 2.5 && bloque < 20 && T < 120]);
      }
      // la clôture arrête : de dedans vers dehors (à l'ouest), de dehors vers dedans (au nord)
      {
        const marche = (x, z, wx, wz, s) => { J.joueur.placer(x, z, Math.atan2(wx, wz)); CL.step(5); for (let k = 0; k < s * 60; k++) { const fx = Math.sin(CL.cam.yaw), fz = Math.cos(CL.cam.yaw); CL.ctrl.kx = -fz * wx + fx * wz; CL.ctrl.ky = -fx * wx - fz * wz; CL.step(1); } CL.ctrl.kx = 0; CL.ctrl.ky = 0; CL.step(5); return J.joueur.pos; };
        const a = marche(SI.cl.o + 1.2, -74, -1, 0, 3).x, b = marche(212, SI.cl.n - 1.2, 0, 1, 3).z;
        log.push(['la clôture arrête, de dedans (x = ' + a.toFixed(2) + ') comme de dehors (z = ' + b.toFixed(2) + ')', a > SI.cl.o + 0.2 && b < SI.cl.n - 0.2]);
        const c = marche(SI.rue, -40, 0, -1, 8).z;
        log.push(['la grille est ouverte : de la rue, on entre à pied (z = ' + c.toFixed(1) + ')', c < SI.park[1] - 1]);
      }
      // (le van et le tracteur, après : chacun finit son tour au raccord de la rue)
      for (const [g, v] of [['van', 8], ['tracteur', 6.5]]) { if (monter(g)) { const l = J.lieux[g]; tour('en ' + g, v, [l.x, l.z, l.h]); descendre(); } else log.push(['en ' + g + ' : monté', false]); }
      // la route est dans le réseau : de la rue à l'arrière du bâtiment, l'itinéraire passe par elle
      {
        const it = J.reseau.itineraire({ x: SI.rue, z: -20 }, { x: (SI.o + SI.e) / 2, z: SI.n }), l = it.reduce((s, p, k) => s + (k ? Math.hypot(p[0] - it[k - 1][0], p[1] - it[k - 1][1]) : 0), 0);
        log.push(['dans le réseau : de la rue à l\'arrière du bâtiment, ' + l.toFixed(0) + ' m par la route du tour', it.length > 4 && l < 125 && it.every(([x, z]) => z > -20.5 || ecart(axe, x, z) < 0.5 || Math.abs(x - SI.rue) < 0.5)]);
      }
      // devant l'entrée : « Entrer chez Solumatic » ; la place où Romane fume, libre (0,6 m), le cendrier à côté
      {
        CL.teleporter(LS.dehors.x + 0.6, LS.dehors.z, -Math.PI / 2); CL.step(20);
        const etq = [...document.querySelectorAll('.etiquette.action')].some(e => !e.hidden && e.textContent.startsWith('Entrer chez Solumatic'));
        const F = LS.fumeur, libre = !CL.col.resoudre({ x: F.x, z: F.z }, 0.6), cendrier = CL.col.resoudre({ x: LS.cendrier.x, z: LS.cendrier.z }, 0.05);
        log.push(['devant l\'entrée : « Entrer chez Solumatic » (' + etq + ') ; la place où Romane fume, libre (' + libre + '), le cendrier à côté (' + cendrier + ')', etq && libre && cendrier]);
      }
      // aucune voiture garée sur la route (quinze points de son emprise, à plus d'un demi-chaussée de l'axe), ni dans le bâtiment
      {
        const G = CL.GAREES.filter(g => g.x > SI.o - 10 && g.x < SI.e + 10 && g.z > SI.n - 10 && g.z < -40);
        const sur = G.filter(g => { const co = Math.cos(g.h), si = Math.sin(g.h); return [-0.9, 0, 0.9].some(lx => [-2.1, -1, 0, 1, 2.1].some(lz => { const x = g.x + lx * co + lz * si, z = g.z + lz * co - lx * si; return ecart(axe, x, z) < SI.L / 2 + 0.1 || CL.col.dedans(x, z); })); });
        log.push([G.length + ' voitures garées chez Solumatic, aucune sur la route', G.length >= 3 && !sur.length]);
      }
      // la devanture, d'ouest en est : la baie, juste après elle des fenêtres, puis des fenêtres sous la bâche, puis des
      // fenêtres à sa droite ; plus de vitrine
      {
        const D = LS.devanture, F = D.fenetres, apres = F.filter(f => f[0] > D.baie[1] && f[1] < D.bache[0]), sous = F.filter(f => (f[0] + f[1]) / 2 > D.bache[0] && (f[0] + f[1]) / 2 < D.bache[1]), droite = F.filter(f => f[0] > D.bache[1]);
        log.push(['la devanture : la baie, ' + apres.length + ' fenêtres juste après (la première à ' + (F[0][0] - D.baie[1]).toFixed(2) + ' m), ' + sous.length + ' sous la bâche, ' + droite.length + ' à sa droite, ' + D.vitrines + ' vitrine',
          D.vitrines === 0 && F[0][0] > D.baie[1] && F[0][0] - D.baie[1] < 1.0 && apres.length >= 1 && sous.length >= 2 && droite.length >= 2 && F.every((f, k) => !k || f[0] > F[k - 1][1])]);
      }
      // la nuit : les lumières (lampadaires, appliques) s'allument ; le jour, elles sont éteintes
      {
        const M = CL.scene.getObjectByName('lumières Solumatic');
        const jour = M && !M.visible;
        J.minutes = 21 * 60; CL.step(5);
        log.push(['les lumières de Solumatic : éteintes le jour, allumées la nuit', jour && M.visible && M.material.opacity > 0.5]);
        J.minutes = 11 * 60; CL.step(5);
      }
    } catch (e) { log.push(['scénario interrompu : ' + e.message + ' ' + (e.stack || '').split('\n')[1], false]); }
    CL.ctrl.kx = 0; CL.ctrl.ky = 0;
    return log;
  });
  for (const [msg, c] of r) ok(c, msg);
  // les captures : la devanture de face et de trois quarts, la route, de dessus, la nuit
  for (const [nom, v, h] of [['devanture', [212, 3.2, -45.5, 212, 2.0, -62], 11], ['trois-quarts', [234, 4.5, -47, 214, 1.5, -66], 11], ['route', [189, 2.5, -56, 194, 1.2, -80], 11],
    ['dessus', [212, 120, -75, 212, 0, -75.1], 11], ['nuit', [234, 4.5, -47, 214, 1.5, -66], 21.5]]) {
    await ev((v, h) => { CL.jeu.minutes = h * 60; CL.teleporter(208.5, -40, Math.PI); CL.step(20); CL.photo(...v); CL.step(3); }, v, h);
    await capture(nom);
  }
  await ev(() => CL.photo());
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

if (scenario === 'fermeture') {
  // Les professionnels ne travaillent pas la nuit (Teddy, 26/11/2026 ; outils.js, HORAIRES) : à 19 h 35, les clients sont
  // rentrés (la cave sous nos yeux, par sa porte) ; l'objectif propose d'abord ce qui se fait seul (charger au chai,
  // Vitisoft), sinon de rentrer dormir, la balise sur la maison ; chez un client fermé, on dit pourquoi et rien ne se
  // livre ; la tournée ne se lance pas ; le bureau n'appelle pas et ne relance pas après 20 h ; les étoiles ne montent pas.
  // On dort : 7 h le lendemain, les clients ressortis, le bureau dit ce qui reste ; pas d'appel avant 8 h ; la tournée
  // reprend. La partie s'enregistre et se reprend (« Continuer ») le lendemain ; la tournée se finit (la carte de fin du
  // jour) ; Vitisoft, le téléphone, la mission 2 et la mission 3 prennent la date du jour. Mission 3 : le labo fermé à
  // 18 h 40, l'échantillon le lendemain ; le BAT n'arrive pas la nuit ; Marc rentré, on n'attelle pas ; l'imprimerie
  // fermée ; le matin, le BAT arrive et Marc attelle.
  const attendre = () => page.waitForFunction(() => window.CL && !document.querySelector('#jouer').disabled, { timeout: 60000 });
  // les petites briques des scénarios (dans la page) : définies une fois, sur window
  const briques = () => {
    const q = s => document.querySelector(s), J = CL.jeu, L = J.lieux, T = J.tel;
    window.B = {
      q, obj: () => q('#objectif').textContent, dit: () => [J.hud.ligne, ...J.hud.file].filter(Boolean).map(l => l.txt).join(' '),
      clic: s => { const e = q(s); if (!e) throw new Error('absent : ' + s + ' (appli ' + T.app + ', étape ' + CL.mission.etape + ')'); if (e.disabled) throw new Error('désactivé : ' + s); e.click(); },
      saisir: n => { for (let i = 0; i < n; i++) B.clic('[data-a="qte:1"]'); B.clic('[data-a="signer"]'); },
      geste: () => { for (let n = 0; n < 4000 && J.gestes.actif; n++) CL.step(1); CL.step(5); },
      silence: () => { J.hud.vider(); CL.step(9 * 60); },
      arret: id => { const a = L.arrets[id]; CL.teleporter(a.x + 3, a.z, -Math.PI / 2); CL.step(30); },
      livrer: id => { B.arret(id); CL.finirGeste(4000); CL.step(10); T.encre = 200; if (!q('#bt-livrer')) throw new Error('pas de bon de livraison chez ' + id + ' : ' + JSON.stringify({ app: T.app, ouvert: T.ouvert, bl: CL.mission.blPret, att: CL.mission.attenteBL, st: CL.mission.client(id).statut, vol: J.auVolant, veh: J.veh.genre, h: J.heureTxt, dit: B.dit(), pos: [CL.tr.pos.x, CL.tr.pos.z], tour: CL.mission.tour })); q('#bt-livrer').disabled = false; B.clic('#bt-livrer'); CL.step(10); CL.finirGeste(2000); CL.step(5); },
      auChai: () => { CL.teleporter(-83.4, -47.4, 2.83); CL.step(30); B.geste(); },
      heure: (j, h, m = 0) => { J.minutes = j * 1440 + h * 60 + m; CL.step(2); },
      // au bureau du chai, assis au portable (le chèque déposé en entrant, s'il y en a un)
      portable: () => {
        const BU = L.bureau;
        if (J.auVolant) { CL.teleporter(-81.4, -59.4, Math.PI); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5); }
        J.joueur.placer(BU.dehors.x - 0.6, BU.dehors.z, Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
        J.joueur.placer(-72.6, -63.4, Math.PI / 2); CL.step(5);
        if (CL.mission.chequeADeposer) { CL.agir(); CL.step(5); }
        CL.agir(); CL.finirGeste(); CL.step(5);
      },
      tuile: () => [...q('#pc .vs-tu.date').children].map(e => e.textContent).join(' '),
      sortirBureau: () => { const BU = L.bureau; J.joueur.placer(BU.dedans.x + 0.3, BU.dedans.z, -Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5); },
    };
  };
  const r1 = await ev(briques).then(() => ev(() => {
    const { q, obj, dit, clic, saisir, silence, arret, auChai, heure, portable, sortirBureau } = B, m = CL.mission, J = CL.jeu, T = J.tel, L = J.lieux, log = [];
    try {
      CL.jouer(); CL.step(260);
      // la cave et La Treille commandent et signent ; le bar attend son appel ; le chèque et le prospect dans la tournée
      q('#poche').click(); clic('[data-a="rappel:cave"]'); CL.step(900); saisir(6);
      clic('[data-a="ouvrir:bureau"]'); clic('[data-a="rappel:treille"]'); CL.step(700); saisir(3);
      clic('[data-a="ouvrir:bureau"]'); clic('[data-a="cheque"]'); clic('[data-a="prospect"]'); T.fermer(); CL.step(1500);
      log.push(['18 h : deux commandes signées, le bar pas encore appelé', m.client('cave').statut === 'signee' && m.client('treille').statut === 'signee' && m.client('bar').statut === 'a_traiter']);
      // 19 h 25, à pied devant la Cave du Pressoir : tout le monde attend dehors ; 19 h 30, ils rentrent
      heure(0, 19, 25);
      { const f = L.figurants.cave; J.joueur.placer(f.x + 5, f.z + 1, -Math.PI / 2); } CL.step(10);
      const cave = CL.clients.liste.find(f => f.id === 'cave'), [oeno, julien] = CL.gens3.liste;
      log.push(['19 h 25 : les cinq clients attendent devant leur boutique, Julien devant l\'imprimerie ; le labo a fermé à 18 h 30', CL.clients.liste.every(f => f.etat === 'dehors' && f.p.m.groupe.visible) && julien.etat === 'dehors' && oeno.etat === 'dedans' && !oeno.p.m.groupe.visible]);
      let vu = false; for (let n = 0; n < 1500 && J.minutes < 19 * 60 + 35; n++) { CL.step(1); if (cave.etat === 'range' && cave.p.m.groupe.visible) vu = true; }
      log.push([`19 h 35 : ils sont rentrés (la cave sous nos yeux, par sa porte ; les autres, loin, d'un coup), Julien aussi`, vu && CL.clients.liste.every(f => f.etat === 'dedans' && !f.p.m.groupe.visible && f.ferme) && julien.etat === 'dedans' && !julien.p.m.groupe.visible]);
      log.push([`la nuit, d'abord ce qui se fait seul : « ${obj()} », la balise au chai`, obj() === 'Il fait nuit : chargez au chai les commandes signées, pour la tournée de demain' && m.cible === L.chai && m.fermes]);
      // la nuit, les étoiles de retard ne montent pas (personne n'attend devant sa boutique fermée)
      { const e0 = m.etoiles; CL.step(60 * 45); log.push([`la nuit, les étoiles de retard ne montent pas (${e0} en 45 s)`, m.etoiles === e0]); }
      // 20 h 05 : le bureau n'appelle plus ; le bouton dit pourquoi et quand ; il ne relance pas
      heure(0, 20, 5);
      T.ouvrir('bureau');
      const ligneBar = [...document.querySelectorAll('#app .rappel')].find(e => e.textContent.includes('Bar Le Cep'));
      log.push(['20 h 05, Ma journée : l\'appel du bar refusé, le bouton dit pourquoi (trop tard) et quand (demain, 8 h)', !q('[data-a="rappel:bar"]') && ligneBar.textContent.includes('Trop tard pour appeler') && ligneBar.querySelector('button[disabled]').textContent === 'Demain, 8 h']);
      m.rappel('bar');
      log.push(['et l\'appel ne part pas (le téléphone le dit)', m.client('bar').statut === 'a_traiter' && !m.appelEnCours && T.app === 'bureau' && q('#app .ph-toast').textContent.includes('Trop tard pour appeler')]);
      T.fermer(); T.notifier(null); CL.step(60 * 12);
      log.push(['la nuit, le bureau ne relance pas (une tâche du jour reste : l\'appel du bar)', !T.notif]);
      // ce qui se fait seul se fait encore : le chargement au chai, en tracteur
      CL.remonter('tracteur'); auChai();
      log.push(['la nuit, au chai : les deux commandes se chargent', m.client('cave').statut === 'chargee' && m.client('treille').statut === 'chargee' && J.auVolant]);
      log.push([`puis Vitisoft : « ${obj()} », la balise au bureau du chai`, obj() === 'Il fait nuit, les clients sont fermés : au bureau du chai, Vitisoft (la DRM)' && m.cible === L.pc && m.nomCible === 'Bureau du chai']);
      // chez un client fermé : on dit pourquoi, rien ne se livre ; la tournée ne se lance pas
      silence(); arret('cave'); CL.step(30);
      log.push([`chez la Cave du Pressoir fermée : « ${dit()} », rien ne se livre`, dit().includes('La Cave du Pressoir est fermée à cette heure-ci. Je repasserai demain matin.') && !J.gestes.actif && !m.attenteBL && m.client('cave').statut === 'chargee']);
      T.ouvrir('tournee');
      log.push(['l\'écran Tournée : les arrêts « Fermé », pas de « Démarrer la tournée », la consigne de la nuit', !q('[data-a="tournee"]') && !q('[data-a^="aller:"]') && document.querySelectorAll('#app .arret .tag').length >= 4 && q('#app').textContent.includes('Fermé') && q('#app .consigne').textContent.startsWith('Il fait nuit')]);
      m.demarrerTournee(); CL.step(5);
      log.push(['la tournée ne se lance pas la nuit (on dit pourquoi)', m.etape === 'journee' && !m.tour.length && dit().includes('la tournée reprend demain matin')]);
      T.fermer();
      // Vitisoft au bureau du chai, la nuit : la DRM du mois dernier
      portable();
      log.push(['au portable, la nuit : l\'icône Vitisoft à ouvrir (la DRM)', J.pc.ouvert && !!q('.pc-ico.conseil[data-a="lancer:vitisoft"]')]);
      clic('[data-a="lancer:vitisoft"]'); clic('[data-a="vue:drm"]'); clic('[data-a="drm"]'); CL.step(100);
      clic('[data-a="vue:accueil"]');
      log.push(['la DRM calculée ; la tuile de la date : mardi 08 décembre', m.drm === 'faite' && B.tuile() === 'mardi 08 décembre']);
      clic('[data-a="quitter"]'); CL.finirGeste(); CL.step(5); sortirBureau();
      log.push([`plus rien à faire seul : « ${obj()} », la balise sur la maison`, obj() === 'Il fait nuit : les clients sont fermés. Rentrez dormir, la tournée reprend demain matin' && m.cible === L.maison && m.nomCible === 'Maison']);
      // on dort : 7 h, le lendemain
      CL.dormir();
      log.push([`7 h, le lendemain : « ${q('#ban-t').textContent} · ${q('#ban-s').textContent} » ; le bureau : « ${m.resume} »`, J.heureTxt === '07:00' && Math.floor(J.minutes) === 1440 + 420 && q('#ban-s').textContent === 'Mercredi 9 décembre, 7 h'
        && m.resume === 'Ce matin : 1 rappel, 2 livraisons, le chèque de l\'Épicerie du Bourg et la visite de l\'Auberge du Moulin.' && T.notif === 'bureau']);
      log.push(['les clients ressortis, à leur place ; Hélène et Julien aussi', CL.clients.liste.every(f => f.etat === 'dehors' && f.p.m.groupe.visible && !f.ferme && Math.hypot(f.p.pos.x - f.l.x, f.p.pos.z - f.l.z) < 0.1) && oeno.etat === 'dehors' && oeno.p.m.groupe.visible && julien.etat === 'dehors']);
      T.ouvrir('accueil');
      log.push([`le téléphone : « ${q('.ph-lieu').textContent} »`, q('.ph-lieu').textContent.startsWith('mercredi 9 décembre')]);
      T.ouvrir('bureau');
      const t = q('#app').textContent;
      log.push(['Ma journée : ce que dit le bureau ce matin ; La Treille silencieuse un jour de plus ; avant 8 h, le bar pas encore (« Dès 8 h »)', t.includes('Ce matin : 1 rappel') && t.includes('rien depuis 39 jours') && t.includes('Trop tôt pour appeler') && !q('[data-a="rappel:bar"]') && [...document.querySelectorAll('#app button[disabled]')].some(b => b.textContent === 'Dès 8 h')]);
      T.fermer();
      log.push([`l'objectif : « ${obj()} »`, obj() === 'Le bureau, écran Tournée : lancez la tournée, ou allez à un arrêt']);
      // la tournée reprend : le chèque, la cave, La Treille, le prospect
      CL.remonter('tracteur');
      T.ouvrir('tournee'); clic('[data-a="tournee"]');
      log.push(['la tournée se lance, le matin : 4 arrêts', m.etape === 'livraisons' && m.tour.length === 4]);
      { const a = L.arrets.epicerie; CL.teleporter(a.x - 3, a.z, Math.PI / 2); CL.step(30); B.geste(); }
      log.push(['le chèque de l\'épicerie', m.retardataire.statut === 'recupere']);
      B.livrer('cave'); B.livrer('treille');
      log.push(['la cave et La Treille livrées', m.client('cave').statut === 'livree' && m.client('treille').statut === 'livree']);
      { const a = L.arrets.auberge; CL.teleporter(a.x, a.z - 4, 0); CL.step(30); }
      CL.agir(); CL.finirGeste(); CL.step(5);
      { const f = L.figurants.auberge; J.joueur.placer(f.x - 1.6, f.z, Math.PI / 2); } CL.step(5); CL.agir();
      for (let n = 0; n < 2400 && m.prospect.statut !== 'a_rappeler'; n++) CL.step(1);
      log.push(['le prospect a goûté, le matin', m.prospect.statut === 'a_rappeler']);
      CL.finirGeste(); CL.step(5);
      const P = CL.sauver();
      log.push([`la partie s'enregistre le lendemain (jour ${Math.floor(P.minutes / 1440)}, ${J.heureTxt})`, !!P && P.minutes > 1440 && P.etat.clients[2].s === 'livree' && P.etat.drm === 'faite']);
    } catch (e) { log.push(['scénario interrompu : ' + e.message + ' ' + (e.stack || '').split('\n')[1], false]); }
    return log;
  }));
  for (const [msg, c] of r1) ok(c, msg);
  // la partie reprise le lendemain : « Continuer »
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await attendre();
  const r2 = await ev(briques).then(() => ev(() => {
    const { q, obj, dit, clic, saisir, auChai, portable } = B, m = CL.mission, J = CL.jeu, T = J.tel, L = J.lieux, log = [];
    try {
      const H0 = CL.SAUVE.partie.minutes;
      q('#jouer').click(); CL.step(30);
      log.push(['« Continuer » le lendemain : le jour, l\'heure, la tournée où elle en était, le bureau dit ce qui reste ce matin', Math.abs(J.minutes - H0) < 1 && J.minutes > 1440 && m.client('cave').statut === 'livree' && m.client('bar').statut === 'a_traiter'
        && m.drm === 'faite' && m.resume.startsWith('Ce matin : 1 rappel') && CL.clients.liste.find(f => f.id === 'cave').etat === 'dedans' && CL.clients.liste.find(f => f.id === 'bar').etat === 'dehors']);
      // 8 h : le bar s'appelle (un message), répond, commande, signe ; on charge, on livre
      for (let n = 0; n < 60 * 130 && J.minutes < 1440 + 8 * 60; n++) CL.step(1);
      T.ouvrir('bureau'); clic('[data-a="rappel:bar"]'); clic('[data-a="msg"]'); T.fermer(); CL.step(400);
      T.ouvrir('bureau'); T.action('cmd:bar'); saisir(2); T.fermer(); CL.step(1500);
      log.push(['8 h : le bar s\'appelle, commande, signe', m.client('bar').statut === 'signee']);
      CL.remonter('tracteur'); auChai(); B.livrer('bar');
      log.push(['le bar livré : tout est fait dehors, retour au bureau du chai', m.client('bar').statut === 'livree' && m.etape === 'retour']);
      portable();
      clic('[data-a="lancer:vitisoft"]'); clic('[data-a="vue:factures"]'); clic('[data-a="ouvrirReg"]'); clic('[data-a="regler"]');
      clic('[data-a="vue:commandes"]');
      for (const id of ['cave', 'bar', 'treille']) { clic(`[data-a="fac:${id}"]`); clic(`[data-a="env:${id}"]`); CL.step(80); }
      clic('[data-a="vue:factures"]');
      const fac = [...document.querySelectorAll('#pc tr')].find(tr => tr.textContent.includes('F-2026-0127'));
      log.push(['Vitisoft : les factures du jour, le 09/12/2026, échéance le 08/01/2027', !!fac && fac.textContent.includes('09/12/2026') && fac.textContent.includes('08/01/2027') && q('#pc .pc-h').textContent.includes('09/12/2026')]);
      clic('[data-a="vue:accueil"]');
      log.push(['la tuile de la date : mercredi 09 décembre', B.tuile() === 'mercredi 09 décembre']);
      clic('[data-a="fermerF:vitisoft"]'); CL.step(560);
      log.push([`la tournée finie le lendemain matin : la carte de fin du jour (« ${q('#fin-texte').textContent.split('DRM. ')[1]} »), la mission 1 gagnée`, !q('#fin').hidden && q('#fin-texte').textContent.includes('c\'est demain') && CL.SAUVE.gagnees.tournee === true]);
      q('#continuer').click(); CL.step(60);
      log.push([`en journée, l'objectif : « ${obj()} »`, obj().startsWith('La journée de traitement, c\'est demain : rentrez dormir')]);
      // la mission 2, le lendemain de la tournée : le jeudi 10 décembre
      if (J.dedans) { const BU = L.bureau; J.joueur.placer(BU.dedans.x + 0.3, BU.dedans.z, -Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5); }
      CL.dormir(); CL.step(100);
      const R = CL.traitement;
      log.push([`la mission 2 au réveil, le lendemain de la tournée : « ${q('#ban-t').textContent} », « ${dit()} »`, R.actif && Math.floor(J.minutes) >= 2 * 1440 + 420 && J.minutes < 2 * 1440 + 430 && q('#ban-t').textContent === 'Jeudi 10 décembre' && dit().includes('Jeudi 10 décembre, le lendemain de la tournée.')]);
      T.ouvrir('accueil');
      log.push([`le téléphone : « ${q('.ph-lieu').textContent} »`, q('.ph-lieu').textContent.startsWith('jeudi 10 décembre')]);
      T.action('fil:claire');
      log.push(['Claire : il fait sec jusqu\'à samedi', q('#app').textContent.includes('il fait sec jusqu\'à samedi')]);
      T.fermer(); CL.step(30);
      // le Registre phyto : une saisie datée du jour, sans l'année
      R.parcelles.find(p => p.id === 'perrieres').traitee = true; R.aller('traiter'); R.prete = true;
      T.ouvrir('phyto'); T.action('rp-nouveau'); T.action('rp-cocher:perrieres'); T.action('rp-suite');
      for (let i = 0; i < 3; i++) T.action('rp-dose:cuivre:1');
      T.action('rp-suite'); T.action('rp-suite'); T.action('rp-cible:Mildiou'); T.action('rp-suite');
      const recap = q('#app').textContent;
      T.action('rp-enregistrer');
      log.push([`le registre : « ${R.registre[0].quand} », « ${R.registre[0].par} », sans l'année`, R.registre[0].quand.startsWith('10 décembre · ') && R.registre[0].par.startsWith('vous, le 10 décembre à') && recap.includes('10 décembre') && !recap.includes('2026') && !q('#app').textContent.includes('2026')]);
      T.fermer();
      // la mission 3, le jour d'après : le vendredi 11 décembre
      CL.versMission3(); CL.step(100);
      log.push([`la mission 3 au réveil : « ${q('#ban-t').textContent} », « ${dit()} »`, CL.habillage.actif && q('#ban-t').textContent === 'Vendredi 11 décembre' && dit().includes('Vendredi 11 décembre. Aujourd\'hui, on habille le Clos 2025')]);
    } catch (e) { log.push(['scénario interrompu : ' + e.message + ' ' + (e.stack || '').split('\n')[1], false]); }
    return log;
  }));
  for (const [msg, c] of r2) ok(c, msg);
  // mission 3 : le labo, Marc et l'imprimerie fermés la nuit ; le matin, tout reprend
  const r3 = await ev(() => {
    const { q, obj, dit } = B, H = CL.habillage, J = CL.jeu, T = J.tel, L = J.lieux, R = J.remorque, log = [];
    const [oeno, julien, marc] = CL.gens3.liste;
    try {
      T.ouvrir('messages'); T.action('fil:imprimerie'); T.fermer(); CL.step(30);
      CL.teleporter(J.carton.x - 1.0, J.carton.z, Math.PI / 2); CL.step(10); CL.agir(); CL.finirGeste(); CL.step(5);
      log.push(['l\'échantillon pris au chai', H.echantillon === 'pris']);
      // 18 h 40 : le labo est fermé
      B.heure(3, 18, 40); CL.step(5);
      CL.remonter('van'); { const a = L.arrets.labo; CL.teleporter(a.x - 3, a.z, Math.PI / 2); CL.step(40); }
      log.push([`18 h 40, au labo : « ${dit()} » ; Hélène est rentrée, l'échantillon reste dans la poche`, dit().includes('Le labo d\'œnologie est fermé à cette heure-ci. J\'y retourne demain matin.') && oeno.etat === 'dedans' && H.echantillon === 'pris' && !J.gestes.actif]);
      log.push([`l'objectif : « ${obj()} », la balise sur la maison`, obj().startsWith('Il fait nuit : le labo d\'œnologie est fermé. Rentrez dormir') && H.cible === L.maison]);
      CL.agir(); CL.finirGeste(); CL.dormir();
      log.push(['7 h, le samedi 12 : Hélène devant son labo', Math.floor(J.minutes) === 4 * 1440 + 420 && oeno.etat === 'dehors' && oeno.p.m.groupe.visible && q('#ban-s').textContent === 'Samedi 12 décembre, 7 h']);
      CL.remonter('van'); { const a = L.arrets.labo; CL.teleporter(a.x - 3, a.z, Math.PI / 2); CL.step(30); } CL.finirGeste(3000); CL.step(60);
      log.push(['le matin, l\'échantillon donné ; Marc prépare la remorque', H.echantillon === 'depose' && marc.etat === 'dehors']);
      CL.step(60 * 26);
      // la fiche Viticode, publiée, le QR code téléchargé ; envoyé à 19 h 40 : l'imprimerie est fermée
      for (const k of ['nom', 'millesime', 'appellation', 'lot']) H.remplir(k);
      H.couleur('Rouge'); for (let i = 0; i < 4; i++) H.degre(1); H.ingredient('raisins'); H.bio(); H.ingredient('sulfites');
      for (let i = 0; i < 8; i++) H.valeur('glucides', 1); for (let i = 0; i < 2; i++) H.valeur('sucres', 1);
      H.calculer(); H.publier(); H.telecharger();
      log.push(['le bulletin arrivé, la fiche publiée', H.bulletin && H.publiee && H.telecharge]);
      B.heure(4, 19, 40); CL.step(10);
      H.envoyer(); CL.step(60 * 8);
      log.push(['19 h 40 : le QR code envoyé, le BAT n\'arrive pas la nuit ; Marc et Julien rentrés', H.envoye && H.bat === 'aucun' && marc.etat === 'dedans' && !marc.p.m.groupe.visible && julien.etat === 'dedans']);
      log.push([`l'objectif : « ${obj()} »`, obj().startsWith('Il fait nuit : Marc est rentré chez lui. Rentrez dormir, il vous aidera à atteler') && H.cible === L.maison]);
      CL.agir(); CL.finirGeste(); CL.remonter('tracteur'); CL.teleporter(-90, -9, 0); CL.step(40);
      log.push([`en tracteur devant le timon : « ${dit()} », pas d'attelage`, dit().includes('Marc est rentré chez lui : on attellera demain matin.') && !J.gestes.actif && !R.attelee]);
      B.silence(); { const D = L.entrepot.depot; CL.teleporter(D.x, D.z + 7, Math.PI); CL.step(40); }
      log.push([`à l'imprimerie : « ${dit()} »`, dit().includes('L\'imprimerie est fermée à cette heure-ci. Je reviendrai demain matin.') && !J.gestes.actif]);
      CL.agir(); CL.finirGeste(); CL.dormir(); CL.step(30);
      log.push(['7 h, le lendemain : le BAT arrive, Marc attend à la remorque, Julien devant l\'imprimerie', H.bat === 'recu' && marc.etat === 'dehors' && marc.p.m.groupe.visible && julien.etat === 'dehors' && julien.p.m.groupe.visible]);
      H.accord(); CL.step(10);
      CL.remonter('tracteur'); CL.teleporter(-90, -9, 0); CL.step(40);
      log.push(['le matin, en tracteur devant le timon : Marc attelle', J.gestes.actif && H.occupe]);
      CL.finirGeste(4000); CL.step(10);
      log.push(['attelée', R.attelee && H.attelee]);
    } catch (e) { log.push(['scénario interrompu : ' + e.message + ' ' + (e.stack || '').split('\n')[1], false]); }
    return log;
  });
  for (const [msg, c] of r3) ok(c, msg);
}

if (scenario === 'restaurateurs') {
  // Les restaurateurs du coin (restaurateurs.js) : rien dans le bureau avant d'aller les voir ; « Présenter nos vins » près
  // d'un tenancier ; pas le temps pendant son coup de feu ; la dégustation (le verre servi), sa note dans le bureau, la
  // ligne « Hors mission » ; une relance plus tard, jamais pendant un appel de mission ; l'appel, la commande (mauvaise
  // quantité refusée), signée en ligne, dans Vitisoft ; une autre pas signée, relancée, refusée ; « la semaine prochaine » ;
  // l'état sauvegardé puis repris (la page rechargée) ; la mission 1 se joue toujours
  const visiter = id => ev(id => {
    const R = CL.restos, r = R.get(id), J = CL.jeu;
    J.minutes = Math.floor(J.minutes / 1440) * 1440 + 15 * 60; CL.step(2); // (l'après-midi : ils sont là, et pas dans leur coup de feu)
    CL.teleporter(r.L.x + Math.sin(r.L.h) * 1.8, r.L.z + Math.cos(r.L.h) * 1.8, r.L.h + Math.PI); CL.step(90);
    const etq = [...document.querySelectorAll('.etiquette.action')].find(e => !e.hidden && e.textContent.startsWith('Présenter nos vins'));
    const avant = { presentable: R.presentable === r, etiquette: !!etq };
    CL.agir(); for (let i = 0; i < 2400 && r.visite === 'parle'; i++) CL.step(1);
    CL.step(2); const servable = r.p.servable && CL.jeu.joueur && !!document.querySelector('.etiquette.action:not([hidden])');
    CL.agir(); for (let i = 0; i < 3000 && r.statut === 'inconnu'; i++) CL.step(1);
    return { ...avant, servable, statut: r.statut, gout: r.gout, note: r.gout ? r.F.notes[r.gout] : '', reste: Math.round(r.tRel - J.minutes) };
  }, id);
  // l'appel d'un restaurateur (la relance arrivée) : jusqu'au bout de la conversation
  const appeler = id => ev(id => {
    const R = CL.restos, r = R.get(id), T = CL.jeu.tel;
    T.ouvrir('bureau'); T.action('r-appel:' + id); CL.step(5);
    const ecran = T.app, ligne = CL.mission.appelEnCours;
    for (let i = 0; i < 4000 && r.statut === 'appel'; i++) CL.step(1);
    return { ecran, ligne, statut: r.statut, app: T.app, demande: r.demande, numero: r.numero };
  }, id);
  const relance = id => ev(id => {
    const R = CL.restos, r = R.get(id), T = CL.jeu.tel;
    // (l'heure de la relance, ou le lendemain à 9 h si elle tombe le soir : le bureau ne relance que pendant leurs heures)
    let t = Math.max(CL.jeu.minutes, r.tRel) + 1; const h = t % 1440;
    if (h < 540 || h >= 1170) t = (Math.floor(t / 1440) + (h >= 1170 ? 1 : 0)) * 1440 + 541;
    T.fermer(); T.notifier(null); CL.jeu.minutes = t; CL.step(20);
    const st = r.statut; CL.step(60 * 4);
    return { st, notif: T.notif, resto: !!T.notifResto, msg: R.message };
  }, id);
  const r1 = await ev(() => {
    const q = s => document.querySelector(s), R = CL.restos, T = CL.jeu.tel, log = [];
    CL.jouer(); CL.step(260);
    log.push(['huit restaurateurs, chacun sa place (quatre devantures au bourg, le relais, trois au château)', R.liste.length === 8 && R.liste.every(r => r.L && Number.isFinite(r.L.x)) && ['mariniers', 'bellavigna', 'paulette', 'clemence', 'croisee'].every(id => CL.jeu.lieux.portes[id])]);
    T.ouvrir('bureau');
    log.push(['avant d\'aller les voir : rien dans le bureau, ni dans l\'app Missions, ni balise', !q('#app').textContent.includes('Restaurateurs rencontrés') && !T.missions().includes('Hors mission') && R.liste.every(r => r.statut === 'inconnu') && !R.file.length]);
    T.fermer();
    // le coup de feu de midi : Bernard n'a pas le temps (repassez)
    CL.jeu.minutes = 12 * 60 + 30; CL.step(2);
    const r = R.get('mariniers');
    CL.teleporter(r.L.x, r.L.z + 1.8, Math.PI); CL.step(120);
    CL.agir(); CL.step(30);
    log.push(['à midi et demi, Bernard est dans son coup de feu : « repassez », rien dans le bureau', r.statut === 'inconnu' && r.visite === null && CL.jeu.hud.ligne && /Repassez/.test(CL.jeu.hud.ligne.txt)]);
    for (let i = 0; i < 600 && CL.jeu.hud.parle; i++) CL.step(1);
    CL.jeu.minutes = 15 * 60; CL.step(2);
    return log;
  });
  for (const [msg, c] of r1) ok(c, msg);
  {
    const v = await visiter('mariniers');
    ok(v.presentable && v.etiquette, '« Présenter nos vins » sur Bernard, à pied, tout près');
    ok(v.servable && v.statut === 'rencontre' && v.reste >= 60 && v.reste <= 150, `il demande à goûter, on lui sert un verre ; noté dans le bureau (${v.gout} : « ${v.note} »), relance dans ${v.reste} min de jeu`);
  }
  await capture('resto-visite');
  const r2 = await ev(() => {
    const q = s => document.querySelector(s), R = CL.restos, T = CL.jeu.tel, log = [];
    T.ouvrir('bureau');
    log.push(['le bureau : la rubrique des restaurateurs rencontrés, sa note ; l\'app Missions : « Hors mission », 1 sur 8', q('#app').textContent.includes('Restaurateurs rencontrés') && q('#app').textContent.includes('Brasserie des Mariniers') && T.missions().includes('Hors mission') && T.missions().includes('1 sur 8')]);
    T.fermer();
    return log;
  });
  for (const [msg, c] of r2) ok(c, msg);
  // pas de relance pendant un appel de la tournée : l'appel de la Cave du Pressoir ; la relance arrive après
  {
    const a = await ev(() => {
      const R = CL.restos, r = R.get('mariniers'), T = CL.jeu.tel, m = CL.mission;
      T.ouvrir('bureau'); document.querySelector('[data-a="rappel:cave"]').click(); CL.step(5);
      CL.jeu.minutes = r.tRel + 1; CL.step(60 * 5);
      const pendant = { appel: m.appelEnCours, statut: r.statut, resto: !!T.notifResto, msg: R.message };
      for (let i = 0; i < 2000 && m.appelEnCours; i++) CL.step(1);
      // la commande de la cave, préparée (la mission continue) ; le téléphone refermé : la relance arrive
      for (let k = 0; k < 6; k++) document.querySelector('[data-a="qte:1"]').click();
      document.querySelector('[data-a="signer"]').click();
      T.fermer(); CL.step(60 * 4);
      return { pendant, cave: m.client('cave').statut, notif: T.notif, resto: !!T.notifResto, msg: R.message };
    });
    ok(a.pendant.appel === 'cave' && a.pendant.statut === 'a_rappeler' && !a.pendant.resto && !a.pendant.msg, 'pendant l\'appel de la Cave du Pressoir, la relance est due mais rien ne la notifie');
    ok(a.cave === 'envoyee' && a.notif === 'bureau' && a.resto && /Brasserie des Mariniers : à rappeler/.test(a.msg), `la mission 1 continue (commande de la cave envoyée) ; l'appel fini, la relance arrive : « ${a.msg} »`);
  }
  await ev(() => { CL.jeu.tel.ouvrir('accueil'); });
  await capture('resto-relance');
  {
    const c = await appeler('mariniers');
    ok(c.ecran === 'appel' && c.ligne === 'resto:mariniers' && c.statut === 'rencontre' && c.app === 'bureau', 'l\'appel de Bernard (l\'écran d\'appel) : « rappelez-moi la semaine prochaine », une nouvelle relance plus tard');
    const t = await ev(() => { const r = CL.restos.get('mariniers'); return { motif: r.motif, lendemain: Math.floor(r.tRel / 1440) > Math.floor(CL.jeu.minutes / 1440) }; });
    ok(t.motif === 'plusTard' && t.lendemain, 'la relance d\'après : le lendemain, dans la matinée');
  }
  // la pizzeria : commande signée
  await ev(() => { CL.jeu.tel.fermer(); CL.jeu.tel.notifier(null); });
  {
    const v = await visiter('bellavigna');
    ok(v.statut === 'rencontre', `Enzo, à la pizzeria : la dégustation, noté (${v.gout})`);
    const n = await relance('bellavigna');
    ok(n.st === 'a_rappeler' && n.notif === 'bureau' && n.resto, 'sa relance : « ' + n.msg + ' »');
    const c = await appeler('bellavigna');
    ok(c.statut === 'commande' && c.app === 'restoCmd' && c.numero === 'C-1197', `l'appel finit par une commande (${c.demande} cartons), préparée pendant l'appel : ${c.numero}`);
  }
  await capture('resto-commande');
  {
    const s = await ev(() => {
      const q = s => document.querySelector(s), R = CL.restos, r = R.get('bellavigna'), T = CL.jeu.tel;
      const zero = r.cartons === 0 && q('[data-a="r-signer"]').disabled && q('.consigne').textContent.includes(`a demandé ${r.demande} carton`);
      q('[data-a="r-qte:1"]').click(); q('[data-a="r-signer"]').click();
      const refus = r.statut === 'commande';
      for (let k = 1; k < r.demande; k++) q('[data-a="r-qte:1"]').click();
      q('[data-a="r-signer"]').click();
      const envoyee = r.statut === 'envoyee' && q('#app').textContent.includes('sans créer de compte');
      T.fermer(); for (let i = 0; i < 4000 && r.statut === 'envoyee'; i++) CL.step(1);
      const P = CL.jeu.pc; P.lancer('vitisoft'); P.vue = 'commandes'; P.afficher();
      const vs = q('#pc-ecran .vs').textContent; P.ouvertes = []; P.fenetre = null;
      T.ouvrir('bureau');
      return { zero, refus, envoyee, statut: r.statut, vitisoft: vs.includes('C-1197') && vs.includes('Pizzeria Bella Vigna'), note: q('#app').textContent.includes('Elle part dans Vitisoft sans ressaisie') };
    });
    ok(s.zero && s.refus, 'la quantité part de zéro (la consigne rappelle ce qu\'il a dit) ; une mauvaise quantité est refusée');
    ok(s.envoyee && s.statut === 'signee', 'envoyée pour signature (un lien personnel, sans compte), signée en ligne un moment après');
    ok(s.vitisoft && s.note, 'signée, elle est dans Vitisoft (Liste des commandes / BL) sans ressaisie ; le bureau le dit');
  }
  await capture('resto-signee');
  // le relais routier : la commande pas signée, relancée, refusée au téléphone
  await ev(() => { CL.jeu.tel.fermer(); CL.jeu.tel.notifier(null); });
  {
    const v = await visiter('croisee');
    ok(v.statut === 'rencontre', `Gégé, au Relais de la Croisée : la dégustation, noté (${v.gout})`);
    await relance('croisee');
    const c = await appeler('croisee');
    ok(c.statut === 'commande', 'il commande au téléphone (' + c.demande + ' cartons, ' + c.numero + ')');
    const s = await ev(() => {
      const q = s => document.querySelector(s), R = CL.restos, r = R.get('croisee'), T = CL.jeu.tel;
      for (let k = 0; k < r.demande; k++) q('[data-a="r-qte:1"]').click();
      q('[data-a="r-signer"]').click(); T.fermer();
      let attente = 0; for (let i = 0; i < 6000 && r.statut === 'envoyee'; i++) { CL.step(1); attente++; }
      return { statut: r.statut, attente: Math.round(attente / 60) };
    });
    ok(s.statut === 'nonSignee' && s.attente >= 45, `pas signée : restée en attente ${s.attente} s, puis « Pas signée » dans le bureau`);
    const n = await relance('croisee');
    ok(n.st === 'a_rappeler' && /n'a pas signé la commande/.test(n.msg), 'le bureau propose de le relancer : « ' + n.msg + ' »');
    const c2 = await appeler('croisee');
    ok(c2.statut === 'refusee', 'au téléphone, il refuse poliment : « Pas cette fois »');
  }
  // la sauvegarde : la page rechargée, tout est repris (même sans « Continuer »)
  const avant = await ev(() => { CL.sauver(); return CL.restos.liste.map(r => r.id + ':' + r.statut).join(','); });
  await page.reload({ waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.CL && !document.querySelector('#jouer').disabled, { timeout: 60000 });
  {
    const r = await ev(() => {
      CL.jouer(); CL.step(60);
      const R = CL.restos, T = CL.jeu.tel; T.ouvrir('bureau');
      const txt = document.querySelector('#app').textContent;
      return { apres: R.liste.map(r => r.id + ':' + r.statut).join(','), bureau: txt.includes('Restaurateurs rencontrés') && txt.includes('Relais de la Croisée'), missions: T.missions().includes('3 sur 8'), mariniers: Math.round(R.get('mariniers').tRel - CL.jeu.minutes) };
    });
    ok(r.apres === avant && r.bureau && r.missions && r.mariniers > 0, `la page rechargée : les restaurateurs repris tels quels (${r.apres}), la relance de Bernard dans ${r.mariniers} min`);
  }
  // la mission 1 se joue toujours : ses rappels, une commande envoyée
  {
    const m = await ev(() => {
      const q = s => document.querySelector(s), m = CL.mission, T = CL.jeu.tel;
      T.ouvrir('bureau'); q('[data-a="rappel:treille"]').click(); for (let i = 0; i < 2000 && m.appelEnCours; i++) CL.step(1);
      for (let k = 0; k < 3; k++) q('[data-a="qte:1"]').click(); q('[data-a="signer"]').click();
      return m.client('treille').statut;
    });
    ok(m === 'envoyee', 'la mission 1 se joue toujours : La Treille appelée, sa commande envoyée');
  }
}

if (scenario === 'diversite') {
  // La diversité des adultes (perso.js : tirerApparence) : tout le monde créé (le bourg, le village du château, les 22 de
  // Solumatic, les conducteurs, les ouvriers, les clients), puis leurs traits comptés : des teints de très clair à très
  // foncé, toutes les coiffures, des femmes une fois sur deux, des aînés (voûtés, une canne), des barbes, des manteaux et
  // des doudounes, des couvre-chefs dont le foulard ; des triangles sous un plafond
  const r = await ev(() => {
    CL.jouer(); CL.step(30);
    if (!CL.village.prepare) CL.village.preparer();
    while (CL.village.file.length) CL.village.file.shift()();
    while (CL.solu.n < CL.solu.L.gens.length) CL.solu.creer();
    CL.step(2);
    const ms = new Set(), tris = [];
    const voir = p => { if (p && p.m && p.m.traits && !ms.has(p.m)) { ms.add(p.m); tris.push(p.m.maillage.geometry.index.count / 3); } };
    for (const p of CL.passants()) voir(p);
    for (const g of CL.village.gens) voir(g.p);
    for (const g of CL.solu.gens) voir(g.p);
    for (const v of CL.voitures()) voir(v.conducteur);
    for (const w of [...CL.parvis.ouvriers, ...CL.tonnellerie.ouvriers, ...CL.gens3.liste, ...CL.clients.liste]) voir(w.p);
    const T = [...ms].map(m => m.traits), lum = c => { const x = parseInt(c.slice(1), 16); return (0.3 * (x >> 16) + 0.59 * ((x >> 8) & 255) + 0.11 * (x & 255)) / 255; };
    const n = f => T.filter(f).length, kinds = f => [...new Set(T.map(f).filter(Boolean))];
    // une apparence d'enfant (pour l'école) : ni barbe, ni foulard, ni canne, ni cheveux gris
    let enfantOk = true;
    const lcg = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; // (outils.js : hasard)
    for (let s = 1; s < 200; s++) { const a = CL.tirerApparence(lcg(s * 7919), { enfant: true, hiver: true, canne: true }); if (a.barbe || a.foulard || a.canne || a.voute || /#(6e6a66|9a9894|b9b6b0|dedbd4)/.test(a.cheveux)) enfantOk = false; }
    return { n: T.length, tris, teints: kinds(t => t.peau).length, fonces: n(t => lum(t.peau) < 0.42), tresFonces: n(t => lum(t.peau) < 0.3), clairs: n(t => lum(t.peau) > 0.75),
      coiffures: kinds(t => !t.foulard && t.coiffure), foulards: n(t => t.foulard), femmes: n(t => t.femme), aines: n(t => t.age === 'aine'), jeunes: n(t => t.age === 'jeune'),
      voutes: n(t => t.voute), cannes: n(t => t.canne), barbes: kinds(t => t.barbe === true ? 'courte' : t.barbe), tenues: kinds(t => t.tenue), echarpes: n(t => t.echarpe),
      chapeaux: kinds(t => t.chapeau), gris: n(t => /#(6e6a66|9a9894|b9b6b0|dedbd4)/.test(t.cheveux)), enfantOk };
  });
  const moy = r.tris.reduce((a, b) => a + b, 0) / r.tris.length, max = Math.max(...r.tris);
  console.log(`${r.n} personnes : ${r.femmes} femmes, ${r.jeunes} jeunes, ${r.aines} aînés (${r.voutes} voûtés, ${r.cannes} cannes), ${r.teints} teints (${r.clairs} clairs, ${r.fonces} foncés dont ${r.tresFonces} très foncés)`);
  console.log(`coiffures : ${r.coiffures.join(', ')} ; ${r.foulards} foulards ; barbes : ${r.barbes.join(', ')} ; tenues : ${r.tenues.join(', ')} ; ${r.echarpes} écharpes ; couvre-chefs : ${r.chapeaux.join(', ')}`);
  ok(r.n >= 83, 'tout le monde est compté (' + r.n + ' personnes)'); // (chez Solumatic, l'équipe : 22, au lieu de 34 figurants)
  ok(r.teints >= 12 && r.clairs >= 5 && r.fonces >= 10 && r.tresFonces >= 4, 'des teints du très clair au très foncé : ' + r.teints + ' teints, ' + r.clairs + ' clairs, ' + r.fonces + ' foncés, ' + r.tresFonces + ' très foncés');
  const TOUTES = ['court', 'chauve', 'chignon', 'queue', 'long', 'carre', 'afro', 'crepu', 'degrade', 'tresses', 'locks', 'boucles', 'rase'];
  ok(TOUTES.every(c => r.coiffures.includes(c)) && r.foulards >= 2, 'toutes les coiffures sont dans le monde, et des foulards (' + r.foulards + ') ; manque : ' + (TOUTES.filter(c => !r.coiffures.includes(c)).join(', ') || 'rien'));
  ok(r.femmes / r.n > 0.4 && r.femmes / r.n < 0.6, 'des femmes une fois sur deux (' + Math.round(100 * r.femmes / r.n) + ' %)');
  ok(r.aines / r.n > 0.12 && r.jeunes / r.n > 0.12 && r.voutes >= 3 && r.cannes >= 1 && r.gris >= 8, 'des jeunes et des aînés (' + r.gris + ' aux cheveux gris ou blancs, ' + r.voutes + ' voûtés, ' + r.cannes + ' avec une canne)');
  ok(['courte', 'pleine', 'bouc', 'moustache'].every(b => r.barbes.includes(b)), 'des barbes : courte, pleine, bouc, moustache');
  ok(['manteau', 'doudoune'].every(t => r.tenues.includes(t)) && r.echarpes >= 4 && r.chapeaux.length >= 4, 'décembre : manteaux, doudounes, ' + r.echarpes + ' écharpes, ' + r.chapeaux.length + ' sortes de couvre-chefs');
  ok(max <= 4800 && moy <= 4500, 'triangles par personnage : ' + Math.round(moy) + ' en moyenne, ' + max + ' au plus (plafonds 4 500 et 4 800 : les visages, les mains à doigts, 27/11/2026)');
  ok(r.enfantOk, 'une apparence d\'enfant : ni barbe, ni foulard, ni canne, ni dos voûté, ni cheveux gris');
  // de près, quelques visages de tous les teints au soleil, et la place
  await ev(() => {
    const H = -0.55, fx = Math.sin(H), fz = Math.cos(H), px = Math.cos(H), pz = -Math.sin(H), X = -108, Z = -58;
    const lcg = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const L = [0, 3, 6, 9, 12, 14, 16].map((t, i) => CL.tirerApparence(lcg(7 + i * 7919), { teint: t, age: 'adulte', hiver: true, couvreChef: false, foulard: i === 4, femme: i === 4 || undefined }));
    L.forEach((o, i) => { const p = new CL.Pieton(CL.perso(o)); CL.scene.add(p.m.groupe); const k = (i - 3) * 0.6; p.placer(X + px * k, Z + pz * k, H); p.sync(0, 0); for (let j = 0; j < 20; j++) p.sync(1 / 60, j / 60); });
    CL.photo(X + fx * 2.6, 1.62, Z + fz * 2.6, X, 1.45, Z); CL.step(2);
  });
  await capture('visages');
  await ev(() => { CL.photo(); CL.jeu.minutes = 14 * 60; CL.teleporter(100, -36, Math.PI); CL.step(60 * 4); CL.photo(98, 2.4, -14, 94, 1.2, -30); CL.step(2); });
  await capture('place');
}

if (scenario === 'chien') {
  // le chien du domaine (Teddy, 26/11/2026) : il se balade dans la cour ; un véhicule lancé sur lui (couché, debout, assis ;
  // en tracteur, en van, mené par un geste ; en mode WTF aussi) : il se lève et part au galop, jamais dans l'emprise du
  // véhicule ; on le caresse (l'étiquette, le geste à genoux, la main sur lui ; couché, il se met sur le dos) ; la nuit il est
  // rentré, invisible ; le matin il ressort ; il ne gêne ni le tracteur (geste, chemin du hangar) ni la tournée
  const r = await ev(async () => {
    const J = CL.jeu, C = CL.chien, log = [];
    const etq = t => [...document.querySelectorAll('.etiquette.action')].some(e => !e.hidden && e.textContent.startsWith(t));
    // l'écart (m) entre le corps du chien (poitrail, milieu, arrière-train) et l'emprise du véhicule v ; négatif : dedans
    const ecart = v => {
      const h = v.p.h, c = Math.cos(h), s = Math.sin(h), fx = Math.sin(C.h), fz = Math.cos(C.h);
      let m = 1e9;
      for (const o of [0.42, 0, -0.45]) {
        const dx = C.x + fx * o - v.p.pos.x, dz = C.z + fz * o - v.p.pos.z, x = dx * c - dz * s, z = dx * s + dz * c;
        for (const [x0, x1, z0, z1] of v.m.dims.emprise) {
          const ex = Math.max(x0 - x, 0, x - x1), ez = Math.max(z0 - z, 0, z - z1);
          m = Math.min(m, ex || ez ? Math.hypot(ex, ez) : -Math.min(x - x0, x1 - x, z - z0, z1 - z));
        }
      }
      return m;
    };
    // le chien posé en (x, z), cap h, dans une posture (0 debout, 1 assis, 2 couché), tranquille
    const poser = (x, z, h, p) => {
      C.x = x; C.z = z; C.h = h; C.v = 0; C.cible = false; C.menace = false;
      if (p === 2) C.coucher({ x, z, h, p: 0 }, true); else { C.faire(p ? 'assis' : 'debout', 60); C.W.fill(0); C.W[p] = 1; C.post = p; C.file.length = 0; }
      C.duree = 60; C.replacerPieds(); CL.step(30);
    };
    // un véhicule lancé sur lui : on monte, on le pose à d m, droit sur le chien, à fond pendant n images ; rend l'écart le
    // plus petit, s'il a fui, en combien de temps il s'est levé (depuis qu'il fuit), la vitesse du véhicule au plus près
    const foncer = (genre, d, n = 300, recul = false) => {
      // (sur l'allée, du portail vers le chai : il arrive du sud, cap au nord ; en marche arrière, du nord. On monte loin du
      // chien : sinon « Caresser le chien » passe avant « Monter »)
      const v = CL.vehicule(genre), sg = recul ? -1 : 1;
      if (J.auVolant) { CL.agir(); CL.finirGeste(); }
      v.p.placer(C.x, C.z + sg * (d + 6), Math.PI); CL.teleporter(C.x - 2.4, C.z + sg * (d + 6), 0); CL.step(3); CL.agir(); CL.finirGeste();
      if (!J.auVolant || J.veh !== v) throw new Error('pas monté dans ' + genre);
      CL.tr.placer(C.x, C.z + sg * d, Math.PI); CL.step(2);
      let mini = 1e9, fui = -1, leve = -1, t = 0, vp = 0;
      const couche = C.W[0] < 0.2;
      CL.ctrl.ky = recul ? 1 : -1;
      for (let i = 0; i < n; i++) {
        CL.step(1); t += 1 / 60;
        const e = ecart(v); if (e < mini) { mini = e; vp = Math.abs(v.p.v); }
        if (C.etat === 'fuit' && fui < 0) fui = t;
        if (couche && fui >= 0 && leve < 0 && C.W[0] > 0.6) leve = t - fui;
      }
      // on freine jusqu'à l'arrêt, on descend
      for (let i = 0; i < 300 && Math.abs(CL.tr.v) > 0.2; i++) { CL.ctrl.ky = CL.tr.v > 0 ? 1 : -1; CL.step(1); }
      CL.ctrl.ky = 0; CL.step(10);
      CL.agir(); CL.finirGeste(); CL.step(5);
      if (J.auVolant) throw new Error('pas descendu de ' + genre);
      return { mini, fui: fui >= 0, leve, couche, vmax: vp };
    };
    try {
      CL.jouer(); CL.step(120);
      log.push(['le chien est là, dehors, dessiné (' + C.m.nTri + ' triangles, ' + C.m.os.length + ' os)', C.dehors && C.g.visible && C.m.nTri < 9000 && !!CL.scene.getObjectByName('chien')]);
      // il se balade : trois minutes de jeu, le joueur loin (sur la route)
      CL.teleporter(-60, 10, 0); CL.step(5); CL.teleporter(-92, -36, 0); CL.step(5);
      { const etats = new Set(), postures = new Set(); let chemin = 0, x0 = C.x, z0 = C.z, dehors = 0, chai = 0;
        for (let i = 0; i < 60 * 180; i++) {
          CL.step(1);
          etats.add(C.etat); postures.add(C.dominante()); chemin += Math.hypot(C.x - x0, C.z - z0); x0 = C.x; z0 = C.z;
          if (C.x < -113.1 || C.x > -76.2 || C.z < -71.1 || C.z > -34.4) dehors++;
          if (C.x > -76.2 && C.z > -65 && C.z < -39) chai++;
        }
        log.push([`il se balade dans la cour : ${chemin.toFixed(0)} m en 3 min, ${etats.size} activités (${[...etats].join(', ')}), ${postures.size} postures`, chemin > 25 && etats.size >= 4 && postures.size >= 2]);
        log.push(['il ne sort pas de la cour, n\'entre pas dans le chai', dehors === 0 && chai === 0]); }
      // un véhicule lancé sur lui : couché, debout, assis ; en tracteur, en van ; en mode WTF aussi
      for (const [genre, p, wtf, d] of [['tracteur', 2, false, 16], ['tracteur', 0, false, 14], ['tracteur', 1, false, 12], ['van', 2, false, 22], ['van', 0, true, 18], ['tracteur', 2, true, 9], ['van', 1, true, 6]]) {
        J.wtf = wtf; poser(-90, -44, Math.PI * 0.8, p);
        const r = foncer(genre, d);
        const nom = ['debout', 'assis', 'couché'][p];
        log.push([`${genre} lancé sur lui (${nom}, à ${d} m${wtf ? ', mode WTF' : ''}, ${r.vmax.toFixed(1)} m/s au plus près) : ${r.fui ? 'il fuit' : 'il ne fuit pas'}${r.couche ? ', debout en ' + r.leve.toFixed(2) + ' s' : ''}, jamais dans l'emprise (au plus près ${r.mini.toFixed(2)} m)`, r.fui && r.mini > 0.25 && (!r.couche || (r.leve >= 0 && r.leve < 0.6))]);
      }
      J.wtf = false;
      // en marche arrière
      { poser(-90, -44, 0, 2); const r = foncer('tracteur', 5, 360, true); log.push([`tracteur en marche arrière sur lui (${r.vmax.toFixed(1)} m/s) : il fuit, au plus près ${r.mini.toFixed(2)} m`, r.fui && r.mini > 0.25]); }
      // un véhicule mené par un geste (comme l'entrée au chai) : le tracteur roule tout seul sur un chemin qui passe sur lui
      {
        const v = CL.vehicule('tracteur'); poser(-88, -40, 0, 2);
        const pts = []; for (let i = 0; i <= 60; i++) pts.push([-88 - 12 + i * 0.4, -40]);
        v.p.placer(pts[0][0], pts[0][1], Math.PI / 2);
        J.gestes.lancer([J.gestes.rouler(v, pts, 3.5)]);
        let mini = 1e9, fui = false;
        for (let i = 0; i < 300 && J.gestes.actif; i++) { CL.step(1); mini = Math.min(mini, ecart(v)); if (C.etat === 'fuit') fui = true; }
        J.gestes.g = null; J.gestes.roule = false; v.p.v = 0; CL.step(30);
        log.push([`un tracteur mené par un geste passe sur lui : il fuit, au plus près ${mini.toFixed(2)} m`, fui && mini > 0.25]);
      }
      // garde-fou : posé dans l'emprise d'un véhicule (arrêté), il en est sorti aussitôt
      { const v = CL.vehicule('van'); poser(v.p.pos.x, v.p.pos.z, 0, 0); CL.step(2); log.push([`posé sous le van, il en est sorti (écart ${ecart(v).toFixed(2)} m)`, ecart(v) > 0]); }
      // le caresser : debout ou assis, il s'assoit devant nous ; couché, il se met sur le dos
      // (couché, il se met sur le dos sept fois sur dix : son tirage au sort, imposé ici pour essayer les deux)
      for (const [p, sorte] of [[0, 0.5], [2, 0.1], [2, 0.9]]) {
        poser(-95, -40, 0, p); CL.teleporter(C.x + 0.9, C.z + 0.9, -2.4); CL.step(20);
        const propose = etq('Caresser le chien'), rnd = C.rnd;
        C.rnd = () => sorte; CL.agir(); C.rnd = rnd; CL.step(2);
        const surLeDos = C.caresse.dos;
        let genou = 0, main = 9, dos = 0, leche = 0;
        for (let i = 0; i < 600 && J.gestes.actif; i++) {
          CL.step(1);
          const k = CL.joueur.caresse; if (k) genou = Math.max(genou, k.w);
          if (k && k.w > 0.9) { const m = CL.joueur.m.os[9]; const w = m.getWorldPosition(C.teteMonde.clone()); main = Math.min(main, Math.hypot(w.x - C.teteMonde.x, w.z - C.teteMonde.z) - (C.caresse.dos ? 0.3 : 0)); }
          dos = Math.max(dos, C.W[4]); leche = Math.max(leche, C.leche);
        }
        CL.step(10);
        log.push([`le caresser (${!p ? 'debout : il s\'assoit, lèche la main' : surLeDos ? 'couché : il se met sur le dos' : 'couché : il reste couché, lèche la main'}) : « Caresser le chien », à genoux (${genou.toFixed(2)}), la main sur lui (${main.toFixed(2)} m), le geste fini`, propose && genou > 0.95 && main < 0.4 && !J.gestes.actif && !CL.joueur.caresse && (surLeDos ? dos > 0.8 : leche > 0.5) && surLeDos === (p === 2 && sorte < 0.5) && C.etat !== 'caresse']);
      }
      // la nuit : le soir, il rentre à la maison par la porte (invisible) ; le matin, il ressort
      {
        C.faire('debout', 5); J.minutes = Math.floor(J.minutes / 1440) * 1440 + 1194; CL.teleporter(-96, -52, 0); CL.step(5);
        let rentre = false; for (let i = 0; i < 60 * 90 && !rentre; i++) { CL.step(1); rentre = C.etat === 'dedans'; }
        log.push([`le soir (${J.heureTxt}), il rentre à la maison par la porte : invisible`, rentre && !C.g.visible && !C.dehors && Math.abs(C.x + 100) < 0.6]);
        J.minutes += 120; CL.step(30);
        log.push(['la nuit (' + J.heureTxt + '), il est dedans', !C.dehors && !C.g.visible && !etq('Caresser le chien')]);
        J.minutes = (Math.floor(J.minutes / 1440) + 1) * 1440 + 400; CL.step(10);
        log.push(['6 h 40 : encore dedans', !C.dehors && !C.g.visible]);
        let sorti = false; for (let i = 0; i < 60 * 100 && !sorti; i++) { CL.step(1); sorti = C.dehors && C.g.visible; }
        CL.step(60 * 4);
        log.push([`le matin (${J.heureTxt}), il ressort de la maison`, sorti && C.dehors && C.z > -59.5]);
        // on dort (le soir, lui dehors) : au réveil (7 h), il est dedans ; il sort peu après
        J.minutes = Math.floor(J.minutes / 1440) * 1440 + 1080; CL.step(10);
        CL.teleporter(-100, -56.8, Math.PI); CL.step(20); CL.agir(); CL.finirGeste(); CL.step(5);
        log.push(['rentré dormir à 18 h : au réveil (' + J.heureTxt + '), il est encore dedans', J.heureTxt === '07:00' && !C.dehors && !C.g.visible]);
      }
      // il ne gêne pas le tracteur : couché sur le chemin du hangar, le tracteur y passe (mené par un geste) sans choc
      {
        J.minutes = Math.floor(J.minutes / 1440) * 1440 + 600; CL.step(5); C.sortir(); CL.step(60 * 3);
        const v = CL.vehicule('tracteur'); poser(-80.4, -64.5, 0, 2);
        const P = [[-73.75, -84.5], [-73.75, -79.0], [-74.2, -75.6], [-77.0, -72.8], [-79.6, -68.5], [-80.4, -64.0], [-82.0, -60.0], [-86.5, -56], [-86.5, -50.6]], pts = [];
        for (let i = 1; i < P.length; i++) for (let k = 0; k < 10; k++) pts.push([P[i - 1][0] + (P[i][0] - P[i - 1][0]) * k / 10, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k / 10]);
        pts.push(P[P.length - 1]);
        v.p.placer(-73.75, -84.5, 0);
        J.gestes.lancer([J.gestes.rouler(v, pts, 6)]);
        let mini = 1e9, chocs = 0;
        for (let i = 0; i < 500 && J.gestes.actif; i++) { CL.step(1); mini = Math.min(mini, ecart(v)); if (v.p.chocVu > 0.15) chocs++; }
        const fini = !J.gestes.actif && Math.hypot(v.p.pos.x + 86.5, v.p.pos.z + 50.6) < 0.5;
        log.push([`le tracteur passe sur le chemin du hangar où il était couché : il s'écarte (au plus près ${mini.toFixed(2)} m), le tracteur arrive sans choc`, fini && chocs === 0 && mini > 0.25]);
      }
    } catch (e) { log.push(['scénario interrompu : ' + e.message + ' ' + e.stack, false]); }
    return log;
  });
  for (const [msg, c] of r) ok(c, msg);
}

if (scenario === 'velos') {
  // les vélos et les cyclistes (velos.js) : ils roulent sur leurs chemins ; les pieds sur les pédales ; une voiture ralentit
  // derrière un cycliste et le double de loin ; bloqué par le joueur, il freine, sonne, met pied à terre, le contourne ; un
  // véhicule lancé sur lui : il s'écarte ou saute, jamais touché (mode WTF compris) ; les vélos garés ; la conduite
  // assistée double un cycliste sans choc ; le phare la nuit
  const r = await ev(() => {
    const log = [], V = CL.velos, J = CL.jeu, C = V.cyclistes, V3 = CL.camera.position.constructor;
    CL.jouer(); CL.step(120);
    // la caméra suit un cycliste (il est créé en approchant : le vélo, puis le cycliste)
    const suivre = (c, n, dx = 2.6, dy = 1.1) => { for (let k = 0; k < n; k++) { const s = Math.sin(c.h), co = Math.cos(c.h); CL.photo(c.x + co * dx, c.y + dy, c.z - s * dx, c.x, c.y + 0.8, c.z); CL.step(1); } };
    const loinVoitures = () => { for (const w of CL.voitures()) w.x = w.sens > 0 ? -330 : 330; };
    // 1. ils roulent, sur leurs chemins
    const p0 = C.map(c => [c.x, c.z]);
    CL.step(600);
    const actifs = C.filter(c => c.actif), avancent = actifs.filter(c => Math.hypot(c.x - p0[c.i][0], c.z - p0[c.i][1]) > 8).length;
    const surChemin = actifs.every(c => c.etat !== 'roule' || Math.abs(c.dec) <= Math.max(c.ch.G[0], c.ch.D[0]) + 1.4);
    log.push([`${actifs.length} cyclistes à 17 h 40 (sur ${C.length}), ${avancent} ont roulé plus de 8 m en 10 s, tous sur leur chemin`, actifs.length >= 9 && avancent >= actifs.length - 2 && surChemin]);
    log.push(['cinq genres de vélos (ville, course, VTT, électrique, enfant), des casques', new Set(C.map(c => c.genre)).size === 5 && C.filter(c => c.def.casque).length >= 6]);
    // 2. les pieds sur les pédales (la plante du pied sur le dessus de la pédale), qui tournent
    {
      let pire = 0, n = 0, tours = 0;
      for (const i of [0, 1, 7, 8]) {
        const c = C[i]; suivre(c, 50);
        const m0 = c.mani;
        for (let k = 0; k < 90; k++) {
          suivre(c, 1); CL.scene.updateMatrixWorld();
          if (!c.p || c.etat !== 'roule' || !c.vu) continue;
          for (const [pied, pedale, gauche] of [[12, 5, true], [15, 6, false]]) {
            if (gauche && c.pied > 0.02) continue; // (le pied gauche qui va se poser à terre, ou y est, n'est plus sur sa pédale)
            const b = c.p.m.os[pied].localToWorld(new V3(0, -0.08, 0.11)), q = c.m.os[pedale].getWorldPosition(new V3()); q.y += 0.016;
            pire = Math.max(pire, b.distanceTo(q)); n++;
          }
        }
        tours += Math.abs(c.mani - m0) > 3 ? 1 : 0;
      }
      log.push([`les pieds sur les pédales : ${n} mesures, au pire à ${(pire * 100).toFixed(1)} cm ; le pédalier tourne (${tours} sur 4)`, n > 300 && pire < 0.05 && tours >= 3]);
    }
    // 3. une voiture de la départementale derrière un cycliste : elle ralentit, le suit, puis le double à cheval sur la ligne
    {
      const c = C[0], v = CL.voitures().find(w => w.sens > 0);
      // (rien en face pendant l'essai : celles qui vont vers l'ouest partent de derrière lui)
      suivre(c, 10); for (const w of CL.voitures()) w.x = w.sens > 0 ? -330 : c.x - 60;
      v.x = c.x - 40; v.z = v.zVoie; v.v = v.vmax; v.dep = 0; v.passe = null; v.suivi = 0;
      let gapMin = 1e9, ralenti = false, double = false, latMin = 1e9;
      for (let k = 0; k < 60 * 25 && !double; k++) {
        suivre(c, 1, -4, 3);
        const dx = c.x - v.x;
        if (Math.abs(v.z - c.z) < 1.6 && dx > 0) gapMin = Math.min(gapMin, dx - 2.1 - 0.95);
        if (dx > 0 && dx < 25 && v.v < v.vmax - 1.5) ralenti = true;
        if (Math.abs(dx) < 3) latMin = Math.min(latMin, Math.abs(v.z - c.z));
        if (v.x > c.x + 6) double = true;
      }
      log.push([`une voiture ralentit derrière le cycliste (au plus près ${gapMin.toFixed(1)} m), puis le double à ${latMin.toFixed(1)} m de côté`, ralenti && double && gapMin > 0.8 && latMin > 2.4]);
    }
    // 4. bloqué par le joueur à pied : il freine, sonne, s'arrête pied à terre, puis le contourne
    {
      const c = C[1]; loinVoitures(); suivre(c, 10);
      const so = V.sonnettes, j = J.joueur;
      j.placer(c.x + Math.sin(c.h) * 16, c.z + Math.cos(c.h) * 16, c.h + Math.PI);
      let dmin = 1e9, arret = false, pied = false, passe = false;
      for (let k = 0; k < 60 * 20 && !passe; k++) {
        suivre(c, 1, -3, 2.5);
        dmin = Math.min(dmin, Math.hypot(c.x - j.pos.x, c.z - j.pos.z));
        if (c.v < 0.05) arret = true;
        if (c.pied > 0.9) pied = true;
        if ((c.x - j.pos.x) * Math.sin(c.h) + (c.z - j.pos.z) * Math.cos(c.h) > 2.5) passe = true;
      }
      log.push([`bloqué par le joueur : il sonne (${V.sonnettes - so} fois), s'arrête pied à terre, puis le contourne sans le toucher (au plus près ${dmin.toFixed(2)} m)`, V.sonnettes > so && arret && pied && passe && dmin > 0.9]);
      j.placer(J.lieux.depart.x, J.lieux.depart.z, 0);
    }
    // 5. un véhicule lancé sur un cycliste : il s'écarte, ou saute (le vélo couché), jamais touché ; il remonte et repart.
    // En mode WTF aussi (personne n'est aplati).
    const monter = () => { const p = CL.vehicule('van').p.pos; CL.teleporter(p.x + 2.4, p.z, 0); CL.step(3); CL.agir(); CL.finirGeste(); };
    monter();
    for (const [i, wtf] of [[1, false], [0, true]]) {
      J.wtf = wtf; loinVoitures();
      const c = C[i];
      suivre(c, 20);
      // (lancé à 14 m/s, 35 m derrière lui, droit sur lui ; on garde l'accélérateur jusqu'à l'avoir dépassé)
      CL.teleporter(c.x - Math.sin(c.h) * 35, c.z - Math.cos(c.h) * 35, c.h); CL.step(1);
      const tr = CL.tr, ct = CL.ctrl; tr.v = 14; ct.ky = -1; ct.kx = 0;
      let dmin = 1e9, saute = false, ecarte = false;
      const t0 = c.touches || 0, x0 = c.x, z0 = c.z;
      for (let k = 0; k < 60 * 6; k++) {
        CL.step(1);
        const ax = Math.sin(tr.h), az = Math.cos(tr.h);
        const px = c.etat === 'roule' ? c.x : c.p.pos.x, pz = c.etat === 'roule' ? c.z : c.p.pos.z;
        for (const o of tr.d.off) dmin = Math.min(dmin, Math.hypot(px - tr.pos.x - ax * o, pz - tr.pos.z - az * o) - tr.d.r - 0.34);
        if (c.etat !== 'roule') saute = true;
        if (Math.abs(c.dec) > 1) ecarte = true;
        if ((tr.pos.x - x0) * ax + (tr.pos.z - z0) * az > 25) ct.ky = 1; // (passé : on freine)
        if (ct.ky > 0 && Math.abs(tr.v) < 0.3) ct.ky = 0;
      }
      ct.ky = 0;
      for (let k = 0; k < 60 * 14 && c.etat !== 'roule'; k++) CL.step(1);
      log.push([`${wtf ? 'mode WTF : ' : ''}un véhicule lancé sur un cycliste : il ${saute ? 'saute de côté' : 'se range'}, jamais touché (au plus près ${dmin.toFixed(2)} m), il repart (${c.etat})`, (saute || ecarte) && dmin > 0 && (c.touches || 0) === t0 && c.etat === 'roule']);
    }
    J.wtf = false;
    // 6. la conduite assistée : derrière un cycliste, elle le suit puis le double (rien n'arrive en face), sans choc
    {
      CL.tr.v = 0; CL.step(2); CL.agir(); CL.finirGeste(); // (on descend du van)
      const p = CL.vehicule('tracteur').p.pos; CL.teleporter(p.x + 2.4, p.z, 0); CL.step(3); CL.agir(); CL.finirGeste();
      CL.mission.etape = 'retour'; CL.mission.itin = null;
      const c = C[2]; loinVoitures();
      c.s = 335 - 60; V.placer(c); // (le cycliste vers l'ouest, en x = 60 ; le tracteur 30 m derrière lui, vers le domaine)
      CL.teleporter(c.x - Math.sin(c.h) * 30, 8.4, c.h); CL.step(2);
      const tr = CL.tr, ct = CL.ctrl; ct.id = 1; ct.jx = 0; ct.jy = 0;
      let chocs = 0, double = false, latMin = 1e9;
      for (let k = 0; k < 60 * 30 && !double; k++) {
        CL.step(1);
        if (tr.chocVu > 0.15) chocs++;
        const lo = (tr.pos.x - c.x) * Math.sin(c.h) + (tr.pos.z - c.z) * Math.cos(c.h);
        if (Math.abs(lo) < 2.5) latMin = Math.min(latMin, Math.abs((tr.pos.x - c.x) * Math.cos(c.h) - (tr.pos.z - c.z) * Math.sin(c.h)));
        if (lo > 6) double = true;
      }
      ct.id = null;
      log.push([`la conduite assistée double un cycliste (à ${latMin.toFixed(2)} m de côté), sans choc (${chocs})`, double && chocs === 0 && latMin > 2.0]);
      CL.agir(); CL.finirGeste();
    }
    // 7. les vélos garés : au bourg (place, épicerie, bar, murs), au château, chez Solumatic, à la tonnellerie ; ils arrêtent
    {
      const G = J.lieux.velos, n = G.reduce((a, g) => a + g.n, 0), q = { x: G[0].x, z: G[0].z };
      log.push([`${n} vélos garés en ${G.length} endroits, un range-vélos arrête qui passe`, G.length >= 8 && n >= 18 && CL.col.resoudre(q, 0.3)]);
    }
    // 8. la nuit, ceux qui roulent encore ont leur phare allumé
    {
      J.minutes = Math.floor(J.minutes / 1440) * 1440 + 1200; CL.step(2);
      const c = C[2]; suivre(c, 30);
      log.push(['la nuit, le phare et le feu arrière allumés', c.actif && !!c.lampe && c.lampe.av.visible && c.lampe.ar.visible]);
    }
    return log;
  }).catch(e => [['scénario interrompu : ' + e.message, false]]);
  for (const [msg, c] of r) ok(c, msg);
  await capture('velos');
}

if (scenario === 'velo') {
  // le vélo du joueur (velos.js : GARES, VeloJoueur, MONTAGE ; Teddy, 28/11/2026) : prendre un vélo garé (il disparaît du
  // décor, sa boîte avec), le relever, l'enfourcher, pédaler (les pieds sur les pédales), tourner (il penche), freiner
  // (pied à terre), descendre (la béquille ; couché, sans béquille), le reprendre ; emprunter le vélo d'un cycliste arrêté
  // (il s'en va à pied, revient plus loin sur un autre) ; un vélo tombé se pousse en voiture (on n'est pas bloqué, la
  // conduite assistée non plus) ; un vélo laissé aussi ; le phare la nuit ; ce que ça coûte
  const etape = async (nom, f, ...a) => { const r = await ev(f, ...a).catch(e => [['scénario interrompu (' + nom + ') : ' + e.message, false]]); for (const [msg, c] of r) ok(c, msg); };
  await ev(() => { CL.jouer(); CL.step(120); });
  // 1. un vélo garé seul, contre un mur (à l'épicerie) : on le prend, il disparaît du décor
  await etape('garé', () => {
    const log = [], J = CL.jeu, V3 = CL.camera.position.constructor;
    const G = CL.gares.find(g => g.genre === 'ville' && g.mur), co = Math.cos(G.h), si = Math.sin(G.h);
    // (du côté libre : le mur est à sa gauche)
    CL.teleporter(G.x - co * 0.75, G.z + si * 0.75, G.h); CL.step(3);
    const vp = CL.veloProche;
    log.push([`un vélo garé contre un mur, « Prendre le vélo » à côté (${G.genre})`, !!vp && vp.gare === G]);
    const ix = G.maillage.geometry.index.array, avant = new Set(ix.subarray(G.i0, G.i0 + G.n)).size > 100;
    CL.agir(); CL.finirGeste();
    const veh = J.veh, vide = Array.from(ix.subarray(G.i0, G.i0 + G.n)).every(i => i === ix[G.i0]);
    const libre = !CL.col.boites.includes(G.boite);
    log.push([`pris : effacé du décor (${G.n} sommets, plus aucun triangle), sa boîte retirée, un vélo qui roule à sa place`, avant && vide && libre && G.pris && J.auVolant && veh.genre === 'velo']);
    log.push([`en selle : relevé (penche ${veh.p.incl.toFixed(2)}), béquille repliée, la selle à sa hauteur (${veh.p.selleE.toFixed(2)})`, Math.abs(veh.p.incl - 0.12) < 0.06 && veh.p.beq === 0 && veh.p.selleE > 0.05 && J.joueur.velo === veh.p.Vp]);
    // la mission à vélo : le chèque de l'épicerie (on descend, on va au comptoir, on remonte en selle)
    {
      const q = s => document.querySelector(s), T = J.tel, m = CL.mission, a = J.lieux.arrets.epicerie;
      CL.step(140); q('#poche').click(); q('[data-a="ouvrir:bureau"]').click(); q('[data-a="cheque"]').click(); T.fermer(); CL.step(5);
      CL.teleporter(a.x - 3, a.z, Math.PI / 2); CL.step(30);
      for (let n = 0; n < 4000 && CL.jeu.gestes.actif; n++) CL.step(1);
      CL.step(5);
      log.push([`à vélo, le chèque de l'épicerie : descendu, au comptoir, remonté en selle (${m.retardataire.statut})`, m.retardataire.statut === 'recupere' && J.auVolant && J.veh === veh]);
    }
    // 2. pédaler sur la départementale (vers l'est), les pieds sur les pédales
    CL.teleporter(30, 12.4, Math.PI / 2); CL.step(2);
    const tr = CL.tr, ct = CL.ctrl, x0 = tr.pos.x;
    ct.ky = -1; ct.kx = 0;
    let pire = 0, n = 0, vmax = 0;
    for (let k = 0; k < 60 * 6; k++) {
      CL.step(1); vmax = Math.max(vmax, tr.v);
      if (k > 90 && k % 4 === 0) {
        CL.scene.updateMatrixWorld();
        for (const [pied, pedale] of [[12, 5], [15, 6]]) {
          const b = J.joueur.m.os[pied].localToWorld(new V3(0, -0.08, 0.11)), p = tr.m.os[pedale].getWorldPosition(new V3()); p.y += 0.016;
          pire = Math.max(pire, b.distanceTo(p)); n++;
        }
      }
    }
    { const s = Math.sin(tr.h), c = Math.cos(tr.h); CL.photo(tr.pos.x + s * 2.5 + c * 2.2, tr.pos.y + 1.3, tr.pos.z + c * 2.5 - s * 2.2, tr.pos.x, tr.pos.y + 0.8, tr.pos.z); }
    log.push([`on pédale : ${vmax.toFixed(1)} m/s au plus (vélo de ville), ${(tr.pos.x - x0).toFixed(0)} m en 6 s, les pieds sur les pédales (${n} mesures, au pire ${(pire * 100).toFixed(1)} cm), le pédalier tourne`, vmax > 5 && vmax < 7.5 && tr.pos.x - x0 > 20 && pire < 0.05 && n > 100]);
    return log;
  });
  await capture('velo-roule');
  await etape('tourner', () => {
    const log = [], J = CL.jeu, tr = CL.tr, ct = CL.ctrl, veh = J.veh; CL.photo();
    // 3. tourner : il penche dans le virage ; freiner : pied à terre
    const h0 = tr.h; let pench = 0;
    ct.kx = 1; for (let k = 0; k < 50; k++) { CL.step(1); pench = Math.max(pench, Math.abs(tr.incl)); }
    ct.kx = 0; ct.ky = 1; for (let k = 0; k < 60 * 3 && tr.v > 0.05; k++) CL.step(1); ct.ky = 0; CL.step(40);
    log.push([`il tourne (${(Math.abs(h0 - tr.h) * 57).toFixed(0)}°) en penchant (${(pench * 57).toFixed(0)}°) ; freiné, arrêté pied à terre`, Math.abs(h0 - tr.h) > 0.3 && pench > 0.1 && Math.abs(tr.v) < 0.05 && tr.pied > 0.9]);
    // 4. descendre : sur sa béquille ; le reprendre
    CL.agir(); CL.finirGeste();
    log.push([`descendu : debout à côté (${Math.hypot(J.joueur.pos.x - tr.pos.x, J.joueur.pos.z - tr.pos.z).toFixed(2)} m), le vélo sur sa béquille (penche ${tr.incl.toFixed(2)})`, !J.auVolant && tr.beq > 0.99 && Math.abs(tr.incl - 0.1) < 0.02 && !J.joueur.assis && Math.hypot(J.joueur.pos.x - tr.pos.x, J.joueur.pos.z - tr.pos.z) < 1.2]);
    CL.step(10);
    const mv = CL.veloProche, et = document.querySelector('.action:not([hidden])');
    CL.agir(); CL.finirGeste();
    log.push([`repris (« ${et ? et.textContent : '?'} »), en selle`, J.auVolant && J.veh === veh]);
    CL.agir(); CL.finirGeste();
    return log;
  });
  await capture('velo-bequille');
  // 5. un vélo de course (pas de béquille), dans un range-vélos : descendu, on le couche sur le côté
  await etape('course', () => {
    const log = [], J = CL.jeu;
    const G = CL.gares.find(g => !g.pris && (g.genre === 'course' || g.genre === 'vtt')), co = Math.cos(G.h), si = Math.sin(G.h);
    CL.teleporter(G.x + co * 0.7, G.z - si * 0.7, G.h); CL.step(3);
    if (CL.veloProche?.gare !== G) CL.teleporter(G.x - co * 0.7, G.z + si * 0.7, G.h), CL.step(3);
    CL.agir(); CL.finirGeste();
    const veh = J.veh, ok1 = J.auVolant && veh.genre === 'velo' && veh.m.genre === G.genre;
    const ct = CL.ctrl; ct.ky = -1; CL.step(120); ct.ky = 1; CL.step(150); ct.ky = 0; CL.step(20);
    CL.agir(); CL.finirGeste();
    log.push([`un ${G.genre === 'vtt' ? 'VTT' : 'vélo de course'} pris dans un range-vélos, roulé, laissé couché sur le côté (penche ${veh.p.incl.toFixed(2)})`, ok1 && !J.auVolant && Math.abs(Math.abs(veh.p.incl) - 1.36) < 0.02 && veh.p.couche !== 0]);
    CL.photo(veh.p.pos.x + 2.2, veh.p.pos.y + 1.6, veh.p.pos.z + 2.2, veh.p.pos.x, veh.p.pos.y + 0.3, veh.p.pos.z);
    return log;
  });
  await capture('velo-couche');
  // 6. un vélo laissé, le van le pousse : il tombe, glisse, le van n'est pas arrêté
  await etape('pousse-laisse', () => {
    const log = [], J = CL.jeu; CL.photo();
    const b = CL.velosJ[0].p, van = CL.vehicule('van');
    // le vélo au milieu de la cour du domaine, debout sur sa béquille
    b.placer(-95, -45, 0); b.poser({ incl: 0.1, braq: 0.25, roue: 0, mani: 0, selleE: 0.1 }); b.beq = 1; b.sync(0, 0);
    CL.remonter('van'); CL.teleporter(-95, -58, 0); CL.step(2);
    const tr = CL.tr, ct = CL.ctrl, x0 = b.pos.x, z0 = b.pos.z; ct.ky = -1;
    let vmin = 99, passe = false;
    for (let k = 0; k < 60 * 6 && !passe; k++) { CL.step(1); if (tr.pos.z > -50) vmin = Math.min(vmin, tr.v); if (tr.pos.z > -40) passe = true; }
    ct.ky = 1; CL.step(90); ct.ky = 0;
    for (let k = 0; k < 200 && b.bouge; k++) CL.step(1);
    log.push([`un vélo laissé dans la cour, le van le pousse : il tombe (${b.couche ? 'couché' : 'debout'}), glisse de ${Math.hypot(b.pos.x - x0, b.pos.z - z0).toFixed(1)} m ; le van passe (au plus lent ${vmin.toFixed(1)} m/s)`, passe && vmin > 1.5 && b.couche !== 0 && Math.hypot(b.pos.x - x0, b.pos.z - z0) > 1 && !b.bouge]);
    CL.agir(); CL.finirGeste();
    return log;
  });
  // 7. un cycliste tombé : son vélo par terre, le van le pousse sans être bloqué ; la conduite assistée passe au pas
  await etape('pousse-cycliste', () => {
    const log = [], J = CL.jeu, V = CL.velos, C = V.cyclistes;
    for (const w of CL.voitures()) w.x = w.sens > 0 ? -330 : 330;
    const c = C[1], suivre = n => { for (let k = 0; k < n; k++) { CL.photo(c.x + 3, c.y + 2, c.z + 3, c.x, c.y, c.z); CL.step(1); } };
    suivre(30);
    CL.remonter('van');
    const tr = CL.tr, ct = CL.ctrl;
    // il tombe (il a sauté de côté) : le vélo couché au milieu de la route, devant le van
    V.sauter(c, 0, -1, tr); for (let k = 0; k < 90; k++) suivre(1);
    c.sz = 11.2; c.sx = Math.max(-100, Math.min(c.sx, 20)); c.p.placer(c.sx, 13.8, 0);
    const bx = c.sx, bz = c.sz;
    CL.teleporter(bx - 14, 11.4, Math.PI / 2); CL.step(2);
    ct.ky = -1; let vmin = 99, passe = false, n = 0;
    for (let k = 0; k < 60 * 6 && !passe; k++) { CL.step(1); if (tr.pos.x > bx - 6) vmin = Math.min(vmin, tr.v); if (tr.pos.x > bx + 6) passe = true; }
    ct.ky = 1; for (let k = 0; k < 120 && tr.v > 0.2; k++) CL.step(1); ct.ky = 0; CL.step(10);
    const d = Math.hypot(c.sx - bx, c.sz - bz);
    log.push([`un cycliste tombé, son vélo couché sur la route : le van le pousse (${d.toFixed(1)} m) et passe (au plus lent ${vmin.toFixed(1)} m/s) ; personne n'est touché (${c.touches || 0})`, passe && vmin > 1.5 && d > 1 && !(c.touches > 0)]);
    // la conduite assistée : un autre vélo couché sur son chemin, elle ne s'arrête pas pour lui
    for (let k = 0; k < 60 * 20 && c.etat !== 'roule'; k++) CL.step(1);
    V.sauter(c, 0, -1, tr); for (let k = 0; k < 60; k++) CL.step(1);
    c.sz = 8.6; c.sx = Math.max(-60, Math.min(c.sx, 20)); c.p.placer(c.sx, 5.8, 0); // (dans la file de la conduite assistée, vers l'ouest)
    CL.mission.etape = 'retour'; CL.mission.itin = null;
    CL.teleporter(c.sx + 30, 8.4, -Math.PI / 2); CL.step(2);
    ct.id = 1; ct.jx = 0; ct.jy = 0;
    let passeA = false, vminA = 99; const bx2 = c.sx;
    for (let k = 0; k < 60 * 25 && !passeA; k++) { CL.step(1); if (Math.abs(tr.pos.x - bx2) < 8) vminA = Math.min(vminA, tr.v); if (tr.pos.x < bx2 - 8) passeA = true; }
    ct.id = null; ct.ky = 1; for (let k = 0; k < 200 && Math.abs(tr.v) > 0.2; k++) CL.step(1); ct.ky = 0; CL.step(5);
    log.push([`la conduite assistée ne reste pas derrière un vélo couché : elle le contourne, ou le pousse au pas (au plus lent ${vminA.toFixed(1)} m/s)`, passeA && vminA > 0.8 && vminA < 90]);
    CL.agir(); CL.finirGeste();
    return log;
  });
  // 8. le vélo d'un cycliste : arrêté devant nous, il nous le prête et s'en va à pied ; il revient plus loin sur un autre
  await etape('emprunt', () => {
    const log = [], J = CL.jeu, V = CL.velos, C = V.cyclistes;
    for (const w of CL.voitures()) w.x = w.sens > 0 ? -330 : 330;
    const c = C.find(x => x.actif && x.vu !== undefined && x.genre !== 'enfant' && !x.def.suit && x.def.chemin === 'ouest') || C[2];
    for (let k = 0; k < 60 && !(c.vu && c.etat === 'roule'); k++) { CL.photo(c.x + 4, c.y + 2, c.z + 4, c.x, c.y, c.z); CL.step(1); }
    CL.teleporter(c.x + Math.sin(c.h) * 9, c.z + Math.cos(c.h) * 9, c.h + Math.PI); CL.step(1);
    let vp = null;
    for (let k = 0; k < 60 * 12 && !vp; k++) { CL.photo(c.x + 4, c.y + 2, c.z + 4, c.x, c.y, c.z); CL.step(1); const q = CL.veloProche; if (q && q.cycliste === c) vp = q; else if (k % 30 === 0 && Math.hypot(J.joueur.pos.x - c.x, J.joueur.pos.z - c.z) > 2.2) CL.teleporter(c.x + Math.sin(c.h) * 1.9, c.z + Math.cos(c.h) * 1.9, c.h + Math.PI); }
    log.push([`un cycliste arrêté devant nous : « Emprunter le vélo »`, !!vp]);
    if (!vp) return log;
    const m = c.m;
    CL.agir(); CL.finirGeste();
    log.push([`il nous le prête : on roule sur son vélo (le même), lui s'en va à pied`, J.auVolant && J.veh.m === m && c.prete === 1 && !c.m]);
    const ct = CL.ctrl; ct.ky = -1; CL.step(90); ct.ky = 0;
    const p0 = { x: c.p.pos.x, z: c.p.pos.z }; CL.step(240);
    log.push([`il marche (${Math.hypot(c.p.pos.x - p0.x, c.p.pos.z - p0.z).toFixed(1)} m en 4 s ; bloqué, il se rapproche de la route)`, Math.hypot(c.p.pos.x - p0.x, c.p.pos.z - p0.z) > 2]);
    // loin et hors de la vue : il revient sur un autre vélo, plus loin
    CL.teleporter(-150, 10, Math.PI / 2); CL.photo(-150, 3, 10, -140, 1, 10); CL.step(400); CL.photo();
    log.push([`hors de la vue, il revient plus loin sur son chemin (il roule)`, c.prete === 0 && c.etat === 'roule']);
    let refait = false;
    for (let k = 0; k < 60 * 40 && !refait; k++) { CL.photo(c.x + 5, c.y + 3, c.z + 5, c.x, c.y, c.z); CL.step(1); refait = !!c.m && c.vu && c.p.m.groupe.parent === c.m.incline; }
    log.push([`un autre vélo pour lui, de près, et il est dessus`, refait]);
    CL.photo();
    return log;
  });
  // 9. la nuit, le feu arrière (et le phare des vélos qui en ont) ; un vélo d'enfant de l'école ; ce que ça coûte
  await etape('nuit', () => {
    const log = [], J = CL.jeu;
    J.minutes = Math.floor(J.minutes / 1440) * 1440 + 1210; CL.step(5);
    const m = J.veh.m;
    log.push(['la nuit, à vélo : le feu arrière allumé (le phare aussi, s\'il en a un)', J.auVolant && m.lampe.ar.visible && (!m.lampe.av || m.lampe.av.visible)]);
    CL.agir(); CL.finirGeste();
    J.minutes = Math.floor(J.minutes / 1440) * 1440 + 1440 + 600; CL.step(5);
    const G = CL.gares.find(g => !g.pris && g.genre === 'enfant'), co = Math.cos(G.h), si = Math.sin(G.h);
    CL.teleporter(G.x + co * 0.6, G.z - si * 0.6, G.h); CL.step(3);
    const q = CL.veloProche; CL.agir(); CL.finirGeste();
    log.push([`un vélo d'enfant du râtelier de l'école se prend aussi`, q && q.gare === G && J.auVolant && J.veh.m.genre === 'enfant']);
    const tr = CL.tr; CL.ctrl.ky = 1; CL.step(60); CL.ctrl.ky = 0;
    CL.teleporter(100, 12.4, Math.PI / 2); CL.step(30);
    CL.ctrl.ky = -1; CL.step(60);
    const b = CL.bench ? CL.bench(120) : null; CL.ctrl.ky = 0;
    log.push([`à vélo dans le bourg : ${b ? JSON.stringify(b) : '?'}`, true]);
    const s = Math.sin(tr.h), c = Math.cos(tr.h);
    CL.photo(tr.pos.x - s * 4 + c * 1.6, tr.pos.y + 1.7, tr.pos.z - c * 4 - s * 1.6, tr.pos.x, tr.pos.y + 0.9, tr.pos.z);
    return log;
  });
  await capture('velo-enfant');
}

if (scenario === 'ordinateur') {
  // Viticode et le Registre phyto sur le portable du bureau du chai aussi (pc.js ; Teddy, 28/11/2026 : « accessibles et
  // utilisables depuis l'ordinateur, dans toutes les missions ») : quatre icônes ; mission 1, leurs écrans d'annonce ;
  // mission 2, une parcelle notée dans le registre depuis l'ordinateur (l'icône mise en évidence, les refus, l'export, le
  // téléphone voit la même saisie) ; mission 3, la fiche Viticode créée, testée, téléchargée et envoyée depuis
  // l'ordinateur ; captures
  const etape = async (nom, f, ...a) => { const r = await ev(f, ...a).catch(e => [['scénario interrompu (' + nom + ') : ' + e.message, false]]); for (const [msg, c] of r) ok(c, msg); };
  await ev(() => {
    // s'asseoir au portable du bureau du chai (entrer par la porte, la chaise) ; se lever
    window.ASSIS = () => {
      const J = CL.jeu, BU = J.lieux.bureau;
      CL.finirGeste(); // (se lever du portable : le geste joué jusqu'au bout)
      if (J.auVolant) { CL.tr.v = 0; CL.agir(); CL.finirGeste(); }
      if (!J.dedans) { J.joueur.placer(BU.dehors.x - 0.6, BU.dehors.z, Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5); }
      J.joueur.placer(BU.chaise.x + 0.5, BU.chaise.z, Math.PI / 2); CL.step(5); CL.agir(); CL.finirGeste(); CL.step(5);
      return J.pc.ouvert;
    };
    window.CLIC = s => { const e = document.querySelector('#pc ' + s); if (!e) throw new Error('absent du portable : ' + s); e.click(); CL.step(1); };
    window.PC = () => document.querySelector('#pc-ecran').textContent;
    CL.jouer(); CL.step(120);
  });
  // 1. la tournée de Noël : quatre icônes ; Viticode et le registre annoncent leur mission
  await etape('mission 1', () => {
    const log = [], J = CL.jeu, q = s => document.querySelector('#pc ' + s);
    log.push(['assis au portable du bureau du chai', ASSIS()]);
    log.push(['quatre icônes : Vitisoft, Le bureau, Viticode, Registre phyto', ['vitisoft', 'bureau', 'viticode', 'phyto'].every(a => !!q(`.pc-ico[data-a="lancer:${a}"]`))]);
    CLIC('[data-a="lancer:viticode"]');
    log.push(['Viticode dans le navigateur, son écran d\'annonce (mission 3)', !!q('.nav-fenetre .pt-bureau .ap-tete.viticode') && PC().includes('mission 3')]);
    CLIC('[data-a="lancer:phyto"]');
    log.push(['le Registre phyto aussi, son annonce et le lien de la prévente', !!q('.pt-bureau .ap-tete.phyto') && PC().includes('Mission 2') && !!q('.pt-bureau a[href*="source=jeu-tournee-generale"]')]);
    CLIC('[data-a="tache:bureau"]'.replace('tache:bureau', 'lancer:bureau'));
    log.push(['Le bureau et Vitisoft sont toujours là, chacun sa fenêtre dans la barre', !!q('.pt-bureau .onglets') && q('.pc-taches').children.length === 3]);
    CLIC('[data-a="tache:viticode"]');
    log.push(['revenu à Viticode : là où on l\'avait laissé', !!q('.pt-bureau .ap-tete.viticode')]);
    CLIC('[data-a="quitter"]'); CL.step(60);
    return log;
  });
  // 2. la journée de traitement : une parcelle traitée, notée depuis l'ordinateur
  await etape('mission 2', () => {
    const log = [], J = CL.jeu, T = CL.traitement, tel = J.tel, q = s => document.querySelector('#pc ' + s);
    CL.versMission2(); CL.step(300);
    tel.ouvrir('messages'); tel.action('fil:claire'); tel.fermer(); CL.step(30);
    // (la bouillie prête, Les Perrières traitées : la saisie attend)
    const p = T.parcelles.find(x => x.id === 'perrieres'), n0 = T.registre.length;
    T.prete = true; T.etape = 'traiter'; p.traitee = true; T.notifier('phyto'); CL.step(15); // (l'objectif : dix fois par seconde)
    log.push([`l'objectif dit le téléphone ou l'ordinateur du bureau du chai (« ${document.querySelector('#objectif').textContent} »)`, document.querySelector('#objectif').textContent.includes('ordinateur du bureau du chai')]);
    ASSIS();
    log.push(['assis au portable : l\'icône du Registre phyto mise en évidence, le pense-bête dit la parcelle à noter', !!q('.pc-ico.conseil[data-a="lancer:phyto"]') && q('.pc-note').textContent.includes('Noter Les Perrières')]);
    CLIC('[data-a="lancer:phyto"]');
    log.push(['le registre dans le navigateur : la consigne, « Noter un traitement » mis en évidence ; la notification du téléphone vue', PC().includes('Les Perrières : touchez') && !!q('.pt-bureau [data-a="rp-nouveau"].guide') && tel.notif !== 'phyto']);
    CLIC('[data-a="rp-nouveau"]'); CLIC('[data-a="rp-suite"]');
    log.push(['rien de coché : l\'appli le refuse, ici aussi', T.saisie.etape === 'parcelles' && (q('.ph-toast')?.textContent || '').length > 3]);
    CLIC('[data-a="rp-cocher:perrieres"]'); CLIC('[data-a="rp-suite"]');
    for (let i = 0; i < 3; i++) CLIC('[data-a="rp-dose:cuivre:1"]');
    CLIC('[data-a="rp-suite"]'); CLIC('[data-a="rp-suite"]'); CLIC('[data-a="rp-cible:Mildiou"]'); CLIC('[data-a="rp-suite"]');
    log.push(['les cinq écrans de la saisie, jusqu\'à « Vérifier »', T.saisie && T.saisie.etape === 'recap' && PC().includes('5 sur 5')]);
    CLIC('[data-a="rp-enregistrer"]'); CL.step(5);
    log.push([`enregistré depuis l'ordinateur : Les Perrières notées, une ligne de plus au registre (${T.registre.length - n0})`, p.notee && T.registre.length === n0 + 1 && T.registre[0].statut !== 'attente']);
    log.push(['la consigne dit de se lever du portable (pas de fermer le téléphone)', PC().includes('Levez-vous du portable')]);
    CLIC('[data-a="rp-export"]');
    const ret = q('.pt-bureau .ap-ret[data-a="ouvrir:phyto"]');
    log.push(['l\'export pour un contrôle, et le retour au registre', PC().includes('Stat\'Phyto') && !!ret]);
    if (ret) CLIC('.pt-bureau .ap-ret[data-a="ouvrir:phyto"]');
    CLIC('[data-a="quitter"]'); CL.step(30);
    tel.ouvrir('phyto');
    log.push(['sur le téléphone, le même registre : la saisie faite au bureau', document.querySelector('#app').textContent.includes('Les Perrières') && document.querySelector('#app').textContent.includes('Envoyé')]);
    tel.fermer(); CL.step(60);
    log.push(['levé du portable : on dit la suite (Le Clos, en enjambeur)', document.querySelector('#sous-titre').textContent.includes('Le Clos') || T.cible !== null]);
    return log;
  });
  // 3. l'habillage : la fiche Viticode, du bulletin à l'imprimerie, depuis l'ordinateur
  await etape('mission 3', () => {
    const log = [], J = CL.jeu, H = CL.habillage, tel = J.tel, q = s => document.querySelector('#pc ' + s);
    CL.versMission3(); CL.step(300);
    H.messageLu(); H.echantillon = 'depose'; H.bulletin = true; CL.step(5);
    ASSIS();
    log.push(['le bulletin arrivé, assis au portable : l\'icône de Viticode mise en évidence, le pense-bête Viticode', !!q('.pc-ico.conseil[data-a="lancer:viticode"]') && q('.pc-note').textContent.includes('Créer la fiche')]);
    CLIC('[data-a="lancer:viticode"]'); CLIC('[data-a="vc-fiche"]');
    log.push(['la fiche, avec la consigne du bulletin, et le retour à la liste', PC().includes('12,5 % vol') && !!q('.pt-bureau .ap-ret[data-a="ouvrir:viticode"]')]);
    CLIC('[data-a="vc-publier"]');
    log.push(['incomplète : l\'appli la refuse et dit pourquoi', !H.publiee && (q('.ph-toast')?.textContent || '').length > 3]);
    for (const k of ['nom', 'millesime', 'appellation', 'lot']) CLIC(`[data-a="vc-remplir:${k}"]`);
    CLIC('[data-a="vc-couleur:Rouge"]'); for (let i = 0; i < 4; i++) CLIC('[data-a="vc-degre:1"]');
    CLIC('[data-a="vc-ingr:raisins"]'); CLIC('[data-a="vc-bio"]'); CLIC('[data-a="vc-ingr:sulfites"]');
    for (let i = 0; i < 8; i++) CLIC('[data-a="vc-val:glucides:1"]');
    for (let i = 0; i < 2; i++) CLIC('[data-a="vc-val:sucres:1"]');
    CLIC('[data-a="vc-label:Bio"]'); CLIC('[data-a="vc-calculer"]'); CLIC('[data-a="vc-publier"]');
    log.push(['publiée depuis l\'ordinateur : son QR code', H.publiee && !!q('.pt-bureau .vc-qr')]);
    CLIC('[data-a="vc-tester"]'); CLIC('[data-a="vc-age:oui"]');
    log.push(['« Testez-moi ! » : la fiche côté consommateur', H.testee && PC().includes('viticode.fr/fiche-produit') && PC().includes('Ingrédients')]);
    CLIC('[data-a="vc-fermer-test"]'); CLIC('[data-a="vc-telecharger"]'); CLIC('[data-a="vc-dl"]');
    log.push(['téléchargé : le fichier dans les téléchargements de l\'ordinateur, à envoyer à l\'imprimerie', H.telecharge && PC().includes('Dans vos téléchargements') && !!q('[data-a="vc-envoyer"]')]);
    CLIC('[data-a="vc-envoyer"]'); CL.step(5);
    log.push(['envoyé à l\'imprimerie depuis l\'ordinateur ; on reste dans Viticode, sa réponse viendra sur le téléphone', H.envoye && PC().includes('Envoyé à l\'imprimerie') && (q('.ph-toast')?.textContent || '').includes('téléphone')]);
    CLIC('[data-a="quitter"]'); CL.step(30);
    tel.ouvrir('viticode');
    log.push(['sur le téléphone, la même fiche : publiée', document.querySelector('#app').textContent.includes('Publiée')]);
    tel.fermer();
    return log;
  });
  // captures : le bureau de l'ordinateur, le registre, Viticode
  await ev(() => { ASSIS(); CLIC('[data-a="lancer:phyto"]'); });
  await capture('ordi-registre');
  await ev(() => { CLIC('[data-a="lancer:viticode"]'); });
  await capture('ordi-viticode');
  await ev(() => { CLIC('[data-a="reduire"]'); });
  await capture('ordi-bureau');
}

if (scenario === 'visiteurs') {
  // Les visiteurs des portes ouvertes (mission 4, portes.js), sans le reste de la mission : la cour telle qu'elle est (le
  // décor de l'événement est posé par la mission). Avant 10 h personne ; les portes ouvertes, la cour se remplit (une
  // vingtaine au plus, des voitures garées sur le parking, des enfants, des apparences variées) ; personne dans un mur ni
  // sous un véhicule ; la caisse : les dix clients dans l'ordre, chacun repart avec ses achats ; la relève, chez Marc ;
  // cinq invités servis au bar (leur réplique) ; un tracteur qui fonce dans la cour (ils s'écartent) ; fermer, ils
  // repartent tous ; la nuit, personne ; ce que ça coûte.
  const PO = await ev(() => {
    // (la base commune, 5fa68dd : monde.js pose lieux.portes puis le remplace par les portes des boutiques ; tant que la
    // mission ne l'a pas renommé, l'implantation est remise ici sous un autre nom, portes.js la trouve)
    const L = CL.monde.lieux;
    if (!(L.portes && L.portes.caisse)) L.portesOuvertes = {
      caisse: { x: -80.4, z: -57.2, h: Math.PI / 2, vendeur: { x: -79.5, z: -57.2, h: -Math.PI / 2 }, file: [[-81.6, -57.2], [-82.6, -57.3], [-83.6, -57.5], [-84.6, -57.8], [-85.6, -58.2], [-86.6, -58.6]] },
      bar: { x: -92.6, z: -51.4, h: 0, places: [[-91.2, -50.2], [-91.0, -52.6], [-92.6, -53.4], [-94.2, -52.8], [-94.4, -50.0], [-92.8, -49.4]] },
      buffet: { x: -97.0, z: -40.6, h: 0, places: [[-95.6, -41.8], [-97.0, -42.0], [-98.4, -41.8]] },
      sono: { x: -104.6, z: -41.2, h: Math.PI / 4 }, entree: { x: -90.6, z: -35.2 },
      parking: [[-94.4, -26.5, 0], [-94.4, -20.5, 0], [-94.4, -14.5, 0], [-86.8, -26.5, Math.PI], [-86.8, -20.5, Math.PI], [-86.8, -14.5, Math.PI], [-112.4, -52.0, -Math.PI / 2]],
      mairie: { x: 95, z: -77, h: Math.PI }, traiteur: 'clemence',
    };
    return !(L.portes && L.portes.caisse);
  });
  if (PO) console.log('note : lieux.portes (monde.js) est remplacé par les portes des boutiques ; implantation remise sous lieux.portesOuvertes pour l\'essai');
  // (window.VI : quelques mesures partagées entre les étapes)
  const r1 = await ev(() => {
    const log = [], V = CL.visiteurs, J = CL.jeu, col = CL.col;
    // personne dans un mur (le centre, à 70 % de son rayon d'une boîte du décor), personne sous un véhicule (son emprise)
    window.VI = {
      mur() { let n = 0; for (const v of V.gens) if (v.present && v.p.sautT <= 0) { const q = { x: v.p.pos.x, z: v.p.pos.z }; col.resoudre(q, v.r * 0.7); if (Math.hypot(q.x - v.p.pos.x, q.z - v.p.pos.z) > 0.01) n++; } return n; },
      sous() {
        let n = 0;
        for (const ve of J.vehicules) {
          const h = ve.p.h, c = Math.cos(h), s = Math.sin(h);
          for (const v of V.gens) if (v.present) {
            const dx = v.p.pos.x - ve.p.pos.x, dz = v.p.pos.z - ve.p.pos.z, x = dx * c - dz * s, z = dx * s + dz * c;
            for (const [x0, x1, z0, z1] of ve.m.dims.emprise) if (x > x0 && x < x1 && z > z0 && z < z1) n++;
          }
        }
        return n;
      },
      // tant de secondes de jeu, en comptant les visiteurs dans un mur ou sous un véhicule
      // (tMax : l'image de jeu la plus longue, sans le rendu)
      jouer(s) {
        let m = 0, so = 0;
        for (let i = 0; i < 60 * s; i++) { const a = performance.now(); CL.step(1); this.tMax = Math.max(this.tMax || 0, performance.now() - a); if (i % 10 === 0) { m = Math.max(m, this.mur()); so = Math.max(so, this.sous()); } }
        this.m = Math.max(this.m || 0, m); this.so = Math.max(this.so || 0, so);
      },
    };
    CL.jouer(); CL.step(30);
    J.minutes = 4 * 1440 + 9 * 60 + 40; CL.step(2); // (samedi 12 décembre, 9 h 40)
    CL.teleporter(-86, -47, -Math.PI / 2); CL.step(10);
    // ce que coûte une image dans la cour, sans visiteurs (au palier haut, au palier faible ; jeu : la part du processeur
    // pour le jeu, sans le rendu)
    VI.mesurer = () => { const o = {}; for (const q of ['haut', 'faible']) { CL.palier(q); CL.step(30); CL.bench(30); o[q] = CL.bench(150) + ', jeu ' + CL.profil(120).jeu + ' ms'; } return o; };
    VI.sans = VI.mesurer();
    V.ouvrir(); VI.jouer(10);
    log.push(['portes ouvertes à 9 h 40 : personne avant 10 h', V.actif && V.presents === 0]);
    J.minutes = 4 * 1440 + 10 * 60; CL.step(2);
    let pic = 0, enfants = 0; const voitures = new Set(), vus = new Set();
    for (let k = 0; k < 9; k++) { VI.jouer(5); pic = Math.max(pic, V.presents); enfants = Math.max(enfants, V.gens.filter(v => v.present && v.enfant).length); for (const p of V.places) if (p.m?.visible) voitures.add(p.k); for (const v of V.gens) if (v.present) vus.add(v); }
    const okBoites = V.places.every(p => p.boite.fantome === !p.m?.visible);
    log.push([`10 h : la cour se remplit, ${V.presents} visiteurs au bout de 45 s (au plus ${pic}), ${enfants} enfants, ${voitures.size} voitures garées sur le parking (leur boîte de collision avec elles)`, V.presents >= 12 && pic <= 22 && enfants >= 1 && voitures.size >= 1 && okBoites]);
    const A = [...vus].map(v => v.ap), teints = new Set(A.map(a => a.teint)), coif = new Set(A.map(a => a.coiffure)), ages = new Set(A.map(a => a.age)), f = A.filter(a => a.femme).length;
    log.push([`des visiteurs variés : ${A.length} vus, ${teints.size} teints, ${coif.size} coiffures, âges ${[...ages].join(', ')}, ${f} femmes`, teints.size >= 6 && coif.size >= 5 && ages.size >= 3 && f >= 3 && A.length - f >= 3]);
    log.push([`ils vont au bar (${V.bar.filter(s => s.pris).length} places prises), au buffet, au chêne, flânent`, V.groupes.some(g => g.act === 'bar') && V.groupes.some(g => g.act && g.act !== 'bar')]);
    log.push(['personne dans un mur, personne sous un véhicule', VI.m === 0 && VI.so === 0]);
    log.push([`l'image de jeu la plus longue pendant que la cour se remplit (créations en étapes, arrivées, champs de distance ; sans le rendu) : ${VI.tMax.toFixed(1)} ms`, true]);
    CL.teleporter(-86, -47, -Math.PI / 2); VI.jouer(1);
    const avec = VI.mesurer(), n = V.presents;
    log.push([`ce que ça coûte, au même endroit de la cour : sans visiteurs, haut ${VI.sans.haut} ; faible ${VI.sans.faible}`, true]);
    log.push([`avec ${n} visiteurs : haut ${avec.haut} ; faible ${avec.faible}`, true]);
    CL.palier('haut');
    return log;
  });
  for (const [msg, c] of r1) ok(c, msg);
  await ev(() => { CL.photo(-80, 17, -25, -96, 0, -47); CL.step(3); });
  await capture('portes-cour');
  await ev(() => { CL.photo(-83, 4.5, -10, -91, 0.5, -24); CL.step(3); });
  await capture('portes-parking');
  await ev(() => { CL.photo(-88.4, 2.6, -47.6, -93.5, 0.9, -52.2); CL.step(3); });
  await capture('portes-bar');
  // la caisse : les dix clients dans l'ordre ; chacun repart avec ses achats (la file capturée au troisième)
  const caisse = (k0, k1) => ev((k0, k1) => {
    const log = [], V = CL.visiteurs, P = V.clients.map(g => g.def);
    CL.photo(-89.5, 3.2, -52.5, -82.5, 0.9, -57.8); CL.step(2);
    if (!k0) { V.ouvrirCaisse(); VI.ordre = []; VI.attentes = []; VI.emporte = []; }
    const { ordre, attentes, emporte } = VI;
    for (let k = k0; k < k1; k++) {
      let t = 0;
      while (!V.comptoir && t < 90 * 60) { CL.step(1); t++; }
      attentes.push(+(t / 60).toFixed(1));
      if (!V.comptoir) {
        // (ce qui bloque : la file, le client attendu)
        const g = V.clients[V.iCaisse], f = v => `${v.g.def ? v.g.def.id : 'v' + v.i} ${v.etat} (${v.p.pos.x.toFixed(1)}, ${v.p.pos.z.toFixed(1)}) vers (${v.tx.toFixed(1)}, ${v.tz.toFixed(1)})`;
        log.push([`bloqué au client ${V.iCaisse} (${g.def.id}, ${g.etat}, prochain ${V.prochain}) ; file : ${V.file.map(f).join(' ; ')} ; lui : ${g.membres.map(f).join(' ; ')}`, false]);
        break;
      }
      if (k === 2) window.VI.fileVue = V.file.length;
      ordre.push(V.comptoir.def.id);
      const v = V.comptoir;
      VI.jouer(1.5);
      V.servi({});
      CL.step(2);
      emporte.push(!!(v.accessoire?.visible || (v.pile?.visible && v.p.porte)));
    }
    if (k1 < 10) { VI.jouer(4); return log; }
    const bon = ordre.join(',') === P.map(d => d.id).join(',');
    log.push([`les dix clients au comptoir, dans l'ordre de PORTES.clients (${ordre.join(', ')}) ; attente avant chacun : ${attentes.join(', ')} s`, bon && Math.max(...attentes) < 45]);
    log.push([`chacun repart avec ses achats (sac, coffret ou cartons) : ${emporte.filter(Boolean).length} sur 10`, emporte.every(Boolean)]);
    log.push(['la file se forme (' + (VI.fileVue || 0) + ' personnes derrière le comptoir au troisième client)', (VI.fileVue || 0) >= 2]);
    log.push(['après le dixième : plus personne au comptoir', !V.comptoir && V.iCaisse === 10]);
    return log;
  }, k0, k1);
  // (le premier client arrivé au comptoir : il dit bonjour)
  const bonjour = await ev(() => {
    const V = CL.visiteurs;
    CL.photo(-85.5, 2.4, -54.5, -81.2, 1.2, -57.4); CL.step(2);
    V.ouvrirCaisse();
    for (let t = 0; t < 90 * 60 && !V.comptoir; t++) CL.step(1);
    CL.step(10);
    return [...document.querySelectorAll('.etiquette.bulle')].filter(e => !e.hidden).map(e => e.textContent).join(' | ');
  });
  ok(bonjour.includes('Bonjour'), `le premier client au comptoir dit bonjour (« ${bonjour} »)`);
  await capture('portes-comptoir');
  for (const [msg, c] of await caisse(0, 2)) ok(c, msg);
  await capture('portes-file');
  for (const [msg, c] of await caisse(2, 10)) ok(c, msg);
  // une capture de la file pendant qu'elle est là : on la reforme avec la relève (chez Marc)
  const r3 = await ev(() => {
    const log = [], V = CL.visiteurs;
    V.releve();
    let file = 0;
    for (let i = 0; i < 120 && V.nMarc < 2; i++) { VI.jouer(1); file = Math.max(file, V.file.length); }
    log.push([`après la relève, des visiteurs passent chez Marc, attendent et repartent servis (${V.nMarc} servis, file de ${file} au plus)`, V.marc && V.nMarc >= 2 && V.nServis === 0]);
    return log;
  });
  for (const [msg, c] of r3) ok(c, msg);
  // la dégustation : cinq invités servis au bar (verres.js), chacun sa réplique
  const r4 = await ev(() => {
    const log = [], V = CL.visiteurs, J = CL.jeu, TX = new Set(), bulles = [];
    J.portes.etape = 'degustation';
    CL.photo();
    const L = V.L.bar;
    CL.teleporter(L.x - 3, L.z + 3, Math.PI); CL.step(30);
    let essais = 0;
    while (V.nServis < 5 && essais < 40) {
      essais++;
      // un invité au bar qu'on peut servir (pas un enfant)
      let cible = null;
      for (const v of V.gens) if (v.present && v.p.servable && !v.enfant) { cible = v; break; }
      if (!cible) { VI.jouer(2); continue; }
      const p = cible.p, a = Math.atan2(p.pos.x - L.x, p.pos.z - L.z);
      CL.teleporter(p.pos.x + Math.sin(a) * 1.1, p.pos.z + Math.cos(a) * 1.1, a + Math.PI); CL.step(3);
      const n0 = V.nServis;
      CL.agir();
      for (let i = 0; i < 400 && (J.joueur.service || p.verre > 0); i++) { CL.step(1); for (const e of document.querySelectorAll('.etiquette.bulle')) if (!e.hidden && e.textContent) TX.add(e.textContent); }
      if (V.nServis > n0) bulles.push(cible.enfant);
    }
    const repliques = [...TX];
    log.push([`cinq invités servis au bar de dégustation (${V.nServis}) ; jamais un enfant ; leurs répliques : « ${repliques.slice(0, 4).join(' » « ')} »`, V.nServis === 5 && bulles.every(e => !e) && repliques.length >= 2]);
    log.push(['le personnage ne boit jamais (le verre est chez l\'invité)', !J.joueur.verre]);
    return log;
  });
  for (const [msg, c] of r4) ok(c, msg);
  // un tracteur qui fonce dans la cour pleine : ils s'écartent, personne sous ses roues
  const r5 = await ev(() => {
    const log = [], V = CL.visiteurs, J = CL.jeu;
    const t = CL.vehicule('tracteur').p.pos; CL.teleporter(t.x + 2.2, t.z, 0); CL.step(3); CL.agir(); CL.finirGeste();
    VI.m = 0; VI.so = 0;
    let sauts = 0;
    for (const [x, z, h] of [[-90, -37, Math.PI], [-86, -40, -2.6], [-99, -38.5, Math.PI * 0.95]]) {
      CL.teleporter(x, z, h); CL.step(2); CL.ctrl.ky = -1;
      for (let i = 0; i < 200; i++) { CL.step(1); if (i % 4 === 0) { VI.so = Math.max(VI.so, VI.sous()); sauts += V.gens.filter(v => v.present && v.p.sautT > 0).length ? 1 : 0; } }
      CL.ctrl.ky = 0; CL.step(40);
    }
    log.push([`en tracteur, à fond dans la cour pleine (trois passages) : ${sauts > 0 ? 'ils sautent de côté' : 'personne sur le chemin'}, personne sous ses roues`, J.auVolant && VI.so === 0]);
    CL.agir(); CL.finirGeste();
    return log;
  });
  for (const [msg, c] of r5) ok(c, msg);
  // fermer : ils repartent tous ; la nuit, personne
  const r6 = await ev(() => {
    const log = [], V = CL.visiteurs, J = CL.jeu;
    CL.teleporter(-86, -47, -Math.PI / 2); CL.step(30);
    // fermer : ils repartent tous (hors de la vue, ils disparaissent avec leur voiture)
    V.fermer();
    CL.photo(-60, 30, 40, -40, 0, 80); // (la caméra regarde ailleurs)
    for (let i = 0; i < 150 && V.presents > 0; i++) CL.step(60);
    const reste = V.presents, voit = V.places.filter(p => p.m?.visible || !p.boite.fantome).length;
    log.push([`fermer : ils repartent tous (${reste} encore là), les voitures avec eux (${voit})`, reste === 0 && voit === 0 && !V.actif]);
    CL.photo(); CL.teleporter(-86, -47, -Math.PI / 2); CL.step(30);
    // la nuit : personne (même portes ouvertes)
    V.ouvrir(); J.minutes = 4 * 1440 + 15 * 60; CL.step(2); for (let i = 0; i < 20; i++) CL.step(60);
    const jour = V.presents;
    J.minutes = 4 * 1440 + 21 * 60; CL.step(3);
    log.push([`ouvertes à 15 h (${jour} visiteurs), la nuit à 21 h : personne`, jour > 0 && V.presents === 0 && V.places.every(p => !p.m?.visible)]);
    V.fermer();
    return log;
  });
  for (const [msg, c] of r6) ok(c, msg);
}

if (scenario === 'ecole') {
  // L'école des Tilleuls et ses enfants (ecole.js) : l'école existe ; on n'y entre jamais (à pied, en tracteur, en mode
  // WTF) ; la récréation (des enfants qui jouent, qui bougent : balançoires, toboggan, corde, ronde, ballon) ; personne dans
  // la cour pendant la classe (les élèves aux fenêtres), la nuit, après la garderie, le samedi ; moins d'enfants le mercredi ;
  // la sortie de 16 h 30 (le portail s'ouvre, ils le passent, rejoignent leurs parents et disparaissent chez eux) ; des
  // enfants divers ; aucune étiquette près d'eux ; un véhicule ne leur roule jamais dessus ; ce que coûte l'école
  const r = await ev(async () => {
    const log = [], E = CL.ecole, J = CL.jeu, Z = CL.monde.lieux.ecole.zone, loin = () => CL.photo(60, 40, 120, 60, 0, 200);
    const dansZ = (x, z, m = 0) => x > Z.x0 - m && x < Z.x1 + m && z > Z.z0 - m && z < Z.z1 + m;
    const aller = (j, h, m) => { loin(); J.minutes = j * 1440 + h * 60 + m; CL.step(40); CL.photo(112, 6, -26, 124, 0.5, -24); CL.step(6); };
    const visibles = () => E.gens.filter(e => e.m.groupe.visible);
    const dansCour = () => E.enfants.filter(e => e.m.groupe.visible && dansZ(e.p.pos.x, e.p.pos.z));
    CL.jouer(); CL.step(30);
    CL.teleporter(108, -20, Math.PI / 2); J.minutes = 10 * 60 + 2; CL.photo(112, 6, -26, 124, 0.5, -24); CL.step(150);
    log.push(['l\'école existe : son bâtiment (il arrête la caméra), son enceinte, ' + E.chemins.length + ' chemins jusqu\'aux maisons, ' + E.gens.length + ' personnes créées en approchant', CL.col.dedans(137.5, -24.8) && E.chemins.length >= 12 && E.enfants.length === 24 && E.adultes.length === 3 && E.parents.length >= 8]);
    // on n'y entre jamais : un point de l'enceinte est toujours repoussé dehors ; à pied, on bute dessus tout autour
    {
      let dedans = 0;
      for (let x = Z.x0 + 0.4; x < Z.x1; x += 1.3) for (let z = Z.z0 + 0.4; z < Z.z1; z += 1.3) { const p = { x, z }; CL.col.resoudre(p, 0.34); if (dansZ(p.x, p.z, -0.3)) dedans++; }
      log.push(['aucun point de l\'enceinte où l\'on puisse se tenir (portail compris)', dedans === 0]);
      const j = CL.joueur; let entre = 0;
      for (const [x, z, h] of [[112.6, -33, Math.PI / 2], [112.6, -20, Math.PI / 2], [112.6, -12, Math.PI / 2], [112.6, -37.5, Math.PI / 2 + 0.4], [130, -7.2, Math.PI], [144.4, -24, -Math.PI / 2], [128, -40.0, 0]]) {
        j.placer(x, z, h);
        for (let i = 0; i < 240; i++) { j.update(1 / 60, Math.sin(h), Math.cos(h), 1, true, CL.col, i / 60); if (dansZ(j.pos.x, j.pos.z, -0.2)) entre++; }
      }
      log.push(['à pied, en courant vers l\'école de sept côtés (le portail, la grille, les murs) : on reste dehors', entre === 0]);
      CL.teleporter(108, -20, Math.PI / 2); CL.step(2);
    }
    // la récréation de 10 h : la cour pleine, des enfants qui bougent et qui jouent
    {
      CL.photo(112, 6, -26, 124, 0.5, -24); CL.step(600);
      // qui bouge : il se déplace, ou sa pose change (il saute, se balance, pousse sa bille, balance les jambes...)
      // (des mouvements qui reviennent : la corde, la balançoire ; on regarde tous les quarts de seconde)
      const n = dansCour().length, sw = [], pose = e => [e.m.groupe.position.x, e.m.groupe.position.y, e.m.groupe.position.z, ...[0, 2, 3, 4, 7, 10, 11, 13, 14].flatMap(k => e.m.os[k].quaternion.toArray())];
      let avant = E.enfants.map(pose); const bouge = new Set();
      for (let i = 0; i < 90; i++) {
        CL.step(1); sw.push(E.balancoires[0].rotation.z, E.balancoires[1].rotation.z);
        if (i % 15 === 14) { const P = E.enfants.map(pose); E.enfants.forEach((e, k) => { if (e.m.groupe.visible && P[k].some((v, q) => Math.abs(v - avant[k][q]) > 0.04)) bouge.add(e); }); avant = P; }
      }
      const bougent = bouge.size;
      const jeux = Object.entries(E.jeux).filter(([k, j]) => j.membres.length).map(([k, j]) => k + ' ' + j.membres.length).join(', ');
      const nJeux = Object.values(E.jeux).filter(j => j.membres.length && j.nom !== 'balade').length;
      log.push([`10 h 05, la récréation : ${n} enfants dans la cour, ${bougent} bougent ou jouent en 1,5 s ; les jeux : ${jeux}`, n >= 18 && bougent >= n * 0.6 && nJeux >= 6]);
      log.push(['une balançoire se balance (le siège avec l\'enfant)', Math.max(...sw) - Math.min(...sw) > 0.3]);
      // l'après-midi, d'autres jeux : la corde à sauter tourne (un enfant saute), la ronde tourne en se tenant la main
      const jeuxMatin = jeux;
      J.minutes = 15 * 60 + 2; CL.step(700);
      const C = E.jeux.corde, R = E.jeux.ronde, jeuxAprem = Object.entries(E.jeux).filter(([k, j]) => j.membres.length).map(([k, j]) => k + ' ' + j.membres.length).join(', ');
      log.push(['15 h, d\'autres jeux qu\'à 10 h (' + jeuxAprem + ') ; la corde tourne, un enfant saute ; la ronde se tient la main', jeuxAprem !== jeuxMatin
        && (!C.membres.length || (E.cordeM.visible && C.membres.length >= 3)) && (!R.membres.length || R.membres.filter(e => e.pret).every(e => e.J.mg && e.J.md)) && (C.membres.length + R.membres.length > 0)]);
      log.push(['adultes qui surveillent : ' + E.adultes.filter(a => a.m.groupe.visible && dansZ(a.p.pos.x, a.p.pos.z)).length, E.adultes.filter(a => a.m.groupe.visible && dansZ(a.p.pos.x, a.p.pos.z)).length >= 2]);
      // aucune étiquette près d'eux (ni « Servir un verre », ni rien) ; ce ne sont pas des passants (le mode WTF ne les voit pas)
      const nPassants = CL.passants().filter(p => E.gens.some(e => e.p === p)).length;
      log.push(['ce ne sont pas des passants (ni verre, ni mode WTF)', nPassants === 0]);
      // ce que coûte l'école, devant la grille, en pleine récréation
      CL.photo(); CL.teleporter(110.5, -24, Math.PI / 2); CL.step(30);
      E.coupe = true; CL.step(5); CL.bench(30); const sans = CL.bench(120);
      E.coupe = false; CL.step(60); CL.bench(30); const avec = CL.bench(120);
      log.push(['récréation, devant la grille : sans les enfants ' + sans + ' ; avec : ' + avec, true]);
    }
    // la classe : la cour vide (les élèves aux fenêtres) ; la nuit, après la garderie, le samedi : personne ; le mercredi,
    // le centre de loisirs, moins d'enfants
    aller(0, 9, 10); log.push(['9 h 10, la classe : personne dans la cour, les élèves aux fenêtres', dansCour().length === 0 && E.classes.userData.tex.offset.y === 0.5]);
    aller(0, 12, 30); const midi = dansCour().length; log.push(['12 h 30, après la cantine : ' + midi + ' enfants dans la cour', midi >= 18]);
    aller(0, 17, 45); const garderie = dansCour().length; log.push(['17 h 45, la garderie : ' + garderie + ' enfants (le début de la mission 1)', garderie > 0 && garderie < 12]);
    aller(0, 18, 45); log.push(['18 h 45, la garderie finie : personne', visibles().filter(e => e.genre !== 'parent').length === 0]);
    aller(0, 21, 0); log.push(['21 h, la nuit : personne, ni dans la cour, ni dans la rue', visibles().length === 0]);
    aller(1, 10, 0); const mercredi = dansCour().length; log.push(['mercredi 10 h, le centre de loisirs : ' + mercredi + ' enfants', mercredi > 3 && mercredi < midi]);
    aller(4, 10, 30); log.push(['samedi : personne', visibles().length === 0]);
    // les arrivées du matin : la garderie à 7 h 45, des enfants sur les chemins ; 8 h 25 : presque tous là
    aller(2, 7, 45); const garderieMatin = dansCour().length, rue = E.enfants.filter(e => e.phase === 'aller').length;
    aller(2, 8, 26); const presque = dansCour().length;
    log.push([`jeudi 7 h 45, la garderie : ${garderieMatin} enfants dans la cour, ${rue} en chemin ; 8 h 26 : ${presque} dans la cour`, garderieMatin > 0 && garderieMatin < 8 && rue > 0 && presque >= 18]);
    // la sortie de 16 h 30 : les parents attendent devant le portail ; il s'ouvre, les enfants le passent, rejoignent leur
    // parent (les petits lui donnent la main) et rentrent chez eux par les trottoirs
    {
      loin(); J.minutes = 2 * 1440 + 16 * 60 + 26; CL.step(40);
      CL.photo(104, 3.2, -38, 113, 1.0, -31.5); CL.step(10);
      let ouv = 0, main = 0, parents = 0;
      for (let i = 0; i < 60 * 40; i++) { CL.step(1); ouv = Math.max(ouv, E.ouverture); if (i % 30 === 0) { main = Math.max(main, E.enfants.filter(e => e.phase === 'retour' && e.p.jeu && (e.J.md || e.J.mg)).length); parents = Math.max(parents, E.parents.filter(p => p.phase === 'attente' && p.m.groupe.visible).length); } }
      const partis = E.enfants.filter(e => e.phase === 'retour' || e.phase === 'maison').length;
      log.push([`16 h 30 : ${parents} parents attendent devant le portail, il s'ouvre (${ouv.toFixed(2)}), ${partis} enfants l'ont passé, ${main} tenant la main de leur parent`, parents >= 3 && ouv > 0.9 && partis >= 8 && main >= 1]);
      // pas d'étiquette : à pied, au milieu des enfants qui sortent
      CL.photo(); CL.teleporter(111.6, -33.8, Math.PI / 2); CL.step(60);
      const etq = [...document.querySelectorAll('.etiquette.action')].filter(e => !e.hidden).map(e => e.textContent);
      log.push(['à pied au milieu des enfants qui sortent : aucune étiquette' + (etq.length ? ' (' + etq.join(', ') + ')' : ''), etq.length === 0]);
      loin(); J.minutes = 2 * 1440 + 17 * 60 + 52; CL.step(40); CL.photo(112, 6, -26, 124, 0.5, -24); CL.step(6);
      const restes = E.enfants.filter(e => e.m.groupe.visible && !e.def.garderieSoir).length;
      log.push(['17 h 52 : ceux qui sont rentrés ont disparu (chez eux) ; restent ceux de la garderie (' + E.enfants.filter(e => e.m.groupe.visible).length + ')', restes === 0 && E.enfants.filter(e => e.phase === 'maison').length >= 14]);
    }
    // un véhicule ne leur roule jamais dessus (mode WTF compris) : on fonce en tracteur sur un enfant qui rentre chez lui
    {
      J.wtf = true;
      loin(); J.minutes = 2 * 1440 + 16 * 60 + 38; CL.step(40);
      CL.photo(); const t = CL.vehicule('tracteur').p.pos; CL.teleporter(t.x + 2.2, t.z, 0); CL.step(3); CL.agir(); CL.finirGeste();
      // en tracteur, à fond sur la grille et le portail, de quatre endroits du parvis et de la place : il bute dehors
      let dedansV = 0;
      for (const [x, z, h] of [[105, -14, Math.PI / 2], [105, -24, Math.PI / 2], [104, -33, Math.PI / 2], [107, -38.4, Math.PI / 2 + 0.3]]) {
        CL.teleporter(x, z, h); CL.step(2); CL.ctrl.ky = -1;
        for (let i = 0; i < 240; i++) { CL.step(1); if (dansZ(CL.tr.pos.x, CL.tr.pos.z, 0.3)) dedansV++; }
        CL.ctrl.ky = 0; CL.step(20);
      }
      log.push(['en tracteur (mode WTF), à fond sur la grille et le portail : on bute dehors', dedansV === 0 && J.auVolant]);
      let k = null;
      for (let i = 0; i < 40 && !k; i++) { CL.step(30); k = E.enfants.find(e => e.phase === 'retour' && e.m.groupe.visible && !dansZ(e.p.pos.x, e.p.pos.z, 2)); }
      let dmin = 1e9, aplati = false;
      if (k) {
        const P = E.surChemin(k.ch, k.ch.L - k.s - 0.5, 0, -1, { x: 0, z: 0, h: 0 }), h = P.h, x = k.p.pos.x - Math.sin(h) * 7, z = k.p.pos.z - Math.cos(h) * 7;
        CL.teleporter(x, z, h); CL.step(2); CL.ctrl.ky = -1;
        for (let i = 0; i < 240; i++) { CL.step(1); const tr = CL.tr; dmin = Math.min(dmin, Math.hypot(tr.pos.x - k.p.pos.x, tr.pos.z - k.p.pos.z)); if (Math.abs(k.m.groupe.scale.y - k.m.echelle) > 1e-6) aplati = true; }
        CL.ctrl.ky = 0;
      }
      log.push([`mode WTF, en tracteur droit sur un enfant qui rentre : il reste à ${dmin.toFixed(2)} m, jamais aplati`, !!k && dmin > 1.0 && !aplati]);
      J.wtf = false;
    }
    // des enfants divers : tous les âges, filles et garçons, tous les teints, des coiffures de toutes sortes
    {
      const D = E.enfants.map(e => e.def), peaux = new Set(D.map(d => d.peau)), coif = new Set(D.map(d => d.coiffure));
      const h = D.map(d => d.hauteur), f = D.filter(d => d.femme).length;
      log.push([`des enfants divers : ${D.length} de ${Math.min(...D.map(d => d.age))} à ${Math.max(...D.map(d => d.age))} ans (${Math.min(...h).toFixed(2)} à ${Math.max(...h).toFixed(2)} m), ${f} filles et ${D.length - f} garçons, ${peaux.size} teints, coiffures : ${[...coif].join(', ')}`,
        peaux.size >= 9 && f >= 10 && D.length - f >= 10 && Math.min(...h) < 1.0 && Math.max(...h) > 1.4 && ['afro', 'tresses', 'couettes', 'nattes', 'boucles'].every(c => coif.has(c))]);
    }
    return log;
  });
  for (const [m, okk] of r) ok(okk, m);
  await ev(() => { CL.photo(124, 26, -12, 124, 0, -24); CL.jeu.minutes = 10 * 60 + 5; CL.step(300); });
  await capture('ecole-recreation');
}

if (scenario === 'solumatic') {
  // Les bureaux de Solumatic (solumatic.js) : les horaires, puis dedans, pièce par pièce
  await ev(() => { CL.jouer(); CL.step(60); });
  // 1. la nuit (mardi, 23 h) : personne, la porte fermée, l'étiquette dit pourquoi et quand l'équipe arrive
  let r = await ev(() => {
    const S = CL.solu, LS = CL.monde.lieux.solumatic, J = CL.jeu;
    J.minutes = 23 * 60; CL.teleporter(LS.dehors.x + 0.6, LS.dehors.z, -Math.PI / 2); CL.step(40);
    const etq = [...document.querySelectorAll('.etiquette.action')].filter(e => !e.hidden).map(e => e.textContent).join(' | ');
    CL.agir(); CL.step(2);
    const H = J.hud, st = [H.ligne, ...H.file].filter(Boolean).map(l => l.txt).find(t => /Solumatic/.test(t)) || '';
    return { etq, st, ouverte: S.ouverte, dedans: J.dedans, la: S.gens.filter(g => g.etat !== 'absent').length };
  });
  ok(!r.ouverte && !r.dedans && r.la === 0 && /Fermé · l'équipe arrive demain à 7 h \d\d/.test(r.etq) && /fermé à cette heure-ci/.test(r.st), `la nuit, personne ; la porte reste fermée (« ${r.etq} » ; « ${r.st} »)`);
  await capture('solu-nuit-porte');
  // 2. le lendemain, mercredi, 7 h 54 : Romane seule, dehors, qui fume devant l'entrée ; elle a la clé, la porte est
  // ouverte ; le « fermé » entendu la veille (1.) n'est plus à l'écran, l'étiquette propose d'entrer
  r = await ev(() => {
    const S = CL.solu, LS = CL.monde.lieux.solumatic, J = CL.jeu, H = J.hud;
    J.minutes = 1440 + 7 * 60 + 54; CL.teleporter(LS.dehors.x + 1.6, LS.dehors.z - 0.8, -2.2); CL.step(30);
    const sousTitre = [H.ligne, ...H.file].filter(Boolean).map(l => l.txt).join(' | ');
    const etq = [...document.querySelectorAll('.etiquette.action')].filter(e => !e.hidden).map(e => e.textContent).join(' | ');
    CL.step(210);
    const ro = S.romane, autres = S.gens.filter(g => g !== ro && g.etat !== 'absent').length;
    CL.photo(LS.dehors.x + 4.6, 2.2, LS.dehors.z + 5.0, ro.p.pos.x, 1.3, ro.p.pos.z); CL.step(2);
    return { ro: ro && ro.etat, dehors: ro && ro.dehors, vu: ro && ro.p.m.groupe.visible, fume: ro && ro.p.fume, autres, ouverte: S.ouverte, x: ro.p.pos.x, z: ro.p.pos.z, bulle: ro.etq.el.textContent, sousTitre, etq };
  });
  ok(r.ro === 'fume' && r.dehors && r.vu && r.fume && r.autres === 0 && r.ouverte, `7 h 54 : Romane seule, dehors, fume devant l'entrée (${r.x.toFixed(1)}, ${r.z.toFixed(1)}) ; elle a la clé, la porte est ouverte`);
  ok(!/fermé/.test(r.sousTitre) && /Entrer chez Solumatic/.test(r.etq), `7 h 54 : plus de « fermé » à l'écran (« ${r.sousTitre} »), l'étiquette propose d'entrer (« ${r.etq} »)`);
  ok(/^Romane : /.test(r.bulle), `elle salue qui passe, avec son prénom (« ${r.bulle} »)`);
  await capture('solu-romane-fume');
  await ev(() => CL.photo());
  // 3. 10 h : tout le monde à son poste, dans sa pièce ; Vanessa pas là (mercredi, jour impair), son poste rangé
  r = await ev(() => {
    const S = CL.solu, J = CL.jeu; J.minutes = 1440 + 10 * 60; S.horaires(true); CL.step(60);
    // (les écrans de chacun : allumés s'il est là ; le voile de Vanessa déplié devant les siens, replié pour les autres)
    const A = S.voileE.geometry.attributes.position.array, deplie = id => (S.ecransDe[id] || []).every(k => Math.hypot(A[k * 12] - A[k * 12 + 3], A[k * 12 + 2] - A[k * 12 + 5]) > 0.1);
    return { gens: S.etats().map(e => ({ ...e, piece: S.piece(e.x, e.z), voulue: S.gens.find(g => g.id === e.id).e.piece })), range: S.vPas && S.vPas.visible,
      ecrans: Object.keys(S.ecransDe).length, vanessaEteint: S.allumes.vanessa === false && deplie('vanessa'), autresAllumes: S.gens.filter(g => g.id !== 'vanessa' && S.ecransDe[g.id]).every(g => S.allumes[g.id] && !deplie(g.id)), lum: S.lum };
  });
  {
    const sauf = r.gens.filter(g => g.id !== 'vanessa');
    ok(sauf.length === 21 && sauf.every(g => g.etat === 'poste' && g.piece === g.voulue), `mercredi, 10 h : les 21 à leur poste, dans leur pièce (${sauf.filter(g => g.piece !== g.voulue || g.etat !== 'poste').map(g => g.id + ' ' + g.etat + ' ' + g.piece).join(', ') || 'tous'})`);
    const v = r.gens.find(g => g.id === 'vanessa');
    ok(v.etat === 'absent' && !v.visible && r.range, 'Vanessa n\'est pas là le mercredi : son poste est rangé, le portable fermé');
    ok(r.ecrans >= 20 && r.vanessaEteint && r.autresAllumes && r.lum === 1, `les écrans de ${r.ecrans} postes : celui de Vanessa, absente, éteint ; ceux des autres allumés ; les lampes allumées (${r.lum})`);
  }
  // 4. le jeudi (jour pair), Vanessa est là ; on entre : l'extérieur retiré, la caméra sous le plafond
  r = await ev(() => {
    const S = CL.solu, LS = CL.monde.lieux.solumatic, J = CL.jeu;
    J.minutes = 2 * 1440 + 10 * 60; CL.teleporter(LS.dehors.x + 0.6, LS.dehors.z, -Math.PI / 2); CL.step(30);
    const n0 = CL.scene.children.length; CL.agir(); CL.finirGeste(); CL.step(30);
    const c = CL.camera.position, v = S.gens.find(g => g.id === 'vanessa');
    return { dedans: J.dedans, n0, n1: CL.scene.children.length, isoles: !!CL.isoles, cy: c.y, va: v.etat, vapiece: S.piece(v.p.m.groupe.position.x, v.p.m.groupe.position.z), vu: v.p.m.groupe.visible, la: S.vLa.visible,
      casques: S.gens.filter(g => g.casque).map(g => g.id), plateaux: S.gens.filter(g => ['atelier', 'soleil'].includes(g.e.piece)).length };
  });
  ok(r.dedans === 'solumatic' && r.isoles && r.n1 < 70, `jeudi, 10 h : on entre, l'extérieur retiré de la scène (${r.n0} -> ${r.n1} objets)`);
  ok(r.cy > 1.4 && r.cy < 2.75, `la caméra à hauteur d'homme, sous le plafond de 3 m (y = ${r.cy.toFixed(2)})`);
  ok(r.va === 'poste' && r.vapiece === 'saturne' && r.vu && r.la, 'Vanessa est là le jeudi, à Saturne, son portable ouvert');
  ok(r.casques.length === 8 && r.plateaux === 8, `les casques-micros des deux plateaux (${r.casques.join(', ')})`);
  // 5. leurs noms : en passant près de chacun, une bulle qui commence par son prénom ; ceux qui sont en ligne
  r = await ev(() => {
    const S = CL.solu, noms = new Set(), parle = new Set();
    for (const g of S.gens) {
      if (g.etat !== 'poste') continue;
      const q = g.p.m.groupe.position, lv = (g.home.lever || []).find(([a, b]) => S.grille.libre(a, b));
      if (lv) CL.teleporter(lv[0], lv[1], 0); else continue;
      S.tBulle = 0; g.tParle = 0; CL.step(8);
      if (g.etq.el.textContent.startsWith(g.e.prenom + ' : ')) noms.add(g.id);
      void q;
    }
    for (let i = 0; i < 60 * 40; i++) { CL.step(1); for (const g of S.gens) if (g.parle) parle.add(g.id); }
    return { noms: [...noms], parle: [...parle] };
  });
  ok(r.noms.length >= 20, `en passant près d'eux, chacun salue avec son prénom (${r.noms.length} sur 22)`);
  ok(r.parle.filter(id => ['clement', 'cindy', 'hugo', 'lorette', 'raphael', 'ophelie', 'emma', 'emilie'].includes(id)).length >= 5, `sur les plateaux, on parle au casque, pas tous à la fois (${r.parle.join(', ')})`);
  // 6. quelqu'un part au café et revient se rasseoir ; deux autres jouent au baby-foot
  r = await ev(() => {
    const S = CL.solu, g = S.gens.find(o => o.id === 'nathan'), h = g.home;
    S.envoyer('nathan', 'cafe'); S.envoyer('dylan', 'babyfoot', 'kevin');
    let loin = 0, auCafe = false, b0 = S.balle.position.z, balle = false;
    const P = S.P.atlas; CL.teleporter(S.V.cibles.atlas[0], S.V.cibles.atlas[1] + 1.5, Math.PI);
    for (let i = 0; i < 60 * 90; i++) { CL.step(1); const q = g.p.pos; loin = Math.max(loin, Math.hypot(q.x - h.x, q.z - h.z)); if (g.tache && g.tache.type === 'cafe' && g.tache.arrive) auCafe = true; if (Math.abs(S.balle.position.z - b0) > 0.05) balle = true; if (auCafe && g.mode === 'assis' && g.siege === h && i > 600) break; }
    void P;
    return { loin, auCafe, rassis: g.mode === 'assis' && g.siege === h, piece: S.piece(g.p.m.groupe.position.x, g.p.m.groupe.position.z), balle };
  });
  ok(r.auCafe && r.loin > 8 && r.rassis && r.piece === 'jupiter', `Nathan va au café de Mars (jusqu'à ${r.loin.toFixed(1)} m de sa place) et revient se rasseoir à Jupiter`);
  ok(r.balle, 'deux autres jouent au baby-foot d\'Atlas : la balle roule');
  // 6 b. de près (Teddy, 28/11/2026 : « debout à côté de sa chaise, il saute dessus ») : se lever (en se redressant, un pas
  // en avant), marcher, revenir, s'asseoir (en se tournant, en se baissant) : 0,6 s chacun, le corps ne saute jamais
  r = await ev(() => {
    const S = CL.solu, g = S.gens.find(o => o.id === 'nathan'), q = g.p.m.groupe.position, h = g.home.h;
    S.tAct = 1e9; // (personne d'autre ne part pendant ce temps)
    CL.teleporter(q.x + Math.sin(h + 2.2) * 3.2, q.z + Math.cos(h + 2.2) * 3.2, h + 2.2 + Math.PI); CL.step(12);
    const modes = [g.mode], corps = () => (g.p.assis ? g.p.m.groupe.position : g.p.pos);
    S.envoyer('nathan', 'cafe');
    let px = corps().x, pz = corps().z, saut = 0, tLeve = 0, tAssoit = 0, tr = 0;
    for (let i = 0; i < 60 * 120; i++) {
      CL.step(1);
      const b = corps(), d = Math.hypot(b.x - px, b.z - pz); px = b.x; pz = b.z;
      if (g.vu) saut = Math.max(saut, d);
      if (modes[modes.length - 1] !== g.mode) modes.push(g.mode);
      if (g.mode === 'leve') tLeve++; if (g.mode === 'assoit') { tAssoit++; tr = Math.max(tr, g.p.transition || 0); }
      if (i > 300 && g.mode === 'assis' && g.siege === g.home) break;
    }
    S.tAct = 10;
    return { modes, saut, tLeve, tAssoit, tr };
  });
  ok(r.modes.join(' ').startsWith('assis leve marche') && r.modes.includes('assoit') && r.modes[r.modes.length - 1] === 'assis', `de près, Nathan se lève, marche, revient et s'assoit : ${r.modes.join(' > ')}`);
  ok(r.tLeve >= 30 && r.tLeve <= 45 && r.tAssoit >= 30 && r.tAssoit <= 45 && r.tr > 0.9 && r.saut < 0.06, `se lever en ${(r.tLeve / 60).toFixed(2)} s, s'asseoir en ${(r.tAssoit / 60).toFixed(2)} s ; le corps ne saute jamais (au plus ${(r.saut * 100).toFixed(1)} cm d'une image à l'autre)`);
  // 7. chaque pièce atteignable à pied : le joueur, mené depuis l'entrée par les couloirs et les portes, sans se coincer
  // (le chemin cherché parmi tout ce qui arrête dans le bâtiment, collisions.js ; rien du dehors ne doit y être resté :
  // signalé à part, et mis de côté le temps de la marche, qui ne juge que l'intérieur)
  r = await ev(() => {
    const S = CL.solu, LS = CL.monde.lieux.solumatic, res = {}, Q = { x0: S.P.atelier.x0, x1: S.P.atelier.x1 };
    const B = S.V.boites, dans = b => b.x1 > S.bords.x0 && b.x0 < S.bords.x1 && b.z1 > S.bords.z0 && b.z0 < S.bords.z1;
    const bs = CL.col.boites.filter(b => !b.fantome && dans(b));
    const miennes = new Set(B.map(b => b.map(v => v.toFixed(3)).join())), mT = new Set(S.V.tournees.map(t => t[0].toFixed(3) + ',' + t[1].toFixed(3)));
    const etrangeres = bs.filter(b => b.o ? !mT.has(b.o.cx.toFixed(3) + ',' + b.o.cz.toFixed(3)) : !miennes.has([b.x0, b.z0, b.x1, b.z1].map(v => v.toFixed(3)).join()) && !(b.x1 - b.x0 > 0.25 && b.z1 - b.z0 > 0.25 && (b.x0 <= S.bords.x0 + 0.01 || b.x1 >= S.bords.x1 - 0.01 || b.z0 <= S.bords.z0 + 0.01 || b.z1 >= S.bords.z1 - 0.01) && (b.x1 - b.x0 < 0.31 || b.z1 - b.z0 < 0.31)));
    for (const b of etrangeres) b.fantome = true;
    const G = S.grilleDe(bs.filter(b => !b.o && !b.fantome).map(b => [b.x0, b.z0, b.x1, b.z1]), bs.filter(b => b.o && !b.fantome).map(b => [b.o.cx, b.o.cz, 2 * b.o.hw, 2 * b.o.hd, Math.atan2(b.o.si, b.o.co)]), 0.36, 0.1);
    for (const [k, [bx, bz]] of Object.entries(S.V.cibles)) {
      CL.teleporter(LS.dedans.x, LS.dedans.z, -Math.PI / 2);
      const ch = G.chemin(LS.dedans.x, LS.dedans.z, bx, bz), j = CL.joueur;
      if (!ch) { res[k] = 'pas de chemin'; continue; }
      let i = 0, n = 0;
      for (; n < 60 * 60 && i < ch.length; n++) {
        const [tx, tz] = ch[i], dx = tx - j.pos.x, dz = tz - j.pos.z, d = Math.hypot(dx, dz);
        if (d < (i === ch.length - 1 ? 0.3 : 0.4)) { i++; continue; }
        j.update(1 / 60, dx / d, dz / d, 0.3, false, CL.col, n / 60);
      }
      res[k] = i >= ch.length ? 'ok' : `coincé en (${j.pos.x.toFixed(1)}, ${j.pos.z.toFixed(1)})`;
    }
    for (const b of etrangeres) b.fantome = false;
    CL.teleporter(LS.dedans.x, LS.dedans.z, -Math.PI / 2); CL.step(5);
    void Q;
    const D = S.bords, hors = (x, z) => !(x > D.x0 - 0.05 && x < D.x1 + 0.05 && z > D.z0 - 0.05 && z < D.z1 + 0.05);
    const rejetees = B.filter(([a, b, c, d]) => hors(a, b) || hors(c, d)).length + S.V.tournees.filter(([cx, cz]) => hors(cx, cz)).length;
    return { res, rejetees, etrangeres: etrangeres.map(b => [b.x0, b.z0, b.x1, b.z1].map(v => v.toFixed(1)).join(', ')) };
  });
  ok(r.rejetees === 0, `aucune boîte de l'intérieur hors des murs (monde.js ne les pose pas) : ${r.rejetees}`);
  ok(r.etrangeres.length === 0, `rien du dehors n'arrête dans le bâtiment (${r.etrangeres.length} : ${r.etrangeres.join(' | ')})`);
  ok(Object.values(r.res).every(v => v === 'ok') && Object.keys(r.res).length >= 15, 'chaque pièce atteignable à pied depuis l\'entrée : ' + Object.entries(r.res).map(([k, v]) => k + ' ' + v).join(', '));
  // 8. les captures de chaque pièce, à hauteur d'homme ; ce que ça coûte
  const pieces = {
    entree: ['hall', 0.5, 0.5, -1.9], support: ['atelier', 0.18, 0.15, 2.4], soleil: ['soleil', 0.75, 0.82, -2.2], atlas: ['atlas', 0.15, 0.85, 1.6],
    atlas2: ['atlas', 0.85, 0.82, -2.4], mars: ['mars', 0.85, 0.15, 3.0], terre: ['terre', 0.2, 0.45, 1.57], venus: ['venus', 0.2, 0.5, 1.57],
    mercure: ['mercure', 0.9, 0.8, -1.6], neptune: ['neptune', 0.8, 0.85, -2.8], uranus: ['uranus', 0.18, 0.85, 2.6], saturne: ['saturne', 0.85, 0.88, -2.4],
    jupiter: ['jupiter', 0.82, 0.88, -2.0], jupiter2: ['jupiter', 0.8, 0.22, 3.0], moyens: ['moyens', 0.45, 0.85, -1.9],
  };
  const couts = {};
  for (const [nom, [k, u, v, h]] of Object.entries(pieces)) {
    couts[nom] = await ev((k, u, v, h) => { const q = CL.solu.P[k]; CL.teleporter(q.x0 + u * (q.x1 - q.x0), q.z0 + v * (q.z1 - q.z0), h); CL.step(60); return CL.bench(30); }, k, u, v, h);
    await capture('solu-' + nom);
  }
  for (const [k, b] of Object.entries(couts)) console.log('     ' + k + ' : ' + b);
  {
    const m = Object.values(couts).map(b => +b.match(/(\d+) appels/)[1]), t = Object.values(couts).map(b => +b.match(/(\d+) triangles/)[1]);
    ok(Math.max(...m) <= 34 && Math.max(...t) < 250000, `dedans, au plus ${Math.max(...m)} appels de dessin et ${Math.max(...t)} triangles (ombres comprises)`);
  }
  // 9. le soir : les derniers s'en vont par la porte d'entrée (on les voit marcher jusqu'à elle), puis plus personne
  r = await ev(() => {
    const S = CL.solu, J = CL.jeu;
    J.minutes = 2 * 1440 + 18 * 60 + 25; S.horaires(true); CL.step(2);
    const avant = S.gens.filter(g => g.etat !== 'absent').map(g => g.id);
    const H = S.P.hall; CL.teleporter(H.x0 + 1.0, (H.z0 + H.z1) / 2, -Math.PI / 2);
    let vus = new Set();
    for (let i = 0; i < 60 * 70; i++) { CL.step(1); for (const g of S.gens) if (g.tache && g.tache.type === 'sortir' && g.mode === 'marche' && g.p.m.groupe.visible) vus.add(g.id); }
    J.minutes = 2 * 1440 + 18 * 60 + 50; CL.step(60 * 30);
    // le bureau vide, la nuit : écrans et lampes éteints (des veilleuses), les dalles et les télés éteintes
    J.minutes = 2 * 1440 + 22 * 60; CL.step(60);
    return { avant, vus: [...vus], apres: S.gens.filter(g => g.etat !== 'absent').length, ouverte: S.ouverte,
      lum: S.lum, dalles: S.voileD.visible, eteints: Object.values(S.allumes).filter(v => !v).length, ecrans: Object.keys(S.ecransDe).length };
  });
  ok(r.avant.length >= 1 && r.vus.length >= 1, `18 h 25 : encore là ${r.avant.join(', ')} ; on voit partir vers la porte : ${r.vus.join(', ')}`);
  ok(r.apres === 0 && !r.ouverte, '18 h 50 : plus personne, le bureau ferme');
  ok(r.lum === 0 && r.dalles && r.eteints === r.ecrans, `22 h, le bureau vide : les lampes éteintes (${r.lum}), les dalles et les télés aussi, ${r.eteints} écrans éteints sur ${r.ecrans}`);
  await capture('solu-soir-vide');
  // la caméra dans un angle à plante (Teddy, 28/11/2026 : les plantes bloquaient la vue) : elle s'arrête devant le feuillage
  r = await ev(() => {
    const S = CL.solu, q = S.P.atelier, J = CL.jeu; J.minutes = 2 * 1440 + 10 * 60; S.horaires(true);
    CL.teleporter(q.x1 - 0.5 - 1.6, q.z1 - 0.5 - 1.6, Math.atan2(-1, -1)); CL.step(120);
    const c = CL.camera.position, dans = S.V.plantes.filter(([x, z, r]) => Math.hypot(c.x - x, c.z - z) < r).length;
    return { dans, d: CL.cam.dCol, plantes: S.V.plantes.length };
  });
  ok(r.dans === 0 && r.plantes >= 10, `dos à l'angle du ficus de la maintenance, la caméra reste hors des feuillages (${r.plantes} grandes plantes ; recul ${r.d.toFixed(2)} m)`);
  await capture('solu-angle-plante');
  // 10. on ressort : les objets du dehors reviennent
  r = await ev(() => {
    const LS = CL.monde.lieux.solumatic, J = CL.jeu; CL.teleporter(LS.dedans.x - 0.3, LS.dedans.z, Math.PI / 2); CL.step(10);
    CL.agir(); CL.finirGeste(); CL.step(10);
    return { dedans: J.dedans, isoles: !!CL.isoles, n: CL.scene.children.length, toit: CL.monde.toitSolu.visible };
  });
  ok(!r.dedans && !r.isoles && r.toit, `on ressort même fermé : dehors, les objets du dehors revenus (${r.n} objets)`);
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

// l'heure du jeu à la fin du banc (les professionnels ferment le soir : un banc qui déborde sur la nuit doit le prévoir)
try { console.log('heure du jeu à la fin : ' + await ev(() => (CL.jeu ? `jour ${Math.floor(CL.jeu.minutes / 1440)}, ${CL.jeu.heureTxt}` : '?'))); } catch (_) { /* page fermée */ }
await navigateur.close();
if (erreurs.length) { console.log('\nERREURS :\n' + [...new Set(erreurs)].join('\n')); process.exit(1); }
console.log('\nAucune erreur.');
