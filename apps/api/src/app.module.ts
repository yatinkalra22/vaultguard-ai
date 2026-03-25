import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // WHY: isGlobal: true makes ConfigService available in every module without
    // re-importing ConfigModule. Reduces boilerplate across all feature modules.
    // See: https://docs.nestjs.com/techniques/configuration#use-module-globally
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
