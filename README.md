# Wayfinder G1 — Autonomous AI Historian

**Wayfinder G1** is an autonomous robotic tour guide powered by the **Unitree G1 Humanoid** and **Nebius AI Cloud**. A user drops a GPS pin on a digital map; an AI Research Agent crawls the web, builds a vector memory store, and generates a physical navigation plan. The robot then walks the scene, avoids obstacles, tells contextual stories via high-fidelity TTS, points at landmarks, and can take selfies with visitors — all in real time.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend (FastAPI)](#backend-fastapi)
  - [Frontend (Next.js)](#frontend-nextjs)
- [Environment Variables](#environment-variables)
- [Core Components](#core-components)
  - [Component 1 — Cognitive Research & Memory Pipeline](#component-1--cognitive-research--memory-pipeline)
  - [Component 2 — Perception & Multi-modal Interaction](#component-2--perception--multi-modal-interaction)
  - [Component 3 — Physical Control & Spatial Safety](#component-3--physical-control--spatial-safety)
- [API Reference](#api-reference)
- [Safety Constraints](#safety-constraints)
- [Success Metrics](#success-metrics)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Web Dashboard                        │
│           Next.js 16 + React 19 + Tailwind CSS          │
│  [ Map Pin Drop ] → [ Mission Status ] → [ Selfie Feed ]│
└──────────────────────────┬──────────────────────────────┘
                           │ REST + WebSockets
┌──────────────────────────▼──────────────────────────────┐
│                   FastAPI Backend                        │
│   Auth · Route Planning · Research Agent · Embeddings   │
│               MongoDB (data) + Redis (vectors)           │
└──────────┬──────────────────────────────┬───────────────┘
           │ Nebius LLM / VLM             │ ElevenLabs TTS
           │ Tavily Search                │ Unitree G1 SDK
┌──────────▼──────────────────────────────▼───────────────┐
│                   Unitree G1 Robot                       │
│  LiDAR · Depth Camera · IMU · Arm IK · Walking Gait     │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| **Backend** | FastAPI, Python 3.10+, Pydantic v2, UV |
| **Primary Database** | MongoDB (via Motor async driver) |
| **Vector Store / Cache** | Redis Stack |
| **LLM Inference** | Nebius Token Factory (Llama 3 / Qwen) |
| **Web Search** | Tavily AI |
| **TTS** | ElevenLabs (streaming, multilingual v2) |
| **Vision / VLM** | Nebius GPU Instances (Moondream / LLaVA) |
| **Robotics** | Unitree G1 SDK, LiDAR, IMU |
| **Simulation** | MuJoCo / Isaac Gym on Nebius Cloud |
| **Containerisation** | Docker Compose |

---

## Repository Structure

```
nebious-hackathon/
├── docs/                        # Product & component specs
│   ├── PRD.md                   # Full product requirements document
│   ├── COGNITIVE_PIPELINE.md    # Component 1: Brain / research pipeline
│   ├── PERCEPTION.md            # Component 2: Voice, vision & selfies
│   └── PHYSICAL_COMPONENT.md   # Component 3: Navigation & safety
│
├── frontend/                    # Next.js web dashboard
│   ├── app/                     # App Router pages & API routes
│   ├── components/ui/           # shadcn/ui component library
│   ├── lib/                     # API client, auth helpers, types, validation
│   └── package.json
│
├── server/                      # FastAPI backend
│   ├── app/
│   │   ├── core/                # Config, security (JWT)
│   │   ├── databases/           # MongoDB & Redis clients
│   │   ├── models/              # Pydantic models (user, route)
│   │   ├── routers/             # Auth, routes, embeddings endpoints
│   │   ├── services/            # Business logic (auth, route planning)
│   │   ├── dependencies.py      # FastAPI dependency injection
│   │   └── main.py              # Application entry point
│   ├── docker-compose.yml       # MongoDB + Redis services
│   ├── .env.example
│   └── pyproject.toml
│
└── robot/                       # Unitree G1 control code (ROS / SDK)
```

---

## Getting Started

### Prerequisites

- **Python 3.10+** with [UV](https://github.com/astral-sh/uv) package manager
- **Node.js 20+** with npm
- **Docker & Docker Compose** (for MongoDB and Redis)

### Backend (FastAPI)

```bash
# 1. Start infrastructure services
cd server
docker compose up -d

# 2. Install Python dependencies
uv sync

# 3. Copy and configure environment variables
cp .env.example .env
# Edit .env with your actual secrets (see Environment Variables section)

# 4. Run the development server
uv run uvicorn app.main:app --reload --port 8000 --reload-dir app
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

---

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in the values:

| Variable | Description | Default |
|---|---|---|
| `APP_NAME` | Application display name | `Wayfinder G1 API` |
| `DEBUG` | Enable debug mode | `false` |
| `SECRET_KEY` | JWT signing secret (`openssl rand -hex 32`) | — |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token TTL in minutes | `1440` |
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DB` | Database name | `wayfinder` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `ALLOWED_ORIGINS` | CORS allowed origins (JSON array) | `["http://localhost:3000"]` |

Additional secrets required at runtime (not yet in `.env.example`):

| Variable | Description |
|---|---|
| `NEBIUS_API_KEY` | Nebius AI Cloud API key |
| `TAVILY_API_KEY` | Tavily web search API key |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS API key |

---

## Core Components

### Component 1 — Cognitive Research & Memory Pipeline

Acts as the **pre-frontal cortex** of the system. Triggered the moment a user drops a GPS pin.

1. **Research Agent:** Tavily searches for historical facts and visual landmarks at the given coordinates. Results are synthesised by a Nebius-hosted LLM into a structured "Scene Description."
2. **Vector Memory:** Historical facts are embedded and stored in Redis Vector Store for sub-500ms similarity retrieval. A key-value pair per User ID enables long-term memory across interactions.
3. **Mission Plan Output:** The LLM emits a structured JSON plan:
   ```json
   {
     "story_intro": "Welcome to the Golden Gate...",
     "waypoints": [{ "lat": 1.1, "lng": 1.2, "action": "point", "label": "The North Tower" }],
     "personality_tone": "Adventurous"
   }
   ```

### Component 2 — Perception & Multi-modal Interaction

Bridges the robot's reasoning with the human user.

- **Streaming TTS:** Text chunks are streamed to ElevenLabs as the LLM generates them, targeting a **< 800ms** audio-start latency. Personality cues (e.g. `[short pause]`) are injected into prompts for natural delivery.
- **Visual Reasoning:** At each waypoint the G1 head camera captures a frame; a VLM (Moondream / LLaVA) hosted on Nebius GPUs confirms whether the observed landmark matches the Redis knowledge base (target: **< 2s**).
- **Selfie Agent:** A lightweight YOLO/MediaPipe model detects when the user stands beside the robot. The robot poses, captures a high-res frame, uploads it to a temporary bucket, and the dashboard updates via WebSocket in real time.

### Component 3 — Physical Control & Spatial Safety

Executes the Mission Plan in the real world.

- **Navigation Stack:** GPS waypoints are converted into a local Cartesian grid. Onboard LiDAR and depth cameras build a real-time occupancy map enabling dynamic obstacle re-planning without pausing the tour.
- **Gestural Interaction:** Inverse Kinematics maps VLM-identified landmark coordinates to G1 arm joint angles, producing a natural "look and point" behaviour within ±10° accuracy.
- **Safety Guardrails:**
  - **Safety Bubble:** Objects entering a 0.5 m radius trigger an immediate `STANCE_LOCK`.
  - **Nebius Simulation:** Complex gestures and gaits are validated in MuJoCo / Isaac Gym on Nebius Cloud before execution.
  - **E-Stop:** A software listener in the Web UI freezes all motor activity instantly.

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new user account |
| `POST` | `/auth/login` | Obtain a JWT access token |
| `GET` | `/routes/` | List all saved tour routes |
| `POST` | `/routes/` | Create a new route from a GPS pin |
| `GET` | `/routes/{id}` | Retrieve a specific route |
| `POST` | `/embeddings/` | Store a fact embedding in Redis |
| `GET` | `/embeddings/search` | Similarity search over stored facts |

Full interactive documentation is available at `/docs` (Swagger UI) and `/redoc` when the backend is running.

---

## Safety Constraints

- Maximum walking speed: **0.5 m/s** during demos.
- If a person is detected within **1 m**, the robot enters **Interaction Mode** and halts all movement.
- The Safety Bubble (0.5 m) triggers `STANCE_LOCK` on any unplanned obstacle.
- Goal: **zero unplanned physical contacts** during the 3-minute demo run.

---

## Success Metrics

| Metric | Goal |
|---|---|
| Pin Drop → Robot Speech latency | **< 10 seconds** |
| Vector similarity search latency | **< 500 ms** |
| VLM reasoning latency | **< 2 seconds** |
| TTS audio start latency | **< 800 ms** |
| Tour autonomy (no human intervention) | **100 %** |
| Selfie delivered to user's device | ✓ |
