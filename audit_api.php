<?php
/**
 * audit_api.php
 * Handles System Activity Audit Trail & Compliance Logging
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = isset($_GET['action']) ? sanitize($_GET['action']) : '';

// ── GET: Fetch Audit Logs ────────────────────────────────────────────────────
if ($method === 'GET' && (empty($action) || $action === 'list')) {
    $search = isset($_GET['search']) ? sanitize($_GET['search']) : '';
    $actionType = isset($_GET['action_type']) ? sanitize($_GET['action_type']) : '';
    $limit  = min(200, max(10, (int)($_GET['limit'] ?? 50)));

    $sql = "SELECT * FROM audit_logs WHERE 1=1";
    $params = [];
    $types  = '';

    if (!empty($actionType) && $actionType !== 'All') {
        $sql .= " AND action_type = ?";
        $params[] = $actionType;
        $types   .= 's';
    }

    if (!empty($search)) {
        $sql .= " AND (user_name LIKE ? OR role LIKE ? OR item_name LIKE ? OR description LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types   .= 'ssss';
    }

    $sql .= " ORDER BY created_at DESC LIMIT ?";
    $params[] = $limit;
    $types   .= 'i';

    $stmt = $conn->prepare($sql);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }
    $stmt->close();

    // Summary counts by action category
    $summaryQuery = $conn->query("SELECT action_type, COUNT(*) as cnt FROM audit_logs GROUP BY action_type ORDER BY cnt DESC");
    $summary = [];
    if ($summaryQuery) {
        while ($sRow = $summaryQuery->fetch_assoc()) {
            $summary[$sRow['action_type']] = (int)$sRow['cnt'];
        }
    }

    send_json(true, 'Audit trail logs fetched', [
        'logs'    => $logs,
        'summary' => $summary,
        'total'   => count($logs)
    ]);
}

// Read JSON / POST body for mutation actions
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true) ?? [];

if (empty($action) && isset($data['action'])) {
    $action = sanitize($data['action']);
}

// ── POST: Clear Audit Trail (Admin Only) ───────────────────────────────────────
if ($action === 'clear') {
    $currentUserRole = $_SESSION['user_role'] ?? 'Administrator';
    if ($currentUserRole !== 'Administrator') {
        send_json(false, 'Unauthorized. Only Administrators can clear the audit trail.');
    }

    $conn->query("TRUNCATE TABLE audit_logs");

    $activeUser = $_SESSION['full_name'] ?? 'Lab In-Charge';
    log_audit($conn, $activeUser, 'Administrator', 'AUDIT_CLEARED', 'System', 'Audit log history was reset by administrator');

    send_json(true, 'Audit trail cleared successfully.');
}

send_json(false, 'Invalid audit action.');
?>
