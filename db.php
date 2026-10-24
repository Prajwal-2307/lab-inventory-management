<?php
/**
 * db.php
 * Database connection configuration for Lab Inventory Management System
 * Uses MySQLi with error handling
 */

// ── Database Credentials ──────────────────────────────────────────────────────
define('DB_HOST',   'localhost');
define('DB_USER',   'root');       // Default XAMPP username
define('DB_PASS',   '');           // Default XAMPP password (empty)
define('DB_NAME',   'lab_inventory');
define('DB_PORT',    3306);
define('DB_CHARSET', 'utf8mb4');

// ── Create Connection ─────────────────────────────────────────────────────────
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);

// ── Check for Connection Errors ───────────────────────────────────────────────
if ($conn->connect_error) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed. Please ensure XAMPP MySQL is running and lab_inventory database exists: ' . $conn->connect_error
    ]);
    exit;
}

// ── Set Character Set ─────────────────────────────────────────────────────────
if (!$conn->set_charset(DB_CHARSET)) {
    error_log('Error setting charset: ' . $conn->error);
}

/**
 * Helper: send a JSON response and exit
 *
 * @param bool   $success
 * @param string $message
 * @param array  $data     Optional extra data
 */
function send_json(bool $success, string $message, array $data = []): void
{
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $data));
    exit;
}

/**
 * Helper: sanitize string input
 */
function sanitize($data): string
{
    if ($data === null) {
        return '';
    }
    return trim(strip_tags((string)$data));
}

/**
 * Helper: log system activity into audit_logs table
 */
function log_audit(mysqli $conn, string $userName, string $role, string $actionType, ?string $itemName, string $description): void
{
    // Auto-create audit table if missing
    $conn->query("CREATE TABLE IF NOT EXISTS `audit_logs` (
      `id`          INT(11) NOT NULL AUTO_INCREMENT,
      `user_name`   VARCHAR(100) NOT NULL DEFAULT 'System Admin',
      `role`        VARCHAR(50) NOT NULL DEFAULT 'Administrator',
      `action_type` VARCHAR(50) NOT NULL,
      `item_name`   VARCHAR(150) DEFAULT NULL,
      `description` TEXT NOT NULL,
      `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      INDEX `idx_audit_action` (`action_type`),
      INDEX `idx_audit_created` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $stmt = $conn->prepare("INSERT INTO audit_logs (user_name, role, action_type, item_name, description) VALUES (?, ?, ?, ?, ?)");
    if ($stmt) {
        $stmt->bind_param('sssss', $userName, $role, $actionType, $itemName, $description);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * Self-healing Phase 3 schema migration runner
 */
function ensure_phase3_schema(mysqli $conn): void
{
    // 1. Users table & Default Accounts
    $conn->query("CREATE TABLE IF NOT EXISTS `users` (
      `id`         INT(11)      NOT NULL AUTO_INCREMENT,
      `username`   VARCHAR(50)  NOT NULL UNIQUE,
      `password`   VARCHAR(255) NOT NULL,
      `full_name`  VARCHAR(100) NOT NULL,
      `role`       VARCHAR(50)  NOT NULL DEFAULT 'Administrator',
      `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Check if assistant & student users exist
    $chkUser = $conn->query("SELECT COUNT(*) AS cnt FROM users WHERE username IN ('assistant', 'student')");
    $userCnt = $chkUser ? (int)$chkUser->fetch_assoc()['cnt'] : 0;
    if ($userCnt < 2) {
        $adminPass     = password_hash('admin123', PASSWORD_BCRYPT);
        $assistantPass = password_hash('assist123', PASSWORD_BCRYPT);
        $studentPass   = password_hash('student123', PASSWORD_BCRYPT);

        $conn->query("INSERT INTO users (username, password, full_name, role) VALUES
          ('admin', '$adminPass', 'Lab In-Charge (Admin)', 'Administrator'),
          ('assistant', '$assistantPass', 'Kiran Kumar (Lab Assistant)', 'Lab Assistant'),
          ('student', '$studentPass', 'Aarav Patel (Student)', 'Student')
          ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), role=VALUES(role);");
    }

    // 2. Extend inventory_items table with procurement fields
    $chkCol = $conn->query("SHOW COLUMNS FROM inventory_items LIKE 'purchase_price'");
    if ($chkCol && $chkCol->num_rows === 0) {
        $conn->query("ALTER TABLE inventory_items
          ADD COLUMN `purchase_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `min_threshold`,
          ADD COLUMN `purchase_date` DATE DEFAULT NULL AFTER `purchase_price`,
          ADD COLUMN `warranty_expiry` DATE DEFAULT NULL AFTER `purchase_date`,
          ADD COLUMN `vendor_name` VARCHAR(150) DEFAULT NULL AFTER `warranty_expiry`;");

        // Seed some sample procurement data
        $conn->query("UPDATE inventory_items SET purchase_price = 450.00, purchase_date = '2024-01-15', warranty_expiry = DATE_ADD(CURRENT_DATE, INTERVAL 45 DAY), vendor_name = 'Fluke Precision Instruments' WHERE item_code = 'EQ-EL-001'");
        $conn->query("UPDATE inventory_items SET purchase_price = 85.00,  purchase_date = '2024-03-20', warranty_expiry = DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), vendor_name = 'Borosil Scientific Supplies' WHERE item_code = 'GW-CH-002'");
        $conn->query("UPDATE inventory_items SET purchase_price = 620.00, purchase_date = '2023-11-10', warranty_expiry = DATE_ADD(CURRENT_DATE, INTERVAL 15 DAY), vendor_name = 'Rigol Technologies India' WHERE item_code = 'EQ-EL-005'");
        $conn->query("UPDATE inventory_items SET purchase_price = 140.00, purchase_date = '2024-02-05', warranty_expiry = DATE_ADD(CURRENT_DATE, INTERVAL 180 DAY), vendor_name = 'Mitutoyo Metrology Labs' WHERE item_code = 'TL-ME-007'");
    }

    // 3. Reservations Table
    $conn->query("CREATE TABLE IF NOT EXISTS `reservations` (
      `id`               INT(11) NOT NULL AUTO_INCREMENT,
      `item_id`          INT(11) NOT NULL,
      `student_name`     VARCHAR(100) NOT NULL,
      `student_id`       VARCHAR(50) NOT NULL,
      `student_dept`     VARCHAR(100) DEFAULT 'Engineering',
      `student_email`    VARCHAR(120) DEFAULT NULL,
      `reserved_qty`     INT(11) NOT NULL DEFAULT 1,
      `reservation_date` DATE NOT NULL,
      `time_slot`        VARCHAR(50) NOT NULL DEFAULT '09:00 AM - 12:00 PM',
      `purpose`          VARCHAR(255) DEFAULT NULL,
      `status`           ENUM('Pending','Approved','Rejected','Issued','Cancelled') NOT NULL DEFAULT 'Pending',
      `admin_notes`      VARCHAR(255) DEFAULT NULL,
      `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      INDEX `idx_res_status` (`status`),
      INDEX `idx_res_date` (`reservation_date`),
      FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Seed sample reservations if empty
    $chkRes = $conn->query("SELECT COUNT(*) AS cnt FROM reservations");
    if ($chkRes && (int)$chkRes->fetch_assoc()['cnt'] === 0) {
        $conn->query("INSERT INTO reservations 
          (item_id, student_name, student_id, student_dept, student_email, reserved_qty, reservation_date, time_slot, purpose, status) 
          VALUES
          (5, 'Sneha Joshi', 'STU-2024-112', 'Electronics & Comm.', 'sneha.j@college.edu', 1, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '09:00 AM - 12:00 PM', 'DSP Lab Practical - Fourier Transform Analysis', 'Pending'),
          (1, 'Vikram Nair', 'STU-2024-075', 'Electrical Eng.', 'vikram.n@college.edu', 2, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), '02:00 PM - 05:00 PM', 'Power Systems Laboratory Experiment 3', 'Approved'),
          (7, 'Meera Reddy', 'STU-2024-054', 'Mechanical Eng.', 'meera.r@college.edu', 1, CURRENT_DATE, '11:00 AM - 01:00 PM', 'Metrology Workshop Dimensional Inspection', 'Pending');");
    }

    // 4. Multi-Lab Transfers Table
    $conn->query("CREATE TABLE IF NOT EXISTS `lab_transfers` (
      `id`             INT(11) NOT NULL AUTO_INCREMENT,
      `item_id`        INT(11) NOT NULL,
      `from_location`  VARCHAR(100) NOT NULL,
      `to_location`    VARCHAR(100) NOT NULL,
      `quantity`       INT(11) NOT NULL DEFAULT 1,
      `requested_by`   VARCHAR(100) NOT NULL DEFAULT 'Lab Technician',
      `transfer_date`  DATE NOT NULL,
      `status`         ENUM('Pending','Dispatched','Received') NOT NULL DEFAULT 'Pending',
      `notes`          VARCHAR(255) DEFAULT NULL,
      `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      INDEX `idx_trf_status` (`status`),
      FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Seed sample transfers if empty
    $chkTrf = $conn->query("SELECT COUNT(*) AS cnt FROM lab_transfers");
    if ($chkTrf && (int)$chkTrf->fetch_assoc()['cnt'] === 0) {
        $conn->query("INSERT INTO lab_transfers 
          (item_id, from_location, to_location, quantity, requested_by, transfer_date, status, notes) 
          VALUES
          (1, 'Room 201 - Bench B2', 'Physics Lab - Room 102', 3, 'Dr. Ramesh Sharma', CURRENT_DATE, 'Dispatched', 'Inter-departmental measurement practicals'),
          (7, 'Tool Chest - Drawer 1', 'Mechanical Workshop B', 2, 'Prof. Anand Joshi', DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 'Received', 'Precision machining demonstration');");
    }

    // 5. Vendors & Procurement Table
    $conn->query("CREATE TABLE IF NOT EXISTS `vendors` (
      `id`                  INT(11) NOT NULL AUTO_INCREMENT,
      `vendor_name`         VARCHAR(150) NOT NULL,
      `contact_person`      VARCHAR(100) DEFAULT NULL,
      `email`               VARCHAR(120) DEFAULT NULL,
      `phone`               VARCHAR(30) DEFAULT NULL,
      `address`             VARCHAR(255) DEFAULT NULL,
      `categories_supplied` VARCHAR(150) DEFAULT NULL,
      `rating`              DECIMAL(2,1) DEFAULT 4.5,
      `created_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Seed sample vendors if empty
    $chkVend = $conn->query("SELECT COUNT(*) AS cnt FROM vendors");
    if ($chkVend && (int)$chkVend->fetch_assoc()['cnt'] === 0) {
        $conn->query("INSERT INTO vendors 
          (vendor_name, contact_person, email, phone, address, categories_supplied, rating) 
          VALUES
          ('Fluke Precision Instruments', 'Rajesh Gupta', 'sales@flukeprecision.in', '+91 98201 44321', 'Plot 42, Tech Zone, Bengaluru', 'Electronics, Calibration', 4.9),
          ('Borosil Scientific Supplies', 'Ananya Roy', 'support@borosilsci.com', '+91 98450 11234', '14 Industrial Estate, Mumbai', 'Glassware, Chemicals', 4.7),
          ('Rigol Technologies India', 'Sandeep Mehta', 'contact@rigol-india.com', '+91 97110 88920', 'Tower B, Cyber City, Gurugram', 'Electronics, Oscilloscopes', 4.8),
          ('Mitutoyo Metrology Labs', 'Pooja Kulkarni', 'sales@mitutoyo-metrology.in', '+91 98223 99812', 'Ambattur Industrial Estate, Chennai', 'Tools, Metrology', 4.6);");
    }

    // 6. Audit Logs Table
    $conn->query("CREATE TABLE IF NOT EXISTS `audit_logs` (
      `id`          INT(11) NOT NULL AUTO_INCREMENT,
      `user_name`   VARCHAR(100) NOT NULL DEFAULT 'System Admin',
      `role`        VARCHAR(50) NOT NULL DEFAULT 'Administrator',
      `action_type` VARCHAR(50) NOT NULL,
      `item_name`   VARCHAR(150) DEFAULT NULL,
      `description` TEXT NOT NULL,
      `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      INDEX `idx_audit_action` (`action_type`),
      INDEX `idx_audit_created` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Seed initial audit log if empty
    $chkAudit = $conn->query("SELECT COUNT(*) AS cnt FROM audit_logs");
    if ($chkAudit && (int)$chkAudit->fetch_assoc()['cnt'] === 0) {
        $conn->query("INSERT INTO audit_logs 
          (user_name, role, action_type, item_name, description) 
          VALUES
          ('Lab In-Charge', 'Administrator', 'SYSTEM_INIT', 'System', 'Phase 3 Full Production Suite successfully deployed and initialized'),
          ('Lab In-Charge', 'Administrator', 'ITEM_RESTOCK', 'Digital Multimeter', 'Restocked 5 units into Room 201'),
          ('Kiran Kumar', 'Lab Assistant', 'MAINTENANCE_COMPLETED', 'Oscilloscope (DSO)', 'Annual calibration inspection completed and verified');");
    }
}

// Auto-run schema check
ensure_phase3_schema($conn);
?>
