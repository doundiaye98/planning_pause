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

function initialsFromName(name) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
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
let employees = [];
let assignments = [];
let accountsList = [];
let currentAccountId = null;

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

async function loadStats() {
  const s = await fetchJson("/api/stats");
  document.getElementById("stat-employees").textContent = s.employee_count;
  document.getElementById("stat-today").textContent = s.assignment_count_today;
  document.getElementById("stat-week").textContent = s.assignment_count_week;
}

async function loadEmployees() {
  employees = await fetchJson("/api/employees");
  renderEmployees();
}

async function loadAssignments() {
  const from = fmtDate(weekStart);
  const to = fmtDate(addDays(weekStart, 6));
  assignments = await fetchJson(`/api/assignments?date_from=${from}&date_to=${to}`);
  renderCalendar();
  await loadStats();
}

async function loadAccounts() {
  const rows = await fetchJson("/api/admin/accounts");
  accountsList = rows;
  renderAccounts(rows);
  if (employees.length) renderEmployees();
}

function employeeIdsWithLogin() {
  const ids = new Set();
  for (const a of accountsList) {
    if (a.role === "employee" && a.employee_id != null) ids.add(a.employee_id);
  }
  return ids;
}

function fillAccountEmployeeOptions(preselectId = null) {
  const sel = document.getElementById("account-employee_id");
  if (!sel) return;
  sel.replaceChildren();
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "— Choisir un collaborateur —";
  sel.appendChild(opt0);
  employees.forEach((emp) => {
    const o = document.createElement("option");
    o.value = String(emp.id);
    o.textContent = `${emp.full_name}${emp.email ? ` (${emp.email})` : ""}`;
    sel.appendChild(o);
  });
  if (preselectId != null) sel.value = String(preselectId);
}

/** @param {{ employeeId?: number | null, prefillEmail?: string | null }} [opts] */
function openAccountModal(opts = {}) {
  const { employeeId = null, prefillEmail = null } = opts;
  const modal = document.getElementById("modal-account");
  const form = document.getElementById("form-account");
  if (!modal || !form) return;
  form.reset();
  const roleEl = document.getElementById("account-role");
  if (employeeId != null) {
    if (roleEl) roleEl.value = "employee";
    fillAccountEmployeeOptions(employeeId);
    const emailInput = form.querySelector('[name="email"]');
    if (emailInput && prefillEmail) emailInput.value = prefillEmail;
  } else {
    fillAccountEmployeeOptions(null);
  }
  syncAccountRole();
  modal.showModal();
}

function openAccountModalForEmployee(emp) {
  openAccountModal({ employeeId: emp.id, prefillEmail: emp.email || "" });
}

function renderAccounts(accounts) {
  const ul = document.getElementById("accounts-list");
  const empty = document.getElementById("accounts-empty");
  if (!ul) return;
  ul.replaceChildren();
  if (!accounts.length) {
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  accounts.forEach((a, i) => {
    const li = document.createElement("li");
    li.className = "account-item";
    li.style.animationDelay = `${i * 40}ms`;

    const main = document.createElement("div");
    main.className = "account-main";

    const badge = document.createElement("span");
    badge.className = `account-role-badge account-role-badge--${a.role}`;
    badge.textContent = a.role === "admin" ? "Administrateur" : "Collaborateur";

    const meta = document.createElement("div");
    meta.className = "account-meta";
    const email = document.createElement("span");
    email.className = "account-email";
    email.textContent = a.email;
    const sub = document.createElement("span");
    sub.className = "account-sub";
    if (a.employee) {
      sub.textContent = `${a.employee.full_name}${a.employee.department ? ` · ${a.employee.department}` : ""}`;
    } else {
      sub.textContent = "Sans fiche collaborateur";
    }
    meta.append(email, sub);
    main.append(badge, meta);

    const actions = document.createElement("div");
    actions.className = "account-actions";

    if (a.id === currentAccountId) {
      const selfLabel = document.createElement("span");
      selfLabel.className = "account-self";
      selfLabel.textContent = "Votre session";
      actions.appendChild(selfLabel);
    } else {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-small btn-outline account-delete";
      del.textContent = "Désactiver";
      del.setAttribute("aria-label", `Désactiver le compte ${a.email}`);
      del.addEventListener("click", async () => {
        if (
          !confirm(
            `Désactiver le compte « ${a.email} » ?\nLa personne ne pourra plus se connecter (le compte reste en base, sans suppression de l’historique).`,
          )
        ) {
          return;
        }
        try {
          await fetchJson(`/api/admin/accounts/${a.id}`, { method: "DELETE" });
          await loadAccounts();
        } catch (e) {
          let msg = e.message || String(e);
          try {
            const j = JSON.parse(msg);
            if (j.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
          } catch {
            /* ignore */
          }
          alert(msg);
        }
      });
      actions.appendChild(del);
    }

    li.append(main, actions);
    ul.appendChild(li);
  });
}

function renderEmployees() {
  const list = document.getElementById("employee-list");
  const empty = document.getElementById("employee-empty");
  const lead = document.getElementById("employee-panel-lead");
  const toolbar = document.getElementById("employee-list-toolbar");
  list.replaceChildren();

  const n = employees.length;
  if (n === 0) {
    lead.textContent = "Aucun collaborateur — commencez par créer une fiche.";
    empty.hidden = false;
    if (toolbar) toolbar.hidden = true;
    return;
  }

  empty.hidden = true;
  if (toolbar) toolbar.hidden = false;
  lead.textContent =
    n === 1 ? "1 collaborateur enregistré." : `${n} collaborateurs enregistrés.`;

  const tpl = document.getElementById("tpl-employee");
  const withLogin = employeeIdsWithLogin();
  employees.forEach((e, i) => {
    const node = tpl.content.cloneNode(true);
    const li = node.querySelector(".employee-item");
    li.style.animationDelay = `${i * 35}ms`;
    const av = node.querySelector(".employee-avatar");
    av.textContent = initialsFromName(e.full_name);
    av.style.background = e.color || DEFAULT_COLOR;
    node.querySelector(".employee-name").textContent = e.full_name;
    const dept = [e.department, e.role].filter(Boolean).join(" · ");
    node.querySelector(".employee-dept").textContent = dept || "Service non renseigné";
    const pill = node.querySelector(".employee-account-pill");
    const accessBtn = node.querySelector(".employee-access-btn");
    const hasLogin = withLogin.has(e.id);
    if (hasLogin) {
      pill.hidden = false;
      accessBtn.hidden = true;
    } else {
      pill.hidden = true;
      accessBtn.hidden = false;
      accessBtn.setAttribute("aria-label", `Créer un accès pour ${e.full_name}`);
      accessBtn.addEventListener("click", () => openAccountModalForEmployee(e));
    }
    node.querySelector(".plan-btn").addEventListener("click", () => openBreakModal(e));
    list.appendChild(node);
  });
}

function renderCalendar() {
  const cal = document.getElementById("calendar");
  cal.replaceChildren();
  const label = document.getElementById("week-label");
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
      empty.textContent =
        "Aucune pause planifiée pour cette journée. Utilisez « Planifier » depuis l’annuaire.";
      body.appendChild(empty);
    } else {
      for (const s of slots) {
        const slot = document.createElement("div");
        slot.className = "slot";
        slot.style.setProperty("--slot-color", s.employee?.color || DEFAULT_COLOR);
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
        person.textContent = s.employee?.full_name || "—";
        mid.append(title, person);
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "slot-remove";
        rm.setAttribute("aria-label", "Supprimer ce créneau");
        rm.textContent = "×";
        rm.addEventListener("click", async () => {
          await fetchJson(`/api/assignments/${s.id}`, { method: "DELETE" });
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

function openEmployeeModal() {
  document.getElementById("modal-employee").showModal();
}

function openBreakModal(emp) {
  document.getElementById("break-employee-id").value = String(emp.id);
  document.getElementById("break-employee-name").textContent = emp.full_name;
  const today = fmtDate(new Date());
  document.getElementById("break-day-date").value = today;
  document.getElementById("modal-break").showModal();
}

function syncAccountRole() {
  const roleEl = document.getElementById("account-role");
  if (!roleEl) return;
  const role = roleEl.value;
  const wrap = document.getElementById("account-employee-wrap");
  const sel = document.getElementById("account-employee_id");
  if (!wrap || !sel) return;
  const isEmp = role === "employee";
  wrap.hidden = !isEmp;
  sel.required = isEmp;
  if (!isEmp) sel.value = "";
}

document.getElementById("account-role")?.addEventListener("change", syncAccountRole);

document.getElementById("btn-open-account")?.addEventListener("click", () => {
  openAccountModal();
});

document.getElementById("btn-cancel-account")?.addEventListener("click", () => {
  document.getElementById("modal-account")?.close();
});
document.getElementById("btn-close-account")?.addEventListener("click", () => {
  document.getElementById("modal-account")?.close();
});

document.getElementById("form-account")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const role = f.role.value;
  let employee_id = null;
  if (role === "employee") {
    employee_id = Number(f.employee_id.value);
    if (!employee_id) {
      alert("Sélectionnez le collaborateur à rattacher.");
      return;
    }
  }
  const body = {
    email: f.email.value.trim(),
    password: f.password.value,
    role,
    employee_id,
  };
  try {
    await fetchJson("/api/admin/accounts", { method: "POST", body: JSON.stringify(body) });
    document.getElementById("modal-account").close();
    f.reset();
    syncAccountRole();
    await loadAccounts();
    alert("Compte créé avec succès.");
  } catch (e) {
    let msg = e.message || String(e);
    try {
      const j = JSON.parse(msg);
      if (j.detail) {
        msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
      }
    } catch {
      /* texte brut */
    }
    alert(msg);
  }
});

document.getElementById("btn-refresh-accounts")?.addEventListener("click", () => {
  loadAccounts().catch(console.error);
});

document.getElementById("btn-logout-admin")?.addEventListener("click", async () => {
  await fetchJson("/api/auth/logout", { method: "POST" });
  window.location.href = pausePage("connexion");
});

document.getElementById("btn-open-employee").addEventListener("click", openEmployeeModal);
document.getElementById("btn-cancel-employee").addEventListener("click", () => {
  document.getElementById("modal-employee").close();
});
document.getElementById("btn-close-employee").addEventListener("click", () => {
  document.getElementById("modal-employee").close();
});
document.getElementById("btn-cancel-break").addEventListener("click", () => {
  document.getElementById("modal-break").close();
});
document.getElementById("btn-close-break").addEventListener("click", () => {
  document.getElementById("modal-break").close();
});

document.getElementById("week-prev").addEventListener("click", async () => {
  weekStart = addDays(weekStart, -7);
  await loadAssignments();
});
document.getElementById("week-next").addEventListener("click", async () => {
  weekStart = addDays(weekStart, 7);
  await loadAssignments();
});

document.getElementById("form-employee").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const color = f.color.value;
  const body = {
    full_name: f.full_name.value.trim(),
    email: f.email.value.trim() || null,
    department: f.department.value.trim() || null,
    role: f.role.value.trim() || null,
    color,
  };
  await fetchJson("/api/employees", { method: "POST", body: JSON.stringify(body) });
  f.reset();
  f.color.value = DEFAULT_COLOR;
  document.getElementById("modal-employee").close();
  await loadEmployees();
  await loadStats();
});

document.getElementById("form-break").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const body = {
    employee_id: Number(document.getElementById("break-employee-id").value),
    day_date: f.day_date.value,
    start_time: f.start_time.value.length === 5 ? f.start_time.value + ":00" : f.start_time.value,
    end_time: f.end_time.value.length === 5 ? f.end_time.value + ":00" : f.end_time.value,
    label: f.label.value.trim() || "Pause",
  };
  await fetchJson("/api/assignments", { method: "POST", body: JSON.stringify(body) });
  document.getElementById("modal-break").close();
  await loadAssignments();
});

document.querySelectorAll("[data-reveal]").forEach((el) => {
  el.style.setProperty("--d", el.style.getPropertyValue("--d") || "0ms");
});

async function init() {
  const me = await fetchJson("/api/auth/me");
  currentAccountId = me.id;
  await loadEmployees();
  await loadAssignments();
  await loadAccounts();
}

function showApiError() {
  const cal = document.getElementById("calendar");
  if (!cal) return;
  const apiHint = API ? `Base API utilisée : ${API}` : "Requêtes sur la même origine que cette page.";
  cal.innerHTML = `<div class="api-error" role="alert">
    <p class="api-error-title">Impossible de joindre l’API</p>
    <p class="api-error-text">Lancez le serveur FastAPI depuis le dossier du projet <code>Pause</code> :</p>
    <pre class="api-error-cmd">python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000</pre>
    <p class="api-error-text">Puis ouvrez l’application via <strong>http://127.0.0.1:8000/planification</strong> ou laissez WAMP servir les fichiers en gardant l’API sur le port 8000 (configuration automatique).</p>
    <p class="api-error-meta">${apiHint}</p>
    <p class="api-error-text">Si l’API est sur un autre hôte ou port, définissez avant le script : <code>window.__API_BASE__ = 'http://127.0.0.1:VOTRE_PORT';</code></p>
  </div>`;
}

init().catch((e) => {
  console.error(e);
  showApiError();
});
