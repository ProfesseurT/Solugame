// Mission 3 : « L'habillage », le lendemain de la journée de traitement (Teddy, 24/11/2026), le jeudi 10 décembre. Le
// Clos 2025, rouge, attend au chai en bouteilles tirées-bouchées, en cartons ; l'imprimerie Saint-Vincent l'habille cet
// après-midi : il lui faut la contre-étiquette, avec le QR code des ingrédients et de la déclaration nutritionnelle.
// 1. Au chai, à pied : une bouteille du lot (le carton ouvert près de la palette), l'échantillon pour le labo.
// 2. Au labo d'œnologie, dans le bourg : on la donne à l'œnologue ; son bulletin d'analyse arrive sur le téléphone.
// 3. Dans Viticode (téléphone) : la fiche produit, avec les valeurs du bulletin ; publiée, elle a son QR code ; on la
//    teste (« Testez-moi ! » : la fiche telle que le client la verra) ; on personnalise le QR code (le titre
//    « Ingrédients » et le pied de page de la valeur énergétique restent), on le télécharge et on l'envoie à
//    l'imprimerie ; on valide son BAT (Messages).
// 4. Au chai, en van ou en tracteur, on charge les cartons (à tout moment) ; à l'entrepôt de l'imprimerie, on les décharge
//    devant l'étiqueteur, qui les rentre ; la ligne d'habillage tourne ; il nous tend la première bouteille habillée, on
//    scanne sa contre-étiquette avec le téléphone : la fiche du Clos.
// Pour finir toujours : l'objectif est recalculé d'après l'état ; arrivé quelque part trop tôt, on entend ce qui manque ;
// la fiche ne se publie que si elle correspond au bulletin, et le téléphone dit pourquoi.
import { HABILLAGE as HX, DIALOGUES, energie } from './textes.js';
import { son } from './audio.js';
import { ecart } from './reseau.js';

const RAPPEL = 8;        // secondes au moins entre deux aides dites en route
const BULLETIN = 25;     // secondes entre l'échantillon donné et le bulletin du labo
const BAT = 5;           // secondes entre l'envoi du fichier et le BAT de l'imprimerie
const LIGNE = 7;         // secondes au moins à regarder la ligne tourner
const prec = (a, b) => Math.abs(a - b) < 1e-6;
export const nouvelleFiche = () => ({
  nom: '', millesime: '', appellation: '', lot: '', degre: null, couleur: null, ingr: new Set(), bio: false,
  glucides: 0, sucres: 0, energie: null, base: null, negligeable: true, labels: [],
  perso: { domaine: false, format: 'svg', bordures: false, couleur: '#e84e1b', titre: true, pied: true },
});

export class Habillage {
  // c : { palette : les piles de cartons du Clos sur la palette du chai [{ groupe, n }], carton : le carton ouvert
  // (monde), oeno, etiq : les entrées de l'œnologue et de l'étiqueteur (clients.js), ligne : la ligne d'habillage
  // (monde.js) } ; jeu : main.js
  constructor(jeu, c) {
    this.j = jeu; this.c = c; this.etape = 'avant'; this.t = 0; this.horloge = 0;
    this.lu = false;
    this.echantillon = 'aucun'; // pris (dans la poche), depose (au labo)
    this.bulletin = false; this.tBulletin = 0;
    this.fiche = nouvelleFiche();
    this.publiee = false; this.testee = false; this.telecharge = false; this.envoye = false;
    this.bat = 'aucun'; this.tBat = 0; this.tImprime = 0; // recu, ok
    this.veh = null; this.cols = []; // le véhicule chargé, ses colonnes de cartons [{ c, n }]
    this.livre = false; this.scanne = false; this.recue = false;
    this.deposes = [];  // les piles posées devant l'étiqueteur (il les rentre : clients.js)
    this.scene = null;  // la ligne qui tourne, regardée (main.js y pose la caméra)
    this.occupe = false; this.chargement = false;
    this.message = HX.messages.imprimerie.apercu; this.fil = 'imprimerie';
    this.objAff = null; this.itin = null; this.tItin = 0; this.tObj = 0;
    this.tRappel = 0; this.aideCle = null; this.aideT = -1e9; this.dit = false; this.tScan = 0;
  }
  get actif() { return this.etape !== 'avant'; }
  get vin() { return HX.vin; }
  // l'œnologue et l'étiqueteur ont fait leur affaire (clients.js : ils rentrent chez eux)
  fait(id) { return id === 'labo' ? this.echantillon === 'depose' : id === 'entrepot' ? this.livre : false; }

  /* ------------------------------------------------------------ déroulé */
  // au réveil (main.js : dormir), ou lancée depuis l'accueil
  demarrer() {
    this.etape = 'debut'; this.t = 0;
    this.j.hud.banniere(...HX.bannieres.titre, 4.5);
  }
  aller(e) { this.etape = e; this.t = 0; this.itin = null; }
  // La sauvegarde : où en est la journée, prise hors des gestes et de la scène de la ligne ; à la reprise, on est au
  // domaine, à pied (main.js remet ce qui se voit : les cartons sur la palette ou dans leur véhicule)
  get stable() { return ['debut', 'message', 'jour', 'scanner', 'fin', 'libre'].includes(this.etape) && !this.occupe && !this.j.gestes.actif; }
  instantane() {
    const F = this.fiche;
    return {
      etape: this.etape === 'debut' ? 'message' : this.etape === 'fin' ? 'libre' : this.etape, lu: this.lu,
      echantillon: this.echantillon, bulletin: this.bulletin, tB: this.tBulletin,
      fiche: { ...F, ingr: [...F.ingr], labels: [...F.labels], perso: { ...F.perso } },
      publiee: this.publiee, testee: this.testee, telecharge: this.telecharge, envoye: this.envoye, bat: this.bat,
      veh: this.veh ? this.veh.genre : null, cols: this.cols.map(x => ({ ...x })), livre: this.livre, scanne: this.scanne,
    };
  }
  reprendre(o) {
    this.lu = o.lu; this.echantillon = o.echantillon; this.bulletin = o.bulletin; this.tBulletin = Math.min(o.tB || 0, 10);
    this.fiche = { ...nouvelleFiche(), ...o.fiche, ingr: new Set(o.fiche.ingr), labels: [...(o.fiche.labels || [])], perso: { ...nouvelleFiche().perso, ...o.fiche.perso } };
    this.publiee = o.publiee; this.testee = o.testee; this.telecharge = o.telecharge; this.envoye = o.envoye;
    this.bat = o.bat; this.tBat = 3; this.tImprime = 0;
    this.veh = o.veh ? this.j.vehicules.find(v => v.genre === o.veh) || null : null;
    this.cols = this.veh ? o.cols.map(x => ({ ...x })) : [];
    this.livre = o.livre; this.scanne = o.scanne; this.recue = this.livre; this.dit = true;
    this.fil = this.bulletin && !this.envoye ? 'labo' : 'imprimerie';
    // la ligne regardée ne se reprend pas : la bouteille est déjà dans nos mains, il reste à la scanner
    const e = o.etape === 'ligne' ? 'scanner' : o.etape;
    this.aller(e === 'message' && this.lu ? 'jour' : e);
    if (this.etape === 'message') this.notifier('messages', HX.messages.imprimerie.apercu);
  }
  aider(lignes, cle) {
    if (!lignes || this.tRappel > 0 || (cle === this.aideCle && this.horloge - this.aideT < 25)) return;
    this.j.hud.dire(lignes); this.tRappel = RAPPEL; this.aideCle = cle; this.aideT = this.horloge;
  }
  notifier(app, msg, fil) { this.message = msg || this.message; if (fil) this.fil = fil; this.j.tel.notifier(app); son.jouer('vibre'); }
  // le message de l'imprimerie lu (Messages) : on sait quoi faire
  messageLu() {
    if (this.lu) return;
    this.lu = true;
    if (this.etape === 'debut' || this.etape === 'message') { this.aller('jour'); this.j.hud.dire(HX.dialogues.luMessage); }
  }

  // La prochaine destination : le chai (l'échantillon, puis les cartons, déjà : le labo et l'entrepôt sont du même côté,
  // à l'est du bourg), le labo, l'entrepôt ; rien tant qu'on attend le bulletin ou qu'il reste à faire sur le téléphone.
  // On peut aussi aller au labo sans les cartons, et les charger plus tard.
  get prochain() {
    const L = this.j.lieux;
    if (this.livre) return null;
    if (this.echantillon === 'aucun' || (this.echantillon === 'pris' && !this.veh)) return { lieu: L.chai, nom: 'Chai' };
    if (this.echantillon === 'pris') return { lieu: L.arrets.labo, nom: 'Labo d\'œnologie' };
    if (this.bat !== 'ok') return null;
    if (!this.veh) return { lieu: L.chai, nom: 'Chai' };
    return { lieu: L.entrepot.arret, nom: 'Imprimerie Saint-Vincent' };
  }
  get cible() {
    if (this.etape !== 'jour' || this.occupe) return null;
    const p = this.prochain;
    return p ? p.lieu : null;
  }
  get nomCible() { const p = this.prochain; return p ? p.nom : ''; }
  // l'itinéraire jusqu'à la balise (dans la cour du domaine, vers le chai, le chemin d'origine), refait si l'on s'en écarte
  get route() {
    const c = this.cible;
    if (!c) return null;
    const j = this.j, L = j.lieux, o = j.auVolant ? j.tr.pos : j.joueur.pos;
    if (!this.itin || this.itin.c !== c) {
      const cour = o.x < -86 && o.z < -30 && o.z > -62;
      this.itin = { c, pts: c === L.chai && cour ? L.versChai : j.reseau.itineraire(o, c) };
    }
    return this.itin.pts;
  }
  // la grande porte du chai s'ouvre quand on vient charger (chai.js)
  get aCharger() { return !this.veh && !this.livre && this.c.palette.some(p => p.groupe.visible); }

  // L'objectif affiché, d'après où en est la journée
  get objectif() {
    const e = this.etape, O = HX.objectifs, j = this.j;
    if (e === 'avant') return null;
    if (e === 'debut' || e === 'message') return O.message;
    if (e === 'ligne') return O.habillage;
    if (e === 'scanner') return O.scanner;
    if (e === 'fin' || e === 'libre') return O.fin;
    if (this.chargement) return O.charger;
    if (this.echantillon === 'aucun') return O.echantillon;
    if (this.echantillon === 'pris') return this.veh ? O.labo : O.chargerAvant;
    if (!this.bulletin) return O.analyse;
    if (!this.publiee) return O.fiche;
    if (!this.testee && !this.telecharge) return O.tester;
    if (!this.telecharge) return O.telecharger;
    if (!this.envoye) return O.envoyer;
    if (this.bat !== 'ok') return this.bat === 'recu' ? O.bat : O.envoyer;
    if (!this.veh) return O.charger;
    return j.auVolant && j.tr !== this.veh.p ? O.charger : O.entrepot;
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
    // le bulletin du labo, le BAT de l'imprimerie : ils arrivent pendant qu'on joue
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
    switch (this.etape) {
      case 'debut':
        if (this.t > 1.2 && !this.dit) { this.dit = true; hud.dire(HX.dialogues.reveil); this.notifier('messages', HX.messages.imprimerie.apercu, 'imprimerie'); }
        if (this.t > 4) this.aller(this.lu ? 'jour' : 'message');
        break;
      case 'message':
        if (this.t > 25) this.messageLu(); // sans l'avoir ouvert, on sait quand même quoi faire
        break;
      case 'jour': this.jour(); break;
      case 'ligne': this.ligne(dt); break;
      case 'scanner':
        // la bouteille dans les mains : le téléphone s'ouvre sur l'appareil photo ; la fiche vue, c'est fini
        if (!this.scanne && this.t > 1.2 && !j.tel.ouvert && !this.tScan) { this.tScan = 1; j.tel.ouvrir('scan'); }
        if (j.tel.ouvert && j.joueur.porte) { j.joueur.porte.visible = false; j.joueur.porte = null; }
        if (this.scanne && (!j.tel.ouvert || (this.tScan += dt) > 9)) this.finir();
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

  // Dehors : au chai, on charge les cartons (en véhicule) ; au labo, on donne l'échantillon ; à l'entrepôt, on décharge.
  // Arrêté quelque part trop tôt, on entend ce qui manque.
  jour() {
    const j = this.j, L = j.lieux;
    if (this.occupe || j.gestes.actif || j.tel.ouvert || j.pc.ouvert) return;
    const v = j.auVolant ? Math.abs(j.tr.v) : 0, lent = j.auVolant && v < 2.5, arrete = !j.auVolant || v < 0.6;
    // au chai : arrêté devant, ou engagé vers la grande porte (même lancé)
    {
      const d = j.distance(L.chai), devant = j.devantChai;
      if (d <= 5.5 || devant) {
        const piles = this.c.palette.filter(p => p.groupe.visible);
        if (j.auVolant && piles.length && !this.veh && !this.livre && (lent || devant)) {
          if (j.veh.m.cartons) { this.charger(piles); return; }
          this.aider(DIALOGUES.voitureSansCartons, 'chai');
        }
        if (!j.auVolant && this.echantillon === 'aucun' && d < 4 && !devant) this.aider(HX.dialogues.aPied, 'chai');
      }
    }
    // au labo d'œnologie
    {
      const f = L.figurants.labo, d = j.distance(L.arrets.labo), dF = j.distance(f);
      if (this.echantillon !== 'depose' && ((lent && d < 6.5) || (!j.auVolant && (d < 4.5 || dF < 3)))) {
        if (this.echantillon === 'pris') { this.donnerEchantillon(); return; }
        if (arrete) this.aider(HX.dialogues.sansEchantillon, 'labo');
      }
    }
    // à l'entrepôt de l'imprimerie
    {
      const E = L.entrepot, d = j.distance(E.arret), dF = j.distance(E.figurant);
      if (!this.livre && ((lent && d < 7.5) || (!j.auVolant && dF < 4))) {
        if (this.bat !== 'ok') { if (arrete) this.aider(HX.dialogues.pasFichier, 'entrepot'); }
        else if (!this.veh) { if (arrete) this.aider(HX.dialogues.pasCartons, 'entrepot'); }
        else if (!j.auVolant || j.tr !== this.veh.p) { if (arrete) this.aider(HX.dialogues.autreVehicule(this.veh.genre), 'entrepot'); }
        else { this.decharger(); return; }
      }
    }
  }

  // L'échantillon : à pied, près du carton ouvert du chai (main.js : l'étiquette « Prendre un échantillon », agir)
  get echantillonProche() {
    const j = this.j, C = this.c.carton;
    return this.etape !== 'avant' && this.etape !== 'ligne' && this.echantillon === 'aucun' && !j.auVolant && !j.gestes.actif
      && Math.hypot(j.joueur.pos.x - C.x, j.joueur.pos.z - C.z) < 1.9;
  }
  prendreEchantillon() {
    if (!this.echantillonProche) return;
    const j = this.j;
    if (this.etape === 'debut' || this.etape === 'message') { this.lu = true; this.aller('jour'); }
    this.occupe = true;
    j.gestes.echantillon(this.c.carton, () => {
      this.occupe = false; this.echantillon = 'pris'; this.itin = null;
      son.jouer('succes');
      j.hud.dire(HX.dialogues.echantillon);
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
  // Au chai : le véhicule entre, on charge les cartons du Clos, il ressort (chai.js, gestes.js)
  charger(piles) {
    const j = this.j, V = j.veh, cols = [];
    this.occupe = true; this.chargement = true;
    j.charger(piles, (c, p) => { cols.push({ c, n: p.n }); V.p.charge += p.n; }, () => {
      this.occupe = false; this.chargement = false;
      this.veh = V; this.cols = cols; this.itin = null;
      son.jouer('succes');
      j.hud.banniere(...HX.bannieres.charge, 3);
      j.hud.dire(this.bat === 'ok' ? HX.dialogues.charge : this.echantillon === 'pris' ? HX.dialogues.chargeLabo : HX.dialogues.chargeAvant);
    });
  }
  // À l'entrepôt : on descend, on porte les cartons devant l'étiqueteur (gestes.js) ; il les rentre (clients.js) ; la
  // ligne tourne (ligne)
  decharger() {
    const j = this.j, E = j.lieux.entrepot, V = this.veh;
    this.occupe = true;
    j.hud.vider(); j.hud.dire(HX.dialogues.entrepot);
    j.decharger(E.figurant, this.cols, x => { x.userData.client = 'entrepot'; this.deposes.push(x); }, () => {
      V.p.charge = 0;
      this.veh = null; this.cols = []; this.livre = true; this.occupe = false;
      son.jouer('succes');
      j.hud.banniere(...HX.bannieres.livre, 3);
      this.aller('ligne'); this.scene = { t: 0, dit: false, vu: false, rendu: false };
      // on reste là à regarder la ligne, jusqu'à ce que l'étiqueteur nous tende la première bouteille
      j.gestes.lancer([{ maj: (dt, t) => { j.gestes.immobile(dt, t); return this.etape !== 'ligne' || this.recue; } }]);
    });
  }
  // La ligne d'habillage, regardée (main.js pose la caméra tant que scene.camera) ; puis l'étiqueteur ressort, la
  // première bouteille habillée à la main, et nous la tend
  get vueLigne() { return this.etape === 'ligne' && this.scene && !this.scene.rendu; }
  ligne(dt) {
    const S = this.scene, hud = this.j.hud;
    if (!S) return;
    S.t += dt;
    // la caméra est sur la ligne : pendant ce temps, l'étiqueteur a rentré les cartons (la coupe évite de le regarder
    // faire quatre voyages) ; il est derrière sa machine, près de la table de sortie, tourné vers nous
    if (!S.coupe && S.t > 0.3) {
      S.coupe = true;
      const f = this.c.etiq, G = f.gestes, B = this.j.lieux.entrepot.bouteille;
      for (const p of this.deposes) p.visible = false;
      G.g = null; f.p.porte = null; if (f.p.m.pile) f.p.m.pile.visible = false;
      f.p.placer(B.x - 1.3, B.z - 1.4, Math.PI / 2); f.p.m.groupe.visible = true; f.p.salut = false; f.p.regard = null;
      f.etat = 'range';
      G.lancer([{ maj: (dt, t) => { G.immobile(dt, t); return false; } }]);
    }
    if (!S.dit && S.t > 0.8) { S.dit = true; hud.dire(HX.dialogues.ligne.slice(0, 2), () => { S.vu = true; }); }
    if (S.vu && S.t > LIGNE && !S.rendu) { S.rendu = true; this.rendreBouteille(); }
  }
  rendreBouteille() {
    const j = this.j, hud = j.hud, f = this.c.etiq, G = f.gestes, E = j.lieux.entrepot, P = { x: 0, z: 0 };
    f.etat = 'range';
    // la caméra revient dehors, de côté : on le voit sortir et venir nous tendre la bouteille (pas depuis le toit du van)
    j.gestes.cadrerEntre(j.joueur.pos, E.porte, j.veh);
    G.lancer([
      ...G.sortir(f.porte, 0.05),
      ...G.allerA(() => {
        const o = j.joueur.pos, dx = f.p.pos.x - o.x, dz = f.p.pos.z - o.z, l = Math.hypot(dx, dz) || 1;
        P.x = o.x + dx / l * 1.15; P.z = o.z + dz / l * 1.15; return P;
      }, () => Math.atan2(j.joueur.pos.x - P.x, j.joueur.pos.z - P.z)),
      G.tendre(true, () => {
        j.joueur.h = Math.atan2(f.p.pos.x - j.joueur.pos.x, f.p.pos.z - j.joueur.pos.z);
        const b = j.gestes.bouteille(true);
        b.visible = true; b.position.set(0, 0.95, 0.3); j.joueur.porte = b;
        this.recue = true; this.aller('scanner'); this.tScan = 0;
        son.jouer('tap');
        hud.dire(HX.dialogues.ligne.slice(2));
      }),
      ...G.entrer(E.porte, 5), // jusqu'à la ligne : la grande porte est ouverte, on le voit rentrer
    ], () => { f.etat = 'dedans'; });
  }
  // le scan de la contre-étiquette (téléphone) : la fiche du Clos, vue comme le client la verra
  scanner() {
    if (this.etape !== 'scanner' || this.scanne) return;
    this.scanne = true; this.tScan = 0.01;
    this.j.hud.dire(HX.dialogues.scanne);
  }
  finir() {
    const j = this.j;
    if (this.etape !== 'scanner') return;
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
  // la fiche vue côté consommateur (« Testez-moi ! », ou le scan de la bouteille)
  vue() {
    if (this.publiee && !this.testee) { this.testee = true; if (this.etape === 'jour') this.j.hud.dire(HX.dialogues.teste); }
    if (this.etape === 'scanner') this.scanner();
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
    this.j.hud.banniere(...HX.bannieres.bat, 3); this.j.hud.dire(this.veh ? HX.dialogues.charge : HX.dialogues.batOk);
  }
}
