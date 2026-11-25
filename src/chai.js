// Le chai côté jeu : la grande porte (ouverte quand on vient charger, ou qu'on s'en approche), la halle dessinée
// seulement de près, la caméra posée au fond de la halle quand on y est ; le chargement (les vantaux s'ouvrent, le
// véhicule entre tout seul jusqu'à la palette, on charge dedans, il ressort en marche arrière dans la cour, le nez vers le
// chemin du domaine). La halle est dans monde.js (chaiEtBureau), les gestes dans gestes.js (rouler, charger).
import { lisse } from './outils.js';
import { DIALOGUES } from './textes.js';

// déjà sur le seuil ou dedans : droit vers la palette, sans repasser par la porte (une courbe de Bézier, puis tout droit)
function cheminEntree(x0, z0, h0, D) {
  const P3 = x0 < -78.3 ? [-77.8, D.z] : [D.x, D.z], c = Math.max(1, Math.hypot(P3[0] - x0, P3[1] - z0) * 0.45);
  const P1 = [x0 + Math.sin(h0) * c, z0 + Math.cos(h0) * c], P2 = [P3[0] - c, P3[1]], pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, d = 3 * (1 - t) * t * t, e = t ** 3;
    pts.push([a * x0 + b * P1[0] + d * P2[0] + e * P3[0], a * z0 + b * P1[1] + d * P2[1] + e * P3[1]]);
  }
  for (let x = P3[0] + 0.5; x < D.x; x += 0.5) pts.push([x, D.z]);
  pts.push([D.x, D.z]);
  return pts;
}
// tout droit hors de la porte, puis en arc ; finit au départ de la tournée (lieux.route0)
function cheminSortie(D) {
  const pts = [];
  for (let x = D.x; x > -79.6; x -= 0.5) pts.push([x, D.z]);
  for (let i = 0; i <= 20; i++) { const f = i / 20 * 2.2; pts.push([-79.6 - 4 * Math.sin(f), D.z - 4 * (1 - Math.cos(f))]); }
  return pts;
}

export class Chai {
  // c : { jeu, monde, mission, gestes, cam, hud, tactile, conduite : { couperMoteur(), auVolant(v), aPied() },
  // aCharger() : la mission en cours attend qu'on vienne charger (main.js) }
  constructor(c) {
    this.c = c;
    this.auChai = false;   // le chargement se joue (le véhicule entre, on charge, il ressort)
    this.dansChai = false; // dans la halle, ou sur son seuil : la caméra est posée au fond de la halle
    this.accelerVu = false;
  }
  // devant la grande porte, dans son axe, ou déjà dedans (mission.js : le chargement commence)
  devant(o) { return this.dansChai || (o.x > -84 && o.x < -64.3 && Math.abs(o.z + 52) < 3); }

  // Le chargement : piles de la palette ; place(c, pile) : rangée dans la colonne c ; fin() : ressorti dans la cour
  charger(piles, place, fin) {
    const { jeu, gestes, cam, hud, tactile, conduite } = this.c, v = jeu.veh, p = v.p, D = jeu.lieux.chaiDedans;
    const x0 = p.pos.x, z0 = p.pos.z, h0 = p.h;
    if (!this.accelerVu) { this.accelerVu = true; hud.dire(DIALOGUES.accelerer(tactile)); }
    this.auChai = true; cam.pret = false;
    const entree = cheminEntree(x0, z0, h0, D);
    p.pos.set(D.x, 0, D.z); p.h = D.h; // les gestes se calculent le véhicule à sa place, dans le chai
    gestes.charger(v, piles, { sorti: conduite.aPied, place, installe: () => conduite.auVolant(v) },
      [gestes.rouler(v, entree, 4.4), { action: conduite.couperMoteur }],
      [gestes.rouler(v, cheminSortie(D), 5.4, true), { action: () => { this.auChai = false; cam.pret = false; cam.yaw = p.h; fin(); } }]);
    p.pos.set(x0, 0, z0); p.h = h0;
  }

  // À chaque image : la grande porte s'ouvre ou se ferme, la halle n'est dessinée que de près ; on bascule dans la halle
  // ou dehors (ego : le joueur ou son véhicule, cap : son cap ; position : celle de la caméra)
  maj(dt, ego, cap, position) {
    const { jeu, monde, cam } = this.c, PC = monde.porteChai;
    const charge = this.c.aCharger(); // on vient charger (la mission en cours : main.js)
    // (ouverte aussi quand Marc rentre les palox au transpalette, fin de la mission 3 : c.ouverte)
    const ouvrir = this.auChai || this.dansChai || (charge && jeu.distance(jeu.lieux.chai) < 30) || Math.hypot(ego.x + 76, ego.z + 52) < 7 || !!(this.c.ouverte && this.c.ouverte());
    PC.k += ((ouvrir ? 1 : 0) - PC.k) * Math.min(1, dt * 1.6);
    const a = 1.7 * lisse(PC.k); PC.a.rotation.y = -a; PC.b.rotation.y = a;
    PC.col.fantome = PC.k > 0.5; // ouverte, elle n'arrête personne, mais compte toujours pour la caméra du dehors (le linteau)
    const cx = position.x, cz = position.z, dedansC = cx > -76 && cx < -64 && cz > -59.6 && cz < -39;
    monde.halleChai.visible = this.auChai || dedansC || (PC.k > 0.02 && (cx + 70) * (cx + 70) + (cz + 49) * (cz + 49) < 2500);
    if (this.auChai) return;
    // Dedans ou sur le seuil, la caméra est au fond de la halle (la caméra qui suit buterait sur les murs et monterait dans
    // le toit). On passe de l'une à l'autre d'un coup, sans travelling à travers le mur ; il faut être bien entré pour
    // basculer dedans, bien sorti pour revenir dehors (pas de va-et-vient sur le seuil). En sortant le nez dehors, la
    // caméra qui suit serait collée au mur : on garde celle de la halle quelques mètres de plus.
    const x = ego.x, z = ego.z, sortant = Math.sin(cap) < -0.3;
    const seuil = this.dansChai ? (sortant ? (jeu.auVolant ? -82.5 : -80) : -78.6) : -76.4, large = this.dansChai ? 4 : 2.6;
    const dans = z > -59.3 && z < -39.3 && x < -64.3 && (x > -75.6 || (x > seuil && Math.abs(z + 52) < large));
    if (dans !== this.dansChai) { this.dansChai = dans; cam.pret = false; if (!dans) cam.yaw = cap; }
  }
  // La caméra de la halle, posée au fond, qui regarde vers la porte (dehors, le véhicule est derrière le mur) ; les
  // commandes suivent son axe. Rend vrai si elle est posée.
  camera(dt, ego) {
    if (!this.auChai && !this.dansChai) return false;
    const { jeu, cam } = this.c, S = jeu.lieux.chaiSalle;
    cam.salle(dt, S, Math.max(ego.x, -73.5), ego.z, false);
    cam.yaw = Math.atan2(S.centre.x - S.camera.x, S.centre.z - S.camera.z);
    return true;
  }
}
