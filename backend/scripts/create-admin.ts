/**
 * Creates (or updates) an admin account.
 *
 *   npm run create:admin -- --email you@example.com --password 'Secret@123' --name 'Your Name'
 *
 * Re-running with an existing email resets that account's password instead of
 * failing, so this doubles as a password-reset tool. Never logs the password.
 */
import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { ROLES } from '../src/config/constants.js';

function arg(flag: string): string | undefined {
  const index = process.argv.indexOf(`--${flag}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const email = arg('email')?.trim().toLowerCase();
const password = arg('password');
const name = arg('name') ?? 'Admin';

if (!email || !password) {
  console.error('Usage: npm run create:admin -- --email <email> --password <password> [--name <name>]');
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(`❌ "${email}" is not a valid email address.`);
  process.exit(1);
}
if (password.length < 8) {
  console.error('❌ Password must be at least 8 characters.');
  process.exit(1);
}

await connectDatabase();

try {
  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role !== ROLES.ADMIN) {
      // Refuse to silently turn a creator's login into an admin account.
      console.error(`❌ ${email} already exists as an influencer account. Use a different email.`);
      process.exit(1);
    }
    existing.name = name;
    existing.password = password; // the model's pre-save hook hashes it
    existing.isActive = true;
    await existing.save();
    console.log(`✅ Existing admin updated: ${email}`);
    console.log('   (password reset, account re-activated)');
  } else {
    await User.create({ name, email, password, role: ROLES.ADMIN });
    console.log(`✅ Admin created: ${email}`);
  }

  const total = await User.countDocuments({ role: ROLES.ADMIN });
  console.log(`   ${total} admin account(s) now exist.`);
  console.log('   Sign in at http://localhost:5173');
} finally {
  await disconnectDatabase();
}
