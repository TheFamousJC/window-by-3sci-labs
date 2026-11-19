import test from 'node:test';
import assert from 'node:assert/strict';
import {
  helpInstructions,
  helpFaq,
  helpWizard,
  scoreSummary,
} from './helpContent.js';
import { DIFFICULTIES } from './gameRules.js';
test('instructions use the active difficulty scores and cover the full game flow', () => {
  for (const [name, rule] of Object.entries(DIFFICULTIES)) {
    assert.ok(helpInstructions.includes(scoreSummary(name)));
    assert.equal(
      Object.values(rule.points).reduce((a, b) => a + b, 0),
      10,
    );
  }
  for (const topic of [
    'Start a round',
    '100 points',
    'Save score',
    'Copy daily result',
    'UTC',
    'Next location',
    'Initial hint',
    'Data Layers',
    'Sunlight',
    'four attempts',
  ])
    assert.ok(helpInstructions.includes(topic), topic);
});
test('FAQ addresses controls, scoring, imagery and local-record limitations', () => {
  assert.ok(helpFaq.length >= 10);
  for (const text of [
    'Zoom out',
    'difficulty',
    'live satellite',
    'aircraft',
    'score',
  ])
    assert.ok(
      helpFaq.some(([question]) =>
        question.toLowerCase().includes(text.toLowerCase()),
      ),
      text,
    );
});
test('every wizard choice resolves, every node is reachable and guidance has a next action', () => {
  const visited = new Set();
  const queue = ['start'];
  while (queue.length) {
    const id = queue.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    const node = helpWizard[id];
    assert.ok(node, id);
    assert.ok(node.title && node.text, id);
    if (node.choices) {
      assert.ok(node.choices.length > 0);
      for (const [label, next] of node.choices) {
        assert.ok(label);
        assert.ok(helpWizard[next], next);
        queue.push(next);
      }
    } else assert.ok(['game', 'settings', 'layers'].includes(node.action), id);
  }
  assert.equal(visited.size, Object.keys(helpWizard).length);
});
