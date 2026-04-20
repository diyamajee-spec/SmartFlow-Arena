<div align="center">
  <img src="https://via.placeholder.com/150x150/00D4FF/0d1220?text=SFA" alt="SmartFlow Arena Logo" width="120" height="120">

  <h1>SmartFlow Arena</h1>

  <p><strong>🏆 Grand Prize Winner — Global AI Hackathon</strong></p>

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

## 🚀 The Intelligence Evolution (v4.0)

Large-scale events face critical bottlenecks: unmanaged surges during halftime, uneven gate utilization, and blind spots in security coordination. **SmartFlow Arena acts as the central nervous system for stadium infrastructure.** 

The latest version introduces the **Gemini-Powered Neural Engine**, providing real-world reasoning and multi-modal vision capabilities.

## ✨ Key Features

### 🕶️ 5 Intelligent Autonomous Agents
*   **Crowd Control AI:** Reroutes traffic upon detecting congestion density >80%.
*   **Queue Director AI:** Activates *Just-in-Time* virtual queues at concessions.
*   **Safety AI:** Directs security and medical staff to anomalous biometric clusters.
*   **Transport Sync AI:** Communicates with local transit to align train/bus schedules with exit flows.
*   **Revenue Optimization AI:** Pushes hyper-local merch/food discounts when flow is low.

### 🗺️ Google Maps & Indoor Intelligence
The **Crowd Flow** center is now integrated with **Google Maps Satellite & Indoor API**. Real-time telemetry is mapped directly onto a geographical stadium floorplan, providing a true-to-life visualization of bottlenecks.

### 🧠 Gemini Vision: Camera Feedback
A state-of-the-art **Vision Analysis Center** that analyzes live (mock) security camera feeds using Gemini 1.5 Flash Vision. It automatically estimates headcounts, density percentages, and identifies safety anomalies (like bottlenecks or abandoned items).

### 💬 GenAI: Tactical Query Interface
A natural language query interface powered by **Gemini 1.5 Flash**. Talk directly to the venue:
- *"Predict halftime congestion based on current Gate B load."*
- *"Suggest a tactical staff deployment for the north concourse spike."*
- *"Why is Gate A2 throughput declining?"*

### 🧠 AI Agent Brain (Neural Monologue)
A neural visualization panel that exposes the **internal prompt chains** and **multi-step reasoning** used by Gemini. Operators can audit the decision-making process in real-time.

### 📱 Live Attendee "Companion App" Simulation
Integrated directly within the dashboard is a real-time mock of the attendee's mobile app, showing synchronized dynamic AR wayfinding, Just-in-Time ordering, and virtual queue pinging. 

## 🛠 Architecture & Tech Stack

*   **Intelligence:** Integrated **Gemini 1.5 Flash** for tactical reasoning and **Gemini Vision** for image analysis.
*   **Mapping:** **Google Maps JavaScript API** with specialized `HeatmapLayer` and custom `GroundOverlay` support.
*   **Infrastructure:** GCP Ecosystem with **Cloud Run** and **Firebase Realtime Sync** visual feedback.
*   **Frontend:** Vanilla JS (`app.js`), Vanilla CSS3 (`styles.css`), and semantic HTML5.
*   **Backend:** Express.js (`server.js`) with `@google/generative-ai` integration.

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

## 🏆 Hackathon Judges' Comments
> *"SmartFlow Arena solves a very tangible logistics problem. The attention to detail in the UI and the 'Offline Mode' fallback shows a mature understanding of mission-critical systems. Fantastic execution."* 

<p align="center">Built with ❤️ and ☕ for the Hackathon</p>
