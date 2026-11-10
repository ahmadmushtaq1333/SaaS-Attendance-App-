# Quorum — Project Context & Persistent Agent Memory

> **Note for the AI Agent:** This file is automatically loaded at the start of every chat session. Consult this context immediately so the user never has to re-explain the project architecture, recent progress, or environment conventions. Keep this document updated when milestones or architectural decisions change.

---

## 1. Project Overview

**Quorum** is a production-grade, multi-tenant SaaS Attendance Management System designed for universities and higher-education institutions.

- **Primary Goal:** Eliminate proxy attendance using rotating anti-cheat QR codes, WebAuthn/FIDO2 hardware biometric binding, real-time live feeds, and offline-capable mobile/web scanning.
- **Repository Root:** `d:\IDB Mini Project`

---

## 2. Tech Stack & Architecture

### Backend (`/backend`)
- **Core:** Python 3.12+, Django 6.0, Django REST Framework (DRF).
- **Database:** MySQL (configured with connection pooling, `CONN_MAX_AGE=60`, optimized indexes).
- **Real-Time Communication:** Django Channels (ASGI) providing WebSockets at `/ws/sessions/<id>/` for live teacher roster feeds.
- **Async Processing:** Celery + Redis for asynchronous background task dispatching (bulk tier warning emails, report generation).
- **Authentication & Security:**
  - JWT tokens stored in secure `HTTPOnly` cookies (web) and authorization headers (mobile).
  - Biometric passkeys (WebAuthn / FIDO2 via `py-webauthn`) stored in a MySQL-backed shared cache to prevent multi-worker Gunicorn expiration bugs.
  - Daily device locks (`daily_device_lock.py`) ensuring one device per student per day.
  - Platform-aware auth: differentiates web browser sessions from mobile hardware sessions using the `X-Client-Platform: mobile` header.
- **Deployment:** Railway.

### Web Frontend (`/frontend`)
- **Core:** React 19, Vite 8, Tailwind CSS, React Router.
- **QR Engine:** Client-side HTML5 canvas QR rendering (`qrcode`), reducing network payload by ~95% during rapid rotations.
- **Features:**
  - **Teacher Dashboard:** Live QR sessions, 10s/5s rotation toggle, fullscreen QR projection modal, live scan counter, manual attendance override, risk tier alerts (<25% Critical, 25-50% Severe, 50-75% Warning), one-click async bulk warning emails.
  - **Student Portal:** In-browser camera QR scanner, instant scan confirmation, offline queue with background sync (PWA).
  - **Admin Panel:** Multi-tier institution hierarchy (`Institution -> Department -> Semester -> Section -> Student`), user directory with auto-derived registration numbers, Excel bulk imports with safe dry-run validation.
- **Deployment:** Vercel.

### Mobile App (`/mobile`)
- **Core:** React Native, Expo, TypeScript.
- **Features:** Dark theme polish, 3D intro animation, native camera QR scanning, hardware device fingerprint binding, smooth auth routing.
- **Artifacts:** Pre-built APKs located in `/preview/quorum.apk`.

---

## 3. Recent Milestones & Completed Work

1. **Mobile Platform Decoupling & Auth Routing:**
   - Introduced `X-Client-Platform: mobile` request header.
   - Decoupled mobile hardware device binding from web browser sessions (`0013_clear_stale_device_bindings.py`).
   - Enabled smooth student daily device lock transitions from web to mobile without lockout.
   - Finalized mobile dark theme and visual polish.
2. **Anti-Cheat Dynamic QR Rotation:**
   - Fixed 20s clock skew bug and clamped rotation countdown timers.
   - Added 10s / 5s QR rotation speed toggle in the teacher interface and zoom modal.
   - Client-side canvas QR rendering to replace heavy server-rendered image payloads.
3. **Session Lifecycle & Stability:**
   - Eliminated session termination flicker loop and prevented expired session resurrection.
   - Added adaptive fallback polling if WebSocket stream disconnects.
4. **Celery Task Queue & Live Feed:**
   - Fully integrated Celery workers with Redis for non-blocking email dispatches.
   - WebSocket push stream for instantaneous roster updates.
5. **Passkey & Regression Testing:**
   - 38 automated regression tests covering WebAuthn registration/authentication and session state.
6. **Redis / Channels Production Fallback & Celery Resilience:**
   - Graceful detection of Redis in production environments (Railway); dynamically falls back to `InMemoryChannelLayer` when external Redis is unlinked, eliminating Sentry ConnectionError (Error 111 on 127.0.0.1:6379).
   - Eager in-process task execution for Celery fallback to guarantee bulk email warning dispatches without background worker dependency.
   - Protected ASGI consumer group operations to prevent live WebSocket feed crashes during network hiccups.

---

## 4. Key Conventions & Guidelines for the Agent

- **Never Ask the User for Basic Context:** All tech stack details, ports, deployment targets, and architecture decisions are documented here and in `README.md`.
- **Platform Separation:** When modifying authentication or device binding logic in `backend/apps/accounts/`, always verify whether logic applies to Web (cookie-based + passkey) or Mobile (`X-Client-Platform: mobile` + hardware fingerprint).
- **Performance & Caching:** Maintain database indexing (`db_index=True` on session times/tokens) and avoid heavy server loops in QR rotation paths.
- **Living Context Update:** Whenever a new feature, bugfix, or migration is completed, update Section 3 of this file (`GEMINI.md`) so future chats seamlessly inherit the latest state.
