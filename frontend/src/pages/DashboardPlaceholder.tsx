import { useNavigate } from 'react-router-dom';

const DashboardPlaceholder = () => {
  const navigate = useNavigate();

  function handleLogout() {
    sessionStorage.removeItem('authToken');

    navigate('/login', { replace: true });
  }

  return (
    <div className="container mt-5 text-center">
      <h1>Welcome to Internship Tracker!</h1>

      <p className="text-secondary">
        You have successfully logged in.
      </p>

      <p>This is a temporary Dashboard page.</p>

      <button
        className="btn btn-danger mt-3"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
};

export default DashboardPlaceholder;