# === Stage 1: Build the React Application ===
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# === Stage 2: Serve the App using Nginx ===
FROM nginx:alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom Nginx config resolving the React router and API proxying
COPY nginx.conf /etc/nginx/conf.d/

# Copy the compiled static assets from Stage 1 into the Nginx public folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
