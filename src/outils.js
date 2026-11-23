// Petits outils partagés : angles, tirage au sort reproductible, bornes et transitions, couleurs, montants, page.
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
