/**
 * SmartFlow Arena — Frontend Application
 * v3.2 · AI-Powered Venue Intelligence Platform
 *
 * Handles:
 *  - Backend API polling (every 60 s via /api/snapshot)
 *  - Countdown ribbon & backend status indicator
 *  - Tab navigation
 *  - Chart.js charts (crowd flow, revenue, gate radar, wait time, NPS)
 *  - Sparkline mini-charts on KPI cards
 *  - Live crowd simulation canvas
 *  - Heatmap (mini + full)
 *  - Zone grid, gate strip, routing suggestions
 *  - Queue: concessions / restrooms / entry / virtual queue
 *  - Staff deployment & transport
 *  - AI Agent status (5 agents)
 *  - Broadcast center
 *  - Phase timeline / event lifecycle
 *  - System health grid
 *  - Phone attendee app preview
 *  - Emergency mode
 *  - Light/Dark theme toggle
 *  - Toast notifications
 */

'use strict';

/* ──────────────────────────────────────────────
   CONFIG
────────────────────────────────────────────── */
const API_BASE = window.location.origin;
const POLL_INTERVAL = 60000;   // 60 seconds

/* ──────────────────────────────────────────────
   STATE
────────────────────────────────────────────── */
let liveSnapshot = null;
let isSimRunning = true;
let emergencyMode = false;
let currentPhase = 2;            // 0-pre, 1-entry, 2-match, 3-half, 4-2nd, 5-exit
let currentPhoneView = 'home';
let vqSlots = [];
let vqTotal = { saved: 0, orders: 0, revenue: 0 };
let broadcastType = 'routing';
let crowdLayer = 'density';
let animFrameId = null;
let ribbonTimer = null;
let countdownSecs = POLL_INTERVAL / 1000;
let backendOk = false;
const charts = {};
let environmentalData = { temp: '16°C', cond: 'Partly Cloudy', wind: '12 km/h', humid: '64%' };
let logEntries = [];

/* ──────────────────────────────────────────────
   INIT ON DOM READY
────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initCharts();
    initBroadcastTypeButtons();
    renderPhaseTimeline();
    renderPhoneApp();
    startLiveClock();
    startCrowdSimulation();
    startRibbonTimer();
    fetchSnapshot();                     // first load
    fetchEnvironmentalData();            // NEW: load external data
    setInterval(fetchSnapshot, POLL_INTERVAL);
    setInterval(fetchEnvironmentalData, 300000); // refresh weather every 5 min

    // NEW: Background decision logger simulator
    setInterval(generateSyntheticLogEntry, 12000);

    // Keyboard shortcut: T = toggle theme
    document.addEventListener('keydown', e => {
        if (e.key === 't' || e.key === 'T') toggleTheme();
    });
});

/* ──────────────────────────────────────────────
   BACKEND POLLING
────────────────────────────────────────────── */
async function fetchSnapshot() {
    try {
        const res = await fetch(`${API_BASE}/api/snapshot`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        liveSnapshot = await res.json();
        backendOk = true;
        setBackendStatus(true);
        applySnapshot(liveSnapshot);
        resetRibbonTimer();
    } catch (err) {
        backendOk = false;
        setBackendStatus(false);
        console.warn('[SmartFlow] Backend unreachable — using simulation data:', err.message);
        // Fall back to local simulation data so UI stays populated
        applySnapshot(buildFallbackSnapshot());
    }
}

function setBackendStatus(ok) {
    const dot = document.getElementById('bs-dot');
    const label = document.getElementById('bs-label');
    if (!dot || !label) return;
    dot.style.background = ok ? 'var(--emerald)' : 'var(--amber)';
    dot.style.boxShadow = ok ? '0 0 6px var(--emerald)' : '0 0 6px var(--amber)';
    label.textContent = ok ? 'Backend Live' : 'Offline Mode';
    label.style.color = ok ? 'var(--emerald)' : 'var(--amber)';
}

/* ──────────────────────────────────────────────
   ENVIRONMENTAL DATA (EXTERNAL API)
   Uses wttr.in (keyless public API)
   ────────────────────────────────────────────── */
async function fetchEnvironmentalData() {
    try {
        const response = await fetch('https://wttr.in/London?format=j1');
        if (!response.ok) throw new Error('API Throttled');
        const data = await response.json();
        const curr = data.current_condition[0];
        
        environmentalData = {
            temp: `${curr.temp_C}°C`,
            cond: curr.weatherDesc[0].value,
            wind: `${curr.windspeedKmph} km/h`,
            humid: `${curr.humidity}%`
        };
        updateEnvUI();
        logDecision('System', `Environmental awareness synced: ${environmentalData.temp}, ${environmentalData.cond}`, 'system');
    } catch (err) {
        console.warn('[SmartFlow] Weather API failed — using static simulation data.');
        updateEnvUI(); // fallback to default
    }
}

function updateEnvUI() {
    setText('env-temp', environmentalData.temp);
    setText('env-cond', environmentalData.cond);
    setText('env-wind', environmentalData.wind);
    setText('env-humid', environmentalData.humid);
    
    // Impact logic
    const impactMsg = document.getElementById('env-impact-msg');
    if (!impactMsg) return;
    
    const temp = parseInt(environmentalData.temp);
    if (temp > 25) {
        impactMsg.textContent = 'High heat detected: Increasing hydration hydration prompts + hydration staff logs.';
    } else if (environmentalData.cond.toLowerCase().includes('rain')) {
        impactMsg.textContent = 'Rain detected: Rerouting all entry traffic to covered sectors A & G.';
    } else {
        impactMsg.textContent = 'Optimal conditions: No environmental routing adjustments needed.';
    }
}

/* ──────────────────────────────────────────────
   AI PERFORMANCE / DECISION LOG
   ────────────────────────────────────────────── */
function logDecision(agent, message, type = 'info', category = 'STRATEGY') {
    const logEl = document.getElementById('decision-log');
    if (!logEl) return;
    
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    
    const item = document.createElement('div');
    item.className = `log-entry ${type} ${category.toLowerCase()}`;
    item.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-msg"><strong>[${category}] ${agent}:</strong> ${message}</span>
        <span class="log-meta">${ms}ms</span>
    `;
    
    logEl.appendChild(item);
    logEl.scrollTop = logEl.scrollHeight;

    // Trigger Firebase sync visual
    triggerFirebaseSync();
}

function triggerFirebaseSync() {
    const badge = document.getElementById('firebase-sync-badge');
    if (!badge) return;
    badge.classList.add('sync-active');
    setTimeout(() => badge.classList.remove('sync-active'), 800);
}

function clearDecisionLog() {
    const logEl = document.getElementById('decision-log');
    if (logEl) logEl.innerHTML = '';
    logEntries = [];
    showToast('Decision log cleared', 'info');
}

function generateSyntheticLogEntry() {
    if (!isSimRunning) return;
    
    const agents = [
        { name: 'CrowdFlow AI', actions: ['Detecting Sector B bottleneck. Rerouting 240 fans to Gate 4.', 'Optimizing dispersal timing for early leavers.', 'Syncing gate throughput with entry expectations.'], type: 'strategy', category: 'REROUTE' },
        { name: 'QueueBot', actions: ['Virtual Queue #VQ-882 allocated to Stand 5.', 'Predicting Halftime surge: +14% capacity requested.', 'Stand 1 wait time > 12 min. Notifying nearby staff.'], type: 'action', category: 'ACTION' },
        { name: 'SafetyGuard', actions: ['Anomalous biometric cluster in Sector C. Monitoring.', 'Security personnel dispatched to Gate A for flow assist.', 'Elevated density in North Stand. Advisory sent to staff.'], type: 'warning', category: 'SAFETY' },
        { name: 'RevenueOpt', actions: ['Dynamic discount (15%) pushed to users in Sector G.', 'Low POS activity at Merch Stand 2. Strategic ad push sent.', 'Halftime pre-order window opened for VIP members.'], type: 'info', category: 'STRATEGY' }
    ];
    
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const action = agent.actions[Math.floor(Math.random() * agent.actions.length)];
    logDecision(agent.name, action, agent.type, agent.category);
}

/* ──────────────────────────────────────────────
   GEN AI: ARENA INTELLIGENCE
   ────────────────────────────────────────────── */
async function askArenaAI() {
    const input = document.getElementById('ai-query-input');
    const btn = document.getElementById('ai-query-btn');
    const status = document.getElementById('brain-think-status');
    if (!input || !input.value.trim()) return;

    const query = input.value;
    input.value = '';
    btn.disabled = true;
    btn.innerHTML = '<span>⚡</span> Analysis...';
    status.textContent = '● THINKING';
    status.style.color = 'var(--amber)';

    try {
        const res = await fetch(`${API_BASE}/api/ai/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        
        if (data.ok) {
            updateBrainPanel(data.prompt, data.reasoning, data.answer);
            showToast('AI Intelligence Response Received', 'success');
            logDecision('Neural Engine', `Query handled: "${query}"`, 'info', 'STRATEGY');
        }
    } catch (err) {
        console.error('AI Query failed:', err);
        showToast('AI Interface Error', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>✨</span> Ask AI';
        status.textContent = '● IDLE';
        status.style.color = 'var(--emerald)';
    }
}

function updateBrainPanel(prompt, reasoning, output) {
    const pEl = document.getElementById('brain-prompt');
    const rEl = document.getElementById('brain-reasoning');
    if (pEl) pEl.textContent = prompt;
    if (rEl) rEl.textContent = reasoning;
    
    // Also inject the answer into a toast or a dedicated area
    // For now, let's just use reasoning/prompt to stay in character
}

/* ──────────────────────────────────────────────
   SNAPSHOT APPLICATION
────────────────────────────────────────────── */
function applySnapshot(data) {
    if (!data) return;
    updateKPIs(data.kpis, data.meta);
    updateZoneGrid(data.zones);
    updateAlertFeed(data.alerts);
    updateGateStrip(data.gates);
    updateGateList(data.gates);
    updateRoutingSuggestions(data.zones);
    updateQueueLists(data.queues);
    updateStaffList(data.staff);
    updateTransportList(data.transport);
    updateAgentStatuses(data.agentStatuses);
    updateSystemHealth(data.systemHealth);
    updateAnalyticsCharts(data.analytics);
    updateSidebarEventInfo(data.meta);
    updateROI(data.analytics.roiMetrics);
    updatePhaseMetrics(data.kpis, data.meta);
    updateEventDetails(data.meta);
}

/* ──────────────────────────────────────────────
   KPI CARDS
────────────────────────────────────────────── */
function updateKPIs(kpis, meta) {
    if (!kpis) return;
    setText('kpi-gates-val', `${kpis.gatesOpen} / ${kpis.gatesTotal}`);
    setText('kpi-wait-val', `${kpis.avgWaitMin} min`);
    setText('kpi-alerts-val', kpis.activeAlerts);
    setText('kpi-revenue-val', `$${kpis.revenueKUSD}K`);
    setText('kpi-sat-val', `${kpis.fanSatisfaction}%`);
    setText('kpi-safety-val', `${kpis.safetyScore}%`);

    // Header badge
    if (meta) {
        setText('current-capacity', meta.attendance.toLocaleString());
        setText('tracked-count', meta.attendance.toLocaleString());
        setText('attendance-val', meta.attendance.toLocaleString());
        setText('match-time-val', `${meta.matchTime}'`);
    }

    // Badge for queue tab
    const alertBadge = document.getElementById('queue-alert-badge');
    if (alertBadge) {
        alertBadge.style.display = kpis.activeAlerts > 0 ? 'inline-flex' : 'none';
    }

    updateSparklines(kpis);
}

/* ──────────────────────────────────────────────
   SPARKLINES (mini Chart.js)
────────────────────────────────────────────── */
function updateSparklines(kpis) {
    const sparks = ['gates', 'wait', 'alerts', 'revenue', 'sat', 'safety'];
    sparks.forEach(id => {
        const canvas = document.getElementById(`spark-${id}`);
        if (!canvas) return;
        const vals = Array.from({ length: 8 }, () => Math.random() * 100);
        if (charts[`spark-${id}`]) charts[`spark-${id}`].destroy();
        charts[`spark-${id}`] = new Chart(canvas, {
            type: 'line',
            data: {
                labels: vals.map((_, i) => i),
                datasets: [{
                    data: vals,
                    borderColor: 'rgba(0,212,255,0.6)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(0,212,255,0.08)',
                }]
            },
            options: {
                responsive: false,
                animation: false,
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    });
}

/* ──────────────────────────────────────────────
   ZONE GRID
────────────────────────────────────────────── */
function updateZoneGrid(zones) {
    const grid = document.getElementById('zone-grid');
    if (!grid || !zones) return;
    grid.innerHTML = zones.map(z => {
        const pct = Math.round(z.density * 100);
        const cls = pct >= 80 ? 'critical' : pct >= 55 ? 'moderate' : 'normal';
        const color = pct >= 80 ? 'var(--red)' : pct >= 55 ? 'var(--amber)' : 'var(--emerald)';
        return `
        <div class="zone-card ${cls}">
            <div class="zone-id" style="color:${color}">${z.id}</div>
            <div class="zone-name">${z.name}</div>
            <div class="zone-density-bar">
                <div class="zone-density-fill" style="width:${pct}%;background:${color}"></div>
            </div>
            <div class="zone-pct" style="color:${color}">${pct}%</div>
            <div class="zone-trend">${z.trend === 'rising' ? '↑' : z.trend === 'falling' ? '↓' : '→'}</div>
        </div>`;
    }).join('');
}

/* ──────────────────────────────────────────────
   ALERT FEED
────────────────────────────────────────────── */
function updateAlertFeed(alerts) {
    const feed = document.getElementById('alert-feed');
    if (!feed || !alerts) return;
    const colorMap = {
        warning: 'var(--amber)', info: 'var(--cyan)',
        success: 'var(--emerald)', critical: 'var(--red)'
    };
    const newItems = alerts.map(a => `
        <div class="alert-item" style="border-left-color:${colorMap[a.type] || 'var(--cyan)'}">
            <span class="alert-icon">${a.icon}</span>
            <div class="alert-body">
                <div class="alert-title">${a.title}</div>
                <div class="alert-msg">${a.msg}</div>
            </div>
            <div class="alert-time">${a.time}</div>
        </div>`).join('');

    // Prepend new, keep max 20 items
    feed.insertAdjacentHTML('afterbegin', newItems);
    while (feed.children.length > 20) feed.removeChild(feed.lastChild);
}

function clearAlerts() {
    const feed = document.getElementById('alert-feed');
    if (feed) feed.innerHTML = '';
    showToast('Alert feed cleared', 'info');
}

/* ──────────────────────────────────────────────
   GATE STRIP & LIST
────────────────────────────────────────────── */
function updateGateStrip(gates) {
    const strip = document.getElementById('gate-strip');
    if (!strip || !gates) return;
    strip.innerHTML = gates.map(g => {
        const pct = Math.round((g.throughput / g.cap) * 100);
        const c = g.status === 'green' ? 'var(--emerald)' : g.status === 'yellow' ? 'var(--amber)' : 'var(--red)';
        return `<div class="gate-indicator" style="border-color:${c}" title="${g.name}: ${g.throughput}/hr">
            <span style="color:${c}">${g.id}</span>
            <span class="gate-pct">${pct}%</span>
        </div>`;
    }).join('');
}

function updateGateList(gates) {
    const list = document.getElementById('gate-list');
    if (!list || !gates) return;
    list.innerHTML = gates.map(g => {
        const pct = Math.round((g.throughput / g.cap) * 100);
        const c = g.status === 'green' ? 'var(--emerald)' : g.status === 'yellow' ? 'var(--amber)' : 'var(--red)';
        return `<div class="gate-row">
            <span class="gate-label" style="color:${c}">${g.name}</span>
            <div class="gate-bar-wrap">
                <div class="gate-bar-fill" style="width:${pct}%;background:${c}"></div>
            </div>
            <span class="gate-val">${g.throughput}/hr</span>
        </div>`;
    }).join('');
}

function updateRoutingSuggestions(zones) {
    const list = document.getElementById('routing-list');
    if (!list || !zones) return;
    const hotspots = zones.filter(z => z.density > 0.7).slice(0, 3);
    if (hotspots.length === 0) {
        list.innerHTML = '<div class="routing-ok">✅ All zones within normal limits</div>';
        return;
    }
    list.innerHTML = hotspots.map(z => `
        <div class="routing-item">
            <span class="routing-zone">${z.name}</span>
            <span class="routing-action">→ Redirect via ${z.sector} corridor</span>
        </div>`).join('');
}

/* ──────────────────────────────────────────────
   QUEUE LISTS
────────────────────────────────────────────── */
function updateQueueLists(queues) {
    if (!queues) return;
    renderQueueItems('concession-list', queues.concessions, 'concession');
    renderQueueItems('restroom-list', queues.restrooms, 'restroom');
    renderQueueItems('entry-list', queues.entry, 'entry');
}

function renderQueueItems(containerId, items, type) {
    const el = document.getElementById(containerId);
    if (!el || !items) return;
    el.innerHTML = items.map(item => {
        const wait = item.waitMin;
        const cls = wait > 10 ? 'high' : wait > 5 ? 'medium' : 'low';
        const wc = wait > 10 ? 'var(--red)' : wait > 5 ? 'var(--amber)' : 'var(--emerald)';
        const vqTag = item.virtualQueueActive
            ? '<span class="vq-tag">VQ Active</span>' : '';
        const bioTag = item.biometric
            ? '<span class="bio-tag">Biometric</span>' : '';
        const extra = type === 'concession'
            ? `<span class="q-extra">${item.ordersQueued} queued · ${item.staffCount} staff</span>`
            : type === 'restroom'
                ? `<span class="q-extra">${item.occupancy}% occupied</span>`
                : `<span class="q-extra">${(item.throughput || 0)}/hr</span>`;
        return `
        <div class="queue-item ${cls}">
            <div class="qi-name">${item.name}</div>
            <div class="qi-meta">
                ${extra} ${vqTag} ${bioTag}
            </div>
            <div class="qi-wait" style="color:${wc}">${wait} min</div>
            <div class="qi-bar">
                <div class="qi-fill" style="width:${Math.min(wait * 8, 100)}%;background:${wc}"></div>
            </div>
        </div>`;
    }).join('');
}

/* ──────────────────────────────────────────────
   STAFF LIST
────────────────────────────────────────────── */
function updateStaffList(staff) {
    const list = document.getElementById('staff-list');
    if (!list || !staff) return;
    list.innerHTML = staff.map(t => {
        const sc = t.status === 'alert' ? 'var(--red)' : t.status === 'busy' ? 'var(--amber)' : 'var(--emerald)';
        return `
        <div class="staff-item">
            <span class="staff-icon">${t.icon}</span>
            <div class="staff-info">
                <div class="staff-name">${t.name}</div>
                <div class="staff-zone">${t.zone}</div>
            </div>
            <div class="staff-count">${t.count}</div>
            <div class="staff-status" style="color:${sc}">${t.status}</div>
        </div>`;
    }).join('');
}

/* ──────────────────────────────────────────────
   TRANSPORT LIST
────────────────────────────────────────────── */
function updateTransportList(transport) {
    const list = document.getElementById('transport-list');
    if (!list || !transport) return;
    list.innerHTML = transport.map(t => {
        const lc = t.load > 75 ? 'var(--red)' : t.load > 50 ? 'var(--amber)' : 'var(--emerald)';
        return `
        <div class="transport-item">
            <span class="transport-icon">${t.icon}</span>
            <div class="transport-info">
                <div class="transport-name">${t.name}</div>
                <div class="transport-detail">${t.detail}</div>
            </div>
            <div class="transport-eta">${t.eta}</div>
            <div class="transport-load" style="color:${lc}">${t.load}%</div>
        </div>`;
    }).join('');
}

/* ──────────────────────────────────────────────
   AI AGENTS
────────────────────────────────────────────── */
const AGENT_IDS = ['crowd', 'queue', 'safety', 'revenue', 'transport'];

function updateAgentStatuses(statuses) {
    if (!statuses) return;
    AGENT_IDS.forEach(id => {
        const el = document.getElementById(`agent-${id}-status`);
        if (el && statuses[id]) el.textContent = statuses[id];
    });
}

/* ──────────────────────────────────────────────
   SYSTEM HEALTH GRID
────────────────────────────────────────────── */
function updateSystemHealth(health) {
    const grid = document.getElementById('system-grid');
    if (!grid || !health) return;
    grid.innerHTML = health.map(h => `
        <div class="sys-item ${h.cls}">
            <div class="sys-name">${h.name}</div>
            <div class="sys-val">${h.val}</div>
            <div class="sys-dot" style="background:${h.cls === 'ok' ? 'var(--emerald)' : 'var(--amber)'}"></div>
        </div>`).join('');
}

/* ──────────────────────────────────────────────
   SIDEBAR EVENT INFO
────────────────────────────────────────────── */
function updateSidebarEventInfo(meta) {
    if (!meta) return;
    setText('sidebar-event-name', meta.event);
    setText('sidebar-event-time', `${meta.matchTime}' — ${meta.matchPeriod}`);
    const weatherEl = document.querySelector('.meta-item strong:last-of-type');
    if (meta.weather) {
        setText('match-time-val', `${meta.matchTime}'`);
    }
}

/* ──────────────────────────────────────────────
   EVENT DETAILS (Event Control tab)
────────────────────────────────────────────── */
function updateEventDetails(meta) {
    if (!meta) return;
    setText('attendance-val', meta.attendance.toLocaleString());
    setText('match-time-val', `${meta.matchTime}'`);
}

/* ──────────────────────────────────────────────
   ROI METRICS
────────────────────────────────────────────── */
function updateROI(roi) {
    if (!roi) return;
    setText('roi-wait', `${roi.waitReduction}%`);
    setText('roi-rev', `+${roi.revenueUplift}%`);
    setText('roi-nps', `+${roi.npsPoints}`);
    setText('roi-incidents', `${roi.incidentReduction}%`);
    setText('roi-staff', `${roi.staffCostReduction}%`);
    setText('roi-payback', `${roi.paybackMonths}mo`);
}

/* ──────────────────────────────────────────────
   PHASE METRICS
────────────────────────────────────────────── */
function updatePhaseMetrics(kpis, meta) {
    const el = document.getElementById('phase-metrics-content');
    if (!el || !kpis) return;
    el.innerHTML = `
        <div class="metric-grid">
            <div class="metric-box"><div class="mb-val">${kpis.throughputPH.toLocaleString()}</div><div class="mb-lbl">Throughput/hr</div></div>
            <div class="metric-box"><div class="mb-val">${kpis.avgWaitMin} min</div><div class="mb-lbl">Avg Wait</div></div>
            <div class="metric-box"><div class="mb-val">${kpis.gatesOpen}/${kpis.gatesTotal}</div><div class="mb-lbl">Gates Open</div></div>
            <div class="metric-box"><div class="mb-val">${kpis.fanSatisfaction}%</div><div class="mb-lbl">Satisfaction</div></div>
            <div class="metric-box"><div class="mb-val">${kpis.safetyScore}%</div><div class="mb-lbl">Safety Score</div></div>
            <div class="metric-box"><div class="mb-val">$${kpis.revenueKUSD}K</div><div class="mb-lbl">Revenue</div></div>
        </div>`;
}

/* ──────────────────────────────────────────────
   PHASE TIMELINE
────────────────────────────────────────────── */
const PHASES = [
    { label: 'Pre-Event', icon: '🎯', detail: 'Gates open · Transport coordinated' },
    { label: 'Entry', icon: '🚪', detail: 'Biometric scan · Crowd routing' },
    { label: 'Match', icon: '⚽', detail: 'Live AI monitoring · Virtual queues' },
    { label: 'Halftime', icon: '⏸', detail: 'Surge management · Concession push' },
    { label: '2nd Half', icon: '🔁', detail: 'Continued AI monitoring' },
    { label: 'Exit', icon: '🚇', detail: 'Dispersal routing · Transport sync' },
];

function renderPhaseTimeline() {
    const el = document.getElementById('phase-timeline');
    if (!el) return;
    el.innerHTML = PHASES.map((p, i) => {
        const cls = i < currentPhase ? 'done' : i === currentPhase ? 'active' : '';
        return `
        <div class="phase-step ${cls}" id="phase-step-${i}">
            <div class="phase-icon">${p.icon}</div>
            <div class="phase-info">
                <div class="phase-label">${p.label}</div>
                <div class="phase-detail">${p.detail}</div>
            </div>
            ${i === currentPhase ? '<div class="phase-now">NOW</div>' : ''}
        </div>`;
    }).join('');
}

function advancePhase() {
    currentPhase = (currentPhase + 1) % PHASES.length;
    renderPhaseTimeline();
    showToast(`Moved to phase: ${PHASES[currentPhase].label}`, 'info');
}

/* ──────────────────────────────────────────────
   ANALYTICS CHARTS
────────────────────────────────────────────── */
function initCharts() {
    const isDark = document.documentElement.dataset.theme !== 'light';
    const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
    const tickColor = isDark ? '#454F6A' : '#94A3B8';
    const textColor = isDark ? '#F0F4FF' : '#0F172A';

    Chart.defaults.color = tickColor;
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Crowd Flow
    const cfCtx = document.getElementById('crowd-flow-chart');
    if (cfCtx) {
        charts['crowd-flow'] = new Chart(cfCtx, {
            type: 'line',
            data: {
                labels: ['12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM', '12AM'],
                datasets: [{
                    label: 'Crowd Volume',
                    data: [5000, 12000, 28000, 41000, 47000, 50000, 48000, 49000, 47000, 35000, 18000, 8000, 2000],
                    borderColor: '#00D4FF',
                    backgroundColor: 'rgba(0,212,255,0.12)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#00D4FF'
                }]
            },
            options: chartOpts(gridColor, tickColor, '# Attendees')
        });
    }

    // Revenue
    const rvCtx = document.getElementById('revenue-chart');
    if (rvCtx) {
        charts['revenue'] = new Chart(rvCtx, {
            type: 'bar',
            data: {
                labels: ['Pre-Match', '1st Half', 'HT', '2nd Half', 'Post'],
                datasets: [{
                    label: 'Revenue ($K)',
                    data: [42, 68, 155, 105, 24],
                    backgroundColor: ['rgba(0,212,255,0.6)', 'rgba(0,255,136,0.6)', 'rgba(168,85,247,0.7)', 'rgba(0,255,136,0.6)', 'rgba(0,212,255,0.4)'],
                    borderRadius: 6
                }]
            },
            options: chartOpts(gridColor, tickColor, '$K')
        });
    }

    // Gate Throughput Radar
    const grCtx = document.getElementById('gate-radar-chart');
    if (grCtx) {
        charts['gate-radar'] = new Chart(grCtx, {
            type: 'radar',
            data: {
                labels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'],
                datasets: [{
                    label: 'Throughput %',
                    data: [85, 72, 90, 65, 88, 78, 55, 80],
                    borderColor: '#00FF88',
                    backgroundColor: 'rgba(0,255,136,0.12)',
                    pointBackgroundColor: '#00FF88'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        grid: { color: gridColor },
                        ticks: { display: false },
                        pointLabels: { color: tickColor }
                    }
                }
            }
        });
    }

    // Wait Time
    const wtCtx = document.getElementById('wait-chart');
    if (wtCtx) {
        charts['wait'] = new Chart(wtCtx, {
            type: 'line',
            data: {
                labels: ['Pre', 'Entry', '1H', 'HT', '2H', 'Post'],
                datasets: [
                    {
                        label: 'Without SmartFlow',
                        data: [18.4, 15, 11, 8.5, 6, 4],
                        borderColor: '#FF4466',
                        backgroundColor: 'rgba(255,68,102,0.08)',
                        fill: true, tension: 0.4, pointRadius: 3
                    },
                    {
                        label: 'With SmartFlow',
                        data: [4.2, 3.5, 3.8, 4.5, 3.2, 2.1],
                        borderColor: '#00FF88',
                        backgroundColor: 'rgba(0,255,136,0.1)',
                        fill: true, tension: 0.4, pointRadius: 3
                    }
                ]
            },
            options: chartOpts(gridColor, tickColor, 'Min')
        });
    }

    // NPS
    const npsCtx = document.getElementById('nps-chart');
    if (npsCtx) {
        charts['nps'] = new Chart(npsCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'NPS Score',
                    data: [24, 38, 48, 55, 63, 72],
                    borderColor: '#A855F7',
                    backgroundColor: 'rgba(168,85,247,0.12)',
                    fill: true, tension: 0.4, pointRadius: 4,
                    pointBackgroundColor: '#A855F7'
                }]
            },
            options: chartOpts(gridColor, tickColor, 'NPS')
        });
    }

    // Prediction mini chart (crowd tab)
    const predCtx = document.getElementById('prediction-chart');
    if (predCtx) {
        charts['prediction'] = new Chart(predCtx, {
            type: 'line',
            data: {
                labels: ['+0', '+3', '+6', '+9', '+12', '+15'],
                datasets: [{
                    label: 'Predicted',
                    data: [47000, 48200, 46800, 45000, 44100, 43500],
                    borderColor: '#FFB800',
                    backgroundColor: 'rgba(255,184,0,0.1)',
                    fill: true, tension: 0.4, pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } },
                    y: { display: false }
                }
            }
        });
    }
}

function updateAnalyticsCharts(analytics) {
    if (!analytics) return;
    if (charts['crowd-flow'] && analytics.crowdFlow) {
        charts['crowd-flow'].data.datasets[0].data = analytics.crowdFlow;
        charts['crowd-flow'].update('none');
    }
    if (charts['revenue'] && analytics.revenue) {
        charts['revenue'].data.datasets[0].data = analytics.revenue;
        charts['revenue'].update('none');
    }
    if (charts['gate-radar'] && analytics.gateThroughput) {
        charts['gate-radar'].data.datasets[0].data = analytics.gateThroughput;
        charts['gate-radar'].update('none');
    }
    if (charts['wait'] && analytics.waitHistory) {
        charts['wait'].data.datasets[0].data = analytics.waitHistory;
        charts['wait'].update('none');
    }
    if (charts['nps'] && analytics.npsHistory) {
        charts['nps'].data.datasets[0].data = analytics.npsHistory;
        charts['nps'].update('none');
    }
}

function chartOpts(gridColor, tickColor, yLabel) {
    return {
        responsive: true,
        plugins: {
            legend: { display: true, labels: { color: tickColor, boxWidth: 12, font: { size: 11 } } }
        },
        scales: {
            x: { grid: { color: gridColor }, ticks: { color: tickColor } },
            y: { grid: { color: gridColor }, ticks: { color: tickColor } }
        }
    };
}

/* ──────────────────────────────────────────────
   MINI HEATMAP (Command Center)
────────────────────────────────────────────── */
const ZONES_LAYOUT = [
    { x: 0.1, y: 0.1, w: 0.35, h: 0.35, label: 'North Stand' },
    { x: 0.55, y: 0.1, w: 0.35, h: 0.35, label: 'East Upper' },
    { x: 0.1, y: 0.55, w: 0.35, h: 0.35, label: 'South Stand' },
    { x: 0.55, y: 0.55, w: 0.35, h: 0.35, label: 'West Lower' },
    { x: 0.35, y: 0.35, w: 0.3, h: 0.3, label: 'Pitch' },
];

let miniHeatInterval = null;

function drawMiniHeatmap() {
    const canvas = document.getElementById('mini-heatmap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 500;
    const H = canvas.offsetHeight || 260;
    canvas.width = W;
    canvas.height = H;

    ctx.clearRect(0, 0, W, H);

    const isDark = document.documentElement.dataset.theme !== 'light';
    ctx.fillStyle = isDark ? 'rgba(13,18,32,0.8)' : 'rgba(240,244,255,0.8)';
    ctx.fillRect(0, 0, W, H);

    // Draw pitch outline
    ctx.strokeStyle = isDark ? 'rgba(0,212,255,0.2)' : 'rgba(0,149,204,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(W * 0.35, H * 0.28, W * 0.3, H * 0.44);

    ZONES_LAYOUT.forEach(zone => {
        const density = liveSnapshot
            ? (liveSnapshot.zones?.find(z => z.name.includes(zone.label.split(' ')[0]))?.density || Math.random())
            : Math.random();

        const x = zone.x * W, y = zone.y * H;
        const w = zone.w * W, h = zone.h * H;

        const r = zone.label === 'Pitch' ? 0 : density * 255;
        const g = zone.label === 'Pitch' ? 80 : (1 - density) * 160;
        const b = zone.label === 'Pitch' ? 0 : 50;
        const alpha = zone.label === 'Pitch' ? 0.15 : 0.55;

        ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 6);
        ctx.fill();

        if (zone.label !== 'Pitch') {
            ctx.fillStyle = isDark ? 'rgba(240,244,255,0.8)' : 'rgba(15,23,42,0.8)';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(zone.label, x + w / 2, y + h / 2 - 4);
            ctx.fillStyle = density > 0.7 ? '#FF4466' : density > 0.5 ? '#FFB800' : '#00FF88';
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.fillText(`${Math.round(density * 100)}%`, x + w / 2, y + h / 2 + 10);
        }
    });

    ctx.strokeStyle = isDark ? 'rgba(0,212,255,0.1)' : 'rgba(0,149,204,0.15)';
    ctx.strokeRect(0, 0, W, H);
}

/* ──────────────────────────────────────────────
   CROWD SIMULATION CANVAS
────────────────────────────────────────────── */
let particles = [];

function startCrowdSimulation() {
    particles = Array.from({ length: 120 }, () => createParticle());
    drawMiniHeatmap();
    if (!miniHeatInterval) {
        miniHeatInterval = setInterval(drawMiniHeatmap, 3000);
    }
    animateCrowd();
}

function createParticle() {
    return {
        x: Math.random() * 760,
        y: Math.random() * 480,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        r: Math.random() * 3 + 1.5,
        color: pickColor(),
        life: Math.random() * 200 + 100
    };
}

function pickColor() {
    const colors = ['#00D4FF', '#00FF88', '#FFB800', '#A855F7', '#FF4466'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function animateCrowd() {
    if (!isSimRunning) {
        animFrameId = requestAnimationFrame(animateCrowd);
        return;
    }
    const canvas = document.getElementById('crowd-canvas');
    if (!canvas) { animFrameId = requestAnimationFrame(animateCrowd); return; }

    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Stadium background
    const isDark = document.documentElement.dataset.theme !== 'light';
    ctx.fillStyle = isDark ? 'rgba(6,9,18,0.35)' : 'rgba(238,242,255,0.35)';
    ctx.fillRect(0, 0, W, H);

    // Pitch
    ctx.fillStyle = isDark ? 'rgba(0,60,20,0.4)' : 'rgba(0,100,40,0.3)';
    ctx.beginPath();
    ctx.roundRect(W * 0.25, H * 0.25, W * 0.5, H * 0.5, 8);
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Zone density overlay
    drawZoneOverlay(ctx, W, H, isDark);

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        // Bounce off walls, avoid pitch center
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        if (p.life <= 0) {
            particles[i] = createParticle();
            continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + 'CC';
        ctx.fill();
    }

    // Flow vectors when in flow mode
    if (crowdLayer === 'flow') drawFlowVectors(ctx, W, H);

    animFrameId = requestAnimationFrame(animateCrowd);
}

function drawZoneOverlay(ctx, W, H, isDark) {
    const zones = liveSnapshot?.zones || [];
    const overlayZones = [
        { x: 0, y: 0, w: W * 0.25, h: H * 0.4, label: 'NW' },
        { x: W * 0.75, y: 0, w: W * 0.25, h: H * 0.4, label: 'NE' },
        { x: 0, y: H * 0.6, w: W * 0.25, h: H * 0.4, label: 'SW' },
        { x: W * 0.75, y: H * 0.6, w: W * 0.25, h: H * 0.4, label: 'SE' },
    ];
    overlayZones.forEach(oz => {
        const zData = zones.find(z => z.id === oz.label);
        const density = zData ? zData.density : Math.random() * 0.6 + 0.2;
        const r = density > 0.8 ? 255 : density > 0.5 ? 255 : 0;
        const g = density > 0.8 ? 50 : density > 0.5 ? 184 : 255;
        const b = density > 0.8 ? 70 : density > 0.5 ? 0 : 136;
        ctx.fillStyle = `rgba(${r},${g},${b},${density * 0.2})`;
        ctx.fillRect(oz.x, oz.y, oz.w, oz.h);
    });
}

function drawFlowVectors(ctx, W, H) {
    ctx.strokeStyle = 'rgba(0,212,255,0.5)';
    ctx.lineWidth = 1.5;
    const step = 60;
    for (let x = step; x < W; x += step) {
        for (let y = step; y < H; y += step) {
            const angle = Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5) * 0.5;
            const len = 18;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            ctx.stroke();
        }
    }
}

function toggleSimulation() {
    isSimRunning = !isSimRunning;
    const btn = document.getElementById('sim-toggle');
    if (btn) btn.textContent = isSimRunning ? '⏸ Pause' : '▶ Resume';
}

function setCrowdLayer(val) {
    crowdLayer = val;
    showToast(`Layer: ${val}`, 'info');
}

/* ──────────────────────────────────────────────
   VIRTUAL QUEUE
────────────────────────────────────────────── */
async function addVirtualQueueDemo() {
    const stands = ['🍔 Stand 1', '🌭 Stand 2', '🍺 Stand 3', '🍕 Stand 4', '🥃 Stand 5'];
    const stand = stands[Math.floor(Math.random() * stands.length)];

    let slot, etaMin, savedMin;
    try {
        const res = await fetch(`${API_BASE}/api/virtual-queue/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stand })
        });
        const data = await res.json();
        slot = data.slot; etaMin = data.etaMin; savedMin = data.savedMin;
    } catch {
        slot = `VQ-${Math.floor(Math.random() * 9000) + 1000}`;
        etaMin = Math.floor(Math.random() * 8) + 3;
        savedMin = Math.floor(Math.random() * 9) + 4;
    }

    vqSlots.unshift({ slot, stand, etaMin, savedMin, ts: new Date().toLocaleTimeString() });
    vqTotal.saved += savedMin;
    vqTotal.orders += 1;
    vqTotal.revenue += Math.floor(Math.random() * 25) + 8;

    renderVirtualQueue();
    showToast(`VQ slot ${slot} confirmed for ${stand}`, 'success');
}

function renderVirtualQueue() {
    const list = document.getElementById('virtual-queue-list');
    const countEl = document.getElementById('vq-count');
    if (!list) return;

    if (countEl) countEl.textContent = `${vqSlots.length} active slot${vqSlots.length !== 1 ? 's' : ''}`;
    setText('vq-saved', vqTotal.saved);
    setText('vq-orders', vqTotal.orders);
    setText('vq-revenue', `$${vqTotal.revenue}`);

    list.innerHTML = vqSlots.slice(0, 8).map(v => `
        <div class="vq-item">
            <div class="vq-slot-id">${v.slot}</div>
            <div class="vq-stand">${v.stand}</div>
            <div class="vq-eta">ETA ${v.etaMin} min</div>
            <div class="vq-saved">↓ ${v.savedMin} min wait</div>
        </div>`).join('') || '<div class="vq-empty">No active slots — join a virtual queue to start</div>';
}

/* ──────────────────────────────────────────────
   SURGE SIMULATION
────────────────────────────────────────────── */
function triggerSurge() {
    const banner = document.getElementById('surge-banner');
    if (banner) { banner.style.display = 'flex'; }
    showToast('⚡ Halftime surge simulated — AI activated', 'warning');
    // Temporarily spike wait times
    const items = document.querySelectorAll('.qi-wait');
    items.forEach(el => {
        const orig = parseFloat(el.textContent);
        el.textContent = `${(orig * 2.5).toFixed(1)} min`;
        el.style.color = 'var(--red)';
    });
    setTimeout(() => {
        showToast('AI resolved the halftime surge', 'success');
    }, 5000);
}

function dismissSurge() {
    const banner = document.getElementById('surge-banner');
    if (banner) banner.style.display = 'none';
}

/* ──────────────────────────────────────────────
   BROADCAST CENTER
────────────────────────────────────────────── */
function initBroadcastTypeButtons() {
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            broadcastType = btn.dataset.type;
            const templates = {
                routing: 'Gates C1–C4 now open — fastest route for North Stand attendees.',
                promo: '🍕 Half-price pizza at Stand 4 for the next 10 minutes!',
                safety: '⚠ Please move to the South concourse — congestion detected in North Stand.',
                transport: '🚇 Metro Line 1 departs in 8 min from Platform 4.'
            };
            const input = document.getElementById('broadcast-input');
            if (input) input.value = templates[broadcastType] || '';
        });
    });
}

async function sendBroadcast() {
    const msgEl = document.getElementById('broadcast-input');
    const targetEl = document.getElementById('broadcast-target');
    const logEl = document.getElementById('broadcast-log');
    if (!msgEl || !msgEl.value.trim()) { showToast('Please enter a message', 'warning'); return; }

    const message = msgEl.value.trim();
    const target = targetEl ? targetEl.value : 'All';

    let delivered, latencyMs;
    try {
        const res = await fetch(`${API_BASE}/api/broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, target })
        });
        const data = await res.json();
        delivered = data.delivered; latencyMs = data.latencyMs;
    } catch {
        delivered = Math.floor(Math.random() * 38000) + 10000;
        latencyMs = Math.floor(Math.random() * 220) + 80;
    }

    showToast(`📡 Broadcast sent to ${delivered.toLocaleString()} attendees`, 'success');

    if (logEl) {
        const entry = document.createElement('div');
        entry.className = 'broadcast-entry';
        entry.innerHTML = `<span class="be-time">${new Date().toLocaleTimeString()}</span>
            <span class="be-target">${target.split('(')[0].trim()}</span>
            <span class="be-msg">${message.slice(0, 60)}${message.length > 60 ? '…' : ''}</span>
            <span class="be-delivered">${delivered.toLocaleString()} delivered · ${latencyMs}ms</span>`;
        logEl.prepend(entry);
    }
    msgEl.value = '';
}

/* ──────────────────────────────────────────────
   PHONE APP PREVIEW
────────────────────────────────────────────── */
const PHONE_VIEWS = {
    home: () => `
        <div style="background:linear-gradient(135deg,#00D4FF22,#A855F722);padding:16px;border-radius:12px;margin-bottom:12px;">
            <div style="font-size:11px;opacity:.7;">ARSENAL FC</div>
            <div style="font-size:20px;font-weight:700;">2 — 1</div>
            <div style="font-size:11px;opacity:.7;">65' · 2nd Half</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div style="background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.2);border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:18px;">⏱</div>
                <div style="font-size:12px;font-weight:600;">3.2 min</div>
                <div style="font-size:9px;opacity:.6;">Avg Wait</div>
            </div>
            <div style="background:rgba(0,255,136,.1);border:1px solid rgba(0,255,136,.2);border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:18px;">🚪</div>
                <div style="font-size:12px;font-weight:600;">Gate C</div>
                <div style="font-size:9px;opacity:.6;">Recommended</div>
            </div>
        </div>
        <div style="margin-top:10px;background:rgba(255,184,0,.1);border:1px solid rgba(255,184,0,.2);border-radius:8px;padding:10px;font-size:11px;">
            📱 Your VQ slot: <strong>#VQ-7741</strong> — Stand 3, ready in 4 min
        </div>`,

    navigate: () => `
        <div style="background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);border-radius:8px;padding:10px;margin-bottom:10px;font-size:11px;">
            📍 BLE Beacon: North Concourse · Section C14
        </div>
        <div style="background:rgba(6,9,18,.5);border-radius:8px;height:110px;display:flex;align-items:center;justify-content:center;font-size:11px;opacity:.6;margin-bottom:10px;">
            [ Indoor AR Map ]
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:11px;">
            <div style="display:flex;justify-content:space-between;padding:8px;background:rgba(0,255,136,.1);border-radius:6px;">
                <span>🍔 Stand 3 — Craft Beers</span><span style="color:#00FF88">2.1 min</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px;background:rgba(255,184,0,.1);border-radius:6px;">
                <span>🚻 Restroom B</span><span style="color:#FFB800">4.8 min</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px;background:rgba(0,212,255,.08);border-radius:6px;">
                <span>🪑 Your Seat: Row F-22</span><span style="color:#00D4FF">1 min</span>
            </div>
        </div>`,

    order: () => `
        <div style="font-weight:600;font-size:12px;margin-bottom:8px;">🍺 Order to Seat F-22</div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:11px;margin-bottom:10px;">
            ${['🍔 Smash Burger — £9', '🍕 Margherita Slice — £6', '🥃 Craft IPA — £5.50', '🥙 Vegan Wrap — £8'].map(item =>
        `<div style="display:flex;justify-content:space-between;padding:8px;background:rgba(255,255,255,.05);border-radius:6px;border:1px solid rgba(255,255,255,.06);">
                    <span>${item}</span>
                    <button onclick="addItem(this)" style="background:rgba(0,212,255,.2);border:none;border-radius:4px;color:#00D4FF;padding:2px 8px;cursor:pointer;font-size:10px;">+</button>
                </div>`).join('')}
        </div>
        <div style="background:rgba(0,255,136,.12);border:1px solid rgba(0,255,136,.25);border-radius:8px;padding:10px;font-size:10px;">
            🚀 Express delivery · Est. 4 min · <strong>£0 fee</strong>
        </div>`,

    ar: () => `
        <div style="background:rgba(6,9,18,.6);border-radius:8px;height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:10px;border:1px dashed rgba(0,212,255,.3);">
            <div style="font-size:24px;">📡</div>
            <div style="font-size:10px;opacity:.6;margin-top:4px;">Point at pitch for AR overlay</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;">
            ${[['⚽', 'Live Stats'], ['👤', 'Player Info'], ['🎬', 'Replay'], ['📊', 'Analytics']].map(([i, l]) =>
        `<div style="padding:10px;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.2);border-radius:8px;text-align:center;cursor:pointer;">
                    <div style="font-size:16px;">${i}</div><div>${l}</div>
                </div>`).join('')}
        </div>`
};

function renderPhoneApp() {
    const appEl = document.getElementById('phone-app-view');
    if (!appEl) return;
    appEl.innerHTML = PHONE_VIEWS[currentPhoneView]
        ? PHONE_VIEWS[currentPhoneView]()
        : PHONE_VIEWS.home();

    // Update dots
    const dots = document.querySelectorAll('.dot-btn');
    const views = ['home', 'navigate', 'order', 'ar'];
    dots.forEach((d, i) => {
        d.classList.toggle('active', views[i] === currentPhoneView);
    });
}

function setPhoneView(view) {
    currentPhoneView = view;
    renderPhoneApp();
}

function addItem(btn) {
    btn.textContent = '✓';
    btn.style.color = '#00FF88';
    showToast('Added to order', 'success');
}

/* ──────────────────────────────────────────────
   EVENT CONTROL
────────────────────────────────────────────── */
function changeEvent(type) {
    const events = {
        football: { teams: 'Arsenal vs Man City', score: '2 — 1', badge1: 'ARS', badge2: 'MCI', c1: 'red', c2: 'blue' },
        cricket: { teams: 'England vs India', score: '284 / 6', badge1: 'ENG', badge2: 'IND', c1: 'blue', c2: 'orange' },
        olympics: { teams: '100m Final', score: '9.84s', badge1: '🥇', badge2: '🥈', c1: 'gold', c2: 'silver' }
    };
    const ev = events[type] || events.football;
    setText('match-score', ev.score);
    document.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
    showToast(`Switched to ${ev.teams} mode`, 'info');
}

function exportReport() {
    showToast('📄 PDF report queued — ready in 30 seconds', 'success');
}

/* ──────────────────────────────────────────────
   EMERGENCY MODE
────────────────────────────────────────────── */
function toggleEmergency() {
    emergencyMode = !emergencyMode;
    const overlay = document.getElementById('emergency-overlay');
    if (overlay) overlay.style.display = emergencyMode ? 'flex' : 'none';

    if (emergencyMode) {
        document.body.classList.add('emergency-active');
        showToast('⚠ Emergency mode activated — all agents on alert', 'critical');
    } else {
        document.body.classList.remove('emergency-active');
        showToast('✓ Emergency mode deactivated — returning to normal ops', 'success');
    }
}

function sendEvacAlert() {
    showToast('📡 Evacuation alert broadcast to 47,832 attendees', 'critical');
    toggleEmergency();
}

/* ──────────────────────────────────────────────
   NAVIGATION / TABS
────────────────────────────────────────────── */
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const tab = item.dataset.tab;
            if (!tab) return;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const panel = document.getElementById(`tab-${tab}`);
    const nav = document.getElementById(`nav-${tab}`);
    if (panel) panel.classList.add('active');
    if (nav) nav.classList.add('active');

    // Lazy-render phone app when switching to attendee tab
    if (tab === 'attendee') renderPhoneApp();
    // Redraw heatmap when switching to command tab
    if (tab === 'command') setTimeout(drawMiniHeatmap, 100);
}

/* ──────────────────────────────────────────────
   LIVE CLOCK
────────────────────────────────────────────── */
function startLiveClock() {
    function tick() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        setText('live-clock', `${h}:${m}:${s}`);
    }
    tick();
    setInterval(tick, 1000);
}

/* ──────────────────────────────────────────────
   RIBBON COUNTDOWN TIMER
────────────────────────────────────────────── */
function startRibbonTimer() {
    countdownSecs = POLL_INTERVAL / 1000;
    ribbonTimer = setInterval(() => {
        countdownSecs--;
        if (countdownSecs < 0) countdownSecs = POLL_INTERVAL / 1000;
        const pct = (countdownSecs / (POLL_INTERVAL / 1000)) * 100;
        const fill = document.getElementById('ribbon-fill');
        if (fill) fill.style.width = `${pct}%`;
        const cd = document.getElementById('bs-countdown');
        if (cd) cd.textContent = countdownSecs > 0 ? `${countdownSecs}s` : '';
    }, 1000);
}

function resetRibbonTimer() {
    countdownSecs = POLL_INTERVAL / 1000;
}

/* ──────────────────────────────────────────────
   THEME TOGGLE
────────────────────────────────────────────── */
function initTheme() {
    const saved = localStorage.getItem('smartflow-theme') || 'dark';
    document.documentElement.dataset.theme = saved;
    updateThemeIcons(saved);
}

function toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('smartflow-theme', next);
    updateThemeIcons(next);
    // Redraw canvases after theme change
    setTimeout(() => { drawMiniHeatmap(); }, 200);
}

function updateThemeIcons(theme) {
    const icon = theme === 'dark' ? '☀️' : '🌙';
    ['theme-icon', 'float-theme-icon'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = icon;
    });
}

/* ──────────────────────────────────────────────
   TOAST NOTIFICATIONS
────────────────────────────────────────────── */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const colorMap = {
        info: 'var(--cyan)', success: 'var(--emerald)',
        warning: 'var(--amber)', critical: 'var(--red)'
    };
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = colorMap[type] || 'var(--cyan)';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('toast-visible'), 10);
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

/* ──────────────────────────────────────────────
   FALLBACK SNAPSHOT (offline mode)
────────────────────────────────────────────── */
function buildFallbackSnapshot() {
    const r = (a, b) => Math.round(Math.random() * (b - a) + a);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    return {
        meta: {
            version: 1, timestamp: new Date().toISOString(),
            event: 'Arsenal vs Man City', stadium: 'Emirates Stadium',
            attendance: r(41000, 51500), capacity: 60704,
            matchTime: r(0, 90), matchPeriod: '2nd Half',
            weather: { temp: r(12, 28), condition: '⛅' }
        },
        kpis: {
            gatesOpen: r(20, 28), gatesTotal: 28,
            avgWaitMin: r(15, 55) / 10,
            activeAlerts: r(0, 8),
            revenueKUSD: r(140, 240),
            fanSatisfaction: r(880, 970) / 10,
            safetyScore: r(970, 999) / 10,
            throughputPH: r(38000, 52000)
        },
        zones: ['NW', 'NE', 'N', 'SW', 'SE', 'S', 'EL', 'EU', 'WL', 'WU', 'VP', 'FA'].map((id, i) => ({
            id, name: `Zone ${id}`, sector: String.fromCharCode(65 + i),
            density: r(15, 98) / 100,
            trend: pick(['stable', 'rising', 'falling'])
        })),
        queues: {
            concessions: Array.from({ length: 8 }, (_, i) => ({
                id: 'c' + i, name: `🍔 Stand ${i + 1}`,
                waitMin: r(5, 190) / 10, staffCount: r(2, 8),
                ordersQueued: r(0, 45), virtualQueueActive: Math.random() > 0.6
            })),
            restrooms: Array.from({ length: 5 }, (_, i) => ({
                id: 'r' + i, name: `🚻 Restroom ${i + 1}`,
                waitMin: r(3, 140) / 10, occupancy: r(30, 100)
            })),
            entry: Array.from({ length: 5 }, (_, i) => ({
                id: 'e' + i, name: `🚪 Gate ${i + 1}`,
                waitMin: r(5, 80) / 10, biometric: i < 3, throughput: r(200, 1000)
            }))
        },
        gates: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'].map(id => {
            const t = r(200, 980);
            return {
                id, name: `Gate ${id}`, throughput: t, cap: 1000,
                status: t > 750 ? 'green' : t > 450 ? 'yellow' : 'red'
            };
        }),
        staff: [
            { name: 'Team Alpha', zone: 'North Concourse', icon: '👮', count: r(3, 12), status: 'active' },
            { name: 'Team Beta', zone: 'East Stand', icon: '🦺', count: r(3, 12), status: 'busy' },
            { name: 'Team Gamma', zone: 'Concessions', icon: '👷', count: r(3, 12), status: 'active' },
            { name: 'Team Delta', zone: 'Exit Routes', icon: '👮', count: r(3, 12), status: 'active' },
            { name: 'Medic Unit', zone: 'First Aid', icon: '🚑', count: r(2, 6), status: 'active' },
        ],
        transport: [
            { icon: '🚇', name: 'Metro Line 1', detail: 'Platform 4 → Venue', eta: `${r(1, 10)} min`, load: r(30, 95) },
            { icon: '🚌', name: 'Bus Route 14', detail: 'Stop C → North Gate', eta: `${r(5, 20)} min`, load: r(20, 85) },
            { icon: '🚖', name: 'Taxi Zone', detail: 'Drop-off Bay 3', eta: 'Now', load: r(50, 100) },
            { icon: '🚌', name: 'Bus Route 22', detail: 'Park & Ride', eta: `${r(8, 25)} min`, load: r(15, 70) },
            { icon: '🚲', name: 'Cycle Hub', detail: 'Available bikes', eta: '–', load: r(5, 40) },
        ],
        alerts: Array.from({ length: 6 }, (_, i) => ({
            type: pick(['warning', 'info', 'success', 'critical']),
            icon: pick(['⚡', '📡', '✅', '🚨', '🌧️', '🤖']),
            title: pick(['Congestion Detected', 'Gate Suggestion', 'Queue Cleared', 'AI Rerouting']),
            msg: `AI action taken at ${new Date().toLocaleTimeString()}`,
            time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes() - i).padStart(2, '0')}`
        })),
        analytics: {
            crowdFlow: Array.from({ length: 13 }, () => r(0, 50000)),
            revenue: [r(30, 55), r(55, 80), r(120, 200), r(80, 130), r(15, 35)],
            gateThroughput: Array.from({ length: 8 }, () => r(25, 98)),
            waitHistory: [18.4, r(120, 150) / 10, r(80, 110) / 10, r(50, 80) / 10, r(35, 60) / 10, r(25, 45) / 10, r(15, 40) / 10],
            npsHistory: [24, r(32, 44), r(42, 54), r(50, 60), r(58, 68), r(65, 75)],
            roiMetrics: {
                waitReduction: -r(35, 51), revenueUplift: r(20, 34),
                npsPoints: r(55, 80), incidentReduction: -r(88, 98),
                staffCostReduction: -r(14, 24), paybackMonths: r(7, 14)
            }
        },
        systemHealth: [
            { name: 'IoT Beacons', val: '246 / 248', cls: 'ok' },
            { name: 'Camera Feeds', val: '244 Active', cls: 'ok' },
            { name: '5G Coverage', val: '99.1%', cls: 'ok' },
            { name: 'AI Engine', val: 'Online', cls: 'ok' },
            { name: 'Edge Processing', val: '12ms avg', cls: 'ok' },
            { name: 'Wi-Fi Load', val: `${r(40, 85)}%`, cls: 'ok' },
            { name: 'Ticketing API', val: 'Connected', cls: 'ok' },
            { name: 'Payment Gateway', val: 'Online', cls: 'ok' },
            { name: 'Emergency System', val: 'Standby', cls: 'ok' },
            { name: 'Transport APIs', val: '7/8 feeds', cls: 'ok' },
        ],
        agentStatuses: {
            crowd: 'Optimizing gate routing...',
            queue: 'Predicting halftime surge...',
            safety: `Monitoring 246 camera feeds`,
            revenue: `Upsell push sent to 3.2K users`,
            transport: `Coordinating 14 bus routes`
        }
    };
}

/* ──────────────────────────────────────────────
   UTILITY
────────────────────────────────────────────── */
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
