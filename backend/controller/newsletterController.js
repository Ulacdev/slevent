import supabase from '../database/db.js';
import { sendSmtpEmail } from '../utils/smtpMailer.js';
import { getAdminSmtpConfig } from '../utils/notificationService.js';

export const subscribe = async (req, res) => {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    try {
        // 1. Check if email already exists
        const { data: existing, error: checkError } = await supabase
            .from('newsletter_subscribers')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (checkError) throw checkError;
        if (existing) {
            return res.status(400).json({ success: false, message: 'You are already subscribed!' });
        }

        // 2. Insert subscriber
        const { error: insertError } = await supabase
            .from('newsletter_subscribers')
            .insert({ email });

        if (insertError) throw insertError;

        // 3. Send "Thank You" Email
        const smtpConfig = await getAdminSmtpConfig();
        const subject = 'Welcome to StartupLab Newsletter!';
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #38BDF2;">Thank you for subscribing!</h2>
                <p>We're thrilled to have you in our community. You'll now be the first to know about:</p>
                <ul>
                    <li>✨ New event launches</li>
                    <li>📢 Important announcements</li>
                    <li>🚀 Exclusive startup insights</li>
                </ul>
                <p>Stay tuned for updates!</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888;">&copy; 2026 StartupLab Business Center. All rights reserved.</p>
            </div>
        `;

        await sendSmtpEmail({
            to: email,
            subject,
            html,
            config: smtpConfig
        });

        return res.status(200).json({ success: true, message: 'Subscribed successfully!' });
    } catch (error) {
        console.error('Newsletter subscribe error:', error.message);
        return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
};

// Utility function to notify all subscribers
export const notifySubscribers = async ({ subject, title, message, actionUrl }) => {
    try {
        const { data: subscribers, error } = await supabase
            .from('newsletter_subscribers')
            .select('email');

        if (error) {
            console.error('Failed to fetch subscribers for notification:', error.message);
            return;
        }

        if (!subscribers || subscribers.length === 0) return;

        const smtpConfig = await getAdminSmtpConfig();
        const htmlTemplate = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #f9fafb;">
                <div style="text-align: center; margin-bottom: 24px;">
                     <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin: 0;">${title}</h1>
                </div>
                <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <p style="color: #374151; line-height: 1.6; font-size: 16px;">${message}</p>
                    ${actionUrl ? `
                    <div style="margin-top: 24px; text-align: center;">
                        <a href="${actionUrl}" style="background-color: #38BDF2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Details</a>
                    </div>
                    ` : ''}
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
                <p style="font-size: 12px; color: #6b7280; text-align: center;"> You received this because you're subscribed to the StartupLab newsletter. </p>
            </div>
        `;

        // Send to each subscriber (using Promise.all for simple cases, consider queue for large numbers)
        const sendPromises = subscribers.map(sub => 
            sendSmtpEmail({
                to: sub.email,
                subject: subject || title,
                html: htmlTemplate,
                config: smtpConfig
            })
        );

        await Promise.allSettled(sendPromises);
        console.log(`📡 [Newsletter] Notifications sent to ${subscribers.length} subscribers.`);
    } catch (error) {
        console.error('notifySubscribers error:', error.message);
    }
};
