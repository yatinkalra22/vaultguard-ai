import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScanningService } from './scanning.service';
import { SupabaseService } from '../common/supabase.service';

@Controller('scans')
@UseGuards(JwtAuthGuard)
export class ScanningController {
  constructor(
    private readonly scanningService: ScanningService,
    private readonly supabase: SupabaseService,
  ) {}

  /** Manually trigger a scan for the current user's org. */
  @Post('trigger')
  async triggerScan(
    @Request() req: { user: { sub: string; orgId?: string } },
  ) {
    const orgId = req.user.orgId;
    if (!orgId) {
      return { error: 'No organization associated with this user' };
    }

    // WHY: Run scan async — return immediately so the frontend can show
    // progress via SSE. The scan emits events as it progresses.
    const result = await this.scanningService.runScan(
      orgId,
      req.user.sub,
      '', // GitHub org name — resolved from integrations table
    );

    return result;
  }

  /** List scan history for the current org. */
  @Get()
  async listScans(
    @Request() req: { user: { orgId?: string } },
    @Query('limit') limit?: string,
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return [];

    const { data } = await this.supabase.client
      .from('scans')
      .select('*')
      .eq('org_id', orgId)
      .order('started_at', { ascending: false })
      .limit(Number(limit) || 10);

    return data ?? [];
  }

  /** Get a single scan with its findings. */
  @Get(':id')
  async getScan(
    @Param('id') id: string,
    @Request() req: { user: { orgId?: string } },
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return null;

    const [{ data: scan }, { data: findings }] = await Promise.all([
      this.supabase.client
        .from('scans')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .single(),
      this.supabase.client
        .from('findings')
        .select('*')
        .eq('scan_id', id)
        .eq('org_id', orgId)
        .order('severity', { ascending: true }),
    ]);

    return { ...scan, findings: findings ?? [] };
  }
}
