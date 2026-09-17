<?php
/**
 * fetch_items.php
 * Returns inventory items as JSON with optional search & category filtering
 *
 * GET Parameters:
 *   search   (string) – search by item name (partial match)
 *   category (string) – filter by category; 'all' or empty = no filter
 *   limit    (int)    – max rows to return (default 100)
 *   offset   (int)    – pagination offset (default 0)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

// ── Read & Sanitize GET Params ────────────────────────────────────────────────
$search   = isset($_GET['search'])   ? sanitize($_GET['search'])   : '';
$category = isset($_GET['category']) ? sanitize($_GET['category']) : 'all';
$limit    = isset($_GET['limit'])    ? max(1, (int)$_GET['limit']) : 100;
$offset   = isset($_GET['offset'])   ? max(0, (int)$_GET['offset']): 0;

// ── Build Dynamic Query with Prepared Statements ──────────────────────────────
$conditions = [];
$params     = [];
$types      = '';

if ($search !== '') {
    $conditions[] = 'item_name LIKE ?';
    $params[]     = '%' . $search . '%';
    $types       .= 's';
}

if ($category !== '' && strtolower($category) !== 'all') {
    $conditions[] = 'category = ?';
    $params[]     = $category;
    $types       .= 's';
}

$where = count($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

// Total count (for pagination metadata)
$sql_count = "SELECT COUNT(*) AS total FROM inventory_items $where";
$stmt_count = $conn->prepare($sql_count);
if ($types !== '') {
    $stmt_count->bind_param($types, ...$params);
}
$stmt_count->execute();
$total_count = (int)$stmt_count->get_result()->fetch_assoc()['total'];
$stmt_count->close();

// Actual data
$sql = "SELECT id, item_name, category,
               total_quantity, issued_quantity, available_quantity,
               status, DATE_FORMAT(created_at,'%d %b %Y') AS created_date
        FROM inventory_items
        $where
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?";

$params[]  = $limit;
$params[]  = $offset;
$types    .= 'ii';

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    send_json(false, 'Query preparation failed: ' . $conn->error);
}

$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$items = [];
while ($row = $result->fetch_assoc()) {
    // Cast numeric fields to int for clean JSON output
    $row['id']                 = (int)$row['id'];
    $row['total_quantity']     = (int)$row['total_quantity'];
    $row['issued_quantity']    = (int)$row['issued_quantity'];
    $row['available_quantity'] = (int)$row['available_quantity'];
    $items[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'total'   => $total_count,
    'count'   => count($items),
    'items'   => $items,
]);
?>
