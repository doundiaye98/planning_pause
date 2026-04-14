import { getApiBase, pausePage } from "./api-base.js";

const API = getApiBase();

function fullUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API ? `${API}${p}` : p;
}

async function fetchJson(url, opts = {}) {
  const r = await fetch(fullUrl(url), {
    credentials: "include",
    headers: { Accept: "application/json", ...opts.headers },
    ...opts,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function setGuestCopy() {
  const label = document.getElementById("home-header-label");
  const name = document.getElementById("home-header-name");
  const title = document.getElementById("home-title");
  const lead = document.getElementById("home-lead");
  const badge = document.getElementById("home-env-badge");
  if (label) label.textContent = "Univers Diaspora";
  if (name) name.textContent = "Pauses & plages horaires";
  if (title) title.textContent = "Bienvenue";
  if (lead) {
    lead.innerHTML =
      "Connectez-vous pour accéder à la <strong>planification des pauses</strong> (vue équipe ou espace personnel). Les indicateurs ci-dessous s’affichent selon votre profil.";
  }
  if (badge) {
    badge.textContent = "Portail";
    badge.title = "Connectez-vous pour accéder aux espaces dédiés";
  }
  document.title = "Univers Diaspora — Accueil";

  const qt = document.getElementById("home-quick-title");
  if (qt) qt.textContent = "Accès au service";
  setGuestCards();
  setGuestFooter();
}

function setGuestCards() {
  const setTxt = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setTxt("home-card-a-k", "Organisation");
  setTxt("home-card-a-t", "Planification pour les équipes");
  setTxt(
    "home-card-a-d",
    "Réservé aux comptes habilités. La page vous demandera de vous connecter si besoin.",
  );
  setTxt("home-card-b-k", "Personnel");
  setTxt("home-card-b-t", "Mon planning de pauses");
  setTxt(
    "home-card-b-d",
    "Consultez et saisissez vos créneaux. Connexion avec l’identifiant fourni par votre organisation.",
  );
  setTxt("home-card-i-k", "Information");
  setTxt("home-card-i-t", "Usage professionnel");
  const infoD = document.getElementById("home-card-i-d");
  if (infoD) {
    infoD.textContent =
      "Les données sont traitées dans le cadre de votre environnement de travail. Respectez les règles de votre entité (accès, conservation, confidentialité).";
  }
  const ctaA = document.getElementById("home-card-a-cta");
  const ctaB = document.getElementById("home-card-b-cta");
  if (ctaA) ctaA.textContent = "Continuer →";
  if (ctaB) ctaB.textContent = "Continuer →";
}

function setAdminCopy() {
  const label = document.getElementById("home-header-label");
  const name = document.getElementById("home-header-name");
  const title = document.getElementById("home-title");
  const lead = document.getElementById("home-lead");
  const badge = document.getElementById("home-env-badge");
  if (label) label.textContent = "Module interne";
  if (name) name.textContent = "Espace RH — Pauses";
  if (title) title.textContent = "Bienvenue dans votre espace RH";
  if (lead) {
    lead.innerHTML =
      "Tableau de bord du module <strong>Pauses &amp; plages horaires</strong>. Consultez les indicateurs clés et accédez à l’outil de planification pour vos équipes.";
  }
  if (badge) {
    badge.textContent = "Espace RH";
    badge.title = "Application de gestion interne";
  }
  document.title = "Univers Diaspora — Accueil · Espace RH";

  const qt = document.getElementById("home-quick-title");
  if (qt) qt.textContent = "Accès rapides";

  const setTxt = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setTxt("home-card-a-k", "Administrateurs");
  setTxt("home-card-a-t", "Planification (toute l’équipe)");
  setTxt(
    "home-card-a-d",
    "Annuaire, créneaux de tous les collaborateurs, création de comptes. Connexion requise (rôle admin).",
  );
  setTxt("home-card-b-k", "Collaborateurs");
  setTxt("home-card-b-t", "Mon planning personnel");
  setTxt(
    "home-card-b-d",
    "Consultez et planifiez uniquement vos pauses. Connexion avec votre compte collaborateur.",
  );
  setTxt("home-card-i-k", "À savoir");
  setTxt("home-card-i-t", "Données internes");
  const infoD = document.getElementById("home-card-i-d");
  if (infoD) {
    infoD.textContent =
      "Les informations sont stockées localement sur le serveur de l’application. Adaptez les règles de conservation selon votre politique RH.";
  }
  const ctaA = document.getElementById("home-card-a-cta");
  const ctaB = document.getElementById("home-card-b-cta");
  if (ctaA) ctaA.textContent = "Ouvrir →";
  if (ctaB) ctaB.textContent = "Ouvrir →";

  const fc = document.getElementById("home-footer-copy");
  if (fc) {
    fc.innerHTML =
      "<strong>Univers Diaspora</strong> — Espace RH · Module pauses. Données à usage professionnel.";
  }
  const fh = document.getElementById("home-footer-hint");
  if (fh) fh.textContent = "Conformité : politique RH de votre entité.";
  const fm = document.getElementById("home-footer-meta");
  if (fm) {
    const team = fm.querySelector('a[data-pause="planification"]');
    if (team) team.textContent = "Planification admin";
  }
}

function setEmployeeCopy(displayName) {
  const label = document.getElementById("home-header-label");
  const name = document.getElementById("home-header-name");
  const title = document.getElementById("home-title");
  const lead = document.getElementById("home-lead");
  const badge = document.getElementById("home-env-badge");
  if (label) label.textContent = "Espace collaborateur";
  if (name) name.textContent = displayName || "Mon planning";
  if (title) title.textContent = displayName ? `Bonjour, ${displayName.split(/\s+/)[0]}` : "Bonjour";
  if (lead) {
    lead.innerHTML =
      "Retrouvez ci-dessous un aperçu de <strong>vos pauses</strong>. La vue complète de l’équipe est réservée aux administrateurs.";
  }
  if (badge) {
    badge.textContent = "Collaborateur";
    badge.title = "Espace personnel — planification de vos pauses";
  }
  document.title = "Univers Diaspora — Mon accueil";

  const qt = document.getElementById("home-quick-title");
  if (qt) qt.textContent = "Accès rapides";

  const setTxt = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setTxt("home-card-a-k", "Équipe");
  setTxt("home-card-a-t", "Planification (administrateurs)");
  setTxt("home-card-a-d", "Cet espace est réservé aux rôles administrateur. Vous serez redirigé vers votre planning personnel.");
  setTxt("home-card-b-k", "Collaborateurs");
  setTxt("home-card-b-t", "Mon planning personnel");
  setTxt(
    "home-card-b-d",
    "Consultez et planifiez uniquement vos pauses. Vous y êtes déjà avec votre compte.",
  );
  setTxt("home-card-i-k", "À savoir");
  setTxt("home-card-i-t", "Données internes");
  const infoD = document.getElementById("home-card-i-d");
  if (infoD) {
    infoD.textContent =
      "Les informations sont traitées selon les règles de votre organisation.";
  }
  const ctaA = document.getElementById("home-card-a-cta");
  const ctaB = document.getElementById("home-card-b-cta");
  if (ctaA) ctaA.textContent = "Ouvrir →";
  if (ctaB) ctaB.textContent = "Ouvrir →";

  const fc = document.getElementById("home-footer-copy");
  if (fc) {
    fc.innerHTML =
      "<strong>Univers Diaspora</strong> — Planification des pauses. Données à usage professionnel.";
  }
  const fh = document.getElementById("home-footer-hint");
  if (fh) fh.textContent = "Conformité : politique de votre entité.";
  const fm = document.getElementById("home-footer-meta");
  if (fm) {
    const team = fm.querySelector('a[data-pause="planification"]');
    if (team) team.textContent = "Planification (admin)";
  }
}

function setGuestStats() {
  document.getElementById("home-stat-employees").textContent = "—";
  document.getElementById("home-stat-today").textContent = "—";
  document.getElementById("home-stat-week").textContent = "—";
  const l1 = document.getElementById("home-stat-l1");
  const l2 = document.getElementById("home-stat-l2");
  const l3 = document.getElementById("home-stat-l3");
  if (l1) l1.textContent = "Vue équipe";
  if (l2) l2.textContent = "Aujourd’hui";
  if (l3) l3.textContent = "7 prochains jours";
  const h1 = document.getElementById("home-stat-h1");
  const h2 = document.getElementById("home-stat-h2");
  const h3 = document.getElementById("home-stat-h3");
  if (h1) h1.textContent = "Indicateur visible après connexion administrateur.";
  if (h2) h2.textContent = "Connectez-vous pour afficher vos créneaux.";
  if (h3) h3.textContent = "Indicateur sur la semaine après connexion.";
}

function setAdminStatsHints() {
  const l1 = document.getElementById("home-stat-l1");
  const l2 = document.getElementById("home-stat-l2");
  const l3 = document.getElementById("home-stat-l3");
  if (l1) l1.textContent = "Collaborateurs";
  if (l2) l2.textContent = "Pauses aujourd’hui";
  if (l3) l3.textContent = "7 prochains jours";
  const hints = [
    "Effectifs enregistrés dans l’outil.",
    "Créneaux planifiés pour la date du jour (tous services).",
    "Volume sur les 7 prochains jours (tous services).",
  ];
  ["home-stat-h1", "home-stat-h2", "home-stat-h3"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = hints[i];
  });
}

function setEmployeeStatsHints() {
  const l1 = document.getElementById("home-stat-l1");
  const l2 = document.getElementById("home-stat-l2");
  const l3 = document.getElementById("home-stat-l3");
  if (l1) l1.textContent = "Collaborateurs";
  if (l2) l2.textContent = "Pauses aujourd’hui";
  if (l3) l3.textContent = "7 prochains jours";
  const h1 = document.getElementById("home-stat-h1");
  const h2 = document.getElementById("home-stat-h2");
  const h3 = document.getElementById("home-stat-h3");
  if (h1) h1.textContent = "Vue globale réservée aux administrateurs.";
  if (h2) h2.textContent = "Vos pauses prévues aujourd’hui.";
  if (h3) h3.textContent = "Vos pauses sur les 7 prochains jours.";
}

function setGuestFooter() {
  const fc = document.getElementById("home-footer-copy");
  if (fc) {
    fc.innerHTML =
      "<strong>Univers Diaspora</strong> — Planification des pauses. Service à usage professionnel.";
  }
  const fh = document.getElementById("home-footer-hint");
  if (fh) fh.textContent = "Règles et conformité : selon votre organisation.";
  const team = document.querySelector('#home-footer-meta a[data-pause="planification"]');
  if (team) team.textContent = "Vue équipe";
}

async function init() {
  const authSlot = document.getElementById("auth-nav");
  const r = await fetch(fullUrl("/api/auth/me"), { credentials: "include" });

  if (!r.ok) {
    authSlot.innerHTML = `<a href="${pausePage("connexion")}" class="site-nav-link">Connexion</a>`;
    setGuestCopy();
    setGuestStats();
    return;
  }

  const me = await r.json();
  authSlot.innerHTML = `<span class="site-nav-user" title="${me.email}">${me.email}</span><a href="#" class="site-nav-link" id="home-logout">Déconnexion</a>`;
  document.getElementById("home-logout").addEventListener("click", async (e) => {
    e.preventDefault();
    await fetch(fullUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
    window.location.reload();
  });

  if (me.role === "admin") {
    setAdminCopy();
    const s = await fetchJson("/api/stats");
    document.getElementById("home-stat-employees").textContent = s.employee_count;
    document.getElementById("home-stat-today").textContent = s.assignment_count_today;
    document.getElementById("home-stat-week").textContent = s.assignment_count_week;
    setAdminStatsHints();
  } else if (me.role === "employee") {
    setEmployeeCopy(me.employee?.full_name);
    const s = await fetchJson("/api/me/summary");
    document.getElementById("home-stat-employees").textContent = "—";
    document.getElementById("home-stat-today").textContent = s.assignment_count_today;
    document.getElementById("home-stat-week").textContent = s.assignment_count_week;
    setEmployeeStatsHints();
  } else {
    setGuestCopy();
    setGuestStats();
  }
}

init().catch(() => {
  setGuestCopy();
  setGuestStats();
  const authSlot = document.getElementById("auth-nav");
  if (authSlot) {
    authSlot.innerHTML = `<a href="${pausePage("connexion")}" class="site-nav-link">Connexion</a>`;
  }
});
