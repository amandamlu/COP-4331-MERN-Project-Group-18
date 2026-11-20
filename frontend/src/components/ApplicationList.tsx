export interface ApplicationData {
  id: string;
  company: string;
  role: string;
  location: string;
  status: string;
  salaryHourly: string;
  dateApplied: string;
}

interface ApplicationListProps {
  applications: ApplicationData[];
  onEdit: (app: ApplicationData) => void;
  onDelete: (id: string) => void;
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Offer':
    case 'Heard Back':
      return 'bg-success';
    case 'Interviewing':
      return 'bg-primary';
    case 'Applied':
      return 'bg-info text-dark';
    case 'Rejected':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
}

function ApplicationList({ applications, onEdit, onDelete }: ApplicationListProps) {
  return (
    <div className="table-responsive">
      <table className="table table-striped table-sm align-middle">
        <thead>
          <tr>
            <th>Company</th>
            <th>Role</th>
            <th>Location</th>
            <th>Status</th>
            <th>Hourly ($)</th>
            <th>Date Applied</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {applications.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-secondary py-3">
                No applications found.
              </td>
            </tr>
          ) : (
            applications.map((app) => (
              <tr key={app.id}>
                <td className="fw-semibold">{app.company}</td>
                <td>{app.role}</td>
                <td>{app.location}</td>
                <td>
                  <span className={`badge ${getStatusBadgeClass(app.status)}`}>
                    {app.status}
                  </span>
                </td>
                <td>${app.salaryHourly}</td>
                <td>{app.dateApplied}</td>
                <td>
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => onEdit(app)}
                      aria-label={`Edit ${app.company}`}
                      title="Edit"
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onDelete(app.id)}
                      aria-label={`Delete ${app.company}`}
                      title="Delete"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ApplicationList;
