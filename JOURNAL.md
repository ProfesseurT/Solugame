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
