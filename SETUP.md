# Sewa – setup (about 10 minutes, done once on a computer)

Sewa is a phone app for tracking tenancies. It runs on her own Google account and uses her Google Sheet as its database. Nothing is stored anywhere else.

## Before you start: back up the sheet
In the Google Sheet: **File → Make a copy**. Keep the copy as a backup. The app never deletes or moves her existing rows; it only adds rows, fills in status cells and adds 7 columns at the far right. A backup is still good practice.

## 1. Add the code to the sheet
1. Open the sheet (signed in as **her** Google account) → **Extensions → Apps Script**.
2. In the editor, click **Project Settings** (gear icon) → tick **Show "appsscript.json" manifest file in editor**.
3. Back in **Editor**:
   - Open `Code.gs`, delete what's there, and paste in the contents of `Code.gs`.
   - Open `appsscript.json` and replace it with the contents of `appsscript.json`.
   - Click **+ → HTML**, name the file `Index` (no extension), and paste in the contents of `Index.html`.
4. Click **Save** (disk icon). Name the project **Sewa**.

## 2. Publish it as a web app
1. Click **Deploy → New deployment** → gear → **Web app**.
2. Set **Execute as: Me** and **Who has access: Only myself**, then click **Deploy**.
3. Google asks for permission (sheet, calendar, email). Click **Authorize access**, choose her account, then **Advanced → Go to Sewa (unsafe) → Allow**.
   The "unsafe" warning appears only because the script is her own and Google hasn't reviewed it.
4. Copy the **Web app URL** (it ends in `/exec`).

## 3. Put it on her iPhone
1. Open the `/exec` link in **Safari** and sign in to Google if asked.
2. Tap **Share → Add to Home Screen** → name it **Sewa** → **Add**.
3. Open Sewa from the home screen, tap the **bell** (top right) and turn on:
   - **Calendar reminders**: creates a "Tenancy Reminders" calendar with 9am alerts.
   - **Monday email summary** (optional).
4. To get the reminders on her iPhone: **Settings → Calendar → Accounts**, add her Google account and switch **Calendars** on. "Tenancy Reminders" then shows in the iPhone Calendar app with notifications.

## Updating later
After changing the code: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. The home-screen link stays the same.

## Good to know
- **Two-way sync:** the app reads the sheet fresh every time it opens, so edits she makes in the sheet appear in the app. The calendar re-syncs from the sheet every morning at 6am, or straight away with **Sync calendar now**.
- **Rows added by the app** go at the bottom of the sheet, in her usual format (`Landlord/Tenant`, dd/mm/yyyy dates, tenure `1` or `2`, notice date 2 months before the end).
- **Red rows** are treated as aborted. "Mark as aborted" in the app colours the row red too.
- **"Expired"** on a lease that hasn't ended yet means the tenant isn't renewing. The app shows these under *Units coming free*.
- **Duplicates:** if the same lease is in the sheet twice (e.g. copied to her live section), the app shows it once and updates both rows.
- **If Safari shows a Google error** like "Sorry, unable to open the file", she's probably signed into more than one Google account. Sign out of the others in Safari, or open the link in a Private tab and sign in only to her account.

## Data cleanup suggestions (optional)
The app copes with these, but they're worth fixing in the sheet:
- Dates with a double slash, e.g. `3/10//2019`, `21//5/2020`.
- A few dates typed month-first, e.g. `9/30/2024`, `12/14/2016`.
- `11/1/2/2022` in the Date column.
