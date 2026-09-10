import {
  Controller,
  Get,
  Query,
  Header,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
    const { isHealthy, result } = await this.healthService.checkHealth();
    if (!isHealthy) {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}

@Controller('metrics')
export class MetricsController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(@Query('format') format?: string) {
    if (format === 'json') {
      const { result } = await this.healthService.checkHealth();
      return result;
    }
    return this.healthService.getPrometheusMetrics();
  }
}
