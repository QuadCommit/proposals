/* ============================================================
   animations.js — Scroll reveal via IntersectionObserver
   Proposal Engine · QuadCommit

   Elements carrying `.reveal` + a direction class
   (reveal-up / reveal-left / reveal-right / reveal-scale) fade
   in the first time they enter the viewport. Fully disabled
   when the user prefers reduced motion.
   ============================================================ */

(function (global) {
  "use strict";

  const REDUCED =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let observer = null;

  function revealOnIntersect(entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      if (observer) observer.unobserve(entry.target);
    });
  }

  function ensureObserver() {
    if (observer || !("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver(revealOnIntersect, {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px"
    });
  }

  /** Observe every `.reveal` inside the given root (default: document). */
  function observe(root) {
    const container = root || document;
    const elements = container.querySelectorAll(".reveal");

    // Reduced motion: show everything immediately, no animation.
    if (REDUCED || !("IntersectionObserver" in window)) {
      elements.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    ensureObserver();
    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  global.ProposalAnimations = {
    observe: observe
  };
})(window);
