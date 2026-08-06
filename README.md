# Ticket Form Builder

A standalone, runnable extraction from the mediaJira monorepo containing only:

- **Sign-in / sign-up** (email+password and Google OAuth, JWT-based)
- **A simple user dashboard**, with an at-a-glance summary and a link into...
- **The ticket form builder** - CSM admin-configurable form builder (drag-and-drop
  field editor, project scoping, assignment to experience groups/support
  channels) plus the public portal where customers submit requests against
  those forms.

Everything else from mediaJira (tasks, decisions, campaigns, spreadsheets,
meetings, chat, billing, every ad-platform integration, etc.) was
intentionally left out. See "Known simplifications" below for exactly what
was trimmed, stubbed, or simplified along the way.

```
ticket-form-builder/
├── backend/   Django project (Django 4.2, DRF, Channels)
└── frontend/  Next.js 14 app router project
```

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate       # macOS/Linux

pip install -r requirements.txt
copy .env.example .env           # Windows; `cp` on macOS/Linux - defaults work out of the box
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

That's it for local dev - with no `.env` changes at all, the backend boots
against a local `db.sqlite3` file (no Postgres/Redis/Kafka required) and
serves on `http://localhost:8000`. See `.env.example` for every variable
it reads (Postgres connection, CORS origins, Google OAuth credentials, the
organization-access-token secret/encryption keys, email settings).

To run the copied test suite:

```bash
pytest
```

### Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local   # Windows; `cp` on macOS/Linux
npm run dev
```

Serves on `http://localhost:3000` and talks to the backend via
`NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`). `npm run build`
produces a production build; `npx tsc --noEmit` type-checks the project.

### Docker

Runs everything (Postgres + backend + frontend) in one command - no local
Python/Node setup required:

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Postgres: `localhost:5432` (db `ticket_form_builder`, user `postgres`,
  password `postgres` by default)

The backend container runs migrations automatically on startup. Create an
admin user once the stack is up:

```bash
docker compose exec backend python manage.py createsuperuser
```

All the defaults baked into `docker-compose.yml` mirror `backend/.env.example`
and `frontend/.env.local.example`. To override any of them (Google OAuth
credentials, `SECRET_KEY`, SMTP settings, etc.), create a `.env` file next to
`docker-compose.yml` - Compose loads it automatically - and set the same
variable names.

Note: the backend container serves over plain WSGI (`gunicorn`), same as
`manage.py runserver` in local dev, so the csm websocket notifications are a
no-op there too (see "Known simplifications" below). Swap the container's
`CMD` for `daphne`/`uvicorn` if you need real ASGI/websocket support.

To tear down (and optionally wipe the Postgres volume):

```bash
docker compose down        # keep data
docker compose down -v     # also delete the Postgres volume
```

### First-run walkthrough

1. Register an account at `/register` (or log in at `/login`).
2. You land on `/dashboard`.
3. Because ticket forms are project-scoped, create/select a project at
   `/select-project` first (registering auto-creates an organization for
   you; "Create Project" uses the classic step-by-step form).
4. From the dashboard, click through to **Ticket Form Builder**
   (`/admin/ticket-forms`) to build a form.
5. Create an **Experience Group** at `/admin/experience-groups`, assign the
   ticket form to it, and publish it. Its preview page
   (`/admin/experience-groups/[id]/preview`) is the public request-form URL
   customers submit against - no login required.
6. To test the CSM ticket workflow (claim/reply/resolve), create a
   `CustomerOrganisation` via Django admin (`/admin/`) first - see "Known
   simplifications" below.

## App mapping (mediaJira → this project)

| Here | mediaJira app(s) | Notes |
|---|---|---|
| `backend/core` | `core` | Orgs, projects, members, invitations, RBAC scaffolding. Copied verbatim, then trimmed (see below). |
| `backend/authentication` | `authentication` | Login/register/JWT/Google OAuth. `models.py` is empty; operates on `core.CustomUser`. |
| `backend/access_control` | `access_control` | Role/Permission RBAC + `AuthorizationMiddleware`. Copied verbatim. |
| `backend/customer` | `customer` | `CustomerOrganisation`/`Customer` - the CSM's client orgs and portal customer accounts. Copied verbatim. |
| `backend/csm` | `csm` | The ticket form builder itself: `TicketForm`, `TicketFormField`, `TicketFormAssignment`, `TicketFormSubmission`, `Ticket`, `Queue`, `SLAPolicy`, `SupportChannel`, agent conversations. Copied verbatim. |
| `backend/experience_group` | `experience_group` | `ExperienceGroup` + the public request-form/submit-request endpoints. Copied verbatim. |
| `backend/notifications` | `notifications` (partial) | **Not** the real app - a tiny compatibility shim (`action_urls.py`, `models.py`, `services.py`) so `core`'s invite/removal flows still import successfully. No-ops, no DB table. |
| `backend/authentication/org_token.py` | `stripe_meta/permissions.py` (one function) | Just `generate_organization_access_token`, copied verbatim since `stripe_meta` itself is out of scope. |
| `backend/core/ws_auth_middleware.py` | `asset/middleware.py` | JWT websocket auth middleware, copied verbatim since `asset` itself is out of scope. |
| `backend/dashboard` | *(new)* | Small new app: one endpoint, `GET /api/dashboard/summary/`, backing the frontend dashboard's stat tiles. |
| `frontend/src/app/(auth)` | same | Login, register, forgot/reset/set password, verify, accept-invitation, unauthorized. |
| `frontend/src/app/(portal)` | same | Public customer ticket-submission/login/my-tickets portal. |
| `frontend/src/app/(project)/admin/ticket-forms`, `admin/experience-groups`, `select-project`, `dashboard` | same (`dashboard` is new) | Ticket form builder admin UI + project selection + the new dashboard page. |
| `frontend/src/components/ticket-form` | same | The entire form builder + renderer + public portal variant. |
| `frontend/src/components/dashboard/DashboardLayout.tsx` | same name, rewritten | Trimmed to a simple sidebar (Dashboard / Ticket Form Builder / Logout) - see below. |

Everything else in mediaJira (`task`, `decision`, `spreadsheet`, `campaign`,
`meetings`, `chat`, `stripe_meta`, `teams`, every ad-platform integration,
Kafka/Celery messaging, etc.) has no counterpart here.

## Known simplifications

Compared to the original mediaJira app, this extraction:

- **No Kafka/Celery/Redis.** `core/messaging/` (the Kafka signal-wiring
  layer), Celery, `celerybeat`, and Redis-backed caching/channel layers were
  removed entirely - none of the Kafka domains it wired up (campaign, task,
  decision, asset, etc.) exist in this project anyway. Django Channels is
  still installed and configured with the in-memory channel layer (no Redis
  needed) so `csm`'s realtime ticket/conversation notifications still work
  for a single dev server.
- **No billing/Stripe.** The `stripe_meta` app is out of scope. Seat-cap
  enforcement on project invites was removed (invites are unlimited here),
  and `Organization.plan_id` was dropped from the user profile API response.
  Only the one JWT-generation function it exposed
  (`generate_organization_access_token`) was copied over, since `core`'s
  login flow depends on it.
- **No in-app notifications.** The `notifications` app (feed, SSE push,
  email digesting) is out of scope; `core`'s "notify the invited/removed
  user" calls now hit a small no-op compatibility shim (see app-mapping
  table) instead of writing real `Notification` rows. Nothing is silently
  broken - invites/removals still work, there's just no notification badge.
- **No project-bound calendars.** The `calendars` app is out of scope;
  `core.utils.project_calendars` (auto-provisioning a calendar per project,
  syncing member access to it) is now a set of no-ops.
- **No "Quick Start" project wizard.** mediaJira could AI-draft a project
  (tasks, decisions, a Miro board, a spreadsheet) from a campaign brief.
  That whole subsystem (`core/services/quick_start/`, its two endpoints,
  and the frontend's "Quick Start vs. Classic" choice on project creation)
  was removed since it only ever produced content in apps this project
  doesn't have. Project creation always uses the classic step-by-step form.
- **No portal realtime broadcast leg.** `csm`'s agent-reply broadcast to the
  public customer portal websocket group (via the `portal` app) was
  dropped, since the `portal` app (a *different* websocket app from the
  `(portal)` Next.js route group kept here) is out of scope. The message is
  still saved and returned in the API response either way - only the
  "customer sees the reply pop in without refreshing" leg is gone. All of
  `csm`'s `channel_layer.group_send()` calls are now wrapped in a
  best-effort helper (`csm/views.py: _broadcast`) so a missing/broken
  channel layer never breaks the HTTP request.
- **No teams.** The `teams` app is out of scope; `authStore`'s
  post-login team-fetch and the logout-time chat-state clear (`chatStore`,
  also out of scope) were removed. `userTeams`/`selectedTeamId` are always
  empty - nothing in this project reads them.
- **No task app.** The account-deletion flow no longer detaches
  Task ownership (there's no Task model to detach from).
- **Customer-org test data via Django admin only.** The
  `admin/customers` frontend page pulled in `RegionAPI`/`OrganisationAPI` -
  separate admin features that are out of scope here - so it wasn't copied.
  Create `CustomerOrganisation` records via `/admin/` (Django admin) for now.
- **ASGI trimmed to just `csm`'s own websocket route** (agent ticket/
  conversation notifications). The original also routed websockets for
  `asset`/`chat`/`meetings`/`portal`, none of which exist here. Plain
  `manage.py runserver` (WSGI) works fine for local dev too - the ASGI app
  only matters if you want the realtime notify-on-reply behavior.
- **SQLite by default.** `DATABASES` falls back to a local `db.sqlite3` file
  unless `DB_HOST` is set in `.env`, in which case it uses Postgres. No
  Postgres/Docker required to try the project out.
- **Google OAuth needs your own credentials.** `GOOGLE_CLIENT_ID`/
  `GOOGLE_CLIENT_SECRET` are blank by default; without them the "Sign in
  with Google" button will fail, but email/password auth works regardless.
  Get credentials from the Google Cloud Console if you want it.
- **No Prometheus/OpenTelemetry.** `django_prometheus` and the OTel tracing
  block were removed along with everything they were instrumenting.
- **`npm run build`'s `NODE_ENV=production` prefix was dropped** from
  `package.json` (Windows `cmd.exe` doesn't understand inline env-var
  assignment, and `next build` sets production mode internally regardless).
  Other scripts (e.g. `npm test`) still use that syntax and may need
  `cross-env` or a Unix-like shell (Git Bash, WSL) on Windows.
- **A couple of copied backend tests were trimmed or removed** where they
  exercised functionality that's genuinely gone: `core/tests/test_slug_lookups.py`,
  `test_notifications.py`, `test_seat_cap_invite.py`, and every
  `test_quick_start_*.py` file were removed outright (they tested
  task/decision/notification/billing/quick-start behavior with no
  counterpart here); a handful of individual test methods in
  `test_project_members.py`, `test_projects.py`, `test_project_invitations.py`,
  and `csm/tests/test_support_channels.py` were removed where they asserted
  against the real `Notification`/`Calendar` models or the excluded
  `portal` app's routes. Everything else passes (`pytest` in `backend/`).
