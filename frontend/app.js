/* Shared logic for contacts.html and contact.html */
(function () {
  var KEY = 'sierra.contacts.v1';
  var DAY = 864e5;
  var STATUSES = ['Lead', 'Active', 'Past customer'];
  var SERVICES = ['HVAC', 'Lawn care', 'Garage door'];
  var PREFER = ['Text', 'Call', 'Email'];
  var memory = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function dayISO(off) { return new Date(Date.now() + off * DAY).toISOString().slice(0, 10); }
  function ago(d, h) { return new Date(Date.now() - d * DAY - (h || 0) * 36e5).toISOString(); }
  function dateOnly(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }

  function seed() {
    function c(first, last, email, phone, address, service, status, prefer, off, notes, acts) {
      return { id: uid(), first: first, last: last, email: email, phone: phone, address: address, service: service, status: status, prefer: prefer, followUp: off === null ? '' : dayISO(off), notes: notes, created: ago(90), activity: acts };
    }
    return [
      c('Maria', 'Alvarez', 'maria.alvarez@example.com', '(555) 014-2201', '412 Maple Ave', 'HVAC', 'Active', 'Text', 2, 'Carrier 3-ton AC, installed 2021. Annual tune-up every spring.', [
        { type: 'Text', text: 'Replied to the tune-up offer and asked about Saturday.', at: ago(1, 2) },
        { type: 'Job', text: 'Spring tune-up completed. Filter replaced.', at: ago(220) }]),
      c('James', 'Okafor', 'james.o@example.com', '(555) 014-2278', '88 Birch Lane', 'Garage door', 'Active', 'Call', 0, 'LiftMaster 8550 opener. Spring replaced last April.', [
        { type: 'Call', text: 'Door won’t close. Same-day visit booked.', at: ago(0, 3) }]),
      c('Priya', 'Raman', 'priya.raman@example.com', '(555) 014-2310', '23 Orchard Court', 'Lawn care', 'Active', 'Text', 5, 'Weekly mowing, April to October. Dog in backyard, so latch the gate.', [
        { type: 'Text', text: 'Rain delay. Moved Tuesday visit to Wednesday.', at: ago(6) }]),
      c('Daniel', 'Whitfield', 'dwhitfield@example.com', '(555) 014-2344', '301 Cedar St', 'HVAC', 'Lead', 'Email', -2, 'Asked for a quote on a furnace replacement.', [
        { type: 'Note', text: 'Sent quote request form. Waiting on a reply.', at: ago(4) }]),
      c('Hannah', 'Brooks', 'hannah.brooks@example.com', '(555) 014-2399', '9 Willow Way', 'Lawn care', 'Past customer', 'Email', 120, 'Season plan ended in October. Offer fall cleanup next year.', [
        { type: 'Job', text: 'Final mow of the season.', at: ago(21) }]),
      c('Tom', 'Reyes', 'tom.reyes@example.com', '(555) 014-2455', '150 Harbor Rd', 'Garage door', 'Lead', 'Call', 1, '', [
        { type: 'Call', text: 'Asked about annual maintenance pricing.', at: ago(2) }])
    ];
  }

  function all() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { if (memory) return memory; }
    var s = seed();
    persist(s);
    return s;
  }
  function persist(list) {
    memory = list;
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable: keep in memory */ }
  }
  function get(id) { return all().filter(function (c) { return c.id === id; })[0]; }
  function save(c) {
    var list = all(), i = list.findIndex(function (x) { return x.id === c.id; });
    if (i > -1) list[i] = c; else list.unshift(c);
    persist(list);
  }
  function remove(id) { persist(all().filter(function (c) { return c.id !== id; })); }

  function fullName(c) { return (c.first + ' ' + (c.last || '')).trim(); }
  function initials(c) { return ((c.first || '')[0] || '') + ((c.last || '')[0] || ''); }
  function tagClass(s) { return s === 'Lead' ? 'tag-lead' : s === 'Active' ? 'tag-active' : 'tag-past'; }
  function fmtDate(s) { return dateOnly(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function fmtStamp(iso) { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function due(c) {
    if (!c.followUp) return { text: 'Not set', late: false };
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var n = Math.round((dateOnly(c.followUp) - t) / DAY);
    if (n === 0) return { text: 'Today', late: false };
    if (n === 1) return { text: 'Tomorrow', late: false };
    if (n > 1) return { text: n < 15 ? 'In ' + n + ' days' : fmtDate(c.followUp), late: false };
    return { text: 'Overdue ' + -n + (n === -1 ? ' day' : ' days'), late: true };
  }

  /* toast */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }

  /* new / edit dialog */
  function field(id, label, control, cls) {
    return '<div class="form-group ' + (cls || '') + '"><label class="form-label" for="' + id + '">' + label + '</label>' + control + '<div class="field-error" id="' + id + '-err" role="alert"></div></div>';
  }
  function input(id, type, val, ph, extra) {
    return '<input class="form-input" id="' + id + '" type="' + type + '" value="' + esc(val) + '" placeholder="' + (ph || '') + '" ' + (extra || '') + '>';
  }
  function select(id, opts, val) {
    return '<select class="form-input" id="' + id + '">' + opts.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
  }

  function openDialog(existing, done) {
    var edit = !!existing;
    var c = existing || { service: 'HVAC', status: 'Lead', prefer: 'Text' };
    var d = document.createElement('dialog');
    d.className = 'dlg';
    d.setAttribute('aria-labelledby', 'dlg-title');
    d.innerHTML =
      '<form novalidate>' +
      '<div class="dlg-head"><div><h2 id="dlg-title">' + (edit ? 'Edit contact' : 'New contact') + '</h2>' +
      '<p>' + (edit ? 'Update the details for ' + esc(fullName(c)) + '.' : 'Add the basics now. You can fill in the rest later.') + '</p></div>' +
      '<button type="button" class="x" data-close aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="grid2">' +
      field('f-first', 'First name', input('f-first', 'text', c.first, 'Maria', 'autocomplete="off" autofocus')) +
      field('f-last', 'Last name', input('f-last', 'text', c.last, 'Alvarez', 'autocomplete="off"')) +
      field('f-email', 'Email', input('f-email', 'email', c.email, 'name@example.com', 'autocomplete="off"')) +
      field('f-phone', 'Phone', input('f-phone', 'tel', c.phone, '(555) 000-0000', 'autocomplete="off"')) +
      field('f-address', 'Address', input('f-address', 'text', c.address, 'Street, city', 'autocomplete="off"'), 'span2') +
      field('f-service', 'Service', select('f-service', SERVICES, c.service)) +
      field('f-status', 'Status', select('f-status', STATUSES, c.status)) +
      field('f-prefer', 'Preferred contact', select('f-prefer', PREFER, c.prefer)) +
      field('f-follow', 'Next follow-up', input('f-follow', 'date', c.followUp)) +
      field('f-notes', 'Notes', '<textarea class="form-input" id="f-notes" placeholder="Equipment, past repairs, gate codes">' + esc(c.notes) + '</textarea>', 'span2') +
      '</div>' +
      '<div class="dlg-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button>' +
      '<button type="submit" class="btn btn-violet">' + (edit ? 'Save changes' : 'Save contact') + '</button></div></form>';
    document.body.appendChild(d);

    function el(id) { return d.querySelector('#' + id); }
    function val(id) { return el(id).value.trim(); }
    function err(id, msg) {
      el(id).classList.toggle('has-error', !!msg);
      var e = el(id + '-err');
      e.textContent = msg || '';
      e.classList.toggle('visible', !!msg);
    }

    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
    d.addEventListener('close', function () { d.remove(); });
    d.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = false;
      err('f-first', val('f-first') ? '' : 'Enter a first name.');
      err('f-email', ''); err('f-phone', '');
      if (!val('f-first')) bad = true;
      if (!val('f-email') && !val('f-phone')) {
        err('f-email', 'Add an email or phone number so you can reach this contact.');
        el('f-phone').classList.add('has-error');
        bad = true;
      } else if (val('f-email') && !/^\S+@\S+\.\S+$/.test(val('f-email'))) {
        err('f-email', 'Enter an email like name@example.com.');
        bad = true;
      }
      if (bad) { d.querySelector('.has-error').focus(); return; }

      var o = Object.assign({}, c, {
        first: val('f-first'), last: val('f-last'), email: val('f-email'), phone: val('f-phone'),
        address: val('f-address'), service: val('f-service'), status: val('f-status'),
        prefer: val('f-prefer'), followUp: val('f-follow'), notes: val('f-notes')
      });
      if (!edit) {
        o.id = uid();
        o.created = new Date().toISOString();
        o.activity = [{ type: 'Note', text: 'Contact added.', at: o.created }];
      }
      save(o);
      d.close();
      toast(edit ? 'Changes saved' : fullName(o) + ' added');
      if (done) done(o);
    });
    d.showModal();
  }

  /* mobile nav toggle */
  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.getElementById('nav'), btn = document.getElementById('menu');
    if (nav && btn) btn.addEventListener('click', function () {
      btn.setAttribute('aria-expanded', nav.classList.toggle('open'));
    });
  });

  window.Sierra = { all: all, get: get, save: save, remove: remove, esc: esc, fullName: fullName, initials: initials, tagClass: tagClass, due: due, fmtDate: fmtDate, fmtStamp: fmtStamp, openDialog: openDialog, toast: toast, STATUSES: STATUSES, SERVICES: SERVICES };
})();
