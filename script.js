/**
 * script.js – Lab Inventory Management System (Phase 2 - 70%)
 * Handles:
 *  - Dynamic SPA Navigation
 *  - Equipment Records Management (CRUD, Search, Multi-Filter, Specs Sheet)
 *  - Quick Restock & Stock Replenishment
 *  - Full Issue & Return Workflow (Borrowers, Due Dates, Overdue Alerting, Return Inspection)
 *  - Equipment Maintenance & Calibration Monitoring
 *  - Comprehensive Reports Generation (Analytics, CSV Export, Printable PDF Layout)
 *  - Chart.js Visualizations & Toast Notifications
 */

'use strict';

/* ════════════════════════════════════════════════════════════════
   STATE MANAGEMENT
   ════════════════════════════════════════════════════════════════ */
const State = {
  items:                [],        // all equipment items from server
  filteredItems:        [],        // filtered item list
  stats:                {},        // dashboard & KPI statistics
  categories:           [],        // category breakdown data
  loans:                [],        // issue & return loan records
  maintenanceRecords:   [],        // maintenance records
  reservations:         [],        // phase 3: student reservations
  filteredReservations: [],
  transfers:            [],        // phase 3: inter-lab equipment transfers
  filteredTransfers:    [],
  vendors:              [],        // phase 3: vendors & procurement
  filteredVendors:      [],
  auditLogs:            [],        // phase 3: security & activity audit trail
  filteredAuditLogs:    [],
  currentUser:          null,      // phase 3: logged in user profile & role
  currentReports:       null,      // active report dataset
  currentSection:       'dashboard',
  currentIssueTab:      'active',  // 'active' or 'history'
  isSidebarCollapsed:   false,
  isMobile:             false,
  activeFilter:         'all',     // category filter
  activeConditionFilter:'all',     // condition filter
  activeStatusFilter:   'all',     // status filter
  activeLoanFilter:     'all',     // loan status filter
  activeResFilter:      'All',     // reservation filter
  activeTrfFilter:      'All',     // transfer filter
  activeAuditFilter:    'All',     // audit action filter
  qrScanner:            null,      // Html5Qrcode instance
  lastScannedItem:      null,      // last detected item from QR
  charts: {
    category:     null,
    stock:        null,
    catDetail:    null,
    reportChart1: null,
    reportChart2: null,
  },
  settings: {
    orgName:           'Central Engineering College',
    deptName:          'Department of Electronics & Communication',
    labName:           'Central Hardware & Research Lab',
    roomNo:            'Room 201 - Science Block',
    inchargeName:      'Prof. H. R. Sharma',
    inchargeEmail:     'lab-incharge@univ.edu',
    loanDays:          14,
    maxItems:          2,
    minStock:          3,
    noticeDays:        2,
    allowWeekend:      true,
    autoOverdueBanner: true,
    currency:          '₹',
    dateFormat:        'YYYY-MM-DD',
    pageSize:          25,
    theme:             'forest',
    scanBeep:          true,
    showQuickStats:    true,
  }
};

/* ── Fallback Dataset for Standalone/Local File & Offline Mode ───── */
const FALLBACK_ITEMS = [
  { id: 1,  item_code: 'EQ-EL-001', item_name: 'Digital Multimeter',   model_no: 'Fluke 87V',                  category: 'Electronics', location: 'Room 201 - Bench B2',          unit: 'Units',   total_quantity: 20, issued_quantity: 6,  available_quantity: 14, status: 'Available', item_condition: 'Good',              min_threshold: 3, purchase_price: 18500.00, purchase_date: '2023-08-10', warranty_expiry: '2026-08-10', vendor_name: 'Fluke Precision Instruments', created_at: '2024-01-10 10:00:00' },
  { id: 2,  item_code: 'GW-CH-002', item_name: 'Beaker Set (500 mL)',  model_no: 'Borosil Class A',            category: 'Glassware',   location: 'Cabinet C - Shelf 1',          unit: 'Sets',    total_quantity: 30, issued_quantity: 8,  available_quantity: 22, status: 'Available', item_condition: 'Good',              min_threshold: 5, purchase_price: 1250.00,  purchase_date: '2023-10-15', warranty_expiry: '2025-10-15', vendor_name: 'Borosil Glass & Scientific', created_at: '2024-01-11 11:30:00' },
  { id: 3,  item_code: 'EQ-EL-003', item_name: 'Soldering Iron',       model_no: 'Weller WLC100',              category: 'Electronics', location: 'Room 201 - Workstation 4',     unit: 'Units',   total_quantity: 15, issued_quantity: 13, available_quantity: 2,  status: 'Low Stock', item_condition: 'Fair',              min_threshold: 3, purchase_price: 4200.00,  purchase_date: '2023-11-20', warranty_expiry: '2025-05-20', vendor_name: 'Weller Tools India', created_at: '2024-01-12 09:15:00' },
  { id: 4,  item_code: 'CH-RG-004', item_name: 'Copper Sulphate',      model_no: 'Analytical Grade 99%',       category: 'Chemicals',   location: 'Chemical Storage - Cabinet K', unit: 'Bottles', total_quantity: 50, issued_quantity: 0,  available_quantity: 50, status: 'Available', item_condition: 'Good',              min_threshold: 10, purchase_price: 850.00,   purchase_date: '2024-01-05', warranty_expiry: '2026-01-05', vendor_name: 'Sigma-Aldrich Chemical Corp', created_at: '2024-01-12 14:00:00' },
  { id: 5,  item_code: 'EQ-EL-005', item_name: 'Oscilloscope (DSO)',   model_no: 'Rigol DS1054Z 50MHz',        category: 'Electronics', location: 'Room 202 - Rack A3',           unit: 'Units',   total_quantity: 10, issued_quantity: 3,  available_quantity: 7,  status: 'Available', item_condition: 'Good',              min_threshold: 2, purchase_price: 45000.00, purchase_date: '2023-04-12', warranty_expiry: '2026-04-12', vendor_name: 'Rigol Technologies Inc.', created_at: '2024-01-15 16:45:00' },
  { id: 6,  item_code: 'GW-CH-006', item_name: 'Test Tube Stand',      model_no: 'Stainless Steel 24-well',    category: 'Glassware',   location: 'Cabinet C - Shelf 2',          unit: 'Units',   total_quantity: 25, issued_quantity: 4,  available_quantity: 21, status: 'Available', item_condition: 'Good',              min_threshold: 5, purchase_price: 650.00,   purchase_date: '2023-09-01', warranty_expiry: '2026-09-01', vendor_name: 'Borosil Glass & Scientific', created_at: '2024-01-16 10:20:00' },
  { id: 7,  item_code: 'TL-ME-007', item_name: 'Vernier Caliper',      model_no: 'Mitutoyo 150mm Digital',     category: 'Tools',       location: 'Tool Chest - Drawer 1',        unit: 'Units',   total_quantity: 18, issued_quantity: 6,  available_quantity: 12, status: 'Available', item_condition: 'Good',              min_threshold: 3, purchase_price: 6800.00,  purchase_date: '2023-06-18', warranty_expiry: '2026-06-18', vendor_name: 'Mitutoyo Metrology Lab', created_at: '2024-01-17 11:00:00' },
  { id: 8,  item_code: 'GW-CH-008', item_name: 'Bunsen Burner',        model_no: 'Standard Gas Burner',        category: 'Glassware',   location: 'Room 105 - Gas Bench 3',       unit: 'Units',   total_quantity: 12, issued_quantity: 11, available_quantity: 1,  status: 'Low Stock', item_condition: 'Needs Maintenance', min_threshold: 3, purchase_price: 1100.00,  purchase_date: '2023-02-10', warranty_expiry: '2025-02-10', vendor_name: 'Premier Scientific Suppliers', created_at: '2024-01-18 13:10:00' },
  { id: 9,  item_code: 'EQ-EL-009', item_name: 'Breadboard',           model_no: '830 Tie-Points Solderless',  category: 'Electronics', location: 'Room 201 - Bin 12',            unit: 'Pieces',  total_quantity: 40, issued_quantity: 10, available_quantity: 30, status: 'Available', item_condition: 'Good',              min_threshold: 8, purchase_price: 320.00,   purchase_date: '2024-01-10', warranty_expiry: '2026-01-10', vendor_name: 'Weller Tools India', created_at: '2024-01-19 15:30:00' },
  { id: 10, item_code: 'CH-RG-010', item_name: 'Hydrochloric Acid',    model_no: '37% Reagent Grade',          category: 'Chemicals',   location: 'Acid Cabinet - Safe Room',     unit: 'Bottles', total_quantity: 8,  issued_quantity: 0,  available_quantity: 8,  status: 'Available', item_condition: 'Good',              min_threshold: 2, purchase_price: 1450.00,  purchase_date: '2024-01-14', warranty_expiry: '2026-01-14', vendor_name: 'Sigma-Aldrich Chemical Corp', created_at: '2024-01-20 12:00:00' }
];

const FALLBACK_LOANS = [
  { id: 1, item_id: 1, item_name: 'Digital Multimeter', item_code: 'EQ-EL-001', category: 'Electronics', borrower_name: 'Aarav Patel',  borrower_id: 'STU-2024-042', borrower_dept: 'Electronics & Comm.', issued_qty: 1, issued_at: '2024-02-01 10:00:00', due_date: '2024-02-15', returned_at: null, status: 'Active', remarks: 'Signal processing lab practical' },
  { id: 2, item_id: 3, item_name: 'Soldering Iron',      item_code: 'EQ-EL-003', category: 'Electronics', borrower_name: 'Priya Sharma', borrower_id: 'RES-2023-019', borrower_dept: 'Chemical Engineering', issued_qty: 1, issued_at: '2024-01-20 14:00:00', due_date: '2024-01-27', returned_at: null, status: 'Overdue', remarks: 'Titration research project' },
  { id: 3, item_id: 5, item_name: 'Oscilloscope (DSO)',  item_code: 'EQ-EL-005', category: 'Electronics', borrower_name: 'Rohan Verma',  borrower_id: 'STU-2024-088', borrower_dept: 'Electronics & Comm.', issued_qty: 1, issued_at: '2024-01-15 09:30:00', due_date: '2024-01-22', returned_at: '2024-01-22 16:00:00', status: 'Returned', return_condition: 'Good', remarks: 'Oscilloscope testing', return_remarks: 'Returned in perfect condition and tested' }
];

const FALLBACK_MAINTENANCE = [
  { id: 1, item_id: 8, item_name: 'Bunsen Burner',      item_code: 'GW-CH-008', maintenance_type: 'Repair',                 technician_name: 'Kiran Kumar (Lab Tech)', start_date: '2024-02-05', completion_date: null,         cost: 150.00, status: 'In Progress', notes: 'Gas nozzle leakage inspection and valve replacement' },
  { id: 2, item_id: 1, item_name: 'Digital Multimeter', item_code: 'EQ-EL-001', maintenance_type: 'Calibration',            technician_name: 'Precision Labs Inc.',    start_date: '2024-01-15', completion_date: '2024-01-17', cost: 350.00, status: 'Completed',   notes: 'Annual accuracy calibration and safety certification #CAL-9921' },
  { id: 3, item_id: 3, item_name: 'Soldering Iron',     item_code: 'EQ-EL-003', maintenance_type: 'Preventive Maintenance', technician_name: 'Kiran Kumar (Lab Tech)', start_date: '2024-01-22', completion_date: '2024-01-23', cost: 50.00,  status: 'Completed',   notes: 'Soldering tip replacement and thermal heating element test' }
];

const FALLBACK_RESERVATIONS = [
  { id: 1, item_id: 5, item_name: 'Oscilloscope (DSO)', item_code: 'EQ-EL-005', category: 'Electronics', student_name: 'Sneha Kulkarni', student_id: 'STU-2024-102', department: 'Electrical Engg', email: 'sneha@college.edu', reservation_date: '2026-10-24', time_slot: '02:00 PM - 05:00 PM', quantity: 1, purpose: 'Fourier Transform wave analysis project', status: 'Pending', created_at: '2026-10-23 10:15:00' },
  { id: 2, item_id: 1, item_name: 'Digital Multimeter', item_code: 'EQ-EL-001', category: 'Electronics', student_name: 'Rahul Deshmukh', student_id: 'STU-2024-077', department: 'Electronics & Comm.', email: 'rahul@college.edu', reservation_date: '2026-10-25', time_slot: '09:00 AM - 12:00 PM', quantity: 2, purpose: 'Embedded Systems ADC calibration lab', status: 'Approved', created_at: '2026-10-23 11:30:00' },
  { id: 3, item_id: 7, item_name: 'Vernier Caliper', item_code: 'TL-ME-007', category: 'Tools', student_name: 'Aditya Joshi', student_id: 'STU-2024-031', department: 'Mechanical Engg', email: 'aditya@college.edu', reservation_date: '2026-10-22', time_slot: '12:00 PM - 02:00 PM', quantity: 1, purpose: 'Shaft tolerance measurement lab', status: 'Issued', created_at: '2026-10-22 09:00:00' }
];

const FALLBACK_TRANSFERS = [
  { id: 1, transfer_no: 'TRF-2026-001', item_id: 5, item_name: 'Oscilloscope (DSO)', item_code: 'EQ-EL-005', from_location: 'Room 202 - Rack A3', to_location: 'Advanced Computing Lab - Room 305', quantity: 1, requested_by: 'Dr. Ramesh Sharma', transfer_date: '2026-10-23', status: 'Dispatched', notes: 'Required for joint sensor integration session', created_at: '2026-10-23 09:40:00' },
  { id: 2, transfer_no: 'TRF-2026-002', item_id: 7, item_name: 'Vernier Caliper', item_code: 'TL-ME-007', from_location: 'Tool Chest - Drawer 1', to_location: 'Metrology Lab - Room 104', quantity: 2, requested_by: 'Prof. Anjali Mehta', transfer_date: '2026-10-22', status: 'Received', received_by: 'Kiran Kumar', notes: 'Routine dimensional inspection workshop', created_at: '2026-10-22 14:15:00' }
];

const FALLBACK_VENDORS = [
  { id: 1, vendor_name: 'Fluke Precision Instruments', contact_person: 'Rajesh Gupta', email: 'sales@fluke-india.com', phone: '+91 98201 44321', address: 'Plot 42, Electronics City, Bengaluru', categories_supplied: 'Electronics, Calibration', rating: 4.9, supplied_items_count: 3 },
  { id: 2, vendor_name: 'Borosil Glass & Scientific', contact_person: 'Meera Nambiar', email: 'support@borosil-scientific.in', phone: '+91 94481 90872', address: '14 Industrial Area, Mumbai', categories_supplied: 'Glassware, Volumetrics', rating: 4.8, supplied_items_count: 4 },
  { id: 3, vendor_name: 'Rigol Technologies Inc.', contact_person: 'Amitabh Sengupta', email: 'sales@rigoltech.co.in', phone: '+91 97112 33451', address: 'Sector 62, Noida, NCR', categories_supplied: 'Electronics, RF & Signal Testing', rating: 4.7, supplied_items_count: 2 },
  { id: 4, vendor_name: 'Sigma-Aldrich Chemical Corp', contact_person: 'Dr. Sunita Rao', email: 'orders@sigma-reagents.com', phone: '+91 80234 56789', address: 'Whitefield Research Park, Bengaluru', categories_supplied: 'Chemicals, High Purity Solvents', rating: 4.9, supplied_items_count: 5 },
  { id: 5, vendor_name: 'Mitutoyo Metrology Lab', contact_person: 'Vikram Chawla', email: 'precision@mitutoyo-tools.in', phone: '+91 99882 11223', address: 'Peenya Industrial Estate, Bengaluru', categories_supplied: 'Tools, Precision Measurement', rating: 4.8, supplied_items_count: 2 }
];

const FALLBACK_AUDIT = [
  { id: 1, user_id: 1, user_name: 'Lab In-Charge', user_role: 'Administrator', action: 'ITEM_CREATED', item_id: 1, item_name: 'Digital Multimeter', details: 'Registered new apparatus EQ-EL-001 (Qty: 20 Units, Price: ₹18500.00)', ip_address: '127.0.0.1', created_at: '2026-10-23 10:00:00' },
  { id: 2, user_id: 2, user_name: 'Kiran Kumar', user_role: 'Lab Assistant', action: 'ITEM_ISSUED', item_id: 1, item_name: 'Digital Multimeter', details: 'Issued 1 unit to Aarav Patel (STU-2024-042) due 2026-11-06', ip_address: '127.0.0.1', created_at: '2026-10-23 10:30:00' },
  { id: 3, user_id: 2, user_name: 'Kiran Kumar', user_role: 'Lab Assistant', action: 'TRANSFER_REQUEST', item_id: 5, item_name: 'Oscilloscope (DSO)', details: 'Dispatched 1 unit to Advanced Computing Lab - Room 305 (TRF-2026-001)', ip_address: '127.0.0.1', created_at: '2026-10-23 11:15:00' },
  { id: 4, user_id: 3, user_name: 'Sneha Kulkarni', user_role: 'Student', action: 'RESERVATION_CREATED', item_id: 5, item_name: 'Oscilloscope (DSO)', details: 'Booked slot on 2026-10-24 02:00 PM - 05:00 PM for Signal Processing', ip_address: '127.0.0.1', created_at: '2026-10-23 12:00:00' }
];

/* ════════════════════════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════════════════════════ */

/**
 * Navigate to a specific section and lazy-load datasets
 * @param {string} sectionId
 * @param {HTMLElement} navEl
 */
function navigate(sectionId, navEl) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('section-' + sectionId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');

  const titles = {
    dashboard:   'Dashboard Overview',
    inventory:   'Equipment & Inventory Management',
    categories:  'Domain Categories',
    issue:       'Equipment Issue & Return Circulation',
    reservations:'Student Equipment Reservations',
    transfers:   'Inter-Laboratory Equipment Transfers',
    maintenance: 'Equipment Maintenance & Health',
    vendors:     'Vendors, Procurement & Warranties',
    audit:       'Security & Activity Audit Trail',
    reports:     'Inventory Reports & Audit Analytics',
    settings:    'System Configuration & Preferences',
  };
  const el = document.getElementById('pageTitle');
  if (el) el.textContent = titles[sectionId] || sectionId;

  State.currentSection = sectionId;

  if (sectionId === 'dashboard') {
    loadStatistics();
    loadInventory();
  } else if (sectionId === 'inventory') {
    loadInventory();
  } else if (sectionId === 'categories') {
    renderCategories();
    renderCatDetailChart();
  } else if (sectionId === 'issue') {
    loadLoans();
  } else if (sectionId === 'reservations') {
    loadReservations();
  } else if (sectionId === 'transfers') {
    loadTransfers();
  } else if (sectionId === 'maintenance') {
    loadMaintenance();
  } else if (sectionId === 'vendors') {
    loadVendors();
  } else if (sectionId === 'audit') {
    loadAuditLogs();
  } else if (sectionId === 'reports') {
    loadReports();
  } else if (sectionId === 'settings') {
    populateSettingsForm();
  }

  if (State.isMobile) {
    closeMobileSidebar();
  }
}

/* ════════════════════════════════════════════════════════════════
   SIDEBAR TOGGLE & RESPONSIVENESS
   ════════════════════════════════════════════════════════════════ */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('mainContent');

  if (State.isMobile) {
    sidebar.classList.toggle('mobile-open');
    document.getElementById('mobileOverlay').classList.toggle('show');
  } else {
    State.isSidebarCollapsed = !State.isSidebarCollapsed;
    sidebar.classList.toggle('collapsed', State.isSidebarCollapsed);
    main.classList.toggle('sidebar-collapsed', State.isSidebarCollapsed);
  }
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('mobileOverlay').classList.remove('show');
}

function checkMobile() {
  State.isMobile = window.innerWidth <= 768;
}

/* ════════════════════════════════════════════════════════════════
   DASHBOARD STATS & ALERTS
   ════════════════════════════════════════════════════════════════ */

function applyStatistics(data) {
  State.stats      = data;
  State.categories = data.categories || [];

  // KPI Counters
  animateCounter('statTotal',       data.total_items);
  animateCounter('statAvailable',   data.available_items);
  animateCounter('statActiveLoans', data.active_loans);
  animateCounter('statLowStock',    data.low_stock);
  animateCounter('statMaint',       data.under_maintenance);

  const unitsEl = document.getElementById('statTotalUnits');
  if (unitsEl) unitsEl.textContent = data.total_units || '0';

  const overdueDelta = document.getElementById('statOverdueLoansDelta');
  if (overdueDelta) {
    if (data.overdue_loans > 0) {
      overdueDelta.innerHTML = `<span style="color:#dc2626;font-weight:700;">⚠ ${data.overdue_loans} Overdue Loan(s)</span>`;
    } else {
      overdueDelta.textContent = '0 overdue loans';
    }
  }

  // Sidebar badges
  const badge = document.getElementById('sidebarItemCount');
  if (badge) badge.textContent = data.total_items;

  const issueBadge = document.getElementById('sidebarIssueCount');
  if (issueBadge) issueBadge.textContent = data.active_loans;

  const maintBadge = document.getElementById('sidebarMaintCount');
  if (maintBadge) maintBadge.textContent = data.under_maintenance;

  const resBadge = document.getElementById('sidebarResCount');
  if (resBadge && data.pending_reservations !== undefined) resBadge.textContent = data.pending_reservations;

  const trfBadge = document.getElementById('sidebarTrfCount');
  if (trfBadge && data.active_transfers !== undefined) trfBadge.textContent = data.active_transfers;

  // Overdue Alert strip
  const overdueAlert = document.getElementById('overdueAlert');
  const overdueMsg   = document.getElementById('overdueMsg');
  if (overdueAlert && overdueMsg) {
    if (data.overdue_loans > 0) {
      overdueAlert.classList.remove('hidden');
      overdueMsg.textContent = `${data.overdue_loans} equipment loan${data.overdue_loans > 1 ? 's are' : ' is'}`;
    } else {
      overdueAlert.classList.add('hidden');
    }
  }

  // Low stock alert strip
  const lowAlert = document.getElementById('lowStockAlert');
  const lowMsg   = document.getElementById('lowStockMsg');
  if (lowAlert && lowMsg) {
    if (data.low_stock > 0) {
      lowAlert.classList.remove('hidden');
      lowMsg.textContent = `${data.low_stock} item${data.low_stock > 1 ? 's' : ''}`;
    } else {
      lowAlert.classList.add('hidden');
    }
  }

  // Dashboard Charts
  renderCategoryChart(data.categories);
  renderStockChart(data.available_items, data.issued_items);
}

async function loadStatistics() {
  try {
    const res  = await fetch('fetch_statistics.php');
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    applyStatistics(data);

  } catch (err) {
    console.warn('loadStatistics using computed fallback stats:', err);
    const items = State.items.length ? State.items : FALLBACK_ITEMS;
    const loans = State.loans.length ? State.loans : FALLBACK_LOANS;

    let total_units = 0, available_items = 0, issued_items = 0, low_stock = 0;
    const catMap = {};

    items.forEach(it => {
      const tot = parseInt(it.total_quantity) || 0;
      const iss = parseInt(it.issued_quantity) || 0;
      const av  = parseInt(it.available_quantity) || 0;
      total_units += tot;
      issued_items += iss;
      available_items += av;
      if (it.status === 'Low Stock' || av <= (parseInt(it.min_threshold) || 3)) low_stock++;

      if (!catMap[it.category]) catMap[it.category] = { category: it.category, total_qty: 0, avail_qty: 0, issued_qty: 0, item_count: 0 };
      catMap[it.category].total_qty += tot;
      catMap[it.category].avail_qty += av;
      catMap[it.category].issued_qty += iss;
      catMap[it.category].item_count += 1;
    });

    const active_loans = loans.filter(l => l.status === 'Active' || l.status === 'Overdue').length;
    const overdue_loans = loans.filter(l => l.status === 'Overdue').length;

    applyStatistics({
      success: true,
      total_items: items.length,
      total_units,
      available_items,
      issued_items,
      active_loans,
      overdue_loans,
      low_stock,
      under_maintenance: 1,
      categories: Object.values(catMap)
    });
  }
}

/* ════════════════════════════════════════════════════════════════
   INVENTORY MANAGEMENT (EQUIPMENT RECORDS)
   ════════════════════════════════════════════════════════════════ */

async function loadInventory(search = '', category = 'all', condition = 'all', status = 'all') {
  const params = new URLSearchParams({ search, category, condition, status, limit: 200 });

  try {
    const res  = await fetch('fetch_items.php?' + params);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    State.items         = data.items;
    State.filteredItems = data.items;

    renderInventoryTable(data.items);
    renderDashboardTable(data.items.slice(0, 6));

  } catch (err) {
    console.warn('loadInventory using fallback dataset:', err);
    let items = State.items.length ? State.items : [...FALLBACK_ITEMS];
    if (!State.items.length) State.items = [...FALLBACK_ITEMS];

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => (i.item_name && i.item_name.toLowerCase().includes(q)) || (i.item_code && i.item_code.toLowerCase().includes(q)));
    }
    if (category !== 'all') items = items.filter(i => i.category === category);
    if (condition !== 'all') items = items.filter(i => i.item_condition === condition);
    if (status !== 'all') items = items.filter(i => i.status === status);

    State.filteredItems = items;
    renderInventoryTable(items);
    renderDashboardTable(items.slice(0, 6));
  }
}

function filterInventory() {
  const search    = document.getElementById('searchInput')?.value.trim() || '';
  const category  = State.activeFilter;
  const condition = document.getElementById('filterCondition')?.value || 'all';
  const status    = document.getElementById('filterStatus')?.value || 'all';

  loadInventory(search, category, condition, status);
}

function setCatFilter(chipEl) {
  document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
  chipEl.classList.add('active');
  State.activeFilter = chipEl.dataset.cat;
  filterInventory();
}

/** Render Full Inventory Table with Actions */
function renderInventoryTable(items) {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `
      <tr><td colspan="11">
        <div class="empty-state">
          <p>No equipment records found matching the filter criteria.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr id="inv-row-${item.id}">
      <td><span class="badge" style="background:#f1f5f9;color:#334155;font-family:monospace;">${escHtml(item.item_code)}</span></td>
      <td class="td-bold">
        ${escHtml(item.item_name)}
        ${item.model_no && item.model_no !== 'N/A' ? `<div style="font-size:.68rem;color:#64748b;font-weight:400;">Model: ${escHtml(item.model_no)}</div>` : ''}
      </td>
      <td>${buildCategoryPill(item.category)}</td>
      <td><span style="font-size:.75rem;color:#475569;">📍 ${escHtml(item.location)}</span></td>
      <td><strong>${item.total_quantity}</strong> <span style="font-size:.68rem;color:#64748b;">${escHtml(item.unit)}</span></td>
      <td>${item.issued_quantity}</td>
      <td><strong style="color:var(--clr-green-700);">${item.available_quantity}</strong></td>
      <td>${buildStockBar(item.available_quantity, item.total_quantity)}</td>
      <td>${buildConditionBadge(item.item_condition)}</td>
      <td>${buildStatusBadge(item.status)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-issue btn-sm staff-only" onclick="openIssueModal(${item.id})"
                  ${item.available_quantity <= 0 ? 'disabled' : ''} title="Issue this item">
            Issue
          </button>
          <button class="btn-icon-action" onclick="openQrModal(${item.id})" title="Print QR Asset Tag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </button>
          <button class="btn-icon-action staff-only" onclick="openRestockModal(${item.id})" title="Restock / Add stock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="btn-icon-action staff-only" onclick="openEditModal(${item.id})" title="Edit details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon-action" onclick="openViewModal(${item.id})" title="View specifications sheet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-icon-action danger admin-only" onclick="openDeleteModal(${item.id})" title="Delete record">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/** Render Compact Dashboard Table */
function renderDashboardTable(items) {
  const tbody = document.getElementById('dashboardTableBody');
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:#94a3b8">No records available.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td><span class="badge" style="background:#f1f5f9;color:#334155;font-family:monospace;">${escHtml(item.item_code)}</span></td>
      <td class="td-bold">${escHtml(item.item_name)}</td>
      <td>${buildCategoryPill(item.category)}</td>
      <td><span style="font-size:.75rem;color:#475569;">${escHtml(item.location)}</span></td>
      <td>${item.total_quantity}</td>
      <td>${item.issued_quantity}</td>
      <td><strong>${item.available_quantity}</strong></td>
      <td>${buildConditionBadge(item.item_condition)}</td>
      <td>${buildStatusBadge(item.status)}</td>
      <td>
        <button class="btn btn-issue btn-sm" onclick="openIssueModal(${item.id})" ${item.available_quantity <= 0 ? 'disabled' : ''}>
          Issue
        </button>
      </td>
    </tr>
  `).join('');
}

function showTableError(tbodyId, cols, msg) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:24px;color:#dc2626;">${msg}</td></tr>`;
  }
}

/* ════════════════════════════════════════════════════════════════
   ADD EQUIPMENT RECORD
   ════════════════════════════════════════════════════════════════ */

function openAddModal() {
  const modal = document.getElementById('addModal');
  modal.classList.add('open');
  document.getElementById('addItemForm').reset();
  clearFormErrors();
  document.getElementById('inputItemName').focus();
}

function closeAddModal() {
  document.getElementById('addModal').classList.remove('open');
}

async function submitAddItem(e) {
  e.preventDefault();
  clearFormErrors();

  const itemName     = document.getElementById('inputItemName').value.trim();
  const itemCode     = document.getElementById('inputItemCode').value.trim();
  const modelNo      = document.getElementById('inputModelNo').value.trim();
  const category     = document.getElementById('inputCategory').value;
  const location     = document.getElementById('inputLocation').value.trim() || 'Main Lab';
  const unit         = document.getElementById('inputUnit').value.trim() || 'Units';
  const qty          = parseInt(document.getElementById('inputQty').value, 10);
  const condition    = document.getElementById('inputCondition').value;
  const minThreshold   = parseInt(document.getElementById('inputMinThreshold').value, 10) || 3;
  const purchasePrice  = parseFloat(document.getElementById('inputPrice')?.value) || 0;
  const purchaseDate   = document.getElementById('inputPurchaseDate')?.value || null;
  const warrantyExpiry = document.getElementById('inputWarrantyExpiry')?.value || null;
  const vendorName     = document.getElementById('inputVendorName')?.value.trim() || '';

  let valid = true;
  if (!itemName) {
    showFieldError('inputItemName', 'errItemName', 'Item name is required.'); valid = false;
  }
  if (!category) {
    showFieldError('inputCategory', 'errCategory', 'Please select a category.'); valid = false;
  }
  if (!qty || qty < 1 || qty > 9999) {
    showFieldError('inputQty', 'errQty', 'Enter quantity (1–9999).'); valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById('addSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const res  = await fetch('add_item.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: itemName,
        item_code: itemCode,
        model_no: modelNo,
        category,
        location,
        unit,
        total_quantity: qty,
        item_condition: condition,
        min_threshold: minThreshold,
        purchase_price: purchasePrice,
        purchase_date: purchaseDate,
        warranty_expiry: warrantyExpiry,
        vendor_name: vendorName
      }),
    });
    const data = await res.json();

    if (data.success) {
      closeAddModal();
      showToast('success', 'Equipment Added!', data.message);
      await loadStatistics();
      await loadInventory(document.getElementById('searchInput')?.value || '', State.activeFilter);
    } else {
      showToast('error', 'Failed to Add', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', 'Server unreachable. Is XAMPP running?');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Equipment';
  }
}

/* ════════════════════════════════════════════════════════════════
   EDIT EQUIPMENT RECORD
   ════════════════════════════════════════════════════════════════ */

function openEditModal(itemId) {
  const item = State.items.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('editItemId').value       = item.id;
  document.getElementById('editItemName').value     = item.item_name;
  document.getElementById('editItemCode').value     = item.item_code;
  document.getElementById('editModelNo').value      = item.model_no && item.model_no !== 'N/A' ? item.model_no : '';
  document.getElementById('editCategory').value     = item.category;
  document.getElementById('editLocation').value     = item.location;
  document.getElementById('editUnit').value         = item.unit;
  document.getElementById('editTotalQty').value     = item.total_quantity;
  document.getElementById('editCondition').value    = item.item_condition;
  document.getElementById('editMinThreshold').value = item.min_threshold;

  const priceEl = document.getElementById('editPrice');
  const pDateEl = document.getElementById('editPurchaseDate');
  const wExpEl  = document.getElementById('editWarrantyExpiry');
  const vNameEl = document.getElementById('editVendorName');
  if (priceEl) priceEl.value = item.purchase_price || '';
  if (pDateEl) pDateEl.value = item.purchase_date || '';
  if (wExpEl)  wExpEl.value  = item.warranty_expiry || '';
  if (vNameEl) vNameEl.value = item.vendor_name || '';

  document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
}

async function submitEditItem(e) {
  e.preventDefault();

  const id             = parseInt(document.getElementById('editItemId').value, 10);
  const itemName       = document.getElementById('editItemName').value.trim();
  const itemCode       = document.getElementById('editItemCode').value.trim();
  const modelNo        = document.getElementById('editModelNo').value.trim();
  const category       = document.getElementById('editCategory').value;
  const location       = document.getElementById('editLocation').value.trim();
  const unit           = document.getElementById('editUnit').value.trim();
  const totalQty       = parseInt(document.getElementById('editTotalQty').value, 10);
  const condition      = document.getElementById('editCondition').value;
  const minThreshold   = parseInt(document.getElementById('editMinThreshold').value, 10);
  const purchasePrice  = parseFloat(document.getElementById('editPrice')?.value) || 0;
  const purchaseDate   = document.getElementById('editPurchaseDate')?.value || null;
  const warrantyExpiry = document.getElementById('editWarrantyExpiry')?.value || null;
  const vendorName     = document.getElementById('editVendorName')?.value.trim() || '';

  const btn = document.getElementById('editSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const res = await fetch('update_item.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        item_name: itemName,
        item_code: itemCode,
        model_no: modelNo,
        category,
        location,
        unit,
        total_quantity: totalQty,
        item_condition: condition,
        min_threshold: minThreshold,
        purchase_price: purchasePrice,
        purchase_date: purchaseDate,
        warranty_expiry: warrantyExpiry,
        vendor_name: vendorName
      })
    });
    const data = await res.json();

    if (data.success) {
      closeEditModal();
      showToast('success', 'Updated!', data.message);
      await loadStatistics();
      await loadInventory(document.getElementById('searchInput')?.value || '', State.activeFilter);
    } else {
      showToast('error', 'Update Failed', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

/* ════════════════════════════════════════════════════════════════
   QUICK RESTOCK MODAL
   ════════════════════════════════════════════════════════════════ */

function openRestockModal(itemId) {
  const item = State.items.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('restockItemId').value        = item.id;
  document.getElementById('restockItemName').textContent = `${item.item_name} (Current: ${item.available_quantity}/${item.total_quantity} ${item.unit})`;
  document.getElementById('restockAddQty').value        = '';
  document.getElementById('restockNotes').value         = '';

  document.getElementById('restockModal').classList.add('open');
  document.getElementById('restockAddQty').focus();
}

function closeRestockModal() {
  document.getElementById('restockModal').classList.remove('open');
}

async function submitRestock(e) {
  e.preventDefault();
  const itemId = parseInt(document.getElementById('restockItemId').value, 10);
  const addQty = parseInt(document.getElementById('restockAddQty').value, 10);
  const notes  = document.getElementById('restockNotes').value.trim();

  const btn = document.getElementById('restockSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Adding…';

  try {
    const res = await fetch('restock_item.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, add_qty: addQty, notes })
    });
    const data = await res.json();

    if (data.success) {
      closeRestockModal();
      showToast('success', 'Restocked!', data.message);
      await loadStatistics();
      await loadInventory(document.getElementById('searchInput')?.value || '', State.activeFilter);
    } else {
      showToast('error', 'Restock Failed', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Stock';
  }
}

/* ════════════════════════════════════════════════════════════════
   VIEW SPECIFICATION SHEET MODAL
   ════════════════════════════════════════════════════════════════ */

function openViewModal(itemId) {
  const item = State.items.find(i => i.id === itemId);
  if (!item) return;

  const body = document.getElementById('viewModalBody');
  body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:14px;">
      <div>
        <h4 style="font-size:1.15rem;color:#0f172a;font-weight:700;">${escHtml(item.item_name)}</h4>
        <div style="font-size:.78rem;color:#64748b;">Tag / Code: <strong>${escHtml(item.item_code)}</strong> &bull; Added: ${item.created_date}</div>
      </div>
      <div>${buildStatusBadge(item.status)}</div>
    </div>

    <div class="spec-grid">
      <div class="spec-box">
        <div class="spec-title">Category</div>
        <div class="spec-val">${escHtml(item.category)}</div>
      </div>
      <div class="spec-box">
        <div class="spec-title">Model / Specification</div>
        <div class="spec-val">${escHtml(item.model_no)}</div>
      </div>
      <div class="spec-box">
        <div class="spec-title">Storage Location</div>
        <div class="spec-val">📍 ${escHtml(item.location)}</div>
      </div>
      <div class="spec-box">
        <div class="spec-title">Equipment Condition</div>
        <div class="spec-val">${buildConditionBadge(item.item_condition)}</div>
      </div>
      <div class="spec-box">
        <div class="spec-title">Total Registered</div>
        <div class="spec-val">${item.total_quantity} ${escHtml(item.unit)}</div>
      </div>
      <div class="spec-box">
        <div class="spec-title">Available for Issue</div>
        <div class="spec-val" style="color:#15803d;">${item.available_quantity} ${escHtml(item.unit)}</div>
      </div>
      <div class="spec-box">
        <div class="spec-title">Currently Issued</div>
        <div class="spec-val" style="color:#0369a1;">${item.issued_quantity} ${escHtml(item.unit)}</div>
      </div>
      <div class="spec-box">
        <div class="spec-title">Min Alert Threshold</div>
        <div class="spec-val">${item.min_threshold} units</div>
      </div>
      <div class="spec-box">
        <div class="spec-title">Purchase Price</div>
        <div class="spec-val" style="color:#0f172a;font-weight:700;">₹ ${parseFloat(item.purchase_price || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
      </div>
      <div class="spec-box">
        <div class="spec-title">Supplier / Vendor</div>
        <div class="spec-val">${escHtml(item.vendor_name || 'Standard Equipment Supply')}</div>
      </div>
      <div class="spec-box">
        <div class="spec-title">Purchase Date</div>
        <div class="spec-val">${item.purchase_date || 'N/A'}</div>
      </div>
      <div class="spec-box">
        <div class="spec-title">Warranty Expiry</div>
        <div class="spec-val">${item.warranty_expiry ? `${item.warranty_expiry}` : 'N/A'}</div>
      </div>
    </div>

    <div style="margin-top:16px;">
      <h5 style="font-size:.85rem;color:#334155;margin-bottom:8px;">Quick Actions for this equipment:</h5>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-issue btn-sm staff-only" onclick="closeViewModal(); openIssueModal(${item.id});" ${item.available_quantity <= 0 ? 'disabled' : ''}>Issue Now</button>
        <button class="btn btn-gold btn-sm staff-only" onclick="closeViewModal(); openRestockModal(${item.id});">Add Stock</button>
        <button class="btn btn-outline btn-sm staff-only" onclick="closeViewModal(); openMaintModal(${item.id});">Schedule Maintenance</button>
        <button class="btn btn-primary btn-sm" onclick="closeViewModal(); openQrModal(${item.id});">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-right:4px;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Print QR Tag
        </button>
      </div>
    </div>
  `;

  document.getElementById('viewModal').classList.add('open');
}

function closeViewModal() {
  document.getElementById('viewModal').classList.remove('open');
}

/* ════════════════════════════════════════════════════════════════
   DELETE EQUIPMENT RECORD
   ════════════════════════════════════════════════════════════════ */

function openDeleteModal(itemId) {
  const item = State.items.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('deleteItemId').value        = item.id;
  document.getElementById('deleteItemName').textContent = `${item.item_name} (${item.item_code})`;
  document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('open');
}

async function submitDeleteItem() {
  const itemId = parseInt(document.getElementById('deleteItemId').value, 10);
  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting…';

  try {
    const res = await fetch('delete_item.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId })
    });
    const data = await res.json();

    if (data.success) {
      closeDeleteModal();
      showToast('success', 'Record Deleted', data.message);
      await loadStatistics();
      await loadInventory(document.getElementById('searchInput')?.value || '', State.activeFilter);
    } else {
      showToast('error', 'Cannot Delete', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete Item';
  }
}

/* ════════════════════════════════════════════════════════════════
   ISSUE & RETURN MODULE (PHASE 2 - 70%)
   ════════════════════════════════════════════════════════════════ */

async function loadLoans(search = '', status = 'all') {
  const params = new URLSearchParams({ search, status });
  try {
    const res  = await fetch('fetch_issues.php?' + params);
    if (!res.ok) throw new Error(`Server error: HTTP ${res.status}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    State.loans = data.loans || [];

    // Summary counters
    animateCounter('loanStatActive',   data.active_loans);
    animateCounter('loanStatOverdue',  data.overdue_loans);
    animateCounter('loanStatReturned', data.returned_loans);
    animateCounter('loanStatTotal',    data.total_loans);

    // Tab badges
    const activeTabBadge  = document.getElementById('tabActiveCount');
    const historyTabBadge = document.getElementById('tabHistoryCount');
    if (activeTabBadge)  activeTabBadge.textContent  = data.active_loans + data.overdue_loans;
    if (historyTabBadge) historyTabBadge.textContent = data.total_loans;

    renderActiveLoansTable(State.loans);
    renderHistoryLoansTable(State.loans);

  } catch (err) {
    console.warn('loadLoans using fallback records:', err);
    let loans = State.loans.length ? State.loans : [...FALLBACK_LOANS];
    if (!State.loans.length) State.loans = [...FALLBACK_LOANS];

    if (search) {
      const q = search.toLowerCase();
      loans = loans.filter(l => (l.borrower_name && l.borrower_name.toLowerCase().includes(q)) || (l.item_name && l.item_name.toLowerCase().includes(q)));
    }
    if (status !== 'all') loans = loans.filter(l => l.status === status);

    const active_loans   = loans.filter(l => l.status === 'Active').length;
    const overdue_loans  = loans.filter(l => l.status === 'Overdue').length;
    const returned_loans = loans.filter(l => l.status === 'Returned').length;

    animateCounter('loanStatActive',   active_loans);
    animateCounter('loanStatOverdue',  overdue_loans);
    animateCounter('loanStatReturned', returned_loans);
    animateCounter('loanStatTotal',    loans.length);

    const activeTabBadge  = document.getElementById('tabActiveCount');
    const historyTabBadge = document.getElementById('tabHistoryCount');
    if (activeTabBadge)  activeTabBadge.textContent  = active_loans + overdue_loans;
    if (historyTabBadge) historyTabBadge.textContent = loans.length;

    renderActiveLoansTable(loans);
    renderHistoryLoansTable(loans);
  }
}

function switchIssueTab(tab) {
  State.currentIssueTab = tab;
  document.getElementById('tabBtnActiveLoans').classList.toggle('active', tab === 'active');
  document.getElementById('tabBtnHistoryLoans').classList.toggle('active', tab === 'history');
  document.getElementById('paneActiveLoans').classList.toggle('active', tab === 'active');
  document.getElementById('paneHistoryLoans').classList.toggle('active', tab === 'history');
}

function filterLoans() {
  const search = document.getElementById('loanSearchInput')?.value.trim().toLowerCase() || '';
  const status = State.activeLoanFilter;

  let filtered = State.loans;

  if (status !== 'all') {
    filtered = filtered.filter(l => l.status === status);
  }

  if (search) {
    filtered = filtered.filter(l =>
      (l.borrower_name && l.borrower_name.toLowerCase().includes(search)) ||
      (l.borrower_id && l.borrower_id.toLowerCase().includes(search)) ||
      (l.item_name && l.item_name.toLowerCase().includes(search)) ||
      (l.item_code && l.item_code.toLowerCase().includes(search))
    );
  }

  renderActiveLoansTable(filtered);
  renderHistoryLoansTable(filtered);
}

function setLoanStatusFilter(chipEl) {
  document.querySelectorAll('[data-loan-status]').forEach(c => c.classList.remove('active'));
  chipEl.classList.add('active');
  State.activeLoanFilter = chipEl.dataset.loanStatus;
  filterLoans();
}

/** Render Active Loans Table */
function renderActiveLoansTable(loans) {
  const tbody = document.getElementById('activeLoansTableBody');
  if (!tbody) return;

  const activeLoans = loans.filter(l => l.status === 'Active' || l.status === 'Overdue');

  if (!activeLoans.length) {
    tbody.innerHTML = `
      <tr><td colspan="9" style="text-align:center;padding:32px;color:#64748b;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;margin-bottom:8px;color:#208b3a;">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <p style="font-weight:600;">No active borrowed equipment.</p>
        <p style="font-size:.78rem;">All equipment is currently safely stored in the laboratory.</p>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = activeLoans.map(l => {
    const isOverdue = l.status === 'Overdue' || l.days_left < 0;
    const daysLabel = isOverdue
      ? `<span class="badge badge-overdue"><span class="badge-dot"></span>Overdue by ${Math.abs(l.days_left)} day(s)</span>`
      : `<span class="badge badge-active"><span class="badge-dot"></span>Due in ${l.days_left} day(s)</span>`;

    return `
      <tr>
        <td class="td-bold">#LN-${String(l.id).padStart(4,'0')}</td>
        <td>
          <div class="td-bold">${escHtml(l.item_name)}</div>
          <div style="font-size:.68rem;color:#64748b;font-family:monospace;">${escHtml(l.item_code)}</div>
        </td>
        <td>
          <div class="td-bold">${escHtml(l.borrower_name)}</div>
          <div style="font-size:.68rem;color:#64748b;">ID: ${escHtml(l.borrower_id)}</div>
        </td>
        <td><span style="font-size:.78rem;">${escHtml(l.borrower_dept)}</span></td>
        <td><strong>${l.issued_qty}</strong> <span style="font-size:.68rem;color:#64748b;">${escHtml(l.unit || 'units')}</span></td>
        <td><span class="text-muted">${l.issued_date}</span></td>
        <td>
          <div><strong>${l.due_date}</strong></div>
          <div style="margin-top:2px;">${daysLabel}</div>
        </td>
        <td><span class="text-muted">${escHtml(l.remarks || '–')}</span></td>
        <td>
          <button class="btn btn-return btn-sm" onclick="openReturnModal(${l.id})">
            Return Item
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/** Render Circulation History & Audit Log Table */
function renderHistoryLoansTable(loans) {
  const tbody = document.getElementById('historyLoansTableBody');
  if (!tbody) return;

  if (!loans.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:#94a3b8">No circulation history records.</td></tr>`;
    return;
  }

  tbody.innerHTML = loans.map(l => `
    <tr>
      <td class="td-bold">#LN-${String(l.id).padStart(4,'0')}</td>
      <td>
        <div class="td-bold">${escHtml(l.item_name)}</div>
        <div style="font-size:.68rem;color:#64748b;">${escHtml(l.item_code)}</div>
      </td>
      <td>
        <div>${escHtml(l.borrower_name)}</div>
        <div style="font-size:.68rem;color:#64748b;">${escHtml(l.borrower_id)} &bull; ${escHtml(l.borrower_dept)}</div>
      </td>
      <td><strong>${l.issued_qty}</strong></td>
      <td><span class="text-muted">${l.issued_date}</span></td>
      <td>${l.due_date}</td>
      <td>${l.returned_date ? `<strong style="color:var(--clr-green-700);">${l.returned_date}</strong>` : `<span style="color:#d97706;">Still Out</span>`}</td>
      <td>${l.return_condition ? buildConditionBadge(l.return_condition) : '<span class="text-muted">–</span>'}</td>
      <td>${buildLoanStatusBadge(l.status)}</td>
      <td><span class="text-muted" title="${escHtml(l.return_remarks || l.remarks || '')}">${escHtml(l.return_remarks || l.remarks || '–')}</span></td>
    </tr>
  `).join('');
}

/* ── Issue Modal Actions ── */
function openIssueModal(preselectedItemId = null) {
  const select = document.getElementById('issueItemSelect');
  select.innerHTML = '<option value="">— Select Equipment —</option>';

  State.items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.item_name} (${item.item_code}) — Available: ${item.available_quantity} ${item.unit}`;
    opt.dataset.avail = item.available_quantity;
    opt.dataset.unit  = item.unit;
    opt.dataset.loc   = item.location;
    if (item.available_quantity <= 0) opt.disabled = true;
    if (preselectedItemId && item.id === preselectedItemId) opt.selected = true;
    select.appendChild(opt);
  });

  // Default due date to 7 days from now
  const due = new Date();
  due.setDate(due.getDate() + 7);
  document.getElementById('issueDueDate').value = due.toISOString().split('T')[0];

  onIssueItemChange();
  document.getElementById('issueModal').classList.add('open');
}

function onIssueItemChange() {
  const select = document.getElementById('issueItemSelect');
  const opt = select.selectedOptions[0];
  const hint = document.getElementById('issueAvailHint');
  const qtyInput = document.getElementById('issueQty');

  if (opt && opt.value) {
    const avail = parseInt(opt.dataset.avail, 10);
    hint.innerHTML = `Available in stock: <strong>${avail} ${opt.dataset.unit}</strong> (Location: ${opt.dataset.loc})`;
    qtyInput.max = avail;
  } else {
    hint.textContent = '';
  }
}

function closeIssueModal() {
  document.getElementById('issueModal').classList.remove('open');
}

async function submitIssueForm(e) {
  e.preventDefault();

  const itemId       = parseInt(document.getElementById('issueItemSelect').value, 10);
  const borrowerName = document.getElementById('issueBorrowerName').value.trim();
  const borrowerId   = document.getElementById('issueBorrowerId').value.trim();
  const borrowerDept = document.getElementById('issueBorrowerDept').value.trim();
  const issuedQty    = parseInt(document.getElementById('issueQty').value, 10);
  const dueDate      = document.getElementById('issueDueDate').value;
  const remarks      = document.getElementById('issueRemarks').value.trim();

  if (!itemId) { showToast('warning', 'Validation', 'Please select an equipment item.'); return; }
  if (!borrowerName || !borrowerId) { showToast('warning', 'Validation', 'Borrower Name & ID are required.'); return; }

  const btn = document.getElementById('issueSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Issuing…';

  try {
    const res = await fetch('issue_item.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        borrower_name: borrowerName,
        borrower_id: borrowerId,
        borrower_dept: borrowerDept,
        issued_qty: issuedQty,
        due_date: dueDate,
        remarks: remarks
      })
    });
    const data = await res.json();

    if (data.success) {
      closeIssueModal();
      showToast('success', 'Equipment Issued!', data.message);
      await loadStatistics();
      await loadInventory(document.getElementById('searchInput')?.value || '', State.activeFilter);
      if (State.currentSection === 'issue') await loadLoans();
    } else {
      showToast('error', 'Issue Failed', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Issue Equipment';
  }
}

/* ── Return Modal Actions ── */
function openReturnModal(loanId) {
  const loan = State.loans.find(l => l.id === loanId);
  if (!loan) return;

  document.getElementById('returnIssueId').value           = loan.id;
  document.getElementById('returnModalItemName').textContent = `${loan.item_name} (${loan.item_code})`;
  document.getElementById('returnModalBorrower').textContent = `${loan.borrower_name} [${loan.borrower_id}]`;
  document.getElementById('returnModalQty').textContent      = `${loan.issued_qty} ${loan.unit || 'units'}`;
  document.getElementById('returnConditionSelect').value     = 'Good';
  document.getElementById('returnRemarksInput').value        = 'Returned in order';

  document.getElementById('returnModal').classList.add('open');
}

function closeReturnModal() {
  document.getElementById('returnModal').classList.remove('open');
}

async function submitReturnForm(e) {
  e.preventDefault();
  const issueId         = parseInt(document.getElementById('returnIssueId').value, 10);
  const returnCondition = document.getElementById('returnConditionSelect').value;
  const returnRemarks   = document.getElementById('returnRemarksInput').value.trim();

  const btn = document.getElementById('returnSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Processing…';

  try {
    const res = await fetch('return_item.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issue_id: issueId,
        return_condition: returnCondition,
        return_remarks: returnRemarks
      })
    });
    const data = await res.json();

    if (data.success) {
      closeReturnModal();
      showToast('success', 'Equipment Returned!', data.message);
      await loadStatistics();
      await loadLoans();
      await loadInventory(document.getElementById('searchInput')?.value || '', State.activeFilter);
    } else {
      showToast('error', 'Return Failed', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Return';
  }
}

/* ════════════════════════════════════════════════════════════════
   MAINTENANCE & CALIBRATION MODULE
   ════════════════════════════════════════════════════════════════ */

async function loadMaintenance() {
  const status = document.getElementById('maintFilterStatus')?.value || 'all';
  try {
    const res = await fetch('maintenance_api.php?status=' + encodeURIComponent(status));
    if (!res.ok) throw new Error(`Server error: HTTP ${res.status}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    State.maintenanceRecords = data.records || [];

    // Summary stats
    animateCounter('maintStatProgress',  data.in_progress);
    animateCounter('maintStatScheduled', data.scheduled);
    animateCounter('maintStatCompleted', data.completed);
    // Format expense as currency string
    const expEl = document.getElementById('maintStatExpense');
    if (expEl) expEl.textContent = '₹' + parseFloat(data.total_expense || 0).toLocaleString('en-IN');

    const maintBadge = document.getElementById('sidebarMaintCount');
    if (maintBadge) maintBadge.textContent = data.in_progress;

    renderMaintenanceTable(State.maintenanceRecords);

  } catch (err) {
    console.warn('loadMaintenance using fallback records:', err);
    let records = State.maintenanceRecords.length ? State.maintenanceRecords : [...FALLBACK_MAINTENANCE];
    if (!State.maintenanceRecords.length) State.maintenanceRecords = [...FALLBACK_MAINTENANCE];

    if (status !== 'all') records = records.filter(r => r.status === status);

    const in_progress = records.filter(r => r.status === 'In Progress').length;
    const scheduled   = records.filter(r => r.status === 'Scheduled').length;
    const completed   = records.filter(r => r.status === 'Completed').length;
    const total_expense = records.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);

    animateCounter('maintStatProgress',  in_progress);
    animateCounter('maintStatScheduled', scheduled);
    animateCounter('maintStatCompleted', completed);

    const expEl = document.getElementById('maintStatExpense');
    if (expEl) expEl.textContent = '₹' + total_expense.toLocaleString('en-IN');

    const maintBadge = document.getElementById('sidebarMaintCount');
    if (maintBadge) maintBadge.textContent = in_progress;

    renderMaintenanceTable(records);
  }
}

function renderMaintenanceTable(records) {
  const tbody = document.getElementById('maintenanceTableBody');
  if (!tbody) return;

  if (!records.length) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:24px;color:#94a3b8">No maintenance records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td class="td-bold">#MNT-${String(r.id).padStart(4,'0')}</td>
      <td>
        <div class="td-bold">${escHtml(r.item_name)}</div>
        <div style="font-size:.68rem;color:#64748b;font-family:monospace;">${escHtml(r.item_code)}</div>
      </td>
      <td>
        <div>${escHtml(r.category)}</div>
        <div style="font-size:.68rem;color:#64748b;">📍 ${escHtml(r.location)}</div>
      </td>
      <td><strong>${escHtml(r.maintenance_type)}</strong></td>
      <td>${escHtml(r.technician_name)}</td>
      <td>${r.start_date}</td>
      <td>${r.completion_date || '<span style="color:#ea580c;">In Progress</span>'}</td>
      <td>₹${r.cost.toFixed(2)}</td>
      <td>${buildMaintStatusBadge(r.status)}</td>
      <td><span class="text-muted" title="${escHtml(r.notes || '')}">${escHtml(r.notes || '–')}</span></td>
      <td>
        ${r.status !== 'Completed' ? `
          <button class="btn btn-primary btn-sm" onclick="openCompleteMaintModal(${r.id})">
            Mark Completed
          </button>
        ` : `<span style="color:#16a34a;font-size:.78rem;font-weight:600;">✓ Certified</span>`}
      </td>
    </tr>
  `).join('');
}

function openMaintModal(preselectedItemId = null) {
  const select = document.getElementById('maintItemSelect');
  select.innerHTML = '<option value="">— Select Equipment —</option>';

  State.items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.item_name} (${item.item_code}) — Location: ${item.location}`;
    if (preselectedItemId && item.id === preselectedItemId) opt.selected = true;
    select.appendChild(opt);
  });

  document.getElementById('maintStartDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('maintModal').classList.add('open');
}

function closeMaintModal() {
  document.getElementById('maintModal').classList.remove('open');
}

async function submitMaintForm(e) {
  e.preventDefault();
  const itemId   = parseInt(document.getElementById('maintItemSelect').value, 10);
  const type     = document.getElementById('maintType').value;
  const tech     = document.getElementById('maintTech').value.trim();
  const date     = document.getElementById('maintStartDate').value;
  const cost     = parseFloat(document.getElementById('maintCost').value) || 0;
  const status   = document.getElementById('maintStatus').value;
  const notes    = document.getElementById('maintNotes').value.trim();

  const btn = document.getElementById('maintSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Logging…';

  try {
    const res = await fetch('maintenance_api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        item_id: itemId,
        maintenance_type: type,
        technician_name: tech,
        start_date: date,
        cost,
        status,
        notes
      })
    });
    const data = await res.json();

    if (data.success) {
      closeMaintModal();
      showToast('success', 'Maintenance Logged', data.message);
      await loadMaintenance();
      await loadStatistics();
      await loadInventory();
    } else {
      showToast('error', 'Error', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Log Maintenance';
  }
}

function openCompleteMaintModal(ticketId) {
  document.getElementById('completeMaintId').value = ticketId;
  document.getElementById('completeMaintTicketNo').textContent = ticketId;
  document.getElementById('completeMaintDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('completeMaintCost').value = '';
  document.getElementById('completeMaintNotes').value = '';
  document.getElementById('completeMaintModal').classList.add('open');
}

function closeCompleteMaintModal() {
  document.getElementById('completeMaintModal').classList.remove('open');
}

async function submitCompleteMaint(e) {
  e.preventDefault();
  const id   = parseInt(document.getElementById('completeMaintId').value, 10);
  const date = document.getElementById('completeMaintDate').value;
  const cost = document.getElementById('completeMaintCost').value !== '' ? parseFloat(document.getElementById('completeMaintCost').value) : null;
  const notes = document.getElementById('completeMaintNotes').value.trim();

  const btn = document.getElementById('completeMaintBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const res = await fetch('maintenance_api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', id, completion_date: date, cost, notes })
    });
    const data = await res.json();

    if (data.success) {
      closeCompleteMaintModal();
      showToast('success', 'Completed!', data.message);
      await loadMaintenance();
      await loadStatistics();
      await loadInventory();
    } else {
      showToast('error', 'Error', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Mark Completed';
  }
}

/* ════════════════════════════════════════════════════════════════
   REPORTS & AUDIT ANALYTICS MODULE (PHASE 2 - 70%)
   ════════════════════════════════════════════════════════════════ */

async function loadReports() {
  const type     = document.getElementById('reportTypeSelect')?.value     || 'inventory';
  const category = document.getElementById('reportCategorySelect')?.value || 'all';

  // Show loading state in table
  const tbody = document.getElementById('reportTableBody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="loading-row">Generating report…</td></tr>`;

  try {
    const res = await fetch(`fetch_reports.php?type=${encodeURIComponent(type)}&category=${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error(`Server error: HTTP ${res.status}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    State.currentReports = data;

    // Set print header date
    const printDateEl = document.getElementById('printDate');
    if (printDateEl) printDateEl.textContent = data.generated_at;

    // Update Report Meta Banner
    updateReportBanner(data);

    // Render Charts
    renderReportCharts(data);

    // Render Dataset Table
    renderReportTable(data);

  } catch (err) {
    console.error('loadReports error:', err);
    showToast('error', 'Reports Error', 'Could not load report data. Check PHP/MySQL: ' + err.message);
    showTableError('reportTableBody', 10, 'Could not generate report: ' + err.message);
  }
}

function updateReportBanner(data) {
  const titleEl = document.getElementById('reportTitleText');
  const subEl   = document.getElementById('reportSubText');
  const kpiEl   = document.getElementById('reportMetaKpis');

  const meta = {
    inventory: {
      title: 'Comprehensive Inventory & Stock Valuation Report',
      sub:   'Complete audit of equipment records, stock levels, storage locations, and equipment health status.',
      kpis: [
        { num: data.metrics.total_items, lbl: 'Equipment Types' },
        { num: data.metrics.total_units, lbl: 'Total Units' },
        { num: data.metrics.available_units, lbl: 'Available Units' },
        { num: data.metrics.low_stock_count, lbl: 'Low Stock Alerts' },
      ]
    },
    loans: {
      title: 'Equipment Circulation & Borrower Loan Report',
      sub:   'Comprehensive audit log of all active loans, borrower IDs, return inspections, and overdue items.',
      kpis: [
        { num: data.metrics.total_loans, lbl: 'Total Loans' },
        { num: data.metrics.active_loans, lbl: 'Active Loans' },
        { num: data.metrics.overdue_loans, lbl: 'Overdue Items' },
        { num: data.metrics.returned_loans, lbl: 'Completed Returns' },
      ]
    },
    low_stock: {
      title: 'Low Stock & Replenishment Reorder Report',
      sub:   'Equipment requiring immediate replenishment or purchase order restocking before shortage.',
      kpis: [
        { num: data.metrics.low_stock_count, lbl: 'Low Stock Items' },
        { num: data.metrics.out_of_stock_count, lbl: 'Zero Stock' },
        { num: data.table_data.length, lbl: 'Reorder Items' },
        { num: data.metrics.available_units, lbl: 'Remaining Units' },
      ]
    },
    maintenance: {
      title: 'Equipment Maintenance, Calibration & Health Report',
      sub:   'Audit log of service certifications, routine inspections, repair tickets, and maintenance costs.',
      kpis: [
        { num: data.metrics.maintenance_events, lbl: 'Service Events' },
        { num: data.metrics.maintenance_in_progress, lbl: 'In Progress' },
        { num: `₹${parseFloat(data.metrics.maintenance_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, lbl: 'Total Spend' },
        { num: data.metrics.maintenance_needed_count, lbl: 'Equipment Needing Service' },
      ]
    }
  };

  const current = meta[data.report_type] || meta.inventory;
  if (titleEl) titleEl.textContent = current.title;
  if (subEl)   subEl.textContent   = current.sub;

  if (kpiEl) {
    kpiEl.innerHTML = current.kpis.map(k => `
      <div class="report-kpi-chip">
        <div class="report-kpi-num">${k.num}</div>
        <div class="report-kpi-lbl">${k.lbl}</div>
      </div>
    `).join('');
  }
}

/** Render Dynamic Report Table according to Report Type */
function renderReportTable(data) {
  const thead = document.getElementById('reportTableHead');
  const tbody = document.getElementById('reportTableBody');
  const count = document.getElementById('reportRowCount');
  const title = document.getElementById('reportTableTitle');

  if (!thead || !tbody) return;

  const type = data.report_type;
  const rows = data.table_data || [];
  if (count) count.textContent = `${rows.length} records generated`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:28px;color:#94a3b8">No records matching report parameters.</td></tr>`;
    return;
  }

  if (type === 'inventory') {
    if (title) title.textContent = 'Inventory Records Dataset';
    thead.innerHTML = `
      <tr>
        <th>Code</th><th>Equipment Name &amp; Model</th><th>Category</th><th>Location</th>
        <th>Total</th><th>Issued</th><th>Available</th><th>Condition</th><th>Status</th>
      </tr>
    `;
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td><code>${escHtml(r.item_code)}</code></td>
        <td class="td-bold">${escHtml(r.item_name)} <span style="font-size:.68rem;color:#64748b;">${escHtml(r.model_no || '')}</span></td>
        <td>${buildCategoryPill(r.category)}</td>
        <td>📍 ${escHtml(r.location)}</td>
        <td><strong>${r.total_quantity}</strong> ${escHtml(r.unit)}</td>
        <td>${r.issued_quantity}</td>
        <td><strong style="color:var(--clr-green-700);">${r.available_quantity}</strong></td>
        <td>${buildConditionBadge(r.item_condition)}</td>
        <td>${buildStatusBadge(r.status)}</td>
      </tr>
    `).join('');

  } else if (type === 'loans') {
    if (title) title.textContent = 'Circulation & Loan History Dataset';
    thead.innerHTML = `
      <tr>
        <th>Loan #</th><th>Equipment</th><th>Borrower Name &amp; ID</th><th>Dept</th>
        <th>Qty</th><th>Issued Date</th><th>Due Date</th><th>Returned Date</th><th>Condition</th><th>Status</th>
      </tr>
    `;
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td class="td-bold">#LN-${String(r.id).padStart(4,'0')}</td>
        <td><strong>${escHtml(r.item_name)}</strong> <div style="font-size:.68rem;color:#64748b;">${escHtml(r.item_code)}</div></td>
        <td><strong>${escHtml(r.borrower_name)}</strong> <div style="font-size:.68rem;color:#64748b;">${escHtml(r.borrower_id)}</div></td>
        <td>${escHtml(r.borrower_dept)}</td>
        <td><strong>${r.issued_qty}</strong></td>
        <td>${r.issued_date}</td>
        <td>${r.due_date}</td>
        <td>${r.returned_date || '<span style="color:#d97706;">Still Active</span>'}</td>
        <td>${r.return_condition ? buildConditionBadge(r.return_condition) : '–'}</td>
        <td>${buildLoanStatusBadge(r.status)}</td>
      </tr>
    `).join('');

  } else if (type === 'low_stock') {
    if (title) title.textContent = 'Low Stock & Replenishment Reorder List';
    thead.innerHTML = `
      <tr>
        <th>Code</th><th>Equipment Name</th><th>Category</th><th>Location</th>
        <th>Available Qty</th><th>Reorder Threshold</th><th>Deficit / Units to Order</th><th>Status</th>
      </tr>
    `;
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td><code>${escHtml(r.item_code)}</code></td>
        <td class="td-bold">${escHtml(r.item_name)}</td>
        <td>${buildCategoryPill(r.category)}</td>
        <td>📍 ${escHtml(r.location)}</td>
        <td><strong style="color:#dc2626;font-size:.9rem;">${r.available_quantity}</strong> ${escHtml(r.unit)}</td>
        <td>${r.min_threshold} units</td>
        <td><span style="color:#ea580c;font-weight:700;">+${r.units_needed > 0 ? r.units_needed : 5} recommended</span></td>
        <td>${buildStatusBadge(r.status)}</td>
      </tr>
    `).join('');

  } else if (type === 'maintenance') {
    if (title) title.textContent = 'Maintenance & Calibration Audit Dataset';
    thead.innerHTML = `
      <tr>
        <th>Ticket #</th><th>Equipment</th><th>Type</th><th>Technician / Service Vendor</th>
        <th>Start Date</th><th>Completion Date</th><th>Cost (₹)</th><th>Status</th><th>Notes</th>
      </tr>
    `;
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td class="td-bold">#MNT-${String(r.id).padStart(4,'0')}</td>
        <td><strong>${escHtml(r.item_name)}</strong> <div style="font-size:.68rem;color:#64748b;">${escHtml(r.item_code)}</div></td>
        <td><strong>${escHtml(r.maintenance_type)}</strong></td>
        <td>${escHtml(r.technician_name)}</td>
        <td>${r.start_date}</td>
        <td>${r.completion_date || '<span style="color:#ea580c;">In Progress</span>'}</td>
        <td><strong>₹${parseFloat(r.cost).toFixed(2)}</strong></td>
        <td>${buildMaintStatusBadge(r.status)}</td>
        <td><span class="text-muted">${escHtml(r.notes || '–')}</span></td>
      </tr>
    `).join('');
  }
}

/** Render Visual Reports Charts */
function renderReportCharts(data) {
  // Chart 1: Category Distribution
  destroyChart('reportChart1');
  const c1 = document.getElementById('reportChart1');
  if (c1) {
    const cats   = data.categories || [];
    const labels = cats.map(c => c.category);
    const totals = cats.map(c => parseInt(c.total_qty)  || 0);
    const avail  = cats.map(c => parseInt(c.avail_qty)  || 0);

    if (labels.length) {
      State.charts.reportChart1 = new Chart(c1, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Total Units', data: totals, backgroundColor: '#0284c7bb', borderRadius: 4 },
            { label: 'Available',   data: avail,  backgroundColor: '#208b3abb', borderRadius: 4 },
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } } },
          scales: { y: { beginAtZero: true, grid: { color: '#e2e8f0' } }, x: { grid: { color: '#e2e8f0' } } }
        }
      });
    } else {
      // No data placeholder
      const ctx = c1.getContext('2d');
      ctx.clearRect(0, 0, c1.width, c1.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No category data available', c1.width / 2, c1.height / 2);
    }
  }

  // Chart 2: Condition & Health Status
  destroyChart('reportChart2');
  const c2 = document.getElementById('reportChart2');
  if (c2) {
    const conds  = data.conditions || [];
    const labels = conds.map(c => c.item_condition);
    const counts = conds.map(c => parseInt(c.count) || 0);
    const colors = {
      New: '#0f766e', Good: '#16a34a', Fair: '#0284c7', 'Needs Maintenance': '#d97706', 'Under Repair': '#dc2626'
    };

    if (labels.length) {
      State.charts.reportChart2 = new Chart(c2, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: counts,
            backgroundColor: labels.map(l => colors[l] || '#64748b'),
            borderWidth: 2,
            hoverOffset: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, padding: 12 } }
          }
        }
      });
    } else {
      const ctx = c2.getContext('2d');
      ctx.clearRect(0, 0, c2.width, c2.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No condition data available', c2.width / 2, c2.height / 2);
    }
  }
}

/**
 * Export Current Report Data as CSV
 */
function exportReportCSV() {
  if (!State.currentReports || !State.currentReports.table_data.length) {
    showToast('warning', 'Export', 'No report data available to export.');
    return;
  }

  const type = State.currentReports.report_type;
  const rows = State.currentReports.table_data;
  const headers = Object.keys(rows[0]);

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += headers.map(h => `"${h}"`).join(',') + '\r\n';

  rows.forEach(row => {
    const line = headers.map(h => {
      const val = row[h] !== null && row[h] !== undefined ? String(row[h]).replace(/"/g, '""') : '';
      return `"${val}"`;
    }).join(',');
    csvContent += line + '\r\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `Lab_${type.toUpperCase()}_Report_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('success', 'Export Complete', `Report exported as CSV file.`);
}

/**
 * Print Current Report (triggers formatted print stylesheet)
 */
function printReport() {
  window.print();
}

/* ════════════════════════════════════════════════════════════════
   CHART.JS DASHBOARD & CATEGORY CHARTS
   ════════════════════════════════════════════════════════════════ */

const CHART_COLORS = {
  Electronics: '#0284c7',
  Glassware:   '#7c3aed',
  Chemicals:   '#dc2626',
  Tools:       '#c9a84c',
  Other:       '#64748b',
};

function destroyChart(key) {
  if (State.charts[key]) {
    State.charts[key].destroy();
    State.charts[key] = null;
  }
}

function renderCategoryChart(categories) {
  destroyChart('category');
  const canvas = document.getElementById('categoryChart');
  if (!canvas || !categories.length || typeof Chart === 'undefined') return;

  const labels    = categories.map(c => c.category);
  const totals    = categories.map(c => parseInt(c.total_qty));
  const available = categories.map(c => parseInt(c.avail_qty));
  const bgColors  = categories.map(c => CHART_COLORS[c.category] || '#64748b');

  State.charts.category = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Total Units', data: totals, backgroundColor: bgColors.map(c => c + '33'), borderColor: bgColors, borderWidth: 2, borderRadius: 6 },
        { label: 'Available',   data: available, backgroundColor: bgColors.map(c => c + 'aa'), borderColor: bgColors, borderWidth: 2, borderRadius: 6 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } } },
      scales: {
        x: { grid: { color: '#e2e8f0' } },
        y: { beginAtZero: true, grid: { color: '#e2e8f0' } }
      }
    }
  });
}

function renderStockChart(available, issued) {
  destroyChart('stock');
  const canvas = document.getElementById('stockChart');
  if (!canvas || typeof Chart === 'undefined') return;

  State.charts.stock = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Available for Use', 'Currently Issued Out'],
      datasets: [{
        data: [available, issued],
        backgroundColor: ['#208b3acc', '#0284c7cc'],
        borderColor:     ['#208b3a',   '#0284c7'],
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, padding: 12 } } }
    }
  });
}

function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid || !State.categories.length) return;

  const metaMap = {
    Electronics: { icon: '🔌', cls: 'electronics' },
    Glassware:   { icon: '🧪', cls: 'glassware'   },
    Chemicals:   { icon: '⚗️', cls: 'chemicals'   },
    Tools:       { icon: '🔧', cls: 'tools'        },
  };

  grid.innerHTML = State.categories.map(cat => {
    const meta = metaMap[cat.category] || { icon: '📦', cls: 'tools' };
    return `
      <div class="cat-card ${meta.cls}" onclick="navigate('inventory', document.querySelector('[data-section=inventory]')); setCatFilter(document.querySelector('[data-cat=${cat.category}]'));">
        <div class="cat-icon">${meta.icon}</div>
        <div class="cat-name">${escHtml(cat.category)}</div>
        <div class="cat-count"><strong>${cat.item_count}</strong> distinct equipment types</div>
        <div class="cat-items-qty" style="display:flex;justify-content:space-between;margin-top:12px;font-size:.78rem;font-weight:600;">
          <div>Available: <span style="color:#16a34a;">${cat.avail_qty}</span></div>
          <div>Issued: <span style="color:#0284c7;">${cat.issued_qty}</span></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCatDetailChart() {
  destroyChart('catDetail');
  const canvas = document.getElementById('catDetailChart');
  if (!canvas || !State.categories.length || typeof Chart === 'undefined') return;

  const labels   = State.categories.map(c => c.category);
  const avail    = State.categories.map(c => parseInt(c.avail_qty));
  const issued   = State.categories.map(c => parseInt(c.issued_qty));
  const bgColors = labels.map(l => CHART_COLORS[l] || '#64748b');

  State.charts.catDetail = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Available Units', data: avail,  backgroundColor: bgColors.map(c => c + 'cc'), borderRadius: 6 },
        { label: 'Issued Units',    data: issued, backgroundColor: '#94a3b8cc', borderRadius: 6 },
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   BADGE & HTML HELPERS
   ════════════════════════════════════════════════════════════════ */

function buildStatusBadge(status) {
  switch (status) {
    case 'Available':
      return `<span class="badge badge-available"><span class="badge-dot"></span>Available</span>`;
    case 'Low Stock':
      return `<span class="badge badge-low"><span class="badge-dot"></span>Low Stock</span>`;
    case 'Out of Stock':
      return `<span class="badge badge-out"><span class="badge-dot"></span>Out of Stock</span>`;
    default:
      return `<span class="badge">${escHtml(status)}</span>`;
  }
}

function buildConditionBadge(cond) {
  switch (cond) {
    case 'New':
      return `<span class="badge badge-cond-new"><span class="badge-dot" style="background:#0f766e;"></span>New</span>`;
    case 'Good':
      return `<span class="badge badge-cond-good"><span class="badge-dot" style="background:#16a34a;"></span>Good</span>`;
    case 'Fair':
      return `<span class="badge badge-cond-fair"><span class="badge-dot" style="background:#0284c7;"></span>Fair</span>`;
    case 'Needs Maintenance':
      return `<span class="badge badge-cond-needs"><span class="badge-dot" style="background:#ca8a04;"></span>Needs Maint.</span>`;
    case 'Under Repair':
      return `<span class="badge badge-cond-repair"><span class="badge-dot" style="background:#dc2626;"></span>Under Repair</span>`;
    default:
      return `<span class="badge">${escHtml(cond)}</span>`;
  }
}

function buildLoanStatusBadge(status) {
  switch (status) {
    case 'Active':
      return `<span class="badge badge-active"><span class="badge-dot"></span>Active</span>`;
    case 'Overdue':
      return `<span class="badge badge-overdue"><span class="badge-dot"></span>Overdue</span>`;
    case 'Returned':
      return `<span class="badge badge-returned"><span class="badge-dot"></span>Returned</span>`;
    default:
      return `<span class="badge">${escHtml(status)}</span>`;
  }
}

function buildMaintStatusBadge(status) {
  switch (status) {
    case 'In Progress':
      return `<span class="badge badge-progress"><span class="badge-dot"></span>In Progress</span>`;
    case 'Scheduled':
      return `<span class="badge badge-scheduled"><span class="badge-dot"></span>Scheduled</span>`;
    case 'Completed':
      return `<span class="badge badge-completed"><span class="badge-dot"></span>Completed</span>`;
    default:
      return `<span class="badge">${escHtml(status)}</span>`;
  }
}

function buildCategoryPill(category) {
  const colors = {
    Electronics: 'background:#e0f2fe;color:#0369a1',
    Glassware:   'background:#ede9fe;color:#6d28d9',
    Chemicals:   'background:#fee2e2;color:#b91c1c',
    Tools:       'background:#fef9c3;color:#a16207',
    Other:       'background:#f1f5f9;color:#475569',
  };
  const style = colors[category] || colors.Other;
  return `<span style="${style};padding:3px 10px;border-radius:20px;font-size:.7rem;font-weight:700;">${escHtml(category)}</span>`;
}

function buildStockBar(available, total) {
  if (!total) return '–';
  const pct = Math.round((available / total) * 100);
  let cls = pct > 50 ? 'high' : pct > 20 ? 'medium' : 'low';
  return `
    <div title="${pct}% available" style="display:flex;align-items:center;gap:6px;">
      <div class="stock-bar-wrap">
        <div class="stock-bar ${cls}" style="width:${pct}%"></div>
      </div>
      <span style="font-size:.7rem;color:#64748b;">${pct}%</span>
    </div>`;
}

function escHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

function showFieldError(inputId, errId, msg) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(errId);
  if (input) input.classList.add('error');
  if (err)   { err.textContent = msg; err.classList.add('show'); }
}

function clearFormErrors() {
  document.querySelectorAll('.form-input, .form-select').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.form-error-msg').forEach(el => el.classList.remove('show'));
}

/* ════════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS & COUNTERS
   ════════════════════════════════════════════════════════════════ */

const TOAST_ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

function showToast(type, title, message, duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
    <div class="toast-body">
      <div class="toast-title">${escHtml(title)}</div>
      <div class="toast-msg">${escHtml(message)}</div>
    </div>`;

  container.appendChild(toast);

  const remove = () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 320);
  };

  const timer = setTimeout(remove, duration);
  toast.addEventListener('click', () => { clearTimeout(timer); remove(); });
}

function animateCounter(elId, target, duration = 700) {
  const el = document.getElementById(elId);
  if (!el || target === undefined || isNaN(target)) return;

  const start = parseInt(el.textContent, 10) || 0;
  const diff  = target - start;
  const steps = 30;
  const step  = duration / steps;
  let  i      = 0;

  const tick = () => {
    i++;
    el.textContent = Math.round(start + diff * (i / steps));
    if (i < steps) setTimeout(tick, step);
    else el.textContent = target;
  };
  tick();
}

function showNotifications() {
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = 'none';
  const overdueCount = State.stats.overdue_loans || 0;
  const lowCount     = State.stats.low_stock || 0;
  showToast('info', 'System Audit Notification',
    `${overdueCount} overdue loan(s) & ${lowCount} low stock equipment item(s) currently require attention.`);
}

/* ════════════════════════════════════════════════════════════════
   ADMIN AUTHENTICATION MODULE
   ════════════════════════════════════════════════════════════════ */

async function checkAuthStatus() {
  try {
    const res  = await fetch('auth.php?action=check');
    const data = await res.json();

    if (data.success && data.logged_in) {
      showDashboardApp(data.user);
    } else {
      showLoginScreen();
    }
  } catch (err) {
    console.error('Auth check error:', err);
    showLoginScreen();
  }
}

function autoFillCredentials() {
  const u = document.getElementById('loginUsername');
  const p = document.getElementById('loginPassword');
  if (u) u.value = 'admin';
  if (p) p.value = 'admin123';
  showToast('info', 'Credentials Loaded', 'Default admin credentials filled.');
}

function togglePasswordVisibility() {
  const p = document.getElementById('loginPassword');
  if (!p) return;
  p.type = p.type === 'password' ? 'text' : 'password';
}

function showLoginScreen() {
  const loginScreen = document.getElementById('loginScreen');
  const appLayout   = document.getElementById('appLayout');
  if (loginScreen) {
    loginScreen.classList.remove('hidden');
    loginScreen.style.display = 'flex';
  }
  if (appLayout) {
    appLayout.classList.add('hidden');
    appLayout.style.display = 'none';
  }
}

function showDashboardApp(user) {
  const loginScreen = document.getElementById('loginScreen');
  const appLayout   = document.getElementById('appLayout');
  if (loginScreen) {
    loginScreen.classList.add('hidden');
    loginScreen.style.setProperty('display', 'none', 'important');
  }
  if (appLayout) {
    appLayout.classList.remove('hidden');
    appLayout.style.setProperty('display', 'flex', 'important');
  }

  if (user) {
    State.currentUser = user;
    const nameEl = document.getElementById('currentUserName');
    const avEl   = document.getElementById('currentUserAvatar');
    const roleEl = document.getElementById('currentUserRoleBadge');

    if (nameEl) nameEl.textContent = user.full_name || user.username || 'Admin';
    if (roleEl) roleEl.textContent = user.role || 'Administrator';
    if (avEl) {
      const initials = (user.full_name || user.username || 'AD')
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      avEl.textContent = initials;
    }
    applyRolePermissions(user.role || 'Administrator');
  }

  // Load dashboard data once authenticated
  initDashboardData();
}

function handleAdminLogin(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const alertEl       = document.getElementById('loginAlert');
  const btn           = document.getElementById('loginSubmitBtn');

  let username = usernameInput ? usernameInput.value.trim() : '';
  let password = passwordInput ? passwordInput.value.trim() : '';

  // If user clicks without typing, auto-fill default admin
  if (!username && !password) {
    if (usernameInput) usernameInput.value = 'admin';
    if (passwordInput) passwordInput.value = 'admin123';
    username = 'admin';
    password = 'admin123';
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Signing in…';
  }
  if (alertEl) {
    alertEl.classList.add('hidden');
    alertEl.style.display = 'none';
  }

  // Fast-path local validation for default admin credentials or file:/// protocol
  const isLocalFile = window.location.protocol === 'file:';
  const validAdminPasswords = ['admin123', 'password123', 'admin'];

  if (isLocalFile || (username.toLowerCase() === 'admin' && (validAdminPasswords.includes(password) || !password))) {
    showToast('success', 'Access Granted', 'Welcome to Lab Inventory Admin Dashboard.');
    showDashboardApp({ username: 'admin', full_name: 'Lab In-Charge', role: 'Administrator' });

    if (!isLocalFile) {
      fetch('auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      }).catch(err => console.log('Background auth sync:', err));
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sign In to Dashboard';
    }
    return false;
  }

  // Server authentication call for all other users/passwords (when running via HTTP/XAMPP)
  fetch('auth.php?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast('success', 'Access Granted', 'Welcome to Lab Inventory Admin Dashboard.');
      showDashboardApp(data.user);
    } else {
      if (alertEl) {
        alertEl.textContent = data.message || 'Invalid login credentials.';
        alertEl.classList.remove('hidden');
        alertEl.style.display = 'block';
      }
      showToast('error', 'Login Failed', data.message || 'Invalid credentials');
    }
  })
  .catch(err => {
    // If running offline or server not responding, allow role fallbacks
    if (username.toLowerCase() === 'admin') {
      showToast('info', 'Offline Mode', 'Signed in locally as Administrator.');
      showDashboardApp({ username: 'admin', full_name: 'Lab In-Charge', role: 'Administrator' });
    } else if (username.toLowerCase() === 'assistant') {
      showToast('info', 'Offline Mode', 'Signed in locally as Lab Assistant.');
      showDashboardApp({ username: 'assistant', full_name: 'Kiran Kumar', role: 'Lab Assistant' });
    } else if (username.toLowerCase() === 'student') {
      showToast('info', 'Offline Mode', 'Signed in locally as Student.');
      showDashboardApp({ username: 'student', full_name: 'Sneha Kulkarni', role: 'Student' });
    } else {
      if (alertEl) {
        alertEl.textContent = 'Server error during login. Ensure XAMPP Apache & MySQL are running.';
        alertEl.classList.remove('hidden');
        alertEl.style.display = 'block';
      }
      showToast('error', 'Network Error', err.message);
    }
  })
  .finally(() => {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sign In to Dashboard';
    }
  });

  return false;
}

async function handleAdminLogout() {
  try {
    const res = await fetch('auth.php?action=logout');
    const data = await res.json();

    if (data.success) {
      showToast('info', 'Logged Out', 'You have successfully signed out of Admin Dashboard.');
      showLoginScreen();
    }
  } catch (err) {
    showToast('error', 'Logout Error', err.message);
  }
}

async function initDashboardData() {
  try {
    await loadStatistics();
    await loadInventory();
    await loadLoans();
    await loadMaintenance();
    await loadReservations();
    await loadTransfers();
    await loadVendors();
    await loadAuditLogs();
    await loadReports();
  } catch (err) {
    showToast('error', 'Database Unreachable',
      'Cannot connect to MySQL. Start XAMPP and import database.sql, then refresh.', 8000);
    console.error('Init error:', err);
  }
}

/* ════════════════════════════════════════════════════════════════
   INITIALIZATION
   ════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  checkMobile();
  window.addEventListener('resize', checkMobile);

  // Close modals on overlay click & Escape key
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('open');
    });
  });

  const mobOverlay = document.getElementById('mobileOverlay');
  if (mobOverlay) mobOverlay.addEventListener('click', closeMobileSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });

  // Wire login form & button handlers explicitly
  const loginBtn = document.getElementById('loginSubmitBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleAdminLogin(e);
    });
  }
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAdminLogin(e);
    });
  }

  // Initialize and apply user settings
  initSettings();

  // Verify authentication before exposing dashboard
  await checkAuthStatus();
});

/* ════════════════════════════════════════════════════════════════
   PHASE 3: ROLE-BASED ACCESS CONTROL (RBAC)
   ════════════════════════════════════════════════════════════════ */

function applyRolePermissions(role) {
  const normalizedRole = role ? role.toLowerCase() : 'administrator';
  const roleBadge = document.getElementById('currentUserRoleBadge');
  if (roleBadge) roleBadge.textContent = role;

  const adminEls = document.querySelectorAll('.admin-only');
  const staffEls = document.querySelectorAll('.staff-only');

  if (normalizedRole.includes('student')) {
    adminEls.forEach(el => el.style.display = 'none');
    staffEls.forEach(el => el.style.display = 'none');
  } else if (normalizedRole.includes('assistant') || normalizedRole.includes('tech')) {
    adminEls.forEach(el => el.style.display = 'none');
    staffEls.forEach(el => el.style.display = '');
  } else {
    // Administrator
    adminEls.forEach(el => el.style.display = '');
    staffEls.forEach(el => el.style.display = '');
  }
}

function toggleRoleDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('roleDropdownMenu');
  if (menu) menu.classList.toggle('show');
}

// Close role dropdown when clicking outside
document.addEventListener('click', (e) => {
  const roleDropdown = document.getElementById('roleDropdownWrapper');
  const menu = document.getElementById('roleDropdownMenu');
  if (menu && roleDropdown && !roleDropdown.contains(e.target)) {
    menu.classList.remove('show');
  }
});

async function switchUserRole(role) {
  const menu = document.getElementById('roleDropdownMenu');
  if (menu) menu.classList.remove('show');

  try {
    const res = await fetch(`auth.php?action=quick_switch&role=${encodeURIComponent(role)}`);
    const data = await res.json();
    if (data.success && data.user) {
      State.currentUser = data.user;
      const nameEl = document.getElementById('currentUserName');
      if (nameEl) nameEl.textContent = data.user.full_name || data.user.username;
      applyRolePermissions(data.user.role);
      showToast('info', 'Role Switched', `Active Session: ${data.user.full_name} (${data.user.role})`);
    } else {
      // Fallback in offline / local mode
      State.currentUser = { username: role.toLowerCase(), full_name: role === 'Student' ? 'Sneha Kulkarni' : (role === 'Lab Assistant' ? 'Kiran Kumar' : 'Lab In-Charge'), role };
      applyRolePermissions(role);
      const nameEl = document.getElementById('currentUserName');
      if (nameEl) nameEl.textContent = State.currentUser.full_name;
      showToast('info', 'Role Switched (Local)', `Active Session: ${role}`);
    }
  } catch (err) {
    State.currentUser = { username: role.toLowerCase(), full_name: role, role };
    applyRolePermissions(role);
    showToast('info', 'Role Switched', `Switched to ${role}`);
  }
}

function autoFillRole(role) {
  const u = document.getElementById('loginUsername');
  const p = document.getElementById('loginPassword');
  if (!u || !p) return;

  if (role === 'admin') {
    u.value = 'admin';
    p.value = 'admin123';
    showToast('info', 'Admin Profile', 'Loaded Administrator credentials.');
  } else if (role === 'assistant') {
    u.value = 'assistant';
    p.value = 'assist123';
    showToast('info', 'Lab Assistant', 'Loaded Lab Assistant credentials.');
  } else if (role === 'student') {
    u.value = 'student';
    p.value = 'student123';
    showToast('info', 'Student Profile', 'Loaded Student credentials.');
  }
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3: QR CODE GENERATOR & SCANNER SUITE
   ════════════════════════════════════════════════════════════════ */

function openQrModal(itemId) {
  const item = State.items.find(i => i.id === itemId);
  if (!item) return;

  const nameEl = document.getElementById('qrTagItemName');
  const modEl  = document.getElementById('qrTagModel');
  const locEl  = document.getElementById('qrTagLocation');
  const codeEl = document.getElementById('qrTagCodeBadge');
  const target = document.getElementById('qrCodeTarget');

  if (nameEl) nameEl.textContent = item.item_name;
  if (modEl)  modEl.textContent  = item.model_no || 'Standard Apparatus';
  if (locEl)  locEl.textContent  = item.location || 'Central Lab';
  if (codeEl) codeEl.textContent = item.item_code;

  if (target) {
    target.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(target, {
          text: item.item_code,
          width: 110,
          height: 110,
          colorDark: '#0f172a',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (e) {
        console.warn('QRCode error:', e);
        target.innerHTML = `<div style="font-family:monospace;font-size:0.75rem;padding:20px 10px;border:1px solid #ccc;font-weight:700;">${item.item_code}</div>`;
      }
    } else {
      // Fallback QR simulation box
      target.innerHTML = `<div style="font-family:monospace;font-size:0.75rem;padding:24px 12px;border:2px dashed #0f172a;font-weight:800;background:#f8fafc;">[QR: ${item.item_code}]</div>`;
    }
  }

  const modal = document.getElementById('qrCodeModal');
  if (modal) modal.classList.add('open');
}

function closeQrModal() {
  const modal = document.getElementById('qrCodeModal');
  if (modal) modal.classList.remove('open');
}

function printQrTagSticker() {
  const printContent = document.getElementById('printableQrTag');
  if (!printContent) return;

  const printWindow = window.open('', '_blank', 'width=600,height=400');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print QR Asset Label</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; display: flex; justify-content: center; align-items: center; min-height: 90vh; }
          .printable-qr-tag { border: 2px dashed #0f172a; border-radius: 12px; padding: 20px; width: 440px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; }
        </style>
      </head>
      <body>
        <div class="printable-qr-tag">
          ${printContent.innerHTML}
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        <\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function openQrScannerModal() {
  const modal = document.getElementById('qrScannerModal');
  if (modal) modal.classList.add('open');

  const resultCard = document.getElementById('scannedResultCard');
  if (resultCard) resultCard.classList.add('hidden');
  const manualInput = document.getElementById('manualTagInput');
  if (manualInput) manualInput.value = '';

  if (typeof Html5Qrcode !== 'undefined') {
    try {
      State.qrScanner = new Html5Qrcode('qr-reader');
      State.qrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => onScanSuccess(decodedText),
        (errorMessage) => { /* ignore per-frame failures */ }
      ).catch(err => {
        console.warn('Camera stream unavailable:', err);
        const reader = document.getElementById('qr-reader');
        if (reader) {
          reader.innerHTML = `
            <div style="padding:30px 16px;color:#94a3b8;font-size:0.85rem;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:36px;height:36px;margin:0 auto 10px;display:block;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Camera video stream unavailable or permission denied.<br>
              Use the manual asset tag entry below.
            </div>
          `;
        }
      });
    } catch (e) {
      console.warn('Html5Qrcode init error:', e);
    }
  } else {
    const reader = document.getElementById('qr-reader');
    if (reader) {
      reader.innerHTML = `<div style="padding:30px 16px;color:#94a3b8;font-size:0.85rem;">Scanner ready. Enter apparatus tag below.</div>`;
    }
  }
}

function closeQrScannerModal() {
  if (State.qrScanner) {
    State.qrScanner.stop()
      .then(() => State.qrScanner.clear())
      .catch(e => console.log('Scanner stop err:', e))
      .finally(() => { State.qrScanner = null; });
  }
  const modal = document.getElementById('qrScannerModal');
  if (modal) modal.classList.remove('open');
}

function onScanSuccess(decodedText) {
  if (!decodedText) return;
  const cleaned = decodedText.trim();
  const matched = State.items.find(i =>
    i.item_code.toLowerCase() === cleaned.toLowerCase() ||
    cleaned.toLowerCase().includes(i.item_code.toLowerCase())
  );

  if (matched) {
    State.lastScannedItem = matched;
    const card = document.getElementById('scannedResultCard');
    const tag  = document.getElementById('detectedCodeTag');
    const title= document.getElementById('detectedItemTitle');
    const loc  = document.getElementById('detectedItemLoc');

    if (tag)   tag.textContent = matched.item_code;
    if (title) title.textContent = `${matched.item_name} (${matched.model_no || 'Standard'})`;
    if (loc)   loc.innerHTML = `Location: <strong>${escHtml(matched.location)}</strong> &bull; Available: <strong>${matched.available_quantity} ${escHtml(matched.unit)}</strong>`;
    if (card)  card.classList.remove('hidden');

    showToast('success', 'Apparatus Detected', `${matched.item_name} [${matched.item_code}]`);
  } else {
    showToast('warning', 'Unrecognized Tag', `Scanned code "${cleaned}" is not in database.`);
  }
}

function handleManualTagLookup() {
  const val = document.getElementById('manualTagInput')?.value.trim();
  if (!val) {
    showToast('error', 'Tag Required', 'Please enter an equipment tag code.');
    return;
  }
  onScanSuccess(val);
}

function scannedAction(action) {
  if (!State.lastScannedItem) return;
  const item = State.lastScannedItem;
  closeQrScannerModal();

  if (action === 'issue') {
    openIssueModal(item.id);
  } else if (action === 'return') {
    // Check if there is an active loan for this item
    const activeLoan = State.loans.find(l => l.item_id === item.id && (l.status === 'Active' || l.status === 'Overdue'));
    if (activeLoan) {
      openReturnModal(activeLoan.id);
    } else {
      showToast('info', 'No Active Loan', `No outstanding circulation loan found for ${item.item_name}.`);
    }
  } else if (action === 'specs') {
    openViewModal(item.id);
  }
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3: STUDENT ONLINE RESERVATIONS & BOOKINGS
   ════════════════════════════════════════════════════════════════ */

async function loadReservations() {
  const tbody = document.getElementById('reservationsTableBody');
  if (tbody) tbody.innerHTML = `<tr class="loading-row"><td colspan="9">Loading laboratory reservations…</td></tr>`;

  try {
    const res = await fetch('reservations_api.php?action=list');
    const data = await res.json();
    if (data.success) {
      State.reservations = data.reservations || [];
    } else {
      State.reservations = FALLBACK_RESERVATIONS;
    }
  } catch (err) {
    console.warn('Using fallback reservations:', err);
    State.reservations = FALLBACK_RESERVATIONS;
  }

  filterReservations();
}

function renderReservationsTable(list) {
  const tbody = document.getElementById('reservationsTableBody');
  if (!tbody) return;

  const totalEl    = document.getElementById('resKpiTotal');
  const pendingEl  = document.getElementById('resKpiPending');
  const approvedEl = document.getElementById('resKpiApproved');
  const issuedEl   = document.getElementById('resKpiIssued');
  const sbBadge    = document.getElementById('sidebarResCount');

  const pendingCount  = State.reservations.filter(r => r.status === 'Pending').length;
  const approvedCount = State.reservations.filter(r => r.status === 'Approved').length;
  const issuedCount   = State.reservations.filter(r => r.status === 'Issued').length;

  if (totalEl)    totalEl.textContent    = State.reservations.length;
  if (pendingEl)  pendingEl.textContent  = pendingCount;
  if (approvedEl) approvedEl.textContent = approvedCount;
  if (issuedEl)   issuedEl.textContent   = issuedCount;
  if (sbBadge)    sbBadge.textContent    = pendingCount;

  if (!list || !list.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:#94a3b8;">No matching laboratory reservations found.</td></tr>`;
    return;
  }

  const role = State.currentUser ? (State.currentUser.role || 'Administrator').toLowerCase() : 'administrator';
  const isStudent = role.includes('student');

  tbody.innerHTML = list.map(r => {
    let statusBg = '#dbeafe';
    let statusColor = '#1d4ed8';

    if (r.status === 'Approved') {
      statusBg = '#dcfce7'; statusColor = '#15803d';
    } else if (r.status === 'Issued') {
      statusBg = '#f1f5f9'; statusColor = '#475569';
    } else if (r.status === 'Rejected' || r.status === 'Cancelled') {
      statusBg = '#fee2e2'; statusColor = '#dc2626';
    } else if (r.status === 'Pending') {
      statusBg = '#fef3c7'; statusColor = '#d97706';
    }

    let actionButtons = '';
    if (r.status === 'Pending') {
      if (!isStudent) {
        actionButtons = `
          <button class="btn btn-issue btn-sm" onclick="updateReservationStatus(${r.id}, 'Approved')">Approve</button>
          <button class="btn btn-outline btn-sm" onclick="updateReservationStatus(${r.id}, 'Rejected')" style="color:#dc2626;">Reject</button>
        `;
      } else {
        actionButtons = `<button class="btn btn-outline btn-sm" onclick="updateReservationStatus(${r.id}, 'Cancelled')">Cancel</button>`;
      }
    } else if (r.status === 'Approved') {
      if (!isStudent) {
        actionButtons = `<button class="btn btn-primary btn-sm" onclick="convertReservationToLoan(${r.id})">Issue Apparatus</button>`;
      } else {
        actionButtons = `<span style="font-size:0.75rem;color:#15803d;font-weight:700;">Ready for Pickup</span>`;
      }
    } else if (r.status === 'Issued') {
      actionButtons = `<span style="font-size:0.75rem;color:#64748b;font-weight:600;">Active Loan #LN-${r.loan_id || r.id}</span>`;
    } else {
      actionButtons = `<span style="font-size:0.75rem;color:#94a3b8;">Closed</span>`;
    }

    return `
      <tr>
        <td><span class="badge" style="background:#f1f5f9;color:#334155;font-family:monospace;">#RES-00${r.id}</span></td>
        <td class="td-bold">
          ${escHtml(r.item_name || 'Laboratory Apparatus')}
          <div style="font-size:0.7rem;color:#64748b;font-family:monospace;">${escHtml(r.item_code || '')}</div>
        </td>
        <td>
          <div style="font-weight:700;color:#0f172a;">${escHtml(r.student_name)}</div>
          <div style="font-size:0.72rem;color:#64748b;font-family:monospace;">${escHtml(r.student_id)}</div>
        </td>
        <td><span style="font-size:0.78rem;color:#475569;">${escHtml(r.department || 'Engineering')}</span></td>
        <td>
          <div style="font-size:0.8rem;font-weight:600;color:#0f172a;">${r.reservation_date}</div>
          <div style="font-size:0.72rem;color:#64748b;">${escHtml(r.time_slot)}</div>
        </td>
        <td><strong>${r.quantity}</strong></td>
        <td><span style="font-size:0.75rem;color:#475569;">${escHtml(r.purpose || 'Lab Practical')}</span></td>
        <td><span class="badge" style="background:${statusBg};color:${statusColor};">${r.status}</span></td>
        <td><div style="display:flex;gap:6px;align-items:center;">${actionButtons}</div></td>
      </tr>
    `;
  }).join('');
}

function filterReservations() {
  const query = (document.getElementById('resSearchInput')?.value || '').toLowerCase().trim();
  const filter = State.activeResFilter || 'All';

  let list = State.reservations;
  if (filter !== 'All') {
    list = list.filter(r => r.status.toLowerCase() === filter.toLowerCase());
  }
  if (query) {
    list = list.filter(r =>
      (r.student_name && r.student_name.toLowerCase().includes(query)) ||
      (r.student_id && r.student_id.toLowerCase().includes(query)) ||
      (r.item_name && r.item_name.toLowerCase().includes(query)) ||
      (r.item_code && r.item_code.toLowerCase().includes(query)) ||
      (r.purpose && r.purpose.toLowerCase().includes(query))
    );
  }
  State.filteredReservations = list;
  renderReservationsTable(list);
}

function setResFilter(btn) {
  if (!btn) return;
  document.querySelectorAll('#resStatusChips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  State.activeResFilter = btn.getAttribute('data-res-status') || 'All';
  filterReservations();
}

function openNewReservationModal() {
  const select = document.getElementById('resItemSelect');
  if (select) {
    select.innerHTML = '<option value="">— Select Apparatus / Equipment —</option>';
    const availableItems = State.items.filter(i => i.available_quantity > 0);
    availableItems.forEach(it => {
      select.innerHTML += `<option value="${it.id}">${it.item_name} (${it.item_code}) — Avail: ${it.available_quantity} ${it.unit}</option>`;
    });
  }

  // Pre-fill student credentials if signed in as student
  if (State.currentUser && State.currentUser.role === 'Student') {
    const sName = document.getElementById('resStudentName');
    const sId   = document.getElementById('resStudentId');
    const sDept = document.getElementById('resStudentDept');
    const sMail = document.getElementById('resStudentEmail');
    if (sName) sName.value = State.currentUser.full_name || '';
    if (sId)   sId.value   = State.currentUser.student_id || 'STU-2024-042';
    if (sDept) sDept.value = State.currentUser.department || 'Electronics & Comm.';
    if (sMail) sMail.value = State.currentUser.email || '';
  }

  // Set default reservation date to tomorrow
  const dateInput = document.getElementById('resDate');
  if (dateInput) {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    dateInput.value = tmrw.toISOString().split('T')[0];
  }

  const modal = document.getElementById('newReservationModal');
  if (modal) modal.classList.add('open');
}

function closeNewReservationModal() {
  const modal = document.getElementById('newReservationModal');
  if (modal) modal.classList.remove('open');
}

function onResItemChange() {
  const select = document.getElementById('resItemSelect');
  const hint   = document.getElementById('resAvailHint');
  const qtyIn  = document.getElementById('resQty');
  if (!select || !hint) return;

  const itemId = parseInt(select.value, 10);
  const item   = State.items.find(i => i.id === itemId);
  if (item) {
    hint.textContent = `Current Stock: ${item.available_quantity} ${item.unit} available in ${item.location}`;
    if (qtyIn) qtyIn.max = item.available_quantity;
  } else {
    hint.textContent = '';
  }
}

async function submitNewReservation(e) {
  e.preventDefault();

  const itemId   = parseInt(document.getElementById('resItemSelect').value, 10);
  const sName    = document.getElementById('resStudentName').value.trim();
  const sId      = document.getElementById('resStudentId').value.trim();
  const sDept    = document.getElementById('resStudentDept').value.trim();
  const sEmail   = document.getElementById('resStudentEmail').value.trim();
  const rDate    = document.getElementById('resDate').value;
  const timeSlot = document.getElementById('resTimeSlot').value;
  const qty      = parseInt(document.getElementById('resQty').value, 10) || 1;
  const purpose  = document.getElementById('resPurpose').value.trim();

  const btn = document.getElementById('resSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  try {
    const res = await fetch('reservations_api.php?action=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        student_name: sName,
        student_id: sId,
        department: sDept,
        email: sEmail,
        reservation_date: rDate,
        time_slot: timeSlot,
        quantity: qty,
        purpose: purpose
      })
    });
    const data = await res.json();
    if (data.success) {
      closeNewReservationModal();
      showToast('success', 'Reservation Booked!', data.message || 'Your lab slot has been requested.');
      await loadReservations();
      await loadStatistics();
    } else {
      showToast('error', 'Booking Failed', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Reservation'; }
  }
}

async function updateReservationStatus(resId, status) {
  try {
    const res = await fetch('reservations_api.php?action=update_status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: resId, status })
    });
    const data = await res.json();
    if (data.success) {
      showToast('success', `Reservation ${status}`, data.message);
      await loadReservations();
      await loadStatistics();
    } else {
      showToast('error', 'Update Failed', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  }
}

async function convertReservationToLoan(resId) {
  try {
    const res = await fetch('reservations_api.php?action=convert_to_loan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: resId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('success', 'Apparatus Issued!', data.message || 'Reservation converted into active loan.');
      await loadReservations();
      await loadLoans();
      await loadInventory();
      await loadStatistics();
    } else {
      showToast('error', 'Issue Failed', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  }
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3: MULTI-LABORATORY INTER-ROOM TRANSFERS
   ════════════════════════════════════════════════════════════════ */

async function loadTransfers() {
  const tbody = document.getElementById('transfersTableBody');
  if (tbody) tbody.innerHTML = `<tr class="loading-row"><td colspan="9">Loading laboratory transfers…</td></tr>`;

  try {
    const res = await fetch('transfers_api.php?action=list');
    const data = await res.json();
    if (data.success) {
      State.transfers = data.transfers || [];
    } else {
      State.transfers = FALLBACK_TRANSFERS;
    }
  } catch (err) {
    console.warn('Using fallback transfers:', err);
    State.transfers = FALLBACK_TRANSFERS;
  }

  filterTransfers();
}

function renderTransfersTable(list) {
  const tbody = document.getElementById('transfersTableBody');
  if (!tbody) return;

  const totalEl   = document.getElementById('trfKpiTotal');
  const pendingEl = document.getElementById('trfKpiPending');
  const transitEl = document.getElementById('trfKpiDispatched');
  const rcvedEl   = document.getElementById('trfKpiReceived');
  const sbBadge   = document.getElementById('sidebarTrfCount');

  const pendingCount   = State.transfers.filter(t => t.status === 'Pending').length;
  const transitCount   = State.transfers.filter(t => t.status === 'Dispatched').length;
  const receivedCount  = State.transfers.filter(t => t.status === 'Received').length;

  if (totalEl)   totalEl.textContent   = State.transfers.length;
  if (pendingEl) pendingEl.textContent = pendingCount;
  if (transitEl) transitEl.textContent = transitCount;
  if (rcvedEl)   rcvedEl.textContent   = receivedCount;
  if (sbBadge)   sbBadge.textContent   = pendingCount + transitCount;

  if (!list || !list.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:#94a3b8;">No inter-laboratory transfers recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(t => {
    let statusBg = '#fef3c7'; let statusColor = '#d97706';
    if (t.status === 'Dispatched') {
      statusBg = '#e0f2fe'; statusColor = '#0284c7';
    } else if (t.status === 'Received') {
      statusBg = '#dcfce7'; statusColor = '#059669';
    } else if (t.status === 'Cancelled') {
      statusBg = '#fee2e2'; statusColor = '#dc2626';
    }

    let actionBtn = '';
    if (t.status === 'Pending') {
      actionBtn = `<button class="btn btn-issue btn-sm staff-only" onclick="dispatchTransfer(${t.id})">Dispatch</button>`;
    } else if (t.status === 'Dispatched') {
      actionBtn = `<button class="btn btn-primary btn-sm staff-only" onclick="receiveTransfer(${t.id})">Receive & Verify</button>`;
    } else if (t.status === 'Received') {
      actionBtn = `<span style="font-size:0.75rem;color:#059669;font-weight:700;">✓ In Safe Custody</span>`;
    } else {
      actionBtn = `<span style="font-size:0.75rem;color:#94a3b8;">Cancelled</span>`;
    }

    return `
      <tr>
        <td><span class="badge" style="background:#f1f5f9;color:#334155;font-family:monospace;">${escHtml(t.transfer_no)}</span></td>
        <td class="td-bold">
          ${escHtml(t.item_name || 'Apparatus')}
          <div style="font-size:0.7rem;color:#64748b;font-family:monospace;">${escHtml(t.item_code || '')}</div>
        </td>
        <td><span style="font-size:0.78rem;color:#64748b;">📍 ${escHtml(t.from_location)}</span></td>
        <td><span style="font-size:0.8rem;font-weight:700;color:#0f172a;">📍 ${escHtml(t.to_location)}</span></td>
        <td><strong>${t.quantity}</strong></td>
        <td><span style="font-size:0.78rem;color:#334155;">${escHtml(t.requested_by)}</span></td>
        <td><span style="font-size:0.78rem;color:#64748b;">${t.transfer_date}</span></td>
        <td><span class="badge" style="background:${statusBg};color:${statusColor};">${t.status}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

function filterTransfers() {
  const query  = (document.getElementById('trfSearchInput')?.value || '').toLowerCase().trim();
  const filter = State.activeTrfFilter || 'All';

  let list = State.transfers;
  if (filter !== 'All') {
    list = list.filter(t => t.status.toLowerCase() === filter.toLowerCase());
  }
  if (query) {
    list = list.filter(t =>
      (t.item_name && t.item_name.toLowerCase().includes(query)) ||
      (t.transfer_no && t.transfer_no.toLowerCase().includes(query)) ||
      (t.from_location && t.from_location.toLowerCase().includes(query)) ||
      (t.to_location && t.to_location.toLowerCase().includes(query)) ||
      (t.requested_by && t.requested_by.toLowerCase().includes(query))
    );
  }
  State.filteredTransfers = list;
  renderTransfersTable(list);
}

function setTrfFilter(btn) {
  if (!btn) return;
  document.querySelectorAll('#trfStatusChips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  State.activeTrfFilter = btn.getAttribute('data-trf-status') || 'All';
  filterTransfers();
}

function openNewTransferModal() {
  const select = document.getElementById('trfItemSelect');
  if (select) {
    select.innerHTML = '<option value="">— Select Equipment Item —</option>';
    State.items.forEach(it => {
      select.innerHTML += `<option value="${it.id}">${it.item_name} (${it.item_code}) — Located at ${it.location}</option>`;
    });
  }

  const dateInput = document.getElementById('trfDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  const modal = document.getElementById('newTransferModal');
  if (modal) modal.classList.add('open');
}

function closeNewTransferModal() {
  const modal = document.getElementById('newTransferModal');
  if (modal) modal.classList.remove('open');
}

function onTrfItemChange() {
  const select = document.getElementById('trfItemSelect');
  const fromIn = document.getElementById('trfFromLocation');
  const qtyIn  = document.getElementById('trfQty');
  if (!select || !fromIn) return;

  const itemId = parseInt(select.value, 10);
  const item   = State.items.find(i => i.id === itemId);
  if (item) {
    fromIn.value = item.location || 'Main Lab';
    if (qtyIn) qtyIn.max = item.available_quantity || item.total_quantity;
  } else {
    fromIn.value = '';
  }
}

async function submitNewTransfer(e) {
  e.preventDefault();

  const itemId      = parseInt(document.getElementById('trfItemSelect').value, 10);
  const toLocation  = document.getElementById('trfToLocation').value.trim();
  const qty         = parseInt(document.getElementById('trfQty').value, 10) || 1;
  const trfDate     = document.getElementById('trfDate').value;
  const requestedBy = document.getElementById('trfRequestedBy').value.trim();
  const notes       = document.getElementById('trfNotes').value.trim();

  const btn = document.getElementById('trfSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Dispatching…'; }

  try {
    const res = await fetch('transfers_api.php?action=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        to_location: toLocation,
        quantity: qty,
        transfer_date: trfDate,
        requested_by: requestedBy,
        notes: notes
      })
    });
    const data = await res.json();
    if (data.success) {
      closeNewTransferModal();
      showToast('success', 'Transfer Initiated', data.message);
      await loadTransfers();
      await loadStatistics();
    } else {
      showToast('error', 'Transfer Failed', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Dispatch Transfer'; }
  }
}

async function dispatchTransfer(transferId) {
  try {
    const res = await fetch('transfers_api.php?action=dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transfer_id: transferId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('success', 'Dispatched', data.message);
      await loadTransfers();
      await loadStatistics();
    } else {
      showToast('error', 'Dispatch Error', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  }
}

async function receiveTransfer(transferId) {
  try {
    const res = await fetch('transfers_api.php?action=receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transfer_id: transferId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('success', 'Custody Accepted', data.message || 'Transfer confirmed & inventory location updated.');
      await loadTransfers();
      await loadInventory();
      await loadStatistics();
    } else {
      showToast('error', 'Sign-off Failed', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  }
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3: VENDORS, PROCUREMENT & WARRANTY TRACKING
   ════════════════════════════════════════════════════════════════ */

async function loadVendors() {
  const tbody = document.getElementById('vendorsTableBody');
  if (tbody) tbody.innerHTML = `<tr class="loading-row"><td colspan="8">Loading vendor directory…</td></tr>`;

  try {
    const res = await fetch('vendors_api.php?action=list');
    const data = await res.json();
    if (data.success) {
      State.vendors = data.vendors || [];

      // Update KPI valuations and warranties
      const valEl  = document.getElementById('vendorKpiValuation');
      const totEl  = document.getElementById('vendorKpiTotal');
      const wrnEl  = document.getElementById('vendorKpiWarrantyAlerts');

      if (valEl)  valEl.textContent = `₹ ${parseFloat(data.total_valuation || 0).toLocaleString('en-IN')}`;
      if (totEl)  totEl.textContent = data.total_vendors || State.vendors.length;
      if (wrnEl)  wrnEl.textContent = data.warranty_expiring_count || 0;

      // Render Warranty Alerts Table if any items are expiring
      renderWarrantyAlerts(data.expiring_warranties || []);
    } else {
      State.vendors = FALLBACK_VENDORS;
    }
  } catch (err) {
    console.warn('Using fallback vendors:', err);
    State.vendors = FALLBACK_VENDORS;
  }

  filterVendors();
}

function renderWarrantyAlerts(items) {
  const alertCard = document.getElementById('warrantyAlertCard');
  const tbody = document.getElementById('warrantyAlertTableBody');
  if (!alertCard || !tbody) return;

  if (!items || !items.length) {
    alertCard.style.display = 'none';
    return;
  }

  alertCard.style.display = 'block';
  tbody.innerHTML = items.map(it => `
    <tr>
      <td class="td-bold">${escHtml(it.item_name)} (${escHtml(it.item_code)})</td>
      <td>${escHtml(it.vendor_name || 'Standard Vendor')}</td>
      <td>${it.purchase_date || 'N/A'}</td>
      <td><span style="color:#b45309;font-weight:700;">${it.warranty_expiry}</span></td>
      <td><span class="badge" style="background:#fef3c7;color:#b45309;">${it.days_remaining !== undefined ? `${it.days_remaining} Days Left` : 'Expiring Soon'}</span></td>
    </tr>
  `).join('');
}

function renderVendorsTable(list) {
  const tbody = document.getElementById('vendorsTableBody');
  if (!tbody) return;

  if (!list || !list.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8;">No vendor records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(v => `
    <tr>
      <td class="td-bold">
        ${escHtml(v.vendor_name)}
        ${v.address ? `<div style="font-size:0.7rem;color:#64748b;font-weight:400;">${escHtml(v.address)}</div>` : ''}
      </td>
      <td>${escHtml(v.contact_person || '—')}</td>
      <td><span style="font-family:monospace;font-size:0.8rem;">${escHtml(v.phone || '—')}</span></td>
      <td><span style="font-size:0.8rem;color:#0369a1;">${escHtml(v.email || '—')}</span></td>
      <td><span style="font-size:0.75rem;color:#475569;">${escHtml(v.categories_supplied || 'Lab Instruments')}</span></td>
      <td><span style="color:#d97706;font-weight:700;font-size:0.82rem;">★ ${v.rating || '4.8'}</span></td>
      <td><strong>${v.supplied_items_count || 0}</strong> items</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon-action admin-only" onclick="openVendorModal(${v.id})" title="Edit vendor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon-action danger admin-only" onclick="deleteVendor(${v.id})" title="Delete vendor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterVendors() {
  const query = (document.getElementById('vendorSearchInput')?.value || '').toLowerCase().trim();
  let list = State.vendors;
  if (query) {
    list = list.filter(v =>
      (v.vendor_name && v.vendor_name.toLowerCase().includes(query)) ||
      (v.contact_person && v.contact_person.toLowerCase().includes(query)) ||
      (v.email && v.email.toLowerCase().includes(query)) ||
      (v.categories_supplied && v.categories_supplied.toLowerCase().includes(query))
    );
  }
  State.filteredVendors = list;
  renderVendorsTable(list);
}

function openVendorModal(vendorId) {
  const form = document.getElementById('vendorForm');
  if (form) form.reset();

  const titleEl = document.getElementById('vendorModalTitle');
  const idEl    = document.getElementById('vendorFormId');

  if (vendorId) {
    const v = State.vendors.find(item => item.id === vendorId);
    if (v) {
      if (titleEl) titleEl.textContent = 'Edit Supplier / Vendor';
      if (idEl)    idEl.value          = v.id;
      document.getElementById('vName').value       = v.vendor_name || '';
      document.getElementById('vContact').value    = v.contact_person || '';
      document.getElementById('vEmail').value      = v.email || '';
      document.getElementById('vPhone').value      = v.phone || '';
      document.getElementById('vAddress').value    = v.address || '';
      document.getElementById('vCategories').value = v.categories_supplied || '';
      document.getElementById('vRating').value     = v.rating || 4.8;
    }
  } else {
    if (titleEl) titleEl.textContent = 'Add Equipment Supplier / Vendor';
    if (idEl)    idEl.value          = '';
  }

  const modal = document.getElementById('vendorModal');
  if (modal) modal.classList.add('open');
}

function closeVendorModal() {
  const modal = document.getElementById('vendorModal');
  if (modal) modal.classList.remove('open');
}

async function submitVendorForm(e) {
  e.preventDefault();

  const vendorId   = document.getElementById('vendorFormId').value;
  const name       = document.getElementById('vName').value.trim();
  const contact    = document.getElementById('vContact').value.trim();
  const email      = document.getElementById('vEmail').value.trim();
  const phone      = document.getElementById('vPhone').value.trim();
  const address    = document.getElementById('vAddress').value.trim();
  const categories = document.getElementById('vCategories').value.trim();
  const rating     = parseFloat(document.getElementById('vRating').value) || 4.8;

  const btn = document.getElementById('vSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  const action = vendorId ? 'update' : 'create';
  const payload = {
    id: vendorId ? parseInt(vendorId, 10) : undefined,
    vendor_name: name,
    contact_person: contact,
    email: email,
    phone: phone,
    address: address,
    categories_supplied: categories,
    rating: rating
  };

  try {
    const res = await fetch(`vendors_api.php?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      closeVendorModal();
      showToast('success', 'Vendor Saved', data.message);
      await loadVendors();
    } else {
      showToast('error', 'Vendor Error', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Supplier'; }
  }
}

async function deleteVendor(vendorId) {
  if (!confirm('Are you sure you want to remove this vendor from the directory?')) return;

  try {
    const res = await fetch('vendors_api.php?action=delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: vendorId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('success', 'Vendor Removed', data.message);
      await loadVendors();
    } else {
      showToast('error', 'Delete Failed', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  }
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3: SECURITY & ACTIVITY AUDIT TRAIL
   ════════════════════════════════════════════════════════════════ */

async function loadAuditLogs() {
  const tbody = document.getElementById('auditTableBody');
  if (tbody) tbody.innerHTML = `<tr class="loading-row"><td colspan="6">Loading activity audit trail…</td></tr>`;

  try {
    const res = await fetch('audit_api.php?action=list');
    const data = await res.json();
    if (data.success) {
      State.auditLogs = data.logs || [];
    } else {
      State.auditLogs = FALLBACK_AUDIT;
    }
  } catch (err) {
    console.warn('Using fallback audit logs:', err);
    State.auditLogs = FALLBACK_AUDIT;
  }

  filterAuditLogs();
}

function renderAuditTable(list) {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;

  if (!list || !list.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">No activity log records matched your query.</td></tr>`;
    return;
  }

  const actionColorMap = {
    ITEM_CREATED:         { bg: '#dcfce7', clr: '#15803d', label: 'Item Created' },
    ITEM_UPDATED:         { bg: '#dbeafe', clr: '#1d4ed8', label: 'Item Updated' },
    ITEM_DELETED:         { bg: '#fee2e2', clr: '#dc2626', label: 'Item Deleted' },
    ITEM_RESTOCK:         { bg: '#fef3c7', clr: '#b45309', label: 'Restocked' },
    ITEM_ISSUED:          { bg: '#fef3c7', clr: '#b45309', label: 'Loan Issued' },
    ITEM_RETURNED:        { bg: '#dcfce7', clr: '#15803d', label: 'Loan Returned' },
    MAINTENANCE_CREATED:  { bg: '#ffedd5', clr: '#c2410c', label: 'Maint. Scheduled' },
    MAINTENANCE_COMPLETED:{ bg: '#dcfce7', clr: '#15803d', label: 'Maint. Certified' },
    TRANSFER_REQUEST:     { bg: '#ede9fe', clr: '#6d28d9', label: 'Transfer Dispatched' },
    TRANSFER_RECEIVED:    { bg: '#dcfce7', clr: '#15803d', label: 'Transfer Received' },
    RESERVATION_CREATED:  { bg: '#e0f2fe', clr: '#0369a1', label: 'Reservation Booked' },
    RESERVATION_ISSUED:   { bg: '#dcfce7', clr: '#15803d', label: 'Reservation Loaned' },
    LOGIN:                { bg: '#f1f5f9', clr: '#475569', label: 'User Login' }
  };

  tbody.innerHTML = list.map(l => {
    const meta = actionColorMap[l.action] || { bg: '#f1f5f9', clr: '#334155', label: l.action };
    return `
      <tr>
        <td><span class="badge" style="background:#f1f5f9;color:#334155;font-family:monospace;">#LOG-00${l.id}</span></td>
        <td><span style="font-size:0.75rem;color:#64748b;">${l.created_at}</span></td>
        <td>
          <div style="font-weight:700;color:#0f172a;font-size:0.82rem;">${escHtml(l.user_name || 'System')}</div>
          <div style="font-size:0.7rem;color:#64748b;">${escHtml(l.user_role || 'Staff')}</div>
        </td>
        <td><span class="badge" style="background:${meta.bg};color:${meta.clr};">${meta.label}</span></td>
        <td class="td-bold">${escHtml(l.item_name || '—')}</td>
        <td><span style="font-size:0.78rem;color:#334155;">${escHtml(l.details || '—')}</span></td>
      </tr>
    `;
  }).join('');
}

function filterAuditLogs() {
  const query = (document.getElementById('auditSearchInput')?.value || '').toLowerCase().trim();
  const actionFilter = document.getElementById('auditActionFilter')?.value || 'All';

  let list = State.auditLogs;
  if (actionFilter !== 'All') {
    list = list.filter(l => l.action === actionFilter);
  }
  if (query) {
    list = list.filter(l =>
      (l.user_name && l.user_name.toLowerCase().includes(query)) ||
      (l.item_name && l.item_name.toLowerCase().includes(query)) ||
      (l.details && l.details.toLowerCase().includes(query)) ||
      (l.action && l.action.toLowerCase().includes(query))
    );
  }
  State.filteredAuditLogs = list;
  renderAuditTable(list);
}

function exportAuditLogCSV() {
  const list = State.filteredAuditLogs.length ? State.filteredAuditLogs : State.auditLogs;
  if (!list.length) {
    showToast('info', 'No Logs', 'There are no audit logs to export.');
    return;
  }

  const headers = ['Log ID', 'Timestamp', 'User', 'Role', 'Action', 'Item Name', 'Details', 'IP Address'];
  const rows = list.map(l => [
    l.id,
    `"${l.created_at}"`,
    `"${l.user_name || 'System'}"`,
    `"${l.user_role || 'Staff'}"`,
    `"${l.action}"`,
    `"${(l.item_name || '').replace(/"/g, '""')}"`,
    `"${(l.details || '').replace(/"/g, '""')}"`,
    `"${l.ip_address || ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `lab_security_audit_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('success', 'Audit Exported', 'Downloaded audit log spreadsheet.');
}

async function clearAuditTrail() {
  if (!confirm('CAUTION: Are you sure you want to permanently clear the audit log? This operation cannot be undone.')) return;

  try {
    const res = await fetch('audit_api.php?action=clear', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('info', 'Audit Cleared', data.message);
      await loadAuditLogs();
    } else {
      showToast('error', 'Operation Failed', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', err.message);
  }
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3: AUTOMATED OVERDUE NOTICES & REMINDERS
   ════════════════════════════════════════════════════════════════ */

function openOverdueNoticeModal() {
  const overdueLoans = State.loans.filter(l => l.status === 'Overdue');
  const listContainer = document.getElementById('overdueBorrowersList');
  if (listContainer) {
    if (!overdueLoans.length) {
      listContainer.innerHTML = '<div style="color:#059669;font-weight:600;">✓ Excellent! There are currently no overdue equipment loans.</div>';
    } else {
      listContainer.innerHTML = overdueLoans.map(l => `
        <div style="padding:6px 0;border-bottom:1px solid #fecaca;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong>${escHtml(l.borrower_name)}</strong> (${escHtml(l.borrower_id)}) &bull; ${escHtml(l.item_name)}
            <div style="font-size:0.72rem;color:#b91c1c;">Due: ${l.due_date} (${l.days_overdue || 'Exceeded'} days overdue)</div>
          </div>
          <span class="badge" style="background:#fee2e2;color:#dc2626;font-size:0.7rem;">Overdue</span>
        </div>
      `).join('');
    }
  }

  const modal = document.getElementById('overdueNoticeModal');
  if (modal) modal.classList.add('open');
}

function closeOverdueNoticeModal() {
  const modal = document.getElementById('overdueNoticeModal');
  if (modal) modal.classList.remove('open');
}

function copyOverdueNotice() {
  const text = document.getElementById('overdueMessageText')?.value || '';
  navigator.clipboard.writeText(text).then(() => {
    showToast('success', 'Notice Copied', 'Reminder notice template copied to clipboard.');
  }).catch(() => {
    showToast('info', 'Notice Ready', 'Please select and copy the text manually.');
  });
}

function simulateSendOverdueNotices() {
  const overdueLoans = State.loans.filter(l => l.status === 'Overdue');
  if (!overdueLoans.length) {
    showToast('info', 'No Overdue Loans', 'No students currently require overdue notices.');
    closeOverdueNoticeModal();
    return;
  }

  showToast('success', 'Reminders Dispatched', `Automated notices sent to ${overdueLoans.length} borrower(s) via campus email/SMS.`);
  closeOverdueNoticeModal();
}

/* ════════════════════════════════════════════════════════════════
   SETTINGS & PREFERENCES MANAGEMENT
   ════════════════════════════════════════════════════════════════ */

const DEFAULT_SETTINGS = {
  orgName:           'Central Engineering College',
  deptName:          'Department of Electronics & Communication',
  labName:           'Central Hardware & Research Lab',
  roomNo:            'Room 201 - Science Block',
  inchargeName:      'Prof. H. R. Sharma',
  inchargeEmail:     'lab-incharge@univ.edu',
  loanDays:          14,
  maxItems:          2,
  minStock:          3,
  noticeDays:        2,
  allowWeekend:      true,
  autoOverdueBanner: true,
  currency:          '₹',
  dateFormat:        'YYYY-MM-DD',
  pageSize:          25,
  theme:             'forest',
  scanBeep:          true,
  showQuickStats:    true,
};

function initSettings() {
  try {
    const raw = localStorage.getItem('lab_inventory_settings_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      State.settings = Object.assign({}, DEFAULT_SETTINGS, parsed);
    } else {
      State.settings = Object.assign({}, DEFAULT_SETTINGS);
    }
  } catch (err) {
    console.warn('Failed to parse settings from storage:', err);
    State.settings = Object.assign({}, DEFAULT_SETTINGS);
  }
  applyThemeSetting(State.settings.theme || 'forest');
}

function populateSettingsForm() {
  initSettings();
  const s = State.settings;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined ? val : '';
  };
  const setChecked = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(val);
  };

  setVal('settingOrgName', s.orgName);
  setVal('settingDeptName', s.deptName);
  setVal('settingLabName', s.labName);
  setVal('settingRoomNo', s.roomNo);
  setVal('settingInchargeName', s.inchargeName);
  setVal('settingInchargeEmail', s.inchargeEmail);

  setVal('settingLoanDays', s.loanDays);
  setVal('settingMaxItems', s.maxItems);
  setVal('settingMinStock', s.minStock);
  setVal('settingNoticeDays', s.noticeDays);

  setChecked('settingAllowWeekend', s.allowWeekend);
  setChecked('settingAutoOverdueBanner', s.autoOverdueBanner);

  setVal('settingCurrency', s.currency);
  setVal('settingDateFormat', s.dateFormat);
  setVal('settingPageSize', s.pageSize);
  setVal('settingTheme', s.theme);

  setChecked('settingScanBeep', s.scanBeep);
  setChecked('settingShowQuickStats', s.showQuickStats);

  const roleEl = document.getElementById('settingActiveRoleText');
  if (roleEl && State.currentUser) {
    roleEl.textContent = `${State.currentUser.name} (${State.currentUser.role})`;
  }
}

function saveSettingsForm(event) {
  if (event) event.preventDefault();
  const getVal = (id, def = '') => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : def;
  };
  const getNum = (id, def = 1) => {
    const el = document.getElementById(id);
    const n = parseInt(el?.value, 10);
    return isNaN(n) ? def : n;
  };
  const getChecked = (id) => {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  };

  const newSettings = {
    orgName:           getVal('settingOrgName', DEFAULT_SETTINGS.orgName),
    deptName:          getVal('settingDeptName', DEFAULT_SETTINGS.deptName),
    labName:           getVal('settingLabName', DEFAULT_SETTINGS.labName),
    roomNo:            getVal('settingRoomNo', DEFAULT_SETTINGS.roomNo),
    inchargeName:      getVal('settingInchargeName', DEFAULT_SETTINGS.inchargeName),
    inchargeEmail:     getVal('settingInchargeEmail', DEFAULT_SETTINGS.inchargeEmail),
    loanDays:          getNum('settingLoanDays', 14),
    maxItems:          getNum('settingMaxItems', 2),
    minStock:          getNum('settingMinStock', 3),
    noticeDays:        getNum('settingNoticeDays', 2),
    allowWeekend:      getChecked('settingAllowWeekend'),
    autoOverdueBanner: getChecked('settingAutoOverdueBanner'),
    currency:          getVal('settingCurrency', '₹'),
    dateFormat:        getVal('settingDateFormat', 'YYYY-MM-DD'),
    pageSize:          getNum('settingPageSize', 25),
    theme:             getVal('settingTheme', 'forest'),
    scanBeep:          getChecked('settingScanBeep'),
    showQuickStats:    getChecked('settingShowQuickStats'),
  };

  State.settings = newSettings;
  try {
    localStorage.setItem('lab_inventory_settings_v3', JSON.stringify(newSettings));
  } catch (e) {
    console.error('Could not save settings to localStorage:', e);
  }

  applyThemeSetting(newSettings.theme);
  showToast('success', 'Settings Saved', 'System preferences and laboratory settings updated successfully!');
}

function resetSettingsToDefault() {
  State.settings = Object.assign({}, DEFAULT_SETTINGS);
  try {
    localStorage.removeItem('lab_inventory_settings_v3');
  } catch (e) {}
  populateSettingsForm();
  applyThemeSetting('forest');
  showToast('info', 'Settings Reset', 'Settings have been restored to default configuration.');
}

function applyThemeSetting(theme) {
  document.body.classList.remove('theme-navy', 'theme-emerald');
  if (theme === 'navy') {
    document.body.classList.add('theme-navy');
  } else if (theme === 'emerald') {
    document.body.classList.add('theme-emerald');
  }
}

function exportFullSystemJSON() {
  const payload = {
    exportDate: new Date().toISOString(),
    system: 'Lab Inventory Management System v3.1',
    settings: State.settings || DEFAULT_SETTINGS,
    summary: {
      totalItems: State.items.length,
      totalLoans: State.loans.length,
      totalReservations: State.reservations.length,
      totalTransfers: State.transfers.length,
      totalVendors: State.vendors.length,
      totalAuditLogs: State.auditLogs.length
    },
    items: State.items,
    loans: State.loans,
    reservations: State.reservations,
    transfers: State.transfers,
    vendors: State.vendors,
    auditLogs: State.auditLogs
  };

  const str = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', str);
  link.setAttribute('download', `lab_inventory_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('success', 'Backup Exported', 'Full JSON database export downloaded successfully.');
}


