## [4.0.4](https://github.com/adobe/mdast-util-gridtables/compare/v4.0.3...v4.0.4) (2024-04-02)


### Bug Fixes

* **deps:** update dependency @adobe/micromark-extension-gridtables to v2.0.2 ([#109](https://github.com/adobe/mdast-util-gridtables/issues/109)) ([829f39c](https://github.com/adobe/mdast-util-gridtables/commit/829f39c91c228a1b2641b363a601743d7aba528d))

## [4.0.3](https://github.com/adobe/mdast-util-gridtables/compare/v4.0.2...v4.0.3) (2024-04-02)


### Bug Fixes

* **deps:** update dependency @adobe/micromark-extension-gridtables to v2.0.1 ([#108](https://github.com/adobe/mdast-util-gridtables/issues/108)) ([b77f49a](https://github.com/adobe/mdast-util-gridtables/commit/b77f49acfb2f1e7850ad0e707013c54c34fe1533))

## [4.0.2](https://github.com/adobe/mdast-util-gridtables/compare/v4.0.1...v4.0.2) (2024-03-19)


### Bug Fixes

* add hast-util-select package and md2hast function ([701ae3e](https://github.com/adobe/mdast-util-gridtables/commit/701ae3ef3f55db1056a59f0078a24216cb9234be)), closes [#103](https://github.com/adobe/mdast-util-gridtables/issues/103)

## [4.0.1](https://github.com/adobe/mdast-util-gridtables/compare/v4.0.0...v4.0.1) (2024-02-28)


### Bug Fixes

* ensure that cell content is properly wrapped from phrasing content only children ([#99](https://github.com/adobe/mdast-util-gridtables/issues/99)) ([b17ea4f](https://github.com/adobe/mdast-util-gridtables/commit/b17ea4f20af4d9ee6dfa2d8d85e1269b7872fbbb))

# [4.0.0](https://github.com/adobe/mdast-util-gridtables/compare/v3.0.2...v4.0.0) (2024-01-29)


### Bug Fixes

* handle wide code blocks ([#93](https://github.com/adobe/mdast-util-gridtables/issues/93)) ([6a4cbbf](https://github.com/adobe/mdast-util-gridtables/commit/6a4cbbf25fefde451a3d49fc4667b4203876bd4c)), closes [#92](https://github.com/adobe/mdast-util-gridtables/issues/92)


### BREAKING CHANGES

* wide code blocks inside cells are line wrapped by inserting a "no-break-here" (U+0083) character.

## [3.0.2](https://github.com/adobe/mdast-util-gridtables/compare/v3.0.1...v3.0.2) (2023-10-10)


### Bug Fixes

* escape hyphen after wrap ([cf4d5a6](https://github.com/adobe/mdast-util-gridtables/commit/cf4d5a6d7f870948751c13d0a263b527ed0d60d7))

## [3.0.1](https://github.com/adobe/mdast-util-gridtables/compare/v3.0.0...v3.0.1) (2023-09-26)


### Bug Fixes

* reset bulletLastUsed ([#73](https://github.com/adobe/mdast-util-gridtables/issues/73)) ([052292e](https://github.com/adobe/mdast-util-gridtables/commit/052292ee2d8a19fdda527c2704c523ee87a703b8))

# [3.0.0](https://github.com/adobe/mdast-util-gridtables/compare/v2.0.2...v3.0.0) (2023-09-16)


### Bug Fixes

* **deps:** update external major ([#62](https://github.com/adobe/mdast-util-gridtables/issues/62)) ([df89eb7](https://github.com/adobe/mdast-util-gridtables/commit/df89eb7af506cd827d51ee60b24cc3ef21829e09))


### BREAKING CHANGES

* **deps:** mdast-util-to-hast upgrade to 13.x

## [2.0.2](https://github.com/adobe/mdast-util-gridtables/compare/v2.0.1...v2.0.2) (2023-07-22)


### Bug Fixes

* **deps:** update dependency mdast-util-to-markdown to v2.1.0 ([#63](https://github.com/adobe/mdast-util-gridtables/issues/63)) ([cb3978e](https://github.com/adobe/mdast-util-gridtables/commit/cb3978ece8c6a314b9aa496f1597eeb56c20ddae))

## [2.0.1](https://github.com/adobe/mdast-util-gridtables/compare/v2.0.0...v2.0.1) (2023-07-10)


### Bug Fixes

* **deps:** update dependency mdast-util-to-markdown to v2 ([#60](https://github.com/adobe/mdast-util-gridtables/issues/60)) ([8a81bfb](https://github.com/adobe/mdast-util-gridtables/commit/8a81bfba15b95c4b2a65c9c660f13a721e622f89))

# [2.0.0](https://github.com/adobe/mdast-util-gridtables/compare/v1.0.9...v2.0.0) (2023-07-10)


### Bug Fixes

* **deps:** update external major  ([d42955f](https://github.com/adobe/mdast-util-gridtables/commit/d42955ffbe93e1f012d68807c23872d83749604f))


### BREAKING CHANGES

* **deps:** upgrade to micromark 4.x

## [1.0.9](https://github.com/adobe/mdast-util-gridtables/compare/v1.0.8...v1.0.9) (2023-06-27)


### Bug Fixes

* convert tabstops correctly ([#55](https://github.com/adobe/mdast-util-gridtables/issues/55)) ([78c17a8](https://github.com/adobe/mdast-util-gridtables/commit/78c17a87689de0b7cb50ea02932c1999928d0c49))

## [1.0.8](https://github.com/adobe/mdast-util-gridtables/compare/v1.0.7...v1.0.8) (2023-06-27)


### Bug Fixes

* revert micromark update ([dbd11af](https://github.com/adobe/mdast-util-gridtables/commit/dbd11af6c1809d34795457060454226029e06df0))

## [1.0.7](https://github.com/adobe/mdast-util-gridtables/compare/v1.0.6...v1.0.7) (2023-06-27)


### Bug Fixes

* improve mdast creating with many image refs ([#54](https://github.com/adobe/mdast-util-gridtables/issues/54)) ([105fa03](https://github.com/adobe/mdast-util-gridtables/commit/105fa03db858ae6fe1eabff2bb389ec6793a31e8)), closes [#53](https://github.com/adobe/mdast-util-gridtables/issues/53)

## [1.0.6](https://github.com/adobe/mdast-util-gridtables/compare/v1.0.5...v1.0.6) (2023-01-28)


### Bug Fixes

* **deps:** update external fixes ([#26](https://github.com/adobe/mdast-util-gridtables/issues/26)) ([1ebeccf](https://github.com/adobe/mdast-util-gridtables/commit/1ebeccff53ed84effda195c330d2345e0ad05df1))

## [1.0.5](https://github.com/adobe/mdast-util-gridtables/compare/v1.0.4...v1.0.5) (2023-01-18)


### Bug Fixes

* invalid table crashes the toMarkdown conversion bug ([#23](https://github.com/adobe/mdast-util-gridtables/issues/23)) ([18c8239](https://github.com/adobe/mdast-util-gridtables/commit/18c82393fa49a459f66a66e465d142b7e8550b70))

## [1.0.4](https://github.com/adobe/mdast-util-gridtables/compare/v1.0.3...v1.0.4) (2023-01-18)


### Bug Fixes

* migrate to mdast-util-to-markdown 1.5 ([ead602c](https://github.com/adobe/mdast-util-gridtables/commit/ead602cf80cc4c94e86cf77fc320024cbfb1bccf))

## [1.0.3](https://github.com/adobe/mdast-util-gridtables/compare/v1.0.2...v1.0.3) (2022-11-09)


### Bug Fixes

* only match leading digits ([#8](https://github.com/adobe/mdast-util-gridtables/issues/8)) ([dc90086](https://github.com/adobe/mdast-util-gridtables/commit/dc90086d39ea08f9137f45b596dba5683ae33950))

## [1.0.2](https://github.com/adobe/mdast-util-gridtables/compare/v1.0.1...v1.0.2) (2022-11-08)


### Bug Fixes

* escape potential ordered list starters in text ([d4a4c2a](https://github.com/adobe/mdast-util-gridtables/commit/d4a4c2a363d5a7c96564b0e0a418bfbc0000bd2a))

## [1.0.1](https://github.com/adobe/mdast-util-gridtables/compare/v1.0.0...v1.0.1) (2022-11-03)


### Bug Fixes

* rename export ([#6](https://github.com/adobe/mdast-util-gridtables/issues/6)) ([fdba2e7](https://github.com/adobe/mdast-util-gridtables/commit/fdba2e7931166151b60fd0984c6a140e86d1e661))

# 1.0.0 (2022-10-07)


### Features

* initial commit ([25ac9e4](https://github.com/adobe/mdast-util-gridtables/commit/25ac9e49eebb8f73baff3e9eb0c454297ebfd398))
