# General Code Style Conventions

## Naming Conventions

### Files & Directories
- **Directories**: `kebab-case` (e.g., `user-settings/`)
- **Components**: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- **Config files**: `kebab-case` (e.g., `tsconfig.json`, `eslint.config.js`)

### Variables & Functions
- **Variables**: `camelCase` with descriptive names
- **Booleans**: prefix with `is`, `has`, `can`, `should` (e.g., `isLoading`, `hasPermission`)
- **Functions**: verb + noun (e.g., `getUserById`, `validateEmail`)
- **Event handlers**: `handle` + event (e.g., `handleClick`, `handleSubmit`)
- **Async functions**: consider `fetch`, `load`, `save` prefixes

### Types & Interfaces
- **Interfaces**: `PascalCase`, no `I` prefix (e.g., `User`, not `IUser`)
- **Types**: `PascalCase` (e.g., `UserRole`, `ApiResponse`)
- **Enums**: Avoid - use const objects instead
- **Generics**: Single capital letter or descriptive (e.g., `T`, `TData`, `TError`)

---

## Code Patterns

### Early Returns (Guard Clauses)
```typescript
// Good: Early returns, happy path last
function processUser(user: User | null) {
  if (!user) return { error: 'User not found' }
  if (!user.isActive) return { error: 'User inactive' }
  if (!user.hasPermission) return { error: 'No permission' }
  
  // Happy path - main logic
  return { data: transformUser(user) }
}

// Avoid: Deeply nested conditionals
function processUser(user: User | null) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        return { data: transformUser(user) }
      }
    }
  }
  return { error: 'Something went wrong' }
}
```

### RORO Pattern (Receive Object, Return Object)
```typescript
// Good: Clear input/output contracts
interface CreateUserParams {
  name: string
  email: string
  role?: UserRole
}

interface CreateUserResult {
  user: User
  token: string
}

function createUser(params: CreateUserParams): CreateUserResult {
  // Implementation
}

// Avoid: Multiple positional parameters
function createUser(name: string, email: string, role?: string) {
  // Hard to remember order, easy to mix up
}
```

### Explicit Error Handling
```typescript
// Good: Result types
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await api.getUser(id)
    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

// Usage
const result = await fetchUser('123')
if (!result.success) {
  console.error(result.error)
  return
}
console.log(result.data) // TypeScript knows this is User
```

---

## Comments & Documentation

### When to Comment
- **Do**: Explain "why", not "what"
- **Do**: Document non-obvious business logic
- **Do**: Add JSDoc for public APIs
- **Don't**: Comment obvious code
- **Don't**: Leave commented-out code

```typescript
// Good: Explains the "why"
// Using 30-day window because billing cycles reset monthly
const BILLING_WINDOW_DAYS = 30

// Bad: Explains the "what" (obvious from code)
// Set the billing window to 30 days
const BILLING_WINDOW_DAYS = 30
```

### JSDoc for Public APIs
```typescript
/**
 * Calculates the user's billing amount for the current period.
 * 
 * @param userId - The unique identifier of the user
 * @param options - Calculation options
 * @returns The billing amount in cents, or null if user not found
 * 
 * @example
 * const amount = await calculateBilling('user-123', { includeTax: true })
 */
async function calculateBilling(
  userId: string, 
  options?: BillingOptions
): Promise<number | null>
```

---

## File Organization

### Import Order
```typescript
// 1. Built-in/Node modules
import { readFile } from 'fs/promises'

// 2. External packages
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

// 3. Internal aliases (@/)
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

// 4. Relative imports
import { formatDate } from './utils'
import type { User } from './types'
```

### Module Structure
```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Constants
// 4. Helper functions (private)
// 5. Main export(s)
// 6. Default export (if applicable)
```

---

## Formatting

- **Indentation**: 2 spaces (not tabs)
- **Line length**: 100 characters max (soft limit)
- **Semicolons**: Omit (let Prettier/ESLint handle)
- **Quotes**: Single quotes for strings
- **Trailing commas**: Always in multiline
- **Blank lines**: One between logical sections

---

## Anti-Patterns to Avoid

1. **Magic numbers**: Use named constants
2. **Nested ternaries**: Use if/else or early returns
3. **Long functions**: Split into smaller, focused functions
4. **Implicit any**: Always type your variables
5. **Mutation**: Prefer immutable operations
6. **Abbreviations**: Use full words (`button` not `btn`)
