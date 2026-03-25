import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

// WHY: @Global() makes SupabaseService available in every module without
// importing CommonModule everywhere. Since every feature module needs DB access,
// this reduces boilerplate significantly.
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class CommonModule {}
