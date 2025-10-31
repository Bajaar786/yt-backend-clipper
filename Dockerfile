# Use Node.js 18 Alpine (lightweight)
FROM node:18-alpine

# Install system dependencies - use apk for yt-dlp instead of pip
RUN apk add --no-cache \
    ffmpeg \
    yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy source code
COPY . .

# Create temp directory for video files
RUN mkdir -p temp

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]