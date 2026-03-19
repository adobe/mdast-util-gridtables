/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

function headerLineMatches(expected, actual) {
    actual = actual.trim();
    if (expected.pattern) {
        return new RegExp(expected.pattern).test(actual);
    }
    return expected.trim() === actual;
}

function headerMatches(expected, actual) {
    if (expected.length !== actual.length) {
        return false;
    }
    for (let i = 0; i < expected.length; i += 1) {
        if (!headerLineMatches(expected[i], actual[i])) {
            return false;
        }
    }
    return true;
}

/**
 * Returns the header comment.
 *
 * @param {Program} program program node
 * @param {import('eslint').Rule.RuleContext} context rule context
 * @returns header comment or null
 */
function getHeaderComment(program, context) {
    const comments = context.sourceCode.getAllComments()
    if (!comments.length) {
        return null;
    }
    const startingIndex = comments[0].type === 'Shebang' ? 1 : 0;
    if (comments.length <= startingIndex) {
        return null;
    }
    if (comments[startingIndex].type === 'Block') {
        return comments[startingIndex].value.split('\n');
    }
    return null;
}

export default {
    rules: {
        /** @type {import('eslint').Rule.RuleModule} */
        header: {
            meta: {
                type: 'layout',
                docs: {
                    description:
                      'Verifies the content and format of a file\'s leading comment block.',
                    recommended: false,
                },
                messages: {
                    missingHeader: 'No header found.',
                    headerContentMismatch: 'Header does not include expected content.',
                },
                fixable: 'code',
                schema: [
                    {
                        type: 'object',
                        properties: {
                            block: {
                                type: 'array',
                            },
                        },
                        required: ['block'],
                    },
                ],
            },
            create: (context) => ({
                Program: (node) => {
                    const headerComment = getHeaderComment(node, context);
                    if (!headerComment) {
                        context.report({
                            node,
                            messageId: 'missingHeader',
                        });
                        return;
                    }
                    const { options: [{ block }] } = context;
                    if (!headerMatches(block, headerComment)) {
                        context.report({
                            node,
                            messageId: 'headerContentMismatch',
                        });
                    }
                },
            }),
        },
    },
};
