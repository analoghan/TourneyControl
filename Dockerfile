# Multi-stage build for tournament control system

# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci

# Copy client source code
COPY client/ ./

# Build the React app
RUN npm run build

# Stage 2: Setup the Node.js backend
FROM node:18-alpine

WORKDIR /app

# Install production dependencies for backend
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY server/ ./server/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/client/dist ./client/dist

# Create directory for SQLite database
RUN mkdir -p /app/data

# Expose the port the app runs on
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the application
CMD ["node", "server/index.js"]
