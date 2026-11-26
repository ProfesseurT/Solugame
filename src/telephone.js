// Le téléphone du personnage : la mise en abyme. Le bureau (vendre, faire signer, livrer),
// Viticode, Registre phyto, Messages, Réglages. Vitisoft n'est pas sur téléphone : il est sur le portable du bureau du
// chai, qui montre aussi Le bureau (vuePortable : mêmes écrans, mêmes actions).
// Tout texte vient de textes.js.
import { VITICODE, PHYTO, LP_URL, MESSAGES, VERSION, BUREAU, CONSIGNE_QTE, CONSIGNE_RETOUR, CONSIGNE_NUIT, TRAITEMENT as TX, HABILLAGE as HX, EN_PREVENTE, MISSIONS } from './textes.js';
import { son } from './audio.js';
import { SAUVE } from './sauvegarde.js';
import { $, esc, eur, dateJeu, jourDe, appelPossible, heureDe } from './outils.js';

export const ICONES = {
  bureau: '<svg viewBox="0 0 24 24"><path d="M9 7V5.5h6V7" fill="none" stroke="#fff" stroke-width="2"/><rect x="3" y="7" width="18" height="12" rx="2.5" fill="#fff"/><rect x="3" y="11.5" width="18" height="1.6" fill="#8e2a3b" opacity=".35"/></svg>',
  viticode: '<svg viewBox="0 0 24 24"><g fill="#fff"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3v2h-3zM14 18h2v3h-2z"/></g><g fill="#e84e1b"><path d="M5 5h3v3H5zM16 5h3v3h-3zM5 16h3v3H5z"/></g></svg>',
  phyto: '<svg viewBox="0 0 24 24"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z" fill="#fff"/><path d="M5 19L15 9" stroke="#2fc6e0" stroke-width="1.8"/></svg>',
  messages: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z" fill="#fff"/></svg>',
  missions: '<svg viewBox="0 0 24 24"><path d="M6.5 21V3.5" stroke="#fff" stroke-width="2.2"/><path d="M7.5 4h11l-2.6 4 2.6 4h-11z" fill="#fff"/></svg>',
  reglages: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.2" fill="none" stroke="#fff" stroke-width="3.2" stroke-dasharray="3.4 2.2"/><circle cx="12" cy="12" r="3" fill="#fff"/></svg>',
};
const APPS = [['bureau', 'Le bureau'], ['viticode', 'Viticode'], ['phyto', 'Registre phyto'], ['messages', 'Messages'], ['missions', 'Missions'], ['reglages', 'Réglages']];
// Un QR code dessiné pour l'œil (trois repères aux coins, des modules tirés d'une graine) : n x n modules, en SVG
function qrSvg(c = '#1d1a26', fond = '#fff', n = 25, graine = 7) {
  let h = (graine * 2654435761) >>> 0, d = '';
  const r = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let on;
    if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) {
      const lx = x > n - 9 ? x - (n - 7) : x, ly = y > n - 9 ? y - (n - 7) : y;
      on = lx >= 0 && ly >= 0 && lx < 7 && ly < 7 && (lx === 0 || ly === 0 || lx === 6 || ly === 6 || (lx > 1 && lx < 5 && ly > 1 && ly < 5));
    } else on = r() < 0.48;
    if (on) d += `M${x} ${y}h1v1h-1z`;
  }
  return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" aria-hidden="true"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="${fond}"/><path d="${d}" fill="${c}"/></svg>`;
}
// Viticode : icônes des sections (comme sur viticode.fr), la feuille du bio, les pictogrammes de la consommation
// responsable, la bouteille de la fiche
const VC = {
  fiche: '<svg viewBox="0 0 24 24" fill="none" stroke="#1f2a3c" stroke-width="1.8"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  ingr: '<svg viewBox="0 0 24 24" fill="none" stroke="#1f2a3c" stroke-width="1.8"><path d="M5 19L19 5"/><path d="M9 15c-3 0-4-2-4-4 2 0 4 1 4 4zM12 12c-3 0-4-2-4-4 2 0 4 1 4 4zM15 9c-3 0-4-2-4-4 2 0 4 1 4 4zM9 15c0-3 2-4 4-4 0 2-1 4-4 4zM12 12c0-3 2-4 4-4 0 2-1 4-4 4z"/></svg>',
  nutri: '<svg viewBox="0 0 24 24" fill="#1f2a3c"><rect x="4" y="13" width="3" height="7"/><rect x="9" y="9" width="3" height="11"/><rect x="14" y="11" width="3" height="9"/><rect x="19" y="5" width="2" height="15"/><rect x="3" y="20" width="19" height="1.4"/></svg>',
  conso: '<svg viewBox="0 0 24 24" fill="none" stroke="#1f2a3c" stroke-width="1.8"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M5 12h4l1.5-2.5 2 5 1.5-2.5H19"/></svg>',
  labels: '<svg viewBox="0 0 24 24" fill="none" stroke="#1f2a3c" stroke-width="1.8"><circle cx="12" cy="10" r="6"/><path d="M8.5 15l-1.5 6 5-3 5 3-1.5-6"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="#1f2a3c"><path d="M3 3h7v7H3zm2 2v3h3V5zM14 3h7v7h-7zm2 2v3h3V5zM3 14h7v7H3zm2 2v3h3v-3zM14 14h3v3h-3zM18 18h3v3h-3zM18 14h3v2h-3zM14 18h2v3h-2z"/></svg>',
  feuille: '<svg viewBox="0 0 24 24"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z" fill="#2f9e63"/><path d="M5 19L15 9" stroke="#fff" stroke-width="1.6"/></svg>',
  bouteille: c => `<svg class="vc-bouteille" viewBox="0 0 40 110" aria-hidden="true"><path d="M16 4h8v26c0 4 9 8 9 20v52a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4V50c0-12 9-16 9-20z" fill="${c}"/><path d="M7 60h12v22H7z" fill="#fff"/></svg>`,
  barre: '<path d="M8 8l32 32" stroke="#e5303a" stroke-width="4"/><circle cx="24" cy="24" r="21" fill="none" stroke="#e5303a" stroke-width="4"/>',
};
VC.enceinte = `<svg viewBox="0 0 48 48" aria-label="Femme enceinte"><circle cx="24" cy="24" r="21" fill="#fff"/><circle cx="23" cy="11" r="4" fill="#111"/><path d="M20 16h6l2 7c4 1 5 6 2 9l-2 2v8h-3v-8h-3v8h-3V31l-2-7z" fill="#111"/><path d="M28 24c4 0 5 5 3 8" stroke="#111" stroke-width="3" fill="none"/>${VC.barre}</svg>`;
VC.volant = `<svg viewBox="0 0 48 48" aria-label="Pas d'alcool au volant"><circle cx="24" cy="24" r="21" fill="#fff"/><path d="M12 28l3-8c1-2 2-3 4-3h10c2 0 3 1 4 3l3 8v6h-3v-2H15v2h-3z" fill="#111"/><circle cx="17" cy="29" r="2" fill="#fff"/><circle cx="31" cy="29" r="2" fill="#fff"/>${VC.barre}</svg>`;
VC.majeur = '<svg viewBox="0 0 48 48" aria-label="Interdit aux mineurs"><circle cx="24" cy="24" r="21" fill="#fff" stroke="#e5303a" stroke-width="4"/><text x="24" y="31" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="19" fill="#111">18+</text></svg>';
VC.personne = '<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="36" fill="#ffe36b"/><circle cx="40" cy="27" r="11" fill="#1f2a3c"/><path d="M20 70c2-16 10-24 20-24s18 8 20 24z" fill="#7fb2d8"/><rect x="46" y="38" width="9" height="16" rx="2" fill="#fff" stroke="#1f2a3c" stroke-width="2"/></svg>';
const COULEURS_VC = { Rouge: '#f06b5e', Blanc: '#f1e2b6', Rosé: '#f7c3c6', Orange: '#f0a37a', Jaune: '#f2e64f', Aucune: '#6f6a60' };
const BOUTEILLE_VC = { Rouge: '#5b1424', Blanc: '#c9b25e', Rosé: '#e6909b', Orange: '#d9772f', Jaune: '#d8c13a', Aucune: '#2c3166' };
const fr = x => String(x).replace('.', ',');

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

  // ouvrir sur une appli ; sinon sur le bon de livraison qui attend sa signature, la notification, ou là où on l'a laissé
  ouvrir(app) {
    const m = this.jeu.mission;
    if (app) this.app = app;
    else if (m.attenteBL && m.blPret) this.app = 'bl';
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

  get H() { return this.jeu.habillage; }
  action(a) {
    const [nom, arg, arg2] = a.split(':');
    const m = this.jeu.mission, R = this.jeu.traitement, H = this.H;
    if (!m.peutFermer() && (nom === 'accueil' || nom === 'ouvrir')) return; // pendant un appel, on reste en ligne
    switch (nom) {
      case 'accueil': this.app = 'accueil'; this.fil = null; break;
      case 'ouvrir': this.app = arg; this.fil = null; this.confirme = null; if (arg === this.notif) this.notifier(null); break;
      case 'rappel': m.rappel(arg); return;
      case 'cmd': this.client = arg; this.app = 'commande'; break;
      case 'qte': m.quantite(this.client, Number(arg)); break;
      // mauvaise quantité : la commande ne part pas, le téléphone rappelle ce que le client a demandé
      case 'signer': if (!m.envoyerCommande(this.client)) { son.jouer('erreur'); this.toast(CONSIGNE_QTE(m.client(this.client))); return; } break;
      case 'msg': m.envoyerMessage(this.client); this.app = 'bureau'; this.afficher(); this.toast('Message envoyé à Bar Le Cep.'); return;
      case 'tournee': m.demarrerTournee(); return;
      case 'aller': m.demarrerTournee(arg); return; // un seul arrêt
      case 'cheque': m.planifierCheque(); break;
      case 'prospect': m.planifierProspect(); break;
      case 'bl': if (!m.blPret) return; this.app = 'bl'; break;
      case 'effacer': this.afficher(); return;
      case 'livrer': if (this.encre > 120) { m.livrer(); this.fermer(); } return;
      case 'fil': this.fil = arg; this.app = 'messages'; if (this.notif === 'messages') this.notifier(null); break;
      case 'son': son.basculer(); break;
      case 'radio': this.jeu.basculerRadio(); break;
      case 'wtf': this.jeu.basculerWtf(); break;
      case 'heros': this.jeu.changerHeros(arg); break;
      case 'bientot': this.toast('Dans le jeu complet.'); return;
      // Missions : rejouer une mission gagnée, après confirmation (la page se recharge : sauvegarde.js)
      case 'rejouer': this.confirme = arg; break;
      case 'rejouerNon': this.confirme = null; break;
      case 'rejouerOk': SAUVE.rejouer(arg); return;
      // le Registre phyto (mission 2) : une saisie en cinq écrans, que l'appli vérifie à chaque étape
      case 'rp-nouveau': R.nouvelleSaisie(); this.app = 'phytoP'; break;
      case 'rp-cocher': R.cocher(arg); break;
      case 'rp-dose': R.dose(arg, Number(arg2)); break;
      case 'rp-cible': R.choisirCible(arg); break;
      case 'rp-suite': {
        const err = R.verifier();
        if (err) { son.jouer('erreur'); this.toast(err); return; }
        const S = R.saisie, suite = { parcelles: 'produits', produits: 'stade', stade: 'cible', cible: 'recap' }[S.etape];
        S.etape = suite; this.app = { produits: 'phytoD', stade: 'phytoS', cible: 'phytoC', recap: 'phytoR' }[suite];
        break;
      }
      case 'rp-retour': {
        const S = R.saisie;
        if (!S || S.etape === 'parcelles') { R.saisie = null; this.app = 'phyto'; break; }
        S.etape = { produits: 'parcelles', stade: 'produits', cible: 'stade', recap: 'cible' }[S.etape];
        this.app = { parcelles: 'phytoP', produits: 'phytoD', stade: 'phytoS', cible: 'phytoC' }[S.etape];
        break;
      }
      case 'rp-enregistrer': {
        const err = R.toutVerifier();
        if (err || !R.saisie || R.saisie.etape !== 'recap') { son.jouer('erreur'); if (err) this.toast(err); return; }
        const en = R.enregistrer(); this.app = 'phyto'; this.afficher(); this.toast(en ? TX.app.enregistre : TX.app.horsReseau); return;
      }
      case 'rp-export': this.app = 'phytoX'; break;
      case 'rp-exporter': son.jouer('envoye'); this.toast(TX.app.exportOk); return;
      // Viticode (mission 3) : la fiche, son QR code, le test, la personnalisation, l'envoi à l'imprimerie
      case 'vc-fiche': this.app = 'vcFiche'; break;
      case 'vc-remplir': H.remplir(arg); break;
      case 'vc-degre': H.degre(Number(arg)); break;
      case 'vc-couleur': H.couleur(arg); break;
      case 'vc-ingr': H.ingredient(arg); break;
      case 'vc-bio': H.bio(); break;
      case 'vc-label': { const l = H.fiche.labels, i = l.indexOf(arg); if (H.publiee) return; if (i >= 0) l.splice(i, 1); else l.push(arg); break; }
      case 'vc-val': H.valeur(arg, Number(arg2)); break;
      case 'vc-negl': H.negligeable(); break;
      case 'vc-calculer': if (!H.calculer()) { son.jouer('erreur'); this.toast(HX.app.degre(HX.vin)); return; } break;
      case 'vc-publier': {
        const err = H.publier();
        if (err) { son.jouer('erreur'); this.toast(err); return; }
        this.app = 'vcQr'; break;
      }
      case 'vc-qr': this.app = 'vcQr'; break;
      case 'vc-copier': this.toast(HX.app.copie); return;
      case 'vc-tester': this.app = 'vcTest'; this.majeur = false; this.depuisSms = arg === 'sms'; this.langue = 'fr'; this.menuLangues = false; break;
      case 'vc-age': if (arg === 'oui') { this.majeur = true; H.vue(); } else { this.toast(HX.app.mineur); return; } break;
      case 'vc-langues': this.menuLangues = !this.menuLangues; break;
      case 'vc-lg': this.langue = arg; this.menuLangues = false; break;
      case 'vc-fermer-test': if (this.depuisSms) { this.app = 'messages'; this.fil = 'imprimerie'; } else this.app = H.publiee ? 'vcQr' : 'viticode'; break;
      case 'vc-telecharger': this.app = 'vcPerso'; break;
      case 'vc-regler': H.regler(arg, arg2 === '1' ? true : arg2 === '0' ? false : arg2); break;
      case 'vc-dl': {
        const err = H.telecharger();
        if (err) { son.jouer('erreur'); this.toast(err); return; }
        son.jouer('envoi'); this.app = 'vcPartage'; this.afficher(); this.toast(HX.app.telecharge); return;
      }
      case 'vc-envoyer': H.envoyer(); this.app = 'messages'; this.fil = 'imprimerie'; break;
      case 'vc-accord': H.accord(); break;
    }
    this.afficher();
  }
  // un écran à redessiner s'il est affiché (mission 2 : le registre change quand le réseau revient)
  rafraichir(app) { if (this.ouvert && this.app.startsWith(app)) this.afficher(); }
  toast(txt) {
    this.dernierToast = { txt, t: performance.now() }; // le portable le remontre après avoir redessiné sa page
    const t = document.querySelector('#pc:not([hidden]) .ph-toast') || this.el.querySelector('.ph-toast');
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

  // Le bureau sur le portable du bureau du chai (« Au domaine sur l'ordinateur », page du bureau) : les mêmes écrans,
  // sans l'en-tête du téléphone
  vuePortable() {
    if (!['bureau', 'commande', 'tournee', 'message'].includes(this.app)) this.app = 'bureau';
    this.surPortable = true;
    const h = this[this.app]();
    this.surPortable = false;
    const d = this.dernierToast, recent = d && performance.now() - d.t < 2500;
    return h + `<p class="ph-toast${recent ? ' vu' : ''}" role="status">${recent ? esc(d.txt) : ''}</p>`;
  }

  /* ------------------------------------------------------------ écrans */
  entete(titre, classe, retour = 'accueil') {
    if (this.surPortable) return '';
    const r = this.jeu.mission.peutFermer() ? `<button class="ap-ret" data-a="${retour}" aria-label="Retour">‹</button>` : '<i class="ap-ret vide"></i>';
    const R = this.jeu.traitement, res = classe === 'phyto' && R && R.actif ? `<i class="ap-res${R.reseau ? '' : ' non'}" aria-label="${R.reseau ? 'Réseau' : 'Pas de réseau'}"><b></b><b></b><b></b><b></b></i>` : '';
    return `<header class="ap-tete ${classe}">${r}<span>${esc(titre)}</span>${res}<i class="ap-ic">${ICONES[classe] || ''}</i></header>`;
  }
  onglets(actif) {
    return `<nav class="onglets">${[['bureau', 'Ma journée'], ['commande', 'Commandes'], ['tournee', 'Tournée']].map(([id, t]) =>
      `<button class="${id === actif ? 'on' : ''}" data-a="ouvrir:${id}">${t}</button>`).join('')}</nav>`;
  }
  accueil() {
    const R = this.jeu.traitement, H = this.H, m3 = H && H.actif, m2 = !m3 && R && R.actif; // le lendemain : la journée de traitement ; le jour d'après : l'habillage
    const n = this.notif === 'bureau'
      ? `<button class="ph-notif" data-a="ouvrir:bureau"><span class="ic bureau">${ICONES.bureau}</span><span><b>Le bureau</b><br>${esc(this.jeu.mission.message)}</span></button>`
      : this.notif === 'messages' && m3 ? `<button class="ph-notif" data-a="fil:${H.fil}"><span class="ic messages">${ICONES.messages}</span><span><b>${esc(HX.messages[H.fil].de)}</b><br>${esc(H.message)}</span></button>`
        : this.notif === 'messages' && m2 ? `<button class="ph-notif" data-a="fil:claire"><span class="ic messages">${ICONES.messages}</span><span><b>${esc(TX.message.de)}</b><br>${esc(TX.message.apercu)}</span></button>`
          : this.notif === 'phyto' && m2 && R.aNoter.length ? `<button class="ph-notif" data-a="ouvrir:phyto"><span class="ic phyto">${ICONES.phyto}</span><span><b>Registre phyto</b><br>${esc(TX.app.notif(R.noms(R.aNoter)))}</span></button>` : '';
    // l'appli que la mission 2 veut qu'on ouvre (le message de Claire, puis chaque parcelle traitée à noter) : son icône
    // mise en évidence
    const voulue = m2 ? (R.aNoter.length ? 'phyto' : !R.lu ? 'messages' : null) : null;
    // la date du jour du jeu (outils.js : dateJeu ; la tournée peut finir le lendemain, les missions suivantes suivent)
    const date = esc(dateJeu(jourDe(this.jeu.minutes)));
    const lieu = m2 ? `${date} · ${R.reseau ? 'temps sec' : 'pas de réseau'}` : `${date} · ciel dégagé`;
    return `<div class="ph-accueil">
      <p class="ph-gheure">${esc(this.jeu.heureTxt)}</p><p class="ph-lieu">${lieu}</p>${n}
      <div class="ph-grille">${APPS.map(([id, nom]) => `<button class="ph-ico${id === voulue ? ' conseil' : ''}" data-a="ouvrir:${id}"><span class="ic ${id}">${ICONES[id]}${this.notif === id ? '<b class="pastille">1</b>' : ''}</span><span class="nom">${esc(nom)}</span></button>`).join('')}</div>
    </div>`;
  }
  // Ma journée : les 3 rappels, avec l'action du moment pour chacun ; le bureau appelle les clients de 8 h à 20 h (outils.js :
  // appelPossible) : avant, après, le bouton dit pourquoi et quand rappeler
  bureau() {
    const m = this.jeu.mission, e = m.etape, appel = appelPossible(this.jeu.minutes), tot = heureDe(this.jeu.minutes) < 12 * 60;
    const lignes = m.clients.map(c => {
      let tag = `<span class="tag ${c.tagC}">${esc(m.tagDe(c))}</span>`, bt;
      if (c.statut === 'a_traiter' && !appel) { tag = `<span class="tag decroche">${tot ? 'Trop tôt pour appeler' : 'Trop tard pour appeler'}</span>`; bt = `<button class="ap-bt" disabled>${tot ? 'Dès 8 h' : 'Demain, 8 h'}</button>`; }
      else if (c.statut === 'a_traiter') bt = `<button class="ap-bt plein" data-a="rappel:${c.id}"${m.appelEnCours ? ' disabled' : ''}>${esc(c.action)}</button>`;
      else if (c.statut === 'commande') bt = `<button class="ap-bt plein" data-a="cmd:${c.id}">Préparer la commande</button>`;
      else { const [k, t] = STATUTS[c.statut]; tag = `<span class="tag ${k}">${t}</span>`; bt = ''; }
      return `<div class="rappel"><span class="av" style="background:${c.coul}">${c.ini}</span><div class="rq"><b>${esc(c.nom)} · ${esc(c.lieu)}</b><span>${esc(m.noteDe(c))}</span><div class="rl">${tag}${bt}</div></div></div>`;
    }).join('');
    let carte = '';
    const prets = m.arretsPrets.length, aCharger = m.aCharger.length;
    if (m.attenteBL && m.blPret) carte = `<div class="carte-a-faire bureau"><p class="ap-sur">Livraison en cours</p><b>${esc(m.client(m.attenteBL).nom)}</b><button class="ap-bt plein" data-a="bl">Faire signer le bon de livraison</button></div>`;
    else if (aCharger) carte = `<div class="carte-a-faire bureau"><p class="ap-sur">Commande${aCharger > 1 ? 's' : ''} signée${aCharger > 1 ? 's' : ''}</p><b>${aCharger} à charger au chai</b></div>`;
    else if (e === 'journee' && prets) carte = `<div class="carte-a-faire bureau"><p class="ap-sur">Tournée du jour</p><b>${prets} arrêt${prets > 1 ? 's' : ''} prêt${prets > 1 ? 's' : ''}</b><button class="ap-bt plein" data-a="ouvrir:tournee">Voir la tournée</button></div>`;
    else if (m.pcDispo && !this.surPortable) carte = `<p class="consigne">${esc(CONSIGNE_RETOUR)}</p>`;
    // le règlement en retard : une tâche du jour, qu'on ajoute soi-même à la tournée
    const r = m.retardataire, planifie = r.statut !== 'a_planifier';
    const reglement = `<div class="rappel"><span class="av" style="background:${r.coul}">${r.ini}</span><div class="rq"><b>${esc(r.nom)} · ${esc(r.lieu)}</b>
      <span>Facture ${r.facture}, ${eur(r.ttc)} : passer récupérer le règlement</span><div class="rl">${planifie
        ? '<span class="tag ok">Dans la tournée</span>' : `<span class="tag retard">En retard</span><button class="ap-bt plein" data-a="cheque">Ajouter à la tournée</button>`}</div></div></div>`;
    // le prospect : une tâche du jour, qu'on ajoute à la tournée ; après la visite, à rappeler (note dans son fil)
    const p = m.prospect;
    const etatP = p.statut === 'a_rappeler' ? '<span class="tag jour">À rappeler</span>' : p.statut !== 'a_planifier' ? '<span class="tag ok">Dans la tournée</span>'
      : '<span class="tag decroche">Prospect</span><button class="ap-bt plein" data-a="prospect">Ajouter à la tournée</button>';
    const prospect = `<div class="rappel"><span class="av" style="background:${p.coul}">${p.ini}</span><div class="rq"><b>${esc(p.nom)} · ${esc(p.lieu)}</b>
      <span>${esc(p.statut === 'a_rappeler' ? p.fil : p.note)}</span><div class="rl">${etatP}</div></div></div><p class="ap-note">${esc(BUREAU.prospect)}</p>`;
    return this.entete('Le bureau', 'bureau') + this.onglets('bureau') + `<div class="ap-corps">${carte}
      <p class="ap-sur">Ma journée</p><h3>${m.salut}.</h3><p class="ap-sous">${esc(m.resume)}</p>
      <div class="tuiles"><div class="tu rouge"><b>1</b>Rappel en retard</div><div class="tu bleu"><b>2</b>Rappels du jour</div><div class="tu rouge"><b>1</b>Règlement en retard</div></div>
      <p class="ap-h">À faire aujourd'hui</p>${lignes}
      <p class="ap-h">Règlement en retard</p>${reglement}
      <p class="ap-h">Prospect</p>${prospect}</div>`;
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
    // une commande n'existe qu'à partir de l'appel (ou de la réponse au message) : elle se prépare pendant
    const lignes = m.clients.filter(x => !['a_traiter', 'proposee'].includes(x.statut)).map(x => {
      const [k, t] = STATUTS[x.statut];
      const act = x.statut === 'commande' ? `<button class="ap-bt plein" data-a="cmd:${x.id}">Préparer</button>` : `<span class="tag ${k}">${t}</span>`;
      const qte = x.statut === 'commande' ? 'Quantité à saisir' : `${x.cartons} cartons`;
      return `<div class="arret"><span class="num" style="background:${x.coul}">${x.ini}</span><div class="rq"><b>${x.numero} · ${esc(x.nom)}</b><span>${qte} · ${esc(x.produit)}</span></div>${act}</div>`;
    }).join('');
    return tete + `<div class="ap-corps"><p class="ap-sur">Commandes du jour</p>${lignes || `<p class="ap-txt">${esc(BUREAU.aucuneCommande)}</p>`}${m.clients.some(x => x.statut === 'signee') ? `<p class="ap-note">${esc(BUREAU.signee)}</p>` : ''}</div>`;
  }
  message() {
    const c = this.jeu.mission.client(this.client);
    return this.entete('Proposer', 'bureau', 'ouvrir:bureau') + `<div class="ap-corps">
      <p class="ap-sur">À ${esc(c.nom)}</p><p class="ap-note">${esc(BUREAU.message)}</p>
      <p class="bulle moi">${esc(BUREAU.texteMessage)}</p>
      <button class="ap-bt plein large" data-a="msg">Envoyer le message</button></div>`;
  }
  // Tournée : les arrêts du jour dans l'ordre, ce qu'il y a à faire chez chacun et où il en est ; on lance la tournée de
  // tout ce qui est prêt (complète, ou avec ce qui est déjà signé et chargé), ou l'on va à un seul arrêt
  tournee() {
    const m = this.jeu.mission, e = m.etape, libre = ['journee', 'livraisons'].includes(e) && !m.attenteBL && !m.attenteCheque;
    const tete = this.entete('Tournée', 'bureau', 'ouvrir:bureau') + this.onglets('tournee'), nuit = m.fermes;
    const prets = m.arretsPrets, courant = m.arretCourant;
    const arrets = m.arrets.map((c, i) => {
      const id = c.id, g = m.genre(c), fait = m.fait(c), pret = m.pret(c), dansTour = e === 'livraisons' && m.tour.includes(id);
      const quoi = g === 'cheque' ? `Récupérer le chèque de la facture ${c.facture} (${eur(c.ttc)})` : g === 'prospect' ? 'Prospect : passer le voir, lui faire goûter le rouge' : `Livrer ${c.cartons || c.demande} cartons, faire signer le bon de livraison`;
      let etat;
      if (fait) etat = `<span class="tag ok">${g === 'cheque' ? 'Récupéré' : g === 'prospect' ? 'Rencontré' : 'Livré'}</span>`;
      else if (id === courant) etat = '<span class="tag jour">En cours</span>';
      else if (dansTour) etat = '<span class="tag ok">Dans la tournée</span>';
      else if (pret && !m.ouvertA(id)) etat = '<span class="tag decroche">Fermé</span>'; // (la nuit : outils.js, HORAIRES)
      else if (pret) etat = libre ? `<button class="ap-bt" data-a="aller:${id}">Y aller</button>` : '<span class="tag decroche">Prêt</span>';
      else if (g === 'client') etat = `<span class="tag decroche">${c.statut === 'signee' ? 'À charger au chai' : c.statut === 'envoyee' ? 'Signature en attente' : 'Commande à prendre'}</span>`;
      else etat = '<span class="tag decroche">À ajouter</span>';
      return `<div class="arret${fait ? ' fait' : ''}"><span class="num">${i + 1}</span><div class="rq"><b>${esc(c.nom)} · ${esc(c.lieu)}</b><span>${esc(quoi)}</span></div>${etat}</div>`;
    }).join('');
    const tous = prets.length === m.arrets.filter(c => !m.fait(c)).length;
    let bas = '';
    if (m.attenteBL && m.blPret) bas = '<button class="ap-bt plein large" data-a="bl">Faire signer le bon de livraison</button>';
    else if (nuit) bas = `<p class="consigne">${esc(CONSIGNE_NUIT)}</p>`;
    else if (libre && prets.length) bas = `<p class="ap-note">${esc(BUREAU.itineraire)} : ${Math.round(this.jeu.longueurTournee(prets) / 10) * 10} m.</p>
      <button class="ap-bt plein large" data-a="tournee">${tous ? 'Démarrer la tournée' : `Démarrer la tournée · ${prets.length} arrêt${prets.length > 1 ? 's' : ''} prêt${prets.length > 1 ? 's' : ''}`}</button>`;
    else if (!prets.length && !m.dehorsFini) bas = `<p class="ap-note">${esc(BUREAU.rienDePret)}</p>`;
    else if (m.pcDispo && !this.surPortable) bas = `<p class="consigne">${esc(CONSIGNE_RETOUR)}</p>`;
    return tete + `<div class="ap-corps"><p class="ap-sur">Tournée du jour</p><p class="ap-note">${esc(BUREAU.tournee)}</p>${arrets}${bas}</div>`;
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
  /* ------------------------------------------------------------ Viticode (mission 3), comme viticode.fr
     La fiche produit (les champs, les ingrédients préchargés par catégorie, la déclaration nutritionnelle et sa
     calculatrice, la consommation responsable), publiée : son QR code (télécharger, copier) ; la personnalisation du QR
     code ; la fiche côté consommateur (« Avez-vous plus de 18 ans ? », sa langue). Ce que le jeu rappelle (le bulletin
     du labo) est en consigne, pas dans l'appli. */
  viticode() {
    const H = this.H;
    if (!H || !H.actif) return this.entete('Viticode', 'viticode') + `<div class="ap-corps">
      <p class="ap-sur">${esc(VITICODE.titre)}</p><h3>Cuvée du Clos, rouge</h3>
      <div class="vc-qr">${qrSvg('#e84e1b')}</div>
      <p class="ap-txt">${esc(VITICODE.texte)}</p><p class="ap-note">${esc(VITICODE.chiffre)} · mission 3 : l'habillage, le jour d'après le traitement</p></div>`;
    const F = H.fiche, v = HX.vin, brouillon = F.nom || F.degre !== null || F.ingr.size;
    const etat = H.publiee ? '<span class="tag ok">Publiée</span>' : `<span class="tag decroche">${brouillon ? 'Brouillon' : 'À créer'}</span>`;
    return this.entete('Viticode', 'viticode') + `<div class="ap-corps">${this.consigneVc()}
      <p class="ap-sur">${esc(HX.domaine)}</p><h3>Mes fiches produit</h3>
      <div class="vc-fic"><span class="rq"><b>Les Perrières 2024, blanc</b><small>Son QR code est déjà sur les bouteilles</small></span><span class="tag ok">Publiée</span></div>
      <button class="vc-fic" data-a="${H.publiee ? 'vc-qr' : 'vc-fiche'}"><span class="rq"><b>${esc(v.nom)}, ${esc(v.couleur)}</b><small>${H.publiee ? 'Son QR code' : 'Nouvelle fiche produit'}</small></span>${etat}</button>
      ${H.publiee ? '' : `<button class="vc-bt large" data-a="vc-fiche">${brouillon ? 'Reprendre la fiche' : '+ Créer la fiche produit'}</button>`}
      <p class="ap-note">${esc(VITICODE.titre)} · nombre de fiches illimité</p></div>`;
  }
  // la consigne du jeu au-dessus de la fiche : les valeurs du bulletin (ou qu'il n'est pas encore arrivé)
  consigneVc() {
    const H = this.H;
    if (H.publiee) return '';
    return `<p class="consigne vc">${esc(H.bulletin ? HX.app.consigne(HX.vin) : HX.app.attente)}</p>`;
  }
  vcFiche() {
    const H = this.H, F = H.fiche, fini = H.publiee, d = fini ? ' disabled' : '';
    const champ = (k, lab, val) => `<button class="vc-champ${val ? '' : ' vide'}" data-a="vc-remplir:${k}"${d}><small>${lab}</small>${val ? esc(val) : '<i>Toucher pour saisir</i>'}</button>`;
    const pas = (a, val, min) => `<div class="pas"><button data-a="${a}:-1" aria-label="Moins"${val === null || val <= min || fini ? ' disabled' : ''}>−</button><b>${val === null ? '·' : fr(val)}</b><button data-a="${a}:1" aria-label="Plus"${d}>+</button></div>`;
    const zero = lab => `<div class="vc-ligne"><span class="vc-lab">${lab} *</span><span>0 grammes</span></div>`;
    const e = F.energie, perime = e && F.base && (F.base.degre !== F.degre || F.base.glucides !== F.glucides);
    const cats = HX.categories.map(C => `<div class="vc-cat"><b>Catégorie d'ingrédient · ${esc(C.nom)}</b>${C.ingredients.map(i => {
      const on = F.ingr.has(i.id);
      return `<div class="vc-ing"><button class="vc-puce${on ? ' on' : ''}" data-a="vc-ingr:${i.id}"${d}>${on ? '✓' : '+'} ${esc(i.nom)}</button>${i.allergene ? '<span class="vc-allerg">Allergène</span>' : ''}${i.id === 'raisins' ? `<button class="vc-feuille${F.bio ? ' on' : ''}" data-a="vc-bio" aria-label="Ingrédient bio"${on && !fini ? '' : ' disabled'}>${VC.feuille}</button>` : ''}</div>`;
    }).join('')}</div>`).join('');
    const labels = ['Bio', 'HVE', 'Demeter'].map(l => `<button class="vc-puce${F.labels.includes(l) ? ' on' : ''}" data-a="vc-label:${l}"${d}>${esc(l)}</button>`).join('');
    return this.entete('Viticode', 'viticode', 'ouvrir:viticode') + `<div class="ap-corps">${this.consigneVc()}
      <section class="vc-sec"><h4>${VC.fiche} Fiche produit</h4>
        ${champ('nom', 'Nom du produit * (50 caractères max)', F.nom)}
        <div class="vc-ligne"><span class="vc-lab">Degré d'alcool</span>${pas('vc-degre', F.degre, 9)}<span>degrés</span></div>
        ${champ('millesime', 'Millésime', F.millesime)}${champ('appellation', 'Appellation', F.appellation)}${champ('lot', 'Lot', F.lot)}
        ${VC.bouteille(BOUTEILLE_VC[F.couleur] || BOUTEILLE_VC.Aucune)}
        <span class="vc-lab" style="text-align:center">Couleurs</span>
        <div class="vc-puces" style="justify-content:center">${HX.couleurs.map(c => `<button class="vc-puce${F.couleur === c ? ' on' : ''}" data-a="vc-couleur:${c}"${d}><i class="pt" style="background:${COULEURS_VC[c]};color:${COULEURS_VC[c]}"></i>${c}</button>`).join('')}</div></section>
      <section class="vc-sec"><h4>${VC.ingr} Ingrédients</h4>${cats}
        <p class="ap-note">La feuille : un ingrédient issu de l'agriculture biologique.</p></section>
      <section class="vc-sec"><h4>${VC.nutri} Déclaration nutritionnelle (pour 100 ml)</h4>
        ${zero('Graisse')}${zero('dont acides gras saturés')}${zero('Sel')}${zero('Protéines')}
        <div class="vc-ligne"><span class="vc-lab">Glucides *</span>${pas('vc-val:glucides', F.glucides, 0)}<span>g</span></div>
        <div class="vc-ligne"><span class="vc-lab">dont sucres *</span>${pas('vc-val:sucres', F.sucres, 0)}<span>g</span></div>
        <span class="vc-lab">Energie *</span>
        <span class="vc-energie"><b>${e && !perime ? fr(e.kj) : ''}</b> kj - <b>${e && !perime ? fr(e.kcal) : ''}</b> kcal</span>
        <button class="vc-bt" style="justify-self:start" data-a="vc-calculer"${d}>Calculer mon energie</button>
        <button class="vc-inter${F.negligeable ? ' on' : ''}" data-a="vc-negl"${d}><i></i>Afficher les valeurs à zéro comme quantité négligeable.</button></section>
      <section class="vc-sec"><h4>${VC.labels} Labels</h4><div class="vc-puces">${labels}</div></section>
      <section class="vc-sec"><h4>${VC.conso} Consommation responsable</h4>
        <div class="vc-ligne"><span>Afficher les pictogrammes :</span><span class="vc-pictos">${VC.volant}${VC.enceinte}${VC.majeur}</span></div>
        <span class="vc-inter on"><i></i>Afficher le message : « L'abus d'alcool est dangereux pour la santé ».</span></section>
      ${fini ? '<button class="vc-bt large" data-a="vc-qr">Son QR code</button>' : `<button class="vc-bt large" data-a="vc-publier"${H.bulletin ? '' : ' disabled'}>Publier la fiche</button>`}</div>`;
  }
  // le bloc du QR code tel qu'il sera imprimé : le titre « Ingrédients / Nutrition » au-dessus, la valeur énergétique
  // en pied de page (selon la personnalisation)
  qrBloc(P) {
    const e = this.H.fiche.energie, c = P.couleur;
    const t = P.titre ? `<span class="t" style="background:${c}">INGRÉDIENTS / NUTRITION</span>` : '';
    const p = P.pied && e ? `<span class="p" style="background:${c}">E (100 ml) = ${Math.round(e.kj)} kJ / ${Math.round(e.kcal)} kcal</span>` : '';
    return `<div class="vc-qr${P.bordures ? ' bord' : ''}" style="color:${c}">${t}${qrSvg(c)}${p}</div>`;
  }
  vcQr() {
    const H = this.H, v = HX.vin;
    return this.entete('Viticode', 'viticode', 'ouvrir:viticode') + `<div class="ap-corps">
      <p class="ap-sur">${esc(v.nom)}, ${esc(v.couleur)} · fiche publiée</p>
      <section class="vc-sec"><h4>${VC.qr} QR Code</h4>
        <div class="vc-qr">${qrSvg('#1d1a26')}</div>
        <p class="ap-note">Scanner ce QR code avec votre mobile pour consulter votre page produit. Vous pouvez également télécharger le QR code ou copier l'url avec les boutons ci-dessous.</p>
        <div class="reg-choix"><button class="vc-bt${H.testee ? '' : ' clair'}" data-a="vc-telecharger">Télécharger</button><button class="vc-bt clair" data-a="vc-copier">Copier</button></div></section>
      <button class="vc-bt large${H.testee ? ' clair' : ''}" data-a="vc-tester">Testez-moi !</button>
      ${H.envoye ? '<span class="tag ok" style="justify-self:center">Envoyé à l\'imprimerie</span>' : H.telecharge ? '<button class="ap-bt large" data-a="vc-dl">Envoyer à l\'imprimerie</button>' : ''}</div>`;
  }
  vcPerso() {
    const P = this.H.fiche.perso, opt = (k, val, txt) => `<button class="vc-puce${P[k] === val ? ' on' : ''}" data-a="vc-regler:${k}:${val === true ? 1 : val === false ? 0 : val}">${txt}</button>`;
    const ligne = (lab, h) => `<div class="vc-reglage"><span class="vc-lab">${lab} :</span><span class="vc-puces">${h}</span></div>`;
    const teintes = ['#e84e1b', '#8e2a3b', '#1d1a26', '#2c3e66'].map(c => `<button class="vc-puce${P.couleur === c ? ' on' : ''}" data-a="vc-regler:couleur:${c}" aria-label="${c}"><i class="pt" style="background:${c};color:${c}"></i></button>`).join('');
    return this.entete('Viticode', 'viticode', 'vc-qr') + `<div class="ap-corps"><section class="vc-sec"><h4>Personnalisation du QrCode</h4>
      ${ligne('Appliquer le paramétrage du domaine', opt('domaine', true, 'Oui') + opt('domaine', false, 'Non'))}
      ${P.domaine ? '' : '<p class="ap-note">Vous n\'avez pas de paramétrage par défaut, vous pouvez le créer depuis la page de modification du domaine sur la page profil.</p>'}
      ${ligne('Format du fichier', opt('format', 'svg', 'Svg') + opt('format', 'pdf', 'Pdf') + opt('format', 'png', 'Png'))}
      ${ligne('Afficher les bordures', opt('bordures', true, 'Oui') + opt('bordures', false, 'Non'))}
      ${ligne('Couleur du QrCode', teintes)}
      ${ligne('Titre des sections', opt('titre', true, 'Oui') + opt('titre', false, 'Non'))}
      ${ligne('Pied de page : la valeur énergétique', opt('pied', true, 'Oui') + opt('pied', false, 'Non'))}
      ${this.qrBloc(P)}
      <div class="reg-choix"><button class="vc-bt clair" data-a="vc-qr">✕ Annuler</button><button class="vc-bt" data-a="vc-dl">✓ Télécharger le QR code</button></div></section></div>`;
  }
  get nomFichier() { return `QR code ${HX.vin.nom}.${this.H.fiche.perso.format}`; }
  // la feuille de partage du téléphone, juste après le téléchargement
  vcPartage() {
    const H = this.H;
    return this.entete('Viticode', 'viticode', 'vc-qr') + `<div class="ap-corps" style="min-height:calc(100% - 60px);align-content:end">
      ${this.qrBloc(H.fiche.perso)}
      <div class="partage"><div class="fichier"><span class="doc">${esc(H.fiche.perso.format.toUpperCase())}</span><span><b>${esc(this.nomFichier)}</b><br><small>Téléchargé</small></span></div>
        <p class="ap-sur">Envoyer à</p>
        <button class="contact" data-a="vc-envoyer"><span class="av" style="background:#3c5a8a">IS</span><span>${esc(HX.imprimerie)}<br><small>Messages</small></span></button>
        <button class="vc-bt clair" data-a="vc-qr">Plus tard</button></div></div>`;
  }
  // les ingrédients tels que la fiche les affiche : par catégorie, les allergènes en gras, l'astérisque du bio
  ingredientsTexte(L) {
    const F = this.H.fiche, parts = [];
    const nom = i => {
      const n = i.id === 'raisins' ? L.raisins : i.id === 'sulfites' ? L.sulfites : i.nom;
      return (i.allergene ? `<b>${esc(n)}</b>` : esc(n)) + (i.id === 'raisins' && F.bio ? '*' : '');
    };
    for (const C of HX.categories) {
      const ins = C.ingredients.filter(i => F.ingr.has(i.id));
      if (!ins.length) continue;
      if (C.id === 'principaux') parts.push(...ins.map(nom));
      else parts.push(`${esc(C.id === 'conservateurs' ? L.conservateurs : C.nom)} (${ins.map(nom).join(', ')})`);
    }
    return parts.join(', ') + '.';
  }
  // La fiche côté consommateur, dans le navigateur du téléphone (comme viticode.fr/fiche-produit) : d'abord « Avez-vous
  // plus de 18 ans ? », puis la fiche dans la langue choisie (celle du téléphone au départ)
  vcTest() {
    const H = this.H, F = H.fiche, L = HX.langues[this.langue || 'fr'];
    const nav = `<div class="vc-nav"><button class="ap-ret" data-a="vc-fermer-test" aria-label="Retour">‹</button><span class="url">viticode.fr/fiche-produit</span></div>`;
    if (!this.majeur) return nav + `<div class="vc-age"><div class="jaune">${VC.personne}</div><h3>${esc(L.age)}</h3>
      <div class="reg-choix" style="padding:0 16px"><button class="vc-bt" data-a="vc-age:oui">${esc(L.oui)} ✓</button><button class="vc-bt" data-a="vc-age:non">${esc(L.non)} ✕</button></div></div>`;
    const e = F.energie || { kj: 0, kcal: 0 }, langues = this.menuLangues ? `<div class="vc-langues">${Object.entries(HX.langues).map(([k, l]) => `<button class="vc-puce${k === (this.langue || 'fr') ? ' on' : ''}" data-a="vc-lg:${k}">${esc(l.nom)}</button>`).join('')}<p class="ap-note">${esc(HX.languesNote)}</p></div>` : '';
    const labels = F.labels.map(l => `<span class="vc-label">${l === 'Bio' ? VC.feuille + ' ' + esc(L.labelBio) : esc(l)}</span>`).join('');
    return nav + `<div class="vc-cons"><h2>${esc(F.nom)}</h2>
      <button class="vc-trad" data-a="vc-langues" aria-label="Changer de langue">A文</button>${langues}
      <div><div class="vc-rang"><span>${esc(L.couleur)}</span><b>${esc(L.rouge)}</b></div><div class="vc-rang"><span>${esc(L.alcool)}</span><b>${F.degre}%</b></div>
        <div class="vc-rang"><span>${esc(L.millesime)}</span><b>${esc(F.millesime)}</b></div><div class="vc-rang"><span>${esc(L.appellation)}</span><b>${esc(F.appellation)}</b></div></div>
      <div class="vc-carte"><h3>${esc(L.ingredients)}</h3><p style="margin:0">${this.ingredientsTexte(L)}</p>${F.bio ? `<small>${esc(L.bio)}</small>` : ''}</div>
      <div class="vc-carte"><h3>${esc(L.decl)}</h3><div class="n"><span>${esc(L.energie)}</span><span>${e.kj} kj / ${e.kcal} kcal</span></div>
        <div class="n"><span>${esc(L.glucides)}</span><span>${F.glucides} g</span></div><div class="n"><span>${esc(L.sucres)}</span><span>${F.sucres} g</span></div>
        ${F.negligeable ? `<small>${esc(L.negl)}</small>` : ''}</div>
      ${labels ? `<h3 style="margin:0;text-align:center;font:500 20px/1.2 var(--ui)">${esc(L.labels)}</h3><div class="vc-puces" style="justify-content:center">${labels}</div>` : ''}
      <h3 style="margin:0;text-align:center;font:500 20px/1.2 var(--ui)">${esc(L.conso)}</h3>
      <div class="vc-pictos" style="justify-content:center">${VC.enceinte}${VC.volant}${VC.majeur}</div>
      <p style="margin:0;text-align:center;font-size:12px">${esc(L.abus)}</p>
      <div class="vc-pied"><span style="display:block;width:30px;height:30px">${ICONES.viticode}</span>Viticode</div></div>`;
  }
  // La contre-étiquette du Clos 2025 (le BAT de l'imprimerie, la bouteille habillée) : le QR code, la valeur
  // énergétique, les allergènes et les mentions de l'étiquette (données fictives)
  contreEtiquette() {
    const v = HX.vin;
    return `<div class="ce"><span class="nom">LE CLOS</span><span class="ao">Appellation Anjou Contrôlée</span><span>${esc(v.millesime)}</span>
      <span>${esc(HX.domaine)}<br>Mis en bouteille au domaine, Le Bourg, France</span>
      ${this.qrBloc(this.H.fiche.perso)}
      <span class="mentions"><span>Contient des sulfites</span></span>
      <span class="mentions"><span>75 cl</span><span>${fr(v.degre)} % vol</span><span>Lot ${esc(v.lot)}</span></span>
      <span class="mentions"><span>Produit de France</span>${VC.enceinte.replace('<svg ', '<svg class="fe" ')}</span></div>`;
  }
  phyto() {
    const R = this.jeu.traitement;
    if (!R || !R.actif) return this.entete('Registre phyto', 'phyto') + `<div class="ap-corps">
      <p class="ap-sur">Registre phyto</p><h3>${esc(PHYTO.titre)}</h3><p class="ap-txt">${esc(PHYTO.texte)}</p>
      <a class="ap-bt plein cyan large" href="${esc(LP_URL)}" target="_blank" rel="noopener">${esc(PHYTO.cta)}</a>
      <p class="ap-note">Mission 2, après la tournée et une nuit de sommeil : un traitement à noter, au fond des vignes, sans réseau.</p></div>`;
    const A = TX.app, G = A.guide, aN = R.aNoter, n = R.enAttente.length, suite = R.premiereATraiter;
    // la consigne du jeu : quoi faire ici (une parcelle à noter), ou la suite (la parcelle suivante, remonter là où ça
    // capte), ou rien encore à noter
    const consigne = aN.length ? G.accueil(R.noms(aN)) : R.etape !== 'traiter' && R.etape !== 'remplir' && R.etape !== 'preparer' ? ''
      : n && !R.reseau ? G.attente : R.jour.some(p => p.notee) && suite ? G.suite(suite.nom) : !R.jour.some(p => p.traitee) ? G.avant : '';
    const lignes = R.registre.map(l => `<div class="rp-ligne"><p class="rp-quand"><b>${esc(l.quand)}</b>${l.statut === 'attente' ? `<span class="tag decroche">${esc(A.attente)}</span>` : `<span class="tag ok">${esc(A.envoye)}</span>`}</p>
      <p>${esc(l.parcelles.join(', '))}</p><p class="rp-p">${esc(l.produits.join(' ; '))} · ${esc(l.cibles.join(', '))} · ${esc(l.stade)}</p><p class="ap-note">Saisi par ${esc(l.par)}</p></div>`).join('');
    const a = (consigne ? `<p class="consigne rp">${esc(consigne)}</p>` : '') + (aN.length ? `<div class="carte-a-faire rp"><p class="ap-sur">Traité aujourd'hui, à noter</p><b>${esc(R.noms(aN))}</b></div>` : '');
    const sync = n ? `<p class="rp-sync${R.reseau ? '' : ' non'}">${esc(A.attenteNote(n))}</p>` : '';
    return this.entete('Registre phyto', 'phyto') + `<div class="ap-corps">${a}
      <button class="ap-bt plein cyan large${aN.length ? ' guide' : ''}" data-a="rp-nouveau"${aN.length ? '' : ' disabled'}>${esc(A.nouveau)}</button>${sync}
      <p class="ap-h">${esc(A.registre)}</p><p class="ap-note">${esc(A.registreNote)}</p>${lignes}
      <button class="ap-bt large" data-a="rp-export">${esc(A.exporter)}</button>${this.apercuPhyto()}</div>`;
  }
  // sous chaque écran du registre : ce que l'on regarde (un aperçu, des données fictives) et la prévente
  apercuPhyto() {
    return EN_PREVENTE ? `<p class="ap-note rp-apercu">${esc(TX.app.apercu)} <a href="${esc(LP_URL)}" target="_blank" rel="noopener">${esc(PHYTO.cta)}</a></p>`
      : `<p class="ap-note rp-apercu">${esc(TX.app.apercuApres)}</p>`;
  }
  // les écrans de la saisie : en-tête (retour : l'étape d'avant), titre de l'étape, son contenu, le bouton de suite
  // (consigne : ce que le jeu dit de faire ici ; le bouton de suite est mis en évidence quand l'étape est juste)
  etapePhyto(n, titre, corps, suite = 'Suivant', consigne = '') {
    const R = this.jeu.traitement, juste = R.saisie && !(suite === 'Suivant' ? R.verifier() : R.toutVerifier());
    return this.entete('Registre phyto', 'phyto', 'rp-retour') + `<div class="ap-corps">${consigne ? `<p class="consigne rp">${esc(consigne)}</p>` : ''}<p class="ap-sur">Noter un traitement · ${n} sur 5</p><h3>${esc(titre)}</h3>
      ${corps}<button class="ap-bt plein cyan large${juste ? ' guide' : ''}" data-a="${suite === 'Suivant' ? 'rp-suite' : 'rp-enregistrer'}">${esc(suite)}</button>${this.apercuPhyto()}</div>`;
  }
  phytoP() {
    const R = this.jeu.traitement, S = R.saisie;
    if (!S) return this.phyto();
    const aN = R.aNoter;
    const l = R.parcelles.map(p => `<button class="rp-case${S.parcelles.has(p.id) ? ' on' : aN.includes(p) ? ' guide' : ''}" data-a="rp-cocher:${p.id}"><i></i><span><b>${esc(p.nom)}</b><small>${esc(p.cep)} · ${String(p.ha.toFixed(2)).replace('.', ',')} ha</small></span></button>`).join('');
    return this.etapePhyto(1, TX.app.parcelles, `<p class="ap-note">${esc(TX.app.parcellesNote)}</p>${l}`, 'Suivant', aN.length ? TX.app.guide.parcelles(R.noms(aN), aN.length) : '');
  }
  phytoD() {
    const R = this.jeu.traitement, S = R.saisie;
    if (!S) return this.phyto();
    const l = TX.produits.map(P => `<div class="cd-ligne"><span><b>${esc(P.nom)}</b><br><small>${esc(P.sous)}</small></span>
      <div class="pas"><button data-a="rp-dose:${P.id}:-1" aria-label="Moins"${S.doses[P.id] <= 0 ? ' disabled' : ''}${!P.cuve && S.doses[P.id] > 0 || P.cuve && S.doses[P.id] > P.dose ? ' class="guide"' : ''}>−</button><b class="rp-dose">${String(S.doses[P.id]).replace('.', ',')}<small>${esc(P.unite)}</small></b><button data-a="rp-dose:${P.id}:1" aria-label="Plus"${P.cuve && S.doses[P.id] < P.dose ? ' class="guide"' : ''}>+</button></div></div>`).join('');
    const C = TX.produits.find(P => P.cuve);
    return this.etapePhyto(2, TX.app.produits, l, 'Suivant', TX.app.guide.produits(C.nom.toLowerCase(), `${String(C.dose).replace('.', ',')} ${C.unite}`));
  }
  phytoS() {
    return this.etapePhyto(3, TX.app.stade, `<div class="cd-ligne"><span><b>${esc(TX.stade)}</b><br><small>${esc(TX.stadeDe)}</small></span><span class="tag ok">Repris</span></div>`, 'Suivant', TX.app.guide.stade);
  }
  phytoC() {
    const S = this.jeu.traitement.saisie;
    if (!S) return this.phyto();
    const J = TX.ciblesDuJour, g = c => (J.includes(c) ? !S.cibles.has(c) : S.cibles.has(c)) ? ' guide' : '';
    return this.etapePhyto(4, TX.app.cible, `<div class="rp-puces">${TX.cibles.map(c => `<button class="rp-puce${S.cibles.has(c) ? ' on' : ''}${g(c)}" data-a="rp-cible:${c}">${esc(c)}</button>`).join('')}</div>`, 'Suivant', TX.app.guide.cible);
  }
  phytoR() {
    const R = this.jeu.traitement, S = R.saisie;
    if (!S) return this.phyto();
    const parcs = R.parcelles.filter(p => S.parcelles.has(p.id)), ha = parcs.reduce((s, p) => s + p.ha, 0);
    return this.etapePhyto(5, TX.app.recap, `<div class="rp-ligne"><p class="rp-quand"><b>${esc(R.dateCourte)} · ${esc(this.jeu.heureTxt.replace(/^0/, '').replace(':', ' h '))}</b></p>
      <p>${esc(parcs.map(p => p.nom).join(', '))} · ${String(ha.toFixed(2)).replace('.', ',')} ha</p>
      <p class="rp-p">${esc(TX.produits.filter(P => P.cuve).map(P => `${P.nom} · ${String(P.dose).replace('.', ',')} ${P.unite}`).join(' ; '))}</p>
      <p class="rp-p">${esc([...S.cibles].join(', '))} · ${esc(TX.stade)}</p></div>${R.reseau ? '' : `<p class="ap-note rp-hors">${esc(TX.app.horsReseau)}</p>`}`, TX.app.enregistrer, R.reseau ? TX.app.guide.recap : TX.app.guide.recapSans);
  }
  phytoX() {
    return this.entete('Registre phyto', 'phyto', 'ouvrir:phyto') + `<div class="ap-corps"><p class="ap-sur">${esc(TX.app.exporter)}</p><h3>${esc(TX.app.registre)}</h3>
      <p class="ap-txt">${esc(TX.app.exportNote)}</p>
      <div class="rp-puces"><span class="rp-puce on">PDF</span><span class="rp-puce on">Format officiel</span><span class="rp-puce on">Fiche Stat'Phyto</span></div>
      <button class="ap-bt plein cyan large" data-a="rp-exporter">Exporter</button>${this.apercuPhyto()}</div>`;
  }
  messages() {
    const R = this.jeu.traitement, H = this.H, sec = dateJeu(jourDe(this.jeu.minutes) + 2, 'semaine'); // (Claire : il fait sec jusqu'au surlendemain)
    const fils = R && R.actif ? [{ id: 'claire', ...TX.message, fil: TX.message.fil(sec) }, ...MESSAGES] : [...MESSAGES];
    // mission 3 : l'imprimerie (son message du matin, puis l'envoi du QR code et le BAT), le labo (le bulletin)
    if (H && H.actif) {
      if (H.bulletin) fils.unshift({ id: 'labo', ...HX.messages.labo });
      const I = HX.messages.imprimerie;
      fils.unshift({ id: 'imprimerie', ...I, apercu: H.sms ? I.termine : H.bat === 'ok' ? I.imprime : H.bat === 'recu' ? I.recu : I.apercu });
    }
    if (this.fil) {
      const t = fils.find(x => x.id === this.fil);
      if (!t) { this.fil = null; return this.messages(); }
      if (t.id === 'imprimerie') return this.filImprimerie();
      if (t.id === 'labo') return this.filLabo();
      if (t.id === 'claire') R.messageLu();
      return this.entete(t.de, 'messages', 'ouvrir:messages') + `<div class="ap-corps fil">${t.fil.map(x => `<p class="bulle">${esc(x)}</p>`).join('')}</div>`;
    }
    return this.entete('Messages', 'messages') + `<div class="ap-corps">${fils.map(t => `<button class="msg" data-a="fil:${t.id}"><b>${esc(t.de)}</b><span>${esc(t.apercu)}</span></button>`).join('')}</div>`;
  }
  // Le fil de l'imprimerie (mission 3) : son message du matin ; le QR code envoyé ; le BAT de la contre-étiquette, à
  // valider ; l'impression lancée
  filImprimerie() {
    const H = this.H, I = HX.messages.imprimerie;
    H.messageLu();
    let b = I.fil.map(x => `<p class="bulle">${esc(x)}</p>`).join('');
    if (H.envoye) b += `<div class="bulle moi"><span class="fichier"><span class="doc">${esc(H.fiche.perso.format.toUpperCase())}</span>${esc(this.nomFichier)}</span></div>`;
    else if (H.telecharge) b += `<button class="ap-bt plein large" data-a="vc-envoyer">Joindre « ${esc(this.nomFichier)} »</button>`;
    if (H.bat !== 'aucun') b += `<p class="bulle">${esc(I.recu)}</p><div class="bat">${this.contreEtiquette()}</div>`;
    if (H.bat === 'recu') b += `<button class="ap-bt plein large" data-a="vc-accord">${esc(I.accord)}</button>`;
    if (H.bat === 'ok') { b += `<p class="bulle moi">${esc(I.accord)}</p>`; if (H.tImprime <= 0) b += `<p class="bulle">${esc(I.imprime)}</p>`; }
    // le message d'après l'habillage : la photo d'une bouteille habillée, le lien de sa fiche (comme le client la verra)
    if (H.sms) {
      const [a, b2, c] = I.termineFil;
      b += `<p class="bulle">${esc(a)}</p><div class="bat photo">${this.contreEtiquette()}</div><p class="bulle">${esc(b2)}</p>
        <button class="lien-fiche" data-a="vc-tester:sms">${ICONES.viticode}<span><b>${esc(HX.vin.nom)}</b><br>viticode.fr/fiche-produit</span></button><p class="bulle">${esc(c)}</p>`;
    }
    return this.entete(I.de, 'messages', 'ouvrir:messages') + `<div class="ap-corps fil">${b}</div>`;
  }
  // Le fil du labo d'œnologie (mission 3) : le bulletin d'analyse du Clos 2025
  filLabo() {
    const H = this.H, L = HX.messages.labo, v = HX.vin;
    const lignes = HX.bulletin(v).map(([k, x]) => `<div class="cd-ligne"><span>${esc(k)}</span><b>${esc(x)}</b></div>`).join('');
    return this.entete(L.de, 'messages', 'ouvrir:messages') + `<div class="ap-corps fil"><p class="bulle">${esc(L.intro)}</p>
      <div class="bat"><p class="ap-sur">Bulletin d'analyse · ${esc(v.nom)}, ${esc(v.couleur)} · lot ${esc(v.lot)}</p>${lignes}</div>
      <p class="bulle">${esc(L.fin)}</p>${H.publiee ? '' : '<button class="ap-bt plein large" data-a="ouvrir:viticode">Ouvrir Viticode</button>'}</div>`;
  }
  // Missions : où l'on en est (gagnée, en cours, à venir) ; une mission gagnée se rejoue, après confirmation
  missions() {
    const G = SAUVE.gagnees, cours = this.jeu.enCoursId, c = MISSIONS.liste.find(x => x.id === this.confirme);
    const conf = c ? `<div class="carte-a-faire ms-conf"><p>${esc(MISSIONS.confirme(c.titre))}</p><div class="reg-choix"><button class="ap-bt plein" data-a="rejouerOk:${c.id}">Rejouer</button><button class="ap-bt" data-a="rejouerNon">Annuler</button></div></div>` : '';
    const lignes = MISSIONS.liste.map(M => {
      const gagnee = !!G[M.id], etat = gagnee ? '<b class="ms-e ok">Gagnée ✓</b>' : M.id === cours ? '<b class="ms-e cours">En cours</b>' : '<b class="ms-e">À venir</b>';
      return `<div class="ms"><p class="ms-n">${esc(M.n)}${etat}</p><p class="ms-t">${esc(M.titre)}</p><p class="ap-note">${esc(M.texte)}</p>${gagnee ? `<button class="ap-bt" data-a="rejouer:${M.id}">Rejouer</button>` : ''}</div>`;
    }).join('');
    return this.entete('Missions', 'missions') + `<div class="ap-corps">${conf}${lignes}<p class="ap-note">${esc(MISSIONS.note)}</p></div>`;
  }
  reglages() {
    const h = this.jeu.choixHeros;
    return this.entete('Réglages', 'reglages') + `<div class="ap-corps">
      <button class="reg" data-a="son"><span>Son</span><b>${son.actif ? 'Activé' : 'Coupé'}</b></button>
      <button class="reg" data-a="radio"><span>Radio des véhicules</span><b>${son.radioAllumee ? 'Allumée' : 'Coupée'}</b></button>
      <button class="reg" data-a="wtf"><span>Mode WTF</span><b>${this.jeu.wtf ? 'Activé' : 'Coupé'}</b></button>
      <p class="ap-note">${this.jeu.wtf ? 'On vole les voitures, même garées, et l\'on aplatit les passants (ils se relèvent en râlant).' : 'On emprunte les voitures à leur conducteur : plantez-vous devant, elle s\'arrête. Le mode WTF permet de les voler et d\'aplatir les passants.'}</p>
      <p class="ap-h">Personnage</p>
      <div class="reg-choix"><button class="ap-bt${h === 'vigneron' ? ' plein' : ''}" data-a="heros:vigneron">Vigneron</button><button class="ap-bt${h === 'vigneronne' ? ' plein' : ''}" data-a="heros:vigneronne">Vigneronne</button></div>
      <p class="ap-note">Tournée générale · ${esc(VERSION)} · un jeu original de l'équipe Solumatic</p></div>`;
  }
}
