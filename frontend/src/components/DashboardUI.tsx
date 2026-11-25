import { useState, useCallback, type FormEvent } from 'react';
import ApplicationList, { type ApplicationData } from './ApplicationList';
import EmailReviewTab from './EmailReviewTab';
import { useDashboardApplications } from '../hooks/useDashboardApplications';
import { useEmailImports } from '../hooks/useEmailImports';
import { ApiError } from '../services/apiClient';
import {
  APPLICATION_STATUSES,
  type EmailImportApprovePayload,
} from '../types/emailImport';

type ActiveTab = 'dashboard' | 'email-review';

function DashboardUI() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    applications,
    isLoading: isLoadingApps,
    error: appsError,
    refreshApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    syncApprovedApplication,
  } = useDashboardApplications();

  const {
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
  } = useEmailImports();

  // Form input states
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('Applied');
  const [salaryHourly, setSalaryHourly] = useState('');
  const [dateApplied, setDateApplied] = useState('');

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setFormError(null);
    setCompany('');
    setRole('');
    setLocation('');
    setStatus('Applied');
    setSalaryHourly('');
    setDateApplied('');
  }

  function handleStartEdit(app: ApplicationData) {
    setEditingId(app.id);
    setShowForm(true);
    setFormError(null);
    setCompany(app.company);
    setRole(app.role);
    setLocation(app.location);
    setStatus(app.status);
    setSalaryHourly(app.salaryHourly);
    setDateApplied(app.dateApplied);
  }

  async function handleSaveApplication(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    const payload = {
      company,
      role,
      location,
      status,
      salaryHourly,
      dateApplied,
    };

    try {
      if (editingId) {
        await updateApplication(editingId, payload);
      } else {
        await createApplication(payload);
      }
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Failed to save application.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteApplication(id: string) {
    try {
      await deleteApplication(id);
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Failed to delete application.',
      );
    }
  }

  const handleApproveAndSync = useCallback(
    async (id: string, payload?: EmailImportApprovePayload) => {
      const result = await approveImport(id, payload);
      if (result.ok) {
        syncApprovedApplication(result.application);
      }
      return result;
    },
    [approveImport, syncApprovedApplication],
  );

  const filteredApplications = applications.filter((app) => {
    const query = search.toLowerCase();
    const matchesSearch =
      app.company.toLowerCase().includes(query) ||
      app.role.toLowerCase().includes(query) ||
      app.location.toLowerCase().includes(query) ||
      app.status.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dashboard-wrapper">
      {/* Top Navbar (Bootstrap Dashboard style) */}
      <header className="navbar navbar-dark sticky-top bg-dark flex-md-nowrap p-0 shadow">
        <a className="navbar-brand col-md-3 col-lg-2 me-0 px-3" href="/dashboard">
          Internship Tracker
        </a>
        <input
          className="form-control form-control-dark w-100 rounded-0 border-0"
          type="text"
          placeholder="Search"
          aria-label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="navbar-nav">
          <div className="nav-item text-nowrap">
            <a
              className="nav-link px-3"
              href="/login"
              onClick={() => sessionStorage.removeItem('authToken')}
            >
              Sign out
            </a>
          </div>
        </div>
      </header>

      {/* Sidebar + Main Content */}
      <div className="container-fluid">
        <div className="row">
          {/* Left Sidebar */}
          <nav className="col-md-3 col-lg-2 d-md-block bg-light sidebar min-vh-100 pt-3 px-0">
            <div className="position-sticky">
              <ul className="nav flex-column">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                  >
                    <i className="bi bi-house-door"></i>
                    Dashboard
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 'email-review' ? 'active' : ''}`}
                    onClick={() => setActiveTab('email-review')}
                  >
                    <i className="bi bi-envelope-check"></i>
                    Email Review
                    {totalPending > 0 && (
                      <span className="badge rounded-pill bg-primary ms-auto">
                        {totalPending}
                      </span>
                    )}
                  </button>
                </li>
              </ul>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 pt-3 pb-4">
            {activeTab === 'dashboard' ? (
              <>
                <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom">
                  <h1 className="h2 mb-0">Dashboard</h1>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => void refreshApplications()}
                      disabled={isLoadingApps}
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      Refresh
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        if (showForm) {
                          resetForm();
                        } else {
                          setShowForm(true);
                        }
                      }}
                    >
                      <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'} me-1`}></i>
                      {showForm ? 'Close' : 'Add Application'}
                    </button>
                  </div>
                </div>

                {formError && (
                  <div className="alert alert-danger alert-dismissible fade show py-2 small" role="alert">
                    {formError}
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={() => setFormError(null)}
                    ></button>
                  </div>
                )}

                {/* Collapsible Add / Edit Application Form */}
                {showForm && (
                  <div className="card mb-4 p-3 bg-white shadow-sm border-0">
                    <h2 className="h5 mb-3">
                      {editingId ? 'Edit Application' : 'Add New Application'}
                    </h2>
                    <form onSubmit={(e) => void handleSaveApplication(e)}>
                      <div className="row g-2 mb-3">
                        <div className="col-md-4">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Company (e.g. AMD)"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Role (e.g. Software Intern)"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Location (e.g. Orlando, FL)"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                          />
                        </div>
                        <div className="col-md-4">
                          <select
                            className="form-select"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                          >
                            {APPLICATION_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="form-control"
                            placeholder="Hourly Pay ($)"
                            value={salaryHourly}
                            onChange={(e) => setSalaryHourly(e.target.value)}
                          />
                        </div>
                        <div className="col-md-4">
                          <input
                            type="date"
                            className="form-control"
                            value={dateApplied}
                            onChange={(e) => setDateApplied(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm"
                          disabled={isSaving}
                        >
                          {isSaving
                            ? 'Saving...'
                            : editingId
                              ? 'Save Changes'
                              : 'Add Application'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={resetForm}
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Applications Table Card */}
                <div className="card p-3 bg-white shadow-sm border-0">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <h2 id="applications" className="h5 mb-0">
                      Applications
                    </h2>
                    <select
                      className="form-select form-select-sm w-auto"
                      aria-label="Filter by status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isLoadingApps ? (
                    <div className="text-center text-secondary py-4">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span className="visually-hidden">Loading applications...</span>
                      </div>
                      Loading your applications...
                    </div>
                  ) : appsError ? (
                    <div className="alert alert-warning d-flex justify-content-between align-items-center mb-0">
                      <span>{appsError}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-dark"
                        onClick={() => void refreshApplications()}
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <ApplicationList
                      applications={filteredApplications}
                      onEdit={handleStartEdit}
                      onDelete={(id) => void handleDeleteApplication(id)}
                    />
                  )}
                </div>
              </>
            ) : (
              <EmailReviewTab
                applications={matchedApplications}
                searchQuery={search}
                forwardingAddress={forwardingAddress}
                isLoadingAddress={isLoadingAddress}
                addressError={addressError}
                onRetryAddress={() => void refreshForwardingAddress()}
                imports={imports}
                isLoadingImports={isLoadingImports}
                importsError={importsError}
                approvedCount={approvedCount}
                dismissedCount={dismissedCount}
                onRefreshImports={() => void refreshImports()}
                onFetchDetails={fetchImportDetails}
                onSaveEdit={editImport}
                onApprove={handleApproveAndSync}
                onDismiss={dismissImport}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default DashboardUI;
