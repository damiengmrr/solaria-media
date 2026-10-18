SOLARIA MEDIA — V5 + ANIMATIONS UNIQUEMENT
==========================================
BASE : SOLARIA_MEDIA_Maquette_Interactive_V5(4).html fournie par le client.
AUCUNE MODIFICATION : texte, titres, couleurs, formes, sections, ordre, tailles,
images, mise en page ni compositions. Les visuels intégrés ont été exportés
sans conversion ni recompression dans assets/images (octets inchangés).

AJOUT UNIQUEMENT :
 - Apparitions progressives légères au défilement.
 - Fondus discrets lors de la navigation entre les cinq vues/pages.
 - Micro-interaction pendant le clic sur certains boutons.
 - Respect du réglage système « réduire les animations ».

FICHIERS :
 index.html / agence.html / expertises.html / realisations.html / contact.html
    Même maquette originale sur chaque entrée; JS choisit la bonne vue
    suivant le chemin et gère les liens et le retour arrière.
 assets/css/site.css            CSS original inchangé
 assets/css/animations.css      Couche d'animation ajoutée
 assets/js/site-original.js     JS original inchangé
 assets/js/navigation.js        JS initial de navigation + transitions
 assets/js/animations.js        Animations au défilement
 assets/images/                 Les IMAGES ORIGINALES affichées sur le site,
                                extraites en bytes identiques du HTML fourni
 assets/planches-originales/    Les deux planches JPG fournies, non placées
                                en doublon sur le site (visuels identiques)
 MAQUETTE_V5_ORIGINALE_INCHANGEE.html  Sauvegarde exacte du fichier source

INSTALLATION : décompresser puis déposer les fichiers à la racine Netlify.
ATTENTION : Le formulaire de la maquette V5 conserve son comportement initial
(démonstration sans véritable envoi). Aucun changement fonctionnel non demandé.

DIAPORAMAS RÉALISATIONS (PRÉPARÉS, NON ACTIVÉS) :
 assets/js/realisations-gallery.js contient un objet galleries vide.
 Après réception et validation des images, ajouter une entrée par carte :
 clé = chemin data-image de la carte ; valeur = tableau de {src, alt}.
 Au moins deux images sont nécessaires. Exemple de structure uniquement :
 galleries = { 'chemin-de-la-carte': [
   {src: 'chemin-image-1', alt: 'Description de la première image'},
   {src: 'chemin-image-2', alt: 'Description de la deuxième image'}
 ] }.
 Les chemins de cet exemple ne sont pas des fichiers existants.
 Une galerie renseignée propose swipe, flèches, clavier et lecture à 5 secondes.
 Pause disponible ; pas de démarrage automatique si animations réduites.
 Sans configuration, l’agrandissement existant reste inchangé.
