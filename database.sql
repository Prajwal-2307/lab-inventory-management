-- ============================================================
-- Lab Inventory Management System - Database Setup (Phase 2 - 70%)
-- Database: lab_inventory
-- ============================================================

CREATE DATABASE IF NOT EXISTS `lab_inventory`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `lab_inventory`;

-- ============================================================
-- Table: inventory_items
-- Stores laboratory equipment, apparatus, chemicals, and consumables
-- ============================================================
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id`                 INT(11)      NOT NULL AUTO_INCREMENT,
  `item_code`          VARCHAR(50)  DEFAULT NULL,
  `item_name`          VARCHAR(150) NOT NULL,
  `model_no`           VARCHAR(100) DEFAULT NULL,
  `category`           VARCHAR(100) NOT NULL,
  `location`           VARCHAR(100) DEFAULT 'Main Lab - Rack 1',
  `unit`               VARCHAR(30)  DEFAULT 'Units',
  `total_quantity`     INT(11)      NOT NULL DEFAULT 0,
  `issued_quantity`    INT(11)      NOT NULL DEFAULT 0,
  `available_quantity` INT(11)      NOT NULL DEFAULT 0,
  `status`             ENUM('Available','Low Stock','Out of Stock') NOT NULL DEFAULT 'Available',
  `item_condition`     ENUM('New','Good','Fair','Needs Maintenance','Under Repair') NOT NULL DEFAULT 'Good',
  `min_threshold`      INT(11)      NOT NULL DEFAULT 3,
  `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_category`  (`category`),
  INDEX `idx_status`    (`status`),
  INDEX `idx_condition` (`item_condition`),
  INDEX `idx_item_code` (`item_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: issued_log
-- Full Issue & Return tracking with borrower info and due dates
-- ============================================================
CREATE TABLE IF NOT EXISTS `issued_log` (
  `id`               INT(11)      NOT NULL AUTO_INCREMENT,
  `item_id`          INT(11)      NOT NULL,
  `borrower_name`    VARCHAR(100) NOT NULL DEFAULT 'Lab Researcher',
  `borrower_id`      VARCHAR(50)  NOT NULL DEFAULT 'ID-001',
  `borrower_dept`    VARCHAR(100) DEFAULT 'Engineering',
  `issued_qty`       INT(11)      NOT NULL DEFAULT 1,
  `issued_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date`         DATE         NOT NULL,
  `returned_at`      DATETIME     DEFAULT NULL,
  `status`           ENUM('Active','Returned','Overdue') NOT NULL DEFAULT 'Active',
  `return_condition` ENUM('Good','Fair','Damaged','Needs Repair') DEFAULT NULL,
  `remarks`          VARCHAR(255) DEFAULT NULL,
  `return_remarks`   VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_due_date` (`due_date`),
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: maintenance_log
-- Equipment maintenance, calibration, inspection, and repair log
-- ============================================================
CREATE TABLE IF NOT EXISTS `maintenance_log` (
  `id`               INT(11)      NOT NULL AUTO_INCREMENT,
  `item_id`          INT(11)      NOT NULL,
  `maintenance_type` ENUM('Routine Inspection','Calibration','Preventive Maintenance','Repair') NOT NULL DEFAULT 'Routine Inspection',
  `technician_name`  VARCHAR(100) NOT NULL,
  `start_date`       DATE         NOT NULL,
  `completion_date`  DATE         DEFAULT NULL,
  `cost`             DECIMAL(10,2) DEFAULT 0.00,
  `status`           ENUM('Scheduled','In Progress','Completed') NOT NULL DEFAULT 'In Progress',
  `notes`            TEXT         DEFAULT NULL,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_maint_status` (`status`),
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Sample Data - Ten Laboratory Items
-- ============================================================
INSERT INTO `inventory_items`
  (`item_code`, `item_name`, `model_no`, `category`, `location`, `unit`, `total_quantity`, `issued_quantity`, `available_quantity`, `status`, `item_condition`, `min_threshold`)
VALUES
  ('EQ-EL-001', 'Digital Multimeter',   'Fluke 87V',                  'Electronics', 'Room 201 - Bench B2',          'Units',   20,  6, 14, 'Available', 'Good', 3),
  ('GW-CH-002', 'Beaker Set (500 mL)',  'Borosil Class A',            'Glassware',   'Cabinet C - Shelf 1',          'Sets',    30,  8, 22, 'Available', 'Good', 5),
  ('EQ-EL-003', 'Soldering Iron',       'Weller WLC100',              'Electronics', 'Room 201 - Workstation 4',     'Units',   15, 13,  2, 'Low Stock', 'Fair', 3),
  ('CH-RG-004', 'Copper Sulphate',      'Analytical Grade 99%',       'Chemicals',   'Chemical Storage - Cabinet K', 'Bottles', 50,  0, 50, 'Available', 'Good', 10),
  ('EQ-EL-005', 'Oscilloscope (DSO)',   'Rigol DS1054Z 50MHz',        'Electronics', 'Room 202 - Rack A3',           'Units',   10,  3,  7, 'Available', 'Good', 2),
  ('GW-CH-006', 'Test Tube Stand',      'Stainless Steel 24-well',    'Glassware',   'Cabinet C - Shelf 2',          'Units',   25,  4, 21, 'Available', 'Good', 5),
  ('TL-ME-007', 'Vernier Caliper',      'Mitutoyo 150mm Digital',     'Tools',       'Tool Chest - Drawer 1',        'Units',   18,  6, 12, 'Available', 'Good', 3),
  ('GW-CH-008', 'Bunsen Burner',        'Standard Gas Burner',        'Glassware',   'Room 105 - Gas Bench 3',       'Units',   12, 11,  1, 'Low Stock', 'Needs Maintenance', 3),
  ('EQ-EL-009', 'Breadboard',           '830 Tie-Points Solderless',  'Electronics', 'Room 201 - Bin 12',            'Pieces',  40, 10, 30, 'Available', 'Good', 8),
  ('CH-RG-010', 'Hydrochloric Acid',    '37% Reagent Grade',          'Chemicals',   'Acid Cabinet - Safe Room',     'Bottles',  8,  0,  8, 'Available', 'Good', 2)
ON DUPLICATE KEY UPDATE `item_name` = VALUES(`item_name`);

-- Sample Issued Log Records
INSERT INTO `issued_log`
  (`item_id`, `borrower_name`, `borrower_id`, `borrower_dept`, `issued_qty`, `issued_at`, `due_date`, `returned_at`, `status`, `return_condition`, `remarks`, `return_remarks`)
VALUES
  (1, 'Aarav Patel',  'STU-2024-042', 'Electronics & Comm.', 1, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), NULL, 'Active', NULL, 'Signal processing lab practical', NULL),
  (3, 'Priya Sharma', 'RES-2023-019', 'Chemical Engineering', 1, DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), NULL, 'Overdue', NULL, 'Titration research project', NULL),
  (5, 'Rohan Verma',  'STU-2024-088', 'Electronics & Comm.', 1, DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'Returned', 'Good', 'Oscilloscope testing', 'Returned in perfect condition and tested');

-- Sample Maintenance Log Records
INSERT INTO `maintenance_log`
  (`item_id`, `maintenance_type`, `technician_name`, `start_date`, `completion_date`, `cost`, `status`, `notes`)
VALUES
  (8, 'Repair', 'Kiran Kumar (Lab Tech)', DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), NULL, 150.00, 'In Progress', 'Gas nozzle leakage inspection and valve replacement'),
  (1, 'Calibration', 'Precision Labs Inc.', DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 12 DAY), 350.00, 'Completed', 'Annual accuracy calibration and safety certification #CAL-9921'),
  (3, 'Preventive Maintenance', 'Kiran Kumar (Lab Tech)', DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 4 DAY), 50.00, 'Completed', 'Soldering tip replacement and thermal heating element test');

-- ============================================================
-- Trigger: auto-update status after INSERT
-- ============================================================
DELIMITER $$
DROP TRIGGER IF EXISTS `trg_status_after_insert`$$
CREATE TRIGGER `trg_status_after_insert`
BEFORE INSERT ON `inventory_items`
FOR EACH ROW
BEGIN
  SET NEW.available_quantity = NEW.total_quantity - NEW.issued_quantity;
  IF NEW.available_quantity <= 0 THEN
    SET NEW.status = 'Out of Stock';
  ELSEIF NEW.available_quantity <= NEW.min_threshold THEN
    SET NEW.status = 'Low Stock';
  ELSE
    SET NEW.status = 'Available';
  END IF;
END$$
DELIMITER ;

-- ============================================================
-- Trigger: auto-update status after UPDATE
-- ============================================================
DELIMITER $$
DROP TRIGGER IF EXISTS `trg_status_after_update`$$
CREATE TRIGGER `trg_status_after_update`
BEFORE UPDATE ON `inventory_items`
FOR EACH ROW
BEGIN
  SET NEW.available_quantity = NEW.total_quantity - NEW.issued_quantity;
  IF NEW.available_quantity <= 0 THEN
    SET NEW.status = 'Out of Stock';
  ELSEIF NEW.available_quantity <= NEW.min_threshold THEN
    SET NEW.status = 'Low Stock';
  ELSE
    SET NEW.status = 'Available';
  END IF;
END$$
DELIMITER ;

-- ============================================================
-- Table: users (Admin, Staff & Student Authentication)
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `username`    VARCHAR(50)  NOT NULL UNIQUE,
  `password`    VARCHAR(255) NOT NULL,
  `full_name`   VARCHAR(100) NOT NULL,
  `role`        VARCHAR(50)  NOT NULL DEFAULT 'Administrator',
  `student_id`  VARCHAR(50)  DEFAULT NULL,
  `department`  VARCHAR(100) DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Phase 3 Default Users (admin/admin123, assistant/assist123, student/student123)
INSERT INTO `users` (`username`, `password`, `full_name`, `role`, `student_id`, `department`)
VALUES 
  ('admin', '$2y$10$FIaIwAiqrEZFbNYXosWZZ.A08HSxHxOBR.ywYmbtGM7AQsuNHlUme', 'Lab In-Charge', 'Administrator', NULL, 'Laboratory Administration'),
  ('assistant', '$2y$10$0Q56u0oKk37g71e1kQnB1.GvPqN6B8GjSvh6LzJ7lF4b9m0cO3oVy', 'Kiran Kumar', 'Lab Assistant', NULL, 'Central Research Labs'),
  ('student', '$2y$10$Z3U6R7V0H5nL8k2eY1wTse7PqO8N5BjRvh9LzM7lF1b8m2cO4oWy', 'Sneha Kulkarni', 'Student', 'STU-2024-042', 'Electronics & Comm.')
ON DUPLICATE KEY UPDATE `password` = VALUES(`password`), `full_name` = VALUES(`full_name`);

-- ============================================================
-- Table: reservations (Phase 3: Student Online Slot Bookings)
-- ============================================================
CREATE TABLE IF NOT EXISTS `reservations` (
  `id`               INT(11) NOT NULL AUTO_INCREMENT,
  `item_id`          INT(11) NOT NULL,
  `student_name`    VARCHAR(100) NOT NULL,
  `student_id`      VARCHAR(50)  NOT NULL,
  `department`      VARCHAR(100) DEFAULT 'Engineering',
  `email`           VARCHAR(120) DEFAULT NULL,
  `reservation_date`DATE NOT NULL,
  `time_slot`       VARCHAR(50) NOT NULL,
  `quantity`         INT(11) NOT NULL DEFAULT 1,
  `purpose`          VARCHAR(255) DEFAULT NULL,
  `status`           ENUM('Pending','Approved','Issued','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',
  `loan_id`          INT(11) DEFAULT NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_res_status` (`status`),
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: lab_transfers (Phase 3: Multi-Lab Inter-Room Transfers)
-- ============================================================
CREATE TABLE IF NOT EXISTS `lab_transfers` (
  `id`            INT(11) NOT NULL AUTO_INCREMENT,
  `transfer_no`   VARCHAR(50) NOT NULL UNIQUE,
  `item_id`       INT(11) NOT NULL,
  `from_location` VARCHAR(100) NOT NULL,
  `to_location`   VARCHAR(100) NOT NULL,
  `quantity`      INT(11) NOT NULL DEFAULT 1,
  `requested_by`  VARCHAR(100) NOT NULL,
  `transfer_date` DATE NOT NULL,
  `status`        ENUM('Pending','Dispatched','Received','Cancelled') NOT NULL DEFAULT 'Pending',
  `received_by`   VARCHAR(100) DEFAULT NULL,
  `notes`         VARCHAR(255) DEFAULT NULL,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_trf_status` (`status`),
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: vendors (Phase 3: Suppliers Directory & Procurement)
-- ============================================================
CREATE TABLE IF NOT EXISTS `vendors` (
  `id`                  INT(11) NOT NULL AUTO_INCREMENT,
  `vendor_name`         VARCHAR(150) NOT NULL UNIQUE,
  `contact_person`      VARCHAR(100) DEFAULT NULL,
  `email`               VARCHAR(120) DEFAULT NULL,
  `phone`               VARCHAR(50)  DEFAULT NULL,
  `address`             TEXT         DEFAULT NULL,
  `categories_supplied` VARCHAR(255) DEFAULT NULL,
  `rating`              DECIMAL(2,1) DEFAULT 4.8,
  `created_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: audit_logs (Phase 3: Security & Activity Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`          INT(11) NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11) DEFAULT NULL,
  `user_name`   VARCHAR(100) NOT NULL DEFAULT 'System Admin',
  `user_role`   VARCHAR(50) NOT NULL DEFAULT 'Administrator',
  `action`      VARCHAR(50) NOT NULL,
  `item_id`     INT(11) DEFAULT NULL,
  `item_name`   VARCHAR(150) DEFAULT NULL,
  `details`     TEXT NOT NULL,
  `ip_address`  VARCHAR(50) DEFAULT '127.0.0.1',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_audit_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Phase 3 Seed Data
INSERT INTO `vendors` (`vendor_name`, `contact_person`, `email`, `phone`, `address`, `categories_supplied`, `rating`)
VALUES
  ('Fluke Precision Instruments', 'Rajesh Gupta', 'sales@fluke-india.com', '+91 98201 44321', 'Plot 42, Electronics City, Bengaluru', 'Electronics, Calibration', 4.9),
  ('Borosil Glass & Scientific', 'Meera Nambiar', 'support@borosil-scientific.in', '+91 94481 90872', '14 Industrial Area, Mumbai', 'Glassware, Volumetrics', 4.8),
  ('Rigol Technologies Inc.', 'Amitabh Sengupta', 'sales@rigoltech.co.in', '+91 97112 33451', 'Sector 62, Noida, NCR', 'Electronics, RF Testing', 4.7),
  ('Sigma-Aldrich Chemical Corp', 'Dr. Sunita Rao', 'orders@sigma-reagents.com', '+91 80234 56789', 'Whitefield Research Park, Bengaluru', 'Chemicals', 4.9),
  ('Mitutoyo Metrology Lab', 'Vikram Chawla', 'precision@mitutoyo-tools.in', '+91 99882 11223', 'Peenya Industrial Estate, Bengaluru', 'Tools, Metrology', 4.8)
ON DUPLICATE KEY UPDATE `contact_person` = VALUES(`contact_person`);


