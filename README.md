# MDAST Util Gridtables

> Mdast utility that serializes gridtables to mdast and/or hast.

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/mdast-util-gridtables.svg)](https://codecov.io/gh/adobe/mdast-util-gridtables)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/adobe/mdast-util-gridtables/main.yaml)
[![GitHub license](https://img.shields.io/github/license/adobe/mdast-util-gridtables.svg)](https://github.com/adobe/mdast-util-gridtables/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/mdast-util-gridtables.svg)](https://github.com/adobe/mdast-util-gridtables/issues)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## What is this?

This package contains extensions that add support for the grid table syntax 
to [`mdast-util-from-markdown`][mdast-util-from-markdown] 
and [`mdast-util-to-markdown`][mdast-util-to-markdown].

## When to use this

These tools are all rather low-level.
In most cases, you’d want to use [`@adobe/remark-gridtables`][remark-gridtables] with remark instead.

When working with `mdast-util-from-markdown`, you must combine this package with
[`@adobe/micromark-extension-gridtables`][extension].

This utility does not handle how markdown is turned to HTML.
That’s done by [`mdast-util-to-hast`][mdast-util-to-hast].

## Install

This package is [ESM only][esm].
In Node.js (version 12.20+, 14.14+, or 16.0+), install with [npm][]:

```sh
npm install @adobe/mdast-util-gridtables
```

## Usage

Note: due to the architecture of the micromark parser, it is not possible to parse the cell contents
continuously. Furthermore, the to-markdown utility doesn't make its configuration available to
extensions, so we need to pass the configuration manually into the gridtables extension.

```js
import fs from 'node:fs/promises';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gridTables } from '@adobe/micromark-extension-gridtables'
import { 
  gridTablesToMarkdown, 
  gridTablesFromMarkdown, 
  mdast2hastGridTablesHandler,
  TYPE_TABLE,
} from '@adobe/mdast-util-gridtables';

const doc = await fs.readFile('example.md')

// convert markdown to mdast
const options = {
  extensions: [gridTables],
  mdastExtensions: [],
};
options.mdastExtensions.push(gridTablesFromMarkdown(options));
const tree = fromMarkdown(sourceMarkdown, options);

// convert mdast to md
const outputMarkdown = toMarkdown(tree, {extensions: [gridTablesToMarkdown()]})

// convert mdast to hast
const hast = mdast2hast(mdast, {
  handlers: {
    [TYPE_TABLE]: mdast2hastGridTablesHandler(),
  },
});
```

Also see a working [example](/example/index.js).

## Overview

GridTables look like this:

```
+-------------------+------+
| Table Headings    | Here |
+--------+----------+------+
| Sub    | Headings | Too  |
+========+=================+
| cell   | column spanning |
| spans  +---------:+------+
| rows   |   normal | cell |
+---v----+:---------------:+
|        | cells can be    |
|        | *formatted*     |
|        | **paragraphs**  |
|        | ```             |
| multi  | and contain     |
| line   | blocks          |
| cells  | ```             |
+========+=========<+======+
| footer |    cells |      |
+--------+----------+------+
```

- the top of a cell must be indicated by `+-` followed by some `-` or `+` and finished by `-+`.
- if the table contains a footer but no header, the top row should use `=` as grid line.
- col spans are indicated by missing column (`|`) delimiters
- row spans are indicated by missing row (`-`) delimiters
- cells can be left, center, right, or justify aligned; indicated by the placement of `:` or `><`
- cells can be top, middle, or bottom v-aligned; indicated by the placement of arrows (`v` `^` `x`)
- the header and footer sections are delimited by section delimiters (`=`).
- if no section delimiters are present, all cells are placed in the table body.
- if only 1 section delimiter is present, it delimits header from body.
- the content in cells can be a full Markdown document again. note, that the cell boundaries (`|`)
  need to exactly match with the column markers (`+`) in the row delimiters, if the cell content
  contains `|`, otherwise the correct layout of the table can't be guaranteed.

Layout
======

The table layout tries to keep the table within a certain width (default 120). For example,
if the table has 3 columns, each column will be max 40 characters wide. If all text in a column
is smaller, it will shrink the columns. However, cells have a minimum width (default 10) when
text needs to be broken. If the cell contents need more space, e.g. with a nested table or
code block, it will grow accordingly.

Align
=====

Horizontal align is indicated by placing markers at the grid line above the cell:

```
Justify     Center     Left       Right
+>-----<+  +:-----:+  +:------+  +------:+
| A b C |  |  ABC  |  | ABC   |  |   ABC |
+-------+  +-------+  +-------+  +-------+
```

Vertical align is indicated by placing markers at the center of the grid line above the cell:

```
Top        Middle     Bottom
+---^---+  +---x---+  +---v---+
| Larum |  |       |  |       |
| Ipsum |  | Larum |  |       |
|       |  | Ipsum |  | Larum |
|       |  |       |  | Ipsum |
+-------+  +-------+  +-------+
```

## Syntax

```ebfn

gridTable := gridLine cellLine+ gridLine;
gridLine := gridCell+ "+";
cellLine := ( gridCell | cellContent )+ ( "+" | "|" );   
gridCell := "+" alignMarkerStart? ("-" | "=")+ vAlignMarker? ("-" | "=")* alignMarkerEnd?;
cellContent := ( "+" | "|" ) " " content " " ;
alignMarkerStart := ":" | ">";
alignMarkerEnd   := ":" | "<";
vAlignMarker     := "^" | "v" | "x"
```

## MDAST Syntax tree

The following interfaces are added to **[mdast][]** by this utility.

### Nodes

#### `GridTable`

```idl
interface GridTable <: Parent {
  type: "gridTable"
  children: [GridTableHeader|GridTableBody|GridTableFooter]
}
```

#### `GridTableHeader`

```idl
interface GridTableHeader <: Parent {
  type: "gtHead"
  children: [GridTableRow]
}
```

#### `GridTableBody`

```idl
interface GridTableBody <: Parent {
  type: "gtBody"
  children: [GridTableRow]
}
```

#### `GridTableFoot`

```idl
interface GridTableFooter <: Parent {
  type: "gtFoot"
  children: [GridTableRow]
}
```

#### `GridTableRow`

```idl
interface GridTableRow <: Parent {
  type: "gtRow"
  children: [GridTableCell]
}
```

#### `GridTableCell`

```idl
interface GridTableCell <: Parent {
  type: "gtCell"
  colSpan: number >= 1
  rowSpan: number >= 1
  align: alignType
  valign: valignType
  children: [MdastContent]
}
```

**GridTableCell** ([**Parent**][dfn-parent]) represents a header cell in a
[**GridTable**][dfn-table], if its parent is a [*gridTableHead*][term-head], or a data
cell otherwise.

**GridTableCell** can be used where [**gridTableRow**][dfn-row-content] content is expected.
Its content model is [**mdast**][dfn-phrasing-content] content, allowing full mdast documents.

### Enumeration

#### `alignType`

```idl
enum alignType {
  "left" | "right" | "center" | "justify" | null
}
```

#### `valignType`

```idl
enum alignType {
  "top" | "bottom" | "middle" | null
}
```








<!-- Definitions -->

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[remark-gfm]: https://github.com/remarkjs/remark-gfm

[mdast]: https://github.com/syntax-tree/mdast

[mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[mdast-util-to-markdown]: https://github.com/syntax-tree/mdast-util-to-markdown

[mdast-util-to-hast]: https://github.com/syntax-tree/mdast-util-to-hast

[extension]: https://github.com/@adobe/micromark-extension-gridtables

[dfn-parent]: https://github.com/syntax-tree/mdast#parent

[dfn-phrasing-content]: https://github.com/syntax-tree/mdast#phrasingcontent

[dfn-break]: https://github.com/syntax-tree/mdast#break

[dfn-flow-content]: #flowcontent-gfm-table

[dfn-table-content]: #tablecontent

[dfn-enum-align-type]: #aligntype

[dfn-row-content]: #rowcontent

[dfn-table]: #table
