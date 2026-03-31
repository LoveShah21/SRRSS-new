# SRRSS API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

## Error Response Format
```json
{
  "error": "Error message here"
}
```

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "candidate"
}
```

**Response (201):**
```json
{
  "message": "Registration successful.",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "_id": "...",
    "email": "user@example.com",
    "role": "candidate",
    "profile": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**Status Codes:**
- 201: Success
- 400: Validation error
- 409: Email already registered

---

### POST /auth/login
Authenticate user credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful.",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {...}
}
```

**Status Codes:**
- 200: Success
- 400: Missing credentials
- 401: Invalid credentials

---

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "token": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

**Status Codes:**
- 200: Success
- 400: Missing refresh token
- 401: Invalid/expired token

---

### POST /auth/logout
Logout current user (invalidates refresh token).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Logged out successfully."
}
```

---

### GET /auth/me
Get current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "user": {
    "_id": "...",
    "email": "user@example.com",
    "role": "candidate",
    "profile": {...}
  }
}
```

---

## Jobs Endpoints

### GET /jobs
List jobs with optional filtering and pagination.

**Query Parameters:**
- `search`: Text search term
- `skills`: Comma-separated skills
- `location`: Location filter
- `status`: Job status filter
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "jobs": [
    {
      "_id": "...",
      "title": "Full Stack Developer",
      "description": "...",
      "requiredSkills": ["React", "Node.js"],
      "location": "Remote",
      "status": "open",
      "recruiterId": {...},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

### GET /jobs/:id
Get single job details.

**Response (200):**
```json
{
  "job": {
    "_id": "...",
    "title": "...",
    "description": "...",
    "requiredSkills": [...],
    "experienceMin": 2,
    "experienceMax": 5,
    "location": "...",
    "salaryRange": {"min": 80000, "max": 120000},
    "status": "open",
    "recruiterId": {...},
    "biasFlags": [],
    "applicantCount": 15
  }
}
```

**Status Codes:**
- 200: Success
- 404: Job not found

---

### POST /jobs
Create new job posting.

**Required Role:** recruiter, admin

**Request Body:**
```json
{
  "title": "Senior Developer",
  "description": "Job description...",
  "requiredSkills": ["Python", "Django"],
  "experienceMin": 3,
  "experienceMax": 7,
  "location": "New York",
  "salaryRange": {"min": 100000, "max": 150000}
}
```

**Response (201):**
```json
{
  "message": "Job created successfully.",
  "job": {...}
}
```

---

### PUT /jobs/:id
Update existing job.

**Required Role:** recruiter (own jobs), admin

**Response (200):**
```json
{
  "message": "Job updated.",
  "job": {...}
}
```

---

### DELETE /jobs/:id
Delete job posting.

**Required Role:** admin

**Response (200):**
```json
{
  "message": "Job deleted."
}
```

---

## Applications Endpoints

### POST /applications
Apply to a job posting.

**Required Role:** candidate

**Request Body:**
```json
{
  "jobId": "job-mongodb-id"
}
```

**Response (201):**
```json
{
  "message": "Application submitted.",
  "application": {
    "_id": "...",
    "candidateId": {...},
    "jobId": {...},
    "matchScore": 75,
    "scoreBreakdown": {
      "skills": 30,
      "experience": 25,
      "education": 20
    },
    "status": "applied"
  }
}
```

---

### GET /applications/me
Get candidate's own applications.

**Response (200):**
```json
{
  "applications": [
    {
      "_id": "...",
      "jobId": {...},
      "matchScore": 75,
      "status": "applied",
      "appliedAt": "..."
    }
  ]
}
```

---

### GET /applications/job/:jobId
Get all applications for a job.

**Required Role:** recruiter (own jobs), admin

**Query Parameters:**
- `sortBy`: Sort field (default: matchScore)
- `order`: asc/desc
- `status`: Filter by status
- `page`, `limit`: Pagination

**Response (200):**
```json
{
  "applications": [...],
  "pagination": {...}
}
```

---

### PATCH /applications/:id/status
Update application status.

**Required Role:** recruiter, admin

**Request Body:**
```json
{
  "status": "shortlisted"
}
```

**Valid Statuses:** applied, shortlisted, interview, hired, rejected

**Response (200):**
```json
{
  "message": "Status updated to \"shortlisted\".",
  "application": {...}
}
```

---

### PATCH /applications/:id/interview
Schedule interview for candidate.

**Request Body:**
```json
{
  "scheduledAt": "2024-01-15T10:00:00Z",
  "link": "https://zoom.us/j/...",
  "notes": "Technical interview round"
}
```

---

## Resume Endpoints

### POST /resume/upload
Upload and parse resume file.

**Required Role:** candidate

**Content-Type:** `multipart/form-data`

**Form Data:**
- `resume`: File (PDF or DOCX)

**Response (200):**
```json
{
  "message": "Resume uploaded and parsed.",
  "parsed": {
    "skills": ["Python", "JavaScript"],
    "experience": [...],
    "education": [...]
  },
  "user": {...}
}
```

---

### GET /resume/profile
Get candidate's parsed profile.

**Response (200):**
```json
{
  "profile": {
    "firstName": "...",
    "lastName": "...",
    "skills": [...],
    "education": [...],
    "experience": [...],
    "resumeUrl": "...",
    "parsedAt": "..."
  }
}
```

---

### PUT /resume/profile
Update parsed profile manually.

**Request Body:**
```json
{
  "skills": ["Python", "JavaScript"],
  "education": [...],
  "experience": [...],
  "phone": "+1-555-0100",
  "linkedIn": "linkedin.com/in/..."
}
```

---

## Admin Endpoints

### GET /admin/users
List all users with pagination.

**Required Role:** admin

**Query Parameters:**
- `role`: Filter by role
- `search`: Search email/name
- `page`, `limit`: Pagination

**Response (200):**
```json
{
  "users": [...],
  "pagination": {...}
}
```

---

### PATCH /admin/users/:id/role
Update user's role.

**Request Body:**
```json
{
  "role": "recruiter"
}
```

**Valid Roles:** candidate, recruiter, admin

---

### DELETE /admin/users/:id
Delete user account.

---

### GET /admin/analytics
Get system analytics dashboard.

**Response (200):**
```json
{
  "analytics": {
    "users": {
      "total": 500,
      "candidates": 400,
      "recruiters": 95
    },
    "jobs": {
      "total": 150,
      "open": 120
    },
    "applications": {
      "total": 1200,
      "lastWeek": 85,
      "byStatus": {
        "applied": 500,
        "shortlisted": 300,
        "interview": 200,
        "hired": 100,
        "rejected": 100
      }
    }
  }
}
```

---

## AI Service Endpoints

Base URL: `http://localhost:8000`

### POST /api/parse-resume
Parse resume file.

**Request Body:**
```json
{
  "file_path": "/path/to/resume.pdf",
  "file_type": "pdf"
}
```

### POST /api/detect-bias
Detect biased language in job description.

**Request Body:**
```json
{
  "job_description": "We're looking for a rockstar developer..."
}
```

**Response:**
```json
{
  "biasFlags": [
    {"term": "rockstar", "suggestion": "skilled professional", "severity": "high"}
  ],
  "biasCount": 1
}
```

### POST /api/score-candidate
Score candidate against job.

**Request Body:**
```json
{
  "candidate_profile": {...},
  "job_description": {...}
}
```

**Response:**
```json
{
  "matchScore": 75,
  "breakdown": {
    "skills": 30,
    "experience": 25,
    "education": 20
  }
}
```
