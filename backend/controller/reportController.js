import supabase from '../database/db.js';
import { sendSmtpEmail } from '../utils/smtpMailer.js';
import { getAdminSmtpConfig } from '../utils/notificationService.js';
import crypto from 'crypto';
import path from 'path';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'startuplab-business-ticketing';

const formatEmailMessage = (msg = '') => {
  return String(msg || '').replace(/\n/g, '<br/>');
};

export const uploadReportImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Image file is required' });
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed' });
    }

    const ext = path.extname(file.originalname || '') || '.png';
    const fileName = `${crypto.randomUUID()}${ext}`;
    const filePath = `report-attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) return res.status(500).json({ error: 'Failed to generate public URL' });

    return res.json({ publicUrl, path: filePath });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Image upload failed' });
  }
};

export const submitEventReport = async (req, res) => {
  try {
    const { eventId, reporterEmail, reason, description, imageUrl } = req.body;

    if (!eventId || !reporterEmail || !reason || !description) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // 1. Get Event Details
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('eventName, eventId, createdBy')
      .eq('eventId', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // 2. Find the Admin
    const { data: adminUser } = await supabase
      .from('users')
      .select('userId, email')
      .eq('role', 'ADMIN')
      .limit(1)
      .maybeSingle();

    if (!adminUser) {
      return res.status(503).json({ error: 'System administrator not found.' });
    }

    // 3. Create Report in Notifications table
    // We use notifications as a general incident/support log
    const { data: report, error: reportErr } = await supabase
      .from('notifications')
      .insert({
        recipient_user_id: adminUser.userId,
        type: 'EVENT_REPORT',
        title: `Event Report: ${reason}`,
        message: description,
        metadata: {
          status: 'open',
          eventId: event.eventId,
          eventName: event.eventName,
          reporterEmail,
          reason,
          imageUrl,
          reportedAt: new Date().toISOString()
        },
        is_read: false
      })
      .select('*')
      .single();

    if (reportErr) {
      console.error('[Report] DB Insert Error:', reportErr);
      return res.status(500).json({ error: 'Failed to submit report in system.' });
    }

    const adminSmtp = await getAdminSmtpConfig();

    // 4. Send Email to Admin
    try {
      if (adminSmtp) {
        const adminHtmlBody = `
          <div style="font-family: 'Inter', sans-serif; background-color: #F8FAFC; padding: 60px 20px; color: #0F172A;">
            <div style="max-width: 520px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 40px;">
                <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg" height="80" alt="StartupLab Logo">
              </div>
              
              <div style="background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; padding: 50px; box-shadow: 0 40px 80px rgba(46, 46, 47, 0.05);">
                <div style="margin-bottom: 30px;">
                  <span style="display: inline-block; padding: 8px 14px; background-color: #EF4444; color: #FFFFFF; font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 10px;">EVENT REPORTED</span>
                </div>
                
                <h1 style="font-size: 32px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.1; margin: 0 0 24px 0;">${reason}</h1>
                
                <div style="margin-bottom: 32px; padding: 20px; background-color: #F8FAFC; border-radius: 8px; border-left: 4px solid #EF4444; font-size: 14px;">
                  <p style="margin: 0;"><strong>Event:</strong> ${event.eventName}</p>
                  <p style="margin: 8px 0 0;"><strong>Reporter:</strong> ${reporterEmail}</p>
                </div>

                <div style="font-size: 16px; line-height: 1.6; color: #475569;">
                  ${formatEmailMessage(description)}
                </div>

                ${imageUrl ? `<div style="margin-top: 32px;"><img src="${imageUrl}" style="max-width: 100%; border-radius: 12px; border: 1px solid #E2E8F0;" alt="Report Attachment"/></div>` : ''}
              </div>

              <div style="text-align: center; margin-top: 50px;">
                <p style="font-size: 11px; color: #94A3B8; line-height: 1.6;">
                  This is an automated security alert from the StartupLab Platform.
                </p>
              </div>
            </div>
          </div>
        `;

        await sendSmtpEmail({
          to: adminUser.email,
          subject: `[Event Report] ${event.eventName} - ${reason}`,
          text: description,
          html: adminHtmlBody,
          replyTo: reporterEmail,
          from: `System Security <${adminSmtp.fromAddress}>`,
          config: adminSmtp,
        });
      }
    } catch (emailErr) {
      console.error('[Report] Admin email failed:', emailErr);
    }

    // 5. Send Confirmation Email to Reporter
    try {
      if (adminSmtp) {
        const reporterHtml = `
          <div style="font-family: 'Inter', sans-serif; background-color: #F8FAFC; padding: 60px 20px; color: #0F172A;">
            <div style="max-width: 520px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 40px;">
                <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg" height="80" alt="StartupLab Logo">
              </div>
              
              <div style="background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; padding: 50px; box-shadow: 0 40px 80px rgba(46, 46, 47, 0.05);">
                <div style="margin-bottom: 30px;">
                  <span style="display: inline-block; padding: 8px 14px; background-color: #38BDF2; color: #FFFFFF; font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 10px;">REPORT RECEIVED</span>
                </div>
                
                <h2 style="font-size: 24px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.2; margin: 0 0 24px 0;">Hello,</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
                  We have received your report regarding the event <strong>"${event.eventName}"</strong>. Our trust and safety team will investigate this matter based on our Community Guidelines.
                </p>

                <div style="background-color: #F8FAFC; padding: 24px; border-radius: 12px; border: 1px solid #E2E8F0; font-size: 14px; color: #475569; font-style: italic;">
                  Reason: ${reason}<br/>
                  "${formatEmailMessage(description)}"
                  ${imageUrl ? `<div style="margin-top: 20px;"><img src="${imageUrl}" style="max-width: 100%; border-radius: 8px;" alt="Your Attachment"/></div>` : ''}
                </div>

                <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-top: 32px;">
                  Thank you for helping us keep our community safe.
                </p>

                <div style="margin-top: 40px; text-align: center;">
                    <p style="font-size: 14px; font-weight: 700; color: #0F172A;">— StartupLab Trust & Safety Team</p>
                </div>
              </div>

              <div style="text-align: center; margin-top: 50px;">
                <p style="font-size: 11px; color: #94A3B8; line-height: 1.6;">
                  &copy; 2026 StartupLab Business Ticketing. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `;

        await sendSmtpEmail({
          to: reporterEmail,
          subject: 'We received your event report',
          text: `We received your report regarding "${event.eventName}". Our team is investigating.\n— StartupLab Trust & Safety Team`,
          html: reporterHtml,
          from: `StartupLab Trust & Safety <${adminSmtp.fromAddress}>`,
          config: adminSmtp,
        });
      }
    } catch (userEmailErr) {
      console.error('[Report] Reporter email failed:', userEmailErr);
    }

    return res.status(200).json({ message: 'Report submitted successfully.', report });
  } catch (err) {
    console.error('[Report] Submit Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
