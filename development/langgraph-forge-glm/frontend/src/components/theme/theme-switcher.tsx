import { Button } from '@/components/ui/button'
import { useThemeStore, type Theme } from '@/stores/theme-store'
import { Moon, Sun } from 'lucide-react'

const THEMES: Theme[] = [
  'light',
  'dark',
  'midnight',
  'forest',
  'ocean',
  'sunset',
  'high-contrast',
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore()

  const getNextTheme = (): Theme => {
    const currentIndex = THEMES.indexOf(theme)
    const nextIndex = (currentIndex + 1) % THEMES.length
    return THEMES[nextIndex]
  }

  const handleThemeChange = () => {
    setTheme(getNextTheme())
  }

  const isLight = theme === 'light'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleThemeChange}
      aria-label={`Change theme (current: ${theme})`}
      title={`Current theme: ${theme}`}
    >
      {isLight ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  )
}