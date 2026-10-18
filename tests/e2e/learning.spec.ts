import { test, expect, request, type Page, type APIRequestContext } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { PLACEMENT_CONTENT } from '../../packages/story-ai/src/placement-bank';
import { PLACEMENT_RULE } from '../../packages/levels/src/evidence';
import { LESSON_CONTENT } from '../../packages/learn/src/content';
const secret = 'test-review-token-only-for-ephemeral-e2e-42';
const password = 'learning-browser-test-42';
const origin = 'http://127.0.0.1:3100';
async function action(api: APIRequestContext, data: Record<string, unknown>) {
  const response = await api.post('/api/app', { data, headers: { Origin: origin } });
  expect(response.ok()).toBe(true);
  return response.json();
}
async function capture(page: Page, project: string, state: string) {
  await mkdir('.impeccable/review/features', { recursive: true });
  await page.screenshot({
    path: `.impeccable/review/features/${project}-${state}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
test.beforeAll(async () => {
  const api = await request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const status = await (await api.get('/api/staff')).json();
  const login = await api.post('/api/staff', {
    data: {
      action: status.bootstrap ? 'enroll' : 'login',
      ...(status.bootstrap ? { code: secret } : {}),
      username: 'test_staff_admin',
      password: 'staff-browser-password-42',
    },
  });
  expect(login.ok()).toBe(true);
  const response = await api.get('/api/review');
  expect(response.ok()).toBe(true);
  const data = await response.json();
  for (const item of data.content.filter(
    (c: { kind: string; id: string }) =>
      c.kind === 'placement' || ['key_detail-early', 'word_in_context-early'].includes(c.id),
  )) {
    const approved = await api.post('/api/review', {
      data: {
        action: 'content',
        id: item.id,
        hash: item.hash,
        reviewer: 'ephemeral-test-reviewer',
        status: 'approved',
        confirmed: true,
      },
    });
    expect(approved.ok()).toBe(true);
  }
  await api.dispose();
});

test('staff invitations grant scoped access and revocation closes an active session', async ({
  page,
  browser,
}, info) => {
  await page.goto('/review');
  await page.getByLabel('Staff username').fill('test_staff_admin');
  await page.getByLabel('Password', { exact: true }).fill('staff-browser-password-42');
  await page.getByRole('button', { name: 'Staff sign in', exact: true }).first().click();
  await expect(page.getByText('Signed in as test_staff_admin.')).toBeVisible();
  await page.getByText('Manage staff access', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Staff role', exact: true }).selectOption('content');
  await page.getByRole('button', { name: 'Create invitation', exact: true }).click();
  const invitation = await page.locator('output.reference-code').textContent();
  expect(invitation).toBeTruthy();
  // Capture only after the private invitation has been consumed and cleared.
  const reviewer = await browser.newContext({ baseURL: origin });
  const username = `review_${info.project.name}`;
  try {
    const enrolled = await reviewer.request.post('/api/staff', {
      headers: { Origin: origin },
      data: {
        action: 'enroll',
        code: invitation!.trim(),
        username,
        password: 'scoped-review-password-42',
      },
    });
    expect(enrolled.ok()).toBe(true);
    const scoped = await (await reviewer.request.get('/api/review')).json();
    expect(scoped.guardians).toEqual([]);
    expect(scoped.content.length).toBeGreaterThan(0);
    const denied = await reviewer.request.get('/api/operations');
    expect(denied.status()).toBe(403);
    await page.reload();
    await page.getByText('Manage staff access', { exact: true }).click();
    const row = page.getByRole('listitem').filter({ hasText: username });
    await row.getByRole('button', { name: 'Withdraw staff access', exact: true }).click();
    await expect(row).toContainText('Access withdrawn');
    await page.getByText('Service health totals', { exact: true }).click();
    await page.getByRole('button', { name: 'Refresh service totals', exact: true }).click();
    await capture(page, info.project.name, 'staff-management');
    expect((await reviewer.request.get('/api/review')).status()).toBe(401);
  } finally {
    await reviewer.close();
  }
});
test('starting check resumes without answer leaks and saves a provisional starting level', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await action(page.request, {
    action: 'register',
    username: `place_${info.project.name}_${Date.now().toString(36)}`.slice(0, 24),
    password,
    role: 'student',
    ageBand: 'under13',
  });
  try {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: 'Find my starting level', exact: true }),
    ).toBeEnabled();
    await capture(page, info.project.name, 'placement-intro');
    await page.getByRole('button', { name: 'Find my starting level', exact: true }).click();
    for (let count = 0; count < PLACEMENT_RULE.maxStories; count++) {
      const snapshot = await (await page.request.get('/api/app')).json();
      const session = snapshot.learner.session;
      const content = PLACEMENT_CONTENT.find((c) => c.story.title === session.title)!;
      await expect(page.getByRole('heading', { name: session.title, exact: true })).toBeVisible();
      if (count === 0) {
        await page.reload();
        await expect(page.getByRole('heading', { name: session.title, exact: true })).toBeVisible();
      }
      await page.getByRole('button', { name: 'Continue to questions' }).click();
      for (let index = 0; index < content.story.questions.length; index++) {
        const question = content.story.questions[index]!;
        await expect(
          page.getByRole('heading', { name: question.question, exact: true }),
        ).toBeVisible();
        const hidden = await (await page.request.get('/api/app')).json();
        expect(hidden.learner.session.text).toBeNull();
        expect(hidden.learner.session.feedback).toBeNull();
        expect(JSON.stringify(hidden)).not.toContain('answerIndexes');
        if (question.type === 'choose_all')
          for (const answer of question.answerIndexes)
            await page
              .getByRole('checkbox', { name: question.options[answer]!, exact: true })
              .check();
        else
          await page
            .getByRole('radio', {
              name: question.options[question.answerIndexes[0]!]!,
              exact: true,
            })
            .check();
        if (count === 0 && index === 0)
          await capture(page, info.project.name, 'placement-question');
        await page.getByRole('button', { name: 'Check my answer' }).click();
      }
      const after = await (await page.request.get('/api/app')).json();
      if (after.learner.learning.placement.result) {
        await expect(
          page.getByRole('heading', { name: 'Your starting estimate is ready.' }),
        ).toBeVisible();
        await capture(page, info.project.name, 'placement-result');
        break;
      }
      await expect(
        page.getByRole('heading', { name: 'That passage is finished. Take a breath.' }),
      ).toBeVisible();
      if (count === 0) await capture(page, info.project.name, 'placement-between');
      await page.getByRole('button', { name: 'Read the next passage' }).click();
    }
    const final = await (await page.request.get('/api/app')).json();
    expect(final.learner.placement).toBe('complete');
    expect(final.learner.progress.completed).toBe(0);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Your starting estimate is ready.' }),
    ).toBeVisible();
  } finally {
    await action(page.request, { action: 'delete', password });
  }
});
test('guided lessons, fresh checks, saved progress and Filipino high contrast settings work', async ({
  page,
}, info) => {
  await action(page.request, {
    action: 'register',
    username: `learn_${info.project.name}_${Date.now().toString(36)}`.slice(0, 24),
    password,
    role: 'student',
    ageBand: '13plus',
  });
  await action(page.request, { action: 'skip_placement' });
  try {
    await page.goto('/#learn');
    await expect(page.getByRole('heading', { name: 'Reading skills', exact: true })).toBeVisible();
    await capture(page, info.project.name, 'learn-list');
    await page
      .locator('.lesson-row')
      .filter({ has: page.getByRole('heading', { name: 'Find the exact detail', exact: true }) })
      .getByRole('button', { name: 'Open lesson' })
      .click();
    await expect(page.getByRole('heading', { name: 'What you will practise' })).toBeVisible();
    await capture(page, info.project.name, 'lesson-explain');
    await page.getByRole('button', { name: 'Try it', exact: true }).click();
    const lesson = LESSON_CONTENT.find((l) => l.id === 'key_detail-early')!;
    for (let index = 0; index < lesson.items.length; index++) {
      await expect(
        page.getByRole('heading', { name: lesson.items[index]!.question.question, exact: true }),
      ).toBeVisible();
      if (index === 0) {
        await page.getByRole('button', { name: 'Show a hint' }).click();
        await capture(page, info.project.name, 'lesson-practice');
      }
      if (index === 2) {
        await expect(page.getByRole('button', { name: 'Show a hint' })).toHaveCount(0);
        await capture(page, info.project.name, 'lesson-check');
      }
      const q = lesson.items[index]!.question;
      await page.getByRole('radio', { name: q.options[q.answerIndexes[0]!]!, exact: true }).check();
      await page.getByRole('button', { name: 'Check my answer' }).click();
      await expect(page.getByRole('heading', { name: 'You found the clue.' })).toBeVisible();
      await page.getByRole('button', { name: 'Next question' }).click();
    }
    await expect(page.getByRole('heading', { name: 'Practice finished' })).toBeVisible();
    await capture(page, info.project.name, 'lesson-done');
    const state = await (await page.request.get('/api/app')).json();
    expect(state.learner.level).toBe(PLACEMENT_RULE.defaultStart);
    expect(state.learner.progress.completed).toBe(0);
    expect(
      state.learner.learning.lessons.find((l: { id: string }) => l.id === lesson.id).learned,
    ).toBe(false);
    await page.goto('/#help');
    await page.getByLabel('Higher contrast', { exact: true }).check();
    await page.getByLabel('Instruction language').selectOption('fil');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.locator('.app')).toHaveClass(/high-contrast/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fil');
    await capture(page, info.project.name, 'settings-filipino-contrast');
    await page.reload();
    await expect(page.locator('.app')).toHaveClass(/high-contrast/);
  } finally {
    await action(page.request, { action: 'delete', password });
  }
});
test('guardian requests stay private until verified and withdrawal closes microphone access', async ({
  browser,
  page,
}, info) => {
  const parent = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
  const parentPage = await parent.newPage();
  await action(page.request, {
    action: 'register',
    username: `young_${info.project.name}_${Date.now().toString(36)}`.slice(0, 24),
    password,
    role: 'student',
    ageBand: 'under13',
  });
  const child = await (await page.request.get('/api/app')).json();
  await action(parent.request, {
    action: 'register',
    username: `adult_${info.project.name}_${Date.now().toString(36)}`.slice(0, 24),
    password,
    role: 'parent',
    ageBand: 'adult',
  });
  try {
    const code = await action(page.request, { action: 'link_code' });
    await action(parent.request, { action: 'redeem', code: code.code });
    await parentPage.goto(origin);
    await parentPage
      .getByLabel(
        'I am this learner’s guardian and request microphone permission after verification.',
      )
      .check();
    await parentPage.getByLabel('Password', { exact: true }).fill(password);
    await parentPage.getByRole('button', { name: 'Request guardian verification' }).click();
    await expect(parentPage.getByText('Pending review', { exact: true })).toBeVisible();
    await capture(parentPage, info.project.name, 'guardian-pending');
    const denied = await page.request.post('/api/app', {
      headers: { Origin: origin },
      data: { action: 'microphone_consent', consent: true },
    });
    expect(denied.status()).toBe(403);
    const before = await (await parent.request.get('/api/app')).json();
    expect(before.children[0].progress).toBeNull();
    expect(before.children[0].analysis).toBeNull();
    await page.goto('/review');
    await page.getByLabel('Staff username').fill('test_staff_admin');
    await page.getByLabel('Password', { exact: true }).fill('staff-browser-password-42');
    await capture(page, info.project.name, 'staff-signin');
    await page.getByRole('button', { name: 'Staff sign in', exact: true }).first().click();
    await expect(page.getByText('Signed in as test_staff_admin.')).toBeVisible();
    await capture(page, info.project.name, 'review-guardian-queue');
    await page
      .getByLabel(
        'I verified this guardian’s identity, relationship to this learner, and informed consent outside the app. I did not store identity documents in Basa.',
      )
      .check();
    await page
      .locator('.review-request')
      .getByRole('button', { name: 'Approve this version' })
      .click();
    await expect(page.getByText('Review saved', { exact: true })).toBeVisible();
    await capture(page, info.project.name, 'review-tools');
    await expect(page.getByText('No pending guardian requests.')).toBeVisible();
    await page.getByLabel('Find learning materials').fill('Find the exact detail');
    await page
      .locator('.lesson-row')
      .filter({ has: page.getByRole('heading', { name: 'Find the exact detail', exact: true }) })
      .first()
      .getByRole('button', { name: 'Inspect material' })
      .click();
    await expect(page.locator('#review-material-heading')).toBeFocused();
    await capture(page, info.project.name, 'review-material');
    const allowed = await action(page.request, { action: 'microphone_consent', consent: true });
    expect(allowed.learner.microphoneConsent).toBe(true);
    await parentPage.reload();
    await parentPage.getByRole('button', { name: 'Withdraw guardian permission' }).click();
    const after = await (await page.request.get('/api/app')).json();
    expect(after.learner.microphoneConsent).toBe(false);
    expect(after.learner.learning.guardian.approved).toBe(false);
    const privateState = await (await parent.request.get('/api/app')).json();
    expect(privateState.children[0].progress).toBeNull();
    expect(privateState.children[0].analysis).toBeNull();
    expect(child.account.id).toBeTruthy();
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy and microphone use' })).toBeVisible();
    await capture(page, info.project.name, 'privacy');
  } finally {
    await action(parent.request, { action: 'delete', password });
    await action(page.request, { action: 'delete', password });
    await parent.close();
  }
});

test('question read-aloud waits for server accommodation recording and survives the busy state', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
      configurable: true,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () => [{ lang: 'en-US', name: 'Browser test voice' }],
        addEventListener: () => {},
        removeEventListener: () => {},
        cancel: () => {},
        speak: (utterance: SpeechSynthesisUtterance) => {
          document.documentElement.dataset.spoken = utterance.text;
        },
      },
      configurable: true,
    });
  });
  await action(page.request, {
    action: 'register',
    username: `audio_${info.project.name}_${Date.now().toString(36)}`.slice(0, 24),
    password,
    role: 'student',
    ageBand: '13plus',
  });
  try {
    await action(page.request, { action: 'skip_placement' });
    const snapshot = await (await page.request.get('/api/app')).json();
    await action(page.request, {
      action: 'settings',
      settings: { ...snapshot.learner.settings, questionReadAloud: true },
    });
    await action(page.request, { action: 'start', source: 'walkthrough' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue my story' }).click();
    await page.getByRole('button', { name: 'Continue to questions' }).click();
    await page.getByRole('button', { name: 'Listen', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-spoken',
      /Where did the child put the bowl/,
    );
    await page.getByRole('radio', { name: 'Under a tree', exact: true }).check();
    await page.getByRole('button', { name: 'Check my answer' }).click();
    await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible();
    const current = (await (await page.request.get('/api/app')).json()).learner.session;
    const story = PLACEMENT_CONTENT.find((c) => c.story.title === current.title)!.story;
    await action(page.request, { action: 'next', id: current.id, index: 0 });
    for (let index = 1; index < story.questions.length; index++) {
      await action(page.request, {
        action: 'answer',
        id: current.id,
        index,
        chosen: story.questions[index]!.answerIndexes,
      });
      await action(page.request, { action: 'next', id: current.id, index });
    }
    const exported = await action(page.request, { action: 'export' });
    expect(JSON.stringify(exported)).toContain('question_read_aloud');
  } finally {
    await action(page.request, { action: 'delete', password });
  }
});
