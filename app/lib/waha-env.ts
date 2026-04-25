import { z } from "zod";

const wahaServerSchema = z.object({
    NEXT_PUBLIC_WAHA_URL: z.string().url().min(8),
    WAHA_INTERNAL_API_KEY: z.string().min(16),
    WAHA_WEBHOOK_SECRET: z.string().min(16),
});

export type WahaServerEnv = z.infer<typeof wahaServerSchema>;

let cached: WahaServerEnv | null = null;

/** Variables WAHA requeridas en el servidor (API routes, server actions). */
export function getWahaServerEnv(): WahaServerEnv {
    if (cached) return cached;
    const parsed = wahaServerSchema.safeParse({
        NEXT_PUBLIC_WAHA_URL: process.env.NEXT_PUBLIC_WAHA_URL?.replace(/\/+$/, ""),
        WAHA_INTERNAL_API_KEY: process.env.WAHA_INTERNAL_API_KEY,
        WAHA_WEBHOOK_SECRET: process.env.WAHA_WEBHOOK_SECRET,
    });
    if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new Error(`WAHA env inválido: ${msg}`);
    }
    cached = parsed.data;
    return parsed.data;
}

export function wahaBaseUrl(): string {
    return getWahaServerEnv().NEXT_PUBLIC_WAHA_URL;
}

export function wahaInternalApiKey(): string {
    return getWahaServerEnv().WAHA_INTERNAL_API_KEY;
}

export function wahaWebhookSecret(): string {
    return getWahaServerEnv().WAHA_WEBHOOK_SECRET;
}
