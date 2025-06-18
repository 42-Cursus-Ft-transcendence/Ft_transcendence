# ft_transcendence-
This project involves undertaking tasks you have never done before. Remember the beginning of your journey in computer science. Look at you now; it’s time to shine!
# 🕹️ ft_transcendence — Une plateforme de jeux temps réel en ligne

> Projet final de la formation 42 — Un défi fullstack, sécurisé, en conteneurs, avec des technologies modernes

## 🚀 Présentation

**ft_transcendence** est une application web complète pensée pour repousser les limites de l’apprentissage : c’est une plateforme de jeux multijoueurs, incluant un Pong en ligne en temps réel, une gestion complète des comptes utilisateurs, un système de tournois, et bien plus encore.

Réalisé en équipe, ce projet m’a permis de maîtriser l’architecture logicielle moderne (Docker, Node.js, Fastify, WebSockets, SQLite, Tailwind, etc.) tout en assurant sécurité, performance et extensibilité. L’objectif était d’aborder des technologies *non connues à l’avance* et d’apprendre à les intégrer en autonomie complète.

---

## 🎮 Fonctionnalités principales

- ✅ Jeu de **Pong en ligne multijoueur en temps réel**
- ✅ Mode tournoi avec **matchmaking automatisé**
- ✅ **Authentification sécurisée** (login, inscription, JWT + 2FA)
- ✅ **Chat en direct** entre utilisateurs + invitations à jouer
- ✅ **IA** capable de simuler un vrai joueur humain
- ✅ Historique des matchs, statistiques, avatars
- ✅ **Deuxième jeu original** ajouté à la plateforme
- ✅ Interface en **Single Page Application** (SPA)
- ✅ Déploiement full Docker, **en un seul `docker-compose up`**

---

## 🛠️ Technologies utilisées

| Catégorie         | Technologies                                       |
|------------------|----------------------------------------------------|
| Frontend         | TypeScript, Tailwind CSS, WebSockets               |
| Backend          | Node.js, Fastify, SQLite, JWT, 2FA                 |
| Jeux             | Canvas API / Babylon.js (3D), IA custom            |
| Sécurité         | HTTPS, Hashing, XSS/SQLi Protection, Vault         |
| Déploiement      | Docker, Docker Compose, `.env` sécurisé            |
| Autres modules   | Accessibilité, multi-langue, responsive design     |

---

## 🧠 Ce que ce projet démontre

- **Capacité d’apprentissage rapide** de technologies nouvelles
- **Solide compréhension du backend et de la sécurité web**
- **Travail en équipe** sur un projet long et complexe
- **Vision produit** : pas seulement du code, mais une vraie plateforme jouable
- **Rigueur DevOps** : tout est conteneurisé, reproductible, versionné

---

Ce projet est bien plus qu’un site de jeu : c’est une démonstration concrète de ma capacité à m’adapter, à apprendre vite, à concevoir une architecture complète, et à livrer un produit fonctionnel et sécurisé.

## 📸 Aperçu

> *(Insère ici des captures d’écran des pages principales, jeu, chat, profils, etc.)*

---

## ⚙️ Lancer le projet

```bash
git clone https://github.com/ton-user/ft_transcendence.git
cd ft_transcendence
cp .env.example .env  # À adapter
docker-compose up --build
