import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Bug, Sparkles, AlertTriangle, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import GlassPanel from '../components/GlassPanel';
import DiffViewer from '../components/DiffViewer';
import TerminalConsole from '../components/TerminalConsole';
import { api } from '../utils/api';

const FixBug = () => {
  const [language, setLanguage] = useState('Python');
  const [buggyCode, setBuggyCode] = useState('');
  const [errorLogs, setErrorLogs] = useState('');
  
  // Results
  const [fixedCode, setFixedCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [whatWasWrong, setWhatWasWrong] = useState('');
  const [howFixed, setHowFixed] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [intervention, setIntervention] = useState(false);
  const [bugId, setBugId] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [manualCode, setManualCode] = useState('');

  const handleFix = async (e) => {
    e.preventDefault();
    if (!buggyCode) return;
    setLoading(true);
    setIntervention(false);
    setFixedCode('');
    setConsoleLogs(["[Fix Loop] Commencing bug diagnostics...", "[Sandbox] Running test suite..."]);

    try {
      const res = await api.fixBug(language, buggyCode, errorLogs);
      setBugId(res.id);
      setRetryCount(res.retry_count);
      
      if (res.human_intervention_required) {
        setIntervention(true);
        setManualCode(buggyCode); // Let user edit original code to fix it
        setConsoleLogs(prev => [
          ...prev,
          `[FAIL] Test suite failed on 3 consecutive auto-correction passes.`,
          `[INTERVENTION REQUIRED] Halting workflow. Developer assistance needed.`,
          res.error_logs || "[Syntax compilation fatal exception]"
        ]);
      } else {
        setFixedCode(res.fixed_code);
        setExplanation(res.explanation);
        setWhatWasWrong(res.what_was_wrong);
        setHowFixed(res.how_fixed);
        setConsoleLogs(prev => [
          ...prev,
          `[SUCCESS] Bug fix verified in ${res.retry_count} iterations.`,
          "[Sandbox] Clean test run. Exit code 0."
        ]);
      }
    } catch (err) {
      setConsoleLogs(prev => [...prev, `[ERROR] Failed: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!bugId || !manualCode) return;
    setLoading(true);
    setConsoleLogs(prev => [...prev, "[Developer] Submitting manual code refactoring patch..."]);
    
    try {
      const res = await api.submitBugIntervention(bugId, manualCode, 'success');
      setFixedCode(res.fixed_code);
      setExplanation(res.explanation);
      setWhatWasWrong(res.what_was_wrong);
      setHowFixed(res.how_fixed);
      setIntervention(false);
      setConsoleLogs(prev => [...prev, "[SUCCESS] Manual fix override successful.", "[Sandbox] Tests passed."]);
    } catch (err) {
      setConsoleLogs(prev => [...prev, `[ERROR] Refactoring failed: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleAbort = async () => {
    if (!bugId) return;
    try {
      await api.submitBugIntervention(bugId, null, 'aborted');
      setIntervention(false);
      setBuggyCode('');
      setConsoleLogs(prev => [...prev, "[ABORT] Developer aborted bug fix workflow."]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '24px', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      
      {/* LEFT: Bug Input Panel */}
      <GlassPanel style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-purple)' }}>
          <Bug size={20} />
          <span>Bug Diagnostics Center</span>
        </h3>

        <form onSubmit={handleFix} style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          <div className="form-group">
            <label>Programming Language</label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)} 
              className="form-input"
              style={{ background: '#070913', cursor: 'pointer' }}
            >
              <option>Python</option>
              <option>JavaScript</option>
              <option>Java</option>
              <option>C++</option>
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', height: '240px' }}>
            <label>Paste Buggy Code</label>
            <textarea 
              className="form-input" 
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', resize: 'none', background: '#070913' }}
              value={buggyCode}
              onChange={(e) => setBuggyCode(e.target.value)}
              placeholder="Paste your buggy source code block here..."
              required
            />
          </div>

          <div className="form-group">
            <label>Error Logs / Compilations Stack (Optional)</label>
            <textarea 
              className="form-input" 
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', height: '80px', resize: 'none', background: '#070913' }}
              value={errorLogs}
              onChange={(e) => setErrorLogs(e.target.value)}
              placeholder="e.g. TypeError: 'int' object is not iterable. Tip: Type 'fatal' to force human intervention loop!"
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Analyzing Code...' : 'Diagnose & Auto-Fix'}
          </button>
        </form>
      </GlassPanel>

      {/* RIGHT: Results / Diffs / Human-in-the-loop Workspace */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
        
        {/* Main Work Area */}
        <GlassPanel style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: '16px' }}>
          
          {/* Default state */}
          {!fixedCode && !intervention && (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <ShieldAlert size={48} opacity={0.2} />
              <span>Input buggy code and run diagnostics to compute differences.</span>
            </div>
          )}

          {/* HUMAN INTERVENTION REQUIRED PANEL */}
          {intervention && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--neon-rose)', borderRadius: '8px', padding: '16px', background: 'rgba(244,63,94,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-rose)', fontWeight: '600', fontSize: '0.95rem' }}>
                <AlertTriangle size={18} />
                <span>Human-In-The-Loop Intervention Required</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                The AI bug-fix cycle failed to resolve compilation errors after 3 loops. Please inspect the code below, edit it manually, and override the sandbox.
              </p>
              
              <div style={{ height: '220px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={language.toLowerCase() === 'python' ? 'python' : 'javascript'}
                  value={manualCode}
                  onChange={(val) => setManualCode(val || '')}
                  options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'on', automaticLayout: true }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end' }}>
                <button onClick={handleAbort} className="btn-secondary" style={{ color: 'var(--neon-rose)', borderColor: 'rgba(244,63,94,0.2)' }}>
                  Abort Fix
                </button>
                <button onClick={handleManualSubmit} className="btn-primary" style={{ background: 'var(--neon-green)', color: '#070913', boxShadow: 'none' }}>
                  Submit Manual Refactor
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS FIXED CODE DISPLAY */}
          {fixedCode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-green)', fontWeight: '600', fontSize: '0.95rem' }}>
                <CheckCircle size={18} />
                <span>Bug Resolved Successfully (Retries: {retryCount})</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neon-rose)', fontWeight: '600', marginBottom: '4px' }}>What was wrong?</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{whatWasWrong}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neon-green)', fontWeight: '600', marginBottom: '4px' }}>How it was fixed?</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{howFixed}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Git Diff comparisons:</div>
                <DiffViewer original={buggyCode} modified={fixedCode} />
              </div>
            </div>
          )}

        </GlassPanel>

        {/* BOTTOM: Sandbox run terminal */}
        <TerminalConsole title="Bug Sandbox Loop Logs" logs={consoleLogs} />

      </div>
    </div>
  );
};

export default FixBug;
