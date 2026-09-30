# TRM Holidays — OTA Website

Static travel-agency website (flights, hotels, tour packages) with a Google
Sheets + Apps Script backend. No build step, no framework — open the HTML and
it runs.

---

## Files

| File | What it is |
|---|---|
| `index.html` | Homepage — hero slider, 3-tab search, tours, destinations, stats, testimonials |
| `tours.html` | All packages — category pills, sort, budget slider, pagination |
| `tour-detail.html` | Single package — gallery, 5 tabs, itinerary, live-total booking form |
| `flights.html` | Flight results (mock data) — filters, sort, expandable cards |
| `hotels.html` | Hotel results (mock data) — filters, list/grid toggle |
| `contact.html` | Contact form + office info + social links |
| `admin.html` | Password-gated dashboard — inquiries, messages, packages |
| `assets/css/trm.css` | Design system: colours, buttons, cards, navbar, footer, responsive |
| `assets/js/trm.js` | **Config lives here**, plus navbar, validation, API helpers |
| `assets/js/tours-data.js` | The 12-package catalogue + card renderer |
| `apps_script/Code.gs` | The whole backend — paste into script.google.com |

Every page shares `trm.css` and `trm.js`, so a change to the navbar, footer
styling, phone number or brand colours only has to be made once.

---

## Your details are already in

- **Phone / WhatsApp:** `01805041111` (WhatsApp links use `8801805041111`)
- **Office:** House 32, Road 17/A, Block E, Banani, Dhaka 1213 (also drives the map on `contact.html`)
- **Facebook:** https://www.facebook.com/trmholidaysbd
- **Logo:** `assets/images/logo.jpeg`, used in every navbar and footer

All of it comes from the `TRM` object at the top of **`assets/js/trm.js`** —
that is the one place to edit contact details. Pages pull them in through
`data-trm="..."` attributes, so nothing is hard-coded page by page.

### Still to fill in

Open `assets/js/trm.js` and fill these in when the pages exist. While a value
is empty its icon is hidden everywhere:

```js
INSTAGRAM: '',
YOUTUBE:   '',
TIKTOK:    '',
EMAIL2:    '',   // optional second inbox
```

The contact-page map is generated from `MAP_QUERY` in `trm.js` — no embed
code needed.

---

## Running it locally

Just open `index.html` in a browser. Or, to avoid file-path quirks:

```bash
python -m http.server 5173
```

Then visit http://127.0.0.1:5173

Without a backend the site still works fully — tour data comes from
`tours-data.js`, and forms show a clear error telling the visitor to use
WhatsApp instead. Wire up Apps Script to make the forms actually submit.

---

## Backend setup (Google Sheets + Apps Script)

### 1. Create the script

1. Go to [script.google.com](https://script.google.com) → **New project**
2. Name it `TRM Holidays Backend`
3. Delete the default `myFunction()` and paste in all of `apps_script/Code.gs`
4. Save (Ctrl+S)

A standalone project (created at script.google.com) works: `setupSheets`
creates a spreadsheet called **TRM Holidays Database** in your Drive and prints
its link in the execution log. If you'd rather use a Sheet you already have,
open it and go to **Extensions → Apps Script** instead.

### 2. Build the sheets

1. **Run** → choose `setupSheets` → **Run**
2. Authorize when prompted → *Advanced* → *Go to TRM Holidays Backend (unsafe)* → **Allow**
   (that warning is normal for your own scripts)
3. You should see: *"TRM Holidays sheets created successfully!"*

Four sheets appear: `Tour_Packages` (pre-filled with the same 12 packages as
the site), `Inquiries`, `Contacts`, `Settings`. Running `setupSheets` again is
safe — it never deletes rows, and adds any missing columns to older sheets.

### 3. Fill in Settings

In the `Settings` sheet, replace both `REPLACE_WITH_YOUR_EMAIL@gmail.com`
values with your real address. **Emails to you won't send until you do this.**

### 4. Deploy

1. **Deploy** → **New deployment** → gear icon → **Web app**
2. Execute as: **Me** · Who has access: **Anyone**
3. **Deploy**, then copy the Web App URL

### 5. Connect the site

In `assets/js/trm.js`:

```js
API_URL: 'https://script.google.com/macros/s/AKfy..../exec',
```

Set `ADMIN_TOKEN` in `Code.gs` (inside the Apps Script editor) to a long secret
of your own and redeploy. That value **is** the admin.html login password — it
is never stored in the website files.

### 6. Test

Open these in a browser — replace `YOUR_URL` with your Web App URL:

- `YOUR_URL?action=ping` → `{"success":true,"message":"TRM Holidays API running"...}`
- `YOUR_URL?action=get_tours` → your 5 sample packages
- `YOUR_URL?action=get_settings` → company name, WhatsApp number

Then submit the contact form and check that a row lands in the `Contacts`
sheet and an email arrives.

### After any code change

**Deploy** → **Manage deployments** → pencil icon → **New version** → **Deploy**.
Skipping this is the single most common reason a change appears to do nothing.

---

## Adding and editing packages

Add a row to the `Tour_Packages` sheet. `Status` must be `Active` for it to
appear on the site.

**`Region` decides which list a package goes in** — `domestic` (inside
Bangladesh) or `international`. The homepage shows the two in separate
sections, and the Tour Packages page has Domestic / International tabs. If
`Region` is left blank, `domestic`, `adventure` and `group` categories count as
domestic and everything else as international.

`Category` is the trip style used by the filter pills: `domestic`,
`international`, `honeymoon`, `adventure` or `group`. `Badge` can be `hot`,
`new` or `limited`.

`Highlights` is a single cell, items separated by `|`:

```
Beachfront hotel|Daily breakfast|AC transport|Guide included
```

The site reads packages from the sheet once `API_URL` is set. If the API is
unreachable it silently falls back to the 12 packages in `tours-data.js`, so
the site never shows an empty page.

---

## Hosting (free)

### GitHub Pages

1. Create a **public** repo, e.g. `trmholidays`
2. Upload every file **keeping the `assets/` folder structure intact**
3. **Settings** → **Pages** → Source: `Deploy from a branch`, Branch: `main`, `/(root)`
4. Live in 2–3 minutes at `https://yourusername.github.io/trmholidays`

### Netlify / Vercel

Drag the whole folder onto [netlify.com](https://app.netlify.com/drop) — live
instantly at `something.netlify.app`. Both also handle custom domains.

### Custom domain

Buy `trmholidays.com.bd` (~2,000–3,000 BDT/year), point a CNAME at your host,
and set it under Pages → Custom domain. DNS takes up to 48 hours.

---

## ⚠️ About the admin password

`admin.html` does not contain the password. Whatever is typed at login is sent
to Apps Script as the admin token, and `Code.gs` compares it with its own
`ADMIN_TOKEN` — a wrong value gets `Unauthorized` and no data.

So the only secret is `ADMIN_TOKEN` in `Code.gs`. Keep it out of this public
repo: change it in the Apps Script editor, not in the committed file. The old
default (`trm-change-this-token-2026`) was published and must be replaced.

---

## Pre-launch checklist

**Content**
- [ ] Instagram / YouTube / TikTok links set in `trm.js` (empty = icon hidden)
- [ ] Replace the Unsplash stock photos with your own trip photos
- [ ] Real prices and durations in `Tour_Packages`
- [ ] Testimonials swapped for real customer reviews (or removed)
- [ ] Write the Privacy / Terms / Cancellation pages — footer links go to `#`

**Backend**
- [ ] `API_URL` filled in
- [ ] `ADMIN_TOKEN` in Code.gs replaced with your own secret (this is the admin login)
- [ ] `admin_email` set in the Settings sheet
- [ ] Test submission lands in the sheet *and* sends both emails

**Before going live**
- [ ] Test on a real phone, not just a narrow browser window
- [ ] Tap every WhatsApp button — they should open a chat to 01805041111
- [ ] Check every nav link and footer link
- [ ] Submit each form once
- [ ] Confirm the "One Way" radio hides the return date field
- [ ] Add a favicon, and Open Graph tags if you'll share links on Facebook
