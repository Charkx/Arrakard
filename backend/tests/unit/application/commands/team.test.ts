import { inMemoryCommandHarness } from '#support/application/in-memory-harness.ts';
import { describeTeamContract } from '#support/application/team-contract.ts';

describeTeamContract('en mémoire', inMemoryCommandHarness);
