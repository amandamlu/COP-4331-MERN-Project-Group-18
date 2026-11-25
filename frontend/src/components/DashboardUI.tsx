import { useEffect, useState, type FormEvent } from 'react';
import { API_BASE_URL } from '../config/api';
import ApplicationList, { type ApplicationData } from './ApplicationList';
import EmailReviewTab from './EmailReviewTab';
import { useEmailImports } from '../hooks/useEmailImports';

type ActiveTab = 'dashboard' | 'email-review';

interface DashboardStats {
  totalApplications: number;
  interviewing: number;
  offers: number;
}

function DashboardUI() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsVersion, setStatsVersion] = useState(0);

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
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchApplications() {
      try {
        const token = sessionStorage.getItem('authToken');

        if (!token) {
          setError('You must be logged in to view applications.');
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/applications?q=${encodeURIComponent(debouncedSearch)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load applications.');
        }

        const result = await response.json();

        const mappedApplications: ApplicationData[] = result.data.map(
          (app: {
            _id: string;
            Company: string;
            Role: string;
            Location?: string;
            Status: string;
            SalaryHourly?: number;
            DateApplied?: string;
          }) => ({
            id: app._id,
            company: app.Company,
            role: app.Role,
            location: app.Location ?? '',
            status: app.Status,
            salaryHourly: String(app.SalaryHourly ?? 0),
            dateApplied: app.DateApplied ?? '',
          })
        );

        setApplications(mappedApplications);

      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setError('Unable to load your applications.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchApplications();

    return () => controller.abort();
  }, [debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStats() {
      try {
        const token = sessionStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(
          `${API_BASE_URL}/api/applications/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to retrieve statistics.');
        }

        const data: DashboardStats = await response.json();
        setStats(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Dashboard statistics:', err);
        }
      }
    }

    fetchStats();

    return () => controller.abort();
  }, [statsVersion]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

function handleEditApplication(app: ApplicationData) {
  setEditingId(app.id);

  setCompany(app.company);
  setRole(app.role);
  setLocation(app.location);
  setStatus(app.status);
  setSalaryHourly(app.salaryHourly);
  setDateApplied(app.dateApplied);

  setError('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
  
async function handleAddApplication(e: FormEvent) {
  e.preventDefault();
  setError('');

  try {
    const token = sessionStorage.getItem('authToken');

    if (!token) {
      setError('You must be logged in to add applications.');
      return;
    }

    const response = await fetch(
      editingId
        ? `${API_BASE_URL}/api/applications/${editingId}`
        : `${API_BASE_URL}/api/applications`,
      {
        method: editingId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            Company: company.trim(),
            Role: role.trim(),
            Location: location.trim(),
            Status: status,
            ...(salaryHourly !== '' && {
              SalaryHourly: Number(salaryHourly),
            }),
            ...(dateApplied !== '' && {
              DateApplied: dateApplied,
            }),
          }),
        }
      );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to add application.');
    }

    const newApp: ApplicationData = {
      id: data._id,
      company: data.Company,
      role: data.Role,
      location: data.Location ?? '',
      status: data.Status,
      salaryHourly: String(data.SalaryHourly ?? 0),
      dateApplied: data.DateApplied ?? '',
    };

    
    if (editingId) {
      setApplications((prev) =>
        prev.map((app) => app.id === editingId ? newApp : app)
      );
    } else {
      setApplications((prev) => [newApp, ...prev]);
      setStatsVersion((prev) => prev + 1);
    }

    setEditingId(null);


    setCompany('');
    setRole('');
    setLocation('');
    setStatus('Applied');
    setSalaryHourly('');
    setDateApplied('');

  } catch (err) {
    setError(
      err instanceof Error ? err.message : 'Unable to add application.'
    );
  }
}

async function handleDeleteApplication(id: string) {
  const confirmed = window.confirm(
    'Are you sure you want to delete this application? Its associated contacts will also be deleted.'
  );

  if (!confirmed) return;

  setError('');

  try {
    const token = sessionStorage.getItem('authToken');

    if (!token) {
      setError('You must be logged in to delete applications.');
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/applications/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete application.');
    }

    setApplications((prev) =>
      prev.filter((app) => app.id !== id)
    );
    setStatsVersion((prev) => prev + 1);

  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Unable to delete application.'
    );
  }
}

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
          <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 pt-3">
            {activeTab === 'dashboard' ? (
              <>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom">
              <h1 className="h2">Dashboard</h1>
            </div>

            <div className="row g-3 mb-4">
              {[
                ['Total Applications', stats?.totalApplications],
                ['Interviewing', stats?.interviewing],
                ['Offers', stats?.offers],
              ].map(([label, value]) => (
                <div className="col-md-4" key={label}>
                  <div className="card shadow-sm p-3">
                    <h3 className="h6 text-secondary">{label}</h3>
                    <h2 className="mb-0">{value ?? '—'}</h2>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Application Form */}
            <div className="card mb-4 p-3 bg-white shadow-sm">
              <h2 className="h5 mb-3">{editingId ? 'Edit Application' : 'Add New Application'}</h2>
              <form onSubmit={handleAddApplication}>
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
                      <option value="Applied">Applied</option>
                      <option value="Interviewing">Interviewing</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <input
                      type="number"
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
              <button type="submit" className="btn btn-primary btn-sm">
                {editingId ? 'Save Changes' : 'Add Application'}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm ms-2"
                  onClick={() => {
                    setEditingId(null);
                    setCompany('');
                    setRole('');
                    setLocation('');
                    setStatus('Applied');
                    setSalaryHourly('');
                    setDateApplied('');
                  }}
                >
                  Cancel
                </button>
              )}
              </form>
            </div>

            {/* Applications Table Section */}
            <h2 id="applications" className="h4 mb-3">
              Applications
            </h2>
            {loading && <p>Loading applications...</p>}

            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}

            {!loading && !error && (
              <ApplicationList
                applications={applications}
                onDelete={handleDeleteApplication}
                onEdit={handleEditApplication}
              />
            )}
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
            onApprove={approveImport}
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