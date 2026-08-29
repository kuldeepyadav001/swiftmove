# SwiftMove — Agent Continuity Guide

## What is this?
SwiftMove is a full-stack logistics platform: Spring Boot 4.x API + React/Vite frontend, containerized with Docker Compose + Nginx. Dual customer/provider flows with admin dashboard.

## Repo
- **GitHub**: https://github.com/kuldeepyadav001/swiftmove
- **Branch**: main
- **Last commit**: 75e2e26

## How to resume work
1. Read `01_PROJECT_STATE.md` for exact current state
2. Read `02_DECISIONS_LOG.md` for all decisions made
3. Read `03_OUTSTANDING_TASKS.md` for what needs doing
4. Read `04_PLAN_DEVIATIONS.md` for known divergences
5. Read `05_ACCOUNTS_AND_ENV.md` for env var names (never values)

## Tech Stack
| Layer | Tech | Version |
|-------|------|---------|
| Backend | Java + Spring Boot | 21 / 4.0.5 |
| Frontend | React + Vite + Tailwind | 18.2 / 8.0 / 3.4 |
| Database | MongoDB (Atlas) | — |
| Auth | JWT (jjwt 0.12.6) | Bearer tokens |
| Maps | Leaflet + Nominatim + OSRM | Free, no API key |
| Payments | Razorpay | Test mode |
| Real-time | STOMP over WebSocket | @stomp/stompjs |
| Email | Spring Mail (Gmail SMTP) | — |
| Routing | ORS (optional, falls back to Haversine) | — |
| Infra | Docker + Docker Compose + Nginx | — |

## Non-negotiable working rules
1. Never deploy without explicit client approval
2. Database migrations first, then code
3. Secrets never in repo/chat
4. Verify production independently after deploy
5. Record every decision in the decisions log the same turn
