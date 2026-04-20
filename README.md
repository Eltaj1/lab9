# Week 9 Lab – Deployment & DevOps Basics

**Student:** Eltaj Sarizada  
**ID:** 70453  
**Course:** Design of Multi-Tier Internet Applications

---

## Week 9 Lab – Definition of Done

| Criterion | Status |
|-----------|--------|
| `docker build` succeeds | ✅ |
| `docker compose up` runs the full stack | ✅ |
| `GET /health` returns **200** | ✅ |
| `GET /ready` returns **200** when Redis is up | ✅ |
| `GET /ready` returns **503** when Redis is down | ✅ |
| Logs are JSON with method/path/status/latency/requestId | ✅ |
| CI pipeline runs on push/PR | ✅ |

**Stack:** Python 3.12 / Flask + Redis  

---

## Mac Setup (do this once)

### Step 1 – Install Homebrew (if you don't have it)

Open Terminal and run:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2 – Install Python 3.12

```bash
brew install python@3.12
```

Verify:

```bash
python3 --version
# Python 3.12.x
```

### Step 3 – Install Docker Desktop

Download from: https://www.docker.com/products/docker-desktop/

After installing, open **Docker Desktop** from your Applications folder and wait until the whale icon in the menu bar stops animating (that means Docker is running).

Verify in Terminal:

```bash
docker --version
# Docker version 25.x.x
docker compose version
# Docker Compose version v2.x.x
```

### Step 4 – Create a Python virtual environment

```bash
cd week9-lab          # go into the project folder
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> Every time you open a new Terminal session, run `source .venv/bin/activate` again to activate the environment.

---

## How to Run

### Option A – Docker Compose (recommended, matches the lab)

This starts both the Flask API and Redis with one command:

```bash
docker compose up --build
```

Leave this terminal open. Open a **new terminal tab** and test:

```bash
curl http://localhost:5000/health
# {"status":"ok"}

curl http://localhost:5000/ready
# {"status":"ready","redis":"reachable"}

curl http://localhost:5000/ping
# {"message":"pong","student":"Eltaj Sarizada","id":70453}
```

Stop everything:

```bash
docker compose down
```

---

### Option B – Run Flask locally (no Docker, for quick testing)

You need Redis running locally first:

```bash
brew install redis
brew services start redis
```

Then in the project folder (with venv activated):

```bash
source .venv/bin/activate
python app.py
```

Test in a new tab:

```bash
curl http://localhost:5000/health
```

---

### Run Tests

With venv activated:

```bash
pytest tests/ -v
```

Expected output:

```
tests/test_health.py::test_health_returns_200          PASSED
tests/test_health.py::test_ping_returns_pong           PASSED
tests/test_health.py::test_ready_returns_503_when_redis_down  PASSED
3 passed in 0.4s
```

---

## Task 1 – Dockerfile

Exactly the Python template from the lab PDF:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

Build and run commands:

```bash
docker build -t week9-api:dev .
docker run --rm -p 5000:5000 week9-api:dev
curl -s http://localhost:5000/health
```

---

## Task 2 – Docker Compose

```yaml
services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

Working responses:

```
$ curl -s http://localhost:5000/health
{"status":"ok"}

$ curl -s http://localhost:5000/ready
{"status":"ready","redis":"reachable"}
```

---

## Task 3 – Observability

### Health vs Readiness semantics

| Endpoint | Returns | Meaning |
|----------|---------|---------|
| `GET /health` | **200** always | Process is alive |
| `GET /ready` | **200** | Process alive **and** Redis reachable |
| `GET /ready` | **503** | Redis unreachable – do not send traffic |

### What is logged

Every HTTP request produces one JSON line on stdout:

```json
{
  "timestamp":  "2025-01-01T10:00:00Z",
  "requestId":  "a3f1c2d4-...",
  "method":     "GET",
  "path":       "/ready",
  "status":     200,
  "latency_ms": 3
}
```

Server startup also emits:

```json
{
  "timestamp": "2025-01-01T10:00:00Z",
  "event":     "server_started",
  "port":      5000,
  "redis_url": "redis://redis:6379"
}
```

---

## Task 3 – Failure Demo (required)

**Step 1 – Start the stack:**

```bash
docker compose up --build
```

**Step 2 – Open a new terminal tab and stop Redis:**

```bash
docker compose stop redis
```

**Step 3 – Check readiness:**

```bash
curl -i http://localhost:5000/ready
```

**Expected output:**

```
HTTP/1.1 503 SERVICE UNAVAILABLE
Content-Type: application/json

{"detail":"...Connection refused...","redis":"unreachable","status":"unavailable"}
```

**Step 4 – Restart Redis and confirm recovery:**

```bash
docker compose start redis
curl -s http://localhost:5000/ready
# → {"status":"ready","redis":"reachable"}
```

---

## Task 4 – CI Pipeline

File: `.github/workflows/ci.yml`

Triggers: push to `main`, any pull request.

Jobs:
1. **test** – installs deps with pip, runs `pytest tests/ -v`
2. **docker-build** – builds the Docker image (only if tests pass)

Push the repo to GitHub → open the **Actions** tab → green checkmark = done.

---

## Evaluation Checklist

- [x] Containerization (25%) – Dockerfile builds and runs correctly
- [x] Compose stack (25%) – Multi-container stack with service-name DNS
- [x] Health / readiness (20%) – 200 vs 503 demonstrated
- [x] Observability (15%) – JSON logs with all required fields
- [x] CI pipeline (15%) – Runs automatically on push/PR
# lab9



Github: https://github.com/Eltaj1/lab9