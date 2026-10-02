import { z } from 'zod';

export const localizedSchema = z.strictObject({ en: z.string().min(1), zh: z.string().min(1) });
const idSchema = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/).max(100);
export const pictureSchema = z.enum(['water', 'milk', 'tea']);
const baseExercise = {
  id: idSchema,
  skillId: idSchema,
  prompt: localizedSchema,
  phrase: z.string().min(1),
  reading: z.string().optional(),
  hint: localizedSchema,
  explanation: localizedSchema,
};
export const exerciseSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...baseExercise,
    type: z.literal('choice'),
    options: z.array(z.strictObject({ id: idSchema, label: localizedSchema, picture: pictureSchema })).min(2).max(4),
    acceptedOptionId: idSchema,
  }),
  z.strictObject({
    ...baseExercise,
    type: z.literal('text'),
    acceptedAnswers: z.array(z.string().min(1)).min(1),
    knownErrors: z.array(z.strictObject({ answer: z.string().min(1), feedback: localizedSchema })),
  }),
]);
export const lessonSchema = z.strictObject({
  id: idSchema,
  language: z.enum(['en', 'ja']),
  audience: z.enum(['adult', 'child']),
  level: z.literal('pre-A1'),
  title: localizedSchema,
  objective: localizedSchema,
  scenario: localizedSchema,
  picture: pictureSchema,
  pattern: z.strictObject({ text: z.string().min(1), reading: z.string().optional(), meaning: localizedSchema, rule: localizedSchema }),
  caregiverGuidance: localizedSchema.optional(),
  audio: z.strictObject({ source: z.literal('device-speech'), reviewStatus: z.literal('unreviewed') }),
  exercises: z.array(exerciseSchema).min(1).max(20),
});
// Structural schema is also exported as JSON Schema for future MCP clients.
export const materialPackSchema = z.strictObject({
  schemaVersion: z.literal('0.1.0'),
  id: idSchema,
  revision: z.number().int().positive(),
  status: z.literal('draft'),
  title: localizedSchema,
  provenance: z.strictObject({ origin: z.string().min(1), reviewStatus: z.literal('needs-human-review') }),
  lessons: z.array(lessonSchema).min(1).max(20),
});

export type Locale = 'en' | 'zh';
export type Language = 'en' | 'ja';
export type Picture = z.infer<typeof pictureSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type MaterialPack = z.infer<typeof materialPackSchema>;

export function parseMaterialPack(input: unknown): MaterialPack {
  const pack = materialPackSchema.parse(input);
  const lessonIds = new Set<string>();
  const exerciseIds = new Set<string>();
  for (const lesson of pack.lessons) {
    if (lessonIds.has(lesson.id)) throw new Error(`Duplicate lesson ID: ${lesson.id}`);
    lessonIds.add(lesson.id);
    if (lesson.audience === 'child' && (!lesson.caregiverGuidance || lesson.exercises.some(exercise => exercise.type !== 'choice'))) {
      throw new Error(`Child lesson ${lesson.id} needs caregiver guidance and tap-only exercises`);
    }
    for (const exercise of lesson.exercises) {
      if (exerciseIds.has(exercise.id)) throw new Error(`Duplicate exercise ID: ${exercise.id}`);
      exerciseIds.add(exercise.id);
      if (exercise.type === 'choice') {
        if (new Set(exercise.options.map(option => option.id)).size !== exercise.options.length) {
          throw new Error(`Duplicate option ID: ${exercise.id}`);
        }
        if (!exercise.options.some(option => option.id === exercise.acceptedOptionId)) {
          throw new Error(`Missing accepted option: ${exercise.id}`);
        }
      }
    }
  }
  return pack;
}
