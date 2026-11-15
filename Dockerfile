# Stage 1: Shared Base Environment
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# Stage 2: Development Stage (Used locally by Docker Compose)
FROM base AS development
RUN npm ci --omit=dev
COPY . .
CMD ["npm", "start"]

# Stage 3: Production Dependency Isolator
FROM base AS build
RUN npm ci --omit=dev

# Stage 4: Final Lean Production Image
FROM node:22-alpine AS production
WORKDIR /app
USER node

# FIX: Copy project files first, then overlay the sanitized node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node . .
COPY --chown=node:node --from=build /app/node_modules ./node_modules

CMD ["node", "--import", "./src/telemetry-preload.js", "server.js"]
