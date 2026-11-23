# Tournée générale (dépôt Solugame)

Jeu en monde ouvert 3D, de l'équipe Solumatic. On vit la journée d'un vigneron ou d'une vigneronne dans un village viticole de la Loire : à pied, en tracteur, avec son téléphone (le bureau, Viticode, Registre phyto) et le portable du bureau du chai (Le bureau et Vitisoft : Vitisoft n'a pas d'appli téléphone). Mise en abyme : le personnage résout les situations avec les vraies applis, en version simplifiée. S'inspire du genre « monde ouvert » (liberté, véhicules, missions par téléphone, mini-carte, étoiles, radio) sans rien copier de GTA : nom, personnages, logo, police, visuels, musique et carte sont 100 % originaux.

But business : faire découvrir nos outils et amener vers la prévente du registre phyto (`?source=jeu-tournee-generale`) jusqu'au 31/12/2026.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/index.html` | Écrans HTML et tout le CSS (HUD, téléphone, portable du bureau du chai, fondu, accueil, fin). L'aide de l'accueil y est écrite (doigt ou clavier selon l'appareil) : elle s'affiche avant le script. |
| `src/main.js` | Boucle de jeu, ombres (cadre du soleil), entrées, servir un verre, branchements entre modules, banc de test `window.CL`. |
| `src/qualite.js` | Paliers de qualité (`QUALITES`, `Paliers`) : estimation au démarrage, sonde pendant l'accueil, résolution adaptative, compilation des shaders en tâche de fond. |
| `src/particules.js` | Particules (fumée, feuilles, gravillons, eau de la fontaine) et ombres de contact (`Taches`), en instances, sans allocation pendant le jeu. |
| `src/bureau.js` | Le bureau du chai côté jeu : porte (entrer, sortir), chèque déposé, s'asseoir au portable, se lever ; ses étiquettes et sa caméra. |
| `src/monde.js` | Le monde construit en code (ciel, lumière, collines, routes, vignes, bâtiments, arbres, détails, mini-carte), fusionné par quartiers. Vieilles bâtisses (`maison` : tuffeau, moellons ou enduit, chaînes d'angle, lucarnes, cheminées, vigne vierge ou treille), murs de clôture de la rue (`cloture`), église Saint-Vincent, deux croix (calvaire à l'entrée du bourg, croix de fer au chemin des Grands Champs). Le chai et son bureau (`chaiEtBureau`), le hameau des Grands Champs et son moulin (`hameau`, avec son propre tirage au sort). |
| `src/modeles.js` | Formes de base, toits (`toit`), matières et textures procédurales dans le shader (pierre, moellons, enduit, ardoise, asphalte, pavés, vent...). |
| `src/perso.js` | Personnages : un seul SkinnedMesh par personnage (18 os), tenues, visages (relief : arcades, pommettes, menton, `reliefVisage`), mains ; cou épais un peu penché vers l'avant, trapèzes (le haut du buste monte en pente jusqu'au cou), épaules en dôme ; cols inclinés autour du cou (`col`), bretelles et cordons qui passent sur les épaules (`sangle`) ; peau souple aux jointures (`liens` : un sommet proche d'une jointure suit aussi l'os voisin) ; coordonnées de texture dans le repère du personnage. |
| `src/atlas.js` | Atlas des personnages (1024 x 512) : visages, yeux, main, tissus (toile, jean, maille, cuir...), cheveux, dessinés en code une fois au démarrage et partagés par tous. |
| `src/anim.js` | Animation procédurale : marche, course, pieds posés au sol, repos, regard, téléphone en main, salut, conduite (poste du tracteur ou du van), saut de côté, servir un verre, boire. |
| `src/gestes.js` | Gestes joués tout seuls, étape par étape : monter dans le tracteur (marchepied) ou le van (portière qui s'ouvre et se referme), en descendre ; charger les piles de cartons de la palette du chai, les décharger devant un client (porte coulissante du van), remonter. Pendant un geste, le joueur ne commande plus le personnage ; la caméra cadre la scène de côté. |
| `src/pieton.js` | Déplacement du personnage et des passants (accélération, virages, recul contre un mur). |
| `src/engins.js` | Modèles du tracteur, du van de livraison (même interface, avec `dims`, `volantCentre`, `volantRayon`) et des voitures (feux stop, clignotants, détresse). |
| `src/vehicules.js` | Conduite du tracteur et du van (une physique, réglée par `TEMPERAMENTS` et les `dims` du modèle ; dérive : vitesse de côté freinée par l'adhérence des pneus, perdue au frein à main ou en freinant fort en virage), voitures de la départementale (choc : secousse, arrêt, feux de détresse), `natureSol`. |
| `src/pilote.js` | Conduite assistée au doigt : suit l'itinéraire de la mission (file de droite), ralentit dans les virages et derrière une voiture, cède le passage au bout d'un chemin ou d'une rue, s'arrête à destination. |
| `src/camera.js` | Caméra qui suit, anticipe, évite les murs, se tourne à la main. |
| `src/controles.js` | Doigt (manche), deux doigts (caméra), souris, clavier, manette. |
| `src/audio.js` | Sons synthétisés : moteur, pas selon le sol, ambiance, cloche, Radio Sarment. |
| `src/collisions.js` | Collisions au sol en 2D (boîtes, rangs de vigne, limites). |
| `src/hud.js` | Interface par-dessus le monde : mini-carte, argent, étoiles de retard, objectif, sous-titres, bannières, bandeau radio, étiquettes posées sur les objets du monde. |
| `src/telephone.js` | Le téléphone : le bureau (rappels, commandes, signature en ligne, tournée, bon de livraison signé au doigt), Viticode, Registre phyto, Messages, Réglages. |
| `src/pc.js` | Le portable du bureau du chai : un navigateur à deux onglets, Le bureau (les écrans du téléphone, `tel.vuePortable()` ; les appels partent du téléphone) et Vitisoft (À faire, règlements, commandes arrivées du bureau à facturer et envoyer avec Pennylane, DRM du mois dernier). |
| `src/mission.js` | La mission de démo « La tournée de Noël » : 5 tâches du jour dans le bureau (3 commandes à saisir, quantité à zéro, à mettre à celle dite au téléphone ; le règlement en retard et le prospect à ajouter à la tournée), chargement au chai, tournée de 5 arrêts (le chèque de l'Épicerie du Bourg, 3 livraisons, la dégustation chez le prospect, l'Auberge du Moulin aux Grands Champs, notée dans le bureau, à rappeler), retour au bureau du chai (déposer le chèque), puis Vitisoft sur le portable : saisir le règlement, facturer les 3 commandes, calculer la DRM du mois dernier. Itinéraire de chaque étape depuis l'arrêt précédent (`DEPART`). |
| `src/textes.js` | Dialogues, messages, carte de fin, textes produit et prévente (`EN_PREVENTE`). Règle de vérité : rien sans source. Les libellés d'interface (boutons, statuts, étiquettes) restent dans leur module (`main.js`, `telephone.js`, `pc.js`, `mission.js`, `hud.js`) : toute phrase sur un produit, où qu'elle soit, suit les règles du client ci-dessous. |
| `src/outils.js` | Petits outils partagés : angles, tirage au sort reproductible (`hasard(graine)`). |
| `scripts/build.mjs` | Assemble et minifie (esbuild, three.js inclus), refuse tout tiret cadratin ou demi-cadratin. |
| `scripts/allege-three.mjs` | Plugin esbuild : retire de three.js ce que le jeu n'utilise jamais (shaders, GLSL, code mort), d'après ce que `src/` nomme. Dépend de three 0.170.0. |
| `scripts/essai-allege.mjs` | Banc qui prouve que l'allègement ne change rien (programmes, GLSL, shaders traduits, images au bit près) : à relancer après une mise à jour de three ou un changement de matière. |
| `scripts/essai.mjs` | Banc d'essai sans fenêtre (Chrome + puppeteer-core) : `parcours`, `perf`, `photo`, `accueil`, `poids` (démarrage, mémoire, coût de chaque étape d'une image ; `LENT=4` simule un processeur 4 fois plus lent, `QUALITE=faible` impose un palier). `essai-perso*.mjs` : bancs des personnages. |
| `scripts/verifie.mjs` | `npm run verifie`, avant chaque push : build, mission entière en tracteur et en van (390 x 844, en parallèle), puis contrôle git (`index.html` doit être commité avec `src/`). Code 1 si quelque chose ne va pas. |
| `index.html` | Généré : page complète pour GitHub Pages. Ne pas éditer à la main. |
| `dist/jeu.html` | Généré : fragment publié en Artifact (non versionné). |
| `JOURNAL.md` | Décisions, vérifications, état. |

Première fois : `npm install`. Après toute modification de `src/` : `npm run verifie` (build, puis la mission entière en tracteur et en van ; finit sur « Prêt à pousser » ou dit quoi commiter). Essai local dans un navigateur : `npm run serve` puis http://127.0.0.1:8642/. Forcer un palier : `?qualite=faible|moyen|haut`.

Adresse publique : https://professeurt.github.io/Solugame/ (GitHub Pages, branche `main`, racine, `.nojekyll`). Chaque push sur `main` met le jeu en ligne en une minute environ : ne pousser qu'après un `npm run verifie` qui finit sur « Prêt à pousser » (build, parcours tracteur et van, `index.html` dans le même commit que `src/`).

Artifact privé de test : https://claude.ai/artifact/4ajbpvSSK4StrtXKRcdWJ6 (republier depuis `dist/jeu.html`).

## Règles du client (héritées du projet Bureau du Vigneron et d'« À vous de jouer »)

- **Jamais de tiret cadratin ni de demi-cadratin**, nulle part (le build bloque).
- **Règle de vérité** : chaque date, chiffre ou promesse produit affiché est vérifié à sa source. Fiche de faits : `JOURNAL.md` du dépôt `a-vous-de-jouer` (21/11/2026).
- Registre phyto : jamais « vous êtes en règle » ; pas de nom d'appli inventé (on dit « Registre phyto ») ; l'appli ouvre le 1er janvier 2027 (ne pas la décrire comme disponible avant) ; prévente 4,99 € HT/mois jusqu'au 31/12/2026, ensuite 9,99 € HT/mois. Bascule automatique des textes (`EN_PREVENTE`).
- « 3 500 comptes Viticode » et « 2 000 domaines chez Vitisoft » : jamais additionnés.
- Étiquetage : c'est l'information qui est obligatoire, pas le QR code.
- On dit « les douanes ». Hors UE, c'est un DAE. DAE et DSA sont deux régimes différents.
- Vitisoft calcule la DRM (validée dans CIEL), génère DAE et DAES sur GAMMA 2, fait les factures en Factur-X. Pennylane, plateforme agréée, transporte les factures (Pennylane ne fait jamais la facture). Le journal des ventes, TVA comprise, part dans le logiciel du comptable. Vitisoft ne transmet pas la DRM et ne tient pas la comptabilité.
- Le bureau (extension web de Vitisoft) : ni prix, ni date, ni « IA ». Il dit chaque jour qui rappeler, quoi proposer ; la commande se prépare pendant l'appel, le client la signe sur son téléphone via un lien personnel sans compte, elle arrive dans Vitisoft sans ressaisie ; écran Tournée (arrêts dans l'ordre, itinéraire au départ du domaine). Source : vitisoft.fr/fonctionnalites/le-bureau-application-commerciale.
- Pas de crime dans le jeu : les bêtises restent comiques (rodéo en tracteur, raccourcis dans les vignes), jamais de fraude ni d'échappatoire aux douanes. Les passants s'écartent, personne n'est blessé.
- Téléphone d'abord : plein écran, gestes, aucun bouton de commande à l'écran. Toucher le téléphone du personnage ou une étiquette posée sur un objet du monde, c'est toucher un objet du jeu.
- Push sur `main` : Claude pousse lui-même, lot par lot, quand tout est au vert (accord de Teddy du 23/11/2026). Le reste (publication ailleurs, Artifact partagé, autre dépôt) reste soumis à son accord. Le dépôt GitHub est public : tout push est visible.

## Conception (pour reprendre le code)

- Unités en mètres, y vers le haut, nord = -z. Cap `h` : avant = (sin h, cos h). Zone de jeu ±186 m, collines au-delà.
- Lieux de la mission dans `lieux` (monde.js) : départ et tracteur au domaine (-99, -55), chai (-80.6, -52), palette des commandes (`palette`), bureau du chai (`bureau` : la pièce au bout sud du chai, x de -75,7 à -71,2, z de -64,7 à -59,6, porte en z = -60,6 ; `pc` : devant sa porte), arrêts de la tournée (`arrets` : epicerie, cave, bar, treille, auberge ; l'auberge est aux Grands Champs, au bout du chemin x = -55), itinéraires (`route`, `retour`), clients (`figurants`). L'Épicerie du Bourg est la maison du bourg en x = 80, côté nord.
- Matières : `MAT` (couleurs par sommet, facettes) pour tout le décor fusionné ; `matiere(type)` pour les instances (vignes, arbres). Peu d'appels de dessin : décor fusionné, vignes et arbres en instances.
- Textures procédurales (modeles.js) : aucune image, le shader dessine la matière d'après la position dans le monde. Le type (`T` : pierre, moellon, enduit, ardoise, asphalte, herbe, gravier, terre, bois, feuillage, vitre, pavés, petits pavés...) vient de la couleur du sommet (table `TYPES`) : une nouvelle couleur de mur ou de toit doit y être ajoutée pour recevoir sa texture.
- Toits (`toit`, modeles.js) : posés sur les dimensions des murs, épais, débord à l'égout et aux rives, dessous en voliges, tuiles faîtières, pignons dans le plan des murs (couleur du mur) ; rend une liste de morceaux à fusionner avec le décor. Ce qui varie d'une maison à l'autre (mur, ardoise, lucarnes, plantes) est tiré d'après sa place (`hm`), pas du tirage au sort du monde. Détails plats (chaînes d'angle, encadrements) en plaques d'un seul quadrilatère.
- Sols du bourg : la départementale est une vieille chaussée claire entre deux caniveaux pavés, pavée au cœur du bourg (x de 70 à 120) ; la rue de la place en petits pavés ; `natureSol` (vehicules.js) suit ces zones.
- Conduite au doigt (repensée le 22/11/2026, la précédente était trop difficile sur téléphone) : doigt posé = on avance à vitesse de croisière ; pendant la mission, le véhicule suit tout seul l'itinéraire (`pilote.js` : file de droite sur la départementale, ralentit dans les virages et derrière une voiture, s'arrête à destination, demi-tour en trois temps dans les rues étroites, ne s'engage que près de l'itinéraire). Glisser sur le côté = tourner soi-même ; vers le bas = freiner puis reculer ; vers le bas et sur le côté, lancé = frein à main (dérapage) ; vers le haut = un peu plus vite ; doigt levé = on s'arrête. Clavier et manette : conduite à la main, espace ou RB (X au volant) = frein à main. En dérapage : traces de pneus (`Traces`, particules.js), fumée ou poussière, crissement.
- Cartons : un seul modèle (`geoCarton`, engins.js), en piles de 3 au plus. Palette des commandes du jour devant le chai (`lieux.palette`, piles posées par main.js d'après `mission.pilesPrevues()`), véhicules rangés en 6 colonnes de 3 (`tm.cartons`, colonne c : cartons 3c à 3c + 2), un client par colonne ; on charge et décharge par le côté (`tm.chargeur`). Les piles livrées restent devant les clients (`mission.deposes`). Doigt posé ou flèche enfoncée : la scène va 3 fois plus vite. Le bon de livraison ne s'ouvre qu'une fois les cartons posés (`mission.blPret`).
- Bureau du chai (monde.js, `chaiEtBureau`) : le volume du chai est fait de blocs qui laissent la pièce vide, la façade percée à la porte, le soubassement réduit à un rebord ; l'intérieur est un maillage à part, sans ombre portée (sinon le toit le plonge dans le noir). Collisions : murs et meubles en boîtes, la pièce en boîte `fantome` (compte pour la caméra du dehors, n'arrête personne). On entre et on sort par la porte (gestes.js `passer` : fondu au noir au seuil, `jeu.dedans`), la caméra de la pièce est posée dans un coin (camera.js `salle`) et passe derrière l'épaule au portable. Dedans : déposer le chèque (sur le bureau), s'asseoir au portable (`pc.ouvrir`), se lever (× du navigateur).
- Monter et descendre (gestes.js) : on marche jusqu'au marchepied ou derrière la portière, la pose debout se mélange à la pose au volant (anim.js, `transition`), la portière du van pivote sur sa charnière (`tm.porte`). Bancs d'essai : `CL.agir(); CL.finirGeste();`.
- Deux véhicules au domaine (main.js, `VEHICULES`) : tracteur et van. `tr` et `tm` désignent le véhicule courant (conduit, ou le dernier conduit) ; la mission retient celui qu'on a chargé au chai (`mission.charge`) et ne livre qu'avec lui.
- Radio des véhicules : bandeau qui se touche, touche R, bouton LB de la manette, Réglages du téléphone ; choix gardé dans le navigateur.
- Servir un verre (main.js) : à pied près d'un passant ou d'un figurant assis, étiquette « Servir un verre » ; bouteille et verre sont des accessoires créés à la demande (perso.js, `accessoires`). Une fois par personne et par minute. Le personnage ne boit jamais.
- Ombres : un soleil bas qui suit le joueur (cadre de 84 m, calé sur la grille de texels). Brouillard couleur horizon.
- Entrées : manche flottant au doigt ou à la souris (`Controles`), clavier en plus. En tracteur au doigt, on montre la direction voulue, le tracteur tourne vers elle.
- Résolution adaptative : le vrai coût d'une image est mesuré toutes les 2 s (au-delà de 20 ms le ratio baisse, puis le palier).
- Personnage (perso.js, anim.js, atlas.js) : un SkinnedMesh de 18 os (deux influences au plus par sommet, près des jointures), animation procédurale ; une seule texture partagée qui module la couleur des sommets (un visage sert à tous les teints, un tissu à toutes les couleurs).
- Décor de détail (monde.js) : jardinières, poteaux et fils, réverbères, poubelles, panneaux routiers dessinés en code, herbes hautes en instances, balles de foin, voitures garées (`lieux.garees`).
- Banc de test : `window.CL` (`jouer()`, `step(n)`, `teleporter(x, z, h)`, `agir()`, `bench(n)`, `profil(n)`, `memoire()`, `photo(...)` pour poser la caméra).

## Légèreté (à préserver)

- Démarrage : l'accueil s'affiche avant que le jeu ne se construise (build.mjs lance le script après la première image) ; le bouton Jouer s'allume quand tout est prêt. La feuille Google Fonts est préchargée sans bloquer (`#polices`).
- Formes de base (`B`, `C`, `S`, `icosa` dans modeles.js) copiées depuis des gabarits calculés une fois ; `deplacer` et `tournerY` au lieu de `translate` et `rotateY` de three.js (qui passent par des matrices et recalculent les normales).
- Géométries indexées (`indexer`, modeles.js) : décor fusionné, personnages, véhicules, voitures. Les doublons d'une géométrie dépliée sont fusionnés (hachage des bits, sans arrondi) ; pour les matières à facettes, les normales (qui ne servent qu'au décalage des ombres) sont ignorées puis recalculées en moyennes. 479 000 → 190 000 sommets.
- Passe d'ombre allégée : dans chaque quartier du décor, les petits détails (cadres, volets, vitres, appuis, portes plaquées, pots) sont rangés en dernier et la passe d'ombre s'arrête avant eux (`onBeforeShadow` règle le `drawRange`). Personnages à plus de 32 m : pas dans la carte d'ombre (leur tache de contact suffit). Pas de MSAA sur un écran haute densité.
- Essai écarté (23/11/2026) : garder le décor fixe de la carte d'ombre en cache et n'y redessiner que ce qui bouge. Sur un GPU à tuiles (téléphones, Mac), ne pas effacer la carte force à recharger toute l'image précédente : plus lent que de tout redessiner.
- Géométries finies compactées (`compacter`) : normale sur 3 octets, couleur sur 3 ou 4, type de matière et vent sur 1. À appeler sur toute nouvelle géométrie ajoutée après la construction (main.js le fait pour la scène au démarrage, perso.js pour chaque personnage).
- Décor immobile : matrices calculées une fois (`matrixAutoUpdate = false`). Terrain découpé en 21 morceaux (élagués hors champ), vignes lointaines sans piquet ni dessous, cheveux et barbe sans les facettes cachées sous la peau, atlas des enseignes coupé à sa partie remplie.
- Atlas des personnages peint une fois au démarrage (environ 24 ms sur ordinateur), copie libérée une fois envoyée à la carte graphique (2,7 Mo avec mipmaps).
- Cadence : 60 images/s au plus (écrans 90 ou 120 Hz), 30 sur l'accueil et derrière le téléphone, 15 derrière le portable et la carte de fin.
- Ombres : 4 lectures par pixel (PCF maison, modeles.js) sur téléphone à tous les paliers, 16 (douces) seulement sur ordinateur ; ainsi la sonde peut monter de « moyen » à « haut » sans recompiler les shaders. Filtrage anisotrope du bruit : 1, 2 ou 4 selon le palier.
