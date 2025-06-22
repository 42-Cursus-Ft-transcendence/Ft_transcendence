# Étape 1 : Image de base
FROM node:20

# Étape 2 : Définir le dossier de travail
WORKDIR ../back

# Étape 3 : Copier les fichiers package.json
COPY package*.json ./

# Étape 4 : Installer les dépendances (y compris devDependencies pour Tailwind build)
RUN npm install

# Étape 5 : Copier le reste des fichiers du projet
COPY . .

# Étape 6 : Compiler Tailwind CSS
RUN npm run build:css

# Étape 7 : Exposer le port utilisé par Fastify
EXPOSE 3000

# Étape 8 : Lancer le serveur
CMD ["npm", "start"]

