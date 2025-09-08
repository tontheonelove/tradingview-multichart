const state = {
  charts: [],       // {id, symbol, interval}
  activeId: null,
  defaultInterval: "60",
  supportedIntervals: [],
  theme: "dark",
  layout: "2x2",
  tvInstances: new Map(), // id -> widget
};

async function loadConfig() {
  const res = await fetch("/config");
  const cfg = await res.json();
  state.charts = loadSaved("charts", cfg.charts);
  state.defaultInterval = loadSaved("defaultInterval", cfg.defaultInterval);
  state.supportedIntervals = cfg.supportedIntervals;
  state.layout = loadSaved("layout", "2x2");
  state.theme = loadSaved("theme", cfg.theme || "dark");
  document.body.className = "theme-" + state.theme;
  document.getElementById("activeLayout").textContent = state.layout;
}

function loadSaved(key, fallback) {
  try {
    const v = localStorage.getItem("mc_" + key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function save(key, val) {
  localStorage.setItem("mc_" + key, JSON.stringify(val));
}

function applyLayout() {
  const grid = document.getElementById("chartGrid");
  grid.className = "grid layout-" + state.layout;
  document.getElementById("activeLayout").textContent = state.layout;
  save("layout", state.layout);
}

function renderGrid() {
  const grid = document.getElementById("chartGrid");
  grid.innerHTML = "";
  state.tvInstances.forEach((w) => { try { w.remove(); } catch {} });
  state.tvInstances.clear();

  state.charts.forEach((c, idx) => {
    const card = document.createElement("section");
    card.className = "card";
    card.dataset.id = c.id;

    const header = document.createElement("div");
    header.className = "card-header";
    header.innerHTML = `
      <div class="meta">
        <span class="symbol">${c.symbol}</span>
        <span>•</span>
        <span>${intervalLabel(c.interval)}</span>
      </div>
      <div class="card-actions">
        <button class="chip" data-action="set" data-interval="1">1m</button>
        <button class="chip" data-action="set" data-interval="5">5m</button>
        <button class="chip" data-action="set" data-interval="15">15m</button>
        <button class="chip" data-action="set" data-interval="60">1h</button>
        <button class="chip" data-action="set" data-interval="240">4h</button>
        <button class="chip" data-action="set" data-interval="1D">1D</button>
      </div>
    `;
    const body = document.createElement("div");
    body.className = "card-body";
    body.id = "container_" + c.id;

    card.appendChild(header);
    card.appendChild(body);
    grid.appendChild(card);

    card.addEventListener("click", () => setActiveCard(c.id));
    header.addEventListener("click", (e) => {
      if (e.target.closest(".chip")) {
        const iv = e.target.getAttribute("data-interval");
        updateChartInterval(c.id, iv);
        e.stopPropagation();
      }
    });

    spawnTVWidget(c);
  });

  if (!state.activeId && state.charts[0]) setActiveCard(state.charts[0].id);
}

function spawnTVWidget(c) {
  const theme = (state.theme === "dark") ? "dark" : "light";
  const widget = new TradingView.widget({
    container_id: "container_" + c.id,
    autosize: true,
    symbol: c.symbol,
    interval: c.interval,
    timezone: "Etc/UTC",
    theme: theme,
    style: "1",
    locale: "en",
    toolbar_bg: "rgba(0,0,0,0)",
    hide_top_toolbar: false,
    hide_legend: false,
    allow_symbol_change: true,
    withdateranges: true,
    studies: [],
  });
  state.tvInstances.set(c.id, widget);
}

function updateCardHeader(id) {
  const card = document.querySelector(`.card[data-id="${id}"]`);
  const c = state.charts.find(x => x.id === id);
  if (!card || !c) return;
  const symbolEl = card.querySelector(".symbol");
  symbolEl.textContent = c.symbol;
  const meta = card.querySelector(".meta");
  meta.innerHTML = `<span class="symbol">${c.symbol}</span><span>•</span><span>${intervalLabel(c.interval)}</span>`;
}

function setActiveCard(id) {
  state.activeId = id;
  document.querySelectorAll(".card").forEach(el => el.classList.toggle("active", el.dataset.id === id));
  document.getElementById("activeCard").textContent = id;
}

function intervalLabel(iv) {
  if (iv === "1D") return "1D";
  const map = { "1":"1m","3":"3m","5":"5m","15":"15m","30":"30m","60":"1h","120":"2h","240":"4h" };
  return map[iv] || iv + "m";
}

function updateChartInterval(id, interval) {
  const c = state.charts.find(x => x.id === id);
  if (!c) return;
  c.interval = interval;
  save("charts", state.charts);
  updateCardHeader(id);
  // Rebuild this widget (embed API is limited)
  const old = state.tvInstances.get(id);
  try { old && old.remove && old.remove(); } catch {}
  spawnTVWidget(c);
}

function updateChartSymbol(id, symbol) {
  const c = state.charts.find(x => x.id === id);
  if (!c) return;
  c.symbol = symbol.toUpperCase();
  save("charts", state.charts);
  updateCardHeader(id);
  const old = state.tvInstances.get(id);
  try { old && old.remove && old.remove(); } catch {}
  spawnTVWidget(c);
}

function syncIntervalsToActive() {
  const active = state.charts.find(x => x.id === state.activeId);
  if (!active) return;
  state.charts.forEach(c => {
    if (c.interval !== active.interval) updateChartInterval(c.id, active.interval);
  });
}

function bindTopbar() {
  document.querySelectorAll(".interval").forEach(btn => {
    btn.addEventListener("click", () => {
      const iv = btn.getAttribute("data-interval");
      if (state.activeId) updateChartInterval(state.activeId, iv);
    });
  });

  document.getElementById("applySymbol").addEventListener("click", () => {
    const inp = document.getElementById("symbolInput");
    const sym = inp.value.trim();
    if (sym && state.activeId) updateChartSymbol(state.activeId, sym);
  });

  document.getElementById("layoutSelect").addEventListener("change", (e) => {
    state.layout = e.target.value;
    applyLayout();
  });

  document.getElementById("syncIntervals").addEventListener("click", () => {
    syncIntervalsToActive();
  });

  document.getElementById("themeToggle").addEventListener("click", () => {
    state.theme = (state.theme === "dark") ? "light" : "dark";
    document.body.className = "theme-" + state.theme;
    save("theme", state.theme);
    // Rebuild all for theme change
    renderGrid();
  });
}

async function main() {
  await loadConfig();
  applyLayout();
  bindTopbar();
  renderGrid();
}

document.addEventListener("DOMContentLoaded", main);
