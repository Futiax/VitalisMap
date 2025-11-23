# Carte Temps Réel Vitalis Poitiers

Ce projet est déployé sur GitHub Pages et accessible à l'adresse suivante :
[https://futiax.github.io/VitalisMap/](https://futiax.github.io/VitalisMap/).

## Fonctionnalités

-   **Affichage des arrêts** : Les arrêts sont représentés par des cercles gris sur la carte.
-   **Affichage des lignes de bus** : Les tracés des lignes sont affichés avec leurs couleurs officielles.
-   **Suivi des bus en temps réel** : Les positions des bus sont mises à jour toutes les 10 secondes.
-   **Interactivité** :
    -   Survol des lignes pour les mettre en avant.
    -   Popups avec des informations détaillées sur les arrêts et les bus.
-   **Mise à jour dynamique** : Les marqueurs des arrêts sont affichés ou masqués en fonction du niveau de zoom.

## Prérequis

-   Un serveur local pour servir les fichiers (par exemple, [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) pour Visual Studio Code).
-   Une connexion Internet pour charger les données externes.
-   [Node.js](https://nodejs.org/) pour installer les dépendances si nécessaire.

## Installation

1. Clonez ce dépôt :
    ```bash
    git clone <url-du-repo>
    ```
2. Placez-vous dans le dossier du projet :
    ```bash
    cd vitalis
    ```
3. Installez les dépendances si nécessaire :
    ```bash
    npm install
    ```

## Utilisation

1. Lancez un serveur local dans le dossier du projet.
2. Ouvrez le fichier `index.html` dans votre navigateur.
3. Interagissez avec la carte pour explorer les fonctionnalités.

## Structure du projet

-   `index.html` : Fichier principal de l'application.
-   `style.css` : Styles pour l'application.
-   `script.js` : Logique principale de l'application.
-   `lignes.json` : Données des tracés des lignes de bus.
-   `arrets.json` : Données des arrêts de bus.
-   `gtfs-realtime.proto` : Définition du format Protobuf pour les données en temps réel.

## Dépendances

-   [Leaflet](https://leafletjs.com/) : Bibliothèque pour les cartes interactives.
-   [Protobuf.js](https://github.com/protobufjs/protobuf.js) : Pour décoder les données en temps réel.

## Déploiement

Pour mettre à jour le déploiement :

1. Assurez-vous que toutes vos modifications sont commitées :
    ```bash
    git add .
    git commit -m "Mise à jour du déploiement"
    ```
2. Poussez les modifications sur la branche principale (ou `main`) :
    ```bash
    git push origin main
    ```
3. GitHub Pages mettra automatiquement à jour le site avec les dernières modifications.

## Contribution

Les contributions sont les bienvenues ! Veuillez ouvrir une issue ou soumettre une pull request pour toute amélioration ou correction.

## Licence

Ce projet est sous licence MIT. Consultez le fichier `LICENSE` pour plus d'informations.
