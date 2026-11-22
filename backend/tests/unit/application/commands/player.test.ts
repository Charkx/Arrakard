import { inMemoryCommandHarness } from '#support/application/in-memory-harness.ts';
import { describePlayerContract } from '#support/application/player-contract.ts';

describePlayerContract('en mémoire', inMemoryCommandHarness);
