import { getMySQLService } from '../lib/mysql';
import type {
    PaginatedResponse,
    Patient,
    PatientFormData,
    PatientWithDetails,
    QueryOptions
} from '../types/database.types';
import { convertGenderToMySQL } from '../types/database.types';
import type { SectionedPatients } from '../types/patient.types';

export class PatientServiceMySQL {
  private mysql = getMySQLService();

  /**
   * Create a new patient
   */
  async createPatient(patientData: PatientFormData, createdBy: string): Promise<Patient | null> {
    try {
      console.log('PatientServiceMySQL - Creating patient with data:', patientData);
      console.log('PatientServiceMySQL - Created by:', createdBy);

      // Generate a UUID for the new patient
      const patientId = 'patient_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const result = await this.mysql.execute<{ insertId: string }>(
        `INSERT INTO patients (
          id, created_by, first_name, second_name, first_lastname, second_lastname, 
          birth_date, gender
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          createdBy,
          patientData.first_name,
          patientData.second_name || null,
          patientData.first_lastname,
          patientData.second_lastname || null,
          patientData.birth_date ? patientData.birth_date.toISOString().split('T')[0] : null,
          convertGenderToMySQL(patientData.gender as any), // Convert to enum M/F
        ]
      );

      console.log('PatientServiceMySQL - Execute result:', result);

      // Use the generated patientId since we're not getting insertId from execute
      console.log('PatientServiceMySQL - Created patient with ID:', patientId);

      // Return the created patient
      return await this.getPatientById(patientId);
    } catch (error) {
      console.error('PatientServiceMySQL - Create patient error:', error);
      throw error;
    }
  }

  /**
   * Get patient by ID
   */
  async getPatientById(patientId: string): Promise<Patient | null> {
    try {
      console.log('PatientServiceMySQL - Getting patient by ID:', patientId);
      console.log('PatientServiceMySQL - MySQL service available:', !!this.mysql);
      
      const patients = await this.mysql.query<Patient>(
        'SELECT * FROM patients WHERE id = ? AND is_active = TRUE',
        [patientId]
      );
      
      console.log('PatientServiceMySQL - Raw query result:', patients);
      console.log('PatientServiceMySQL - Patients array length:', patients.length);
      console.log('PatientServiceMySQL - First patient data:', patients[0]);
      
      if (patients.length > 0) {
        const patient = patients[0];
        console.log('PatientServiceMySQL - Patient fields:', Object.keys(patient));
        console.log('PatientServiceMySQL - Returning patient with ID:', patient.id);
        return patient;
      } else {
        console.log('PatientServiceMySQL - No patient found, returning null');
        return null;
      }
    } catch (error) {
      console.error('PatientServiceMySQL - Get patient error:', error);
      console.error('PatientServiceMySQL - Error stack:', error instanceof Error ? error.stack : 'No stack available');
      return null;
    }
  }

  /**
   * Get patient with all details
   */
  async getPatientWithDetails(patientId: string): Promise<PatientWithDetails | null> {
    try {
      const transactionId = await this.mysql.beginTransaction();

      try {
        // Get basic patient info
        const patients = await this.mysql.query<Patient>(
          'SELECT * FROM patients WHERE id = ? AND is_active = TRUE',
          [patientId]
        );

        if (patients.length === 0) {
          await this.mysql.rollbackTransaction(transactionId);
          return null;
        }

        const patient = patients[0];


        // Get exercise plans
        const exercisePlans = await this.mysql.query(
          'SELECT * FROM exercise_plans WHERE patient_id = ? AND is_active = TRUE ORDER BY created_at DESC',
          [patientId]
        );

        // Get SFT batteries for this patient
        const sftBatteries = await this.mysql.query(
          'SELECT * FROM sft_batteries WHERE patient_id = ? ORDER BY performed_at DESC',
          [patientId]
        );

        // Get SFT results
        const sftResults = await this.mysql.query(
          'SELECT sr.*, sb.performed_at FROM sft_results sr JOIN sft_batteries sb ON sr.battery_id = sb.id WHERE sb.patient_id = ? ORDER BY sb.performed_at DESC',
          [patientId]
        );

        await this.mysql.commitTransaction(transactionId);

        return {
          ...patient,
          exercise_plans: exercisePlans,
          sft_batteries: sftBatteries,
          sft_results: sftResults,
        };
      } catch (error) {
        await this.mysql.rollbackTransaction(transactionId);
        throw error;
      }
    } catch (error) {
      console.error('Get patient with details error:', error);
      return null;
    }
  }

  /**
   * Get all patients with pagination
   */
  async getAllPatients(options: QueryOptions = {}): Promise<PaginatedResponse<Patient>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        filters = {},
      } = options;

      let whereClause = 'WHERE is_active = TRUE';
      const params: any[] = [];

      // Apply filters
      if (filters.name) {
        whereClause += ' AND (first_name LIKE ? OR first_lastname LIKE ?)';
        params.push(`%${filters.name}%`, `%${filters.name}%`);
      }

      if (filters.gender) {
        whereClause += ' AND gender = ?';
        params.push(filters.gender);
      }

      // Get total count
      const countResult = await this.mysql.query<{ total: number }>(
        `SELECT COUNT(*) as total FROM patients ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;

      // Get paginated results - simplified query
      const offset = (page - 1) * limit;
      const patients = await this.mysql.query<Patient>(
        `SELECT * FROM patients ${whereClause} ORDER BY created_at DESC LIMIT ${offset}, ${limit}`,
        params
      );

      return {
        data: patients,
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('Get all patients error:', error);
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
   * Update patient
   */
  async updatePatient(patientId: string, patientData: Partial<PatientFormData>): Promise<boolean> {
    try {
      const fields = [];
      const values = [];

      if (patientData.first_name !== undefined) {
        fields.push('first_name = ?');
        values.push(patientData.first_name);
      }
      if (patientData.second_name !== undefined) {
        fields.push('second_name = ?');
        values.push(patientData.second_name);
      }
      if (patientData.first_lastname !== undefined) {
        fields.push('first_lastname = ?');
        values.push(patientData.first_lastname);
      }
      if (patientData.second_lastname !== undefined) {
        fields.push('second_lastname = ?');
        values.push(patientData.second_lastname);
      }
      if (patientData.birth_date !== undefined) {
        fields.push('birth_date = ?');
        values.push(patientData.birth_date.toISOString().split('T')[0]);
      }
      if (patientData.gender !== undefined) {
        fields.push('gender = ?');
        values.push(patientData.gender);
      }
      if (patientData.phone !== undefined) {
        fields.push('phone = ?');
        values.push(patientData.phone);
      }
      if (patientData.address !== undefined) {
        fields.push('address = ?');
        values.push(patientData.address);
      }
      if (patientData.emergency_contact !== undefined) {
        fields.push('emergency_contact = ?');
        values.push(patientData.emergency_contact);
      }
      if (patientData.emergency_phone !== undefined) {
        fields.push('emergency_phone = ?');
        values.push(patientData.emergency_phone);
      }
      if (patientData.medical_history !== undefined) {
        fields.push('medical_history = ?');
        values.push(patientData.medical_history);
      }
      if (patientData.allergies !== undefined) {
        fields.push('allergies = ?');
        values.push(patientData.allergies);
      }
      if (patientData.medications !== undefined) {
        fields.push('medications = ?');
        values.push(patientData.medications);
      }

      if (fields.length === 0) return true;

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(patientId);

      await this.mysql.execute(
        `UPDATE patients SET ${fields.join(', ')} WHERE id = ? AND is_active = TRUE`,
        values
      );

      return true;
    } catch (error) {
      console.error('Update patient error:', error);
      return false;
    }
  }

  /**
   * Delete patient (soft delete)
   */
  async deletePatient(patientId: string): Promise<boolean> {
    try {
      await this.mysql.execute(
        'UPDATE patients SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [patientId]
      );
      return true;
    } catch (error) {
      console.error('Delete patient error:', error);
      return false;
    }
  }

  /**
   * Assign caregiver to patient
   */
  async assignCaregiver(patientId: string, caregiverId: string, assignedBy: string): Promise<boolean> {
    try {
      // First deactivate any existing assignment for this patient-caregiver pair
      await this.mysql.execute(
        'UPDATE patient_caregivers SET is_active = FALSE WHERE patient_id = ? AND caregiver_id = ? AND is_active = TRUE',
        [patientId, caregiverId]
      );

      // Create new assignment
      await this.mysql.execute(
        'INSERT INTO patient_caregivers (patient_id, caregiver_id, assigned_by, is_active) VALUES (?, ?, ?, TRUE)',
        [patientId, caregiverId, assignedBy]
      );

      return true;
    } catch (error) {
      console.error('Assign caregiver error:', error);
      return false;
    }
  }

  /**
   * Remove caregiver assignment
   */
  async removeCaregiverAssignment(patientId: string, caregiverId: string): Promise<boolean> {
    try {
      await this.mysql.execute(
        'UPDATE patient_caregivers SET is_active = FALSE WHERE patient_id = ? AND caregiver_id = ? AND is_active = TRUE',
        [patientId, caregiverId]
      );
      return true;
    } catch (error) {
      console.error('Remove caregiver assignment error:', error);
      return false;
    }
  }

  /**
   * Get patients assigned to a caregiver
   */
  async getPatientsByCaregiver(caregiverId: string): Promise<Patient[]> {
    try {
      const patients = await this.mysql.query<Patient>(
        `SELECT p.* FROM patients p
         INNER JOIN patient_caregivers pc ON p.id = pc.patient_id
         WHERE pc.caregiver_id = ? AND pc.is_active = TRUE AND p.is_active = TRUE
         ORDER BY p.first_name, p.first_lastname`,
        [caregiverId]
      );
      return patients;
    } catch (error) {
      console.error('Get patients by caregiver error:', error);
      return [];
    }
  }

  /**
   * Get patients created by a professional
   */
  async getPatientsByCreator(creatorId: string): Promise<Patient[]> {
    try {
      // This assumes there's a created_by field or similar relationship
      // Adjust according to your actual schema
      const patients = await this.mysql.query<Patient>(
        'SELECT * FROM patients WHERE is_active = TRUE ORDER BY created_at DESC'
      );
      return patients;
    } catch (error) {
      console.error('Get patients by creator error:', error);
      return [];
    }
  }

  /**
   * Get sectioned patients for UI
   */
  async getSectionedPatients(userId: string, userRole: string): Promise<SectionedPatients> {
    try {
      let baseQuery = `
        SELECT p.* FROM patients p
        WHERE p.is_active = TRUE
      `;

      const params: any[] = [];

      // Filter by user role
      if (userRole === 'caregiver') {
        baseQuery += `
          INNER JOIN patient_caregivers pc ON p.id = pc.patient_id
          WHERE pc.caregiver_id = ? AND pc.is_active = TRUE AND p.is_active = TRUE
        `;
        params.push(userId);
      }

      baseQuery += ' ORDER BY p.first_name, p.first_lastname';

      const allPatients = await this.mysql.query<Patient>(baseQuery, params);

      // For now, return all patients in the first section
      // You can implement more sophisticated logic based on your needs
      return {
        noBatteries: allPatients,
        pendingRecommendation: [],
        inProgress: [],
      };
    } catch (error) {
      console.error('Get sectioned patients error:', error);
      return {
        noBatteries: [],
        pendingRecommendation: [],
        inProgress: [],
      };
    }
  }

  /**
   * Search patients by name or other criteria
   */
  async searchPatients(query: string, limit: number = 10): Promise<Patient[]> {
    try {
      const patients = await this.mysql.query<Patient>(
        `SELECT * FROM patients 
         WHERE is_active = TRUE 
         AND (first_name LIKE ? OR first_lastname LIKE ? OR second_name LIKE ? OR second_lastname LIKE ?)
         ORDER BY first_name, first_lastname
         LIMIT ?`,
        [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit]
      );
      return patients;
    } catch (error) {
      console.error('Search patients error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const patientServiceMySQL = new PatientServiceMySQL();
