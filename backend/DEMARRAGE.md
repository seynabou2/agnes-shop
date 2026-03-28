# 🚀 Démarrer le backend d'Agnès Shop

## 1. Installer PostgreSQL

Télécharge et installe PostgreSQL : https://www.postgresql.org/download/

Pendant l'installation, note bien ton mot de passe pour l'utilisateur `postgres`.

## 2. Créer la base de données

Ouvre pgAdmin (ou le terminal psql) et exécute :
```sql
CREATE DATABASE boutique_agnes;
```

## 3. Configurer l'environnement

Dans le dossier `backend/`, copie le fichier `.env.example` en `.env` :
```bash
cp .env.example .env
```

Puis édite `.env` avec tes vraies valeurs :
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=boutique_agnes
DB_USER=postgres
DB_PASSWORD=ton_vrai_mot_de_passe

JWT_SECRET=une_longue_chaine_aleatoire_ici_ex_abc123xyz789
ADMIN_PASSWORD=le_mot_de_passe_pour_acceder_au_panneau_admin

PORT=5000
FRONTEND_URL=http://localhost:3000
```

## 4. Installer les dépendances

```bash
cd backend
npm install
```

## 5. Démarrer le serveur

```bash
# En mode développement (redémarre auto)
npm run dev

# En mode production
npm start
```

Tu devrais voir :
```
✅ Base de données initialisée.
🚀 Serveur démarré sur http://localhost:5000
```

## 6. Démarrer le frontend

Dans un autre terminal (à la racine du projet) :
```bash
npm install
npm start
```

L'application s'ouvre sur http://localhost:3000

---

## 📡 Routes disponibles

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| POST | /api/auth/login | Public | Connexion admin |
| POST | /api/auth/verify | Public | Vérifier le token |
| GET | /api/products | Public | Liste des produits |
| GET | /api/products/categories | Public | Liste des catégories |
| POST | /api/products | Admin | Ajouter un produit |
| PUT | /api/products/:id | Admin | Modifier un produit |
| DELETE | /api/products/:id | Admin | Supprimer un produit |
| POST | /api/orders | Public | Passer une commande |
| GET | /api/orders | Admin | Voir toutes les commandes |
| PATCH | /api/orders/:id/status | Admin | Changer le statut |
