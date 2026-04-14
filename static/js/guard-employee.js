import { getApiBase, pausePage } from "./api-base.js";

const API = getApiBase();

function fullUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API ? `${API}${p}` : p;
}

const r = await fetch(fullUrl("/api/auth/me"), { credentials: "include" });
if (!r.ok) {
  window.location.href =
    pausePage("connexion") + "?next=" + encodeURIComponent(window.location.pathname + window.location.search);
} else {
  const me = await r.json();
  if (me.role === "admin") {
    window.location.href = pausePage("planification");
  } else if (me.role !== "employee") {
    window.location.href = pausePage("connexion");
  } else {
    await import("./employee-app.js");
  }
}
