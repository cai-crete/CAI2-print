# Common Antipatterns

Real antipatterns encountered in TypeScript, JavaScript, Python, and Go codebases —
with the bad pattern, why it's wrong, and the correct fix.

---

## 1. Swallowing Errors Silently

**Languages:** All

### Bad
```typescript
try {
  await saveUser(user);
} catch (e) {
  // do nothing
}
```
```python
try:
    save_user(user)
except:
    pass
```

### Why it's wrong
Silent failures make bugs invisible. The operation fails, the caller gets no signal,
and the system continues in a corrupt state that's extremely hard to debug.

### Fix
```typescript
try {
  await saveUser(user);
} catch (err) {
  logger.error('Failed to save user', { userId: user.id, err });
  throw err; // re-throw unless you have a deliberate fallback
}
```
```python
try:
    save_user(user)
except DatabaseError as exc:
    logger.error("Failed to save user %s: %s", user.id, exc)
    raise
```

---

## 2. N+1 Query Problem

**Languages:** All (any ORM or database layer)

### Bad
```typescript
const orders = await db.query('SELECT * FROM orders');
for (const order of orders) {
  // One query per order — 1 + N queries total
  order.user = await db.query('SELECT * FROM users WHERE id = $1', [order.userId]);
}
```

### Why it's wrong
100 orders = 101 database round-trips. At scale this kills response times and
saturates the connection pool.

### Fix
```typescript
// Batch load with a JOIN or an IN clause
const orders = await db.query(`
  SELECT o.*, u.name AS user_name
  FROM orders o
  JOIN users u ON u.id = o.user_id
`);

// Or for ORM users: eager-load the relation
const orders = await Order.findAll({ include: [User] });
```

---

## 3. Mutable Default Arguments (Python)

**Languages:** Python

### Bad
```python
def add_item(item, collection=[]):   # [] is created ONCE at import time
    collection.append(item)
    return collection

add_item('a')  # ['a']
add_item('b')  # ['a', 'b']  ← unexpected!
```

### Why it's wrong
The default list is shared across all calls. Every invocation without an explicit
argument modifies the same object.

### Fix
```python
def add_item(item, collection=None):
    if collection is None:
        collection = []
    collection.append(item)
    return collection
```

---

## 4. Hardcoded Secrets

**Languages:** All

### Bad
```typescript
const client = new S3Client({
  credentials: { accessKeyId: 'AKIA...', secretAccessKey: 'wJalrX...' },
});
```

### Why it's wrong
Secrets committed to version control are permanently in git history.
Even a private repo can be cloned, forked, or leaked.

### Fix
```typescript
const client = new S3Client({
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
```
Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, Doppler) for production.

---

## 5. Floating Promises (JavaScript / TypeScript)

**Languages:** JavaScript, TypeScript

### Bad
```typescript
function handleClick() {
  fetchData();          // Promise not awaited — errors are lost
  updateUI();
}
```

### Why it's wrong
An unhandled rejected promise triggers an `UnhandledPromiseRejection` warning
(Node.js) or crashes the process in newer runtimes. The UI may update before
the fetch completes.

### Fix
```typescript
async function handleClick() {
  try {
    await fetchData();
    updateUI();
  } catch (err) {
    showErrorToast(err);
  }
}

// If fire-and-forget is intentional, attach a catch explicitly
fetchData().catch((err) => logger.error('Background fetch failed', err));
```

---

## 6. God Object / God Function

**Languages:** All

### Bad
```python
class ApplicationManager:
    def run(self):
        self.parse_config()
        self.connect_db()
        self.start_http_server()
        self.schedule_jobs()
        self.send_startup_email()
        self.monitor_health()
        # ... 400 more lines
```

### Why it's wrong
Everything is coupled to one class/function. Impossible to test in isolation,
and any change risks breaking unrelated functionality.

### Fix
Split by responsibility. Each class/module owns one concern:
```python
config   = ConfigLoader(path).load()
db       = Database(config.db_url)
server   = HttpServer(config.port, db)
scheduler= JobScheduler(config.jobs)

server.start()
scheduler.start()
```

---

## 7. Checking for `None` with `==` (Python)

**Languages:** Python

### Bad
```python
if result == None:
    return default
```

### Why it's wrong
`__eq__` can be overridden. A custom object might return `True` for `== None`.
`is None` tests object identity, which is the correct semantic.

### Fix
```python
if result is None:
    return default
```

---

## 8. Using `var` in JavaScript / TypeScript

**Languages:** JavaScript, TypeScript

### Bad
```javascript
var count = 0;
for (var i = 0; i < 10; i++) {
  setTimeout(() => console.log(i), 0); // prints 10 ten times
}
```

### Why it's wrong
`var` is function-scoped and hoisted, leading to subtle closure and scoping bugs.

### Fix
```javascript
let count = 0;
for (let i = 0; i < 10; i++) {
  setTimeout(() => console.log(i), 0); // prints 0–9
}
// Use const by default; let only when you need reassignment
```

---

## 9. Ignoring Errors in Go

**Languages:** Go

### Bad
```go
data, _ := ioutil.ReadFile(path)   // error silently discarded
result, _ := strconv.Atoi(input)   // invalid input returns 0 silently
```

### Why it's wrong
Go's explicit error returns are its primary safety mechanism. Discarding with `_`
turns a recoverable error into silent data corruption.

### Fix
```go
data, err := os.ReadFile(path)
if err != nil {
    return fmt.Errorf("reading config %s: %w", path, err)
}

result, err := strconv.Atoi(input)
if err != nil {
    return fmt.Errorf("invalid integer %q: %w", input, err)
}
```

---

## 10. Prop Drilling (React)

**Languages:** TypeScript / JavaScript (React)

### Bad
```tsx
// Passing userId through 4 layers of components that don't use it
<Page userId={userId}>
  <Layout userId={userId}>
    <Sidebar userId={userId}>
      <UserAvatar userId={userId} />
    </Sidebar>
  </Layout>
</Page>
```

### Why it's wrong
Every intermediate component takes a prop it doesn't care about, creating
unnecessary coupling and making refactoring painful.

### Fix
```tsx
// Option A: React Context for cross-cutting data
const UserContext = createContext<User | null>(null);

// Option B: Zustand / Redux for global state
const userId = useUserStore((s) => s.userId);

// Option C: Composition — pass components, not data
<Page>
  <Layout sidebar={<UserAvatar />} />
</Page>
```

---

## 11. SQL String Concatenation

**Languages:** All

### Bad
```python
query = f"SELECT * FROM users WHERE email = '{email}'"
cursor.execute(query)
```

### Why it's wrong
Classic SQL injection. If `email` is `' OR '1'='1`, the query returns all users.

### Fix
```python
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
```
Always use parameterised queries or your ORM's query builder.

---

## 12. Magic Numbers

**Languages:** All

### Bad
```typescript
if (status === 3) {
  retry();
}
setTimeout(flush, 5000);
```

### Why it's wrong
`3` and `5000` have no meaning to the next reader. Their intent can only be
discovered by archaeology.

### Fix
```typescript
const STATUS_PENDING = 3;
const FLUSH_INTERVAL_MS = 5_000;

if (status === STATUS_PENDING) {
  retry();
}
setTimeout(flush, FLUSH_INTERVAL_MS);
```

---

## 13. Deep Callback Nesting ("Callback Hell")

**Languages:** JavaScript, TypeScript

### Bad
```javascript
getUser(id, (user) => {
  getOrders(user.id, (orders) => {
    getInvoice(orders[0].id, (invoice) => {
      sendEmail(invoice, (result) => {
        // ...
      });
    });
  });
});
```

### Why it's wrong
Error handling is duplicated at each level. Control flow is impossible to follow.
Adding a step means a new level of nesting.

### Fix
```typescript
async function processUser(id: string) {
  const user    = await getUser(id);
  const orders  = await getOrders(user.id);
  const invoice = await getInvoice(orders[0].id);
  await sendEmail(invoice);
}
```

---

## 14. Force Unwrapping Optionals (Swift)

**Languages:** Swift

### Bad
```swift
let url = URL(string: userInput)!      // crashes if input is invalid
let name = user.profile!.displayName   // crashes if profile is nil
```

### Why it's wrong
`!` converts a compile-time safety guarantee into a runtime crash.

### Fix
```swift
guard let url = URL(string: userInput) else {
    throw ValidationError.invalidURL(userInput)
}

let name = user.profile?.displayName ?? "Anonymous"
```

---

## 15. Launching Coroutines in GlobalScope (Kotlin)

**Languages:** Kotlin

### Bad
```kotlin
fun loadData() {
    GlobalScope.launch {
        val data = repository.fetch()
        updateUI(data)
    }
}
```

### Why it's wrong
`GlobalScope` coroutines live for the entire process lifetime. They leak when
the screen is dismissed and can update destroyed UI, causing crashes.

### Fix
```kotlin
class MyViewModel : ViewModel() {
    fun loadData() {
        viewModelScope.launch {          // cancelled when ViewModel is cleared
            val data = repository.fetch()
            _uiState.value = data
        }
    }
}
```