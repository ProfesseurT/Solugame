// Tous les textes affichés dans le jeu.
// Règle de vérité : chaque fait produit ou réglementaire vient d'une source notée ici
// (fiche de faits du 21/11/2026 dans le JOURNAL du dépôt a-vous-de-jouer ; page « le bureau »
// de vitisoft.fr lue le 22/11/2026 ; arbitrages de Teddy). Ne rien ajouter sans source.
// Règlement saisi dans Vitisoft et DRM du mois dernier : demande de Teddy du 22/11/2026 ; le règlement en retard
// est une tâche du jour, que le vigneron ajoute lui-même à sa tournée (et non un client qui appelle) : Teddy, 22/11/2026 ; « Vitisoft exporte
// factures et encaissements vers le logiciel du comptable » et « calcule la DRM, validée dans CIEL » : fiche de faits.

import { eur, majuscule } from './outils.js';

export const VERSION = 'Démo 1.0';

// Prévente du registre phyto : 4,99 € HT/mois jusqu'au 31/12/2026, ensuite 9,99 € HT/mois.
export const PREVENTE_FIN = Date.UTC(2026, 11, 31, 23, 0, 0); // 1er janvier 2027, 0 h, heure de Paris
export const EN_PREVENTE = Date.now() < PREVENTE_FIN;
export const LP_URL = 'https://doc.solumatic.fr/registre-phyto-numerique-a-vous-de-jouer-qjxR-F.html?source=jeu-tournee-generale';

const s = n => (n > 1 ? 's' : ''); // pluriel
const liste = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1] : a[0] || ''); // « a, b et c »

// la notification du matin, et le sous-titre de Ma journée
export const MESSAGE_MATIN = '3 rappels, 1 règlement en retard et 1 prospect aujourd\'hui.';

// Les notifications du bureau (l'aperçu sur l'écran d'accueil du téléphone) ; les relances disent ce qui reste à faire
export const NOTIFS = {
  matin: MESSAGE_MATIN,
  reponse: c => `${c.nom} a répondu : ${c.demande} cartons de crémant.`,
  signee: c => `${c.nom} a signé la commande ${c.numero}.`,
  chargees: (n, prets) => `${n} commande${s(n)} chargée${s(n)} : ${prets} arrêt${s(prets)} prêt${s(prets)}.`,
  prospectNote: p => `${p.nom} : visite notée, à rappeler.`,
  commande: c => `Commande de ${c.nom} à préparer.`,
  taches: n => `${n} tâche${s(n)} du jour à traiter.`,
  prets: n => `${n} arrêt${s(n)} prêt${s(n)} : lancez la tournée.`,
  // au réveil, la journée d'hier pas finie : ce qui reste (« Chaque matin, il vous dit qui rappeler, quoi proposer »)
  reveil: r => `Ce matin : ${liste([
    ...(r.appels ? [`${r.appels} rappel${s(r.appels)}`] : []), ...(r.commandes ? [`${r.commandes} commande${s(r.commandes)} à préparer`] : []),
    ...(r.livraisons ? [`${r.livraisons} livraison${s(r.livraisons)}`] : []), ...(r.cheque ? ['le chèque de l\'Épicerie du Bourg'] : []),
    ...(r.prospect ? ['la visite de l\'Auberge du Moulin'] : []), ...(r.pc ? ['Vitisoft, au bureau du chai'] : []),
  ]) || 'rien de prévu'}.`,
};

export const OBJECTIFS = {
  tel: 'Regardez votre téléphone',
  rappels: n => `Le bureau : traitez les tâches du jour (${n} sur 5)`,
  saisie: c => `Commande ${c.du} : saisissez ${c.demande} carton${s(c.demande)}`,
  chai: 'Chargez les commandes signées au chai, en tracteur ou en van',
  tournee: 'Le bureau, écran Tournée : lancez la tournée, ou allez à un arrêt',
  signatures: 'Les clients signent leurs commandes sur leur téléphone',
  livrer: nom => `Tournée : livrez ${nom}`,
  bl: nom => `Faites signer le bon de livraison à ${nom}`,
  cheque: nom => `Tournée : récupérez le chèque de ${nom}`,
  prospect: nom => `Tournée : passez voir ${nom}, aux Grands Champs`,
  deguster: nom => `Faites goûter le rouge : servez un verre à ${nom}`,
  retour: 'Rentrez au bureau du chai : déposez le chèque sur le bureau',
  retourPC: 'Rentrez au bureau du chai : Vitisoft, sur le portable',
  pcOuvrir: 'Asseyez-vous au portable : tout se fait dans Vitisoft',
  pc: n => `Vitisoft : règlement, factures, DRM (${n} sur 3)`,
  pcFini: 'Tout est fait : fermez Vitisoft',
  dodo: 'Il est tard : rentrez dormir, à la maison du domaine',
  dodoJour: 'La journée de traitement, c\'est demain : rentrez dormir, à la maison du domaine',
  libre: 'Balade libre',
  // la nuit (outils.js : HORAIRES), les clients fermés : d'abord ce qui se fait seul (charger au chai, les tâches du
  // bureau, Vitisoft), sinon rentrer dormir ; le matin, avant 8 h, les clients ne s'appellent pas encore
  nuit: {
    dormir: 'Il fait nuit : les clients sont fermés. Rentrez dormir, la tournée reprend demain matin',
    chai: 'Il fait nuit : chargez au chai les commandes signées, pour la tournée de demain',
    pc: l => `Il fait nuit, les clients sont fermés : au bureau du chai, Vitisoft (${liste(l)})`,
  },
  tot: 'Il est tôt : le bureau appelle les clients à partir de 8 h',
};

// Les bannières (un titre, une ligne)
export const BANNIERES = {
  cheque: r => ['Chèque récupéré', `${eur(r.ttc)} · facture ${r.facture}`],
  prospect: ['Prospect rencontré', 'Visite notée dans le bureau, à rappeler'],
  fin: ht => ['C\'est réglé', `3 commandes livrées et facturées, 1 chèque saisi, 1 prospect à rappeler, la DRM calculée. +${eur(ht)} HT`],
};

// Les trois clients de la tournée (données fictives). Prix HT à la bouteille, 6 bouteilles par carton.
// « demande » : la quantité que le client donne au téléphone ; dans le bureau, la commande part de zéro.
export const CLIENTS = [
  { id: 'cave', ini: 'CP', coul: '#8e2a3b', nom: 'Cave du Pressoir', du: 'la Cave du Pressoir', de: 'de la Cave du Pressoir', lieu: 'Le Bourg',
    note: 'Rappel promis : réassort de Noël, 6 cartons attendus', tag: 'En retard · 3 j', tagJ: j => `En retard · ${3 + j} j`, tagC: 'retard', action: 'Appeler', mode: 'appel', fem: true,
    produit: 'Cuvée du Clos, rouge', demande: 6, pu: 9.5, numero: 'C-1194', bl: 'BL-0412', facture: 'F-2026-0127' },
  { id: 'bar', ini: 'LC', coul: '#1f3b4d', nom: 'Bar Le Cep', du: 'le Bar Le Cep', de: 'du Bar Le Cep', lieu: 'Le Bourg',
    note: 'Prend du crémant chaque fin d\'année, pas encore cette fois', tag: 'Aujourd\'hui', tagC: 'jour', action: 'Proposer', mode: 'message',
    produit: 'Crémant du Clos', demande: 2, pu: 11.5, numero: 'C-1195', bl: 'BL-0413', facture: 'F-2026-0128' },
  { id: 'treille', ini: 'LT', coul: '#2f5d50', nom: 'Restaurant La Treille', du: 'le Restaurant La Treille', de: 'du Restaurant La Treille', lieu: 'Le Bourg',
    note: 'Commande toutes les 3 semaines, rien depuis 38 jours', noteJ: j => `Commande toutes les 3 semaines, rien depuis ${38 + j} jours`, tag: 'Décroche', tagC: 'decroche', action: 'Prendre des nouvelles', mode: 'appel',
    produit: 'Cuvée du Clos, blanc', demande: 3, pu: 8.9, numero: 'C-1196', bl: 'BL-0414', facture: 'F-2026-0129' },
];

// Le client en retard de paiement (données fictives) : la facture d'une commande passée, 4 cartons de rouge
// (24 x 9,50 € HT = 228,00 € HT, TVA 20 % : 273,60 € TTC). C'est une tâche du jour : on ajoute le passage à sa
// tournée, on récupère le chèque.
export const RETARD = {
  id: 'epicerie', ini: 'EB', coul: '#2f4a6b', nom: 'Épicerie du Bourg', du: 'l\'Épicerie du Bourg', lieu: 'Le Bourg', fem: true,
  facture: 'F-2026-0098', ttc: 273.6, detail: '4 cartons de Cuvée du Clos, rouge',
};
// Le prospect de la tournée (données fictives) : un restaurant du hameau des Grands Champs, pas encore client. On ajoute
// la visite à sa tournée, on lui fait goûter le rouge (un geste du jeu : servir un verre), le bureau garde la visite dans
// le fil du client et dira quand le rappeler. Source, page du bureau (vitisoft.fr, lue le 23/11/2026) : « Prospection :
// Cavistes, restaurants, importateurs : suivis jusqu'à la commande. » ; « Le fil du client : appels, notes, factures,
// commandes signées en ligne. » ; « Chaque matin, il vous dit qui rappeler, quoi proposer et pourquoi ». Choix de Teddy
// (23/11/2026) : dégustation puis rappel, pas de commande.
export const PROSPECT = {
  id: 'auberge', ini: 'AM', coul: '#5a6b2f', nom: 'Auberge du Moulin', du: 'l\'Auberge du Moulin', lieu: 'Les Grands Champs', fem: true,
  note: 'Restaurant, pas encore client : passer le voir, lui faire goûter le rouge',
  fil: 'Visite : a goûté la Cuvée du Clos, rouge, pour sa carte d\'hiver. À rappeler.',
};
// Consignes de mission dans les écrans du bureau (c'est le jeu qui parle, pas l'appli) : la quantité dite au téléphone,
// et, tout fait dehors, où se passe la suite
export const CONSIGNE_QTE = c => `${c.nom} a demandé ${c.demande} carton${s(c.demande)}.`;
export const CONSIGNE_RETOUR = 'Tout est fait dehors. La suite se passe dans Vitisoft, sur le portable du bureau du chai.';
// la nuit, l'écran Tournée : les clients sont fermés (outils.js : HORAIRES)
export const CONSIGNE_NUIT = 'Il fait nuit : les clients sont fermés. La tournée reprend demain matin, dès 7 h.';

export const DIALOGUES = {
  intro: [{ qui: '', txt: '17 h 40. La journée n\'est pas finie.' }],
  appel: {
    cave: [
      { qui: 'Cave du Pressoir', txt: 'Allô ? Ah, c\'est vous ! Mes 6 cartons pour Noël, ça arrive ?' },
      { qui: 'Vous', txt: 'Je vous prépare la commande pendant qu\'on parle.' },
      { qui: 'Cave du Pressoir', txt: 'Envoyez-la-moi, je la signe sur mon téléphone.' },
    ],
    treille: [
      { qui: 'La Treille', txt: 'Bonjour ! On a été débordés. Il me faudrait 3 cartons de blanc pour les fêtes.' },
      { qui: 'Vous', txt: 'Je vous l\'envoie, vous signez en ligne.' },
    ],
  },
  reponseBar: [{ qui: 'Bar Le Cep', txt: 'Bien vu ! Mettez-moi 2 cartons de crémant.' }],
  signee: c => [{ qui: '', txt: `${c.nom} a signé la commande ${c.numero} sur son téléphone.` }],
  attenteSignature: n => [{ qui: '', txt: `Encore ${n} commande${s(n)} à signer. Patience, les clients relisent.` }],
  rienACharger: [{ qui: '', txt: 'Rien à charger pour l\'instant : les commandes se préparent dans le bureau, sur votre téléphone.' }],
  // un véhicule sans plateau (une voiture empruntée, l'enjambeur) au chai : il ne porte pas de cartons
  sansPlateau: g => [{ qui: '', txt: `${g === 'enjambeur' ? 'L\'enjambeur' : g === 'velo' ? 'Un vélo' : 'Une voiture'} ne porte pas de cartons : prenez le tracteur ou le van.` }],
  wtf: on => [{ qui: '', txt: on ? 'Mode WTF : volez les voitures, aplatissez les passants. Ils se relèvent, promis.' : 'Mode WTF coupé : on emprunte les voitures, les passants s\'écartent.' }],
  aPied: [{ qui: '', txt: 'Les cartons à pied ? Prenez plutôt le tracteur ou le van.' }],
  sansCartons: v => [{ qui: '', txt: v === 'van' ? 'Les cartons sont dans le van.' : 'Les cartons sont sur le tracteur.' }],
  // arrêté devant un client qui n'est pas encore prêt : ce qui manque, et où le faire
  pasPret: {
    commande: c => [{ qui: '', txt: `${c.nom} n'a pas encore commandé : ça se prépare dans le bureau, sur votre téléphone.` }],
    signature: c => [{ qui: '', txt: `${c.nom} n'a pas encore signé sa commande. Patience, il relit.` }],
    chai: c => [{ qui: '', txt: `Les cartons ${c.de} attendent au chai : chargez-les d'abord.` }],
    cheque: r => [{ qui: '', txt: `${r.nom} : ajoutez d'abord le passage à la tournée, dans le bureau.` }],
    prospect: p => [{ qui: '', txt: `${p.nom} : ajoutez d'abord la visite à la tournée, dans le bureau.` }],
  },
  charge: [{ qui: '', txt: 'Tout est chargé. Lancez la tournée dans le bureau, ou allez livrer un client.' }],
  chargeEnPartie: n => [{ qui: '', txt: `${n > 1 ? `${n} commandes chargées` : 'Une commande chargée'}. Partez livrer, ou attendez les autres signatures.` }],
  chargeReste: n => [{ qui: '', txt: `${n > 1 ? `${n} commandes chargées` : 'Une commande chargée'}. D'autres viennent d'être signées : elles attendent sur la palette.` }],
  accelerer: tactile => [{ qui: '', txt: tactile ? 'Gardez le doigt posé : les cartons vont trois fois plus vite.' : 'Gardez une flèche enfoncée : les cartons vont trois fois plus vite.' }],
  chequePlanifie: [{ qui: '', txt: 'Passage à l\'Épicerie du Bourg ajouté à la tournée : vous y récupérerez le règlement.' }],
  prospectPlanifie: [{ qui: '', txt: 'Passage à l\'Auberge du Moulin ajouté à la tournée : vous lui ferez goûter le rouge.' }],
  tournee: [{ qui: '', txt: 'Tournée lancée. L\'itinéraire est sur la carte.' }],
  versArret: nom => [{ qui: '', txt: `Direction ${nom}. L'itinéraire est sur la carte.` }],
  tourneeFinie: [{ qui: '', txt: 'Tournée faite. La suite est dans le bureau.' }],
  conduite: [{ qui: '', txt: 'Doigt posé : on avance. En mission, le véhicule suit l\'itinéraire tout seul.' }, { qui: '', txt: 'Glissez sur le côté pour tourner vous-même, vers le bas pour freiner et reculer. Lancé, vers le bas et sur le côté : ça dérape.' }],
  arrivee: {
    cave: [{ qui: 'Cave du Pressoir', txt: 'Parfait ! Et la facture ? Depuis le 1er septembre, je reçois les factures électroniques.' }],
    bar: [{ qui: 'Bar Le Cep', txt: 'Juste à temps pour le réveillon. Je signe où ?' }],
    treille: [{ qui: 'La Treille', txt: 'Merci ! Posez-les en cuisine, je signe le bon.' }],
    // (salut : « Bonjour » ou « Bonsoir », selon l'heure : mission.js)
    auberge: salut => [
      { qui: 'Auberge du Moulin', txt: `${salut} ! Vous êtes du Clos Libre ? On m'a parlé de votre rouge.` },
      { qui: 'Vous', txt: 'Je vous le fais goûter ?' },
    ],
    epicerie: salut => [
      { qui: 'Vous', txt: `${salut} ! Je passe pour la facture en retard.` },
      { qui: 'Épicerie du Bourg', txt: 'Ah oui, pardon, je l\'avais oubliée ! Voici le chèque : 273,60 €.' },
      { qui: 'Vous', txt: 'Merci, je le saisis dans Vitisoft en rentrant.' },
    ],
  },
  degustation: [
    { qui: 'Auberge du Moulin', txt: 'Il a du fruit, et pas trop de bois. Il irait bien avec ma carte d\'hiver.' },
    { qui: 'Auberge du Moulin', txt: 'Rappelez-moi quand je refais ma carte, d\'ici quelques semaines.' },
    { qui: 'Vous', txt: 'C\'est noté dans le bureau : je vous rappelle.' },
  ],
  chequeDepose: [{ qui: '', txt: 'Chèque posé sur le bureau. Reste à saisir le règlement dans Vitisoft.' }],
  livre: (c, soir) => [{ qui: '', txt: `Bon de livraison ${c.bl} signé par ${c.du}.` }, ...(c.id === 'cave' ? [{ qui: 'Vous', txt: `La facture part ${soir ? 'ce soir' : 'aujourd\'hui'}, depuis Vitisoft.` }] : [])],
  pcTracteur: [{ qui: '', txt: 'Descendez : le bureau du chai est là, sa porte donne sur la cour.' }],
  verre: [{ qui: 'Vous', txt: 'Un verre de Cuvée du Clos ? C\'est la maison qui offre.' }],
  retour: [{ qui: '', txt: 'Tournée terminée. Retour au bureau du chai : le chèque sur le bureau, puis Vitisoft, sur le portable.' }],
  retourPC: [{ qui: '', txt: 'Tournée terminée. Retour au bureau du chai : la suite est dans Vitisoft, sur le portable.' }],
  merci: soir => [{ qui: '', txt: `Trois livraisons, trois factures, un chèque saisi, un prospect à rappeler et la DRM prête pour CIEL. ${soir ? 'Bonne soirée' : 'Bonne journée'} !` }],
  // la nuit (outils.js : HORAIRES, APPELS) : arrivé chez un client fermé, pourquoi et quand repasser (avant 7 h : à
  // l'ouverture) ; la tournée qu'on voudrait lancer ; un appel qu'on voudrait passer (avant 8 h ou après 20 h)
  ferme: (c, tot) => [{ qui: '', txt: `${majuscule(c.du)} est ${c.fem ? 'fermée' : 'fermé'} à cette heure-ci. Je repasserai ${tot ? 'à l\'ouverture, à 7 h' : 'demain matin'}.` }],
  tourneeNuit: [{ qui: '', txt: 'Les clients sont fermés à cette heure-ci : la tournée reprend demain matin.' }],
  appelNuit: tot => (tot ? 'Trop tôt pour appeler un client : le bureau appelle dès 8 h.' : 'Trop tard pour appeler un client : rappel demain, dès 8 h.'),
};

// Ce que disent les passants à qui l'on sert un verre, et les automobilistes qu'on accroche (jamais méchant)
export const REPLIQUES_VERRE = ['Santé !', 'À la vôtre !', 'Fameux, ce rouge !', 'Il a du fruit !', 'Je passerai au domaine !', 'Un vrai velours.', 'Merci, c\'est gentil !'];
export const CHOCS_VOITURE = ['Eh ! Mon pare-chocs !', 'Regardez devant vous !', 'Ma voiture toute neuve !', 'Oh là là !', 'Doucement, le paysan !'];
// Les voitures de la départementale : celui qui prête la sienne ; en mode WTF (Réglages : décision de Teddy du
// 23/11/2026), celui à qui on la vole, et les passants qu'on aplatit (un gag de dessin animé : ils se relèvent en râlant)
export const VOITURES = {
  pretee: ['Prenez-la, mais ramenez-la-moi entière !', 'Les clés sont dessus. Doucement dans les virages !', 'Elle tire un peu à gauche, hein !', 'Pas de souci, je finis à pied.'],
  volee: ['Au voleur !', 'Ma voiture !', 'Hé ! Rendez-la-moi !', 'Revenez ici !'],
  ecrase: ['Aïe !', 'Ouille !', 'Ouch !'],
  releve: ['Chauffard !', 'Ça va pas, non ?!', 'Regardez où vous roulez !', 'Mon dos…', 'Même pas mal !'],
};

// Le bureau (extension web de Vitisoft, sur ordinateur, tablette ou smartphone), sur le téléphone et sur le portable
// du bureau du chai (« Au domaine sur l'ordinateur, au salon sur la tablette, en tournée sur le smartphone »).
// Source : vitisoft.fr/fonctionnalites/le-bureau-application-commerciale (22/11/2026, relue le 23/11/2026).
// Pas de prix, pas de date, pas d'« IA ».
export const BUREAU = {
  commande: 'Préparée pendant l\'appel, au tarif et aux remises du client.',
  aucuneCommande: 'Pas encore de commande aujourd\'hui : elles se préparent pendant l\'appel, depuis Ma journée.',
  envoi: c => `${c.nom} reçoit un lien personnel, propre à cette commande : il la relit, la confirme et la signe sur son téléphone, sans créer de compte.`,
  signee: 'Signée. Elle part dans Vitisoft sans ressaisie, prête à préparer et à facturer.',
  message: 'Message préparé : vous le relisez et le modifiez avant d\'envoyer.',
  texteMessage: 'Bonjour ! Comme chaque fin d\'année, je vous mets de côté du Crémant du Clos pour les fêtes ? Bonne journée.',
  tournee: 'Les arrêts dans l\'ordre, et ce qu\'il y a à faire chez chacun.',
  itineraire: 'Itinéraire suggéré, au départ du domaine',
  rienDePret: 'Rien de prêt pour l\'instant : ajoutez les passages dans Ma journée, chargez au chai les commandes signées.',
  bl: 'Le client signe le bon de livraison, du doigt, sur votre téléphone.',
  prospect: 'Prospection : suivie jusqu\'à la commande. Ce que vous notez reste dans le fil du client.',
};

// Vitisoft, sur le portable du bureau du chai (Vitisoft n'a pas d'appli téléphone : arbitrage de Teddy, 22/11/2026).
// C'est un logiciel installé, une icône sur le bureau de l'ordinateur, pas un onglet du navigateur (Teddy, 24/11/2026).
// Son interface d'après les captures du site (dépôt vitisoft.fr, src/assets/images/captures : dashboard-hero,
// vitisoft-tableau-de-bord-2026, vitisoft-caisse-reglement) : barre « VITISOFT » et nom du domaine, menu à gauche par
// rubriques (libellés recopiés), tableau de bord en tuiles, fenêtre Règlement aux modes de paiement en tuiles.
export const VITISOFT = {
  domaine: 'Domaine du Clos Libre',
  // (la date du tableau de bord, des factures et de leur échéance, à 30 jours : celle du jour du jeu, outils.js dateJeu ;
  // le jour 0, le soir de la tournée, est le mardi 8 décembre 2026)
  mois: 'Novembre 2026', echeanceJ: 30,
  menu: [
    ['Contacts', [['clients', 'Clients / contacts'], ['commerciaux', 'Commerciaux'], ['courtiers', 'Courtiers'], ['transporteurs', 'Transporteurs']]],
    ['Factures', [['factures', 'Liste des factures / Règlements'], ['faire', 'Faire une facture'], ['remises', 'Règlements / Remises banque'], ['avoirs', 'Avoirs']]],
    ['Commandes / Pro forma', [['commandes', 'Liste des commandes / BL'], ['commande', 'Faire une commande / BL'], ['proforma', 'Pro forma']]],
    ['Produits / Stocks', [['produits', 'Produits'], ['reservations', 'Réservations'], ['achats', 'Achats'], ['depots', 'Dépôts']]],
    ['Déclarations douanes', [['drm', 'DRM / DMS'], ['capsules', 'Capsules']]],
    ['Analyse', [['statistiques', 'Statistiques'], ['commissions', 'Commissions'], ['comptabilite', 'Comptabilité']]],
  ],
  // ce qu'on peut dire des écrans qui ne sont pas dans la démo (fiche de faits du 21/11/2026)
  fiches: {
    faire: 'Vitisoft fait vos factures au format Factur-X. Pennylane, plateforme agréée, les transmet.',
    comptabilite: 'Votre journal des ventes, TVA comprise, part dans le logiciel de votre comptable.',
  },
  // tableau de bord du domaine fictif : factures de l'exercice avant ce soir, panier moyen ; chiffre d'affaires par mois
  // (en euros), exercice en cours (décembre commencé) et exercice précédent
  facturesAvant: 126, panier: '312,40 €',
  ca: [[9800, 7400, 8900, 10200, 9100, 7600, 8300, 6900, 9400, 11800, 14200, 3100], [9100, 7900, 9600, 9800, 8700, 8100, 7700, 7200, 10100, 12400, 13600, 17900]],
  // factures déjà réglées (données fictives) : numéro, date, client, TTC
  anciennes: [['F-2026-0126', '05/12/2026', 'Vente au caveau', 64.8], ['F-2026-0125', '03/12/2026', 'Vente au caveau', 129.6],
    ['F-2026-0112', '31/10/2026', 'Restaurant La Treille', 213.6]],
  retardDate: '13/10/2026', retardEcheance: '12/11/2026',
  parCheque: 'L\'Épicerie du Bourg a réglé par chèque.',
  arrivees: 'Commandes signées, arrivées du bureau sans ressaisie',
  factureCreee: 'Facture créée au format Factur-X : un PDF lisible, avec ses données que les logiciels savent lire.',
  transmise: 'Transmise par Pennylane, plateforme agréée.',
  journal: 'Votre journal des ventes, TVA comprise, part dans le logiciel de votre comptable.',
  reglementSaisi: 'Règlement saisi : la facture est soldée. Vos encaissements partent avec vos factures dans le logiciel de votre comptable.',
  drmTitre: 'DRM du mois dernier',
  drm: 'Vitisoft calcule votre DRM. Vous la validez dans CIEL, chaque mois avant le 10.',
  drmFaite: 'DRM calculée, prête à valider dans CIEL.',
  // DRM du domaine fictif, en hectolitres : stock au début du mois, entrées, sorties, stock à la fin du mois
  drmLignes: [['Stock au début du mois', 412.4], ['Entrées', 0], ['Sorties', 21.15], ['Stock à la fin du mois', 391.25]],
  // les tâches n'apparaissent qu'une fois leur raison d'être arrivée : le chèque déposé au bureau, les commandes livrées
  tacheReglement: 'Saisir le règlement de l\'Épicerie du Bourg',
  tacheFactures: n => `Facturer ${n > 1 ? `les ${n} commandes livrées` : 'la commande livrée'}`,
  tacheDrm: 'Calculer la DRM du mois dernier',
  // une commande arrive dans Vitisoft quand le client l'a signée en ligne, pas avant
  aucuneCommande: 'Aucune commande arrivée pour l\'instant. Elles arrivent ici une fois signées en ligne par le client, sans ressaisie.',
  chequeAttendu: 'Le règlement n\'est pas encore arrivé.',
};

export const VITICODE = {
  titre: 'QR codes nutritionnels, gratuits',
  texte: 'Ce qui est obligatoire, c\'est l\'information : ingrédients et déclaration nutritionnelle, pour les vins produits depuis le 8 décembre 2023. Le QR code est une façon de la donner.',
  chiffre: '3 500 comptes Viticode',
};

export const PHYTO = EN_PREVENTE ? {
  titre: 'Le registre phyto passe au numérique le 1er janvier 2027.',
  texte: 'L\'appli ouvre le 1er janvier 2027. Prévente : 4,99 € HT/mois jusqu\'au 31/12/2026, ensuite 9,99 € HT/mois.',
  cta: 'Je me préinscris',
} : {
  titre: 'Le registre phyto est numérique depuis le 1er janvier 2027.',
  texte: 'Registre phyto : 9,99 € HT/mois.',
  cta: 'Découvrir le registre',
};

export const MESSAGES = [
  { id: 'compta', de: 'Cabinet comptable', apercu: 'Le journal des ventes arrive bien...',
    fil: ['Le journal des ventes arrive bien, TVA comprise. Bonne soirée !'] },
  { id: 'transport', de: 'Transporteur', apercu: 'Je passe jeudi prendre les palettes...',
    fil: ['Je passe jeudi prendre les palettes pour le Canada. Le DAE sera prêt ?'] },
];

export const FIN = {
  sur: 'Fin de la mission 1',
  titre: 'C\'est ça, Tournée générale.',
  texte: 'Le bureau dans la poche pour vendre et livrer, Vitisoft au domaine pour les règlements, les factures et la DRM. Il est tard : rentrez dormir, la journée de traitement vous attend au réveil.',
  // (la tournée finie en journée, le lendemain matin d'une nuit dormie : main.js finDemo)
  texteJour: 'Le bureau dans la poche pour vendre et livrer, Vitisoft au domaine pour les règlements, les factures et la DRM. La journée de traitement, c\'est demain : rentrez dormir, elle vous attend au réveil.',
  h: 'La suite',
  suite: [
    'Mission 2 : la journée de traitement, avec le Registre phyto',
    'Mission 3 : l\'habillage, avec Viticode et ses QR codes nutritionnels',
    'Dans le jeu complet : le DAE du transporteur, sur GAMMA 2, avec Vitisoft',
  ],
  bouton: 'Continuer',
};

/* ---------------------------------------------------------------- mission 2 : la journée de traitement
   Ce que fait le Registre phyto, d'après la page de prévente (LP de Teddy du 19/11/2026, reprise sur vitisoft.fr :
   src/data/registre-phyto-demo.ts et registre-phyto.ts, lus le 23/11/2026) : un traitement se note sur place, dans la
   vigne ; on coche les parcelles traitées, le produit et la dose ; le stade est repris du dernier traitement ; la cible ;
   pas de réseau : noté, puis envoyé quand ça capte ; chaque ligne dit qui a saisi, et quand ; l'ETA ou la CUMA saisit
   chez vous ; une erreur se corrige avec motif, rien n'est effacé ; en cas de contrôle : PDF, format officiel et fiche
   Stat'Phyto. Parcelles retrouvées depuis le fichier Telepac. Sur téléphone, tablette et ordinateur, avec le même
   compte : au chai ou au bureau, le registre sur grand écran, on peut y saisir aussi, et l'exporter (vitisoft.fr :
   src/pages/registre-phytosanitaire.astro, lu le 28/11/2026 ; dans le jeu, le portable du bureau du chai, pc.js ;
   Teddy, 28/11/2026 : « accessible et utilisable depuis l'ordinateur aussi, dans toutes les missions »). Aucune promesse de conformité (jamais « en règle ») :
   l'application enregistre, le contenu du registre reste sous la responsabilité de l'exploitant. Le registre devient
   numérique le 1er janvier 2027 (fiche de faits). La mission se passe le lendemain de la tournée de Noël (Teddy,
   24/11/2026), le mercredi 9 décembre si la tournée a fini le soir même (la date suit les jours du jeu : outils.js,
   dateJeu) : aucune année n'est affichée dans l'appli ; avant le 1er janvier 2027
   (EN_PREVENTE), chaque écran dit « aperçu, données fictives, ouverture le 1er janvier 2027 ».
   Le traitement du jour : un passage d'hiver de bouillie bordelaise seule, présenté comme réduisant le mildiou qui passe
   l'hiver (choix de Teddy, 24/11/2026 ; pratique trouvée seulement sur un site de jardinage, aucune source viticole). La
   bouillie bordelaise et le soufre mouillable sont utilisables en agriculture biologique. Doses, parcelles, noms : fictifs. */
export const TRAITEMENT = {
  // (la date du jour : outils.js dateJeu, forme longue pour le téléphone, courte pour le registre)
  // les parcelles du domaine dans le registre (i : leur place dans PARCELLES, monde.js), celles du jour d'abord
  parcelles: [
    { id: 'perrieres', nom: 'Les Perrières', cep: 'Chenin', i: 0, jour: true, reseau: true },
    { id: 'clos', nom: 'Le Clos', cep: 'Cabernet franc', i: 1, jour: true, reseau: true },
    { id: 'grandschamps', nom: 'Les Grands Champs', cep: 'Cabernet franc', i: 6, jour: true, reseau: false },
    { id: 'croix', nom: 'La Croix', cep: 'Chenin', i: 2 },
    { id: 'garenne', nom: 'La Garenne', cep: 'Cabernet franc', i: 5 },
    { id: 'basvignes', nom: 'Le Bas des Vignes', cep: 'Chenin', i: 4 },
  ],
  // les produits de l'armoire, et ce qu'il faut (dose) ; cuve : ce qui va dans la cuve aujourd'hui (la bouillie seule) ;
  // un fongicide de synthèse que le domaine, en bio, n'utilise pas
  produits: [
    { id: 'cuivre', nom: 'Bouillie bordelaise', sous: 'Cuivre · utilisable en bio', dose: 1.5, pas: 0.5, unite: 'kg/ha', bio: true, cuve: true },
    { id: 'soufre', nom: 'Soufre mouillable', sous: 'Soufre · utilisable en bio', dose: 5, pas: 1, unite: 'kg/ha', bio: true, cuve: false },
    { id: 'synthese', nom: 'Fongicide de synthèse', sous: 'Non utilisable en bio', dose: 0, pas: 0.5, unite: 'kg/ha', bio: false },
  ],
  cibles: ['Mildiou', 'Oïdium', 'Black-rot', 'Botrytis'], ciblesDuJour: ['Mildiou'],
  stade: 'Chute des feuilles', stadeDe: 'repris du traitement du 2 décembre',
  // le registre de la campagne avant ce matin (données fictives) ; « par » : qui a saisi
  avant: [
    { quand: '2 décembre · 8 h 40', parcelles: ['La Croix', 'La Garenne', 'Le Bas des Vignes'], produits: ['Bouillie bordelaise · 1,5 kg/ha'], cibles: ['Mildiou'], stade: 'Chute des feuilles', par: 'ETA des Coteaux, le 2 décembre à 11 h 15' },
    { quand: '29 juillet · 7 h 30', parcelles: ['Les Perrières', 'Le Clos', 'Les Grands Champs', 'La Croix'], produits: ['Bouillie bordelaise · 1,5 kg/ha', 'Soufre mouillable · 5 kg/ha'], cibles: ['Mildiou', 'Oïdium'], stade: 'Fermeture de la grappe', par: 'vous, le 29 juillet à 9 h 05' },
  ],
  message: {
    de: 'Claire, conseillère viticole', apercu: 'Le passage d\'hiver, aujourd\'hui...',
    // (sec : le jour de la semaine jusqu'où il fait sec, deux jours après aujourd'hui : telephone.js)
    fil: sec => [
      `Bonjour ! Les feuilles tombent et il fait sec jusqu'à ${sec} : c'est le bon jour pour votre passage d'hiver.`,
      'Bouillie bordelaise seule, à 1,5 kg/ha, pour réduire le mildiou qui passe l\'hiver. Pas de soufre cette fois.',
      'L\'ETA a fait vos trois autres parcelles le 2 : il reste Les Perrières, Le Clos et Les Grands Champs. Notez chaque parcelle dans le Registre phyto dès qu\'elle est traitée.',
    ],
  },
  // (le téléphone : touché en bas à droite de l'écran, ou la touche T au clavier)
  objectifs: {
    message: t => `Lisez le message de Claire : téléphone (${t ? 'en bas à droite' : 'touche T'}), appli Messages`,
    enjambeur: 'Montez dans l\'enjambeur : le pulvérisateur y est installé',
    aire: 'En enjambeur, à l\'aire de remplissage : préparez la bouillie',
    // une parcelle à la fois : n sur 3 ; pc, son avancement
    traiter: (nom, n, pc) => pc ? `Traitez ${nom} : ${pc} %` : `En enjambeur, traitez ${nom} (parcelle ${n} sur 3)`,
    noter: (noms, t) => `Notez ${noms} dans le Registre phyto (téléphone, ${t ? 'en bas à droite' : 'touche T'} ; ou l'ordinateur du bureau du chai)`,
    noterIci: (noms, t) => `Sans réseau, notez quand même ${noms} : Registre phyto (téléphone, ${t ? 'en bas à droite' : 'touche T'})`,
    envoyer: 'Remontez vers la route : la saisie partira toute seule quand ça capte',
    fin: 'Journée de traitement finie',
    dodo: 'Rentrez dormir : demain, l\'habillage du Clos 2025',
  },
  dialogues: {
    reveil: date => [{ qui: '', txt: `${majuscule(date)}, le lendemain de la tournée.` }, { qui: '', txt: 'Un message de Claire, la conseillère viticole.' }],
    luMessage: [{ qui: '', txt: 'La bouillie bordelaise, c\'est du cuivre : utilisable en bio. Le pulvérisateur est sur l\'enjambeur.' }],
    pasEnjambeur: [{ qui: '', txt: 'On pulvérise avec l\'enjambeur : c\'est lui qui porte le pulvérisateur.' }],
    remplir: [{ qui: '', txt: 'De l\'eau et la bouillie bordelaise : les cuves sont prêtes.' }, { qui: '', txt: 'Elles suffisent pour les trois parcelles.' }],
    guidage: tactile => [{ qui: '', txt: tactile ? 'Engagez l\'enjambeur dans un rang : doigt posé, il y va tout seul.' : 'Engagez l\'enjambeur dans un rang : flèche du haut seule, il y va tout seul.' }],
    engage: tactile => [{ qui: '', txt: tactile ? 'Engagé : l\'enjambeur fait toute la parcelle tout seul. Je ne gère que l\'avance, doigt posé.' : 'Engagé : l\'enjambeur fait toute la parcelle tout seul. Je ne gère que l\'avance, flèche du haut.' }],
    // une parcelle finie : on la note tout de suite, avant la suivante (une saisie par parcelle ; Teddy, 26/11/2026)
    parcelleFinie: (nom, t) => [
      { qui: '', txt: `${nom} : traitée. Avant la suivante, je la note dans le registre.` },
      { qui: '', txt: `Le téléphone (${t ? 'en bas à droite' : 'touche T'}), l'appli Registre phyto : une saisie pour cette parcelle.` },
    ],
    sansReseau: (nom, t) => [
      { qui: '', txt: `${nom} : traitée. Ici, pas de réseau.` },
      { qui: '', txt: `Je la note quand même, tout de suite : Registre phyto (${t ? 'le téléphone, en bas à droite' : 'touche T'}). La saisie partira quand ça captera.` },
    ],
    note: suivante => [{ qui: '', txt: `Noté et envoyé. Direction ${suivante}, en enjambeur.` }],
    noteAttente: [{ qui: '', txt: 'Noté sur le téléphone, sans réseau : la saisie partira toute seule quand ça captera.' }, { qui: '', txt: 'Je remonte vers la route.' }],
    dAbord: noms => [{ qui: '', txt: `D'abord, je note ${noms} dans le Registre phyto : une saisie par parcelle.` }],
    envoye: [{ qui: '', txt: 'Ça capte : la saisie des Grands Champs est partie toute seule.' }],
    fin: [{ qui: '', txt: 'Trois parcelles traitées en bio, et tout est noté dans le registre.' }],
    pasPrete: [{ qui: '', txt: 'La bouillie n\'est pas prête : d\'abord l\'aire de remplissage.' }],
  },
  app: {
    nouveau: 'Noter un traitement',
    parcelles: 'Parcelles traitées', parcellesNote: 'Retrouvées depuis votre fichier Telepac.',
    produits: 'Produit et dose', stade: 'Stade', cible: 'Cible', recap: 'Vérifier',
    enregistrer: 'Enregistrer', enregistre: 'Enregistré', horsReseau: 'Pas de réseau : noté, envoyé quand ça capte.',
    attente: 'En attente d\'envoi', envoye: 'Envoyé',
    registre: 'Cette campagne', registreNote: 'Chaque ligne dit qui a saisi, et quand.',
    exporter: 'Exporter pour un contrôle', exportNote: 'PDF, format officiel et fiche Stat\'Phyto.', exportOk: 'Export prêt.',
    apercu: 'Aperçu de l\'application, données fictives. Ouverture le 1er janvier 2027.',
    apercuApres: 'Données fictives.',
    // ce que le téléphone rappelle quand la saisie ne correspond pas à ce qui a été fait
    pasTraitee: (noms, n) => `${noms} : pas encore traitée${n > 1 ? 's' : ''} aujourd'hui.`,
    aucune: 'Cochez les parcelles traitées.',
    pasBio: 'Le domaine est en bio : pas de fongicide de synthèse.',
    pasCuve: p => `${p} : pas dans la cuve aujourd'hui.`,
    dose: (p, d) => `${p} : la dose de la cuve, ${d}.`,
    manque: 'Il manque le produit de la cuve : la bouillie bordelaise.',
    cibleJour: 'La cible : ce que dit Claire, le mildiou.',
    deja: (noms, n) => `${noms} : déjà noté${n > 1 ? 'es' : 'e'} aujourd'hui.`,
    // la notification sur l'écran d'accueil du téléphone, une parcelle traitée
    notif: nom => `${nom} traitée : à noter`,
    // les consignes dans les écrans de l'appli (c'est le jeu qui parle, pas l'appli) : quoi toucher, à chaque étape
    guide: {
      avant: 'Traitez d\'abord une parcelle : la saisie se fait juste après, une par parcelle.',
      accueil: noms => `${noms} : touchez « Noter un traitement ».`,
      parcelles: (noms, n) => `Cochez ${noms} : ${n > 1 ? 'les parcelles' : 'la parcelle'} que vous venez de traiter. Une saisie par parcelle.`,
      produits: (nom, dose) => `Dans la cuve, la ${nom} seule, à ${dose} (le message de Claire) : montez sa dose avec +.`,
      stade: 'Le stade est repris du dernier traitement : rien à changer.',
      cible: 'La cible, d\'après le message de Claire : le mildiou.',
      recap: 'Tout est juste : enregistrez.',
      recapSans: 'Pas de réseau ici : enregistrez quand même. La saisie reste sur le téléphone et partira toute seule quand ça captera.',
      suite: nom => `Noté. Fermez le téléphone : direction ${nom}, en enjambeur.`,
      suiteOrdi: nom => `Noté. Levez-vous du portable : direction ${nom}, en enjambeur.`,
      attente: 'Noté sans réseau. Fermez le téléphone et remontez vers la route : la saisie partira toute seule.',
    },
    attenteNote: n => `${n} saisie${n > 1 ? 's' : ''} en attente : envoyée${n > 1 ? 's' : ''} dès que ça capte.`,
  },
  bannieres: {
    titre: date => [majuscule(date), 'Mission 2 : la journée de traitement'],
    prete: ['Bouillie prête', 'Bouillie bordelaise 1,5 kg/ha'],
    traitee: nom => ['Parcelle traitée', nom],
    note: n => ['Traitement noté', `${n} parcelle${n > 1 ? 's' : ''} dans le registre`],
    attente: ['Noté sans réseau', 'Envoyé quand ça capte'],
    envoye: ['Envoyé', 'Le registre est à jour'],
    fin: ['Journée de traitement finie', '3 parcelles traitées, tout est noté dans le registre'],
  },
  finCarte: {
    sur: 'Fin de la mission 2',
    titre: 'C\'est ça, le Registre phyto.',
    texte: 'Un traitement se note sur place, dans la vigne, sur le téléphone. Sans réseau, il est noté et part quand ça capte. Rentrez dormir : demain, l\'habillage du Clos 2025.',
    h: 'Dans l\'application',
    suite: [
      'Vous cochez les parcelles traitées, le produit et la dose',
      'Le stade, repris du dernier traitement',
      'Chaque ligne dit qui a saisi, et quand ; votre ETA ou CUMA saisit chez vous',
      'Une erreur de saisie se corrige avec un motif : rien n\'est effacé',
      'En cas de contrôle : PDF, format officiel et fiche Stat\'Phyto',
      'Sur téléphone, tablette et ordinateur, avec le même compte',
    ],
    bouton: 'Continuer la balade',
  },
};

/* ---------------------------------------------------------------- mission 3 : l'habillage, avec Viticode
   Ce que fait Viticode, d'après viticode.fr (la page d'accueil, ses captures d'écran et la fiche produit d'exemple, lues
   le 24/11/2026) : un site, où l'on se connecte depuis le navigateur de l'ordinateur comme du téléphone (dans le jeu,
   aussi sur le portable du bureau du chai, pc.js ; Teddy, 28/11/2026) ; gratuit, nombre de fiches produit illimité ; la fiche produit (nom du produit, 50 caractères au plus ;
   description ; degré d'alcool ; millésime ; appellation ; lot ; couleur : rouge, blanc, rosé, orange, jaune, aucune) ;
   les ingrédients par catégorie, préchargés (on peut ajouter les siens), ingrédients bio et allergènes ; la déclaration
   nutritionnelle pour 100 ml, la calculatrice de l'énergie (« Calculer mon énergie »), les valeurs à zéro affichées
   comme quantités négligeables ; la consommation responsable (pictogrammes, message) ; une fois la fiche publiée, son QR
   code unique (« Scanner ce QR code avec votre mobile... », Télécharger, Copier) ; la personnalisation du QR code
   (paramétrage du domaine, format Svg, Pdf ou Png, bordures, couleurs ; titre des sections, pied de page de la valeur
   énergétique), à télécharger pour l'imprimeur ; côté consommateur, après le scan : « Avez-vous plus de 18 ans ? »,
   puis la fiche dans sa langue (24 langues européennes) : couleur, alcool, millésime, appellation, ingrédients et
   allergènes, déclaration nutritionnelle, labels (Bio...), consommation responsable ; fiches stockées sans limite de
   temps, aucune donnée collectée sur les consommateurs qui les visitent. « Testez-moi ! » : sous le QR code d'exemple.
   Les catégories et ingrédients de la liste du jeu : un extrait, d'après le règlement délégué (UE) 2019/934 (cité par
   vitisoft.fr) et la fiche d'exemple ; la base préchargée de Viticode n'est pas recopiée.
   La loi : règlement (UE) 2021/2117 (article 119 du règlement 1308/2013 modifié, §4 et §5, lu sur EUR-Lex le
   24/11/2026) : sur l'étiquette, la déclaration nutritionnelle peut se limiter à la valeur énergétique (« E »), la
   déclaration complète et la liste des ingrédients étant fournies par voie électronique, sans information commerciale
   ni collecte de données d'utilisateur ; les allergènes restent sur l'étiquette. Fiche de faits : vins produits depuis
   le 8 décembre 2023 ; QR code possible avec la mention « ingrédients ». C'est l'information qui est obligatoire, pas le
   QR code. L'énergie : coefficients de l'annexe XIV du règlement (UE) 1169/2011 (lu le 24/11/2026) : alcool 29 kJ/g et
   7 kcal/g, glucides 17 kJ/g et 4 kcal/g ; l'éthanol pèse 0,789 g/ml. « 3 500 comptes Viticode » : la page de prévente
   du registre (fiche de faits), jamais additionné aux domaines de Vitisoft.
   La mission (Teddy, 24/11/2026) : un échantillon chez l'œnologue, qui donne les valeurs ; la fiche et le QR code dans
   Viticode, testés sur le téléphone ; l'étiquette envoyée à l'imprimeur-étiqueteur ; les bouteilles tirées-bouchées à
   son entrepôt, pour l'habillage ; puis (Teddy, 24/11/2026) de grosses quantités : six palox sur une remorque, que seul
   le tracteur tire ; puis (Teddy, 25/11/2026) l'échantillon pris au chai, la remorque préparée par un salarié pendant
   qu'on est au labo (il aide à l'atteler), l'imprimerie dans une petite zone d'activités hors du village, son message
   une nuit après (ou six heures), la remorque à aller rechercher et à poser au chai. Le lendemain de la journée de
   traitement : jeudi 10 décembre quand chaque mission a tenu dans sa journée (la date suit les jours du jeu : outils.js,
   dateJeu) ; le message de l'imprimerie, le lendemain matin. Les professionnels ne travaillent pas la nuit (Teddy,
   26/11/2026 ; outils.js, HORAIRES) : le labo, Marc, l'imprimerie fermés, ce qui a besoin d'eux attend le matin. Le BAT (bon à tirer) :
   l'épreuve que l'imprimeur fait valider avant d'imprimer. Cuvée, analyse, lot, noms : fictifs. */
export const HABILLAGE = {
  // la cuvée à habiller et son analyse (le bulletin du labo) : degré en % vol, le reste pour 100 ml ; so2 en mg/L
  vin: { nom: 'Le Clos 2025', cuvee: 'Le Clos', millesime: '2025', couleur: 'rouge', appellation: 'Anjou', lot: 'L25CL1', degre: 12.5, glucides: 0.8, sucres: 0.2, so2: 64 },
  domaine: 'Domaine du Clos Libre',
  // Viticode : les couleurs de la fiche, les catégories d'ingrédients et leurs ingrédients (un extrait), les langues
  couleurs: ['Rouge', 'Blanc', 'Rosé', 'Orange', 'Jaune', 'Aucune'],
  categories: [
    { id: 'principaux', nom: 'Ingrédients principaux', ingredients: [{ id: 'raisins', nom: 'Raisins' }, { id: 'mout', nom: 'Moût de raisin concentré' }] },
    { id: 'conservateurs', nom: 'Conservateurs et antioxydants', ingredients: [{ id: 'sulfites', nom: 'Sulfites', allergene: true }, { id: 'ascorbique', nom: 'Acide ascorbique' }, { id: 'sorbate', nom: 'Sorbate de potassium' }] },
    { id: 'stabilisateurs', nom: 'Agents stabilisateurs', ingredients: [{ id: 'citrique', nom: 'Acide citrique' }, { id: 'gomme', nom: 'Gomme arabique' }] },
    { id: 'acidite', nom: 'Régulateurs d\'acidité', ingredients: [{ id: 'tartrique', nom: 'Acide tartrique' }, { id: 'malique', nom: 'Acide malique' }] },
  ],
  // ce qu'il y a dans le vin (dit par l'œnologue) : raisins bio, et le soufre ajouté à la mise en bouteille
  ingredients: ['raisins', 'sulfites'],
  fichier: 'QR code Le Clos 2025.svg',
  imprimerie: 'Imprimerie Saint-Vincent', oeno: 'Hélène', etiqueteur: 'Julien', salarie: 'Marc',
  messages: {
    imprimerie: {
      de: 'Imprimerie Saint-Vincent', apercu: 'L\'habillage du Clos, c\'est aujourd\'hui...',
      fil: [
        'Bonjour ! L\'habillage du Clos 2025, c\'est aujourd\'hui : la ligne est libre cet après-midi.',
        'Il me manque le fichier de la contre-étiquette : le QR code des ingrédients et de la déclaration nutritionnelle.',
        'Envoyez-le-moi, puis amenez-moi la remorque de palox à l\'entrepôt, dans la zone d\'activités, à la sortie du bourg.',
      ],
      recu: 'Bien reçu ! Voici le BAT (bon à tirer) de la contre-étiquette :',
      accord: 'Bon pour accord !',
      imprime: 'C\'est parti, j\'imprime. Amenez-moi la remorque à l\'entrepôt : la ligne d\'habillage vous attend.',
      // le message d'après l'habillage : la photo d'une bouteille habillée, et le lien de sa fiche (Julien l'a scannée)
      termine: 'C\'est fini : les six palox du Clos 2025 sont habillés.',
      termineFil: ['C\'est fini : les six palox du Clos 2025 sont habillés. Capsule, étiquette, et la contre-étiquette avec votre QR code.', 'J\'ai scanné une bouteille, la fiche s\'ouvre bien :', 'Les palox sont rechargés sur la remorque, tournée vers la sortie. Passez la prendre avec le tracteur, je vous aide à l\'atteler. Julien'],
    },
    labo: {
      de: 'Laboratoire d\'œnologie', apercu: 'Le bulletin d\'analyse du Clos 2025...',
      intro: 'Bonjour, voici le bulletin d\'analyse du Clos 2025, rouge.',
      fin: 'Ingrédients : raisins (bio) et sulfites, rien d\'autre n\'a été ajouté. Bonne mise en bouteille ! Hélène',
    },
  },
  // le bulletin d'analyse : les lignes affichées dans Messages (pour 100 ml, sauf mention)
  bulletin: v => [
    ['Titre alcoométrique', `${String(v.degre).replace('.', ',')} % vol`],
    ['Glucides', `${String(v.glucides).replace('.', ',')} g / 100 ml`],
    ['dont sucres', `${String(v.sucres).replace('.', ',')} g / 100 ml`],
    ['Matières grasses, acides gras saturés, protéines, sel', 'négligeables'],
    ['SO2 total', `${v.so2} mg/L`],
  ],
  objectifs: {
    message: 'Lisez le message de l\'imprimerie (Messages)',
    echantillon: 'Au chai, à pied : prenez une bouteille du Clos dans le carton ouvert, l\'échantillon pour le labo',
    labo: 'Apportez l\'échantillon au labo d\'œnologie, dans le bourg',
    retour: 'Rentrez au domaine : Marc prépare la remorque de palox',
    tracteur: 'Prenez le tracteur : lui seul tire la remorque de palox',
    atteler: 'En tracteur, arrêtez-vous devant le timon de la remorque : Marc vous aide à atteler',
    analyse: 'Le labo analyse le vin : le bulletin arrive sur votre téléphone',
    fiche: 'Viticode : créez la fiche du Clos 2025 avec le bulletin du labo',
    tester: 'Viticode : testez la fiche, « Testez-moi ! »',
    telecharger: 'Viticode : téléchargez le QR code pour l\'imprimeur',
    envoyer: 'Envoyez le QR code à l\'imprimerie',
    bat: 'Messages : validez le BAT de l\'imprimerie',
    entrepot: 'Emmenez la remorque à l\'imprimerie, dans la zone d\'activités après le bourg',
    dechargement: 'Julien rentre les palox au chariot élévateur',
    attente: 'L\'habillage prend six heures : rentrez dormir au domaine, l\'imprimerie vous écrira',
    reprendreTracteur: 'Prenez le tracteur et allez chercher la remorque à l\'imprimerie',
    reprendre: 'Allez chercher la remorque à l\'imprimerie : arrêtez-vous à l\'entrée de la cour',
    chai: 'Ramenez la remorque au chai, et dételez-la dans la cour',
    marc: 'Marc rentre les palox au chai, avec le transpalette',
    fin: 'Le Clos 2025 est habillé',
    // la nuit (outils.js : HORAIRES) : ce qui attend un professionnel fermé, quand rien ne reste à faire seul
    nuit: {
      labo: 'Il fait nuit : le labo d\'œnologie est fermé. Rentrez dormir, vous y porterez l\'échantillon demain matin',
      bulletin: 'Le labo est fermé : le bulletin arrivera demain matin. Rentrez dormir',
      bat: 'L\'imprimerie est fermée : le BAT arrivera demain matin. Rentrez dormir',
      marc: 'Il fait nuit : Marc est rentré chez lui. Rentrez dormir, il vous aidera à atteler demain matin',
      imprimerie: 'Il fait nuit : l\'imprimerie est fermée. Rentrez dormir, vous y emmènerez la remorque demain matin',
      reprendre: 'Il fait nuit : l\'imprimerie est fermée. Rentrez dormir, vous reprendrez la remorque demain matin',
      chai: 'Il fait nuit : Marc est rentré chez lui. Rentrez dormir, vous poserez la remorque au chai demain matin',
    },
  },
  dialogues: {
    reveil: date => [{ qui: '', txt: `${majuscule(date)}. Aujourd'hui, on habille le Clos 2025 : six palox.` }, { qui: '', txt: 'Un message de l\'imprimerie.' }],
    luMessage: [{ qui: '', txt: 'Pour le QR code, il me faut les valeurs du labo : un échantillon à l\'œnologue d\'abord.' }, { qui: '', txt: 'Il y a un carton du Clos ouvert dans le chai. Pendant ce temps, Marc sortira la remorque du hangar et la chargera.' }],
    echantillon: [{ qui: '', txt: 'Une bouteille du Clos : l\'échantillon pour le labo. Direction le bourg.' }],
    apresLabo: [{ qui: '', txt: 'Le bulletin arrivera sur le téléphone. Je rentre au domaine : la remorque doit être prête.' }],
    prete: [{ qui: 'Marc', txt: 'La remorque est prête : sortie du hangar, les six palox du Clos dessus, au bord de l\'allée.' }, { qui: 'Marc', txt: 'Venez avec le tracteur, je vous aide à l\'atteler.' }],
    preteTracteur: [{ qui: 'Marc', txt: 'La remorque est prête : sortie du hangar, les six palox du Clos dessus, au bord de l\'allée.' }, { qui: 'Marc', txt: 'Arrêtez-vous devant le timon, je vous guide.' }],
    pasTracteur: [{ qui: '', txt: 'Six palox, c\'est trop lourd : il faut le tracteur pour tirer la remorque.' }],
    pasTracteurRetour: [{ qui: 'Julien', txt: 'Bonjour ! Pour la remorque, il faut le tracteur.' }],
    timon: [{ qui: 'Marc', txt: 'Arrêtez-vous juste devant le timon, dans son axe.' }],
    marcAide: [{ qui: 'Marc', txt: 'Reculez doucement... Stop ! Je lève la béquille et je mets la goupille.' }],
    attelee: [{ qui: 'Marc', txt: 'C\'est attelé ! Bonne route.' }, { qui: '', txt: 'Le bulletin est arrivé : la fiche Viticode, puis l\'imprimerie.' }],
    atteleeAvant: [{ qui: 'Marc', txt: 'C\'est attelé ! Bonne route.' }, { qui: '', txt: 'J\'attends le bulletin du labo pour la fiche Viticode.' }],
    versEntrepot: [{ qui: 'Marc', txt: 'C\'est attelé ! Bonne route.' }, { qui: '', txt: 'Direction l\'imprimerie, dans la zone d\'activités après le bourg.' }],
    labo: [
      { qui: 'Hélène', txt: 'Bonjour ! C\'est l\'échantillon du Clos ?' },
      { qui: '', txt: 'Oui, pour la déclaration nutritionnelle. Rien d\'ajouté à part le soufre, à la mise.' },
      { qui: 'Hélène', txt: 'Alors en ingrédients : raisins et sulfites. Je lance l\'analyse, le bulletin arrive sur votre téléphone dans la demi-heure.' },
    ],
    sansEchantillon: [{ qui: 'Hélène', txt: 'Bonjour ! Pour l\'analyse, il me faut un échantillon : une bouteille du lot.' }],
    bulletin: [{ qui: '', txt: 'Le bulletin du labo est arrivé. Direction Viticode : sur le téléphone, ou sur l\'ordinateur du bureau du chai.' }],
    publiee: [{ qui: '', txt: 'La fiche est publiée : elle a son QR code. Je la teste.' }],
    teste: [{ qui: '', txt: 'Ce que lira le client en scannant la bouteille, dans sa langue.' }],
    envoye: [{ qui: '', txt: 'Le fichier est parti à l\'imprimerie.' }],
    bat: [{ qui: '', txt: 'Le BAT de l\'imprimerie : la contre-étiquette, avec le QR code.' }],
    batOk: [{ qui: '', txt: 'La remorque maintenant : au domaine, en tracteur.' }],
    pasFichier: [{ qui: 'Julien', txt: 'Salut ! Il me faut d\'abord la contre-étiquette validée : le fichier du QR code, puis le BAT.' }],
    pasRemorque: [{ qui: 'Julien', txt: 'Et les bouteilles ? Les palox sont sur la remorque, au domaine : venez avec le tracteur.' }],
    entrepot: [{ qui: 'Julien', txt: 'Salut ! Dételez-la là, je prends le chariot.' }],
    // (aujourdhui : la ligne finit avant la fermeture ; sinon, demain matin : mission3.js)
    chariot: aujourdhui => [{ qui: 'Julien', txt: `Je rentre les palox et je lance la ligne. Ça prend six heures : ${aujourdhui ? 'je vous écris quand c\'est fini' : 'elle finira demain matin, je vous écris'}.` }],
    decharge: [{ qui: '', txt: 'Les six palox sont rentrés, la ligne tourne. Il n\'y a plus qu\'à attendre : je rentre au domaine.' }],
    patience: [{ qui: 'Julien', txt: 'La ligne tourne, ça prend six heures. Je vous écris quand c\'est prêt !' }],
    reveilHabille: date => [{ qui: '', txt: `${majuscule(date)}. Un message de l'imprimerie.` }],
    // la nuit : arrivé chez un professionnel fermé, pourquoi et quand revenir (tot : avant 7 h, à l'ouverture)
    laboFerme: tot => [{ qui: '', txt: `Le labo d'œnologie est fermé à cette heure-ci. J'y retourne ${tot ? 'à l\'ouverture' : 'demain matin'}.` }],
    imprimerieFermee: tot => [{ qui: '', txt: `L'imprimerie est fermée à cette heure-ci. Je reviendrai ${tot ? 'à l\'ouverture' : 'demain matin'}.` }],
    marcRentre: [{ qui: '', txt: 'Marc est rentré chez lui : on attellera demain matin.' }],
    marcRentreChai: [{ qui: '', txt: 'Marc est rentré chez lui : je pose la remorque demain matin, il rentrera les palox avec le transpalette.' }],
    sms: [{ qui: '', txt: 'L\'imprimerie : c\'est habillé ! Je vais chercher la remorque, en tracteur.' }],
    julienAide: [{ qui: 'Julien', txt: 'Bonjour ! Mettez-vous en travers, là, et reculez sur le timon. Je m\'occupe de la goupille.' }],
    versChai: [{ qui: 'Julien', txt: 'C\'est bon ! Bonne route, et bonne vente.' }, { qui: '', txt: 'Je la ramène au chai.' }],
    fin: [{ qui: '', txt: 'Le Clos 2025 est habillé, et chaque bouteille dit ce qu\'elle contient.' }],
    // Marc, à la fin : il rentre les palox au chai avec le transpalette ; quand on fonce sur lui, il s'écarte en criant
    // (Teddy, 25/11/2026)
    marcDecharge: [{ qui: 'Marc', txt: 'Laissez, je m\'en occupe : je rentre les palox au chai avec le transpalette.' }],
    marcFini: [{ qui: 'Marc', txt: 'C\'est rangé : les six palox sont au chai. Elles sont belles, ces bouteilles !' }],
    marcCri: 'Attention aux accidents du travail ! Ça va te coûter cher !',
  },
  // l'appli : ce que le jeu rappelle (consignes, pas Viticode) et les refus quand la fiche ne correspond pas au bulletin
  app: {
    consigne: v => `Le bulletin du labo : ${String(v.degre).replace('.', ',')} % vol ; pour 100 ml, glucides ${String(v.glucides).replace('.', ',')} g dont sucres ${String(v.sucres).replace('.', ',')} g, le reste négligeable. Ingrédients : raisins bio et sulfites.`,
    attente: 'Le bulletin du labo n\'est pas encore arrivé : la fiche attendra les valeurs.',
    nom: 'Touchez les champs pour les remplir.',
    degre: v => `Degré d'alcool : le bulletin dit ${String(v.degre).replace('.', ',')} % vol.`,
    couleur: 'La couleur : c\'est un rouge.',
    champs: 'Remplissez le nom, le millésime, l\'appellation et le lot.',
    glucides: v => `Glucides : le bulletin dit ${String(v.glucides).replace('.', ',')} g pour 100 ml.`,
    sucres: v => `Dont sucres : le bulletin dit ${String(v.sucres).replace('.', ',')} g pour 100 ml.`,
    energie: 'Calculez l\'énergie (« Calculer mon énergie ») avec les valeurs saisies.',
    raisins: 'Il manque les raisins.',
    bio: 'Les raisins sont bio : cochez la feuille.',
    sulfites: 'Il manque les sulfites : le soufre ajouté à la mise.',
    enTrop: n => `${n} : pas dans ce vin (l'œnologue l'a dit : raisins et sulfites).`,
    titre: 'Gardez le titre « Ingrédients » : il dit à quoi sert le QR code.',
    pied: 'Gardez le pied de page : la valeur énergétique doit rester sur l\'étiquette.',
    telecharge: 'QR code téléchargé.',
    // sur l'ordinateur du bureau du chai (pc.js) : le fichier dans les téléchargements, envoyé à l'imprimerie, sa réponse
    // sur le téléphone
    telechargeOrdi: 'Dans vos téléchargements',
    envoyerOrdi: qui => `L'envoyer à ${qui}`,
    reponseOrdi: 'Sa réponse arrivera sur le téléphone, dans Messages',
    envoyeOrdi: 'Envoyé à l\'imprimerie : sa réponse arrivera sur le téléphone, dans Messages.',
    copie: 'Lien copié.',
    mineur: 'Cette fiche est réservée aux personnes majeures.',
  },
  // la fiche côté consommateur, dans sa langue (la langue du téléphone par défaut)
  langues: {
    fr: { nom: 'Français', couleur: 'Couleur', rouge: 'rouge', alcool: 'Alcool', millesime: 'Millésime', appellation: 'Appellation', ingredients: 'Ingrédients', raisins: 'Raisins', conservateurs: 'Conservateurs et antioxydants', sulfites: 'Sulfites', bio: '(*) Issus de l\'agriculture biologique.', decl: 'Déclaration nutritionnelle (/ 100 ml)', energie: 'Energie', glucides: 'Glucides', sucres: 'dont Sucres', negl: 'Contient des quantités négligeables de : Matières grasses, Acides gras saturés, Protéines, Sel', labels: 'Labels', labelBio: 'Agriculture biologique', conso: 'Consommation responsable', abus: 'L\'abus d\'alcool est dangereux pour la santé. Toujours consommer avec modération.', age: 'Avez-vous plus de 18 ans ?', oui: 'oui', non: 'non' },
    en: { nom: 'English', couleur: 'Colour', rouge: 'red', alcool: 'Alcohol', millesime: 'Vintage', appellation: 'Appellation', ingredients: 'Ingredients', raisins: 'Grapes', conservateurs: 'Preservatives and antioxidants', sulfites: 'Sulphites', bio: '(*) From organic farming.', decl: 'Nutrition declaration (/ 100 ml)', energie: 'Energy', glucides: 'Carbohydrate', sucres: 'of which sugars', negl: 'Contains negligible amounts of: fat, saturates, protein, salt', labels: 'Labels', labelBio: 'Organic farming', conso: 'Responsible drinking', abus: 'Alcohol abuse is dangerous for your health. Always drink in moderation.', age: 'Are you over 18?', oui: 'yes', non: 'no' },
    de: { nom: 'Deutsch', couleur: 'Farbe', rouge: 'rot', alcool: 'Alkohol', millesime: 'Jahrgang', appellation: 'Ursprungsbezeichnung', ingredients: 'Zutaten', raisins: 'Trauben', conservateurs: 'Konservierungsstoffe und Antioxidationsmittel', sulfites: 'Sulfite', bio: '(*) Aus ökologischer Landwirtschaft.', decl: 'Nährwertdeklaration (/ 100 ml)', energie: 'Energie', glucides: 'Kohlenhydrate', sucres: 'davon Zucker', negl: 'Enthält geringfügige Mengen von: Fett, gesättigten Fettsäuren, Eiweiß, Salz', labels: 'Siegel', labelBio: 'Ökologischer Landbau', conso: 'Verantwortungsvoller Genuss', abus: 'Alkoholmissbrauch ist gesundheitsschädlich. Immer in Maßen genießen.', age: 'Sind Sie über 18 Jahre alt?', oui: 'ja', non: 'nein' },
    it: { nom: 'Italiano', couleur: 'Colore', rouge: 'rosso', alcool: 'Alcol', millesime: 'Annata', appellation: 'Denominazione', ingredients: 'Ingredienti', raisins: 'Uve', conservateurs: 'Conservanti e antiossidanti', sulfites: 'Solfiti', bio: '(*) Da agricoltura biologica.', decl: 'Dichiarazione nutrizionale (/ 100 ml)', energie: 'Energia', glucides: 'Carboidrati', sucres: 'di cui zuccheri', negl: 'Contiene quantità trascurabili di: grassi, acidi grassi saturi, proteine, sale', labels: 'Marchi', labelBio: 'Agricoltura biologica', conso: 'Consumo responsabile', abus: 'L\'abuso di alcol è pericoloso per la salute. Consumare sempre con moderazione.', age: 'Hai più di 18 anni?', oui: 'sì', non: 'no' },
    es: { nom: 'Español', couleur: 'Color', rouge: 'tinto', alcool: 'Alcohol', millesime: 'Añada', appellation: 'Denominación', ingredients: 'Ingredientes', raisins: 'Uvas', conservateurs: 'Conservadores y antioxidantes', sulfites: 'Sulfitos', bio: '(*) Procedentes de la agricultura ecológica.', decl: 'Información nutricional (/ 100 ml)', energie: 'Valor energético', glucides: 'Hidratos de carbono', sucres: 'de los cuales azúcares', negl: 'Contiene cantidades insignificantes de: grasas, grasas saturadas, proteínas, sal', labels: 'Sellos', labelBio: 'Agricultura ecológica', conso: 'Consumo responsable', abus: 'El abuso de alcohol es peligroso para la salud. Consumir siempre con moderación.', age: '¿Tiene más de 18 años?', oui: 'sí', non: 'no' },
  },
  languesNote: 'La fiche s\'affiche dans la langue du téléphone ; 24 langues européennes.',
  bannieres: {
    titre: date => [majuscule(date), 'Mission 3 : l\'habillage'],
    bulletin: ['Bulletin du labo', 'Le Clos 2025, rouge'],
    publiee: ['Fiche publiée', 'Le QR code du Clos 2025'],
    envoye: ['Envoyé', 'Le QR code est chez l\'imprimeur'],
    bat: ['BAT validé', 'La contre-étiquette part à l\'impression'],
    attelee: ['Attelée', 'La remorque de palox du Clos 2025'],
    reprise: ['Attelée', 'Les palox habillés du Clos 2025'],
    livre: ['Livré', 'La remorque est à l\'imprimerie'],
    decharge: ['Palox rentrés', 'La ligne d\'habillage tourne'],
    sms: ['Message', 'Imprimerie Saint-Vincent : c\'est habillé'],
    fin: ['Habillé', 'Le Clos 2025, avec son QR code'],
  },
  finCarte: {
    sur: 'Fin de la mission 3',
    titre: 'C\'est ça, Viticode.',
    texte: 'Une fiche produit et son QR code, gratuitement. On scanne la bouteille : les ingrédients et la déclaration nutritionnelle, dans sa langue. 3 500 comptes Viticode.',
    h: 'Dans Viticode',
    suite: [
      'Gratuit, nombre de fiches produit illimité',
      'Les ingrédients préchargés, le bio et les allergènes',
      'La calculatrice de l\'énergie',
      'Le QR code en Svg, Pdf ou Png, pour l\'imprimeur',
      'La fiche en 24 langues européennes, sans données collectées sur les consommateurs',
    ],
    cta: 'Créer mes QR codes sur viticode.fr', url: 'https://viticode.fr/',
    bouton: 'Continuer la balade',
  },
};
// L'énergie de la fiche (pour 100 ml) : l'alcool (degré x 0,789 g/ml) et les glucides, coefficients de l'annexe XIV
export const energie = (degre, glucides) => {
  const alcool = degre * 0.789;
  return { kj: Math.round((alcool * 29 + glucides * 17) * 10) / 10, kcal: Math.round((alcool * 7 + glucides * 4) * 100) / 100 };
};

/* L'équipe de Solumatic (solumatic.js) : les 21 du site et Vanessa. Source : la page « À propos » de vitisoft.fr, bloc
   « L'équipe » (dépôt local vitisoft.fr, src/pages/a-propos.astro, lu le 27/11/2026) : les noms et, quand le site les donne,
   les fonctions (titre). Vanessa, commerciale en freelance, vient certains jours (Teddy, 27/11/2026 : « dans le bureau des
   sales, elles sont 3 + vanessa ») ; le site ne la cite pas, on ne donne que son prénom. Jérémie s'écrit comme Teddy l'écrit
   (le site : « Jeremie »). La place de chacun, d'après Teddy (27/11/2026) : piece (une pièce du plan, solumatic.js : P) ;
   role : ses répliques (SOLUMATIC) et son poste (écrans, casque) ; silhouette : 'femme' ou 'homme' (celles que Teddy
   désigne par « elles » sont des femmes, le patron et l'associé des hommes ; les autres d'après le prénom, à changer ici
   au besoin) ; tenue de bureau d'hiver, sans manteau (perso.js : veste, chemise, pull, gilet, robe, jupe), ses couleurs ;
   le reste (teint, cheveux, âge, taille) est tiré au sort (perso.js : tirerApparence), sans ressemblance cherchée.
   Les répliques ne disent jamais « il » ou « elle » d'un collègue. */
export const EQUIPE = [
  { id: 'thomas', prenom: 'Thomas', nom: 'Petit', titre: 'Président de Solugroup', piece: 'uranus', role: 'patron', silhouette: 'homme', tenue: 'veste', haut: '#2c3e66', bas: '#2f2f35', col: '#e9eef4', lunettes: true },
  { id: 'teddy', prenom: 'Teddy', nom: 'Pereira', titre: 'Associé, directeur marketing commercial', piece: 'neptune', role: 'associe', silhouette: 'homme', tenue: 'chemise', haut: '#e9eef4', bas: '#2f3440' },
  { id: 'romane', prenom: 'Romane', nom: 'Bouijoux', titre: '', piece: 'saturne', role: 'commerciale', silhouette: 'femme', tenue: 'pull', haut: '#b8524a', bas: '#2c3e50' },
  { id: 'alice', prenom: 'Alice', nom: 'Fontaine', titre: '', piece: 'saturne', role: 'commerciale', silhouette: 'femme', tenue: 'veste', haut: '#33404f', bas: '#3a3f48' },
  { id: 'camila', prenom: 'Camila', nom: 'Vendramini', titre: '', piece: 'saturne', role: 'commerciale', silhouette: 'femme', tenue: 'gilet', haut: '#d9c7a7', bas: '#2a2d36' },
  { id: 'vanessa', prenom: 'Vanessa', nom: '', titre: 'Freelance', piece: 'saturne', role: 'freelance', silhouette: 'femme', tenue: 'chemise', haut: '#f2ede4', bas: '#1f2430', freelance: true },
  { id: 'dylan', prenom: 'Dylan', nom: 'Lecomte', titre: 'Manager dév. logiciel', piece: 'jupiter', role: 'dev', silhouette: 'homme', tenue: 'pull', haut: '#2f3e4e', bas: '#3b4a5e', tissuBas: 'jean' },
  { id: 'emeline', prenom: 'Emeline', nom: 'Marchi', titre: 'Dév. logiciel', piece: 'jupiter', role: 'dev', silhouette: 'femme', tenue: 'pull', haut: '#5f7d4e', bas: '#2c3442', tissuBas: 'jean' },
  { id: 'nathan', prenom: 'Nathan', nom: 'Peltier', titre: 'Dév. Web', piece: 'jupiter', role: 'dev', silhouette: 'homme', tenue: 'gilet', haut: '#8a8f96', bas: '#2f3a4c', tissuBas: 'jean' },
  { id: 'kevin', prenom: 'Kevin', nom: 'Lamant', titre: 'Dév. Web', piece: 'jupiter', role: 'dev', silhouette: 'homme', tenue: 'pull', haut: '#7a2e3a', bas: '#30343c', tissuBas: 'jean' },
  { id: 'jeremie', prenom: 'Jérémie', nom: 'Delavault', titre: 'Responsable partenariats', piece: 'jupiter', role: 'partenariats', silhouette: 'homme', tenue: 'chemise', haut: '#a9c1dc', bas: '#2b3340' },
  { id: 'vincent', prenom: 'Vincent', nom: 'Jallerat', titre: 'Manager dév. Web', piece: 'venus', role: 'devweb', silhouette: 'homme', tenue: 'pull', haut: '#3f4a3c', bas: '#2c2f36' },
  { id: 'jessica', prenom: 'Jessica', nom: 'Perochon', titre: 'Intégratrice de données', piece: 'terre', role: 'donnees', silhouette: 'femme', tenue: 'pull', haut: '#6c4f7f', bas: '#24262d' },
  { id: 'charlene', prenom: 'Charlene', nom: 'Terrier', titre: 'Formatrice', piece: 'terre', role: 'formatrice', silhouette: 'femme', tenue: 'gilet', haut: '#c98b5b', bas: '#2f3440' },
  { id: 'ophelie', prenom: 'Ophélie', nom: 'Tessereau', titre: 'Manager support', piece: 'atelier', role: 'manager', silhouette: 'femme', tenue: 'veste', haut: '#41546b', bas: '#262a31' },
  { id: 'clement', prenom: 'Clément', nom: 'Chevallier', titre: 'Opérateurs de maintenance', piece: 'atelier', role: 'support', silhouette: 'homme', tenue: 'pull', haut: '#ef6c26', bas: '#2f3440', tissuBas: 'jean' },
  { id: 'cindy', prenom: 'Cindy', nom: 'Tillet', titre: 'Opérateurs de maintenance', piece: 'atelier', role: 'support', silhouette: 'femme', tenue: 'pull', haut: '#2e6f8e', bas: '#2a2d36' },
  { id: 'hugo', prenom: 'Hugo', nom: 'Rajoye', titre: 'Opérateurs de maintenance', piece: 'atelier', role: 'support', silhouette: 'homme', tenue: 'chemise', haut: '#5d7f99', bas: '#2c3e50' },
  { id: 'lorette', prenom: 'Lorette', nom: 'Chanvalon', titre: 'Opérateurs de maintenance', piece: 'atelier', role: 'support', silhouette: 'femme', tenue: 'gilet', haut: '#9c6b8a', bas: '#25282f' },
  { id: 'raphael', prenom: 'Raphaël', nom: 'Desmard', titre: 'Opérateurs de maintenance', piece: 'atelier', role: 'support', silhouette: 'homme', tenue: 'pull', haut: '#4a5a43', bas: '#33373f', tissuBas: 'jean' },
  { id: 'emma', prenom: 'Emma', nom: 'Pillette', titre: 'Formatrice', piece: 'soleil', role: 'formation', silhouette: 'femme', tenue: 'chemise', haut: '#f4f1ea', bas: '#2b2f3a' },
  { id: 'emilie', prenom: 'Emilie', nom: 'Barbottin', titre: 'Formatrice', piece: 'soleil', role: 'formation', silhouette: 'femme', tenue: 'pull', haut: '#2f5d62', bas: '#2a2d34' },
];

/* Les bureaux de Solumatic (solumatic.js) : ce que dit chacun quand on passe tout près, selon son rôle (EQUIPE) ou ce qu'il
   fait (café, imprimante, baby-foot, réunion, visite) ; la bulle commence par son prénom. Des mots de bureau : on nomme les
   logiciels, sans rien promettre ni chiffrer (règle de vérité, CLAUDE.md) ; jamais « il » ni « elle » d'un collègue, ni
   d'accord qui dise qui parle. Les buts au baby-foot. */
export const SOLUMATIC = {
  bonjour: ['Bonjour ! Bienvenue chez Solumatic.', 'Bonjour ! Vous cherchez quelqu\'un ?', 'Bonne journée !'],
  patron: ['Bienvenue chez Solumatic ! Faites comme chez vous.', 'Bonjour ! La porte est toujours ouverte.', 'Ah, bonjour ! Vous avez vu Atlas ? C\'est là qu\'on se réunit.'],
  associe: ['Bonjour ! Neptune, c\'est mon bureau. Entrez.', 'La réunion est à Mercure, si vous la cherchez.', 'Bonjour ! Je relis un contrat, je suis à vous.'],
  commerciale: ['Bonjour ! Je suis au téléphone avec un domaine, deux minutes.', 'Belle journée pour appeler les vignerons.', 'Je note le rappel dans Le bureau et je suis à vous.', 'Une démonstration ? Je regarde mon agenda.'],
  freelance: ['Bonjour ! Je ne passe que certains jours, alors j\'en profite.', 'Je viens en renfort, et toujours pour le café du matin.', 'Bonjour ! Le poste du bout, c\'est le mien quand je suis là.'],
  dev: ['Chut, ça compile.', 'Encore une relecture et je pousse.', 'Ça marche sur mon poste, c\'est déjà ça.', 'Le café ? À Mars, au bout du couloir.', 'Vous avez vu le tableau des tâches ?', 'Un bug ? Montrez-moi ça.'],
  partenariats: ['Bonjour ! Je prépare un rendez-vous avec un partenaire.', 'Les partenariats, c\'est par ici.', 'Un café, et j\'appelle le suivant.'],
  devweb: ['Bonjour ! Le site web, c\'est ici.', 'Je relis une page avant la mise en ligne.', 'On regarde d\'abord sur téléphone, toujours.'],
  donnees: ['J\'importe le fichier d\'un nouveau client : attention, ça défile.', 'Une colonne de plus et tout est à sa place.', 'Les données, c\'est comme la vigne : ça se taille.'],
  formatrice: ['Bonjour ! Je prépare la prochaine formation.', 'Un vigneron m\'attend en visio tout à l\'heure.', 'Le cahier d\'exercices est presque bouclé.'],
  manager: ['Bonjour ! Ici, c\'est le plateau du support.', 'La file d\'appels est calme : on en profite pour les tickets.', 'Chut, l\'équipe est en ligne.'],
  support: ['Support, bonjour ! Je vous écoute.', 'Vous voyez la petite flèche ? Cliquez juste là.', 'Je prends la main sur votre poste, ne touchez plus la souris.', 'Le casque sur les oreilles : je suis en ligne.', 'Je note tout dans le ticket.', 'Redémarrer ? C\'est souvent la première question.'],
  formation: ['Formation à distance en cours : un petit coucou à la caméra ?', 'Partagez votre écran, on regarde ensemble.', 'Vous m\'entendez bien ? Je coupe mon micro une seconde.', 'On passe à l\'exercice suivant.', 'Le voyant est allumé : session en cours.'],
  // ce qu'on fait loin de son poste
  cafe: ['Un café ? La machine est sur le comptoir.', 'On parlait du week-end.', 'Il reste des croissants, servez-vous.', 'Le meilleur moment de la matinée.'],
  imprimante: ['L\'imprimante fait encore des siennes.', 'Bourrage papier, évidemment.', 'Je récupère mes impressions et je file.'],
  reunion: ['On fait le point, on en a pour un moment.', 'Bonjour ! Réunion en cours.', 'Vous restez avec nous ?'],
  visite: ['Deux minutes, on regarde ça ensemble.', 'Je passais en coup de vent.', 'On en reparle au café ?'],
  babyfoot: ['Pas de pissette !', 'Tu joues la gagne ?', 'Attends, je suis en défense.', 'Revanche à midi !'],
  but: ['But !', 'Et un but !', 'Gamelle !'],
  repas: ['Bon appétit !', 'Il reste de la place, installez-vous.', 'On parle de tout, sauf du travail.'],
  // Romane, devant l'entrée, en pause (rien à moraliser)
  fume: ['Bonjour ! Toujours la première arrivée, jamais la première entrée.', 'Deux minutes de pause et je rappelle mon domaine.', 'Il pique, ce matin ! La porte est ouverte, entrez.', 'Ma pause, mon bureau à ciel ouvert.', 'Vous venez pour une démonstration ? J\'arrive tout de suite.'],
  // la porte fermée : personne (les horaires : solumatic.js) ; quand l'équipe arrive (« à 7 h 45 », « demain à 7 h 45 »)
  ferme: quand => `Solumatic est fermé à cette heure-ci : l'équipe arrive ${quand}.`,
  etiquetteFerme: quand => `Fermé · l'équipe arrive ${quand}`,
};

// Le parvis de la tonnellerie (tonnellerie.js) : le tonnelier qui cercle, le chauffeur, le rouleur
export const TONNELLERIE = {
  cercleur: ['Attention les oreilles, je cercle !', 'Les cercles, un par un, à la chasse.', 'Du chêne fendu, séché deux ou trois ans dehors.'],
  chauffeur: ['Ne vous approchez pas trop du feu.', 'On chauffe pour cintrer les douelles, puis pour la chauffe.', 'Un peu d\'eau sur le bois, sinon il casse.'],
  rouleur: ['Pardon, je passe avec la barrique !', 'Celle-là part demain chez un vigneron du coin.', 'Elle roule toute seule, il suffit de la guider.'],
};

// Le village du château (village.js) : ceux qui déjeunent en terrasse, le serveur, les touristes, le belvédère
export const VILLAGE = {
  attables: ['Bonjour !', 'On est bien, en terrasse, même en décembre.', 'Les rillettes sont excellentes, ici.', 'Vous êtes du coin ? Quel beau village.'],
  serveur: ['Je vous installe ? Une table au soleil ?', 'Attention, ça passe !', 'Le plat du jour est encore là.'],
  touristes: ['Quel château !', 'Vous pourriez nous prendre en photo ?', 'C\'est par où, le belvédère ?', 'Les tours sont magnifiques.'],
  belvedere: ['Quelle vue sur la vallée !', 'On voit les vignes jusqu\'au bourg.', 'Bonjour !'],
};

// Les cyclistes (velos.js) : la sonnette, un véhicule qui fonce sur eux, le saut de côté, le vélo relevé
export const VELOS = {
  sonnette: ['Dring dring !', 'Pardon, je passe !', 'Attention, vélo !', 'Dring !'],
  attention: ['Hé, doucement !', 'Attention !', 'Oh là !'],
  saute: ['Waouh !', 'Ouh là !', 'Aïe aïe aïe !'],
  chute: ['Non mais ça va pas ?!', 'Eh ! Il y a un vélo !', 'On ne voit pas les cyclistes, ou quoi ?', 'Mon vélo !'],
  repart: ['Bon, il n\'a rien. On repart.', 'Plus de peur que de mal.', 'Les tracteurs, je vous jure !', 'Allez, en selle.'],
  // son vélo couché, poussé par un véhicule (Teddy, 28/11/2026) ; prêté au joueur ; volé (mode WTF)
  pousse: ['Hé ! Mon vélo !', 'Doucement avec mon vélo !', 'Il était là, mon vélo !'],
  prete: ['Tenez, prenez-le. Faites-y attention !', 'Allez-y, je finirai à pied.', 'Prenez-le, je ne suis pas pressé.'],
  vole: ['Au voleur ! Mon vélo !', 'Hé ! Rendez-moi ça !', 'Mon vélo ! Revenez !'],
};

// Le parvis du chai (parvis.js) : ce que disent ceux qui y travaillent quand on passe près d'eux, à pied. Le soir de la
// tournée ; le lendemain matin, jour du traitement.
export const PARVIS = {
  rinceur: {
    tournee: ['Salut ! Je finis de rincer les barriques et j\'y vais.', 'Recule un peu, ça éclabousse !', 'Encore deux barriques et c\'est bon pour ce soir.'],
    traitement: ['Bon courage pour le traitement !', 'Je rince les barriques ce matin, elles seront prêtes pour le soutirage.'],
    habillage: ['C\'est aujourd\'hui, l\'habillage du Clos ?', 'Marc prépare la remorque de palox : il faudra le tracteur.'],
  },
  porteuse: {
    tournee: ['Je range les caisses de vendange pour l\'hiver.', 'Bonne tournée ! Les clients vont être contents.', 'Attention, ça glisse près du nettoyeur.'],
    traitement: ['Alors, cette tournée d\'hier ? Bonne journée, et bon traitement !', 'Je range les caisses, la remorque doit repartir.'],
    habillage: ['Le traitement d\'hier s\'est bien passé ? Bon habillage !', 'Pour l\'échantillon du labo, il y a un carton du Clos ouvert dans le chai.'],
  },
};

// Les missions : le téléphone (app Missions : où l'on en est, rejouer une mission gagnée) et l'accueil (Continuer). La
// partie s'enregistre toute seule sur l'appareil (sauvegarde.js).
export const MISSIONS = {
  liste: [
    { id: 'tournee', n: 'Mission 1', titre: 'La tournée de Noël', texte: 'Les commandes au téléphone, les livraisons au bourg, le chèque, la dégustation, puis Vitisoft au bureau du chai.' },
    { id: 'traitement', n: 'Mission 2', titre: 'La journée de traitement', texte: 'Un traitement bio sur trois parcelles, noté dans le Registre phyto.' },
    { id: 'habillage', n: 'Mission 3', titre: 'L\'habillage', texte: 'Un échantillon au labo, la fiche et le QR code dans Viticode, les bouteilles habillées à l\'entrepôt de l\'imprimerie.' },
  ],
  note: 'La partie s\'enregistre toute seule sur cet appareil. À l\'accueil, « Continuer » la reprend, au domaine.',
  confirme: t => `Rejouer « ${t} » ? La partie en cours sera remplacée ; les missions gagnées le restent.`,
  // à l'accueil, sous « Continuer » ; la bannière à la reprise
  enCours: { tournee: 'La tournée de Noël, en cours', traitement: 'La journée de traitement, en cours', dodo: 'La journée de traitement finie : rentrez dormir', habillage: 'L\'habillage, en cours', libre: 'Les trois missions gagnées : le domaine est à vous' },
  reprise: 'Partie reprise',
};

/* ---------------------------------------------------------------- les restaurateurs du coin (restaurateurs.js)
   Des missions cachées, purement commerciales (Teddy, 26/11/2026 : « si on visite un resto, chaque tenancier peut demander
   une dégustation, et le bureau pourra rappeler de manière aléatoire une relance, et une commande signée ou pas des
   restaurateurs ; il faut aller les voir spontanément pour y avoir accès »). Huit restaurants inventés (données fictives),
   chacun son tenancier, ce qu'il sert, ce qu'il cherche ; les vins et leurs prix sont ceux de la tournée (CLIENTS).
   Ce que fait Le bureau, seulement ce que dit sa page (vitisoft.fr/fonctionnalites/le-bureau-application-commerciale, voir
   BUREAU) : il dit chaque jour qui rappeler et quoi proposer ; la commande se prépare pendant l'appel ; le client la signe
   sur son téléphone, par un lien personnel, sans compte ; signée, elle part dans Vitisoft sans ressaisie ; la prospection
   est suivie jusqu'à la commande, la note reste dans le fil du client. Ni prix, ni date, ni « IA » dans ce qu'on dit du
   produit. Une commande pas signée : rien n'est dit d'un refus en ligne ; le bureau propose de relancer, et c'est au
   téléphone que le restaurateur dit non. Les répliques des tenanciers sont drôles et vivantes, sans promesse produit.
   Ce qu'ils disent : accroche (en passant près d'eux, à pied), presentation (« Présenter nos vins »), occupe (pas le temps :
   repassez ; occupe, dans les données : leurs heures de coup de feu, en minutes), aime ou mitige (après le verre), notes
   (le fil du client dans le bureau), proposer (ce que le bureau dit de proposer), appel (commande, plusTard, non ; refus :
   relancé après une commande pas signée), revoir (repassé le voir). */
const dit = (qui, ...l) => l.map(txt => ({ qui, txt }));
const VOUS_PREPARE = { qui: 'Vous', txt: 'Je vous prépare la commande pendant qu\'on parle : vous la signez sur votre téléphone.' };
const VINS = {
  rouge: { produit: 'Cuvée du Clos, rouge', pu: 9.5 }, blanc: { produit: 'Cuvée du Clos, blanc', pu: 8.9 }, cremant: { produit: 'Crémant du Clos', pu: 11.5 },
};
export const RESTAURATEURS = {
  liste: [
    { id: 'tourelles', nom: 'Le Relais des Tourelles', du: 'du Relais des Tourelles', lieu: 'Le château', genre: 'Restaurant de terroir', qui: 'Odile', ini: 'RT', coul: '#7a2233',
      vin: 'rouge', ...VINS.rouge, demande: 5, penchant: 0.8, heures: [[720, 840]],
      perso: { femme: true, peau: '#f0c8a0', cheveux: '#a8a8a8', coiffure: 'chignon', tenue: 'chemise', haut: '#f4f1ea', col: '#f4f1ea', bas: '#2f2f35', tablier: '#7a2233', lunettes: true, corpulence: 1.12, taille: 0.92 },
      accroche: ['Bonjour ! Une table au soleil ?', 'Vous avez des bottes de vigneron, vous !'],
      presentation: [...dit('Odile', 'Bonjour ! Odile, du Relais des Tourelles. Vous avez des bottes de vigneron, vous.'),
        ...dit('Vous', 'Je viens du Domaine du Clos Libre, en bas, au bourg. Je vous présente nos vins ?'),
        ...dit('Odile', 'Les touristes me demandent tous un rouge d\'ici. Le mien vient de loin, et ça se voit sur leur tête.', 'Faites-moi goûter votre rouge.')],
      occupe: dit('Odile', 'Pas maintenant, c\'est le coup de feu ! Repassez après le service, vers deux heures.'),
      aime: dit('Odile', 'Il a du fruit et il sent sa terre. Avec mes rillettes, ça va partir tout seul.', 'Rappelez-moi, on parlera quantités.'),
      mitige: dit('Odile', 'Il est bon, mais je le voulais plus corsé pour ma matelote. Laissez-moi réfléchir.'),
      notes: { aime: 'A goûté le rouge en terrasse : aime son fruit, pour ses rillettes et sa carte de terroir.', mitige: 'A goûté le rouge : le trouve léger pour ses plats en sauce. Le présenter avec les rillettes.' },
      proposer: 'la Cuvée du Clos, rouge, pour sa carte de terroir',
      appel: {
        commande: n => [...dit('Odile', 'Allô, c\'est Odile, du Relais ! Vos vignes, les touristes les prennent en photo. Autant qu\'ils les boivent.', `Mettez-moi ${n} cartons de rouge.`), VOUS_PREPARE],
        plusTard: [...dit('Odile', 'Ah, c\'est vous ! Je refais ma carte la semaine prochaine. Rappelez-moi à ce moment-là.'), ...dit('Vous', 'C\'est noté, je vous rappelle.')],
        non: [...dit('Odile', 'J\'ai bien réfléchi : mon vin, c\'est mon beau-frère qui me le fait. Vous savez ce que c\'est, la famille.'), ...dit('Vous', 'Je comprends. Je garde votre contact, au cas où.')],
        refus: [...dit('Odile', 'La commande ? Je l\'ai bien reçue. Finalement, je passe mon tour : on ferme trois semaines en janvier.'), ...dit('Vous', 'Pas de souci. On en reparle à la réouverture.')],
      },
      revoir: { attente: 'Je vous attends au téléphone ! Les touristes aussi.', signee: 'Merci pour la commande ! Votre rouge sera à la carte dès qu\'il arrive.', fini: 'Repassez boire un café, quand vous voulez.' } },
    { id: 'poivriere', nom: 'Café de la Poivrière', du: 'du Café de la Poivrière', lieu: 'Le château', genre: 'Café', qui: 'Karim', ini: 'CP', coul: '#2f4a6b',
      vin: 'blanc', ...VINS.blanc, demande: 3, penchant: 0.6, heures: [[960, 1020]],
      perso: { peau: '#b07a4f', cheveux: '#151515', coiffure: 'court', barbe: true, tenue: 'chemise', haut: '#2f4a6b', col: '#f4f1ea', bas: '#2c2c30', tablier: '#1d1d1d', chapeau: 'casquette', chapeauC: '#2f4a6b', taille: 1.02 },
      accroche: ['Un café ? La machine est chaude !', 'Belle vue, hein ? Et le café est bon.'],
      presentation: [...dit('Karim', 'Salut ! Karim, du Café de la Poivrière. Vous, vous venez me vendre quelque chose : ça se voit au sourire.'),
        ...dit('Vous', 'Démasqué. Je viens du Domaine du Clos Libre, au bourg.'),
        ...dit('Karim', 'Le soir, ceux du belvédère me demandent un verre de blanc. Moi, j\'ai du sirop et de la limonade.', 'Allez, servez-moi votre blanc, pour voir.')],
      occupe: dit('Karim', 'Là, c\'est le goûter des touristes, je ne sais plus où donner de la tête ! Repassez après cinq heures.'),
      aime: dit('Karim', 'Frais, net : ça se boit en regardant le soleil se coucher. Mes clients vont rester une heure de plus.', 'Rappelez-moi, on voit combien.'),
      mitige: dit('Karim', 'Pas mal du tout. Mais je suis un café, moi : je ne sais pas si le vin va prendre.'),
      notes: { aime: 'A goûté le blanc : le voit au verre, en fin d\'après-midi, face au belvédère.', mitige: 'A goûté le blanc : hésite à servir du vin dans son café. Commencer petit.' },
      proposer: 'la Cuvée du Clos, blanc, servie au verre',
      appel: {
        commande: n => [...dit('Karim', 'Salut, c\'est Karim ! J\'ai fait goûter votre blanc à deux habitués : ils en redemandent.', `On commence doucement : ${n} cartons de blanc.`), VOUS_PREPARE],
        plusTard: [...dit('Karim', 'Je n\'ai pas encore décidé. Rappelez-moi la semaine prochaine, je vous dirai.'), ...dit('Vous', 'Ça marche, je vous rappelle.')],
        non: [...dit('Karim', 'Franchement ? Je reste sur le café. Mais je vous envoie les touristes qui cherchent un vigneron !'), ...dit('Vous', 'Merci, c\'est gentil. Je garde votre contact.')],
        refus: [...dit('Karim', 'La commande... Désolé, je ne l\'ai pas signée : mon associé a dit non au vin, pour l\'instant.'), ...dit('Vous', 'Pas de souci. Si ça change, vous m\'appelez.')],
      },
      revoir: { attente: 'Alors, ce coup de fil ? Je vous attends !', signee: 'Merci pour la commande ! J\'ai déjà écrit l\'ardoise.', fini: 'Un café, pour la route ?' } },
    { id: 'chatelet', nom: 'Crêperie du Châtelet', du: 'de la Crêperie du Châtelet', lieu: 'Le château', genre: 'Crêperie', qui: 'Maëlle', ini: 'CC', coul: '#2f5d50',
      vin: 'cremant', ...VINS.cremant, demande: 2, penchant: 0.7, heures: [[720, 840]],
      perso: { femme: true, peau: '#f3cfb0', cheveux: '#b5532e', coiffure: 'carre', tenue: 'pull', haut: '#1f3b5d', col: '#f4f1ea', bas: '#34343a', tablier: '#2f5d50', taille: 0.95 },
      accroche: ['Une galette ? Le billig est chaud !', 'Ça sent bon la crêpe, hein ?'],
      presentation: [...dit('Maëlle', 'Bonjour ! Maëlle, de la Crêperie du Châtelet. Bretonne, mais installée ici depuis douze ans.'),
        ...dit('Vous', 'Je viens du Domaine du Clos Libre. Je vous présente nos vins ?'),
        ...dit('Maëlle', 'Pour les crêpes du dessert, je sers le cidre de chez moi. Des bulles d\'ici, ça plairait aux touristes.', 'Allez, faites-moi goûter vos bulles.')],
      occupe: dit('Maëlle', 'Oh là, j\'ai six galettes sur le feu ! Repassez après le service de midi.'),
      aime: dit('Maëlle', 'Fines, fraîches... Avec une crêpe au beurre salé, c\'est une merveille. Mon grand-père en tomberait de sa chaise.', 'Rappelez-moi, je vous en prends.'),
      mitige: dit('Maëlle', 'C\'est bon, mais mes clients viennent aussi pour le cidre. Je ne sais pas.'),
      notes: { aime: 'A goûté le crémant : le veut pour les crêpes du dessert, à la place du cidre breton.', mitige: 'A goûté le crémant : tient à son cidre. Proposer le crémant pour les desserts seulement.' },
      proposer: 'le Crémant du Clos, pour les crêpes du dessert',
      appel: {
        commande: n => [...dit('Maëlle', 'Allô, c\'est Maëlle, de la crêperie ! J\'ai fait une carte « crêpes et bulles d\'ici ».', `Il me faut ${n} cartons de crémant.`), VOUS_PREPARE],
        plusTard: [...dit('Maëlle', 'Je ferme quelques jours pour aller voir ma mère à Quimper. Rappelez-moi la semaine prochaine !'), ...dit('Vous', 'Bon voyage ! Je vous rappelle.')],
        non: [...dit('Maëlle', 'J\'ai essayé, mais mes clients veulent du cidre avec leurs crêpes. La tradition, c\'est la tradition.'), ...dit('Vous', 'Je comprends. Je garde votre contact.')],
        refus: [...dit('Maëlle', 'Je ne l\'ai pas signée, pardon. Je garde mon cidre cet hiver, on verra au printemps.'), ...dit('Vous', 'Pas de souci. Bon service !')],
      },
      revoir: { attente: 'Vous m\'appelez bientôt ? J\'ai une idée de carte !', signee: 'Merci ! « Crêpes et bulles d\'ici », c\'est déjà sur l\'ardoise.', fini: 'Une crêpe, pour la route ?' } },
    { id: 'mariniers', nom: 'Brasserie des Mariniers', du: 'de la Brasserie des Mariniers', lieu: 'Le Bourg', genre: 'Brasserie', qui: 'Bernard', ini: 'BM', coul: '#22313f',
      vin: 'rouge', ...VINS.rouge, demande: 6, penchant: 0.75, heures: [[720, 840]],
      perso: { peau: '#e8b896', cheveux: '#7a6a58', coiffure: 'court', barbe: true, tenue: 'chemise', haut: '#f4f1ea', col: '#f4f1ea', bas: '#1d1d1d', tablier: '#f4f1ea', corpulence: 1.3, taille: 1.0 },
      accroche: ['Hé ! On a de l\'andouillette, aujourd\'hui !', 'Le plat du jour est sur l\'ardoise !'],
      presentation: [...dit('Bernard', 'Bernard, de la Brasserie des Mariniers ! Mon grand-père menait les gabares sur la Loire. Moi, je mène des assiettes.'),
        ...dit('Vous', 'Je viens du Domaine du Clos Libre. Je vous présente nos vins ?'),
        ...dit('Bernard', 'Il me faut un rouge en pichet pour le plat du jour. Un vrai : mes clients ont du goût.', 'Servez-m\'en un verre, on va voir ça.')],
      occupe: dit('Bernard', 'Pas maintenant, j\'ai trente couverts ! Repassez après deux heures, je vous offre le café.'),
      aime: dit('Bernard', 'Ah ! Ça, c\'est un rouge de pichet comme je les aime : il a de la mâche.', 'Rappelez-moi, je vous en prends pour la semaine.'),
      mitige: dit('Bernard', 'Il est fin, hein. Trop fin pour mon andouillette, peut-être. Je vais y réfléchir.'),
      notes: { aime: 'A goûté le rouge : le veut en pichet, pour le plat du jour.', mitige: 'A goûté le rouge : le trouve fin pour ses plats. Le proposer pour le pichet du soir.' },
      proposer: 'la Cuvée du Clos, rouge, en pichet pour le plat du jour',
      appel: {
        commande: n => [...dit('Bernard', 'C\'est Bernard ! Les pichets du midi, c\'est votre rouge qu\'il me faut. Mes clients l\'ont goûté, ils le réclament.', `Mettez-m'en ${n} cartons.`), VOUS_PREPARE],
        plusTard: [...dit('Bernard', 'J\'ai encore du stock pour la semaine. Rappelez-moi la semaine prochaine, sans faute !'), ...dit('Vous', 'Promis, je vous rappelle.')],
        non: [...dit('Bernard', 'Ma femme a goûté : elle préfère celui de notre fournisseur. Et chez nous, c\'est elle qui décide.'), ...dit('Vous', 'Je comprends. Saluez-la de ma part.')],
        refus: [...dit('Bernard', 'La commande, oui... Je ne l\'ai pas signée. La saison est calme, je fais attention à la trésorerie.'), ...dit('Vous', 'Je comprends. On en reparle au printemps.')],
      },
      revoir: { attente: 'Alors, vous m\'appelez ? Mes pichets vous attendent !', signee: 'Merci ! J\'ai déjà écrit « rouge du Clos » sur l\'ardoise.', fini: 'Passez manger, un midi !' } },
    { id: 'bellavigna', nom: 'Pizzeria Bella Vigna', du: 'de la Pizzeria Bella Vigna', lieu: 'Le Bourg', genre: 'Pizzeria', qui: 'Enzo', ini: 'BV', coul: '#2f6b3a',
      vin: 'rouge', ...VINS.rouge, demande: 4, penchant: 0.6, heures: [[720, 840]],
      perso: { peau: '#d4a373', cheveux: '#2b1d0e', coiffure: 'court', barbe: true, tenue: 'chemise', haut: '#f4f1ea', col: '#b8322a', bas: '#3b4150', tablier: '#2f6b3a', corpulence: 0.95, taille: 1.04 },
      accroche: ['Ciao ! Ça sent bon le feu de bois, non ?', 'Une pizza ? Le four est chaud !'],
      presentation: [...dit('Enzo', 'Ciao ! Enzo, de la Pizzeria Bella Vigna. Né à Tours, papa de Naples : je parle avec les mains, pardon.'),
        ...dit('Vous', 'Je viens du Domaine du Clos Libre, au bout du bourg. Je vous présente nos vins ?'),
        ...dit('Enzo', 'Il me faut un rouge léger pour les pizzas. Pas trop de bois : le bois, c\'est pour le four.', 'Papa dit qu\'un vin d\'ici avec une pizza, c\'est un sacrilège. Servez-moi un verre : on va lui prouver qu\'il a tort.')],
      occupe: dit('Enzo', 'Mamma mia, j\'ai douze pizzas au four ! Repassez après le service, après deux heures.'),
      aime: dit('Enzo', 'Fruité, léger, frais... Avec une margherita, c\'est parfait. Papa va devoir s\'excuser.', 'Rappelez-moi !'),
      mitige: dit('Enzo', 'Il est bon. Mais je le fais goûter à papa d\'abord : sinon, il va bouder.'),
      notes: { aime: 'A goûté le rouge : léger, sans bois, parfait avec ses pizzas.', mitige: 'A goûté le rouge : doit convaincre son père. Commencer petit, pour essayer.' },
      proposer: 'la Cuvée du Clos, rouge, avec les pizzas',
      appel: {
        commande: n => [...dit('Enzo', 'Pronto ! C\'est Enzo. Papa a goûté votre rouge : il n\'a rien dit, et il a fini la bouteille.', `Mettez-moi ${n} cartons !`), VOUS_PREPARE],
        plusTard: [...dit('Enzo', 'Papa n\'a pas encore goûté, il est à Naples jusqu\'à la semaine prochaine. Rappelez-moi après !'), ...dit('Vous', 'D\'accord, je vous rappelle.')],
        non: [...dit('Enzo', 'Papa a goûté. Il a dit « buono »... et il a commandé du vin de chez lui. Désolé !'), ...dit('Vous', 'Ah, les papas. Je garde votre contact.')],
        refus: [...dit('Enzo', 'La commande ? Je ne l\'ai pas signée, pardon : papa a refait les comptes, on attend le printemps.'), ...dit('Vous', 'Pas de souci, on en reparle au printemps.')],
      },
      revoir: { attente: 'Vous m\'appelez ? Papa attend de voir !', signee: 'Grazie ! Votre rouge avec la margherita, c\'est l\'idée de l\'année.', fini: 'Une part de pizza, pour la route ?' } },
    { id: 'paulette', nom: 'Chez Paulette', du: 'de Chez Paulette', lieu: 'La place', genre: 'Bistrot', qui: 'Paulette', ini: 'CP', coul: '#a8452f',
      vin: 'blanc', ...VINS.blanc, demande: 4, penchant: 0.85, heures: [[720, 810]],
      perso: { femme: true, peau: '#ffdbac', cheveux: '#e8e4dc', coiffure: 'chignon', tenue: 'gilet', haut: '#8e2a3b', manches: '#f4f1ea', bas: '#3b3b42', lunettes: true, corpulence: 1.05, taille: 0.9 },
      accroche: ['Bonjour ! Un petit café ?', 'Vous, je vous connais, non ?'],
      presentation: [...dit('Paulette', 'Bonjour ! Paulette, du bistrot. Vous êtes du Clos Libre, vous ? J\'ai bien connu les anciens du domaine.'),
        ...dit('Vous', 'C\'est bien ça. Je vous présente nos vins ?'),
        ...dit('Paulette', 'Mon ballon de blanc de l\'apéro, les habitués font la grimace en le buvant. Et ils me le disent, en plus.', 'Faites-moi goûter le vôtre, allez.')],
      occupe: dit('Paulette', 'Pas maintenant, j\'ai tout le village à déjeuner ! Repassez cet après-midi.'),
      aime: dit('Paulette', 'Oh, qu\'il est bon ! Frais comme un matin de vendanges. Les habitués vont arrêter de grimacer.', 'Rappelez-moi, je vous en prends, c\'est sûr.'),
      mitige: dit('Paulette', 'Il est bon... Mais il me faut l\'avis de Lucien, mon plus vieil habitué. Il goûte tout, Lucien.'),
      notes: { aime: 'A goûté le blanc : le veut pour le ballon de l\'apéro.', mitige: 'A goûté le blanc : attend l\'avis de ses habitués.' },
      proposer: 'la Cuvée du Clos, blanc, pour le ballon de l\'apéro',
      appel: {
        commande: n => [...dit('Paulette', 'Allô ? C\'est Paulette ! Lucien a goûté votre blanc : il dit que c\'est le meilleur depuis son mariage.', `Mettez-moi ${n} cartons, voyons.`), VOUS_PREPARE],
        plusTard: [...dit('Paulette', 'Lucien n\'est pas encore venu goûter, il est chez sa fille. Rappelez-moi la semaine prochaine.'), ...dit('Vous', 'Entendu, je vous rappelle.')],
        non: [...dit('Paulette', 'Lucien a dit non. Et quand Lucien dit non, tout le village dit non. Je suis désolée.'), ...dit('Vous', 'Ce n\'est rien. Saluez Lucien pour moi.')],
        refus: [...dit('Paulette', 'La commande, je ne l\'ai pas signée. Mon neveu reprend le bistrot en janvier : c\'est lui qui choisira.'), ...dit('Vous', 'Je comprends. Je l\'appellerai en janvier.')],
      },
      revoir: { attente: 'Vous m\'appelez quand, alors ?', signee: 'Merci ! Lucien n\'arrête pas d\'en parler.', fini: 'Un petit café ? C\'est la maison qui offre.' } },
    { id: 'clemence', nom: 'La Table de Clémence', du: 'de La Table de Clémence', lieu: 'Rue de la place', genre: 'Table gastronomique', qui: 'Clémence', ini: 'TC', coul: '#2b2b30',
      vin: 'cremant', ...VINS.cremant, demande: 2, penchant: 0.5, heures: [[540, 900]],
      perso: { femme: true, peau: '#8d5524', cheveux: '#151515', coiffure: 'court', tenue: 'chemise', haut: '#fbfaf6', col: '#fbfaf6', bas: '#1d1d1d', tablier: '#fbfaf6', taille: 0.97, corpulence: 0.9 },
      accroche: ['Bonjour. Vous avez de la terre sur vos bottes : vous faites du vin ?', 'Bonjour. Le menu change chaque semaine.'],
      presentation: [...dit('Clémence', 'Bonjour. Clémence, de La Table de Clémence. Je cuisine les poissons de Loire, et je n\'ai que vingt couverts.'),
        ...dit('Vous', 'Je viens du Domaine du Clos Libre. Je vous présente nos vins ?'),
        ...dit('Clémence', 'Je cherche des bulles pour l\'amuse-bouche. Et un domaine qui sait d\'où vient son raisin, parcelle par parcelle.', 'Servez-moi vos bulles. Je serai honnête.')],
      occupe: dit('Clémence', 'Pas avant le service, je suis en pleine mise en place. Repassez cet après-midi, après trois heures.'),
      aime: dit('Clémence', 'Une bulle fine, une belle tension. Avec mon tartare de sandre, ça peut être très juste.', 'Rappelez-moi. Je veux en parler.'),
      mitige: dit('Clémence', 'Correct. Mais correct, ce n\'est pas ce que je sers. Je vais y repenser.'),
      notes: { aime: 'A goûté le crémant : le voit pour l\'amuse-bouche, avec son tartare de sandre.', mitige: 'A goûté le crémant : exigeante, veut réfléchir. Lui parler des parcelles.' },
      proposer: 'le Crémant du Clos, pour l\'amuse-bouche',
      appel: {
        commande: n => [...dit('Clémence', 'Clémence, de La Table. J\'ai refait mon amuse-bouche autour de votre crémant. C\'est juste.', `Il me faut ${n} cartons.`), VOUS_PREPARE],
        plusTard: [...dit('Clémence', 'Je refais mon menu la semaine prochaine. Rappelez-moi à ce moment-là, je saurai.'), ...dit('Vous', 'Entendu, je vous rappelle.')],
        non: [...dit('Clémence', 'J\'ai fait des essais. Ce n\'est pas l\'accord que je cherche. Merci de votre visite, sincèrement.'), ...dit('Vous', 'Merci à vous. Je garde votre contact.')],
        refus: [...dit('Clémence', 'Je ne l\'ai pas signée. J\'ai changé de menu entre-temps : plus d\'amuse-bouche aux bulles.'), ...dit('Vous', 'Je comprends. Au prochain menu, alors.')],
      },
      revoir: { attente: 'J\'attends votre appel.', signee: 'Merci. Vos bulles ouvriront le menu dès qu\'elles arrivent.', fini: 'Bonne journée.' } },
    { id: 'croisee', nom: 'Le Relais de la Croisée', du: 'du Relais de la Croisée', lieu: 'La départementale', genre: 'Relais routier', qui: 'Gégé', ini: 'RC', coul: '#7a2233',
      vin: 'rouge', ...VINS.rouge, demande: 6, penchant: 0.7, heures: [[705, 810]],
      perso: { peau: '#c68642', cheveux: '#c9c9c9', coiffure: 'chauve', barbe: true, tenue: 'chemise', haut: '#3c5a8a', col: '#3c5a8a', bas: '#2f2f35', tablier: '#f4f1ea', chapeau: 'casquette', chapeauC: '#7a2233', corpulence: 1.35, taille: 1.04 },
      accroche: ['Salut ! Le menu ouvrier est prêt à midi !', 'Garez-vous, il y a de la place !'],
      presentation: [...dit('Gégé', 'Salut ! Gégé, du Relais de la Croisée. Trente ans que je nourris les chauffeurs du coin.'),
        ...dit('Vous', 'Je viens du Domaine du Clos Libre, plus loin sur la départementale. Je vous présente nos vins ?'),
        ...dit('Gégé', 'Les chauffeurs, c\'est eau et café : ils reprennent la route. Le quart de rouge du menu, c\'est pour ceux qui rentrent à pied.', 'Il me faut un rouge sérieux. Servez-m\'en un verre.')],
      occupe: dit('Gégé', 'Là, c\'est le coup de feu de midi, j\'ai tous les camions de la région ! Repassez vers deux heures.'),
      aime: dit('Gégé', 'Ça, c\'est du rouge honnête. Avec ma blanquette du jeudi, ça va être quelque chose.', 'Rappelez-moi, on fait affaire.'),
      mitige: dit('Gégé', 'Pas mal, pas mal. Mais mes clients sont habitués à l\'autre. Je réfléchis.'),
      notes: { aime: 'A goûté le rouge : le veut pour le quart de vin du menu ouvrier.', mitige: 'A goûté le rouge : ses habitués tiennent à l\'ancien. Le proposer avec le plat du jour.' },
      proposer: 'la Cuvée du Clos, rouge, pour le menu ouvrier',
      appel: {
        commande: n => [...dit('Gégé', 'C\'est Gégé, du Relais ! Votre rouge, les gars le réclament avec la blanquette.', `Envoyez-m'en ${n} cartons.`), VOUS_PREPARE],
        plusTard: [...dit('Gégé', 'J\'ai encore deux palettes de l\'ancien à écouler. Rappelez-moi la semaine prochaine.'), ...dit('Vous', 'Entendu, je vous rappelle.')],
        non: [...dit('Gégé', 'Mon fournisseur me fait un prix que je ne peux pas refuser. Mais vous êtes le bienvenu pour déjeuner !'), ...dit('Vous', 'Avec plaisir. Je garde votre contact.')],
        refus: [...dit('Gégé', 'La commande ? Pas signée, non. Ma chambre froide a lâché, je l\'ai remplacée : pas cette fois.'), ...dit('Vous', 'Aïe. On en reparle quand ça ira mieux.')],
      },
      revoir: { attente: 'Alors, ce coup de fil ?', signee: 'Merci ! Les gars vont être contents.', fini: 'Le menu ouvrier vous attend, quand vous voulez !' } },
  ],
  // le personnage, une fois le verre bu et l'avis donné (aime, mitige)
  noter: { aime: dit('Vous', 'Je vous note dans le bureau. Je vous rappelle, c\'est promis.'), mitige: dit('Vous', 'Je vous note dans le bureau, et je vous rappelle.') },
  attendLien: 'Parfait, j\'attends le lien.',
  parti: 'Vous partez déjà ?',
  presenter: 'Présenter nos vins', // l'étiquette posée sur le tenancier
  // Le bureau : la rubrique des restaurateurs rencontrés (Ma journée), leurs commandes (onglet Commandes)
  rubrique: 'Restaurateurs rencontrés',
  aRappeler: 'À rappeler',
  propose: r => `Proposer : ${r.proposer}.`,
  ferme: 'Fermé : à rappeler en journée',
  sansReseau: 'Pas de réseau',
  dira: 'Le bureau vous dira quand le rappeler.',
  plusTardNote: 'A demandé qu\'on le rappelle plus tard.',
  nonNote: 'Pas pour l\'instant : garder le contact.',
  refusNote: c => `Commande ${c.numero} pas signée : pas cette fois.`,
  nonSigneeNote: c => `N'a pas signé la commande ${c.numero} : à relancer.`,
  signeeNote: c => `Commande ${c.numero} signée en ligne : ${c.cartons} carton${s(c.cartons)} de ${c.produit}. Elle part dans Vitisoft sans ressaisie.`,
  statuts: {
    rencontre: ['decroche', 'Rencontré'], a_rappeler: ['jour', 'À rappeler'], commande: ['jour', 'Commande à préparer'], envoyee: ['decroche', 'Signature en attente'],
    signee: ['ok', 'Signée en ligne'], nonSignee: ['retard', 'Pas signée'], refusee: ['decroche', 'Pas cette fois'], non: ['decroche', 'Pas pour l\'instant'],
  },
  // les notifications du bureau (l'aperçu sur l'écran d'accueil du téléphone)
  notifs: {
    relance: r => (r.motif === 'signature' ? `${r.nom} n'a pas signé la commande ${r.numero} : à relancer.` : `${r.nom} : à rappeler. Proposer ${r.proposer}.`),
    signee: r => `${r.nom} a signé la commande ${r.numero}.`,
    commande: r => `Commande ${r.du} à préparer.`,
  },
  // la consigne du jeu dans la commande (c'est le jeu qui parle, pas l'appli) : la quantité dite au téléphone
  consigne: r => `${r.nom} a demandé ${r.demande} carton${s(r.demande)}.`,
  bannieres: {
    rencontre: r => ['Restaurateur rencontré', `${r.nom} · noté dans le bureau`],
    signee: r => ['Commande signée', `${r.nom} · ${r.cartons} carton${s(r.cartons)} · dans Vitisoft`],
  },
  // l'app Missions : la ligne des restaurants, seulement une fois le premier rencontré
  missions: { n: 'Hors mission', titre: 'Les restaurants du coin', texte: (k, total, sg) => `${k} restaurateur${s(k)} rencontré${s(k)} sur ${total}${sg ? `, ${sg} commande${s(sg)} signée${s(sg)}` : ''}. Allez les voir à pied, faites goûter vos vins : le bureau dit quand les rappeler.` },
};

// Le chien du domaine (chien.js) : ce qu'on lui dit en le caressant (gestes.js : caresser)
export const CHIEN = {
  caresse: ['Brave chien !', 'Qui c\'est le bon chien ?', 'Allez, une caresse.', 'T\'es un bon gardien, toi.', 'Doucement, doucement...', 'Tu veux des grattouilles ?', 'Tu as bien gardé la cour ?'],
};

// Le bon véhicule (main.js : vehiculeGuide ; Teddy, 26/11/2026 : « guider sur les véhicules à prendre pour faire certaines
// missions, sinon ça peut devenir complexe ») : quand l'étape en demande un (la mission le dit : vehiculeVoulu) et qu'on est
// à pied ou dans un autre, la balise va sur lui, l'objectif dit lequel, où il est et pourquoi, une phrase le rappelle.
export const GUIDE_VEHICULE = {
  noms: { tracteur: 'le tracteur', van: 'le van', enjambeur: 'l\'enjambeur', voiture: 'la voiture' },
  balise: { tracteur: 'Tracteur', van: 'Van', enjambeur: 'Enjambeur', voiture: 'Voiture' },
  ou: { hangar: 'sous le hangar, derrière le chai', cour: 'dans la cour du domaine', loin: 'là où vous l\'avez laissé, suivez la balise' },
  // pourquoi ce véhicule-là
  raisons: {
    charger: 'les commandes signées se chargent au chai',
    cartons: 'les cartons sont dedans',
    pulve: 'c\'est lui qui porte le pulvérisateur',
    remorque: 'lui seul tire la remorque de palox',
  },
  // la ligne sous l'objectif : « L'enjambeur : sous le hangar, derrière le chai » (plusieurs : séparés d'un point)
  ligne: (nom, ou) => `${nom[0].toUpperCase() + nom.slice(1)} : ${ou}`,
  // dit une fois par étape : à pied, loin de lui ; ou en montant dans un autre
  pied: (quoi, raison) => [{ qui: '', txt: `Il me faut ${quoi} : ${raison}.` }],
  mauvais: (quoi, raison) => [{ qui: '', txt: `Pas celui-là : il me faut ${quoi}. ${raison[0].toUpperCase() + raison.slice(1)}.` }],
};
