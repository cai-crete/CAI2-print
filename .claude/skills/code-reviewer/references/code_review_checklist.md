# Code Review Checklist

Use this checklist when reviewing any pull request. Check each item before approving.

---

## 1. Correctness

- [ ] The code does what the PR description says it does
- [ ] Edge cases are handled (empty input, null/nil/None, zero, negative numbers, max values)
- [ ] No off-by-one errors in loops or array accesses
- [ ] Conditional logic is correct (check for `==` vs `===`, `&&` vs `||` precedence)
- [ ] Asynchronous code handles all promise rejections / goroutine panics
- [ ] Race conditions are absent in concurrent code (locks, channels, atomic ops used correctly)
- [ ] No infinite loops or unintended recursion without a base case

---

## 2. Security

- [ ] No hardcoded secrets, API keys, passwords, or tokens — use env vars or a secrets manager
- [ ] All user inputs are validated and sanitised before use
- [ ] SQL queries use parameterised statements / prepared statements — no string concatenation
- [ ] HTML output is escaped to prevent XSS
- [ ] File paths from user input are validated to prevent path traversal (`../` attacks)
- [ ] Authentication and authorisation are enforced on every relevant endpoint
- [ ] Sensitive data is not logged (passwords, PII, tokens)
- [ ] Third-party dependencies are pinned and free of known CVEs (run `npm audit`, `pip-audit`, etc.)
- [ ] `eval()` / `exec()` / dynamic code execution is absent or justified

---

## 3. Error Handling

- [ ] All errors are handled — no silent swallowing (`catch {}`, bare `except:`, `_ = err`)
- [ ] Errors are logged with enough context to diagnose the problem
- [ ] Error messages exposed to users do not leak internal stack traces or implementation details
- [ ] Functions that can fail return an error type (Go) or raise a typed exception (Python/Java)
- [ ] Resources (files, DB connections, network sockets) are closed in `finally` / `defer` / `using`

---

## 4. Code Quality

- [ ] Functions are small and do one thing (aim for ≤ 50 lines)
- [ ] No deeply nested control flow (max 3–4 levels)
- [ ] Magic numbers are replaced with named constants
- [ ] No copy-pasted blocks — duplicated logic is extracted into a shared function
- [ ] Dead code and commented-out code are removed
- [ ] `TODO` / `FIXME` comments are resolved or tracked as issues
- [ ] Debug statements (`console.log`, `print`, `fmt.Println`) are removed
- [ ] Variable and function names are descriptive and consistent with the codebase style

---

## 5. Tests

- [ ] New behaviour is covered by at least one test
- [ ] Tests cover the happy path AND important failure paths
- [ ] Tests are deterministic — no reliance on system time, random values, or external services without mocking
- [ ] Test names clearly describe what they are testing (`test_returns_empty_list_when_no_results`)
- [ ] No test logic is duplicated across test files — use shared fixtures or helpers
- [ ] Existing tests still pass (CI is green)

---

## 6. Performance

- [ ] No N+1 query patterns (loading related data inside a loop without batching)
- [ ] Large result sets are paginated or streamed — not loaded entirely into memory
- [ ] Expensive operations (network calls, disk I/O) are not placed inside tight loops
- [ ] Caching is used where appropriate and cache invalidation is correct
- [ ] No unnecessary re-renders or re-computations in frontend components

---

## 7. Maintainability & Readability

- [ ] Public API surface is documented (docstrings, JSDoc, GoDoc)
- [ ] Complex business logic includes a comment explaining *why*, not just *what*
- [ ] Code is formatted consistently (run Prettier / Black / gofmt before committing)
- [ ] File length is reasonable (aim for < 500 lines; split large files by responsibility)
- [ ] Imports are organised (stdlib → third-party → internal)
- [ ] No circular dependencies introduced

---

## 8. Language-Specific

### TypeScript / JavaScript
- [ ] `any` type is avoided — use specific types or `unknown`
- [ ] `var` is not used — prefer `const` (default) or `let`
- [ ] Promises are awaited or `.catch()` is attached — no floating promises
- [ ] React components do not mutate props or state directly
- [ ] `useEffect` dependencies are complete and correct

### Python
- [ ] No mutable default arguments (`def f(x=[])` — use `None` sentinel instead)
- [ ] `is None` / `is not None` used instead of `== None`
- [ ] Type hints are present on public functions
- [ ] Context managers (`with`) used for file and connection handling
- [ ] Exceptions are caught by specific type, not bare `except:`

### Go
- [ ] Every error return is checked — `if err != nil`
- [ ] `panic()` is not used in library code — return errors instead
- [ ] Goroutines have a clear ownership and are not leaked
- [ ] `defer` is used to release resources (files, locks, connections)
- [ ] Exported identifiers have GoDoc comments

### Swift
- [ ] Force unwrapping (`!`) is avoided — use `guard let`, `if let`, or `??`
- [ ] `@MainActor` / `DispatchQueue.main` used for UI updates
- [ ] Memory cycles avoided — `[weak self]` in closures that capture `self`
- [ ] `Codable` models handle missing or unexpected JSON keys gracefully

### Kotlin
- [ ] Null safety is handled — `?.`, `?:`, `!!` only when non-null is guaranteed
- [ ] `lateinit` and `by lazy` are used appropriately and not overused
- [ ] Coroutines use structured concurrency (`viewModelScope`, `lifecycleScope`)
- [ ] Sealed classes used for exhaustive `when` expressions on state/result types

---

## 9. Infrastructure / DevOps (if applicable)

- [ ] No secrets committed to IaC files (Terraform, Helm values, k8s manifests)
- [ ] Resource limits (`cpu`, `memory`) are set on containers
- [ ] Health checks and readiness probes are configured
- [ ] Rollback strategy is defined for database migrations
- [ ] CI pipeline passes (lint, test, build, security scan)