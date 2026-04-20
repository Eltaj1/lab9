import os
import time
import json
import uuid
import logging
from flask import Flask, request, g
import redis as redis_lib

app = Flask(__name__)

log = logging.getLogger("werkzeug")
log.setLevel(logging.ERROR)

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

def get_redis():
    """Return a Redis client (one per request via Flask g)."""
    if "redis" not in g:
        g.redis = redis_lib.from_url(REDIS_URL, socket_connect_timeout=2,
                                     socket_timeout=2, decode_responses=True)
    return g.redis

@app.before_request
def before_request():
    g.start_time = time.time()
    g.request_id = str(uuid.uuid4())

@app.after_request
def after_request(response):
    latency_ms = round((time.time() - g.start_time) * 1000)
    log_line = {
        "timestamp":  time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "requestId":  g.request_id,
        "method":     request.method,
        "path":       request.path,
        "status":     response.status_code,
        "latency_ms": latency_ms,
    }
    print(json.dumps(log_line), flush=True)
    return response


@app.get("/")
@app.get("/ping")
def ping():
    return {"message": "pong", "student": "Eltaj Sarizada", "id": 70453}

@app.get("/health")
def health():
    """Always 200 if the process is alive."""
    return {"status": "ok"}, 200

@app.get("/ready")
def ready():
    """200 if Redis is reachable, 503 otherwise."""
    try:
        r = get_redis()
        pong = r.ping()
        if pong:
            return {"status": "ready", "redis": "reachable"}, 200
        raise RuntimeError("unexpected ping response")
    except Exception as e:
        return {"status": "unavailable", "redis": "unreachable", "detail": str(e)}, 503

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(json.dumps({
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "event":     "server_started",
        "port":      port,
        "redis_url": REDIS_URL,
    }), flush=True)
    app.run(host="0.0.0.0", port=port)


print("Hello professor!!!!!!!")