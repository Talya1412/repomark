#!/usr/bin/env node
import { run } from './main.js';
import { UsageError } from './args.js';
import { EXIT_CODES } from './exit-codes.js';
try { const code = await run(process.argv.slice(2)); process.exitCode = code; } catch (error: unknown) { process.stderr.write(`${error instanceof Error ? error.message : 'repomark failed'}\n`); process.exitCode = error instanceof UsageError ? EXIT_CODES.usage : EXIT_CODES.failure; }
