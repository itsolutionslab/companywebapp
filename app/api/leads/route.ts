import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '../../lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { rateLimit } from '../../lib/rate-limiter';
import { deobfuscateData } from '../../lib/obfuscation';
import { v4 as uuidv4 } from 'uuid';

// Define the validation schema for lead data
const LeadSchema = z.object({
    name: z.string().min(2, "El nombre es demasiado corto").max(100, "El nombre no puede exceder los 100 caracteres"),
    email: z.string().email("Email inválido").max(100, "El email no puede exceder los 100 caracteres"),
    phone: z.string().min(7, "El teléfono es demasiado corto").max(20, "El teléfono no puede exceder los 20 caracteres"),
    company: z.string().min(2, "La empresa es obligatoria").max(100, "La empresa no puede exceder los 100 caracteres"),
    website: z.string().max(200, "El sitio web es demasiado largo").optional().or(z.literal('')),
    role: z.string().min(1, "El rol es obligatorio").max(100, "El rol no puede exceder los 100 caracteres"),
    objectives: z.array(z.string()).min(1, "Selecciona al menos un objetivo"),
    stage: z.string().min(1, "La etapa es obligatoria"),
    timeline: z.string().min(1, "El cronograma es obligatorio"),
    investment_level: z.string().min(1, "El nivel de inversión es obligatorio"),
    impact: z.string().min(1, "Por favor, danos más detalles sobre el impacto").max(3000, "El impacto no puede exceder los 3000 caracteres"),
    project_desc: z.string().optional().or(z.literal('')).transform(val => val || "").pipe(z.string().max(3000, "La descripción no puede exceder los 3000 caracteres")),
    decision_maker: z.string().min(1, "Campo obligatorio"),
    file_url: z.string().optional().or(z.literal('')),
    turnstile_token: z.string().min(1, "Verificación de seguridad requerida")
});

async function verifyTurnstile(token: string, ip: string): Promise<{ success: boolean; errorCodes?: string[]; error?: string }> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    // In development without secret key, we might allow dummy tokens if configured
    if (!secretKey && (token === 'dummy' || token.startsWith('1x'))) {
        return { success: true };
    }

    if (!secretKey) {
        console.error('TURNSTILE_SECRET_KEY is missing');
        return { success: false, error: 'TURNSTILE_SECRET_KEY is missing' };
    }

    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    formData.append('remoteip', ip);

    try {
        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        const outcome = await result.json();
        return {
            success: outcome.success,
            errorCodes: outcome['error-codes']
        };
    } catch (error: any) {
        console.error('Turnstile verification error:', error);
        return { success: false, error: error.message };
    }
}


// Helper to sanitize incoming strings (basic HTML tag removal)
function sanitize(text: string): string {
    if (!text) return text;
    return text
        .replace(/<[^>]*>?/gm, '') // Remove HTML tags
        .replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m] || m));
}

export async function POST(request: Request) {
    try {
        const json = await request.json();
        const body = deobfuscateData(json.payload);

        if (!body) {
            console.error('[Security] Missing or invalid obfuscated payload');
            return NextResponse.json(
                { success: false, error: 'Formato de datos inválido' },
                { status: 400 }
            );
        }

        const ip = request.headers.get('x-forwarded-for') || 'unknown';

        // 1. Rate Limiting ...
        const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip.includes('127.0.0.1');
        const limiter = isLocalhost ? { success: true } : rateLimit(ip, 5, 60 * 60 * 1000);

        if (!limiter.success) {
            console.warn(`[Security] Rate limit exceeded for IP: ${ip}`);
            return NextResponse.json(
                { success: false, error: 'Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde.' },
                { status: 429 }
            );
        }

        // 2. Validate data schema (Zod)
        const validation = LeadSchema.safeParse(body);
        if (!validation.success) {
            console.error('[Security] Validation Error Details:', JSON.stringify(validation.error.format(), null, 2));
            const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0] || 'Datos de formulario inválidos';
            return NextResponse.json(
                { success: false, error: firstError, details: validation.error.format() },
                { status: 400 }
            );
        }

        const data = validation.data;

        // 3. Verify Cloudflare Turnstile ...
        const turnstileResult = await verifyTurnstile(data.turnstile_token, ip);
        if (!turnstileResult.success) {
            console.warn('[Security] Turnstile verification failed', turnstileResult.errorCodes);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Fallo en la verificación de seguridad'
                },
                { status: 403 }
            );
        }

        // 4. Sanitize data before storing (Prevent Stored XSS)
        const sanitizedData = {
            name: sanitize(data.name),
            email: data.email,
            phone: sanitize(data.phone),
            company: sanitize(data.company),
            website: data.website || "",
            role: sanitize(data.role),
            objectives: data.objectives.map(o => sanitize(o)),
            stage: sanitize(data.stage),
            timeline: sanitize(data.timeline),
            investment_level: sanitize(data.investment_level),
            impact: sanitize(data.impact),
            decision_maker: sanitize(data.decision_maker),
            file_url: data.file_url || ""
        };

        // 5. Prepare lead document
        const leadId = body.lead_id || uuidv4();
        const timestamp = new Date().toISOString();

        // Build the lead document following the existing structure
        const leadDoc = {
            lead_id: leadId,
            data: sanitizedData,
            audit_logs: {
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
                ip: ip,
                user_agent: request.headers.get('user-agent') || '',
                geo_location: body.audit_logs?.geo_location || {}
            },
            kpis: body.kpis || {
                session_duration: 0,
                clicks_count: 0
            },
            status_flow: {
                current: 'NEW',
                history: [{ status: 'NEW', timestamp, notes: 'Initial secure capture' }]
            },
            priority: body.priority || 'MEDIUM',
            source_attribution: body.source_attribution || {
                landing_page: 'SECURE_CAPTURE',
                utm_source: body.utm_source || null,
                utm_medium: body.utm_medium || null,
                utm_campaign: body.utm_campaign || null
            }
        };

        // 6. Save to Firestore using Admin SDK
        // IMPORTANT: Admin SDK ignores Firestore rules, so this always works if credentials are correct.
        await adminDb.collection('leads').doc(leadId).set(leadDoc, { merge: true });

        return NextResponse.json({ success: true, leadId });

    } catch (error: any) {
        console.error('Lead capture error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error interno del servidor'
            },
            { status: 500 }
        );
    }
}
