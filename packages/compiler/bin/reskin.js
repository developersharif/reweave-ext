#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// Node ≥ 22.18 / 24 runs the TypeScript sources directly (type stripping, D-027).
import { main } from '../cli/main.ts';

process.exitCode = await main(process.argv.slice(2));
