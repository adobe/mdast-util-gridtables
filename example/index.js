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
import fs from 'node:fs/promises';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gridTables } from '@adobe/micromark-extension-gridtables';
import { inspect } from 'unist-util-inspect';
import { toHast as mdast2hast } from 'mdast-util-to-hast';
import {
  gridTablesToMarkdown,
  gridTablesFromMarkdown,
  mdast2hastGridTablesHandler,
  TYPE_TABLE,
} from '../src/index.js';

const doc = await fs.readFile('sample.md');

// convert markdown to mdast
const options = {
  extensions: [gridTables],
  mdastExtensions: [],
};
options.mdastExtensions.push(gridTablesFromMarkdown(options));
const mdast = fromMarkdown(doc, options);
console.log('---------------- mdast -----------------');
console.log(inspect(mdast));

// convert mdast to markdown
const md = toMarkdown(mdast, { extensions: [gridTablesToMarkdown()] });
console.log('---------------- markdown -----------------');
console.log(md);

// convert mdast to hast
const hast = mdast2hast(mdast, {
  handlers: {
    [TYPE_TABLE]: mdast2hastGridTablesHandler(),
  },
});
console.log('---------------- hast -----------------');
console.log(inspect(hast));
