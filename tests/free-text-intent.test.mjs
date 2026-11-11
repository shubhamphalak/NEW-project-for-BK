import assert from 'node:assert/strict';
import test from 'node:test';
import {understandFreeTextJourney} from '../src/personalized-journeys.js';

test('understands free-text life goals',()=>{
  assert.deepEqual(understandFreeTextJourney('I want to protect my family'),{type:'life',goal:'protect',preference:'browse'});
  assert.deepEqual(understandFreeTextJourney("Show me education plans for my children's future"),{type:'life',goal:'education',preference:'browse'});
  assert.deepEqual(understandFreeTextJourney('Find the best life insurance savings and investment plan'),{type:'life',goal:'combined',preference:'best'});
});

test('uses journey context for short follow-up questions',()=>{
  assert.deepEqual(understandFreeTextJourney('Which one is the top seller?',{category:'life',stage:'catalogue',lifeGoal:'education'}),{type:'life',goal:'education',preference:'seller'});
  assert.deepEqual(understandFreeTextJourney('Show the lowest premium options',{category:'life',stage:'recommendations',lifeGoal:'protect'}),{type:'life',goal:'protect',preference:'value'});
});

test('routes motor and renewal without confusing unrelated chat',()=>{
  assert.deepEqual(understandFreeTextJourney('I need car insurance'),{type:'motor'});
  assert.deepEqual(understandFreeTextJourney('I want to renew my policy'),{type:'renewal'});
  assert.equal(understandFreeTextJourney('What is insurance?'),null);
  assert.equal(understandFreeTextJourney('I bought a new SUV in Riyadh. Explain motor insurance generally.'),null);
  assert.equal(understandFreeTextJourney("I don't want life insurance plans"),null);
});
