# Counterfactual Hospital Digital Twin

A virtual hospital that lets administrators test "what-if" resource decisions
— moving staff, opening beds, shifting diagnostic workload — and see the
predicted outcome, including cross-department ripple effects, before
applying anything in the real hospital.

Pipeline: **Predict → Simulate what-if → Optimise → Recommend**

The frontend guides a first-time user through three steps — **Situation**
(what's wrong now) → **Options** (what could you try) → **Preview** (what
would happen) — rather than exposing every control on one screen.

## Stack

- **Backend**: FastAPI (Python) — the simulation, ripple-effect, and
  optimisation engine, plus auth, exposed as a REST API with
  auto-generated docs at `/docs`.
- **Frontend**: React + TypeScript (Vite, Tailwind) — the guided
  Situation → Options → Preview flow, an admin panel, and a decision log.
- **Auth**: JWT-based, with an admin-approval workflow for new accounts.
- **Data**: in-memory for the demo (`app/state_store.py`, `app/user_store.py`);
  swap for MongoDB with no other code changes when ready to persist.

Why not MERN: the core of this project is a simulation + combinatorial
optimisation engine, which Python's ecosystem (numpy/scipy/OR-Tools) is far
stronger for than Node's. Swapping Node for FastAPI keeps React on the
frontend and Mongo for storage, while giving the engine a much better home.

## Login

New accounts require admin approval before they can view or use anything.

- **Demo admin**: `admin@hospital.demo` / `admin123`
- **New staff**: use "Request an account" on the login page, then approve
  the request from the Admin panel while logged in as the demo admin.

## Entering real hospital data

Logged in as an admin, the **"Hospital data"** nav item opens a page with
one editable form per department (beds, staff, patient queue, average
service time, and which other departments it depends on). Saving a
department's numbers there updates the live simulation state immediately —
predictions, the ripple map, and the recommendation on the dashboard all
recalculate from whatever was just entered, not from the seed demo data.
This is the same `state_store.py` state the rest of the app reads from, so
there's no separate "real" vs "demo" data path to keep in sync.

## Project layout

```
backend/
  app/
    main.py               FastAPI app + CORS
    models.py              Pydantic models (Department, Action, User...)
    auth.py                 Password hashing (pbkdf2) + JWT helpers
    dependencies.py          get_current_user / require_admin guards
    user_store.py            In-memory users, seeded with the demo admin
    state_store.py           In-memory "live" hospital state
    decisions_log.py         Audit trail of every simulate/optimize/reset call
    data/
      sample_hospital.py    Seed data: 4 departments wired with dependencies
    simulation/
      engine.py              predict_all(), apply_action(), resolve_ripple_effects()
      optimizer.py            generate_candidate_actions(), optimize()
    routers/
      auth.py                 /api/auth/register, /login, /pending, /approve
      hospital.py              /api/hospital/state, /predict, /dependencies, /reset, PUT /departments/{id}
      simulate.py              /api/simulate, /api/optimize, /api/decisions
  tests/
    test_engine.py           6 tests: ripple effects + optimizer guarantees
    test_auth.py             7 tests: register/approve/login/role guards
    test_data_admin.py        7 tests: admin data entry, validation, audit logging
  requirements.txt

frontend/
  src/
    api/client.ts             typed fetch wrapper incl. auth token handling
    context/AuthContext.tsx    current-user session state
    types/index.ts             shared TypeScript types
    lib/
      format.ts                 action labels, scenario preview builder
      status.ts                  status color/label config
    components/
      Header.tsx, StepBar.tsx    nav + step indicator
      DeptCard.tsx                department status card (tap for reason)
      CapacityChart.tsx           bed/staff capacity bar chart
      WaitRadial.tsx               per-department wait-time gauge
      WaitComparisonChart.tsx      before/after bar chart
      DeltaRow.tsx                  per-department before/after row
      RippleMap.tsx                 dependency graph visualization
      Icons.tsx
    pages/
      LoginPage.tsx, SignupPage.tsx, PendingPage.tsx
      SituationPage.tsx, ExplorePage.tsx, PreviewPage.tsx
      AdminPage.tsx                 approve pending users
      ManageDataPage.tsx             admin: enter real hospital data
      DecisionsLogPage.tsx          audit trail view
    App.tsx
```

## Running it Locally

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Visit `http://localhost:8000/docs` for interactive API docs.

Run the test suite:
```bash
cd backend
pytest -v
```

**frontend**
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173`. It talks to the backend at
`http://localhost:8000` by default — override with a `.env` file setting
`VITE_API_URL` if you deploy the backend elsewhere.

## How the ripple effect works

Departments declare what they `depends_on` (e.g. Emergency depends on
General Ward having open beds to admit into). `predict_department()` adds a
"boarding penalty" to a department's wait time whenever a department it
depends on is over ~85% bed occupancy, and generates a plain-language
`status_reason` grounded in that same math (no canned copy).
`resolve_ripple_effects()` runs after every action and lets departments
with newly-freed beds admit waiting/boarding patients from the departments
that depend on them — so "open 2 beds in General Ward" visibly reduces
Emergency's predicted wait time in the same simulation. The Ripple Map on
the dashboard visualizes this dependency graph directly.

## Features worth highlighting in a demo

- **Guided flow, not a dashboard dump** — Situation → Options → Preview,
  so a first-time user always knows what to look at next.
- **Ripple map** — a live visual of which departments block which others.
- **Honest, derived explanations** — every "why" shown in the UI (status
  reasons, scenario summaries, the "see how this was calculated" panel) is
  computed from the same numbers driving the simulation, not separately
  authored copy that could drift from reality.
- **Role-based auth with an approval workflow** — new accounts start
  pending; an admin approves them from a dedicated panel. Good for
  demonstrating access control live.
- **Decision audit log** — every simulate/optimize/reset call is recorded
  with who ran it and what it predicted.
- **Transparent-by-design model** — the Predict stage is a deterministic
  queueing formula, not a black box, which is explicitly surfaced in the
  UI rather than hidden behind a fake confidence interval.

## Post-hackathon Roadmap

- Replace the deterministic `predict_department()` formula with a trained
  model (e.g. gradient boosting on historical admissions/wait-time data)
  while keeping the same `DepartmentPrediction` contract.
- Swap `state_store.py` / `user_store.py`'s in-memory dicts for MongoDB
  (`motor` is already in `requirements.txt`) for persistence across restarts.
- Move the JWT secret to a real secret manager and swap pbkdf2 for a
  managed auth provider before this touches real hospital data.
- Expand from 4 to N departments and let hospitals configure their own
  dependency graph instead of the hardcoded seed data.
- Replace the brute-force optimiser with a proper solver (OR-Tools /
  linear programming) once the action space grows past what brute force
  can search in real time.
