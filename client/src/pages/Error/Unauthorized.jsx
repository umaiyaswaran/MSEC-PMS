import { useNavigate } from 'react-router-dom';
import Button from '../../components/Buttons/Button';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-6xl font-extrabold text-red-600">403</h1>
        <h2 className="mt-4 text-3xl font-bold text-gray-900">Access Denied</h2>
        <p className="mt-2 text-lg text-gray-600">
          You don't have permission to view this page.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Contact your administrator if you believe this is an error.
        </p>
        <div className="mt-8">
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
