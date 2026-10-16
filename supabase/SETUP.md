# Activer la synchronisation avec Supabase

Supabase remplace Cloudflare pour la synchronisation. Les rendez-vous restent enregistrés sur chaque appareil afin de pouvoir continuer hors connexion. La connexion en ligne utilise ton adresse e-mail et un mot de passe.

## 1. Créer ton projet Supabase

1. Ouvre [supabase.com](https://supabase.com/) et crée un compte ou connecte-toi.
2. Clique sur **New project**.
3. Donne un nom, par exemple `calendrier-jules`, puis choisis un mot de passe pour la base de données et conserve-le dans un endroit sûr.
4. Choisis une région proche de toi, par exemple une région en Europe.
5. Clique sur **Create new project** et attends que la création soit terminée.

Le forfait gratuit suffit pour commencer, mais Supabase peut mettre en pause un projet gratuit qui n’a pas été utilisé pendant une semaine. Tu peux le réactiver depuis son tableau de bord. [Tarifs Supabase](https://supabase.com/pricing)

## 2. Créer la table des rendez-vous

1. Dans ton projet, ouvre **SQL Editor** dans le menu de gauche.
2. Clique sur **New query**.
3. Ouvre le fichier [schema.sql](https://github.com/valentinjules60-dot/calendrier-hors-ligne/blob/main/supabase/schema.sql) dans un autre onglet GitHub.
4. Copie tout son contenu, colle-le dans la nouvelle requête SQL, puis clique sur **Run**.
5. Tu dois voir un message indiquant que la requête a réussi.

Ce SQL crée une table et des règles qui font que chaque compte ne peut consulter et modifier que ses propres rendez-vous.

## 3. Régler l’adresse de retour des e-mails

1. Dans le menu du projet, ouvre **Authentication**, puis **URL Configuration**.
2. Dans **Site URL**, indique :
   `https://valentinjules60-dot.github.io/calendrier-hors-ligne/`
3. Dans **Redirect URLs**, ajoute la même adresse puis enregistre.

Cela permet au lien de confirmation d’e-mail de revenir vers le calendrier.

## 4. Récupérer les deux informations de connexion

1. Dans Supabase, ouvre **Connect** (ou **Project Settings → API Keys**).
2. Copie le **Project URL**.
3. Copie la **Publishable key**, qui commence habituellement par `sb_publishable_`.
4. Ne copie pas la clé **Secret** ou `service_role` : elle ne doit jamais être mise dans le site public.

La clé publishable est conçue pour être utilisée dans un navigateur lorsque la table est protégée par les règles d’accès SQL. [Clés API Supabase](https://supabase.com/docs/guides/getting-started/api-keys)

## 5. Relier le site à Supabase

1. Ouvre [sync-config.js](https://github.com/valentinjules60-dot/calendrier-hors-ligne/blob/main/sync-config.js) dans GitHub, puis clique sur le crayon **Edit this file**.
2. Remplace les deux valeurs vides par celles de Supabase. Exemple :
   ```js
   window.CALENDAR_SYNC_CONFIG = {
     url: "https://abcdefgh.supabase.co",
     publishableKey: "sb_publishable_ta_cle_ici"
   };
   ```
3. Clique sur **Commit changes**.
4. Dans GitHub, ouvre l’onglet **Actions** du dépôt et attends que le déploiement GitHub Pages soit terminé.
5. Recharge le calendrier sur ton PC.

## 6. Créer le compte et connecter la tablette

1. Sur le PC, ouvre le calendrier et clique sur **Créer un compte**.
2. Remplis ton prénom, ton nom, ton adresse e-mail et un mot de passe d’au moins 8 caractères.
3. Ouvre le message de confirmation reçu par e-mail et clique sur son lien. Si le compte n’apparaît pas ensuite automatiquement, retourne au calendrier et connecte-toi.
4. Sur la tablette, ouvre la même adresse du calendrier, puis choisis **Se connecter** avec la même adresse e-mail et le même mot de passe.
5. Les rendez-vous existants sur chaque appareil seront envoyés au compte pendant la première synchronisation.

Les appareils synchronisent les rendez-vous dès qu’ils ont Internet. Hors connexion, le calendrier garde les données sur l’appareil et envoie les changements dès que la connexion revient.
