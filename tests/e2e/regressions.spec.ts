import { expect, test, type Page } from '@playwright/test';
import type { MaterialPack } from '../../shared/content.ts';
import type { Session } from '../../shared/learning.ts';

declare global {
  interface Window {
    speechTest: { spoken: string[]; cancelCount: number; listenerCount: number; loadVoices: () => void };
  }
}

async function adultLearner(page: Page) {
  const response = await page.request.post('/api/profiles', { data: { name: 'Regression learner', presentation: 'adult', explanationLanguage: 'en' } });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  await page.addInitScript(value => localStorage.setItem('trilinguo.learner', value), id);
  return id as string;
}

async function mockSpeech(page: Page, ready: boolean) {
  await page.addInitScript(voicesReady => {
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const available = [{ localService: true, lang: 'en-US' }, { localService: true, lang: 'ja-JP' }] as SpeechSynthesisVoice[];
    let voices = voicesReady ? available : [];
    window.speechTest = {
      spoken: [], cancelCount: 0, listenerCount: 0,
      loadVoices: () => {
        voices = available;
        for (const listener of [...listeners]) {
          const event = new Event('voiceschanged');
          if (typeof listener === 'function') listener(event);
          else listener.handleEvent(event);
        }
      },
    };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(public text: string) {} } });
    Object.defineProperty(window, 'speechSynthesis', { value: {
      getVoices: () => voices,
      addEventListener: (_name: string, listener: EventListenerOrEventListenerObject) => { listeners.add(listener); window.speechTest.listenerCount = listeners.size; },
      removeEventListener: (_name: string, listener: EventListenerOrEventListenerObject) => { listeners.delete(listener); window.speechTest.listenerCount = listeners.size; },
      cancel: () => { window.speechTest.cancelCount++; },
      speak: (utterance: SpeechSynthesisUtterance) => { window.speechTest.spoken.push(utterance.text); },
    } });
  }, ready);
}

test('loading voices after leaving a screen never starts abandoned audio', async ({ page }) => {
  await adultLearner(page);
  await mockSpeech(page, false);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start lesson' }).first().click();
  await expect(page.getByRole('heading', { name: 'A little water, please' })).toBeVisible();
  await page.clock.install();
  await page.getByRole('button', { name: 'Listen / replay' }).click();
  expect(await page.evaluate(() => window.speechTest.listenerCount)).toBe(1);
  await page.getByRole('button', { name: 'Back to Today', exact: false }).click();
  await page.evaluate(() => window.speechTest.loadVoices());
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => window.speechTest.spoken)).toEqual([]);
  expect(await page.evaluate(() => window.speechTest.listenerCount)).toBe(0);
});

test('leaving a playing screen cancels its audio and clears the old timeout', async ({ page }) => {
  await adultLearner(page);
  await mockSpeech(page, true);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start lesson' }).first().click();
  await expect(page.getByRole('heading', { name: 'A little water, please' })).toBeVisible();
  await page.clock.install();
  await page.getByRole('button', { name: 'Listen / replay' }).click();
  expect(await page.evaluate(() => window.speechTest.spoken)).toHaveLength(1);
  const before = await page.evaluate(() => window.speechTest.cancelCount);
  await page.getByRole('button', { name: 'Back to Today', exact: false }).click();
  const after = await page.evaluate(() => window.speechTest.cancelCount);
  expect(after).toBeGreaterThan(before);
  await page.clock.runFor(16_000);
  expect(await page.evaluate(() => window.speechTest.cancelCount)).toBe(after);
});

test('another audio preview takes over without an older timeout stopping it', async ({ page }) => {
  const id = await adultLearner(page);
  const { pack }: { pack: MaterialPack } = await (await page.request.get('/api/bootstrap')).json();
  for (const lesson of pack.lessons.filter(value => value.audience === 'adult')) {
    expect((await page.request.post(`/api/profiles/${id}/lessons/${lesson.id}/advance`, { data: {} })).status()).toBe(200);
  }
  await mockSpeech(page, true);
  await page.goto('/');
  await page.getByRole('button', { name: 'My notebook' }).click();
  const buttons = page.locator('.notebook-entry .audio-button');
  await expect(buttons).toHaveCount(2);
  await page.clock.install();
  await buttons.nth(0).click();
  await page.clock.runFor(1000);
  await buttons.nth(1).click();
  await expect(buttons.nth(0)).toBeEnabled();
  await expect(buttons.nth(1)).toBeDisabled();
  const cancellations = await page.evaluate(() => window.speechTest.cancelCount);
  await page.clock.runFor(14_500);
  expect(await page.evaluate(() => window.speechTest.cancelCount)).toBe(cancellations);
  expect(await page.evaluate(() => window.speechTest.spoken)).toHaveLength(2);
  await expect(buttons.nth(1)).toBeDisabled();
});

test('review controls select review mode and Resume returns to the unfinished lesson', async ({ page }) => {
  const { pack }: { pack: MaterialPack } = await (await page.request.get('/api/bootstrap')).json();
  const lesson = pack.lessons[0];
  const profile = { id: 'review-mode-fixture', name: 'Review fixture', presentation: 'adult', explanationLanguage: 'en' };
  const lessonProgress: Session = { lessonId: lesson.id, mode: 'lesson', stage: 'practice', exerciseIndex: 1, exerciseIds: lesson.exercises.map(value => value.id), lastAttempt: null };
  let review: Session = { lessonId: lesson.id, mode: 'review', stage: 'practice', exerciseIndex: 0, exerciseIds: [lesson.exercises[0].id], lastAttempt: null };
  let due = true;
  const requestedModes: string[] = [];
  const submittedModes: string[] = [];
  await page.addInitScript(id => localStorage.setItem('trilinguo.learner', id), profile.id);
  await page.route('**/api/bootstrap', route => route.fulfill({ json: { profiles: [profile], pack } }));
  await page.route(`**/api/profiles/${profile.id}/dashboard`, route => route.fulfill({ json: { sessions: [lessonProgress], due: due ? [{ lessonId: lesson.id, count: 1 }] : [], attemptCount: 1, assistedCount: 0 } }));
  await page.route(`**/api/profiles/${profile.id}/lessons/${lesson.id}**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'GET') {
      const mode = url.searchParams.get('mode') ?? 'lesson';
      requestedModes.push(mode);
      await route.fulfill({ json: mode === 'review' ? review : lessonProgress });
      return;
    }
    const body = request.postDataJSON();
    expect(body.mode).toBe('review');
    if (url.pathname.endsWith('/answers')) {
      submittedModes.push(body.mode);
      due = false;
      review = { ...review, stage: 'feedback', lastAttempt: { id: body.attemptId, exerciseId: lesson.exercises[0].id, assisted: false, mode: 'recognition', outcome: 'correct', example: lesson.exercises[0].phrase, explanation: lesson.exercises[0].explanation } };
    } else if (url.pathname.endsWith('/advance')) {
      submittedModes.push(body.mode);
      review = { ...review, stage: 'complete', exerciseIndex: 1, lastAttempt: null };
    }
    await route.fulfill({ json: review });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Review now', exact: false }).click();
  await expect(page.locator('.listen-prompt > p')).toHaveText('Can I have some water, please?');
  await page.getByRole('radio', { name: 'Water', exact: true }).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('heading', { name: 'You’ve got it.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: /One small step/ })).toBeVisible();
  await page.locator('.completion').getByRole('button', { name: 'Back to Today', exact: false }).click();
  await page.getByRole('button', { name: 'Resume lesson' }).first().click();
  await expect(page.locator('.listen-prompt > p')).toHaveText('Can I have some milk, please?');
  expect(requestedModes).toContain('review');
  expect(requestedModes.at(-1)).toBe('lesson');
  expect(submittedModes).toEqual(['review', 'review']);
});
