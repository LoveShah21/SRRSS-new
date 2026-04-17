const { google } = require('googleapis');
const logger = require('../utils/logger');

/**
 * Google Calendar Integration Service
 *
 * Creates, updates, and cancels Google Calendar events for interviews.
 * Falls back to logging if credentials are not configured.
 *
 * Required env vars:
 *   CALENDAR_ENABLED=true
 *   GOOGLE_CLIENT_EMAIL=<service-account-email>
 *   GOOGLE_PRIVATE_KEY=<service-account-private-key-with-newlines>
 *   CALENDAR_ID=<calendar-id-or-primary>
 */

let calendar = null;

function getCalendar() {
  if (calendar) return calendar;

  if (process.env.CALENDAR_ENABLED !== 'true') {
    logger.info('Google Calendar integration is disabled (set CALENDAR_ENABLED=true).');
    return null;
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const calendarId = process.env.CALENDAR_ID || 'primary';

  if (!clientEmail || !privateKey) {
    logger.warn('Google Calendar credentials not configured — calendar sync will be skipped.');
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });

    calendar = google.calendar({ version: 'v3', auth });
    calendar._calendarId = calendarId;
    logger.info('Google Calendar client initialized.');
    return calendar;
  } catch (err) {
    logger.error('Failed to initialize Google Calendar', { error: err.message });
    return null;
  }
}

/**
 * Create a calendar event for an interview
 * @param {Object} params
 * @param {string} params.summary - Event title
 * @param {Date} params.start - Start time
 * @param {number} params.durationMinutes - Duration in minutes
 * @param {string} [params.description] - Event description
 * @param {string} [params.location] - Meeting link or physical location
 * @param {string} [params.candidateEmail] - Candidate email (attendee)
 * @param {string} [params.recruiterEmail] - Recruiter email (organizer)
 * @returns {Promise<string|null>} Event ID or null if not configured
 */
async function createEvent({ summary, start, durationMinutes, description, location, candidateEmail, recruiterEmail }) {
  const cal = getCalendar();
  if (!cal) return null;

  const end = new Date(start.getTime() + durationMinutes * 60000);

  const event = {
    summary,
    description: description || '',
    location: location || '',
    start: { dateTime: start.toISOString(), timeZone: 'UTC' },
    end: { dateTime: end.toISOString(), timeZone: 'UTC' },
    attendees: [],
    reminders: { useDefault: true },
  };

  if (candidateEmail) event.attendees.push({ email: candidateEmail });
  if (recruiterEmail) event.attendees.push({ email: recruiterEmail });

  try {
    // Conflict Detection: Check if the event overlaps with existing events in the calendar
    const freebusy = await cal.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: cal._calendarId }],
      },
    });

    const busySlots = freebusy.data.calendars[0].busy;
    if (busySlots && busySlots.length > 0) {
      logger.warn(`Calendar conflict detected for ${summary}. Slot is already taken.`);
      // Depending on business logic, we could return a conflict error or proceed
      // For this project, we'll log it and let the recruiter decide.
    }

    const res = await cal.events.insert({
      calendarId: cal._calendarId,
      resource: event,
      sendUpdates: 'all',
    });
    logger.info(`Calendar event created: ${res.data.id}`);
    return res.data.id;
  } catch (err) {
    logger.error('Failed to create calendar event', { error: err.message });
    return null;
  }
}

/**
 * Update an existing calendar event
 * @param {string} eventId - Google Calendar event ID
 * @param {Object} params - Same as createEvent
 * @returns {Promise<boolean>}
 */
async function updateEvent(eventId, { summary, start, durationMinutes, description, location, candidateEmail, recruiterEmail }) {
  const cal = getCalendar();
  if (!cal || !eventId) return false;

  const end = new Date(start.getTime() + durationMinutes * 60000);

  const event = {
    summary,
    description: description || '',
    location: location || '',
    start: { dateTime: start.toISOString(), timeZone: 'UTC' },
    end: { dateTime: end.toISOString(), timeZone: 'UTC' },
    attendees: [],
  };

  if (candidateEmail) event.attendees.push({ email: candidateEmail });
  if (recruiterEmail) event.attendees.push({ email: recruiterEmail });

  try {
    await cal.events.update({
      calendarId: cal._calendarId,
      eventId,
      resource: event,
      sendUpdates: 'all',
    });
    logger.info(`Calendar event updated: ${eventId}`);
    return true;
  } catch (err) {
    logger.error('Failed to update calendar event', { error: err.message });
    return false;
  }
}

/**
 * Cancel (delete) a calendar event
 * @param {string} eventId - Google Calendar event ID
 * @returns {Promise<boolean>}
 */
async function cancelEvent(eventId) {
  const cal = getCalendar();
  if (!cal || !eventId) return false;

  try {
    await cal.events.delete({
      calendarId: cal._calendarId,
      eventId,
      sendUpdates: 'all',
    });
    logger.info(`Calendar event cancelled: ${eventId}`);
    return true;
  } catch (err) {
    logger.error('Failed to cancel calendar event', { error: err.message });
    return false;
  }
}

module.exports = { createEvent, updateEvent, cancelEvent };
