<?php
/**
 * transfers_api.php
 * Handles Multi-Laboratory Inter-Room Equipment Transfers
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = isset($_GET['action']) ? sanitize($_GET['action']) : '';

// ── GET: List Transfers ──────────────────────────────────────────────────────
if ($method === 'GET' && (empty($action) || $action === 'list')) {
    $status = isset($_GET['status']) ? sanitize($_GET['status']) : '';
    $search = isset($_GET['search']) ? sanitize($_GET['search']) : '';

    $sql = "SELECT t.*, 
                   i.item_name, 
                   i.item_code, 
                   i.category, 
                   i.location AS current_item_location,
                   i.available_quantity
            FROM lab_transfers t
            JOIN inventory_items i ON t.item_id = i.id
            WHERE 1=1";

    $params = [];
    $types  = '';

    if (!empty($status) && $status !== 'All') {
        $sql .= " AND t.status = ?";
        $params[] = $status;
        $types   .= 's';
    }

    if (!empty($search)) {
        $sql .= " AND (i.item_name LIKE ? OR t.from_location LIKE ? OR t.to_location LIKE ? OR t.requested_by LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types   .= 'ssss';
    }

    $sql .= " ORDER BY t.created_at DESC";

    $stmt = $conn->prepare($sql);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $transfers = [];
    $counts = ['Pending' => 0, 'Dispatched' => 0, 'Received' => 0, 'Total' => 0];

    while ($row = $result->fetch_assoc()) {
        $transfers[] = $row;
        if (isset($counts[$row['status']])) {
            $counts[$row['status']]++;
        }
        $counts['Total']++;
    }
    $stmt->close();

    send_json(true, 'Transfers fetched', [
        'transfers' => $transfers,
        'counts'    => $counts
    ]);
}

// Read JSON / POST body for mutation actions
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true) ?? [];

if (empty($action) && isset($data['action'])) {
    $action = sanitize($data['action']);
}

// ── POST: Create Transfer Request ────────────────────────────────────────────
if ($action === 'create') {
    $itemId    = (int)($data['item_id'] ?? $_POST['item_id'] ?? 0);
    $fromLoc   = sanitize($data['from_location'] ?? $_POST['from_location'] ?? '');
    $toLoc     = sanitize($data['to_location'] ?? $_POST['to_location'] ?? '');
    $qty       = max(1, (int)($data['quantity'] ?? $_POST['quantity'] ?? 1));
    $reqBy     = sanitize($data['requested_by'] ?? $_POST['requested_by'] ?? ($_SESSION['full_name'] ?? 'Lab Technician'));
    $date      = sanitize($data['transfer_date'] ?? $_POST['transfer_date'] ?? date('Y-m-d'));
    $notes     = sanitize($data['notes'] ?? $_POST['notes'] ?? '');

    if ($itemId <= 0 || empty($toLoc)) {
        send_json(false, 'Missing required transfer fields (Equipment, Destination Location).');
    }

    // Fetch item location if from_location was empty
    $stmt = $conn->prepare("SELECT item_name, location, available_quantity FROM inventory_items WHERE id = ?");
    $stmt->bind_param('i', $itemId);
    $stmt->execute();
    $item = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$item) {
        send_json(false, 'Selected equipment item does not exist.');
    }

    if (empty($fromLoc)) {
        $fromLoc = $item['location'];
    }

    if ($fromLoc === $toLoc) {
        send_json(false, 'Destination location must be different from the source location.');
    }

    $ins = $conn->prepare("INSERT INTO lab_transfers 
      (item_id, from_location, to_location, quantity, requested_by, transfer_date, status, notes) 
      VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)");
    $ins->bind_param('ississs', $itemId, $fromLoc, $toLoc, $qty, $reqBy, $date, $notes);

    if ($ins->execute()) {
        $newId = $ins->insert_id;
        $ins->close();

        $activeUser = $_SESSION['full_name'] ?? $reqBy;
        $activeRole = $_SESSION['user_role'] ?? 'Lab Assistant';
        log_audit($conn, $activeUser, $activeRole, 'TRANSFER_REQUEST', $item['item_name'], 
            "Requested transfer #$newId of $qty unit(s) from $fromLoc to $toLoc");

        send_json(true, 'Inter-lab transfer request created successfully!', ['transfer_id' => $newId]);
    } else {
        send_json(false, 'Failed to create transfer: ' . $ins->error);
    }
}

// ── POST: Dispatch Transfer ──────────────────────────────────────────────────
if ($action === 'dispatch') {
    $trfId = (int)($data['transfer_id'] ?? $_POST['transfer_id'] ?? 0);

    $stmt = $conn->prepare("SELECT t.*, i.item_name FROM lab_transfers t JOIN inventory_items i ON t.item_id = i.id WHERE t.id = ?");
    $stmt->bind_param('i', $trfId);
    $stmt->execute();
    $trf = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$trf) {
        send_json(false, 'Transfer record not found.');
    }

    $upd = $conn->prepare("UPDATE lab_transfers SET status = 'Dispatched' WHERE id = ?");
    $upd->bind_param('i', $trfId);
    if ($upd->execute()) {
        $upd->close();
        $activeUser = $_SESSION['full_name'] ?? 'Lab In-Charge';
        $activeRole = $_SESSION['user_role'] ?? 'Administrator';
        log_audit($conn, $activeUser, $activeRole, 'TRANSFER_DISPATCHED', $trf['item_name'], 
            "Dispatched transfer #$trfId ({$trf['item_name']}) in transit to {$trf['to_location']}");

        send_json(true, "Transfer #$trfId marked as Dispatched & In Transit.");
    } else {
        send_json(false, 'Failed to update transfer status.');
    }
}

// ── POST: Receive & Sign-off Transfer ────────────────────────────────────────
if ($action === 'receive') {
    $trfId = (int)($data['transfer_id'] ?? $_POST['transfer_id'] ?? 0);

    $stmt = $conn->prepare("SELECT t.*, i.item_name FROM lab_transfers t JOIN inventory_items i ON t.item_id = i.id WHERE t.id = ?");
    $stmt->bind_param('i', $trfId);
    $stmt->execute();
    $trf = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$trf) {
        send_json(false, 'Transfer record not found.');
    }

    if ($trf['status'] === 'Received') {
        send_json(false, 'Transfer has already been received and verified.');
    }

    $conn->begin_transaction();

    try {
        // 1. Mark transfer as Received
        $updTrf = $conn->prepare("UPDATE lab_transfers SET status = 'Received' WHERE id = ?");
        $updTrf->bind_param('i', $trfId);
        $updTrf->execute();
        $updTrf->close();

        // 2. Automatically update equipment item's location
        $updItem = $conn->prepare("UPDATE inventory_items SET location = ? WHERE id = ?");
        $updItem->bind_param('si', $trf['to_location'], $trf['item_id']);
        $updItem->execute();
        $updItem->close();

        $conn->commit();

        $activeUser = $_SESSION['full_name'] ?? 'Lab In-Charge';
        $activeRole = $_SESSION['user_role'] ?? 'Administrator';
        log_audit($conn, $activeUser, $activeRole, 'TRANSFER_RECEIVED', $trf['item_name'], 
            "Received and verified transfer #$trfId. Equipment location updated to {$trf['to_location']}");

        send_json(true, "Transfer confirmed! Equipment location updated to: {$trf['to_location']}.");
    } catch (Exception $e) {
        $conn->rollback();
        send_json(false, 'Failed to receive transfer: ' . $e->getMessage());
    }
}

send_json(false, 'Invalid transfer action.');
?>
