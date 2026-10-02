import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { Lesson, Locale, MaterialPack } from '../shared/content.ts';
import { gradeAnswer, nextReview, type Attempt, type Dashboard, type Profile, type Session, type SessionMode } from '../shared/learning.ts';

export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Row = Record<string, unknown>;
type AnswerInput = { attemptId: string; exerciseId: string; answer: string; hinted: boolean; assisted: boolean };

export class LearningStore {
  constructor(public db: DatabaseSync, public pack: MaterialPack, private now = () => new Date()) {
    db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, presentation TEXT NOT NULL, explanation_language TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id), lesson_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL, answer TEXT NOT NULL, outcome TEXT NOT NULL, assisted INTEGER NOT NULL,
        mode TEXT NOT NULL, feedback TEXT NOT NULL, request_signature TEXT NOT NULL,
        pack_id TEXT NOT NULL, pack_revision INTEGER NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        profile_id TEXT NOT NULL REFERENCES profiles(id), lesson_id TEXT NOT NULL, stage TEXT NOT NULL,
        exercise_index INTEGER NOT NULL, exercise_ids TEXT NOT NULL, last_attempt_id TEXT REFERENCES attempts(id),
        pack_revision INTEGER NOT NULL, PRIMARY KEY (profile_id, lesson_id)
      );
      CREATE TABLE IF NOT EXISTS review_sessions (
        profile_id TEXT NOT NULL REFERENCES profiles(id), lesson_id TEXT NOT NULL, stage TEXT NOT NULL,
        exercise_index INTEGER NOT NULL, exercise_ids TEXT NOT NULL, last_attempt_id TEXT REFERENCES attempts(id),
        pack_revision INTEGER NOT NULL, PRIMARY KEY (profile_id, lesson_id)
      );
      CREATE TABLE IF NOT EXISTS reviews (
        profile_id TEXT NOT NULL REFERENCES profiles(id), lesson_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
        interval_days INTEGER NOT NULL, due_at TEXT NOT NULL, PRIMARY KEY (profile_id, exercise_id)
      );
      CREATE INDEX IF NOT EXISTS reviews_due ON reviews(profile_id, due_at);
    `);
    const insert = db.prepare('INSERT OR IGNORE INTO profiles VALUES (?, ?, ?, ?)');
    insert.run('adult', 'You', 'adult', 'en');
    insert.run('child', '小朋友', 'child', 'zh');
  }

  profiles(): Profile[] {
    return (this.db.prepare('SELECT * FROM profiles ORDER BY rowid').all() as Row[]).map(row => this.profileFromRow(row));
  }
  private profileFromRow(row: Row): Profile {
    return { id: String(row.id), name: String(row.name), presentation: row.presentation as Profile['presentation'], explanationLanguage: row.explanation_language as Locale };
  }
  profile(id: string): Profile {
    const row = this.db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as Row | undefined;
    if (!row) throw new AppError(404, 'Learner not found.');
    return this.profileFromRow(row);
  }
  createProfile(name: string, presentation: Profile['presentation'], locale: Locale): Profile {
    const id = randomUUID();
    this.db.prepare('INSERT INTO profiles VALUES (?, ?, ?, ?)').run(id, name.trim(), presentation, locale);
    return this.profile(id);
  }
  preferences(id: string, locale: Locale): Profile {
    this.profile(id);
    this.db.prepare('UPDATE profiles SET explanation_language = ? WHERE id = ?').run(locale, id);
    return this.profile(id);
  }
  lesson(profileId: string, lessonId: string): Lesson {
    const profile = this.profile(profileId);
    const lesson = this.pack.lessons.find(value => value.id === lessonId && value.audience === profile.presentation);
    if (!lesson) throw new AppError(404, 'Lesson not available for this learner.');
    return lesson;
  }
  private attempt(row: Row): Attempt {
    return { id: String(row.id), exerciseId: String(row.exercise_id), assisted: Boolean(row.assisted), mode: row.mode as Attempt['mode'], ...JSON.parse(String(row.feedback)) };
  }
  private sessionTable(mode: SessionMode) {
    return mode === 'review' ? 'review_sessions' : 'sessions';
  }
  private sessionRow(profileId: string, lessonId: string, mode: SessionMode): Row | undefined {
    return this.db.prepare(`SELECT * FROM ${this.sessionTable(mode)} WHERE profile_id = ? AND lesson_id = ?`).get(profileId, lessonId) as Row | undefined;
  }
  private sessionFromRow(row: Row, mode: SessionMode = 'lesson'): Session {
    const previous = row.last_attempt_id ? this.db.prepare('SELECT * FROM attempts WHERE id = ?').get(String(row.last_attempt_id)) as Row : undefined;
    return { lessonId: String(row.lesson_id), mode, stage: row.stage as Session['stage'], exerciseIndex: Number(row.exercise_index), exerciseIds: JSON.parse(String(row.exercise_ids)), lastAttempt: previous ? this.attempt(previous) : null };
  }
  session(profileId: string, lessonId: string, mode: SessionMode = 'lesson'): Session {
    const lesson = this.lesson(profileId, lessonId);
    const row = this.sessionRow(profileId, lessonId, mode);
    if (row && Number(row.pack_revision) !== this.pack.revision) {
      throw new AppError(409, 'This lesson has changed. Choose “Start again” to use the new version. Your earlier attempts are retained.');
    }
    if (!row && mode === 'review') throw new AppError(409, 'Start a review before resuming it.');
    return row ? this.sessionFromRow(row, mode) : { lessonId, mode, stage: 'intro', exerciseIndex: 0, exerciseIds: lesson.exercises.map(exercise => exercise.id), lastAttempt: null };
  }
  private writeSession(profileId: string, session: Session) {
    this.db.prepare(`INSERT INTO ${this.sessionTable(session.mode)} VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, lesson_id) DO UPDATE SET stage=excluded.stage, exercise_index=excluded.exercise_index,
      exercise_ids=excluded.exercise_ids, last_attempt_id=excluded.last_attempt_id, pack_revision=excluded.pack_revision`)
      .run(profileId, session.lessonId, session.stage, session.exerciseIndex, JSON.stringify(session.exerciseIds), session.lastAttempt?.id ?? null, this.pack.revision);
  }
  advance(profileId: string, lessonId: string, mode: SessionMode = 'lesson'): Session {
    const session = this.session(profileId, lessonId, mode);
    if (session.stage === 'intro') session.stage = 'practice';
    else if (session.stage === 'feedback') {
      session.exerciseIndex++;
      session.stage = session.exerciseIndex < session.exerciseIds.length ? 'practice' : 'complete';
      session.lastAttempt = null;
    } else throw new AppError(409, 'Answer this activity before continuing.');
    this.writeSession(profileId, session);
    return session;
  }
  restart(profileId: string, lessonId: string, mode: SessionMode): Session {
    const lesson = this.lesson(profileId, lessonId);
    const dueIds = (this.db.prepare('SELECT exercise_id FROM reviews WHERE profile_id = ? AND lesson_id = ? AND due_at <= ?').all(profileId, lessonId, this.now().toISOString()) as Row[]).map(row => String(row.exercise_id));
    const exerciseIds = lesson.exercises.map(exercise => exercise.id).filter(id => mode === 'lesson' || dueIds.includes(id));
    if (!exerciseIds.length) throw new AppError(409, 'No review items are due for this lesson yet.');
    const session: Session = { lessonId, mode, stage: mode === 'lesson' ? 'intro' : 'practice', exerciseIndex: 0, exerciseIds, lastAttempt: null };
    this.writeSession(profileId, session);
    return session;
  }
  answer(profileId: string, lessonId: string, input: AnswerInput, mode: SessionMode = 'lesson'): Session {
    const lesson = this.lesson(profileId, lessonId);
    const signature = JSON.stringify({ profileId, lessonId, ...input, ...(mode === 'review' ? { mode } : {}) });
    const duplicate = this.db.prepare('SELECT * FROM attempts WHERE id = ?').get(input.attemptId) as Row | undefined;
    if (duplicate) {
      if (duplicate.request_signature !== signature) throw new AppError(409, 'This attempt ID was already used for a different answer.');
      return this.session(profileId, lessonId, mode);
    }
    const session = this.session(profileId, lessonId, mode);
    if (session.stage !== 'practice' || session.exerciseIds[session.exerciseIndex] !== input.exerciseId) {
      throw new AppError(409, 'This activity is no longer current. Reload to resume your lesson.');
    }
    const exercise = lesson.exercises.find(value => value.id === input.exerciseId);
    if (!exercise) throw new AppError(404, 'Activity not found.');
    if (exercise.type === 'choice' && !exercise.options.some(option => option.id === input.answer)) {
      throw new AppError(400, 'Choose one of the available pictures.');
    }
    const feedback = gradeAnswer(exercise, input.answer, lesson.language);
    const assisted = this.profile(profileId).presentation === 'child' || input.assisted || input.hinted;
    const attempt: Attempt = { id: input.attemptId, exerciseId: input.exerciseId, mode: exercise.type === 'choice' ? 'recognition' : 'production', assisted, ...feedback };
    const previous = this.db.prepare('SELECT interval_days FROM reviews WHERE profile_id = ? AND exercise_id = ?').get(profileId, exercise.id) as Row | undefined;
    const now = this.now();
    const review = nextReview(feedback.outcome, assisted, Number(previous?.interval_days ?? 0), now);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        attempt.id, profileId, lessonId, exercise.id, input.answer, feedback.outcome, assisted ? 1 : 0,
        attempt.mode, JSON.stringify(feedback), signature, this.pack.id, this.pack.revision, now.toISOString(),
      );
      this.db.prepare(`INSERT INTO reviews VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(profile_id, exercise_id) DO UPDATE SET lesson_id=excluded.lesson_id, interval_days=excluded.interval_days, due_at=excluded.due_at`)
        .run(profileId, lessonId, exercise.id, review.intervalDays, review.dueAt);
      session.stage = 'feedback';
      session.lastAttempt = attempt;
      this.writeSession(profileId, session);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return session;
  }
  dashboard(profileId: string): Dashboard {
    this.profile(profileId);
    const counts = this.db.prepare('SELECT COUNT(*) AS count, COALESCE(SUM(assisted), 0) AS assisted FROM attempts WHERE profile_id = ?').get(profileId) as Row;
    return {
      sessions: (this.db.prepare('SELECT * FROM sessions WHERE profile_id = ?').all(profileId) as Row[]).map(row => this.sessionFromRow(row)),
      due: (this.db.prepare('SELECT lesson_id, COUNT(*) AS count FROM reviews WHERE profile_id = ? AND due_at <= ? GROUP BY lesson_id').all(profileId, this.now().toISOString()) as Row[]).map(row => ({ lessonId: String(row.lesson_id), count: Number(row.count) })),
      attemptCount: Number(counts.count), assistedCount: Number(counts.assisted),
    };
  }
}
