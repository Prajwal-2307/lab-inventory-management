<?php
/**
 * issue_item.php
 * Issues one unit of a specific inventory item
 *
 * POST Parameters:
 *   item_id (int) – ID of the item to issue
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
$raw   = file_get_contents('php://input');
$input = (!empty($raw)) ? (json_decode($raw, true) ?? []) : $_POST;

$item_id = isset($input['item_id']) ? (int)$input['item_id'] : 0;

if ($item_id <= 0) {
    send_json(false, 'Invalid item ID provided.');
}

// ── Fetch Current Item Data ───────────────────────────────────────────────────
$stmt_fetch = $conn->prepare(
    'SELECT id, item_name, available_quantity, issued_quantity, total_quantity, status
     FROM inventory_items
     WHERE id = ?
     LIMIT 1'
);
$stmt_fetch->bind_param('i', $item_id);
$stmt_fetch->execute();
$result = $stmt_fetch->get_result();

if ($result->num_rows === 0) {
    $stmt_fetch->close();
    send_json(false, 'Item not found in the inventory.');
}

$item = $result->fetch_assoc();
$stmt_fetch->close();

// ── Check Availability ────────────────────────────────────────────────────────
if ((int)$item['available_quantity'] <= 0 || $item['status'] === 'Out of Stock') {
    send_json(false, "'{$item['item_name']}' is out of stock and cannot be issued.");
}

// ── Update Quantities ─────────────────────────────────────────────────────────
$new_issued    = (int)$item['issued_quantity']    + 1;
$new_available = (int)$item['available_quantity'] - 1;

// Determine new status
if ($new_available <= 0) {
    $new_status = 'Out of Stock';
} elseif ($new_available <= 3) {
    $new_status = 'Low Stock';
} else {
    $new_status = 'Available';
}

$stmt_update = $conn->prepare(
    'UPDATE inventory_items
     SET issued_quantity = ?, available_quantity = ?, status = ?
     WHERE id = ?'
);
$stmt_update->bind_param('iisi', $new_issued, $new_available, $new_status, $item_id);

if (!$stmt_update->execute()) {
    $err = $stmt_update->error;
    $stmt_update->close();
    send_json(false, 'Failed to update inventory: ' . $err);
}
$stmt_update->close();

// ── Log the Issue Action ──────────────────────────────────────────────────────
$stmt_log = $conn->prepare(
    'INSERT INTO issued_log (item_id, issued_qty) VALUES (?, 1)'
);
$stmt_log->bind_param('i', $item_id);
$stmt_log->execute(); // Non-critical; don't fail the response if log fails
$stmt_log->close();

$conn->close();

send_json(true, "'{$item['item_name']}' issued successfully!", [
    'item_id'           => $item_id,
    'item_name'         => $item['item_name'],
    'new_issued_qty'    => $new_issued,
    'new_available_qty' => $new_available,
    'new_status'        => $new_status,
]);
?>
