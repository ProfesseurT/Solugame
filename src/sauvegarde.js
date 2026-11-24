// La sauvegarde, dans le navigateur (localStorage, sur cet appareil ; en navigation privée, rien n'est gardé et le jeu
// marche quand même). Deux choses :
// - les missions gagnées (on peut les rejouer depuis le téléphone : app Missions) ;
// - la partie en cours, enregistrée toute seule à des moments sûrs (main.js : sauver ; rien en train de se jouer : ni
//   geste, ni chargement, ni livraison, ni appel), reprise à l'accueil par « Continuer » : ce qui a été fait est gardé
//   (mission.js et mission2.js : instantane, reprendre), on reprend au domaine.
// Rejouer une mission recharge la page (tout repart de zéro, sans rien oublier de remettre) et la lance aussitôt (aLancer).
const CLE = 'tournee-generale-partie', LANCER = 'tournee-generale-lancer', V = 1;

const lire = () => {
  try { const o = JSON.parse(localStorage.getItem(CLE)); if (o && o.v === V) return o; } catch (_) { /* illisible, ou interdit */ }
  return { v: V, gagnees: {}, partie: null };
};
const ecrire = o => { try { localStorage.setItem(CLE, JSON.stringify(o)); } catch (_) { /* navigation privée, ou plein */ } };

export const SAUVE = {
  // missions gagnées : { tournee: true, traitement: true }
  get gagnees() { return lire().gagnees; },
  gagner(id) { const o = lire(); if (!o.gagnees[id]) { o.gagnees[id] = true; ecrire(o); } },
  // la partie en cours : { mission: 'tournee' | 'traitement', minutes, ventes, heros, etat, quand } ou null
  get partie() { return lire().partie; },
  enregistrer(p) { if (this.fige) return; const o = lire(); o.partie = p; ecrire(o); },
  effacerPartie() { const o = lire(); o.partie = null; ecrire(o); },
  // rejouer une mission (gagnée) : la partie en cours est remplacée ; la page se recharge et la lance
  rejouer(id) {
    this.effacerPartie(); this.fige = true; // plus rien ne s'enregistre d'ici le rechargement (pagehide)
    try { sessionStorage.setItem(LANCER, id); } catch (_) { /* tant pis : l'accueil s'affichera */ }
    location.reload();
  },
  // au chargement de la page : une mission à lancer tout de suite (rejouée depuis le téléphone), ou null
  aLancer() {
    try { const id = sessionStorage.getItem(LANCER); sessionStorage.removeItem(LANCER); return id; } catch (_) { return null; }
  },
};
