FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-validation/package.json packages/shared-validation/package.json
COPY packages/shared-socket-events/package.json packages/shared-socket-events/package.json
RUN npm ci
COPY apps/api apps/api
COPY packages packages
RUN npm run build -w @krasun/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
EXPOSE 3001
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/index.js"]
