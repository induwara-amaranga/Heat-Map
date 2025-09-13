// svgStore.js
let cachedSVG = null;

export const setCachedSVG = (svg) => {
  cachedSVG = svg;
};

export const getCachedSVG = () => cachedSVG;
