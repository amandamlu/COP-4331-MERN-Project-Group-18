import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiError } from '../services/apiClient';
import type { ApplicationData } from '../components/ApplicationList';
import type { BackendApplication } from '../types/emailImport';

const USE_MOCK_APPLICATIONS =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_EMAIL_IMPORTS === 'true';

const INITIAL_MOCK_APPLICATIONS: ApplicationData[] = [
  {
    id: 'mock-app-1',
    company: 'Texas Instruments',
    role: 'Applications Engineering Intern',
    location: 'Dallas, TX',
    status: 'Offer',
    salaryHourly: '38',
    dateApplied: '2026-09-10',
  },
  {
    id: 'mock-app-2',
    company: 'AMD',
    role: 'CPU Post-Silicon Validation Co-op',
    location: 'Austin, TX',
    status: 'Applied',
    salaryHourly: '38',
    dateApplied: '2026-09-22',
  },
  {
    id: 'mock-app-3',
    company: 'Lockheed Martin',
    role: 'Software Engineering Intern',
    location: 'Orlando, FL',
    status: 'Applied',
    salaryHourly: '31',
    dateApplied: '2026-10-05',
  },
];

interface ApplicationsListResponse {
  data: BackendApplication[];
  total: number;
  page: number;
  limit: number;
}

export interface SaveApplicationInput {
  company: string;
  role: string;
  location: string;
  status: string;
  salaryHourly: string;
  dateApplied: string;
}

export function mapBackendToApplicationData(
  doc: BackendApplication,
): ApplicationData {
  return {
    id: doc._id,
    company: doc.Company || '',
    role: doc.Role || '',
    location: doc.Location || '',
    status: doc.Status || 'Applied',
    salaryHourly:
      doc.SalaryHourly !== undefined && doc.SalaryHourly !== null
        ? String(doc.SalaryHourly)
        : '',
    dateApplied: doc.DateApplied || '',
  };
}

function buildBackendPayload(input: SaveApplicationInput) {
  const payload: Record<string, unknown> = {
    Company: input.company.trim(),
    Role: input.role.trim(),
    Location: input.location.trim(),
    Status: input.status,
  };

  const trimmedSalary = input.salaryHourly.trim();
  if (trimmedSalary !== '') {
    const parsed = Number(trimmedSalary);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      payload.SalaryHourly = parsed;
    }
  }

  const trimmedDate = input.dateApplied.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    payload.DateApplied = trimmedDate;
  }

  return payload;
}

export function useDashboardApplications() {
  const [applications, setApplications] = useState<ApplicationData[]>(() =>
    USE_MOCK_APPLICATIONS ? INITIAL_MOCK_APPLICATIONS : [],
  );
  const [isLoading, setIsLoading] = useState(!USE_MOCK_APPLICATIONS);
  const [error, setError] = useState<string | null>(null);

  const refreshApplications = useCallback(async () => {
    if (USE_MOCK_APPLICATIONS) {
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ApplicationsListResponse>(
        '/api/applications?limit=100',
      );
      setApplications((res.data || []).map(mapBackendToApplicationData));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load your applications.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (USE_MOCK_APPLICATIONS) return;

    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const res = await apiFetch<ApplicationsListResponse>(
          '/api/applications?limit=100',
        );
        if (cancelled) return;
        setApplications((res.data || []).map(mapBackendToApplicationData));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Unable to load your applications.',
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const createApplication = useCallback(async (input: SaveApplicationInput) => {
    if (USE_MOCK_APPLICATIONS) {
      const created: ApplicationData = {
        id: `mock-app-${Date.now()}`,
        company: input.company.trim(),
        role: input.role.trim(),
        location: input.location.trim(),
        status: input.status,
        salaryHourly: input.salaryHourly.trim(),
        dateApplied:
          input.dateApplied.trim() || new Date().toISOString().slice(0, 10),
      };
      setApplications((prev) => [created, ...prev]);
      return created;
    }

    const doc = await apiFetch<BackendApplication>('/api/applications', {
      method: 'POST',
      body: buildBackendPayload(input),
    });
    const mapped = mapBackendToApplicationData(doc);
    setApplications((prev) => [mapped, ...prev]);
    return mapped;
  }, []);

  const updateApplication = useCallback(
    async (id: string, input: SaveApplicationInput) => {
      if (USE_MOCK_APPLICATIONS) {
        const updated: ApplicationData = {
          id,
          company: input.company.trim(),
          role: input.role.trim(),
          location: input.location.trim(),
          status: input.status,
          salaryHourly: input.salaryHourly.trim(),
          dateApplied: input.dateApplied.trim(),
        };
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? updated : app)),
        );
        return updated;
      }

      const doc = await apiFetch<BackendApplication>(`/api/applications/${id}`, {
        method: 'PATCH',
        body: buildBackendPayload(input),
      });
      const mapped = mapBackendToApplicationData(doc);
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? mapped : app)),
      );
      return mapped;
    },
    [],
  );

  const deleteApplication = useCallback(async (id: string) => {
    if (USE_MOCK_APPLICATIONS) {
      setApplications((prev) => prev.filter((app) => app.id !== id));
      return;
    }

    await apiFetch<{ message: string; id: string }>(`/api/applications/${id}`, {
      method: 'DELETE',
    });
    setApplications((prev) => prev.filter((app) => app.id !== id));
  }, []);

  const syncApprovedApplication = useCallback(
    (doc: BackendApplication | null | undefined) => {
      if (!doc) {
        void refreshApplications();
        return;
      }

      setApplications((prev) => {
        const existing = prev.find((app) => app.id === doc._id);
        const mapped = mapBackendToApplicationData(doc);
        if (existing) {
          // Preserve fields like location/salaryHourly in mock mode when email only updates status
          const merged: ApplicationData = {
            ...existing,
            ...mapped,
            location: mapped.location || existing.location,
            salaryHourly: mapped.salaryHourly || existing.salaryHourly,
            dateApplied: mapped.dateApplied || existing.dateApplied,
          };
          return prev.map((app) => (app.id === doc._id ? merged : app));
        }
        return [mapped, ...prev];
      });
    },
    [refreshApplications],
  );

  return {
    applications,
    isLoading,
    error,
    refreshApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    syncApprovedApplication,
  };
}
