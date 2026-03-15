# PRD: Project Wayfinder G1 – The Autonomous AI Historian

## 1. Executive Summary
**Wayfinder G1** is an autonomous robotic tour guide powered by the **Unitree G1 Humanoid** and **Nebius AI Cloud**. Users drop a pin on a digital map; an AI Research Agent then crawls the web via **Tavily**, populates a **Redis Vector** memory, and generates a physical path. The robot navigates the scene, avoids obstacles, tells stories using **ElevenLabs TTS**, identifies landmarks by pointing, and interacts with users through long-term memory and selfies.

---

## 2. Problem Statement
Current robotic guides are often pre-programmed or limited to basic RAG. They lack real-world spatial reasoning and the ability to autonomously "learn" about a new environment on the fly. We are building a system where the **LLM is the physical orchestrator**, turning digital knowledge into safe, embodied actions.

---

## 3. Core Features & User Stories

### **Phase 1: Digital Intelligence (The Brain)**
* **Map-to-Mission:** User drops a GPS pin → Backend triggers a **Tavily Research Agent**.
* **Contextual Memory:** Research data is embedded and stored in **Redis (Vector Store)**.
* **Dynamic Storytelling:** LLM generates a site-specific narrative and a logical sequence of waypoints.

### **Phase 2: Embodied Interaction (The Interface)**
* **Multilingual Voice (TTS):** Real-time speech generation via **ElevenLabs** (English primary).
* **Visual Q&A:** Users ask questions; the robot uses its camera + VLM (Vision Language Model) on **Nebius** to "see" and answer.
* **Social Robot:** The robot detects the user, strikes a pose, takes a **Selfie**, and sends it to the web dashboard.

### **Phase 3: Physical Execution (The Body)**
* **Obstacle-Aware Navigation:** Autonomous walking while actively avoiding collisions using LiDAR/Depth sensors.
* **Spatial Pointing:** The robot uses its arms to physically **point at objects** it is describing.
* **Safe Manipulation:** Movement is constrained by safety policies simulated on **Nebius Cloud Compute**.

---

## 4. Technical Architecture

| Layer | Component | Tech Stack |
| :--- | :--- | :--- |
| **Inference** | Orchestration & Reasoning | **Nebius Token Factory** (Llama 3 / Qwen) |
| **Search** | Real-time Web Intelligence | **Tavily AI** |
| **Memory** | Long-term & Vector Storage | **Redis Stack** |
| **Audio** | High-fidelity TTS | **ElevenLabs** |
| **Vision** | Object Detection & VLM | **Nebius GPU Instances** (Moondream/Llava) |
| **Robotics** | Motion & Navigation | **Unitree G1 SDK** + Nebius Simulation Stack |

---

## 5. Functional Requirements (Task Breakdown)

### **FR1: The Research Pipeline**
* The system must extract at least 3 historical facts and 2 visual landmarks per location.
* Data must be retrievable via vector similarity search within **< 500ms**.

### **FR2: Robotic Navigation**
* The robot must stop within **30cm** of any unplanned obstacle.
* GPS coordinates must be translated into local odometry for the Unitree G1.

### **FR3: Computer Vision & Arm Control**
* The robot must identify at least one "Point of Interest" in its field of view.
* The arm must move to a "pointing" gesture with a positional accuracy of **±10°**.

---

## 6. Success Metrics for Judging
* **Autonomy:** Percentage of the tour completed without human intervention.
* **Latency:** Time from "Pin Drop" to "Robot Speech" (Goal: **< 10 seconds**).
* **Engagement:** Successful delivery of a photo (Selfie) to the user's device.

---

## 7. Safety & Ethical Constraints
* **Safe Velocity:** Maximum walking speed capped at **0.5 m/s** during the demo.
* **Human-First:** If a person is detected within **1m**, the robot enters "Interaction Mode" and halts movement.