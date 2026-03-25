import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupabaseService } from '../common/supabase.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly supabase: SupabaseService) {}

  /** List audit logs with optional filters. */
  @Get()
  async listAuditLogs(
    @Request() req: { user: { orgId?: string } },
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return { data: [], count: 0 };

    let query = this.supabase.client
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (action && action !== 'all') {
      query = query.eq('action', action);
    }

    const pageLimit = Math.min(Number(limit) || 25, 100);
    const pageOffset = Number(offset) || 0;
    query = query.range(pageOffset, pageOffset + pageLimit - 1);

    const { data, count } = await query;

    return {
      data: data ?? [],
      count: count ?? 0,
      limit: pageLimit,
      offset: pageOffset,
    };
  }
}
