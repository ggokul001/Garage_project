import { copyFile,mkdir } from 'node:fs/promises';

await mkdir(new URL('../dist/database/',import.meta.url),{recursive:true});
await copyFile(new URL('../src/database/schema.sql',import.meta.url),new URL('../dist/database/schema.sql',import.meta.url));
