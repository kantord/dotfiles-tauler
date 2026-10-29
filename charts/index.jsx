// The chart library's public surface: what `import { ... } from "@gh/kantord/dotfiles-tauler"` gives a
// layout for charts. The package's own index.jsx lists the same names (it also holds the data, display and
// unit components, which need tauler's runtime); the examples (charts/examples) are run against this file,
// and a test checks the two lists agree.
export { Plot } from './Plot.jsx';
export { chartTheme } from './theme.jsx';
export { Layer, Scale, Axis, Grid, Legend, defineMark, stack, dodge, jitter, jitterPx, geo, polar, colorScale, sizeScale, shapeScale, opacityScale, defineScale, defineGuide, linearGradient, radialGradient, pattern, hatch, blur, dropShadow, marker, arrowhead, mask, clipRect, clipPath } from './core.jsx';
export { Line, Area, Rect, Bar, Dot, Link, Vector, Text, Arc, Polygon, RuleX, RuleY, TickX, TickY, Swarm, Image, Group } from './marks.jsx';
export { bin, bin2d, group, rolling, cumsum, normalize, last, fold, groupBy, rank, kde, ecdf, boxStats, treemap, tree, pack, partition, flow, hexbin, delaunay, contours, densityContours, regress, difference, waterfall, orderBy, dateRange } from './stats.jsx';
export { Treemap, Tree, Pack, Partition } from './hierarchy.jsx';
export { Geo, GeoDot } from './geo.jsx';
