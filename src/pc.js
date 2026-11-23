// Le portable du bureau du chai : un navigateur à deux onglets, Le bureau (les mêmes écrans que sur le téléphone,
// telephone.js) et Vitisoft, version simplifiée. Les appels du bureau partent du téléphone.
// Trois choses à faire dans Vitisoft au retour de la tournée : saisir le règlement du chèque de l'épicerie, facturer les
// commandes signées dans le bureau (Factur-X, transmises par Pennylane, plateforme agréée), calculer la DRM du
// mois dernier (à valider ensuite dans CIEL). Le journal des ventes et les encaissements partent chez le comptable.
import { VITISOFT } from './textes.js';
import { eur } from './telephone.js';
import { son } from './audio.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hl = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' hl';
const VUES = ['accueil', 'reglements', 'commandes', 'drm']; // les écrans où l'on agit ; les autres sont des fiches

export class PC {
  constructor(jeu) {
    this.jeu = jeu; this.el = $('pc'); this.ouvert = false; this.vue = 'accueil'; this.envoi = null; this.tEnvoi = 0; this.tDrm = 0;
    this.onglet = 'bureau';
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      e.preventDefault(); son.jouer('tap');
      const [nom, arg] = b.dataset.a.split(':'), m = this.jeu.mission, tel = this.jeu.tel;
      // le navigateur : changer d'onglet, se lever du portable (Vitisoft fermé quand tout est fait : fin de la mission)
      if (nom === 'onglet') { this.onglet = arg; this.afficher(); return; }
      if (nom === 'quitter' || nom === 'fermer') { this.fermer(); m.fermerPC(); this.jeu.leverPortable(); return; }
      if (this.onglet === 'bureau') {
        // un appel part du téléphone ; le reste se fait ici, comme sur le téléphone
        if (nom === 'rappel' && m.client(arg)?.mode === 'appel') { if (m.appelEnCours) return; this.fermer(); tel.ouvrir('bureau'); m.rappel(arg); return; }
        tel.action(b.dataset.a);
        this.afficher();
        return;
      }
      if (nom === 'vue') this.vue = arg;
      else if (nom === 'regler') m.saisirReglement();
      else if (nom === 'fac') m.facturer(arg);
      else if (nom === 'env' && !this.envoi) { this.envoi = arg; this.tEnvoi = 1.1; son.jouer('envoi'); }
      else if (nom === 'drm') { m.calculerDRM(); this.tDrm = 1.4; }
      this.afficher();
    });
  }
  // onglet : 'bureau' ou 'vitisoft' (sinon, celui d'avant)
  ouvrir(onglet) { if (onglet) { this.onglet = onglet; this.vue = 'accueil'; } this.ouvert = true; this.el.hidden = false; this.afficher(); }
  fermer() { this.ouvert = false; this.el.hidden = true; }
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
  }

  // l'écran d'accueil : ce qu'il y a à faire, d'après ce qui est arrivé (rien d'avance : le chèque déposé au bureau, les
  // commandes livrées), chacune avec son état ; la DRM du mois dernier se calcule quand on veut
  accueil(m) {
    const r = m.retardataire.statut, livrees = m.ordre.filter(c => ['livree', 'facturee', 'transmise'].includes(c.statut));
    const taches = [];
    if (r === 'depose' || r === 'saisi') taches.push([VITISOFT.tacheReglement, r === 'saisi', 'reglements']);
    if (livrees.length) taches.push([VITISOFT.tacheFactures(livrees.length), livrees.every(c => c.statut === 'transmise'), 'commandes']);
    taches.push([VITISOFT.tacheDrm, m.drm === 'faite', 'drm']);
    const lignes = taches.map(([t, fait, vue]) => `<tr><td data-l="À faire"><b>${esc(t)}</b></td>
      <td data-l="État" class="a">${fait ? '<span class="vs-ok">Fait ✓</span>' : `<button class="vs-bt" data-a="vue:${vue}">Ouvrir</button>`}</td></tr>`).join('');
    return `<h2>À faire</h2><table class="vs-table"><tbody>${lignes}</tbody></table>${taches.length < 3 ? `<p class="vs-note">${esc(VITISOFT.rienAFaire)}</p>` : ''}${this.fin(m)}`;
  }
  reglements(m) {
    const r = m.retardataire, saisi = r.statut === 'saisi';
    // on ne saisit le règlement qu'une fois le chèque déposé au bureau
    const act = saisi ? '<span class="vs-ok">Réglée ✓</span>' : r.statut === 'depose' ? '<span class="vs-fx">En retard</span><button class="vs-bt vert" data-a="regler">Saisir le règlement</button>'
      : `<span class="vs-fx">En retard</span><span class="vs-gris">${esc(VITISOFT.chequeAttendu)}</span>`;
    return `<h2>${esc(VITISOFT.reglements)}</h2>
      <table class="vs-table"><thead><tr><th>Facture</th><th>Client</th><th>Objet</th><th>Mode</th><th class="n">Montant TTC</th><th>Règlement</th></tr></thead><tbody>
      <tr><td data-l="Facture"><b>${r.facture}</b></td><td data-l="Client">${esc(r.nom)}</td><td data-l="Objet">${esc(r.detail)}</td>
      <td data-l="Mode">${['depose', 'saisi'].includes(r.statut) ? 'Chèque' : '·'}</td><td data-l="Montant TTC" class="n">${eur(r.ttc)}</td><td data-l="Règlement" class="a">${act}</td></tr></tbody></table>
      ${saisi ? `<p class="vs-note">${esc(VITISOFT.reglementSaisi)}</p>` : ''}${this.fin(m)}`;
  }
  // les commandes arrivées du bureau : seulement celles que le client a signées en ligne
  commandes(m) {
    const arrivees = m.ordre.filter(c => !['a_traiter', 'proposee', 'commande', 'envoyee'].includes(c.statut));
    if (!arrivees.length) return `<h2>${esc(VITISOFT.arrivees)}</h2><p class="vs-texte">${esc(VITISOFT.aucuneCommande)}</p>${this.fin(m)}`;
    const total = arrivees.reduce((s, c) => s + m.htClient(c), 0), transmises = arrivees.filter(c => c.statut === 'transmise').length;
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
        <td data-l="Signée en ligne" class="c">✓</td><td data-l="Livrée, BL signé" class="c">${['livree', 'facturee', 'transmise'].includes(c.statut) ? '✓ ' + c.bl : '·'}</td>
        <td data-l="Montant HT" class="n">${eur(ht)}</td><td data-l="Facture" class="a">${fac}${act}</td></tr>`;
    }).join('');
    return `<h2>${esc(VITISOFT.arrivees)}</h2>
      <table class="vs-table"><thead><tr><th>Commande</th><th>Client</th><th class="c">Signée en ligne</th><th class="c">Livrée, BL signé</th><th class="n">Montant HT</th><th>Facture</th></tr></thead><tbody>${lignes}</tbody>
      <tfoot><tr><td colspan="4">Total</td><td class="n">${eur(total)}</td><td></td></tr></tfoot></table>
      <p class="vs-note">${esc(VITISOFT.factureCreee)} ${esc(VITISOFT.transmise)}</p>
      ${transmises ? `<p class="vs-note"><b>${transmises > 1 ? `${transmises} factures transmises` : '1 facture transmise'}.</b> ${esc(VITISOFT.journal)}</p>` : ''}${this.fin(m)}`;
  }
  drm(m) {
    const faite = m.drm === 'faite';
    const bas = faite ? `<p class="vs-note"><span class="vs-ok">${esc(VITISOFT.drmFaite)}</span></p>`
      : m.drm === 'calcul' ? '<p class="vs-note"><span class="vs-envoi"><i class="roue petite"></i>Vitisoft calcule la DRM...</span></p>'
        : '<p class="vs-note"><button class="vs-bt vert" data-a="drm">Calculer la DRM</button></p>';
    const tab = faite ? `<table class="vs-table"><tbody>${VITISOFT.drmLignes.map(([t, v]) => `<tr><td data-l="Poste">${esc(t)}</td><td data-l="Volume" class="n">${hl(v)}</td></tr>`).join('')}</tbody></table>` : '';
    return `<h2>${esc(VITISOFT.drmTitre)}</h2><p class="vs-texte">${esc(VITISOFT.drm)}</p>${tab}${bas}${this.fin(m)}`;
  }
  // tout est fait : on peut fermer Vitisoft (la mission se termine)
  fin(m) {
    return m.toutFait ? `<div class="vs-fin"><b>Tout est fait pour ce soir.</b> ${esc(VITISOFT.journal)}<button class="vs-bt" data-a="fermer">Fermer Vitisoft</button></div>` : '';
  }

  vitisoft(m) {
    const menu = VITISOFT.menu.map(x => `<button class="${x.id === this.vue ? 'on' : ''}" data-a="vue:${x.id}">${esc(x.t)}</button>`).join('');
    let corps;
    if (VUES.includes(this.vue)) corps = this[this.vue](m);
    else {
      const x = VITISOFT.menu.find(i => i.id === this.vue);
      corps = `<h2>${esc(x.t)}</h2><p class="vs-texte">${esc(x.d)}</p><p class="vs-note">Dans le jeu complet.</p>`;
    }
    return `<div class="vs"><header class="vs-barre"><b>Vitisoft</b><span>Domaine du Clos Libre</span></header>
      <div class="vs-corps"><nav class="vs-menu">${menu}</nav><main class="vs-main">${corps}</main></div></div>`;
  }

  afficher() {
    const m = this.jeu.mission, v = this.onglet === 'vitisoft';
    const onglet = (id, t) => `<button class="nav-o${this.onglet === id ? ' on' : ''}" data-a="onglet:${id}"><i class="nav-ic ${id}"></i>${t}</button>`;
    const page = this.el.querySelector('.nav-page'), haut = page ? page.scrollTop : 0;
    $('pc-ecran').innerHTML = `<div class="nav-fenetre"><div class="nav"><div class="nav-onglets">${onglet('bureau', 'Le bureau')}${onglet('vitisoft', 'Vitisoft')}</div>
      <button class="nav-x" data-a="quitter" aria-label="Se lever du portable">×</button></div>
      <div class="nav-page">${v ? this.vitisoft(m) : `<div class="pt-bureau">${this.jeu.tel.vuePortable()}</div>`}</div></div>`;
    if (!v) { const p = this.el.querySelector('.pt-bureau'); if (p && this.dernierBureau === this.jeu.tel.app) p.scrollTop = haut; this.dernierBureau = this.jeu.tel.app; }
    // sur téléphone, le menu de Vitisoft défile en largeur : l'onglet ouvert reste visible
    const nav = this.el.querySelector('.vs-menu'), on = nav && nav.querySelector('.on');
    if (on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, on.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft - 8);
  }
}
