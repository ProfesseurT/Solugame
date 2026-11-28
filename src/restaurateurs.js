// Les restaurateurs du coin : des missions cachées, purement commerciales (Teddy, 26/11/2026 : « si on visite un resto,
// chaque tenancier peut demander une dégustation, et le bureau pourra rappeler de manière aléatoire une relance, et une
// commande signée ou pas des restaurateurs. Mais il faut pour ça aller les voir spontanément pour y avoir accès dans un
// premier temps. Tu peux en mettre pas mal, même vers le château »).
// - Huit restaurants (monde.js : restaurantsBourg, relaisCroisee ; les trois du château, villageTerrasses), chacun son
//   tenancier, devant sa porte ou au bord de sa terrasse de 9 h à 19 h 30 (heuresOuverture). Rien ne les signale : ni
//   balise, ni objectif, ni ligne dans le bureau. On passe près d'eux à pied, ils vous interpellent (accroche).
// - À pied, tout près : « Présenter nos vins ». Il se présente, dit ce qu'il sert et ce qu'il cherche, demande à goûter
//   (ou n'a pas le temps : c'est le coup de feu, repassez) ; on lui sert un verre (verres.js : le geste de toujours) ; il
//   dit ce qu'il en pense (il aime, ou il est partagé : tiré au sort, toujours le même) ; « Je vous note dans le bureau » :
//   il entre dans Le bureau, rubrique « Restaurateurs rencontrés », avec sa note (ce qu'il a goûté, ce qu'il en a dit,
//   quoi lui proposer).
// - Plus tard (un délai tiré au sort, en heures de jeu, pendant ses heures), le bureau propose de le rappeler (Ma
//   journée, une notification). L'appel (l'écran d'appel de la tournée) finit, selon le hasard et ce qu'il avait dit :
//   par une commande préparée pendant l'appel (la quantité dite, une consigne du jeu comme à la tournée), envoyée pour
//   signature, puis signée en ligne un moment après (elle part dans Vitisoft sans ressaisie : pc.js la montre dans la
//   Liste des commandes), ou restée sans signature : le bureau propose de le relancer, et au téléphone il dit non ; par
//   « rappelez-moi la semaine prochaine » (une nouvelle relance, le lendemain) ; ou par un refus poli.
// - Retrouvables : la rubrique du bureau (et l'onglet Commandes), une ligne « Hors mission » dans l'app Missions dès le
//   premier rencontré. L'état est gardé à part (sauvegarde.js : restos) : il survit aux missions rejouées.
// - Jamais par-dessus une mission : une seule notification à la fois sur le téléphone (celle d'une mission passe devant,
//   telephone.js : notifResto) ; ni relance ni appel pendant un appel, un geste, la carte de fin, sans réseau.
// Légèreté : les tenanciers sont créés quand la caméra approche (un par image), animés de près, une image sur trois
// plus loin, plus du tout au-delà de 150 m ; rien n'est alloué par image.
import * as THREE from 'three';
import { Pieton } from './pieton.js';
import { perso } from './perso.js';
import { RESTAURATEURS as TX, BUREAU } from './textes.js';
import { son } from './audio.js';
import { SAUVE } from './sauvegarde.js';
import { hasard, esc, eur, ouvert } from './outils.js';

// Les heures où les restaurateurs sont devant leur restaurant et répondent au téléphone : de 9 h à 19 h 30. (Un autre
// travail fait fermer les professionnels la nuit et exporte ses heures d'ouverture : à la fusion, ne garder que la sienne.)
export const heuresOuverture = minutes => ouvert(minutes, 'tenancier'); // (outils.js, HORAIRES : la seule source des heures)

const PORTEE = 2.6;      // m : « Présenter nos vins », à pied, à moins de 2,6 m du tenancier
const LOIN_VISITE = 14;  // m : parti sans lui servir le verre, la visite est à refaire
const CREER = 150;       // m : le tenancier est créé quand la caméra approche de son restaurant
const ANIME = 150;       // m : au-delà, il ne bouge plus
const ACCROCHE = 9;      // m : à pied, en passant à moins de 9 m, il vous interpelle (une fois par minute au plus)
const NUM0 = 1197;       // le numéro de la première commande d'un restaurateur (celles de la tournée : C-1194 à C-1196)
const REVOIR = 120;      // s : une relance pas encore vue est notifiée une seconde fois
const CHATEAU = { 'LE RELAIS DES TOURELLES': 'tourelles', 'CAFÉ DE LA POIVRIÈRE': 'poivriere', 'CRÊPERIE DU CHÂTELET': 'chatelet' };
const REGARD = new THREE.Vector3(), V = new THREE.Vector3();
const mn = m => ((m % 1440) + 1440) % 1440;

export class Restaurateurs {
  // c : { jeu, scene, hud, camera, col }
  constructor(c) {
    this.c = c; this.j = c.jeu; this.message = ''; this.nCmd = 0; this.sale = false; this.tSauve = 0;
    this.file = []; this.tNotif = 0; this.n = 0; this.presentable = null; this.prets = 0;
    const L = c.jeu.lieux, places = { ...L.restaurateurs };
    // ceux du château : au bord du trottoir, devant l'allée de leur terrasse (la porte, 2,9 m plus loin vers la rue)
    for (const q of L.chateau.restos) {
      const id = CHATEAU[q.nom], P = q.porte;
      if (id) places[id] = { x: P.x + Math.sin(P.rot) * 2.9, z: P.z + Math.cos(P.rot) * 2.9, h: P.rot, porte: P };
    }
    this.liste = TX.liste.filter(F => places[F.id]).map((F, i) => ({
      id: F.id, F, i, L: places[F.id], p: null, present: false, dtA: 0,
      statut: 'inconnu', gout: null, motif: null, tRel: 0, reste: null, numero: null, cartons: 0, demande: F.demande, signera: false, tSign: 0, appels: 0,
      notifie: 0, tVu: 0, vu: false, visite: null, tVisite: 0, dit: false, tAccroche: -1e9, iAccroche: 0, laisse: 0,
    }));
    this.charger();
  }
  get(id) { return this.liste.find(r => r.id === id) || null; }
  get rencontres() { return this.liste.filter(r => r.statut !== 'inconnu'); }
  get signees() { return this.liste.filter(r => r.statut === 'signee'); }
  // pendant ses heures, et pas pendant son coup de feu (repassez). Le jour des portes ouvertes (mission 4), Clémence, le
  // traiteur, attend avec ses plateaux dès 7 h (mission4.js : attendTraiteur)
  voulu(r, m) { return heuresOuverture(m) || r.visite !== null || (r.id === this.j.lieux.portesOuvertes.traiteur && !!this.j.portes?.attendTraiteur && ouvert(m, 'commerce')); }
  occupe(r) { const m = mn(this.j.minutes); return r.F.heures.some(([a, b]) => m >= a && m < b); }
  // le point (x, z) est-il sous les yeux de la caméra ? (ils arrivent et partent hors de la vue)
  vu(x, z) {
    const cam = this.c.camera, dx = x - cam.position.x, dz = z - cam.position.z, d = Math.hypot(dx, dz);
    if (d > 80) return false;
    if (d < 8) return true;
    cam.getWorldDirection(V);
    return (dx * V.x + dz * V.z) / d > 0.35;
  }

  /* ------------------------------------------------------------ dans le monde */
  creer(r) {
    const p = new Pieton(perso(r.F.perso));
    p.placer(r.L.x, r.L.z, r.L.h);
    p.etq = this.c.hud.etiquette('', 'bulle');
    p.surServi = () => this.deguster(r); // (verres.js : le verre servi)
    this.c.scene.add(p.m.groupe);
    r.p = p; r.present = this.voulu(r, this.j.minutes); p.m.groupe.visible = r.present;
  }
  // À chaque image (main.js : bourg). c : { t, minutes, ego, aPied, danger (le véhicule conduit), pousser(p, r) }
  maj(dt, c) {
    const cam = this.c.camera.position;
    // créés quand la caméra approche, un par image
    if (this.prets < this.liste.length) for (const r of this.liste) if (!r.p && (r.L.x - cam.x) ** 2 + (r.L.z - cam.z) ** 2 < CREER * CREER) { this.creer(r); this.prets++; break; }
    this.n++;
    for (const r of this.liste) {
      const p = r.p;
      if (!p) continue;
      const voulu = this.voulu(r, c.minutes);
      if (voulu !== r.present && !this.vu(p.pos.x, p.pos.z)) { r.present = voulu; p.m.groupe.visible = voulu; if (voulu) p.placer(r.L.x, r.L.z, r.L.h); }
      if (!r.present) continue;
      const d2 = (p.pos.x - cam.x) ** 2 + (p.pos.z - cam.z) ** 2;
      if (d2 > ANIME * ANIME && !r.visite) continue;
      r.dtA += dt;
      if (d2 > 3600 && !r.visite && (this.n + r.i) % 3) continue;
      const dtg = r.dtA; r.dtA = 0;
      this.vivre(r, dtg, c);
    }
  }
  // Devant son restaurant : il regarde la rue, se tourne vers qui approche à pied et fait signe ; il interpelle qui
  // passe (s'il ne le connaît pas encore) ; il s'écarte d'un saut du véhicule qui fonce sur lui, puis revient à sa place
  vivre(r, dt, c) {
    const p = r.p, F = r.F, hud = this.c.hud, ego = c.ego, d = Math.hypot(ego.x - p.pos.x, ego.z - p.pos.z);
    // un véhicule lancé droit sur lui : un saut de côté, du côté où il est déjà
    const g = c.danger;
    if (g && Math.abs(g.v) > 1.6 && p.sautT <= 0 && !r.visite) {
      const sg = Math.sign(g.v), fx = Math.sin(g.h) * sg, fz = Math.cos(g.h) * sg, rx = p.pos.x - g.x, rz = p.pos.z - g.z;
      const devant = rx * fx + rz * fz, cote = rx * fz - rz * fx;
      if (devant > 0 && devant < 3 + Math.abs(g.v) * 0.9 && Math.abs(cote) < 2.2) {
        const s = cote >= 0 ? 1 : -1;
        p.sauter(fz * s, -fx * s); hud.bulle(p.etq, 'Holà !', 1.6);
      }
    }
    if (p.sautT > 0) { p.update(dt, 0, 0, 0, false, this.c.col, c.t); c.pousser?.(p.pos, 0.34); this.bulle(p); return; }
    // revenir à sa place (après un saut)
    const ex = r.L.x - p.pos.x, ez = r.L.z - p.pos.z, de = Math.hypot(ex, ez);
    if (de > 0.25) {
      p.regard = null; p.salut = false;
      p.update(dt, ex / de, ez / de, 1, false, this.c.col, c.t, Math.min(1.2, 0.3 + de));
      c.pousser?.(p.pos, 0.34); this.bulle(p); return;
    }
    // la visite : tourné vers vous ; parti sans servir le verre, elle est à refaire
    if (r.visite) {
      p.h = Math.atan2(ego.x - p.pos.x, ego.z - p.pos.z); p.salut = false;
      p.regard = REGARD.set(ego.x, (ego.y || 0) + 1.6, ego.z);
      if (r.visite === 'goute' && (r.tVisite -= dt) <= 0 && !r.dit) {
        r.dit = true;
        r.gout = this.gout(r);
        hud.dire([...F[r.gout], ...TX.noter[r.gout]], () => this.noter(r));
      }
      if ((r.visite === 'verre' || r.visite === 'parle') && d > LOIN_VISITE) {
        r.visite = null; p.servable = false; hud.bulle(p.etq, TX.parti, 2.2);
      }
    } else if (c.aPied && d < 10) {
      p.h = Math.atan2(ego.x - p.pos.x, ego.z - p.pos.z); p.salut = d < 6;
      p.regard = REGARD.set(ego.x, (ego.y || 0) + 1.6, ego.z);
      // il vous interpelle en passant (un inconnu, une fois par minute au plus)
      if (r.statut === 'inconnu' && d < ACCROCHE && d > PORTEE && c.t - r.tAccroche > 60 && !p.etq.vu) {
        r.tAccroche = c.t; hud.bulle(p.etq, F.accroche[r.iAccroche++ % F.accroche.length], 3);
      }
    } else { p.h = r.L.h; p.salut = false; p.regard = null; }
    p.sync(dt, c.t);
    this.bulle(p);
  }
  bulle(p) { if (p.etq.vu) this.c.hud.placer(p.etq, p.pos.x, p.pos.y + 2.3, p.pos.z, p.m.groupe.visible); }
  // les taches de contact ; vu(m, x, z) : main.js, ombrePerso (dessiné ou non selon la distance)
  taches(t, vu) {
    for (const r of this.liste) { const p = r.p; if (p && r.present && p.m.groupe.visible && vu(p.m, p.pos.x, p.pos.z)) t.poser(p.pos.x, p.pos.z, 0.4, 0.4, 0, p.pos.y); }
  }
  // verres.js : ceux à qui l'on peut servir un verre (il l'a demandé), et ceux qui boivent le leur
  candidats(f) { for (const r of this.liste) if (r.p && r.present && (r.p.servable || r.p.verre > 0)) f(r.p, 2.6); }

  /* ------------------------------------------------------------ la visite */
  // le tenancier à qui l'on peut parler (libre : à pied, rien d'autre en cours) ; son étiquette
  chercher(libre) {
    this.presentable = null;
    if (!libre) return;
    const J = this.j.joueur.pos;
    let dmin = PORTEE;
    for (const r of this.liste) {
      const p = r.p;
      if (!p || !r.present || r.visite || p.servable || p.verre > 0 || p.sautT > 0) continue;
      const d = Math.hypot(p.pos.x - J.x, p.pos.z - J.z);
      if (d < dmin) { dmin = d; this.presentable = r; }
    }
  }
  libelle(r) { return r.statut === 'inconnu' ? TX.presenter : `Parler à ${r.F.qui}`; }
  // « Présenter nos vins » : il se présente et demande à goûter (ou il n'a pas le temps) ; déjà rencontré, un mot
  presenter(r) {
    const j = this.j, p = r.p, F = r.F, J = j.joueur, hud = this.c.hud;
    J.h = Math.atan2(p.pos.x - J.pos.x, p.pos.z - J.pos.z); J.v = 0;
    hud.vider();
    if (r.statut !== 'inconnu') {
      const txt = r.statut === 'signee' ? F.revoir.signee : ['non', 'refusee'].includes(r.statut) ? F.revoir.fini : F.revoir.attente;
      hud.dire([{ qui: F.qui, txt }]);
      return;
    }
    if (this.occupe(r)) { hud.dire(F.occupe); return; }
    r.visite = 'parle'; r.dit = false;
    hud.dire(F.presentation, () => { if (r.visite === 'parle') { r.visite = 'verre'; p.servable = true; } });
  }
  // le verre servi (verres.js) : il goûte ; deux secondes plus tard, il dit ce qu'il en pense (vivre)
  deguster(r) {
    if (r.visite !== 'verre') return;
    r.visite = 'goute'; r.tVisite = 2.2; r.p.servable = false;
  }
  // il aime, ou il est partagé : tiré au sort d'après son penchant, toujours le même pour lui
  gout(r) { return hasard(7700 + r.i * 31)() < 0.3 + 0.6 * r.F.penchant ? 'aime' : 'mitige'; }
  // noté dans le bureau : le bureau proposera de le rappeler un peu plus tard (une à deux heures et demie de jeu)
  noter(r) {
    if (r.visite !== 'goute') return;
    const j = this.j;
    r.visite = null; r.statut = 'rencontre'; r.motif = 'degustation';
    r.demande = r.gout === 'aime' ? r.F.demande : Math.max(1, r.F.demande - 2);
    r.tRel = j.minutes + 60 + hasard(4100 + r.i)() * 90;
    son.jouer('succes');
    this.c.hud.banniere(...TX.bannieres.rencontre(r.F), 3.2);
    this.changer();
  }

  /* ------------------------------------------------------------ le bureau : relances, appels, commandes */
  // À chaque image de jeu (main.js : miseAJour) : les relances qui arrivent (pendant ses heures), les signatures, les
  // notifications, la sauvegarde
  update(dt) {
    const j = this.j, m = j.minutes, ouvert = heuresOuverture(m), tel = j.tel;
    for (const r of this.liste) {
      if (r.reste !== null) { r.tRel = m + r.reste; r.reste = null; } // (une partie reprise : le délai gardé)
      if ((r.statut === 'rencontre' || r.statut === 'nonSignee') && ouvert && m >= r.tRel) {
        if (r.statut === 'nonSignee') r.motif = 'signature';
        r.statut = 'a_rappeler'; r.vu = false; r.notifie = 0;
        this.file.push({ r, msg: TX.notifs.relance({ ...r.F, motif: r.motif, numero: r.numero }), relance: true });
        this.changer();
      } else if (r.statut === 'envoyee' && (r.tSign -= dt) <= 0) {
        if (r.signera) {
          r.statut = 'signee';
          this.file.push({ r, msg: TX.notifs.signee({ ...r.F, numero: r.numero }) });
          son.jouer('succes'); j.hud.banniere(...TX.bannieres.signee({ ...r.F, cartons: r.cartons }), 3.4);
        } else { r.statut = 'nonSignee'; r.tRel = m + 40 + hasard(5200 + r.i * 7 + r.appels)() * 50; }
        this.changer();
      } else if (r.statut === 'a_rappeler' && !r.vu && r.notifie > 0 && r.notifie < 2 && (r.tVu += dt) > REVOIR && !this.file.some(x => x.r === r)) {
        this.file.push({ r, msg: TX.notifs.relance({ ...r.F, motif: r.motif, numero: r.numero }), relance: true });
      } else if (r.statut === 'commande' && !tel.ouvert && !j.pc.ouvert && (r.laisse += dt) > 8 && r.laisse < 9 && !this.file.some(x => x.r === r)) {
        this.file.push({ r, msg: TX.notifs.commande(r.F) }); // une commande laissée en plan
      }
      if (r.statut === 'commande' && (tel.ouvert || j.pc.ouvert)) r.laisse = 0;
    }
    this.notifier(dt);
    if (this.sale && (this.tSauve += dt) > 1) this.sauver();
  }
  // La notification du bureau (une à la fois) : jamais par-dessus celle d'une mission, ni pendant un appel, un geste, la
  // carte de fin, le téléphone ou le portable ouverts, sans réseau
  get reseau() { const R = this.j.traitement; return !R || !R.actif || R.reseau; }
  notifier(dt) {
    const j = this.j, tel = j.tel;
    if (!this.file.length || tel.ouvert || tel.notif || j.pc.ouvert || j.gestes.actif || j.finVue || j.mission.appelEnCours || !this.reseau) { this.tNotif = 0; return; }
    if ((this.tNotif += dt) < 3) return;
    this.tNotif = 0;
    const x = this.file.shift(), r = x.r;
    if (x.relance && (r.statut !== 'a_rappeler' || r.vu)) return; // (déjà vue, ou déjà rappelé)
    if (x.relance) { r.notifie++; r.tVu = 0; }
    this.message = x.msg;
    tel.notifier('bureau', true); son.jouer('vibre');
  }
  // quelque chose a changé : la sauvegarde, et l'écran du bureau s'il est affiché (téléphone ou portable)
  changer() {
    this.sale = true;
    const j = this.j, tel = j.tel;
    if (tel.ouvert && ['accueil', 'bureau', 'commande', 'restoCmd', 'missions'].includes(tel.app)) tel.afficher();
    if (j.pc.ouvert && j.pc.fenetre === 'bureau') j.pc.afficher();
  }
  // L'issue d'un appel, tirée au sort d'après ce qu'il avait dit (il aimait : plutôt une commande, et signée) et le
  // nombre d'appels déjà passés ; toujours la même pour une même partie
  issue(r) {
    const rr = hasard(9301 + r.i * 97 + r.appels * 13), x = rr(), p = r.F.penchant * (r.gout === 'aime' ? 1 : 0.6);
    if (x < p) { r.signera = rr() < (r.gout === 'aime' ? 0.75 : 0.5); return 'commande'; }
    if (r.appels < 2 && x < p + (1 - p) * 0.55) return 'plusTard';
    return 'non';
  }
  peutAppeler(r) { return r.statut === 'a_rappeler' && heuresOuverture(this.j.minutes) && this.reseau && !this.j.mission.appelEnCours; }
  // L'appel (Ma journée, « Appeler ») : l'écran d'appel de la tournée ; la conversation, puis la commande à préparer, ou la
  // suite (rappeler plus tard, un refus poli, la commande pas signée qu'il ne prendra pas)
  appeler(id) {
    const r = this.get(id), j = this.j, tel = j.tel, m = j.mission, hud = this.c.hud, F = r && r.F;
    if (!r || !this.peutAppeler(r)) return;
    const issue = r.motif === 'signature' ? 'refus' : this.issue(r);
    m.appelEnCours = 'resto:' + id; r.statut = 'appel'; r.vu = true;
    if (tel.notifResto) tel.notifier(null);
    for (let i = this.file.length - 1; i >= 0; i--) if (this.file[i].r === r) this.file.splice(i, 1);
    tel.appelResto = r.F; tel.tAppel = 0; tel.app = 'appel'; tel.afficher();
    hud.vider();
    const lignes = issue === 'commande' ? [...F.appel.commande(r.demande), { qui: F.qui, txt: TX.attendLien }] : F.appel[issue];
    hud.dire(lignes, () => {
      m.appelEnCours = null; tel.appelResto = null; r.appels++;
      if (issue === 'commande') {
        r.statut = 'commande'; r.cartons = 0; r.laisse = 0;
        if (!r.numero) r.numero = 'C-' + (NUM0 + this.nCmd++);
        tel.resto = r.id; tel.app = 'restoCmd';
      } else {
        if (issue === 'plusTard') {
          // « la semaine prochaine » : le bureau le reproposera le lendemain, dans la matinée
          const jour = Math.floor(j.minutes / 1440);
          r.statut = 'rencontre'; r.motif = 'plusTard'; r.tRel = (jour + 1) * 1440 + 540 + hasard(6100 + r.i * 3 + r.appels)() * 150;
        } else r.statut = issue === 'refus' ? 'refusee' : 'non';
        tel.app = 'bureau';
      }
      if (tel.ouvert) tel.afficher();
      this.changer();
    });
    this.changer();
  }
  // la commande, préparée pendant l'appel : la quantité part de zéro (la consigne du jeu rappelle ce qu'il a dit)
  quantite(id, delta) { const r = this.get(id); if (r && r.statut === 'commande') r.cartons = Math.max(0, Math.min(12, r.cartons + delta)); }
  envoyer(id) {
    const r = this.get(id);
    if (!r || r.statut !== 'commande') return true;
    if (r.cartons !== r.demande) return false;
    r.statut = 'envoyee'; r.tSign = r.signera ? 12 + hasard(5300 + r.i)() * 14 : 50 + hasard(5400 + r.i)() * 20;
    son.jouer('envoi');
    this.changer();
    return true;
  }
  // Les actions venues du téléphone (ou du bureau sur le portable) : r-appel, r-cmd, r-qte, r-signer. Rend vrai s'il faut
  // redessiner l'écran.
  action(tel, nom, arg) {
    switch (nom) {
      case 'r-appel': this.appeler(arg); return false;
      case 'r-cmd': tel.resto = arg; tel.app = 'restoCmd'; return true;
      case 'r-qte': this.quantite(tel.resto, Number(arg)); return true;
      case 'r-signer': if (!this.envoyer(tel.resto)) { son.jouer('erreur'); tel.toast(TX.consigne({ ...this.get(tel.resto).F, demande: this.get(tel.resto).demande })); return false; } return true;
    }
    return false;
  }

  /* ------------------------------------------------------------ les écrans (telephone.js, pc.js) */
  // Ma journée : en haut, le rappel du moment (quand la tournée n'a rien de plus pressé à montrer)
  carte() {
    const r = this.liste.find(x => x.statut === 'a_rappeler') || this.liste.find(x => x.statut === 'commande');
    if (!r) return '';
    if (r.statut === 'commande') return `<div class="carte-a-faire bureau"><p class="ap-sur">${esc(TX.statuts.commande[1])}</p><b>${esc(r.F.nom)}</b><button class="ap-bt plein" data-a="r-cmd:${r.id}">Préparer la commande</button></div>`;
    const pourquoi = r.motif === 'signature' ? TX.nonSigneeNote({ numero: r.numero }) : TX.propose(r.F);
    return `<div class="carte-a-faire bureau"><p class="ap-sur">${esc(TX.aRappeler)}</p><b>${esc(r.F.nom)}</b><span class="ap-note">${esc(pourquoi)}</span>${this.bouton(r)}</div>`;
  }
  bouton(r) {
    if (r.statut === 'commande') return `<button class="ap-bt plein" data-a="r-cmd:${r.id}">Préparer la commande</button>`;
    if (r.statut !== 'a_rappeler') return '';
    if (!heuresOuverture(this.j.minutes)) return `<span class="tag decroche">${esc(TX.ferme)}</span>`;
    if (!this.reseau) return `<span class="tag decroche">${esc(TX.sansReseau)}</span>`;
    return `<button class="ap-bt plein" data-a="r-appel:${r.id}"${this.j.mission.appelEnCours ? ' disabled' : ''}>Appeler</button>`;
  }
  // la note du fil du client, d'après où il en est
  fil(r) {
    const F = r.F, c = { numero: r.numero, cartons: r.cartons, produit: F.produit };
    switch (r.statut) {
      case 'a_rappeler': return r.motif === 'signature' ? TX.nonSigneeNote(c) : `${TX.propose(F)} ${F.notes[r.gout] || ''}`;
      case 'signee': return TX.signeeNote(c);
      case 'envoyee': return `${BUREAU.envoi(F)}`;
      case 'nonSignee': return TX.nonSigneeNote(c);
      case 'refusee': return TX.refusNote(c);
      case 'non': return `${F.notes[r.gout] || ''} ${TX.nonNote}`;
      case 'rencontre': return `${F.notes[r.gout] || ''} ${r.motif === 'plusTard' ? TX.plusTardNote : TX.dira}`;
      default: return F.notes[r.gout] || '';
    }
  }
  // Ma journée : la rubrique des restaurateurs rencontrés (rien tant qu'on n'en a rencontré aucun) ; ceux qui attendent
  // quelque chose d'abord. Vue : les relances sont vues.
  rubrique() {
    const R = this.rencontres;
    if (!R.length) return '';
    const ordre = { a_rappeler: 0, commande: 1, appel: 2, envoyee: 3, nonSignee: 4, rencontre: 5, signee: 6, refusee: 7, non: 8 };
    const lignes = [...R].sort((a, b) => ordre[a.statut] - ordre[b.statut]).map(r => {
      if (r.statut === 'a_rappeler') r.vu = true;
      const [k, t] = TX.statuts[r.statut] || TX.statuts.a_rappeler;
      return `<div class="rappel resto"><span class="av" style="background:${r.F.coul}">${esc(r.F.ini)}</span><div class="rq"><b>${esc(r.F.nom)} · ${esc(r.F.lieu)}</b><span>${esc(r.F.genre)} · ${esc(r.F.qui)}</span><span>${esc(this.fil(r))}</span><div class="rl"><span class="tag ${k}">${esc(t)}</span>${this.bouton(r)}</div></div></div>`;
    }).join('');
    return `<p class="ap-h">${esc(TX.rubrique)}</p>${lignes}`;
  }
  // l'onglet Commandes : les commandes des restaurateurs (préparée, envoyée, signée)
  lignesCommandes() {
    return this.liste.filter(r => r.numero && ['commande', 'envoyee', 'signee', 'nonSignee', 'a_rappeler', 'refusee'].includes(r.statut)).map(r => {
      const st = r.statut === 'a_rappeler' ? 'nonSignee' : r.statut, [k, t] = TX.statuts[st];
      const act = r.statut === 'commande' ? `<button class="ap-bt plein" data-a="r-cmd:${r.id}">Préparer</button>` : `<span class="tag ${k}">${esc(t)}</span>`;
      const qte = r.statut === 'commande' ? 'Quantité à saisir' : `${r.cartons} cartons`;
      return `<div class="arret"><span class="num" style="background:${r.F.coul}">${esc(r.F.ini)}</span><div class="rq"><b>${r.numero} · ${esc(r.F.nom)}</b><span>${qte} · ${esc(r.F.produit)}</span></div>${act}</div>`;
    }).join('');
  }
  // La commande d'un restaurateur (comme celles de la tournée) : le formulaire, puis la confirmation d'envoi
  ecranCommande(tel) {
    const r = this.get(tel.resto), F = r && r.F;
    const tete = tel.entete('Commandes', 'bureau', 'ouvrir:bureau') + tel.onglets('commande');
    if (!r) return tete + '<div class="ap-corps"></div>';
    if (r.statut === 'commande') {
      const bt = r.cartons * 6, ht = bt * F.pu;
      return tete + `<div class="ap-corps">
        <p class="consigne">${esc(TX.consigne({ ...F, demande: r.demande }))}</p>
        <p class="ap-sur">Nouvelle commande · ${r.numero}</p><p class="fc-client"><b>${esc(F.nom)}</b><br>${esc(F.lieu)}</p>
        <p class="ap-note">${esc(BUREAU.commande)}</p>
        <div class="cd-ligne"><span><b>${esc(F.produit)}</b><br><small>${bt} bouteilles · ${eur(F.pu)} HT la bouteille</small></span>
          <div class="pas"><button data-a="r-qte:-1" aria-label="Un carton de moins"${r.cartons <= 0 ? ' disabled' : ''}>−</button><b>${r.cartons}</b><button data-a="r-qte:1" aria-label="Un carton de plus"${r.cartons >= 12 ? ' disabled' : ''}>+</button></div></div>
        <p class="ap-note">Cartons de 6 bouteilles.</p>
        <div class="fc-tot"><span class="g">Total HT</span><b class="g">${eur(ht)}</b></div>
        <button class="ap-bt plein large" data-a="r-signer"${r.cartons ? '' : ' disabled'}>Envoyer pour signature</button></div>`;
    }
    const st = TX.statuts[r.statut] || TX.statuts.envoyee;
    return tete + `<div class="ap-corps">
      ${r.statut === 'envoyee' ? `<div class="fc-ok"><span class="roue petite"></span><b>Commande ${r.numero} envoyée</b></div><p class="ap-txt">${esc(BUREAU.envoi(F))}</p>` : `<p class="ap-sur">Commande ${r.numero ?? ''}</p><p class="fc-client"><b>${esc(F.nom)}</b><br>${esc(F.lieu)}</p><p class="ap-txt">${esc(this.fil(r))}</p>`}
      <span class="tag ${st[0]}">${esc(st[1])}</span>
      <button class="ap-bt plein large" data-a="ouvrir:bureau">Retour à Ma journée</button></div>`;
  }
  // l'app Missions : la ligne « Hors mission », une fois le premier rencontré
  ligneMissions() {
    const k = this.rencontres.length;
    if (!k) return '';
    const M = TX.missions;
    return `<div class="ms"><p class="ms-n">${esc(M.n)}<b class="ms-e cours">${k} sur ${this.liste.length}</b></p><p class="ms-t">${esc(M.titre)}</p><p class="ap-note">${esc(M.texte(k, this.liste.length, this.signees.length))}</p></div>`;
  }
  // Vitisoft, Liste des commandes / BL (pc.js) : les commandes signées en ligne, arrivées sans ressaisie
  pourVitisoft() { return this.signees.map(r => ({ numero: r.numero, nom: r.F.nom, ht: r.cartons * 6 * r.F.pu })); }

  /* ------------------------------------------------------------ la sauvegarde (sauvegarde.js : restos, à part) */
  // ce qui se garde : où en est chacun ; un délai en minutes de jeu qui restent (la partie reprise a son heure à elle) ;
  // un appel ou une visite en cours repartent de leur attente
  sauver() {
    this.sale = false; this.tSauve = 0;
    const m = this.j.minutes, r = {};
    for (const x of this.liste) {
      if (x.statut === 'inconnu') continue;
      r[x.id] = { s: x.statut === 'appel' ? 'a_rappeler' : x.statut, g: x.gout, m: x.motif, d: x.demande, num: x.numero, c: x.cartons, sg: x.signera, ts: Math.max(0, x.tSign), a: x.appels,
        reste: x.statut === 'rencontre' || x.statut === 'nonSignee' ? Math.max(0, Math.round(x.tRel - m)) : 0 };
    }
    SAUVE.enregistrerRestos({ n: this.nCmd, r });
  }
  charger() {
    const o = SAUVE.restos;
    if (!o || !o.r) return;
    this.nCmd = o.n || 0;
    for (const x of this.liste) {
      const s = o.r[x.id];
      if (!s || !TX.statuts[s.s]) continue;
      x.statut = s.s; x.gout = s.g || 'aime'; x.motif = s.m || null; x.demande = s.d || x.F.demande; x.numero = s.num || null; x.cartons = s.c || 0;
      x.signera = !!s.sg; x.tSign = s.ts || 0; x.appels = s.a || 0; x.reste = s.reste || 0;
      if (x.statut === 'commande') x.cartons = 0;
      if (x.statut === 'a_rappeler') this.file.push({ r: x, msg: TX.notifs.relance({ ...x.F, motif: x.motif, numero: x.numero }), relance: true });
    }
  }
}
