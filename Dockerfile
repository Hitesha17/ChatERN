# Use an official Node.js base image
FROM node:23-alpine3.20

# Set environment variables
ENV MONGO_DB_USERNAME=admin \
    MONGO_DB_PWD=123

# Create and set the working directory
RUN mkdir -p /home/chatern
WORKDIR /home/chatern

# Copy all files into the working directory
COPY . .

# Install dependencies
RUN npm install

# Expose the port your app runs on (e.g., 3000)
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
