# Render Deployment Guide

This project has been refactored into a single **Monolith Web Service** to simplify deployment on Render. 

The entire application stack—Frontend (React), Backend (Node.js), and AI Service (Python)—runs inside a single Docker container. This ensures that the services are always kept together, limits cold starts since it is one service, and internal communication between the backend and AI service happens over `localhost` within the container.

Because the system is containerized into a single web service, the architecture is now:
1. **SRRSS Monolith**: A single Web Service on Render (configured via `render.yaml`).
2. **Database**: MongoDB Atlas.

## 1. Project Architecture

- **Frontend**: Built into static files (`frontend/dist`) and served by the Express backend.
- **Backend**: An Express.js app running on the main port assigned by Render.
- **AI Service**: A Python/Uvicorn service running in the background on port `8000`.
- **Redis**: Removed from the architecture as the AI service now leverages its in-memory session store (which is suitable for single-container monolith deployments).

## 2. Setting Up MongoDB (Atlas)

Since Render's free tier has limitations with persistent disks, we use **MongoDB Atlas** as the database.

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and password.
3. In Network Access, whitelist `0.0.0.0/0` (Allow access from anywhere) so Render can connect to it.
4. Copy your connection string (e.g., `mongodb+srv://<username>:<password>@cluster0.mongodb.net/srrss?retryWrites=true&w=majority`).

## 3. Step-by-Step Deployment Flow

The easiest way to deploy is by using the **Blueprint** feature on Render. 

### A. Deploy via Blueprint (Recommended)
This repository includes a `render.yaml` file that defines the `srrss-monolith` web service.

1. Go to your Render Dashboard.
2. Click **New** -> **Blueprint**.
3. Connect your GitHub/GitLab repository.
4. Render will detect the `render.yaml` file. Click **Apply**.
5. Render will prompt you for any missing environment variables (because sensitive variables are excluded via `.gitignore`).
   
### B. Manual Deployment
If you prefer not to use the Blueprint:
1. Go to your Render Dashboard.
2. Click **New** -> **Web Service**.
3. Connect your repository.
4. Choose **Docker** as the Runtime.
5. Provide a name (e.g., `srrss-monolith`).
6. Leave the rest of the settings to default (Render automatically detects the `Dockerfile` at the root of the repo).

## 4. Environment Variables

Because `.env` files are gitignored for security, you **must manually configure** the following production secrets in the Render dashboard. 

Go to your web service's **Environment** tab on Render and set these variables:

### Required Variables:
- `MONGODB_URI`: Your MongoDB Atlas connection string.
- `MONGODB_TLS`: `true` (Since you are using Atlas).
- `CLIENT_URL`: The public URL of your Render app (e.g., `https://srrss-monolith.onrender.com`).
- `FRONTEND_URL`: Same as `CLIENT_URL` (e.g., `https://srrss-monolith.onrender.com`).
- `AI_SERVICE_API_KEY`: Generate a random secure string (e.g., run `openssl rand -hex 32` locally). This is used for internal communication security.

### R2 Storage Variables (Required for file uploads):
- `R2_ACCOUNT_ID`: Your Cloudflare account ID.
- `R2_ACCESS_KEY_ID`: Cloudflare R2 access key.
- `R2_SECRET_ACCESS_KEY`: Cloudflare R2 secret key.
- `R2_BUCKET_NAME`: `srrss` (or your bucket name).
- `R2_PUBLIC_URL`: (Optional) The custom public domain for your R2 bucket.

*(Note: JWT secrets are automatically generated via `render.yaml` during Blueprint deployment. If deploying manually, provide a strong secret for `JWT_SECRET` and `JWT_REFRESH_SECRET`.)*

## 5. What to Test After Deploy

Once the service is live (you should see both Node.js and Uvicorn logs in the Render console):

1. **Frontend**: Open the app URL (`https://<your-service>.onrender.com`). It should load the UI.
2. **Backend API**: Check `https://<your-service>.onrender.com/api/health`. It should return a 200 OK.
3. **Internal AI Connection**: Try uploading or parsing a resume. The backend should successfully proxy requests to the internal AI service.
4. **Database Connection**: Try to log in or register a new user to confirm MongoDB is connected properly.
5. **Client-Side Routing**: Refresh the page on a nested route (e.g., `/dashboard`) to confirm that the backend correctly serves `index.html` for frontend routes.

## 6. Common Gotchas

- **App crashes on startup**: Check if your `MONGODB_URI` is correct and if `0.0.0.0/0` is whitelisted in Atlas.
- **AI processing fails**: Make sure `AI_SERVICE_API_KEY` is provided in the Render environment variables.
- **Files not uploading**: Verify your Cloudflare R2 credentials are correct in the Render dashboard.
- **CORS/Auth issues**: Ensure `CLIENT_URL` and `FRONTEND_URL` accurately match the actual Render URL (with `https://` and no trailing slash).
