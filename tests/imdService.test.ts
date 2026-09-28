import assert from 'node:assert/strict';
import test from 'node:test';
import { parseImd } from '../services/imdService.ts';

test('parses the documented IMD five-day district payload and maps colors exactly', () => {
  const warnings = parseImd({
    Obj_id: 30,
    District: 'KANYAKUMARI',
    Date: '2026-09-28',
    Day_1: '4',
    Day_2: '5',
    Day_3: '7',
    Day_4: '8',
    Day_5: '16',
    Day1_Color: 1,
    Day2_Color: 2,
    Day3_Color: 3,
    Day4_Color: 4,
    Day5_Color: 3,
    Day1_text: 'Red warning text',
    Day2_text: 'Orange warning text',
    Day3_text: '',
    Day4_text: '',
    Day5_text: 'Yellow rain text',
    updated_at: '2026-09-28T09:24:05Z',
  });

  assert.deepEqual(warnings?.map((warning) => warning.level), ['RED', 'ORANGE', 'YELLOW', 'YELLOW']);
  assert.equal(warnings?.[0].message, 'Red warning text');
  assert.equal(warnings?.[1].message, 'Orange warning text');
  assert.equal(warnings?.[2].title, 'IMD district warning (Day 3)');
  assert.equal(warnings?.[2].message, 'Official IMD YELLOW color alert: Dust-raising winds.');
  assert.equal(warnings?.[3].message, 'Yellow rain text');
});

test('rejects payloads that do not contain documented day and color fields', () => {
  assert.equal(parseImd({ warning: 'not an IMD district payload' }), null);
});
