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
import { visit, CONTINUE } from 'unist-util-visit';

export const PHRASING_TYPES = {
  break: true,
  delete: true,
  emphasis: true,
  footnote: true,
  footnoteReference: true,
  image: true,
  imageReference: true,
  inlineCode: true,
  inlineMath: true,
  link: true,
  linkReference: true,
  strong: true,
  subscript: true,
  superscript: true,
  text: true,
  underline: true,
};

const COLLAPSIBLE_TYPES = {
  paragraph: true,
  delete: true,
  emphasis: true,
  inlineCode: true,
  strong: true,
  subscript: true,
  superscript: true,
  underline: true,
};

/**
 * Sanitizes text:
 * - trims ends of texts before break
 * - trims ends of texts at the end
 * - removes trailing breaks in containers
 *   see https://github.com/micromark/micromark/issues/118#issuecomment-1238225086
 * - removes empty text blocks, formats, paragraphs
 *
 * @param {object} tree
 * @returns {object} The modified (original) tree.
 */
export default function sanitizeBreaks(tree) {
  visit(tree, (node, index, parent) => {
    const { children: siblings = [] } = parent || {};

    if (node.type === 'text') {
      // remove trailing whitespace if last text block
      if (index === siblings.length - 1) {
        // eslint-disable-next-line no-param-reassign
        node.value = node.value.trimEnd();
      }

      // remove trailing whitespace before break
      if (siblings[index + 1]?.type === 'break') {
        // eslint-disable-next-line no-param-reassign
        node.value = node.value.trimEnd();
      }

      // remove leading whitespace in paragraphs
      if (index === 0 && parent?.type === 'paragraph') {
        // eslint-disable-next-line no-param-reassign
        node.value = node.value.trimStart();
      }

      // remove empty text nodes
      if (!node.value) {
        siblings.splice(index, 1);
        return index - 1;
      }
    }

    // remove trailing breaks altogether
    if (node.type === 'break') {
      if (index === siblings.length - 1) {
        siblings.splice(index, 1);
        return index - 1;
      }

      // eslint-disable-next-line no-param-reassign
      delete node.value;
    }

    return CONTINUE;
  });

  // remove text, formats and paragraphs
  function prune(node) {
    const { children, type } = node;
    if (type === 'text') {
      return !node.value;
    }
    if (!children) {
      return false;
    }
    for (let i = 0; i < children.length; i += 1) {
      if (prune(children[i])) {
        children.splice(i, 1);
        i -= 1;
      }
    }
    if (COLLAPSIBLE_TYPES[type]) {
      return children.length === 0;
    }
    return false;
  }
  prune(tree);

  return tree;
}
