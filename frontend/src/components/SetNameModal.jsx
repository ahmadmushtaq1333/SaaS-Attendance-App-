import React, { useState } from 'react';
import API from '../services/api';

export default function SetNameModal({ user, onNameSet }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await API.patch('/auth/me/', { full_name: name.trim() });
      onNameSet(res.data);
    } catch (err) {
      setError('Failed to save name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-c" style={{ padding: '30px', borderRadius: '16px', maxWidth: '400px', width: '90%', background: 'var(--glass-b)' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', color: 'var(--text-primary)' }}>Welcome to Quorum!</h2>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
          Please set your full name to continue. This will be displayed on your portal and attendance records.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="e.g. John Doe"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div style={{ color: 'var(--rose)', fontSize: '13px' }}>{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading || !name.trim()} style={{ padding: '10px', marginTop: '10px' }}>
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
