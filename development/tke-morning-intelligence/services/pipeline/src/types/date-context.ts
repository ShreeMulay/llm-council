import { z } from 'zod'

// ============================================
// Date and context types
// ============================================

export const DateInfoSchema = z.object({
  dayOfWeek: z.string(),
  dayOfMonth: z.number().int().min(1).max(31),
  month: z.number().int().min(1).max(12),
  monthName: z.string(),
  year: z.number().int().min(2024),
  formattedDate: z.string(),
  isoDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isWeekend: z.boolean(),
  isSunday: z.boolean(),
})

export const HolidayInfoSchema = z.object({
  todayHoliday: z.string().nullable(),
  healthcareEvent: z.string().nullable(),
  isPayday: z.boolean(),
  paydayNote: z.string(),
})

export const WeatherDataSchema = z.object({
  temp: z.number(),
  feels_like: z.number(),
  humidity: z.number(),
  description: z.string(),
  icon: z.string(),
}).nullable()

export const CalendarEventSchema = z.object({
  calendarName: z.string(),
  summary: z.string(),
  start: z.string().optional(),
  end: z.string().optional(),
  allDay: z.boolean().optional(),
})

export const NewsArticleSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  source: z.string(),
  publishedAt: z.string().optional(),
})

export const DailyContextSchema = z.object({
  dateInfo: DateInfoSchema,
  holidayInfo: HolidayInfoSchema,
  weather: WeatherDataSchema,
  calendarEvents: z.array(CalendarEventSchema),
  news: z.array(NewsArticleSchema),
  trending: z.array(z.string()).optional(),
})

export type DateInfo = z.infer<typeof DateInfoSchema>
export type HolidayInfo = z.infer<typeof HolidayInfoSchema>
export type WeatherData = z.infer<typeof WeatherDataSchema>
export type CalendarEvent = z.infer<typeof CalendarEventSchema>
export type NewsArticle = z.infer<typeof NewsArticleSchema>
export type DailyContext = z.infer<typeof DailyContextSchema>
