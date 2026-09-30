/* ==========================================================================
   TRM HOLIDAYS — Shared site JavaScript
   Config, navbar, mobile menu, loader, back-to-top, API helper, validation
   ========================================================================== */

/* ---------------------------------------------------------------
   CONFIG — edit these in ONE place, every page picks them up.
   After deploying your Apps Script Web App, paste its URL below.
   --------------------------------------------------------------- */
const TRM = {
  API_URL:   'https://script.google.com/macros/s/AKfycbwek1__YzRD7Kgn4nXth-l9MOCv7bFdjHVnEFNLyZHj88s0iuvipWeRYcBGdzyNlpf8/exec',

  // No admin token here — this file is public. admin.html sends the password
  // typed at login, and Code.gs checks it against its own ADMIN_TOKEN.

  PHONE:      '01805041111',                            // shown on the site
  PHONE_INTL: '8801805041111',                          // used for wa.me links
  EMAIL:      'trmholidays@gmail.com',                  // as printed on the business cards
  EMAIL2:     '',                                       // optional second inbox; empty = hidden
  ADDRESS:    'House 32, Road 17/A, Block E, Banani, Dhaka 1213',
  MAP_QUERY:  'House 32, Road 17/A, Block E, Banani, Dhaka 1213, Bangladesh',

  // Leave a link empty and its icon/button is hidden everywhere
  FACEBOOK:  'https://www.facebook.com/trmholidaysbd',
  INSTAGRAM: '',
  YOUTUBE:   '',
  TIKTOK:    '',

  HOURS: 'Sat–Thu 9:00 AM – 8:00 PM · Fri 2:00 PM – 8:00 PM',
  CURRENCY: 'BDT'
};

TRM.WA = 'https://wa.me/' + TRM.PHONE_INTL;
TRM.TEL = 'tel:+' + TRM.PHONE_INTL;

/** Pre-filled WhatsApp link with a message. */
TRM.waLink = function (msg) {
  return TRM.WA + (msg ? '?text=' + encodeURIComponent(msg) : '');
};

/**
 * Domestic vs international. Tours carry an explicit `region`; older data
 * (or a sheet row with the Region cell left blank) falls back on category.
 */
TRM.DOMESTIC_CATEGORIES = ['domestic', 'adventure', 'group'];
TRM.regionOf = function (t) {
  const r = String(t.region || '').toLowerCase();
  if (r === 'domestic' || r === 'international') return r;
  return TRM.DOMESTIC_CATEGORIES.indexOf(String(t.category).toLowerCase()) !== -1
    ? 'domestic' : 'international';
};

/** Format a number as "12,500" (Bangladeshi grouping kept simple/international). */
TRM.money = function (n) {
  return Number(n || 0).toLocaleString('en-US');
};

/* ---------------------------------------------------------------
   Fill contact placeholders across the page
   Usage: <a data-trm="wa">, <a data-trm="tel">, <span data-trm="phone">
   --------------------------------------------------------------- */
function fillContactInfo() {
  // Optional details: hide the element (or its <li>) when the value is empty
  const OPTIONAL = { email2: 'EMAIL2', facebook: 'FACEBOOK', instagram: 'INSTAGRAM', youtube: 'YOUTUBE', tiktok: 'TIKTOK' };

  document.querySelectorAll('[data-trm]').forEach(function (el) {
    const key = OPTIONAL[el.dataset.trm];
    if (key && !TRM[key]) {
      const holder = el.closest('li') || (el.parentElement.tagName === 'P' ? el.parentElement : el);
      holder.style.display = 'none';
      return;
    }
    switch (el.dataset.trm) {
      case 'wa':        el.href = TRM.waLink(el.dataset.msg || ''); break;
      case 'tel':       el.href = TRM.TEL; break;
      case 'phone':     el.textContent = TRM.PHONE; break;
      case 'phone-tel': el.href = TRM.TEL; el.textContent = TRM.PHONE; break;
      case 'email':     el.href = 'mailto:' + TRM.EMAIL; el.textContent = TRM.EMAIL; break;
      case 'email2':    el.href = 'mailto:' + TRM.EMAIL2; el.textContent = TRM.EMAIL2; break;
      case 'address':   el.textContent = TRM.ADDRESS; break;
      case 'map':       el.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(TRM.MAP_QUERY) + '&z=16&output=embed'; break;
      case 'map-link':  el.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(TRM.MAP_QUERY); break;
      case 'hours':     el.textContent = TRM.HOURS; break;
      case 'facebook':  el.href = TRM.FACEBOOK; break;
      case 'instagram': el.href = TRM.INSTAGRAM; break;
      case 'youtube':   el.href = TRM.YOUTUBE; break;
      case 'tiktok':    el.href = TRM.TIKTOK; break;
    }
  });
}

/* ---------------------------------------------------------------
   Navbar: transparent -> solid on scroll
   --------------------------------------------------------------- */
function initNavbar() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  // Inner pages start solid (no hero image behind the bar)
  const alwaysSolid = nav.classList.contains('solid');

  function onScroll() {
    if (alwaysSolid) return;
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------------------------------------------------------------
   Mobile menu overlay
   --------------------------------------------------------------- */
function initMobileMenu() {
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  if (!burger || !menu) return;

  const icon = burger.querySelector('i');

  function setOpen(open) {
    menu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    burger.setAttribute('aria-expanded', String(open));
    if (icon) icon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  }

  burger.addEventListener('click', function () {
    setOpen(!menu.classList.contains('open'));
  });

  // Close on link click
  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
}

/* ---------------------------------------------------------------
   Page loader + back to top
   --------------------------------------------------------------- */
function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;
  window.addEventListener('load', function () {
    setTimeout(function () { loader.classList.add('hide'); }, 1200);
  });
  // Safety net: never trap the user behind the loader
  setTimeout(function () { loader.classList.add('hide'); }, 4000);
}

function initTopBtn() {
  const btn = document.getElementById('topBtn');
  if (!btn) return;
  window.addEventListener('scroll', function () {
    btn.classList.toggle('show', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------------------------------------------------------------
   Date inputs: never allow a past date
   --------------------------------------------------------------- */
function initMinDates() {
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(function (input) {
    if (!input.min) input.min = today;
  });
}

/* ---------------------------------------------------------------
   Toast notifications
   --------------------------------------------------------------- */
function toast(message, type) {
  let el = document.getElementById('trmToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'trmToast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(el._t);
  el._t = setTimeout(function () { el.className = 'toast'; }, 3800);
}

/* ---------------------------------------------------------------
   API helpers (Google Apps Script Web App)
   --------------------------------------------------------------- */
TRM.isApiConfigured = function () {
  return TRM.API_URL && TRM.API_URL.indexOf('YOUR_APPSCRIPT') === -1;
};

/** GET  e.g. TRM.apiGet('get_tours', {category:'domestic'}) */
TRM.apiGet = async function (action, params) {
  if (!TRM.isApiConfigured()) throw new Error('API_URL not configured');
  const qs = new URLSearchParams(Object.assign({ action: action }, params || {}));
  const res = await fetch(TRM.API_URL + '?' + qs.toString());
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
};

/** POST — Apps Script needs text/plain to avoid a CORS preflight. */
TRM.apiPost = async function (payload) {
  if (!TRM.isApiConfigured()) throw new Error('API_URL not configured');
  const res = await fetch(TRM.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
};

/* ---------------------------------------------------------------
   Flight search: Round Trip / One Way / Multi City
   Shared by the homepage widget and flights.html. The form needs:
     #fromCity #toCity #departDate #returnDateField/#returnDate #paxSel,
     single-route fields marked .single-only, an empty .multi-legs box,
     and trip radios (name="trip") somewhere inside `scope`.
   --------------------------------------------------------------- */
TRM.esc = function (v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

TRM.niceDate = function (iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

function initFlightSearch(form, scope) {
  const MIN_LEGS = 2, MAX_LEGS = 5;
  const $ = id => form.querySelector('#' + id);
  const box = form.querySelector('.multi-legs');
  const radios = (scope || form).querySelectorAll('input[name="trip"]');
  const today = new Date().toISOString().split('T')[0];
  let legs = [];

  function trip() {
    const r = [...radios].find(x => x.checked);
    return r ? r.value : 'round';
  }

  function readLegs() {
    box.querySelectorAll('.leg-row').forEach((row, i) => {
      legs[i] = {
        from: row.querySelector('.leg-from').value.trim(),
        to:   row.querySelector('.leg-to').value.trim(),
        date: row.querySelector('.leg-date').value
      };
    });
    return legs;
  }

  function render() {
    box.innerHTML = legs.map((l, i) =>
      '<div class="leg-row">' +
        '<span class="leg-no">Flight ' + (i + 1) + '</span>' +
        '<div class="sf"><label>From</label><input type="text" class="leg-from" value="' + TRM.esc(l.from) + '" placeholder="City or airport"></div>' +
        '<div class="sf"><label>To</label><input type="text" class="leg-to" value="' + TRM.esc(l.to) + '" placeholder="City or airport"></div>' +
        '<div class="sf"><label>Date</label><input type="date" class="leg-date" value="' + TRM.esc(l.date) + '"></div>' +
        (legs.length > MIN_LEGS
          ? '<button type="button" class="leg-remove" data-i="' + i + '" aria-label="Remove flight ' + (i + 1) + '"><i class="fa-solid fa-xmark"></i></button>'
          : '<span class="leg-remove-spacer"></span>') +
      '</div>'
    ).join('') +
    (legs.length < MAX_LEGS
      ? '<button type="button" class="leg-add"><i class="fa-solid fa-plus"></i> Add another flight</button>'
      : '<p class="leg-note">Up to ' + MAX_LEGS + ' flights. Need more? Tell us on WhatsApp.</p>');
    chainDates();
  }

  /* Each flight can't depart before the one before it */
  function chainDates() {
    let min = today;
    box.querySelectorAll('.leg-date').forEach(input => {
      input.min = min;
      if (input.value && input.value < min) input.value = min;
      if (input.value) min = input.value;
    });
  }

  box.addEventListener('click', e => {
    if (e.target.closest('.leg-add')) {
      readLegs();
      const last = legs[legs.length - 1] || {};
      legs.push({ from: last.to || '', to: '', date: '' });
      render();
      const rows = box.querySelectorAll('.leg-row');
      rows[rows.length - 1].querySelector(last.to ? '.leg-to' : '.leg-from').focus();
    }
    const rm = e.target.closest('.leg-remove');
    if (rm) {
      readLegs();
      legs.splice(+rm.dataset.i, 1);
      render();
    }
  });

  box.addEventListener('change', e => {
    // Next flight usually starts where this one lands
    if (e.target.matches('.leg-to')) {
      const rows = [...box.querySelectorAll('.leg-row')];
      const next = rows[rows.indexOf(e.target.closest('.leg-row')) + 1];
      if (next && !next.querySelector('.leg-from').value.trim()) {
        next.querySelector('.leg-from').value = e.target.value.trim();
      }
    }
    if (e.target.matches('.leg-date')) chainDates();
  });

  function setTrip(value) {
    if (form.classList.contains('is-multi')) readLegs();   // keep typed legs when switching away and back
    radios.forEach(r => { r.checked = r.value === value; });
    form.classList.toggle('is-multi', value === 'multi');
    $('returnDateField').style.display = value === 'round' ? '' : 'none';

    if (value === 'multi' && !legs.length) {
      const from = $('fromCity').value.trim(), to = $('toCity').value.trim();
      legs = [
        { from: from, to: to, date: $('departDate').value },
        { from: to, to: '', date: '' }
      ];
    }
    if (value === 'multi') render();
  }

  radios.forEach(r => r.addEventListener('change', () => setTrip(r.value)));

  /** Returns an error message, or '' when the search is complete enough. */
  function validate() {
    if (trip() !== 'multi') {
      if (!$('fromCity').value.trim() || !$('toCity').value.trim()) return 'Please enter where you are flying from and to.';
      if ($('fromCity').value.trim().toLowerCase() === $('toCity').value.trim().toLowerCase()) return '"From" and "To" are the same.';
      if (trip() === 'round' && $('departDate').value && $('returnDate').value &&
          $('returnDate').value < $('departDate').value) return 'Return date must be after departure.';
      return '';
    }
    const list = readLegs();
    for (let i = 0; i < list.length; i++) {
      const l = list[i], n = 'Flight ' + (i + 1);
      if (!l.from || !l.to) return n + ': please enter both cities.';
      if (l.from.toLowerCase() === l.to.toLowerCase()) return n + ': "From" and "To" are the same.';
      if (!l.date) return n + ': please pick a date.';
      if (i && l.date < list[i - 1].date) return n + ' departs before flight ' + i + '.';
    }
    return '';
  }

  function toQuery() {
    const qs = new URLSearchParams({ trip: trip(), pax: $('paxSel').value });
    if (trip() === 'multi') {
      readLegs().forEach(l => qs.append('leg', [l.from, l.to, l.date].join('|')));
    } else {
      qs.set('from', $('fromCity').value.trim());
      qs.set('to', $('toCity').value.trim());
      if ($('departDate').value) qs.set('depart', $('departDate').value);
      if (trip() === 'round' && $('returnDate').value) qs.set('return', $('returnDate').value);
    }
    return qs;
  }

  function fromQuery(qs) {
    if (qs.get('pax')) $('paxSel').value = qs.get('pax');
    if (qs.get('from')) $('fromCity').value = qs.get('from');
    if (qs.get('to')) $('toCity').value = qs.get('to');
    if (qs.get('depart')) $('departDate').value = qs.get('depart');
    if (qs.get('return')) $('returnDate').value = qs.get('return');

    const raw = qs.getAll('leg').map(s => s.split('|'));
    if (raw.length) legs = raw.map(p => ({ from: p[0] || '', to: p[1] || '', date: p[2] || '' }));
    while (legs.length && legs.length < MIN_LEGS) legs.push({ from: legs[legs.length - 1].to, to: '', date: '' });

    const t = qs.get('trip');
    setTrip(t === 'oneway' || t === 'multi' ? t : 'round');
  }

  setTrip(trip());
  return { trip: trip, legs: () => readLegs().slice(), validate: validate, toQuery: toQuery, fromQuery: fromQuery, setTrip: setTrip };
}

/* ---------------------------------------------------------------
   Form validation (Bangladesh rules)
   --------------------------------------------------------------- */
const TRMValidate = {
  name:    function (v) { return v.trim().length >= 3 || 'Please enter at least 3 characters.'; },
  phone:   function (v) { return /^01\d{9}$/.test(v.trim().replace(/[\s-]/g, '')) || 'Enter an 11-digit number starting with 01.'; },
  email:   function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) || 'Enter a valid email address.'; },
  message: function (v) { return v.trim().length >= 10 || 'Please write at least 10 characters.'; },
  required:function (v) { return v.trim().length > 0 || 'This field is required.'; }
};

/**
 * Wire inline validation onto a form.
 * Mark inputs with data-rule="name|phone|email|message|required".
 * Returns true when every rule passes.
 */
function validateForm(form) {
  let valid = true;
  form.querySelectorAll('[data-rule]').forEach(function (input) {
    if (!checkField(input)) valid = false;
  });
  return valid;
}

function checkField(input) {
  const rule = TRMValidate[input.dataset.rule];
  if (!rule) return true;

  const field = input.closest('.field') || input.parentElement;
  const result = rule(input.value);
  const ok = result === true;

  field.classList.toggle('err', !ok);
  field.classList.toggle('ok', ok && input.value.trim() !== '');

  let msg = field.querySelector('.err-msg');
  if (!ok) {
    if (!msg) {
      msg = document.createElement('small');
      msg.className = 'err-msg';
      field.appendChild(msg);
    }
    msg.textContent = result;
  }
  return ok;
}

function initValidation() {
  document.querySelectorAll('form [data-rule]').forEach(function (input) {
    input.addEventListener('blur', function () { checkField(input); });
    input.addEventListener('input', function () {
      const field = input.closest('.field') || input.parentElement;
      if (field.classList.contains('err')) checkField(input);
    });
  });
}

/* ---------------------------------------------------------------
   Boot
   --------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  fillContactInfo();
  initNavbar();
  initMobileMenu();
  initLoader();
  initTopBtn();
  initMinDates();
  initValidation();

  if (window.AOS) {
    AOS.init({ duration: 700, once: true, offset: 80 });
  }
});
