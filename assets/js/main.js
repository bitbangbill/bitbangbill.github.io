// Theme: "auto" follows the OS setting (via CSS prefers-color-scheme);
// "light"/"dark" are explicit overrides stored in localStorage.
(function () {
  const root = document.documentElement;
  const toggles = document.querySelectorAll(".theme-toggle");
  const order = ["auto", "light", "dark"];

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

    toggles.forEach(function (t) {
      t.textContent = mode;
      t.setAttribute("aria-label", "Theme: " + mode + " (click to change)");
    });
  }

  apply(getSaved());
  toggles.forEach(function (t) {
    t.addEventListener("click", function () {
      apply(order[(order.indexOf(getSaved()) + 1) % order.length]);
    });
  });
})();

// Portfolio status filters
(function () {
  const chips = document.querySelectorAll(".chip[data-filter]");
  const projects = document.querySelectorAll(".project");
  const count = document.querySelector(".pf-count");

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      const filter = chip.dataset.filter;
      chips.forEach(function (c) {
        const active = c === chip;
        c.classList.toggle("is-active", active);
        c.setAttribute("aria-pressed", String(active));
      });
      let shown = 0;
      projects.forEach(function (p) {
        p.hidden = filter !== "all" && p.dataset.status !== filter;
        if (!p.hidden) shown++;
      });
      if (count) count.textContent = shown + " project" + (shown === 1 ? "" : "s");
    });
  });
})();

// Copy-to-clipboard buttons (falls back to execCommand outside secure contexts)
(function () {
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
    return Promise.resolve();
  }

  document.querySelectorAll(".copy[data-copy]").forEach(function (btn) {
    const label = btn.querySelector("span");
    let timer;
    btn.addEventListener("click", function () {
      copyText(btn.dataset.copy).then(function () {
        btn.classList.add("done");
        label.textContent = "Copied";
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.classList.remove("done");
          label.textContent = "Copy";
        }, 1600);
      });
    });
  });
})();

// Footer year
(function () {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
})();
