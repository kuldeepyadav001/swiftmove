# 🔍 SwiftMove — FULL PROJECT AUDIT
### Date: 2026-08-30 | Auditor: Senior System Architect

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| 🔴 Critical Bugs | 7 | App-breaking, data loss, security |
| 🟠 Major Issues | 10 | Functional gaps, poor UX |
| 🟡 Moderate Issues | 12 | Performance, code quality |
| 🔵 Minor / Polish | 9 | Visual, maintainability |
| **Total** | **38** | |

---

## 🔴 CRITICAL BUGS (App-breaking)

### 1. `PaymentGateway.jsx` references undefined `onCancel` prop
**File:** `frontend/src/components/PaymentGateway.jsx` (last button)
**Problem:** The cancel button calls `onCancel` which is never passed as a prop. This causes a **runtime crash** when the payment modal is rendered.
```jsx
// Line ~160:
<button onClick={onCancel} disabled={loading}>  // ← onCancel is undefined
```
**Fix:** Add `onCancel` to props or remove the button.

### 2. Duplicate DTO classes — ambiguous imports
**Files:**
- `dto/RegisterRequest.java` (standalone) AND `dto/AuthDtos.RegisterRequest` (inner class)
- `dto/LoginRequest.java` (standalone) AND `dto/AuthDtos.LoginRequest` (inner class)
- `dto/AuthResponse.java` (standalone) AND `dto/AuthDtos.AuthResponse` (inner class)

**Problem:** `AuthController` imports from `AuthDtos.*` inner classes, but the standalone classes also exist with **different fields** (e.g. standalone `RegisterRequest` has `vehicleType`, `licenseNumber`; inner class has `Role role`). Spring's `@Valid @RequestBody` will bind to whichever the controller imports. The standalone classes are **dead code** causing confusion and potential misrouting.

### 3. `BookingController` has duplicate cancel endpoints
**File:** `backend/.../controller/BookingController.java`
```java
@DeleteMapping("/{id}/cancel")  // ← DELETE
public ResponseEntity<Booking> delete(...)

@PutMapping("/{id}/cancel")     // ← PUT (same path!)
public ResponseEntity<Booking> cancel(...)
```
**Problem:** Two handlers for the same URL pattern. Spring may route unpredictably. The `delete` method is declared with `@DeleteMapping` but the frontend calls it via `apiFetch` with `PUT`.

### 4. Wrong MongoDB property key
**File:** `backend/src/main/resources/application.properties`
```properties
spring.mongodb.uri=${mongodb_uri}    # ← WRONG
```
**Should be:** `spring.data.mongodb.uri=${mongodb_uri}`

This means the MongoDB URI might not be picked up correctly, depending on Spring Boot version behavior.

### 5. Password field leaked in admin API responses
**File:** `backend/.../controller/AdminController.java` → `GET /api/admin/users`
**Problem:** Returns `List<User>` directly. The `User` model includes `password` (BCrypt hash). While not the plaintext password, exposing hashes is a security risk and wastes bandwidth.
**Fix:** Use a DTO that excludes the password, or add `@JsonIgnore` on the password field in `User.java`.

### 6. WebSocket has NO authentication
**File:** `backend/.../config/SecurityConfig.java` + `WebSocketConfig.java`
```java
.requestMatchers("/ws/**").permitAll()  // ← Anyone can connect
```
And:
```java
registry.addEndpoint("/ws").setAllowedOriginPatterns("*");  // ← Any origin
```
**Problem:** Anyone can connect to WebSocket, subscribe to `/topic/booking/{id}` and receive real-time location data for any booking. This leaks driver GPS positions.
**Fix:** Add STOMP channel interceptor that validates JWT on connection.

### 7. KYC images stored as Base64 in MongoDB documents
**File:** `backend/.../model/KycDocument.java`
**Problem:** Six document images stored as Base64 strings directly in the MongoDB document. MongoDB has a **16MB document size limit**. Six images at ~2-5MB each (before compression) will easily exceed this. GridFS is configured (`spring.data.mongodb.gridfs.bucket=kyc-documents`) but never used.
**Fix:** Upload to GridFS or a file storage service, store only the reference ID.

---

## 🟠 MAJOR ISSUES

### 8. Non-cryptographic OTP generation
**File:** `backend/.../service/BookingService.java`
```java
String otp = String.valueOf((int) (Math.random() * 900000) + 100000);
```
**Problem:** `Math.random()` is not cryptographically secure. OTPs can be predicted.
**Fix:** Use `java.security.SecureRandom`.

### 9. Notifications are completely broken
**File:** `frontend/src/App.jsx` → `ShipperDashboard` and `DriverDashboard`
```jsx
const { ... } = useNotifications(user, null);  // ← null WebSocket client!
```
**Problem:** Both dashboards pass `null` as the WebSocket client to `useNotifications`. The hook checks `wsClient?.current?.connected` — since it's null, the real-time notification subscription NEVER connects. Notifications only load from REST (on page load), never in real-time.

### 10. Admin stats endpoint loads ALL delivered bookings into memory
**File:** `backend/.../controller/AdminController.java`
```java
long totalRevenue = bookingRepository
    .findByStatusOrderByCreatedAtDesc("DELIVERED")
    .stream()
    .mapToLong(Booking::getAppCut)
    .sum();
```
**Problem:** Loads every delivered booking ever into Java memory just to sum a field. At 10K+ bookings, this causes GC pressure and slow responses.
**Fix:** Use MongoDB aggregation pipeline: `$match` + `$group` + `$sum`.

### 11. No pagination anywhere
**Files:** All repository methods return `List<T>` with no page/size parameters.
**Problem:** `findAllByOrderByCreatedAtDesc()`, `findByStatusOrderByCreatedAtDesc()`, etc. all return unbounded lists. At scale, this will OOM the server and crash the frontend.

### 12. `BookingService.create()` uses `Map<String, Object>` — zero input validation
**File:** `backend/.../service/BookingService.java`
```java
public Booking create(Map<String, Object> req, String shipperEmail) {
    String pickup = (String) req.get("pickup");  // unchecked cast
```
**Problem:** No `@Valid`, no DTO, no type safety. Any value can be passed. A malicious client could inject arbitrary fields.

### 13. No image compression before upload
**File:** `frontend/src/components/KycUpload.jsx` + `DeliveryHandoffPanel`
**Problem:** Images are converted to Base64 at full resolution. A phone camera photo can be 5-15MB. This bloats request payloads, MongoDB documents, and WebSocket messages.
**Fix:** Client-side compression (canvas resize to max 1200px, quality 0.7) before Base64 encoding.

### 14. Global exception handler swallows real errors
**File:** `backend/.../exception/GlobalExceptionHandler.java`
```java
@ExceptionHandler(Exception.class)
public ResponseEntity<Map<String,String>> handleGeneral(Exception ex) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("message", "Something went wrong."));  // ← hides everything
}
```
**Problem:** All unhandled exceptions return a generic message. Stack traces are lost. Developers can't debug. The real error (e.g., MongoDB connection failure, NPE) is invisible.
**Fix:** Log the exception before returning the generic response.

### 15. `saveSession` defined in TWO places
**Files:** `frontend/src/api/authApi.js` AND `frontend/src/api/sessionStorage.js`
**Problem:** Both export a `saveSession` function. `App.jsx` imports from `sessionStorage.js`. If someone imports from `authApi.js`, behavior may differ. Dead code + confusion.

### 16. App.jsx is 1,803 lines
**File:** `frontend/src/App.jsx`
**Problem:** Everything — icons, auth pages, shipper dashboard, driver dashboard, landing page, booking form, delivery handoff — lives in one file. This makes the code:
- Impossible to navigate
- Slow to compile (HMR sends the entire file)
- Hard to test individual components
**Fix:** Split into at minimum: `auth/LoginPage.jsx`, `auth/RegisterPage.jsx`, `shipper/ShipperDashboard.jsx`, `driver/DriverDashboard.jsx`, `landing/LandingPage.jsx`, `shared/Icons.jsx`.

### 17. No error boundaries
**Problem:** If any component throws during render, the entire app white-screens with no recovery path.
**Fix:** Add React error boundaries around each dashboard.

---

## 🟡 MODERATE ISSUES

### 18. Leaflet loaded from CDN via script injection
**File:** `frontend/src/utils/leaflet.js`
**Problem:** Leaflet is loaded from `unpkg.com` at runtime via dynamic `<script>` tag. This:
- Adds a network round trip on first map render
- Has no version pinning guarantee (CDN could change)
- Can't be tree-shaken or preloaded
- Fails offline
**Fix:** Install `leaflet` via npm (already in package.json!) and import it properly.

### 19. No code splitting / lazy loading
**File:** `frontend/src/App.jsx`
**Problem:** All components are imported eagerly. The initial bundle includes the admin dashboard, KYC forms, maps, etc. even for unauthenticated users on the landing page.
**Fix:** Use `React.lazy()` + `Suspense` for route-based splitting.

### 20. `useDistancePrice` hook duplicates `FareEstimate` component logic
**Files:** `frontend/src/hooks/useDistancePrice.js` AND `frontend/src/components/FareEstimate.jsx`
**Problem:** Both call the same `/api/fare/calculate` endpoint with the same debounce logic. The hook appears to be dead code (not imported anywhere visible).

### 21. Copyright year hardcoded to 2024
**File:** `frontend/src/App.jsx` (LandingPage footer)
```jsx
<p className="text-sm text-slate-500">© 2024 SwiftMove.</p>
```
**Fix:** Use `new Date().getFullYear()`.

### 22. No favicon or meta tags
**File:** `frontend/index.html`
**Problem:** No `<link rel="icon">`, no `og:image`, no `description`, no `theme-color`. The browser tab shows a blank icon. Social sharing shows no preview.

### 23. No health check endpoint
**Problem:** No `GET /api/health` or `GET /actuator/health` for monitoring. Container orchestrators and uptime monitors have nothing to ping.

### 24. DEBUG logging in production config
**File:** `backend/src/main/resources/application.properties`
```properties
logging.level.com.swiftmove=DEBUG
spring.mail.properties.mail.debug=true
```
**Problem:** DEBUG logging in production generates massive log volumes, impacts performance, and may leak sensitive data.

### 25. No rate limiting on auth endpoints
**Problem:** `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password` have no rate limiting. Vulnerable to brute-force attacks.

### 26. CORS allows `*` for WebSocket but specific origins for HTTP
**Problem:** Inconsistent security posture. HTTP is locked down but WebSocket accepts anything.

### 27. No token refresh mechanism
**Problem:** JWT has a fixed expiration. Once expired, the user must fully re-login. No silent refresh flow exists.

### 28. Driver accepts job without checking KYC status
**File:** `backend/.../service/BookingService.java` → `accept()`
**Problem:** Any driver (even unverified) can accept a job. The KYC check is UI-only.
**Fix:** Server should reject `accept()` if driver's KYC is not APPROVED.

---

## 🔵 MINOR / POLISH

### 29. No mobile bottom navigation for dashboards
The shipper/driver dashboards use a top nav bar that's awkward on mobile. Industry standard is a fixed bottom tab bar.

### 30. No loading skeletons
Every loading state shows a centered spinner. Should use skeleton/shimmer placeholders for better perceived performance.

### 31. `react-router-dom` imported but unused
**File:** `frontend/package.json` lists `react-router-dom` but the app uses a custom `useRouter()` state machine instead.

### 32. `axios` imported but unused
**File:** `frontend/package.json` lists `axios` but all API calls use `fetch`/`apiFetch`.

### 33. No `.env.local` in `.gitignore`
**File:** `frontend/.gitignore`
**Problem:** Vite uses `.env.local` for local overrides. If it's not gitignored, someone might commit it.

### 34. `LocationController` violates single responsibility
**File:** `backend/.../controller/LocationController.java`
**Problem:** This class is both a REST controller (handling POST `/api/location/update`) AND the WebSocket notification hub (`notifyLocation`, `notifyStatusUpdate`, `notifyNewJob`). Should be split.

### 35. No database seeding for rate cards
**Problem:** Rate cards are only created lazily when a fare is first calculated. If the ORS API is down and no fare has been calculated for a city, the rate card might not exist. Should have an idempotent seed.

### 36. No tests whatsoever
**Problem:** Zero unit tests, zero integration tests, zero E2E tests. No test runner configured. No CI pipeline.

### 37. Inconsistent error handling patterns
**Problem:** Some services throw `RuntimeException`, others throw `SwiftMoveException`. Controllers return raw entities without wrapper. Frontend shows `alert()` for some errors, toast for others, inline for others.

### 38. `spring.mongodb.uri` vs `spring.data.mongodb.uri` inconsistency
The `application.properties` uses `spring.mongodb.uri` but the standard Spring Boot property is `spring.data.mongodb.uri`. The `spring-dotenv` library might handle this, but it's fragile.

---

## 🎯 RECOMMENDED PRIORITY ORDER

### Phase 1 — Critical Fixes (Day 1-2)
1. Fix `PaymentGateway` `onCancel` crash (#1)
2. Fix password leak in admin API (#5)
3. Fix duplicate DTOs (#2)
4. Fix duplicate cancel endpoint (#3)
5. Fix MongoDB property key (#4)
6. Fix OTP to use SecureRandom (#8)

### Phase 2 — Security Hardening (Day 3-4)
7. Add WebSocket authentication (#6)
8. Move KYC images to GridFS (#7)
9. Add KYC check to job acceptance (#28)
10. Add rate limiting to auth endpoints (#25)

### Phase 3 — Performance & Architecture (Day 5-7)
11. MongoDB aggregation for admin stats (#10)
12. Add pagination to all list endpoints (#11)
13. Create proper booking DTO with validation (#12)
14. Add image compression (#13)
15. Fix notifications (pass real WS client) (#9)
16. Split App.jsx (#16)

### Phase 4 — Visual & UX Polish (Day 8-10)
17. Mobile bottom navigation (#29)
18. Loading skeletons (#30)
19. Error boundaries (#17)
20. Favicon + meta tags (#22)
21. Code splitting (#19)
22. Proper Leaflet import (#18)

### Phase 5 — Production Readiness (Day 11-14)
23. Add tests + CI (#36)
24. Health check endpoint (#23)
25. Production logging config (#24)
26. Database seed script (#35)
27. Token refresh flow (#27)
28. Consistent error handling (#37)

---

## WHAT DO YOU WANT ME TO DO FIRST?

I'm ready to start implementing fixes immediately. Tell me which phase to begin with, or say **"start from Phase 1"** and I'll fix all critical bugs systematically, stage by stage, with your approval at each gate.
