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
