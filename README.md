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
- **Facebook:** https://www.facebook.com/trmholidaysbd
- **Logo:** `assets/images/logo.png`, used in every navbar and footer

All of it comes from the `TRM` object at the top of **`assets/js/trm.js`** —
that is the one place to edit contact details. Pages pull them in through
`data-trm="..."` attributes, so nothing is hard-coded page by page.

### Still to fill in

Open `assets/js/trm.js` and replace these:

```js
EMAIL:     'info@trmholidays.com',   // ← your real inbox
ADDRESS:   'Dhaka, Bangladesh',      // ← full office address
INSTAGRAM: 'https://www.instagram.com/',   // ← or delete the icon
YOUTUBE:   'https://www.youtube.com/',     // ← or delete the icon
TIKTOK:    'https://www.tiktok.com/',      // ← or delete the icon
```

Also worth doing: paste a Google Maps embed into `contact.html` (search for
`map-box`) and into `tour-detail.html` (`map-holder`).

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

### 2. Build the sheets

1. **Run** → choose `setupSheets` → **Run**
2. Authorize when prompted → *Advanced* → *Go to TRM Holidays Backend (unsafe)* → **Allow**
   (that warning is normal for your own scripts)
3. You should see: *"TRM Holidays sheets created successfully!"*

Four sheets appear: `Tour_Packages`, `Inquiries`, `Contacts`, `Settings`.

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

Change `ADMIN_TOKEN` in **both** `trm.js` and `Code.gs` to the same new value.

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

Add a row to the `Tour_Packages` sheet. `Status` must be exactly `Active` for
it to appear on the site. `Highlights` is a single cell, items separated by `|`:

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

`admin.html` checks the password in JavaScript. **Anyone who views the page
source can read it.** It keeps casual visitors out of the screen; it is not
real security.

What actually protects your data is `ADMIN_TOKEN` in `Code.gs` — without it,
the `admin_inquiries` and `admin_contacts` endpoints return `Unauthorized`.
But that token also ships in `trm.js`, so treat it as *raising the bar*, not
locking the door.

If the inquiry data is sensitive, the real fixes are:

- Don't publish `admin.html` at all — read the Google Sheet directly, it's
  already access-controlled by your Google account
- Or set the Web App to *"Who has access: Anyone with a Google account"* and
  deploy the admin page behind a real login

At minimum: change `ADMIN_TOKEN` and the password from their defaults, and
keep the admin URL private.

---

## Pre-launch checklist

**Content**
- [ ] Real email and office address in `trm.js`
- [ ] Instagram / YouTube / TikTok links set, or icons removed
- [ ] Replace the Unsplash stock photos with your own trip photos
- [ ] Real prices and durations in `Tour_Packages`
- [ ] Google Maps embed added to `contact.html`
- [ ] Testimonials swapped for real customer reviews (or removed)
- [ ] Write the Privacy / Terms / Cancellation pages — footer links go to `#`

**Backend**
- [ ] `API_URL` filled in
- [ ] `ADMIN_TOKEN` changed in both files, values matching
- [ ] Admin password changed from `TRM@admin2025`
- [ ] `admin_email` set in the Settings sheet
- [ ] Test submission lands in the sheet *and* sends both emails

**Before going live**
- [ ] Test on a real phone, not just a narrow browser window
- [ ] Tap every WhatsApp button — they should open a chat to 01805041111
- [ ] Check every nav link and footer link
- [ ] Submit each form once
- [ ] Confirm the "One Way" radio hides the return date field
- [ ] Add a favicon, and Open Graph tags if you'll share links on Facebook
