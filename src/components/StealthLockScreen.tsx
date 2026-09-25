import React, { useState, useRef, useEffect } from 'react';

interface StealthLockScreenProps {
  onUnlock: () => void;
}

export const StealthLockScreen: React.FC<StealthLockScreenProps> = ({ onUnlock }) => {
  const [value, setValue] = useState('');
  const [errorFlash, setErrorFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep focus locked onto the secret input box
    inputRef.current?.focus();
    const handleGlobalClick = () => {
      inputRef.current?.focus();
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (value.trim() === 'BuildWithKMKaif') {
        onUnlock();
      } else {
        setErrorFlash(true);
        setTimeout(() => {
          setErrorFlash(false);
          setValue('');
        }, 700);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070709] transition-opacity duration-500">
      {/* Visual mask: Strictly isolated, blank environment */}
      <div className="flex flex-col items-center">
        <input
          ref={inputRef}
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          className={`w-64 px-4 py-2.5 text-center text-sm font-mono tracking-widest text-neutral-300 bg-neutral-900/80 border rounded transition-all duration-300 outline-none ${
            errorFlash
              ? 'border-red-600 bg-red-950/20 text-red-400'
              : 'border-neutral-800 focus:border-cyan-500/70 hover:border-neutral-700'
          }`}
          placeholder=""
        />
        {/* Direct One-Click Unlock Button (No password needed) */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onUnlock}
            className="px-4 py-1.5 text-xs font-medium text-cyan-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-cyan-500/50 rounded-lg transition-colors cursor-pointer"
          >
            Unlock Dashboard
          </button>
        </div>

        {/* Subtle hint */}
        <div className="mt-4 text-[10px] text-neutral-600 select-none">
          Click button above or press Enter
        </div>
      </div>
    </div>
  );
};
