import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiError } from '../services/apiClient';
import type { ApplicationData } from '../components/ApplicationList';
import type { BackendApplication } from '../types/emailImport';

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
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshApplications = useCallback(async () => {
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
          return prev.map((app) => (app.id === doc._id ? mapped : app));
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
