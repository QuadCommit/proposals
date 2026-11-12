/* ============================================================
   navigation.js — Sidebar nav, scrollspy, progress & mobile drawer
   Proposal Engine · QuadCommit
   ============================================================ */

(function (global) {
  "use strict";

  const state = {
    navLinks: [],
    sections: []
  };

  function renderNav(data) {
    const navEl = document.getElementById("sidebar-nav");
    if (!navEl) return;

    (data.nav || []).forEach(function (item) {
      const link = document.createElement("a");
      link.className = "nav-link";
      link.href = "#" + item.id;
      link.setAttribute("data-nav-link", "");
      link.setAttribute("aria-label", item.label);

      const icon = document.createElement("i");
      icon.className = "nav-link__icon";
      icon.setAttribute("data-lucide", item.icon || "circle");
      link.appendChild(icon);

      const text = document.createElement("span");
      text.textContent = item.label;
      link.appendChild(text);

      navEl.appendChild(link);
    });

    state.navLinks = Array.from(navEl.querySelectorAll(".nav-link"));
    // Icons are materialized once in app.js after all DOM is ready.
  }

  function collectSections() {
    state.sections = Array.from(document.querySelectorAll("[data-section]"));
  }

  /* ------------------------------------------------------------
     Scrollspy — highlights the section currently in view
     ------------------------------------------------------------ */
  function initScrollSpy() {
    if (!("IntersectionObserver" in window) || state.sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          setActive(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );

    state.sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function setActive(id) {
    state.navLinks.forEach(function (link) {
      const isActive = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  /* ------------------------------------------------------------
     Reading progress indicator (sidebar)
     ------------------------------------------------------------ */
  function updateProgress() {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    const percent = Math.round(ratio * 100);

    const bar = document.getElementById("progress-bar");
    const value = document.getElementById("progress-value");
    if (bar) bar.style.width = percent + "%";
    if (value) value.textContent = percent + "%";

    const progress = document.querySelector("[role='progressbar']");
    if (progress) progress.setAttribute("aria-valuenow", String(percent));
  }

  /* ------------------------------------------------------------
     Mobile drawer
     ------------------------------------------------------------ */
  function initDrawer() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    const toggle = document.getElementById("menu-toggle");
    if (!sidebar || !backdrop || !toggle) return;

    function open() {
      sidebar.classList.add("is-open");
      backdrop.hidden = false;
      backdrop.classList.add("is-visible");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Cerrar menú de navegación");
      document.body.style.overflow = "hidden";
    }

    function close() {
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-visible");
      backdrop.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menú de navegación");
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", function () {
      sidebar.classList.contains("is-open") ? close() : open();
    });
    backdrop.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebar.classList.contains("is-open")) {
        close();
        toggle.focus();
      }
    });

    // Close the drawer whenever a link inside is used
    sidebar.addEventListener("click", function (e) {
      const link = e.target.closest("a[href^='#']");
      if (link) close();
    });

    // Close when the viewport grows back to desktop
    const media = window.matchMedia("(min-width: 961px)");
    media.addEventListener("change", function () {
      if (media.matches) close();
    });
  }

  global.ProposalNavigation = {
    init: function (data) {
      renderNav(data);
      collectSections();
      initScrollSpy();
      initDrawer();
      updateProgress();
      window.addEventListener("scroll", updateProgress, { passive: true });
      window.addEventListener("resize", updateProgress, { passive: true });
    },
    setActive: setActive
  };
})(window);
