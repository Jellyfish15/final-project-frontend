# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create uploads directories
RUN mkdir -p uploads/videos uploads/thumbnails uploads/avatars

# Expose port (Cloud Run will use PORT env variable)
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
