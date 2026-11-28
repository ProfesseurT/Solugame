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
import { PORTES as P } from './textes.js';

const PRODUITS = new Map(P.produits.map(p => [p.id, p]));
const arrondi = x => Math.round(x * 100) / 100;

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

  /* ------------------------------------------------------------ le déroulé (à brancher) */
  // une action réussie (nom : 'selection', 'campagne', 'email', 'sms', 'courrier', 'relances', 'ticket', 'caisseFinie',
  // 'merci') : les étapes de la mission s'y branchent
  signal(nom) { /* le déroulé de la mission */ }

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
