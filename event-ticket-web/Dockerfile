# ==============================================================================
# Multi-Stage Production Dockerfile for Enterprise Angular 19 Frontend
# ==============================================================================

# Stage 1: Build Angular application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with frozen lockfile for build reproducibility
COPY package*.json ./
RUN npm ci

# Copy source code and build production bundle
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve application via ultra-lightweight NGINX Alpine
FROM nginx:alpine

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled SPA bundle from builder stage
COPY --from=builder /app/dist/event-ticket-web/browser /usr/share/nginx/html

# Copy optimized SPA nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run NGINX in foreground
CMD ["nginx", "-g", "daemon off;"]
