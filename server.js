/**
 * SmartFlow Arena — Express Backend
 * Provides live, auto-regenerating venue data every 60 seconds
 * REST endpoints consumed by the frontend via polling
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // serve frontend files

// ──────────────────────────────────────────────
// LIVE DATA STORE — refreshed every 60 seconds
// ──────────────────────────────────────────────
let liveData = generateSnapshot();
let dataVersion = "1.0.0";
let lastUpdated = new Date();

setInterval(() => {
    liveData = generateSnapshot();
    dataVersion += 1;
    lastUpdated = new Date();
    console.log(`[${lastUpdated.toLocaleTimeString()}] 🔄 Data snapshot v${dataVersion} generated`);
}, 60000);          // every 60 seconds

// ──────────────────────────────────────────────
// DATA GENERATION ENGINE
// ──────────────────────────────────────────────
function rand(min, max, decimals = 0) {
    const v = Math.random() * (max - min) + min;
    return decimals > 0 ? parseFloat(v.toFixed(decimals)) : Math.round(v);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateSnapshot() {
    const attendance = rand(41000, 51500);
    const matchMin = rand(0, 90);
    const half = matchMin < 45 ? '1st Half' : matchMin === 45 ? 'HT' : '2nd Half';

    return {
        meta: {
            version: "1.0.0",
            timestamp: new Date().toISOString(),
            event: pick(['Arsenal vs Man City', 'England vs India', 'Real Madrid vs Barcelona', 'PSG vs Bayern', 'Paris Olympics 100m Final']),
            stadium: pick(['Emirates Stadium', 'Wembley', 'Camp Nou', 'Parc des Princes', 'Stade de France']),
            attendance,
            capacity: 60704,
            matchTime: matchMin,
            matchPeriod: half,
            weather: { temp: rand(12, 28), condition: pick(['☀️', '⛅', '🌧️', '☁️']) },
        },
        kpis: {
            gatesOpen: rand(20, 28),
            gatesTotal: 28,
            avgWaitMin: rand(15, 55, 1) / 10,
            activeAlerts: rand(0, 8),
            revenueKUSD: rand(140, 240),
            fanSatisfaction: rand(880, 970, 1) / 10,
            safetyScore: rand(970, 999, 1) / 10,
            throughputPH: rand(38000, 52000),
        },
        zones: generateZones(),
        queues: {
            concessions: generateConcessions(),
            restrooms: generateRestrooms(),
            entry: generateEntry(),
        },
        gates: generateGates(),
        staff: generateStaff(),
        transport: generateTransport(),
        alerts: generateAlerts(rand(4, 10)),
        analytics: {
            crowdFlow: Array.from({ length: 13 }, () => rand(0, 50000)),
            revenue: [rand(30, 55), rand(55, 80), rand(120, 200), rand(80, 130), rand(15, 35)],
            gateThroughput: Array.from({ length: 8 }, () => rand(25, 98)),
            waitHistory: [18.4, rand(120, 150) / 10, rand(80, 110) / 10, rand(50, 80) / 10, rand(35, 60) / 10, rand(25, 45) / 10, rand(15, 40) / 10],
            npsHistory: [24, rand(32, 44), rand(42, 54), rand(50, 60), rand(58, 68), rand(65, 75)],
            roiMetrics: {
                waitReduction: -rand(35, 51),
                revenueUplift: +rand(20, 34),
                npsPoints: +rand(55, 80),
                incidentReduction: -rand(88, 98),
                staffCostReduction: -rand(14, 24),
                paybackMonths: rand(7, 14),
            }
        },
        systemHealth: generateSystemHealth(),
        agentStatuses: generateAgentStatuses(),
    };
}

function generateZones() {
    const names = [
        ['NW', 'North West', 'A'], ['NE', 'North East', 'B'], ['N', 'North Stand', 'C'],
        ['SW', 'South West', 'D'], ['SE', 'South East', 'E'], ['S', 'South Stand', 'F'],
        ['EL', 'East Lower', 'G'], ['EU', 'East Upper', 'H'], ['WL', 'West Lower', 'I'],
        ['WU', 'West Upper', 'J'], ['VP', 'VIP Terrace', 'K'], ['FA', 'Family Zone', 'L'],
    ];
    return names.map(([id, name, sector]) => ({
        id, name, sector,
        density: rand(15, 98, 2) / 100,
        trend: pick(['stable', 'rising', 'falling']),
    }));
}

function generateConcessions() {
    const items = [
        '🍔 Stand 1 — Burgers', '🌭 Stand 2 — Hot Dogs', '🍺 Stand 3 — Craft Beers',
        '🍕 Stand 4 — Pizza Corner', '🥃 Stand 5 — Local Craft Ale', '🥙 Stand 6 — Vegan Wraps',
        '🥂 VIP Lounge Bar', '🥔 Stand 8 — Loaded Fries',
    ];
    return items.map((name, i) => ({
        id: 'c' + (i + 1), name,
        waitMin: rand(5, 190, 0) / 10,
        staffCount: rand(2, 8),
        ordersQueued: rand(0, 45),
        virtualQueueActive: Math.random() > 0.6,
    }));
}

function generateRestrooms() {
    const items = [
        '🚻 North Concourse — A', '🚻 North Concourse — B', '🚻 South Concourse — C',
        '🚹 East Stand — GF', '🚻 VIP Level — Suite 3',
    ];
    return items.map((name, i) => ({
        id: 'r' + (i + 1), name,
        waitMin: rand(3, 140, 0) / 10,
        occupancy: rand(30, 100),
    }));
}

function generateEntry() {
    const items = [
        '🚪 Main Entry — North', '🔬 Biometric Gate A1–A4', '🔬 Biometric Gate B1–B4',
        '⭐ VIP Express Entry', '🚪 Standard Gate C1–C6',
    ];
    return items.map((name, i) => ({
        id: 'e' + (i + 1), name,
        waitMin: i === 0 ? rand(20, 80, 0) / 10 : i >= 1 && i <= 2 ? rand(2, 10, 0) / 10 : rand(5, 50, 0) / 10,
        biometric: i >= 1 && i <= 3,
        throughput: rand(200, 1000),
    }));
}

function generateGates() {
    return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'].map(id => {
        const throughput = rand(200, 980);
        return {
            id, name: `Gate ${id}`,
            throughput, cap: 1000,
            status: throughput > 750 ? 'green' : throughput > 450 ? 'yellow' : 'red',
        };
    });
}

function generateStaff() {
    const teams = [
        { name: 'Team Alpha', zone: 'North Concourse', icon: '👮' },
        { name: 'Team Beta', zone: 'East Stand', icon: '🦺' },
        { name: 'Team Gamma', zone: 'Concessions Row', icon: '👷' },
        { name: 'Team Delta', zone: 'Exit Routes', icon: '👮' },
        { name: 'Medic Unit', zone: 'First Aid Centre', icon: '🚑' },
    ];
    return teams.map(t => ({
        ...t,
        count: rand(3, 12),
        status: pick(['active', 'active', 'active', 'busy', 'alert']),
    }));
}

function generateTransport() {
    return [
        { icon: '🚇', name: 'Metro Line 1', detail: 'Platform 4 → Venue', eta: `${rand(1, 10)} min`, load: rand(30, 95) },
        { icon: '🚌', name: 'Bus Route 14', detail: 'Stop C → North Gate', eta: `${rand(5, 20)} min`, load: rand(20, 85) },
        { icon: '🚌', name: 'Bus Route 22', detail: 'Park & Ride → South', eta: `${rand(8, 25)} min`, load: rand(15, 70) },
        { icon: '🚖', name: 'Taxi Zone', detail: 'Drop-off Bay 3', eta: 'Now', load: rand(50, 100) },
        { icon: '🚲', name: 'Cycle Hub', detail: 'Available bikes', eta: '–', load: rand(5, 40) },
    ];
}

function generateAlerts(count) {
    const templates = [
        { type: 'warning', icon: '⚡', title: 'Congestion Detected', msg: `Zone ${pick(['NE', 'EL', 'N'])} density ${rand(75, 95)}% — rerouting in progress` },
        { type: 'info', icon: '📡', title: 'Gate Suggestion Sent', msg: `${rand(1500, 4000).toLocaleString()} attendees nudged toward Gate ${pick(['C1', 'A2', 'B1'])}` },
        { type: 'success', icon: '✅', title: 'Queue Cleared', msg: `Stand ${rand(1, 8)} wait reduced from ${rand(10, 18)}→${rand(2, 5)} min via AI staffing` },
        { type: 'critical', icon: '🚨', title: 'Density Alert', msg: `${pick(['East Lower', 'North Stand', 'West Upper'])} critically dense — deploying team` },
        { type: 'info', icon: '🚇', title: 'Transport Update', msg: `Metro Line 1 ETA adjusted to ${rand(2, 8)} min post-match` },
        { type: 'success', icon: '💰', title: 'Revenue Milestone', msg: `Concession revenue hit £${rand(140, 200)}K — ${pick(['first half', 'halftime', 'match'])} record` },
        { type: 'warning', icon: '🌧️', title: 'Weather Advisory', msg: `${pick(['Light rain', 'Wind gusting', 'Temperature drop'])} — recommend covered routes` },
        { type: 'info', icon: '🤖', title: 'AI Rerouting', msg: `CrowdFlow AI redirected ${rand(400, 1200)} attendees — gate ${pick(['A', 'B', 'C'])} cleared` },
        { type: 'success', icon: '📦', title: 'Orders Fulfilled', msg: `${rand(200, 600)} virtual queue orders delivered in-seat this hour` },
        { type: 'warning', icon: '⏱', title: 'Queue Surge Predicted', msg: `${pick(['Halftime', 'End of half', 'Goal celebration'])} surge in ${rand(5, 18)} min — activating VQ` },
    ];

    const now = new Date();
    return Array.from({ length: count }, (_, i) => {
        const t = pick(templates);
        const mins = i * rand(1, 8);
        const ts = new Date(now - mins * 60000);
        return {
            ...t,
            time: `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}`,
            category: pick(['STRATEGY', 'ACTION', 'SAFETY', 'INFO', 'REROUTE']),
        };
    });
}

function generateSystemHealth() {
    const beacons = rand(230, 248);
    const cameras = rand(240, 248);
    return [
        { name: 'IoT Beacons', val: `${beacons} / 248`, cls: beacons >= 244 ? 'ok' : 'warn' },
        { name: 'Camera Feeds', val: `${cameras} Active`, cls: cameras >= 244 ? 'ok' : 'warn' },
        { name: '5G Coverage', val: `${rand(970, 999) / 10}%`, cls: 'ok' },
        { name: 'AI Engine', val: 'Online', cls: 'ok' },
        { name: 'Edge Processing', val: `${rand(8, 22)}ms avg`, cls: 'ok' },
        { name: 'Wi-Fi Load', val: `${rand(40, 85)}%`, cls: Math.random() > 0.7 ? 'warn' : 'ok' },
        { name: 'Ticketing API', val: 'Connected', cls: 'ok' },
        { name: 'Payment Gateway', val: 'Online', cls: 'ok' },
        { name: 'Emergency System', val: 'Standby', cls: 'ok' },
        { name: 'Transport APIs', val: `${rand(6, 8)}/8 feeds`, cls: Math.random() > 0.8 ? 'warn' : 'ok' },
    ];
}

function generateAgentStatuses() {
    return {
        crowd: pick(['Optimizing gate routing...', `Rerouted ${rand(400, 1200)} attendees`, 'BLE beacon sync complete', 'Analyzing density hotspot']),
        queue: pick(['Predicting halftime surge...', 'Queue model updated', 'Staff reallocation sent', `VQ cleared ${rand(50, 200)} slots`]),
        safety: pick([`Monitoring ${rand(230, 248)} camera feeds`, 'Anomaly detection: clear', 'Zone EL density alert sent', 'Pattern analysis running']),
        revenue: pick([`Upsell push sent to ${rand(2, 5)}.${rand(0, 9)}K users`, 'Dynamic pricing updated', 'Stand 5 promo triggered', `Revenue up £${rand(5, 25)}K this hour`]),
        transport: pick([`Coordinating ${rand(10, 20)} bus routes`, 'Metro sync active', `ETA updated for ${rand(5, 10)} routes`, 'Dispersal plan generated']),
    };
}

// ──────────────────────────────────────────────
// API ENDPOINTS
// ──────────────────────────────────────────────

// Full snapshot
app.get('/api/snapshot', (req, res) => {
    res.json({ ok: true, ...liveData });
});

// KPIs only
app.get('/api/kpis', (req, res) => {
    res.json({ ok: true, version: liveData.meta.version, kpis: liveData.kpis, meta: liveData.meta });
});

// Zones
app.get('/api/zones', (req, res) => {
    res.json({ ok: true, zones: liveData.zones });
});

// Queues
app.get('/api/queues', (req, res) => {
    res.json({ ok: true, queues: liveData.queues });
});

// Gates
app.get('/api/gates', (req, res) => {
    res.json({ ok: true, gates: liveData.gates });
});

// Alerts (generates fresh each call for streaming feel)
app.get('/api/alerts', (req, res) => {
    res.json({ ok: true, alerts: generateAlerts(rand(1, 3)) });
});

// Staff
app.get('/api/staff', (req, res) => {
    res.json({ ok: true, staff: liveData.staff });
});

// Transport
app.get('/api/transport', (req, res) => {
    res.json({ ok: true, transport: liveData.transport });
});

// Analytics
app.get('/api/analytics', (req, res) => {
    res.json({ ok: true, analytics: liveData.analytics });
});

// System health
app.get('/api/system', (req, res) => {
    res.json({ ok: true, systemHealth: liveData.systemHealth, agentStatuses: liveData.agentStatuses });
});

// Version check — frontend polls this to know if a refresh is needed
app.get('/api/version', (req, res) => {
    res.json({
        ok: true,
        version: liveData.meta.version,
        lastUpdated: lastUpdated.toISOString(),
        nextUpdateIn: Math.round(60 - (Date.now() - lastUpdated) / 1000),
    });
});

// Virtual queue: POST to join
app.post('/api/virtual-queue/join', (req, res) => {
    const { stand } = req.body;
    const slot = `VQ-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const eta = rand(3, 10);
    res.json({ ok: true, slot, stand: stand || 'Stand 1', etaMin: eta, savedMin: rand(4, 12) });
});

// Broadcast: POST message
app.post('/api/broadcast', (req, res) => {
    const { message, target } = req.body;
    if (!message) return res.status(400).json({ ok: false, error: 'message required' });
    console.log(`[BROADCAST] → ${target || 'All'}: ${message}`);
    res.json({ ok: true, delivered: rand(10000, 48000), latencyMs: rand(80, 300) });
});

// NEW: AI Query Endpoint with Real Gemini Integration
app.post('/api/ai/query', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ ok: false, error: 'Query required' });

    console.log(`[AI] Processing query: "${query}"`);

    try {
        // Construct detailed telemetry context for the LLM
        const context = {
            stadium: liveData.meta.stadium,
            event: liveData.meta.event,
            attendance: liveData.meta.attendance,
            matchTime: `${liveData.meta.matchTime}' (${liveData.meta.matchPeriod})`,
            weather: `${liveData.meta.weather.temp}°C ${liveData.meta.weather.condition}`,
            kpis: liveData.kpis,
            zones: liveData.zones.map(z => `${z.name} (${z.id}): ${Math.round(z.density * 100)}% density, ${z.trend} trend`),
            topAlerts: liveData.alerts.slice(0, 3).map(a => a.msg)
        };

        const prompt = `
            You are the SmartFlow Arena Tactical AI, an advanced venue intelligence engine.
            Your goal is to provide precise, tactical insights and recommendations based on real-time telemetry.

            STADIUM CONTEXT:
            - Event: ${context.event} at ${context.stadium}
            - Attendance: ${context.attendance.toLocaleString()}
            - Match Time: ${context.matchTime}
            - Weather: ${context.weather}

            CURRENT METRICS:
            - Avg Wait: ${context.kpis.avgWaitMin} min
            - Active Alerts: ${context.kpis.activeAlerts}
            - Revenue: $${context.kpis.revenueKUSD}K/hr
            - Safety Score: ${context.kpis.safetyScore}%

            ZONE STATUS:
            ${context.zones.join('\n            ')}

            LATEST ALERTS:
            - ${context.topAlerts.join('\n            - ')}

            USER QUERY: "${query}"

            TASK:
            1. Analyze the telemetry data relative to the query.
            2. Provide a tactical "Neural Monologue" (internal reasoning) detailing how you correlated the data.
            3. Provide a clear, actionable "Tactical Response" (final answer).
            4. Keep the tone professional, concise, and high-tech.

            OUTPUT FORMAT (JSON):
            {
                "answer": "Your final tactical response here.",
                "reasoning": "Step-by-step neural reasoning here.",
                "prompt": "Tactical Analysis Phase: Telemetry Scan -> Correlation -> Strategy"
            }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        // Clean up JSON if LLM added markdown blocks
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiResponse = JSON.parse(jsonStr);

        res.json({ ok: true, ...aiResponse });

    } catch (err) {
        console.error('Gemini API Error:', err);
        res.status(500).json({ 
            ok: false, 
            error: 'AI Engine failed',
            answer: "The neural engine is temporarily offline. I'm reverting to local telemetry protocols.",
            reasoning: "API Connection Refused. Check GEMINI_API_KEY in .env.",
            prompt: "Failure Mode: Offline Redundancy Activated"
        });
    }
});

// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// VISION & ASSETS
// ──────────────────────────────────────────────

const MOCK_CAMERAS = [
    { id: 'cam-01', name: 'Concourse A North', path: 'C:/Users/hp/.gemini/antigravity/brain/9bac6f22-4654-480e-8f37-b64840c70f1f/stadium_cam_crowded_1776704914600.png' },
    { id: 'cam-02', name: 'West Gate Entry', path: 'C:/Users/hp/.gemini/antigravity/brain/9bac6f22-4654-480e-8f37-b64840c70f1f/stadium_cam_sparse_1776704939267.png' }
];

// Serve mock camera images
app.get('/api/cameras', (req, res) => {
    res.json({ ok: true, cameras: MOCK_CAMERAS.map(c => ({ id: c.id, name: c.name })) });
});

app.get('/api/cameras/:id/stream', (req, res) => {
    const cam = MOCK_CAMERAS.find(c => c.id === req.params.id);
    if (!cam) return res.status(404).json({ ok: false, error: 'Camera not found' });
    res.sendFile(cam.path);
});

// AI Vision Analysis Endpoint
app.post('/api/ai/vision', async (req, res) => {
    const { cameraId } = req.body;
    const cam = MOCK_CAMERAS.find(c => c.id === cameraId);
    if (!cam) return res.status(400).json({ ok: false, error: 'Invalid camera ID' });

    try {
        console.log(`[VISION] Analyzing ${cam.name}...`);
        
        // Read image as base64
        const fileData = fs.readFileSync(cam.path);
        const base64Image = fileData.toString('base64');

        const prompt = `
            Analyze this security camera feed from a sports stadium.
            Provide a tactical summary including:
            1. Crowd Density (Percentage and Level: Low/Moderate/High/Critical)
            2. Estimated Headcount in view.
            3. Anomalies or Safety Risks (e.g., blockages, abandoned items, aggressive movement).
            4. Tactical Recommendation.

            OUTPUT FORMAT (JSON):
            {
                "density": 85,
                "level": "High",
                "headcount": 450,
                "anomalies": ["Bottleneck at sector exit", "Abandoned bag near pillar"],
                "recommendation": "Deploy flow marshals to sector North-A.",
                "reasoning": "Internal Neural Vision monologue: Correlating motion vectors with static floorplan..."
            }
        `;

        const imageParts = [
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/png"
                }
            }
        ];

        const result = await model.generateContent([prompt, ...imageParts]);
        const text = result.response.text();
        
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const visionResponse = JSON.parse(jsonStr);

        res.json({ ok: true, ...visionResponse });

    } catch (err) {
        console.error('Gemini Vision Error:', err);
        res.status(500).json({ ok: false, error: 'Vision engine failure' });
    }
});

// START
// ──────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('');
    console.log('  ⬡  SmartFlow Arena Backend');
    console.log(`  ▶  Running at  http://localhost:${PORT}`);
    console.log(`  📡  API base    http://localhost:${PORT}/api/snapshot`);
    console.log(`  🔄  Data refreshes every 60 seconds`);
    console.log('');
});
