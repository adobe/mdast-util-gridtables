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
/* eslint-disable no-unused-vars,no-param-reassign */
import { defaultHandlers } from 'mdast-util-to-markdown';
import {
  TYPE_BODY, TYPE_CELL, TYPE_HEADER, TYPE_FOOTER, TYPE_ROW, TYPE_TABLE,
} from './types.js';
import sanitizeBreaks, { PHRASING_TYPES } from './mdast-clean-breaks.js';

const {
  text: textHandler,
  inlineCode,
  code,
} = defaultHandlers;

function* distribute(size, times) {
  const delta = size / times;
  let len = delta;
  let prevLen = 0;
  for (let i = 0; i < times - 1; i += 1) {
    yield [Math.round(len - prevLen), i];
    prevLen = Math.round(len);
    len += delta;
  }
  yield [Math.round(size - prevLen), times - 1];
}

function spanWidth(cols, idx, cell) {
  let width = 0;
  for (let i = 0; i < cell.colSpan; i += 1) {
    width += cols[idx + i].width;
  }
  return width;
}

export function lineWrapTextHandler(node, parent, context, safeOptions) {
  const textNode = {
    ...node,
    value: node.value.replace(/[ \t\v\r\n]/g, ' '),
  };
  let value = textHandler(textNode, parent, context, safeOptions);
  const { lineWidth } = context.options;
  if (lineWidth && value.length > lineWidth) {
    // check if in heading
    if (context.stack.includes('headingAtx')) {
      return value;
    }
    const lines = [];
    const words = value.split(' ');
    let len = safeOptions.now.column - 1;
    let line = [];
    for (let word of words) {
      const wordLen = word.length;
      if (len + wordLen > lineWidth && line.length > 0) {
        lines.push(line.join(' '));
        line = [];
        len = 0;
      }
      // escape the dot if the line-start looks like an ordered list
      if (line.length === 0 && word.match(/^\d+\./)) {
        word = word.replace('.', '\\.');
      }
      // escape the hyphen if the line-start looks like a list
      if (line.length === 0 && word === '-') {
        word = '\\-';
      }
      line.push(word);
      len += wordLen + 1;
    }
    if (line.length) {
      lines.push(line.join(' '));
    }
    value = lines.join('\n');
  }
  return value;
}
// don't wrap for peek operations
lineWrapTextHandler.peek = textHandler;

class Table {
  constructor() {
    Object.assign(this, {
      lastRow: null,
      rows: [],
      headerSize: 0,
      footerSize: 0,
      opts: {
        // default desired width of a table (including delimiters)
        width: 120,
        // minimum cell content width (excluding delimiters)
        minCellWidth: 12,
      },
    });
  }

  addHeaderRow(row) {
    this.addRow(row, this.headerSize);
    this.headerSize += 1;
  }

  addRow(cells, idx = this.rows.length - this.footerSize) {
    const row = {
      height: 0,
      cells: [],
    };
    this.rows.splice(idx, 0, row);
    this.lastRow = this.rows[this.rows.length - 1];
    for (const cell of cells) {
      this.addCell(cell, row);
    }
  }

  addFooterRow(row) {
    this.addRow(row, this.rows.length);
    this.footerSize += 1;
  }

  addCell(cell, row) {
    if (!this.lastRow) {
      this.lastRow = {
        height: 0,
        cells: [],
      };
      this.rows.push(this.lastRow);
    }
    row = row || this.lastRow;
    row.cells.push(cell);
    for (let i = 1; i < cell.colSpan; i += 1) {
      row.cells.push({
        align: cell.align,
      });
    }
  }

  renderCell(cell, state, maxWidth) {
    // set line wrap to width
    const oldWidth = state.options.lineWidth;
    // it's easier to calculate in the padding (+2) and border (+1) here than everywhere else.
    // so the column width is equal to the cell.width
    state.options.lineWidth = maxWidth - 3;
    state.options.minLineWidth = this.opts.minCellWidth;

    // enter cell construct in order to escape unsafe characters
    const exit = state.enter(TYPE_CELL);
    const subexit = state.enter('phrasing');

    // should probably create a clone and not alter the original mdast
    sanitizeBreaks(cell.tree);

    // if the cell only contains phrasing nodes, wrap with a paragraph
    if (cell.tree.children.every((n) => PHRASING_TYPES[n.type])) {
      cell.tree.children = [{
        type: 'paragraph',
        children: cell.tree.children,
      }];
    }

    const lines = state.containerFlow(cell.tree, {
      before: '\n',
      after: '\n',
      now: { line: 1, column: 1 },
      lineShift: 0,
    }).split('\n');

    // reset bullet state
    delete state.bulletLastUsed;

    subexit();
    exit();

    state.options.lineWidth = oldWidth;
    cell.lines = lines;
    cell.height = lines.length;
    cell.width = 0;

    // calculate actual width and height of cell and transform the tab stops correctly
    const TABS = [
      '    ',
      '   ',
      '  ',
      ' ',
    ];
    for (let i = 0; i < lines.length; i += 1) {
      let line = lines[i];
      let idx = line.indexOf('\t');
      if (idx >= 0) {
        do {
          // adjust tabstops
          line = line.substring(0, idx) + TABS[idx % 4] + line.substring(idx + 1);
          idx = line.indexOf('\t', idx + 1);
        } while (idx >= 0);
        lines[i] = line;
      }
      cell.width = Math.max(cell.width, line.length);
    }

    cell.value = lines.join('\n');
    cell.width += 3;
    return cell;
  }

  toMarkdown(context) {
    // populate the matrix with the rowspans and compute max width
    // (the empty cells for the colspans are already created during insert).
    let realNumCols = 0;
    const cols = [];
    for (let y = 0; y < this.rows.length; y += 1) {
      const row = this.rows[y];
      for (let x = 0; x < row.cells.length; x += 1) {
        let col = cols[x];
        if (!col) {
          col = {
            width: 3,
          };
          cols[x] = col;
        }
        const cell = row.cells[x];
        if (cell.tree) {
          realNumCols = Math.max(realNumCols, x + 1);
        }
        if (cell.rowSpan > 1) {
          // insert colspan amount of null cells below
          for (let i = 1; i < cell.rowSpan; i += 1) {
            const yy = i + y;
            // create empty linked cells for the rows, so that it can render the lines correctly.
            const empty = new Array(cell.colSpan).fill({});
            empty[0] = { linked: cell };
            this.rows[yy].cells.splice(x, 0, ...empty);
          }
        }
      }
    }

    // now trim tailing colspans
    if (cols.length > realNumCols) {
      cols.length = realNumCols;
      for (const { cells } of this.rows) {
        if (cells.length > realNumCols) {
          cells.length = realNumCols;
          // find trailing colspan
          let x = cells.length - 1;
          while (x >= 0 && !cells[x].tree) {
            x -= 1;
          }
          if (x >= 0) {
            cells[x].colSpan = realNumCols - x;
          }
        }
      }
    }

    // stop processing if no columns found
    if (cols.length === 0) {
      return '';
    }

    const numCols = cols.length;

    // add empty cells if needed
    for (const row of this.rows) {
      for (let i = row.cells.length; i < numCols; i += 1) {
        row.cells.push({ tree: { type: 'root', children: [] }, colSpan: 1, rowSpan: 1 });
      }
    }

    // populate the columns with default max widths
    for (const [d, idx] of distribute(this.opts.width, numCols)) {
      cols[idx].maxWidth = d;
    }

    // render cells
    for (const row of this.rows) {
      for (let x = 0; x < row.cells.length; x += 1) {
        const cell = row.cells[x];
        if (cell.tree) {
          // get the max width from the columns it spans
          let maxWidth = 0;
          for (let i = 0; i < cell.colSpan; i += 1) {
            maxWidth += cols[x + i].maxWidth;
          }
          this.renderCell(cell, context, maxWidth);
          // distribute effective cell.width among the columns it spans
          for (const [avgColWidth, idx] of distribute(cell.width, cell.colSpan)) {
            const col = cols[x + idx];
            col.width = Math.max(col.width, avgColWidth);
          }
          // if valign, the col needs to be at least 4 (3 + delim) wide
          if (cell.valign) {
            cols[x].width = Math.max(4, cols[x].width);
          }
        }
      }
    }
    // re-render cells where elements dictated the min-width (eg, large headings)
    for (const row of this.rows) {
      row.minHeight = 0;
      row.height = 0;
      for (let x = 0; x < row.cells.length; x += 1) {
        const cell = row.cells[x];
        if (cell.tree) {
          // get the max width from the columns it spans
          const width = spanWidth(cols, x, cell);
          if (width >= cell.width) {
            this.renderCell(cell, context, width);
            // if the new cell width is bigger now (most probably due to a problem in the line
            // break renderer), fix the columns.
            if (cell.width > width) {
              for (const [avgColWidth, idx] of distribute(cell.width, cell.colSpan)) {
                const col = cols[x + idx];
                col.width = Math.max(col.width, avgColWidth);
              }
            } else {
              cell.width = width;
            }
          }
          if (cell.rowSpan === 1) {
            row.height = Math.max(row.height, cell.height);
          }
        }
      }
    }

    // distribute row spans
    for (let y = 0; y < this.rows.length; y += 1) {
      const row = this.rows[y];
      for (let x = 0; x < row.cells.length; x += 1) {
        const cell = row.cells[x];
        if (cell.rowSpan > 1) {
          const distHeight = Math.max(cell.rowSpan, cell.height - cell.rowSpan + 1);
          for (const [d, idx] of distribute(distHeight, cell.rowSpan)) {
            this.rows[y + idx].height = Math.max(this.rows[y + idx].height, d);
          }
        }
      }
    }

    // create grid and table
    const gtVLineEnds = '+';
    const gtHLineEnds = '+';
    const align = {
      left: { b: ':', e: '', len: 1 },
      right: { b: '', e: ':', len: 1 },
      center: { b: ':', e: ':', len: 2 },
      justify: { b: '>', e: '<', len: 2 },
      top: '^',
      bottom: 'v',
      middle: 'x',
    };
    const lines = [];
    // eslint-disable-next-line no-nested-ternary
    const headerIdx = this.headerSize
      ? this.headerSize
      : (this.footerSize ? 0 : -1);
    const footerIdx = this.rows.length - this.footerSize;
    for (let y = 0; y < this.rows.length; y += 1) {
      const row = this.rows[y];

      // first, draw the grid line
      const grid = [];
      const c = y === headerIdx || y === footerIdx ? '=' : '-';
      let prevCell;
      let pendingGrid = 0;
      let pendingAlign = null;
      let pendingVAlign = null;

      const commitInnerGridLine = () => {
        if (pendingVAlign) {
          const middle = Math.floor((pendingGrid - 1) / 2);
          grid.push(c.repeat(middle));
          grid.push(pendingVAlign);
          grid.push(c.repeat(pendingGrid - middle - 1));
        } else {
          grid.push(c.repeat(pendingGrid));
        }
      };

      const commitGridLine = () => {
        if (pendingGrid) {
          if (pendingAlign) {
            pendingGrid -= pendingAlign.len;
            grid.push(pendingAlign.b);
            commitInnerGridLine();
            grid.push(pendingAlign.e);
          } else {
            commitInnerGridLine();
          }
          pendingGrid = 0;
        }
      };

      for (let x = 0; x < row.cells.length; x += 1) {
        let d0 = '+';
        if (x === 0 && y > 0) {
          d0 = gtHLineEnds;
        }
        if (y === 0 && x > 0) {
          d0 = gtVLineEnds;
        }
        const cell = row.cells[x];
        const col = cols[x];
        if (cell.tree) {
          commitGridLine();
          grid.push(d0);
          pendingGrid = col.width - 1;
          pendingAlign = align[cell.align];
          pendingVAlign = align[cell.valign];
        } else if (cell.linked) {
          commitGridLine();
          const width = spanWidth(cols, x, cell.linked);
          const text = cell.linked.lines.shift() || '';
          grid.push(`| ${text.padEnd(width - 3, ' ')} `);
          x += cell.linked.colSpan - 1;
        } else {
          pendingGrid += col.width;
        }
        prevCell = cell;
      }
      commitGridLine();

      // if last col was a rowspan, draw a |
      let d3 = prevCell?.linked ? '|' : gtHLineEnds;
      if (y === 0) {
        d3 = '+';
      }
      lines.push(`${grid.join('')}${d3}`);

      // then draw the cells
      for (let yy = 0; yy < row.height; yy += 1) {
        const line = [];
        for (let x = 0; x < row.cells.length; x += 1) {
          let cell = row.cells[x];
          if (cell.linked) {
            cell = cell.linked;
          }
          if (cell.tree) {
            const width = spanWidth(cols, x, cell);
            let text = '';
            if (!cell.valign
              || cell.valign === 'top'
              || (cell.valign === 'middle' && yy >= Math.floor(row.height - cell.height) / 2)
              || (cell.valign === 'bottom' && yy >= row.height - cell.height)) {
              text = cell.lines.shift() || '';
            }
            line.push(`| ${text.padEnd(width - 3, ' ')} `);
          }
        }
        lines.push(`${line.join('')}|`);
      }
    }

    // add last grid line
    const d = this.rows.length === this.headerSize ? '=' : '-'; // special case: only header
    const grid = [];
    const lastRow = this.rows[this.rows.length - 1];
    for (let x = 0; x < cols.length; x += 1) {
      const col = cols[x];
      // if the cell above was a colspan, and we are on the last line, don't draw the `+`
      const aboveCell = lastRow.cells[x];
      let c = aboveCell.tree || aboveCell.linked ? gtVLineEnds : d;
      if (x === 0) {
        c = '+';
      }
      grid.push(`${c}${d.repeat(col.width - 1)}`);
    }
    lines.push(`${grid.join('')}+`);

    return lines.join('\n');
  }
}

function pushTable(context, table) {
  if (!context.gridTables) {
    context.gridTables = [];
  }
  context.gridTables.push(table);
  return table;
}

function popTable(context) {
  return context.gridTables.pop();
}

function peekTable(context) {
  return context.gridTables[context.gridTables.length - 1];
}

function handleCell(node, parent, context, safeOptions) {
  return {
    tree: {
      type: 'root',
      children: node.children,
    },
    colSpan: node.colSpan || 1,
    rowSpan: node.rowSpan || 1,
    align: node.align,
    valign: node.valign,
  };
}

function handleRow(node, parent, context, safeOptions) {
  const row = [];
  for (const child of node.children) {
    if (child.type === TYPE_CELL) {
      row.push(handleCell(child, node, context, safeOptions));
    }
  }
  return row;
}

function handleHeader(node, parent, context, safeOptions) {
  const table = peekTable(context);
  for (const child of node.children) {
    if (child.type === TYPE_ROW) {
      table.addHeaderRow(handleRow(child, node, context, safeOptions));
    }
  }
}

function handleBody(node, parent, context, safeOptions) {
  const table = peekTable(context);
  for (const child of node.children) {
    if (child.type === TYPE_ROW) {
      table.addRow(handleRow(child, node, context, safeOptions));
    }
  }
}

function handleFooter(node, parent, context, safeOptions) {
  const table = peekTable(context);
  for (const child of node.children) {
    if (child.type === TYPE_ROW) {
      table.addFooterRow(handleRow(child, node, context, safeOptions));
    }
  }
}

function gridTable(node, parent, context, safeOptions) {
  const exit = context.enter(TYPE_TABLE);

  const table = pushTable(context, new Table());

  for (const child of node.children) {
    if (child.type === TYPE_HEADER) {
      handleHeader(child, node, context, safeOptions);
    } else if (child.type === TYPE_BODY) {
      handleBody(child, node, context, safeOptions);
    } else if (child.type === TYPE_FOOTER) {
      handleFooter(child, node, context, safeOptions);
    } else if (child.type === TYPE_ROW) {
      table.addRow(handleRow(child, node, context, safeOptions));
    } else if (child.type === TYPE_CELL) {
      table.addCell(handleCell(child, node, context, safeOptions));
    }
  }

  exit();

  return popTable(context).toMarkdown(context);
}

/**
 * Escapes cell delimiters in (block)) code
 */
function blockCodeWithTable(node, parent, context) {
  let value = code(node, parent, context);

  if (context.stack.includes(TYPE_CELL)) {
    value = value.replace(/[|+]/mg, '\\$&');

    // break code if wider than lineWidth or 256 chars, but at least 150
    const lineWidth = Math.min(256, Math.max(150, context.options.lineWidth));
    if (value.length > lineWidth) {
      // iterate over lines and break if needed
      const lines = [];
      for (let line of value.split('\n')) {
        while (line.length > lineWidth) {
          lines.push(`${line.substring(0, lineWidth)}\u0083`);
          line = line.substring(lineWidth);
        }
        lines.push(line);
      }
      value = lines.join('\n');
    }
  }
  return value;
}

// don't wrap for peek operations
blockCodeWithTable.peek = code;

/**
 * Escapes cell delimiters in inline code
 */
function inlineCodeWithTable(node, parent, context) {
  let value = inlineCode(node, parent, context);

  if (context.stack.includes(TYPE_CELL)) {
    value = value.replace(/[|+]/g, '\\$&');
  }

  return value;
}

export function gridTablesToMarkdown() {
  return {
    unsafe: [
      // A pipe or a + in a cell must be encoded.
      { character: '|', inConstruct: TYPE_CELL },
      { character: '+', inConstruct: TYPE_CELL },
    ],
    handlers: {
      // for now, we only line wrap 'text' nodes. all other would need more support in
      // the default mdast-to-markdown handlers
      text: lineWrapTextHandler,
      gridTable,
      inlineCode: inlineCodeWithTable,
      code: blockCodeWithTable,
    },
  };
}
