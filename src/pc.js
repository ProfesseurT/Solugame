// Le portable du bureau du chai : le bureau d'un ordinateur (fond d'écran, icônes, barre des tâches à l'heure du jeu).
// Deux icônes : Vitisoft, le logiciel installé (une icône sur le bureau, pas un onglet : Teddy, 24/11/2026), et Le bureau,
// l'extension web de Vitisoft, dans le navigateur (les mêmes écrans que sur le téléphone, telephone.js ; les appels
// partent du téléphone). L'interface de Vitisoft suit les captures du site (textes.js, VITISOFT) : barre noire, menu à
// gauche par rubriques, tableau de bord en tuiles, listes en grilles, fenêtre Règlement aux modes de paiement en tuiles.
// Trois choses à faire dans Vitisoft au retour de la tournée : saisir le règlement du chèque de l'épicerie (Liste des
// factures / Règlements), facturer les commandes signées dans le bureau (Liste des commandes / BL ; Factur-X, transmises
// par Pennylane, plateforme agréée), calculer la DRM du mois dernier (DRM / DMS ; à valider ensuite dans CIEL). Le
// journal des ventes et les encaissements partent chez le comptable. Un pense-bête collé sur le bureau de l'ordinateur
// les rappelle ; l'objectif du jeu est repris au-dessus de l'écran (le portable cache celui du jeu).
import { VITISOFT as V } from './textes.js';
import { ICONES as IC } from './telephone.js';
import { son } from './audio.js';
import { $, esc, eur, dateJeu, jourDe } from './outils.js';

const hl = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' hl';
const VUES = ['accueil', 'factures', 'commandes', 'drm']; // les écrans où l'on agit ; les autres disent ce qu'ils font
const NOMS = { vitisoft: 'Vitisoft', bureau: 'Le bureau' };
// l'icône de Vitisoft : le O du logo, un cercle ouvert en haut
const ICONES = { vitisoft: '<svg viewBox="0 0 24 24"><path d="M8.6 5.6a7.6 7.6 0 1 0 6.8 0" fill="none" stroke="#fff" stroke-width="3.4"/></svg>', bureau: IC.bureau };
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
    this.vue = 'accueil'; this.reglement = false; this.mode = ''; this.envoi = null; this.tEnvoi = 0; this.tDrm = 0;
    this.obj = ''; this.heure = '';
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      e.preventDefault(); son.jouer('tap');
      const [nom, arg] = b.dataset.a.split(':'), m = this.jeu.mission, tel = this.jeu.tel;
      // l'ordinateur : ouvrir une icône, passer d'une fenêtre à l'autre, réduire, fermer, se lever
      if (nom === 'quitter') { this.lever(); return; }
      if (nom === 'lancer') { this.lancer(arg); this.afficher(); return; }
      if (nom === 'tache') { this.fenetre = this.fenetre === arg ? null : arg; this.afficher(); return; }
      if (nom === 'reduire') { this.fenetre = null; this.afficher(); return; }
      if (nom === 'fermerF') {
        // Vitisoft fermé quand tout est fait au retour de la tournée : on se lève, c'est la fin de la mission
        if (arg === 'vitisoft' && m.toutFait && m.etape === 'pc') { this.lever(); return; }
        this.ouvertes = this.ouvertes.filter(f => f !== arg); this.fenetre = this.ouvertes[0] || null;
        this.afficher(); return;
      }
      if (this.fenetre === 'bureau') {
        // un appel part du téléphone, le bon de livraison s'y signe (on revient ensuite au portable, bureau.js) ; le reste se
        // fait ici, comme sur le téléphone
        if (nom === 'rappel' && m.client(arg)?.mode === 'appel') { if (m.appelEnCours) return; this.fermer(); tel.ouvrir('bureau'); m.rappel(arg); return; }
        if (nom === 'r-appel') { if (m.appelEnCours) return; this.fermer(); tel.ouvrir('bureau'); tel.action(b.dataset.a); return; } // (un restaurateur du coin)
        if (nom === 'bl') { if (m.blPret) { this.fermer(); tel.ouvrir('bl'); } return; }
        tel.action(b.dataset.a);
        this.afficher();
        return;
      }
      if (nom === 'vue') { this.vue = arg; this.reglement = false; }
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
  // restent dans la barre) ; sans app, on revient au portable tel qu'on l'a laissé (après un appel)
  ouvrir(app) {
    if (app) { this.conseil = app; this.fenetre = null; }
    this.ouvert = true; this.el.hidden = false; this.obj = ''; this.update(0); this.afficher();
  }
  fermer() { this.ouvert = false; this.el.hidden = true; }
  lever() { this.fermer(); this.jeu.mission.fermerPC(); this.jeu.leverPortable(); }
  lancer(app) {
    if (!this.ouvertes.includes(app)) { this.ouvertes.push(app); if (app === 'vitisoft') { this.vue = 'accueil'; this.reglement = false; } }
    this.fenetre = app; if (this.conseil === app) this.conseil = null;
  }
  update(dt) {
    if (!this.ouvert) return;
    const m = this.jeu.mission;
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
    const r = m.retardataire.statut, livrees = m.clients.filter(c => ['livree', 'facturee', 'transmise'].includes(c.statut));
    const t = [];
    if (r === 'depose' || r === 'saisi') t.push([V.tacheReglement, r === 'saisi']);
    if (livrees.length) t.push([V.tacheFactures(livrees.length), livrees.every(c => c.statut === 'transmise')]);
    t.push([V.tacheDrm, m.drm === 'faite']);
    return `<aside class="pc-note"><b>Dans Vitisoft</b>${t.map(([x, ok]) => `<span${ok ? ' class="ok"' : ''}>${esc(x)}</span>`).join('')}</aside>`;
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

  vitisoft(m) {
    const menu = V.menu.map(([r, items]) => `<b>${esc(r)}</b>${items.map(([id, t]) => `<button class="${id === this.vue ? 'on' : ''}" data-a="vue:${id}">${esc(t)}</button>`).join('')}`).join('');
    return `<div class="vs"><header class="vs-barre"><button data-a="vue:accueil">VITISOFT</button><span>${esc(V.domaine)}</span></header>
      <div class="vs-corps"><nav class="vs-menu">${menu}</nav><main class="vs-main">${VUES.includes(this.vue) ? this[this.vue](m) : this.fiche()}</main></div>
      ${this.reglement ? this.fenReglement(m) : ''}</div>`;
  }

  afficher() {
    const m = this.jeu.mission, f = this.fenetre;
    // ce qui défile garde sa place quand on redessine le même écran
    const haut = s => this.el.querySelector(s)?.scrollTop || 0, menu = haut('.vs-menu'), main = haut('.vs-main'), bu = haut('.pt-bureau');
    const icone = id => `<button class="pc-ico${this.conseil === id ? ' conseil' : ''}" data-a="lancer:${id}"><span class="ic ${id}">${ICONES[id]}</span>${NOMS[id]}</button>`;
    const taches = this.ouvertes.map(id => `<button class="pc-t${f === id ? ' on' : ''}" data-a="tache:${id}"><span class="ic ${id}">${ICONES[id]}</span>${NOMS[id]}</button>`).join('');
    const boutons = id => `<button data-a="reduire" aria-label="Réduire"><i class="moins"></i></button><button class="x" data-a="fermerF:${id}" aria-label="Fermer">×</button>`;
    let fen = '';
    if (f === 'vitisoft') fen = `<section class="win"><header class="win-titre"><span>Vitisoft</span>${boutons(f)}</header>${this.vitisoft(m)}</section>`;
    else if (f === 'bureau') fen = `<section class="win nav-fenetre"><header class="win-titre nav"><span class="nav-o"><i class="nav-ic"></i>Le bureau</span>${boutons(f)}</header>
      <div class="pt-bureau">${this.jeu.tel.vuePortable()}</div></section>`;
    $('pc-ecran').innerHTML = `<div class="pc-bureau"><div class="pc-icones">${icone('vitisoft')}${icone('bureau')}</div>${this.penseBete(m)}${fen}
      <footer class="pc-barre"><button class="pc-lever" data-a="quitter">Se lever</button><div class="pc-taches">${taches}</div>
      <p class="pc-h"><b class="pc-heure">${this.jeu.heureTxt}</b>${dateJeu(this.jour, 'chiffres')}</p></footer></div>`;
    const garder = (s, v) => { const e = this.el.querySelector(s); if (e) e.scrollTop = v; };
    garder('.vs-menu', menu);
    if (this.derniereVue === this.vue) garder('.vs-main', main);
    if (f === 'bureau' && this.dernierBureau === this.jeu.tel.app) garder('.pt-bureau', bu);
    this.derniereVue = this.vue; if (f === 'bureau') this.dernierBureau = this.jeu.tel.app;
  }
}
