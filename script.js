/**
 * script.js – Lab Inventory Management System
 * Handles: navigation, AJAX calls, Chart.js charts,
 *          add-item modal, issue-item, search/filter, toasts
 */

'use strict';

/* ════════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════════ */
const State = {
  items:          [],        // full item list from server
  filteredItems:  [],        // after search/filter
  stats:          {},        // dashboard statistics
  categories:     [],        // category breakdown
  currentSection: 'dashboard',
  isSidebarCollapsed: false,
  isMobile: false,
  activeFilter: 'all',
  charts: {
    category: null,
    stock: null,
    catDetail: null,
  }
};

/* ════════════════════════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════════════════════════ */

/**
 * Navigate to a named section and update sidebar highlight
 * @param {string} sectionId
 * @param {HTMLElement} navEl
 */
function navigate(sectionId, navEl) {
  // Deactivate all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  // Activate target
  const target = document.getElementById('section-' + sectionId);
  if (target) target.classList.add('active');

  // Sidebar highlight
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');

  // Update topbar title
  const titles = {
    dashboard:  'Dashboard',
    inventory:  'Inventory Management',
    categories: 'Categories',
    issue:      'Issue & Return',
    reports:    'Reports',
    settings:   'Settings',
  };
  const el = document.getElementById('pageTitle');
  if (el) el.textContent = titles[sectionId] || sectionId;

  State.currentSection = sectionId;

  // Lazy-load section data
  if (sectionId === 'inventory') {
    loadInventory();
  } else if (sectionId === 'categories') {
    renderCategories();
    renderCatDetailChart();
  }

  // Close sidebar on mobile after navigation
  if (State.isMobile) {
    closeMobileSidebar();
  }
}

/* ════════════════════════════════════════════════════════════════
   SIDEBAR TOGGLE
   ════════════════════════════════════════════════════════════════ */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('mainContent');

  if (State.isMobile) {
    // Mobile: slide in/out
    sidebar.classList.toggle('mobile-open');
    document.getElementById('mobileOverlay').classList.toggle('show');
  } else {
    // Desktop: collapse/expand
    State.isSidebarCollapsed = !State.isSidebarCollapsed;
    sidebar.classList.toggle('collapsed', State.isSidebarCollapsed);
    main.classList.toggle('sidebar-collapsed', State.isSidebarCollapsed);
  }
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('mobileOverlay').classList.remove('show');
}

// Detect mobile
function checkMobile() {
  State.isMobile = window.innerWidth <= 768;
}

/* ════════════════════════════════════════════════════════════════
   DATA LOADING – Fetch from PHP endpoints
   ════════════════════════════════════════════════════════════════ */

/**
 * Fetches dashboard stats from fetch_statistics.php
 * Updates stat cards and charts
 */
async function loadStatistics() {
  try {
    const res  = await fetch('fetch_statistics.php');
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    State.stats      = data;
    State.categories = data.categories || [];

    // Update stat cards
    animateCounter('statTotal',     data.total_items);
    animateCounter('statAvailable', data.available_items);
    animateCounter('statIssued',    data.issued_items);
    animateCounter('statLowStock',  data.low_stock);

    // Sidebar badge
    const badge = document.getElementById('sidebarItemCount');
    if (badge) badge.textContent = data.total_items;

    // Low stock alert strip
    const alert = document.getElementById('lowStockAlert');
    const msg   = document.getElementById('lowStockMsg');
    if (data.low_stock > 0) {
      alert.classList.remove('hidden');
      msg.textContent = data.low_stock + ' item' + (data.low_stock > 1 ? 's' : '');
    } else {
      alert.classList.add('hidden');
    }

    // Render Charts
    renderCategoryChart(data.categories);
    renderStockChart(data.available_items, data.issued_items);

  } catch (err) {
    console.error('loadStatistics error:', err);
    ['statTotal','statAvailable','statIssued','statLowStock'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'DB?';
    });
    showToast('error', 'Connection Error', 'Could not load stats. Is XAMPP running?');
  }
}

/**
 * Fetches inventory items from fetch_items.php
 * Applies current search & category filter
 */
async function loadInventory(search = '', category = 'all') {
  const params = new URLSearchParams({ search, category, limit: 100 });

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
    showTableError('inventoryTableBody', 10,
      'Could not load inventory. Ensure XAMPP MySQL is running.');
    showTableError('dashboardTableBody', 8,
      'Could not load data. Ensure XAMPP MySQL is running.');
    showToast('error', 'Connection Error', err.message);
  }
}

/* ════════════════════════════════════════════════════════════════
   TABLE RENDERING
   ════════════════════════════════════════════════════════════════ */

/** Renders the full inventory table */
function renderInventoryTable(items) {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `
      <tr><td colspan="10">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
               stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>No items found matching your search.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr id="inv-row-${item.id}">
      <td class="td-bold">#${String(item.id).padStart(3,'0')}</td>
      <td class="td-bold">${escHtml(item.item_name)}</td>
      <td>${buildCategoryPill(item.category)}</td>
      <td>${item.total_quantity}</td>
      <td>${item.issued_quantity}</td>
      <td><strong>${item.available_quantity}</strong></td>
      <td>${buildStockBar(item.available_quantity, item.total_quantity)}</td>
      <td>${buildStatusBadge(item.status)}</td>
      <td><span class="text-muted">${item.created_date}</span></td>
      <td>
        <button class="btn btn-issue btn-sm"
          id="issue-btn-${item.id}"
          onclick="issueItem(${item.id})"
          ${item.available_quantity <= 0 ? 'disabled' : ''}
          title="Issue one unit">
          Issue
        </button>
      </td>
    </tr>
  `).join('');
}

/** Renders the compact dashboard table (latest 6 items) */
function renderDashboardTable(items) {
  const tbody = document.getElementById('dashboardTableBody');
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8">No inventory data found.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td class="td-bold">#${String(item.id).padStart(3,'0')}</td>
      <td class="td-bold">${escHtml(item.item_name)}</td>
      <td>${buildCategoryPill(item.category)}</td>
      <td>${item.total_quantity}</td>
      <td>${item.issued_quantity}</td>
      <td><strong>${item.available_quantity}</strong></td>
      <td>${buildStatusBadge(item.status)}</td>
      <td>
        <button class="btn btn-issue btn-sm"
          id="dash-issue-btn-${item.id}"
          onclick="issueItem(${item.id})"
          ${item.available_quantity <= 0 ? 'disabled' : ''}
          title="Issue one unit">
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
   SEARCH & FILTER
   ════════════════════════════════════════════════════════════════ */

/** Called on search input change */
function filterInventory() {
  const search   = document.getElementById('searchInput')?.value.trim() || '';
  const category = State.activeFilter;
  loadInventory(search, category);
}

/** Category chip click */
function setCatFilter(chipEl) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chipEl.classList.add('active');
  State.activeFilter = chipEl.dataset.cat;
  filterInventory();
}

/* ════════════════════════════════════════════════════════════════
   ADD ITEM – MODAL
   ════════════════════════════════════════════════════════════════ */

function openAddModal() {
  const modal = document.getElementById('addModal');
  modal.classList.add('open');
  // Clear previous state
  document.getElementById('addItemForm').reset();
  clearFormErrors();
  document.getElementById('inputItemName').focus();
}

function closeAddModal() {
  document.getElementById('addModal').classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addModal').addEventListener('click', function(e) {
    if (e.target === this) closeAddModal();
  });
  // Overlay (mobile sidebar) click
  document.getElementById('mobileOverlay').addEventListener('click', closeMobileSidebar);

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAddModal();
  });
});

/** Validate & submit the add-item form */
async function submitAddItem(e) {
  e.preventDefault();
  clearFormErrors();

  const itemName = document.getElementById('inputItemName').value.trim();
  const category = document.getElementById('inputCategory').value;
  const qty      = parseInt(document.getElementById('inputQty').value, 10);

  let valid = true;

  if (!itemName) {
    showFieldError('inputItemName', 'errItemName', 'Item name is required.'); valid = false;
  }
  if (!category) {
    showFieldError('inputCategory', 'errCategory', 'Please select a category.'); valid = false;
  }
  if (!qty || qty < 1 || qty > 9999) {
    showFieldError('inputQty', 'errQty', 'Enter a quantity between 1 and 9999.'); valid = false;
  }

  if (!valid) return;

  // Show loading state
  const btn = document.getElementById('addSubmitBtn');
  const origHTML = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Adding…';
  btn.disabled = true;

  try {
    const res  = await fetch('add_item.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name: itemName, category, total_quantity: qty }),
    });
    const data = await res.json();

    if (data.success) {
      closeAddModal();
      showToast('success', 'Item Added!', data.message);
      // Refresh data
      await loadStatistics();
      await loadInventory(
        document.getElementById('searchInput')?.value || '',
        State.activeFilter
      );
    } else {
      showToast('error', 'Failed to Add', data.message);
    }
  } catch (err) {
    showToast('error', 'Network Error', 'Could not reach the server. Is XAMPP running?');
  } finally {
    btn.innerHTML = origHTML;
    btn.disabled  = false;
  }
}

/* ════════════════════════════════════════════════════════════════
   ISSUE ITEM
   ════════════════════════════════════════════════════════════════ */

/**
 * Issue one unit of an item
 * @param {number} itemId
 */
async function issueItem(itemId) {
  // Disable the button immediately to prevent double-clicks
  const btn     = document.getElementById('issue-btn-'     + itemId);
  const dashBtn = document.getElementById('dash-issue-btn-' + itemId);
  const allBtns = [btn, dashBtn].filter(Boolean);

  allBtns.forEach(b => { b.disabled = true; b.textContent = '…'; });

  try {
    const res  = await fetch('issue_item.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId }),
    });
    const data = await res.json();

    if (data.success) {
      showToast('success', 'Item Issued!', data.message);

      // Optimistically update the row in the inventory table
      updateRowAfterIssue(itemId, data);
      updateRowAfterIssue(itemId, data, true); // dashboard table

      // Refresh stats (counters + charts)
      await loadStatistics();

    } else {
      showToast('warning', 'Cannot Issue', data.message);
      allBtns.forEach(b => { b.disabled = false; b.textContent = 'Issue'; });
    }
  } catch (err) {
    showToast('error', 'Network Error', 'Server unreachable. Is XAMPP running?');
    allBtns.forEach(b => { b.disabled = false; b.textContent = 'Issue'; });
  }
}

/**
 * Updates a table row's quantities after a successful issue
 */
function updateRowAfterIssue(itemId, data, isDash = false) {
  const prefix = isDash ? 'dash-issue-btn-' : 'inv-row-';
  if (isDash) {
    // Re-render dashboard table from server instead (stats refresh handles it)
    return;
  }
  const row = document.getElementById('inv-row-' + itemId);
  if (!row) return;

  const cells = row.querySelectorAll('td');
  if (cells.length < 10) return;

  cells[4].textContent = data.new_issued_qty;
  cells[5].innerHTML   = `<strong>${data.new_available_qty}</strong>`;

  // Update stock bar
  const item = State.items.find(i => i.id === itemId);
  const total = item ? item.total_quantity : (data.new_issued_qty + data.new_available_qty);
  cells[6].innerHTML = buildStockBar(data.new_available_qty, total);

  // Update status badge
  cells[7].innerHTML = buildStatusBadge(data.new_status);

  // Update issue button
  const btn = document.getElementById('issue-btn-' + itemId);
  if (btn) {
    btn.disabled    = data.new_available_qty <= 0;
    btn.textContent = 'Issue';
  }

  // Update local state
  if (item) {
    item.issued_quantity    = data.new_issued_qty;
    item.available_quantity = data.new_available_qty;
    item.status             = data.new_status;
  }
}

/* ════════════════════════════════════════════════════════════════
   CATEGORIES SECTION
   ════════════════════════════════════════════════════════════════ */

const CAT_META = {
  Electronics: { icon: '🔌', cls: 'electronics' },
  Glassware:   { icon: '🧪', cls: 'glassware'   },
  Chemicals:   { icon: '⚗️', cls: 'chemicals'   },
  Tools:       { icon: '🔧', cls: 'tools'        },
  Other:       { icon: '🗂️', cls: 'tools'        },
};

function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid || !State.categories.length) return;

  grid.innerHTML = State.categories.map(cat => {
    const meta    = CAT_META[cat.category] || { icon: '📦', cls: 'tools' };
    const pct     = cat.total_qty > 0 ? Math.round((cat.avail_qty / cat.total_qty) * 100) : 0;
    return `
      <div class="cat-card ${meta.cls}"
           onclick="navigate('inventory', document.querySelector('[data-section=inventory]')); setCatFilter(document.querySelector('[data-cat=${cat.category}]'));">
        <div class="cat-icon">${meta.icon}</div>
        <div class="cat-name">${escHtml(cat.category)}</div>
        <div class="cat-count">
          <strong>${cat.item_count}</strong> item type${cat.item_count != 1 ? 's' : ''}
        </div>
        <div class="cat-items-qty">
          <div>Available <span>${cat.avail_qty}</span></div>
          <div>Issued <span>${cat.issued_qty}</span></div>
        </div>
      </div>`;
  }).join('');
}

/* ════════════════════════════════════════════════════════════════
   CHART.JS CHARTS
   ════════════════════════════════════════════════════════════════ */

const CHART_COLORS = {
  Electronics: '#0284c7',
  Glassware:   '#7c3aed',
  Chemicals:   '#dc2626',
  Tools:       '#c9a84c',
  Other:       '#64748b',
};

const CHART_DEFAULTS = {
  green:  '#208b3a',
  gold:   '#c9a84c',
  blue:   '#0284c7',
  red:    '#dc2626',
  border: '#e2e8f0',
};

function destroyChart(key) {
  if (State.charts[key]) {
    State.charts[key].destroy();
    State.charts[key] = null;
  }
}

/** Bar chart – items by category */
function renderCategoryChart(categories) {
  destroyChart('category');
  const canvas = document.getElementById('categoryChart');
  if (!canvas || !categories.length) return;

  const labels     = categories.map(c => c.category);
  const totals     = categories.map(c => parseInt(c.total_qty));
  const available  = categories.map(c => parseInt(c.avail_qty));
  const issued     = categories.map(c => parseInt(c.issued_qty));
  const bgColors   = categories.map(c => CHART_COLORS[c.category] || '#64748b');

  State.charts.category = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total',
          data: totals,
          backgroundColor: bgColors.map(c => c + '33'),
          borderColor: bgColors,
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Available',
          data: available,
          backgroundColor: bgColors.map(c => c + 'aa'),
          borderColor: bgColors,
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 }, color: '#334155' } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.border }, ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' } },
        y: { beginAtZero: true, grid: { color: CHART_DEFAULTS.border }, ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b', stepSize: 5 } },
      },
    },
  });
}

/** Doughnut chart – Available vs Issued */
function renderStockChart(available, issued) {
  destroyChart('stock');
  const canvas = document.getElementById('stockChart');
  if (!canvas) return;

  State.charts.stock = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Available', 'Issued'],
      datasets: [{
        data: [available, issued],
        backgroundColor: [CHART_DEFAULTS.green + 'cc', CHART_DEFAULTS.blue + 'cc'],
        borderColor:     [CHART_DEFAULTS.green, CHART_DEFAULTS.blue],
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Inter', size: 11 }, color: '#334155', padding: 14 },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} units`
          }
        }
      },
    },
  });
}

/** Horizontal bar chart for Categories section */
function renderCatDetailChart() {
  destroyChart('catDetail');
  const canvas = document.getElementById('catDetailChart');
  if (!canvas || !State.categories.length) return;

  const labels    = State.categories.map(c => c.category);
  const avail     = State.categories.map(c => parseInt(c.avail_qty));
  const issued    = State.categories.map(c => parseInt(c.issued_qty));
  const bgColors  = State.categories.map(c => CHART_COLORS[c.category] || '#64748b');

  State.charts.catDetail = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Available',
          data: avail,
          backgroundColor: bgColors.map(c => c + 'bb'),
          borderColor: bgColors,
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Issued',
          data: issued,
          backgroundColor: bgColors.map(() => '#94a3b8' + '88'),
          borderColor: '#94a3b8',
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 }, color: '#334155' } },
      },
      scales: {
        x: { stacked: false, beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { font: { family: 'Inter', size: 11 } } },
        y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 12, weight: '600' }, color: '#334155' } },
      },
    },
  });
}

/* ════════════════════════════════════════════════════════════════
   HELPERS – HTML BUILDERS
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
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ════════════════════════════════════════════════════════════════
   FORM VALIDATION HELPERS
   ════════════════════════════════════════════════════════════════ */

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
   TOAST NOTIFICATIONS
   ════════════════════════════════════════════════════════════════ */

const TOAST_ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

/**
 * Display a toast notification
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string} title
 * @param {string} message
 * @param {number} duration  ms before auto-remove (default 4000)
 */
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

/* ════════════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ════════════════════════════════════════════════════════════════ */

/**
 * Animate a numeric counter from 0 to target
 */
function animateCounter(elId, target, duration = 800) {
  const el = document.getElementById(elId);
  if (!el) return;

  const start = parseInt(el.textContent, 10) || 0;
  const diff  = target - start;
  const steps = 40;
  const step  = duration / steps;
  let  i      = 0;

  const tick = () => {
    i++;
    const val = Math.round(start + diff * (i / steps));
    el.textContent = val;
    if (i < steps) setTimeout(tick, step);
  };

  tick();
}

/* ════════════════════════════════════════════════════════════════
   NOTIFICATION BUTTON
   ════════════════════════════════════════════════════════════════ */

function showNotifications() {
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = 'none';
  showToast('info', 'Notifications', 'No new notifications at this time.');
}

/* ════════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  checkMobile();
  window.addEventListener('resize', checkMobile);

  // Load initial data
  await loadStatistics();
  await loadInventory();
});
