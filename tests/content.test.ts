import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { materialPackSchema, parseMaterialPack } from '../shared/content.ts';
import { gradeAnswer, nextReview } from '../shared/learning.ts';

const raw = JSON.parse(readFileSync(new URL('../content/polite-requests.json', import.meta.url), 'utf8'));
const pack = parseMaterialPack(raw);

test('sample pack has adult English/Japanese and a Chinese-guided, tap-only child Japanese variant', () => {
  assert.equal(pack.lessons.length, 3);
  const child = pack.lessons.find(lesson => lesson.audience === 'child')!;
  assert.equal(child.language, 'ja');
  assert.ok(child.caregiverGuidance?.zh.includes('五岁'));
  assert.ok(child.exercises.every(exercise => exercise.type === 'choice'));
  for (const lesson of pack.lessons) {
    assert.ok(lesson.pattern.meaning.zh && lesson.pattern.meaning.en);
    assert.equal(lesson.audio.reviewStatus, 'unreviewed');
  }
});
test('exported schema matches the application contract', () => {
  const exported = JSON.parse(readFileSync(new URL('../content/material-pack.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(exported, z.toJSONSchema(materialPackSchema));
});
test('semantic validation rejects dangling answer references and duplicate stable IDs', () => {
  const invalid = structuredClone(raw);
  invalid.lessons[0].exercises[0].acceptedOptionId = 'coffee';
  assert.throws(() => parseMaterialPack(invalid), /Missing accepted option/);
  const duplicate = structuredClone(raw);
  duplicate.lessons[1].exercises[0].id = duplicate.lessons[0].exercises[0].id;
  assert.throws(() => parseMaterialPack(duplicate), /Duplicate exercise ID/);
});
test('child schema rejects typed work or missing caregiver guidance', () => {
  const invalid = structuredClone(raw);
  invalid.lessons[2].exercises.push({ ...invalid.lessons[0].exercises[2], id: 'child-text' });
  assert.throws(() => parseMaterialPack(invalid), /tap-only/);
  delete invalid.lessons[2].caregiverGuidance;
  assert.throws(() => parseMaterialPack(invalid), /caregiver guidance/);
});
test('reviewed typed alternatives accept normalized punctuation and case', () => {
  const exercise = pack.lessons[0].exercises[2];
  assert.equal(gradeAnswer(exercise, '  COULD I have some tea please!  ', 'en').outcome, 'correct');
  assert.equal(gradeAnswer(pack.lessons[1].exercises[2], 'お茶を下さい', 'ja').outcome, 'correct');
});
test('known errors receive a correction; unknown text is not judged grammatically wrong', () => {
  const exercise = pack.lessons[0].exercises[2];
  assert.equal(gradeAnswer(exercise, 'Can I has some tea please', 'en').outcome, 'needs-practice');
  const feedback = gradeAnswer(exercise, 'Would you bring me tea?', 'en');
  assert.equal(feedback.outcome, 'unrecognized');
  assert.match(feedback.explanation.en, /not been judged grammatically wrong/);
});
test('review intervals distinguish errors, assisted answers, and independent recall', () => {
  const now = new Date('2026-10-02T00:00:00Z');
  assert.equal(nextReview('needs-practice', false, 4, now).dueAt, '2026-10-02T00:10:00.000Z');
  assert.equal(nextReview('correct', true, 4, now).intervalDays, 1);
  assert.equal(nextReview('correct', false, 4, now).intervalDays, 8);
  assert.equal(nextReview('correct', false, 25, now).intervalDays, 30);
});
