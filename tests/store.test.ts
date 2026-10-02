import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { parseMaterialPack } from '../shared/content.ts';
import { LearningStore } from '../server/store.ts';

const pack = parseMaterialPack(JSON.parse(readFileSync(new URL('../content/polite-requests.json', import.meta.url), 'utf8')));
const adultLesson = pack.lessons[0];
const childLesson = pack.lessons[2];
const answer = (exerciseId: string, value: string) => ({ attemptId: randomUUID(), exerciseId, answer: value, hinted: false, assisted: false });

test('feedback and attempt history survive closing/reopening SQLite; learner data is separate', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'trilinguo-store-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'progress.sqlite');
  let db = new DatabaseSync(filename);
  let store = new LearningStore(db, pack);
  store.advance('adult', adultLesson.id);
  const saved = store.answer('adult', adultLesson.id, answer(adultLesson.exercises[0].id, 'water'));
  db.close();
  db = new DatabaseSync(filename);
  t.after(() => db.close());
  store = new LearningStore(db, pack);
  assert.deepEqual(store.session('adult', adultLesson.id), saved);
  assert.equal(store.dashboard('adult').attemptCount, 1);
  assert.equal(store.dashboard('child').attemptCount, 0);
  store.preferences('adult', 'zh');
  assert.deepEqual(store.session('adult', adultLesson.id), saved);
});
test('duplicate attempts are idempotent; reusing an ID with changed data is rejected', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  const store = new LearningStore(db, pack);
  store.advance('adult', adultLesson.id);
  const input = answer(adultLesson.exercises[0].id, 'water');
  assert.deepEqual(store.answer('adult', adultLesson.id, input), store.answer('adult', adultLesson.id, input));
  assert.equal(store.dashboard('adult').attemptCount, 1);
  assert.throws(() => store.answer('adult', adultLesson.id, { ...input, answer: 'milk' }), /different answer/);
});
test('child practice is always assisted and cannot open the adult typed lesson', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  const store = new LearningStore(db, pack);
  assert.throws(() => store.session('child', adultLesson.id), /not available/);
  store.advance('child', childLesson.id);
  const session = store.answer('child', childLesson.id, answer(childLesson.exercises[0].id, 'water'));
  assert.equal(session.lastAttempt?.assisted, true);
  assert.equal(session.lastAttempt?.mode, 'recognition');
  assert.equal(store.dashboard('child').assistedCount, 1);
});
test('due review revisits only due mistakes, preserving the original attempt history', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  let time = new Date('2026-10-02T00:00:00Z');
  const store = new LearningStore(db, pack, () => time);
  store.advance('adult', adultLesson.id);
  store.answer('adult', adultLesson.id, answer(adultLesson.exercises[0].id, 'milk'));
  assert.deepEqual(store.dashboard('adult').due, []);
  assert.throws(() => store.restart('adult', adultLesson.id, 'review'), /No review items/);
  time = new Date('2026-10-02T00:11:00Z');
  assert.deepEqual(store.dashboard('adult').due, [{ lessonId: adultLesson.id, count: 1 }]);
  const session = store.restart('adult', adultLesson.id, 'review');
  assert.deepEqual(session.exerciseIds, [adultLesson.exercises[0].id]);
  store.answer('adult', adultLesson.id, answer(adultLesson.exercises[0].id, 'water'), 'review');
  assert.equal(store.advance('adult', adultLesson.id, 'review').stage, 'complete');
  assert.equal(store.dashboard('adult').attemptCount, 2);
  assert.deepEqual(store.dashboard('adult').due, []);
});
test('stale submissions and skipping unanswered activities cannot advance progress', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  const store = new LearningStore(db, pack);
  store.advance('adult', adultLesson.id);
  assert.throws(() => store.advance('adult', adultLesson.id), /Answer this activity/);
  assert.throws(() => store.answer('adult', adultLesson.id, answer(adultLesson.exercises[1].id, 'milk')), /no longer current/);
  assert.throws(() => store.answer('adult', adultLesson.id, answer(adultLesson.exercises[0].id, 'coffee')), /available pictures/);
  assert.equal(store.dashboard('adult').attemptCount, 0);
});
test('a content revision requires an explicit restart and preserves versioned history', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  const old = new LearningStore(db, pack);
  old.advance('adult', adultLesson.id);
  old.answer('adult', adultLesson.id, answer(adultLesson.exercises[0].id, 'water'));
  const updated = new LearningStore(db, { ...pack, revision: 2 });
  assert.throws(() => updated.session('adult', adultLesson.id), /lesson has changed/);
  assert.equal(updated.restart('adult', adultLesson.id, 'lesson').stage, 'intro');
  assert.equal(updated.dashboard('adult').attemptCount, 1);
  assert.equal(db.prepare('SELECT pack_revision FROM attempts').get()?.pack_revision, 1);
});


test('review feedback survives reopening without replacing an unfinished lesson', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'trilinguo-review-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'progress.sqlite');
  let time = new Date('2026-10-03T00:00:00Z');
  let db = new DatabaseSync(filename);
  let store = new LearningStore(db, pack, () => time);
  store.advance('adult', adultLesson.id);
  store.answer('adult', adultLesson.id, answer(adultLesson.exercises[0].id, 'milk'));
  const lessonProgress = store.advance('adult', adultLesson.id);
  // Existing databases had only the regular sessions table.
  db.exec('DROP TABLE review_sessions');
  store = new LearningStore(db, pack, () => time);
  assert.deepEqual(store.session('adult', adultLesson.id), lessonProgress);
  time = new Date('2026-10-03T00:11:00Z');
  assert.equal(store.restart('adult', adultLesson.id, 'review').mode, 'review');
  const input = answer(adultLesson.exercises[0].id, 'water');
  const feedback = store.answer('adult', adultLesson.id, input, 'review');
  assert.deepEqual(store.answer('adult', adultLesson.id, input, 'review'), feedback);
  assert.throws(() => store.answer('adult', adultLesson.id, input), /different answer/);
  db.close();
  db = new DatabaseSync(filename);
  t.after(() => db.close());
  store = new LearningStore(db, pack, () => time);
  assert.deepEqual(store.session('adult', adultLesson.id, 'review'), feedback);
  assert.deepEqual(store.session('adult', adultLesson.id), lessonProgress);
  assert.deepEqual(store.dashboard('adult').sessions, [lessonProgress]);
  assert.equal(store.advance('adult', adultLesson.id, 'review').stage, 'complete');
  assert.deepEqual(store.session('adult', adultLesson.id), lessonProgress);
  assert.equal(store.dashboard('adult').attemptCount, 2);
  store.answer('adult', adultLesson.id, answer(adultLesson.exercises[1].id, 'milk'));
  const continued = store.advance('adult', adultLesson.id);
  assert.equal(continued.mode, 'lesson');
  assert.equal(continued.stage, 'practice');
  assert.equal(continued.exerciseIndex, 2);
});

test('a due review does not change completion of the regular lesson', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  let time = new Date('2026-10-03T00:00:00Z');
  const store = new LearningStore(db, pack, () => time);
  store.advance('adult', adultLesson.id);
  for (const exercise of adultLesson.exercises) {
    const value = exercise.type === 'choice' ? exercise.acceptedOptionId : exercise.acceptedAnswers[0];
    store.answer('adult', adultLesson.id, answer(exercise.id, value));
    store.advance('adult', adultLesson.id);
  }
  const completed = store.session('adult', adultLesson.id);
  assert.equal(completed.stage, 'complete');
  time = new Date('2026-10-05T00:01:00Z');
  store.restart('adult', adultLesson.id, 'review');
  assert.deepEqual(store.dashboard('adult').sessions, [completed]);
  for (const exercise of adultLesson.exercises) {
    const value = exercise.type === 'choice' ? exercise.acceptedOptionId : exercise.acceptedAnswers[0];
    store.answer('adult', adultLesson.id, answer(exercise.id, value), 'review');
    store.advance('adult', adultLesson.id, 'review');
  }
  assert.equal(store.session('adult', adultLesson.id, 'review').stage, 'complete');
  assert.deepEqual(store.session('adult', adultLesson.id), completed);
});
