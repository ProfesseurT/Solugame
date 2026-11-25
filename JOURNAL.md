# Journal

## 22/11/2026 · Démo 0.1

**Demande de Teddy** : un nouveau jeu dans le dépôt Solugame, « vraiment inspiré de GTA » mais dans la vie d'un vigneron, avec Vitisoft et Le Bureau, Viticode et le registre au quotidien. Ensuite : une mise en abyme où le personnage utilise les outils numériques pour résoudre des situations ; graphismes qui ressemblent à GTA ; choix de la 3D moderne (option 2).

**Décisions**
- Ce qu'on prend à GTA : le genre (monde ouvert, véhicules, missions par téléphone, mini-carte, étoiles, radio, ton satirique). Ce qu'on ne prend pas : nom, logo, police, personnages, écrans (« WASTED », « MISSION PASSED »), carte, style d'affiche. Raison : risque juridique (l'éditeur poursuit les imitations) et règle déjà posée pour « À vous de jouer ».
- Pas de crime : bêtises comiques seulement.
- Nom : « Cuvée Libre » (proposé, à valider par Teddy). Objectif : prévente du registre phyto jusqu'au 31/12/2026, puis vitrine Vitisoft et Viticode (proposé, à valider).
- 3D stylisée low poly, tout construit en code (aucun modèle téléchargé, aucune licence à gérer), three.js 0.170 inclus dans un seul fichier de 570 Ko (154 Ko compressé).
- Décor : village de la Loire (tuffeau, ardoise), vignes d'automne (chenin jaune, cabernet franc rouge), peupliers dorés, heure dorée, château au loin.
- « Registre numérique » dans la demande : on garde « Registre phyto » (règle : pas de nom d'appli inventé).
- Le Bureau = l'écran du matin qui donne les missions (d'après les maquettes `ma-journee` du produit).
- Les scènes du registre phyto se passeront en 2027 dans le jeu complet, comme les écrans du site (« campagne 2027 »).

**Contenu de la démo**
- Accueil avec choix vigneron ou vigneronne, consignes avant la partie.
- Monde : domaine du Clos Libre (maison, chai, fûts), bourg (Cave du Pressoir, Bar Le Cep, boulangerie, mairie, église, fontaine), 9 parcelles, départementale avec voitures qui s'arrêtent et klaxonnent, passants qui s'écartent du tracteur.
- Tracteur : monter et descendre, conduite au doigt ou au clavier, ralenti dans les vignes avec feuilles qui volent, fumée, Radio Sarment.
- Téléphone : Le Bureau (Ma journée), Vitisoft (factures, DRM, DAE et DAES, journal des ventes), Viticode (QR code nutritionnel), Registre phyto (prévente et lien), Messages, Réglages (son, personnage).
- Mission « Le réassort de Noël » : notification du Bureau, appel à la Cave du Pressoir, chargement de 6 cartons au chai, livraison au bourg, facture Factur-X dans Vitisoft transmise par Pennylane, +342 € HT, étoiles de retard qui montent si on traîne puis redescendent, carte de fin.

**Faits utilisés (tous de la fiche du 21/11/2026)** : réception des factures électroniques au 1er septembre 2026 ; Factur-X ; Pennylane plateforme agréée qui transmet ; journal des ventes TVA comprise vers le comptable ; DRM calculée par Vitisoft, validée dans CIEL, chaque mois avant le 10 ; DAE et DAES sur GAMMA 2 depuis les factures ; hors UE, DAE ; étiquetage : information obligatoire pour les vins produits depuis le 8 décembre 2023, QR code possible ; Viticode QR codes nutritionnels gratuits, 3 500 comptes ; registre phyto numérique au 1er janvier 2027, prévente 4,99 € puis 9,99 € HT/mois.

**Vérifié**
- Chrome (Playwright) en 1280 x 800 et 390 x 844 : accueil, jeu, téléphone, appel, chargement, livraison, facture, fin. Aucune erreur console.
- Mission jouée de bout en bout (au script, puis à la main dans la fenêtre de test : 342 € et « Balade libre » atteints).
- Coût d'une image (ordinateur) : 26 appels de dessin, environ 120 000 triangles.

**À faire / à valider par Teddy**
- Nom « Cuvée Libre » et objectif.
- Essai sur vrai téléphone (gestes au doigt pas encore testés sur appareil).
- Lien de préinscription : `?source=jeu-cuvee-libre` sur la page de la campagne « À vous de jouer », à confirmer.

## 22/11/2026 · Relecture par un agent (chemins tactiles et téléphone), corrigée

- Blocage après l'envoi de la facture (retour ou barre d'accueil sortaient du seul écran « Terminé ») : retour masqué pendant l'appel et l'envoi, « Terminé » aussi dans l'accueil de Vitisoft.
- Sur téléphone, le téléphone ouvert cachait les sous-titres de l'appel : la conversation s'affiche maintenant dans l'écran d'appel.
- Le téléphone se rouvrait sur un écran périmé et la fin pouvait se rejouer (+342 € à chaque fois) : retour à l'accueil du téléphone, fin jouée une seule fois.
- Accueil et carte de fin coupés en paysage : mise en page qui défile depuis le haut ; titre à gauche dès que l'écran est large.
- Sous-titres cachés par le téléphone de poche sur 360 px : remontés sur les écrans étroits.
- Au doigt, tirer vers soi freine puis recule (avant : demi-tour forcé).
- Étiquettes « Monter » et « Descendre » : un glissé qui part dessus fait marcher, un toucher court monte ou descend.
- Notification arrivée téléphone ouvert : l'écran se met à jour. Pas de zoom à deux doigts sur iOS.
Vérifié au script : parcours complet, retour bloqué pendant l'envoi, fin jouée une fois (342 €), carte de fin lisible en 844 x 390.

## 22/11/2026 · Retours de Teddy : plus d'étapes, conduite au doigt, textures

**Demandes** : multiplier les étapes (appel, commande saisie dans le bureau, commande signée par le client, chargement au chai, tournée de livraison lancée dans le bureau, livraison, facture avec Pennylane) ; la conduite du tracteur au téléphone est beaucoup trop sensible ; textures plus réalistes.

**Faits vérifiés** (vitisoft.fr, page « le bureau », 22/11/2026) : la commande se prépare pendant l'appel, au tarif et aux remises du client ; le client reçoit un lien personnel, propre à la commande, la relit, la confirme et la signe sur son téléphone, sans créer de compte ; la commande signée arrive dans Vitisoft par l'import de commandes, sans ressaisie, prête à préparer et à facturer ; écran Tournée : arrêts dans l'ordre avec l'action chez chacun, itinéraire suggéré au départ du domaine, clients sur le chemin à ajouter. Nom affiché : « Le bureau » (comme sur le site).

**Fait**
- Mission en 7 étapes : appel ; commande préparée dans le bureau (nombre de cartons modifiable, proposé d'office : ce qu'il prend d'habitude) et envoyée pour signature ; la cave signe au bout de 14 s (on ne peut pas charger avant) ; chargement au chai ; tournée démarrée dans le bureau, itinéraire en pointillés sur la mini-carte ; livraison ; facture Vitisoft « depuis la commande signée », transmise par Pennylane. Montant calculé sur le nombre de cartons.
- Le bureau : onglets Ma journée, Commande, Tournée ; carte « à faire maintenant » en tête.
- Conduite au doigt refaite (avant : le tracteur visait la direction du doigt par rapport à la caméra, qui tournait avec lui, d'où l'excès de sensibilité) : côtés = volant progressif avec zone morte, haut = avancer, bas = freiner puis reculer, doigt posé = vitesse gardée ; braquage réduit à haute vitesse et plus doux. Consigne affichée à la première montée.
- Textures procédurales dans le shader (sans image) : pierre de taille avec salissures au pied des murs, ardoises, asphalte rapiécé, peinture de route usée, pavés, gravier, herbe, terre entre les rangs, bois, feuillage ; vitres qui reflètent le ciel. Fichier : 586 Ko (159 Ko compressé).

**Vérifié** : parcours complet au script (342 € HT, bannière « Commandé, signé, livré, facturé »), chargement refusé avant signature, aucune erreur de shader ni de console. Lien de prévente ouvert depuis l'appli Registre phyto : la page de la campagne s'affiche.

## 22/11/2026 · Démo 0.3 : Vitisoft sur le PC, 3 livraisons, personnage et décor détaillés

**Demandes de Teddy** : améliorer le personnage ; Vitisoft n'existe pas sur téléphone ; enchaîner création de la commande dans le bureau, validation en ligne par le client (signature numérique), livraison avec signature du BL sur le téléphone par le client, commande validée envoyée dans Vitisoft pour facturation ; 1 ou 2 livraisons de plus ; à la fin, retour au chai, ouverture du PC du domaine pour voir les commandes validées et livrées et les facturer dans Vitisoft. Puis : « va encore plus dans le détail ».

**Sources** : arbitrage de Teddy (Vitisoft sans appli téléphone ; BL signé par le client sur le téléphone) ; page « le bureau » de vitisoft.fr (commande préparée pendant l'appel, signature en ligne sans compte, commande signée importée dans Vitisoft sans ressaisie, prête à préparer et à facturer ; tournée : arrêts dans l'ordre avec « livrer, faire signer » ; messages préparés que l'on relit avant d'envoyer).

**Fait**
- Téléphone : Vitisoft retiré. Le bureau a 3 onglets (Ma journée, Commandes, Tournée) et gère les 3 clients : Cave du Pressoir (appel), Bar Le Cep (message préparé, il répond), Restaurant La Treille (appel). Chaque commande part pour signature en ligne ; les clients signent pendant que l'on joue.
- Chargement au chai seulement quand les 3 commandes sont signées (11 cartons par défaut, 18 places sur le tracteur).
- Tournée de 3 arrêts, itinéraire sur la carte. À chaque arrêt, le client parle puis signe le bon de livraison du doigt sur notre téléphone (pavé de signature) ; ses cartons disparaissent du tracteur.
- Retour au domaine : à pied devant le chai, « Ouvrir le PC ». Vitisoft affiche les commandes signées en ligne et livrées (BL signé) ; pour chacune, Facturer (Factur-X) puis Envoyer avec Pennylane ; les ventes du jour montent à chaque envoi ; le journal des ventes part chez le comptable. Total par défaut : 640,20 € HT.
- Nouveau bâtiment : Restaurant La Treille (enseigne, vitrine, store) sur la départementale.
- Personnage refait : squelette avec genoux et coudes, tête arrondie, yeux, sourcils, nez, bouche, oreilles, barbe ou queue de cheval, veste matelassée, ceinture, bottes ; marche avec flexion des genoux, course penchée, pose assise au volant.
- Décor : jardinières de géraniums, poteaux électriques et fils qui pendent, réverbères, poubelles, panneaux STOP, 50 et « Domaine du Clos Libre », 5 000 touffes d'herbe, balles de foin, parking de l'église et voitures garées, nuages qui dérivent.

**Vérifié** : parcours complet au script (3 commandes, 3 BL, 3 factures transmises, bannière et carte de fin), signature au doigt simulée sur le pavé en 390 x 844, Vitisoft lisible sur téléphone (tableau en cartes), aucune erreur console. Coût CPU d'une image après chauffe : 0,5 à 1 ms ; 173 appels de dessin (les personnages en font 11 chacun, piste d'optimisation si un téléphone rame).

## 22/11/2026 · Démo 0.4 : optimisation et amélioration par trois agents experts, relecture

**Demande de Teddy** : « améliore au max et optimise au max », avec des agents experts et les skills nécessaires ; améliorer le personnage et ses mouvements.

**Méthode**
- Code découpé par domaine (`perso.js`, `anim.js`, `pieton.js`, `engins.js`, `vehicules.js`, `camera.js`, `outils.js`, `pc.js`).
- Banc d'essai sans fenêtre (`scripts/essai.mjs`, puppeteer-core et le Chrome installé), selon la méthode du skill de test d'applis web.
- Trois experts en parallèle, chacun sur sa copie du projet et ses fichiers : personnages et animation ; rendu et performance ; conduite, caméra et son.
- Fusion des trois copies, puis branchements dans `main.js`.
- Relecture à neuf par un quatrième agent : 12 défauts, tous corrigés et revérifiés avec ses propres scénarios.

**Personnages** : un seul SkinnedMesh par personnage (18 os), donc 1 appel de dessin au lieu de 11. Proportions justes, visage, doigts, coiffures. Vigneron barbu en veste matelassée, vigneronne en gilet avec queue de cheval qui balance. Passants variés (robe, salopette, chapeau de paille...). Animation procédurale : marche, petite course et course mélangées, pieds posés sans glisser, inclinaison dans les virages, repos vivant, regard, téléphone en main quand on l'ouvre, mains au volant, salut des clients, saut de côté des passants.

**Rendu et performance**
- Décor fusionné par quartiers, enseignes en atlas, vignes et herbe simplifiées au loin, ombres resserrées et partielles selon le palier.
- Paliers de qualité automatiques (faible, moyen, haut) mesurés pendant l'accueil, résolution adaptative.
- Ciel au pixel avec soleil et halo, brume plus claire côté soleil, fausse occlusion, taches d'ombre, vent dans l'herbe, les arbres et les vignes, fontaine animée, fenêtres et réverbères allumés, vignes avec manquants, fils et piquets de tête.

**Conduite, caméra, son**
- Tracteur : adhérence, suspension, sol (gravier, herbe, vignes), on longe les murs ; volant animé.
- Voitures : feux stop, clignotant et dépassement.
- Caméra : anticipation, vitesse, sortie des murs, rotation à deux doigts ou à la souris, pincer pour la distance.
- Manette.
- Son : moteur à 3 couches, pas selon le sol, ambiance, cloche à l'heure, 2e morceau original sur Radio Sarment, sons du téléphone.

**Défauts trouvés à l'assemblage et à la relecture, corrigés**
- Accueil noir sur téléphone : la compilation des shaders n'était lancée que si le type d'ombre changeait.
- Qualité qui tombait au minimum sur un iPhone en économie d'énergie : l'intervalle entre images était pris pour un coût. La résolution suit désormais le vrai coût, mesuré toutes les 2 s.
- Tracteur garé traversable. Itinéraire du retour absent de la carte. Conducteur qui ne se penchait pas.
- Gravillons noirs. Tracteur qui repartait seul. Fuite mémoire en changeant de personnage.
- Touches de l'accueil rejouées au lancement. Jeu pilotable derrière la carte de fin. Descente du tracteur au pouce.
- Signature décalée sur tablette. Allocations dans la mission. Panneau 50 coupé (atlas trop petit).

**Mesures** (Chrome sans fenêtre, M1, 390x844) : 45 à 67 appels de dessin ombres comprises (contre plus de 115 sur la place avant, sans les ombres) ; 1,5 à 1,7 ms par image en palier haut ; 60 images par seconde ; bridé à 30 images par seconde, le palier reste haut. Fichier : 676 Ko (192 Ko compressé). Parcours complet : 14 vérifications OK, aucune erreur.

**Non vérifié** : vrai téléphone (gestes, deux doigts, son), vraie manette.

## 22/11/2026 · Démo 0.5 : le jeu allégé au maximum

**Demande de Teddy** : « optimiser encore plus la lourdeur du jeu, au maximum ».

**Méthode** : mesurer avant de toucher. Nouveau scénario `poids` du banc d'essai (démarrage, mémoire, coût de chaque étape d'une image, processeur ralenti 4 fois pour approcher un téléphone moyen), profils du processeur, captures comparées au pixel près avant et après chaque changement. Un agent expert en parallèle, sur sa copie, pour alléger three.js dans le fichier livré.

**Constat** : sur ordinateur le jeu était déjà léger (moins de 2 ms de calcul par image). Ce qui pesait : le téléchargement (three.js fait les trois quarts du fichier), le démarrage (écran vide pendant la construction du monde, shaders compilés deux fois sur téléphone quand la qualité montait d'un palier), la mémoire (géométrie en nombres de 4 octets, atlas des enseignes à moitié vide), et le travail de la carte graphique (terrain entier dessiné même derrière la caméra, écrans à 120 Hz servis à 120 images/s).

**Fait**
- Démarrage : l'accueil s'affiche avant la construction du monde ; police Google non bloquante ; passants et clients du bourg créés juste après la première image ; formes de base copiées depuis des gabarits ; boucles du terrain et des couleurs réécrites ; atlas dessiné une fois à sa taille exacte.
- Shaders : sur téléphone, « haut » garde le filtre d'ombre à 4 lectures de « moyen » : plus de double compilation (37 programmes, désormais 19).
- Mémoire : attributs des géométries compactés (normale 3 octets, couleur 3, type 1) ; atlas des enseignes 1024 x 1164 au lieu de 1024 x 2048 ; facettes des cheveux et de la barbe cachées sous la peau retirées.
- Carte graphique : terrain en 21 morceaux qui partagent un seul tampon (seuls 5 ou 6 sont dessinés) ; vignes lointaines sans piquet ni dessous ; filtrage anisotrope selon le palier ; cadence plafonnée à 60 images/s, 30 sur l'accueil et derrière le téléphone, 15 derrière le PC et la carte de fin.
- Processeur : matrices du décor immobile calculées une fois.
- three.js allégé à la construction (agent, `scripts/allege-three.mjs`) : seules les matières basic, lambert et depth restent, GLSL élagué et minifié (texte GLSL envoyé à la carte graphique : 825 Ko ramenés à 350), code mort retiré. `scripts/essai-allege.mjs` prouve l'équivalence : mêmes programmes, mêmes shaders traduits par ANGLE, images identiques au bit près (à 2 unités près sur 1 ou 2 vues sur 7, le bruit ordinaire de la carte graphique).

**Mesures** (Chrome sans fenêtre, M1, 390 x 844, palier moyen, médiane de 5 chargements, avant / après) :

| | Processeur normal | Processeur ralenti 4 fois |
|---|---|---|
| Accueil affiché | 444 / 96 ms | 544 / 252 ms |
| Bouton Jouer actif | 512 / 370 ms | 2 082 / 1 176 ms |
| Image 3D prête | 588 / 467 ms | 2 147 / 1 253 ms |
| Construction du monde | 234 / 191 ms | 1 080 / 609 ms |

Fichier 677 / 514 Ko (192 / 159 Ko compressé). Géométrie en mémoire graphique 13,3 / 6,7 Mo, textures 14,6 / 10,4 Mo. Triangles sur la place, ombres comprises : 117 000 / 104 000 ; au palier faible, 59 000 à 87 000 avant, 37 000 à 61 000 après. Programmes de rendu : 19 (37 avant sur un téléphone dont la qualité montait d'un palier). Le coût processeur d'une image reste vers 1,1 ms (4,4 ms ralenti 4 fois) : il était déjà bas.

**Non vérifié** : vrai téléphone (le gain attendu le plus fort est sur les écrans à 120 Hz et sur la compilation des shaders, que la machine de test fait très vite).

## 22/11/2026 · Démo 0.5 : quantités à saisir, chèque en retard, règlement et DRM

**Demande de Teddy** : quantités à zéro dans le bureau, la mission donne la quantité ; un client en retard de paiement dans la tournée, on récupère son chèque ; retour au bureau pour déposer le chèque, saisir le règlement dans Vitisoft, facturer les 3 commandes ; générer la DRM du mois dernier.

**Fait**
- Bureau, formulaire de commande : quantité à 0, « Envoyer » grisé à 0. Une consigne de mission (cadre orange en tirets, c'est le jeu qui parle) rappelle la quantité dite au téléphone ; une mauvaise quantité ne part pas (son de refus, rappel de la quantité).
- Tournée à 4 arrêts : d'abord l'Épicerie du Bourg (client fictif, facture F-2026-0098, 4 cartons de rouge, 273,60 € TTC), dont le message arrive pendant le chargement. L'épicier attend devant sa boutique (nouvelle enseigne et étal de fruits dans le bourg) ; on récupère le chèque en tracteur ou à pied.
- Retour au chai : « Déposer le chèque » au bureau, puis « Ouvrir le PC ». Vitisoft s'ouvre sur « À faire ce soir » : saisir le règlement (la facture est soldée), facturer et envoyer les 3 commandes avec Pennylane, calculer la DRM du mois dernier (stock, entrées, sorties, en hectolitres, chiffres fictifs du domaine). Vitisoft ne se ferme sur la fin qu'une fois les trois faits.
- Textes et sources : « Vitisoft calcule votre DRM, vous la validez dans CIEL, chaque mois avant le 10 » et « exporte factures et encaissements vers le logiciel du comptable » (fiche de faits du 21/11/2026) ; saisie du règlement dans Vitisoft : demande de Teddy. Dans le bureau, l'arrêt du chèque est présenté comme « ce qu'il y a à faire chez chacun » (texte vérifié de la page du bureau). La carte de fin ne promet plus la DRM « dans le jeu complet ».

**Vérifié** : parcours complet au script, 23 vérifications (dont la quantité à zéro, la mauvaise quantité refusée, le chèque, le dépôt, le règlement, la DRM), téléphone et ordinateur, aucune erreur ; trois paliers sans erreur ; équivalence de l'allègement de three.js sur cette nouvelle partie ; captures de chaque nouvel écran regardées.

**À valider par Teddy** : le nom « Épicerie du Bourg » et le montant du chèque ; le libellé « Saisir le règlement » dans Vitisoft.

## 22/11/2026 · Démo 0.6 : radio, verre offert, voitures, tracteur ou van

**Demande de Teddy** : pouvoir éteindre la radio du tracteur ; une action du personnage, servir un verre de vin aux passants ; de meilleures voitures et une réaction quand on les touche ; choisir le tracteur ou un van pour livrer.

**Fait**
- Radio des véhicules : on la coupe ou la rallume en touchant son bandeau (il s'affiche à la montée), avec la touche R, le bouton LB de la manette, ou dans Réglages du téléphone. Le choix est gardé.
- Servir un verre : à pied près d'un passant ou d'un figurant assis, « Servir un verre ». Le personnage débouche, verse (bouteille au-dessus du verre), tend le verre ; l'autre trinque (réplique), boit, baisse son verre vide. Une fois par personne et par minute ; le personnage ne boit pas.
- Voitures (agent, `engins.js` et `modeles.js`) : trois silhouettes originales (citadine, berline, break), peinture qui reflète le ciel, vitres, chromes, phares, feux, plaques, jantes ; un seul appel de dessin par voiture.
- Chocs : une voiture accrochée se secoue, s'arrête, met ses feux de détresse, des éclats de carrosserie volent et le conducteur râle. À pied, une voiture qui roule vous repousse (saut de côté).
- Van de livraison (agent) : fourgonnette crème au liseré bordeaux et grappe sur les flancs, vitres transparentes (on voit le conducteur et les cartons), garée au domaine à côté du tracteur. Une seule physique réglée par véhicule : le van va plus vite sur la route (19 m/s contre 12,5), peine dans les vignes, son moteur tourne plus haut. On charge au chai avec l'un ou l'autre ; on ne livre qu'avec celui qui est chargé (sinon : « Les cartons sont sur le tracteur »). Mains sur la jante inclinée du volant.

**Vérifié** : parcours complet en tracteur et en van (`VEHICULE=van node scripts/essai.mjs parcours`), téléphone et ordinateur, aucune erreur ; essais au script de la radio, du verre, du choc, du mauvais véhicule ; captures regardées ; équivalence de l'allègement de three.js. Appels de dessin au domaine en palier moyen : 46 avant, 64 avec le van garé (roues et vitres à part) ; ailleurs, peu de changement.

**Non vérifié** : vrai téléphone, vraie manette.

## 22/11/2026 · Le jeu s'appelle « Tournée générale »

**Demande de Teddy** : changer le titre (« Vin et business ? Ou autre ? »). Choix de Teddy parmi quatre propositions : « Tournée générale », pour le double sens de la tournée de livraison et de la tournée qu'on offre (le verre servi aux passants). Recherche rapide : aucun jeu vidéo de ce nom trouvé.

**Changé** : titre de la page et description, logo de l'accueil (deux lignes, un peu d'interligne pour les accents de « GÉNÉRALE »), carte de fin, Réglages du téléphone, `CLAUDE.md`. Le lien de prévente porte désormais `?source=jeu-tournee-generale`. Le vin du domaine reste la « Cuvée du Clos ». Préférences gardées dans le navigateur renommées (`tournee-generale-heros`, `tournee-generale-radio`).

**Vérifié** : accueil en 390 x 844, 360 x 640, 844 x 390 et 1280 x 800 ; parcours complet sans erreur.

## 22/11/2026 · Démo 0.7 : règlement planifié, conduite assistée au doigt

**Demandes de Teddy** : le règlement en retard ne vient pas d'un client qui appelle ; c'est le vigneron qui le déclenche dans ses tâches du jour pour gérer sa tournée. Sur téléphone, la conduite est encore trop difficile : la repenser.

**Règlement en retard** : « Ma journée » du bureau a une rubrique « Règlement en retard » (Épicerie du Bourg, facture F-2026-0098, 273,60 €) avec « Ajouter à la tournée ». C'est la 4e tâche du jour : on ne part au chai qu'une fois les 3 commandes envoyées et ce passage ajouté. Plus de message spontané de l'épicier ; à l'épicerie, c'est le vigneron qui vient réclamer (« Je passe pour la facture en retard »). Source : la demande de Teddy (« c'est toi qui le déclenches dans les tâches du jour »).

**Conduite au doigt, repensée** (`src/pilote.js`) :
- doigt posé = on avance ; doigt levé = on s'arrête en douceur ;
- pendant la mission, le véhicule suit tout seul l'itinéraire : file de droite sur la départementale, plus lent dans les virages, il ralentit derrière une voiture et devant l'autre véhicule, s'arrête à destination, fait son demi-tour en trois temps dans les rues étroites (il sonde devant et derrière : murs, arbres, voitures) ;
- glisser sur le côté = on tourne soi-même (l'assistance reprend quand on recentre le doigt près de l'itinéraire) ; vers le bas = freiner, puis reculer ; vers le haut = un peu plus vite ;
- itinéraire de la place redessiné (évite la fontaine, le monument, les bancs) ; tracteur et van garés à l'ouest de la cour, tournés vers le chai, hors du passage.

**Vérifié** : nouveau scénario `node scripts/essai.mjs conduite` (toute la tournée, doigt posé sans tourner) : tracteur 141 s de jeu, van 131 s, aucun choc ; parcours complet sans erreur.

## 22/11/2026 · Démo 0.8 : personnages plus réalistes, visages et vêtements texturés

**Demande de Teddy** : « personnages plus réalistes, visages et vêtements texturés ». Une première tentative (formulée en citant un jeu existant) a été arrêtée par le filtre de sécurité de l'API ; relancée avec cette formulation, par un agent sur une copie du projet.

**Fait** (`src/atlas.js`, `src/perso.js`) :
- Une texture partagée par tous les personnages (1024 x 512, dessinée en code) : 3 visages, yeux, main, poche et 18 tissus (toile, jean, maille, côtes, matelassé, oxford, carreaux, cuir, velours, feutre...). Elle module la couleur des sommets : un visage sert à tous les teints, un tissu à toutes les couleurs. Coordonnées dans le repère du personnage : les motifs suivent le corps.
- Visages : yeux avec blanc, iris, pupille, cils et reflet ; sourcils, nez arrondi, lèvres ; ombres sous le nez et le menton ; barbe de quelques jours ou courte barbe.
- Cheveux à mèches, implantation douce ; formes plus lisses à nombre de triangles égal ; mains avec paume, doigts repliés, pouce et ongles ; chaussures arrondies sur semelle ; tête et épaules plus réalistes. Les passants gardent leurs tenues tirées au sort.
- Corrigé : monter dans un véhicule en plein service laissait la bouteille et le verre dans les mains du conducteur.

**Coût** : 2 500 triangles par personnage en moyenne (2 300 avant) ; toujours un appel de dessin par personnage ; texture 2,7 Mo en mémoire graphique ; 15 personnages construits en 64 ms au lieu de 25 (dont 24 ms pour l'atlas, une fois) ; image 3D prête vers 250 ms sur ordinateur. Fichier 582 Ko (186 Ko compressé).

**Vérifié** : parcours en tracteur et en van, conduite assistée (aucun choc), ordinateur, trois paliers, équivalence de l'allègement de three.js ; planches avant et après regardées (visages, corps, gestes : boire, servir, conduire).

## 22/11/2026 · Mis en ligne sur GitHub Pages

**Demande de Teddy** : pousser sur git et héberger le jeu sur GitHub. Premier commit sur `main` (le dépôt était vide), GitHub Pages activé sur `main`, à la racine. Adresse : https://professeurt.github.io/Solugame/ . Vérifié depuis l'adresse publique : la page se charge, l'image 3D est prête, aucune erreur. Le dépôt est public : `CLAUDE.md` et `JOURNAL.md` y sont lisibles.

## 23/11/2026 · Audit de propreté, lot 1

**Demande de Teddy** : un audit rapide de la propreté du code, puis du travail par lots poussés au fur et à mesure. Nouvelle règle : Claude pousse lui-même sur `main` quand tout est au vert (build, parcours, `index.html` à jour).

**Constat** : code propre (aucun TODO, aucun `console.log`, aucun code en commentaire, build reproductible, rien de personnel dans le dépôt public). ESLint (lancé hors du projet) : 3 variables inutilisées dans `src/`.

**Fait** :
- Code mort retiré : `NOM_VEH` (main.js), `CR` (engins.js), import de `NB_PAVES` (perso.js : le shader a sa propre constante via `GLSL_ZONES`), `maillage()` et `MAT_I` (modeles.js, jamais utilisés), `t0Page` (essai.mjs).
- Le tirage au sort reproductible (mulberry32) était copié dans main.js, monde.js et perso.js : une seule version, `hasard(graine)` dans outils.js.
- `sonder()` réutilise `mesurer()` au lieu de la recopier (main.js).
- CLAUDE.md : `hud.js` et `pilote.js` ajoutés au tableau ; rôle de `textes.js` décrit tel qu'il est (les libellés d'interface restent dans leur module) ; nouvelle règle de push.

**Vérifié** : empreinte de la scène (toutes les géométries, instances et tenues, palier forcé « moyen ») identique avant et après (`527d0b7a`) : même monde, mêmes passants. Parcours en tracteur et en van : « Aucune erreur. ». ESLint : plus rien hors faux positifs des bancs d'essai.

**Reste à décider** (lot 2) : sortir de main.js les paliers de qualité (environ 130 lignes) et les particules (environ 90) ; une commande `npm run verifie` (build, `index.html` à jour, parcours) avant chaque push.

## 23/11/2026 · Lot 2 : `npm run verifie`

**Fait** : `scripts/verifie.mjs`, lancé par `npm run verifie` avant chaque push. Il construit le jeu (le build refuse déjà les tirets longs), joue la mission entière en tracteur et en van en même temps (5 s environ), puis regarde git. Trois issues : « Prêt à pousser » (dernier commit vérifié) ; « Tout est vert, à commiter » avec la liste des fichiers ; échec (code 1) si le build ou un parcours échoue, ou si le dernier commit contient `src/` sans l'`index.html` reconstruit (pousser mettrait en ligne une version en retard).

**Corrigé au passage** (`scripts/build.mjs`) : le message « Tiret cadratin trouvé dans... » se perdait quand la sortie passait par un tube (macOS diffère l'écriture et le script quittait avant) ; il attend maintenant que le message soit écrit.

**Vérifié** sur une branche jetable : cas normal (« Prêt à pousser ») ; tiret cadratin glissé dans `src/` (code 1, message affiché) ; commit de `src/` sans `index.html` (code 1, « L'ajouter au commit avant de pousser »).

## 23/11/2026 · Mission enrichie, lot 1 : monter et descendre des véhicules

**Demande de Teddy** (pour toute la suite) : une étape de plus dans la mission (aller voir un prospect dans une autre partie de la ville, ajouté à la tournée au départ) ; un bureau du chai où l'on entre (animation de dehors à dedans), avec un portable sur un bureau en bois : Le bureau et Vitisoft ; des animations pour monter en voiture, charger et décharger les cartons. Choix de Teddy : chez le prospect, dégustation puis rappel noté dans le bureau (pas de commande) ; une vraie pièce où l'on marche ; sur le portable, Le bureau et Vitisoft. Ordre de travail : 1. monter et descendre, 2. cartons, 3. bureau du chai, 4. prospect.

**Source vérifiée pour le prospect** (vitisoft.fr/fonctionnalites/le-bureau-application-commerciale, lue le 23/11/2026) : « Prospection : Cavistes, restaurants, importateurs : suivis jusqu'à la commande. » ; fiche client : « Le fil du client : appels, notes, factures, commandes signées en ligne. » ; « Chaque matin, il vous dit qui rappeler, quoi proposer et pourquoi » ; « Au domaine sur l'ordinateur, au salon sur la tablette, en tournée sur le smartphone ». Pas de mention de dégustation (c'est un geste du jeu, pas une promesse produit). La page dit aussi que le bureau est « en cours de lancement ».

**Fait (lot 1)** :
- `src/gestes.js` : gestes joués tout seuls, étape par étape. Monter : on marche jusqu'au marchepied du tracteur, ou juste derrière la portière du van (hors de son passage) ; la portière s'ouvre, on s'installe en se baissant, elle se referme. Descendre : l'inverse, on pose le pied au sol tourné vers l'extérieur.
- `anim.js` : pose de transition, les poses debout et au volant mélangées os par os ; les mains ne prennent le volant qu'à la fin.
- `engins.js` : vraie portière du conducteur sur le van (pièce à part, avec sa vitre, son liseré, sa poignée, sur une charnière) ; marchepieds sur le tracteur.
- `audio.js` : loquet, portière qui claque, pied sur le marchepied.
- Corrigé au passage (`vehicules.js`) : en livrant La Treille (côté nord), le van arrêté entre deux voies bloquait les deux sens ; une voiture et lui s'attendaient sans fin (vu par le banc `conduite` en van, une fois le départ décalé de 3 s par le geste). Une voiture tient maintenant compte de la largeur de l'obstacle (`demiLarg`) pour savoir s'il est dans sa voie.

**Vérifié** : captures image par image des deux gestes (montée, descente, tracteur et van) ; `npm run verifie` ; conduite assistée complète en tracteur et en van avec 6 décalages de départ (0 à 8 s) : tournée finie à chaque fois, aucun choc sauf un, en tracteur à +8 s, qui existait déjà avec l'ancien code (même essai sur l'ancienne règle : même choc).

**À regarder plus tard** : `scripts/essai-perso-jeu.mjs` échoue sur « un passant a sauté de côté (0 image en l'air) », avant comme après ce lot (même échec avec le code d'avant) : le banc ne trouve plus de passant à viser, ou le tracteur ne les atteint plus.

## 23/11/2026 · Lot 2 : les cartons, portés à la main

**Fait** :
- Au chai : une palette des commandes du jour, juste à droite de l'endroit où la conduite assistée gare le véhicule (mesuré : vers (-83,4 ; -47,4), cap 2,83). On descend, on ouvre la porte coulissante (van), on porte les 4 piles (3 + 3 cartons pour la Cave du Pressoir, 2 pour le Bar Le Cep, 3 pour La Treille), la plus proche d'abord, et on les range dans le véhicule ; on referme, on remonte. La palette se vide, le plateau ou le van se remplit colonne par colonne.
- Chez chaque client : on descend, on prend ses colonnes, on les porte jusqu'à lui et on les pose en rang à ses pieds (elles y restent), puis il signe le bon de livraison ; ensuite on retourne au volant tout seul. La balise de mission s'efface pendant ce temps.
- `anim.js` : pose « porter » (les deux mains au carton du bas, bras fixes en marchant) et accroupi selon la hauteur de la pile (palette, sol, plancher du van, plateau du tracteur). Trop loin pour les bras, on tire la pile à soi, ou on la pousse au fond.
- `engins.js` : un carton commun ; 6 colonnes de 3 dans chaque véhicule ; porte coulissante du van (pièce à part, qui contourne le passage de roue) ; côtés de chargement.
- Caméra : cadrage de scène pendant les cartons, de côté, à l'opposé du véhicule (sinon il cache tout). Doigt posé ou flèche enfoncée : la scène va trois fois plus vite (annoncé une fois, au premier chargement).
- Les étoiles de retard ne montent pas pendant un geste.

**Vérifié** : captures du chargement et d'une livraison (tracteur et van) ; `npm run verifie` (28 étapes par parcours : chargement commencé, palette vide, cartons posés avant le bon de livraison, retour au volant, 11 cartons devant les clients) ; conduite assistée complète, tracteur et van, avec 3 décalages de départ : tournée finie, aucun choc. Durée d'un chargement au chai : environ 20 s (moins de 10 s en accéléré).

## 23/11/2026 · Lot 3 : le bureau du chai, où l'on entre

**Fait** :
- `monde.js` (`chaiEtBureau`) : au bout sud du chai, une vraie pièce de 4,5 x 5,1 m sous plafond à 2,8 m, porte « BUREAU » sur la façade (avec applique ; la fenêtre du bureau est éclairée). Dedans : parquet, lambris et plâtre, poutres, suspension ; le bureau en bois contre le mur est (caisson à tiroirs, le portable ouvert, une lampe, une tasse, des papiers), la chaise, une étagère (classeurs, bouteilles), une caisse de vin, un classeur métallique, une plante, un portemanteau et sa veste, la carte des parcelles au mur, un tapis bordeaux. Même extérieur que l'ancien chai et mêmes tirages au sort : le reste du monde ne bouge pas. L'intérieur est un maillage à part, éclairé sans ombre portée.
- `gestes.js` : entrer (on va à la porte, elle s'ouvre vers l'intérieur, au seuil un fondu au noir d'un quart de seconde, la caméra passe dans un coin de la pièce, la porte se referme) ; sortir, l'inverse ; s'asseoir au portable, se lever (`anim.js` : transition debout-assis sur une chaise, pose au clavier).
- Le portable (`pc.js`, l'ancien PC) : un navigateur à deux onglets, Le bureau et Vitisoft. Le bureau y montre les mêmes écrans que sur le téléphone (Ma journée, Commandes, Tournée, ajouter à la tournée, lancer la tournée) ; un appel part du téléphone, puis on revient au portable. Source : la page du bureau dit « Au domaine sur l'ordinateur, au salon sur la tablette, en tournée sur le smartphone ».
- Mission : au retour, on rentre au bureau du chai, on dépose le chèque sur le bureau (il y reste), on s'assoit au portable : Vitisoft s'ouvre. Itinéraire du retour jusque devant la porte. Textes : « le PC » devient « le portable du bureau du chai ».

**Vérifié** : captures de l'entrée (porte, fondu, caméra de la pièce), de l'arrivée au portable, du portable (onglets Le bureau et Vitisoft) sur ordinateur et sur téléphone 390 x 844 ; `npm run verifie` (30 étapes par parcours) ; conduite assistée complète en tracteur et en van, aucun choc ; coût d'une image au domaine : +2 appels de dessin, +1 000 triangles, même durée.

## 23/11/2026 · Lot 4 : le prospect des Grands Champs · Démo 0.9

**Fait** :
- `monde.js` (`hameau`) : un hameau neuf au sud des vignes, les Grands Champs, au bout d'un chemin de terre qui part de la départementale en x = -55 (entre deux parcelles, panneau à l'entrée). Une placette, l'Auberge du Moulin (vitrine, store bordeaux, terrasse, ardoise), un moulin de tuffeau dont les ailes tournent, trois maisons, un puits, un banc, des arbres, une voiture garée. Construit avec son propre tirage au sort : le reste du monde ne bouge pas (les herbes du chemin sont retirées après coup).
- Mission : une 5e tâche du jour dans le bureau, le prospect (« Ajouter à la tournée ») ; la tournée passe à 5 arrêts, l'auberge en dernier. Sur place, l'aubergiste nous accueille ; on descend et on lui sert un verre (le geste qui existait), il goûte, donne son avis et demande qu'on le rappelle ; la visite est notée dans le bureau (rubrique Prospect : « À rappeler », la note de visite) et l'on rentre au bureau du chai. Bannière et carte de fin : « un prospect à rappeler ». Source des textes : la page du bureau (prospection « suivie jusqu'à la commande », « le fil du client : appels, notes... », « qui rappeler »), notée dans `textes.js`. Choix de Teddy : pas de commande chez le prospect.
- Conduite assistée (`pilote.js`, `vehicules.js`, `mission.js`), corrigé en chemin, car la tournée en passe plus par les bouts de route :
  - itinéraire de chaque étape depuis le point de l'arrêt précédent : garé un peu avant La Treille, le véhicule voulait encore l'atteindre avant de faire demi-tour, et fonçait dans les voitures qui l'attendaient ;
  - au bout d'un chemin ou d'une rue, on arrive assez lentement pour pouvoir s'arrêter au bord, et on cède le passage aux voitures qui arrivent (le van débouchait du chemin à 12 m/s) ;
  - les voitures voient l'emprise réelle d'un véhicule du domaine (ses deux cercles, dans son sens : en travers, il dépasse sur la route) et s'arrêtent à 6 m devant lui, pour lui laisser la place de manœuvrer ; pendant un demi-tour, on regarde aussi où seront les voitures dans 1,5 s.

**Vérifié** : captures du hameau (du ciel, du chemin, de la placette), de la visite (arrivée, « Servir un verre », dégustation, bannière) et du bureau après la visite ; `npm run verifie` (33 étapes par parcours) ; conduite assistée complète, tracteur et van, avec 6 décalages de départ (0 à 8 s) : 12 tournées finies, aucun choc (le choc ancien du tracteur à +8 s a disparu aussi) ; banc d'allègement de three.js : équivalent, parcours complet aux trois paliers.

## 23/11/2026 · Retours de Teddy (1) : anachronismes, chemin, roues

**Demande de Teddy** : attention aux anachronismes (Vitisoft n'a rien tant qu'on n'a pas fait les commandes dans le bureau) ; le nouveau chemin déborde un peu sur la départementale ; le personnage traverse les véhicules ; des humains plus humains ; un tracteur plus réaliste ; les roues des voitures doivent tourner. En quatre lots : A (ce lot), B (mouvements), C (tracteur), D (humains).

**Fait (lot A)** :
- Vitisoft (`pc.js`) : une commande n'y arrive qu'une fois signée en ligne par le client (avant : « Aucune commande arrivée pour l'instant »). « À faire » ne montre que ce qui a une raison d'être : saisir le règlement une fois le chèque déposé au bureau, facturer une fois les commandes livrées (« Facturer les 2 commandes livrées »...) ; la DRM du mois dernier, quand on veut. Règlements : la facture en retard est là, mais sans « Saisir le règlement » ni mode de paiement tant que le chèque n'est pas arrivé.
- Le bureau (`telephone.js`) : l'onglet Commandes ne montre une commande qu'à partir de l'appel (elle se prépare pendant) ; avant, « Pas encore de commande aujourd'hui ».
- Le chemin des Grands Champs commence au bord de la chaussée (z = 13,5) : il recouvrait un mètre de route et la ligne de rive.
- Les roues des voitures qui roulent tournent (un maillage par essieu, deux roues chacun : 2 appels de dessin par voiture visible ; les voitures garées gardent leurs roues fusionnées).

**Vérifié** : banc `parcours` avec trois nouvelles vérifications (au départ, rien dans Vitisoft ni dans le bureau ; les 3 commandes signées arrivent dans Vitisoft, pas encore à facturer) ; capture du débouché du chemin ; vitesse de rotation des roues mesurée (35,5 rad/s à 11 m/s, rayon 0,31 m) ; conduite assistée complète en tracteur et en van.

## 23/11/2026 · Retours de Teddy (2) : le personnage ne traverse plus les véhicules

**Fait (lot B)** :
- Chaque véhicule du domaine a une emprise au sol (`dims.emprise` dans engins.js : quelques rectangles, roues arrière, caisse, essieu avant, plateau pour le tracteur ; la caisse pour le van). Pendant un geste, chaque trajet à pied qui couperait un véhicule le contourne par un ou deux de ses coins, le plus court (`contourner` dans gestes.js), sans s'arrêter aux points de passage. Un bout de trajet tout contre le véhicule (marchepied, côté du plateau) se contente de l'emprise exacte.
- Pour charger ou décharger, on ne choisit qu'un côté où l'on peut se tenir (pas contre un mur, une table, une voiture garée) ; le tracteur se charge aussi par l'arrière du plateau.
- Sur le plateau du tracteur, une pile passe par-dessus la ridelle (soulevée, glissée à hauteur, posée), dans les deux sens ; montée sur le tracteur un peu écartée de la roue arrière.
- Bancs d'essai : une sonde compte les images où le personnage, à pied pendant un geste, est dans l'emprise d'un véhicule (`CL.dansVehicule`, `CL.traversees`) ; vérifiée dans `parcours` et `conduite`.

**Vérifié** : la sonde trouve le défaut sur l'ancien code (1 022 images en tracteur, 1 483 en van) ; 0 maintenant, en parcours comme en conduite assistée, tracteur et van ; captures du chargement (contournement par l'avant, piles par-dessus la ridelle).

## 23/11/2026 · Retours de Teddy (3) : un tracteur plus réaliste

**Fait (lot C)** : le tracteur refait (`engins.js`), mêmes mesures (roues, siège, volant, plateau, collisions), orange, sans marque :
- capot façonné en sections, qui s'affine et s'abaisse vers l'avant ; calandre sombre à lamelles et cadre, phares ronds cerclés, ouïes, bande sombre et filet crème ; bouchon de réservoir, préfiltre à air, échappement vertical avec pare-chaleur et chapeau ;
- dessous : moteur, carter, support et essieu avant, masses avant et crochet ; transmission et pont arrière ;
- pneus agricoles : épaules arrondies, gros flancs, crampons en chevrons décalés (pointe en avant quand on avance), jante peinte en retrait à voile, moyeu et écrous ;
- garde-boue galbés (arc, rebord, joue intérieure), feux arrière ;
- poste de conduite : plancher strié, marchepieds et poignées, pédales, trois leviers à pommeau, planche de bord orange et ses deux compteurs, siège suspendu (soufflet, coussin, dossier incliné, accoudoirs) ;
- arceau à deux montants derrière le siège, toit pare-soleil en porte-à-faux sur jambes de force (plus de montant avant : la montée par le marchepied gauche est dégagée), phares de travail, gyrophare, rétroviseurs ;
- arrière : relevage trois points, protection de prise de force, plateau des cartons et ses supports, plaque.

**Vérifié** : captures sous quatre angles, montée et descente image par image ; parcours et conduite assistée en tracteur, aucune traversée, aucun choc ; coût au domaine : 99 appels de dessin, 116 000 triangles ombres comprises (101 000 avant), 1,3 ms par image.

## 23/11/2026 · Retours de Teddy (4) : des personnages plus humains

**Constat** (banc des personnages, avant) : buste en boîte, épaules en boules, articulations qui cassent net comme un pantin (chaque pièce suivait un seul os), cou en colonne sous la mâchoire, tête en œuf au profil plat, bras tout droits collés au corps, de longs cheveux qui enfermaient le visage.

**Fait (lot D)** :
- Peau souple (`perso.js`, `liens`) : près d'une jointure, un sommet suit aussi l'os voisin, jusqu'à la moitié à la jointure même : épaules, coudes, poignets, hanches, genoux, taille, bas du cou. Une jupe suit un peu les jambes.
- Formes : buste et bassin à 12 pans (au lieu de 8), membres à 9 (au lieu de 7), mollet galbé en haut du tibia, cheville plus fine ; cou plus épais à la base, qui s'affine sous la mâchoire ; tête (et ce qu'elle porte) 6 % plus grande.
- Visage (`reliefVisage`) : arcades, orbites, pommettes, avancée de la bouche, menton, joues un peu creusées chez l'homme, front qui fuit un peu. Le crâne, les cheveux, la barbe, les yeux, les sourcils et le nez suivent le même relief.
- Cheveux longs et coupe au carré : ils partent de devant les oreilles et laissent les joues libres (avant, le visage paraissait encagoulé).
- Pose de repos (`anim.js`) : bras un peu écartés du corps, coudes légèrement pliés.

**Vérifié** : banc des personnages (galerie, visages de face et de trois quarts, marche, assis, téléphone) et captures en jeu (héros qui marche, place du bourg, terrasse) ; `npm run verifie`, conduite assistée en tracteur et en van ; coût : 0,04 ms par image pour poser 14 personnages, image 3D prête à 331 ms.

## 23/11/2026 · Passe d'assainissement (1) : outils communs, code mort, banc des personnages

**Demande de Teddy** : une nouvelle passe pour repérer les autres problèmes et assainir le code au maximum ; l'optimisation est la clé.

**État des lieux** : ESLint ne trouve rien ; tous les bancs passent (accueil téléphone et ordinateur, photo, parcours, conduite) sauf `essai-perso-jeu`. Sur un processeur 4 fois plus lent, une image coûte environ 3 ms et le démarrage 1,4 s jusqu'à l'image 3D. Environ 30 Ko alloués par image (surtout des nombres mis en boîte par V8 dans les poses, la caméra, les voitures).

**Fait** :
- Outils communs (`outils.js`) : `borne` (copiée 7 fois), `lisse` et `entre` (4 copies, deux formes), `mix`, `amortir`, `assombrir`, `$`, `esc` ; chaque module importe ce qu'il lui faut. Le monde est identique (même empreinte de scène, 10 lancements sur 10).
- Code mort : 5 règles CSS (`vtuiles`, `vtuile`, `fc-ligne`, `coche`, `vs-x`) et un dialogue (`chequePied`).
- Chaque image : plus de fonction neuve pour chercher à qui servir un verre ni pour le boire, plus de tableau neuf pendant un demi-tour du pilote, plus de déstructuration de tableau dans le calcul des voitures.
- `essai-perso-jeu` : il échouait (« aucun passant n'a sauté ») depuis la conduite repensée du 22/11 : le tracteur accélère plus doucement et n'atteignait jamais le passant visé en 1,8 s. Le banc le laisse maintenant arriver (5 s au plus) : les passants sautent bien de côté. Le jeu n'était pas en cause.

## 23/11/2026 · Passe d'assainissement (2) : moins d'appels de dessin

**Fait** :
- Cartons en instances : ceux d'un véhicule ne font plus qu'un appel de dessin (seuls les visibles sont dessinés ; chaque carton reste un petit objet `{ position, visible }`, le reste du code n'a pas changé), une pile (palette, bras, devant un client) un seul.
- La pièce du bureau du chai n'est dessinée que si on la voit (dedans, ou porte ouverte).
- Dans le bureau : la caméra ne dessine qu'à 16 m (le monde extérieur, derrière les murs, et le ciel ne sont plus dessinés) et la carte d'ombre n'est plus recalculée (la pièce ne reçoit pas d'ombre portée).

**Mesuré** (téléphone 390 x 844, palier moyen ; appels de dessin, ombres comprises) : chai avec le tracteur chargé 86 → 65 ; sur la route 88 → 68 ; domaine 86 → 79 ; place après les livraisons 80 → 74 ; dans le bureau 73 → 44 et 107 000 → 59 000 triangles (et, en jeu, sans passe d'ombre). Scène : 682 → 621 objets, 484 → 423 matrices recalculées par image.

**Vérifié** : captures du chargement et d'une livraison en van (palette, van chargé vu par les vitres) ; `npm run verifie` ; conduite assistée complète en tracteur et en van ; banc d'allègement de three.js : équivalent.

## 23/11/2026 · Passe d'assainissement (3) : `main.js` découpé

**Constat** : `main.js` faisait 1 000 lignes et mêlait tout (paliers de qualité, particules, ombres de contact, bureau du chai, conduite, servir un verre, boucle, banc d'essai).

**Fait** : trois parties autonomes sortent dans leur module, sans rien changer au jeu (mêmes objets, créés dans le même ordre, même tirage au sort pour les particules et les passants) :
- `qualite.js` (`Paliers`) : estimation au démarrage, sonde pendant l'accueil, résolution adaptative, compilation des shaders en tâche de fond ; le jeu n'y branche que ses propres réglages (ciel, portée de la caméra, ombres de contact).
- `particules.js` (`Particules`, `Taches`) : fumée, feuilles, gravillons, fontaine ; ombres de contact refaites à chaque image (`debut`, `poser`, `fin`).
- `bureau.js` (`Bureau`) : la porte, le chèque, le portable, ses étiquettes et sa caméra ; chaque présence n'est plus calculée deux fois par image.

`main.js` passe à 800 lignes.

**Vérifié** : empreinte de la scène identique à celle du lot précédent ; mêmes appels de dessin et triangles aux six endroits mesurés ; `npm run verifie` ; conduite assistée en tracteur et en van (aucun choc, aucune traversée) ; accueil (la sonde monte bien à « haut » sur ordinateur) ; banc des personnages en jeu ; banc d'allègement de three.js : équivalent.

## 23/11/2026 · Retours de Teddy (5) : des cous humains

**Demande** : « les cous sont trop longs, trop bizarre » ; rendre les personnages beaucoup plus humains.

**Constat** (portraits de face, de profil, de trois quarts et de dos) : le cou était une tige fine et droite sous une tête en œuf ; le haut du buste, une étagère plate d'où sortaient des épaules en boules coiffées d'un disque ; la nuque nue jusqu'au milieu du crâne (les cheveux courts s'arrêtaient trop haut) ; des pointes de col en nœud papillon ; des lunettes plus larges que le visage, branches dans le vide.

**Fait** (`perso.js`) :
- Cou : plus épais (environ 13 cm chez l'homme, 11 chez la femme, selon la corpulence), un peu penché vers l'avant et plus profond sous la mâchoire ; la nuque remonte jusqu'à l'occiput. La tête est 1 cm plus bas et un peu plus en avant (port de tête naturel).
- Trapèzes : le haut du buste monte en pente douce des épaules à la base du cou, plus haut derrière que devant ; poitrine un peu en avant, haut du dos arrondi.
- Épaules : le haut du bras s'arrondit en dôme (deltoïde) dans le prolongement de la pente, au lieu d'une boule posée sur un tube.
- Cols inclinés autour de la base du cou, à sa taille (`col`) : col montant des vestes, col rond des pulls, encolure des robes, pied de col et pointes rabattues des chemises.
- Bretelles de salopette et cordons de tablier qui passent sur les épaules en suivant leur forme (`sangle`).
- Cheveux courts jusqu'à la nuque ; oreilles plus bas (du sourcil au bas du nez), arrondies ; mâchoire d'homme moins pointue ; lunettes à la largeur du visage, branches qui longent la tête jusqu'aux oreilles.

**Vérifié** : portraits avant et après sous quatre angles, en pied ; poses (téléphone, salut, assis, au volant), port des cartons, personnages dans le bourg ; `npm run verifie` ; conduite assistée en tracteur et en van (aucun choc, aucune traversée). Coût : même calcul des poses ; environ 270 triangles de plus par personnage (+4 % sur la place, la plus peuplée) ; démarrage inchangé.

## 23/11/2026 · Retours de Teddy (6) : un vrai village, des toits fermés

**Demande** : « améliorer le sol et les toits... on voit des fentes entre les murs et les toits » ; l'impression d'un petit village viticole, de vieilles bâtisses, un sol tantôt pavé, tantôt en route ; une croix et une église.

**Cause des fentes** : les toits étaient de simples surfaces sans épaisseur, invisibles par en dessous ; vu de la rue, on voyait le ciel entre le haut des murs et le bord du toit. Les pignons étaient des triangles d'ardoise flottant à 40 cm des murs.

**Fait** :
- Toits (`toit`, modeles.js) : pans épais posés sur les murs, débord à l'égout et aux rives, dessous en voliges, épaisseur visible, tuiles faîtières ; pignons en pierre dans le plan des murs. Toutes les maisons, le chai, l'église, le château.
- Vieilles bâtisses (`maison`, monde.js) : murs en tuffeau, en moellons ou enduits à la chaux (qui tombe par plaques en pied de mur) ; chaînes d'angle et encadrements de pierre de taille sur les deux derniers ; corniche sous l'égout, appuis de fenêtre, seuil de pierre, souche de cheminée et ses pots, lucarnes de tuffeau sur les toits ; trois teintes d'ardoise ; vigne vierge rougie sur certains pignons, treille avec ses grappes sur certaines façades. Deux nouvelles matières dessinées dans le shader (moellons, enduit).
- La rue : murs de clôture en moellons entre les maisons, chaperon de tuffeau, portails de bois dans les plus longs.
- Sols : dans le bourg, la départementale devient une vieille chaussée plus claire, sans bandes blanches, entre deux caniveaux pavés, bordée de pierre ; pavée au cœur du bourg (devant l'épicerie, au carrefour, devant la Treille) ; la rue de la place en petits pavés (nouvelle matière) ; parvis de l'église. Les sons et les secousses des véhicules suivent (`natureSol`).
- L'église Saint-Vincent : contreforts, chevet arrondi et son toit conique, baies en plein cintre dans leur encadrement, clocher avec bandeau, corniche, abat-sons sur les quatre faces, horloge, rosace, porche en plein cintre et ses marches, flèche d'ardoise à huit pans, croix et coq ; croix de pierre au pignon du chevet.
- Deux croix : un calvaire de pierre à l'entrée du bourg, une croix de fer sur son socle face au chemin des Grands Champs.

**Coût** : le décor du bourg passe de 20 000 à 36 600 triangles (ombres non comprises) ; les chaînes d'angle et encadrements sont des plaques plates (un quadrilatère) et les toits rejoignent directement le décor du quartier, pour que la construction du monde ne coûte rien de plus (environ 130 ms sur ordinateur, avant comme après). Mêmes appels de dessin.

**Vérifié** : captures de la rue, de la place, de la rue de la place, du carrefour, du chevet, du calvaire, du domaine, vue d'en haut ; `npm run verifie` ; conduite assistée complète en tracteur et en van (aucun choc, aucune traversée) ; accueil ; banc d'allègement de three.js : équivalent ; ESLint.

## 23/11/2026 · Retours de Teddy (7), lot 1 : freiner et déraper

**Demande** : permettre le frein et donc de déraper avec les véhicules.

**Fait** :
- Physique (`vehicules.js`) : le véhicule garde une vitesse de côté que les pneus freinent jusqu'à leur adhérence. En conduite normale elle est effacée à chaque instant (rien ne change, conduite assistée comprise). Au frein à main, l'arrière se bloque, l'adhérence de côté tombe, l'angle de braquage n'est plus borné par l'adhérence et la rotation prend de l'élan : le véhicule part en travers, on contre-braque pour le tenir. Un gros freinage en plein virage fait aussi glisser, un peu.
- Commandes : au doigt, vers le bas et sur le côté quand on est lancé ; espace au clavier ; RB (ou X au volant) à la manette. Aides de l'accueil et dialogue de conduite mis à jour.
- Effets : traces de pneus sur l'asphalte et les pavés (instances dans une réserve tournante, seule la bande ajoutée est envoyée à la carte graphique), fumée des pneus ou poussière selon le sol, crissement synthétisé (sifflement qui ondule et souffle serré), roues arrière qui ne tournent plus.

**Vérifié** : van lancé à 15 m/s puis frein à main à gauche : demi-tour en glissant (jusqu'à 8 m/s de côté), traces visibles ; le tracteur, plus lent, de même ; `npm run verifie` ; conduite assistée complète en tracteur et en van (aucun choc, aucune traversée).

## 23/11/2026 · Retours de Teddy (7), lot 2 : le moteur au régime sec

**Demande** : optimiser le moteur de manière ultra sévère, le jeu le plus fluide possible, dans le navigateur, avec les dernières techniques.

**Mesures d'abord** (en coupant une à une les parties de l'image) : en qualité haute, la passe d'ombre faisait 40 à 50 % du coût d'une image ; ensuite les personnages (dessinés deux fois, image et ombre, avec leur squelette), puis décor, vignes, herbe et terrain. Et presque toute la géométrie était « dépliée » : chaque triangle a ses trois sommets à lui, un coin de pavé est calculé six fois.

**Fait** :
- Géométrie indexée (`indexer`, modeles.js) pour le décor fusionné, les personnages, les véhicules et les voitures : 479 000 → 190 000 sommets (−60 %), mémoire de la géométrie 10,5 → 4,8 Mo. Chaque sommet n'est plus calculé (ni déformé par les os) qu'une fois. Le hachage travaille sur les bits des nombres, avec un brassage (les flottants « ronds » ont leurs bits de poids faible à zéro) : environ 8 ms pour 216 000 sommets.
- Passe d'ombre : dans chaque quartier, les petits détails (cadres, volets, vitres, appuis, portes plaquées, pots) sont rangés en dernier et la passe d'ombre s'arrête avant eux ; leur ombre ne ferait pas un texel. Les personnages à plus de 32 m ne sont plus dans la carte d'ombre (leur tache de contact suffit).
- Pas de MSAA sur un écran haute densité (l'image y est déjà calculée en double résolution).

**Essai écarté** : garder le décor fixe de la carte d'ombre en cache (copie de tampon à tampon) et n'y redessiner que ce qui bouge. La copie elle-même est négligeable (0,03 ms), mais ne pas effacer la carte avant d'y dessiner force un GPU à tuiles (tous les téléphones, les Mac) à recharger toute l'image précédente : 2,6 à 3 ms par image au lieu de 1,8. Sur ces GPU, effacer puis tout redessiner reste le chemin rapide ; on allège plutôt ce qu'on y dessine.

**Vérifié** : mêmes images (captures du bourg, ombres propres) ; `npm run verifie` ; conduite assistée en tracteur et en van ; banc des personnages en jeu ; banc d'allègement de three.js : équivalent. Les temps par image n'ont pas pu être départagés finement : la machine de test était chargée par d'autres processus (charge 7), et ce Mac dessine une image en moins de 2 ms ; les comptes (sommets, triangles, appels de dessin) font foi.

## 23/11/2026 · Retours de Teddy (7), lot 3 : devantures et voitures

**Demande** : voitures encore plus texturées ; devantures des boutiques plus riches, sans panneaux blancs, du réalisme.

**Fait** :
- Devantures (`devanture`, monde.js) : caisson de bois peint en applique sur le rez-de-chaussée (soubassement, pilastres, bandeau où se pose l'enseigne, corniche, deux lanternes), vitrine à petits bois et porte vitrée. Vraie vitre (`MAT_VITRINE`, nouvelle matière) : presque invisible de face, réfléchissante en biais. Derrière, sur 25 cm, étagères et marchandises en volume (pains, bouteilles, bocaux, cageots, plantes, ardoise du menu), affichées seulement à moins de 50 m. Au fond, l'intérieur de chaque boutique peint en code et éclairé (atlas, sans ombre : une boutique allumée) : mur chaud et suspensions, puis miches et paniers de baguettes, rayonnages de bouteilles et tonneaux, bocaux, comptoir et tabourets du bar, salle du restaurant (tables nappées, chaises, cadres, bougies). Couleurs franches : boulangerie bordeaux, épicerie bleu nuit.
- Voitures : vitres transparentes (comme le van) et habitacle derrière (plancher, garnitures, ciel de toit, planche de bord, volant à gauche, sièges et appuie-têtes, banquette) ; baguettes de flanc, essuie-glaces, pot d'échappement, antenne ; la saleté de la route sur le bas de caisse (dans le shader, d'après la hauteur : elle suit la voiture qui roule). Les voitures garées sont fusionnées par quartier de 64 m (carrosseries, vitres).

**Coût** : mêmes triangles qu'au lot 2 à peu de chose près (domaine 95 600, route 143 000, place 162 000), deux à trois appels de dessin de plus ; texture des enseignes 14,2 → 15,9 Mo (intérieurs peints à 320 px de large). Une première version fusionnait marchandises et voitures garées avec tout le décor : +33 000 triangles sur la route, dessinés même de loin ; d'où l'affichage de près et le regroupement par quartier.

**Vérifié** : captures des cinq boutiques du bourg et des voitures garées ; `npm run verifie` ; conduite assistée en tracteur et en van.

## 23/11/2026 · Retours de Teddy (8) : la barbe n'est plus une cagoule

**Demande** : « la barbe du mec, on dirait une cagoule, fais ça bien ».

**Constat** (gros plans de face, de trois quarts, de profil) : la barbe montait jusque sous les yeux, filait en ligne droite de l'oreille au nez, couvrait la bouche et débordait derrière la mâchoire jusqu'à la nuque ; la texture « mal rasé » dessous reprenait le même contour.

**Fait** (`perso.js`, `atlas.js`) : du favori, juste devant l'oreille, la ligne des joues descend en courbe jusqu'aux commissures ; moustache de 1,5 cm sous le nez ; bouche dégagée, une ellipse calée sur les lèvres peintes ; rien derrière le plan de l'oreille, sauf en bas jusqu'à l'angle de la mâchoire ; bord irrégulier, comme des poils ; mince sur les joues, du volume au menton. L'ombre de barbe de la texture suit le nouveau contour, un peu au-dessus, et se fond dedans (elle sert aussi aux passants mal rasés).

**Vérifié** : gros plans du vigneron et d'un passant chauve barbu ; `npm run verifie`.

## 23/11/2026 · Retours de Teddy (7), lot 4 : on charge dans le chai

**Demande** : le chai peut être ouvert et le chargement se fait dedans ; modéliser l'intérieur d'un chai avec des machines, des cuves, etc. ; rester optimisé.

**Fait** :
- La halle du chai (`chaiEtBureau`, monde.js) : murs creux, façade percée d'une grande porte à encadrement de pierre, deux vantaux de planches sur leurs gonds qui s'ouvrent vers la cour (ils s'ouvrent quand on approche à l'étape du chargement, ou à pied tout près).
- L'intérieur, un seul maillage (`halle`) : sol de béton et sa rigole, murs enduits à la chaux usés en pied, plafond de planches sous les entraits, quatre suspensions ; cinq cuves inox sur pieds (cordons de soudure, trappe, vanne, plaque, échelle de niveau sur l'une), deux rangs de barriques sur leurs chantiers, pressoir pneumatique (cuve couchée, trémie, tableau de commande), égrappoir sur roues, pompe et tuyaux, établi et outils, seaux, palettes de cartons, fenêtres vues de dedans. Chaque machine arrête le personnage.
- La lumière de dedans (`definirInterieur`, modeles.js) : dans la boîte de la halle, le soleil est coupé et une pénombre chaude, plus quatre lampes, remplace le ciel ; une seule retouche du calcul de lumière commun à toutes les matières, sans lumière de plus dans la scène (une vraie lampe three.js recompilerait tout et coûterait à chaque pixel du monde).
- La séquence (`jeu.charger`, main.js ; `rouler`, gestes.js) : devant la porte, les vantaux s'ouvrent, le véhicule entre tout seul jusqu'à la palette (roues qui tournent et braquent, moteur), on descend, on charge par le côté, on remonte, il ressort en marche arrière et se pose au départ de la tournée. Caméra au fond de la halle, qui regarde la porte tant que le véhicule est dehors.
- La palette des commandes est dans la halle (`lieux.palette`) ; la collision de l'ancienne palette, restée dans la cour, est retirée.

**Coût** : la halle n'est dessinée que dedans, ou porte ouverte à moins de 50 m : ailleurs, rien de plus. Au chai pendant le chargement : 64 appels de dessin (65 avant), 84 000 triangles ombres comprises ; domaine 95 700, route 142 000, place 155 700, mêmes appels de dessin. Pas de programme de shader en plus.

**Vérifié** : séquence filmée image par image en tracteur et en van (arrivée, entrée, chargement, sortie, départ) ; `npm run verifie` ; conduite assistée complète en tracteur et en van (aucun choc, aucune traversée) ; banc d'allègement de three.js : équivalent.

## 23/11/2026 · Retours de Teddy (9) : on se plantait dans le toit à l'entrée du chai

**Demande** : « un gros bug d'affichage à l'entrée du chai, on se plante dans le toit ; faut user d'une stratégie à ce moment-là ».

**Reproduit** (images d'un téléphone 390 x 844, toutes les 6 images) : en arrivant devant la porte à plus de 2,5 m/s, le chargement ne se déclenchait pas et l'on entrait soi-même. La caméra qui suit vise un point en avance sur le véhicule (jusqu'à 3,6 m) : ce point passait dans la porte, la caméra butait dès le premier relevé, se collait à lui et montait de 3,5 m, en plein dans le toit. En ressortant le nez dehors, elle traversait le linteau de la porte (les relevés, tous les 45 cm, sautaient la boîte de 20 cm de la porte).

**Stratégie** :
- Engagé vers la grande porte à l'étape du chargement, même lancé, le chargement commence : coupe sur la caméra de la halle, le véhicule entre tout seul (il prend le relais d'où il est, y compris déjà sur le seuil ou dedans).
- En dehors du chargement, on peut entrer dans le chai à pied ou en véhicule : dès qu'on a passé la porte, la caméra est posée au fond de la halle, et elle y reste jusqu'à ce qu'on soit bien ressorti (6 m dehors si l'on sort en marche avant, pour que la caméra qui suit reprenne avec du recul). Coupes franches, pas de travelling à travers les murs. Dedans, les commandes suivent l'axe de la caméra de la halle.
- La porte ouverte n'arrête personne mais reste un obstacle pour la caméra du dehors, et sa boîte a l'épaisseur du mur.
- Partout : si l'avance de la caméra fait entrer le point visé dans un bâtiment, elle est raccourcie.

**Vérifié** : arrivées filmées image par image au doigt (conduite assistée), lancé au clavier en tracteur et en van, entrée et sortie en marche avant et en marche arrière hors chargement, à pied ; aucune image dans un toit ou un mur. Chargement en van filmé ; `npm run verifie` ; conduite assistée complète en tracteur et en van (aucun choc, aucune traversée).

## 23/11/2026 · Retours de Teddy (10) : la journée à la carte, le chèque, la fontaine

**Demandes** : « pour la récupération du chèque, le mec va sortir de la voiture pour récupérer le truc » ; « permettre au joueur soit de faire un par un les missions, soit de faire une tournée globale, ou de faire une tournée avec ce qu'il a déjà signé » ; « le bruit de la fontaine est bien relou ».

**Fait** :
- La journée se joue dans l'ordre qu'on veut (`mission.js`). Plus d'attente de toutes les tâches avant d'aller au chai : au chai, on charge ce qui est signé (tout, ou seulement ce qui l'est déjà ; un deuxième chargement remplit les colonnes libres du véhicule). Une commande n'apparaît sur la palette qu'une fois signée.
- Écran Tournée du bureau : les 5 arrêts dans l'ordre et où chacun en est (à ajouter, commande à prendre, signature en attente, à charger au chai, prêt, en cours, fait). « Démarrer la tournée » lance tous les arrêts prêts (la tournée complète, ou celle de ce qui est déjà signé et chargé) ; « Y aller » lance un seul arrêt. On peut aussi s'arrêter chez un client prêt sans rien lancer. La tournée finie, la journée reprend (objectif selon ce qui reste) ; tout fait dehors, retour au bureau du chai.
- Itinéraires calculés (`reseau.js`, `lieux.reseau`) : le plus court chemin d'un point à un autre sur le réseau des routes (la boucle du bourg à sens unique, comme avant), refait si l'on s'en écarte de plus de 25 m. La tournée complète reprend les mêmes routes qu'avant.
- Conduite assistée (`pilote.js`) : elle garde sa file jusqu'au bout de l'itinéraire (sinon, l'épicerie étant au bout, elle dérivait vers le milieu et une voiture d'en face s'arrêtait devant elle) ; avant de tourner à gauche en coupant la file d'en face (vers les Grands Champs, la rue de la place), elle attend dans sa file que les voitures qui arrivent soient passées. Le défaut existait déjà : l'ancien banc passait par chance de calendrier.
- Le chèque (`gestes.js`, `cheque`) : arrêté devant l'épicerie, on descend, on va au comptoir face à l'épicier, il parle, il tend le chèque, qu'on regarde des deux mains avant de le ranger, on remonte. À pied, on va seulement au comptoir. La caméra cadre l'épicier devant sa boutique.
- La « fontaine » : c'était la rumeur de la place, du bruit filtré centré sur la fontaine, audible à 67 m, avec une bande aiguë qui sifflait comme un jet d'eau. Plus de bande aiguë, aigus coupés à 800 Hz, volume divisé par trois, entendue seulement à moins de 34 m.

**Vérifié** : `npm run verifie` (parcours en tracteur et en van, et le nouveau banc `souple` : le chèque seul, deux commandes chargées pendant que la troisième n'est pas prise, tournée de ces deux-là, deuxième chargement, le bar seul, le prospect seul, retour) ; conduite assistée complète en tracteur et en van (aucun choc, aucune traversée) ; le geste du chèque filmé image par image ; écrans Tournée et Ma journée en cours de journée.

## 23/11/2026 · Retours de Teddy (11), lot 1 : la mission finit toujours

**Demande** : revoir la logique des missions, voir si tous les cas sont gérés et si tous les messages et les aides existent pour garantir que le joueur termine.

**Revue** (chaque état de la journée, chaque transition, ce que voit le joueur) : la journée ne pouvait pas se bloquer, mais plusieurs cas laissaient le joueur sans repère ou faisaient perdre du travail :
- l'objectif affiché n'était écrit qu'à certains moments : il pouvait rester faux (« servez un verre » écrasé par une signature, « déposez le chèque » quand il l'était déjà) ;
- une signature de client arrivant pendant qu'on faisait signer le bon de livraison redessinait l'écran et effaçait la signature en cours ;
- chez le prospect en véhicule, rien n'arrêtait le véhicule (doigt posé, il repartait) ; parti sans servir le verre, plus de balise ; conduit à la main, on bute contre la maison voisine à 8 m de l'arrêt, trop loin pour que la visite commence ;
- le bon de livraison refermé sans signer : en rouvrant le téléphone, on tombait ailleurs ; signé de loin, le personnage marchait seul jusqu'au véhicule, même assis au portable ;
- le chèque en poche ne pouvait se déposer qu'au retour, et Vitisoft disait « le règlement n'est pas encore arrivé » ;
- arrêté chez un client pas prêt (commande pas prise, pas signée, pas chargée ; passage pas ajouté), au chai sans rien à charger : aucun mot ;
- le bureau ne relançait que certaines tâches ; une arrivée chez un client pouvait commencer téléphone ouvert, en plein appel.

**Fait** :
- `mission.js` : l'objectif est recalculé à chaque image d'après l'état (écrit seulement s'il change) ; plus aucun `hud.objectif` dispersé. Variantes ajoutées : bon de livraison à faire signer, retour avec le chèque déjà déposé, « Asseyez-vous au portable » une fois dedans, « Tout est fait : fermez Vitisoft ».
- Aides dites sur place (pas plus d'une toutes les 8 s, la même pas avant 25 s) : au chai sans commande, devant un client pas prêt (ce qui manque et où le faire), devant l'épicerie ou l'auberge pas encore ajoutées à la tournée.
- Relance du bureau : 8 s après avoir refermé le téléphone, la pastille revient tant qu'il reste une commande à préparer, des tâches du jour ou des arrêts prêts, avec l'aperçu qui dit quoi (« 5 tâches du jour à traiter. »).
- Le prospect : arrivé (en véhicule ou à pied), on descend et l'on va le voir (`gestes.aborder`, la même brique que le chèque) ; après la dégustation, on remonte. Parti à plus de 25 m sans lui servir le verre, la visite est à refaire (l'arrêt redevient prêt).
- Le téléphone rouvert va droit au bon de livraison qui attend ; sur le portable, « Faire signer le bon » ouvre le téléphone. On ne remonte au volant que si l'on est encore à côté du véhicule.
- Le chèque se dépose dès qu'on passe au bureau du chai ; le portable s'ouvre sur Vitisoft s'il y a quelque chose à y faire.
- Rien ne commence téléphone ou portable ouvert, ni pendant un appel ; une nouvelle du bureau met aussi le portable à jour.
- Mini-carte : à pied, le tracteur et le van sont repérés (petits rectangles bleus, au bord de la carte s'ils sont loin) : on retrouve toujours le véhicule qui porte les cartons.
- Tout fait dehors, l'écran Ma journée et l'écran Tournée disent où se passe la suite (consigne de jeu, pas texte produit).
- Textes : notifications et bannières rangées dans `textes.js` (`NOTIFS`, `BANNIERES`) ; `eur` dans `outils.js`.

**Vérifié** : nouveau banc `aides` (29 étapes, dans `npm run verifie`) qui joue exprès chaque cas : relance, aides au chai, à la cave, à l'épicerie, prospect quitté puis retrouvé à pied, chèque déposé et règlement saisi en pleine journée, bon refermé puis rouvert, signature qui arrive pendant le bon (rien ne s'efface), retour avec le chèque déjà déposé, fin. `npm run verifie` ; conduite assistée complète en tracteur et en van (aucun choc, aucune traversée) ; arrivée chez le prospect et mini-carte en captures.

## 23/11/2026 · Retours de Teddy (11), lot 2 : grand nettoyage du code

**Demande** : un gros nettoyage de code.

**Inventaire** (scripts jetables : exports jamais importés, imports et déclarations inutilisés, méthodes jamais appelées, textes jamais affichés, lignes longues en double) : presque pas de code mort (une entrée de `lieux` jamais lue) ; le vrai problème était `main.js`, 914 lignes dont une `miseAJour` de 200 lignes qui mêlait conduite, effets de particules, porte et caméra du chai, verres servis, étiquettes ; et quelques doublons recopiés d'un fichier à l'autre.

**Fait** (aucun changement de comportement voulu) :
- `chai.js` (nouveau, sur le modèle de `bureau.js`) : la grande porte, la halle dessinée de près, la bascule de caméra dedans et dehors, le chargement et ses chemins d'entrée et de sortie.
- `verres.js` (nouveau) : servir un verre (qui peut-on servir, le geste, celui qui trinque et boit).
- `particules.js` : `EffetsVehicule` (échappement au démarrage et en roulant, traces et fumée en dérapage, feuilles dans les vignes, gravillons), sorti de `main.js`. Même tirage au sort, dans le même ordre : les passants gardent leurs tenues et leurs trajets (la tournée en conduite assistée dure toujours 248 s en tracteur, 239 s en van).
- `main.js` : `miseAJour` découpée en fonctions nommées (`lireEntrees`, `conduire`, `marcher`, `bourg`, `horloge`, `reperes`) ; 914 → 786 lignes.
- `hud.js` : `action` (étiquette qui dit « (E) » au clavier, au lieu de cinq recopies du test), `libeller`, `bulle` (quatre recopies).
- Doublons réunis : le bruit de valeur (relief des collines et bosses sous les roues, recopié à l'identique dans `monde.js` et `vehicules.js`) dans `outils.js` ; les panneaux de direction (`direction`, monde.js) ; le montage des quatre roues du tracteur et du van (`roues`, engins.js) ; les battants de porte (`battant`, gestes.js : portière du van, porte du bureau) ; la feuille du chèque (`geoCheque`, engins.js, partagée par la main et le bureau).
- Couleur de la mission en un seul endroit (`COULEUR`, mission.js) ; `lieux.cave`, jamais lu, retiré ; en-têtes de fichiers et commentaires remis à jour.

**Vérifié** : `npm run verifie` (tracteur, van, journée à la carte, cas limites) ; conduite assistée complète en tracteur et en van (mêmes durées à la seconde, aucun choc, aucune traversée) ; banc des personnages en jeu. Une première version oubliait que `hash` servait aussi aux maisons de `monde.js` : le jeu ne se chargeait plus, `verifie` l'a arrêtée.

## 23/11/2026 · Retours de Teddy (11), lot 3 : la démarche

**Demande** : améliorer la démarche des personnages.

**Mesuré d'abord** (os des pieds suivis image par image sur une foulée, à 1,6 m/s) : à l'attaque du talon, la cheville était à 0,149 m au lieu de 0,078 (le pied arrivait 7 cm en l'air) et ne touchait le sol qu'au tiers de l'appui, en glissant de 5 cm ; derrière, il décollait 3 cm trop tôt. La semelle n'était au sol que 13 % du cycle, au lieu de 60 % : la marche « flottait ». Causes : le pied se pose à ±0,44 de la hanche quand la jambe (cuisse et tibia, 0,84) ne l'atteint pas à la hauteur où était le bassin ; le pied ne roulait pas (la cheville restait au ras du sol tout l'appui, sauf un talon levé de 5 cm) ; la foulée ignorait l'échelle du personnage (le pied reculait 4 % moins vite que le corps n'avançait) ; des pas trop longs pour des jambes stylisées, plus courtes que nature. En course, le pied décollait de 11 cm en une image et repartait d'un coup à la vitesse du corps.

**Fait** (`anim.js`, `foulee`, `poseDebout`) :
- Le pied roule : attaque du talon pointe relevée (le talon pivote au sol), pied à plat, puis le talon se lève et le pied pivote sur la pointe jusqu'au décollage ; il se pose un peu moins loin devant qu'il ne quitte le sol derrière (en courant, presque sous le corps). Dimensions prises sur la chaussure (perso.js).
- Le bassin : sa hauteur est la plus haute que les jambes atteignent, le genou gardant une légère flexion (amortie juste après l'attaque du talon), raccordée sans cassure : il descend au double appui et remonte au passage, 5 cm à la marche, comme un vrai marcheur.
- Cadence d'après la longueur des jambes (relation d'Alexander, un peu allongée) et foulée à l'échelle du personnage : plus de glissement.
- Envol : une courbe d'Hermite, le pied immobile au sol à ses deux bouts (ni glissement au décollage, ni à l'atterrissage), levé plus tôt que tard (le talon remonte en courant) et sans à-coup.
- Haut du corps : balancier des bras un peu plus ample et plus devant que derrière, la main vient vers le milieu en avançant, coude qui plie à l'aller ; tête qui reste droite quand le bassin bascule.
- Sans allocation de plus : les pieds et les réglages de la foulée vivent dans des tableaux de nombres, les petits calculs sont faits sur place (sinon V8 met en boîte chaque nombre passé ou rendu : 81 octets par pose, ramenés à 9,5, contre 11 avant). Même coût : 0,045 ms pour 14 personnages.

**Vérifié** : à la marche, la semelle est au sol 62 % du cycle, immobile pendant l'appui (pied à plat, puis pivot sur la pointe), atterrissage et décollage sans saut ; bassin 0,90 à 0,95 m. Bandes de profil et de face (marche, petite course, course), avant et après ; planches de l'arrêt et du demi-tour ; captures en jeu (le personnage qui marche et qui court, les passants de la place) ; `npm run verifie` ; conduite assistée en tracteur et en van ; banc des personnages en jeu (recul contre le mur, saut de côté, client qui se tourne).

## 23/11/2026 · Retours de Teddy (12) : les clients rentrent, des gens dans la rue, la cour en cailloux

**Demandes** : « quand les missions sont terminées, il faut que les mecs rangent les cartons et rentrent dans leur shop » ; « ajoute des gens dans la rue aussi » ; « le sol du domaine doit être en cailloux et pas tout lisse ».

**Fait** :
- `clients.js` (nouveau) : les cinq clients devant leur boutique. Leur affaire faite (commande livrée et bon signé, chèque donné, visite notée), 2,5 s plus tard ils vont devant chaque pile posée à leurs pieds, la soulèvent, la portent jusqu'à leur porte et rentrent (la vitre peinte de l'intérieur les cache peu à peu) ; ils ressortent chercher la pile suivante, puis restent dedans. Mêmes gestes que le personnage (`gestes.js` : un `acteur` autre que le joueur ; nouvelles étapes `entrer` et `sortir`). La porte de chaque boutique est notée par `devanture` (`lieux.portes`). Les piles livrées savent à qui elles sont (`userData.client`).
- Huit passants de plus : trois sur chaque trottoir de la départementale dans le bourg, deux dans la rue de la place ; ils vont et viennent, s'arrêtent, s'écartent du véhicule comme les autres. Leur propre tirage au sort : ils n'ont rien changé aux autres (la tournée en conduite assistée dure toujours 248 s en tracteur, 239 s en van).
- La cour et le chemin du domaine en cailloux : une texture tuilable (`CAILLOUX`, modeles.js, 256 px pour 0,9 m) de galets ronds de 2 à 6 cm, de tailles et de teintes variées, entre eux des gravillons et du sable ; elle porte aussi la pente de chaque galet, que le shader éclaire du côté du soleil (une seule lecture de texture). Calculée au démarrage en 8 ms. Une première version (pavage de Voronoï) faisait une calade, pas une cour de gravier. Par-dessus, 1 800 petits cailloux en relief, en instances, affichés de près et dosés selon le palier comme les herbes hautes.
- Le banc d'allègement de three.js (`essai-allege.mjs`) avait un parcours périmé depuis le chèque au comptoir (il s'interrompait déjà avant ce lot) : réparé.

**Coût** : +0,1 à +0,3 ms par image sur ordinateur ; domaine 129 → 134 appels de dessin, 158 000 → 170 000 triangles ; bourg 78 → 88 appels (les passants), 175 000 → 206 000 triangles.

**Vérifié** : le client de la cave filmé (première pile rentrée, il ressort, la seconde) ; captures de la cour (près, au ras du sol, sur téléphone) et de la rue ; `npm run verifie` (nouvelle étape du parcours : les cinq clients rentrés, plus aucune pile dehors) ; conduite assistée en tracteur et en van ; banc des personnages en jeu ; banc d'allègement : équivalent.

## 23/11/2026 · Retours de Teddy (13) : des gens dans les voitures, emprunter, et le mode WTF

**Demande** : des gens dans les voitures ; pouvoir prendre n'importe quelle voiture ; « on va activer un mode dans les réglages : mode WTF où on peut voler des voitures et écraser les gens, et un mode sans ça, où on peut juste emprunter des voitures ».

**Décision** : la règle « pas de crime dans le jeu » vient du client ; j'ai signalé le conflit et le risque pour l'image, Teddy a tranché : un mode WTF, coupé par défaut. Pour « écraser », un gag de dessin animé (le passant s'aplatit comme une crêpe et se relève en râlant), sans sang ni mort. Règle mise à jour dans `CLAUDE.md`.

**Fait** :
- Un conducteur au volant de chaque voiture de la départementale (poste de conduite de chaque modèle : `posteVoiture`, engins.js), vu par les vitres, animé seulement à moins de 80 m.
- Prendre une voiture : on se plante dans sa voie, elle s'arrête ; à côté, « Emprunter la voiture ». Son conducteur descend côté conducteur, la prête avec une réplique (« Elle tire un peu à gauche, hein ! ») et devient un passant du bas-côté. Une jumelle qu'on conduit (`voitureConduite` : même carrosserie, quatre roues qui tournent et braquent, caisse sur ressorts, montée par la portière) prend sa place, avec son caractère (`TEMPERAMENTS.voiture` : la plus vive, perdue dans les vignes) et la conduite assistée. Une autre voiture, avec un nouveau conducteur, revient au loin 20 s plus tard.
- Mode WTF (Réglages du téléphone, gardé d'une partie à l'autre) : « Voler la voiture », même garée (les voitures garées ne sont plus fusionnées : 2 appels de dessin de plus) ; son conducteur s'enfuit en criant au voleur. Les passants ne s'écartent plus : touchés par un véhicule lancé, ils s'aplatissent (« pouet », secousse, « Aïe ! »), restent par terre 2 s, se regonflent avec un rebond et s'en vont en râlant (« Chauffard ! »).
- Plusieurs véhicules du joueur : ils ne se traversent pas (`autres` au lieu d'un seul « autre ») ; les voitures de la départementale les voient tous ; la conduite assistée les évite tous.
- Une voiture ne porte pas de cartons : au chai, rien ne se charge, l'aide le dit.

**Vérifié** : nouveau banc `voitures` (13 étapes, dans `npm run verifie`) ; conducteur, emprunt, crêpe et relevé filmés ; conduite assistée en tracteur et en van (mêmes durées, aucun choc) ; banc des personnages en jeu. Un premier essai n'aplatissait le passant qu'à grande vitesse : le pare-chocs le repoussait devant lui à chaque image ; tout contact avec un véhicule lancé l'aplatit désormais.

## 23/11/2026 · Retours de Teddy (14) : plus de cloche, la nuit qui tombe, marcher au clavier

**Demandes** : « supprimer le son de la cloche, c'est chiant » ; « mettre en place la nuit qui tombe ; un truc au niveau de la maison : quand on rentre, ça remet au matin » ; « un mode marcher / courir avec la touche Maj sur laptop : quand je fais la flèche, ça marche de base ».

**Fait** :
- La cloche de l'église ne sonne plus (code retiré). La nuit, les grillons remplacent les oiseaux.
- Au clavier, une flèche fait marcher (1,6 m/s) et Maj courir : avant, une touche valait la pleine vitesse, donc la course. La manette, analogique, reste dosée comme le doigt. L'aide de l'accueil le dit.
- La nuit : l'heure avance (une minute toutes les 2 s, départ 17 h 40) ; le soir tombe de 18 h 40 à 19 h 50, pleine nuit vers 4 min 40 de jeu. Le soleil reste bas où il est (sa direction est inscrite dans les shaders : la déplacer aurait touché toute la chaîne de rendu) mais s'éteint et devient un clair de lune pâle et bleuté qui garde des ombres douces ; ciel, brume et nuages passent au bleu nuit, les étoiles paraissent (dans le dôme, sans coût : seuls ses pixels vides), fenêtres allumées et réverbères brillent plus fort, les reflets du ciel s'assombrissent. Une seule valeur partagée (`uNuit`) ; la lueur du soleil dans la brume s'éteint d'après la couleur de la brume elle-même (`cl_jour`), sans nouvelle variable pour les matières de three.js. Une première nuit était trop noire et trop bleue pour jouer : ambiance relevée, clair de lune.
- Rentrer dormir : devant la porte de la maison du domaine (où l'on commence), « Rentrer dormir » ; fondu au noir, et l'on ressort dans la cour à 7 h le lendemain (le jour même si l'on rentre après minuit), à l'aube : « Bonjour ! ». La journée de travail continue où elle en était. Une première version faisait ressortir le personnage dos au mur : la caméra entrait dans la maison.

**Vérifié** : nouveau banc `nuit` (dans `npm run verifie`, à 1280 x 800 : le clavier) ; captures du crépuscule, de la nuit dans le bourg, sur la place et devant la maison, et du réveil ; banc d'allègement de three.js : équivalent ; conduite assistée en tracteur et en van ; banc des personnages en jeu.

## 23/11/2026 · Retours de Teddy (15) : les portières, le conducteur qui tombe, les passants qui esquivent, les phares

**Demandes** : « les voitures, faut ouvrir les portes, et les mecs sortent aussi en tombant » ; « les mecs essaient de t'éviter quand tu leur fonces dessus avec la voiture : ça s'aplatit que si j'y arrive » ; « et les phares des voitures la nuit... enfin des véhicules ».

**Fait** :
- Portière : la carrosserie d'une voiture est faite de facettes qui passent toutes par `Atelier.tri` ; celles de la porte avant gauche (entre ses joints, du bas de caisse au haut de la vitre, sans le montant du pare-brise ni le rétroviseur : `porteVoiture`) sont détournées vers un maillage à part, avec sa vitre et une contre-porte, monté sur sa charnière. Seule la jumelle qu'on conduit en a besoin : quand on prend une voiture, elle la remplace avant que le conducteur ne sorte. La portière s'ouvre et se referme à chaque montée et descente ; un battant part de là où il en est (rouvrir une portière ouverte ne la fait pas sauter).
- Le conducteur : il passe dans la jumelle et en descend lui-même (portière ouverte, qu'il nous laisse ouverte) ; en mode WTF, il en tombe (`gestes.tomber` : éjecté encore assis, il se déplie en l'air, tombe sur le dos au pied de la voiture, la tête au loin, reste un instant par terre, se relève et s'enfuit en criant). On ne monte qu'une fois sa place libre.
- En mode WTF, les passants s'écartent comme d'habitude (saut de côté, fuite), mais réagissent plus tard : on peut les attraper ; celui qui a le nez dans son téléphone ne voit rien venir.
- Phares, la nuit (`eclairage`, engins.js) : glaces blanches et halos (un maillage additif), une flaque de lumière de 10 m sur la route, feux rouges à l'arrière ; pas de vraie lampe three.js (elle recompilerait toutes les matières et coûterait à chaque pixel) : 2 appels de dessin par véhicule allumé. Allumés pour les voitures de la départementale, pour le véhicule du joueur quand il roule ; leur éclat suit la nuit. Une première version gardait des disques sans couleur (`teinter` rend une nouvelle géométrie) : ils paraissaient bleus.

**Vérifié** : bancs `voitures` (15 étapes : portière refermée, passant qui saute de côté, passant au téléphone aplati, conducteur tombé puis relevé) et `nuit` (phares allumés la nuit, éteints le jour et à pied) ; portière, descente, chute et phares en images ; `npm run verifie` ; conduite assistée en tracteur et en van ; banc des personnages en jeu ; banc d'allègement : équivalent. Pendant la vérification, la machine a monté à une charge de 228 (processus du système) : deux navigateurs de test se sont fermés en pleine partie ; tout repasse une fois la charge retombée.

## 23/11/2026 · Retours de Teddy (16) : les têtes sous le toit, le vol dans l'ordre

**Demandes** : « certaines voitures laissent dépasser la tête des gens » ; « il faut attendre que le personnage arrive à la portière pour que l'autre tombe de la voiture ».

**Fait** :
- Mesuré : sur le break et la berline (toits à 1,45 et 1,43 m), la tête d'un conducteur grand ou à chapeau montait jusqu'à 1,47 m, au ras du haut du pare-brise. Le poste de conduite d'une voiture donne maintenant son `plafond(z)` (sous le ciel de toit, sous le pare-brise et la lunette, d'après les stations de la coque vitrée). Assis au volant, chacun mesure une fois sa tête (les sommets portés par l'os de la tête : cheveux et chapeau compris) dans la pose de conduite et s'enfonce dans le siège de ce qu'il faut, marge comprise pour les mouvements de tête (`Pieton.caler`, `creux`, anim.js). Les petits ne bougent pas.
- Mode WTF, voiture qui roule : on va d'abord jusqu'à sa portière, on l'ouvre ; alors seulement il tombe ; on monte une fois qu'il s'est relevé et écarté (il reste couché 0,65 s au lieu de 0,9). Sans le mode WTF, rien ne change : il descend et nous laisse la portière ouverte.

**Vérifié** : banc `voitures` (19 étapes : têtes des 4 conducteurs de 3 à 8 cm sous le toit, celle du personnage aussi ; le conducteur volé ne tombe qu'une fois le personnage à 8 cm de sa portière) ; conducteurs photographiés de côté.

## 23/11/2026 · Retours de Teddy (17) : la route du château, le château, son village, le drift

**Demande** : « Fais une route qui va jusqu'au château là-haut, améliore le rendu du château et fais attention, ça monte pour y aller, donc il faut que tout soit cohérent. N'hésite pas à ajouter des maisons stylées sur la route qui fera le tour du château. Améliore aussi le drifting des voitures. »

**Le site** : le château d'avant (une boîte, quatre tours, à 39 m sur la pente nord-ouest, hors d'atteinte) est remplacé. Mesuré d'abord : les collines naturelles montent à 15 % et plus ; aucun tracé ne grimpait au château à moins de 13 %. Autour du château, les collines sont adoucies d'un tiers (raccord en douceur sur 45 m, le monde lointain garde sa forme) ; le château est posé au sommet, en (-280, -285), sur un plateau aplani à 31 m (rayon 50 m, talus d'autant plus larges que l'écart au relief est grand). Il est plus loin qu'avant (le sommet est là) ; on le voit depuis l'embranchement et toute la montée.

**La route** : elle part de la départementale en x = -176 (panneau « Château »), file au nord, passe dans le coin de la zone de jeu puis grimpe par une longue courbe à l'est du château et revient par le nord : 484 m, pente bornée à 11 % (le profil suit le relief lissé, à plat dans la zone de jeu, au niveau du plateau en arrivant ; une première version laissait une marche de 46 cm à l'entrée du plateau, les points imposés étant écrasés par les passes de pente). Le terrain est retouché autour d'elle : chaussée et bas-côtés à plat sur 6,8 m de part et d'autre de l'axe (assez pour qu'aucun triangle de la grille qui touche la chaussée ne monte sur le talus), puis talus vers le relief. Ce relief retouché est porté par une grille fine (2,6 m, 23 000 triangles) alignée sur le grand terrain, ses bords sur les arêtes du grand terrain (pas de fente) ; le grand terrain s'efface dessus. Chaussée en vieil enrobé, bas-côtés en gravier, balises blanches tous les 28 m, arbres du côté de la pente ; parapets prévus là où le relief tombe sous la chaussée (la route épouse si bien la pente qu'il n'y en a pas). Hors du carré de jeu, on ne va que sur la route, le tour et dans la cour du château (collisions.js) ; les arbres et les balles de foin des collines s'écartent de la route et du plateau, avec les mêmes tirages qu'avant (le reste du monde ne bouge pas).

**Tout suit la pente** : `sol(x, z)` (relief.js) rend les triangles mêmes du terrain dessiné, ici comme sur le grand terrain. Le personnage et les passants y posent les pieds ; les véhicules du joueur posent leurs quatre roues (tangage et roulis lissés), ralentissent en montée et prennent de l'élan en descente (doigt posé, la vitesse est gardée ; arrêté sans pédale, le frein tient) ; la caméra suit la hauteur du sol et reste au-dessus du relief derrière soi ; le cadre d'ombre, les taches de contact (penchées comme le véhicule), les traces de pneus, l'échappement, les gravillons et la fumée aussi. Les coins de la zone de jeu, où le relief montait déjà (jusqu'à 14 m) sans que personne ne monte avec, sont du même coup cohérents. La mini-carte va maintenant de -380 à 200 m : la route, le tour, le château et les maisons y restent clairs.

**Le château** : un château de la Loire en tuffeau : corps de logis de 30 m à trois niveaux, bandeaux et corniche, 7 travées de grandes croisées (meneau et traverse), lucarnes à fronton et pinacles, hautes cheminées ; deux grosses tours rondes au sud (glacis, mâchicoulis, toits en poivrière, épis) ; deux ailes et leur cour d'honneur au nord, tour d'escalier octogonale, châtelet d'entrée à deux tourelles, vantaux ouverts ; jardins à la française (parterres de buis, ifs taillés, bassin et jet d'eau) ; mur de clôture le long de la route du tour, portail. On entre en véhicule par l'allée et le châtelet jusque dans la cour.

**Le village** : la route du tour, pavée entre deux bordures, fait le tour du château (rayon 32 m) ; tout autour, tournées vers lui, des maisons (15) : manoirs de tuffeau à tourelle d'escalier en poivrière, maisons à pans de bois (sablières, poteaux, croix de Saint-André), maisons d'enduit ou de moellons, lucarnes, cheminées, fleurs ; des murs de jardin entre elles, des réverbères, des arbres derrière ; au sud-est, un belvédère (balustrade, bancs tournés vers la vallée). Son propre tirage au sort.

**Le drift** : avant, la glisse retombait dès qu'on lâchait le frein à main, et la voiture perdait 70 % de sa vitesse en une seconde. Maintenant (vehicules.js) : la dérive est un état qui monte vite et retombe lentement ; à l'accélérateur, une fois en travers, on la tient (voiture plus que van, van plus que tracteur) ; contre-braquer redresse (le volant tourne plus vite en dérive) ; à fond et en butée de volant, lancée, une voiture survire (de quoi lancer une glisse sans frein à main) ; au-delà de 45 degrés de glisse, la rotation qui l'aggrave s'éteint (plus de tête-à-queue : 60 degrés au plus en gardant le volant en butée) ; frein à main et frottement de côté freinent moins, les roues arrière poussent dans la glisse. La caméra suit à moitié la direction où l'on glisse : on voit la voiture en travers. Mesuré : frein à main 0,45 s à 17 m/s puis contre-braquage, la glisse se tient à 26 degrés et 13 m/s tant qu'on accélère.

**Vérifié** : nouveau banc `chateau` (dans `npm run verifie`) : en tracteur et en van, montée jusqu'au plateau sans quitter la chaussée (écart 0,9 et 2,7 m), posé sur le sol (4 cm), sans choc, caméra jamais sous le relief, 9,9 et 12,3 m/s au plus lent dans la montée ; le tour du château sans choc ; hors de la route, retenu au bord ; à pied sur la pente ; la glisse tenue 2,8 s sur 3,5 à plus de 11 m/s, 60 degrés au plus. La tournée en conduite assistée dure toujours 248 s, sans choc. Images de la montée, du village, de l'embranchement, de nuit. Coût : au château, une image coûte moins qu'au bourg (moins de triangles, moins d'appels de dessin) ; démarrage : +39 000 sommets (1 Mo), relief calculé en 13 ms (un balayage le long de la route au lieu d'une recherche par sommet : 25 ms au départ).

## 23/11/2026 · Mission 2 : la journée de traitement

**Demande** : « À la fin de la mission 1, on force le personnage à aller dormir. Ensuite c'est journée de traitement : passer dans certaines vignes avec le tracteur pour mettre des traitements phyto. On choisit un traitement bio. On utilise l'application du registre pour tracer ce qu'on fait sur plusieurs parcelles. En toute autonomie. »

**Sources** : ce que fait le Registre phyto vient de la page de prévente (LP de Teddy du 19/11/2026, reprise sur vitisoft.fr : `src/data/registre-phyto-demo.ts` et `registre-phyto.ts`, lus aujourd'hui) : un traitement se note sur place ; on coche les parcelles traitées ; le produit et la dose ; le stade, repris du dernier traitement ; la cible ; pas de réseau : noté, envoyé quand ça capte ; chaque ligne dit qui a saisi, et quand ; l'ETA ou la CUMA saisit chez vous ; une erreur se corrige avec motif ; export PDF, format officiel, fiche Stat'Phyto ; parcelles depuis le fichier Telepac ; aucune promesse de conformité. Fiche de faits : registre numérique au 1er janvier 2027. Rien d'autre n'est dit de l'appli.

**Décisions** (à revoir par Teddy) :
- Une saison : traiter la vigne le lendemain de la tournée de Noël, vigne en sommeil, des vignerons le verraient tout de suite. Le réveil se fait donc « quelques mois plus tard », le mardi 4 mai 2027 : la vigne a ses jeunes feuilles. Et l'appli est alors ouverte (1er janvier 2027) ; tant que la prévente court, chaque écran du registre dit « aperçu de l'application, données fictives, ouverture le 1er janvier 2027 », avec le lien de préinscription.
- Le traitement bio : bouillie bordelaise (cuivre, contre le mildiou) et soufre mouillable (contre l'oïdium), ensemble, sur le conseil de Claire, la conseillère viticole (message). Doses de jeu : 1,5 kg/ha et 5 kg/ha. Un fongicide de synthèse est dans l'armoire : le registre refuse de le noter (« le domaine est en bio »). Aucun chiffre réglementaire affiché.
- Forcer le sommeil : la carte de fin de la mission 1 (refaite : « Fin de la mission 1 », la suite) ; l'objectif devient « rentrez dormir », la balise sur la maison ; la mission 2 ne commence qu'au réveil.

**Fait** :
- Le printemps : `UNI.uSaison` dans le shader du décor (`cl_saison` : feuillages au vert, leur éclat gardé ; champs verdis à moitié ; herbe plus drue), les rangs de vigne repeints (jeunes feuilles, chenin plus clair que cabernet), les feuilles soulevées par le tracteur aussi. Un seul uniforme, aucun programme de plus.
- Le pulvérisateur porté, attelé au tracteur au réveil : cuve de 600 L, ventilateur, deux rampes repliées vers l'arrière, dépliées au-dessus des rangs ; leurs descentes passent entre les rangs, à 2,2 et 4,4 m de l'axe : un passage traite quatre rangs.
- L'aire de remplissage au nord de la cour (dalle, cuve d'eau dans sa cage, potence, armoire des produits) et deux chemins de vigne derrière le domaine, vers le nord des Perrières et du Clos, dans le réseau de la conduite assistée.
- La mission (mission2.js) : le message de Claire ; en tracteur à l'aire, on descend remplir la cuve (eau, bouillie, soufre), on remonte ; trois parcelles : Les Perrières (chenin, à l'ouest du domaine), Le Clos (cabernet franc, à l'est), Les Grands Champs (cabernet franc, au bout du chemin du hameau, sans réseau). Dans une parcelle, les rampes se déplient et traitent les travées qu'elles survolent : un voile bleuté de cuivre sur les feuilles, un brouillard fin sort des buses, son souffle. Le guidage suit les passages restants (une serpentine, demi-tours en arc dans les tournières, refaite si l'on en a sauté) : doigt posé, ou au clavier flèche du haut seule ; la scène va alors trois fois plus vite (trois pas de conduite par image). Une parcelle est traitée à 97 % de ses travées.
- Le Registre phyto (téléphone) : le registre de la campagne (deux traitements d'avril, dont un saisi par l'ETA des Coteaux), « Noter un traitement » en cinq écrans (parcelles traitées, retrouvées depuis Telepac ; produits et doses, à zéro au départ ; stade repris du traitement du 28 avril ; cible ; vérifier), l'export (PDF, format officiel, fiche Stat'Phyto). Il refuse ce qui ne correspond pas à ce qui a été fait (parcelle pas encore traitée, produit pas bio, mauvaise dose, cible incomplète) et dit pourquoi ; « Enregistrer » revérifie tout. En bas des Grands Champs, pas de réseau (en-tête, barre d'état « Pas de service ») : noté, en attente, envoyé tout seul quand ça capte.
- L'objectif est recalculé à chaque image : le message, le tracteur, l'aire, traiter (avec le pourcentage), noter (les deux parcelles près du domaine ensemble, les Grands Champs sur place), remonter vers la route, fini. Carte de fin de la mission 2 : ce que fait l'appli, la prévente et son lien.

**Corrigé en route** : une méthode `cible()` de la saisie écrasait le getter `cible` de la balise (itinéraire impossible) ; le guidage prenait le passage le plus proche du tracteur et sautait les premiers (la serpentine part maintenant du tracteur, et le plan se refait au bout) ; « Enregistrer » enregistrait sans revérifier.

**Vérifié** : nouveau banc `traitement` (13 étapes, dans `npm run verifie`) : réveil, message, bouillie, les trois parcelles au guidage (75, 87 et 97 s), refus de l'appli, enregistrement, sans réseau puis envoyé, carte de fin. Images : le printemps, le pulvérisateur à l'aire et en passe, les rangs traités, l'appli dans le téléphone. Banc d'allègement : équivalent.

## 24/11/2026 · Audit et optimisation après la mission 2

**Demande** : « Tu vas t'auditer et améliorer le jeu quand tu auras fini, pour toujours optimiser encore plus le rendu et la taille, les ressources. Optimiser est le maître mot. »

**Mesuré d'abord** (Chrome sans fenêtre sur Mac ; et processeur ralenti 4 fois, comme un téléphone modeste) :
- Poids : 744 Ko, 246 Ko compressé. Notre code fait 388 Ko minifié, three.js allégé 325 Ko. Il ne reste que 4 Ko de blancs et de commentaires dans les chaînes (HTML des écrans, GLSL) : le reste est du vrai code (le monde, les véhicules, les personnages, construits en code, sans aucun fichier à télécharger). Rien d'utile à gagner sans risque.
- Démarrage (ralenti 4 fois) : accueil affiché à 176 ms, image 3D prête à 1,26 s. Au profileur, les plus gros postes de notre code : l'indexation des géométries fusionnées (62 ms sur Mac, déjà au plus serré : 83 ns par sommet), la construction des personnages (4 ms chacun, l'atlas une fois 25 ms ; la foule se construit pendant l'accueil), la construction du monde.
- Une image : la logique du jeu coûte 0,1 ms ; tout le reste est le rendu (2 ms de préparation, 4 ms de carte graphique, ralenti 4 fois). Mémoire : 7,6 Mo de géométries, 282 000 sommets ; textures 16,6 Mo à l'accueil (la carte d'ombre 2048 en palier haut, l'essentiel).

**Corrigé ou allégé** :
- Les passants, les clients et les figurants plus loin que 100, 140 ou 200 m (selon le palier) ne sont plus dessinés, ni leur tache : à cette distance, une dizaine de pixels dans la brume. Au palier moyen des téléphones, vue de la route vers le bourg : 164 500 → 151 800 triangles, 79 → 75 appels de dessin, 0,83 → 0,69 ms par image.
- Mission 2 : pendant la pulvérisation accélérée, le personnage, les effets et le son étaient recalculés trois fois par image (un par pas de physique) : une seule fois maintenant. Une travée traitée envoyait tout le tampon de couleurs de son bloc et de sa parcelle à la carte graphique : seule sa couleur part. L'objectif, qui fabrique des textes, se recalcule dix fois par seconde au lieu de soixante.
- Mission 2 : deux aides manquaient (dans une parcelle en van, ou en tracteur avant d'avoir préparé la bouillie).
- L'accueil propose aussi la mission 2 directement (la tournée prend un bon quart d'heure ; la mission 2 montre le Registre phyto). Version : Démo 1.0.

**Vérifié** : `npm run verifie` (9 bancs, dont la mission 2), conduite assistée de la tournée (248 s, aucun choc), comparaison avant et après au palier moyen.

## 24/11/2026 · Retours de Teddy (18) : Vitisoft tel qu'il est, le parvis du chai qui vit

**Demandes** : « Reprends juste l'interface de Vitisoft comme elle existe vraiment. C'est pas un nouvel onglet, c'est une icône sur le bureau. T'as les captures sur le site. » ; « Ajoute des artefacts viticoles sur le parvis du chai pour remplir un peu l'espace. Je veux un truc réaliste. Il faut que ça vive. »

**Vitisoft (pc.js)** :
- Sources : les captures du dépôt vitisoft.fr (`src/assets/images/captures` : `dashboard-hero`, `vitisoft-tableau-de-bord-2026`, `vitisoft-caisse-reglement`, `vitisoft-caisse-selection-produits`).
- Le portable montre le bureau d'un ordinateur : fond d'écran, deux icônes (Vitisoft, et Le bureau, l'extension web, qui s'ouvre dans le navigateur), barre des tâches (« Se lever », les fenêtres ouvertes, l'heure du jeu et la date), un pense-bête jaune de ce qu'il reste à faire dans Vitisoft. L'icône à ouvrir est mise en évidence quand on s'assoit. L'objectif du jeu est repris au-dessus de l'écran (le portable cache celui du jeu).
- Vitisoft, dans sa fenêtre : la barre noire « VITISOFT » et le nom du domaine, le menu à gauche par rubriques en bandeaux noirs, aux libellés recopiés des captures (Contacts, Factures, Commandes / Pro forma, Produits / Stocks, Déclarations douanes, Analyse) ; le tableau de bord en tuiles (date et heure en orange, factures de l'exercice, panier moyen, « Factures dont l'échéance est dépassée » en rouge, raccourcis gris, la courbe « Evolution du chiffre d'affaires ») ; « Liste des factures / Règlements » en grille à en-tête bleu, la facture en retard en rouge, comme les contacts à rappeler des captures ; la fenêtre « Règlement » (Facture N°, Net à Payer, Montant Perçu, Restant dû, les sept modes de paiement en tuiles vertes, « Sortir » en rouge) ; « Liste des commandes / BL » (facturer, envoyer avec Pennylane) ; « DRM / DMS ». Les autres entrées du menu disent ce qu'elles font quand on a une source (Faire une facture, Comptabilité), sinon « Dans le jeu complet ».
- Fermer Vitisoft quand tout est fait finit la mission, comme avant « Fermer Vitisoft ».
- Choix à valider par Teddy : le soir de la tournée est daté du mardi 8 décembre 2026 (sur la tuile date et dans la barre des tâches) : avant le 10, la DRM de novembre est à l'heure. Les chiffres du tableau de bord et les factures déjà réglées sont fictifs (domaine fictif). « Restant du » des captures est écrit « Restant dû ».

**Le parvis du chai (monde.js, parvis.js)** : réaliste pour un domaine de Loire en décembre comme en mai, hors des passages des véhicules et de la marche arrière qui ressort du chai.
- Le matériel : le chantier de barriques contre le chai (deux rangs, de vraies barriques bombées, cerclées), le poste de rinçage (une barrique sur berceaux d'inox, le nettoyeur haute pression et son tuyau, la flaque, le caniveau à grille), des barriques rincées debout qui s'égouttent, l'enrouleur au mur ; une remorque plateau chargée de caisses de vendange contre le muret, trois palettes où on les range, deux palox ; près du bureau, un vieux pressoir à cage et un demi-fût planté d'un laurier.
- Ce qui vit : le rinceur balaie la barrique à la lance (le jet, les éclaboussures là où il touche, sur la barrique ou sur le sol à côté, la brume, les gouttes, le bruit du nettoyeur), baisse la lance quand on passe tout près, souffle de temps en temps ; la porteuse range les caisses de la remorque sur les palettes, une à une (24 caisses, leur nombre se conserve ; la remorque vide, elle souffle, rechargée quand personne ne regarde) ; tous deux saluent et disent un mot quand on passe à pied ; le chien du domaine, un beauceron couché près du bureau, lève la tête et suit du regard qui approche, remue la queue, dort la nuit ; sept moineaux picorent, s'envolent sur la remorque, le muret, les barriques ou le bord du toit quand on approche, reviennent ; en hiver, la cheminée de la maison fume.
- Les ouvriers travaillent de 7 h 30 à 18 h 30 et n'arrivent ni ne partent sous les yeux ; la nuit, les moineaux dorment.

**Coût** (palier moyen, téléphone 390 x 844, devant le chai) : 12 appels de dessin de plus, 0,05 ms de logique et 0,3 ms de préparation du rendu ; la carte graphique ne bouge pas. Rien ailleurs : le chien et les moineaux ne sont dessinés qu'à moins de 70 m, les ouvriers comme les autres passants (`q.persos`), rien n'est calculé quand la caméra est loin. Le chien ne porte pas d'ombre (sa tache suffit). Poids : 743 → 774 Ko (245 → 256 Ko compressé) pour les deux lots, sans aucun fichier à télécharger.

**Vérifié** : `npm run verifie` (bancs adaptés au bureau de l'ordinateur ; le parcours vérifie aussi que le parvis vit le jour et qu'il est calme le soir). Images : le portable sur ordinateur et téléphone (tableau de bord, factures, règlement, commandes, DRM, Le bureau) ; le parvis de quatre côtés, le chien, le rinceur de près.

## 24/11/2026 · Retours de Teddy (19) : le parvis mieux fait, plus vivant, plus léger ; les détails des véhicules

**Demande** : « Tu vas améliorer le décor et les animations sur le parvis, tu vas optimiser les rendus et les détails. Tu vas optimiser aussi les détails des véhicules. »

**Le parvis (monde.js, parvis.js)** :
- Les barriques sont tournées : douelles (une sur deux plus sombre), le bouge au milieu, le jable des fonds, les cercles peints à même le bois. Plus justes à l'œil, et 288 triangles au lieu de 384 (quinze barriques).
- Les flaques reflètent le ciel (la matière de l'eau, une couleur de plus dans `TYPES`, aucun programme de plus).
- Du matériel en plus, hors des passages : une brouette, deux seaux dont un renversé, des tuyaux à vin lovés et la pompe à vin sur son chariot, le balai et la raclette contre le mur, un transpalette devant les palox, la couverture et la gamelle du chien.
- Le rinceur tient la lance des deux mains (en travers du corps, la main gauche sur le tube), change de côté de temps en temps (lance baissée en marchant), vise le milieu de la barrique : le jet la touche presque toujours. Le jet est maintenant un filet d'eau continu de la buse à ce qu'il touche, qui frémit (un maillage transparent), avec moins de gouttes en vol et des éclaboussures plus fines. Le tuyau qui pendait de la lance (on aurait dit une canne) est remplacé par le raccord ; le tuyau au sol va jusqu'à ses pieds.
- Le chien est redessiné (pattes, museau effilé, truffe, taches feu, oreilles pointues) et vit davantage : il flaire quand on approche, penche la tête d'un côté puis de l'autre quand on reste tout près.
- Les piles de caisses ne sont plus au cordeau (chaque caisse un peu de travers).

**Les véhicules (engins.js, vehicules.js)** :
- Feux stop au freinage (et au frein à main) sur le tracteur, le van et la voiture qu'on conduit ; feux de recul en marche arrière sur le van ; le gyrophare du tracteur tourne quand il roule. Éteints, ils ne coûtent rien (cachés).
- Les cartons d'un véhicule vide ne sont plus dessinés (avant : un appel de dessin et une passe d'ombre pour rien, sur le tracteur et sur le van) ; les volants ne portent plus d'ombre.

**Rendu** : la caisse que porte la porteuse est une instance des caisses (un appel de dessin et une passe d'ombre de moins ; seule sa matrice part à la carte graphique) ; la sphère englobante des caisses est calculée une fois, serrée autour des piles (les caisses cachées restent à leur place, réduites à rien : avant, elles l'étiraient jusqu'à l'origine du monde). Devant le chai, au palier moyen : 104 appels de dessin (106 hier, jet d'eau compris), préparation du rendu 0,7 à 0,8 ms (0,95 hier).

**Vérifié** : `npm run verifie` (le banc de la route du château vérifie aussi le gyrophare et les feux stop) ; images du parvis, du rinceur de près, du chien, des feux du van et du gyrophare.

## 24/11/2026 · Retours de Teddy (20) : la partie sauvegardée, les missions rejouées depuis le téléphone

**Demande** : « Fais en sorte de sauvegarder dans le cache (ou ailleurs) les parties, et une fois que c'est gagné les missions, on puisse choisir de refaire la mission (à partir du téléphone). »

**Fait** :
- Sauvegarde dans le navigateur (localStorage, sur l'appareil ; sauvegarde.js). En navigation privée, rien n'est gardé et le jeu marche comme avant.
- La partie s'enregistre toute seule, toutes les quatre secondes de jeu et quand on quitte la page, seulement à un moment sûr : jamais pendant un geste (monter, charger, livrer), au chai, une livraison, le chèque, la dégustation ou un appel. Elle garde l'avancement : mission 1, les commandes et où elles en sont (quantités, signées, chargées et dans quel véhicule, livrées, facturées, transmises), la tournée lancée, le chèque, le prospect, la DRM, les étoiles ; mission 2, le message lu, la bouillie, chaque parcelle et ses travées traitées, le registre ; l'heure et l'argent.
- À l'accueil, « Continuer » (avec la mission en cours) reprend la partie, puis « Nouvelle partie ». On reprend au domaine, à pied, les véhicules à leur place, avec ce qui se voit remis : les piles signées sur la palette, les cartons dans leur véhicule, les clients servis rentrés chez eux, le chèque sur le bureau, le printemps et les rangs traités.
- Une mission est retenue comme gagnée quand on ferme Vitisoft, tout fait (mission 1), ou quand la journée de traitement est finie (mission 2).
- Le téléphone a une app Missions : chaque mission, gagnée, en cours ou à venir ; une mission gagnée se rejoue (« Rejouer », puis une confirmation : la partie en cours est remplacée, les missions gagnées le restent). La page se recharge et la mission se lance aussitôt, du début : tout repart de zéro, rien n'est oublié (saison, rangs, cartons, clients). Le son reprend au premier toucher.

**Vérifié** : nouveau banc `sauvegarde` (dans `npm run verifie`) : une tournée avancée enregistrée, la page rechargée, « Continuer », tout revient (commandes, cartons dans le tracteur, palette, client rentré, chèque, heure, au domaine) ; l'app Missions, la confirmation, la tournée rejouée du début ; la mission 2 avancée (parcelle en partie traitée, registre) reprise au printemps, mêmes travées. Les bancs de la tournée et de la mission 2 vérifient que la mission gagnée est enregistrée. Images : l'accueil avec « Continuer », l'app Missions, la confirmation.

**À savoir** : la sauvegarde est sur l'appareil et dans ce navigateur (pas de compte) ; vider les données du site l'efface.

## 24/11/2026 · Retours de Teddy (21) : la mission 2 le lendemain

**Demande** : « La mission 2 c'est pas quelques mois après, c'est le lendemain ! » Question posée (la saison : un traitement mildiou et oïdium se fait d'avril à fin juillet ; le Registre phyto ouvre le 1er janvier 2027) ; choix de Teddy : en décembre, un traitement d'hiver.

**Fait** :
- On se réveille le lendemain de la tournée, le mercredi 9 décembre, à 7 h, même saison que la veille. Le décor de printemps est retiré du code (l'uniforme `uSaison` et sa fonction dans le shader du décor, les couleurs de printemps des rangs et des feuilles soulevées).
- Claire conseille le passage d'hiver : bouillie bordelaise seule, 1,5 kg/ha, pour réduire le mildiou qui passe l'hiver, par temps sec ; l'ETA a fait les trois autres parcelles le 2 décembre. Pratique trouvée seulement sur un site de jardinage, aucune source viticole : c'est le choix de Teddy, noté en tête du bloc `TRAITEMENT`.
- Le registre : la ligne d'avant est le passage de l'ETA du 2 décembre (stade « chute des feuilles », repris pour aujourd'hui), puis le traitement du 29 juillet. Aucune année affichée (l'appli ouvre le 1er janvier 2027), « Cette campagne ». La cuve ne contient que la bouillie : le soufre, bio, est refusé (« pas dans la cuve aujourd'hui ») ; la cible est le mildiou.
- Les ouvriers du parvis parlent du traitement le lendemain (« Alors, cette tournée d'hier ? »).

**Vérifié** : bancs `traitement` (refus : parcelle pas traitée, produit pas bio, soufre pas dans la cuve, mauvaise dose, autre cible) et `sauvegarde`.

## 24/11/2026 · Retours de Teddy (22) : le château ouvert, sa route propre et bâtie, l'aire de remplissage

**Demandes** : « Revois un peu le délire autour du château. On doit pouvoir aller partout, dans l'herbe et tout. Et la route doit être propre partout. Ajoute des maisons sur la route. » (capture : à la jonction avec le tour, l'enrobé finissait en dalle sombre) ; « Et là pareil (l'aire de remplissage) : faut virer le bout de route et faire une espèce de fosse pour le tracteur. Arrange et mets des détails. »

**Fait** :
- On va partout, dans l'herbe et les collines, jusqu'à 470 m du centre (relief.js `permis`). Ce qui arrête : les maisons du village du château (boîtes tournées, nouvelles dans collisions.js `boiteO` : elles n'en avaient pas, on ne pouvait pas les approcher), leurs murs de jardin, le mur des jardins du château, ses parterres, tous les arbres. Les arbres des collines ne poussent plus dans les vignes ni sur leurs chemins.
- La route du château : un enrobé neuf, sans plaques de reprise (un type de matière de plus, `T.enrobe`), deux lignes de rive ; à l'arrivée, l'enrobé et les bas-côtés épousent le bord du tour, la bordure pavée s'ouvre devant la route (plus de coupe droite ni de bordure en travers).
- Dix maisons le long de la route : d'un côté puis de l'autre, en retrait, face à la route, là où le sol est presque plat, hors des vignes et des lacets ; un soubassement de pierre côté pente, une allée de gravier qui suit le sol, une boîte aux lettres, un arbre au fond du jardin ; des prés autour (choisies avant le terrain).
- L'aire de remplissage refaite : le bout de chemin qui la traversait est retiré (le chemin des vignes part de son bord nord) ; un bac de béton clair entre deux murets de rétention (le muret ouest ouvert devant la cuve d'eau), joints, caniveau central à grille, fosse de récupération, regard du débourbeur ; la potence au-dessus de la cuve du pulvérisateur, le compteur d'eau, la vanne, le tuyau depuis la cuve de 1 000 L ; la réserve d'eau claire pour se laver les mains ; l'armoire des produits, un bac de rétention et ses bidons, l'extincteur ; des bornes jaunes ; le panneau.

**Corrigé en route** : une maison s'était posée dans la vigne des Perrières (le guidage de la mission 2 y butait) : les maisons évitent maintenant les vignes.

**Vérifié** : bancs `chateau` (on roule dans l'herbe à 20 m de la route, posé sur la pente ; une maison de la route arrête) et `traitement` ; images de la route, de la jonction, des maisons, de l'aire avec le tracteur.

## 24/11/2026 · Retours de Teddy (23) : la démarche, la glisse, les portières

**Demandes** : « On va améliorer la démarche du vigneron / vigneronne. On dirait un robot là, tu vas faire un effort. » ; « Le drift un peu moins sensible, et les portes des voitures qui s'ouvrent un peu plus réaliste. »

**La démarche (anim.js, pieton.js)** : filmée image par image (de côté, de face, de trois quarts) avant et après. Les jambes allaient bien ; le haut du corps était figé, bras presque droits qui bougeaient à peine. Maintenant, à la marche : les bras balancent plus amplement, plus devant que derrière, en léger retard sur les jambes (le coude encore un peu plus), le coude plie quand le bras passe devant, les mains suivent ; les épaules tournent à l'opposé du bassin et penchent à l'inverse de lui, le poids passe sur la jambe d'appui, le buste se penche un peu, la tête hoche à chaque pas. On tourne un peu moins sec en marchant. La course ne change pas. Tous les personnages en profitent (passants, ouvriers du parvis).

**La glisse (vehicules.js, main.js)** : l'accélérateur ne lance plus une glisse en virage, il tient seulement une glisse lancée au frein à main ou d'un gros freinage ; ce freinage doit être plus fort et plus vite ; la voiture et le van survirent moins ; l'adhérence revient un peu plus vite. Au doigt, le frein à main demande un geste plus franc sur le côté et plus de vitesse.

**Les portières (gestes.js, engins.js)** : la serrure se décolle (un à-coup), la portière s'ouvre avec de l'élan, dépasse un peu sa butée et revient ; refermée, elle accélère, claque et rebondit d'un rien. Debout à côté, le personnage la tient par la poignée, de la main gauche (van et voitures).

**Vérifié** : images de la marche avant et après, de la portière du van qui s'ouvre (angles : -0,02, -0,36, -0,83, -1,11, -1,21 puis -1,15) ; banc `chateau` (la glisse se tient toujours 2,7 s sur 3,5, sans tête-à-queue) ; `npm run verifie`.

## 24/11/2026 · Mission 3 : l'habillage, avec Viticode

**Demande** : « On va attaquer une autre mission : Viticode. On va faire un habillage. » Puis : « On doit emmener un échantillon du vin à l'œnologue afin qu'il me donne la data pour faire mon QR code, sur Viticode ; ensuite je vais créer l'étiquette sur l'application et l'envoyer à mon imprimeur / étiqueteur, et ensuite je vais emmener une cargaison de bouteilles en tiré-bouché dans son entrepôt pour un habillage en règle. Je vais pouvoir lors de la création montrer sur le téléphone du personnage le test de l'étiquette nutritionnelle. »

**Sources lues (24/11/2026)** :
- viticode.fr : la page d'accueil (« Comment fonctionne le générateur », ses captures : fiche produit, ingrédients, déclaration nutritionnelle, consommation responsable, QR code, personnalisation du QR code), la fiche produit d'exemple côté consommateur (« Avez-vous plus de 18 ans ? », couleur, alcool, millésime, ingrédients, déclaration nutritionnelle, labels, consommation responsable). L'appli du téléphone en reprend les libellés et l'allure (rouge orangé #E84E1B, champs soulignés, puces saumon) ; la couleur de Viticode dans le jeu passe du rose au rouge orangé de la vraie appli.
- Règlement (UE) 2021/2117 (EUR-Lex), article 119 du règlement 1308/2013 modifié, §4 et §5 : l'étiquette peut se limiter à la valeur énergétique (« E »), la déclaration complète et les ingrédients par voie électronique, sans information commerciale ni collecte de données ; les allergènes restent sur l'étiquette.
- Règlement (UE) 1169/2011 (EUR-Lex), annexe XIV : alcool 29 kJ/g et 7 kcal/g, glucides 17 kJ/g et 4 kcal/g (la calculatrice de la fiche ; l'éthanol à 0,789 g/ml). 12,5 % vol et 0,8 g de glucides : 299,6 kJ, 72,24 kcal pour 100 ml.

**La mission** (mission3.js, `Habillage`) : jeudi 10 décembre, le lendemain de la journée de traitement (la mission 2 finit maintenant sur « Rentrez dormir », étape `dodo`, comme la 1). Le message de l'imprimerie Saint-Vincent : l'habillage du Clos 2025 est cet après-midi, il lui faut le fichier de la contre-étiquette. Au chai, à pied, le carton ouvert près de la palette : « Prendre un échantillon ». Au labo d'œnologie du bourg, on le donne à Hélène, l'œnologue (« raisins et sulfites, rien d'autre d'ajouté ») ; elle le rentre au labo ; son bulletin d'analyse arrive 25 s plus tard dans Messages. Dans Viticode : la fiche (nom, degré, millésime, appellation, lot, couleur ; ingrédients préchargés par catégorie, la feuille du bio, les sulfites marqués allergène ; glucides, sucres, « Calculer mon énergie », valeurs négligeables ; labels ; consommation responsable), refusée tant qu'elle ne correspond pas au bulletin (le jeu dit pourquoi, en consigne) ; publiée, son QR code ; « Testez-moi ! » : « Avez-vous plus de 18 ans ? », puis la fiche, en cinq langues (sur 24) ; la personnalisation du QR code (format, bordures, couleur ; le titre « Ingrédients / Nutrition » et le pied de page de la valeur énergétique ne se retirent pas : le jeu explique pourquoi) ; téléchargé, la feuille de partage, envoyé à l'imprimerie ; son BAT (la contre-étiquette : le QR code, « E (100 ml) = 300 kJ / 72 kcal », « Contient des sulfites », 75 cl, 12,5 % vol, lot) à valider dans Messages. Au chai, en van ou en tracteur, les 12 cartons de bouteilles tirées-bouchées : à tout moment, mais la balise les propose juste après l'échantillon (le labo et l'entrepôt sont du même côté, à l'est du bourg : en conduite assistée, un demi-tour du van devant le labo frôlait le trottoir nord, trois chocs ; dans cet ordre, aucun) ; à l'entrepôt de l'imprimerie, on les décharge devant Julien, l'étiqueteur ; la caméra regarde la ligne d'habillage (les cartons sont rentrés pendant ce temps) ; il ressort et tend la première bouteille habillée ; le téléphone s'ouvre sur l'appareil photo, on scanne la contre-étiquette : la fiche. Carte de fin : « C'est ça, Viticode. », avec viticode.fr.

**Le décor** (monde.js, modeles.js ; construit en parallèle par une copie de Claude, dans un worktree, puis recopié) :
- Le labo d'œnologie : la maison x = 128 de la rangée sud du bourg, devanture bleu-gris, verrerie en vitrine, intérieur carrelé de blanc, enseigne « LABORATOIRE D'ŒNOLOGIE », plaque de laiton. Hélène, l'œnologue, en blouse blanche, devant sa porte.
- L'entrepôt de l'imprimerie Saint-Vincent, au sud-est après le bourg : hangar de 20 x 12 m en bardage nervuré, enseigne « IMPRIMERIE SAINT-VINCENT » et « ÉTIQUETTES · HABILLAGE », grande porte ouverte, bureau vitré. Dedans, la ligne d'habillage (table d'entrée, convoyeur, monobloc capsules et étiquettes avec ses bobines, table de sortie) : les bouteilles avancent nues et ressortent habillées (deux maillages en instances) ; rayonnages de bobines, établi, palettes, néons. La cour en enrobé : chariot élévateur, benne, bobines, mât d'éclairage, une voiture du personnel. Julien, l'étiqueteur, en bleu de travail. L'accès depuis la départementale est en biais : à angle droit, le pilote coupait le coin et faisait un demi-tour.
- `definirInterieur` (modeles.js) prend une liste de boîtes : le chai, et le hangar (soleil coupé, néons froids).
- Le tirage au sort du monde n'a pas bougé (vérifié contre le dernier commit : mêmes herbes hors de la cour, mêmes vignes, mêmes cailloux).
- Coût, au palier moyen : face à l'entrepôt depuis la départementale, 0,63 ms et 51 appels de dessin (0,52 ms et 42 avant) ; dans le hangar, la ligne en vue, 1,64 ms et 160 appels ; au labo, 0,98 ms (0,94).

**La scène de la ligne** : la caméra se pose dans le hangar ; pendant la coupe, les cartons sont rentrés et Julien est derrière sa machine ; il ressort par la grande porte (la caméra cadre la scène de côté, pas depuis le toit du van), tend la bouteille, et retourne à la ligne en marchant.

**Le reste** : accueil (« Ou la mission 3 : l'habillage, avec Viticode »), app Missions (3 missions), sauvegarde (`instantane`, `reprendre` : fiche, BAT, cartons et leur véhicule, l'œnologue et l'étiqueteur rentrés), le parvis parle de l'habillage, la carte de fin de la mission 1 annonce la 3.

**Vérifié** : banc `habillage` en van et en tracteur (dans `npm run verifie`) ; banc `sauvegarde` (une mission 3 avancée reprise) ; `traitement` et `parcours` ; en conduite assistée au doigt, du domaine au chai, au labo, à l'entrepôt : 5, 29 et 10 s, aucun choc (van et tracteur) ; `essai-allege` équivalent aux trois paliers (fait sur le décor) ; images des écrans du téléphone (fiche, QR code, test, langues, personnalisation, partage, BAT, scan) et des scènes (le carton ouvert, le labo, le déchargement, la ligne, la bouteille tendue).

## 24/11/2026 · Retours de Teddy (24) : l'enjambeur, la remorque de palox

**Demande** : « Pour la mission de la pulvérisation : tu vas créer un enjambeur, aussi détaillé que le tracteur. C'est avec ça qu'on pulvérise, avec une extension, pas avec le tracteur ; et surtout, une fois que l'enjambeur est emmanché dans une allée, il fait toute la parcelle, on ne gère que l'accélération. Ensuite, pour la mission de l'étiquette, les quantités seront beaucoup plus grosses, donc on oblige le tracteur qui vient attraper une remorque remplie de palox de bouteilles qu'on va emmener à l'imprimerie. On reçoit un SMS quand c'est terminé. Attention, gros taf de détail. »

**Comment** : trois chantiers en parallèle. Une copie de Claude a fait l'enjambeur (enjambeur.js), une autre la remorque, l'attelage et le chariot élévateur (remorque.js), chacune dans son worktree ; leurs branches ont été fusionnées. Le fil principal a écrit les deux missions, le téléphone, les textes et les bancs, puis a tout branché (main.js).

**L'enjambeur** (enjambeur.js, vehicules.js, gestes.js, anim.js, camera.js) :
- Un portique haut qui enjambe un rang (voie 2,2 m), quatre roues sur leurs jambes, cabine vitrée en haut, échelle, capot, échappement en haut, phares, feux stop et de recul, gyrophare.
- Son pulvérisateur : la cuve, la soufflerie, et l'extension, deux bras qui se déplient dans les parcelles du jour. Six descentes encadrent le rang enjambé et ses deux voisins : il en traite trois à chaque passage.
- On monte par l'échelle (une vraie pose d'escalade), assis la tête sous le toit. La caméra recule et monte pour lui. Garé dans la cour. La potence de l'aire de remplissage et le portail du domaine ont été relevés pour lui.

**La mission 2** :
- Le tracteur ne pulvérise plus : arrivé en tracteur à l'aire, on entend qu'il faut l'enjambeur.
- Les passages : un rang sur trois ; un passage sur deux, puis les autres en revenant (des demi-tours qui ont de la place). Demi-tours dans les tournières : quart de tour, la tournière tout droit, quart de tour, rayon 4,2 m (l'enjambeur braque à 3,6 m). Les premiers demi-tours en arc de 10 m de rayon sortaient de la parcelle : le guidage lâchait l'enjambeur.
- Une fois engagé dans un rang (son axe sur un passage, dans son sens), il fait toute la parcelle tout seul. On ne gère que l'avance : doigt posé ou flèche du haut, il avance ; vers le bas, il freine ; rien, il s'arrête ; le volant ne fait rien. Le pilote, pour lui, vise plus près et ne fait jamais de demi-tour en trois temps (`serre`). La scène va trois fois plus vite, dans les rangs et dans les tournières.

**La remorque et la mission 3** (remorque.js, mission3.js) :
- Une remorque plateau à ridelles, timon, béquille, tandem, chargée de six palox de bouteilles tirées-bouchées, garée au domaine, timon vers la départementale. L'échantillon se prend à pied, dans un palox.
- Seul le tracteur l'attelle (en van : « il faut le tracteur ») : arrêté devant le timon, il recule tout seul, on lève la béquille, on met la goupille. Attelée, elle suit le tracteur (sans se mettre en portefeuille), alourdit le tracteur, bute contre le décor, les véhicules et les voitures, et repousse les piétons ; à pied, on la contourne.
- Le labo, Viticode et le BAT ne changent pas. À l'imprimerie, on dételle dans la cour ; Julien monte sur son chariot élévateur (un vrai modèle, mât, fourches) et rentre les six palox près de la ligne d'habillage, qui tourne. On est libre ; 45 s après le dernier palox, le SMS : « C'est terminé ! Les six palox du Clos 2025 sont habillés », la photo d'une bouteille habillée, le lien de sa fiche (comme le client la verra). Le lire finit la mission.
- Plus de cartons ni de carton ouvert au chai, plus de bouteille tendue ni de scan.

**Vérifié** : bancs `traitement` (l'enjambeur ; trois parcelles en 98 à 112 s ; engagé, la flèche de droite tenue 2 s : il reste à 0,30 m de l'axe du rang), `habillage` (en conduite assistée, remorque attelée, du domaine au labo en 40 s puis à l'imprimerie en 13 s : aucun choc, la remorque ne bute jamais ; dételée à sa place ; les six palox rentrés ; le SMS), `sauvegarde` (une mission 3 livrée reprise : la remorque dans la cour, les palox rentrés, le SMS arrive).

## 25/11/2026 · Retours de Teddy (25) : code optimisé, missions verrouillées, nouvel accueil, montées et descentes, arbres, mission 3 refaite, zone d'activités

**Demandes** : « Clear le code, optimise à fond ce que tu viens de faire » ; « les niveaux ne sont pas accessibles dès le début : ils le sont quand on a terminé le niveau » ; « l'écran de démarrage, quelque chose de mieux » ; « les cinématiques de montée et de descente des véhicules : on dirait qu'il fait du toboggan, il faut un truc plus naturel ». Puis : « les arbres : un espace entre le tronc et les feuilles » ; la mission Viticode : l'échantillon pris au chai, la remorque pas prête à ce moment-là, un salarié qui prévient au retour du labo qu'il l'a préparée, au même endroit, et aide à l'atteler ; on l'emmène ; six heures ou une nuit plus tard, le message de l'imprimeur : c'est bon ; aller chercher la remorque, la déposer au chai, mission terminée. Puis : « l'imprimerie Saint-Vincent, plutôt dans une petite zone industrielle avec 2 ou 3 boîtes, à l'extérieur du village ; il y aura notre bureau aussi, de Solumatic ».

**Optimisation et nettoyage** (une copie de Claude, dans un worktree, fusionnée) : moins d'appels de dessin et de triangles (cour du domaine 125 → 120 appels, 253 k → 233 k triangles ; cour de l'imprimerie 214 → 200, 463 k → 421 k ; dans le hangar 174 k → 133 k triangles, palier moyen) ; pièces fixes figées ; roues arrière fondues ; palox dont seule la caisse porte ombre ; véhicules non dessinés sous la brume ; un vrai bug : mission2.js refaisait l'itinéraire (Dijkstra) à chaque image, la conduite assistée repartait de zéro à chaque image ; code mort retiré (remorque, chariot, enjambeur).

**Missions verrouillées, accueil** : la mission 1 toujours ouverte ; la 2 quand la 1 est gagnée, la 3 quand la 2 l'est (ou elle-même déjà gagnée). L'accueil : trois cartes, trois jours (8, 9, 10 décembre), l'appli de chacune, une médaille quand elle est gagnée, un cadenas sinon ; « Jouer » lance la première mission ouverte et pas gagnée, « Continuer » la partie enregistrée ; l'aide repliée (« Comment jouer »). Derrière, des plans du monde qui glissent, enchaînés en fondu : le personnage choisi dans la cour (il regarde la caméra), les Perrières, le bourg qui vit, les Grands Champs et le moulin, le château. L'ancienne orbite entrait dans l'enjambeur sur grand écran.

**Montées et descentes** : temps par temps (gestes.js `MONTEES`, anim.js `poseAppuis`), les pieds posés sur les marches, les barreaux, le plancher, sans glisser ; les mains aux poignées ; le bassin ne monte que quand la jambe d'en haut pousse. Le tracteur a deux marchepieds (0,44 et 0,84 m) : on monte marche par marche, face au poste, puis on se tourne et l'on s'assoit. Le van : un pied sur le plancher de la cabine, la main au montant, on se hisse. Une voiture : on se met dos au siège, on s'assoit au bord en baissant la tête, on pivote en rentrant les jambes. L'enjambeur : une main puis le pied de l'autre côté, barreau par barreau, le palier, la porte en se baissant. Descendre : la même chose à rebours, un peu plus vite.

**Arbres** : le tronc monte jusque dans le feuillage (le bas d'un feuillage peu facetté est plus haut que son rayon) ; même tirage au sort.

**Mission 3 refaite** : l'échantillon au carton ouvert du chai ; le labo (en van ou autrement) ; Marc, le salarié du domaine, prépare la remorque pendant ce temps et le dit au retour ; en tracteur devant le timon, Marc attelle (on reste au volant) ; l'imprimerie ; Julien rentre les palox ; l'habillage prend l'après-midi : on rentre dormir (au réveil, vendredi 11 décembre, le message de l'imprimerie, la photo, le lien de la fiche ; les véhicules rangés dans la cour) ou six heures de jeu passent ; on va reprendre la remorque, rechargée de palox habillés (capsules bordeaux), tournée vers la sortie : le tracteur se met en travers dans la cour, recule sur l'anneau, Julien attelle ; on la ramène au chai, posée dans la cour derrière le portail : c'est fini. La conduite assistée ne fait plus de demi-tour en trois temps avec une remorque, et ses demi-tours ne braquent que de 60° à la fois en avant (le van se coinçait contre un platane du trottoir nord devant le labo) ; l'entrée de l'allée du domaine est arrondie dans le réseau (la remorque coupait le virage et butait contre un peuplier, retiré sans changer le tirage) ; le panneau du domaine est passé à l'ouest de l'allée.

**Zone d'activités des Coteaux** : à l'est du bourg, de part et d'autre de la départementale, sur un terrain mis à plat (relief.js `ZA`) : l'imprimerie Saint-Vincent (le hangar, sa cour, sa ligne d'habillage, décalés de 53,5 m ; le chariot élévateur suit), le bureau de Solumatic (deux niveaux, bardage clair et bois, bandeaux vitrés, enseigne, parking, totem au bord de la route), une tonnellerie (hangar de bois sous l'ardoise, barriques en pyramide, merrains, brasero), le panneau de la zone, des lampadaires. La mini-carte va jusqu'à 260 m. L'ancien emplacement redevient un pré (le chêne qui y poussait revient).

**Vérifié** : bancs `habillage` (tout le nouveau déroulé : en conduite assistée, le van au labo 32 s ; la remorque jusqu'à l'imprimerie 50 s, au retour jusqu'au chai 54 s, aucun choc, la remorque ne bute jamais), `sauvegarde` (accueil verrouillé ; une mission 3 livrée reprise, la nuit, le message), `chateau`, `voitures`, `traitement`, `parcours` ; images des plans de l'accueil (téléphone et ordinateur), des montées et descentes (tracteur, van, voiture, enjambeur), de la zone d'activités, des arbres.

## 25/11/2026 · Retours de Teddy (26) : Solumatic au vrai logo, en retrait, et dedans ; la tonnellerie qui vit

**Demandes** : « reprendre l'entreprise Solumatic, le vrai logo dessus, que tu vas recréer ; on est sur un rez-de-chaussée unique » (deux photos de la façade, une vue aérienne) ; « on va pouvoir rentrer dedans » ; « il ne va pas être en bordure de route, il va être en retrait dans la zone industrielle » ; « améliore à fond le parvis de la tonnellerie, beaucoup plus vivant et réaliste, plus de détails » ; puis le plan des bureaux, « tu peux commencer à faire des trucs ».

**Le logo** (logo.js) : redessiné en code d'après le logo officiel (`crm-solumatic/public/logo-solumatic.png`) : « SOLUMATiC » en capitales géométriques noires, le O en anneau orange ouvert en haut, le A sans barre, le point du i orange ; le carré orange dégradé et son S blanc, « OLUTIONS INFORMATIQUES » en orange. Comparé au logo officiel, superposé (seul le petit texte s'écarte de quelques pixels). Sur la bâche de la façade (sa propre texture), à la grille, à côté de la porte, au mur du hall.

**La zone d'activités** : une rue (6 m, bordures, arbres d'alignement, lampadaires, une borne d'incendie) monte de la départementale à la grille de Solumatic, au fond ; à l'est, la tonnellerie ; à l'ouest, un lot à vendre. Le terrain à plat va plus au nord (relief.js `ZA`), l'herbe au lieu des champs dans la zone. La rue est dans le réseau (on y entre en biais, d'un côté ou de l'autre).

**Solumatic** : un rez-de-chaussée de 22 x 26 m, toit plat, d'après les photos : enduit clair en panneaux, la bâche au logo au-dessus de quatre fenêtres aux volets roulants à moitié baissés, le parement de pierre du hall autour de la porte vitrée, l'atelier et ses deux rideaux métalliques blancs sous un auvent, deux projecteurs ; le toit en bac acier clair au-dessus de l'atelier, de la salle serveurs et de la salle à manger, membrane sombre et six lanterneaux ailleurs (la vue aérienne), la clim de la salle serveurs sur la façade ouest. Autour : une haie de charmille (arrondie au nord-est), la grille coulissante ouverte, le parvis et cinq places (une pour les personnes handicapées), une terrasse au nord (porte-fenêtre de la salle à manger), la pelouse à l'est, cinq tables de pique-nique, de grands sapins, des cyprès.

**Dedans** (solumatic.js) : le plan de Teddy, posé tourné (son côté gauche sur la façade sud, son haut à l'ouest), 27,5 pixels par mètre : l'atelier, la salle serveurs, la salle à manger, le hall, le réfectoire, les bureaux 1 à 7, la chaufferie, les trois sanitaires, la réserve, la buanderie, le couloir autour du bloc central. Seule la disposition des pièces est reprise (ni l'adresse, ni le reste du document). Le passage entre le hall et le couloir de droite est élargi à un mètre (le plan n'y laisse qu'un trait). Meublé : postes à deux écrans, armoires, plantes, banque d'accueil orange, canapé, fontaine, établis et unités centrales ouvertes, quatre baies de serveurs et leurs voyants, onduleur, clim, cuisine équipée et grande table, réfectoire, chaudière et ballon, sanitaires, archives, lave-linge, photocopieuse, extincteurs, panneau d'affichage. Cinq personnes travaillent à leur poste (créées à la première visite), lèvent les yeux et saluent qui passe. On entre par la porte (fondu au noir) ; dedans, le toit et le haut des murs ne sont plus dessinés, la caméra plonge d'en haut et suit (camera.js `plongee`), les cloisons arrêtent. Le soleil coupé, six lampes (definirInterieur).

**La tonnellerie** (monde.js, tonnellerie.js) : l'atelier, une vieille bâtisse de moellons et tuffeau, toit d'ardoise, cheminée qui fume, grande porte coulissante ouverte (dedans, la pénombre, une barrique, la lueur du feu) ; l'appentis de la chauffe : trois barriques montées « en rose » (douelles écartées en bas, haut noirci, deux cercles), le feu de copeaux dans chacune (flammes, braises, fumée, étincelles, crépitement) ; le cercleur à la masse et à la chasse sur la barrique de son billot (le coup sec), le chauffeur qui mouille le bois au goupillon (la vapeur), la rouleuse qui sort les barriques finies de l'atelier et les roule sur leur bouge jusqu'au stock ; cercles et fonds contre le mur, deux barriques en essai d'eau, le cabestan, le bac de copeaux ; le parc à merrains (quinze piles de douelles en croisillons, grises, les plus récentes blondes), les grumes de chêne, deux pyramides de barriques, des palettes filmées, le camion de livraison chargé, le chariot élévateur, un muret, une palissade, l'enseigne. Ils travaillent de 7 h 30 à 18 h 30, saluent qui passe ; le feu couve la nuit.

**Vérifié** : banc `nuit` (la tonnellerie vit : 22 coups de masse en 20 s, le feu, la rouleuse ; « Entrer chez Solumatic », dedans sans le toit, cinq personnes ; dans le hall, la cloison du bout arrête ; on ressort, le toit revient), captures (façade, vue aérienne, intérieur d'en haut, postes de travail, feu de jour et de nuit), tous les bancs.

## 25/11/2026 · Retours de Teddy (27) : le domaine (hangar, arbre centenaire, parking, portail en fer forgé, porte du chai) ; Marc et le transpalette

**Demandes** : « un gros garage ouvert pour ranger le tracteur, l'enjambeur, un transpalette et d'autres machines, derrière le chai, un peu caché mais accessible » ; « sur le parvis, un arbre centenaire au milieu avec un peu d'herbe autour, et des parkings pour les visiteurs » ; « virer la pancarte de la zone de remplissage, c'est moche » ; « la pancarte du domaine : quand on passe dessous ou qu'on la voit derrière, il faut un truc en fer forgé, plus haut » ; « l'enjambeur ne rentre pas dans le chai : monter le haut de la porte » ; « à la fin de la mission Viticode, Marc vient aider à décharger la remorque dans le chai avec le transpalette ; il rentre aussi quand il a fini d'aider pour le départ ; il s'échappe si on essaie de l'écraser, en criant : attention aux accidents du travail, ça va te coûter cher ».

**Le domaine** : le hangar ouvert derrière le bout du chai, trois travées (le tracteur, l'enjambeur, le transpalette et l'atelier : établi, panneau d'outils, étagères de bidons, pneus, un broyeur), toit de bac acier à deux pans (5 m à l'égout), soubassement de parpaings, bardage, néons, la cuve à gazole dehors ; le tracteur et l'enjambeur y sont rangés (au départ, la nuit). On y va par la cour, entre l'aire de remplissage et le bureau du chai (dans le réseau : la conduite assistée en sort). L'arbre centenaire : un vieux chêne au milieu de la cour, son rond d'herbe bordé de tuffeau, un banc circulaire, des feuilles tombées ; le vieux pressoir à cage est passé à côté (il était sur le chemin du hangar). Le parking des visiteurs : trois places entre des rondins, à l'ouest, sous le cèdre (deux voitures garées), hors de la sortie du van. Le portail : une arche de fer forgé (montants doubles, deux arcs et leurs barreaux, volutes, une grappe au sommet, le nom découpé dans le fer, lisible des deux côtés, deux lanternes), à 5 m au plus bas. La grande porte du chai monte à 5 m. Plus de panneau à l'aire de remplissage.

**Marc et le transpalette** : le transpalette est un gerbeur électrique à plateforme (un transpalette simple ne lèverait pas un palox du plateau de la remorque, à 1,06 m) : bloc moteur, mât, fourches, plateforme, timon. Au départ de la mission 3, Marc attelle puis rentre à la maison, par le portail. Quand on reprend la remorque à l'imprimerie (on est loin), il sort le transpalette et attend devant le chai ; la remorque posée, il rentre les six palox au chai (debout sur la plateforme, les mains au timon), deux par pile devant les cuves ; la grande porte reste ouverte ; la mission est gagnée quand le dernier est posé (environ 80 s). Quand on fonce sur lui en véhicule, il s'écarte d'un saut, du côté où il a la place d'atterrir, et crie « Attention aux accidents du travail ! Ça va te coûter cher ! ».

**Vérifié** : bancs `habillage` (Marc rentre à la maison après l'attelage ; il attend sur le transpalette quand on reprend la remorque ; il range les six palox, fourches montées à 1,32 m, la porte ouverte, puis la mission est gagnée), `nuit` (le hangar ; Marc s'écarte d'un tracteur lancé sur lui, au plus près à 4,3 m, et crie), tous les bancs (le parcours en tracteur part du hangar) ; captures (le hangar, l'arbre, le portail des deux côtés, l'enjambeur sous la porte du chai, Marc au travail).

## 25/11/2026 · Retours de Teddy (28) : le château vit

**Demande** : « faut mettre de l'activité au château : des gens, des voitures, des restaurants, des terrasses » (fait par une copie de Claude, dans un worktree, à fusionner).

**Fait** :
- Trois maisons du village du château reçoivent une devanture, sans rien changer au tirage du village (elles tirent quand même les fenêtres remplacées) : Le Relais des Tourelles, à côté de l'arrivée de la route ; le Café de la Poivrière, à côté du belvédère ; la Crêperie du Châtelet, face aux jardins (noms inventés). Leurs terrasses sur le trottoir : un platelage de bois, des jardinières fleuries aux deux bouts, des tables rondes et leurs chaises en deux rangs, l'assiette et le verre de chaque place, des carafes et des bouteilles, des parasols à leur couleur au bord de la rue, l'ardoise du menu près de la porte (le passage devant la porte reste libre ; ni table ni voiture sous un réverbère). Le trottoir pavé tout autour de la route du tour ; six places de stationnement sur le trottoir, une voiture garée sur chacune (à la hauteur du plateau : les voitures garées ont maintenant une hauteur).
- La vie (village.js) : une quarantaine de personnes. Aux terrasses, des gens attablés (sept sur dix un verre à la main, ils boivent de temps en temps), qui regardent leur voisin, le serveur qui vient, qui passe tout près ; un serveur par terrasse, son plateau, de la porte à une table par l'allée entre les deux rangs, et retour. Des touristes flânent sur le bord intérieur de la route du tour, dans la cour d'honneur, dans l'allée du châtelet, et prennent le château en photo (téléphone levé, flash) ; ils s'écartent du véhicule qui arrive comme les passants du bourg (mode WTF compris). Au belvédère, deux personnes sur les bancs, deux à la balustrade qui regardent la vallée. Ils saluent qui passe tout près, chacun ses répliques (textes.js `VILLAGE`). Terrasses de 11 h à 23 h, touristes de 8 h 30 à 19 h 30.
- Deux voitures montent du bourg par la route du château (file de droite), font le tour (sens inverse des aiguilles d'une montre, file extérieure), redescendent, attendent au stop d'en bas et remontent quand personne ne regarde ; elles ralentissent dans les lacets, s'arrêtent devant le joueur, un véhicule, un touriste ou l'autre voiture, klaxonnent, s'allument la nuit ; on les emprunte comme celles de la départementale (une autre arrive 20 s plus tard ; leur conducteur reste autour). Le véhicule qu'on conduit les heurte (leurs deux cercles suivent leur axe), la conduite assistée les voit.
- Petites retouches communes : assis, la hauteur du sol sous la chaise (`p.y0`) ; l'intérieur peint d'une devanture à la hauteur de sa maison ; l'étiquette « Emprunter la voiture » et les cris des passants à leur hauteur.

**Coût** (palier moyen, 1280 x 800) : au château, 101 → 161 appels de dessin, 202 k → 321 k triangles, 0,3 ms de jeu et 0,5 ms de rendu en plus ; au domaine, inchangé (96 appels) ; au bourg, 56 → 61 (les deux voitures qui roulent, au loin). Les gens ne sont créés qu'en approchant, et rien n'est calculé au-delà de 260 m (les voitures roulent toujours : un point sur un chemin).

**Vérifié** : banc `chateau` (trois terrasses de 8, 16 et 12 places, six voitures garées sur le plateau ; 15 à 18 attablés, 3 serveurs, 14 touristes qui bougent et photographient, 4 au belvédère ; une voiture monte, s'arrête à 3,4 m devant le joueur, klaxonne, s'emprunte, repart ; phares la nuit ; puis les essais de la route, inchangés), banc `voitures`, captures (terrasses, belvédère, vue d'en haut), tous les bancs.
