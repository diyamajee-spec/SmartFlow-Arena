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

## 🚀 The Problem We Solved

Large-scale events face critical bottlenecks: unmanaged surges during halftime, uneven gate utilization, and blind spots in security coordination. **SmartFlow Arena acts as the central nervous system for stadium infrastructure.** 

By ingesting simulated telemetry from IoT turnstiles, PoS systems, and biometric cameras, our AI engine proactively reroutes attendees, adjusts virtual queue allocations dynamically, and dispatches staff before problems arise.

## ✨ Key Features

### 🕶️ 5 Intelligent Autonomous Agents
*   **Crowd Control AI:** Reroutes traffic upon detecting congestion density >80%.
*   **Queue Director AI:** Activates *Just-in-Time* virtual queues at concessions.
*   **Safety AI:** Directs security and medical staff to anomalous biometric clusters.
*   **Transport Sync AI:** Communicates with local transit to align train/bus schedules with exit flows.
*   **Revenue Optimization AI:** Pushes hyper-local merch/food discounts when flow is low.

### 📱 Live Attendee "Companion App" Simulation
Integrated directly within the dashboard is a real-time mock of the attendee's mobile app, showing synchronized dynamic AR wayfinding, Just-in-Time ordering, and virtual queue pinging. 

### 🎛️ Dynamic Dual-Theme Architecture
Designed for the stress of a dark control room, the primary theme uses frosted glassmorphism ("Bento-box" style). A toggle seamlessly transitions to a high-contrast `light` mode for daytime operations.

## 🛠 Architecture & Tech Stack

This prototype is built entirely with vanilla web technologies to guarantee zero-overhead performance in mission-critical environments:

*   **Frontend:** Vanilla JS (`app.js`), Vanilla CSS3 (`styles.css` with CSS variables for instant theming), semantic HTML5.
*   **Visualizations:** Uses HTML5 `<canvas>` for zero-dependency crowd simulation and `Chart.js` for complex metric trending.
*   **Backend:** Express.js (`server.js`) serving as the telemetry polling endpoint.
*   **Data Strategy:** 60-second synchronized synthetic polling with a "graceful degradation" Offline Mode if the backend disconnects.

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
