<?php
/**
 * vendors_api.php
 * Handles Vendor Directory, Equipment Procurement & Warranty Tracking
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = isset($_GET['action']) ? sanitize($_GET['action']) : '';

// ── GET: List Vendors & Procurement Overview ─────────────────────────────────
if ($method === 'GET' && (empty($action) || $action === 'list')) {
    $search = isset($_GET['search']) ? sanitize($_GET['search']) : '';

    $sql = "SELECT v.*, 
                   COUNT(i.id) AS supplied_item_count
            FROM vendors v
            LEFT JOIN inventory_items i ON LOWER(TRIM(i.vendor_name)) = LOWER(TRIM(v.vendor_name))
            WHERE 1=1";

    $params = [];
    $types  = '';

    if (!empty($search)) {
        $sql .= " AND (v.vendor_name LIKE ? OR v.contact_person LIKE ? OR v.categories_supplied LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types   .= 'sss';
    }

    $sql .= " GROUP BY v.id ORDER BY v.vendor_name ASC";

    $stmt = $conn->prepare($sql);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $vendors = [];
    while ($row = $result->fetch_assoc()) {
        $vendors[] = $row;
    }
    $stmt->close();

    // Compute Procurement & Warranty KPIs
    $procQuery = $conn->query("SELECT 
        SUM(purchase_price * total_quantity) AS total_asset_valuation,
        COUNT(CASE WHEN warranty_expiry IS NOT NULL AND warranty_expiry BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY) THEN 1 END) AS expiring_soon_count,
        COUNT(CASE WHEN warranty_expiry IS NOT NULL AND warranty_expiry < CURRENT_DATE THEN 1 END) AS expired_warranty_count,
        COUNT(CASE WHEN purchase_price > 0 THEN 1 END) AS procured_items_count
      FROM inventory_items");

    $procKpi = $procQuery ? $procQuery->fetch_assoc() : [
        'total_asset_valuation' => 0,
        'expiring_soon_count'   => 0,
        'expired_warranty_count'=> 0,
        'procured_items_count'  => 0
    ];

    // List items with warranty alerts
    $warrantyAlerts = [];
    $wRes = $conn->query("SELECT id, item_code, item_name, model_no, category, location, warranty_expiry, vendor_name,
        DATEDIFF(warranty_expiry, CURRENT_DATE) AS days_left
      FROM inventory_items 
      WHERE warranty_expiry IS NOT NULL 
        AND warranty_expiry <= DATE_ADD(CURRENT_DATE, INTERVAL 45 DAY)
      ORDER BY warranty_expiry ASC LIMIT 10");

    if ($wRes) {
        while ($wRow = $wRes->fetch_assoc()) {
            $warrantyAlerts[] = $wRow;
        }
    }

    send_json(true, 'Vendors and procurement overview fetched', [
        'vendors'         => $vendors,
        'kpi'             => [
            'total_vendors'         => count($vendors),
            'total_asset_valuation' => (float)($procKpi['total_asset_valuation'] ?? 0),
            'expiring_soon_count'   => (int)($procKpi['expiring_soon_count'] ?? 0),
            'expired_warranty_count'=> (int)($procKpi['expired_warranty_count'] ?? 0),
            'procured_items_count'  => (int)($procKpi['procured_items_count'] ?? 0)
        ],
        'warranty_alerts' => $warrantyAlerts
    ]);
}

// Read JSON / POST body for mutation actions
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true) ?? [];

if (empty($action) && isset($data['action'])) {
    $action = sanitize($data['action']);
}

// ── POST: Add Vendor ─────────────────────────────────────────────────────────
if ($action === 'create') {
    $name    = sanitize($data['vendor_name'] ?? $_POST['vendor_name'] ?? '');
    $contact = sanitize($data['contact_person'] ?? $_POST['contact_person'] ?? '');
    $email   = sanitize($data['email'] ?? $_POST['email'] ?? '');
    $phone   = sanitize($data['phone'] ?? $_POST['phone'] ?? '');
    $address = sanitize($data['address'] ?? $_POST['address'] ?? '');
    $cats    = sanitize($data['categories_supplied'] ?? $_POST['categories_supplied'] ?? 'Electronics');
    $rating  = (float)($data['rating'] ?? $_POST['rating'] ?? 4.5);

    if (empty($name)) {
        send_json(false, 'Vendor Company Name is required.');
    }

    $ins = $conn->prepare("INSERT INTO vendors (vendor_name, contact_person, email, phone, address, categories_supplied, rating) 
      VALUES (?, ?, ?, ?, ?, ?, ?)");
    $ins->bind_param('ssssssd', $name, $contact, $email, $phone, $address, $cats, $rating);

    if ($ins->execute()) {
        $newId = $ins->insert_id;
        $ins->close();

        $activeUser = $_SESSION['full_name'] ?? 'Lab In-Charge';
        $activeRole = $_SESSION['user_role'] ?? 'Administrator';
        log_audit($conn, $activeUser, $activeRole, 'VENDOR_ADDED', $name, "Added new equipment vendor: $name ($cats)");

        send_json(true, 'Vendor added to procurement directory successfully!', ['vendor_id' => $newId]);
    } else {
        send_json(false, 'Failed to add vendor: ' . $ins->error);
    }
}

// ── POST: Update Vendor ───────────────────────────────────────────────────────
if ($action === 'update') {
    $id      = (int)($data['id'] ?? $_POST['id'] ?? 0);
    $name    = sanitize($data['vendor_name'] ?? $_POST['vendor_name'] ?? '');
    $contact = sanitize($data['contact_person'] ?? $_POST['contact_person'] ?? '');
    $email   = sanitize($data['email'] ?? $_POST['email'] ?? '');
    $phone   = sanitize($data['phone'] ?? $_POST['phone'] ?? '');
    $address = sanitize($data['address'] ?? $_POST['address'] ?? '');
    $cats    = sanitize($data['categories_supplied'] ?? $_POST['categories_supplied'] ?? '');
    $rating  = (float)($data['rating'] ?? $_POST['rating'] ?? 4.5);

    if ($id <= 0 || empty($name)) {
        send_json(false, 'Vendor ID and Company Name are required.');
    }

    $upd = $conn->prepare("UPDATE vendors SET vendor_name = ?, contact_person = ?, email = ?, phone = ?, address = ?, categories_supplied = ?, rating = ? WHERE id = ?");
    $upd->bind_param('ssssssdi', $name, $contact, $email, $phone, $address, $cats, $rating, $id);

    if ($upd->execute()) {
        $upd->close();
        $activeUser = $_SESSION['full_name'] ?? 'Lab In-Charge';
        $activeRole = $_SESSION['user_role'] ?? 'Administrator';
        log_audit($conn, $activeUser, $activeRole, 'VENDOR_UPDATED', $name, "Updated vendor profile for: $name");

        send_json(true, 'Vendor record updated successfully!');
    } else {
        send_json(false, 'Failed to update vendor: ' . $conn->error);
    }
}

// ── POST: Delete Vendor ───────────────────────────────────────────────────────
if ($action === 'delete') {
    $id = (int)($data['id'] ?? $_POST['id'] ?? 0);
    if ($id <= 0) {
        send_json(false, 'Invalid vendor ID.');
    }

    $stmt = $conn->prepare("SELECT vendor_name FROM vendors WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $vend = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $name = $vend['vendor_name'] ?? "Vendor #$id";

    $del = $conn->prepare("DELETE FROM vendors WHERE id = ?");
    $del->bind_param('i', $id);
    if ($del->execute()) {
        $del->close();
        $activeUser = $_SESSION['full_name'] ?? 'Lab In-Charge';
        $activeRole = $_SESSION['user_role'] ?? 'Administrator';
        log_audit($conn, $activeUser, $activeRole, 'VENDOR_DELETED', $name, "Removed vendor record: $name");

        send_json(true, 'Vendor removed from directory.');
    } else {
        send_json(false, 'Failed to delete vendor: ' . $conn->error);
    }
}

send_json(false, 'Invalid vendor action.');
?>
