import { o as on } from './events-CVA3EDdV.js';
import { w as watch, k as executeCallbacks } from './create-id-DRrkdd12.js';
import { g as getWindow, h as getDocument, j as isHTMLElement, e as isElement } from './scroll-lock-C_EWKkAl.js';
import { c as boxAutoReset } from './popper-layer-force-mount-A94KrKTq.js';

function useGraceArea(opts) {
  const enabled = opts.enabled();
  const isPointerInTransit = boxAutoReset(false, {
    afterMs: opts.transitTimeout ?? 300,
    onChange: (value) => {
      if (enabled) {
        opts.setIsPointerInTransit?.(value);
      }
    },
    getWindow: () => getWindow(opts.triggerNode())
  });
  let pointerGraceArea = null;
  function handleRemoveGraceArea() {
    pointerGraceArea = null;
    isPointerInTransit.current = false;
  }
  function handleCreateGraceArea(e, hoverTarget) {
    const currentTarget = e.currentTarget;
    if (!isHTMLElement(currentTarget)) return;
    const exitPoint = { x: e.clientX, y: e.clientY };
    const exitSide = getExitSideFromRect(exitPoint, currentTarget.getBoundingClientRect());
    const paddedExitPoints = getPaddedExitPoints(exitPoint, exitSide);
    const hoverTargetPoints = getPointsFromRect(hoverTarget.getBoundingClientRect());
    const graceArea = getHull([...paddedExitPoints, ...hoverTargetPoints]);
    pointerGraceArea = graceArea;
    isPointerInTransit.current = true;
  }
  watch(
    [
      opts.triggerNode,
      opts.contentNode,
      opts.enabled
    ],
    ([triggerNode, contentNode, enabled2]) => {
      if (!triggerNode || !contentNode || !enabled2) return;
      const handleTriggerLeave = (e) => {
        handleCreateGraceArea(e, contentNode);
      };
      const handleContentLeave = (e) => {
        handleCreateGraceArea(e, triggerNode);
      };
      return executeCallbacks(on(triggerNode, "pointerleave", handleTriggerLeave), on(contentNode, "pointerleave", handleContentLeave));
    }
  );
  watch(() => pointerGraceArea, () => {
    const handleTrackPointerGrace = (e) => {
      if (!pointerGraceArea) return;
      const target = e.target;
      if (!isElement(target)) return;
      const pointerPosition = { x: e.clientX, y: e.clientY };
      const hasEnteredTarget = opts.triggerNode()?.contains(target) || opts.contentNode()?.contains(target);
      const isPointerOutsideGraceArea = !isPointInPolygon(pointerPosition, pointerGraceArea);
      if (hasEnteredTarget) {
        handleRemoveGraceArea();
      } else if (isPointerOutsideGraceArea) {
        handleRemoveGraceArea();
        opts.onPointerExit();
      }
    };
    const doc = getDocument(opts.triggerNode() ?? opts.contentNode());
    if (!doc) return;
    return on(doc, "pointermove", handleTrackPointerGrace);
  });
  return { isPointerInTransit };
}
function getExitSideFromRect(point, rect) {
  const top = Math.abs(rect.top - point.y);
  const bottom = Math.abs(rect.bottom - point.y);
  const right = Math.abs(rect.right - point.x);
  const left = Math.abs(rect.left - point.x);
  switch (Math.min(top, bottom, right, left)) {
    case left:
      return "left";
    case right:
      return "right";
    case top:
      return "top";
    case bottom:
      return "bottom";
    default:
      throw new Error("unreachable");
  }
}
function getPaddedExitPoints(exitPoint, exitSide, padding = 5) {
  const tipPadding = padding * 1.5;
  switch (exitSide) {
    case "top":
      return [
        {
          x: exitPoint.x - padding,
          y: exitPoint.y + padding
        },
        { x: exitPoint.x, y: exitPoint.y - tipPadding },
        {
          x: exitPoint.x + padding,
          y: exitPoint.y + padding
        }
      ];
    case "bottom":
      return [
        {
          x: exitPoint.x - padding,
          y: exitPoint.y - padding
        },
        { x: exitPoint.x, y: exitPoint.y + tipPadding },
        {
          x: exitPoint.x + padding,
          y: exitPoint.y - padding
        }
      ];
    case "left":
      return [
        {
          x: exitPoint.x + padding,
          y: exitPoint.y - padding
        },
        { x: exitPoint.x - tipPadding, y: exitPoint.y },
        {
          x: exitPoint.x + padding,
          y: exitPoint.y + padding
        }
      ];
    case "right":
      return [
        {
          x: exitPoint.x - padding,
          y: exitPoint.y - padding
        },
        { x: exitPoint.x + tipPadding, y: exitPoint.y },
        {
          x: exitPoint.x - padding,
          y: exitPoint.y + padding
        }
      ];
  }
}
function getPointsFromRect(rect) {
  const { top, right, bottom, left } = rect;
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom }
  ];
}
function isPointInPolygon(point, polygon) {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function getHull(points) {
  const newPoints = points.slice();
  newPoints.sort((a, b) => {
    if (a.x < b.x) return -1;
    else if (a.x > b.x) return 1;
    else if (a.y < b.y) return -1;
    else if (a.y > b.y) return 1;
    else return 0;
  });
  return getHullPresorted(newPoints);
}
function getHullPresorted(points) {
  if (points.length <= 1) return points.slice();
  const upperHull = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    while (upperHull.length >= 2) {
      const q = upperHull[upperHull.length - 1];
      const r = upperHull[upperHull.length - 2];
      if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) upperHull.pop();
      else break;
    }
    upperHull.push(p);
  }
  upperHull.pop();
  const lowerHull = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (lowerHull.length >= 2) {
      const q = lowerHull[lowerHull.length - 1];
      const r = lowerHull[lowerHull.length - 2];
      if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) lowerHull.pop();
      else break;
    }
    lowerHull.push(p);
  }
  lowerHull.pop();
  if (upperHull.length === 1 && lowerHull.length === 1 && upperHull[0].x === lowerHull[0].x && upperHull[0].y === lowerHull[0].y) return upperHull;
  else return upperHull.concat(lowerHull);
}

export { useGraceArea as u };
//# sourceMappingURL=use-grace-area.svelte-DYFPGt31.js.map
