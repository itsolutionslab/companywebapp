import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { ROLES_CONFIG } from '@/config/roles_config';

const roleHierarchy: Record<string, number> = {
    client: 0,
    staff: 1,
    employ: 1,
    admin: 2,
    owneradmin: 3
};

const getRoleLevel = (role: string) => {
    const config = ROLES_CONFIG[role.toUpperCase()] || ROLES_CONFIG[role.toLowerCase()];
    return config ? config.level : (roleHierarchy[role] || 0);
};

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (error) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const requesterUid = decodedToken.uid;
        
        // Fetch requester's role
        const requesterDoc = await adminDb.collection('users').doc(requesterUid).get();
        if (!requesterDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        const requesterData = requesterDoc.data();
        const requesterRole = requesterData?.role || 'client';
        const requesterLevel = getRoleLevel(requesterRole);

        // Check if requester has admin privileges (level 10 or owneradmin)
        if (requesterLevel < 10 && requesterRole !== 'owneradmin') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await req.json();
        const { action, uid, uids, newPassword, disabled } = body;

        const targetUids = uids || (uid ? [uid] : []);

        if (targetUids.length === 0) {
            return NextResponse.json({ error: 'No user specified' }, { status: 400 });
        }

        if (action === 'change_password') {
            if (!newPassword || newPassword.length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
            }

            for (const targetUid of targetUids) {
                // Prevent self password change here (should use standard auth flow)
                if (targetUid === requesterUid) {
                    return NextResponse.json({ error: 'Cannot change your own password via this endpoint' }, { status: 400 });
                }

                // Verify target user's role is not higher than requester's
                const targetDoc = await adminDb.collection('users').doc(targetUid).get();
                if (targetDoc.exists) {
                    const targetRole = targetDoc.data()?.role || 'client';
                    if (getRoleLevel(targetRole) >= requesterLevel && requesterRole !== 'owneradmin') {
                        return NextResponse.json({ error: 'Cannot modify a user with equal or higher privileges' }, { status: 403 });
                    }
                }

                await adminAuth.updateUser(targetUid, { password: newPassword });
            }
            return NextResponse.json({ success: true, message: 'Password updated successfully' });

        } else if (action === 'toggle_status') {
            if (typeof disabled !== 'boolean') {
                return NextResponse.json({ error: 'Disabled status must be a boolean' }, { status: 400 });
            }

            for (const targetUid of targetUids) {
                 if (targetUid === requesterUid) {
                    return NextResponse.json({ error: 'Cannot disable your own account' }, { status: 400 });
                }

                // Verify target user's role
                const targetDoc = await adminDb.collection('users').doc(targetUid).get();
                if (targetDoc.exists) {
                    const targetRole = targetDoc.data()?.role || 'client';
                    if (getRoleLevel(targetRole) >= requesterLevel && requesterRole !== 'owneradmin') {
                        return NextResponse.json({ error: 'Cannot modify a user with equal or higher privileges' }, { status: 403 });
                    }
                }

                // Update Auth
                await adminAuth.updateUser(targetUid, { disabled });
                
                // Update Firestore
                await adminDb.collection('users').doc(targetUid).update({ disabled });
            }
            return NextResponse.json({ success: true, message: `Users ${disabled ? 'disabled' : 'enabled'} successfully` });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error in user management API:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
