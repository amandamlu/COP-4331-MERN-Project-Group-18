import { useState, useMemo } from 'react';
import type { ApplicationData } from '../components/ApplicationList';

export type SwipeDirection = 'left' | 'right';

export interface CompanyCardData {
  company: string;
  initials: string;
  applications: ApplicationData[];
  latestStatus: string;
}

interface SwipeRecord {
  company: string;
  direction: SwipeDirection;
  previousStatuses: Record<string, string>;
}

const INITIAL_APPLICATIONS: ApplicationData[] = [
  {
    id: '1',
    company: 'Texas Instruments',
    role: 'Applications Engineering Intern',
    location: 'Dallas, TX',
    status: 'Offer',
    salaryHourly: '38',
    dateApplied: '2026-09-10',
  },
  {
    id: '2',
    company: 'AMD',
    role: 'CPU Post-Silicon Validation Co-op',
    location: 'Austin, TX',
    status: 'Interviewing',
    salaryHourly: '38',
    dateApplied: '2026-09-22',
  },
  {
    id: '3',
    company: 'AMD',
    role: 'SoC Verification Intern',
    location: 'Orlando, FL',
    status: 'Applied',
    salaryHourly: '36',
    dateApplied: '2026-09-28',
  },
  {
    id: '4',
    company: 'Lockheed Martin',
    role: 'Software Engineering Intern',
    location: 'Orlando, FL',
    status: 'Applied',
    salaryHourly: '31',
    dateApplied: '2026-10-05',
  },
  {
    id: '5',
    company: 'NVIDIA',
    role: 'Deep Learning Systems Intern',
    location: 'Santa Clara, CA',
    status: 'Applied',
    salaryHourly: '52',
    dateApplied: '2026-10-12',
  },
  {
    id: '6',
    company: 'NASA',
    role: 'Flight Software Intern',
    location: 'Kennedy Space Center, FL',
    status: 'Applied',
    salaryHourly: '29',
    dateApplied: '2026-10-18',
  },
];

function getCompanyInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function useApplications() {
  const [applications, setApplications] = useState<ApplicationData[]>(INITIAL_APPLICATIONS);
  const [swipeHistory, setSwipeHistory] = useState<SwipeRecord[]>([]);

  // Group applications by company name
  const allCompanyCards = useMemo<CompanyCardData[]>(() => {
    const map = new Map<string, ApplicationData[]>();
    for (const app of applications) {
      const key = app.company.trim();
      const existing = map.get(key) || [];
      existing.push(app);
      map.set(key, existing);
    }

    return Array.from(map.entries()).map(([company, apps]) => ({
      company,
      initials: getCompanyInitials(company),
      applications: apps,
      latestStatus: apps[0]?.status || 'Applied',
    }));
  }, [applications]);

  const swipedCompanies = useMemo(
    () => new Set(swipeHistory.map((r) => r.company)),
    [swipeHistory]
  );

  // Remaining un-swiped cards in the deck
  const deckCards = useMemo(
    () => allCompanyCards.filter((c) => !swipedCompanies.has(c.company)),
    [allCompanyCards, swipedCompanies]
  );

  const heardBackCount = useMemo(
    () => swipeHistory.filter((r) => r.direction === 'right').length,
    [swipeHistory]
  );

  const noResponseCount = useMemo(
    () => swipeHistory.filter((r) => r.direction === 'left').length,
    [swipeHistory]
  );

  function addApplication(newApp: Omit<ApplicationData, 'id'>) {
    const created: ApplicationData = {
      ...newApp,
      id: Date.now().toString(),
    };
    setApplications((prev) => [...prev, created]);
  }

  function updateApplication(id: string, updated: Omit<ApplicationData, 'id'>) {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...updated, id } : app))
    );
  }

  function deleteApplication(id: string) {
    setApplications((prev) => prev.filter((app) => app.id !== id));
  }

  function swipeCompany(company: string, direction: SwipeDirection) {
    const newStatus = direction === 'right' ? 'Heard Back' : "Haven't Heard Back";

    const previousStatuses: Record<string, string> = {};
    for (const app of applications) {
      if (app.company === company) {
        previousStatuses[app.id] = app.status;
      }
    }

    setSwipeHistory((prev) => [...prev, { company, direction, previousStatuses }]);
    setApplications((prev) =>
      prev.map((app) =>
        app.company === company ? { ...app, status: newStatus } : app
      )
    );
  }

  function undoLastSwipe() {
    if (swipeHistory.length === 0) return;
    const last = swipeHistory[swipeHistory.length - 1];

    setSwipeHistory((prev) => prev.slice(0, -1));
    setApplications((prev) =>
      prev.map((app) =>
        app.company === last.company && last.previousStatuses[app.id]
          ? { ...app, status: last.previousStatuses[app.id] }
          : app
      )
    );
  }

  function resetDeck() {
    if (swipeHistory.length === 0) return;
    // Restore original statuses in reverse order
    const restoredMap: Record<string, string> = {};
    for (let i = swipeHistory.length - 1; i >= 0; i--) {
      Object.assign(restoredMap, swipeHistory[i].previousStatuses);
    }

    setSwipeHistory([]);
    setApplications((prev) =>
      prev.map((app) =>
        restoredMap[app.id] ? { ...app, status: restoredMap[app.id] } : app
      )
    );
  }

  return {
    applications,
    deckCards,
    heardBackCount,
    noResponseCount,
    canUndo: swipeHistory.length > 0,
    addApplication,
    updateApplication,
    deleteApplication,
    onSwipeLeft: (company: string) => swipeCompany(company, 'left'),
    onSwipeRight: (company: string) => swipeCompany(company, 'right'),
    undoLastSwipe,
    resetDeck,
  };
}
