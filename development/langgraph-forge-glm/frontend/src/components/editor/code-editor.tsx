import { Editor } from '@monaco-editor/react'
import { useThemeStore } from '@/stores/theme-store'

interface CodeEditorProps {
  code: string
  onChange: (value: string) => void
  language?: 'python' | 'javascript' | 'typescript' | 'json'
  height?: string
  readOnly?: boolean
}

export function CodeEditor({
  code,
  onChange,
  language = 'python',
  height = '500px',
  readOnly = false,
}: CodeEditorProps) {
  const { theme } = useThemeStore()

  // Map our theme names to Monaco themes
  const getMonacoTheme = (themeName: string): string => {
    switch (themeName) {
      case 'light':
        return 'vs-light'
      case 'dark':
      case 'midnight':
      case 'forest':
      case 'ocean':
      case 'sunset':
      case 'high-contrast':
        return 'vs-dark'
      default:
        return 'vs-dark'
    }
  }

  return (
    <div className="relative w-full rounded-lg border border-border overflow-hidden">
      <Editor
        height={height}
        language={language}
        theme={getMonacoTheme(theme)}
        value={code}
        onChange={(value) => onChange(value ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          readOnly,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  )
}