// Le parvis du chai, qui vit (Teddy, 24/11/2026 : « des artefacts viticoles, réalistes ; il faut que ça vive »). Le matériel
// est posé dans le décor (monde.js : le chantier des barriques, le poste de rinçage, la remorque plateau, les palettes, les
// palox, le pressoir) ; ici, ce qui bouge :
// - le rinceur balaie à la lance du nettoyeur haute pression la barrique couchée sur son berceau : le jet, les éclaboussures
//   là où il touche (la barrique, ou le sol quand il passe à côté), la brume, les gouttes, le bruit ; il baisse la lance
//   quand on passe tout près, et de temps en temps pour souffler ;
// - la porteuse range les caisses de vendange de la remorque sur les palettes, une à une (chaque caisse est une instance :
//   leur nombre se conserve) ; la remorque vide, elle souffle ; on ne la recharge que quand personne ne regarde ;
// - le chien du domaine, couché près du bureau, lève la tête et suit du regard qui approche, remue la queue ; la nuit, il
//   dort ;
// - des moineaux picorent le gravier et s'envolent sur la remorque, le muret, les barriques ou le bord du toit quand on
//   approche, puis reviennent ;
// - en hiver, la cheminée de la maison fume.
// Les deux ouvriers travaillent de 7 h 30 à 18 h 30 : ils n'arrivent et ne partent que hors de la vue. La nuit, les moineaux
// dorment. Rien n'est calculé quand la caméra est loin.
import * as THREE from 'three';
import { B, C, S, fusion, MAT } from './modeles.js';
import { perso } from './perso.js';
import { Pieton } from './pieton.js';
import { son } from './audio.js';
import { PARVIS } from './textes.js';
import { hasard, angle, versAngle, borne, lisse } from './outils.js';

const rnd = hasard(83);
const LIBRE = { resoudre: () => false, rangs: () => false }; // les ouvriers suivent des chemins dégagés
// la barrique sur son berceau (axe x) ; le rinceur, face à elle ; où vont ses mains, lance pointée ou baissée
const BAR = { x0: -80.075, x1: -79.125, y: 0.64, z: -44.6, r: 0.33 };
const SPOTS = [[-80.05, -46.45], [-79.15, -46.45]]; // le rinceur change de côté de temps en temps
const MAT_JET = new THREE.MeshBasicMaterial({ color: '#e8f5ff', transparent: true, opacity: 0.5, depthWrite: false });
// (la lance en travers du corps, la main droite à la hanche, la gauche devant : il se tourne un peu à droite pour viser)
const MAINS = { d: [-0.15, 1.04, 0.1], g: [-0.01, 0.97, 0.33] }, MAINS_BAS = { d: [-0.16, 0.96, 0.06], g: [-0.07, 0.8, 0.26] }, VISEE = -0.42;
// la remorque : 6 colonnes de 4 caisses face à la cour ; les palettes : 3 palettes de 2 colonnes de 4 (remplies l'une
// après l'autre). On les prend et on les pose à 60 cm devant soi, face au nord (+z).
const N = 24, REM = [], PAL = [], XP = [-80.69, -80.11, -79.39, -78.81, -78.09, -77.51];
for (let j = 0; j < N; j++) REM.push([-85.3 + (j % 6) * 0.6, 0.76 + Math.floor(j / 6) * 0.28, -36.2]);
for (let j = 0; j < N; j++) { const k = j % 8; PAL.push([XP[Math.floor(j / 8) * 2 + (k % 2)], 0.28 + Math.floor(k / 2) * 0.28, -35.7]); }
const Z_REM = -36.8, Z_PAL = -36.3, PORTE = [0, 0.95, 0.36];
// les moineaux : où ils picorent (deux bandes de gravier), où ils se posent quand on approche
const NIDS = [[-86, -38.6, -79.3, -37.6], [-81, -42.9, -78.6, -42.1]];
const PERCHES = [[-84.4, 0.79, -34.93], [-83.2, 0.79, -34.93], [-82.3, 0.79, -34.93], [-81.2, 1.11, -33.5], [-79.4, 1.11, -33.5], [-77.6, 1.11, -33.5],
  [-77, 1.43, -44.8], [-77, 1.43, -43.3], [-76.35, 6.25, -44.5], [-76.35, 6.25, -41.2]];
const CHEMINEE = [[-95.37, 13.95, -64], [-95.03, 13.95, -64]];
const NOIR = '#25211e', FEU = '#a8642f';

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q1 = new THREE.Quaternion(), e1 = new THREE.Euler(0, 0, 0, 'YXZ');
// chaque caisse un peu de travers (les piles ne sont jamais au cordeau)
const BIAIS = Array.from({ length: 2 * N }, () => (rnd() - 0.5) * 0.09);
const m1 = new THREE.Matrix4(), BOUT = new THREE.Vector3(0, 0, 1.05), AVANT = new THREE.Vector3(0, 0, 1);

// une caisse de vendange ajourée : le bac, deux rangées de jours sur les longs côtés, les poignées, le bord
const geoCaisse = () => fusion([B(0.56, 0.26, 0.38, '#5f7a62', 0, -0.01, 0), B(0.57, 0.035, 0.39, '#6f8b72', 0, 0.12, 0),
  B(0.48, 0.03, 0.386, '#3f5543', 0, -0.06, 0), B(0.48, 0.03, 0.386, '#3f5543', 0, 0.02, 0), B(0.566, 0.05, 0.12, '#3f5543', 0, 0.075, 0)]);
// la lance du nettoyeur, le long de +z depuis la main droite : la poignée-pistolet, le tube, la buse, le raccord du tuyau
const geoLance = () => fusion([B(0.04, 0.13, 0.05, '#2b2b30', 0, -0.06, 0.02), B(0.05, 0.05, 0.16, '#e0b12a', 0, 0, 0.06),
  B(0.022, 0.022, 0.86, '#9aa1a8', 0, 0, 0.56), B(0.04, 0.04, 0.07, '#2b2b30', 0, 0, 1.0), B(0.03, 0.03, 0.08, '#1e1e22', 0, -0.1, -0.03)]);

export class Parvis {
  // c : { scene, camera, emettre } (main.js). Construit au démarrage (les géométries sont finies avec la scène) ; les
  // ouvriers arrivent avec les autres habitants (peupler).
  constructor(c) {
    this.c = c; this.jour = 'tournee'; this.k = 6; this.porte = false; this.tFumee = 0; this.tObs = 0;
    const sc = c.scene;
    // les caisses : 24 places sur la remorque, 24 sur les palettes
    // (et une de plus, la caisse qu'on porte : dans le même appel de dessin)
    this.caisses = new THREE.InstancedMesh(geoCaisse(), MAT, 2 * N + 1);
    this.caisses.castShadow = true; this.caisses.receiveShadow = true; this.caisses.name = 'caisses';
    sc.add(this.caisses); this.ranger(); this.caisses.computeBoundingSphere(); // une fois : les caisses restent dans ces piles
    // la caisse portée : un repère dans les bras de la porteuse (les bras la tiennent, anim.js) ; la lance du rinceur
    this.portee = new THREE.Object3D(); this.portee.userData.demi = 0.28;
    this.lance = new THREE.Mesh(geoLance(), MAT); this.lance.rotation.order = 'YXZ'; this.lance.visible = false;
    sc.add(this.lance);
    // le jet d'eau : un filet clair de la buse jusqu'à ce qu'il touche, qui s'évase
    this.jet = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.005, 1, 6, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2), MAT_JET);
    this.jet.visible = false; this.jet.frustumCulled = false; this.jet.renderOrder = 3; sc.add(this.jet);
    this.chien = this.creerChien(sc);
    // les moineaux
    const geo = fusion([S(0.045, '#7b5a3c', 0, 0.06, 0, 1, 0.85, 1.6), S(0.03, '#5e4430', 0, 0.092, 0.06), B(0.012, 0.01, 0.026, '#3a3a3a', 0, 0.09, 0.095),
      B(0.035, 0.006, 0.07, '#4f3a28', 0, 0.07, -0.1), B(0.15, 0.006, 0.06, '#8a6a48', 0, 0.076, -0.005)]);
    this.oiseaux = new THREE.InstancedMesh(geo, MAT, 7);
    this.oiseaux.frustumCulled = false; this.oiseaux.name = 'moineaux';
    sc.add(this.oiseaux);
    this.vols = [];
    for (let i = 0; i < 7; i++) {
      const n = i < 4 ? 0 : 1, [x0, z0, x1, z1] = NIDS[n], x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
      this.vols.push({ n, x, y: 0.03, z, h: rnd() * 6.28, etat: 'sol', t: rnd(), tSaut: rnd() * 1.5, pic: 0, ax: x, ay: 0, az: z, bx: x, by: 0, bz: z, dur: 1, haut: 0 });
    }
    this.ouvriers = [];
  }

  // le chien, un beauceron couché en sphinx sur sa couverture, tourné vers la cour : le corps (pattes de devant allongées,
  // feu aux pattes et au poitrail), la tête (crâne, museau effilé, truffe, taches feu au-dessus des yeux, oreilles
  // dressées) et la queue sur leurs pivots. Trois maillages, sans ombre portée (sa tache de contact suffit).
  creerChien(sc) {
    const g = new THREE.Group(), patte = (x, z, sz = 1.4) => S(0.046, FEU, x, 0.036, z, 1, 0.7, sz);
    const corps = new THREE.Mesh(fusion([
      S(0.16, NOIR, 0, 0.2, -0.03, 1, 1.05, 2.45, 1), S(0.14, NOIR, 0, 0.25, 0.2, 1, 1.2, 1.15, 1), S(0.1, NOIR, 0, 0.34, 0.3, 1, 1.25, 1.1, 1),
      S(0.075, FEU, 0, 0.17, 0.33, 1.3, 1, 0.7), S(0.125, NOIR, -0.11, 0.15, -0.25, 0.9, 1.15, 1.45, 1), S(0.125, NOIR, 0.11, 0.15, -0.25, 0.9, 1.15, 1.45, 1),
      C(0.032, 0.042, 0.3, 6, FEU, -0.085, 0.05, 0.42, 'z'), C(0.032, 0.042, 0.3, 6, FEU, 0.085, 0.05, 0.42, 'z'),
      patte(-0.085, 0.6), patte(0.085, 0.6), patte(-0.2, -0.07, 1.7), patte(0.2, -0.07, 1.7),
    ]), MAT);
    const tete = new THREE.Group(); tete.position.set(0, 0.38, 0.34); tete.rotation.order = 'YXZ';
    tete.add(new THREE.Mesh(fusion([
      S(0.09, NOIR, 0, 0.06, 0.04, 1, 0.95, 1.12, 1), C(0.034, 0.052, 0.15, 6, NOIR, 0, 0.03, 0.16, 'z'), S(0.04, FEU, 0, 0.0, 0.16, 1.15, 0.7, 1.7),
      S(0.022, '#141414', 0, 0.045, 0.24, 1.1, 0.85, 0.8), B(0.026, 0.014, 0.012, FEU, -0.04, 0.1, 0.115), B(0.026, 0.014, 0.012, FEU, 0.04, 0.1, 0.115),
      B(0.02, 0.02, 0.012, '#141414', -0.043, 0.076, 0.122), B(0.02, 0.02, 0.012, '#141414', 0.043, 0.076, 0.122),
      C(0, 0.036, 0.11, 4, NOIR, -0.056, 0.17, 0.015), C(0, 0.036, 0.11, 4, NOIR, 0.056, 0.17, 0.015),
    ]), MAT));
    const queue = new THREE.Group(); queue.position.set(0, 0.22, -0.42); queue.rotation.order = 'YXZ';
    queue.add(new THREE.Mesh(fusion([C(0.035, 0.022, 0.32, 5, NOIR, 0, 0, -0.16, 'z'), S(0.026, FEU, 0, 0, -0.33, 1, 1, 1.6)]), MAT));
    g.add(corps, tete, queue);
    for (const o of [corps, tete.children[0], queue.children[0]]) o.receiveShadow = true;
    g.position.set(-77.3, 0, -63.4); g.rotation.y = -Math.PI / 2;
    sc.add(g);
    return { g, corps, tete, queue, h: -Math.PI / 2, ty: 0, tx: 0.4, tz: 0, queueA: 0, ph: 0, tPres: 0 };
  }

  // les deux ouvriers, en tenue de travail (leurs tenues sont fixées : elles ne changent rien aux autres)
  peupler(hud) {
    if (this.ouvriers.length) return;
    const sc = this.c.scene;
    const ri = new Pieton(perso({ peau: '#43291e', cheveux: '#17120f', nature: 'crepu', coiffure: 'rase', barbe: 'courte', tenue: 'salopette', haut: '#3d5a80', bas: '#3d5a80',
      bottes: true, chaussures: '#2f4a32', chapeau: 'bonnet', chapeauC: '#c8553d', lunettes: false }));
    const po = new Pieton(perso({ femme: true, peau: '#d29f78', cheveux: '#3f2a1c', nature: 'boucle', coiffure: 'queue', tenue: 'pull', haut: '#7a8f6a', bas: '#3a3f47',
      bottes: true, chaussures: '#3a3a3a', lunettes: false }));
    ri.placer(SPOTS[0][0], SPOTS[0][1], 0); po.placer(REM[N - this.k - 1][0], Z_REM, 0);
    for (const p of [ri, po]) { sc.add(p.m.groupe); p.etq = hud.etiquette('', 'bulle'); }
    // la lance dans la main droite du rinceur ; la caisse portée, à la taille réelle
    ri.m.groupe.add(this.lance); this.lance.scale.setScalar(1 / ri.m.echelle);
    po.m.groupe.add(this.portee); this.portee.scale.setScalar(1 / po.m.echelle);
    this.ri = { p: ri, nom: 'rinceur', mains: { d: [...MAINS.d], g: [...MAINS.g] }, ph: 0, pause: false, tPause: 9, spot: 0, tSpot: 14, nJet: 0, arret: false, tJet: 0, tSon: 0, tParle: 0, i: 0, present: true, impact: new THREE.Vector3() };
    this.po = { p: po, nom: 'porteuse', etat: 'vers', suite: 'prendre', cx: po.pos.x, cz: Z_REM, t: 0, voyages: 0, tParle: 0, i: 0, present: true };
    ri.outil = this.ri.mains; this.lance.visible = true; this.ri.impact.set(-79.6, BAR.y, BAR.z - BAR.r);
    this.aller(N - this.k - 1, true);
    this.ouvriers = [this.ri, this.po];
    this.hud = hud;
  }

  // les caisses à leur place : sur la remorque ce qui reste (moins celle qu'on porte), sur les palettes ce qui est rangé
  ranger() {
    const reste = N - this.k - (this.porte ? 1 : 0), im = this.caisses;
    // cachées : réduites à rien, mais à leur place (la sphère englobante reste serrée autour des piles)
    const poser = (i, P, vu) => { m1.makeRotationY(vu ? BIAIS[i] : 0); if (!vu) m1.scale(v1.set(0, 0, 0)); im.setMatrixAt(i, m1.setPosition(P[0], P[1], P[2])); };
    for (let i = 0; i < N; i++) { poser(i, REM[i], i < reste); poser(N + i, PAL[i], i < this.k); }
    if (!this.porte) poser(2 * N, PAL[0], false);
    im.instanceMatrix.clearUpdateRanges(); im.instanceMatrix.needsUpdate = true; this.plein = true; // tout le tampon part, cette image
  }
  // le lendemain de la tournée (mission 2) : ils en parlent, et du traitement ; le jour d'après (mission 3), de l'habillage
  lendemain(jour = 'traitement') { this.jour = jour; }

  // vu : (x, z) est devant la caméra, à moins de 45 m
  vu(x, z) {
    const cam = this.c.camera, dx = x - cam.position.x, dz = z - cam.position.z, d = Math.hypot(dx, dz);
    if (d > 45) return false;
    if (d < 6) return true;
    cam.getWorldDirection(v3);
    return (dx * v3.x + dz * v3.z) / d > 0.35;
  }

  // À chaque image. c : { t, minutes, ego (le joueur ou son véhicule), aPied, danger ({ x, z, v } du véhicule conduit, ou
  // null), pousser(pos, r) : hors des véhicules du joueur }
  maj(dt, c) {
    const cam = this.c.camera.position, m = ((c.minutes % 1440) + 1440) % 1440;
    this.plein = false;
    const loin = Math.abs(cam.x + 80) + Math.abs(cam.z + 45) > 110;
    // la cheminée de la maison fume (décembre)
    if (Math.abs(cam.x + 95) + Math.abs(cam.z + 64) < 220) {
      this.tFumee += dt;
      while (this.tFumee > 0.28) {
        this.tFumee -= 0.28;
        const [x, y, z] = CHEMINEE[rnd() < 0.5 ? 0 : 1];
        this.c.emettre(x, y, z, 0.18 + rnd() * 0.12, 0.5 + rnd() * 0.15, 0.04 + rnd() * 0.06, 5.5, rnd() < 0.5 ? 0x9e9a95 : 0xb7b3ad, 0.85, -0.05, 0.05);
      }
    }
    // les ouvriers : de 7 h 30 à 18 h 30 ; ils n'arrivent ni ne partent sous les yeux
    const present = m >= 450 && m < 1110;
    for (const o of this.ouvriers) {
      const p = o.p;
      if (o.present !== present && !this.vu(p.pos.x, p.pos.z)) {
        o.present = present; p.m.groupe.visible = present;
        if (o === this.po && this.porte) { this.porte = false; p.porte = null; this.ranger(); this.aller(N - this.k - 1, true); }
        if (o === this.ri && !present) this.jet.visible = false;
      }
    }
    // le chien et les moineaux ne sont dessinés (et animés) qu'à moins de 70 m : plus loin, quelques pixels
    const pres = !loin && Math.hypot(cam.x + 79, cam.z + 48) < 70;
    if (this.chien.g.visible !== pres) { this.chien.g.visible = pres; this.oiseaux.visible = pres; }
    if (loin) { this.jet.visible = false; return; }
    const jour = m > 430 && m < 1110;
    if (pres) { this.majChien(dt, c, jour); this.majOiseaux(dt, c, jour); }
    if (!this.ouvriers.length) return;
    if (this.ri.present) this.majRinceur(dt, c);
    if (this.po.present) this.majPorteuse(dt, c);
    for (const o of this.ouvriers) if (o.p.etq.vu) this.hud.placer(o.p.etq, o.p.pos.x, 2.25, o.p.pos.z, true);
  }

  // qui passe tout près, à pied, est salué (une fois de temps en temps) : un signe de la main, une phrase
  parler(o, c, d, dt) {
    o.tParle -= dt;
    if (!c.aPied || d > 3.4 || o.tParle > 0) return;
    o.tParle = 40;
    const l = PARVIS[o.nom][this.jour];
    o.p.saluer(); this.hud.bulle(o.p.etq, l[o.i++ % l.length], 3);
  }

  majRinceur(dt, c) {
    const o = this.ri, p = o.p, e = c.ego, d = Math.hypot(e.x - p.pos.x, e.z - p.pos.z), t = c.t;
    // on passe tout près : il baisse la lance et regarde ; de temps en temps, il souffle
    if (c.aPied && d < 3.2) o.arret = true; else if (!c.aPied || d > 4.4) o.arret = false;
    if ((o.tPause -= dt) <= 0) { o.pause = !o.pause; o.tPause = o.pause ? 2.5 + rnd() * 2.5 : 9 + rnd() * 12; }
    // sa place (il change de côté de temps en temps, lance baissée) ; poussé par un véhicule, il y revient
    const S0 = SPOTS[o.spot], rx = S0[0] - p.pos.x, rz = S0[1] - p.pos.z, ecart = Math.hypot(rx, rz), revient = ecart > 0.2;
    const jet = !o.arret && !o.pause && !revient;
    if (jet) { o.ph += dt * 0.85; if ((o.tSpot -= dt) <= 0) { o.spot ^= 1; o.tSpot = 12 + rnd() * 10; } }
    // il vise le milieu de la barrique (la lance part en travers : VISEE), et balaie
    const vise = Math.atan2(-79.6 - p.pos.x, BAR.z - p.pos.z);
    const cap = jet ? vise + VISEE + 0.22 * Math.sin(o.ph) + 0.05 * Math.sin(o.ph * 2.7) : vise * 0.6;
    if (!revient) p.h = versAngle(p.h, cap, dt * 1.6);
    // les mains suivent doucement : lance pointée, ou baissée
    const M = jet ? MAINS : MAINS_BAS, k = Math.min(1, dt * 4);
    for (const s of ['d', 'g']) for (let i = 0; i < 3; i++) o.mains[s][i] += (M[s][i] - o.mains[s][i]) * k;
    // la lance, de la main droite vers la gauche
    const [dx, dy, dz] = o.mains.d, [gx, gy, gz] = o.mains.g, lx = gx - dx, ly = gy - dy, lz = gz - dz, ll = Math.hypot(lx, ly, lz);
    this.lance.position.set(dx, dy - 0.02, dz);
    this.lance.rotation.set(Math.asin(-ly / ll), Math.atan2(lx, lz), 0);
    p.regard = o.arret && c.aPied ? v2.set(e.x, 1.6, e.z) : jet ? o.impact : null;
    p.update(dt, revient ? rx / ecart : 0, revient ? rz / ecart : 0, revient ? 1 : 0, false, LIBRE, t, revient ? Math.min(0.9, 0.3 + ecart * 1.5) : undefined);
    c.pousser(p.pos, 0.34);
    this.parler(o, c, d, dt);
    if (!jet) { this.jet.visible = false; return; }
    // le jet : de la buse, jusqu'à la barrique (cylindre d'axe x) ou au sol ; là, les éclaboussures et la brume
    this.lance.updateWorldMatrix(true, false);
    const B0 = v1.copy(BOUT).applyMatrix4(this.lance.matrixWorld), D = v3.copy(AVANT).transformDirection(this.lance.matrixWorld);
    const oy = B0.y - BAR.y, oz = B0.z - BAR.z, a = D.y * D.y + D.z * D.z, b = 2 * (oy * D.y + oz * D.z), cc = oy * oy + oz * oz - BAR.r * BAR.r, disc = b * b - 4 * a * cc;
    let l = -1, surBarrique = false; o.surB = (o.surB || 0) * 0.99;
    if (disc > 0) { const s = (-b - Math.sqrt(disc)) / (2 * a), x = B0.x + D.x * s; if (s > 0 && x > BAR.x0 && x < BAR.x1) { l = s; surBarrique = true; } }
    if (l < 0) l = D.y < -0.05 ? (B0.y - 0.03) / -D.y : 2;
    if (surBarrique) o.surB += 0.01;
    const I = o.impact.set(B0.x + D.x * l, B0.y + D.y * l, B0.z + D.z * l);
    const nx = 0, ny = surBarrique ? (I.y - BAR.y) / BAR.r : 1, nz = surBarrique ? (I.z - BAR.z) / BAR.r : 0;
    // le filet, de la buse à ce qu'il touche ; il frémit
    const J = this.jet, fr = 1 + 0.18 * Math.sin(t * 47) + 0.1 * Math.sin(t * 29);
    J.visible = true; J.position.copy(B0); J.lookAt(I); J.scale.set(fr, fr, l);
    const em = this.c.emettre, vie = Math.min(0.3, l / 9);
    o.tJet += dt;
    while (o.tJet > 0.02) {
      o.tJet -= 0.02;
      const sx = (rnd() - 0.5) * 0.3, sy = (rnd() - 0.5) * 0.3, sz = (rnd() - 0.5) * 0.3;
      if (++o.nJet % 3 === 0) em(B0.x, B0.y, B0.z, D.x * 9 + sx, D.y * 9 + sy, D.z * 9 + sz, vie, 0xdcefff, 0.12, 1, 0.03);
      // ça rejaillit : vers l'extérieur de ce qu'on touche, et un peu vers le rinceur
      for (let j = 0; j < 2; j++) {
        const f = 1.2 + rnd() * 1.6;
        em(I.x, I.y, I.z, nx * f - D.x * 0.8 + (rnd() - 0.5) * 1.6, ny * f + 0.6 + rnd() * 0.8, nz * f - D.z * 0.8 + (rnd() - 0.5) * 1.6, 0.4 + rnd() * 0.2, rnd() < 0.5 ? 0xcfe6f2 : 0xe6f2f8, 0.13, 9.8, 0.03);
      }
      if (rnd() < 0.16) em(I.x + (rnd() - 0.5) * 0.2, I.y, I.z + (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.25, 0.15 + rnd() * 0.2, (rnd() - 0.5) * 0.25, 0.9, 0xeef5f8, 0.26, -0.1, 0.03);
      // l'eau qui coule de la barrique, goutte à goutte
      if (rnd() < 0.18) em(BAR.x0 + 0.1 + rnd() * 0.75, BAR.y - BAR.r - 0.03, BAR.z + (rnd() - 0.5) * 0.1, 0, -0.3, 0, 0.35, 0xcfe6f2, 0.12, 9.8, 0.03);
    }
    if ((o.tSon -= dt) <= 0) { o.tSon = 0.5; son.jet(borne(1 - d / 28, 0, 1) ** 2); }
  }

  // la porteuse va à pied jusqu'à (x, z), face au nord : prendre la caisse j de la remorque (ou poser la caisse j sur la
  // palette)
  aller(j, prendre) {
    const o = this.po;
    o.etat = 'vers'; o.suite = prendre ? 'prendre' : 'poser'; o.j = j; o.t = 0;
    o.cx = (prendre ? REM : PAL)[j][0]; o.cz = prendre ? Z_REM : Z_PAL;
  }
  majPorteuse(dt, c) {
    const o = this.po, p = o.p, E = p.m.echelle, e = c.ego, de = Math.hypot(e.x - p.pos.x, e.z - p.pos.z);
    let dx = 0, dz = 0, f = 0, vit;
    // un véhicule qui arrive tout près : elle attend
    const gene = c.danger && Math.abs(c.danger.v) > 1 && Math.hypot(c.danger.x - p.pos.x, c.danger.z - p.pos.z) < 5;
    o.t += dt;
    if (o.etat === 'vers') {
      const ex = o.cx - p.pos.x, ez = o.cz - p.pos.z, d = Math.hypot(ex, ez);
      if (d < 0.08) { o.etat = o.suite; o.t = 0; }
      else if (!gene) { dx = ex / d; dz = ez / d; f = 1; vit = Math.min(1.15, 0.25 + d * 1.3); }
    } else if (o.etat === 'prendre' || o.etat === 'poser') {
      p.h = versAngle(p.h, 0, dt * 5);
      const prendre = o.etat === 'prendre', P = (prendre ? REM : PAL)[o.j], u = lisse((o.t - 0.3) / 0.7);
      if (prendre && o.t >= 0.3 && !this.porte) { this.porte = true; p.porte = this.portee; this.ranger(); }
      if (this.porte) {
        // de la pile aux bras (ou des bras à la pile), 60 cm devant soi
        const a = prendre ? [0, P[1], 0.6] : PORTE, b = prendre ? PORTE : [0, P[1], 0.6];
        this.portee.position.set(0, (a[1] + (b[1] - a[1]) * u) / E, (a[2] + (b[2] - a[2]) * u) / E);
      }
      if (o.t >= 1) {
        if (prendre) this.aller(this.k, false);
        else {
          this.porte = false; p.porte = null; this.k++; this.ranger(); o.voyages++;
          if (this.k >= N) { o.etat = 'fini'; o.t = 0; }
          else if (o.voyages % 5 === 0) { o.etat = 'souffle'; o.t = 0; }
          else this.aller(N - this.k - 1, true);
        }
      }
    } else if (o.etat === 'souffle') {
      if (o.t > 3.5) this.aller(N - this.k - 1, true);
    } else if (o.etat === 'fini') {
      // la remorque est vide : elle regarde son téléphone ; rechargée quand personne ne regarde
      p.telephone = o.t > 2;
      if (o.t > 8 && !this.vu(-82, -36)) { this.k = 0; this.ranger(); p.telephone = false; this.aller(N - 1, true); }
    }
    p.regard = c.aPied && de < 4 ? v2.set(e.x, 1.6, e.z) : null;
    p.update(dt, dx, dz, f, false, LIBRE, c.t, vit);
    c.pousser(p.pos, 0.34);
    // la caisse dans ses bras : l'instance 2N des caisses suit le repère que tiennent les bras (seule sa matrice part)
    if (this.porte) {
      const im = this.caisses, A = im.instanceMatrix;
      this.portee.updateWorldMatrix(true, false); im.setMatrixAt(2 * N, this.portee.matrixWorld);
      if (!this.plein) { A.clearUpdateRanges(); A.addUpdateRange(2 * N * 16, 16); }
      A.needsUpdate = true;
    }
    this.parler(o, c, de, dt);
  }

  majChien(dt, c, jour) {
    const ch = this.chien, e = c.ego, dx = e.x - ch.g.position.x, dz = e.z - ch.g.position.z, d = Math.hypot(dx, dz);
    // il dort la nuit (sauf si l'on vient tout près) ; le jour, il somnole tant que personne n'approche
    const eveil = c.aPied ? (jour ? 9 : 4) : (jour ? 14 : 0);
    const alerte = d < eveil, k = Math.min(1, dt * 3);
    const lacet = alerte ? borne(angle(Math.atan2(dx, dz) - ch.h), -1.1, 1.1) : 0.15 * Math.sin(c.t * 0.21);
    ch.ty += (lacet - ch.ty) * k; ch.tx += ((alerte ? -0.12 : jour ? 0.22 : 0.42) - ch.tx) * k;
    // tout près, à pied : il penche la tête d'un côté puis de l'autre (curieux) ; on approche : il flaire
    ch.tPres = c.aPied && d < 3 ? ch.tPres + dt : 0;
    ch.tz += ((ch.tPres > 1 ? 0.3 * Math.sign(Math.sin(ch.tPres * 0.8)) : 0) - ch.tz) * Math.min(1, dt * 5);
    const flaire = alerte && d > 2.5 && d < 8 ? 0.035 * Math.sin(c.t * 15) : 0;
    ch.tete.rotation.set(ch.tx + flaire, ch.ty, ch.tz);
    // la queue : elle bat quand on est près
    const amp = alerte ? (d < 5 && c.aPied ? 0.6 : 0.2) : 0;
    ch.queueA += (amp - ch.queueA) * k; ch.ph += dt * (d < 5 ? 9 : 4);
    ch.queue.rotation.set(-0.45 + ch.queueA * 0.3, ch.queueA * Math.sin(ch.ph), 0);
    ch.corps.scale.y = 1 + 0.025 * Math.sin(c.t * (alerte ? 3.4 : 2));
  }

  majOiseaux(dt, c, jour) {
    const im = this.oiseaux;
    if (!jour) { im.count = 0; return; }
    im.count = this.vols.length;
    const e = c.ego, po = this.po && this.po.present ? this.po.p.pos : null;
    for (let i = 0; i < this.vols.length; i++) {
      const b = this.vols[i], [x0, z0, x1, z1] = NIDS[b.n];
      const dj = Math.hypot(e.x - b.x, e.z - b.z), peur = dj < (c.aPied ? 3.5 : 9) || (po && Math.hypot(po.x - b.x, po.z - b.z) < 0.7);
      b.t += dt;
      let sx = 0.55;
      if (b.etat === 'sol') {
        if (peur) {
          const P = PERCHES[Math.floor(rnd() * PERCHES.length)];
          this.envol(b, P[0] + (rnd() - 0.5) * 0.3, P[1], P[2] + (rnd() - 0.5) * 0.1, 0.8);
        } else if ((b.tSaut -= dt) <= 0) {
          // un petit saut, au hasard, sans quitter son coin
          b.tSaut = 0.3 + rnd() * 1.3;
          const a = rnd() * 6.28, l = 0.08 + rnd() * 0.22;
          this.envol(b, borne(b.x + Math.sin(a) * l, x0, x1), 0.03, borne(b.z + Math.cos(a) * l, z0, z1), 0.06, 0.14);
          b.etat = 'saut';
        } else if (rnd() < dt * 1.5) b.pic = 0.16;
      } else if (b.etat === 'saut' || b.etat === 'vol') {
        const u = Math.min(1, b.t / b.dur);
        b.x = b.ax + (b.bx - b.ax) * u; b.z = b.az + (b.bz - b.az) * u; b.y = b.ay + (b.by - b.ay) * u + Math.sin(Math.PI * u) * b.haut;
        if (b.etat === 'vol') sx = 0.55 + 0.85 * Math.abs(Math.sin(b.t * 55));
        if (u >= 1) { b.etat = b.by > 0.1 ? 'perche' : 'sol'; b.t = 0; }
      } else if (b.etat === 'perche') {
        // ils reviennent quand on s'est éloigné
        if (b.t > 4 + i && !peur && dj > 6) this.envol(b, x0 + rnd() * (x1 - x0), 0.03, z0 + rnd() * (z1 - z0), 0.5);
      }
      b.pic = Math.max(0, b.pic - dt);
      e1.set(b.pic > 0 ? 0.6 : 0, b.h, 0); q1.setFromEuler(e1);
      im.setMatrixAt(i, m1.compose(v1.set(b.x, b.y, b.z), q1, v2.set(sx, 1, 1)));
    }
    im.instanceMatrix.needsUpdate = true;
  }
  // un vol (ou un saut) jusqu'à (x, y, z), en arc
  envol(b, x, y, z, haut, dur) {
    b.ax = b.x; b.ay = b.y; b.az = b.z; b.bx = x; b.by = y; b.bz = z; b.haut = haut; b.t = 0; b.etat = 'vol';
    b.dur = dur ?? Math.max(0.6, Math.hypot(x - b.x, y - b.y, z - b.z) / 4.5);
    if (Math.abs(x - b.x) + Math.abs(z - b.z) > 0.01) b.h = Math.atan2(x - b.x, z - b.z);
  }

  // les taches de contact des ouvriers et du chien ; vu(m, x, z) : main.js, ombrePerso (dessiné ou non selon la distance)
  taches(t, vu) {
    for (const o of this.ouvriers) if (o.present && vu(o.p.m, o.p.pos.x, o.p.pos.z)) t.poser(o.p.pos.x, o.p.pos.z, 0.4, 0.4, 0, o.p.pos.y);
    const g = this.chien.g.position;
    if (this.chien.g.visible) t.poser(g.x, g.z, 0.3, 0.55, this.chien.h);
  }
}
