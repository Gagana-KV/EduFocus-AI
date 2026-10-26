# ==============================================================================
# EduFocus AI - Frontend Multi-Stage Dockerfile
# Stage 1: Build React + TypeScript + Vite + Tailwind bundle
# Stage 2: Serve optimized static assets with Nginx
# ==============================================================================

# ----------------- Stage 1: Build -----------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for efficient Docker layer caching
COPY package.json package-lock.json* ./

# Install project dependencies
RUN npm install

# Copy source code and config files
COPY . .

# Build argument to inject backend API URL at build time if needed
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build optimized production bundle
RUN npm run build

# ----------------- Stage 2: Production Nginx -----------------
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA routing and API proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
