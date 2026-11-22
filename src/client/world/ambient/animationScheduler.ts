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
  private lastFrameTime = 0;
  private disposed = false;

  constructor(
    private readonly render: AmbientFrame,
    private readonly environment: SchedulerEnvironment = browserEnvironment,
    private readonly maxFramesPerSecond = 30,
  ) {}

  setPolicy(policy: AnimationPolicy): void {
    if (this.disposed) return;
    this.policy = policy;
    if (animationAllowed(policy)) {
      this.render(this.environment.now(), true);
      this.lastFrameTime = this.environment.now();
      this.schedule();
      return;
    }

    this.cancelPending();
    if (policy.pageVisible) this.render(this.environment.now(), false);
  }

  renderCurrent(): void {
    if (this.disposed || !this.policy.pageVisible) return;
    this.render(this.environment.now(), animationAllowed(this.policy));
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

    const interval = 1000 / Math.min(30, Math.max(1, this.maxFramesPerSecond));
    const delay = Math.max(0, interval - (this.environment.now() - this.lastFrameTime));
    this.timerId = this.environment.setTimeout(() => {
      this.timerId = null;
      if (this.disposed || !animationAllowed(this.policy)) return;
      this.frameId = this.environment.requestAnimationFrame((time) => {
        this.frameId = null;
        if (this.disposed || !animationAllowed(this.policy)) return;
        this.lastFrameTime = time;
        this.render(time, true);
        this.schedule();
      });
    }, delay);
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
