import { IsUUID, IsString, IsNotEmpty, IsObject } from 'class-validator';

/**
 * WHY: DTO with class-validator decorators so the global ValidationPipe
 * actually validates remediation requests. Without this, the inline
 * TypeScript type was only a compile-time check — any JSON payload would
 * pass through at runtime since ValidationPipe needs class-validator
 * metadata (decorators) to enforce validation.
 */
export class CreateRemediationDto {
  @IsUUID()
  findingId!: string;

  @IsString()
  @IsNotEmpty()
  action!: string;

  @IsObject()
  targetEntity!: Record<string, unknown>;
}
