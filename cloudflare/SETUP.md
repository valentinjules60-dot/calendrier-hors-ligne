# Activer la synchronisation Cloudflare

Cette configuration ajoute une base en ligne partagée entre le PC et la tablette. Les rendez-vous restent aussi enregistrés sur chaque appareil pour pouvoir continuer hors connexion.

## 1. Créer la base de données

1. Ouvre [Cloudflare Dashboard](https://dash.cloudflare.com/) et connecte-toi.
2. Dans le menu, ouvre **Workers & Pages**, puis **D1 SQL Database**.
3. Clique sur **Create database** et donne-lui le nom `calendrier-sync`.
4. Ouvre la base créée et va dans **Console**.
5. Ouvre le fichier [schema.sql](https://github.com/valentinjules60-dot/calendrier-hors-ligne/blob/main/cloudflare/schema.sql), copie tout son contenu, colle-le dans la Console D1 et exécute-le. Cela crée les tables qui enregistrent les comptes, les sessions et les rendez-vous.

## 2. Créer le service de synchronisation

1. Dans **Workers & Pages**, clique sur **Create application** puis **Create Worker**.
2. Donne-lui le nom `calendrier-sync-api`, puis clique sur **Deploy** pour le créer.
3. Ouvre le Worker et choisis **Edit code**.
4. Remplace le code d’exemple par tout le contenu du fichier [worker.js](https://github.com/valentinjules60-dot/calendrier-hors-ligne/blob/main/cloudflare/worker.js), puis clique sur **Deploy**.
5. Dans le Worker, ouvre **Settings** puis **Bindings** (le libellé peut apparaître directement comme **Bindings**).
6. Clique sur **Add binding**, choisis **D1 database**, puis renseigne :
   - **Variable name** : `DB`
   - **D1 database** : `calendrier-sync`
7. Enregistre le binding, puis redéploie le Worker si Cloudflare le demande.

## 3. Relier le calendrier au Worker

1. Dans la page du Worker, copie son adresse publique qui se termine par `.workers.dev`. Elle ressemble à `https://calendrier-sync-api.<un-identifiant>.workers.dev`.
2. Ouvre le fichier [sync-config.js](https://github.com/valentinjules60-dot/calendrier-hors-ligne/blob/main/sync-config.js) dans le dépôt GitHub, puis clique sur le crayon **Edit this file**.
3. Remplace la ligne vide :
   ```js
   window.CALENDAR_SYNC_API = "";
   ```
   par l’adresse du Worker, sans ajouter `/api` à la fin. Exemple :
   ```js
   window.CALENDAR_SYNC_API = "https://calendrier-sync-api.mon-identifiant.workers.dev";
   ```
4. En bas de la page GitHub, clique sur **Commit changes**.
5. Attends que le déploiement **github-pages** soit vert dans l’onglet **Actions**, puis recharge le calendrier sur le PC.

## 4. Connecter la tablette

Sur le PC, ouvre le calendrier et crée un compte Cloudflare avec le même prénom et nom que ton compte local actuel. Utilise un mot de passe d’au moins 8 caractères. Les rendez-vous déjà présents sur cet appareil seront envoyés au compte en ligne lors de la première synchronisation.

Ensuite, sur la tablette, ouvre la même adresse du calendrier et connecte-toi avec ce prénom, ce nom et ce mot de passe. Les rendez-vous se synchroniseront automatiquement lorsque les deux appareils sont connectés à Internet. Si un appareil est hors ligne, ses modifications attendront le retour d’Internet.

**Important :** le prénom et le nom doivent être les mêmes sur les deux appareils. Le compte cloud est créé une seule fois, sur le premier appareil. Sur l’autre appareil, utilise **Se connecter**, pas **Créer un compte**.
