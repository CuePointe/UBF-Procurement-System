# Uganda Biodiversity Fund — Procurement & Logistics System

> **"For now & the future"**
>
> A secure, paperless procurement and logistics platform for the Uganda Biodiversity Fund — a lightweight web front-end backed by a managed database with server-enforced access control and a complete, tamper-evident audit trail.

---

## 🌿 About This System

The **UBF Procurement & Logistics System** is the Fund's internal portal for raising, reviewing, approving and archiving all procurement and logistics paperwork. It replaces manual, paper-based processes with a structured, role-based digital approval chain accessible from any device with a browser.

Every submission, approval, comment and attachment is recorded with a timestamp and the responsible officer, producing an **auditor-ready** history for every transaction.

---

## 🔗 Live Portal

```
https://cuepointe.github.io/UBF-Procurement-System/
```

---

## ✨ Key Features

- **Secure login** — email + password via managed authentication (salted, hashed); first-time users are forced to set their own password.
- **Server-enforced role-based access** — who can see and do what is decided by the database, not the browser, so the rules cannot be bypassed.
- **Approval workflow** — Submit → Prepare → Review → Clear → Approve, with rejection (and edit-and-resubmit) at any stage.
- **7 official UBF form templates** — faithful to the existing paper forms, print- and PDF-ready.
- **Packages** — bundle related forms (e.g. Request + LPO + Payment Voucher) into one submission; every form in a package is viewable inline for auditors.
- **"My Tasks"** — every user sees exactly what needs their action on the dashboard.
- **Executive Expenditure Report** — live financial dashboard with charts, breakdowns, and one-click **Excel/CSV export**.
- **Document Archive** — approved packages auto-filed, searchable, organised into folders by management.
- **Comments, management notes & attachments** — threaded discussion and supporting documents on every record.
- **Full audit trail** — every action permanently recorded with timestamp and user.
- **Responsive & mobile-friendly** — usable from a phone in the field.

---

## 👥 Staff Roles & Approval Chain

| Role | Responsibility in the workflow |
|---|---|
| **Staff** | Raise Requests, Travel Plans and Accountability forms; view and account for their own submissions |
| **Admin Officer** | **Prepares** submitted requests; may also raise management forms |
| **Finance Officer** | **Reviews** prepared requests |
| **FAM** (Finance & Administration Manager) | **Clears** reviewed requests; manages the Document Archive |
| **ED** (Executive Director) | **Approves** cleared requests; full oversight and Executive Expenditure Report |

### Approval chain

```
┌──────────┬────────────────┬─────────────────┬──────────────┬──────────────┐
│  Staff   │ Admin Officer  │ Finance Officer │     FAM      │      ED      │
│ Submits  │   Prepares     │    Reviews      │   Clears     │   Approves   │
│ PENDING  │   PREPARED     │    REVIEWED     │   CLEARED    │   APPROVED   │
└──────────┴────────────────┴─────────────────┴──────────────┴──────────────┘
```

At any stage a submission can be **Rejected** with a written reason; the original submitter can then edit and resubmit it.

> If no active Finance Officer is assigned, the FAM performs the Review step as well, so work never stalls.

---

## 📋 Available Forms

| Form | Available To | Purpose |
|---|---|---|
| Request for Goods / Services | All Staff | Official procurement request |
| Travel Business Plan | All Staff | Travel advance request with route breakdown |
| Advance Accountability & Expense Report | All Staff | Post-travel expense accountability |
| Evaluation Report | Management | Supplier price comparison and recommendation (add/remove supplier columns) |
| Local Purchase Order (LPO) | Management | Official purchase order issued to a vendor |
| Goods Received Note (GRN) | Management | Confirmation of goods received |
| Invoice / Payment Voucher | Management | Cheque payment authorisation |

---

## 🗂️ System Architecture

```
UBF-Procurement-System/
│
├── index.html               Login (email + password)
├── dashboard.html           Dashboard: My Tasks, stats, submissions
├── form.html                Request for Goods / Services (+ package builder)
├── travel-plan.html         Travel Business Plan
├── accountability.html      Advance Accountability & Expense Report
├── evaluation.html          Procurement Evaluation Report
├── lpo.html                 Local Purchase Order
├── grn.html                 Goods Received Note
├── invoice.html             Invoice / Payment Voucher
├── expenditure-report.html  Executive Expenditure Report (charts + CSV)
├── archives.html            Document Archive
├── history.html             Full audit history
├── help.html                User guide
│
├── data.js                  Data layer — talks to the Supabase backend
├── script.js                UI router and event handlers
├── form-renderer.js         Form rendering + PDF generation
├── style.css                UBF-branded stylesheet
│
├── ubf-logo.png             Brand logo
├── favicon.ico              Browser tab icon
└── apple-touch-icon.png     iOS home-screen icon
```

### Technology stack

| Layer | Technology |
|---|---|
| Front-end | HTML5, CSS3, vanilla JavaScript — no build step, no framework |
| Backend | **Supabase** — managed PostgreSQL, Authentication & Storage |
| Access control | PostgreSQL **Row-Level Security** + `SECURITY DEFINER` workflow functions |
| Auth | Supabase Auth (bcrypt-salted passwords, JWT sessions) |
| File storage | Supabase Storage (private bucket) |
| Hosting | GitHub Pages (static front-end) |
| Fonts | Plus Jakarta Sans |

The front-end holds only the project URL and a **publishable key** — safe to expose, because Row-Level Security enforces every rule on the server.

---

## 🔐 Security Model

- **Passwords** are salted and hashed by Supabase Auth — never stored in the code or repository.
- **Row-Level Security** guarantees staff can read and act on **only their own** records (plus the forms inside their own packages); management roles see all.
- **Approvals** flow through a single server-side gatekeeper function that enforces *role × status* — a staff member physically cannot approve, and no role can skip a step. The database refuses invalid transitions.
- **Attachments** live in a private storage bucket, accessible only to signed-in staff.
- **Audit trail** — every status change, comment and note is appended immutably to each record's history with the responsible officer and timestamp.
- **Sessions** are refreshed automatically and cleared on logout.

---

## 🛠️ System Administration

### Adding a new staff member
Create the account in the Supabase project (Authentication → Users), setting the user's `full_name`, `role` and `title` in the account metadata. A matching profile is created automatically. Roles must be one of: `Staff`, `Admin Officer`, `Finance Officer`, `FAM`, `ED`.

### Resetting a password
Set the staff member's `must_change_password` flag to `true` in their profile (and issue a temporary password); they will be prompted to set a new password on next login.

### Deactivating a staff member
Set `active` to `false` in their profile — they can no longer sign in, and their historical records remain intact for audit.

---

## 📞 Technical Support

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
| v3.0 | 2026 | Full procurement suite — Evaluation, LPO, GRN, Invoice, Executive Expenditure Report, Comments, Archive |
| v4.0 | 2026 | Migration to a secure Supabase backend (server-enforced access control), modern UI refresh, Finance Officer review stage, "My Tasks", CSV export, package viewing, mobile improvements |

---

*System developed and maintained by Thomas Otieno — Uganda Biodiversity Fund Digital Operations.*
