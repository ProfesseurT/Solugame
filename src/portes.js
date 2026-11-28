// Les visiteurs des portes ouvertes (mission 4, le jour J ; Teddy, 28/11/2026) : ils arrivent au domaine, se garent,
// passent le portail, flânent dans la cour, goûtent au bar de dégustation, se servent au buffet, font la queue à la
// caisse et repartent. L'implantation : monde.js, lieux.portes (la caisse et sa file, le bar, le buffet, la sono,
// l'entrée, le parking des visiteurs).
// L'interface avec la mission (mission4.js) :
// - ouvrir() : les portes ouvrent (10 h), les visiteurs commencent à arriver ; fermer() : c'est fini (ils repartent) ;
// - ouvrirCaisse() : la file de la caisse se forme ; les dix clients de PORTES.clients s'y présentent dans l'ordre ;
//   comptoir : le visiteur arrivé devant la caisse (son client : comptoir.def), ou null ; servi(ticket) : son ticket est
//   fait, il s'en va (avec ses achats), le suivant avance ;
// - releve() : Marc tient la caisse (mission4.js le mène) ; les visiteurs suivants passent chez lui ;
// - candidats(f) : ceux qu'on peut servir au bar de dégustation (verres.js : f(personne, portée)) ; nServis : combien
//   ont eu leur verre (p.surServi) ;
// - maj(dt, E) à chaque image (main.js : bourg ; E = { t, minutes, ego, joueur, aPied, danger, pousser }) ;
//   taches(t, vu) : leurs ombres de contact.
export class Visiteurs {
  // c : { jeu, scene, camera, col, hud, son, lieux }
  constructor(c) {
    this.c = c;
    this.actif = false;     // les portes sont ouvertes (des visiteurs dans la cour)
    this.comptoir = null;   // le visiteur devant la caisse
    this.nServis = 0;       // verres servis au bar de dégustation
    this.marc = false;      // Marc tient la caisse
  }
  ouvrir() { this.actif = true; }
  fermer() { this.actif = false; this.comptoir = null; }
  ouvrirCaisse() {}
  servi(ticket) { this.comptoir = null; }
  releve() { this.marc = true; }
  candidats(f) {}
  maj(dt, E) {}
  taches(t, vu) {}
}
