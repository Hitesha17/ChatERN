FROM node:20-alpine

WORKDIR /app

# Copy package manifests first for optimal Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the default backend port (configured in .env as 5001)
EXPOSE 5001

# Start the application
CMD ["npm", "start"]
