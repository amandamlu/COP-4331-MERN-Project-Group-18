import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiError } from '../services/apiClient';
import {
  createMockEmailImports,
  MOCK_FORWARDING_ADDRESS,
  MOCK_MATCHED_APPLICATIONS,
} from '../data/mockEmailImports';
import type {
  ApplicationLookup,
  ApplicationMatch,
  BackendApplication,
  EmailImportApprovePayload,
  EmailImportApproveResponse,
  EmailImportEditPayload,
  EmailImportListResponse,
  EmailImportRecord,
} from '../types/emailImport';

const USE_MOCK_EMAIL_IMPORTS =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_EMAIL_IMPORTS === 'true';

export interface ApproveResult {
  ok: boolean;
  importRecord?: EmailImportRecord;
  application?: BackendApplication | null;
  status?: number;
  error?: string;
  match?: ApplicationMatch;
}

interface ApplicationsLookupResponse {
  data: BackendApplication[];
}

function mapApplicationLookup(doc: BackendApplication): ApplicationLookup {
  return {
    id: doc._id,
    company: doc.Company || '',
    role: doc.Role || '',
    status: doc.Status || 'Applied',
    dateApplied: doc.DateApplied || '',
  };
}

export function useEmailImports() {
  const [forwardingAddress, setForwardingAddress] = useState<string | null>(() =>
    USE_MOCK_EMAIL_IMPORTS ? MOCK_FORWARDING_ADDRESS : null,
  );
  const [isLoadingAddress, setIsLoadingAddress] = useState(!USE_MOCK_EMAIL_IMPORTS);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [imports, setImports] = useState<EmailImportRecord[]>(() =>
    USE_MOCK_EMAIL_IMPORTS ? createMockEmailImports() : [],
  );
  const [totalPending, setTotalPending] = useState(() =>
    USE_MOCK_EMAIL_IMPORTS ? createMockEmailImports().length : 0,
  );
  const [isLoadingImports, setIsLoadingImports] = useState(!USE_MOCK_EMAIL_IMPORTS);
  const [importsError, setImportsError] = useState<string | null>(null);

  const [matchedApplications, setMatchedApplications] = useState<ApplicationLookup[]>(
    () => (USE_MOCK_EMAIL_IMPORTS ? MOCK_MATCHED_APPLICATIONS : []),
  );

  const [approvedCount, setApprovedCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);

  const refreshForwardingAddress = useCallback(async () => {
    if (USE_MOCK_EMAIL_IMPORTS) {
      setForwardingAddress(MOCK_FORWARDING_ADDRESS);
      setAddressError(null);
      setIsLoadingAddress(false);
      return;
    }

    setIsLoadingAddress(true);
    setAddressError(null);
    try {
      const result = await apiFetch<{ address: string }>(
        '/api/email/forwarding-address',
      );
      setForwardingAddress(result.address);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to retrieve your forwarding address.';
      setAddressError(message);
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  const refreshApplicationLookup = useCallback(async () => {
    if (USE_MOCK_EMAIL_IMPORTS) return;

    try {
      const result = await apiFetch<ApplicationsLookupResponse>(
        '/api/applications?limit=100',
      );
      setMatchedApplications((result.data || []).map(mapApplicationLookup));
    } catch {
      // Non-fatal: match UI falls back gracefully if applications list cannot be fetched
    }
  }, []);

  const refreshImports = useCallback(async () => {
    if (USE_MOCK_EMAIL_IMPORTS) {
      const fresh = createMockEmailImports();
      setImports(fresh);
      setTotalPending(fresh.length);
      setImportsError(null);
      setIsLoadingImports(false);
      return;
    }

    setIsLoadingImports(true);
    setImportsError(null);
    try {
      const result = await apiFetch<EmailImportListResponse>(
        '/api/email/imports?page=1&limit=50',
      );
      setImports(result.data || []);
      setTotalPending(result.total ?? result.data?.length ?? 0);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to load pending email imports.';
      setImportsError(message);
    } finally {
      setIsLoadingImports(false);
    }
  }, []);

  useEffect(() => {
    if (USE_MOCK_EMAIL_IMPORTS) return;

    let cancelled = false;

    async function initAddress() {
      try {
        const result = await apiFetch<{ address: string }>(
          '/api/email/forwarding-address',
        );
        if (cancelled) return;
        setForwardingAddress(result.address);
        setAddressError(null);
      } catch (err) {
        if (cancelled) return;
        setAddressError(
          err instanceof ApiError
            ? err.message
            : 'Unable to retrieve your forwarding address.',
        );
      } finally {
        if (!cancelled) setIsLoadingAddress(false);
      }
    }

    async function initImports() {
      try {
        const result = await apiFetch<EmailImportListResponse>(
          '/api/email/imports?page=1&limit=50',
        );
        if (cancelled) return;
        setImports(result.data || []);
        setTotalPending(result.total ?? result.data?.length ?? 0);
        setImportsError(null);
      } catch (err) {
        if (cancelled) return;
        setImportsError(
          err instanceof ApiError
            ? err.message
            : 'Unable to load pending email imports.',
        );
      } finally {
        if (!cancelled) setIsLoadingImports(false);
      }
    }

    async function initLookup() {
      try {
        const result = await apiFetch<ApplicationsLookupResponse>(
          '/api/applications?limit=100',
        );
        if (cancelled) return;
        setMatchedApplications((result.data || []).map(mapApplicationLookup));
      } catch {
        // Non-fatal
      }
    }

    void initAddress();
    void initImports();
    void initLookup();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchImportDetails = useCallback(
    async (id: string) => {
      if (USE_MOCK_EMAIL_IMPORTS) {
        const existing = imports.find((item) => item._id === id);
        if (!existing) {
          throw new ApiError(404, 'Email import not found.');
        }
        return existing;
      }

      const detailed = await apiFetch<EmailImportRecord>(`/api/email/imports/${id}`);
      setImports((prev) =>
        prev.map((item) => (item._id === id ? { ...item, ...detailed } : item)),
      );
      return detailed;
    },
    [imports],
  );

  const editImport = useCallback(
    async (id: string, payload: EmailImportEditPayload) => {
      if (USE_MOCK_EMAIL_IMPORTS) {
        const existing = imports.find((item) => item._id === id);
        if (!existing) {
          throw new ApiError(404, 'Email import not found.');
        }

        const nextParsed = {
          ...existing.Parsed,
          ...payload,
        };
        const missingRequired =
          !nextParsed.company?.trim() ||
          !nextParsed.role?.trim() ||
          !nextParsed.status;
        nextParsed.requiresReview = missingRequired;

        const nextMatch: ApplicationMatch = missingRequired
          ? {
              ...existing.Match,
              action: 'review',
              reason: 'uncertain_email_details',
              proposedStatus: nextParsed.status ?? null,
            }
          : existing.Match?.action === 'update' && existing.Match.applicationId
            ? {
                ...existing.Match,
                proposedStatus: nextParsed.status ?? null,
              }
            : {
                action: 'create',
                reason: 'no_match',
                proposedStatus: nextParsed.status ?? null,
              };

        const updated: EmailImportRecord = {
          ...existing,
          Parsed: nextParsed,
          Match: nextMatch,
          LastUpdated: new Date().toISOString(),
        };

        setImports((prev) =>
          prev.map((item) => (item._id === id ? updated : item)),
        );
        return updated;
      }

      const updated = await apiFetch<EmailImportRecord>(`/api/email/imports/${id}`, {
        method: 'PATCH',
        body: payload,
      });
      setImports((prev) =>
        prev.map((item) => (item._id === id ? { ...item, ...updated } : item)),
      );
      return updated;
    },
    [imports],
  );

  const approveImport = useCallback(
    async (
      id: string,
      payload: EmailImportApprovePayload = {},
    ): Promise<ApproveResult> => {
      if (USE_MOCK_EMAIL_IMPORTS) {
        const record = imports.find((item) => item._id === id);
        if (!record) {
          return { ok: false, status: 404, error: 'Email import not found.' };
        }

        const parsed = record.Parsed;
        if (!parsed?.company?.trim() || !parsed?.role?.trim() || !parsed?.status) {
          return {
            ok: false,
            status: 422,
            error: 'Confirm the company, role, and status before approval.',
            match: record.Match,
          };
        }

        const isCreate =
          ('action' in payload && payload.action === 'create') ||
          (!('applicationId' in payload) && record.Match?.action !== 'update');

        const targetAppId =
          'applicationId' in payload && payload.applicationId
            ? payload.applicationId
            : record.Match?.applicationId || `mock-app-${Date.now()}`;

        const mockApp: BackendApplication = {
          _id: targetAppId,
          Company: parsed.company,
          Role: parsed.role,
          Status: parsed.status,
          ReferenceNumber: parsed.referenceNumber ?? undefined,
          DateApplied: parsed.dateApplied ?? undefined,
        };

        const approvedRecord: EmailImportRecord = {
          ...record,
          Status: 'approved',
          ApplicationId: targetAppId,
          Match: {
            ...record.Match,
            action: isCreate ? 'create' : 'update',
            applicationId: targetAppId,
          },
        };

        setImports((prev) => prev.filter((item) => item._id !== id));
        setTotalPending((prev) => Math.max(0, prev - 1));
        setApprovedCount((prev) => prev + 1);
        setMatchedApplications((prev) => {
          const exists = prev.some((app) => app.id === targetAppId);
          const mapped = mapApplicationLookup(mockApp);
          return exists
            ? prev.map((app) => (app.id === targetAppId ? mapped : app))
            : [...prev, mapped];
        });

        return {
          ok: true,
          importRecord: approvedRecord,
          application: mockApp,
        };
      }

      try {
        const result = await apiFetch<EmailImportApproveResponse>(
          `/api/email/imports/${id}/approve`,
          {
            method: 'POST',
            body: payload,
          },
        );

        setImports((prev) => prev.filter((item) => item._id !== id));
        setTotalPending((prev) => Math.max(0, prev - 1));
        setApprovedCount((prev) => prev + 1);
        void refreshApplicationLookup();

        return {
          ok: true,
          importRecord: result.import,
          application: result.application,
        };
      } catch (err) {
        if (err instanceof ApiError) {
          const match = (err.data as { match?: ApplicationMatch } | null)?.match;
          if (match) {
            setImports((prev) =>
              prev.map((item) =>
                item._id === id ? { ...item, Match: match } : item,
              ),
            );
          }
          return {
            ok: false,
            status: err.status,
            error: err.message,
            match,
          };
        }
        return {
          ok: false,
          status: 500,
          error: 'Failed to approve email import.',
        };
      }
    },
    [imports, refreshApplicationLookup],
  );

  const dismissImport = useCallback(async (id: string) => {
    if (USE_MOCK_EMAIL_IMPORTS) {
      setImports((prev) => prev.filter((item) => item._id !== id));
      setTotalPending((prev) => Math.max(0, prev - 1));
      setDismissedCount((prev) => prev + 1);
      return;
    }

    await apiFetch<EmailImportRecord>(`/api/email/imports/${id}/dismiss`, {
      method: 'POST',
      body: {},
    });
    setImports((prev) => prev.filter((item) => item._id !== id));
    setTotalPending((prev) => Math.max(0, prev - 1));
    setDismissedCount((prev) => prev + 1);
  }, []);

  return {
    forwardingAddress,
    isLoadingAddress,
    addressError,
    refreshForwardingAddress,
    imports,
    totalPending,
    isLoadingImports,
    importsError,
    matchedApplications,
    approvedCount,
    dismissedCount,
    refreshImports,
    fetchImportDetails,
    editImport,
    approveImport,
    dismissImport,
  };
}
