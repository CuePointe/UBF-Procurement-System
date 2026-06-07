# Uganda Biodiversity Fund — Logistics & Procurement System

> **"For now & the future"**
> 
> A fully serverless, paperless procurement management system built natively on GitHub Pages — no backend server, no database fees, no maintenance overhead.

---

## 🌿 About This System

The **UBF Logistics & Procurement System** is a web-based internal portal developed for the Uganda Biodiversity Fund to digitise, streamline and audit all procurement and logistics workflows. It replaces manual paper-based processes with a structured, role-based digital approval chain that is accessible to all staff from any device with a browser.

All data is stored securely inside this GitHub repository. All approvals, submissions, comments and attachments are permanently recorded as Git commits — creating a tamper-proof audit trail.

---

## 🔗 Live Portal

```
https://cuepointe.github.io/UBF-Request-Portal/
```

---

## ✨ Key Features

- **Secure login** — email + password authentication with 90-day password expiry
- **Role-based access** — each staff member sees only what their role permits
- **5-step approval workflow** — Submit → Prepare → Review → Clear → Approve
- **7 official UBF form templates** — all strictly following existing paper templates
- **Executive Expenditure Report** — live financial dashboard auto-generated from all submissions
- **Comments & replies** — threaded discussion on every submission
- **File attachments** — upload and attach supporting documents to any record
- **Share & Forward** — copy summaries, attach files and forward submissions with notes
- **Print / Download** — every form is print-ready with one click
- **Full audit trail** — every action is permanently recorded with timestamp and user
- **100% serverless** — runs entirely on GitHub Pages, zero hosting cost

---

## 👥 Staff Roles & Permissions

| Role | Staff Member | Permissions |
|---|---|---|
| **Staff** | David Okullu, Posiano Musiime, Owen Atuhaire, Tom Otieno | Submit forms, view own submissions, comment, attach files |
| **Admin Officer** | Susan Abonyo | All of the above + view all submissions + **Prepare** step |
| **FAM** | Winnie Nabatanzi | All of the above + **Review** and **Clear** steps + Evaluation, LPO, Invoice |
| **ED** | Ivan Amanigaruhanga | All of the above + **Final Approval** + Executive Expenditure Report |

---

## 📋 Available Forms

| Form | Available To | Purpose |
|---|---|---|
| Request for Goods / Services | All Staff | Official procurement request |
| Travel Business Plan | All Staff | Travel advance request with route breakdown |
| Advance Accountability & Expense Report | All Staff | Post-travel expense accountability |
| Evaluation Report | Admin Officer, FAM, ED | Supplier price comparison and recommendation |
| Local Purchase Order (LPO) | Admin Officer, FAM, ED | Official purchase order issued to vendor |
| Goods Received Note (GRN) | Admin Officer, FAM, ED | Confirmation of goods received |
| Invoice / Payment Voucher | Admin Officer, FAM, ED | Cheque payment authorisation |

---

## 🔄 Approval Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  PROCUREMENT APPROVAL CHAIN                  │
├──────────┬──────────────┬──────────────┬──────────────────────┤
│  Staff   │ Admin Officer│     FAM      │         ED           │
│ Submits  │   Prepares   │   Reviews    │      Approves        │
│          │              │   & Clears   │                      │
│ PENDING  │  PREPARED    │  REVIEWED    │      APPROVED        │
│          │              │  → CLEARED   │                      │
└──────────┴──────────────┴──────────────┴──────────────────────┘
```

At any stage, a submission can be **Rejected** with a written reason. Rejected submissions can be edited and resubmitted by the original submitter.

---

## 📊 Executive Expenditure Report

Available to Admin Officer, FAM and ED. Automatically generates:

- Total committed, approved, pending and rejected expenditure (UGX)
- Monthly expenditure trend with visual bar charts
- Breakdown by form type, department, donor and approval status
- Approved expenditures register
- Travel advances and accountability tracking
- Full transaction register with filters by date, type, status and department

---

## 🗂️ System Architecture

```
UBF-Request-Portal/
│
├── index.html               Login page
├── dashboard.html           Main dashboard with stats and submissions table
├── form.html                Request for Goods / Services form
├── travel-plan.html         Travel Business Plan form
├── accountability.html      Advance Accountability & Expense Report
├── evaluation.html          Procurement Evaluation Report
├── lpo.html                 Local Purchase Order
├── grn.html                 Goods Received Note
├── invoice.html             Invoice / Payment Voucher
├── expenditure-report.html  Executive Expenditure Report
├── history.html             Full audit history
│
├── data.js                  GitHub API layer — all data read/write operations
├── script.js                UI router and event handlers
├── style.css                UBF branded stylesheet
│
└── data/
    ├── requisitions.json    Live database — all form submissions
    └── users.json           Staff accounts and hashed passwords
```

**Technology Stack:**
- Frontend: Pure HTML5, CSS3, Vanilla JavaScript
- Database: GitHub Contents API (JSON flat-file)
- Authentication: SHA-256 password hashing via Web Crypto API
- Hosting: GitHub Pages (free, zero infrastructure)
- Storage: GitHub repository (1 GB limit, effectively unlimited for this use case)

---

## 🔐 Security

- Passwords are hashed using **SHA-256** in the browser before any comparison — plain text passwords are never stored or transmitted
- Each password expires every **90 days** — staff are forced to set a new password on expiry
- Sessions expire after **8 hours** of inactivity
- The GitHub Personal Access Token (PAT) is stored in browser `localStorage` and is never embedded in source code
- All API calls go directly to `api.github.com` over HTTPS
- Role-based filtering ensures staff can only see their own submissions

---

## 🛠️ System Administration

### Adding a New Staff Member

1. Open `data/users.json` in this repository
2. Add a new entry following this format:

```json
{
  "email": "newstaff@ugandabiodiversityfund.org",
  "name": "Full Name",
  "role": "Staff",
  "title": "Job Title",
  "passwordHash": "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
  "passwordExpiry": "2026-12-31",
  "mustChangePassword": true,
  "active": true
}
```

3. Also add the email and role to the `STAFF` object in `data.js`
4. The default password hash above corresponds to `admin` — the new staff member will be forced to change it on first login

### Resetting a Password

Edit `data/users.json`, set `mustChangePassword` to `true` and `passwordExpiry` to a past date. The staff member will be prompted to set a new password on next login.

### Deactivating a Staff Member

Set `"active": false` in their entry in `data/users.json`.

---

## 📞 Technical Support

For technical issues with the portal, contact the system administrator:

**Tom Otieno**
Email: t.otieno@ugandabiodiversityfund.org
Role: Staff & System Developer

---

## 🏢 Organisation

**Uganda Biodiversity Fund (UBF)**
Plot 425 Zzimwe Road, Kisugu, Kampala
PO Box 26156, Kampala, Uganda
Fixed Tel: +256-393-216-445
Email: info@ugandabiodiversityfund.org
Website: www.ugandabiodiversityfund.org

*For now & the future*

---

## 📄 Version History

| Version | Date | Description |
|---|---|---|
| v1.0 | 2025 | Initial deployment — Request form + basic approval workflow |
| v2.0 | 2025 | Password authentication, Travel Plan, Accountability form |
| v3.0 | 2026 | Full procurement suite — Evaluation, LPO, GRN, Invoice, Executive Expenditure Report, Share Panel, Comments |

---

*System developed and maintained by Digital Marketing Analyst: Thomas Otieno — Uganda Biodiversity Fund Digital Operations*
