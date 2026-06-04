import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

const TerminalConsole = ({ title = "Console Sandbox Output", logs = [] }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Clean log values
  const logArray = Array.isArray(logs) ? logs : (logs ? logs.split('\n') : []);

  return (
    <div className="console-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <Terminal size={14} className="cyan" />
        <span>{title}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {logArray.map((log, idx) => (
          <div key={idx} style={{ lineBreak: 'anywhere' }}>{log}</div>
        ))}
        {logArray.length === 0 && (
          <div style={{ opacity: 0.3 }}>$ _ (sandbox ready. waiting for execution trigger...)</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TerminalConsole;
