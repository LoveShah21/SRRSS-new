FROM python:3.11-slim

WORKDIR /app

# Install Node.js and npm
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 1. Install AI Service Dependencies
COPY ai-service/requirements.txt /app/ai-service/
RUN pip install --no-cache-dir -r /app/ai-service/requirements.txt

# 2. Install Backend Dependencies
COPY backend/package*.json /app/backend/
RUN cd /app/backend && npm ci

# 3. Install & Build Frontend
COPY frontend/package*.json /app/frontend/
RUN cd /app/frontend && npm ci
COPY frontend/ /app/frontend/
RUN cd /app/frontend && npm run build

# 4. Copy Remaining Source Code
COPY backend/ /app/backend/
COPY ai-service/ /app/ai-service/

# 5. Copy Startup Script
COPY start.sh /app/
RUN chmod +x /app/start.sh

ENV AI_SERVICE_HOSTPORT=localhost:8000
ENV NODE_ENV=production

CMD ["/app/start.sh"]
