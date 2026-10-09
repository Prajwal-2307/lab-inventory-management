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
  items:              [],        // all equipment items from server
  filteredItems:      [],        // filtered item list
  stats:              {},        // dashboard & KPI statistics
  categories:         [],        // category breakdown data
  loans:              [],        // issue & return loan records
  maintenanceRecords: [],        // maintenance records
  currentReports:     null,      // active report dataset
  currentSection:     'dashboard',
  currentIssueTab:    'active',  // 'active' or 'history'
  isSidebarCollapsed: false,
  isMobile:           false,
  activeFilter:       'all',     // category filter
  activeConditionFilter: 'all',  // condition filter
  activeStatusFilter: 'all',     // status filter
  activeLoanFilter:   'all',     // loan status filter
  charts: {
    category:     null,
    stock:        null,
    catDetail:    null,
    reportChart1: null,
    reportChart2: null,
  }
};

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
    maintenance: 'Equipment Maintenance & Health',
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
  } else if (sectionId === 'maintenance') {
    loadMaintenance();
  } else if (sectionId === 'reports') {
    loadReports();
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

async function loadStatistics() {
  try {
    const res  = await fetch('fetch_statistics.php');
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

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

  } catch (err) {
    console.error('loadStatistics error:', err);
    showToast('error', 'Connection Error', 'Could not load statistics from database.');
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
    console.error('loadInventory error:', err);
    showTableError('inventoryTableBody', 11, 'Could not load equipment records. Ensure MySQL is running.');
    showTableError('dashboardTableBody', 10, 'Could not load records.');
    showToast('error', 'Connection Error', err.message);
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
          <button class="btn btn-issue btn-sm" onclick="openIssueModal(${item.id})"
                  ${item.available_quantity <= 0 ? 'disabled' : ''} title="Issue this item">
            Issue
          </button>
          <button class="btn-icon-action" onclick="openRestockModal(${item.id})" title="Restock / Add stock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="btn-icon-action" onclick="openEditModal(${item.id})" title="Edit details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon-action" onclick="openViewModal(${item.id})" title="View specifications sheet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-icon-action danger" onclick="openDeleteModal(${item.id})" title="Delete record">
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
  const minThreshold = parseInt(document.getElementById('inputMinThreshold').value, 10) || 3;

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
        min_threshold: minThreshold
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

  document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
}

async function submitEditItem(e) {
  e.preventDefault();

  const id           = parseInt(document.getElementById('editItemId').value, 10);
  const itemName     = document.getElementById('editItemName').value.trim();
  const itemCode     = document.getElementById('editItemCode').value.trim();
  const modelNo      = document.getElementById('editModelNo').value.trim();
  const category     = document.getElementById('editCategory').value;
  const location     = document.getElementById('editLocation').value.trim();
  const unit         = document.getElementById('editUnit').value.trim();
  const totalQty     = parseInt(document.getElementById('editTotalQty').value, 10);
  const condition    = document.getElementById('editCondition').value;
  const minThreshold = parseInt(document.getElementById('editMinThreshold').value, 10);

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
        min_threshold: minThreshold
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
    </div>

    <div style="margin-top:16px;">
      <h5 style="font-size:.85rem;color:#334155;margin-bottom:8px;">Quick Actions for this equipment:</h5>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-issue btn-sm" onclick="closeViewModal(); openIssueModal(${item.id});" ${item.available_quantity <= 0 ? 'disabled' : ''}>Issue Now</button>
        <button class="btn btn-gold btn-sm" onclick="closeViewModal(); openRestockModal(${item.id});">Add Stock</button>
        <button class="btn btn-outline btn-sm" onclick="closeViewModal(); openMaintModal(${item.id});">Schedule Maintenance</button>
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
    console.error('loadLoans error:', err);
    showTableError('activeLoansTableBody', 9, 'Could not load loan records.');
    showTableError('historyLoansTableBody', 10, 'Could not load loan records.');
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
  const search = document.getElementById('loanSearchInput')?.value.trim() || '';
  const status = State.activeLoanFilter;
  loadLoans(search, status);
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
    const res = await fetch('maintenance_api.php?status=' + status);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    State.maintenanceRecords = data.records || [];

    // Summary stats
    animateCounter('maintStatProgress',  data.in_progress);
    animateCounter('maintStatScheduled', data.scheduled);
    animateCounter('maintStatCompleted', data.completed);
    animateCounter('maintStatExpense',   Math.round(data.total_expense));

    const maintBadge = document.getElementById('sidebarMaintCount');
    if (maintBadge) maintBadge.textContent = data.in_progress;

    renderMaintenanceTable(State.maintenanceRecords);

  } catch (err) {
    console.error('loadMaintenance error:', err);
    showTableError('maintenanceTableBody', 11, 'Could not load maintenance logs.');
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
      <td>$${r.cost.toFixed(2)}</td>
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

  try {
    const res = await fetch(`fetch_reports.php?type=${encodeURIComponent(type)}&category=${encodeURIComponent(category)}`);
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
    showToast('error', 'Report Error', 'Could not load report datasets.');
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
        { num: `$${data.metrics.maintenance_expenses.toFixed(2)}`, lbl: 'Total Spend' },
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
        <th>Start Date</th><th>Completion Date</th><th>Cost</th><th>Status</th><th>Notes</th>
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
        <td><strong>$${parseFloat(r.cost).toFixed(2)}</strong></td>
        <td>${buildMaintStatusBadge(r.status)}</td>
        <td><span class="text-muted">${escHtml(r.notes || '–')}</span></td>
      </tr>
    `).join('');
  }
}

/** Render Visual Reports Charts */
function renderReportCharts(data) {
  // Chart 1: Categories
  destroyChart('reportChart1');
  const c1 = document.getElementById('reportChart1');
  if (c1 && data.categories) {
    const labels = data.categories.map(c => c.category);
    const totals = data.categories.map(c => parseInt(c.total_qty));
    const avail  = data.categories.map(c => parseInt(c.avail_qty));

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
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Chart 2: Conditions
  destroyChart('reportChart2');
  const c2 = document.getElementById('reportChart2');
  if (c2 && data.conditions) {
    const labels = data.conditions.map(c => c.item_condition);
    const counts = data.conditions.map(c => parseInt(c.count));
    const colors = {
      New: '#0f766e', Good: '#16a34a', Fair: '#0284c7', 'Needs Maintenance': '#d97706', 'Under Repair': '#dc2626'
    };

    State.charts.reportChart2 = new Chart(c2, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: counts,
          backgroundColor: labels.map(l => colors[l] || '#64748b'),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { position: 'bottom' } }
      }
    });
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
  if (!canvas || !categories.length) return;

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
  if (!canvas) return;

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
  if (!canvas || !State.categories.length) return;

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

  // Load initial data
  await loadStatistics();
  await loadInventory();
});
