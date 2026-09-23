"""
TMS Anomaly Detection Microservice
-----------------------------------
Scores each login event using an unsupervised Isolation Forest model.

Features used per event:
  - hour_of_day        (0-23)   -> off-hours logins are more anomalous
  - success             (0/1)    -> failed attempts weighted more anomalous
  - ip_novelty_score    (0-1)    -> how new/rare this IP is for this username
  - recent_failure_rate (0-1)    -> failed attempts / total attempts in last N events for this user

On startup, the model is trained on synthetic "normal" traffic (typical
office-hours logins, mostly successful, familiar IPs). In production this
would instead be trained on your historical tms_security.log data.

Run:
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000
"""
from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest
import numpy as np
from collections import defaultdict
from datetime import datetime

app = FastAPI(title="TMS Anomaly Detection Service")

# ---------------------------------------------------------------------------
# In-memory per-user history (for computing ip_novelty / recent_failure_rate).
# In production, back this with a small Redis/DB-backed rolling window.
# ---------------------------------------------------------------------------
user_ip_history = defaultdict(set)          # username -> set of seen IPs
user_recent_events = defaultdict(list)      # username -> list of 0/1 success (last 20)

MODEL = None


def _train_baseline_model():
    """Train Isolation Forest on synthetic 'normal' login behavior."""
    rng = np.random.default_rng(42)
    n = 500

    # Normal traffic: office hours (8-19), mostly successful, low novelty/failure
    hour = rng.integers(8, 20, n)
    success = rng.choice([1, 0], size=n, p=[0.93, 0.07])
    ip_novelty = rng.beta(1.5, 6, n)          # skewed low = mostly familiar IPs
    failure_rate = rng.beta(1.2, 8, n)        # skewed low = mostly low recent failures

    X = np.column_stack([hour, success, ip_novelty, failure_rate])

    model = IsolationForest(
        n_estimators=200,
        contamination=0.08,   # expect ~8% of events to be flagged as anomalous
        random_state=42,
    )
    model.fit(X)
    return model


@app.on_event("startup")
def startup():
    global MODEL
    MODEL = _train_baseline_model()
    print("[ml-service] Isolation Forest baseline model trained and ready.")


class LoginEvent(BaseModel):
    username: str
    ip: str
    success: int          # 1 or 0
    hour_of_day: int       # 0-23


def compute_features(event: LoginEvent):
    seen_ips = user_ip_history[event.username]
    ip_novelty = 0.0 if event.ip in seen_ips else 1.0
    seen_ips.add(event.ip)

    history = user_recent_events[event.username]
    history.append(event.success)
    if len(history) > 20:
        history.pop(0)
    failures = history.count(0)
    failure_rate = failures / len(history) if history else 0.0

    return np.array([[event.hour_of_day, event.success, ip_novelty, failure_rate]]), ip_novelty, failure_rate


@app.post("/score")
def score_event(event: LoginEvent):
    features, ip_novelty, failure_rate = compute_features(event)

    # decision_function: higher = more normal, lower/negative = more anomalous
    raw_score = MODEL.decision_function(features)[0]
    is_anomaly = bool(MODEL.predict(features)[0] == -1)

    # Normalize raw_score to a 0-1 "anomaly_score" (1 = highly anomalous)
    anomaly_score = float(np.clip(0.5 - raw_score, 0, 1))

    return {
        "anomaly_score": round(anomaly_score, 4),
        "is_anomaly": is_anomaly,
        "features": {
            "hour_of_day": event.hour_of_day,
            "success": event.success,
            "ip_novelty": round(ip_novelty, 2),
            "recent_failure_rate": round(failure_rate, 2),
        },
        "scored_at": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_ready": MODEL is not None}
