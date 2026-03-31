import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupabaseService } from '../common/supabase.service';
import { FindingsAnalyticsService } from './findings-analytics.service';

@Controller('findings')
@UseGuards(JwtAuthGuard)
export class FindingsController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly analyticsService: FindingsAnalyticsService,
  ) {}

  /** Get comprehensive analytics dashboard. */
  @Get('analytics/dashboard')
  getAnalyticsDashboard() {
    return this.analyticsService.getDashboardAnalytics();
  }

  /** Get severity breakdown for pie chart. */
  @Get('analytics/severity')
  getSeverityBreakdown() {
    return this.analyticsService.getSeverityBreakdown();
  }

  /** Get category breakdown for bar chart. */
  @Get('analytics/category')
  getCategoryBreakdown() {
    return this.analyticsService.getCategoryBreakdown();
  }

  /** Get findings trend data for line chart. */
  @Get('analytics/trends')
  getFindingsTrend() {
    return this.analyticsService.getFindingsTrend();
  }

  /** Get top risks ranked by severity and impact. */
  @Get('analytics/top-risks')
  getTopRisks(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.analyticsService.getTopRisks(parsedLimit);
  }

  /** List all findings with optional filters. */
  @Get()
  async listFindings(
    @Request() req: { user: { orgId?: string } },
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return [];

    let query = this.supabase.client
      .from('findings')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    // WHY: Filter at DB level (not in-memory) to keep response times fast
    // as findings grow. Supabase PostgREST handles these as WHERE clauses.
    if (severity && severity !== 'all') {
      query = query.eq('severity', severity);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    } else {
      // Default to open findings only
      query = query.eq('status', 'open');
    }
    if (provider && provider !== 'all') {
      query = query.eq('provider', provider);
    }

    const { data } = await query;
    return data ?? [];
  }

  /** Get a single finding by ID. */
  @Get(':id')
  async getFinding(
    @Param('id') id: string,
    @Request() req: { user: { orgId?: string } },
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return null;

    const { data } = await this.supabase.client
      .from('findings')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    return data;
  }

  /** Mark a finding as ignored. */
  @Patch(':id/ignore')
  async ignoreFinding(
    @Param('id') id: string,
    @Request() req: { user: { sub: string; orgId?: string } },
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return { error: 'No organization' };

    const { data } = await this.supabase.client
      .from('findings')
      .update({ status: 'ignored' })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    // Log to audit trail
    if (data) {
      await this.supabase.client.from('audit_logs').insert({
        org_id: orgId,
        actor: req.user.sub,
        action: 'finding.ignored',
        target: { finding_id: id, title: data.title },
      });
    }

    return data;
  }
}
