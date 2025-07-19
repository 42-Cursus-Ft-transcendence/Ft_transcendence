# ─────────────────────────────────────────────────────────────────────────
# 1) BUILDER STAGE: install deps & compile frontend and backend
# ─────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# install system deps needed for sqlite3 builds
RUN apk add --no-cache python3 make g++ sqlite-dev

# set working dir for consistency
WORKDIR /app

# ---------------------
# FRONTEND build
# ---------------------
# copy only package files to leverage cache
COPY src/front/package.json src/front/package-lock.json ./
WORKDIR /app

RUN mkdir front && mv package*.json front/
WORKDIR /app/front
RUN npm install

# copy source & build
COPY src/front/tsconfig.json ./tsconfig.json
COPY src/front/src ./src
COPY src/front/public ./public
RUN npm run build:ts && npm run build:css
# now /app/front/public contains built assets

# ---------------------
# BACKEND build
# ---------------------
# back to root, copy only backend package files to leverage cache
WORKDIR /app
COPY src/back/package.json src/back/package-lock.json ./
RUN mkdir back && mv package*.json back/
WORKDIR /app/back
RUN npm install

# copy source & build
COPY src/back/tsconfig.json ./tsconfig.json
COPY src/back/src ./src
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────
# 2) RUNTIME STAGE: minimal image for running the server
# ─────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# install only runtime sqlite library
RUN apk add --no-cache sqlite-libs curl

WORKDIR /app

COPY src/back/wait-for-anvil.sh /app/wait-for-anvil.sh
RUN chmod +x /app/wait-for-anvil.sh

# ---------------------
# install only production deps for backend
# ---------------------
# copy package files from builder to avoid dev deps
COPY --from=builder /app/back/package.json /app/back/package-lock.json ./
# RUN npm install --omit=dev
RUN npm install

# ---------------------
# copy compiled artifacts
# ---------------------
# backend build output
COPY --from=builder /app/back/dist dist

# frontend static assets
COPY --from=builder /app/front/public public

# create and mount data directory
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000

# final command
ENTRYPOINT ["/app/wait-for-anvil.sh"]
CMD ["node", "dist/server.js"]
