import { initMySQLService } from './mysql';
import { getDatabaseConfig } from '../config/database';
import { authServiceMySQL } from '../services/authServiceMySQL';
import { patientServiceMySQL } from '../services/patientServiceMySQL';

/**
 * Integration test for the complete MySQL backend system
 */
export async function runIntegrationTests(): Promise<{
  success: boolean;
  results: {
    databaseConnection: boolean;
    authentication: boolean;
    patientManagement: boolean;
    cognitiveTests: boolean;
    exercisePlans: boolean;
  };
  errors: string[];
}> {
  const results = {
    databaseConnection: false,
    authentication: false,
    patientManagement: false,
    cognitiveTests: false,
    exercisePlans: false,
  };
  const errors: string[] = [];

  console.log('Starting integration tests...');

  try {
    // Test 1: Database Connection
    console.log('Testing database connection...');
    const mysqlService = await initMySQLService(getDatabaseConfig());
    const isConnected = await mysqlService.testConnection();
    
    if (isConnected) {
      results.databaseConnection = true;
      console.log('Database connection: OK');
    } else {
      errors.push('Database connection failed');
      console.log('Database connection: FAILED');
    }

    // Test 2: Authentication
    console.log('Testing authentication...');
    try {
      const authResult = await authServiceMySQL.login({
        email: 'admin@tybacha.com',
        password: 'admin123',
        rememberMe: false,
      });

      if (authResult.success && authResult.user) {
        results.authentication = true;
        console.log('Authentication: OK');
      } else {
        errors.push('Authentication failed');
        console.log('Authentication: FAILED');
      }
    } catch (error) {
      errors.push(`Authentication error: ${error}`);
      console.log('Authentication: ERROR');
    }

    // Test 3: Patient Management
    console.log('Testing patient management...');
    try {
      const patients = await patientServiceMySQL.getAllPatients({ limit: 5 });
      results.patientManagement = true;
      console.log('Patient management: OK');
    } catch (error) {
      errors.push(`Patient management error: ${error}`);
      console.log('Patient management: FAILED');
    }

    // Test 4: Cognitive Tests (basic query test)
    console.log('Testing cognitive tests...');
    try {
      const testQuery = await mysqlService.query('SELECT COUNT(*) as count FROM cognitive_tests LIMIT 1');
      results.cognitiveTests = true;
      console.log('Cognitive tests: OK');
    } catch (error) {
      errors.push(`Cognitive tests error: ${error}`);
      console.log('Cognitive tests: FAILED');
    }

    // Test 5: Exercise Plans (basic query test)
    console.log('Testing exercise plans...');
    try {
      const planQuery = await mysqlService.query('SELECT COUNT(*) as count FROM exercise_plans LIMIT 1');
      results.exercisePlans = true;
      console.log('Exercise plans: OK');
    } catch (error) {
      errors.push(`Exercise plans error: ${error}`);
      console.log('Exercise plans: FAILED');
    }

  } catch (error) {
    errors.push(`Integration test error: ${error}`);
    console.log('Integration test: FAILED');
  }

  const success = Object.values(results).every(result => result);

  console.log('\n=== Integration Test Results ===');
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

/**
 * Quick health check for the mobile app
 */
export async function quickHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details: any;
}> {
  try {
    const mysqlService = await initMySQLService(getDatabaseConfig());
    const isConnected = await mysqlService.testConnection();

    if (isConnected) {
      // Test basic query
      await mysqlService.query('SELECT 1');
      
      return {
        status: 'healthy',
        message: 'All systems operational',
        details: {
          backend: 'connected',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      return {
        status: 'unhealthy',
        message: 'Cannot connect to backend',
        details: {
          backend: 'disconnected',
          database: 'unknown',
          timestamp: new Date().toISOString(),
        },
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Health check failed: ${error}`,
      details: {
        backend: 'error',
        database: 'unknown',
        timestamp: new Date().toISOString(),
        error: error,
      },
    };
  }
}
