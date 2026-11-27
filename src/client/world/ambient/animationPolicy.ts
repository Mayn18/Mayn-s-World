export interface AnimationPolicy {
  enabled: boolean;
  reducedMotion: boolean;
  pageVisible: boolean;
}

export function animationAllowed(policy: AnimationPolicy): boolean {
  return policy.enabled && !policy.reducedMotion && policy.pageVisible;
}
