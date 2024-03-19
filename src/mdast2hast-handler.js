/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { CONTINUE, SKIP, visit } from 'unist-util-visit';
import {
  TYPE_BODY, TYPE_CELL, TYPE_FOOTER, TYPE_HEADER, TYPE_ROW,
} from './types.js';

/**
 * @typedef GridTableHandlerOptions
 * @property {boolean} noHeader if true, <thead> and <tbody> elements are suppressed.
 */

/**
 * Handles a row (i.e. the `gtRow` node)
 * @return {HastNode} the 'tr' node
 */
function handleRow(state, node, cellElementName) {
  const cells = [];
  for (const child of node.children) {
    if (child.type === TYPE_CELL) {
      const properties = {};
      for (const p of ['colSpan', 'rowSpan', 'align', 'valign']) {
        if (p in child) {
          properties[p] = child[p];
        }
      }
      // if cell contains only 1 single paragraph, unwrap it
      if (child.children?.length === 1 && child.children[0].type === 'paragraph') {
        child.children = child.children[0].children;
      }
      const cell = {
        type: 'element',
        tagName: cellElementName,
        properties,
        children: state.all(child),
      };
      state.patch(child, cell);
      cells.push(cell);

      // clean text elements
      visit(cell, (n) => {
        if (n.tagName === 'code') {
          return SKIP;
        }
        if (n.type === 'text') {
          // eslint-disable-next-line no-param-reassign
          n.value = n.value.replace(/\r?\n/mg, ' ');
        }
        return CONTINUE;
      });
    }
  }

  const result = /** @type HastNode */ {
    type: 'element',
    tagName: 'tr',
    children: cells,
    properties: {},
  };
  state.patch(node, result);
  return result;
}

/**
 * Handles a group (array) of rows. eg the children of a `gtBody`.
 * @return {HastNode[]} the array of rows
 */
function createRows(state, node, cellElementName) {
  const rows = [];
  for (const child of node.children) {
    if (child.type === TYPE_ROW) {
      rows.push(handleRow(state, child, cellElementName));
    }
  }
  return rows;
}

/**
 * Transforms the gridTable to a hast table
 *
 * @param {GridTableHandlerOptions} opts
 * @return {function} A mdast-to-hast handler.
 */
export default function gridTableHandler(opts = {}) {
  const { noHeader } = opts;

  return function handleTable(state, node) {
    let headerRows = [];
    let bodyRows = [];
    let footerRows = [];

    for (const child of node.children) {
      if (child.type === TYPE_HEADER) {
        headerRows = createRows(state, child, 'th');
      } else if (child.type === TYPE_BODY) {
        bodyRows = createRows(state, child, 'td');
      } else if (child.type === TYPE_FOOTER) {
        footerRows = createRows(state, child, 'td');
      } else if (child.type === TYPE_ROW) {
        bodyRows.push(handleRow(state, child, 'td'));
      }
    }

    let inner;
    if (noHeader && footerRows.length === 0) {
      inner = [...headerRows, ...bodyRows];
    } else {
      inner = [];
      if (headerRows.length) {
        inner.push({
          type: 'element',
          tagName: 'thead',
          children: headerRows,
          properties: {},
        });
      }
      if (bodyRows.length) {
        inner.push({
          type: 'element',
          tagName: 'tbody',
          children: bodyRows,
          properties: {},
        });
      }
      if (footerRows.length) {
        inner.push({
          type: 'element',
          tagName: 'tfoot',
          children: footerRows,
          properties: {},
        });
      }
    }

    const result = /** @type HastNode */ {
      type: 'element',
      tagName: 'table',
      children: inner,
      properties: {},
    };
    state.patch(node, result);
    return result;
  };
}
