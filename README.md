# 🚚 SwiftMove — Local Logistics, Modernized

**The problem:** local moving and delivery services still run on phone calls and
guesswork — customers can't compare providers, and providers can't manage jobs
digitally.

**What I built:** a full-stack logistics platform concept with two distinct user
flows — customers who book moves, and service providers who manage them — designed
the way a real production system is structured.

## Architecture
Browser → Nginx (reverse proxy) → React frontend (Vite + Tailwind)
→ Spring Boot REST API → Database
All services containerized · one-command startup via Docker Compose


| Layer | Tech | Why |
| --- | --- | --- |
| Backend | Java · Spring Boot (Maven) | Industry-standard API layer with clear service boundaries |
| Frontend | React + Vite + Tailwind CSS | Fast dev cycle, utility-first styling |
| Infra | Docker + Docker Compose + Nginx | Identical environments everywhere; single entry point routing `/` to the app and `/api` to the backend |

## What this project demonstrates

- Designing a system around **two user roles** with different needs
- **Backend/frontend separation** with a documented API boundary
- **Containerized delivery** — `docker compose up` brings up the entire stack
- Production-style **Nginx reverse-proxy** configuration

## Run it

```bash
docker compose up --build
