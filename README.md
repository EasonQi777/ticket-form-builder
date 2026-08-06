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


