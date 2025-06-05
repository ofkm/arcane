import { p as push, b as spread_props, a as pop } from './index3-DI1Ivwzg.js';
import { I as Icon } from './Icon-DbVCNmsR.js';

function Clock($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "10" }
    ],
    ["polyline", { "points": "12 6 12 12 16 14" }]
  ];
  Icon($$payload, spread_props([
    { name: "clock" },
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

export { Clock as C };
//# sourceMappingURL=clock-BAJle9Um.js.map
