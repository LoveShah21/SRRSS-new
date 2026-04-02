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

## Rate Limits
| Endpoint Group | Window | Max Requests |
|---|---|---|
| General `/api/*` | 15 min | 200 |
| Auth `/api/auth/*` | 15 min | 20 |
| Upload `/api/resume/upload` | 1 hour | 10 |

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

**Response (200):**
```json
{
  "jobs": [...],
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```

---

### GET /jobs/:id
Get single job details.

**Status Codes:** 200, 404

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

---

### DELETE /jobs/:id
Delete job posting.

**Required Role:** admin

---

## Applications Endpoints

### POST /applications
Apply to a job posting. Triggers AI candidate scoring and sends confirmation email.

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
    "matchScore": 75,
    "scoreBreakdown": { "skills": 30, "experience": 25, "education": 20 },
    "status": "applied"
  }
}
```

---

### GET /applications/me
Get candidate's own applications.

**Required Role:** candidate

---

### GET /applications/job/:jobId
Get all applications for a job.

**Required Role:** recruiter (own jobs), admin

**Query Parameters:** `sortBy`, `order`, `status`, `page`, `limit`

---

### PATCH /applications/:id/status
Update application status. Triggers email notification to candidate.

**Required Role:** recruiter, admin

**Request Body:**
```json
{
  "status": "shortlisted"
}
```

**Valid Statuses:** applied, shortlisted, interview, hired, rejected

---

### PATCH /applications/:id/interview
Schedule interview via legacy endpoint.

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
Upload and parse resume file. AI service auto-fills profile.

**Required Role:** candidate

**Content-Type:** `multipart/form-data`

**Form Data:** `resume` (PDF or DOCX, max 5MB)

**Response (200):**
```json
{
  "message": "Resume uploaded and parsed.",
  "parsed": { "skills": [...], "experience": [...], "education": [...] },
  "user": {...}
}
```

---

### GET /resume/profile
Get candidate's parsed profile.

**Required Role:** candidate

---

### PUT /resume/profile
Update parsed profile manually.

**Required Role:** candidate

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "skills": ["Python", "JavaScript"],
  "education": [...],
  "experience": [...],
  "phone": "+1-555-0100",
  "linkedIn": "linkedin.com/in/..."
}
```

---

### PATCH /resume/profile
Partial profile update (same fields as PUT).

**Required Role:** candidate

---

## Interviews Endpoints *(NEW)*

### POST /interviews
Schedule a new interview with conflict detection.

**Required Role:** recruiter, admin

**Request Body:**
```json
{
  "applicationId": "application-id",
  "scheduledAt": "2024-02-15T14:00:00Z",
  "duration": 60,
  "timezone": "America/New_York",
  "link": "https://zoom.us/j/123",
  "type": "video",
  "notes": "Technical round"
}
```

**Response (201):**
```json
{
  "message": "Interview scheduled.",
  "interview": {
    "_id": "...",
    "applicationId": "...",
    "candidateId": "...",
    "recruiterId": "...",
    "scheduledAt": "2024-02-15T14:00:00Z",
    "duration": 60,
    "type": "video",
    "status": "scheduled"
  }
}
```

**Status Codes:**
- 201: Success
- 400: Missing required fields
- 404: Application not found
- 409: Scheduling conflict detected

---

### GET /interviews
List interviews filtered by role.

**Query Parameters:** `status`, `jobId`, `page`, `limit`

**Access:**
- Candidates see their own interviews
- Recruiters see interviews they scheduled
- Admins see all

---

### GET /interviews/:id
Get single interview details.

---

### PATCH /interviews/:id
Update or reschedule interview.

**Required Role:** recruiter (own), admin

**Request Body:** Any of: `scheduledAt`, `duration`, `timezone`, `link`, `location`, `type`, `notes`, `status`, `feedback`

---

### DELETE /interviews/:id
Cancel interview (sets status to "cancelled").

**Required Role:** recruiter (own), admin

---

## Candidates Endpoints *(NEW)*

### GET /candidates
Recruiter candidate filter/search API.

**Required Role:** recruiter, admin

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `jobId` | string | Filter by specific job |
| `skills` | string | Comma-separated skills |
| `score_min` | number | Minimum match score |
| `status` | string | Application status filter |
| `search` | string | Search by name/email |
| `sortBy` | string | Sort field (default: matchScore) |
| `order` | string | asc/desc |
| `page` | number | Page number |
| `limit` | number | Items per page (default: 20) |

**Response (200):**
```json
{
  "candidates": [
    {
      "_id": "...",
      "email": "candidate@example.com",
      "profile": { "firstName": "Alice", "skills": [...] },
      "application": { "matchScore": 85, "status": "shortlisted" }
    }
  ],
  "pagination": {...}
}
```

---

## Reports Endpoints *(NEW)*

### GET /reports/candidates
Export candidate report data as JSON or CSV.

**Required Role:** recruiter, admin

**Query Parameters:**
- `jobId`: Filter by job
- `status`: Filter by application status
- `format`: `json` (default) or `csv`

**JSON Response (200):**
```json
{
  "report": [
    {
      "candidateName": "Alice Dev",
      "candidateEmail": "alice@example.com",
      "matchScore": 85,
      "skillsScore": 35,
      "experienceScore": 30,
      "educationScore": 20,
      "status": "interview",
      "appliedAt": "2024-01-10T..."
    }
  ],
  "summary": {
    "totalCandidates": 50,
    "averageScore": 68,
    "byStatus": { "applied": 20, "shortlisted": 15, "interview": 10, "hired": 5 }
  },
  "generatedAt": "..."
}
```

**CSV Response:** Downloads as `candidate_report_{timestamp}.csv`

---

### GET /reports/candidates/:id
Single candidate detailed report with application and interview history.

**Required Role:** recruiter, admin

---

### GET /reports/overview
System-wide overview report.

**Required Role:** admin

**Response (200):**
```json
{
  "overview": {
    "totalCandidates": 400,
    "totalJobs": 150,
    "totalApplications": 1200,
    "totalInterviews": 300,
    "applicationsByStatus": {...},
    "topJobs": [
      { "jobTitle": "...", "applicantCount": 45, "averageScore": 72 }
    ]
  }
}
```

---

## Audit Logs Endpoints *(NEW)*

### GET /audit-logs
List audit logs with filtering.

**Required Role:** admin

**Query Parameters:**
- `action`: Filter by action name (regex)
- `userId`: Filter by user
- `targetType`: user, job, application, interview, resume, system
- `startDate`, `endDate`: Date range
- `page`, `limit`: Pagination

---

### POST /audit-logs
Create manual audit log entry.

**Required Role:** admin

**Request Body:**
```json
{
  "action": "manual.action",
  "targetType": "system",
  "metadata": { "note": "Reason for manual entry" }
}
```

---

## Admin Endpoints

### GET /admin/users
List all users with pagination.

**Required Role:** admin

**Query Parameters:** `role`, `search`, `page`, `limit`

---

### PATCH /admin/users/:id/role
Update user's role.

**Required Role:** admin

**Valid Roles:** candidate, recruiter, admin

---

### DELETE /admin/users/:id
Delete user account.

**Required Role:** admin

---

### GET /admin/analytics
Get system analytics dashboard.

**Required Role:** admin

---

## Health Check

### GET /health
Returns system status.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 12345,
  "version": "1.0.0"
}
```

---

## AI Service Endpoints

Base URL: `http://localhost:8000`

### POST /api/parse-resume
Parse resume file and extract structured data.

### POST /api/detect-bias
Detect biased language in job description.

### POST /api/score-candidate
Score candidate profile against job requirements.

See separate AI service documentation for full request/response details.
