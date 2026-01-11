import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { ThemeSwitcher } from './theme-switcher'
import { useThemeStore } from '@/stores/theme-store'
import type { useThemeStore as UseThemeStoreType } from '@/stores/theme-store'
import '@testing-library/jest-dom/vitest'

vi.mock('@/stores/theme-store', () => ({
  useThemeStore: vi.fn(),
}))

const mockUseThemeStore = useThemeStore as unknown as ReturnType<typeof vi.fn<UseThemeStoreType>>
const mockSetTheme = vi.fn()

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders theme button', () => {
    mockUseThemeStore.mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
    } as any)

    render(<ThemeSwitcher />)
    const button = screen.getByRole('button', { name: /theme/i })
    expect(button).toBeInTheDocument()
  })

  it('shows sun icon for light theme', () => {
    mockUseThemeStore.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
    } as any)

    render(<ThemeSwitcher />)
    const button = screen.getByRole('button')
    expect(button.querySelector('svg')?.querySelector('circle')).toBeInTheDocument()
  })

  it('shows moon icon for dark theme', () => {
    mockUseThemeStore.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
    } as any)

    render(<ThemeSwitcher />)
    const button = screen.getByRole('button')
    const path = button.querySelector('svg')?.querySelector('path')
    expect(path).toBeInTheDocument()
  })

  it('cycles through themes when clicked', () => {
    mockUseThemeStore.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
    } as any)

    render(<ThemeSwitcher />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })
})