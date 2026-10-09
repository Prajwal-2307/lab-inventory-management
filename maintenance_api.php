<?php
/**
 * maintenance_api.php
 * Handles equipment maintenance logs, scheduling, and completion.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: Fetch Maintenance Records ───────────────────────────────────────────
if ($method === 'GET') {
    $status  = isset($_GET['status'])  ? sanitize($_GET['status'])  : 'all';
    $item_id = isset($_GET['item_id']) ? (int)$_GET['item_id']     : 0;

    $conditions = [];
    $params     = [];
    $types      = '';

    if ($status !== '' && strtolower($status) !== 'all') {
        $conditions[] = 'm.status = ?';
        $params[]     = $status;
        $types       .= 's';
    }

    if ($item_id > 0) {
        $conditions[] = 'm.item_id = ?';
        $params[]     = $item_id;
        $types       .= 'i';
    }

    $where = count($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

    $sql = "SELECT m.id, m.item_id, m.maintenance_type, m.technician_name,
                   DATE_FORMAT(m.start_date, '%d %b %Y')      AS start_date,
                   DATE_FORMAT(m.completion_date, '%d %b %Y') AS completion_date,
                   m.start_date                               AS raw_start_date,
                   m.completion_date                          AS raw_completion_date,
                   m.cost, m.status, m.notes,
                   DATE_FORMAT(m.created_at, '%d %b %Y')      AS logged_date,
                   i.item_name, i.item_code, i.category, i.location, i.item_condition
            FROM maintenance_log m
            JOIN inventory_items i ON m.item_id = i.id
            $where
            ORDER BY
              CASE WHEN m.status = 'In Progress' THEN 1
                   WHEN m.status = 'Scheduled'   THEN 2
                   ELSE 3 END,
              m.start_date DESC";

    $stmt = $conn->prepare($sql);
    if ($types !== '') {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $records = [];
    while ($row = $result->fetch_assoc()) {
        $row['id']      = (int)$row['id'];
        $row['item_id'] = (int)$row['item_id'];
        $row['cost']    = (float)$row['cost'];
        $records[] = $row;
    }
    $stmt->close();

    // Summary stats
    $stat_sql = "SELECT
                   COUNT(*) AS total_tickets,
                   SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
                   SUM(CASE WHEN status = 'Scheduled'   THEN 1 ELSE 0 END) AS scheduled,
                   SUM(CASE WHEN status = 'Completed'   THEN 1 ELSE 0 END) AS completed,
                   COALESCE(SUM(cost), 0) AS total_expense
                 FROM maintenance_log";
    $stats = $conn->query($stat_sql)->fetch_assoc();

    $conn->close();

    echo json_encode([
        'success'        => true,
        'records'        => $records,
        'total_tickets'  => (int)$stats['total_tickets'],
        'in_progress'    => (int)$stats['in_progress'],
        'scheduled'      => (int)$stats['scheduled'],
        'completed'      => (int)$stats['completed'],
        'total_expense'  => (float)$stats['total_expense'],
    ]);
    exit;
}

// ── POST: Create or Complete Maintenance ─────────────────────────────────────
if ($method === 'POST') {
    $raw   = file_get_contents('php://input');
    $input = (!empty($raw)) ? (json_decode($raw, true) ?? []) : $_POST;

    $action = sanitize($input['action'] ?? 'create');

    if ($action === 'create') {
        $item_id          = isset($input['item_id'])          ? (int)$input['item_id']                  : 0;
        $maintenance_type = isset($input['maintenance_type']) ? sanitize($input['maintenance_type'])  : 'Routine Inspection';
        $technician_name  = isset($input['technician_name'])  ? sanitize($input['technician_name'])   : '';
        $start_date       = isset($input['start_date'])       ? sanitize($input['start_date'])        : date('Y-m-d');
        $cost             = isset($input['cost'])             ? max(0, (float)$input['cost'])          : 0.00;
        $status           = isset($input['status'])           ? sanitize($input['status'])            : 'In Progress';
        $notes            = isset($input['notes'])            ? sanitize($input['notes'])             : '';

        if ($item_id <= 0) {
            send_json(false, 'Please select a valid equipment item.');
        }
        if ($technician_name === '') {
            send_json(false, 'Technician or service vendor name is required.');
        }

        $stmt = $conn->prepare(
            'INSERT INTO maintenance_log
               (item_id, maintenance_type, technician_name, start_date, cost, status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('isssdss', $item_id, $maintenance_type, $technician_name, $start_date, $cost, $status, $notes);

        if (!$stmt->execute()) {
            $err = $stmt->error;
            $stmt->close();
            send_json(false, 'Failed to schedule maintenance: ' . $err);
        }
        $log_id = $conn->insert_id;
        $stmt->close();

        // If in progress or repair, update equipment condition to 'Under Repair'
        if ($status === 'In Progress') {
            $conn->query("UPDATE inventory_items SET item_condition = 'Under Repair' WHERE id = {$item_id}");
        }

        $conn->close();
        send_json(true, "Maintenance ticket #{$log_id} created successfully!", ['log_id' => $log_id]);
    }

    if ($action === 'complete') {
        $id              = isset($input['id'])              ? (int)$input['id']                  : 0;
        $completion_date = isset($input['completion_date']) ? sanitize($input['completion_date']) : date('Y-m-d');
        $cost            = isset($input['cost'])            ? max(0, (float)$input['cost'])      : null;
        $notes           = isset($input['notes'])           ? sanitize($input['notes'])          : '';

        if ($id <= 0) {
            send_json(false, 'Invalid maintenance ticket ID.');
        }

        // Fetch item ID
        $fetch_stmt = $conn->prepare('SELECT item_id FROM maintenance_log WHERE id = ? LIMIT 1');
        $fetch_stmt->bind_param('i', $id);
        $fetch_stmt->execute();
        $res = $fetch_stmt->get_result();
        if ($res->num_rows === 0) {
            $fetch_stmt->close();
            send_json(false, 'Maintenance record not found.');
        }
        $row = $res->fetch_assoc();
        $item_id = (int)$row['item_id'];
        $fetch_stmt->close();

        if ($cost !== null) {
            $stmt = $conn->prepare(
                'UPDATE maintenance_log
                 SET status = "Completed", completion_date = ?, cost = ?, notes = CONCAT(IFNULL(notes,""), "\n", ?)
                 WHERE id = ?'
            );
            $stmt->bind_param('sdsi', $completion_date, $cost, $notes, $id);
        } else {
            $stmt = $conn->prepare(
                'UPDATE maintenance_log
                 SET status = "Completed", completion_date = ?, notes = CONCAT(IFNULL(notes,""), "\n", ?)
                 WHERE id = ?'
            );
            $stmt->bind_param('ssi', $completion_date, $notes, $id);
        }

        if (!$stmt->execute()) {
            $err = $stmt->error;
            $stmt->close();
            send_json(false, 'Failed to complete maintenance: ' . $err);
        }
        $stmt->close();

        // Restore equipment condition to 'Good'
        $conn->query("UPDATE inventory_items SET item_condition = 'Good' WHERE id = {$item_id}");

        $conn->close();
        send_json(true, "Maintenance ticket #{$id} marked as Completed!", ['id' => $id]);
    }

    send_json(false, 'Invalid action specified.');
}
?>
