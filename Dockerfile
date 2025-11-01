# Use Node.js LTS version
FROM node:18-alpine

# Install build dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy backend application files
COPY backend/ ./

# Create uploads directories
RUN mkdir -p uploads/videos uploads/thumbnails uploads/avatars

# Expose port (Cloud Run will use PORT env variable)
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
