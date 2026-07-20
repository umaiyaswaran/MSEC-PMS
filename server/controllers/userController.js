const User = require('../models/User');
const Department = require('../models/Department');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      department,
      search,
      isActive,
    } = req.query;

    const query = {};

    if (role) {
      query.role = role;
    }

    if (department) {
      query.department = department;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    return paginatedResponse(res, users, page, limit, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error fetching users');
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('department', 'name description');
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }
    return successResponse(res, 200, 'User retrieved successfully', user);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid user ID format');
    }
    return errorResponse(res, 500, error.message || 'Error fetching user');
  }
};

const updateUser = async (req, res) => {
  try {
    const allowedFields = ['name', 'email', 'role', 'department', 'phone', 'avatar', 'isActive'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 400, 'No valid fields to update');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    if (updates.email && updates.email !== user.email) {
      const emailExists = await User.findOne({ email: updates.email, _id: { $ne: user._id } });
      if (emailExists) {
        return errorResponse(res, 400, 'Email is already in use');
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('department', 'name');

    return successResponse(res, 200, 'User updated successfully', updatedUser);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 400, 'Email already exists');
    }
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid user ID format');
    }
    return errorResponse(res, 500, error.message || 'Error updating user');
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    if (req.user._id.toString() === req.params.id) {
      return errorResponse(res, 400, 'You cannot deactivate your own account');
    }

    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    return successResponse(res, 200, 'User deactivated successfully');
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid user ID format');
    }
    return errorResponse(res, 500, error.message || 'Error deleting user');
  }
};

const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('head', 'name email')
      .sort({ name: 1 });
    return successResponse(res, 200, 'Departments retrieved successfully', departments);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error fetching departments');
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, description, head } = req.body;

    const existingDept = await Department.findOne({ name });
    if (existingDept) {
      return errorResponse(res, 400, 'Department with this name already exists');
    }

    const department = await Department.create({
      name,
      description,
      head,
    });

    return successResponse(res, 201, 'Department created successfully', department);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 400, 'Department with this name already exists');
    }
    return errorResponse(res, 500, error.message || 'Error creating department');
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { name, description, head } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) {
      return errorResponse(res, 404, 'Department not found');
    }

    if (name && name !== department.name) {
      const existingDept = await Department.findOne({ name, _id: { $ne: department._id } });
      if (existingDept) {
        return errorResponse(res, 400, 'Department name already in use');
      }
    }

    const updatedDepartment = await Department.findByIdAndUpdate(
      req.params.id,
      { $set: { name, description, head } },
      { new: true, runValidators: true }
    ).populate('head', 'name email');

    return successResponse(res, 200, 'Department updated successfully', updatedDepartment);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 400, 'Department name already exists');
    }
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid department ID format');
    }
    return errorResponse(res, 500, error.message || 'Error updating department');
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return errorResponse(res, 404, 'Department not found');
    }

    const User = require('../models/User');
    const usersInDept = await User.countDocuments({ department: department._id, isActive: true });
    if (usersInDept > 0) {
      return errorResponse(
        res,
        400,
        `Cannot deactivate department. ${usersInDept} active user(s) are assigned to this department.`
      );
    }

    department.isActive = false;
    await department.save({ validateBeforeSave: false });

    return successResponse(res, 200, 'Department deactivated successfully');
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid department ID format');
    }
    return errorResponse(res, 500, error.message || 'Error deleting department');
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
