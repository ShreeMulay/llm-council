/**
 * Weather data source
 *
 * Fetches current weather for Jackson, TN from OpenWeatherMap.
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

/** Map OpenWeatherMap icon codes to emoji */
export const WEATHER_EMOJI: Record<string, string> = {
  '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
  '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
}
