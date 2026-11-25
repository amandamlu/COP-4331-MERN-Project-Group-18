import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiError } from '../services/apiClient';
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
  const [forwardingAddress, setForwardingAddress] = useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [imports, setImports] = useState<EmailImportRecord[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [isLoadingImports, setIsLoadingImports] = useState(true);
  const [importsError, setImportsError] = useState<string | null>(null);

  const [matchedApplications, setMatchedApplications] = useState<ApplicationLookup[]>(
    [],
  );

  const [approvedCount, setApprovedCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);

  const refreshForwardingAddress = useCallback(async () => {
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

  const fetchImportDetails = useCallback(async (id: string) => {
    const detailed = await apiFetch<EmailImportRecord>(`/api/email/imports/${id}`);
    setImports((prev) =>
      prev.map((item) => (item._id === id ? { ...item, ...detailed } : item)),
    );
    return detailed;
  }, []);

  const editImport = useCallback(
    async (id: string, payload: EmailImportEditPayload) => {
      const updated = await apiFetch<EmailImportRecord>(`/api/email/imports/${id}`, {
        method: 'PATCH',
        body: payload,
      });
      setImports((prev) =>
        prev.map((item) => (item._id === id ? { ...item, ...updated } : item)),
      );
      return updated;
    },
    [],
  );

  const approveImport = useCallback(
    async (
      id: string,
      payload: EmailImportApprovePayload = {},
    ): Promise<ApproveResult> => {
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
    [refreshApplicationLookup],
  );

  const dismissImport = useCallback(async (id: string) => {
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
