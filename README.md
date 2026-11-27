# ✨ ChatERN — Full Stack Realtime Chat App

A real-time chat application built with the **MERN** stack and **Socket.IO**, styled with **TailwindCSS + DaisyUI**, and authenticated via HTTP-only **JWT** cookies.

---

## 🚀 Tech Stack

- **MongoDB** – Database for users and messages
- **Express.js** – REST API, security middleware, and static SPA serving
- **React + Vite** – Frontend SPA with **Zustand** state management
- **Socket.IO** – Authenticated real-time messaging & multi-tab online presence
- **TailwindCSS + DaisyUI** – Responsive UI with 32 selectable themes
- **Cloudinary** – Profile picture and chat image storage

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` (or configure these in your hosting provider):

```env
NODE_ENV=production
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_random_secret
CORS_ORIGIN=https://your-domain.com

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- `CORS_ORIGIN`: Comma-separated list of allowed origins (no trailing slash). Leave unset when serving frontend and backend from the same origin.
- `VITE_API_URL` / `VITE_SOCKET_URL`: Optional build-time variables in `frontend/.env.example` if deploying the frontend separately from the backend.

---

## 🐳 Production Deployment

### Option 1: Single-Container Docker (Render, Railway, Fly.io, VPS)

Builds the React frontend and serves it alongside the Express API and Socket.IO server on port `5001`:

```bash
docker build -t chatern .
docker run -d -p 5001:5001 --env-file .env --name chatern chatern
```

### Option 2: Docker Compose (MongoDB + Backend + Nginx Frontend)

```bash
JWT_SECRET=$(openssl rand -base64 48) docker compose up -d --build
```

### Option 3: Node.js Build & Start

```bash
npm run build
NODE_ENV=production npm start
```

Health check endpoint: `GET /api/health`
