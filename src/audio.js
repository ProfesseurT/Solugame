// Sons composés en code (Web Audio), sans aucun fichier : moteur du tracteur en plusieurs couches,
// roulement selon le sol, pas, ambiance du village (vent, oiseaux le jour et grillons la nuit, rumeur de la place),
// Radio Sarment (deux morceaux originaux et un indicatif), sons du téléphone, bruitages.
// Léger pour un téléphone : peu de nœuds permanents (le moteur et la rumeur ne sont branchés que
// quand ils servent), notes groupées dans un seul filtre, et tout le son est mis en pause quand il est
// coupé ou que la page est cachée. Rien n'est programmé quand le son est coupé.
import { borne } from './outils.js';
let ctx = null, maitre, musique, sfx, amb, bruitBuf, grainsBuf;
let actif = true, radio = false, prochaine = 0, pas = 0, segment = 0;
// la radio joue quand on est dans un véhicule, sauf si le joueur l'a coupée (choix gardé d'une partie à l'autre)
let dansVehicule = false, radioCoupee = false;
function majRadio() {
  const on = dansVehicule && !radioCoupee;
  if (on === radio) return;
  radio = on;
  if (!ctx) return;
  musique.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.25);
  if (on) { pas = 0; segment = 0; prochaine = 0; } // à chaque mise en marche : l'indicatif
}

const f = n => 440 * Math.pow(2, (n - 69) / 12);
const hasard = (a, b) => a + Math.random() * (b - a);

/* ---------------------------------------------------------------- Radio Sarment */
// 1. « Valse du Clos » : 16 mesures à trois temps, en croches ('-' : tenue, null : silence)
const MEL = [
  [76, '-', 81, '-', 84, 83], [81, '-', 76, '-', 72, '-'], [71, 72, 74, 76, 80, '-'], [83, '-', 80, '-', 76, '-'],
  [74, '-', 76, 77, 76, 74], [68, '-', 71, '-', 74, '-'], [72, 71, 72, 76, 81, '-'], [81, '-', '-', '-', null, null],
  [77, '-', 81, '-', 86, 84], [81, '-', 77, '-', 74, '-'], [76, '-', 81, '-', 84, '-'], [83, 81, 80, 81, 84, '-'],
  [83, '-', 80, '-', 76, '-'], [74, 76, 77, 76, 74, 71], [72, '-', 76, '-', 69, '-'], [69, '-', '-', '-', null, null],
];
const ACC = ['Am', 'Am', 'E7', 'E7', 'E7', 'E7', 'Am', 'Am', 'Dm', 'Dm', 'Am', 'Am', 'E7', 'E7', 'Am', 'Am'];
const ACCORDS = { Am: { b: [45, 40], c: [57, 60, 64] }, E7: { b: [40, 35], c: [56, 59, 62] }, Dm: { b: [38, 45], c: [57, 62, 65] } };
// 2. « Polka des sarments » (originale) : 16 mesures à deux temps, en croches, en ré majeur
const MEL2 = [
  [69, 74, 78, 81], [86, '-', 81, '-'], [79, 78, 76, 73], [76, '-', 69, '-'],
  [73, 76, 79, 81], [85, '-', 81, '-'], [78, 76, 74, 78], [74, '-', null, null],
  [71, 74, 79, 83], [83, 81, 79, 74], [78, 81, 86, 81], [78, '-', 74, '-'],
  [76, 78, 79, 76], [73, 76, 81, 79], [76, 79, 78, 76], [74, '-', '-', null],
];
const ACC2 = ['D', 'D', 'A7', 'A7', 'A7', 'A7', 'D', 'D', 'G', 'G', 'D', 'D', 'A7', 'A7', 'A7', 'D'];
const ACCORDS2 = { D: { b: [50, 45], c: [62, 66, 69] }, A7: { b: [45, 52], c: [61, 64, 67] }, G: { b: [43, 50], c: [62, 67, 71] } };
const VALSE = { mel: MEL, acc: ACC, accords: ACCORDS, croche: 0.18, temps: 6, style: 'valse' };
const POLKA = { mel: MEL2, acc: ACC2, accords: ACCORDS2, croche: 0.2, temps: 4, style: 'polka' };
// l'indicatif, puis chaque morceau deux fois
const PROGRAMME = ['indicatif', VALSE, VALSE, 'indicatif', POLKA, POLKA];

// enveloppe douce : attaque, tenue, relâche
function env(p, t, dur, vol) {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(vol, t + 0.015);
  p.setValueAtTime(vol, t + Math.max(0.02, dur - 0.05));
  p.linearRampToValueAtTime(0, t + dur);
}
// enveloppe percussive : attaque brève, décroissance exponentielle
function frappe(p, t, dur, vol) {
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(vol, t + 0.006);
  p.exponentialRampToValueAtTime(0.0001, t + dur);
}
// une note : un oscillateur, une enveloppe (filtre facultatif) ; renvoie l'oscillateur
function note(freq, t, dur, type, vol, dest, filtre, perc) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  (perc ? frappe : env)(g.gain, t, dur, vol);
  if (filtre) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filtre; o.connect(fl); fl.connect(g); }
  else o.connect(g);
  g.connect(dest); o.start(t); o.stop(t + dur + 0.03);
  return o;
}
// plusieurs oscillateurs dans un seul filtre et une seule enveloppe (moins de nœuds qu'une note chacun)
function voix(freqs, type, detune, t, dur, vol, dest, filtre, perc) {
  const g = ctx.createGain(), fl = ctx.createBiquadFilter();
  fl.type = 'lowpass'; fl.frequency.value = filtre; fl.connect(g); g.connect(dest);
  (perc ? frappe : env)(g.gain, t, dur, vol);
  for (let i = 0; i < freqs.length; i++) {
    const o = ctx.createOscillator();
    o.type = Array.isArray(type) ? type[i] : type; o.frequency.value = freqs[i];
    if (detune) o.detune.value = detune[i] || 0;
    o.connect(fl); o.start(t); o.stop(t + dur + 0.03);
  }
}
const DET_ACC = [-7, 7, 0], TYP_ACC = ['sawtooth', 'sawtooth', 'triangle'];
const accordeon = (n, t, dur) => voix([f(n), f(n), f(n - 12)], TYP_ACC, DET_ACC, t, dur, 0.045, musique, 2400);
const DET_CLA = [0, 6];
const clarinette = (n, t, dur) => voix([f(n), f(n)], 'square', DET_CLA, t, dur, 0.034, musique, 1700);
const accord = (ns, t, dur, perc) => voix([f(ns[0]), f(ns[1]), f(ns[2])], perc ? 'triangle' : 'square', null, t, dur, perc ? 0.07 : 0.022, musique, 1500, perc);

function jouerPas(seg, k, t) {
  const T = seg.temps, mes = Math.floor(k / T), p = k % T, m = seg.mel[mes][p];
  if (typeof m === 'number') {
    let d = 1;
    while (p + d < T && seg.mel[mes][p + d] === '-') d++;
    if (p + d === T && mes < seg.mel.length - 1 && seg.mel[mes + 1][0] === '-') d++;
    (seg.style === 'valse' ? accordeon : clarinette)(m, t, d * seg.croche * 0.96);
  }
  const a = seg.accords[seg.acc[mes]];
  if (seg.style === 'valse') {
    if (p === 0) note(f(a.b[mes % 2]), t, 0.3, 'triangle', 0.22, musique);
    if (p === 2 || p === 4) accord(a.c, t, 0.12);
  } else { // polka : basse sur les temps, accord pincé sur les contretemps
    if (p === 0 || p === 2) note(f(a.b[p === 0 ? 0 : 1]), t, 0.17, 'triangle', 0.24, musique);
    else accord(a.c, t, 0.16, true);
  }
}
// indicatif de la radio : on cherche la station, trois notes, un accord ; renvoie sa durée
function indicatif(t) {
  const s = bruit(t, 0.4, 500, 0.05, 'bandpass', musique);
  s.frequency.exponentialRampToValueAtTime(3500, t + 0.38);
  [79, 84, 88].forEach((n, i) => voix([f(n), f(n + 12)], ['triangle', 'sine'], null, t + 0.32 + i * 0.13, 0.32, 0.09, musique, 4000, true));
  voix([f(72), f(76), f(79)], TYP_ACC, DET_ACC, t + 0.74, 1.25, 0.05, musique, 2600);
  note(f(48), t + 0.74, 1.1, 'triangle', 0.22, musique);
  voix([f(91), f(96)], 'sine', null, t + 0.74, 1.3, 0.05, musique, 6000, true);
  return 2.5;
}
function planifier() {
  if (!ctx || !radio || !actif || ctx.state !== 'running') return;
  if (prochaine < ctx.currentTime) prochaine = ctx.currentTime + 0.05;
  while (prochaine < ctx.currentTime + 0.3) {
    const seg = PROGRAMME[segment % PROGRAMME.length];
    if (seg === 'indicatif') { prochaine += indicatif(prochaine); segment++; pas = 0; continue; }
    if (pas >= seg.mel.length * seg.temps) { segment++; pas = 0; continue; }
    jouerPas(seg, pas, prochaine);
    prochaine += seg.croche; pas++;
  }
}

/* ---------------------------------------------------------------- bruits */
// bruit blanc filtré, enveloppe percussive ; renvoie le filtre (pour le faire glisser)
function bruit(t, dur, freq, vol, type = 'lowpass', dest = sfx, buf = bruitBuf, debut = Math.random() * 1.5, rate = 1) {
  const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = freq;
  const g = ctx.createGain(); frappe(g.gain, t, dur, vol);
  s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, debut); s.stop(t + dur + 0.02);
  return fl;
}
function boucle(buf, debut) {
  const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, debut);
  return s;
}
function filtre(type, freq, q) { const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = freq; if (q) fl.Q.value = q; return fl; }
function gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
// un nœud branché seulement quand il sert : débranché un peu après s'être tu
function branchement(noeud, dest) {
  let branche = false, tm = 0;
  return on => {
    if (on) { clearTimeout(tm); tm = 0; if (!branche) { noeud.connect(dest); branche = true; } }
    else if (branche && !tm) tm = setTimeout(() => { tm = 0; if (branche) { noeud.disconnect(); branche = false; } }, 1500);
  };
}

/* ---------------------------------------------------------------- moteur et roulement */
let M = null;           // les nœuds du tracteur
let moteurOn = false, tAllume = 0, rapportPrec = 0;
// roulement : filtre et volume du souffle, filtre et volume des graviers, selon le sol
const ROUL = {
  asphalte: { f: 320, g: 0.05, gf: 900, gg: 0 },
  paves: { f: 420, g: 0.045, gf: 700, gg: 0.07 },
  gravier: { f: 900, g: 0.035, gf: 2600, gg: 0.15 },
  herbe: { f: 520, g: 0.03, gf: 1500, gg: 0.04 },
  vigne: { f: 800, g: 0.05, gf: 1900, gg: 0.12 },
};
function creerMoteur() {
  const bus = gain(1), mg = gain(0);
  mg.connect(bus);
  // 1. le « teuf-teuf » : dent de scie grave hachée par une modulation
  const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 30;
  const lp1 = filtre('lowpass', 280), am = gain(0.55);
  const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 7;
  const lfoG = gain(0.45); lfo.connect(lfoG); lfoG.connect(am.gain);
  o1.connect(lp1); lp1.connect(am); am.connect(mg);
  // 2. le grondement sous la charge : harmonique carrée dans une bande
  const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 60;
  const bp2 = filtre('bandpass', 520, 1.4), g2 = gain(0);
  o2.connect(bp2); bp2.connect(g2); g2.connect(mg);
  // 3. le souffle de l'échappement
  const nb = boucle(bruitBuf, 0.3), bp3 = filtre('bandpass', 1500, 0.8), g3 = gain(0);
  nb.connect(bp3); bp3.connect(g3); g3.connect(mg);
  // roulement : souffle des pneus, crépitement des graviers, raclement contre un mur
  const rs = boucle(bruitBuf, 1.1), rf = filtre('lowpass', 400), rg = gain(0);
  rs.connect(rf); rf.connect(rg); rg.connect(bus);
  const gs = boucle(grainsBuf, 0), gf = filtre('bandpass', 2000, 0.9), gg = gain(0);
  gs.connect(gf); gf.connect(gg); gg.connect(bus);
  const ff = filtre('bandpass', 1400, 3.5), fg = gain(0);
  rs.connect(ff); ff.connect(fg); fg.connect(bus);
  // crissement des pneus en dérapage : un sifflement aigu qui ondule, mêlé d'un souffle serré
  const oc = ctx.createOscillator(); oc.type = 'triangle'; oc.frequency.value = 1150;
  const lc = ctx.createOscillator(); lc.frequency.value = 9; const lcg = gain(60); lc.connect(lcg); lcg.connect(oc.frequency);
  const bc = filtre('bandpass', 1900, 9), cg = gain(0);
  oc.connect(cg); rs.connect(bc); bc.connect(cg); cg.connect(bus);
  o1.start(); lfo.start(); o2.start(); oc.start(); lc.start();
  M = { bus, mg, o1, lp1, lfo, lfoG, o2, g2, bp3, g3, rf, rg, gs, gf, gg, fg, oc, cg, brancher: branchement(bus, maitre) };
}

/* ---------------------------------------------------------------- ambiance */
let A = null;
let tAmb = 0, tOiseau = 2;
const PLACE = { x: 95, z: -46 };
function creerAmbiance() {
  // vent : souffle grave dont le timbre et le volume ondulent lentement
  const s = boucle(bruitBuf, 0.7), vf = filtre('lowpass', 420), vg = gain(0.018);
  const l1 = ctx.createOscillator(); l1.frequency.value = 0.07; const l1g = gain(220); l1.connect(l1g); l1g.connect(vf.frequency);
  const l2 = ctx.createOscillator(); l2.frequency.value = 0.13; const l2g = gain(0.01); l2.connect(l2g); l2g.connect(vg.gain);
  s.connect(vf); vf.connect(vg); vg.connect(amb);
  l1.start(); l2.start();
  // rumeur de la place, autour de la fontaine : deux bandes graves qui papotent (volume modulé), adoucies (sans aigus :
  // plus aiguë, on aurait dit un jet d'eau qui siffle), seulement de près
  const rg = gain(0), rl = filtre('lowpass', 800); rg.connect(rl);
  const bande = (fr, q, rythme, depth) => {
    const bf = filtre('bandpass', fr, q), m = gain(0.5);
    const l = ctx.createOscillator(); l.frequency.value = rythme; const lg = gain(depth);
    l.connect(lg); lg.connect(m.gain); s.connect(bf); bf.connect(m); m.connect(rg); l.start();
  };
  bande(380, 1.6, 2.7, 0.4); bande(650, 1.8, 0.45, 0.3);
  A = { vg, rg, brancherRumeur: branchement(rl, amb) };
}
function oiseau(vol) {
  const t = ctx.currentTime + 0.02, pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  let dest = amb;
  if (pan) { pan.pan.value = hasard(-0.8, 0.8); pan.connect(amb); dest = pan; }
  const sorte = Math.random();
  if (sorte < 0.4) { // trille qui monte
    const n = 4 + Math.floor(Math.random() * 5), f0 = hasard(2600, 3400);
    for (let i = 0; i < n; i++) {
      const o = note(f0, t + i * 0.075, 0.05, 'sine', vol, dest, 0, true);
      o.frequency.setValueAtTime(f0 + i * 90, t + i * 0.075); o.frequency.exponentialRampToValueAtTime(f0 * 1.35 + i * 90, t + i * 0.075 + 0.045);
    }
  } else if (sorte < 0.75) { // sifflement qui descend, deux fois
    for (let i = 0; i < 2; i++) {
      const o = note(2400, t + i * 0.32, 0.22, 'sine', vol * 1.2, dest, 0, false);
      o.frequency.setValueAtTime(hasard(2200, 2600), t + i * 0.32); o.frequency.exponentialRampToValueAtTime(hasard(1500, 1700), t + i * 0.32 + 0.2);
    }
  } else { // « tui-tui »
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const o = note(3800, t + i * 0.16, 0.07, 'sine', vol, dest, 0, true);
      o.frequency.setValueAtTime(3000, t + i * 0.16); o.frequency.exponentialRampToValueAtTime(4300, t + i * 0.16 + 0.06);
    }
  }
}
// la nuit, les grillons : trois stridulations aiguës, rapides
function grillon(vol) {
  const t = ctx.currentTime + Math.random() * 0.3, f = hasard(4100, 4600);
  for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) note(f, t + i * 0.18 + k * 0.022, 0.016, 'sine', vol, amb);
}

/* ---------------------------------------------------------------- pas */
let tStylo = 0;
function unPas(sol, v) {
  const t = ctx.currentTime, k = Math.min(1, 0.45 + v / 6), var_ = hasard(0.85, 1.15);
  switch (sol) {
    case 'gravier':
      bruit(t, 0.14, 2900 * var_, 0.3 * k, 'bandpass', sfx, grainsBuf, Math.random() * 1.8, hasard(0.8, 1.1));
      bruit(t, 0.07, 900, 0.07 * k);
      break;
    case 'herbe':
      bruit(t + 0.01, 0.12, 1200 * var_, 0.07 * k, 'lowpass');
      break;
    case 'vigne': case 'terre':
      bruit(t, 0.09, 480 * var_, 0.16 * k, 'lowpass');
      note(75, t, 0.06, 'sine', 0.08 * k, sfx, 0, true);
      break;
    default: // asphalte, pavés : talon net
      bruit(t, 0.045, 1900 * var_, 0.12 * k, 'bandpass');
      note(95 * var_, t, 0.05, 'sine', 0.09 * k, sfx, 0, true);
  }
}

/* ---------------------------------------------------------------- l'objet son */
export const son = {
  get actif() { return actif; },
  demarrer() {
    if (ctx) { if (ctx.state === 'suspended' && actif) ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    maitre = gain(actif ? 0.85 : 0); maitre.connect(ctx.destination);
    // la radio sonne comme une radio : bande passante réduite
    const hp = filtre('highpass', 170), lp = filtre('lowpass', 3800);
    musique = gain(0);
    musique.connect(hp); hp.connect(lp); lp.connect(maitre);
    if (radio) musique.gain.value = 0.9;
    sfx = gain(0.75); sfx.connect(maitre);
    amb = gain(0.9); amb.connect(maitre);
    const n = ctx.sampleRate * 2;
    bruitBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = bruitBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // graviers : petits claquements épars, chacun une giclée de bruit qui s'éteint vite
    grainsBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const g = grainsBuf.getChannelData(0), dens = 140 / ctx.sampleRate;
    for (let i = 0; i < n - 200; i++) if (Math.random() < dens) {
      const a = hasard(0.25, 1), L = 20 + Math.floor(Math.random() * 90);
      for (let j = 0; j < L; j++) g[i + j] += a * Math.exp(-j / (L * 0.25)) * (Math.random() * 2 - 1);
    }
    creerMoteur(); creerAmbiance();
    setInterval(planifier, 60);
    // téléphone : on coupe tout quand la page est cachée ; au premier toucher qui suit (iOS peut
    // refuser de reprendre sans geste, ou après un appel), on relance
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else if (actif) ctx.resume();
    });
    const relancer = () => { if (ctx && actif && !document.hidden && ctx.state !== 'running') ctx.resume(); };
    addEventListener('pointerdown', relancer, true); addEventListener('keydown', relancer, true);
  },
  basculer() {
    actif = !actif;
    if (ctx) {
      maitre.gain.setTargetAtTime(actif ? 0.85 : 0, ctx.currentTime, 0.05);
      if (actif) ctx.resume();
      else setTimeout(() => { if (!actif && ctx) ctx.suspend(); }, 300); // son coupé : plus aucun calcul
    }
    return actif;
  },
  // on : moteur en marche ; v : vitesse (m/s) ; etat (facultatif) : le véhicule (genre, regime, effort, rapport, sol, frotte).
  // Le van tourne plus haut et plus rond que le tracteur (moins de « teuf-teuf »).
  moteur(on, v, etat) {
    if (!ctx || !M) return;
    const t = ctx.currentTime, a = Math.abs(v || 0);
    if (!on) {
      if (moteurOn) { // on coupe le contact : le régime retombe en hoquetant
        moteurOn = false;
        M.o1.frequency.setTargetAtTime(12, t, 0.25); M.lfo.frequency.setTargetAtTime(2.5, t, 0.25);
        M.mg.gain.setTargetAtTime(0, t + 0.15, 0.2);
        for (const g of [M.g2, M.g3, M.rg, M.gg, M.fg, M.cg]) g.gain.setTargetAtTime(0, t, 0.08);
        M.brancher(false);
      }
      return;
    }
    if (!moteurOn) { moteurOn = true; rapportPrec = 0; M.brancher(true); if (tAllume < t) tAllume = t; }
    const reg = etat && etat.regime !== undefined ? etat.regime : Math.min(1, 0.15 + a / 14);
    const eff = etat && etat.effort !== undefined ? etat.effort : 0.4;
    const t0 = Math.max(t, tAllume), van = !!etat && etat.genre !== 'tracteur' && etat.genre !== 'enjambeur'; // le van et les voitures : un moteur à essence
    const f0 = van ? 36 + 64 * reg : 24 + 46 * reg;
    M.o1.frequency.setTargetAtTime(f0, t0, 0.06);
    M.lfo.frequency.setTargetAtTime(van ? 16 + 22 * reg : 5 + 10 * reg, t0, 0.06);
    M.lfoG.gain.setTargetAtTime(van ? 0.14 : 0.45, t0, 0.1);
    M.lp1.frequency.setTargetAtTime((van ? 260 : 180) + 520 * reg + 380 * eff, t0, 0.08);
    M.o2.frequency.setTargetAtTime(f0 * 2, t0, 0.06);
    M.g2.gain.setTargetAtTime(0.012 + 0.07 * eff * (0.3 + reg), t0, 0.1);
    M.bp3.frequency.setTargetAtTime(900 + 1800 * reg, t0, 0.1);
    M.g3.gain.setTargetAtTime(0.004 + 0.03 * eff * reg, t0, 0.1);
    M.mg.gain.setTargetAtTime(0.12 + 0.05 * reg, t0, 0.12);
    // changement de rapport : petit claquement
    if (etat && etat.rapport !== undefined && etat.rapport !== rapportPrec) {
      if (rapportPrec && a > 1 && actif) bruit(t, 0.06, 380, 0.25, 'lowpass');
      rapportPrec = etat.rapport;
    }
    // roulement selon le sol
    const P = ROUL[(etat && etat.sol) || 'asphalte'] || ROUL.herbe, kv = Math.min(1, a / 8);
    M.rf.frequency.setTargetAtTime(P.f, t, 0.1); M.rg.gain.setTargetAtTime(P.g * kv * (0.5 + 0.5 * kv), t, 0.12);
    M.gf.frequency.setTargetAtTime(P.gf, t, 0.1); M.gg.gain.setTargetAtTime(P.gg * Math.min(1, a / 3), t, 0.1);
    M.gs.playbackRate.setTargetAtTime(0.4 + a / 7, t, 0.1);
    M.fg.gain.setTargetAtTime(etat && etat.frotte ? etat.frotte * 0.14 : 0, t, 0.05);
    // dérapage : les pneus crissent sur le dur, les graviers crépitent ailleurs
    const gl = etat && etat.glisse > 0.18 ? etat.glisse : 0, dur = etat && (etat.sol === 'asphalte' || etat.sol === 'paves');
    M.cg.gain.setTargetAtTime(dur ? gl * 0.07 : 0, t, 0.05);
    M.oc.frequency.setTargetAtTime(1050 + gl * 450, t, 0.08);
    if (gl && !dur) M.gg.gain.setTargetAtTime(P.gg * 1.6 + gl * 0.12, t, 0.05);
  },
  // on : on vient de monter dans un véhicule (la radio joue si elle n'est pas coupée), ou d'en descendre
  radio(on) { dansVehicule = on; majRadio(); },
  // le bouton de la radio : coupe ou rallume ; renvoie vrai si elle est allumée
  basculerRadio() { radioCoupee = !radioCoupee; majRadio(); return !radioCoupee; },
  set radioCoupee(v) { radioCoupee = !!v; majRadio(); },
  get radioAllumee() { return !radioCoupee; },
  // un pas sur le sol donné ('asphalte', 'paves', 'gravier', 'herbe', 'vigne'), à la vitesse v (m/s)
  pas(sol, v) { if (ctx && actif) unPas(sol, v || 1.5); },
  // l'ambiance autour de (x, z) à l'heure du jeu (minutes depuis minuit) ; à appeler à chaque image
  ambiance(dt, x, z, minutes, aPied = true) {
    if (!ctx || !A) return;
    tAmb -= dt;
    if (tAmb > 0) return;
    tAmb = 0.25;
    const t = ctx.currentTime;
    // rumeur de la place, branchée seulement quand on est assez près
    const dp = Math.hypot(x - PLACE.x, z - PLACE.z), kr = borne(1 - (dp - 6) / 28, 0, 1);
    A.brancherRumeur(kr > 0);
    A.rg.gain.setTargetAtTime(0.035 * kr * kr, t, 0.6);
    // vent : un peu plus présent dans les vignes, loin du bourg
    A.vg.gain.setTargetAtTime(dp > 90 ? 0.026 : 0.016, t, 2);
    // oiseaux, surtout à pied, et moins près de la route ; la nuit (de 19 h 30 à 6 h 40), les grillons
    tOiseau -= 0.25;
    if (tOiseau <= 0) {
      tOiseau = hasard(2.5, 8);
      const route = Math.abs(z - 10) < 20 ? 0.5 : 1, m = ((minutes % 1440) + 1440) % 1440, nuit = m > 1170 || m < 400;
      if (actif && (aPied || Math.random() < 0.35)) { if (nuit) grillon(0.012 * route); else oiseau(0.022 * route * (aPied ? 1 : 0.7)); }
    }
  },
  // le nettoyeur haute pression du parvis du chai (parvis.js) : le jet, un souffle aigu, et le moteur ; k de 0 à 1 selon
  // la distance. Rejoué toutes les demi-secondes tant qu'il tourne.
  jet(k) {
    if (!ctx || !actif || k < 0.02) return;
    const t = ctx.currentTime;
    bruit(t, 0.6, 3600, 0.05 * k, 'highpass'); note(96, t, 0.6, 'sawtooth', 0.012 * k, sfx, 300);
  },
  // la tonnellerie (tonnellerie.js) : un coup de masse sur la chasse, sec et métallique ; le feu de copeaux qui crépite
  // (k de 0 à 1 selon la distance ; le feu, rejoué tous les tiers de seconde)
  marteau(k) {
    if (!ctx || !actif || k < 0.02) return;
    const t = ctx.currentTime;
    bruit(t, 0.05, 2600, 0.22 * k, 'bandpass'); note(1180, t, 0.18, 'triangle', 0.05 * k, sfx, 0, true); note(310, t, 0.12, 'sine', 0.09 * k, sfx, 0, true);
  },
  feu(k) {
    if (!ctx || !actif || k < 0.02) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) if (Math.random() < 0.6) bruit(t + Math.random() * 0.28, 0.012 + Math.random() * 0.02, 1800 + Math.random() * 2500, 0.06 * k, 'highpass');
    bruit(t, 0.32, 420, 0.02 * k);
  },
  jouer(nom) {
    if (!ctx || !actif) return;
    const t = ctx.currentTime;
    switch (nom) {
      case 'vibre': for (const k of [0, 0.42]) note(150, t + k, 0.3, 'square', 0.05, sfx, 500); break;
      case 'notif': note(1046, t, 0.08, 'sine', 0.12, sfx); note(1568, t + 0.09, 0.12, 'sine', 0.12, sfx); break;
      case 'bouchon': // le bouchon qui saute
        note(620, t, 0.05, 'sine', 0.12, sfx, 0, true); bruit(t, 0.03, 2400, 0.08, 'bandpass'); break;
      case 'verser': // le vin coule : glouglous de bruit filtré
        for (let i = 0; i < 9; i++) bruit(t + 0.1 * i + Math.random() * 0.03, 0.07, 520 + Math.random() * 260, 0.06, 'bandpass'); break;
      case 'tchin': // on trinque (le verre tinte)
        note(2093, t, 0.5, 'sine', 0.05, sfx, 0, true); note(3136, t, 0.35, 'sine', 0.025, sfx, 0, true); break;
      case 'erreur': note(392, t, 0.1, 'triangle', 0.1, sfx); note(330, t + 0.12, 0.16, 'triangle', 0.1, sfx); break; // refus doux : deux notes qui descendent
      case 'tap': case 'touche': // touche du téléphone : petit clic net
        bruit(t, 0.025, 3800, 0.08, 'highpass'); note(1900, t, 0.035, 'triangle', 0.05, sfx, 0, true); break;
      case 'stylo': // le stylo qui gratte sur l'écran (appelé en continu : limité à un grain toutes les 70 ms)
        if (t - tStylo < 0.07) break;
        tStylo = t; bruit(t, 0.08, hasard(2400, 4200), 0.05, 'bandpass'); break;
      case 'signe': note(f(79), t, 0.12, 'sine', 0.08, sfx, 0, true); note(f(86), t + 0.08, 0.25, 'sine', 0.08, sfx, 0, true); break;
      case 'choc': bruit(t, 0.25, 320, 0.6);
        { const o = note(70, t, 0.2, 'sine', 0.3, sfx); o.frequency.exponentialRampToValueAtTime(35, t + 0.2); }
        note(523, t, 0.45, 'sine', 0.05, sfx, 0, true); note(787, t, 0.3, 'sine', 0.04, sfx, 0, true); break; // résonance de tôle
      case 'carton': bruit(t, 0.12, 500, 0.35); break;
      case 'pulve': bruit(t, 0.75, 5200, 0.05, 'highpass'); break; // la bouillie pulvérisée : un souffle fin (joué en boucle, mission 2)
      case 'remplir': for (let i = 0; i < 14; i++) bruit(t + 0.16 * i + Math.random() * 0.05, 0.12, 380 + Math.random() * 200, 0.05, 'bandpass'); break; // l'eau dans la cuve
      case 'portiere': bruit(t, 0.05, 2600, 0.22, 'bandpass'); bruit(t + 0.05, 0.09, 900, 0.12, 'bandpass'); break; // le loquet, la portière s'écarte
      case 'claque': bruit(t, 0.16, 280, 0.5); { const o = note(90, t, 0.14, 'sine', 0.22, sfx); o.frequency.exponentialRampToValueAtTime(50, t + 0.14); } break; // portière refermée
      case 'marche': bruit(t, 0.06, 1500, 0.2, 'bandpass'); note(310, t, 0.07, 'triangle', 0.04, sfx, 0, true); break; // pied sur le marchepied (tôle)
      case 'klaxon': note(392, t, 0.38, 'square', 0.05, sfx, 1600); note(494, t, 0.38, 'square', 0.05, sfx, 1600); break;
      case 'pouet': { // mode WTF : un passant aplati, comme un jouet qui couine
        const a = note(620, t, 0.15, 'square', 0.05, sfx, 2400); a.frequency.exponentialRampToValueAtTime(1500, t + 0.12);
        const b = note(1150, t + 0.16, 0.16, 'square', 0.04, sfx, 2400); b.frequency.exponentialRampToValueAtTime(650, t + 0.3);
      } break;
      case 'envoi': { const fl = bruit(t, 0.5, 600, 0.25, 'bandpass'); fl.frequency.exponentialRampToValueAtTime(4000, t + 0.45); } break;
      case 'envoye': // envoi réussi : deux notes claires qui montent
        note(f(88), t, 0.14, 'sine', 0.1, sfx, 0, true); note(f(95), t + 0.1, 0.35, 'sine', 0.1, sfx, 0, true);
        note(f(100), t + 0.1, 0.3, 'triangle', 0.03, sfx, 0, true); break;
      case 'etoile': note(660, t, 0.1, 'square', 0.05, sfx, 2000); note(520, t + 0.1, 0.16, 'square', 0.05, sfx, 2000); break;
      case 'succes': [72, 76, 79, 84].forEach((n, i) => note(f(n), t + i * 0.09, 0.2, 'triangle', 0.13, sfx));
        voix([f(60), f(64), f(67), f(72)], 'square', null, t + 0.38, 0.7, 0.03, sfx, 1800); break;
      case 'oiseau': oiseau(0.02); break;
      case 'moteur-on': { // démarreur qui tourne, puis le moteur prend
        const o = ctx.createOscillator(), g = ctx.createGain(), m = ctx.createOscillator(), mg = ctx.createGain(), fl = filtre('lowpass', 900);
        o.type = 'sawtooth'; o.frequency.value = 85; m.frequency.value = 13; mg.gain.value = 0.04;
        m.connect(mg); mg.connect(g.gain); env(g.gain, t, 0.5, 0.05);
        o.connect(fl); fl.connect(g); g.connect(sfx); o.start(t); m.start(t); o.stop(t + 0.55); m.stop(t + 0.55);
        bruit(t + 0.45, 0.35, 220, 0.4);
        tAllume = t + 0.5;
      } break;
    }
  },
};
