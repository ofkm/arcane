## [0.8.0](https://github.com/ofkm/arcane/compare/v0.7.1...v0.8.0) (2025-05-12)

### Features

* private docker registries ([#162](https://github.com/ofkm/arcane/issues/162)) ([cfeffd2](https://github.com/ofkm/arcane/commit/cfeffd2698e07731ff943f9a816ad1c128e0e3a5))
* remove delete button from actions dropdown menu for bulk removing ([#169](https://github.com/ofkm/arcane/issues/169)) ([cc15fae](https://github.com/ofkm/arcane/commit/cc15fae16b589f6a4fa7e2f09357c8ca9012f177))
* used/unused filtering for images and volumes ([#170](https://github.com/ofkm/arcane/issues/170)) ([451abf8](https://github.com/ofkm/arcane/commit/451abf8a3811bedd6df0619263070273caae7389))

### Bug Fixes

* dockerhost from settings not being respected ([#171](https://github.com/ofkm/arcane/issues/171)) ([258c3f8](https://github.com/ofkm/arcane/commit/258c3f8db2e14572bc70c138dd7c75f19f6d1e12))
* importing stacks if files are in the data/stacks directory ([#161](https://github.com/ofkm/arcane/issues/161)) ([9bfb479](https://github.com/ofkm/arcane/commit/9bfb4795ca57b90d6786200b2ab35b4d67d4b82d))
* remove id columns from dashboard tables ([a414cbb](https://github.com/ofkm/arcane/commit/a414cbb5777468b0e2cd4346eac83ba709f03eaa))
* use uid/gid 200 in container ([#156](https://github.com/ofkm/arcane/issues/156)) ([bae85ae](https://github.com/ofkm/arcane/commit/bae85aeb65059d50f4f1ab3f3bc33594e14f966a))
## [0.7.1](https://github.com/ofkm/arcane/compare/v0.7.0...v0.7.1) (2025-05-10)

### Bug Fixes

* compose stacks not starting from the stack directory ([7090c4e](https://github.com/ofkm/arcane/commit/7090c4e0950274e0334bc229e5c3b1435ee3e22d))
* container permissions and removed the need for DOCKER_GID ([dde20c0](https://github.com/ofkm/arcane/commit/dde20c0cff5dea6812e29677dae8254ad41abaa1))
* show error messages in toasts ([#148](https://github.com/ofkm/arcane/issues/148)) ([c5d6b90](https://github.com/ofkm/arcane/commit/c5d6b9069fc9d20f4781452bfe7cc4ead89c9cc9))
## [0.7.0](https://github.com/ofkm/arcane/compare/v0.6.0...v0.7.0) (2025-05-09)

### Features

* container service link for stacks ([#131](https://github.com/ofkm/arcane/issues/131)) ([420cf91](https://github.com/ofkm/arcane/commit/420cf918851b7530ad9c505f8d93b06277309f20))
* use stack names as folder names ([#143](https://github.com/ofkm/arcane/issues/143)) ([537ea9f](https://github.com/ofkm/arcane/commit/537ea9f42f36becb2d5f70e1192cb47ca4c90deb))

### Bug Fixes

* container logs not streaming from server ([#138](https://github.com/ofkm/arcane/issues/138)) ([e5d9903](https://github.com/ofkm/arcane/commit/e5d990332e442c70b72ec6b88efabaaaa297d396))
* container stats not live updating ([#139](https://github.com/ofkm/arcane/issues/139)) ([d4f773c](https://github.com/ofkm/arcane/commit/d4f773c6bf11e6f9e634d14cc623617a8da428f4))
* onboarding errors and protections ([#142](https://github.com/ofkm/arcane/issues/142)) ([bceb0ec](https://github.com/ofkm/arcane/commit/bceb0ec49d4bae1a5d050262b00a8fe068a4c82f))
* redirect to list view after removing a container or stack ([0fa0f03](https://github.com/ofkm/arcane/commit/0fa0f03aa36c6a4da482d06226c075921c232c1e))
* remove stack name link when its external ([7499aee](https://github.com/ofkm/arcane/commit/7499aeeac6ebda4fa1fd5b24cb71b44a1aca30a2))
* use data in relative path for base directory ([29ba132](https://github.com/ofkm/arcane/commit/29ba132eae64fc6eb3e1da57455623b9d3eeeab4))
* use data in relative path for base directory ([7f8dd2c](https://github.com/ofkm/arcane/commit/7f8dd2cb213476ee30baac7faee990d41089d703))
## [0.6.0](https://github.com/ofkm/arcane/compare/v0.5.0...v0.6.0) (2025-05-06)

### Features

* .env configuration support ([#128](https://github.com/ofkm/arcane/issues/128)) ([20e12df](https://github.com/ofkm/arcane/commit/20e12df66afc2ac9e3ef5dea3e1e019d4db7a30b))

### Bug Fixes

* password policy not able to be saved ([976cd83](https://github.com/ofkm/arcane/commit/976cd831bc064062a0329d0975dd1b64dd17bd32))
* remove ping group and iputils from container so GID 999 is available ([4a9e619](https://github.com/ofkm/arcane/commit/4a9e6194cf38a00b4e3a8e71cabd72dd9c896e52))
* user creation button not showing loading state ([d79b2ff](https://github.com/ofkm/arcane/commit/d79b2ff76825f88fbe0c833515a17458bdef5002))
## [0.5.0](https://github.com/ofkm/arcane/compare/v0.4.1...v0.5.0) (2025-05-06)

### Features

* add confiramtion dialog before stopping all running containers ([1a696c0](https://github.com/ofkm/arcane/commit/1a696c08e7b15f13bfdf4b0542d444facbeeb851))

### Bug Fixes

* loading states on action buttons not reflecting status ([8305078](https://github.com/ofkm/arcane/commit/8305078dcd1fd07a89976466d90350d5e05e0b3f))
* session cookie not being created on http sites ([#112](https://github.com/ofkm/arcane/issues/112)) ([0ef6073](https://github.com/ofkm/arcane/commit/0ef6073ac8d5ed5886022199bdcee93837147665))
* use correct cursor on all buttons ([50d4211](https://github.com/ofkm/arcane/commit/50d4211c23743c1e5fda6324be9220e7e367ae05))
## [0.4.1](https://github.com/ofkm/arcane/compare/v0.4.0...v0.4.1) (2025-05-05)

### Bug Fixes

* adjust ownership handling in entrypoint script ([a3ec54a](https://github.com/ofkm/arcane/commit/a3ec54a058548a66ae9e637cdd6e34228c5e995b))
## [0.4.0](https://github.com/ofkm/arcane/compare/v0.3.0...v0.4.0) (2025-05-05)

### Features

* auto update containers and stacks ([#83](https://github.com/ofkm/arcane/issues/83)) ([0a5132f](https://github.com/ofkm/arcane/commit/0a5132fed65df2174b838ddf7e2b8b9ec5277e1f))
* dashboard quick actions ([#77](https://github.com/ofkm/arcane/issues/77)) ([f82380b](https://github.com/ofkm/arcane/commit/f82380b1a483a74c45f5e9f2b3c6919fffe7c051))
* image inspection page ([c3f5665](https://github.com/ofkm/arcane/commit/c3f5665bf5c67077a9d21d33dc23ec0a530ea041))
* network inspection page ([#76](https://github.com/ofkm/arcane/issues/76)) ([89451f9](https://github.com/ofkm/arcane/commit/89451f915bfa38e4b1930fb45fe2d39ccc8815c2))
* user authentication ([#86](https://github.com/ofkm/arcane/issues/86)) ([0ab0df3](https://github.com/ofkm/arcane/commit/0ab0df3638905b6d5714b1470903461fc0b5c3cb))
* volume inspection page ([#75](https://github.com/ofkm/arcane/issues/75)) ([1e6da7d](https://github.com/ofkm/arcane/commit/1e6da7dd0889d0c88abbc8863c71800e0253f52b))

### Bug Fixes

* container table showing when no containers found ([4f63742](https://github.com/ofkm/arcane/commit/4f63742dd584a5d598876497b46c6d6090503938))
* disable autofill for input fields ([c7ff1c0](https://github.com/ofkm/arcane/commit/c7ff1c063161a1bca8aff4b426db0011e8b19f48))
* make sure data is watched by effect ([cd89d48](https://github.com/ofkm/arcane/commit/cd89d48677c1ebb899979663e7ddaeba9410705d))
* set default restart policy to unless-stopped ([4c578e4](https://github.com/ofkm/arcane/commit/4c578e4d9faca22333f15f011ed2c98c46c3ebb3))
* show ipvaln/macvlan ip address on details page ([77495da](https://github.com/ofkm/arcane/commit/77495da4b40a7da02a50deea336ced9a7885abe5))
* use  for watching containers ([e99ec10](https://github.com/ofkm/arcane/commit/e99ec10787af07e4f4e27e7fb8195c45ccde00c7))
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
