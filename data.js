/**
 * data.js — UBF Procurement & Logistics System
 * Backend: Supabase (Postgres + Auth + Storage) with Row-Level Security.
 * Dependency-free: talks to Supabase REST / Auth / Storage over fetch.
 *
 * The public DataService API (method names & shapes) is kept identical to the
 * previous GitHub-backed version, so dashboard.html, the forms, the expenditure
 * report and script.js keep working unchanged.
 */
(function (global) {
'use strict';

var CONFIG = {
  URL             : 'https://nrtffnqbztablimkbysa.supabase.co',
  KEY             : 'sb_publishable_GYKa4bi7xMZUc4HFkKJcdQ_fqIPy1pF',
  BUCKET          : 'attachments',
  SESSION_KEY     : 'ubf_sb_session',
  SIGNED_URL_TTL  : 31536000 /* 1 year */
};

var ELEVATED = ['Admin Officer', 'Finance Officer', 'FAM', 'ED'];

/* small in-memory directory (email -> {name,role,title}); best-effort */
var _dir = {};

/* ============================================================
   Session storage
============================================================ */
function getStored(){
  try { var raw = localStorage.getItem(CONFIG.SESSION_KEY); return raw ? JSON.parse(raw) : null; }
  catch(_) { return null; }
}
function setStored(s){ localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(s)); }
function clearStored(){ localStorage.removeItem(CONFIG.SESSION_KEY); }

/* ============================================================
   Low-level fetch helpers
============================================================ */
async function parseJson(res){ try { return await res.json(); } catch(_) { return null; } }

function friendlyErr(status, body){
  var msg = (body && (body.message || body.error_description || body.msg || body.error || body.hint)) || '';
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password. Please try again.';
  if (status === 401) return 'Session expired. Please log in again.';
  if (status === 403) return 'You are not permitted to do that.';
  return msg || ('Request failed (' + status + ').');
}

/* Refresh the access token if it is missing or about to expire. Returns a valid token. */
async function accessToken(){
  var s = getStored();
  if (!s || !s.access_token) throw new Error('Session expired. Please log in again.');
  if (s.expires_at && Date.now() < (s.expires_at - 60000)) return s.access_token;
  if (!s.refresh_token) return s.access_token; /* no refresh available; try as-is */

  var res = await fetch(CONFIG.URL + '/auth/v1/token?grant_type=refresh_token', {
    method:'POST',
    headers:{ 'apikey': CONFIG.KEY, 'Content-Type':'application/json' },
    body: JSON.stringify({ refresh_token: s.refresh_token })
  });
  if (!res.ok){ clearStored(); throw new Error('Session expired. Please log in again.'); }
  var t = await res.json();
  s.access_token  = t.access_token;
  s.refresh_token = t.refresh_token || s.refresh_token;
  s.expires_at    = Date.now() + ((t.expires_in || 3600) * 1000);
  setStored(s);
  return s.access_token;
}

/* PostgREST call */
async function rest(path, opts){
  opts = opts || {};
  var token = await accessToken();
  var headers = {
    'apikey': CONFIG.KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };
  if (opts.prefer) headers['Prefer'] = opts.prefer;
  var res = await fetch(CONFIG.URL + '/rest/v1/' + path, {
    method: opts.method || 'GET',
    headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!res.ok){ throw new Error(friendlyErr(res.status, await parseJson(res))); }
  if (res.status === 204) return null;
  return await parseJson(res);
}

/* Call a Postgres function (RPC) */
async function rpc(fn, args){
  var token = await accessToken();
  var res = await fetch(CONFIG.URL + '/rest/v1/rpc/' + fn, {
    method:'POST',
    headers:{ 'apikey': CONFIG.KEY, 'Authorization': 'Bearer ' + token, 'Content-Type':'application/json' },
    body: JSON.stringify(args || {})
  });
  if (!res.ok){ throw new Error(friendlyErr(res.status, await parseJson(res))); }
  return await parseJson(res);
}

/* ============================================================
   Row <-> record mapping (keeps the shape the UI expects)
============================================================ */
function rowToRecord(r){
  if (!r) return null;
  return {
    id               : r.id,
    formType         : r.form_type,
    data             : r.data || {},
    status           : r.status,
    submittedBy      : r.submitted_by_email,
    submittedByName  : r.submitted_by_name,
    submittedByTitle : r.submitted_by_title,
    submittedByRole  : r.submitted_by_role,
    currency         : r.currency || 'UGX',
    attachments      : r.attachments || [],
    comments         : r.comments || [],
    managementNotes  : r.management_notes || [],
    linkedForms      : r.linked_forms || [],
    approval         : r.approval || {},
    history          : r.history || [],
    parentPackageId  : r.parent_package_id || null,
    isLinkedForm     : !!r.is_linked_form,
    createdAt        : r.created_at,
    updatedAt        : r.updated_at
  };
}

function newApprovalSkeleton(){
  var blank = { status:'Pending', by:'', byName:'', at:'', note:'' };
  return { preparation:Object.assign({},blank), review:Object.assign({},blank),
           clearance:Object.assign({},blank), approval:Object.assign({},blank) };
}

function generateId(){
  var n = new Date();
  var r = Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase().padStart(6,'0');
  return 'UBF-' + n.getFullYear() + String(n.getMonth()+1).padStart(2,'0') + String(n.getDate()).padStart(2,'0') + '-' + r;
}

/* Build an insert row from a session + form data */
function buildRow(id, formData, formType, atts, session, extra){
  return {
    id                : id,
    form_type         : formType || 'request',
    data              : formData || {},
    status            : 'Pending',
    submitted_by      : session.id,
    submitted_by_email: session.email,
    submitted_by_name : session.name,
    submitted_by_title: session.title || '',
    submitted_by_role : session.role || 'Staff',
    currency          : (formData && formData.currency) || 'UGX',
    approval          : newApprovalSkeleton(),
    attachments       : atts || [],
    comments          : [],
    management_notes  : [],
    linked_forms      : (extra && extra.linked_forms) || [],
    history           : [{ action:'Submitted', by:session.email, byName:session.name,
                           byTitle:session.title||'', at:new Date().toISOString(),
                           note:(extra && extra.note) || 'Initial submission' }],
    parent_package_id : (extra && extra.parent_package_id) || null,
    is_linked_form    : (extra && extra.is_linked_form) || false
  };
}

/* ============================================================
   Storage (attachments)
============================================================ */
async function uploadOne(file){
  var token = await accessToken();
  var safe = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  var path = Date.now() + '_' + Math.floor(Math.random()*1e4) + '_' + safe;

  var up = await fetch(CONFIG.URL + '/storage/v1/object/' + CONFIG.BUCKET + '/' + encodeURIComponent(path), {
    method:'POST',
    headers:{ 'apikey': CONFIG.KEY, 'Authorization':'Bearer ' + token, 'Content-Type': file.type || 'application/octet-stream' },
    body: file
  });
  if (!up.ok){ throw new Error('Upload failed for ' + (file.name||'file') + '.'); }

  /* signed URL so the private file can be opened from the app */
  var downloadUrl = '';
  try {
    var sg = await fetch(CONFIG.URL + '/storage/v1/object/sign/' + CONFIG.BUCKET + '/' + encodeURIComponent(path), {
      method:'POST',
      headers:{ 'apikey': CONFIG.KEY, 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' },
      body: JSON.stringify({ expiresIn: CONFIG.SIGNED_URL_TTL })
    });
    if (sg.ok){ var sj = await sg.json(); if (sj && sj.signedURL) downloadUrl = CONFIG.URL + '/storage/v1' + sj.signedURL; }
  } catch(_){}

  return { path: CONFIG.BUCKET + '/' + path, downloadUrl: downloadUrl, name: file.name, size: file.size, uploadedAt: new Date().toISOString() };
}
async function uploadAllAttachments(fileList){
  var files = Array.isArray(fileList) ? fileList : Array.from(fileList || []);
  var out = [];
  for (var i = 0; i < files.length; i++) out.push(await uploadOne(files[i]));
  return out;
}

/* ============================================================
   Auth
============================================================ */
async function authenticateUser(email, password){
  var el = (email || '').trim().toLowerCase();
  var res = await fetch(CONFIG.URL + '/auth/v1/token?grant_type=password', {
    method:'POST',
    headers:{ 'apikey': CONFIG.KEY, 'Content-Type':'application/json' },
    body: JSON.stringify({ email: el, password: password })
  });
  var body = await parseJson(res);
  if (!res.ok){ throw new Error(friendlyErr(res.status, body)); }

  var session = {
    access_token : body.access_token,
    refresh_token: body.refresh_token,
    expires_at   : Date.now() + ((body.expires_in || 3600) * 1000),
    user         : { id: body.user && body.user.id, email: el, name: el, role: 'Staff', title: '', mustChangePassword: false }
  };
  setStored(session);

  /* fetch this user's profile (role / name / title / flags) */
  var rows = await rest('profiles?select=full_name,role,title,active,must_change_password&id=eq.' + encodeURIComponent(session.user.id));
  var p = (rows && rows[0]) || {};
  if (p.active === false){ clearStored(); throw new Error('Account deactivated. Contact administrator.'); }
  session.user.name  = p.full_name || el;
  session.user.role  = p.role || 'Staff';
  session.user.title = p.title || '';
  session.user.mustChangePassword = !!p.must_change_password;
  setStored(session);
  _dir[el] = { name: session.user.name, role: session.user.role, title: session.user.title };

  return { user: { id: session.user.id, email: el, name: session.user.name, role: session.user.role,
                   title: session.user.title, mustChangePassword: session.user.mustChangePassword, passwordExpiry: null } };
}

async function changePassword(email, newPass){
  var token = await accessToken();
  var res = await fetch(CONFIG.URL + '/auth/v1/user', {
    method:'PUT',
    headers:{ 'apikey': CONFIG.KEY, 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' },
    body: JSON.stringify({ password: newPass })
  });
  if (!res.ok){ throw new Error(friendlyErr(res.status, await parseJson(res))); }
  try { await rpc('complete_password_change', {}); } catch(_){}
  var s = getStored(); if (s && s.user){ s.user.mustChangePassword = false; setStored(s); }
  return true;
}

function isPasswordExpired(_){ return false; } /* Supabase Auth manages credentials now */

/* ============================================================
   Session helpers (sync — used widely by the UI)
============================================================ */
function saveSession(user){
  var s = getStored();
  if (!s){ s = { user:{} }; }
  if (user){ s.user = Object.assign({}, s.user, {
    id: user.id || (s.user && s.user.id), email: user.email, name: user.name,
    role: user.role, title: user.title, mustChangePassword: user.mustChangePassword
  }); }
  setStored(s);
  return getSession();
}
function getSession(){
  var s = getStored();
  if (!s || !s.user || !s.user.email) return null;
  return { id: s.user.id, email: s.user.email, name: s.user.name, role: s.user.role,
           title: s.user.title, mustChangePassword: s.user.mustChangePassword };
}
function clearSession(){
  var s = getStored();
  clearStored(); /* clear synchronously first so isAuthenticated() is false immediately */
  try {
    if (s && s.access_token){
      /* fire-and-forget server logout; navigation can proceed right away */
      fetch(CONFIG.URL + '/auth/v1/logout', { method:'POST',
        headers:{ 'apikey': CONFIG.KEY, 'Authorization':'Bearer ' + s.access_token } })['catch'](function(){});
    }
  } catch(_){}
}
function isAuthenticated(){ return !!getSession(); }
function requireSession(){ var s = getSession(); if (!s) throw new Error('Session expired. Please log in again.'); return s; }

/* ============================================================
   Role / workflow helpers (must match server change_status rules)
============================================================ */
function canSeeAll(role){ return ELEVATED.indexOf(role) !== -1; }
function canActionRequisition(role, status){
  if (!role || !status) return false;
  if (role === 'Admin Officer') return status === 'Pending';
  if (role === 'FAM')           return status === 'Prepared' || status === 'Reviewed';
  if (role === 'ED')            return status === 'Cleared';
  return false;
}
function getNextStatus(role, status){
  if (role === 'Admin Officer' && status === 'Pending')  return 'Prepared';
  if (role === 'FAM'           && status === 'Prepared') return 'Reviewed';
  if (role === 'FAM'           && status === 'Reviewed') return 'Cleared';
  if (role === 'ED'            && status === 'Cleared')  return 'Approved';
  return null;
}
function getActionLabel(role, status){
  if (role === 'Admin Officer' && status === 'Pending')  return 'Mark Prepared';
  if (role === 'FAM'           && status === 'Prepared') return 'Mark Reviewed';
  if (role === 'FAM'           && status === 'Reviewed') return 'Clear';
  if (role === 'ED'            && status === 'Cleared')  return 'Approve';
  return null;
}
function getStaff(email){ var e=(email||'').trim().toLowerCase(); return _dir[e] || { name: email||'', role:'Staff', title:'Staff' }; }
function getRole(email){ return getStaff(email).role; }
function getDisplayName(email){ return getStaff(email).name; }
function getTitle(email){ return getStaff(email).title; }
function filterByRole(records, session){
  if (!Array.isArray(records) || !session) return [];
  if (canSeeAll(session.role)) return records; /* server already filters via RLS */
  return records.filter(function(r){ return r.submittedBy && r.submittedBy.toLowerCase() === session.email.toLowerCase(); });
}

/* ============================================================
   Requisitions — queries
============================================================ */
async function getAllRequisitions(){
  requireSession();
  var rows = await rest('requisitions?select=*&order=created_at.desc');
  return (rows || []).map(rowToRecord);
}
async function readDatabase(){ /* kept for the expenditure report */
  var rows = await rest('requisitions?select=*&order=created_at.desc');
  return { records: (rows || []).map(rowToRecord), sha: null };
}
async function getDashboardStats(){
  var records = await getAllRequisitions();
  var s = { total: records.length, pending:0, prepared:0, reviewed:0, cleared:0, approved:0, rejected:0 };
  records.forEach(function(r){
    var st = (r.status || '').toLowerCase();
    if (s[st] !== undefined) s[st]++;
  });
  return s;
}

/* ============================================================
   Requisitions — submit
============================================================ */
async function submitPackage(mainFormData, mainFiles, mainFormType, extraForms){
  var session = requireSession();

  /* extra forms first (generate ids so the main record can link them) */
  var extraRows = [];
  var linkedSummaries = [];
  var list = extraForms || [];
  for (var i = 0; i < list.length; i++){
    var ef = list[i];
    var efAtt = (ef.files && ef.files.length) ? await uploadAllAttachments(ef.files) : [];
    var efId  = generateId();
    var efRow = buildRow(efId, ef.formData, ef.formType, efAtt, session, { note: 'Part of package' });
    extraRows.push(efRow);
    linkedSummaries.push({ id: efId, formType: ef.formType,
      description: (ef.formData && ef.formData.description) || efId, status:'Pending', submittedByName: session.name });
  }

  var mainAtt = (mainFiles && mainFiles.length) ? await uploadAllAttachments(mainFiles) : [];
  var mainId  = generateId();
  var mainRow = buildRow(mainId, mainFormData, mainFormType, mainAtt, session, { linked_forms: linkedSummaries });

  extraRows.forEach(function(er){ er.history[0].note = 'Part of package ' + mainId; });

  var rows = [mainRow].concat(extraRows);
  var inserted = await rest('requisitions', { method:'POST', body: rows, prefer:'return=representation' });
  var main = (inserted || []).filter(function(r){ return r.id === mainId; })[0] || mainRow;
  return rowToRecord(main);
}
async function submitRequisition(formData, files, formType){
  return submitPackage(formData, files, formType, []);
}
async function submitAndLinkToPackage(formData, files, formType, parentPackageId){
  var session = requireSession();
  var att = (files && files.length) ? await uploadAllAttachments(files) : [];
  var id  = generateId();
  var row = buildRow(id, formData, formType, att, session,
             { parent_package_id: parentPackageId, is_linked_form: true, note: 'Added to package ' + parentPackageId + ' by ' + session.name });
  var inserted = await rest('requisitions', { method:'POST', body:[row], prefer:'return=representation' });
  try {
    await rpc('add_linked_form', { p_parent_id: parentPackageId, p_summary: {
      id: id, formType: formType, description: (formData && formData.description) || id, status:'Pending', submittedByName: session.name } });
  } catch(_){}
  return rowToRecord((inserted && inserted[0]) || row);
}

/* ============================================================
   Requisitions — mutations (all server-enforced via RPC)
============================================================ */
async function updateRequisitionStatus(id, newStatus, note){
  var r = await rpc('change_status', { p_id: id, p_new_status: newStatus, p_note: note || '' });
  return rowToRecord(r);
}
async function editRequisition(id, updatedData, files){
  var att = (files && files.length) ? await uploadAllAttachments(files) : [];
  var r = await rpc('edit_requisition', { p_id: id, p_data: updatedData, p_new_attachments: att });
  return rowToRecord(r);
}
async function attachFilesToRecord(recId, files){
  var att = await uploadAllAttachments(files);
  var r = await rpc('attach_files', { p_id: recId, p_atts: att });
  return rowToRecord(r);
}
async function addManagementNote(recId, noteText, files){
  var att = (files && files.length) ? await uploadAllAttachments(files) : [];
  return await rpc('add_management_note', { p_id: recId, p_text: noteText, p_atts: att });
}
async function addComment(reqId, text){ return await rpc('add_comment', { p_id: reqId, p_text: text }); }
async function addReply(reqId, commentId, text){ return await rpc('add_reply', { p_id: reqId, p_comment_id: commentId, p_text: text }); }
async function deleteRecord(recId){ await rpc('delete_requisition', { p_id: recId }); return true; }

/* ============================================================
   Archives
============================================================ */
function entryToFile(e){ return { recordId: e.record_id, name: e.name, formType: e.form_type,
  submittedByName: e.submitted_by_name, addedAt: e.added_at }; }

async function readArchives(){
  requireSession();
  var folders = await rest('archive_folders?select=*&order=created_at.desc');
  var entries = await rest('archive_entries?select=*');
  folders = folders || []; entries = entries || [];
  var out = { folders: [], unfiled: [] };
  folders.forEach(function(f){
    out.folders.push({ id: f.id, name: f.name, createdBy: f.created_by, createdByName: f.created_by_name,
      createdAt: f.created_at, files: entries.filter(function(e){ return e.folder_id === f.id; }).map(entryToFile) });
  });
  out.unfiled = entries.filter(function(e){ return !e.folder_id; }).map(entryToFile);
  return { data: out, sha: null };
}
async function createArchiveFolder(folderName, session){
  session = session || getSession();
  var rows = await rest('archive_folders', { method:'POST',
    body:[{ name: folderName, created_by: session.id, created_by_name: session.name }], prefer:'return=representation' });
  var f = (rows && rows[0]) || {};
  return { id: f.id, name: f.name, createdBy: f.created_by, createdByName: f.created_by_name, createdAt: f.created_at, files: [] };
}
async function renameArchiveFolder(folderId, newName){
  await rest('archive_folders?id=eq.' + encodeURIComponent(folderId), { method:'PATCH', body:{ name:newName }, prefer:'return=minimal' });
  return true;
}
async function moveFileToFolder(recordId, folderId){
  await rest('archive_entries?record_id=eq.' + encodeURIComponent(recordId), { method:'PATCH', body:{ folder_id: folderId }, prefer:'return=minimal' });
  return true;
}
async function renameArchivedFile(recordId, newName){
  await rest('archive_entries?record_id=eq.' + encodeURIComponent(recordId), { method:'PATCH', body:{ name:newName }, prefer:'return=minimal' });
  return true;
}
async function deleteArchiveFolder(folderId){
  await rest('archive_folders?id=eq.' + encodeURIComponent(folderId), { method:'DELETE', prefer:'return=minimal' });
  return true;
}
async function deleteArchivedFile(recordId){
  await rest('archive_entries?record_id=eq.' + encodeURIComponent(recordId), { method:'DELETE', prefer:'return=minimal' });
  return true;
}
async function autoArchiveRecord(_){ return {}; } /* handled server-side on approval */

/* ============================================================
   Export — same surface as before
============================================================ */
global.DataService = {
  CONFIG: CONFIG, ELEVATED: ELEVATED,
  getStaff: getStaff, getRole: getRole, getDisplayName: getDisplayName, getTitle: getTitle,
  canSeeAll: canSeeAll, canActionRequisition: canActionRequisition,
  getNextStatus: getNextStatus, getActionLabel: getActionLabel,
  authenticateUser: authenticateUser, changePassword: changePassword, isPasswordExpired: isPasswordExpired,
  saveSession: saveSession, getSession: getSession, clearSession: clearSession,
  isAuthenticated: isAuthenticated, requireSession: requireSession,
  filterByRole: filterByRole,
  uploadAttachment: uploadOne, uploadAllAttachments: uploadAllAttachments,
  readDatabase: readDatabase, getAllRequisitions: getAllRequisitions, getDashboardStats: getDashboardStats,
  submitPackage: submitPackage, submitRequisition: submitRequisition, submitAndLinkToPackage: submitAndLinkToPackage,
  updateRequisitionStatus: updateRequisitionStatus, editRequisition: editRequisition,
  attachFilesToRecord: attachFilesToRecord, addManagementNote: addManagementNote,
  addComment: addComment, addReply: addReply, deleteRecord: deleteRecord,
  readArchives: readArchives, createArchiveFolder: createArchiveFolder, renameArchiveFolder: renameArchiveFolder,
  moveFileToFolder: moveFileToFolder, renameArchivedFile: renameArchivedFile,
  deleteArchiveFolder: deleteArchiveFolder, deleteArchivedFile: deleteArchivedFile,
  autoArchiveRecord: autoArchiveRecord,
  generateId: generateId
};
}(window));
