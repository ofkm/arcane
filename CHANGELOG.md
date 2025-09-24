## v1.2.2

### Bug fixes

* container registry test connection not checking the correct endpoint([9d2c251](https://github.com/ofkm/arcane/commit/9d2c2513a2f6b610d895002af00ade1a0f1c0cc5) by @kmendell)
* project save button not the correct size([7872080](https://github.com/ofkm/arcane/commit/787208046bebf153ad2fbc807f921a119e60723f) by @kmendell)
* use correct headers and cors values for websockets ([#553](https://github.com/ofkm/arcane/pull/553) by @kmendell)
* remove project updater logic, prune images after updating ([#556](https://github.com/ofkm/arcane/pull/556) by @kmendell)
* don't override env vars with default settings ([#558](https://github.com/ofkm/arcane/pull/558) by @kmendell)
* use correct json body for system prune([13e35fd](https://github.com/ofkm/arcane/commit/13e35fdcb7541bdfcecc8f85a01802d50cf723f9) by @kmendell)

### Performance Improvements

* optimize dockerfile([f2e8bd3](https://github.com/ofkm/arcane/commit/f2e8bd375f2b8f4c852b13d235d72f15f9bdf411) by @kmendell)

### Other

* add pull request title validation([e129344](https://github.com/ofkm/arcane/commit/e1293448843f429cd6510594575ec564a581a68c) by @kmendell)
* add recommended extensions([539e00b](https://github.com/ofkm/arcane/commit/539e00ba00b668b5ff573a9b36d354782b03f7a0) by @kmendell)
* .github/workflows: Migrate workflows to Blacksmith runners ([#555](https://github.com/ofkm/arcane/pull/555) by @blacksmith-sh[bot])
* extract digest retrieval logic into a separate function([5b012ff](https://github.com/ofkm/arcane/commit/5b012ffa51a237eeb3efdad1c09ce1180abade07) by @kmendell)
* remove blacksmith runners([0b4fee5](https://github.com/ofkm/arcane/commit/0b4fee5309cf9b5e5153337e59495b70562869cb) by @kmendell)
* fix go linter([274cb4a](https://github.com/ofkm/arcane/commit/274cb4af8ca9ee24624ab642fc601a278880fcb7) by @kmendell)
* ignore linter on init function([b3d5974](https://github.com/ofkm/arcane/commit/b3d5974fd9d4d54476265ee4bab6e8e1e9b9385f) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v1.2.1...v1.2.2

## v1.2.1

### Bug fixes

* use correct settings return type([02db09a](https://github.com/ofkm/arcane/commit/02db09a0402c62087cf3a6aa89b80fe684b3f9d9) by @kmendell)
* use correct running container count in dashboard metric([98a9cfa](https://github.com/ofkm/arcane/commit/98a9cfafb5505553252fc88b4f45dbf3d7ae3eb4) by @kmendell)
* show correct stats for remote environments on dashboard ([#549](https://github.com/ofkm/arcane/pull/549) by @kmendell)

### Dependencies

* bump the backend-dependencies group in /backend with 3 updates ([#540](https://github.com/ofkm/arcane/pull/540) by @dependabot[bot])
* bump the prod-dependencies group with 6 updates ([#548](https://github.com/ofkm/arcane/pull/548) by @dependabot[bot])

### Other

* fix changelog with correct information([f20de40](https://github.com/ofkm/arcane/commit/f20de405d07377a5d0974a37f6938047c5bfa108) by @kmendell)
* bump the prod-dependencies group with 6 updates ([#538](https://github.com/ofkm/arcane/pull/538) by @dependabot[bot])
* bump the dev-dependencies group across 1 directory with 3 updates ([#545](https://github.com/ofkm/arcane/pull/545) by @dependabot[bot])
* add concurrency settings to E2E tests workflow([fe7ee76](https://github.com/ofkm/arcane/commit/fe7ee76dec653fc7f00874b26d613e903e138234) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v1.2.0...v1.2.1

## v1.2.0

### New features

* analytics plugin for number of instances ([#483](https://github.com/ofkm/arcane/pull/483) by @kmendell)
* use websockets for streaming logs ([#495](https://github.com/ofkm/arcane/pull/495) by @kmendell)
* use websockets for dashboard stats ([#496](https://github.com/ofkm/arcane/pull/496) by @kmendell)
* add pull progress popover when deploying project ([#512](https://github.com/ofkm/arcane/pull/512) by @kmendell)
* add build cache checkbox to prune dialog([5db08fc](https://github.com/ofkm/arcane/commit/5db08fc2ea41630cac69ba15c42bfcda885d4f83) by @kmendell)
* screen responsive navigation ([#516](https://github.com/ofkm/arcane/pull/516) by @cabaucom376)
* redesigned projects page ([#464](https://github.com/ofkm/arcane/pull/464) by @kmendell)
* settings page ui refresh ([#518](https://github.com/ofkm/arcane/pull/518) by @cabaucom376)
* ui configuration from env variables ([#526](https://github.com/ofkm/arcane/pull/526) by @kmendell)
* support PWA icons ([#529](https://github.com/ofkm/arcane/pull/529) by @cabaucom376)

### Bug fixes

* update default admin user printed in logs, also print the default admin password on first run([5d3a66c](https://github.com/ofkm/arcane/commit/5d3a66cdce07cb8cd509be729a880a8e81877ac9) by @kmendell)
* update network usage detection to account for networks in use([4170985](https://github.com/ofkm/arcane/commit/417098513f0621bcc2e4cd7c7040994a4187a702) by @kmendell)
* use distribution reference for image digests ([#484](https://github.com/ofkm/arcane/pull/484) by @kmendell)
* load working directory before dotenv for projects([232d62e](https://github.com/ofkm/arcane/commit/232d62ec19c191873861e31bfb27be08401fa512) by @kmendell)
* correctly validate and parse compose projects on load ([#492](https://github.com/ofkm/arcane/pull/492) by @kmendell)
* reload interface when switching environments([53c0aa4](https://github.com/ofkm/arcane/commit/53c0aa43dc7d43582a4b64ef3a4618613178d004) by @kmendell)
* dashboard not showing remote environment information([3a7b858](https://github.com/ofkm/arcane/commit/3a7b858a89dee7948326542796afdcbfa993bf9b) by @kmendell)
* image polling value allows any number ([#501](https://github.com/ofkm/arcane/pull/501) by @kmendell)
* password change not being accepted by the backend([e82b114](https://github.com/ofkm/arcane/commit/e82b11489acd8d790ed8573ba32079561d8ccf97) by @kmendell)
* use better wording on project action buttons and redploy dialog([bb25ac2](https://github.com/ofkm/arcane/commit/bb25ac240327054a444d220b721f33af98ff3179) by @kmendell)
* only watch env or compose files in filesystem watcher job([c957681](https://github.com/ofkm/arcane/commit/c957681dc46e43e7f963d22a4721499056def220) by @kmendell)
* templates wouldnt allow empty files to be loaded in the ui([33b8303](https://github.com/ofkm/arcane/commit/33b8303b09b126de76bb008eae5be2ec6e6336f2) by @kmendell)
* use projectId for saving instead of projectName([1cb7ab2](https://github.com/ofkm/arcane/commit/1cb7ab2f93a86f281903e3b72726e6c5e9be4794) by @kmendell)
* ignore root files in template directory([637460a](https://github.com/ofkm/arcane/commit/637460ab4628719a298d7790e57193da084107dd) by @kmendell)
* minor styling issue ([#528](https://github.com/ofkm/arcane/pull/528) by @cabaucom376)
* dont skip .env resolution([d8af378](https://github.com/ofkm/arcane/commit/d8af378f04dd1081f51d9aa3f06f81cdeae2b65d) by @kmendell)

### Performance Improvements

* improve websocket logs performance ([#534](https://github.com/ofkm/arcane/pull/534) by @kmendell)

### Dependencies

* bump the prod-dependencies group with 4 updates ([#480](https://github.com/ofkm/arcane/pull/480) by @dependabot[bot])
* bump the backend-dependencies group across 1 directory with 2 updates([ec7e6cb](https://github.com/ofkm/arcane/commit/ec7e6cb725e7cab70a6c9cd0da5664c4dba5d3a1) by @dependabot[bot])
* bump the backend-dependencies group across 1 directory with 2 updates ([#485](https://github.com/ofkm/arcane/pull/485) by @dependabot[bot])
* bump the prod-dependencies group with 7 updates ([#522](https://github.com/ofkm/arcane/pull/522) by @dependabot[bot])

### Other

* add service unit tests([99e8a68](https://github.com/ofkm/arcane/commit/99e8a68d87dcc815d3b4b66e5998a77cfa7451ab) by @kmendell)
* fix lints in tests([d3d50fb](https://github.com/ofkm/arcane/commit/d3d50fbf943b9bdb1b8804ae8e3f8fbfbf30731f) by @kmendell)
* move the app version check to the backend ([#473](https://github.com/ofkm/arcane/pull/473) by @kmendell)
* inject default http client into services([441f8a4](https://github.com/ofkm/arcane/commit/441f8a429798c250c9cf52442ed7a883740d2582) by @kmendell)
* make helper in loading projects([694607c](https://github.com/ofkm/arcane/commit/694607c4a4e7b5a2de916e28ece7372435b00431) by @kmendell)
* bump @types/node in the dev-dependencies group([e9f2f74](https://github.com/ofkm/arcane/commit/e9f2f7444bd5efe18da4251cc544b6c798e4f148) by @dependabot[bot])
* bump @types/node from 24.3.1 to 24.4.0 in the dev-dependencies group ([#481](https://github.com/ofkm/arcane/pull/481) by @dependabot[bot])
* use correct analytics host([c44aaec](https://github.com/ofkm/arcane/commit/c44aaec2b92bf191a5e684624f38bbff9c25a5fd) by @kmendell)
* bump @types/node from 24.4.0 to 24.5.0 in the dev-dependencies group ([#494](https://github.com/ofkm/arcane/pull/494) by @dependabot[bot])
* bump the prod-dependencies group across 1 directory with 3 updates ([#499](https://github.com/ofkm/arcane/pull/499) by @dependabot[bot])
* add download docker script([d61d12a](https://github.com/ofkm/arcane/commit/d61d12a95e04d9428d7f98f9681a2e2af4c0c7c4) by @kmendell)
* use compose-go for project releated functions ([#508](https://github.com/ofkm/arcane/pull/508) by @kmendell)
* add ARG TARGETARCH back to static docker files([86e799f](https://github.com/ofkm/arcane/commit/86e799f288c784c2b9534a8a9b7711a868e0aeee) by @kmendell)
* bump the prod-dependencies group with 3 updates ([#504](https://github.com/ofkm/arcane/pull/504) by @dependabot[bot])
* container-based development workflow with hot reload and VS Code integration ([#509](https://github.com/ofkm/arcane/pull/509) by @cabaucom376)
* cleanup go module([932824c](https://github.com/ofkm/arcane/commit/932824c1ba805a663512b8c19fa87330253dcd93) by @kmendell)
* Auto close VSCode terminals when tasks are finished ([#511](https://github.com/ofkm/arcane/pull/511) by @cabaucom376)
* include version in changelog([80fd46e](https://github.com/ofkm/arcane/commit/80fd46eea69ee92c082288361215b18a9e942900) by @kmendell)
* use local build for arcane-agent([f9a962e](https://github.com/ofkm/arcane/commit/f9a962e63ed4e7e7b10e1951726c6605fc4fe83f) by @kmendell)
* split logic for stats ws([d43a256](https://github.com/ofkm/arcane/commit/d43a25650692290b7b9ca03e30c6fb802ad4c2ac) by @kmendell)
* bump svelte from 5.38.10 to 5.39.1 in the prod-dependencies group ([#513](https://github.com/ofkm/arcane/pull/513) by @dependabot[bot])
* bump the dev-dependencies group with 2 updates ([#505](https://github.com/ofkm/arcane/pull/505) by @dependabot[bot])
* add merge conflict labeler action([04a6c2b](https://github.com/ofkm/arcane/commit/04a6c2b313a1815ff41dbf536ab9db0101602886) by @kmendell)
* simplify filesystem watcher([ae159f9](https://github.com/ofkm/arcane/commit/ae159f9d38faf191f9f64cc6db31455162fb4947) by @kmendell)
* cleanup sidebar translation keys([b5615c4](https://github.com/ofkm/arcane/commit/b5615c449a996516f6bc0037b5670310c5bed193) by @kmendell)
* fix updated sidebar text([2440475](https://github.com/ofkm/arcane/commit/24404754d98820c1fddf6c890289a3089b471337) by @kmendell)
* update projects header to new key([4912746](https://github.com/ofkm/arcane/commit/49127464754cd920e3215790ca375b543dfbbe5a) by @kmendell)
* bump vite from 7.1.5 to 7.1.6 in the dev-dependencies group ([#521](https://github.com/ofkm/arcane/pull/521) by @dependabot[bot])
* cleanup template service ([#523](https://github.com/ofkm/arcane/pull/523) by @kmendell)
* remove dead and unused code ([#525](https://github.com/ofkm/arcane/pull/525) by @kmendell)
* use git cliff for releases (thanks pocket-id :))([d742817](https://github.com/ofkm/arcane/commit/d742817ccd9c01abeaed366bb87c1576f67e4f0f) by @kmendell)
* refine settings pages ([#532](https://github.com/ofkm/arcane/pull/532) by @cabaucom376)
* update cliff.toml to include deps([9101ca3](https://github.com/ofkm/arcane/commit/9101ca3113edb284b0c188128e611a86f00c06df) by @kmendell)
* fix builds for release([191ffc1](https://github.com/ofkm/arcane/commit/191ffc1bc0b713f9114ec7e0bb6904efa9dbf6ad) by @kmendell)
* only build mac binaires on mac host([b60a87d](https://github.com/ofkm/arcane/commit/b60a87d2c4d3369c25ee45f475495cb737f1aea9) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v1.1.0...v1.2.0

## v1.1.0

### New features

* persistent table filters, page size, and column headers ([#449](https://github.com/ofkm/arcane/pull/449) by @kmendell)
* move quick actions to the header for more simplified look([f0b43b6](https://github.com/ofkm/arcane/commit/f0b43b67f645c1ef842e5ce215dd8e8c349fe573) by @kmendell)
* container port links and overview ([#457](https://github.com/ofkm/arcane/pull/457) by @kmendell)
* allow underscores in project names([2b464db](https://github.com/ofkm/arcane/commit/2b464db4a851eaba3e88295237f0be0b7f350815) by @kmendell)
* add usage badge to network table([6019045](https://github.com/ofkm/arcane/commit/60190456dd4687ac360610dd3c9a941c7d36d2a3) by @kmendell)

### Bug fixes

* check for updates only checking the current page of images([0da46a0](https://github.com/ofkm/arcane/commit/0da46a046aabfcc2721996583a8ad73ccf07277c) by @kmendell)
* do not recursive chown the /app/data/projects directory in entrypoint([368612a](https://github.com/ofkm/arcane/commit/368612a8f072e59d63745a700f6de9f8c588b033) by @kmendell)
* make auto-update off by defualt on fresh installs([129c5c5](https://github.com/ofkm/arcane/commit/129c5c5e1f8e69efbc8b9af496baa56046e3b6e4) by @kmendell)
* dont allow the auto updater to update arcane it self([4b0931e](https://github.com/ofkm/arcane/commit/4b0931e52935580d3040aced090ce8c39850d51b) by @kmendell)
* do not stop arcanes container it self when using the quick action([0166084](https://github.com/ofkm/arcane/commit/016608442b052df71ede8c94dff1346c4e4f6551) by @kmendell)
* project save button not using the correct styles([9825c4a](https://github.com/ofkm/arcane/commit/9825c4aa15a59c626580e5aa6f6d39cc23843613) by @kmendell)
* use correct time for auto update job([e7a5a31](https://github.com/ofkm/arcane/commit/e7a5a3173f8f24ceccf34497915e1b845d377b43) by @kmendell)
* use correct running container count on dashboard([3dad327](https://github.com/ofkm/arcane/commit/3dad32721a0e53e6f44e2f73959e1d315835d36a) by @kmendell)
* projects are not searchable([31ce3e9](https://github.com/ofkm/arcane/commit/31ce3e9866981f16cb2e838c7e419ef332c67249) by @kmendell)
* add /api/health endpoint to agent mode([83f0bc0](https://github.com/ofkm/arcane/commit/83f0bc0b3305ecbc420b05968bfe79f3dd47c344) by @kmendell)
* update banner link not clickable([69e95e0](https://github.com/ofkm/arcane/commit/69e95e0457f5a317f1b7928039bd3719dd70471d) by @kmendell)
* allow use of the local templates directory ([#462](https://github.com/ofkm/arcane/pull/462) by @kmendell)
* reschedule jobs when polling or autoupdate job settings is changed([5c3f168](https://github.com/ofkm/arcane/commit/5c3f1687dd6ab5dfb06526fb2af9b40693e60b2c) by @kmendell)

### Dependencies

* bump the prod-dependencies group across 1 directory with 6 updates ([#446](https://github.com/ofkm/arcane/pull/446) by @dependabot[bot])

### Other

* add newer zsh release script([f91fe88](https://github.com/ofkm/arcane/commit/f91fe88ee120bcfc6e72e19b7bfe8999cc919aa3) by @kmendell)
* bump package manager version to pnpm 10.16.0([1313e54](https://github.com/ofkm/arcane/commit/1313e54c3680da9ec909b2a56e89f916e43b9ac3) by @kmendell)
* remove un-needed alert for auto update and polling enabled([f2606b7](https://github.com/ofkm/arcane/commit/f2606b750af2c8f2d6cd500590073f87ae1d6886) by @kmendell)
* cleanup old service port logic on compose page([34b87c7](https://github.com/ofkm/arcane/commit/34b87c767be9cd81eb2f2d38f1772c5b6f880e1b) by @kmendell)
* fix linter([4f1c9a9](https://github.com/ofkm/arcane/commit/4f1c9a9d8cd2c7e188e8369e3593e39732310554) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v1.0.2...v1.1.0

## v1.0.2

### Bug fixes

* streamline image reference handling by stripping digests and ensuring tags([c2a3b7d](https://github.com/ofkm/arcane/commit/c2a3b7d566b0590bc2b7e6cd9af5d79a5d20192b) by @kmendell)
* volume usage displays incorrectly([eb92b4f](https://github.com/ofkm/arcane/commit/eb92b4f3d0862cfa3848adadf7dc393fa9c99746) by @kmendell)
* dashboard meters not using consistant styling in light/dark mode([21a93f5](https://github.com/ofkm/arcane/commit/21a93f528ff53fc830d0504f7994ff932503d3c6) by @kmendell)
* update layout of sidebar and fix the missing label for language selector([2150088](https://github.com/ofkm/arcane/commit/215008860f781ca79c203b295ce04b674222d941) by @kmendell)
* show correct counts for stat cards ([#437](https://github.com/ofkm/arcane/pull/437) by @kmendell)
* update learn more link for templates page([60e3d9b](https://github.com/ofkm/arcane/commit/60e3d9bba72533963599517e2cbf48941443c080) by @kmendell)
* remove extra image id cell in image table([d288295](https://github.com/ofkm/arcane/commit/d288295360eda0286237b8586d257aae691a59d9) by @kmendell)
* volume usage filters not filtering volumes([2d8437d](https://github.com/ofkm/arcane/commit/2d8437dc41b772074fcc8a34b8e471a77baa497d) by @kmendell)
* image pruning not respecting selected prune mode([e8b9207](https://github.com/ofkm/arcane/commit/e8b9207fafeea1526513d6f51abed1751c6a3d88) by @kmendell)

### Dependencies

* bump actions/attest-build-provenance from 2 to 3 ([#410](https://github.com/ofkm/arcane/pull/410) by @dependabot[bot])
* bump the go_modules group across 1 directory with 2 updates ([#412](https://github.com/ofkm/arcane/pull/412) by @dependabot[bot])
* bump the backend-dependencies group in /backend with 9 updates ([#414](https://github.com/ofkm/arcane/pull/414) by @dependabot[bot])
* bump the frontend-major-updates group with 2 updates ([#421](https://github.com/ofkm/arcane/pull/421) by @dependabot[bot])
* bump actions/download-artifact from 4 to 5 ([#411](https://github.com/ofkm/arcane/pull/411) by @dependabot[bot])
* bump the backend-dependencies group in /backend with 2 updates ([#436](https://github.com/ofkm/arcane/pull/436) by @dependabot[bot])

### Other

* fix release script([bf03a23](https://github.com/ofkm/arcane/commit/bf03a23184e7d1fc8f80c6f07d2fa3d9a5f52f70) by @kmendell)
* fix changelog([4882ad4](https://github.com/ofkm/arcane/commit/4882ad48cc7f2c733b0f0ae92fca838ad04ca156) by @kmendell)
* add discord link([2bfe94a](https://github.com/ofkm/arcane/commit/2bfe94af2e9fcfa267170fdda8b9c4bc295398ff) by @kmendell)
* update docker-compose.yml ([#426](https://github.com/ofkm/arcane/pull/426) by @sugarfunk)
* update agent docker compose([a7d464f](https://github.com/ofkm/arcane/commit/a7d464f036a84b7e2785d38773c39dfd1566b408) by @kmendell)
* bump the dev-dependencies group with 5 updates ([#420](https://github.com/ofkm/arcane/pull/420) by @dependabot[bot])
* remove 1.0 feedback issue([6b3f073](https://github.com/ofkm/arcane/commit/6b3f073b5eeacee159d4cfbc0450ea95f0c91966) by @kmendell)
* bump the prod-dependencies group with 13 updates ([#419](https://github.com/ofkm/arcane/pull/419) by @dependabot[bot])
* add Chinese files([e62083c](https://github.com/ofkm/arcane/commit/e62083c57c8dba0fe3666980579729a978365f17) by @kmendell)
* fix go linter([2bb66a0](https://github.com/ofkm/arcane/commit/2bb66a00b267f4800d249bd40f3d3f19fab6b545) by @kmendell)
* fix svelte check issues for code editor([2fc6c3b](https://github.com/ofkm/arcane/commit/2fc6c3ba5d2bb45958960cc086c8ecdede84aaf8) by @kmendell)
* make action buttons bindable([7b1c8f3](https://github.com/ofkm/arcane/commit/7b1c8f3e3053cc5ce01fadcd5f263f0074f58046) by @kmendell)
* refcator release workflow to have builds run in parallel([583c767](https://github.com/ofkm/arcane/commit/583c767fa44cb179664b7cd85267e892b8b04b31) by @kmendell)
* add Esperanto and French files([1daa17e](https://github.com/ofkm/arcane/commit/1daa17e953195a525300d6f34549dc019ac4c6cf) by @kmendell)
* update french name([6d9f43f](https://github.com/ofkm/arcane/commit/6d9f43f7b5587f4eca39275b4f65fa0d95281e34) by @kmendell)
* add missing translation([b308d36](https://github.com/ofkm/arcane/commit/b308d36cbed722e968c438342f41e70fe7b9eb70) by @kmendell)
* bump the prod-dependencies group with 3 updates ([#433](https://github.com/ofkm/arcane/pull/433) by @dependabot[bot])
* bump eslint-plugin-svelte from 3.12.2 to 3.12.3 in the dev-dependencies group ([#434](https://github.com/ofkm/arcane/pull/434) by @dependabot[bot])
* consolidate registry logic into a cleaner structure ([#443](https://github.com/ofkm/arcane/pull/443) by @kmendell)
* fix publish-release setp in releae workflow([a7ac9dc](https://github.com/ofkm/arcane/commit/a7ac9dc52937e67c4b32c91a0615e665e7aa2b43) by @kmendell)
* login before container attestations([eeb1d63](https://github.com/ofkm/arcane/commit/eeb1d63c887e94dda2a86180c3afc24fb0428026) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v1.0.1...v1.0.2

## v1.0.1

### Bug fixes

* register project handler to fix projects not pulling([038ebf6](https://github.com/ofkm/arcane/commit/038ebf61e9e8bff6ec899e9591e9c6fdb4c3db86) by @kmendell)
* onboarding not showing on fresh installs([51fa03a](https://github.com/ofkm/arcane/commit/51fa03ac6e61e5820963208c5e16977ccbfb9bd5) by @kmendell)
* onboarding flow not using correct values([c75839c](https://github.com/ofkm/arcane/commit/c75839c7d9910a71da971b87b9745af24fc8adb5) by @kmendell)
* use non secure cookie if running on http([fb2e6d9](https://github.com/ofkm/arcane/commit/fb2e6d9fd61918b615fabc45f42400ca10e6660c) by @kmendell)
* allow both http and https cookie names([b3b9f71](https://github.com/ofkm/arcane/commit/b3b9f7159ed51e388dbd208b070f35ded6ec48df) by @kmendell)

### Dependencies

* bump actions/setup-go from 5 to 6 ([#418](https://github.com/ofkm/arcane/pull/418) by @dependabot[bot])
* bump actions/cache from 3 to 4 ([#408](https://github.com/ofkm/arcane/pull/408) by @dependabot[bot])
* bump devalue to 5.3.2([5bb0880](https://github.com/ofkm/arcane/commit/5bb08809f5f4a6de80a6b8945e3992287dcb2d44) by @kmendell)

### Other

* fix dependabot paths([197ca6c](https://github.com/ofkm/arcane/commit/197ca6cfcb2d78869240d82d7586edc4fa4ce090) by @kmendell)
* use static build for agent-next image([75f14fd](https://github.com/ofkm/arcane/commit/75f14fda40767a0b85833120e9578148a075abc3) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v1.0.0...v1.0.1

## v1.0.0

### Bug fixes

* project files not removed when deleteing from the ui([65c93c6](https://github.com/ofkm/arcane/commit/65c93c6f91f9ed922f5584d158264c80f4607385) by @kmendell)

### Other

* update workflow to set dockerfile path([3f21d64](https://github.com/ofkm/arcane/commit/3f21d64661678fb12556eb7b8c0873b2f70ab2fd) by @kmendell)
* add agent preview workflow([f5e838d](https://github.com/ofkm/arcane/commit/f5e838dcb1f83c804abc21ddc5071f6f006b273c) by @kmendell)
* combined preview workflows([52386d9](https://github.com/ofkm/arcane/commit/52386d9ef2855baea6d486e8f748ef166a58fed3) by @kmendell)
* refactor encryption logic([3e59fc5](https://github.com/ofkm/arcane/commit/3e59fc54bda01bcdedeae8dc7f441905fe99a11b) by @kmendell)
* move health check to dedicated api endpoint([d52c308](https://github.com/ofkm/arcane/commit/d52c30820607b61cb3b0310635331e4c847629fc) by @kmendell)
* refactor and simplify cookies([c70523a](https://github.com/ofkm/arcane/commit/c70523aa346a9c50010d1d30d31e5794a75e995b) by @kmendell)
* cleanup auth middleware, refactor logging([09431a3](https://github.com/ofkm/arcane/commit/09431a3140ff5eefda387ec5c27e014f0afd7fb2) by @kmendell)
* cleanup old settings keys([9b65e72](https://github.com/ofkm/arcane/commit/9b65e72f2ecb051c6e4005b6a1a43505beed808e) by @kmendell)
* translate files([d75a3fc](https://github.com/ofkm/arcane/commit/d75a3fcf684a235f966ad8e4a381c9a4d6f4f456) by @kmendell)
* build frontend for svelte check([ce1b035](https://github.com/ofkm/arcane/commit/ce1b035ef762486b4b4e349041bebb6bd365aac3) by @kmendell)
* fix translations key([167225d](https://github.com/ofkm/arcane/commit/167225d37eb771fad1b4370caae88fabd7c40e9b) by @kmendell)
* add crowdin file and fix tests([fb1008c](https://github.com/ofkm/arcane/commit/fb1008cdee36dc2436afcc344e730ec87f2f6200) by @kmendell)
* add ci skip tag to config([fa23075](https://github.com/ofkm/arcane/commit/fa2307530beb73c48974c5dd5920f28092f15332) by @kmendell)
* update repo resources([7e58de2](https://github.com/ofkm/arcane/commit/7e58de2d4b57368cd5fdcfbaa162dd10b5cd5547) by @kmendell)
* update env example([3181371](https://github.com/ofkm/arcane/commit/318137195294a54e5b2f2d1443b6f8751960217b) by @kmendell)
* fix workflows runs([c50108c](https://github.com/ofkm/arcane/commit/c50108c5e85b194531642d57e67912f6bc8e74d5) by @kmendell)
* add Nederlands files([87ce674](https://github.com/ofkm/arcane/commit/87ce67446c66df18334ee7b467cf320b68df21a1) by @kmendell)
* refactor test utilities([69ba1d0](https://github.com/ofkm/arcane/commit/69ba1d02350712b80baf943c73aa151d417b478d) by @kmendell)
* add container spec([136230d](https://github.com/ofkm/arcane/commit/136230d5d14cd6ee87de554c0c4430d0a06967c1) by @kmendell)
* add registry spec([87b3604](https://github.com/ofkm/arcane/commit/87b36042ac56d6b41258a67aa10f827054fdfc28) by @kmendell)
* add 1.0 feedback issue template([67f5a8a](https://github.com/ofkm/arcane/commit/67f5a8a9f7e5c905a33ca75c538de1576342598e) by @kmendell)
* prepare for merge([c9fe3bd](https://github.com/ofkm/arcane/commit/c9fe3bdb144be3c09bae4e22543582831f6df6ac) by @kmendell)
* update release scripts([6fc67ca](https://github.com/ofkm/arcane/commit/6fc67ca71eb044cf9d4b57ad0553c77e5410907f) by @kmendell)
* fix next image pipefall([5e9528b](https://github.com/ofkm/arcane/commit/5e9528b0bb2732db658fab2355893ab0b35b05f5) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/1.0-preview...v1.0.0

## 1.0-preview

### New features

* zod v4 form validation, and sheet based forms ([#301](https://github.com/ofkm/arcane/pull/301) by @kmendell)
* remote environments ([#305](https://github.com/ofkm/arcane/pull/305) by @kmendell)
* redesign login page([8063f08](https://github.com/ofkm/arcane/commit/8063f08bbcfc6caf8642185f70767fb607f1f157) by @kmendell)
* events are now shown in the ui ([#355](https://github.com/ofkm/arcane/pull/355) by @kmendell)
* migrate logging to json([b66afe2](https://github.com/ofkm/arcane/commit/b66afe258028c373f18f126403b70ce719d8efa9) by @kmendell)
* migrate logging to json([6ea6c77](https://github.com/ofkm/arcane/commit/6ea6c77dc55faa629919ce626e1c6e5cf08ee07e) by @kmendell)
* change port to 3552, cleanup old code([9705277](https://github.com/ofkm/arcane/commit/970527767b11b8eca774e68e0c64de3bd2e97d9e) by @kmendell)
* add copier utility functions for struct mapping([477c2d5](https://github.com/ofkm/arcane/commit/477c2d5d7e9a7635026ba305e15e643fc970870c) by @kmendell)
* show error status for image updates, show if a credential was used([7718605](https://github.com/ofkm/arcane/commit/7718605ea7386d7eba281b5ef98d3c1e18b33417) by @kmendell)
* add event details dialog([d14609c](https://github.com/ofkm/arcane/commit/d14609c4535ddc87a09385ead4acdcc0ccf920fb) by @kmendell)
* enhance volume details with container names and IDs([1c5cb35](https://github.com/ofkm/arcane/commit/1c5cb359d4f54612fd5107d6a1643a74e01304ad) by @kmendell)

### Bug fixes

* mismtached json type for database([44dbd27](https://github.com/ofkm/arcane/commit/44dbd27b00810d98e58cdad30961d8581fa4c1ca) by @kmendell)
* stack logic ([#313](https://github.com/ofkm/arcane/pull/313) by @kmendell)
* cleanup hooks and layout logic and disable SSR so local development works([e3750e5](https://github.com/ofkm/arcane/commit/e3750e5359e5faeab0bedbfa850481b26d8f7d1d) by @kmendell)
* image maturity/update logic([92ed4a0](https://github.com/ofkm/arcane/commit/92ed4a02937fc01448c56489981c4d017062e685) by @kmendell)
* switch from bcrypt to argon2 for password hashing([1485a53](https://github.com/ofkm/arcane/commit/1485a53044e7b0f1bb8c159fe1dcd45e7836f763) by @kmendell)
* lazy load all resources([066eadc](https://github.com/ofkm/arcane/commit/066eadcd64ff3c44f3ae76693c338a969fe55952) by @kmendell)
* template loading and usage([c994404](https://github.com/ofkm/arcane/commit/c994404d48c7a8ab7eabc88128656ea4bcf207f1) by @kmendell)
* update system meters dynamically([16e41cf](https://github.com/ofkm/arcane/commit/16e41cfcfb483f78f45b666f7f1e064346bf5b26) by @kmendell)
* add more options for onboarding ([#321](https://github.com/ofkm/arcane/pull/321) by @kmendell)
* auto update service logic ([#323](https://github.com/ofkm/arcane/pull/323) by @kmendell)
* incorrect user reponse structure and missing types([4622ca6](https://github.com/ofkm/arcane/commit/4622ca6b6c9b137dc9fe4d3cc3c5802f1a9f7703) by @kmendell)
* layout shift when using dropdown menus([e404eee](https://github.com/ofkm/arcane/commit/e404eee5f4179727ee31054b2559732825e17066) by @kmendell)
* show create container sheet([aa089c5](https://github.com/ofkm/arcane/commit/aa089c5b7b074f4510e6cb9421a4d8bbda3339ff) by @kmendell)
* simplify sqlite string, and make sure postgres migrations work([1a01113](https://github.com/ofkm/arcane/commit/1a01113aa77cd57a5c4d71fd2c159de0460c4373) by @kmendell)
* use containerId for removing containers([20cf8c9](https://github.com/ofkm/arcane/commit/20cf8c94701a70cf3f7f0a0f6f981cde72324333) by @kmendell)
* truncate volume name text([5111195](https://github.com/ofkm/arcane/commit/5111195a7f3eacd4aad9dfc246b948da8425f2f4) by @kmendell)
* onboarding oidc config([cadda0a](https://github.com/ofkm/arcane/commit/cadda0aa7a8bc1f77bce7b8997af58e08b113ded) by @kmendell)
* image dropdown not deleting images([12a2e8d](https://github.com/ofkm/arcane/commit/12a2e8d56b3a459627a8f1e78b848679d92e0539) by @kmendell)
* only show floating header after scrolling on compose page([6582e1e](https://github.com/ofkm/arcane/commit/6582e1e036b37f05a85d48d6eadb1a742a06aba8) by @kmendell)
* remove unused prop([3d8a350](https://github.com/ofkm/arcane/commit/3d8a350812e6829dadc6e03fa55e6d56e0180d1b) by @kmendell)
* use correct redirect after login([58a4340](https://github.com/ofkm/arcane/commit/58a43404ef3bde179cd86b3568bfb1be3105493e) by @kmendell)
* add loading indicators to metric cards, fix some styling on the dashboard([d9be7cc](https://github.com/ofkm/arcane/commit/d9be7cc5d809856c13fbf4f20819402aa7ce4ba3) by @kmendell)
* cleanup docker settings page ui([4874a48](https://github.com/ofkm/arcane/commit/4874a48c6bd23410ec1b8026742b3575fd028c8f) by @kmendell)
* use Arcane as page title for all pages([c1f4aed](https://github.com/ofkm/arcane/commit/c1f4aed593cadb980624072266a00eba5b7a6032) by @kmendell)
* only show edit user button for local users([a0eb2f4](https://github.com/ofkm/arcane/commit/a0eb2f421a99d018f8a347cd598f8b9f8e542790) by @kmendell)
* use correct destructive variant for user dropdown menu([84fb150](https://github.com/ofkm/arcane/commit/84fb1506b6bb7808ff96bf4c715b00d94fd051e7) by @kmendell)
* add missing props to button([044396c](https://github.com/ofkm/arcane/commit/044396c641cc3713976e0ed4b846470b2db53e0b) by @kmendell)
* revert redirect in layout([c659707](https://github.com/ofkm/arcane/commit/c65970710f16cbe2ae2547a474c64be4779ee08e) by @kmendell)
* make System username red on event table([0a8bff6](https://github.com/ofkm/arcane/commit/0a8bff6186246ea0643b6063db4cedff3d121013) by @kmendell)
* correct counts of containers and images on dashboard([520a18a](https://github.com/ofkm/arcane/commit/520a18a52a8e3ac437efa7b418804eb8ae96495a) by @kmendell)
* remove missing util file([23d7745](https://github.com/ofkm/arcane/commit/23d7745baf0f27a886169646e9413d6099b7525a) by @kmendell)
* remove oidc client secret from api reponses([4ab9a9d](https://github.com/ofkm/arcane/commit/4ab9a9d9ecbb98840a57a2c64c0e01ff8c0edd9b) by @kmendell)
* session validation timeouts([a267b91](https://github.com/ofkm/arcane/commit/a267b91506ec1cea1f7e6c983d05aa5826353cda) by @kmendell)
* optimize conversion of slog attributes for logging([10df97f](https://github.com/ofkm/arcane/commit/10df97f27b4a70c12b51ff3f186d28be6bdcc2b1) by @kmendell)
* settings not saving on submission([520178b](https://github.com/ofkm/arcane/commit/520178b28141ce697c63a12f4b92da64de573a95) by @kmendell)
* only allow role changes for oidc users([f5a3302](https://github.com/ofkm/arcane/commit/f5a3302f846b063e74ff6e10259e22c6fc331713) by @kmendell)
* status badge color is now reactive([8c2c24d](https://github.com/ofkm/arcane/commit/8c2c24df79179f00f127e697f913107a2ff7fd37) by @kmendell)
* remove ping group and utility in Dockerfile-static([c7ff050](https://github.com/ofkm/arcane/commit/c7ff050c56848807cf2133e8d7673d00a826ae58) by @kmendell)
* show x of x running for conatiner metric card([a03f336](https://github.com/ofkm/arcane/commit/a03f3365b3454343c125715d40de8649e2b9b260) by @kmendell)
* use dockerInfo for container and image counts([3413dc4](https://github.com/ofkm/arcane/commit/3413dc43192aa841d7b34178b889f2bc5e5baf68) by @kmendell)
* use dedicated endpoint for totalImageSize([58edb08](https://github.com/ofkm/arcane/commit/58edb08bdda3413ea07d2e3d018188d0917166cc) by @kmendell)
* return correct network reponse data on page load([b767fd5](https://github.com/ofkm/arcane/commit/b767fd577afcd1c123d42f3af019b214b7e1f980) by @kmendell)
* return correct event api reponse on page load([f9f3082](https://github.com/ofkm/arcane/commit/f9f3082667686225003eb7a73f92cb9bf8af0684) by @kmendell)
* use correct container data in api on page load([d33dedc](https://github.com/ofkm/arcane/commit/d33dedc77e2fc355b61238ced48f3f3492b56185) by @kmendell)
* use correct volume data in api on page load([c9bbffe](https://github.com/ofkm/arcane/commit/c9bbffe8ad141820ddfeb89e480ba0dd1c8ae8bf) by @kmendell)
* make onboardin security settings page the same as the normal settings page([20800ef](https://github.com/ofkm/arcane/commit/20800efb47ececf2d7ad32844dabc3bb491f27ce) by @kmendell)
* use correct image api reponse data([a08882a](https://github.com/ofkm/arcane/commit/a08882adc2fa46c081aa5574aa4e800b8494c277) by @kmendell)
* persist Docker image ID as primary key and improve tag selection logic([6e7ac85](https://github.com/ofkm/arcane/commit/6e7ac853da7f675f3ce1ce8867c447203b290035) by @kmendell)
* enhance container stats and configuration display with derived flags for environment variables, ports, labels, and network settings([3a232df](https://github.com/ofkm/arcane/commit/3a232df5f43a1dd3114f705742f62b2689aee715) by @kmendell)
* improve error handling and streaming logic in GetStatsStream and GetLogsStream methods([3a407d3](https://github.com/ofkm/arcane/commit/3a407d3da18ec0b04ca8a02680b96c2903249ac0) by @kmendell)
* add validation for stack ID and improve error handling in GetStackLogsStream method([57f25d2](https://github.com/ofkm/arcane/commit/57f25d2851e6762eb9416c4bd05434c9af0f42d6) by @kmendell)
* enhance login response to include token pair and set cookie for password change([587a656](https://github.com/ofkm/arcane/commit/587a656540d6de7f22b5a8679e60a893933fd07c) by @kmendell)
* make image update item reactive with status once clicked([fe5caf6](https://github.com/ofkm/arcane/commit/fe5caf639b6a35cf19b53d8a1c78fe1133fdba0d) by @kmendell)
* add user ID validation in token verification process([5595894](https://github.com/ofkm/arcane/commit/55958945c077eeabea17cf43694fb6256c2756c2) by @kmendell)
* refactor user creation logic to use CreateUser type and improve type safety([6ccb106](https://github.com/ofkm/arcane/commit/6ccb106795f9376d58ec04b1809e8ae5bebe138f) by @kmendell)
* projects page wont load if no stacks are found([320edc9](https://github.com/ofkm/arcane/commit/320edc9596ef382e49d58fcaa9949f5f5b4d37d7) by @kmendell)
* image table disappears when filtering images([12c6d9c](https://github.com/ofkm/arcane/commit/12c6d9c1d9bdff2348720bbe99a8a39eaa55077d) by @kmendell)
* pagination round one fixes (containers, images, and projects)([8349d1b](https://github.com/ofkm/arcane/commit/8349d1b84a85f2b112b54ab527e38fd390c18872) by @kmendell)
* stopAll button use the correct count([8bd2f5c](https://github.com/ofkm/arcane/commit/8bd2f5cec774fffe6bf612004b690dbcc878fe7c) by @kmendell)
* use new image detail type([63f8211](https://github.com/ofkm/arcane/commit/63f821186d105ab7f2aa17a37bb6f4ddf01a94af) by @kmendell)
* auth session redirect([9da620a](https://github.com/ofkm/arcane/commit/9da620a9534052d3aa0c9e26ca5c41cfe3cc7caa) by @kmendell)
* user display not showing in sidebar([e059cf2](https://github.com/ofkm/arcane/commit/e059cf2cb1ce78ea28e0a968d7690a67dd8ab594) by @kmendell)
* make sure oidc uses refresh tokens([9f185eb](https://github.com/ofkm/arcane/commit/9f185eba457f7f2ccf74ffa24753e6b3924efb50) by @kmendell)
* auth redirect (i hope)([92c1685](https://github.com/ofkm/arcane/commit/92c1685c238e87d19fb56a54c40f6c6b20f6b157) by @kmendell)
* sidebar shows on logon([6f14c05](https://github.com/ofkm/arcane/commit/6f14c050c899633d3e6feb83ff71c81fda3475b1) by @kmendell)
* redirect to /compose after project delete([ca8b4c6](https://github.com/ofkm/arcane/commit/ca8b4c6254f0da2a8d4f94a08ca3593be1988b87) by @kmendell)
* rework templates with new schema ([#389](https://github.com/ofkm/arcane/pull/389) by @kmendell)
* update link to template settings in dialog component([55b8fb5](https://github.com/ofkm/arcane/commit/55b8fb5fa4fcc85f4ad8969a7acf7666acc78a4a) by @kmendell)
* fix performance of projects page and rely only on filesystem watcher for updating the database([dee13bc](https://github.com/ofkm/arcane/commit/dee13bcb3eecea7ee939e817e4e39364a9e871b3) by @kmendell)
* add container force removal checkboxes([6e449b2](https://github.com/ofkm/arcane/commit/6e449b2af26161284b4fc548e9cb9fb8fea5b82d) by @kmendell)
* use prune mode behavior([751f7c7](https://github.com/ofkm/arcane/commit/751f7c74e3a3f70aa121b6a52a08f3ce37ec1801) by @kmendell)
* global prune not pruning volumes([6a55fa1](https://github.com/ofkm/arcane/commit/6a55fa1a054ca49b49fa479d1610961859460f7d) by @kmendell)
* do not allow auth method to be turned off is only one is enabled([b310334](https://github.com/ofkm/arcane/commit/b3103347455525623781722670a8dbb21d6d4820) by @kmendell)
* container details page not laoding([c5e5b51](https://github.com/ofkm/arcane/commit/c5e5b51756e246b990fea23556b7754206450a94) by @kmendell)
* move auto updater to just updater confirm working with projects([1382213](https://github.com/ofkm/arcane/commit/1382213820ce7a70d9ccac4ed0fea1b4b6d41bf8) by @kmendell)
* do not run auto update job on container start([97736be](https://github.com/ofkm/arcane/commit/97736bef8e624d00e69e928f34da99dcc5d1e115) by @kmendell)
* cleanup of orphaned image update records after applying updates([31155c5](https://github.com/ofkm/arcane/commit/31155c5ca8ae6f8d982f8c616bd0612fc2f75784) by @kmendell)
* add missing isAdmin prop([659933a](https://github.com/ofkm/arcane/commit/659933a342bb8063d78048ea767542d62d0a1423) by @kmendell)
* add exclude label for updater([123f575](https://github.com/ofkm/arcane/commit/123f5753ce23515cc8d2cd1e2e12965e221d0665) by @kmendell)
* use prefered  username in oidc cliams([ee46e9a](https://github.com/ofkm/arcane/commit/ee46e9aabe84b96fa1e1e49b40a1ca1b441f4b73) by @kmendell)
* restore translucency to badges([1a93bdc](https://github.com/ofkm/arcane/commit/1a93bdc3f3bd8609b763177a1789398221c46209) by @kmendell)
* remove container registry field data on sheet reopen([66f26f5](https://github.com/ofkm/arcane/commit/66f26f5ea613e6e378909667609f3255fa8c34c2) by @kmendell)
* use correct cookie timeout value([8b247a5](https://github.com/ofkm/arcane/commit/8b247a5c1d5c4342ca716eb7d2f411ee68357eb2) by @kmendell)
* correctly use minute value for sessions timeout([3b3c9f4](https://github.com/ofkm/arcane/commit/3b3c9f4e24512adeed49033eca2cc4c440e4fc1c) by @kmendell)

### Documentation

* update development docs([a9e0037](https://github.com/ofkm/arcane/commit/a9e0037e616bcb36ff14bfcb1620e960e9d6b118) by @kmendell)
* update remote environment documentation([9e21050](https://github.com/ofkm/arcane/commit/9e21050043bbf372099f33d54ba639c299dcd593) by @kmendell)
* update docusaurus to 3.8.1([0df0b3a](https://github.com/ofkm/arcane/commit/0df0b3ab0de28f0c470a52ac62ecab1575699f1a) by @kmendell)
* switch to refined-cf-pages-action for deploying site([b24ca61](https://github.com/ofkm/arcane/commit/b24ca615766d55fabdf14810c4f5519794c58b1d) by @kmendell)
* update configuration docs([eaac425](https://github.com/ofkm/arcane/commit/eaac425feceed249af01a3a1f7ee861ac03a1dfc) by @kmendell)

### Other

* use user-store for storing user([c124cdd](https://github.com/ofkm/arcane/commit/c124cddf3468b97f7550fb03cf52a405c3ad24cb) by @kmendell)
* fix tests([88797db](https://github.com/ofkm/arcane/commit/88797db25b88e0d49129b7e3f1d4f371e28d3778) by @kmendell)
* add go linter([1b04d74](https://github.com/ofkm/arcane/commit/1b04d74c67be57c1e4fb9b6ae5cc6d04ee694dea) by @kmendell)
* exclude frontend([29221ea](https://github.com/ofkm/arcane/commit/29221eaa50db026c14bd21b95dcb49ab2aa15742) by @kmendell)
* add gomod to dependabot([e5502fd](https://github.com/ofkm/arcane/commit/e5502fd61fecceac1533a7f42f6ef9a7685d5635) by @kmendell)
* remove agent-dto from frontend([f34166b](https://github.com/ofkm/arcane/commit/f34166b8f0cf806a955b97ed11f2fe1f0ecd1265) by @kmendell)
* fix type errors ([#311](https://github.com/ofkm/arcane/pull/311) by @kmendell)
* fix doc upload path([3843c7f](https://github.com/ofkm/arcane/commit/3843c7f88491069868c04e13cc05fdc0a8705fd0) by @kmendell)
* merge two preview workflows([0591973](https://github.com/ofkm/arcane/commit/059197394e7ba7122bf96a1ee22412ccd7a3621d) by @kmendell)
* update build paths for prod deployment([7a1ccbd](https://github.com/ofkm/arcane/commit/7a1ccbd0c8e6b0dc8a110bf545f6d6bc0e68ffc0) by @kmendell)
* fix go lint issues ([#312](https://github.com/ofkm/arcane/pull/312) by @kmendell)
* fix some tests([3dad305](https://github.com/ofkm/arcane/commit/3dad3054ddb6d60b6eb8e5c694aa4356bc803cc4) by @kmendell)
* upgrade npm packages([c412f32](https://github.com/ofkm/arcane/commit/c412f328839a263cd40a83b3784d65305aa4be19) by @kmendell)
* upgrade npm packages([1a3201e](https://github.com/ofkm/arcane/commit/1a3201e8353fd42779375531d035c4cdc5af4f9c) by @kmendell)
* use correct converter service([3e01a42](https://github.com/ofkm/arcane/commit/3e01a4266b50a4583aa0c43999f0a129c7001c99) by @kmendell)
* remove old csrf([ce8166a](https://github.com/ofkm/arcane/commit/ce8166addf0286682db8c9094dda332026b40547) by @kmendell)
* enable hot reloading for backend([d0b8f67](https://github.com/ofkm/arcane/commit/d0b8f672f38e5ffaf0bcee8a86c7989b12ed51dc) by @kmendell)
* remove unused function([6bc8f0c](https://github.com/ofkm/arcane/commit/6bc8f0c531947fa5f8ad76b8c6fb618b619acc18) by @kmendell)
* fix error handling([e750ba0](https://github.com/ofkm/arcane/commit/e750ba04247364e1c68a3e0d580a9c3dc820bfa0) by @kmendell)
* improve error handling in DeployStack method([72c57dd](https://github.com/ofkm/arcane/commit/72c57dd5051456ffbf35de5fe1d91ddae7eb9e5a) by @kmendell)
* remove air .bin directory([68402db](https://github.com/ofkm/arcane/commit/68402db1503c0d805e8faba3a6230ac1a556ba8a) by @kmendell)
* improve ui/ux of lazy loading on dashboard([6ce5094](https://github.com/ofkm/arcane/commit/6ce50946b48dfc80e84a2ef383d539ad781a501b) by @kmendell)
* clean up some ui elements([9282252](https://github.com/ofkm/arcane/commit/9282252e599863b420b79e22bac985018b01ab60) by @kmendell)
* use Geist font([362c50c](https://github.com/ofkm/arcane/commit/362c50cce3c368282d3157c41157d6381d855ec5) by @kmendell)
* add font files([866525f](https://github.com/ofkm/arcane/commit/866525f7c5f5aa6fbaf4f3d5de3211532d1e5acf) by @kmendell)
* fix go linter issues([e1613b1](https://github.com/ofkm/arcane/commit/e1613b1346cbc765a937dd7f446103a15993a5ac) by @kmendell)
* fix svelte check([fd10ad0](https://github.com/ofkm/arcane/commit/fd10ad002d09e2286bdb35ab5fd0ebe269eb0980) by @kmendell)
* pagination models and logic ([#330](https://github.com/ofkm/arcane/pull/330) by @kmendell)
* image update indicator ([#340](https://github.com/ofkm/arcane/pull/340) by @kmendell)
* update dropdown menu component([cde041a](https://github.com/ofkm/arcane/commit/cde041a068531e08e908a92324c1d5a2c6f89df3) by @kmendell)
* fix some layout issues([7ef9edf](https://github.com/ofkm/arcane/commit/7ef9edff70f66612e971428e28638616301a7255) by @kmendell)
* cleanup metric cards([9528cf6](https://github.com/ofkm/arcane/commit/9528cf6f63d69d2c402da91d5500a5c3b3bda6d0) by @kmendell)
* relayout dashboard([bcee55a](https://github.com/ofkm/arcane/commit/bcee55af1a36cba30f32a8396121e7bdba0077f1) by @kmendell)
* use destructive variant for dropdowns([d5de0dd](https://github.com/ofkm/arcane/commit/d5de0ddcbe186539df403fee4b6eede7947a316d) by @kmendell)
* cleanup networks table([ee6cb4c](https://github.com/ofkm/arcane/commit/ee6cb4ca93d06d8cb8ad137f588a13ef24a0fae9) by @kmendell)
* add back link for images([133866f](https://github.com/ofkm/arcane/commit/133866fa83326115750727778532bd4ec180ceef) by @kmendell)
* stop website deployments on push([f1b0691](https://github.com/ofkm/arcane/commit/f1b0691d563573fe12c0311f3a0afe8e2a5c37d6) by @kmendell)
* use capital letter for state text([c48106f](https://github.com/ofkm/arcane/commit/c48106fd88cda48e25760c3a47108ddde8457fa6) by @kmendell)
* fix incorrect docker type([5b4488a](https://github.com/ofkm/arcane/commit/5b4488af7b656d52a2883734cee017af3c507641) by @kmendell)
* improve compose states and importing logic([8a11c76](https://github.com/ofkm/arcane/commit/8a11c764be0ccd456390d4f74b86cd09b2c43caa) by @kmendell)
* cleanup some repo files([82ac390](https://github.com/ofkm/arcane/commit/82ac390defad278db6eaa7263726b93ff6ceaa8d) by @kmendell)
* fix lockfile([b900a77](https://github.com/ofkm/arcane/commit/b900a776ce0fe6d5b0f6bb08b05e9a4bb2bbafac) by @kmendell)
* remove unused import([faa561d](https://github.com/ofkm/arcane/commit/faa561de8c4e6063ed611e92a9c43275a8a2d7f3) by @kmendell)
* add backend logic for playwright tests and fix exsisting tests ([#350](https://github.com/ofkm/arcane/pull/350) by @kmendell)
* add docker build tag for e2e tests([933668d](https://github.com/ofkm/arcane/commit/933668df6521dec8b2a830cf97e61ad97967a075) by @kmendell)
* use npm install over npm ci([c9e0366](https://github.com/ofkm/arcane/commit/c9e036688e69979bb72bac93f4be974199a289e4) by @kmendell)
* cleanup e2e tests workflow([92a6726](https://github.com/ofkm/arcane/commit/92a67263879fd1446b059fbbd24b7950f08c4cfd) by @kmendell)
* remove --build from tests([28fc996](https://github.com/ofkm/arcane/commit/28fc996972375870257270c6d9644c9f78bffdab) by @kmendell)
* fix go lint issues([fc90831](https://github.com/ofkm/arcane/commit/fc9083123f0259836218bbb9c18981c038e1a231) by @kmendell)
* update dependabot path([52022e6](https://github.com/ofkm/arcane/commit/52022e605c79c65ccf1064dd540b254f56071400) by @kmendell)
* use oidc well-known to discover urls ([#351](https://github.com/ofkm/arcane/pull/351) by @kmendell)
* cleanup github assets, and remove docs and doc workflows([00be577](https://github.com/ofkm/arcane/commit/00be57785d1c7d8133a0f0ad89e41dce95610e02) by @kmendell)
* update readme with development note ([6aa482a](https://github.com/ofkm/arcane/commit/6aa482a1a82d3a6938e0e169830eeb58221e3d01) by @kmendell)
* add preview workflow([3f9450a](https://github.com/ofkm/arcane/commit/3f9450ac5d4f50c30055b4e1a77cdeff86af84bc) by @kmendell)
* add qemu to preview workflow([285fea8](https://github.com/ofkm/arcane/commit/285fea85a6ed943b8d4548e73af32dbc20bc0009) by @kmendell)
* update preview workflow([74685ca](https://github.com/ofkm/arcane/commit/74685cae9dcf1cd90f4d50b2d5adaba76d611d6a) by @kmendell)
* update preview workflow to use 1.0-preview([63d7dec](https://github.com/ofkm/arcane/commit/63d7deccd6ac2a100d3cb1023c6295ca2c1bde50) by @kmendell)
* auto update now uses the new image_update_service([550ae59](https://github.com/ofkm/arcane/commit/550ae59512eecddb049e91d9a30d6cbab94001f2) by @kmendell)
* switch to sql migrations, and key value store for settings ([#353](https://github.com/ofkm/arcane/pull/353) by @kmendell)
* fix svelte check([4103356](https://github.com/ofkm/arcane/commit/41033566e9cec74a5a7dde4d7a1d6d1e915d4de4) by @kmendell)
* fix go linter([4948dde](https://github.com/ofkm/arcane/commit/4948dde46b954cc426faabeb9ececb71ac393729) by @kmendell)
* frontend stack to project migration([9809d51](https://github.com/ofkm/arcane/commit/9809d51c7421f19765f2b2134c31ab47254bfa2d) by @kmendell)
* add project pages tests([31fcedd](https://github.com/ofkm/arcane/commit/31fcedd69b4933ef44aca375e8e563743b5759b5) by @kmendell)
* add a static projects folder for tests([0dd2a2e](https://github.com/ofkm/arcane/commit/0dd2a2e1024b47ba95ad59093349066687cef135) by @kmendell)
* fix fk migrations([e8954c0](https://github.com/ofkm/arcane/commit/e8954c0967f65bf27f52adddb51d6f99cd6a0d93) by @kmendell)
* add missing cases to event service([651e8f3](https://github.com/ofkm/arcane/commit/651e8f3c4b3243315f9135b0d33f553334ad94eb) by @kmendell)
* remove selected labels([6e3fd3e](https://github.com/ofkm/arcane/commit/6e3fd3eca11a28dc62ba73c69258b6ad6ea20c5e) by @kmendell)
* fix e2e tests([c0ca6c3](https://github.com/ofkm/arcane/commit/c0ca6c32bbcf8a0524f4fc6c945f1fafc34e83aa) by @kmendell)
* fix the layout of some pages([8c95616](https://github.com/ofkm/arcane/commit/8c95616e526caaa2e1af0d50af354db662d42f69) by @kmendell)
* add updated error page([708bf42](https://github.com/ofkm/arcane/commit/708bf4240e66f40eee03a660f0af3aeb0db920af) by @kmendell)
* restyle toast prompts([4441989](https://github.com/ofkm/arcane/commit/44419897bc5f9b3d5736989d0a53b6382f79b178) by @kmendell)
* redesign loading indicator([601a64e](https://github.com/ofkm/arcane/commit/601a64e7682c8f4b8d0b7a50c8bd388aa7e2257e) by @kmendell)
* fix some minor issues([ff95d7e](https://github.com/ofkm/arcane/commit/ff95d7ec20aa2e998b6046510ae8ee590eb197ca) by @kmendell)
* update to go 1.25([c0a5d94](https://github.com/ofkm/arcane/commit/c0a5d94370dc2109216a5e924ba3b236e101c9ef) by @kmendell)
* update to go 1.25([b02cbf0](https://github.com/ofkm/arcane/commit/b02cbf09cdd26a94cd391a0162525e8de9c846d4) by @kmendell)
* update checkout action to v5 and improve cache dependency path([4709771](https://github.com/ofkm/arcane/commit/4709771d25b3a65d8c9a2500a32f4a7864c4ab5a) by @kmendell)
* improve stack listing by detaching cache update context and removing unused fields([2bfef50](https://github.com/ofkm/arcane/commit/2bfef50afc8baef3b455abf23e599e4bc7a4a14a) by @kmendell)
* use uuid as ID in base model([082d4ef](https://github.com/ofkm/arcane/commit/082d4eff58f4d2c54812cc3e4d24a81f46c77103) by @kmendell)
* remove image size from dashboard([a0f8def](https://github.com/ofkm/arcane/commit/a0f8defe6dd987c76918a020d6a31aa8a89cf92a) by @kmendell)
* fix linter([bc56777](https://github.com/ofkm/arcane/commit/bc567772c0ce2cbbdc956face95de58eb636ddbc) by @kmendell)
* test new svelte check workflow([b869d3f](https://github.com/ofkm/arcane/commit/b869d3f9a8c83b5f399b3e9102925d54080ed685) by @kmendell)
* test new svelte check workflow([0532a94](https://github.com/ofkm/arcane/commit/0532a94a7cd9965486c8f4a43a6773d0a2747a4e) by @kmendell)
* revert svelte check workflow([27f4154](https://github.com/ofkm/arcane/commit/27f4154394d8e3d5702df98f4bc4cee354bc96e3) by @kmendell)
* dont lint update settings([cdfc209](https://github.com/ofkm/arcane/commit/cdfc209a731a672d10646feb829845fda89b4f71) by @kmendell)
* update tests to port 3552([8c6baa4](https://github.com/ofkm/arcane/commit/8c6baa4956d36c1bb90440421ec34d28a1cb6f55) by @kmendell)
* update remaining 8080 ports to 3552([97af662](https://github.com/ofkm/arcane/commit/97af66248b22e833c2c709cdd3306633b9d40f88) by @kmendell)
* switch to pnpm and add release workflows([25ddecd](https://github.com/ofkm/arcane/commit/25ddecdd07757669a1f29adb7aa7fc6cb8b4c061) by @kmendell)
* update dockerfile with pnpm([6298cc5](https://github.com/ofkm/arcane/commit/6298cc52ce73d1815924ae1658751d756344936a) by @kmendell)
* simplify docker file([0b9a7f5](https://github.com/ofkm/arcane/commit/0b9a7f5fd6cafdf16f97ab41aee0045a21d24013) by @kmendell)
* add required deps and restructure docker file([9b93ea3](https://github.com/ofkm/arcane/commit/9b93ea385809cbaeaf657c76dc4b3bfd87e40554) by @kmendell)
* update @codemirror/language dependency to version 6.11.3([0f68dea](https://github.com/ofkm/arcane/commit/0f68deaf4353e76f9d393b65f211a12ce8e7f34f) by @kmendell)
* add missing @codemirror/lint and @codemirror/state dependencies([62e8ba1](https://github.com/ofkm/arcane/commit/62e8ba1a8d97d8b2e114ccd37e6e290e8eaaf4a8) by @kmendell)
* add 1.0 preview release workflow([2eb1448](https://github.com/ofkm/arcane/commit/2eb1448fea46fa6e44885e56a6e39c041d98db1a) by @kmendell)
* use static for 1.0 preview([7399b28](https://github.com/ofkm/arcane/commit/7399b2808f8ebf49e1c40663f31b0657e2165c91) by @kmendell)
* update Dockerfile and migration logic for SQLite, add new dependencies([f723ed1](https://github.com/ofkm/arcane/commit/f723ed1d4ad19b3571a87f6dd5c07cdc7ac5e52c) by @kmendell)
* add correct packages to Dockerfile-static([94a85df](https://github.com/ofkm/arcane/commit/94a85df13bb501ff807223385ff595642ac0c2e2) by @kmendell)
* add timestamp to preview release([6a60a67](https://github.com/ofkm/arcane/commit/6a60a6774985c5f2a6a37c2afcdc85e8aa9ceb5a) by @kmendell)
* move the 1.0-preview tag to latest commit([95cd7c6](https://github.com/ofkm/arcane/commit/95cd7c6691bc1d2373a962e8b175d66ded60af44) by @kmendell)
* remove advanced codeql([7e5196c](https://github.com/ofkm/arcane/commit/7e5196ced35f558d13a948b2bb5d1382a7696ccd) by @kmendell)
* fix svelte check([3e073e8](https://github.com/ofkm/arcane/commit/3e073e825f87ab9d7c5bc2348df519798176b721) by @kmendell)
* cleanup([2b713ea](https://github.com/ofkm/arcane/commit/2b713ea9a5306d1e4cc4b055415ac54af0e6038e) by @kmendell)
* cleanup image,stack, and network services([66084a4](https://github.com/ofkm/arcane/commit/66084a40dddf8ca0297c1f248c9571f1bead8540) by @kmendell)
* cleanup more backend services and restructure dtos([a66ea02](https://github.com/ofkm/arcane/commit/a66ea025f2a1b4d74aab22dc0ac8fcb071afce88) by @kmendell)
* models and services to remove user session handling([feb9dfb](https://github.com/ofkm/arcane/commit/feb9dfbd950626cc9e35a8041340478322c08e2f) by @kmendell)
* add backend unit tests and implement registry utility tests([9e6bdfc](https://github.com/ofkm/arcane/commit/9e6bdfc2f2d7268bb3191290e5da7ba823a2e304) by @kmendell)
* update backend tests workflow to include GCC installation and enable race detection([ae7e660](https://github.com/ofkm/arcane/commit/ae7e6605813d9271a270918e3bf7214b375c6a95) by @kmendell)
* add build tags to unit tests([18db647](https://github.com/ofkm/arcane/commit/18db647a84526fa3e61b9f8a0d4462264cc1d01d) by @kmendell)
* fix linter([5e097b4](https://github.com/ofkm/arcane/commit/5e097b43cf7dc2947647258031948b2de5ff4cfb) by @kmendell)
* improve error handling and response validation in image fetching logic([a434c6e](https://github.com/ofkm/arcane/commit/a434c6e8633bbf2f1accb1cb82dbb08bc2c29c9e) by @kmendell)
* update tables names to remove _table([7a2d823](https://github.com/ofkm/arcane/commit/7a2d823d076f6d23493ca4df2638519aca56c597) by @kmendell)
* add both sqlite and postgres e2e tests([c2a39c8](https://github.com/ofkm/arcane/commit/c2a39c8099cf84a8cf222d415b000461f5de2cae) by @kmendell)
* remove comments([6fa04e6](https://github.com/ofkm/arcane/commit/6fa04e6e847e6de19413117abe4ad9498a348d08) by @kmendell)
* add fs watcher utility to sync the stacks when a change is made on the filesystem([f465d36](https://github.com/ofkm/arcane/commit/f465d3645e0d3a7c3e6693a33828557a83bdbccc) by @kmendell)
* cleanup on some auth services([c724e47](https://github.com/ofkm/arcane/commit/c724e47aa5e75944da52783789f8e64dbd8afa4f) by @kmendell)
* move some helpers to utils([3b51b65](https://github.com/ofkm/arcane/commit/3b51b65de1c437c3ae759fbb35f76a987a91ab1b) by @kmendell)
* fix linter([2a8cd2a](https://github.com/ofkm/arcane/commit/2a8cd2abe77dbfb2b849a230ec823e80ff344bac) by @kmendell)
* remove and refactor some tests([b58c9ce](https://github.com/ofkm/arcane/commit/b58c9ce5232760d517942f782e787059aea09cb3) by @kmendell)
* fix test selectors([aab7202](https://github.com/ofkm/arcane/commit/aab72022da59fa87fc161d7b41f4a4c889f93ed5) by @kmendell)
* remove lockfile install for tests([13ce35f](https://github.com/ofkm/arcane/commit/13ce35f29a9dd64b3b65c550fc6ea80fc999b8f6) by @kmendell)
* test new svelte check workflow([02cd170](https://github.com/ofkm/arcane/commit/02cd1700238fdd0db2df041dd1120a0d4ff4d71e) by @kmendell)
* network and volume handling in frontend and backend([6f2442a](https://github.com/ofkm/arcane/commit/6f2442ad26633c64f0cd49ea3e32ae01efd61d60) by @kmendell)
* fix linter([ce1b2de](https://github.com/ofkm/arcane/commit/ce1b2de4cf7ed36d3b66ece16ac1da18cbf7e1d1) by @kmendell)
* fix volume tests([a813667](https://github.com/ofkm/arcane/commit/a81366741d3c4254d699c5ec9619ada3673b6ecb) by @kmendell)
* add network.spec([11b3c30](https://github.com/ofkm/arcane/commit/11b3c306c5ab5760c08c560a4cbdfa1b575a582a) by @kmendell)
* fix go linter([e362bad](https://github.com/ofkm/arcane/commit/e362badab0678f6dabcff6b288fff04af7a255ea) by @kmendell)
* recreate arcane table using tanstack table ([#390](https://github.com/ofkm/arcane/pull/390) by @kmendell)
* fix go linter([6e8f2f3](https://github.com/ofkm/arcane/commit/6e8f2f37e8b945a1a6c819987062cd8b99ff5bfd) by @kmendell)
* enhance encryption initialization and key handling([e2e8ddb](https://github.com/ofkm/arcane/commit/e2e8ddbe13d720f4a12321bba3b467466c4ba765) by @kmendell)
* cleanup logging([2a3fb4e](https://github.com/ofkm/arcane/commit/2a3fb4ed0b397acd508cd1d14a7f11256b6c7b2e) by @kmendell)
* update SettingVariable methods to use value receiver and add recvcheck linter([6e5ab7f](https://github.com/ofkm/arcane/commit/6e5ab7fbb2e12bafe3d8845477adb6d19b6ec64d) by @kmendell)
* project creation and edit form validation using zod([ee807fe](https://github.com/ofkm/arcane/commit/ee807feb2287a869ae8bfd741f7e5d8792c8f415) by @kmendell)
* add image pull popover when pulling projects([2edc661](https://github.com/ofkm/arcane/commit/2edc661020bc6135d3354eb11d4d0dd62627af48) by @kmendell)
* add arrow to popover([2923311](https://github.com/ofkm/arcane/commit/292331116f53e1ae657f2ac717b30d17a3d6c354) by @kmendell)
* move progress popover to its own component([c83995d](https://github.com/ofkm/arcane/commit/c83995d70cd3c5ca3e7bbee62f3b65d627babb7c) by @kmendell)
* improve log viewer performance([b53c3fc](https://github.com/ofkm/arcane/commit/b53c3fc4bdc8d93f0a6bb92a91e84d7c67e246b3) by @kmendell)
* redesign dashboard([41a4b8b](https://github.com/ofkm/arcane/commit/41a4b8b5de6dd785625ee530283fdd2cb2feda11) by @kmendell)
* code editor rework ([#396](https://github.com/ofkm/arcane/pull/396) by @kmendell)
* update lockfile([2a7b582](https://github.com/ofkm/arcane/commit/2a7b582332eff199516d75d47b2dcaa94c0e267e) by @kmendell)
* update tests to use new dropdown button([586cf29](https://github.com/ofkm/arcane/commit/586cf29cf21d7d06921aed278339f4ae0aacbde6) by @kmendell)
* remove old unused test([0858131](https://github.com/ofkm/arcane/commit/085813153953d76695f7349e223d5711b84c374f) by @kmendell)
* always pull latest test images([bc13ca2](https://github.com/ofkm/arcane/commit/bc13ca243fb842852bfe2e53883e5d63687ca965) by @kmendell)
* fix lints([94178d6](https://github.com/ofkm/arcane/commit/94178d622f8d5c6ad5a127a642edaa425b2abcef) by @kmendell)
* cleanup unused routes([ba75009](https://github.com/ofkm/arcane/commit/ba75009d3c1df8e9a3109f13ad0157eec1a0a072) by @kmendell)
* use zod schemas on settings pages ([#397](https://github.com/ofkm/arcane/pull/397) by @kmendell)
* update lockfile([f1fbfd8](https://github.com/ofkm/arcane/commit/f1fbfd839e3f8c879617f33bfda37a7f92720bc1) by @kmendell)
* cleanup app.css([017c387](https://github.com/ofkm/arcane/commit/017c387db934f31ce214f2acdaa2587079f63096) by @kmendell)
* return error([b8c8b1b](https://github.com/ofkm/arcane/commit/b8c8b1bdb9ccb85fbdad6f1af6758fa663b6ea3f) by @kmendell)
* run formatter([f0390cd](https://github.com/ofkm/arcane/commit/f0390cd66a9bfbf0b94524b331890b376de4b19b) by @kmendell)
* add gravatar enabled setting([e2c88af](https://github.com/ofkm/arcane/commit/e2c88aff0ab36897115f44b0ceba1a07a86af0a1) by @kmendell)
* fix linter([5140cb2](https://github.com/ofkm/arcane/commit/5140cb23b381e0f884f8d8078641b75b03f5c8bb) by @kmendell)
* simplify response handling in image update endpoints([6add097](https://github.com/ofkm/arcane/commit/6add0973ea3a145baf6cc4975fbe1291ae556c14) by @kmendell)
* migrate logging to slog package and enhance logger configuration([2e69fe1](https://github.com/ofkm/arcane/commit/2e69fe16ad6e8e4d8f8105cea9ddaff18112dab9) by @kmendell)
* refactor api route structure, update auth middleware to actually pass if a user is an admin or not([4b0868e](https://github.com/ofkm/arcane/commit/4b0868e1ba8819d5b22832a17e31244617f203d1) by @kmendell)
* role mappings for OIDC users([7e7f8c0](https://github.com/ofkm/arcane/commit/7e7f8c0f82d6a9b2c4e23047c139b4405cc42957) by @kmendell)
* add environment to compose files([ffde804](https://github.com/ofkm/arcane/commit/ffde8044c50407db565ce583c574466540294dd5) by @kmendell)
* fix linter, refactor admin claim logic([a97097a](https://github.com/ofkm/arcane/commit/a97097a291df7f58a856700404878043397f0cfc) by @kmendell)
* refactor oidc status config([3c2d54d](https://github.com/ofkm/arcane/commit/3c2d54d78c60729070e66f84747d55b943e9ed78) by @kmendell)
* revert cookie time([94f0206](https://github.com/ofkm/arcane/commit/94f0206419c87fc646e5d91c572bd24c4c878082) by @kmendell)
* add image polling job([51e365e](https://github.com/ofkm/arcane/commit/51e365ebf4a2d1e47c912784fb08f885c212ba3a) by @kmendell)
* remote environments with access tokens ([#401](https://github.com/ofkm/arcane/pull/401) by @kmendell)
* update dockerfile location for e2e tests([3501f1e](https://github.com/ofkm/arcane/commit/3501f1ed29aefa55343d472bf9f79776200b5a58) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.15.1...1.0-preview

## v0.15.1

### New features

* migrate to Go backend, serve frontend from backend ([#291](https://github.com/ofkm/arcane/pull/291) by @kmendell)

### Bug fixes

* proper compose validation ([#272](https://github.com/ofkm/arcane/pull/272) by @kmendell)
* remove oidc env and args from docker build([e462e8b](https://github.com/ofkm/arcane/commit/e462e8bc271cf92f5b93c09c3d4fe8e87f5018bf) by @kmendell)
* compose network race condition ([#274](https://github.com/ofkm/arcane/pull/274) by @kmendell)
* layout of editors in compose details view([c052902](https://github.com/ofkm/arcane/commit/c05290291f556ac3e45c3479fe6ff2d3c72db6da) by @kmendell)

### Other

* compose spec type ([#275](https://github.com/ofkm/arcane/pull/275) by @kmendell)
* add dtos for most handlers([27d2500](https://github.com/ofkm/arcane/commit/27d25001731113f54ee6ab9252ee6118193cb729) by @kmendell)
* rework auto update service, and auto search registries ([#296](https://github.com/ofkm/arcane/pull/296) by @kmendell)
* remove docker host setting and only use local socket([f352383](https://github.com/ofkm/arcane/commit/f352383c911ba01b7d1bb0d085919f2450e17ff2) by @kmendell)
* fix some ui issues([5360bd6](https://github.com/ofkm/arcane/commit/5360bd619c3410992a39508c04f21e98a3fb5d9e) by @kmendell)
* auto search through private registries([a65f537](https://github.com/ofkm/arcane/commit/a65f537d585332efd80b9ba1e12bcb20fa3fde94) by @kmendell)
* fix playwright e2e tests ([#298](https://github.com/ofkm/arcane/pull/298) by @kmendell)
* make sure to copy dist folder([b71b549](https://github.com/ofkm/arcane/commit/b71b5495f6dc0d6da370e7426e715c76b7ef1bff) by @kmendell)
* restructure dockerfile([94d4653](https://github.com/ofkm/arcane/commit/94d46533e506091b0eb223bc390bcc526c43a907) by @kmendell)
* restructure dockerfile([bc15668](https://github.com/ofkm/arcane/commit/bc156687410f1c38677b63752904e8385599aa07) by @kmendell)
* fix docker compose syntax([ae4d89d](https://github.com/ofkm/arcane/commit/ae4d89d9c3fb9650cfb835852ca9229e40a04346) by @kmendell)
* fix type errors([bfd417a](https://github.com/ofkm/arcane/commit/bfd417a8adc6ea5d07b34453db740a6c4785011c) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.15.0...v0.15.1

## v0.15.0

### New features

* remote agents ([82cbab5](https://github.com/ofkm/arcane/commit/82cbab506083d6820611b68c3bafea36299a4f7c) by @kmendell)
* use drizzle as a database backend ([54061d3](https://github.com/ofkm/arcane/commit/54061d303945871bd998c3acf4cb331ce6eee560) by @kmendell)
* system usage meters([64dde28](https://github.com/ofkm/arcane/commit/64dde28ef34d43ce2bc5fa3390d2db9e013098e0) by @kmendell)

### Bug fixes

* container status sorting incorrect ([64faad3](https://github.com/ofkm/arcane/commit/64faad3479b541b04addb8ac2d31e0148061ea0a) by @kmendell)
* remove duplicate agent sidebar item([6545794](https://github.com/ofkm/arcane/commit/6545794c47f11566803a1c8772169919471dc439) by @kmendell)
* rename stacks to compose projects ([b38b298](https://github.com/ofkm/arcane/commit/b38b29851882d4c3dd91b4385f1ad1fb30035b8c) by @kmendell)
* deploy to agent dropdown button ([6092c4f](https://github.com/ofkm/arcane/commit/6092c4f67900f48ebc88d2463524669f8ad3c8f8) by @kmendell)
* volumes table truncate not being applied([ce50de7](https://github.com/ofkm/arcane/commit/ce50de7b96ad40fc7ae221517e86a8cea35b1625) by @kmendell)
* incorrect github link on login page([3205312](https://github.com/ofkm/arcane/commit/3205312997badc6e47069dae9ab422052aabb818) by @kmendell)
* container creation type mismatches not allowing containers to be created([e8aece6](https://github.com/ofkm/arcane/commit/e8aece65771c56d84360280835edc496130e88c9) by @kmendell)
* pruning button not showing loading status([419cd9e](https://github.com/ofkm/arcane/commit/419cd9ede5e905d4858b204e1228383ab8425037) by @kmendell)
* implement main compose spec functionality ([e2fc0ac](https://github.com/ofkm/arcane/commit/e2fc0ac7d53d27bb4c03f5bb50b059dd90faf1e4) by @kmendell)
* parse ipam config correctly([2585d69](https://github.com/ofkm/arcane/commit/2585d69e9ebb38fe44a0a71c4895455219a4c1a6) by @kmendell)
* agents not showing compose projects in table([0ab2757](https://github.com/ofkm/arcane/commit/0ab2757c47b0dba5d839d6853467febb503243f5) by @kmendell)
* use new template root url([55fdacd](https://github.com/ofkm/arcane/commit/55fdacd2bef3cebbba549fb90c2d27ae1ce2d4a8) by @kmendell)
* store image maturity in database instead of cache ([1b29808](https://github.com/ofkm/arcane/commit/1b298088172b959ea38b8ab624a24c6a3af3b65e) by @kmendell)
* cpu and ram usage bars not showing correct values([01fbb16](https://github.com/ofkm/arcane/commit/01fbb166675d1ff34e0a63516014140feecec598) by @kmendell)
* use system storage on dashboard([6e7a83c](https://github.com/ofkm/arcane/commit/6e7a83c8cb230f032adeefe8326c57da301f001e) by @kmendell)
* rework auto update service([d88178a](https://github.com/ofkm/arcane/commit/d88178a2c2c9edc308cbedccd80b83fbdc0ba2c7) by @kmendell)
* missing ) in migrations([635d932](https://github.com/ofkm/arcane/commit/635d932180395a0b8d2b1ec55f8ec0f0a382ab88) by @kmendell)
* support removing agents([c33a872](https://github.com/ofkm/arcane/commit/c33a872370ce82cc59839078f90448c6ce90daa1) by @kmendell)
* create database in docker build([24b33e8](https://github.com/ofkm/arcane/commit/24b33e8715faa0cff1d814df4427de8bd2d2415c) by @kmendell)

### Documentation

* update template docs with new root url([8c8a576](https://github.com/ofkm/arcane/commit/8c8a576c366c703114f3bdecb9ab25f118cef5ab) by @kmendell)
* add agent docs([a01dc39](https://github.com/ofkm/arcane/commit/a01dc397671cecc4a9024ee668113a68a8beb0d2) by @kmendell)
* add agent category([39d8201](https://github.com/ofkm/arcane/commit/39d8201e4e0707f8c7cf26e3e802796bfd1d00f4) by @kmendell)
* update agent docs([9971a9a](https://github.com/ofkm/arcane/commit/9971a9ab938a03834d7b5d4b87a085647d7b06ce) by @kmendell)
* update agent docs([419ce4d](https://github.com/ofkm/arcane/commit/419ce4d0b7e704be89916da4c77a6dc7f83cbd43) by @kmendell)
* add agent config docs([417a8b0](https://github.com/ofkm/arcane/commit/417a8b09e2f93d35137184b04633f24878f54326) by @kmendell)

### Dependencies

* bump tar-fs from 2.1.2 to 2.1.3 in the npm_and_yarn group ([#261](https://github.com/ofkm/arcane/pull/261) by @dependabot[bot])

### Other

* allow both envs([8521b7b](https://github.com/ofkm/arcane/commit/8521b7bf252d1d665e9cfa979fb9b43986b2b15e) by @kmendell)
* create db in test script([428b827](https://github.com/ofkm/arcane/commit/428b8277ede96b15f4e0902078fd82c35695c895) by @kmendell)
* fix test setup script([2a75cfb](https://github.com/ofkm/arcane/commit/2a75cfb3055672315c2d4f4be4a73b197df0a994) by @kmendell)
* fix migration logic([f523d41](https://github.com/ofkm/arcane/commit/f523d41331c28e2c60a1e0fe7c0507de032a2489) by @kmendell)
* add better static ip logging([327bb30](https://github.com/ofkm/arcane/commit/327bb3010f0dfd8bf233f0d06befe21933cecfe4) by @kmendell)
* remove stacks from agent headers([883a069](https://github.com/ofkm/arcane/commit/883a0696ca2b63e2751195be998380f9001bcae1) by @kmendell)
* code review fixes"([c374480](https://github.com/ofkm/arcane/commit/c374480c537c30bd0e14a632c2600978061fd4c6) by @kmendell)
* add missing agent types([#241](https://github.com/ofkm/arcane/pull/241) by @kmendell)
* move where db is created([d4fcda0](https://github.com/ofkm/arcane/commit/d4fcda04678a409538ba8393d7db0750221b4cec) by @kmendell)
* bump the dev-dependencies group with 2 updates ([#249](https://github.com/ofkm/arcane/pull/249) by @dependabot[bot])
* bump the prod-dependencies group across 1 directory with 10 updates ([#267](https://github.com/ofkm/arcane/pull/267) by @dependabot[bot])



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.14.0...v0.15.0

## v0.14.0

### New features

* compose and .env template ([#231](https://github.com/ofkm/arcane/pull/231) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.13.1...v0.14.0

## v0.13.1

### Bug fixes

* re-release 0.13.0 as 0.13.1([bc2e4a2](https://github.com/ofkm/arcane/commit/bc2e4a2edcfe225aee4df50e8d98b06e6b2de7c4) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.13.0...v0.13.1

## v0.13.0

### New features

* allow changing user usernames([74321b5](https://github.com/ofkm/arcane/commit/74321b52e891cb25c8d205caf4c451696fc3c200) by @kmendell)
* make compose editor widths resizeable([64c33e6](https://github.com/ofkm/arcane/commit/64c33e65c87146d9cedc5647b2840b3ca6623a13) by @kmendell)
* simplify container and satck detail pages ([#227](https://github.com/ofkm/arcane/pull/227) by @kmendell)

### Bug fixes

* theming not applying correct values([e0d125e](https://github.com/ofkm/arcane/commit/e0d125e5793f242efc787304664fe7166843dfa4) by @kmendell)
* update size classes for consistency across components([3ceb93d](https://github.com/ofkm/arcane/commit/3ceb93df9bbf3bfce040ca2d277670786bf116db) by @kmendell)
* make font size more consistant in editors([efbbe75](https://github.com/ofkm/arcane/commit/efbbe75217f292e8a38fb2b6b8985b7e6c79e264) by @kmendell)
* container log performance issues ([#222](https://github.com/ofkm/arcane/pull/222) by @kmendell)
* remove old references to app-settings.json([65f20d1](https://github.com/ofkm/arcane/commit/65f20d1415b4f174172b212a425949356131d03a) by @kmendell)

### Other

* remove tailwind config from components.json([f58ddca](https://github.com/ofkm/arcane/commit/f58ddca47bfe94b9acaf86496024285e6f218960) by @kmendell)
* bump the prod-dependencies group with 2 updates ([#220](https://github.com/ofkm/arcane/pull/220) by @dependabot[bot])
* fix types of converter service([9b10e2a](https://github.com/ofkm/arcane/commit/9b10e2a1d13ddc020ad6c1d7f937dac431a510c1) by @kmendell)
* fix lexical analysis in converter service([d02e8d0](https://github.com/ofkm/arcane/commit/d02e8d0b83b15dc2ff63a3beb5236be266d0e24d) by @kmendell)
* update imports from 'bits-ui' to '$lib/utils.js' for consistency([448500c](https://github.com/ofkm/arcane/commit/448500ceb9c71f60547868bb96aafd4081c39bfe) by @kmendell)
* run formatter([9283765](https://github.com/ofkm/arcane/commit/9283765cf9a05518376a0346e27bfe2b9bc9656e) by @kmendell)
* revert lucide svelte version([40e3f30](https://github.com/ofkm/arcane/commit/40e3f30f4c8d0ee8908a3fde5f47c88e38c57d1c) by @kmendell)
* revert lucide svelte version([e2a5d53](https://github.com/ofkm/arcane/commit/e2a5d53520d99e1dffe648138123f4caca385427) by @kmendell)
* bump the prod-dependencies group with 2 updates ([#223](https://github.com/ofkm/arcane/pull/223) by @dependabot[bot])
* bump the prod-dependencies group with 2 updates ([#224](https://github.com/ofkm/arcane/pull/224) by @dependabot[bot])
* bump bits-ui from 1.8.0 to 2.1.0 in the frontend-major-updates group ([#225](https://github.com/ofkm/arcane/pull/225) by @dependabot[bot])
* update tailwindcss to version 4.1.7 and refactor class names for consistency([f585b94](https://github.com/ofkm/arcane/commit/f585b94cd875c23e1df91cf6fc470fd2a9581455) by @kmendell)
* bump the prod-dependencies group with 4 updates ([#228](https://github.com/ofkm/arcane/pull/228) by @dependabot[bot])
* add new screenshot([d9e826a](https://github.com/ofkm/arcane/commit/d9e826ab5d69b1e8fd74c5a0d7b8a70f6e1b429d) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.12.0...v0.13.0

## v0.12.0

### New features

* stack logs tab([696d74a](https://github.com/ofkm/arcane/commit/696d74a2391acae08c1fb306a6ae26463bf5bf50) by @kmendell)
* convert docker run to docker compose ([#219](https://github.com/ofkm/arcane/pull/219) by @kmendell)

### Bug fixes

* external networks names not being respected([712fa00](https://github.com/ofkm/arcane/commit/712fa001b672212a98d61633dca96d3092b29a22) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.11.1...v0.12.0

## v0.11.1

### Bug fixes

* largest images differ on dashboard and container images([9ffd0f6](https://github.com/ofkm/arcane/commit/9ffd0f68378518e2b717a078d4800578395228ba) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.11.0...v0.11.1

## v0.11.0

### New features

* save page sizes for all tables([e01d7eb](https://github.com/ofkm/arcane/commit/e01d7ebd05d93f1b9a716ec8dae4535c8e0e1f2a) by @kmendell)

### Bug fixes

* stack deployments for external networks ([#199](https://github.com/ofkm/arcane/pull/199) by @kmendell)
* use correct stack api endpoints([4ea2c12](https://github.com/ofkm/arcane/commit/4ea2c125319df1b797842f649f43ae649414bbd4) by @kmendell)
* cleanup failed stack deployments if they fail([6fa7bd7](https://github.com/ofkm/arcane/commit/6fa7bd71d511e1b0286e07e6165470c6abfdada0) by @kmendell)
* dashboard overview card arrangement ([#215](https://github.com/ofkm/arcane/pull/215) by @kmendell)

### Dependencies

* bump ajinabraham/njsscan-action from 6 to 9 ([#202](https://github.com/ofkm/arcane/pull/202) by @dependabot[bot])

### Other

* bump the dev-dependencies group with 2 updates ([#201](https://github.com/ofkm/arcane/pull/201) by @dependabot[bot])
* upgrade deps excluding svelte([aee3b6d](https://github.com/ofkm/arcane/commit/aee3b6d3ad2ac92fb1d65ee2db5ee0abddbae5b7) by @kmendell)
* fix the existing e2e tests([338dc57](https://github.com/ofkm/arcane/commit/338dc57b6bd30ab5298b9c7bdd647a5b34ac2c71) by @kmendell)
* update workflow to use built int docker([284f2c6](https://github.com/ofkm/arcane/commit/284f2c6364826c5bb7466e8d2c93d278649e318f) by @kmendell)
* create .env in test workflow([2f2e2aa](https://github.com/ofkm/arcane/commit/2f2e2aa5ddde0f4f4f9d9712cbf0564f835e48c1) by @kmendell)
* cleanup comments and logging([540650b](https://github.com/ofkm/arcane/commit/540650b4261f48d5f2703f0d80d76de03c9b537d) by @kmendell)
* custom stack implementation ([#208](https://github.com/ofkm/arcane/pull/208) by @kmendell)
* bump the prod-dependencies group across 1 directory with 3 updates ([#216](https://github.com/ofkm/arcane/pull/216) by @dependabot[bot])
* bump the prod-dependencies group with 3 updates ([#217](https://github.com/ofkm/arcane/pull/217) by @dependabot[bot])
* remove tailwind.config.ts([95bcc32](https://github.com/ofkm/arcane/commit/95bcc32efe93d4d9636b4a555527b2abf38921bd) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.10.0...v0.11.0

## v0.10.0

### New features

* environment variable support in compose files ([#195](https://github.com/ofkm/arcane/pull/195) by @kmendell)

### Bug fixes

* table selection states not getting invailidated([d1ef3cb](https://github.com/ofkm/arcane/commit/d1ef3cb4a0656bfb95736dcd0fcaab11649d4e18) by @kmendell)
* stacks not starting with more than one network ([#191](https://github.com/ofkm/arcane/pull/191) by @kmendell)
* improve loading speed of stack and container pages ([#194](https://github.com/ofkm/arcane/pull/194) by @kmendell)

### Documentation

* clean up and redesign docs ([#189](https://github.com/ofkm/arcane/pull/189) by @kmendell)

### Other

* change header text to be more generalized([78835b3](https://github.com/ofkm/arcane/commit/78835b34d99e5d754c594353ab06fe20c76290c7) by @kmendell)
* bump the prod-dependencies group with 3 updates ([#192](https://github.com/ofkm/arcane/pull/192) by @dependabot[bot])
* add nodejs scan([0268696](https://github.com/ofkm/arcane/commit/026869685a61580ca12946782c59716d116f3cde) by @kmendell)
* eslint fixes([f9c8361](https://github.com/ofkm/arcane/commit/f9c8361d0d7fe07d2d849dc74cbb913e2745c577) by @kmendell)
* more eslint fixes([c31defe](https://github.com/ofkm/arcane/commit/c31defe0dcde2c6a6093475ea25f1bab5076855e) by @kmendell)
* clean up and eslint fixes([3426e87](https://github.com/ofkm/arcane/commit/3426e870a34a001f125648996227d0517c8fd4bf) by @kmendell)
* more eslint fixes([8bc6621](https://github.com/ofkm/arcane/commit/8bc6621fe114f38014daaf9c3eaa5b902bafb2d6) by @kmendell)
* remove required props([4779008](https://github.com/ofkm/arcane/commit/4779008e9e621bdf15b6fc0968cff8139a7985f4) by @kmendell)
* bump eslint-plugin-svelte from 3.6.0 to 3.7.0 in the dev-dependencies group ([#193](https://github.com/ofkm/arcane/pull/193) by @dependabot[bot])
* update button styles ([#196](https://github.com/ofkm/arcane/pull/196) by @kmendell)
* remove unused imports([f61cc22](https://github.com/ofkm/arcane/commit/f61cc224a527af51eb763cb01bba3f1b1a21bbb4) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.9.2...v0.10.0

## v0.9.2

### Bug fixes

* cache image maturity results to improve page loading([ee6eb1e](https://github.com/ofkm/arcane/commit/ee6eb1e52d31aa319f8148bce902e2d5696b97d4) by @kmendell)

### Documentation

* fix sidebar on mobile devices([eafc076](https://github.com/ofkm/arcane/commit/eafc076e87dedb2260b0f9a92e8eca4278a98bea) by @kmendell)

### Dependencies

* bump prettier-plugin-svelte from 3.3.3 to 3.4.0 in the dev-dependencies group ([#188](https://github.com/ofkm/arcane/pull/188) by @dependabot[bot])

### Other

* bump the prod-dependencies group with 2 updates ([#187](https://github.com/ofkm/arcane/pull/187) by @dependabot[bot])



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.9.1...v0.9.2

## v0.9.1

### Bug fixes

* settings not loading values from json file([ad65e80](https://github.com/ofkm/arcane/commit/ad65e803c53e5c9f8b639e0620b6e85a61b50941) by @kmendell)
* volumes cant be deleted from volume details page([76bc5b8](https://github.com/ofkm/arcane/commit/76bc5b8e362b8e8de216d18d7f6acf9fd86d171b) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.9.0...v0.9.1

## v0.9.0

### New features

* add logged in users name in sidebar([e86659b](https://github.com/ofkm/arcane/commit/e86659bd94b3d4918ab17c3243d0e3c7a7512cf0) by @kmendell)
* oidc login support ([#172](https://github.com/ofkm/arcane/pull/172) by @kmendell)
* add dark / light mode toggle([f24cae1](https://github.com/ofkm/arcane/commit/f24cae1afcb26090005fe9fab4a9376a6725f749) by @kmendell)
* image maturity indicator and image update indicators ([#181](https://github.com/ofkm/arcane/pull/181) by @kmendell)

### Bug fixes

* selectedIds persisting after api call is returned([0c01485](https://github.com/ofkm/arcane/commit/0c0148504e29a165afef75b9d07c2794e4371335) by @kmendell)
* stacks not deploying if a health check is defined([664f330](https://github.com/ofkm/arcane/commit/664f330ac8fef08c71bc8f35b401978f4c9e44bd) by @kmendell)
* use svg icon over png([da5a591](https://github.com/ofkm/arcane/commit/da5a591327b2ac78c7ca89a017e6bc7d24d40d6d) by @kmendell)
* truncate long images names on dashboard table([87556c9](https://github.com/ofkm/arcane/commit/87556c94e9f3449977a8f035c0597834c1d82675) by @kmendell)
* sort images and containers but uptime and size([05cc599](https://github.com/ofkm/arcane/commit/05cc5992134040d76624b2e4525b071e0da1cc00) by @kmendell)
* duplicated service badge links on stack start([aca8932](https://github.com/ofkm/arcane/commit/aca8932a787703824c3f35c44851cc37407fabc7) by @kmendell)
* container logs duplicated and not formatted correctly([5aa5f04](https://github.com/ofkm/arcane/commit/5aa5f048f6c4b4ca36183c682daf1d3418cc1737) by @kmendell)
* UI consistency and layout updates ([#185](https://github.com/ofkm/arcane/pull/185) by @kmendell)

### Documentation

* add oidc documentation([f8f60bd](https://github.com/ofkm/arcane/commit/f8f60bd11726342c5e252af6970aebf247945cff) by @kmendell)
* add oidc documentation for ui config([5e3c6ba](https://github.com/ofkm/arcane/commit/5e3c6ba8005c78bcb663340992620f0ca4fea700) by @kmendell)

### Dependencies

* bump docker/build-push-action from 5 to 6 ([#182](https://github.com/ofkm/arcane/pull/182) by @dependabot[bot])

### Other

* cleanup some old comments([50cb424](https://github.com/ofkm/arcane/commit/50cb42468808107d72411250241811e97a3f1287) by @kmendell)
* update svelte-sonner to 1.0.0([3ad26ce](https://github.com/ofkm/arcane/commit/3ad26ce7b5a0b08c2a631c6322ae32215e77b1df) by @kmendell)
* bump @lucide/svelte from 0.509.0 to 0.510.0 in the prod-dependencies group across 1 directory ([#178](https://github.com/ofkm/arcane/pull/178) by @dependabot[bot])
* update tab list ui([d131d85](https://github.com/ofkm/arcane/commit/d131d85e634488d4e51647820a9d34ff63f82cb3) by @kmendell)
* add build workflow for next image([35cef3a](https://github.com/ofkm/arcane/commit/35cef3ad47dab582cf9ae509051c7ce959bd59d1) by @kmendell)
* set dummy env variables for docker build([6f299ed](https://github.com/ofkm/arcane/commit/6f299ed7386348c1f788c851017fa5f6f40d0e22) by @kmendell)
* disable blank issues([cb6023d](https://github.com/ofkm/arcane/commit/cb6023d388608de69d90b602ee67bbfa9d1c3321) by @kmendell)
* upgrade shadcn-svelte and tailwind classes ([#183](https://github.com/ofkm/arcane/pull/183) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.8.0...v0.9.0

## v0.8.0

### New features

* private docker registries ([#162](https://github.com/ofkm/arcane/pull/162) by @kmendell)
* remove delete button from actions dropdown menu for bulk removing ([#169](https://github.com/ofkm/arcane/pull/169) by @kmendell)
* used/unused filtering for images and volumes ([#170](https://github.com/ofkm/arcane/pull/170) by @kmendell)

### Bug fixes

* use uid/gid 200 in container ([#156](https://github.com/ofkm/arcane/pull/156) by @kmendell)
* importing stacks if files are in the data/stacks directory ([#161](https://github.com/ofkm/arcane/pull/161) by @kmendell)
* remove id columns from dashboard tables([a414cbb](https://github.com/ofkm/arcane/commit/a414cbb5777468b0e2cd4346eac83ba709f03eaa) by @kmendell)
* dockerhost from settings not being respected ([#171](https://github.com/ofkm/arcane/pull/171) by @kmendell)

### Documentation

* update quickstart with latest configuration([34dd97c](https://github.com/ofkm/arcane/commit/34dd97c2d60a9781bd9317157505b13136040f46) by @kmendell)
* fix volume mapping typos([435fb34](https://github.com/ofkm/arcane/commit/435fb349f990f4b7ed15223c33c3bea0a58739ec) by @kmendell)

### Other

* remove log-level from compose file([694a764](https://github.com/ofkm/arcane/commit/694a764bb95e66a228b4a4f8b28b10c397a24b17) by @kmendell)
* add arcane.svg ([6f7af5d](https://github.com/ofkm/arcane/commit/6f7af5d427634028c66d50fdff60c370b7fe9f5c) by @kmendell)
* bump the prod-dependencies group across 1 directory with 7 updates ([#167](https://github.com/ofkm/arcane/pull/167) by @dependabot[bot])



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.7.1...v0.8.0

## v0.7.1

### Bug fixes

* show error messages in toasts ([#148](https://github.com/ofkm/arcane/pull/148) by @kmendell)
* compose stacks not starting from the stack directory([7090c4e](https://github.com/ofkm/arcane/commit/7090c4e0950274e0334bc229e5c3b1435ee3e22d) by @kmendell)
* container permissions and removed the need for DOCKER_GID([dde20c0](https://github.com/ofkm/arcane/commit/dde20c0cff5dea6812e29677dae8254ad41abaa1) by @kmendell)

### Other

* remove pull requests from eslint([76e27c9](https://github.com/ofkm/arcane/commit/76e27c9859acea0a6f227fd6c20a14ee25b34235) by @kmendell)
* add dependabot groups for npm([3808fc1](https://github.com/ofkm/arcane/commit/3808fc11687221bbd2f8842f9b70c1aadce06f67) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.7.0...v0.7.1

## v0.7.0

### New features

* container service link for stacks ([#131](https://github.com/ofkm/arcane/pull/131) by @kmendell)
* use stack names as folder names ([#143](https://github.com/ofkm/arcane/pull/143) by @kmendell)

### Bug fixes

* use data in relative path for base directory([7f8dd2c](https://github.com/ofkm/arcane/commit/7f8dd2cb213476ee30baac7faee990d41089d703) by @kmendell)
* use data in relative path for base directory([29ba132](https://github.com/ofkm/arcane/commit/29ba132eae64fc6eb3e1da57455623b9d3eeeab4) by @kmendell)
* container logs not streaming from server ([#138](https://github.com/ofkm/arcane/pull/138) by @kmendell)
* container stats not live updating ([#139](https://github.com/ofkm/arcane/pull/139) by @kmendell)
* onboarding errors and protections ([#142](https://github.com/ofkm/arcane/pull/142) by @kmendell)
* redirect to list view after removing a container or stack([0fa0f03](https://github.com/ofkm/arcane/commit/0fa0f03aa36c6a4da482d06226c075921c232c1e) by @kmendell)
* remove stack name link when its external([7499aee](https://github.com/ofkm/arcane/commit/7499aeeac6ebda4fa1fd5b24cb71b44a1aca30a2) by @kmendell)

### Other

* remove data files([9422299](https://github.com/ofkm/arcane/commit/9422299722fb2b7742a9d853053e040f98a7f704) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.6.0...v0.7.0

## v0.6.0

### New features

* .env configuration support ([#128](https://github.com/ofkm/arcane/pull/128) by @kmendell)

### Bug fixes

* remove ping group and iputils from container so GID 999 is available([4a9e619](https://github.com/ofkm/arcane/commit/4a9e6194cf38a00b4e3a8e71cabd72dd9c896e52) by @kmendell)
* user creation button not showing loading state([d79b2ff](https://github.com/ofkm/arcane/commit/d79b2ff76825f88fbe0c833515a17458bdef5002) by @kmendell)
* password policy not able to be saved([976cd83](https://github.com/ofkm/arcane/commit/976cd831bc064062a0329d0975dd1b64dd17bd32) by @kmendell)

### Other

* bump vite from 6.3.4 to 6.3.5 ([#123](https://github.com/ofkm/arcane/pull/123) by @dependabot[bot])
* bump typescript-eslint from 8.31.1 to 8.32.0 ([#120](https://github.com/ofkm/arcane/pull/120) by @dependabot[bot])
* bump eslint from 9.25.1 to 9.26.0 ([#124](https://github.com/ofkm/arcane/pull/124) by @dependabot[bot])
* bump mode-watcher from 1.0.4 to 1.0.6 ([#121](https://github.com/ofkm/arcane/pull/121) by @dependabot[bot])



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.5.0...v0.6.0

## v0.5.0

### New features

* add confiramtion dialog before stopping all running containers([1a696c0](https://github.com/ofkm/arcane/commit/1a696c08e7b15f13bfdf4b0542d444facbeeb851) by @kmendell)

### Bug fixes

* use correct cursor on all buttons([50d4211](https://github.com/ofkm/arcane/commit/50d4211c23743c1e5fda6324be9220e7e367ae05) by @kmendell)
* loading states on action buttons not reflecting status([8305078](https://github.com/ofkm/arcane/commit/8305078dcd1fd07a89976466d90350d5e05e0b3f) by @kmendell)
* session cookie not being created on http sites ([#112](https://github.com/ofkm/arcane/pull/112) by @kmendell)

### Documentation

* add analytics to doc site([a7b381b](https://github.com/ofkm/arcane/commit/a7b381b9102c947e32914d46f690d9a06384164f) by @kmendell)

### Other

* update release script to use correct syntax([3a7c1b3](https://github.com/ofkm/arcane/commit/3a7c1b3b8b5898ade3091919870e5fd240dfa8b5) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.4.1...v0.5.0

## v0.4.1

### Bug fixes

* adjust ownership handling in entrypoint script([a3ec54a](https://github.com/ofkm/arcane/commit/a3ec54a058548a66ae9e637cdd6e34228c5e995b) by @kmendell)

### Documentation

* update wording of image features([c8ddbc9](https://github.com/ofkm/arcane/commit/c8ddbc92feda40d4e44100b2160998b1896dc6de) by @kmendell)
* update docker compose layout([8e0eaa7](https://github.com/ofkm/arcane/commit/8e0eaa7048788226b6c3f4fa126f83775c1eca7f) by @kmendell)

### Other

* add screenshot to readme([b3ade80](https://github.com/ofkm/arcane/commit/b3ade80285d4720f9590eea7a34575b2c9b62621) by @kmendell)
* update screenshot([3cf0c13](https://github.com/ofkm/arcane/commit/3cf0c13f8cb90f54bb87d7fbb1736994e1b94ade) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.4.0...v0.4.1

## v0.4.0

### New features

* image inspection page([c3f5665](https://github.com/ofkm/arcane/commit/c3f5665bf5c67077a9d21d33dc23ec0a530ea041) by @kmendell)
* volume inspection page ([#75](https://github.com/ofkm/arcane/pull/75) by @kmendell)
* network inspection page ([#76](https://github.com/ofkm/arcane/pull/76) by @kmendell)
* dashboard quick actions ([#77](https://github.com/ofkm/arcane/pull/77) by @kmendell)
* auto update containers and stacks ([#83](https://github.com/ofkm/arcane/pull/83) by @kmendell)
* user authentication ([#86](https://github.com/ofkm/arcane/pull/86) by @kmendell)

### Bug fixes

* show ipvaln/macvlan ip address on details page([77495da](https://github.com/ofkm/arcane/commit/77495da4b40a7da02a50deea336ced9a7885abe5) by @kmendell)
* disable autofill for input fields([c7ff1c0](https://github.com/ofkm/arcane/commit/c7ff1c063161a1bca8aff4b426db0011e8b19f48) by @kmendell)
* set default restart policy to unless-stopped([4c578e4](https://github.com/ofkm/arcane/commit/4c578e4d9faca22333f15f011ed2c98c46c3ebb3) by @kmendell)
* use  for watching containers([e99ec10](https://github.com/ofkm/arcane/commit/e99ec10787af07e4f4e27e7fb8195c45ccde00c7) by @kmendell)
* make sure data is watched by effect([cd89d48](https://github.com/ofkm/arcane/commit/cd89d48677c1ebb899979663e7ddaeba9410705d) by @kmendell)
* container table showing when no containers found([4f63742](https://github.com/ofkm/arcane/commit/4f63742dd584a5d598876497b46c6d6090503938) by @kmendell)

### Documentation

* cleanup and fix some documentation([37e8ccd](https://github.com/ofkm/arcane/commit/37e8ccdd25b1a20774b5237b270835918a56f722) by @kmendell)
* fix sidebar([ffcd012](https://github.com/ofkm/arcane/commit/ffcd012dd619d7efbbe69dcce73c2497e43959d7) by @kmendell)
* remove architecture file([353b11a](https://github.com/ofkm/arcane/commit/353b11a38d4e630ecf80d6957c23e212eb458074) by @kmendell)
* update install guide and building docs([0249b58](https://github.com/ofkm/arcane/commit/0249b5839a8be55c37451abee3a905319efe1189) by @kmendell)
* fix typos and incorrect items([6079a52](https://github.com/ofkm/arcane/commit/6079a5290344c9d2a7f26b7a2908eba47acc02b1) by @kmendell)
* update guides section with troubleshootig info([5facc19](https://github.com/ofkm/arcane/commit/5facc198906014099b9f9b1fb10b0c5c02f93f69) by @kmendell)
* update note about registry credentials([6e0e5aa](https://github.com/ofkm/arcane/commit/6e0e5aaf207a1e9bd13cfccd19b68d407f125fd0) by @kmendell)

### Dependencies

* bump actions/cache from 3 to 4 ([#81](https://github.com/ofkm/arcane/pull/81) by @dependabot[bot])

### Other

* update dockerfile with labels([cc23955](https://github.com/ofkm/arcane/commit/cc239556f404f575f2bf3b9de6873e4c9803a5ef) by @kmendell)
* update readme([b785b79](https://github.com/ofkm/arcane/commit/b785b794d2a2cb6af46b4a3263b0002fb434b79e) by @kmendell)
* add assets for readme([05b95e4](https://github.com/ofkm/arcane/commit/05b95e4e0ae0d1d968d2bfa29009c0a703afc395) by @kmendell)
* create SECURITY.md([ac700eb](https://github.com/ofkm/arcane/commit/ac700ebffdf04d8991e1fe257262853befc72626) by @kmendell)
* add license([ae19fa1](https://github.com/ofkm/arcane/commit/ae19fa164fe4b6ff4009836e8575c94028f41eb2) by @kmendell)
* add docker and gha to dependabot([9956ffa](https://github.com/ofkm/arcane/commit/9956ffa911c841514e0a8b64dbc437f065cec947) by @kmendell)
* bump bits-ui from 1.3.19 to 1.4.0 ([#84](https://github.com/ofkm/arcane/pull/84) by @dependabot[bot])
* bump typescript-eslint from 8.31.0 to 8.31.1 ([#85](https://github.com/ofkm/arcane/pull/85) by @dependabot[bot])
* reate codeql.yml([75def23](https://github.com/ofkm/arcane/commit/75def235f539f5ad1d4884c1b7597064cd19b6d2) by @kmendell)
* bump bits-ui from 1.4.0 to 1.4.2 ([#87](https://github.com/ofkm/arcane/pull/87) by @dependabot[bot])
* bump sveltekit-superforms from 2.24.1 to 2.25.0 ([#88](https://github.com/ofkm/arcane/pull/88) by @dependabot[bot])
* add FUNDING.yml([d881fba](https://github.com/ofkm/arcane/commit/d881fbabda6b6d004122e1bd26265ebe481798ce) by @kmendell)
* add eslint workflow([fffebad](https://github.com/ofkm/arcane/commit/fffebadbef055f7ade70e172bcdd26047a9d5c28) by @kmendell)
* change eslint to run on ubuntu 22.04([3880e67](https://github.com/ofkm/arcane/commit/3880e675b87c7cfb8f8dd012896b291e4ccb36eb) by @kmendell)
* update package-lock.json([2f57c13](https://github.com/ofkm/arcane/commit/2f57c134851409a851d0ce94ad417d8759237c41) by @kmendell)
* bump bits-ui from 1.4.2 to 1.4.3 ([#91](https://github.com/ofkm/arcane/pull/91) by @dependabot[bot])
* bump @sveltejs/kit from 2.20.7 to 2.20.8 ([#92](https://github.com/ofkm/arcane/pull/92) by @dependabot[bot])
* add issue type to feature template([27a5082](https://github.com/ofkm/arcane/commit/27a50824255fafcfb32d4b0b1f9fec675c722c9b) by @kmendell)
* add issue type to bug template([5ddbb9d](https://github.com/ofkm/arcane/commit/5ddbb9dd7d867210dd132c5b022b6c8b0cb4f78f) by @kmendell)
* update readme layout([fd6b77a](https://github.com/ofkm/arcane/commit/fd6b77acff75beaae13c1f37b8453ef411f89ee4) by @kmendell)
* update eslint workflow([3068a8e](https://github.com/ofkm/arcane/commit/3068a8e36c1e455b4fe385ef65d66646b747020e) by @kmendell)
* Rename contributing.md to CONTRIBUTING.md([aae2e5a](https://github.com/ofkm/arcane/commit/aae2e5a4ebf99c0f30291f636ebf80ecca5a9008) by @kmendell)
* remove header from contributing([7ce2d2a](https://github.com/ofkm/arcane/commit/7ce2d2a18c58a133b90f0ee1970a83f8bfce0230) by @kmendell)
* add svelte-check matcher([dbf6a68](https://github.com/ofkm/arcane/commit/dbf6a68bb18e27e2c3880e14e164a6f34355a8df) by @kmendell)
* add svelte-check workflow([d41a915](https://github.com/ofkm/arcane/commit/d41a915786c076c7aa5bc7eadd10a4d662a37dc5) by @kmendell)
* update eslint workflow([8953180](https://github.com/ofkm/arcane/commit/895318067e33b0571e0b1d3b2fca329f640f3fee) by @kmendell)
* bump eslint version([307663d](https://github.com/ofkm/arcane/commit/307663dc409156fe02af14407c41d442e2e6019b) by @kmendell)
* api, tables, and ui cleanup and refactor code, add e2e tests ([#96](https://github.com/ofkm/arcane/pull/96) by @kmendell)
* add note about private registries([469a5e9](https://github.com/ofkm/arcane/commit/469a5e920119ebd7f646af97205e3675720b52b3) by @kmendell)
* bump @lucide/svelte from 0.503.0 to 0.507.0 ([#103](https://github.com/ofkm/arcane/pull/103) by @dependabot[bot])
* bump svelte-check from 4.1.6 to 4.1.7 ([#99](https://github.com/ofkm/arcane/pull/99) by @dependabot[bot])
* bump bits-ui from 1.4.3 to 1.4.6 ([#101](https://github.com/ofkm/arcane/pull/101) by @dependabot[bot])
* bump zod from 3.24.3 to 3.24.4 ([#102](https://github.com/ofkm/arcane/pull/102) by @dependabot[bot])



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.3.0...v0.4.0

## v0.3.0

### New features

* settings page overhaul ([#48](https://github.com/ofkm/arcane/pull/48) by @kmendell)
* add in-use/unused badge on volumes and images([75ea68b](https://github.com/ofkm/arcane/commit/75ea68b04164f734af5d9fdc560fd983620d6a96) by @kmendell)
* add create container logic ([#53](https://github.com/ofkm/arcane/pull/53) by @kmendell)
* mass-delete images, volumes, and networks ([#69](https://github.com/ofkm/arcane/pull/69) by @kmendell)
* add container resource card([37ec736](https://github.com/ofkm/arcane/commit/37ec736c4bb0c58bb2bf65681e04ad5e4bd280a1) by @kmendell)

### Bug fixes

* unused badge color and layout([67e5bc5](https://github.com/ofkm/arcane/commit/67e5bc552f814af8d4e77a26f415c58a65c4de4f) by @kmendell)
* add link to container details in table column([72bd842](https://github.com/ofkm/arcane/commit/72bd8425439fdbca4cf44af2035869d0e5dc9406) by @kmendell)
* custom badge colors and look([a1e59bd](https://github.com/ofkm/arcane/commit/a1e59bd895fa681332b13dd8a6e668ef885a5c14) by @kmendell)
* remove badges on detail pages([4404bd2](https://github.com/ofkm/arcane/commit/4404bd268b61b79118198b52899585f05f21b2ab) by @kmendell)
* remove badges on detail pages([1da4c79](https://github.com/ofkm/arcane/commit/1da4c791f22a03214953a3786bfa1bb9dc54f062) by @kmendell)
* remove docker connected label from sidebar([13d9060](https://github.com/ofkm/arcane/commit/13d90601af75c0df2ae7eefc389778b567ff5ddb) by @kmendell)
* use new status badge instead of custom-badge([90303a6](https://github.com/ofkm/arcane/commit/90303a64a749bcc9754ce8cdaa3a1597c5dbbe9b) by @kmendell)
* disable checkbox if stack is external([93884eb](https://github.com/ofkm/arcane/commit/93884ebeaffec8412f1e4ab6371b6d2c19cf596d) by @kmendell)
* show total image size in dashboard card([9e4749c](https://github.com/ofkm/arcane/commit/9e4749ccd42538e3b44b2e919322daff8da40220) by @kmendell)
* show docker engine version in card([8e5fc5b](https://github.com/ofkm/arcane/commit/8e5fc5b3eea8db26f11ebfe951402093addd97f6) by @kmendell)
* image pulling not repecting user defined tag([41af290](https://github.com/ofkm/arcane/commit/41af2909f79b8e6e5d4fc7bc0a0e26193ad59dd0) by @kmendell)
* stacks not saving on edit([ba13d7b](https://github.com/ofkm/arcane/commit/ba13d7bbda14349d5f25cafa74ce74284448bc38) by @kmendell)
* restore yaml editor functionality([f0484ec](https://github.com/ofkm/arcane/commit/f0484ecca5ca399769d73ca7ac6c164c4b5b3bc9) by @kmendell)
* add api endpoints for stacks and container actions ([#73](https://github.com/ofkm/arcane/pull/73) by @kmendell)

### Documentation

* setup documentation WIP  ([#72](https://github.com/ofkm/arcane/pull/72) by @kmendell)

### Other

* bump svelte from 5.28.1 to 5.28.2 ([#47](https://github.com/ofkm/arcane/pull/47) by @dependabot[bot])
* bump vite from 6.3.2 to 6.3.3 ([#55](https://github.com/ofkm/arcane/pull/55) by @dependabot[bot])
* use neutral theme([de3952a](https://github.com/ofkm/arcane/commit/de3952a9c890dc1d4fb0e40c7139d29419c010fb) by @kmendell)
* cleanup dashboard links([5ec6edc](https://github.com/ofkm/arcane/commit/5ec6edc79bdd33202f533926807bf9017c17cbb5) by @kmendell)
* change wording of readme([b42c013](https://github.com/ofkm/arcane/commit/b42c01393df8dfbd3d21b7ea8686f0351e9c8744) by @kmendell)
* fix docker-service([5acfd98](https://github.com/ofkm/arcane/commit/5acfd98e8e2aecfbabc6b26256d33a7809545ad8) by @kmendell)
* remove unused CSS variables and styles([25170a3](https://github.com/ofkm/arcane/commit/25170a3c1c6cd99af184c57efdd6d1105cf8bac6) by @kmendell)
* add prettier formatting([215221d](https://github.com/ofkm/arcane/commit/215221da866380eb5e60e0e3f8eaba75a6c4addd) by @kmendell)
* clean up unused imports and comments across multiple components([9a1afa6](https://github.com/ofkm/arcane/commit/9a1afa68e3f31c733029f22547b6d3da2e3ae3c8) by @kmendell)
* clean up import statements in docker-service.ts([99d3f76](https://github.com/ofkm/arcane/commit/99d3f76dd5c3e6014c9b01e46683d79300cb7cb1) by @kmendell)
* reorganize services and types ([#71](https://github.com/ofkm/arcane/pull/71) by @kmendell)
* remove npmrc([a452c2d](https://github.com/ofkm/arcane/commit/a452c2dc2c9ccb1a2603bf058cd35b9efdaab775) by @kmendell)
* format code([6308a6a](https://github.com/ofkm/arcane/commit/6308a6ae3cb134e185d923e5a43b446f628ead58) by @kmendell)
* remove unused imports([8ce5629](https://github.com/ofkm/arcane/commit/8ce562978485af1825acaf849e0847f9f6a5b152) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.2.0...v0.3.0

## v0.2.0

### New features

* link stack containers to container details page ([#41](https://github.com/ofkm/arcane/pull/41) by @kmendell)
* add yaml editor component ([#44](https://github.com/ofkm/arcane/pull/44) by @kmendell)
* implement full docker compose spec ([#45](https://github.com/ofkm/arcane/pull/45) by @kmendell)

### Other

* bump typescript-eslint from 8.30.1 to 8.31.0 ([#38](https://github.com/ofkm/arcane/pull/38) by @dependabot[bot])
* bump eslint from 9.25.0 to 9.25.1 ([#37](https://github.com/ofkm/arcane/pull/37) by @dependabot[bot])
* improve dockerfile([1a66037](https://github.com/ofkm/arcane/commit/1a66037f6e01a25efa4370190ebf6faea1a742be) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.1.1...v0.2.0

## v0.1.1

### Bug fixes

* container details card layout([94fde0e](https://github.com/ofkm/arcane/commit/94fde0e470043b519d27dfd6e5aa0c27779496ae) by @kmendell)
* container env details layout([b2f7e28](https://github.com/ofkm/arcane/commit/b2f7e28fd31875c768c845ab4cbbc8e99406ea01) by @kmendell)
* container port details layout([721cacb](https://github.com/ofkm/arcane/commit/721cacb35292ec06060afbc6fa0b4f7fbddaca08) by @kmendell)
* make container details grid more reponsive([17b5abf](https://github.com/ofkm/arcane/commit/17b5abf55d5f37a6f02ae4d7f236c9a65beb63ba) by @kmendell)
* log display improvements([8343c9d](https://github.com/ofkm/arcane/commit/8343c9d3dd71cb85297de817a97c764b455848b6) by @kmendell)

### Other

* bump @lucide/svelte from 0.501.0 to 0.503.0 ([#39](https://github.com/ofkm/arcane/pull/39) by @dependabot[bot])
* add release workflow([0fa9aae](https://github.com/ofkm/arcane/commit/0fa9aaea598fc61a2105b2cc3f3f82465e3255a9) by @kmendell)



**Full Changelog**: https://github.com/ofkm/arcane/compare/v0.1.0...v0.1.1

## v0.1.0

### New features

* add container logs([213dc2f](https://github.com/ofkm/arcane/commit/213dc2f8bdef9540a2a64f40d9b57d949ff889db) by @kmendell)
* application settings page([10084f8](https://github.com/ofkm/arcane/commit/10084f832b11c02eb93a3aa1b76f644497ce0f6e) by @kmendell)
* redesign dashboard page([5ed6aa1](https://github.com/ofkm/arcane/commit/5ed6aa12aacac5aea6dee682336b115e1f8c4ce4) by @kmendell)
* redesign ui to be more modern([942d674](https://github.com/ofkm/arcane/commit/942d674792f9be891f76d5ac581969a7e99e7608) by @kmendell)
* update sidebar ui([9547de6](https://github.com/ofkm/arcane/commit/9547de6ae30e60f8560277a0dd365be077989730) by @kmendell)
* initial stakc implementation([924b3f1](https://github.com/ofkm/arcane/commit/924b3f1483d79a4ae314b2be16d4f2da1ea4acca) by @kmendell)
* configurable stack directory ([#13](https://github.com/ofkm/arcane/pull/13) by @kmendell)
* create and delete volumes ([#29](https://github.com/ofkm/arcane/pull/29) by @kmendell)
* pull/remove images ([#33](https://github.com/ofkm/arcane/pull/33) by @kmendell)
* filter and sorting on all tables ([#35](https://github.com/ofkm/arcane/pull/35) by @kmendell)
* app version update notification ([#36](https://github.com/ofkm/arcane/pull/36) by @kmendell)

### Bug fixes

* improve container list table([13822be](https://github.com/ofkm/arcane/commit/13822befb2db7793feb75baa2e821edb53c2243d) by @kmendell)
* pull real data for dashboard([d66c735](https://github.com/ofkm/arcane/commit/d66c73540a39deddbc81a56e655573a6a2d176c8) by @kmendell)
* improve image list page([a46e249](https://github.com/ofkm/arcane/commit/a46e2493e99059ac850b0528897e9708019a7ff5) by @kmendell)
* ensure we are using consistant data tables([2e5ec48](https://github.com/ofkm/arcane/commit/2e5ec48bfb4c9861fefa3273bd919445f38de032) by @kmendell)
* type error fixes([75a2997](https://github.com/ofkm/arcane/commit/75a2997f18f4366d4c70f8fdf5025c4cd3c8af83) by @kmendell)
* dockerfile and docker socket permissions([3b1359d](https://github.com/ofkm/arcane/commit/3b1359df3841f9722a2d61216905afc208bfe84d) by @kmendell)
* use /app/data for settings and stack storage ([#18](https://github.com/ofkm/arcane/pull/18) by @kmendell)
* button size consistancy([03b636d](https://github.com/ofkm/arcane/commit/03b636dfd2e47078f848d54232edb887438afd15) by @kmendell)
* use correct github url([ee2a49c](https://github.com/ofkm/arcane/commit/ee2a49cc6959cb120a6e4d1353400228edbb4b6e) by @kmendell)

### Dependencies

* bump dockerode from 4.0.5 to 4.0.6 ([#1](https://github.com/ofkm/arcane/pull/1) by @dependabot[bot])

### Other

* initial commit([1ef5cdc](https://github.com/ofkm/arcane/commit/1ef5cdc13ba139fe82b5821919bcd83491dfc11e) by @kmendell)
* add the rest of the routes([898acf9](https://github.com/ofkm/arcane/commit/898acf97b429f3ab6b83363036e1a23855cb0a3a) by @kmendell)
* add docker connection logic([52bdcfa](https://github.com/ofkm/arcane/commit/52bdcfaa416149d0fc2f3d0cfd8b7d7eca17c2b1) by @kmendell)
* move table actions([ecf73ca](https://github.com/ofkm/arcane/commit/ecf73ca76975804553aa25aedd72954ac06ff67d) by @kmendell)
* improve container details page([46b4699](https://github.com/ofkm/arcane/commit/46b4699bd9d1fc26a79a663ef27275efb41b86e8) by @kmendell)
* improve container details page([d7d5d51](https://github.com/ofkm/arcane/commit/d7d5d510c9d560dfb29663e78f3820abbfe40b61) by @kmendell)
* add docker build files, and scripts([6505e66](https://github.com/ofkm/arcane/commit/6505e66b8466556716eeef40066b885711dfc43f) by @kmendell)
* update logo([34c6e46](https://github.com/ofkm/arcane/commit/34c6e4655bb0bab6e1bed16454f2b39650463e8a) by @kmendell)
* add issue templates([265e89c](https://github.com/ofkm/arcane/commit/265e89c26851e64f4e0cdc1a2f8df8b484aaeba7) by @kmendell)
* update release script([4680e6b](https://github.com/ofkm/arcane/commit/4680e6b39a90c6ecc9602e024f6987ce53b73112) by @kmendell)
* update release script([220df9b](https://github.com/ofkm/arcane/commit/220df9b482e9d2dd1c6a52fcb54806c263376bed) by @kmendell)



