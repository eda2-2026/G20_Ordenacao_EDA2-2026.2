'use strict';

var path = require('node:path');
var performance = require('node:perf_hooks').performance;
var MergeSort = require(path.join(__dirname, '..', 'js', 'mergesort'));

function bruteInversions(values) {
  var count = 0;
  for (var i = 0; i < values.length; i += 1) {
    for (var j = i + 1; j < values.length; j += 1) {
      if (values[i] > values[j]) count += 1;
    }
  }
  return count;
}

function dataSet(size) {
  var values = new Array(size);
  var state = 0x12345678;
  for (var i = 0; i < size; i += 1) {
    state = (1664525 * state + 1013904223) >>> 0;
    values[i] = state;
  }
  return values;
}

function measure(label, fn) {
  var start = performance.now();
  var inversions = fn();
  return { label: label, milliseconds: performance.now() - start, inversions: inversions };
}

var sizes = [1000, 2000, 5000, 10000, 20000];
var bruteForceLimit = 2000;
var rows = [];

sizes.forEach(function (size) {
  var values = dataSet(size);
  var merge = measure('Merge', function () {
    return MergeSort.countInversions(values);
  });
  var brute = size <= bruteForceLimit ? measure('Força bruta', function () {
    return bruteInversions(values);
  }) : null;
  rows.push({ size: size, merge: merge, brute: brute });
});

console.log('Benchmark de contagem de inversões (dados determinísticos)');
console.log('n     | Merge ms   | força-bruta ms    | razão (força-bruta/Merge)');
console.log('------|------------|-------------------|--------------------');
rows.forEach(function (row) {
  var bruteMilliseconds = row.brute === null ? 'limited/not run' :
    row.brute.milliseconds.toFixed(3);
  var ratio = row.brute === null ? 'limited/not run' :
    (row.brute.milliseconds / row.merge.milliseconds).toFixed(2) + 'x';
  console.log(String(row.size).padStart(5) + ' | ' + row.merge.milliseconds.toFixed(3).padStart(10) +
    ' | ' + bruteMilliseconds.padStart(16) + ' | ' + ratio.padStart(19));
});
console.log('\nForça bruta limitada a n=' + bruteForceLimit +
  ' para manter o custo seguro; Merge testado até n=20000.');
