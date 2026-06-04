# QA Checklist

Run this checklist before pushing changes to Vercel.

## Static Checks

- `xmllint --noout sitemap.xml sitemap-index.xml`
- `node --check app.js`
- `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"`
- `rg -n "[\\p{Han}]|nocontactdays\\.com" . -g '!*node_modules*' -g '!.git/*'`
- `git diff --check`

## Local Server Checks

Start the site:

```bash
python3 -m http.server 4186
```

Check:

- `/`
- `/tools/`
- `/no-contact-tracker/`
- `/no-contact-calculator/`
- `/want-to-text-your-ex/`
- `/sitemap.xml`
- `/sitemap-index.xml`
- `/robots.txt`

## Functional Checks

- Homepage tracker accepts `YYYY-MM-DD` and `YYYYMMDD`.
- No contact calculator returns a day count.
- No contact tracker quick streak calculator returns a day count.
- Want-to-text page seals a message without sending or storing it externally.
- Milestone card preview renders and download button creates a PNG.

## SEO Checks

- Every indexable page has a unique `<title>`.
- Every indexable page has a meta description.
- Every indexable page has a canonical URL.
- Sitemap URLs all return `200`.
- Important pages are linked from homepage or `/tools/`.

## Post-Deploy Checks

- Vercel deployment status is `Ready`.
- `https://no-contact-days.vercel.app/sitemap-index.xml` opens as XML.
- `https://no-contact-days.vercel.app/sitemap.xml` opens as XML.
- Submit `sitemap-index.xml` in Google Search Console after deployment.
