import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from '../models/User';
async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sayem_ecom_db');
  const existing = await User.findOne({ email: 'admin@sayemecom.com' });
  if (existing) { console.log('Admin already exists'); process.exit(0); }
  await User.create({ name: 'Admin', email: 'admin@sayemecom.com', password: 'Admin123456', role: 'admin', isEmailVerified: true });
  console.log('Admin created! Email: admin@sayemecom.com | Password: Admin123456');
  process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
