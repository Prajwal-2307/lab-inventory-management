<?php
/**
 * delete_item.php
 * Deletes an equipment record if no active loans exist.
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

$id = isset($input['id']) ? (int)$input['id'] : 0;
if ($id <= 0) {
    send_json(false, 'Invalid item ID.');
}

// ── Check if item exists and if units are currently issued ────────────────────
$stmt_check = $conn->prepare('SELECT item_name, issued_quantity FROM inventory_items WHERE id = ? LIMIT 1');
$stmt_check->bind_param('i', $id);
$stmt_check->execute();
$res = $stmt_check->get_result();

if ($res->num_rows === 0) {
    $stmt_check->close();
    send_json(false, 'Item not found.');
}

$item = $res->fetch_assoc();
$stmt_check->close();

if ((int)$item['issued_quantity'] > 0) {
    send_json(false, "Cannot delete '{$item['item_name']}': {$item['issued_quantity']} units are currently issued. Return all units before deleting.");
}

// Check for active loans in issued_log
$stmt_loan = $conn->prepare("SELECT COUNT(*) AS active_count FROM issued_log WHERE item_id = ? AND status IN ('Active', 'Overdue')");
$stmt_loan->bind_param('i', $id);
$stmt_loan->execute();
$loan_res = $stmt_loan->get_result()->fetch_assoc();
$stmt_loan->close();

if ((int)$loan_res['active_count'] > 0) {
    send_json(false, "Cannot delete item: Active loan records exist for this equipment.");
}

// ── Delete item ───────────────────────────────────────────────────────────────
$stmt_del = $conn->prepare('DELETE FROM inventory_items WHERE id = ?');
$stmt_del->bind_param('i', $id);

if ($stmt_del->execute()) {
    $stmt_del->close();

    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $activeUser = $_SESSION['full_name'] ?? 'Lab In-Charge';
    $activeRole = $_SESSION['user_role'] ?? 'Administrator';
    log_audit($conn, $activeUser, $activeRole, 'ITEM_DELETED', $item['item_name'], 
        "Deleted equipment item '{$item['item_name']}' [ID: $id]");

    send_json(true, "'{$item['item_name']}' has been removed from inventory.");
} else {
    $err = $stmt_del->error;
    $stmt_del->close();
    send_json(false, 'Failed to delete item: ' . $err);
}
?>
