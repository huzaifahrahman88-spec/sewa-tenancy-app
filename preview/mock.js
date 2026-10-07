/* Local preview only: fake data + a stand-in for google.script.run.
   Names are invented; no real client data lives here. */
(function () {
  var BUILDINGS = ['Solaris Dutamas', 'Neo Damansara', 'Regalia', 'Verve Suites', 'Kiara Designer Suites', 'Arcoris SOHO',
    'I-zen Kiara 2', 'MK Pines', 'Kiaraville', 'Icon Residence', 'Mutiara Homes', 'Concerto', 'Pelangi Damansara',
    'Laman Ceylon', 'Dua Sentral', 'Vogue Suites', 'Casa Vista', 'Fairlane Residence', 'Plaza Damas 3', 'Dorchester'];
  var FIRST = ['Aisyah', 'Daniel', 'Mei Ling', 'Arjun', 'Farah', 'Kenji', 'Sofia', 'Hafiz', 'Grace', 'Ravi', 'Nadia', 'Wei Jie',
    'Amir', 'Chloe', 'Tan', 'Lim', 'Uncle Wong', 'Mr Lee', 'Puan Zainab', 'Jason', 'Priya', 'Hiroshi', 'Elena', 'Omar'];
  var seed = 7;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function dmy(d) { var p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function addMonths(d, m) { var r = new Date(d.getFullYear(), d.getMonth() + m, 1); var l = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate(); r.setDate(Math.min(d.getDate(), l)); return r; }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function money(n) { return 'RM' + n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

  var today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var rows = [];
  function add(o) { o.row = rows.length + 2; rows.push(o); }

  // History 2016 -> last year
  for (var i = 0; i < 360; i++) {
    var start = new Date(2016 + Math.floor(rnd() * 9), Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28));
    if (start > addMonths(today, -14)) continue;
    var sale = rnd() < 0.05;
    var b = pick(BUILDINGS);
    var tenure = rnd() < 0.85 ? 1 : 2;
    var end = addDays(addMonths(start, tenure * 12), -1);
    var st = rnd();
    add({
      residence: b, date: dmy(addDays(start, -20)), type: sale ? 'S' : 'R',
      price: money(sale ? Math.round(400 + rnd() * 900) * 1000 : Math.round(12 + rnd() * 50) * 100),
      parties: pick(FIRST) + '/' + pick(FIRST), start: sale ? '' : dmy(start), tenure: sale ? '' : String(tenure),
      end: sale ? '' : dmy(end), notice: sale ? '' : dmy(addMonths(end, -2)),
      status: sale ? 'completed' : st < 0.45 ? 'renewed' : st < 0.85 ? 'expired' : st < 0.93 ? 'early termination' : '',
      remarks: '', aborted: rnd() < 0.03
    });
  }
  rows.sort(function (a, b) { return a.date.split('/').reverse().join('') < b.date.split('/').reverse().join('') ? -1 : 1; });
  rows.forEach(function (r, i) { r.row = i + 2; });

  // Live tenancies around today, spread so every Today section has examples
  var offsets = [-20, 12, 28, 41, 55, 66, 74, 88, 104, 130, 160, 190, 220, 260, 300, 340, 380, 420, 470, 520, 600, 650];
  offsets.forEach(function (d, k) {
    var end = addDays(today, d);
    var tenure = k % 5 === 0 ? 2 : 1;
    var start = addDays(addMonths(end, -tenure * 12), 1);
    var landlord = pick(FIRST), tenant = pick(FIRST);
    add({
      residence: pick(BUILDINGS), date: dmy(addDays(start, -25)), type: 'R',
      price: money(Math.round(15 + rnd() * 45) * 100), parties: landlord + '/' + tenant,
      start: dmy(start), tenure: String(tenure), end: dmy(end), notice: dmy(addMonths(end, -2)),
      status: k === 3 ? 'Expired' : k === 9 ? 'early termination' : k === 12 ? 'renewed' : '',
      remarks: k === 4 ? 'Wants to repaint before renewal' : '',
      unit: k % 2 ? 'A-' + (5 + k) + '-' + (1 + k % 4) : '',
      landlordPhone: k % 3 ? '012-' + (3000000 + k * 13711) : '', tenantPhone: k % 2 ? '017-' + (2000000 + k * 31337) : '',
      commission: k % 3 === 0 ? String(1500 + k * 100) : '', fee: '', feeCollected: k % 6 === 0 ? '15/' + (((k / 6) % 9) + 1) + '/2026' : '', fee2Collected: '', aborted: false
    });
  });
  var sale = { residence: 'Kiaraville', date: dmy(addDays(today, -30)), type: 'S', price: money(1150000), parties: 'Mr Lee/Hiroshi',
    start: '', tenure: '', end: '', notice: '', status: 'sale', remarks: 'SPA signed', aborted: false };
  add(sale);

  var settings = { calendar: true, weeklyEmail: false, lastSync: new Date().toISOString() };

  function find(ref) {
    return rows.filter(function (r) { return (ref.id && r.id === ref.id) || r.row === ref.row; })[0];
  }
  function apply(r, rec) {
    function dd(s) { if (!s) return s; var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : s; }
    Object.keys(rec).forEach(function (k) {
      var v = rec[k];
      if (['date', 'start', 'end', 'notice'].indexOf(k) >= 0) v = dd(v);
      if (k === 'price' && v !== '' && v != null) v = money(parseFloat(v));
      r[k] = v;
    });
  }
  var server = {
    getData: function () { return { rows: JSON.parse(JSON.stringify(rows)), settings: settings, sheetUrl: 'https://docs.google.com/spreadsheets/d/EXAMPLE/edit', tz: 'Asia/Kuala_Lumpur' }; },
    addRecord: function (rec) { var r = {}; apply(r, rec); r.id = Math.random().toString(16).slice(2, 10); add(r); return { row: r.row, id: r.id }; },
    updateRecord: function (ref, patch) { var r = find(ref); if (!r) throw new Error('not found'); apply(r, patch); return { row: r.row }; },
    renewRecord: function (ref, next) { var r = find(ref); r.status = 'renewed'; return server.addRecord(next); },
    getContacts: function () {
      var names = FIRST.map(function (f, i) { return f + (i % 3 ? ' ' + ['Tan', 'Lim', 'Wong', 'Rahman', 'Kumar'][i % 5] : ''); })
        .concat(['Daniel Lee (Landlord)', 'Daniel Ong', 'Puan Zainab Ahmad', 'Uncle Wong Ah Kow']);
      return names.map(function (n, i) { return { n: n, p: i % 4 === 0 ? ['012-' + (5000000 + i * 7919), '03-2' + (100000 + i * 37)] : ['01' + (2 + i % 7) + '-' + (4000000 + i * 4111)], e: i % 2 ? [n.split(' ')[0].toLowerCase() + '@example.com'] : [], o: '' }; });
    },
    updateMany: function (items) { items.forEach(function (it) { server.updateRecord(it.ref, it.patch); }); return { saved: items.length }; },
    saveSettings: function (s) { settings.calendar = s.calendar; settings.weeklyEmail = s.weeklyEmail; return settings; },
    syncCalendarIfOn: function () { return true; },
    saveTemplates: function (t) { settings.templates = t; return settings; },
    getGeo: function () { try { return JSON.parse(localStorage.getItem('mockGeo') || '{}'); } catch (e) { return {}; } },
    saveGeo: function (m) { var g = server.getGeo(); Object.keys(m).forEach(function (k) { g[k] = m[k]; }); localStorage.setItem('mockGeo', JSON.stringify(g)); return true; },
    syncCalendar: function () { settings.lastSync = new Date().toISOString(); return settings; }
  };

  function runner(ok, fail) {
    var target = {};
    Object.keys(server).forEach(function (name) {
      target[name] = function () {
        var args = arguments;
        setTimeout(function () {
          try { ok && ok(server[name].apply(null, args)); } catch (e) { fail && fail(e); }
        }, 250);
      };
    });
    target.withSuccessHandler = function (f) { return runner(f, fail); };
    target.withFailureHandler = function (f) { return runner(ok, f); };
    return target;
  }
  window.google = { script: { run: runner() } };
})();
