import { getMySQLService } from '../lib/mysql';
import type { BatteryWithResults, SFTBattery, SFTResult } from '../types/battery.types';

export class BatteryServiceMySQL {
  private mysql = getMySQLService();

  /**
   * Fetch all batteries for a patient
   */
  async fetchBatteries(patientId: string): Promise<SFTBattery[]> {
    try {
      console.log('BatteryServiceMySQL - Fetching batteries for patient:', patientId);
      
      const batteries = await this.mysql.query<SFTBattery>(
        'SELECT * FROM sft_batteries WHERE patient_id = ? ORDER BY performed_at DESC',
        [patientId]
      );
      
      console.log('BatteryServiceMySQL - Batteries fetched:', batteries.length);
      return batteries;
    } catch (error) {
      console.error('BatteryServiceMySQL - Error fetching batteries:', error);
      throw new Error('Error obteniendo baterías: ' + error);
    }
  }

  /**
   * Create a new SFT battery
   */
  async createBattery(
    patientId: string,
    performedBy: string,
    notes?: string
  ): Promise<SFTBattery> {
    try {
      console.log('BatteryServiceMySQL - Creating battery for patient:', patientId);
      
      const batteryId = 'battery_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const result = await this.mysql.execute<{ insertId: string }>(
        `INSERT INTO sft_batteries (
          id, patient_id, performed_by, notes
        ) VALUES (?, ?, ?, ?)`,
        [
          batteryId,
          patientId,
          performedBy,
          notes || null,
        ]
      );

      // Return the created battery
      return await this.getBatteryById(batteryId);
    } catch (error) {
      console.error('BatteryServiceMySQL - Create battery error:', error);
      throw error;
    }
  }

  /**
   * Get battery by ID
   */
  async getBatteryById(batteryId: string): Promise<SFTBattery | null> {
    try {
      const batteries = await this.mysql.query<SFTBattery>(
        'SELECT * FROM sft_batteries WHERE id = ?',
        [batteryId]
      );
      return batteries.length > 0 ? batteries[0] : null;
    } catch (error) {
      console.error('BatteryServiceMySQL - Error fetching battery:', error);
      return null;
    }
  }

  /**
   * Fetch battery with results
   */
  async fetchBatteryWithResults(batteryId: string): Promise<BatteryWithResults | null> {
    try {
      console.log('BatteryServiceMySQL - Fetching battery with results:', batteryId);
      
      const battery = await this.getBatteryById(batteryId);
      if (!battery) return null;

      const results = await this.mysql.query<SFTResult>(
        'SELECT * FROM sft_results WHERE battery_id = ? ORDER BY test_type',
        [batteryId]
      );

      return {
        ...battery,
        results: results
      };
    } catch (error) {
      console.error('BatteryServiceMySQL - Error fetching battery with results:', error);
      return null;
    }
  }

  /**
   * Add SFT result to a battery
   */
  async addSFTResult(
    batteryId: string,
    testType: string,
    value: string,
    notes?: string
  ): Promise<SFTResult> {
    try {
      console.log('BatteryServiceMySQL - Adding SFT result:', { batteryId, testType, value });
      
      const resultId = 'result_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      await this.mysql.execute(
        `INSERT INTO sft_results (
          id, battery_id, test_type, value, notes
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          resultId,
          batteryId,
          testType,
          value,
          notes || null,
        ]
      );

      // Return the created result
      const results = await this.mysql.query<SFTResult>(
        'SELECT * FROM sft_results WHERE id = ?',
        [resultId]
      );
      
      return results[0];
    } catch (error) {
      console.error('BatteryServiceMySQL - Add SFT result error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const batteryServiceMySQL = new BatteryServiceMySQL();

// Export functions for backward compatibility
export async function fetchBatteries(patientId: string): Promise<SFTBattery[]> {
  return await batteryServiceMySQL.fetchBatteries(patientId);
}

export async function fetchBatteryWithResults(batteryId: string): Promise<BatteryWithResults | null> {
  return await batteryServiceMySQL.fetchBatteryWithResults(batteryId);
}

export async function createBattery(
  patientId: string,
  performedBy: string,
  notes?: string
): Promise<SFTBattery> {
  return await batteryServiceMySQL.createBattery(patientId, performedBy, notes);
}
