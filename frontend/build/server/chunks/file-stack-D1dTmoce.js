import { p as push, b as spread_props, a as pop } from './index3-DI1Ivwzg.js';
import { I as Icon } from './Icon-DbVCNmsR.js';

function File_stack($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M21 7h-3a2 2 0 0 1-2-2V2" }],
    [
      "path",
      {
        "d": "M21 6v6.5c0 .8-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.7-1.5-1.5v-9c0-.8.7-1.5 1.5-1.5H17Z"
      }
    ],
    [
      "path",
      { "d": "M7 8v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H15" }
    ],
    [
      "path",
      { "d": "M3 12v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H11" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "file-stack" },
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

export { File_stack as F };
//# sourceMappingURL=file-stack-D1dTmoce.js.map
