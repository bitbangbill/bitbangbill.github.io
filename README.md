# bitbangbill.dev

Static electrical engineering portfolio, hosted on GitHub Pages (free tier) at
https://bitbangbill.dev. It uses plain HTML, CSS, and JS, with no build step.

## Structure

```
index.html            main page
404.html              custom not-found page
assets/css/style.css  styles and theme tokens
assets/js/main.js     theme toggle, mobile nav, project filters
blog/                 blog posts (copy an existing post as a template)
favicon.svg           icon (adapts to light/dark)
CNAME                 custom domain for GitHub Pages
.nojekyll             serve files as-is (skip Jekyll)
resume.pdf            ← add your résumé here
```

## Theme

The site follows the visitor's OS light/dark setting automatically through the CSS
`prefers-color-scheme` media query. The toggle in the nav cycles **Auto → Light → Dark**,
and the choice is saved in `localStorage`. Everything runs in the browser, so it works
on the free tier.

Colors are CSS variables at the top of `assets/css/style.css`.

## Deploy

1. Create a **public** repo named `bitbangbill.github.io` (the free tier needs public repos for Pages).
2. Push this folder to the `main` branch.
3. In the repo, go to **Settings → Pages**, then set Source to *Deploy from a branch*, branch `main`, folder `/ (root)`.
4. Under **Custom domain**, enter `bitbangbill.dev` (the `CNAME` file already contains it).
5. At your domain registrar, add these DNS records:
   - `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - (optional) `AAAA` for `@` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` for `www` → `bitbangbill.github.io`
6. Once DNS resolves, check **Enforce HTTPS**. `.dev` domains require HTTPS (HSTS preload),
   so the site won't load over plain HTTP until the certificate is issued.

Optional: verify the domain under your GitHub account's **Settings → Pages** to prevent takeover.

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
