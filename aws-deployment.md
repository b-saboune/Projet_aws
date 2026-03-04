# Déploiement du Projet Calculatrice Avancée

Ce document explique comment nous avons préparé le code pour GitHub Flow, et comment le déployer sur AWS avec un nom de domaine sécurisé (HTTPS).

## 1. Flux Git (GitHub Flow) recommandé
Nous avons initialisé le dépôt Git dans le répertoire `calculator/` et nous avons fait les commits intiaux sur la branche `main`.
Le **GitHub Flow** est une méthode de travail simple, basée sur des branches :

1. **Créer une branche** : À chaque nouvelle fonctionnalité ou correction de bug, créez une branche à partir de `main` : `git checkout -b feature/nom-de-la-feature`
2. **Ajouter des commits** : Développez sur cette branche et faîtes vos commits : `git commit -m "feat: ajout du graphe"`
3. **Ouvrir une Pull Request (PR)** : Poussez votre branche sur GitHub et ouvrez une PR vers `main`.
4. **Discuter et corriger le code** : Vos pairs (ou des outils de CI/CD automatisés) valident la PR.
5. **Fusionner (Merge)** : Une fois la PR validée, vous fusionnez la branche dans `main`.
6. **Déployer** : La branche `main` est toujours considérée comme **prête à être déployée en production**.

## 2. Déploiement Web sur AWS avec HTTPS

Puisque que cette application est un projet purement **Front-End (HTML, CSS, JS statiques)**, la solution AWS idéale (coût, performance, simplicité) est d'utiliser **AWS S3 + CloudFront + Route53 + Certificate Manager**.

### Architecture cible :
`Utilisateur` ➜ `[HTTPS] Route 53 (DNS)` ➜ `CloudFront (CDN, cache)` ➜ `S3 Bucket (Fichiers web)`

### Étapes détaillées :

#### Étape A : Hébergement des fichiers avec S3
1. Connectez-vous à la [console AWS](https://console.aws.amazon.com/s3).
2. Créez un **Bucket S3** (nommez-le avec le nom de domaine souhaité, ex: `calculatrice.mondomaine.com`).
3. Dans l'onglet *Propriétés* du Bucket, activez l'**Hébergement de site web statique** (indiquez `index.html` comme document d'index).
4. Dans l'onglet *Autorisations*, décochez *Bloquer tout l'accès public*, puis ajoutez une politique de Bucket pour autoriser la lecture publique (si vous n'utilisez pas CloudFront avec restriction OAI) :
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::calculatrice.mondomaine.com/*"
        }
    ]
}
```
5. Téléversez les fichiers du dossier `calculator/` (incluant `index.html`, `/css`, `/js`) dans le Bucket S3.

#### Étape B : Sécurisation (HTTPS) avec AWS Certificate Manager (ACM)
1. Allez dans le service **AWS Certificate Manager**.
2. **Très important** : Vérifiez que vous êtes dans la région **us-east-1 (N. Virginie)**. CloudFront n'accepte que les certificats générés dans cette région.
3. Demandez un certificat public pour votre nom de domaine (ex: `calculatrice.mondomaine.com`).
4. Validez le domaine en utilisant Route 53 (ACM vous proposera d'ajouter l'enregistrement CNAME automatiquement si le domaine est géré sur AWS).

#### Étape C : Distribution Rapide avec CloudFront
1. Allez dans le service **CloudFront** et créez une distribution.
2. **Origine** : Sélectionnez l'URL de votre site web statique S3 (pas l'ARN, l'URL du site web fournie par S3).
3. **Viewer Protocol Policy** : Choisissez **Redirect HTTP to HTTPS** (pour forcer le SSL).
4. **Custom SSL Certificate** : Sélectionnez le certificat créé lors de l'Étape B.
5. Créez la distribution (cela peut prendre environ 10 à 20 min).

#### Étape D : Connexion du Domaine avec Route 53
1. Allez dans **Route 53**.
2. Accédez à la zone hébergée de votre nom de domaine.
3. Créez un nouvel enregistrement :
   * Nom d'enregistrement : `calculatrice` (le sous-domaine complet sera `calculatrice.mondomaine.com`)
   * Type : **A - Acheminer le trafic vers une adresse IPv4**
   * Activer l'alias (Alias target)
   * Sélectionnez "Alias vers une distribution CloudFront" et choisissez la distribution CloudFront créée à l'Étape C.
4. Enregistrez.

🎉 Après propagation des DNS, votre calculatrice ultra-moderne sera accessible via: **`https://calculatrice.mondomaine.com`**

---
*PS : Si vous liez ce dépôt GitHub à un outil CI/CD comme **GitHub Actions**, vous pourrez automatiquement uploader vos nouveaux commits directement dans le Bucket S3 sans action manuelle.*
