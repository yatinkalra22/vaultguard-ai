import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

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
  // WHY: Gemini is primary. Instantiated only when GEMINI_API_KEY is present
  // so the service starts cleanly in envs that only have Anthropic configured.
  private readonly gemini: GoogleGenAI | null;
  // WHY: Anthropic is retained as secondary fallback. Instantiated only when
  // ANTHROPIC_API_KEY is present so neither key is strictly required at boot.
  private readonly anthropic: Anthropic | null;

  constructor(config: ConfigService) {
    const geminiKey = config.get<string>('GEMINI_API_KEY');
    this.gemini = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

    const anthropicKey = config.get<string>('ANTHROPIC_API_KEY');
    this.anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

    if (!this.gemini && !this.anthropic) {
      this.logger.warn(
        'Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is set. ' +
          'AI analysis will use the heuristic fallback.',
      );
    } else if (!this.gemini) {
      this.logger.warn(
        'GEMINI_API_KEY not set — using Anthropic as the sole AI provider.',
      );
    }
  }

  // ─── Schema guards ────────────────────────────────────────────────────────

  private isRecommendation(
    value: unknown,
  ): value is AIAnalysis['recommendations'][number] {
    if (typeof value !== 'object' || value === null) return false;
    const r = value as Record<string, unknown>;
    return (
      typeof r.findingId === 'string' &&
      (r.priority === 'immediate' ||
        r.priority === 'soon' ||
        r.priority === 'monitor') &&
      typeof r.action === 'string' &&
      typeof r.rationale === 'string'
    );
  }

  private isAIAnalysis(value: unknown): value is AIAnalysis {
    if (typeof value !== 'object' || value === null) return false;
    const a = value as Record<string, unknown>;
    return (
      typeof a.riskScore === 'number' &&
      typeof a.summary === 'string' &&
      Array.isArray(a.recommendations) &&
      a.recommendations.every((rec) => this.isRecommendation(rec))
    );
  }

  private parseJsonResponse(raw: string): AIAnalysis {
    // WHY: Strip markdown fences — models sometimes wrap JSON in ```json blocks
    // despite being told not to. This is a known LLM behaviour.
    const cleaned = raw.replace(/```json\s*|```\s*/g, '').trim();
    const parsed: unknown = JSON.parse(cleaned);
    if (!this.isAIAnalysis(parsed)) {
      throw new Error('AI response did not match expected analysis schema');
    }
    return parsed;
  }

  // ─── Provider implementations ─────────────────────────────────────────────

  /**
   * WHY: Gemini 3.1 Pro Preview is Google's most advanced reasoning model
   * (released Feb 2026). It succeeds Gemini 3 Pro (shut down Mar 9, 2026)
   * and handles structured JSON generation reliably at low latency.
   * See: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview
   */
  private async analyzeWithGemini(
    prompt: string,
  ): Promise<AIAnalysis> {
    const response = await this.gemini!.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: { maxOutputTokens: 2000 },
    });

    return this.parseJsonResponse(response.text ?? '');
  }

  /**
   * WHY: Claude Sonnet is kept as secondary fallback.
   * Using claude-sonnet-4-5 (not Opus) for cost + speed balance.
   * See: https://docs.anthropic.com/en/docs/about-claude/models
   */
  private async analyzeWithAnthropic(
    prompt: string,
  ): Promise<AIAnalysis> {
    const response = await this.anthropic!.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const firstBlock = response.content[0];
    const text =
      firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';

    return this.parseJsonResponse(text);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Analyze scan findings.
   * Priority: Gemini 3.1 Pro → Anthropic Claude Sonnet → heuristic fallback.
   *
   * WHY: Gemini is primary for superior reasoning on structured JSON tasks.
   * Anthropic is secondary so existing deployments without a Gemini key keep
   * working. The heuristic fallback guarantees scans always complete.
   */
  async analyzeFindings(findings: Record<string, unknown>[]): Promise<AIAnalysis> {
    if (findings.length === 0) {
      return {
        riskScore: 5,
        summary: 'No issues found. Your workspace looks clean.',
        recommendations: [],
      };
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

    // 1. Try Gemini (primary)
    if (this.gemini) {
      try {
        const result = await this.analyzeWithGemini(prompt);
        this.logger.log('AI analysis completed via Gemini');
        return result;
      } catch (err) {
        this.logger.warn('Gemini analysis failed, falling back to Anthropic:', err);
      }
    }

    // 2. Try Anthropic (secondary)
    if (this.anthropic) {
      try {
        const result = await this.analyzeWithAnthropic(prompt);
        this.logger.log('AI analysis completed via Anthropic (fallback)');
        return result;
      } catch (err) {
        this.logger.error('Anthropic analysis failed:', err);
      }
    }

    // 3. Heuristic fallback — scan still completes without AI enrichment
    this.logger.warn('All AI providers failed or unconfigured — using heuristic fallback');
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
