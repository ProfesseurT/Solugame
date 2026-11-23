// Petits outils partagés.
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
