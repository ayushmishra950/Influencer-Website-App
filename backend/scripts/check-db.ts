/**
 * Diagnoses the MONGODB_URI in .env and explains any failure in plain terms.
 *
 *   npm run db:check
 *
 * Never prints the password.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const mask = (s: string) => s.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]*@/, '$1••••@');

const uri = process.env.MONGODB_URI ?? '';

if (!uri) {
  console.error('❌ MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

console.log('URI:', mask(uri));

// Catch the mistakes that produce confusing driver errors before we even dial out.
const problems: string[] = [];
if (/^["']|["']$/.test(uri)) problems.push('The URI is wrapped in quotes — remove them.');
if (/\s/.test(uri)) problems.push('The URI contains a space or line break.');
if (uri.includes('<') || uri.includes('>')) {
  problems.push('The URI still has Atlas placeholders like <password> — replace them with real values.');
}
if (uri.startsWith('mongodb+srv://')) {
  const afterHost = uri.slice('mongodb+srv://'.length).split('@').pop() ?? '';
  const [host, rest = ''] = [afterHost.split(/[/?]/)[0] ?? '', afterHost.slice((afterHost.split(/[/?]/)[0] ?? '').length)];
  if (host.includes(':')) problems.push('mongodb+srv:// URIs must not include a port number.');
  const dbName = rest.startsWith('/') ? rest.slice(1).split('?')[0] : '';
  if (!dbName) {
    problems.push('No database name in the URI. Add one before the "?", e.g. .mongodb.net/aura');
  }
  const pass = uri.slice('mongodb+srv://'.length).split('@')[0]?.split(':').slice(1).join(':') ?? '';
  if (/[:/?#[\]@]/.test(pass)) {
    problems.push('The password contains a character that must be percent-encoded (@ : / ? # [ ]).');
  }
}

if (problems.length) {
  console.log('\n⚠️  Problems found in the URI itself:');
  for (const p of problems) console.log('   •', p);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  console.log('\n✅ CONNECTED');
  console.log('   database   :', mongoose.connection.name);
  console.log('   host       :', mongoose.connection.host);
  const cols = await mongoose.connection.db!.listCollections().toArray();
  console.log('   collections:', cols.length ? cols.map((c) => c.name).join(', ') : '(empty — run `npm run seed`)');
  await mongoose.connection.close();
  process.exit(0);
} catch (error) {
  const err = error as Error;
  console.log('\n❌ CONNECTION FAILED');
  console.log('   ', err.name);
  console.log('   ', mask(err.message).slice(0, 500));

  // Translate the driver's message into the thing you actually have to go fix.
  const m = err.message;
  console.log('\n👉 Most likely cause:');
  if (/bad auth|Authentication failed/i.test(m)) {
    console.log('   Wrong username or password, OR the password needs percent-encoding.');
    console.log('   Atlas → Database Access → edit the user → Edit Password → Autogenerate.');
    console.log('   Encode specials: @ → %40, # → %23, / → %2F, : → %3A, ? → %3F');
  } else if (/ENOTFOUND|querySrv|getaddrinfo/i.test(m)) {
    console.log('   The cluster hostname could not be resolved — check it for typos,');
    console.log('   or your network/DNS is blocking the SRV lookup.');
  } else if (/IP that isn.t whitelisted|whitelist|not allowed to connect/i.test(m)) {
    console.log('   Your IP is not in the Atlas allowlist.');
    console.log('   Atlas → Network Access → Add IP Address → "Add Current IP Address".');
  } else if (/Server selection timed out|ETIMEDOUT/i.test(m)) {
    console.log('   Could not reach the cluster in time. Usually the Atlas IP allowlist:');
    console.log('   Atlas → Network Access → Add IP Address → "Add Current IP Address".');
    console.log('   (Also check the cluster is not paused, and that you are not behind a blocking firewall.)');
  } else {
    console.log('   See the message above.');
  }
  process.exit(1);
}
