/**
 * data.js - UBF Logistics & Procurement System
 * Token stored in localStorage key: ubf_gatekeeper_token
 */
(function(global){
'use strict';

var CONFIG={
  API_BASE        :'https://api.github.com',
  OWNER           :'CuePointe',
  REPO            :'UBF-Request-Portal',
  DB_PATH         :'data/requisitions.json',
  USERS_PATH      :'data/users.json',
  ARCHIVES_PATH   :'data/archives.json',
  BRANCH          :'main',
  SESSION_KEY     :'ubf_session',
  TOKEN_KEY       :'ubf_gatekeeper_token',
  PASS_EXPIRY_DAYS:90
};

var STAFF={
  'i.amani@ugandabiodiversityfund.org'    :{name:'Ivan Amanigaruhanga',role:'ED',           title:'Executive Director'},
  'w.nabatanzi@ugandabiodiversityfund.org':{name:'Winnie Nabatanzi',   role:'FAM',          title:'Finance and Administration Manager'},
  's.abonyo@ugandabiodiversityfund.org'   :{name:'Susan Abonyo',       role:'Admin Officer',title:'Administration Officer'},
  'd.okullu@ugandabiodiversityfund.org'   :{name:'David Okullu',       role:'Staff',        title:'M&E Officer'},
  'p.musiime@ugandabiodiversityfund.org'  :{name:'Posiano Musiime',    role:'Staff',        title:'Programs Officer'},
  'o.atuhaire@ugandabiodiversityfund.org' :{name:'Owen Atuhaire',      role:'Staff',        title:'Project Officer'},
  't.otieno@ugandabiodiversityfund.org'   :{name:'Tom Otieno',         role:'Staff',        title:'Office Assistant'}
};

var ELEVATED=['Admin Officer','Finance Officer','FAM','ED'];

var ROLE_ACTIONS={
  'Admin Officer'  :{canAction:['Pending'],            nextStatus:'Prepared', actionLabel:'Mark Prepared'},
  'Finance Officer':{canAction:['Prepared'],           nextStatus:'Reviewed', actionLabel:'Mark Reviewed'},
  'FAM'            :{canAction:['Prepared','Reviewed'],nextStatus:null,       actionLabel:null},
  'ED'             :{canAction:['Cleared'],            nextStatus:'Approved', actionLabel:'Approve'}
};

function getStaff(e){if(!e)return{name:'',role:'Staff',title:'Staff'};return STAFF[e.trim().toLowerCase()]||{name:e,role:'Staff',title:'Staff'};}
function getRole(e){return getStaff(e).role;}
function getDisplayName(e){return getStaff(e).name;}
function getTitle(e){return getStaff(e).title;}
function canSeeAll(r){return ELEVATED.indexOf(r)!==-1;}
function getNextStatus(role,status){
  if(role==='FAM'){if(status==='Prepared')return'Reviewed';if(status==='Reviewed')return'Cleared';}
  var a=ROLE_ACTIONS[role];return a?a.nextStatus:null;
}
function getActionLabel(role,status){
  if(role==='FAM'){if(status==='Prepared')return'Mark Reviewed';if(status==='Reviewed')return'Clear';}
  var a=ROLE_ACTIONS[role];return a?a.actionLabel:null;
}
function canActionRequisition(role,status){
  if(!role||!status)return false;
  var a=ROLE_ACTIONS[role];if(!a)return false;
  return a.canAction.indexOf(status)!==-1;
}

async function sha256(str){
  var buf=new TextEncoder().encode(str),hash=await crypto.subtle.digest('SHA-256',buf);
  return Array.from(new Uint8Array(hash)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
}
function isPasswordExpired(e){return e?new Date(e)<new Date():false;}
function newExpiryDate(){var d=new Date();d.setDate(d.getDate()+CONFIG.PASS_EXPIRY_DAYS);return d.toISOString().split('T')[0];}

function getToken(){return localStorage.getItem(CONFIG.TOKEN_KEY)||'';}
function buildApiUrl(p){return CONFIG.API_BASE+'/repos/'+CONFIG.OWNER+'/'+CONFIG.REPO+'/contents/'+p;}
function buildHeaders(){return{'Authorization':'token '+getToken(),'Content-Type':'application/json','Accept':'application/vnd.github.v3+json','X-GitHub-Api-Version':'2022-11-28'};}
function encodeB64(obj){return btoa(unescape(encodeURIComponent(JSON.stringify(obj,null,2))));}
function decodeB64(b64){return JSON.parse(decodeURIComponent(escape(atob(b64.replace(/[\n\r]/g,'')))));}
function generateId(){
  var n=new Date(),r=Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase().padStart(6,'0');
  return 'UBF-'+n.getFullYear()+String(n.getMonth()+1).padStart(2,'0')+String(n.getDate()).padStart(2,'0')+'-'+r;
}
function apiErr(s,m){
  if(s===401)return'Authentication failed. Check your token.';
  if(s===403)return"Permission denied. Token needs 'repo' scope.";
  if(s===404)return'File not found. Contact administrator.';
  if(s===409)return'Data conflict. Refresh and try again.';
  if(s===422)return'Sync error. Refresh and try again.';
  return'API error ('+s+'): '+(m||'Unknown');
}

async function readGHFile(path){
  var res=await fetch(buildApiUrl(path)+'?_='+Date.now(),{method:'GET',headers:buildHeaders()});
  if(!res.ok){var e={};try{e=await res.json();}catch(_){}throw new Error(apiErr(res.status,e.message));}
  var f=await res.json();var data;try{data=decodeB64(f.content);}catch(_){data=[];}
  return{data:data,sha:f.sha};
}
async function writeGHFile(path,data,sha,msg){
  var res=await fetch(buildApiUrl(path),{method:'PUT',headers:buildHeaders(),
    body:JSON.stringify({message:msg||'UBF update',content:encodeB64(data),sha:sha,branch:CONFIG.BRANCH})});
  if(!res.ok){var e={};try{e=await res.json();}catch(_){}throw new Error(apiErr(res.status,e.message));}
  return await res.json();
}

async function readDatabase(){var r=await readGHFile(CONFIG.DB_PATH);return{records:Array.isArray(r.data)?r.data:[],sha:r.sha};}
async function writeDatabase(records,sha,msg){return writeGHFile(CONFIG.DB_PATH,Array.isArray(records)?records:[],sha,msg);}

async function readUsers(){var r=await readGHFile(CONFIG.USERS_PATH);return{users:Array.isArray(r.data)?r.data:[],sha:r.sha};}
async function writeUsers(users,sha,msg){return writeGHFile(CONFIG.USERS_PATH,users,sha,msg);}

/* ── Archives ── */
async function readArchives(){
  try{
    var r=await readGHFile(CONFIG.ARCHIVES_PATH);
    /* Ensure data is always the correct {folders,unfiled} object */
    var d=r.data;
    if(!d||Array.isArray(d)||typeof d!=='object'){d={folders:[],unfiled:[]};}
    if(!d.folders)d.folders=[];
    if(!d.unfiled)d.unfiled=[];
    return{data:d,sha:r.sha};
  }catch(_){
    return{data:{folders:[],unfiled:[]},sha:null};
  }
}
async function writeArchives(data,sha,msg){
  /* Always re-read current sha before writing to avoid conflicts */
  try{
    var current=await readGHFile(CONFIG.ARCHIVES_PATH);
    sha=current.sha;
  }catch(_){sha=null;}
  var url=buildApiUrl(CONFIG.ARCHIVES_PATH);
  var body={message:msg||'Update archives',content:encodeB64(data),branch:CONFIG.BRANCH};
  if(sha)body.sha=sha;
  var res=await fetch(url,{method:'PUT',headers:buildHeaders(),body:JSON.stringify(body)});
  if(!res.ok){var e={};try{e=await res.json();}catch(_){}throw new Error(apiErr(res.status,e.message));}
  return await res.json();
}

/* Archives structure: {folders:[{id,name,createdBy,createdAt,files:[{recordId,name,addedAt}]}], unfiled:[{recordId,name,addedAt}]} */
async function autoArchiveRecord(record){
  var ar=await readArchives();
  var arch=ar.data&&typeof ar.data==='object'&&!Array.isArray(ar.data)?ar.data:{folders:[],unfiled:[]};
  if(!arch.folders)arch.folders=[];
  if(!arch.unfiled)arch.unfiled=[];
  var alreadyFiled=arch.unfiled.some(function(f){return f.recordId===record.id;})||
    arch.folders.some(function(folder){return folder.files&&folder.files.some(function(f){return f.recordId===record.id;});});
  if(!alreadyFiled){
    var desc=(record.data&&record.data.description)||record.id;
    arch.unfiled.push({recordId:record.id,name:desc,formType:record.formType,
      submittedByName:record.submittedByName,approvedAt:record.updatedAt,addedAt:new Date().toISOString()});
    await writeArchives(arch,ar.sha,'Auto-archive: '+record.id);
  }
  return arch;
}
async function createArchiveFolder(folderName,session){
  var ar=await readArchives();
  var arch=ar.data&&typeof ar.data==='object'&&!Array.isArray(ar.data)?ar.data:{folders:[],unfiled:[]};
  if(!arch.folders)arch.folders=[];
  if(!arch.unfiled)arch.unfiled=[];
  var folder={id:'FLD-'+Date.now(),name:folderName,createdBy:session.email,
    createdByName:session.name,createdAt:new Date().toISOString(),files:[]};
  arch.folders.push(folder);
  await writeArchives(arch,ar.sha,'Create folder: '+folderName+' by '+session.email);
  return folder;
}
async function renameArchiveFolder(folderId,newName,session){
  var ar=await readArchives();
  var arch=ar.data&&typeof ar.data==='object'&&!Array.isArray(ar.data)?ar.data:{folders:[],unfiled:[]};
  var idx=arch.folders.findIndex(function(f){return f.id===folderId;});
  if(idx===-1)throw new Error('Folder not found.');
  arch.folders[idx].name=newName;
  arch.folders[idx].renamedBy=session.email;
  arch.folders[idx].renamedAt=new Date().toISOString();
  await writeArchives(arch,ar.sha,'Rename folder to "'+newName+'" by '+session.email);
  return arch.folders[idx];
}
async function moveFileToFolder(recordId,folderId,session){
  var ar=await readArchives();
  var arch=ar.data&&typeof ar.data==='object'&&!Array.isArray(ar.data)?ar.data:{folders:[],unfiled:[]};
  var fileEntry=null;
  /* Remove from unfiled */
  var unfiledIdx=arch.unfiled.findIndex(function(f){return f.recordId===recordId;});
  if(unfiledIdx!==-1){fileEntry=arch.unfiled.splice(unfiledIdx,1)[0];}
  /* Remove from other folders */
  arch.folders.forEach(function(folder){
    var fi=folder.files.findIndex(function(f){return f.recordId===recordId;});
    if(fi!==-1&&!fileEntry){fileEntry=folder.files.splice(fi,1)[0];}
    else if(fi!==-1){folder.files.splice(fi,1);}
  });
  if(!fileEntry)throw new Error('File not found in archives.');
  /* Add to target folder */
  var targetIdx=arch.folders.findIndex(function(f){return f.id===folderId;});
  if(targetIdx===-1)throw new Error('Target folder not found.');
  fileEntry.movedBy=session.email;fileEntry.movedAt=new Date().toISOString();
  arch.folders[targetIdx].files.push(fileEntry);
  await writeArchives(arch,ar.sha,'Move '+recordId+' to folder '+arch.folders[targetIdx].name);
  return arch;
}
async function renameArchivedFile(recordId,newName,session){
  var ar=await readArchives();
  var arch=ar.data&&typeof ar.data==='object'&&!Array.isArray(ar.data)?ar.data:{folders:[],unfiled:[]};
  var found=false;
  arch.unfiled.forEach(function(f){if(f.recordId===recordId){f.name=newName;f.renamedBy=session.email;found=true;}});
  arch.folders.forEach(function(folder){
    folder.files.forEach(function(f){if(f.recordId===recordId){f.name=newName;f.renamedBy=session.email;found=true;}});
  });
  if(!found)throw new Error('File not found.');
  await writeArchives(arch,ar.sha,'Rename archived file '+recordId+' to "'+newName+'"');
  return arch;
}

/* ── Auth ── */
async function authenticateUser(email,password){
  var el=email.trim().toLowerCase(),hash=await sha256(password);
  var r=await readUsers(),user=r.users.find(function(u){return u.email.toLowerCase()===el;});
  if(!user)throw new Error('No account found for this email address.');
  if(!user.active)throw new Error('Account deactivated. Contact administrator.');
  if(user.passwordHash!==hash)throw new Error('Incorrect password. Please try again.');
  return{user:user,usersSha:r.sha,allUsers:r.users};
}
async function changePassword(email,newPass){
  var r=await readUsers();
  var idx=r.users.findIndex(function(u){return u.email.toLowerCase()===email.toLowerCase();});
  if(idx===-1)throw new Error('User not found.');
  r.users[idx].passwordHash=await sha256(newPass);r.users[idx].passwordExpiry=newExpiryDate();r.users[idx].mustChangePassword=false;
  await writeUsers(r.users,r.sha,'Password changed for '+email);return true;
}

/* ── Session ── */
function saveSession(user){
  var s={email:user.email,name:user.name,role:user.role,title:user.title,
    loginAt:new Date().toISOString(),expiresAt:new Date(Date.now()+8*3600000).toISOString()};
  localStorage.setItem(CONFIG.SESSION_KEY,JSON.stringify(s));return s;
}
function getSession(){
  try{
    var raw=localStorage.getItem(CONFIG.SESSION_KEY);if(!raw)return null;
    var s=JSON.parse(raw);if(new Date(s.expiresAt)<new Date()){clearSession();return null;}return s;
  }catch(_){return null;}
}
function clearSession(){localStorage.removeItem(CONFIG.SESSION_KEY);}
function isAuthenticated(){return!!getSession();}
function requireSession(){var s=getSession();if(!s)throw new Error('Session expired. Please log in again.');return s;}

/* ── Filtering ── */
function filterByRole(records,session){
  if(!Array.isArray(records)||!session)return[];
  if(canSeeAll(session.role))return records;
  return records.filter(function(r){return r.submittedBy&&r.submittedBy.toLowerCase()===session.email.toLowerCase();});
}

/* ── File upload ── */
function uploadAttachment(file){
  return new Promise(function(resolve,reject){
    var reader=new FileReader();
    reader.onerror=function(){reject(new Error('Cannot read: '+file.name));};
    reader.onload=async function(evt){
      try{
        var b64=evt.target.result.split(',')[1];
        var safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
        var path='attachments/'+Date.now()+'_'+safe;
        var res=await fetch(buildApiUrl(path),{method:'PUT',headers:buildHeaders(),
          body:JSON.stringify({message:'Attachment: '+safe,content:b64,branch:CONFIG.BRANCH})});
        if(!res.ok){var e={};try{e=await res.json();}catch(_){}throw new Error(apiErr(res.status,e.message));}
        var result=await res.json();
        resolve({path:path,downloadUrl:result.content.html_url,name:file.name,size:file.size,uploadedAt:new Date().toISOString()});
      }catch(err){reject(err);}
    };
    reader.readAsDataURL(file);
  });
}
async function uploadAllAttachments(fileList){
  var results=[],files=Array.isArray(fileList)?fileList:Array.from(fileList||[]);
  for(var i=0;i<files.length;i++)results.push(await uploadAttachment(files[i]));
  return results;
}

/* ── Build a single record object ── */
function buildRecord(formData,files_att,formType,session,now,linkedSummaries){
  return{
    id:generateId(),formType:formType||'request',data:formData,
    submittedBy:session.email,submittedByName:session.name,
    submittedByTitle:session.title,submittedByRole:session.role,
    status:'Pending',attachments:files_att||[],comments:[],
    linkedForms:linkedSummaries||[],managementNotes:[],
    createdAt:now,updatedAt:now,
    approval:{
      preparation:{status:'Pending',by:'',byName:'',at:'',note:''},
      review     :{status:'Pending',by:'',byName:'',at:'',note:''},
      clearance  :{status:'Pending',by:'',byName:'',at:'',note:''},
      approval   :{status:'Pending',by:'',byName:'',at:'',note:''}
    },
    history:[{action:'Submitted',by:session.email,byName:session.name,byTitle:session.title,at:now,note:'Initial submission'}]
  };
}

/* ── Submit a package (one or more forms together) ── */
async function submitPackage(mainFormData,mainFiles,mainFormType,extraForms){
  /* extraForms: array of {formData, files, formType} */
  var session=requireSession();
  var db=await readDatabase();
  var now=new Date().toISOString();

  /* 1. Upload main attachments */
  var mainAtt=[];
  if(mainFiles&&mainFiles.length>0)mainAtt=await uploadAllAttachments(Array.from(mainFiles));

  /* 2. Build + save extra form records first */
  var linkedSummaries=[];
  var extraRecords=[];
  for(var i=0;i<(extraForms||[]).length;i++){
    var ef=extraForms[i];
    var efAtt=[];
    if(ef.files&&ef.files.length>0)efAtt=await uploadAllAttachments(Array.from(ef.files));
    var efRec=buildRecord(ef.formData,efAtt,ef.formType,session,now,[]);
    extraRecords.push(efRec);
    linkedSummaries.push({id:efRec.id,formType:efRec.formType,
      description:(ef.formData&&ef.formData.description)||efRec.id,status:'Pending',
      submittedByName:session.name});
  }

  /* 3. Build main record with links */
  var mainRec=buildRecord(mainFormData,mainAtt,mainFormType,session,now,linkedSummaries);

  /* 4. Update extra records to reference main */
  extraRecords.forEach(function(er){
    er.history[0].note='Part of package '+mainRec.id;
  });

  /* 5. Save all to database */
  db.records.push(mainRec);
  extraRecords.forEach(function(er){db.records.push(er);});
  await writeDatabase(db.records,db.sha,'Package: '+mainRec.id+' ('+db.records.length+' total)');

  return mainRec;
}

/* ── Submit single form (used when adding a form to an existing package) ── */
async function submitAndLinkToPackage(formData,files,formType,parentPackageId){
  var session=requireSession();
  var db=await readDatabase();
  var now=new Date().toISOString();

  /* Upload attachments */
  var att=[];
  if(files&&files.length>0)att=await uploadAllAttachments(Array.from(files));

  /* Build new record */
  var rec=buildRecord(formData,att,formType,session,now,[]);
  rec.history[0].note='Added to package '+parentPackageId+' by '+session.name;
  db.records.push(rec);

  /* Link to parent */
  var parentIdx=db.records.findIndex(function(r){return r.id===parentPackageId;});
  if(parentIdx!==-1){
    if(!Array.isArray(db.records[parentIdx].linkedForms))db.records[parentIdx].linkedForms=[];
    db.records[parentIdx].linkedForms.push({id:rec.id,formType:rec.formType,
      description:(formData&&formData.description)||rec.id,status:'Pending',submittedByName:session.name});
    db.records[parentIdx].updatedAt=now;
    db.records[parentIdx].history.push({action:'Form Added to Package',by:session.email,byName:session.name,
      byTitle:session.title,at:now,note:formType+' ('+rec.id+') added by '+session.name});
  }

  await writeDatabase(db.records,db.sha,'Add '+formType+' to package '+parentPackageId);
  return rec;
}

/* ── Standard single submit (backward compat) ── */
async function submitRequisition(formData,files,formType,linkedIds){
  return submitPackage(formData,files,formType,[]);
}

/* ── Status update ── */
async function updateRequisitionStatus(id,newStatus,note){
  var session=requireSession(),db=await readDatabase();
  var idx=db.records.findIndex(function(r){return r.id===id;});
  if(idx===-1)throw new Error('Requisition not found: '+id);
  if(!canActionRequisition(session.role,db.records[idx].status))throw new Error('Your role cannot action this at its current status.');
  var now=new Date().toISOString();
  db.records[idx].status=newStatus;db.records[idx].updatedAt=now;
  var stepMap={Prepared:'preparation',Reviewed:'review',Cleared:'clearance',Approved:'approval'};
  var step=stepMap[newStatus];
  if(step)db.records[idx].approval[step]={status:newStatus,by:session.email,byName:session.name,at:now,note:note||''};
  db.records[idx].history.push({action:newStatus,by:session.email,byName:session.name,byTitle:session.title,at:now,note:note||''});
  await writeDatabase(db.records,db.sha,'Status: '+id+' -> '+newStatus+' by '+session.email);
  /* Auto-archive on approval */
  if(newStatus==='Approved'){try{await autoArchiveRecord(db.records[idx]);}catch(_){}}
  return db.records[idx];
}

/* ── Edit ── */
async function editRequisition(id,updatedData,files){
  var session=requireSession(),db=await readDatabase();
  var idx=db.records.findIndex(function(r){return r.id===id;});
  if(idx===-1)throw new Error('Not found: '+id);
  var rec=db.records[idx];
  if(rec.submittedBy.toLowerCase()!==session.email.toLowerCase())throw new Error('You can only edit your own submissions.');
  if(['Prepared','Reviewed','Cleared','Approved'].indexOf(rec.status)!==-1)throw new Error('This submission is in progress and cannot be edited.');
  var newAtt=[];
  if(files&&files.length>0)newAtt=await uploadAllAttachments(Array.from(files));
  var now=new Date().toISOString();
  db.records[idx].data=updatedData;db.records[idx].status='Pending';db.records[idx].updatedAt=now;
  db.records[idx].attachments=rec.attachments.concat(newAtt);
  db.records[idx].approval={preparation:{status:'Pending',by:'',byName:'',at:'',note:''},review:{status:'Pending',by:'',byName:'',at:'',note:''},clearance:{status:'Pending',by:'',byName:'',at:'',note:''},approval:{status:'Pending',by:'',byName:'',at:'',note:''}};
  db.records[idx].history.push({action:'Edited & Resubmitted',by:session.email,byName:session.name,byTitle:session.title,at:now,note:'Corrected and resubmitted'});
  await writeDatabase(db.records,db.sha,'Edit: '+id+' by '+session.email);
  return db.records[idx];
}

/* ── Attach files to existing record ── */
async function attachFilesToRecord(recId,files){
  var session=requireSession(),db=await readDatabase();
  var idx=db.records.findIndex(function(r){return r.id===recId;});
  if(idx===-1)throw new Error('Not found.');
  var uploaded=await uploadAllAttachments(Array.from(files));
  db.records[idx].attachments=db.records[idx].attachments.concat(uploaded);
  db.records[idx].updatedAt=new Date().toISOString();
  db.records[idx].history.push({action:'Files Attached',by:session.email,byName:session.name,byTitle:session.title,at:new Date().toISOString(),note:uploaded.length+' file(s) attached'});
  await writeDatabase(db.records,db.sha,'Attachments: '+recId+' by '+session.email);
  return db.records[idx];
}

/* ── Management note ── */
async function addManagementNote(recId,noteText,files){
  var session=requireSession();
  if(ELEVATED.indexOf(session.role)===-1)throw new Error('Management notes are for Admin Officer, FAM and ED only.');
  var db=await readDatabase();
  var idx=db.records.findIndex(function(r){return r.id===recId;});
  if(idx===-1)throw new Error('Not found.');
  var noteAtts=[];
  if(files&&files.length>0)noteAtts=await uploadAllAttachments(Array.from(files));
  if(!Array.isArray(db.records[idx].managementNotes))db.records[idx].managementNotes=[];
  var note={id:'MN-'+Date.now(),by:session.email,byName:session.name,byRole:session.role,byTitle:session.title,note:noteText,attachments:noteAtts,at:new Date().toISOString()};
  db.records[idx].managementNotes.push(note);
  if(noteAtts.length)db.records[idx].attachments=db.records[idx].attachments.concat(noteAtts);
  db.records[idx].updatedAt=new Date().toISOString();
  await writeDatabase(db.records,db.sha,'Mgmt note: '+recId+' by '+session.email);
  return note;
}

/* ── Comments ── */
async function addComment(reqId,text){
  var session=requireSession(),db=await readDatabase();
  var idx=db.records.findIndex(function(r){return r.id===reqId;});if(idx===-1)throw new Error('Not found.');
  if(!Array.isArray(db.records[idx].comments))db.records[idx].comments=[];
  var c={id:'CMT-'+Date.now(),by:session.email,byName:session.name,byRole:session.role,text:text,at:new Date().toISOString(),replies:[]};
  db.records[idx].comments.push(c);db.records[idx].updatedAt=new Date().toISOString();
  await writeDatabase(db.records,db.sha,'Comment: '+reqId);return c;
}
async function addReply(reqId,commentId,text){
  var session=requireSession(),db=await readDatabase();
  var idx=db.records.findIndex(function(r){return r.id===reqId;});if(idx===-1)throw new Error('Not found.');
  var ci=(db.records[idx].comments||[]).findIndex(function(c){return c.id===commentId;});if(ci===-1)throw new Error('Comment not found.');
  var r={id:'RPL-'+Date.now(),by:session.email,byName:session.name,byRole:session.role,text:text,at:new Date().toISOString()};
  db.records[idx].comments[ci].replies.push(r);db.records[idx].updatedAt=new Date().toISOString();
  await writeDatabase(db.records,db.sha,'Reply: '+reqId);return r;
}

/* ── Queries ── */
async function getAllRequisitions(){
  var session=requireSession(),db=await readDatabase();
  var visible=filterByRole(db.records,session);
  if(!Array.isArray(visible))return[];
  return visible.sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);});
}
async function getDashboardStats(){
  var records=await getAllRequisitions();
  if(!Array.isArray(records))return{total:0,pending:0,prepared:0,reviewed:0,cleared:0,approved:0,rejected:0};
  var s={total:records.length,pending:0,prepared:0,reviewed:0,cleared:0,approved:0,rejected:0};
  records.forEach(function(r){
    var st=(r.status||'').toLowerCase();
    if(st==='pending')s.pending++;
    else if(st==='prepared')s.prepared++;
    else if(st==='reviewed')s.reviewed++;
    else if(st==='cleared')s.cleared++;
    else if(st==='approved')s.approved++;
    else if(st==='rejected')s.rejected++;
  });
  return s;
}

global.DataService={
  CONFIG,ROLE_ACTIONS,ELEVATED,
  getStaff,getRole,getDisplayName,getTitle,
  canSeeAll,canActionRequisition,getNextStatus,getActionLabel,
  authenticateUser,changePassword,sha256,isPasswordExpired,
  saveSession,getSession,clearSession,isAuthenticated,requireSession,
  readGitHubFile:readGHFile,writeGitHubFile:writeGHFile,
  readDatabase,writeDatabase,readUsers,writeUsers,
  readArchives,writeArchives,autoArchiveRecord,
  createArchiveFolder,renameArchiveFolder,moveFileToFolder,renameArchivedFile,
  uploadAttachment,uploadAllAttachments,
  submitPackage,submitRequisition,submitAndLinkToPackage,
  updateRequisitionStatus,editRequisition,attachFilesToRecord,addManagementNote,
  addComment,addReply,getAllRequisitions,getDashboardStats
};
}(window));
