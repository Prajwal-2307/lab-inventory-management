<?php
/**
 * fetch_reports.php
 * Aggregates laboratory analytics, inventory status, loan history,
 * and maintenance records for the Reports module.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$report_type = isset($_GET['type'])     ? sanitize($_GET['type'])     : 'inventory';
$category    = isset($_GET['category']) ? sanitize($_GET['category']) : 'all';
$from_date   = isset($_GET['from'])     ? sanitize($_GET['from'])     : '';
$to_date     = isset($_GET['to'])       ? sanitize($_GET['to'])       : '';

// Sync overdue
$conn->query("UPDATE issued_log SET status = 'Overdue' WHERE status = 'Active' AND due_date < CURDATE()");

// ── 1. Overall High-Level Metrics ─────────────────────────────────────────────
$kpi_res = $conn->query("
    SELECT
      COUNT(*) AS total_items,
      COALESCE(SUM(total_quantity), 0)     AS total_units,
      COALESCE(SUM(available_quantity), 0) AS available_units,
      COALESCE(SUM(issued_quantity), 0)    AS issued_units,
      SUM(CASE WHEN status = 'Low Stock'    THEN 1 ELSE 0 END) AS low_stock_count,
      SUM(CASE WHEN status = 'Out of Stock' THEN 1 ELSE 0 END) AS out_of_stock_count,
      SUM(CASE WHEN item_condition IN ('Needs Maintenance', 'Under Repair') THEN 1 ELSE 0 END) AS maintenance_needed_count
    FROM inventory_items
")->fetch_assoc();

$loan_kpi = $conn->query("
    SELECT
      COUNT(*) AS total_loans,
      SUM(CASE WHEN status = 'Active'   THEN 1 ELSE 0 END) AS active_loans,
      SUM(CASE WHEN status = 'Overdue'  THEN 1 ELSE 0 END) AS overdue_loans,
      SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) AS returned_loans
    FROM issued_log
")->fetch_assoc();

$maint_kpi = $conn->query("
    SELECT
      COUNT(*) AS total_maintenance_events,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
      COALESCE(SUM(cost), 0) AS total_expense
    FROM maintenance_log
")->fetch_assoc();

// ── 2. Breakdown Charts Data ──────────────────────────────────────────────────
// Categories breakdown
$cat_rows = [];
$cat_q = $conn->query("
    SELECT category,
           COUNT(*) AS item_count,
           SUM(total_quantity)     AS total_qty,
           SUM(available_quantity) AS avail_qty,
           SUM(issued_quantity)    AS issued_qty
    FROM inventory_items
    GROUP BY category
    ORDER BY total_qty DESC
");
while ($r = $cat_q->fetch_assoc()) {
    $cat_rows[] = $r;
}

// Condition breakdown
$cond_rows = [];
$cond_q = $conn->query("
    SELECT item_condition, COUNT(*) AS count
    FROM inventory_items
    GROUP BY item_condition
");
while ($r = $cond_q->fetch_assoc()) {
    $cond_rows[] = $r;
}

// Equipment usage ranking (top borrowed equipment)
$usage_rows = [];
$usage_q = $conn->query("
    SELECT i.id, i.item_code, i.item_name, i.category, i.location,
           COUNT(l.id) AS times_borrowed,
           COALESCE(SUM(l.issued_qty), 0) AS total_units_borrowed,
           i.available_quantity, i.issued_quantity
    FROM inventory_items i
    LEFT JOIN issued_log l ON i.id = l.item_id
    GROUP BY i.id
    ORDER BY times_borrowed DESC, total_units_borrowed DESC
    LIMIT 10
");
while ($r = $usage_q->fetch_assoc()) {
    $usage_rows[] = $r;
}

// ── 3. Dataset Specific to Selected Report Type ───────────────────────────────
$table_data = [];

if ($report_type === 'inventory') {
    $where = (strtolower($category) !== 'all') ? "WHERE category = '" . $conn->real_escape_string($category) . "'" : '';
    $q = $conn->query("
        SELECT id, item_code, item_name, model_no, category, location, unit,
               total_quantity, issued_quantity, available_quantity,
               status, item_condition, min_threshold,
               DATE_FORMAT(created_at, '%d %b %Y') AS created_date
        FROM inventory_items
        $where
        ORDER BY category ASC, item_name ASC
    ");
    while ($r = $q->fetch_assoc()) {
        $table_data[] = $r;
    }
} elseif ($report_type === 'loans') {
    $where_parts = [];
    if (strtolower($category) !== 'all') {
        $where_parts[] = "i.category = '" . $conn->real_escape_string($category) . "'";
    }
    if ($from_date !== '') {
        $where_parts[] = "l.issued_at >= '" . $conn->real_escape_string($from_date) . " 00:00:00'";
    }
    if ($to_date !== '') {
        $where_parts[] = "l.issued_at <= '" . $conn->real_escape_string($to_date) . " 23:59:59'";
    }
    $where = count($where_parts) ? 'WHERE ' . implode(' AND ', $where_parts) : '';

    $q = $conn->query("
        SELECT l.id, i.item_code, i.item_name, i.category,
               l.borrower_name, l.borrower_id, l.borrower_dept,
               l.issued_qty,
               DATE_FORMAT(l.issued_at, '%d %b %Y')    AS issued_date,
               DATE_FORMAT(l.due_date, '%d %b %Y')     AS due_date,
               DATE_FORMAT(l.returned_at, '%d %b %Y')  AS returned_date,
               l.status, l.return_condition, l.remarks
        FROM issued_log l
        JOIN inventory_items i ON l.item_id = i.id
        $where
        ORDER BY l.issued_at DESC
    ");
    while ($r = $q->fetch_assoc()) {
        $table_data[] = $r;
    }
} elseif ($report_type === 'low_stock') {
    $q = $conn->query("
        SELECT id, item_code, item_name, category, location, unit,
               total_quantity, issued_quantity, available_quantity,
               min_threshold, status, item_condition,
               (min_threshold - available_quantity) AS units_needed
        FROM inventory_items
        WHERE available_quantity <= min_threshold OR status IN ('Low Stock', 'Out of Stock')
        ORDER BY available_quantity ASC
    ");
    while ($r = $q->fetch_assoc()) {
        $table_data[] = $r;
    }
} elseif ($report_type === 'maintenance') {
    $q = $conn->query("
        SELECT m.id, i.item_code, i.item_name, i.category, i.location,
               m.maintenance_type, m.technician_name,
               DATE_FORMAT(m.start_date, '%d %b %Y')      AS start_date,
               DATE_FORMAT(m.completion_date, '%d %b %Y') AS completion_date,
               m.cost, m.status, m.notes
        FROM maintenance_log m
        JOIN inventory_items i ON m.item_id = i.id
        ORDER BY m.start_date DESC
    ");
    while ($r = $q->fetch_assoc()) {
        $table_data[] = $r;
    }
}

$conn->close();

echo json_encode([
    'success'     => true,
    'report_type' => $report_type,
    'generated_at'=> date('d M Y, h:i A'),
    'metrics'     => [
        'total_items'              => (int)$kpi_res['total_items'],
        'total_units'              => (int)$kpi_res['total_units'],
        'available_units'          => (int)$kpi_res['available_units'],
        'issued_units'             => (int)$kpi_res['issued_units'],
        'low_stock_count'          => (int)$kpi_res['low_stock_count'],
        'out_of_stock_count'       => (int)$kpi_res['out_of_stock_count'],
        'maintenance_needed_count' => (int)$kpi_res['maintenance_needed_count'],
        'total_loans'              => (int)$loan_kpi['total_loans'],
        'active_loans'             => (int)$loan_kpi['active_loans'],
        'overdue_loans'            => (int)$loan_kpi['overdue_loans'],
        'returned_loans'           => (int)$loan_kpi['returned_loans'],
        'maintenance_events'       => (int)$maint_kpi['total_maintenance_events'],
        'maintenance_in_progress'  => (int)$maint_kpi['in_progress_count'],
        'maintenance_expenses'     => (float)$maint_kpi['total_expense'],
    ],
    'categories'  => $cat_rows,
    'conditions'  => $cond_rows,
    'usage_rank'  => $usage_rows,
    'table_data'  => $table_data,
]);
?>
