-- ============================================================
-- Add Admin Users Table & Default Superadmin Account
-- Database: lab_inventory
-- ============================================================

USE `lab_inventory`;

CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(50)  NOT NULL UNIQUE,
  `password`   VARCHAR(255) NOT NULL,
  `full_name`  VARCHAR(100) NOT NULL,
  `role`       VARCHAR(50)  NOT NULL DEFAULT 'Lab In-Charge',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Default Admin User (username: admin, password: admin123)
-- Password hash generated using password_hash('admin123', PASSWORD_BCRYPT)
INSERT INTO `users` (`username`, `password`, `full_name`, `role`)
VALUES ('admin', '$2y$10$FIaIwAiqrEZFbNYXosWZZ.A08HSxHxOBR.ywYmbtGM7AQsuNHlUme', 'Lab In-Charge', 'Administrator')
ON DUPLICATE KEY UPDATE `password` = VALUES(`password`), `full_name` = VALUES(`full_name`);
