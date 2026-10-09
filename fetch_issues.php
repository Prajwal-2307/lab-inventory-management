<?php
/**
 * fetch_issues.php
 * Fetches all equipment issuance and return records with status, borrower details, and overdue calculations.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$search = isset($_GET['search']) ? sanitize($_GET['search']) : '';
$status = isset($_GET['status']) ? sanitize($_GET['status']) : 'all';
$limit  = isset($_GET['limit'])  ? max(1, (int)$_GET['limit']) : 200;
$offset = isset($_GET['offset']) ? max(0, (int)$_GET['offset']): 0;

// Auto-sync overdue statuses in database for active loans past due date
$conn->query("UPDATE issued_log SET status = 'Overdue' WHERE status = 'Active' AND due_date < CURDATE()");

$conditions = [];
$params     = [];
$types      = '';

if ($search !== '') {
    $conditions[] = '(l.borrower_name LIKE ? OR l.borrower_id LIKE ? OR l.borrower_dept LIKE ? OR i.item_name LIKE ? OR i.item_code LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $types   .= 'sssss';
}

if ($status !== '' && strtolower($status) !== 'all') {
    $conditions[] = 'l.status = ?';
    $params[]     = $status;
    $types       .= 's';
}

$where = count($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

// Count query
$sql_count = "SELECT COUNT(*) AS total
              FROM issued_log l
              JOIN inventory_items i ON l.item_id = i.id
              $where";
$stmt_count = $conn->prepare($sql_count);
if ($types !== '') {
    $stmt_count->bind_param($types, ...$params);
}
$stmt_count->execute();
$total_count = (int)$stmt_count->get_result()->fetch_assoc()['total'];
$stmt_count->close();

// Data query
$sql = "SELECT l.id, l.item_id, l.borrower_name, l.borrower_id, l.borrower_dept,
               l.issued_qty, l.status, l.remarks, l.return_remarks, l.return_condition,
               DATE_FORMAT(l.issued_at, '%d %b %Y, %h:%i %p') AS issued_date,
               DATE_FORMAT(l.due_date, '%d %b %Y')            AS due_date,
               l.due_date                                     AS raw_due_date,
               DATE_FORMAT(l.returned_at, '%d %b %Y, %h:%i %p') AS returned_date,
               DATEDIFF(l.due_date, CURDATE())                AS days_left,
               i.item_name, i.item_code, i.category, i.location, i.unit, i.available_quantity
        FROM issued_log l
        JOIN inventory_items i ON l.item_id = i.id
        $where
        ORDER BY
          CASE WHEN l.status = 'Overdue' THEN 1
               WHEN l.status = 'Active'  THEN 2
               ELSE 3 END,
          l.issued_at DESC
        LIMIT ? OFFSET ?";

$params[] = $limit;
$params[] = $offset;
$types   .= 'ii';

$stmt = $conn->prepare($sql);
if (!$stmt) {
    send_json(false, 'Query preparation error: ' . $conn->error);
}

$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$loans = [];
while ($row = $result->fetch_assoc()) {
    $row['id']                 = (int)$row['id'];
    $row['item_id']            = (int)$row['item_id'];
    $row['issued_qty']         = (int)$row['issued_qty'];
    $row['days_left']          = (int)$row['days_left'];
    $row['available_quantity'] = (int)$row['available_quantity'];
    $loans[] = $row;
}

$stmt->close();

// Fetch summary totals for issue module
$stat_sql = "SELECT
                SUM(CASE WHEN status = 'Active'  THEN 1 ELSE 0 END) AS active_loans,
                SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) AS overdue_loans,
                SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) AS returned_loans,
                COUNT(*) AS total_loans
             FROM issued_log";
$stat_res = $conn->query($stat_sql)->fetch_assoc();

$conn->close();

echo json_encode([
    'success'        => true,
    'total'          => $total_count,
    'active_loans'   => (int)($stat_res['active_loans']   ?? 0),
    'overdue_loans'  => (int)($stat_res['overdue_loans']  ?? 0),
    'returned_loans' => (int)($stat_res['returned_loans'] ?? 0),
    'total_loans'    => (int)($stat_res['total_loans']    ?? 0),
    'loans'          => $loans,
]);
?>
