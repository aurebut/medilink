import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../components/marketing/process-navigation.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(reducedMotion = false, firstScene) {
  let now = 0;
  let frame;
  let observe;
  function element() {
    const listeners = {};
    return {
      style: {}, offsetLeft: 0, offsetWidth: 100, scrollLeft: 0,
      addEventListener(name, handler) { listeners[name] = handler; },
      fire(name, event = {}) { listeners[name]?.({ preventDefault() {}, ...event }); },
      setAttribute(name, value) { this[name] = value; },
      scrollTo() {}, focus() { this.focused = true; },
    };
  }
  const tabs = Array.from({ length: 3 }, () => {
    const tab = element();
    tab.fill = element();
    tab.querySelector = () => tab.fill;
    return tab;
  });
  const panels = tabs.map(element);
  const nav = element();
  const container = element();
  const section = element();
  section.querySelector = (selector) => selector === '.ml-process-nav' ? nav : container;
  section.querySelectorAll = (selector) => selector === '[role="tab"]' ? tabs : panels;
  const document = element();
  document.querySelector = () => section;
  document.hidden = false;
  class IntersectionObserver {
    constructor(callback) { observe = callback; }
    observe() {}
  }
  runInNewContext(source + '\nexports.initializeProcessNavigation(firstScene);', {
    exports: {}, firstScene, AbortController,
    Element: class { static [Symbol.hasInstance](value) { return typeof value?.closest === 'function'; } },
    document,
    window: { matchMedia: () => ({ matches: reducedMotion }), IntersectionObserver },
    IntersectionObserver,
    performance: { now: () => now },
    requestAnimationFrame(callback) { frame = callback; return 1; },
    cancelAnimationFrame() {},
  });
  observe([{ isIntersecting: true }]);
  return {
    tabs, panels, nav, section,
    tick(time) { now = time; frame(now); },
    active() { return tabs.findIndex(tab => tab['aria-selected'] === 'true'); },
    progress(index) { return parseFloat(tabs[index].fill.style.width); },
    visible(value) { observe([{ isIntersecting: value }]); },
    hidden(value) { document.hidden = value; document.fire('visibilitychange'); },
  };
}

test('click resumes after four seconds even while the pointer stays over navigation', () => {
  const ui = setup();
  ui.tick(0);
  ui.nav.fire('mouseenter');
  ui.tabs[2].fire('click');
  ui.tick(3999);
  assert.equal(ui.progress(2), 0);
  assert.equal(ui.panels[2].hidden, false);
  ui.tick(4000);
  ui.tick(6750);
  assert.equal(ui.progress(2), 50);
  ui.tick(9500);
  assert.equal(ui.active(), 0);
});

test('a new selection restarts the reading delay and full progress cycle', () => {
  const ui = setup();
  ui.tabs[1].fire('click');
  ui.tick(3000);
  ui.tabs[2].fire('click');
  ui.tick(6999);
  assert.equal(ui.progress(2), 0);
  ui.tick(7000);
  ui.tick(9750);
  assert.equal(ui.progress(2), 50);
});

test('keyboard and swipe navigation also resume automatically', () => {
  for (const method of ['keyboard', 'swipe']) {
    const ui = setup();
    if (method === 'keyboard') {
      ui.tabs[0].fire('keydown', { key: 'ArrowRight' });
      assert.equal(ui.tabs[1].focused, true);
      assert.equal(ui.tabs[1].tabIndex, 0);
    } else {
      const target = { closest: () => null };
      ui.section.fire('touchstart', { target, changedTouches: [{ screenX: 200, screenY: 0 }] });
      ui.section.fire('touchend', { target, changedTouches: [{ screenX: 100, screenY: 0 }] });
    }
    assert.equal(ui.active(), 1);
    ui.tick(4000);
    ui.tick(9500);
    assert.equal(ui.active(), 2);
  }
});

test('time offscreen or in a hidden tab does not advance the step', () => {
  for (const reason of ['offscreen', 'hidden']) {
    const ui = setup();
    ui.tick(0);
    ui.tick(2750);
    if (reason === 'offscreen') ui.visible(false);
    else ui.hidden(true);
    ui.tick(20000);
    assert.equal(ui.progress(0), 50);
    if (reason === 'offscreen') ui.visible(true);
    else ui.hidden(false);
    ui.tick(20000);
    assert.equal(ui.progress(0), 50);
    ui.tick(22750);
    assert.equal(ui.active(), 1);
  }
});

test('reduced motion keeps autoplay disabled after manual selection', () => {
  const ui = setup(true);
  ui.tabs[2].fire('click');
  ui.tick(4000);
  ui.tick(20000);
  assert.equal(ui.active(), 2);
  assert.equal(ui.progress(2), 0);
});

test('map, criteria and discussion finish inside tab 01 while later tabs keep their original cadence', () => {
  const rendered = [];
  const scene = { duration: 22000, canPlay: () => true, render: time => rendered.push(time), reset: () => rendered.push(0) };
  const ui = setup(false, scene);
  ui.tick(0);
  ui.tick(11000);
  assert.equal(ui.active(), 0);
  assert.equal(ui.progress(0), 50);
  assert.equal(rendered.at(-1), 11000);
  ui.tick(13000);
  assert.equal(ui.active(), 0);
  ui.tick(18000);
  assert.equal(ui.active(), 0);
  ui.tick(21999);
  assert.equal(ui.active(), 0);
  ui.tick(22000);
  assert.equal(ui.active(), 1);
  ui.tick(22000);
  ui.tick(24750);
  assert.equal(ui.progress(1), 50);
  ui.tick(27500);
  assert.equal(ui.active(), 2);
});

test('the first scene waits for its artwork and preserves its position when paused', () => {
  let ready = false;
  let rendered = 0;
  const scene = { duration: 22000, canPlay: () => ready, render: time => { rendered = time; }, reset: () => { rendered = 0; } };
  const ui = setup(false, scene);
  ui.tick(60000);
  assert.equal(ui.active(), 0);
  assert.equal(rendered, 0);
  ready = true;
  ui.tick(60000);
  ui.tick(63000);
  assert.equal(rendered, 3000);
  ready = false;
  ui.tick(63000);
  ui.tick(90000);
  assert.equal(rendered, 3000);
  ready = true;
  ui.tick(90000);
  assert.equal(rendered, 3000);
  ui.tick(93000);
  assert.equal(rendered, 6000);
  assert.equal(ui.active(), 0);
});
