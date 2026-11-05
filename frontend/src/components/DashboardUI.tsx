import { useState, type FormEvent } from 'react';
import ApplicationList, { type ApplicationData } from './ApplicationList';

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
    company: 'Lockheed Martin',
    role: 'Software Engineering Intern',
    location: 'Orlando, FL',
    status: 'Applied',
    salaryHourly: '31',
    dateApplied: '2026-10-05',
  },
];

function DashboardUI() {
  const [applications, setApplications] = useState<ApplicationData[]>(INITIAL_APPLICATIONS);
  const [search, setSearch] = useState('');

  // Form input states
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('Applied');
  const [salaryHourly, setSalaryHourly] = useState('');
  const [dateApplied, setDateApplied] = useState('');

  function handleAddApplication(e: FormEvent) {
    e.preventDefault();
    const newApp: ApplicationData = {
      id: Date.now().toString(),
      company,
      role,
      location,
      status,
      salaryHourly: salaryHourly || '0',
      dateApplied: dateApplied || '2026-11-05',
    };

    setApplications([...applications, newApp]);
    setCompany('');
    setRole('');
    setLocation('');
    setStatus('Applied');
    setSalaryHourly('');
    setDateApplied('');
  }

  function handleDeleteApplication(id: string) {
    setApplications(applications.filter((app) => app.id !== id));
  }

  const filteredApplications = applications.filter(
    (app) =>
      app.company.toLowerCase().includes(search.toLowerCase()) ||
      app.role.toLowerCase().includes(search.toLowerCase()) ||
      app.status.toLowerCase().includes(search.toLowerCase())
  );

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
            <a className="nav-link px-3" href="/">
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
                  <a className="nav-link active" href="/dashboard">
                    <i className="bi bi-house-door"></i>
                    Dashboard
                  </a>
                </li>
              </ul>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 pt-3">
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom">
              <h1 className="h2">Dashboard</h1>
            </div>

            {/* Add Application Form */}
            <div className="card mb-4 p-3 bg-white shadow-sm">
              <h2 className="h5 mb-3">Add New Application</h2>
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
                  Add Application
                </button>
              </form>
            </div>

            {/* Applications Table Section */}
            <h2 id="applications" className="h4 mb-3">
              Applications
            </h2>
            <ApplicationList
              applications={filteredApplications}
              onDelete={handleDeleteApplication}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

export default DashboardUI;
