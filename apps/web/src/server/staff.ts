import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { RuntimeDatabase } from '@basabridge/db/runtime';
import { ServiceError } from './errors';
const derive = promisify(scrypt);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export type StaffRole = 'admin' | 'content' | 'guardian';
export class StaffPrincipal {
  constructor(
    readonly id: string,
    readonly username: string,
    readonly role: StaffRole,
  ) {}
}
export class StaffService {
  constructor(private db: RuntimeDatabase) {}
  async principal(token?: string): Promise<StaffPrincipal> {
    if (!token) throw new ServiceError('staff_required', 401);
    const row = await this.db
      .prepare(
        'SELECT u.id,u.username,u.role FROM local_staff u JOIN local_staff_sessions s ON s.staff_id = u.id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1',
      )
      .get(hash(token), Date.now());
    if (!row) throw new ServiceError('staff_required', 401);
    return new StaffPrincipal(String(row.id), String(row.username), row.role as StaffRole);
  }
  async status(token?: string) {
    let actor: StaffPrincipal | null = null;
    try {
      actor = await this.principal(token);
    } catch (error) {
      if (!(error instanceof ServiceError && error.status === 401)) throw error;
    }
    const count = await this.db.prepare('SELECT COUNT(*) AS total FROM local_staff').get();
    return {
      actor,
      bootstrap: Number(count?.total) === 0,
      staff:
        actor?.role === 'admin'
          ? await this.db
              .prepare(
                'SELECT id,username,role,active,created_at FROM local_staff ORDER BY created_at,id',
              )
              .all()
          : [],
    };
  }
  private async lock(tx: RuntimeDatabase) {
    await tx
      .prepare(
        "INSERT INTO local_rate_limits (key,count,expires_at) VALUES ('staff:administration',0,9007199254740991) ON CONFLICT(key) DO NOTHING",
      )
      .run();
    await tx
      .prepare("UPDATE local_rate_limits SET count = count WHERE key = 'staff:administration'")
      .run();
  }
  private async audit(tx: RuntimeDatabase, actor: string, action: string, target: string) {
    await tx
      .prepare('INSERT INTO local_staff_audit (id,actor_id,action,target_id,at) VALUES (?,?,?,?,?)')
      .run(randomUUID(), actor, action, target, new Date().toISOString());
  }
  async enroll(code: string, username: string, password: string) {
    if (!/^[a-z][a-z0-9_]{2,23}$/.test(username) || password.length < 14 || password.length > 128)
      throw new ServiceError('invalid_request');
    const salt = randomBytes(16).toString('hex');
    const passwordHash =
      salt + ':' + ((await derive(password, salt, 64)) as Buffer).toString('hex');
    await this.db.transaction(async (tx) => {
      await this.lock(tx);
      const count = await tx.prepare('SELECT COUNT(*) AS total FROM local_staff').get();
      let role: StaffRole;
      if (Number(count?.total) === 0) {
        const bootstrap = process.env.REVIEW_ADMIN_TOKEN;
        if (
          !bootstrap ||
          bootstrap.length < 32 ||
          !timingSafeEqual(Buffer.from(hash(code), 'hex'), Buffer.from(hash(bootstrap), 'hex'))
        )
          throw new ServiceError('forbidden', 403);
        role = 'admin';
      } else {
        const invite = await tx
          .prepare(
            'DELETE FROM local_staff_invites WHERE token_hash = ? AND expires_at > ? RETURNING role',
          )
          .get(hash(code), Date.now());
        if (!invite) throw new ServiceError('invalid_code', 403);
        role = invite.role as StaffRole;
      }
      if (await tx.prepare('SELECT id FROM local_staff WHERE username = ?').get(username))
        throw new ServiceError('username_taken', 409);
      const id = randomUUID();
      await tx
        .prepare(
          'INSERT INTO local_staff (id,username,password_hash,role,active,created_at) VALUES (?,?,?,?,1,?)',
        )
        .run(id, username, passwordHash, role, new Date().toISOString());
      await this.audit(tx, id, 'staff_enrolled', id);
    });
    return this.login(username, password);
  }
  async login(username: string, password: string) {
    const row = await this.db
      .prepare('SELECT id,password_hash FROM local_staff WHERE username = ? AND active = 1')
      .get(username);
    const stored = String(row?.password_hash ?? '0'.repeat(32) + ':' + '0'.repeat(128));
    const [salt, expected] = stored.split(':');
    const actual = (await derive(password, salt!, 64)) as Buffer;
    if (!timingSafeEqual(actual, Buffer.from(expected!, 'hex')) || !row)
      throw new ServiceError('credentials', 401);
    const token = randomBytes(32).toString('base64url');
    await this.db.transaction(async (tx) => {
      const current = await tx
        .prepare(
          'UPDATE local_staff SET active = active WHERE id = ? AND active = 1 AND password_hash = ? RETURNING id',
        )
        .get(String(row.id), stored);
      if (!current) throw new ServiceError('credentials', 401);
      await tx.prepare('DELETE FROM local_staff_sessions WHERE expires_at <= ?').run(Date.now());
      await tx
        .prepare('INSERT INTO local_staff_sessions (token_hash,staff_id,expires_at) VALUES (?,?,?)')
        .run(hash(token), String(row.id), Date.now() + 8 * 3600000);
    });
    return token;
  }
  async logout(token?: string) {
    if (token)
      await this.db
        .prepare('DELETE FROM local_staff_sessions WHERE token_hash = ?')
        .run(hash(token));
  }
  async invite(token: string | undefined, role: StaffRole) {
    const code = randomBytes(32).toString('base64url');
    await this.db.transaction(async (tx) => {
      await this.lock(tx);
      const actor = await new StaffService(tx).principal(token);
      if (actor.role !== 'admin') throw new ServiceError('forbidden', 403);
      await tx.prepare('DELETE FROM local_staff_invites WHERE expires_at <= ?').run(Date.now());
      await tx
        .prepare(
          'INSERT INTO local_staff_invites (token_hash,role,expires_at,created_by) VALUES (?,?,?,?)',
        )
        .run(hash(code), role, Date.now() + 86400000, actor.id);
      await this.audit(tx, actor.id, 'staff_invited', hash(code));
    });
    return code;
  }
  async disable(token: string | undefined, id: string) {
    await this.db.transaction(async (tx) => {
      await this.lock(tx);
      const actor = await new StaffService(tx).principal(token);
      if (actor.role !== 'admin' || actor.id === id) throw new ServiceError('forbidden', 403);
      await tx.prepare('UPDATE local_staff SET active = 0 WHERE id = ?').run(id);
      await tx.prepare('DELETE FROM local_staff_sessions WHERE staff_id = ?').run(id);
      await this.audit(tx, actor.id, 'staff_disabled', id);
    });
  }
  async changePassword(token: string | undefined, previous: string, next: string) {
    if (next.length < 14 || next.length > 128) throw new ServiceError('invalid_request');
    const actor = await this.principal(token);
    const proof = await this.login(actor.username, previous);
    await this.logout(proof);
    const salt = randomBytes(16).toString('hex');
    const value = salt + ':' + ((await derive(next, salt, 64)) as Buffer).toString('hex');
    await this.db.transaction(async (tx) => {
      await new StaffService(tx).principal(token);
      await tx
        .prepare('UPDATE local_staff SET password_hash = ? WHERE id = ?')
        .run(value, actor.id);
      await tx.prepare('DELETE FROM local_staff_sessions WHERE staff_id = ?').run(actor.id);
      await this.audit(tx, actor.id, 'password_changed', actor.id);
    });
  }
}
