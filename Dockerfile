# Build Stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy server package files and install
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy client package files and install
COPY client/package*.json ./client/
RUN cd client && npm install

# Copy all files
COPY . .

# Build the client
RUN cd client && npm run build

# Production Stage
FROM node:20-slim

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

# Install production dependencies for server
RUN cd server && npm install --production

# Expose the server port
EXPOSE 3001

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the server (which should serve the static client files)
CMD ["node", "server/index.js"]
