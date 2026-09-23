/**
 * End-to-end realtime check: connects real sockets, performs real admin actions,
 * and asserts the right events land on the right clients.
 *
 *   npm run seed && npm run dev   (other terminal)
 *   npm run test:realtime
 */
import { io, type Socket } from 'socket.io-client';

const API = 'http://localhost:5050';
let pass = 0;
let fail = 0;

const check = (label: string, ok: boolean, detail = '') => {
  if (ok) { console.log(`  PASS  ${label}`); pass++; }
  else { console.log(`  FAIL  ${label}${detail ? ` -> ${detail}` : ''}`); fail++; }
};

async function api<T>(path: string, options: { method?: string; token?: string; body?: unknown } = {}): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as T };
}

const login = async (email: string, password: string) => {
  const { body } = await api<{ data?: { token: string; user: { id: string } } }>('/api/auth/login', {
    method: 'POST', body: { email, password },
  });
  return body?.data;
};

/** Resolves with the first matching event, or null if it never arrives. */
function waitFor<T>(socket: Socket, event: string, ms = 5000): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { socket.off(event, handler); resolve(null); }, ms);
    const handler = (payload: T) => { clearTimeout(timer); socket.off(event, handler); resolve(payload); };
    socket.on(event, handler);
  });
}

const connect = (token: string): Promise<Socket | null> =>
  new Promise((resolve) => {
    const socket = io(API, { auth: { token }, transports: ['websocket'], reconnection: false });
    const timer = setTimeout(() => resolve(null), 5000);
    socket.on('connect', () => { clearTimeout(timer); resolve(socket); });
    socket.on('connect_error', () => { clearTimeout(timer); resolve(null); });
  });

async function main() {
  // Several logins happen below; if the limiter has already tripped, every later
  // assertion fails for the same uninteresting reason. Say so once and stop.
  const probe = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@aura.dev', password: 'Admin@12345' }),
  });
  if (probe.status === 429) {
    console.log('  RATE LIMITED. The auth limiter is doing its job.');
    console.log('  Raise AUTH_RATE_LIMIT in backend/.env and restart the server,');
    console.log('  or wait for the 15-minute window to reset.');
    process.exit(1);
  }

  console.log('── 1. Socket authentication ──');
  const bad = await connect('not.a.real.token');
  check('invalid token is refused', bad === null);

  const noToken = await new Promise<Socket | null>((resolve) => {
    const s = io(API, { transports: ['websocket'], reconnection: false });
    const t = setTimeout(() => resolve(null), 4000);
    s.on('connect', () => { clearTimeout(t); resolve(s); });
    s.on('connect_error', () => { clearTimeout(t); resolve(null); });
  });
  check('missing token is refused', noToken === null);

  const admin = await login('admin@aura.dev', 'Admin@12345');
  if (!admin) { console.log('  cannot log in as admin — seeded?'); process.exit(1); }
  const adminSocket = await connect(admin.token);
  check('admin connects with a valid token', adminSocket !== null);
  if (!adminSocket) process.exit(1);

  console.log('\n── 2. New registration notifies admins ──');
  const { body: cats } = await api<{ data: { _id: string; name: string }[] }>('/api/public/categories');
  const categoryId = cats.data?.[0]?._id;
  if (!categoryId) {
    check('categories are seeded', false);
    process.exit(1);
  }
  const stamp = Date.now();
  const newEmail = `realtime.${stamp}@example.com`;

  const adminGotRegistration = waitFor<{ notification: { title: string; influencer: string; influencerName: string }; unread: number }>(
    adminSocket, 'notification:new',
  );
  const { status: regStatus } = await api('/api/auth/register', {
    method: 'POST',
    body: {
      name: `Realtime Tester ${stamp}`, email: newEmail, password: 'Password@123',
      category: categoryId, location: { country: 'India', state: 'Goa', city: 'Panaji' },
    },
  });
  check('registration accepted', regStatus === 201, String(regStatus));

  const regEvent = await adminGotRegistration;
  check('admin received notification:new', regEvent !== null);
  check('notification names the influencer', regEvent?.notification.influencerName.includes('Realtime Tester') ?? false, regEvent?.notification.influencerName);
  check('notification carries influencer id for click-through', !!regEvent?.notification.influencer);
  check('unread count came with it', typeof regEvent?.unread === 'number' && regEvent.unread > 0, String(regEvent?.unread));

  console.log('\n── 3. Unread count survives a reload (persisted) ──');
  const { body: unreadBody } = await api<{ data: { unread: number } }>('/api/notifications/unread-count', { token: admin.token });
  check('REST unread-count > 0', unreadBody.data.unread > 0, String(unreadBody.data.unread));
  const { body: listBody } = await api<{ data: { _id: string; title: string }[]; meta: { unread: number } }>('/api/notifications', { token: admin.token });
  check('inbox returns stored notifications', (listBody.data?.length ?? 0) > 0);

  console.log('\n── 4. Mark read updates the count ──');
  const first = listBody.data?.[0];
  if (!first) {
    check('cannot continue without a stored notification', false);
    process.exit(1);
  }
  const firstId = first._id;
  const { body: readBody } = await api<{ data: { unread: number } }>(`/api/notifications/${firstId}/read`, { method: 'PATCH', token: admin.token });
  check('unread decreases after marking read', readBody.data.unread === unreadBody.data.unread - 1, `${readBody.data.unread} vs ${unreadBody.data.unread}`);
  const { body: allRead } = await api<{ data: { unread: number } }>('/api/notifications/read-all', { method: 'PATCH', token: admin.token });
  check('read-all zeroes the count', allRead.data.unread === 0);

  console.log('\n── 5. Admin action notifies the influencer ──');
  const { body: pending } = await api<{ data: { _id: string; email: string }[] }>(
    `/api/admin/influencers?status=pending&q=Realtime+Tester+${stamp}`, { token: admin.token },
  );
  const target = pending.data[0];
  check('new registration is in the pending queue', !!target);
  if (!target) process.exit(1);

  await api(`/api/admin/influencers/${target._id}/approve`, { method: 'PATCH', token: admin.token });
  const creator = await login(newEmail, 'Password@123');
  check('approved influencer can now log in', !!creator);
  if (!creator) process.exit(1);

  const creatorSocket = await connect(creator.token);
  check('influencer connects a socket', creatorSocket !== null);
  if (!creatorSocket) process.exit(1);

  const editNotice = waitFor<{ notification: { type: string } }>(creatorSocket, 'notification:new');
  await api(`/api/admin/influencers/${target._id}`, {
    method: 'PUT', token: admin.token, body: { bio: 'Edited by admin during realtime test' },
  });
  const edit = await editNotice;
  check('influencer notified of admin edit', edit?.notification.type === 'profile.updated', edit?.notification.type);

  console.log('\n── 6. Archive forces logout with a reason ──');
  const revoked = waitFor<{ reason: string; message: string }>(creatorSocket, 'session:revoked');
  const archiveNotice = waitFor<{ notification: { type: string } }>(creatorSocket, 'notification:new');
  await api(`/api/admin/influencers/${target._id}/archive`, { method: 'PATCH', token: admin.token });

  const revokeEvent = await revoked;
  check('influencer received session:revoked', revokeEvent !== null);
  check('reason is "archived"', revokeEvent?.reason === 'archived', revokeEvent?.reason);
  check('message explains why', (revokeEvent?.message?.length ?? 0) > 20, revokeEvent?.message);
  check('archive notification also sent', (await archiveNotice)?.notification.type === 'profile.archived');

  console.log('\n── 7. Old token stops working server-side ──');
  const { status: afterArchive } = await api('/api/influencer/profile', { token: creator.token });
  check('archived token refused on /api/influencer/profile', afterArchive === 403, String(afterArchive));
  const { status: notifStillOk } = await api('/api/notifications', { token: creator.token });
  check('but they can still read WHY (notifications)', notifStillOk === 200, String(notifStillOk));

  console.log('\n── 8. Delete revokes too ──');
  await api(`/api/admin/influencers/${target._id}/restore`, { method: 'PATCH', token: admin.token });
  const creator2 = await login(newEmail, 'Password@123');
  check('restored influencer can log in again', !!creator2);
  if (creator2) {
    const socket2 = await connect(creator2.token);
    if (socket2) {
      // Regression guard: approving used to notify the influencer but never tell their
      // app that the package LIST had changed, so the profile kept showing "Under
      // review" until a manual pull-to-refresh.
      console.log('\n── 8b. Package review reaches the influencer live ──');
      const { body: made } = await api<{ data?: { _id: string } }>('/api/influencer/packages', {
        method: 'POST',
        token: creator2.token,
        body: { title: 'Realtime package', description: 'From the suite.', price: 2222, deliveryDays: 1 },
      });
      const packageId = made?.data?._id;
      check('package submitted', !!packageId);

      if (packageId) {
        const adminSawApproval = waitFor<{ at: string }>(adminSocket, 'package:changed');
        const creatorSawApproval = waitFor<{ at: string }>(socket2, 'package:changed');
        await api(`/api/admin/packages/${packageId}/approve`, { method: 'PATCH', token: admin.token });
        check('influencer is told on approval', (await creatorSawApproval) !== null);
        check('admins are told too, so a second queue updates', (await adminSawApproval) !== null);

        const creatorSawReject = waitFor<{ at: string }>(socket2, 'package:changed');
        await api(`/api/admin/packages/${packageId}/reject`, {
          method: 'PATCH', token: admin.token, body: { reason: 'Suite' },
        });
        check('influencer is told on rejection', (await creatorSawReject) !== null);

        const creatorSawDelete = waitFor<{ at: string }>(socket2, 'package:changed');
        await api(`/api/admin/packages/${packageId}`, { method: 'DELETE', token: admin.token });
        check('influencer is told on delete', (await creatorSawDelete) !== null);
      }

      console.log('\n── 8c. Delete still revokes the session ──');
      const deleteRevoke = waitFor<{ reason: string }>(socket2, 'session:revoked');
      await api(`/api/admin/influencers/${target._id}`, { method: 'DELETE', token: admin.token });
      const ev = await deleteRevoke;
      check('delete sends session:revoked', ev !== null);
      check('reason is "deleted"', ev?.reason === 'deleted', ev?.reason);
      socket2.close();
    }
  }

  adminSocket.close();
  creatorSocket.close();

  console.log(`\n════ ${pass} passed, ${fail} failed ════`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
