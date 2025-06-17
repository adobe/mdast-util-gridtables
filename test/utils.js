/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */
import assert from 'assert';
import { lstat, readFile } from 'fs/promises';
import { visit, CONTINUE } from 'unist-util-visit';
import { inspect } from 'unist-util-inspect';
import { toMarkdown } from 'mdast-util-to-markdown';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gridTables, TYPE_TABLE } from '@adobe/micromark-extension-gridtables';
import rehypeFormat from 'rehype-format';
import { toHast as mdast2hast } from 'mdast-util-to-hast';
import { toHtml as hast2html } from 'hast-util-to-html';

import { gridTablesToMarkdown, gridTablesFromMarkdown, mdast2hastGridTablesHandler } from '../src/index.js';

export function removePositions(tree) {
  visit(tree, (node) => {
    // eslint-disable-next-line no-param-reassign
    delete node.position;
    return CONTINUE;
  });
  return tree;
}

/**
 * Converts the mdast to md using common settings.
 * @param mdast
 * @returns {string}
 */
export function mdast2md(mdast) {
  return toMarkdown(mdast, {
    emphasis: '_',
    bullet: '-',
    rule: '-',
    extensions: [gridTablesToMarkdown()],
  });
}

/**
 * Converts the md to mdast
 * @param {string} md
 * @returns {Root} mdast
 */
export function md2mdast(md) {
  const options = {
    extensions: [gridTables],
    mdastExtensions: [],
  };
  options.mdastExtensions.push(gridTablesFromMarkdown(options));
  return fromMarkdown(md, options);
}

export async function assertMD(mdast, fixture) {
  const expected = await readFile(new URL(`./fixtures/${fixture}`, import.meta.url), 'utf-8');
  const actual = mdast2md(mdast);
  // console.log(actual);
  assert.strictEqual(actual, expected);
  return actual;
}

export async function md2hast(spec) {
  const source = await readFile(new URL(`./fixtures/${spec}.md`, import.meta.url), 'utf-8');
  const mdast = md2mdast(source);
  return mdast2hast(mdast, {
    handlers: {
      [TYPE_TABLE]: mdast2hastGridTablesHandler(),
    },
  });
}

export async function testMD(spec) {
  const source = await readFile(new URL(`./fixtures/${spec}.md`, import.meta.url), 'utf-8');
  let expectedTree;
  try {
    expectedTree = await readFile(new URL(`./fixtures/${spec}.txt`, import.meta.url), 'utf-8');
    expectedTree = expectedTree.trim();
  } catch {
    // ignore
  }

  const actual = md2mdast(source);
  removePositions(actual);
  const actualTree = inspect(actual, { color: false });
  // eslint-disable-next-line no-console
  // console.log(actualTree);

  if (expectedTree) {
    assert.strictEqual(actualTree, expectedTree);
  }

  // convert back. check if round-trip md exists
  try {
    await lstat(new URL(`./fixtures/${spec}.rt.md`, import.meta.url));
    // eslint-disable-next-line no-param-reassign
    spec += '.rt';
  } catch {
    // ignore
  }
  await assertMD(actual, `${spec}.md`);
}

export async function testMD2HTML(spec, mdast) {
  const expected = await readFile(new URL(`./fixtures/${spec}.html`, import.meta.url), 'utf-8');
  let expectedLean;
  try {
    expectedLean = await readFile(new URL(`./fixtures/${spec}.lean.html`, import.meta.url), 'utf-8');
  } catch {
    // ignore
  }

  if (!mdast) {
    // eslint-disable-next-line no-param-reassign
    mdast = md2mdast(await readFile(new URL(`./fixtures/${spec}.md`, import.meta.url), 'utf-8'));
  }

  // make hast
  const hast = mdast2hast(mdast, {
    handlers: {
      [TYPE_TABLE]: mdast2hastGridTablesHandler(),
    },
  });

  // make html
  rehypeFormat({ indent: 4 })(hast);
  const actual = hast2html(hast);

  assert.strictEqual(actual.trim(), expected.trim());

  if (expectedLean) {
    const hastLean = mdast2hast(mdast, {
      handlers: {
        [TYPE_TABLE]: mdast2hastGridTablesHandler({ noHeader: true }),
      },
      allowDangerousHtml: true,
    });

    // make html
    rehypeFormat({ indent: 4 })(hastLean);
    const actualLean = hast2html(hastLean);

    assert.strictEqual(actualLean.trim(), expectedLean.trim());
  }
}
