CREATE TABLE IF NOT EXISTS companies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  legal_name VARCHAR(180) NULL,
  gstin VARCHAR(15) NULL,
  pan VARCHAR(10) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  website VARCHAR(180) NULL,
  address_line1 VARCHAR(180) NULL,
  address_line2 VARCHAR(180) NULL,
  city VARCHAR(80) NULL,
  state VARCHAR(80) NULL,
  pincode VARCHAR(10) NULL,
  logo_path VARCHAR(500) NULL,
  logo_mime_type VARCHAR(120) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS branches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  is_head_office TINYINT(1) NOT NULL DEFAULT 0,
  gstin VARCHAR(15) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  address_line1 VARCHAR(180) NULL,
  address_line2 VARCHAR(180) NULL,
  city VARCHAR(80) NULL,
  state VARCHAR(80) NULL,
  pincode VARCHAR(10) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_branches_company FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_departments_company FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS designations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NOT NULL,
  designation_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NULL,
  gender ENUM('male','female','other') NULL,
  date_of_birth DATE NULL,
  date_of_joining DATE NULL,
  mobile VARCHAR(20) NULL,
  alternate_mobile VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(80) NULL,
  state VARCHAR(80) NULL,
  pincode VARCHAR(10) NULL,
  emergency_contact_name VARCHAR(120) NULL,
  emergency_contact_phone VARCHAR(20) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_employees_designation FOREIGN KEY (designation_id) REFERENCES designations(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(120) NULL,
  mobile VARCHAR(20) NULL,
  alternate_mobile VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  gstin VARCHAR(15) NULL,
  pan VARCHAR(10) NULL,
  address_line1 VARCHAR(180) NULL,
  address_line2 VARCHAR(180) NULL,
  city VARCHAR(80) NULL,
  state VARCHAR(80) NULL,
  pincode VARCHAR(10) NULL,
  credit_limit DECIMAL(14,2) NOT NULL DEFAULT 0,
  credit_days INT UNSIGNED NOT NULL DEFAULT 0,
  remarks VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vendors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(120) NULL,
  mobile VARCHAR(20) NULL,
  alternate_mobile VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  gstin VARCHAR(15) NULL,
  gst_type ENUM('WITH_GST','WITHOUT_GST') NOT NULL DEFAULT 'WITH_GST',
  pan VARCHAR(10) NULL,
  address_line1 VARCHAR(180) NULL,
  address_line2 VARCHAR(180) NULL,
  city VARCHAR(80) NULL,
  state VARCHAR(80) NULL,
  pincode VARCHAR(10) NULL,
  payment_terms VARCHAR(120) NULL,
  bank_name VARCHAR(120) NULL,
  account_number VARCHAR(40) NULL,
  ifsc_code VARCHAR(11) NULL,
  remarks VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS gst_type ENUM('WITH_GST','WITHOUT_GST') NOT NULL DEFAULT 'WITH_GST' AFTER gstin;

INSERT INTO companies (code, name, legal_name)
SELECT 'COM-001', 'Ara Garage', 'Ara Garage'
WHERE NOT EXISTS (SELECT 1 FROM companies);

UPDATE companies SET name='Ara Garage', legal_name='Ara Garage' WHERE code='COM-001';

INSERT INTO branches (company_id, code, name, is_head_office)
SELECT id, 'BR-001', 'Head Office', 1 FROM companies
WHERE code = 'COM-001' AND NOT EXISTS (SELECT 1 FROM branches);

INSERT INTO departments (company_id, code, name)
SELECT id, 'DEP-001', 'Operations' FROM companies
WHERE code = 'COM-001' AND NOT EXISTS (SELECT 1 FROM departments);

INSERT INTO designations (code, name)
SELECT 'DES-001', 'Manager' WHERE NOT EXISTS (SELECT 1 FROM designations);

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  module VARCHAR(60) NOT NULL,
  action VARCHAR(30) NOT NULL,
  description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NULL,
  username VARCHAR(60) NOT NULL,
  email VARCHAR(150) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_company_username (company_id, username),
  UNIQUE KEY uq_users_company_email (company_id, email),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  user_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  allowed TINYINT(1) NOT NULL,
  PRIMARY KEY (user_id, permission_id),
  CONSTRAINT fk_user_permission_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_permission_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS navigation_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id BIGINT UNSIGNED NULL,
  title VARCHAR(80) NOT NULL,
  route VARCHAR(180) NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'Circle',
  permission_code VARCHAR(80) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_navigation_title_route (title, route),
  CONSTRAINT fk_navigation_parent FOREIGN KEY (parent_id) REFERENCES navigation_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS help_desk_tickets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_no VARCHAR(30) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(180) NOT NULL,
  category ENUM('technical','data','access','training','other') NOT NULL DEFAULT 'technical',
  priority ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  status ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  resolution TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_helpdesk_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO roles (code,name,description,is_system) VALUES
('ADMIN','Administrator','Full system access',1),
('USER','Standard User','Standard operational access',1);

INSERT IGNORE INTO permissions (code,name,module,action) VALUES
('DASHBOARD_VIEW','View Dashboard','Dashboard','view'),
('MD_DASHBOARD_VIEW','View MD Dashboard','Dashboard','view'),
('USER_VIEW','View Users','User Access','view'),('USER_CREATE','Create Users','User Access','create'),('USER_UPDATE','Update Users','User Access','update'),('USER_DELETE','Delete Users','User Access','delete'),
('ROLE_VIEW','View Roles','User Access','view'),('ROLE_CREATE','Create Roles','User Access','create'),('ROLE_UPDATE','Update Roles','User Access','update'),('ROLE_DELETE','Delete Roles','User Access','delete'),
('PERMISSION_VIEW','View Permissions','User Access','view'),('PERMISSION_ASSIGN','Assign Permissions','User Access','assign'),
('HELPDESK_VIEW_ALL','View All Help Desk Tickets','Support','view'),('HELPDESK_UPDATE','Update Help Desk Tickets','Support','update'),
('COMPANY_VIEW','View Companies','Masters','view'),('COMPANY_CREATE','Create Companies','Masters','create'),('COMPANY_UPDATE','Update Companies','Masters','update'),('COMPANY_DELETE','Delete Companies','Masters','delete'),
('BRANCH_VIEW','View Branches','Masters','view'),('BRANCH_CREATE','Create Branches','Masters','create'),('BRANCH_UPDATE','Update Branches','Masters','update'),('BRANCH_DELETE','Delete Branches','Masters','delete'),
('DEPARTMENT_VIEW','View Departments','Masters','view'),('DEPARTMENT_CREATE','Create Departments','Masters','create'),('DEPARTMENT_UPDATE','Update Departments','Masters','update'),('DEPARTMENT_DELETE','Delete Departments','Masters','delete'),
('DESIGNATION_VIEW','View Designations','Masters','view'),('DESIGNATION_CREATE','Create Designations','Masters','create'),('DESIGNATION_UPDATE','Update Designations','Masters','update'),('DESIGNATION_DELETE','Delete Designations','Masters','delete'),
('EMPLOYEE_VIEW','View Employees','Masters','view'),('EMPLOYEE_CREATE','Create Employees','Masters','create'),('EMPLOYEE_UPDATE','Update Employees','Masters','update'),('EMPLOYEE_DELETE','Delete Employees','Masters','delete'),
('CUSTOMER_VIEW','View Customers','Masters','view'),('CUSTOMER_CREATE','Create Customers','Masters','create'),('CUSTOMER_UPDATE','Update Customers','Masters','update'),('CUSTOMER_DELETE','Delete Customers','Masters','delete'),
('VENDOR_VIEW','View Vendors','Masters','view'),('VENDOR_CREATE','Create Vendors','Masters','create'),('VENDOR_UPDATE','Update Vendors','Masters','update'),('VENDOR_DELETE','Delete Vendors','Masters','delete');

INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='ADMIN';

INSERT IGNORE INTO navigation_items (title,route,icon,permission_code,sort_order) VALUES
('Dashboard','/','LayoutDashboard','DASHBOARD_VIEW',1),
('User Guide','/user-guide','BookOpen',NULL,2),
('Help Desk','/help-desk','LifeBuoy',NULL,3);
INSERT INTO navigation_items (title,route,icon,permission_code,sort_order)
SELECT 'User Access',NULL,'Users',NULL,10 WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE title='User Access' AND route IS NULL);
INSERT INTO navigation_items (title,route,icon,permission_code,sort_order)
SELECT 'Masters',NULL,'Database',NULL,20 WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE title='Masters' AND route IS NULL);

INSERT IGNORE INTO navigation_items (parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Users','/users','Users','USER_VIEW',1 FROM navigation_items WHERE title='User Access' AND route IS NULL;
INSERT IGNORE INTO navigation_items (parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Roles & Permissions','/roles','Shield','ROLE_VIEW',2 FROM navigation_items WHERE title='User Access' AND route IS NULL;
INSERT IGNORE INTO navigation_items (parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Companies','/masters/companies','Building2','COMPANY_VIEW',1 FROM navigation_items WHERE title='Masters' AND route IS NULL;
INSERT IGNORE INTO navigation_items (parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Branches','/masters/branches','GitBranch','BRANCH_VIEW',2 FROM navigation_items WHERE title='Masters' AND route IS NULL;
INSERT IGNORE INTO navigation_items (parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Departments','/masters/departments','Network','DEPARTMENT_VIEW',3 FROM navigation_items WHERE title='Masters' AND route IS NULL;
INSERT IGNORE INTO navigation_items (parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Designations','/masters/designations','BadgeCheck','DESIGNATION_VIEW',4 FROM navigation_items WHERE title='Masters' AND route IS NULL;
INSERT IGNORE INTO navigation_items (parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Employees','/masters/employees','UserCog','EMPLOYEE_VIEW',5 FROM navigation_items WHERE title='Masters' AND route IS NULL;
INSERT IGNORE INTO navigation_items (parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Customers','/masters/customers','Handshake','CUSTOMER_VIEW',6 FROM navigation_items WHERE title='Masters' AND route IS NULL;
INSERT IGNORE INTO navigation_items (parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Vendors','/masters/vendors','Truck','VENDOR_VIEW',7 FROM navigation_items WHERE title='Masters' AND route IS NULL;

CREATE TABLE IF NOT EXISTS financial_years (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(40) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vehicles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_number VARCHAR(30) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NULL,
  vehicle_name VARCHAR(120) NULL,
  model VARCHAR(100) NULL,
  manufacturing_year SMALLINT UNSIGNED NULL,
  fuel_type VARCHAR(30) NULL,
  engine_number VARCHAR(80) NULL,
  chassis_number VARCHAR(80) NULL,
  sale_date DATE NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vehicles_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS uoms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  part_number VARCHAR(80) NULL,
  hsn_code VARCHAR(20) NOT NULL,
  uom_id BIGINT UNSIGNED NOT NULL,
  default_rate DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_uom FOREIGN KEY (uom_id) REFERENCES uoms(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS work_pending_sub_statuses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS document_sequences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  document_type VARCHAR(30) NOT NULL,
  financial_year_id BIGINT UNSIGNED NOT NULL,
  prefix VARCHAR(10) NOT NULL,
  last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_document_sequence (document_type,financial_year_id),
  CONSTRAINT fk_document_sequence_fy FOREIGN KEY (financial_year_id) REFERENCES financial_years(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_cards (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  financial_year_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  job_card_no VARCHAR(40) NOT NULL,
  entry_date DATE NOT NULL,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  customer_contact VARCHAR(20) NOT NULL,
  driver_contact VARCHAR(20) NULL,
  current_kms DECIMAL(12,2) NOT NULL DEFAULT 0,
  current_hours DECIMAL(12,2) NOT NULL DEFAULT 0,
  average_daily_kms DECIMAL(12,2) NOT NULL DEFAULT 0,
  next_service_kms DECIMAL(12,2) NOT NULL DEFAULT 0,
  average_daily_hours DECIMAL(12,2) NOT NULL DEFAULT 0,
  next_service_hours DECIMAL(12,2) NOT NULL DEFAULT 0,
  next_service_days INT UNSIGNED NULL,
  next_service_date DATE NULL,
  complaint_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  estimate_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  advance_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
  balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('draft','approved','in_progress','completed','cancelled') NOT NULL DEFAULT 'draft',
  approved_at DATETIME NULL,
  approved_by BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_job_card_no_fy (job_card_no,financial_year_id),
  CONSTRAINT fk_job_card_fy FOREIGN KEY (financial_year_id) REFERENCES financial_years(id),
  CONSTRAINT fk_job_card_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_job_card_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_job_card_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_job_card_created FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_job_card_updated FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_card_complaints (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_card_id BIGINT UNSIGNED NOT NULL,
  complaint TEXT NOT NULL,
  cost DECIMAL(14,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  CONSTRAINT fk_job_complaint_job FOREIGN KEY (job_card_id) REFERENCES job_cards(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_card_vehicle_images (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  job_card_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  KEY idx_job_card_vehicle_images_job (job_card_id,deleted_at),
  CONSTRAINT fk_job_vehicle_image_company FOREIGN KEY(company_id) REFERENCES companies(id),
  CONSTRAINT fk_job_vehicle_image_job FOREIGN KEY(job_card_id) REFERENCES job_cards(id),
  CONSTRAINT fk_job_vehicle_image_user FOREIGN KEY(uploaded_by) REFERENCES users(id),
  CONSTRAINT fk_job_vehicle_image_deleted FOREIGN KEY(deleted_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS work_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  financial_year_id BIGINT UNSIGNED NOT NULL,
  job_card_id BIGINT UNSIGNED NOT NULL UNIQUE,
  work_order_no VARCHAR(40) NOT NULL,
  work_order_type ENUM('AMC','WARRANTY','PAID') NULL,
  service_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
  labour_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
  approval_status ENUM('draft','approved') NOT NULL DEFAULT 'draft',
  overall_status ENUM('pending','partially_completed','completed') NOT NULL DEFAULT 'pending',
  approved_at DATETIME NULL,
  approved_by BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_work_order_no_fy (work_order_no,financial_year_id),
  CONSTRAINT fk_work_order_fy FOREIGN KEY (financial_year_id) REFERENCES financial_years(id),
  CONSTRAINT fk_work_order_job FOREIGN KEY (job_card_id) REFERENCES job_cards(id),
  CONSTRAINT fk_work_order_created FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_work_order_updated FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS work_order_complaints (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_order_id BIGINT UNSIGNED NOT NULL,
  job_card_complaint_id BIGINT UNSIGNED NOT NULL,
  mechanic_employee_id BIGINT UNSIGNED NULL,
  status ENUM('pending','completed') NOT NULL DEFAULT 'pending',
  pending_sub_status_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_work_order_job_complaint (work_order_id,job_card_complaint_id),
  CONSTRAINT fk_wo_complaint_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  CONSTRAINT fk_wo_complaint_job_detail FOREIGN KEY (job_card_complaint_id) REFERENCES job_card_complaints(id),
  CONSTRAINT fk_wo_complaint_mechanic FOREIGN KEY (mechanic_employee_id) REFERENCES employees(id),
  CONSTRAINT fk_wo_complaint_sub_status FOREIGN KEY (pending_sub_status_id) REFERENCES work_pending_sub_statuses(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS work_order_spares (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_order_id BIGINT UNSIGNED NOT NULL,
  spare_source ENUM('MASTER','LOCAL_PURCHASE') NOT NULL DEFAULT 'MASTER',
  product_id BIGINT UNSIGNED NULL,
  uom_id BIGINT UNSIGNED NULL,
  product_code VARCHAR(30) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  part_number VARCHAR(80) NULL,
  hsn_code VARCHAR(20) NOT NULL,
  uom_code VARCHAR(20) NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  rate DECIMAL(14,2) NOT NULL,
  total DECIMAL(14,2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  CONSTRAINT fk_wo_spare_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  CONSTRAINT fk_wo_spare_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_wo_spare_uom FOREIGN KEY (uom_id) REFERENCES uoms(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS work_order_attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_order_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  CONSTRAINT fk_wo_attachment_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_receipts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  financial_year_id BIGINT UNSIGNED NOT NULL,
  job_card_id BIGINT UNSIGNED NOT NULL,
  work_order_id BIGINT UNSIGNED NULL,
  receipt_no VARCHAR(40) NOT NULL,
  receipt_date DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_mode ENUM('CASH','UPI','CARD','BANK_TRANSFER','OTHER') NOT NULL,
  reference_number VARCHAR(100) NULL,
  remarks VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_receipt_no_fy (receipt_no,financial_year_id),
  CONSTRAINT fk_payment_fy FOREIGN KEY (financial_year_id) REFERENCES financial_years(id),
  CONSTRAINT fk_payment_job FOREIGN KEY (job_card_id) REFERENCES job_cards(id),
  CONSTRAINT fk_payment_work FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
) ENGINE=InnoDB;

INSERT INTO financial_years(code,name,start_date,end_date,is_current)
SELECT '2026-27','2026-27','2026-04-01','2027-03-31',1 WHERE NOT EXISTS(SELECT 1 FROM financial_years WHERE code='2026-27');
INSERT INTO uoms(code,name,description)
SELECT 'NOS','Numbers','Individual count' WHERE NOT EXISTS(SELECT 1 FROM uoms WHERE code='NOS');
INSERT INTO work_pending_sub_statuses(code,name)
SELECT 'WAIT_CUSTOMER_APPROVAL','WAIT FOR CUSTOMER APPROVAL' WHERE NOT EXISTS(SELECT 1 FROM work_pending_sub_statuses WHERE code='WAIT_CUSTOMER_APPROVAL');
INSERT INTO work_pending_sub_statuses(code,name)
SELECT 'PARTS_UNAVAILABLE','PARTS WAITING / UNAVAILABLE' WHERE NOT EXISTS(SELECT 1 FROM work_pending_sub_statuses WHERE code='PARTS_UNAVAILABLE');

INSERT IGNORE INTO permissions(code,name,module,action) VALUES
('FY_VIEW','View Financial Years','System','view'),('FY_CREATE','Create Financial Years','System','create'),('FY_UPDATE','Update Financial Years','System','update'),('FY_DELETE','Delete Financial Years','System','delete'),
('VEHICLE_VIEW','View Vehicles','Masters','view'),('VEHICLE_CREATE','Create Vehicles','Masters','create'),('VEHICLE_UPDATE','Update Vehicles','Masters','update'),('VEHICLE_DELETE','Delete Vehicles','Masters','delete'),
('UOM_VIEW','View UOM','Masters','view'),('UOM_CREATE','Create UOM','Masters','create'),('UOM_UPDATE','Update UOM','Masters','update'),('UOM_DELETE','Delete UOM','Masters','delete'),
('PRODUCT_VIEW','View Products','Masters','view'),('PRODUCT_CREATE','Create Products','Masters','create'),('PRODUCT_UPDATE','Update Products','Masters','update'),('PRODUCT_DELETE','Delete Products','Masters','delete'),
('PENDING_STATUS_VIEW','View Pending Sub-status','Masters','view'),('PENDING_STATUS_CREATE','Create Pending Sub-status','Masters','create'),('PENDING_STATUS_UPDATE','Update Pending Sub-status','Masters','update'),('PENDING_STATUS_DELETE','Delete Pending Sub-status','Masters','delete'),
('JOB_CARD_VIEW','View Job Cards','Job Card','view'),('JOB_CARD_CREATE','Create Job Cards','Job Card','create'),('JOB_CARD_UPDATE','Update Job Cards','Job Card','update'),('JOB_CARD_DELETE','Delete Job Cards','Job Card','delete'),('JOB_CARD_APPROVE','Approve Job Cards','Job Card','approve'),('JOB_CARD_PRINT','Print Job Cards','Job Card','print'),
('WORK_ORDER_VIEW','View Work Orders','Work Order','view'),('WORK_ORDER_UPDATE','Update Work Orders','Work Order','update'),('WORK_ORDER_DELETE','Delete Work Orders','Work Order','delete'),('WORK_ORDER_APPROVE','Approve Work Orders','Work Order','approve'),('WORK_ORDER_PRINT','Print Work Orders','Work Order','print'),
('ACCOUNTS_VIEW','View Accounts','Accounts','view'),('PAYMENT_RECEIVE','Receive Payments','Accounts','create'),('PAYMENT_DELETE','Delete Payments','Accounts','delete'),
('BILLING_VIEW','View Billing','Billing','view'),('BILLING_PRINT','Print Billing','Billing','print');

INSERT IGNORE INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='ADMIN';

INSERT IGNORE INTO navigation_items(title,route,icon,permission_code,sort_order) VALUES
('Job Cards','/job-cards','ClipboardList','JOB_CARD_VIEW',30),
('Work Orders','/work-orders','Wrench','WORK_ORDER_VIEW',31),
('Accounts','/accounts','IndianRupee','ACCOUNTS_VIEW',32),
('Billing','/billing','ReceiptText','BILLING_VIEW',33);
INSERT IGNORE INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='ADMIN' AND p.code IN ('BILLING_VIEW','BILLING_PRINT');
INSERT IGNORE INTO navigation_items(parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Vehicles','/masters/vehicles','Truck','VEHICLE_VIEW',8 FROM navigation_items WHERE title='Masters' AND route IS NULL;
INSERT IGNORE INTO navigation_items(parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'UOM','/masters/uoms','Ruler','UOM_VIEW',9 FROM navigation_items WHERE title='Masters' AND route IS NULL;
INSERT IGNORE INTO navigation_items(parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Products','/masters/products','Package','PRODUCT_VIEW',10 FROM navigation_items WHERE title='Masters' AND route IS NULL;
INSERT IGNORE INTO navigation_items(parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Pending Sub-status','/masters/work-pending-sub-statuses','Clock3','PENDING_STATUS_VIEW',11 FROM navigation_items WHERE title='Masters' AND route IS NULL;
INSERT IGNORE INTO navigation_items(parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Financial Years','/masters/financial-years','CalendarRange','FY_VIEW',12 FROM navigation_items WHERE title='Masters' AND route IS NULL;

CREATE TABLE IF NOT EXISTS store_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  financial_year_id BIGINT UNSIGNED NOT NULL,
  store_no VARCHAR(40) NOT NULL,
  store_type ENUM('CASH','CREDIT') NOT NULL,
  bill_no VARCHAR(80) NOT NULL,
  entry_date DATE NOT NULL,
  vendor_id BIGINT UNSIGNED NOT NULL,
  vendor_gst_type ENUM('WITH_GST','WITHOUT_GST') NOT NULL,
  vendor_gstin VARCHAR(15) NULL,
  taxable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_store_no_fy (store_no,financial_year_id),
  KEY ix_store_vendor_date (vendor_id,entry_date),
  CONSTRAINT fk_store_fy FOREIGN KEY (financial_year_id) REFERENCES financial_years(id),
  CONSTRAINT fk_store_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS store_entry_details (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_entry_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_code VARCHAR(30) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  part_number VARCHAR(80) NULL,
  hsn_code VARCHAR(20) NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  rate DECIMAL(14,2) NOT NULL,
  gst_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
  base_amount DECIMAL(14,2) NOT NULL,
  discount_amount DECIMAL(14,2) NOT NULL,
  taxable_amount DECIMAL(14,2) NOT NULL,
  gst_amount DECIMAL(14,2) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  CONSTRAINT fk_store_detail_header FOREIGN KEY (store_entry_id) REFERENCES store_entries(id),
  CONSTRAINT fk_store_detail_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vendor_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  financial_year_id BIGINT UNSIGNED NOT NULL,
  payment_no VARCHAR(40) NOT NULL,
  payment_date DATE NOT NULL,
  vendor_id BIGINT UNSIGNED NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL,
  remarks VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_vendor_payment_no_fy (payment_no,financial_year_id),
  CONSTRAINT fk_vendor_payment_fy FOREIGN KEY (financial_year_id) REFERENCES financial_years(id),
  CONSTRAINT fk_vendor_payment_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vendor_payment_allocations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_payment_id BIGINT UNSIGNED NOT NULL,
  store_entry_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vendor_payment_store (vendor_payment_id,store_entry_id),
  CONSTRAINT fk_vendor_allocation_payment FOREIGN KEY (vendor_payment_id) REFERENCES vendor_payments(id),
  CONSTRAINT fk_vendor_allocation_store FOREIGN KEY (store_entry_id) REFERENCES store_entries(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO permissions(code,name,module,action) VALUES
('STORE_VIEW','View Store Entries','Store','view'),('STORE_CREATE','Create Store Entries','Store','create'),('STORE_UPDATE','Update Store Entries','Store','update'),('STORE_DELETE','Delete Store Entries','Store','delete'),
('VENDOR_PAYMENT_VIEW','View Vendor Payments','Vendor Payment','view'),('VENDOR_PAYMENT_CREATE','Create Vendor Payments','Vendor Payment','create'),('VENDOR_PAYMENT_DELETE','Delete Vendor Payments','Vendor Payment','delete'),
('OUTSTANDING_VIEW','View Vendor Outstanding','Outstanding Report','view'),('OUTSTANDING_EXPORT','Export Vendor Outstanding','Outstanding Report','export');

INSERT IGNORE INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='ADMIN';

INSERT IGNORE INTO navigation_items(title,route,icon,permission_code,sort_order) VALUES
('Store','/stores','Warehouse','STORE_VIEW',33),
('Vendor Payments','/vendor-payments','WalletCards','VENDOR_PAYMENT_VIEW',34),
('Vendor Outstanding','/reports/vendor-outstanding','FileSpreadsheet','OUTSTANDING_VIEW',35);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER emergency_contact_phone;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ot_rate_per_hour DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER monthly_salary;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS payroll_applicable TINYINT(1) NOT NULL DEFAULT 1 AFTER ot_rate_per_hour;

CREATE TABLE IF NOT EXISTS shifts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  in_time TIME NOT NULL,
  out_time TIME NOT NULL,
  working_hours DECIMAL(5,2) NOT NULL DEFAULT 8,
  description VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_attendance (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  financial_year_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  shift_id BIGINT UNSIGNED NULL,
  additional_shift_id BIGINT UNSIGNED NULL,
  attendance_type ENUM('PRESENT','PERMISSION','HALF_DAY_LEAVE','FULL_DAY_LEAVE','ABSENT') NOT NULL DEFAULT 'PRESENT',
  in_time TIME NULL,
  out_time TIME NULL,
  permission_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  ot_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  source ENUM('MANUAL','EXCEL','BIOMETRIC') NOT NULL DEFAULT 'MANUAL',
  remarks VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_employee_date (employee_id,attendance_date),
  KEY ix_attendance_date_branch (attendance_date,branch_id),
  CONSTRAINT fk_attendance_fy FOREIGN KEY(financial_year_id) REFERENCES financial_years(id),
  CONSTRAINT fk_attendance_employee FOREIGN KEY(employee_id) REFERENCES employees(id),
  CONSTRAINT fk_attendance_branch FOREIGN KEY(branch_id) REFERENCES branches(id),
  CONSTRAINT fk_attendance_shift FOREIGN KEY(shift_id) REFERENCES shifts(id),
  CONSTRAINT fk_attendance_additional_shift FOREIGN KEY(additional_shift_id) REFERENCES shifts(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS salary_advances (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  financial_year_id BIGINT UNSIGNED NOT NULL,
  advance_no VARCHAR(40) NOT NULL,
  advance_date DATE NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  recovery_month CHAR(7) NOT NULL,
  remarks VARCHAR(255) NULL,
  status ENUM('PENDING','RECOVERED') NOT NULL DEFAULT 'PENDING',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_salary_advance_no_fy (advance_no,financial_year_id),
  CONSTRAINT fk_salary_advance_fy FOREIGN KEY(financial_year_id) REFERENCES financial_years(id),
  CONSTRAINT fk_salary_advance_employee FOREIGN KEY(employee_id) REFERENCES employees(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payroll_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  financial_year_id BIGINT UNSIGNED NOT NULL,
  salary_month CHAR(7) NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  status ENUM('DRAFT','FINALIZED') NOT NULL DEFAULT 'DRAFT',
  finalized_at DATETIME NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payroll_month_branch (salary_month,branch_id),
  CONSTRAINT fk_payroll_run_fy FOREIGN KEY(financial_year_id) REFERENCES financial_years(id),
  CONSTRAINT fk_payroll_run_branch FOREIGN KEY(branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payroll_details (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payroll_run_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  month_days INT UNSIGNED NOT NULL,
  present_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  permission_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  half_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  leave_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  absent_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  payable_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  ot_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  monthly_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
  earned_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
  ot_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  advance_deduction DECIMAL(14,2) NOT NULL DEFAULT 0,
  other_earnings DECIMAL(14,2) NOT NULL DEFAULT 0,
  other_deductions DECIMAL(14,2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
  remarks VARCHAR(255) NULL,
  UNIQUE KEY uq_payroll_employee (payroll_run_id,employee_id),
  CONSTRAINT fk_payroll_detail_run FOREIGN KEY(payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_detail_employee FOREIGN KEY(employee_id) REFERENCES employees(id)
) ENGINE=InnoDB;

INSERT INTO shifts(code,name,in_time,out_time,working_hours) SELECT 'GENERAL','General Shift','09:30:00','18:30:00',8 WHERE NOT EXISTS(SELECT 1 FROM shifts WHERE code='GENERAL');
INSERT INTO shifts(code,name,in_time,out_time,working_hours) SELECT 'MORNING','Morning Shift','06:00:00','14:00:00',8 WHERE NOT EXISTS(SELECT 1 FROM shifts WHERE code='MORNING');
INSERT INTO shifts(code,name,in_time,out_time,working_hours) SELECT 'EVENING','Evening Shift','14:00:00','22:00:00',8 WHERE NOT EXISTS(SELECT 1 FROM shifts WHERE code='EVENING');

INSERT IGNORE INTO permissions(code,name,module,action) VALUES
('SHIFT_VIEW','View Shifts','Attendance & Payroll','view'),('SHIFT_CREATE','Create Shifts','Attendance & Payroll','create'),('SHIFT_UPDATE','Update Shifts','Attendance & Payroll','update'),('SHIFT_DELETE','Delete Shifts','Attendance & Payroll','delete'),
('ATTENDANCE_VIEW','View Attendance','Attendance & Payroll','view'),('ATTENDANCE_CREATE','Save Attendance','Attendance & Payroll','create'),('ATTENDANCE_IMPORT','Import Attendance','Attendance & Payroll','import'),
('SALARY_ADVANCE_VIEW','View Salary Advances','Attendance & Payroll','view'),('SALARY_ADVANCE_CREATE','Create Salary Advances','Attendance & Payroll','create'),('SALARY_ADVANCE_DELETE','Delete Salary Advances','Attendance & Payroll','delete'),
('PAYROLL_VIEW','View Payroll','Attendance & Payroll','view'),('PAYROLL_GENERATE','Generate Payroll','Attendance & Payroll','create'),('PAYROLL_FINALIZE','Finalize Payroll','Attendance & Payroll','approve'),('SALARY_REPORT_EXPORT','Export Salary Reports','Attendance & Payroll','export');
INSERT IGNORE INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='ADMIN';
INSERT INTO navigation_items(title,route,icon,permission_code,sort_order) SELECT 'Attendance & Payroll',NULL,'CalendarClock',NULL,40 WHERE NOT EXISTS(SELECT 1 FROM navigation_items WHERE title='Attendance & Payroll' AND route IS NULL);
INSERT IGNORE INTO navigation_items(parent_id,title,route,icon,permission_code,sort_order) SELECT id,'Daily Attendance','/attendance','CalendarCheck','ATTENDANCE_VIEW',1 FROM navigation_items WHERE title='Attendance & Payroll' AND route IS NULL;
INSERT IGNORE INTO navigation_items(parent_id,title,route,icon,permission_code,sort_order) SELECT id,'Salary Advance','/salary-advances','HandCoins','SALARY_ADVANCE_VIEW',2 FROM navigation_items WHERE title='Attendance & Payroll' AND route IS NULL;
INSERT IGNORE INTO navigation_items(parent_id,title,route,icon,permission_code,sort_order) SELECT id,'Payroll & Reports','/payroll','ReceiptIndianRupee','PAYROLL_VIEW',3 FROM navigation_items WHERE title='Attendance & Payroll' AND route IS NULL;
INSERT IGNORE INTO navigation_items(parent_id,title,route,icon,permission_code,sort_order) SELECT id,'Shift Master','/masters/shifts','Clock','SHIFT_VIEW',4 FROM navigation_items WHERE title='Attendance & Payroll' AND route IS NULL;
UPDATE navigation_items SET permission_code='DASHBOARD_VIEW' WHERE title='Dashboard' AND route='/';
INSERT IGNORE INTO navigation_items(title,route,icon,permission_code,sort_order) VALUES('MD Dashboard','/md-dashboard','ChartNoAxesCombined','MD_DASHBOARD_VIEW',2);
UPDATE navigation_items SET sort_order=3 WHERE title='User Guide' AND route='/user-guide';
UPDATE navigation_items SET sort_order=4 WHERE title='Help Desk' AND route='/help-desk';

CREATE TABLE IF NOT EXISTS master_code_sequences (
  master_name VARCHAR(80) PRIMARY KEY,
  last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  module_name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  record_id VARCHAR(80) NULL,
  record_display_name VARCHAR(180) NULL,
  action VARCHAR(40) NOT NULL,
  route VARCHAR(255) NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_audit_created (created_at),
  KEY ix_audit_module_action (module_name,action),
  KEY ix_audit_user (user_id),
  CONSTRAINT fk_audit_user FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Multi-company product layer. These ALTER statements intentionally live after the
-- base schema so the same file upgrades an existing single-company installation.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS account_type ENUM('TRIAL','PAID') NOT NULL DEFAULT 'PAID' AFTER status;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_started_at DATETIME NULL AFTER account_type;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at DATETIME NULL AFTER trial_started_at;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS inactive_reason VARCHAR(255) NULL AFTER trial_ends_at;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS inactive_at DATETIME NULL AFTER inactive_reason;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_users INT UNSIGNED NULL AFTER inactive_at;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_branches INT UNSIGNED NULL AFTER max_users;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_cycle ENUM('MONTHLY','ONE_TIME') NOT NULL DEFAULT 'MONTHLY' AFTER max_branches;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER billing_cycle;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_start_month DATE NULL AFTER monthly_fee;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_due_day TINYINT UNSIGNED NOT NULL DEFAULT 10 AFTER billing_start_month;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_path VARCHAR(500) NULL AFTER pincode;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_mime_type VARCHAR(120) NULL AFTER logo_path;

ALTER TABLE roles ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_id BIGINT UNSIGNED NULL AFTER company_id;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE financial_years ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS branch_id BIGINT UNSIGNED NULL AFTER company_id;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_name VARCHAR(120) NULL AFTER customer_id;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS manufacturing_year SMALLINT UNSIGNED NULL AFTER model;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(30) NULL AFTER manufacturing_year;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_number VARCHAR(80) NULL AFTER fuel_type;
ALTER TABLE uoms ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE work_pending_sub_statuses ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE document_sequences ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE job_card_complaints ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
CREATE TABLE IF NOT EXISTS job_card_vehicle_images (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  job_card_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  KEY idx_job_card_vehicle_images_job (job_card_id,deleted_at),
  CONSTRAINT fk_job_vehicle_image_company FOREIGN KEY(company_id) REFERENCES companies(id),
  CONSTRAINT fk_job_vehicle_image_job FOREIGN KEY(job_card_id) REFERENCES job_cards(id),
  CONSTRAINT fk_job_vehicle_image_user FOREIGN KEY(uploaded_by) REFERENCES users(id),
  CONSTRAINT fk_job_vehicle_image_deleted FOREIGN KEY(deleted_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS work_order_vehicle_images (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  work_order_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  KEY idx_work_order_vehicle_images_order (work_order_id,deleted_at),
  CONSTRAINT fk_wo_vehicle_image_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  CONSTRAINT fk_wo_vehicle_image_company FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS service_cost DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER work_order_type;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS labour_cost DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER service_cost;
ALTER TABLE work_order_complaints ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE work_order_spares ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE work_order_spares ADD COLUMN IF NOT EXISTS spare_source ENUM('MASTER','LOCAL_PURCHASE') NOT NULL DEFAULT 'MASTER' AFTER work_order_id;
ALTER TABLE work_order_spares MODIFY COLUMN product_id BIGINT UNSIGNED NULL;
ALTER TABLE work_order_spares MODIFY COLUMN uom_id BIGINT UNSIGNED NULL;
ALTER TABLE work_order_attachments ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
CREATE TABLE IF NOT EXISTS work_order_vehicle_images (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  work_order_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  KEY idx_work_order_vehicle_images_order (work_order_id,deleted_at)
) ENGINE=InnoDB;
ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE store_entries ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE store_entry_details ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE vendor_payment_allocations ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER vendor_payment_id;
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE payroll_details ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE master_code_sequences ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER master_name;
ALTER TABLE help_desk_tickets ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE help_desk_tickets ADD COLUMN IF NOT EXISTS from_email VARCHAR(150) NULL AFTER user_id;
ALTER TABLE help_desk_tickets ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(150) NULL AFTER from_email;
ALTER TABLE help_desk_tickets ADD COLUMN IF NOT EXISTS mail_status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending' AFTER resolution;
ALTER TABLE help_desk_tickets ADD COLUMN IF NOT EXISTS mail_message_id VARCHAR(255) NULL AFTER mail_status;
ALTER TABLE help_desk_tickets ADD COLUMN IF NOT EXISTS mail_error VARCHAR(500) NULL AFTER mail_message_id;

CREATE TABLE IF NOT EXISTS help_desk_attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  ticket_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_helpdesk_attachment_ticket(ticket_id),
  KEY idx_helpdesk_attachment_company(company_id),
  CONSTRAINT fk_helpdesk_attachment_company FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_helpdesk_attachment_ticket FOREIGN KEY(ticket_id) REFERENCES help_desk_tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_helpdesk_attachment_user FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS branch_id BIGINT UNSIGNED NULL AFTER company_id;

CREATE TABLE IF NOT EXISTS user_branch_access (
  user_id BIGINT UNSIGNED NOT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id,branch_id),
  CONSTRAINT fk_user_branch_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_branch_access_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_branch_access_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS company_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  old_status ENUM('active','inactive') NULL,
  new_status ENUM('active','inactive') NOT NULL,
  reason VARCHAR(255) NULL,
  changed_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_company_status_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_company_status_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS platform_sequences (
  sequence_name VARCHAR(50) PRIMARY KEY,
  last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS platform_profile (
  id TINYINT UNSIGNED PRIMARY KEY,
  organization_name VARCHAR(180) NOT NULL,
  legal_name VARCHAR(180) NULL,
  gstin VARCHAR(15) NULL,
  pan VARCHAR(10) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  support_email VARCHAR(150) NULL,
  website VARCHAR(180) NULL,
  address_line1 VARCHAR(180) NULL,
  address_line2 VARCHAR(180) NULL,
  city VARCHAR(80) NULL,
  state VARCHAR(80) NULL,
  pincode VARCHAR(10) NULL,
  receipt_prefix VARCHAR(30) NOT NULL DEFAULT 'PAYMENT RECEIPT',
  receipt_footer VARCHAR(500) NULL,
  logo_path VARCHAR(500) NULL,
  logo_mime_type VARCHAR(120) NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_platform_profile_user FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE platform_profile ADD COLUMN IF NOT EXISTS support_email VARCHAR(150) NULL AFTER email;

CREATE TABLE IF NOT EXISTS platform_products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  tagline VARCHAR(200) NULL,
  product_url VARCHAR(500) NULL,
  logo_path VARCHAR(500) NULL,
  logo_mime_type VARCHAR(120) NULL,
  display_order INT NOT NULL DEFAULT 0,
  open_new_tab TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_platform_products_code (code),
  KEY idx_platform_products_display (status,display_order,id),
  CONSTRAINT fk_platform_products_created_by FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_platform_products_updated_by FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO platform_profile(id,organization_name,legal_name,receipt_footer)
VALUES(1,'Ara Garage','ARA Softwares','Thank you for your payment. This is a system-generated receipt.');
UPDATE platform_profile SET support_email=COALESCE(NULLIF(support_email,''),NULLIF(email,'')) WHERE id=1;

CREATE TABLE IF NOT EXISTS company_billing_rates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  effective_from_month DATE NOT NULL,
  monthly_fee DECIMAL(14,2) NOT NULL,
  due_day TINYINT UNSIGNED NOT NULL DEFAULT 10,
  remarks VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_billing_rate_month (company_id,effective_from_month),
  KEY idx_company_billing_rates_company (company_id,effective_from_month),
  CONSTRAINT fk_company_billing_rates_company FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_company_billing_rates_user FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS company_monthly_dues (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  billing_month DATE NOT NULL,
  due_date DATE NOT NULL,
  due_amount DECIMAL(14,2) NOT NULL,
  paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_monthly_due (company_id,billing_month),
  KEY idx_company_dues_status (company_id,status,billing_month),
  CONSTRAINT fk_company_dues_company FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS company_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_no VARCHAR(30) NOT NULL UNIQUE,
  company_id BIGINT UNSIGNED NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_mode ENUM('CASH','UPI','BANK_TRANSFER','CHEQUE','CARD','OTHER') NOT NULL DEFAULT 'BANK_TRANSFER',
  reference_number VARCHAR(100) NULL,
  remarks VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_company_payments_company_date (company_id,payment_date),
  KEY idx_company_payments_deleted (deleted_at),
  CONSTRAINT fk_company_payments_company FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_company_payments_created_by FOREIGN KEY(created_by) REFERENCES users(id),
  CONSTRAINT fk_company_payments_updated_by FOREIGN KEY(updated_by) REFERENCES users(id),
  CONSTRAINT fk_company_payments_deleted_by FOREIGN KEY(deleted_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS company_payment_allocations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  due_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_payment_due (payment_id,due_id),
  KEY idx_payment_allocations_company (company_id),
  CONSTRAINT fk_payment_allocations_company FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_allocations_payment FOREIGN KEY(payment_id) REFERENCES company_payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_allocations_due FOREIGN KEY(due_id) REFERENCES company_monthly_dues(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS company_payment_attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_payment_attachments_payment (payment_id,deleted_at),
  KEY idx_payment_attachments_company (company_id),
  CONSTRAINT fk_payment_attachments_company FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_attachments_payment FOREIGN KEY(payment_id) REFERENCES company_payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_attachments_uploaded_by FOREIGN KEY(uploaded_by) REFERENCES users(id),
  CONSTRAINT fk_payment_attachments_deleted_by FOREIGN KEY(deleted_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_notification_states (
  user_id BIGINT UNSIGNED NOT NULL,
  notification_key VARCHAR(190) NOT NULL,
  read_at DATETIME NULL,
  acknowledged_at DATETIME NULL,
  dismissed_until DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,notification_key),
  KEY idx_notification_state_user_read(user_id,read_at),
  CONSTRAINT fk_notification_state_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO roles (code,name,description,is_system,company_id) VALUES
('SUPER_ADMIN','Super Administrator','ARA product owner access',1,NULL),
('COMPANY_ADMIN','Company Administrator','Full access within one company',1,NULL);

-- Backfill all existing single-company data into the original Ara Garage tenant.
SET @default_company_id := (SELECT id FROM companies ORDER BY id LIMIT 1);
DELETE x FROM financial_years x JOIN financial_years y ON y.code=x.code AND y.company_id=@default_company_id AND y.id<>x.id WHERE x.company_id IS NULL;
DELETE x FROM uoms x JOIN uoms y ON y.code=x.code AND y.company_id=@default_company_id AND y.id<>x.id WHERE x.company_id IS NULL;
DELETE x FROM work_pending_sub_statuses x JOIN work_pending_sub_statuses y ON y.code=x.code AND y.company_id=@default_company_id AND y.id<>x.id WHERE x.company_id IS NULL;
DELETE x FROM shifts x JOIN shifts y ON y.code=x.code AND y.company_id=@default_company_id AND y.id<>x.id WHERE x.company_id IS NULL;
UPDATE users u JOIN roles r ON r.id=u.role_id LEFT JOIN branches b ON b.id=u.branch_id SET u.company_id=COALESCE(b.company_id,@default_company_id) WHERE u.company_id IS NULL AND r.code<>'SUPER_ADMIN';
UPDATE users u JOIN roles r ON r.id=u.role_id SET u.company_id=NULL,u.branch_id=NULL WHERE r.code='SUPER_ADMIN';
UPDATE roles SET company_id=@default_company_id WHERE company_id IS NULL AND code NOT IN ('SUPER_ADMIN','COMPANY_ADMIN','ADMIN','USER');
UPDATE designations SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE employees e JOIN branches b ON b.id=e.branch_id SET e.company_id=b.company_id WHERE e.company_id IS NULL;
UPDATE customers c JOIN (SELECT customer_id, MIN(branch_id) branch_id FROM job_cards GROUP BY customer_id) j ON j.customer_id=c.id SET c.branch_id=j.branch_id WHERE c.branch_id IS NULL;
UPDATE vehicles v JOIN (SELECT vehicle_id, MIN(branch_id) branch_id FROM job_cards GROUP BY vehicle_id) j ON j.vehicle_id=v.id SET v.branch_id=j.branch_id WHERE v.branch_id IS NULL;
UPDATE customers SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE vendors SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE financial_years SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE vehicles SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE uoms SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE products SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE work_pending_sub_statuses SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE shifts SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE document_sequences SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE job_cards j JOIN branches b ON b.id=j.branch_id SET j.company_id=b.company_id WHERE j.company_id IS NULL;
UPDATE job_card_complaints d JOIN job_cards h ON h.id=d.job_card_id SET d.company_id=h.company_id WHERE d.company_id IS NULL;
UPDATE work_orders d JOIN job_cards h ON h.id=d.job_card_id SET d.company_id=h.company_id WHERE d.company_id IS NULL;
UPDATE work_order_complaints d JOIN work_orders h ON h.id=d.work_order_id SET d.company_id=h.company_id WHERE d.company_id IS NULL;
UPDATE work_order_spares d JOIN work_orders h ON h.id=d.work_order_id SET d.company_id=h.company_id WHERE d.company_id IS NULL;
UPDATE work_order_attachments d JOIN work_orders h ON h.id=d.work_order_id SET d.company_id=h.company_id WHERE d.company_id IS NULL;
UPDATE payment_receipts d JOIN job_cards h ON h.id=d.job_card_id SET d.company_id=h.company_id WHERE d.company_id IS NULL;
UPDATE store_entries SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE store_entry_details d JOIN store_entries h ON h.id=d.store_entry_id SET d.company_id=h.company_id WHERE d.company_id IS NULL;
UPDATE vendor_payments SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE vendor_payment_allocations d JOIN vendor_payments h ON h.id=d.vendor_payment_id SET d.company_id=h.company_id WHERE d.company_id IS NULL;
UPDATE daily_attendance d JOIN branches b ON b.id=d.branch_id SET d.company_id=b.company_id WHERE d.company_id IS NULL;
UPDATE salary_advances d JOIN employees e ON e.id=d.employee_id SET d.company_id=e.company_id WHERE d.company_id IS NULL;
UPDATE payroll_runs d JOIN branches b ON b.id=d.branch_id SET d.company_id=b.company_id WHERE d.company_id IS NULL;
UPDATE payroll_details d JOIN payroll_runs h ON h.id=d.payroll_run_id SET d.company_id=h.company_id WHERE d.company_id IS NULL;
UPDATE master_code_sequences SET company_id=@default_company_id WHERE company_id IS NULL;
UPDATE help_desk_tickets d JOIN users u ON u.id=d.user_id SET d.company_id=u.company_id WHERE d.company_id IS NULL;
UPDATE audit_logs d JOIN users u ON u.id=d.user_id SET d.company_id=u.company_id WHERE d.company_id IS NULL;

INSERT IGNORE INTO permissions(code,name,module,action) VALUES
('AUDIT_VIEW','View Audit Report','Reports','view'),
('AUDIT_EXPORT','Export Audit Report','Reports','export'),
('ENTRY_REPORT_VIEW','View Entry Reports','Reports','view'),
('ENTRY_REPORT_EXPORT','Export Entry Reports','Reports','export');
INSERT IGNORE INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='ADMIN';
INSERT INTO navigation_items(title,route,icon,permission_code,sort_order)
SELECT 'Reports',NULL,'FileBarChart',NULL,50
WHERE NOT EXISTS(SELECT 1 FROM navigation_items WHERE title='Reports' AND route IS NULL);
INSERT IGNORE INTO navigation_items(parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Entry Reports','/reports/entries','TableProperties','ENTRY_REPORT_VIEW',1 FROM navigation_items WHERE title='Reports' AND route IS NULL;
INSERT IGNORE INTO navigation_items(parent_id,title,route,icon,permission_code,sort_order)
SELECT id,'Audit Report','/reports/audit','History','AUDIT_VIEW',2 FROM navigation_items WHERE title='Reports' AND route IS NULL;
