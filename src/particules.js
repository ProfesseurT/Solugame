// Particules (feuilles, fumée, gravillons, mottes, eau de la fontaine), ombres de contact sous ce qui bouge, traces de
// pneus, et ce que soulève un véhicule du domaine (EffetsVehicule).
// Réserves fixes d'objets réutilisés : aucune allocation pendant le jeu. Couleurs en nombres (0xrrggbb).
import * as THREE from 'three';
import { sol as solEn } from './relief.js';

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
  // une tache en (x, z), demi-axes (rx, rz), tournée de rot ; à la hauteur y du sol (penchée comme q, un véhicule)
  poser(x, z, rx, rz, rot, y = 0, q = null) {
    if (this.n >= this.max) return;
    tm4.compose(tp.set(x, y + 0.075, z), q || tq.setFromAxisAngle(AXE_Y, rot), te.set(rx, 1, rz));
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
  // la roue k passe en (x, z), le sol à y : une bande depuis son dernier point (largeur l), penchée comme la pente
  marquer(k, x, z, l, y = 0) {
    const d = this.der[k];
    if (!d) { this.der[k] = { x, z, y }; return; }
    const dx = x - d.x, dz = z - d.z, L = Math.hypot(dx, dz);
    if (L < 0.3) return;
    if (L < 3) {
      const i = this.n++ % this.max;
      qm.compose(qp.set((x + d.x) / 2, (y + d.y) / 2 + 0.07, (z + d.z) / 2), qq.setFromEuler(qeu.set(-Math.atan2(y - d.y, L), Math.atan2(dx, dz), 0, 'YXZ')), qe.set(l, 1, L + 0.05));
      this.im.setMatrixAt(i, qm);
      this.im.instanceMatrix.addUpdateRange(i * 16, 16);
      this.im.instanceMatrix.needsUpdate = true;
      this.im.count = Math.min(this.n, this.max);
    }
    d.x = x; d.z = z; d.y = y;
  }
  lever() { this.der[0] = this.der[1] = null; }
}
const qeu = new THREE.Euler();

/* ---------------------------------------------------------------- ce que soulève un véhicule du domaine
   Fumée d'échappement (au démarrage, en roulant : la cheminée verticale du tracteur, le pot bas à l'arrière du van),
   traces de pneus sur l'asphalte et les pavés et fumée des pneus (ou poussière ailleurs) en dérapage, feuilles dans les
   vignes, gravillons sur le gravier et mottes de terre derrière les roues arrière. */
const FEUILLES = { cabernet: [0xc2562e, 0xb0402c, 0xd0702f], chenin: [0xe2b23a, 0xd9a832, 0xeac24a] };
const GRAVIERS = [0xcfc1a0, 0xb9ab88, 0xe0d4b4], MOTTES = [0x6b4a30, 0x5a3e28, 0x7a5c3f];
const POUSSIERE = { gravier: 0xcfc1a0, herbe: 0x9a8f6a, vigne: 0x7a5c3f };
const ECH = { x: 0, y: 0, z: 0 };

export class EffetsVehicule {
  // particules : Particules ; traces : Traces ; col : Collisions (les parcelles de vigne) ; rnd : le tirage au sort du jeu
  constructor(particules, traces, col, rnd) { this.emettre = particules.emettre; this.traces = traces; this.col = col; this.rnd = rnd; }
  choisir(a) { return a[Math.floor(this.rnd() * a.length)]; }
  // point de sortie des gaz du véhicule v (cap : sin sx, cos sz)
  echappement(v, sx, sz) {
    const p = v.p.pos;
    if (v.genre !== 'tracteur') { const a = v.genre === 'van' ? 2.3 : 2.0; ECH.x = p.x - sx * a + sz * 0.45; ECH.y = p.y + 0.3; ECH.z = p.z - sz * a - sx * 0.45; }
    else { ECH.x = p.x + sx * 1.45 + sz * 0.3; ECH.y = p.y + 2.55; ECH.z = p.z + sz * 1.45 - sx * 0.3; }
    return ECH;
  }
  // le moteur démarre : une bouffée de fumée
  demarrer(v) {
    const r = this.rnd, e = this.echappement(v, Math.sin(v.p.h), Math.cos(v.p.h));
    for (let i = 0; i < 8; i++) this.emettre(e.x, e.y, e.z, (r() - 0.5) * 0.6, 1.2 + r(), (r() - 0.5) * 0.6, 0.9, 0x7d7a85, 1, -0.4);
  }
  // en roulant (v : le véhicule conduit, { genre, p })
  maj(dt, v) {
    const tr = v.p, r = this.rnd, van = v.genre !== 'tracteur'; // (le van, une voiture : le pot en bas, derrière)
    this.derapage(dt, v);
    const sx = Math.sin(tr.h), sz = Math.cos(tr.h);
    if (r() < dt * (3 + Math.abs(tr.v) * 0.4)) {
      const e = this.echappement(v, sx, sz), k = van ? -0.3 : 0.8;
      this.emettre(e.x, e.y, e.z, sx * tr.v * k + (r() - 0.5) * 0.4, (van ? 0.3 : 1) + r() * 0.6, sz * tr.v * k + (r() - 0.5) * 0.4, 0.7, 0x8a8790, van ? 0.5 : 0.75, -0.3);
    }
    if (tr.vignes && Math.abs(tr.v) > 0.8 && r() < dt * 30) {
      let c = null;
      for (const q of this.col.parcelles) if (tr.pos.x > q.x0 - 2 && tr.pos.x < q.x1 + 2 && tr.pos.z > q.z0 - 2 && tr.pos.z < q.z1 + 2) { c = q; break; }
      const teinte = this.choisir(c && c.cep === 'cabernet' ? FEUILLES.cabernet : FEUILLES.chenin);
      this.emettre(tr.pos.x + (r() - 0.5) * 2, tr.pos.y + 1.2 + r(), tr.pos.z + (r() - 0.5) * 2, (r() - 0.5) * 3, 2 + r() * 2, (r() - 0.5) * 3, 2.2, teinte, 0.9, 5);
    }
    const av = Math.abs(tr.v);
    if ((tr.sol === 'gravier' || tr.sol === 'vigne') && av > 1.5 && r() < dt * av * 1.2) {
      const cote = r() < 0.5 ? 0.98 : -0.98, bx = tr.pos.x - sx * 1.3 + sz * cote, bz = tr.pos.z - sz * 1.3 - sx * cote;
      const gr = tr.sol === 'gravier', k = gr ? 0.25 : 0.35;
      this.emettre(bx, tr.pos.y + 0.3, bz, -sx * tr.v * k + (r() - 0.5), 1.2 + r() * 1.6, -sz * tr.v * k + (r() - 0.5), 0.9, this.choisir(gr ? GRAVIERS : MOTTES), gr ? 0.4 : 0.7, 9, tr.pos.y + 0.05);
    }
  }
  // en dérapage : traces derrière les roues arrière, fumée des pneus sur le dur, poussière ailleurs
  derapage(dt, v) {
    const tr = v.p, g = tr.glisse, D = tr.d, r = this.rnd;
    if (g < 0.18 || Math.abs(tr.v) + Math.abs(tr.vT) < 1.5) { this.traces.lever(); return; }
    const fx = Math.sin(tr.h), fz = Math.cos(tr.h), zr = D.zAr ?? -0.9, xr = D.xAr ?? 0.98, dur = tr.sol === 'asphalte' || tr.sol === 'paves';
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1, x = tr.pos.x + fx * zr + fz * xr * s, z = tr.pos.z + fz * zr - fx * xr * s;
      const y = solEn(x, z);
      if (dur) this.traces.marquer(k, x, z, v.genre === 'tracteur' ? 0.4 : 0.22, y); else this.traces.lever();
      if (r() < dt * 26 * g) this.emettre(x, y + 0.25, z, (r() - 0.5) * 0.8, 0.5 + r() * 0.6, (r() - 0.5) * 0.8, 1.1, dur ? 0xd9d5cc : POUSSIERE[tr.sol] ?? 0xcfc1a0, dur ? 1.1 : 0.9, -0.25);
    }
  }
}
