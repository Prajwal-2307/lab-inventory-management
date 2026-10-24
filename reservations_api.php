<?php
/**
 * reservations_api.php
 * Handles Student Online Booking & Lab Slot Reservations
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = isset($_GET['action']) ? sanitize($_GET['action']) : '';

// ── GET: List Reservations ───────────────────────────────────────────────────
if ($method === 'GET' && (empty($action) || $action === 'list')) {
    $status    = isset($_GET['status']) ? sanitize($_GET['status']) : '';
    $studentId = isset($_GET['student_id']) ? sanitize($_GET['student_id']) : '';
    $search    = isset($_GET['search']) ? sanitize($_GET['search']) : '';

    $sql = "SELECT r.*, 
                   i.item_name, 
                   i.item_code, 
                   i.category, 
                   i.location, 
                   i.available_quantity,
                   i.unit
            FROM reservations r
            JOIN inventory_items i ON r.item_id = i.id
            WHERE 1=1";
    
    $params = [];
    $types  = '';

    if (!empty($status) && $status !== 'All') {
        $sql .= " AND r.status = ?";
        $params[] = $status;
        $types   .= 's';
    }

    if (!empty($studentId)) {
        $sql .= " AND (LOWER(r.student_id) = LOWER(?) OR LOWER(r.student_name) LIKE LOWER(?))";
        $params[] = $studentId;
        $params[] = "%$studentId%";
        $types   .= 'ss';
    }

    if (!empty($search)) {
        $sql .= " AND (i.item_name LIKE ? OR r.student_name LIKE ? OR r.student_id LIKE ? OR r.purpose LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types   .= 'ssss';
    }

    $sql .= " ORDER BY r.reservation_date ASC, r.created_at DESC";

    $stmt = $conn->prepare($sql);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $reservations = [];
    $counts = ['Pending' => 0, 'Approved' => 0, 'Issued' => 0, 'Rejected' => 0, 'Cancelled' => 0, 'Total' => 0];

    while ($row = $result->fetch_assoc()) {
        $reservations[] = $row;
        if (isset($counts[$row['status']])) {
            $counts[$row['status']]++;
        }
        $counts['Total']++;
    }
    $stmt->close();

    send_json(true, 'Reservations fetched', [
        'reservations' => $reservations,
        'counts'       => $counts
    ]);
}

// Read JSON / POST body for mutation actions
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true) ?? [];

if (empty($action) && isset($data['action'])) {
    $action = sanitize($data['action']);
}

// ── POST: Create Reservation ─────────────────────────────────────────────────
if ($action === 'create') {
    $itemId    = (int)($data['item_id'] ?? $_POST['item_id'] ?? 0);
    $name      = sanitize($data['student_name'] ?? $_POST['student_name'] ?? '');
    $studentId = sanitize($data['student_id'] ?? $_POST['student_id'] ?? '');
    $dept      = sanitize($data['student_dept'] ?? $_POST['student_dept'] ?? 'Engineering');
    $email     = sanitize($data['student_email'] ?? $_POST['student_email'] ?? '');
    $qty       = max(1, (int)($data['reserved_qty'] ?? $_POST['reserved_qty'] ?? 1));
    $date      = sanitize($data['reservation_date'] ?? $_POST['reservation_date'] ?? '');
    $timeSlot  = sanitize($data['time_slot'] ?? $_POST['time_slot'] ?? '09:00 AM - 12:00 PM');
    $purpose   = sanitize($data['purpose'] ?? $_POST['purpose'] ?? 'Laboratory Practical');

    if ($itemId <= 0 || empty($name) || empty($studentId) || empty($date)) {
        send_json(false, 'Missing required reservation fields (Equipment, Student Name, ID, Date).');
    }

    // Verify item exists and has available quantity
    $stmt = $conn->prepare("SELECT item_name, available_quantity FROM inventory_items WHERE id = ?");
    $stmt->bind_param('i', $itemId);
    $stmt->execute();
    $item = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$item) {
        send_json(false, 'Selected equipment item does not exist.');
    }

    if ($item['available_quantity'] < $qty) {
        send_json(false, "Requested quantity ($qty) exceeds current available stock ({$item['available_quantity']}).");
    }

    $ins = $conn->prepare("INSERT INTO reservations 
      (item_id, student_name, student_id, student_dept, student_email, reserved_qty, reservation_date, time_slot, purpose, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')");
    $ins->bind_param('isssissss', $itemId, $name, $studentId, $dept, $email, $qty, $date, $timeSlot, $purpose);

    if ($ins->execute()) {
        $newId = $ins->insert_id;
        $ins->close();

        $activeUser = $_SESSION['full_name'] ?? $name;
        $activeRole = $_SESSION['user_role'] ?? 'Student';
        log_audit($conn, $activeUser, $activeRole, 'RESERVATION_CREATED', $item['item_name'], 
            "Created reservation #$newId for $qty unit(s) on $date ($timeSlot) by $name ($studentId)");

        send_json(true, 'Reservation request submitted successfully! Awaiting lab technician approval.', [
            'reservation_id' => $newId
        ]);
    } else {
        send_json(false, 'Failed to save reservation: ' . $ins->error);
    }
}

// ── POST: Update Reservation Status (Approve / Reject / Cancel) ───────────────
if ($action === 'update_status') {
    $resId  = (int)($data['reservation_id'] ?? $_POST['reservation_id'] ?? 0);
    $status = sanitize($data['status'] ?? $_POST['status'] ?? '');
    $notes  = sanitize($data['admin_notes'] ?? $_POST['admin_notes'] ?? '');

    $allowed = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
    if (!in_array($status, $allowed, true)) {
        send_json(false, 'Invalid reservation status.');
    }

    $stmt = $conn->prepare("SELECT r.*, i.item_name FROM reservations r JOIN inventory_items i ON r.item_id = i.id WHERE r.id = ?");
    $stmt->bind_param('i', $resId);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$res) {
        send_json(false, 'Reservation record not found.');
    }

    $upd = $conn->prepare("UPDATE reservations SET status = ?, admin_notes = ? WHERE id = ?");
    $upd->bind_param('ssi', $status, $notes, $resId);
    
    if ($upd->execute()) {
        $upd->close();
        $activeUser = $_SESSION['full_name'] ?? 'Lab In-Charge';
        $activeRole = $_SESSION['user_role'] ?? 'Administrator';
        log_audit($conn, $activeUser, $activeRole, 'RESERVATION_STATUS', $res['item_name'], 
            "Updated reservation #$resId status to $status for {$res['student_name']}");

        send_json(true, "Reservation #$resId marked as $status.");
    } else {
        send_json(false, 'Failed to update reservation: ' . $conn->error);
    }
}

// ── POST: Convert Reservation to Active Loan ──────────────────────────────────
if ($action === 'convert_to_loan') {
    $resId   = (int)($data['reservation_id'] ?? $_POST['reservation_id'] ?? 0);
    $dueDate = sanitize($data['due_date'] ?? $_POST['due_date'] ?? date('Y-m-d', strtotime('+7 days')));

    $stmt = $conn->prepare("SELECT r.*, i.item_name, i.available_quantity FROM reservations r JOIN inventory_items i ON r.item_id = i.id WHERE r.id = ?");
    $stmt->bind_param('i', $resId);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$res) {
        send_json(false, 'Reservation record not found.');
    }

    if ($res['status'] === 'Issued') {
        send_json(false, 'This reservation has already been converted to an active loan.');
    }

    $itemId = (int)$res['item_id'];
    $qty    = (int)$res['reserved_qty'];

    if ($res['available_quantity'] < $qty) {
        send_json(false, "Cannot issue: available stock is now {$res['available_quantity']}, but reservation requires $qty.");
    }

    $conn->begin_transaction();

    try {
        // 1. Create active loan
        $insLoan = $conn->prepare("INSERT INTO issued_log 
          (item_id, borrower_name, borrower_id, borrower_dept, issued_qty, due_date, status, remarks) 
          VALUES (?, ?, ?, ?, ?, ?, 'Active', ?)");
        $remarks = "Issued from reservation #$resId: " . ($res['purpose'] ?? 'Lab Practical');
        $insLoan->bind_param('isssiss', $itemId, $res['student_name'], $res['student_id'], $res['student_dept'], $qty, $dueDate, $remarks);
        $insLoan->execute();
        $insLoan->close();

        // 2. Update stock
        $updItem = $conn->prepare("UPDATE inventory_items 
          SET issued_quantity = issued_quantity + ?,
              available_quantity = total_quantity - (issued_quantity + ?)
          WHERE id = ?");
        $updItem->bind_param('iii', $qty, $qty, $itemId);
        $updItem->execute();
        $updItem->close();

        // 3. Mark reservation as Issued
        $updRes = $conn->prepare("UPDATE reservations SET status = 'Issued' WHERE id = ?");
        $updRes->bind_param('i', $resId);
        $updRes->execute();
        $updRes->close();

        $conn->commit();

        $activeUser = $_SESSION['full_name'] ?? 'Lab In-Charge';
        $activeRole = $_SESSION['user_role'] ?? 'Administrator';
        log_audit($conn, $activeUser, $activeRole, 'RESERVATION_ISSUED', $res['item_name'], 
            "Converted reservation #$resId to active loan for {$res['student_name']} (Due: $dueDate)");

        send_json(true, "Reservation converted to Active Loan for {$res['student_name']}! Stock updated.");
    } catch (Exception $e) {
        $conn->rollback();
        send_json(false, 'Failed to convert reservation to loan: ' . $e->getMessage());
    }
}

send_json(false, 'Invalid reservation request action.');
?>
