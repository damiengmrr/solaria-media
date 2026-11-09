# Solaria Media — The Solar Cinematic Experience

Le site Solaria Media V5, à l'identique, mis en mouvement.
**Le design est verrouillé, seul le mouvement a été ajouté** : textes, images, couleurs, polices,
tailles, espacements et ordre des sections sont ceux de la maquette fournie. Une fois les
animations terminées (ou désactivées), chaque page est identique à l'original, au pixel
près (voir `MOTION_CHANGELOG.md`, section « Fidélité »).

## Mettre en ligne sur Netlify

Aucune compilation, aucune dépendance.

- **Glisser-déposer** : sur app.netlify.com → *Add new site* → *Deploy manually*, déposer le
  dossier (ou le contenu du ZIP) tel quel. `index.html` doit être à la racine.
- **Depuis un dépôt Git** : pousser ce dossier ; `netlify.toml` indique déjà `publish = "."`
  et aucune commande de build.

Les adresses `/agence.html` et `/agence` (URL « propres » de Netlify) ouvrent toutes deux la
bonne page, de même que les liens `#/agence`, `#/expertises/branding`, etc.

## Tester en local

Servir le dossier en HTTP (pas en `file://`) :

```bash
npx serve .
```

ou `python3 -m http.server 8080`, puis ouvrir `http://localhost:8080`.

**Revoir la cinématique** : elle ne se joue qu'une fois par session, à l'arrivée sur
l'accueil. Ouvrir une fenêtre de navigation privée, ou exécuter
`sessionStorage.removeItem('sm-intro')` dans la console puis recharger.

## Ce que voit le visiteur

| Situation | Comportement |
|---|---|
| 1re visite de l'accueil | Cinématique « The Solar Reveal » : ≈ 7 s sur ordinateur, ≈ 4 s sur mobile, toujours passable |
| Visites suivantes, autres pages, liens directs | Entrée courte et chorégraphie de la page |
| Navigation entre les pages | « Passage solaire » : rideau aux couleurs du CTA, ouvert depuis le point cliqué (≈ 1,3 s) |
| Défilement | Chaque section a sa propre chorégraphie, jouée une fois à son entrée dans l'écran |
| Réglage « réduire les animations » | Aucune animation : le site original, immédiatement |
| JavaScript désactivé ou en échec | Le site original (des sécurités retirent tout rideau au bout de 2,5 s) |
| Économie de données ou réseau 2G | Pas de cinématique, entrée courte |
| Connexion lente | La cinématique attend ses images (attente bornée) et s'efface si elles tardent ; scripts trop lents : site affiché tel quel |

Passer la cinématique : bouton « Passer l'introduction », touche Échap, molette, geste de
défilement, clic n'importe où.

## Organisation des fichiers

```
index.html, agence.html, expertises.html,     même maquette sur chaque entrée ; un court script
realisations.html, contact.html               de <head> choisit la mise en scène avant le 1er rendu
assets/css/site.css            CSS original — inchangé
assets/css/motion.css          couche de mouvement (états temporaires uniquement)
assets/js/site-original.js     JS original — inchangé
assets/js/motion.js            moteur de mouvement, chorégraphies des 5 pages, micro-interactions
assets/js/navigation.js        navigation entre vues (comportement d'origine) + passages + corrections
assets/js/cinematic-intro.js   cinématique, chargée uniquement quand elle est jouée
assets/images/                 visuels officiels — octets inchangés
assets/planches-originales/    planches fournies — inchangées
MAQUETTE_V5_ORIGINALE_INCHANGEE.html   référence d'origine — inchangée
netlify.toml                   configuration Netlify
```

## Comment fonctionne le mouvement

- **Web Animations API**, sans bibliothèque. Chaque animation part d'un état temporaire et
  revient vers le rendu CSS d'origine ; à la fin elle est retirée : aucun style en ligne,
  aucune classe, aucun élément ajouté ne subsiste.
- **États de départ « en pause »** : avant qu'une section n'entre dans l'écran, son état de
  départ est posé par une animation en pause (jamais par une modification du CSS). Un
  `IntersectionObserver` lance la chorégraphie, une seule fois par visite de la page.
- **Découpage du texte** : les titres se lèvent mot à mot, ligne par ligne, derrière un
  masque. Le découpage n'est appliqué que si la mise en page reste strictement identique,
  et le texte d'origine est restauré à la fin.
- **Une scène par page** : changer de page annule et nettoie tout ce que la précédente avait
  lancé (animations, observateurs, minuteries, calques temporaires).
- **Cinématique** : un seul minuteur pilote toute la séquence. La lumière de l'acte I est un
  petit shader WebGL (repli CSS sans WebGL et sur mobile), libéré dès que l'aube couvre
  l'écran. Le logo, les visuels et la composition sont peints dans des canvas, et chaque
  élément rejoint exactement la place de son modèle dans la page.

### Modifier une chorégraphie

Dans `assets/js/motion.js`, la table `BEATS` associe, pour chaque page, un sélecteur à une
chorégraphie, écrite une seule fois avec des primitives :

| Primitive | Effet |
|---|---|
| `c.lines(el)` | titre ou paragraphe levé ligne par ligne (puis reflet sur les italiques) |
| `c.sweep(el, {dir})` | révélation par une bande de lumière (masque doux) |
| `c.clip(el, {from, to})` | cadrage qui s'ouvre (`clip-path`) |
| `c.frames(el, from, {pseudo})` | mouvement libre, y compris sur `::before`/`::after` |
| `c.line(el, {side})` | tracé d'un filet existant (bordure) |
| `c.zoom(img, from)` | mise au point photographique (écrans larges, image déjà décodée) |
| `c.sheen(el)`, `c.bars(img)`, `c.call(fn)` | reflet, révélation en bandes, effet libre |

Toutes acceptent `delay` et `dur` (ms) ; l'état final est toujours celui du CSS d'origine.

## Compatibilité

Testé sur Chromium (Chrome 153). Les fonctions utilisées sont disponibles dans les versions
actuelles de Chrome, Edge, Safari et Firefox, avec des replis : sans Web Animations API ou
`IntersectionObserver`, le site original s'affiche ; sans WebGL, la lumière passe en CSS ;
sans `linear()`, les ressorts deviennent des courbes de Bézier. Safari et Firefox n'ont pas
été testés dans cette livraison (voir les limites dans `MOTION_CHANGELOG.md`).
