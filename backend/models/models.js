const fs = require('fs');
const path = require('path');

// Operators definition to mock Sequelize Op
const Op = {
  or: Symbol('or'),
  gte: Symbol('gte'),
  lt: Symbol('lt'),
  ne: Symbol('ne'),
  notIn: Symbol('notIn')
};

// Database local folder setup
const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Low-level read/write primitives
const getTablePath = (tableName) => path.join(DB_DIR, `${tableName.toLowerCase()}.json`);

const readTable = (tableName) => {
  const p = getTablePath(tableName);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return [];
  }
};

const writeTable = (tableName, data) => {
  fs.writeFileSync(getTablePath(tableName), JSON.stringify(data, null, 2), 'utf8');
};

// Base Model Class to mimic Sequelize instances
class ModelInstance {
  constructor(tableName, data) {
    this._tableName = tableName;
    Object.assign(this, data);
  }

  // Mimic Sequelize instance .save()
  async save() {
    const list = readTable(this._tableName);
    const idx = list.findIndex(item => item.id === this.id);
    this.updated_at = new Date().toISOString();
    
    // Clean internal properties before writing
    const dataToWrite = { ...this };
    delete dataToWrite._tableName;
    delete dataToWrite.Complainant;
    delete dataToWrite.AssignedDepartment;
    delete dataToWrite.AssignedOfficer;
    delete dataToWrite.EvidenceFiles;
    delete dataToWrite.Logs;
    delete dataToWrite.Department;
    delete dataToWrite.Manager;
    delete dataToWrite.User;
    
    if (idx !== -1) {
      list[idx] = dataToWrite;
    } else {
      list.push(dataToWrite);
    }
    writeTable(this._tableName, list);
    return this;
  }

  // Helper helper to support Sequelize getters
  get(key) {
    return this[key];
  }
}

// General Class Wrapper implementing Sequelize query syntax
class MockModel {
  static tableName = '';
  static modelClass = null;

  static async create(data) {
    const list = readTable(this.tableName);
    const newId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 : 1;
    const now = new Date().toISOString();
    
    const item = {
      id: newId,
      created_at: now,
      updated_at: now,
      ...data
    };
    list.push(item);
    writeTable(this.tableName, list);
    return new this.modelClass(item);
  }

  static async findByPk(id) {
    if (!id) return null;
    const list = readTable(this.tableName);
    const item = list.find(i => i.id === parseInt(id));
    if (!item) return null;
    
    const instance = new this.modelClass(item);
    await this._populateAssociations(instance);
    return instance;
  }

  static async findOne({ where }) {
    const list = readTable(this.tableName);
    
    // Collect both string and symbol keys from where clause
    const stringKeys = Object.keys(where);
    const symbolKeys = Object.getOwnPropertySymbols(where);

    const match = list.find(item => {
      // Check symbol keys (Op.or, Op.and, etc.)
      for (const sym of symbolKeys) {
        const symStr = sym.toString();
        const val = where[sym];

        if (symStr.includes('or')) {
          // Op.or: at least one condition must match
          const matched = val.some(cond =>
            Object.keys(cond).every(ck => item[ck] === cond[ck])
          );
          if (!matched) return false;
        }
      }

      // Check string keys (regular field matches)
      return stringKeys.every(key => {
        const val = where[key];

        // Support manual Op.or inside keys
        if (key === 'or') {
          return val.some(cond =>
            Object.keys(cond).every(ck => item[ck] === cond[ck])
          );
        }

        // Support exact match
        return item[key] === val;
      });
    });

    if (!match) return null;
    
    const instance = new this.modelClass(match);
    await this._populateAssociations(instance);
    return instance;
  }

  static async findAll({ where, order, limit, include } = {}) {
    let list = readTable(this.tableName);

    // Apply where filter criteria
    if (where) {
      list = list.filter(item => {
        return Object.keys(where).every(key => {
          const val = where[key];
          
          if (val === undefined) return true;

          // Check if key is department list or status lists
          if (key === 'status' && Array.isArray(val)) {
            return val.includes(item[key]);
          }

          // Check if operator objects are utilized
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            const keys = Object.getOwnPropertySymbols(val);
            if (keys.length > 0) {
              const sym = keys[0];
              const symVal = val[sym];
              if (sym.toString().includes('gte')) {
                return new Date(item[key]) >= new Date(symVal);
              }
              if (sym.toString().includes('lt')) {
                return new Date(item[key]) < new Date(symVal);
              }
              if (sym.toString().includes('notIn')) {
                return !symVal.includes(item[key]);
              }
              if (sym.toString().includes('ne')) {
                return item[key] !== symVal;
              }
            }
          }

          return item[key] === val;
        });
      });
    }

    // Apply orders (Sequelize style [['created_at', 'DESC']])
    if (order && order.length > 0) {
      const [col, dir] = order[0];
      list.sort((a, b) => {
        if (dir === 'DESC') {
          return new Date(b[col]) - new Date(a[col]);
        }
        return new Date(a[col]) - new Date(b[col]);
      });
    }

    // Apply limits
    if (limit) {
      list = list.slice(0, limit);
    }

    // Wrap to class instances and populate associations
    const instances = list.map(item => new this.modelClass(item));
    for (const inst of instances) {
      await this._populateAssociations(inst, include);
    }

    return instances;
  }

  static async count({ where } = {}) {
    let list = readTable(this.tableName);

    if (where) {
      list = list.filter(item => {
        return Object.keys(where).every(key => {
          const val = where[key];
          if (val === undefined) return true;

          // Handle array values like arrays of statuses
          if (Array.isArray(val)) {
            return val.includes(item[key]);
          }

          // Handle Date ranges and comparison operators
          if (val && typeof val === 'object') {
            const symbols = Object.getOwnPropertySymbols(val);
            
            // Check symbol range matches
            for (const sym of symbols) {
              const limitVal = val[sym];
              const itemDate = new Date(item[key]);
              if (sym.toString().includes('gte') && itemDate < new Date(limitVal)) return false;
              if (sym.toString().includes('lt') && itemDate >= new Date(limitVal)) return false;
              if (sym.toString().includes('notIn') && limitVal.includes(item[key])) return false;
              if (sym.toString().includes('ne') && item[key] === limitVal) return false;
            }
            
            // Check manual key matches
            if (val.ne !== undefined && item[key] === val.ne) return false;
            if (val.lt !== undefined && item[key] >= val.lt) return false;
          }

          return item[key] === val;
        });
      });
    }

    return list.length;
  }

  // Populate references simulating database JOIN operations
  static async _populateAssociations(instance, include = []) {
    // Override to prevent recursive loops
  }
}

// ==========================================
//          CONCRETE INSTANCES WRAPPERS
// ==========================================

class UserInstance extends ModelInstance {
  constructor(data) {
    super('User', data);
  }
}

class User extends MockModel {
  static tableName = 'User';
  static modelClass = UserInstance;

  static async _populateAssociations(instance) {
    if (instance.department_id) {
      const depts = readTable('Department');
      const d = depts.find(x => x.id === instance.department_id);
      if (d) instance.Department = d;
    }
  }
}

class DepartmentInstance extends ModelInstance {
  constructor(data) {
    super('Department', data);
  }
}

class Department extends MockModel {
  static tableName = 'Department';
  static modelClass = DepartmentInstance;

  static async _populateAssociations(instance) {
    if (instance.manager_id) {
      const users = readTable('User');
      const u = users.find(x => x.id === instance.manager_id);
      if (u) {
        delete u.password_hash;
        instance.Manager = u;
      }
    }
  }
}

class ComplaintInstance extends ModelInstance {
  constructor(data) {
    super('Complaint', data);
  }
}

class Complaint extends MockModel {
  static tableName = 'Complaint';
  static modelClass = ComplaintInstance;

  static async _populateAssociations(instance) {
    const users = readTable('User');
    const depts = readTable('Department');
    const evidence = readTable('Evidence');
    const logs = readTable('InvestigationLog');

    // Complainant
    const c = users.find(x => x.id === instance.complainant_id);
    if (c) {
      delete c.password_hash;
      instance.Complainant = c;
    }

    // Department
    if (instance.assigned_department_id) {
      const d = depts.find(x => x.id === instance.assigned_department_id);
      if (d) instance.AssignedDepartment = d;
    }

    // Officer
    if (instance.assigned_officer_id) {
      const o = users.find(x => x.id === instance.assigned_officer_id);
      if (o) {
        delete o.password_hash;
        instance.AssignedOfficer = o;
      }
    }

    // Evidence attachments
    instance.EvidenceFiles = evidence.filter(e => e.complaint_id === instance.id);

    // Investigation logs
    const relatedLogs = logs.filter(l => l.complaint_id === instance.id);
    instance.Logs = relatedLogs.map(l => {
      const logOff = users.find(x => x.id === l.officer_id);
      return {
        ...l,
        Officer: logOff ? { full_name: logOff.full_name } : null
      };
    });
  }
}

class EvidenceInstance extends ModelInstance {
  constructor(data) {
    super('Evidence', data);
  }
}

class Evidence extends MockModel {
  static tableName = 'Evidence';
  static modelClass = EvidenceInstance;
}

class InvestigationLogInstance extends ModelInstance {
  constructor(data) {
    super('InvestigationLog', data);
  }
}

class InvestigationLog extends MockModel {
  static tableName = 'InvestigationLog';
  static modelClass = InvestigationLogInstance;
}

class AuditLogInstance extends ModelInstance {
  constructor(data) {
    super('AuditLog', data);
  }
}

class AuditLog extends MockModel {
  static tableName = 'AuditLog';
  static modelClass = AuditLogInstance;

  static async _populateAssociations(instance) {
    if (instance.user_id) {
      const users = readTable('User');
      const u = users.find(x => x.id === instance.user_id);
      if (u) {
        instance.User = {
          full_name: u.full_name,
          email: u.email
        };
      }
    }
  }
}

// Mock Sequelize Object representing schema sync
const sequelize = {
  sync: async () => {
    // Schema sync placeholder. Tables are created automatically on read/write.
    return true;
  },
  close: async () => {
    return true;
  },
  Op,
  Sequelize: {
    Op
  }
};

module.exports = {
  sequelize,
  Sequelize: sequelize.Sequelize,
  Op,
  User,
  Department,
  Complaint,
  Evidence,
  InvestigationLog,
  AuditLog
};
