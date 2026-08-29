# Accounts & Environment

## Providers in use

| Provider | Purpose | Status |
|----------|---------|--------|
| MongoDB Atlas | Primary database | Configured via `mongodb_uri` |
| Gmail SMTP | Email (OTP, delivery) | Configured via `mail_username`/`mail_password` |
| Razorpay | Payments (UPI/Card/COD) | Test keys; live keys pending |
| OpenRouteService (ORS) | Geocoding + road distance | Optional; falls back to Haversine |
| Nominatim (OSM) | Address search (LocationPicker) | Free, no key |
| OSRM (public) | Driver route navigation | Free, no key |
| Leaflet (npm + CDN) | Map rendering | Free |
| Vercel | Frontend hosting (planned) | Currently Netlify |
| Docker Compose | Local development | Set up |

## Environment variables (names only — never values)

### Backend (`backend/.env`)
| Variable | Required | Notes |
|----------|----------|-------|
| `mongodb_uri` | Yes | MongoDB Atlas connection string |
| `jwt_secret` | Yes | ≥32 chars random |
| `jwt_expiration` | Yes | ms (default 86400000 = 24h) |
| `CORS_ORIGIN` | Yes | Comma-separated allowed origins |
| `ors_api_key` | No | Falls back to Haversine if not set |
| `mail_username` | Yes | Gmail address |
| `mail_password` | Yes | Gmail App Password (not account password) |
| `razorpay_id` | No | `NOT_SET` → only COD available |
| `razorpay_secret` | No | `NOT_SET` → only COD available |

### Frontend (`.env` or env vars)
| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_WS_URL` | No | Auto-detected from window.location if not set |

## Quality gate commands (to run before committing)

```bash
# Backend
cd backend && ./mvnw compile -q

# Frontend
cd frontend && npm run build
```

## Credential cleanup (project-end task)
- [ ] Delete this deploy key from GitHub Settings → Deploy Keys
- [ ] Rotate any test API keys that passed through chat
- [ ] Replace `NOT_SET` Razorpay keys with live keys (brief item 5.4)
