/**
 * script.js - UBF Logistics & Procurement System
 */

/* Token setup — never fires on login page */
(function(){
  var K='ubf_gatekeeper_token';
  if(!localStorage.getItem(K)){
    /* Only prompt when NOT on the login page */
    var path=location.pathname;
    var onLogin=path.slice(-1)==='/'||path.indexOf('index.html')!==-1||path.slice(-1)==='l'&&path.indexOf('index')!==-1;
    if(!onLogin){
      var t=prompt('System Setup - Enter the Access Key provided by your administrator:');
      if(t&&t.trim().indexOf('ghp_')===0){localStorage.setItem(K,t.trim());location.reload();}
      else if(t!==null){alert('Invalid key. Contact t.otieno@ugandabiodiversityfund.org');}
    }
  }
}());

(function(){
'use strict';
if(!window.DataService){console.error('data.js must load before script.js');return;}
var DS=window.DataService;
var FR=window.FormRenderer;

/* --- Utilities --- */
function $id(id){return document.getElementById(id);}
function go(page){var d=location.pathname;location.href=d.substring(0,d.lastIndexOf('/')+1)+page;}
function showBanner(msg,type){
  var id=type==='error'?'global-error-banner':'global-success-banner';
  var el=$id(id);if(!el){alert(msg);return;}
  el.textContent=msg;el.style.display='block';
  if(type==='success')setTimeout(function(){el.style.display='none';},7000);
}
function hideBanners(){
  ['global-error-banner','global-success-banner'].forEach(function(id){
    var el=$id(id);if(el)el.style.display='none';
  });
}
function fv(id){var el=$id(id);return el&&el.value?el.value.trim():'';}
function esc(s){
  if(s===null||s===undefined)return'';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fmtDate(iso){
  if(!iso)return'-';
  try{return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}catch(_){return iso;}
}
function fmtDT(iso){
  if(!iso)return'-';
  try{return new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(_){return iso;}
}
function stCls(st){
  var m={pending:'status-pending',prepared:'status-inreview',reviewed:'status-inreview',cleared:'status-inreview',approved:'status-approved',rejected:'status-rejected'};
  return m[(st||'').toLowerCase()]||'status-pending';
}
function ftLbl(t){
  var m={request:'Request for Goods/Services',travel:'Travel Business Plan',accountability:'Accountability',evaluation:'Evaluation Report',lpo:'Local Purchase Order',grn:'Goods Received Note',invoice:'Payment Voucher'};
  return m[t]||t||'Form';
}
function enforceAuth(){if(!DS.isAuthenticated()){go('index.html');return false;}return true;}
function navbar(){
  try{
    var s=DS.getSession();if(!s)return;
    var n=$id('nav-user-name'),r=$id('nav-user-role');
    if(n)n.textContent=s.name||s.email;
    if(r){r.textContent=s.role;r.className='role-badge role-'+s.role.toLowerCase().replace(/\s+/g,'-');}
    var ml=$id('mgmt-links');
    if(ml&&DS.ELEVATED.indexOf(s.role)!==-1)ml.style.display='flex';
  }catch(_){}
}
function wireLogout(){
  var b=$id('btn-logout');
  if(b)b.addEventListener('click',function(){DS.clearSession();go('index.html');});
}

/* --- Modal --- */
function openModal(html){
  var o=$id('modal-overlay'),c=$id('modal-content');
  if(!o||!c)return;
  c.innerHTML=html;o.style.display='flex';document.body.style.overflow='hidden';
  /* Wire inline form panels every time modal opens */
  setTimeout(wireInlinePanels,0);
  /* Populate archive folder dropdown if present */
  setTimeout(function(){
    var sel=document.querySelector('[id^="archive-folder-sel-"]');
    if(!sel||sel.options.length>1)return;
    DS.readArchives().then(function(ar){
      var arch=ar.data&&typeof ar.data==='object'&&!Array.isArray(ar.data)?ar.data:{folders:[],unfiled:[]};
      (arch.folders||[]).forEach(function(f){
        var opt=document.createElement('option');
        opt.value=f.id;opt.textContent=f.name;
        sel.appendChild(opt);
      });
      if(sel.options.length===1){
        var opt=document.createElement('option');
        opt.disabled=true;opt.textContent='No folders yet - go to Archive to create one';
        sel.appendChild(opt);
      }
    }).catch(function(){});
  },150);
}
function closeModal(){
  var o=$id('modal-overlay');
  if(o)o.style.display='none';
  document.body.style.overflow='';
}
function wireModal(){
  var b=$id('btn-modal-close'),o=$id('modal-overlay');
  if(b)b.addEventListener('click',closeModal);
  if(o)o.addEventListener('click',function(e){if(e.target===o)closeModal();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
}

/* ====================================
   INLINE FORM PANELS — attach any form to any package
   Available to ALL roles at ANY stage before approval
==================================== */
function buildInlineFormPanels(recId){
  function panel(id,title,body){
    return '<div style="border:1px solid var(--ubf-blue-light);border-radius:var(--radius-sm);margin-bottom:0.5rem;overflow:hidden;">'+
      '<div style="background:var(--ubf-blue-pale);padding:0.5rem 0.85rem;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" class="ipanel-toggle">'+
        '<span style="font-size:0.85rem;font-weight:700;color:var(--ubf-blue-darker);">+ '+title+'</span>'+
        '<span style="font-size:0.72rem;color:var(--gray-500);">Click to expand / collapse</span>'+
      '</div>'+
      '<div class="ipanel-body" style="display:none;padding:0.85rem 1rem;background:var(--white);">'+
        body+
        '<div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--gray-200);">'+
          '<label style="font-size:0.73rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--gray-700);display:block;margin-bottom:0.3rem;">Attachments for this form</label>'+
          '<input type="file" class="ipanel-files" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"/>'+
          '<div class="file-info ipanel-file-info"></div>'+
        '</div>'+
        '<button type="button" class="btn btn-primary btn-sm btn-save-inline-form" data-recid="'+recId+'" data-formtype="'+id+'" style="margin-top:0.6rem;">Save &amp; Add to Package</button>'+
        '<div class="ipanel-result" style="font-size:0.78rem;margin-top:0.35rem;"></div>'+
      '</div>'+
    '</div>';
  }

  function row(label,inputHtml){
    return '<div style="display:flex;flex-direction:column;gap:0.2rem;margin-bottom:0.6rem;">'+
      '<label style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--gray-700);">'+label+'</label>'+
      inputHtml+
    '</div>';
  }
  function inp(id,type,placeholder,required){
    return '<input type="'+(type||'text')+'" id="ip-'+id+'" placeholder="'+(placeholder||'')+'" '+(required?'required':'')+' style="padding:0.45rem 0.7rem;border:1.5px solid var(--gray-300);border-radius:var(--radius-sm);font-family:var(--font-body);font-size:0.85rem;width:100%;"/>';
  }
  function ta(id,rows,placeholder){
    return '<textarea id="ip-'+id+'" rows="'+(rows||2)+'" placeholder="'+(placeholder||'')+'" style="padding:0.45rem 0.7rem;border:1.5px solid var(--gray-300);border-radius:var(--radius-sm);font-family:var(--font-body);font-size:0.85rem;width:100%;resize:vertical;"></textarea>';
  }
  function sel(id,opts){
    return '<select id="ip-'+id+'" style="padding:0.45rem 0.7rem;border:1.5px solid var(--gray-300);border-radius:var(--radius-sm);font-family:var(--font-body);font-size:0.85rem;width:100%;">'+opts+'</select>';
  }
  function grid(){return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.6rem;">';}
  var ge='</div>';

  /* Travel Business Plan */
  var travelBody=
    grid()+
      '<div>'+row('Traveller Name *',inp('t-name','text','Full name',true))+'</div>'+
      '<div>'+row('Position / Grade',inp('t-position','text','Title'))+'</div>'+
      '<div>'+row('Departure Date *',inp('t-dep','date','',true))+'</div>'+
      '<div>'+row('Return Date *',inp('t-ret','date','',true))+'</div>'+
    ge+
    row('Business Reason / Purpose *',ta('t-reason',2,'Purpose of the trip',true))+
    '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--ubf-blue-darker);margin:0.5rem 0 0.3rem;">Route & Costs</div>'+
    '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;" id="ip-t-routes">'+
      '<thead><tr>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);font-size:0.72rem;">#</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Route</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Date</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Per Diem</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Accommodation</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Others</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Total</th>'+
        '<th style="background:var(--ubf-blue-light);padding:0.35rem 0.2rem;border:1px solid var(--gray-300);"></th>'+
      '</tr></thead>'+
      '<tbody id="ip-t-route-body"></tbody>'+
    '</table></div>'+
    '<button type="button" class="btn-add-irow" data-tbody="ip-t-route-body" data-type="travel-route" style="font-size:0.72rem;color:var(--ubf-blue-dark);background:var(--ubf-blue-pale);border:1px dashed var(--ubf-blue);border-radius:4px;padding:0.2rem 0.6rem;cursor:pointer;margin-top:3px;">+ Add Route</button>'+
    '<div style="text-align:right;margin-top:0.35rem;font-size:0.82rem;font-weight:700;color:var(--ubf-blue-darker);">Grand Total (UGX): <span id="ip-t-grand-total">0</span></div>';

  /* Accountability */
  var accBody=
    grid()+
      '<div>'+row('Employee Name *',inp('acc-name','text','Full name',true))+'</div>'+
      '<div>'+row('Date',inp('acc-date','date'))+'</div>'+
    ge+
    row('Dates of Travel / Activity *',inp('acc-dates','text','e.g. 15th to 19th May 2026',true))+
    row('Purpose *',ta('acc-purpose',2,'Purpose of the trip',true))+
    '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--ubf-blue-darker);margin:0.5rem 0 0.3rem;">Expenses</div>'+
    '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">'+
      '<thead><tr>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);font-size:0.72rem;">#</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Explanation</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Date</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Budgeted</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Actual</th>'+
        '<th style="background:var(--ubf-blue-light);padding:0.35rem 0.2rem;border:1px solid var(--gray-300);"></th>'+
      '</tr></thead>'+
      '<tbody id="ip-acc-exp-body"></tbody>'+
    '</table></div>'+
    '<button type="button" class="btn-add-irow" data-tbody="ip-acc-exp-body" data-type="acc-expense" style="font-size:0.72rem;color:var(--ubf-blue-dark);background:var(--ubf-blue-pale);border:1px dashed var(--ubf-blue);border-radius:4px;padding:0.2rem 0.6rem;cursor:pointer;margin-top:3px;">+ Add Expense Row</button>'+
    row('Advance Received (UGX)',inp('acc-advance','number','0.00'));

  /* Evaluation Report */
  var evalBody=
    row('Item Description / Specification *',ta('ev-desc',2,'What is being evaluated',true))+
    row('Procurement Method *',sel('ev-method','<option value="">Select...</option><option>Direct Procurement</option><option>Request for Quotations (RFQ)</option><option>Request for Proposals (RFP)</option><option>Open Tender</option>'))+
    row('Suppliers Who Responded *',ta('ev-suppliers',2,'List suppliers',true))+
    row('Recommendations *',ta('ev-rec',2,'Recommended supplier and reason',true))+
    '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--ubf-blue-darker);margin:0.5rem 0 0.3rem;">Price Comparison</div>'+
    '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">'+
      '<thead><tr>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">#</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Item</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Qty</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Supplier 1</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Supplier 2</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Supplier 3</th>'+
        '<th style="background:var(--ubf-blue-light);padding:0.35rem 0.2rem;border:1px solid var(--gray-300);"></th>'+
      '</tr></thead>'+
      '<tbody id="ip-ev-items-body"></tbody>'+
    '</table></div>'+
    '<button type="button" class="btn-add-irow" data-tbody="ip-ev-items-body" data-type="eval-item" style="font-size:0.72rem;color:var(--ubf-blue-dark);background:var(--ubf-blue-pale);border:1px dashed var(--ubf-blue);border-radius:4px;padding:0.2rem 0.6rem;cursor:pointer;margin-top:3px;">+ Add Item Row</button>';

  /* LPO */
  var lpoBody=
    grid()+
      '<div>'+row('Vendor Name *',inp('lpo-vendor','text','Vendor / Supplier name',true))+'</div>'+
      '<div>'+row('Date',inp('lpo-date','date'))+'</div>'+
      '<div>'+row('Deliver At',inp('lpo-deliver','text','Delivery location'))+'</div>'+
      '<div>'+row('Terms of Payment',inp('lpo-terms','text','e.g. 30 days net'))+'</div>'+
    ge+
    '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--ubf-blue-darker);margin:0.5rem 0 0.3rem;">Items</div>'+
    '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">'+
      '<thead><tr>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">#</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Description</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Qty</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Unit</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Unit Price</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Total</th>'+
        '<th style="background:var(--ubf-blue-light);padding:0.35rem 0.2rem;border:1px solid var(--gray-300);"></th>'+
      '</tr></thead>'+
      '<tbody id="ip-lpo-items-body"></tbody>'+
    '</table></div>'+
    '<button type="button" class="btn-add-irow" data-tbody="ip-lpo-items-body" data-type="lpo-item" style="font-size:0.72rem;color:var(--ubf-blue-dark);background:var(--ubf-blue-pale);border:1px dashed var(--ubf-blue);border-radius:4px;padding:0.2rem 0.6rem;cursor:pointer;margin-top:3px;">+ Add Item</button>'+
    '<div style="text-align:right;margin-top:0.35rem;font-size:0.82rem;font-weight:700;color:var(--ubf-blue-darker);">Total (incl. VAT): <span id="ip-lpo-total">0</span></div>';

  /* GRN */
  var grnBody=
    grid()+
      '<div>'+row('Vendor Name *',inp('grn-vendor','text','Supplier name',true))+'</div>'+
      '<div>'+row('Date',inp('grn-date','date'))+'</div>'+
      '<div>'+row('Delivery Note No.',inp('grn-delivery','text','Delivery note number'))+'</div>'+
      '<div>'+row('Related LPO No.',inp('grn-lpo','text','LPO reference'))+'</div>'+
    ge+
    '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--ubf-blue-darker);margin:0.5rem 0 0.3rem;">Items Received</div>'+
    '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">'+
      '<thead><tr>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">#</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Description</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Qty</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Unit</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Condition</th>'+
        '<th style="background:var(--ubf-blue-light);padding:0.35rem 0.2rem;border:1px solid var(--gray-300);"></th>'+
      '</tr></thead>'+
      '<tbody id="ip-grn-items-body"></tbody>'+
    '</table></div>'+
    '<button type="button" class="btn-add-irow" data-tbody="ip-grn-items-body" data-type="grn-item" style="font-size:0.72rem;color:var(--ubf-blue-dark);background:var(--ubf-blue-pale);border:1px dashed var(--ubf-blue);border-radius:4px;padding:0.2rem 0.6rem;cursor:pointer;margin-top:3px;">+ Add Item</button>';

  /* Invoice */
  var invBody=
    grid()+
      '<div>'+row('Payee *',inp('inv-payee','text','Name of payee',true))+'</div>'+
      '<div>'+row('Date',inp('inv-date','date'))+'</div>'+
      '<div>'+row('Cheque No.',inp('inv-cheque','text','Cheque number'))+'</div>'+
      '<div>'+row('Voucher No.',inp('inv-voucher','text','Voucher number'))+'</div>'+
    ge+
    '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--ubf-blue-darker);margin:0.5rem 0 0.3rem;">Payment Particulars</div>'+
    '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">'+
      '<thead><tr>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">#</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Payment Particulars</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Acc Code</th>'+
        '<th style="background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.35rem 0.4rem;border:1px solid var(--gray-300);">Amount (UGX)</th>'+
        '<th style="background:var(--ubf-blue-light);padding:0.35rem 0.2rem;border:1px solid var(--gray-300);"></th>'+
      '</tr></thead>'+
      '<tbody id="ip-inv-parts-body"></tbody>'+
    '</table></div>'+
    '<button type="button" class="btn-add-irow" data-tbody="ip-inv-parts-body" data-type="inv-part" style="font-size:0.72rem;color:var(--ubf-blue-dark);background:var(--ubf-blue-pale);border:1px dashed var(--ubf-blue);border-radius:4px;padding:0.2rem 0.6rem;cursor:pointer;margin-top:3px;">+ Add Row</button>'+
    '<div style="text-align:right;margin-top:0.35rem;font-size:0.82rem;font-weight:700;color:var(--ubf-blue-darker);">Total (UGX): <span id="ip-inv-total">0</span></div>'+
    row('Amount in Words',inp('inv-words','text','e.g. Nine Hundred Thousand Uganda Shillings only'));

  return '<div style="margin-bottom:1rem;background:var(--ubf-green-pale);border:1px solid var(--ubf-green-light);border-radius:var(--radius-sm);padding:0.85rem 1rem;">'+
    '<div style="font-size:0.8rem;font-weight:700;text-transform:uppercase;color:var(--ubf-green-dark);letter-spacing:0.05em;margin-bottom:0.35rem;">Add Forms to This Package</div>'+
    '<p style="font-size:0.78rem;color:var(--gray-500);margin-bottom:0.65rem;">Expand any form below, fill it and click Save. Add as many as needed.</p>'+
    panel('travel',       'Travel Business Plan',               travelBody)+
    panel('accountability','Accountability &amp; Expense Report', accBody)+
    panel('evaluation',   'Evaluation Report',                  evalBody)+
    panel('lpo',          'Local Purchase Order',               lpoBody)+
    panel('grn',          'Goods Received Note',                grnBody)+
    panel('invoice',      'Payment Voucher',                    invBody)+
  '</div>';
}

/* ====================================
   INLINE ROW TEMPLATES
==================================== */
function makeInlineRow(type,n){
  var td='style="border:1px solid var(--gray-300);padding:0.15rem 0.35rem;"';
  var ti='style="width:100%;border:none;outline:none;font-family:var(--font-body);font-size:0.8rem;background:transparent;"';
  var del='<td '+td+'><button type="button" class="del-irow" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.82rem;">x</button></td>';
  var num='<td '+td+' style="text-align:center;color:var(--gray-500);font-size:0.75rem;border:1px solid var(--gray-300);padding:0.25rem;">'+n+'</td>';
  if(type==='travel-route'){
    return num+
      '<td '+td+'><input '+ti+' class="ir-route" placeholder="From - To"/></td>'+
      '<td '+td+'><input type="date" '+ti+' class="ir-date"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-cost ir-perdiem" step="0.01" min="0" placeholder="0"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-cost ir-accom" step="0.01" min="0" placeholder="0"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-cost ir-others" step="0.01" min="0" placeholder="0"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-total" readonly style="width:100%;border:none;outline:none;font-size:0.8rem;font-weight:600;background:transparent;"/></td>'+
      del;
  }
  if(type==='acc-expense'){
    return num+
      '<td '+td+'><input '+ti+' class="ir-explanation" placeholder="Brief explanation"/></td>'+
      '<td '+td+'><input type="date" '+ti+' class="ir-date"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-budgeted ir-cost" step="0.01" min="0" placeholder="0"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-actual ir-cost" step="0.01" min="0" placeholder="0"/></td>'+
      del;
  }
  if(type==='eval-item'){
    return num+
      '<td '+td+'><input '+ti+' class="ir-item" placeholder="Item description"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-qty" step="1" min="0" placeholder="0"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-s1 ir-cost" step="0.01" min="0" placeholder="0"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-s2 ir-cost" step="0.01" min="0" placeholder="0"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-s3 ir-cost" step="0.01" min="0" placeholder="0"/></td>'+
      del;
  }
  if(type==='lpo-item'){
    return num+
      '<td '+td+'><input '+ti+' class="ir-desc" placeholder="Item description"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-qty" step="1" min="0" placeholder="0"/></td>'+
      '<td '+td+'><input '+ti+' class="ir-unit" placeholder="pcs"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-price ir-cost" step="0.01" min="0" placeholder="0"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-linetotal" readonly style="width:100%;border:none;outline:none;font-size:0.8rem;font-weight:600;background:transparent;"/></td>'+
      del;
  }
  if(type==='grn-item'){
    return num+
      '<td '+td+'><input '+ti+' class="ir-desc" placeholder="Item description"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-qty" step="0.01" min="0" placeholder="0"/></td>'+
      '<td '+td+'><input '+ti+' class="ir-unit" placeholder="pcs"/></td>'+
      '<td '+td+'><input '+ti+' class="ir-condition" placeholder="Good/Damaged"/></td>'+
      del;
  }
  if(type==='inv-part'){
    return num+
      '<td '+td+'><input '+ti+' class="ir-particulars" placeholder="Payment particulars"/></td>'+
      '<td '+td+'><input '+ti+' class="ir-acccode" placeholder="Code"/></td>'+
      '<td '+td+'><input type="number" '+ti+' class="ir-amount ir-cost" step="0.01" min="0" placeholder="0"/></td>'+
      del;
  }
  return '';
}

/* ====================================
   WIRE INLINE PANEL BUTTONS
   Called after openModal()
==================================== */
var _inlinePanelsWired=false;
function wireInlinePanels(){
  var o=$id('modal-overlay');if(!o)return;
  /* Only wire once — prevents listener stacking on every modal open */
  if(_inlinePanelsWired)return;
  _inlinePanelsWired=true;

  /* Toggle panel open/close */
  function togglePanel(e){
    var t=e.target;
    var toggle=t.closest('.ipanel-toggle');
    if(toggle){
      var body=toggle.parentElement.querySelector('.ipanel-body');
      if(body)body.style.display=body.style.display==='none'?'block':'none';
    }
  }
  o.addEventListener('click',togglePanel);

  /* Add Row buttons */
  function addRowListener(e){
    var t=e.target;
    if(t.classList.contains('btn-add-irow')){
      var tbodyId=t.getAttribute('data-tbody');
      var type=t.getAttribute('data-type');
      var tbody=$id(tbodyId);if(!tbody)return;
      var n=tbody.querySelectorAll('tr').length+1;
      var tr=document.createElement('tr');
      tr.innerHTML=makeInlineRow(type,n);
      tbody.appendChild(tr);
      recalcInline(tbody,type);
    }
    /* Delete row */
    if(t.classList.contains('del-irow')){
      t.closest('tr').remove();
    }
    /* File input info */
    if(t.tagName==='INPUT'&&t.type==='file'){
      var info=t.parentElement.querySelector('.ipanel-file-info');
      if(info)info.textContent=t.files.length+' file(s) selected';
    }
  }

  /* Recalculate totals on input change */
  function changeListener(e){
    var t=e.target;
    /* File input count */
    if(t.tagName==='INPUT'&&t.type==='file'){
      var info=t.parentElement.querySelector('.ipanel-file-info');
      if(info)info.textContent=t.files.length+' file(s) selected';
      return;
    }
    /* Row calculations */
    if(t.classList.contains('ir-cost')||t.classList.contains('ir-qty')||t.classList.contains('ir-price')){
      var row=t.closest('tr');var tbody=t.closest('tbody');if(!row||!tbody)return;
      /* LPO line total */
      if(t.classList.contains('ir-price')||tbody.id==='ip-lpo-items-body'){
        var q=parseFloat((row.querySelector('.ir-qty')||{}).value)||0;
        var p=parseFloat((row.querySelector('.ir-price')||{}).value)||0;
        var lt=row.querySelector('.ir-linetotal');if(lt)lt.value=(q*p>0?(q*p).toFixed(2):'');
      }
      /* Travel route total */
      if(tbody.id==='ip-t-route-body'){
        var total=0;row.querySelectorAll('.ir-cost').forEach(function(i){total+=parseFloat(i.value)||0;});
        var rt=row.querySelector('.ir-total');if(rt)rt.value=total>0?total.toFixed(2):'';
      }
      /* Grand totals */
      recalcInline(tbody,tbody.id);
    }
  }

  o._inlineListener=addRowListener;o._inlineListener2=changeListener;
  o.addEventListener('click',addRowListener);
  o.addEventListener('change',changeListener);

  /* Add initial rows to each tbody */
  var initRows={
    'ip-t-route-body':'travel-route','ip-acc-exp-body':'acc-expense',
    'ip-ev-items-body':'eval-item','ip-lpo-items-body':'lpo-item',
    'ip-grn-items-body':'grn-item','ip-inv-parts-body':'inv-part'
  };
  Object.keys(initRows).forEach(function(tbodyId){
    var tbody=$id(tbodyId);if(!tbody||tbody.querySelectorAll('tr').length>0)return;
    for(var i=1;i<=3;i++){
      var tr=document.createElement('tr');
      tr.innerHTML=makeInlineRow(initRows[tbodyId],i);
      tbody.appendChild(tr);
    }
  });
}

function recalcInline(tbody,typeOrId){
  if(!tbody)return;
  if(typeOrId==='ip-t-route-body'||typeOrId==='travel-route'){
    var grand=0;
    tbody.querySelectorAll('tr').forEach(function(row){
      var t=parseFloat((row.querySelector('.ir-total')||{}).value)||0;grand+=t;
    });
    var el=$id('ip-t-grand-total');if(el)el.textContent='UGX '+grand.toLocaleString('en-UG');
  }
  if(typeOrId==='ip-lpo-items-body'||typeOrId==='lpo-item'){
    var sub=0;
    tbody.querySelectorAll('tr').forEach(function(row){
      var q=parseFloat((row.querySelector('.ir-qty')||{}).value)||0;
      var p=parseFloat((row.querySelector('.ir-price')||{}).value)||0;
      sub+=q*p;
    });
    var el=$id('ip-lpo-total');if(el)el.textContent='UGX '+(sub*1.18).toLocaleString('en-UG');
  }
  if(typeOrId==='ip-inv-parts-body'||typeOrId==='inv-part'){
    var total=0;
    tbody.querySelectorAll('.ir-amount').forEach(function(i){total+=parseFloat(i.value)||0;});
    var el=$id('ip-inv-total');if(el)el.textContent='UGX '+total.toLocaleString('en-UG');
  }
}

/* ====================================
   COLLECT & SAVE INLINE FORM
==================================== */
async function saveInlineForm(btn){
  var recId=btn.getAttribute('data-recid');
  var formType=btn.getAttribute('data-formtype');
  var panel=btn.closest('.ipanel-body');
  var resultEl=panel?panel.querySelector('.ipanel-result'):null;
  var fileInput=panel?panel.querySelector('.ipanel-files'):null;

  function setResult(msg,ok){
    if(resultEl){resultEl.textContent=msg;resultEl.style.color=ok?'#14532d':'var(--red)';}
  }

  /* Collect data based on formType */
  var formData={};

  if(formType==='travel'){
    var reason=($id('ip-t-reason')||{}).value||'';
    if(!reason.trim()){setResult('Please enter the business reason.','error');return;}
    var routes=[];
    ($id('ip-t-route-body')||{querySelectorAll:function(){return[];}}).querySelectorAll('tr').forEach(function(row){
      var r=(row.querySelector('.ir-route')||{}).value||'';
      if(r.trim())routes.push({route:r,date:(row.querySelector('.ir-date')||{}).value||'',perDiem:(row.querySelector('.ir-perdiem')||{}).value||'',accommodation:(row.querySelector('.ir-accom')||{}).value||'',others:(row.querySelector('.ir-others')||{}).value||'',total:(row.querySelector('.ir-total')||{}).value||''});
    });
    formData={description:'Travel Plan: '+reason,travellerName:($id('ip-t-name')||{}).value||'',position:($id('ip-t-position')||{}).value||'',departureDate:($id('ip-t-dep')||{}).value||'',returnDate:($id('ip-t-ret')||{}).value||'',businessReason:reason,routes:JSON.stringify(routes)};
  }

  if(formType==='accountability'){
    var purpose=($id('ip-acc-purpose')||{}).value||'';
    if(!purpose.trim()){setResult('Please enter the purpose.','error');return;}
    var expenses=[];
    ($id('ip-acc-exp-body')||{querySelectorAll:function(){return[];}}).querySelectorAll('tr').forEach(function(row){
      var exp=(row.querySelector('.ir-explanation')||{}).value||'';
      if(exp.trim())expenses.push({explanation:exp,date:(row.querySelector('.ir-date')||{}).value||'',budgeted:(row.querySelector('.ir-budgeted')||{}).value||'',actual:(row.querySelector('.ir-actual')||{}).value||''});
    });
    formData={description:'Accountability: '+purpose,employeeName:($id('ip-acc-name')||{}).value||'',date:($id('ip-acc-date')||{}).value||'',travelDates:($id('ip-acc-dates')||{}).value||'',purpose:purpose,advanceReceived:($id('ip-acc-advance')||{}).value||'',expenses:JSON.stringify(expenses)};
  }

  if(formType==='evaluation'){
    var desc=($id('ip-ev-desc')||{}).value||'';
    if(!desc.trim()){setResult('Please enter the item description.','error');return;}
    var items=[];
    ($id('ip-ev-items-body')||{querySelectorAll:function(){return[];}}).querySelectorAll('tr').forEach(function(row){
      var item=(row.querySelector('.ir-item')||{}).value||'';
      if(item.trim())items.push({item:item,qty:(row.querySelector('.ir-qty')||{}).value||'',s1:(row.querySelector('.ir-s1')||{}).value||'',s2:(row.querySelector('.ir-s2')||{}).value||'',s3:(row.querySelector('.ir-s3')||{}).value||''});
    });
    formData={description:desc,evalMethod:($id('ip-ev-method')||{}).value||'',suppliers:($id('ip-ev-suppliers')||{}).value||'',recommendations:($id('ip-ev-rec')||{}).value||'',items:JSON.stringify(items)};
  }

  if(formType==='lpo'){
    var vendor=($id('ip-lpo-vendor')||{}).value||'';
    if(!vendor.trim()){setResult('Please enter the vendor name.','error');return;}
    var items=[];
    ($id('ip-lpo-items-body')||{querySelectorAll:function(){return[];}}).querySelectorAll('tr').forEach(function(row){
      var d=(row.querySelector('.ir-desc')||{}).value||'';
      if(d.trim())items.push({description:d,qty:(row.querySelector('.ir-qty')||{}).value||'',unit:(row.querySelector('.ir-unit')||{}).value||'',unitPrice:(row.querySelector('.ir-price')||{}).value||'',total:(row.querySelector('.ir-linetotal')||{}).value||''});
    });
    formData={description:'LPO: '+vendor,vendorName:vendor,lpoDate:($id('ip-lpo-date')||{}).value||'',deliverAt:($id('ip-lpo-deliver')||{}).value||'',paymentTerms:($id('ip-lpo-terms')||{}).value||'',items:JSON.stringify(items)};
  }

  if(formType==='grn'){
    var vendor=($id('ip-grn-vendor')||{}).value||'';
    if(!vendor.trim()){setResult('Please enter the vendor name.','error');return;}
    var items=[];
    ($id('ip-grn-items-body')||{querySelectorAll:function(){return[];}}).querySelectorAll('tr').forEach(function(row){
      var d=(row.querySelector('.ir-desc')||{}).value||'';
      if(d.trim())items.push({description:d,qty:(row.querySelector('.ir-qty')||{}).value||'',unit:(row.querySelector('.ir-unit')||{}).value||'',condition:(row.querySelector('.ir-condition')||{}).value||''});
    });
    formData={description:'GRN: '+vendor,vendorName:vendor,grnDate:($id('ip-grn-date')||{}).value||'',deliveryNoteNo:($id('ip-grn-delivery')||{}).value||'',lpoRef:($id('ip-grn-lpo')||{}).value||'',items:JSON.stringify(items)};
  }

  if(formType==='invoice'){
    var payee=($id('ip-inv-payee')||{}).value||'';
    if(!payee.trim()){setResult('Please enter the payee name.','error');return;}
    var parts=[];
    ($id('ip-inv-parts-body')||{querySelectorAll:function(){return[];}}).querySelectorAll('tr').forEach(function(row){
      var p=(row.querySelector('.ir-particulars')||{}).value||'';
      if(p.trim())parts.push({particulars:p,accountCode:(row.querySelector('.ir-acccode')||{}).value||'',amount:(row.querySelector('.ir-amount')||{}).value||''});
    });
    formData={description:'Payment Voucher: '+payee,payee:payee,invDate:($id('ip-inv-date')||{}).value||'',chequeNo:($id('ip-inv-cheque')||{}).value||'',voucherNo:($id('ip-inv-voucher')||{}).value||'',amountWords:($id('ip-inv-words')||{}).value||'',particulars:JSON.stringify(parts)};
  }

  /* Save */
  btn.disabled=true;btn.textContent='Saving...';setResult('Saving to package...','ok');
  try{
    var files=fileInput?fileInput.files:null;
    await DS.submitAndLinkToPackage(formData,files,formType,recId);
    /* Reload record and refresh modal */
    var db=await DS.readDatabase();
    var updated=db.records.find(function(r){return r.id===recId;});
    if(updated){
      var idx=_allRecs.findIndex(function(r){return r.id===recId;});
      if(idx>=0)_allRecs[idx]=updated;
      openModal(buildPackageView(updated));
      wireInlinePanels();
    }
    showBanner(formType+' form saved and added to package '+recId,'success');
  }catch(err){
    setResult('Failed: '+err.message,'error');
    btn.disabled=false;btn.textContent='Save & Add to Package';
  }
}

/* --- Package view (record detail modal) --- */
var _allRecs=[];

function buildPackageView(rec){
  var session=DS.getSession();
  var isElevated=DS.ELEVATED.indexOf(session.role)!==-1;
  var canAction=DS.canActionRequisition(session.role,rec.status);
  var ns=canAction?DS.getNextStatus(session.role,rec.status):'';
  var al=canAction?DS.getActionLabel(session.role,rec.status):'';
  var canEdit=rec.submittedBy===session.email&&(rec.status==='Pending'||rec.status==='Rejected');

  /* Approval chain */
  function arow(lbl,step){
    var a=rec.approval&&rec.approval[step];
    var v=a&&a.byName?'<strong style="color:#14532d;">&#10003; '+esc(a.byName)+'</strong> on '+fmtDate(a.at)+(a.note?' - <em>'+esc(a.note)+'</em>':''):'<em style="color:#aaa;">Pending</em>';
    return'<tr><th style="width:35%;padding:0.4rem 0.6rem;font-size:0.75rem;color:var(--gray-500);font-weight:600;border-bottom:1px solid var(--gray-200);">'+lbl+'</th><td style="padding:0.4rem 0.6rem;font-size:0.82rem;border-bottom:1px solid var(--gray-200);">'+v+'</td></tr>';
  }
  var approvalHtml='<table style="width:100%;border-collapse:collapse;">'+
    '<tr><th style="width:35%;padding:0.4rem 0.6rem;font-size:0.75rem;color:var(--gray-500);font-weight:600;border-bottom:1px solid var(--gray-200);">Submitted by</th><td style="padding:0.4rem 0.6rem;font-size:0.82rem;border-bottom:1px solid var(--gray-200);">'+esc(rec.submittedByName)+' ('+esc(rec.submittedByTitle)+') on '+fmtDate(rec.createdAt)+'</td></tr>'+
    arow('Admin Officer - Prepared','preparation')+
    arow('FAM - Reviewed','review')+
    arow('FAM - Cleared','clearance')+
    arow('ED - Approved','approval')+
    '</table>';

  /* Render all linked forms inline */
  var linkedHtml='<p style="color:var(--gray-500);font-size:0.85rem;">No linked forms in this package.</p>';
  if(rec.linkedForms&&rec.linkedForms.length){
    linkedHtml=rec.linkedForms.map(function(lf){
      var lr=_allRecs.find(function(r){return r.id===lf.id;});
      var formHtml='';
      if(lr&&FR){
        formHtml='<div style="margin-top:0.5rem;border:1px solid var(--gray-200);border-radius:4px;overflow:auto;max-height:400px;">'+FR.renderForm(lr)+'</div>';
      }
      return'<div style="border:1px solid var(--ubf-blue-light);border-radius:var(--radius-sm);margin-bottom:0.75rem;overflow:hidden;">'+
        '<div style="background:var(--ubf-blue-pale);padding:0.5rem 0.85rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.4rem;">'+
          '<div>'+
            '<strong style="font-size:0.85rem;color:var(--ubf-blue-darker);">'+esc(lf.id)+'</strong>'+
            ' <span style="font-size:0.72rem;background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.1rem 0.4rem;border-radius:3px;">'+esc(ftLbl(lf.formType))+'</span>'+
          '</div>'+
          '<div style="display:flex;gap:0.35rem;align-items:center;">'+
            '<span class="status-badge '+stCls(lf.status)+'">'+esc(lf.status)+'</span>'+
            (lr&&FR?'<button class="btn btn-secondary btn-sm btn-dl-linked" data-id="'+esc(lf.id)+'" style="font-size:0.7rem;">Download PDF</button>':'')+
          '</div>'+
        '</div>'+
        (formHtml?formHtml:'')+
      '</div>';
    }).join('');
  }

  /* Attachments */
  var attHtml='<p style="color:var(--gray-500);font-size:0.85rem;">No attachments.</p>';
  if(rec.attachments&&rec.attachments.length){
    attHtml='<div style="display:flex;flex-direction:column;gap:0.4rem;">'+
      rec.attachments.map(function(a){
        return'<div style="display:flex;align-items:center;justify-content:space-between;padding:0.45rem 0.75rem;background:var(--gray-100);border-radius:4px;flex-wrap:wrap;gap:0.4rem;">'+
          '<div><span style="font-size:0.85rem;font-weight:600;">'+esc(a.name)+'</span><div style="font-size:0.72rem;color:var(--gray-500);">Uploaded '+fmtDate(a.uploadedAt)+'</div></div>'+
          '<div style="display:flex;gap:0.35rem;">'+
            '<a href="'+esc(a.downloadUrl)+'" target="_blank" class="btn btn-secondary btn-sm" style="font-size:0.72rem;">View</a>'+
            '<a href="'+esc(a.downloadUrl)+'" download class="btn btn-primary btn-sm" style="font-size:0.72rem;">Download</a>'+
          '</div>'+
        '</div>';
      }).join('')+
    '</div>';
  }

  /* Management notes */
  var notesHtml='<p style="color:var(--gray-500);font-size:0.85rem;">No management notes.</p>';
  if(rec.managementNotes&&rec.managementNotes.length){
    notesHtml=rec.managementNotes.map(function(n){
      return'<div style="border-left:4px solid var(--ubf-blue);background:var(--ubf-blue-pale);padding:0.65rem 0.9rem;border-radius:0 4px 4px 0;margin-bottom:0.5rem;">'+
        '<div style="font-size:0.78rem;font-weight:700;color:var(--ubf-blue-darker);">'+esc(n.byName)+' ('+esc(n.byRole)+') - '+fmtDT(n.at)+'</div>'+
        '<div style="margin-top:0.25rem;font-size:0.875rem;">'+esc(n.note)+'</div>'+
        (n.attachments&&n.attachments.length?'<div style="margin-top:0.4rem;display:flex;gap:0.35rem;flex-wrap:wrap;">'+
          n.attachments.map(function(a){return'<a href="'+esc(a.downloadUrl)+'" target="_blank" class="btn btn-secondary btn-sm" style="font-size:0.7rem;">'+esc(a.name)+'</a>';}).join('')+
        '</div>':'')+
      '</div>';
    }).join('');
  }

  /* Comments */
  var cs=rec.comments||[];
  var commentsHtml=cs.length===0?'<p style="color:var(--gray-500);font-size:0.85rem;">No comments yet.</p>':
    cs.map(function(c){
      var reps=(c.replies||[]).map(function(r){
        return'<div class="comment-reply"><strong>'+esc(r.byName||r.by)+'</strong> ('+esc(r.byRole)+') '+fmtDT(r.at)+'<p style="margin:0.15rem 0 0;">'+esc(r.text)+'</p></div>';
      }).join('');
      return'<div class="comment-item">'+
        '<div class="comment-header"><strong>'+esc(c.byName||c.by)+'</strong> ('+esc(c.byRole)+') '+fmtDT(c.at)+'</div>'+
        '<p style="margin:0.25rem 0 0.4rem;">'+esc(c.text)+'</p>'+
        (reps?'<div style="margin-left:1rem;">'+reps+'</div>':'')+
        '<button class="btn-action btn-review btn-reply-toggle" data-cid="'+esc(c.id)+'" style="font-size:0.72rem;margin-top:0.3rem;">Reply</button>'+
        '<div id="ra-'+esc(c.id)+'" style="display:none;margin-top:0.35rem;">'+
          '<textarea id="rt-'+esc(c.id)+'" rows="2" style="width:100%;padding:0.35rem;border:1px solid var(--gray-300);border-radius:4px;font-family:var(--font-body);font-size:0.83rem;" placeholder="Write a reply..."></textarea>'+
          '<button class="btn btn-primary btn-sm btn-do-reply" data-rid="'+esc(rec.id)+'" data-cid="'+esc(c.id)+'" style="margin-top:0.25rem;">Post Reply</button>'+
        '</div>'+
      '</div>';
    }).join('');
  commentsHtml+='<div style="margin-top:0.85rem;padding-top:0.75rem;border-top:1px solid var(--gray-200);">'+
    '<textarea id="new-cmt" rows="2" style="width:100%;padding:0.45rem;border:1.5px solid var(--gray-300);border-radius:var(--radius-sm);font-family:var(--font-body);font-size:0.875rem;resize:vertical;" placeholder="Add a comment..."></textarea>'+
    '<button class="btn btn-primary btn-sm btn-do-comment" data-rid="'+esc(rec.id)+'" style="margin-top:0.35rem;">Post Comment</button>'+
  '</div>';

  /* Audit history */
  var histHtml=rec.history&&rec.history.length
    ?'<ol class="history-list">'+rec.history.map(function(h){return'<li><strong>'+esc(h.action)+'</strong> by '+esc(h.byName||h.by)+' on '+fmtDT(h.at)+(h.note?' - '+esc(h.note):'')+'</li>';}).join('')+'</ol>'
    :'<p style="color:var(--gray-500);font-size:0.85rem;">No history.</p>';

  /* Add Form to Package — horizontal buttons, all roles, all stages */
  var addFormHtml='';
  if(rec.status!=='Approved'&&rec.status!=='Rejected'){
    addFormHtml='<div style="margin-bottom:1rem;background:var(--ubf-green-pale);border:1px solid var(--ubf-green-light);border-radius:var(--radius-sm);padding:0.85rem 1rem;">'+
      '<div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;color:var(--ubf-green-dark);letter-spacing:0.05em;margin-bottom:0.5rem;">Add Forms to This Package</div>'+
      '<p style="font-size:0.78rem;color:var(--gray-500);margin-bottom:0.6rem;">Click a form below to open it. After filling and submitting it will be automatically attached to this package.</p>'+
      '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">'+
        '<a href="travel-plan.html?package='+esc(rec.id)+'" class="btn btn-secondary btn-sm">+ Travel Business Plan</a>'+
        '<a href="accountability.html?package='+esc(rec.id)+'" class="btn btn-secondary btn-sm">+ Accountability Form</a>'+
        '<a href="evaluation.html?package='+esc(rec.id)+'" class="btn btn-secondary btn-sm">+ Evaluation Report</a>'+
        '<a href="lpo.html?package='+esc(rec.id)+'" class="btn btn-secondary btn-sm">+ Local Purchase Order</a>'+
        '<a href="grn.html?package='+esc(rec.id)+'" class="btn btn-secondary btn-sm">+ Goods Received Note</a>'+
        '<a href="invoice.html?package='+esc(rec.id)+'" class="btn btn-secondary btn-sm">+ Payment Voucher</a>'+
      '</div>'+
    '</div>';
  }

  /* Save to Archive Folder (for approved records, FAM/ED only) */
  if(rec.status==='Approved'&&(session.role==='FAM'||session.role==='ED')){
    addFormHtml='<div style="margin-bottom:1rem;background:var(--ubf-green-pale);border:1px solid var(--ubf-green-light);border-radius:var(--radius-sm);padding:0.85rem 1rem;">'+
      '<div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;color:var(--ubf-green-dark);letter-spacing:0.05em;margin-bottom:0.5rem;">File in Archive</div>'+
      '<p style="font-size:0.78rem;color:var(--gray-500);margin-bottom:0.6rem;">Move this approved package to a named folder in the Document Archive.</p>'+
      '<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">'+
        '<select id="archive-folder-sel-'+esc(rec.id)+'" style="padding:0.4rem 0.75rem;border:1.5px solid var(--gray-300);border-radius:var(--radius-sm);font-family:var(--font-body);font-size:0.85rem;min-width:200px;">'+
          '<option value="">-- Select a folder --</option>'+
        '</select>'+
        '<button class="btn btn-primary btn-sm btn-do-move-folder" data-id="'+esc(rec.id)+'" style="white-space:nowrap;">Save to Folder</button>'+
        '<a href="archives.html" class="btn btn-secondary btn-sm">Manage Folders</a>'+
      '</div>'+
      '<div id="folder-move-result-'+esc(rec.id)+'" style="font-size:0.78rem;margin-top:0.35rem;"></div>'+
    '</div>';
  }

  /* Attach file panel — always visible, works for all roles */
  var attachPanel='<div style="background:var(--ubf-blue-pale);border:1px solid var(--ubf-blue-light);border-radius:var(--radius-sm);padding:0.85rem 1rem;margin-bottom:0.75rem;">'+
    '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--ubf-blue-darker);margin-bottom:0.5rem;">Attach Documents / Receipts to This Package</div>'+
    '<p style="font-size:0.78rem;color:var(--gray-500);margin-bottom:0.5rem;">Select one or more files from your computer (PDF, Word, Excel, images). They will be permanently attached to this record and visible to all parties.</p>'+
    '<input type="file" id="attach-files-'+esc(rec.id)+'" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" style="display:block;margin-bottom:0.4rem;font-size:0.83rem;"/>'+
    '<div class="file-info" id="attach-info-'+esc(rec.id)+'"></div>'+
    '<button class="btn btn-primary btn-sm btn-do-attach" data-id="'+esc(rec.id)+'" style="margin-top:0.45rem;">Upload &amp; Attach to Record</button>'+
    '<div id="attach-result-'+esc(rec.id)+'" style="font-size:0.78rem;margin-top:0.3rem;"></div>'+
  '</div>';

  /* Management note panel */
  var notePanel='';
  if(isElevated){
    notePanel='<div id="sub-note-'+esc(rec.id)+'" style="display:none;background:var(--ubf-blue-pale);border:1px solid var(--ubf-blue-light);border-radius:var(--radius-sm);padding:0.75rem;margin-top:0.5rem;">'+
      '<div style="font-size:0.82rem;font-weight:600;margin-bottom:0.4rem;">Add management note (visible to all parties):</div>'+
      '<textarea id="note-text-'+esc(rec.id)+'" rows="3" style="width:100%;padding:0.4rem;border:1.5px solid var(--gray-300);border-radius:4px;font-family:var(--font-body);font-size:0.875rem;resize:vertical;" placeholder="Enter note or instruction..."></textarea>'+
      '<input type="file" id="note-files-'+esc(rec.id)+'" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="margin-top:0.4rem;display:block;"/>'+
      '<button class="btn btn-primary btn-sm btn-do-note" data-id="'+esc(rec.id)+'" style="margin-top:0.4rem;">Save Note</button>'+
    '</div>';
  }

  /* Forward panel */
  var fwdPanel='';
  if(canAction){
    fwdPanel='<div id="sub-fwd-'+esc(rec.id)+'" style="display:none;background:var(--ubf-blue-pale);border:1px solid var(--ubf-blue-light);border-radius:var(--radius-sm);padding:0.75rem;margin-top:0.5rem;">'+
      '<div style="font-size:0.82rem;font-weight:600;margin-bottom:0.35rem;">Optional note before forwarding to '+esc(ns)+' stage:</div>'+
      '<textarea id="fwd-note-'+esc(rec.id)+'" rows="2" style="width:100%;padding:0.35rem;border:1px solid var(--gray-300);border-radius:4px;font-family:var(--font-body);font-size:0.83rem;resize:vertical;" placeholder="Add a note for the next reviewer (optional)..."></textarea>'+
      '<div style="display:flex;gap:0.4rem;margin-top:0.4rem;">'+
        '<button class="btn btn-success btn-sm btn-do-forward" data-id="'+esc(rec.id)+'" data-action="'+esc(ns)+'">Confirm: '+esc(al)+' &amp; Forward</button>'+
        '<button class="btn btn-danger btn-sm btn-do-reject-m" data-id="'+esc(rec.id)+'">Reject</button>'+
      '</div>'+
    '</div>';
  }

  /* Action bar */
  var actionBar='<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.85rem;padding-bottom:0.85rem;border-bottom:2px solid var(--gray-200);">'+
    (FR?'<button class="btn btn-primary btn-sm btn-dl-form" data-id="'+esc(rec.id)+'">Download This Form (PDF)</button>':'')+
    (FR?'<button class="btn btn-primary btn-sm btn-dl-pkg" data-id="'+esc(rec.id)+'">Download Complete Package (PDF)</button>':'')+
    '<button class="btn btn-secondary btn-sm btn-print-form" data-id="'+esc(rec.id)+'">Print</button>'+
    
    (isElevated?'<button class="btn btn-secondary btn-sm btn-show-note" data-id="'+esc(rec.id)+'">Add Note</button>':'')+
    (canAction?'<button class="btn btn-approve btn-sm btn-show-fwd" data-id="'+esc(rec.id)+'">'+esc(al)+' &amp; Forward</button>':'')+
    (canEdit?'<a href="form.html?edit='+esc(rec.id)+'" class="btn btn-secondary btn-sm">Edit &amp; Resubmit</a>':'')+
  '</div>'+
  attachPanel+notePanel+fwdPanel;

  /* Main form rendered inline */
  var mainFormHtml='<p style="color:var(--gray-500);font-size:0.85rem;">No form data.</p>';
  if(FR){
    mainFormHtml='<div style="border:1px solid var(--gray-200);border-radius:4px;overflow:auto;max-height:450px;">'+FR.renderForm(rec)+'</div>';
  } else if(rec.data&&typeof rec.data==='object'){
    var keys=Object.keys(rec.data).filter(function(k){return rec.data[k]&&k!=='routes'&&k!=='expenses'&&k!=='items'&&k!=='particulars';});
    if(keys.length){
      mainFormHtml='<table class="detail-table">'+keys.map(function(k){return'<tr><th>'+esc(k)+'</th><td>'+esc(rec.data[k])+'</td></tr>';}).join('')+'</table>';
    }
  }

  return '<h2 class="modal-title">'+
    '<span style="font-size:0.72rem;background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.1rem 0.45rem;border-radius:3px;margin-right:0.4rem;">'+esc(ftLbl(rec.formType))+'</span>'+
    esc(rec.id)+
    ' <span class="status-badge '+stCls(rec.status)+'">'+esc(rec.status)+'</span>'+
  '</h2>'+
  actionBar+
  addFormHtml+
  '<div class="modal-grid">'+
    '<div class="modal-section"><h3>Form</h3>'+mainFormHtml+'</div>'+
    '<div class="modal-section"><h3>Approval Chain</h3>'+approvalHtml+'</div>'+
  '</div>'+
  '<div class="modal-section"><h3>Package - Linked Forms ('+((rec.linkedForms&&rec.linkedForms.length)||0)+')</h3>'+linkedHtml+'</div>'+
  '<div class="modal-section"><h3>Attachments &amp; Receipts ('+((rec.attachments&&rec.attachments.length)||0)+')</h3>'+attHtml+'</div>'+
  (isElevated?'<div class="modal-section"><h3>Management Notes</h3>'+notesHtml+'</div>':'')+
  '<div class="modal-section"><h3>Comments</h3>'+commentsHtml+'</div>'+
  '<div class="modal-section"><h3>Audit History</h3>'+histHtml+'</div>';
}

/* --- Modal event delegation --- */
function wireModalEvents(){
  var o=$id('modal-overlay');if(!o)return;
  /* File input change — shows selected file count */
  o.addEventListener('change',function(e){
    var t=e.target;
    if(t.tagName==='INPUT'&&t.type==='file'){
      var infoId=t.id.replace('attach-files-','attach-info-');
      var infoEl=document.getElementById(infoId);
      if(infoEl)infoEl.textContent=t.files.length+' file(s) selected';
    }
  });

  o.addEventListener('click',async function(e){
    var t=e.target;

    /* Move approved file to archive folder */
    if(t.classList.contains('btn-do-move-folder')){
      var id=t.getAttribute('data-id');
      var sel=document.getElementById('archive-folder-sel-'+id);
      var res=document.getElementById('folder-move-result-'+id);
      if(!sel||!sel.value){if(res){res.style.color='var(--red)';res.textContent='Please select a folder first.';}return;}
      t.disabled=true;t.textContent='Moving...';
      DS.moveFileToFolder(id,sel.value,DS.getSession()).then(function(){
        if(res){res.style.color='#14532d';res.textContent='Saved to folder successfully.';}
        t.disabled=false;t.textContent='Save to Folder';
      }).catch(function(err){
        if(res){res.style.color='var(--red)';res.textContent='Failed: '+err.message;}
        t.disabled=false;t.textContent='Save to Folder';
      });
      return;
    }

    /* Show/hide note sub-panel */
    if(t.classList.contains('btn-show-note')){
      var id=t.getAttribute('data-id'),p=$id('sub-note-'+id);
      if(p)p.style.display=p.style.display==='none'?'block':'none';return;
    }
    if(t.classList.contains('btn-show-fwd')){
      var id=t.getAttribute('data-id'),p=$id('sub-fwd-'+id);
      if(p)p.style.display=p.style.display==='none'?'block':'none';return;
    }

    /* Download form PDF */
    if(t.classList.contains('btn-dl-form')&&FR){
      var id=t.getAttribute('data-id'),rec=_allRecs.find(function(r){return r.id===id;});
      if(!rec)return;t.disabled=true;t.textContent='Generating...';
      FR.downloadFormPDF(rec,function(){t.disabled=false;t.textContent='Download This Form (PDF)';});return;
    }

    /* Download linked form PDF */
    if(t.classList.contains('btn-dl-linked')&&FR){
      var id=t.getAttribute('data-id'),rec=_allRecs.find(function(r){return r.id===id;});
      if(!rec)return;t.disabled=true;t.textContent='Generating...';
      FR.downloadFormPDF(rec,function(){t.disabled=false;t.textContent='Download PDF';});return;
    }

    /* Download package PDF */
    if(t.classList.contains('btn-dl-pkg')&&FR){
      var id=t.getAttribute('data-id'),rec=_allRecs.find(function(r){return r.id===id;});
      if(!rec)return;t.disabled=true;t.textContent='Building Package...';
      FR.downloadPackagePDF(rec,_allRecs,function(){t.disabled=false;t.textContent='Download Complete Package (PDF)';});return;
    }

    /* Print */
    if(t.classList.contains('btn-print-form')&&FR){
      var id=t.getAttribute('data-id'),rec=_allRecs.find(function(r){return r.id===id;});
      if(rec)FR.printForm(rec);return;
    }

    /* Attach files */
    if(t.classList.contains('btn-do-attach')){
      var id=t.getAttribute('data-id'),fi=$id('attach-files-'+id),res=$id('attach-result-'+id);
      if(!fi||!fi.files.length){alert('Please select at least one file.');return;}
      t.disabled=true;t.textContent='Uploading...';if(res)res.textContent='Uploading...';
      try{
        var updated=await DS.attachFilesToRecord(id,fi.files);
        var idx=_allRecs.findIndex(function(r){return r.id===id;});
        if(idx>=0)_allRecs[idx]=updated;
        showBanner('Files attached successfully.','success');
        openModal(buildPackageView(updated));
      }catch(err){
        if(res){res.style.color='var(--red)';res.textContent='Failed: '+err.message;}
        t.disabled=false;t.textContent='Upload & Attach to Record';
      }return;
    }

    /* Management note */
    if(t.classList.contains('btn-do-note')){
      var id=t.getAttribute('data-id');
      var txt=($id('note-text-'+id)||{}).value||'';
      if(!txt.trim()){alert('Please enter a note.');return;}
      var nf=$id('note-files-'+id);
      t.disabled=true;t.textContent='Saving...';
      try{
        await DS.addManagementNote(id,txt.trim(),nf?nf.files:null);
        var db=await DS.readDatabase();
        var updated=db.records.find(function(r){return r.id===id;});
        if(updated){var idx=_allRecs.findIndex(function(r){return r.id===id;});if(idx>=0)_allRecs[idx]=updated;openModal(buildPackageView(updated));}
        showBanner('Note saved.','success');
      }catch(err){alert('Failed: '+err.message);t.disabled=false;t.textContent='Save Note';}return;
    }

    /* Forward */
    if(t.classList.contains('btn-do-forward')){
      var id=t.getAttribute('data-id'),action=t.getAttribute('data-action');
      var note=($id('fwd-note-'+id)||{}).value||'';
      t.disabled=true;t.textContent='Saving...';
      try{
        await DS.updateRequisitionStatus(id,action,note);
        showBanner('Updated to "'+action+'".','success');
        var recs=await DS.getAllRequisitions();_allRecs=Array.isArray(recs)?recs:[];
        var updated=_allRecs.find(function(r){return r.id===id;});
        if(updated)openModal(buildPackageView(updated));else closeModal();
        renderDashTable(_allRecs);renderStats(await DS.getDashboardStats());
      }catch(err){showBanner(err.message||'Failed.','error');t.disabled=false;t.textContent='Forward';}return;
    }

    /* Reject from modal */
    if(t.classList.contains('btn-do-reject-m')){
      var id=t.getAttribute('data-id');
      var reason=prompt('Reason for rejection (required):');
      if(!reason||!reason.trim())return;
      t.disabled=true;t.textContent='Saving...';
      try{
        await DS.updateRequisitionStatus(id,'Rejected',reason.trim());
        showBanner('Rejected.','success');
        var recs=await DS.getAllRequisitions();_allRecs=Array.isArray(recs)?recs:[];
        closeModal();renderDashTable(_allRecs);renderStats(await DS.getDashboardStats());
      }catch(err){showBanner(err.message||'Failed.','error');t.disabled=false;t.textContent='Reject';}return;
    }

    /* Comments */
    if(t.classList.contains('btn-reply-toggle')){
      var a=$id('ra-'+t.getAttribute('data-cid'));if(a)a.style.display=a.style.display==='none'?'block':'none';return;
    }
    if(t.classList.contains('btn-do-reply')){
      var rid=t.getAttribute('data-rid'),cid=t.getAttribute('data-cid');
      var txt=($id('rt-'+cid)||{}).value||'';
      if(!txt.trim()){alert('Please write a reply.');return;}
      t.disabled=true;t.textContent='Posting...';
      try{
        await DS.addReply(rid,cid,txt.trim());
        var db=await DS.readDatabase();var updated=db.records.find(function(r){return r.id===rid;});
        if(updated){var idx=_allRecs.findIndex(function(r){return r.id===rid;});if(idx>=0)_allRecs[idx]=updated;openModal(buildPackageView(updated));}
      }catch(err){alert('Failed: '+err.message);t.disabled=false;t.textContent='Post Reply';}return;
    }
    if(t.classList.contains('btn-do-comment')){
      var rid=t.getAttribute('data-rid'),txt=($id('new-cmt')||{}).value||'';
      if(!txt.trim()){alert('Please write a comment.');return;}
      t.disabled=true;t.textContent='Posting...';
      try{
        await DS.addComment(rid,txt.trim());
        var db=await DS.readDatabase();var updated=db.records.find(function(r){return r.id===rid;});
        if(updated){var idx=_allRecs.findIndex(function(r){return r.id===rid;});if(idx>=0)_allRecs[idx]=updated;openModal(buildPackageView(updated));}
      }catch(err){alert('Failed: '+err.message);t.disabled=false;t.textContent='Post Comment';}
    }
  });
}

/* ====================================
   LOGIN
==================================== */
function initLogin(){
  if(!$id('login-form'))return;
  if(DS.isAuthenticated()){go('dashboard.html');return;}
  var form=$id('login-form'),cp=$id('change-password-panel');
  var ei=$id('input-email'),pi=$id('input-password'),er=$id('login-error'),bl=$id('btn-login');
  var pu=null;
  function setErr(m){if(er){er.textContent=m;er.style.display=m?'block':'none';}}
  var tog=$id('btn-toggle-password');
  if(tog)tog.addEventListener('click',function(){pi.type=pi.type==='password'?'text':'password';});
  var fl=$id('forgot-password-link');
  if(fl)fl.addEventListener('click',function(){alert('Contact: t.otieno@ugandabiodiversityfund.org');});
  form.addEventListener('submit',async function(e){
    e.preventDefault();setErr('');
    var email=ei?ei.value.trim().toLowerCase():'',pass=pi?pi.value:'';
    if(!email){setErr('Please enter your UBF work email.');return;}
    if(!pass){setErr('Please enter your password.');return;}
    if(bl){bl.disabled=true;bl.textContent='Verifying...';}
    try{
      var result=await DS.authenticateUser(email,pass);var user=result.user;
      if(user.mustChangePassword||DS.isPasswordExpired(user.passwordExpiry)){
        pu=user;form.style.display='none';if(cp)cp.style.display='block';
        if(bl){bl.disabled=false;bl.textContent='Log In';}return;
      }
      DS.saveSession(user);go('dashboard.html');
    }catch(err){setErr(err.message||'Login failed.');if(bl){bl.disabled=false;bl.textContent='Log In';}}
  });
  var bc=$id('btn-cancel-change');
  if(bc)bc.addEventListener('click',function(){pu=null;form.style.display='block';if(cp)cp.style.display='none';});
  var bs=$id('btn-set-password');
  if(bs)bs.addEventListener('click',async function(){
    var np=($id('input-new-password')||{}).value||'',cp2=($id('input-confirm-password')||{}).value||'';
    if(np.length<8){alert('Minimum 8 characters.');return;}
    if(np!==cp2){alert('Passwords do not match.');return;}
    bs.disabled=true;bs.textContent='Saving...';
    try{
      await DS.changePassword(pu.email,np);
      var result=await DS.authenticateUser(pu.email,np);
      DS.saveSession(result.user);go('dashboard.html');
    }catch(err){alert('Failed: '+err.message);bs.disabled=false;bs.textContent='Set Password & Log In';}
  });
}

/* ====================================
   DASHBOARD
==================================== */
function renderStats(s){
  var m={'stat-total':s.total||0,'stat-pending':s.pending||0,'stat-prepared':s.prepared||0,'stat-reviewed':s.reviewed||0,'stat-cleared':s.cleared||0,'stat-approved':s.approved||0,'stat-rejected':s.rejected||0};
  Object.keys(m).forEach(function(id){var el=$id(id);if(el)el.textContent=m[id];});
}
function buildDashRow(rec,session){
  var desc=(rec.data&&rec.data.description)||rec.id;
  var pkg=rec.linkedForms&&rec.linkedForms.length?'<span style="font-size:0.65rem;background:#dcfce7;color:#14532d;padding:0.1rem 0.35rem;border-radius:3px;margin-left:3px;">pkg:'+rec.linkedForms.length+'</span>':'';
  var att=rec.attachments&&rec.attachments.length?'<span style="font-size:0.65rem;background:var(--ubf-blue-light);color:var(--ubf-blue-darker);padding:0.1rem 0.35rem;border-radius:3px;margin-left:2px;">+'+rec.attachments.length+'</span>':'';
  var actionBtns='<span class="text-muted">-</span>';
  if(DS.canActionRequisition(session.role,rec.status)){
    var ns=DS.getNextStatus(session.role,rec.status),al=DS.getActionLabel(session.role,rec.status);
    actionBtns='<button class="btn-action btn-approve" data-id="'+esc(rec.id)+'" data-action="'+esc(ns)+'">'+esc(al)+'</button> <button class="btn-action btn-reject" data-id="'+esc(rec.id)+'" data-action="Rejected">Reject</button>';
  }
  if(rec.submittedBy===session.email&&(rec.status==='Pending'||rec.status==='Rejected'))actionBtns+=' <a href="form.html?edit='+esc(rec.id)+'" class="btn-action btn-review">Edit</a>';
  return'<tr>'+
    '<td><a href="#" class="link-detail" data-id="'+esc(rec.id)+'">'+esc(rec.id)+'</a>'+pkg+att+'</td>'+
    '<td>'+esc(ftLbl(rec.formType))+'</td>'+
    '<td>'+esc(desc)+'</td>'+
    '<td>'+esc(rec.submittedByName||rec.submittedBy)+'</td>'+
    '<td>'+fmtDate(rec.createdAt)+'</td>'+
    '<td><span class="status-badge '+stCls(rec.status)+'">'+esc(rec.status)+'</span></td>'+
    '<td>'+actionBtns+'</td>'+
  '</tr>';
}
function renderDashTable(recs){
  var tb=$id('dashboard-table-body'),em=$id('dashboard-empty');if(!tb)return;
  var s=DS.getSession();
  if(!recs||!recs.length){tb.innerHTML='';if(em)em.style.display='block';return;}
  if(em)em.style.display='none';
  tb.innerHTML=recs.map(function(r){return buildDashRow(r,s);}).join('');
}
function filterDash(){
  var sv=($id('filter-status')||{}).value||'',sq=(($id('filter-search')||{}).value||'').toLowerCase();
  renderDashTable(_allRecs.filter(function(r){
    var d=(r.data&&r.data.description)||r.id||'';
    return(!sv||r.status===sv)&&(!sq||r.id.toLowerCase().indexOf(sq)!==-1||d.toLowerCase().indexOf(sq)!==-1||(r.submittedByName||'').toLowerCase().indexOf(sq)!==-1);
  }));
}
async function initDash(){
  if(!$id('dashboard-container'))return;
  if(!enforceAuth())return;
  navbar();wireLogout();wireModal();wireModalEvents();
  var ld=$id('dashboard-loading');if(ld)ld.style.display='block';
  try{
    var recs=await DS.getAllRequisitions(),stats=await DS.getDashboardStats();
    _allRecs=Array.isArray(recs)?recs:[];renderStats(stats);renderDashTable(_allRecs);
  }catch(err){showBanner(err.message||'Failed to load.','error');}
  finally{if(ld)ld.style.display='none';}
  var fs=$id('filter-status'),fq=$id('filter-search');
  if(fs)fs.addEventListener('change',filterDash);if(fq)fq.addEventListener('input',filterDash);
  var tb=$id('dashboard-table-body');
  if(tb)tb.addEventListener('click',async function(e){
    var t=e.target;
    if(t.classList.contains('link-detail')){
      e.preventDefault();
      var rec=_allRecs.find(function(r){return r.id===t.getAttribute('data-id');});
      if(rec)openModal(buildPackageView(rec));return;
    }
    if(t.classList.contains('btn-action')&&t.getAttribute('data-action')){
      var id=t.getAttribute('data-id'),action=t.getAttribute('data-action'),note='';
      if(action==='Rejected'){note=prompt('Reason for rejection:')||'';if(note===null)return;}
      t.disabled=true;t.textContent='Saving...';
      try{
        await DS.updateRequisitionStatus(id,action,note);showBanner('Updated to "'+action+'".','success');
        var updated=await DS.getAllRequisitions(),stats=await DS.getDashboardStats();
        _allRecs=Array.isArray(updated)?updated:[];renderStats(stats);filterDash();
      }catch(err){showBanner(err.message||'Failed.','error');t.disabled=false;t.textContent=action;}
    }
  });
}

/* ====================================
   MULTI-FORM SUBMISSION (form.html)
==================================== */
async function initForm(){
  if(!$id('requisition-form'))return;
  if(!enforceAuth())return;navbar();wireLogout();
  var s=DS.getSession();
  var sn=$id('form-submitter-name'),st=$id('form-submitter-title');
  if(sn)sn.textContent=s.name;if(st)st.textContent=s.title;

  /* Pre-fill traveller name in inline travel panel */
  var tn=$id('t-traveller-name'),tp=$id('t-position');
  if(tn)tn.value=s.name;if(tp)tp.value=s.title;
  var en=$id('acc-employee-name');if(en)en.value=s.name;

  /* Edit mode */
  var params=new URLSearchParams(location.search);
  if(params.has('edit')){
    try{
      var db=await DS.readDatabase();
      var er=db.records.find(function(r){return r.id===params.get('edit');});
      if(er&&er.data){
        Object.keys(er.data).forEach(function(k){var el=document.querySelector('[name="'+k+'"]');if(el)el.value=er.data[k]||'';});
        var ph=document.querySelector('.page-header h1');if(ph)ph.textContent='Edit - '+params.get('edit');
        var b=$id('btn-submit-requisition');if(b)b.textContent='Save & Resubmit';
      }
    }catch(err){showBanner('Could not load for editing: '+err.message,'error');}
  }

  var form=$id('requisition-form'),btn=$id('btn-submit-requisition'),spin=$id('form-loading');
  form.addEventListener('submit',async function(e){
    e.preventDefault();hideBanners();

    /* Collect main form data */
    var mainData={
      activityCode:fv('form-activity-code'),description:fv('form-description'),
      specification:fv('form-specification'),quantity:fv('form-quantity'),
      dateRequired:fv('form-date-required'),locationOfWork:fv('form-location'),
      contractPeriod:fv('form-contract-period'),department:fv('form-department'),
      accountCode:fv('form-account-code'),accountName:fv('form-account-name'),
      donorCode:fv('form-donor-code'),donorName:fv('form-donor-name'),budgetCode:fv('form-budget-code')
    };
    if(!mainData.description){showBanner('Please enter a description.','error');return;}
    if(!mainData.specification){showBanner('Please enter the specification.','error');return;}
    if(!mainData.quantity||parseFloat(mainData.quantity)<=0){showBanner('Please enter a valid quantity.','error');return;}

    /* Collect extra forms from open panels */
    var extraForms=[];

    /* Travel panel */
    var tPanel=$id('panel-travel');
    if(tPanel&&tPanel.classList.contains('open')){
      var routes=[];
      document.querySelectorAll('#t-route-body tr').forEach(function(row){
        var rv=(row.querySelector('[data-col="route"]')||{}).value||'';
        if(rv.trim())routes.push({route:rv.trim(),date:(row.querySelector('[data-col="date"]')||{}).value||'',perDiem:(row.querySelector('[data-col="perDiem"]')||{}).value||'',accommodation:(row.querySelector('[data-col="accommodation"]')||{}).value||'',sda:(row.querySelector('[data-col="sda"]')||{}).value||'',others:(row.querySelector('[data-col="others"]')||{}).value||'',total:(row.querySelector('[data-col="total"]')||{}).value||''});
      });
      var tData={description:'Travel Plan: '+fv('t-business-reason'),travellerName:fv('t-traveller-name'),position:fv('t-position'),departureDate:fv('t-departure-date'),returnDate:fv('t-return-date'),totalDays:fv('t-total-days'),businessNights:fv('t-business-nights'),businessReason:fv('t-business-reason'),grandTotal:fv('t-grand-total'),routes:JSON.stringify(routes)};
      var tFiles=$id('t-attachments');
      extraForms.push({formData:tData,files:tFiles?tFiles.files:null,formType:'travel'});
    }

    /* Accountability panel */
    var aPanel=$id('panel-accountability');
    if(aPanel&&aPanel.classList.contains('open')){
      var expenses=[];
      document.querySelectorAll('#acc-expenses-body tr').forEach(function(row){
        var exp=(row.querySelector('[data-col="explanation"]')||{}).value||'';
        if(exp.trim())expenses.push({accountCode:(row.querySelector('[data-col="accountCode"]')||{}).value||'',date:(row.querySelector('[data-col="date"]')||{}).value||'',explanation:exp.trim(),refNo:(row.querySelector('[data-col="refNo"]')||{}).value||'',budgeted:(row.querySelector('[data-col="budgeted"]')||{}).value||'',actual:(row.querySelector('[data-col="actual"]')||{}).value||'',balance:(row.querySelector('[data-col="balance"]')||{}).value||''});
      });
      var aData={description:'Accountability: '+fv('acc-purpose'),employeeName:fv('acc-employee-name'),date:fv('acc-date'),travelDates:fv('acc-travel-dates'),department:fv('acc-department'),purpose:fv('acc-purpose'),totalBudgeted:fv('acc-total-budgeted'),totalActual:fv('acc-total-actual'),advanceReceived:fv('acc-advance-received'),expenses:JSON.stringify(expenses)};
      var aFiles=$id('acc-attachments');
      extraForms.push({formData:aData,files:aFiles?aFiles.files:null,formType:'accountability'});
    }

    if(btn){btn.disabled=true;btn.textContent='Submitting Package...';}
    if(spin)spin.style.display='block';
    try{
      var mainFiles=$id('form-attachments');
      var rec;
      if(params.has('edit')){
        rec=await DS.editRequisition(params.get('edit'),mainData,mainFiles?mainFiles.files:null);
        showBanner('Updated and resubmitted: '+rec.id,'success');
      } else {
        rec=await DS.submitPackage(mainData,mainFiles?mainFiles.files:null,'request',extraForms);
        var msg='Package submitted: '+rec.id;
        if(extraForms.length)msg+=' (includes '+extraForms.length+' additional form'+(extraForms.length>1?'s':'')+')';
        msg+='. Pending review by Susan Abonyo.';
        showBanner(msg,'success');
      }
      form.reset();
      setTimeout(function(){go('dashboard.html');},3000);
    }catch(err){showBanner(err.message||'Submission failed.','error');}
    finally{if(btn){btn.disabled=false;btn.textContent='Submit Package';}if(spin)spin.style.display='none';}
  });
}

/* ====================================
   MANAGEMENT FORMS (check for ?package=ID)
==================================== */
function getPackageParam(){return new URLSearchParams(location.search).get('package');}

function setupMgmtForm(formId,btnId,loadId,formType,collectFn,validateFn){
  var form=$id(formId),btn=$id(btnId),spin=$id(loadId);if(!form)return;
  var packageId=getPackageParam();

  /* Show banner if attaching to package */
  if(packageId){
    var ph=document.querySelector('.page-header p');
    if(ph)ph.innerHTML='<strong style="color:var(--ubf-green-dark);">This form will be attached to package '+esc(packageId)+' on submission.</strong>';
    if(btn)btn.textContent='Submit & Attach to Package';
  }

  form.addEventListener('submit',async function(e){
    e.preventDefault();hideBanners();
    var data=collectFn(),err=validateFn(data);
    if(err){showBanner(err,'error');return;}
    if(btn){btn.disabled=true;btn.textContent='Submitting...';}
    if(spin)spin.style.display='block';
    try{
      var fi=form.querySelector('input[type="file"]'),files=fi?fi.files:null;
      var rec;
      if(packageId){
        rec=await DS.submitAndLinkToPackage(data,files,formType,packageId);
        showBanner('Submitted and attached to package '+packageId+'. Returning to dashboard...','success');
      } else {
        rec=await DS.submitRequisition(data,files,formType,[]);
        showBanner('Submitted: '+rec.id+'. Pending review by Susan Abonyo.','success');
      }
      form.reset();
      setTimeout(function(){go('dashboard.html');},3000);
    }catch(err){showBanner(err.message||'Submission failed.','error');}
    finally{if(btn){btn.disabled=false;btn.textContent='Submit';}if(spin)spin.style.display='none';}
  });
}

async function initEvaluation(){
  if(!$id('evaluation-form'))return;
  if(!enforceAuth())return;navbar();wireLogout();
  var s=DS.getSession();
  if(DS.ELEVATED.indexOf(s.role)===-1){showBanner('Access restricted.','error');setTimeout(function(){go('dashboard.html');},2000);return;}
  setupMgmtForm('evaluation-form','btn-submit-evaluation','eval-loading','evaluation',
    function(){
      var items=[];
      document.querySelectorAll('#eval-items-body tr').forEach(function(row){
        var d=row.querySelector('[name^="item_"]');
        if(d&&d.value.trim())items.push({item:d.value.trim(),qty:(row.querySelector('[name^="qty_"]')||{}).value||'',s1:(row.querySelector('[name^="s1_"]')||{}).value||'',s2:(row.querySelector('[name^="s2_"]')||{}).value||'',s3:(row.querySelector('[name^="s3_"]')||{}).value||''});
      });
      return{description:fv('eval-description'),evalDate:fv('eval-date'),evalMethod:fv('eval-method'),quantity:fv('eval-quantity'),unit:fv('eval-unit'),suppliers:fv('eval-suppliers'),evalTeam:fv('eval-team'),supplier1Name:($id('sup1-name')||{}).value||'',supplier2Name:($id('sup2-name')||{}).value||'',supplier3Name:($id('sup3-name')||{}).value||'',sub1:fv('eval-sub1'),sub2:fv('eval-sub2'),sub3:fv('eval-sub3'),total1:fv('eval-total1'),total2:fv('eval-total2'),total3:fv('eval-total3'),recommendations:fv('eval-recommendations'),remarks:fv('eval-remarks'),items:JSON.stringify(items)};
    },
    function(d){if(!d.description)return'Please enter the item description.';if(!d.evalMethod)return'Please select procurement method.';if(!d.suppliers)return'Please list the suppliers.';if(!d.recommendations)return'Please enter recommendations.';return'';}
  );
}

async function initLPO(){
  if(!$id('lpo-form'))return;
  if(!enforceAuth())return;navbar();wireLogout();
  var s=DS.getSession();
  if(DS.ELEVATED.indexOf(s.role)===-1){showBanner('Access restricted.','error');setTimeout(function(){go('dashboard.html');},2000);return;}
  var rn=$id('lpo-req-name'),rt=$id('lpo-req-title'),rdDate=$id('lpo-req-date');
  if(rn)rn.textContent=s.name;if(rt)rt.textContent=s.title;
  if(rdDate)rdDate.textContent=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  setupMgmtForm('lpo-form','btn-submit-lpo','lpo-loading','lpo',
    function(){
      var items=[];
      document.querySelectorAll('#lpo-items-body tr').forEach(function(row){
        var d=(row.querySelector('[name^="desc_"]')||{}).value||'';
        if(d.trim())items.push({description:d.trim(),qty:(row.querySelector('[name^="qty_"]')||{}).value||'',unit:(row.querySelector('[name^="unit_"]')||{}).value||'',unitPrice:(row.querySelector('[name^="price_"]')||{}).value||'',total:(row.querySelector('[name^="total_"]')||{}).value||''});
      });
      return{description:'LPO: '+fv('lpo-vendor-name'),lpoDate:fv('lpo-date'),vendorName:fv('lpo-vendor-name'),vendorAddress:fv('lpo-vendor-address'),accountCode:fv('lpo-account-code'),vendorNo:fv('lpo-vendor-no'),validity:fv('lpo-validity'),deliverAt:fv('lpo-deliver-at'),paymentTerms:fv('lpo-payment-terms'),subtotal:fv('lpo-subtotal'),vat:fv('lpo-vat'),total:fv('lpo-total'),items:JSON.stringify(items)};
    },
    function(d){if(!d.vendorName)return'Please enter the vendor name.';return'';}
  );
}

async function initGRN(){
  if(!$id('grn-form'))return;
  if(!enforceAuth())return;navbar();wireLogout();
  var s=DS.getSession();
  var rn=$id('grn-rec-name'),rp=$id('grn-rec-position');
  if(rn)rn.value=s.name;if(rp)rp.value=s.title;
  setupMgmtForm('grn-form','btn-submit-grn','grn-loading','grn',
    function(){
      var items=[];
      document.querySelectorAll('#grn-items-body tr').forEach(function(row){
        var d=(row.querySelector('[name^="desc_"]')||{}).value||'';
        if(d.trim())items.push({description:d.trim(),qty:(row.querySelector('[name^="qty_"]')||{}).value||'',unit:(row.querySelector('[name^="unit_"]')||{}).value||'',condition:(row.querySelector('[name^="cond_"]')||{}).value||''});
      });
      return{description:'GRN: '+fv('grn-vendor-name'),grnDate:fv('grn-date'),vendorName:fv('grn-vendor-name'),vendorAddress:fv('grn-vendor-address'),deliveryNoteNo:fv('grn-delivery-note'),addedToRegister:fv('grn-registered'),lpoRef:fv('grn-lpo-ref'),reqRef:fv('grn-req-ref'),deliveredByName:fv('grn-del-name'),deliveredByPosition:fv('grn-del-position'),deliveredByDate:fv('grn-del-date'),receivedByName:fv('grn-rec-name'),receivedByPosition:fv('grn-rec-position'),receivedByDate:fv('grn-rec-date'),verifiedByName:fv('grn-ver-name'),verifiedByPosition:fv('grn-ver-position'),verifiedByDate:fv('grn-ver-date'),items:JSON.stringify(items)};
    },
    function(d){if(!d.vendorName)return'Please enter the vendor name.';if(!d.receivedByName)return'Please enter the receiver name.';return'';}
  );
}

async function initInvoice(){
  if(!$id('invoice-form'))return;
  if(!enforceAuth())return;navbar();wireLogout();
  var s=DS.getSession();
  if(DS.ELEVATED.indexOf(s.role)===-1){showBanner('Access restricted.','error');setTimeout(function(){go('dashboard.html');},2000);return;}
  setupMgmtForm('invoice-form','btn-submit-invoice','invoice-loading','invoice',
    function(){
      var parts=[];
      document.querySelectorAll('#inv-items-body tr').forEach(function(row){
        var p=(row.querySelector('[name^="particulars_"]')||{}).value||'';
        if(p.trim())parts.push({particulars:p.trim(),accountCode:(row.querySelector('[name^="accCode_"]')||{}).value||'',amount:(row.querySelector('[name^="lineAmt_"]')||{}).value||''});
      });
      return{description:'Payment Voucher: '+fv('inv-payee'),invDate:fv('inv-date'),voucherNo:fv('inv-voucher-no'),chequeNo:fv('inv-cheque-no'),amount:fv('inv-amount'),payee:fv('inv-payee'),reqRef:fv('inv-req-ref'),lpoRef:fv('inv-lpo-ref'),vatApplies:($id('vat-yes')||{}).checked?'YES':'NO',vatAmount:fv('inv-vat-amount'),wht:fv('inv-wht'),total:fv('inv-total'),amountWords:fv('inv-amount-words'),donor:fv('inv-donor'),project:fv('inv-project'),budget:fv('inv-budget'),staff:fv('inv-staff'),partner:fv('inv-partner'),supplier:fv('inv-supplier'),budgetCategory:fv('inv-budget-cat'),particulars:JSON.stringify(parts)};
    },
    function(d){if(!d.payee)return'Please enter the payee name.';if(!d.amount||parseFloat(d.amount)<=0)return'Please enter a valid amount.';return'';}
  );
}

/* Travel & Accountability standalone pages */
async function initTravel(){
  if(!$id('travel-form'))return;
  if(!enforceAuth())return;navbar();wireLogout();
  var s=DS.getSession();
  var tn=$id('t-traveller-name'),tp=$id('t-position');
  var sn=$id('travel-submitter-name'),st=$id('travel-submitter-title');
  if(tn)tn.value=s.name;if(tp)tp.value=s.title;
  if(sn)sn.textContent=s.name;if(st)st.textContent=s.title;
  var rd=$id('t-request-date');if(rd)rd.value=new Date().toISOString().split('T')[0];
  setupMgmtForm('travel-form','btn-submit-travel','travel-loading','travel',
    function(){
      var routes=[];
      document.querySelectorAll('#route-table-body tr').forEach(function(row){
        var rv=(row.querySelector('[data-col="route"]')||{}).value||'';
        if(rv.trim())routes.push({route:rv.trim(),date:(row.querySelector('[data-col="date"]')||{}).value||'',perDiem:(row.querySelector('[data-col="perDiem"]')||{}).value||'',accommodation:(row.querySelector('[data-col="accommodation"]')||{}).value||'',sda:(row.querySelector('[data-col="sda"]')||{}).value||'',others:(row.querySelector('[data-col="others"]')||{}).value||'',total:(row.querySelector('[data-col="total"]')||{}).value||''});
      });
      return{description:'Travel Plan: '+fv('t-business-reason'),travellerName:fv('t-traveller-name'),position:fv('t-position'),requestDate:fv('t-request-date'),staffNumber:fv('t-staff-number'),departureDate:fv('t-departure-date'),returnDate:fv('t-return-date'),totalDays:fv('t-total-days'),businessNights:fv('t-business-nights'),businessReason:fv('t-business-reason'),grandTotal:fv('t-grand-total'),routes:JSON.stringify(routes)};
    },
    function(d){if(!d.departureDate)return'Please enter departure date.';if(!d.returnDate)return'Please enter return date.';if(!d.businessReason)return'Please enter the business reason.';return'';}
  );
}

async function initAcc(){
  if(!$id('accountability-form'))return;
  if(!enforceAuth())return;navbar();wireLogout();
  var s=DS.getSession();
  var sn=$id('acc-submitter-name'),st=$id('acc-submitter-title'),en=$id('acc-employee-name');
  if(sn)sn.textContent=s.name;if(st)st.textContent=s.title;if(en)en.value=s.name;
  var de=$id('acc-date');if(de)de.value=new Date().toISOString().split('T')[0];
  setupMgmtForm('accountability-form','btn-submit-accountability','acc-loading','accountability',
    function(){
      var expenses=[];
      document.querySelectorAll('#expenses-table-body tr').forEach(function(row){
        var exp=(row.querySelector('[data-col="explanation"]')||{}).value||'';
        if(exp.trim())expenses.push({accountCode:(row.querySelector('[data-col="accountCode"]')||{}).value||'',date:(row.querySelector('[data-col="date"]')||{}).value||'',explanation:exp.trim(),refNo:(row.querySelector('[data-col="refNo"]')||{}).value||'',budgeted:(row.querySelector('[data-col="budgeted"]')||{}).value||'',actual:(row.querySelector('[data-col="actual"]')||{}).value||'',balance:(row.querySelector('[data-col="balance"]')||{}).value||''});
      });
      return{description:'Accountability: '+fv('acc-purpose'),employeeName:fv('acc-employee-name'),date:fv('acc-date'),travelDates:fv('acc-travel-dates'),department:fv('acc-department'),purpose:fv('acc-purpose'),totalBudgeted:fv('acc-total-budgeted'),totalActual:fv('acc-total-actual'),advanceReceived:fv('acc-advance-received'),expenses:JSON.stringify(expenses)};
    },
    function(d){if(!d.travelDates)return'Please enter dates of travel/activity.';if(!d.purpose)return'Please enter the purpose.';return'';}
  );
}

/* ====================================
   HISTORY
==================================== */
function buildHistRow(rec){
  var desc=(rec.data&&rec.data.description)||rec.id;
  var pkg=rec.linkedForms&&rec.linkedForms.length?'<span style="font-size:0.65rem;background:#dcfce7;color:#14532d;padding:0.1rem 0.35rem;border-radius:3px;margin-left:3px;">pkg</span>':'';
  return'<tr>'+
    '<td><a href="#" class="link-hist-detail" data-id="'+esc(rec.id)+'">'+esc(rec.id)+'</a>'+pkg+'</td>'+
    '<td>'+esc(ftLbl(rec.formType))+'</td>'+
    '<td>'+esc(desc)+'</td>'+
    '<td>'+esc(rec.submittedByName||rec.submittedBy)+'</td>'+
    '<td>'+fmtDate(rec.createdAt)+'</td>'+
    '<td>'+fmtDate(rec.updatedAt)+'</td>'+
    '<td><span class="status-badge '+stCls(rec.status)+'">'+esc(rec.status)+'</span></td>'+
  '</tr>';
}
function renderHistTable(recs){
  var tb=$id('history-table-body'),em=$id('history-empty');if(!tb)return;
  if(!recs||!recs.length){tb.innerHTML='';if(em)em.style.display='block';return;}
  if(em)em.style.display='none';
  tb.innerHTML=recs.map(buildHistRow).join('');
}
function filterHist(){
  var sv=($id('history-filter-status')||{}).value||'';
  var ft=($id('history-filter-type')||{}).value||'';
  var sq=(($id('history-filter-search')||{}).value||'').toLowerCase();
  renderHistTable(_allRecs.filter(function(r){
    var d=(r.data&&r.data.description)||r.id||'';
    return(!sv||r.status===sv)&&(!ft||r.formType===ft)&&(!sq||r.id.toLowerCase().indexOf(sq)!==-1||d.toLowerCase().indexOf(sq)!==-1||(r.submittedByName||'').toLowerCase().indexOf(sq)!==-1);
  }));
}
async function initHist(){
  if(!$id('history-container'))return;
  if(!enforceAuth())return;navbar();wireLogout();wireModal();wireModalEvents();
  var ld=$id('history-loading');if(ld)ld.style.display='block';
  try{var recs=await DS.getAllRequisitions();_allRecs=Array.isArray(recs)?recs:[];renderHistTable(_allRecs);}
  catch(err){showBanner(err.message||'Failed.','error');}
  finally{if(ld)ld.style.display='none';}
  var fs=$id('history-filter-status'),ft=$id('history-filter-type'),fq=$id('history-filter-search');
  if(fs)fs.addEventListener('change',filterHist);if(ft)ft.addEventListener('change',filterHist);if(fq)fq.addEventListener('input',filterHist);
  var tb=$id('history-table-body');
  if(tb)tb.addEventListener('click',function(e){
    if(e.target.classList.contains('link-hist-detail')){
      e.preventDefault();
      var rec=_allRecs.find(function(r){return r.id===e.target.getAttribute('data-id');});
      if(rec)openModal(buildPackageView(rec));
    }
  });
}

/* ====================================
   ARCHIVES
==================================== */
async function initArchives(){
  if(!$id('archives-container'))return;
  if(!enforceAuth())return;navbar();wireLogout();
  var session=DS.getSession();
  if(DS.ELEVATED.indexOf(session.role)===-1){
    $id('archives-container').innerHTML='<div style="text-align:center;padding:3rem;"><h2 style="color:var(--red);">Access Restricted</h2><p>The Document Archive is available to Admin Officer, FAM and ED only.</p></div>';
    return;
  }
  var ld=$id('archives-loading');if(ld)ld.style.display='block';
  var archData={folders:[],unfiled:[]};
  var archSha=null;
  /* Also load all records for package details */
  var db=await DS.readDatabase();
  _allRecs=Array.isArray(db.records)?db.records:[];

  async function reload(){
    var ar=await DS.readArchives();
    archSha=ar.sha;
    archData=ar.data&&typeof ar.data==='object'&&!Array.isArray(ar.data)?ar.data:{folders:[],unfiled:[]};
    if(!archData.folders)archData.folders=[];
    if(!archData.unfiled)archData.unfiled=[];
    render();
    wireArchiveButtons();
  }

  function getRecord(recordId){return _allRecs.find(function(r){return r.id===recordId;});}

  function fileItemHtml(f,inFolderId){
    var rec=getRecord(f.recordId);
    return'<div class="folder-file-item" data-record-id="'+esc(f.recordId)+'" data-folder-id="'+esc(inFolderId||'')+'">'+
      '<div>'+
        '<div class="folder-file-name">'+esc(f.name||f.recordId)+'</div>'+
        '<div class="folder-file-meta">'+esc(ftLbl(f.formType))+' &nbsp;|&nbsp; '+esc(f.submittedByName)+' &nbsp;|&nbsp; Approved '+fmtDate(f.approvedAt)+'</div>'+
      '</div>'+
      '<div style="display:flex;gap:0.35rem;flex-wrap:wrap;">'+
        '<button class="btn btn-secondary btn-sm btn-arc-rename-file" data-rid="'+esc(f.recordId)+'" style="font-size:0.7rem;">Rename</button>'+
        (session.role==='FAM'?'<button class="btn btn-secondary btn-sm btn-arc-move-file" data-rid="'+esc(f.recordId)+'" style="font-size:0.7rem;">Move to Folder</button>':'')+
        (rec&&FR?'<button class="btn btn-primary btn-sm btn-arc-dl-pkg" data-rid="'+esc(f.recordId)+'" style="font-size:0.7rem;">Download Package</button>':'')+
        '<button class="btn btn-secondary btn-sm btn-arc-view" data-rid="'+esc(f.recordId)+'" style="font-size:0.7rem;">View</button>'+
      '</div>'+
    '</div>';
  }

  function render(){
    var list=$id('archives-list');if(!list)return;
    if(ld)ld.style.display='none';
    var totalFiles=archData.unfiled.length+archData.folders.reduce(function(s,f){return s+(f.files?f.files.length:0);},0);
    var statsEl=$id('archive-stats');
    if(statsEl)statsEl.innerHTML='<span class="stat-pill">'+archData.folders.length+' Folders</span> <span class="stat-pill">'+totalFiles+' Files</span>';

    var html='';

    /* Unfiled section */
    if(archData.unfiled.length){
      html+='<div class="folder-card" style="border-left-color:var(--amber);">'+
        '<div class="folder-header" onclick="this.nextElementSibling.classList.toggle(\'open\')">'+
          '<div class="folder-title">&#128193; Unfiled — Awaiting Filing ('+archData.unfiled.length+')</div>'+
          '<span style="font-size:0.75rem;color:var(--amber);font-weight:600;">Click to expand</span>'+
        '</div>'+
        '<div class="folder-body">'+archData.unfiled.map(function(f){return fileItemHtml(f,'__unfiled__');}).join('')+'</div>'+
      '</div>';
    }

    /* Folders */
    archData.folders.forEach(function(folder){
      html+='<div class="folder-card" data-folder-id="'+esc(folder.id)+'">'+
        '<div class="folder-header" onclick="this.nextElementSibling.classList.toggle(\'open\')">'+
          '<div class="folder-title">'+
            '&#128194; '+esc(folder.name)+
            ' <span style="font-size:0.72rem;font-weight:400;color:var(--gray-500);">('+((folder.files&&folder.files.length)||0)+' files)</span>'+
          '</div>'+
          '<div style="display:flex;gap:0.35rem;align-items:center;">'+
            (session.role==='FAM'?'<button class="btn btn-secondary btn-sm btn-rename-folder no-fold-toggle" data-fid="'+esc(folder.id)+'" style="font-size:0.7rem;">Rename</button>':'')+
            '<span style="font-size:0.75rem;color:var(--gray-500);">'+fmtDate(folder.createdAt)+'</span>'+
          '</div>'+
        '</div>'+
        '<div class="folder-body">'+
          ((folder.files&&folder.files.length)?folder.files.map(function(f){return fileItemHtml(f,folder.id);}).join(''):'<div style="padding:0.6rem;color:var(--gray-500);font-size:0.83rem;font-style:italic;">Empty folder. Move files here from Unfiled.</div>')+
        '</div>'+
      '</div>';
    });

    if(!archData.unfiled.length&&!archData.folders.length){
      html='<div style="text-align:center;padding:3rem;color:var(--gray-500);"><div style="font-size:2.5rem;margin-bottom:0.75rem;opacity:0.4;">&#128193;</div><p><strong>No archived files yet.</strong></p><p>Files appear here automatically when approved by the Executive Director.</p></div>';
    }

    list.innerHTML=html;
  }

  /* Wire archive clicks ONCE only — prevents listener stacking */
  var _arcWired=false;
  function wireArchiveButtons(){
    var list=$id('archives-list');
    if(!list)return;
    if(_arcWired)return;
    _arcWired=true;
    list.addEventListener('click',async function(e){
      var t=e.target;

      /* Rename folder */
      if(t.classList.contains('btn-rename-folder')){
        e.stopPropagation();
        var fid=t.getAttribute('data-fid');
        var folder=archData.folders.find(function(f){return f.id===fid;});
        if(!folder)return;
        var newName=prompt('New folder name:',folder.name);
        if(!newName||!newName.trim())return;
        t.disabled=true;
        try{await DS.renameArchiveFolder(fid,newName.trim(),session);await reload();}
        catch(err){alert('Failed: '+err.message);t.disabled=false;}
        return;
      }

      /* Rename file */
      if(t.classList.contains('btn-arc-rename-file')){
        var rid=t.getAttribute('data-rid');
        var f=archData.unfiled.find(function(x){return x.recordId===rid;})||null;
        if(!f)archData.folders.forEach(function(folder){if(!f&&folder.files)folder.files.forEach(function(x){if(x.recordId===rid)f=x;});});
        var newName=prompt('New file name:',f?f.name:rid);
        if(!newName||!newName.trim())return;
        t.disabled=true;
        try{await DS.renameArchivedFile(rid,newName.trim(),session);await reload();}
        catch(err){alert('Failed: '+err.message);t.disabled=false;}
        return;
      }

      /* Move to folder */
      if(t.classList.contains('btn-arc-move-file')){
        var rid=t.getAttribute('data-rid');
        if(!archData.folders.length){alert('No folders exist. Please create a folder first.');return;}
        var opts=archData.folders.map(function(f,i){return(i+1)+'. '+f.name;}).join('\n');
        var choice=prompt('Move to which folder?\n'+opts+'\n\nEnter number:');
        if(!choice)return;
        var idx=parseInt(choice)-1;
        if(isNaN(idx)||idx<0||idx>=archData.folders.length){alert('Invalid choice.');return;}
        t.disabled=true;
        try{await DS.moveFileToFolder(rid,archData.folders[idx].id,session);await reload();}
        catch(err){alert('Failed: '+err.message);t.disabled=false;}
        return;
      }

      /* View record */
      if(t.classList.contains('btn-arc-view')){
        var rid=t.getAttribute('data-rid');
        var rec=getRecord(rid);
        if(rec){wireModal();wireModalEvents();openModal(buildPackageView(rec));}
        else{alert('Record not found in current session. Please refresh.');}
        return;
      }

      /* Download package */
      if(t.classList.contains('btn-arc-dl-pkg')&&FR){
        var rid=t.getAttribute('data-rid');
        var rec=getRecord(rid);
        if(!rec)return;
        t.disabled=true;t.textContent='Building...';
        FR.downloadPackagePDF(rec,_allRecs,function(){t.disabled=false;t.textContent='Download Package';});
      }
    });
  }

  /* Create folder button */
  var cfBtn=$id('btn-create-folder');
  if(cfBtn){
    cfBtn.addEventListener('click',async function(){
      if(session.role!=='FAM'&&session.role!=='ED'){alert('Only FAM can create folders.');return;}
      var name=prompt('Folder name (e.g. Q1 2026 Procurement):');
      if(!name||!name.trim())return;
      cfBtn.disabled=true;cfBtn.textContent='Creating...';
      try{await DS.createArchiveFolder(name.trim(),session);await reload();showBanner('Folder "'+name+'" created.','success');}
      catch(err){showBanner('Failed: '+err.message,'error');}
      finally{cfBtn.disabled=false;cfBtn.textContent='+ New Folder';}
    });
  }

  /* Search */
  var sq=$id('archives-search');
  if(sq)sq.addEventListener('input',function(){
    var q=sq.value.toLowerCase();
    document.querySelectorAll('.folder-file-item').forEach(function(item){
      var txt=item.textContent.toLowerCase();
      item.style.display=txt.indexOf(q)!==-1?'':'none';
    });
  });

  /* Refresh */
  var rb=$id('btn-archive-refresh');
  if(rb)rb.addEventListener('click',async function(){rb.textContent='Refreshing...';await reload();rb.textContent='Refresh';});

  await reload();
}

/* ====================================
   ENTRY POINT
==================================== */
document.addEventListener('DOMContentLoaded',function(){
  if($id('login-form'))          {initLogin();      return;}
  if($id('dashboard-container')) {initDash();       return;}
  if($id('requisition-form'))    {initForm();       return;}
  if($id('travel-form'))         {initTravel();     return;}
  if($id('accountability-form')) {initAcc();        return;}
  if($id('evaluation-form'))     {initEvaluation(); return;}
  if($id('lpo-form'))            {initLPO();        return;}
  if($id('grn-form'))            {initGRN();        return;}
  if($id('invoice-form'))        {initInvoice();    return;}
  if($id('history-container'))   {initHist();       return;}
  if($id('archives-container'))  {initArchives();   return;}
  wireLogout();navbar();
});
}());
