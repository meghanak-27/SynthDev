import React from 'react';
import { ExternalLink, Database, Calendar, Play } from 'lucide-react';
import GlassPanel from './GlassPanel';

const ProjectCard = ({ project, onOpen }) => {
  const getStatusStyle = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--neon-green)', border: 'rgba(16, 185, 129, 0.2)' };
      case 'waiting_intervention':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--neon-amber)', border: 'rgba(245, 158, 11, 0.2)' };
      case 'failed':
      case 'aborted':
        return { bg: 'rgba(244, 63, 94, 0.1)', text: 'var(--neon-rose)', border: 'rgba(244, 63, 94, 0.2)' };
      default:
        return { bg: 'rgba(6, 182, 212, 0.1)', text: 'var(--neon-cyan)', border: 'rgba(6, 182, 212, 0.2)' };
    }
  };

  const statusStyle = getStatusStyle(project.status);

  return (
    <GlassPanel interactive onClick={() => onOpen(project.id)} style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{project.name}</h4>
        <span 
          style={{ 
            fontSize: '0.75rem', 
            padding: '3px 8px', 
            borderRadius: '4px', 
            backgroundColor: statusStyle.bg, 
            color: statusStyle.text, 
            border: `1px solid ${statusStyle.border}`,
            fontWeight: '600',
            textTransform: 'uppercase'
          }}
        >
          {project.status.replace('_', ' ')}
        </span>
      </div>
      
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '36px', lineHeight: '1.4' }}>
        {project.description || 'No description provided.'}
      </p>

      <div style={{ display: 'flex', gap: '15px', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Database size={12} />
          <span>{project.stack}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={12} />
          <span>{new Date(project.created_at).toLocaleDateString()}</span>
        </div>
        {project.live_url && (
          <div style={{ marginLeft: 'auto' }}>
            <a 
              href={project.live_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={(e) => e.stopPropagation()} 
              style={{ color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
            >
              <span>Preview</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </GlassPanel>
  );
};

export default ProjectCard;
