
import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { Shield, Truck, UserCircle, KeyRound, HardHat } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.WORKER);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    // Simple mock authentication for prototype
    if (role === UserRole.MANAGER && pin !== '6767') {
      setError('Invalid Access PIN.');
      return;
    }

    onLogin({ name, role });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden z-10">
        <div className="bg-blue-600 p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">FleetGuard</h1>
          <p className="text-blue-100 mt-1 text-sm">Repair & Damage Tracking System</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole(UserRole.WORKER)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    role === UserRole.WORKER
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <HardHat className="h-6 w-6" />
                  <span className="text-sm font-medium">Worker</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole(UserRole.MANAGER)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    role === UserRole.MANAGER
                      ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Shield className="h-6 w-6" />
                  <span className="text-sm font-medium">Manager</span>
                </button>
              </div>
            </div>

            {role === UserRole.MANAGER && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-slate-700 mb-1">Manager Access PIN</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="Enter PIN"
                    maxLength={4}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-fade-in">
                 <div className="h-1.5 w-1.5 rounded-full bg-red-600"></div>
                 {error}
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3 px-4 rounded-xl text-white font-medium shadow-lg transition-all transform active:scale-[0.98] ${
                role === UserRole.MANAGER ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Access System
            </button>
          </form>
        </div>
      </div>

      {/* Deployment Status Badge */}
      <div className="mt-8 opacity-70 hover:opacity-100 transition-opacity">
        <a href="https://app.netlify.com/projects/greenliterepairtracker/deploys" target="_blank" rel="noreferrer">
          <img src="https://api.netlify.com/api/v1/badges/ecbfddbd-5384-4d6d-8827-95ee91964841/deploy-status" alt="Netlify Status" />
        </a>
      </div>
    </div>
  );
};
