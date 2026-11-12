/* ============================================================
   proposal-loader.js — Data-driven rendering engine
   Proposal Engine · QuadCommit

   Architecture:
     data/<slug>.json ──> ProposalLoader ──> populated DOM

   All proposal content lives in one JSON file per proposal. The
   slug is selected with ?p=<slug> (default: scarling). Section
   partials (sections/*.html) define reusable structure with
   declarative bindings that this loader resolves against the
   JSON payload. Editing a proposal JSON updates that proposal
   without touching markup or script.

   Binding attributes
   ------------------
   data-bind="path.to.key"       Set textContent from JSON path.
   data-bind-icon="path.to.icon" Set the Lucide icon name.
   data-bind-href="path"         Set the href attribute.
   data-bind-accent              Set `data-accent` from item.accent.
   data-bind-status              Toggle `.is-active` when item.status === "actual".
   data-repeat="path.to.array"   On a <template>, clone once per item.
   data-bind="$index"            (inside repeats) 1-based "01" index.
   data-bind="."                 (inside repeats) the raw string item.
   ============================================================ */

(function (global) {
  "use strict";

  const SECTION_ORDER = [
    "hero",
    "overview",
    "scope",
    "mvp",
    "roadmap",
    "architecture",
    "stack",
    "methodology",
    "pricing",
    "team",
    "next-steps",
    "contact"
  ];

  // Each partial is optional. A section is rendered only when the
  // proposal JSON contains data for its key, so the same engine can
  // serve proposals with different scopes without blank sections.
  const SECTION_DATA_KEYS = {
    hero: "hero",
    overview: "overview",
    scope: "scope",
    mvp: "mvp",
    roadmap: "roadmap",
    architecture: "architecture",
    stack: "stack",
    methodology: "methodology",
    pricing: "pricing",
    team: "team",
    "next-steps": "nextSteps",
    contact: "contact"
  };

  const STATUS_ACTIVE = "actual";
  const DEFAULT_SLUG = "scarling";
  const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

  /** Safe deep-path getter: getPath(obj, "a.b.c") -> obj.a.b.c */
  function getPath(obj, path) {
    if (!path) return undefined;
    if (path === ".") return obj;
    return path.split(".").reduce(function (acc, key) {
      return acc == null ? undefined : acc[key];
    }, obj);
  }

  /**
   * Recursively bind a root node (document, element or fragment)
   * against a data object. Repeat templates are expanded first; each
   * clone is bound inside the recursion with the item as its data root.
   * Only the nodes that existed BEFORE expansion are bound against the
   * outer `data`, so repeated content is never re-resolved in the wrong
   * context (which stripped icons/accents and emitted "[object Object]").
   */
  function bindElement(root, data) {
    if (!root || !data) return;

    const inTemplate = function (el) {
      return Boolean(el.closest && el.closest("template"));
    };

    // Snapshot the binding targets before touching templates. Any node
    // living inside a <template> belongs to a repeat and must be bound
    // against its item during the recursion below — never here.
    const textEls = Array.from(root.querySelectorAll("[data-bind]")).filter(function (el) {
      return !inTemplate(el);
    });
    const iconEls = Array.from(root.querySelectorAll("[data-bind-icon]")).filter(function (el) {
      return !inTemplate(el);
    });
    const hrefEls = Array.from(root.querySelectorAll("[data-bind-href]")).filter(function (el) {
      return !inTemplate(el);
    });
    const accentEls = Array.from(root.querySelectorAll("[data-bind-accent]")).filter(function (el) {
      return !inTemplate(el);
    });
    const statusEls = Array.from(root.querySelectorAll("[data-bind-status]")).filter(function (el) {
      return !inTemplate(el);
    });

    // 1. Expand repeat templates (clones are bound inside the recursion)
    Array.from(root.querySelectorAll("template[data-repeat]")).forEach(function (tpl) {
      const items = getPath(data, tpl.getAttribute("data-repeat"));
      if (!Array.isArray(items)) return;

      const parent = tpl.parentNode;
      const fragment = document.createDocumentFragment();

      items.forEach(function (item, index) {
        const clone = tpl.content.cloneNode(true);
        let ctx = item;
        // Provide a human friendly index for the template. Items may be
        // plain strings (e.g. lists), which cannot hold extra properties,
        // so we only attach the index to object-shaped items.
        if (ctx !== null && typeof ctx === "object") {
          Object.defineProperty(ctx, "$index", {
            value: String(index + 1).padStart(2, "0"),
            enumerable: false
          });
        }
        bindElement(clone, ctx);
        fragment.appendChild(clone);
      });

      parent.insertBefore(fragment, tpl);
      tpl.remove();
    });

    // 2. Text bindings — skip nullish AND object/array values so a
    //    `data-bind="."` can never render "[object Object]".
    textEls.forEach(function (el) {
      const value = getPath(data, el.getAttribute("data-bind"));
      if (value == null || typeof value === "object") return;
      el.textContent = String(value);
    });

    // 3. Lucide icon bindings — set only when a value is present, so a
    //    missing value never strips an already-assigned icon.
    iconEls.forEach(function (el) {
      const value = getPath(data, el.getAttribute("data-bind-icon"));
      if (value) el.setAttribute("data-lucide", value);
    });

    // 4. href bindings
    hrefEls.forEach(function (el) {
      const value = getPath(data, el.getAttribute("data-bind-href"));
      if (value) {
        el.setAttribute("href", value);
      } else {
        el.removeAttribute("href");
      }
    });

    // 5. Accent bindings (tag / dot / avatar color variants)
    accentEls.forEach(function (el) {
      const value = data.accent || data.color;
      if (value) {
        el.setAttribute("data-accent", value);
      } else {
        el.removeAttribute("data-accent");
      }
    });

    // 6. Status bindings (roadmap "current phase")
    statusEls.forEach(function (el) {
      el.classList.toggle("is-active", data.status === STATUS_ACTIVE);
    });
  }

  /** True when the proposal JSON actually defines content for a section. */
  function hasSectionData(data, key) {
    const value = getPath(data, key);
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return Boolean(value);
  }

  /** Fetch a text asset (JSON or HTML partial) with a helpful error. */
  async function fetchText(url) {
    const res = await fetch(url, { headers: { Accept: "text/html,application/json" } });
    if (!res.ok) {
      throw new Error("No se pudo cargar: " + url + " (" + res.status + ")");
    }
    return res.text();
  }

  /** Resolve the proposal slug from ?p=<slug>, defaulting to scarling. */
  function getProposalSlug() {
    const raw = new URLSearchParams(window.location.search).get("p");
    if (!raw) return DEFAULT_SLUG;

    const slug = raw.trim().toLowerCase();
    if (!SLUG_PATTERN.test(slug)) {
      throw new Error("Identificador de propuesta inválido: " + raw);
    }
    return slug;
  }

  async function loadData() {
    const slug = getProposalSlug();
    const data = JSON.parse(await fetchText("data/" + slug + ".json"));
    data.__slug = slug;
    return data;
  }

  async function loadSections() {
    const html = await Promise.all(
      SECTION_ORDER.map(function (name) {
        return fetchText("sections/" + name + ".html");
      })
    );
    return html.map(function (markup, i) {
      return { id: SECTION_ORDER[i], markup: markup };
    });
  }

  /**
   * Inject section partials into <main> and bind all data.
   * Sections whose data key is absent from the proposal JSON are
   * skipped. Returns the ids of the sections actually rendered so
   * navigation can ignore any stale links.
   */
  function render(sections, data) {
    const main = document.getElementById("proposal-content");
    if (!main) throw new Error("Elemento #proposal-content no encontrado");

    const fragment = document.createDocumentFragment();
    const rendered = [];

    sections.forEach(function (section) {
      const dataKey = SECTION_DATA_KEYS[section.id];
      if (!dataKey || !hasSectionData(data, dataKey)) return;

      const wrapper = document.createElement("div");
      wrapper.innerHTML = section.markup.trim();
      const node = wrapper.firstElementChild;
      if (node && node.id) {
        fragment.appendChild(node);
        rendered.push(node.id);
      }
    });

    main.appendChild(fragment);
    bindElement(main, data);

    // Bind only the static chrome (brand, client, dates). Scoping avoids a
    // second full-document pass that would re-resolve section bindings
    // against the root object, stripping relative icons / accents and
    // turning `data-bind="."` lists into "[object Object]".
    bindElement(document.getElementById("sidebar"), data);
    bindElement(document.querySelector(".mobile-header"), data);

    return rendered;
  }

  global.ProposalLoader = {
    SECTION_ORDER: SECTION_ORDER,
    SECTION_DATA_KEYS: SECTION_DATA_KEYS,
    loadData: loadData,
    loadSections: loadSections,
    render: render,
    bindElement: bindElement
  };
})(window);
