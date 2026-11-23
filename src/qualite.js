// Paliers de qualité, choisis tout seuls : une première estimation (écran tactile ou non), puis la mesure du coût réel
// d'une image pendant l'accueil (rendu synchronisé), puis une résolution qui s'adapte en continu.
// ?qualite=faible|moyen|haut force un palier (essais).
import * as THREE from 'three';
import { UNI, BRUIT, CAILLOUX } from './modeles.js';
import { SOLEIL } from './monde.js';

export const QUALITES = {
  // téléphone modeste : pas de carte d'ombre (ombres de contact à la place), herbe proche et clairsemée
  faible: { nom: 'faible', ratioMax: 1.25, ratioMin: 0.6, ombres: null, ombreTaille: 0, boite: 0, ombrePas: 0, herbe: 36, herbeN: 0.5, vigne: 20, parcelle: 45, brume: [55, 260], loin: 90, tache: 0.62, aniso: 1 },
  // téléphone moyen : ombres 1024 filtrées à 4 lectures, recalculées une image sur deux
  moyen: { nom: 'moyen', ratioMax: 1.6, ratioMin: 0.75, ombres: 'pcf', ombreTaille: 1024, boite: 72, ombrePas: 2, herbe: 58, herbeN: 0.85, vigne: 55, parcelle: 75, brume: [60, 290], loin: 130, tache: 0.45, aniso: 2 },
  // ordinateur ou téléphone puissant : ombres 2048 à chaque image (douces sur ordinateur), herbe jusqu'à 95 m
  haut: { nom: 'haut', ratioMax: 2, ratioMin: 1, ombres: 'soft', ombreTaille: 2048, boite: 96, ombrePas: 1, herbe: 95, herbeN: 1, vigne: 95, parcelle: 120, brume: [75, 350], loin: 200, tache: 0.36, aniso: 4 },
};
const ORDRE_Q = ['faible', 'moyen', 'haut'];

export class Paliers {
  // c : { renderer, scene, camera, monde, tactile, mesures, redimensionner(), regler(q) : réglages propres au jeu (main.js) }
  constructor(c) {
    this.c = c;
    this.dpr = window.devicePixelRatio || 1;
    this.forcee = QUALITES[new URLSearchParams(location.search).get('qualite')] || null;
    const modeste = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
    this.q = this.forcee || (c.tactile ? (modeste ? QUALITES.faible : QUALITES.moyen) : QUALITES.haut);
    this.ratio = Math.min(this.dpr, this.q.ratioMax); this.ratioMaxEff = this.ratio;
    c.renderer.setPixelRatio(this.ratio);
    this.pret = false; this.nCompil = 0;
    // sonde : coût réel d'une image, mesuré pendant l'accueil ; dyn : résolution adaptative ensuite
    this.sonde = { n: 0, v: [], tours: 0, finie: !!this.forcee };
    this.dyn = { n: 0, bon: 0, essai: 0, bloque: 0, lent: 0 };
    this.px = new Uint8Array(4);
  }

  appliquer(q) {
    this.q = q;
    const { renderer, scene, monde, tactile } = this.c, S = monde.soleil, sm = renderer.shadowMap;
    const avant = sm.enabled ? sm.type : -1;
    sm.enabled = !!q.ombres;
    // ombres douces à 16 lectures sur ordinateur seulement ; sur téléphone, « haut » garde le filtre à 4 lectures du
    // palier moyen : moins de calcul par pixel, et pas de recompilation de tous les shaders quand la sonde monte d'un palier
    sm.type = q.ombres === 'soft' && !tactile ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    S.castShadow = !!q.ombres;
    if (q.ombres) {
      if (S.shadow.mapSize.x !== q.ombreTaille) { S.shadow.mapSize.set(q.ombreTaille, q.ombreTaille); if (S.shadow.map) { S.shadow.map.dispose(); S.shadow.map = null; } }
      // Soleil bas : un cadre carré dans le repère de la lumière couvrirait une bande de sol 2,4 fois plus
      // longue dans l'axe du soleil. On le resserre en hauteur : emprise au sol à peu près carrée,
      // texels plus fins et moins d'objets à dessiner dans la carte d'ombre.
      const c = S.shadow.camera, b = q.boite / 2, bh = b * SOLEIL.y + 3;
      c.left = -b; c.right = b; c.top = bh; c.bottom = -bh; c.updateProjectionMatrix();
      sm.needsUpdate = true;
    }
    if (avant !== (sm.enabled ? sm.type : -1)) {
      scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
      this.compiler();
    }
    scene.fog.near = q.brume[0]; scene.fog.far = q.brume[1];
    UNI.uLoin.value = q.loin;
    // filtrage anisotrope du bruit des matières (sol vu de biais) : jusqu'à 4 lectures de plus par texture, réservé aux appareils puissants
    for (const t of [BRUIT, CAILLOUX]) if (t.anisotropy !== q.aniso) { t.anisotropy = q.aniso; t.needsUpdate = true; }
    monde.regler(q);
    this.c.regler(q);
    this.ratioMaxEff = Math.min(this.dpr, q.ratioMax);
    if (this.ratio > this.ratioMaxEff) this.changerRatio(this.ratioMaxEff);
  }
  // Compilation des shaders en tâche de fond (KHR_parallel_shader_compile) : l'accueil s'affiche tout de suite
  // et la page ne gèle pas ; l'image 3D apparaît quand tout est prêt (et après un changement de palier).
  compiler() {
    const n = ++this.nCompil, m = this.c.mesures;
    this.pret = false;
    const fin = () => { if (n === this.nCompil) { this.pret = true; if (!m.pret) m.pret = Math.round(performance.now()); } };
    this.c.renderer.compileAsync(this.c.scene, this.c.camera).then(fin, fin);
    // filet de sécurité : sur certains appareils la compilation en tâche de fond ne signale jamais sa fin
    setTimeout(fin, 2500);
  }
  changerRatio(r) {
    r = Math.round(r * 100) / 100;
    if (r === this.ratio) return;
    this.ratio = r; this.c.renderer.setPixelRatio(r); this.c.redimensionner();
  }
  // attend que la carte graphique ait tout dessiné (lecture d'un pixel)
  attendreGPU() { const gl = this.c.renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.px); }
  // coût réel d'une image : rendu, plus l'attente de la carte graphique
  mesurer(rendre) {
    this.attendreGPU(); // vide la file de la carte graphique
    const t = performance.now();
    rendre();
    this.attendreGPU();
    return performance.now() - t;
  }
  // la sonde, pendant l'accueil : vise environ 12 ms par image ; monte d'un palier s'il reste beaucoup de marge,
  // descend si c'est trop lourd, sinon règle la résolution
  sonder(rendre) {
    const s = this.sonde, q = this.q;
    s.v.push(this.mesurer(rendre));
    if (s.v.length < 16) return;
    const v = s.v.sort((a, b) => a - b), ms = v[v.length >> 1], i = ORDRE_Q.indexOf(q.nom);
    s.v = []; s.n = 0; s.tours++;
    this.c.mesures.sonde = (this.c.mesures.sonde || '') + q.nom + ' ' + ms.toFixed(1) + ' ms ; ';
    let cible = q;
    if (ms < (q.nom === 'faible' ? 5 : 6.5) && i < 2 && s.tours < 3) cible = QUALITES[ORDRE_Q[i + 1]];
    else if (ms > (q.nom === 'haut' ? 15 : 22) && i > 0) cible = QUALITES[ORDRE_Q[i - 1]];
    else this.changerRatio(Math.max(q.ratioMin, Math.min(this.ratioMaxEff, this.ratio * Math.sqrt(12 / Math.max(ms, 1)))));
    if (cible !== q) { this.appliquer(cible); if (s.tours < 4) return; }
    s.finie = true;
  }
  // Résolution adaptative. Toutes les 2 s, on mesure le vrai coût d'une image (calcul + rendu + attente de la
  // carte graphique). On ne se fie pas à l'intervalle entre deux images : un téléphone en économie d'énergie
  // bride l'affichage à 30 images/s sans que le jeu soit trop lourd, et la qualité tombait au minimum.
  adapter(cout) {
    const d = this.dyn, q = this.q;
    if (this.forcee || !this.sonde.finie) return;
    this.c.mesures.dernier = Math.round(cout * 10) / 10;
    d.bloque = Math.max(0, d.bloque - 1);
    if (cout > 20) {
      d.bon = 0;
      if (d.essai > 0) { d.bloque = 15; d.essai = 0; } // la dernière hausse était de trop : on n'y revient pas tout de suite
      if (this.ratio > q.ratioMin + 0.01) this.changerRatio(Math.max(q.ratioMin, this.ratio * 0.87));
      else if (++d.lent >= 3 && q !== QUALITES.faible) { d.lent = 0; this.appliquer(QUALITES[ORDRE_Q[ORDRE_Q.indexOf(q.nom) - 1]]); }
    } else {
      d.lent = 0;
      d.essai = Math.max(0, d.essai - 1);
      if (cout < 12) { if (++d.bon >= 2 && d.bloque <= 0 && this.ratio < this.ratioMaxEff - 0.01) { this.changerRatio(Math.min(this.ratioMaxEff, this.ratio * 1.1)); d.bon = 0; d.essai = 2; } }
      else d.bon = 0;
    }
  }
  // dessine une image du jeu : les premières compilent les shaders, puis la sonde mesure, ensuite la résolution s'adapte
  // (une image mesurée toutes les 120). tDebut : début du calcul de l'image (pour compter le calcul avec le rendu)
  rendreImage(rendre, tDebut) {
    if (!this.sonde.finie && ++this.sonde.n > 24) this.sonder(rendre);
    else if (this.sonde.finie && !this.forcee && ++this.dyn.n >= 120) { this.dyn.n = 0; const calc = performance.now() - tDebut; this.adapter(calc + this.mesurer(rendre)); }
    else rendre();
  }
  // impose un palier (essais) : coupe la sonde et la résolution adaptative
  forcer(nom) {
    this.forcee = QUALITES[nom]; this.sonde.finie = true;
    this.appliquer(this.forcee); this.changerRatio(Math.min(this.dpr, this.forcee.ratioMax));
  }
}
