import { describe, expect, it } from 'vitest';
import { AmbientScheduler, type SchedulerEnvironment } from './animationScheduler';

function fakeEnvironment(timestampOffset = 0) {
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
    now: () => now + timestampOffset,
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
    advanceTo(time: number) {
      now = time;
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
  it('keeps scheduled frames at or below 30 FPS with irregular frame times and clock skew', () => {
    const fake = fakeEnvironment(2);
    const renders: [number, boolean][] = [];
    const scheduler = new AmbientScheduler((time, animated) => renders.push([time, animated]), fake.environment);

    scheduler.setPolicy({ enabled: true, reducedMotion: false, pageVisible: true });
    expect(renders).toEqual([[2, true]]);
    for (const time of [16, 33, 50, 66, 83, 100, 116, 133, 150, 166, 183, 200]) {
      fake.advanceTo(time);
    }
    const interval = 1000 / 30;
    for (let index = 1; index < renders.length; index++) {
      expect(renders[index]![0] - renders[index - 1]![0]).toBeGreaterThanOrEqual(interval);
    }
    expect(renders.length).toBeGreaterThan(3);
    scheduler.dispose();
    expect(fake.pending()).toBe(0);
  });

  it('renders camera changes immediately without leaving an early scheduled frame', () => {
    const fake = fakeEnvironment();
    const renders: number[] = [];
    const scheduler = new AmbientScheduler((time) => renders.push(time), fake.environment);
    const policy = { enabled: true, reducedMotion: false, pageVisible: true };

    scheduler.setPolicy(policy);
    scheduler.setPolicy(policy);
    fake.advance(8);
    scheduler.renderCurrent();
    expect(renders).toEqual([0, 8]);
    expect(fake.pending()).toBe(1);

    fake.advance(16);
    expect(renders).toHaveLength(2);
    fake.advance(18);
    expect(renders).toHaveLength(3);
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
