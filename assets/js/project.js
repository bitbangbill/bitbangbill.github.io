// Project pages: commit graph for the repo's main branch, and the gallery viewer.

// ------------------------------------------------------------
// Commit graph
// Fetches recent commits on main from the public GitHub API (no token,
// so 60 requests/hour per visitor; responses are cached for 10 minutes)
// and draws them as a git-log style graph.
// ------------------------------------------------------------
(function () {
  const box = document.querySelector("[data-repo]");
  if (!box) return;

  const repo = box.dataset.repo;
  const branch = box.dataset.branch || "main";
  const list = box.querySelector(".commit-list");
  const status = box.querySelector(".commit-status");
  const CACHE_KEY = "commits:" + repo + "@" + branch;
  const CACHE_MS = 10 * 60 * 1000;
  const ROW = 56;          // px per commit row (keep in sync with .commit height)
  const LANE = 14;         // px between lanes
  const PAD = 10;          // px left padding before the first lane
  const COLORS = ["var(--accent)", "var(--copper)", "#4a8fd4", "#a06cc9", "#c9a227"];

  function readCache() {
    try {
      const hit = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (hit && Date.now() - hit.t < CACHE_MS) return hit.data;
    } catch (e) {}
    return null;
  }

  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: data })); } catch (e) {}
  }

  function load() {
    const cached = readCache();
    if (cached) return Promise.resolve(cached);
    const url = "https://api.github.com/repos/" + repo + "/commits?sha=" + encodeURIComponent(branch) + "&per_page=30";
    return fetch(url, { headers: { Accept: "application/vnd.github+json" } }).then(function (res) {
      if (res.status === 404 || res.status === 409) throw new Error("Repository not found or empty.");
      if (res.status === 403 || res.status === 429) throw new Error("GitHub rate limit reached. Try again later.");
      if (!res.ok) throw new Error("GitHub returned " + res.status + ".");
      return res.json();
    }).then(function (json) {
      // Keep only what we draw, to keep the cache small.
      const data = json.map(function (c) {
        return {
          sha: c.sha,
          url: c.html_url,
          msg: (c.commit.message || "").split("\n")[0],
          author: (c.author && c.author.login) || c.commit.author.name,
          date: c.commit.author.date,
          parents: c.parents.map(function (p) { return p.sha; })
        };
      });
      writeCache(data);
      return data;
    });
  }

  // Assign each commit a lane, like `git log --graph`.
  function layout(commits) {
    let lanes = [];
    return commits.map(function (c) {
      let idx = lanes.indexOf(c.sha);
      if (idx === -1) {
        idx = lanes.indexOf(null);
        if (idx === -1) idx = lanes.length;
        lanes[idx] = c.sha;
      }
      // Other lanes waiting for this commit merge into it here.
      const joins = [];
      lanes.forEach(function (sha, j) { if (sha === c.sha && j !== idx) joins.push(j); });
      const before = lanes.slice();

      joins.forEach(function (j) { lanes[j] = null; });
      lanes[idx] = c.parents[0] || null;
      const forks = [];
      c.parents.slice(1).forEach(function (p) {
        if (lanes.indexOf(p) !== -1) { forks.push(lanes.indexOf(p)); return; }
        let k = lanes.indexOf(null);
        if (k === -1) k = lanes.length;
        lanes[k] = p;
        forks.push(k);
      });
      while (lanes.length && lanes[lanes.length - 1] === null) lanes.pop();
      return { idx: idx, before: before, after: lanes.slice(), joins: joins, forks: forks };
    });
  }

  const x = function (lane) { return PAD + lane * LANE; };
  const y = function (row) { return row * ROW + ROW / 2; };
  const color = function (lane) { return COLORS[lane % COLORS.length]; };

  function path(x1, y1, x2, y2, lane) {
    const d = x1 === x2
      ? "M" + x1 + " " + y1 + "V" + y2
      : "M" + x1 + " " + y1 + "C" + x1 + " " + (y1 + ROW / 2) + " " + x2 + " " + (y2 - ROW / 2) + " " + x2 + " " + y2;
    return '<path d="' + d + '" stroke="' + color(lane) + '"/>';
  }

  function draw(commits) {
    const rows = layout(commits);
    const maxLanes = rows.reduce(function (m, r) { return Math.max(m, r.before.length, r.after.length); }, 1);
    const width = PAD * 2 + (maxLanes - 1) * LANE;
    const height = rows.length * ROW;
    let edges = "";
    let nodes = "";

    rows.forEach(function (r, i) {
      const next = rows[i + 1];
      const yEnd = next ? y(i + 1) : height;
      r.after.forEach(function (sha, j) {
        if (!sha) return;
        // Lines leave from the commit node if they are its parents, else continue straight.
        const fromNode = j === r.idx || r.forks.indexOf(j) !== -1;
        const sx = fromNode ? x(r.idx) : x(j);
        const ex = next && commits[i + 1].sha === sha ? x(next.idx) : x(j);
        edges += path(sx, y(i), ex, yEnd, j);
      });
      nodes += '<circle cx="' + x(r.idx) + '" cy="' + y(i) + '" r="4.5" fill="var(--surface)" stroke="' + color(r.idx) + '" stroke-width="2.5"/>';
    });

    const svg = '<svg class="commit-graph" width="' + width + '" height="' + height + '" aria-hidden="true">' +
      '<g fill="none" stroke-width="2">' + edges + "</g>" + nodes + "</svg>";

    const rtf = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }) : null;
    function ago(iso) {
      const s = (new Date(iso) - Date.now()) / 1000;
      const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
      for (let k = 0; k < units.length; k++) {
        if (Math.abs(s) >= units[k][1] || units[k][0] === "minute") {
          const n = Math.round(s / units[k][1]);
          return rtf ? rtf.format(n, units[k][0]) : new Date(iso).toLocaleDateString();
        }
      }
    }

    list.style.setProperty("--graph-w", width + "px");
    list.innerHTML = svg;
    const ol = document.createElement("ol");
    commits.forEach(function (c) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.className = "commit";
      a.href = c.url;
      a.target = "_blank";
      a.rel = "noopener";
      const msg = document.createElement("span");
      msg.className = "commit-msg";
      msg.textContent = c.msg;
      msg.title = c.msg;
      const meta = document.createElement("span");
      meta.className = "commit-meta mono";
      meta.textContent = c.sha.slice(0, 7) + " · " + c.author + " · " + ago(c.date);
      a.append(msg, meta);
      li.append(a);
      ol.append(li);
    });
    list.append(ol);
    status.hidden = true;
  }

  load().then(function (commits) {
    if (!commits.length) throw new Error("No commits on " + branch + " yet.");
    draw(commits);
  }).catch(function (err) {
    status.textContent = "Couldn't load commits. " + err.message;
  });
})();

// ------------------------------------------------------------
// Gallery: a row of three tiles and a full viewer. Images used in updates
// are added after the gallery images; their description links to the update.
// Without JS the tiles are plain links to the images.
// ------------------------------------------------------------
(function () {
  const data = document.getElementById("gallery-data");
  const row = document.querySelector(".gallery");
  const dialog = document.querySelector(".viewer");
  if (!data || !row || !dialog || !dialog.showModal) return;

  const items = JSON.parse(data.textContent);
  document.querySelectorAll(".updates li").forEach(function (li) {
    const title = li.querySelector("h3").textContent;
    const date = li.querySelector("time").textContent;
    li.querySelectorAll(".u-body img").forEach(function (img) {
      const i = items.length;
      items.push({ src: img.currentSrc || img.src, name: img.alt || title, update: { id: li.id, title: title, date: date } });
      // Clicking a photo in an update opens it in the viewer too.
      img.classList.add("zoomable");
      img.addEventListener("click", function () { dialog.showModal(); show(i); });
    });
  });
  if (!items.length) return;

  // Tiles: the first three; with more, the third opens the viewer with a count.
  row.textContent = "";
  items.slice(0, 3).forEach(function (it, i) {
    const more = i === 2 && items.length > 3;
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "g-tile" + (more ? " more" : "");
    const img = document.createElement("img");
    img.src = it.src;
    img.alt = it.name;
    img.loading = "lazy";
    btn.appendChild(img);
    if (more) {
      const over = document.createElement("span");
      over.className = "g-over";
      over.innerHTML = "View all <b></b>";
      over.querySelector("b").textContent = items.length;
      btn.appendChild(over);
    }
    const cap = document.createElement("span");
    cap.className = "cap";
    cap.textContent = more ? "+" + (items.length - 2) + " more" : it.name;
    btn.appendChild(cap);
    btn.addEventListener("click", function () { dialog.showModal(); show(i); });
    li.appendChild(btn);
    row.appendChild(li);
  });

  const stage = dialog.querySelector(".v-img");
  const name = dialog.querySelector(".v-name");
  const desc = dialog.querySelector(".v-desc");
  const count = dialog.querySelector(".v-count");
  const thumbs = dialog.querySelector(".v-thumbs");
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = 0;

  items.forEach(function (it, i) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "option");
    b.setAttribute("aria-label", it.name);
    const t = document.createElement("img");
    t.src = it.src;
    t.alt = "";
    t.loading = "lazy";
    b.appendChild(t);
    b.addEventListener("click", function () { show(i); });
    thumbs.appendChild(b);
  });

  function goToUpdate(id) {
    dialog.close();
    const li = document.getElementById(id);
    if (!li) return;
    li.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
    document.querySelectorAll(".updates li.is-target").forEach(function (x) { x.classList.remove("is-target"); });
    li.classList.add("is-target");
  }

  function show(i) {
    current = (i + items.length) % items.length;
    const it = items[current];
    stage.classList.remove("in");
    stage.onload = function () { stage.classList.add("in"); };
    stage.src = it.src;
    stage.alt = it.name;
    name.textContent = it.name;
    count.textContent = (current + 1) + " / " + items.length;
    desc.textContent = "";
    if (it.update) {
      const a = document.createElement("a");
      a.href = "#" + it.update.id;
      a.textContent = "Update · " + it.update.title + " · " + it.update.date;
      a.addEventListener("click", function (e) { e.preventDefault(); goToUpdate(it.update.id); });
      desc.appendChild(a);
    } else {
      desc.textContent = it.desc || "";
    }
    thumbs.querySelectorAll("button").forEach(function (b, j) {
      b.setAttribute("aria-selected", String(j === current));
      if (j === current) b.scrollIntoView({ block: "nearest" });
    });
  }

  dialog.querySelector(".v-prev").addEventListener("click", function () { show(current - 1); });
  dialog.querySelector(".v-next").addEventListener("click", function () { show(current + 1); });
  dialog.querySelector(".v-close").addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });
})();
