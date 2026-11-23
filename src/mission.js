// Mission de démo : « La tournée de Noël ».
// 1. Le bureau (téléphone) liste 3 rappels : appel, appel, message préparé.
// 2. Chaque commande se prépare dans le bureau et part pour signature en ligne ; le client signe sur son téléphone.
//    Dans le bureau, la quantité part de zéro : on saisit celle que le client a donnée au téléphone.
// 3. Au chai, on charge les commandes signées sur le tracteur.
//    Parmi les tâches du jour, un règlement en retard (l'Épicerie du Bourg) : on ajoute soi-même le passage à la tournée.
// 4. On lance la tournée dans le bureau : d'abord l'Épicerie du Bourg, qui nous remet un chèque ; puis, à chaque
//    livraison, le client signe le bon de livraison sur notre téléphone.
// 5. Retour au bureau du chai : on dépose le chèque sur le bureau, puis sur le portable, dans Vitisoft (pas d'appli téléphone),
//    on saisit le règlement, on facture les 3 commandes (Factur-X, transmises par Pennylane) et on calcule la DRM.
import { DIALOGUES, OBJECTIFS, CLIENTS, RETARD } from './textes.js';
import { son } from './audio.js';

const RETARD_ETOILE = 40; // secondes avant chaque nouvelle étoile de retard
const ATTENTE = ['chai', 'chargement', 'tournee', 'livraisons'];
const ORDRE = ['epicerie', 'cave', 'bar', 'treille']; // ordre des arrêts de la tournée
const LIVRAISONS = ['cave', 'bar', 'treille'];        // les commandes, dans l'ordre de la tournée

export class Mission {
  constructor(jeu) {
    this.j = jeu; this.etape = 'avant'; this.t = 0; this.retard = 0; this.etoiles = 0; this.tRappel = 0;
    this.clients = CLIENTS.map(c => ({ ...c, cartons: 0, statut: 'a_traiter', tSign: 0, tRep: 0 }));
    // le règlement en retard de l'épicerie : a_planifier (tâche du jour), attendu (dans la tournée), recupere (le chèque),
    // depose (au bureau), saisi (dans Vitisoft)
    this.retardataire = { ...RETARD, statut: 'a_planifier' };
    this.attenteCheque = false; this.drm = 'a_faire'; // a_faire, calcul, faite
    this.appelEnCours = null; this.arret = 0; this.attenteBL = null; this.message = '3 rappels et 1 règlement en retard aujourd\'hui.';
    this.cartons = []; // carton i du véhicule chargé (colonne i / 3) -> id du client
    this.palette = []; // les piles de la palette du chai (main.js) : { client, n, groupe }
    this.deposes = []; // les piles posées devant les clients
    this.blPret = false; // les cartons sont posés : le client peut signer le bon de livraison
    this.charge = null; // le véhicule chargé au chai (tracteur ou van) : { genre, p, m }
  }
  client(id) { for (const c of this.clients) if (c.id === id) return c; return null; }
  compter(statut) { let n = 0; for (const c of this.clients) if (c.statut === statut) n++; return n; }
  get ordre() { return LIVRAISONS.map(id => this.client(id)); }
  // les arrêts de la tournée : le chèque à récupérer, puis les livraisons
  get arrets() { return ORDRE.map(id => id === RETARD.id ? this.retardataire : this.client(id)); }
  arretEn(i) { const id = ORDRE[i]; return id === RETARD.id ? this.retardataire : this.client(id); }
  get nbEnvoyees() { return this.clients.filter(c => ['envoyee', 'signee'].includes(c.statut)).length; }
  // tâches du jour faites : commandes envoyées, et le passage à l'épicerie ajouté à la tournée
  get nbTaches() { return this.nbEnvoyees + (this.retardataire.statut === 'a_planifier' ? 0 : 1); }
  get ht() { return this.clients.reduce((s, c) => s + c.cartons * 6 * c.pu, 0); }
  htClient(c) { return c.cartons * 6 * c.pu; }
  // les piles de la palette du chai : celles de chaque client, 3 cartons au plus (une colonne du véhicule chacune)
  pilesPrevues() {
    const piles = [];
    for (const id of LIVRAISONS) for (let n = this.client(id).demande; n > 0; n -= 3) piles.push({ client: id, n: Math.min(3, n) });
    return piles;
  }
  // les colonnes du véhicule chargé qui portent les cartons du client id : [{ c, n }]
  colonnesDe(id) {
    const cols = [];
    for (let c = 0; c < 6; c++) { let n = 0; for (let l = 0; l < 3; l++) if (this.cartons[3 * c + l] === id) n++; if (n) cols.push({ c, n }); }
    return cols;
  }

  demarrer() { this.etape = 'debut'; this.t = 0; }
  peutFermer() { return !this.appelEnCours; }
  aller(e) { this.etape = e; this.t = 0; }
  notifier(msg, vibre = true) { this.message = msg; this.j.tel.notifier('bureau'); son.jouer(vibre ? 'vibre' : 'notif'); }

  get cible() {
    const L = this.j.lieux;
    if (this.etape === 'chai') return L.chai;
    if (this.etape === 'livraisons') return this.attenteBL ? null : L.arrets[ORDRE[this.arret]]; // on y est : plus de balise
    if (this.etape === 'retour' || (this.etape === 'pc' && this.retardataire.statut === 'recupere')) return L.pc;
    if (this.etape === 'retour' || this.etape === 'pc') return L.pc;
    return null;
  }
  get nomCible() {
    if (this.etape === 'livraisons') return this.arretEn(this.arret).nom;
    if (this.etape === 'retour' || this.etape === 'pc') return this.retardataire.statut === 'recupere' ? 'Bureau du chai' : 'PC du chai';
    return 'Chai';
  }
  get route() {
    if (this.etape === 'chai' || this.etape === 'chargement') return this.j.lieux.versChai;
    if (this.etape === 'livraisons') return this.j.lieux.route;
    if (this.etape === 'retour') return this.j.lieux.retour;
    return null;
  }
  get couleur() { return '#ff7a2f'; }
  get pcDispo() { return this.etape === 'retour' || this.etape === 'pc'; }

  update(dt) {
    const j = this.j, hud = j.hud;
    this.t += dt;
    this.tRappel = Math.max(0, this.tRappel - dt);
    // les clients répondent et signent pendant qu'on joue
    for (const c of this.clients) {
      if (c.statut === 'proposee' && (c.tRep -= dt) <= 0) {
        c.statut = 'commande';
        this.notifier('Bar Le Cep a répondu : 2 cartons de crémant.');
        hud.dire(DIALOGUES.reponseBar);
      }
      if (c.statut === 'envoyee' && (c.tSign -= dt) <= 0) {
        c.statut = 'signee';
        this.notifier(`${c.nom} a signé la commande ${c.numero}.`);
        hud.dire(DIALOGUES.signee(c));
        if (j.tel.ouvert) j.tel.afficher();
      }
    }
    switch (this.etape) {
      case 'debut':
        if (this.t > 0.8 && !this.dit) { this.dit = true; hud.dire(DIALOGUES.intro); }
        if (this.t > 3.6) { this.aller('rappels'); this.notifier('3 rappels et 1 règlement en retard aujourd\'hui.'); hud.objectif(OBJECTIFS.tel); }
        break;
      case 'rappels':
        if (this.compter('envoyee') + this.compter('signee') === this.clients.length && this.retardataire.statut !== 'a_planifier') { this.aller('chai'); hud.objectif(OBJECTIFS.chai); }
        break;
      case 'chai': {
        const d = j.distance(j.lieux.chai);
        if (d > 5.5) break;
        const reste = this.clients.length - this.compter('signee');
        if (j.auVolant && Math.abs(j.tr.v) < 2.5) {
          if (!reste) {
            // on descend, on porte les piles de la palette dans le véhicule, on remonte (gestes.js)
            this.aller('chargement'); this.charge = j.veh; this.cartons = new Array(18).fill(null);
            const V = this.charge;
            j.charger(this.palette, (c, p) => {
              for (let l = 0; l < p.n; l++) this.cartons[3 * c + l] = p.client;
              V.p.charge += p.n;
            }, () => {
              for (const c of this.clients) c.statut = 'chargee';
              this.aller('tournee');
              this.notifier('Tournée du jour prête : 4 arrêts.', false);
              hud.dire(DIALOGUES.charge); hud.objectif(OBJECTIFS.tournee);
            });
          }
          else if (this.tRappel <= 0) { hud.dire(DIALOGUES.attenteSignature(reste)); this.tRappel = 8; }
        } else if (!j.auVolant && d < 4 && this.tRappel <= 0) { hud.dire(DIALOGUES.aPied); this.tRappel = 8; }
        break;
      }
      case 'livraisons': {
        const c = this.arretEn(this.arret), d = j.distance(j.lieux.arrets[c.id]);
        if (this.attenteBL || this.attenteCheque || j.gestes.actif) break;
        if (c === this.retardataire) {
          // le chèque : en tracteur arrêté devant, ou à pied au comptoir
          const f = j.lieux.figurants[c.id], dPied = j.auVolant ? 1e9 : j.distance(f);
          if ((j.auVolant && d < 6.5 && Math.abs(j.tr.v) < 2.5) || (!j.auVolant && (d < 4.5 || dPied < 3.5))) {
            this.attenteCheque = true; if (j.auVolant) j.tr.v *= 0.3;
            hud.vider();
            hud.dire(DIALOGUES.arrivee[c.id], () => this.recupererCheque());
          }
          break;
        }
        // les cartons sont dans le véhicule chargé au chai : on livre avec lui
        const bon = j.auVolant && j.tr === this.charge.p;
        if (j.auVolant && !bon && d < 6.5 && Math.abs(j.tr.v) < 2.5 && this.tRappel <= 0) { hud.dire(DIALOGUES.sansCartons(this.charge.genre)); this.tRappel = 7; }
        if (bon && d < 6.5 && Math.abs(j.tr.v) < 2.5) {
          // on descend, on porte ses cartons jusqu'à lui (gestes.js), puis il signe le bon de livraison
          this.attenteBL = c.id; this.blPret = false;
          hud.vider();
          hud.dire(DIALOGUES.arrivee[c.id]);
          j.decharger(j.lieux.figurants[c.id], this.colonnesDe(c.id), p => this.deposes.push(p), () => {
            this.blPret = true;
            hud.objectif(`Faites signer le bon de livraison à ${c.du}`);
            if (this.attenteBL === c.id && !j.tel.ouvert) j.tel.ouvrir('bl');
          });
        } else if (!j.auVolant && d < 5 && this.tRappel <= 0) { hud.dire(DIALOGUES.sansCartons(this.charge.genre)); this.tRappel = 7; }
        break;
      }
      case 'retour': case 'pc': {
        if (j.auVolant && j.distance(j.lieux.pc) < 6 && Math.abs(j.tr.v) < 2 && this.tRappel <= 0) { hud.dire(DIALOGUES.pcTracteur); this.tRappel = 8; }
        break;
      }
      case 'fin':
        if (this.etoiles > 0 && this.t > 1.5 + this.dec) { this.etoiles--; this.dec += 0.3; hud.etoiles(this.etoiles); }
        if (this.t > 7.5) { this.aller('libre'); j.finDemo(); }
        break;
    }
    if ((this.etape === 'tournee' || this.etape === 'rappels') && !j.tel.ouvert && !j.tel.notif && (this.etape === 'tournee' || this.compter('commande') > 0 || (this.compter('a_traiter') === 0 && this.retardataire.statut === 'a_planifier'))) j.tel.notifier('bureau');
    // étoiles de retard : les clients attendent leurs cartons
    if (ATTENTE.includes(this.etape) && !j.tel.ouvert && !j.gestes.actif) {
      this.retard += dt;
      if (this.retard > RETARD_ETOILE && this.etoiles < 5) { this.retard = 0; this.etoiles++; hud.etoiles(this.etoiles); son.jouer('etoile'); }
    }
  }

  /* ------------------------------------------------------------ actions venues du téléphone */
  rappel(id) {
    const c = this.client(id), j = this.j;
    if (c.statut !== 'a_traiter' || this.appelEnCours) return;
    if (this.etape === 'debut') { this.aller('rappels'); j.hud.objectif(OBJECTIFS.tel); }
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
    if (this.etape === 'rappels' || this.etape === 'debut') j.hud.objectif(OBJECTIFS.rappels(this.nbTaches));
  }
  // le formulaire d'une commande s'ouvre : l'objectif donne la quantité dite au téléphone
  saisir(id) { const c = this.client(id); if (c && c.statut === 'commande') this.j.hud.objectif(OBJECTIFS.saisie(c)); }
  demarrerTournee() {
    if (this.etape !== 'tournee') return;
    const j = this.j;
    this.aller('livraisons'); this.arret = 0;
    j.tel.notifier(null); j.tel.fermer();
    j.hud.dire(DIALOGUES.tournee);
    this.objectifArret();
  }
  objectifArret() {
    const c = this.arretEn(this.arret);
    this.j.hud.objectif(c === this.retardataire ? OBJECTIFS.cheque(c.du) : OBJECTIFS.livrer(c.du));
  }
  // arrêt suivant, ou retour au domaine
  suivant() {
    const j = this.j;
    this.arret++;
    if (this.arret >= ORDRE.length) {
      this.aller('retour'); if (this.charge) this.charge.p.charge = 0;
      j.hud.dire(DIALOGUES.retour); j.hud.objectif(OBJECTIFS.retour);
    } else this.objectifArret();
  }
  recupererCheque() {
    const r = this.retardataire, j = this.j;
    if (r.statut !== 'attendu') return;
    r.statut = 'recupere'; this.attenteCheque = false;
    son.jouer('succes');
    j.hud.banniere('Chèque récupéré', `${r.ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € · facture ${r.facture}`, 3.2);
    this.suivant();
  }
  livrer() {
    const id = this.attenteBL;
    if (!id) return;
    const j = this.j, c = this.client(id);
    if (!this.blPret) return;
    c.statut = 'livree'; this.attenteBL = null; this.blPret = false;
    // on décharge les cartons de ce client
    for (let i = 0; i < this.cartons.length; i++) if (this.cartons[i] === id) { this.charge.m.cartons[i].visible = false; this.cartons[i] = null; }
    son.jouer('carton');
    j.hud.dire(DIALOGUES.livre(c));
    this.suivant();
    j.remonter(this.charge); // on retourne au volant
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
    j.hud.banniere('C\'est réglé', `3 commandes livrées et facturées, 1 chèque saisi, la DRM calculée. +${this.ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`, 4.5);
    j.hud.objectif(OBJECTIFS.libre);
    setTimeout(() => j.hud.dire(DIALOGUES.merci), 900);
  }
}
