import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ success: false, error: 'Token is missing' }, { status: 400 });
        }

        const secretKey = process.env.TURNSTILE_SECRET_KEY;

        // For development/testing, if no secret key is provided and token is 'dummy', allow it
        if (!secretKey && (token === 'dummy' || token.startsWith('1x'))) {
            return NextResponse.json({ success: true, warning: 'Development mode: allow token without secret' });
        }

        if (!secretKey) {
            console.error('TURNSTILE_SECRET_KEY is missing in environment variables');
            return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
        }

        const formData = new FormData();
        formData.append('secret', secretKey);
        formData.append('response', token);

        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        const outcome = await result.json();

        if (outcome.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 403 });
        }
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
