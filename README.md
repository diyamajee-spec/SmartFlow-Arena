<h1>SmartFlow Arena</h1>

  <p>
    An intelligent, real-time command center for modern sports and entertainment venues. 
    SmartFlow uses predictive AI to manage dynamic crowd dispersal, minimize concession wait times to near zero, and coordinate security operations in real-time.
  </p>

  <div>
    <a href="#features">Features</a> •
    <a href="#demo">Demo</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#installation">Installation</a>
  </div>
</div>

---

## 🚀 The Intelligence Evolution (v3.5)

Large-scale events face critical bottlenecks: unmanaged surges during halftime, uneven gate utilization, and blind spots in security coordination. **SmartFlow Arena acts as the central nervous system for stadium infrastructure.** 

The latest version introduces the **Arena Neural Engine**, which provides deep transparency and interactivity for venue operators.

## ✨ Key Features

### 🕶️ 5 Intelligent Autonomous Agents
*   **Crowd Control AI:** Reroutes traffic upon detecting congestion density >80%.
*   **Queue Director AI:** Activates *Just-in-Time* virtual queues at concessions.
*   **Safety AI:** Directs security and medical staff to anomalous biometric clusters.
*   **Transport Sync AI:** Communicates with local transit to align train/bus schedules with exit flows.
*   **Revenue Optimization AI:** Pushes hyper-local merch/food discounts when flow is low.

### 🧠 AI Agent Brain (Neural Monologue)
A production-grade neural visualization panel that exposes the **internal prompts** and **multi-step reasoning** used by agents. Operators can audit the decision-making process in real-time, providing total transparency into autonomous tactical actions.

### ✨ GenAI: Query Arena Intelligence
A natural language query interface (powered by Gemini patterns) that allows operators to talk directly to the venue. Ask questions like:
- *"What's the prediction for Gate 3 congestion in the next 15 mins?"*
- *"Why is there a spike at Stand 2 concessions?"*
- *"Suggest a tactical staff deployment for the halftime surge."*

### 📱 Live Attendee "Companion App" Simulation
Integrated directly within the dashboard is a real-time mock of the attendee's mobile app, showing synchronized dynamic AR wayfinding, Just-in-Time ordering, and virtual queue pinging. 

### 🎛️ Dynamic Dual-Theme Architecture
Designed for the stress of a dark control room, the primary theme uses frosted glassmorphism ("Bento-box" style). A toggle seamlessly transitions to a high-contrast `light` mode for daytime operations.

## 🛠 Architecture & Tech Stack

This prototype is built with a focus on real-world infrastructure scaling and neural transparency:

*   **Intelligence:** Custom pseudo-LLM logic (`/api/ai/query`) for high-fidelity tactical pattern matching and reasoning generation.
*   **Infrastructure:** Deep grounding in the **Google Cloud Ecosystem** with integrated **Cloud Run** deployment links and **Firebase Realtime Sync** visual feedback.
*   **Frontend:** Vanilla JS (`app.js`), Vanilla CSS3 (`styles.css`), and semantic HTML5 for maximum performance.
*   **Visualizations:** HTML5 `<canvas>` for crowd simulation and `Chart.js` for complex metric trending.
*   **Backend:** Express.js (`server.js`) providing telemetry streams and tactical query processing.

## 💻 Installation & Usage

You only need Node.js installed to run the backend telemetry server.

### Option 1: Quick Start (Linux / Mac / WSL / Git Bash)
Run the included bootstrap script from the project root:
```bash
./run_local.sh
```

### Option 2: Manual Start
```bash
npm install
node server.js
```
Then navigate to `http://localhost:8080` in your browser.
<p align="center">Built with ❤️ and ☕ for the Hackathon</p>
