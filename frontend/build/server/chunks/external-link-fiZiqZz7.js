import { p as push, b as spread_props, a as pop } from './index3-DI1Ivwzg.js';
import { I as Icon } from './Icon-DbVCNmsR.js';

function External_link($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M15 3h6v6" }],
    ["path", { "d": "M10 14 21 3" }],
    [
      "path",
      {
        "d": "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "external-link" },
    props,
    {
      iconNode,
      children: ($$payload2) => {
        props.children?.($$payload2);
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    }
  ]));
  pop();
}

export { External_link as E };
//# sourceMappingURL=external-link-fiZiqZz7.js.map
