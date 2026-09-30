/**
 * ============================================================================
 * TRM HOLIDAYS — Google Apps Script backend
 * ----------------------------------------------------------------------------
 * Google Sheets = database, this script = API.
 *
 * SETUP (once):
 *   1. Open script.google.com → New project → name it "TRM Holidays Backend"
 *      (or, from an existing Google Sheet: Extensions → Apps Script)
 *   2. Delete the default myFunction() and paste this whole file in
 *   3. Run → setupSheets()  → Authorize when prompted
 *        - Standalone project: a new spreadsheet "TRM Holidays Database" is
 *          created in your Drive. Its link is printed in the execution log.
 *        - Opened from a Sheet: that Sheet is used.
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

/** Guards the admin endpoints (reading inquiries, changing status). This IS
 *  the admin.html login password — the website files never contain it.
 *  Change it here in the Apps Script editor (not in the public repo) and
 *  redeploy. The old default below was published, so it must be replaced. */
var ADMIN_TOKEN = 'trm-change-this-token-2026';

var SHEETS = {
  TOURS:     'Tour_Packages',
  INQUIRIES: 'Inquiries',
  CONTACTS:  'Contacts',
  SETTINGS:  'Settings'
};

var HEADERS = {
  TOURS: [
    'ID','Tour_Name','Category','Destination','Duration_Days','Duration_Nights',
    'Price_Per_Person','Max_Persons','Status','Thumbnail_URL','Description',
    'Highlights','Created_Date','Region','Badge','Rating','Reviews','Hotel'
  ],
  INQUIRIES: [
    'ID','Timestamp','Type','Tour_Name','Customer_Name','Phone','Email',
    'Travel_Date','Persons','Message','Status','Agent_Notes'
  ],
  CONTACTS: [
    'ID','Timestamp','Name','Phone','Email','Subject','Message','Status','Tour'
  ],
  SETTINGS: ['Key','Value']
};

/** Category values that are always inside Bangladesh when Region is blank. */
var DOMESTIC_CATEGORIES = ['domestic', 'adventure', 'group'];

var INQUIRY_STATUSES = ['Pending', 'Contacted', 'Confirmed', 'Closed'];
var CONTACT_STATUSES = ['New', 'Replied', 'Closed'];

var NAVY = '#1A2B6B';


/* ══════════════════════════════════════════════════════════════════
   0. SPREADSHEET ACCESS
   Works both for a script opened from a Sheet (container-bound) and for
   a standalone project from script.google.com, which has no "active"
   spreadsheet — there, the ID saved by setupSheets() is used.
   ══════════════════════════════════════════════════════════════════ */

function getSS_() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('No spreadsheet yet — run setupSheets() once from the editor.');
  return SpreadsheetApp.openById(id);
}

function getSheet_(name) {
  var sheet = getSS_().getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" is missing — run setupSheets() again.');
  return sheet;
}


/* ══════════════════════════════════════════════════════════════════
   1. ONE-TIME SETUP  (safe to run again — it never deletes data)
   ══════════════════════════════════════════════════════════════════ */

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();

  if (!ss) {
    var id = props.getProperty('SPREADSHEET_ID');
    if (id) {
      ss = SpreadsheetApp.openById(id);
    } else {
      ss = SpreadsheetApp.create('TRM Holidays Database');
      props.setProperty('SPREADSHEET_ID', ss.getId());
    }
  }

  createSheet_(ss, SHEETS.TOURS,     HEADERS.TOURS);
  createSheet_(ss, SHEETS.INQUIRIES, HEADERS.INQUIRIES);
  createSheet_(ss, SHEETS.CONTACTS,  HEADERS.CONTACTS);
  createSheet_(ss, SHEETS.SETTINGS,  HEADERS.SETTINGS);

  seedSettings_(ss);
  seedTours_(ss);

  // A brand-new spreadsheet comes with an empty "Sheet1"
  var blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);

  var msg = 'TRM Holidays sheets created successfully!\n' + ss.getUrl();
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (err) { /* standalone: no UI, log is enough */ }
}

/**
 * Create a sheet (if missing) and format its header row. On an existing
 * sheet, any header that is missing is added at the end, so older sheets
 * pick up new columns (e.g. Region) without losing their data.
 */
function createSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(function (h) { return String(h).trim(); });
    headers.forEach(function (h) {
      if (existing.indexOf(h) === -1) {
        existing.push(h);
        sheet.getRange(1, existing.length).setValue(h);
      }
    });
  }

  var width = sheet.getLastColumn();
  sheet.getRange(1, 1, 1, width)
    .setBackground(NAVY)
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setVerticalAlignment('middle');

  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 34);
  sheet.autoResizeColumns(1, width);
  return sheet;
}

function seedSettings_(ss) {
  var sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (sheet.getLastRow() > 1) return;   // already filled

  var rows = [
    ['company_name',    'TRM Holidays'],
    ['admin_email',     'REPLACE_WITH_YOUR_EMAIL@gmail.com'],
    ['whatsapp_number', '8801805041111'],
    ['reply_email',     'REPLACE_WITH_YOUR_EMAIL@gmail.com'],
    ['phone',           '01805041111'],
    ['address',         'House 32, Road 17/A, Block E, Banani, Dhaka 1213'],
    ['currency',        'BDT']
  ];
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

/** Same 12 packages, same IDs, as assets/js/tours-data.js. */
function seedTours_(ss) {
  var sheet = ss.getSheetByName(SHEETS.TOURS);
  if (sheet.getLastRow() > 1) return;   // don't overwrite real data

  var now = new Date();
  var U = 'https://images.unsplash.com/';
  // ID, name, category, destination, days, nights, price, max, img, desc, highlights, region, badge, rating, reviews, hotel
  var tours = [
    ['TR-001', "Cox's Bazar Beachside Escape", 'domestic', "Cox's Bazar, Bangladesh", 5, 4, 12500, 15,
     U + 'photo-1507525428034-b723cf961d3e?w=900&q=80',
     "Five days on the world's longest unbroken sea beach, with Himchari, Inani and Marine Drive.",
     'Beachfront hotel|Daily breakfast|Himchari & Inani day trip|AC transport',
     'domestic', 'hot', 4.8, 214, '3★ Beachfront'],

    ['TR-002', 'Bangkok City & Beach Combo', 'international', 'Bangkok & Pattaya, Thailand', 7, 6, 55000, 20,
     U + 'photo-1563492065599-3520f775eeed?w=900&q=80',
     'Temples, street food and a Chao Phraya river cruise in Bangkok, then Pattaya for Coral Island.',
     '4-star hotels|Coral Island tour|Floating market|Chao Phraya dinner cruise',
     'international', 'new', 4.7, 168, '4★ City + Beach'],

    ['TR-003', 'Dubai Luxury Explorer', 'international', 'Dubai, UAE', 6, 5, 78000, 16,
     U + 'photo-1512453979798-5ea266f8880c?w=900&q=80',
     'Burj Khalifa, a desert safari with BBQ dinner, the Dubai Frame and a Marina cruise.',
     'Burj Khalifa At The Top|Desert safari + BBQ|Marina dhow cruise|5-star downtown stay',
     'international', 'hot', 4.9, 302, '5★ Downtown'],

    ['TR-004', 'Sajek Valley Adventure Trek', 'adventure', 'Sajek, Rangamati', 3, 2, 8500, 25,
     U + 'photo-1464822759023-fed622ff2c3b?w=900&q=80',
     'Above the clouds in the Kasalong range, with sunrise at Konglak Para.',
     'Konglak Para sunrise|Lusai village visit|Open-jeep ride|Hill resort stay',
     'domestic', 'new', 4.6, 141, 'Hill Resort'],

    ['TR-005', 'Turkey Istanbul & Cappadocia', 'international', 'Istanbul & Cappadocia, Türkiye', 10, 9, 120000, 18,
     U + 'photo-1570939274717-7eda259b50ed?w=900&q=80',
     'Hagia Sophia, the Blue Mosque and the Grand Bazaar, then a hot-air balloon over Cappadocia.',
     'Hagia Sophia & Blue Mosque|Bosphorus cruise|Cappadocia balloon ride|Cave hotel night',
     'international', 'limited', 4.9, 96, '4★ + Cave Hotel'],

    ['TR-006', 'Maldives Honeymoon Paradise', 'honeymoon', 'Malé Atoll, Maldives', 6, 5, 150000, 2,
     U + 'photo-1514282401047-d79a71a590e8?w=900&q=80',
     'An overwater villa, a candlelit sandbank dinner and snorkelling on the house reef.',
     'Water villa|Sandbank dinner|Snorkelling|Sunset dolphin cruise',
     'international', 'limited', 5.0, 78, '5★ Water Villa'],

    ['TR-007', 'Sundarbans Wildlife Safari', 'adventure', 'Sundarbans, Khulna', 3, 2, 9500, 30,
     U + 'photo-1441974231531-c6227db76b6e?w=900&q=80',
     'Three days aboard a river launch through the largest mangrove forest on earth.',
     'Launch stay with meals|Karamjal & Kotka|Jamtola Beach|Forest guide & guard',
     'domestic', 'hot', 4.7, 187, 'Launch (on board)'],

    ['TR-008', 'Bali Romantic Honeymoon', 'honeymoon', 'Bali, Indonesia', 8, 7, 95000, 2,
     U + 'photo-1537996194471-e657df975ab4?w=900&q=80',
     'Ubud rice terraces, a private pool villa in Seminyak and a day trip to Nusa Penida.',
     'Private pool villa|Ubud & Tegallalang|Nusa Penida day trip|Couple spa',
     'international', 'new', 4.8, 133, '4★ Villa + Pool'],

    ['TR-009', 'Bandarban Hill Tracts Tour', 'domestic', 'Bandarban, Chattogram', 4, 3, 10000, 22,
     U + 'photo-1506905925346-21bda4d32df4?w=900&q=80',
     'Nilgiri, Nilachal, Boga Lake and the Chimbuk range, plus a boat ride on the Sangu river.',
     'Nilgiri & Nilachal|Boga Lake|Chimbuk range|Sangu river boat ride',
     'domestic', 'hot', 4.6, 158, 'Hill Resort'],

    ['TR-010', 'Sylhet Tea Garden Retreat', 'domestic', 'Sylhet & Sreemangal', 3, 2, 9000, 20,
     U + 'photo-1582650625119-3a31f8fa2699?w=900&q=80',
     'Lawachara rainforest, seven-layer tea, Ratargul swamp forest and Jaflong.',
     'Tea garden walk|Lawachara forest|Ratargul boat ride|Jaflong',
     'domestic', 'new', 4.5, 112, '3★ Resort'],

    ['TR-011', 'Singapore City Tour', 'international', 'Singapore', 5, 4, 68000, 18,
     U + 'photo-1525625293386-3f8f99389edd?w=900&q=80',
     'Gardens by the Bay, Sentosa and Universal Studios, the Night Safari and the Singapore Flyer.',
     'Gardens by the Bay|Universal Studios|Night Safari|Singapore Flyer',
     'international', 'new', 4.7, 124, '4★ Central'],

    ['TR-012', "Cox's Bazar + Bandarban Combo", 'group', "Cox's Bazar & Bandarban", 7, 6, 18500, 35,
     U + 'photo-1519046904884-53103b34b206?w=900&q=80',
     "Four days on the Cox's Bazar coast, then up into the Bandarban hill tracks. Built for groups.",
     'Beach + hills in one trip|Group transport|Corporate-friendly|Guide throughout',
     'domestic', 'hot', 4.8, 96, '3★ Beach + Hill']
  ];

  var rows = tours.map(function (t) {
    return rowFromObject_(HEADERS.TOURS, {
      ID: t[0], Tour_Name: t[1], Category: t[2], Destination: t[3],
      Duration_Days: t[4], Duration_Nights: t[5], Price_Per_Person: t[6], Max_Persons: t[7],
      Status: 'Active', Thumbnail_URL: t[8], Description: t[9], Highlights: t[10],
      Created_Date: now, Region: t[11], Badge: t[12], Rating: t[13], Reviews: t[14], Hotel: t[15]
    });
  });

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/** Read the Settings sheet into a plain object. */
function getSettings() {
  var sheet = getSS_().getSheetByName(SHEETS.SETTINGS);
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
      case 'update_status':
        if (data.token !== ADMIN_TOKEN) return json_({ success: false, error: 'Unauthorized' });
        return json_(handleStatusUpdate(data));
      default:              return json_({ success: false, error: 'Unknown type' });
    }
  } catch (err) {
    Logger.log('doPost error: ' + err);
    return json_({ success: false, error: 'Server error. Please try WhatsApp.' });
  }
}

function handleInquiry(raw) {
  var data = {
    tour_name:   clean_(raw.tour_name, 150),
    tour_id:     clean_(raw.tour_id, 20),
    name:        clean_(raw.name, 80),
    phone:       normalizePhone_(raw.phone),
    email:       clean_(raw.email, 120),
    travel_date: clean_(raw.travel_date, 20),
    persons:     Math.min(Math.max(parseInt(raw.persons, 10) || 1, 1), 100),
    message:     clean_(raw.message, 2000)
  };

  var problem = validate_(data, true);
  if (problem) return { success: false, error: problem };

  var id = appendWithId_(SHEETS.INQUIRIES, 'INQ-', function (id) {
    return [
      id, new Date(), 'inquiry', data.tour_name, data.name, asText_(data.phone),
      data.email, data.travel_date, data.persons, data.message, 'Pending', ''
    ];
  });

  // Emails must never break the submission — the row is already saved.
  try { sendConfirmationEmail(data, id); } catch (err) { Logger.log('customer email failed: ' + err); }
  try { sendAdminAlert(data, id, 'inquiry'); } catch (err) { Logger.log('admin email failed: ' + err); }

  return { success: true, id: id, message: 'Inquiry received!' };
}

function handleContact(raw) {
  var data = {
    name:    clean_(raw.name, 80),
    phone:   normalizePhone_(raw.phone),
    email:   clean_(raw.email, 120),
    subject: clean_(raw.subject, 120) || 'General',
    tour:    clean_(raw.tour, 150),
    message: clean_(raw.message, 3000)
  };

  var problem = validate_(data, false);
  if (problem) return { success: false, error: problem };

  var id = appendWithId_(SHEETS.CONTACTS, 'MSG-', function (id) {
    return rowFromObject_(HEADERS.CONTACTS, {
      ID: id, Timestamp: new Date(), Name: data.name, Phone: asText_(data.phone), Email: data.email,
      Subject: data.subject, Message: data.message, Status: 'New', Tour: data.tour
    });
  });

  try { sendConfirmationEmail(data, id); } catch (err) { Logger.log('customer email failed: ' + err); }
  try { sendAdminAlert(data, id, 'contact'); } catch (err) { Logger.log('admin email failed: ' + err); }

  return { success: true, id: id, message: 'Message received!' };
}

/** Update the Status column for an INQ-/MSG- row from the admin dashboard. */
function handleStatusUpdate(data) {
  var id = String(data.id || '');
  var status = String(data.status || '');
  if (!id || !status) return { success: false, error: 'id and status are required.' };

  var isInquiry = id.indexOf('INQ-') === 0;
  var allowed = isInquiry ? INQUIRY_STATUSES : CONTACT_STATUSES;
  if (allowed.indexOf(status) === -1) return { success: false, error: 'Invalid status: ' + status };

  var sheet = getSheet_(isInquiry ? SHEETS.INQUIRIES : SHEETS.CONTACTS);
  if (sheet.getLastRow() < 2) return { success: false, error: 'ID not found: ' + id };

  var statusCol = headerIndex_(sheet, 'Status') + 1;
  var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();

  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) {
      sheet.getRange(i + 2, statusCol).setValue(status);
      return { success: true, id: id, status: status };
    }
  }
  return { success: false, error: 'ID not found: ' + id };
}


/* ══════════════════════════════════════════════════════════════════
   3. EMAILS   (every visitor-supplied value goes through esc_())
   ══════════════════════════════════════════════════════════════════ */

function sendConfirmationEmail(data, id) {
  if (!isEmail_(data.email)) return;

  var s = getSettings();
  var company = s.company_name || 'TRM Holidays';
  var wa = String(s.whatsapp_number || '8801805041111').replace(/\D/g, '');
  var phone = s.phone || '01805041111';
  var address = s.address || '';

  var rows = '';
  function row(label, value) {
    if (!value) return '';
    return '<tr>' +
      '<td style="padding:9px 14px;border-bottom:1px solid #eef2f8;color:#8A9BB5;font-size:13px">' + label + '</td>' +
      '<td style="padding:9px 14px;border-bottom:1px solid #eef2f8;color:#1A2340;font-size:13px;font-weight:600">' + esc_(value) + '</td>' +
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
        '<h1 style="color:#fff;margin:0;font-size:22px">' + esc_(company) + '</h1>' +
        '<p style="color:#7BB8F0;margin:4px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase">Your Memory Maker</p>' +
      '</div>' +

      '<div style="padding:26px">' +
        '<p style="font-size:15px;color:#1A2340;margin:0 0 10px">Dear ' + esc_(data.name) + ',</p>' +
        '<p style="font-size:14px;color:#42506E;line-height:1.7;margin:0 0 20px">' +
          'Thank you for contacting ' + esc_(company) + '. We have received your request and one of our ' +
          'travel consultants will get back to you within 2 hours during office hours.' +
        '</p>' +

        '<table style="width:100%;border-collapse:collapse;border:1px solid #eef2f8;border-radius:8px">' + rows + '</table>' +

        '<div style="text-align:center;margin:24px 0 10px">' +
          '<a href="https://wa.me/' + wa + '" style="display:inline-block;background:#25D366;color:#fff;' +
             'text-decoration:none;padding:13px 30px;border-radius:9px;font-weight:bold;font-size:14px">' +
             'Chat with us on WhatsApp</a>' +
        '</div>' +

        '<p style="font-size:13px;color:#8A9BB5;text-align:center;margin:0">' +
          'Need us sooner? Call <b style="color:' + NAVY + '">' + esc_(phone) + '</b>' +
        '</p>' +
      '</div>' +

      '<div style="background:#111D4F;padding:18px;text-align:center;color:rgba(255,255,255,.72);font-size:12px">' +
        '<p style="margin:0 0 4px">' + esc_(company) + ' — Your Memory Maker</p>' +
        (address ? '<p style="margin:0 0 4px">' + esc_(address) + '</p>' : '') +
        '<p style="margin:0">Phone / WhatsApp: ' + esc_(phone) + '</p>' +
      '</div>' +

    '</div>' +
  '</div>';

  var options = { htmlBody: html, name: company };
  var replyTo = s.reply_email;
  if (isEmail_(replyTo) && String(replyTo).indexOf('REPLACE_WITH') !== 0) options.replyTo = replyTo;

  MailApp.sendEmail(data.email, company + ' — we received your request (' + id + ')', '', options);
}

function sendAdminAlert(data, id, type) {
  var s = getSettings();
  var admin = s.admin_email;

  // Nothing to send to until the Settings sheet is filled in
  if (!admin || String(admin).indexOf('REPLACE_WITH') === 0) return;

  var rows = '';
  for (var key in data) {
    if (!data.hasOwnProperty(key) || data[key] === '' || data[key] == null) continue;
    rows +=
      '<tr>' +
        '<td style="padding:8px 12px;border:1px solid #e4ebf6;background:#F4F7FC;font-size:13px">' + esc_(key) + '</td>' +
        '<td style="padding:8px 12px;border:1px solid #e4ebf6;font-size:13px">' + esc_(data[key]) + '</td>' +
      '</tr>';
  }

  var label = (type === 'inquiry' ? 'Tour inquiry' : 'Contact message');
  var subject = 'New ' + label + ': ' + data.name +
                (data.tour_name ? ' — ' + data.tour_name : '') + ' [' + id + ']';

  // 017XXXXXXXX → 88017XXXXXXXX for wa.me
  var digits = String(data.phone || '').replace(/\D/g, '');
  var waNumber = digits.indexOf('88') === 0 ? digits : '88' + digits;

  var html =
  '<div style="font-family:Arial,Helvetica,sans-serif">' +
    '<h2 style="color:' + NAVY + ';margin:0 0 4px">New ' + label + '</h2>' +
    '<p style="color:#8A9BB5;margin:0 0 16px;font-size:13px">Reference ' + id + '</p>' +
    '<table style="border-collapse:collapse;width:100%;max-width:560px">' + rows + '</table>' +
    (digits
      ? '<p style="margin-top:18px">' +
          '<a href="tel:' + digits + '" style="background:' + NAVY + ';color:#fff;text-decoration:none;' +
             'padding:10px 20px;border-radius:8px;font-size:13px;margin-right:8px">Call customer</a>' +
          '<a href="https://wa.me/' + waNumber + '" style="background:#25D366;color:#fff;text-decoration:none;' +
             'padding:10px 20px;border-radius:8px;font-size:13px">WhatsApp</a>' +
        '</p>'
      : '') +
  '</div>';

  var options = { htmlBody: html };
  if (isEmail_(data.email)) options.replyTo = data.email;   // hit Reply to answer the customer

  MailApp.sendEmail(admin, subject, '', options);
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
        return json_(getTours_(p.category, p.region));

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
            address: s.address || '',
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
    Logger.log('doGet error: ' + err);
    return json_({ success: false, error: String(err.message || err) });
  }
}

/** Active tours, shaped exactly like the objects in assets/js/tours-data.js */
function getTours_(category, region) {
  var rows = readObjects_(SHEETS.TOURS);
  var out = [];

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r.ID) continue;                                         // blank row
    if (String(r.Status).trim().toLowerCase() !== 'active') continue;

    var tour = rowToTour_(r);
    if (category && tour.category !== String(category).toLowerCase()) continue;
    if (region && tour.region !== String(region).toLowerCase()) continue;
    out.push(tour);
  }

  return { success: true, data: out, count: out.length };
}

function getTour_(id) {
  if (!id) return { success: false, error: 'Tour not found' };
  var rows = readObjects_(SHEETS.TOURS);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].ID) === String(id) &&
        String(rows[i].Status).trim().toLowerCase() === 'active') {
      return { success: true, tour: rowToTour_(rows[i]) };
    }
  }
  return { success: false, error: 'Tour not found: ' + id };
}

function rowToTour_(r) {
  var category = String(r.Category || '').trim().toLowerCase();
  var region = String(r.Region || '').trim().toLowerCase();
  if (region !== 'domestic' && region !== 'international') {
    region = DOMESTIC_CATEGORIES.indexOf(category) !== -1 ? 'domestic' : 'international';
  }

  var max = Number(r.Max_Persons) || 0;
  return {
    id: String(r.ID),
    name: r.Tour_Name,
    category: category,
    region: region,
    destination: r.Destination,
    days: Number(r.Duration_Days) || 0,
    nights: Number(r.Duration_Nights) || 0,
    price: Number(r.Price_Per_Person) || 0,
    people: max > 2 ? ('2-' + max) : (max ? String(max) : '2-15'),
    status: r.Status,
    img: r.Thumbnail_URL,
    desc: r.Description,
    highlights: r.Highlights ? String(r.Highlights).split('|').map(function (h) { return h.trim(); }) : [],
    badge: String(r.Badge || '').trim().toLowerCase(),
    rating: Number(r.Rating) || 4.7,
    reviews: Number(r.Reviews) || 0,
    hotel: r.Hotel || 'As per itinerary'
  };
}

/** Sheet dump for the admin dashboard, newest first. */
function getAdminRows_(sheetName) {
  var rows = readObjects_(sheetName);
  var tz = Session.getScriptTimeZone();
  var out = [];

  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (!r.ID) continue;

    var stamp = r.Timestamp instanceof Date
      ? Utilities.formatDate(r.Timestamp, tz, 'yyyy-MM-dd HH:mm')
      : String(r.Timestamp);

    if (sheetName === SHEETS.INQUIRIES) {
      out.push({
        id: r.ID, date: stamp, type: r.Type, tour: r.Tour_Name, name: r.Customer_Name,
        phone: String(r.Phone), email: r.Email, travel_date: formatMaybeDate_(r.Travel_Date, tz),
        persons: r.Persons, message: r.Message, status: r.Status || 'Pending', notes: r.Agent_Notes
      });
    } else {
      out.push({
        id: r.ID, date: stamp, name: r.Name, phone: String(r.Phone), email: r.Email,
        subject: r.Subject, tour: r.Tour || '', message: r.Message, status: r.Status || 'New'
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

/** Every row of a sheet as {Header: value} objects — column order doesn't matter. */
function readObjects_(sheetName) {
  var sheet = getSheet_(sheetName);
  if (sheet.getLastRow() < 2) return [];

  var values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) if (headers[c]) obj[headers[c]] = values[i][c];
    out.push(obj);
  }
  return out;
}

/** Build a row in the sheet's header order from an object. */
function rowFromObject_(headers, obj) {
  return headers.map(function (h) { return obj.hasOwnProperty(h) ? obj[h] : ''; });
}

function headerIndex_(sheet, name) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  var i = headers.indexOf(name);
  if (i === -1) throw new Error('Column "' + name + '" missing in ' + sheet.getName());
  return i;
}

/**
 * Append a row under a script lock, so two visitors submitting in the same
 * second can't get the same reference number. For the Contacts sheet the
 * row is re-ordered to match whatever column order the sheet actually has.
 */
function appendWithId_(sheetName, prefix, buildRow) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_(sheetName);
    var id = prefix + Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyMMdd') + '-' +
             Utilities.getUuid().slice(0, 4).toUpperCase();

    var row = buildRow(id);
    if (sheetName === SHEETS.CONTACTS) {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
        .map(function (h) { return String(h).trim(); });
      row = headers.map(function (h) {
        var i = HEADERS.CONTACTS.indexOf(h);
        return i === -1 ? '' : row[i];
      });
    }
    sheet.appendRow(row);
    return id;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Trim, cap length, and neutralise spreadsheet formulas. A value like
 * =IMPORTXML(...) typed into a form would otherwise run as a formula
 * when the row is opened in Sheets.
 */
function clean_(value, maxLen) {
  var s = (value == null ? '' : String(value)).trim().slice(0, maxLen || 500);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/** Force Sheets to keep a value as text — otherwise 01805041111 loses its leading 0. */
function asText_(value) {
  return value ? "'" + value : '';
}

/** Bangladeshi mobile → 01XXXXXXXXX (accepts +880 / 880 / spaces / dashes). */
function normalizePhone_(value) {
  var d = String(value == null ? '' : value).replace(/\D/g, '');
  if (d.indexOf('880') === 0) d = d.slice(2);
  return d.slice(0, 15);
}

function isEmail_(v) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v || ''));
}

/** Returns an error message, or '' when the submission is OK. */
function validate_(data, phoneRequired) {
  if (!data.name || data.name.length < 3) return 'Please enter your name.';
  if (!isEmail_(data.email)) return 'Please enter a valid email address.';
  if (phoneRequired && !/^01\d{9}$/.test(data.phone)) return 'Please enter an 11-digit mobile number starting with 01.';
  if (!phoneRequired && data.phone && !/^01\d{9}$/.test(data.phone)) return 'Please enter an 11-digit mobile number starting with 01.';
  return '';
}

/** HTML-escape for email bodies. */
function esc_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Run this from the editor after setup to confirm everything is wired up. */
function testApi() {
  Logger.log(JSON.stringify(getTours_()).slice(0, 500));
  Logger.log(JSON.stringify(getSettings()));
  Logger.log(JSON.stringify(handleContact({
    type: 'contact', name: 'Test User', email: 'test@example.com',
    phone: '01805041111', subject: 'Test', message: 'This is a test message from testApi().'
  })));
}
