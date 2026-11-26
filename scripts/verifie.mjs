// Vérification avant chaque push (npm run verifie) : chaque push sur main met le jeu en ligne.
//  1. construit le jeu (refuse tout tiret cadratin ou demi-cadratin) ;
//  2. joue la mission entière en tracteur et en van, la journée à la carte, les cas limites, les voitures et le mode WTF
//     (390 x 844), le clavier, la nuit et le matin (1280 x 800), la route du château et la glisse (900 x 600), la diversité
//     des personnages, le chien du domaine, les vélos et les cyclistes, l'école et ses enfants (1280 x 800), la mission 2,
//     la mission 3, la sauvegarde, la nuit et les professionnels fermés, les restaurateurs du coin (390 x 844), en même temps ;
//  3. regarde git : index.html doit aller avec src/ dans le même commit.
// Code 1 si le build ou un parcours échoue, ou si le dernier commit a un index.html en retard sur src/.
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Lance un script node du dossier scripts/ et garde sa sortie (affichée seulement en cas d'échec). Six à la fois au plus
// (PARALLELE) : dix-sept Chrome ensemble, le jeu mettait plus d'une minute à démarrer ; huit, des bancs (souple, la
// glisse du château) tombaient parfois sur un état un peu différent, le jeu tournant en temps réel entre deux appels.
const PARALLELE = Number(process.env.PARALLELE || 6);
let enCours = 0;
const attente = [];
const lancer = (args, env = {}) => new Promise(ok => {
  const go = () => {
    enCours++;
    const p = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env } });
    let sortie = '';
    p.stdout.on('data', d => { sortie += d; });
    p.stderr.on('data', d => { sortie += d; });
    p.on('close', code => { enCours--; if (attente.length) attente.shift()(); ok({ code, sortie }); });
  };
  if (enCours < PARALLELE) go(); else attente.push(go);
});
const echec = (titre, sortie) => { console.log(`ÉCHEC ${titre}\n\n${sortie.trim()}\n`); process.exit(1); };

const t0 = Date.now();
const b = await lancer(['scripts/build.mjs']);
if (b.code !== 0) echec('build', b.sortie);
console.log('OK   build : ' + (b.sortie.match(/index\.html .*/) || [''])[0]);

const parcours = await Promise.all([
  lancer(['scripts/essai.mjs', 'parcours', '390x844', 'parcours']).then(r => ({ ...r, nom: 'parcours en tracteur' })),
  lancer(['scripts/essai.mjs', 'parcours', '390x844', 'parcours-van'], { VEHICULE: 'van' }).then(r => ({ ...r, nom: 'parcours en van' })),
  lancer(['scripts/essai.mjs', 'souple', '390x844', 'souple']).then(r => ({ ...r, nom: 'journée à la carte' })),
  lancer(['scripts/essai.mjs', 'aides', '390x844', 'aides']).then(r => ({ ...r, nom: 'aides et cas limites' })),
  lancer(['scripts/essai.mjs', 'voitures', '390x844', 'voitures']).then(r => ({ ...r, nom: 'voitures et mode WTF' })),
  lancer(['scripts/essai.mjs', 'nuit', '1280x800', 'nuit']).then(r => ({ ...r, nom: 'clavier, nuit et matin' })),
  lancer(['scripts/essai.mjs', 'chateau', '900x600', 'chateau']).then(r => ({ ...r, nom: 'route du château et glisse' })),
  lancer(['scripts/essai.mjs', 'diversite', '1280x800', 'diversite']).then(r => ({ ...r, nom: 'diversité des personnages' })),
  lancer(['scripts/essai.mjs', 'traitement', '390x844', 'traitement']).then(r => ({ ...r, nom: 'mission 2, journée de traitement' })),
  lancer(['scripts/essai.mjs', 'habillage', '390x844', 'habillage']).then(r => ({ ...r, nom: 'mission 3, l\'habillage' })),
  lancer(['scripts/essai.mjs', 'sauvegarde', '390x844', 'sauvegarde']).then(r => ({ ...r, nom: 'sauvegarde, reprise et missions rejouées' })),
  lancer(['scripts/essai.mjs', 'fermeture', '390x844', 'fermeture']).then(r => ({ ...r, nom: 'la nuit, les professionnels fermés' })),
  lancer(['scripts/essai.mjs', 'restaurateurs', '390x844', 'restaurateurs']).then(r => ({ ...r, nom: 'les restaurateurs du coin' })),
  lancer(['scripts/essai.mjs', 'chien', '1280x800', 'chien']).then(r => ({ ...r, nom: 'le chien du domaine (balade, fuite, caresse, nuit)' })),
  lancer(['scripts/essai.mjs', 'velos', '1280x800', 'velos']).then(r => ({ ...r, nom: 'vélos et cyclistes' })),
  lancer(['scripts/essai.mjs', 'ecole', '1280x800', 'ecole']).then(r => ({ ...r, nom: 'l\'école et ses enfants' })),
]);
for (const r of parcours) {
  if (r.code !== 0 || !r.sortie.includes('Aucune erreur.')) echec(r.nom, r.sortie);
  console.log(`OK   ${r.nom} : ${(r.sortie.match(/^OK /gm) || []).length} étapes, aucune erreur`);
}

// Ce que git voit après le build : fichiers du jeu modifiés depuis le dernier commit.
const modifies = execFileSync('git', ['status', '--porcelain', '--', 'src', 'scripts', 'index.html', 'package.json', 'package-lock.json'], { cwd: root, encoding: 'utf8' })
  .split('\n').filter(Boolean).map(l => l.slice(3));
const duree = `(${Math.round((Date.now() - t0) / 1000)} s)`;
if (!modifies.length) {
  console.log(`\nPrêt à pousser : le dernier commit est vérifié ${duree}.`);
} else if (modifies.length === 1 && modifies[0] === 'index.html') {
  // src/ est commité mais pas l'index.html qui va avec : pousser mettrait en ligne une version en retard.
  console.log('\nÉCHEC index.html : le dernier commit contient src/ sans l\'index.html reconstruit. L\'ajouter au commit avant de pousser.');
  process.exit(1);
} else {
  console.log(`\nTout est vert ${duree}. Pas encore poussable : à commiter ensemble avant de pousser :\n  ${modifies.join('\n  ')}`);
}
