const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const users = [
  {
    name: 'Admin',
    email: 'admin@msec.edu.in',
    password: 'msec@123',
    role: 'admin',
    phone: '9000000001',
  },
  {
    name: 'Purchase Manager',
    email: 'manager@msec.edu.in',
    password: 'msec@123',
    role: 'manager',
    phone: '9000000002',
  },
  {
    name: 'Store Manager',
    email: 'storemanager@msec.edu.in',
    password: 'msec@123',
    role: 'store_manager',
    phone: '9000000003',
  },
  {
    name: 'Requester User',
    email: 'user1@msec.edu.in',
    password: 'msec@123',
    role: 'user',
    phone: '9000000004',
  },
  {
    name: 'Supplier One',
    email: 'supplier1@example.com',
    password: 'msec@123',
    role: 'supplier',
    phone: '9000000005',
  },
];

const departments = [
  { name: 'Artificial Intelligence and Data Science', description: 'AI and Data Science department' },
  { name: 'Civil', description: 'Civil Engineering department' },
  { name: 'CSE', description: 'Computer Science and Engineering department' },
  { name: 'ECE', description: 'Electronics and Communication Engineering department' },
  { name: 'EEE', description: 'Electrical and Electronics Engineering department' },
  { name: 'Mechanical', description: 'Mechanical Engineering department' },
  { name: 'Information Technology', description: 'Information Technology department' },
];

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'manager', 'admin', 'store_manager', 'supplier'], default: 'user' },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', UserSchema);

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Department = mongoose.model('Department', DepartmentSchema);

const seedDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected for seeding...');

    for (const userData of users) {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        const user = new User(userData);
        await user.save();
        console.log(`Created: ${userData.email} (${userData.role})`);
      } else {
        console.log(`Already exists: ${userData.email}`);
      }
    }

    const manager = await User.findOne({ email: 'manager@msec.edu.in' });

    for (const deptData of departments) {
      const existing = await Department.findOne({ name: deptData.name });
      if (!existing) {
        const dept = new Department({
          ...deptData,
          head: manager?._id,
        });
        await dept.save();
        console.log(`Created department: ${deptData.name}`);
      } else {
        console.log(`Already exists: ${deptData.name}`);
      }
    }

    // Create sample suppliers
    const suppliersData = [
      {
        companyName: 'Acme Supplies Ltd',
        contactPerson: 'Alice Johnson',
        email: 'acme@example.com',
        phone: '9123456780',
        address: { city: 'Chennai', country: 'India' },
        isActive: true,
      },
    ];

    const Supplier = require('./models/Supplier');
    for (const sdata of suppliersData) {
      const existing = await Supplier.findOne({ email: sdata.email });
      if (!existing) {
        const sup = await Supplier.create(sdata);
        console.log(`Created supplier: ${sup.companyName}`);
      } else {
        console.log(`Supplier exists: ${existing.companyName}`);
      }
    }

    // Create a sample intent and a sample purchase order linked to it
    const Intent = require('./models/Intent');
    const PurchaseOrder = require('./models/PurchaseOrder');

    const requester = await User.findOne({ email: 'user1@msec.edu.in' });
    const dept = await Department.findOne();
    const supplier = await Supplier.findOne({ email: 'acme@example.com' });

    if (requester && dept && supplier) {
      // Create an intent if not exists
      let intent = await Intent.findOne({ title: 'Sample Office Laptops' });
      if (!intent) {
        intent = await Intent.create({
          title: 'Sample Office Laptops',
          description: 'Request for 3 office laptops for the CS lab',
          requester: requester._id,
          department: dept._id,
          items: [
            { name: 'Laptop - Model X', quantity: 3, estimatedUnitPrice: 80000 },
          ],
          estimatedCost: 240000,
          priority: 'MEDIUM',
          status: 'APPROVED',
        });
        console.log('Created sample intent:', intent.intentId || intent.title);
      } else {
        console.log('Sample intent already exists');
      }

      // Create a purchase order for the intent
      let po = await PurchaseOrder.findOne({ intent: intent._id });
      if (!po) {
        po = await PurchaseOrder.create({
          intent: intent._id,
          supplier: supplier._id,
          poType: 'NORMAL',
          type: 'ORIGINAL',
          items: [{ name: 'Laptop - Model X', quantity: 3, unitPrice: 80000 }],
          totalAmount: 240000,
          grandTotal: 240000,
          status: 'OPEN',
        });
        console.log('Created sample Purchase Order:', po.poNumber || po._id);
      } else {
        console.log('Sample PO already exists for the intent');
      }
    } else {
      console.log('Skipping intent/PO creation because requester/department/supplier not found');
    }

    console.log('\nSeeding completed!');
    console.log('\n--- Default Login Credentials ---');
    console.log('Admin:    admin@msec.edu.in / msec@123');
    console.log('Manager:  manager@msec.edu.in / msec@123');
    console.log('---------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDB();
