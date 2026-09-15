(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.IncrementalTbodyRenderHotfix = api;
    if (root.document) api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const BASE_CELL_CLASSES = Object.freeze(['rank', 'user', 'comment', 'up', 'time', 'link']);
  const ROW_CACHE_LIMIT = 1000;

  function detailKey(commentNo, userId) {
    return `${String(commentNo || '').trim()}:${String(userId || '').trim().toLowerCase()}`;
  }

  function diffBaseCells(previous, next) {
    const before = previous || {};
    const after = next || {};
    return BASE_CELL_CLASSES.filter(name => String(before[name] ?? '') !== String(after[name] ?? ''));
  }

  function shouldSkipAssignment(previousHtml, nextHtml) {
    return previousHtml !== null && String(previousHtml) === String(nextHtml);
  }

  function findDescriptor(proto, name) {
    let current = proto;
    while (current) {
      const descriptor = Object.getOwnPropertyDescriptor(current, name);
      if (descriptor) return descriptor;
      current = Object.getPrototypeOf(current);
    }
    return null;
  }

  function install(win) {
    const doc = win?.document;
    const tbody = doc?.getElementById?.('tbody');
    if (!doc || !tbody || win.__justserverIncrementalTbodyInstalled) return false;

    const descriptor = findDescriptor(win.Element?.prototype || Object.getPrototypeOf(tbody), 'innerHTML');
    if (!descriptor?.get || !descriptor?.set) return false;

    win.__justserverIncrementalTbodyInstalled = true;
    const nativeGet = node => descriptor.get.call(node);
    const nativeSet = (node, value) => descriptor.set.call(node, String(value ?? ''));
    const rowState = new WeakMap();
    const rowCache = new Map();
    let lastAssignedHtml = null;

    const stats = {
      assignments: 0,
      skippedAssignments: 0,
      patchedCells: 0,
      reusedRows: 0,
      createdRows: 0,
      fullReplacements: 0
    };
    win.__justserverIncrementalRenderStats = stats;

    function directCell(row, className) {
      return Array.from(row?.children || []).find(cell =>
        cell?.tagName === 'TD' && cell.classList?.contains(className)
      ) || null;
    }

    function rowKey(row) {
      const trigger = row?.querySelector?.('.detail-trigger[data-detail-comment][data-detail-user]');
      if (!trigger) return '';
      return detailKey(trigger.dataset.detailComment, trigger.dataset.detailUser);
    }

    function captureBaseState(row) {
      const state = {};
      for (const name of BASE_CELL_CLASSES) {
        const cell = directCell(row, name);
        state[name] = cell ? nativeGet(cell) : '';
      }
      state.dataRank = String(row?.dataset?.rank || '');
      return state;
    }

    function rememberRow(key, row) {
      if (!key || !row) return;
      if (rowCache.has(key)) rowCache.delete(key);
      rowCache.set(key, row);
      while (rowCache.size > ROW_CACHE_LIMIT) rowCache.delete(rowCache.keys().next().value);
    }

    function seedRows() {
      for (const row of Array.from(tbody.children || [])) {
        if (!row.matches?.('tr[data-rank]')) continue;
        const key = rowKey(row);
        if (!key) continue;
        rowState.set(row, captureBaseState(row));
        rememberRow(key, row);
      }
    }

    function patchRow(current, desired) {
      const nextState = captureBaseState(desired);
      const previousState = rowState.get(current);
      if (!previousState) {
        rowState.set(current, nextState);
        return false;
      }

      let changed = false;
      const nextRank = String(desired.dataset?.rank || '');
      if (String(current.dataset?.rank || '') !== nextRank) {
        current.dataset.rank = nextRank;
        changed = true;
      }

      for (const name of diffBaseCells(previousState, nextState)) {
        const currentCell = directCell(current, name);
        const desiredCell = directCell(desired, name);
        if (!currentCell || !desiredCell) return null;
        nativeSet(currentCell, nextState[name]);
        stats.patchedCells += 1;
        changed = true;
      }
      rowState.set(current, nextState);
      return changed;
    }

    function parseRows(html) {
      const scratch = doc.createElement('tbody');
      nativeSet(scratch, html);
      return Array.from(scratch.children || []).filter(node => node.tagName === 'TR');
    }

    function nativeReplace(html) {
      nativeSet(tbody, html);
      stats.fullReplacements += 1;
      seedRows();
    }

    function applyIncremental(html) {
      stats.assignments += 1;
      const nextHtml = String(html ?? '');
      if (shouldSkipAssignment(lastAssignedHtml, nextHtml)) {
        stats.skippedAssignments += 1;
        return;
      }

      const desiredRows = parseRows(nextHtml);
      const desiredDataRows = desiredRows.filter(row => row.matches?.('tr[data-rank]'));
      const currentDataRows = Array.from(tbody.children || []).filter(row => row.matches?.('tr[data-rank]'));

      if (!desiredDataRows.length || !currentDataRows.length) {
        nativeReplace(nextHtml);
        lastAssignedHtml = nextHtml;
        return;
      }

      const currentByKey = new Map();
      for (const row of currentDataRows) {
        const key = rowKey(row);
        if (key) {
          currentByKey.set(key, row);
          rememberRow(key, row);
        }
      }

      const desiredNodes = [];
      for (const desired of desiredRows) {
        if (!desired.matches?.('tr[data-rank]')) {
          desiredNodes.push(desired);
          continue;
        }

        const key = rowKey(desired);
        let row = key ? (currentByKey.get(key) || rowCache.get(key)) : null;
        if (row) {
          const patched = patchRow(row, desired);
          if (patched === null) row = null;
        }
        if (!row) {
          row = desired;
          rowState.set(row, captureBaseState(row));
          stats.createdRows += 1;
        } else {
          stats.reusedRows += 1;
        }
        if (key) rememberRow(key, row);
        desiredNodes.push(row);
      }

      const desiredSet = new Set(desiredNodes);
      for (let index = 0; index < desiredNodes.length; index += 1) {
        const node = desiredNodes[index];
        const current = tbody.children[index] || null;
        if (current !== node) tbody.insertBefore(node, current);
      }
      for (const child of Array.from(tbody.children || [])) {
        if (!desiredSet.has(child)) child.remove();
      }
      lastAssignedHtml = nextHtml;
    }

    Object.defineProperty(tbody, 'innerHTML', {
      configurable: true,
      enumerable: false,
      get() { return nativeGet(tbody); },
      set(value) { applyIncremental(value); }
    });

    return true;
  }

  return {
    BASE_CELL_CLASSES,
    ROW_CACHE_LIMIT,
    detailKey,
    diffBaseCells,
    shouldSkipAssignment,
    install
  };
});
