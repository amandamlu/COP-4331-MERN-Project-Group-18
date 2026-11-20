import { useState, type FormEvent } from 'react';
import ApplicationList, { type ApplicationData } from './ApplicationList';
import CompanySwipeDeck from './CompanySwipeDeck';
import { useApplications } from '../hooks/useApplications';

type ActiveTab = 'dashboard' | 'swipe';

function DashboardUI() {
  const {
    applications,
    deckCards,
    heardBackCount,
    noResponseCount,
    canUndo,
    addApplication,
    updateApplication,
    deleteApplication,
    onSwipeLeft,
    onSwipeRight,
    undoLastSwipe,
    resetDeck,
  } = useApplications();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);

  // Form input states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('Applied');
  const [salaryHourly, setSalaryHourly] = useState('');
  const [dateApplied, setDateApplied] = useState('');

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
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
    setCompany(app.company);
    setRole(app.role);
    setLocation(app.location);
    setStatus(app.status);
    setSalaryHourly(app.salaryHourly);
    setDateApplied(app.dateApplied);
  }

  function handleSaveApplication(e: FormEvent) {
    e.preventDefault();
    const payload = {
      company,
      role,
      location,
      status,
      salaryHourly: salaryHourly || '0',
      dateApplied: dateApplied || '2026-11-16',
    };

    if (editingId) {
      updateApplication(editingId, payload);
    } else {
      addApplication(payload);
    }

    resetForm();
  }

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.company.toLowerCase().includes(search.toLowerCase()) ||
      app.role.toLowerCase().includes(search.toLowerCase()) ||
      app.status.toLowerCase().includes(search.toLowerCase());
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
                    className={`nav-link ${activeTab === 'swipe' ? 'active' : ''}`}
                    onClick={() => setActiveTab('swipe')}
                  >
                    <i className="bi bi-layers"></i>
                    Swipe Deck
                    {deckCards.length > 0 && (
                      <span className="badge rounded-pill bg-primary ms-auto">
                        {deckCards.length}
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

                {/* Collapsible Add / Edit Application Form */}
                {showForm && (
                  <div className="card mb-4 p-3 bg-white shadow-sm">
                    <h2 className="h5 mb-3">
                      {editingId ? 'Edit Application' : 'Add New Application'}
                    </h2>
                    <form onSubmit={handleSaveApplication}>
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
                          <option value="Heard Back">Heard Back</option>
                          <option value="Haven't Heard Back">Haven&apos;t Heard Back</option>
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
                      <div className="d-flex gap-2">
                        <button type="submit" className="btn btn-primary btn-sm">
                          {editingId ? 'Save Changes' : 'Add Application'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={resetForm}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Applications Table Card */}
                <div className="card p-3 bg-white shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-3">
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
                      <option value="Applied">Applied</option>
                      <option value="Interviewing">Interviewing</option>
                      <option value="Offer">Offer</option>
                      <option value="Heard Back">Heard Back</option>
                      <option value="Haven't Heard Back">Haven&apos;t Heard Back</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <ApplicationList
                    applications={filteredApplications}
                    onEdit={handleStartEdit}
                    onDelete={deleteApplication}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom">
                  <h1 className="h2">Company Swipe Deck</h1>
                </div>

                <CompanySwipeDeck
                  cards={deckCards}
                  heardBackCount={heardBackCount}
                  noResponseCount={noResponseCount}
                  canUndo={canUndo}
                  onSwipeLeft={onSwipeLeft}
                  onSwipeRight={onSwipeRight}
                  onUndo={undoLastSwipe}
                  onReset={resetDeck}
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default DashboardUI;
