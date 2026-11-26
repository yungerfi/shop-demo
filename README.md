# فروشگاه نمونه — static demo store

Everything deployable is in `dist/`. No build step, no backend; data lives in the browser's localStorage.

- Store: `dist/index.html` (hash routes: `#/p/<id>`, `#/cart`, `#/checkout`, `#/receipt/<no>`)
- Admin: `dist/admin/` — demo password `1234`
- Shared logic: `dist/assets/js/common.js` (seed data, prices/Jalali/Persian digits, receipt)

## Run locally

    python -m http.server 5173 --directory dist

Then open http://localhost:5173 (admin: http://localhost:5173/admin/).

## Deployment

Live: https://yungerfi.github.io/shop-demo/ (admin: `/shop-demo/admin/`)

Every push to `main` runs `.github/workflows/deploy.yml`, which publishes `dist/` to the
`gh-pages` branch. GitHub Pages serves that branch (Settings → Pages → Deploy from a branch → `gh-pages` / root).

## Notes

- Data is per browser/device: admin changes show up in the store only on the same browser.
  Admin → تنظیمات → «بازنشانی داده‌های نمونه» restores the demo data.
- Set the real Telegram username in Admin → تنظیمات (or change `DEFAULT_SETTINGS.telegram` in `common.js`).
- Font: Vazirmatn (OFL license, bundled in `dist/assets/fonts`). Receipt PNG: html2canvas 1.4.1 (bundled, loaded only on the receipt page).
