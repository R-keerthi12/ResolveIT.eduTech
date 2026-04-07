/**
 * services/aiService.js — Claude AI integration
 *
 * Features:
 *  1. Auto-suggest department from grievance subject/description
 *  2. Generate admin reply suggestion
 *  3. Detect if grievance is duplicate/similar
 *  4. Summarize a grievance in one line
 */
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

let client = null;
function getClient() {
  if (!client && process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const DEPARTMENTS = [
  { id: 'ACAD', name: 'Academic Department',       desc: 'Exams, results, curriculum, faculty' },
  { id: 'ADMN', name: 'Administration Department', desc: 'Fees, certificates, admissions, records' },
  { id: 'TECH', name: 'IT / Technical Department', desc: 'Internet, computers, software, lab' },
  { id: 'HOST', name: 'Hostel Department',         desc: 'Rooms, food, water, hostel facilities' },
  { id: 'TRAN', name: 'Transport Department',      desc: 'Bus routes, schedules, transport' },
  { id: 'LIBR', name: 'Library Department',        desc: 'Books, resources, library access' },
  { id: 'FINC', name: 'Finance Department',        desc: 'Scholarships, refunds, fee issues' },
  { id: 'SPRT', name: 'Sports Department',         desc: 'Sports facilities, equipment, events' },
];

async function suggestDepartment(subject, description) {
  const ai = getClient();
  if (!ai) return { error: 'AI not configured' };
  try {
    const deptList = DEPARTMENTS.map(d => `${d.id}: ${d.name} (${d.desc})`).join('\n');
    const msg = await ai.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Given this college grievance, which department should handle it?
Subject: ${subject}
Description: ${description}

Departments:
${deptList}

Reply with ONLY the department ID (e.g. ACAD). Nothing else.`
      }]
    });
    const deptId = msg.content[0].text.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const dept = DEPARTMENTS.find(d => d.id === deptId);
    return { data: { deptId, deptName: dept?.name || deptId } };
  } catch (err) {
    return { error: err.message };
  }
}

async function suggestReply(grievance) {
  const ai = getClient();
  if (!ai) return { error: 'AI not configured' };
  try {
    const msg = await ai.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are a college admin. Write a professional, empathetic reply to this student grievance.
Keep it 2-3 sentences. Be specific to their issue.

Grievance ID: ${grievance.id}
Subject: ${grievance.subject}
Department: ${grievance.deptName}
Description: ${grievance.desc}
Current Status: ${grievance.status}

Write ONLY the reply message, nothing else.`
      }]
    });
    return { data: { reply: msg.content[0].text.trim() } };
  } catch (err) {
    return { error: err.message };
  }
}

async function summarizeGrievance(grievance) {
  const ai = getClient();
  if (!ai) return { error: 'AI not configured' };
  try {
    const msg = await ai.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `Summarize this college grievance in ONE short sentence (max 15 words).
Subject: ${grievance.subject}
Description: ${grievance.desc}
Reply with ONLY the summary sentence.`
      }]
    });
    return { data: { summary: msg.content[0].text.trim() } };
  } catch (err) {
    return { error: err.message };
  }
}

async function checkSimilar(subject, description, existingGrievances) {
  const ai = getClient();
  if (!ai) return { error: 'AI not configured' };
  if (!existingGrievances || existingGrievances.length === 0) return { data: { similar: [] } };
  try {
    const recent = existingGrievances.slice(-20).map(g =>
      `ID:${g.id} | ${g.subject} — ${g.desc?.slice(0,80)}`
    ).join('\n');
    const msg = await ai.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `New grievance:
Subject: ${subject}
Description: ${description}

Existing grievances:
${recent}

List the IDs of any existing grievances that are similar or duplicates of the new one.
Reply with ONLY a JSON array of IDs, e.g. ["GRV1001","GRV1002"] or [] if none are similar.`
      }]
    });
    let ids = [];
    try { ids = JSON.parse(msg.content[0].text.trim()); } catch {}
    return { data: { similar: ids } };
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { suggestDepartment, suggestReply, summarizeGrievance, checkSimilar };
