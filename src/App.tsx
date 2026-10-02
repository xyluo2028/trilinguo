import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Language, Lesson, Locale, MaterialPack } from '../shared/content.ts';
import type { Dashboard, Profile, Session, SessionMode } from '../shared/learning.ts';
import { api } from './api.ts';
import { AudioButton } from './AudioButton.tsx';
import { Drink, Scene } from './Illustration.tsx';

const copy = {
  en: {
    today: 'Today', explore: 'Explore', notebook: 'My notebook', settings: 'Learners',
    tagline: 'A LITTLE, EVERY DAY', greeting: 'Good to see you', hero: 'Little lessons.\nEveryday possibilities.',
    childHero: 'A little Japanese,\ntogether.', subtitle: 'A quiet moment to learn something you can use. Let’s start with a simple conversation.',
    childSubtitle: 'Listen, look, and choose a picture. An adult can help with every little step.',
    yourPath: 'YOUR NEXT SMALL STEP', beginner: 'Beginner', adult: 'Adult', child: 'Together with an adult',
    start: 'Start lesson', resume: 'Resume lesson', repeat: 'Practise again', minutes: 'About 5 minutes · Go at your own pace',
    review: 'Ready to revisit', reviewText: 'A little remembering goes a long way.', reviewEmpty: 'Nothing due yet. A short lesson is a good place to begin.',
    reviewButton: 'Review now', attempts: 'Practice attempts', assisted: 'With help', progress: 'Your learning, at your pace',
    journey: 'EVERYDAY MOMENTS', exploreTitle: 'Small conversations,\nuseful places.', exploreText: 'Begin with one practical situation. New material will come after these sample lessons are reviewed.',
    notebookTitle: 'Something to\ncome back to.', notebookText: 'Useful patterns from the lessons you’ve started. Your English and Japanese histories stay separate.',
    notebookEmpty: 'Start a lesson to add its pattern to your notebook.', back: 'Back to Today',
    draft: 'Sample lesson · content awaiting review', audioDraft: 'Audio preview uses your device’s voice; availability varies.',
    begin: 'Let’s practise', next: 'Continue', check: 'Check answer', hint: 'A little help', hintUsed: 'Hint used', helped: 'I had help with this answer',
    correct: 'You’ve got it.', retry: 'Let’s look at that together.', unknown: 'Compare with the example.',
    assistedFeedback: 'Saved as practice with help.', independentFeedback: 'Saved as independent practice.',
    finish: 'One small step,\nwell done.', finishText: 'Your practice is saved. Mistakes return sooner, and assisted practice stays separate from independent recall.',
    home: 'Back to Today', typeAnswer: 'Your answer', choose: 'Choose a picture',
    settingsTitle: 'Everyone has\ntheir own path.', settingsText: 'Each learner has a separate lesson history. The child sample is for a five-year-old Chinese speaker beginning Japanese, with an adult helping.',
    name: 'Learner name', presentation: 'Learning style', add: 'Add learner', saved: 'Practice saves automatically',
    prototype: 'Family prototype', explanation: 'Explanations', createTitle: 'A new learner', english: 'English', japanese: 'Japanese',
  },
  zh: {
    today: '今天', explore: '探索', notebook: '我的笔记', settings: '学习者',
    tagline: '每天学一点', greeting: '很高兴见到你', hero: '一点点学习，\n用在每一天。', childHero: '一起学一点\n日语。',
    subtitle: '留一点时间，学一句用得上的话。从简单的日常对话开始。', childSubtitle: '听一听，看一看，再点选图片。每一步都可以请大人帮忙。',
    yourPath: '下一小步', beginner: '初学者', adult: '成人', child: '和大人一起',
    start: '开始学习', resume: '继续学习', repeat: '再练习一次', minutes: '大约五分钟 · 按自己的节奏来',
    review: '可以复习了', reviewText: '再想起一点点，就记牢一点点。', reviewEmpty: '现在没有到期的复习。先学一小课吧。',
    reviewButton: '开始复习', attempts: '练习次数', assisted: '有帮助的练习', progress: '按自己的节奏学习',
    journey: '日常小场景', exploreTitle: '简单的对话，\n熟悉的生活。', exploreText: '先从一个实用场景开始。这些示例课审核后，再添加新的内容。',
    notebookTitle: '学过的句型，\n随时回来看看。', notebookText: '这里收藏你开始学过的句型。英语和日语的学习记录分别保存。',
    notebookEmpty: '开始一节课，它的句型就会出现在笔记里。', back: '回到今天',
    draft: '示例课程 · 内容待审核', audioDraft: '语音预览使用设备上的声音；部分设备可能无法播放。',
    begin: '一起练习吧', next: '继续', check: '看看答案', hint: '给我一点帮助', hintUsed: '已使用提示', helped: '这个回答有别人帮助',
    correct: '答对啦。', retry: '我们一起看看。', unknown: '和例句比较一下。',
    assistedFeedback: '已保存为有帮助的练习。', independentFeedback: '已保存为独立练习。',
    finish: '又学了一点，\n做得不错。', finishText: '练习已经保存。需要巩固的内容会较早出现；有帮助的练习与独立回忆分别记录。',
    home: '回到今天', typeAnswer: '你的回答', choose: '点选图片',
    settingsTitle: '每个人都有\n自己的学习路。', settingsText: '每位学习者的记录单独保存。儿童示例适合母语为中文、刚开始学日语的五岁孩子，由大人陪伴。',
    name: '学习者名字', presentation: '学习方式', add: '添加学习者', saved: '练习进度自动保存',
    prototype: '家庭学习原型', explanation: '讲解语言', createTitle: '添加一位学习者', english: '英语', japanese: '日语',
  },
};
type Tab = 'today' | 'explore' | 'notebook' | 'settings';
type Bootstrap = { profiles: Profile[]; pack: MaterialPack };
const emptyDashboard: Dashboard = { sessions: [], due: [], attemptCount: 0, assistedCount: 0 };

function stored(key: string, fallback: string) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
function remember(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Progress lives in SQLite; preferences can remain temporary. */ } }

export default function App() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [profileId, setProfileId] = useState(() => stored('trilinguo.learner', 'adult'));
  const [language, setLanguage] = useState<Language>('en');
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [tab, setTab] = useState<Tab>('today');
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<SessionMode>('lesson');
  const [session, setSession] = useState<Session | null>(null);
  const [answer, setAnswer] = useState('');
  const [hinted, setHinted] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pendingAnswer = useRef<{ key: string; id: string } | null>(null);
  const profile = bootstrap?.profiles.find(value => value.id === profileId) ?? bootstrap?.profiles[0];
  const locale: Locale = profile?.explanationLanguage ?? 'en';
  const t = copy[locale];
  const lesson = bootstrap?.pack.lessons.find(value => value.id === lessonId);
  const lessons = bootstrap?.pack.lessons.filter(value => value.audience === profile?.presentation && value.language === language) ?? [];
  const featured = lessons[0];
  const path = profile && lessonId ? `/profiles/${profile.id}/lessons/${lessonId}` : '';

  useEffect(() => {
    const controller = new AbortController();
    api<Bootstrap>('/bootstrap', 'GET', undefined, controller.signal).then(data => {
      setBootstrap(data);
      if (!data.profiles.some(value => value.id === profileId)) setProfileId(data.profiles[0].id);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    const savedLanguage = stored(`trilinguo.language.${profile.id}`, profile.presentation === 'child' ? 'ja' : 'en');
    setLanguage(profile.presentation === 'child' ? 'ja' : savedLanguage === 'ja' ? 'ja' : 'en');
    setDashboard(emptyDashboard);
    const load = () => api<Dashboard>(`/profiles/${profile.id}/dashboard`, 'GET', undefined, controller.signal).then(setDashboard)
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    void load();
    const timer = setInterval(() => { void load(); }, 60_000);
    window.addEventListener('focus', load);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', load); };
  }, [profile?.id]);
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);
  useEffect(() => {
    setAnswer(''); setHinted(false); setAssisted(false); setComposing(false);
    pendingAnswer.current = null;
  }, [lessonId, sessionMode, session?.exerciseIndex, session?.stage]);
  useEffect(() => {
    if (!lessonId || !profile) return;
    const controller = new AbortController();
    setSession(null);
    api<Session>(`/profiles/${profile.id}/lessons/${lessonId}?mode=${sessionMode}`, 'GET', undefined, controller.signal).then(setSession)
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [lessonId, profile?.id, sessionMode]);

  async function act(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function refreshDashboard() {
    if (profile) setDashboard(await api<Dashboard>(`/profiles/${profile.id}/dashboard`));
  }
  function selectProfile(id: string) {
    setProfileId(id); remember('trilinguo.learner', id);
    setLessonId(null); setSessionMode('lesson'); setSession(null); setTab('today'); setError('');
  }
  function navigate(next: Tab) { setTab(next); setLessonId(null); setSessionMode('lesson'); setSession(null); setError(''); }
  function openLesson(id: string, mode: SessionMode = 'lesson') { setError(''); setLessonId(id); setSessionMode(mode); }
  async function mutation(operation: string, body: Record<string, unknown>) {
    const mode = operation === 'restart' ? (body.mode === 'review' ? 'review' : 'lesson') : sessionMode;
    const updated = await api<Session>(`${path}/${operation}`, 'POST', { ...body, mode });
    setSessionMode(mode);
    setSession(updated);
    await refreshDashboard();
  }
  async function setLocale(next: Locale) {
    if (!profile) return;
    const updated = await api<Profile>(`/profiles/${profile.id}`, 'PATCH', { explanationLanguage: next });
    setBootstrap(value => value ? { ...value, profiles: value.profiles.map(item => item.id === updated.id ? updated : item) } : value);
  }
  function lessonButtonLabel(value: Lesson) {
    const progress = dashboard.sessions.find(session => session.lessonId === value.id);
    return !progress ? t.start : progress.stage === 'complete' ? t.repeat : t.resume;
  }
  function startOrResume(value: Lesson) {
    const progress = dashboard.sessions.find(session => session.lessonId === value.id);
    if (progress?.stage === 'complete') {
      void act(async () => {
        await api(`/profiles/${profile!.id}/lessons/${value.id}/restart`, 'POST', { mode: 'lesson' });
        await refreshDashboard(); openLesson(value.id);
      });
    } else openLesson(value.id);
  }
  function lessonCard(value: Lesson) {
    return <article className="lesson-card" key={value.id}>
      <div className="card-art"><Drink kind={value.picture} /><span className="lesson-number">01</span></div>
      <div className="card-body"><span className="eyebrow">{value.language === 'ja' ? t.japanese : t.english} · {t.beginner}</span>
        <h3>{value.title[locale]}</h3><p>{value.objective[locale]}</p>
        <button className="text-button" onClick={() => startOrResume(value)} disabled={busy}>{lessonButtonLabel(value)} <span aria-hidden="true">↗</span></button>
      </div>
    </article>;
  }

  if (!bootstrap || !profile) return <main className="loading-shell"><div className="brand">trilinguo<span>✳</span></div>
    {error ? <><p role="alert">{error}</p><button className="primary" onClick={() => window.location.reload()}>Try again</button></> : <p role="status">Getting your little lesson ready…</p>}
  </main>;

  const currentExercise = lesson?.exercises.find(value => value.id === session?.exerciseIds[session.exerciseIndex]);
  return <div className="app-shell">
    <header className="header">
      <button className="brand" onClick={() => navigate('today')} disabled={busy}>trilinguo<span aria-hidden="true">✳</span></button>
      <span className="header-tagline">{t.tagline}</span>
      <div className="header-controls">
        <label className="profile-picker"><span className={`avatar ${profile.presentation}`}>{profile.presentation === 'child' ? '✿' : profile.name.slice(0, 1)}</span>
          <span className="sr-only">{t.settings}</span>
          <select aria-label={t.settings} value={profile.id} onChange={event => selectProfile(event.target.value)} disabled={busy}>
            {bootstrap.profiles.map(value => <option value={value.id} key={value.id}>{value.name}</option>)}
          </select>
        </label>
        <div className="locale-switch" aria-label={t.explanation} role="group">
          <button aria-pressed={locale === 'en'} onClick={() => void act(() => setLocale('en'))} disabled={busy}>EN</button>
          <button aria-pressed={locale === 'zh'} onClick={() => void act(() => setLocale('zh'))} disabled={busy}>中文</button>
        </div>
      </div>
    </header>
    <div className="layout">
      <aside className="sidebar">
        <nav aria-label={locale === 'zh' ? '主导航' : 'Main navigation'}>
          {(['today', 'explore', 'notebook', 'settings'] as Tab[]).map((value, index) => <button key={value} className={tab === value && !lesson ? 'nav-item active' : 'nav-item'} onClick={() => navigate(value)} disabled={busy} aria-current={tab === value && !lesson ? 'page' : undefined}>
            <span aria-hidden="true">{['☀', '◈', '▤', '♧'][index]}</span>{t[value]}
          </button>)}
        </nav>
        <div className="sidebar-note"><span aria-hidden="true">✳</span><p>{locale === 'zh' ? '不用急。\n每天学一点就好。' : 'No rush.\nA little is enough.'}</p></div>
        <span className="prototype-label">{t.prototype}</span>
      </aside>
      <main className="main" id="main-content">
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')} aria-label={locale === 'zh' ? '关闭提示' : 'Dismiss'}>×</button></div>}
        {lessonId ? (!session ? <div className="loading-content"><p role="status">{locale === 'zh' ? '正在读取进度…' : 'Opening your saved progress…'}</p>
          <button className="secondary" disabled={busy} onClick={() => void act(() => mutation('restart', { mode: 'lesson' }))}>{locale === 'zh' ? '重新开始' : 'Start again'}</button></div> : lesson && <>
          <button className="back-button" onClick={() => navigate('today')} disabled={busy}>← {t.back}</button>
          <div className="lesson-heading"><span className="eyebrow">{lesson.language === 'ja' ? t.japanese : t.english} · {profile.presentation === 'child' ? t.child : t.adult}</span><span className="saved-label">✓ {t.saved}</span></div>
          {session.stage === 'intro' && <section className="intro-grid">
            <div><span className="pill">{t.draft}</span><h1>{lesson.title[locale]}</h1><p className="lede">{lesson.scenario[locale]}</p>
              <div className="pattern"><h2 lang={lesson.language}>{lesson.pattern.text}</h2>{lesson.pattern.reading && <p lang="ja" className="reading">{lesson.pattern.reading}</p>}<p>{lesson.pattern.meaning[locale]}</p>
                <AudioButton text={lesson.pattern.text} language={lesson.language} locale={locale} />
              </div><p>{lesson.pattern.rule[locale]}</p>
              {lesson.caregiverGuidance && <div className="caregiver"><span className="eyebrow">{t.child}</span><p>{lesson.caregiverGuidance[locale]}</p></div>}
              <button className="primary" disabled={busy} onClick={() => void act(() => mutation('advance', {}))}>{t.begin} <span aria-hidden="true">→</span></button>
              <p className="fine-print">{t.audioDraft}</p>
            </div><div className="intro-art"><Scene child={profile.presentation === 'child'} /></div>
          </section>}
          {(session.stage === 'practice' || session.stage === 'feedback') && currentExercise && <section className="practice-panel">
            <div className="activity-progress"><span>{session.exerciseIndex + 1} / {session.exerciseIds.length}</span><progress value={session.exerciseIndex} max={session.exerciseIds.length} aria-label={locale === 'zh' ? '课程进度' : 'Lesson progress'} /></div>
            {session.stage === 'practice' ? <>
              <h1 className="activity-title">{currentExercise.prompt[locale]}</h1>
              {currentExercise.type === 'choice' && <div className="listen-prompt"><p lang={lesson.language}>{currentExercise.phrase}</p>
                {currentExercise.reading && <span className="reading" lang="ja">{currentExercise.reading}</span>}
                <AudioButton text={currentExercise.phrase} language={lesson.language} locale={locale} />
              </div>}
              <form onSubmit={(event: FormEvent) => {
                event.preventDefault();
                if (busy || composing || !answer.trim()) return;
                const key = JSON.stringify({ profileId: profile.id, lessonId, sessionMode, exerciseId: currentExercise.id, answer, hinted, assisted });
                if (pendingAnswer.current?.key !== key) pendingAnswer.current = { key, id: crypto.randomUUID() };
                void act(() => mutation('answers', { attemptId: pendingAnswer.current!.id, exerciseId: currentExercise.id, answer, hinted, assisted }));
              }}>
                {currentExercise.type === 'choice' ? <fieldset className="picture-options"><legend className="sr-only">{t.choose}</legend>
                  {currentExercise.options.map(option => <label className={`picture-option ${answer === option.id ? 'selected' : ''}`} key={option.id}>
                    <input type="radio" name="picture" value={option.id} checked={answer === option.id} onChange={() => setAnswer(option.id)} disabled={busy} />
                    <Drink kind={option.picture} /><span>{option.label[locale]}</span><span className="selection-dot" aria-hidden="true">{answer === option.id ? '✓' : ''}</span>
                  </label>)}
                </fieldset> : <label className="text-answer">{t.typeAnswer}<textarea value={answer} onChange={event => setAnswer(event.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} lang={lesson.language} autoComplete="off" maxLength={500} disabled={busy} rows={3} /></label>}
                <div className="practice-help"><button className="text-button" type="button" onClick={() => setHinted(true)} disabled={hinted || busy}>{hinted ? t.hintUsed : t.hint}</button>
                  {profile.presentation === 'adult' && <label className="assistance"><input type="checkbox" checked={assisted} onChange={event => setAssisted(event.target.checked)} disabled={busy} />{t.helped}</label>}
                </div>
                {hinted && <div className="hint" role="status">{currentExercise.hint[locale]}</div>}
                <button className="primary" type="submit" disabled={busy || composing || !answer.trim()}>{t.check} <span aria-hidden="true">→</span></button>
              </form>
            </> : session.lastAttempt && <div className={`feedback ${session.lastAttempt.outcome}`} role="status">
              <div className="feedback-symbol" aria-hidden="true">{session.lastAttempt.outcome === 'correct' ? '✓' : '↺'}</div>
              <h1>{session.lastAttempt.outcome === 'correct' ? t.correct : session.lastAttempt.outcome === 'unrecognized' ? t.unknown : t.retry}</h1>
              <p className="example" lang={lesson.language}>{session.lastAttempt.example}</p><p>{session.lastAttempt.explanation[locale]}</p>
              <p className="fine-print">{session.lastAttempt.assisted ? t.assistedFeedback : t.independentFeedback}</p>
              <button className="primary" onClick={() => void act(() => mutation('advance', {}))} disabled={busy}>{t.next} →</button>
            </div>}
          </section>}
          {session.stage === 'complete' && <section className="completion"><div className="completion-flower" aria-hidden="true">✳</div><span className="eyebrow">{lesson.title[locale]}</span>
            <h1>{t.finish}</h1><p className="lede">{t.finishText}</p><div className="completed-pattern" lang={lesson.language}>{lesson.pattern.text}</div>
            <button className="primary" onClick={() => navigate('today')}>{t.home} →</button>
            <button className="text-button" disabled={busy} onClick={() => void act(() => mutation('restart', { mode: 'lesson' }))}>{t.repeat}</button>
          </section>}
        </>) : <>
          {tab !== 'settings' && <div className="page-topline"><p>{t.greeting}, <strong>{profile.name}</strong> <span aria-hidden="true">✧</span></p>
            <div className="language-switch" aria-label={locale === 'zh' ? '目标语言' : 'Target language'} role="group">
              {(profile.presentation === 'child' ? ['ja'] : ['en', 'ja']).map(value => <button key={value} aria-pressed={language === value} onClick={() => { setLanguage(value as Language); remember(`trilinguo.language.${profile.id}`, value); }}>
                {value === 'ja' ? t.japanese : t.english}
              </button>)}
            </div>
          </div>}
          {tab === 'today' && <>
            <section className="hero">
              <div className="hero-copy"><span className="eyebrow">{t.yourPath}</span>
                <h1>{profile.presentation === 'child' ? t.childHero : t.hero}</h1>
                <p className="lede">{profile.presentation === 'child' ? t.childSubtitle : t.subtitle}</p>
                {featured && <button className="primary" disabled={busy} onClick={() => startOrResume(featured)}>{lessonButtonLabel(featured)} <span aria-hidden="true">→</span></button>}
                <p className="fine-print">{t.minutes}</p>
              </div>
              <div className="hero-art"><div className="art-caption"><span>{profile.presentation === 'child' ? 'いっしょに、すこしずつ。' : 'A little water, please.'}</span><span>{t.journey}</span></div><Scene child={profile.presentation === 'child'} /><span className="art-sticker">{t.beginner}</span></div>
            </section>
            <div className="section-title"><h2>{t.yourPath}</h2><button className="text-button" disabled={busy} onClick={() => navigate('explore')}>{t.explore} ↗</button></div>
            <div className="home-grid"><div className="cards">{lessons.map(lessonCard)}</div>
              <section className="review-card"><span className="review-icon" aria-hidden="true">↺</span><h3>{t.review}</h3><p>{t.reviewText}</p>
                {dashboard.due.filter(item => lessons.some(value => value.id === item.lessonId)).length ? dashboard.due.filter(item => lessons.some(value => value.id === item.lessonId)).map(item => <button className="secondary" key={item.lessonId} disabled={busy} onClick={() => void act(async () => {
                  await api(`/profiles/${profile.id}/lessons/${item.lessonId}/restart`, 'POST', { mode: 'review' });
                  await refreshDashboard(); openLesson(item.lessonId, 'review');
                })}>{t.reviewButton} · {item.count} →</button>) : <p className="review-empty">{t.reviewEmpty}</p>}
              </section>
            </div>
            <div className="progress-strip"><div><span className="eyebrow">{t.progress}</span><p>{t.saved}</p></div>
              <div className="stat"><strong>{dashboard.attemptCount}</strong><span>{t.attempts}</span></div>
              <div className="stat"><strong>{dashboard.assistedCount}</strong><span>{t.assisted}</span></div>
            </div>
          </>}
          {tab === 'explore' && <>
            <div className="page-heading"><span className="eyebrow">{t.journey}</span><h1>{t.exploreTitle}</h1><p className="lede">{t.exploreText}</p></div>
            <div className="explore-grid">{lessons.map(lessonCard)}</div>
          </>}
          {tab === 'notebook' && <>
            <div className="page-heading"><span className="eyebrow">{t.notebook}</span><h1>{t.notebookTitle}</h1><p className="lede">{t.notebookText}</p></div>
            {bootstrap.pack.lessons.filter(value => dashboard.sessions.some(item => item.lessonId === value.id)).length ? bootstrap.pack.lessons.filter(value => dashboard.sessions.some(item => item.lessonId === value.id)).map(value => <article className="notebook-entry" key={value.id}>
              <Drink kind={value.picture} /><div><span className="eyebrow">{value.language === 'ja' ? t.japanese : t.english}</span><h2 lang={value.language}>{value.pattern.text}</h2>
                {value.pattern.reading && <p className="reading" lang="ja">{value.pattern.reading}</p>}<p>{value.pattern.meaning[locale]}</p><p>{value.pattern.rule[locale]}</p>
                <AudioButton text={value.pattern.text} language={value.language} locale={locale} />
                <button className="text-button" disabled={busy} onClick={() => startOrResume(value)}>{lessonButtonLabel(value)} ↗</button>
              </div>
            </article>) : <div className="empty-state">{t.notebookEmpty}</div>}
          </>}
          {tab === 'settings' && <>
            <div className="page-heading"><span className="eyebrow">{t.settings}</span><h1>{t.settingsTitle}</h1><p className="lede">{t.settingsText}</p></div>
            <div className="learners-grid"><div className="learner-list">
              {bootstrap.profiles.map(value => <button className={`learner-row ${value.id === profile.id ? 'selected' : ''}`} key={value.id} disabled={busy} onClick={() => selectProfile(value.id)} aria-pressed={value.id === profile.id}>
                <span className={`avatar ${value.presentation}`}>{value.presentation === 'child' ? '✿' : value.name.slice(0, 1)}</span><span><strong>{value.name}</strong><small>{value.presentation === 'child' ? t.child : t.adult}</small></span><span aria-hidden="true">{value.id === profile.id ? '✓' : '→'}</span>
              </button>)}
            </div><form className="new-learner" onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault(); if (busy) return;
              const form = event.currentTarget; const data = new FormData(form);
              const name = String(data.get('name') ?? '').trim();
              const presentation = data.get('presentation') === 'child' ? 'child' : 'adult';
              if (!name) return;
              void act(async () => {
                const created = await api<Profile>('/profiles', 'POST', { name, presentation, explanationLanguage: presentation === 'child' ? 'zh' : locale });
                setBootstrap(value => value ? { ...value, profiles: [...value.profiles, created] } : value);
                form.reset(); selectProfile(created.id);
              });
            }}>
              <h2>{t.createTitle}</h2><label>{t.name}<input name="name" required maxLength={40} disabled={busy} /></label>
              <label>{t.presentation}<select name="presentation" defaultValue="adult" disabled={busy}><option value="adult">{t.adult}</option><option value="child">{t.child}</option></select></label>
              <button className="primary" type="submit" disabled={busy}>{t.add} <span aria-hidden="true">→</span></button>
            </form></div>
          </>}
        </>}
        <footer className="footer"><span>{t.prototype} · {t.draft}</span><span>{t.saved}</span></footer>
      </main>
    </div>
  </div>;
}
