# bitbangbill.dev

Static electrical engineering portfolio, hosted on GitHub Pages (free tier) at
https://bitbangbill.dev. It uses plain HTML, CSS, and JS. A GitHub Actions workflow runs Jekyll to build the
project cards and pages from `PROJECT.md` files in project repos and from `_projects/`.

## Structure

```
index.html            home page (about, project showcase, experience, contact)
portfolio/index.html  full portfolio at /portfolio/
404.html              custom not-found page
assets/css/style.css  styles and theme tokens
assets/js/main.js     theme toggle, portfolio filters, copy-email buttons
_projects/            one Markdown file per project (see below)
_layouts/project.html project page template: gallery viewer, updates, live commit graph
_includes/            shared page parts (head, footer, project card, status badge)
_includes/thumbs/     SVG card illustrations
_config.yml           Jekyll settings
assets/js/project.js  commit graph (GitHub API) + gallery viewer
_data/statuses.yml    project statuses and their labels
scripts/fetch-projects.rb  pulls PROJECT.md from tagged repos (run in CI)
templates/project-repo/    PROJECT.md + workflow to copy into a project repo
.github/workflows/pages.yml  builds and deploys the site
favicon.svg           icon (adapts to light/dark)
CNAME                 custom domain for GitHub Pages
resume.pdf            ← add your résumé here
```

## Projects

### From a project repo (hands-off)

Each project can live in its own repo, with no changes to this repo:

1. Copy `templates/project-repo/PROJECT.md` and
   `templates/project-repo/.github/workflows/notify-site.yml` into the project repo
   (same paths) and push them to a branch called `updates`.
2. Add the repo secret `SITE_TOKEN` (Settings → Secrets and variables → Actions). It's a
   [fine-grained token](https://github.com/settings/personal-access-tokens/new) with
   access to `bitbangbill/bitbangbill.github.io` only, permission **Contents: Read and
   write**. One token can be reused across all project repos.
3. Add the topic **`bitbangbill-site`** to the repo (the ⚙ next to *About* on the repo page).

From then on:

- **Project details:** the front matter at the top of `PROJECT.md` (between the `---`
  lines) takes the same fields as a local project file below: `title`, `summary`,
  `status`, `featured`, `tools`, `image` or `thumb`, `specs`, `gallery`. `repo` and `date` are
  filled in automatically.
- **New update:** add a `## Title` section under `# Updates` in `PROJECT.md` and push
  to `updates`. The site rebuilds in about a minute. Each section is one box on the
  project page's timeline, dated with the date and time of the commit that added its
  heading (renaming the heading re-dates it). To set the date yourself, put it first:
  `## 2026-10-12 — Title` or `## 2026-10-12 14:30 — Title`. Images can use paths
  relative to the project repo.
- **Status:** set `status:` in the front matter to `planned`, `ongoing` or `complete`
  (shown as *Across the line*). Projects are listed in that order (across the line,
  ongoing, planned), newest first within each, and can be filtered by status on
  `/portfolio/`.
- **Showcase:** add `featured: true` to the three projects you want on the home page.
  If none are featured, the first three are shown.
- **Gallery:** `gallery:` entries take `src`, `caption` and an optional `description`.
  Images used in updates are added to the end of the gallery automatically, linking
  back to their update.
- **Add/remove a project:** add or remove the `bitbangbill-site` topic. Topic changes
  don't send an event, so they show up on the hourly build, or straight away if you
  click **Run workflow** under Actions → *Build site* (works from the GitHub app too).

Project repos must be public. If `updates` doesn't exist, `PROJECT.md` is read from the
default branch. Build warnings (missing images, bad dates, unknown status) appear on the
workflow run in the Actions tab.

### In this repo

A project can also be a file in `_projects/`; the file name becomes the page URL
`/projects/<file-name>.html`. If a tagged repo has the same name, the repo's
`PROJECT.md` replaces the file. Copy an existing file to start a new one:

```markdown
---
title: Synchronous Buck Converter
date: 2025-11-20            # cards are sorted newest first by this
summary: One or two sentences for the card and page intro.
status: ongoing             # optional: planned | ongoing | complete
featured: true              # optional: show on the home page
repo: bitbangbill/sync-buck-converter   # optional: Source link + commit graph
thumb: wave.svg             # optional: file in _includes/thumbs/
image: assets/img/buck.jpg  # optional: photo instead of thumb
tools: [LTspice, KiCad]     # optional: chips on the card

specs:                      # optional: table on the project page
  Input: 12 V
  Output: 3.3 V, 5 A

gallery:                    # optional
  - src: assets/img/sync-buck-converter/board.jpg
    caption: Board under test
    description: Loop gain measured with an injection transformer.  # optional

updates:                    # optional, newest first
  - date: 2025-11-20
    title: Loop measured
    text: Phase margin is 58°.
---

The write-up goes here in Markdown. It becomes the Overview section.
```

Quote a value if it contains `: ` or starts with a special character, e.g.
`summary: "Note: like this"`.

## Theme

The site follows the visitor's OS light/dark setting automatically through the CSS
`prefers-color-scheme` media query. The toggle at the top cycles **auto → light → dark**,
and the choice is saved in `localStorage`. Everything runs in the browser, so it works
on the free tier.

Colors are CSS variables at the top of `assets/css/style.css` (the violet palette).
Your name and both contact email addresses are set in `_config.yml` (`author`,
`email`, `email_alt`).

## Deploy

1. Create a **public** repo named `bitbangbill.github.io` (the free tier needs public repos for Pages).
2. Push this folder to the `main` branch.
3. In the repo, go to **Settings → Pages**, then set Source to *GitHub Actions*. The
   *Build site* workflow deploys on every push to `main`.
4. Under **Custom domain**, enter `bitbangbill.dev` (the `CNAME` file already contains it).
5. At your domain registrar, add these DNS records:
   - `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - (optional) `AAAA` for `@` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` for `www` → `bitbangbill.github.io`
6. Once DNS resolves, check **Enforce HTTPS**. `.dev` domains require HTTPS (HSTS preload),
   so the site won't load over plain HTTP until the certificate is issued.

Optional: verify the domain under your GitHub account's **Settings → Pages** to prevent takeover.

## Local preview

Needs Jekyll, since the project pages are built from templates. Run
`ruby scripts/fetch-projects.rb` first to pull in the tagged project repos (it writes
to `_projects/remote/` and `assets/img/projects/`, both git-ignored). With Podman (or
Docker), nothing to install; the first run takes a minute or two, later runs are
fast because the gems are kept in a volume:

```sh
podman run --rm -it -p 4000:4000 -v "$PWD":/src:Z -v jekyll-gems:/usr/local/bundle \
  docker.io/library/ruby:3.3-slim sh -c '
    command -v jekyll >/dev/null || { apt-get -qq update && apt-get -qq install -y build-essential >/dev/null &&
      gem install --no-document jekyll:3.10.0 kramdown-parser-gfm webrick csv base64 bigdecimal logger; }
    jekyll serve -s /src -d /tmp/site --host 0.0.0.0 --force_polling'
# open http://localhost:4000 — edits reload on save; Ctrl+C to stop
```

Without a container (Fedora): `sudo dnf install ruby-devel`, then
`gem install --user-install jekyll webrick` and run `jekyll serve` in the repo.
