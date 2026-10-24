<?php
/**
 * fetch_items.php
 * Returns inventory items as JSON with search & filtering by category, status, and condition.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

// ── Read & Sanitize GET Params ────────────────────────────────────────────────
$search    = isset($_GET['search'])    ? sanitize($_GET['search'])    : '';
$category  = isset($_GET['category'])  ? sanitize($_GET['category'])  : 'all';
$status    = isset($_GET['status'])    ? sanitize($_GET['status'])    : 'all';
$condition = isset($_GET['condition']) ? sanitize($_GET['condition']) : 'all';
$limit     = isset($_GET['limit'])     ? max(1, (int)$_GET['limit'])  : 200;
$offset    = isset($_GET['offset'])    ? max(0, (int)$_GET['offset']) : 0;

// ── Build Dynamic Query with Prepared Statements ──────────────────────────────
$conditions = [];
$params     = [];
$types      = '';

if ($search !== '') {
    $conditions[] = '(item_name LIKE ? OR item_code LIKE ? OR model_no LIKE ? OR location LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $types   .= 'ssss';
}

if ($category !== '' && strtolower($category) !== 'all') {
    $conditions[] = 'category = ?';
    $params[]     = $category;
    $types       .= 's';
}

if ($status !== '' && strtolower($status) !== 'all') {
    $conditions[] = 'status = ?';
    $params[]     = $status;
    $types       .= 's';
}

if ($condition !== '' && strtolower($condition) !== 'all') {
    $conditions[] = 'item_condition = ?';
    $params[]     = $condition;
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
$sql = "SELECT id, item_code, item_name, model_no, category, location, unit,
               total_quantity, issued_quantity, available_quantity,
               status, item_condition, min_threshold, purchase_price, purchase_date, warranty_expiry, vendor_name,
               DATE_FORMAT(created_at, '%d %b %Y') AS created_date
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
    $row['id']                 = (int)$row['id'];
    $row['total_quantity']     = (int)$row['total_quantity'];
    $row['issued_quantity']    = (int)$row['issued_quantity'];
    $row['available_quantity'] = (int)$row['available_quantity'];
    $row['min_threshold']      = (int)$row['min_threshold'];
    $row['purchase_price']     = (float)($row['purchase_price'] ?? 0);
    $row['purchase_date']      = $row['purchase_date'] ?? null;
    $row['warranty_expiry']    = $row['warranty_expiry'] ?? null;
    $row['vendor_name']        = $row['vendor_name'] ?? 'General Supplier';
    $row['item_code']          = $row['item_code'] ?? ('EQ-' . str_pad($row['id'], 3, '0', STR_PAD_LEFT));
    $row['model_no']           = $row['model_no'] ?? 'N/A';
    $row['unit']               = $row['unit'] ?? 'Units';
    $row['location']           = $row['location'] ?? 'Main Lab';
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
