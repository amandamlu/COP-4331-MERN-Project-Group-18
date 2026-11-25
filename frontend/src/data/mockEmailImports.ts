import type { ApplicationLookup, EmailImportRecord } from '../types/emailImport';

export const MOCK_FORWARDING_ADDRESS =
  'intern-demo1234567890abcdef@mail.example.com';

export const MOCK_MATCHED_APPLICATIONS: ApplicationLookup[] = [
  {
    id: 'mock-app-1',
    company: 'Texas Instruments',
    role: 'Applications Engineering Intern',
    status: 'Offer',
    dateApplied: '2026-09-10',
  },
  {
    id: 'mock-app-2',
    company: 'AMD',
    role: 'CPU Post-Silicon Validation Co-op',
    status: 'Applied',
    dateApplied: '2026-09-22',
  },
  {
    id: 'mock-app-3',
    company: 'Lockheed Martin',
    role: 'Software Engineering Intern',
    status: 'Applied',
    dateApplied: '2026-10-05',
  },
];

export function createMockEmailImports(): EmailImportRecord[] {
  return [
    {
      _id: 'mock-import-1',
      ResendEmailId: 'mock-resend-1',
      From: 'recruiting@nvidia.com',
      Subject: 'Thank you for applying to NVIDIA — Deep Learning Systems Intern',
      BodyText:
        'Hi there,\n\nThank you for applying to the Deep Learning Systems Intern position (Req #JR198422) at NVIDIA. Our university recruiting team is reviewing your application and will follow up soon.',
      Parsed: {
        event: 'application_received',
        status: 'Applied',
        company: 'NVIDIA',
        role: 'Deep Learning Systems Intern',
        referenceNumber: 'JR198422',
        dateApplied: '2026-11-20',
        requiresReview: false,
      },
      Match: {
        action: 'create',
        reason: 'no_match',
        proposedStatus: 'Applied',
      },
      Status: 'pending',
      CreatedAt: '2026-11-22T18:30:00.000Z',
    },
    {
      _id: 'mock-import-2',
      ResendEmailId: 'mock-resend-2',
      From: 'campus@amd.com',
      Subject: 'Interview Invitation: AMD CPU Post-Silicon Validation Co-op',
      BodyText:
        'Congratulations! We would like to invite you to a 45-minute technical interview for the CPU Post-Silicon Validation Co-op role at AMD next week. Please pick a slot on the calendar link.',
      Parsed: {
        event: 'interview_invitation',
        status: 'Interviewing',
        company: 'AMD',
        role: 'CPU Post-Silicon Validation Co-op',
        dateApplied: '2026-09-22',
        requiresReview: false,
      },
      Match: {
        action: 'update',
        reason: 'company_and_role',
        applicationId: 'mock-app-2',
        currentStatus: 'Applied',
        proposedStatus: 'Interviewing',
      },
      Status: 'pending',
      CreatedAt: '2026-11-22T15:15:00.000Z',
    },
    {
      _id: 'mock-import-3',
      ResendEmailId: 'mock-resend-3',
      From: 'careers@spacex.com',
      Subject: 'Update on your Summer 2027 Internship Application',
      BodyText:
        'Hello,\n\nWe have an update regarding your Starship Flight Software Intern application at SpaceX. Please review the details and confirm your availability for a recruiter screen.',
      Parsed: {
        event: 'status_update',
        status: 'Interviewing',
        company: 'SpaceX',
        role: 'Starship Flight Software Intern',
        dateApplied: '2026-11-21',
        requiresReview: true,
      },
      Match: {
        action: 'review',
        reason: 'uncertain_email_details',
        proposedStatus: 'Interviewing',
      },
      Status: 'pending',
      CreatedAt: '2026-11-21T20:00:00.000Z',
    },
    {
      _id: 'mock-import-4',
      ResendEmailId: 'mock-resend-4',
      From: 'university-offers@google.com',
      Subject: 'Google Summer 2027 Software Engineering Intern Offer',
      BodyText:
        'Congratulations! We are excited to extend an offer for the Software Engineering Intern, Summer 2027 position at Google. Please find your offer details attached.',
      Parsed: {
        event: 'offer_extended',
        status: 'Offer',
        company: 'Google',
        role: 'Software Engineering Intern',
        referenceNumber: 'GOOG-2027-SWE',
        dateApplied: '2026-10-14',
        requiresReview: false,
      },
      Match: {
        action: 'create',
        reason: 'no_match',
        proposedStatus: 'Offer',
      },
      Status: 'pending',
      CreatedAt: '2026-11-20T14:00:00.000Z',
    },
  ];
}
