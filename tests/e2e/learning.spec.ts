import { expect, test, type Page } from '@playwright/test';

async function freshLearner(page: Page, presentation: 'adult' | 'child') {
  const response = await page.request.post('/api/profiles', { data: { name: presentation === 'adult' ? 'Test learner' : '小朋友', presentation, explanationLanguage: presentation === 'child' ? 'zh' : 'en' } });
  expect(response.status()).toBe(201);
  const profile = await response.json();
  await page.addInitScript(id => localStorage.setItem('trilinguo.learner', id), profile.id);
  return profile.id as string;
}

test('adult lesson saves feedback, resumes after reload, and completes a reviewed typed answer', async ({ page }) => {
  await freshLearner(page, 'adult');
  await page.goto('/');
  await page.getByRole('button', { name: 'Start lesson', exact: false }).first().click();
  await expect(page.getByRole('heading', { name: 'A little water, please' })).toBeVisible();
  await page.getByRole('button', { name: 'Let’s practise' }).click();
  await page.getByRole('radio', { name: 'Milk' }).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('heading', { name: 'Let’s look at that together.' })).toBeVisible();
  await page.reload();
  // Browser preferences retain the learner; the server retains the exact feedback stage.
  await page.getByRole('button', { name: 'Resume lesson' }).first().click();
  await expect(page.getByRole('heading', { name: 'Let’s look at that together.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: 'Milk' }).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('heading', { name: 'You’ve got it.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('Could I have some tea, please?');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('heading', { name: 'You’ve got it.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: /One small step/ })).toBeVisible();
  await page.locator('.completion').getByRole('button', { name: /Back to Today/ }).click();
  await page.getByRole('button', { name: 'My notebook' }).click();
  await expect(page.getByRole('heading', { name: 'Can I have some water, please?' })).toBeVisible();
});

test('child Japanese is Chinese-guided, tap-only, assisted, and separate from the adult history', async ({ page }) => {
  const profileId = await freshLearner(page, 'child');
  const adultBefore = await (await page.request.get('/api/profiles/adult/dashboard')).json();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '一起学一点 日语。' })).toBeVisible();
  await page.getByRole('button', { name: '开始学习' }).first().click();
  await expect(page.getByText(/适合母语为中文的五岁日语初学者/)).toBeVisible();
  await page.getByRole('button', { name: '一起练习吧' }).click();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.getByRole('radio', { name: '水', exact: true }).check();
  await page.getByRole('button', { name: '看看答案' }).click();
  await expect(page.getByText('已保存为有帮助的练习。')).toBeVisible();
  const dashboard = await (await page.request.get(`/api/profiles/${profileId}/dashboard`)).json();
  expect(dashboard.attemptCount).toBe(1);
  expect(dashboard.assistedCount).toBe(1);
  const adult = await (await page.request.get('/api/profiles/adult/dashboard')).json();
  expect(adult).toEqual(adultBefore);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('explanation switching preserves a Japanese session and composition cannot submit early', async ({ page }) => {
  await freshLearner(page, 'adult');
  await page.goto('/');
  await page.getByRole('button', { name: 'Japanese', exact: true }).click();
  await page.getByRole('button', { name: 'Start lesson' }).first().click();
  await page.getByRole('button', { name: 'Let’s practise' }).click();
  await page.getByRole('button', { name: '中文', exact: true }).click();
  await expect(page.getByRole('heading', { name: /想要的是哪种饮料/ })).toBeVisible();
  await page.getByRole('radio', { name: '水', exact: true }).check();
  await page.getByRole('button', { name: '看看答案' }).click();
  await page.getByRole('button', { name: /继续/ }).click();
  await page.getByRole('radio', { name: '牛奶', exact: true }).check();
  await page.getByRole('button', { name: '看看答案' }).click();
  await page.getByRole('button', { name: /继续/ }).click();
  const input = page.getByRole('textbox', { name: '你的回答' });
  await input.fill('お茶をください。');
  await input.dispatchEvent('compositionstart');
  await expect(page.getByRole('button', { name: '看看答案' })).toBeDisabled();
  await input.dispatchEvent('compositionend');
  await page.getByRole('button', { name: '看看答案' }).click();
  await expect(page.getByRole('heading', { name: '答对啦。' })).toBeVisible();
});

test('a learner can be created in settings and unavailable audio offers a readable fallback', async ({ page }) => {
  await freshLearner(page, 'adult');
  await page.addInitScript(() => {
    Object.defineProperty(window.speechSynthesis, 'getVoices', { value: () => [] });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Learners', exact: true }).click();
  await page.getByRole('textbox', { name: 'Learner name' }).fill('Another caregiver');
  await page.getByRole('button', { name: 'Add learner', exact: false }).click();
  await expect(page.getByText('Good to see you, Another caregiver')).toBeVisible();
  const bootstrap = await (await page.request.get('/api/bootstrap')).json();
  const created = bootstrap.profiles.find((value: { name: string }) => value.name === 'Another caregiver');
  await expect(page.getByRole('combobox', { name: 'Learners' })).toHaveValue(created.id);
  await page.getByRole('button', { name: 'Start lesson' }).first().click();
  await page.getByRole('button', { name: 'Listen / replay' }).click();
  await expect(page.getByText('The needed voice is unavailable. Try another browser, or practise by reading together.')).toBeVisible();
  await page.getByRole('button', { name: 'Let’s practise' }).click();
  await expect(page.getByRole('radio')).toHaveCount(3);
});
