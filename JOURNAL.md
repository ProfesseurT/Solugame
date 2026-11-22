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
