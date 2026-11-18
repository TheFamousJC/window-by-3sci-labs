import test from 'node:test';
import assert from 'node:assert/strict';
import { settleStreak, streakMultiplier } from './cityStreak.js';
const clean = {countryCorrect:true,cityCorrect:true,wrongAttempts:0,hinted:false,cityPoints:10};
test('two and four clean locations unlock capped city multipliers',()=>{
  assert.deepEqual([0,1,2,3,4,20].map(streakMultiplier),[1,1,1.5,1.5,2,2]);
  let streak=0,total=0;
  for(let i=0;i<10;i++){const result=settleStreak(streak,clean);streak=result.streak;total+=25+result.bonus;}
  assert.equal(streak,10);assert.equal(total,320);
});
test('hints hold a successful streak without giving a bonus',()=>{
  assert.deepEqual(settleStreak(4,{...clean,hinted:true,cityPoints:7}),{streak:4,bonus:0});
});
test('incorrect country, city, retry, or skip breaks the streak',()=>{
  for(const failure of [{countryCorrect:false},{cityCorrect:false},{wrongAttempts:1}])
    assert.deepEqual(settleStreak(4,{...clean,...failure}),{streak:0,bonus:0});
});
