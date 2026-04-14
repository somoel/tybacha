const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

/**
 * Simple integration test for the MySQL backend
 */
async function runIntegrationTests() {
  console.log('Starting integration tests...\n');

  const results = {
    databaseConnection: false,
    authentication: false,
    patientManagement: false,
    cognitiveTests: false,
    exercisePlans: false,
  };
  const errors = [];

  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tybacha',
  };

  let db;

  try {
    // Test 1: Database Connection
    console.log('1. Testing database connection...');
    db = await mysql.createConnection(dbConfig);
    await db.execute('SELECT 1');
    results.databaseConnection = true;
    console.log('   Database connection: OK\n');
  } catch (error) {
    errors.push(`Database connection failed: ${error.message}`);
    console.log('   Database connection: FAILED\n');
  }

  // Test 2: Authentication
  console.log('2. Testing authentication...');
  try {
    const [users] = await db.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      ['admin@tybacha.com']
    );

    if (users.length > 0) {
      const user = users[0];
      const isValidPassword = await bcrypt.compare('admin123', user.password_hash);
      
      if (isValidPassword) {
        results.authentication = true;
        console.log('   Authentication: OK\n');
      } else {
        errors.push('Invalid password for admin user');
        console.log('   Authentication: FAILED - Invalid password\n');
      }
    } else {
      errors.push('Admin user not found');
      console.log('   Authentication: FAILED - User not found\n');
    }
  } catch (error) {
    errors.push(`Authentication error: ${error.message}`);
    console.log('   Authentication: FAILED\n');
  }

  // Test 3: Patient Management
  console.log('3. Testing patient management...');
  try {
    const [patients] = await db.execute(
      'SELECT COUNT(*) as count FROM patients WHERE is_active = TRUE'
    );
    results.patientManagement = true;
    console.log(`   Patient management: OK (${patients[0].count} patients)\n`);
  } catch (error) {
    errors.push(`Patient management error: ${error.message}`);
    console.log('   Patient management: FAILED\n');
  }

  // Test 4: Cognitive Tests
  console.log('4. Testing cognitive tests...');
  try {
    const [tests] = await db.execute(
      'SELECT COUNT(*) as count FROM cognitive_tests'
    );
    results.cognitiveTests = true;
    console.log(`   Cognitive tests: OK (${tests[0].count} tests)\n`);
  } catch (error) {
    errors.push(`Cognitive tests error: ${error.message}`);
    console.log('   Cognitive tests: FAILED\n');
  }

  // Test 5: Exercise Plans
  console.log('5. Testing exercise plans...');
  try {
    const [plans] = await db.execute(
      'SELECT COUNT(*) as count FROM exercise_plans WHERE is_active = TRUE'
    );
    results.exercisePlans = true;
    console.log(`   Exercise plans: OK (${plans[0].count} plans)\n`);
  } catch (error) {
    errors.push(`Exercise plans error: ${error.message}`);
    console.log('   Exercise plans: FAILED\n');
  }

  // Close database connection
  if (db) {
    await db.end();
  }

  // Results
  const success = Object.values(results).every(result => result);

  console.log('=== Integration Test Results ===');
  console.log(`Overall: ${success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Database Connection: ${results.databaseConnection ? 'OK' : 'FAILED'}`);
  console.log(`Authentication: ${results.authentication ? 'OK' : 'FAILED'}`);
  console.log(`Patient Management: ${results.patientManagement ? 'OK' : 'FAILED'}`);
  console.log(`Cognitive Tests: ${results.cognitiveTests ? 'OK' : 'FAILED'}`);
  console.log(`Exercise Plans: ${results.exercisePlans ? 'OK' : 'FAILED'}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(error => console.log(`- ${error}`));
  }

  return {
    success,
    results,
    errors,
  };
}

// Run the tests
runIntegrationTests()
  .then(results => {
    if (results.success) {
      console.log('\nAll tests passed! The system is ready for use.');
      process.exit(0);
    } else {
      console.log('\nSome tests failed. Check the errors above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Integration test error:', error);
    process.exit(1);
  });
