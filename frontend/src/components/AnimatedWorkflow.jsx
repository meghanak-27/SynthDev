import React from 'react';

const AGENT_COORDS = {
  "Requirement Agent": { x: 50, y: 50, color: "var(--neon-cyan)" },
  "Planner Agent": { x: 200, y: 50, color: "var(--neon-purple)" },
  "Architecture Agent": { x: 350, y: 50, color: "var(--neon-amber)" },
  "Backend Agent": { x: 350, y: 180, color: "var(--neon-cyan)" },
  "Frontend Agent": { x: 200, y: 180, color: "var(--neon-purple)" },
  "Testing Agent": { x: 50, y: 180, color: "var(--neon-cyan)" },
  "Fix Agent": { x: 50, y: 310, color: "var(--neon-rose)" },
  "Deployment Agent": { x: 200, y: 310, color: "var(--neon-green)" },
  "Monitoring Agent": { x: 350, y: 310, color: "var(--neon-cyan)" }
};

const AGENT_ORDER = [
  "Requirement Agent",
  "Planner Agent",
  "Architecture Agent",
  "Backend Agent",
  "Frontend Agent",
  "Testing Agent",
  "Fix Agent",
  "Deployment Agent",
  "Monitoring Agent"
];

const AnimatedWorkflow = ({ currentAgent, agentStates = {} }) => {
  // Helpers to color nodes based on state
  const getNodeColor = (name) => {
    const state = agentStates[name] || "idle";
    if (state === "completed") return "var(--neon-green)";
    if (state === "failed") return "var(--neon-rose)";
    if (state === "running") return "var(--neon-cyan)";
    if (state === "retrying") return "var(--neon-amber)";
    return "rgba(255,255,255,0.05)";
  };

  const getStrokeColor = (name) => {
    const state = agentStates[name] || "idle";
    if (state === "completed") return "var(--neon-green)";
    if (state === "failed") return "var(--neon-rose)";
    if (state === "running") return "var(--neon-cyan)";
    if (state === "retrying") return "var(--neon-amber)";
    return "rgba(255,255,255,0.15)";
  };

  return (
    <div style={{ width: '100%', overflow: 'hidden', padding: '10px 0' }}>
      <svg width="100%" height="380" viewBox="0 0 420 370" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <defs>
          <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--neon-cyan)" />
            <stop offset="100%" stopColor="var(--neon-purple)" />
          </linearGradient>
          <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- Paths Connectors --- */}
        {/* Requirement -> Planner */}
        <line x1="50" y1="50" x2="200" y2="50" stroke={getStrokeColor("Planner Agent")} strokeWidth="2" 
          className={`flow-link ${agentStates["Planner Agent"] === "running" ? 'active' : ''}`} />
        
        {/* Planner -> Architecture */}
        <line x1="200" y1="50" x2="350" y2="50" stroke={getStrokeColor("Architecture Agent")} strokeWidth="2"
          className={`flow-link ${agentStates["Architecture Agent"] === "running" ? 'active' : ''}`} />
        
        {/* Architecture -> Backend */}
        <line x1="350" y1="50" x2="350" y2="180" stroke={getStrokeColor("Backend Agent")} strokeWidth="2"
          className={`flow-link ${agentStates["Backend Agent"] === "running" ? 'active' : ''}`} />
        
        {/* Backend -> Frontend */}
        <line x1="350" y1="180" x2="200" y2="180" stroke={getStrokeColor("Frontend Agent")} strokeWidth="2"
          className={`flow-link ${agentStates["Frontend Agent"] === "running" ? 'active' : ''}`} />
        
        {/* Frontend -> Testing */}
        <line x1="200" y1="180" x2="50" y2="180" stroke={getStrokeColor("Testing Agent")} strokeWidth="2"
          className={`flow-link ${agentStates["Testing Agent"] === "running" ? 'active' : ''}`} />
        
        {/* Testing -> Fix loop */}
        <path d="M 50 180 Q 20 245 50 310" fill="none" stroke={getStrokeColor("Fix Agent")} strokeWidth="2"
          className={`flow-link ${agentStates["Fix Agent"] === "running" ? 'active' : ''}`} />
        
        {/* Fix -> Testing Loop return */}
        <path d="M 50 310 Q 80 245 50 180" fill="none" stroke={getStrokeColor("Testing Agent")} strokeWidth="2"
          className={`flow-link ${agentStates["Testing Agent"] === "retrying" ? 'active' : ''}`} />
        
        {/* Testing -> Deployment */}
        <line x1="50" y1="180" x2="200" y2="310" stroke={getStrokeColor("Deployment Agent")} strokeWidth="2"
          className={`flow-link ${agentStates["Deployment Agent"] === "running" ? 'active' : ''}`} />
          
        {/* Deployment -> Monitoring */}
        <line x1="200" y1="310" x2="350" y2="310" stroke={getStrokeColor("Monitoring Agent")} strokeWidth="2"
          className={`flow-link ${agentStates["Monitoring Agent"] === "running" ? 'active' : ''}`} />

        {/* --- Render Nodes --- */}
        {Object.entries(AGENT_COORDS).map(([name, pos]) => {
          const isCurrent = currentAgent === name;
          const status = agentStates[name] || "idle";
          const fillColor = getNodeColor(name);
          
          return (
            <g key={name} className="agent-node">
              {/* Outer glowing ring for running state */}
              {status === "running" && (
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r="24" 
                  fill="none" 
                  stroke="var(--neon-cyan)" 
                  strokeWidth="2" 
                  opacity="0.6"
                  filter="url(#glow-effect)"
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px`, animation: 'pulseGlow 1.5s infinite alternate' }}
                />
              )}
              
              {/* Main Node Circle */}
              <circle 
                cx={pos.x} 
                cy={pos.y} 
                r="16" 
                fill={fillColor} 
                stroke={status === "idle" ? "rgba(255,255,255,0.2)" : "transparent"} 
                strokeWidth="1.5"
                className={`node-circle ${status}`}
              />
              
              {/* Status indicator dots */}
              {status === "completed" && (
                <circle cx={pos.x} cy={pos.y} r="6" fill="#070913" />
              )}
              
              {/* Node Title text labels */}
              <text 
                x={pos.x} 
                y={pos.y + 32} 
                textAnchor="middle" 
                fill={isCurrent ? "var(--neon-cyan)" : "var(--text-secondary)"} 
                fontSize="10" 
                fontWeight={isCurrent ? "700" : "500"}
                fontFamily="var(--font-sans)"
              >
                {name.split(" ")[0]} Agent
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default AnimatedWorkflow;
