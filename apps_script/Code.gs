/**
 * ============================================================================
 * TRM HOLIDAYS — Google Apps Script backend
 * ----------------------------------------------------------------------------
 * Google Sheets = database, this script = API.
 *
 * SETUP (once):
 *   1. Open script.google.com → New project → name it "TRM Holidays Backend"
 *   2. Delete the default myFunction() and paste this whole file in
 *   3. Run → setupSheets()  → Authorize when prompted
 *   4. Fill in the Settings sheet (admin_email especially)
 *   5. Deploy → New deployment → Web app
 *        Execute as:      Me
 *        Who has access:  Anyone
 *   6. Copy the Web App URL into assets/js/trm.js  →  TRM.API_URL
 *
 * After ANY code change: Deploy → Manage deployments → edit (pencil)
 *                        → New version → Deploy
 * ============================================================================
 */

/** Guards the admin_* endpoints. Change this, then set the same value in
 *  assets/js/trm.js (TRM.ADMIN_TOKEN). See the security note in README.md. */
var ADMIN_TOKEN = 'trm-change-this-token-2026';

var SHEETS = {
  TOURS:     'Tour_Packages',
  INQUIRIES: 'Inquiries',
  CONTACTS:  'Contacts',
  SETTINGS:  'Settings'
};

var NAVY = '#1A2B6B';


/* ══════════════════════════════════════════════════════════════════
   1. ONE-TIME SETUP
   ══════════════════════════════════════════════════════════════════ */

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  createSheet_(ss, SHEETS.TOURS, [
    'ID','Tour_Name','Category','Destination','Duration_Days','Duration_Nights',
    'Price_Per_Person','Max_Persons','Status','Thumbnail_URL','Description',
    'Highlights','Created_Date'
  ]);

  createSheet_(ss, SHEETS.INQUIRIES, [
    'ID','Timestamp','Type','Tour_Name','Customer_Name','Phone','Email',
    'Travel_Date','Persons','Message','Status','Agent_Notes'
  ]);

  createSheet_(ss, SHEETS.CONTACTS, [
    'ID','Timestamp','Name','Phone','Email','Subject','Message','Status'
  ]);

  createSheet_(ss, SHEETS.SETTINGS, ['Key','Value']);

  seedSettings_(ss);
  seedTours_(ss);

  SpreadsheetApp.getUi().alert('TRM Holidays sheets created successfully!');
}

/** Create a sheet (if missing) and format its header row. */
function createSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setBackground(NAVY)
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setVerticalAlignment('middle');

  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 34);

  for (var c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }
  return sheet;
}

function seedSettings_(ss) {
  var sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (sheet.getLastRow() > 1) return;   // already filled

  sheet.getRange(2, 1, 6, 2).setValues([
    ['company_name',    'TRM Holidays'],
    ['admin_email',     'REPLACE_WITH_YOUR_EMAIL@gmail.com'],
    ['whatsapp_number', '8801805041111'],
    ['reply_email',     'REPLACE_WITH_YOUR_EMAIL@gmail.com'],
    ['phone',           '01805041111'],
    ['currency',        'BDT']
  ]);
}

function seedTours_(ss) {
  var sheet = ss.getSheetByName(SHEETS.TOURS);
  if (sheet.getLastRow() > 1) return;   // don't overwrite real data

  var now = new Date();
  var rows = [
    ['TR-001', "Cox's Bazar Beachside Escape", 'domestic', "Cox's Bazar, Bangladesh", 5, 4, 12500, 15, 'Active',
     'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80',
     "Five days on the world's longest unbroken sea beach, with Himchari, Inani and Marine Drive.",
     'Beachfront hotel|Daily breakfast|Himchari & Inani day trip|AC transport', now],

    ['TR-002', 'Bangkok City & Beach Combo', 'international', 'Bangkok & Pattaya, Thailand', 7, 6, 55000, 20, 'Active',
     'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=900&q=80',
     'Temples and street food in Bangkok, then Pattaya for Coral Island and a river cruise.',
     'Return airfare guidance|4-star hotels|Coral Island tour|Chao Phraya dinner cruise', now],

    ['TR-003', 'Dubai Luxury Explorer', 'international', 'Dubai, UAE', 6, 5, 78000, 16, 'Active',
     'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&q=80',
     'Burj Khalifa, a desert safari with BBQ dinner, the Dubai Frame and a Marina cruise.',
     'Burj Khalifa At The Top|Desert safari + BBQ|Marina dhow cruise|5-star downtown stay', now],

    ['TR-004', 'Sajek Valley Adventure Trek', 'adventure', 'Sajek, Rangamati', 3, 2, 8500, 25, 'Active',
     'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
     'Above the clouds in the Kasalong range, with sunrise at Konglak Para.',
     'Konglak Para sunrise|Lusai village visit|Open-jeep ride|Hill resort stay', now],

    ['TR-005', 'Maldives Honeymoon Paradise', 'honeymoon', 'Malé Atoll, Maldives', 6, 5, 150000, 2, 'Active',
     'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=900&q=80',
     'An overwater villa, a candlelit sandbank dinner and snorkelling on the house reef.',
     'Water villa|Sandbank dinner|Snorkelling|Sunset dolphin cruise', now]
  ];

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/** Read the Settings sheet into a plain object. */
function getSettings() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SETTINGS);
  var settings = {};
  if (!sheet || sheet.getLastRow() < 2) return settings;

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0]) settings[String(values[i][0]).trim()] = values[i][1];
  }
  return settings;
}


/* ══════════════════════════════════════════════════════════════════
   2. doPost — form submissions
   ══════════════════════════════════════════════════════════════════ */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ success: false, error: 'No data received' });
    }

    var data = JSON.parse(e.postData.contents);

    switch (data.type) {
      case 'inquiry':       return json_(handleInquiry(data));
      case 'contact':       return json_(handleContact(data));
      case 'update_status': return json_(handleStatusUpdate(data));
      default:              return json_({ success: false, error: 'Unknown type: ' + data.type });
    }
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function handleInquiry(data) {
  if (!data.name || !data.phone || !data.email) {
    return { success: false, error: 'Name, phone and email are required.' };
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.INQUIRIES);
  var id = 'INQ-' + Date.now().toString().slice(-6);

  sheet.appendRow([
    id, new Date(), 'inquiry', data.tour_name || '', data.name, data.phone,
    data.email, data.travel_date || '', data.persons || 1, data.message || '',
    'Pending', ''
  ]);

  // Emails must never break the submission — the row is already saved.
  try { sendConfirmationEmail(data, id); } catch (err) { Logger.log('customer email failed: ' + err); }
  try { sendAdminAlert(data, id, 'inquiry'); } catch (err) { Logger.log('admin email failed: ' + err); }

  return { success: true, id: id, message: 'Inquiry received!' };
}

function handleContact(data) {
  if (!data.name || !data.email || !data.message) {
    return { success: false, error: 'Name, email and message are required.' };
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CONTACTS);
  var id = 'MSG-' + Date.now().toString().slice(-6);

  sheet.appendRow([
    id, new Date(), data.name, data.phone || '', data.email,
    data.subject || 'General', data.message, 'New'
  ]);

  try { sendConfirmationEmail(data, id); } catch (err) { Logger.log('customer email failed: ' + err); }
  try { sendAdminAlert(data, id, 'contact'); } catch (err) { Logger.log('admin email failed: ' + err); }

  return { success: true, id: id, message: 'Message received!' };
}

/** Update the Status column for an INQ-/MSG- row from the admin dashboard. */
function handleStatusUpdate(data) {
  if (!data.id || !data.status) {
    return { success: false, error: 'id and status are required.' };
  }

  var isInquiry = data.id.indexOf('INQ-') === 0;
  var sheetName = isInquiry ? SHEETS.INQUIRIES : SHEETS.CONTACTS;
  var statusCol = isInquiry ? 11 : 8;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();

  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === data.id) {
      sheet.getRange(i + 2, statusCol).setValue(data.status);
      return { success: true, id: data.id, status: data.status };
    }
  }
  return { success: false, error: 'ID not found: ' + data.id };
}


/* ══════════════════════════════════════════════════════════════════
   3. EMAILS
   ══════════════════════════════════════════════════════════════════ */

function sendConfirmationEmail(data, id) {
  var s = getSettings();
  if (!data.email) return;

  var company = s.company_name || 'TRM Holidays';
  var wa = s.whatsapp_number || '8801805041111';
  var phone = s.phone || '01805041111';

  var rows = '';
  function row(label, value) {
    if (!value) return '';
    return '<tr>' +
      '<td style="padding:9px 14px;border-bottom:1px solid #eef2f8;color:#8A9BB5;font-size:13px">' + label + '</td>' +
      '<td style="padding:9px 14px;border-bottom:1px solid #eef2f8;color:#1A2340;font-size:13px;font-weight:600">' + value + '</td>' +
    '</tr>';
  }

  rows += row('Reference', id);
  rows += row('Tour', data.tour_name || data.tour);
  rows += row('Travel date', data.travel_date);
  rows += row('Persons', data.persons);
  rows += row('Subject', data.subject);
  rows += row('Your phone', data.phone);

  var html =
  '<div style="font-family:Arial,Helvetica,sans-serif;background:#F4F7FC;padding:26px">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4ebf6">' +

      '<div style="background:' + NAVY + ';padding:24px;text-align:center">' +
        '<h1 style="color:#fff;margin:0;font-size:22px">' + company + '</h1>' +
        '<p style="color:#7BB8F0;margin:4px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase">Your Memory Maker</p>' +
      '</div>' +

      '<div style="padding:26px">' +
        '<p style="font-size:15px;color:#1A2340;margin:0 0 10px">Dear ' + data.name + ',</p>' +
        '<p style="font-size:14px;color:#42506E;line-height:1.7;margin:0 0 20px">' +
          'Thank you for contacting ' + company + '. We have received your request and one of our ' +
          'travel consultants will get back to you within 2 hours during office hours.' +
        '</p>' +

        '<table style="width:100%;border-collapse:collapse;border:1px solid #eef2f8;border-radius:8px">' + rows + '</table>' +

        '<div style="text-align:center;margin:24px 0 10px">' +
          '<a href="https://wa.me/' + wa + '" style="display:inline-block;background:#25D366;color:#fff;' +
             'text-decoration:none;padding:13px 30px;border-radius:9px;font-weight:bold;font-size:14px">' +
             'Chat with us on WhatsApp</a>' +
        '</div>' +

        '<p style="font-size:13px;color:#8A9BB5;text-align:center;margin:0">' +
          'Need us sooner? Call <b style="color:' + NAVY + '">' + phone + '</b>' +
        '</p>' +
      '</div>' +

      '<div style="background:#111D4F;padding:18px;text-align:center;color:rgba(255,255,255,.72);font-size:12px">' +
        '<p style="margin:0 0 4px">' + company + ' — Your Memory Maker</p>' +
        '<p style="margin:0">Phone / WhatsApp: ' + phone + '</p>' +
      '</div>' +

    '</div>' +
  '</div>';

  MailApp.sendEmail({
    to: data.email,
    subject: company + ' — we received your request (' + id + ')',
    htmlBody: html,
    name: company
  });
}

function sendAdminAlert(data, id, type) {
  var s = getSettings();
  var admin = s.admin_email;

  // Nothing to send to until the Settings sheet is filled in
  if (!admin || String(admin).indexOf('REPLACE_WITH') === 0) return;

  var rows = '';
  for (var key in data) {
    if (!data.hasOwnProperty(key) || key === 'type') continue;
    rows +=
      '<tr>' +
        '<td style="padding:8px 12px;border:1px solid #e4ebf6;background:#F4F7FC;font-size:13px">' + key + '</td>' +
        '<td style="padding:8px 12px;border:1px solid #e4ebf6;font-size:13px">' + data[key] + '</td>' +
      '</tr>';
  }

  var label = (type === 'inquiry' ? 'Tour inquiry' : 'Contact message');
  var subject = 'New ' + label + ': ' + data.name +
                (data.tour_name ? ' — ' + data.tour_name : '') + ' [' + id + ']';

  var html =
  '<div style="font-family:Arial,Helvetica,sans-serif">' +
    '<h2 style="color:' + NAVY + ';margin:0 0 4px">New ' + label + '</h2>' +
    '<p style="color:#8A9BB5;margin:0 0 16px;font-size:13px">Reference ' + id + '</p>' +
    '<table style="border-collapse:collapse;width:100%;max-width:560px">' + rows + '</table>' +
    '<p style="margin-top:18px">' +
      '<a href="tel:' + (data.phone || '') + '" style="background:' + NAVY + ';color:#fff;text-decoration:none;' +
         'padding:10px 20px;border-radius:8px;font-size:13px;margin-right:8px">Call customer</a>' +
      '<a href="https://wa.me/88' + (data.phone || '') + '" style="background:#25D366;color:#fff;text-decoration:none;' +
         'padding:10px 20px;border-radius:8px;font-size:13px">WhatsApp</a>' +
    '</p>' +
  '</div>';

  MailApp.sendEmail({ to: admin, subject: subject, htmlBody: html });
}


/* ══════════════════════════════════════════════════════════════════
   4. doGet — read API
   ══════════════════════════════════════════════════════════════════ */

function doGet(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    switch (p.action) {
      case 'ping':
        return json_({ success: true, message: 'TRM Holidays API running', timestamp: new Date() });

      case 'get_tours':
        return json_(getTours_(p.category));

      case 'get_tour':
        return json_(getTour_(p.id));

      case 'get_settings':
        var s = getSettings();
        return json_({
          success: true,
          settings: {
            company_name: s.company_name || 'TRM Holidays',
            whatsapp_number: s.whatsapp_number || '8801805041111',
            phone: s.phone || '01805041111',
            currency: s.currency || 'BDT'
          }
        });

      case 'admin_inquiries':
        if (p.token !== ADMIN_TOKEN) return json_({ success: false, error: 'Unauthorized' });
        return json_(getAdminRows_(SHEETS.INQUIRIES));

      case 'admin_contacts':
        if (p.token !== ADMIN_TOKEN) return json_({ success: false, error: 'Unauthorized' });
        return json_(getAdminRows_(SHEETS.CONTACTS));

      default:
        return json_({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

/** Active tours, shaped exactly like the objects in assets/js/tours-data.js */
function getTours_(category) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TOURS);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, data: [], count: 0 };

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
  var out = [];

  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    if (!r[0]) continue;                                   // blank row
    if (String(r[8]).toLowerCase() !== 'active') continue;  // Status
    if (category && String(r[2]).toLowerCase() !== String(category).toLowerCase()) continue;

    out.push(rowToTour_(r));
  }

  return { success: true, data: out, count: out.length };
}

function getTour_(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TOURS);
  if (!sheet || !id) return { success: false, error: 'Tour not found' };

  var values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 13).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === id) {
      return { success: true, tour: rowToTour_(values[i]) };
    }
  }
  return { success: false, error: 'Tour not found: ' + id };
}

function rowToTour_(r) {
  return {
    id: r[0],
    name: r[1],
    category: String(r[2]).toLowerCase(),
    destination: r[3],
    days: Number(r[4]) || 0,
    nights: Number(r[5]) || 0,
    price: Number(r[6]) || 0,
    people: r[7] ? ('2-' + r[7]) : '2-15',
    status: r[8],
    img: r[9],
    desc: r[10],
    highlights: r[11] ? String(r[11]).split('|') : [],
    // The site expects these; the sheet has no columns for them yet.
    badge: '',
    rating: 4.7,
    reviews: 0,
    hotel: 'As per itinerary'
  };
}

/** Generic sheet dump for the admin dashboard. */
function getAdminRows_(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, data: [], count: 0 };

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var out = [];
  var tz = Session.getScriptTimeZone();

  for (var i = values.length - 1; i >= 0; i--) {   // newest first
    var r = values[i];
    if (!r[0]) continue;

    var stamp = r[1] instanceof Date
      ? Utilities.formatDate(r[1], tz, 'yyyy-MM-dd HH:mm')
      : String(r[1]);

    if (sheetName === SHEETS.INQUIRIES) {
      out.push({
        id: r[0], date: stamp, type: r[2], tour: r[3], name: r[4], phone: r[5],
        email: r[6], travel_date: formatMaybeDate_(r[7], tz), persons: r[8],
        message: r[9], status: r[10] || 'Pending', notes: r[11]
      });
    } else {
      out.push({
        id: r[0], date: stamp, name: r[2], phone: r[3], email: r[4],
        subject: r[5], message: r[6], status: r[7] || 'New'
      });
    }
  }

  return { success: true, data: out, count: out.length };
}

function formatMaybeDate_(value, tz) {
  if (value instanceof Date) return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  return value ? String(value) : '';
}


/* ══════════════════════════════════════════════════════════════════
   5. HELPERS
   ══════════════════════════════════════════════════════════════════ */

/**
 * JSON response.
 * Apps Script web apps deployed with "Anyone" access already answer
 * cross-origin GET/POST. Do not add a custom Content-Type on the client —
 * the site posts as text/plain on purpose, which avoids a CORS preflight
 * that Apps Script cannot answer.
 */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run this after deploying to confirm everything is wired up. */
function testApi() {
  Logger.log(getTours_());
  Logger.log(getSettings());
  Logger.log(handleContact({
    type: 'contact', name: 'Test User', email: 'test@example.com',
    phone: '01805041111', subject: 'Test', message: 'This is a test message from testApi().'
  }));
}
