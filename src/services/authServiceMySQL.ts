import bcrypt from 'bcryptjs';
import { getMySQLService } from '../lib/mysql';
import type { AuthResponse, LoginFormData } from '../types/auth.types';
import type { User, UserProfile } from '../types/database.types';

export class AuthServiceMySQL {
  private mysql = getMySQLService();

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginFormData): Promise<AuthResponse> {
    try {
      console.log('AuthServiceMySQL - Login attempt for:', credentials.email);
      console.log('AuthServiceMySQL - Login data:', JSON.stringify(credentials));

      // Call the backend login endpoint
      const response = await this.mysql.fetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      console.log('AuthServiceMySQL - Login response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('AuthServiceMySQL - Login failed:', errorData);
        return {
          success: false,
          error: errorData.error || 'Error al iniciar sesión',
        };
      }

      const data = await response.json();
      console.log('AuthServiceMySQL - Login success:', data);

      return {
        success: true,
        user: data.user,
        profile: data.profile,
      };
    } catch (error) {
      console.error('AuthServiceMySQL - Login error:', error);
      return {
        success: false,
        error: 'Error al iniciar sesión',
      };
    }
  }

  /**
   * Register new user
   */
  async register(userData: {
    email: string;
    password: string;
    fullName: string;
    role: 'professional' | 'caregiver';
    phone?: string;
    address?: string;
    licenseNumber?: string;
    specialization?: string;
  }): Promise<AuthResponse> {
    try {
      const transactionId = await this.mysql.beginTransaction();

      try {
        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, 10);

        // Create user
        const userResult = await this.mysql.execute<{ insertId: string }>(
          'INSERT INTO users (email, password_hash, rol) VALUES (?, ?, ?)',
          [userData.email, passwordHash, userData.role]
        );

        const userId = userResult.insertId;

        if (!userId) {
          throw new Error('Failed to create user');
        }

        // Create user profile
        await this.mysql.execute(
          'INSERT INTO user_profiles (user_id, full_name, phone, address, license_number, specialization) VALUES (?, ?, ?, ?, ?, ?)',
          [
            userId,
            userData.fullName,
            userData.phone || null,
            userData.address || null,
            userData.licenseNumber || null,
            userData.specialization || null,
          ]
        );

        await this.mysql.commitTransaction(transactionId);

        // Get created user and profile
        const users = await this.mysql.query<User>('SELECT * FROM users WHERE id = ?', [userId]);
        const profiles = await this.mysql.query<UserProfile>('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

        return {
          success: true,
          user: users[0],
          profile: profiles[0],
        };
      } catch (error) {
        await this.mysql.rollbackTransaction(transactionId);
        throw error;
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Error al registrar usuario',
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const users = await this.mysql.query<User>(
        'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
        [userId]
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profiles = await this.mysql.query<UserProfile>(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId]
      );
      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<boolean> {
    try {
      const fields = [];
      const values = [];

      if (profileData.full_name !== undefined) {
        fields.push('full_name = ?');
        values.push(profileData.full_name);
      }
      if (profileData.phone !== undefined) {
        fields.push('phone = ?');
        values.push(profileData.phone);
      }
      if (profileData.address !== undefined) {
        fields.push('address = ?');
        values.push(profileData.address);
      }
      if (profileData.license_number !== undefined) {
        fields.push('license_number = ?');
        values.push(profileData.license_number);
      }
      if (profileData.specialization !== undefined) {
        fields.push('specialization = ?');
        values.push(profileData.specialization);
      }

      if (fields.length === 0) return true;

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);

      await this.mysql.execute(
        `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`,
        values
      );

      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      return false;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Get current password hash
      const users = await this.mysql.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) return false;

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);
      if (!isValid) return false;

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.mysql.execute(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPasswordHash, userId]
      );

      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  }

  /**
   * Logout (client-side only, server doesn't need to do anything for stateless auth)
   */
  async logout(): Promise<void> {
    try {
      console.log('AuthServiceMySQL - Starting logout process');
      
      // In a real implementation, you might want to:
      // - Invalidate tokens if using JWT
      // - Clear server-side sessions
      // - Log the logout event
      
      console.log('AuthServiceMySQL - Logout completed successfully');
    } catch (error) {
      console.error('AuthServiceMySQL - Logout error:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      return await this.mysql.query<User>('SELECT * FROM users ORDER BY created_at DESC');
    } catch (error) {
      console.error('Get all users error:', error);
      return [];
    }
  }

  /**
   * Deactivate user (admin only)
   */
  async deactivateUser(userId: string): Promise<boolean> {
    try {
      await this.mysql.execute(
        'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );
      return true;
    } catch (error) {
      console.error('Deactivate user error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authServiceMySQL = new AuthServiceMySQL();
