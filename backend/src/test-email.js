require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
  const testEmailAddress = process.env.TEST_EMAIL_TO || process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!testEmailAddress) {
    console.error('❌ Missing test recipient. Set TEST_EMAIL_TO (recommended) or EMAIL_FROM/SMTP_USER in .env');
    process.exit(1);
  }
  console.log(`🚀 Starting Email Test...`);
  console.log(`Destination: ${testEmailAddress}`);
  
  // Important check for SMTP configurations
  console.log(`\n⚙️ Environment Variable Check:`);
  console.log(`EMAIL_ENABLED: ${process.env.EMAIL_ENABLED}`);
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`SMTP_SECURE: ${process.env.SMTP_SECURE}`);
  console.log(`SMTP_USER: ${process.env.SMTP_USER ? '********' : 'Not Set'}`);
  console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '********' : 'Not Set'}`);
  console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM}`);
  
  if (process.env.EMAIL_ENABLED !== 'true') {
    console.log(`\n⚠️ WARNING: EMAIL_ENABLED is not 'true'. Emails will only be logged to the console via [EMAIL-CONSOLE] mock.`);
    console.log(`To actually send emails, add EMAIL_ENABLED=true to your .env file along with SMTP credentials.`);
  } else {
    console.log(`\n✅ EMAIL_ENABLED=true. The service will attempt connection to SMTP.`);
  }

  try {
    console.log('\n=============================================');
    console.log('💌 1. Testing Raw Custom Email');
    console.log('=============================================');
    const res1 = await emailService.sendEmail({
      to: testEmailAddress,
      subject: 'Test Email - SRRSS System',
      text: 'This is a raw text test from the SRRSS Backend.',
      html: '<p>This is a <b>HTML test</b> from the <i>SRRSS Backend</i>.</p>'
    });
    console.log(`Result: sent=${res1.sent}, messageId=${res1.messageId || null}, error=${res1.error || null}, reason=${res1.reason || null}`);

    console.log('\n=============================================');
    console.log('💌 2. Testing Application Received Template');
    console.log('=============================================');
    const res2 = await emailService.sendApplicationReceived({
      candidateEmail: testEmailAddress,
      candidateName: 'Love Shah',
      jobTitle: 'Senior Software Engineer'
    });
    console.log(`Result: sent=${res2.sent}, messageId=${res2.messageId || null}, error=${res2.error || null}, reason=${res2.reason || null}`);

    console.log('\n=============================================');
    console.log('💌 3. Testing Interview Scheduled Template');
    console.log('=============================================');
    const res3 = await emailService.sendInterviewScheduled({
      candidateEmail: testEmailAddress,
      candidateName: 'Love Shah',
      jobTitle: 'Senior Software Engineer',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tommorow
      link: 'https://meet.google.com/test-link',
      notes: 'Please review the technical test before the interview portion.'
    });
    console.log(`Result: sent=${res3.sent}, messageId=${res3.messageId || null}, error=${res3.error || null}, reason=${res3.reason || null}`);

    console.log('\n=============================================');
    console.log('💌 4. Testing Email Verification Template');
    console.log('=============================================');
    const res4 = await emailService.sendEmailVerification({
      to: testEmailAddress,
      firstName: 'Love',
      verificationUrl: 'http://localhost:5173/verify-email/abcdefg123456'
    });
    console.log(`Result: sent=${res4.sent}, messageId=${res4.messageId || null}, error=${res4.error || null}, reason=${res4.reason || null}`);


    console.log('\n🎉 Email testing script completed execution.');
    if (process.env.EMAIL_ENABLED === 'true') {
        console.log(`📥 Please check the inbox (and spam folder) of ${testEmailAddress}.`);
    } else {
        console.log(`📥 MOCK MODE ENDED. Check the console logs above for [EMAIL-CONSOLE] output.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Email Test failed with a critical error:', error);
    process.exit(1);
  }
}

testEmail();
