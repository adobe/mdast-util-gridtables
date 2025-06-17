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
/* eslint-env mocha */
import assert from 'assert';
import { selectAll } from 'hast-util-select';
import { testMD2HTML, md2hast } from './utils.js';

describe('html from markdown gridtable', () => {
  it('simple table', async () => {
    await testMD2HTML('gt-simple');
  });

  it('large table', async () => {
    await testMD2HTML('gt-large');
  });

  it('footer no header table', async () => {
    await testMD2HTML('gt-footer-no-header');
  });

  it('table with spans', async () => {
    await testMD2HTML('gt-spans');
  });

  it('table in tables', async () => {
    await testMD2HTML('gt-tables-in-tables');
  });

  it('table with align', async () => {
    await testMD2HTML('gt-with-align');
  });

  it('table with nbsp', async () => {
    await testMD2HTML('gt-nbsp');
  });

  it('table with wide code block', async () => {
    await testMD2HTML('gt-wide');
  });

  it('table with no gtHead', async () => {
    const mdast = {
      type: 'root',
      children: [{
        type: 'gridTable',
        children: [{
          type: 'gtRow',
          children: [{
            type: 'gtCell',
            children: [{
              type: 'text',
              value: 'Hello, world.',
            }],
          }],
        }],
      }],
    };
    await testMD2HTML('gt-lean', mdast);
  });

  it('text with breaks', async () => {
    await testMD2HTML('gt-with-breaks');
  });

  it('lonely breaks', async () => {
    await testMD2HTML('gt-with-breaks2');
  });

  it('select table', async () => {
    const hast = await md2hast('gt-simple');
    const table = selectAll('table', hast);
    assert.strictEqual(table.length, 1);
  });
});
