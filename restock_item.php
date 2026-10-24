<?php
/**
 * restock_item.php
 * Adds inventory stock to an existing item (Restock / Replenishment)
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

$raw = file_get_contents('php://input');
$input = (!empty($raw)) ? (json_decode($raw, true) ?? []) : $_POST;

$item_id   = isset($input['item_id'])   ? (int)$input['item_id']   : 0;
$add_qty   = isset($input['add_qty'])   ? (int)$input['add_qty']   : 0;
$notes     = isset($input['notes'])     ? sanitize($input['notes']): '';

if ($item_id <= 0) {
    send_json(false, 'Invalid item ID.');
}

if ($add_qty <= 0 || $add_qty > 5000) {
    send_json(false, 'Please enter a valid restock quantity between 1 and 5000.');
}

// Fetch current item
$stmt = $conn->prepare('SELECT id, item_name, total_quantity, issued_quantity, min_threshold FROM inventory_items WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $item_id);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    $stmt->close();
    send_json(false, 'Item not found.');
}

$item = $res->fetch_assoc();
$stmt->close();

$new_total     = (int)$item['total_quantity'] + $add_qty;
$issued_qty    = (int)$item['issued_quantity'];
$new_available = $new_total - $issued_qty;
$min_threshold = (int)$item['min_threshold'];

if ($new_available <= 0) {
    $new_status = 'Out of Stock';
} elseif ($new_available <= $min_threshold) {
    $new_status = 'Low Stock';
} else {
    $new_status = 'Available';
}

$stmt_up = $conn->prepare('UPDATE inventory_items SET total_quantity = ?, available_quantity = ?, status = ? WHERE id = ?');
$stmt_up->bind_param('iisi', $new_total, $new_available, $new_status, $item_id);

if ($stmt_up->execute()) {
    $stmt_up->close();

    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $activeUser = $_SESSION['full_name'] ?? 'Lab In-Charge';
    $activeRole = $_SESSION['user_role'] ?? 'Lab Assistant';
    $restockDesc = "Restocked {$add_qty} unit(s). Total now: {$new_total}";
    if (!empty($notes)) {
        $restockDesc .= " (Note: {$notes})";
    }
    log_audit($conn, $activeUser, $activeRole, 'ITEM_RESTOCK', $item['item_name'], $restockDesc);

    send_json(true, "Successfully added {$add_qty} units to '{$item['item_name']}'!", [
        'item_id'       => $item_id,
        'item_name'     => $item['item_name'],
        'new_total'     => $new_total,
        'new_available' => $new_available,
        'new_status'    => $new_status,
    ]);
} else {
    $err = $stmt_up->error;
    $stmt_up->close();
    send_json(false, 'Failed to update stock: ' . $err);
}
?>
