import assert from 'node:assert/strict';

import { ALL_MODEL_IDS, API_BASE, MODEL_INFO, MODEL_PRESETS, getModelInfo, parseSseEventBlock } from './api.js';

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

function testModelMetadataUsesRefreshedRoster() {
  assert.equal(MODEL_INFO.gpt.modelId, 'openai/gpt-5.6-sol');
  assert.equal(MODEL_INFO.gpt.name, 'GPT-5.6 Sol');
  assert.equal(MODEL_INFO.grok.modelId, 'x-ai/grok-4.5');
  assert.equal(MODEL_INFO.glm.modelId, 'fireworks/glm-5.2');
  assert.equal(MODEL_INFO.glm.name, 'Fireworks GLM-5.2 xHigh');
  assert.equal(MODEL_INFO.glm.provider, 'fireworks');
  assert.equal(MODEL_INFO['glm-fw'].modelId, 'fireworks/glm-5.2');
  assert.equal(MODEL_INFO['glm-zai'].modelId, 'z-ai/glm-5.2');
  assert.equal(MODEL_INFO.kimi.modelId, 'fireworks/kimi-k2.7-code');
  assert.equal(MODEL_INFO.minimax.challenger, true);
  assert.equal(MODEL_INFO.qwen.modelId, 'qwen/qwen3.7-max');
  assert.equal(MODEL_INFO.qwen.name, 'Qwen 3.7 Max');
}

function testRosterAndPresetsAreRegistryDerived() {
  assert.deepEqual(ALL_MODEL_IDS.slice(0, 5), ['gpt', 'fable', 'glm', 'gemini', 'grok']);
  assert.deepEqual(MODEL_PRESETS.compact.models, ALL_MODEL_IDS.slice(0, 5));
  assert.deepEqual(MODEL_PRESETS.speed.models, ['gpt', 'fable', 'gemini']);
  assert.deepEqual(MODEL_PRESETS.minimal.models, ['gpt', 'fable']);
  assert.equal(getModelInfo('openai/gpt-5.5').modelId, 'openai/gpt-5.5');
  assert.equal(getModelInfo('x-ai/grok-4.3').modelId, 'x-ai/grok-4.3');
}

function testApiBaseDefaultsToLocalhost() {
  assert.equal(API_BASE, 'http://localhost:8800');
}

function testDeepSeekProDoesNotClassifyAsGemini() {
  assert.equal(getModelInfo('deepseek/deepseek-v4-pro').id, 'deepseek');
}

testSingleDataLine();
testCrLfLineEndings();
testLargePayloadCanBeParsedAfterChunkReassembly();
testModelMetadataUsesRefreshedRoster();
testRosterAndPresetsAreRegistryDerived();
testApiBaseDefaultsToLocalhost();
testDeepSeekProDoesNotClassifyAsGemini();

console.log('SSE parser tests passed');
