# MOTION_CHANGELOG — Solaria Media V6 « The Solar Cinematic Experience »

Base : `SOLARIA_MEDIA_V5_ANIMATIONS_FIDELE_NETLIFY.zip` (maquette V5 + couche d'animation légère).
Principe : *Don't redesign the website. Direct the experience.* Aucun texte, visuel, couleur,
police, taille, espacement, forme, section ni comportement métier n'a été modifié.

---

## 1. Fichiers

### Ajoutés
| Fichier | Rôle | Poids (brut / gzip) |
|---|---|---|
| `assets/js/motion.js` | Moteur de mouvement, chorégraphies des 5 pages, transitions, micro-interactions | 55,9 Ko / 17,7 Ko |
| `assets/js/cinematic-intro.js` | Cinématique « The Solar Reveal » (chargée uniquement quand elle est jouée) | 21,9 Ko / 8,9 Ko |
| `assets/css/motion.css` | États temporaires d'animation et d'interaction | 12,1 Ko / 3,9 Ko |
| `netlify.toml` | Publication du dossier racine, en-têtes sans effet sur le rendu | — |
| `README.md`, `MOTION_CHANGELOG.md` | Documentation | — |

### Modifiés
| Fichier | Modification |
|---|---|
| `index.html`, `agence.html`, `expertises.html`, `realisations.html`, `contact.html` (5 copies identiques) | Dans `<head>` : `animations.css` → `motion.css` et un court script qui choisit la mise en scène avant le premier rendu (cinématique / entrée courte / rien), avec délai de sécurité. En fin de `<body>` : `animations.js` remplacé par `motion.js`. **Aucune balise du contenu n'a été touchée.** |
| `assets/js/navigation.js` | Réécrit : même routage (vues `[data-view]`, URL `#/vue`, titres, menu mobile, `?projet=`), passages animés, corrections listées en §6. |

### Supprimés
| Fichier | Raison |
|---|---|
| `assets/css/animations.css`, `assets/js/animations.js` | Ancienne couche d'animation (fondu + translation à l'apparition), remplacée par le nouveau système. |
| `README.txt` | Remplacé par `README.md`. |

### Inchangés (empreintes MD5 vérifiées, octet pour octet)
`MAQUETTE_V5_ORIGINALE_INCHANGEE.html`, `assets/css/site.css`, `assets/js/site-original.js`,
les 10 images de `assets/images/`, les 2 planches de `assets/planches-originales/`.

Le révélateur d'origine de `site-original.js` (classe `js-anim`) reste dans le fichier ; le
nouveau système le neutralise en retirant cette classe au démarrage, pour éviter les doubles
animations.

---

## 2. Concept : « le point devient soleil »

Le protagoniste est le **point final de « solaria. »**. Un point de lumière se lève, inonde le
cadre, devient le point du logo, puis la lumière révèle la marque, ses supports et enfin le
site. Le même langage revient partout :

- **la lumière révèle** : bandes de lumière à bord doux (masques) plutôt que fondus ;
- **les titres se lèvent** ligne par ligne derrière un masque, et les mots en italique
  Georgia (« rayonner », « vos idées »…) sont traversés d'un reflet doré ;
- **l'astérisque ✳** sert de signature : rideau de transition, CTA, contact ;
- **courbes** : sortie rapide et pose longue (expo out) pour les révélations, courbes
  symétriques pour les rideaux, ressorts pour les éléments manipulables.

Palette du mouvement : exclusivement celle du site (#211C1A, #ED452E, #FC9D29, #FFDF29,
#FFF9F2 et le dégradé du CTA). Aucune nouvelle couleur permanente.

---

## 3. Cinématique d'ouverture — The Solar Reveal

Jouée à la première arrivée sur l'accueil de la session. Durée mesurée : **7,0 s** sur
ordinateur, **≈ 4,0 s** sur mobile (version resserrée, 3 visuels, lumière en CSS).

| Acte | Ordinateur | Ce qui se passe |
|---|---|---|
| I — First light | 0 – 2,0 s | Pénombre chaude, format cinéma (bandes), grain. Un point de lumière apparaît, une traînée anamorphique s'étire, le soleil se lève ; rayons volumétriques et aube corail (shader WebGL). |
| II — Brand reveal | 1,9 – 4,6 s | La lumière inonde le cadre en un disque de crème au bord doré. Le soleil se réduit exactement au point final du logo (raccord « match cut »). « solaria. » est révélé depuis ce point vers la gauche, « media » s'écrit de gauche à droite, mise au point et bascule 3D ; une bande de lumière traverse les lettres ; 12 rayons (ceux du favicon) éclosent autour du point. La caméra recadre. |
| III — Creative universe | 4,3 – 5,8 s | Les visuels officiels de l'agence rayonnent autour du logo en 3D et sont traversés de lumière l'un après l'autre ; les intitulés des quatre expertises (textes existants) s'allument en générique. |
| IV — Arrival | 5,75 – 6,9 s | Les visuels se replient dans la composition, le logo rejoint **exactement** sa place dans le header, la composition rejoint **exactement** l'image du hero, le cadre du hero s'ouvre autour d'elle, le soleil du décor se lève, le titre se lève ligne par ligne et « rayonner » s'illumine. La dernière image est la page. |

Contraintes respectées :
- **Passer** : bouton « Passer l'introduction » (premier élément au clavier), Échap, molette,
  défilement tactile, clic. Fondu de 0,4 s puis le hero se pose. Mesuré : 0,46 – 0,56 s.
- **Une fois par session** (`sessionStorage`), uniquement si la page d'arrivée est l'accueil.
  Autres pages et visites suivantes : entrée courte.
- **Mouvement réduit** : jamais jouée. **Économie de données / 2G** : jamais jouée.
- **Pas de son, pas d'attente artificielle** : le contenu est dans le HTML et peint dès le
  premier rendu sous le rideau (SEO, lecteurs d'écran, LCP). Images attendues avec délai
  borné ; si le logo n'arrive pas, la scène s'efface.
- **Aucun écran vide** : rideau retiré par le script au bout de 2,5 s si quoi que ce soit
  échoue, et par une animation CSS au bout de 9 s même sans JavaScript.
- **Nettoyage** : contexte WebGL libéré dès que l'aube couvre l'écran, bitmaps fermés,
  écouteurs retirés, scène supprimée du DOM.
- La cinématique n'utilise que les assets officiels ; le logo n'est jamais redessiné.

---

## 4. Transitions entre les pages — « le passage solaire »

Au clic, le **header reste en place** (il sert de « caméra fixe ») et l'indicateur actif glisse
vers le nouveau lien. Sous le header, un rideau au **dégradé du CTA** s'ouvre en cercle depuis
le point cliqué (rayonnement), l'astérisque ✳ tourne au centre, la page quittée recule
légèrement. Sous le rideau, la vue change et se positionne (haut de page, ancre ou position
mémorisée) ; le rideau se retire vers le haut par un bord courbe, comme un horizon, pendant
que la nouvelle page joue son entrée.

Mesuré : changement de vue à ≈ 0,57 s, rideau entièrement levé à ≈ 1,33 s.
L'URL et l'historique sont mis à jour dès le clic. Clics rapides successifs : la dernière
destination l'emporte, sans double transition ni rideau bloqué. Retour / avance : même
passage, position de défilement restituée. Même page : défilement doux, sans rideau.
Mouvement réduit : changement instantané (comportement d'origine).

---

## 5. Chorégraphies des cinq pages

| Page | Section | Mouvement |
|---|---|---|
| Accueil | Hero (hors cinématique) | Cadre qui s'ouvre, mise au point de la composition, soleil du décor qui se lève, titre ligne par ligne + reflet, boutons dévoilés, ✳ qui s'allume |
| | Bandeau | Filet tracé de gauche à droite, phrases levées, flèche ronde en ressort |
| | Expertises (4 cartes) | Cartes levées en cascade, bande de lumière sur chaque visuel, titres levés, flèches en ressort ; au survol : perspective et lumière qui suivent le pointeur |
| | L'esprit Solaria | Image révélée par un faisceau (projecteur) + reflet ; filets tracés et ✓ qui éclosent un à un |
| | Campagnes | Cadrage « letterbox » qui s'ouvre avec zoom arrière, reflet publicitaire |
| | CTA final | Astérisque qui tourne et se pose, bande de lumière sur le dégradé, titre levé ; au survol l'astérisque suit le pointeur |
| L'agence | Hero | Titre levé, visuel révélé de gauche à droite avec mise au point |
| | Mission | Filet tracé, titre levé, paragraphes révélés par la lumière |
| | Processus | **Fil conducteur** : un fil doré parcourt les quatre étapes l'une après l'autre ; chaque pictogramme a son mouvement (◎ mise au point, ✳ rotation, ↗ envol, ◉ pulsation) |
| | Publics | Étiquettes posées une à une (ressort) |
| Expertises | Intro | Titre levé, liens rapides posés en cascade |
| | Digital | Visuel « publié » (ressort) puis ondes de diffusion |
| | Branding | Lignes de construction tracées, visuel qui s'assemble depuis le centre |
| | Objets & PLV | Visuel qui pivote en 3D comme un produit présenté, reflet spéculaire |
| | Campagnes | Visuel révélé en 4 bandes qui montent en rythme, puces synchronisées |
| | Textes | Intitulé balayé, titre levé, puces qui éclosent une à une |
| Réalisations | Intro | Titre levé, note légale tracée (filet orange) |
| | Filtres | Pastille active « liquide » qui coule d'un bouton à l'autre ; cartes réorganisées en FLIP, sorties et entrées animées |
| | Grille | Révélations photographiques (horizontales pour les grandes cartes, verticales pour les autres) avec mise au point |
| | Visionneuse | S'ouvre depuis la carte cliquée, se referme vers elle ; fond qui s'assombrit / s'éclaircit |
| Contact | Intro | Titre levé, ✳ qui tourne et se pose à 15°, informations révélées |
| | Formulaire | Panneau qui s'avance, champs posés en cascade |
| Toutes | Pied de page | Colonnes levées à la première apparition |

---

## 6. Corrections fonctionnelles (bugs du `navigation.js` d'origine)

Signalées séparément : il ne s'agit pas de motion design, mais le cahier des charges exige des
ancres, de l'historique et des liens profonds opérationnels, et la navigation devait être
reprise pour les transitions. Les anomalies ont été **reproduites sur la version d'origine**
avant correction.

1. **Ancres internes renvoyant vers l'accueil** : `#digital`, `#branding`, `#production`,
   `#campagnes`, `#notre-approche` et le lien d'évitement `#contenu` déclenchaient
   `popstate`, interprété comme une route inconnue → affichage de l'accueil.
2. **« Haut de page ↑ » renvoyait vers l'accueil** ; et l'ancre visant le header collant ne
   faisait rien nativement : elle remonte désormais en haut de la page en cours.
3. **Retour arrière** depuis une page ouverte par son chemin (`/agence.html` → Contact →
   retour) affichait l'accueil au lieu de L'agence.
4. **URL propres Netlify** (`/agence`) affichaient l'accueil.
5. **Lien profond `expertises.html#branding`** s'ouvrait en haut de page : il défile
   maintenant jusqu'à la section, et se réaligne une fois chargées les images (sans
   dimensions) situées au-dessus.
6. **Ctrl / Cmd / Maj + clic** sur un lien interne était intercepté : l'ouverture dans un
   nouvel onglet fonctionne.

---

## 7. Micro-interactions

- **Boutons** : la flèche part dans sa direction et revient par le côté opposé au survol ;
  pression élastique au clic ; éclat de lumière au point de clic (boutons sombres) ;
  aimantation très légère (4 à 7 px, pointeur précis uniquement, relâchée au clic).
- **Navigation** : soulignement qui se dessine au survol, indicateur actif qui glisse entre
  les pages ; menu mobile qui se déplie (liens en cascade) et se replie proprement.
- **Cartes** : perspective et lumière solaire qui suivent le pointeur, visuel en parallaxe
  inverse ; retour exact au rendu d'origine à la sortie.
- **Soleil du hero** : sa rotation (animation d'origine) accélère avec la vitesse de
  défilement puis retrouve son rythme.
- **Formulaire** : transitions de bordure et de halo au focus, libellé qui se décale de 3 px,
  secousse du premier champ invalide, apparition du message de démonstration. Champs,
  libellés, règles de validation et absence d'envoi : **inchangés** (le message reste
  « Aucun message n'a été envoyé… »).
- Curseur système conservé ; aucune interaction n'empêche un clic précis.

---

## 8. Performance et décisions techniques

- Aucune bibliothèque (Web Animations API, IntersectionObserver, un shader WebGL de ~40
  lignes). Pas d'étape de compilation. Animations sur `transform`, `opacity`, `clip-path`,
  `mask-position`.
- Cinématique chargée **uniquement quand elle est jouée** (préchargement depuis `<head>`) ;
  micro-interactions initialisées en tâche de fond (`requestIdleCallback`).
- Visuels de l'acte III chargés **après** l'image du hero (LCP).
- Shader rendu à 70 % de la résolution, DPR plafonné à 1, contexte libéré après 2,9 s.
- Images de la cinématique décodées à part (`fetch` + `createImageBitmap`, servies par le
  cache HTTP) puis peintes dans des canvas : la scène ne touche pas au décodage des images
  de la page.
- Décisions prises **pour la fidélité au pixel**, après mesures répétées :
  - les 4 visuels des cartes d'expertise ne sont jamais transformés pendant leur
    apparition (la carte se lève, une bande de lumière passe en calque séparé) ;
  - les zooms photographiques ne jouent que sur écrans > 960 px et si l'image est déjà
    décodée ;
  - une fois une section posée, ses images sont repeintes une fois (contour nul, invisible),
    car Chrome peut garder un rendu filtré « allégé » pendant les animations voisines ;
  - les blocs de texte placés sous des images sans dimensions restent invisibles avant
    leur entrée (comme dans l'original), pour que le décalage provoqué par ces images ne
    compte pas dans le CLS.
- Une vue quittée est entièrement nettoyée : animations, observateurs, minuteries, calques.

---

## 9. Tests réellement effectués

Navigateur réel : Chromium 153 (Chrome for Testing), piloté par Playwright, avec captures
d'écran. Serveur local reproduisant Netlify (gzip, ETag, URL propres). Les 25 tests demandés :

| # | Test | Résultat |
|---|---|---|
| 1 | Chargement initial avec cinématique | ✅ 7,0 s, 0 erreur, aucun reste ; planches d'images vérifiées (ordinateur et mobile) |
| 2 | Passage immédiat | ✅ bouton 0,56 s, Échap 0,52 s, molette 0,49 s |
| 3 | Visite suivante | ✅ entrée courte, pas de cinématique |
| 4 | Sans WebGL (`--disable-webgl`) | ✅ lumière CSS, cinématique complète |
| 5 | Animations réduites | ✅ ni cinématique ni rideau, rien de masqué, changement de vue instantané |
| 6 – 9 | Accueil → Agence → Expertises → Réalisations → Contact | ✅ rideau, URL, titre, lien actif corrects ; aucun reste après défilement complet |
| 10 | Historique précédent / suivant | ✅ |
| 11 | Liens directs et rechargement | ✅ `/agence.html`, `/agence`, `#/contact`, `expertises.html#branding`, `/realisations`, `/` |
| 12 | Ancres des expertises | ✅ les 4 liens rapides (section à 95 px, scroll-padding d'origine), retour arrière, « Haut de page », `#notre-approche`, carte d'accueil → `#production` |
| 13 | Filtres | ✅ les 6 filtres, `aria-pressed`, aucun reste, aucune carte fantôme |
| 14 | Visionneuse | ✅ ouverture, légende, fermeture par Échap, bouton et fond ; focus rendu à la carte ; ouverture au clavier |
| 15 | Navigation clavier | ✅ lien d'évitement au 1er Tab ; un élément focalisé avant son apparition devient visible en < 150 ms |
| 16 | Menu mobile (390 px, tactile) | ✅ ouverture, fermeture, Échap, lien → page, aucun débordement horizontal |
| 17 | Formulaire de démonstration | ✅ envoi vide refusé, envoi valide → message d'origine, aucun envoi ; `?projet=branding` présélectionne ; saisie conservée entre les pages |
| 18 | Survols | ✅ inclinaison et lumière, retour exact (aucun style ni classe restant) |
| 19 | Défilement rapide | ✅ tout finit visible |
| 20 | Changements de page pendant une animation | ✅ 5 clics rapides → dernière destination, aucun reste |
| 21 | Réouverture d'une page visitée | ✅ chorégraphie rejouée, aucun reste |
| 22 | Mobile et ordinateur | ✅ 1440, 1024, 768, 390, 360 px (voir §10) |
| 23 | Connexions lentes | ✅ 3G lente (50 Ko/s, 400 ms) et 3G rapide : cinématique jouée ou effacée, page utilisable, aucun rideau bloqué |
| 24 | Erreurs JavaScript | ✅ 0 erreur et 0 avertissement console dans toutes les séries |
| 25 | Fuites mémoire | ✅ 451 → 451 nœuds DOM après 12 navigations, 0 animation en cours, WebGL libéré |

---

## 10. Résultats mesurés

### Fidélité (5 pages × 5 largeurs, toutes animations terminées)

Méthode : chaque page est ouverte, parcourue jusqu'en bas (toutes les chorégraphies jouées),
puis capturée en pleine page et comparée pixel par pixel à l'original capturé dans les mêmes
conditions (même navigateur, mêmes dimensions, animations d'origine figées à t = 0).

| Mesure | Résultat |
|---|---|
| DOM après animations | **identique à l'original sur 25 / 25** |
| Pixels, sans cinématique | **25 / 25 identiques** à ±1 niveau près sur au plus 2 pixels (19 / 25 octet pour octet) |
| Pixels, après la cinématique (puis navigation vers chaque page) | **25 / 25 identiques** à ±1 niveau près sur au plus 2 pixels (un seul passage a montré 11 520 px à ±3 niveaux sur l'accueil à 360 px ; trois relances : 1 px) |
| Comparaison anti-crénelage (pixelmatch) avec l'original statique | 0 différence sur 25 / 25 |
| Stabilité (accueil, 1440 px, 16 passages) | 16 / 16 octet pour octet |

Les seules différences brutes avec l'original *statique* (mouvement réduit) existent aussi
dans l'original lui-même entre son état statique et son état animé : la rotation continue
du ✳ du hero et ses propres transitions. L'original animé, capturé deux fois, varie lui-même
(jusqu'à 94 124 px sur Réalisations à 1024 px).

### Lighthouse 13.5 (mesures locales, mobile simulé et ordinateur)

| Page | Perf. mobile (V6 / V5) | Perf. ordinateur (V6 / V5) | Accessibilité | Bonnes pratiques | SEO | CLS |
|---|---|---|---|---|---|---|
| Accueil | 93 / 93 | 100 / 100 | 100 | 100 | 100 | 0 |
| L'agence | 95 / 96 | 100 / 100 | **95** (§11) | 100 | 100 | 0 |
| Expertises | 92 / 93 | 100 / 100 | 100 | 100 | 100 | 0 |
| Réalisations | 92 / 92 | 100 / 100 | 100 | 100 | 100 | 0 |
| Contact | 92 / 96 | 100 / 100 | 100 | 100 | 100 | 0 |

LCP mobile 2,9 – 3,4 s (original 2,9 – 3,3 s), LCP ordinateur 0,6 – 0,7 s, TBT 0 – 10 ms.
Variation observée d'un passage à l'autre : ± 3 points (le Contact d'origine a mesuré 93 puis 96).
L'**indice de vitesse** de l'accueil augmente avec la cinématique (mobile 2,4 s contre 0,9 s,
ordinateur 0,9 s contre 0,2 s) : c'est la contrepartie d'une introduction de plusieurs
secondes ; le score global reste égal à celui de l'original.

### Fluidité (Chromium sans affichage, 1440 px)

| Séquence | Images/s | Images > 33 ms | Long animation frames |
|---|---|---|---|
| Cinématique | 60,1 | 0 | 0 |
| Transition de page | 60,3 | 0 | 0 |
| Défilement | 60,2 | 0 | 0 |
| Idem avec processeur ralenti ×4 | 60,1 – 60,2 | 0 | 0 |

Mesure du fil principal ; le rendu GPU d'un appareil réel n'a pas pu être mesuré (§11).

---

## 11. Limites restantes et points signalés

**Hors périmètre du mouvement (présents dans l'original, non corrigés pour respecter la
règle de fidélité — décision à prendre par Solaria Media) :**
- **Contraste** : l'intitulé « Notre façon de travailler » (#BA3424 sur #24201E) a un
  contraste de 2,78:1 (4,5:1 requis), d'où l'accessibilité 95 sur L'agence. L'original obtient
  100 uniquement parce que son animation masque cet élément au chargement. Correction
  possible : couleur claire pour les intitulés sur fond sombre (ex. `#FFDF29`, ≈ 12:1),
  modification de `site.css` à valider.
- **Images sans dimensions** (`width` / `height` absents) sur les visuels des expertises :
  elles décalent la mise en page en se chargeant.
- **`agence-univers.webp` en priorité haute** dans une vue masquée : téléchargé sur chaque
  page à l'ouverture (55 Ko).
- **Logo PNG de 156 Ko** affiché à 164 px : un export plus léger améliorerait le chargement.
- **Cinq URL, un seul HTML** : titres, descriptions et balises Open Graph identiques, pas de
  `canonical` (contenu dupliqué pour les moteurs) ; le titre de page change en JavaScript.
- Les liens de navigation gardent un attribut `class=""` vide après être devenus inactifs
  (comportement de `classList.toggle` d'origine, conservé).

**Liés à cette livraison :**
- **Testé uniquement sur Chromium.** Safari (macOS / iOS) et Firefox n'ont pas été testés ;
  les replis sont en place mais un passage sur ces navigateurs reste à faire.
- **Fluidité sur GPU réel non mesurée** (mesures en environnement sans affichage).
- **Indice de vitesse** de l'accueil plus élevé (cinématique), voir §10.
- Mobile : scores de performance de 0 à 4 points sous l'original sur les pages internes
  (≈ 25 Ko gzip de JavaScript en plus), dans la marge de variation de Lighthouse.
- Pour garantir un rendu final identique, les visuels des cartes d'expertise ne sont pas
  zoomés pendant leur apparition, et les zooms photographiques sont réservés aux écrans
  larges (§8).
- Navigation privée bloquant `sessionStorage` : pas de cinématique (entrée courte).
