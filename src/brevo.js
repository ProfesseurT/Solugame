// La fenêtre Brevo, dans le navigateur de l'ordinateur du bureau du chai (mission 4 ; Teddy, 28/11/2026 : « créer très
// facilement via un clic ; ça nous fait ouvrir une page web avec Brevo pour créer l'emailing et les SMS ; des relances
// qui vont s'envoyer automatiquement par mail » ; « en supplément, envoyer des mails de remerciement à tous les gens qui
// sont passés »). Brevo est un partenaire réel : son nom est écrit, son logo n'est pas imité ; une page simple et sobre.
// Ce qu'on en dit, seulement ce que dit vitisoft.fr (fonctionnalites/marketing-emailing.astro) : « vous choisissez vos
// clients dans Vitisoft, Brevo envoie l'email ou le SMS personnalisé » ; la sélection part vers Brevo, qui compose à
// partir d'un modèle et envoie ; Brevo récupère les données dans le CRM de Vitisoft, sans export ni import ; statistiques
// d'ouverture et de clics. Quatre écrans : l'invitation par email (le modèle des portes ouvertes, au prénom de chacun, la
// mention sanitaire, la désinscription), le SMS (STOP), les relances automatiques (Automatisations), le merci.
// L'état est celui de la mission (mission4.js : campagne, envoyerEmail, envoyerSms, activerRelances, stats,
// envoyerMerci) ; textes.js PORTES (les messages) et PORTES_ORDI (ce que dit le jeu, les contacts fictifs).
import { PORTES as P, PORTES_ORDI as O } from './textes.js';
import { son } from './audio.js';
import { esc, dateJeu } from './outils.js';

const pct = x => Math.round(x * 100) + ' %';

export class Brevo {
  constructor(pc) {
    this.pc = pc;
    this.onglet = 'email'; // l'écran ouvert : 'email', 'sms', 'relances', 'merci'
    this.k = 0;            // le contact de l'aperçu (la personnalisation : {prenom})
  }
  get P4() { return this.pc.jeu.portes; }
  // le merci se montre une fois les portes ouvertes passées (des tickets en caisse)
  get avecMerci() { const P4 = this.P4; return !!P4 && (P4.caisse.tickets.length > 0 || P4.merci); }
  // l'écran que la mission attend ici (pc.js : aFaire), ou null
  get voulu() { const f = this.pc.aFaire(); return f && f.app === 'brevo' ? f.quoi : null; }
  // ouvrir la fenêtre sur l'écran qu'attend la mission
  montrer(onglet) { this.onglet = onglet || this.voulu || this.onglet; if (this.onglet === 'merci' && !this.avecMerci) this.onglet = 'email'; this.vu(); }
  // le merci ouvert : la mission attend maintenant qu'on l'envoie d'ici (pc.js : aFaire)
  vu() { if (this.onglet === 'merci') this.pc.merciVu = true; }
  perso(s, prenom) { return s.replaceAll('{prenom}', prenom).replaceAll('{date}', this.pc.dateJ); }

  action(a) {
    const P4 = this.P4, [nom, x] = a;
    switch (nom) {
      case 'bv-onglet': this.onglet = x; this.vu(); return;
      case 'bv-contact': this.k = (this.k + 1) % O.contacts.filter(c => c.email).length; return;
      case 'bv-email': if (P4.envoyerEmail()) { son.jouer('envoye'); this.pc.toast(O.brevo.emailParti(P.selection.email)); } return;
      case 'bv-sms': if (P4.envoyerSms()) { son.jouer('envoye'); this.pc.toast(O.brevo.smsParti(P.selection.sms)); } return;
      case 'bv-relances':
        if (!P4.campagne.email) { son.jouer('erreur'); this.pc.toast(O.brevo.relancesSansEmail); return; }
        if (P4.activerRelances()) { son.jouer('succes'); this.pc.toast(O.brevo.relancesActives); } return;
      case 'bv-merci': if (P4.envoyerMerci()) { son.jouer('succes'); this.pc.toast(O.brevo.merciParti(P4.stats.destinataires)); } return;
    }
  }

  // la consigne du jeu en haut de la page : ce qu'il faut faire ici, ou ailleurs
  consigne() {
    const f = this.pc.aFaire(), B = O.brevo;
    if (!f) return '';
    let t = '';
    if (f.app !== 'brevo') t = f.quoi === 'courrier' || f.quoi === 'routage' ? B.versCourrier : f.quoi === 'stats' || f.quoi === 'merci' ? B.versStats : B.versVitisoft;
    else if (f.quoi !== this.onglet) t = B.onglet[f.quoi];
    else t = B.consigne[f.quoi](f.quoi === 'merci' ? this.P4.stats.destinataires : 0);
    return t ? `<p class="consigne bv-consigne">${esc(t)}</p>` : '';
  }

  html() {
    const P4 = this.P4, C = P4.campagne, voulu = this.voulu;
    if (!C.ouverte) return `<div class="bv"><header class="bv-tete"><b class="bv-nom">Brevo</b></header><div class="bv-vide"><p>${esc(O.brevo.aucune)}</p></div></div>`;
    const ong = [['email', 'Email', 'Invitation', C.email], ['sms', 'SMS', 'Invitation', C.sms], ['relances', 'Automatisations', 'Relances', C.relances]];
    if (this.avecMerci) ong.push(['merci', 'Email', 'Merci', P4.merci]);
    const nav = ong.map(([id, type, t, fait]) => `<button class="bv-ong${this.onglet === id ? ' on' : ''}${voulu === id && this.onglet !== id ? ' guide' : ''}" data-a="bv-onglet:${id}">
      <small>${type}</small><span>${t}</span><i class="bv-pt${fait ? ' ok' : ''}"></i></button>`).join('');
    const corps = this[this.onglet]();
    return `<div class="bv"><header class="bv-tete"><b class="bv-nom">Brevo</b><span class="bv-liste">${esc(O.brevo.liste(P.selection.total))}</span></header>
      <div class="bv-corps"><nav class="bv-nav"><b>Campagnes</b>${nav}</nav><main class="bv-main">${this.consigne()}${corps}</main></div></div>`;
  }
  // le statut d'une campagne : brouillon, ou envoyée (et ses chiffres une fois les portes ouvertes passées)
  statut(fait, txt = 'Envoyée') { return `<span class="bv-statut${fait ? ' ok' : ''}">${fait ? txt : 'Brouillon'}</span>`; }
  champs(l) { return `<dl class="bv-champs">${l.map(([t, v]) => `<dt>${esc(t)}</dt><dd>${v}</dd>`).join('')}</dl>`; }
  bouton(cle, fait, txt, attente = 'Envoyer') {
    const guide = this.voulu === this.onglet && !fait ? ' guide' : '';
    return `<div class="bv-pied">${fait ? `<p class="bv-fait">${esc(txt)}</p>` : `<button class="bv-bt${guide}" data-a="${cle}">${attente}</button>`}</div>`;
  }
  // l'aperçu d'un email : le modèle, au prénom d'un contact de la liste
  apercu(m, prenom, cta) {
    return `<article class="bv-mail"><header>${esc(P.domaine)}</header><h4>${esc(m.titre)}</h4>${m.corps.map(p => `<p>${esc(this.perso(p, prenom))}</p>`).join('')}
      ${cta ? `<span class="bv-cta">${esc(cta)}</span>` : ''}<footer><p class="bv-evin">${esc(P.email.mention)}</p><p>${esc(O.brevo.pied)} <u>${esc(P.email.desinscription)}</u></p></footer></article>`;
  }
  email() {
    const P4 = this.P4, fait = P4.campagne.email, avec = O.contacts.filter(c => c.email), c = avec[this.k % avec.length];
    const st = P4.caisse.tickets.length ? P4.stats : null;
    return `<div class="bv-titre"><h3>${esc(O.brevo.invitation)}</h3>${this.statut(fait)}</div>
      ${this.champs([['Expéditeur', esc(P.domaine)], ['Destinataires', esc(O.brevo.destEmail(P.selection.email))], ['Objet', esc(this.perso(P.email.objet, c.prenom))], ['Modèle', esc(O.brevo.modele)]])}
      ${st ? `<div class="bv-chiffres"><span><b>${P.selection.email}</b>envoyés</span><span><b>${pct(st.ouvertures)}</b>ouvertures</span><span><b>${pct(st.clics)}</b>clics</span></div>` : ''}
      <div class="bv-apercu"><p class="bv-pour">Aperçu pour <b>${esc(c.prenom + ' ' + c.nom)}</b><button data-a="bv-contact">Contact suivant</button></p>
      ${this.apercu({ titre: P.email.titre, corps: P.email.corps }, c.prenom, P.email.bouton)}</div>
      ${this.bouton('bv-email', fait, O.brevo.emailParti(P.selection.email))}`;
  }
  sms() {
    const fait = this.P4.campagne.sms, txt = this.perso(P.sms, '');
    return `<div class="bv-titre"><h3>${esc(O.brevo.invitationSms)}</h3>${this.statut(fait)}</div>
      ${this.champs([['Expéditeur', esc(O.brevo.expSms)], ['Destinataires', esc(O.brevo.destSms(P.selection.sms))], ['Message', `${esc(txt)}<small class="bv-car">${txt.length} caractères</small>`]])}
      <div class="bv-tel"><div class="bv-ecran"><small>${esc(O.brevo.expSms)}</small><p class="bv-bulle">${esc(txt)}</p></div></div>
      ${this.bouton('bv-sms', fait, O.brevo.smsParti(P.selection.sms))}`;
  }
  // les relances automatiques : un scénario qui part de l'invitation envoyée (Automatisations)
  relances() {
    const P4 = this.P4, C = P4.campagne, j = this.pc.jourJ;
    const quand = r => r.id === 'j7' ? dateJeu(j - 7) : dateJeu(j - 1);
    const etapes = P.relances.map(r => `<li><span class="bv-quand">${esc(r.quand)}<small>${esc(quand(r))}</small></span>
      <span class="bv-qui">${esc(r.qui)}</span><span class="bv-obj"><small>Email</small>${esc(r.objet)}</span></li>`).join('');
    const pied = C.relances ? `<div class="bv-pied"><p class="bv-fait">${esc(O.brevo.relancesActives)}</p></div>`
      : `<div class="bv-pied"><button class="bv-bt${this.voulu === 'relances' ? ' guide' : ''}" data-a="bv-relances"${C.email ? '' : ' disabled'}>Activer</button>${C.email ? '' : `<p class="bv-note">${esc(O.brevo.relancesSansEmail)}</p>`}</div>`;
    return `<div class="bv-titre"><h3>${esc(O.brevo.relances)}</h3>${this.statut(C.relances, 'Active')}</div>
      <p class="bv-depart">${esc(O.brevo.declencheur(P.selection.email))}</p><ol class="bv-flux">${etapes}</ol>${pied}`;
  }
  // le merci, par mail, à ceux qui sont passés (les invités venus, les nouveaux clients qui ont pris leur ticket par mail)
  merci() {
    const P4 = this.P4, n = P4.stats.destinataires, c = O.contacts[0];
    return `<div class="bv-titre"><h3>${esc(O.brevo.merci)}</h3>${this.statut(P4.merci)}</div>
      ${this.champs([['Expéditeur', esc(P.domaine)], ['Destinataires', esc(O.brevo.destMerci(n))], ['Objet', esc(P.merci.objet)], ['Modèle', esc(O.brevo.modeleMerci)]])}
      <div class="bv-apercu"><p class="bv-pour">Aperçu pour <b>${esc(c.prenom + ' ' + c.nom)}</b></p>${this.apercu({ titre: O.brevo.titreMerci, corps: P.merci.corps }, c.prenom, '')}</div>
      ${this.bouton('bv-merci', P4.merci, O.brevo.merciParti(n))}`;
  }
}
