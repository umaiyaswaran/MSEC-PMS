import { Outlet } from 'react-router-dom';
import msecLogo from '../assets/logo/mseclogo.png';
import campusImage from '../assets/images/campus.jpeg';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={campusImage}
          alt="Campus Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />

        <div className="relative z-10 flex flex-col justify-center items-center px-12 text-white w-full h-full">
          <div className="w-24 h-24 bg-white/15 backdrop-blur-md rounded-3xl flex items-center justify-center mb-6 shadow-2xl p-2 border border-white/20">
            <img
              src={msecLogo}
              alt="MSEC Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <h1 className="text-5xl font-extrabold mb-3 text-center leading-tight text-gray-900 tracking-wide">
            MSEC PMS
          </h1>

          <p className="text-lg text-white/90 text-center max-w-sm leading-relaxed mb-10 drop-shadow-md">
            Streamline your procurement workflow with efficient intent request management, approvals, and tracking.
          </p>

          <div className="grid grid-cols-3 gap-8 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-xs text-white/80 mt-1">Transparent</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold">Fast</div>
              <div className="text-xs text-white/80 mt-1">Approvals</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold">Secure</div>
              <div className="text-xs text-white/80 mt-1">Process</div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8" style={{ backgroundColor: '#FFFFF0' }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center shadow-lg mb-4 p-2">
              <img
                src={msecLogo}
                alt="MSEC Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-wide">MSEC PMS</h2>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
