// PrivateRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from '../SupabaseClient';

function PrivateRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // Only authenticate if session exists AND user exists
      const valid = !!session?.user?.id;
      setIsAuthenticated(valid);
      setLoading(false);
    };

    checkSession();

    // Listen to login/logout changes dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user?.id);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) return null; // or a spinner

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return children;
}

export default PrivateRoute;
