import UserModel from '@/models/user.model'

export default async function initializeAdminUser() {
  const adminUser = await UserModel.findOne({ email: process.env.ADMIN_EMAIL, role: 'ADMIN' });
  if (!adminUser) {
    await UserModel.create({
      fullName: 'Admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'ADMIN',
    });

    console.log('Admin user created');
  }
}
