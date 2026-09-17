<?php
/**
 * add_item.php
 * Inserts a new inventory item into MySQL
 * Accepts POST (JSON body or form data)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    send_json(false, 'Method not allowed. Use POST.');
    // send_json exits, but require_once not called yet – echo directly:
    exit;
}

require_once 'db.php';

// ── Read Input (supports both JSON body and form-data) ────────────────────────
$input = [];

$raw = file_get_contents('php://input');
if (!empty($raw)) {
    $input = json_decode($raw, true) ?? [];
}

// Fall back to $_POST if no JSON body
if (empty($input)) {
    $input = $_POST;
}

// ── Extract & Validate Fields ─────────────────────────────────────────────────
$item_name  = sanitize($input['item_name']  ?? '');
$category   = sanitize($input['category']   ?? '');
$total_qty  = isset($input['total_quantity']) ? (int)$input['total_quantity'] : -1;

$errors = [];

if ($item_name === '') {
    $errors[] = 'Item name is required.';
} elseif (strlen($item_name) > 150) {
    $errors[] = 'Item name must be 150 characters or fewer.';
}

$allowed_categories = ['Electronics', 'Glassware', 'Chemicals', 'Tools', 'Other'];
if ($category === '') {
    $errors[] = 'Category is required.';
} elseif (!in_array($category, $allowed_categories, true)) {
    $errors[] = 'Invalid category selected.';
}

if ($total_qty < 0) {
    $errors[] = 'Total quantity is required.';
} elseif ($total_qty === 0) {
    $errors[] = 'Total quantity must be at least 1.';
} elseif ($total_qty > 9999) {
    $errors[] = 'Total quantity cannot exceed 9999.';
}

if (!empty($errors)) {
    send_json(false, implode(' ', $errors));
}

// ── Determine Status ──────────────────────────────────────────────────────────
// New items have 0 issued; status is computed by DB trigger, but we calculate here too
$issued_qty    = 0;
$available_qty = $total_qty;

if ($available_qty <= 0) {
    $status = 'Out of Stock';
} elseif ($available_qty <= 3) {
    $status = 'Low Stock';
} else {
    $status = 'Available';
}

// ── Check for Duplicate Item Name ─────────────────────────────────────────────
$stmt_check = $conn->prepare(
    'SELECT id FROM inventory_items WHERE item_name = ? LIMIT 1'
);
$stmt_check->bind_param('s', $item_name);
$stmt_check->execute();
$stmt_check->store_result();

if ($stmt_check->num_rows > 0) {
    $stmt_check->close();
    send_json(false, 'An item with this name already exists in the inventory.');
}
$stmt_check->close();

// ── Insert New Item ───────────────────────────────────────────────────────────
$sql = "INSERT INTO inventory_items
          (item_name, category, total_quantity, issued_quantity, available_quantity, status)
        VALUES (?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    send_json(false, 'Database error: ' . $conn->error);
}

$stmt->bind_param('ssiiss',
    $item_name,
    $category,
    $total_qty,
    $issued_qty,
    $available_qty,
    $status
);

if ($stmt->execute()) {
    $new_id = $conn->insert_id;
    $stmt->close();
    $conn->close();

    send_json(true, "Item '$item_name' added successfully!", [
        'item_id'       => $new_id,
        'item_name'     => $item_name,
        'category'      => $category,
        'total_qty'     => $total_qty,
        'available_qty' => $available_qty,
        'status'        => $status,
    ]);
} else {
    $err = $stmt->error;
    $stmt->close();
    $conn->close();
    send_json(false, 'Failed to add item: ' . $err);
}
?>
