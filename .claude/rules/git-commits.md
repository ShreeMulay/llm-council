# Git Commit Conventions

## Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add OAuth login` |
| `fix` | Bug fix | `fix(api): handle null response` |
| `docs` | Documentation | `docs: update API reference` |
| `style` | Formatting (no code change) | `style: fix indentation` |
| `refactor` | Code restructuring | `refactor(utils): simplify date parsing` |
| `test` | Adding/updating tests | `test(auth): add login tests` |
| `chore` | Maintenance | `chore: update dependencies` |
| `perf` | Performance improvement | `perf(query): optimize user lookup` |
| `ci` | CI/CD changes | `ci: add deploy workflow` |
| `build` | Build system changes | `build: update bun to 1.0.15` |
| `revert` | Revert previous commit | `revert: feat(auth): add OAuth` |

### Subject Line Rules

- **50 characters or less**
- **Imperative mood** ("add" not "added" or "adds")
- **No period** at the end
- **Lowercase** (except proper nouns)

```
# Good
feat(api): add user endpoint
fix: resolve memory leak in cache
docs: update installation guide

# Bad
feat(api): Added user endpoint.    # Past tense, period
FIX: RESOLVE MEMORY LEAK           # All caps
feat: This commit adds a new feature for users to login  # Too long
```

### Scope (Optional but Recommended)

The scope indicates what part of the codebase is affected:

```
feat(auth): add password reset
fix(ui/button): fix hover state
refactor(api/users): simplify validation
test(services): add unit tests
```

Common scopes:
- Component names: `button`, `card`, `modal`
- Modules: `auth`, `api`, `utils`
- Paths: `ui/button`, `api/users`

---

## Body (Optional)

Use the body to explain **what** and **why**, not **how**:

```
fix(api): handle rate limit errors gracefully

Previously, rate limit errors caused the application to crash.
Now we retry with exponential backoff and show a user-friendly
message after 3 failed attempts.

Closes #123
```

### Body Guidelines

- Wrap at 72 characters
- Explain motivation for the change
- Contrast with previous behavior
- Use bullet points for multiple items

---

## Footer (Optional)

### Breaking Changes

```
feat(api)!: change user endpoint response format

BREAKING CHANGE: The /api/users endpoint now returns
a paginated response object instead of a flat array.

Migration: Update client code to access users via
response.data instead of the response directly.
```

### Issue References

```
feat(auth): add two-factor authentication

Implements TOTP-based 2FA using authenticator apps.

Closes #456
Fixes #789
Related to #123
```

---

## Examples

### Simple Feature

```
feat(ui): add dark mode toggle
```

### Bug Fix with Context

```
fix(auth): prevent session fixation attack

Clear existing session before creating new one on login.
This prevents attackers from pre-setting a session ID.

Security: CVE-2024-XXXX
```

### Refactor with Explanation

```
refactor(api): extract validation into middleware

- Move input validation from controllers to middleware
- Add reusable validation schemas
- Improve error messages

This reduces code duplication and makes validation
consistent across all endpoints.
```

### Documentation Update

```
docs(readme): add deployment instructions

- Add Docker deployment section
- Include environment variables reference
- Add troubleshooting guide
```

### Chore/Maintenance

```
chore(deps): update dependencies

- bun 1.0.14 -> 1.0.15
- typescript 5.2 -> 5.3
- @types/node 20.8 -> 20.10
```

---

## Branch Naming

```
<type>/<description>

feat/user-authentication
fix/login-redirect-loop
docs/api-reference
refactor/simplify-routing
```

### Long-Running Branches

```
main              # Production-ready code
develop           # Integration branch (optional)
release/1.0.0     # Release preparation
hotfix/critical-bug
```

---

## Pull Request Titles

Follow the same convention as commits:

```
feat(auth): add OAuth login support
fix(api): handle timeout errors gracefully
docs: update contributing guidelines
```

### PR Description Template

```markdown
## Summary
Brief description of changes.

## Changes
- Added X
- Fixed Y
- Updated Z

## Testing
How was this tested?

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

---

## Beads Integration

When working with Beads, reference issues in commits:

```
feat(api): add user search endpoint

Implements full-text search for users with filtering
by role and status.

Closes bd-123
Related: bd-100, bd-101
```

After completing work:
```bash
bd close bd-123 --reason "Implemented in commit abc1234"
```
