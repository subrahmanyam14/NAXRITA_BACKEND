// migrations/createTables.js
const db = require('../config/database');

const createTables = async () => {
  try {
    // Create roles table (no dependencies)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        permissions JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create departments table (no dependencies initially)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        head_employee_id INT NULL, -- Will be added as FK later
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create individual_data table (depends on departments only)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS individual_data (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        employee_type ENUM('Permanent', 'Contract', 'Temporary', 'Intern'),
        time_type ENUM('Full-time', 'Part-time', 'Contract', 'Intern'),
        default_weekly_hours DECIMAL(4,2) DEFAULT 40.00,
        scheduled_weekly_hours DECIMAL(4,2),
        joining_date DATE NOT NULL,
        hire_date DATE NOT NULL,
        job_profile_progression_model_designation VARCHAR(100),
        department_id INT,
        manager_id INT NULL, -- Self-referencing for reporting structure
        status ENUM('Active', 'Inactive', 'Terminated', 'On Leave') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id),
        FOREIGN KEY (manager_id) REFERENCES individual_data(id), -- Self-referencing FK
        INDEX idx_employee_id (employee_id),
        INDEX idx_email (email),
        INDEX idx_hire_date (hire_date),
        INDEX idx_department_id (department_id),
        INDEX idx_manager_id (manager_id)
      )
    `);

    // Create job_details table (depends on individual_data and departments)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS job_details (
        id INT PRIMARY KEY AUTO_INCREMENT,
        individual_data_id INT UNIQUE NOT NULL, -- One-to-one relationship
        supervisory_organization VARCHAR(100),
        job VARCHAR(100) NOT NULL,
        business_title VARCHAR(150),
        job_profile VARCHAR(100),
        job_family VARCHAR(100),
        management_level ENUM('Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level'),
        time_type ENUM('Full-time', 'Part-time', 'Contract', 'Intern'),
        location VARCHAR(200),
        phone VARCHAR(20),
        email VARCHAR(100),
        work_address TEXT,
        skills JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (individual_data_id) REFERENCES individual_data(id) ON DELETE CASCADE,
        INDEX idx_job_profile (job_profile),
        INDEX idx_management_level (management_level)
      )
    `);

    // Create personal_details table (depends on individual_data)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS personal_details (
        id INT PRIMARY KEY AUTO_INCREMENT,
        individual_data_id INT UNIQUE NOT NULL,
        gender ENUM('Male', 'Female', 'Other', 'Prefer not to say'),
        date_of_birth DATE,
        country_birth VARCHAR(100),
        marital_status ENUM('Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'),
        citizenship_status VARCHAR(100),
        nationality VARCHAR(100),
        pan_id VARCHAR(20),
        adhaar VARCHAR(20),
        address TEXT,
        mobile VARCHAR(20),
        profile_pic VARCHAR(255),
        email VARCHAR(100),
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (individual_data_id) REFERENCES individual_data(id) ON DELETE CASCADE,
        INDEX idx_pan_id (pan_id),
        INDEX idx_adhaar (adhaar)
      )
    `);

    // Create users table for authentication (depends on roles and individual_data)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id VARCHAR(50) UNIQUE NOT NULL, -- For login (references individual_data.employee_id)
        individual_data_id INT UNIQUE NOT NULL, -- One-to-one with individual_data
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role_id INT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id),
        FOREIGN KEY (employee_id) REFERENCES individual_data(employee_id) ON DELETE CASCADE,
        FOREIGN KEY (email) REFERENCES individual_data(email) ON DELETE CASCADE,
        FOREIGN KEY (individual_data_id) REFERENCES individual_data(id) ON DELETE CASCADE,
        INDEX idx_employee_id (employee_id),
        INDEX idx_email (email),
        INDEX idx_role_id (role_id)
      )
    `);

    // Create login_sessions table (depends on users)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS login_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        logout_time TIMESTAMP NULL,
        device_info JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        session_token VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_session_token (session_token),
        INDEX idx_login_time (login_time)
      )
    `);

    // Add department head foreign key constraint (after individual_data exists)
    const [fkDeptHead] = await db.execute(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.TABLE_CONSTRAINTS 
      WHERE TABLE_NAME = 'departments' 
        AND CONSTRAINT_SCHEMA = DATABASE()
        AND CONSTRAINT_NAME = 'fk_dept_head'
    `);
    if (fkDeptHead.length === 0) {
      await db.execute(`
        ALTER TABLE departments 
        ADD CONSTRAINT fk_dept_head 
        FOREIGN KEY (head_employee_id) REFERENCES individual_data(id)
      `);
    }

    console.log('✅ All tables and constraints created successfully!');
    
    // Display relationship summary
    console.log('\n📋 Table Relationships Summary:');
    console.log('1. roles → users (one-to-many)');
    console.log('2. departments → individual_data (one-to-many)');
    console.log('3. individual_data → individual_data (self-referencing for manager hierarchy)');
    console.log('4. individual_data → job_details (one-to-one)');
    console.log('5. individual_data → personal_details (one-to-one)');
    console.log('6. individual_data → users (one-to-one via both employee_id and individual_data_id)');
    console.log('7. individual_data → departments.head_employee_id (one-to-one)');
    console.log('8. users → login_sessions (one-to-many)');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
};

module.exports = createTables;