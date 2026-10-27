// Tree marks, on made-up hierarchies. Drawings are kept in grammar/__svg__/ like the grammar cases.
import { test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { drawFigure, figureKeys, resetFigures } from '../../test/tauler.js';
import { Plot } from '../Plot.jsx';
import { compile } from '../core.jsx';
import { Treemap, Tree, Pack, Partition } from '../hierarchy.jsx';

beforeEach(resetFigures);

// Disk usage of a made-up home directory, in MB. Parents are implied by the paths.
const disk = [
  { path: 'home/media/photos', mb: 420 }, { path: 'home/media/music', mb: 260 }, { path: 'home/media/video', mb: 610 },
  { path: 'home/code/tauler', mb: 180 }, { path: 'home/code/enwiro', mb: 90 }, { path: 'home/code/scratch', mb: 30 },
  { path: 'home/mail', mb: 150 }, { path: 'home/notes', mb: 12 },
];
const total = d3.sum(disk, d => d.mb);
const shapes = (children, props = {}) => compile({ width: 240, height: 140, data: disk, children, ...props }).scene;
const snapshot = name => expect(drawFigure(figureKeys()[0])).toMatchFileSnapshot(`./grammar/__svg__/tree-${name}.svg`);
const rectArea = r => r.width * r.height;

test('a treemap tiles the plot area with one rect per leaf, each sized by its value', async () => {
  const scene = shapes([Treemap({ path: 'path', value: 'mb', padding: 0 })], { margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  const rects = scene.marks.filter(s => s.t === 'rect');
  expect(rects).toHaveLength(disk.length);
  expect(d3.sum(rects, rectArea)).toBeCloseTo(240 * 140, -1);
  const video = rects[disk.findIndex(d => d.path.endsWith('video'))], notes = rects[disk.findIndex(d => d.path.endsWith('notes'))];
  expect(rectArea(video) / rectArea(notes)).toBeCloseTo(610 / 12, 0);
  <Plot width={240} height={140} data={disk}><Treemap path="path" value="mb" label={d => d.path.split('/').at(-1)} padding={1} /></Plot>;
  await snapshot('treemap');
});

test('treemap leaves take their top-level branch\'s colour, and labels only where they fit', () => {
  const scene = shapes([Treemap({ path: 'path', value: 'mb', label: d => d.path.split('/').at(-1) })]);
  const rects = scene.marks.filter(s => s.t === 'rect');
  const fillOf = name => rects[disk.findIndex(d => d.path.endsWith(name))].fill;
  expect(fillOf('photos')).toBe(fillOf('video'));
  expect(fillOf('tauler')).not.toBe(fillOf('photos'));
  const labels = scene.front.map(s => s.text);
  expect(labels).toContain('video');
  expect(labels).not.toContain('notes');   // 12 MB of 1752 is too small to hold a word
});

test('id and parent work as well as paths', () => {
  const org = [{ id: 'root' }, { id: 'a', parent: 'root', n: 3 }, { id: 'b', parent: 'root', n: 1 }];
  const scene = compile({ width: 100, height: 100, data: org, children: [Treemap({ id: 'id', parent: 'parent', value: 'n' })] }).scene;
  expect(scene.marks.filter(s => s.t === 'rect')).toHaveLength(2);
});

test('a tree: a node per path segment, a link per parent, deeper is further right', async () => {
  // A made-up process tree.
  const procs = ['init', 'init/sshd', 'init/sshd/bash', 'init/sshd/bash/vim', 'init/cron', 'init/bar', 'init/bar/tick', 'init/bar/draw']
    .map(path => ({ path }));
  const scene = compile({ width: 240, height: 140, data: procs, children: [Tree({ path: 'path' })] }).scene;
  const nodes = scene.marks.filter(s => s.t === 'circle'), links = scene.marks.filter(s => s.t === 'path');
  expect(nodes).toHaveLength(procs.length);
  expect(links).toHaveLength(procs.length - 1);
  const x = name => nodes[scene.front.findIndex(t => t.text === name)].cx;   // labels follow nodes
  expect(x('init')).toBeLessThan(x('sshd'));
  expect(x('sshd')).toBeLessThan(x('vim'));
  expect(Math.max(...nodes.map(n => n.cx)) + Math.max(...scene.front.map(t => t.text.length)) * 11 * 0.6).toBeLessThanOrEqual(240);
  <Plot width={240} height={140} data={procs}><Tree path="path" /></Plot>;
  await snapshot('tree');
});

test('a circle pack: every circle sits inside its parent, leaves sized by value', async () => {
  const scene = shapes([Pack({ path: 'path', value: 'mb' })]);
  const circles = scene.marks.filter(s => s.t === 'circle');
  expect(circles.length).toBe(disk.length + 3);   // leaves, media and code, and home (the root)
  const [root] = circles;
  for (const c of circles) expect(Math.hypot(c.cx - root.cx, c.cy - root.cy) + c.r).toBeLessThanOrEqual(root.r + 0.02);
  <Plot width={240} height={140} data={disk}><Pack path="path" value="mb" /></Plot>;
  await snapshot('pack');
});

test('an icicle (partition): depth across, each child within its parent', async () => {
  const scene = shapes([Partition({ path: 'path', value: 'mb', padding: 0 })], { margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  const rects = scene.marks.filter(s => s.t === 'rect');
  const columns = d3.group(rects, r => r.x);
  expect(columns.size).toBe(3);   // home (the root), its children, theirs
  for (const column of columns.values()) expect(d3.sum(column, r => r.height)).toBeLessThanOrEqual(140 + 0.02);
  expect(d3.sum([...columns.values()][0], r => r.height)).toBeCloseTo(140, 1);
  <Plot width={240} height={140} data={disk}><Partition path="path" value="mb" label={d => d.path.split('/').at(-1)} /></Plot>;
  await snapshot('partition');
  expect(total).toBe(1752);
});
