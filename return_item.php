<?php
/**
 * return_item.php
 * Handles returning borrowed equipment back to laboratory stock.
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

$issue_id         = isset($input['issue_id'])         ? (int)$input['issue_id']                                : 0;
$return_condition = isset($input['return_condition']) ? sanitize($input['return_condition'])                  : 'Good';
$return_remarks   = isset($input['return_remarks'])   ? sanitize($input['return_remarks'])                    : 'Returned in order';

if ($issue_id <= 0) {
    send_json(false, 'Invalid loan ID.');
}

$valid_conditions = ['Good', 'Fair', 'Damaged', 'Needs Repair'];
if (!in_array($return_condition, $valid_conditions, true)) {
    $return_condition = 'Good';
}

// ── Fetch Issue Record ────────────────────────────────────────────────────────
$stmt_loan = $conn->prepare(
    'SELECT l.id, l.item_id, l.borrower_name, l.issued_qty, l.status,
            i.item_name, i.total_quantity, i.issued_quantity, i.available_quantity, i.min_threshold
     FROM issued_log l
     JOIN inventory_items i ON l.item_id = i.id
     WHERE l.id = ?
     LIMIT 1'
);
$stmt_loan->bind_param('i', $issue_id);
$stmt_loan->execute();
$loan_res = $stmt_loan->get_result();

if ($loan_res->num_rows === 0) {
    $stmt_loan->close();
    send_json(false, 'Loan record not found.');
}

$loan = $loan_res->fetch_assoc();
$stmt_loan->close();

if ($loan['status'] === 'Returned') {
    send_json(false, 'This item has already been marked as returned.');
}

$item_id     = (int)$loan['item_id'];
$returned_qty = (int)$loan['issued_qty'];

// ── Update Inventory Item Quantities ──────────────────────────────────────────
$new_issued    = max(0, (int)$loan['issued_quantity'] - $returned_qty);
$new_available = min((int)$loan['total_quantity'], (int)$loan['available_quantity'] + $returned_qty);
$min_threshold = (int)$loan['min_threshold'];

if ($new_available <= 0) {
    $new_status = 'Out of Stock';
} elseif ($new_available <= $min_threshold) {
    $new_status = 'Low Stock';
} else {
    $new_status = 'Available';
}

// Update condition if returned damaged
$condition_sql = '';
if (in_array($return_condition, ['Damaged', 'Needs Repair'], true)) {
    $condition_sql = ", item_condition = 'Needs Maintenance'";
}

$stmt_up_item = $conn->prepare(
    "UPDATE inventory_items
     SET issued_quantity = ?, available_quantity = ?, status = ? $condition_sql
     WHERE id = ?"
);
$stmt_up_item->bind_param('iisi', $new_issued, $new_available, $new_status, $item_id);

if (!$stmt_up_item->execute()) {
    $err = $stmt_up_item->error;
    $stmt_up_item->close();
    send_json(false, 'Failed to update item stock: ' . $err);
}
$stmt_up_item->close();

// ── Mark Loan as Returned ─────────────────────────────────────────────────────
$stmt_up_loan = $conn->prepare(
    'UPDATE issued_log
     SET status = "Returned", returned_at = NOW(), return_condition = ?, return_remarks = ?
     WHERE id = ?'
);
$stmt_up_loan->bind_param('ssi', $return_condition, $return_remarks, $issue_id);

if (!$stmt_up_loan->execute()) {
    $err = $stmt_up_loan->error;
    $stmt_up_loan->close();
    send_json(false, 'Failed to mark loan as returned: ' . $err);
}
$stmt_up_loan->close();

$conn->close();

send_json(true, "'{$loan['item_name']}' returned by {$loan['borrower_name']} successfully!", [
    'issue_id'          => $issue_id,
    'item_id'           => $item_id,
    'item_name'         => $loan['item_name'],
    'borrower_name'     => $loan['borrower_name'],
    'returned_qty'      => $returned_qty,
    'new_available_qty' => $new_available,
    'new_issued_qty'    => $new_issued,
    'return_condition'  => $return_condition,
]);
?>
