'use strict';
const assert = require('node:assert/strict');
const M = require('./model.js');
const ref = require('./high_precision.json');
const keys = ['L','price','T','Q1','Q2','Q','CE','profit'];
const baseline=M.optimize(M.base), rows=M.sensitivity(M.base);
for(const k of keys) assert.equal(baseline[k].toFixed(4),ref.baseline[k].toFixed(4),`baseline ${k}`);
let comparisons=0,maxError=0;
for(const expected of ref.rows){
  const actual=rows.find(r=>r.parameter===expected.parameter&&r.change===expected.change);
  assert(actual);
  for(const k of keys){
    assert.equal(actual.pct[k].toFixed(4),expected.pct[k].toFixed(4),`${expected.parameter} ${expected.change} ${k}`);
    maxError=Math.max(maxError,Math.abs(actual.pct[k]-expected.pct[k]));comparisons++;
  }
}
assert.equal(comparisons,480);
console.log(JSON.stringify({status:'passed',scenarios:60,percentageComparisons:comparisons,decimalPlaces:4,maxPercentagePointError:maxError},null,2));
