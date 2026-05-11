# Use Node.js Alpine image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose backend port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]