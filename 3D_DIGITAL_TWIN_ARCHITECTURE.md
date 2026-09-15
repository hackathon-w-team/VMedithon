# 3D Digital Twin Architecture & Data Contract

This document provides complete architectural specifications, data contract mappings, and operational guides for the **Counterfactual Hospital 3D Digital Twin** module.

---

## 1. Executive Summary & Philosophy

The 3D Digital Twin is an **isolated, modular visualization layer** built on top of the Counterfactual Hospital Digital Twin system.

- **Non-Invasive**: Zero changes to the backend simulation engine, optimization algorithms, API contracts, auth, or database layers.
- **Source of Truth**: The existing FastAPI backend remains the single source of truth. The 3D module does not simulate; it translates, represents, and renders operational reality and counterfactual outcomes.
- **Explainable & Derived**: All visual indicators, bottleneck badges, and reasons are derived directly from the mathematical models of the hospital system (deterministic queueing and cross-department ripple propagation).

```
┌────────────────────────────────────────────────────────┐
│         EXISTING HOSPITAL SYSTEM (FastAPI :8000)       │
│  /api/hospital/state · /predict · /dependencies · etc. │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               3D DATA SERVICE & ADAPTER                │
│    apiProvider.ts / demoAdapter.ts / 3DDataService.ts  │
│    Transforms API models -> Normalized Hospital3DState │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 3D DIGITAL TWIN MODULE                 │
│  Three.js WebGL Campus · Dynamic Zones · Beds & Staff  │
│  Queues · Animated Flow Particles · Ripple Effect Arcs │
│  Command Center UI · Camera Controls · Scenario Deltas │
└────────────────────────────────────────────────────────┘
```

---

## 2. Existing API Endpoints Used

The 3D module communicates directly with the following existing backend endpoints:

| Endpoint | Method | Response Type | Purpose |
|---|---|---|---|
| `/api/hospital/state` | `GET` | `HospitalState` | Real-time snapshot of hospital departments, bed capacities, staffing, and waiting patients. |
| `/api/hospital/predict` | `GET` | `DepartmentPrediction[]` | Deterministic queueing forecasts: predicted wait time, occupancy %, status (`ok` / `warning` / `critical`), and grounded `status_reason`. |
| `/api/hospital/dependencies`| `GET` | `DependencyEdge[]` | Graph of inter-department dependencies (e.g. Emergency $\rightarrow$ General Ward). |
| `/api/optimize` | `POST` | `ScenarioResult[]` | Combinatorial optimization recommendations (move staff, open beds, shift workload) with predicted scores and wait time relief. |
| `/api/simulate` | `POST` | `ScenarioResult` | Simulates custom user-selected actions. |

---

## 3. Data Transformation & Schema Mappings

### 3.1 Department Mapping
Existing `Department` & `DepartmentPrediction` $\rightarrow$ Normalized `Department3D`:

| Existing Field | 3D Field | Transformation / Visual Representation |
|---|---|---|
| `id` | `id` | Unique identifier ('emergency', 'icu', 'general_ward', 'radiology', or dynamic id). |
| `name` | `name` | Formatted name on 3D floating canvas signboard. |
| Computed | `type` | Evaluates keywords in name/id (`emergency`, `icu`, `ward`, `radiology`, `operating_room`, `lab`, `pharmacy`, or `general`). |
| Computed | `gridX`, `gridZ` | Physical world coordinates on the 3D hospital campus grid. |
| `beds_total` | `bedsTotal` | Total physical bed units generated in the room. |
| `beds_occupied` | `bedsOccupied` | Number of beds rendered with occupied telemetry, monitors, and linens. |
| `bed_occupancy_pct` | `bedOccupancyPct` | Visual occupancy gauge, color threshold: $\ge 85\%$ triggers warning/congestion outline. |
| `staff_total` | `staffTotal` | Baseline staffing complement for the department. |
| `staff_assigned` | `staffAssigned` | Number of 3D medical personnel figures (doctors/nurses) placed in the zone. |
| `patients_waiting` | `patientsWaiting` | Number of patient figures placed in the waiting lounge chairs/queue. |
| `avg_service_time_min`| `avgServiceTimeMin` | Displayed in inspection drawer; drives flow particle velocity. |
| `predicted_wait_min` | `predictedWaitMin` | Wait time gauge: $<45\text{m}$ (Green), $45-90\text{m}$ (Amber), $\ge 90\text{m}$ (Red). |
| `status` | `status` | Glow border color around the department perimeter slab and badge. |
| `status_reason` | `statusReason` | Surfaced in the "Operational Diagnosis" inspector panel. |
| `depends_on` | `dependsOn` | Generates inter-department transit corridors and dependency ripple lines. |

### 3.2 Resource Mapping
Existing hospital numbers $\rightarrow$ `Resource3D`:
- **Inpatient Beds**: Rendered for all departments where `beds_total > 0`. Occupied beds feature glowing patient vital monitors and IV poles.
- **Diagnostic Suites**: For `radiology`, procedural CT Scanner gantries, MRI units, and technician multi-monitor consoles are rendered.
- **Critical Care Equipment**: For `icu`, mechanical ventilators and telemetry displays are attached to beds.
- **Triage Stations**: For `emergency`, emergency resuscitation and triage bays are rendered near the ambulance entrance.

### 3.3 Patient Flow Mapping
Existing `DependencyEdge[]` & patient queues $\rightarrow$ `PatientFlow3D`:
- **Ambulance Bay $\rightarrow$ Emergency**: Flow intensity scales with incoming Emergency queue.
- **Emergency $\rightarrow$ Radiology**: Diagnostic throughput pathway.
- **Emergency $\rightarrow$ General Ward**: Admission transit pathway.
- **ICU $\rightarrow$ General Ward**: Step-down transfer pathway.
- **Animated Particles**: Glowing pulses travel along 3D Catmull-Rom spline curves. Flow turns amber/red when the destination department is over capacity ($>85\%$).

### 3.4 Ripple Effect Mapping
When a candidate action is applied (or when baseline bottlenecks exist):
- **Staff Reallocation** (`move_staff`):
  - Originating department gives up staff $\rightarrow$ amber energy pulse.
  - Destination department receives staff $\rightarrow$ emerald energy pulse with floating delta indicator (`+2 Staff`, `-46m wait`).
- **Bed Expansion** (`open_beds`):
  - Frees capacity in General Ward $\rightarrow$ glowing green ripple wave propagates back to Emergency, illustrating boarding relief.
- **Boarding Pressure**:
  - In baseline state, if General Ward is $>85\%$ occupied, red/amber blocking pressure waves visually emanate toward Emergency and ICU.

---

## 4. Architecture & Module Structure

```
frontend/src/digital-twin-3d/
├── adapters/
│   ├── types.ts                  # Normalized 3D state contracts
│   ├── hospital3DAdapter.ts      # Core transformer from API models to 3D state
│   ├── apiProvider.ts            # Production data provider calling real backend
│   └── demoAdapter.ts            # Fallback demo provider with offline seed data
├── data/
│   └── 3DDataService.ts          # Polling coordinator, cache, and subscriber events
├── scene/
│   ├── HospitalScene.ts          # Three.js canvas controller, camera tweening, raycaster
│   ├── DepartmentMeshBuilder.ts  # Campus ground, architectural glass walls, signboards
│   ├── BedsBuilder.ts            # 3D hospital beds, CT scanners, MRI units, consoles
│   ├── StaffBuilder.ts           # 3D doctors, nurses, technicians, shortage icons
│   ├── PatientQueueBuilder.ts    # 3D waiting chairs, patient figures, queue banners
│   ├── PatientFlowRenderer.ts    # Animated 3D spline curves and glowing flow particles
│   └── RippleEffectRenderer.ts   # 3D ripple effect arcs, ground waves, delta badges
├── ui/
│   ├── CommandCenterHeader.tsx   # Top bar with live indicator, state switcher, camera presets
│   ├── DepartmentDetailsPanel.tsx# Inspection drawer with capacity, staff, and diagnosis
│   ├── ScenarioComparisonPanel.tsx# Side-by-side / delta before & after comparison
│   ├── RecommendationBanner.tsx  # Floating AI recommendation overlay
│   ├── BottleneckAlertPanel.tsx  # Highlights critical bottlenecks and downstream blockers
│   └── TimelineControl.tsx       # Scrubber with steady-state model explanation
└── DigitalTwin3DView.tsx         # Master component integrating WebGL canvas & UI overlays
```

---

## 5. User Interaction & Camera Controls

| Action | Control | Result |
|---|---|---|
| **Rotate View** | Left Click + Drag | Orbit around the hospital campus. |
| **Pan View** | Right Click + Drag (or Shift + Drag) | Translate the camera horizontally. |
| **Zoom** | Scroll Wheel (or Pinch) | Smoothly zoom in to examine beds/figures or zoom out to full campus. |
| **Inspect Department** | Click on any Department mesh | Focuses camera and opens the Operational Diagnosis drawer. |
| **Camera Presets** | Header Preset Buttons | Smoothly animates camera to Overview, Emergency, ICU, Ward, Radiology, or 2D Top-Down. |
| **Scenario Switcher** | Current / Recommended / Scenario buttons | Visually transitions the 3D hospital into the predicted counterfactual state. |
| **Bottleneck View** | `⚠ Bottlenecks` button | Highlights congested zones and blocking ripple paths. |
| **Toggle Ripples / Flows**| `⚡ Ripples` / `〰 Flows` buttons | Toggles animated flow tubes and ripple arches. |

---

## 6. Error Handling & Demo Fallback

1. **Active Health Monitoring**: If the backend API becomes unreachable, the 3D view does not crash.
2. **Graceful UI Notice**: A non-intrusive alert displays *"Hospital data connection unavailable"*.
3. **Retry & Demo Mode**: The user can click **Retry Connection** or switch to **Demo Data** at any time.
4. **Transparency**: The live status badge clearly indicates `LIVE TWIN` vs `DEMO ENVIRONMENT` so users never confuse real hospital data with synthetic data.

---

## 7. How to Run & Verify

### Running with Docker Desktop
```powershell
# From project root:
docker compose up -d

# Verify containers are running:
docker compose ps
```
- **Web App**: Open [http://localhost:5173](http://localhost:5173)
- **Login**: `admin@hospital.demo` / `admin123`
- **Navigate**: Click **"3D Digital Twin"** in the top navigation bar.

---

## 8. Extensibility Guide

### 8.1 How to Add a New Department
1. Add the department to the backend (via the **Hospital Data** admin page, the Excel/CSV spreadsheet import in **Data Feed**, or directly in `sample_hospital.py`):
   ```python
   Department(
       id="operating_room",
       name="Operating Theatre Suite",
       beds_total=6,
       beds_occupied=4,
       staff_total=8,
       staff_assigned=8,
       patients_waiting=3,
       avg_service_time_min=120,
       depends_on=["icu", "general_ward"],
   )
   ```
2. The 3D module **automatically discovers** the new department:
   - `calculateGridPositions()` in `hospital3DAdapter.ts` dynamically places it on the campus grid.
   - `resolveDepartmentType()` matches `'operating'` $\rightarrow$ assigns emerald surgical theme.
   - `BedsBuilder` and `StaffBuilder` automatically generate its beds, staff, and queues.
   - `PatientFlowRenderer` connects its declared `depends_on` dependencies.

### 8.2 How to Add a New Resource Type
1. Define the resource in `Resource3D` interface in `types.ts`.
2. In `BedsBuilder.ts`, add a custom builder method (e.g. `populateRoboticSurgerySuite()`).
3. Wire the builder in `BedsBuilder.buildResources()` based on department type or resource catalog.

### 8.3 How to Connect Another Hospital Backend
1. Create a new provider implementing `HospitalDataProvider` in `adapters/`:
   ```typescript
   export class FHIRHospitalProvider implements HospitalDataProvider {
     async getHospitalState(): Promise<Hospital3DState> {
       // Fetch from HL7 FHIR or third-party EHR API
       // Map to Hospital3DState
     }
     // ...
   }
   ```
2. Plug the new provider into `3DDataService.ts`. The entire 3D visualization layer will render the external hospital without modification.
