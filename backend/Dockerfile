# Use the official Playwright image which includes Node.js and browser dependencies
FROM mcr.microsoft.com/playwright:v1.48.2-jammy

WORKDIR /app

# Install Python (for edge-tts) and FFmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install edge-tts via pip (using --break-system-packages for Ubuntu 22.04+ pip environment)
RUN pip3 install edge-tts --break-system-packages

# Copy package files first for better caching
COPY package*.json ./
COPY prisma ./prisma/

# Install Node dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
