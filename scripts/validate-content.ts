import { readFileSync } from 'node:fs';
import { parseMaterialPack } from '../shared/content.ts';

const pack = parseMaterialPack(JSON.parse(readFileSync(new URL('../content/polite-requests.json', import.meta.url), 'utf8')));
console.log(`Validated ${pack.id} revision ${pack.revision}: ${pack.lessons.length} lesson variants, ${pack.lessons.reduce((sum, lesson) => sum + lesson.exercises.length, 0)} exercises.`);
console.log('Draft content: human language review and reviewed audio assets remain required before publication.');
