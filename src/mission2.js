// Mission 2 : « La journée de traitement », le lendemain de la tournée de Noël (Teddy, 24/11/2026). Après la tournée, on
// va dormir ; au réveil (le mercredi 9 décembre si la tournée a fini le soir même ; la date suit les jours du jeu :
// outils.js, dateJeu), Claire, la conseillère viticole, écrit : le passage d'hiver, bouillie bordelaise seule (un
// traitement bio), contre le mildiou qui passe l'hiver, sur trois parcelles (l'ETA a fait les autres). Aucun
// professionnel sur place (Claire écrit) : rien ne ferme la nuit, on peut traiter et noter à toute heure.
// 1. Au domaine, en enjambeur (le pulvérisateur y est installé ; le tracteur ne pulvérise pas : Teddy, 24/11/2026), à
//    l'aire de remplissage : on prépare la bouillie.
// 2. Dans chaque parcelle, l'enjambeur enjambe un rang : ses bras se déplient et ses descentes traitent ce rang et les
//    deux voisins, les feuilles prennent un voile bleuté. Une fois engagé dans un rang, il fait toute la parcelle tout
//    seul, passage après passage, demi-tours compris : on ne gère que l'avance (main.js) ; la scène va trois fois plus
//    vite.
// 3. Dans le Registre phyto (téléphone), on note chaque parcelle dès qu'elle est traitée, avant la suivante (une saisie
//    par parcelle ; Teddy, 26/11/2026) : la parcelle, les produits et leurs doses, le stade (repris du dernier
//    traitement), la cible. L'enjambeur s'arrête au bout de la parcelle, le téléphone vibre (Registre phyto), on dit quelle
//    appli ouvrir, et l'appli guide chaque écran (consignes, ce qu'il faut toucher) ; la suivante n'est pas traitée tant
//    que celle-ci n'est pas notée. En bas des Grands Champs, pas de réseau : noté, envoyé tout seul quand ça capte.
// Pour finir toujours : l'objectif est recalculé à chaque image d'après l'état ; l'appli refuse une saisie qui ne
// correspond pas à ce qui a été fait, et dit pourquoi.
import { TRAITEMENT as TX } from './textes.js';
import { son } from './audio.js';
import { ecart } from './reseau.js';
import { dateJeu, jourDe } from './outils.js';

const FAITE = 0.97;         // une parcelle est traitée quand 97 % de ses travées l'ont été
const RANG_FAIT = 0.92;     // un rang l'est à 92 % (le guidage ne repasse plus dessus)
const PAR_PASSAGE = 3;      // l'enjambeur traite trois rangs par passage : celui qu'il enjambe et ses deux voisins
const TOUR = 4.2;           // rayon des demi-tours dans les tournières (l'enjambeur braque à 3,6 m)
// engagé dans un rang : à moins de 0,9 m de l'axe d'un passage, dans son sens à 0,45 rad près (il pulvérise déjà)
const ENGAGE_X = 0.9, ENGAGE_CAP = 0.45;
const RAPPEL = 8;           // secondes au moins entre deux aides dites en route
const ARRET = 2.5;          // secondes où l'enjambeur freine tout seul, une parcelle finie (main.js : conduire)
const ENVOI = 1.5;          // secondes de réseau retrouvé avant l'envoi de ce qui attend
// pas de réseau en bas des Grands Champs (le chemin, la parcelle, le hameau)
export const sansReseau = p => p.x > -72 && p.x < 4 && p.z > 22;
// l'entrée de chaque parcelle du jour, au bout nord des rangs, sur le chemin ou la tournière ; là où l'on retrouve le
// réseau (des objets fixes : l'itinéraire jusqu'à eux n'est calculé qu'une fois, la conduite assistée garde son fil)
const ENTREES = { perrieres: { x: -147, z: -114 }, clos: { x: -36, z: -114 }, grandschamps: { x: -29, z: 26 } };
const RESEAU = { x: -55, z: 14 };
const STABLES = new Set(['debut', 'message', 'preparer', 'traiter', 'fin', 'dodo', 'libre']);

export class Traitement {
  // c : { monde (vignes, traiter), particules, pulve (le pulvérisateur de l'enjambeur, enjambeur.js), deplier (ses bras),
  // v (un vecteur de travail), rnd } ; jeu : main.js
  constructor(jeu, c) {
    this.j = jeu; this.c = c; this.etape = 'avant'; this.t = 0; this.horloge = 0;
    const L = jeu.lieux;
    this.parcelles = TX.parcelles.map(p => {
      const q = L.parcelles[p.i], v = c.monde.vignes[p.i];
      return { ...p, q, v, ha: (q.x1 - q.x0) * (q.z1 - q.z0) / 1e4, total: v.blocs.reduce((s, b) => s + b.n, 0), faites: 0, traitee: false, notee: false };
    });
    this.jour = this.parcelles.filter(p => p.jour); // les trois parcelles du jour (lues à chaque image : une fois pour toutes)
    this.registre = TX.avant.map(l => ({ ...l, statut: 'envoye' }));
    this.saisie = null;          // la saisie en cours dans l'appli (telephone.js)
    this.prete = false;          // la bouillie est dans la cuve
    this.lu = false;             // le message de Claire est lu
    this.message = TX.message.apercu;
    this.objAff = null; this.itin = null; this.tItin = 0;
    this.tRappel = 0; this.aideCle = null; this.aideT = -1e9;
    this.ouvert = 0;             // les rampes dépliées, de 0 à 1
    this.pulverise = false;      // les rampes traitent (dans les rangs d'une parcelle du jour, en roulant)
    this.guidage = false;        // l'enjambeur est dans une parcelle du jour : le guidage peut suivre les passages
    this.engage = false;         // engagé dans un rang : il fait toute la parcelle tout seul, on ne gère que l'avance
    this.tEnvoi = 0; this.tSon = 0; this.guideDit = false; this.dit = false; this.tObj = 0;
    this.tArret = 0;             // une parcelle finie : l'enjambeur freine tout seul (main.js)
    this.aDire = null;           // ce qui se dit une fois le téléphone fermé (il couvre les sous-titres)
  }
  get actif() { return this.etape !== 'avant'; }
  // (des listes neuves : pour l'objectif, dix fois par seconde, et le téléphone ; à chaque image, voir premiereATraiter,
  // attend)
  get aTraiter() { return this.jour.filter(p => !p.traitee); }
  get aNoter() { return this.parcelles.filter(p => p.traitee && !p.notee); }
  get enAttente() { return this.registre.filter(l => l.statut === 'attente'); }
  get attend() { for (const l of this.registre) if (l.statut === 'attente') return true; return false; }
  get premiereATraiter() { for (const p of this.jour) if (!p.traitee) return p; return null; }
  // une parcelle traitée attend sa saisie : la suivante attend (pas de balise, les rampes restent repliées)
  get attendNote() { for (const p of this.parcelles) if (p.traitee && !p.notee) return true; return false; }
  get fini() { for (const p of this.jour) if (!p.notee) return false; return !this.attend; }
  noms(l) { const n = l.map(p => p.nom); return n.length > 1 ? n.slice(0, -1).join(', ') + ' et ' + n[n.length - 1] : n[0]; }
  // l'enjambeur conduit (le pulvérisateur est dessus)
  get enEnjambeur() { return this.j.auVolant && this.j.veh.genre === 'enjambeur'; }
  // la parcelle du jour où se trouve le véhicule conduit (élargie de m mètres), ou null
  dans(m = 0) {
    if (!this.j.auVolant) return null;
    const o = this.j.tr.pos, J = this.jour;
    for (let i = 0; i < J.length; i++) { const q = J[i].q; if (o.x > q.x0 - m && o.x < q.x1 + m && o.z > q.z0 - m - 1 && o.z < q.z1 + m + 1) return J[i]; }
    return null;
  }
  get reseau() { return !sansReseau(this.j.auVolant ? this.j.tr.pos : this.j.joueur.pos); }

  /* ------------------------------------------------------------ déroulé */
  // au réveil (main.js : dormir) : la bannière, le message de Claire
  demarrer() {
    this.etape = 'debut'; this.t = 0;
    this.j.hud.banniere(...TX.bannieres.titre(this.date), 4.5);
  }
  aller(e) { this.etape = e; this.t = 0; this.itin = null; }
  // la date du jour (« mercredi 9 décembre ») ; courte, sans l'année, pour le Registre phyto (« 9 décembre »)
  get date() { return dateJeu(jourDe(this.j.minutes)); }
  get dateCourte() { return dateJeu(jourDe(this.j.minutes), 'courte'); }
  // La sauvegarde (sauvegarde.js, main.js) : où en est la journée (message lu, bouillie prête, chaque parcelle et ses
  // travées traitées, le registre), prise hors des gestes, et sa reprise (l'enjambeur à sa place, ses bras repliés : main.js)
  get stable() { return STABLES.has(this.etape) && !this.j.gestes.actif; }
  instantane() {
    return {
      etape: this.etape === 'debut' ? 'message' : this.etape === 'fin' ? 'dodo' : this.etape, lu: this.lu, prete: this.prete,
      parcelles: this.parcelles.map(p => ({ f: p.faites, t: p.traitee, n: p.notee, b: p.v.blocs.map(b => Array.from(b.traite).join('')) })),
      registre: this.registre.map(l => ({ ...l })),
    };
  }
  reprendre(o) {
    this.lu = o.lu; this.prete = o.prete; this.dit = true; this.guideDit = o.etape !== 'preparer' && o.etape !== 'message';
    this.registre = o.registre.map(l => ({ ...l }));
    this.parcelles.forEach((p, i) => { const x = o.parcelles[i]; if (!x) return; p.faites = x.f; p.traitee = x.t; p.notee = x.n; this.c.monde.retraiter(p.v, x.b); });
    // (une partie d'avant la mission 3 finissait en « libre » : la journée finie, on rentre dormir)
    this.aller(o.etape === 'message' && this.lu ? 'preparer' : o.etape === 'libre' ? 'dodo' : o.etape);
    if (this.etape === 'message') this.notifier('messages', TX.message.apercu);
  }
  aider(lignes, cle) {
    if (!lignes || this.tRappel > 0 || (cle === this.aideCle && this.horloge - this.aideT < 25)) return;
    this.j.hud.dire(lignes); this.tRappel = RAPPEL; this.aideCle = cle; this.aideT = this.horloge;
  }
  notifier(app, msg) { this.message = msg || this.message; this.j.tel.notifier(app); son.jouer('vibre'); }
  // le message de Claire lu (Messages) : on sait quoi faire
  messageLu() {
    if (this.lu) return;
    this.lu = true;
    if (this.etape === 'debut' || this.etape === 'message') { this.aller('preparer'); this.j.hud.dire(TX.dialogues.luMessage); }
  }

  // La balise : l'aire de remplissage, la prochaine parcelle à traiter (son bout nord), la route pour retrouver le réseau
  get cible() {
    const e = this.etape, L = this.j.lieux;
    if (e === 'dodo') return this.j.finVue ? null : L.maison;
    if (e === 'preparer') return L.aire;
    if (e !== 'traiter') return null;
    if (this.attendNote) return null; // une parcelle à noter : on la note d'abord, rien à rejoindre
    const p = this.prochaine;
    if (p) {
      if (this.dans(8) !== p) return ENTREES[p.id];
      // dans la parcelle : le bout des passages qui restent
      const it = this.serpentine(p), f = it.pts[it.pts.length - 1];
      return it.fin || (it.fin = { x: f[0], z: f[1] });
    }
    if (this.attend && !this.reseau) return RESEAU;
    return null;
  }
  get nomCible() {
    const e = this.etape;
    if (e === 'dodo') return 'Maison';
    if (e === 'preparer') return 'Aire de remplissage';
    const p = this.prochaine;
    return p ? p.nom : 'Réseau';
  }
  // la prochaine parcelle à traiter : celle où l'on est, sinon les deux près du domaine, puis les Grands Champs
  get prochaine() { const d = this.dans(8); return d && !d.traitee ? d : this.premiereATraiter; }
  // les passages qui restent dans la parcelle p (gardés tant qu'on y est)
  serpentine(p) {
    const o = this.j.auVolant ? this.j.tr.pos : this.j.joueur.pos;
    if (!this.itin || this.itin.p !== p) this.itin = { p, pts: this.passages(p, o) };
    return this.itin;
  }
  // L'itinéraire : jusqu'à la balise par le réseau ; dans une parcelle du jour, les passages qui restent (serpentine)
  get route() {
    const c = this.cible;
    if (!c) return null;
    const j = this.j, p = this.etape === 'traiter' && this.prete ? this.dans(8) : null;
    if (p && !p.traitee) return this.serpentine(p).pts;
    if (!this.itin || this.itin.c !== c || this.itin.p) this.itin = { c, pts: j.reseau.itineraire(j.auVolant ? j.tr.pos : j.joueur.pos, c) };
    return this.itin.pts;
  }
  // Les passages qui restent dans la parcelle p, depuis o : l'enjambeur passe au-dessus d'un rang sur trois (il traite
  // celui qu'il enjambe et ses deux voisins), seulement là où un rang n'est pas fini ; du côté le plus proche d'abord, en
  // serpentine, un passage sur deux puis les autres en revenant (comme au vrai : les demi-tours ont de la place), en arc
  // dans les tournières
  passages(p, o) {
    const q = p.q, n = q.n, faits = new Float32Array(n), tot = new Float32Array(n);
    for (const b of p.v.blocs) for (let k = 0; k < b.n; k++) {
      const r = Math.round((b.t[k * 8] - q.xr) / q.ecart);
      if (r >= 0 && r < n) { tot[r]++; if (b.traite[k]) faits[r]++; }
    }
    const rangFait = r => r < 0 || r >= n || tot[r] === 0 || faits[r] / tot[r] >= RANG_FAIT;
    let ps = [];
    for (let i = 1; ; i += PAR_PASSAGE) {
      const k = Math.min(i, n - 2);
      if (![k - 1, k, k + 1].every(rangFait)) ps.push(q.xr + k * q.ecart);
      if (k + 1 >= n - 1) break;
    }
    if (!ps.length) return [[o.x, o.z], [o.x, o.z + 0.1]];
    if (Math.abs(o.x - ps[ps.length - 1]) < Math.abs(o.x - ps[0])) ps.reverse();
    if (ps.length > 2) ps = [...ps.filter((x, i) => i % 2 === 0), ...ps.filter((x, i) => i % 2 === 1)];
    // (le premier point : le tracteur lui-même ; sinon la conduite assistée prendrait le passage le plus proche de lui)
    const za = q.z0 - 1, zb = q.z1 + 1, pts = [[o.x, o.z]];
    let sud = o.z < (q.z0 + q.z1) / 2;
    for (let i = 0; i < ps.length; i++) {
      const x = ps[i], z0 = sud ? za : zb, z1 = sud ? zb : za;
      for (let k = 0; k <= 8; k++) pts.push([x, z0 + (z1 - z0) * k / 8]);
      if (i + 1 < ps.length) {
        // demi-tour dans la tournière, du côté de la sortie, jusqu'au passage suivant : un quart de tour (rayon TOUR, plus
        // large que le braquage de l'enjambeur), la tournière tout droit, un quart de tour ; deux passages proches : un
        // arc. On ne s'éloigne jamais de plus de TOUR du bout des rangs.
        const x2 = ps[i + 1], s = sud ? 1 : -1, d = x2 > x ? 1 : -1, r = Math.min(TOUR, Math.abs(x2 - x) / 2);
        for (let k = 1; k <= 6; k++) { const a = Math.PI / 2 * k / 6; pts.push([x + d * r * (1 - Math.cos(a)), z1 + s * r * Math.sin(a)]); }
        const xa = x + d * r, xb = x2 - d * r;
        for (let k = 1, nk = Math.max(1, Math.round(Math.abs(xb - xa) / 2)); k < nk; k++) pts.push([xa + (xb - xa) * k / nk, z1 + s * r]);
        for (let k = 0; k < 6; k++) { const a = Math.PI / 2 * k / 6; pts.push([x2 - d * r * (1 - Math.cos(a)), z1 + s * r * Math.cos(a)]); }
      }
      sud = !sud;
    }
    return pts;
  }

  // L'objectif affiché, d'après où en est la journée (recalculé à chaque image)
  get objectif() {
    const e = this.etape, O = TX.objectifs, j = this.j;
    if (e === 'avant') return null;
    if (e === 'debut' || e === 'message') return O.message(j.tactile);
    if (e === 'preparer') return this.enEnjambeur ? O.aire : O.enjambeur;
    if (e === 'dodo') return O.dodo;
    if (e === 'fin' || e === 'libre') return O.fin;
    if (e === 'remplir') return O.aire;
    // traiter : une parcelle traitée se note tout de suite (une saisie par parcelle), avant la suivante ; puis la
    // suivante ; enfin, ce qui attend part quand ça capte
    const aN = this.aNoter, p = this.prochaine;
    if (aN.length) return (this.reseau ? O.noter : O.noterIci)(this.noms(aN), j.tactile);
    if (p) {
      const cur = this.dans(8), pc = cur === p ? Math.floor(100 * p.faites / p.total) : 0;
      return O.traiter(p.nom, this.jour.reduce((n, x) => n + (x.traitee ? 1 : 0), 1), pc); // (la n-ième, dans l'ordre où on les fait)
    }
    if (this.attend) return O.envoyer;
    return O.fin;
  }

  update(dt) {
    const j = this.j, hud = j.hud;
    if (this.etape === 'avant') return;
    this.t += dt; this.horloge += dt;
    this.tRappel = Math.max(0, this.tRappel - dt);
    this.tArret = Math.max(0, this.tArret - dt);
    // (ce qui restait à dire de la parcelle finie ne sert plus : la suite d'abord)
    if (this.aDire && !j.tel.ouvert) { j.hud.vider(); j.hud.dire(this.aDire); this.aDire = null; }
    // l'itinéraire : refait si l'on s'en est écarté de plus de 25 m
    if (this.itin && !this.itin.p && (this.tItin -= dt) <= 0) {
      this.tItin = 0.5;
      const o = j.auVolant ? j.tr.pos : j.joueur.pos;
      if (ecart(this.itin.pts, o) > 25) this.itin = null;
    }
    switch (this.etape) {
      case 'debut':
        if (this.t > 1.2 && !this.dit) { this.dit = true; hud.dire(TX.dialogues.reveil(this.date)); this.notifier('messages', TX.message.apercu); }
        if (this.t > 4) this.aller(this.lu ? 'preparer' : 'message');
        break;
      case 'message':
        if (this.t > 25) this.messageLu(); // sans l'avoir ouvert, on sait quand même quoi faire
        break;
      case 'preparer': {
        const d = j.distance(j.lieux.aire);
        if (j.auVolant && j.veh.genre !== 'enjambeur' && d < 8) this.aider(TX.dialogues.pasEnjambeur, 'aire');
        // (la conduite assistée s'arrête à 4,2 m de la balise : on remplit dès 5 m)
        if (this.enEnjambeur && d < 5 && Math.abs(j.tr.v) < 1.2 && !j.gestes.actif && !j.tel.ouvert) this.remplir();
        if (this.enEnjambeur && this.dans(2)) this.aider(TX.dialogues.pasPrete, 'parcelle'); // dans les vignes sans bouillie
        break;
      }
      case 'traiter': this.traiter(dt); break;
      case 'fin':
        if (this.t > 6) { this.aller('dodo'); j.finMission2(); } // la carte de fin ; puis rentrer dormir (la mission 3 au réveil)
        break;
    }
    this.rampes(dt);
    // l'objectif : recalculé dix fois par seconde (il fabrique des textes), tout de suite après un changement d'étape
    if ((this.tObj -= dt) <= 0 || this.t === dt) {
      this.tObj = 0.1;
      const o = this.objectif;
      if (o && o !== this.objAff) { this.objAff = o; hud.objectif(o); }
    }
  }

  // À l'aire : on descend, on remplit la cuve (l'eau et la bouillie bordelaise), on remonte
  remplir() {
    const j = this.j, L = j.lieux;
    this.aller('remplir');
    j.remplir(L.aire.cuve, () => {
      son.jouer('remplir');
      j.hud.dire(TX.dialogues.remplir);
    }, () => {
      this.prete = true;
      this.aller('traiter');
      son.jouer('succes');
      j.hud.banniere(...TX.bannieres.prete, 3.4);
    });
  }

  // Dans les parcelles : traitées au passage des rampes ; une parcelle finie se dit ; ce qui attend part quand ça capte
  traiter(dt) {
    const j = this.j, hud = j.hud;
    for (const p of this.jour) if (!p.traitee && p.faites >= p.total * FAITE) {
      // finie : l'enjambeur s'arrête, le téléphone vibre (Registre phyto) ; on la note avant la suivante
      p.traitee = true; this.itin = null; this.tArret = ARRET;
      son.jouer('succes');
      hud.banniere(...TX.bannieres.traitee(p.nom), 3);
      hud.vider();
      hud.dire((p.reseau ? TX.dialogues.parcelleFinie : TX.dialogues.sansReseau)(p.nom, j.tactile));
      this.notifier('phyto');
    }
    // arrivé dans une parcelle du jour avec la bouillie : le guidage ; avec un autre véhicule : il faut l'enjambeur
    if (this.guidage && !this.guideDit) { this.guideDit = true; hud.dire(TX.dialogues.guidage(j.tactile)); }
    if (j.auVolant && j.veh.genre !== 'enjambeur' && this.dans(2)) this.aider(TX.dialogues.pasEnjambeur, 'parcelle');
    // dans la parcelle suivante sans avoir noté la précédente : d'abord la saisie
    if (this.attendNote && this.enEnjambeur && !j.tel.ouvert) { const d = this.dans(2); if (d && !d.traitee) this.aider(TX.dialogues.dAbord(this.noms(this.aNoter)), 'noter'); }
    // au bout des passages sans avoir tout traité (on en a sauté, à la main), ou loin d'eux : on refait le plan depuis ici
    if (this.itin && this.itin.p && j.auVolant && (this.tItin -= dt) <= 0) {
      this.tItin = 0.5;
      const o = j.tr.pos, f = this.itin.pts[this.itin.pts.length - 1];
      if ((Math.hypot(o.x - f[0], o.z - f[1]) < 5 && Math.abs(j.tr.v) < 0.5) || ecart(this.itin.pts, o) > 7) this.itin = null;
    }
    // le réseau revient : ce qui attend part
    if (this.attend && this.reseau) {
      if ((this.tEnvoi += dt) > ENVOI) {
        this.tEnvoi = 0;
        for (const l of this.enAttente) l.statut = 'envoye';
        son.jouer('envoye');
        hud.banniere(...TX.bannieres.envoye, 3);
        hud.dire(TX.dialogues.envoye);
        j.tel.rafraichir('phyto');
      }
    } else this.tEnvoi = 0;
    if (this.fini) {
      this.aller('fin'); j.gagner('traitement'); // la mission 2 est gagnée (sauvegarde.js)
      hud.banniere(...TX.bannieres.fin, 4.5);
      setTimeout(() => hud.dire(TX.dialogues.fin), 900);
    }
  }

  // Les bras du pulvérisateur : dépliés dans une parcelle du jour (la bouillie prête, l'enjambeur au volant), repliés
  // ailleurs. pas : ses descentes traitent les rangs qu'elles longent en roulant ; appelé à chaque pas de la conduite
  // (main.js), même accélérée.
  rampes(dt) {
    const P = this.c.pulve, p = this.prete && this.enEnjambeur && !this.attendNote ? this.dans(8) : null;
    this.guidage = !!p && !p.traitee;
    // engagé dans un rang, il le reste jusqu'au bout de la parcelle (ou si l'on en sort, ou qu'on descend)
    if (!this.guidage) this.engage = false;
    const but = this.guidage ? 1 : 0;
    if (this.ouvert !== but) { this.ouvert = but > this.ouvert ? Math.min(1, this.ouvert + dt * 0.8) : Math.max(0, this.ouvert - dt * 0.8); this.c.deplier(P, this.ouvert); }
  }
  pas(dt) {
    const j = this.j, P = this.c.pulve;
    this.pulverise = false;
    if (!this.guidage || this.ouvert < 0.95) return;
    const tr = j.tr, p = this.dans(4);
    if (!p || p.traitee) return;
    // engagé : l'axe de l'enjambeur sur un passage, dans son sens (il entre dans le rang qu'il enjambe)
    if (!this.engage && this.itin && this.itin.p === p) {
      const q = p.q, k = Math.round((tr.pos.x - q.xr) / q.ecart), dx = Math.abs(tr.pos.x - (q.xr + k * q.ecart));
      const aligne = Math.abs(Math.sin(tr.h)) < Math.sin(ENGAGE_CAP), dedans = tr.pos.z > q.zr0 - 1 && tr.pos.z < q.zr1 + 1;
      if (dx < ENGAGE_X && aligne && dedans && Math.abs(tr.v) > 0.3) { this.engage = true; j.hud.dire(TX.dialogues.engage(j.tactile)); }
    }
    if (Math.abs(tr.v) < 0.4) return;
    const q = p.q, z = P.z;
    const bx = tr.pos.x + Math.sin(tr.h) * z, bz = tr.pos.z + Math.cos(tr.h) * z;
    if (bx < q.x0 - 1 || bx > q.x1 + 1 || bz < q.zr0 - 0.6 || bz > q.zr1 + 0.6) return;
    this.pulverise = true;
    p.faites += this.c.monde.traiter(p.v, bx, bz, P.demi);
    // la bouillie : un brouillard fin qui sort des buses (de part et d'autre de chaque descente) vers les feuilles, et son
    // souffle
    const E = this.c.particules.emettre, M = P.groupe.matrixWorld, V = this.c.v, rnd = this.c.rnd, lx = Math.cos(tr.h), lz = -Math.sin(tr.h);
    for (const b of P.buses) {
      if (rnd() > dt * 16) continue;
      V.copy(b).applyMatrix4(M);
      for (let d = -1; d <= 1; d += 2) {
        const sp = 0.9 + rnd() * 0.9;
        E(V.x, V.y + (rnd() - 0.5) * 0.4, V.z, lx * d * sp, 0.15 + rnd() * 0.3, lz * d * sp, 0.85, rnd() < 0.5 ? 0xe4f2f0 : 0xc9e2e2, 0.55, -0.2);
      }
    }
    if ((this.tSon -= dt) <= 0) { this.tSon = 0.6; son.jouer('pulve'); }
  }

  /* ------------------------------------------------------------ le Registre phyto (telephone.js) */
  // une nouvelle saisie : rien de coché, doses à zéro, le stade repris du dernier traitement, pas de cible
  nouvelleSaisie() {
    this.saisie = { parcelles: new Set(), doses: Object.fromEntries(TX.produits.map(p => [p.id, 0])), cibles: new Set(), etape: 'parcelles' };
    return this.saisie;
  }
  cocher(id) { const s = this.saisie; if (!s) return; if (s.parcelles.has(id)) s.parcelles.delete(id); else s.parcelles.add(id); }
  dose(id, sens) { const s = this.saisie, P = TX.produits.find(p => p.id === id); if (!s || !P) return; s.doses[id] = Math.max(0, Math.min(20, Math.round((s.doses[id] + sens * P.pas) * 100) / 100)); }
  choisirCible(c) { const s = this.saisie; if (!s) return; if (s.cibles.has(c)) s.cibles.delete(c); else s.cibles.add(c); }
  // ce qui ne va pas dans l'étape en cours de la saisie (null : on peut passer à la suite)
  verifier() {
    const s = this.saisie, A = TX.app;
    if (!s) return A.aucune;
    if (s.etape === 'parcelles') {
      if (!s.parcelles.size) return A.aucune;
      const non = this.parcelles.filter(p => s.parcelles.has(p.id) && !p.traitee);
      if (non.length) return A.pasTraitee(this.noms(non), non.length);
      const deja = this.parcelles.filter(p => s.parcelles.has(p.id) && p.notee);
      if (deja.length) return A.deja(this.noms(deja), deja.length);
      return null;
    }
    if (s.etape === 'produits') {
      if (TX.produits.some(P => !P.bio && s.doses[P.id] > 0)) return A.pasBio;
      const hors = TX.produits.find(P => !P.cuve && s.doses[P.id] > 0); // bio, mais pas dans la cuve aujourd'hui
      if (hors) return A.pasCuve(hors.nom);
      if (TX.produits.some(P => P.cuve && s.doses[P.id] === 0)) return A.manque;
      for (const P of TX.produits) if (P.cuve && s.doses[P.id] !== P.dose) return A.dose(P.nom, `${String(P.dose).replace('.', ',')} ${P.unite}`);
      return null;
    }
    if (s.etape === 'cible') {
      const J = TX.ciblesDuJour;
      if (s.cibles.size !== J.length || !J.every(c => s.cibles.has(c))) return A.cibleJour;
      return null;
    }
    return null;
  }
  // enregistrer : une ligne du registre (qui, quand) ; sans réseau, elle attend d'être envoyée
  // (la saisie entière est revérifiée : rien ne s'enregistre qui ne corresponde à ce qui a été fait)
  toutVerifier() {
    const s = this.saisie;
    if (!s) return TX.app.aucune;
    const e = s.etape;
    for (const x of ['parcelles', 'produits', 'cible']) { s.etape = x; const err = this.verifier(); if (err) { s.etape = e; return err; } }
    s.etape = e;
    return null;
  }
  enregistrer() {
    const s = this.saisie, j = this.j;
    if (!s || s.etape !== 'recap' || this.toutVerifier()) return null;
    const parcs = this.parcelles.filter(p => s.parcelles.has(p.id)), en = this.reseau;
    const h = j.heureTxt.replace(/^0/, '').replace(':', ' h '), d = this.dateCourte;
    this.registre.unshift({
      quand: `${d} · ${h}`, parcelles: parcs.map(p => p.nom),
      produits: TX.produits.filter(P => P.cuve).map(P => `${P.nom} · ${String(P.dose).replace('.', ',')} ${P.unite}`),
      cibles: [...s.cibles], stade: TX.stade, par: `vous, le ${d} à ${h}`, statut: en ? 'envoye' : 'attente',
    });
    for (const p of parcs) p.notee = true;
    this.saisie = null;
    son.jouer(en ? 'envoye' : 'notif');
    j.hud.banniere(...(en ? TX.bannieres.note(parcs.length) : TX.bannieres.attente), 3);
    // la suite, dite une fois le téléphone fermé : la parcelle suivante, ou remonter là où ça capte
    const suite = this.premiereATraiter;
    this.aDire = !en ? TX.dialogues.noteAttente : suite ? TX.dialogues.note(suite.nom) : null;
    return en;
  }
}
