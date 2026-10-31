import test from 'node:test';
import assert from 'node:assert/strict';
import { getSharedMenuPlan, publishMenuPlan, subscribeMenuPlan, type Plan } from '../src/games/perfect-shot/anim/presets';

const plan: Plan = {
  title: Array(11).fill('classic'),
  gun: 'combo',
  buttons: ['rise', 'pop'],
  nav: ['classic', 'spin', 'jelly', 'flip'],
  k: 0.75,
};

test('both game panes can use the exact same resolved menu animation plan', () => {
  let received: Plan | null = null;
  const unsubscribe = subscribeMenuPlan((next) => { received = next; });
  try {
    publishMenuPlan(plan);
    assert.equal(getSharedMenuPlan(), plan);
    assert.equal(received, plan, 'mounted SGA menus receive the preset selected by Perfect Shot');
  } finally { unsubscribe(); }
});
