// La tonnellerie du Coteau, qui vit (Teddy, 25/11/2026 : « améliore à fond le parvis de la tonnellerie pour la rendre
// beaucoup plus vivante et réaliste ; plus de détails »). Le matériel est dans le décor (monde.js : zoneActivites) ; ici,
// ce qui bouge :
// - les trois barriques en chauffe, sous l'appentis : le feu de copeaux dans chacune (des flammes qui dansent à la bouche
//   et au pied des douelles, les braises), la fumée qui monte et part avec le vent, des étincelles ;
// - le chauffeur passe d'une barrique à l'autre et mouille le bois au goupillon (il fume de vapeur), puis regarde le feu ;
// - le cercleur chasse les cercles sur la barrique de son billot : la masse levée, le coup sec sur la chasse, un pas de
//   côté tous les quelques coups pour faire le tour ; il souffle de temps en temps ;
// - le rouleur sort de l'atelier une barrique finie, la roule sur son bouge jusqu'au stock, la redresse, et y retourne ;
// - la cheminée de l'atelier fume.
// Ils travaillent de 7 h 30 à 18 h 30 et n'arrivent ni ne partent sous les yeux ; hors de ces heures, le feu couve. Ils
// saluent qui passe tout près. Rien n'est calculé quand la caméra est loin.
import * as THREE from 'three';
import { B, C, S, fusion, MAT } from './modeles.js';
import { perso } from './perso.js';
import { Pieton } from './pieton.js';
import { son } from './audio.js';
import { TONNELLERIE } from './textes.js';
import { hasard, versAngle, borne, lisse } from './outils.js';

const rnd = hasard(611);
const LIBRE = { resoudre: () => false, rangs: () => false }; // ils suivent des chemins dégagés
const FEUX = [[229.6, -38.6], [229.6, -36.1], [229.6, -33.6]]; // les barriques en chauffe (monde.js), leur bouche à 0,95 m
const BILLOT = { x: 228.4, z: -27.6, y: 1.17 };                 // la barrique du cercleur, le haut de ses douelles
const PORTE = { x: 232.2, z: -28.2 }, STOCK = [[219.0, -11.2], [220.4, -11.0], [221.7, -11.3]];
const CHEMINEE = [245.0, 9.8, -36.0];
const CENTRE = { x: 232, z: -22 };
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion(), e1 = new THREE.Euler(), m1 = new THREE.Matrix4(), s1 = new THREE.Vector3(), c1 = new THREE.Color();
const MAT_FEU = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });

// la masse du cercleur (le manche le long de +y depuis la main), la chasse (un coin de fer), le goupillon du chauffeur
const geoMasse = () => fusion([C(0.018, 0.022, 0.42, 6, '#9a7b55', 0, 0.16, 0), B(0.07, 0.07, 0.16, '#3a3a3e', 0, 0.38, 0)]);
const geoChasse = () => fusion([B(0.04, 0.2, 0.035, '#55585e', 0, 0.06, 0), B(0.05, 0.04, 0.05, '#2b2b30', 0, 0.17, 0)]);
const geoGoupillon = () => fusion([C(0.014, 0.014, 1.0, 5, '#9a7b55', 0, 0, 0.4, 'z'), C(0.06, 0.05, 0.16, 6, '#c9b48a', 0, 0, 0.95, 'z')]);
// une barrique (axe y, le centre à l'origine) : deux troncs de cône, les fonds, quatre cercles
const geoFut = () => fusion([C(0.35, 0.29, 0.475, 12, '#7a4a2a', 0, 0.2375, 0), C(0.29, 0.35, 0.475, 12, '#7a4a2a', 0, -0.2375, 0),
  ...[-0.4, -0.16, 0.16, 0.4].map(y => C(0.3 + 0.045 * (1 - (y / 0.475) ** 2) + 0.012, 0.3 + 0.045 * (1 - (y / 0.475) ** 2) + 0.012, 0.05, 12, '#3a3a3e', 0, y, 0, 'y', 0, 0)),
  C(0.035, 0.035, 0.06, 6, '#5a3f2b', 0.35, 0, 0, 'x')]);

export class Tonnellerie {
  // c : { scene, camera, emettre } (main.js) ; les ouvriers arrivent avec les autres habitants (peupler)
  constructor(c) {
    this.c = c; this.ouvriers = []; this.tFumee = 0; this.tChem = 0; this.tSon = 0; this.feu = 1;
    const sc = c.scene;
    // le feu : cinq flammes par barrique (trois à la bouche, deux au pied des douelles) et les braises, en instances
    const flamme = new THREE.ConeGeometry(0.12, 0.5, 6, 1, true).translate(0, 0.25, 0);
    this.flammes = new THREE.InstancedMesh(flamme, MAT_FEU, FEUX.length * 6);
    this.flammes.frustumCulled = false; this.flammes.renderOrder = 4; this.flammes.name = 'feux de la tonnellerie';
    this.ph = Array.from({ length: FEUX.length * 6 }, () => rnd() * 10);
    for (let i = 0; i < FEUX.length * 6; i++) this.flammes.setColorAt(i, c1.set(i % 6 === 5 ? '#b8461c' : i % 2 ? '#ff9a2e' : '#ffcf5a'));
    sc.add(this.flammes);
    // la barrique que roule le rouleur, et celles qu'il a déjà redressées au stock ; les outils dans les mains
    this.futs = [0, 1, 2].map(() => { const m = new THREE.Mesh(geoFut(), MAT); m.castShadow = true; m.receiveShadow = true; m.visible = false; m.rotation.order = 'YXZ'; sc.add(m); return m; });
    this.masse = new THREE.Mesh(geoMasse(), MAT); this.chasse = new THREE.Mesh(geoChasse(), MAT); this.goupillon = new THREE.Mesh(geoGoupillon(), MAT);
    for (const o of [this.masse, this.chasse, this.goupillon]) { o.rotation.order = 'YXZ'; o.visible = false; }
  }

  peupler(hud) {
    if (this.ouvriers.length) return;
    const sc = this.c.scene, T = (o) => new Pieton(perso({ bottes: false, lunettes: false, ...o }));
    // le tablier de cuir des tonneliers
    const ce = T({ peau: '#d9a27e', cheveux: '#5a4a3a', coiffure: 'court', barbe: true, tenue: 'chemise', haut: '#6b7f99', bas: '#3a3f47', tablier: '#6b4a30', chapeau: 'beret', chapeauC: '#2b2b30', chaussures: '#3b3b42' });
    const ch = T({ peau: '#e0ac69', cheveux: '#2b1d0e', coiffure: 'court', tenue: 'salopette', haut: '#4a5a3a', bas: '#4a5a3a', tablier: '#5a3f2b', chapeau: 'casquette', chapeauC: '#8a3a32', chaussures: '#4a3424' });
    const ro = T({ femme: true, peau: '#f1c27d', cheveux: '#7a5230', coiffure: 'queue', tenue: 'pull', haut: '#8a6a48', bas: '#34343a', tablier: '#6b4a30', chaussures: '#3a3a3a' });
    ce.placer(BILLOT.x - 0.8, BILLOT.z, Math.PI / 2); ch.placer(FEUX[0][0] - 0.85, FEUX[0][1], Math.PI / 2); ro.placer(PORTE.x, PORTE.z, -Math.PI / 2);
    for (const p of [ce, ch, ro]) { sc.add(p.m.groupe); p.etq = hud.etiquette('', 'bulle'); }
    for (const [p, o] of [[ce, this.masse], [ce, this.chasse], [ch, this.goupillon]]) { p.m.groupe.add(o); o.scale.setScalar(1 / p.m.echelle); o.visible = true; }
    this.ce = { p: ce, nom: 'cercleur', mains: { d: [-0.2, 1.3, 0.3], g: [0.05, 1.1, 0.4] }, a: Math.PI, ph: 0, coups: 0, pause: 0, tParle: 0, i: 0, present: true };
    this.ch = { p: ch, nom: 'chauffeur', mains: { d: [-0.15, 1.0, 0.3], g: [0.05, 1.05, 0.25] }, feu: 0, etat: 'vers', t: 0, tParle: 0, i: 0, present: true };
    this.ro = { p: ro, nom: 'rouleur', etat: 'dedans', t: 4, fut: null, n: 0, d: 0, tParle: 0, i: 0, present: true, mains: { d: [-0.16, 0.75, 0.45], g: [0.16, 0.75, 0.45] } };
    ro.m.groupe.visible = false;
    ce.outil = this.ce.mains; ch.outil = this.ch.mains;
    this.ouvriers = [this.ce, this.ch, this.ro];
    this.hud = hud;
  }

  // (x, z) est devant la caméra, à moins de 60 m
  vu(x, z) {
    const cam = this.c.camera, dx = x - cam.position.x, dz = z - cam.position.z, d = Math.hypot(dx, dz);
    if (d > 60) return false;
    if (d < 6) return true;
    cam.getWorldDirection(v1);
    return (dx * v1.x + dz * v1.z) / d > 0.35;
  }

  // À chaque image. c : { t, minutes, ego, aPied, danger, pousser } (main.js, comme pour le parvis du chai)
  maj(dt, c) {
    const cam = this.c.camera.position, m = ((c.minutes % 1440) + 1440) % 1440, dc = Math.hypot(cam.x - CENTRE.x, cam.z - CENTRE.z);
    const pres = dc < 150;
    this.flammes.visible = pres;
    if (!pres) return;
    const travail = m >= 450 && m < 1110;
    // le feu : vif pendant le travail, il couve la nuit
    this.feu += ((travail ? 1 : 0.35) - this.feu) * Math.min(1, dt * 0.2);
    this.majFeu(dt, c.t, dc);
    // la cheminée de l'atelier
    this.tChem += dt;
    while (this.tChem > 0.32) { this.tChem -= 0.32; this.c.emettre(CHEMINEE[0] + (rnd() - 0.5) * 0.3, CHEMINEE[1], CHEMINEE[2] + (rnd() - 0.5) * 0.3, 0.25 + rnd() * 0.15, 0.6 + rnd() * 0.2, 0.05, 5, rnd() < 0.5 ? 0x8f8a84 : 0xa9a49d, 0.8, -0.05); }
    if (!this.ouvriers.length) return;
    // les ouvriers : de 7 h 30 à 18 h 30 ; ils n'arrivent ni ne partent sous les yeux
    for (const o of this.ouvriers) {
      if (o.present !== travail && !this.vu(o.p.pos.x, o.p.pos.z)) {
        o.present = travail; o.p.m.groupe.visible = travail && (o !== this.ro || o.etat !== 'dedans');
        if (o === this.ro && o.fut) { o.fut.visible = false; o.fut = null; o.etat = 'dedans'; o.t = 3; }
      }
    }
    if (dc > 90) return;
    if (this.ce.present) this.majCercleur(dt, c);
    if (this.ch.present) this.majChauffeur(dt, c);
    if (this.ro.present) this.majRouleur(dt, c);
    for (const o of this.ouvriers) if (o.p.etq.vu) this.hud.placer(o.p.etq, o.p.pos.x, 2.25, o.p.pos.z, true);
  }

  // les flammes (leur hauteur suit un bruit), les braises, la fumée, les étincelles, le crépitement
  majFeu(dt, t, dc) {
    const im = this.flammes, f = this.feu;
    for (let k = 0; k < FEUX.length; k++) {
      const [x, z] = FEUX[k];
      for (let j = 0; j < 6; j++) {
        const i = k * 6 + j, ph = this.ph[i];
        let h = f * (0.55 + 0.3 * Math.sin(t * 7.3 + ph) + 0.2 * Math.sin(t * 13.1 + ph * 2.3)) * (j === 5 ? 0.25 : 1);
        let px, py, pz, w = 0.9 + 0.3 * Math.sin(t * 5 + ph);
        // trois à la bouche (le feu monte dans la barrique), deux au pied, entre les douelles écartées ; la braise au fond
        if (j < 3) { const a = ph + j * 2.1 + t * 0.4; px = x + Math.cos(a) * 0.1; pz = z + Math.sin(a) * 0.1; py = 0.7; h *= 1.25; w *= 1.3; }
        else if (j < 5) { const a = ph + j * 3.1; px = x + Math.cos(a) * 0.3; pz = z + Math.sin(a) * 0.3; py = 0.04; h *= 0.55; w *= 1.2; }
        else { px = x; pz = z; py = 0.2; w = 1.6; }
        e1.set(0.18 * Math.sin(t * 3 + ph), ph, 0.18 * Math.cos(t * 2.6 + ph)); q1.setFromEuler(e1);
        im.setMatrixAt(i, m1.compose(v1.set(px, py, pz), q1, s1.set(w, Math.max(0.05, h), w)));
      }
    }
    im.instanceMatrix.needsUpdate = true;
    if (dc > 110) return;
    this.tFumee += dt;
    const em = this.c.emettre;
    while (this.tFumee > 0.2) {
      this.tFumee -= 0.2;
      for (const [x, z] of FEUX) {
        if (rnd() < 0.75) em(x + (rnd() - 0.5) * 0.2, 1.05, z + (rnd() - 0.5) * 0.2, 0.15 + rnd() * 0.15, 0.7 + rnd() * 0.3 * this.feu, (rnd() - 0.5) * 0.1, 3.2, rnd() < 0.5 ? 0xb8b6b0 : 0x9d9993, 0.45 + rnd() * 0.2, -0.08);
        if (rnd() < 0.18 * this.feu) em(x + (rnd() - 0.5) * 0.15, 1.0, z + (rnd() - 0.5) * 0.15, (rnd() - 0.5) * 0.6, 1.6 + rnd(), (rnd() - 0.5) * 0.6, 0.9, rnd() < 0.5 ? 0xffb347 : 0xff7a2a, 0.06, -0.3);
      }
    }
    if ((this.tSon -= dt) <= 0) { this.tSon = 0.3; son.feu(borne(1 - dc / 22, 0, 1) ** 2 * this.feu); }
  }

  // qui passe tout près, à pied, est salué (une fois de temps en temps)
  parler(o, c, d, dt) {
    o.tParle -= dt;
    if (!c.aPied || d > 3.2 || o.tParle > 0) return;
    o.tParle = 40;
    const l = TONNELLERIE[o.nom];
    o.p.saluer(); this.hud.bulle(o.p.etq, l[o.i++ % l.length], 3);
  }

  // Le cercleur : il fait le tour de la barrique (côté nord, face à elle), une série de coups à chaque place. Un coup :
  // la masse monte au-dessus de l'épaule, redescend vite sur la chasse posée sur le cercle, le bruit sec ; la chasse dans
  // la main gauche.
  majCercleur(dt, c) {
    const o = this.ce, p = o.p, e = c.ego, d = Math.hypot(e.x - p.pos.x, e.z - p.pos.z);
    const arret = c.aPied && d < 2.2;
    // sa place autour de la barrique (angle a, de 120 à 240 degrés : du côté de l'appentis, hors du passage du rouleur)
    const px = BILLOT.x + Math.sin(o.a) * 0.78, pz = BILLOT.z + Math.cos(o.a) * 0.78, rx = px - p.pos.x, rz = pz - p.pos.z, ecart = Math.hypot(rx, rz);
    const revient = ecart > 0.08;
    const M = o.mains;
    if (!revient && !arret && (o.pause -= dt) <= 0) {
      o.ph += dt / 0.62;
      if (o.ph >= 1) {
        o.ph -= 1; o.coups++;
        if (o.coups % 7 === 0) { o.a = Math.PI * (2 / 3 + rnd() * 2 / 3); o.pause = 0.4; }
        if (o.coups % 30 === 0) o.pause = 3.5; // il souffle
      }
      // la masse : levée (u de 0 à 0,62), frappe (de 0,62 à 0,74), reste posée
      const u = o.ph, haut = u < 0.62 ? lisse(u / 0.62) : u < 0.74 ? 1 - (u - 0.62) / 0.12 : 0;
      M.d[0] = -0.22 + 0.06 * haut; M.d[1] = 1.12 + 0.55 * haut; M.d[2] = 0.36 - 0.12 * haut;
      if (u >= 0.74 && u - dt / 0.62 < 0.74) { son.marteau(borne(1 - d / 30, 0, 1) ** 2); if (rnd() < 0.5) this.c.emettre(BILLOT.x - 0.25, BILLOT.y, BILLOT.z, (rnd() - 0.5) * 0.4, 0.5, (rnd() - 0.5) * 0.4, 0.5, 0xc9a87a, 0.05, 4); }
    } else { M.d[0] += (-0.2 - M.d[0]) * Math.min(1, dt * 4); M.d[1] += (1.0 - M.d[1]) * Math.min(1, dt * 4); M.d[2] += (0.3 - M.d[2]) * Math.min(1, dt * 4); }
    M.g[0] = 0.04; M.g[1] = 1.1; M.g[2] = 0.42;
    const cap = Math.atan2(BILLOT.x - p.pos.x, BILLOT.z - p.pos.z);
    if (!revient) p.h = versAngle(p.h, cap, dt * 4);
    this.outils(p, M, this.masse, this.chasse);
    p.regard = arret ? v2.set(e.x, 1.6, e.z) : null;
    p.update(dt, revient ? rx / ecart : 0, revient ? rz / ecart : 0, revient ? 1 : 0, false, LIBRE, c.t, revient ? 0.5 : undefined);
    c.pousser(p.pos, 0.34);
    this.parler(o, c, d, dt);
  }
  // la masse dans la main droite (manche vers le haut quand elle est levée, vers l'avant quand elle frappe), la chasse
  // dans la gauche
  outils(p, M, masse, chasse) {
    const [dx, dy, dz] = M.d, E = p.m.echelle;
    masse.position.set(dx / E, dy / E, dz / E);
    const leve = borne((dy - 1.12) / 0.55, 0, 1);
    masse.rotation.set(1.9 - 1.5 * leve, 0, 0);
    if (chasse) { chasse.position.set(M.g[0] / E, (M.g[1] - 0.05) / E, M.g[2] / E); chasse.rotation.set(0.2, 0, 0); }
  }

  // Le chauffeur : il va d'une barrique à l'autre (à l'ouest de chacune, face à elle), mouille le bois au goupillon (la
  // vapeur monte), regarde le feu un moment, passe à la suivante
  majChauffeur(dt, c) {
    const o = this.ch, p = o.p, e = c.ego, d = Math.hypot(e.x - p.pos.x, e.z - p.pos.z), M = o.mains;
    const [fx, fz] = FEUX[o.feu], px = fx - 0.9, pz = fz;
    o.t += dt;
    let dx = 0, dz = 0, f = 0, vit;
    if (o.etat === 'vers') {
      const ex = px - p.pos.x, ez = pz - p.pos.z, l = Math.hypot(ex, ez);
      if (l < 0.08) { o.etat = 'mouille'; o.t = 0; } else { dx = ex / l; dz = ez / l; f = 1; vit = Math.min(1.0, 0.25 + l * 1.3); }
      M.d[1] += (0.95 - M.d[1]) * Math.min(1, dt * 4); M.g[1] += (1.0 - M.g[1]) * Math.min(1, dt * 4);
    } else if (o.etat === 'mouille') {
      p.h = versAngle(p.h, Math.PI / 2, dt * 4);
      // le goupillon va et vient au-dessus de la bouche de la barrique ; la vapeur
      const b = Math.sin(o.t * 5.5);
      M.d[0] = -0.12; M.d[1] = 1.18 + 0.08 * b; M.d[2] = 0.32; M.g[0] = 0.08; M.g[1] = 1.12 + 0.06 * b; M.g[2] = 0.48;
      if (rnd() < dt * 6) this.c.emettre(fx + (rnd() - 0.5) * 0.3, 1.0, fz + (rnd() - 0.5) * 0.3, 0.1, 0.9 + rnd() * 0.4, 0, 1.6, 0xe9eef0, 0.35, -0.2);
      if (o.t > 3.2) { o.etat = 'regarde'; o.t = 0; }
    } else if (o.etat === 'regarde') {
      M.d[1] += (0.95 - M.d[1]) * Math.min(1, dt * 3); M.g[1] += (1.0 - M.g[1]) * Math.min(1, dt * 3);
      if (o.t > 2.5 + rnd() * 0.05) { o.feu = (o.feu + 1) % FEUX.length; o.etat = 'vers'; o.t = 0; }
    }
    // le goupillon : de la main droite vers la gauche, la brosse au bout
    const [ax, ay, az] = M.d, [bx, by, bz] = M.g, lx = bx - ax, ly = by - ay, lz = bz - az, ll = Math.hypot(lx, ly, lz), E = p.m.echelle;
    this.goupillon.position.set(ax / E, ay / E, az / E);
    this.goupillon.rotation.set(Math.asin(-ly / ll) - 0.25, Math.atan2(lx, lz), 0);
    p.regard = c.aPied && d < 3.5 ? v2.set(e.x, 1.6, e.z) : o.etat === 'regarde' ? v2.set(fx, 1.0, fz) : null;
    p.update(dt, dx, dz, f, false, LIBRE, c.t, vit);
    c.pousser(p.pos, 0.34);
    this.parler(o, c, d, dt);
  }

  // Le rouleur : il sort de l'atelier avec une barrique couchée, la roule jusqu'au stock (penché, les mains dessus), la
  // redresse, revient et rentre (8 s dans l'atelier). Les barriques redressées restent au stock ; on en reprend une
  // (cachée) seulement quand personne ne la voit.
  majRouleur(dt, c) {
    const o = this.ro, p = o.p, e = c.ego, de = Math.hypot(e.x - p.pos.x, e.z - p.pos.z);
    o.t -= dt;
    let dx = 0, dz = 0, f = 0, vit;
    const gene = c.danger && Math.abs(c.danger.v) > 1 && Math.hypot(c.danger.x - p.pos.x, c.danger.z - p.pos.z) < 6;
    if (o.etat === 'dedans') {
      if (o.t <= 0) {
        // une barrique libre : jamais vue, ou plus vue
        const fut = this.futs.find(m => !m.visible) || this.futs.find(m => !this.vu(m.position.x, m.position.z));
        if (!fut) { o.t = 3; return; }
        fut.userData.pose = false; fut.visible = true; o.fut = fut; o.n = (o.n + 1) % STOCK.length; o.d = 0;
        p.placer(PORTE.x, PORTE.z, -Math.PI * 0.75); p.m.groupe.visible = true; o.etat = 'roule';
        const [bx, bz] = STOCK[o.n]; o.cap = Math.atan2(bx - PORTE.x, bz - PORTE.z);
      } else return;
    }
    if (o.etat === 'roule') {
      // la barrique devant lui (à 0,8 m), couchée en travers du chemin, qui tourne de d / r
      const [bx, bz] = STOCK[o.n], ex = bx - p.pos.x, ez = bz - p.pos.z, l = Math.hypot(ex, ez);
      if (l < 1.0) { o.etat = 'redresse'; o.t = 0.9; }
      else if (!gene) { dx = ex / l; dz = ez / l; f = 1; vit = 0.75; }
      p.outil = o.mains;
      const F = o.fut, h = Math.atan2(ex, ez);
      if (f) o.d += vit * dt;
      F.position.set(p.pos.x + Math.sin(h) * 0.8, 0.35, p.pos.z + Math.cos(h) * 0.8);
      F.rotation.set(o.d / 0.35, h, Math.PI / 2);
    } else if (o.etat === 'redresse') {
      const u = 1 - Math.max(0, o.t) / 0.9, F = o.fut;
      F.position.y = 0.35 + (0.475 - 0.35) * lisse(u);
      F.rotation.z = Math.PI / 2 * (1 - lisse(u)); F.rotation.x *= 1 - u;
      if (o.t <= 0) { F.rotation.set(0, F.rotation.y, 0); F.position.y = 0.475; F.userData.pose = true; o.fut = null; o.etat = 'retour'; p.outil = null; }
    } else if (o.etat === 'retour') {
      const ex = PORTE.x - p.pos.x, ez = PORTE.z - p.pos.z, l = Math.hypot(ex, ez);
      if (l < 0.15) { o.etat = 'dedans'; o.t = 8; p.m.groupe.visible = false; }
      else if (!gene) { dx = ex / l; dz = ez / l; f = 1; vit = Math.min(1.2, 0.3 + l); }
    }
    p.regard = c.aPied && de < 3.5 ? v2.set(e.x, 1.6, e.z) : null;
    p.update(dt, dx, dz, f, false, LIBRE, c.t, vit);
    c.pousser(p.pos, 0.34);
    this.parler(o, c, de, dt);
  }

  // les taches de contact des ouvriers ; vu(m, x, z) : main.js, ombrePerso
  taches(t, vu) {
    for (const o of this.ouvriers) if (o.present && o.p.m.groupe.visible && vu(o.p.m, o.p.pos.x, o.p.pos.z)) t.poser(o.p.pos.x, o.p.pos.z, 0.4, 0.4, 0, o.p.pos.y);
    for (const f of this.futs) if (f.visible) t.poser(f.position.x, f.position.z, 0.4, 0.4, 0);
  }
}
