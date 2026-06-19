FROM node:20-slim
RUN apt-get update && apt-get install -y ffmpeg python3 python3-pip \
libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
libxkbcommon-dev libxcomposite1 libxdamage1 libxfixes3 \
libxrandr2 libgbm-dev libasound2 libpango-1.0-0 libcairo2 \
--no-install-recommends && \
pip3 install edge-tts --break-system-packages && \
rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
# Use npm ci but keep devDependencies for build, then prune
RUN npm ci
COPY prisma ./prisma/
RUN npx prisma generate
COPY . .
RUN npx playwright install chromium --with-deps
RUN npm run build
RUN mkdir -p temp
EXPOSE 4000
CMD ["node", "dist/index.js"]
