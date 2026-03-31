# SRRSS Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v20.x or higher
- **Python**: 3.11.x
- **MongoDB**: 7.x (or use Docker)
- **Git**: Latest version

### Optional (for Docker)
- **Docker**: 24.x or higher
- **Docker Compose**: 2.x or higher

---

## Local Development

### 1. Clone Repository
```bash
git clone <repository-url>
cd srrss-antigravity
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### 3. AI Service Setup
```bash
cd ai-service
pip install -r requirements.txt

# Start development server
python -m uvicorn src.main:app --reload --port 8000
```

### 4. Frontend Setup
```bash
cd frontend
npm install

# Start development server
npm run dev
```

### 5. Start MongoDB
```bash
# Using Docker
docker run -d -p 27017:27017 --name srrss-mongo mongo:7

# Or install MongoDB locally
mongod --dbpath /data/db
```

---

## Docker Deployment

### 1. Build All Services
```bash
docker-compose build
```

### 2. Start All Services
```bash
docker-compose up -d
```

### 3. View Logs
```bash
docker-compose logs -f
```

### 4. Stop Services
```bash
docker-compose down
```

### 5. Stop and Remove Volumes
```bash
docker-compose down -v
```

---

## Production Deployment

### Environment Configuration

Create production `.env` files:

**backend/.env.production:**
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://user:password@prod-db:27017/srrss
JWT_SECRET=<generate-secure-random-string>
JWT_REFRESH_SECRET=<generate-secure-random-string>
AI_SERVICE_URL=http://ai-service:8000
CLIENT_URL=https://your-domain.com
```

**ai-service/.env.production:**
```env
PORT=8000
PYTHONUNBUFFERED=1
```

### 1. Generate Secure Secrets
```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Deploy with Docker Compose (Production)
```bash
docker-compose -f docker-compose.yml up -d --build
```

### 3. Configure Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. SSL/HTTPS Setup (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/srrss |
| DB_NAME | Database name | srrss |
| JWT_SECRET | JWT signing secret | (required) |
| JWT_EXPIRES_IN | Token expiry | 15m |
| JWT_REFRESH_SECRET | Refresh token secret | (required) |
| JWT_REFRESH_EXPIRES_IN | Refresh token expiry | 7d |
| AI_SERVICE_URL | AI service endpoint | http://localhost:8000 |
| UPLOAD_DIR | Upload directory | ./uploads |
| CLIENT_URL | Frontend URL (CORS) | http://localhost:5173 |

### AI Service (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Service port | 8000 |
| PYTHONUNBUFFERED | Python output | 1 |

### Frontend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://localhost:5000/api |

---

## Health Checks

### Backend
```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 12345.67
}
```

### AI Service
```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "ok",
  "service": "srrss-ai-service"
}
```

---

## Running Tests

### Backend Tests
```bash
cd backend
npm test
```

### AI Service Tests
```bash
cd ai-service
pytest tests/ -v --cov=src
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB status
docker ps | grep mongo

# View MongoDB logs
docker logs srrss-mongodb

# Test connection
mongosh mongodb://localhost:27017
```

### Container Build Failures
```bash
# Rebuild without cache
docker-compose build --no-cache

# View build logs
docker-compose build 2>&1 | tee build.log
```

### Port Already in Use
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Permission Denied (Docker)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### AI Service Import Errors
```bash
# Reinstall Python dependencies
cd ai-service
pip install -r requirements.txt --force-reinstall
```

### CORS Errors
Ensure `CLIENT_URL` in backend .env matches your frontend URL exactly.

---

## Monitoring

### View Container Stats
```bash
docker stats
```

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f ai-service
docker-compose logs -f frontend
```

### Access Database
```bash
docker exec -it srrss-mongodb mongosh -u admin -p admin123
```

---

## Backup & Restore

### Backup MongoDB
```bash
docker exec srrss-mongodb mongodump --out /data/backup
docker cp srrss-mongodb:/data/backup ./mongodb-backup
```

### Restore MongoDB
```bash
docker cp ./mongodb-backup srrss-mongodb:/data/restore
docker exec srrss-mongodb mongorestore /data/restore
```
