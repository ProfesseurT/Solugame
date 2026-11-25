// Le logo de Solumatic, redessiné en code (Teddy, 25/11/2026 : « le vrai logo, que tu vas recréer » ; d'après le logo
// officiel, crm-solumatic/public/logo-solumatic.png) : « SOLUMATiC » en capitales géométriques noires, le O en anneau
// orange ouvert en haut, le A sans barre, le point du i orange ; dessous, le carré orange dégradé et son S blanc, puis
// « OLUTIONS INFORMATIQUES » en orange. Dessiné dans un repère de 1602 x 378 (le logo officiel), mis à l'échelle.
// fond : la couleur sous le logo (le pied du i est échancré par un disque de cette couleur).
const ORANGE = '#f47b20', NOIR = '#111111';

// le S : la ligne médiane d'un S géométrique, haut de 4 à 208 (épaisseur 30)
function cheminS(c) {
  c.moveTo(119, 61);
  c.bezierCurveTo(119, 35, 97, 19.5, 70, 19.5);
  c.bezierCurveTo(42, 19.5, 21, 35, 21, 60);
  c.bezierCurveTo(21, 86, 44, 95, 72, 102.5);
  c.bezierCurveTo(104, 111, 124, 122, 124, 149);
  c.bezierCurveTo(124, 175, 101, 193.5, 70, 193.5);
  c.bezierCurveTo(37, 193.5, 15.5, 174, 15.5, 147);
}

// « OLUTIONS INFORMATIQUES » : un petit alphabet au trait (hauteur 1, épaisseur e), chaque lettre dans sa largeur
const LETTRES = {
  O: [0.98, (c, w, e) => { c.ellipse(w / 2, 0.5, w / 2 - e / 2, 0.5 - e / 2, 0, 0, 7); }],
  Q: [0.98, (c, w, e) => { c.ellipse(w / 2, 0.5, w / 2 - e / 2, 0.5 - e / 2, 0, 0, 7); c.moveTo(w * 0.6, 0.74); c.lineTo(w * 0.86, 1.1); }],
  L: [0.6, (c, w, e) => { c.moveTo(e / 2, 0); c.lineTo(e / 2, 1 - e / 2); c.lineTo(w, 1 - e / 2); }],
  U: [0.74, (c, w, e) => { const r = w / 2 - e / 2; c.moveTo(e / 2, 0); c.lineTo(e / 2, 1 - e / 2 - r); c.arc(w / 2, 1 - e / 2 - r, r, Math.PI, 0, true); c.lineTo(w - e / 2, 0); }],
  T: [0.7, (c, w, e) => { c.moveTo(0, e / 2); c.lineTo(w, e / 2); c.moveTo(w / 2, e / 2); c.lineTo(w / 2, 1); }],
  I: [0.19, (c, w, e) => { c.moveTo(e / 2, 0); c.lineTo(e / 2, 1); }],
  N: [0.8, (c, w, e) => { c.moveTo(e / 2, 1); c.lineTo(e / 2, 0); c.lineTo(w - e / 2, 1); c.lineTo(w - e / 2, 0); }],
  S: [0.6, (c, w) => { c.save(); c.scale(w / 140, 1 / 212); c.translate(0, -2); cheminS(c); c.restore(); }],
  F: [0.56, (c, w, e) => { c.moveTo(w, e / 2); c.lineTo(e / 2, e / 2); c.lineTo(e / 2, 1); c.moveTo(e / 2, 0.53); c.lineTo(w * 0.88, 0.53); }],
  E: [0.56, (c, w, e) => { c.moveTo(w, e / 2); c.lineTo(e / 2, e / 2); c.lineTo(e / 2, 1 - e / 2); c.lineTo(w, 1 - e / 2); c.moveTo(e / 2, 0.5); c.lineTo(w * 0.9, 0.5); }],
  R: [0.62, (c, w, e) => { const r = 0.27 - e / 4; c.moveTo(e / 2, 1); c.lineTo(e / 2, e / 2); c.lineTo(w - r - e / 2, e / 2); c.arc(w - r - e / 2, e / 2 + r, r, -Math.PI / 2, Math.PI / 2); c.lineTo(e / 2, e / 2 + 2 * r); c.moveTo(w * 0.42, e / 2 + 2 * r); c.lineTo(w, 1); }],
  M: [0.94, (c, w, e) => { c.moveTo(e * 0.7, 1); c.lineTo(w * 0.13, e * 0.4); c.lineTo(w / 2, 0.86); c.lineTo(w * 0.87, e * 0.4); c.lineTo(w - e * 0.7, 1); }],
  A: [0.86, (c, w, e) => { c.moveTo(e * 0.5, 1); c.lineTo(w / 2, e * 0.3); c.lineTo(w - e * 0.5, 1); c.moveTo(w * 0.27, 0.7); c.lineTo(w * 0.73, 0.7); }],
};

// le logo entier dans la largeur w, en haut à gauche (x, y) ; sa hauteur est w x 378 / 1602
export function logoSolumatic(c, x, y, w, fond = '#ffffff') {
  c.save();
  c.translate(x, y); c.scale(w / 1602, w / 1602);
  c.lineCap = 'butt'; c.lineJoin = 'miter'; c.miterLimit = 8;
  /* -- SOLUMATiC */
  c.strokeStyle = NOIR; c.fillStyle = NOIR; c.lineWidth = 30;
  c.beginPath(); cheminS(c); c.stroke();
  c.fillRect(412, 5, 30, 203); c.fillRect(412, 178, 111, 30);                                     // L
  c.beginPath(); c.moveTo(563, 5); c.lineTo(563, 133); c.arc(622.5, 133, 59.5, Math.PI, 0, true); c.lineTo(682, 5); c.stroke(); // U
  const poly = p => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill(); };
  poly([737, 208, 762, 5, 793, 5, 858.5, 140, 924, 5, 954, 5, 978, 208, 948, 208, 930, 62, 872, 183, 845, 183, 785, 62, 767, 208]); // M
  poly([995, 208, 1072, 5, 1102, 5, 1180, 208, 1150, 208, 1087, 42, 1025, 208]);                  // A, sans barre
  c.fillRect(1170, 5, 148, 29); c.fillRect(1228, 5, 30, 203);                                     // T
  c.fillRect(1351, 52, 30, 156); c.fillStyle = fond; c.beginPath(); c.arc(1366, 36, 22, 0, 7); c.fill(); // i, échancré sous son point
  c.beginPath(); c.arc(1522, 106.5, 86.5, -0.74, 0.74, true); c.stroke();                         // C
  c.strokeStyle = ORANGE; c.fillStyle = ORANGE;
  c.beginPath(); c.arc(268.5, 106.5, 86.5, -1.13, 4.27); c.stroke();                               // le O, l'anneau orange
  c.beginPath(); c.arc(1366, 25, 23, 0, 7); c.fill();                                              // le point du i
  /* -- le carré dégradé, son S blanc */
  const g = c.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, '#e04a0c'); g.addColorStop(1, '#ed7d3a');
  c.fillStyle = g; c.beginPath(); c.roundRect(0, 248, 128, 130, 17); c.fill();
  c.save(); c.translate(36, 281); c.scale(0.4, 0.31); c.strokeStyle = '#ffffff'; c.lineWidth = 40; c.beginPath(); cheminS(c); c.stroke(); c.restore();
  /* -- OLUTIONS INFORMATIQUES */
  const txt = 'OLUTIONS INFORMATIQUES', H = 80, e = 15 / H, esp = 0.22, blanc = 0.36;
  let total = 0;
  for (const ch of txt) total += ch === ' ' ? blanc : LETTRES[ch][0] + esp;
  total -= esp;
  const k = (1600 - 140) / (total * H);
  c.strokeStyle = ORANGE; c.lineJoin = 'bevel';
  let px = 140;
  for (const ch of txt) {
    if (ch === ' ') { px += blanc * H * k; continue; }
    const [w, f] = LETTRES[ch];
    c.save(); c.translate(px, 276); c.scale(H * k, H);
    c.beginPath(); f(c, w, e); c.restore();
    c.lineWidth = 15; c.stroke();
    px += (w + esp) * H * k;
  }
  c.restore();
}
