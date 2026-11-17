const FORWARD_PREFIX = /^(?:(?:fwd?|re):\s*)+/i;
const FORWARDED_MESSAGE = /^(?:-{2,}\s*Forwarded message\s*-{2,}|Begin forwarded message:)\s*$/im;
const ORIGINAL_MESSAGE = /^(?:-{2,}\s*Original Message\s*-{2,}|_{5,})\s*$/im;
const QUOTED_HISTORY = /^(?:[ \t]*On [^\n]+ wrote:|[ \t]*-{2,}[ \t]*(?:Original|Forwarded) Message[ \t]*-{2,})[ \t]*$/im;
const HEADER = /^(?:From|Sent|Date|To|Cc|Subject|Reply-To):[ \t]*[^\n]*/i;

const EVENTS = [
  {
    event: 'interview_invitation', status: 'Interviewing',
    subject: /^(?:interview (?:invitation|request)|(?:an )?invitation to interview|schedule (?:your|an) interview)(?=\s*(?:[:–—-]|$)|\s+(?:for|from|with|at)\b)/i,
    body: /\b(?:invite you (?:to|for) (?:an )?interview|would like to (?:schedule (?:an |your )?interview|interview you)|(?:please|can you) (?:schedule|book) (?:an |your )?interview)\b/i,
  },
  {
    event: 'rejection', status: 'Rejected',
    subject: /^(?:your )?(?:application (?:was |is )?(?:rejected|declined|unsuccessful|not selected)|application rejection)\b/i,
    body: /\b(?:decided to (?:move|proceed) forward with other candidates|(?:will not|won't|are unable to|have decided not to) (?:be )?(?:moving|move|proceeding|proceed) forward with (?:your (?:application|candidacy)|you)|(?:unable|not able) to offer you (?:the|a) (?:position|role|internship)|your application (?:was|has been) (?:rejected|unsuccessful|declined)|you (?:were|have) not (?:been )?selected for (?:the|this) (?:role|position|internship))\b/i,
  },
  {
    event: 'offer', status: 'Offer',
    subject: /^(?:(?:your|official|formal|conditional) )*(?:job offer|employment offer|internship offer|offer of employment|offer letter)(?=\s*(?:[:–—-]|$)|\s+(?:for|from|at)\b)/i,
    body: /\b(?:(?:pleased|delighted|excited|happy) to offer you (?:the|a|an)|we are offering you (?:the|a|an)) [^\n.!?]{1,120}\b(?:position|role|internship|employment)\b|\b(?:pleased|delighted|excited|happy) to extend (?:to you )?(?:an |a )?(?:job offer|internship offer|offer of employment)\b/i,
  },
];

const CONFIRMATION = {
  event: 'application_confirmation', status: 'Applied',
  subject: /^(?:(?:your )?(?:(?:job|internship) )?application (?:has been |was )?(?:received|submitted|confirmation)|we received your application|thank you for applying)\b/i,
  body: /\b(?:we (?:have )?received your application|your application (?:has been |was )?(?:received|submitted successfully)|(?:thanks|thank you) for applying)\b/i,
};

const JOB_CONTEXT = /\b(?:intern(?:ship|s)?|job|role|position|employment|hiring|candidate|recruit(?:er|ing|ment)|careers?)\b/i;
const JOB_TITLE = /\b(?:intern(?:ship)?|co-op|engineer(?:ing)?|developer|analyst|researcher|assistant|associate|technician|designer|scientist|consultant|specialist|manager|coordinator|programmer|trainee|fellow)\b/i;

const ROLE_INTROS = [
  /^(?:application (?:received|submitted)|interview (?:invitation|request)|(?:(?:internship|job|employment) )?offer)\s*[:–—-]\s*/i,
  /\b(?:applying for|application for|interview for|offer for|thank you for your interest in)\s+/i,
  /\b(?:(?:pleased|delighted|excited|happy) to offer you|we are offering you)\s+/i,
];
const APPLIED_TO = /\b(?:thanks|thank you) for applying to (?<company>.+?)(?: for (?:the |a |an )?(?<role>.+))?$/i;
const ROLE_AT_COMPANY = /^(?<role>.+?) (?:at|with) (?<company>.+)$/i;

function originalMessage(subject, body) {
  const text = typeof body === 'string' ? body.replace(/\r\n?/g, '\n') : '';
  const outerSubject = typeof subject === 'string' ? subject.trim() : '';
  const marker = FORWARDED_MESSAGE.exec(text) || (/^fwd?:/i.test(outerSubject) ? ORIGINAL_MESSAGE.exec(text) : null);
  const lines = (marker ? text.slice(marker.index + marker[0].length) : text)
    .split(QUOTED_HISTORY, 1)[0].trim().split('\n');
  let originalSubject = '';
  let firstBodyLine = 0;

  if (marker || /^From:/i.test(lines[0])) {
    while (firstBodyLine < lines.length) {
      const line = lines[firstBodyLine].trim();
      if (line && !HEADER.test(line)) break;
      if (/^Subject:/i.test(line)) originalSubject = line.slice(8).trim();
      firstBodyLine += 1;
    }
  }

  const messageSubject = originalSubject || outerSubject;
  return {
    subject: messageSubject.replace(FORWARD_PREFIX, ''),
    isReply: /^(?:fwd?:\s*)*re:/i.test(messageSubject),
    body: lines.slice(firstBodyLine).filter((line) => !/^\s*>/.test(line)).join('\n'),
  };
}

function addCandidate(candidates, value) {
  const clean = value?.trim().replace(/[.!?:;,]+$/, '').replace(/\s+/g, ' ');
  if (!clean || clean.length > 120 || !/\p{L}/u.test(clean) || /https?:|@/i.test(clean)) return;
  if (/^(?:(?:the|a|an|our|your|this|that) )?(?:company|team|organization|position|role|job|internship|opportunity|us|unknown|n\/a)$/i.test(clean)) return;
  if (!candidates.has(clean.toLowerCase())) candidates.set(clean.toLowerCase(), clean);
}

function extractDetails(subject, body) {
  const companies = new Map();
  const roles = new Map();

  for (const line of body.split('\n')) {
    const company = /^\s*(?:company|employer):\s*(.+)$/i.exec(line);
    const role = /^\s*(?:position|role|job title|internship role):\s*(.+)$/i.exec(line);
    addCandidate(companies, company?.[1]);
    addCandidate(roles, role?.[1].replace(/\s+(?:position|role)[.!?]?$/i, ''));
  }

  for (const fragment of [subject, ...body.split(/\n|[.!?](?=\s|$)/)]) {
    const phrase = fragment.trim();
    if (!phrase || phrase.length > 300) continue;

    const application = APPLIED_TO.exec(phrase)?.groups;
    const intro = ROLE_INTROS.map((pattern) => pattern.exec(phrase)).find(Boolean);
    const details = intro ? phrase.slice(intro.index + intro[0].length).replace(/^(?:the|a|an) /i, '') : '';
    const pair = ROLE_AT_COMPANY.exec(details)?.groups;
    if (application) {
      addCandidate(companies, application.company);
      addCandidate(roles, application.role?.replace(/\s+(?:position|role)$/i, ''));
    } else {
      const role = pair?.role || details;
      if (!JOB_TITLE.test(role)) continue;
      addCandidate(companies, pair?.company);
      addCandidate(roles, role.replace(/\s+(?:position|role)$/i, ''));
    }
  }

  return {
    company: companies.size === 1 ? companies.values().next().value : null,
    role: roles.size === 1 ? roles.values().next().value : null,
  };
}

function parseEmail({ subject, body } = {}) {
  const message = originalMessage(subject, body);
  const details = extractDetails(message.subject, message.body);
  // A reply can inherit the subject of an earlier interview or offer.
  const statusSubject = message.isReply ? '' : message.subject;
  const matches = EVENTS.filter((rule) => rule.subject.test(statusSubject) || rule.body.test(message.body));
  if (matches.length === 0 && JOB_CONTEXT.test(`${message.subject}\n${message.body}`) &&
      (CONFIRMATION.subject.test(statusSubject) || CONFIRMATION.body.test(message.body))) {
    matches.push(CONFIRMATION);
  }

  const [match] = matches.length === 1 ? matches : [];
  return {
    event: match?.event ?? null,
    status: match?.status ?? null,
    ...details,
    requiresReview: !match || !details.company || !details.role,
  };
}

module.exports = { parseEmail };
