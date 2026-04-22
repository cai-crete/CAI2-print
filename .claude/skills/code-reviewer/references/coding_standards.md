# Coding Standards

Standards applied across all languages supported by this skill.
Language-specific sections follow the universal rules.

---

## Universal Rules

### Naming

| Concept | Convention | Example |
|---------|-----------|---------|
| Boolean variables | Prefix with `is`, `has`, `can`, `should` | `isLoading`, `hasError` |
| Functions / methods | Verb + noun | `fetchUser`, `validateInput` |
| Constants | ALL_CAPS (Python/Go) or SCREAMING_SNAKE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Files | kebab-case for web, snake_case for Python/Go | `user-service.ts`, `user_service.py` |

### Functions

- **Single responsibility**: each function does one thing and does it well.
- **≤ 50 lines**: if a function exceeds this, extract helper functions.
- **≤ 5 parameters**: use a config object / struct / dataclass for more.
- **No side effects in pure logic**: keep data transformation separate from I/O.
- **Avoid boolean flag parameters** — split into two functions instead:

```python
# Bad
def render(data, include_metadata=True): ...

# Good
def render(data): ...
def render_with_metadata(data): ...
```

### Comments

- Comment **why**, not **what**. The code already shows what.
- Delete commented-out code — git history preserves it.
- Use `TODO(username): description` with a linked issue number.

```typescript
// Bad: explains what the code does
// Increment counter
count += 1;

// Good: explains a non-obvious decision
// Retry limit matches the upstream SLA window (see ADR-042)
const MAX_RETRIES = 3;
```

### Error Handling

- Never silently swallow errors.
- Log errors with context: operation name, relevant IDs, original error.
- Distinguish between recoverable errors (retry) and fatal errors (fail fast).
- Expose user-facing errors in plain language; log technical details server-side.

### Testing

- Test file lives next to the source file or in a parallel `tests/` tree.
- Name tests: `test_<function>_<scenario>_<expected_result>`.
- One logical assertion per test (multiple `.assert*` calls for the same outcome is fine).
- Use factories / builders for test data — avoid hard-coding fixture values spread across files.
- Mock at the boundary (HTTP client, DB driver), not deep in business logic.

---

## TypeScript / JavaScript

### Formatting
- **Prettier** with default settings + `singleQuote: true`, `trailingComma: 'all'`.
- Line length: **100 characters**.
- Indentation: **2 spaces**.

### Types
```typescript
// Prefer specific types over any
const process = (input: unknown): Result => { ... };

// Use type aliases for complex shapes
type UserId = string;
type ApiResponse<T> = { data: T; error: string | null };

// Prefer interfaces for public APIs, type aliases for unions/intersections
interface UserService {
  getUser(id: UserId): Promise<User>;
}

type Status = 'idle' | 'loading' | 'success' | 'error';
```

### Async
```typescript
// Always await or return — never fire-and-forget without .catch()
// Bad
sendAnalytics(event);

// Good
sendAnalytics(event).catch((err) => logger.error('Analytics failed', err));

// Prefer async/await over raw .then() chains for readability
const user = await getUser(id);
```

### Imports
```typescript
// Order: node built-ins → third-party → local (enforced by eslint-import)
import path from 'path';

import express from 'express';

import { UserService } from './user-service';
```

### React
- Prefer **functional components** with hooks over class components.
- Extract logic > 10 lines into a custom hook (`use<Name>`).
- Keep component files < 250 lines; split into sub-components when larger.
- Avoid inline object / array literals in JSX to prevent unnecessary re-renders:

```tsx
// Bad — new object on every render
<Component style={{ marginTop: 8 }} />

// Good
const styles = { marginTop: 8 };
<Component style={styles} />
```

---

## Python

### Formatting
- **Black** (line length 88) + **isort** for imports.
- Type hints on all public functions and methods.

### Structure
```python
# Module layout
"""Module docstring."""

# Standard library
import os
from pathlib import Path

# Third-party
import httpx

# Local
from myapp.config import Settings


# Constants at module level
MAX_RETRIES = 3


class MyService:
    """Class docstring."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def fetch(self, url: str) -> dict:
        """Fetch JSON from url. Raises httpx.HTTPError on failure."""
        response = httpx.get(url, timeout=self._settings.timeout)
        response.raise_for_status()
        return response.json()
```

### Patterns
```python
# Use dataclasses for plain data holders (Python 3.7+)
from dataclasses import dataclass

@dataclass(frozen=True)
class Point:
    x: float
    y: float

# Use pathlib, not os.path
config_path = Path(__file__).parent / 'config.yaml'

# Use context managers for all resources
with open(path) as f:
    data = f.read()

# Prefer list/dict comprehensions over map/filter for simple transforms
squares = [x**2 for x in range(10) if x % 2 == 0]
```

---

## Go

### Formatting
- **gofmt** / **goimports** — non-negotiable, enforced in CI.
- Line length: soft limit of **100 characters**.

### Error handling
```go
// Always check errors immediately
result, err := db.Query(ctx, query, args...)
if err != nil {
    return fmt.Errorf("querying users: %w", err)  // wrap with context
}
defer result.Close()

// Use sentinel errors for expected conditions
var ErrNotFound = errors.New("not found")

// Use errors.Is / errors.As for comparison — never string matching
if errors.Is(err, ErrNotFound) { ... }
```

### Packages and interfaces
```go
// Define interfaces at the point of use, not the point of implementation
type UserStore interface {
    GetUser(ctx context.Context, id string) (User, error)
}

// Small interfaces are better — prefer composition
type Reader interface { Read(p []byte) (n int, err error) }
type Writer interface { Write(p []byte) (n int, err error) }
type ReadWriter interface { Reader; Writer }
```

### Concurrency
```go
// Always pass context for cancellation
func fetchData(ctx context.Context, url string) ([]byte, error) { ... }

// Use errgroup for concurrent fan-out with error propagation
g, ctx := errgroup.WithContext(ctx)
for _, id := range ids {
    id := id  // capture loop variable
    g.Go(func() error {
        return process(ctx, id)
    })
}
if err := g.Wait(); err != nil { ... }
```

---

## Swift

### Formatting
- **SwiftFormat** with default rules.
- Line length: **120 characters**.

### Safety
```swift
// Avoid force unwrap — use guard let or if let
guard let url = URL(string: rawURL) else {
    throw URLError(.badURL)
}

// Use Swift's Result type for error propagation
func loadUser(id: String) async throws -> User {
    let (data, response) = try await URLSession.shared.data(from: url)
    guard (response as? HTTPURLResponse)?.statusCode == 200 else {
        throw APIError.badStatus
    }
    return try JSONDecoder().decode(User.self, from: data)
}

// Avoid retain cycles in closures
networkManager.fetch { [weak self] result in
    guard let self else { return }
    self.handle(result)
}
```

---

## Kotlin

### Formatting
- **ktlint** with default rules.
- Line length: **120 characters**.

### Null safety
```kotlin
// Prefer safe calls and Elvis operator over !!
val name = user?.profile?.displayName ?: "Anonymous"

// Use requireNotNull / checkNotNull for invariants (throws with clear message)
val config = requireNotNull(environment.config) { "Config must be initialised before use" }

// Use sealed classes for exhaustive state representation
sealed class Result<out T> {
    data class Success<T>(val value: T) : Result<T>()
    data class Error(val exception: Throwable) : Result<Nothing>()
}

// Exhaustive when — compiler enforces all branches
when (val result = fetchUser(id)) {
    is Result.Success -> render(result.value)
    is Result.Error   -> showError(result.exception)
}
```

### Coroutines
```kotlin
// Launch coroutines in the correct scope
class UserViewModel : ViewModel() {
    fun loadUser(id: String) {
        viewModelScope.launch {
            _state.value = UiState.Loading
            _state.value = try {
                UiState.Success(repository.getUser(id))
            } catch (e: Exception) {
                UiState.Error(e.message ?: "Unknown error")
            }
        }
    }
}
```