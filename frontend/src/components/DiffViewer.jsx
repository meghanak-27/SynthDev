import React from 'react';

const DiffViewer = ({ original = '', modified = '' }) => {
  // A clean, simple line-by-line diff visualizer
  const originalLines = original ? original.split('\n') : [];
  const modifiedLines = modified ? modified.split('\n') : [];
  
  const diffLines = [];
  const maxLines = Math.max(originalLines.length, modifiedLines.length);

  // Simple heuristic for showing diff changes (ideal for buggy/fixed code examples)
  let origIdx = 0;
  let modIdx = 0;

  while (origIdx < originalLines.length || modIdx < modifiedLines.length) {
    const origLine = originalLines[origIdx];
    const modLine = modifiedLines[modIdx];

    if (origLine === modLine) {
      diffLines.push({ type: 'neutral', text: origLine, num: origIdx + 1 });
      origIdx++;
      modIdx++;
    } else {
      // Check if line was removed or added
      if (origLine !== undefined && (modLine === undefined || !modifiedLines.slice(modIdx).includes(origLine))) {
        diffLines.push({ type: 'removed', text: '-' + origLine, num: origIdx + 1 });
        origIdx++;
      } else {
        diffLines.push({ type: 'added', text: '+' + modLine, num: modIdx + 1 });
        modIdx++;
      }
    }
  }

  return (
    <div className="diff-container">
      <div style={{ background: '#0e1324', padding: '8px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--neon-rose)' }}>● Red: Removed</span>
        <span style={{ color: 'var(--neon-green)' }}>● Green: Added</span>
      </div>
      <div style={{ overflowX: 'auto', padding: '10px 0' }}>
        {diffLines.map((line, idx) => (
          <div key={idx} className={`diff-line ${line.type}`}>
            <span className="diff-num">{line.num}</span>
            <span style={{ whiteSpace: 'pre' }}>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiffViewer;
