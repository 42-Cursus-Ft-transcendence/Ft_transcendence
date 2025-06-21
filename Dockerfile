# # Use official Node.js image
# FROM node:20-alpine

# # Set working directory
# WORKDIR /app

# # Install dependencies
# COPY package*.json ./
# RUN npm install

# # Copy remaining files
# COPY . .

# # Build Tailwind CSS
# RUN npx tailwindcss -i ./public/input.css -o ./public/styles.css --minify

# # Expose port
# EXPOSE 3000

# # Start Fastify server
# CMD ["node", "server.js"]


# # Étape 1 : Utiliser l’image Node.js
# FROM node:20-alpine

# # Étape 2 : Définir le répertoire de travail dans le conteneur
# WORKDIR /app

# # Étape 3 : Copier les fichiers package.json
# COPY package*.json ./

# # Étape 4 : Installer les dépendances
# RUN npm install

# # Étape 5 : Copier tout le code
# COPY . .

# # Étape 6 : Exposer le port que ton serveur utilise
# EXPOSE 3000

# # Étape 7 : Lancer le serveur Fastify
# CMD ["node", "server.js"]



# Étape 1 : Image de base
FROM node:20

# Étape 2 : Définir le dossier de travail
WORKDIR /app

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

