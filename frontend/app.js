/* global window, document, localStorage, alert, clearTimeout, setTimeout */
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
  function uid() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function dayISO(off) {
    return new Date(Date.now() + off * DAY).toISOString().slice(0, 10);
  }
  function ago(d, h) {
    return new Date(Date.now() - d * DAY - (h || 0) * 36e5).toISOString();
  }
  function dateOnly(s) {
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function seed() {
    function c(first, last, email, phone, address, service, status, prefer, off, notes, acts) {
      return {
        id: uid(),
        first: first,
        last: last,
        email: email,
        phone: phone,
        address: address,
        service: service,
        status: status,
        prefer: prefer,
        followUp: off === null ? '' : dayISO(off),
        notes: notes,
        created: ago(90),
        activity: acts,
      };
    }
    return [
      c(
        'Maria',
        'Alvarez',
        'maria.alvarez@example.com',
        '(555) 014-2201',
        '412 Maple Ave',
        'HVAC',
        'Active',
        'Text',
        2,
        'Carrier 3-ton AC, installed 2021. Annual tune-up every spring.',
        [
          {
            type: 'Text',
            text: 'Replied to the tune-up offer and asked about Saturday.',
            at: ago(1, 2),
          },
          { type: 'Job', text: 'Spring tune-up completed. Filter replaced.', at: ago(220) },
        ],
      ),
      c(
        'James',
        'Okafor',
        'james.o@example.com',
        '(555) 014-2278',
        '88 Birch Lane',
        'Garage door',
        'Active',
        'Call',
        0,
        'LiftMaster 8550 opener. Spring replaced last April.',
        [{ type: 'Call', text: 'Door won’t close. Same-day visit booked.', at: ago(0, 3) }],
      ),
      c(
        'Priya',
        'Raman',
        'priya.raman@example.com',
        '(555) 014-2310',
        '23 Orchard Court',
        'Lawn care',
        'Active',
        'Text',
        5,
        'Weekly mowing, April to October. Dog in backyard, so latch the gate.',
        [{ type: 'Text', text: 'Rain delay. Moved Tuesday visit to Wednesday.', at: ago(6) }],
      ),
      c(
        'Daniel',
        'Whitfield',
        'dwhitfield@example.com',
        '(555) 014-2344',
        '301 Cedar St',
        'HVAC',
        'Lead',
        'Email',
        -2,
        'Asked for a quote on a furnace replacement.',
        [{ type: 'Note', text: 'Sent quote request form. Waiting on a reply.', at: ago(4) }],
      ),
      c(
        'Hannah',
        'Brooks',
        'hannah.brooks@example.com',
        '(555) 014-2399',
        '9 Willow Way',
        'Lawn care',
        'Past customer',
        'Email',
        120,
        'Season plan ended in October. Offer fall cleanup next year.',
        [{ type: 'Job', text: 'Final mow of the season.', at: ago(21) }],
      ),
      c(
        'Tom',
        'Reyes',
        'tom.reyes@example.com',
        '(555) 014-2455',
        '150 Harbor Rd',
        'Garage door',
        'Lead',
        'Call',
        1,
        '',
        [{ type: 'Call', text: 'Asked about annual maintenance pricing.', at: ago(2) }],
      ),
    ];
  }

  function all() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      if (memory) return memory;
    }
    var s = seed();
    persist(s);
    return s;
  }
  function persist(list) {
    memory = list;
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* storage unavailable: keep in memory */
    }
  }
  function get(id) {
    return all().filter(function (c) {
      return c.id === id;
    })[0];
  }
  function save(c) {
    var list = all(),
      i = list.findIndex(function (x) {
        return x.id === c.id;
      });
    if (i > -1) list[i] = c;
    else list.unshift(c);
    persist(list);
  }
  function remove(id) {
    persist(
      all().filter(function (c) {
        return c.id !== id;
      }),
    );
  }

  function fullName(c) {
    return (c.first + ' ' + (c.last || '')).trim();
  }
  function initials(c) {
    return ((c.first || '')[0] || '') + ((c.last || '')[0] || '');
  }
  function tagClass(s) {
    return s === 'Lead' ? 'tag-lead' : s === 'Active' ? 'tag-active' : 'tag-past';
  }
  function fmtDate(s) {
    return dateOnly(s).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  function fmtStamp(iso) {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  function due(c) {
    if (!c.followUp) return { text: 'Not set', late: false };
    var t = new Date();
    t.setHours(0, 0, 0, 0);
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
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('on');
    }, 2600);
  }

  /* new / edit dialog */
  function field(id, label, control, cls) {
    return (
      '<div class="form-group ' +
      (cls || '') +
      '"><label class="form-label" for="' +
      id +
      '">' +
      label +
      '</label>' +
      control +
      '<div class="field-error" id="' +
      id +
      '-err" role="alert"></div></div>'
    );
  }
  function input(id, type, val, ph, extra) {
    return (
      '<input class="form-input" id="' +
      id +
      '" type="' +
      type +
      '" value="' +
      esc(val) +
      '" placeholder="' +
      (ph || '') +
      '" ' +
      (extra || '') +
      '>'
    );
  }
  function select(id, opts, val) {
    return (
      '<select class="form-input" id="' +
      id +
      '">' +
      opts
        .map(function (o) {
          return '<option' + (o === val ? ' selected' : '') + '>' + o + '</option>';
        })
        .join('') +
      '</select>'
    );
  }

  function openDialog(existing, done) {
    var edit = !!existing;
    var c = existing || { service: 'HVAC', status: 'Lead', prefer: 'Text' };
    var d = document.createElement('dialog');
    d.className = 'dlg';
    d.setAttribute('aria-labelledby', 'dlg-title');
    d.innerHTML =
      '<form novalidate>' +
      '<div class="dlg-head"><div><h2 id="dlg-title">' +
      (edit ? 'Edit contact' : 'New contact') +
      '</h2>' +
      '<p>' +
      (edit
        ? 'Update the details for ' + esc(fullName(c)) + '.'
        : 'Add the basics now. You can fill in the rest later.') +
      '</p></div>' +
      '<button type="button" class="x" data-close aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="grid2">' +
      field(
        'f-first',
        'First name',
        input('f-first', 'text', c.first, 'Maria', 'autocomplete="off" autofocus'),
      ) +
      field(
        'f-last',
        'Last name',
        input('f-last', 'text', c.last, 'Alvarez', 'autocomplete="off"'),
      ) +
      field(
        'f-email',
        'Email',
        input('f-email', 'email', c.email, 'name@example.com', 'autocomplete="off"'),
      ) +
      field(
        'f-phone',
        'Phone',
        input('f-phone', 'tel', c.phone, '(555) 000-0000', 'autocomplete="off"'),
      ) +
      field(
        'f-address',
        'Address',
        input('f-address', 'text', c.address, 'Street, city', 'autocomplete="off"'),
        'span2',
      ) +
      field('f-service', 'Service', select('f-service', SERVICES, c.service)) +
      field('f-status', 'Status', select('f-status', STATUSES, c.status)) +
      field('f-prefer', 'Preferred contact', select('f-prefer', PREFER, c.prefer)) +
      field('f-follow', 'Next follow-up', input('f-follow', 'date', c.followUp)) +
      field(
        'f-notes',
        'Notes',
        '<textarea class="form-input" id="f-notes" placeholder="Equipment, past repairs, gate codes">' +
          esc(c.notes) +
          '</textarea>',
        'span2',
      ) +
      '</div>' +
      '<div class="dlg-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button>' +
      '<button type="submit" class="btn btn-violet">' +
      (edit ? 'Save changes' : 'Save contact') +
      '</button></div></form>';
    document.body.appendChild(d);

    function el(id) {
      return d.querySelector('#' + id);
    }
    function val(id) {
      return el(id).value.trim();
    }
    function err(id, msg) {
      el(id).classList.toggle('has-error', !!msg);
      var e = el(id + '-err');
      e.textContent = msg || '';
      e.classList.toggle('visible', !!msg);
    }

    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
    d.addEventListener('close', function () {
      d.remove();
    });
    d.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = false;
      err('f-first', val('f-first') ? '' : 'Enter a first name.');
      err('f-email', '');
      err('f-phone', '');
      if (!val('f-first')) bad = true;
      if (!val('f-email') && !val('f-phone')) {
        err('f-email', 'Add an email or phone number so you can reach this contact.');
        el('f-phone').classList.add('has-error');
        bad = true;
      } else if (val('f-email') && !/^\S+@\S+\.\S+$/.test(val('f-email'))) {
        err('f-email', 'Enter an email like name@example.com.');
        bad = true;
      }
      if (bad) {
        d.querySelector('.has-error').focus();
        return;
      }

      var o = Object.assign({}, c, {
        first: val('f-first'),
        last: val('f-last'),
        email: val('f-email'),
        phone: val('f-phone'),
        address: val('f-address'),
        service: val('f-service'),
        status: val('f-status'),
        prefer: val('f-prefer'),
        followUp: val('f-follow'),
        notes: val('f-notes'),
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

  /* post CRUD logic */
  var POST_TYPES = ['Note', 'Call', 'Text', 'Job', 'Meeting', 'Update'];

  function tagClassForType(t) {
    var k = (t || '').toLowerCase();
    if (k === 'note') return 'tag-note';
    if (k === 'call') return 'tag-call';
    if (k === 'text') return 'tag-text';
    if (k === 'job') return 'tag-job';
    if (k === 'meeting') return 'tag-meeting';
    if (k === 'update') return 'tag-update';
    return 'tag-lead';
  }

  function allPosts() {
    var contacts = all();
    var posts = [];
    var changed = false;
    contacts.forEach(function (c) {
      if (!c.activity) c.activity = [];
      c.activity.forEach(function (a, idx) {
        if (!a.id) {
          a.id = 'p_' + c.id + '_' + (Date.parse(a.at) || Date.now()) + '_' + idx;
          changed = true;
        }
        posts.push({
          id: a.id,
          contactId: c.id,
          contactName: fullName(c),
          contactInitials: initials(c),
          contactEmail: c.email || '',
          contactPhone: c.phone || '',
          type: a.type || 'Note',
          title: a.title || '',
          text: a.text || '',
          at: a.at || c.created || new Date().toISOString(),
          updatedAt: a.updatedAt || null,
        });
      });
    });
    if (changed) persist(contacts);
    return posts.sort(function (a, b) {
      return (b.at || '').localeCompare(a.at || '');
    });
  }

  function getPost(postId) {
    var posts = allPosts();
    for (var i = 0; i < posts.length; i++) {
      if (posts[i].id === postId) return posts[i];
    }
    return null;
  }

  function savePost(post) {
    var contacts = all();
    var isNew = !post.id;
    var postId = post.id || uid();
    var targetContactId = post.contactId;
    var targetContact = contacts.find(function (c) {
      return c.id === targetContactId;
    });
    if (!targetContact) return null;

    if (!isNew) {
      contacts.forEach(function (c) {
        if (c.activity) {
          var idx = c.activity.findIndex(function (a) {
            return a.id === postId;
          });
          if (idx > -1) {
            c.activity.splice(idx, 1);
          }
        }
      });
    }

    if (!targetContact.activity) targetContact.activity = [];
    var actObj = {
      id: postId,
      type: post.type || 'Note',
      title: post.title ? post.title.trim() : '',
      text: post.text ? post.text.trim() : '',
      at: post.at || new Date().toISOString(),
    };
    if (!isNew) {
      actObj.updatedAt = new Date().toISOString();
    }
    targetContact.activity.unshift(actObj);
    persist(contacts);
    return actObj;
  }

  function removePost(postId) {
    var contacts = all();
    var removed = false;
    contacts.forEach(function (c) {
      if (c.activity) {
        var before = c.activity.length;
        c.activity = c.activity.filter(function (a) {
          return a.id !== postId;
        });
        if (c.activity.length !== before) removed = true;
      }
    });
    if (removed) {
      persist(contacts);
      removeCommentsForPost(postId);
    }
    return removed;
  }

  /* Resource #3: Users & Comments (full CRUD with relationship to Posts & Users) */
  var USERS = [
    { id: 'u1', name: 'Morgan Manager', email: 'manager@example.com', role: 'manager' },
    { id: 'u2', name: 'Alex Associate', email: 'associate@example.com', role: 'associate' },
    { id: 'u3', name: 'Sam Associate', email: 'associate2@example.com', role: 'associate' },
  ];

  function getUsers() {
    return USERS.slice();
  }

  function getUser(id) {
    for (var i = 0; i < USERS.length; i++) {
      if (USERS[i].id === id) return USERS[i];
    }
    return USERS[0];
  }

  function getCurrentUser() {
    try {
      var savedId = localStorage.getItem('sierra.activeUser');
      if (savedId) {
        for (var i = 0; i < USERS.length; i++) {
          if (USERS[i].id === savedId) return USERS[i];
        }
      }
    } catch {
      /* storage unavailable */
    }
    return USERS[0];
  }

  function setCurrentUser(id) {
    try {
      localStorage.setItem('sierra.activeUser', id);
    } catch {
      /* storage unavailable */
    }
  }

  var KEY_COMMENTS = 'sierra.comments.v1';
  var commentsMemory = null;

  function seedComments(posts) {
    if (!posts || !posts.length) return [];
    var p0 = posts[0];
    var p1 = posts[1] || posts[0];
    return [
      {
        id: 'cmt_1',
        postId: p0.id,
        userId: 'u1',
        userName: 'Morgan Manager',
        userEmail: 'manager@example.com',
        userRole: 'manager',
        text: 'Priority service visit assigned to team A. Please follow up once on site.',
        at: ago(0, 2),
        updatedAt: null,
      },
      {
        id: 'cmt_2',
        postId: p0.id,
        userId: 'u2',
        userName: 'Alex Associate',
        userEmail: 'associate@example.com',
        userRole: 'associate',
        text: 'On my way now. Estimated arrival 3:15pm.',
        at: ago(0, 1),
        updatedAt: null,
      },
      {
        id: 'cmt_3',
        postId: p1.id,
        userId: 'u3',
        userName: 'Sam Associate',
        userEmail: 'associate2@example.com',
        userRole: 'associate',
        text: 'Customer requested we call 15 minutes ahead of the visit.',
        at: ago(1, 1),
        updatedAt: null,
      },
    ];
  }

  function allComments(postId) {
    var list = null;
    try {
      var raw = localStorage.getItem(KEY_COMMENTS);
      if (raw) list = JSON.parse(raw);
    } catch {
      if (commentsMemory) list = commentsMemory;
    }
    if (!list) {
      list = seedComments(allPosts());
      persistComments(list);
    }
    if (postId) {
      return list.filter(function (c) {
        return c.postId === postId;
      });
    }
    return list;
  }

  function persistComments(list) {
    commentsMemory = list;
    try {
      localStorage.setItem(KEY_COMMENTS, JSON.stringify(list));
    } catch {
      /* memory only */
    }
  }

  function getComment(id) {
    var list = allComments();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function saveComment(comment) {
    var list = allComments();
    var cId = comment.id || 'cmt_' + uid();
    var user = getUser(comment.userId);

    var existingIndex = list.findIndex(function (c) {
      return c.id === cId;
    });
    var commentObj;
    if (existingIndex > -1) {
      commentObj = list[existingIndex];
      commentObj.text = (comment.text || '').trim();
      commentObj.updatedAt = new Date().toISOString();
      if (comment.userId) {
        commentObj.userId = user.id;
        commentObj.userName = user.name;
        commentObj.userEmail = user.email;
        commentObj.userRole = user.role;
      }
      list[existingIndex] = commentObj;
    } else {
      commentObj = {
        id: cId,
        postId: comment.postId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        text: (comment.text || '').trim(),
        at: comment.at || new Date().toISOString(),
        updatedAt: null,
      };
      list.push(commentObj);
    }
    persistComments(list);
    return commentObj;
  }

  function removeComment(id) {
    var list = allComments();
    var before = list.length;
    var filtered = list.filter(function (c) {
      return c.id !== id;
    });
    persistComments(filtered);
    return filtered.length !== before;
  }

  function removeCommentsForPost(postId) {
    var list = allComments();
    var filtered = list.filter(function (c) {
      return c.postId !== postId;
    });
    persistComments(filtered);
  }

  function openPostDialog(existingPost, preselectedContactId, done) {
    var contacts = all();
    if (!contacts.length) {
      alert('Please add at least one contact before creating a post.');
      return;
    }
    var isEdit = !!existingPost;
    var selectedContactId = isEdit
      ? existingPost.contactId
      : preselectedContactId || contacts[0].id;
    var d = document.createElement('dialog');
    d.className = 'dlg';
    d.setAttribute('aria-labelledby', 'dlg-post-title');

    var contactOptions = contacts
      .map(function (c) {
        var sel = c.id === selectedContactId ? ' selected' : '';
        return (
          '<option value="' +
          esc(c.id) +
          '"' +
          sel +
          '>' +
          esc(fullName(c)) +
          (c.service ? ' (' + esc(c.service) + ')' : '') +
          '</option>'
        );
      })
      .join('');

    var typeOptions = POST_TYPES.map(function (t) {
      var sel = existingPost && existingPost.type === t ? ' selected' : '';
      return '<option value="' + esc(t) + '"' + sel + '>' + esc(t) + '</option>';
    }).join('');

    d.innerHTML =
      '<form novalidate>' +
      '<div class="dlg-head"><div><h2 id="dlg-post-title">' +
      (isEdit ? 'Edit post' : 'New post') +
      '</h2>' +
      '<p>' +
      (isEdit
        ? 'Update details for this post.'
        : 'Add a note, call log, meeting, or update for a contact.') +
      '</p></div>' +
      '<button type="button" class="x" data-close aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="grid2">' +
      field(
        'p-contact',
        'Related contact',
        '<select class="form-input" id="p-contact">' + contactOptions + '</select>',
        'span2',
      ) +
      field(
        'p-type',
        'Post type',
        '<select class="form-input" id="p-type">' + typeOptions + '</select>',
      ) +
      field(
        'p-title',
        'Title (optional)',
        input(
          'p-title',
          'text',
          existingPost ? existingPost.title : '',
          'e.g. Phone consultation',
          'autocomplete="off"',
        ),
      ) +
      field(
        'p-text',
        'Post content',
        '<textarea class="form-input" id="p-text" placeholder="Write post details, notes, or conversation summary..." rows="4" style="min-height:90px">' +
          esc(existingPost ? existingPost.text : '') +
          '</textarea>',
        'span2',
      ) +
      '</div>' +
      '<div class="dlg-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button>' +
      '<button type="submit" class="btn btn-violet">' +
      (isEdit ? 'Save changes' : 'Save post') +
      '</button></div></form>';
    document.body.appendChild(d);

    function el(id) {
      return d.querySelector('#' + id);
    }
    function val(id) {
      return el(id).value.trim();
    }
    function err(id, msg) {
      el(id).classList.toggle('has-error', !!msg);
      var e = el(id + '-err');
      e.textContent = msg || '';
      e.classList.toggle('visible', !!msg);
    }

    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
    d.addEventListener('close', function () {
      d.remove();
    });
    d.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var cId = val('p-contact');
      var txt = val('p-text');
      var bad = false;
      err('p-contact', cId ? '' : 'Please select a contact.');
      err('p-text', txt ? '' : 'Please enter post content.');
      if (!cId) bad = true;
      if (!txt) bad = true;
      if (bad) {
        d.querySelector('.has-error').focus();
        return;
      }

      var saved = savePost({
        id: isEdit ? existingPost.id : null,
        contactId: cId,
        type: val('p-type'),
        title: val('p-title'),
        text: txt,
        at: isEdit ? existingPost.at : null,
      });
      d.close();
      toast(isEdit ? 'Post updated' : 'Post added');
      if (done) done(saved);
    });
    d.showModal();
    var textarea = d.querySelector('#p-text');
    if (textarea) textarea.focus();
  }

  /* mobile nav toggle */
  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.getElementById('nav'),
      btn = document.getElementById('menu');
    if (nav && btn)
      btn.addEventListener('click', function () {
        btn.setAttribute('aria-expanded', nav.classList.toggle('open'));
      });
  });

  window.Sierra = {
    all: all,
    get: get,
    save: save,
    remove: remove,
    allPosts: allPosts,
    getPost: getPost,
    savePost: savePost,
    removePost: removePost,
    openPostDialog: openPostDialog,
    tagClassForType: tagClassForType,
    POST_TYPES: POST_TYPES,
    // Resource #3: Users & Comments
    USERS: USERS,
    getUsers: getUsers,
    getUser: getUser,
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    allComments: allComments,
    getComment: getComment,
    saveComment: saveComment,
    removeComment: removeComment,
    removeCommentsForPost: removeCommentsForPost,
    esc: esc,
    fullName: fullName,
    initials: initials,
    tagClass: tagClass,
    due: due,
    fmtDate: fmtDate,
    fmtStamp: fmtStamp,
    openDialog: openDialog,
    toast: toast,
    STATUSES: STATUSES,
    SERVICES: SERVICES,
  };
})();
