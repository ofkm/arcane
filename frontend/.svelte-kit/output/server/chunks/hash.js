import { j as spread_props, a as pop, p as push } from "./index3.js";
import { I as Icon } from "./Icon.js";
function Hash($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "line",
      { "x1": "4", "x2": "20", "y1": "9", "y2": "9" }
    ],
    [
      "line",
      {
        "x1": "4",
        "x2": "20",
        "y1": "15",
        "y2": "15"
      }
    ],
    [
      "line",
      {
        "x1": "10",
        "x2": "8",
        "y1": "3",
        "y2": "21"
      }
    ],
    [
      "line",
      {
        "x1": "16",
        "x2": "14",
        "y1": "3",
        "y2": "21"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "hash" },
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
  Hash as H
};
