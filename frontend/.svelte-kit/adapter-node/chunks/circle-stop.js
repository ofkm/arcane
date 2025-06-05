import { j as spread_props, a as pop, p as push } from "./index3.js";
import { I as Icon } from "./Icon.js";
function Circle_stop($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "10" }
    ],
    [
      "rect",
      {
        "x": "9",
        "y": "9",
        "width": "6",
        "height": "6",
        "rx": "1"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "circle-stop" },
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
  Circle_stop as C
};
