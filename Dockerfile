# Use Node.js 18 Alpine (lightweight)
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    && pip3 install yt-dlp

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