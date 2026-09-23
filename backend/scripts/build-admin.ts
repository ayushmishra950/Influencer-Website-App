/**
 * Builds the admin panel and drops the result into backend/public, which is what the
 * API serves for every route that is not /api.
 *
 * The admin is built with an empty VITE_API_BASE_URL on purpose: every request it
 * makes is then relative ("/api/...", "/uploads/..."), and its Socket.IO client falls
 * back to window.location.origin. Served from this backend that all resolves to one
 * origin, so there is no CORS to configure and no build-time host to get wrong.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const backendRoot = process.cwd();
const adminRoot = path.resolve(backendRoot, '..', 'admin');
const source = path.join(adminRoot, 'dist');
const target = path.join(backendRoot, 'public');

if (!fs.existsSync(path.join(backendRoot, 'package.json'))) {
  console.error('[build:admin] run this from the backend/ folder');
  process.exit(1);
}
if (!fs.existsSync(path.join(adminRoot, 'package.json'))) {
  console.error(`[build:admin] admin project not found at ${adminRoot}`);
  process.exit(1);
}

// A host like Render installs dependencies for the service's root directory only, so
// admin/node_modules is simply absent there. Installing it here keeps the whole build
// behind one command instead of a shell one-liner that has to be kept in sync.
if (!fs.existsSync(path.join(adminRoot, 'node_modules'))) {
  const useCi = fs.existsSync(path.join(adminRoot, 'package-lock.json'));
  console.log(`[build:admin] installing admin dependencies (npm ${useCi ? 'ci' : 'install'})...`);
  try {
    // --include=dev is explicit: with NODE_ENV=production npm would skip the very
    // devDependencies the build needs (vite, typescript).
    execFileSync('npm', [useCi ? 'ci' : 'install', '--include=dev'], {
      cwd: adminRoot,
      stdio: 'inherit',
    });
  } catch {
    console.error('[build:admin] installing admin dependencies failed');
    process.exit(1);
  }
}

console.log('[build:admin] building admin...');
try {
  execFileSync('npm', ['run', 'build'], { cwd: adminRoot, stdio: 'inherit' });
} catch {
  console.error('[build:admin] the admin build failed — nothing was copied');
  process.exit(1);
}

if (!fs.existsSync(path.join(source, 'index.html'))) {
  console.error(`[build:admin] no index.html in ${source}`);
  process.exit(1);
}

// Replaced wholesale rather than merged: a stale asset left behind from an older
// build is dead weight that index.html no longer references.
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

const files = fs.readdirSync(target, { recursive: true }) as string[];
console.log(`[build:admin] copied ${files.length} entries -> ${path.relative(backendRoot, target)}/`);
console.log('[build:admin] done. "npm start" now serves the admin at /');
