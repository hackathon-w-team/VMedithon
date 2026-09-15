from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, data_feed, hospital, notifications, simulate

app = FastAPI(
    title="Counterfactual Hospital Digital Twin API",
    description="Predict -> Simulate what-if -> Optimise -> Recommend, "
    "with cross-department ripple-effect forecasting.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the deployed frontend origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(hospital.router)
app.include_router(data_feed.router)
app.include_router(simulate.router)
app.include_router(notifications.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
