// Les clients devant leur boutique (les trois commandes, l'épicier, l'aubergiste) : ils se tournent vers vous quand vous
// approchez, vous regardent et font signe. Leur affaire faite (livrés, le chèque donné, la visite notée), ils rangent
// les cartons posés devant eux, une pile par voyage, et rentrent dans leur boutique (gestes.js : prendre, entrer,
// sortir ; la porte de chaque boutique : lieux.portes).
// Les professionnels ne travaillent pas la nuit (Teddy, 26/11/2026 ; outils.js : HORAIRES) : à la fermeture, celui qui
// attendait dehors rentre chez lui, une fois l'affaire en cours finie (jamais au milieu d'une livraison, d'un chèque, d'une
// dégustation, d'un attelage : mission.occupe) ; à l'ouverture, il ressort et reprend sa place, s'il a encore affaire à
// vous (mission.veut, sinon : son affaire pas faite). Loin de vous, ou au réveil (reveil), sans le voir faire.
import * as THREE from 'three';
import { Gestes } from './gestes.js';
import { ouvert } from './outils.js';

const ATTENTE = 2.5;  // secondes entre l'affaire faite et le rangement (on a le temps de les voir faire)
const DEDANS = 1.6;   // secondes passées dans la boutique entre deux piles
const LOIN = 220;     // m : au-delà (plus loin que les personnages dessinés au palier haut, 200 m, et la caméra), immobile
const VU = 70;        // m : plus loin, il rentre ou ressort d'un coup, sans marcher (on ne le voit pas faire)
const VISAGE = new THREE.Vector3(), V = new THREE.Vector3();

export class Clients {
  // c : { jeu, scene, col, mission } ; mission : fait, arretDe, deposes ; horaire(id) (son métier, outils.js : HORAIRES),
  // occupe(id) (une affaire en cours), veut(id) (le matin, ressort-il ?)
  constructor(c) { this.c = c; this.liste = []; }
  // un client (Pieton), où il attend (l : { x, z, h }), son arrêt dans la tournée (id)
  ajouter(p, l, id) {
    const { jeu, scene, col } = this.c;
    this.liste.push({ p, l, id, porte: jeu.lieux.portes[id], etat: 'dehors', t: 0, gestes: new Gestes({ jeu, scene, col, acteur: p }) });
  }
  // dt, t ; ego : le joueur ou son véhicule (où regarder), auVolant (la hauteur des yeux)
  maj(dt, t, ego, auVolant) {
    const m = this.c.mission, minutes = this.c.jeu.minutes;
    for (const f of this.liste) {
      const p = f.p;
      if (f.porte && this.horaires(f, minutes, ego, false)) continue;
      if (f.etat === 'dedans' || f.etat === 'pilote') continue; // (pilote : mené d'ailleurs, main.js : Marc au transpalette)
      if (f.etat === 'range') { f.gestes.update(dt, t); continue; }
      // un saut de côté (il évite un véhicule : main.js, esquiver) : joué jusqu'au bout ; il reste où il a atterri
      if (p.sautT > 0) { p.update(dt, 0, 0, 0, false, this.c.col, t); if (p.sautT <= 0) f.l = { x: p.pos.x, z: p.pos.z, h: f.l.h }; continue; }
      if (f.porte && m.fait(m.arretDe(f.id)) && (f.t += dt) > ATTENTE) { this.ranger(f); continue; }
      // dehors : il se tourne vers vous, vous regarde et fait signe quand vous arrivez ; à plus de LOIN, il n'est dessiné à
      // aucun palier (main.js : ombrePerso), il n'y a rien à animer
      const d = Math.hypot(p.pos.x - ego.x, p.pos.z - ego.z), pres = d < 12;
      if (d > LOIN) continue;
      p.h = pres ? Math.atan2(ego.x - p.pos.x, ego.z - p.pos.z) : f.l.h;
      p.salut = pres; p.regard = pres ? VISAGE.set(ego.x, auVolant ? 2.4 : 1.6, ego.z) : null;
      p.sync(dt, t);
    }
  }
  // les piles posées devant lui, une par voyage : il va devant, la soulève, la porte jusqu'à sa porte et rentre ; entre
  // deux piles, il ressort ; à la dernière, il reste dedans
  ranger(f) {
    const p = f.p, G = f.gestes, piles = this.c.mission.deposes.filter(x => x.userData.client === f.id && x.visible);
    f.etat = 'range'; p.salut = false; p.regard = null;
    const etapes = [];
    piles.forEach((pile, i) => {
      if (i > 0) etapes.push(...G.sortir(f.porte, DEDANS));
      // devant la pile, du côté de la boutique, tourné vers elle
      const devant = () => {
        const dx = f.porte.x - pile.position.x, dz = f.porte.z - pile.position.z, d = Math.hypot(dx, dz) || 1;
        V.set(pile.position.x + dx / d * 0.6, 0, pile.position.z + dz / d * 0.6);
        return V;
      };
      etapes.push(...G.allerA(devant, () => Math.atan2(pile.position.x - V.x, pile.position.z - V.z)));
      etapes.push(G.prendre(w => w.copy(pile.position), pile.userData.n, () => { pile.visible = false; }));
      etapes.push(...G.entrer(f.porte));
    });
    if (!piles.length) etapes.push(...G.entrer(f.porte));
    G.lancer(etapes, () => { f.etat = 'dedans'; });
  }
  // Les heures d'ouverture : à la fermeture, s'il est dehors sans rien faire (ou debout à côté, son travail fini : un geste
  // fini, état range) et sans affaire en cours, il rentre (par son chemin, f.chemin : des points de passage jusqu'à sa
  // porte) ; à l'ouverture, rentré pour la nuit, il ressort et retourne à sa place (f.l). vite : sans le voir faire (loin
  // de vous, ou au réveil). Rend vrai s'il vient de changer d'état (rien d'autre à faire pour lui à cette image).
  horaires(f, minutes, ego, vite) {
    const m = this.c.mission, p = f.p, ouv = ouvert(minutes, m.horaire ? m.horaire(f.id) : 'commerce');
    const loin = vite || Math.hypot(p.pos.x - ego.x, p.pos.z - ego.z) > VU, G = f.gestes;
    const libre = f.etat === 'dehors' || (f.etat === 'range' && !G.actif && !p.assis);
    // (les points de passage, marchés sans se retourner)
    const passer = pts => pts.flatMap(q => G.allerA(() => q, () => p.h));
    // (son affaire faite, il range ses cartons et rentre de lui-même : ranger)
    if (!ouv && libre && !(p.sautT > 0) && !(m.occupe && m.occupe(f.id)) && !m.fait(m.arretDe(f.id))) {
      f.ferme = true; p.salut = false; p.regard = null;
      if (loin) { G.g = null; f.etat = 'dedans'; p.m.groupe.visible = false; return true; }
      f.etat = 'range';
      G.lancer([...passer(f.chemin || []), ...G.entrer(f.porte)], () => { f.etat = 'dedans'; });
      return true;
    }
    if (ouv && f.ferme && f.etat === 'dedans') {
      f.ferme = false;
      if (!(m.veut ? m.veut(f.id) : !m.fait(m.arretDe(f.id)))) return true; // (rien à faire dehors : il reste chez lui)
      f.t = 0;
      if (loin) { p.placer(f.l.x, f.l.z, f.l.h); p.m.groupe.visible = true; f.etat = 'dehors'; return true; }
      f.etat = 'range';
      G.lancer([...G.sortir(f.porte, 0.3), ...passer([...(f.chemin || [])].reverse()), ...G.allerA(() => f.l, () => f.l.h)], () => { f.etat = 'dehors'; });
      return true;
    }
    return false;
  }
  // au réveil (main.js : dormir, derrière le fondu au noir) : chacun où il doit être à cette heure, sans le voir faire
  reveil() {
    const min = this.c.jeu.minutes;
    for (const f of this.liste) {
      if (!f.porte) continue;
      // (il rentrait chez lui quand on s'est endormi : il est rentré)
      if (f.ferme && f.etat === 'range') { f.gestes.g = null; f.etat = 'dedans'; f.p.m.groupe.visible = false; }
      this.horaires(f, min, f.p.pos, true);
    }
  }
  // une partie reprise (sauvegarde.js) : ceux dont l'affaire est faite sont déjà rentrés chez eux
  reprendre() {
    const m = this.c.mission;
    for (const f of this.liste) if (f.porte && m.fait(m.arretDe(f.id))) { f.etat = 'dedans'; f.p.m.groupe.visible = false; }
  }
  // le client est-il dehors, à sa place (ombre de contact, servir un verre) ?
  dehors(f) { return f.p.m.groupe.visible; }
}
