# SRRSS User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [For Candidates](#for-candidates)
3. [For Recruiters](#for-recruiters)
4. [For Administrators](#for-administrators)
5. [FAQ](#faq)

---

## Getting Started

### Account Registration

1. Navigate to the application homepage
2. Click "Register" button
3. Fill in the registration form:
   - Email address
   - Password (minimum 8 characters)
   - First name
   - Last name
   - Role (Candidate or Recruiter)
4. Click "Create Account"
5. You will be automatically logged in

### Login

1. Navigate to the login page
2. Enter your email and password
3. Click "Login"
4. You will be redirected to your dashboard

---

## For Candidates

### Viewing Job Listings

1. **Browse Jobs**: Navigate to "Job Board" from the navigation menu
2. **Search**: Use the search bar to find jobs by keywords
3. **Filter**: Filter by:
   - Skills (e.g., Python, React, Node.js)
   - Location (Remote, NYC, etc.)
   - Status (Open positions)
4. **Pagination**: Navigate through pages using the pagination controls

### Applying to Jobs

1. Click on a job title to view details
2. Review job description, requirements, and company info
3. Click "Apply Now" button
4. Confirm your application
5. You will see a confirmation message
6. Track your application status in "My Applications"

### Uploading Resume

1. Go to "Profile" or "Resume" section
2. Click "Upload Resume"
3. Select PDF or DOCX file from your computer
4. Wait for AI parsing to complete
5. Review parsed information:
   - Skills extracted
   - Work experience
   - Education
6. Edit any incorrect information
7. Click "Save Profile"

### Tracking Applications

1. Navigate to "My Applications"
2. View all your applications
3. Check status for each application:
   - **Applied**: Submission received
   - **Shortlisted**: Under review
   - **Interview**: Interview scheduled
   - **Hired**: Position accepted
   - **Rejected**: Not selected
4. View interview details if scheduled
5. Click on job title to view job details

### Viewing Scheduled Interviews

1. Navigate to **"My Interviews"** from the navigation menu
2. View all upcoming interviews with:
   - Job title and interview type
   - Date, time, and duration
   - Meeting link (click to join)
   - Any preparation notes from the recruiter
3. When Google Calendar integration is enabled, interview events are automatically added to your calendar

### Profile Management

1. Go to "Profile" page
2. Update personal information:
   - Contact details (phone, LinkedIn)
   - Skills
   - Work experience
   - Education
3. Click "Save Changes"

---

## For Recruiters

### Posting Jobs

1. Navigate to "Post Job" or Dashboard
2. Fill in job details:
   - Job title
   - Job description
   - Required skills
   - Experience range (min-max years)
   - Location
   - Salary range
3. Review bias detection suggestions
4. Click "Post Job"
5. Job will appear in the job board

### Managing Job Postings

1. Go to "My Jobs" dashboard
2. View all your job postings
3. Filter by status (Open, Closed, Draft)
4. Actions available:
   - **Edit**: Update job details
   - **View Applications**: See candidate applications
   - **Close**: Stop accepting applications
   - **Delete**: Remove job posting (Admin only)

### Reviewing Applications

1. Click on a job to view applications
2. View candidate list sorted by match score
3. Filter by status
4. Sort by:
   - Match Score (default)
   - Application Date
   - Name
5. Click on candidate to view full profile

### Managing Candidate Status

1. Select an application
2. Update status:
   - **Shortlist**: Move to shortlist
   - **Interview**: Schedule interview
   - **Hire**: Make offer
   - **Reject**: Decline application
3. Add notes for internal tracking

### Scheduling Interviews

1. Navigate to **"Interviews"** in the top menu
2. Click **"+ Schedule Interview"**
3. Select a job posting from the dropdown
4. Choose a candidate (from shortlisted applications)
5. Fill in interview details:
   - **Date & Time**: When the interview takes place
   - **Duration**: Length in minutes (default: 60)
   - **Type**: Video, Phone, In-Person, Technical, or HR
   - **Meeting Link**: Zoom/Teams/Google Meet URL
   - **Notes**: Topics to discuss, preparation instructions
6. Click **"Schedule Interview"**
7. The system will:
   - Check for scheduling conflicts automatically
   - Update the application status to "Interview"
   - Send an email notification to the candidate
   - Create a Google Calendar event (if calendar integration is enabled)
   - Send calendar invitations to candidate and recruiter

> ⚠️ **Conflict Detection**: If the recruiter or candidate already has an interview at the selected time, the system will warn you.

### Managing Interviews

1. View all scheduled interviews on the **Interviews** page
2. Each interview card shows:
   - Candidate name and job title
   - Date/time and duration
   - Interview type and meeting link
   - Current status (scheduled, rescheduled, completed, cancelled)
3. Actions:
   - **Cancel**: Remove a scheduled interview
   - Update notes or reschedule via edit

### Candidate Search & Filter

1. Navigate to **"Candidates"** in the top menu
2. (Optional) Enable **Blind Screening** from recruiter settings to anonymize candidate identity during initial review
3. Use filters to find candidates:
   - **Job**: Filter by specific job posting
   - **Skills**: Enter skills (comma-separated)
   - **Min Score**: Set minimum match score threshold
   - **Status**: Filter by application status
   - **Search**: Find by candidate name or email
4. Click **"🔍 Search"** to apply filters
5. View candidate cards with:
   - Name, email, and skills
   - Match score (color-coded: green ≥70, amber ≥40, red <40)
   - Current application status
   - AI explanation highlights (matched/missing skills and experience note)

### Reports & Export

1. Navigate to **"Reports"** in the top menu
2. Select filters:
   - Job posting
   - Application status
3. Click **"📊 Generate Report"** to view:
   - Summary stats (total candidates, average score, hired/interview counts)
   - Detailed candidate table with match scores and breakdowns
4. Click **"📥 Download CSV"** to export data for Excel/Google Sheets

### Analytics Dashboard

1. Navigate to "Analytics" (Recruiter view)
2. View metrics:
   - Total applications per job
   - Average match scores
   - Status distribution
   - Application timeline

### Email Notifications

The system automatically sends email notifications to candidates when:
- Their application is received
- Their status changes (shortlisted, interview, hired, rejected)
- An interview is scheduled

> 📧 **Note**: Email delivery requires SMTP configuration. Without it, notifications are logged to the server console.

---

## For Administrators

### User Management

1. Navigate to "Admin Console"
2. View all users in the system
3. Search users by email or name
4. Filter by role
5. Actions:
   - **Change Role**: Update user role
   - **View Details**: See user information
   - **Delete User**: Remove user account

### Role Assignment

1. Click on user to manage
2. Select new role:
   - Candidate
   - Recruiter
   - Admin
3. Click "Update Role"
4. User permissions will be updated immediately

### System Analytics

1. Go to "Analytics" dashboard
2. View system-wide metrics:
   - Total users (candidates, recruiters, admins)
   - Total jobs (open, closed, draft)
   - Applications (total, by status, recent)
   - Growth trends

### Content Moderation

1. Review flagged job postings
2. Check bias reports
3. Take action on inappropriate content
4. Monitor user activity

### Audit Logs

1. Navigate to **"Audit Logs"** from the Admin menu
2. View a chronological record of all system actions:
   - Application status changes
   - Interview scheduling/cancellation
   - Job creation/updates
   - User role changes
3. Filter logs by:
   - **Action**: Type of action (e.g., "interview.schedule")
   - **Target Type**: Resource type (application, interview, job, user)
   - **Date Range**: Start and end dates
4. Each log entry shows:
   - Action name with icon
   - Who performed it (name and role)
   - Timestamp and IP address
   - Metadata (JSON details)

---

## FAQ

### General Questions

**Q: How do I reset my password?**
A: Currently, password reset requires admin assistance. Contact your administrator.

**Q: Can I have multiple roles?**
A: No, each user has one primary role. Admins can change your role if needed.

**Q: Is my resume visible to all recruiters?**
A: No, your resume is only visible to recruiters for jobs you apply to.

### Candidate Questions

**Q: How many jobs can I apply to?**
A: There is no limit on the number of applications.

**Q: Can I withdraw an application?**
A: Contact the recruiter or admin to withdraw an application.

**Q: What is match score?**
A: Match score (0-100) indicates how well your profile matches job requirements based on skills, experience, and education.

**Q: How do I update my resume?**
A: Upload a new resume file. The new file will replace the old one.

### Recruiter Questions

**Q: Can I edit a job after posting?**
A: Yes, you can edit your own job postings anytime.

**Q: Can I see all applications for my jobs?**
A: Yes, all applications for your jobs are visible in your dashboard.

**Q: How do I close a job?**
A: Edit the job and change status to "Closed" or "Draft".

**Q: Can other recruiters see my job postings?**
A: Job postings are visible to all users, but only you can manage your own jobs.

### Administrator Questions

**Q: How do I create a new admin?**
A: Use the database directly or API to create a user with admin role.

**Q: Can I bulk import users?**
A: Currently, users must be created individually through the UI or API.

**Q: How do I view system logs?**
A: Navigate to **Admin → Audit Logs** to see all system actions. For server-level logs, check the `logs/` directory on the backend or Docker logs.

**Q: How do I enable email notifications?**
A: Set `EMAIL_ENABLED=true` and configure `SMTP_*` variables in your backend `.env` file. Without this, notifications are logged to the console.

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Search | Ctrl+K |
| Refresh Page | F5 |
| Logout | Ctrl+Shift+L |

---

## Support

For technical support or questions:
- Email: support@srrss.com
- Documentation: See ARCHITECTURE.md, API_DOCS.md, DEPLOYMENT.md
- Issue Tracker: GitHub Issues
