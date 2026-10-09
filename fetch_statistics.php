<?php
/**
 * fetch_statistics.php
 * Returns comprehensive dashboard summary statistics and chart datasets as JSON.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

// Auto-sync overdue loans
$conn->query("UPDATE issued_log SET status = 'Overdue' WHERE status = 'Active' AND due_date < CURDATE()");

// ── Query 1: Inventory Aggregate Stats ────────────────────────────────────────
$sql_stats = "
    SELECT
        COUNT(*)                                                           AS total_items,
        COALESCE(SUM(total_quantity), 0)                                   AS total_units,
        COALESCE(SUM(available_quantity), 0)                               AS available_items,
        COALESCE(SUM(issued_quantity), 0)                                  AS issued_items,
        SUM(CASE WHEN status = 'Low Stock'     THEN 1 ELSE 0 END)          AS low_stock,
        SUM(CASE WHEN status = 'Out of Stock'  THEN 1 ELSE 0 END)          AS out_of_stock,
        SUM(CASE WHEN item_condition IN ('Needs Maintenance', 'Under Repair') THEN 1 ELSE 0 END) AS under_maintenance
    FROM inventory_items
";
$result_stats = $conn->query($sql_stats);

if (!$result_stats) {
    send_json(false, 'Failed to fetch statistics: ' . $conn->error);
}

$stats = $result_stats->fetch_assoc();

// ── Query 2: Loans & Circulation Stats ────────────────────────────────────────
$loan_stats = $conn->query("
    SELECT
        COUNT(*)                                            AS total_loans,
        SUM(CASE WHEN status = 'Active'  THEN 1 ELSE 0 END) AS active_loans,
        SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) AS overdue_loans,
        SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) AS returned_loans
    FROM issued_log
")->fetch_assoc();

// ── Query 3: Maintenance Stats ────────────────────────────────────────────────
$maint_stats = $conn->query("
    SELECT
        COUNT(*)                                                AS total_maint,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS maint_in_progress,
        COALESCE(SUM(cost), 0)                                  AS total_maint_cost
    FROM maintenance_log
")->fetch_assoc();

// ── Query 4: Items per Category ───────────────────────────────────────────────
$sql_cat = "
    SELECT category,
           COUNT(*)                AS item_count,
           SUM(total_quantity)     AS total_qty,
           SUM(available_quantity) AS avail_qty,
           SUM(issued_quantity)    AS issued_qty
    FROM inventory_items
    GROUP BY category
    ORDER BY total_qty DESC
";
$result_cat = $conn->query($sql_cat);

$categories = [];
while ($row = $result_cat->fetch_assoc()) {
    $categories[] = $row;
}

// ── Query 5: Low Stock Items ──────────────────────────────────────────────────
$sql_low = "
    SELECT id, item_code, item_name, category, location, available_quantity, total_quantity, min_threshold, status
    FROM inventory_items
    WHERE available_quantity <= min_threshold OR status IN ('Low Stock', 'Out of Stock')
    ORDER BY available_quantity ASC
    LIMIT 6
";
$result_low = $conn->query($sql_low);

$low_stock_items = [];
while ($row = $result_low->fetch_assoc()) {
    $low_stock_items[] = $row;
}

// ── Query 6: Overdue Loans for Urgent Notification ────────────────────────────
$sql_overdue = "
    SELECT l.id, l.item_id, l.borrower_name, l.borrower_id, l.issued_qty,
           DATE_FORMAT(l.due_date, '%d %b %Y') AS due_date,
           DATEDIFF(CURDATE(), l.due_date)     AS days_overdue,
           i.item_name
    FROM issued_log l
    JOIN inventory_items i ON l.item_id = i.id
    WHERE l.status = 'Overdue'
    ORDER BY days_overdue DESC
    LIMIT 5
";
$result_overdue = $conn->query($sql_overdue);

$overdue_items = [];
while ($row = $result_overdue->fetch_assoc()) {
    $overdue_items[] = $row;
}

// ── Query 7: Top Circulated / Utilized Equipment ──────────────────────────────
$sql_top = "
    SELECT i.id, i.item_name, i.item_code, i.category,
           COUNT(l.id) AS borrow_count,
           COALESCE(SUM(l.issued_qty), 0) AS total_borrowed_qty
    FROM inventory_items i
    JOIN issued_log l ON i.id = l.item_id
    GROUP BY i.id
    ORDER BY borrow_count DESC
    LIMIT 5
";
$result_top = $conn->query($sql_top);
$top_equipment = [];
while ($row = $result_top->fetch_assoc()) {
    $top_equipment[] = $row;
}

$conn->close();

echo json_encode([
    'success'           => true,
    'total_items'       => (int)($stats['total_items']       ?? 0),
    'total_units'       => (int)($stats['total_units']       ?? 0),
    'available_items'   => (int)($stats['available_items']   ?? 0),
    'issued_items'      => (int)($stats['issued_items']      ?? 0),
    'low_stock'         => (int)($stats['low_stock']         ?? 0),
    'out_of_stock'      => (int)($stats['out_of_stock']      ?? 0),
    'under_maintenance' => (int)($stats['under_maintenance'] ?? 0),
    'active_loans'      => (int)($loan_stats['active_loans']   ?? 0),
    'overdue_loans'     => (int)($loan_stats['overdue_loans']  ?? 0),
    'returned_loans'    => (int)($loan_stats['returned_loans'] ?? 0),
    'maint_in_progress' => (int)($maint_stats['maint_in_progress'] ?? 0),
    'categories'        => $categories,
    'low_stock_items'   => $low_stock_items,
    'overdue_items'     => $overdue_items,
    'top_equipment'     => $top_equipment,
]);
?>
