import type { Database } from '../types';
import { type AdminInsert, admins } from '../schemas';
import { eq } from 'drizzle-orm';
import { ROOT_ADMIN_EMAIL } from 'src/dashboard/admins/constants';

const adminsSeed: AdminInsert[] = [
  {
    email: ROOT_ADMIN_EMAIL,
    name: 'Zecond Admin',
    passwordHash:
      '$argon2id$v=19$m=6144,t=5,p=3$SEAfiYNZXxmNasPQ64HaFw$kdwWU0o4EZRF6yfrThtCA8XQHf5un5Zch8r7avzuOTE', // password: 6s8G2njl
  },
];

export async function seedAdmins(db: Database) {
  try {
    for (let v of adminsSeed) {
      const admin = await db
        .select({ email: admins.email })
        .from(admins)
        .where(eq(admins.email, v.email));
      if (admin.length) continue;
      await db.insert(admins).values(v);
    }
  } catch (e) {
    console.log(e);
    console.log('');
  }
}
