import { describe, it, expect } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController (API Health & Node Discovery)', () => {
  it('returns healthy status and registers Hestia and shared node endpoints', () => {
    const controller = new HealthController();
    const health = controller.getHealth();

    expect(health.status).toBe('ok');
    expect(health.service).toBe('velupi-control-plane');
    expect(health.nodes.hestiaHost).toBe('cloudfly.com.co');
    expect(health.nodes.sharedNode01Ip).toBe('169.58.220.244');
    expect(health.timestamp).toBeDefined();
  });
});
