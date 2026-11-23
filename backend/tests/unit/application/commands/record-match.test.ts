import { inMemoryCommandHarness } from '#support/application/in-memory-harness.ts';
import { describeRecordMatchContract } from '#support/application/record-match-contract.ts';

describeRecordMatchContract('en mémoire', inMemoryCommandHarness);
