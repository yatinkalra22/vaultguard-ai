import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

// WHY: @Global() because audit logging is needed across multiple modules
// (scanning, remediation, findings). Making it global avoids circular imports.
@Global()
@Module({
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
