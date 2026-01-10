import { describe, it, expect, beforeEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { CodeEditor } from './code-editor'
import '@testing-library/jest-dom/vitest'

vi.mock('@/stores/theme-store', () => ({
  useThemeStore: () => ({ theme: 'dark' }),
}))

vi.mock('@monaco-editor/react', () => ({
  Editor: ({ value, onChange, language, theme, height, options, readOnly }: any) => (
    <textarea
      data-testid="monaco-editor"
      data-value={value}
      data-language={language}
      data-theme={theme}
      data-height={height}
      data-options={(options as any)?.minimap?.enabled ? 'true' : 'false'}
      data-readonly={readOnly ? 'true' : 'false'}
      style={{ height }}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (onChange) {
          onChange(e.target.value)
        }
      }}
    >
      {value}
    </textarea>
  ),
}))

describe('CodeEditor', () => {
  beforeEach(() => {
    cleanup()
  })

  it('renders code', () => {
    render(<CodeEditor code="def hello():\n    return 'world'" onChange={vi.fn()} />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toHaveAttribute('data-value')
    expect(editor).toHaveTextContent(/def hello/)
    expect(editor).toHaveAttribute('data-language', 'python')
  })

  it('applies syntax highlighting for python', () => {
    render(<CodeEditor code="x = 1" onChange={vi.fn()} language="python" />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toHaveAttribute('data-language', 'python')
  })

  it('applies syntax highlighting for javascript', () => {
    render(<CodeEditor code="const x = 1" onChange={vi.fn()} language="javascript" />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toHaveAttribute('data-language', 'javascript')
  })

  it('calls onChange callback when code changes', () => {
    const handleChange = vi.fn()
    render(<CodeEditor code="" onChange={handleChange} />)

    const editor = screen.getByTestId('monaco-editor')
    fireEvent.change(editor, { target: { value: 'new code' } })

    expect(handleChange).toHaveBeenCalledWith('new code')
  })

  it('disables minimap by default', () => {
    render(<CodeEditor code="" onChange={vi.fn()} />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toHaveAttribute('data-options', 'false')
  })

  it('supports custom height', () => {
    render(<CodeEditor code="" onChange={vi.fn()} height="600px" />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toHaveAttribute('data-height', '600px')
  })

  it('maps application theme to Monaco theme', () => {
    render(<CodeEditor code="" onChange={vi.fn()} />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toHaveAttribute('data-theme', 'vs-dark')
  })
})