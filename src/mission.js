// Mission de démo : « La tournée de Noël ».
// 1. Le bureau (téléphone) liste les tâches du jour : 3 rappels (appel, appel, message préparé), un règlement en retard
//    (l'Épicerie du Bourg) et un prospect (l'Auberge du Moulin, aux Grands Champs), qu'on ajoute soi-même à la tournée.
// 2. Chaque commande se prépare dans le bureau et part pour signature en ligne ; le client signe sur son téléphone.
//    Dans le bureau, la quantité part de zéro : on saisit celle que le client a donnée au téléphone. Signée, ses cartons
//    attendent sur la palette du chai.
// 3. La journée se joue dans l'ordre qu'on veut : au chai, on charge ce qui est signé (tout, ou ce qui l'est déjà) ; dans
//    l'écran Tournée du bureau, on lance la tournée de tout ce qui est prêt, ou l'on va à un seul arrêt ; on peut aussi
//    s'arrêter chez un client sans rien lancer. À l'épicerie, on descend chercher le chèque ; à chaque livraison, le client
//    signe le bon de livraison sur notre téléphone ; chez le prospect, on descend lui faire goûter le rouge, la visite est
//    notée dans le bureau, qui dira quand le rappeler.
// 4. Tout est fait dehors : retour au bureau du chai, on dépose le chèque sur le bureau (on peut le faire plus tôt), puis
//    sur le portable, dans Vitisoft (pas d'appli téléphone), on saisit le règlement, on facture les 3 commandes
//    (Factur-X, transmises par Pennylane) et on calcule la DRM.
// Pour que le joueur finisse toujours : l'objectif affiché est recalculé à chaque image d'après l'état de la journée ; le
// bureau relance (la pastille du téléphone) quand il reste quelque chose à y faire ; arrêté devant un client qui n'est
// pas prêt, on entend ce qui manque et où le faire.
import { DIALOGUES, OBJECTIFS, NOTIFS, BANNIERES, CLIENTS, RETARD, PROSPECT } from './textes.js';
import { son } from './audio.js';
import { ecart } from './reseau.js';

export const COULEUR = '#ff7a2f'; // la balise et l'itinéraire de la mission (main.js, hud.js)
const RETARD_ETOILE = 40; // secondes avant chaque nouvelle étoile de retard
const ORDRE = ['epicerie', 'cave', 'bar', 'treille', 'auberge']; // ordre des arrêts de la tournée
const LIVRAISONS = ['cave', 'bar', 'treille'];        // les commandes, dans l'ordre de la tournée
const FAITS = { cheque: ['recupere', 'depose', 'saisi'], prospect: ['a_rappeler'], client: ['livree', 'facturee', 'transmise'] };
const PAS_COMMANDE = ['a_traiter', 'proposee', 'commande']; // un client qui n'a pas encore de commande envoyée
const RAPPEL = 8;         // secondes au moins entre deux aides dites en route
const REDIRE = 25;        // la même aide, au même endroit : pas avant 25 s
const RELANCE = 8;        // secondes après la fermeture du téléphone avant que le bureau ne relance
const PROSPECT_LOIN = 25; // parti à plus de 25 m du prospect sans lui avoir servi un verre : la visite est à refaire

export class Mission {
  constructor(jeu) {
    this.j = jeu; this.etape = 'avant'; this.t = 0; this.horloge = 0; this.retard = 0; this.etoiles = 0;
    this.clients = CLIENTS.map(c => ({ ...c, cartons: 0, statut: 'a_traiter', tSign: 0, tRep: 0, veh: null }));
    // le règlement en retard de l'épicerie : a_planifier (tâche du jour), attendu (à aller chercher), recupere (le chèque),
    // depose (au bureau), saisi (dans Vitisoft)
    this.retardataire = { ...RETARD, statut: 'a_planifier' };
    // le prospect : a_planifier (tâche du jour), attendu (à aller voir), visite (sur place), deguste, a_rappeler
    this.prospect = { ...PROSPECT, statut: 'a_planifier' }; this.tDeg = 0; this.degDit = false;
    this.vehProspect = null; // le véhicule dont on est descendu chez le prospect (on y remonte après)
    this.attenteCheque = false; this.drm = 'a_faire'; // a_faire, calcul, faite
    this.appelEnCours = null; this.attenteBL = null; this.message = NOTIFS.matin;
    this.tour = [];     // la tournée lancée : les arrêts qui restent, dans l'ordre (le premier est le prochain)
    this.places = {};   // genre du véhicule -> les 18 cartons qu'il peut porter (colonne i / 3) -> id du client
    this.palette = [];  // les piles de la palette du chai (main.js) : { client, n, groupe }, montrées une fois signées
    this.deposes = [];  // les piles posées devant les clients (userData.client : à qui ; ils les rentrent ensuite : clients.js)
    this.blPret = false; // les cartons sont posés : le client peut signer le bon de livraison
    this.itin = null; this.tItin = 0; // l'itinéraire du moment (route), et quand vérifier qu'on ne s'en est pas écarté
    this.objAff = null; // l'objectif affiché
    this.tRappel = 0; this.aideCle = null; this.aideT = -1e9; this.tRelance = 0; // aides et relances
    this.introDite = false; this.dec = 0;
  }
  client(id) { for (const c of this.clients) if (c.id === id) return c; return null; }
  compter(statut) { let n = 0; for (const c of this.clients) if (c.statut === statut) n++; return n; }
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
    return this.clients.filter(c => !PAS_COMMANDE.includes(c.statut)).length
      + (this.retardataire.statut === 'a_planifier' ? 0 : 1) + (this.prospect.statut === 'a_planifier' ? 0 : 1);
  }
  get ht() { return this.clients.reduce((s, c) => s + this.htClient(c), 0); }
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
  // La sauvegarde (sauvegarde.js, main.js) : ce qui fait l'avancement de la tournée, pris à un moment sûr (rien en cours :
  // ni chargement, ni livraison, ni chèque, ni dégustation, ni appel), et sa reprise. Les commandes envoyées ou proposées
  // repartent de leur attente ; à la reprise, on est au domaine (main.js remet ce qui se voit : palette, cartons, clients).
  get stable() {
    return ['journee', 'livraisons', 'retour', 'pc', 'fin', 'dodo'].includes(this.etape) && !this.attenteBL && !this.attenteCheque && !this.appelEnCours
      && !['visite', 'deguste'].includes(this.prospect.statut);
  }
  instantane() {
    return {
      etape: this.etape === 'fin' ? 'dodo' : this.etape, etoiles: this.etoiles, tour: [...this.tour],
      clients: this.clients.map(c => ({ s: c.statut, n: c.cartons, v: c.veh ? c.veh.genre : null })),
      r: this.retardataire.statut, p: this.prospect.statut, drm: this.drm === 'calcul' ? 'a_faire' : this.drm,
      places: Object.fromEntries(Object.entries(this.places).map(([g, P]) => [g, [...P]])),
    };
  }
  reprendre(o) {
    const vs = this.j.vehicules;
    this.clients.forEach((c, i) => {
      const x = o.clients[i];
      c.statut = x.s; c.cartons = x.n; c.veh = x.v ? vs.find(v => v.genre === x.v) || null : null;
      if (c.statut === 'proposee') c.tRep = 5;
      if (c.statut === 'envoyee') c.tSign = 8;
      if (c.statut === 'chargee' && !c.veh) c.statut = 'signee'; // (ne devrait pas arriver) : la commande attend sur la palette
    });
    this.retardataire.statut = o.r; this.prospect.statut = o.p; this.drm = o.drm; this.etoiles = o.etoiles;
    this.places = {}; for (const g in o.places) this.places[g] = [...o.places[g]];
    this.tour = o.tour.filter(id => this.pret(this.arretDe(id)));
    this.introDite = true;
    this.aller(o.etape === 'livraisons' && !this.tour.length ? 'journee' : o.etape);
  }
  peutFermer() { return !this.appelEnCours; }
  aller(e) { this.etape = e; this.t = 0; this.itin = null; }
  // une nouvelle du bureau : la pastille du téléphone, son aperçu sur l'écran d'accueil ; le portable se met à jour
  notifier(msg, vibre = true) {
    this.message = msg; this.j.tel.notifier('bureau'); son.jouer(vibre ? 'vibre' : 'notif');
    if (this.j.pc.ouvert) this.j.pc.afficher();
  }
  // une aide dite en route (sous-titre) : pas trop souvent, et la même pas deux fois de suite au même endroit
  aider(lignes, cle) {
    if (!lignes || this.tRappel > 0 || (cle === this.aideCle && this.horloge - this.aideT < REDIRE)) return;
    this.j.hud.dire(lignes); this.tRappel = RAPPEL; this.aideCle = cle; this.aideT = this.horloge;
  }

  // la balise : le prochain arrêt de la tournée, le chai s'il y a quelque chose à charger, le bureau du chai au retour
  get cible() {
    const L = this.j.lieux, e = this.etape, p = this.prospect;
    if (e === 'dodo') return this.j.finVue ? null : L.maison;
    if (e === 'retour' || e === 'pc') return L.pc;
    if (e !== 'journee' && e !== 'livraisons') return null;
    // on y est (bon de livraison, chèque, prospect qui attend son verre) : plus de balise
    if (this.attenteBL || this.attenteCheque || p.statut === 'visite' || p.statut === 'deguste') return null;
    if (e === 'livraisons' && this.tour.length) return L.arrets[this.tour[0]];
    return this.aCharger.length ? L.chai : null;
  }
  get nomCible() {
    if (this.etape === 'dodo') return 'Maison';
    if (this.etape === 'livraisons' && this.tour.length) return this.arretDe(this.tour[0]).nom;
    return this.etape === 'retour' || this.etape === 'pc' ? 'Bureau du chai' : 'Chai';
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
  get pcDispo() { return this.etape === 'retour' || this.etape === 'pc'; }

  // L'objectif affiché, d'après où en est la journée : recalculé à chaque image, écrit seulement quand il change (il ne
  // peut pas rester en retard sur ce qui s'est passé)
  get objectif() {
    const j = this.j, e = this.etape, p = this.prospect, r = this.retardataire;
    if (e === 'avant' || e === 'debut') return null;
    if (e === 'dodo') return OBJECTIFS.dodo;
    if (e === 'fin' || e === 'libre') return OBJECTIFS.libre;
    if (e === 'retour') return r.statut === 'recupere' ? OBJECTIFS.retour : j.dedans === 'bureau' ? OBJECTIFS.pcOuvrir : OBJECTIFS.retourPC;
    if (e === 'pc') return this.toutFait ? OBJECTIFS.pcFini : OBJECTIFS.pc(this.tachesFaites);
    if (e === 'chargement') return OBJECTIFS.chai;
    if (this.attenteBL) { const c = this.client(this.attenteBL); return this.blPret ? OBJECTIFS.bl(c.du) : OBJECTIFS.livrer(c.du); }
    if (this.attenteCheque) return OBJECTIFS.cheque(r.du);
    if (p.statut === 'visite' || p.statut === 'deguste') return OBJECTIFS.deguster(p.du);
    // pendant la saisie d'une commande (téléphone, ou le bureau sur le portable) : la quantité dite au téléphone
    const tel = j.tel, vu = tel.ouvert || (j.pc.ouvert && j.pc.fenetre === 'bureau'), c = vu && tel.app === 'commande' && this.client(tel.client);
    if (c && c.statut === 'commande') return OBJECTIFS.saisie(c);
    if (e === 'livraisons' && this.tour.length) {
      const a = this.arretDe(this.tour[0]), g = this.genre(a);
      return g === 'cheque' ? OBJECTIFS.cheque(a.du) : g === 'prospect' ? OBJECTIFS.prospect(a.du) : OBJECTIFS.livrer(a.du);
    }
    if (this.aCharger.length) return OBJECTIFS.chai;
    if (this.arretsPrets.length) return OBJECTIFS.tournee;
    const n = this.nbTaches;
    if (n < 5) return n === 0 && this.compter('a_traiter') === this.clients.length ? OBJECTIFS.tel : OBJECTIFS.rappels(n);
    return OBJECTIFS.signatures;
  }

  update(dt) {
    const j = this.j, hud = j.hud;
    this.t += dt; this.horloge += dt;
    this.tRappel = Math.max(0, this.tRappel - dt);
    // les clients répondent et signent pendant qu'on joue ; signée, la commande attend sur la palette du chai
    for (const c of this.clients) {
      if (c.statut === 'proposee' && (c.tRep -= dt) <= 0) {
        c.statut = 'commande';
        this.notifier(NOTIFS.reponse(c));
        hud.dire(DIALOGUES.reponseBar);
      }
      if (c.statut === 'envoyee' && (c.tSign -= dt) <= 0) {
        c.statut = 'signee';
        for (const p of this.palette) if (p.client === c.id) p.groupe.visible = true;
        this.notifier(NOTIFS.signee(c));
        hud.dire(DIALOGUES.signee(c));
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
        if (this.t > 0.8 && !this.introDite) { this.introDite = true; hud.dire(DIALOGUES.intro); }
        if (this.t > 3.6) { this.aller('journee'); this.notifier(NOTIFS.matin); }
        break;
      case 'journee': case 'livraisons':
        this.journee(dt);
        break;
      case 'retour': case 'pc':
        if (j.auVolant && j.distance(j.lieux.pc) < 6 && Math.abs(j.tr.v) < 2) this.aider(DIALOGUES.pcTracteur, 'pc');
        break;
      case 'fin':
        if (this.etoiles > 0 && this.t > 1.5 + this.dec) { this.etoiles--; this.dec += 0.3; hud.etoiles(this.etoiles); }
        if (this.t > 7.5) { this.aller('dodo'); j.finDemo(); } // la carte de fin ; puis rentrer dormir (la mission 2 au réveil)
        break;
    }
    this.relancer(dt);
    // étoiles de retard : des clients ont signé et attendent leurs cartons
    if (['journee', 'livraisons', 'chargement'].includes(this.etape) && this.clients.some(c => c.statut === 'signee' || c.statut === 'chargee') && !j.tel.ouvert && !j.gestes.actif) {
      this.retard += dt;
      if (this.retard > RETARD_ETOILE && this.etoiles < 5) { this.retard = 0; this.etoiles++; hud.etoiles(this.etoiles); son.jouer('etoile'); }
    }
    const o = this.objectif;
    if (o && o !== this.objAff) { this.objAff = o; hud.objectif(o); }
  }

  // Le bureau relance (la pastille du téléphone et son aperçu) un moment après qu'on l'a refermé, tant qu'il reste quelque
  // chose à y faire : une commande à préparer, des tâches du jour, une tournée à lancer
  relancer(dt) {
    const j = this.j, tel = j.tel;
    if (tel.ouvert || tel.notif || j.pc.ouvert || j.gestes.actif || !['journee', 'livraisons'].includes(this.etape)) { this.tRelance = 0; return; }
    if ((this.tRelance += dt) < RELANCE) return;
    this.tRelance = 0;
    const c = this.clients.find(x => x.statut === 'commande');
    const taches = this.compter('a_traiter') + (this.retardataire.statut === 'a_planifier' ? 1 : 0) + (this.prospect.statut === 'a_planifier' ? 1 : 0);
    const prets = this.etape === 'journee' && !this.aCharger.length ? this.arretsPrets.length : 0;
    const msg = c ? NOTIFS.commande(c) : taches ? NOTIFS.taches(taches) : prets ? NOTIFS.prets(prets) : null;
    if (msg) { this.message = msg; tel.notifier('bureau'); }
  }

  // La journée, dehors : au chai, on charge ce qui est signé ; chez un client prêt (le prochain arrêt de la tournée
  // d'abord), on livre, on récupère le chèque, on fait goûter ; arrêté chez un client qui n'est pas prêt, on dit ce qui
  // manque.
  journee(dt) {
    const j = this.j, hud = j.hud, L = j.lieux, p = this.prospect;
    if (p.statut === 'deguste' && (this.tDeg += dt) > 2.2 && !this.degDit) { this.degDit = true; hud.dire(DIALOGUES.degustation, () => this.noterProspect()); }
    if (this.attenteBL || this.attenteCheque || j.gestes.actif || p.statut === 'deguste') return;
    // chez le prospect, on lui sert un verre (main.js) ; parti sans l'avoir fait, la visite est à refaire
    if (p.statut === 'visite') {
      if (j.distance(L.figurants.auberge) > PROSPECT_LOIN) { p.statut = 'attendu'; this.vehProspect = null; j.prospectServable(false); }
      return;
    }
    // téléphone ou portable ouvert, appel en cours : rien ne commence (on y lit, on y signe, on y parle)
    if (j.tel.ouvert || j.pc.ouvert || this.appelEnCours) return;
    const v = j.auVolant ? Math.abs(j.tr.v) : 0, lent = j.auVolant && v < 2.5, arrete = !j.auVolant || v < 0.6;
    // au chai : arrêté devant, ou engagé vers la grande porte (même lancé) ; on charge tout ce qui est signé
    {
      const d = j.distance(L.chai), devant = j.devantChai;
      if (d <= 5.5 || devant) {
        const piles = this.palette.filter(x => x.groupe.visible && this.client(x.client).statut === 'signee');
        if (j.auVolant && piles.length && (lent || devant)) {
          if (j.veh.m.cartons) { this.charger(piles); return; }
          this.aider(DIALOGUES.sansPlateau(j.veh.genre), 'chai'); // une voiture empruntée, l'enjambeur : pas de plateau
        }
        if (j.auVolant && !piles.length && lent) {
          const n = this.compter('envoyee');
          if (n) this.aider(DIALOGUES.attenteSignature(n), 'chai');
          else if (this.clients.some(c => PAS_COMMANDE.includes(c.statut))) this.aider(DIALOGUES.rienACharger, 'chai');
        }
        if (!j.auVolant && piles.length && (d < 4 || devant)) this.aider(DIALOGUES.aPied, 'chai');
      }
    }
    // chez un client
    const ids = this.etape === 'livraisons' && this.tour.length ? [this.tour[0], ...ORDRE.filter(id => id !== this.tour[0])] : ORDRE;
    for (const id of ids) {
      const c = this.arretDe(id), g = this.genre(c);
      if (this.fait(c)) continue;
      // d : à l'arrêt (où le véhicule se gare) ; dF : au client, devant chez lui
      const f = L.figurants[id], d = j.distance(L.arrets[id]), dF = j.distance(f);
      if (!this.pret(c)) {
        // arrêté devant un client qui n'est pas prêt : ce qui manque, et où le faire
        if (arrete && (j.auVolant ? d < 6.5 : d < 4.5 || dF < 3.5)) this.aider(this.pasPret(c), id);
        continue;
      }
      if (g === 'prospect') {
        // on arrive (en véhicule ou à pied) : on va le voir, il nous accueille ; on lui sert un verre (main.js), il goûte.
        // En véhicule, aussi arrêté un peu plus loin : le chemin finit contre la maison voisine, à 8 m de l'arrêt
        if ((lent && (d < 7 || dF < 9)) || (!j.auVolant && (d < 5 || dF < 4))) {
          c.statut = 'visite';
          hud.vider();
          this.vehProspect = j.aborder(f, DIALOGUES.arrivee[id]);
          j.prospectServable(true);
          return;
        }
      } else if (g === 'cheque') {
        // le chèque : arrêté devant, on descend le chercher au comptoir ; à pied, on va au comptoir
        if ((lent && d < 6.5) || (!j.auVolant && (d < 4.5 || dF < 3.5))) {
          this.attenteCheque = true;
          hud.vider();
          j.chercherCheque(f, DIALOGUES.arrivee[id], () => this.recupererCheque());
          return;
        }
      } else {
        // une livraison : avec le véhicule où sont ses cartons ; on descend, on les porte jusqu'au client (gestes.js),
        // puis il signe le bon de livraison
        const bon = j.auVolant && j.tr === c.veh.p;
        if (bon && lent && d < 6.5) {
          this.attenteBL = c.id; this.blPret = false;
          hud.vider();
          hud.dire(DIALOGUES.arrivee[id]);
          j.decharger(f, this.colonnesDe(c.id), x => { x.userData.client = c.id; this.deposes.push(x); }, () => {
            this.blPret = true;
            if (this.attenteBL === c.id && !j.tel.ouvert) j.tel.ouvrir('bl');
          });
          return;
        }
        if ((lent && d < 6.5) || (!j.auVolant && d < 5)) this.aider(DIALOGUES.sansCartons(c.veh.genre), id);
      }
    }
  }
  // ce qui manque à un arrêt pour être prêt (aide dite sur place)
  pasPret(c) {
    const g = this.genre(c), P = DIALOGUES.pasPret;
    if (g !== 'client') return g === 'cheque' ? P.cheque(c) : P.prospect(c);
    return c.statut === 'signee' ? P.chai(c) : c.statut === 'envoyee' ? P.signature(c) : P.commande(c);
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
      this.notifier(NOTIFS.chargees(n, this.arretsPrets.length), false);
      // signées pendant le chargement, d'autres attendent déjà sur la palette ; ou d'autres signatures à venir ; ou tout
      hud.dire(this.aCharger.length ? DIALOGUES.chargeReste(n)
        : this.clients.some(c => PAS_COMMANDE.includes(c.statut) || c.statut === 'envoyee') ? DIALOGUES.chargeEnPartie(n) : DIALOGUES.charge);
    });
  }

  /* ------------------------------------------------------------ actions venues du téléphone */
  rappel(id) {
    const c = this.client(id), j = this.j;
    if (c.statut !== 'a_traiter' || this.appelEnCours) return;
    if (this.etape === 'debut') this.aller('journee');
    if (c.mode === 'message') { j.tel.client = id; j.tel.app = 'message'; j.tel.afficher(); return; }
    this.appelEnCours = id;
    j.tel.notifier(null);
    j.tel.client = id; j.tel.tAppel = 0; j.tel.app = 'appel'; j.tel.afficher();
    j.hud.dire(DIALOGUES.appel[id], () => {
      this.appelEnCours = null;
      c.statut = 'commande';
      j.tel.client = id; j.tel.app = 'commande'; j.tel.afficher();
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
    return true;
  }
  // tâches du jour : le règlement en retard (on y récupérera le chèque), le prospect (on lui fera goûter le rouge) ; on
  // ajoute le passage à la tournée
  planifier(a, dialogue) {
    if (a.statut !== 'a_planifier') return;
    a.statut = 'attendu';
    son.jouer('notif');
    this.j.hud.dire(dialogue);
  }
  planifierCheque() { this.planifier(this.retardataire, DIALOGUES.chequePlanifie); }
  planifierProspect() { this.planifier(this.prospect, DIALOGUES.prospectPlanifie); }
  // on vient de lui servir un verre (main.js) : il goûte, il dit ce qu'il en pense (journee)
  degustee() {
    const p = this.prospect;
    if (p.statut !== 'visite') return;
    p.statut = 'deguste'; this.tDeg = 0; this.degDit = false;
    this.j.prospectServable(false);
  }
  // la visite est notée dans le fil du client, le bureau dira quand le rappeler ; on retourne au volant
  noterProspect() {
    const p = this.prospect, j = this.j;
    if (p.statut !== 'deguste') return;
    p.statut = 'a_rappeler';
    this.notifier(NOTIFS.prospectNote(p), false);
    son.jouer('succes');
    j.hud.banniere(...BANNIERES.prospect, 3.2);
    this.arretFait(PROSPECT.id);
    if (this.vehProspect) { j.remonter(this.vehProspect); this.vehProspect = null; }
  }
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
      j.hud.dire(this.chequeADeposer ? DIALOGUES.retour : DIALOGUES.retourPC);
      return;
    }
    if (this.etape === 'livraisons' && !this.tour.length) {
      this.aller('journee');
      j.hud.dire(DIALOGUES.tourneeFinie);
    }
  }
  recupererCheque() {
    const r = this.retardataire;
    this.attenteCheque = false;
    if (r.statut !== 'attendu') return;
    r.statut = 'recupere';
    son.jouer('succes');
    this.j.hud.banniere(...BANNIERES.cheque(r), 3.2);
    this.arretFait(RETARD.id);
  }
  livrer() {
    const id = this.attenteBL;
    if (!id || !this.blPret) return;
    const j = this.j, c = this.client(id);
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

  /* ------------------------------------------------------------ au bureau du chai, et sur le portable (Vitisoft) */
  // le chèque récupéré se dépose sur le bureau (dès qu'on passe au bureau du chai) ; on ne s'assoit au portable qu'après
  get chequeADeposer() { return this.retardataire.statut === 'recupere'; }
  deposerCheque() {
    if (!this.chequeADeposer) return;
    this.retardataire.statut = 'depose';
    son.jouer('carton');
    this.j.hud.dire(DIALOGUES.chequeDepose);
  }
  // assis au portable : au retour de la tournée, c'est la dernière étape. Rend l'onglet à ouvrir : Vitisoft s'il y a
  // quelque chose à y faire, sinon le bureau
  ouvrirPC() {
    if (this.etape === 'retour') this.aller('pc');
    const aFaire = this.pcDispo || this.retardataire.statut === 'depose' || this.clients.some(c => c.statut === 'livree' || c.statut === 'facturee');
    return aFaire ? 'vitisoft' : 'bureau';
  }
  get tachesFaites() { return (this.retardataire.statut === 'saisi' ? 1 : 0) + (this.toutTransmis ? 1 : 0) + (this.drm === 'faite' ? 1 : 0); }
  saisirReglement() {
    const r = this.retardataire;
    if (r.statut !== 'depose') return;
    r.statut = 'saisi'; son.jouer('notif');
  }
  calculerDRM() { if (this.drm === 'a_faire') { this.drm = 'calcul'; son.jouer('envoi'); } }
  drmCalculee() { if (this.drm === 'calcul') { this.drm = 'faite'; son.jouer('envoye'); } }
  facturer(id) { const c = this.client(id); if (c.statut === 'livree') { c.statut = 'facturee'; son.jouer('notif'); } }
  transmettre(id) {
    const c = this.client(id), j = this.j;
    if (c.statut !== 'facturee') return;
    c.statut = 'transmise';
    j.ventes += this.htClient(c); j.hud.argent(j.ventes);
    son.jouer(this.toutTransmis ? 'succes' : 'envoye');
  }
  get toutTransmis() { return this.clients.every(c => c.statut === 'transmise'); }
  get toutFait() { return this.tachesFaites === 3; }
  // on ferme Vitisoft (ou l'on se lève du portable) : tout est fait au retour de la tournée, c'est la fin
  fermerPC() {
    if (this.etape !== 'pc' || !this.toutFait) return;
    const j = this.j;
    j.gagner('tournee'); // la mission 1 est gagnée (sauvegarde.js : on pourra la rejouer)
    this.aller('fin'); this.dec = 0;
    j.hud.banniere(...BANNIERES.fin(this.ht), 4.5);
    setTimeout(() => j.hud.dire(DIALOGUES.merci), 900);
  }
}
