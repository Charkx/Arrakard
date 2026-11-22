import { inMemoryCommandHarness } from '#support/application/in-memory-harness.ts';
import { describeSeasonContract } from '#support/application/season-contract.ts';

describeSeasonContract('en mémoire', inMemoryCommandHarness);
