// La caisse caveau de Vitisoft, le jour des portes ouvertes (mission 4 ; Teddy, 28/11/2026 : « saisir les bonnes
// informations de la caisse pour faire les bonnes factures, enfin les bonnes facturettes, les bons tickets aux clients
// qui passent ; une dizaine de clients pour éviter de saouler le joueur »). L'ordinateur du bureau du chai est posé sur la
// table de la caisse, sur le parvis : pc.ouvrir('caisse') l'ouvre directement sur elle (pc.js).
// D'après les deux captures du site (dépôt vitisoft.fr, src/assets/images/captures : vitisoft-caisse-selection-produits,
// vitisoft-caisse-reglement ; fonctionnalites/caisse-caveau.astro) :
// - la fenêtre « Sélection des produits » : une grande touche de couleur par famille (textes.js, PORTES.familles), puis
//   les produits de la famille ; à droite la Quantité et le pavé numérique (1 à 9, 0, 12, 24, Supp), le tarif unitaire, la
//   remise en %, le tarif remisé, VALIDER et Produit suivant ; à gauche les produits déjà ajoutés et le TOTAL TTC ;
// - la fenêtre « Règlement » : Net à payer, Montant perçu, Restant dû, les modes de paiement en tuiles (pc.js : MODES),
//   puis A4, Facturette ou Par mail.
// En haut, le client au comptoir (mission4.js : clientCaisse ; portes.js le fait venir) et ce qu'il demande (sa phrase
// reste affichée). Le premier est guidé pas à pas (une consigne du jeu, ce qu'il faut toucher mis en évidence, comme le
// Registre phyto) ; les suivants non : il faut l'écouter. Le ticket choisi, la vente est vérifiée (mission4.js :
// encaisser) : le client corrige (sa phrase dans une seconde bulle), ou le ticket sort (la facturette, ou « envoyé par
// mail ») et l'écran se vide pour le suivant.
import { PORTES as P, PORTES_ORDI as O } from './textes.js';
import { son } from './audio.js';
import { esc, eur } from './outils.js';

const PRODUITS = new Map(P.produits.map(p => [p.id, p]));
const FAMILLES = new Map(P.familles.map(f => [f.id, f]));
const arrondi = x => Math.round(x * 100) / 100;
const BILLETS = [5, 10, 20, 50]; // ce que le client tend en espèces, billet par billet
const TOUCHES = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['0', '12', '24']]; // le pavé de la capture (à droite : Supp sur deux rangs, -, .)

export class Caisse {
  // pc : l'ordinateur (pc.js : MODES, toast, la date)
  constructor(pc, modes) {
    this.pc = pc; this.modes = modes;
    this.clientVu = null; // le client au comptoir à la dernière image (un nouveau : l'écran repart de zéro)
    this.ticket = null; this.tTicket = 0; // le dernier ticket accepté, montré quelques secondes
    this.vider();
  }
  // l'écran vide, pour le client suivant
  vider() {
    this.famille = null;   // la famille ouverte (ses produits) ; null : les familles ; 'favoris' : tous les produits
    this.produit = null;   // le produit choisi, pas encore ajouté
    this.q = 1; this.frais = true; // la quantité (1 par défaut, comme la capture) ; frais : la prochaine touche la remplace
    this.remise = 0; this.cible = 'q'; // la remise en % du produit choisi ; le champ que remplit le pavé ('q', 'remise')
    this.lignes = [];      // les produits déjà ajoutés : { id, q, remise }
    this.reglement = false; this.mode = ''; this.percu = 0;
    this.refus = '';       // ce que le client vient de dire pour corriger
  }
  get P4() { return this.pc.jeu.portes; }
  prixLigne(l) { return arrondi(PRODUITS.get(l.id).ttc * l.q * (1 - l.remise / 100)); }
  get net() { return arrondi(this.lignes.reduce((s, l) => s + this.prixLigne(l), 0)); }

  // à chaque image, l'ordinateur ouvert sur la caisse : rend vrai s'il faut redessiner (un client arrive ou s'en va, le
  // ticket montré disparaît)
  update(dt) {
    let r = false;
    if (this.ticket) { this.tTicket -= dt; if (this.tTicket <= 0) { this.ticket = null; r = true; } }
    const C = this.P4 && this.P4.clientCaisse, id = C ? C.id : null;
    if (id !== this.clientVu) { this.clientVu = id; this.refus = ''; r = true; }
    return r;
  }

  /* ------------------------------------------------------------ les touches */
  // a : le data-a découpé (['cs-famille', 'rouges']...)
  action(a) {
    const [nom, x] = a;
    if (this.ticket && nom !== 'cs-fermer-ticket') { this.ticket = null; } // (toucher l'écran range le ticket montré)
    switch (nom) {
      case 'cs-fermer-ticket': this.ticket = null; return;
      case 'cs-famille': this.famille = x; return;
      case 'cs-favoris': this.famille = 'favoris'; return;
      case 'cs-retour': this.famille = null; return;
      case 'cs-produit': this.produit = this.produit === x ? null : x; if (this.produit) { this.remise = 0; if (this.cible === 'remise') this.cible = 'q'; } return;
      case 'cs-cible': this.cible = x; this.frais = true; return;
      case 'cs-touche': return this.touche(x);
      case 'cs-supp': if (this.cible === 'q') this.q = Math.floor(this.q / 10); else this.remise = Math.floor(this.remise / 10); this.frais = false; return;
      case 'cs-suivant':
        if (!this.ajouter()) { son.jouer('erreur'); this.pc.toast(O.caisse.choisir); }
        return;
      case 'cs-valider':
        this.ajouter();
        if (!this.lignes.length) { son.jouer('erreur'); this.pc.toast(O.caisse.rien); return; }
        this.reglement = true; this.mode = ''; this.percu = 0; return;
      case 'cs-suppr': this.lignes.splice(Number(x), 1); return;
      case 'cs-sortir': this.reglement = false; return;
      case 'cs-mode': this.mode = x; this.percu = x === 'especes' ? 0 : this.net; return;
      case 'cs-billet': if (this.mode === 'especes') this.percu += Number(x); return;
      case 'cs-effacer': this.percu = 0; return;
      case 'cs-ticket': return this.encaisser(x);
    }
  }
  touche(t) {
    if (t === '12' || t === '24') { if (this.cible === 'q') { this.q = Number(t); this.frais = true; } return; }
    const n = Number(t), max = this.cible === 'q' ? 999 : 100;
    const v = this.frais ? n : (this.cible === 'q' ? this.q : this.remise) * 10 + n;
    if (v > max) return;
    if (this.cible === 'q') this.q = v; else this.remise = v;
    this.frais = false;
  }
  // le produit choisi passe dans les produits déjà ajoutés ; on revient aux familles pour le suivant
  ajouter() {
    if (!this.produit || this.q <= 0) return false;
    this.lignes.push({ id: this.produit, q: this.q, remise: this.remise });
    this.produit = null; this.famille = null; this.q = 1; this.frais = true; this.remise = 0; this.cible = 'q';
    return true;
  }
  // le ticket choisi : la vente vérifiée par la mission (mission4.js : encaisser)
  encaisser(ticket) {
    const P4 = this.P4, C = P4.clientCaisse;
    if (!this.mode) { son.jouer('erreur'); this.pc.toast(O.caisse.mode); return; }
    if (!C) { son.jouer('erreur'); this.pc.toast(O.caisse.personne); return; }
    // (une remise par ligne, comme la capture ; la mission en attend une pour le ticket : la même partout, ou aucune juste)
    const L = this.lignes, remise = L.length && L.every(l => l.remise === L[0].remise) ? L[0].remise : -1;
    const r = P4.encaisser({ lignes: L.map(l => [l.id, l.q]), remise, paiement: this.mode, percu: this.mode === 'especes' ? this.percu : this.net, ticket });
    if (r) { this.refus = r; son.jouer('erreur'); return; }
    const t = P4.caisse.tickets[P4.caisse.tickets.length - 1];
    this.ticket = { ...t, n: P4.caisse.tickets.length, nouveau: !!C.nouveau, heure: this.pc.jeu.heureTxt };
    this.tTicket = 3.2;
    son.jouer(ticket === 'mail' ? 'envoye' : 'signe');
    this.vider();
    this.clientVu = null; // (le client servi s'en va : portes.js, servi)
  }

  /* ------------------------------------------------------------ le guidage du premier client */
  // ce qu'il faut toucher maintenant pour la commande du client C : { cle, txt } (cle : le data-a de la touche)
  guide(C) {
    const G = O.caisse.guide, rem = C.remise || 0, voulu = new Map(), saisi = new Map();
    for (const [id, q] of C.achats) voulu.set(id, (voulu.get(id) || 0) + q);
    for (const l of this.lignes) saisi.set(l.id, (saisi.get(l.id) || 0) + l.q);
    const nom = id => PRODUITS.get(id).nom;
    const faux = this.lignes.findIndex(l => !voulu.has(l.id) || saisi.get(l.id) !== voulu.get(l.id) || l.remise !== rem);
    const manque = C.achats.filter(([id]) => !saisi.has(id));
    if (this.reglement) {
      if (faux >= 0 || manque.length) return { cle: 'cs-sortir', txt: G.sortir };
      if (this.mode !== C.paiement) return { cle: 'cs-mode:' + C.paiement, txt: G.mode(G.comment[C.paiement], this.modes.find(m => m[0] === C.paiement)[1]) };
      if (C.paiement === 'especes' && this.percu !== C.percu) {
        if (this.percu > C.percu) return { cle: 'cs-effacer', txt: G.percu(C.percu) };
        const b = [...BILLETS].reverse().find(v => v <= C.percu - this.percu);
        return { cle: 'cs-billet:' + b, txt: G.percu(C.percu) };
      }
      return { cle: 'cs-ticket:' + C.ticket, txt: G.ticket(C.ticket) };
    }
    if (faux >= 0) return { cle: 'cs-suppr:' + faux, txt: G.enTrop(nom(this.lignes[faux].id)) };
    if (!manque.length) return { cle: 'cs-valider', txt: G.valider };
    const [id, q] = manque[0];
    if (this.produit === id) {
      if (rem && this.remise !== rem) {
        if (this.cible !== 'remise') return { cle: 'cs-cible:remise', txt: G.remise(rem) };
        return { cle: this.prochaine(String(rem), this.remise), txt: G.remise(rem) };
      }
      if (this.cible !== 'q') return { cle: 'cs-cible:q', txt: G.quantite(q) };
      if (this.q !== q) return { cle: q === 12 || q === 24 ? 'cs-touche:' + q : this.prochaine(String(q), this.q), txt: G.quantite(q) };
      return manque.length === 1 ? { cle: 'cs-valider', txt: G.valider } : { cle: 'cs-suivant', txt: G.suivant };
    }
    const f = PRODUITS.get(id).famille;
    if (this.famille === f || this.famille === 'favoris') return { cle: 'cs-produit:' + id, txt: G.produit(nom(id)) };
    return { cle: 'cs-famille:' + f, txt: G.famille(nom(id), FAMILLES.get(f).nom) };
  }
  // la touche suivante pour écrire s au pavé, d'après la valeur v déjà là (Supp si elle ne commence pas pareil)
  prochaine(s, v) {
    const deja = this.frais ? '' : String(v);
    return s.startsWith(deja) && deja.length < s.length ? 'cs-touche:' + s[deja.length] : 'cs-supp';
  }

  /* ------------------------------------------------------------ l'écran */
  html() {
    const P4 = this.P4, C = P4 ? P4.clientCaisse : null, premier = C && P4.caisse.i === 0;
    const g = premier ? this.guide(C) : null, gd = cle => (g && g.cle === cle ? ' guide' : '');
    // le client au comptoir : son nom, ce qu'il demande (affiché tant qu'il est là), ce qu'il vient de dire pour corriger
    const fini = P4 && P4.caisse.i >= P.clients.length;
    const client = C ? `<div class="cs-client"><i class="cs-av" style="background:${C.coul}">${esc(C.ini)}</i><div class="cs-paroles"><b>${esc(C.nom)}</b>
        <p class="cs-dit">${esc(C.dit)}</p>${this.refus ? `<p class="cs-refus">${esc(this.refus)}</p>` : ''}</div><span class="cs-rang">${O.caisse.rang(P4.caisse.i + 1, P.clients.length)}</span></div>`
      : `<div class="cs-client vide"><i class="cs-av"></i><b>${esc(fini ? O.caisse.finie : O.caisse.attente)}</b></div>`;
    const consigne = g ? `<p class="consigne cs-consigne">${esc(g.txt)}</p>` : '';
    // à gauche, les produits déjà ajoutés et le total
    const lignes = this.lignes.map((l, i) => `<li><button class="cs-x${gd('cs-suppr:' + i)}" data-a="cs-suppr:${i}" aria-label="Enlever">×</button>
        <span>${l.q} × ${esc(PRODUITS.get(l.id).nom)}${l.remise ? ` <small>- ${l.remise} %</small>` : ''}</span><b>${eur(this.prixLigne(l))}</b></li>`).join('');
    const gauche = `<aside class="cs-gauche"><b class="cs-deja">Produits déjà ajoutés</b><ul class="cs-lignes">${lignes}</ul>
      <p class="cs-total"><span>TOTAL TTC :</span><b>${eur(this.net)}</b></p></aside>`;
    // au milieu, les familles en grandes touches de couleur, ou les produits de la famille ouverte
    const touche = (cle, nom, f, on = false) => `<button class="cs-t${on ? ' on' : ''}${gd(cle)}" data-a="${cle}" style="--c:${f.c};--e:${f.encre || '#1b1b1b'}">${esc(nom)}</button>`;
    const grille = this.famille ? P.produits.filter(p => this.famille === 'favoris' || p.famille === this.famille)
      .map(p => touche('cs-produit:' + p.id, p.nom, FAMILLES.get(p.famille), this.produit === p.id).replace('</button>', `<small>${eur(p.ttc)}</small></button>`)).join('')
      : P.familles.map(f => touche('cs-famille:' + f.id, f.nom, f)).join('');
    const centre = `<div class="cs-centre"><div class="cs-outils"><button class="cs-ret" data-a="cs-retour" aria-label="Retour aux familles"${this.famille ? '' : ' disabled'}>
        <svg viewBox="0 0 24 24"><path d="M11 5l-7 7 7 7M4 12h16" fill="none" stroke="#fff" stroke-width="3.2"/></svg></button>
        <button class="cs-fav" data-a="cs-favoris">Favoris</button><span class="cs-rech">Rech universelle :<i></i></span></div>
      ${this.famille && this.famille !== 'favoris' ? `<p class="cs-fam">${esc(FAMILLES.get(this.famille).nom)}</p>` : ''}<div class="cs-grille${this.famille ? ' produits' : ''}">${grille}</div></div>`;
    // à droite, la quantité, le pavé numérique, le tarif et la remise, VALIDER et Produit suivant
    const pr = this.produit ? PRODUITS.get(this.produit) : null, unit = pr ? pr.ttc : 0;
    const pave = TOUCHES.map((r, i) => r.map(t => `<button class="${gd('cs-touche:' + t).trim()}" data-a="cs-touche:${t}">${t}</button>`).join('')
      + (i === 0 ? `<button class="cs-supp${gd('cs-supp')}" data-a="cs-supp">Supp</button>` : i === 2 ? '<button disabled>-</button>' : i === 3 ? '<button disabled>.</button>' : '')).join('');
    const champ = (cible, v) => `<button class="cs-champ${this.cible === cible ? ' actif' : ''}${gd('cs-cible:' + cible)}" data-a="cs-cible:${cible}">${v}</button>`;
    const droite = `<div class="cs-droite"><div class="cs-qte"><span>Quantité</span>${champ('q', this.q || '')}</div><div class="cs-pave">${pave}</div>
      <div class="cs-prix"><p class="cs-choisi">${pr ? esc(pr.nom) : esc(O.caisse.aucun)}</p>
        <label>Tarif unitaire :<b>${pr ? eur(unit) : ''}</b></label>
        <label class="cs-rem">-${champ('remise', this.remise)}%<b>${pr && this.remise ? eur(arrondi(unit * this.remise / 100)) : ''}</b></label>
        <label>Tarif remisé :<b>${pr ? eur(arrondi(unit * (1 - this.remise / 100))) : ''}</b></label></div>
      <button class="cs-valider${gd('cs-valider')}" data-a="cs-valider"><i>✓</i>VALIDER</button>
      <button class="cs-suivant${gd('cs-suivant')}" data-a="cs-suivant"><i>+</i>Produit Suivant</button></div>`;
    return `<div class="cs">${client}${consigne}<div class="cs-corps">${centre}${droite}${gauche}</div></div>
      ${this.reglement ? this.fenReglement(C, gd, client) : ''}${this.ticket ? this.vueTicket() : ''}`;
  }
  // la fenêtre Règlement de la caisse (la capture) : le net, le montant perçu (les billets, pour les espèces), le rendu,
  // les modes de paiement, puis le ticket : A4, Facturette ou Par mail
  fenReglement(C, gd, client) {
    const net = this.net, esp = this.mode === 'especes', percu = this.mode ? (esp ? this.percu : net) : 0;
    const reste = arrondi(Math.max(0, net - percu)), rendu = arrondi(Math.max(0, percu - net));
    const modes = this.modes.map(([id, t, svg]) => `<button class="vs-mode${this.mode === id ? ' on' : ''}${gd('cs-mode:' + id)}" data-a="cs-mode:${id}">${svg}<span>${esc(t)}</span></button>`).join('');
    const billets = esp ? `<div class="cs-billets"><span>${esc(O.caisse.billets)}</span>${BILLETS.map(b => `<button class="${gd('cs-billet:' + b).trim()}" data-a="cs-billet:${b}">${b} €</button>`).join('')}
      <button class="cs-eff${gd('cs-effacer')}" data-a="cs-effacer">Effacer</button></div>` : '';
    const T = (id, t, svg) => `<button class="cs-tk${gd('cs-ticket:' + id)}" data-a="cs-ticket:${id}">${svg}<span>${t}</span></button>`;
    const S = d => `<svg viewBox="0 0 24 24" fill="#fff">${d}</svg>`;
    const tickets = T('a4', 'A4', S('<path d="M7 3h10v5H7z"/><path d="M3 9h18v8h-3v4H6v-4H3z" fill-rule="evenodd"/><path d="M8 15h8v4H8z" fill="#2b6a8f"/>'))
      + T('facturette', 'Facturette', S('<path d="M6 2h12v20l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 22z"/><path d="M9 7h6M9 10.5h6M9 14h4" stroke="#2b6a8f" stroke-width="1.6"/>'))
      + T('mail', 'Par mail', S('<path d="M12 3a9 9 0 1 0 5 16.5l-1-1.6A7.2 7.2 0 1 1 19.2 12v1.2a1.7 1.7 0 0 1-3.4 0V7.6h-1.7v.9a4.3 4.3 0 1 0 .4 6.3 3.4 3.4 0 0 0 6.4-1.6V12A9 9 0 0 0 12 3zm0 11.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z"/>'));
    return `<div class="vs-modal cs-modal"><section class="vs-reg cs-reg"><header class="win-titre"><span>Règlement</span></header><div class="cs-reg-corps">
      ${client}
      <div class="vs-champs"><label>Facture N°<b>${this.P4.caisse.tickets.length + 1}</b></label><label>Net à Payer :<b>${eur(net)}</b></label>
        <label class="rouge">Montant Perçu :<b>${eur(percu)}</b></label><label>${rendu ? 'Rendu :' : 'Restant dû :'}<b>${eur(rendu || reste)}</b></label></div>
      <button class="vs-sortir${gd('cs-sortir')}" data-a="cs-sortir"><i>✕</i>Sortir</button>
      <div class="vs-modes">${modes}</div>${billets}<div class="cs-tickets">${tickets}</div></div></section></div>`;
  }
  // le ticket qui vient de sortir : la facturette (imprimée), ou le ticket parti par mail
  vueTicket() {
    const t = this.ticket, P4 = this.P4;
    if (t.ticket === 'mail') {
      return `<div class="cs-sortie" data-a="cs-fermer-ticket"><div class="cs-mail"><b>@</b><p>${esc(O.caisse.mail(t.nom))}</p>${t.nouveau ? `<p class="cs-nouv">${esc(O.caisse.nouveau(t.nom))}</p>` : ''}<p class="cs-mt">${eur(t.total)}</p></div></div>`;
    }
    const lignes = t.lignes.map(([id, q]) => { const p = PRODUITS.get(id); return `<p><span>${q} x ${esc(p.nom)}</span><span>${eur(p.ttc * q)}</span></p>`; }).join('');
    const rem = t.remise ? `<p><span>Remise ${t.remise} %</span><span>-${eur(arrondi(t.lignes.reduce((s, [id, q]) => s + PRODUITS.get(id).ttc * q, 0) - t.total))}</span></p>` : '';
    return `<div class="cs-sortie" data-a="cs-fermer-ticket"><div class="cs-facturette"><b>${esc(P.domaine)}</b><small>${esc(this.pc.dateTicket)} · ${esc(t.heure)} · N° ${t.n}</small>
      <hr>${lignes}${rem}<hr><p class="tot"><span>TOTAL TTC</span><span>${eur(t.total)}</span></p>
      <p><span>${esc(P.paiements[t.paiement])}</span><span>${eur(t.paiement === 'especes' ? t.total + t.rendu : t.total)}</span></p>
      ${t.rendu ? `<p><span>Rendu</span><span>${eur(t.rendu)}</span></p>` : ''}<hr><small>${esc(O.caisse.merci)}</small></div></div>`;
  }
}
