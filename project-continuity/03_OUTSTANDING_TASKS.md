# Outstanding Tasks

## Remaining from audit (not yet done)

### Backend
| # | Task | Priority | Notes |
|---|------|----------|-------|
| B1 | Move KYC images from Base64 in docs → GridFS | Critical | Will hit 16MB doc limit; GridFS configured but unused |
| B2 | Add rate limiting to auth endpoints | High | Brute-force protection needed |
| B3 | Add KYC status check to `BookingService.accept()` | High | UI-only check; server should reject unverified drivers |
| B4 | Implement token refresh flow | Medium | Currently users must fully re-login when JWT expires |
| B5 | Add pagination to all list endpoints | High | `findAllByOrderByCreatedAtDesc()` returns unbounded lists |
| B6 | Client-side image compression before upload | Medium | Phone photos can be 5-15MB; compress to ~1200px, q=0.7 |
| B7 | Seed rate cards idempotently on startup | Low | Currently created lazily on first fare calc |

### Frontend
| # | Task | Priority | Notes |
|---|------|----------|-------|
| F1 | Split `App.jsx` (1,803 lines) into per-page files + `React.lazy()` | High | Biggest perceived-speed win; also biggest diff |
| F2 | Add code splitting / lazy loading of pages | High | All components imported eagerly |
| F3 | Replace Leaflet CDN script injection with npm import | Medium | Already in package.json; CDN adds round trip, can fail |
| F4 | Mobile bottom navigation for dashboards | Medium | Industry standard; current top nav awkward on mobile |
| F5 | Loading skeletons (not just spinners) | Low | Better perceived performance |
| F6 | Remove unused deps: `react-router-dom`, `axios` | Low | Both in package.json but unused |
| F7 | Consistent error handling pattern | Low | Mix of `alert()`, toast, inline error, no standard |
| F8 | Merge duplicate `getMyBookings()` call sites | Low | ~4 near-identical `.then().catch().finally()` blocks |
| F9 | Merge numeric coercion helpers in BookingService | Low | `toLong`, `toDouble`, `toDoubleOrNull` — different null semantics prevent full merge |

### Infrastructure (after code fixes)
| # | Task | Priority | Notes |
|---|------|----------|-------|
| I1 | Docker image rebuild (reflect cleaned state) | High | Brief item 5.1 |
| I2 | Netlify → Vercel migration | High | Brief item 5.2 |
| I3 | GitHub Actions CI/CD pipeline | High | Brief item 5.3 |
| I4 | Activate live Razorpay keys | Medium | Brief item 5.4 — only after app stable |
