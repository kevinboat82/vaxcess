# Use the official lightweight Node.js 20 Alpine image
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies needed for TypeScript build)
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app

# Copy only production dependencies and the built dist folder from the builder stage
COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Create logs directory for Winston
RUN mkdir -p logs

# Expose the API port
EXPOSE 3000

# Start the compiled JavaScript application
CMD ["node", "dist/index.js"]
