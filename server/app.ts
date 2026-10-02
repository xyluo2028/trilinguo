import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { AppError, LearningStore } from './store.ts';

const sessionModeSchema = z.enum(['lesson', 'review']);

export function createApp(store: LearningStore, allowedOrigins: string[] = []) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) {
      const origin = req.get('Origin');
      if (origin && !allowedOrigins.includes(origin)) throw new AppError(403, 'This origin cannot change learner data.');
      if (!req.is('application/json')) throw new AppError(415, 'Send JSON for this operation.');
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', contentRevision: store.pack.revision }));
  app.get('/api/bootstrap', (_req, res) => res.json({ profiles: store.profiles(), pack: store.pack }));
  app.post('/api/profiles', (req, res) => {
    const data = z.strictObject({ name: z.string().trim().min(1).max(40), presentation: z.enum(['adult', 'child']), explanationLanguage: z.enum(['en', 'zh']) }).parse(req.body);
    res.status(201).json(store.createProfile(data.name, data.presentation, data.explanationLanguage));
  });
  app.patch('/api/profiles/:profileId', (req, res) => {
    const data = z.strictObject({ explanationLanguage: z.enum(['en', 'zh']) }).parse(req.body);
    res.json(store.preferences(String(req.params.profileId), data.explanationLanguage));
  });
  app.get('/api/profiles/:profileId/dashboard', (req, res) => res.json(store.dashboard(String(req.params.profileId))));
  const route = '/api/profiles/:profileId/lessons/:lessonId';
  app.get(route, (req, res) => {
    const mode = sessionModeSchema.parse(req.query.mode ?? 'lesson');
    res.json(store.session(String(req.params.profileId), String(req.params.lessonId), mode));
  });
  app.post(`${route}/advance`, (req, res) => {
    const data = z.strictObject({ mode: sessionModeSchema.default('lesson') }).parse(req.body);
    res.json(store.advance(String(req.params.profileId), String(req.params.lessonId), data.mode));
  });
  app.post(`${route}/restart`, (req, res) => {
    const data = z.strictObject({ mode: sessionModeSchema }).parse(req.body);
    res.json(store.restart(String(req.params.profileId), String(req.params.lessonId), data.mode));
  });
  app.post(`${route}/answers`, (req, res) => {
    const { mode, ...data } = z.strictObject({ mode: sessionModeSchema.default('lesson'), attemptId: z.uuid(), exerciseId: z.string().max(100), answer: z.string().trim().min(1).max(500), hinted: z.boolean(), assisted: z.boolean() }).parse(req.body);
    res.json(store.answer(String(req.params.profileId), String(req.params.lessonId), data, mode));
  });
  app.use('/api', (_req, _res, next) => next(new AppError(404, 'API operation not found.')));
  return app;
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Please check the submitted fields.', details: error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
  } else if (error instanceof AppError) res.status(error.status).json({ error: error.message });
  else if (error instanceof SyntaxError && 'body' in error) res.status(400).json({ error: 'The request body must be valid JSON.' });
  else {
    console.error(error instanceof Error ? error.message : 'Unknown application error');
    res.status(500).json({ error: 'Something went wrong. Your previous progress is still saved. Try again.' });
  }
}
