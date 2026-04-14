import { getApiBase, pausePage } from "./api-base.js";

const API = getApiBase();

function fullUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API ? `${API}${p}` : p;
}

const form = document.getElementById("form-login");
const errBox = document.getElementById("login-error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errBox.hidden = true;
  const fd = new FormData(form);
  const body = {
    email: String(fd.get("email") || "").trim(),
    password: String(fd.get("password") || ""),
  };
  try {
    const r = await fetch(fullUrl("/api/auth/login"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await r.text();
    if (!r.ok) {
      let msg = "Connexion impossible.";
      try {
        const j = JSON.parse(raw);
        if (j.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
      } catch {
        /* ignore */
      }
      errBox.textContent = msg;
      errBox.hidden = false;
      return;
    }
    const me = JSON.parse(raw);
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && (next.startsWith("/") || next.includes(".html"))) {
      window.location.href = next;
    } else if (me.role === "admin") {
      window.location.href = pausePage("planification");
    } else {
      window.location.href = pausePage("collaborateur");
    }
  } catch {
    errBox.textContent = "Erreur réseau. Vérifiez que l’API est démarrée.";
    errBox.hidden = false;
  }
});
