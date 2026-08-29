# Decisions Log

| Date | Decision | Why | State |
|------|----------|-----|-------|
| 2026-08-30 | Removed duplicate DTO files (`RegisterRequest.java`, `LoginRequest.java`, `AuthResponse.java` standalone versions) | Dead code caused import confusion — `AuthController` uses `AuthDtos.*` inner classes which have different fields than the standalone files | Done |
| 2026-08-30 | Removed duplicate `@DeleteMapping("/{id}/cancel")` — kept `@PutMapping` | Two handlers on same URL caused unpredictable routing. Frontend uses PUT. | Done |
| 2026-08-30 | Fixed `spring.mongodb.uri` → `spring.data.mongodb.uri` | Wrong property key; MongoDB connection may not initialize | Done |
| 2026-08-30 | Added `@JsonIgnore` + `@JsonProperty(WRITE_ONLY)` to `User.password` | Admin API was returning BCrypt hashes in `/api/admin/users` | Done |
| 2026-08-30 | Replaced `Math.random()` with `SecureRandom` for OTP generation | `Math.random()` is not cryptographically secure — OTPs were predictable | Done |
| 2026-08-30 | Added `onCancel` to `PaymentGateway` props | `onCancel` was referenced but never declared → runtime crash on payment screen | Done |
| 2026-08-30 | Pass real `useWebSocket()` client to `useNotifications` in both dashboards | `null` was passed, so real-time WebSocket notifications never connected | Done |
| 2026-08-30 | Added `WebSocketAuthInterceptor` (JWT validation on STOMP CONNECT) | WebSocket had zero auth — anyone could subscribe to booking GPS topics | Done |
| 2026-08-30 | Updated frontend `useWebSocket` to send JWT in CONNECT headers | Required by new backend interceptor | Done |
| 2026-08-30 | Replaced admin stats `findAllByStatus().stream().sum()` with MongoDB `$group/$sum` aggregation | Loading ALL delivered bookings into Java memory to sum a field is OOM at scale | Done |
| 2026-08-30 | Added `countByRole` to `UserRepository` | `findAllByRole().size()` loaded all users into memory for a count | Done |
| 2026-08-30 | Created `BookingRequest` DTO; replaced `Map<String, Object>` in `BookingController.create()` | Type-safe input, no unchecked casts, self-documenting API contract | Done |
| 2026-08-30 | Removed dead `apiFetch` import from `authApi.js`; documented why login uses plain fetch | Clean dead code; future maintainers need to know why these don't use apiFetch | Done |
| 2026-08-30 | Removed duplicate `saveSession` from `authApi.js` | Two definitions in two files caused import confusion | Done |
| 2026-08-30 | Added `@Slf4j` + logging to `GlobalExceptionHandler.handleGeneral()` | All unhandled exceptions silently swallowed with no server-side log | Done |
| 2026-08-30 | Added `GET /api/auth/health` endpoint | No health check existed for uptime monitors / orchestrators | Done |
| 2026-08-30 | Changed logging from DEBUG to INFO in production config | DEBUG in production generates massive volumes and may leak sensitive data | Done |
| 2026-08-30 | Added `ErrorBoundary` component wrapping `<App />` | Any component crash caused white-screen with no recovery path | Done |
| 2026-08-30 | Updated footer copyright to `new Date().getFullYear()` | Was hardcoded to 2024 | Done |
| 2026-08-30 | Added favicon (inline SVG) + meta tags to `index.html` | No favicon, no social preview, no description | Done |
| 2026-08-30 | Updated continuity pack (`00_READ_ME_FIRST.md`, `01_PROJECT_STATE.md`, `02_DECISIONS_LOG.md`) | Project must survive agent session death | Done |
