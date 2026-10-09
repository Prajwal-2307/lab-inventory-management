<?php
/**
 * issue_item.php
 * Issues laboratory equipment/supplies to a borrower with tracking details and due date.
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

$item_id       = isset($input['item_id'])       ? (int)$input['item_id']                 : 0;
$issued_qty    = isset($input['issued_qty'])    ? max(1, (int)$input['issued_qty'])      : 1;
$borrower_name = isset($input['borrower_name']) ? sanitize($input['borrower_name'])     : 'Lab Borrower';
$borrower_id   = isset($input['borrower_id'])   ? sanitize($input['borrower_id'])       : 'STUDENT';
$borrower_dept = isset($input['borrower_dept']) ? sanitize($input['borrower_dept'])     : 'General Lab';
$remarks       = isset($input['remarks'])       ? sanitize($input['remarks'])           : 'Equipment practical loan';

// Due date defaults to 7 days from today if not specified
$due_date      = isset($input['due_date']) && !empty($input['due_date'])
                 ? sanitize($input['due_date'])
                 : date('Y-m-d', strtotime('+7 days'));

if ($item_id <= 0) {
    send_json(false, 'Invalid equipment ID provided.');
}

// ── Fetch Current Item Data ───────────────────────────────────────────────────
$stmt_fetch = $conn->prepare(
    'SELECT id, item_name, available_quantity, issued_quantity, total_quantity, min_threshold, status
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

$avail = (int)$item['available_quantity'];
if ($avail < $issued_qty || $item['status'] === 'Out of Stock') {
    send_json(false, "Cannot issue {$issued_qty} unit(s). Only {$avail} unit(s) of '{$item['item_name']}' currently available.");
}

// ── Update Quantities ─────────────────────────────────────────────────────────
$new_issued    = (int)$item['issued_quantity']    + $issued_qty;
$new_available = $avail                           - $issued_qty;
$min_threshold = (int)$item['min_threshold'];

if ($new_available <= 0) {
    $new_status = 'Out of Stock';
} elseif ($new_available <= $min_threshold) {
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

// ── Log the Loan Record ───────────────────────────────────────────────────────
$stmt_log = $conn->prepare(
    'INSERT INTO issued_log
       (item_id, borrower_name, borrower_id, borrower_dept, issued_qty, due_date, status, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$loan_status = 'Active';
$stmt_log->bind_param('isssisss',
    $item_id,
    $borrower_name,
    $borrower_id,
    $borrower_dept,
    $issued_qty,
    $due_date,
    $loan_status,
    $remarks
);
$stmt_log->execute();
$log_id = $conn->insert_id;
$stmt_log->close();

$conn->close();

send_json(true, "Issued {$issued_qty} unit(s) of '{$item['item_name']}' to {$borrower_name} successfully!", [
    'loan_id'           => $log_id,
    'item_id'           => $item_id,
    'item_name'         => $item['item_name'],
    'borrower_name'     => $borrower_name,
    'due_date'          => $due_date,
    'new_issued_qty'    => $new_issued,
    'new_available_qty' => $new_available,
    'new_status'        => $new_status,
]);
?>
