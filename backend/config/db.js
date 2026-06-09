// Pure JavaScript mock database engine configurations for local execution
const Op = {
  or: Symbol('or'),
  gte: Symbol('gte'),
  lt: Symbol('lt'),
  ne: Symbol('ne'),
  notIn: Symbol('notIn')
};

const sequelize = {
  sync: async () => {
    console.log('Local JSON database system synced successfully.');
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

module.exports = sequelize;
