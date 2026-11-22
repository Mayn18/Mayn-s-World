import { describe, expect, it } from 'vitest';
import { AmbientScheduler, type SchedulerEnvironment } from './animationScheduler';

function fakeEnvironment() {
  let now = 0;
  let nextId = 1;
  const timeouts = new Map<number, { callback: () => void; due: number }>();
  const frames = new Map<number, (time: number) => void>();
  const environment: SchedulerEnvironment = {
    requestAnimationFrame(callback) {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    setTimeout(callback, delay) {
      const id = nextId++;
      timeouts.set(id, { callback, due: now + delay });
      return id;
    },
    clearTimeout(id) {
      timeouts.delete(id);
    },
    now: () => now,
  };
  return {
    environment,
    advance(milliseconds: number) {
      now += milliseconds;
      for (const [id, timer] of [...timeouts]) {
        if (timer.due > now) continue;
        timeouts.delete(id);
        timer.callback();
      }
      for (const [id, callback] of [...frames]) {
        frames.delete(id);
        callback(now);
      }
    },
    pending: () => timeouts.size + frames.size,
  };
}

describe('AmbientScheduler', () => {
  it('renders on demand at no more than 30 frames per second', () => {
    const fake = fakeEnvironment();
    const renders: [number, boolean][] = [];
    const scheduler = new AmbientScheduler((time, animated) => renders.push([time, animated]), fake.environment);

    scheduler.setPolicy({ enabled: true, reducedMotion: false, pageVisible: true });
    expect(renders).toEqual([[0, true]]);
    fake.advance(16);
    expect(renders).toHaveLength(1);
    fake.advance(18);
    expect(renders).toEqual([[0, true], [34, true]]);
    scheduler.dispose();
    expect(fake.pending()).toBe(0);
  });

  it('renders a static frame when motion is disabled and stops while hidden', () => {
    const fake = fakeEnvironment();
    const renders: boolean[] = [];
    const scheduler = new AmbientScheduler((_time, animated) => renders.push(animated), fake.environment);

    scheduler.setPolicy({ enabled: true, reducedMotion: false, pageVisible: true });
    scheduler.setPolicy({ enabled: false, reducedMotion: false, pageVisible: true });
    expect(renders).toEqual([true, false]);
    expect(fake.pending()).toBe(0);

    scheduler.setPolicy({ enabled: true, reducedMotion: false, pageVisible: true });
    scheduler.setPolicy({ enabled: true, reducedMotion: false, pageVisible: false });
    const countWhenHidden = renders.length;
    fake.advance(100);
    expect(renders).toHaveLength(countWhenHidden);
    expect(fake.pending()).toBe(0);
    scheduler.dispose();
  });

  it('uses a static frame and schedules nothing when reduced motion is requested', () => {
    const fake = fakeEnvironment();
    const renders: boolean[] = [];
    const scheduler = new AmbientScheduler((_time, animated) => renders.push(animated), fake.environment);

    scheduler.setPolicy({ enabled: true, reducedMotion: true, pageVisible: true });
    expect(renders).toEqual([false]);
    expect(fake.pending()).toBe(0);

    scheduler.setPolicy({ enabled: true, reducedMotion: false, pageVisible: true });
    expect(renders).toEqual([false, true]);
    expect(fake.pending()).toBe(1);
    scheduler.dispose();
  });

  it('cancels pending work during cleanup', () => {
    const fake = fakeEnvironment();
    const scheduler = new AmbientScheduler(() => {}, fake.environment);
    scheduler.setPolicy({ enabled: true, reducedMotion: false, pageVisible: true });
    expect(fake.pending()).toBe(1);
    scheduler.dispose();
    expect(fake.pending()).toBe(0);
  });
});
