import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { materialPackSchema } from '../shared/content.ts';

writeFileSync(new URL('../content/material-pack.schema.json', import.meta.url), JSON.stringify(z.toJSONSchema(materialPackSchema), null, 2) + '\n');
console.log('Exported content/material-pack.schema.json. Run validate:content for semantic validation.');
