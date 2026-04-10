
import supabase from '../database/db.js';
import { sendSmtpEmail } from '../utils/smtpMailer.js'; // Import existing mailer
import { encryptString, decryptString, maskString } from '../utils/encryption.js';
import { logAudit } from '../utils/auditLogger.js';
import { notifyUserByPreference } from '../utils/notificationService.js';

/**
 * Save or Update SMTP settings for the current user (Organizer or Admin)
 */
export async function updateSmtpSettings(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const {
            emailProvider,
            mailDriver,
            smtpHost,
            smtpPort,
            smtpUsername,
            smtpPassword,
            mailEncryption,
            fromAddress,
            fromName
        } = req.body;

        // Map UI fields to database keys
        const settings = [
            { user_id: userId, key: 'email_provider', value: 'SMTP' },
            { user_id: userId, key: 'email_driver', value: 'smtp' },
            { user_id: userId, key: 'email_host', value: 'smtp.gmail.com' },
            { user_id: userId, key: 'email_port', value: '587' },
            { user_id: userId, key: 'email_username', value: smtpUsername },
            { user_id: userId, key: 'email_password', value: encryptString(smtpPassword || '') },
            { user_id: userId, key: 'email_encryption', value: 'TLS' },
            { user_id: userId, key: 'email_from_address', value: fromAddress },
            { user_id: userId, key: 'email_from_name', value: fromName },
        ].filter(s => s.value !== undefined);

        const { error } = await supabase
            .from('settings')
            .upsert(settings, { onConflict: 'user_id,key' });

        if (error) throw error;

        // --- NEW: Notify Admin if an Organizer updates SMTP ---
        try {
            const { data: userProfile } = await supabase
                .from('users')
                .select('role, email, name')
                .eq('userId', userId)
                .maybeSingle();

            if (userProfile && userProfile.role !== 'ADMIN') {
                const { data: adminUser } = await supabase
                    .from('users')
                    .select('userId')
                    .eq('role', 'ADMIN')
                    .limit(1)
                    .maybeSingle();

                if (adminUser?.userId) {
                    await notifyUserByPreference({
                        recipientUserId: adminUser.userId,
                        actorUserId: userId,
                        title: 'Organizer Updated SMTP 📧',
                        message: `${userProfile.name || userProfile.email || 'An organizer'} has updated their professional SMTP configuration.`,
                        metadata: { organizerUserId: userId, type: 'SMTP_UPDATE' }
                    });
                }
            }
        } catch (nErr) {
            console.error('Notification failed:', nErr);
        }

        await logAudit({
            actionType: 'SMTP_SETTINGS_UPDATED',
            details: { userId },
            req
        });

        return res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('[Settings] Update failed:', error.message);
        return res.status(500).json({ error: 'Failed to update settings' });
    }
}

/**
 * Get current SMTP settings for the user
 */
export async function getSmtpSettings(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const { data, error } = await supabase
            .from('settings')
            .select('key, value')
            .eq('user_id', userId);

        if (error) throw error;

        // Transform back to object for UI
        const result = {};
        data.forEach(item => {
            const fieldMap = {
                'email_provider': 'emailProvider',
                'email_driver': 'mailDriver',
                'email_host': 'smtpHost',
                'email_port': 'smtpPort',
                'email_username': 'smtpUsername',
                'email_password': 'smtpPassword',
                'email_encryption': 'mailEncryption',
                'email_from_address': 'fromAddress',
                'email_from_name': 'fromName'
            };
            if (fieldMap[item.key]) {
                let val = item.value;
                if (item.key === 'email_password') {
                    val = decryptString(val);
                }
                result[fieldMap[item.key]] = val;
            }
        });

        return res.json(result);
    } catch (error) {
        console.error('[Settings] Fetch failed:', error.message);
        return res.status(500).json({ error: 'Failed to fetch settings' });
    }
}

/**
 * Test SMTP settings without saving them (or using existing ones)
 */
export async function testSmtpSettings(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const {
            recipientEmail, // The email to send the test to
            // Settings can be passed in to test BEFORE saving
            emailProvider,
            mailDriver,
            smtpHost,
            smtpPort,
            smtpUsername,
            smtpPassword,
            mailEncryption,
            fromAddress,
            fromName
        } = req.body;

        if (!recipientEmail) return res.status(400).json({ error: 'Recipient email is required' });

        const testConfig = {
            emailProvider: emailProvider || 'SMTP',
            mailDriver: mailDriver || 'smtp',
            smtpHost,
            smtpPort: parseInt(smtpPort, 10) || 587,
            smtpUser: smtpUsername,
            smtpPass: smtpPassword,
            mailEncryption: mailEncryption || 'TLS',
            fromAddress: fromAddress || smtpUsername,
            fromName: fromName || 'SMTP Tester'
        };

        console.log(`📡 [Settings] Testing SMTP for user ${userId} to ${recipientEmail}`);

        const result = await sendSmtpEmail({
            to: recipientEmail,
            subject: 'StartupLab: SMTP Test Message',
            text: 'Success! Your SMTP configuration is working correctly.',
            html: '<h1>Success!</h1><p>Your professional SMTP configuration is working correctly.</p>',
            config: testConfig
        });

        if (result.ok) {
            return res.json({ message: 'Test email sent successfully!' });
        } else {
            return res.status(500).json({ error: result.error || 'SMTP test failed' });
        }
    } catch (error) {
        console.error('[Settings] Test failed:', error.message);
        return res.status(500).json({ error: 'System error during SMTP test' });
    }
}

/**
 * Update HitPay gateway settings (API key, salt, mode, etc)
 */
export async function updateHitPaySettings(req, res) {
    try {
        const userId = req.user?.id;
        // Verify they are authenticated
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const scope = req.query.scope || 'organizer';

        // Ensure only admin can save scope=admin
        if (scope === 'admin') {
            let { data: userRecord } = await supabase.from('users').select('role').eq('userId', userId).maybeSingle();

            // Fallback to userId column if id didn't return a record
            if (!userRecord) {
                const { data: altRecord } = await supabase.from('users').select('role').eq('userId', userId).maybeSingle();
                userRecord = altRecord;
            }

            const role = String(userRecord?.role || '').toUpperCase();
            console.log(`[HitPay] User ${userId} has role: ${role} trying to update admin scope.`);

            if (role !== 'ADMIN') {
                return res.status(403).json({
                    error: `Only admins can modify platform payment settings. (Current User: ${userId}, Role: ${role || 'NOT_FOUND'})`
                });
            }
        }

        const { enabled, mode, hitpayApiKey, hitpaySalt } = req.body;

        console.log('[HitPay Settings] Received payload:', {
            enabled,
            mode,
            hasApiKey: !!hitpayApiKey,
            hasSalt: !!hitpaySalt,
            apiKeyLength: hitpayApiKey?.length || 0,
            saltLength: hitpaySalt?.length || 0
        });

        // Base keys mapped to db
        const settings = [
            { user_id: userId, key: 'hitpay_enabled', value: enabled === true ? 'true' : 'false' },
            { user_id: userId, key: 'hitpay_mode', value: mode === 'sandbox' ? 'sandbox' : 'live' }
        ];

        // Handle API key: if empty string provided, save empty (clears it)
        if (typeof hitpayApiKey === 'string') {
            const val = hitpayApiKey.trim();
            const encrypted = val !== '' ? encryptString(val) : '';
            console.log('[HitPay Settings] API Key updated (is empty:', val === '', ')');
            settings.push({ user_id: userId, key: 'hitpay_api_key', value: encrypted });
        }

        // Handle salt: if empty string provided, save empty (clears it)
        if (typeof hitpaySalt === 'string') {
            const val = hitpaySalt.trim();
            const encrypted = val !== '' ? encryptString(val) : '';
            console.log('[HitPay Settings] Salt updated (is empty:', val === '', ')');
            settings.push({ user_id: userId, key: 'hitpay_salt', value: encrypted });
        }

        const { error } = await supabase
            .from('settings')
            .upsert(settings, { onConflict: 'user_id,key' });

        if (error) throw error;

        // Notification removed as per user request


        const { data: updatedData } = await supabase.from('settings').select('key, value').eq('user_id', userId).in('key', ['hitpay_api_key', 'hitpay_salt', 'hitpay_enabled', 'hitpay_mode', 'payout_is_managed']);

        const mapped = {};
        updatedData?.forEach(item => mapped[item.key] = item.value);

        const rawApiKey = mapped['hitpay_api_key'];
        const rawSalt = mapped['hitpay_salt'];
        const decryptedApiKey = decryptString(rawApiKey);
        const decryptedSalt = decryptString(rawSalt);

        await logAudit({
            actionType: 'HITPAY_SETTINGS_UPDATED',
            details: { userId },
            req
        });

        return res.json({
            backendReady: true,
            settings: {
                enabled: mapped['hitpay_enabled'] === 'true',
                mode: mapped['hitpay_mode'] || 'live',
                hitpayApiKey: decryptedApiKey,
                hitpaySalt: decryptedSalt,
                maskedHitpayApiKey: decryptedApiKey ? maskString(decryptedApiKey) : (rawApiKey ? '••••••••••••••••' : null),
                maskedHitpaySalt: decryptedSalt ? maskString(decryptedSalt) : (rawSalt ? '••••••••••••••••' : null),
                isConfigured: mapped['hitpay_enabled'] === 'true' || mapped['payout_is_managed'] === 'true',
                updatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[HitPay Settings] Update failed:', error.message);
        return res.status(500).json({ error: 'Failed to save HitPay settings.' });
    }
}

/**
 * Get HitPay settings for the current user
 */
export async function getHitPaySettings(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const scope = req.query.scope || 'organizer';

        // Admins modifying their keys vs Organizers reading theirs.
        // It always reads from the active user profile:
        const { data, error } = await supabase
            .from('settings')
            .select('key, value, updated_at')
            .eq('user_id', userId)
            .in('key', ['hitpay_api_key', 'hitpay_salt', 'hitpay_enabled', 'hitpay_mode', 'payout_is_managed']);

        if (error) throw error;

        const mapped = {};
        let latestUpdate = null;

        data.forEach(item => {
            mapped[item.key] = item.value;
            if (!latestUpdate || new Date(item.updated_at) > new Date(latestUpdate)) {
                latestUpdate = item.updated_at;
            }
        });

        // Mask results
        const rawApiKey = mapped['hitpay_api_key'];
        const rawSalt = mapped['hitpay_salt'];

        const decryptedApiKey = decryptString(rawApiKey);
        const decryptedSalt = decryptString(rawSalt);

        // Mask results - if decrypt fails, we still want to indicate it exists
        const result = {
            enabled: mapped['hitpay_enabled'] === 'true',
            mode: mapped['hitpay_mode'] || 'live',
            hitpayApiKey: decryptedApiKey,
            hitpaySalt: decryptedSalt,
            maskedHitpayApiKey: decryptedApiKey ? maskString(decryptedApiKey) : (rawApiKey ? '••••••••••••••••' : null),
            maskedHitpaySalt: decryptedSalt ? maskString(decryptedSalt) : (rawSalt ? '••••••••••••••••' : null),
            isConfigured: mapped['hitpay_enabled'] === 'true' || mapped['payout_is_managed'] === 'true',
            updatedAt: latestUpdate
        };

        return res.json(result);
    } catch (error) {
        console.error('[HitPay Settings] Fetch failed:', error.message);
        return res.status(500).json({ error: 'Failed to fetch HitPay settings.' });
    }
}

/**
 * Update Payout Settings (GCASH, MAYA, BANK)
 */
export async function updatePayoutSettings(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const { isManaged, method, accountName, accountNumber, bankName, gcash, maya, bank } = req.body;

        const settings = [
            { user_id: userId, key: 'payout_is_managed', value: isManaged === true ? 'true' : 'false' },
            { user_id: userId, key: 'payout_method', value: method || '' },
            { user_id: userId, key: 'payout_account_name', value: accountName || '' },
            { user_id: userId, key: 'payout_account_number', value: accountNumber || '' },
            { user_id: userId, key: 'payout_bank_name', value: bankName || '' },
            // Independent wallet data
            { user_id: userId, key: 'payout_gcash_data', value: gcash ? JSON.stringify(gcash) : '' },
            { user_id: userId, key: 'payout_maya_data', value: maya ? JSON.stringify(maya) : '' },
            { user_id: userId, key: 'payout_bank_data', value: bank ? JSON.stringify(bank) : '' }
        ];

        const { error } = await supabase
            .from('settings')
            .upsert(settings, { onConflict: 'user_id,key' });

        if (error) throw error;

        await logAudit({
            actionType: 'PAYOUT_SETTINGS_UPDATED',
            details: { userId, isManaged, method },
            req
        });

        return res.json({ message: 'Payout settings updated successfully' });
    } catch (error) {
        console.error('[Payout Settings] Update failed:', error.message);
        return res.status(500).json({ error: 'Failed to save payout settings.' });
    }
}

/**
 * Get Payout Settings
 */
export async function getPayoutSettings(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const { data, error } = await supabase
            .from('settings')
            .select('key, value')
            .eq('user_id', userId)
            .ilike('key', 'payout_%');

        if (error) throw error;

        const mapped = {};
        data.forEach(item => mapped[item.key] = item.value);

        const tryParse = (str) => {
            try { return str ? JSON.parse(str) : null; }
            catch (e) { return null; }
        };

        return res.json({
            isManaged: mapped['payout_is_managed'] === 'true',
            method: mapped['payout_method'] || null,
            accountName: mapped['payout_account_name'] || '',
            accountNumber: mapped['payout_account_number'] || '',
            bankName: mapped['payout_bank_name'] || '',
            gcash: tryParse(mapped['payout_gcash_data']),
            maya: tryParse(mapped['payout_maya_data']),
            bank: tryParse(mapped['payout_bank_data'])
        });
    } catch (error) {
        console.error('[Payout Settings] Fetch failed:', error.message);
        return res.status(500).json({ error: 'Failed to fetch payout settings.' });
    }
}
