import { getApiBase, pausePage } from "./api-base.js";

const API = getApiBase();

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function fmtLongDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DEFAULT_COLOR = "#142843";

let weekStart = startOfWeek(new Date());
let assignments = [];
let myColor = DEFAULT_COLOR;

async function fetchJson(url, opts = {}) {
  const path = url.startsWith("/") ? url : `/${url}`;
  const base = API || "";
  const fullUrl = base ? `${base}${path}` : path;
  const r = await fetch(fullUrl, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  if (r.status === 204) return null;
  const ct = r.headers.get("content-type");
  if (ct && ct.includes("application/json")) return r.json();
  return null;
}

async function loadSummary() {
  const s = await fetchJson("/api/me/summary");
  myColor = s.employee?.color || DEFAULT_COLOR;
  document.getElementById("emp-welcome-name").textContent = s.employee.full_name;
  document.getElementById("emp-stat-today").textContent = s.assignment_count_today;
  document.getElementById("emp-stat-week").textContent = s.assignment_count_week;
  const dept = [s.employee.department, s.employee.role].filter(Boolean).join(" · ");
  document.getElementById("emp-meta").textContent = dept || "—";
}

async function loadAssignments() {
  const from = fmtDate(weekStart);
  const to = fmtDate(addDays(weekStart, 6));
  assignments = await fetchJson(`/api/me/assignments?date_from=${from}&date_to=${to}`);
  renderCalendar();
  await loadSummary();
}

function renderCalendar() {
  const cal = document.getElementById("emp-calendar");
  cal.replaceChildren();
  const label = document.getElementById("emp-week-label");
  const end = addDays(weekStart, 6);
  const df = { day: "numeric", month: "short" };
  const y = weekStart.getFullYear();
  label.textContent = `Semaine du ${weekStart.toLocaleDateString("fr-FR", df)} au ${end.toLocaleDateString("fr-FR", df)} ${y}`;

  const todayStr = fmtDate(new Date());
  const byDay = new Map();
  for (let i = 0; i < 7; i++) {
    byDay.set(fmtDate(addDays(weekStart, i)), []);
  }
  for (const a of assignments) {
    const arr = byDay.get(a.day_date);
    if (arr) arr.push(a);
  }

  let di = 0;
  for (const [dayStr, slots] of byDay) {
    const dayDate = new Date(dayStr + "T12:00:00");
    const wrap = document.createElement("div");
    wrap.className = "cal-day";
    if (dayStr === todayStr) wrap.classList.add("is-today");
    wrap.style.animationDelay = `${di * 50}ms`;

    const head = document.createElement("div");
    head.className = "cal-day-head";
    const left = document.createElement("div");
    left.style.cssText = "display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;min-width:0;";
    const nm = document.createElement("span");
    nm.className = "cal-day-name";
    nm.textContent = dayNames[(dayDate.getDay() + 6) % 7];
    left.appendChild(nm);
    if (dayStr === todayStr) {
      const badge = document.createElement("span");
      badge.className = "badge-today";
      badge.textContent = "Aujourd’hui";
      left.appendChild(badge);
    }
    const dt = document.createElement("span");
    dt.className = "cal-day-date";
    dt.textContent = fmtLongDate(dayStr);
    head.append(left, dt);
    wrap.appendChild(head);

    const body = document.createElement("div");
    body.className = "cal-slots";
    slots.sort((a, b) => a.start_time.localeCompare(b.start_time));

    if (slots.length === 0) {
      const empty = document.createElement("p");
      empty.className = "cal-empty";
      empty.textContent = "Aucune pause à cette date. Utilisez « Planifier ma pause ».";
      body.appendChild(empty);
    } else {
      for (const s of slots) {
        const slot = document.createElement("div");
        slot.className = "slot";
        slot.style.setProperty("--slot-color", myColor);
        const time = document.createElement("div");
        time.className = "slot-time";
        time.textContent = `${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}`;
        const mid = document.createElement("div");
        mid.className = "slot-body";
        const title = document.createElement("div");
        title.className = "slot-title";
        title.textContent = s.label;
        const person = document.createElement("div");
        person.className = "slot-person";
        person.textContent = "Votre créneau";
        mid.append(title, person);
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "slot-remove";
        rm.setAttribute("aria-label", "Supprimer ce créneau");
        rm.textContent = "×";
        rm.addEventListener("click", async () => {
          await fetchJson(`/api/me/assignments/${s.id}`, { method: "DELETE" });
          await loadAssignments();
        });
        slot.append(time, mid, rm);
        body.appendChild(slot);
      }
    }
    wrap.appendChild(body);
    cal.appendChild(wrap);
    di++;
  }
}

function displayedWeekRange() {
  const from = fmtDate(weekStart);
  const to = fmtDate(addDays(weekStart, 6));
  return { from, to };
}

/** Ouvre le modal : date par défaut = aujourd’hui si dans la semaine affichée, sinon 1er jour de cette semaine. */
function openSelfModal(dayStr) {
  const f = document.getElementById("form-self-break");
  const { from, to } = displayedWeekRange();
  const dateInput = f.day_date;
  dateInput.min = from;
  dateInput.max = to;
  if (dayStr && dayStr >= from && dayStr <= to) {
    dateInput.value = dayStr;
  } else {
    const today = fmtDate(new Date());
    dateInput.value = today >= from && today <= to ? today : from;
  }
  document.getElementById("modal-self-break").showModal();
}

document.getElementById("btn-self-break")?.addEventListener("click", () => openSelfModal());
document.getElementById("btn-cancel-self")?.addEventListener("click", () => {
  document.getElementById("modal-self-break").close();
});
document.getElementById("btn-close-self")?.addEventListener("click", () => {
  document.getElementById("modal-self-break").close();
});

document.getElementById("week-prev-emp").addEventListener("click", async () => {
  weekStart = addDays(weekStart, -7);
  await loadAssignments();
});
document.getElementById("week-next-emp").addEventListener("click", async () => {
  weekStart = addDays(weekStart, 7);
  await loadAssignments();
});

document.getElementById("form-self-break").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const { from, to } = displayedWeekRange();
  const d = f.day_date.value;
  if (d < from || d > to) {
    alert(
      `Choisissez une date entre le ${from} et le ${to} (semaine affichée), ou changez de semaine avec les flèches.`,
    );
    return;
  }
  const body = {
    day_date: d,
    start_time: f.start_time.value.length === 5 ? f.start_time.value + ":00" : f.start_time.value,
    end_time: f.end_time.value.length === 5 ? f.end_time.value + ":00" : f.end_time.value,
    label: f.label.value.trim() || "Pause",
  };
  try {
    await fetchJson("/api/me/assignments", { method: "POST", body: JSON.stringify(body) });
    document.getElementById("modal-self-break").close();
    await loadAssignments();
  } catch (e) {
    let msg = e.message || String(e);
    try {
      const j = JSON.parse(msg);
      if (j.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      /* texte brut */
    }
    alert(msg);
  }
});

document.getElementById("btn-logout-emp")?.addEventListener("click", async () => {
  await fetchJson("/api/auth/logout", { method: "POST" });
  window.location.href = pausePage("connexion");
});

async function init() {
  await loadAssignments();
}

init().catch((e) => {
  console.error(e);
  const cal = document.getElementById("emp-calendar");
  if (cal) {
    cal.innerHTML =
      '<p class="cal-empty">Impossible de charger vos données. Vérifiez la connexion et que l’API est démarrée.</p>';
  }
});
