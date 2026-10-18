import { expect, test } from '@playwright/test';

test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
});

test('microphone capture starts, stops and reports a provider failure without blocking silent reading', async ({
  page,
}, info) => {
  const origin = 'http://127.0.0.1:3100';
  const username = `voice_${info.project.name}_${Date.now()}`.slice(0, 24);
  const action = (data: unknown) =>
    page.request.post('/api/app', { headers: { Origin: origin }, data });
  expect(
    (
      await action({
        action: 'register',
        username,
        password: 'speech-test-password',
        role: 'student',
        ageBand: '13plus',
      })
    ).ok(),
  ).toBe(true);
  await action({ action: 'skip_placement' });
  await action({ action: 'start', source: 'walkthrough' });
  // Exercise recorder UI with a fake microphone. The server has no provider key and must fail visibly.
  await page.route('**/api/app', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({
      response,
      json: { ...data, aiConfigured: true, speechConfigured: true, speechProvider: 'groq' },
    });
  });
  await page.goto('/#reading');
  await page.locator('.reading-voice > summary').click();
  await page.getByRole('checkbox', { name: /I agree to send/ }).check();
  await page.getByRole('button', { name: 'Allow read-aloud', exact: true }).click();
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop and check my reading' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to questions' })).toBeDisabled();
  await expect(page.getByText(/Recording: [1-9]/)).toBeVisible();
  await page.screenshot({
    path: `.impeccable/review/${info.project.name}-recording.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Stop and check my reading' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Read-aloud is unavailable' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start recording' })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue to questions' }).click();
  await expect(
    page.getByRole('heading', { name: 'Where did the child put the bowl?' }),
  ).toBeVisible();
});
