import { google } from 'googleapis'

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
  )
}

export function getAuthUrl(state: string) {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state,
  })
}

export function getCalendarClient(tokens: {
  access_token: string
  refresh_token: string
  expiry_date: number
}) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  })
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export interface CalendarEventData {
  summary: string
  description?: string
  location?: string
  start: string
  end: string
}

export async function createCalendarEvent(
  tokens: { access_token: string; refresh_token: string; expiry_date: number },
  calendarId: string,
  event: CalendarEventData
) {
  const calendar = getCalendarClient(tokens)
  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: event.end, timeZone: 'America/Sao_Paulo' },
    },
  })
  return res.data
}

export async function updateCalendarEvent(
  tokens: { access_token: string; refresh_token: string; expiry_date: number },
  calendarId: string,
  eventId: string,
  event: CalendarEventData
) {
  const calendar = getCalendarClient(tokens)
  const res = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: event.end, timeZone: 'America/Sao_Paulo' },
    },
  })
  return res.data
}

export async function deleteCalendarEvent(
  tokens: { access_token: string; refresh_token: string; expiry_date: number },
  calendarId: string,
  eventId: string
) {
  const calendar = getCalendarClient(tokens)
  await calendar.events.delete({ calendarId, eventId })
}
