import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Bug, FolderPlus, HelpCircle, Code, Settings, Plus, Sparkles } from 'lucide-react';
import GlassPanel from '../components/GlassPanel';
import ProjectCard from '../components/ProjectCard';
import { api } from '../utils/api';

const Dashboard = () => {
  const [programs, setPrograms] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [programsList, projectsList] = await Promise.all([
          api.getPrograms(),
          api.getProjects()
        ]);
        setPrograms(programsList);
        setProjects(projectsList);
      } catch (err) {
        console.error("Failed to load dashboard statistics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleOpenProject = (id) => {
    navigate(`/work-on-project/${id}`);
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Hero Welcome Panel */}
      <div style={{ padding: '32px 24px 10px 24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Command Center</span>
          <Sparkles size={18} className="purple" />
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Select an instruction from the devops terminal below to initialize agent orchestration.
        </p>
      </div>

      {/* Main Command Actions Grid */}
      <div className="dashboard-grid">
        <GlassPanel interactive className="command-card cyan" onClick={() => navigate('/create-program')}>
          <h3>
            <Terminal size={18} />
            <span>/create-program</span>
          </h3>
          <p>Lightweight coding assistant to compile functions, inspect complexity and simulate unit tests.</p>
        </GlassPanel>

        <GlassPanel interactive className="command-card purple" onClick={() => navigate('/fix-bug')}>
          <h3>
            <Bug size={18} />
            <span>/fix-bug</span>
          </h3>
          <p>Import broken code snippets and runtime logs. Diff differences and approve patches.</p>
        </GlassPanel>

        <GlassPanel interactive className="command-card green" onClick={() => navigate('/create-project')}>
          <h3>
            <FolderPlus size={18} />
            <span>/create-project</span>
          </h3>
          <p>Orchestrate 9 autonomous agents to design, construct, verify and deploy complete stacks.</p>
        </GlassPanel>

        <GlassPanel interactive className="command-card rose" onClick={() => {
          if (projects.length > 0) {
            handleOpenProject(projects[0].id);
          } else {
            navigate('/create-project');
          }
        }}>
          <h3>
            <HelpCircle size={18} />
            <span>/work-on-project</span>
          </h3>
          <p>Select built projects, continue structural expansion, redeploy and run vector RAG queries.</p>
        </GlassPanel>
      </div>

      {/* Two Column Lists */}
      <div className="dashboard-lists">
        {/* Programs History */}
        <GlassPanel className="list-panel">
          <h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={16} className="cyan" />
              <span>Generated Programs</span>
            </div>
            <button onClick={() => navigate('/create-program')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
              <Plus size={12} />
              <span>Create</span>
            </button>
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Synchronizing programs logs...</div>
          ) : programs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No program history available. Run <code>/create-program</code> to start.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
              {programs.map((prog) => (
                <div key={prog.id} style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '4px' }}>{prog.prompt}</h5>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>{prog.language}</span>
                      <span>•</span>
                      <span>{prog.complexity || 'O(1)'}</span>
                      <span>•</span>
                      <span>{new Date(prog.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => navigate('/create-program', { state: { presetProgram: prog } })} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                    <span>Open Editor</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* Projects Listing */}
        <GlassPanel className="list-panel">
          <h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} className="green" />
              <span>Active DevOps Projects</span>
            </div>
            <button onClick={() => navigate('/create-project')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
              <Plus size={12} />
              <span>New Project</span>
            </button>
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Querying build configurations...</div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No active projects found. Select <code>/create-project</code> to initiate.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
              {projects.map((proj) => (
                <ProjectCard key={proj.id} project={proj} onOpen={handleOpenProject} />
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};

export default Dashboard;
