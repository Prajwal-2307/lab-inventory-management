<?php
/**
 * update_item.php
 * Updates an existing equipment record in MySQL.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit;
}

require_once 'db.php';

// ── Read Input ────────────────────────────────────────────────────────────────
$raw = file_get_contents('php://input');
$input = (!empty($raw)) ? (json_decode($raw, true) ?? []) : $_POST;

$id = isset($input['id']) ? (int)$input['id'] : 0;
if ($id <= 0) {
    send_json(false, 'Invalid item ID.');
}

// ── Fetch existing item ───────────────────────────────────────────────────────
$stmt_cur = $conn->prepare('SELECT * FROM inventory_items WHERE id = ? LIMIT 1');
$stmt_cur->bind_param('i', $id);
$stmt_cur->execute();
$current = $stmt_cur->get_result()->fetch_assoc();
$stmt_cur->close();

if (!$current) {
    send_json(false, 'Equipment record not found.');
}

// ── Extract & Validate ────────────────────────────────────────────────────────
$item_name      = isset($input['item_name'])      ? sanitize($input['item_name'])      : $current['item_name'];
$item_code      = isset($input['item_code'])      ? sanitize($input['item_code'])      : $current['item_code'];
$model_no       = isset($input['model_no'])       ? sanitize($input['model_no'])       : $current['model_no'];
$category       = isset($input['category'])       ? sanitize($input['category'])       : $current['category'];
$location       = isset($input['location'])       ? sanitize($input['location'])       : $current['location'];
$unit           = isset($input['unit'])           ? sanitize($input['unit'])           : $current['unit'];
$item_condition = isset($input['item_condition']) ? sanitize($input['item_condition']) : $current['item_condition'];
$total_qty      = isset($input['total_quantity']) ? (int)$input['total_quantity']      : (int)$current['total_quantity'];
$min_threshold  = isset($input['min_threshold'])  ? (int)$input['min_threshold']       : (int)$current['min_threshold'];

if ($item_name === '') {
    send_json(false, 'Item name cannot be empty.');
}

$issued_qty = (int)$current['issued_quantity'];
if ($total_qty < $issued_qty) {
    send_json(false, "Total quantity ({$total_qty}) cannot be less than currently issued quantity ({$issued_qty}).");
}

$available_qty = $total_qty - $issued_qty;
if ($available_qty <= 0) {
    $status = 'Out of Stock';
} elseif ($available_qty <= $min_threshold) {
    $status = 'Low Stock';
} else {
    $status = 'Available';
}

$sql = "UPDATE inventory_items
        SET item_name = ?, item_code = ?, model_no = ?, category = ?,
            location = ?, unit = ?, total_quantity = ?, available_quantity = ?,
            status = ?, item_condition = ?, min_threshold = ?
        WHERE id = ?";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    send_json(false, 'Database error: ' . $conn->error);
}

$stmt->bind_param('ssssssiissii',
    $item_name,
    $item_code,
    $model_no,
    $category,
    $location,
    $unit,
    $total_qty,
    $available_qty,
    $status,
    $item_condition,
    $min_threshold,
    $id
);

if ($stmt->execute()) {
    $stmt->close();
    $conn->close();
    send_json(true, "Equipment '{$item_name}' updated successfully!", [
        'id'            => $id,
        'item_name'     => $item_name,
        'item_code'     => $item_code,
        'available_qty' => $available_qty,
        'status'        => $status,
        'item_condition'=> $item_condition
    ]);
} else {
    $err = $stmt->error;
    $stmt->close();
    $conn->close();
    send_json(false, 'Failed to update record: ' . $err);
}
?>
