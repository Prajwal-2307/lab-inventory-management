# Lab Inventory Management System

A modern, responsive, and interactive web-based **Lab Inventory Management System** built with **HTML, Vanilla CSS, JavaScript, PHP, MySQL, and Chart.js**.

Designed for colleges and research laboratories to manage laboratory equipment, chemicals, consumables, and apparatus, track stock levels in real time, and streamline item issuance.

---

## 🚀 Features

- **Executive Analytics Dashboard:**
  - Real-time KPI summary cards (Total Items, Low Stock alerts, Total Categories, Recent Issues).
  - Interactive Chart.js visualizations (Category Distribution Doughnut Chart & Stock Level Bar Chart).
  - Quick action shortcuts for instant inventory management.

- **Inventory Operations:**
  - Full inventory table with status badges (In Stock, Low Stock, Out of Stock).
  - Live search filter and category filtering.
  - Modal-based Add New Item functionality with comprehensive validation.
  - Quick Issue Modal with stock decrement and transaction logging.

- **Categorization & Location Tracking:**
  - Organized by department categories (Glassware, Chemicals, Electronics, Biology, Consumables).
  - Storage location mapping (Cabinet, Shelf, Room/Rack).

- **Robust Backend & Database:**
  - Prepared statements with PHP MySQLi for SQL injection protection.
  - Automated database schema with triggers/indexes and preloaded sample laboratory data.
  - JSON RESTful API endpoints.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Modern Vanilla CSS (CSS Variables, Glassmorphism, Dark/Light Mode, Grid/Flexbox), JavaScript (ES6+ Modules)
- **Charts & Visualization:** [Chart.js](https://www.chartjs.org/)
- **Backend:** PHP (Native / Object-Oriented MySQLi)
- **Database:** MySQL / MariaDB
- **Server:** Apache (XAMPP / WAMP / LAMP)

---

## 📁 Project Structure

```text
lab-inventory/
├── index.html            # Main Single-Page Application layout & views
├── style.css             # Premium custom CSS styling & responsive design
├── script.js             # Client-side state, API fetchers, Chart.js logic & modals
├── db.php                # Database connection helper with error handling
├── fetch_items.php       # API endpoint for retrieving inventory items
├── fetch_statistics.php  # API endpoint for dashboard KPI stats & chart datasets
├── add_item.php          # API endpoint to create and validate new inventory items
├── issue_item.php        # API endpoint to issue items and decrement stock
├── database.sql          # MySQL database schema and sample lab records
└── README.md             # Project documentation
```

---

## ⚡ Quick Setup Guide (XAMPP)

1. **Clone or Copy Repository:**
   Place this project directory into your XAMPP `htdocs` directory:
   ```bash
   # Example path:
   C:\xampp\htdocs\lab-inventory
   ```

2. **Start XAMPP:**
   - Open **XAMPP Control Panel**.
   - Start **Apache** and **MySQL**.

3. **Import the Database:**
   - Open your browser and navigate to `http://localhost/phpmyadmin/`.
   - Create a new database named `lab_inventory`.
   - Click on the **Import** tab.
   - Choose `database.sql` from the project folder and click **Import**.

4. **Run the Application:**
   - Visit: `http://localhost/lab-inventory/`

---

## 📄 License
This project is open source and available for educational and academic use.
