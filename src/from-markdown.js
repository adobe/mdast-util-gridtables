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
/* eslint-disable no-underscore-dangle */
import { fromMarkdown } from 'mdast-util-from-markdown';
import { CONTINUE, visit } from 'unist-util-visit';
import { TYPE_ROW_LINE, TYPE_GRID_DIVIDER } from '@adobe/micromark-extension-gridtables';
import {
  TYPE_BODY, TYPE_CELL, TYPE_HEADER, TYPE_FOOTER, TYPE_ROW, TYPE_TABLE,
} from './types.js';

function unescapeCode(tree) {
  visit(tree, (node) => {
    if (node.type === 'inlineCode' || node.type === 'code') {
      // remove escaped pipes and plusses in code
      // eslint-disable-next-line no-param-reassign
      node.value = node.value.replace(/\\([+|])/gm, '$1');
    }
    if (node.type === 'code') {
      // remove non-break-here characters
      // eslint-disable-next-line no-param-reassign
      node.value = node.value.replace(/\u0083 ?\n/ugm, '');
    }

    return CONTINUE;
  });
}

function multiline(lines) {
  // remove empty trailing lines
  while (lines.length > 0 && lines[lines.length - 1].match(/^\s*$/)) {
    lines.pop();
  }

  // calculate common indent
  const prefixLen = lines
    .filter((line) => !line.match(/^\s*$/))
    .map((line) => line.match(/^ */)[0].length)
    .reduce((min, len) => Math.min(len, min), Infinity);

  // remove prefix
  return lines
    .map((line) => line.substring(prefixLen).trimEnd());
}

function getColSpan(info, token) {
  const i0 = info.cols.indexOf(token._colStart);
  const i1 = info.cols.indexOf(token._colEnd);
  return i1 - i0;
}

function enterTable(token) {
  this.enter({ type: TYPE_TABLE, children: [] }, token);
  this.data.tableInfo = {
    // the column positions of the table
    cols: token._cols,
    // the current column
    colPos: 0,
    // list of all cells
    allCells: [],
    // cells that are still open via rowSpan
    pendingCells: [],
    // the current cells of a row
    cells: [],
    // the grid dividers use for align the cells
    dividers: [],
    // the link/image reference definitions
    definitions: token._definitions,
  };
}

function createExitTable(options) {
  let { processor } = options;
  // create fake remark processor in case invoked recursively
  if (!processor) {
    processor = {
      data(key) {
        if (key === 'micromarkExtensions') {
          return options.extensions;
        }
        if (key === 'fromMarkdownExtensions') {
          return options.mdastExtensions;
        }
        /* c8 ignore next */
        return undefined;
      },
    };
  }

  return function exitTable(token) {
    // render cells
    const { tableInfo } = this.data;
    for (const cell of tableInfo.allCells) {
      const {
        node, lines, colSpan, rowSpan,
        align, valign,
      } = cell;

      const sanitizedLines = multiline(lines);

      // add fake definitions from the main document
      const fakeDefs = new Set();
      for (const def of tableInfo.definitions) {
        const key = `[${def.toLowerCase()}]`;
        if (lines.find((line) => line.indexOf(key) >= 0)) {
          sanitizedLines.push('');
          sanitizedLines.push(`[${def}]: dummy`);
          fakeDefs.add(def);
        }
      }
      const cellContent = sanitizedLines.join('\n');

      const tree = fromMarkdown(cellContent, {
        extensions: processor.data('micromarkExtensions'),
        mdastExtensions: processor.data('fromMarkdownExtensions'),
      });

      // remove previously added definitions
      for (let i = 0; i < tree.children.length; i += 1) {
        const child = tree.children[i];
        if (child.type === 'definition' && fakeDefs.has(child.label)) {
          tree.children.splice(i, 1);
          i -= 1;
        }
      }

      // remove escaped pipes and plusses in code
      unescapeCode(tree);

      node.children = tree.children;
      if (colSpan > 1) {
        node.colSpan = colSpan;
      }
      if (rowSpan > 1) {
        node.rowSpan = rowSpan;
      }
      if (align) {
        node.align = align;
      }
      if (valign) {
        node.valign = valign;
      }
    }
    this.exit(token);
  };
}

function enter(token) {
  this.enter({ type: token.type, children: [] }, token);
}

function enterCell() {
  this.buffer();
}

function exitCell(token) {
  this.config.enter.data.call(this, token);
  this.config.exit.data.call(this, token);
  const data = this.resume();
  const { tableInfo } = this.data;
  const colSpan = getColSpan(tableInfo, token);

  let cell = tableInfo.pendingCells[tableInfo.colPos];

  // open rowspan if we are on a divider line
  if (tableInfo.isDivider) {
    if (!cell) {
      cell = tableInfo.cells[tableInfo.colPos];
      tableInfo.pendingCells[tableInfo.colPos] = cell;
    }
    if (!cell) {
      // throw Error('no matching rowspan');
    } else {
      cell.rowSpan += 1;
    }
  }

  // if a rowspan is open, append to its cell
  if (cell) {
    cell.lines.push(data);
    tableInfo.colPos += colSpan;
    return;
  }

  // otherwise append to regular cell
  cell = tableInfo.cells[tableInfo.colPos];
  if (!cell) {
    const div = tableInfo.dividers[tableInfo.colPos];
    cell = {
      rowSpan: 1,
      colSpan,
      align: div?._align,
      valign: div?._valign,
      node: {
        type: TYPE_CELL,
      },
      lines: [],
    };
    tableInfo.cells[tableInfo.colPos] = cell;
    tableInfo.allCells.push(cell);
  }
  cell.lines.push(data);
  tableInfo.colPos += colSpan;
}

function enterGridDivider(token) {
  const { tableInfo } = this.data;
  // clear pending rowspans and set divider info
  let colSpan = getColSpan(tableInfo, token);
  while (colSpan > 0) {
    colSpan -= 1;
    tableInfo.pendingCells[tableInfo.colPos] = null;
    tableInfo.dividers[tableInfo.colPos] = token;
    tableInfo.colPos += 1;
  }
}

function enterRowLine(token) {
  const info = this.data.tableInfo;
  info.isDivider = token._type;
  info.colPos = 0;
  if (info.isDivider) {
    info.dividers = [];
  }
}

function commitRow(info) {
  // create fake token for 'gtRow'
  const rowToken = {
    type: TYPE_ROW,
    start: { line: 0, column: 0, offset: 0 },
    end: { line: 0, column: 0, offset: 0 },
  };
  this.enter({ type: TYPE_ROW, children: [] }, rowToken);

  // emit cells
  for (const cell of info.cells) {
    if (cell) {
      const cellToken = {
        type: TYPE_CELL,
        start: { line: 0, column: 0, offset: 0 },
        end: { line: 0, column: 0, offset: 0 },
      };
      this.enter(cell.node, cellToken);
      this.exit(cellToken);
    }
  }

  this.exit(rowToken);
  // eslint-disable-next-line no-param-reassign
  info.cells = [];
}

function exitHeader(token) {
  const { tableInfo } = this.data;
  // commit row  has some cells
  if (tableInfo.cells.length) {
    commitRow.call(this, tableInfo);
    // also close all rowspans.
    tableInfo.pendingCells = [];
  }
  this.exit(token);
}

function exitRowLine() {
  const { tableInfo } = this.data;
  // commit row if on a divider and has some cells
  if (tableInfo.isDivider && tableInfo.cells.length) {
    commitRow.call(this, tableInfo);
  }
}

export function gridTablesFromMarkdown(options = {}) {
  return {
    enter: {
      [TYPE_TABLE]: enterTable,
      [TYPE_HEADER]: enter,
      [TYPE_BODY]: enter,
      [TYPE_FOOTER]: enter,
      [TYPE_CELL]: enterCell,
      [TYPE_GRID_DIVIDER]: enterGridDivider,
      [TYPE_ROW_LINE]: enterRowLine,
    },
    exit: {
      [TYPE_TABLE]: createExitTable(options),
      [TYPE_HEADER]: exitHeader,
      [TYPE_BODY]: exitHeader,
      [TYPE_FOOTER]: exitHeader,
      [TYPE_CELL]: exitCell,
      [TYPE_ROW_LINE]: exitRowLine,
    },
  };
}
