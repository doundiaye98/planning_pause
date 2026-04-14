/**
 * Base URL de l’API FastAPI.
 * - Définir window.__API_BASE__ (sans slash final) avant les scripts si besoin.
 * - Sinon : même origine si le site est servi par Uvicorn (port 8000).
 * - Sinon : http(s)://hôte:8000 (cas WAMP / page ouverte hors Uvicorn).
 * - Pages file:// → http://127.0.0.1:8000 par défaut.
 */
/** Liens vers les pages HTML (voir pause-bootstrap.js / data-pause). */
export function pausePage(key) {
  if (typeof window.__PAUSE_PAGE__ === "function") {
    return window.__PAUSE_PAGE__(key);
  }
  const fallback = {
    home: "/",
    planification: "/planification",
    connexion: "/connexion",
    collaborateur: "/espace-collaborateur",
  };
  return fallback[key] || "/";
}

export function getApiBase() {
  if (typeof window.__API_BASE__ === "string" && window.__API_BASE__.trim()) {
    return window.__API_BASE__.trim().replace(/\/$/, "");
  }

  const { protocol, hostname, port } = window.location;
  if (protocol === "file:") {
    return "http://127.0.0.1:8000";
  }

  const p = port || (protocol === "https:" ? "443" : "80");
  if (p === "8000" || p === "8001") {
    return "";
  }
  if (protocol === "http:" && (p === "80" || p === "8080")) {
    return `${protocol}//${hostname}:8000`;
  }
  if (protocol === "https:" && p === "443") {
    return "";
  }
  return "";
}
