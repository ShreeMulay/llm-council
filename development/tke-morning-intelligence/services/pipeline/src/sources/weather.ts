/**
 * Weather data source
 *
 * Fetches current weather and weekend forecast for Jackson, TN
 * from OpenWeatherMap.
 *
 * - Current weather: always fetched
 * - Weekend forecast: fetched on Fridays (Sat+Sun preview) and
 *   weekends (next-day preview)
 *
 * Jackson, TN coordinates: 35.6145, -88.814
 */

import type { WeatherData } from '../types'

const JACKSON_TN_LAT = 35.6145
const JACKSON_TN_LON = -88.814
const UNITS = 'imperial'

interface OpenWeatherResponse {
  main: {
    temp: number
    feels_like: number
    humidity: number
  }
  weather: Array<{
    description: string
    icon: string
  }>
}

interface ForecastItem {
  dt: number
  dt_txt: string
  main: { temp: number; feels_like: number; humidity: number }
  weather: Array<{ description: string; icon: string }>
}

interface OpenWeatherForecastResponse {
  list: ForecastItem[]
}

/** Simple daily forecast summary */
export interface DayForecast {
  dayName: string
  high: number
  low: number
  description: string
  icon: string
}

export async function fetchWeather(): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) {
    throw new Error('OPENWEATHERMAP_API_KEY not set')
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${JACKSON_TN_LAT}&lon=${JACKSON_TN_LON}&units=${UNITS}&appid=${apiKey}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Weather API returned ${response.status}: ${response.statusText}`)
  }

  const data = await response.json() as OpenWeatherResponse

  return {
    temp: Math.round(data.main.temp),
    feels_like: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    description: data.weather[0]?.description ?? 'unknown',
    icon: data.weather[0]?.icon ?? '01d',
  }
}

/**
 * Fetch weekend forecast (Sat + Sun) from OpenWeatherMap 5-day/3-hour forecast.
 * Aggregates 3-hour intervals into daily high/low + primary condition.
 */
export async function fetchWeekendForecast(): Promise<DayForecast[]> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) return []

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${JACKSON_TN_LAT}&lon=${JACKSON_TN_LON}&units=${UNITS}&appid=${apiKey}`
    const response = await fetch(url)
    if (!response.ok) return []

    const data = await response.json() as OpenWeatherForecastResponse

    // Find this week's Saturday and Sunday
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sun, 5=Fri, 6=Sat

    const targetDays: Date[] = []
    if (dayOfWeek === 5) {
      // Friday: show Sat + Sun
      const sat = new Date(now); sat.setDate(now.getDate() + 1)
      const sun = new Date(now); sun.setDate(now.getDate() + 2)
      targetDays.push(sat, sun)
    } else if (dayOfWeek === 6) {
      // Saturday: show today + Sunday
      const sun = new Date(now); sun.setDate(now.getDate() + 1)
      targetDays.push(now, sun)
    } else if (dayOfWeek === 0) {
      // Sunday: show today only
      targetDays.push(now)
    }

    if (targetDays.length === 0) return []

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const forecasts: DayForecast[] = []

    for (const targetDate of targetDays) {
      const dateStr = targetDate.toISOString().split('T')[0]!

      // Get all forecast intervals for this date
      const intervals = data.list.filter(item => item.dt_txt.startsWith(dateStr))
      if (intervals.length === 0) continue

      const temps = intervals.map(i => i.main.temp)
      // Pick the midday interval (12:00) for primary description, fallback to first
      const middayInterval = intervals.find(i => i.dt_txt.includes('12:00:00')) ?? intervals[0]!

      forecasts.push({
        dayName: dayNames[targetDate.getDay()]!,
        high: Math.round(Math.max(...temps)),
        low: Math.round(Math.min(...temps)),
        description: middayInterval.weather[0]?.description ?? 'unknown',
        icon: middayInterval.weather[0]?.icon ?? '01d',
      })
    }

    return forecasts
  } catch (err) {
    console.warn('[Weather] Forecast fetch failed:', err instanceof Error ? err.message : err)
    return []
  }
}

/** Map OpenWeatherMap icon codes to emoji */
export const WEATHER_EMOJI: Record<string, string> = {
  '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
  '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
}
