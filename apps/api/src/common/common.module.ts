import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { TokenVaultService } from './token-vault.service';

// WHY: @Global() makes SupabaseService and TokenVaultService available in every
// module without importing CommonModule everywhere. Both are needed by most
// feature modules (DB access + provider token exchange).
@Global()
@Module({
  providers: [SupabaseService, TokenVaultService],
  exports: [SupabaseService, TokenVaultService],
})
export class CommonModule {}
