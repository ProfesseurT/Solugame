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
  // un véhicule sans plateau (une voiture empruntée, l'enjambeur) au chai : il ne porte pas de cartons
  sansPlateau: g => [{ qui: '', txt: `${g === 'enjambeur' ? 'L\'enjambeur' : 'Une voiture'} ne porte pas de cartons : prenez le tracteur ou le van.` }],
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
   Stat'Phyto. Parcelles retrouvées depuis le fichier Telepac. Aucune promesse de conformité (jamais « en règle ») :
   l'application enregistre, le contenu du registre reste sous la responsabilité de l'exploitant. Le registre devient
   numérique le 1er janvier 2027 (fiche de faits). La mission se passe le lendemain de la tournée de Noël (Teddy,
   24/11/2026), le mercredi 9 décembre : aucune année n'est affichée dans l'appli ; avant le 1er janvier 2027
   (EN_PREVENTE), chaque écran dit « aperçu, données fictives, ouverture le 1er janvier 2027 ».
   Le traitement du jour : un passage d'hiver de bouillie bordelaise seule, présenté comme réduisant le mildiou qui passe
   l'hiver (choix de Teddy, 24/11/2026 ; pratique trouvée seulement sur un site de jardinage, aucune source viticole). La
   bouillie bordelaise et le soufre mouillable sont utilisables en agriculture biologique. Doses, parcelles, noms : fictifs. */
export const TRAITEMENT = {
  date: 'mercredi 9 décembre', dateCourte: '9 décembre',
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
    fil: [
      'Bonjour ! Les feuilles tombent et il fait sec jusqu\'à vendredi : c\'est le bon jour pour votre passage d\'hiver.',
      'Bouillie bordelaise seule, à 1,5 kg/ha, pour réduire le mildiou qui passe l\'hiver. Pas de soufre cette fois.',
      'L\'ETA a fait vos trois autres parcelles le 2 : il reste Les Perrières, Le Clos et Les Grands Champs. Pensez à noter le traitement !',
    ],
  },
  objectifs: {
    message: 'Lisez le message de Claire, la conseillère (Messages)',
    enjambeur: 'Montez dans l\'enjambeur : le pulvérisateur y est installé',
    aire: 'En enjambeur, à l\'aire de remplissage : préparez la bouillie',
    traiter: (noms, pc) => `Traitez ${noms}${pc ? ` (${pc} %)` : ''}`,
    noter: noms => `Notez le traitement dans le Registre phyto : ${noms}`,
    noterIci: noms => `Notez-le sur place, dans le Registre phyto : ${noms}`,
    envoyer: 'Remontez vers la route : le traitement partira quand ça capte',
    fin: 'Journée de traitement finie',
    dodo: 'Rentrez dormir : demain, l\'habillage du Clos 2025',
  },
  dialogues: {
    reveil: [{ qui: '', txt: 'Mercredi 9 décembre, le lendemain de la tournée.' }, { qui: '', txt: 'Un message de Claire, la conseillère viticole.' }],
    luMessage: [{ qui: '', txt: 'La bouillie bordelaise, c\'est du cuivre : utilisable en bio. Le pulvérisateur est sur l\'enjambeur.' }],
    pasEnjambeur: [{ qui: '', txt: 'On pulvérise avec l\'enjambeur : c\'est lui qui porte le pulvérisateur.' }],
    remplir: [{ qui: '', txt: 'De l\'eau et la bouillie bordelaise : les cuves sont prêtes.' }, { qui: '', txt: 'Elles suffisent pour les trois parcelles.' }],
    guidage: tactile => [{ qui: '', txt: tactile ? 'Engagez l\'enjambeur dans un rang : doigt posé, il y va tout seul.' : 'Engagez l\'enjambeur dans un rang : flèche du haut seule, il y va tout seul.' }],
    engage: tactile => [{ qui: '', txt: tactile ? 'Engagé : l\'enjambeur fait toute la parcelle tout seul. Je ne gère que l\'avance, doigt posé.' : 'Engagé : l\'enjambeur fait toute la parcelle tout seul. Je ne gère que l\'avance, flèche du haut.' }],
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
  },
  bannieres: {
    titre: ['Le lendemain', 'Mission 2 : la journée de traitement'],
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
    ],
    bouton: 'Continuer la balade',
  },
};

/* ---------------------------------------------------------------- mission 3 : l'habillage, avec Viticode
   Ce que fait Viticode, d'après viticode.fr (la page d'accueil, ses captures d'écran et la fiche produit d'exemple, lues
   le 24/11/2026) : gratuit, nombre de fiches produit illimité ; la fiche produit (nom du produit, 50 caractères au plus ;
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
   traitement : jeudi 10 décembre ; le message de l'imprimerie, le vendredi matin. Le BAT (bon à tirer) :
   l'épreuve que l'imprimeur fait valider avant d'imprimer. Cuvée, analyse, lot, noms : fictifs. */
export const HABILLAGE = {
  date: 'jeudi 10 décembre', dateCourte: '10 décembre',
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
    attente: 'L\'habillage prend l\'après-midi : rentrez dormir au domaine, l\'imprimerie vous écrira',
    reprendreTracteur: 'Prenez le tracteur et allez chercher la remorque à l\'imprimerie',
    reprendre: 'Allez chercher la remorque à l\'imprimerie : arrêtez-vous à l\'entrée de la cour',
    chai: 'Ramenez la remorque au chai, et dételez-la dans la cour',
    fin: 'Le Clos 2025 est habillé',
  },
  dialogues: {
    reveil: [{ qui: '', txt: 'Jeudi 10 décembre. Aujourd\'hui, on habille le Clos 2025 : six palox.' }, { qui: '', txt: 'Un message de l\'imprimerie.' }],
    luMessage: [{ qui: '', txt: 'Pour le QR code, il me faut les valeurs du labo : un échantillon à l\'œnologue d\'abord.' }, { qui: '', txt: 'Il y a un carton du Clos ouvert dans le chai. Pendant ce temps, Marc préparera la remorque.' }],
    echantillon: [{ qui: '', txt: 'Une bouteille du Clos : l\'échantillon pour le labo. Direction le bourg.' }],
    apresLabo: [{ qui: '', txt: 'Le bulletin arrivera sur le téléphone. Je rentre au domaine : la remorque doit être prête.' }],
    prete: [{ qui: 'Marc', txt: 'La remorque est prête : les six palox du Clos, à sa place, au bord de l\'allée.' }, { qui: 'Marc', txt: 'Venez avec le tracteur, je vous aide à l\'atteler.' }],
    preteTracteur: [{ qui: 'Marc', txt: 'La remorque est prête : les six palox du Clos, à sa place, au bord de l\'allée.' }, { qui: 'Marc', txt: 'Arrêtez-vous devant le timon, je vous guide.' }],
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
    bulletin: [{ qui: '', txt: 'Le bulletin du labo est arrivé. Direction Viticode, sur le téléphone.' }],
    publiee: [{ qui: '', txt: 'La fiche est publiée : elle a son QR code. Je la teste.' }],
    teste: [{ qui: '', txt: 'Ce que lira le client en scannant la bouteille, dans sa langue.' }],
    envoye: [{ qui: '', txt: 'Le fichier est parti à l\'imprimerie.' }],
    bat: [{ qui: '', txt: 'Le BAT de l\'imprimerie : la contre-étiquette, avec le QR code.' }],
    batOk: [{ qui: '', txt: 'La remorque maintenant : au domaine, en tracteur.' }],
    pasFichier: [{ qui: 'Julien', txt: 'Salut ! Il me faut d\'abord la contre-étiquette validée : le fichier du QR code, puis le BAT.' }],
    pasRemorque: [{ qui: 'Julien', txt: 'Et les bouteilles ? Les palox sont sur la remorque, au domaine : venez avec le tracteur.' }],
    entrepot: [{ qui: 'Julien', txt: 'Salut ! Dételez-la là, je prends le chariot.' }],
    chariot: [{ qui: 'Julien', txt: 'Je rentre les palox et je lance la ligne. Ça prend l\'après-midi : je vous écris quand c\'est fini.' }],
    decharge: [{ qui: '', txt: 'Les six palox sont rentrés, la ligne tourne. Il n\'y a plus qu\'à attendre : je rentre au domaine.' }],
    patience: [{ qui: 'Julien', txt: 'La ligne tourne, ça prend l\'après-midi. Je vous écris quand c\'est prêt !' }],
    reveilHabille: [{ qui: '', txt: 'Vendredi 11 décembre. Un message de l\'imprimerie.' }],
    sms: [{ qui: '', txt: 'L\'imprimerie : c\'est habillé ! Je vais chercher la remorque, en tracteur.' }],
    julienAide: [{ qui: 'Julien', txt: 'Bonjour ! Mettez-vous en travers, là, et reculez sur le timon. Je m\'occupe de la goupille.' }],
    versChai: [{ qui: 'Julien', txt: 'C\'est bon ! Bonne route, et bonne vente.' }, { qui: '', txt: 'Je la ramène au chai.' }],
    fin: [{ qui: '', txt: 'Le Clos 2025 est habillé, et chaque bouteille dit ce qu\'elle contient.' }],
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
    titre: ['Le surlendemain', 'Mission 3 : l\'habillage'],
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
