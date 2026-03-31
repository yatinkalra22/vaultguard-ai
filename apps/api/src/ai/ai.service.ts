import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface AIAnalysis {
  riskScore: number;
  summary: string;
  recommendations: Array<{
    findingId: string;
    priority: 'immediate' | 'soon' | 'monitor';
    action: string;
    rationale: string;
  }>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic;

  constructor(config: ConfigService) {
    this.client = new Anthropic({
      apiKey: config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Analyze scan findings using Claude Sonnet.
   *
   * WHY: Using claude-sonnet-4-5 (not Opus) because:
   * 1. Best balance of reasoning quality + cost for structured JSON analysis
   * 2. Faster response times — important for real-time scan UX
   * 3. Sufficient for risk scoring and recommendation generation
   * See: https://docs.anthropic.com/en/docs/about-claude/models
   */
  async analyzeFindings(findings: Record<string, unknown>[]): Promise<AIAnalysis> {
    if (findings.length === 0) {
      return {
        riskScore: 5,
        summary: 'No issues found. Your workspace looks clean.',
        recommendations: [],
      };
    }

    function isRecommendation(
      value: unknown,
    ): value is AIAnalysis['recommendations'][number] {
      if (typeof value !== 'object' || value === null) return false;
      const recommendation = value as Record<string, unknown>;
      const validPriority =
        recommendation.priority === 'immediate' ||
        recommendation.priority === 'soon' ||
        recommendation.priority === 'monitor';

      return (
        typeof recommendation.findingId === 'string' &&
        validPriority &&
        typeof recommendation.action === 'string' &&
        typeof recommendation.rationale === 'string'
      );
    }

    function isAIAnalysis(value: unknown): value is AIAnalysis {
      if (typeof value !== 'object' || value === null) return false;
      const analysis = value as Record<string, unknown>;
      return (
        typeof analysis.riskScore === 'number' &&
        typeof analysis.summary === 'string' &&
        Array.isArray(analysis.recommendations) &&
        analysis.recommendations.every((rec) => isRecommendation(rec))
      );
    }

    const prompt = `You are a security analyst reviewing access governance findings for a company's SaaS tools (Slack and GitHub).

Here are the raw findings from scanning:
${JSON.stringify(findings, null, 2)}

Analyze these findings and respond with ONLY valid JSON matching this exact structure:
{
  "riskScore": <integer 0-100>,
  "summary": "<1-2 sentence plain English summary for a non-technical admin>",
  "recommendations": [
    {
      "findingId": "<index number as string, starting from 0>",
      "priority": "<immediate|soon|monitor>",
      "action": "<specific, actionable step in plain English>",
      "rationale": "<why this is a security risk, in one sentence>"
    }
  ]
}

Scoring guide:
- 0-20: Clean — no urgent issues
- 21-50: Attention needed — some hygiene issues
- 51-80: Significant risk — critical issues present
- 81-100: Critical — immediate action required

Rules:
- Order recommendations by priority (immediate first)
- Every finding must have a recommendation
- Actions should be specific: "Downgrade John's role to Member" not "Review access"
- Keep summary under 30 words`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const firstContentBlock = response.content[0];
      const text =
        firstContentBlock && firstContentBlock.type === 'text'
          ? firstContentBlock.text
          : '';

      // WHY: Strip markdown fences — Claude sometimes wraps JSON in ```json blocks
      // despite being told not to. This is a known behavior.
      const cleaned = text.replace(/```json\s*|```\s*/g, '').trim();
      const parsed: unknown = JSON.parse(cleaned);
      if (!isAIAnalysis(parsed)) {
        throw new Error('AI response did not match expected analysis schema');
      }
      return parsed;
    } catch (err) {
      this.logger.error('AI analysis failed:', err);

      // WHY: Fallback ensures scans complete even if AI is down or returns
      // malformed JSON. The scan data is still valuable without AI enrichment.
      return {
        riskScore: Math.min(findings.length * 15, 100),
        summary: `${findings.length} finding(s) detected. Manual review recommended.`,
        recommendations: findings.map((_, i) => ({
          findingId: String(i),
          priority: 'soon' as const,
          action: 'Review this finding manually and take appropriate action.',
          rationale: 'AI analysis unavailable — manual review required.',
        })),
      };
    }
  }
}
