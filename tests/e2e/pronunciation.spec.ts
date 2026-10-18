import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
});

// Provider fixtures exist only in this browser test. No synthetic results enter app storage.
test('Azure capture, word feedback, privacy controls and responsive layout', async ({
  page,
  context,
}, info) => {
  await page.addInitScript(() => {
    const getMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    const captureWindow = window as typeof window & { captureTracks: MediaStreamTrack[] };
    captureWindow.captureTracks = [];
    navigator.mediaDevices.getUserMedia = async (options) => {
      const media = await getMedia(options);
      captureWindow.captureTracks.push(...media.getTracks());
      return media;
    };
  });
  const password = 'ephemeral-pronunciation-test-42';
  const action = async (data: Record<string, unknown>) => {
    const response = await context.request.post('/api/app', {
      headers: { Origin: 'http://127.0.0.1:3100' },
      data,
    });
    expect(response.ok()).toBe(true);
    return response.json();
  };
  await action({
    action: 'register',
    username: `pron_${info.project.name}_${Date.now()}`.slice(0, 24),
    password,
    role: 'student',
    ageBand: '13plus',
  });
  try {
    await action({ action: 'skip_placement' });
    await action({ action: 'start', source: 'walkthrough' });
    let latest: unknown = null;
    await page.route('**/api/app', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      data.speechProvider = 'azure';
      data.speechConfigured = true;
      if (
        latest &&
        data.learner?.session &&
        ['reading', 'done'].includes(data.learner.session.phase)
      ) {
        data.learner.session.voice.latest = latest;
        data.learner.session.voice.used = 1;
      }
      await route.fulfill({ response, json: data });
    });
    let requests = 0;
    await page.route('**/api/speech', async (route) => {
      requests++;
      const body = route.request().postDataBuffer()!;
      expect(route.request().headers()['content-type']).toBe('audio/wav');
      expect(body.subarray(0, 4).toString()).toBe('RIFF');
      expect(body.readUInt32LE(24)).toBe(16000);
      expect(body.length).toBeGreaterThan(100);
      const data = await (await context.request.get('/api/app')).json();
      const reference: string[] = data.learner.session.text.match(/[A-Za-z0-9]+(?:'[A-Za-z]+)?/g);
      latest = {
        completed: true,
        lastWordIndex: reference.length - 1,
        wordsTotal: reference.length,
        wordsRight: reference.length,
        seconds: 20,
        wordsPerMinute: Math.round(reference.length * 3),
        words: reference.map((word) => ({
          expected: word,
          heard: word,
          outcome: 'correct',
          confidence: 0.9,
          markedMisheard: false,
        })),
        pronunciation: {
          provider: 'azure',
          locale: 'en-US',
          accuracy: (42 + 90 * (reference.length - 1)) / reference.length,
          fluency: 77,
          completeness: 100,
          words: [
            { alignmentIndex: 0, accuracy: 42, phonemes: [{ phoneme: '\u00f0', accuracy: 35 }] },
            ...reference
              .slice(1)
              .map((_, i) => ({ alignmentIndex: i + 1, accuracy: 90, phonemes: [] })),
          ],
        },
      };
      data.speechProvider = 'azure';
      data.speechConfigured = true;
      data.learner.session.voice.latest = latest;
      data.learner.session.voice.used = 1;
      await route.fulfill({ json: data });
    });
    await page.goto('/#reading');
    await page.locator('summary').filter({ hasText: 'Read aloud (optional)' }).click();
    await expect(
      page.getByText(/I agree to send.*story recording to Microsoft Azure Speech/),
    ).toBeVisible();
    await page.getByRole('checkbox', { name: /I agree to send.*story recording/ }).check();
    await page.getByRole('button', { name: 'Allow read-aloud', exact: true }).click();
    await page.getByRole('button', { name: 'Start recording', exact: true }).click();
    await page.getByRole('button', { name: 'Stop and check my reading', exact: true }).waitFor();
    await expect(page.getByText(/120/)).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Discard recording', exact: true }).click();
    expect(requests).toBe(0);
    expect(
      await page.evaluate(() =>
        (window as typeof window & { captureTracks: MediaStreamTrack[] }).captureTracks.every(
          (track) => track.readyState === 'ended',
        ),
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Start recording', exact: true }).click();
    await page.getByRole('button', { name: 'Stop and check my reading', exact: true }).waitFor();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Stop and check my reading', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Your pronunciation', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('/\u00f0/ 35', { exact: true })).toBeVisible();
    expect(requests).toBe(1);
    expect(
      await page.evaluate(() =>
        (window as typeof window & { captureTracks: MediaStreamTrack[] }).captureTracks.every(
          (track) => track.readyState === 'ended',
        ),
      ),
    ).toBe(true);
    await expect(page.getByRole('button', { name: 'Start recording', exact: true })).toBeEnabled();
    await expect(page.getByText('Azure estimates these scores', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await mkdir('.impeccable/review/pronunciation', { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `.impeccable/review/pronunciation/${info.project.name}.png`,
      fullPage: true,
    });
    if (info.project.name === 'desktop') {
      await page.setViewportSize({ width: 1920, height: 930 });
      await page.screenshot({
        path: '.impeccable/review/pronunciation/user-1920.png',
        fullPage: true,
      });
    }
    await page.getByRole('button', { name: 'Withdraw microphone consent', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Allow read-aloud', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Continue to questions', exact: true }).click();
    const state = await (await context.request.get('/api/app')).json();
    const session = state.learner.session;
    for (let index = 0; index < session.total; index++) {
      await action({ action: 'answer', id: session.id, index, chosen: [0] });
      await action({ action: 'next', id: session.id, index });
    }
    await page.reload();
    await expect(
      page.getByText('You have finished the questions.', { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText('After the questions, you can practise', { exact: false }),
    ).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `.impeccable/review/pronunciation/${info.project.name}-saved.png`,
      fullPage: true,
    });
    const parent = await context
      .browser()!
      .newContext({ baseURL: 'http://127.0.0.1:3100', viewport: page.viewportSize()! });
    const parentAction = async (data: Record<string, unknown>) => {
      const response = await parent.request.post('/api/app', {
        headers: { Origin: 'http://127.0.0.1:3100' },
        data,
      });
      expect(response.ok()).toBe(true);
      return response.json();
    };
    try {
      const adult = await parentAction({
        action: 'register',
        username: `p_${info.project.name}_${Date.now().toString(36)}`,
        password,
        role: 'parent',
        ageBand: 'adult',
      });
      const link = await action({ action: 'link_code' });
      await parentAction({ action: 'redeem', code: link.code });
      await action({
        action: 'sharing',
        parentId: adult.account.id,
        progress: false,
        analysis: true,
        revoke: false,
      });
      const parentPage = await parent.newPage();
      await parentPage.route('**/api/app', async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        // Supply the test-only acoustic result only within actually authorized shared analysis.
        for (const child of data.children ?? [])
          for (const reading of child.analysis ?? []) reading.voice = latest;
        await route.fulfill({ response, json: data });
      });
      await parentPage.goto('/');
      await parentPage.getByText('Shared answer details', { exact: true }).click();
      await parentPage.getByText('Words to check', { exact: true }).click();
      await expect(
        parentPage.getByText('The learner can open Learn in their account', { exact: false }),
      ).toBeVisible();
      await expect(
        parentPage.getByText('After the questions, you can practise', { exact: false }),
      ).toHaveCount(0);
      await parentPage.evaluate(() => window.scrollTo(0, 0));
      await parentPage.screenshot({
        path: `.impeccable/review/pronunciation/${info.project.name}-parent.png`,
        fullPage: true,
      });
    } finally {
      await parentAction({ action: 'delete', password });
      await parent.close();
    }
  } finally {
    await action({ action: 'delete', password });
  }
});
