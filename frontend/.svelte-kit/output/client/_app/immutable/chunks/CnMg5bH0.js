globalThis.bitsIdCounter??(globalThis.bitsIdCounter={current:0});function r(t="bits"){return globalThis.bitsIdCounter.current++,`${t}-${globalThis.bitsIdCounter.current}`}export{r as u};
