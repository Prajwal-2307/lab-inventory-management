<?php
/**
 * fetch_statistics.php
 * Returns dashboard summary statistics as JSON
 * Called via AJAX from the frontend
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

// ── Query 1: Aggregate Stats ──────────────────────────────────────────────────
$sql_stats = "
    SELECT
        COUNT(*)                                            AS total_items,
        SUM(available_quantity)                            AS available_items,
        SUM(issued_quantity)                               AS issued_items,
        SUM(CASE WHEN status = 'Low Stock'     THEN 1 ELSE 0 END) AS low_stock,
        SUM(CASE WHEN status = 'Out of Stock'  THEN 1 ELSE 0 END) AS out_of_stock
    FROM inventory_items
";
$result_stats = $conn->query($sql_stats);

if (!$result_stats) {
    send_json(false, 'Failed to fetch statistics: ' . $conn->error);
}

$stats = $result_stats->fetch_assoc();

// ── Query 2: Items per Category ───────────────────────────────────────────────
$sql_cat = "
    SELECT category,
           COUNT(*)           AS item_count,
           SUM(total_quantity)     AS total_qty,
           SUM(available_quantity) AS avail_qty,
           SUM(issued_quantity)    AS issued_qty
    FROM inventory_items
    GROUP BY category
    ORDER BY item_count DESC
";
$result_cat = $conn->query($sql_cat);

if (!$result_cat) {
    send_json(false, 'Failed to fetch categories: ' . $conn->error);
}

$categories = [];
while ($row = $result_cat->fetch_assoc()) {
    $categories[] = $row;
}

// ── Query 3: Low Stock Items ──────────────────────────────────────────────────
$sql_low = "
    SELECT id, item_name, category, available_quantity, status
    FROM inventory_items
    WHERE status IN ('Low Stock', 'Out of Stock')
    ORDER BY available_quantity ASC
    LIMIT 5
";
$result_low = $conn->query($sql_low);

$low_stock_items = [];
while ($row = $result_low->fetch_assoc()) {
    $low_stock_items[] = $row;
}

// ── Response ──────────────────────────────────────────────────────────────────
echo json_encode([
    'success'         => true,
    'total_items'     => (int)($stats['total_items']     ?? 0),
    'available_items' => (int)($stats['available_items'] ?? 0),
    'issued_items'    => (int)($stats['issued_items']    ?? 0),
    'low_stock'       => (int)($stats['low_stock']       ?? 0),
    'out_of_stock'    => (int)($stats['out_of_stock']    ?? 0),
    'categories'      => $categories,
    'low_stock_items' => $low_stock_items,
]);

$conn->close();
?>
