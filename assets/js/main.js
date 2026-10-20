// Theme: "auto" follows the OS setting (via CSS prefers-color-scheme);
// "light"/"dark" are explicit overrides stored in localStorage.
(function () {
  const root = document.documentElement;
  const toggle = document.querySelector(".theme-toggle");
  const label = toggle && toggle.querySelector(".theme-label");
  const order = ["auto", "light", "dark"];
  const names = { auto: "Auto", light: "Light", dark: "Dark" };

  function getSaved() {
    try {
      const t = localStorage.getItem("theme");
      return t === "light" || t === "dark" ? t : "auto";
    } catch (e) {
      return "auto";
    }
  }

  function apply(mode) {
    if (mode === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);

    try {
      if (mode === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", mode);
    } catch (e) {}

    if (toggle) {
      toggle.dataset.mode = mode;
      toggle.setAttribute("aria-label", "Theme: " + names[mode] + " (click to change)");
      toggle.title = "Theme: " + names[mode];
      if (label) label.textContent = names[mode];
    }
  }

  apply(getSaved());

  if (toggle) {
    toggle.addEventListener("click", function () {
      const next = order[(order.indexOf(getSaved()) + 1) % order.length];
      apply(next);
    });
  }
})();

// Mobile nav
(function () {
  const btn = document.querySelector(".nav-toggle");
  const links = document.getElementById("nav-links");
  if (!btn || !links) return;

  function setOpen(open) {
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    links.classList.toggle("is-open", open);
  }

  btn.addEventListener("click", function () {
    setOpen(btn.getAttribute("aria-expanded") !== "true");
  });
  links.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
})();

// Project filters
(function () {
  const chips = document.querySelectorAll(".chip[data-filter]");
  const projects = document.querySelectorAll(".project[data-tags]");

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      const filter = chip.dataset.filter;
      chips.forEach(function (c) {
        const active = c === chip;
        c.classList.toggle("is-active", active);
        c.setAttribute("aria-pressed", String(active));
      });
      projects.forEach(function (p) {
        const tags = p.dataset.tags.split(/\s+/);
        p.hidden = filter !== "all" && tags.indexOf(filter) === -1;
      });
    });
  });
})();

// Footer year
(function () {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
})();
