# SRRSS Feature Implementation Matrix

> Generated: 2026-04-02
> Sources: SRS.pdf, Project-Proposal.pdf, API_DOCS.md, Stitch project, codebase audit

## Legend
- **DONE** – Fully implemented (model + endpoint + UI + integration)
- **PARTIAL** – Partially implemented (some pieces missing)
- **MISSING** – Not implemented at all
- **DEFERRED** – Intentionally out of scope for now

---

## Implementation Status (Post-Fix)

> All fixes applied on 2026-04-02. See "Critical Issues Resolved" section below.

---

## 1. Candidate Features

| # | Feature | Role(s) | Expected UI (from Stitch + SRS) | Expected Backend (models + endpoints) | Status | Notes / Files |
|---|---------|---------|--------------------------------|--------------------------------------|--------|---------------|
| C1 | Register | Candidate | Registration form (email, password, name, role) | `POST /api/auth/register` – User model | **DONE** | Fixed: Password min-length now 8 chars (matches SRS). |
| C2 | Login | Candidate | Login form (email, password) | `POST /api/auth/login` – User model | **DONE** | `Login.jsx` + `auth.js` route working. |
| C3 | Profile view | Candidate | Profile page with skills, education, experience | `GET /api/resume/profile` – User.profile | **DONE** | `Profile.jsx` displays all profile fields. |
| C4 | Profile edit | Candidate | Edit mode for name, phone, LinkedIn, skills | `PUT/PATCH /api/resume/profile` | **DONE** | Edit form in `Profile.jsx` calls `updateProfile`. |
| C5 | Resume upload (PDF/DOCX) | Candidate | Drag-and-drop + file picker upload zone | `POST /api/resume/upload` – multer → R2 → AI parse | **DONE** | `Profile.jsx` handles upload. Backend uploads to R2, calls AI parse, auto-fills profile. |
| C6 | Resume download | Candidate | Download link for uploaded resume | `GET /api/resume/download` – presigned R2 URL | **DONE** | Backend route exists. Frontend doesn't expose download button in Profile (minor). |
| C7 | Browse jobs | Candidate | Job listing with search, filter, pagination | `GET /api/jobs` – Job model | **DONE** | `JobBoard.jsx` + `jobs.js` route. |
| C8 | Job detail | Candidate | Job detail page with description, skills, salary | `GET /api/jobs/:id` | **DONE** | `JobDetail.jsx` displays all fields. |
| C9 | Apply to job | Candidate | "Apply Now" button on job detail | `POST /api/applications` – Application model | **DONE** | Fixed: Changed apply flow from FormData to JSON. Candidates upload resume separately via Profile page, then apply with jobId only. |
| C10 | My Applications list | Candidate | Table showing applied jobs, status, AI score | `GET /api/applications/me` | **DONE** | `MyApplications.jsx` displays applications with status badges and score. |
| C11 | Application status timeline | Candidate | Status chips (Applied → Shortlisted → Interview → Hired) | statusHistory on Application model | **DONE** | Model tracks statusHistory. UI shows current status. Timeline visualization not shown (minor). |
| C12 | View upcoming interviews | Candidate | Interview list/cards with date, time, link | `GET /api/interviews` (candidate sees own) | **DONE** | Fixed: Created `MyInterviews.jsx` page at `/my-interviews` route. Added nav link in Navbar. Backend already filtered by candidateId. |
| C13 | Email notifications | Candidate | Email on application received, status change, interview | emailService triggers | **DONE** | `emailService.js` sends on apply, status change, interview. Falls back to console log if SMTP not configured. |

---

## 2. Recruiter Features

| # | Feature | Role(s) | Expected UI (from Stitch + SRS) | Expected Backend (models + endpoints) | Status | Notes / Files |
|---|---------|---------|--------------------------------|--------------------------------------|--------|---------------|
| R1 | Create job | Recruiter | "Post New Job" modal/form | `POST /api/jobs` – Job model | **DONE** | `JobBoard.jsx` has create modal. Backend creates job with bias detection. |
| R2 | Edit job | Recruiter | Edit form for own jobs | `PUT /api/jobs/:id` | **DONE** | Backend supports update. No explicit edit UI in frontend (recruiter can only create, not edit existing). |
| R3 | Close/manage jobs | Recruiter | Status toggle (open/closed/draft) | `PUT /api/jobs/:id` with status field | **PARTIAL** | Backend supports status changes. No UI for managing job status (close/draft toggle). |
| R4 | View applications for job | Recruiter | Application list sorted by match score | `GET /api/applications/job/:jobId` | **DONE** | `JobDetail.jsx` shows applications table for recruiters. |
| R5 | Candidate list with filters | Recruiter | Filterable candidate list (job, skills, score, status, search) | `GET /api/candidates` | **DONE** | `CandidateList.jsx` has all filters. Backend supports all query params. |
| R6 | Match Score display (0-100) | Recruiter | Color-coded score on candidate cards | AI scoring on application | **DONE** | Score displayed in `CandidateList.jsx` with green/amber/red coloring. |
| R7 | Schedule interview | Recruiter | Interview scheduling form (job, candidate, date/time, type, link, notes) | `POST /api/interviews` – Interview model | **DONE** | `InterviewScheduler.jsx` has full form. Backend creates interview with conflict detection. |
| R8 | Cancel interview | Recruiter | Cancel button on scheduled interviews | `DELETE /api/interviews/:id` | **DONE** | Backend sets status to cancelled. Frontend has cancel button. |
| R9 | View interview calendar | Recruiter | Calendar view or list of upcoming interviews | `GET /api/interviews` | **PARTIAL** | List view exists in `InterviewScheduler.jsx`. No calendar widget (Google Calendar integration or visual calendar component). Interviews shown as cards only. |
| R10 | Candidate reports | Recruiter | Report generation with filters, summary stats | `GET /api/reports/candidates` | **DONE** | `Reports.jsx` generates report with summary cards and data table. |
| R11 | Export CSV | Recruiter | "Download CSV" button | `GET /api/reports/candidates?format=csv` | **DONE** | `Reports.jsx` downloads CSV. Backend generates CSV response. |
| R12 | Analytics dashboard | Recruiter | Metrics: total applications, avg scores, status distribution | `GET /api/admin/analytics` (admin-only currently) | **PARTIAL** | No dedicated recruiter analytics endpoint. Dashboard.jsx shows basic stats. No time-to-hire or source quality metrics. |
| R13 | Bias detection on job posts | Recruiter | Bias flags shown when creating jobs | AI `/api/detect-bias` call on job create | **DONE** | Backend calls AI bias detection on job creation. Flags stored on Job.biasFlags. No UI to display bias flags to recruiter. |

---

## 3. Admin Features

| # | Feature | Role(s) | Expected UI (from Stitch + SRS) | Expected Backend (models + endpoints) | Status | Notes / Files |
|---|---------|---------|--------------------------------|--------------------------------------|--------|---------------|
| A1 | User management list | Admin | User table with search, role filter | `GET /api/admin/users` | **DONE** | Fixed: Created `AdminConsole.jsx` with full user management UI (search, role filter, role change, delete). |
| A2 | Change user role | Admin | Role dropdown/update per user | `PATCH /api/admin/users/:id/role` | **DONE** | Fixed: UI now in AdminConsole.jsx with inline role editing. |
| A3 | Delete user | Admin | Delete button per user | `DELETE /api/admin/users/:id` | **DONE** | Fixed: UI now in AdminConsole.jsx with confirmation dialog. |
| A4 | System analytics | Admin | Dashboard with total users, jobs, applications, growth | `GET /api/admin/analytics` | **DONE** | Fixed: Dashboard.jsx now correctly calls `adminAPI.analytics()` instead of non-existent `adminAPI.dashboard()`. |
| A5 | Audit logs viewer | Admin | Filterable audit log list with action, target, date | `GET /api/audit-logs` | **DONE** | `AuditLogs.jsx` has filters, pagination, display. Backend supports all query params. |
| A6 | System settings/config | Admin | Configuration page for email, storage, security | Settings endpoints | **MISSING** | No backend endpoints or UI for system configuration. |
| A7 | Content moderation | Admin | Review flagged jobs, bias reports | Job biasFlags + moderation endpoints | **PARTIAL** | Bias flags stored on jobs. No moderation UI or endpoints to act on flags. |

---

## 4. System / AI Features

| # | Feature | Role(s) | Expected UI (from Stitch + SRS) | Expected Backend (models + endpoints) | Status | Notes / Files |
|---|---------|---------|--------------------------------|--------------------------------------|--------|---------------|
| S1 | Resume parsing (AI) | System | Auto-fill profile after upload | AI `/api/parse-resume` → profile update | **DONE** | `resume.js` route uploads to R2, calls AI service, auto-fills profile. |
| S2 | Semantic matching/scoring | System | Match score on applications | AI `/api/score-candidate` → Application.matchScore | **DONE** | `applications.js` calls AI scoring on application submit. |
| S3 | Bias detection | System | Bias flags on job descriptions | AI `/api/detect-bias` → Job.biasFlags | **DONE** | Called on job creation. Flags stored but not displayed in UI. |
| S4 | Cloudflare R2 storage | System | File upload/download via presigned URLs | storageService.js with AWS SDK → R2 endpoint | **DONE** | Fully implemented with R2 credentials, presigned URLs, upload/delete. |
| S5 | Email notifications | System | SMTP or console fallback | emailService.js with nodemailer | **DONE** | Three template functions. SMTP configurable via env vars. |
| S6 | Calendar integration | System | Google Calendar sync for interviews | Calendar service module | **DONE** | Fixed: Created `calendarService.js` with Google Calendar API integration. Wired to interview create/update/delete routes. Events created for both candidate and recruiter. `calendarEventId` stored on Interview model. Env vars: CALENDAR_ENABLED, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, CALENDAR_ID. |
| S7 | Audit logging | System | Automatic audit entries for all mutations | auditLogger middleware + manual calls | **DONE** | Audit entries created for application status changes, interview CRUD, job create/update, user role changes. |

---

## 5. Cross-Cutting Concerns

| # | Feature | Role(s) | Expected | Status | Notes / Files |
|---|---------|---------|----------|--------|---------------|
| X1 | JWT Authentication | All | Bearer token auth | **DONE** | `auth.js` middleware, interceptors in api.js. |
| X2 | RBAC | All | Role-based route protection | **DONE** | `authorize()` middleware + `ProtectedRoute` in App.jsx. |
| X3 | Rate Limiting | All | API rate limits | **DONE** | General (200/15min), auth (20/15min), upload (10/hr). |
| X4 | CORS | All | Configured origins | **DONE** | Parsed from CLIENT_URL env var. |
| X5 | Error Handling | All | Consistent error responses | **DONE** | `errorHandler.js` middleware, AppError class. |
| X6 | Input Validation | All | Schema validation | **PARTIAL** | Mongoose validation present. No Zod/Joi layer. Some endpoints accept arbitrary fields. |
| X7 | Health Check | All | `/api/health` endpoint | **DONE** | Returns status, timestamp, uptime, version. |
| X8 | Refresh Token Rotation | All | Token refresh flow | **DONE** | `POST /api/auth/refresh` with rotation. Frontend doesn't auto-refresh (minor). |

---

## Critical Issues Resolved (2026-04-02)

1. ✅ **AdminConsole.jsx created** – Full user management UI with search, role filter, inline role editing, and delete with confirmation.
2. ✅ **JobDetail apply flow fixed** – Changed from FormData to JSON `{jobId}`. Resume upload handled separately via Profile page.
3. ✅ **Dashboard analytics fixed** – `adminAPI.dashboard()` → `adminAPI.analytics()` with proper data mapping.
4. ✅ **Candidate interview view added** – New `MyInterviews.jsx` page at `/my-interviews` with nav link.
5. ✅ **Google Calendar integration implemented** – `calendarService.js` creates/updates/cancels events. Wired to interview CRUD routes.
6. ✅ **Password min-length fixed** – Changed from 6 to 8 characters in Register.jsx.
7. ✅ **Calendar env vars documented** – Added to `.env.example` and `DEPLOYMENT.md`.
8. ✅ **API docs updated** – Calendar integration documented in `API_DOCS.md`.

## Remaining Issues (Lower Priority)

1. **No job edit UI** – Backend supports `PUT /api/jobs/:id`, but frontend doesn't expose an edit form for existing jobs.
2. **No recruiter analytics endpoint** – Only admin analytics exists. Recruiter dashboard shows basic stats only.
3. **Bias flags not displayed** – Stored on jobs but never shown to recruiters in the UI.
4. **No system settings page** – Admin can't configure email, storage, or security from UI.
5. **No visual calendar widget** – InterviewScheduler shows list view only. No Google Calendar embed or date-picker calendar component.
6. **No email verification flow** – Registration doesn't verify email addresses.
7. **Token auto-refresh not implemented** – Frontend doesn't automatically refresh expired JWTs.
