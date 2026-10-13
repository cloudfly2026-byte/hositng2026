import { Controller, Get } from '@nestjs/common';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  nodes: {
    hestiaHost: string;
    sharedNode01Ip: string;
  };
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'velupi-control-plane',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      nodes: {
        hestiaHost: process.env.HESTIACP_HOST || 'cloudfly.com.co',
        sharedNode01Ip: process.env.INITIAL_NODE_IP || '169.58.220.244',
      },
    };
  }
}
