// Tous les textes affichés dans le jeu.
// Règle de vérité : chaque fait produit ou réglementaire vient d'une source notée ici
// (fiche de faits du 21/11/2026 dans le JOURNAL du dépôt a-vous-de-jouer ; page « le bureau »
// de vitisoft.fr lue le 22/11/2026 ; arbitrages de Teddy). Ne rien ajouter sans source.
// Règlement saisi dans Vitisoft et DRM du mois dernier : demande de Teddy du 22/11/2026 ; le règlement en retard
// est une tâche du jour, que le vigneron ajoute lui-même à sa tournée (et non un client qui appelle) : Teddy, 22/11/2026 ; « Vitisoft exporte
// factures et encaissements vers le logiciel du comptable » et « calcule la DRM, validée dans CIEL » : fiche de faits.

import { eur } from './outils.js';

export const VERSION = 'Démo 0.9';

// Prévente du registre phyto : 4,99 € HT/mois jusqu'au 31/12/2026, ensuite 9,99 € HT/mois.
export const PREVENTE_FIN = Date.UTC(2026, 11, 31, 23, 0, 0); // 1er janvier 2027, 0 h, heure de Paris
export const EN_PREVENTE = Date.now() < PREVENTE_FIN;
export const LP_URL = 'https://doc.solumatic.fr/registre-phyto-numerique-a-vous-de-jouer-qjxR-F.html?source=jeu-tournee-generale';

const s = n => (n > 1 ? 's' : ''); // pluriel

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
  libre: 'Balade libre',
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
    note: 'Rappel promis : réassort de Noël, 6 cartons attendus', tag: 'En retard · 3 j', tagC: 'retard', action: 'Appeler', mode: 'appel',
    produit: 'Cuvée du Clos, rouge', demande: 6, pu: 9.5, numero: 'C-1194', bl: 'BL-0412', facture: 'F-2026-0127' },
  { id: 'bar', ini: 'LC', coul: '#1f3b4d', nom: 'Bar Le Cep', du: 'le Bar Le Cep', de: 'du Bar Le Cep', lieu: 'Le Bourg',
    note: 'Prend du crémant chaque fin d\'année, pas encore cette fois', tag: 'Aujourd\'hui', tagC: 'jour', action: 'Proposer', mode: 'message',
    produit: 'Crémant du Clos', demande: 2, pu: 11.5, numero: 'C-1195', bl: 'BL-0413', facture: 'F-2026-0128' },
  { id: 'treille', ini: 'LT', coul: '#2f5d50', nom: 'Restaurant La Treille', du: 'le Restaurant La Treille', de: 'du Restaurant La Treille', lieu: 'Le Bourg',
    note: 'Commande toutes les 3 semaines, rien depuis 38 jours', tag: 'Décroche', tagC: 'decroche', action: 'Prendre des nouvelles', mode: 'appel',
    produit: 'Cuvée du Clos, blanc', demande: 3, pu: 8.9, numero: 'C-1196', bl: 'BL-0414', facture: 'F-2026-0129' },
];

// Le client en retard de paiement (données fictives) : la facture d'une commande passée, 4 cartons de rouge
// (24 x 9,50 € HT = 228,00 € HT, TVA 20 % : 273,60 € TTC). C'est une tâche du jour : on ajoute le passage à sa
// tournée, on récupère le chèque.
export const RETARD = {
  id: 'epicerie', ini: 'EB', coul: '#2f4a6b', nom: 'Épicerie du Bourg', du: 'l\'Épicerie du Bourg', lieu: 'Le Bourg',
  facture: 'F-2026-0098', ttc: 273.6, detail: '4 cartons de Cuvée du Clos, rouge',
};
// Le prospect de la tournée (données fictives) : un restaurant du hameau des Grands Champs, pas encore client. On ajoute
// la visite à sa tournée, on lui fait goûter le rouge (un geste du jeu : servir un verre), le bureau garde la visite dans
// le fil du client et dira quand le rappeler. Source, page du bureau (vitisoft.fr, lue le 23/11/2026) : « Prospection :
// Cavistes, restaurants, importateurs : suivis jusqu'à la commande. » ; « Le fil du client : appels, notes, factures,
// commandes signées en ligne. » ; « Chaque matin, il vous dit qui rappeler, quoi proposer et pourquoi ». Choix de Teddy
// (23/11/2026) : dégustation puis rappel, pas de commande.
export const PROSPECT = {
  id: 'auberge', ini: 'AM', coul: '#5a6b2f', nom: 'Auberge du Moulin', du: 'l\'Auberge du Moulin', lieu: 'Les Grands Champs',
  note: 'Restaurant, pas encore client : passer le voir, lui faire goûter le rouge',
  fil: 'Visite : a goûté la Cuvée du Clos, rouge, pour sa carte d\'hiver. À rappeler.',
};
// Consignes de mission dans les écrans du bureau (c'est le jeu qui parle, pas l'appli) : la quantité dite au téléphone,
// et, tout fait dehors, où se passe la suite
export const CONSIGNE_QTE = c => `${c.nom} a demandé ${c.demande} carton${s(c.demande)}.`;
export const CONSIGNE_RETOUR = 'Tout est fait dehors. La suite se passe dans Vitisoft, sur le portable du bureau du chai.';

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
  voitureSansCartons: [{ qui: '', txt: 'Une voiture ne porte pas de cartons : prenez le tracteur ou le van.' }],
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
    auberge: [
      { qui: 'Auberge du Moulin', txt: 'Bonsoir ! Vous êtes du Clos Libre ? On m\'a parlé de votre rouge.' },
      { qui: 'Vous', txt: 'Je vous le fais goûter ?' },
    ],
    epicerie: [
      { qui: 'Vous', txt: 'Bonjour ! Je passe pour la facture en retard.' },
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
  livre: c => [{ qui: '', txt: `Bon de livraison ${c.bl} signé par ${c.du}.` }, ...(c.id === 'cave' ? [{ qui: 'Vous', txt: 'La facture part ce soir, depuis Vitisoft.' }] : [])],
  pcTracteur: [{ qui: '', txt: 'Descendez : le bureau du chai est là, sa porte donne sur la cour.' }],
  verre: [{ qui: 'Vous', txt: 'Un verre de Cuvée du Clos ? C\'est la maison qui offre.' }],
  retour: [{ qui: '', txt: 'Tournée terminée. Retour au bureau du chai : le chèque sur le bureau, puis Vitisoft, sur le portable.' }],
  retourPC: [{ qui: '', txt: 'Tournée terminée. Retour au bureau du chai : la suite est dans Vitisoft, sur le portable.' }],
  merci: [{ qui: '', txt: 'Trois livraisons, trois factures, un chèque saisi, un prospect à rappeler et la DRM prête pour CIEL. Bonne soirée !' }],
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
export const VITISOFT = {
  menu: [
    { id: 'accueil', t: 'À faire' },
    { id: 'reglements', t: 'Règlements' },
    { id: 'commandes', t: 'Commandes' },
    { id: 'factures', t: 'Factures', d: 'Vitisoft fait vos factures au format Factur-X. Pennylane, plateforme agréée, les transmet.' },
    { id: 'drm', t: 'DRM', d: 'Vitisoft calcule votre DRM. Vous la validez dans CIEL, chaque mois avant le 10.' },
    { id: 'dae', t: 'DAE et DAES', d: 'Vitisoft génère vos DAE et DAES sur GAMMA 2, depuis vos factures. Hors UE, c\'est un DAE.' },
    { id: 'journal', t: 'Journal des ventes', d: 'Votre journal des ventes, TVA comprise, part dans le logiciel de votre comptable.' },
  ],
  arrivees: 'Commandes signées, arrivées du bureau sans ressaisie',
  factureCreee: 'Facture créée au format Factur-X : un PDF lisible, avec ses données que les logiciels savent lire.',
  transmise: 'Transmise par Pennylane, plateforme agréée.',
  journal: 'Votre journal des ventes, TVA comprise, part dans le logiciel de votre comptable.',
  reglements: 'Règlements à saisir',
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
  rienAFaire: 'Rien d\'autre à faire pour l\'instant.',
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
  titre: 'C\'est ça, Tournée générale.',
  texte: 'Le bureau dans la poche pour vendre et livrer, Vitisoft au domaine pour les règlements, les factures et la DRM. Le reste du monde est à vous.',
  suite: [
    'Le DAE du transporteur, sur GAMMA 2, avec Vitisoft',
    'Les QR codes nutritionnels de Viticode',
    'Le registre phyto, au 1er janvier 2027',
  ],
};
