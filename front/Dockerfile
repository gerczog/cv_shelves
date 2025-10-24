FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Environment variables will be set by docker-compose.yml

# Expose port 3000 (внутренний порт контейнера)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]