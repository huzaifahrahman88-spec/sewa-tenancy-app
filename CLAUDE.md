# Sewa (Sky Properties) – tenancy tracker for a property agent

iPhone-friendly Google Apps Script web app on top of her Google Sheet
(Sheet1). Two-way: the sheet is the database.

## Layout
- `Code.gs` – server: getData / addRecord / updateRecord / renewRecord / updateMany,
  writeFields_ (keeps formats), appendRow_ (copies format+validation from nearest
  plain row), calendar sync, weekly digest, templates. Columns found by header name.
- `Index.html` – whole UI: Today, Tenancies, +, Notes, Insights tabs; search;
  renewal WhatsApp messages; commission/income; swipe-to-close; long-press inline edit.
- `appsscript.json` – USER_ACCESSING / ANYONE (sheet sharing protects data).
- `preview/` – local preview with fake data (`build.sh` injects `mock.js`).
- `demo-video/` – Remotion demo video project (local only, not in the repo).

## Deploy
`npx @google/clasp push --force` then create a deployment. The deployment ID, live URL and sheet ID are in `PRIVATE_NOTES.md` / `Config.gs` (both git-ignored).

## Sheet rules (from the agent)
- Reminders count down to END date; notice = 2 months before end.
- "Expired" on a lease not yet ended = did not renew. Red rows = aborted. Column N "X" = ignore.
- Parties written "Landlord/Tenant". Column E = commission. 2-year leases: remind 2nd-year fee.
- App-added columns: Unit No., Landlord/Tenant Phone & Email, Fee (RM), Fee Collected,
  2nd Year Fee Collected, App ID, Owner/Tenant Msg Sent.

## Decisions / constraints
- WhatsApp Business via wa.me links only (whatsapp-business:// is invalid on iOS).
  App only pre-fills; she presses send, then confirms "Sent it?".
- In-app Google Contacts and the map view were removed at her request.
- Never write test data to her real sheet without the user's OK. Demo media uses fake data only.
- Repo is PUBLIC: never commit the sheet ID, deployment ID, `.clasp.json`, client data (.vcf) or demo media.

## Open
- Is the shared sheet her real working sheet or a copy? (unanswered)
- Offered, not accepted: reorder sheet columns; native iOS app.
