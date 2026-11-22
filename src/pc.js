// Le PC du domaine, dans le chai : Vitisoft, version simplifiée.
// Trois choses à faire au retour de la tournée : saisir le règlement du chèque de l'épicerie, facturer les
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
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      e.preventDefault(); son.jouer('tap');
      const [nom, arg] = b.dataset.a.split(':'), m = this.jeu.mission;
      if (nom === 'vue') this.vue = arg;
      else if (nom === 'regler') m.saisirReglement();
      else if (nom === 'fac') m.facturer(arg);
      else if (nom === 'env' && !this.envoi) { this.envoi = arg; this.tEnvoi = 1.1; son.jouer('envoi'); }
      else if (nom === 'drm') { m.calculerDRM(); this.tDrm = 1.4; }
      else if (nom === 'fermer') { this.fermer(); m.fermerPC(); return; }
      this.afficher();
    });
  }
  ouvrir() { this.ouvert = true; this.el.hidden = false; this.vue = 'accueil'; this.afficher(); }
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

  // l'écran d'accueil : les trois tâches du soir, chacune avec son état
  accueil(m) {
    const etats = [m.retardataire.statut === 'saisi', m.toutTransmis, m.drm === 'faite'], vues = ['reglements', 'commandes', 'drm'];
    const lignes = VITISOFT.taches.map((t, i) => `<tr><td data-l="À faire"><b>${esc(t)}</b></td>
      <td data-l="État" class="a">${etats[i] ? '<span class="vs-ok">Fait ✓</span>' : `<button class="vs-bt" data-a="vue:${vues[i]}">Ouvrir</button>`}</td></tr>`).join('');
    return `<h2>À faire ce soir</h2><table class="vs-table"><tbody>${lignes}</tbody></table>${this.fin(m)}`;
  }
  reglements(m) {
    const r = m.retardataire, saisi = r.statut === 'saisi';
    const act = saisi ? '<span class="vs-ok">Réglée ✓</span>' : '<span class="vs-fx">En retard</span><button class="vs-bt vert" data-a="regler">Saisir le règlement</button>';
    return `<h2>${esc(VITISOFT.reglements)}</h2>
      <table class="vs-table"><thead><tr><th>Facture</th><th>Client</th><th>Objet</th><th>Mode</th><th class="n">Montant TTC</th><th>Règlement</th></tr></thead><tbody>
      <tr><td data-l="Facture"><b>${r.facture}</b></td><td data-l="Client">${esc(r.nom)}</td><td data-l="Objet">${esc(r.detail)}</td>
      <td data-l="Mode">Chèque</td><td data-l="Montant TTC" class="n">${eur(r.ttc)}</td><td data-l="Règlement" class="a">${act}</td></tr></tbody></table>
      ${saisi ? `<p class="vs-note">${esc(VITISOFT.reglementSaisi)}</p>` : ''}${this.fin(m)}`;
  }
  commandes(m) {
    const lignes = m.ordre.map(c => {
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
      <tfoot><tr><td colspan="4">Total</td><td class="n">${eur(m.ht)}</td><td></td></tr></tfoot></table>
      <p class="vs-note">${esc(VITISOFT.factureCreee)} ${esc(VITISOFT.transmise)}</p>
      ${m.toutTransmis ? `<p class="vs-note"><b>3 factures transmises.</b> ${esc(VITISOFT.journal)}</p>` : ''}${this.fin(m)}`;
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

  afficher() {
    const m = this.jeu.mission;
    const menu = VITISOFT.menu.map(x => `<button class="${x.id === this.vue ? 'on' : ''}" data-a="vue:${x.id}">${esc(x.t)}</button>`).join('');
    let corps;
    if (VUES.includes(this.vue)) corps = this[this.vue](m);
    else {
      const x = VITISOFT.menu.find(i => i.id === this.vue);
      corps = `<h2>${esc(x.t)}</h2><p class="vs-texte">${esc(x.d)}</p><p class="vs-note">Dans le jeu complet.</p>`;
    }
    $('pc-ecran').innerHTML = `<div class="vs">
      <header class="vs-barre"><b>Vitisoft</b><span>Domaine du Clos Libre</span><button class="vs-x" data-a="fermer" aria-label="Fermer Vitisoft">×</button></header>
      <div class="vs-corps"><nav class="vs-menu">${menu}</nav><main class="vs-main">${corps}</main></div></div>`;
    // sur téléphone, le menu défile en largeur : l'onglet ouvert reste visible
    const nav = this.el.querySelector('.vs-menu'), on = nav && nav.querySelector('.on');
    if (on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, on.offsetLeft - 8);
  }
}
