import { inMemoryCommandHarness } from '#support/application/in-memory-harness.ts';
import { describeImportDecisionsContract } from '#support/application/import-decisions-contract.ts';

describeImportDecisionsContract('en mémoire', inMemoryCommandHarness);
