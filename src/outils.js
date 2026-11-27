// Petits outils partagés : angles, tirage au sort reproductible, bruit, bornes et transitions, couleurs, montants, page ;
// le temps du jeu : la date d'un jour de jeu (dateJeu), les heures d'ouverture des professionnels (HORAIRES, ouvert), les
// appels du bureau (appelPossible).
import * as THREE from 'three';

export const angle = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const versAngle = (a, b, pas) => { const d = angle(b - a); return Math.abs(d) <= pas ? b : a + Math.sign(d) * pas; };
// Tirage au sort reproductible (mulberry32) : même graine, mêmes tirages, donc même monde et mêmes tenues à chaque partie.
export function hasard(s) {
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const borne = (x, a, b) => (x < a ? a : x > b ? b : x);
// Hachage d'un point de la grille (entre 0 et 1) ; bruit de valeur lissé, entre 0 et 1, d'une maille de 1 : le relief
// des collines (monde.js), les bosses sous les roues (vehicules.js). Toujours le même pour un même point.
export const hache = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
export function bruit(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hache(i, j) + (hache(i + 1, j) - hache(i, j)) * u;
  const b = hache(i, j + 1) + (hache(i + 1, j + 1) - hache(i, j + 1)) * u;
  return a + (b - a) * v;
}
export const mix = (a, b, t) => a + (b - a) * t;
// transition douce de 0 à 1 quand t va de 0 à 1 (bornée) ; entre(a, b, x) : la même, quand x va de a à b
export const lisse = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const entre = (a, b, x) => lisse((x - a) / (b - a));
// lissage exponentiel indépendant de la cadence : part du chemin faite en dt secondes, à la raideur k
export const amortir = (dt, k) => 1 - Math.exp(-dt * k);
// couleur assombrie (k < 1) ou éclaircie (k > 1)
export const assombrir = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
// un montant en euros, à la française : 1 234,50 €
export const eur = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
// la page : un élément par son id ; un texte sûr dans du HTML
export const $ = id => document.getElementById(id);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// la première lettre en capitale (« mercredi 9 décembre » en tête de phrase)
export const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------------------------------------------------------------- le temps du jeu
   jeu.minutes (main.js) compte les minutes depuis le jour 0 à minuit ; une minute de jeu passe toutes les 2 s. Le jour 0
   est le mardi 8 décembre 2026, le soir de la tournée de Noël (choisi avant le 10 : la DRM de novembre se valide dans CIEL
   avant le 10 décembre) ; chaque nuit dormie fait passer au jour suivant, et les dates affichées suivent (dateJeu).
   Les professionnels ne travaillent pas la nuit (Teddy, 26/11/2026 : « les pros qui attendent dehors comme des bouffons
   la nuit, ça n'existe pas ») : leurs heures d'ouverture sont ici, une seule source pour tout le jeu (ouvert). On se
   réveille à 7 h (main.js : dormir) : personne n'ouvre plus tard. Le bureau appelle les clients de 8 h à 20 h
   (appelPossible). */
export const jourDe = minutes => Math.floor(minutes / 1440);
export const heureDe = minutes => ((minutes % 1440) + 1440) % 1440; // les minutes depuis minuit
const JOUR0 = Date.UTC(2026, 11, 8);
const SEMAINE = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const deux = n => String(n).padStart(2, '0');
// La date du jour de jeu j (0 : le mardi 8 décembre 2026), selon la forme : 'longue' (« mercredi 9 décembre »), 'courte'
// (« 9 décembre »), 'semaine' (« mercredi »), 'chiffres' (« 09/12/2026 », les factures de Vitisoft), 'tuile' ({ jour,
// n, mois } : la tuile de la date du tableau de bord de Vitisoft). Le Registre phyto n'affiche jamais l'année (CLAUDE.md) :
// il prend la forme courte.
export function dateJeu(j, forme = 'longue') {
  const d = new Date(JOUR0 + j * 864e5), s = SEMAINE[d.getUTCDay()], n = d.getUTCDate(), m = MOIS[d.getUTCMonth()];
  if (forme === 'courte') return `${n} ${m}`;
  if (forme === 'semaine') return s;
  if (forme === 'chiffres') return `${deux(n)}/${deux(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  if (forme === 'tuile') return { jour: s, n: deux(n), mois: m };
  return `${s} ${n} ${m}`;
}
// Les heures d'ouverture, en minutes depuis minuit [ouverture, fermeture[, par métier :
// - commerce : l'épicerie, la cave, le bar du bourg (les clients de la tournée) ;
// - restaurant : La Treille, l'Auberge du Moulin ; à 19 h 30, le service du soir commence : ni livraison, ni dégustation ;
// - labo : le laboratoire d'œnologie (Hélène), qui ferme plus tôt, à 18 h 30 ;
// - imprimerie : l'imprimerie Saint-Vincent (Julien, sa ligne d'habillage) ;
// - domaine : Marc, le salarié du domaine.
// Fermé, un professionnel rentre chez lui une fois l'affaire en cours finie (clients.js) ; ce qui a besoin de lui attend
// le matin (mission.js, mission3.js).
export const HORAIRES = {
  commerce: [7 * 60, 19 * 60 + 30],
  restaurant: [7 * 60, 19 * 60 + 30],
  // les restaurateurs du coin (restaurateurs.js), devant leur porte : à partir de 9 h, avant c'est la mise en place
  tenancier: [9 * 60, 19 * 60 + 30],
  labo: [7 * 60, 18 * 60 + 30],
  imprimerie: [7 * 60, 19 * 60 + 30],
  domaine: [7 * 60, 19 * 60 + 30],
  // les bureaux de Solumatic (solumatic.js : les horaires de chacun) : de l'arrivée de Romane, la première, au départ du
  // dernier ; fermés le samedi et le dimanche
  solumatic: [7 * 60 + 40, 18 * 60 + 45],
};
// les appels du bureau aux clients (téléphone : Ma journée, les rappels), de 8 h à 20 h
export const APPELS = [8 * 60, 20 * 60];
// le professionnel de ce métier est-il ouvert à cette heure du jeu ? (genre : une clé de HORAIRES ; commerce par défaut)
export const ouvert = (minutes, genre = 'commerce') => { const [a, b] = HORAIRES[genre] || HORAIRES.commerce, h = heureDe(minutes); return h >= a && h < b; };
// peut-on appeler un client à cette heure du jeu ?
export const appelPossible = minutes => { const h = heureDe(minutes); return h >= APPELS[0] && h < APPELS[1]; };
// les minutes d'ouverture d'un métier entre deux heures du jeu (l'habillage, à l'imprimerie : la ligne ne tourne qu'aux
// heures d'ouverture)
export function minutesOuvertes(de, a, genre) {
  const [o, f] = HORAIRES[genre] || HORAIRES.commerce;
  let n = 0;
  for (let j = jourDe(de); j <= jourDe(a); j++) n += Math.max(0, Math.min(a, j * 1440 + f) - Math.max(de, j * 1440 + o));
  return n;
}
