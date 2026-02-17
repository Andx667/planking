/* ──────────────────────────────────────────────────────
   Plank Tracker – app.js
   Pure vanilla JS  •  No frameworks  •  PWA-ready
   ────────────────────────────────────────────────────── */

// ── DOM refs ──────────────────────────────────────────
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const millisecondsEl = document.getElementById('milliseconds');
const toggleBtn = document.getElementById('toggleBtn');
const btnIcon = document.getElementById('btnIcon');
const btnLabel = document.getElementById('btnLabel');
const progressCircle = document.querySelector('.timer-progress');
const todayCountEl = document.getElementById('todayCount');
const bestTimeEl = document.getElementById('bestTime');
const totalSessionsEl = document.getElementById('totalSessions');
const historyList = document.getElementById('historyList');
const targetMarker = document.getElementById('targetMarker');
const targetLabel = document.getElementById('targetLabel');

// ── Constants ─────────────────────────────────────────
const STORAGE_KEY = 'plank_history';
const CIRCLE_LENGTH = 2 * Math.PI * 90; // ≈ 565.48
const TARGET_SECONDS = 20;

// ── State ─────────────────────────────────────────────
let running = false;
let startTime = 0;
let elapsed = 0;
let animFrameId = null;
let targetReached = false;

// ── Helpers ───────────────────────────────────────────
function pad(n, d = 2) {
  return String(n).padStart(d, '0');
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${pad(m)}:${pad(s)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function isFirstPlankToday() {
  const history = loadHistory();
  const today = todayKey();
  return !history.some((h) => h.date.startsWith(today));
}

function showTarget(visible) {
  targetMarker.classList.toggle('visible', visible);
  targetLabel.classList.toggle('visible', visible);
  if (!visible) {
    targetLabel.classList.remove('reached');
    targetLabel.textContent = 'Target: 0:20';
  }
}

// ── Timer ─────────────────────────────────────────────
function updateDisplay() {
  const total = elapsed;
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);

  minutesEl.textContent = pad(m);
  secondsEl.textContent = pad(s);
  millisecondsEl.textContent = `.${pad(cs)}`;

  // Progress ring: full revolution every 60 s
  const frac = (total % 60000) / 60000;
  progressCircle.style.strokeDashoffset = CIRCLE_LENGTH * (1 - frac);

  // Check target
  if (running && !targetReached && targetMarker.classList.contains('visible')) {
    if (total >= TARGET_SECONDS * 1000) {
      targetReached = true;
      targetLabel.textContent = '✓ Target reached!';
      targetLabel.classList.add('reached');
    }
  }
}

function tick() {
  elapsed = Date.now() - startTime;
  updateDisplay();
  animFrameId = requestAnimationFrame(tick);
}

function startTimer() {
  running = true;
  startTime = Date.now();
  elapsed = 0;
  targetReached = false;
  toggleBtn.classList.add('running');
  btnIcon.textContent = '⏹';
  btnLabel.textContent = 'STOP';

  // Show target indicator for the first plank of the day
  showTarget(isFirstPlankToday());

  tick();
}

function stopTimer() {
  running = false;
  cancelAnimationFrame(animFrameId);
  toggleBtn.classList.remove('running');
  btnIcon.textContent = '▶';
  btnLabel.textContent = 'START';

  if (elapsed >= 1000) {
    saveSession(elapsed);
  }

  // Reset display after a brief pause so user sees final time
  setTimeout(() => {
    elapsed = 0;
    updateDisplay();
    progressCircle.style.strokeDashoffset = CIRCLE_LENGTH;
    showTarget(false);
  }, 1500);
}

toggleBtn.addEventListener('click', () => {
  running ? stopTimer() : startTimer();
});

// ── Persistence ───────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function saveSession(duration) {
  const history = loadHistory();
  history.unshift({
    date: new Date().toISOString(),
    duration, // ms
  });
  // Keep last 200 entries
  if (history.length > 200) history.length = 200;
  saveHistory(history);
  renderStats();
  renderChart();
  renderHistory();
}

// ── Stats ─────────────────────────────────────────────
function renderStats() {
  const history = loadHistory();
  const today = todayKey();
  const todaySessions = history.filter((h) => h.date.startsWith(today));

  todayCountEl.textContent = todaySessions.length;
  totalSessionsEl.textContent = history.length;

  if (history.length > 0) {
    const best = Math.max(...history.map((h) => h.duration));
    bestTimeEl.textContent = formatDuration(best);
  } else {
    bestTimeEl.textContent = '00:00';
  }
}

// ── History List ──────────────────────────────────────
function renderHistory() {
  const history = loadHistory();

  if (history.length === 0) {
    historyList.innerHTML =
      '<p class="empty-state">No exercises recorded yet. Start planking!</p>';
    return;
  }

  let html = '';
  let lastDay = '';

  history.forEach((entry) => {
    const d = new Date(entry.date);
    const dayStr = d.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    if (dayStr !== lastDay) {
      html += `<div class="history-day-header">${dayStr}</div>`;
      lastDay = dayStr;
    }
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    html += `
      <div class="history-item">
        <span class="history-date">${timeStr}</span>
        <span class="history-duration">${formatDuration(entry.duration)}</span>
      </div>`;
  });

  historyList.innerHTML = html;
}

// ── Chart ─────────────────────────────────────────────
const chartBars = document.getElementById('chartBars');
const chartYAxis = document.getElementById('chartYAxis');

function aggregateByDay(history) {
  const map = {};
  history.forEach((h) => {
    const day = h.date.slice(0, 10);
    if (!map[day]) map[day] = { best: 0, total: 0 };
    map[day].total += h.duration;
    if (h.duration > map[day].best) map[day].best = h.duration;
  });
  // Return sorted ascending by date, last 14 days max
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([day, v]) => ({ day, ...v }));
}

function renderChart() {
  const history = loadHistory();
  const days = aggregateByDay(history);

  if (days.length === 0) {
    chartBars.innerHTML = '<p class="empty-state">No data to chart yet.</p>';
    chartYAxis.innerHTML = '';
    return;
  }

  // Find max value for scaling (use total since it's always >= best)
  const maxVal = Math.max(...days.map((d) => d.total));
  const chartHeight = 150; // px available for bars

  // Y-axis labels (0, 25%, 50%, 75%, 100% of max)
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  chartYAxis.innerHTML = ticks
    .map((t) => {
      const val = Math.round((maxVal * t) / 1000);
      const m = Math.floor(val / 60);
      const s = val % 60;
      const label = m > 0 ? `${m}m${s ? pad(s) + 's' : ''}` : `${s}s`;
      return `<span class="chart-y-label">${t === 0 ? '0' : label}</span>`;
    })
    .join('');

  // Bars
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let barsHtml = '';

  days.forEach((d) => {
    const bestH = maxVal > 0 ? (d.best / maxVal) * chartHeight : 0;
    const totalH = maxVal > 0 ? (d.total / maxVal) * chartHeight : 0;
    const dt = new Date(d.day + 'T00:00:00');
    const dayLabel = `${weekdays[dt.getDay()]} ${dt.getDate()}`;

    barsHtml += `
      <div class="chart-col"
           title="Best: ${formatDuration(d.best)}  Total: ${formatDuration(d.total)}">
        <div class="chart-bar-group">
          <div class="chart-bar best" style="height:${Math.max(2, bestH)}px"></div>
          <div class="chart-bar total" style="height:${Math.max(2, totalH)}px"></div>
        </div>
        <span class="chart-day-label">${dayLabel}</span>
      </div>`;
  });

  chartBars.innerHTML = barsHtml;
}

// ── Service Worker Registration ───────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .then((reg) => {
        console.log('Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });
  });
}

// ── PWA Install Prompt ────────────────────────────────
let deferredPrompt = null;
const installBanner = document.getElementById('installBanner');
const installAccept = document.getElementById('installAccept');
const installDismiss = document.getElementById('installDismiss');
const INSTALL_DISMISSED_KEY = 'plank_install_dismissed';

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Don't show if user dismissed recently (within 7 days)
  const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
  if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) {
    return;
  }

  installBanner.hidden = false;
});

installAccept.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('Install outcome:', outcome);
  deferredPrompt = null;
  installBanner.hidden = true;
});

installDismiss.addEventListener('click', () => {
  installBanner.hidden = true;
  localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  deferredPrompt = null;
});

// Hide banner if app gets installed
window.addEventListener('appinstalled', () => {
  installBanner.hidden = true;
  deferredPrompt = null;
});

// ── Init ──────────────────────────────────────────────
updateDisplay();
renderStats();
renderChart();
renderHistory();
