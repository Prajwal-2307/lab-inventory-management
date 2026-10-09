# 🔬 Lab Inventory Management System

A modern, responsive, and production-ready **Laboratory Inventory & Equipment Management System** built with **HTML5, Vanilla CSS3, JavaScript (ES6+), PHP 8 (MySQLi), MySQL / MariaDB, and Chart.js**.

Designed for colleges, universities, and research laboratories to **manage equipment records, track real-time availability and stock, monitor equipment usage and maintenance, streamline circulation loans, and generate executive audit reports**.

> **Project Milestone:** Phase 2 Complete &mdash; **70% Overall Completion**  
> For the complete development walkthrough and Phase 3 (100%) roadmap, see [WALKTHROUGH.md](file:///d:/lab-inventory/WALKTHROUGH.md).

---

## 🚀 Key Features (Phase 2 &mdash; 70% Milestone)

### 1. 📊 Executive Analytics Dashboard
- **Real-time KPI Summary Cards:** Equipment Item Types, Total Units, Available Units, Active Loans, Low Stock Alerts, and In Maintenance count.
- **Urgent Notification Strips:** Real-time alert banners for overdue borrowings and low-stock equipment.
- **Interactive Visualizations:** Category distribution bar chart and Stock overview doughnut chart using Chart.js.
- **Recent Inventory Table:** Quick overview of recent equipment records and circulation actions.

### 2. 📦 Comprehensive Equipment Records Management
- **Detailed Asset Tagging:** Unique item code/tag, model/serial number, department category, precise room/bench/rack location, unit of measurement, and reorder threshold.
- **Operational Condition Tracking:** Classify equipment health as `New`, `Good`, `Fair`, `Needs Maintenance`, or `Under Repair`.
- **Full Equipment Actions:**
  - **Add New Equipment:** Modal with input validation and auto-tag generation.
  - **Edit Equipment Record:** Update specifications, location, quantity, and condition.
  - **Quick Restock Modal (`+ Stock`):** Add incoming stock with invoice/purchase order references.
  - **Specification Sheet Modal:** View detailed specifications, current stock, and loan history.
  - **Delete Equipment:** Secure deletion with active loan constraint protection.
- **Multi-Criteria Search & Filtering:** Filter simultaneously by category chips, condition dropdown, stock status, and text search.

### 3. 🔄 Full Issue & Return Circulation Suite
- **Issue Equipment Modal:**
  - Select item with live available stock and location hint.
  - Capture borrower name, student/faculty ID, department, quantity, and session notes.
  - Specify Expected Return Date (Due Date).
- **Active Loans Table:**
  - Real-time loan tracking with dynamic overdue detection and days remaining.
  - Overdue loans display an animated red badge with an exact count of days overdue.
- **Return Workflow:**
  - 1-click **Return Item** modal to inspect condition (`Good`, `Fair`, `Needs Repair`, `Damaged`) and log return remarks.
  - Automatically restores available stock in MySQL and marks the item condition if damaged.
- **Circulation History & Audit Log:** Full historical table of all past loans with return timestamps and conditions.

### 4. 🛠️ Equipment Maintenance & Calibration Module
- **Service Ticket Logging:** Schedule or record `Routine Inspection`, `Calibration`, `Preventive Maintenance`, or `Repair`.
- **Vendor & Cost Tracking:** Track technician/vendor names, service dates, expenditure costs, and technical notes.
- **Condition Synchronization:** Items undergoing repair automatically update equipment condition to `Under Repair`; completing a ticket restores the item to `Good`.
- **Summary Metrics:** Total service events, in-progress tickets, completed certifications, and total expenditure.

### 5. 📑 Audits, Reports & Data Export
- **Four Integrated Report Types:**
  1. *Comprehensive Inventory Stock Report* (equipment master list, stock levels, location, condition).
  2. *Equipment Circulation & Loan History* (borrowers, loan durations, return inspection).
  3. *Low Stock & Replenishment Reorder Report* (deficit calculations and reorder suggestions).
  4. *Maintenance, Repair & Health Report* (service events, calibration logs, expenditures).
- **Export to CSV:** Instant 1-click download of clean, structured CSV files for Excel, Google Sheets, or ERP systems.
- **Institutional Print / Save as PDF:** Formatted `@media print` layout with official institutional header, metadata, summary statistics, and clean printable tables.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Modern Vanilla CSS (Design Tokens, Glassmorphism, Responsive Grid/Flexbox), JavaScript (ES6+ Modules)
- **Visualizations:** [Chart.js](https://www.chartjs.org/)
- **Backend:** PHP 8 (Object-Oriented MySQLi, Prepared Statements)
- **Database:** MySQL 8.0+ / MariaDB (InnoDB, Foreign Keys, Triggers, UTF8MB4)
- **Server:** Apache (XAMPP / WAMP / LAMP)

---

## 📁 Project Structure

```text
lab-inventory/
├── index.html            # Main Single-Page Application (Dashboard, Inventory, Issue & Return, Maintenance, Reports)
├── style.css             # Custom CSS design system, responsive styles & print layout
├── script.js             # Client-side state, API fetchers, Chart.js logic, modals & CSV export
├── db.php                # MySQL database connection helper with error handling
├── fetch_items.php       # API endpoint for equipment records with multi-criteria filtering
├── fetch_statistics.php  # API endpoint for dashboard KPI stats & circulation analytics
├── add_item.php          # API endpoint to create and validate new equipment records
├── update_item.php       # API endpoint to edit equipment specifications and condition
├── delete_item.php       # API endpoint to delete records with active loan constraint protection
├── restock_item.php      # API endpoint for quick replenishment and stock adjustments
├── issue_item.php        # API endpoint to issue equipment with borrower details & due date
├── return_item.php       # API endpoint to return equipment, restore stock & inspect condition
├── fetch_issues.php      # API endpoint for active loans, overdue alerts & circulation history
├── maintenance_api.php   # API endpoint for scheduling and completing maintenance tickets
├── fetch_reports.php     # API endpoint for aggregated audit reports & export datasets
├── database.sql          # Complete MySQL schema, triggers, indexes & sample lab records
├── WALKTHROUGH.md        # Comprehensive development walkthrough & Phase 3 (100%) roadmap
└── README.md             # Project documentation
```

---

## ⚡ Quick Setup Guide (XAMPP)

1. **Place Project in XAMPP:**
   Ensure this project directory is in your XAMPP `htdocs` directory:
   ```bash
   C:\xampp\htdocs\lab-inventory
   ```

2. **Start XAMPP Services:**
   - Open **XAMPP Control Panel**.
   - Start **Apache** and **MySQL**.

3. **Import Database Schema:**
   - Open your browser and go to `http://localhost/phpmyadmin/`.
   - Select or create the database `lab_inventory`.
   - Click the **Import** tab, select `database.sql`, and click **Import**.

4. **Launch the Application:**
   - Open `http://localhost/lab-inventory/` in your browser.

---

## 🔮 Roadmap to 100% (Phase 3)

For full details on upcoming updates, see [WALKTHROUGH.md](file:///d:/lab-inventory/WALKTHROUGH.md):
- **User Roles & Authentication:** Admin, Lab Assistant, and Student logins with role permissions.
- **Barcode & QR Code Scanning:** Printable QR asset tags and camera scanner integration.
- **Automated Notifications:** Email/SMS due-date reminders and automated overdue alerts.
- **Multi-Lab Transfers:** Inter-room and inter-departmental equipment custody transfers.
- **Vendor Directory & POs:** Vendor records, purchase orders, and warranty expiration alerts.
- **Student Online Reservations:** Advance booking portal for laboratory time slots.

---

## 📄 License
This project is open-source and available for educational and academic laboratory use.
