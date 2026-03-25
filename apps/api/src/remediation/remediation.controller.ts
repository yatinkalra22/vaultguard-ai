import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RemediationService } from './remediation.service';
import { SupabaseService } from '../common/supabase.service';

@Controller('remediations')
@UseGuards(JwtAuthGuard)
export class RemediationController {
  constructor(
    private readonly remediationService: RemediationService,
    private readonly supabase: SupabaseService,
  ) {}

  /** Create a remediation request — triggers CIBA approval flow. */
  @Post()
  async createRemediation(
    @Body()
    body: {
      findingId: string;
      action: string;
      targetEntity: Record<string, unknown>;
    },
    @Request() req: { user: { sub: string; orgId?: string } },
  ) {
    const orgId = req.user.orgId;
    if (!orgId) {
      return { error: 'No organization associated with this user' };
    }

    return this.remediationService.requestRemediation({
      findingId: body.findingId,
      orgId,
      userSub: req.user.sub,
      action: body.action,
      targetEntity: body.targetEntity,
    });
  }

  /** Get remediation status — also polls CIBA if still pending. */
  @Get(':id')
  async getRemediation(
    @Param('id') id: string,
    @Request() req: { user: { orgId?: string } },
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return null;

    // WHY: checkAndExecute both returns current status AND advances the state
    // machine if the admin has responded. This means the frontend can poll
    // this endpoint and see the status change in real time.
    return this.remediationService.checkAndExecute(id);
  }

  /** List all remediations for the current org. */
  @Get()
  async listRemediations(
    @Request() req: { user: { orgId?: string } },
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return [];

    const { data } = await this.supabase.client
      .from('remediations')
      .select('*')
      .eq('org_id', orgId)
      .order('requested_at', { ascending: false });

    return data ?? [];
  }
}
