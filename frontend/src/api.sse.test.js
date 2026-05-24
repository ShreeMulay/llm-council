import assert from 'node:assert/strict';

import { parseSseEventBlock } from './api.js';

function testSingleDataLine() {
  const event = parseSseEventBlock('data: {"type":"stage1_start"}');
  assert.deepEqual(event, { type: 'stage1_start' });
}

function testCrLfLineEndings() {
  const event = parseSseEventBlock('data: {"type":"complete"}\r\n');
  assert.deepEqual(event, { type: 'complete' });
}

function testLargePayloadCanBeParsedAfterChunkReassembly() {
  const payload = {
    type: 'stage1_complete',
    data: Array.from({ length: 9 }, (_, index) => ({
      model: `model-${index}`,
      response: 'x'.repeat(10_000),
    })),
  };
  const serialized = `data: ${JSON.stringify(payload)}`;
  const chunks = [serialized.slice(0, 100), serialized.slice(100, 5000), serialized.slice(5000)];
  const reassembled = chunks.join('');
  const event = parseSseEventBlock(reassembled);

  assert.equal(event.type, 'stage1_complete');
  assert.equal(event.data.length, 9);
  assert.equal(event.data[0].response.length, 10_000);
}

testSingleDataLine();
testCrLfLineEndings();
testLargePayloadCanBeParsedAfterChunkReassembly();

console.log('SSE parser tests passed');
