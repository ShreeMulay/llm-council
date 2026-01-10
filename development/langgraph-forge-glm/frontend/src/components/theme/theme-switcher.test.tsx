import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { ThemeSwitcher } from './theme-switcher'
import { useThemeStore } from '@/stores/theme-store'
import '@testing-library/jest-dom/vitest'

vi.mock('@/stores/theme-store', () => ({
  useThemeStore: vi.fn(),
}))

const mockSetTheme = vi.fn()

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders theme button', () => {
    vi.mocked(useThemeStore).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
    })

    render(<ThemeSwitcher />)
    const button = screen.getByRole('button', { name: /theme/i })
    expect(button).toBeInTheDocument()
  })

  it('shows sun icon for light theme', () => {
    vi.mocked(useThemeStore).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
    })

    render(<ThemeSwitcher />)
    const button = screen.getByRole('button')
    expect(button.querySelector('svg')?.querySelector('circle')).toBeInTheDocument()
  })

  it('shows moon icon for dark theme', () => {
    vi.mocked(useThemeStore).mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
    })

    render(<ThemeSwitcher />)
    const button = screen.getByRole('button')
    const path = button.querySelector('svg')?.querySelector('path')
    expect(path).toBeInTheDocument()
  })

  it('cycles through themes when clicked', () => {
    vi.mocked(useThemeStore).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
    })

    render(<ThemeSwitcher />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })
})