// Mission 3 : « L'habillage », le lendemain de la journée de traitement (Teddy, 24/11/2026), le jeudi 10 décembre. Le
// Clos 2025, rouge, attend au domaine en bouteilles tirées-bouchées : six palox sur une remorque (de grosses quantités :
// Teddy, 24/11/2026) ; l'imprimerie Saint-Vincent l'habille cet après-midi : il lui faut la contre-étiquette, avec le QR
// code des ingrédients et de la déclaration nutritionnelle.
// 1. À la remorque, à pied : une bouteille d'un palox, l'échantillon pour le labo.
// 2. En tracteur (lui seul tire la remorque), on l'attelle : arrêté devant le timon, il recule tout seul, on met la
//    goupille.
// 3. Au labo d'œnologie, dans le bourg (la remorque suit) : on donne l'échantillon à l'œnologue ; son bulletin d'analyse
//    arrive sur le téléphone.
// 4. Dans Viticode (téléphone) : la fiche produit, avec les valeurs du bulletin ; publiée, elle a son QR code ; on la
//    teste (« Testez-moi ! » : la fiche telle que le client la verra) ; on personnalise le QR code (le titre
//    « Ingrédients » et le pied de page de la valeur énergétique restent), on le télécharge et on l'envoie à
//    l'imprimerie ; on valide son BAT (Messages).
// 5. À l'entrepôt de l'imprimerie : on dételle la remorque dans la cour ; Julien, l'étiqueteur, décharge les palox au
//    chariot élévateur et les rentre près de la ligne d'habillage ; la ligne tourne. On est libre : un SMS arrive quand
//    c'est terminé, avec la photo d'une bouteille habillée et le lien de sa fiche.
// Pour finir toujours : l'objectif est recalculé d'après l'état ; arrivé quelque part trop tôt, on entend ce qui manque ;
// la fiche ne se publie que si elle correspond au bulletin, et le téléphone dit pourquoi.
// La remorque et le chariot passent par main.js (jeu.remorque, jeu.chariot : remorque.js).
import { HABILLAGE as HX, energie } from './textes.js';
import { son } from './audio.js';
import { ecart } from './reseau.js';

const RAPPEL = 8;        // secondes au moins entre deux aides dites en route
const BULLETIN = 25;     // secondes entre l'échantillon donné et le bulletin du labo
const BAT = 5;           // secondes entre l'envoi du fichier et le BAT de l'imprimerie
const HABILLER = 45;     // secondes entre le dernier palox rentré et le SMS : c'est terminé
const prec = (a, b) => Math.abs(a - b) < 1e-6;
export const nouvelleFiche = () => ({
  nom: '', millesime: '', appellation: '', lot: '', degre: null, couleur: null, ingr: new Set(), bio: false,
  glucides: 0, sucres: 0, energie: null, base: null, negligeable: true, labels: [],
  perso: { domaine: false, format: 'svg', bordures: false, couleur: '#e84e1b', titre: true, pied: true },
});

export class Habillage {
  // c : { oeno, etiq : les entrées de l'œnologue et de l'étiqueteur (clients.js) } ; jeu : main.js (jeu.remorque,
  // jeu.chariot : la remorque de palox et le chariot élévateur)
  constructor(jeu, c) {
    this.j = jeu; this.c = c; this.etape = 'avant'; this.t = 0; this.horloge = 0;
    this.lu = false;
    this.echantillon = 'aucun'; // pris (dans la poche), depose (au labo)
    this.bulletin = false; this.tBulletin = 0;
    this.fiche = nouvelleFiche();
    this.publiee = false; this.testee = false; this.telecharge = false; this.envoye = false;
    this.bat = 'aucun'; this.tBat = 0; this.tImprime = 0; // recu, ok
    this.attelee = false;   // la remorque est attelée au tracteur
    this.livre = false;     // dételée dans la cour de l'imprimerie
    this.decharge = false;  // les six palox sont dans le hangar
    this.tSms = 0; this.sms = false; this.smsLu = false; // le SMS de la fin
    this.occupe = false;
    this.message = HX.messages.imprimerie.apercu; this.fil = 'imprimerie';
    this.objAff = null; this.itin = null; this.tItin = 0; this.tObj = 0;
    this.tRappel = 0; this.aideCle = null; this.aideT = -1e9; this.dit = false; this.tFin = 0;
  }
  get actif() { return this.etape !== 'avant'; }
  get vin() { return HX.vin; }
  get R() { return this.j.remorque; }
  // l'œnologue et l'étiqueteur ont fait leur affaire (clients.js : ils rentrent) ; l'étiqueteur, lui, monte sur son
  // chariot (main.js : jeu.chariot)
  fait(id) { return id === 'labo' ? this.echantillon === 'depose' : false; }

  /* ------------------------------------------------------------ déroulé */
  // au réveil (main.js : dormir), ou lancée depuis l'accueil
  demarrer() {
    this.etape = 'debut'; this.t = 0;
    this.j.hud.banniere(...HX.bannieres.titre, 4.5);
  }
  aller(e) { this.etape = e; this.t = 0; this.itin = null; }
  // La sauvegarde : où en est la journée, prise hors des gestes ; à la reprise, on est au domaine, à pied, la remorque
  // dételée là où elle était (au domaine, ou dans la cour de l'imprimerie) ; main.js remet ce qui se voit
  get stable() { return ['debut', 'message', 'jour', 'sms', 'fin', 'libre'].includes(this.etape) && !this.occupe && !this.j.gestes.actif && (!this.livre || this.decharge); }
  instantane() {
    const F = this.fiche;
    return {
      etape: this.etape === 'debut' ? 'message' : this.etape === 'fin' ? 'libre' : this.etape, lu: this.lu,
      echantillon: this.echantillon, bulletin: this.bulletin, tB: this.tBulletin,
      fiche: { ...F, ingr: [...F.ingr], labels: [...F.labels], perso: { ...F.perso } },
      publiee: this.publiee, testee: this.testee, telecharge: this.telecharge, envoye: this.envoye, bat: this.bat,
      livre: this.livre, decharge: this.decharge, tSms: this.tSms, sms: this.sms, smsLu: this.smsLu,
    };
  }
  reprendre(o) {
    this.lu = o.lu; this.echantillon = o.echantillon; this.bulletin = o.bulletin; this.tBulletin = Math.min(o.tB || 0, 10);
    this.fiche = { ...nouvelleFiche(), ...o.fiche, ingr: new Set(o.fiche.ingr), labels: [...(o.fiche.labels || [])], perso: { ...nouvelleFiche().perso, ...o.fiche.perso } };
    this.publiee = o.publiee; this.testee = o.testee; this.telecharge = o.telecharge; this.envoye = o.envoye;
    this.bat = o.bat; this.tBat = 3; this.tImprime = 0;
    this.attelee = false; this.livre = !!o.livre; this.decharge = !!o.decharge; this.tSms = Math.min(o.tSms || 0, 20); this.sms = !!o.sms; this.smsLu = !!o.smsLu;
    this.dit = true;
    this.fil = this.sms ? 'imprimerie' : this.bulletin && !this.envoye ? 'labo' : 'imprimerie';
    this.aller(o.etape === 'message' && this.lu ? 'jour' : o.etape);
    if (this.etape === 'message') this.notifier('messages', HX.messages.imprimerie.apercu);
  }
  aider(lignes, cle) {
    if (!lignes || this.tRappel > 0 || (cle === this.aideCle && this.horloge - this.aideT < 25)) return;
    this.j.hud.dire(lignes); this.tRappel = RAPPEL; this.aideCle = cle; this.aideT = this.horloge;
  }
  notifier(app, msg, fil) { this.message = msg || this.message; if (fil) this.fil = fil; this.j.tel.notifier(app); son.jouer('vibre'); }
  // le message de l'imprimerie lu (Messages) : on sait quoi faire ; le SMS de la fin lu : c'est fini
  messageLu() {
    if (this.sms && !this.smsLu) { this.smsLu = true; if (this.etape === 'sms') this.finir(); return; }
    if (this.lu) return;
    this.lu = true;
    if (this.etape === 'debut' || this.etape === 'message') { this.aller('jour'); this.j.hud.dire(HX.dialogues.luMessage); }
  }

  // La prochaine destination : la remorque au domaine (l'échantillon à pied, puis l'atteler en tracteur), le labo, la
  // cour de l'imprimerie ; rien tant qu'on attend le bulletin, qu'il reste à faire sur le téléphone, ou le SMS
  get prochain() {
    const L = this.j.lieux, R = this.R;
    if (this.livre) return null;
    if (this.echantillon === 'aucun' || !this.attelee) return { lieu: R.ici, nom: 'Remorque du Clos' };
    if (this.echantillon === 'pris') return { lieu: L.arrets.labo, nom: 'Labo d\'œnologie' };
    if (this.bat !== 'ok') return null;
    return { lieu: L.entrepot.depot, nom: 'Imprimerie Saint-Vincent' };
  }
  get cible() {
    if (this.etape !== 'jour' || this.occupe) return null;
    const p = this.prochain;
    return p ? p.lieu : null;
  }
  get nomCible() { const p = this.prochain; return p ? p.nom : ''; }
  // l'itinéraire jusqu'à la balise, refait si l'on s'en écarte (ou si la remorque a bougé)
  get route() {
    const c = this.cible;
    if (!c) return null;
    const j = this.j, o = j.auVolant ? j.tr.pos : j.joueur.pos;
    if (!this.itin || this.itin.c !== c || (c === this.R.ici && (this.itin.x !== c.x || this.itin.z !== c.z))) this.itin = { c, x: c.x, z: c.z, pts: j.reseau.itineraire(o, c) };
    return this.itin.pts;
  }
  get enTracteur() { return this.j.auVolant && this.j.veh.genre === 'tracteur'; }

  // L'objectif affiché, d'après où en est la journée
  get objectif() {
    const e = this.etape, O = HX.objectifs;
    if (e === 'avant') return null;
    if (e === 'debut' || e === 'message') return O.message;
    if (e === 'sms') return O.sms;
    if (e === 'fin' || e === 'libre') return O.fin;
    if (this.livre) return this.decharge ? O.attente : O.dechargement;
    if (this.echantillon === 'aucun') return O.echantillon;
    if (!this.attelee) return this.enTracteur ? O.atteler : O.tracteur;
    if (this.echantillon === 'pris') return O.labo;
    if (!this.bulletin) return O.analyse;
    if (!this.publiee) return O.fiche;
    if (!this.testee && !this.telecharge) return O.tester;
    if (!this.telecharge) return O.telecharger;
    if (!this.envoye) return O.envoyer;
    if (this.bat !== 'ok') return this.bat === 'recu' ? O.bat : O.envoyer;
    return O.entrepot;
  }

  update(dt) {
    const j = this.j, hud = j.hud;
    if (this.etape === 'avant') return;
    this.t += dt; this.horloge += dt;
    this.tRappel = Math.max(0, this.tRappel - dt);
    if (this.itin && (this.tItin -= dt) <= 0) {
      this.tItin = 0.5;
      const o = j.auVolant ? j.tr.pos : j.joueur.pos;
      if (ecart(this.itin.pts, o) > 25) this.itin = null;
    }
    // le bulletin du labo, le BAT de l'imprimerie, le SMS de la fin : ils arrivent pendant qu'on joue
    if (this.echantillon === 'depose' && !this.bulletin && (this.tBulletin -= dt) <= 0) {
      this.bulletin = true;
      this.notifier('messages', HX.messages.labo.apercu, 'labo');
      hud.banniere(...HX.bannieres.bulletin, 3.2); hud.dire(HX.dialogues.bulletin);
      j.tel.rafraichir('v'); j.tel.rafraichir('messages');
    }
    if (this.envoye && this.bat === 'aucun' && (this.tBat -= dt) <= 0) {
      this.bat = 'recu';
      this.notifier('messages', HX.messages.imprimerie.recu, 'imprimerie');
      hud.dire(HX.dialogues.bat);
      j.tel.rafraichir('messages');
    }
    if (this.bat === 'ok' && this.tImprime > 0 && (this.tImprime -= dt) <= 0) { son.jouer('notif'); j.tel.rafraichir('messages'); }
    // le déchargement au chariot (main.js) : les palox rentrés, la ligne tourne ; le SMS un peu plus tard
    if (this.livre && !this.decharge && j.chariot.fini) {
      this.decharge = true; this.tSms = HABILLER;
      hud.banniere(...HX.bannieres.decharge, 3); hud.dire(HX.dialogues.decharge);
    }
    if (this.decharge && !this.sms && (this.tSms -= dt) <= 0) {
      this.sms = true; this.aller('sms');
      this.notifier('messages', HX.messages.imprimerie.termine, 'imprimerie');
      hud.banniere(...HX.bannieres.sms, 3.2);
      j.tel.rafraichir('messages');
    }
    switch (this.etape) {
      case 'debut':
        if (this.t > 1.2 && !this.dit) { this.dit = true; hud.dire(HX.dialogues.reveil); this.notifier('messages', HX.messages.imprimerie.apercu, 'imprimerie'); }
        if (this.t > 4) this.aller(this.lu ? 'jour' : 'message');
        break;
      case 'message':
        if (this.t > 25) this.messageLu(); // sans l'avoir ouvert, on sait quand même quoi faire
        break;
      case 'jour': this.jour(); break;
      case 'sms':
        if (this.smsLu && !j.tel.ouvert) this.finir();
        break;
      case 'fin':
        if (this.t > 6) { this.aller('libre'); j.finMission3(); }
        break;
    }
    // l'objectif : dix fois par seconde (il fabrique des textes), tout de suite après un changement d'étape
    if ((this.tObj -= dt) <= 0 || this.t === dt) {
      this.tObj = 0.1;
      const o = this.objectif;
      if (o && o !== this.objAff) { this.objAff = o; hud.objectif(o); }
    }
  }

  // Dehors : à la remorque, on l'attelle (en tracteur) ; au labo, on donne l'échantillon ; dans la cour de l'imprimerie,
  // on dételle. Arrêté quelque part trop tôt, on entend ce qui manque.
  jour() {
    const j = this.j, L = j.lieux, R = this.R;
    if (this.occupe || j.gestes.actif || j.tel.ouvert || j.pc.ouvert) return;
    const v = j.auVolant ? Math.abs(j.tr.v) : 0, lent = j.auVolant && v < 2.5, arrete = !j.auVolant || v < 0.6;
    // la remorque, pas encore attelée : en tracteur, devant le timon, on l'attelle ; avec un autre véhicule, on le dit
    if (!this.attelee && !this.livre && j.auVolant && arrete && j.distance(R.ici) < 9) {
      if (j.veh.genre !== 'tracteur') this.aider(HX.dialogues.pasTracteur, 'remorque');
      else if (R.peutAtteler()) { this.atteler(); return; }
      else this.aider(HX.dialogues.timon, 'remorque');
    }
    // au labo d'œnologie
    {
      const f = L.figurants.labo, d = j.distance(L.arrets.labo), dF = j.distance(f);
      if (this.echantillon !== 'depose' && ((lent && d < 6.5) || (!j.auVolant && (d < 4.5 || dF < 3)))) {
        if (this.echantillon === 'pris') { this.donnerEchantillon(); return; }
        if (arrete) this.aider(HX.dialogues.sansEchantillon, 'labo');
      }
    }
    // dans la cour de l'imprimerie
    {
      const E = L.entrepot, d = j.distance(E.depot), dF = j.distance(E.figurant);
      if (!this.livre && ((lent && d < 8) || (!j.auVolant && dF < 4))) {
        if (this.bat !== 'ok') { if (arrete) this.aider(HX.dialogues.pasFichier, 'entrepot'); }
        else if (!this.attelee) { if (arrete) this.aider(HX.dialogues.pasRemorque, 'entrepot'); }
        else if (arrete && this.enTracteur) { this.deteler(); return; }
      }
    }
  }

  // L'échantillon : à pied, près d'un palox de la remorque (main.js : l'étiquette « Prendre un échantillon », agir)
  get echantillonProche() {
    const j = this.j;
    if (this.etape === 'avant' || this.echantillon !== 'aucun' || j.auVolant || j.gestes.actif || this.livre) return false;
    const P = this.R.debout();
    return Math.hypot(j.joueur.pos.x - P.x, j.joueur.pos.z - P.z) < 1.6;
  }
  prendreEchantillon() {
    if (!this.echantillonProche) return;
    const j = this.j;
    if (this.etape === 'debut' || this.etape === 'message') { this.lu = true; this.aller('jour'); }
    this.occupe = true;
    j.gestes.echantillon(this.R.pointEchantillon(), () => {
      this.occupe = false; this.echantillon = 'pris'; this.itin = null;
      son.jouer('succes');
      j.hud.dire(this.attelee ? HX.dialogues.echantillonAttelee : HX.dialogues.echantillon);
    });
  }
  // Atteler : arrêté devant le timon, en tracteur ; il recule tout seul jusqu'à l'anneau, on descend mettre la goupille,
  // on remonte (main.js : jeu.remorque.atteler, remorque.js)
  atteler() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider();
    this.R.atteler(() => {
      this.occupe = false; this.attelee = true; this.itin = null;
      son.jouer('succes');
      j.hud.banniere(...HX.bannieres.attelee, 3);
      j.hud.dire(this.echantillon === 'aucun' ? HX.dialogues.atteleeSansEchantillon : this.bat === 'ok' ? HX.dialogues.versEntrepot : HX.dialogues.attelee);
    });
  }
  // Au labo : arrêté devant, on descend ; on va voir l'œnologue, on parle, on lui tend la bouteille ; elle la rentre au
  // labo (clients.js) ; on remonte. Le bulletin arrive un peu plus tard (update).
  donnerEchantillon() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider();
    j.donner(j.lieux.figurants.labo, HX.dialogues.labo, () => {
      // dans ses mains à elle
      const G = this.c.oeno.gestes, b = G.bouteille(false);
      b.visible = true; b.position.set(0, 0.95, 0.3); this.c.oeno.p.porte = b;
      this.echantillon = 'depose'; this.tBulletin = BULLETIN; this.itin = null;
      son.jouer('carton');
    }, () => { this.occupe = false; });
  }
  // Dans la cour de l'imprimerie : on dételle (béquille, goupille), le tracteur avance un peu ; Julien monte sur son
  // chariot élévateur et rentre les palox (main.js : jeu.chariot) ; on est libre, le SMS viendra
  deteler() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider(); j.hud.dire(HX.dialogues.entrepot);
    this.R.deteler(() => {
      this.occupe = false; this.attelee = false; this.livre = true; this.itin = null;
      son.jouer('succes');
      j.hud.banniere(...HX.bannieres.livre, 3);
      j.chariot.lancer();
      setTimeout(() => j.hud.dire(HX.dialogues.chariot), 1200);
    });
  }
  finir() {
    const j = this.j;
    if (this.etape !== 'sms') return;
    this.aller('fin'); j.gagner('habillage'); // la mission 3 est gagnée (sauvegarde.js)
    son.jouer('succes');
    j.hud.banniere(...HX.bannieres.fin, 4.5);
    setTimeout(() => j.hud.dire(HX.dialogues.fin), 900);
  }

  /* ------------------------------------------------------------ Viticode (téléphone) */
  // un champ texte touché : le personnage le tape (les valeurs de la cuvée)
  remplir(champ) {
    const F = this.fiche, v = this.vin;
    if (this.publiee) return;
    if (champ === 'nom') F.nom = v.nom; else if (champ === 'millesime') F.millesime = v.millesime;
    else if (champ === 'appellation') F.appellation = v.appellation; else if (champ === 'lot') F.lot = v.lot;
  }
  degre(d) { const F = this.fiche; if (this.publiee) return; F.degre = F.degre === null ? 11 : Math.max(9, Math.min(15, Math.round((F.degre + d * 0.5) * 2) / 2)); }
  couleur(c) { if (!this.publiee) this.fiche.couleur = c; }
  ingredient(id) { const s = this.fiche.ingr; if (this.publiee) return; if (s.has(id)) s.delete(id); else s.add(id); if (id === 'raisins' && !s.has(id)) this.fiche.bio = false; }
  bio() { if (!this.publiee && this.fiche.ingr.has('raisins')) this.fiche.bio = !this.fiche.bio; }
  valeur(k, d) { const F = this.fiche; if (this.publiee) return; F[k] = Math.max(0, Math.min(5, Math.round((F[k] + d * 0.1) * 10) / 10)); }
  negligeable() { if (!this.publiee) this.fiche.negligeable = !this.fiche.negligeable; }
  // « Calculer mon énergie » : d'après le degré et les glucides saisis
  calculer() {
    const F = this.fiche;
    if (this.publiee || F.degre === null) return false;
    F.energie = energie(F.degre, F.glucides); F.base = { degre: F.degre, glucides: F.glucides };
    son.jouer('notif');
    return true;
  }
  // la fiche correspond-elle au bulletin ? null si oui, sinon ce qui ne va pas (le jeu le rappelle)
  verifier() {
    const F = this.fiche, v = this.vin, A = HX.app;
    if (!this.bulletin) return A.attente;
    if (!F.nom || !F.millesime || !F.appellation || !F.lot) return A.champs;
    if (F.couleur !== 'Rouge') return A.couleur;
    if (F.degre === null || !prec(F.degre, v.degre)) return A.degre(v);
    if (!F.ingr.has('raisins')) return A.raisins;
    if (!F.bio) return A.bio;
    if (!F.ingr.has('sulfites')) return A.sulfites;
    for (const C of HX.categories) for (const i of C.ingredients) if (F.ingr.has(i.id) && !HX.ingredients.includes(i.id)) return A.enTrop(i.nom);
    if (!prec(F.glucides, v.glucides)) return A.glucides(v);
    if (!prec(F.sucres, v.sucres)) return A.sucres(v);
    if (!F.energie || !F.base || !prec(F.base.degre, F.degre) || !prec(F.base.glucides, F.glucides)) return A.energie;
    return null;
  }
  publier() {
    if (this.publiee) return null;
    const err = this.verifier();
    if (err) return err;
    this.publiee = true;
    son.jouer('succes');
    this.j.hud.banniere(...HX.bannieres.publiee, 3); this.j.hud.dire(HX.dialogues.publiee);
    return null;
  }
  // la fiche vue côté consommateur (« Testez-moi ! », ou le lien du SMS de la fin)
  vue() {
    if (this.publiee && !this.testee) { this.testee = true; if (this.etape === 'jour') this.j.hud.dire(HX.dialogues.teste); }
  }
  regler(k, val) { const P = this.fiche.perso; if (k in P) P[k] = val; }
  // « Télécharger le QR code » : le titre et le pied de page restent (le jeu le rappelle)
  telecharger() {
    const P = this.fiche.perso;
    if (!P.titre) return HX.app.titre;
    if (!P.pied) return HX.app.pied;
    this.telecharge = true;
    return null;
  }
  // envoyé à l'imprimerie (la feuille de partage du téléphone) : le BAT arrive un peu plus tard
  envoyer() {
    if (!this.telecharge || this.envoye) return;
    this.envoye = true; this.tBat = BAT; this.fil = 'imprimerie';
    son.jouer('envoye');
    this.j.hud.banniere(...HX.bannieres.envoye, 3); this.j.hud.dire(HX.dialogues.envoye);
  }
  // « Bon pour accord » : l'imprimeur imprime, on peut lui amener les bouteilles
  accord() {
    if (this.bat !== 'recu') return;
    this.bat = 'ok'; this.tImprime = 1.5; this.itin = null;
    son.jouer('envoi');
    this.j.hud.banniere(...HX.bannieres.bat, 3); this.j.hud.dire(this.attelee ? HX.dialogues.versEntrepot : HX.dialogues.batOk);
  }
}
