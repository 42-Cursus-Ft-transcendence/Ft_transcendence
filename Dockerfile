# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy remaining files
COPY . .

# Build Tailwind CSS
RUN npx tailwindcss -i ./public/input.css -o ./public/styles.css --minify

# Expose port
EXPOSE 3000

# Start Fastify server
CMD ["node", "server.js"]