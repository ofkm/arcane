## [1.0.1](https://github.com/ofkm/arcane/compare/v1.0.0...v1.0.1) (2025-09-10)

### Bug Fixes

- allow both http and https cookie names ([b3b9f71](https://github.com/ofkm/arcane/commit/b3b9f7159ed51e388dbd208b070f35ded6ec48df))
- onboarding flow not using correct values ([c75839c](https://github.com/ofkm/arcane/commit/c75839c7d9910a71da971b87b9745af24fc8adb5))
- onboarding not showing on fresh installs ([51fa03a](https://github.com/ofkm/arcane/commit/51fa03ac6e61e5820963208c5e16977ccbfb9bd5))
- register project handler to fix projects not pulling ([038ebf6](https://github.com/ofkm/arcane/commit/038ebf61e9e8bff6ec899e9591e9c6fdb4c3db86))
- use non secure cookie if running on http ([fb2e6d9](https://github.com/ofkm/arcane/commit/fb2e6d9fd61918b615fabc45f42400ca10e6660c))

## [1.0.0](https://github.com/ofkm/arcane/compare/v0.15.1...v1.0.0) (2025-09-09)

### ⚠ BREAKING CHANGES

- remote environments (#305)
- migrate to Go backend, serve frontend from backend (#291)

### Features

- add copier utility functions for struct mapping ([477c2d5](https://github.com/ofkm/arcane/commit/477c2d5d7e9a7635026ba305e15e643fc970870c))
- add event details dialog ([d14609c](https://github.com/ofkm/arcane/commit/d14609c4535ddc87a09385ead4acdcc0ccf920fb))
- change port to 3552, cleanup old code ([9705277](https://github.com/ofkm/arcane/commit/970527767b11b8eca774e68e0c64de3bd2e97d9e))
- enhance volume details with container names and IDs ([1c5cb35](https://github.com/ofkm/arcane/commit/1c5cb359d4f54612fd5107d6a1643a74e01304ad))
- events are now shown in the ui ([#355](https://github.com/ofkm/arcane/issues/355)) ([49f51c4](https://github.com/ofkm/arcane/commit/49f51c420d621d950439fc54cbe1110ab282b60f))
- migrate logging to json ([6ea6c77](https://github.com/ofkm/arcane/commit/6ea6c77dc55faa629919ce626e1c6e5cf08ee07e))
- migrate logging to json ([b66afe2](https://github.com/ofkm/arcane/commit/b66afe258028c373f18f126403b70ce719d8efa9))
- migrate to Go backend, serve frontend from backend ([#291](https://github.com/ofkm/arcane/issues/291)) ([b46454a](https://github.com/ofkm/arcane/commit/b46454a58d822a739cfc3801b9651a98c5d7be84))
- redesign login page ([8063f08](https://github.com/ofkm/arcane/commit/8063f08bbcfc6caf8642185f70767fb607f1f157))
- remote environments ([#305](https://github.com/ofkm/arcane/issues/305)) ([8fb5815](https://github.com/ofkm/arcane/commit/8fb5815c8b86fc468582ff33d46273053b1b77cd))
- show error status for image updates, show if a credential was used ([7718605](https://github.com/ofkm/arcane/commit/7718605ea7386d7eba281b5ef98d3c1e18b33417))
- zod v4 form validation, and sheet based forms ([#301](https://github.com/ofkm/arcane/issues/301)) ([77c6d96](https://github.com/ofkm/arcane/commit/77c6d963a925c2a3be72ab5af4cc901f36c83766))

### Bug Fixes

- add container force removal checkboxes ([6e449b2](https://github.com/ofkm/arcane/commit/6e449b2af26161284b4fc548e9cb9fb8fea5b82d))
- add exclude label for updater ([123f575](https://github.com/ofkm/arcane/commit/123f5753ce23515cc8d2cd1e2e12965e221d0665))
- add loading indicators to metric cards, fix some styling on the dashboard ([d9be7cc](https://github.com/ofkm/arcane/commit/d9be7cc5d809856c13fbf4f20819402aa7ce4ba3))
- add missing isAdmin prop ([659933a](https://github.com/ofkm/arcane/commit/659933a342bb8063d78048ea767542d62d0a1423))
- add missing props to button ([044396c](https://github.com/ofkm/arcane/commit/044396c641cc3713976e0ed4b846470b2db53e0b))
- add more options for onboarding ([#321](https://github.com/ofkm/arcane/issues/321)) ([45ae580](https://github.com/ofkm/arcane/commit/45ae5807c2bb50c30b33d9afb6c5c55016008ba0))
- add user ID validation in token verification process ([5595894](https://github.com/ofkm/arcane/commit/55958945c077eeabea17cf43694fb6256c2756c2))
- add validation for stack ID and improve error handling in GetStackLogsStream method ([57f25d2](https://github.com/ofkm/arcane/commit/57f25d2851e6762eb9416c4bd05434c9af0f42d6))
- auth redirect (i hope) ([92c1685](https://github.com/ofkm/arcane/commit/92c1685c238e87d19fb56a54c40f6c6b20f6b157))
- auth session redirect ([9da620a](https://github.com/ofkm/arcane/commit/9da620a9534052d3aa0c9e26ca5c41cfe3cc7caa))
- auto update service logic ([#323](https://github.com/ofkm/arcane/issues/323)) ([80f4ec8](https://github.com/ofkm/arcane/commit/80f4ec86b6a28ad97b4553c64dc6196a573ea5f2))
- cleanup docker settings page ui ([4874a48](https://github.com/ofkm/arcane/commit/4874a48c6bd23410ec1b8026742b3575fd028c8f))
- cleanup hooks and layout logic and disable SSR so local development works ([e3750e5](https://github.com/ofkm/arcane/commit/e3750e5359e5faeab0bedbfa850481b26d8f7d1d))
- cleanup of orphaned image update records after applying updates ([31155c5](https://github.com/ofkm/arcane/commit/31155c5ca8ae6f8d982f8c616bd0612fc2f75784))
- container details page not laoding ([c5e5b51](https://github.com/ofkm/arcane/commit/c5e5b51756e246b990fea23556b7754206450a94))
- correct counts of containers and images on dashboard ([520a18a](https://github.com/ofkm/arcane/commit/520a18a52a8e3ac437efa7b418804eb8ae96495a))
- correctly use minute value for sessions timeout ([3b3c9f4](https://github.com/ofkm/arcane/commit/3b3c9f4e24512adeed49033eca2cc4c440e4fc1c))
- do not allow auth method to be turned off is only one is enabled ([b310334](https://github.com/ofkm/arcane/commit/b3103347455525623781722670a8dbb21d6d4820))
- do not run auto update job on container start ([97736be](https://github.com/ofkm/arcane/commit/97736bef8e624d00e69e928f34da99dcc5d1e115))
- enhance container stats and configuration display with derived flags for environment variables, ports, labels, and network settings ([3a232df](https://github.com/ofkm/arcane/commit/3a232df5f43a1dd3114f705742f62b2689aee715))
- enhance login response to include token pair and set cookie for password change ([587a656](https://github.com/ofkm/arcane/commit/587a656540d6de7f22b5a8679e60a893933fd07c))
- fix performance of projects page and rely only on filesystem watcher for updating the database ([dee13bc](https://github.com/ofkm/arcane/commit/dee13bcb3eecea7ee939e817e4e39364a9e871b3))
- global prune not pruning volumes ([6a55fa1](https://github.com/ofkm/arcane/commit/6a55fa1a054ca49b49fa479d1610961859460f7d))
- image dropdown not deleting images ([12a2e8d](https://github.com/ofkm/arcane/commit/12a2e8d56b3a459627a8f1e78b848679d92e0539))
- image maturity/update logic ([92ed4a0](https://github.com/ofkm/arcane/commit/92ed4a02937fc01448c56489981c4d017062e685))
- image table disappears when filtering images ([12c6d9c](https://github.com/ofkm/arcane/commit/12c6d9c1d9bdff2348720bbe99a8a39eaa55077d))
- improve error handling and streaming logic in GetStatsStream and GetLogsStream methods ([3a407d3](https://github.com/ofkm/arcane/commit/3a407d3da18ec0b04ca8a02680b96c2903249ac0))
- incorrect user reponse structure and missing types ([4622ca6](https://github.com/ofkm/arcane/commit/4622ca6b6c9b137dc9fe4d3cc3c5802f1a9f7703))
- layout shift when using dropdown menus ([e404eee](https://github.com/ofkm/arcane/commit/e404eee5f4179727ee31054b2559732825e17066))
- lazy load all resources ([066eadc](https://github.com/ofkm/arcane/commit/066eadcd64ff3c44f3ae76693c338a969fe55952))
- make image update item reactive with status once clicked ([fe5caf6](https://github.com/ofkm/arcane/commit/fe5caf639b6a35cf19b53d8a1c78fe1133fdba0d))
- make onboardin security settings page the same as the normal settings page ([20800ef](https://github.com/ofkm/arcane/commit/20800efb47ececf2d7ad32844dabc3bb491f27ce))
- make sure oidc uses refresh tokens ([9f185eb](https://github.com/ofkm/arcane/commit/9f185eba457f7f2ccf74ffa24753e6b3924efb50))
- make System username red on event table ([0a8bff6](https://github.com/ofkm/arcane/commit/0a8bff6186246ea0643b6063db4cedff3d121013))
- mismtached json type for database ([44dbd27](https://github.com/ofkm/arcane/commit/44dbd27b00810d98e58cdad30961d8581fa4c1ca))
- move auto updater to just updater confirm working with projects ([1382213](https://github.com/ofkm/arcane/commit/1382213820ce7a70d9ccac4ed0fea1b4b6d41bf8))
- onboarding oidc config ([cadda0a](https://github.com/ofkm/arcane/commit/cadda0aa7a8bc1f77bce7b8997af58e08b113ded))
- only allow role changes for oidc users ([f5a3302](https://github.com/ofkm/arcane/commit/f5a3302f846b063e74ff6e10259e22c6fc331713))
- only show edit user button for local users ([a0eb2f4](https://github.com/ofkm/arcane/commit/a0eb2f421a99d018f8a347cd598f8b9f8e542790))
- only show floating header after scrolling on compose page ([6582e1e](https://github.com/ofkm/arcane/commit/6582e1e036b37f05a85d48d6eadb1a742a06aba8))
- optimize conversion of slog attributes for logging ([10df97f](https://github.com/ofkm/arcane/commit/10df97f27b4a70c12b51ff3f186d28be6bdcc2b1))
- pagination round one fixes (containers, images, and projects) ([8349d1b](https://github.com/ofkm/arcane/commit/8349d1b84a85f2b112b54ab527e38fd390c18872))
- persist Docker image ID as primary key and improve tag selection logic ([6e7ac85](https://github.com/ofkm/arcane/commit/6e7ac853da7f675f3ce1ce8867c447203b290035))
- project files not removed when deleteing from the ui ([65c93c6](https://github.com/ofkm/arcane/commit/65c93c6f91f9ed922f5584d158264c80f4607385))
- projects page wont load if no stacks are found ([320edc9](https://github.com/ofkm/arcane/commit/320edc9596ef382e49d58fcaa9949f5f5b4d37d7))
- redirect to /compose after project delete ([ca8b4c6](https://github.com/ofkm/arcane/commit/ca8b4c6254f0da2a8d4f94a08ca3593be1988b87))
- refactor user creation logic to use CreateUser type and improve type safety ([6ccb106](https://github.com/ofkm/arcane/commit/6ccb106795f9376d58ec04b1809e8ae5bebe138f))
- remove container registry field data on sheet reopen ([66f26f5](https://github.com/ofkm/arcane/commit/66f26f5ea613e6e378909667609f3255fa8c34c2))
- remove missing util file ([23d7745](https://github.com/ofkm/arcane/commit/23d7745baf0f27a886169646e9413d6099b7525a))
- remove oidc client secret from api reponses ([4ab9a9d](https://github.com/ofkm/arcane/commit/4ab9a9d9ecbb98840a57a2c64c0e01ff8c0edd9b))
- remove ping group and utility in Dockerfile-static ([c7ff050](https://github.com/ofkm/arcane/commit/c7ff050c56848807cf2133e8d7673d00a826ae58))
- remove selected labels ([6e3fd3e](https://github.com/ofkm/arcane/commit/6e3fd3eca11a28dc62ba73c69258b6ad6ea20c5e))
- remove unused prop ([3d8a350](https://github.com/ofkm/arcane/commit/3d8a350812e6829dadc6e03fa55e6d56e0180d1b))
- restore translucency to badges ([1a93bdc](https://github.com/ofkm/arcane/commit/1a93bdc3f3bd8609b763177a1789398221c46209))
- return correct event api reponse on page load ([f9f3082](https://github.com/ofkm/arcane/commit/f9f3082667686225003eb7a73f92cb9bf8af0684))
- return correct network reponse data on page load ([b767fd5](https://github.com/ofkm/arcane/commit/b767fd577afcd1c123d42f3af019b214b7e1f980))
- revert redirect in layout ([c659707](https://github.com/ofkm/arcane/commit/c65970710f16cbe2ae2547a474c64be4779ee08e))
- rework templates with new schema ([#389](https://github.com/ofkm/arcane/issues/389)) ([e40e06e](https://github.com/ofkm/arcane/commit/e40e06e387a63d8a4d7de16a210c9f017d500b1c))
- session validation timeouts ([a267b91](https://github.com/ofkm/arcane/commit/a267b91506ec1cea1f7e6c983d05aa5826353cda))
- settings not saving on submission ([520178b](https://github.com/ofkm/arcane/commit/520178b28141ce697c63a12f4b92da64de573a95))
- show create container sheet ([aa089c5](https://github.com/ofkm/arcane/commit/aa089c5b7b074f4510e6cb9421a4d8bbda3339ff))
- show x of x running for conatiner metric card ([a03f336](https://github.com/ofkm/arcane/commit/a03f3365b3454343c125715d40de8649e2b9b260))
- sidebar shows on logon ([6f14c05](https://github.com/ofkm/arcane/commit/6f14c050c899633d3e6feb83ff71c81fda3475b1))
- simplify sqlite string, and make sure postgres migrations work ([1a01113](https://github.com/ofkm/arcane/commit/1a01113aa77cd57a5c4d71fd2c159de0460c4373))
- stack logic ([#313](https://github.com/ofkm/arcane/issues/313)) ([b53caa2](https://github.com/ofkm/arcane/commit/b53caa2e233d3182a1d5de3696dd29803cfaa1e2))
- status badge color is now reactive ([8c2c24d](https://github.com/ofkm/arcane/commit/8c2c24df79179f00f127e697f913107a2ff7fd37))
- stopAll button use the correct count ([8bd2f5c](https://github.com/ofkm/arcane/commit/8bd2f5cec774fffe6bf612004b690dbcc878fe7c))
- switch from bcrypt to argon2 for password hashing ([1485a53](https://github.com/ofkm/arcane/commit/1485a53044e7b0f1bb8c159fe1dcd45e7836f763))
- template loading and usage ([c994404](https://github.com/ofkm/arcane/commit/c994404d48c7a8ab7eabc88128656ea4bcf207f1))
- truncate volume name text ([5111195](https://github.com/ofkm/arcane/commit/5111195a7f3eacd4aad9dfc246b948da8425f2f4))
- update link to template settings in dialog component ([55b8fb5](https://github.com/ofkm/arcane/commit/55b8fb5fa4fcc85f4ad8969a7acf7666acc78a4a))
- update system meters dynamically ([16e41cf](https://github.com/ofkm/arcane/commit/16e41cfcfb483f78f45b666f7f1e064346bf5b26))
- use Arcane as page title for all pages ([c1f4aed](https://github.com/ofkm/arcane/commit/c1f4aed593cadb980624072266a00eba5b7a6032))
- use containerId for removing containers ([20cf8c9](https://github.com/ofkm/arcane/commit/20cf8c94701a70cf3f7f0a0f6f981cde72324333))
- use correct container data in api on page load ([d33dedc](https://github.com/ofkm/arcane/commit/d33dedc77e2fc355b61238ced48f3f3492b56185))
- use correct cookie timeout value ([8b247a5](https://github.com/ofkm/arcane/commit/8b247a5c1d5c4342ca716eb7d2f411ee68357eb2))
- use correct destructive variant for user dropdown menu ([84fb150](https://github.com/ofkm/arcane/commit/84fb1506b6bb7808ff96bf4c715b00d94fd051e7))
- use correct image api reponse data ([a08882a](https://github.com/ofkm/arcane/commit/a08882adc2fa46c081aa5574aa4e800b8494c277))
- use correct redirect after login ([58a4340](https://github.com/ofkm/arcane/commit/58a43404ef3bde179cd86b3568bfb1be3105493e))
- use correct volume data in api on page load ([c9bbffe](https://github.com/ofkm/arcane/commit/c9bbffe8ad141820ddfeb89e480ba0dd1c8ae8bf))
- use dedicated endpoint for totalImageSize ([58edb08](https://github.com/ofkm/arcane/commit/58edb08bdda3413ea07d2e3d018188d0917166cc))
- use dockerInfo for container and image counts ([3413dc4](https://github.com/ofkm/arcane/commit/3413dc43192aa841d7b34178b889f2bc5e5baf68))
- use new image detail type ([63f8211](https://github.com/ofkm/arcane/commit/63f821186d105ab7f2aa17a37bb6f4ddf01a94af))
- use prefered username in oidc cliams ([ee46e9a](https://github.com/ofkm/arcane/commit/ee46e9aabe84b96fa1e1e49b40a1ca1b441f4b73))
- use prune mode behavior ([751f7c7](https://github.com/ofkm/arcane/commit/751f7c74e3a3f70aa121b6a52a08f3ce37ec1801))
- user display not showing in sidebar ([e059cf2](https://github.com/ofkm/arcane/commit/e059cf2cb1ce78ea28e0a968d7690a67dd8ab594))

## [0.15.1](https://github.com/ofkm/arcane/compare/v0.15.0...v0.15.1) (2025-06-12)

### Bug Fixes

- compose network race condition ([#274](https://github.com/ofkm/arcane/issues/274)) ([2a4401b](https://github.com/ofkm/arcane/commit/2a4401ba931cf48978cb0b49b7e98048154ceae7))
- layout of editors in compose details view ([c052902](https://github.com/ofkm/arcane/commit/c05290291f556ac3e45c3479fe6ff2d3c72db6da))
- proper compose validation ([#272](https://github.com/ofkm/arcane/issues/272)) ([6f1eb03](https://github.com/ofkm/arcane/commit/6f1eb03e68133fd1f456503393d238fd68883a51))
- remove oidc env and args from docker build ([e462e8b](https://github.com/ofkm/arcane/commit/e462e8bc271cf92f5b93c09c3d4fe8e87f5018bf))

## [0.15.0](https://github.com/ofkm/arcane/compare/v0.14.0...v0.15.0) (2025-06-04)

### Features

- remote agents ([#239](https://github.com/ofkm/arcane/issues/239)) ([82cbab5](https://github.com/ofkm/arcane/commit/82cbab506083d6820611b68c3bafea36299a4f7c))
- system usage meters ([64dde28](https://github.com/ofkm/arcane/commit/64dde28ef34d43ce2bc5fa3390d2db9e013098e0))
- use drizzle as a database backend ([#248](https://github.com/ofkm/arcane/issues/248)) ([54061d3](https://github.com/ofkm/arcane/commit/54061d303945871bd998c3acf4cb331ce6eee560))

### Bug Fixes

- agents not showing compose projects in table ([0ab2757](https://github.com/ofkm/arcane/commit/0ab2757c47b0dba5d839d6853467febb503243f5))
- container creation type mismatches not allowing containers to be created ([e8aece6](https://github.com/ofkm/arcane/commit/e8aece65771c56d84360280835edc496130e88c9))
- container status sorting incorrect ([#242](https://github.com/ofkm/arcane/issues/242)) ([64faad3](https://github.com/ofkm/arcane/commit/64faad3479b541b04addb8ac2d31e0148061ea0a))
- cpu and ram usage bars not showing correct values ([01fbb16](https://github.com/ofkm/arcane/commit/01fbb166675d1ff34e0a63516014140feecec598))
- create database in docker build ([24b33e8](https://github.com/ofkm/arcane/commit/24b33e8715faa0cff1d814df4427de8bd2d2415c))
- deploy to agent dropdown button ([#244](https://github.com/ofkm/arcane/issues/244)) ([6092c4f](https://github.com/ofkm/arcane/commit/6092c4f67900f48ebc88d2463524669f8ad3c8f8))
- implement main compose spec functionality ([#259](https://github.com/ofkm/arcane/issues/259)) ([e2fc0ac](https://github.com/ofkm/arcane/commit/e2fc0ac7d53d27bb4c03f5bb50b059dd90faf1e4))
- incorrect github link on login page ([3205312](https://github.com/ofkm/arcane/commit/3205312997badc6e47069dae9ab422052aabb818))
- missing ) in migrations ([635d932](https://github.com/ofkm/arcane/commit/635d932180395a0b8d2b1ec55f8ec0f0a382ab88))
- parse ipam config correctly ([2585d69](https://github.com/ofkm/arcane/commit/2585d69e9ebb38fe44a0a71c4895455219a4c1a6))
- pruning button not showing loading status ([419cd9e](https://github.com/ofkm/arcane/commit/419cd9ede5e905d4858b204e1228383ab8425037))
- remove duplicate agent sidebar item ([6545794](https://github.com/ofkm/arcane/commit/6545794c47f11566803a1c8772169919471dc439))
- rename stacks to compose projects ([#243](https://github.com/ofkm/arcane/issues/243)) ([b38b298](https://github.com/ofkm/arcane/commit/b38b29851882d4c3dd91b4385f1ad1fb30035b8c))
- rework auto update service ([d88178a](https://github.com/ofkm/arcane/commit/d88178a2c2c9edc308cbedccd80b83fbdc0ba2c7))
- store image maturity in database instead of cache ([#263](https://github.com/ofkm/arcane/issues/263)) ([1b29808](https://github.com/ofkm/arcane/commit/1b298088172b959ea38b8ab624a24c6a3af3b65e))
- support removing agents ([c33a872](https://github.com/ofkm/arcane/commit/c33a872370ce82cc59839078f90448c6ce90daa1))
- use new template root url ([55fdacd](https://github.com/ofkm/arcane/commit/55fdacd2bef3cebbba549fb90c2d27ae1ce2d4a8))
- use system storage on dashboard ([6e7a83c](https://github.com/ofkm/arcane/commit/6e7a83c8cb230f032adeefe8326c57da301f001e))
- volumes table truncate not being applied ([ce50de7](https://github.com/ofkm/arcane/commit/ce50de7b96ad40fc7ae221517e86a8cea35b1625))

## [0.14.0](https://github.com/ofkm/arcane/compare/v0.13.1...v0.14.0) (2025-05-29)

### Features

- compose and .env template ([#231](https://github.com/ofkm/arcane/issues/231)) ([c47d15f](https://github.com/ofkm/arcane/commit/c47d15f928d5ca75ac2b9a4d945f94e5b8f3fd51))

## [0.13.1](https://github.com/ofkm/arcane/compare/v0.13.0...v0.13.1) (2025-05-28)

### Bug Fixes

- re-release 0.13.0 as 0.13.1 ([bc2e4a2](https://github.com/ofkm/arcane/commit/bc2e4a2edcfe225aee4df50e8d98b06e6b2de7c4))

## [0.13.0](https://github.com/ofkm/arcane/compare/v0.12.0...v0.13.0) (2025-05-28)

### Features

- allow changing user usernames ([74321b5](https://github.com/ofkm/arcane/commit/74321b52e891cb25c8d205caf4c451696fc3c200))
- make compose editor widths resizeable ([64c33e6](https://github.com/ofkm/arcane/commit/64c33e65c87146d9cedc5647b2840b3ca6623a13))
- simplify container and satck detail pages ([#227](https://github.com/ofkm/arcane/issues/227)) ([65dfa64](https://github.com/ofkm/arcane/commit/65dfa64da8e1ccf82ed6dcfd3292006c7faa26a5))

### Bug Fixes

- container log performance issues ([#222](https://github.com/ofkm/arcane/issues/222)) ([d337474](https://github.com/ofkm/arcane/commit/d337474870d45205d63063650a9d237b06862f70))
- make font size more consistant in editors ([efbbe75](https://github.com/ofkm/arcane/commit/efbbe75217f292e8a38fb2b6b8985b7e6c79e264))
- remove old references to app-settings.json ([65f20d1](https://github.com/ofkm/arcane/commit/65f20d1415b4f174172b212a425949356131d03a))
- theming not applying correct values ([e0d125e](https://github.com/ofkm/arcane/commit/e0d125e5793f242efc787304664fe7166843dfa4))
- update size classes for consistency across components ([3ceb93d](https://github.com/ofkm/arcane/commit/3ceb93df9bbf3bfce040ca2d277670786bf116db))

## [0.12.0](https://github.com/ofkm/arcane/compare/v0.11.1...v0.12.0) (2025-05-25)

### Features

- convert docker run to docker compose ([#219](https://github.com/ofkm/arcane/issues/219)) ([3da1db7](https://github.com/ofkm/arcane/commit/3da1db7452de3aca6ef6ad78657f73f6a2b8bece))
- stack logs tab ([696d74a](https://github.com/ofkm/arcane/commit/696d74a2391acae08c1fb306a6ae26463bf5bf50))

### Bug Fixes

- external networks names not being respected ([712fa00](https://github.com/ofkm/arcane/commit/712fa001b672212a98d61633dca96d3092b29a22))

## [0.11.1](https://github.com/ofkm/arcane/compare/v0.11.0...v0.11.1) (2025-05-24)

### Bug Fixes

- largest images differ on dashboard and container images ([9ffd0f6](https://github.com/ofkm/arcane/commit/9ffd0f68378518e2b717a078d4800578395228ba))

## [0.11.0](https://github.com/ofkm/arcane/compare/v0.10.0...v0.11.0) (2025-05-23)

### Features

- save page sizes for all tables ([e01d7eb](https://github.com/ofkm/arcane/commit/e01d7ebd05d93f1b9a716ec8dae4535c8e0e1f2a))

### Bug Fixes

- cleanup failed stack deployments if they fail ([6fa7bd7](https://github.com/ofkm/arcane/commit/6fa7bd71d511e1b0286e07e6165470c6abfdada0))
- dashboard overview card arrangement ([#215](https://github.com/ofkm/arcane/issues/215)) ([da87f3b](https://github.com/ofkm/arcane/commit/da87f3b7eb8ebefbbb2cdce69e47d5cff82af5db))
- stack deployments for external networks ([#199](https://github.com/ofkm/arcane/issues/199)) ([dfdf1e0](https://github.com/ofkm/arcane/commit/dfdf1e0fb824c8370e90cb3ec879db8e6da7d174))
- use correct stack api endpoints ([4ea2c12](https://github.com/ofkm/arcane/commit/4ea2c125319df1b797842f649f43ae649414bbd4))

## [0.10.0](https://github.com/ofkm/arcane/compare/v0.9.2...v0.10.0) (2025-05-17)

### Features

- environment variable support in compose files ([#195](https://github.com/ofkm/arcane/issues/195)) ([4612271](https://github.com/ofkm/arcane/commit/4612271a87f1064074fac0a2a22471a6720c8f53))

### Bug Fixes

- improve loading speed of stack and container pages ([#194](https://github.com/ofkm/arcane/issues/194)) ([ccbbdb4](https://github.com/ofkm/arcane/commit/ccbbdb425033635648102c11a5c2cd3ee6a41a05))
- stacks not starting with more than one network ([#191](https://github.com/ofkm/arcane/issues/191)) ([77a32ee](https://github.com/ofkm/arcane/commit/77a32ee155520ae444c939d5f7fcdece414a7de2))
- table selection states not getting invailidated ([d1ef3cb](https://github.com/ofkm/arcane/commit/d1ef3cb4a0656bfb95736dcd0fcaab11649d4e18))

## [0.9.2](https://github.com/ofkm/arcane/compare/v0.9.1...v0.9.2) (2025-05-15)

### Bug Fixes

- cache image maturity results to improve page loading ([ee6eb1e](https://github.com/ofkm/arcane/commit/ee6eb1e52d31aa319f8148bce902e2d5696b97d4))

## [0.9.1](https://github.com/ofkm/arcane/compare/v0.9.0...v0.9.1) (2025-05-15)

### Bug Fixes

- settings not loading values from json file ([ad65e80](https://github.com/ofkm/arcane/commit/ad65e803c53e5c9f8b639e0620b6e85a61b50941))
- volumes cant be deleted from volume details page ([76bc5b8](https://github.com/ofkm/arcane/commit/76bc5b8e362b8e8de216d18d7f6acf9fd86d171b))

## [0.9.0](https://github.com/ofkm/arcane/compare/v0.8.0...v0.9.0) (2025-05-14)

### Features

- add dark / light mode toggle ([f24cae1](https://github.com/ofkm/arcane/commit/f24cae1afcb26090005fe9fab4a9376a6725f749))
- add logged in users name in sidebar ([e86659b](https://github.com/ofkm/arcane/commit/e86659bd94b3d4918ab17c3243d0e3c7a7512cf0))
- image maturity indicator and image update indicators ([#181](https://github.com/ofkm/arcane/issues/181)) ([2eff068](https://github.com/ofkm/arcane/commit/2eff0689efece7c55779665f192223320e836fd4))
- oidc login support ([#172](https://github.com/ofkm/arcane/issues/172)) ([43609a8](https://github.com/ofkm/arcane/commit/43609a85ca9c648d021b3f8291a7390163888db9))

### Bug Fixes

- container logs duplicated and not formatted correctly ([5aa5f04](https://github.com/ofkm/arcane/commit/5aa5f048f6c4b4ca36183c682daf1d3418cc1737))
- duplicated service badge links on stack start ([aca8932](https://github.com/ofkm/arcane/commit/aca8932a787703824c3f35c44851cc37407fabc7))
- selectedIds persisting after api call is returned ([0c01485](https://github.com/ofkm/arcane/commit/0c0148504e29a165afef75b9d07c2794e4371335))
- sort images and containers but uptime and size ([05cc599](https://github.com/ofkm/arcane/commit/05cc5992134040d76624b2e4525b071e0da1cc00))
- stacks not deploying if a health check is defined ([664f330](https://github.com/ofkm/arcane/commit/664f330ac8fef08c71bc8f35b401978f4c9e44bd))
- truncate long images names on dashboard table ([87556c9](https://github.com/ofkm/arcane/commit/87556c94e9f3449977a8f035c0597834c1d82675))
- UI consistency and layout updates ([#185](https://github.com/ofkm/arcane/issues/185)) ([1b85225](https://github.com/ofkm/arcane/commit/1b852257b9e16276e6fc91a87442c375b069ab0f))
- use svg icon over png ([da5a591](https://github.com/ofkm/arcane/commit/da5a591327b2ac78c7ca89a017e6bc7d24d40d6d))

## [0.8.0](https://github.com/ofkm/arcane/compare/v0.7.1...v0.8.0) (2025-05-12)

### Features

- private docker registries ([#162](https://github.com/ofkm/arcane/issues/162)) ([cfeffd2](https://github.com/ofkm/arcane/commit/cfeffd2698e07731ff943f9a816ad1c128e0e3a5))
- remove delete button from actions dropdown menu for bulk removing ([#169](https://github.com/ofkm/arcane/issues/169)) ([cc15fae](https://github.com/ofkm/arcane/commit/cc15fae16b589f6a4fa7e2f09357c8ca9012f177))
- used/unused filtering for images and volumes ([#170](https://github.com/ofkm/arcane/issues/170)) ([451abf8](https://github.com/ofkm/arcane/commit/451abf8a3811bedd6df0619263070273caae7389))

### Bug Fixes

- dockerhost from settings not being respected ([#171](https://github.com/ofkm/arcane/issues/171)) ([258c3f8](https://github.com/ofkm/arcane/commit/258c3f8db2e14572bc70c138dd7c75f19f6d1e12))
- importing stacks if files are in the data/projects directory ([#161](https://github.com/ofkm/arcane/issues/161)) ([9bfb479](https://github.com/ofkm/arcane/commit/9bfb4795ca57b90d6786200b2ab35b4d67d4b82d))
- remove id columns from dashboard tables ([a414cbb](https://github.com/ofkm/arcane/commit/a414cbb5777468b0e2cd4346eac83ba709f03eaa))
- use uid/gid 200 in container ([#156](https://github.com/ofkm/arcane/issues/156)) ([bae85ae](https://github.com/ofkm/arcane/commit/bae85aeb65059d50f4f1ab3f3bc33594e14f966a))

## [0.7.1](https://github.com/ofkm/arcane/compare/v0.7.0...v0.7.1) (2025-05-10)

### Bug Fixes

- compose stacks not starting from the stack directory ([7090c4e](https://github.com/ofkm/arcane/commit/7090c4e0950274e0334bc229e5c3b1435ee3e22d))
- container permissions and removed the need for DOCKER_GID ([dde20c0](https://github.com/ofkm/arcane/commit/dde20c0cff5dea6812e29677dae8254ad41abaa1))
- show error messages in toasts ([#148](https://github.com/ofkm/arcane/issues/148)) ([c5d6b90](https://github.com/ofkm/arcane/commit/c5d6b9069fc9d20f4781452bfe7cc4ead89c9cc9))

## [0.7.0](https://github.com/ofkm/arcane/compare/v0.6.0...v0.7.0) (2025-05-09)

### Features

- container service link for stacks ([#131](https://github.com/ofkm/arcane/issues/131)) ([420cf91](https://github.com/ofkm/arcane/commit/420cf918851b7530ad9c505f8d93b06277309f20))
- use stack names as folder names ([#143](https://github.com/ofkm/arcane/issues/143)) ([537ea9f](https://github.com/ofkm/arcane/commit/537ea9f42f36becb2d5f70e1192cb47ca4c90deb))

### Bug Fixes

- container logs not streaming from server ([#138](https://github.com/ofkm/arcane/issues/138)) ([e5d9903](https://github.com/ofkm/arcane/commit/e5d990332e442c70b72ec6b88efabaaaa297d396))
- container stats not live updating ([#139](https://github.com/ofkm/arcane/issues/139)) ([d4f773c](https://github.com/ofkm/arcane/commit/d4f773c6bf11e6f9e634d14cc623617a8da428f4))
- onboarding errors and protections ([#142](https://github.com/ofkm/arcane/issues/142)) ([bceb0ec](https://github.com/ofkm/arcane/commit/bceb0ec49d4bae1a5d050262b00a8fe068a4c82f))
- redirect to list view after removing a container or stack ([0fa0f03](https://github.com/ofkm/arcane/commit/0fa0f03aa36c6a4da482d06226c075921c232c1e))
- remove stack name link when its external ([7499aee](https://github.com/ofkm/arcane/commit/7499aeeac6ebda4fa1fd5b24cb71b44a1aca30a2))
- use data in relative path for base directory ([29ba132](https://github.com/ofkm/arcane/commit/29ba132eae64fc6eb3e1da57455623b9d3eeeab4))
- use data in relative path for base directory ([7f8dd2c](https://github.com/ofkm/arcane/commit/7f8dd2cb213476ee30baac7faee990d41089d703))

## [0.6.0](https://github.com/ofkm/arcane/compare/v0.5.0...v0.6.0) (2025-05-06)

### Features

- .env configuration support ([#128](https://github.com/ofkm/arcane/issues/128)) ([20e12df](https://github.com/ofkm/arcane/commit/20e12df66afc2ac9e3ef5dea3e1e019d4db7a30b))

### Bug Fixes

- password policy not able to be saved ([976cd83](https://github.com/ofkm/arcane/commit/976cd831bc064062a0329d0975dd1b64dd17bd32))
- remove ping group and iputils from container so GID 999 is available ([4a9e619](https://github.com/ofkm/arcane/commit/4a9e6194cf38a00b4e3a8e71cabd72dd9c896e52))
- user creation button not showing loading state ([d79b2ff](https://github.com/ofkm/arcane/commit/d79b2ff76825f88fbe0c833515a17458bdef5002))

## [0.5.0](https://github.com/ofkm/arcane/compare/v0.4.1...v0.5.0) (2025-05-06)

### Features

- add confiramtion dialog before stopping all running containers ([1a696c0](https://github.com/ofkm/arcane/commit/1a696c08e7b15f13bfdf4b0542d444facbeeb851))

### Bug Fixes

- loading states on action buttons not reflecting status ([8305078](https://github.com/ofkm/arcane/commit/8305078dcd1fd07a89976466d90350d5e05e0b3f))
- session cookie not being created on http sites ([#112](https://github.com/ofkm/arcane/issues/112)) ([0ef6073](https://github.com/ofkm/arcane/commit/0ef6073ac8d5ed5886022199bdcee93837147665))
- use correct cursor on all buttons ([50d4211](https://github.com/ofkm/arcane/commit/50d4211c23743c1e5fda6324be9220e7e367ae05))

## [0.4.1](https://github.com/ofkm/arcane/compare/v0.4.0...v0.4.1) (2025-05-05)

### Bug Fixes

- adjust ownership handling in entrypoint script ([a3ec54a](https://github.com/ofkm/arcane/commit/a3ec54a058548a66ae9e637cdd6e34228c5e995b))

## [0.4.0](https://github.com/ofkm/arcane/compare/v0.3.0...v0.4.0) (2025-05-05)

### Features

- auto update containers and stacks ([#83](https://github.com/ofkm/arcane/issues/83)) ([0a5132f](https://github.com/ofkm/arcane/commit/0a5132fed65df2174b838ddf7e2b8b9ec5277e1f))
- dashboard quick actions ([#77](https://github.com/ofkm/arcane/issues/77)) ([f82380b](https://github.com/ofkm/arcane/commit/f82380b1a483a74c45f5e9f2b3c6919fffe7c051))
- image inspection page ([c3f5665](https://github.com/ofkm/arcane/commit/c3f5665bf5c67077a9d21d33dc23ec0a530ea041))
- network inspection page ([#76](https://github.com/ofkm/arcane/issues/76)) ([89451f9](https://github.com/ofkm/arcane/commit/89451f915bfa38e4b1930fb45fe2d39ccc8815c2))
- user authentication ([#86](https://github.com/ofkm/arcane/issues/86)) ([0ab0df3](https://github.com/ofkm/arcane/commit/0ab0df3638905b6d5714b1470903461fc0b5c3cb))
- volume inspection page ([#75](https://github.com/ofkm/arcane/issues/75)) ([1e6da7d](https://github.com/ofkm/arcane/commit/1e6da7dd0889d0c88abbc8863c71800e0253f52b))

### Bug Fixes

- container table showing when no containers found ([4f63742](https://github.com/ofkm/arcane/commit/4f63742dd584a5d598876497b46c6d6090503938))
- disable autofill for input fields ([c7ff1c0](https://github.com/ofkm/arcane/commit/c7ff1c063161a1bca8aff4b426db0011e8b19f48))
- make sure data is watched by effect ([cd89d48](https://github.com/ofkm/arcane/commit/cd89d48677c1ebb899979663e7ddaeba9410705d))
- set default restart policy to unless-stopped ([4c578e4](https://github.com/ofkm/arcane/commit/4c578e4d9faca22333f15f011ed2c98c46c3ebb3))
- show ipvaln/macvlan ip address on details page ([77495da](https://github.com/ofkm/arcane/commit/77495da4b40a7da02a50deea336ced9a7885abe5))
- use for watching containers ([e99ec10](https://github.com/ofkm/arcane/commit/e99ec10787af07e4f4e27e7fb8195c45ccde00c7))

## [0.3.0](https://github.com/ofkm/arcane/compare/v0.2.0...v0.3.0) (2025-04-27)

### Features

- add container resource card ([37ec736](https://github.com/ofkm/arcane/commit/37ec736c4bb0c58bb2bf65681e04ad5e4bd280a1))
- add create container logic ([#53](https://github.com/ofkm/arcane/issues/53)) ([23b6e86](https://github.com/ofkm/arcane/commit/23b6e861a337a0fe8ec85443a82a1506f898517c))
- add in-use/unused badge on volumes and images ([75ea68b](https://github.com/ofkm/arcane/commit/75ea68b04164f734af5d9fdc560fd983620d6a96))
- mass-delete images, volumes, and networks ([#69](https://github.com/ofkm/arcane/issues/69)) ([b56303e](https://github.com/ofkm/arcane/commit/b56303e60e6d3a57aec4826f29df8811458c534c))
- settings page overhaul ([#48](https://github.com/ofkm/arcane/issues/48)) ([f5ac649](https://github.com/ofkm/arcane/commit/f5ac649f004f6abfdae3d3db9441d63c8bf200c9))

### Bug Fixes

- add api endpoints for stacks and container actions ([#73](https://github.com/ofkm/arcane/issues/73)) ([6844e35](https://github.com/ofkm/arcane/commit/6844e35153e674ae82e7e39c39041e0710cef955))
- add link to container details in table column ([72bd842](https://github.com/ofkm/arcane/commit/72bd8425439fdbca4cf44af2035869d0e5dc9406))
- custom badge colors and look ([a1e59bd](https://github.com/ofkm/arcane/commit/a1e59bd895fa681332b13dd8a6e668ef885a5c14))
- disable checkbox if stack is external ([93884eb](https://github.com/ofkm/arcane/commit/93884ebeaffec8412f1e4ab6371b6d2c19cf596d))
- image pulling not repecting user defined tag ([41af290](https://github.com/ofkm/arcane/commit/41af2909f79b8e6e5d4fc7bc0a0e26193ad59dd0))
- remove badges on detail pages ([1da4c79](https://github.com/ofkm/arcane/commit/1da4c791f22a03214953a3786bfa1bb9dc54f062))
- remove badges on detail pages ([4404bd2](https://github.com/ofkm/arcane/commit/4404bd268b61b79118198b52899585f05f21b2ab))
- remove docker connected label from sidebar ([13d9060](https://github.com/ofkm/arcane/commit/13d90601af75c0df2ae7eefc389778b567ff5ddb))
- restore yaml editor functionality ([f0484ec](https://github.com/ofkm/arcane/commit/f0484ecca5ca399769d73ca7ac6c164c4b5b3bc9))
- show docker engine version in card ([8e5fc5b](https://github.com/ofkm/arcane/commit/8e5fc5b3eea8db26f11ebfe951402093addd97f6))
- show total image size in dashboard card ([9e4749c](https://github.com/ofkm/arcane/commit/9e4749ccd42538e3b44b2e919322daff8da40220))
- stacks not saving on edit ([ba13d7b](https://github.com/ofkm/arcane/commit/ba13d7bbda14349d5f25cafa74ce74284448bc38))
- unused badge color and layout ([67e5bc5](https://github.com/ofkm/arcane/commit/67e5bc552f814af8d4e77a26f415c58a65c4de4f))
- use new status badge instead of custom-badge ([90303a6](https://github.com/ofkm/arcane/commit/90303a64a749bcc9754ce8cdaa3a1597c5dbbe9b))

## [0.2.0](https://github.com/ofkm/arcane/compare/v0.1.1...v0.2.0) (2025-04-23)

### Features

- add yaml editor component ([#44](https://github.com/ofkm/arcane/issues/44)) ([165404a](https://github.com/ofkm/arcane/commit/165404a184868f50440d0eebad7cdbaf3b2cb359))
- implement full docker compose spec ([#45](https://github.com/ofkm/arcane/issues/45)) ([103707f](https://github.com/ofkm/arcane/commit/103707fe353b6deddeaba597dd3248f635d37dc3))
- link stack containers to container details page ([#41](https://github.com/ofkm/arcane/issues/41)) ([2939909](https://github.com/ofkm/arcane/commit/29399095cd9757e3955b350fece0f37852b7d99b))

## [0.1.1](https://github.com/ofkm/arcane/compare/v0.1.0...v0.1.1) (2025-04-22)

### Bug Fixes

- container details card layout ([94fde0e](https://github.com/ofkm/arcane/commit/94fde0e470043b519d27dfd6e5aa0c27779496ae))
- container env details layout ([b2f7e28](https://github.com/ofkm/arcane/commit/b2f7e28fd31875c768c845ab4cbbc8e99406ea01))
- container port details layout ([721cacb](https://github.com/ofkm/arcane/commit/721cacb35292ec06060afbc6fa0b4f7fbddaca08))
- log display improvements ([8343c9d](https://github.com/ofkm/arcane/commit/8343c9d3dd71cb85297de817a97c764b455848b6))
- make container details grid more reponsive ([17b5abf](https://github.com/ofkm/arcane/commit/17b5abf55d5f37a6f02ae4d7f236c9a65beb63ba))
