import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const avatarColors = ['#7c6bf0', '#d4b3f5', '#5DCAA5', '#f0997b', '#e84393', '#3498db', '#f39c12', '#2ecc71'];

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      onLogin(data.session);
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setValidationErrors({});

    // Validation
    const errors = {};
    if (!name.trim()) {
      errors.name = 'Name is required';
    }
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      // 1. Create auth user only
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: {
            full_name: name.trim()
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('An account with this email already exists');
        }
        throw authError;
      }

      // 2. Call backend to create member (backend uses service role key, bypasses RLS)
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const memberResponse = await fetch(`${API_BASE}/api/members/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_id: data.user.id,
          name: name.trim(),
          email: email.toLowerCase()
        })
      });

      if (!memberResponse.ok) {
        const error = await memberResponse.json();
        throw new Error(error.error || 'Failed to create member');
      }

      // 3. Show success and switch to sign in
      setSuccess('Account created! You can now sign in.');
      setName('');
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setMode('signin');
        setSuccess('');
      }, 2000);

    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const isSignIn = mode === 'signin';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#18181b'
    }}>
      <div style={{
        background: '#232326',
        border: '0.5px solid #3f3f46',
        borderRadius: '8px',
        padding: '32px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#8b5cf6',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: 'white',
                borderRadius: '50%'
              }} />
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#fafafa',
              margin: 0
            }}>Pixel</h1>
          </div>
          <p style={{
            color: '#a1a1aa',
            fontSize: '14px',
            margin: 0
          }}>
            {isSignIn ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={isSignIn ? handleSignIn : handleSignUp}>
          {!isSignIn && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#fafafa',
                marginBottom: '6px'
              }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#18181b',
                  border: `0.5px solid ${validationErrors.name ? '#ef4444' : '#3f3f46'}`,
                  borderRadius: '4px',
                  color: '#fafafa',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              {validationErrors.name && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  {validationErrors.name}
                </p>
              )}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#fafafa',
              marginBottom: '6px'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#18181b',
                border: '0.5px solid #3f3f46',
                borderRadius: '4px',
                color: '#fafafa',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: isSignIn ? '24px' : '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#fafafa',
              marginBottom: '6px'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#18181b',
                border: `0.5px solid ${validationErrors.password ? '#ef4444' : '#3f3f46'}`,
                borderRadius: '4px',
                color: '#fafafa',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {validationErrors.password && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {validationErrors.password}
              </p>
            )}
          </div>

          {!isSignIn && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#fafafa',
                marginBottom: '6px'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#18181b',
                  border: `0.5px solid ${validationErrors.confirmPassword ? '#ef4444' : '#3f3f46'}`,
                  borderRadius: '4px',
                  color: '#fafafa',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              {validationErrors.confirmPassword && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px',
              background: '#7f1d1d',
              border: '0.5px solid #991b1b',
              borderRadius: '4px',
              color: '#fecaca',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '12px',
              background: '#14532d',
              border: '0.5px solid #166534',
              borderRadius: '4px',
              color: '#bbf7d0',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              background: loading ? '#6d28d9' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (isSignIn ? 'Signing in...' : 'Creating account...') : (isSignIn ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={() => {
              setMode(isSignIn ? 'signup' : 'signin');
              setError('');
              setSuccess('');
              setValidationErrors({});
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8b5cf6',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isSignIn ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
