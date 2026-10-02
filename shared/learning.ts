import type { Exercise, Language, Locale } from './content.ts';

export type Outcome = 'correct' | 'needs-practice' | 'unrecognized';
export type Feedback = { outcome: Outcome; example: string; explanation: Record<Locale, string> };
export type Profile = { id: string; name: string; presentation: 'adult' | 'child'; explanationLanguage: Locale };
export type Attempt = Feedback & { id: string; assisted: boolean; mode: 'recognition' | 'production'; exerciseId: string };
export type SessionMode = 'lesson' | 'review';
export type Session = { lessonId: string; mode: SessionMode; stage: 'intro' | 'practice' | 'feedback' | 'complete'; exerciseIndex: number; exerciseIds: string[]; lastAttempt: Attempt | null };
export type Dashboard = { sessions: Session[]; due: { lessonId: string; count: number }[]; attemptCount: number; assistedCount: number };

export function normalizeAnswer(answer: string, language: Language): string {
  return answer.normalize('NFKC').toLocaleLowerCase(language).replace(/[.,!?。！？、]/gu, '').replace(/\s+/gu, ' ').trim();
}

export function gradeAnswer(exercise: Exercise, answer: string, language: Language): Feedback {
  if (exercise.type === 'choice') {
    return {
      outcome: answer === exercise.acceptedOptionId ? 'correct' : 'needs-practice',
      example: exercise.phrase,
      explanation: exercise.explanation,
    };
  }
  const normalized = normalizeAnswer(answer, language);
  const accepted = exercise.acceptedAnswers.some(value => normalizeAnswer(value, language) === normalized);
  const known = exercise.knownErrors.find(error => normalizeAnswer(error.answer, language) === normalized);
  return {
    outcome: accepted ? 'correct' : known ? 'needs-practice' : 'unrecognized',
    example: exercise.acceptedAnswers[0],
    explanation: accepted ? exercise.explanation : known?.feedback ?? {
      en: 'This answer is outside our reviewed examples. Compare it with the example; it has not been judged grammatically wrong.',
      zh: '这个回答不在已审核的答案中。请与例句比较；我们没有判定它语法错误。',
    },
  };
}

export function nextReview(outcome: Outcome, assisted: boolean, previousDays: number, now: Date) {
  const intervalDays = outcome !== 'correct' ? 0 : assisted ? 1 : Math.min(30, Math.max(2, previousDays * 2));
  const delay = intervalDays === 0 ? 10 * 60_000 : intervalDays * 86_400_000;
  return { intervalDays, dueAt: new Date(now.getTime() + delay).toISOString() };
}
