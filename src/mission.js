// Mission de démo : « La tournée de Noël ».
// 1. Le bureau (téléphone) liste les tâches du jour : 3 rappels (appel, appel, message préparé), un règlement en retard
//    (l'Épicerie du Bourg) et un prospect (l'Auberge du Moulin, aux Grands Champs), qu'on ajoute soi-même à la tournée.
// 2. Chaque commande se prépare dans le bureau et part pour signature en ligne ; le client signe sur son téléphone.
//    Dans le bureau, la quantité part de zéro : on saisit celle que le client a donnée au téléphone. Signée, ses cartons
//    attendent sur la palette du chai.
// 3. La journée se joue dans l'ordre qu'on veut : au chai, on charge ce qui est signé (tout, ou ce qui l'est déjà) ; dans
//    l'écran Tournée du bureau, on lance la tournée de tout ce qui est prêt, ou l'on va à un seul arrêt ; on peut aussi
//    s'arrêter chez un client sans rien lancer. À l'épicerie, on descend chercher le chèque ; à chaque livraison, le client
//    signe le bon de livraison sur notre téléphone ; chez le prospect, on lui fait goûter le rouge, la visite est notée
//    dans le bureau, qui dira quand le rappeler.
// 4. Tout est fait dehors : retour au bureau du chai, on dépose le chèque sur le bureau, puis sur le portable, dans
//    Vitisoft (pas d'appli téléphone), on saisit le règlement, on facture les 3 commandes (Factur-X, transmises par
//    Pennylane) et on calcule la DRM.
import { DIALOGUES, OBJECTIFS, CLIENTS, RETARD, PROSPECT, MESSAGE_MATIN as MESSAGE } from './textes.js';
import { son } from './audio.js';
import { ecart } from './reseau.js';

const RETARD_ETOILE = 40; // secondes avant chaque nouvelle étoile de retard
const ORDRE = ['epicerie', 'cave', 'bar', 'treille', 'auberge']; // ordre des arrêts de la tournée
const LIVRAISONS = ['cave', 'bar', 'treille'];        // les commandes, dans l'ordre de la tournée
const FAITS = { cheque: ['recupere', 'depose', 'saisi'], prospect: ['a_rappeler'], client: ['livree', 'facturee', 'transmise'] };

export class Mission {
  constructor(jeu) {
    this.j = jeu; this.etape = 'avant'; this.t = 0; this.retard = 0; this.etoiles = 0; this.tRappel = 0;
    this.clients = CLIENTS.map(c => ({ ...c, cartons: 0, statut: 'a_traiter', tSign: 0, tRep: 0, veh: null }));
    // le règlement en retard de l'épicerie : a_planifier (tâche du jour), attendu (à aller chercher), recupere (le chèque),
    // depose (au bureau), saisi (dans Vitisoft)
    this.retardataire = { ...RETARD, statut: 'a_planifier' };
    // le prospect : a_planifier (tâche du jour), attendu (à aller voir), visite (sur place), deguste, a_rappeler
    this.prospect = { ...PROSPECT, statut: 'a_planifier' }; this.tDeg = 0;
    this.attenteCheque = false; this.drm = 'a_faire'; // a_faire, calcul, faite
    this.appelEnCours = null; this.attenteBL = null; this.message = MESSAGE;
    this.tour = [];     // la tournée lancée : les arrêts qui restent, dans l'ordre (le premier est le prochain)
    this.places = {};   // genre du véhicule -> les 18 cartons qu'il peut porter (colonne i / 3) -> id du client
    this.palette = [];  // les piles de la palette du chai (main.js) : { client, n, groupe }, montrées une fois signées
    this.deposes = [];  // les piles posées devant les clients
    this.blPret = false; // les cartons sont posés : le client peut signer le bon de livraison
    this.itin = null; this.tItin = 0; // l'itinéraire du moment (route), et quand vérifier qu'on ne s'en est pas écarté
  }
  client(id) { for (const c of this.clients) if (c.id === id) return c; return null; }
  compter(statut) { let n = 0; for (const c of this.clients) if (c.statut === statut) n++; return n; }
  get ordre() { return LIVRAISONS.map(id => this.client(id)); }
  // les arrêts de la journée, dans l'ordre de la tournée : le chèque, les livraisons, le prospect
  get arrets() { return ORDRE.map(id => this.arretDe(id)); }
  arretDe(id) { return id === RETARD.id ? this.retardataire : id === PROSPECT.id ? this.prospect : this.client(id); }
  genre(a) { return a === this.retardataire ? 'cheque' : a === this.prospect ? 'prospect' : 'client'; }
  // un arrêt est prêt quand on peut y aller : le passage à l'épicerie ou chez le prospect ajouté, la commande chargée
  pret(a) { return a.statut === (this.genre(a) === 'client' ? 'chargee' : 'attendu'); }
  fait(a) { return FAITS[this.genre(a)].includes(a.statut); }
  get arretsPrets() { return ORDRE.filter(id => this.pret(this.arretDe(id))); }
  get arretCourant() { return this.etape === 'livraisons' ? this.tour[0] || null : null; }
  // les commandes signées qui attendent sur la palette du chai
  get aCharger() { return this.clients.filter(c => c.statut === 'signee'); }
  get dehorsFini() { return ORDRE.every(id => this.fait(this.arretDe(id))); }
  get nbEnvoyees() { return this.clients.filter(c => ['envoyee', 'signee'].includes(c.statut)).length; }
  // tâches du jour faites dans le bureau : commandes envoyées (ou plus loin), passages à l'épicerie et au prospect ajoutés
  get nbTaches() {
    return this.clients.filter(c => !['a_traiter', 'proposee', 'commande'].includes(c.statut)).length
      + (this.retardataire.statut === 'a_planifier' ? 0 : 1) + (this.prospect.statut === 'a_planifier' ? 0 : 1);
  }
  get ht() { return this.clients.reduce((s, c) => s + c.cartons * 6 * c.pu, 0); }
  htClient(c) { return c.cartons * 6 * c.pu; }
  // les piles de la palette du chai : celles de chaque client, 3 cartons au plus (une colonne du véhicule chacune)
  pilesPrevues() {
    const piles = [];
    for (const id of LIVRAISONS) for (let n = this.client(id).demande; n > 0; n -= 3) piles.push({ client: id, n: Math.min(3, n) });
    return piles;
  }
  // les cartons que porte le véhicule v (créés au premier chargement)
  placesDe(v) { return this.places[v.genre] || (this.places[v.genre] = new Array(18).fill(null)); }
  // les colonnes du véhicule chargé qui portent les cartons du client id : [{ c, n }]
  colonnesDe(id) {
    const c = this.client(id), P = c.veh ? this.placesDe(c.veh) : [], cols = [];
    for (let k = 0; k < 6; k++) { let n = 0; for (let l = 0; l < 3; l++) if (P[3 * k + l] === id) n++; if (n) cols.push({ c: k, n }); }
    return cols;
  }

  demarrer() { this.etape = 'debut'; this.t = 0; }
  peutFermer() { return !this.appelEnCours; }
  aller(e) { this.etape = e; this.t = 0; this.itin = null; }
  notifier(msg, vibre = true) { this.message = msg; this.j.tel.notifier('bureau'); son.jouer(vibre ? 'vibre' : 'notif'); }

  get cible() {
    const L = this.j.lieux;
    if (this.etape === 'journee') return this.aCharger.length ? L.chai : null;
    if (this.etape === 'livraisons') { // on y est : plus de balise
      const id = this.tour[0], c = this.arretDe(id);
      return this.attenteBL || this.attenteCheque || (c === this.prospect && c.statut !== 'attendu') ? null : L.arrets[id];
    }
    if (this.etape === 'retour' || this.etape === 'pc') return L.pc;
    return null;
  }
  get nomCible() {
    if (this.etape === 'livraisons') return this.arretDe(this.tour[0]).nom;
    if (this.etape === 'retour' || this.etape === 'pc') return this.retardataire.statut === 'recupere' ? 'Bureau du chai' : 'PC du chai';
    return 'Chai';
  }
  // l'itinéraire jusqu'à la balise (lieux.reseau, reseau.js) : calculé au départ, refait si l'on s'en écarte ; dans la
  // cour du domaine, vers le chai, le chemin d'origine (par le nord du tracteur garé)
  get route() {
    const c = this.cible;
    if (!c) return null;
    const j = this.j, o = j.auVolant ? j.tr.pos : j.joueur.pos;
    if (!this.itin || this.itin.c !== c) {
      const L = j.lieux, cour = o.x < -86 && o.z < -30 && o.z > -62;
      this.itin = { c, pts: c === L.chai && cour ? L.versChai : j.reseau.itineraire(o, c) };
    }
    return this.itin.pts;
  }
  get couleur() { return '#ff7a2f'; }
  get pcDispo() { return this.etape === 'retour' || this.etape === 'pc'; }

  // l'objectif affiché, selon où en est la journée (sauf pendant la saisie d'une commande : il donne la quantité)
  majObjectif() {
    const j = this.j, hud = j.hud;
    if (this.etape === 'livraisons') { this.objectifArret(); return; }
    if (this.etape !== 'journee') return;
    if (j.tel.ouvert && j.tel.app === 'commande' && this.compter('commande')) return;
    if (this.aCharger.length) hud.objectif(OBJECTIFS.chai);
    else if (this.arretsPrets.length) hud.objectif(OBJECTIFS.tournee);
    else if (this.nbTaches < 5) hud.objectif(OBJECTIFS.rappels(this.nbTaches));
    else hud.objectif(OBJECTIFS.signatures);
  }

  update(dt) {
    const j = this.j, hud = j.hud;
    this.t += dt;
    this.tRappel = Math.max(0, this.tRappel - dt);
    // les clients répondent et signent pendant qu'on joue ; signée, la commande attend sur la palette du chai
    for (const c of this.clients) {
      if (c.statut === 'proposee' && (c.tRep -= dt) <= 0) {
        c.statut = 'commande';
        this.notifier('Bar Le Cep a répondu : 2 cartons de crémant.');
        hud.dire(DIALOGUES.reponseBar);
      }
      if (c.statut === 'envoyee' && (c.tSign -= dt) <= 0) {
        c.statut = 'signee';
        for (const p of this.palette) if (p.client === c.id) p.groupe.visible = true;
        this.notifier(`${c.nom} a signé la commande ${c.numero}.`);
        hud.dire(DIALOGUES.signee(c));
        if (j.tel.ouvert) j.tel.afficher();
        this.majObjectif();
      }
    }
    // l'itinéraire : refait si l'on s'en est écarté de plus de 25 m
    if (this.itin && (this.tItin -= dt) <= 0) {
      this.tItin = 0.5;
      const o = j.auVolant ? j.tr.pos : j.joueur.pos;
      if (ecart(this.itin.pts, o) > 25) this.itin = null;
    }
    switch (this.etape) {
      case 'debut':
        if (this.t > 0.8 && !this.dit) { this.dit = true; hud.dire(DIALOGUES.intro); }
        if (this.t > 3.6) { this.aller('journee'); this.notifier(MESSAGE); hud.objectif(OBJECTIFS.tel); }
        break;
      case 'journee': case 'livraisons':
        this.journee(dt);
        break;
      case 'retour': case 'pc': {
        if (j.auVolant && j.distance(j.lieux.pc) < 6 && Math.abs(j.tr.v) < 2 && this.tRappel <= 0) { hud.dire(DIALOGUES.pcTracteur); this.tRappel = 8; }
        break;
      }
      case 'fin':
        if (this.etoiles > 0 && this.t > 1.5 + this.dec) { this.etoiles--; this.dec += 0.3; hud.etoiles(this.etoiles); }
        if (this.t > 7.5) { this.aller('libre'); j.finDemo(); }
        break;
    }
    // le bureau a quelque chose à proposer : une commande à préparer, un passage à ajouter, une tournée à lancer
    if ((this.etape === 'journee' || this.etape === 'livraisons') && !j.tel.ouvert && !j.tel.notif && (this.compter('commande') > 0
      || (this.compter('a_traiter') === 0 && (this.retardataire.statut === 'a_planifier' || this.prospect.statut === 'a_planifier'))
      || (this.etape === 'journee' && this.arretsPrets.length && !this.aCharger.length && !j.gestes.actif))) j.tel.notifier('bureau');
    // étoiles de retard : des clients ont signé et attendent leurs cartons
    if (['journee', 'livraisons', 'chargement'].includes(this.etape) && this.clients.some(c => c.statut === 'signee' || c.statut === 'chargee') && !j.tel.ouvert && !j.gestes.actif) {
      this.retard += dt;
      if (this.retard > RETARD_ETOILE && this.etoiles < 5) { this.retard = 0; this.etoiles++; hud.etoiles(this.etoiles); son.jouer('etoile'); }
    }
  }

  // La journée, dehors : au chai, on charge ce qui est signé ; chez un client prêt (le prochain arrêt de la tournée
  // d'abord, sinon n'importe lequel), on livre, on récupère le chèque, on fait goûter.
  journee(dt) {
    const j = this.j, hud = j.hud, L = j.lieux;
    const p = this.prospect;
    if (p.statut === 'deguste' && (this.tDeg += dt) > 2.2 && !this.degDit) { this.degDit = true; hud.dire(DIALOGUES.degustation, () => this.noterProspect()); }
    if (this.attenteBL || this.attenteCheque || j.gestes.actif || p.statut === 'visite' || p.statut === 'deguste') return;
    const lent = j.auVolant && Math.abs(j.tr.v) < 2.5;
    // au chai : arrêté devant, ou engagé vers la grande porte (même lancé) ; on charge tout ce qui est signé
    {
      const d = j.distance(L.chai), devant = j.devantChai;
      if (d <= 5.5 || devant) {
        const piles = this.palette.filter(x => x.groupe.visible && this.client(x.client).statut === 'signee');
        if (j.auVolant && piles.length && (lent || devant)) { this.charger(piles); return; }
        if (j.auVolant && !piles.length && lent && this.compter('envoyee') && this.tRappel <= 0) { hud.dire(DIALOGUES.attenteSignature(this.compter('envoyee'))); this.tRappel = 8; }
        if (!j.auVolant && piles.length && d < 4 && this.tRappel <= 0) { hud.dire(DIALOGUES.aPied); this.tRappel = 8; }
      }
    }
    // chez un client prêt
    const ids = this.etape === 'livraisons' ? [this.tour[0], ...this.arretsPrets.filter(id => id !== this.tour[0])] : this.arretsPrets;
    for (const id of ids) {
      const c = this.arretDe(id);
      if (!this.pret(c)) continue;
      const d = j.distance(L.arrets[id]), f = L.figurants[id], dPied = j.auVolant ? 1e9 : j.distance(f);
      if (c === p) {
        // le prospect : on arrive (en véhicule ou à pied), il nous accueille ; on lui sert un verre (main.js), il goûte
        if ((lent && d < 7) || (!j.auVolant && (d < 5 || dPied < 4))) {
          c.statut = 'visite'; if (j.auVolant) j.tr.v *= 0.3;
          hud.vider(); hud.dire(DIALOGUES.arrivee[id]);
          hud.objectif(OBJECTIFS.deguster(c.du));
          j.prospectServable(true);
          return;
        }
      } else if (c === this.retardataire) {
        // le chèque : arrêté devant, on descend le chercher au comptoir ; à pied, on va au comptoir
        if ((lent && d < 6.5) || (!j.auVolant && (d < 4.5 || dPied < 3.5))) {
          this.attenteCheque = true; if (j.auVolant) j.tr.v *= 0.3;
          hud.vider();
          j.chercherCheque(f, DIALOGUES.arrivee[id], () => this.recupererCheque());
          return;
        }
      } else {
        // une livraison : avec le véhicule où sont ses cartons ; on descend, on les porte jusqu'au client (gestes.js),
        // puis il signe le bon de livraison
        const bon = j.auVolant && j.tr === c.veh.p;
        if (lent && d < 6.5 && !bon && this.tRappel <= 0) { hud.dire(DIALOGUES.sansCartons(c.veh.genre)); this.tRappel = 7; }
        else if (!j.auVolant && d < 5 && this.tRappel <= 0) { hud.dire(DIALOGUES.sansCartons(c.veh.genre)); this.tRappel = 7; }
        if (bon && lent && d < 6.5) {
          this.attenteBL = c.id; this.blPret = false;
          hud.vider();
          hud.dire(DIALOGUES.arrivee[id]);
          j.decharger(f, this.colonnesDe(c.id), x => this.deposes.push(x), () => {
            this.blPret = true;
            hud.objectif(`Faites signer le bon de livraison à ${c.du}`);
            if (this.attenteBL === c.id && !j.tel.ouvert) j.tel.ouvrir('bl');
          });
          return;
        }
      }
    }
  }
  // Au chai : on descend, on porte les piles signées de la palette dans le véhicule, on remonte (main.js, gestes.js)
  charger(piles) {
    const j = this.j, hud = j.hud, V = j.veh, avant = this.etape;
    this.aller('chargement');
    const P = this.placesDe(V), clients = new Set(piles.map(x => x.client));
    j.charger(piles, (c, x) => {
      for (let l = 0; l < x.n; l++) P[3 * c + l] = x.client;
      V.p.charge += x.n;
    }, () => {
      for (const id of clients) { const c = this.client(id); c.statut = 'chargee'; c.veh = V; }
      this.aller(avant === 'livraisons' && this.tour.length ? 'livraisons' : 'journee');
      const n = clients.size;
      this.notifier(`${n} commande${n > 1 ? 's' : ''} chargée${n > 1 ? 's' : ''} : ${this.arretsPrets.length} arrêt${this.arretsPrets.length > 1 ? 's' : ''} prêt${this.arretsPrets.length > 1 ? 's' : ''}.`, false);
      hud.dire(this.aCharger.length || this.clients.some(c => ['a_traiter', 'proposee', 'commande', 'envoyee'].includes(c.statut)) ? DIALOGUES.chargeEnPartie(n) : DIALOGUES.charge);
      this.majObjectif();
    });
  }

  /* ------------------------------------------------------------ actions venues du téléphone */
  rappel(id) {
    const c = this.client(id), j = this.j;
    if (c.statut !== 'a_traiter' || this.appelEnCours) return;
    if (this.etape === 'debut') { this.aller('journee'); j.hud.objectif(OBJECTIFS.tel); }
    if (c.mode === 'message') { j.tel.client = id; j.tel.app = 'message'; j.tel.afficher(); return; }
    this.appelEnCours = id;
    j.tel.notifier(null);
    j.tel.client = id; j.tel.tAppel = 0; j.tel.app = 'appel'; j.tel.afficher();
    j.hud.dire(DIALOGUES.appel[id], () => {
      this.appelEnCours = null;
      c.statut = 'commande';
      j.tel.client = id; j.tel.app = 'commande'; j.tel.afficher();
      this.saisir(id);
    });
  }
  envoyerMessage(id) {
    const c = this.client(id);
    if (c.statut !== 'a_traiter') return;
    c.statut = 'proposee'; c.tRep = 5;
    son.jouer('envoi');
  }
  // la quantité saisie doit être celle que le client a demandée (sinon le téléphone le rappelle)
  quantite(id, delta) { const c = this.client(id); if (c.statut === 'commande') c.cartons = Math.max(0, Math.min(12, c.cartons + delta)); }
  envoyerCommande(id) {
    const c = this.client(id);
    if (c.statut !== 'commande') return true;
    if (c.cartons !== c.demande) return false;
    c.statut = 'envoyee'; c.tSign = 8 + this.nbEnvoyees * 3;
    son.jouer('envoi');
    this.j.hud.objectif(OBJECTIFS.rappels(this.nbTaches));
    return true;
  }
  // tâche du jour : le règlement en retard ; on ajoute le passage à la tournée (on y récupérera le chèque)
  planifierCheque() {
    const r = this.retardataire, j = this.j;
    if (r.statut !== 'a_planifier') return;
    r.statut = 'attendu';
    son.jouer('notif');
    j.hud.dire(DIALOGUES.chequePlanifie);
    this.majObjectif();
  }
  // tâche du jour : le prospect ; on ajoute la visite à la tournée
  planifierProspect() {
    const p = this.prospect, j = this.j;
    if (p.statut !== 'a_planifier') return;
    p.statut = 'attendu';
    son.jouer('notif');
    j.hud.dire(DIALOGUES.prospectPlanifie);
    this.majObjectif();
  }
  // on vient de lui servir un verre (main.js) : il goûte, il dit ce qu'il en pense (update)
  degustee() {
    const p = this.prospect;
    if (p.statut !== 'visite') return;
    p.statut = 'deguste'; this.tDeg = 0; this.degDit = false;
    this.j.prospectServable(false);
  }
  // la visite est notée dans le fil du client, le bureau dira quand le rappeler
  noterProspect() {
    const p = this.prospect, j = this.j;
    if (p.statut !== 'deguste') return;
    p.statut = 'a_rappeler';
    this.notifier(`${p.nom} : visite notée, à rappeler.`, false);
    son.jouer('succes');
    j.hud.banniere('Prospect rencontré', 'Visite notée dans le bureau, à rappeler', 3.2);
    this.arretFait(PROSPECT.id);
  }
  // le formulaire d'une commande s'ouvre : l'objectif donne la quantité dite au téléphone
  saisir(id) { const c = this.client(id); if (c && c.statut === 'commande') this.j.hud.objectif(OBJECTIFS.saisie(c)); }
  // La tournée : tous les arrêts prêts, dans l'ordre (une tournée complète, ou avec ce qui est déjà signé et chargé) ;
  // ou un seul arrêt (id). Lancée pendant une autre, elle la remplace.
  demarrerTournee(id) {
    if (!['journee', 'livraisons'].includes(this.etape) || this.attenteBL || this.attenteCheque) return;
    const ids = id ? [id].filter(x => this.pret(this.arretDe(x))) : this.arretsPrets;
    if (!ids.length) return;
    const j = this.j;
    this.tour = ids; this.aller('livraisons');
    j.tel.notifier(null); j.tel.fermer();
    j.hud.dire(id ? DIALOGUES.versArret(this.arretDe(id).nom) : DIALOGUES.tournee);
    this.objectifArret();
  }
  objectifArret() {
    const c = this.arretDe(this.tour[0]);
    this.j.hud.objectif(c === this.retardataire ? OBJECTIFS.cheque(c.du) : c === this.prospect ? OBJECTIFS.prospect(c.du) : OBJECTIFS.livrer(c.du));
  }
  // un arrêt est fait (pendant une tournée ou non) : on passe au suivant ; la tournée finie, la suite de la journée ;
  // tout est fait dehors, retour au bureau du chai
  arretFait(id) {
    const j = this.j, i = this.tour.indexOf(id);
    if (i >= 0) this.tour.splice(i, 1);
    this.itin = null;
    if (this.dehorsFini) {
      this.tour = [];
      this.aller('retour'); for (const v of j.vehicules) v.p.charge = 0;
      j.hud.dire(DIALOGUES.retour); j.hud.objectif(OBJECTIFS.retour);
      return;
    }
    if (this.etape === 'livraisons' && !this.tour.length) {
      this.aller('journee');
      j.hud.dire(DIALOGUES.tourneeFinie);
    }
    this.majObjectif();
  }
  recupererCheque() {
    const r = this.retardataire, j = this.j;
    this.attenteCheque = false;
    if (r.statut !== 'attendu') return;
    r.statut = 'recupere';
    son.jouer('succes');
    j.hud.banniere('Chèque récupéré', `${r.ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € · facture ${r.facture}`, 3.2);
    this.arretFait(RETARD.id);
  }
  livrer() {
    const id = this.attenteBL;
    if (!id) return;
    const j = this.j, c = this.client(id);
    if (!this.blPret) return;
    c.statut = 'livree'; this.attenteBL = null; this.blPret = false;
    // on décharge les cartons de ce client
    const P = this.placesDe(c.veh);
    for (let i = 0; i < P.length; i++) if (P[i] === id) { c.veh.m.cartons[i].visible = false; P[i] = null; }
    c.veh.p.charge = Math.max(0, c.veh.p.charge - c.cartons);
    son.jouer('carton');
    j.hud.dire(DIALOGUES.livre(c));
    this.arretFait(id);
    j.remonter(c.veh); // on retourne au volant
  }

  /* ------------------------------------------------------------ actions du portable (Vitisoft) */
  // au bureau du chai : d'abord poser le chèque, ensuite s'asseoir au portable
  get chequeADeposer() { return this.pcDispo && this.retardataire.statut === 'recupere'; }
  deposerCheque() {
    if (!this.chequeADeposer) return;
    this.retardataire.statut = 'depose';
    son.jouer('carton');
    this.j.hud.dire(DIALOGUES.chequeDepose); this.j.hud.objectif(OBJECTIFS.pcOuvrir);
  }
  get tachesFaites() { return (this.retardataire.statut === 'saisi' ? 1 : 0) + (this.toutTransmis ? 1 : 0) + (this.drm === 'faite' ? 1 : 0); }
  majObjectifPC() { if (this.etape === 'pc') this.j.hud.objectif(OBJECTIFS.pc(this.tachesFaites)); }
  ouvrirPC() {
    if (!this.pcDispo || this.chequeADeposer) return false;
    if (this.etape === 'retour') this.aller('pc');
    this.majObjectifPC();
    return true;
  }
  saisirReglement() {
    const r = this.retardataire;
    if (r.statut !== 'depose') return;
    r.statut = 'saisi'; son.jouer('notif');
    this.majObjectifPC();
  }
  calculerDRM() { if (this.drm === 'a_faire') { this.drm = 'calcul'; son.jouer('envoi'); } }
  drmCalculee() { if (this.drm === 'calcul') { this.drm = 'faite'; son.jouer('envoye'); this.majObjectifPC(); } }
  facturer(id) { const c = this.client(id); if (c.statut === 'livree') { c.statut = 'facturee'; son.jouer('notif'); } }
  transmettre(id) {
    const c = this.client(id), j = this.j;
    if (c.statut !== 'facturee') return;
    c.statut = 'transmise';
    j.ventes += this.htClient(c); j.hud.argent(j.ventes);
    son.jouer(this.clients.every(x => x.statut === 'transmise') ? 'succes' : 'envoye');
    this.majObjectifPC();
  }
  get toutTransmis() { return this.clients.every(c => c.statut === 'transmise'); }
  get toutFait() { return this.tachesFaites === 3; }
  fermerPC() {
    if (this.etape !== 'pc' || !this.toutFait) return;
    const j = this.j;
    this.aller('fin'); this.dec = 0;
    j.hud.banniere('C\'est réglé', `3 commandes livrées et facturées, 1 chèque saisi, 1 prospect à rappeler, la DRM calculée. +${this.ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`, 4.5);
    j.hud.objectif(OBJECTIFS.libre);
    setTimeout(() => j.hud.dire(DIALOGUES.merci), 900);
  }
}
