import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const password = 'walkthrough-test-42';
test('account, reading, hidden questions, saved progress, settings and deletion', async ({
  page,
}, info) => {
  const username = `read_${info.project.name}_${Date.now()}`.slice(0, 24);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mkdir('.impeccable/review', { recursive: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await page.screenshot({
    path: `.impeccable/review/${info.project.name}-signin.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Username', { exact: false }).fill(username);
  await page.getByLabel('Password', { exact: false }).fill(password);
  await page.locator('form').getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('button', { name: 'Start at the temporary level' }).click();
  await expect(
    page.getByRole('heading', { name: /Ready for your next story\?|Let.s read\./ }),
  ).toBeVisible();
  expect(
    await page.locator('.skip-link').evaluate((el) => el.getBoundingClientRect().bottom),
  ).toBeLessThan(0);
  await page.screenshot({ path: `.impeccable/review/${info.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Read an included story' }).click();
  await expect(page.getByRole('heading', { name: 'A place in the shade' })).toBeVisible();
  await page.screenshot({
    path: `.impeccable/review/${info.project.name}-reading.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Put away story and answer' }).click();
  await expect(page.locator('article')).toHaveCount(0);
  const snapshot = await (await page.request.get('/api/app')).json();
  expect(snapshot.learner.session.text).toBeNull();
  expect(JSON.stringify(snapshot)).not.toContain('answerIndexes');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Where did the child put the bowl?' }),
  ).toBeVisible();
  await page.screenshot({
    path: `.impeccable/review/${info.project.name}-question.png`,
    fullPage: true,
  });
  for (const [index, answer] of [
    'Under a tree',
    'Took a break',
    'Rested in the shade',
    'The dog was more comfortable',
  ].entries()) {
    await page.getByRole('radio', { name: answer, exact: true }).check();
    await page.getByRole('button', { name: 'Check my answer' }).click();
    await expect(page.getByRole('heading', { name: 'You found the clue.' })).toBeVisible();
    await page.getByRole('button', { name: 'Next question' }).click();
    await expect(page.getByText(`Question ${index + 2} of 5`, { exact: true })).toBeVisible();
  }
  await page.getByRole('checkbox', { name: 'A bowl', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Cool water', exact: true }).check();
  await page.getByRole('button', { name: 'Check my answer' }).click();
  await page.getByRole('button', { name: 'See my result' }).click();
  await expect(page.getByRole('heading', { name: '5 of 5 answers correct' })).toBeVisible();
  await page.screenshot({
    path: `.impeccable/review/${info.project.name}-result.png`,
    fullPage: true,
  });
  await page.getByRole('navigation').getByRole('link', { name: 'My progress' }).click();
  await expect(page.getByRole('cell', { name: /A place in the shade/ })).toBeVisible();
  await page.screenshot({
    path: `.impeccable/review/${info.project.name}-progress.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('5 of 5 answers correct', { exact: true })).toBeVisible();
  await page.locator('footer').getByRole('link', { name: 'Reading help' }).click();
  await page.getByLabel('Instruction language').selectOption('fil');
  await page.getByLabel('Use simple words').check();
  await page.getByLabel('Text size').selectOption('large');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByRole('heading', { name: 'Gawing komportable ang pagbasa.' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Laki ng teksto' })).toHaveValue('large');
  expect(await page.locator('html').getAttribute('lang')).toBe('fil');
  await page.goto('/#home');
  await page.getByRole('button', { name: 'Magbasa ng kasamang kuwento' }).click();
  await expect(page.locator('h1')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Itago ang kuwento at sumagot' }).click();
  await expect(page.locator('h1')).toHaveAttribute('lang', 'en');
  await expect(page.locator('legend')).toHaveAttribute('lang', 'en');
  await page.getByRole('navigation').getByRole('link', { name: 'Aking account' }).click();
  await page.getByText('Burahin ang aking account', { exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Tuluyang burahin ang aking account' }).click();
  await expect(page.getByRole('heading', { name: 'Mag-sign in', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('HTTP rejects forged origins, unauthenticated writes and microphone requests', async ({
  request,
}) => {
  const badOrigin = await request.post('/api/app', {
    headers: { Origin: 'https://example.com' },
    data: { action: 'skip_placement' },
  });
  expect(badOrigin.status()).toBe(403);
  const unauthenticated = await request.post('/api/app', {
    headers: { Origin: 'http://127.0.0.1:3100' },
    data: { action: 'skip_placement' },
  });
  expect(unauthenticated.status()).toBe(401);
  const microphone = await request.post('/api/app', {
    headers: { Origin: 'http://127.0.0.1:3100' },
    data: { action: 'microphone' },
  });
  expect(microphone.status()).toBe(403);
  const oversized = await request.post('/api/app', {
    headers: { Origin: 'http://127.0.0.1:3100' },
    data: { action: 'login', username: 'a'.repeat(20_000), password: 'not-a-password' },
  });
  expect(oversized.status()).toBe(413);
  const document = await request.get('/');
  expect(document.headers()['content-security-policy']).toContain("'nonce-");
  expect(document.headers()['x-frame-options']).toBe('DENY');
});

test('recovery code resets a password and cannot be reused', async ({ page }, info) => {
  const username = `recover_${info.project.name}_${Date.now()}`.slice(0, 24);
  const registration = await page.request.post('/api/app', {
    headers: { Origin: 'http://127.0.0.1:3100' },
    data: { action: 'register', username, password, role: 'student', ageBand: '13plus' },
  });
  expect(registration.ok()).toBe(true);
  await page.goto('/#account');
  await page.getByLabel('Confirm your current password').fill(password);
  await page.getByRole('button', { name: 'Create recovery code' }).click();
  const code = await page.locator('.recovery-code').innerText();
  expect(code).toMatch(/^[A-F0-9]{40}$/);
  await page.screenshot({
    path: `.impeccable/review/${info.project.name}-account.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('New password', { exact: false }).fill('replacement-password-42');
  await page.getByLabel('Recovery code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Reset password and sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  const replay = await page.request.post('/api/app', {
    headers: { Origin: 'http://127.0.0.1:3100' },
    data: { action: 'recover', username, code, password },
  });
  expect(replay.status()).toBe(401);
});

test('parent sharing is private by default and revocation takes effect immediately', async ({
  page,
  browser,
}, info) => {
  const origin = 'http://127.0.0.1:3100';
  const suffix = `${info.project.name}_${Date.now()}`.slice(-18);
  const register = await page.request.post('/api/app', {
    headers: { Origin: origin },
    data: {
      action: 'register',
      username: `s_${suffix}`,
      password,
      role: 'student',
      ageBand: 'under13',
    },
  });
  expect(register.ok()).toBe(true);
  await page.goto('/#account');
  await page.getByRole('button', { name: 'Create a linking code' }).click();
  const code = await page.locator('.code-box output').innerText();
  const parent = await browser.newContext({ baseURL: origin });
  try {
    const signed = await parent.request.post('/api/app', {
      headers: { Origin: origin },
      data: {
        action: 'register',
        username: `p_${suffix}`,
        password,
        role: 'parent',
        ageBand: 'adult',
      },
    });
    expect(signed.ok()).toBe(true);
    const parentPage = await parent.newPage();
    await parentPage.goto('/');
    await parentPage.getByLabel('Linking code', { exact: true }).fill(code);
    await parentPage.getByRole('button', { name: 'Link learner', exact: true }).click();
    await expect(parentPage.locator('.shared-learner')).toBeVisible();
    const privateState = await (await parent.request.get('/api/app')).json();
    expect(privateState.children[0]).toMatchObject({ progress: null, analysis: null });
    await page.reload();
    await page.getByLabel('Share progress', { exact: true }).click();
    await expect(page.getByLabel('Share progress', { exact: true })).toBeChecked();
    await expect(async () => {
      const state = await (await parent.request.get('/api/app')).json();
      expect(state.children[0].progress.completed).toBe(0);
      expect(state.children[0].analysis).toBeNull();
    }).toPass();
    await page.getByRole('button', { name: 'Remove link' }).click();
    await expect(async () =>
      expect((await (await parent.request.get('/api/app')).json()).children).toEqual([]),
    ).toPass();
  } finally {
    await parent.close();
  }
});
