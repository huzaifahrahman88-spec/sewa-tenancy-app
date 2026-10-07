/**
 * Sewa - tenancy tracker for a property agent.
 *
 * The Google Sheet is the database. The app reads it fresh on every load and
 * writes straight back into it, so edits made in the sheet show up in the app
 * and edits made in the app show up in the sheet.
 *
 * Her existing columns (A-K) are never moved or renamed. The app only adds a
 * few columns of its own at the far right (see EXTRA_HEADERS).
 */

// ---- Configuration ---------------------------------------------------------

// The Google Sheet's ID (the long code in its URL). Leave '' if this script
// was created from inside the sheet (Extensions -> Apps Script).
// SPREADSHEET_ID is defined in Config.gs (git-ignored). See Config.example.gs.
var SHEET_NAME = 'Sheet1';            // tab with the records
var CALENDAR_NAME = 'Tenancy Reminders';
var REMINDER_HOUR = 9;                // calendar alerts pop up at 9am
var ABORTED_BG = '#ea4335';           // red fill she uses for aborted deals

// Her existing headers, matched by name (case/spacing-insensitive).
var COLS = {
  residence: 'Residence',
  date: 'Date',
  type: 'R',
  price: 'Price',
  commission: 'Commission',
  parties: 'Landlord/Client',
  start: 'Start Date',
  tenure: 'Tenure',
  end: 'End Date',
  notice: 'Notice',
  status: 'Further Notice/Status',
  remarks: 'Remarks, if any'
};

// Columns the app adds at the far right, created on first use.
var EXTRA_HEADERS = {
  unit: 'Unit No.',
  landlordPhone: 'Landlord Phone',
  tenantPhone: 'Tenant Phone',
  landlordEmail: 'Landlord Email',
  tenantEmail: 'Tenant Email',
  fee: 'Fee (RM)',
  feeCollected: 'Fee Collected',
  fee2Collected: '2nd Year Fee Collected',
  ownerMsgSent: 'Owner Msg Sent',
  tenantMsgSent: 'Tenant Msg Sent',
  id: 'App ID'
};

// ---- Web app entry point ---------------------------------------------------

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Sewa')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('apple-mobile-web-app-capable', 'yes');
}

// ---- Sheet helpers ---------------------------------------------------------

function book_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_() {
  var ss = book_();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  return sh;
}

function norm_(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Map of field -> 1-based column index. Creates missing app columns. */
function columns_(sh, create) {
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  var byName = {};
  headers.forEach(function (h, i) { if (h) byName[norm_(h)] = i + 1; });

  var map = {};
  Object.keys(COLS).forEach(function (k) { map[k] = byName[norm_(COLS[k])] || 0; });

  var next = lastCol + 1;
  Object.keys(EXTRA_HEADERS).forEach(function (k) {
    var col = byName[norm_(EXTRA_HEADERS[k])];
    if (!col && create) {
      col = next++;
      sh.getRange(1, col).setValue(EXTRA_HEADERS[k]).setFontWeight('bold');
    }
    map[k] = col || 0;
  });
  return map;
}

function isRed_(hex) {
  if (!hex || hex.length !== 7) return false;
  var r = parseInt(hex.substr(1, 2), 16);
  var g = parseInt(hex.substr(3, 2), 16);
  var b = parseInt(hex.substr(5, 2), 16);
  return r > 180 && g < 120 && b < 120;
}

// ---- Read ------------------------------------------------------------------

/**
 * Returns every non-blank row as plain strings exactly as she sees them
 * (display values), plus whether the row is filled red (aborted).
 * All interpretation (dates, statuses, reminders) happens in the app.
 */
function getData() {
  var sh = sheet_();
  var c = columns_(sh, false);
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var out = [];
  if (lastRow >= 2) {
    var rng = sh.getRange(2, 1, lastRow - 1, lastCol);
    var vals = rng.getDisplayValues();
    var bgs = rng.getBackgrounds();
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i];
      var get = function (k) { return c[k] ? String(v[c[k] - 1]).trim() : ''; };
      if (!get('residence') && !get('parties') && !get('price')) continue;
      var red = false;
      var priceCol = c.price || 4;
      for (var j = 1; j < Math.min(priceCol + 2, bgs[i].length); j++) {
        if (isRed_(bgs[i][j])) { red = true; break; }
      }
      out.push({
        row: i + 2,
        id: get('id'),
        residence: get('residence'),
        date: get('date'),
        type: get('type'),
        price: get('price'),
        commission: get('commission'),
        parties: get('parties'),
        start: get('start'),
        tenure: get('tenure'),
        end: get('end'),
        notice: get('notice'),
        status: get('status'),
        remarks: get('remarks'),
        unit: get('unit'),
        landlordPhone: get('landlordPhone'),
        tenantPhone: get('tenantPhone'),
        landlordEmail: get('landlordEmail'),
        tenantEmail: get('tenantEmail'),
        fee: get('fee'),
        feeCollected: get('feeCollected'),
        fee2Collected: get('fee2Collected'),
        ownerMsgSent: get('ownerMsgSent'),
        tenantMsgSent: get('tenantMsgSent'),
        aborted: red
      });
    }
  }
  return {
    rows: out,
    settings: getSettings(),
    sheetUrl: book_().getUrl(),
    tz: Session.getScriptTimeZone()
  };
}

// ---- Write -----------------------------------------------------------------

function newId_() {
  return Utilities.getUuid().slice(0, 8);
}

/** dd/mm/yyyy or ISO yyyy-mm-dd -> Date (local, midnight). */
function toDate_(s) {
  if (!s) return null;
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = String(s).match(/^(\d{1,2})[\/.-]+(\d{1,2})[\/.-]+(\d{2,4})$/);
  if (m) {
    var y = +m[3]; if (y < 100) y += 2000;
    var d = +m[1], mo = +m[2];
    if (mo > 12 && d <= 12) { var sw = d; d = mo; mo = sw; }
    if (mo < 1 || mo > 12) return null;
    return new Date(y, mo - 1, d);
  }
  return null;
}

/**
 * Finds the sheet row for a record. Rows can move if she inserts or sorts,
 * so we trust the App ID first, then check the expected row still holds the
 * same deal, then search by residence + landlord/client.
 */
function findRow_(sh, c, ref) {
  var lastRow = sh.getLastRow();
  if (ref.id && c.id) {
    var ids = sh.getRange(2, c.id, lastRow - 1, 1).getDisplayValues();
    for (var i = 0; i < ids.length; i++) if (ids[i][0] === ref.id) return i + 2;
  }
  var same = function (r) {
    var res = sh.getRange(r, c.residence).getDisplayValue().trim();
    var par = sh.getRange(r, c.parties).getDisplayValue().trim();
    return res === ref.residence && par === ref.parties;
  };
  if (ref.row >= 2 && ref.row <= lastRow && same(ref.row)) return ref.row;
  var res = sh.getRange(2, c.residence, lastRow - 1, 1).getDisplayValues();
  var par = sh.getRange(2, c.parties, lastRow - 1, 1).getDisplayValues();
  for (var k = 0; k < res.length; k++) {
    if (res[k][0].trim() === ref.residence && par[k][0].trim() === ref.parties) return k + 2;
  }
  throw new Error('Could not find this record in the sheet. It may have been deleted - pull to refresh.');
}

/** Copies of the same lease elsewhere in the sheet (she keeps a working copy
 *  of live leases at the bottom). Only rows that still match are returned. */
function dupeRows_(sh, c, ref) {
  return (ref.dupes || []).filter(function (d) {
    if (!d.row || d.row < 2 || d.row > sh.getLastRow()) return false;
    return sh.getRange(d.row, c.residence).getDisplayValue().trim() === d.residence &&
      sh.getRange(d.row, c.parties).getDisplayValue().trim() === d.parties;
  }).map(function (d) { return d.row; });
}

/** Writes the fields present in `rec` into row `r`. */
function writeFields_(sh, c, r, rec) {
  var set = function (k, value, format) {
    if (!c[k] || value === undefined) return;
    var cell = sh.getRange(r, c[k]);
    cell.setValue(value);
    if (format) cell.setNumberFormat(format);
  };
  // Keep whatever number format the cell already has (copied from her rows);
  // only fall back to her usual style when the cell has none.
  var rowFmts = sh.getRange(r, 1, 1, sh.getLastColumn()).getNumberFormats()[0];
  var fmt = function (k) { return c[k] ? String(rowFmts[c[k] - 1] || '') : ''; };
  var date = function (k) {
    if (rec[k] === undefined) return;
    var d = toDate_(rec[k]);
    set(k, d || rec[k] || '', d && !/[dy]/i.test(fmt(k)) ? 'd/m/yyyy' : null);
  };
  set('residence', rec.residence);
  date('date');
  set('type', rec.type);
  if (rec.price !== undefined) {
    var p = parseFloat(String(rec.price).replace(/[^0-9.]/g, ''));
    set('price', isNaN(p) ? rec.price : p, isNaN(p) || /[#0]\.0/.test(fmt('price')) ? null : '"RM"#,##0.00');
  }
  if (rec.commission !== undefined) {
    var cm = parseFloat(String(rec.commission).replace(/[^0-9.]/g, ''));
    set('commission', isNaN(cm) ? rec.commission : cm, isNaN(cm) || /[#0]\.0/.test(fmt('commission')) ? null : '"RM"#,##0.00');
  }
  set('parties', rec.parties);
  date('start');
  // Tenure like "6/12" must stay text, or Sheets turns it into a date.
  if (rec.tenure !== undefined && c.tenure) {
    var tc = sh.getRange(r, c.tenure);
    if (/\//.test(String(rec.tenure))) tc.setNumberFormat('@').setValue(String(rec.tenure));
    else tc.setValue(rec.tenure === '' ? '' : Number(rec.tenure));
  }
  date('end');
  date('notice');
  set('status', rec.status);
  set('remarks', rec.remarks);
  set('unit', rec.unit);
  // Phone numbers as text, so a leading 0 is kept.
  if (rec.landlordPhone !== undefined && c.landlordPhone)
    sh.getRange(r, c.landlordPhone).setNumberFormat('@').setValue(rec.landlordPhone);
  if (rec.tenantPhone !== undefined && c.tenantPhone)
    sh.getRange(r, c.tenantPhone).setNumberFormat('@').setValue(rec.tenantPhone);
  set('landlordEmail', rec.landlordEmail);
  set('tenantEmail', rec.tenantEmail);
  if (rec.fee !== undefined) {
    var f = parseFloat(String(rec.fee).replace(/[^0-9.]/g, ''));
    set('fee', isNaN(f) ? rec.fee : f, isNaN(f) || /[#0]\.0/.test(fmt('fee')) ? null : '#,##0.00');
  }
  if (rec.feeCollected !== undefined) {
    var fd = toDate_(rec.feeCollected);
    if (fd && c.feeCollected) sh.getRange(r, c.feeCollected).setValue(fd).setNumberFormat('d/m/yyyy');
    else set('feeCollected', rec.feeCollected);
  }
  set('fee2Collected', rec.fee2Collected);
  ['ownerMsgSent', 'tenantMsgSent'].forEach(function (k) {
    if (rec[k] === undefined || !c[k]) return;
    var d = toDate_(rec[k]);
    if (d) sh.getRange(r, c[k]).setValue(d).setNumberFormat('d/m/yyyy');
    else sh.getRange(r, c[k]).setValue(rec[k] || '');
  });
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/**
 * First empty row after the last record, pre-formatted like her own rows:
 * fonts, column colours (green Price/Notice), alignment, borders, number
 * formats and the R/S dropdown are copied from the nearest row above that
 * isn't highlighted (so a red "aborted" or yellow row is never copied).
 */
function appendRow_(sh) {
  var last = sh.getLastRow();
  var r = last + 1;
  var width = sh.getLastColumn();
  var c = columns_(sh, false);
  var keyCols = [c.residence, c.date, c.type, c.parties].filter(Boolean);
  var template = 0;
  for (var t = last; t >= Math.max(2, last - 60) && !template; t--) {
    var bgs = sh.getRange(t, 1, 1, width).getBackgrounds()[0];
    var plain = keyCols.every(function (col) { return /^#ffffff$/i.test(bgs[col - 1]); });
    var filled = sh.getRange(t, c.residence || 1).getDisplayValue().trim() !== '';
    if (plain && filled) template = t;
  }
  if (template) {
    var src = sh.getRange(template, 1, 1, width), dst = sh.getRange(r, 1, 1, width);
    src.copyTo(dst, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    src.copyTo(dst, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  }
  return r;
}

function addRecord(rec) {
  return withLock_(function () {
    var sh = sheet_();
    var c = columns_(sh, true);
    var r = appendRow_(sh);
    rec.id = newId_();
    writeFields_(sh, c, r, rec);
    sh.getRange(r, c.id).setValue(rec.id);
    SpreadsheetApp.flush();
    return { row: r, id: rec.id };
  });
}

function updateRecord(ref, patch) {
  return withLock_(function () {
    var sh = sheet_();
    var c = columns_(sh, true);
    var r = findRow_(sh, c, ref);
    var id = ref.id || sh.getRange(r, c.id).getDisplayValue() || newId_();
    var rows = [r].concat(dupeRows_(sh, c, ref));
    rows.forEach(function (rr) {
      writeFields_(sh, c, rr, patch);
      if (patch.aborted !== undefined) {
        var width = Math.max(c.remarks || 11, 11);
        sh.getRange(rr, 1, 1, width).setBackground(patch.aborted ? ABORTED_BG : null);
      }
    });
    sh.getRange(r, c.id).setValue(id);
    SpreadsheetApp.flush();
    return { row: r, id: id };
  });
}

/** Marks the old lease renewed and adds the new term as a new row. */
function renewRecord(ref, next) {
  return withLock_(function () {
    var sh = sheet_();
    var c = columns_(sh, true);
    var r = findRow_(sh, c, ref);
    var oldId = sh.getRange(r, c.id).getDisplayValue() || newId_();
    sh.getRange(r, c.id).setValue(oldId);
    [r].concat(dupeRows_(sh, c, ref)).forEach(function (rr) { sh.getRange(rr, c.status).setValue('renewed'); });

    var nr = appendRow_(sh);
    next.id = newId_();
    writeFields_(sh, c, nr, next);
    sh.getRange(nr, c.id).setValue(next.id);
    SpreadsheetApp.flush();
    return { row: nr, id: next.id };
  });
}

/** Saves several small patches in one go (used by "Match contacts"). */
function updateMany(items) {
  return withLock_(function () {
    var sh = sheet_();
    var c = columns_(sh, true);
    var done = 0;
    items.forEach(function (it) {
      var r = findRow_(sh, c, it.ref);
      [r].concat(dupeRows_(sh, c, it.ref)).forEach(function (rr) { writeFields_(sh, c, rr, it.patch); });
      if (!sh.getRange(r, c.id).getDisplayValue()) sh.getRange(r, c.id).setValue(it.ref.id || newId_());
      done++;
    });
    SpreadsheetApp.flush();
    return { saved: done };
  });
}

// ---- Google Contacts -------------------------------------------------------

/**
 * Her Google Contacts (synced from her iPhone), trimmed to what the app needs:
 * name + phone numbers + emails. Read-only; nothing is stored by the app.
 */
// Google Contacts lookup is switched off: contacts are matched offline from a
// .vcf instead (numbers were imported once from her contacts). Kept as a stub so old clients don't break.
var CONTACTS_ENABLED = false;
function getContacts(fresh) {
  if (!CONTACTS_ENABLED) return [];
  var cache = CacheService.getUserCache();
  if (!fresh) {
    var n = +cache.get('contacts_n');
    if (n) {
      var parts = cache.getAll(Array.apply(null, Array(n)).map(function (_, i) { return 'contacts_' + i; }));
      var json = '';
      for (var i = 0; i < n; i++) { if (parts['contacts_' + i] == null) { json = null; break; } json += parts['contacts_' + i]; }
      if (json) return JSON.parse(json);
    }
  }
  var list = fetchContacts_();
  var str = JSON.stringify(list), size = 90000, chunks = {};
  for (var k = 0; k * size < str.length; k++) chunks['contacts_' + k] = str.substr(k * size, size);
  try { cache.putAll(chunks, 21600); cache.put('contacts_n', String(Object.keys(chunks).length), 21600); } catch (e) {}
  return list;
}

function fetchContacts_() {
  var out = [], token = null, guard = 0;
  do {
    var res = People.People.Connections.list('people/me', {
      personFields: 'names,phoneNumbers,emailAddresses,organizations',
      pageSize: 1000,
      pageToken: token
    });
    (res.connections || []).forEach(function (p) {
      var name = p.names && p.names.length ? p.names[0].displayName : '';
      var phones = (p.phoneNumbers || []).map(function (x) { return x.value; }).filter(Boolean);
      var emails = (p.emailAddresses || []).map(function (x) { return x.value; }).filter(Boolean);
      var org = p.organizations && p.organizations.length ? p.organizations[0].name || '' : '';
      if (!name && org) name = org;
      if (name && (phones.length || emails.length)) out.push({ n: name, p: phones, e: emails, o: org });
    });
    token = res.nextPageToken;
  } while (token && ++guard < 20);
  out.sort(function (a, b) { return a.n.localeCompare(b.n); });
  return out;
}

// ---- Settings --------------------------------------------------------------

function getSettings() {
  var p = PropertiesService.getUserProperties();
  var tpl = null;
  try { tpl = JSON.parse(p.getProperty('templates') || 'null'); } catch (e) {}
  return {
    templates: tpl,
    calendar: p.getProperty('calendar') === 'on',
    weeklyEmail: p.getProperty('weeklyEmail') === 'on',
    lastSync: p.getProperty('lastSync') || ''
  };
}

/** Renewal message templates (per person using the app). null = use defaults. */
function saveTemplates(t) {
  var p = PropertiesService.getUserProperties();
  if (t) p.setProperty('templates', JSON.stringify({ owner: String(t.owner || ''), tenant: String(t.tenant || '') }));
  else p.deleteProperty('templates');
  return getSettings();
}

function saveSettings(s) {
  var p = PropertiesService.getUserProperties();
  p.setProperty('calendar', s.calendar ? 'on' : 'off');
  p.setProperty('weeklyEmail', s.weeklyEmail ? 'on' : 'off');
  installTriggers_();
  if (s.calendar) syncCalendar();
  else removeAllEvents_();
  return getSettings();
}

function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'dailyJob' || f === 'weeklyDigest') ScriptApp.deleteTrigger(t);
  });
  var s = getSettings();
  if (s.calendar) {
    // Daily resync picks up anything she changed directly in the sheet.
    ScriptApp.newTrigger('dailyJob').timeBased().everyDays(1).atHour(6).create();
  }
  if (s.weeklyEmail) {
    ScriptApp.newTrigger('weeklyDigest').timeBased()
      .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
  }
}

function dailyJob() {
  if (getSettings().calendar) syncCalendar();
}

// ---- Lease logic shared by calendar + email ----------------------------------

function today_() {
  var n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function addMonths_(d, m) {
  var r = new Date(d.getFullYear(), d.getMonth() + m, 1);
  var last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), last));
  return r;
}

function addDays_(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function outcome_(status) {
  var s = String(status || '').toLowerCase();
  if (!s || s === '-') return '';
  if (/abort/.test(s)) return 'aborted';
  if (/(not|non)[\s-]*renew/.test(s)) return 'moving';
  if (/renew|extension/.test(s)) return 'renewed';
  if (/expired|laps|termination|undercut|end service|uncontactable|sold|own unit|forfeit|replacement|tenant chan|completed|sale/.test(s)) return 'moving';
  return '';
}

function splitParties_(p) {
  var i = String(p || '').indexOf('/');
  if (i < 0) return { landlord: String(p || '').trim(), tenant: '' };
  return { landlord: p.slice(0, i).trim(), tenant: p.slice(i + 1).trim() };
}

/** Active rental leases with a future end date. */
function activeLeases_() {
  var data = getData();
  var t = today_();
  var out = [];
  data.rows.forEach(function (r) {
    if (r.aborted) return;
    if (String(r.type).toUpperCase() !== 'R') return;
    var end = toDate_(r.end);
    if (!end || end < addDays_(t, -1)) return;
    var start = toDate_(r.start);
    var oc = outcome_(r.status);
    if (oc === 'renewed' || oc === 'aborted') return;
    r._end = end; r._start = start; r._outcome = oc;
    out.push(r);
  });
  return out;
}

function label_(r) {
  var p = splitParties_(r.parties);
  var name = r.residence + (r.unit ? ' ' + r.unit : '');
  var who = p.tenant ? ' - ' + p.tenant : '';
  return name + who;
}

// ---- Calendar sync ---------------------------------------------------------

function calendar_() {
  var cals = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  if (cals.length) return cals[0];
  return CalendarApp.createCalendar(CALENDAR_NAME, { color: CalendarApp.Color.TEAL });
}

/** Called by the app in the background after a save, so saving stays fast. */
function syncCalendarIfOn() {
  if (getSettings().calendar) syncCalendar();
  return true;
}

function syncCalendarSafe_() {
  try { if (getSettings().calendar) syncCalendar(); } catch (e) { console.warn(e); }
}

/**
 * Makes the "Tenancy Reminders" calendar match the sheet:
 *   3 months before end  - start renewal talks
 *   2 months before end  - tenant notice deadline
 *   1 week before end    - lease ends next week
 *   12 months into a 2-year lease - collect 2nd-year fee
 * Leases where the tenant isn't renewing only keep the move-out event.
 * Events are tagged with a key so they are updated, never duplicated.
 */
function syncCalendar() {
  var cal = calendar_();
  var t = today_();
  var horizon = addMonths_(t, 40);
  var existing = {};
  cal.getEvents(addDays_(t, -2), horizon).forEach(function (e) {
    var k = e.getTag('sewaKey');
    if (k) existing[k] = e;
  });

  var wanted = {};
  var sh = sheet_();
  var c = columns_(sh, true);

  activeLeases_().forEach(function (r) {
    if (!r.id) {
      r.id = newId_();
      sh.getRange(r.row, c.id).setValue(r.id);
    }
    var name = label_(r);
    var p = splitParties_(r.parties);
    var desc = [
      r.residence + (r.unit ? ' ' + r.unit : ''),
      'Landlord: ' + p.landlord + (r.landlordPhone ? ' (' + r.landlordPhone + ')' : ''),
      'Tenant: ' + p.tenant + (r.tenantPhone ? ' (' + r.tenantPhone + ')' : ''),
      'Rent: ' + r.price,
      'Lease: ' + r.start + ' - ' + r.end
    ].join('\n');

    var add = function (kind, date, title) {
      if (date < t) return;
      wanted[r.id + ':' + kind] = { date: date, title: title, desc: desc };
    };
    if (r._outcome === 'moving') {
      add('end', r._end, '🚚 Tenant moving out: ' + name);
    } else {
      add('talk', addMonths_(r._end, -3), '🔔 Start renewal talk: ' + name);
      add('notice', addMonths_(r._end, -2), '⚠️ Notice deadline: ' + name);
      add('end', addDays_(r._end, -7), '📅 Lease ends in 1 week: ' + name);
    }
    if (r._start && /^2(\.0)?$/.test(String(r.tenure).trim()) &&
        norm_(r.fee2Collected) !== 'yes') {
      add('fee2', addMonths_(r._start, 12), '💰 Collect 2nd-year fee: ' + name);
    }
  });

  Object.keys(wanted).forEach(function (k) {
    var w = wanted[k];
    var start = new Date(w.date.getFullYear(), w.date.getMonth(), w.date.getDate(), REMINDER_HOUR, 0);
    var end = new Date(start.getTime() + 30 * 60000);
    var e = existing[k];
    if (e) {
      if (e.getStartTime().getTime() !== start.getTime()) e.setTime(start, end);
      if (e.getTitle() !== w.title) e.setTitle(w.title);
      if (e.getDescription() !== w.desc) e.setDescription(w.desc);
      delete existing[k];
    } else {
      e = cal.createEvent(w.title, start, end, { description: w.desc });
      e.setTag('sewaKey', k);
      e.removeAllReminders();
      e.addPopupReminder(0);
    }
  });

  // Anything left over no longer applies (renewed, aborted, date changed away).
  Object.keys(existing).forEach(function (k) { existing[k].deleteEvent(); });

  PropertiesService.getUserProperties().setProperty('lastSync', new Date().toISOString());
  return getSettings();
}

function removeAllEvents_() {
  var cals = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  if (!cals.length) return;
  var t = today_();
  cals[0].getEvents(addDays_(t, -2), addMonths_(t, 40)).forEach(function (e) {
    if (e.getTag('sewaKey')) e.deleteEvent();
  });
}

// ---- Weekly email ----------------------------------------------------------

function weeklyDigest() {
  var t = today_();
  var rows = activeLeases_().filter(function (r) {
    return (r._end - t) / 86400000 <= 90;
  }).sort(function (a, b) { return a._end - b._end; });
  if (!rows.length) return;

  var fmt = function (d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'd MMM yyyy'); };
  var lines = rows.map(function (r) {
    var days = Math.round((r._end - t) / 86400000);
    var p = splitParties_(r.parties);
    var state = r._outcome === 'moving' ? 'Not renewing - find new tenant'
      : days <= 60 ? 'Notice date passed - confirm renewal'
      : 'Start renewal talk';
    return '<tr><td style="padding:8px 12px;border-bottom:1px solid #eee"><b>' + r.residence +
      (r.unit ? ' ' + r.unit : '') + '</b><br><span style="color:#666">' + p.landlord + ' → ' + p.tenant +
      '</span></td><td style="padding:8px 12px;border-bottom:1px solid #eee">' + fmt(r._end) +
      '<br><span style="color:#666">' + days + ' days</span></td><td style="padding:8px 12px;border-bottom:1px solid #eee">' +
      state + '</td></tr>';
  }).join('');

  var html = '<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px">' +
    '<h2 style="margin:0 0 4px">This week\'s renewals</h2>' +
    '<p style="color:#666;margin:0 0 16px">' + rows.length + ' tenancies end in the next 90 days.</p>' +
    '<table style="border-collapse:collapse;width:100%">' + lines + '</table>' +
    '<p style="margin-top:16px"><a href="' + ScriptApp.getService().getUrl() + '">Open Sewa</a></p></div>';

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: 'Sewa: ' + rows.length + ' tenancies ending soon',
    htmlBody: html
  });
}


