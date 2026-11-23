import { animationAllowed, type AnimationPolicy } from './animationPolicy';

export type AmbientFrame = (time: number, animated: boolean) => void;

export interface SchedulerEnvironment {
  requestAnimationFrame(callback: (time: number) => void): number;
  cancelAnimationFrame(id: number): void;
  setTimeout(callback: () => void, delay: number): number;
  clearTimeout(id: number): void;
  now(): number;
}

const browserEnvironment: SchedulerEnvironment = {
  requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
  cancelAnimationFrame: (id) => window.cancelAnimationFrame(id),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: (id) => window.clearTimeout(id),
  now: () => performance.now(),
};

export class AmbientScheduler {
  private policy: AnimationPolicy = { enabled: false, reducedMotion: false, pageVisible: true };
  private timerId: number | null = null;
  private frameId: number | null = null;
  private lastFrameTime: number | null = null;
  private disposed = false;

  constructor(
    private readonly render: AmbientFrame,
    private readonly environment: SchedulerEnvironment = browserEnvironment,
    private readonly maxFramesPerSecond = 30,
  ) {}

  setPolicy(policy: AnimationPolicy): void {
    if (this.disposed) return;
    if (
      policy.enabled === this.policy.enabled &&
      policy.reducedMotion === this.policy.reducedMotion &&
      policy.pageVisible === this.policy.pageVisible
    ) return;
    this.policy = policy;
    if (animationAllowed(policy)) {
      this.cancelPending();
      const time = this.environment.now();
      this.render(time, true);
      this.lastFrameTime = time;
      this.schedule();
      return;
    }

    this.cancelPending();
    this.lastFrameTime = null;
    if (policy.pageVisible) this.render(this.environment.now(), false);
  }

  renderCurrent(): void {
    if (this.disposed || !this.policy.pageVisible) return;
    const time = this.environment.now();
    const animated = animationAllowed(this.policy);
    this.render(time, animated);
    if (animated) {
      this.cancelPending();
      this.lastFrameTime = time;
      this.schedule();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelPending();
  }

  private schedule(): void {
    if (
      this.disposed ||
      !animationAllowed(this.policy) ||
      this.timerId !== null ||
      this.frameId !== null
    ) return;

    const interval = this.frameInterval();
    const elapsed = this.lastFrameTime === null ? interval : this.environment.now() - this.lastFrameTime;
    const delay = Math.max(0, interval - elapsed);
    this.timerId = this.environment.setTimeout(() => {
      this.timerId = null;
      if (this.disposed || !animationAllowed(this.policy)) return;
      this.frameId = this.environment.requestAnimationFrame((time) => {
        this.frameId = null;
        if (this.disposed || !animationAllowed(this.policy)) return;
        if (this.lastFrameTime !== null && time - this.lastFrameTime < interval) {
          this.schedule();
          return;
        }
        this.lastFrameTime = time;
        this.render(time, true);
        this.schedule();
      });
    }, delay);
  }

  private frameInterval(): number {
    return 1000 / Math.min(30, Math.max(1, this.maxFramesPerSecond));
  }

  private cancelPending(): void {
    if (this.timerId !== null) {
      this.environment.clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.frameId !== null) {
      this.environment.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
