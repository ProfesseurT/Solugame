// Tous les textes affichés dans le jeu.
// Règle de vérité : chaque fait produit ou réglementaire vient d'une source notée ici
// (fiche de faits du 21/11/2026 dans le JOURNAL du dépôt a-vous-de-jouer ; page « le bureau »
// de vitisoft.fr lue le 22/11/2026 ; arbitrages de Teddy). Ne rien ajouter sans source.
// Règlement saisi dans Vitisoft et DRM du mois dernier : demande de Teddy du 22/11/2026 ; le règlement en retard
// est une tâche du jour, que le vigneron ajoute lui-même à sa tournée (et non un client qui appelle) : Teddy, 22/11/2026 ; « Vitisoft exporte
// factures et encaissements vers le logiciel du comptable » et « calcule la DRM, validée dans CIEL » : fiche de faits.

import { eur } from './outils.js';

export const VERSION = 'Démo 1.0';

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
  dodo: 'Il est tard : rentrez dormir, à la maison du domaine',
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
// C'est un logiciel installé, une icône sur le bureau de l'ordinateur, pas un onglet du navigateur (Teddy, 24/11/2026).
// Son interface d'après les captures du site (dépôt vitisoft.fr, src/assets/images/captures : dashboard-hero,
// vitisoft-tableau-de-bord-2026, vitisoft-caisse-reglement) : barre « VITISOFT » et nom du domaine, menu à gauche par
// rubriques (libellés recopiés), tableau de bord en tuiles, fenêtre Règlement aux modes de paiement en tuiles.
export const VITISOFT = {
  domaine: 'Domaine du Clos Libre',
  // le soir de la tournée (choisi avant le 10 : la DRM de novembre se valide dans CIEL avant le 10 décembre)
  date: { jour: 'mardi', n: '08', mois: 'décembre', courte: '08/12/2026' },
  mois: 'Novembre 2026',
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
  retardDate: '13/10/2026', retardEcheance: '12/11/2026', echeance: '07/01/2027',
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
  h: 'La suite',
  suite: [
    'Mission 2 : la journée de traitement, avec le Registre phyto',
    'Dans le jeu complet : le DAE du transporteur, sur GAMMA 2, avec Vitisoft',
    'Dans le jeu complet : les QR codes nutritionnels de Viticode',
  ],
  bouton: 'Continuer',
};

/* ---------------------------------------------------------------- mission 2 : la journée de traitement
   Ce que fait le Registre phyto, d'après la page de prévente (LP de Teddy du 19/11/2026, reprise sur vitisoft.fr :
   src/data/registre-phyto-demo.ts et registre-phyto.ts, lus le 23/11/2026) : un traitement se note sur place, dans la
   vigne ; on coche les parcelles traitées, le produit et la dose ; le stade est repris du dernier traitement ; la cible ;
   pas de réseau : noté, puis envoyé quand ça capte ; chaque ligne dit qui a saisi, et quand ; l'ETA ou la CUMA saisit
   chez vous ; une erreur se corrige avec motif, rien n'est effacé ; en cas de contrôle : PDF, format officiel et fiche
   Stat'Phyto. Parcelles retrouvées depuis le fichier Telepac. Aucune promesse de conformité (jamais « en règle ») :
   l'application enregistre, le contenu du registre reste sous la responsabilité de l'exploitant. Le registre devient
   numérique le 1er janvier 2027 (fiche de faits). La mission se passe en mai 2027 : l'appli y est ouverte ; avant le
   1er janvier 2027 (EN_PREVENTE), l'écran le dit (aperçu, données fictives, ouverture le 1er janvier 2027).
   Bouillie bordelaise et soufre mouillable : utilisables en agriculture biologique. Doses, parcelles, noms : fictifs. */
export const TRAITEMENT = {
  date: 'mardi 4 mai 2027', dateCourte: '4 mai 2027',
  // les parcelles du domaine dans le registre (i : leur place dans PARCELLES, monde.js), celles du jour d'abord
  parcelles: [
    { id: 'perrieres', nom: 'Les Perrières', cep: 'Chenin', i: 0, jour: true, reseau: true },
    { id: 'clos', nom: 'Le Clos', cep: 'Cabernet franc', i: 1, jour: true, reseau: true },
    { id: 'grandschamps', nom: 'Les Grands Champs', cep: 'Cabernet franc', i: 6, jour: true, reseau: false },
    { id: 'croix', nom: 'La Croix', cep: 'Chenin', i: 2 },
    { id: 'garenne', nom: 'La Garenne', cep: 'Cabernet franc', i: 5 },
    { id: 'basvignes', nom: 'Le Bas des Vignes', cep: 'Chenin', i: 4 },
  ],
  // les produits de l'armoire, et ce qu'il faut (dose) ; un fongicide de synthèse que le domaine, en bio, n'utilise pas
  produits: [
    { id: 'cuivre', nom: 'Bouillie bordelaise', sous: 'Cuivre · utilisable en bio', dose: 1.5, pas: 0.5, unite: 'kg/ha', bio: true },
    { id: 'soufre', nom: 'Soufre mouillable', sous: 'Soufre · utilisable en bio', dose: 5, pas: 1, unite: 'kg/ha', bio: true },
    { id: 'synthese', nom: 'Fongicide de synthèse', sous: 'Non utilisable en bio', dose: 0, pas: 0.5, unite: 'kg/ha', bio: false },
  ],
  cibles: ['Mildiou', 'Oïdium', 'Black-rot', 'Botrytis'], ciblesDuJour: ['Mildiou', 'Oïdium'],
  stade: '6 feuilles étalées', stadeDe: 'repris du traitement du 28 avril',
  // le registre de la campagne avant ce matin (données fictives) ; « par » : qui a saisi
  avant: [
    { quand: '28 avril 2027 · 8 h 10', parcelles: ['Les Perrières', 'Le Clos', 'Les Grands Champs', 'La Croix'], produits: ['Soufre mouillable · 5 kg/ha'], cibles: ['Oïdium'], stade: '6 feuilles étalées', par: 'ETA des Coteaux, le 28 avril à 11 h 02' },
    { quand: '15 avril 2027 · 7 h 45', parcelles: ['Les Perrières', 'Le Clos', 'Les Grands Champs'], produits: ['Bouillie bordelaise · 1,5 kg/ha'], cibles: ['Mildiou'], stade: '3 feuilles étalées', par: 'vous, le 15 avril à 9 h 20' },
  ],
  message: {
    de: 'Claire, conseillère viticole', apercu: 'Pluie cette nuit : mildiou et oïdium...',
    fil: [
      'Bonjour ! Avec la pluie de cette nuit et la douceur, les conditions sont réunies pour le mildiou ; l\'oïdium aussi.',
      'Je vous conseille un passage aujourd\'hui, avant la pluie de jeudi : bouillie bordelaise à 1,5 kg/ha et soufre mouillable à 5 kg/ha, ensemble.',
      'Les Perrières, Le Clos et Les Grands Champs d\'abord. Pensez à noter le traitement !',
    ],
  },
  objectifs: {
    message: 'Lisez le message de Claire, la conseillère (Messages)',
    tracteur: 'Montez dans le tracteur : le pulvérisateur y est attelé',
    aire: 'En tracteur, à l\'aire de remplissage : préparez la bouillie',
    traiter: (noms, pc) => `Traitez ${noms}${pc ? ` (${pc} %)` : ''}`,
    noter: noms => `Notez le traitement dans le Registre phyto : ${noms}`,
    noterIci: noms => `Notez-le sur place, dans le Registre phyto : ${noms}`,
    envoyer: 'Remontez vers la route : le traitement partira quand ça capte',
    fin: 'Journée de traitement finie',
  },
  dialogues: {
    reveil: [{ qui: '', txt: 'Mardi 4 mai 2027. Il a plu cette nuit.' }, { qui: '', txt: 'Un message de Claire, la conseillère viticole.' }],
    luMessage: [{ qui: '', txt: 'Cuivre et soufre : c\'est un traitement bio. Le pulvérisateur est attelé au tracteur.' }],
    pasTracteur: [{ qui: '', txt: 'Le pulvérisateur est sur le tracteur : il faut le tracteur.' }],
    remplir: [{ qui: '', txt: 'De l\'eau, la bouillie bordelaise, le soufre mouillable : la cuve est prête.' }, { qui: '', txt: 'Elle suffit pour les trois parcelles.' }],
    guidage: tactile => [{ qui: '', txt: tactile ? 'Dans les rangs, doigt posé : le tracteur suit les passages tout seul, la scène va plus vite.' : 'Dans les rangs, flèche du haut seule : le tracteur suit les passages tout seul, la scène va plus vite.' }],
    parcelleFinie: nom => [{ qui: '', txt: `${nom} : traitée.` }],
    noter: [{ qui: '', txt: 'Je le note maintenant, sur le téléphone.' }],
    sansReseau: [{ qui: '', txt: 'Pas de réseau en bas des Grands Champs. Je le note quand même.' }],
    envoye: [{ qui: '', txt: 'Ça capte : le traitement des Grands Champs est parti.' }],
    fin: [{ qui: '', txt: 'Trois parcelles traitées en bio, et tout est noté dans le registre.' }],
    pasPrete: [{ qui: '', txt: 'La bouillie n\'est pas prête : d\'abord l\'aire de remplissage.' }],
  },
  app: {
    nouveau: 'Noter un traitement',
    parcelles: 'Parcelles traitées', parcellesNote: 'Retrouvées depuis votre fichier Telepac.',
    produits: 'Produit et dose', stade: 'Stade', cible: 'Cible', recap: 'Vérifier',
    enregistrer: 'Enregistrer', enregistre: 'Enregistré', horsReseau: 'Pas de réseau : noté, envoyé quand ça capte.',
    attente: 'En attente d\'envoi', envoye: 'Envoyé',
    registre: 'Campagne 2027', registreNote: 'Chaque ligne dit qui a saisi, et quand.',
    exporter: 'Exporter pour un contrôle', exportNote: 'PDF, format officiel et fiche Stat\'Phyto.', exportOk: 'Export prêt.',
    apercu: 'Aperçu de l\'application, données fictives. Ouverture le 1er janvier 2027.',
    apercuApres: 'Données fictives.',
    // ce que le téléphone rappelle quand la saisie ne correspond pas à ce qui a été fait
    pasTraitee: (noms, n) => `${noms} : pas encore traitée${n > 1 ? 's' : ''} aujourd'hui.`,
    aucune: 'Cochez les parcelles traitées.',
    pasBio: 'Le domaine est en bio : bouillie bordelaise et soufre mouillable.',
    dose: (p, d) => `${p} : la dose de la cuve, ${d}.`,
    manque: 'Il manque un produit de la cuve.',
    cibleJour: 'La cible : ce que dit Claire, mildiou et oïdium.',
  },
  bannieres: {
    titre: ['Quelques mois plus tard', 'Mai 2027 · mission 2 : la journée de traitement'],
    prete: ['Bouillie prête', 'Bouillie bordelaise 1,5 kg/ha · soufre mouillable 5 kg/ha'],
    traitee: nom => ['Parcelle traitée', nom],
    note: n => ['Traitement noté', `${n} parcelle${n > 1 ? 's' : ''} dans le registre`],
    attente: ['Noté sans réseau', 'Envoyé quand ça capte'],
    envoye: ['Envoyé', 'Le registre est à jour'],
    fin: ['Journée de traitement finie', '3 parcelles traitées, tout est noté dans le registre'],
  },
  finCarte: {
    sur: 'Fin de la mission 2',
    titre: 'C\'est ça, le Registre phyto.',
    texte: 'Un traitement se note sur place, dans la vigne, sur le téléphone. Sans réseau, il est noté et part quand ça capte.',
    h: 'Dans l\'application',
    suite: [
      'Vous cochez les parcelles traitées, le produit et la dose',
      'Le stade, repris du dernier traitement',
      'Chaque ligne dit qui a saisi, et quand ; votre ETA ou CUMA saisit chez vous',
      'Une erreur de saisie se corrige avec un motif : rien n\'est effacé',
      'En cas de contrôle : PDF, format officiel et fiche Stat\'Phyto',
    ],
    bouton: 'Continuer la balade',
  },
};

// Le parvis du chai (parvis.js) : ce que disent ceux qui y travaillent quand on passe près d'eux, à pied. En hiver, le soir
// de la tournée ; au printemps, le matin du traitement.
export const PARVIS = {
  rinceur: {
    hiver: ['Salut ! Je finis de rincer les barriques et j\'y vais.', 'Recule un peu, ça éclabousse !', 'Encore deux barriques et c\'est bon pour ce soir.'],
    printemps: ['Bon courage pour le traitement !', 'Je rince les barriques ce matin, elles seront prêtes pour le soutirage.'],
  },
  porteuse: {
    hiver: ['Je range les caisses de vendange pour l\'hiver.', 'Bonne tournée ! Les clients vont être contents.', 'Attention, ça glisse près du nettoyeur.'],
    printemps: ['Bonne journée, et bon traitement !', 'Je range les caisses, la remorque doit repartir.'],
  },
};
