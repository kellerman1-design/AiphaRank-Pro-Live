
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

interface Props {
  onSuccess: (user: any) => void;
  onClose: () => void;
}

const GoogleAuthModal: React.FC<Props> = ({ onSuccess, onClose }) => {
  const [step, setStep] = useState<'loading' | 'chooser'>('loading');

  useEffect(() => {
    // Simulate network delay for "Connecting to Google"
    const timer = setTimeout(() => {
      setStep('chooser');
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleAccountClick = (user: any) => {
    // Simulate verify token delay
    setStep('loading');
    setTimeout(() => {
      onSuccess(user);
    }, 600);
  };

  const mockUsers = [
    {
      email: "user@example.com",
      name: "Demo User",
      initial: "D",
      color: "bg-purple-600"
    },
    {
      email: "trader@alpharank.pro",
      name: "Pro Trader",
      initial: "T",
      color: "bg-emerald-600"
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white text-gray-900 w-full max-w-[400px] rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {step === 'loading' ? (
          <div className="h-[200px] flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Connecting to Google...</p>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-center mb-4">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" className="h-6" />
              </div>
              <h3 className="text-xl font-medium text-center text-gray-800">Choose an account</h3>
              <p className="text-center text-gray-500 text-sm mt-1">to continue to AlphaRank Pro</p>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {mockUsers.map((u, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleAccountClick({ 
                    email: u.email, 
                    name: u.name, 
                    picture: null // Using initial fallback logic in App
                  })}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full ${u.color} text-white flex items-center justify-center font-bold text-lg`}>
                    {u.initial}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </div>
              ))}
              
              <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer text-gray-600">
                 <div className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                 </div>
                 <p className="font-medium">Use another account</p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 text-xs text-gray-500 text-center">
              To continue, Google will share your name, email address, and language preference with AlphaRank Pro.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleAuthModal;
