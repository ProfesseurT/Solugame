// Particules (feuilles, fumée, gravillons, mottes, eau de la fontaine) et ombres de contact sous ce qui bouge.
// Réserves fixes d'objets réutilisés : aucune allocation pendant le jeu. Couleurs en nombres (0xrrggbb).
import * as THREE from 'three';

const pm = new THREE.Matrix4(), pq = new THREE.Quaternion(), pp = new THREE.Vector3(), pe = new THREE.Vector3();
const AXE_P = new THREE.Vector3(0.6, 1, 0.3).normalize(), AXE_Y = new THREE.Vector3(0, 1, 0);

export class Particules {
  // rnd : le tirage au sort du jeu (main.js), partagé : mêmes tirages qu'avant pour les passants
  constructor(scene, camera, rnd, max = 220) {
    this.camera = camera; this.rnd = rnd; this.max = max; this.n = 0; this.tFontaine = 0;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), new THREE.MeshLambertMaterial({ flatShading: true }), max);
    im.count = 0; im.frustumCulled = false; im.name = 'particules';
    im.setColorAt(0, new THREE.Color());
    scene.add(im);
    this.im = im;
    this.pool = [];
    for (let i = 0; i < max; i++) this.pool.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, vie: 0, v0: 1, c: new THREE.Color(), s: 1, g: 0, r: 0, sol: 0.05 });
    this.emettre = this.emettre.bind(this); // passée telle quelle (main.js), sans fonction neuve à chaque appel
  }
  // une particule en (x, y, z), vitesse (vx, vy, vz), durée de vie, couleur, taille, gravité (négative : elle monte),
  // hauteur du sol où elle se pose
  emettre(x, y, z, vx, vy, vz, vie, couleur, taille, grav, sol = 0.05) {
    if (this.n >= this.max) return;
    const p = this.pool[this.n++];
    p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.vie = vie; p.v0 = vie; p.c.setHex(couleur); p.s = taille; p.g = grav; p.r = this.rnd() * 6; p.sol = sol;
  }
  maj(dt) {
    const pool = this.pool, im = this.im, cam = this.camera.position;
    let n = 0;
    for (let i = 0; i < this.n; i++) {
      const p = pool[i];
      p.vie -= dt;
      if (p.vie <= 0) continue;
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < p.sol) { p.y = p.sol; p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; }
      p.r += dt * 4;
      const cx = p.x - cam.x, cy = p.y - cam.y, cz = p.z - cam.z;
      const k = cx * cx + cy * cy + cz * cz < 9 ? 0.001 : p.s * (p.g < 0 ? 1 + (1 - p.vie / p.v0) * 1.5 : Math.min(1, p.vie * 2));
      pq.setFromAxisAngle(AXE_P, p.r);
      pm.compose(pp.set(p.x, p.y, p.z), pq, pe.set(k, k, k));
      im.setMatrixAt(n, pm); im.setColorAt(n, p.c);
      if (i !== n) { pool[i] = pool[n]; pool[n] = p; } // garde les vivantes au début, sans rien créer
      n++;
    }
    this.n = n; im.count = n;
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
  }
  // la fontaine f (x, y, z) coule : quatre filets du bassin haut vers le bassin bas, un petit jet au centre ; seulement
  // si la caméra est à moins de 80 m
  fontaine(dt, f) {
    const cam = this.camera.position, rnd = this.rnd;
    if (Math.abs(cam.x - f.x) + Math.abs(cam.z - f.z) > 80) return;
    this.tFontaine += dt;
    while (this.tFontaine > 0.016) {
      this.tFontaine -= 0.016;
      const a = Math.floor(rnd() * 4) * Math.PI / 2 + 0.4 + (rnd() - 0.5) * 0.12, v = 0.85 + rnd() * 0.15;
      this.emettre(f.x + Math.cos(a) * 0.74, f.y - 0.02, f.z + Math.sin(a) * 0.74, Math.cos(a) * v, 0.5 + rnd() * 0.2, Math.sin(a) * v, 0.7, rnd() < 0.5 ? 0xd8eef6 : 0xa9d3e6, 0.6, 9.8, 0.7);
      if (rnd() < 0.3) this.emettre(f.x + (rnd() - 0.5) * 0.1, f.y + 0.05, f.z + (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.3, 1.6 + rnd() * 0.4, (rnd() - 0.5) * 0.3, 0.4, 0xeaf6fb, 0.36, 9.8, 2.6);
    }
  }
}

/* Ombres de contact sous les personnages et les véhicules : taches douces, toujours là (ancrage au sol), plus marquées
   quand la carte d'ombre est coupée ou loin (opacité réglée par le palier de qualité). Refaites à chaque image :
   debut(), poser() pour chacune, fin(). */
const tm4 = new THREE.Matrix4(), tq = new THREE.Quaternion(), tp = new THREE.Vector3(), te = new THREE.Vector3();
export class Taches {
  constructor(scene, max = 40) {
    const g = new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), nv = g.attributes.position.count, c = new Float32Array(nv * 4);
    for (let i = 0; i < nv; i++) { const r = Math.hypot(g.attributes.position.getX(i), g.attributes.position.getZ(i)); c[i * 4 + 3] = r < 0.01 ? 1 : 0; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 4));
    this.mat = new THREE.MeshBasicMaterial({ color: '#1e1830', vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const im = new THREE.InstancedMesh(g, this.mat, max);
    im.frustumCulled = false; im.renderOrder = 2; im.count = 0; im.name = 'taches';
    scene.add(im);
    this.im = im; this.max = max; this.n = 0;
  }
  debut() { this.n = 0; }
  // une tache en (x, z), demi-axes (rx, rz), tournée de rot
  poser(x, z, rx, rz, rot) {
    if (this.n >= this.max) return;
    tm4.compose(tp.set(x, 0.075, z), tq.setFromAxisAngle(AXE_Y, rot), te.set(rx, 1, rz));
    this.im.setMatrixAt(this.n++, tm4);
  }
  fin() { this.im.count = this.n; this.im.instanceMatrix.needsUpdate = true; }
}

/* Traces de pneus laissées en dérapant sur l'asphalte et les pavés : bandes sombres posées au sol, en instances, dans une
   réserve tournante (les plus anciennes sont reprises). Seule la bande ajoutée est envoyée à la carte graphique. */
const qm = new THREE.Matrix4(), qq = new THREE.Quaternion(), qp = new THREE.Vector3(), qe = new THREE.Vector3();
export class Traces {
  constructor(scene, max = 360) {
    const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ color: '#1b1816', transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const im = new THREE.InstancedMesh(g, m, max);
    im.frustumCulled = false; im.renderOrder = 1; im.count = 0; im.name = 'traces';
    scene.add(im);
    this.im = im; this.max = max; this.n = 0; this.der = [null, null]; // dernier point de chaque roue
  }
  // la roue k passe en (x, z) : une bande depuis son dernier point (largeur l)
  marquer(k, x, z, l) {
    const d = this.der[k];
    if (!d) { this.der[k] = { x, z }; return; }
    const dx = x - d.x, dz = z - d.z, L = Math.hypot(dx, dz);
    if (L < 0.3) return;
    if (L < 3) {
      const i = this.n++ % this.max;
      qm.compose(qp.set((x + d.x) / 2, 0.07, (z + d.z) / 2), qq.setFromAxisAngle(Y, Math.atan2(dx, dz)), qe.set(l, 1, L + 0.05));
      this.im.setMatrixAt(i, qm);
      this.im.instanceMatrix.addUpdateRange(i * 16, 16);
      this.im.instanceMatrix.needsUpdate = true;
      this.im.count = Math.min(this.n, this.max);
    }
    d.x = x; d.z = z;
  }
  lever() { this.der[0] = this.der[1] = null; }
}
const Y = new THREE.Vector3(0, 1, 0);
