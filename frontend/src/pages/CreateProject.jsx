import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, Play, Layers, Download, CheckCircle2, ShieldAlert, Cpu, AlertCircle, RefreshCw } from 'lucide-react';
import GlassPanel from '../components/GlassPanel';
import AnimatedWorkflow from '../components/AnimatedWorkflow';
import TerminalConsole from '../components/TerminalConsole';
import { api } from '../utils/api';

const CreateProject = () => {
  const navigate = useNavigate();
  
  // Inputs
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stack, setStack] = useState('Python');
  const [buildOnly, setBuildOnly] = useState(true);

  // States
  const [projectId, setProjectId] = useState(null);
  const [building, setBuilding] = useState(false);
  const [currentAgent, setCurrentAgent] = useState('idle');
  const [agentStates, setAgentStates] = useState({});
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [intervention, setIntervention] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [projectResult, setProjectResult] = useState(null);
  
  const pollingRef = useRef(null);

  const handleBuild = async (e) => {
    e.preventDefault();
    const st = stack.toUpperCase();
    if (st !== 'MERN' && st !== 'PYTHON') {
      alert("Polite Restrict: Only MERN or Python stacks are supported by our autonomous agents at this time.");
      return;
    }

    setBuilding(true);
    setIntervention(false);
    setProjectResult(null);
    setErrorMsg('');
    setConsoleLogs([`[Orchestrator] Launching Multi-Agent SDLC loop for project: ${name}...`]);

    try {
      const res = await api.createProject(name, description, stack, buildOnly);
      setProjectId(res.id);
      
      // Start workflow graph polling loop
      startPolling(res.id);
    } catch (err) {
      setConsoleLogs(prev => [...prev, `[Fatal Core Error] ${err.message}`]);
      setBuilding(false);
    }
  };

  const startPolling = (id) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const graph = await api.getProjectGraph(id);
        setCurrentAgent(graph.current_agent);
        setAgentStates(graph.agent_states);

        // Add custom agent logs to terminal console for dynamic output look
        if (graph.current_agent !== 'completed' && graph.current_agent !== 'failed') {
          setConsoleLogs(prev => {
            const agentLog = `[${graph.current_agent}] Actively processing state transitions...`;
            if (prev[prev.length - 1] !== agentLog) {
              return [...prev, agentLog];
            }
            return prev;
          });
        }

        if (graph.human_approval_required) {
          clearInterval(pollingRef.current);
          setIntervention(true);
          setErrorMsg(graph.error_message || "Autonomous testing validation failed.");
          setConsoleLogs(prev => [
            ...prev, 
            `[ALERT] Execution halted. ${graph.error_message}`,
            `[Human Intervention] Waiting for manual review...`
          ]);
        }

        if (graph.current_agent === 'completed' || graph.current_agent === 'completed_build') {
          clearInterval(pollingRef.current);
          completeBuild(id);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1000);
  };

  const completeBuild = async (id) => {
    try {
      const proj = await api.getProject(id);
      setProjectResult(proj);
      setConsoleLogs(prev => [
        ...prev,
        "[Orchestrator] SDLC code generation loop finished successfully.",
        `[Result] Code generated: ${Object.keys(proj.files || {}).length} files created.`,
        proj.live_url ? `[Deployment] Sandbox URL live at: ${proj.live_url}` : "[Build] Package ready for ZIP download."
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setBuilding(false);
    }
  };

  const handleInterventionAction = async (action) => {
    if (!projectId) return;
    setIntervention(false);
    setConsoleLogs(prev => [...prev, `[Developer Action] Sent override request: ${action.toUpperCase()}`]);

    try {
      const res = await api.submitProjectIntervention(projectId, action);
      if (action === 'retry') {
        // Restart polling loop
        setBuilding(true);
        startPolling(projectId);
      } else if (action === 'override') {
        // Complete build and fetch result
        completeBuild(projectId);
      } else {
        // Aborted
        setBuilding(false);
        setProjectId(null);
        setConsoleLogs(prev => [...prev, "[ABORT] SDLC workflow aborted by developer."]);
      }
    } catch (err) {
      setConsoleLogs(prev => [...prev, `[ERROR] Intervention command failed: ${err.message}`]);
    }
  };

  const handleDownloadZip = () => {
    if (!projectResult) return;
    // Generate simple text schema zip represent as downloadable text file
    const content = JSON.stringify(projectResult.files, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectResult.name.toLowerCase().replace(/\s+/g, '-')}-workspace.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', padding: '24px', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      
      {/* LEFT: Project config inputs */}
      <GlassPanel style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-green)' }}>
          <FolderPlus size={20} />
          <span>New SDLC Build Plan</span>
        </h3>

        <form onSubmit={handleBuild} style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          <div className="form-group">
            <label>Project Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Task Manager API"
              required 
            />
          </div>

          <div className="form-group">
            <label>Project Requirements Stack</label>
            <select 
              value={stack} 
              onChange={(e) => setStack(e.target.value)}
              className="form-input"
              style={{ background: '#070913', cursor: 'pointer' }}
            >
              <option>Python</option>
              <option>MERN</option>
              <option>Java (Unsupported Stack)</option>
              <option>C++ (Unsupported Stack)</option>
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label>Describe the App Feature requirements</label>
            <textarea 
              className="form-input" 
              style={{ flex: 1, resize: 'none', background: '#070913', fontSize: '0.85rem', lineHeight: '1.4' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Build a personal todo app, with Express backend and mongoose storage schema. Add columns for priority and items checkboxes..."
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '15px', padding: '10px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input 
                type="radio" 
                checked={buildOnly} 
                onChange={() => setBuildOnly(true)} 
                style={{ accentColor: 'var(--neon-green)' }} 
              />
              <span>Build Only (ZIP)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input 
                type="radio" 
                checked={!buildOnly} 
                onChange={() => setBuildOnly(false)} 
                style={{ accentColor: 'var(--neon-cyan)' }} 
              />
              <span>Build + Deploy (Live URL)</span>
            </label>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center', background: 'var(--neon-green)', color: '#070913', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }} 
            disabled={building}
          >
            <Play size={14} fill="#070913" />
            <span>Launch Agent Orchestration</span>
          </button>
        </form>
      </GlassPanel>

      {/* RIGHT: Animated workflow graph & console logs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
        
        {/* Main interactive workflow panel */}
        <GlassPanel style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: '16px' }}>
          
          {!building && !projectResult && !intervention && (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Cpu size={48} opacity={0.2} style={{ animation: 'spin 12s linear infinite' }} />
              <span>Configure build parameters and launch the agent. Visual workflow details appear here.</span>
            </div>
          )}

          {/* ACTIVE WORKFLOW GRAPH GRAPH */}
          {(building || intervention || projectResult) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>SDLC Agent Core Status</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>Active Node: {currentAgent}</span>
              </div>
              <AnimatedWorkflow currentAgent={currentAgent} agentStates={agentStates} />
            </div>
          )}

          {/* HUMAN INTERVENTION OVERLAY */}
          {intervention && (
            <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid var(--neon-rose)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-rose)', fontWeight: '600', fontSize: '0.9rem' }}>
                <ShieldAlert size={18} />
                <span>Build Intervention Alert</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {errorMsg}. The testing suite reports execution assertion failures. Select bypass override or retry.
              </p>
              <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end' }}>
                <button onClick={() => handleInterventionAction('abort')} className="btn-secondary" style={{ color: 'var(--neon-rose)', borderColor: 'rgba(244,63,94,0.2)' }}>
                  Abort Pipeline
                </button>
                <button onClick={() => handleInterventionAction('retry')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={12} />
                  <span>Retry Fix loop</span>
                </button>
                <button onClick={() => handleInterventionAction('override')} className="btn-primary" style={{ background: 'var(--neon-green)', color: '#070913', boxShadow: 'none' }}>
                  Bypass & Deploy
                </button>
              </div>
            </div>
          )}

          {/* FINAL PROJECT OUTPUT */}
          {projectResult && (
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--neon-green)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-green)', fontWeight: '600', fontSize: '0.95rem' }}>
                <CheckCircle2 size={18} />
                <span>Project Build Complete!</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                The multi-agent group has constructed, compiled, and resolved tests for '{projectResult.name}'. Code index indexed in vector memory database.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleDownloadZip} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={14} />
                  <span>Download Workspace JSON</span>
                </button>
                
                {projectResult.live_url && (
                  <a 
                    href={projectResult.live_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-primary"
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Visit Live Sandbox</span>
                  </a>
                )}

                <button onClick={() => navigate(`/work-on-project/${projectResult.id}`)} className="btn-secondary" style={{ marginLeft: 'auto' }}>
                  <span>Open workspace IDE →</span>
                </button>
              </div>
            </div>
          )}

        </GlassPanel>

        {/* BOTTOM: Console logger terminal */}
        <TerminalConsole title="DevOps Orchestrator Logs" logs={consoleLogs} />

      </div>
    </div>
  );
};

export default CreateProject;
