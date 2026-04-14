/**
 * Détection automatique : pages servies depuis .../static/ (ex. WAMP) vs Uvicorn (/assets/...).
 * window.__PAUSE_STATIC_BASE__ est défini par l’inline dans chaque HTML avant chargement de ce fichier.
 */
(function () {
  var staticBase = typeof window.__PAUSE_STATIC_BASE__ === "string" ? window.__PAUSE_STATIC_BASE__ : "";

  function asset(rel) {
    rel = String(rel).replace(/^\//, "");
    return staticBase ? staticBase + "/" + rel : "/assets/" + rel;
  }

  var FILES = {
    home: "index.html",
    planification: "planification.html",
    connexion: "connexion.html",
    collaborateur: "espace-collaborateur.html",
  };
  var ROUTES = {
    home: "/",
    planification: "/planification",
    connexion: "/connexion",
    collaborateur: "/espace-collaborateur",
  };

  function page(key) {
    return staticBase ? staticBase + "/" + FILES[key] : ROUTES[key];
  }

  window.__PAUSE_ASSET__ = asset;
  window.__PAUSE_PAGE__ = page;

  function applyNav() {
    document.querySelectorAll("[data-pause]").forEach(function (el) {
      var key = el.getAttribute("data-pause");
      if (key) el.setAttribute("href", page(key));
    });
    document.querySelectorAll("[data-pause-asset]").forEach(function (el) {
      var rel = el.getAttribute("data-pause-asset");
      if (!rel) return;
      var url = asset(rel);
      if (el.tagName === "IMG") el.src = url;
      else if (el.tagName === "LINK") el.href = url;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyNav);
  } else {
    applyNav();
  }

  var mod = document.documentElement.getAttribute("data-pause-module");
  if (mod) {
    var s = document.createElement("script");
    s.type = "module";
    s.src = asset(String(mod).replace(/^\//, ""));
    document.head.appendChild(s);
  }
})();
