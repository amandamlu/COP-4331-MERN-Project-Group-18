import { Link } from 'react-router-dom';
import PageTitle from '../components/PageTitle';

const LoginPage = () => {
  return (
    <div className="container app-container py-3">
      <PageTitle />
      <main className="text-center text-secondary">
        <p className="mb-3">The login form arrives in Step 9.</p>
        <Link to="/dashboard" className="btn btn-primary">
          Open Internship Dashboard Demo
        </Link>
      </main>
    </div>
  );
};

export default LoginPage;
