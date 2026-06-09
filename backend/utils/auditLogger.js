const { AuditLog } = require('../models/models');

/**
 * Utility function to create an audit log entry in the database.
 * 
 * @param {Object} params
 * @param {number|null} params.userId - ID of the user performing the action
 * @param {string} params.action - The action being performed (e.g. LOGIN_SUCCESS, CREATE_COMPLAINT)
 * @param {string|number|null} params.targetId - ID of the entity affected (e.g. complaint ID)
 * @param {string} params.details - Descriptive details of the action
 * @param {Object} req - The Express request object to extract IP address
 */
const logEvent = async ({ userId = null, action, targetId = null, details }, req) => {
  try {
    const ipAddress = req.ip || 
                     req.headers['x-forwarded-for'] || 
                     req.socket.remoteAddress || 
                     '127.0.0.1';

    await AuditLog.create({
      user_id: userId,
      action,
      target_id: targetId ? String(targetId) : null,
      details,
      ip_address: ipAddress
    });
  } catch (error) {
    console.error('Failed to write audit log entry:', error);
  }
};

module.exports = {
  logEvent
};
