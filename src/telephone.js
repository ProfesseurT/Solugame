// Le téléphone du personnage : la mise en abyme. Le bureau (vendre, faire signer, livrer),
// Viticode, Registre phyto, Messages, Réglages. Vitisoft n'est pas sur téléphone : il est sur le PC du domaine.
// Tout texte vient de textes.js.
import { VITICODE, PHYTO, LP_URL, MESSAGES, VERSION, BUREAU, CONSIGNE_QTE } from './textes.js';
import { son } from './audio.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const eur = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const ICONES = {
  bureau: '<svg viewBox="0 0 24 24"><path d="M9 7V5.5h6V7" fill="none" stroke="#fff" stroke-width="2"/><rect x="3" y="7" width="18" height="12" rx="2.5" fill="#fff"/><rect x="3" y="11.5" width="18" height="1.6" fill="#8e2a3b" opacity=".35"/></svg>',
  viticode: '<svg viewBox="0 0 24 24"><g fill="#fff"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3v2h-3zM14 18h2v3h-2z"/></g><g fill="#ff3d8b"><path d="M5 5h3v3H5zM16 5h3v3h-3zM5 16h3v3H5z"/></g></svg>',
  phyto: '<svg viewBox="0 0 24 24"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z" fill="#fff"/><path d="M5 19L15 9" stroke="#2fc6e0" stroke-width="1.8"/></svg>',
  messages: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z" fill="#fff"/></svg>',
  reglages: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.2" fill="none" stroke="#fff" stroke-width="3.2" stroke-dasharray="3.4 2.2"/><circle cx="12" cy="12" r="3" fill="#fff"/></svg>',
};
const APPS = [['bureau', 'Le bureau'], ['viticode', 'Viticode'], ['phyto', 'Registre phyto'], ['messages', 'Messages'], ['reglages', 'Réglages']];
const STATUTS = {
  a_traiter: ['jour', 'À traiter'], proposee: ['decroche', 'Message envoyé'], commande: ['jour', 'Commande à préparer'],
  envoyee: ['decroche', 'Signature en attente'], signee: ['ok', 'Signée en ligne'], chargee: ['ok', 'Chargée'],
  livree: ['ok', 'Livrée, BL signé'], facturee: ['ok', 'Livrée, facturée'], transmise: ['ok', 'Livrée, facturée'],
};

export class Telephone {
  constructor(jeu) {
    this.jeu = jeu; this.el = $('tel'); this.app = 'accueil'; this.ouvert = false;
    this.notif = null; this.fil = null; this.tAppel = 0; this.client = 'cave'; this.encre = 0;
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      e.preventDefault();
      son.jouer('tap');
      this.action(b.dataset.a);
    });
    $('voile').addEventListener('click', () => { if (this.jeu.mission.peutFermer()) this.fermer(); });
  }

  ouvrir(app) {
    if (app) this.app = app;
    else if (this.notif) this.app = this.notif;
    if (this.app === this.notif) this.notifier(null);
    this.ouvert = true;
    this.el.classList.add('ouvert'); this.el.setAttribute('aria-hidden', 'false');
    $('voile').classList.add('vu');
    this.afficher();
  }
  fermer() {
    if (this.app === 'appel' || this.app === 'message') this.app = 'bureau';
    this.ouvert = false;
    this.el.classList.remove('ouvert'); this.el.setAttribute('aria-hidden', 'true');
    $('voile').classList.remove('vu');
  }
  basculer() { if (this.ouvert) { if (this.jeu.mission.peutFermer()) this.fermer(); } else this.ouvrir(); }
  notifier(app) {
    this.notif = app; this.jeu.hud.notifier(app ? 1 : 0);
    if (this.ouvert && ['accueil', 'bureau', 'commande', 'tournee'].includes(this.app)) this.afficher();
  }

  action(a) {
    const [nom, arg] = a.split(':');
    const m = this.jeu.mission;
    if (!m.peutFermer() && (nom === 'accueil' || nom === 'ouvrir')) return; // pendant un appel, on reste en ligne
    switch (nom) {
      case 'accueil': this.app = 'accueil'; this.fil = null; break;
      case 'ouvrir': this.app = arg; this.fil = null; if (arg === this.notif) this.notifier(null); break;
      case 'rappel': m.rappel(arg); return;
      case 'cmd': this.client = arg; this.app = 'commande'; m.saisir(arg); break;
      case 'qte': m.quantite(this.client, Number(arg)); break;
      // mauvaise quantité : la commande ne part pas, le téléphone rappelle ce que le client a demandé
      case 'signer': if (!m.envoyerCommande(this.client)) { son.jouer('erreur'); this.toast(CONSIGNE_QTE(m.client(this.client))); return; } break;
      case 'msg': m.envoyerMessage(this.client); this.app = 'bureau'; this.afficher(); this.toast('Message envoyé à Bar Le Cep.'); return;
      case 'tournee': m.demarrerTournee(); return;
      case 'cheque': m.planifierCheque(); break;
      case 'bl': this.app = 'bl'; break;
      case 'effacer': this.afficher(); return;
      case 'livrer': if (this.encre > 120) { m.livrer(); this.fermer(); } return;
      case 'fil': this.fil = arg; break;
      case 'son': son.basculer(); break;
      case 'radio': this.jeu.basculerRadio(); break;
      case 'heros': this.jeu.changerHeros(arg); break;
      case 'bientot': this.toast('Dans le jeu complet.'); return;
    }
    this.afficher();
  }
  toast(txt) {
    const t = this.el.querySelector('.ph-toast');
    if (!t) return;
    t.textContent = txt; t.classList.remove('vu'); void t.offsetWidth; t.classList.add('vu');
  }
  update(dt) {
    if (!this.ouvert || this.app !== 'appel') return;
    this.tAppel += dt;
    const el = $('ph-duree');
    if (el) el.textContent = '00:' + String(Math.floor(this.tAppel)).padStart(2, '0');
    // la conversation s'affiche dans l'écran d'appel (le téléphone couvre les sous-titres)
    const l = this.jeu.hud.ligne, ligne = $('ph-ligne');
    if (ligne && l && ligne.dataset.t !== l.txt) {
      ligne.dataset.t = l.txt; ligne.textContent = '';
      const b = document.createElement('b'); b.textContent = l.qui || 'Vous'; ligne.append(b, document.createTextNode(l.txt));
    }
  }

  afficher() {
    const ecran = $('app'), avant = this.dernier;
    this.precedent = avant;
    ecran.className = 'app app-' + this.app;
    ecran.innerHTML = this[this.app]() + '<p class="ph-toast" role="status"></p>';
    if (avant !== this.app) { ecran.scrollTop = 0; this.dernier = this.app; }
    if (this.app === 'bl') this.brancherPad();
  }

  // pavé de signature : le client signe du doigt (ou à la souris)
  brancherPad() {
    const cv = $('pad'), bt = $('bt-livrer');
    if (!cv) return;
    // taille réelle du pavé (offsetWidth) : le cadre du téléphone peut être en pleine rotation à l'ouverture
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.offsetWidth || 300, Hh = cv.offsetHeight || 150;
    cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(Hh * dpr));
    const c = cv.getContext('2d');
    c.scale(dpr, dpr); c.lineWidth = 2.6; c.lineCap = c.lineJoin = 'round'; c.strokeStyle = '#1d2a5a';
    this.encre = 0;
    let dessin = false, px = 0, py = 0;
    const pos = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * W / (b.width || W), (e.clientY - b.top) * Hh / (b.height || Hh)]; };
    cv.addEventListener('pointerdown', e => { dessin = true; [px, py] = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* rien */ } e.preventDefault(); });
    cv.addEventListener('pointermove', e => {
      if (!dessin) return;
      const [x, y] = pos(e);
      c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
      this.encre += Math.hypot(x - px, y - py); px = x; py = y; son.jouer('stylo');
      if (this.encre > 120 && bt.disabled) { bt.disabled = false; son.jouer('signe'); $('pad-aide').textContent = 'Signé. Vous pouvez valider la livraison.'; }
    });
    const fin = () => { dessin = false; };
    cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  }

  /* ------------------------------------------------------------ écrans */
  entete(titre, classe, retour = 'accueil') {
    const r = this.jeu.mission.peutFermer() ? `<button class="ap-ret" data-a="${retour}" aria-label="Retour">‹</button>` : '<i class="ap-ret vide"></i>';
    return `<header class="ap-tete ${classe}">${r}<span>${esc(titre)}</span><i class="ap-ic">${ICONES[classe] || ''}</i></header>`;
  }
  onglets(actif) {
    return `<nav class="onglets">${[['bureau', 'Ma journée'], ['commande', 'Commandes'], ['tournee', 'Tournée']].map(([id, t]) =>
      `<button class="${id === actif ? 'on' : ''}" data-a="ouvrir:${id}">${t}</button>`).join('')}</nav>`;
  }
  accueil() {
    const n = this.notif === 'bureau'
      ? `<button class="ph-notif" data-a="ouvrir:bureau"><span class="ic bureau">${ICONES.bureau}</span><span><b>Le bureau</b><br>${esc(this.jeu.mission.message)}</span></button>` : '';
    return `<div class="ph-accueil">
      <p class="ph-gheure">${esc(this.jeu.heureTxt)}</p><p class="ph-lieu">Le Bourg · ciel dégagé</p>${n}
      <div class="ph-grille">${APPS.map(([id, nom]) => `<button class="ph-ico" data-a="ouvrir:${id}"><span class="ic ${id}">${ICONES[id]}${this.notif === id ? '<b class="pastille">1</b>' : ''}</span><span class="nom">${esc(nom)}</span></button>`).join('')}</div>
    </div>`;
  }
  // Ma journée : les 3 rappels, avec l'action du moment pour chacun
  bureau() {
    const m = this.jeu.mission, e = m.etape;
    const lignes = m.clients.map(c => {
      let tag = `<span class="tag ${c.tagC}">${esc(c.tag)}</span>`, bt;
      if (c.statut === 'a_traiter') bt = `<button class="ap-bt plein" data-a="rappel:${c.id}"${m.appelEnCours ? ' disabled' : ''}>${esc(c.action)}</button>`;
      else if (c.statut === 'commande') bt = `<button class="ap-bt plein" data-a="cmd:${c.id}">Préparer la commande</button>`;
      else { const [k, t] = STATUTS[c.statut]; tag = `<span class="tag ${k}">${t}</span>`; bt = ''; }
      return `<div class="rappel"><span class="av" style="background:${c.coul}">${c.ini}</span><div class="rq"><b>${esc(c.nom)} · ${esc(c.lieu)}</b><span>${esc(c.note)}</span><div class="rl">${tag}${bt}</div></div></div>`;
    }).join('');
    let carte = '';
    if (e === 'tournee') carte = '<div class="carte-a-faire bureau"><p class="ap-sur">Tournée du jour</p><b>4 arrêts, tout est chargé</b><button class="ap-bt plein" data-a="ouvrir:tournee">Voir la tournée</button></div>';
    else if (m.attenteBL) carte = `<div class="carte-a-faire bureau"><p class="ap-sur">Livraison en cours</p><b>${esc(m.client(m.attenteBL).nom)}</b><button class="ap-bt plein" data-a="bl">Faire signer le bon de livraison</button></div>`;
    else if (e === 'chai') carte = '<div class="carte-a-faire bureau"><p class="ap-sur">Commandes envoyées</p><b>Chargez-les au chai dès qu\'elles sont signées</b></div>';
    // le règlement en retard : une tâche du jour, qu'on ajoute soi-même à la tournée
    const r = m.retardataire, planifie = r.statut !== 'a_planifier';
    const reglement = `<div class="rappel"><span class="av" style="background:${r.coul}">${r.ini}</span><div class="rq"><b>${esc(r.nom)} · ${esc(r.lieu)}</b>
      <span>Facture ${r.facture}, ${eur(r.ttc)} : passer récupérer le règlement</span><div class="rl">${planifie
        ? '<span class="tag ok">Dans la tournée</span>' : `<span class="tag retard">En retard</span><button class="ap-bt plein" data-a="cheque">Ajouter à la tournée</button>`}</div></div></div>`;
    return this.entete('Le bureau', 'bureau') + this.onglets('bureau') + `<div class="ap-corps">${carte}
      <p class="ap-sur">Ma journée</p><h3>Bonjour.</h3><p class="ap-sous">3 rappels et 1 règlement en retard aujourd'hui.</p>
      <div class="tuiles"><div class="tu rouge"><b>1</b>Rappel en retard</div><div class="tu bleu"><b>2</b>Rappels du jour</div><div class="tu rouge"><b>1</b>Règlement en retard</div></div>
      <p class="ap-h">À faire aujourd'hui</p>${lignes}
      <p class="ap-h">Règlement en retard</p>${reglement}</div>`;
  }
  // Commandes : le formulaire du client en cours, la confirmation d'envoi, ou la liste
  commande() {
    const m = this.jeu.mission, c = m.client(this.client);
    const tete = this.entete('Commandes', 'bureau', 'ouvrir:bureau') + this.onglets('commande');
    if (c && c.statut === 'commande') {
      const bt = c.cartons * 6, ht = bt * c.pu;
      // la quantité part de zéro ; la consigne (jeu, pas appli) rappelle ce que le client a dit au téléphone
      return tete + `<div class="ap-corps">
        <p class="consigne">${esc(CONSIGNE_QTE(c))}</p>
        <p class="ap-sur">Nouvelle commande · ${c.numero}</p><p class="fc-client"><b>${esc(c.nom)}</b><br>${esc(c.lieu)}</p>
        <p class="ap-note">${esc(BUREAU.commande)}</p>
        <div class="cd-ligne"><span><b>${esc(c.produit)}</b><br><small>${bt} bouteilles · ${eur(c.pu)} HT la bouteille</small></span>
          <div class="pas"><button data-a="qte:-1" aria-label="Un carton de moins"${c.cartons <= 0 ? ' disabled' : ''}>−</button><b>${c.cartons}</b><button data-a="qte:1" aria-label="Un carton de plus"${c.cartons >= 12 ? ' disabled' : ''}>+</button></div></div>
        <p class="ap-note">Cartons de 6 bouteilles.</p>
        <div class="fc-tot"><span class="g">Total HT</span><b class="g">${eur(ht)}</b></div>
        <button class="ap-bt plein large" data-a="signer"${c.cartons ? '' : ' disabled'}>Envoyer pour signature</button></div>`;
    }
    if (c && c.statut === 'envoyee' && this.precedent === 'commande') return tete + `<div class="ap-corps">
      <div class="fc-ok"><span class="roue petite"></span><b>Commande ${c.numero} envoyée</b></div>
      <p class="ap-txt">${esc(BUREAU.envoi(c))}</p><span class="tag decroche">Signature en attente</span>
      <button class="ap-bt plein large" data-a="ouvrir:bureau">Retour à Ma journée</button></div>`;
    const lignes = m.clients.map(x => {
      const [k, t] = STATUTS[x.statut];
      const act = x.statut === 'commande' ? `<button class="ap-bt plein" data-a="cmd:${x.id}">Préparer</button>` : `<span class="tag ${k}">${t}</span>`;
      const qte = ['a_traiter', 'proposee', 'commande'].includes(x.statut) ? 'Quantité à saisir' : `${x.cartons} cartons`;
      return `<div class="arret"><span class="num" style="background:${x.coul}">${x.ini}</span><div class="rq"><b>${x.numero} · ${esc(x.nom)}</b><span>${qte} · ${esc(x.produit)}</span></div>${act}</div>`;
    }).join('');
    return tete + `<div class="ap-corps"><p class="ap-sur">Commandes du jour</p>${lignes}${m.clients.some(x => x.statut === 'signee') ? `<p class="ap-note">${esc(BUREAU.signee)}</p>` : ''}</div>`;
  }
  message() {
    const c = this.jeu.mission.client(this.client);
    return this.entete('Proposer', 'bureau', 'ouvrir:bureau') + `<div class="ap-corps">
      <p class="ap-sur">À ${esc(c.nom)}</p><p class="ap-note">${esc(BUREAU.message)}</p>
      <p class="bulle moi">${esc(BUREAU.texteMessage)}</p>
      <button class="ap-bt plein large" data-a="msg">Envoyer le message</button></div>`;
  }
  tournee() {
    const m = this.jeu.mission, e = m.etape;
    const tete = this.entete('Tournée', 'bureau', 'ouvrir:bureau') + this.onglets('tournee');
    if (!['tournee', 'livraisons', 'retour', 'pc', 'fin', 'libre'].includes(e)) return tete + '<div class="ap-corps"><p class="ap-sur">Tournée du jour</p><p class="ap-txt">Pas encore de tournée : préparez les commandes, puis chargez au chai celles qui sont signées.</p></div>';
    const dist = Math.round(this.jeu.longueurTournee / 10) * 10 + ' m';
    const arrets = m.arrets.map((c, i) => {
      const cheque = c === m.retardataire;
      const fait = cheque ? ['recupere', 'depose', 'saisi'].includes(c.statut) : ['livree', 'facturee', 'transmise'].includes(c.statut), enCours = e === 'livraisons' && i === m.arret;
      const etat = fait ? `<span class="tag ok">${cheque ? 'Récupéré' : 'Livré'}</span>` : enCours ? '<span class="tag jour">En cours</span>' : '';
      const quoi = cheque ? `Récupérer le chèque de la facture ${c.facture} (${eur(c.ttc)})` : `Livrer ${c.cartons} cartons, faire signer le bon de livraison`;
      return `<div class="arret"><span class="num">${i + 1}</span><div class="rq"><b>${esc(c.nom)} · ${esc(c.lieu)}</b><span>${esc(quoi)}</span></div>${etat}</div>`;
    }).join('');
    const bas = e === 'tournee' ? '<button class="ap-bt plein large" data-a="tournee">Démarrer la tournée</button>'
      : m.attenteBL ? '<button class="ap-bt plein large" data-a="bl">Faire signer le bon de livraison</button>' : '';
    return tete + `<div class="ap-corps"><p class="ap-sur">Tournée du jour</p><p class="ap-note">${esc(BUREAU.tournee)}</p>${arrets}
      <p class="ap-note">${esc(BUREAU.itineraire)} : ${dist}.</p>${bas}</div>`;
  }
  bl() {
    const m = this.jeu.mission, c = m.client(m.attenteBL);
    if (!c) return this.tournee();
    return this.entete('Bon de livraison', 'bureau', 'ouvrir:tournee') + `<div class="ap-corps">
      <p class="ap-sur">${c.bl} · commande ${c.numero} signée en ligne</p><p class="fc-client"><b>${esc(c.nom)}</b><br>${esc(c.lieu)}</p>
      <div class="cd-ligne"><span><b>${esc(c.produit)}</b><br><small>${c.cartons * 6} bouteilles</small></span><b>${c.cartons} cartons</b></div>
      <p class="ap-note">${esc(BUREAU.bl)}</p>
      <div class="pad-cadre"><canvas id="pad" aria-label="Zone de signature du client"></canvas><span class="pad-trait">Signature du client</span></div>
      <p class="ap-note" id="pad-aide">Le client signe dans le cadre.</p>
      <div class="reg-choix"><button class="ap-bt" data-a="effacer">Effacer</button><button class="ap-bt plein" id="bt-livrer" data-a="livrer" disabled>Valider la livraison</button></div></div>`;
  }
  appel() {
    const c = this.jeu.mission.client(this.client);
    return `<div class="ph-appel"><p class="ap-sur">Appel en cours</p><span class="av grand" style="background:${c.coul}">${c.ini}</span><b>${esc(c.nom)}</b><span id="ph-duree">00:00</span><div class="onde"><i></i><i></i><i></i><i></i><i></i></div><p id="ph-ligne" class="ph-ligne"></p></div>`;
  }
  viticode() {
    let qr = '';
    for (let i = 0; i < 121; i++) {
      const x = i % 11, y = Math.floor(i / 11), coin = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
      const on = coin ? !(x % 10 === 1 && y % 10 === 1) && !((x === 1 || x === 9) && y === 1) && !(x === 1 && y === 9) : ((x * 7 + y * 13 + x * y) % 5) < 2;
      qr += `<i${on ? ' class="n"' : ''}></i>`;
    }
    return this.entete('Viticode', 'viticode') + `<div class="ap-corps">
      <p class="ap-sur">${esc(VITICODE.titre)}</p><h3>Cuvée du Clos, rouge</h3>
      <div class="qr" aria-hidden="true">${qr}</div>
      <p class="ap-txt">${esc(VITICODE.texte)}</p><p class="ap-note">${esc(VITICODE.chiffre)} · mission dans le jeu complet</p></div>`;
  }
  phyto() {
    return this.entete('Registre phyto', 'phyto') + `<div class="ap-corps">
      <p class="ap-sur">Registre phyto</p><h3>${esc(PHYTO.titre)}</h3><p class="ap-txt">${esc(PHYTO.texte)}</p>
      <a class="ap-bt plein cyan large" href="${esc(LP_URL)}" target="_blank" rel="noopener">${esc(PHYTO.cta)}</a>
      <p class="ap-note">Mission dans le jeu complet : un traitement à noter, au fond des vignes, sans réseau.</p></div>`;
  }
  messages() {
    if (this.fil) {
      const t = MESSAGES.find(x => x.id === this.fil);
      return this.entete(t.de, 'messages', 'ouvrir:messages') + `<div class="ap-corps fil">${t.fil.map(x => `<p class="bulle">${esc(x)}</p>`).join('')}</div>`;
    }
    return this.entete('Messages', 'messages') + `<div class="ap-corps">${MESSAGES.map(t => `<button class="msg" data-a="fil:${t.id}"><b>${esc(t.de)}</b><span>${esc(t.apercu)}</span></button>`).join('')}</div>`;
  }
  reglages() {
    const h = this.jeu.choixHeros;
    return this.entete('Réglages', 'reglages') + `<div class="ap-corps">
      <button class="reg" data-a="son"><span>Son</span><b>${son.actif ? 'Activé' : 'Coupé'}</b></button>
      <button class="reg" data-a="radio"><span>Radio des véhicules</span><b>${son.radioAllumee ? 'Allumée' : 'Coupée'}</b></button>
      <p class="ap-h">Personnage</p>
      <div class="reg-choix"><button class="ap-bt${h === 'vigneron' ? ' plein' : ''}" data-a="heros:vigneron">Vigneron</button><button class="ap-bt${h === 'vigneronne' ? ' plein' : ''}" data-a="heros:vigneronne">Vigneronne</button></div>
      <p class="ap-note">Tournée générale · ${esc(VERSION)} · un jeu original de l'équipe Solumatic</p></div>`;
  }
}
