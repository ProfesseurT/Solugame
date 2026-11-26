// Mission 3 : « L'habillage », le lendemain de la journée de traitement (Teddy, 24/11/2026), le jeudi 10 décembre. Le
// Clos 2025, rouge, attend au domaine en bouteilles tirées-bouchées : six palox (de grosses quantités : Teddy,
// 24/11/2026) ; l'imprimerie Saint-Vincent, dans la zone d'activités à l'est du bourg, l'habille cet après-midi : il lui
// faut la contre-étiquette, avec le QR code des ingrédients et de la déclaration nutritionnelle. Le déroulé (Teddy,
// 25/11/2026) :
// 1. Au chai, à pied : une bouteille du carton ouvert, l'échantillon pour le labo. La remorque n'est pas encore prête.
// 2. Au labo d'œnologie, dans le bourg : on donne l'échantillon à l'œnologue ; son bulletin d'analyse arrive sur le
//    téléphone. Pendant ce temps, Marc, le salarié du domaine, prépare la remorque de palox, à sa place, au bord de
//    l'allée ; de retour au domaine, il le dit.
// 3. Dans Viticode (téléphone) : la fiche produit, avec les valeurs du bulletin ; publiée, elle a son QR code ; on la
//    teste ; on personnalise le QR code (le titre « Ingrédients » et le pied de page de la valeur énergétique restent),
//    on le télécharge et on l'envoie à l'imprimerie ; on valide son BAT (Messages).
// 4. En tracteur (lui seul tire la remorque), arrêté devant le timon : il recule tout seul, Marc lève la béquille et met
//    la goupille ; on reste au volant.
// 5. À l'imprimerie : on dételle dans la cour ; Julien, l'étiqueteur, rentre les palox au chariot élévateur ; la ligne
//    tourne. L'habillage prend l'après-midi : on rentre dormir (ou six heures passent) ; le message de l'imprimerie
//    arrive (la photo d'une bouteille habillée, le lien de sa fiche) : la remorque est rechargée, tournée vers la sortie.
// 6. On va la chercher en tracteur : Julien aide à atteler ; on la ramène au chai, on la dételle : c'est fini.
// Pour finir toujours : l'objectif est recalculé d'après l'état ; arrivé quelque part trop tôt, on entend ce qui manque ;
// la fiche ne se publie que si elle correspond au bulletin, et le téléphone dit pourquoi.
// La nuit (Teddy, 26/11/2026 : les professionnels ne travaillent pas la nuit ; outils.js, HORAIRES) : le labo ferme à
// 18 h 30, Marc et l'imprimerie à 19 h 30, tous rouvrent à 7 h. Fermés, ils rentrent chez eux (clients.js) ; arrivé chez
// eux, on entend pourquoi ; le bulletin et le BAT attendent l'ouverture ; la ligne d'habillage ne tourne qu'aux heures
// d'ouverture (six heures de travail, ou une nuit dormie) ; ce qui se fait seul (l'échantillon, la fiche Viticode, le BAT
// à valider) se fait encore, sinon l'objectif dit de rentrer dormir (nuit), et la mission reprend le matin.
// La remorque, le chariot, le carton ouvert du chai passent par main.js (jeu.remorque, jeu.chariot, jeu.carton).
import { HABILLAGE as HX, energie } from './textes.js';
import { son } from './audio.js';
import { ecart } from './reseau.js';
import { ouvert, minutesOuvertes, heureDe, dateJeu, jourDe, HORAIRES } from './outils.js';

const RAPPEL = 8;        // secondes au moins entre deux aides dites en route
const BULLETIN = 25;     // secondes entre l'échantillon donné et le bulletin du labo
const BAT = 5;           // secondes entre l'envoi du fichier et le BAT de l'imprimerie
const HABILLER = 360;    // minutes de travail de la ligne (aux heures d'ouverture) entre le dernier palox rentré et le message de l'imprimerie (sans dormir)
const METIER = { labo: 'labo', entrepot: 'imprimerie', salarie: 'domaine' }; // Hélène, Julien, Marc (clients.js : horaire)
const prec = (a, b) => Math.abs(a - b) < 1e-6;
export const nouvelleFiche = () => ({
  nom: '', millesime: '', appellation: '', lot: '', degre: null, couleur: null, ingr: new Set(), bio: false,
  glucides: 0, sucres: 0, energie: null, base: null, negligeable: true, labels: [],
  perso: { domaine: false, format: 'svg', bordures: false, couleur: '#e84e1b', titre: true, pied: true },
});

export class Habillage {
  // c : { oeno, etiq, salarie : les entrées de l'œnologue, de l'étiqueteur et du salarié du domaine (clients.js) } ;
  // jeu : main.js (jeu.remorque, jeu.chariot : la remorque de palox et le chariot élévateur ; jeu.carton : le carton
  // ouvert du chai)
  constructor(jeu, c) {
    this.j = jeu; this.c = c; this.etape = 'avant'; this.t = 0; this.horloge = 0;
    this.lu = false;
    this.echantillon = 'aucun'; // pris (dans la poche), depose (au labo)
    this.bulletin = false; this.tBulletin = 0;
    this.fiche = nouvelleFiche();
    this.publiee = false; this.testee = false; this.telecharge = false; this.envoye = false;
    this.bat = 'aucun'; this.tBat = 0; this.tImprime = 0; // recu, ok
    this.annonce = false;   // Marc a dit que la remorque est prête (elle l'est dès l'échantillon donné)
    this.attelee = false;   // la remorque est attelée au tracteur
    this.livre = false;     // dételée dans la cour de l'imprimerie
    this.decharge = false; this.minDecharge = 0; // les six palox sont dans le hangar (et à quelle heure du jeu)
    this.sms = false; this.smsLu = false; this.tSms = 0; // le message de l'imprimerie : c'est habillé
    this.rentree = false;   // ramenée au chai, les palox rentrés : c'est fini
    this.marc = false;      // posée au chai : Marc rentre les palox au transpalette (main.js : jeu.marc)
    this.occupe = false;
    this.message = HX.messages.imprimerie.apercu; this.fil = 'imprimerie';
    this.objAff = null; this.itin = null; this.tItin = 0; this.tObj = 0;
    this.tRappel = 0; this.aideCle = null; this.aideT = -1e9; this.dit = false;
  }
  get actif() { return this.etape !== 'avant'; }
  get vin() { return HX.vin; }
  get R() { return this.j.remorque; }
  get prete() { return this.echantillon === 'depose'; } // la remorque, préparée par Marc pendant qu'on est au labo
  get attendNuit() { return this.decharge && !this.sms; } // l'habillage en cours : on rentre dormir (main.js : dormir)
  // l'œnologue a fait son affaire (clients.js : elle rentre) ; l'étiqueteur et le salarié, eux, restent dehors
  fait(id) { return id === 'labo' ? this.echantillon === 'depose' : false; }
  // Leurs heures d'ouverture (clients.js) : leur métier ; une affaire en cours avec eux (on ne rentre pas au milieu : un
  // geste de la mission, le déchargement au chariot, les palox que Marc rentre au chai) ; le matin, ressortent-ils ?
  // (Hélène, tant qu'elle n'a pas l'échantillon ; Julien, toujours ; Marc, la remorque prête et pas encore attelée)
  horaire(id) { return METIER[id]; }
  ouvertA(id) { return ouvert(this.j.minutes, METIER[id]); }
  occupeAvec(id) { return this.occupe || (id === 'entrepot' && this.livre && !this.decharge) || (id === 'salarie' && this.marc); }
  veut(id) { return id === 'labo' ? !this.fait('labo') : id === 'salarie' ? this.actif && this.prete && !this.attelee && !this.livre && !this.sms : true; }
  get date() { return dateJeu(jourDe(this.j.minutes)); }
  get tot() { return heureDe(this.j.minutes) < HORAIRES.labo[0]; }
  // La nuit : ce qui attend un professionnel fermé, quand rien ne reste à faire seul (l'échantillon au chai, la fiche
  // Viticode, le BAT à valider) : la clé de l'objectif (HX.objectifs.nuit), la balise sur la maison ; sinon null
  get nuit() {
    if (this.etape !== 'jour' || this.occupe || this.marc || this.rentree || (this.livre && !this.sms)) return null;
    const labo = this.ouvertA('labo'), imp = this.ouvertA('entrepot'), dom = this.ouvertA('salarie');
    if (this.sms) return this.attelee ? (dom ? null : 'chai') : (imp ? null : 'reprendre');
    if (this.echantillon === 'aucun') return null;
    if (this.echantillon === 'pris') return labo ? null : 'labo';
    // le bulletin arrivé : la fiche, le QR code, l'envoi, le BAT à valider se font seuls (le BAT, lui, attend l'imprimerie)
    if (this.bulletin && this.bat !== 'ok' && (!this.envoye || this.bat === 'recu' || imp)) return null;
    if (!this.attelee) return dom ? null : 'marc';
    if (!this.bulletin) return labo ? null : 'bulletin';
    if (this.bat !== 'ok') return imp ? null : 'bat';
    return imp ? null : 'imprimerie';
  }

  /* ------------------------------------------------------------ déroulé */
  // au réveil (main.js : dormir), ou lancée depuis l'accueil
  demarrer() {
    this.etape = 'debut'; this.t = 0;
    this.j.hud.banniere(...HX.bannieres.titre(this.date), 4.5);
  }
  aller(e) { this.etape = e; this.t = 0; this.itin = null; }
  // La sauvegarde : où en est la journée, prise hors des gestes ; à la reprise, on est au domaine, à pied, la remorque
  // dételée là où elle doit être (cachée, à sa place au domaine, dans la cour de l'imprimerie, au chai) ; main.js remet
  // ce qui se voit
  get stable() { return ['debut', 'message', 'jour', 'fin', 'libre'].includes(this.etape) && !this.occupe && !this.marc && !this.j.gestes.actif && (!this.livre || this.decharge); }
  instantane() {
    const F = this.fiche;
    return {
      etape: this.etape === 'debut' ? 'message' : this.etape === 'fin' ? 'libre' : this.etape, lu: this.lu,
      echantillon: this.echantillon, bulletin: this.bulletin, tB: this.tBulletin,
      fiche: { ...F, ingr: [...F.ingr], labels: [...F.labels], perso: { ...F.perso } },
      publiee: this.publiee, testee: this.testee, telecharge: this.telecharge, envoye: this.envoye, bat: this.bat,
      annonce: this.annonce, livre: this.livre, decharge: this.decharge, minD: this.minDecharge, sms: this.sms, smsLu: this.smsLu,
      rentree: this.rentree || this.etape === 'fin' || this.etape === 'libre',
    };
  }
  reprendre(o) {
    this.lu = o.lu; this.echantillon = o.echantillon; this.bulletin = o.bulletin; this.tBulletin = Math.min(o.tB || 0, 10);
    this.fiche = { ...nouvelleFiche(), ...o.fiche, ingr: new Set(o.fiche.ingr), labels: [...(o.fiche.labels || [])], perso: { ...nouvelleFiche().perso, ...o.fiche.perso } };
    this.publiee = o.publiee; this.testee = o.testee; this.telecharge = o.telecharge; this.envoye = o.envoye;
    this.bat = o.bat; this.tBat = 3; this.tImprime = 0;
    this.annonce = !!o.annonce; this.attelee = false; this.livre = !!o.livre; this.decharge = !!o.decharge;
    this.minDecharge = o.minD ?? this.j.minutes; this.sms = !!o.sms; this.smsLu = !!o.smsLu; this.rentree = !!o.rentree;
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
  // le message de l'imprimerie lu (Messages) : on sait quoi faire ; celui d'après l'habillage : lu
  messageLu() {
    if (this.sms) { this.smsLu = true; return; }
    if (this.lu) return;
    this.lu = true;
    if (this.etape === 'debut' || this.etape === 'message') { this.aller('jour'); this.j.hud.dire(HX.dialogues.luMessage); }
  }

  // La prochaine destination : le chai (l'échantillon, à pied), le labo, la remorque au domaine (l'atteler en tracteur),
  // la cour de l'imprimerie ; la maison (dormir, l'habillage en cours) ; l'imprimerie (la reprendre) ; le chai (la poser).
  // Rien tant qu'il reste à faire sur le téléphone avant de partir.
  get prochain() {
    const L = this.j.lieux, R = this.R;
    if (this.rentree || this.marc) return null;
    if (this.nuit) return { lieu: L.maison, nom: 'Maison' }; // (la nuit, plus rien à faire seul : rentrer dormir)
    if (this.sms) return this.attelee ? { lieu: L.remorque.chai.arret, nom: 'Le chai' } : { lieu: L.entrepot.arrivee, nom: 'Imprimerie Saint-Vincent' };
    if (this.livre) return this.decharge ? { lieu: L.maison, nom: 'Maison' } : null;
    if (this.echantillon === 'aucun') return { lieu: this.j.carton, nom: 'Le chai' };
    if (this.echantillon === 'pris') return { lieu: L.arrets.labo, nom: 'Labo d\'œnologie' };
    // l'atteler : la balise devant le timon (la conduite assistée s'y arrête, alignée)
    if (!this.attelee) return { lieu: R.approche, nom: 'Remorque du Clos' };
    if (this.bat !== 'ok') return null;
    return { lieu: L.entrepot.depot, nom: 'Imprimerie Saint-Vincent' };
  }
  get cible() {
    if (this.etape !== 'jour' || this.occupe) return null;
    const p = this.prochain;
    return p ? p.lieu : null;
  }
  get nomCible() { const p = this.prochain; return p ? p.nom : ''; }
  // l'itinéraire jusqu'à la balise, refait si l'on s'en écarte (ou si la balise a bougé)
  get route() {
    const c = this.cible;
    if (!c) return null;
    const j = this.j, o = j.auVolant ? j.tr.pos : j.joueur.pos;
    if (!this.itin || this.itin.c !== c || Math.hypot(this.itin.x - c.x, this.itin.z - c.z) > 3) this.itin = { c, x: c.x, z: c.z, pts: j.reseau.itineraire(o, c) };
    return this.itin.pts;
  }
  get enTracteur() { return this.j.auVolant && this.j.veh.genre === 'tracteur'; }

  // L'objectif affiché, d'après où en est la journée
  get objectif() {
    const e = this.etape, O = HX.objectifs;
    if (e === 'avant') return null;
    if (e === 'debut' || e === 'message') return O.message;
    if (e === 'fin' || e === 'libre') return O.fin;
    if (this.marc) return O.marc;
    const nuit = this.nuit;
    if (nuit) return O.nuit[nuit];
    if (this.sms) return this.attelee ? O.chai : this.enTracteur ? O.reprendre : O.reprendreTracteur;
    if (this.livre) return this.decharge ? O.attente : O.dechargement;
    if (this.echantillon === 'aucun') return O.echantillon;
    if (this.echantillon === 'pris') return O.labo;
    // le bulletin arrivé : Viticode d'abord (on est sur le téléphone) ; sinon, la remorque
    if (this.bulletin && this.bat !== 'ok') {
      if (!this.publiee) return O.fiche;
      if (!this.testee && !this.telecharge) return O.tester;
      if (!this.telecharge) return O.telecharger;
      if (!this.envoye) return O.envoyer;
      return this.bat === 'recu' ? O.bat : O.envoyer;
    }
    if (!this.attelee && !this.annonce) return O.retour;
    if (!this.attelee) return this.enTracteur ? O.atteler : O.tracteur;
    if (!this.bulletin) return O.analyse;
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
    // le bulletin du labo, le BAT de l'imprimerie : ils arrivent pendant qu'on joue, aux heures d'ouverture (la nuit, ils
    // attendent le matin)
    if (this.echantillon === 'depose' && !this.bulletin && (this.tBulletin -= dt) <= 0 && this.ouvertA('labo')) {
      this.bulletin = true;
      this.notifier('messages', HX.messages.labo.apercu, 'labo');
      hud.banniere(...HX.bannieres.bulletin, 3.2); hud.dire(HX.dialogues.bulletin);
      j.tel.rafraichir('v'); j.tel.rafraichir('messages');
    }
    if (this.envoye && this.bat === 'aucun' && (this.tBat -= dt) <= 0 && this.ouvertA('entrepot')) {
      this.bat = 'recu';
      this.notifier('messages', HX.messages.imprimerie.recu, 'imprimerie');
      hud.dire(HX.dialogues.bat);
      j.tel.rafraichir('messages');
    }
    if (this.bat === 'ok' && this.tImprime > 0 && (this.tImprime -= dt) <= 0) { son.jouer('notif'); j.tel.rafraichir('messages'); }
    // le déchargement au chariot (main.js) : les palox rentrés, la ligne tourne ; l'habillage prend l'après-midi
    if (this.livre && !this.decharge && j.chariot.fini) {
      this.decharge = true; this.minDecharge = j.minutes;
      hud.banniere(...HX.bannieres.decharge, 3); hud.dire(HX.dialogues.decharge);
    }
    // sans dormir : six heures de travail plus tard (la ligne ne tourne qu'aux heures d'ouverture), quand on est loin de
    // l'imprimerie (la remorque y est rechargée, sans qu'on le voie)
    if (this.attendNuit && this.ouvertA('entrepot') && minutesOuvertes(this.minDecharge, j.minutes, 'imprimerie') >= HABILLER && j.distance(j.lieux.entrepot.depot) > 90) this.habille(false);
    // le message de l'imprimerie, un peu après (au réveil : le temps de sortir dans la cour)
    if (this.tSms > 0 && (this.tSms -= dt) <= 0) {
      this.notifier('messages', HX.messages.imprimerie.termine, 'imprimerie');
      hud.banniere(...HX.bannieres.sms, 3.2); hud.dire(HX.dialogues.sms);
      j.tel.rafraichir('messages');
    }
    switch (this.etape) {
      case 'debut':
        if (this.t > 1.2 && !this.dit) { this.dit = true; hud.dire(HX.dialogues.reveil(this.date)); this.notifier('messages', HX.messages.imprimerie.apercu, 'imprimerie'); }
        if (this.t > 4) this.aller(this.lu ? 'jour' : 'message');
        break;
      case 'message':
        if (this.t > 25) this.messageLu(); // sans l'avoir ouvert, on sait quand même quoi faire
        break;
      case 'jour': this.jour(); break;
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

  // Dehors : de retour au domaine, Marc dit que la remorque est prête ; à la remorque, on l'attelle (en tracteur) ; au labo,
  // on donne l'échantillon ; dans la cour de l'imprimerie, on dételle, puis le lendemain on la reprend ; au chai, on la
  // pose. Arrêté quelque part trop tôt, on entend ce qui manque.
  jour() {
    const j = this.j, L = j.lieux, R = this.R;
    if (this.occupe || j.gestes.actif || j.tel.ouvert || j.pc.ouvert) return;
    const v = j.auVolant ? Math.abs(j.tr.v) : 0, lent = j.auVolant && v < 2.5, arrete = !j.auVolant || v < 0.6;
    // la remorque préparée : Marc le dit quand on revient au domaine (s'il est là : la nuit, il est rentré chez lui)
    if (this.prete && !this.annonce && !this.livre && this.c.salarie.etat === 'dehors' && j.distance(R.ici) < 34) {
      this.annonce = true; this.itin = null;
      this.c.salarie.p.saluer?.();
      j.hud.dire(this.enTracteur ? HX.dialogues.preteTracteur : HX.dialogues.prete);
      return;
    }
    // la remorque, à sa place au domaine : en tracteur, devant le timon, on l'attelle (Marc aide) ; avec un autre véhicule,
    // on le dit
    if (this.prete && !this.attelee && !this.livre && j.auVolant && arrete && (j.distance(R.ici) < 14 || j.distance(R.approche) < 6)) {
      if (j.veh.genre !== 'tracteur') this.aider(HX.dialogues.pasTracteur, 'remorque');
      else if (!this.ouvertA('salarie')) this.aider(HX.dialogues.marcRentre, 'remorque'); // (la nuit : Marc est rentré)
      else if (R.peutAtteler()) { this.atteler(); return; }
      else this.aider(HX.dialogues.timon, 'remorque');
    }
    // au labo d'œnologie
    {
      const f = L.figurants.labo, d = j.distance(L.arrets.labo), dF = j.distance(f);
      if (this.echantillon !== 'depose' && ((lent && d < 6.5) || (!j.auVolant && (d < 4.5 || dF < 3)))) {
        if (!this.ouvertA('labo')) { if (arrete) this.aider(HX.dialogues.laboFerme(this.tot), 'labo'); }
        else if (this.echantillon === 'pris') { this.donnerEchantillon(); return; }
        else if (arrete) this.aider(HX.dialogues.sansEchantillon, 'labo');
      }
    }
    // dans la cour de l'imprimerie : la livrer ; le lendemain, la reprendre
    {
      const E = L.entrepot, d = j.distance(E.depot), dF = j.distance(E.figurant);
      if (!this.livre && ((lent && d < 8) || (!j.auVolant && dF < 4))) {
        if (!this.ouvertA('entrepot')) { if (arrete) this.aider(HX.dialogues.imprimerieFermee(this.tot), 'entrepot'); }
        else if (this.bat !== 'ok') { if (arrete) this.aider(HX.dialogues.pasFichier, 'entrepot'); }
        else if (!this.attelee) { if (arrete) this.aider(HX.dialogues.pasRemorque, 'entrepot'); }
        else if (arrete && this.enTracteur) { this.deteler(); return; }
      }
      if (this.sms && !this.attelee && arrete && j.auVolant && j.distance(E.arrivee) < 9) {
        if (!this.ouvertA('entrepot')) this.aider(HX.dialogues.imprimerieFermee(this.tot), 'retour');
        else if (j.veh.genre !== 'tracteur') this.aider(HX.dialogues.pasTracteurRetour, 'retour');
        else { this.reprendreRemorque(); return; }
      }
      if (this.attendNuit && arrete && (j.distance(E.depot) < 12 || dF < 4)) this.aider(HX.dialogues.patience, 'patience');
    }
    // au chai : la poser (Marc rentre les palox ; la nuit, il est rentré chez lui : demain matin)
    if (this.sms && this.attelee && this.enTracteur && lent && j.distance(L.remorque.chai) < 12) {
      if (this.ouvertA('salarie')) { this.deposer(); return; }
      if (arrete) this.aider(HX.dialogues.marcRentreChai, 'chai');
    }
  }

  // L'échantillon : à pied, au carton ouvert du chai (main.js : l'étiquette « Prendre un échantillon », agir)
  get echantillonProche() {
    const j = this.j, C = j.carton;
    if (this.etape === 'avant' || this.echantillon !== 'aucun' || j.auVolant || j.gestes.actif) return false;
    return Math.hypot(j.joueur.pos.x - C.x, j.joueur.pos.z - C.z) < 1.6;
  }
  prendreEchantillon() {
    if (!this.echantillonProche) return;
    const j = this.j;
    if (this.etape === 'debut' || this.etape === 'message') { this.lu = true; this.aller('jour'); }
    this.occupe = true;
    j.gestes.echantillon(j.carton, () => {
      this.occupe = false; this.echantillon = 'pris'; this.itin = null;
      son.jouer('succes');
      j.hud.dire(HX.dialogues.echantillon);
    });
  }
  // Atteler : arrêté devant le timon, en tracteur ; il recule tout seul jusqu'à l'anneau, Marc lève la béquille et met la
  // goupille ; on reste au volant (main.js : jeu.remorque.atteler, remorque.js)
  atteler() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider(); j.hud.dire(HX.dialogues.marcAide);
    this.R.atteler(this.c.salarie, () => {
      this.occupe = false; this.attelee = true; this.itin = null;
      son.jouer('succes');
      j.hud.banniere(...HX.bannieres.attelee, 3);
      j.hud.dire(this.bat === 'ok' ? HX.dialogues.versEntrepot : this.bulletin ? HX.dialogues.attelee : HX.dialogues.atteleeAvant);
    });
  }
  // Au labo : arrêté devant, on descend ; on va voir l'œnologue, on parle, on lui tend la bouteille ; elle la rentre au
  // labo (clients.js) ; on remonte. Le bulletin arrive un peu plus tard (update) ; au domaine, Marc prépare la remorque.
  donnerEchantillon() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider();
    j.donner(j.lieux.figurants.labo, HX.dialogues.labo, () => {
      // dans ses mains à elle
      const G = this.c.oeno.gestes, b = G.bouteille(false);
      b.visible = true; b.position.set(0, 0.95, 0.3); this.c.oeno.p.porte = b;
      this.echantillon = 'depose'; this.tBulletin = BULLETIN; this.itin = null;
      this.R.preparer(); // (au domaine, loin d'ici : on ne la voit pas apparaître)
      son.jouer('carton');
    }, () => { this.occupe = false; j.hud.dire(HX.dialogues.apresLabo); });
  }
  // Dans la cour de l'imprimerie : on dételle (béquille, goupille), le tracteur avance un peu ; Julien monte sur son
  // chariot élévateur et rentre les palox (main.js : jeu.chariot) ; l'habillage prend l'après-midi
  deteler() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider(); j.hud.dire(HX.dialogues.entrepot);
    this.R.deteler(j.lieux.entrepot.depot, () => {
      this.occupe = false; this.attelee = false; this.livre = true; this.itin = null;
      son.jouer('succes');
      j.hud.banniere(...HX.bannieres.livre, 3);
      j.chariot.lancer();
      // (six heures de ligne : finies avant la fermeture, ou demain matin)
      const aujourdhui = heureDe(j.minutes) + HABILLER <= HORAIRES.imprimerie[1];
      setTimeout(() => j.hud.dire(HX.dialogues.chariot(aujourdhui)), 1200);
    });
  }
  // L'habillage fini (au réveil, ou six heures plus tard) : la remorque rechargée et tournée vers la sortie (main.js :
  // jeu.remorque.habillee) ; le message de l'imprimerie arrive un peu après
  habille(reveil) {
    if (!this.attendNuit) return;
    this.sms = true; this.tSms = reveil ? 3.5 : 0.5; this.itin = null;
    this.R.habillee();
    if (reveil) setTimeout(() => this.j.hud.dire(HX.dialogues.reveilHabille(this.date)), 1200);
  }
  // au réveil (main.js : dormir)
  reveil() { this.habille(true); }
  // À l'imprimerie, le lendemain : arrêté à l'entrée de la cour, en tracteur ; il va se mettre en travers, recule sur
  // l'anneau ; Julien attelle
  reprendreRemorque() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider(); j.hud.dire(HX.dialogues.julienAide);
    this.R.atteler(this.c.etiq, () => {
      this.occupe = false; this.attelee = true; this.itin = null;
      son.jouer('succes');
      j.hud.banniere(...HX.bannieres.reprise, 3); j.hud.dire(HX.dialogues.versChai);
    }, j.lieux.entrepot.virage);
  }
  // Au chai : le tracteur avance tout seul jusqu'à poser la remorque à sa place, on la dételle ; Marc rentre les six
  // palox au chai avec le transpalette (main.js : jeu.marc ; Teddy, 25/11/2026) : c'est fini
  deposer() {
    const j = this.j;
    this.occupe = true;
    j.hud.vider();
    this.R.deteler(j.lieux.remorque.chai, () => {
      this.occupe = false; this.attelee = false; this.marc = true; this.itin = null;
      j.hud.dire(HX.dialogues.marcDecharge);
      j.marc.decharger(() => { this.marc = false; this.rentree = true; j.hud.dire(HX.dialogues.marcFini); this.finir(); });
    });
  }
  finir() {
    const j = this.j;
    if (this.etape !== 'jour') return;
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
