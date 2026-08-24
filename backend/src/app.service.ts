import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'drift-tennis-api',
      timestamp: new Date().toISOString(),
    };
  }
}
