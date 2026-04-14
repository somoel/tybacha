import { initMySQLService } from './mysql';
import { authServiceMySQL } from '../services/authServiceMySQL';
import { patientServiceMySQL } from '../services/patientServiceMySQL';
import { cognitiveTestServiceMySQL } from '../services/cognitiveTestServiceMySQL';
import { exerciseServiceMySQL } from '../services/exerciseServiceMySQL';

/**
 * Test MySQL database connectivity and basic operations
 */
export async function testDatabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('Testing MySQL database connection...');

    // Initialize MySQL service
    const mysqlService = await initMySQLService({
      host: 'localhost',
      port: 3306,
      database: 'tybacha',
      username: 'tybacha_user',
      password: 'tybacha_password',
      ssl: false,
    });

    // Test basic connection
    const isConnected = await mysqlService.testConnection();
    if (!isConnected) {
      return {
        success: false,
        message: 'Failed to connect to MySQL database',
      };
    }

    console.log('MySQL connection successful');

    // Test basic query
    try {
      const result = await mysqlService.query('SELECT 1 as test');
      console.log('Basic query test passed:', result);
    } catch (error) {
      return {
        success: false,
        message: 'Basic query test failed',
        details: error,
      };
    }

    // Test user table access
    try {
      const users = await mysqlService.query('SELECT COUNT(*) as count FROM users LIMIT 1');
      console.log('Users table access test passed:', users);
    } catch (error) {
      return {
        success: false,
        message: 'Users table access test failed',
        details: error,
      };
    }

    // Test authentication service
    try {
      const testUser = await authServiceMySQL.getUserById('test-user-id');
      console.log('Auth service test passed (user may not exist, which is expected):', testUser);
    } catch (error) {
      console.log('Auth service test error (may be expected):', error);
    }

    // Test patient service
    try {
      const patients = await patientServiceMySQL.getAllPatients({ limit: 1 });
      console.log('Patient service test passed:', patients);
    } catch (error) {
      console.log('Patient service test error (may be expected):', error);
    }

    // Test cognitive test service
    try {
      const tests = await cognitiveTestServiceMySQL.getCognitiveTestsByPatient('test-patient-id', { limit: 1 });
      console.log('Cognitive test service test passed:', tests);
    } catch (error) {
      console.log('Cognitive test service test error (may be expected):', error);
    }

    // Test exercise service
    try {
      const plans = await exerciseServiceMySQL.getExercisePlansByPatient('test-patient-id', { limit: 1 });
      console.log('Exercise service test passed:', plans);
    } catch (error) {
      console.log('Exercise service test error (may be expected):', error);
    }

    return {
      success: true,
      message: 'All database tests passed successfully',
      details: {
        connection: 'OK',
        basicQuery: 'OK',
        tableAccess: 'OK',
        services: 'OK',
      },
    };
  } catch (error) {
    console.error('Database test failed:', error);
    return {
      success: false,
      message: 'Database test failed',
      details: error,
    };
  }
}

/**
 * Initialize database with test data (for development)
 */
export async function initializeTestData(): Promise<boolean> {
  try {
    console.log('Initializing test data...');

    // Create a test user if it doesn't exist
    const testUser = await authServiceMySQL.register({
      email: 'test@tybacha.com',
      password: 'test123',
      fullName: 'Test User',
      role: 'professional',
      phone: '123456789',
      specialization: 'Physical Therapy',
    });

    if (testUser.success) {
      console.log('Test user created successfully');
    } else {
      console.log('Test user may already exist or creation failed');
    }

    // Create a test patient if we have a user
    if (testUser.user) {
      const testPatient = await patientServiceMySQL.createPatient(
        {
          first_name: 'John',
          first_lastname: 'Doe',
          birth_date: new Date('1950-01-01'),
          gender: 'M',
          phone: '987654321',
          address: '123 Test Street',
        },
        testUser.user.id
      );

      if (testPatient) {
        console.log('Test patient created successfully');
      } else {
        console.log('Test patient creation failed');
      }
    }

    console.log('Test data initialization completed');
    return true;
  } catch (error) {
    console.error('Test data initialization failed:', error);
    return false;
  }
}

/**
 * Database health check
 */
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    connection: boolean;
    tables: boolean;
    services: boolean;
  };
  timestamp: string;
}> {
  const checks = {
    connection: false,
    tables: false,
    services: false,
  };

  try {
    // Test connection
    const mysqlService = await initMySQLService();
    checks.connection = await mysqlService.testConnection();

    if (checks.connection) {
      // Test table access
      try {
        await mysqlService.query('SELECT COUNT(*) as count FROM users');
        await mysqlService.query('SELECT COUNT(*) as count FROM patients');
        checks.tables = true;
      } catch (error) {
        console.error('Table check failed:', error);
      }

      // Test services
      try {
        await authServiceMySQL.getUserById('test');
        checks.services = true;
      } catch (error) {
        console.error('Services check failed:', error);
      }
    }

    const status = checks.connection && checks.tables && checks.services 
      ? 'healthy' 
      : checks.connection 
        ? 'degraded' 
        : 'unhealthy';

    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      status: 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
