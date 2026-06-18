# DemoForge

DemoForge is an automated web app demo video generator. Users can provide a URL, and DemoForge will scrape the site, extract metadata, use Gemini AI to generate a script, record a video of the app using Playwright, and assemble a final video with voiceovers and a selected visual template using Remotion.

## Features
- **Automated Scraping:** Extracts titles, features, and scripts using Playwright.
- **AI Integration:** Uses Google's Gemini to script demos dynamically.
- **Video Rendering:** Uses Remotion and FFmpeg to assemble professional videos.
- **Voiceover Generation:** Uses Edge-TTS for high-quality audio voiceovers.

---

## Local Development Setup

### 1. Prerequisites
- Node.js >= 20
- Docker & Docker Compose (for PostgreSQL and Redis)
- FFmpeg installed locally (if running outside Docker)

### 2. Environment Configuration
Copy `.env.example` to `.env` in both the `frontend` and `backend` directories.

**Backend `backend/.env` Requirements:**
- Database credentials (Postgres)
- Supabase credentials (for storage & auth check)
- Redis connection string
- Gemini API Key

### 3. Setup Backend
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

### 4. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will run at `http://localhost:5173` and the backend at `http://localhost:4000`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct connection string to PostgreSQL (used by Prisma) |
| `SUPABASE_URL` | Supabase API URL |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role Key for storage access |
| `REDIS_URL` | Connection string for Redis |
| `JWT_SECRET` | Secret key for issuing authentication tokens |
| `GEMINI_API_KEY` | API Key for Google's Gemini model |
| `VITE_API_URL` | (Frontend only) URL pointing to the backend API |

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate and receive a JWT token
- `GET /api/auth/me` - Retrieve current user information

### Jobs
- `POST /api/jobs` - Create a new demo generation job
- `GET /api/jobs` - List all jobs for the authenticated user
- `GET /api/jobs/:id` - Get status and details of a specific job
- `DELETE /api/jobs/:id` - Delete a job

---

## Deployment

### Backend (Render)
The backend requires system dependencies for Playwright, Python (Edge-TTS), and FFmpeg. It is designed to be deployed using Docker.
1. Create a **Web Service** on Render.
2. Select **Docker** as the environment.
3. Set the Root Directory to `backend`.
4. Set the Dockerfile path to `./Dockerfile`.
5. Populate the environment variables from your local `.env`.

### Frontend (Vercel)
The frontend is a React + Vite Single Page Application.
1. Create a New Project on Vercel importing the repository.
2. Set the Root Directory to `frontend`.
3. Select **Vite** as the framework preset.
4. Add the `VITE_API_URL` environment variable pointing to your deployed backend.

*(Vercel is automatically configured to rewrite routing to `index.html` via the provided `vercel.json` file).*

---

## Testing
To verify your API deployment, run the included smoke test script:
```bash
./backend/scripts/smoke-test.sh "https://your-backend-url.com"
```
