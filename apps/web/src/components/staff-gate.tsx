'use client';
import { useEffect, useState } from 'react';
import { catalog, type MessageKey } from '@/lib/i18n';
type T = (key: MessageKey, values?: Record<string, string | number>) => string;
type Staff = {
  id: string;
  username: string;
  role: 'admin' | 'content' | 'guardian';
  active: number;
};
type Status = { actor: Staff | null; bootstrap: boolean; staff: Staff[] };
export function StaffGate({ t, onChange }: { t: T; onChange: (username: string | null) => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [enroll, setEnroll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [invite, setInvite] = useState('');
  const [metrics, setMetrics] = useState<
    | {
        day: string;
        operation: string;
        outcome: string;
        count: string | number;
        duration_ms: string | number;
      }[]
    | null
  >(null);
  const label = (value: string) => {
    const key = `operation_${value}`;
    return t(key in catalog ? (key as MessageKey) : 'unavailable');
  };
  async function request(body?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/staff', {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: 'no-store',
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error in catalog ? data.error : 'unavailable');
        return false;
      }
      setStatus(data);
      setInvite(data.invite ?? '');
      if (!body && data.bootstrap) setEnroll(true);
      onChange(data.actor?.username ?? null);
      return true;
    } catch {
      setError('unavailable');
      return false;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void request();
  }, []);
  if (!status)
    return error ? (
      <div className="form-stack">
        <p role="alert">{t(error)}</p>
        <button className="button secondary" disabled={busy} onClick={() => void request()}>
          {t('retry')}
        </button>
      </div>
    ) : (
      <p role="status">{t('loading')}</p>
    );
  return (
    <section className="settings-section form-stack">
      {error && (
        <p className="message error" role="alert">
          {t(error)}
        </p>
      )}
      {!status.actor ? (
        <>
          <h2>{t(enroll ? 'staff_enroll' : 'staff_login')}</h2>
          {status.bootstrap && <p>{t('staff_bootstrap_notice')}</p>}
          <form
            className="form-stack narrow"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const values = new FormData(form);
              if (
                await request({
                  action: enroll ? 'enroll' : 'login',
                  username: values.get('username'),
                  password: values.get('password'),
                  ...(enroll ? { code: values.get('code') } : {}),
                })
              )
                form.reset();
            }}
          >
            <label className="field">
              <span>{t('staff_username')}</span>
              <input
                name="username"
                required
                pattern="[a-z][a-z0-9_]{2,23}"
                minLength={3}
                maxLength={24}
                autoComplete="username"
              />
            </label>
            <label className="field">
              <span>{t('password')}</span>
              <input
                name="password"
                type="password"
                required
                minLength={enroll ? 14 : 1}
                maxLength={128}
                autoComplete={enroll ? 'new-password' : 'current-password'}
              />
            </label>
            {enroll && (
              <>
                <p>{t('staff_password_help')}</p>
                <label className="field">
                  <span>{t(status.bootstrap ? 'staff_bootstrap_code' : 'staff_invite_code')}</span>
                  <input
                    name="code"
                    type="password"
                    required
                    minLength={32}
                    maxLength={256}
                    autoComplete="off"
                  />
                </label>
              </>
            )}
            <button className="primary" disabled={busy}>
              {t(enroll ? 'staff_enroll' : 'staff_login')}
            </button>
          </form>
          <button className="text-button" disabled={busy} onClick={() => setEnroll(!enroll)}>
            {t(enroll ? 'staff_login' : 'staff_enroll')}
          </button>
        </>
      ) : (
        <>
          <p>
            {t('staff_identity', { username: status.actor.username })}{' '}
            <strong>{t(`staff_role_${status.actor.role}`)}</strong>
          </p>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void request({ action: 'logout' })}
          >
            {t('review_logout')}
          </button>
          {status.actor.role === 'admin' && (
            <details>
              <summary>{t('staff_manage')}</summary>
              <form
                className="button-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void request({
                    action: 'invite',
                    role: new FormData(e.currentTarget).get('role'),
                  });
                }}
              >
                <label className="field">
                  <span>{t('staff_role')}</span>
                  <select name="role">
                    {(['content', 'guardian', 'admin'] as const).map((role) => (
                      <option key={role} value={role}>
                        {t(`staff_role_${role}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="secondary" disabled={busy}>
                  {t('staff_invite')}
                </button>
              </form>
              {invite && (
                <div className="message" role="status">
                  <p>{t('staff_invite_once')}</p>
                  <output className="reference-code">{invite}</output>
                </div>
              )}
              <ul className="lesson-list">
                {status.staff.map((member) => (
                  <li className="lesson-row" key={member.id}>
                    <div>
                      <strong>{member.username}</strong>
                      <p>
                        {t(`staff_role_${member.role}`)} ·{' '}
                        {t(member.active ? 'staff_active' : 'staff_disabled')}
                      </p>
                    </div>
                    {member.active === 1 && member.id !== status.actor!.id && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => void request({ action: 'disable', id: member.id })}
                      >
                        {t('staff_disable')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {status.actor.role === 'admin' && (
            <details>
              <summary>{t('operation_title')}</summary>
              <button
                className="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const response = await fetch('/api/operations', {
                      cache: 'no-store',
                      signal: AbortSignal.timeout(15000),
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error();
                    setMetrics(data.metrics);
                  } catch {
                    setError('unavailable');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t('operation_load')}
              </button>
              {metrics &&
                (!metrics.length ? (
                  <p>{t('operation_empty')}</p>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          {(
                            [
                              'operation_day',
                              'operation_name',
                              'operation_outcome',
                              'operation_count',
                              'operation_duration',
                            ] as const
                          ).map((key) => (
                            <th key={key} scope="col">
                              {t(key)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((row) => (
                          <tr key={`${row.day}-${row.operation}-${row.outcome}`}>
                            <td>{row.day}</td>
                            <td>{label(row.operation)}</td>
                            <td>{label(row.outcome)}</td>
                            <td>{Number(row.count)}</td>
                            <td>
                              {(Number(row.duration_ms) / Number(row.count) / 1000).toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </details>
          )}
          <details>
            <summary>{t('staff_password_change')}</summary>
            <form
              className="form-stack narrow"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  values = new FormData(form);
                if (
                  await request({
                    action: 'password',
                    previous: values.get('previous'),
                    password: values.get('password'),
                  })
                )
                  form.reset();
              }}
            >
              <label className="field">
                <span>{t('staff_current_password')}</span>
                <input
                  type="password"
                  name="previous"
                  required
                  maxLength={128}
                  autoComplete="current-password"
                />
              </label>
              <label className="field">
                <span>{t('staff_new_password')}</span>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={14}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
              <p>{t('staff_password_help')}</p>
              <button className="secondary" disabled={busy}>
                {t('staff_password_change')}
              </button>
            </form>
          </details>
        </>
      )}
    </section>
  );
}
