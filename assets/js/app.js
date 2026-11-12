/* ============================================================
   app.js — Application entry point
   Proposal Engine · QuadCommit

   Loads data + section partials, renders the proposal, then
   wires navigation and scroll animations. Loading order is
   independent of each other, so the failure overlay is shown
   only when data or sections cannot be fetched.
   ============================================================ */

(function () {
  "use strict";

  const loaderEl = document.getElementById("loader");
  const errorEl = document.getElementById("error-state");

  function hideLoader() {
    if (loaderEl) loaderEl.classList.add("is-hidden");
  }

  function showError(message) {
    if (loaderEl) loaderEl.classList.add("is-hidden");
    if (errorEl) {
      errorEl.hidden = false;
    }
    if (message && console) console.error(message);
  }

  /** Keep document metadata in sync with the selected proposal JSON. */
  function applyMetadata(data) {
    const meta = data.meta || {};
    const project = meta.project || {};
    const company = meta.company || {};

    if (meta.language) document.documentElement.lang = meta.language;

    const title = project.name
      ? "Propuesta · " + project.name + " — " + (company.name || "QuadCommit")
      : "Propuesta — " + (company.name || "QuadCommit");
    document.title = title;

    const description = document.querySelector('meta[name="description"]');
    if (description && project.description) {
      description.setAttribute(
        "content",
        [meta.documentType, project.description, company.name].filter(Boolean).join(" · ")
      );
    }
  }

  async function boot() {
    try {
      const [data, sections] = await Promise.all([
        window.ProposalLoader.loadData(),
        window.ProposalLoader.loadSections()
      ]);

      // Keep the tab title and description aligned with the proposal
      applyMetadata(data);

      // Populate content from data
      window.ProposalLoader.render(sections, data);

      // Wire sidebar navigation, scrollspy and progress (adds nav icons)
      window.ProposalNavigation.init(data);

      // Materialize all Lucide icons (content + nav) in a single pass
      if (window.lucide) window.lucide.createIcons();

      // Reveal-on-scroll animations
      window.ProposalAnimations.observe(document);

      // Footer year
      const year = document.getElementById("footer-year");
      if (year) year.textContent = String(new Date().getFullYear());

      hideLoader();
      window.ProposalNavigation.setActive("hero");
    } catch (err) {
      showError(err && err.message ? err.message : String(err));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
