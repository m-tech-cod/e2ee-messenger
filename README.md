# WhisperBox E2EE Messenger

Application de messagerie chiffrée de bout en bout utilisant l’API WhisperBox.  
Chiffrement hybride : AES-GCM + RSA-OAEP. Les clés sont générées côté client, le serveur ne voit jamais le texte en clair.

---

## Live Demo

https://m-tech-cod-e2ee-messenger-zere.vercel.app/

---

## Installation et exécution en local

```bash
git clone https://github.com/m-tech-cod/e2ee-messenger
cd e2ee-messenger
npm install
npm run dev
Ouvrir http://localhost:5173.

---

## Architecture et flux de chiffrement

┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│  Client A   │      │   Backend   │      │    Client B     │
│ (Alice)     │      │ WhisperBox  │      │    (Bob)        │
└──────┬──────┘      └──────┬──────┘      └───────┬─────────┘
       │                    │                      │
       │ 1. Inscription     │                      │
       │ (envoie clé pub)   │                      │
       │───────────────────>│                      │
       │                    │                      │
       │ 2. Recherche Bob   │                      │
       │<──────────────────>│                      │
       │                    │                      │
       │ 3. Récupère clé    │                      │
       │    publique de Bob │                      │
       │<───────────────────│                      │
       │                    │                      │
       │ 4. Chiffre message │                      │
       │ (AES + RSA pub Bob)│                      │
       │                    │                      │
       │ 5. Envoie payload  │                      │
       │    chiffré         │                      │
       │───────────────────>│                      │
       │                    │ 6. Stocke ciphertext │
       │                    │                      │
       │                    │ 7. Bob récupère     │
       │                    │    ses messages     │
       │                    │<─────────────────────│
       │                    │                      │
       │                    │ 8. Renvoie payload  │
       │                    │─────────────────────>│
       │                    │                      │
       │                    │         9. Bob déchiffre
       │                    │            avec sa clé privée

---

## Flux de chiffrement (hybride AES-GCM + RSA-OAEP)

1. **Génération des clés (inscription)**  
   - Création d’une paire RSA-2048 avec Web Crypto API.  
   - Clé publique → envoyée au backend (`/auth/register`).  
   - Clé privée → stockée en `localStorage` (jamais transmise).

2. **Envoi d’un message (Alice → Bob)**  
   - Récupération de la clé publique RSA de Bob (`/users/{bobId}/public-key`).  
   - Génération d’une clé AES-256 éphémère et d’un IV aléatoire.  
   - Chiffrement du message (`plaintext`) avec AES-GCM → `ciphertext`.  
   - Chiffrement de la clé AES avec la clé publique RSA de Bob → `encryptedKey`.  
   - Chiffrement de la même clé AES avec la clé publique RSA d’Alice → `encryptedKeyForSelf` (permettra à Alice de lire son propre message).  
   - Envoi du payload `{ ciphertext, iv, encryptedKey, encryptedKeyForSelf }` au backend (`/messages`).

3. **Réception et déchiffrement (Bob)**  
   - Récupération des messages depuis `/conversations/{aliceId}/messages`.  
   - Pour chaque message, déterminer s’il est destiné à Bob (`from_user_id ≠ Bob` → utiliser `encryptedKey`) ou s’il a été envoyé par Bob (`from_user_id == Bob` → utiliser `encryptedKeyForSelf`).  
   - Déchiffrement de la clé AES avec la clé privée RSA de Bob.  
   - Déchiffrement du `ciphertext` avec AES-GCM.  
   - Affichage du texte en clair.

**Schéma synthétique :**

Alice Backend Bob
| | |
|--(1) Envoie clé pub RSA------------>| |
| | |
|--(2) Demande clé pub de Bob-------->| |
|<--(3) Renvoie clé pub Bob-----------| |
| | |
|--(4) Chiffre msg avec AES + RSA pub Bob |
| Génère clé AES éphémère |
| Chiffre msg → ciphertext |
| Chiffre clé AES avec RSA pub Bob → encryptedKey |
| Chiffre clé AES avec RSA pub Alice → encryptedKeyForSelf |
| | |
|--(5) Envoie payload---------------->| |
| |--(6) Stocke ciphertext------------>|
| | |
| |<--(7) Bob récupère ses messages----|
| | |
| |--(8) Renvoie payload-------------->|
| | |
| | (9) Bob déchiffre |
| | avec sa clé |
| | privée RSA |


> *Remarque : Le backend WhisperBox ne voit jamais le texte clair, seulement les blocs chiffrés.*

---

## Gestion des clés

- **Clé publique** : stockée sur le backend, accessible à tous les utilisateurs (utilisée pour chiffrer les messages destinés à un utilisateur).
- **Clé privée** : ne quitte jamais le navigateur ; conservée dans `localStorage` (en clair – simplifié pour le stage ; en production, elle serait chiffrée avec PBKDF2).
- **Clés éphémères AES** : générées pour chaque message, ne sont jamais stockées (chiffrement symétrique jetable).

---

## Trade-offs et limitations

| Limitation | Pourquoi | Impact / Atténuation |
|------------|----------|----------------------|
| Clé privée stockée en clair dans `localStorage` | Simplification pour le stage ; éviter une complexité supplémentaire (PBKDF2). | Risque si appareil compromis. Dans un environnement réel, les clés privées devraient être chiffrées avec un mot de passe (PBKDF2 + AES-KW). |
| Pas de WebSocket (polling REST) | L’API WhisperBox propose une alternative REST ; le temps réel n’était pas obligatoire. | Les messages s’affichent après rechargement ou polling manuel. L’utilisateur doit rafraîchir pour voir les nouveaux messages. |
| Absence d’indicateur visuel “chiffré” | Non spécifié dans les critères UI ; l’accent a été mis sur le fonctionnement du chiffrement. | Les utilisateurs voient directement le message déchiffré – aucun indicateur supplémentaire n’est affiché. |
| Pas de forward secrecy | Utilisation de clés RSA statiques (simplicité). | Une clé privée compromise permet de déchiffrer tous les messages passés. Non exigé pour le stage ; pourrait être amélioré avec ECDH + clés éphémères. |
| Clés AES éphémères non persistées | Volonté de ne pas stocker de données sensibles inutilement. | Chaque message dispose de sa propre clé AES ; aucune clé AES n’est réutilisée. |

---

## Structure du projet

* e2ee-messenger/
  * src/
    * components/
      * auth/
        * LoginForm.jsx
        * RegisterForm.jsx
      * chat/
        * ConversationList.jsx
        * MessageList.jsx
        * MessageInput.jsx
        * UserSearch.jsx
    * contexts/
      * AuthContext.jsx
    * lib/
      * api.js
      * crypto.js
    * types/
      * index.ts         
    * App.jsx
    * main.jsx
    * index.css
  * .gitignore
  * eslint.config.js
  * index.html
  * package-lock.json
  * package.json
  * postcss.config.js
  * README.md
  * tailwind.config.js
  * tsconfig.app.json
  * tsconfig.json
  * tsconfig.node.json
  * vite.config.ts

---

## Tester l’application

1. **Créer deux comptes** (ex: `alice2026`, `bob2026`).  
2. **Se connecter avec `alice2026`**.  
3. **Rechercher `bob2026`** via la barre de recherche (champ “Rechercher un utilisateur”).  
4. **Envoyer un message** – il apparaît immédiatement dans la conversation.  
5. **Se déconnecter, puis se connecter avec `bob2026`** – le message reçu s’affiche déchiffré.

---

## Dépendances
- React 18 + Vite
- Tailwind CSS
- Web Crypto API (intégrée au navigateur)
- API WhisperBox (backend fourni)

---

## Auteur
ALAYDE Malomon Araffath – HNG Internship 2026
GitHub: https://github.com/m-tech-cod

---

## Remerciements
HNG Internship pour le challenge, l’équipe WhisperBox pour l’API.