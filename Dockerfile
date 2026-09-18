# Use an official Node.js runtime as a parent image
FROM node:18-bullseye-slim

# Install Python (required by yt-dlp) and FFmpeg (required for media processing)
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp globally
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
