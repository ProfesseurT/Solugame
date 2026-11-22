// Petits outils partagés.
export const angle = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const versAngle = (a, b, pas) => { const d = angle(b - a); return Math.abs(d) <= pas ? b : a + Math.sign(d) * pas; };
