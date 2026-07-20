const mongoose = require('mongoose');
const Intent = require('./models/Intent');

mongoose.connect('mongodb+srv://pir_app:PIR_App_2024_Secure@ac-vfd1kks-shard-00-00.x706nl9.mongodb.net/pir_db?retryWrites=true&w=majority&appName=pir-app').then(async () => {
  const intents = await Intent.find({}).select('_id status requester title');
  console.log('All intents:');
  intents.forEach(i => console.log(`  ${i._id}: status=${i.status}, requester=${i.requester}`));
  
  const pendingCount = await Intent.countDocuments({status: 'PENDING_MANAGER_APPROVAL'});
  console.log('Pending manager approvals:', pendingCount);
  
  const allStatuses = await Intent.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('Status distribution:', allStatuses);
  
  process.exit(0);
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
