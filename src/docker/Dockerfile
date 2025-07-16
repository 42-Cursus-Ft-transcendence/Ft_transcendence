# ────────────────────────────────────────────────
# 1) STAGE “builder” : installe et compile tout
# ────────────────────────────────────────────────
FROM node:20-alpine AS builder
ENV NODE_ENV=development
WORKDIR /app

# Installer les dépendances système pour sqlite3
RUN apk add --no-cache python3 make g++ sqlite-dev

# ─── BACKEND ────────────────────────────────────
COPY src/back/package.json src/back/package-lock.json ./back/
WORKDIR /app/back
RUN npm install

COPY src/back/tsconfig.json ./tsconfig.json
COPY src/back/src ./src
RUN npm run build    # génère dist/

# ─── FRONTEND ───────────────────────────────────
WORKDIR /app
COPY src/front/package.json ./front/
WORKDIR /app/front

RUN npm install

COPY src/front/src ./src
COPY src/front/public ./public

RUN npm run build:css   # génère public/styles.css

# RUN npx tailwindcss -i ./styles/input.css -o ./public/styles.css --minify

# ────────────────────────────────────────────────
# 2) STAGE “runtime” : image légère pour l’exécution
# ────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Installer la librairie runtime SQLite
RUN apk add --no-cache sqlite-libs

# Copier les artefacts compilés
COPY --from=builder /app/back/dist   ./dist
COPY --from=builder /app/front/public ./public

# Copier les contrats compilés pour le blockchain module
COPY contracts ./contracts

# Installer uniquement les dépendances de prod du backend
COPY src/back/package.json src/back/package-lock.json ./
RUN npm install --omit=dev



# Créer le dossier de données pour SQLite
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "dist/server.js"]
