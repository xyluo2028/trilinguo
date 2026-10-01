# Family Language Learning App — Design Brief v0.1

Date: 30 September 2026

Status: Planning draft, updated with external AI authoring through MCP. Confirmed user requirements are separated from proposed defaults. No application has been built. The user proposed a web app and asked whether it is a good choice; this is the recommended working direction. Listening with tap/text answers and MCP access for external agents to generate/import learning materials are confirmed. Product name and child age range remain open.

## 1. Purpose and confirmed requirements

Help the user and their family learn regularly, understand confusing grammar, remember vocabulary and patterns, and use practical daily conversations.

| Decision | Confirmed requirement |
| --- | --- |
| Learners | Both adult beginners and children |
| Target languages | English and Japanese |
| Explanation languages | Learner can choose Chinese or English |
| Learning material | Grammar, vocabulary, useful daily conversations, pictures, example sentences, and quick questions |
| Main problems | Forgetting learned material; confusing rules and exceptions; uncertainty about what to study next |
| Child participation | A mixture of independent learning and learning with an adult |
| Initial interaction | Listening with tap/text answers is sufficient; spoken answers and pronunciation scoring are deferred |
| AI integration | External AI agents access the application through MCP to generate and import study materials; an embedded or live in-app language model is not required |
| First success criterion | Useful, regular learning for the user or family |
| Current stage | Consolidate the plan and design before implementation |

The child age question was left unanswered. This is an open decision, not evidence that the app should support every childhood age in its first release.

## 2. Product hypothesis

A short guided lesson, a personal rulebook, and review driven by previous attempts can make daily learning easier to continue. The app chooses a manageable next activity while allowing the learner to explore a topic or request an explanation.

This is a hypothesis to test with the family. It is not a claim of proven retention improvement.

Prior learning conversations suggest useful patterns: one question at a time; practical situations; requests to pause and consolidate rules; explicit comparisons such as Japanese verb groups; and sentence production after explanations. These observations describe the user's learning, not all learners.

## 3. Learner model

Proposed settings for each learner:

- Adult or child presentation.
- Explanation language: Chinese or English, switchable during a lesson without losing progress.
- Target language: English or Japanese, with separate learning histories.
- Reading ability in the explanation language and familiarity with the target script, recorded separately.
- Preferred assistance: listening, reading, or a combination.
- Session length preference; propose a short default and allow early completion.

For child sessions, allow “Learning alone” and “Together with an adult” to be chosen per session. Together mode offers simple caregiver prompts. An assisted answer is practice evidence, not independent recall.

Age, reading ability, and language level are separate dimensions. Adult mode must not inherit childish topics merely because the learner is a beginner. Child mode needs age-appropriate testing once a concrete child audience is known; a single child skin is not a complete pedagogy for all ages.

## 4. Learning loop

Proposed session structure:

1. Remember: a small number of due review items.
2. Meet a situation: a meaningful picture and a short audio exchange.
3. Learn: one pattern and a small set of useful words or phrases.
4. Practise: supported recognition, then a response with less support.
5. Use: a short dialogue or a new sentence in a different context.
6. Finish: a specific accomplishment and automatically saved references.

Five to ten minutes is a proposed adult default, not a requirement for children or a fixed timer. Keep exercises interruptible and preserve the exact next activity on resume.

The primary home action is “Start today's lesson.” Prefer due review, then the next suitable lesson whose prerequisites are covered. If review becomes too large, cap the session and defer new material. A missed day should produce a manageable return session.

## 5. Grammar, vocabulary, and feedback

Grammar has three layers:

- In-lesson rule: a short explanation and examples.
- Optional comparison: related forms and a relevant exception.
- Reference page: a fuller, organized rule with links back to practice.

Present a simple rule with an honest scope; do not teach a shortcut as universal if known exceptions matter. Avoid delivering every exception at once.

Vocabulary entries connect a meaning, reading or pronunciation, a useful phrase, and a sentence. Use pictures to convey meaning rather than decorate a screen. Offer audio replay; essential tasks should not depend on color alone.

Question formats for the pilot: picture or answer selection, a missing word, sentence construction, and a short typed response where the learner's reading and input skills allow it. Listening with tap/text answers is confirmed. Spoken responses are deferred. Recognition or arranging visible word choices alone must not imply independent production mastery.

Feedback should identify the relevant issue, give a concise explanation in the selected explanation language, and offer a new attempt. For example:

- Attempt: 昨日は学校に行きませでした。
- Correction: 昨日は学校に行きませんでした。
- Explanation: the polite past-negative ending is ませんでした.
- Transfer exercise: ask the learner to express a different past-negative sentence.

Accept reviewed natural alternatives for bounded text exercises, with appropriate normalization of whitespace and punctuation. A grammatically valid answer that does not practise the target structure should receive a specific explanation when that variant is known. Without a live model, an unrecognized open-ended response must not automatically be declared grammatically wrong. Begin with constrained prompts and reviewed accepted-answer sets; allow uncertain answers to be flagged or compared with examples. General free-writing assessment is outside the initial scope.

## 6. Review and progress

Track recognition, supported sentence construction, and independent text production separately for each skill or vocabulary item. Useful attempt fields include response mode, correctness, hints or caregiver help, misconception tag, and last practice time. The initial app does not measure speaking ability.

Proposed initial review behavior:

- Incorrect answer: explain, provide a supported retry, and revisit later.
- Correct with help: keep the item in relatively near-term review.
- Correct independently on later attempts: increase the interval.
- Repeated confusion: offer the relevant comparison lesson and reduce new material.

Exact intervals and promotion thresholds are implementation choices to validate. Completing a lesson is distinct from retaining a skill. Do not display an invented mastery percentage.

Store a structured learning history rather than relying only on chat transcripts. An explanation-language switch must not duplicate or reset the target-language skill history.

## 7. Proposed screens

| Screen | Purpose | Main actions |
| --- | --- | --- |
| Today | Give a clear next step | Start or resume; switch learner or target language |
| Lesson | Complete one focused activity at a time | Answer; replay audio; hint; explain; retry |
| Explore | Choose a practical topic | Open a topic; see prerequisites and available lessons |
| My notebook | Retrieve learned material | View rules, phrases, examples, and practice links |
| Learner settings | Adjust presentation and support | Explanation language, reading support, assistance, session preference |

These are information-design proposals, not approved screen layouts. Progress can be integrated into Today and the notebook instead of adding another dashboard.

## 8. Language and content design

Share the exercise engine, navigation, review system, and learner profiles. Keep English and Japanese curricula independently sequenced.

Japanese requires decisions about kana support, furigana, temporary romanization, script familiarity, and polite forms. English requires its own progression through sound–spelling relationships, articles, word order, and verb patterns. Similar daily-life goals can use different grammar and sequencing.

Each canonical lesson should specify:

- Target language, practical outcome, prerequisites, and intended learner level.
- Skill and vocabulary identifiers.
- Adult and child scenario options where needed.
- Chinese and English explanations.
- Pictures, audio, examples, question variants, accepted answers, hints, and misconception feedback.
- A later review variant with a changed example or context.
- Content review status and asset origin or license.

The main workload multiplier is content: two target languages, two explanation languages, and two audiences. Reuse the lesson structure and reviewed language facts while adapting explanations and situations. Avoid assuming that translated adult lessons automatically work for children.

## 9. External AI authoring through MCP — confirmed direction

The user wants an application that external AI agents can operate through MCP. The agent supplies language-model reasoning and content generation in its own environment; our server exposes access to course context and actions for importing, validating, updating, and publishing materials. MCP is the interface, not the content generator.

The web app and MCP server should call a shared application service, with shared content validation and access rules. Store structured learning content and learner progress in the database; store pictures and audio as media assets. The learner-facing web app uses normal web APIs and can deliver published lessons while the external agent is disconnected.

The external agent can generate original lessons or transform user-provided notes, vocabulary lists, and selected textbook content into our import format. This moves document interpretation into the authoring workflow. A general-purpose PDF/OCR importer inside the app is deferred; structured material import through MCP is part of the MVP.

Keep core lessons, accepted answers, correction explanations, and the review scheduler available without model calls. An agent may later use an explicitly authorized learning summary to create targeted remedial material. Generating a new pack should not itself alter learner attempt history or mastery records.

Initial MCP operations are described in Section 14. Their names and exact schemas are proposals, not already implemented tools.

Initial audio scope is playback and replay. Learners may voluntarily repeat aloud, but the first version does not record or grade speech. Microphone recording, speech recognition, and pronunciation feedback are deferred.

## 10. Milestones and acceptance checks

| Milestone | Deliverable | Completion check |
| --- | --- | --- |
| 1. Product brief | This draft plus platform and interaction decisions | Confirmed requirements and open questions are distinguishable |
| 2. Content contract and lesson design | A versioned material-pack schema and one complete lesson per target language, including adult/child and Chinese/English variations | Every question, answer, correction, media asset, and review step can be represented and walked through |
| 3. MCP authoring path | Course-context read, draft import/update, validation, asset attachment, and publication | An external agent can create a previewable lesson; retrying the same import does not duplicate content |
| 4. Learning prototype | Profiles, Today, lesson loop, notebook, and review persistence | Published materials render correctly; attempts change subsequent practice and remain separate between profiles |
| 5. Small content pilot | Proposed ceiling of 6–8 short lessons per language | Material is reviewed and covers a coherent, explicitly limited starting level |
| 6. Family trial | Approximately one week of use and observations | Evidence exists about return use, delayed recall, confusing explanations, and assistance needed |

The trial is directional evidence, not a controlled study. Record whether learners return willingly, complete a manageable session, use an earlier pattern with fewer hints, and understand why an answer needs correction. Track voluntary learning separately from caregiver-prompted participation.

Before producing the full pilot catalogue, use the complete sample lessons to establish the initial proficiency range and whether the child presentation fits the actual reader.

Defer payment, public communities, leaderboards, extensive game economies, a large catalogue, and unconstrained conversation until the core family learning loop proves useful.

## 11. Platform recommendation and implementation boundaries

Recommend a responsive web app, designed for phone touch interaction and adaptable to tablet and desktop layouts. This fits the confirmed picture/audio/tap/text workflow and the family-pilot goal. A shared URL makes the pilot accessible and allows lesson changes to be delivered through one web application.

Proposed delivery sequence:

1. Online web prototype: complete lessons, separate profiles, saved progress, and reliable audio playback.
2. Home-screen access: add app name, icons, and manifest configuration where useful; test the actual family devices.
3. Optional offline lesson packs: implement asset caching and progress reconciliation only if the trial reveals this need.
4. Consider a native application when concrete requirements justify it, such as deeper device integration or a desired distribution channel.

Home-screen installation and offline operation are separate features. WebKit documents home-screen web apps on iOS/iPadOS 26; offline lessons still require deliberate caching and data handling. Do not promise identical installation prompts or background behavior across browsers.

Audio design: use visible Play and Replay controls; handle playback failure with a retry action. Browsers may restrict autoplay with sound. Prefer reviewed recordings or reviewed, pre-generated audio assets so each lesson has a known pronunciation and voice. An external agent with access to a TTS tool or service can prepare audio, then upload and attach it through the application's asset workflow. MCP alone does not supply speech synthesis. The application need not invoke a model during authoring or playback under this design; generation usage occurs in the external agent/TTS environment, and storage/delivery remain application costs.

Progress design: propose durable server-side progress for the family pilot, with separate learner histories. Decide the simplest sign-in arrangement before implementation. A local-only demo may be sufficient for a storyboard prototype, but it must not be described as cross-device synchronization or durable backup.

Mobile interaction details to verify: large tap targets; no hover-only actions; answers and the submit button remain visible with the software keyboard; Japanese input-method composition must finish before answer submission; lesson resume and audio replay work after returning from another app.

Keep lesson content, review rules, and progress records separate from screen rendering. These can be reused if a native client is later justified, although its interface may still require new work. No frontend framework, hosting provider, or paid service has been selected.

Technical references checked 30 September 2026:

- [WebKit: WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) — home-screen web app behavior.
- [MDN: Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) — user interaction and audio autoplay restrictions.
- [MDN: Offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) — deliberate offline caching and browser-managed background behavior.

## 12. Next lesson-design task

Draft one English and one Japanese lesson around the practical goal “Ask for an item politely.” This is a proposed sample, not the finalized curriculum starting point.

- English example: “Can I have some water, please?” Teach it initially as a useful pattern with a short explanation; a deeper modal-verb lesson is not a prerequisite for using the phrase.
- Japanese example: “お水をください。” Provide reading support and a short explanation of the request pattern.
- Adult scenario: requesting an item at a cafe. Child scenario: requesting a drink during a snack break, subject to age and reading-level review.
- Shared screen sequence: scene and audio; meaning; pattern; recognition question; guided construction; independent text response when appropriate; short dialogue completion; later review with a different item.
- Author the Chinese and English explanations, likely errors, accepted alternatives, hint behavior, and assisted-answer treatment before implementing screens.

Start with a storyboard and a structured material pack that can be imported through MCP. A live model in the learner-facing application is not part of the initial design.

## 13. Open decisions

Decisions before implementation or the real pilot:

- Child age range and reading abilities.
- Starting proficiency for each target language.
- Script-reading support and input expectations.
- Which external agent environment will author the first material pack, and which image/TTS capabilities it has.
- Authoring and media-generation budget; hosting and storage budget.
- Where progress should persist and whether multiple devices must stay synchronized.
- Visual style, optional rewards, and preferred lesson length.

These open questions should not prevent a concrete lesson storyboard from being drafted using clearly labeled defaults.

## 14. MCP authoring contract — proposed design

Expose a remote MCP interface over an authenticated connection, with the exact supported protocol and transport chosen against the first agent client. MCP tools wrap application operations; they do not grant raw database or arbitrary filesystem access. Reuse the same application services and validation as the web app.

Proposed small tool surface:

| Tool | Role | Important result |
| --- | --- | --- |
| `get_authoring_context` | Read the content schema, a compact example pack, supported exercise types, and course prerequisites | Schema version and existing stable IDs |
| `search_materials` | Find existing lessons, vocabulary, and grammar points | Matching IDs and versions, with focused content retrieval |
| `import_material_pack` | Create or update a coherent draft of lessons, vocabulary, and exercises | Draft ID, version, validation diagnostics, and preview URL |
| `prepare_asset_upload` / `complete_asset_upload` | Transfer actual image/audio bytes and attach verified assets | Stable asset IDs and metadata |
| `validate_material_pack` | Check structure, references, accepted-answer fields, localization, and required assets | Actionable errors and warnings with field paths |
| `publish_material_pack` | Make a validated, reviewed draft available in the selected course | Published version and lesson IDs |

Resources may also expose schemas and authoring guidance where the client supports them. Tool-returned context should remain usable without assuming every agent client renders resources identically. Generic tool discovery is provided by MCP; the operations above describe the application's own authoring functions.

Later addition: `get_learning_summary` can return a selected learner's relevant difficulties when explicitly authorized, so an agent can draft targeted exercises. This read permission is separate from content-authoring permission. Do not include unnecessary family details in authoring context.

Material-pack fields should include schema version, pack ID, course ID, revision, target language, audience/readability metadata, skill IDs, prerequisites, Chinese/English explanations, vocabulary with readings and senses, examples, typed exercises and answer rules, hints, misconception feedback, dialogue turns, asset references, and source/provenance metadata. Keep language facts separate from presentation variants.

Use stable IDs and an idempotency key for imports. Updates carry an expected version so retries do not create duplicate lessons and older agents do not silently overwrite newer edits. Publication activates a coherent version; learner attempts retain the content version used when they answered. A source-content revision does not silently reset progress.

Draft, validation, preview, and publication are distinct states. A single authorized authoring task may proceed through all of them; this is not a requirement to ask the user for confirmation at every tool call. Keep human language/content review explicit for the standard course, and allow the user to choose the desired publication workflow. Schema validation can detect a missing answer or audio file, but cannot prove that an explanation is linguistically correct.

Media upload should carry bytes through a supported upload endpoint, not assume that the remote server can read an agent's local file path. MCP calls can carry metadata and asset IDs. Verify uploaded files before attachment; record MIME type, checksum, language, voice or generation method, and review status. Keep private imported material and its assets scoped to the owning family.

Example authoring request: “Create a short Japanese lesson on て-form requests, with Chinese and English explanations, eight questions, two illustrations, and sentence audio; add it to our family course.” The agent reads the contract and course context, drafts the material, produces available media with its own tools, imports the draft, fixes validation failures, previews/reviews it, and publishes under the chosen workflow. The web app then renders the saved content without needing that agent to remain connected.

The first end-to-end acceptance case is: an external agent imports one lesson with at least one real audio clip; it becomes playable in the web app; an incorrect learner answer enters review; and replaying audio or reopening the lesson makes no model-generation request.

Protocol reference checked 30 September 2026: [MCP architecture overview](https://modelcontextprotocol.io/docs/learn/architecture). The protocol exposes tools and contextual resources; the content contract and workflow above are application design proposals.
