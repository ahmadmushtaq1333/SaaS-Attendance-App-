import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = "info", onClose, duration = 3000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!message) return;
    
    setIsVisible(true);
    
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) setTimeout(onClose, 300); // Wait for fade out animation
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message || !isVisible && !onClose) return null;

  const typeConfig = {
    success: { icon: CheckCircle, color: 'var(--emerald)' },
    error: { icon: AlertCircle, color: 'var(--red)' },
    info: { icon: Info, color: 'var(--cyan)' }
  };
  
  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      background: 'var(--glass-a)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--glass-border)',
      padding: '12px 20px',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 9999,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      <Icon size={18} color={config.color} />
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
        {message}
      </span>
      {onClose && (
        <button 
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            marginLeft: 8
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
