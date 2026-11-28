// La mission 4 « Les portes ouvertes » (Teddy, 28/11/2026 ; textes.js : PORTES, ses sources en tête du bloc).
// Ce module tient l'état de la mission et sa logique commune :
// - le ciblage dans Vitisoft (Clients / contacts, la recherche multi-critères : filtrer, rechercher, compte) ;
// - la campagne : créée en un clic depuis la sélection (ouvrirCampagne), l'email et le SMS dans Brevo (envoyerEmail,
//   envoyerSms), le courrier en publipostage depuis Vitisoft (envoyerCourrier), les relances automatiques par mail
//   (activerRelances) ;
// - la caisse du jour J (Vitisoft, la caisse caveau) : le client au comptoir (clientCaisse : portes.js le fait venir),
//   ce que le joueur a saisi vérifié contre sa commande (encaisser), les tickets ;
// - les statistiques des portes ouvertes et le merci par mail (stats, envoyerMerci).
// Chaque action réussie appelle signal(nom) : le déroulé de la mission (les étapes, les objectifs, la logistique) s'y
// branche. pc.js (l'ordinateur) lit cet état et appelle ces méthodes ; portes.js (les visiteurs) fait venir les clients.
//
// Le déroulé (Teddy, 28/11/2026 : « préparer les portes ouvertes avec Vitisoft sur un ordinateur et envoyer les
// invitations à tous les particuliers de la région (...) ; laisser passer un peu de délai ; avec le tracteur aller
// chercher du matériel genre des tables, de la sono, et de la nourriture chez un traiteur ; le jour de la porte ouverte,
// l'ordinateur du bureau sur le parvis pour la caisse : une dizaine de clients ; puis l'employé la remplace et le joueur
// fait déguster le vin à différents invités : la mission est réussie ; en supplément, des stats et des mails de
// remerciement à tous les gens qui sont passés ») :
// - le jour des invitations (au réveil, le lendemain de l'habillage ; message, puis ciblage, campagne, courrier,
//   relances : l'étape suit ce qui est fait, recaler) : au bureau du chai, l'ordinateur ; tout parti (semaine), on rentre
//   dormir et une semaine passe (main.js : dormir) ;
// - la veille (materiel) : Marc a sorti la remorque, vide, au bord de l'allée ; en tracteur, il attelle ; à la mairie,
//   sur la place du bourg, l'agent municipal charge le matériel du comité des fêtes ; dans la cour, on l'installe avec Marc
//   (un fondu : une heure plus tard) ; on rentre dormir ;
// - le jour J : en van, les plateaux de Clémence (traiteur), portés au buffet ; le portable du bureau, posé sur la table de
//   la caisse (portable) ; 10 h, les portes ouvrent (en avance, le temps saute à 10 h) ; la caisse : dix clients
//   (caisse) ; Marc prend la caisse (releve) ; au bar de dégustation, cinq invités servis (degustation) : gagnée (fin, la
//   carte de fin) ; en supplément, les statistiques et le merci (stats), puis libre ; à 18 h, les visiteurs repartent.
// Pour finir toujours : l'objectif est recalculé d'après l'état ; arrivé trop tôt quelque part, on entend ce qui manque ;
// la nuit (outils.js : HORAIRES), Marc, la mairie et Clémence sont fermés : on le dit, on rentre dormir, ça reprend le
// matin (les portes ouvertes pas finies le jour J reprennent le lendemain). Ce qui se voit et les gestes passent par
// main.js (jeu.portesMonde : la remorque, le matériel, les plateaux, le portable, la caisse, Marc, le temps qui saute).
import { PORTES as P, PORTES_MISSION as PM } from './textes.js';
import { son } from './audio.js';
import { ecart } from './reseau.js';
import { ouvert, heureDe, dateJeu, jourDe, HORAIRES } from './outils.js';

const PRODUITS = new Map(P.produits.map(p => [p.id, p]));
const arrondi = x => Math.round(x * 100) / 100;
const RAPPEL = 8;    // secondes au moins entre deux aides dites en route
const SERVIS = 5;    // les invités servis au bar de dégustation : la mission est gagnée
// les métiers (outils.js : HORAIRES) : l'agent municipal, Clémence le jour J (elle prépare les plateaux dès 7 h), Marc
const METIER = { mairie: 'commerce', traiteur: 'commerce', salarie: 'domaine' };
const JOUR_A = ['message', 'ciblage', 'campagne', 'courrier', 'relances', 'semaine'];
const JOUR_J = ['traiteur', 'portable', 'caisse', 'releve', 'degustation'];
const APRES = ['fin', 'stats', 'libre'];

export class PortesOuvertes {
  // jeu : l'objet jeu de main.js (jeu.visiteurs : portes.js ; jeu.pc, jeu.tel, jeu.hud...) ; c : ce que main.js passe
  constructor(jeu, c = {}) {
    this.j = jeu; this.c = c;
    this.actif = false; this.etape = 'avant';
    this.filtres = {}; for (const f of P.filtres) this.filtres[f.id] = f.options[0][0];
    this.selection = null; // { total, email, sms, courrier } : la recherche lancée avec les bons filtres
    this.campagne = { ouverte: false, email: false, sms: false, courrier: false, relances: false };
    this.caisse = { ouverte: false, i: 0, tickets: [] }; // i : le rang du client au comptoir (PORTES.clients)
    this.merci = false;
    // le déroulé
    this.t = 0; this.horloge = 0; this.jourJ = null; this.occupe = false; this.dit = false;
    this.attelee = false;    // la remorque attelée au tracteur (la veille)
    this.annonce = false;    // Marc a dit que la remorque est prête
    this.materiel = 'aucun'; // charge : sur la remorque ; installe : dans la cour (le décor des portes ouvertes)
    this.plateaux = 'aucun'; // van : chargés chez Clémence ; buffet : sur le buffet
    this.portable = 'bureau'; // porte : dans les mains ; pose : sur la table de la caisse
    this.ouvert = false;     // les portes ont ouvert (portes.js : ouvrir) ; ferme : 18 h, les visiteurs sont repartis
    this.ferme = false;
    this.releve = false;     // Marc tient la caisse
    this.aLaCaisse = false;  // le joueur à la table de la caisse, l'ordinateur ouvert (main.js : tenirCaisse)
    this.servis = 0; this.servis0 = 0; // les invités servis au bar (servis0 : avant une reprise)
    this.range = false;      // la nuit d'après : le décor rangé, le portable revenu au bureau
    this.saute = false; this.tReleve = 0;
    this.caisseLancee = false; // les clients appelés à la caisse (portes.js : ouvrirCaisse, au premier « Tenir la caisse »)
    this.statsVues = false;    // le supplément : les statistiques regardées (pc.js : signal 'statsVues')
    this.objAff = null; this.itin = null; this.tItin = 0; this.tObj = 0;
    this.tRappel = 0; this.aideCle = null; this.aideT = -1e9;
  }

  /* ------------------------------------------------------------ le ciblage (Vitisoft : Clients / contacts) */
  filtrer(id, valeur) { if (this.filtres[id] !== valeur) { this.filtres[id] = valeur; this.selection = null; } }
  // le nombre de contacts que donnent les filtres choisis (affiché dans la recherche, avant de la lancer)
  get compte() {
    let n = P.fichier;
    for (const f of P.filtres) { const o = f.options.find(x => x[0] === this.filtres[f.id]); n *= o ? o[2] : 1; }
    return Math.round(n);
  }
  // les filtres que veut la mission (tous les particuliers de la région) : ce qui manque encore, ou null
  get filtreAttendu() { return P.filtres.find(f => this.filtres[f.id] !== f.voulu) || null; }
  // lancer la recherche : avec les bons filtres, la sélection ; sinon rend le filtre à corriger (son id)
  rechercher() {
    const f = this.filtreAttendu;
    if (f) { this.selection = null; return f.id; }
    this.selection = { ...P.selection };
    this.signal('selection');
    return null;
  }

  /* ------------------------------------------------------------ la campagne */
  // « Créer la campagne » : un clic depuis la sélection ; ouvre Brevo (pc.js)
  ouvrirCampagne() { if (!this.selection) return false; if (!this.campagne.ouverte) { this.campagne.ouverte = true; this.signal('campagne'); } return true; }
  envoyerEmail() { if (!this.campagne.ouverte || this.campagne.email) return false; this.campagne.email = true; this.signal('email'); return true; }
  envoyerSms() { if (!this.campagne.ouverte || this.campagne.sms) return false; this.campagne.sms = true; this.signal('sms'); return true; }
  // le courrier : pour ceux qui n'ont pas d'adresse e-mail (publipostage, étiquettes, routage)
  envoyerCourrier() { if (!this.selection || this.campagne.courrier) return false; this.campagne.courrier = true; this.signal('courrier'); return true; }
  activerRelances() { if (!this.campagne.email || this.campagne.relances) return false; this.campagne.relances = true; this.signal('relances'); return true; }
  get invitationsParties() { const C = this.campagne; return C.email && C.sms && C.courrier && C.relances; }

  /* ------------------------------------------------------------ la caisse */
  // le client au comptoir (sa fiche PORTES.clients), une fois arrivé devant la caisse (portes.js : comptoir), ou null
  get clientCaisse() {
    const V = this.j.visiteurs;
    if (!this.caisse.ouverte || this.caisse.i >= P.clients.length || !V || !V.comptoir) return null;
    return P.clients[this.caisse.i];
  }
  // le total TTC de lignes [[produit, quantité]] avec une remise en %
  total(lignes, remise = 0) {
    let s = 0;
    for (const [id, q] of lignes) { const p = PRODUITS.get(id); if (p) s += p.ttc * q; }
    return arrondi(s * (1 - remise / 100));
  }
  // Ce que le joueur a saisi en caisse : t = { lignes: [[produit, quantité]], remise (%), paiement (PORTES.paiements),
  // percu (espèces : ce que le client a donné), ticket ('facturette' ou 'mail') }. Rend null (le ticket part, le client
  // s'en va : portes.js servi) ou ce que dit le client pour corriger (PORTES.refus).
  encaisser(t) {
    const C = this.clientCaisse, R = P.refus;
    if (!C) return null;
    const voulu = new Map(), saisi = new Map();
    for (const [id, q] of C.achats) voulu.set(id, (voulu.get(id) || 0) + q);
    for (const [id, q] of t.lignes || []) if (q > 0) saisi.set(id, (saisi.get(id) || 0) + q);
    if (!saisi.size) return R.vide;
    for (const [id, q] of voulu) { const n = PRODUITS.get(id).nom; if (!saisi.has(id)) return R.manque(n); if (saisi.get(id) !== q) return R.quantite(n, q); }
    for (const id of saisi.keys()) if (!voulu.has(id)) return R.enTrop(PRODUITS.get(id).nom);
    if ((t.remise || 0) !== (C.remise || 0)) return R.remise(C.remise || 0);
    if (t.paiement !== C.paiement) return R.paiement(({ especes: 'en espèces', cheque: 'par chèque', carte: 'par carte', sans: 'par carte, sans contact' })[C.paiement] || P.paiements[C.paiement]);
    const tot = this.total(C.achats, C.remise || 0);
    if (C.paiement === 'especes' && arrondi(t.percu || 0) !== C.percu) return R.percu(C.percu, String(arrondi(C.percu - tot).toFixed(2)).replace('.', ',') + ' €');
    if (t.ticket !== C.ticket) return R.ticket(C.ticket);
    const ticket = { client: C.id, nom: C.nom, lignes: C.achats.map(([id, q]) => [id, q]), remise: C.remise || 0, total: tot, paiement: C.paiement, ticket: C.ticket, rendu: C.paiement === 'especes' ? arrondi(C.percu - tot) : 0, minutes: this.j.minutes };
    this.caisse.tickets.push(ticket);
    this.caisse.i++;
    if (this.j.visiteurs) this.j.visiteurs.servi(ticket);
    this.signal('ticket');
    if (this.caisse.i >= P.clients.length) this.signal('caisseFinie');
    return null;
  }

  /* ------------------------------------------------------------ les statistiques, le merci */
  get stats() {
    const T = this.caisse.tickets, ca = arrondi(T.reduce((s, t) => s + t.total, 0)), parFamille = {};
    let bouteilles = 0;
    for (const t of T) for (const [id, q] of t.lignes) {
      const p = PRODUITS.get(id), k = parFamille[p.famille] || (parFamille[p.famille] = { q: 0, ca: 0 });
      k.q += q; k.ca = arrondi(k.ca + p.ttc * q * (1 - t.remise / 100));
      if (p.famille !== 'epicerie' && p.famille !== 'divers') bouteilles += p.id === 'coffret' ? 3 * q : q;
    }
    const B = P.bilan, nouveaux = T.filter(t => t.ticket === 'mail' && P.clients.find(c => c.id === t.client)?.nouveau).length;
    return { tickets: T.length, ca, panier: T.length ? arrondi(ca / T.length) : 0, bouteilles, parFamille, visiteurs: B.visiteurs, invitesVenus: B.invitesVenus,
      ouvertures: B.ouvertures, clics: B.clics, envoyes: { ...P.selection }, destinataires: B.invitesVenus + nouveaux };
  }
  envoyerMerci() { if (this.merci) return false; this.merci = true; this.signal('merci'); return true; }

  /* ------------------------------------------------------------ le déroulé */
  // une action réussie (nom : 'selection', 'campagne', 'email', 'sms', 'courrier', 'relances', 'ticket', 'caisseFinie',
  // 'statsVues', 'merci') : une bannière, ce qu'on se dit, l'étape d'après
  signal(nom) {
    const j = this.j, hud = j.hud, B = PM.bannieres, D = PM.dialogues;
    if (!hud) return;
    if (nom === 'selection') { son.jouer('succes'); hud.banniere(...B.selection(P.selection), 3); hud.dire(D.selection(P.selection)); }
    else if (nom === 'campagne') hud.dire(D.campagne);
    else if (nom === 'email' || nom === 'sms' || nom === 'courrier' || nom === 'relances') { son.jouer('envoye'); hud.banniere(...B[nom], 3); hud.dire(D[nom]); }
    else if (nom === 'ticket') { son.jouer('succes'); hud.banniere(...B.ticket(this.caisse.i, P.clients.length), 2.2); }
    else if (nom === 'caisseFinie') { this.aller('releve'); this.tReleve = 1.8; hud.banniere(...B.caisseFinie, 3); }
    else if (nom === 'statsVues') this.statsVues = true; // (pc.js : les statistiques des portes ouvertes regardées)
    else if (nom === 'merci') { son.jouer('envoye'); hud.banniere(...B.merci, 3); hud.dire(D.merci); if (this.etape === 'stats') this.aller('libre'); }
    this.recaler();
    this.itin = null; this.tObj = 0;
  }
  get M() { return this.j.portesMonde; } // (main.js : ce qui se voit, les gestes, Marc)
  get V() { return this.j.visiteurs; }   // (portes.js : les visiteurs)
  get date() { return dateJeu(jourDe(this.j.minutes)); }
  // le jour des portes ouvertes (outils.js : jourDe) et sa date, que disent les invitations (pc.js : Brevo, le courrier) :
  // une semaine et un jour après celui des invitations ; reporté si la veille a pris plus d'une journée
  get jourPrevu() { return this.jourJ ?? jourDe(this.j.minutes) + P.semaine + 1; }
  get dateJ() { return dateJeu(this.jourPrevu); }
  get tot() { return heureDe(this.j.minutes) < HORAIRES.commerce[0]; }
  ouvertA(id) { return ouvert(this.j.minutes, METIER[id]); }
  get enTracteur() { return this.j.auVolant && this.j.veh.genre === 'tracteur'; }
  get enVan() { return this.j.auVolant && this.j.veh.genre === 'van'; }
  get porte() { return this.portable === 'porte'; } // le portable dans les mains
  // Clémence est devant son restaurant dès 7 h, le jour J, tant qu'on n'a pas pris ses plateaux (restaurateurs.js)
  get attendTraiteur() { return this.actif && this.etape === 'traiteur' && this.plateaux === 'aucun'; }
  // le portable n'est plus sur le bureau du chai (on ne s'y assoit plus : main.js), dès qu'il faut le prendre, le jour J
  get portableAilleurs() { return this.actif && !this.range && (this.portable !== 'bureau' || this.etape === 'portable' || this.etape === 'traiteur'); }
  // L'appli que l'ordinateur ouvre (main.js : jeu.appliPC, tenirCaisse ; pc.js : son icône mise en évidence) : Vitisoft
  // pour le ciblage, créer la campagne, le courrier, les statistiques ; Brevo pour l'email et le SMS, les relances ; la
  // caisse le jour J ; null hors de la mission (l'ordinateur décide)
  get appli() {
    const e = this.etape;
    if (!this.actif) return null;
    if (e === 'message' || e === 'ciblage' || e === 'courrier' || e === 'stats') return 'vitisoft';
    if (e === 'campagne') return this.campagne.ouverte ? 'brevo' : 'vitisoft';
    if (e === 'relances') return 'brevo';
    if (e === 'caisse') return 'caisse';
    return null;
  }

  // au réveil, le lendemain de l'habillage (main.js : dormir), ou lancée depuis l'accueil
  demarrer() {
    this.actif = true; this.jourJ = jourDe(this.j.minutes) + P.semaine + 1; this.dit = false;
    this.aller('message');
    this.j.hud.vider(); this.j.hud.banniere(...PM.bannieres.titre(this.date), 4.5);
  }
  aller(e) { this.etape = e; this.t = 0; this.itin = null; this.tObj = 0; }
  // le jour des invitations : l'étape d'après ce qui est fait (l'ordinateur peut prendre un autre ordre)
  recaler() {
    if (!JOUR_A.includes(this.etape) || this.etape === 'message') return;
    const C = this.campagne, avant = this.etape;
    const e = !C.ouverte && !this.selection ? 'ciblage' : !(C.email && C.sms) ? 'campagne' : !C.courrier ? 'courrier' : !C.relances ? 'relances' : 'semaine';
    if (e === avant) return;
    this.aller(e);
    if (e === 'semaine') this.j.hud.dire(PM.dialogues.semaine);
  }
  // Une nuit passe (main.js : dormir, derrière le fondu au noir, l'heure déjà au matin). Rend ce qui commence au réveil :
  // 'veille' (une semaine a passé), 'jourJ', 'reprise' (le jour J pas fini : les portes ouvertes reprennent aujourd'hui),
  // 'range' (le lendemain des portes ouvertes : le décor rangé), ou null.
  nuitPassee() {
    if (!this.actif) return null;
    const jour = jourDe(this.j.minutes), e = this.etape;
    if (e === 'semaine') { if (jour >= this.jourJ) this.jourJ = jour + 1; this.veille(); return 'veille'; }
    if (e === 'materiel' && this.materiel === 'installe') { this.jourJ = jour; this.jourDeFete(); return 'jourJ'; }
    if (e === 'materiel') { if (jour >= this.jourJ) this.jourJ = jour + 1; return null; }
    if (JOUR_J.includes(e)) {
      if (this.ouvert && this.V) this.V.fermer();
      this.jourJ = jour; this.ouvert = false; this.ferme = false; this.dit = true;
      if (e === 'releve') { this.releve = true; this.aller('degustation'); }
      return 'reprise';
    }
    if (APRES.includes(e) && jour > this.jourJ && !this.range) {
      this.range = true;
      if (this.ouvert && !this.ferme && this.V) this.V.fermer();
      this.ferme = true;
      if (e !== 'libre') this.aller('libre');
      return 'range';
    }
    return null;
  }
  // au réveil, une semaine plus tard : la veille ; Marc a sorti la remorque, le matériel attend sur la place (main.js)
  veille() {
    this.materiel = 'aucun'; this.attelee = false; this.annonce = false; this.dit = false;
    this.aller('materiel');
    this.j.hud.vider(); this.j.hud.banniere(...PM.bannieres.semaine(this.date), 4);
  }
  // au réveil le jour J
  jourDeFete() {
    this.dit = false; this.ouvert = false; this.ferme = false;
    this.aller('traiteur');
    this.j.hud.vider(); this.j.hud.banniere(...PM.bannieres.jourJ(this.date), 4);
  }
  aider(lignes, cle) {
    if (!lignes || this.tRappel > 0 || (cle === this.aideCle && this.horloge - this.aideT < 25)) return;
    this.j.hud.dire(lignes); this.tRappel = RAPPEL; this.aideCle = cle; this.aideT = this.horloge;
  }

  // La nuit : ce qui attend quelqu'un de fermé (Marc pour atteler, la mairie, Clémence) : la clé de l'objectif
  // (PORTES_MISSION.objectifs.nuit), la balise sur la maison ; sinon null
  get nuit() {
    if (this.occupe) return null;
    if (this.etape === 'materiel' && this.materiel === 'aucun') return !this.attelee ? (this.ouvertA('salarie') ? null : 'marc') : (this.ouvertA('mairie') ? null : 'mairie');
    if (this.etape === 'traiteur' && this.plateaux === 'aucun' && !this.porte) return this.ouvertA('traiteur') ? null : 'traiteur';
    return null;
  }
  // La prochaine destination ; rien quand on y est (au bureau, à la caisse) ou qu'il n'y a qu'à attendre
  get prochain() {
    const j = this.j, L = j.lieux, P4 = L.portesOuvertes, e = this.etape;
    if (this.occupe || e === 'avant') return null;
    if (this.nuit) return { lieu: L.maison, nom: 'Maison' };
    if (e === 'semaine') return { lieu: L.maison, nom: 'Maison' };
    if (JOUR_A.includes(e)) return j.dedans === 'bureau' || j.pc.ouvert ? null : { lieu: L.pc, nom: 'Bureau du chai' };
    if (e === 'materiel') {
      if (this.materiel === 'installe') return { lieu: L.maison, nom: 'Maison' };
      if (this.materiel === 'charge') return { lieu: L.remorque.chai.arret, nom: 'La cour' };
      if (!this.attelee) return { lieu: j.remorque.approche, nom: 'Remorque' };
      return { lieu: P4.mairie, nom: 'Mairie' };
    }
    if (e === 'traiteur' || e === 'portable') {
      if (this.porte) return { lieu: P4.caisse, nom: 'La caisse' };
      if (this.plateaux === 'aucun') return { lieu: P4.chezClemence, nom: 'La Table de Clémence' };
      if (this.plateaux === 'van') return { lieu: P4.livraison, nom: 'Le buffet' };
      if (this.portable === 'bureau') return j.dedans === 'bureau' ? null : { lieu: L.pc, nom: 'Bureau du chai' };
      return null;
    }
    if (e === 'caisse' || (e === 'stats' && !this.merci)) return this.aLaCaisse ? null : { lieu: P4.caisse, nom: 'La caisse' };
    if (e === 'degustation') return { lieu: P4.bar, nom: 'Bar de dégustation' };
    return null;
  }
  get cible() { const p = this.prochain; return p ? p.lieu : null; }
  get nomCible() { const p = this.prochain; return p ? p.nom : ''; }
  // l'itinéraire jusqu'à la balise, refait si l'on s'en écarte (ou si la balise a bougé)
  get route() {
    const c = this.cible;
    if (!c) return null;
    const j = this.j, o = j.auVolant ? j.tr.pos : j.joueur.pos;
    if (!this.itin || this.itin.c !== c || Math.hypot(this.itin.x - c.x, this.itin.z - c.z) > 3) this.itin = { c, x: c.x, z: c.z, pts: j.reseau.itineraire(o, c) };
    return this.itin.pts;
  }
  // Le véhicule qu'il faut (main.js : guider) : le tracteur pour la remorque, le van pour les plateaux du traiteur
  get vehiculeVoulu() {
    if (!this.actif || this.occupe || this.nuit || this.porte) return null;
    if (this.etape === 'materiel' && this.materiel === 'aucun' && !this.attelee) return { v: 'tracteur', raison: 'materiel' };
    if (this.etape === 'traiteur' || this.etape === 'portable') {
      if (this.plateaux === 'aucun') return { v: 'van', raison: 'traiteur' };
      if (this.plateaux === 'van') return { v: 'van', raison: 'cartons' };
    }
    return null;
  }

  // L'objectif affiché, d'après où en est la mission
  get objectif() {
    const e = this.etape, O = PM.objectifs, C = this.campagne, j = this.j, n = P.clients.length;
    if (e === 'avant') return null;
    if (e === 'message') return O.message;
    if (e === 'ciblage') return j.dedans === 'bureau' || j.pc.ouvert ? O.ciblage : O.message;
    if (e === 'campagne') return !C.ouverte ? O.campagne : C.email && !C.sms ? O.campagneSms : C.sms && !C.email ? O.campagneEmail : O.campagne;
    if (e === 'courrier') return this.selection ? O.courrier : O.courrierRecherche;
    if (e === 'relances') return O.relances;
    if (e === 'semaine') return O.semaine;
    const nuit = this.nuit;
    if (nuit) return O.nuit[nuit];
    if (e === 'materiel') {
      if (this.materiel === 'installe') return O.installe;
      if (this.materiel === 'charge') return O.cour;
      if (this.attelee) return this.occupe ? O.chargement : O.mairie;
      return this.enTracteur ? O.atteler : O.tracteur;
    }
    if (e === 'traiteur' || e === 'portable') {
      if (this.porte) return O.poser;
      if (this.plateaux === 'aucun') return this.enVan ? O.traiteur : O.van;
      if (this.plateaux === 'van') return O.buffet;
      if (this.portable === 'bureau') return O.portable;
      return O.attente;
    }
    if (e === 'caisse') return this.aLaCaisse ? O.caisse(this.caisse.i, n) : O.tenir(this.caisse.i, n);
    if (e === 'releve') return O.releve;
    if (e === 'degustation') return O.degustation(Math.min(SERVIS, this.servis), SERVIS);
    if (e === 'fin') return O.fin;
    if (e === 'stats') return this.aLaCaisse && this.statsVues ? O.merci : O.stats;
    return O.libre;
  }

  update(dt) {
    const j = this.j, hud = j.hud, e0 = this.etape;
    if (!this.actif || e0 === 'avant') return;
    this.t += dt; this.horloge += dt;
    this.tRappel = Math.max(0, this.tRappel - dt);
    if (this.itin && (this.tItin -= dt) <= 0) {
      this.tItin = 0.5;
      const o = j.auVolant ? j.tr.pos : j.joueur.pos;
      if (ecart(this.itin.pts, o) > 25) this.itin = null;
    }
    const V = this.V;
    if (V) this.servis = this.servis0 + (V.nServis || 0);
    // le jour J : à 10 h, les visiteurs arrivent ; à 18 h, la mission gagnée, ils repartent (pas finie, la fête continue)
    if (this.jourJ !== null && !this.range && jourDe(j.minutes) === this.jourJ && (JOUR_J.includes(e0) || APRES.includes(e0))) {
      const h = heureDe(j.minutes);
      if (!this.ouvert && !this.ferme && h >= P.ouverture && h < P.fermeture && !this.saute) this.ouvrirPortes();
      if (this.ouvert && !this.ferme && h >= P.fermeture && APRES.includes(e0)) { this.ferme = true; V?.fermer(); hud.dire(PM.dialogues.fermeture); }
    }
    switch (e0) {
      case 'message':
        if (this.t > 1.2 && !this.dit) { this.dit = true; hud.dire(PM.dialogues.reveil(this.date, this.dateJ)); }
        if (this.t > 4) { this.etape = 'ciblage'; this.t = 0; this.recaler(); }
        break;
      case 'materiel':
        if (this.t > 1.2 && !this.dit) { this.dit = true; hud.dire(PM.dialogues.veille(this.date)); }
        this.veilleSur();
        break;
      case 'traiteur': case 'portable':
        if (this.t > 1.2 && !this.dit) { this.dit = true; hud.dire(PM.dialogues.jourJ(this.date)); }
        this.jourSur();
        break;
      case 'releve': this.releveSur(dt); break;
      case 'degustation': if (this.servis >= SERVIS && !this.occupe && !j.gestes.actif) this.finir(); break;
      case 'fin': if (this.t > 5) { this.aller('stats'); j.finMission4(); } break;
    }
    // l'objectif : dix fois par seconde (il fabrique des textes), tout de suite après un changement d'étape
    if ((this.tObj -= dt) <= 0 || this.etape !== e0) {
      this.tObj = 0.1;
      const o = this.objectif;
      if (o && o !== this.objAff) { this.objAff = o; hud.objectif(o); }
    }
  }
  // 10 h : les portes ouvrent (portes.js : les visiteurs arrivent ; plus tard dans la journée, une partie reprise ou le
  // portable posé en retard, la cour déjà pleine : ouvrir(true))
  ouvrirPortes(dire = true) {
    this.ouvert = true; this.V?.ouvrir(heureDe(this.j.minutes) > P.ouverture + 5);
    son.jouer('succes'); this.j.hud.banniere(...PM.bannieres.ouverture, 3);
    if (dire) this.j.hud.dire(PM.dialogues.ouverture);
  }

  // La veille, dehors : Marc, à côté de la remorque, dit qu'elle est prête ; en tracteur devant le timon, il attelle ; à
  // la mairie, l'agent municipal charge le matériel ; dans la cour, on l'installe. Arrêté trop tôt, on entend ce qui manque.
  veilleSur() {
    const j = this.j, L = j.lieux, P4 = L.portesOuvertes, R = j.remorque, M = this.M;
    if (this.occupe || j.gestes.actif || j.tel.ouvert || j.pc.ouvert || this.materiel === 'installe' || !M) return;
    const v = j.auVolant ? Math.abs(j.tr.v) : 0, lent = j.auVolant && v < 2.5, arrete = !j.auVolant || v < 0.6;
    if (this.materiel === 'aucun') {
      // à la mairie, à pied ou sans la remorque : l'agent municipal le dit
      const A = M.agent;
      if (A && A.p.m.groupe.visible && arrete && (!this.attelee || !this.enTracteur) && Math.hypot((j.auVolant ? j.tr.pos : j.joueur.pos).x - A.p.pos.x, (j.auVolant ? j.tr.pos : j.joueur.pos).z - A.p.pos.z) < 7) this.aider(PM.dialogues.pasRemorque(PM.agent), 'mairie');
      if (!this.attelee) {
        if (!this.annonce && M.marc && M.marc.etat === 'dehors' && j.distance(R.ici) < 34) {
          this.annonce = true; this.itin = null;
          M.marc.p.saluer?.();
          j.hud.dire(this.enTracteur ? PM.dialogues.preteTracteur : PM.dialogues.prete);
          return;
        }
        if (j.auVolant && arrete && (j.distance(R.ici) < 14 || j.distance(R.approche) < 6)) {
          if (j.veh.genre !== 'tracteur') this.aider(PM.dialogues.pasTracteur, 'remorque');
          else if (!this.ouvertA('salarie')) this.aider(PM.dialogues.marcRentre, 'remorque');
          else if (R.peutAtteler()) { this.atteler(); return; }
          else this.aider(PM.dialogues.timon, 'remorque');
        }
        return;
      }
      if (this.enTracteur && lent && (j.distance(P4.mairie) < 9 || j.distance(P4.materiel) < 9)) {
        if (!this.ouvertA('mairie') || !A || !A.p.m.groupe.visible) { if (arrete) this.aider(PM.dialogues.mairieFermee(this.tot), 'mairie'); }
        else if (arrete) this.chargerMateriel();
      }
      return;
    }
    if (this.materiel === 'charge' && this.enTracteur && lent && j.distance(L.remorque.chai.arret) < 10) this.installer();
  }
  atteler() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider(); j.hud.dire(PM.dialogues.marcAide);
    this.M.atteler(() => {
      this.occupe = false; this.attelee = true; this.itin = null;
      son.jouer('succes'); j.hud.banniere(...PM.bannieres.attelee, 3); j.hud.dire(PM.dialogues.attelee);
    });
  }
  chargerMateriel() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider(); j.hud.dire(PM.dialogues.mairie(PM.agent));
    this.M.chargerMateriel(() => {
      this.occupe = false; this.materiel = 'charge'; this.itin = null;
      son.jouer('succes'); j.hud.banniere(...PM.bannieres.charge, 3); j.hud.dire(PM.dialogues.charge(PM.agent));
    });
  }
  // dans la cour : un fondu, une heure plus tard ; le décor installé, la remorque rangée, le tracteur au hangar (main.js)
  installer() {
    const j = this.j, marc = this.ouvertA('salarie');
    this.occupe = true;
    j.hud.vider();
    this.M.installer(marc, () => {
      this.occupe = false; this.materiel = 'installe'; this.attelee = false; this.itin = null;
      son.jouer('succes'); j.hud.banniere(...PM.bannieres.installe, 3.5); j.hud.dire(marc ? PM.dialogues.installe : PM.dialogues.installeSeul);
    });
  }

  // Le jour J, avant d'ouvrir la caisse : les plateaux de Clémence, du van au buffet ; le portable posé ; 10 h
  jourSur() {
    const j = this.j, P4 = j.lieux.portesOuvertes, M = this.M;
    if (!M) return;
    // le portable posé, le buffet garni : la caisse ouvre à 10 h (en avance, le temps saute à 10 h, derrière un fondu)
    if (this.plateaux === 'buffet' && this.portable === 'pose' && !this.occupe && !j.gestes.actif) {
      if (heureDe(j.minutes) < P.ouverture && jourDe(j.minutes) === this.jourJ) {
        this.occupe = true; this.saute = true;
        M.sauterA(this.jourJ * 1440 + P.ouverture, () => { this.occupe = false; this.saute = false; });
        return;
      }
      this.ouvrirCaisse();
      return;
    }
    if (this.etape === 'traiteur' && this.plateaux === 'buffet') this.aller('portable');
    if (this.occupe || j.gestes.actif || j.tel.ouvert || j.pc.ouvert) return;
    const v = j.auVolant ? Math.abs(j.tr.v) : 0, lent = j.auVolant && v < 2.5, arrete = !j.auVolant || v < 0.6;
    // chez Clémence : ses plateaux, chargés dans le van
    if (this.plateaux === 'aucun') {
      const C = M.clemence, dC = j.distance(P4.chezClemence), dP = C && C.p ? j.distance(C.p.pos) : 99;
      if ((lent && (dC < 7 || dP < 8)) || (!j.auVolant && dP < 3)) {
        if (!this.ouvertA('traiteur') || !C || !C.present) { if (arrete) this.aider(PM.dialogues.clemenceFermee, 'traiteur'); }
        else if (!this.enVan) { if (arrete) this.aider(PM.dialogues.pasVan, 'traiteur'); }
        else if (arrete) { this.chargerPlateaux(); return; }
      }
    }
    // au buffet : les plateaux, du van au pied du buffet
    if (this.plateaux === 'van' && this.enVan && arrete && j.distance(P4.buffet) < 9) this.dechargerBuffet();
  }
  chargerPlateaux() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider(); j.hud.dire(PM.dialogues.clemence);
    this.M.chargerPlateaux(() => {
      this.occupe = false; this.plateaux = 'van'; this.itin = null;
      son.jouer('succes'); j.hud.banniere(...PM.bannieres.plateaux, 3); j.hud.dire(PM.dialogues.clemenceFin);
    });
  }
  dechargerBuffet() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider();
    this.M.dechargerBuffet(() => {
      this.occupe = false; this.plateaux = 'buffet'; this.itin = null;
      son.jouer('succes'); j.hud.banniere(...PM.bannieres.buffet, 3); j.hud.dire(this.portable === 'bureau' ? PM.dialogues.buffet : PM.dialogues.buffetApres);
    });
  }
  // « Prendre le portable » (au bureau du chai) ; « Poser le portable » (à la table de la caisse) : main.js, les étiquettes
  get portablePrenable() { return this.actif && !this.occupe && this.portable === 'bureau' && (this.etape === 'traiteur' || this.etape === 'portable'); }
  get portablePosable() { return this.actif && !this.occupe && this.porte; }
  prendrePortable() {
    if (!this.portablePrenable) return;
    this.occupe = true;
    this.M.prendrePortable(() => { this.occupe = false; this.portable = 'porte'; this.itin = null; this.j.hud.dire(PM.dialogues.portable); });
  }
  poserPortable() {
    if (!this.portablePosable) return;
    this.occupe = true;
    this.M.poserPortable(() => {
      this.occupe = false; this.portable = 'pose'; this.itin = null;
      son.jouer('succes'); this.j.hud.banniere(...PM.bannieres.pose, 3); this.j.hud.dire(PM.dialogues.pose);
    });
  }
  // la caisse ouvre (les clients de PORTES.clients s'y présentent au premier « Tenir la caisse » : tenirCaisse)
  ouvrirCaisse() {
    const D = PM.dialogues, deja = this.ouvert;
    if (!deja) this.ouvrirPortes(false);
    this.caisse.ouverte = true;
    this.aller('caisse');
    this.j.hud.dire(deja ? D.caisse : [...D.ouverture, ...D.caisse]);
  }
  // « Tenir la caisse » (la caisse) ou « Voir les statistiques » (le supplément) : à la table de la caisse, l'ordinateur
  // s'ouvre (main.js : tenirCaisse) ; se lever le referme (quitterCaisse)
  get caisseTenable() { return this.actif && !this.occupe && !this.aLaCaisse && (this.etape === 'caisse' || (this.etape === 'stats' && !this.merci)); }
  tenirCaisse() {
    if (!this.caisseTenable) return;
    this.occupe = true;
    const stats = this.etape === 'stats';
    this.M.tenirCaisse(stats, () => {
      this.occupe = false; this.aLaCaisse = true; this.tObj = 0;
      if (!stats && !this.caisseLancee) { this.caisseLancee = true; this.V?.ouvrirCaisse(); } // (portes.js : la file se forme)
    });
  }
  quitterCaisse() {
    if (!this.aLaCaisse) return;
    this.aLaCaisse = false; this.tObj = 0;
    if (this.releve) this.M.marcReprend(); // (le supplément : Marc reprend sa place)
  }
  // le dixième ticket : l'ordinateur se ferme, on se lève ; Marc sort du chai et prend la caisse
  releveSur(dt) {
    const j = this.j;
    if (this.occupe || (this.tReleve -= dt) > 0) return;
    if (j.pc.ouvert) { j.pc.lever(); return; }
    if (j.gestes.actif) return;
    this.occupe = true;
    j.hud.dire(PM.dialogues.caisseFinie);
    this.M.marcVient(() => {
      this.occupe = false; this.releve = true; this.V?.releve();
      this.aller('degustation');
      j.hud.dire([...PM.dialogues.marcReleve, ...PM.dialogues.degustation]);
    });
  }
  // cinq invités servis au bar de dégustation : la mission est gagnée (sauvegarde.js), la carte de fin arrive (update)
  finir() {
    const j = this.j;
    this.aller('fin'); j.gagner('portes');
    son.jouer('succes'); j.hud.banniere(...PM.bannieres.fin, 4.5);
    j.hud.dire(PM.dialogues.fin);
  }

  // L'agent municipal (main.js : gens4 ; clients.js) : son métier ; son affaire faite (le matériel chargé : il rentre à la
  // mairie) ; une affaire en cours ; le matin, ressort-il ? (la veille, tant que le matériel n'est pas chargé)
  fait(id) { return id === 'mairie' ? this.materiel !== 'aucun' : false; }
  horaire(id) { return METIER[id]; }
  occupeAvec() { return this.occupe; }
  veut(id) { return id === 'mairie' ? this.actif && this.etape === 'materiel' && this.materiel === 'aucun' : false; }

  // La sauvegarde : prise à un moment sûr (pas de geste, rien dans les mains, le matériel pas sur la remorque, Marc pas en
  // route) ; à la reprise, on est au domaine, à pied, la remorque dételée ; main.js remet ce qui se voit
  get stable() {
    return this.actif && !this.occupe && !this.j.gestes.actif && this.etape !== 'releve' && !this.porte && this.materiel !== 'charge';
  }
  instantane() {
    const e = this.etape === 'message' ? 'ciblage' : this.etape === 'fin' ? 'stats' : this.etape;
    return { ...this.instantaneCommun(), etape: e, jourJ: this.jourJ, materiel: this.materiel, plateaux: this.plateaux, portable: this.portable,
      ouvert: this.ouvert, ferme: this.ferme, releve: this.releve, servis: this.servis, range: this.range, annonce: this.annonce };
  }
  reprendre(o) {
    this.reprendreCommun(o);
    this.actif = true; this.jourJ = o.jourJ ?? null;
    this.materiel = o.materiel === 'charge' ? 'aucun' : o.materiel || 'aucun';
    this.plateaux = o.plateaux || 'aucun'; this.portable = o.portable === 'porte' ? 'bureau' : o.portable || 'bureau';
    this.ouvert = false; this.ferme = !!o.ferme; this.releve = !!o.releve; this.servis0 = o.servis || 0; this.servis = this.servis0;
    this.range = !!o.range; this.annonce = !!o.annonce; this.attelee = false; this.aLaCaisse = false; this.occupe = false; this.caisseLancee = false;
    this.caisse.ouverte = this.caisse.ouverte || ['caisse', 'degustation', 'stats', 'libre'].includes(o.etape);
    this.dit = true;
    this.aller(o.etape);
    this.recaler();
  }

  // ce que la sauvegarde garde de l'état commun (le déroulé y ajoute le sien)
  instantaneCommun() {
    return { filtres: { ...this.filtres }, selection: !!this.selection, campagne: { ...this.campagne }, caisse: { ouverte: this.caisse.ouverte, i: this.caisse.i, tickets: this.caisse.tickets.map(t => ({ ...t, lignes: t.lignes.map(l => l.slice()) })) }, merci: this.merci };
  }
  reprendreCommun(o) {
    if (!o) return;
    Object.assign(this.filtres, o.filtres || {});
    this.selection = o.selection ? { ...P.selection } : null;
    Object.assign(this.campagne, o.campagne || {});
    if (o.caisse) { this.caisse.ouverte = !!o.caisse.ouverte; this.caisse.i = o.caisse.i || 0; this.caisse.tickets = o.caisse.tickets || []; }
    this.merci = !!o.merci;
  }
}
