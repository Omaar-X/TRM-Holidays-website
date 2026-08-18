/* ==========================================================================
   TRM HOLIDAYS — Shared site JavaScript
   Config, navbar, mobile menu, loader, back-to-top, API helper, validation
   ========================================================================== */

/* ---------------------------------------------------------------
   CONFIG — edit these in ONE place, every page picks them up.
   After deploying your Apps Script Web App, paste its URL below.
   --------------------------------------------------------------- */
const TRM = {
  API_URL:   'YOUR_APPSCRIPT_WEB_APP_URL_HERE',

  // Must match ADMIN_TOKEN in apps_script/Code.gs (admin.html sends it)
  ADMIN_TOKEN: 'trm-change-this-token-2026',

  PHONE:      '01805041111',                            // shown on the site
  PHONE_INTL: '8801805041111',                          // used for wa.me links
  EMAIL:      'info@trmholidays.com',                   // TODO: replace with real inbox
  ADDRESS:    'Dhaka, Bangladesh',                      // TODO: replace with full office address

  FACEBOOK:  'https://www.facebook.com/trmholidaysbd',
  INSTAGRAM: 'https://www.instagram.com/',              // TODO: replace or remove
  YOUTUBE:   'https://www.youtube.com/',                // TODO: replace or remove
  TIKTOK:    'https://www.tiktok.com/',                 // TODO: replace or remove

  HOURS: 'Sat–Thu 9:00 AM – 8:00 PM · Fri 2:00 PM – 8:00 PM',
  CURRENCY: 'BDT'
};

TRM.WA = 'https://wa.me/' + TRM.PHONE_INTL;
TRM.TEL = 'tel:+' + TRM.PHONE_INTL;

/** Pre-filled WhatsApp link with a message. */
TRM.waLink = function (msg) {
  return TRM.WA + (msg ? '?text=' + encodeURIComponent(msg) : '');
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
  document.querySelectorAll('[data-trm]').forEach(function (el) {
    switch (el.dataset.trm) {
      case 'wa':        el.href = TRM.waLink(el.dataset.msg || ''); break;
      case 'tel':       el.href = TRM.TEL; break;
      case 'phone':     el.textContent = TRM.PHONE; break;
      case 'phone-tel': el.href = TRM.TEL; el.textContent = TRM.PHONE; break;
      case 'email':     el.href = 'mailto:' + TRM.EMAIL; el.textContent = TRM.EMAIL; break;
      case 'address':   el.textContent = TRM.ADDRESS; break;
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
