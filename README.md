# SRRSS - Smart Recruitment & Resume Screening System

[![CI](https://github.com/your-org/srrss/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/srrss/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An intelligent recruitment platform that automates resume screening, candidate scoring, and bias detection in job postings using AI/ML.

## Features

### For Candidates
- **Resume Upload & Parsing**: Upload PDF/DOCX resumes for AI-powered parsing
- **Job Search**: Browse, search, and filter job listings
- **Application Tracking**: Track application status in real-time
- **Smart Matching**: Get match scores based on skills, experience, and education

### For Recruiters
- **Job Posting**: Create and manage job postings with bias detection
- **Candidate Scoring**: AI-powered candidate ranking and scoring
- **Application Management**: Review, shortlist, and schedule interviews
- **Analytics Dashboard**: Track hiring metrics and funnel conversion

### For Administrators
- **User Management**: Manage users and role assignments
- **System Analytics**: View platform-wide metrics
- **Content Moderation**: Monitor and moderate job postings

## Tech Stack

### Frontend
- React 18 with Vite
- React Router DOM
- Axios for API calls
- Lucide React icons

### Backend
- Node.js 20 + Express.js 5
- MongoDB + Mongoose
- JWT Authentication
- Multer for file uploads

### AI Service
- Python 3.11 + FastAPI
- NLTK, spaCy for NLP
- pdfplumber, python-docx for parsing

### DevOps
- Docker (multi-stage builds)
- Docker Compose
- GitHub Actions CI/CD

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB 7+ (or Docker)

### 1. Clone Repository
```bash
git clone <repository-url>
cd srrss-antigravity
```

### 2. Start with Docker (Recommended)
```bash
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
cp frontend/.env.example frontend/.env
docker-compose up -d --build
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- AI Service: http://localhost:8000

### 3. Local Development Setup

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**AI Service:**
```bash
cd ai-service
cp .env.example .env
pip install -r requirements.txt
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) - System design and components
- [API Documentation](./docs/API_DOCS.md) - REST API reference
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment
- [User Guide](./docs/USER_GUIDE.md) - End-user documentation
- [Readiness Review](./docs/CODEBASE_REVIEW_AND_READINESS.md) - Implementation checklist and status

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

## Project Structure

```
srrss-antigravity/
├── backend/           # Node.js Express API
│   ├── src/
│   │   ├── models/    # Mongoose schemas
│   │   ├── routes/    # API endpoints
│   │   ├── middleware/# Auth, error handling
│   │   └── config/    # Database connection
│   ├── tests/         # Jest tests
│   └── Dockerfile
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── components/# Reusable components
│   │   ├── context/   # React contexts
│   │   └── services/  # API clients
│   ├── src/tests/     # Vitest tests
│   └── Dockerfile
├── ai-service/        # Python FastAPI
│   ├── src/           # API endpoints
│   ├── tests/         # Pytest tests
│   └── Dockerfile
├── .github/workflows/ # CI/CD
├── docker-compose.yml # Docker orchestration
└── docs/
    ├── ARCHITECTURE.md # System design
    ├── API_DOCS.md     # API reference
    ├── DEPLOYMENT.md   # Deploy guide
    └── USER_GUIDE.md   # User manual
```

## Environment Variables

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/srrss
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=replace-with-shared-ai-service-key
AI_TRUSTED_INTERNAL_HOSTS=localhost,127.0.0.1,::1,ai-service
CLIENT_URL=http://localhost:5173
```

### AI Service (.env)
```env
PORT=8000
PYTHONUNBUFFERED=1
AI_SERVICE_API_KEY=replace-with-shared-ai-service-key
AI_REQUIRE_API_KEY=true
AI_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
REDIS_URL=redis://localhost:6379/0
SESSION_TTL_SECONDS=86400
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Jobs
- `GET /api/jobs` - List jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job (recruiter/admin)
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job (admin)

### Applications
- `POST /api/applications` - Apply to job
- `GET /api/applications/me` - Get my applications
- `GET /api/applications/job/:jobId` - Get job applications
- `POST /api/applications/job/:jobId/rank` - Re-rank candidates for a job
- `POST /api/applications/:id/reveal` - Reveal masked candidate identity (blind mode)
- `PATCH /api/applications/:id/status` - Update status

### Resume
- `POST /api/resume/upload` - Upload resume
- `GET /api/resume/download` - Generate secure resume download URL
- `GET /api/resume/profile` - Get parsed profile
- `PUT /api/resume/profile` - Update profile

### Recruiter
- `GET /api/recruiter/analytics` - Recruiter analytics
- `GET /api/recruiter/settings` - Recruiter settings (including blind-screening mode)
- `PATCH /api/recruiter/settings` - Update recruiter settings

### AI Service
- `POST /api/parse-resume` - Parse candidate resume
- `POST /api/score-candidate` - Score a profile against a job
- `POST /api/detect-bias` - Detect bias in job descriptions

## Demo Flow and Reset

Happy-path validation:
1. Candidate uploads resume (`POST /api/resume/upload`).
2. Candidate applies to a job (`POST /api/applications`).
3. Recruiter ranks candidates (`POST /api/applications/job/:jobId/rank`).
4. Recruiter schedules interview (`POST /api/interviews`).
5. Candidate verifies interview entry (`GET /api/interviews`).

Quick reset:
```bash
docker-compose down -v
docker-compose up -d --build
```

### Admin
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id/role` - Update role
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/analytics` - System analytics

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with MongoDB, Express, React, Node.js (MERN)
- AI service powered by FastAPI and NLP libraries
- Containerized with Docker for easy deployment
