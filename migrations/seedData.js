// migrations/seedAdmin.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  try {
    console.log('Starting admin seeding...');

    // Ensure Super Admin role exists
    await db.execute(`
      INSERT IGNORE INTO roles (name, description, permissions) VALUES 
      ('Super Admin', 'Full system access', '["all", "user_management", "system_config", "audit_logs"]'),
      ('HR Admin', 'HR management access', '["hr_read", "hr_write", "employee_read", "employee_write", "reports_generate", "payroll_access"]'),
      ('Manager', 'Department management access', '["employee_read", "team_management", "performance_review", "leave_approval"]'),
      ('Team Lead', 'Team leadership access', '["team_read", "task_assignment", "performance_tracking"]'),
      ('Employee', 'Basic employee access', '["profile_read", "profile_update", "leave_request", "timesheet_entry"]'),
      ('HR Viewer', 'Read-only HR access', '["hr_read", "employee_read", "reports_view"]'),
      ('Contractor', 'Limited contractor access', '["profile_read", "timesheet_entry"]')
    `);

    // Create Administration department if it doesn't exist
    await db.execute(`
      INSERT IGNORE INTO departments (name, description) VALUES 
      ('Administration', 'Executive leadership and administrative functions'),
      ('Human Resources', 'HR operations, recruitment, and employee management'),
      ('Information Technology', 'IT infrastructure, software development, and technical support'),
      ('Finance', 'Financial planning, accounting, and budget management'),
      ('Operations', 'Core business operations and process management'),
      ('Marketing', 'Brand management, digital marketing, and customer acquisition'),
      ('Sales', 'Sales operations, client relationships, and revenue generation'),
      ('Research & Development', 'Product development, innovation, and research initiatives'),
      ('Customer Support', 'Customer service and technical support'),
      ('Legal & Compliance', 'Legal affairs, compliance, and risk management')
    `);

    // Get Administration department ID
    const [adminDept] = await db.execute(
      'SELECT id FROM departments WHERE name = ?', 
      ['Administration']
    );
    
    if (adminDept.length === 0) {
      throw new Error('Administration department not found');
    }

    // Create admin individual data
    const adminJoiningDate = '2023-01-01';
    await db.execute(`
      INSERT IGNORE INTO individual_data (
        employee_id, 
        email,
        employee_type, 
        time_type, 
        joining_date, 
        hire_date, 
        job_profile_progression_model_designation,
        department_id,
        status
      ) VALUES (
        'ADM001', 
        'admin@company.com',
        'Permanent', 
        'Full-time', 
        ?, 
        ?, 
        'System Administrator',
        ?,
        'Active'
      )
    `, [adminJoiningDate, adminJoiningDate, adminDept[0].id]);

    // Get the admin individual_data record
    const [adminIndividualData] = await db.execute(
      'SELECT id FROM individual_data WHERE employee_id = ?', 
      ['ADM001']
    );
    
    if (adminIndividualData.length === 0) {
      throw new Error('Failed to create admin individual data');
    }
    
    const adminIndividualId = adminIndividualData[0].id;

    // Create admin job details
    await db.execute(`
      INSERT IGNORE INTO job_details (
        individual_data_id,
        job,
        business_title,
        job_profile,
        job_family,
        management_level,
        time_type,
        location,
        email,
        skills
      ) VALUES (
        ?,
        'System Administrator',
        'Super Administrator',
        'IT Administration',
        'Information Technology',
        'C-Level',
        'Full-time',
        'Head Office',
        'admin@company.com',
        '["system_administration", "database_management", "security"]'
      )
    `, [adminIndividualId]);

    // Create admin personal details
    await db.execute(`
      INSERT IGNORE INTO personal_details (
        individual_data_id,
        gender,
        email
      ) VALUES (
        ?,
        'Prefer not to say',
        'admin@company.com'
      )
    `, [adminIndividualId]);

    // Create admin user account with password: ADM001@2023-01-01
    const defaultPassword = `ADM001@${adminJoiningDate}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    
    // Get Super Admin role ID
    const [superAdminRole] = await db.execute(
      'SELECT id FROM roles WHERE name = ?', 
      ['Super Admin']
    );
    
    if (superAdminRole.length === 0) {
      throw new Error('Super Admin role not found');
    }

    await db.execute(`
      INSERT IGNORE INTO users (
        employee_id, 
        individual_data_id, 
        email, 
        password_hash, 
        role_id,
        is_active
      ) VALUES (
        'ADM001', 
        ?, 
        'admin@company.com', 
        ?, 
        ?,
        true
      )
    `, [adminIndividualId, hashedPassword, superAdminRole[0].id]);

    // Set admin as department head
    await db.execute(`
      UPDATE departments 
      SET head_employee_id = ?
      WHERE name = 'Administration'
    `, [adminIndividualId]);

    console.log('✅ Admin seeding completed successfully!');
    console.log('\n🔐 Admin login credentials:');
    console.log('═══════════════════════════════════════');
    console.log('Super Admin:');
    console.log(`  Employee ID: ADM001`);
    console.log(`  Password: ${defaultPassword}`);
    console.log(`  Email: admin@company.com`);
    console.log('═══════════════════════════════════════');
    console.log('\n💡 Change this password after first login!');
    
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

module.exports = seedAdmin;