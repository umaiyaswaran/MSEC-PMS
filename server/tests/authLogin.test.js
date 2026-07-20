const test = require('node:test');
const assert = require('node:assert/strict');

const authController = require('../controllers/authController');
const User = require('../models/User');

test('login auto-creates a user for the default @msec.edu.in demo credentials', async () => {
  let createCalls = 0;
  let findCalls = 0;

  User.findOne = async () => {
    findCalls += 1;
    return null;
  };

  User.create = async (data) => {
    createCalls += 1;
    return {
      _id: 'new-user-id',
      ...data,
      isActive: true,
      lastLogin: null,
      password: 'hashed-password',
      matchPassword: async () => true,
      save: async function () {
        this.lastLogin = new Date();
        return this;
      },
      toObject: function () {
        return { ...this };
      },
    };
  };

  const req = {
    body: {
      email: 'someone@msec.edu.in',
      password: 'msec@123',
    },
  };

  const res = {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    cookie() {
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  await authController.login(req, res);

  assert.equal(findCalls, 1);
  assert.equal(createCalls, 1);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.email, 'someone@msec.edu.in');
});
