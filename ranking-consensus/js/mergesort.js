(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MergeSort = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function assertArray(array) {
    if (!Array.isArray(array)) {
      throw new TypeError('Expected an array');
    }
  }

  function merge(left, right, target) {
    var leftIndex = 0;
    var rightIndex = 0;
    var targetIndex = 0;
    var inversions = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      // Taking the left value on equality keeps equal values stable and,
      // importantly, means equal values are not counted as inversions.
      if (left[leftIndex] <= right[rightIndex]) {
        target[targetIndex] = left[leftIndex];
        leftIndex += 1;
      } else {
        target[targetIndex] = right[rightIndex];
        rightIndex += 1;
        inversions += left.length - leftIndex;
      }
      targetIndex += 1;
    }

    while (leftIndex < left.length) {
      target[targetIndex] = left[leftIndex];
      leftIndex += 1;
      targetIndex += 1;
    }

    while (rightIndex < right.length) {
      target[targetIndex] = right[rightIndex];
      rightIndex += 1;
      targetIndex += 1;
    }

    return inversions;
  }

  function sortAndCount(array) {
    if (array.length < 2) {
      return { values: array.slice(), inversions: 0 };
    }

    var middle = Math.floor(array.length / 2);
    var left = sortAndCount(array.slice(0, middle));
    var right = sortAndCount(array.slice(middle));
    var values = new Array(array.length);
    var splitInversions = merge(left.values, right.values, values);

    return {
      values: values,
      inversions: left.inversions + right.inversions + splitInversions
    };
  }

  function mergeSort(array) {
    assertArray(array);
    return sortAndCount(array).values;
  }

  function countInversions(array) {
    assertArray(array);
    return sortAndCount(array).inversions;
  }

  return {
    mergeSort: mergeSort,
    countInversions: countInversions
  };
}));
