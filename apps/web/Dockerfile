FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-validation/package.json packages/shared-validation/package.json
COPY packages/shared-socket-events/package.json packages/shared-socket-events/package.json
RUN npm ci
COPY apps/web apps/web
COPY packages packages
ARG VITE_API_URL=http://localhost:3001
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_MAPBOX_TOKEN
ARG VITE_ENABLE_DEV_LOGIN=true
ENV VITE_ENABLE_DEV_LOGIN=$VITE_ENABLE_DEV_LOGIN VITE_API_URL=$VITE_API_URL VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
RUN npm run build -w @krasun/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
