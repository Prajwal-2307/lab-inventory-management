# 🔬 Lab Inventory Management System

A modern, responsive, and production-ready **Laboratory Inventory & Equipment Management System** built with **HTML5, Vanilla CSS3, JavaScript (ES6+), PHP 8 (MySQLi), MySQL / MariaDB, Chart.js, QRCode.js, and HTML5-QRCode**.

Designed for colleges, universities, and research laboratories to **manage equipment records, print QR asset stickers, scan barcodes via live camera, track real-time availability and stock, manage student online reservations, handle inter-laboratory equipment transfers, track vendor warranties, and maintain a security activity audit trail**.

> **Project Milestone:** **Phase 3 Complete &mdash; 100% Production Ready**  
> For the comprehensive technical reference and database architecture, see [WALKTHROUGH.md](file:///d:/lab-inventory/WALKTHROUGH.md).

---

## 👥 Demo Profiles & Access Control (RBAC)

The system supports 3 institutional roles with dynamic permission-gating:

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** (Lab In-Charge) | `admin` | `admin123` | Full access: CRUD equipment, suppliers, transfers, audit logs, system settings |
| **Lab Assistant** (Technician) | `assistant` | `assist123` | Operational access: Issue & return, restock, inspections, transfers, reservations |
| **Student / Researcher** | `student` | `student123` | Self-service: Online equipment booking & reservations, view personal loans |

> **Tip:** You can switch between roles instantly using the topbar profile dropdown inside the application!

---

## 🚀 Key Features

### 1. 📊 Executive Analytics Dashboard
- **Real-time KPI Summary Cards:** Total Items, Units in Stock, Available for Issue, Active Loans, Overdue Warnings, and Under Maintenance.
- **Urgent Notification Strips:** Real-time alert banners for overdue borrowings and low-stock equipment.
- **Interactive Visualizations:** Category distribution bar chart and Stock overview doughnut chart using Chart.js.
- **Recent Inventory Table:** Quick overview of recent equipment records and circulation actions.

### 2. 📦 Comprehensive Equipment Records & Procurement
- **Detailed Asset Tagging:** Unique item code/tag, model/serial number, department category, precise room/bench/rack location, unit of measurement, and reorder threshold.
- **Procurement & Valuation Fields:** Purchase price (₹), purchase date, warranty expiration date, and vendor/supplier name.
- **Operational Condition Tracking:** Classify equipment health as `New`, `Good`, `Fair`, `Needs Maintenance`, or `Under Repair`.
- **Full Equipment Actions:** Add, Edit, Restock (`+ Stock`), View Specifications Sheet, and Delete (with active loan protection).

### 3. 🏷️ QR Code Asset Tagging & Live Camera Scanner
- **Printable QR Asset Sticker Tag:** 1-click generation of institutional asset stickers formatted for standard label printers with 2D QR codes and apparatus metadata.
- **HTML5 Camera QR & Barcode Scanner:** Scan apparatus tags using a laptop webcam or mobile camera to identify items instantly and trigger 1-click Issue, Return, or Specs Sheet lookup.
- **Manual Asset Lookup:** Instant tag search fallback if camera access is restricted.

### 4. 📅 Student Online Booking & Reservation Portal
- **Advance Lab Slot Bookings:** Students can reserve apparatus for upcoming lab practical exams or research experiments.
- **Time Slot Gating:** Morning (09:00–12:00), Afternoon (12:00–02:00), and Evening (02:00–05:00) slots.
- **Approval Workflow:** Technicians can approve or reject bookings; approved reservations convert into active circulation loans with a single click.

### 5. 🔄 Inter-Laboratory Equipment Transfers
- **Multi-Lab Mobility:** Transfer apparatus between physics, chemistry, electronics, and computing labs across campus.
- **Origin Location Auto-Detection:** Automatically populates current equipment location.
- **Custody Sign-Off:** Dispatch apparatus and verify receipt at destination; receiving custody automatically updates the apparatus's location in the inventory master table.

### 6. 🏢 Vendors, Procurement & Warranty Tracking
- **Supplier Directory:** Register vendors with contact persons, phone numbers, emails, addresses, and service ratings.
- **Capital Valuation Calculator:** Real-time calculation of total equipment capital investment in ₹.
- **Warranty Expiry Alerts:** Real-time tracking of warranties expiring within 30 days or already expired.

### 7. 🛡️ Security Activity Audit Trail & Overdue Notices
- **Tamper-Evident Activity Log:** Chronological log recording every equipment creation, update, loan issue, return inspection, maintenance certification, and transfer.
- **CSV Export:** Download full audit trails for compliance and institutional reporting.
- **Automated Overdue Notice Generator:** Compiles list of unreturned items with overdue days, formatted reminder template, and email notification simulation.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Modern Vanilla CSS (Design Tokens, Glassmorphism, Responsive Grid/Flexbox), JavaScript (ES6+)
- **Visualizations & QR:** [Chart.js](https://www.chartjs.org/), [QRCode.js](https://davidshimjs.github.io/qrcodejs/), [HTML5-QRCode](https://github.com/mebjas/html5-qrcode)
- **Backend:** PHP 8 (Object-Oriented MySQLi, Prepared Statements, Self-Healing Schema Migrations)
- **Database:** MariaDB / MySQL 10.4+ (InnoDB, Foreign Keys, Triggers, UTF8MB4)
- **Server:** Apache (XAMPP / WAMP / LAMP)

---

## 📁 Project Structure

```text
lab-inventory/
├── index.html            # Single-Page Application (All sections, modals, topbar, sidebar)
├── style.css             # Vanilla CSS design system, responsive layouts & printable stickers
├── script.js             # SPA router, API handlers, Chart.js, QR generator, camera scanner
├── db.php                # Database connection, sanitize helpers & auto-migration engine
├── auth.php              # Multi-role authentication & quick role switching
├── fetch_statistics.php  # Dashboard & Phase 3 KPI counters
├── fetch_items.php       # Equipment catalog with multi-criteria filtering
├── add_item.php          # Insert equipment with procurement details
├── update_item.php       # Update equipment record & specifications
├── delete_item.php       # Delete equipment (loan-protected)
├── restock_item.php      # Quick replenishment & stock adjustments
├── issue_item.php        # Create active circulation loan
├── return_item.php       # Return equipment & condition inspection
├── fetch_issues.php      # Active loans & circulation history
├── maintenance_api.php   # Schedule & complete maintenance tickets
├── reservations_api.php  # Student online booking & slot reservations
├── transfers_api.php     # Inter-laboratory equipment transfers
├── vendors_api.php       # Supplier directory & warranty tracking
├── audit_api.php         # Security & activity audit trail
├── database.sql          # Complete MySQL database schema & sample datasets
├── WALKTHROUGH.md        # Technical walkthrough, ER diagram & API reference
└── README.md             # Project documentation
```

---

## ⚡ Quick Setup Guide (XAMPP)

1. **Place Project in XAMPP:**
   Ensure this project directory is in your XAMPP `htdocs` directory:
   ```text
   C:\xampp\htdocs\lab-inventory
   ```
2. **Start Services:**
   Open the **XAMPP Control Panel** and start **Apache** and **MySQL**.
3. **Database Migration:**
   The application features automatic self-healing migrations. Opening `index.html` via Apache will automatically create all missing tables and seed sample data. Alternatively, you can import `database.sql` via phpMyAdmin:
   - Navigate to `http://localhost/phpmyadmin/`
   - Create database `lab_inventory` and import `database.sql`.
4. **Open Application:**
   Visit:
   ```text
   http://localhost/lab-inventory/
   ```
   Sign in with `admin` / `admin123` to access the full system!

---

*Laboratory Inventory Management System – 100% Production Ready.*
