import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { FileCode, Play, Sparkles, Send, Activity, Settings, RefreshCw, Terminal, Eye } from 'lucide-react';
import GlassPanel from '../components/GlassPanel';
import TerminalConsole from '../components/TerminalConsole';
import { api } from '../utils/api';

const WorkOnProject = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState({});
  const [selectedFile, setSelectedFile] = useState('');
  const [fileContent, setFileContent] = useState('');
  
  // Right panel tabs
  const [activeTab, setActiveTab] = useState('rag'); // 'rag' or 'monitor'
  
  // RAG Chat
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [querying, setQuerying] = useState(false);
  
  // Monitoring Telemetry
  const [metrics, setMetrics] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);
  
  const [redeploying, setRedeploying] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const telemetryInterval = useRef(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const proj = await api.getProject(projectId);
        setProject(proj);
        const projectFiles = proj.files || {};
        setFiles(projectFiles);
        
        // Select first file by default
        const fileNames = Object.keys(projectFiles);
        if (fileNames.length > 0) {
          setSelectedFile(fileNames[0]);
          setFileContent(projectFiles[fileNames[0]]);
        }
        
        setConsoleLogs([`[System] Loaded project workspace: ${proj.name}`, `[RAG Index] Loaded code vectors.`]);
      } catch (err) {
        setConsoleLogs([`[ERROR] Failed to load project: ${err.message}`]);
      }
    };
    
    fetchProjectData();
    fetchMonitoring();
    
    // Set up monitoring telemetry poll
    telemetryInterval.current = setInterval(fetchMonitoring, 3000);
    
    return () => {
      if (telemetryInterval.current) clearInterval(telemetryInterval.current);
    };
  }, [projectId]);

  const fetchMonitoring = async () => {
    try {
      const res = await api.getProjectMonitoring(projectId);
      setMetrics(res.metrics);
      setLiveLogs(res.logs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = (name) => {
    setSelectedFile(name);
    setFileContent(files[name] || '');
  };

  const handleSaveFile = () => {
    if (!selectedFile) return;
    const updatedFiles = { ...files, [selectedFile]: fileContent };
    setFiles(updatedFiles);
    
    // Save locally
    if (project) {
      project.files = updatedFiles;
      setProject({ ...project, files: updatedFiles });
    }
    setConsoleLogs(prev => [...prev, `[System] Saved changes to file: ${selectedFile}`]);
  };

  const handleRedeploy = async () => {
    setRedeploying(true);
    setConsoleLogs(prev => [...prev, "[Pipeline] Redeploying project workspace with updated code files..."]);
    
    try {
      // Save all updated files to backend DB first
      const saveResponse = await fetch(`http://localhost:8000/api/projects/${projectId}/intervention?action=override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const res = await api.redeployProject(projectId);
      setProject(res);
      setConsoleLogs(prev => [
        ...prev, 
        `[SUCCESS] Redeployment completed!`,
        `[Live Preview] Sandbox hosted at: ${res.live_url}`
      ]);
      fetchMonitoring();
    } catch (err) {
      setConsoleLogs(prev => [...prev, `[ERROR] Redeployment failed: ${err.message}`]);
    } finally {
      setRedeploying(false);
    }
  };

  const handleRAGQuery = async (e, customQuery = '') => {
    if (e) e.preventDefault();
    const q = customQuery || query;
    if (!q) return;

    setQuerying(true);
    setQuery('');
    
    // Add user message
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    
    try {
      const res = await api.queryProjectRAG(projectId, q);
      setChatHistory(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: res.answer, 
          sources: res.context_files || [] 
        }
      ]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: `Failed to search codebase: ${err.message}` }]);
    } finally {
      setQuerying(false);
    }
  };

  const getEditorLanguage = (filename) => {
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.js') || filename.endsWith('.json')) return 'javascript';
    if (filename.endsWith('.html')) return 'html';
    return 'plaintext';
  };

  return (
    <div className="three-panel-layout">
      {/* LEFT: File Explorer Navigation */}
      <div className="left-chat-panel" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px', letterSpacing: '0.05em' }}>
          File Explorer
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
          {Object.keys(files).map((name) => (
            <button
              key={name}
              onClick={() => handleFileSelect(name)}
              className="btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '8px 12px',
                border: 'none',
                background: selectedFile === name ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                color: selectedFile === name ? 'var(--neon-cyan)' : 'var(--text-secondary)'
              }}
            >
              <FileCode size={14} />
              <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{name}</span>
            </button>
          ))}
          {Object.keys(files).length === 0 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>
              No files found in workspace.
            </div>
          )}
        </div>

        {project && project.live_url && (
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a 
              href={project.live_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-secondary"
              style={{ textDecoration: 'none', justifyContent: 'center', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
            >
              <Eye size={14} />
              <span>Preview Live App</span>
            </a>
          </div>
        )}
      </div>

      {/* CENTER: Code Workspace + Console log */}
      <div className="center-editor-panel">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ padding: '10px 20px', background: '#0a0d18', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {selectedFile || 'no-file-selected'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedFile && (
                <button 
                  onClick={handleSaveFile}
                  className="btn-secondary" 
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  <span>Save file</span>
                </button>
              )}
              <button 
                onClick={handleRedeploy} 
                className="btn-primary" 
                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--neon-cyan)', color: '#070913' }}
                disabled={redeploying}
              >
                <RefreshCw size={12} className={redeploying ? 'spin' : ''} />
                <span>{redeploying ? 'Building...' : 'Redeploy'}</span>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <Editor
              height="100%"
              theme="vs-dark"
              language={getEditorLanguage(selectedFile)}
              value={fileContent}
              onChange={(val) => setFileContent(val || '')}
              options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', automaticLayout: true }}
              loading={
                <textarea 
                  className="textarea-editor" 
                  value={fileContent} 
                  onChange={(e) => setFileContent(e.target.value)} 
                />
              }
            />
          </div>
        </div>

        {/* BOTTOM: Workspace pipeline logs */}
        <TerminalConsole title="DevOps Run Logs" logs={consoleLogs} />
      </div>

      {/* RIGHT: AI Copilot RAG queries & Monitoring tab */}
      <div className="right-info-panel" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* Toggle tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setActiveTab('rag')}
            style={{ 
              flex: 1, 
              background: 'none', 
              border: 'none', 
              padding: '14px 0', 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              cursor: 'pointer',
              color: activeTab === 'rag' ? 'var(--neon-purple)' : 'var(--text-muted)',
              borderBottom: activeTab === 'rag' ? '2px solid var(--neon-purple)' : '2px solid transparent'
            }}
          >
            AI Query (RAG)
          </button>
          <button 
            onClick={() => setActiveTab('monitor')}
            style={{ 
              flex: 1, 
              background: 'none', 
              border: 'none', 
              padding: '14px 0', 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              cursor: 'pointer',
              color: activeTab === 'monitor' ? 'var(--neon-green)' : 'var(--text-muted)',
              borderBottom: activeTab === 'monitor' ? '2px solid var(--neon-green)' : '2px solid transparent'
            }}
          >
            Telemetry Node
          </button>
        </div>

        {/* Tab 1: AI RAG Assistant */}
        {activeTab === 'rag' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', paddingRight: '4px' }}>
              
              {chatHistory.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p>Ask architectural or layout questions about the generated code files. The bot queries ChromaDB index database files directly.</p>
                  
                  {/* Preset prompt tags */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Suggested Questions:</div>
                    <button 
                      onClick={(e) => handleRAGQuery(e, "How is authentication implemented?")}
                      className="btn-secondary" 
                      style={{ fontSize: '0.75rem', justifyContent: 'flex-start', padding: '8px' }}
                    >
                      "How is authentication implemented?"
                    </button>
                    <button 
                      onClick={(e) => handleRAGQuery(e, "Which database schema is used?")}
                      className="btn-secondary" 
                      style={{ fontSize: '0.75rem', justifyContent: 'flex-start', padding: '8px' }}
                    >
                      "Which database schema is used?"
                    </button>
                    <button 
                      onClick={(e) => handleRAGQuery(e, "Explain API flow")}
                      className="btn-secondary" 
                      style={{ fontSize: '0.75rem', justifyContent: 'flex-start', padding: '8px' }}
                    >
                      "Explain API flow"
                    </button>
                  </div>
                </div>
              )}

              {chatHistory.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div 
                    style={{ 
                      padding: '10px 14px', 
                      borderRadius: '8px', 
                      fontSize: '0.85rem', 
                      lineHeight: '1.4',
                      background: msg.role === 'user' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.03)',
                      color: msg.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      border: msg.role === 'user' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid var(--border-color)'
                    }}
                  >
                    {msg.text}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '4px' }}>
                      Context references: {msg.sources.join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleRAGQuery} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <input 
                type="text" 
                className="form-input" 
                style={{ flex: 1 }} 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask RAG bot..." 
                required
                disabled={querying}
              />
              <button type="submit" className="btn-primary" style={{ padding: '10px' }} disabled={querying}>
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Monitoring pane */}
        {activeTab === 'monitor' && (
          <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
            
            {/* Live Metrics Grid */}
            {metrics ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Container Status</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--neon-green)' }}>{metrics.status}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Response Latency</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--neon-cyan)' }}>{metrics.latency}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CPU Utilization</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{metrics.cpu}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Memory Allocated</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{metrics.memory}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>Connecting container metrics node...</div>
            )}

            {/* Live stream server log viewer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--neon-green)', fontWeight: '600' }}>
                <Terminal size={14} />
                <span>Live Server Telemetry Logs</span>
              </div>
              <div style={{ flex: 1, minHeight: '120px', background: '#04060b', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#10b981', overflowY: 'auto' }}>
                {liveLogs.map((log, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>{log}</div>
                ))}
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkOnProject;
