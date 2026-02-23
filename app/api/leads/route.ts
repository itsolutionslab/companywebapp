import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '../../lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { rateLimit } from '../../lib/rate-limiter';

// Define the validation schema for lead data
const LeadSchema = z.object({
    name: z.string().min(2, "El nombre es demasiado corto").max(100),
    email: z.string().email("Email inválido").max(100),
    company: z.string().min(2, "La empresa es obligatoria").max(100),
    website: z.string().optional().or(z.literal('')),
    role: z.string().min(1, "El rol es obligatorio"),
    objectives: z.array(z.string()).min(1, "Selecciona al menos un objetivo"),
    stage: z.string().min(1, "La etapa es obligatoria"),
    timeline: z.string().min(1, "El cronograma es obligatorio"),
    investment_level: z.string().min(1, "El nivel de inversión es obligatorio"),
    impact: z.string().min(1, "Por favor, danos más detalles sobre el impacto").max(5000),
    decision_maker: z.string().min(1, "Campo obligatorio"),
    file_url: z.string().url().optional().or(z.literal('')),
    turnstile_token: z.string().min(1, "Verificación de seguridad requerida")
});

async function verifyTurnstile(token: string, ip: string) {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    // In development without secret key, we might allow dummy tokens if configured
    if (!secretKey && (token === 'dummy' || token.startsWith('1x'))) {
        return true;
    }

    if (!secretKey) {
        console.error('TURNSTILE_SECRET_KEY is missing');
        return false;
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
        return outcome.success;
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return false;
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
        const body = await request.json();
        const ip = request.headers.get('x-forwarded-for') || 'unknown';

        // 1. Rate Limiting (5 requests per hour per IP)
        // Bypass rate limit for localhost testing
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
            console.warn('[Security] Invalid lead data attempt:', validation.error.format());
            return NextResponse.json(
                { success: false, error: 'Datos de formulario inválidos', details: validation.error.format() },
                { status: 400 }
            );
        }

        const data = validation.data;

        // 3. Verify Cloudflare Turnstile
        const isHuman = await verifyTurnstile(data.turnstile_token, ip);
        if (!isHuman) {
            console.warn('[Security] Turnstile verification failed');
            return NextResponse.json(
                { success: false, error: 'Fallo en la verificación de seguridad' },
                { status: 403 }
            );
        }

        // 4. Sanitize data before storing (Prevent Stored XSS)
        const sanitizedData = {
            name: sanitize(data.name),
            email: data.email, // Email is already validated by Zod
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
        const leadId = body.lead_id || crypto.randomUUID();
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
                landing_page: 'SECURE_CAPTURE'
            }
        };

        // 6. Save to Firestore using Admin SDK
        await adminDb.collection('leads').doc(leadId).set(leadDoc, { merge: true });

        console.log(`[Success] Secure lead captured & sanitized: ${leadId}`);
        return NextResponse.json({ success: true, leadId });

    } catch (error) {
        console.error('Lead capture error:', error);
        return NextResponse.json(
            { success: false, error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
