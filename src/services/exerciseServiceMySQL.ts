import { getMySQLService } from '../lib/mysql';
import type { 
  ExercisePlan, 
  Exercise, 
  ExerciseSession, 
  DifficultyLevel, 
  ExerciseCategory,
  QueryOptions,
  PaginatedResponse,
  ExercisePlanWithDetails
} from '../types/database.types';

export class ExerciseServiceMySQL {
  private mysql = getMySQLService();

  /**
   * Create a new exercise plan
   */
  async createExercisePlan(planData: {
    patient_id: string;
    plan_name: string;
    description?: string;
    difficulty_level: DifficultyLevel;
    duration_weeks: number;
    sessions_per_week: number;
    minutes_per_session: number;
    created_by: string;
    start_date?: Date;
    end_date?: Date;
  }): Promise<ExercisePlan | null> {
    try {
      const transactionId = await this.mysql.beginTransaction();

      try {
        // Create exercise plan
        const result = await this.mysql.execute<{ insertId: string }>(
          `INSERT INTO exercise_plans (
            patient_id, plan_name, description, difficulty_level, duration_weeks,
            sessions_per_week, minutes_per_session, created_by, start_date, end_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            planData.patient_id,
            planData.plan_name,
            planData.description || null,
            planData.difficulty_level,
            planData.duration_weeks,
            planData.sessions_per_week,
            planData.minutes_per_session,
            planData.created_by,
            planData.start_date?.toISOString().split('T')[0] || null,
            planData.end_date?.toISOString().split('T')[0] || null,
          ]
        );

        const planId = result.insertId;
        if (!planId) {
          throw new Error('Failed to create exercise plan');
        }

        await this.mysql.commitTransaction(transactionId);

        // Return the created plan
        return await this.getExercisePlanById(String(planId));
      } catch (error) {
        await this.mysql.rollbackTransaction(transactionId);
        throw error;
      }
    } catch (error) {
      console.error('Create exercise plan error:', error);
      return null;
    }
  }

  /**
   * Get exercise plan by ID
   */
  async getExercisePlanById(planId: string): Promise<ExercisePlan | null> {
    try {
      const plans = await this.mysql.query<ExercisePlan>(
        'SELECT * FROM exercise_plans WHERE id = ?',
        [planId]
      );
      return plans.length > 0 ? plans[0] : null;
    } catch (error) {
      console.error('Get exercise plan error:', error);
      return null;
    }
  }

  /**
   * Get exercise plan with details (including exercises and sessions)
   */
  async getExercisePlanWithDetails(planId: string): Promise<ExercisePlanWithDetails | null> {
    try {
      const transactionId = await this.mysql.beginTransaction();

      try {
        // Get basic plan info
        const plans = await this.mysql.query<ExercisePlan>(
          'SELECT * FROM exercise_plans WHERE id = ?',
          [planId]
        );

        if (plans.length === 0) {
          await this.mysql.rollbackTransaction(transactionId);
          return null;
        }

        const plan = plans[0];

        // Get exercises
        const exercises = await this.mysql.query<Exercise>(
          'SELECT * FROM exercises WHERE plan_id = ? ORDER BY order_index',
          [planId]
        );

        // Get sessions
        const sessions = await this.mysql.query<ExerciseSession>(
          'SELECT * FROM exercise_sessions WHERE plan_id = ? ORDER BY session_date DESC',
          [planId]
        );

        await this.mysql.commitTransaction(transactionId);

        return {
          ...plan,
          exercises,
          sessions,
        };
      } catch (error) {
        await this.mysql.rollbackTransaction(transactionId);
        throw error;
      }
    } catch (error) {
      console.error('Get exercise plan with details error:', error);
      return null;
    }
  }

  /**
   * Get all exercise plans for a patient
   */
  async getExercisePlansByPatient(
    patientId: string, 
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<ExercisePlan>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        filters = {},
      } = options;

      let whereClause = 'WHERE patient_id = ? AND is_active = TRUE';
      const params: any[] = [patientId];

      // Apply filters
      if (filters.difficulty_level) {
        whereClause += ' AND difficulty_level = ?';
        params.push(filters.difficulty_level);
      }

      if (filters.is_active !== undefined) {
        whereClause += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      // Get total count
      const countResult = await this.mysql.query<{ total: number }>(
        `SELECT COUNT(*) as total FROM exercise_plans ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const plans = await this.mysql.query<ExercisePlan>(
        `SELECT * FROM exercise_plans ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        data: plans,
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('Get exercise plans by patient error:', error);
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
   * Get exercise plans created by a professional
   */
  async getExercisePlansByCreator(
    creatorId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<ExercisePlan>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        filters = {},
      } = options;

      let whereClause = 'WHERE created_by = ?';
      const params: any[] = [creatorId];

      // Apply filters
      if (filters.patient_id) {
        whereClause += ' AND patient_id = ?';
        params.push(filters.patient_id);
      }

      if (filters.is_active !== undefined) {
        whereClause += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      // Get total count
      const countResult = await this.mysql.query<{ total: number }>(
        `SELECT COUNT(*) as total FROM exercise_plans ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const plans = await this.mysql.query<ExercisePlan>(
        `SELECT * FROM exercise_plans ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        data: plans,
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('Get exercise plans by creator error:', error);
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
   * Update exercise plan
   */
  async updateExercisePlan(planId: string, planData: Partial<ExercisePlan>): Promise<boolean> {
    try {
      const fields = [];
      const values = [];

      if (planData.plan_name !== undefined) {
        fields.push('plan_name = ?');
        values.push(planData.plan_name);
      }
      if (planData.description !== undefined) {
        fields.push('description = ?');
        values.push(planData.description);
      }
      if (planData.difficulty_level !== undefined) {
        fields.push('difficulty_level = ?');
        values.push(planData.difficulty_level);
      }
      if (planData.duration_weeks !== undefined) {
        fields.push('duration_weeks = ?');
        values.push(planData.duration_weeks);
      }
      if (planData.sessions_per_week !== undefined) {
        fields.push('sessions_per_week = ?');
        values.push(planData.sessions_per_week);
      }
      if (planData.minutes_per_session !== undefined) {
        fields.push('minutes_per_session = ?');
        values.push(planData.minutes_per_session);
      }
      if (planData.start_date !== undefined) {
        fields.push('start_date = ?');
        values.push(planData.start_date);
      }
      if (planData.end_date !== undefined) {
        fields.push('end_date = ?');
        values.push(planData.end_date);
      }
      if (planData.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(planData.is_active);
      }

      if (fields.length === 0) return true;

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(planId);

      await this.mysql.execute(
        `UPDATE exercise_plans SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return true;
    } catch (error) {
      console.error('Update exercise plan error:', error);
      return false;
    }
  }

  /**
   * Delete exercise plan (soft delete)
   */
  async deleteExercisePlan(planId: string): Promise<boolean> {
    try {
      await this.mysql.execute(
        'UPDATE exercise_plans SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [planId]
      );
      return true;
    } catch (error) {
      console.error('Delete exercise plan error:', error);
      return false;
    }
  }

  /**
   * Add exercise to plan
   */
  async addExerciseToPlan(exerciseData: {
    plan_id: string;
    exercise_name: string;
    description?: string;
    instructions?: string;
    repetitions?: number;
    sets?: number;
    rest_seconds?: number;
    category: ExerciseCategory;
    order_index: number;
  }): Promise<Exercise | null> {
    try {
      const result = await this.mysql.execute<{ insertId: string }>(
        `INSERT INTO exercises (
          plan_id, exercise_name, description, instructions, repetitions,
          sets, rest_seconds, category, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          exerciseData.plan_id,
          exerciseData.exercise_name,
          exerciseData.description || null,
          exerciseData.instructions || null,
          exerciseData.repetitions || null,
          exerciseData.sets || null,
          exerciseData.rest_seconds || null,
          exerciseData.category,
          exerciseData.order_index,
        ]
      );

      const exerciseId = result.insertId;
      if (!exerciseId) return null;

      // Return the created exercise
      return await this.getExerciseById(String(exerciseId));
    } catch (error) {
      console.error('Add exercise to plan error:', error);
      return null;
    }
  }

  /**
   * Get exercise by ID
   */
  async getExerciseById(exerciseId: string): Promise<Exercise | null> {
    try {
      const exercises = await this.mysql.query<Exercise>(
        'SELECT * FROM exercises WHERE id = ?',
        [exerciseId]
      );
      return exercises.length > 0 ? exercises[0] : null;
    } catch (error) {
      console.error('Get exercise error:', error);
      return null;
    }
  }

  /**
   * Update exercise
   */
  async updateExercise(exerciseId: string, exerciseData: Partial<Exercise>): Promise<boolean> {
    try {
      const fields = [];
      const values = [];

      if (exerciseData.exercise_name !== undefined) {
        fields.push('exercise_name = ?');
        values.push(exerciseData.exercise_name);
      }
      if (exerciseData.description !== undefined) {
        fields.push('description = ?');
        values.push(exerciseData.description);
      }
      if (exerciseData.instructions !== undefined) {
        fields.push('instructions = ?');
        values.push(exerciseData.instructions);
      }
      if (exerciseData.repetitions !== undefined) {
        fields.push('repetitions = ?');
        values.push(exerciseData.repetitions);
      }
      if (exerciseData.sets !== undefined) {
        fields.push('sets = ?');
        values.push(exerciseData.sets);
      }
      if (exerciseData.rest_seconds !== undefined) {
        fields.push('rest_seconds = ?');
        values.push(exerciseData.rest_seconds);
      }
      if (exerciseData.category !== undefined) {
        fields.push('category = ?');
        values.push(exerciseData.category);
      }
      if (exerciseData.order_index !== undefined) {
        fields.push('order_index = ?');
        values.push(exerciseData.order_index);
      }

      if (fields.length === 0) return true;

      values.push(exerciseId);

      await this.mysql.execute(
        `UPDATE exercises SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return true;
    } catch (error) {
      console.error('Update exercise error:', error);
      return false;
    }
  }

  /**
   * Delete exercise
   */
  async deleteExercise(exerciseId: string): Promise<boolean> {
    try {
      await this.mysql.execute('DELETE FROM exercises WHERE id = ?', [exerciseId]);
      return true;
    } catch (error) {
      console.error('Delete exercise error:', error);
      return false;
    }
  }

  /**
   * Create exercise session
   */
  async createExerciseSession(sessionData: {
    patient_id: string;
    plan_id: string;
    duration_minutes?: number;
    completed_exercises?: number;
    total_exercises?: number;
    notes?: string;
    performed_by?: string;
  }): Promise<ExerciseSession | null> {
    try {
      const result = await this.mysql.execute<{ insertId: string }>(
        `INSERT INTO exercise_sessions (
          patient_id, plan_id, duration_minutes, completed_exercises,
          total_exercises, notes, performed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionData.patient_id,
          sessionData.plan_id,
          sessionData.duration_minutes || null,
          sessionData.completed_exercises || null,
          sessionData.total_exercises || null,
          sessionData.notes || null,
          sessionData.performed_by || null,
        ]
      );

      const sessionId = result.insertId;
      if (!sessionId) return null;

      // Return the created session
      return await this.getExerciseSessionById(String(sessionId));
    } catch (error) {
      console.error('Create exercise session error:', error);
      return null;
    }
  }

  /**
   * Get exercise session by ID
   */
  async getExerciseSessionById(sessionId: string): Promise<ExerciseSession | null> {
    try {
      const sessions = await this.mysql.query<ExerciseSession>(
        'SELECT * FROM exercise_sessions WHERE id = ?',
        [sessionId]
      );
      return sessions.length > 0 ? sessions[0] : null;
    } catch (error) {
      console.error('Get exercise session error:', error);
      return null;
    }
  }

  /**
   * Get exercise sessions for a patient
   */
  async getExerciseSessionsByPatient(
    patientId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<ExerciseSession>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'session_date',
        sortOrder = 'DESC',
        filters = {},
      } = options;

      let whereClause = 'WHERE patient_id = ?';
      const params: any[] = [patientId];

      // Apply filters
      if (filters.plan_id) {
        whereClause += ' AND plan_id = ?';
        params.push(filters.plan_id);
      }

      if (filters.date_from) {
        whereClause += ' AND session_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND session_date <= ?';
        params.push(filters.date_to);
      }

      // Get total count
      const countResult = await this.mysql.query<{ total: number }>(
        `SELECT COUNT(*) as total FROM exercise_sessions ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const sessions = await this.mysql.query<ExerciseSession>(
        `SELECT * FROM exercise_sessions ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        data: sessions,
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('Get exercise sessions by patient error:', error);
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
   * Get exercise sessions for a plan
   */
  async getExerciseSessionsByPlan(planId: string): Promise<ExerciseSession[]> {
    try {
      const sessions = await this.mysql.query<ExerciseSession>(
        'SELECT * FROM exercise_sessions WHERE plan_id = ? ORDER BY session_date DESC',
        [planId]
      );
      return sessions;
    } catch (error) {
      console.error('Get exercise sessions by plan error:', error);
      return [];
    }
  }

  /**
   * Update exercise session
   */
  async updateExerciseSession(sessionId: string, sessionData: Partial<ExerciseSession>): Promise<boolean> {
    try {
      const fields = [];
      const values = [];

      if (sessionData.duration_minutes !== undefined) {
        fields.push('duration_minutes = ?');
        values.push(sessionData.duration_minutes);
      }
      if (sessionData.completed_exercises !== undefined) {
        fields.push('completed_exercises = ?');
        values.push(sessionData.completed_exercises);
      }
      if (sessionData.total_exercises !== undefined) {
        fields.push('total_exercises = ?');
        values.push(sessionData.total_exercises);
      }
      if (sessionData.notes !== undefined) {
        fields.push('notes = ?');
        values.push(sessionData.notes);
      }

      if (fields.length === 0) return true;

      values.push(sessionId);

      await this.mysql.execute(
        `UPDATE exercise_sessions SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return true;
    } catch (error) {
      console.error('Update exercise session error:', error);
      return false;
    }
  }

  /**
   * Get exercise statistics for a patient
   */
  async getPatientExerciseStatistics(patientId: string): Promise<{
    totalSessions: number;
    totalMinutes: number;
    averageSessionDuration: number;
    completionRate: number;
    mostRecentSession: Date | null;
  }> {
    try {
      const stats = await this.mysql.query<{
        total_sessions: number;
        total_minutes: number;
        avg_duration: number;
        completion_rate: number;
        latest_session: string;
      }>(
        `SELECT 
          COUNT(*) as total_sessions,
          COALESCE(SUM(duration_minutes), 0) as total_minutes,
          COALESCE(AVG(duration_minutes), 0) as avg_duration,
          CASE 
            WHEN COUNT(*) > 0 THEN 
              COALESCE(SUM(completed_exercises) * 100.0 / NULLIF(SUM(total_exercises), 0), 0)
            ELSE 0
          END as completion_rate,
          MAX(session_date) as latest_session
        FROM exercise_sessions
        WHERE patient_id = ?`,
        [patientId]
      );

      const stat = stats[0];

      return {
        totalSessions: stat.total_sessions,
        totalMinutes: stat.total_minutes,
        averageSessionDuration: stat.avg_duration,
        completionRate: stat.completion_rate,
        mostRecentSession: stat.latest_session ? new Date(stat.latest_session) : null,
      };
    } catch (error) {
      console.error('Get patient exercise statistics error:', error);
      return {
        totalSessions: 0,
        totalMinutes: 0,
        averageSessionDuration: 0,
        completionRate: 0,
        mostRecentSession: null,
      };
    }
  }

  /**
   * Search exercise plans
   */
  async searchExercisePlans(query: string, limit: number = 10): Promise<ExercisePlan[]> {
    try {
      const plans = await this.mysql.query<ExercisePlan>(
        `SELECT ep.* FROM exercise_plans ep
         INNER JOIN patients p ON ep.patient_id = p.id
         WHERE (p.first_name LIKE ? OR p.first_lastname LIKE ? OR ep.plan_name LIKE ?)
         ORDER BY ep.created_at DESC
         LIMIT ?`,
        [`%${query}%`, `%${query}%`, `%${query}%`, limit]
      );
      return plans;
    } catch (error) {
      console.error('Search exercise plans error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const exerciseServiceMySQL = new ExerciseServiceMySQL();
