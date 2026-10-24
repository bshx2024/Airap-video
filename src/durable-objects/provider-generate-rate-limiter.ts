// @ts-expect-error Cloudflare runtime module is unavailable to local Node types.
import { DurableObject } from 'cloudflare:workers';

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

export class ProviderGenerateRateLimiter extends DurableObject {
  constructor(
    readonly ctx: any,
    env: any
  ) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const { limit, windowMs } = (await request.json()) as {
      limit: number;
      windowMs: number;
    };
    const now = Date.now();
    const result = await this.ctx.storage.transaction(async (tx: any) => {
      const timestamps = ((await tx.get('timestamps')) || []).filter(
        (timestamp: number) => now - timestamp < windowMs
      );

      if (timestamps.length >= limit) {
        await tx.put('timestamps', timestamps);
        return {
          allowed: false,
          retryAfterMs: Math.max(1, windowMs - (now - timestamps[0])),
        } satisfies RateLimitResult;
      }

      timestamps.push(now);
      await tx.put('timestamps', timestamps);
      return { allowed: true, retryAfterMs: 0 } satisfies RateLimitResult;
    });

    return Response.json(result);
  }
}
