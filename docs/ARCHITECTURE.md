# SRRSS Architecture Documentation

## System Overview

The Smart Recruitment & Resume Screening System (SRRSS) is a full-stack web application that automates resume screening, candidate scoring, and bias detection in job postings.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│                    http://localhost:5173                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Login     │ │  Dashboard  │ │  Job Board  │ │   Admin   │ │
│  │   Register  │ │  My Apps    │ │  Job Detail │ │  Console  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API (Node.js/Express)                │
│                    http://localhost:5000                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     Routes                                │  │
│  │  /api/auth    /api/jobs    /api/applications              │  │
│  │  /api/resume  /api/admin                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Middleware                             │  │
│  │  Authentication (JWT) │ Authorization (RBAC) │ Error       │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     Models                                │  │
│  │  User │ Job │ Application                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │                                    │ HTTP
         │ MongoDB                            ▼
         ▼                    ┌───────────────────────────────┐
┌─────────────────┐           │    AI Service (Python/FastAPI)│
│   MongoDB       │           │    http://localhost:8000      │
│   Database      │           │                               │
│                 │           │  - Resume Parser              │
│                 │           │  - Candidate Scorer           │
│                 │           │  - Bias Detector              │
│                 │           └───────────────────────────────┘
└─────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: React Router DOM v6
- **UI Components**: Lucide React icons
- **HTTP Client**: Axios
- **State Management**: React Context API

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js 5
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer

### AI Service
- **Framework**: FastAPI (Python)
- **NLP**: NLTK, spaCy
- **Resume Parsing**: pdfplumber, python-docx
- **ML**: scikit-learn

### DevOps
- **Containerization**: Docker (multi-stage builds)
- **Orchestration**: Docker Compose
- **CI/CD**: GitHub Actions

## System Components

### 1. Authentication Service
- JWT-based authentication
- Refresh token rotation
- Role-based access control (RBAC)
- Supported roles: candidate, recruiter, admin

### 2. Job Management Service
- CRUD operations for job postings
- Text search with MongoDB indexes
- Skills and location filtering
- Bias detection integration

### 3. Application Management Service
- Application submission with AI scoring
- Status workflow (applied → shortlisted → interview → hired/rejected)
- Interview scheduling
- Recruiter dashboard with sorting

### 4. Resume Processing Service
- File upload (PDF/DOCX)
- AI-powered resume parsing
- Profile auto-population
- Skills extraction

### 5. Admin Console
- User management
- Role assignment
- System analytics
- Content moderation

## Database Schema

### User Collection
```javascript
{
  email: String (unique, lowercase, indexed),
  passwordHash: String (bcrypt),
  role: Enum['candidate', 'recruiter', 'admin'],
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    linkedIn: String,
    skills: [String],
    education: [{degree, institution, year}],
    experience: [{title, company, years, description}],
    resumeUrl: String,
    parsedAt: Date
  },
  refreshToken: String,
  timestamps: true
}
```

### Job Collection
```javascript
{
  title: String (indexed),
  description: String,
  requiredSkills: [String] (indexed),
  experienceMin: Number,
  experienceMax: Number,
  location: String,
  salaryRange: {min, max},
  status: Enum['open', 'closed', 'draft'],
  recruiterId: ObjectId (ref: User),
  biasFlags: [{term, suggestion, severity}],
  applicantCount: Number,
  timestamps: true
}
```

### Application Collection
```javascript
{
  candidateId: ObjectId (ref: User, indexed),
  jobId: ObjectId (ref: User, indexed),
  matchScore: Number (0-100),
  scoreBreakdown: {skills, experience, education},
  status: Enum['applied', 'shortlisted', 'interview', 'hired', 'rejected'],
  statusHistory: [{status, changedAt, changedBy}],
  interview: {scheduledAt, link, notes},
  appliedAt: Date,
  timestamps: true
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Jobs
- `GET /api/jobs` - List jobs (with filters)
- `GET /api/jobs/:id` - Get single job
- `POST /api/jobs` - Create job (recruiter/admin)
- `PUT /api/jobs/:id` - Update job (recruiter/admin)
- `DELETE /api/jobs/:id` - Delete job (admin)

### Applications
- `POST /api/applications` - Apply to job (candidate)
- `GET /api/applications/me` - Get candidate's applications
- `GET /api/applications/job/:jobId` - Get job applications (recruiter)
- `PATCH /api/applications/:id/status` - Update status (recruiter)
- `PATCH /api/applications/:id/interview` - Schedule interview

### Resume
- `POST /api/resume/upload` - Upload resume (candidate)
- `GET /api/resume/profile` - Get parsed profile
- `PUT /api/resume/profile` - Update profile

### Admin
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/role` - Update role
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/analytics` - System analytics

## Security Measures

1. **Authentication**: JWT with refresh token rotation
2. **Authorization**: Role-based access control (RBAC)
3. **Rate Limiting**: 100 requests per 15 minutes
4. **CORS**: Configured for specific origins
5. **Helmet**: Security headers
6. **Input Validation**: Mongoose schema validation
7. **Password Hashing**: bcrypt with salt
8. **File Upload Validation**: MIME type checking

## Scalability Considerations

1. **Database Indexing**: Compound indexes for efficient queries
2. **Pagination**: All list endpoints support pagination
3. **Caching**: Ready for Redis integration
4. **Horizontal Scaling**: Stateless API design
5. **CDN**: Static assets served via nginx

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Docker Compose                      │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Frontend   │  │   Backend   │  │   AI Svc    │  │
│  │  :5173      │  │   :5000     │  │   :8000     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│         │                │                │         │
│         └────────────────┴────────────────┘         │
│                      │                              │
│              ┌───────────────┐                      │
│              │   MongoDB     │                      │
│              │   :27017      │                      │
│              └───────────────┘                      │
└─────────────────────────────────────────────────────┘
```
