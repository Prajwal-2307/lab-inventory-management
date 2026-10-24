<?php
/**
 * add_item.php
 * Inserts a new equipment/inventory item into MySQL with full laboratory details.
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
$input = [];
$raw = file_get_contents('php://input');
if (!empty($raw)) {
    $input = json_decode($raw, true) ?? [];
}
if (empty($input)) {
    $input = $_POST;
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ── Extract & Validate Fields ─────────────────────────────────────────────────
$item_name      = sanitize($input['item_name']      ?? '');
$item_code      = sanitize($input['item_code']      ?? '');
$model_no       = sanitize($input['model_no']       ?? '');
$category       = sanitize($input['category']       ?? '');
$location       = sanitize($input['location']       ?? 'Main Lab - Rack 1');
$unit           = sanitize($input['unit']           ?? 'Units');
$total_qty      = isset($input['total_quantity'])   ? (int)$input['total_quantity'] : -1;
$item_condition = sanitize($input['item_condition'] ?? 'Good');
$min_threshold  = isset($input['min_threshold'])    ? max(1, (int)$input['min_threshold']) : 3;
$purchase_price = isset($input['purchase_price'])   ? (float)$input['purchase_price'] : 0.00;
$purchase_date  = !empty($input['purchase_date'])   ? sanitize($input['purchase_date']) : null;
$warranty_expiry= !empty($input['warranty_expiry']) ? sanitize($input['warranty_expiry']) : null;
$vendor_name    = sanitize($input['vendor_name']    ?? '');

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

$allowed_conditions = ['New', 'Good', 'Fair', 'Needs Maintenance', 'Under Repair'];
if (!in_array($item_condition, $allowed_conditions, true)) {
    $item_condition = 'Good';
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

// Auto-generate item code if blank
if ($item_code === '') {
    $prefixMap = [
        'Electronics' => 'EQ-EL',
        'Glassware'   => 'GW-CH',
        'Chemicals'   => 'CH-RG',
        'Tools'       => 'TL-ME',
        'Other'       => 'ITM-GN'
    ];
    $prefix = $prefixMap[$category] ?? 'EQ-LAB';
    $item_code = $prefix . '-' . strtoupper(substr(uniqid(), -4));
}

// ── Check for Duplicate Item Code or Name ─────────────────────────────────────
$stmt_check = $conn->prepare(
    'SELECT id FROM inventory_items WHERE item_name = ? OR item_code = ? LIMIT 1'
);
$stmt_check->bind_param('ss', $item_name, $item_code);
$stmt_check->execute();
$stmt_check->store_result();

if ($stmt_check->num_rows > 0) {
    $stmt_check->close();
    send_json(false, 'An item with this name or code already exists in the inventory.');
}
$stmt_check->close();

// ── Determine Status ──────────────────────────────────────────────────────────
$issued_qty    = 0;
$available_qty = $total_qty;

if ($available_qty <= 0) {
    $status = 'Out of Stock';
} elseif ($available_qty <= $min_threshold) {
    $status = 'Low Stock';
} else {
    $status = 'Available';
}

// ── Insert New Item ───────────────────────────────────────────────────────────
$sql = "INSERT INTO inventory_items
          (item_code, item_name, model_no, category, location, unit,
           total_quantity, issued_quantity, available_quantity,
           status, item_condition, min_threshold, purchase_price, purchase_date, warranty_expiry, vendor_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    send_json(false, 'Database preparation error: ' . $conn->error);
}

$stmt->bind_param('ssssssiiissidsss',
    $item_code,
    $item_name,
    $model_no,
    $category,
    $location,
    $unit,
    $total_qty,
    $issued_qty,
    $available_qty,
    $status,
    $item_condition,
    $min_threshold,
    $purchase_price,
    $purchase_date,
    $warranty_expiry,
    $vendor_name
);

if ($stmt->execute()) {
    $new_id = $conn->insert_id;
    $stmt->close();

    $activeUser = $_SESSION['full_name'] ?? 'Lab In-Charge';
    $activeRole = $_SESSION['user_role'] ?? 'Administrator';
    log_audit($conn, $activeUser, $activeRole, 'ITEM_CREATED', $item_name, "Added new equipment asset [$item_code] with $total_qty units at $location");

    send_json(true, "Item '{$item_name}' added successfully!", [
        'item_id'       => $new_id,
        'item_code'     => $item_code,
        'item_name'     => $item_name,
        'category'      => $category,
        'location'      => $location,
        'unit'          => $unit,
        'total_qty'     => $total_qty,
        'available_qty' => $available_qty,
        'status'        => $status,
        'item_condition'=> $item_condition
    ]);
} else {
    $err = $stmt->error;
    $stmt->close();
    send_json(false, 'Failed to add item: ' . $err);
}
?>
