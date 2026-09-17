-- ============================================================
-- Lab Inventory Management System - Database Setup
-- Database: lab_inventory
-- ============================================================

CREATE DATABASE IF NOT EXISTS `lab_inventory`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `lab_inventory`;

-- ============================================================
-- Table: inventory_items
-- Stores all laboratory inventory records
-- ============================================================
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id`               INT(11)      NOT NULL AUTO_INCREMENT,
  `item_name`        VARCHAR(150) NOT NULL,
  `category`         VARCHAR(100) NOT NULL,
  `total_quantity`   INT(11)      NOT NULL DEFAULT 0,
  `issued_quantity`  INT(11)      NOT NULL DEFAULT 0,
  `available_quantity` INT(11)   NOT NULL DEFAULT 0,
  `status`           ENUM('Available','Low Stock','Out of Stock') NOT NULL DEFAULT 'Available',
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_status`   (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: issued_log
-- Tracks every individual issue action
-- ============================================================
CREATE TABLE IF NOT EXISTS `issued_log` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `item_id`     INT(11)      NOT NULL,
  `issued_qty`  INT(11)      NOT NULL DEFAULT 1,
  `issued_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `remarks`     VARCHAR(255)          DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Sample Data - Ten Laboratory Items
-- ============================================================
INSERT INTO `inventory_items`
  (`item_name`, `category`, `total_quantity`, `issued_quantity`, `available_quantity`, `status`)
VALUES
  ('Digital Multimeter',   'Electronics', 20,  5, 15, 'Available'),
  ('Beaker Set (500 mL)',  'Glassware',   30,  8, 22, 'Available'),
  ('Soldering Iron',       'Electronics', 15, 13,  2, 'Low Stock'),
  ('Copper Sulphate',      'Chemicals',   50,  0, 50, 'Available'),
  ('Oscilloscope (DSO)',   'Electronics', 10,  3,  7, 'Available'),
  ('Test Tube Stand',      'Glassware',   25,  4, 21, 'Available'),
  ('Vernier Caliper',      'Tools',       18,  6, 12, 'Available'),
  ('Bunsen Burner',        'Glassware',   12, 11,  1, 'Low Stock'),
  ('Breadboard',           'Electronics', 40, 10, 30, 'Available'),
  ('Hydrochloric Acid',    'Chemicals',    8,  0,  8, 'Available');

-- ============================================================
-- Trigger: auto-update status after INSERT
-- ============================================================
DELIMITER $$
CREATE TRIGGER `trg_status_after_insert`
BEFORE INSERT ON `inventory_items`
FOR EACH ROW
BEGIN
  SET NEW.available_quantity = NEW.total_quantity - NEW.issued_quantity;
  IF NEW.available_quantity <= 0 THEN
    SET NEW.status = 'Out of Stock';
  ELSEIF NEW.available_quantity <= 3 THEN
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
CREATE TRIGGER `trg_status_after_update`
BEFORE UPDATE ON `inventory_items`
FOR EACH ROW
BEGIN
  SET NEW.available_quantity = NEW.total_quantity - NEW.issued_quantity;
  IF NEW.available_quantity <= 0 THEN
    SET NEW.status = 'Out of Stock';
  ELSEIF NEW.available_quantity <= 3 THEN
    SET NEW.status = 'Low Stock';
  ELSE
    SET NEW.status = 'Available';
  END IF;
END$$
DELIMITER ;
