/**
 * services/emailService.js
 * Sends email notifications to students for EVERY status change.
 * Uses SendGrid. Falls back silently if SENDGRID_API_KEY not set.
 */
require('dotenv').config();
const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const STATUS_CONFIG = {
  'Pending':            { color: '#f59e0b', badge: '🕐 Pending',             title: 'Grievance Received' },
  'In Progress':        { color: '#3b82f6', badge: '🔄 In Progress',         title: 'Grievance In Progress' },
  'Resolved':           { color: '#22c55e', badge: '✅ Resolved',             title: 'Grievance Resolved' },
  'Forwarded':          { color: '#8b5cf6', badge: '📤 Forwarded',           title: 'Grievance Forwarded' },
  'Forwarded to Admin': { color: '#ef4444', badge: '🔺 Forwarded to Admin',  title: 'Escalated to Admin' },
};

function buildStatusEmail(grievance, newStatus) {
  const { id, subject, deptName, remarks, student, date } = grievance;
  const cfg = STATUS_CONFIG[newStatus] || { color: '#6b7280', badge: newStatus, title: 'Status Updated' };

  const statusMessages = {
    'Pending':            'Your grievance has been received and is in our queue.',
    'In Progress':        'Your grievance is now being actively reviewed by the concerned department.',
    'Resolved':           'Your grievance has been reviewed and resolved by the administration.',
    'Forwarded':          'Your grievance has been forwarded to the relevant department for further action.',
    'Forwarded to Admin': 'Your grievance has been escalated to the admin for priority attention.',
  };

  const nextSteps = {
    'Pending':            'You will receive another update when the department starts working on it.',
    'In Progress':        'The department is working on it. You will be notified once resolved.',
    'Resolved':           'If your concern was not fully addressed, you may submit a follow-up grievance.',
    'Forwarded':          'The assigned department will review and respond shortly.',
    'Forwarded to Admin': 'Admin will review your case on priority. You will hear back soon.',
  };

  return {
    subject: `${cfg.badge} — Your Grievance ${id} Status Update — ResolveIt`,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{box-sizing:border-box}
body{margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif}
.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 30px rgba(0,0,0,.09)}
.hdr{background:linear-gradient(135deg,#1a3fcf 0%,#2563eb 100%);padding:28px 36px;text-align:center}
.hdr h1{margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px}
.hdr p{margin:4px 0 0;color:rgba(255,255,255,.75);font-size:13px}
.badge{display:inline-block;background:${cfg.color};color:#fff;padding:5px 16px;border-radius:20px;font-size:13px;font-weight:600;margin-top:14px}
.body{padding:32px 36px}
.body p{color:#374151;font-size:15px;line-height:1.75;margin:0 0 14px}
.info-box{background:#f8faff;border:1px solid #dbeafe;border-radius:10px;padding:18px 22px;margin:18px 0}
.row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:13.5px}
.row:last-child{border-bottom:none}
.lbl{color:#6b7280;font-weight:500}
.val{font-weight:600;color:#111827;text-align:right;max-width:60%}
.status-val{color:${cfg.color}}
.remark{background:#fffbeb;border-left:4px solid ${cfg.color};border-radius:4px;padding:12px 16px;margin:16px 0;font-size:14px;color:#374151}
.next{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;margin:18px 0;font-size:13.5px;color:#0369a1}
.footer{background:#f9fafb;padding:18px 36px;text-align:center;border-top:1px solid #e5e7eb}
.footer p{margin:0;color:#9ca3af;font-size:11.5px;line-height:1.6}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <h1>ResolveIt</h1>
    <p>College Grievance Portal</p>
    <span class="badge">${cfg.badge}</span>
  </div>
  <div class="body">
    <p>Dear <strong>${student}</strong>,</p>
    <p>${statusMessages[newStatus] || 'Your grievance status has been updated.'}</p>
    <div class="info-box">
      <div class="row"><span class="lbl">Grievance ID</span><span class="val">${id}</span></div>
      <div class="row"><span class="lbl">Subject</span><span class="val">${subject}</span></div>
      <div class="row"><span class="lbl">Department</span><span class="val">${deptName}</span></div>
      <div class="row"><span class="lbl">Submitted On</span><span class="val">${date}</span></div>
      <div class="row"><span class="lbl">Current Status</span><span class="val status-val">${cfg.badge}</span></div>
    </div>
    ${remarks ? `<div class="remark"><strong>Note from Admin/Resolver:</strong><br>${remarks}</div>` : ''}
    <div class="next">💡 <strong>What's next?</strong> ${nextSteps[newStatus] || 'You will be notified of further updates.'}</div>
    <p style="margin-top:20px">Thank you for using ResolveIt.</p>
  </div>
  <div class="footer">
    <p>This is an automated notification from <strong>ResolveIt — College Grievance Portal</strong>.<br>
    Please do not reply to this email. Log in to the portal for any queries.</p>
  </div>
</div>
</body></html>`
  };
}

async function sendStatusEmail(grievance, newStatus) {
  if (!grievance.studentEmail) {
    console.warn(`[Email] No studentEmail on ${grievance.id} — skipping`);
    return;
  }
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[Email] SENDGRID_API_KEY not set — skipping (${grievance.id} → ${newStatus})`);
    return;
  }
  const { subject, html } = buildStatusEmail(grievance, newStatus);
  try {
    await sgMail.send({
      to:   grievance.studentEmail,
      from: process.env.EMAIL_FROM || 'noreply@resolveit.app',
      subject, html,
    });
    console.log(`[Email] ✅ "${newStatus}" email sent to ${grievance.studentEmail} (${grievance.id})`);
  } catch (err) {
    console.error(`[Email] ❌ Failed for ${grievance.studentEmail}:`, err?.response?.body || err.message);
  }
}

// Keep old name as alias for backward compatibility
const sendResolvedEmail = (g) => sendStatusEmail(g, 'Resolved');

async function sendBulkStatusEmails(grievances, newStatus) {
  await Promise.all(grievances.map(g => sendStatusEmail(g, newStatus)));
}

// Keep old name as alias
const sendBulkResolvedEmails = (grievances) => sendBulkStatusEmails(grievances, 'Resolved');

module.exports = { sendStatusEmail, sendResolvedEmail, sendBulkStatusEmails, sendBulkResolvedEmails };
