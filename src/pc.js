// Le portable du bureau du chai : le bureau d'un ordinateur (fond d'écran, icônes, barre des tâches à l'heure du jeu).
// Quatre icônes (et Brevo, une fois la campagne de la mission 4 créée) : Vitisoft, le logiciel installé (une icône sur le
// bureau, pas un onglet : Teddy, 24/11/2026), et, dans le
// navigateur, Le bureau, l'extension web de Vitisoft (les appels partent du téléphone), Viticode et le Registre phyto
// (Teddy, 28/11/2026 : « accessibles et utilisables depuis l'ordinateur aussi, dans toutes les missions ») : les mêmes
// écrans que sur le téléphone, le même compte (telephone.js : vuePortable), chaque fenêtre là où on l'a laissée (ecrans).
// Assis, l'icône de l'appli que la mission attend est mise en évidence (main.js : jeu.appliPC). L'interface de Vitisoft suit les captures du site (textes.js, VITISOFT) : barre noire, menu à
// gauche par rubriques, tableau de bord en tuiles, listes en grilles, fenêtre Règlement aux modes de paiement en tuiles.
// Trois choses à faire dans Vitisoft au retour de la tournée : saisir le règlement du chèque de l'épicerie (Liste des
// factures / Règlements), facturer les commandes signées dans le bureau (Liste des commandes / BL ; Factur-X, transmises
// par Pennylane, plateforme agréée), calculer la DRM du mois dernier (DRM / DMS ; à valider ensuite dans CIEL). Le
// journal des ventes et les encaissements partent chez le comptable. Un pense-bête collé sur le bureau de l'ordinateur
// les rappelle ; l'objectif du jeu est repris au-dessus de l'écran (le portable cache celui du jeu).
// La mission 4, les portes ouvertes (Teddy, 28/11/2026 ; mission4.js tient l'état, textes.js PORTES et PORTES_ORDI) :
// - le ciblage dans Vitisoft, Contacts > Clients / contacts : la recherche multi-critères (les filtres, le compte qui les
//   suit, Rechercher), guidée à chaque fois (une consigne du jeu, ce qu'il faut toucher mis en évidence) ; la sélection
//   et « Créer la campagne » (un clic : la fenêtre Brevo s'ouvre, brevo.js) ; « Créer le courrier » (le publipostage, les
//   étiquettes, « Envoyer en routage ») ;
// - la fenêtre Brevo, dans le navigateur de l'ordinateur (brevo.js) : l'email, le SMS, les relances, le merci ;
// - la caisse caveau, le jour J, l'ordinateur posé sur le parvis (caisse.js) : pc.ouvrir('caisse') l'ouvre directement ;
// - Analyse > Statistiques : les portes ouvertes en chiffres, et « Remercier les visiteurs » (le merci, dans Brevo).
// Ce que la mission attend sur l'ordinateur, à chaque instant, se lit dans aFaire() (l'appli, l'action) : l'icône ou la
// fenêtre de la barre des tâches mise en évidence, Vitisoft ouvert sur la bonne vue, les consignes, le pense-bête.
import { VITISOFT as V, HABILLAGE as HX, PORTES, PORTES_ORDI as O } from './textes.js';
import { ICONES as IC, famille } from './telephone.js';
import { son } from './audio.js';
import { $, esc, eur, dateJeu, jourDe } from './outils.js';
import { Caisse } from './caisse.js';
import { Brevo } from './brevo.js';

const hl = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' hl';
const VUES = ['accueil', 'factures', 'commandes', 'drm']; // les écrans où l'on agit ; les autres disent ce qu'ils font
const NOMS = { vitisoft: 'Vitisoft', bureau: 'Le bureau', viticode: 'Viticode', phyto: 'Registre phyto', brevo: 'Brevo' };
const NAVIGATEUR = ['bureau', 'viticode', 'phyto']; // (les fenêtres du navigateur : les écrans du téléphone ; Brevo aussi, à part)
// l'icône de Vitisoft : le O du logo, un cercle ouvert en haut ; Brevo : une enveloppe (son logo n'est pas imité)
const ICONES = { vitisoft: '<svg viewBox="0 0 24 24"><path d="M8.6 5.6a7.6 7.6 0 1 0 6.8 0" fill="none" stroke="#fff" stroke-width="3.4"/></svg>', bureau: IC.bureau, viticode: IC.viticode, phyto: IC.phyto,
  brevo: '<svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2" fill="#fff"/><path d="M3.8 6.6l8.2 6.4 8.2-6.4" fill="none" stroke="#3d4f66" stroke-width="1.8"/></svg>' };
// mission 4 : les étapes de la préparation (les invitations, sur l'ordinateur du bureau du chai)
const PREPA = ['message', 'ciblage', 'campagne', 'courrier', 'relances'];
// les modes de paiement de la fenêtre Règlement, dans l'ordre des captures
const S = d => `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">${d}</svg>`;
const MODES = [
  ['especes', 'ESPECES', S('<ellipse cx="9" cy="17" rx="6" ry="2.3"/><ellipse cx="9" cy="13" rx="6" ry="2.3"/><path d="M13 7.5h7M13 4.5h7M16 4.5v7"/>')],
  ['cheque', 'CHEQUE', S('<rect x="2" y="7" width="20" height="12" rx="1.5"/><path d="M5 15h7M5 11h4M14 15l6-9"/>')],
  ['carte', 'CARTE', S('<rect x="2" y="5" width="20" height="14" rx="2" fill="#fff"/><path d="M2 10h20" stroke="#1aa38b" stroke-width="3"/>')],
  ['sans', 'CARTE sans contact', S('<circle cx="6" cy="12" r="1.8" fill="#fff"/><path d="M10 7.5a6 6 0 0 1 0 9M14 5a10 10 0 0 1 0 14M18 3a13 13 0 0 1 0 18"/>')],
  ['bons', 'Bons d\'Achats', S('<path d="M3 12l9-9h8v8l-9 9z" fill="#fff"/><circle cx="16" cy="8" r="1.6" stroke="#1aa38b"/>')],
  ['virement', 'VIREMENT', S('<path d="M19 6c-6 0-11 3-11 11"/><path d="M4 14l4 5 4-5" fill="#fff"/>')],
  ['divers', 'DIVERS', '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.6 4.6 2 7.4-6.4-4.4-6.4 4.4 2-7.4L2 9h7z" fill="#fff"/></svg>'],
];

export class PC {
  constructor(jeu) {
    this.jeu = jeu; this.el = $('pc'); this.elObj = $('pc-obj'); this.ouvert = false;
    // les fenêtres ouvertes (dans l'ordre de la barre des tâches), celle de devant (null : le bureau de l'ordinateur),
    // l'icône à ouvrir (mise en évidence)
    this.ouvertes = []; this.fenetre = null; this.conseil = null;
    this.ecrans = { bureau: 'bureau', viticode: 'viticode', phyto: 'phyto' }; // (l'écran où chaque fenêtre du navigateur en est)
    this.vue = 'accueil'; this.reglement = false; this.mode = ''; this.envoi = null; this.tEnvoi = 0; this.tDrm = 0;
    this.obj = ''; this.heure = '';
    // mission 4 : l'écran ('bureau' : le bureau de l'ordinateur et ses fenêtres ; 'caisse' : la caisse en plein écran, le
    // portable sur le parvis), la caisse, la fenêtre Brevo, les statistiques déjà vues ; surLever : ce que la mission
    // veut savoir quand on se lève (le portable sur le parvis : mission4.js)
    this.ecran = 'bureau'; this.caisse = new Caisse(this, MODES); this.brevo = new Brevo(this); this.statsVues = false; this.merciVu = false; this.surLever = null;
    // un message de l'ordinateur (un refus, un envoi fait), par-dessus l'écran redessiné
    this.elToast = document.createElement('p'); this.elToast.className = 'pc-toast'; this.el.querySelector('.moniteur').appendChild(this.elToast);
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      e.preventDefault(); son.jouer('tap');
      const a = b.dataset.a.split(':'), [nom, arg] = a, m = this.jeu.mission, tel = this.jeu.tel;
      // l'ordinateur : ouvrir une icône, passer d'une fenêtre à l'autre, réduire, fermer, se lever
      if (nom === 'quitter') { this.lever(); return; }
      // mission 4 : la caisse (caisse.js), la fenêtre Brevo (brevo.js), le ciblage, le courrier et les statistiques
      if (nom.startsWith('cs-')) { this.caisse.action(a); this.afficher(); return; }
      if (nom.startsWith('bv-')) { this.brevo.action(a); this.afficher(); return; }
      if (nom.startsWith('po-')) { this.actionPortes(a); this.afficher(); return; }
      if (nom === 'lancer') { this.lancer(arg); this.afficher(); return; }
      if (nom === 'tache') { this.fenetre = this.fenetre === arg ? null : arg; this.afficher(); return; }
      if (nom === 'reduire') { this.fenetre = null; this.afficher(); return; }
      if (nom === 'fermerF') {
        // Vitisoft fermé quand tout est fait au retour de la tournée : on se lève, c'est la fin de la mission
        if (arg === 'vitisoft' && m.toutFait && m.etape === 'pc') { this.lever(); return; }
        this.ouvertes = this.ouvertes.filter(f => f !== arg); this.fenetre = this.ouvertes[0] || null;
        this.afficher(); return;
      }
      const w = this.fenetre;
      if (NAVIGATEUR.includes(w)) {
        // un appel part du téléphone, le bon de livraison s'y signe (on revient ensuite au portable, bureau.js) ; le reste se
        // fait ici, comme sur le téléphone
        if (w === 'bureau' && nom === 'rappel' && m.client(arg)?.mode === 'appel') { if (m.appelEnCours) return; this.fermer(); tel.ouvrir('bureau'); m.rappel(arg); return; }
        if (w === 'bureau' && nom === 'r-appel') { if (m.appelEnCours) return; this.fermer(); tel.ouvrir('bureau'); tel.action(b.dataset.a); return; } // (un restaurateur du coin)
        if (w === 'bureau' && nom === 'bl') { if (m.blPret) { this.fermer(); tel.ouvrir('bl'); } return; }
        if (nom === 'accueil') return;
        tel.app = this.ecrans[w];
        tel.action(b.dataset.a);
        if (famille(tel.app) === w) this.ecrans[w] = tel.app;
        // le QR code envoyé à l'imprimerie depuis l'ordinateur : on reste dans Viticode, sa réponse viendra au téléphone
        if (nom === 'vc-envoyer') { this.ecrans.viticode = 'vcQr'; this.afficher(); tel.toast(HX.app.envoyeOrdi); return; }
        this.afficher();
        return;
      }
      if (nom === 'vue') { this.voir(arg); this.reglement = false; }
      else if (nom === 'ouvrirReg') { this.reglement = true; this.mode = ''; }
      else if (nom === 'sortirReg') this.reglement = false;
      else if (nom === 'regler') m.saisirReglement();
      else if (nom === 'mode') this.mode = arg;
      else if (nom === 'fac') m.facturer(arg);
      else if (nom === 'env' && !this.envoi) { this.envoi = arg; this.tEnvoi = 1.1; son.jouer('envoi'); }
      else if (nom === 'drm') { m.calculerDRM(); this.tDrm = 1.4; }
      this.afficher();
    });
  }
  // s'asseoir : app, l'icône à mettre en évidence (on arrive sur le bureau de l'ordinateur, les fenêtres déjà ouvertes
  // restent dans la barre) ; sans app, on revient au portable tel qu'on l'a laissé (après un appel). Mission 4 : 'caisse'
  // ouvre directement la caisse, en plein écran (le portable sur le parvis) ; le jour des statistiques, le portable
  // s'ouvre sur Vitisoft, Analyse > Statistiques (la caisse est finie)
  ouvrir(app) {
    const P4 = this.jeu.portes;
    if (app === 'caisse' && P4 && P4.etape === 'stats') { this.ecran = 'bureau'; this.conseil = null; this.lancer('vitisoft'); this.voir('statistiques'); }
    else if (app === 'caisse') { this.ecran = 'caisse'; this.caisse.clientVu = null; }
    else if (app) { this.ecran = 'bureau'; this.conseil = app; this.fenetre = null; }
    this.ouvert = true; this.el.hidden = false; this.obj = ''; this.update(0); this.afficher();
  }
  fermer() { this.ouvert = false; this.el.hidden = true; }
  // un écran de l'appli app a changé (telephone.js : rafraichir ; le bulletin du labo, le réseau revenu) : redessiné s'il
  // est devant
  rafraichir(app) { if (this.ouvert && NAVIGATEUR.includes(this.fenetre) && this.ecrans[this.fenetre].startsWith(app)) this.afficher(); }
  lever() {
    this.fermer(); this.jeu.mission.fermerPC(); this.jeu.leverPortable();
    const f = this.surLever; this.surLever = null; if (f) f(); // (le portable sur le parvis : mission4.js)
  }
  lancer(app) {
    // Vitisoft s'ouvre sur la vue qu'attend la mission (mission 4 : Clients / contacts, les statistiques), ou le tableau
    // de bord ; Brevo, sur l'écran qu'elle attend
    if (app === 'vitisoft' && (!this.ouvertes.includes(app) || this.conseil === app)) { this.voir(this.vueVoulue()); this.reglement = false; }
    if (app === 'brevo' && (!this.ouvertes.includes(app) || this.conseil === app)) this.brevo.montrer();
    if (!this.ouvertes.includes(app)) this.ouvertes.push(app);
    this.fenetre = app; if (this.conseil === app) this.conseil = null;
    // (le Registre phyto ouvert ici : la notification du téléphone est vue)
    const tel = this.jeu.tel; if (tel.notif === app && app !== 'bureau') tel.notifier(null);
  }
  // un message de l'ordinateur, quelques secondes (un refus, un envoi fait)
  toast(txt) { const t = this.elToast; t.textContent = txt; t.classList.remove('vu'); void t.offsetWidth; t.classList.add('vu'); }

  /* ------------------------------------------------------------ mission 4 : ce que la mission attend sur l'ordinateur */
  // { app, quoi } : l'appli (vitisoft, brevo) et l'action attendue (filtre, rechercher, campagne, email, sms, courrier,
  // routage, relances, stats, merci) ; null s'il n'y a rien à faire sur l'ordinateur. D'après ce qui est fait (pas
  // seulement l'étape) : on peut tout faire dans l'ordre qu'on veut.
  aFaire() {
    const P4 = this.jeu.portes;
    if (!P4 || !P4.actif) return null;
    if (PREPA.includes(P4.etape)) {
      const C = P4.campagne;
      if (!P4.selection) return { app: 'vitisoft', quoi: P4.filtreAttendu ? 'filtre' : 'rechercher' };
      if (!C.ouverte) return { app: 'vitisoft', quoi: 'campagne' };
      if (!C.email) return { app: 'brevo', quoi: 'email' };
      if (!C.sms) return { app: 'brevo', quoi: 'sms' };
      if (!C.courrier) return { app: 'vitisoft', quoi: this.vue === 'courrier' ? 'routage' : 'courrier' };
      if (!C.relances) return { app: 'brevo', quoi: 'relances' };
      return null;
    }
    // après les portes ouvertes : les statistiques, puis « Remercier les visiteurs » (dans les statistiques), puis le
    // merci dans Brevo une fois sa fenêtre ouverte dessus
    if (P4.etape === 'stats' && !P4.merci) return this.merciVu ? { app: 'brevo', quoi: 'merci' } : { app: 'vitisoft', quoi: this.statsVues ? 'merci' : 'stats' };
    return null;
  }
  // l'appli que la mission 4 attend sur l'ordinateur (main.js : jeu.appliPC, l'icône à mettre en évidence), ou null
  appliPortes() {
    const P4 = this.jeu.portes;
    if (!P4 || !P4.actif) return null;
    if (P4.etape === 'caisse') return 'caisse';
    const f = this.aFaire(); return f ? f.app : null;
  }
  // la vue où s'ouvre Vitisoft : celle qu'attend la mission 4, ou le tableau de bord
  vueVoulue() {
    const f = this.aFaire();
    if (!f || f.app !== 'vitisoft') return 'accueil';
    return f.quoi === 'stats' || f.quoi === 'merci' ? 'statistiques' : f.quoi === 'routage' ? 'courrier' : 'clients';
  }
  // aller à une vue de Vitisoft ; les statistiques des portes ouvertes vues, la suite est le merci
  voir(vue) {
    this.vue = vue;
    const P4 = this.jeu.portes;
    if (vue === 'statistiques' && P4 && P4.caisse.tickets.length && !this.statsVues) { this.statsVues = true; P4.signal('statsVues'); }
  }
  // le jour des portes ouvertes (outils.js : dateJeu) : la mission le dit (portes.jourJ), sinon on le déduit de l'étape
  // (la préparation : une semaine plus un jour plus tard ; la veille : demain)
  get jourJ() {
    const P4 = this.jeu.portes, j = jourDe(this.jeu.minutes);
    if (P4 && P4.jourJ != null) return P4.jourJ;
    if (P4 && P4.caisse.tickets.length) return jourDe(P4.caisse.tickets[0].minutes);
    const e = P4 ? P4.etape : 'avant';
    if (e === 'avant' || PREPA.includes(e) || e === 'semaine') return j + PORTES.semaine + 1;
    return e === 'materiel' ? j + 1 : j;
  }
  get dateJ() { return dateJeu(this.jourJ); }
  get dateTicket() { return dateJeu(jourDe(this.jeu.minutes), 'chiffres'); }
  // les actions des écrans de Vitisoft de la mission 4 (a : le data-a découpé)
  actionPortes(a) {
    const P4 = this.jeu.portes, [nom, x, y] = a;
    if (!P4) return;
    if (nom === 'po-filtre') P4.filtrer(x, y);
    else if (nom === 'po-rechercher') {
      const f = P4.rechercher();
      if (f) { son.jouer('erreur'); this.toast(O.refusFiltre(PORTES.filtres.find(z => z.id === f).nom)); }
      else son.jouer('notif');
    } else if (nom === 'po-campagne') {
      // un clic : la campagne créée depuis la sélection, la fenêtre Brevo s'ouvre devant
      if (P4.ouvrirCampagne()) { son.jouer('envoi'); this.lancer('brevo'); this.brevo.montrer(); }
    } else if (nom === 'po-courrier') { if (P4.selection) this.vue = 'courrier'; }
    else if (nom === 'po-routage') { if (P4.envoyerCourrier()) { son.jouer('envoye'); this.toast(O.courrierParti(PORTES.selection.courrier)); } }
    else if (nom === 'po-brevo') this.lancer('brevo');
    else if (nom === 'po-merci') { this.statsVues = true; this.lancer('brevo'); this.brevo.montrer('merci'); }
  }
  update(dt) {
    if (!this.ouvert) return;
    const m = this.jeu.mission;
    // la caisse : un client arrive ou s'en va, le ticket montré disparaît
    if (this.ecran === 'caisse' && this.caisse.update(dt)) this.afficher();
    if (this.envoi) {
      this.tEnvoi -= dt;
      if (this.tEnvoi <= 0) { m.transmettre(this.envoi); this.envoi = null; this.afficher(); }
    }
    if (m.drm === 'calcul') {
      this.tDrm -= dt;
      if (this.tDrm <= 0) { m.drmCalculee(); this.afficher(); }
    }
    // l'objectif du jeu, au-dessus de l'écran ; l'heure, dans la barre des tâches et sur le tableau de bord
    const o = $('objectif').textContent;
    if (o !== this.obj) { this.obj = o; this.elObj.textContent = o; }
    if (this.jeu.heureTxt !== this.heure) { this.heure = this.jeu.heureTxt; for (const e of this.el.querySelectorAll('.pc-heure')) e.textContent = this.heure; }
  }

  // le pense-bête : ce qu'il y a à faire dans Vitisoft, d'après ce qui est arrivé (rien d'avance : le chèque déposé au
  // bureau, les commandes livrées) ; la DRM du mois dernier se calcule quand on veut
  penseBete(m) {
    const note = (titre, t) => `<aside class="pc-note"><b>${esc(titre)}</b>${t.map(([x, ok]) => `<span${ok ? ' class="ok"' : ''}>${esc(x)}</span>`).join('')}</aside>`;
    // la journée de traitement : chaque parcelle à noter dans le registre ; l'habillage : la fiche Viticode jusqu'à l'envoi
    const R = this.jeu.traitement, H = this.jeu.habillage, P4 = this.jeu.portes;
    // les portes ouvertes : les invitations (le ciblage, l'email, le SMS, le courrier, les relances) ; la caisse ; après,
    // les statistiques et le merci
    if (P4 && P4.actif && P4.etape !== 'avant') {
      const N = O.penseBete, C = P4.campagne;
      if (P4.etape === 'stats' || P4.merci) return note(N.apres, [[N.stats, this.statsVues], [N.merci, P4.merci]]);
      if (P4.caisse.ouverte || P4.caisse.tickets.length) return note(N.caisse, [[N.clients(P4.caisse.tickets.length, PORTES.clients.length), P4.caisse.i >= PORTES.clients.length]]);
      return note(N.invitations, [[N.cibler, !!P4.selection || C.ouverte], [N.email, C.email], [N.sms, C.sms], [N.courrier, C.courrier], [N.relances, C.relances]]);
    }
    if (H && H.actif && H.bulletin && !H.envoye) return note('Dans Viticode', [['Créer la fiche du Clos 2025', H.publiee], ['La tester', H.testee], ['Télécharger le QR code', H.telecharge], ['L\'envoyer à l\'imprimerie', H.envoye]]);
    if (R && R.actif && R.parcelles.some(p => p.traitee && !p.notee)) return note('Registre phyto', R.jour.map(p => ['Noter ' + p.nom, p.notee]));
    const r = m.retardataire.statut, livrees = m.clients.filter(c => ['livree', 'facturee', 'transmise'].includes(c.statut));
    const t = [];
    if (r === 'depose' || r === 'saisi') t.push([V.tacheReglement, r === 'saisi']);
    if (livrees.length) t.push([V.tacheFactures(livrees.length), livrees.every(c => c.statut === 'transmise')]);
    t.push([V.tacheDrm, m.drm === 'faite']);
    return note('Dans Vitisoft', t);
  }

  // la date du jour du jeu (outils.js : dateJeu ; la tournée peut finir le lendemain) : la tuile, la barre des tâches, les
  // factures du jour et leur échéance à 30 jours
  get jour() { return jourDe(this.jeu.minutes); }
  // le tableau de bord : les tuiles des captures (date, heure, compteurs), des raccourcis, le chiffre d'affaires
  accueil(m) {
    const d = dateJeu(this.jour, 'tuile'), retard = m.retardataire.statut === 'saisi' ? 0 : 1;
    const faites = m.clients.filter(c => ['facturee', 'transmise'].includes(c.statut)).length;
    return `<div class="vs-tuiles">
      <div class="vs-tu orange date"><span>${d.jour}</span><b>${d.n}</b><span>${d.mois}</span></div>
      <div class="vs-tu orange heure"><b class="pc-heure">${this.jeu.heureTxt}</b></div>
      <div class="vs-tu noir"><b>${V.facturesAvant + faites}</b><span>Factures<br>Exercice en cours</span></div>
      <div class="vs-tu vert"><b>${V.panier}</b><span>Panier Moyen HT<br>Exercice en cours</span></div>
      <button class="vs-tu rouge" data-a="vue:factures"><b>${retard}</b><span>Factures dont l'échéance est dépassée</span></button>
      <button class="vs-tu gris" data-a="vue:factures">Liste des factures / Règlements</button>
      <button class="vs-tu gris" data-a="vue:commandes">Liste des commandes / BL</button>
      <button class="vs-tu gris" data-a="vue:drm">DRM / DMS</button></div>${this.graphe()}`;
  }
  // « Evolution du chiffre d'affaires » : exercice en cours et exercice N-1, une courbe chacun
  graphe() {
    const max = 20000, x = i => 30 + i * 50, y = v => 128 - v / max * 116;
    const ligne = (s, c) => `<polyline points="${s.map((v, i) => `${x(i)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${c}" stroke-width="2.5"/>${s.map((v, i) => `<circle cx="${x(i)}" cy="${y(v).toFixed(1)}" r="3.2" fill="${c}"/>`).join('')}`;
    const mois = 'JFMAMJJASOND'.split('').map((l, i) => `<text x="${x(i)}" y="146">${l}</text>`).join('');
    const axes = [0, 10000, 20000].map(v => `<text x="24" y="${y(v) + 3}" text-anchor="end">${v / 1000}k</text><line x1="28" x2="590" y1="${y(v)}" y2="${y(v)}"/>`).join('');
    return `<figure class="vs-graphe"><figcaption>Evolution du chiffre d'affaires</figcaption>
      <svg viewBox="0 0 600 152">${axes}${ligne(V.ca[1], '#f2b731')}${ligne(V.ca[0], '#3bbf9d')}${mois}</svg>
      <p class="vs-leg"><i style="background:#3bbf9d"></i>Exercice en cours<i style="background:#f2b731"></i>Exercice N-1</p></figure>`;
  }

  // Liste des factures / Règlements : la facture en retard d'abord (en rouge, comme les captures), puis les plus récentes
  factures(m) {
    const r = m.retardataire, saisi = r.statut === 'saisi';
    const act = saisi ? '<span class="vs-ok">Réglée, chèque</span>' : r.statut === 'depose' ? '<button class="vs-bt blanc" data-a="ouvrirReg">Règlement</button>'
      : `<span>${esc(V.chequeAttendu)}</span>`;
    const ligne = (n, d, nom, ttc, ech, du, etat, cl = '') => `<tr${cl}><td data-l="Facture"><b>${n}</b></td><td data-l="Date">${d}</td><td data-l="Client">${esc(nom)}</td>
      <td data-l="Montant TTC" class="n">${eur(ttc)}</td><td data-l="Échéance">${ech}</td><td data-l="Reste dû" class="n">${eur(du)}</td><td data-l="État" class="a">${etat}</td></tr>`;
    const neuves = m.clients.filter(c => ['facturee', 'transmise'].includes(c.statut)).reverse()
      .map(c => ligne(c.facture, dateJeu(this.jour, 'chiffres'), c.nom, m.htClient(c) * 1.2, dateJeu(this.jour + V.echeanceJ, 'chiffres'), m.htClient(c) * 1.2, c.statut === 'transmise' ? 'Factur-X, transmise' : 'Factur-X'));
    const retard = ligne(r.facture, V.retardDate, r.nom, r.ttc, V.retardEcheance, saisi ? 0 : r.ttc, act, saisi ? '' : ' class="retard"');
    const anciennes = V.anciennes.map(([n, d, nom, ttc]) => ligne(n, d, nom, ttc, d, 0, 'Réglée'));
    return `<table class="vs-grille"><caption>Liste des factures / Règlements</caption>
      <thead><tr><th>Facture</th><th>Date</th><th>Client</th><th class="n">Montant TTC</th><th>Échéance</th><th class="n">Reste dû</th><th>État</th></tr></thead>
      <tbody>${saisi ? '' : retard}${neuves.join('')}${saisi ? retard : ''}${anciennes.join('')}</tbody></table>
      ${saisi ? `<p class="vs-note">${esc(V.reglementSaisi)}</p>` : ''}`;
  }
  // la fenêtre Règlement (d'après la capture) : la facture en retard, réglée par chèque
  fenReglement(m) {
    const r = m.retardataire, saisi = r.statut === 'saisi';
    const modes = MODES.map(([id, t, svg]) => `<button class="vs-mode${saisi && id === 'cheque' ? ' on' : ''}" data-a="${id === 'cheque' ? 'regler' : 'mode:' + id}"${saisi ? ' disabled' : ''}>${svg}<span>${esc(t)}</span></button>`).join('');
    const note = saisi ? V.reglementSaisi : this.mode ? V.parCheque : `${r.nom} : ${r.detail}`;
    return `<div class="vs-modal"><section class="vs-reg"><header class="win-titre"><span>Règlement</span></header><div class="vs-reg-corps">
      <div class="vs-champs"><label>Facture N°<b>${r.facture}</b></label><label>Net à Payer :<b>${eur(r.ttc)}</b></label>
      <label class="rouge">Montant Perçu :<b>${eur(saisi ? r.ttc : 0)}</b></label><label>Restant dû :<b>${eur(saisi ? 0 : r.ttc)}</b></label></div>
      <button class="vs-sortir" data-a="sortirReg"><i>✕</i>Sortir</button>
      <div class="vs-modes">${modes}</div><p class="vs-note">${esc(note)}</p></div></section></div>`;
  }
  // Liste des commandes / BL : les commandes arrivées du bureau, seulement celles que le client a signées en ligne
  commandes(m) {
    const arrivees = m.clients.filter(c => !['a_traiter', 'proposee', 'commande', 'envoyee'].includes(c.statut));
    const restos = this.jeu.restos ? this.jeu.restos.pourVitisoft() : []; // les commandes signées des restaurateurs du coin
    if (!arrivees.length && !restos.length) return `<h2>Liste des commandes / BL</h2><p class="vs-texte">${esc(V.aucuneCommande)}</p>`;
    const total = arrivees.reduce((s, c) => s + m.htClient(c), 0) + restos.reduce((s, c) => s + c.ht, 0), transmises = arrivees.filter(c => c.statut === 'transmise').length;
    const lignes = arrivees.map(c => {
      const ht = m.htClient(c);
      let act;
      if (this.envoi === c.id) act = '<span class="vs-envoi"><i class="roue petite"></i>Pennylane transmet...</span>';
      else if (c.statut === 'livree') act = `<button class="vs-bt" data-a="fac:${c.id}">Facturer</button>`;
      else if (c.statut === 'facturee') act = `<button class="vs-bt vert" data-a="env:${c.id}"${this.envoi ? ' disabled' : ''}>Envoyer avec Pennylane</button>`;
      else if (c.statut === 'transmise') act = '<span class="vs-ok">Transmise ✓</span>';
      else act = '<span class="vs-gris">Pas encore livrée</span>';
      const fac = ['facturee', 'transmise'].includes(c.statut) ? `<span class="vs-fx">${c.facture} · Factur-X</span>` : '';
      return `<tr><td data-l="Commande"><b>${c.numero}</b></td><td data-l="Client">${esc(c.nom)}</td>
        <td data-l="Signée en ligne" class="c">✓</td><td data-l="BL signé" class="c">${['livree', 'facturee', 'transmise'].includes(c.statut) ? '✓ ' + c.bl : '·'}</td>
        <td data-l="Montant HT" class="n">${eur(ht)}</td><td data-l="Facture" class="a">${fac}${act}</td></tr>`;
    }).join('') + restos.map(c => `<tr><td data-l="Commande"><b>${c.numero}</b></td><td data-l="Client">${esc(c.nom)}</td>
        <td data-l="Signée en ligne" class="c">✓</td><td data-l="BL signé" class="c">·</td>
        <td data-l="Montant HT" class="n">${eur(c.ht)}</td><td data-l="Facture" class="a"><span class="vs-gris">Pas encore livrée</span></td></tr>`).join('');
    return `<table class="vs-grille"><caption>Liste des commandes / BL</caption>
      <thead><tr><th>Commande</th><th>Client</th><th class="c">Signée en ligne</th><th class="c">BL signé</th><th class="n">Montant HT</th><th>Facture</th></tr></thead><tbody>${lignes}</tbody>
      <tfoot><tr><td colspan="4">Total</td><td class="n">${eur(total)}</td><td></td></tr></tfoot></table>
      <p class="vs-note">${esc(V.arrivees)}. ${esc(V.factureCreee)} ${esc(V.transmise)}</p>
      ${transmises ? `<p class="vs-note"><b>${transmises > 1 ? `${transmises} factures transmises` : '1 facture transmise'}.</b> ${esc(V.journal)}</p>` : ''}`;
  }
  drm(m) {
    const faite = m.drm === 'faite';
    const bas = faite ? `<p class="vs-note"><span class="vs-ok">${esc(V.drmFaite)}</span></p>`
      : m.drm === 'calcul' ? '<p class="vs-note"><span class="vs-envoi"><i class="roue petite"></i>Vitisoft calcule la DRM...</span></p>'
        : '<p><button class="vs-bt vert gros" data-a="drm">Calculer la DRM</button></p>';
    const tab = faite ? `<table class="vs-grille drm"><caption>DRM ${esc(V.mois)}</caption><tbody>${V.drmLignes.map(([t, v]) => `<tr><td data-l="Poste">${esc(t)}</td><td data-l="Volume" class="n">${hl(v)}</td></tr>`).join('')}</tbody></table>` : '';
    return `<h2>DRM / DMS</h2><p class="vs-texte">${esc(V.drmTitre)} : <b>${esc(V.mois)}</b>. ${esc(V.drm)}</p>${tab}${bas}`;
  }
  // un écran qui n'est pas dans la démo : ce qu'il fait, quand on peut le dire
  fiche() {
    const x = V.menu.flatMap(r => r[1]).find(i => i[0] === this.vue), d = V.fiches[this.vue];
    return `<h2>${esc(x ? x[1] : '')}</h2>${d ? `<p class="vs-texte">${esc(d)}</p>` : ''}<p class="vs-note">Dans le jeu complet.</p>`;
  }

  /* ------------------------------------------------------------ mission 4 : les écrans de Vitisoft */
  // l'écran de la mission 4 pour la vue en cours (Clients / contacts, le courrier, les statistiques), ou '' (la fiche)
  vuePortes() {
    const P4 = this.jeu.portes;
    if (!P4) return '';
    if (this.vue === 'statistiques') return P4.caisse.tickets.length ? this.statistiques() : '';
    if (!P4.actif && !P4.selection) return '';
    if (this.vue === 'clients') return this.clients();
    if (this.vue === 'courrier') return P4.selection ? this.courrier() : this.clients();
    return '';
  }
  // l'entrée du menu à toucher (mise en évidence) quand la mission attend une autre vue de Vitisoft
  menuVoulu() {
    const f = this.aFaire();
    if (!f || f.app !== 'vitisoft') return null;
    const v = f.quoi === 'stats' || f.quoi === 'merci' ? 'statistiques' : 'clients';
    return this.vue === v || (v === 'clients' && this.vue === 'courrier') ? null : v;
  }
  // la consigne du jeu en haut de Vitisoft (comme le Registre phyto : c'est le jeu qui parle, pas l'appli)
  consigneVs() {
    const P4 = this.jeu.portes, f = this.aFaire(), K = O.consigne, S = PORTES.selection;
    if (!P4 || !P4.actif) return '';
    let t = '';
    if (!f) t = PREPA.includes(P4.etape) && P4.invitationsParties ? K.fini : P4.etape === 'stats' && P4.merci ? K.merciFait : '';
    else if (f.app === 'brevo') t = f.quoi === 'relances' ? K.relances : f.quoi === 'merci' ? K.merci : K.brevo;
    else if (f.quoi === 'stats' || f.quoi === 'merci') t = this.vue === 'statistiques' ? K.stats : K.statsMenu;
    else if (this.vue !== 'clients' && this.vue !== 'courrier') t = K.menu;
    else if (f.quoi === 'filtre') t = K[P4.filtreAttendu.id];
    else if (f.quoi === 'rechercher') t = K.rechercher;
    else if (f.quoi === 'campagne') t = K.campagne(S.total);
    else if (f.quoi === 'courrier') t = K.courrier(S.courrier);
    else if (f.quoi === 'routage') t = K.routage(S.courrier);
    return t ? `<p class="consigne vs-consigne">${esc(t)}</p>` : '';
  }
  // Contacts > Clients / contacts : la recherche multi-critères (crm-viticole : zone géographique, type de vin,
  // millésime, catégorie, historique d'achat), le compte qui suit les filtres, Rechercher ; la sélection, ses canaux, un
  // aperçu du fichier, « Créer la campagne » (Brevo) et « Créer le courrier »
  clients() {
    const P4 = this.jeu.portes, f = this.aFaire(), quoi = f && f.app === 'vitisoft' ? f.quoi : null, att = P4.filtreAttendu;
    const S = PORTES.selection, C = P4.campagne, sel = P4.selection;
    const opts = F => F.options.map(([id, nom]) => {
      const g = quoi === 'filtre' && att && att.id === F.id && id === F.voulu;
      return `<button class="${P4.filtres[F.id] === id ? 'on' : ''}${g ? ' guide' : ''}" data-a="po-filtre:${F.id}:${id}">${esc(nom)}</button>`;
    }).join('');
    const filtres = PORTES.filtres.map(F => `<div class="po-filtre"><span>${esc(F.nom)}</span><div class="po-opts">${opts(F)}</div></div>`).join('')
      + O.fixes.map(([t, v]) => `<div class="po-filtre fixe"><span>${esc(t)}</span><div class="po-opts"><button class="on" disabled>${esc(v)}</button></div></div>`).join('');
    const recherche = `<section class="po-boite"><header>${esc(O.recherche)}</header><div class="po-filtres">${filtres}</div>
      <footer><span class="po-compte"><b>${P4.compte.toLocaleString('fr-FR')}</b> ${esc(O.compte)}</span>
      <button class="vs-bt${quoi === 'rechercher' ? ' guide' : ''}" data-a="po-rechercher">Rechercher</button></footer></section>`;
    if (!sel) return `<h2>Clients / contacts</h2><p class="vs-texte">${esc(O.rechercheNote)}</p>${recherche}`;
    const lignes = O.contacts.map(c => `<tr><td data-l="Nom"><b>${esc(c.nom.toUpperCase())}</b> ${esc(c.prenom)}</td><td data-l="Ville">${esc(c.cp + ' ' + c.ville)}</td>
      <td data-l="Catégorie">Particulier</td><td data-l="E-mail" class="c">${c.email ? '✓' : '·'}</td><td data-l="Mobile" class="c">${c.mobile ? '✓' : '·'}</td></tr>`).join('');
    const versBrevo = f && f.app === 'brevo' ? ' guide' : '';
    const actions = (C.ouverte ? `<p class="po-fait"><span class="vs-ok">${esc(O.campagneCreee)}</span><button class="vs-bt${versBrevo}" data-a="po-brevo">Ouvrir Brevo</button></p>`
      : `<button class="vs-bt vert gros${quoi === 'campagne' ? ' guide' : ''}" data-a="po-campagne">Créer la campagne</button>`)
      + (C.courrier ? `<p class="po-fait"><span class="vs-ok">${esc(O.courrierParti(S.courrier))}</span></p>`
        : `<button class="vs-bt gros${quoi === 'courrier' ? ' guide' : ''}" data-a="po-courrier">Créer le courrier</button>`);
    return `<h2>Clients / contacts</h2>${recherche}<section class="po-boite po-sel"><header>${esc(O.selection(S.total))}</header>
      <div class="po-canaux">${O.canaux.map(([k, t, c]) => `<p><b>${S[k]}</b><span>${esc(t)}</span><small>${esc(c)}</small></p>`).join('')}</div>
      <div class="po-actions">${actions}</div>
      <table class="vs-grille po-table"><thead><tr><th>Nom</th><th>Ville</th><th>Catégorie</th><th class="c">E-mail</th><th class="c">Mobile</th></tr></thead><tbody>${lignes}</tbody></table>
      <p class="vs-note">${esc(O.autres(S.total - O.contacts.length))}</p></section>`;
  }
  // « Créer le courrier » : le publipostage pour ceux qui n'ont pas d'adresse e-mail (marketing-emailing : publipostage,
  // routage postal, étiquettes d'expédition) ; la lettre d'un contact, la planche d'étiquettes, « Envoyer en routage »
  courrier() {
    const P4 = this.jeu.portes, S = PORTES.selection, K = PORTES.courrier, f = this.aFaire(), sans = O.contacts.filter(c => !c.email), d = sans[0];
    const adresse = c => `${esc(c.civ + ' ' + c.prenom + ' ' + c.nom)}<br>${esc(c.rue)}<br>${esc(c.cp + ' ' + c.ville)}`;
    const lettre = `<article class="po-lettre"><header>${esc(PORTES.domaine)}</header><address>${adresse(d)}</address>
      <p class="po-date">Le ${esc(dateJeu(this.jour, 'courte'))}</p><h4>${esc(K.titre)}</h4>${K.corps.map(p => `<p>${esc(p.replaceAll('{date}', this.dateJ))}</p>`).join('')}
      <p class="po-sign">${esc(O.signature)}</p><small>${esc(PORTES.email.mention)}</small></article>`;
    const etiq = `<div class="po-etiq"><b>${esc(K.etiquettes)}</b><div class="po-planche">${sans.map(c => `<p>${adresse(c)}</p>`).join('')}</div><small>${esc(O.planche(S.courrier))}</small></div>`;
    const bas = P4.campagne.courrier ? `<span class="vs-ok">${esc(O.courrierParti(S.courrier))}</span>`
      : `<button class="vs-bt vert gros${f && f.quoi === 'routage' ? ' guide' : ''}" data-a="po-routage">Envoyer en routage</button>`;
    return `<h2>${esc(O.courrier)}</h2><p class="vs-texte">${esc(O.publipostage(S.courrier))}</p>
      <p class="po-bas">${bas}<button class="vs-bt" data-a="vue:clients">Retour à la sélection</button></p><div class="po-courrier">${lettre}${etiq}</div>`;
  }
  // Analyse > Statistiques, après les portes ouvertes (statistiques-pilotage : nombre de factures, panier moyen, ventes
  // par familles de produits ; marketing-emailing : ouvertures, clics, les ventes des clients ciblés) ; « Remercier les
  // visiteurs » ouvre le merci dans Brevo
  statistiques() {
    const P4 = this.jeu.portes, s = P4.stats, S = O.stats, f = this.aFaire();
    const tuile = (cl, v, t) => `<div class="vs-tu ${cl}"><b>${v}</b><span>${t}</span></div>`;
    const tuiles = tuile('noir', s.tickets, 'Tickets de caisse') + tuile('vert', eur(s.ca), 'Chiffre d\'affaires TTC') + tuile('orange', eur(s.panier), 'Panier Moyen TTC')
      + tuile('noir', s.bouteilles, 'Bouteilles vendues') + tuile('bleu', s.visiteurs, 'Visiteurs') + tuile('rouge', s.invitesVenus, 'Invités venus');
    const max = Math.max(1, ...Object.values(s.parFamille).map(k => k.ca));
    const barres = PORTES.familles.filter(F => s.parFamille[F.id]).map(F => {
      const k = s.parFamille[F.id];
      return `<div class="po-barre"><span>${esc(F.nom)}</span><i><em style="width:${(k.ca / max * 100).toFixed(1)}%;background:${F.c}"></em></i><b>${k.q} · ${eur(k.ca)}</b></div>`;
    }).join('');
    const pct = x => Math.round(x * 100) + ' %';
    const camp = `<table class="vs-grille po-camp"><thead><tr><th>Canal</th><th class="n">Envoyés</th><th class="n">Ouvertures</th><th class="n">Clics</th></tr></thead><tbody>
      <tr><td data-l="Canal">Email (Brevo)</td><td data-l="Envoyés" class="n">${s.envoyes.email}</td><td data-l="Ouvertures" class="n">${pct(s.ouvertures)}</td><td data-l="Clics" class="n">${pct(s.clics)}</td></tr>
      <tr><td data-l="Canal">SMS (Brevo)</td><td data-l="Envoyés" class="n">${s.envoyes.sms}</td><td data-l="Ouvertures" class="n">·</td><td data-l="Clics" class="n">·</td></tr>
      <tr><td data-l="Canal">Courrier (routage)</td><td data-l="Envoyés" class="n">${s.envoyes.courrier}</td><td data-l="Ouvertures" class="n">·</td><td data-l="Clics" class="n">·</td></tr></tbody></table>`;
    const merci = P4.merci ? `<p class="po-fait"><span class="vs-ok">${esc(S.merciFait(s.destinataires))}</span></p>`
      : `<p class="po-bas"><button class="vs-bt vert gros${f && f.app === 'vitisoft' ? ' guide' : ''}" data-a="po-merci">${esc(S.remercier)}</button></p>`;
    return `<h2>${esc(S.titre(this.dateJ))}</h2>${merci}<div class="vs-tuiles po-tuiles">${tuiles}</div>
      <div class="po-stats"><section class="po-boite"><header>${esc(S.familles)}</header><div class="po-barres">${barres}</div></section>
      <section class="po-boite"><header>${esc(S.campagne)}</header>${camp}<p class="vs-note">${esc(S.note)}</p></section></div>`;
  }

  vitisoft(m) {
    const vue = this.vue === 'courrier' ? 'clients' : this.vue, gm = this.menuVoulu();
    const menu = V.menu.map(([r, items]) => `<b>${esc(r)}</b>${items.map(([id, t]) => `<button class="${id === vue ? 'on' : ''}${id === gm ? ' guide' : ''}" data-a="vue:${id}">${esc(t)}</button>`).join('')}`).join('');
    const corps = VUES.includes(this.vue) ? this[this.vue](m) : this.vuePortes() || this.fiche();
    return `<div class="vs"><header class="vs-barre"><button data-a="vue:accueil">VITISOFT</button><span>${esc(V.domaine)}</span></header>
      <div class="vs-corps"><nav class="vs-menu">${menu}</nav><main class="vs-main">${this.consigneVs()}${corps}</main></div>
      ${this.reglement ? this.fenReglement(m) : ''}</div>`;
  }

  afficher() {
    const m = this.jeu.mission, f = this.fenetre;
    // ce qui défile garde sa place quand on redessine le même écran
    const haut = s => this.el.querySelector(s)?.scrollTop || 0, menu = haut('.vs-menu'), main = haut('.vs-main'), bu = haut('.pt-bureau'), tel = this.jeu.tel;
    const bv = haut('.bv-main'), cs = haut('.cs-corps');
    const pied = `<p class="pc-h"><b class="pc-heure">${this.jeu.heureTxt}</b>${dateJeu(this.jour, 'chiffres')}</p>`;
    // mission 4 : la caisse, en plein écran (le portable sur le parvis) ; « Se lever » reste possible
    if (this.ecran === 'caisse') {
      $('pc-ecran').innerHTML = `<div class="pc-bureau pc-caisse"><section class="win cs-win"><header class="win-titre"><span>Sélection des produits</span></header>${this.caisse.html()}</section>
        <footer class="pc-barre"><button class="pc-lever" data-a="quitter">Se lever</button><div class="pc-taches"><span class="pc-t on"><span class="ic vitisoft">${ICONES.vitisoft}</span><b>Vitisoft</b></span></div>${pied}</footer></div>`;
      const e = this.el.querySelector('.cs-corps'); if (e) e.scrollTop = cs;
      this.montrerGuide();
      return;
    }
    // mission 4 : l'appli que la mission attend (son icône, ou sa fenêtre dans la barre des tâches, mise en évidence) ;
    // l'icône de Brevo une fois la campagne créée
    const voulu = (this.aFaire() || {}).app, P4 = this.jeu.portes;
    const icone = id => `<button class="pc-ico${this.conseil === id || (voulu === id && !this.ouvertes.includes(id)) ? ' conseil' : ''}" data-a="lancer:${id}"><span class="ic ${id}">${ICONES[id]}</span>${NOMS[id]}</button>`;
    const taches = this.ouvertes.map(id => `<button class="pc-t${f === id ? ' on' : ''}${voulu === id && f !== id ? ' guide' : ''}" data-a="tache:${id}" aria-label="${NOMS[id]}"><span class="ic ${id}">${ICONES[id]}</span><b>${NOMS[id]}</b></button>`).join('');
    const boutons = id => `<button data-a="reduire" aria-label="Réduire"><i class="moins"></i></button><button class="x" data-a="fermerF:${id}" aria-label="Fermer">×</button>`;
    let fen = '';
    if (f === 'vitisoft') fen = `<section class="win"><header class="win-titre"><span>Vitisoft</span>${boutons(f)}</header>${this.vitisoft(m)}</section>`;
    else if (f === 'brevo') fen = `<section class="win nav-fenetre bv-fenetre"><header class="win-titre nav"><span class="nav-o"><i class="nav-ic brevo"></i>Brevo</span>${boutons(f)}</header>${this.brevo.html()}</section>`;
    else if (NAVIGATEUR.includes(f)) {
      const corps = tel.vuePortable(f, this.ecrans[f]);
      this.ecrans[f] = tel.app;
      fen = `<section class="win nav-fenetre"><header class="win-titre nav"><span class="nav-o"><i class="nav-ic ${f}"></i>${NOMS[f]}</span>${boutons(f)}</header>
      <div class="pt-bureau app-${tel.app}">${corps}</div></section>`;
    }
    const brevo = (P4 && P4.campagne.ouverte) || this.conseil === 'brevo' || this.ouvertes.includes('brevo') ? icone('brevo') : '';
    $('pc-ecran').innerHTML = `<div class="pc-bureau"><div class="pc-icones">${icone('vitisoft')}${icone('bureau')}${icone('viticode')}${icone('phyto')}${brevo}</div>${this.penseBete(m)}${fen}
      <footer class="pc-barre"><button class="pc-lever" data-a="quitter">Se lever</button><div class="pc-taches">${taches}</div>${pied}</footer></div>`;
    const garder = (s, v) => { const e = this.el.querySelector(s); if (e) e.scrollTop = v; };
    garder('.vs-menu', menu);
    if (this.derniereVue === this.vue) garder('.vs-main', main);
    if (NAVIGATEUR.includes(f) && this.dernierEcran === f + tel.app) garder('.pt-bureau', bu);
    if (f === 'brevo' && this.dernierEcran === 'brevo' + this.brevo.onglet) garder('.bv-main', bv);
    this.derniereVue = this.vue; this.dernierEcran = NAVIGATEUR.includes(f) ? f + tel.app : f === 'brevo' ? 'brevo' + this.brevo.onglet : '';
    this.montrerGuide();
  }
  // mission 4 : ce qu'il faut toucher (mis en évidence) défile jusqu'à se voir, quand il vient de changer (pas à chaque
  // image : on peut faire défiler soi-même) ; seulement dans la zone qui défile (jamais la page du jeu)
  montrerGuide() {
    const g = this.el.querySelector('#pc-ecran .win .guide'), cle = g ? g.dataset.a : '';
    if (g && cle !== this.dernierGuide) {
      let z = g.parentElement; // (la zone qui défile vraiment : selon la taille de l'écran, ce n'est pas la même)
      while (z && z.id !== 'pc-ecran' && !(z.scrollHeight > z.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(z).overflowY))) z = z.parentElement;
      if (z && z.id !== 'pc-ecran') {
        const r = g.getBoundingClientRect(), b = z.getBoundingClientRect();
        if (r.bottom > b.bottom - 6) z.scrollTop += r.bottom - b.bottom + 14;
        else if (r.top < b.top + 6) z.scrollTop -= b.top - r.top + 14;
      }
    }
    this.dernierGuide = cle;
  }
}
