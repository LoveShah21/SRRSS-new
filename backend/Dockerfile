# Multi-stage build for Node.js backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for tests)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY tests/ ./tests/

# Run tests in builder stage
RUN npm test

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built source from builder
COPY --from=builder /app/src ./src

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Start the server
CMD ["node", "src/server.js"]
