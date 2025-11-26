import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { UserCircle, KeyRound, HardHat, Shield, Lock } from 'lucide-react';
import { Logo } from './Logo';

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

    // Worker PIN Check
    if (role === UserRole.WORKER && pin !== '1738') {
        setError('Invalid Worker PIN.');
        return;
    }

    // Manager PIN Check
    if (role === UserRole.MANAGER && pin !== '6767') {
      setError('Invalid Manager PIN.');
      return;
    }

    onLogin({ name, role });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="bg-slate-950 p-8 text-center border-b border-slate-800 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-grid-slate-700"></div>
          
          <div className="bg-blue-600/10 p-4 rounded-2xl inline-block mb-4 border border-blue-500/20 backdrop-blur-sm relative z-10">
            <Logo className="h-10 w-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight relative z-10">Fleet Repair Tracker</h1>
          <p className="text-slate-400 mt-2 text-sm relative z-10">Secure Fleet Maintenance System</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                      setRole(UserRole.WORKER);
                      setPin(''); // Clear PIN on role switch
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    role === UserRole.WORKER
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <HardHat className="h-6 w-6" />
                  <span className="text-sm font-bold">Worker</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                      setRole(UserRole.MANAGER);
                      setPin(''); // Clear PIN on role switch
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    role === UserRole.MANAGER
                      ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Shield className="h-6 w-6" />
                  <span className="text-sm font-bold">Manager</span>
                </button>
              </div>
            </div>

            <div className="animate-fade-in">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    {role === UserRole.MANAGER ? 'Manager PIN' : 'Worker PIN'}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all font-mono ${
                        role === UserRole.MANAGER ? 'focus:ring-purple-500' : 'focus:ring-blue-500'
                    }`}
                    placeholder="Enter PIN"
                    maxLength={4}
                  />
                </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-fade-in">
                 <div className="h-1.5 w-1.5 rounded-full bg-red-600"></div>
                 {error}
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3 px-4 rounded-xl text-white font-bold shadow-lg transition-transform active:scale-[0.98] ${
                role === UserRole.MANAGER 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Log In
            </button>
          </form>
        </div>
        
        {/* Footer with Security Badge & Deploy Status */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col gap-2 items-center">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                <Lock className="h-3 w-3" />
                Secure Connection • 256-bit Encrypted
            </div>
            <a href="https://app.netlify.com/projects/greenliterepairtracker/deploys" target="_blank" rel="noreferrer" className="opacity-80 hover:opacity-100 transition-opacity">
                <img src="https://api.netlify.com/api/v1/badges/ecbfddbd-5384-4d6d-8827-95ee91964841/deploy-status" alt="Netlify Status" />
            </a>
        </div>
      </div>
    </div>
  );
};