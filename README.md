# Sewa – tenancy tracker for property agents

A phone-friendly web app that turns a property agent's existing Google Sheet of
rental deals into a simple tracker with renewal reminders. The sheet stays the
single source of truth: everything the app shows is read from it, and every
edit made in the app is written straight back to it.

Built with Google Apps Script, so it's free to run and needs no server. Open
the link on an iPhone and "Add to Home Screen" to use it like an app.

## What it does
- **Today** – tenancies coming up for renewal, counted down to the end date
  (the notice date is 2 months before), plus 2nd-year fees due on 2-year leases.
- **Tenancies** – every deal, searchable, with Expired / Early termination /
  Aborted labels. Tap to open, swipe down to close; press and hold a name to
  edit the landlord/tenant name, phone and email in place.
- **Add (+)** – enter a new deal; the new row copies the sheet's own formatting.
  Leaving with unsaved changes asks: Save / Discard / Keep editing.
- **Renewal messages** – one tap opens WhatsApp (Business) with the agent's own
  message template filled in for the landlord or tenant. The agent presses send
  herself, then confirms in the app so it's ticked off.
- **Notes** – free-text remarks per deal.
- **Insights** – commission / take-home income by month.
- **Google Calendar** – optional reminders synced to a calendar, plus a weekly
  email digest.
- **Contact carry-over** – updating someone's phone/email offers to apply it to
  their other current deals too.

## How it reads the sheet
Columns are found by their **header text in row 1**, not by letter, so the
sheet's column order doesn't matter. The mapping (with a note on what each
column holds) is at the top of `Code.gs` in `COLS` and `EXTRA_HEADERS`. The app
adds its own extra columns (phones, emails, fees, App ID…) at the far right the
first time it needs them.

## Set up your own copy
1. Copy `Config.example.gs` to `Config.gs` and put in your sheet's ID (the part
   of the sheet URL between `/d/` and `/edit`).
2. Change the header text in `COLS` to match your sheet's headers.
3. Push with [clasp](https://github.com/google/clasp) (`npx @google/clasp push`)
   and deploy as a web app ("Execute as: user accessing", so each person only
   sees sheets shared with them). See `SETUP.md`.

`preview/` runs the UI locally with made-up data (`preview/build.sh`).
