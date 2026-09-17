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
    // Return JSON error if called via AJAX, otherwise show HTML error
    if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) &&
        strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed. Please ensure XAMPP MySQL is running.'
        ]);
    } else {
        die('<div style="font-family:sans-serif;color:#c0392b;padding:20px;">
              <strong>Database Error:</strong> Cannot connect to MySQL. 
              Please start XAMPP and ensure the <em>lab_inventory</em> database exists.
              <br><small>' . htmlspecialchars($conn->connect_error) . '</small>
             </div>');
    }
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
 * Helper: sanitize & trim a string from user input
 *
 * @param string $str
 * @return string
 */
function sanitize(string $str): string
{
    return trim(htmlspecialchars(strip_tags($str), ENT_QUOTES, 'UTF-8'));
}
?>
