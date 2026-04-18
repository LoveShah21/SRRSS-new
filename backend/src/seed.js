require('dotenv').config();
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');

const User = require('./models/User');
const Job = require('./models/Job');
const Application = require('./models/Application');
const Interview = require('./models/Interview');
const AuditLog = require('./models/AuditLog');

// Configuration Constants
const SEED_CONFIG = {
  numRecruiters: 5,
  numCandidates: 100,
  numJobs: 30,
  numApplications: 300,
  stdPassword: 'Password123!',
};

// Skill pools
const TECH_SKILLS = ['JavaScript', 'Python', 'React.js', 'Node.js', 'Java', 'C++', 'AWS', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL', 'TypeScript', 'Machine Learning', 'Data Science', 'Go', 'Rust', 'Ruby on Rails', 'PHP', 'HTML', 'CSS'];
const DEGREES = ['B.Sc. Computer Science', 'M.Sc. Data Science', 'B.E. Information Technology', 'B.Tech Software Engineering'];
const ROLES = ['Software Engineer', 'Data Scientist', 'Frontend Developer', 'Backend Developer', 'DevOps Engineer', 'Product Manager', 'UX Designer'];

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/srrss');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Clean existing database collections
 */
const wipeDB = async () => {
  console.log('Wiping existing data from collections...');
  await User.deleteMany({});
  await Job.deleteMany({});
  await Application.deleteMany({});
  await Interview.deleteMany({});
  await AuditLog.deleteMany({});
  console.log('Database wiped successfully.');
};

/**
 * Helper: Randomly pick N elements from an array
 */
const getRandomElements = (arr, num) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
};

const seedDatabase = async () => {
  await connectDB();
  await wipeDB();

  console.log('Starting granular data seeding process...');
  const users = [];
  const recruiters = [];
  const candidates = [];
  const jobs = [];

  try {
    // ============================================
    // 1. Create Base/Static Users for Easy Login
    // ============================================
    console.log('Creating standard static users...');
    const adminUser = await User.create({
      email: 'admin@srrss.com',
      passwordHash: SEED_CONFIG.stdPassword,
      role: 'admin',
      isEmailVerified: true,
      profile: { firstName: 'System', lastName: 'Admin', skills: [], education: [], experience: [], projects: [] }
    });
    users.push(adminUser);

    const stdRecruiter = await User.create({
      email: 'recruiter@srrss.com',
      passwordHash: SEED_CONFIG.stdPassword,
      role: 'recruiter',
      isEmailVerified: true,
      profile: { firstName: 'Rachel', lastName: 'Recruit', skills: [], education: [], experience: [], projects: [] },
      settings: { recruiter: { blindScreeningEnabled: true } }
    });
    users.push(stdRecruiter);
    recruiters.push(stdRecruiter);

    const stdCandidate = await User.create({
      email: 'candidate@srrss.com',
      passwordHash: SEED_CONFIG.stdPassword,
      role: 'candidate',
      isEmailVerified: true,
      profile: {
        firstName: 'Charlie',
        lastName: 'Candidate',
        phone: faker.phone.number(),
        linkedIn: 'https://linkedin.com/in/charliecandidate',
        skills: ['JavaScript', 'React.js', 'Node.js', 'MongoDB'],
        education: [{ degree: 'B.Sc. Computer Science', institution: 'State University', year: 2020 }],
        experience: [{ title: 'Full Stack Dev', company: 'Tech Corp', years: 2, description: 'Built things.' }],
        projects: [{ name: 'Resume Screener UI', techStack: ['React', 'Tailwind'], description: 'Frontend part' }],
        resumeUrl: 'dummy_url'
      }
    });
    users.push(stdCandidate);
    candidates.push(stdCandidate);

    // ============================================
    // 2. Generate Random Recruiters
    // ============================================
    for (let i = 0; i < SEED_CONFIG.numRecruiters; i++) {
      const rec = await User.create({
        email: faker.internet.email().toLowerCase(),
        passwordHash: SEED_CONFIG.stdPassword,
        role: 'recruiter',
        isEmailVerified: true,
        profile: {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
        },
        settings: { recruiter: { blindScreeningEnabled: faker.datatype.boolean() } }
      });
      users.push(rec);
      recruiters.push(rec);
    }
    console.log(`Created ${recruiters.length} recruiters.`);

    // ============================================
    // 3. Generate Random Candidates
    // ============================================
    for (let i = 0; i < SEED_CONFIG.numCandidates; i++) {
      const cand = await User.create({
        email: faker.internet.email().toLowerCase(),
        passwordHash: SEED_CONFIG.stdPassword,
        role: 'candidate',
        isEmailVerified: faker.datatype.boolean(0.9), // 90% verified
        profile: {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: faker.phone.number(),
          linkedIn: `https://linkedin.com/in/${faker.internet.username()}`,
          skills: getRandomElements(TECH_SKILLS, faker.number.int({ min: 3, max: 7 })),
          education: [{ 
            degree: faker.helpers.arrayElement(DEGREES), 
            institution: faker.company.name() + ' University', 
            year: faker.number.int({ min: 2012, max: 2024 }) 
          }],
          experience: [{ 
            title: faker.person.jobTitle(), 
            company: faker.company.name(), 
            years: faker.number.int({ min: 1, max: 10 }), 
            description: faker.lorem.sentences(2) 
          }],
        }
      });
      users.push(cand);
      candidates.push(cand);
    }
    console.log(`Created ${candidates.length} candidates.`);

    // ============================================
    // 4. Generate Random Jobs
    // ============================================
    for (let i = 0; i < SEED_CONFIG.numJobs; i++) {
       const minExp = faker.number.int({ min: 0, max: 5 });
       const job = await Job.create({
         title: faker.helpers.arrayElement(ROLES),
         description: faker.lorem.paragraphs(3),
         requiredSkills: getRandomElements(TECH_SKILLS, faker.number.int({ min: 3, max: 6 })),
         experienceMin: minExp,
         experienceMax: minExp + faker.number.int({ min: 2, max: 5 }),
         location: faker.location.city() + ', ' + (faker.location.state ? faker.location.state({ abbreviated: true }) : faker.location.stateAbbr ? faker.location.stateAbbr() : faker.address.stateAbbr()),
         salaryRange: { min: faker.number.int({ min: 50, max: 100 }) * 1000, max: faker.number.int({ min: 110, max: 180 }) * 1000 },
         status: faker.helpers.arrayElement(['open', 'open', 'open', 'closed', 'draft']), // Mostly open
         recruiterId: faker.helpers.arrayElement(recruiters)._id,
         biasFlags: [],
         applicantCount: 0
       });
       jobs.push(job);
    }
    console.log(`Created ${jobs.length} jobs.`);

    // ============================================
    // 5. Generate Applications (linking jobs & candidates)
    // ============================================
    const applicationMap = new Set();
    const insertedApplications = [];
    
    // Assign applicant count iteratively to track correctly
    const jobApplicantCounts = {};
    jobs.forEach(j => jobApplicantCounts[j._id] = 0);

    for (let i = 0; i < SEED_CONFIG.numApplications; i++) {
        const candidate = faker.helpers.arrayElement(candidates);
        const job = faker.helpers.arrayElement(jobs);
        
        const compositeKey = `${candidate._id}-${job._id}`;
        if (applicationMap.has(compositeKey)) continue; // avoid schema duplicate violations
        applicationMap.add(compositeKey);

        const status = faker.helpers.arrayElement(['applied', 'applied', 'shortlisted', 'interview', 'rejected']);
        
        const matchScore = faker.number.int({ min: 20, max: 99 });
        
        const application = await Application.create({
            candidateId: candidate._id,
            jobId: job._id,
            matchScore: matchScore,
            scoreBreakdown: { 
              skills: faker.number.int({ min: 10, max: 40 }), 
              experience: faker.number.int({ min: 10, max: 40 }), 
              education: faker.number.int({ min: 0, max: 20 }) 
            },
            aiExplanation: {
              matchedSkills: getRandomElements(job.requiredSkills, faker.number.int({ min: 1, max: job.requiredSkills.length })),
              missingSkills: [],
              experienceNote: faker.lorem.sentence()
            },
            status: status,
            statusHistory: [{ status: 'applied', changedAt: faker.date.recent({ days: 30 }) }],
            isIdentityRevealed: false
        });

        if (status !== 'applied') {
            application.statusHistory.push({ status: status, changedAt: faker.date.recent({ days: 10 }) });
            await application.save();
        }

        insertedApplications.push(application);
        jobApplicantCounts[job._id]++;
    }

    // Update job applicant counts in bulk
    for (const job of jobs) {
       await Job.findByIdAndUpdate(job._id, { applicantCount: jobApplicantCounts[job._id] });
    }
    console.log(`Created ${insertedApplications.length} valid applications.`);

    // ============================================
    // 6. Generate Interviews for 'interview' status applications
    // ============================================
    const interviewApps = insertedApplications.filter(a => a.status === 'interview');
    let interviewCount = 0;

    for (const app of interviewApps) {
      // Find the job to get the recruiter
      const jobOfApp = jobs.find(j => String(j._id) === String(app.jobId));

      await Interview.create({
        applicationId: app._id,
        jobId: app.jobId,
        candidateId: app.candidateId,
        recruiterId: jobOfApp.recruiterId,
        scheduledAt: faker.date.soon({ days: 14 }),
        duration: faker.helpers.arrayElement([30, 45, 60]),
        link: 'https://meet.google.com/xyz-abcd-efg',
        type: faker.helpers.arrayElement(['video', 'technical', 'hr']),
        status: faker.helpers.arrayElement(['scheduled', 'scheduled', 'completed']),
        createdBy: jobOfApp.recruiterId
      });
      interviewCount++;
    }
    console.log(`Created ${interviewCount} interviews.`);

    // ============================================
    // 7. Dummy Audit Logs for system activity
    // ============================================
    for (let i = 0; i < 50; i++) {
        const u = faker.helpers.arrayElement(users);
        await AuditLog.create({
            action: faker.helpers.arrayElement(['login', 'view_job', 'update_profile']),
            userId: u._id,
            userRole: u.role,
            targetType: 'system',
            ipAddress: faker.internet.ipv4(),
            userAgent: faker.internet.userAgent()
        });
    }
    console.log(`Created 50 dummy audit logs.`);


    console.log('\n✅ Data Seeding Completed Successfully!');
    console.log('----------------------------------------------------');
    console.log('Test Accounts Information:');
    console.log(`Admin User:      admin@srrss.com      / ${SEED_CONFIG.stdPassword}`);
    console.log(`Recruiter User:  recruiter@srrss.com  / ${SEED_CONFIG.stdPassword}`);
    console.log(`Candidate User:  candidate@srrss.com  / ${SEED_CONFIG.stdPassword}`);
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDatabase();
