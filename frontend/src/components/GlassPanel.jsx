import React from 'react';

const GlassPanel = ({ children, className = '', interactive = false, ...props }) => {
  return (
    <div 
      className={`glass-panel ${interactive ? 'interactive' : ''} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
