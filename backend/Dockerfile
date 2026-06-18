# Playwright's image ships Chromium + all system deps + a matching Node runtime.
# Keep this tag in sync with the "playwright" version in package.json.
FROM mcr.microsoft.com/playwright:v1.48.2-jammy

ENV NODE_ENV=production \
    PIPX_HOME=/opt/pipx \
    PIPX_BIN_DIR=/usr/local/bin

# System deps:
#   - ffmpeg  → provides `ffprobe`, used by tts.service to measure audio duration
#   - python3 / pipx → to install the edge-tts CLI used for narration synthesis
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv pipx \
    && pipx install edge-tts \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first to leverage Docker layer caching.
COPY package*.json ./
RUN npm ci

# Generate the Prisma client, then build the TypeScript sources.
COPY . .
RUN npx prisma generate && npm run build

# Pre-download the Chrome Headless Shell that @remotion/renderer needs, so the
# first render at runtime doesn't pay a ~90MB download (and can't fail offline).
# The Playwright base image already provides the required system libraries.
RUN node -e "require('@remotion/renderer').ensureBrowser().then(()=>console.log('remotion browser ready'))"

# Sanity-check that edge-tts and the Remotion browser resolved at build time.
RUN edge-tts --version

EXPOSE 4000

CMD ["node", "dist/index.js"]
