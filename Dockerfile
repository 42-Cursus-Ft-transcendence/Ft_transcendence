# ───────────────────────────────────────────────────────────────
# 1) CONTRACTS-BUILDER STAGE: compile smart contracts with Foundry
# ───────────────────────────────────────────────────────────────
FROM ghcr.io/foundry-rs/foundry:latest AS contracts-builder
WORKDIR /contracts

# Copy smart contract sources
COPY contracts/ ./

# If you have vendored dependencies (e.g., forge-std in contracts/lib), simply build
# Ensure your lib directory is included in the COPY above
# Build contracts and output JSON artifacts to out/
# Optional: Deploy ScoreBoard contract during build time (requires build-args RPC_URL and PRIVATE_KEY)
# ARG RPC_URL
# ARG PRIVATE_KEY
# RUN forge create \
#     --rpc-url "$RPC_URL" \
#     --private-key "$PRIVATE_KEY" \
#     --broadcast \
#     src/ScoreBoard.sol:ScoreBoard# Build contracts and output JSON artifacts to out/
RUN forge build

# ─────────────────────────────────────────────────────────────────────────
# 2) BUILDER STAGE: install deps & compile frontend and backend
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
# 3) RUNTIME STAGE: minimal image for running the server
# ─────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# install only runtime sqlite library
RUN apk add --no-cache sqlite-libs

WORKDIR /app

# ---------------------
# install only production deps for backend
# ---------------------
# copy package files from builder to avoid dev deps
COPY --from=builder /app/back/package.json /app/back/package-lock.json ./
RUN npm install --omit=dev

# ---------------------
# copy compiled artifacts
# ---------------------
# backend build output
COPY --from=builder /app/back/dist dist

# frontend static assets
COPY --from=builder /app/front/public public

# copy compiled contract JSONs to the path expected by 
COPY --from=contracts-builder /contracts/out /contracts/out

# create and mount data directory
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000

# final command
CMD ["node", "dist/server.js"]
