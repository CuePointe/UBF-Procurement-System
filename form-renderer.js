/**
 * form-renderer.js — UBF Form PDF Generator
 * Renders any filled UBF form as a proper PDF document.
 * Depends on html2pdf.js loaded from CDN when needed.
 */

(function(global){
'use strict';

/* ── UBF Brand ── */
var BLUE  = '#2D5A7E';
var BLIGHT= '#EBF3FA';
var GREEN = '#3A6B2A';
var DARK  = '#1A1A1A';

/* ── Load html2pdf dynamically (only when needed) ── */
function loadHtml2Pdf(cb){
  if(global.html2pdf){cb();return;}
  /* Check if script already appended but not yet loaded */
  var existing=document.querySelector('script[src*="html2pdf"]');
  if(existing){
    existing.addEventListener('load',function(){cb();});
    return;
  }
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  s.onload=function(){
    /* Small delay to ensure library fully initialises */
    setTimeout(function(){cb();},300);
  };
  s.onerror=function(){
    alert('Could not load PDF library. Please check your internet connection and try again.');
  };
  document.head.appendChild(s);
}

/* ── Shared UBF letterhead HTML ── */
function ubfHeader(formTitle){
  return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;'+
    'border-bottom:3px solid '+BLUE+';margin-bottom:14px;">'+
    '<div style="display:flex;align-items:center;gap:12px;">'+
      '<div style="font-size:11px;line-height:1.4;">'+
        '<div style="font-weight:700;color:'+BLUE+';font-size:12px;text-transform:uppercase;letter-spacing:1px;">Uganda Biodiversity Fund</div>'+
        '<div style="color:#666;font-size:10px;font-style:italic;">For now &amp; the future</div>'+
        '<div style="color:#888;font-size:9px;">Plot 425 Zzimwe Road, Kisugu, Kampala | PO Box 26156 | Tel: +256-393-216-445</div>'+
      '</div>'+
    '</div>'+
    '<div style="text-align:right;">'+
      '<div style="background:'+BLUE+';color:#fff;padding:6px 14px;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;">'+formTitle+'</div>'+
    '</div>'+
  '</div>';
}

/* ── Shared table styles ── */
var TS='border-collapse:collapse;width:100%;font-size:10px;margin-bottom:10px;';
var TH='background:'+BLIGHT+';color:'+BLUE+';font-weight:700;padding:5px 7px;border:1px solid #ccc;font-size:9px;text-transform:uppercase;';
var TD='padding:5px 7px;border:1px solid #ccc;';
var TH_DARK='background:'+BLUE+';color:#fff;font-weight:700;padding:5px 7px;border:1px solid #aaa;font-size:9px;text-transform:uppercase;';

function row2(label,value,label2,value2){
  return '<tr>'+
    '<td style="'+TH+' width:18%;">'+label+'</td>'+
    '<td style="'+TD+' width:32%;">'+safe(value)+'</td>'+
    '<td style="'+TH+' width:18%;">'+label2+'</td>'+
    '<td style="'+TD+' width:32%;">'+safe(value2)+'</td>'+
  '</tr>';
}
function row1(label,value){
  return '<tr>'+
    '<td style="'+TH+' width:18%;">'+label+'</td>'+
    '<td style="'+TD+' width:82%;" colspan="3">'+safe(value)+'</td>'+
  '</tr>';
}

function safe(v){
  if(v===null||v===undefined||v==='')return'<span style="color:#bbb">—</span>';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function approvalChain(rec){
  function cell(label,name,title,step){
    var a=rec.approval&&rec.approval[step];
    var done=a&&a.byName;
    return '<td style="border:1px solid #ccc;padding:8px;width:25%;vertical-align:top;">'+
      '<div style="font-size:8px;font-weight:700;text-transform:uppercase;color:'+BLUE+';margin-bottom:4px;">'+label+'</div>'+
      '<div style="font-weight:700;font-size:10px;">'+safe(name)+'</div>'+
      '<div style="font-size:9px;color:#666;">'+safe(title)+'</div>'+
      (done
        ? '<div style="margin-top:6px;font-size:9px;color:#14532d;font-weight:700;">&#10003; '+safe(a.byName)+' — '+fmtDate(a.at)+'</div>'
          +(a.note?'<div style="font-size:9px;color:#555;margin-top:2px;">'+safe(a.note)+'</div>':'')
        : '<div style="margin-top:18px;border-top:1px solid #999;font-size:8px;color:#aaa;padding-top:4px;">Signature &amp; Date</div>'
      )+
    '</td>';
  }
  return '<table style="'+TS+'border:1px solid #ccc;">'+
    '<tr>'+
      '<td style="border:1px solid #ccc;padding:8px;width:25%;vertical-align:top;">'+
        '<div style="font-size:8px;font-weight:700;text-transform:uppercase;color:'+BLUE+';margin-bottom:4px;">Submitted by</div>'+
        '<div style="font-weight:700;font-size:10px;">'+safe(rec.submittedByName)+'</div>'+
        '<div style="font-size:9px;color:#666;">'+safe(rec.submittedByTitle)+'</div>'+
        '<div style="font-size:9px;color:#555;margin-top:4px;">'+fmtDate(rec.createdAt)+'</div>'+
        '<div style="margin-top:18px;border-top:1px solid #999;font-size:8px;color:#aaa;padding-top:4px;">Signature &amp; Date</div>'+
      '</td>'+
      cell('Prepared by (Admin Officer)','Susan Abonyo','Administration Officer','preparation')+
      cell('Reviewed &amp; Cleared by (FAM)','Winnie Nabatanzi','Finance &amp; Administration Manager','clearance')+
      cell('Approved by (ED)','Ivan Amanigaruhanga','Executive Director','approval')+
    '</tr>'+
  '</table>';
}

function fmtDate(iso){
  if(!iso)return'—';
  try{return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}
  catch(_){return iso;}
}

function linkedFormsSection(rec){
  if(!rec.linkedForms||!rec.linkedForms.length)return'';
  return '<div style="margin-top:10px;">'+
    '<div style="font-weight:700;font-size:10px;color:'+BLUE+';border-bottom:1px solid '+BLUE+';padding-bottom:3px;margin-bottom:6px;">ATTACHED RELATED FORMS</div>'+
    rec.linkedForms.map(function(lf){
      return '<div style="font-size:10px;padding:3px 0;border-bottom:1px solid #eee;">'+
        '&#128196; <strong>'+safe(lf.id)+'</strong> — '+safe(lf.formType)+' — '+safe(lf.description)+
        ' <span style="color:'+BLUE+';">['+safe(lf.status)+']</span>'+
      '</div>';
    }).join('')+
  '</div>';
}

function managementNotesSection(rec){
  if(!rec.managementNotes||!rec.managementNotes.length)return'';
  return '<div style="margin-top:10px;">'+
    '<div style="font-weight:700;font-size:10px;color:'+BLUE+';border-bottom:1px solid '+BLUE+';padding-bottom:3px;margin-bottom:6px;">MANAGEMENT NOTES</div>'+
    rec.managementNotes.map(function(n){
      return '<div style="font-size:10px;padding:4px 6px;margin-bottom:4px;background:#f9f9f9;border-left:3px solid '+BLUE+';">'+
        '<strong>'+safe(n.byName)+'</strong> ('+safe(n.byRole)+') on '+fmtDate(n.at)+':'+
        '<div style="margin-top:2px;">'+safe(n.note)+'</div>'+
      '</div>';
    }).join('')+
  '</div>';
}

/* ══════════════════════════════════════════
   FORM RENDERERS
══════════════════════════════════════════ */

function renderRequest(rec){
  var d=rec.data||{};
  return ubfHeader('Request for Services / Goods')+
    '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px;">'+
      '<div><strong>Ref No:</strong> '+safe(rec.id)+'</div>'+
      '<div><strong>Date:</strong> '+fmtDate(rec.createdAt)+'</div>'+
      '<div><strong>Status:</strong> <span style="font-weight:700;color:'+BLUE+';">'+safe(rec.status)+'</span></div>'+
    '</div>'+
    '<table style="'+TS+'">'+
      row2('Activity Code',d.activityCode,'Description',d.description)+
      row1('Specification of Goods / Services Requested',d.specification)+
      row2('Quantity',d.quantity,'Date Required',d.dateRequired)+
      row1('Location of Work',d.locationOfWork)+
      row1('Contract Period',d.contractPeriod)+
      row2('Account Code',d.accountCode,'Account Name',d.accountName)+
      row2('Donor Code',d.donorCode,'Donor Name',d.donorName)+
      row2('Department',d.department,'Budget Code',d.budgetCode)+
    '</table>'+
    '<div style="font-weight:700;font-size:10px;color:'+BLUE+';margin:10px 0 6px;">AUTHORISATION</div>'+
    approvalChain(rec)+
    linkedFormsSection(rec)+
    managementNotesSection(rec);
}

function renderTravel(rec){
  var d=rec.data||{};
  var routes=[];
  try{routes=JSON.parse(d.routes||'[]');}catch(_){}
  return ubfHeader('Travel Business Plan')+
    '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px;">'+
      '<div><strong>Ref No:</strong> '+safe(rec.id)+'</div>'+
      '<div><strong>Status:</strong> <span style="font-weight:700;color:'+BLUE+';">'+safe(rec.status)+'</span></div>'+
    '</div>'+
    '<table style="'+TS+'">'+
      row2("Traveller's Name",d.travellerName,'Position / Grade',d.position)+
      row2('Departure Date',d.departureDate,'Return Date',d.returnDate)+
      row2('Total Days',d.totalDays,'Business Nights',d.businessNights)+
      row1('Business Reason',d.businessReason)+
    '</table>'+
    '<div style="font-weight:700;font-size:10px;color:'+BLUE+';margin:8px 0 4px;">ROUTE & COSTS</div>'+
    '<table style="'+TS+'">'+
      '<tr><th style="'+TH_DARK+'">Route</th><th style="'+TH_DARK+'">Date</th>'+
      '<th style="'+TH_DARK+'">Per Diem</th><th style="'+TH_DARK+'">Accommodation</th>'+
      '<th style="'+TH_DARK+'">SDA</th><th style="'+TH_DARK+'">Others</th><th style="'+TH_DARK+'">Total</th></tr>'+
      (routes.length?routes.map(function(r){
        return'<tr><td style="'+TD+'">'+safe(r.route)+'</td><td style="'+TD+'">'+safe(r.date)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(r.perDiem)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(r.accommodation)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(r.sda)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(r.others)+'</td>'+
          '<td style="'+TD+' text-align:right;font-weight:700;">'+safe(r.total)+'</td></tr>';
      }).join(''):'<tr><td colspan="7" style="'+TD+' text-align:center;color:#aaa;">No routes entered</td></tr>')+
      '<tr><td colspan="6" style="'+TH+' text-align:right;">TOTAL ADVANCE</td>'+
      '<td style="'+TD+' text-align:right;font-weight:700;background:#e8f4e8;">'+safe(d.grandTotal)+'</td></tr>'+
    '</table>'+
    approvalChain(rec)+linkedFormsSection(rec)+managementNotesSection(rec);
}

function renderAccountability(rec){
  var d=rec.data||{};
  var expenses=[];
  try{expenses=JSON.parse(d.expenses||'[]');}catch(_){}
  return ubfHeader('Advance Accountability & Expense Report')+
    '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px;">'+
      '<div><strong>Ref No:</strong> '+safe(rec.id)+'</div>'+
      '<div><strong>Status:</strong> <span style="font-weight:700;color:'+BLUE+';">'+safe(rec.status)+'</span></div>'+
    '</div>'+
    '<table style="'+TS+'">'+
      row2('Employee Name',d.employeeName,'Date',d.date)+
      row1('Dates of Travel / Activity',d.travelDates)+
      row2('Department',d.department,'Purpose',d.purpose)+
    '</table>'+
    '<div style="font-weight:700;font-size:10px;color:'+BLUE+';margin:8px 0 4px;">DETAILS OF EXPENSES</div>'+
    '<table style="'+TS+'">'+
      '<tr><th style="'+TH_DARK+'">Account Code</th><th style="'+TH_DARK+'">Date</th>'+
      '<th style="'+TH_DARK+'">Brief Explanation</th><th style="'+TH_DARK+'">Ref No</th>'+
      '<th style="'+TH_DARK+'">Budgeted</th><th style="'+TH_DARK+'">Actual</th><th style="'+TH_DARK+'">Balance</th></tr>'+
      (expenses.length?expenses.map(function(e){
        return'<tr><td style="'+TD+'">'+safe(e.accountCode)+'</td><td style="'+TD+'">'+safe(e.date)+'</td>'+
          '<td style="'+TD+'">'+safe(e.explanation)+'</td><td style="'+TD+'">'+safe(e.refNo)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(e.budgeted)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(e.actual)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(e.balance)+'</td></tr>';
      }).join(''):'<tr><td colspan="7" style="'+TD+' text-align:center;color:#aaa;">No expenses entered</td></tr>')+
      '<tr><td colspan="4" style="'+TH+' text-align:right;">Total Expenses</td>'+
      '<td style="'+TD+' font-weight:700;text-align:right;">'+safe(d.totalBudgeted)+'</td>'+
      '<td style="'+TD+' font-weight:700;text-align:right;">'+safe(d.totalActual)+'</td><td></td></tr>'+
      '<tr><td colspan="5" style="'+TH+' text-align:right;">Advance Received</td>'+
      '<td colspan="2" style="'+TD+' font-weight:700;text-align:right;">'+safe(d.advanceReceived)+'</td></tr>'+
    '</table>'+
    approvalChain(rec)+linkedFormsSection(rec)+managementNotesSection(rec);
}

function renderEvaluation(rec){
  var d=rec.data||{};
  var items=[];
  try{items=JSON.parse(d.items||'[]');}catch(_){}
  var s1=d.supplier1Name||'Supplier 1';
  var s2=d.supplier2Name||'Supplier 2';
  var s3=d.supplier3Name||'Supplier 3';
  return ubfHeader('Procurement Evaluation Report')+
    '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px;">'+
      '<div><strong>Ref No:</strong> '+safe(rec.id)+'</div>'+
      '<div><strong>Method:</strong> '+safe(d.evalMethod)+'</div>'+
      '<div><strong>Date:</strong> '+safe(d.evalDate)+'</div>'+
    '</div>'+
    '<table style="'+TS+'">'+
      row1('Item Description / Specification',d.description)+
      row2('Quantity',d.quantity,'Unit',d.unit)+
      row1('Suppliers Who Responded',d.suppliers)+
      row1('Evaluation Team',d.evalTeam)+
    '</table>'+
    '<div style="font-weight:700;font-size:10px;color:'+BLUE+';margin:8px 0 4px;">SUPPLIER PRICE COMPARISON</div>'+
    '<table style="'+TS+'">'+
      '<tr><th style="'+TH_DARK+'">Item</th><th style="'+TH_DARK+'">Qty</th>'+
      '<th style="'+TH_DARK+'">'+safe(s1)+'</th><th style="'+TH_DARK+'">'+safe(s2)+'</th>'+
      '<th style="'+TH_DARK+'">'+safe(s3)+'</th><th style="'+TH_DARK+'">Recommended</th></tr>'+
      (items.length?items.map(function(i){
        return'<tr><td style="'+TD+'">'+safe(i.item)+'</td><td style="'+TD+'">'+safe(i.qty)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(i.s1)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(i.s2)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(i.s3)+'</td>'+
          '<td style="'+TD+'">'+safe(i.rec)+'</td></tr>';
      }).join(''):'<tr><td colspan="6" style="'+TD+' text-align:center;color:#aaa;">No items</td></tr>')+
      '<tr><td colspan="2" style="'+TH+' text-align:right;">Sub Total</td>'+
      '<td style="'+TD+' font-weight:700;text-align:right;">'+safe(d.sub1)+'</td>'+
      '<td style="'+TD+' font-weight:700;text-align:right;">'+safe(d.sub2)+'</td>'+
      '<td style="'+TD+' font-weight:700;text-align:right;">'+safe(d.sub3)+'</td><td></td></tr>'+
      '<tr><td colspan="2" style="'+TH+' text-align:right;">Total (incl. VAT)</td>'+
      '<td style="'+TD+' font-weight:700;text-align:right;">'+safe(d.total1)+'</td>'+
      '<td style="'+TD+' font-weight:700;text-align:right;">'+safe(d.total2)+'</td>'+
      '<td style="'+TD+' font-weight:700;text-align:right;">'+safe(d.total3)+'</td><td></td></tr>'+
    '</table>'+
    '<table style="'+TS+'">'+
      row1('Recommendations',d.recommendations)+
      row1('Remarks',d.remarks)+
    '</table>'+
    approvalChain(rec)+linkedFormsSection(rec)+managementNotesSection(rec);
}

function renderLPO(rec){
  var d=rec.data||{};
  var items=[];
  try{items=JSON.parse(d.items||'[]');}catch(_){}
  return ubfHeader('Local Purchase Order')+
    '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px;">'+
      '<div><strong>LPO Ref:</strong> '+safe(rec.id)+'</div>'+
      '<div><strong>Date:</strong> '+safe(d.lpoDate)+'</div>'+
      '<div><strong>Status:</strong> <span style="font-weight:700;color:'+BLUE+';">'+safe(rec.status)+'</span></div>'+
    '</div>'+
    '<div style="font-weight:700;font-size:10px;color:'+BLUE+';margin-bottom:4px;">DETAILS OF VENDOR</div>'+
    '<table style="'+TS+'">'+
      row2('Vendor Name',d.vendorName,'Account Code',d.accountCode)+
      row2('Address',d.vendorAddress,'Vendor No',d.vendorNo)+
    '</table>'+
    '<div style="font-style:italic;font-size:10px;margin-bottom:6px;">Please supply the following goods: —</div>'+
    '<table style="'+TS+'">'+
      '<tr><th style="'+TH_DARK+' width:5%;">#</th>'+
      '<th style="'+TH_DARK+' width:40%;">Item Description and Specification</th>'+
      '<th style="'+TH_DARK+' width:10%;">Qty</th>'+
      '<th style="'+TH_DARK+' width:12%;">Unit</th>'+
      '<th style="'+TH_DARK+' width:15%;">Unit Price (UGX)</th>'+
      '<th style="'+TH_DARK+' width:18%;">Total Cost (UGX)</th></tr>'+
      (items.length?items.map(function(it,i){
        return'<tr><td style="'+TD+' text-align:center;">'+(i+1)+'</td>'+
          '<td style="'+TD+'">'+safe(it.description)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(it.qty)+'</td>'+
          '<td style="'+TD+'">'+safe(it.unit)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(it.unitPrice)+'</td>'+
          '<td style="'+TD+' text-align:right;font-weight:700;">'+safe(it.total)+'</td></tr>';
      }).join(''):'<tr><td colspan="6" style="'+TD+' text-align:center;color:#aaa;">No items</td></tr>')+
      '<tr><td colspan="5" style="'+TH+' text-align:right;">Sub Total</td>'+
        '<td style="'+TD+' text-align:right;font-weight:700;">'+safe(d.subtotal)+'</td></tr>'+
      '<tr><td colspan="5" style="'+TH+' text-align:right;">VAT (18%)</td>'+
        '<td style="'+TD+' text-align:right;">'+safe(d.vat)+'</td></tr>'+
      '<tr><td colspan="5" style="'+TH_DARK+' text-align:right;background:#1a3a52;">TOTAL</td>'+
        '<td style="background:#e8f4e8;'+TD+' text-align:right;font-weight:700;font-size:12px;">'+safe(d.total)+'</td></tr>'+
    '</table>'+
    '<table style="'+TS+'">'+
      row2('Valid For',d.validity,'Deliver At',d.deliverAt)+
      row1('Terms of Payment',d.paymentTerms)+
    '</table>'+
    '<div style="font-size:9px;font-style:italic;color:#888;margin-bottom:8px;">'+
      'NB: Goods supplied shall comply with agreed specification, standard and quality. '+
      'This Order is not valid until serially numbered and Officially Stamped.'+
    '</div>'+
    approvalChain(rec)+linkedFormsSection(rec)+managementNotesSection(rec);
}

function renderGRN(rec){
  var d=rec.data||{};
  var items=[];
  try{items=JSON.parse(d.items||'[]');}catch(_){}
  return ubfHeader('Goods Received Note')+
    '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px;">'+
      '<div><strong>GRN Ref:</strong> '+safe(rec.id)+'</div>'+
      '<div><strong>Date:</strong> '+safe(d.grnDate)+'</div>'+
      '<div><strong>Status:</strong> <span style="font-weight:700;color:'+BLUE+';">'+safe(rec.status)+'</span></div>'+
    '</div>'+
    '<div style="font-weight:700;font-size:10px;color:'+BLUE+';margin-bottom:4px;">DETAILS OF VENDOR</div>'+
    '<table style="'+TS+'">'+
      row1('Vendor Name',d.vendorName)+
      row1('Address',d.vendorAddress)+
      row2('Delivery Note No.',d.deliveryNoteNo,'Added to Register',d.addedToRegister)+
      row2('Related LPO No.',d.lpoRef,'Related Requisition',d.reqRef)+
    '</table>'+
    '<table style="'+TS+'">'+
      '<tr><th style="'+TH_DARK+' width:5%;">#</th>'+
      '<th style="'+TH_DARK+' width:50%;">Items Description and Specification</th>'+
      '<th style="'+TH_DARK+' width:15%;">Quantity</th>'+
      '<th style="'+TH_DARK+' width:15%;">Unit of Measure</th>'+
      '<th style="'+TH_DARK+' width:15%;">Condition</th></tr>'+
      (items.length?items.map(function(it,i){
        return'<tr><td style="'+TD+' text-align:center;">'+(i+1)+'</td>'+
          '<td style="'+TD+'">'+safe(it.description)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(it.qty)+'</td>'+
          '<td style="'+TD+'">'+safe(it.unit)+'</td>'+
          '<td style="'+TD+'">'+safe(it.condition)+'</td></tr>';
      }).join(''):'<tr><td colspan="5" style="'+TD+' text-align:center;color:#aaa;">No items</td></tr>')+
    '</table>'+
    '<table style="'+TS+'border:1px solid #ccc;">'+
      '<tr>'+
        '<td style="'+TD+' width:33%;vertical-align:top;">'+
          '<div style="font-size:9px;font-weight:700;color:'+BLUE+';margin-bottom:6px;text-transform:uppercase;">Delivered By</div>'+
          '<div style="font-size:10px;"><strong>'+safe(d.deliveredByName||'—')+'</strong></div>'+
          '<div style="font-size:9px;color:#666;">'+safe(d.deliveredByPosition||'—')+'</div>'+
          '<div style="font-size:9px;">Date: '+safe(d.deliveredByDate||'—')+'</div>'+
          '<div style="margin-top:20px;border-top:1px solid #999;font-size:8px;color:#aaa;padding-top:3px;">Signature</div>'+
        '</td>'+
        '<td style="'+TD+' width:33%;vertical-align:top;">'+
          '<div style="font-size:9px;font-weight:700;color:'+BLUE+';margin-bottom:6px;text-transform:uppercase;">Received By</div>'+
          '<div style="font-size:10px;"><strong>'+safe(d.receivedByName||rec.submittedByName||'—')+'</strong></div>'+
          '<div style="font-size:9px;color:#666;">'+safe(d.receivedByPosition||rec.submittedByTitle||'—')+'</div>'+
          '<div style="font-size:9px;">Date: '+safe(d.receivedByDate||'—')+'</div>'+
          '<div style="margin-top:20px;border-top:1px solid #999;font-size:8px;color:#aaa;padding-top:3px;">Signature</div>'+
        '</td>'+
        '<td style="'+TD+' width:33%;vertical-align:top;">'+
          '<div style="font-size:9px;font-weight:700;color:'+BLUE+';margin-bottom:6px;text-transform:uppercase;">Verified By</div>'+
          '<div style="font-size:10px;"><strong>'+safe(d.verifiedByName||'—')+'</strong></div>'+
          '<div style="font-size:9px;color:#666;">'+safe(d.verifiedByPosition||'—')+'</div>'+
          '<div style="font-size:9px;">Date: '+safe(d.verifiedByDate||'—')+'</div>'+
          '<div style="margin-top:20px;border-top:1px solid #999;font-size:8px;color:#aaa;padding-top:3px;">Signature</div>'+
        '</td>'+
      '</tr>'+
    '</table>'+
    linkedFormsSection(rec)+managementNotesSection(rec);
}

function renderInvoice(rec){
  var d=rec.data||{};
  var parts=[];
  try{parts=JSON.parse(d.particulars||'[]');}catch(_){}
  return ubfHeader('Cheque Payment Voucher')+
    '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px;">'+
      '<div><strong>Voucher No:</strong> '+safe(d.voucherNo||rec.id)+'</div>'+
      '<div><strong>Cheque No:</strong> '+safe(d.chequeNo)+'</div>'+
      '<div><strong>Date:</strong> '+safe(d.invDate)+'</div>'+
    '</div>'+
    '<table style="'+TS+'">'+
      row2('Amount (UGX)',d.amount,'Payee',d.payee)+
      row2('Related Requisition',d.reqRef,'Related LPO',d.lpoRef)+
    '</table>'+
    '<table style="'+TS+'">'+
      '<tr><th style="'+TH_DARK+' width:5%;">#</th>'+
      '<th style="'+TH_DARK+' width:55%;">Payment Particulars</th>'+
      '<th style="'+TH_DARK+' width:15%;">Account Code</th>'+
      '<th style="'+TH_DARK+' width:25%;">Amount (UGX)</th></tr>'+
      (parts.length?parts.map(function(p,i){
        return'<tr><td style="'+TD+' text-align:center;">'+(i+1)+'</td>'+
          '<td style="'+TD+'">'+safe(p.particulars)+'</td>'+
          '<td style="'+TD+'">'+safe(p.accountCode)+'</td>'+
          '<td style="'+TD+' text-align:right;">'+safe(p.amount)+'</td></tr>';
      }).join(''):'<tr><td colspan="4" style="'+TD+' text-align:center;color:#aaa;">No particulars</td></tr>')+
      '<tr><td colspan="3" style="'+TH+' text-align:right;">VAT ('+safe(d.vatApplies)+')</td>'+
        '<td style="'+TD+' text-align:right;">'+safe(d.vatAmount)+'</td></tr>'+
      '<tr><td colspan="3" style="'+TH+' text-align:right;">Less: Withholding Tax</td>'+
        '<td style="'+TD+' text-align:right;">'+safe(d.wht)+'</td></tr>'+
      '<tr><td colspan="3" style="'+TH_DARK+' text-align:right;">TOTAL</td>'+
        '<td style="background:#e8f4e8;'+TD+' text-align:right;font-weight:700;font-size:12px;">'+safe(d.total)+'</td></tr>'+
      '<tr><td colspan="4" style="'+TD+' font-style:italic;">'+safe(d.amountWords)+'</td></tr>'+
    '</table>'+
    '<div style="font-weight:700;font-size:10px;color:'+BLUE+';margin:8px 0 4px;">ACCOUNT CODING</div>'+
    '<table style="'+TS+'">'+
      row2('Donor Code',d.donor,'Project Code',d.project)+
      row2('Budget Code',d.budget,'Staff Code',d.staff)+
      row2('Partner Code',d.partner,'Supplier Code',d.supplier)+
      row1('Budget Category',d.budgetCategory)+
    '</table>'+
    approvalChain(rec)+linkedFormsSection(rec)+managementNotesSection(rec);
}

/* ── Master renderer ── */
function renderForm(rec){
  var t=rec.formType||'request';
  var renderers={
    request:renderRequest,
    travel:renderTravel,
    accountability:renderAccountability,
    evaluation:renderEvaluation,
    lpo:renderLPO,
    grn:renderGRN,
    invoice:renderInvoice
  };
  var fn=renderers[t]||renderRequest;
  return '<div style="font-family:Arial,sans-serif;font-size:10px;color:#1a1a1a;padding:16px;max-width:800px;margin:0 auto;">'+
    fn(rec)+
    '<div style="margin-top:16px;padding-top:8px;border-top:1px solid #ccc;font-size:8px;color:#aaa;text-align:center;">'+
      'Uganda Biodiversity Fund — Logistics &amp; Procurement System | '+rec.id+' | Generated '+new Date().toLocaleString('en-GB')+
    '</div>'+
  '</div>';
}

/* ── Download single form as PDF ── */
function downloadFormPDF(rec,cb){
  loadHtml2Pdf(function(){
    /* Build fully self-contained HTML with no CSS variables */
    var formHtml=renderForm(rec);
    var container=document.createElement('div');
    container.style.cssText=[
      'position:absolute',
      'top:0','left:0',
      'width:794px',
      'background:#ffffff',
      'font-family:Arial,Helvetica,sans-serif',
      'font-size:11px',
      'color:#111111',
      'padding:20px',
      'visibility:hidden',
      'z-index:-9999'
    ].join(';');
    container.innerHTML=formHtml;
    document.body.appendChild(container);
    var filename='UBF-'+rec.id+'-'+rec.formType+'.pdf';
    /* 800ms delay — lets html2canvas fully paint the element */
    setTimeout(function(){
      container.style.visibility='visible';
      html2pdf().set({
        margin:[10,10,10,10],
        filename:filename,
        image:{type:'jpeg',quality:1},
        html2canvas:{
          scale:2,
          useCORS:true,
          logging:false,
          backgroundColor:'#ffffff',
          removeContainer:false
        },
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}
      }).from(container).save().then(function(){
        container.style.visibility='hidden';
        document.body.removeChild(container);
        if(cb)cb();
      }).catch(function(err){
        if(document.body.contains(container))document.body.removeChild(container);
        alert('PDF generation failed. Please check your internet and try again. Error: '+err.message);
      });
    },800);
  });
}

/* ── Download complete document package as PDF ── */
function downloadPackagePDF(rec,allRecords,cb){
  loadHtml2Pdf(function(){
    /* Main form */
    var html='<div style="font-family:Arial,sans-serif;font-size:10px;color:#1a1a1a;padding:16px;max-width:800px;margin:0 auto;">';

    /* Package cover sheet */
    html+='<div style="background:'+BLUE+';color:#fff;padding:20px;margin-bottom:20px;text-align:center;">'+
      '<div style="font-size:16px;font-weight:700;margin-bottom:8px;">PROCUREMENT DOCUMENT PACKAGE</div>'+
      '<div style="font-size:12px;">Uganda Biodiversity Fund</div>'+
      '<div style="font-size:14px;font-weight:700;margin:8px 0;">'+safe(rec.id)+'</div>'+
      '<div style="font-size:11px;">'+safe(rec.submittedByName)+' | '+fmtDate(rec.createdAt)+'</div>'+
      '<div style="font-size:11px;margin-top:4px;">Status: <strong>'+safe(rec.status)+'</strong></div>'+
    '</div>';

    /* Table of contents */
    html+='<div style="background:#f5f5f5;padding:12px;margin-bottom:16px;border-left:4px solid '+BLUE+';">'+
      '<div style="font-weight:700;font-size:11px;margin-bottom:6px;color:'+BLUE+';">CONTENTS OF THIS PACKAGE</div>'+
      '<div style="font-size:10px;">1. '+safe(rec.id)+' — '+safe(rec.formType)+' (Main Form)</div>'+
      (rec.linkedForms&&rec.linkedForms.length?rec.linkedForms.map(function(lf,i){
        return '<div style="font-size:10px;">'+(i+2)+'. '+safe(lf.id)+' — '+safe(lf.formType)+'</div>';
      }).join(''):'')+
      (rec.attachments&&rec.attachments.length?
        '<div style="font-size:10px;margin-top:4px;font-style:italic;">Attached files: '+rec.attachments.length+' document(s)</div>':'')+
    '</div>';

    /* Main form */
    html+=renderForm(rec);

    /* Linked forms rendered in full */
    if(rec.linkedForms&&rec.linkedForms.length&&allRecords){
      rec.linkedForms.forEach(function(lf){
        var linkedRec=allRecords.find(function(r){return r.id===lf.id;});
        if(linkedRec){
          html+='<div style="page-break-before:always;"></div>';
          html+='<div style="background:#e8f4e8;padding:8px;margin-bottom:12px;font-weight:700;font-size:11px;color:'+GREEN+';">ATTACHED FORM: '+safe(lf.id)+'</div>';
          html+=renderForm(linkedRec);
        }
      });
    }

    /* Attachments list */
    if(rec.attachments&&rec.attachments.length){
      html+='<div style="page-break-before:always;"></div>'+
        '<div style="background:'+BLIGHT+';padding:12px;margin-bottom:12px;border-left:4px solid '+BLUE+';">'+
        '<div style="font-weight:700;font-size:12px;color:'+BLUE+';margin-bottom:8px;">SUPPORTING DOCUMENTS LIST</div>'+
        rec.attachments.map(function(a,i){
          return'<div style="padding:6px 0;border-bottom:1px solid #ddd;font-size:10px;">'+
            '<strong>'+(i+1)+'. '+safe(a.name)+'</strong>'+
            '<div style="color:#666;font-size:9px;">Uploaded: '+fmtDate(a.uploadedAt)+'</div>'+
            '<div style="color:'+BLUE+';font-size:9px;">Available at: '+safe(a.downloadUrl)+'</div>'+
          '</div>';
        }).join('')+
        '<div style="font-size:9px;color:#888;margin-top:8px;font-style:italic;">Note: Supporting documents are stored in the UBF repository and can be accessed via the links above.</div>'+
        '</div>';
    }

    html+='<div style="margin-top:16px;padding-top:8px;border-top:1px solid #ccc;font-size:8px;color:#aaa;text-align:center;">'+
      'Uganda Biodiversity Fund — Complete Procurement Package | '+rec.id+' | Generated '+new Date().toLocaleString('en-GB')+
    '</div></div>';

    var container=document.createElement('div');
    container.innerHTML=html;
    container.style.cssText='position:fixed;left:-9999px;top:0;background:#fff;width:800px;';
    document.body.appendChild(container);

    setTimeout(function(){
      container.style.visibility='visible';
    html2pdf().set({
      margin:[10,10,10,10],
      filename:'UBF-PACKAGE-'+rec.id+'.pdf',
      image:{type:'jpeg',quality:1},
      html2canvas:{scale:2,useCORS:true,logging:false,backgroundColor:'#ffffff',removeContainer:false},
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
      pagebreak:{mode:['css','legacy']}
    }).from(container).save().then(function(){
      document.body.removeChild(container);
      if(cb)cb();
    }).catch(function(err){
      if(document.body.contains(container))document.body.removeChild(container);
      alert('PDF generation failed. Please check your internet and try again. Error: '+err.message);
    });
    },800);
  });
}

/* ── Print form (clean print view) ── */
function printForm(rec){
  var html=renderForm(rec);
  var win=window.open('','_blank','width=850,height=1100');
  win.document.write(
    '<html><head><title>UBF — '+rec.id+'</title>'+
    '<style>body{margin:0;padding:0;}@media print{@page{margin:10mm;}}</style>'+
    '</head><body>'+html+
    '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script>'+
    '</body></html>'
  );
  win.document.close();
}

/* ── Expose ── */
global.FormRenderer={
  renderForm:renderForm,
  downloadFormPDF:downloadFormPDF,
  downloadPackagePDF:downloadPackagePDF,
  printForm:printForm
};

}(window));
