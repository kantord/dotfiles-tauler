// Synthetic, seeded data shaped like the datasets ggplot2's examples use, so the grammar cases
// can mirror those examples without shipping anyone else's data. Same seed, same rows, always.
import * as d3 from 'd3';

const random = seed => d3.randomLcg(seed);
const round = (v, digits = 1) => Math.round(v * 10 ** digits) / 10 ** digits;

// Cars (like ggplot2's mpg): engine size against mileage, with categories. Some (class, drive)
// combinations never occur, so a dodge has bands with missing series, and no front-drive car
// has a big engine, so a (drive, cylinders) facet grid has empty panels.
const CLASSES = ['compact', 'midsize', 'suv', 'pickup', 'minivan', 'subcompact', '2seater'];
const DRIVES = { compact: ['f', '4'], midsize: ['f', '4'], suv: ['4', 'r'], pickup: ['4'],
  minivan: ['f'], subcompact: ['f', 'r'], '2seater': ['r'] };
export const cars = (() => {
  const r = random(1), n = d3.randomNormal.source(r)(0, 1);
  return d3.range(80).map(i => {
    const cls = CLASSES[i % CLASSES.length], drives = DRIVES[cls], drv = drives[Math.floor(r() * drives.length)];
    const displ = round(1.6 + r() * (drv === 'f' ? 2.3 : 5.2)), cyl = displ < 2.6 ? 4 : displ < 4 ? 6 : 8;
    const hwy = round(Math.max(12, 38 - 3.2 * displ + (drv === 'f' ? 3 : 0) + 2.5 * n()), 0);
    return { displ, cyl, drv, cls, hwy, cty: round(hwy * 0.72 + n(), 0) };
  });
})();

// A long monthly series (like economics): a smooth trend with a cycle.
export const monthly = d3.range(480).map(i => ({
  date: new Date(Date.UTC(1970, i, 1)),
  unemploy: round(4000 + 18 * i + 2500 * Math.sin(i / 40) + 600 * Math.sin(i / 7), 0),
}));

// Two clusters (like faithful): short eruptions with short waits, long with long.
export const eruptions = (() => {
  const n = d3.randomNormal.source(random(2))(0, 1);
  return d3.range(120).map(i => i % 3
    ? { eruptions: round(4.3 + 0.4 * n(), 2), waiting: round(80 + 6 * n(), 0) }
    : { eruptions: round(2.0 + 0.3 * n(), 2), waiting: round(54 + 5 * n(), 0) });
})();

// Repeated measures (like nlme's Oxboys): each subject grows along its own line.
export const growth = d3.cross(['s1', 's2', 's3', 's4', 's5'], d3.range(9), (subject, k) => {
  const s = Number(subject[1]);
  return { subject, age: round(-1 + k * 0.25, 2), height: round(130 + 4 * s + (6 + s / 2) * k * 0.25, 1) };
});

// A march out and back (like Minard's): positions, survivors falling, two directions, and
// cities with their own rows.
export const march = d3.range(14).map(i => {
  const back = i >= 7, k = back ? 13 - i : i;
  return { lon: round(24 + k * 1.8, 1), lat: round(54.5 + (back ? -0.4 : 0) + Math.sin(k / 2) * 0.3, 2),
    survivors: Math.round(340000 * 0.72 ** i), direction: back ? 'retreat' : 'advance' };
});
export const cities = [{ lon: 24, lat: 54.9, city: 'West' }, { lon: 29.4, lat: 55.2, city: 'Middle' }, { lon: 36.6, lat: 54.6, city: 'East' }];
