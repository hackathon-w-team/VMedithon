# Project plan — Counterfactual Hospital Digital Twin

## 1. Vision

A live digital twin of a hospital that continuously predicts operational
problems (ED wait-time spikes, bed shortages) and lets administrators test
"what-if" interventions — move a nurse, open two beds, shift diagnostic
load — before applying them in the real hospital, with cross-department
ripple effects forecast automatically.

One-line pitch: *"We are building a virtual hospital that lets
administrators test 'what-if' decisions and find the best way to reduce
waiting times and optimise beds, staff and resources before making those
decisions in the real hospital."*

## 2. Scope

### In scope for the hackathon (this build)
- 4-department simulated hospital (Emergency, ICU, General Ward,
  Radiology) with realistic capacity/dependency wiring.
- Deterministic **Predict** engine (queueing-style wait-time formula).
- **Simulate**: apply any combination of 3 action types (move staff, open
  beds, shift workload) and see the predicted result.
- **Ripple effect**: departments propagate capacity changes to whichever
  departments depend on them.
- **Optimise**: brute-force search over a generated action pool, ranked by
  a weighted score (wait time, critical-department count, action cost).
- **Recommend**: top-ranked scenario surfaced with runner-up alternatives.
- React dashboard: live department cards, scenario builder, comparison
  chart, recommendation banner.
- Automated tests locking in the ripple-effect and optimiser behaviour.

### Explicitly out of scope for the hackathon (roadmap only)
- Real hospital data integration / EHR connections.
- Learned (ML) prediction model — the current predictor is a transparent
  formula, which is actually a demo advantage: every number is explainable.
- Persistence (MongoDB is wired for later; the demo runs in-memory).
- Auth, multi-user, deployment hardening.

## 3. Architecture

Predict → Simulate → Optimise → Recommend, with a ripple engine that runs
after every state change and a layered stack underneath (React → FastAPI →
MongoDB, the last currently stubbed as in-memory). See the diagram shared
earlier in this conversation.

## 4. Data model

- **Department**: id, name, beds_total/occupied, staff_total/assigned,
  patients_waiting, avg_service_time_min, depends_on[].
- **Action**: type (move_staff / open_beds / shift_workload), from/to
  department, amount.
- **DepartmentPrediction**: department, predicted_wait_min,
  predicted_occupancy_pct, status (ok/warning/critical).
- **ScenarioResult**: actions, predictions, score, total_wait_min,
  max_wait_min, critical_departments.

## 5. Team workflow (parallelisable tracks)

These four tracks can run mostly independently after the data model above
is agreed on:

1. **Simulation engine** (Python) — predict formula, ripple resolution,
   action application. Already built in `backend/app/simulation/`.
2. **Optimisation** (Python) — candidate generation + search/scoring.
   Already built in `backend/app/simulation/optimizer.py`.
3. **API layer** (Python) — FastAPI routers, request/response models.
   Already built in `backend/app/routers/`.
4. **Frontend** (React) — dashboard, scenario builder, results, and
   recommendation UI. Already built in `frontend/src/`.

Suggested split if your team has 3-4 people: one owns simulation + tests,
one owns the optimiser + scoring model tuning, one owns the API + data
model, one owns the frontend + demo polish. All four can work in parallel
against the `models.py` contracts once they're fixed.

## 6. Suggested timeline (2-day hackathon)

**Day 1 morning** — Lock the data model (departments, actions, dependency
graph). Scaffold backend + frontend repos. Seed demo hospital data.

**Day 1 afternoon** — Build the Predict formula and ripple engine; write
tests for the ripple effect immediately (it's the differentiator — don't
let it go untested). Stub the frontend dashboard against mock data.

**Day 1 evening** — Wire frontend to the real `/predict` and `/simulate`
endpoints. Confirm the scenario builder round-trips correctly.

**Day 2 morning** — Build the optimiser (candidate generation + scoring).
Add the recommendation banner + alternatives UI.

**Day 2 afternoon** — Polish: color states, loading/error handling, reset
button, demo script rehearsal. Buffer time for bug fixes.

**Day 2 evening** — Freeze the build, rehearse the pitch + live demo twice.

## 7. Demo script for judges

1. Open the dashboard — point out Emergency is already flashing "under
   pressure" from the Predict stage, with no action taken yet.
2. Open the scenario builder, manually construct "open 2 beds in General
   Ward," run it — show the chart: Emergency's wait time drops even though
   you touched a different department. That's the ripple effect.
3. Click "Recommend the best fix" — show the optimiser proposing a
   different, better-scoring combination (e.g. moving staff), plus the
   runner-up alternatives it rejected and why (score comparison).
4. Reset the demo data and take the next question live — the whole loop
   runs in real time, nothing is pre-recorded.

## 8. Risks & mitigations

- **"Isn't this just a dashboard?"** — Lead with the what-if simulator and
  ripple effect live, not the department cards; that's what separates this
  from a reporting tool.
- **Judges probe the prediction formula's realism** — be upfront that the
  Predict stage is currently a transparent queueing approximation by
  design (explainable for a live demo), with a clear swap-in point for a
  trained model post-hackathon (same `DepartmentPrediction` contract).
- **Optimiser feels like a black box** — the "alternatives considered"
  list exists specifically so you can show your work, not just the answer.
- **Scope creep** — the 4-department, 3-action-type scope is deliberately
  small so the ripple effect and optimiser are rock solid rather than wide
  and shallow.

## 9. Post-hackathon roadmap

- Publication: the ripple-effect resolution algorithm and the scoring
  function are the two pieces with genuine methodological content worth
  writing up.
- Patent angle: the specific mechanism of resolving cross-department
  ripple effects via dependency-graph propagation combined with
  combinatorial what-if scoring is the novel part to characterise
  precisely before filing.
- Product: swap in MongoDB persistence, add auth, replace the formula
  with a trained model, scale past 4 departments, and pilot against a
  real (or richly simulated) hospital's operational data.
