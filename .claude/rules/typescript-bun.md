# TypeScript + Bun + Shadcn Conventions

## Runtime: Bun First

Use Bun instead of Node.js for everything:

```bash
bun install           # Not npm/yarn/pnpm
bun test              # Not jest/vitest
bun run <script>      # Not npm run
bun build             # Built-in bundler
bun --hot server.ts   # Hot reload
```

### Bun Built-in APIs (Prefer Over npm Packages)

| Use This | Not This | Notes |
|----------|----------|-------|
| `Bun.serve()` | express, fastify | Full HTTP server with routing |
| `bun:sqlite` | better-sqlite3 | Synchronous SQLite |
| `Bun.redis` | ioredis | Redis client |
| `Bun.sql` | pg, postgres.js | PostgreSQL client |
| `Bun.file()` | node:fs | File operations |
| `Bun.$\`cmd\`` | execa | Shell commands |
| `WebSocket` | ws | Built-in WebSocket |
| `Bun.password` | bcrypt | Password hashing |
| `Bun.CryptoHasher` | crypto | Hashing |

Bun auto-loads `.env` files - no dotenv needed.

---

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Type Conventions

```typescript
// Prefer interfaces over types
interface User {
  id: string
  name: string
  email: string
}

// Use type for unions, intersections, and utilities
type UserRole = 'admin' | 'user' | 'guest'
type UserWithRole = User & { role: UserRole }

// Avoid enums - use const objects
const Status = {
  Pending: 'pending',
  Active: 'active',
  Inactive: 'inactive',
} as const
type Status = typeof Status[keyof typeof Status]

// Function declarations for components
export function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>
}
```

---

## React 19 + Server Components

### Prefer Server Components

```typescript
// Server Component (default) - no directive needed
export async function UserList() {
  const users = await db.users.findMany()
  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  )
}

// Client Component - only when needed
'use client'
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### When to Use 'use client'

- Interactive elements (onClick, onChange, etc.)
- React hooks (useState, useEffect, useContext)
- Browser APIs (window, localStorage)
- Third-party client libraries

### Server Actions

```typescript
// actions.ts
'use server'

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string
  const user = await db.users.create({ data: { name } })
  revalidatePath('/users')
  return user
}

// Component
export function CreateUserForm() {
  return (
    <form action={createUser}>
      <input name="name" />
      <button type="submit">Create</button>
    </form>
  )
}
```

---

## Shadcn/ui v4

### Component Installation

```bash
bunx shadcn@latest add button
bunx shadcn@latest add card
bunx shadcn@latest add form
```

### Usage Pattern

```typescript
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function UserCard({ user, className }: Props) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{user.email}</p>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </CardContent>
    </Card>
  )
}
```

### The cn() Helper

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
<div className={cn(
  'base-styles',
  isActive && 'active-styles',
  className
)} />
```

---

## State Management

### Zustand (Client State)

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
)

// Usage
function Profile() {
  const { user, logout } = useAuthStore()
  return user ? <div>{user.name} <button onClick={logout}>Logout</button></div> : null
}
```

### TanStack Query (Server State)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Fetch data
function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Mutate data
function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateUserData) => 
      fetch('/api/users', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
```

---

## Validation with Zod

```typescript
import { z } from 'zod'

// Define schema
const UserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().positive().optional(),
  role: z.enum(['admin', 'user', 'guest']).default('user'),
})

// Infer type from schema
type User = z.infer<typeof UserSchema>

// Validate
const result = UserSchema.safeParse(data)
if (!result.success) {
  console.error(result.error.flatten())
  return
}
const user = result.data // Typed as User
```

---

## Forms with React Hook Form + Zod

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const FormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

type FormData = z.infer<typeof FormSchema>

export function LoginForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: FormData) => {
    // Handle submit
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('email')} />
      {form.formState.errors.email && (
        <span>{form.formState.errors.email.message}</span>
      )}
      <input type="password" {...form.register('password')} />
      <button type="submit" disabled={form.formState.isSubmitting}>
        Login
      </button>
    </form>
  )
}
```

---

## Animations with Framer Motion

```typescript
import { motion, AnimatePresence } from 'framer-motion'

// Basic animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2 }}
>
  Content
</motion.div>

// List animations
<AnimatePresence>
  {items.map(item => (
    <motion.li
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      layout
    >
      {item.name}
    </motion.li>
  ))}
</AnimatePresence>
```

---

## TOON (Token-Oriented Object Notation)

For AI-friendly data structures:

```typescript
// TOON-friendly: Flat, explicit, self-describing
interface User {
  id: string
  name_first: string
  name_last: string
  email_primary: string
  created_at: string  // ISO 8601
  updated_at: string
  is_active: boolean
  role_type: 'admin' | 'user' | 'guest'
}

// Not TOON-friendly: Nested, implicit
interface User {
  id: string
  name: { first: string; last: string }
  emails: { primary: string; secondary?: string }
  metadata: { created: Date; updated: Date }
  status: { active: boolean }
}
```

### TOON Principles

1. **Flat structures** over deep nesting
2. **Explicit types** at boundaries (string dates, not Date objects)
3. **Self-describing** field names (email_primary, not just email)
4. **Token-efficient** representations
5. **Consistent patterns** across the codebase

---

## File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Route groups
│   ├── api/               # API routes
│   └── layout.tsx
├── components/
│   ├── ui/                # Shadcn components
│   └── features/          # Feature components
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
│   ├── utils.ts          # cn() and helpers
│   └── api.ts            # API client
├── services/              # Business logic
├── stores/                # Zustand stores
└── types/                 # Type definitions
```

---

## Testing with Bun

```typescript
import { test, expect, describe, beforeEach, mock } from 'bun:test'

describe('UserService', () => {
  beforeEach(() => {
    // Setup
  })

  test('creates user with valid data', async () => {
    const user = await createUser({ name: 'Test', email: 'test@example.com' })
    expect(user.name).toBe('Test')
    expect(user.id).toBeDefined()
  })

  test('throws on invalid email', async () => {
    expect(() => createUser({ name: 'Test', email: 'invalid' }))
      .toThrow('Invalid email')
  })
})
```

---

## Recommended Libraries Summary

| Category | Library | Purpose |
|----------|---------|---------|
| State (Client) | Zustand | Lightweight global state |
| State (Server) | TanStack Query | Data fetching, caching |
| Validation | Zod | Schema validation + types |
| Forms | React Hook Form | Form state management |
| UI | Shadcn/ui v4 | Component library |
| Animations | Framer Motion | Declarative animations |
| Icons | Lucide React | Icon library |
| Dates | date-fns | Date manipulation |
| Classes | clsx + tailwind-merge | Conditional class names |
