import { LOBE_MARKS } from "../../client/components/lobe-marks";
import { LOCAL_MARKS } from "../../client/components/provider-logo";
import { BRAND_PATHS } from "../../client/components/glyph";

const marks: Array<{ id: string; svg: string; mono: boolean }> = [];
for (const [name, mark] of Object.entries(LOBE_MARKS)) {
  marks.push({ id: `lobe:${name}`, svg: mark.svg, mono: mark.mono });
}
for (const [name, svg] of Object.entries(LOCAL_MARKS)) {
  if (svg) marks.push({ id: `provider:${name}`, svg, mono: true });
}
for (const [name, brand] of Object.entries(BRAND_PATHS)) {
  marks.push({
    id: `brand:${name.toLowerCase()}`,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${brand.viewBox}" fill="currentColor"><path d="${brand.d}"/></svg>`,
    mono: true,
  });
}
console.log(JSON.stringify(marks));
