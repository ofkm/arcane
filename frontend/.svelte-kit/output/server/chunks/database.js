import { j as spread_props, a as pop, p as push } from "./index3.js";
import { I as Icon } from "./Icon.js";
function Database($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "ellipse",
      { "cx": "12", "cy": "5", "rx": "9", "ry": "3" }
    ],
    ["path", { "d": "M3 5V19A9 3 0 0 0 21 19V5" }],
    ["path", { "d": "M3 12A9 3 0 0 0 21 12" }]
  ];
  Icon($$payload, spread_props([
    { name: "database" },
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
export {
  Database as D
};
