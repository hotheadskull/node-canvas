import { ConnectionLineComponentProps } from '@xyflow/react';

export function LiveConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
}: ConnectionLineComponentProps) {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  
  const particles = Array.from({ length: 20 }).map((_, i) => {
    // We shoot sparks backwards along the line, but fanning out
    const baseAngle = Math.atan2(toY - fromY, toX - fromX);
    // Add random spread (-0.5 to 0.5 radians)
    const angle = baseAngle + Math.PI + (Math.random() - 0.5); 
    
    // Some spark out radial
    const radialAngle = (Math.PI * 2 * i) / 20;

    // Mix radial and backward momentum based on distance
    const finalAngle = distance > 50 ? angle : radialAngle;

    const sparkDist = 15 + Math.random() * 25;
    const tx = Math.cos(finalAngle) * sparkDist;
    const ty = Math.sin(finalAngle) * sparkDist;
    const delay = Math.random() * 0.5;

    return (
      <div
        key={i}
        className="continuous-spark"
        style={{
          left: 0,
          top: 0,
          '--tx': `${tx}px`,
          '--ty': `${ty}px`,
          animationDelay: `-${delay}s` // Negative delay so they start immediately
        } as any}
      />
    );
  });

  return (
    <g>
      <path
        fill="none"
        stroke="rgba(240, 192, 80, 0.8)"
        strokeWidth={3}
        className="animated-connection"
        d={`M${fromX},${fromY} C ${fromX} ${toY} ${fromX} ${toY} ${toX},${toY}`}
      />
      {/* Halo for the dragged line */}
      <path
        fill="none"
        stroke="rgba(240, 192, 80, 0.3)"
        strokeWidth={8}
        style={{ filter: 'blur(3px)' }}
        d={`M${fromX},${fromY} C ${fromX} ${toY} ${fromX} ${toY} ${toX},${toY}`}
      />
      
      <foreignObject x={toX - 20} y={toY - 20} width={40} height={40}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            {particles}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
