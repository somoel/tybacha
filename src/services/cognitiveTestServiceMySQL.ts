import { getMySQLService } from '../lib/mysql';
import type {
    CognitiveTest,
    PaginatedResponse,
    PatientProgress,
    ProgressTestType,
    QueryOptions,
    TestType
} from '../types/database.types';

export class CognitiveTestServiceMySQL {
  private mysql = getMySQLService();

  /**
   * Create a new cognitive test
   */
  async createCognitiveTest(testData: {
    patient_id: string;
    test_type: TestType;
    score?: number;
    max_score: number;
    interpretation?: string;
    observations?: string;
    tested_by: string;
    test_date?: Date;
  }): Promise<CognitiveTest | null> {
    try {
      const result = await this.mysql.execute<{ insertId: string }>(
        `INSERT INTO cognitive_tests (
          patient_id, test_type, score, max_score, interpretation, 
          observations, tested_by, test_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testData.patient_id,
          testData.test_type,
          testData.score || null,
          testData.max_score,
          testData.interpretation || null,
          testData.observations || null,
          testData.tested_by,
          testData.test_date?.toISOString() || new Date().toISOString(),
        ]
      );

      const testId = result.insertId;
      if (!testId) return null;

      // Return the created test
      return await this.getCognitiveTestById(String(testId));
    } catch (error) {
      console.error('Create cognitive test error:', error);
      return null;
    }
  }

  /**
   * Get cognitive test by ID
   */
  async getCognitiveTestById(testId: string): Promise<CognitiveTest | null> {
    try {
      const tests = await this.mysql.query<CognitiveTest>(
        'SELECT * FROM cognitive_tests WHERE id = ?',
        [testId]
      );
      return tests.length > 0 ? tests[0] : null;
    } catch (error) {
      console.error('Get cognitive test error:', error);
      return null;
    }
  }

  /**
   * Get all cognitive tests for a patient
   */
  async getCognitiveTestsByPatient(
    patientId: string, 
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<CognitiveTest>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'test_date',
        sortOrder = 'DESC',
        filters = {},
      } = options;

      let whereClause = 'WHERE patient_id = ?';
      const params: any[] = [patientId];

      // Apply filters
      if (filters.test_type) {
        whereClause += ' AND test_type = ?';
        params.push(filters.test_type);
      }

      if (filters.date_from) {
        whereClause += ' AND test_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND test_date <= ?';
        params.push(filters.date_to);
      }

      // Get total count
      const countResult = await this.mysql.query<{ total: number }>(
        `SELECT COUNT(*) as total FROM cognitive_tests ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const tests = await this.mysql.query<CognitiveTest>(
        `SELECT * FROM cognitive_tests ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        data: tests,
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('Get cognitive tests by patient error:', error);
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      };
    }
  }

  /**
   * Get cognitive tests by professional
   */
  async getCognitiveTestsByProfessional(
    professionalId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<CognitiveTest>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'test_date',
        sortOrder = 'DESC',
        filters = {},
      } = options;

      let whereClause = 'WHERE tested_by = ?';
      const params: any[] = [professionalId];

      // Apply filters
      if (filters.test_type) {
        whereClause += ' AND test_type = ?';
        params.push(filters.test_type);
      }

      if (filters.patient_id) {
        whereClause += ' AND patient_id = ?';
        params.push(filters.patient_id);
      }

      // Get total count
      const countResult = await this.mysql.query<{ total: number }>(
        `SELECT COUNT(*) as total FROM cognitive_tests ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const tests = await this.mysql.query<CognitiveTest>(
        `SELECT * FROM cognitive_tests ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        data: tests,
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('Get cognitive tests by professional error:', error);
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      };
    }
  }

  /**
   * Update cognitive test
   */
  async updateCognitiveTest(testId: string, testData: Partial<CognitiveTest>): Promise<boolean> {
    try {
      const fields = [];
      const values = [];

      if (testData.score !== undefined) {
        fields.push('score = ?');
        values.push(testData.score);
      }
      if (testData.max_score !== undefined) {
        fields.push('max_score = ?');
        values.push(testData.max_score);
      }
      if (testData.interpretation !== undefined) {
        fields.push('interpretation = ?');
        values.push(testData.interpretation);
      }
      if (testData.observations !== undefined) {
        fields.push('observations = ?');
        values.push(testData.observations);
      }
      if (testData.test_date !== undefined) {
        fields.push('test_date = ?');
        values.push(testData.test_date);
      }

      if (fields.length === 0) return true;

      values.push(testId);

      await this.mysql.execute(
        `UPDATE cognitive_tests SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return true;
    } catch (error) {
      console.error('Update cognitive test error:', error);
      return false;
    }
  }

  /**
   * Delete cognitive test
   */
  async deleteCognitiveTest(testId: string): Promise<boolean> {
    try {
      await this.mysql.execute('DELETE FROM cognitive_tests WHERE id = ?', [testId]);
      return true;
    } catch (error) {
      console.error('Delete cognitive test error:', error);
      return false;
    }
  }

  /**
   * Get latest test for each type for a patient
   */
  async getLatestTestsByPatient(patientId: string): Promise<CognitiveTest[]> {
    try {
      const latestTests = await this.mysql.query<CognitiveTest>(
        `SELECT ct.* FROM cognitive_tests ct
         INNER JOIN (
           SELECT test_type, MAX(test_date) as latest_date
           FROM cognitive_tests
           WHERE patient_id = ?
           GROUP BY test_type
         ) latest ON ct.test_type = latest.test_type AND ct.test_date = latest.latest_date
         WHERE ct.patient_id = ?
         ORDER BY ct.test_type`,
        [patientId, patientId]
      );
      return latestTests;
    } catch (error) {
      console.error('Get latest tests by patient error:', error);
      return [];
    }
  }

  /**
   * Create patient progress record
   */
  async createPatientProgress(progressData: {
    patient_id: string;
    test_type: ProgressTestType;
    score?: number;
    previous_score?: number;
    improvement?: number;
    notes?: string;
  }): Promise<PatientProgress | null> {
    try {
      const result = await this.mysql.execute<{ insertId: string }>(
        `INSERT INTO patient_progress (
          patient_id, test_type, score, previous_score, improvement, notes
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          progressData.patient_id,
          progressData.test_type,
          progressData.score || null,
          progressData.previous_score || null,
          progressData.improvement || null,
          progressData.notes || null,
        ]
      );

      const progressId = result.insertId;
      if (!progressId) return null;

      // Return the created progress record
      return await this.getPatientProgressById(String(progressId));
    } catch (error) {
      console.error('Create patient progress error:', error);
      return null;
    }
  }

  /**
   * Get patient progress by ID
   */
  async getPatientProgressById(progressId: string): Promise<PatientProgress | null> {
    try {
      const progress = await this.mysql.query<PatientProgress>(
        'SELECT * FROM patient_progress WHERE id = ?',
        [progressId]
      );
      return progress.length > 0 ? progress[0] : null;
    } catch (error) {
      console.error('Get patient progress error:', error);
      return null;
    }
  }

  /**
   * Get all progress for a patient
   */
  async getPatientProgressByPatient(
    patientId: string,
    testType?: ProgressTestType
  ): Promise<PatientProgress[]> {
    try {
      let query = 'SELECT * FROM patient_progress WHERE patient_id = ?';
      const params: any[] = [patientId];

      if (testType) {
        query += ' AND test_type = ?';
        params.push(testType);
      }

      query += ' ORDER BY measurement_date DESC';

      const progress = await this.mysql.query<PatientProgress>(query, params);
      return progress;
    } catch (error) {
      console.error('Get patient progress by patient error:', error);
      return [];
    }
  }

  /**
   * Get test statistics for a patient
   */
  async getPatientTestStatistics(patientId: string): Promise<{
    testType: TestType;
    totalTests: number;
    averageScore: number;
    latestScore: number;
    trend: 'improving' | 'declining' | 'stable';
  }[]> {
    try {
      const stats = await this.mysql.query<{
        test_type: TestType;
        total_tests: number;
        avg_score: number;
        latest_score: number;
        trend: 'improving' | 'declining' | 'stable';
      }>(
        `SELECT 
          test_type,
          COUNT(*) as total_tests,
          AVG(score) as avg_score,
          (SELECT score FROM cognitive_tests 
           WHERE patient_id = ? AND test_type = ct.test_type 
           ORDER BY test_date DESC LIMIT 1) as latest_score,
          CASE 
            WHEN (SELECT score FROM cognitive_tests 
                  WHERE patient_id = ? AND test_type = ct.test_type 
                  ORDER BY test_date DESC LIMIT 1) > 
                 (SELECT score FROM cognitive_tests 
                  WHERE patient_id = ? AND test_type = ct.test_type 
                  ORDER BY test_date ASC LIMIT 1) 
            THEN 'improving'
            WHEN (SELECT score FROM cognitive_tests 
                  WHERE patient_id = ? AND test_type = ct.test_type 
                  ORDER BY test_date DESC LIMIT 1) < 
                 (SELECT score FROM cognitive_tests 
                  WHERE patient_id = ? AND test_type = ct.test_type 
                  ORDER BY test_date ASC LIMIT 1) 
            THEN 'declining'
            ELSE 'stable'
          END as trend
        FROM cognitive_tests ct
        WHERE patient_id = ? AND score IS NOT NULL
        GROUP BY test_type`,
        [patientId, patientId, patientId, patientId, patientId, patientId]
      );

      return stats.map(stat => ({
        testType: stat.test_type,
        totalTests: stat.total_tests,
        averageScore: stat.avg_score,
        latestScore: stat.latest_score,
        trend: stat.trend,
      }));
    } catch (error) {
      console.error('Get patient test statistics error:', error);
      return [];
    }
  }

  /**
   * Search cognitive tests
   */
  async searchTests(query: string, limit: number = 10): Promise<CognitiveTest[]> {
    try {
      const tests = await this.mysql.query<CognitiveTest>(
        `SELECT ct.* FROM cognitive_tests ct
         INNER JOIN patients p ON ct.patient_id = p.id
         WHERE (p.first_name LIKE ? OR p.first_lastname LIKE ? OR ct.observations LIKE ?)
         ORDER BY ct.test_date DESC
         LIMIT ?`,
        [`%${query}%`, `%${query}%`, `%${query}%`, limit]
      );
      return tests;
    } catch (error) {
      console.error('Search cognitive tests error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const cognitiveTestServiceMySQL = new CognitiveTestServiceMySQL();
