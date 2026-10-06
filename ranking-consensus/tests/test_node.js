'use strict';

var assert = require('node:assert/strict');
var path = require('node:path');
var childProcess = require('node:child_process');

var MergeSort = require(path.join(__dirname, '..', 'js', 'mergesort'));
var Kendall = require(path.join(__dirname, '..', 'js', 'kendall'));

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('✓ ' + name);
  } catch (error) {
    failed += 1;
    console.error('✗ ' + name + ': ' + error.message);
  }
}

function bruteInversions(values) {
  var result = 0;
  for (var i = 0; i < values.length; i += 1) {
    for (var j = i + 1; j < values.length; j += 1) {
      if (values[i] > values[j]) result += 1;
    }
  }
  return result;
}

function bruteKendall(rankA, rankB) {
  var positions = new Map();
  rankB.forEach(function (item, index) { positions.set(item, index); });
  var order = rankA.map(function (item) { return positions.get(item); });
  var discordante = bruteInversions(order);
  var total = rankA.length < 2 ? 0 : rankA.length * (rankA.length - 1) / 2;
  return {
    tau: rankA.length < 2 ? null : (total - 2 * discordante) / total,
    concordante: total - discordante,
    discordante: discordante,
    total: total,
    n: rankA.length
  };
}

function permutations(values) {
  if (values.length < 2) return [values.slice()];
  var result = [];
  values.forEach(function (value, index) {
    var rest = values.slice(0, index).concat(values.slice(index + 1));
    permutations(rest).forEach(function (tail) {
      result.push([value].concat(tail));
    });
  });
  return result;
}

test('exports UMD modules through require with the documented API', function () {
  assert.equal(typeof MergeSort.mergeSort, 'function');
  assert.equal(typeof MergeSort.countInversions, 'function');
  assert.equal(typeof Kendall.kendallTau, 'function');
  assert.equal(typeof Kendall.validateRanking, 'function');
});

test('merge sort handles empty, singleton, sorted and reverse arrays without mutation', function () {
  [[].slice(), [1], [1, 2, 3], [3, 2, 1]].forEach(function (values) {
    var original = values.slice();
    assert.deepEqual(MergeSort.mergeSort(values), original.slice().sort(function (a, b) { return a - b; }));
    assert.deepEqual(values, original);
  });
  assert.equal(MergeSort.countInversions([]), 0);
  assert.equal(MergeSort.countInversions([1]), 0);
  assert.equal(MergeSort.countInversions([1, 2, 3]), 0);
  assert.equal(MergeSort.countInversions([3, 2, 1]), 3);
});

test('merge sort counts duplicates as non-inversions', function () {
  var values = [2, 1, 2, 1, 1];
  assert.equal(MergeSort.countInversions(values), bruteInversions(values));
  assert.deepEqual(MergeSort.mergeSort(values), [1, 1, 1, 2, 2]);
});

test('merge sort inversion count matches brute force for all permutations through n=7', function () {
  for (var n = 0; n <= 7; n += 1) {
    permutations(Array.from({ length: n }, function (_, index) { return index; })).forEach(function (values) {
      assert.equal(MergeSort.countInversions(values), bruteInversions(values));
    });
  }
});

test('Kendall Tau covers identical, opposite, independent and n < 2 rankings', function () {
  assert.deepEqual(Kendall.kendallTau([1, 2, 3], [1, 2, 3]), {
    tau: 1, concordante: 3, discordante: 0, total: 3, n: 3
  });
  assert.deepEqual(Kendall.kendallTau([1, 2, 3], [3, 2, 1]), {
    tau: -1, concordante: 0, discordante: 3, total: 3, n: 3
  });
  assert.deepEqual(Kendall.kendallTau([1, 2, 3, 4], [1, 3, 4, 2]), {
    tau: 1 / 3, concordante: 4, discordante: 2, total: 6, n: 4
  });
  assert.deepEqual(Kendall.kendallTau([], []), {
    tau: null, concordante: 0, discordante: 0, total: 0, n: 0
  });
  assert.deepEqual(Kendall.kendallTau(['only'], ['only']), {
    tau: null, concordante: 0, discordante: 0, total: 0, n: 1
  });
});

test('Kendall Tau matches direct oracle for all ranking permutations through n=6', function () {
  for (var n = 0; n <= 6; n += 1) {
    var base = Array.from({ length: n }, function (_, index) { return index; });
    permutations(base).forEach(function (rankA) {
      permutations(base).forEach(function (rankB) {
        assert.deepEqual(Kendall.kendallTau(rankA, rankB), bruteKendall(rankA, rankB));
      });
    });
  }
});

test('Kendall ranking validation rejects invalid inputs', function () {
  assert.throws(function () { Kendall.kendallTau('abc', []); }, TypeError);
  assert.throws(function () { Kendall.kendallTau([1], [1, 2]); }, RangeError);
  assert.throws(function () { Kendall.kendallTau([1, 1], [1, 1]); }, RangeError);
  assert.throws(function () { Kendall.kendallTau([1, 2], [1, 3]); }, RangeError);
});

if (process.argv.indexOf('--intentional-failure') === -1) {
  test('runner reports failures and returns a non-zero exit code', function () {
    var script = path.join(__dirname, 'test_node.js');
    var result = childProcess.spawnSync(process.execPath, [script, '--intentional-failure'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /falharam/);
  });
}

if (process.argv.indexOf('--intentional-failure') !== -1) {
  test('intentional runner failure probe', function () { assert.equal(1, 2); });
}

console.log('\n' + passed + ' passaram / ' + failed + ' falharam (' + (passed + failed) + ' testes)');
if (failed > 0) process.exitCode = 1;
