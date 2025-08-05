// models/LoginSession.js
const db = require('../config/database');

class LoginSession {
  static async create(sessionData) {
    const { user_id, device_info, ip_address, user_agent, session_token } = sessionData;

    const [result] = await db.execute(
      `INSERT INTO login_sessions (user_id, device_info, ip_address, user_agent, session_token) 
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, JSON.stringify(device_info), ip_address, user_agent, session_token]
    );

    return result.insertId;
  }

  static async updateLogout(sessionToken) {
    await db.execute(
      `UPDATE login_sessions 
       SET logout_time = CURRENT_TIMESTAMP, is_active = false 
       WHERE session_token = ? AND is_active = true`,
      [sessionToken]
    );
  }

  static async getUserSessions(userId, limit = 10) {
    const limitNum = Number(limit) || 10;

    const [rows] = await db.execute(
      `SELECT * FROM login_sessions 
   WHERE user_id = ? 
   ORDER BY login_time DESC 
   LIMIT ${db.escape(limitNum)}`,
      [userId]
    );
   return rows;
  }

  static async getActiveSession(sessionToken) {
    const [rows] = await db.execute(
      `SELECT * FROM login_sessions 
       WHERE session_token = ? AND is_active = true`,
      [sessionToken]
    );
    return rows[0];
  }
}

module.exports = LoginSession;
