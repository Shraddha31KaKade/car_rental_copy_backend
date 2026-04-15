const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@example.com';
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
      });
      console.log(`Updated existing user ${email} to ADMIN.`);
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: email,
          password: hashedPassword,
          role: 'ADMIN',
          isVerified: true
        }
      });
      console.log(`Created new ADMIN user: ${email} (password: admin123)`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
