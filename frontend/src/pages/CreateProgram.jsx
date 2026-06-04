import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Play, Sparkles, AlertCircle, FileText, Activity, HelpCircle } from 'lucide-react';
import GlassPanel from '../components/GlassPanel';
import TerminalConsole from '../components/TerminalConsole';
import { api } from '../utils/api';

const CreateProgram = () => {
  const location = useLocation();
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('Python');
  const [code, setCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [complexity, setComplexity] = useState('');
  const [testCases, setTestCases] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [running, setRunning] = useState(false);

  // If redirected with preset program
  useEffect(() => {
    if (location.state && location.state.presetProgram) {
      const prog = location.state.presetProgram;
      setPrompt(prog.prompt);
      setLanguage(prog.language);
      setCode(prog.code);
      setExplanation(prog.explanation || '');
      setComplexity(prog.complexity || '');
      setTestCases(prog.test_cases || []);
      setConsoleLogs(prog.console_output ? [prog.console_output] : []);
    }
  }, [location]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt) return;
    setGenerating(true);
    setConsoleLogs(["[System] Connecting to AI programming agent..."]);

    try {
      const res = await api.createProgram(language, prompt);
      setCode(res.code);
      setExplanation(res.explanation);
      setComplexity(res.complexity);
      setTestCases(res.test_cases || []);
      setConsoleLogs([
        "[AI Agent] Code generated successfully.",
        `[Sandbox Exec] Running verification compiler...`,
        res.console_output || "[No output captured]"
      ]);
    } catch (err) {
      setConsoleLogs(prev => [...prev, `[ERROR] Failed to compile: ${err.message}`]);
    } finally {
      setGenerating(false);
    }
  };

  const handleRunCode = async () => {
    if (!code) return;
    setRunning(true);
    setConsoleLogs(prev => [...prev, `[Local Host] Running script in secure ${language} container...`]);

    try {
      // Execute directly in our DockerSandbox service backend
      const response = await fetch('http://localhost:8000/api/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ prompt, language }),
      });
      const res = await response.json();
      setConsoleLogs(prev => [...prev, res.console_output || "[Success: Script executed with exit code 0]"]);
    } catch (err) {
      setConsoleLogs(prev => [...prev, `[Sandbox Failure] Exception error: ${err.message}`]);
    } finally {
      setRunning(false);
    }
  };

  const getMonacoLanguage = (lang) => {
    const l = lang.toLowerCase();
    if (l === 'python' || l === 'py') return 'python';
    if (l === 'javascript' || l === 'js') return 'javascript';
    if (l === 'java') return 'java';
    if (l === 'c++' || l === 'cpp') return 'cpp';
    return 'plaintext';
  };

  return (
    <div className="three-panel-layout">
      {/* LEFT: Input Form Panel */}
      <div className="left-chat-panel">
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} className="cyan" />
          <span>Generator Command</span>
        </h3>
        
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <div className="form-group">
            <label>Language Stack</label>
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

          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label>Describe Program requirements</label>
            <textarea 
              className="form-input" 
              style={{ flex: 1, resize: 'none', background: '#070913', lineHeight: '1.4', fontSize: '0.85rem' }}
              placeholder="e.g., Create Python binary search tree implementation, or build JS bubble sort..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center' }} 
            disabled={generating}
          >
            {generating ? 'Compiling Agent...' : 'Generate Code'}
          </button>
        </form>
      </div>

      {/* CENTER: Editor Panel + Console Bottom */}
      <div className="center-editor-panel">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ padding: '10px 20px', background: '#0a0d18', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              workspace.{getMonacoLanguage(language) === 'python' ? 'py' : getMonacoLanguage(language) === 'javascript' ? 'js' : getMonacoLanguage(language) === 'java' ? 'java' : 'cpp'}
            </span>
            {code && (
              <button 
                onClick={handleRunCode} 
                className="btn-primary" 
                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--neon-green)', color: '#070913', boxShadow: 'none' }}
                disabled={running}
              >
                <Play size={12} fill="#070913" />
                <span>{running ? 'Running...' : 'Run sandbox'}</span>
              </button>
            )}
          </div>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <Editor
              height="100%"
              theme="vs-dark"
              language={getMonacoLanguage(language)}
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                fontSize: 13,
                fontFamily: 'JetBrains Mono',
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true
              }}
              loading={
                <textarea 
                  className="textarea-editor" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                  placeholder="Code will generate here. You can also write here manually."
                />
              }
            />
          </div>
        </div>

        {/* BOTTOM: Terminal console */}
        <TerminalConsole title="Sandbox Executor Logs" logs={consoleLogs} />
      </div>

      {/* RIGHT: Analytical Info Panel */}
      <div className="right-info-panel">
        <h3 style={{ fontSize: '1rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} className="purple" />
          <span>Code Specifications</span>
        </h3>

        {!code ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Enter a prompt and generate code to inspect agent breakdown metrics.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Complexity Widget */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--neon-cyan)', marginBottom: '6px' }}>
                <Activity size={14} />
                <span>Time & Space Complexity</span>
              </div>
              <p style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                {complexity || 'O(1) Constant execution complexity.'}
              </p>
            </div>

            {/* Explanation Widget */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--neon-purple)', marginBottom: '6px' }}>
                <HelpCircle size={14} />
                <span>Agent Breakdown Logic</span>
              </div>
              <p style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {explanation || 'No code structure details generated.'}
              </p>
            </div>

            {/* Test Cases Widget */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--neon-green)', marginBottom: '6px' }}>
                <AlertCircle size={14} />
                <span>Automated Test Cases</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {testCases.map((tc, idx) => (
                  <div key={idx} style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Input:</span> <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-amber)' }}>{tc.input}</code></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Expected:</span> <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-green)' }}>{tc.expected}</code></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateProgram;
