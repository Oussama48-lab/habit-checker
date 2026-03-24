import { useState } from 'react'
import '../Css/SignUp.css'
import { useNavigate } from 'react-router-dom';
import supabase from '../SupabaseClient';




function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Handle sign-up logic here
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!')
      return

    }
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.name, // For Home.jsx welcome message compatibility
          full_name: formData.name
        }
      }
    });

    if (error) {
      alert(error.message)
    } else {
      if (data?.user) {
        // Insert into profiles with the user ID to link them
        const { error: profileError } = await supabase.from('Profiles').insert([
          {
            user_id: data.user.id, // Important: Link to auth.users
            Name: formData.name,
            First_LogIn: false // Initialize as false for new users
          }
        ]);

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // We don't block success alert here, but logging is good
        }
      }

      alert('Sign up successful! Please check your email to confirm your account.')
      navigate('/');
    }
    console.log('Sign up:', formData)
  }

  return (
    <div className="sign-up-container">
      <div className="sign-up-card">
        <h1 className="sign-up-title">Create Account</h1>
        <p className="sign-up-subtitle">Sign up to get started with your account</p>

        <form onSubmit={handleSubmit} className="sign-up-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="terms-checkbox">
              <input type="checkbox" required />
              <span>I agree to the <a href="#">Terms and Conditions</a></span>
            </label>
          </div>

          <button type="submit" className="sign-up-button">
            Sign Up
          </button>
        </form>

        <div className="sign-up-divider">
          <span>Or continue with</span>
        </div>

        <div className="social-sign-up">
          <button type="button" className="social-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>
          <button type="button" className="social-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 3.305-2.185 4.344-.977.785-2.016 1.177-3.117 1.177-.336 0-.688-.034-1.056-.103-.184-.034-.368-.052-.552-.052-.736 0-1.472.184-2.208.552-.16.08-.304.136-.432.168-.128.032-.272.048-.432.048-.512 0-1.024-.184-1.536-.552V8.16h2.944c.16 0 .32.018.48.052.16.034.32.086.48.154.64.274 1.152.64 1.536 1.1.192.23.352.48.48.752.128.272.192.56.192.864 0 .352-.064.688-.192 1.008-.128.32-.288.624-.48.912-.192.288-.416.552-.672.792-.256.24-.544.448-.864.624-.32.176-.672.32-1.056.432-.384.112-.8.168-1.248.168-.448 0-.864-.056-1.248-.168-.384-.112-.736-.256-1.056-.432-.32-.176-.608-.384-.864-.624-.256-.24-.48-.504-.672-.792-.192-.288-.352-.592-.48-.912-.128-.32-.192-.656-.192-1.008 0-.304.064-.592.192-.864.128-.272.288-.522.48-.752.384-.46.896-.826 1.536-1.1.16-.068.32-.12.48-.154.16-.034.32-.052.48-.052h2.944V5.568H5.568v2.592z" />
            </svg>
            GitHub
          </button>
        </div>

        <p className="sign-in-link">
          Already have an account? <a href="/">Sign in</a>
        </p>
      </div>
    </div>
  )
}

export default SignUp
