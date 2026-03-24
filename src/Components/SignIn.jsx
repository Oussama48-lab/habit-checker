import { useState } from 'react'
import '../Css/SignIn.css'
import { useNavigate } from 'react-router-dom';
import supabase from '../SupabaseClient';

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Sign in user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      alert(signInError.message)
      return
    }

    const user = signInData.user
    if (!user) {
      alert('No user found after sign in!')
      return
    }

    // Fetch user's answers (we only need sleep_hours to check)
    const { data: answers, error: answersError } = await supabase
      .from('Profiles')
      .select('First_LogIn')
      .eq('user_id', user.id)
      .limit(1)

    if (answersError) {
      console.error('Error checking previous answers:', answersError)
      alert('Something went wrong. Try again.')
      return
    }

    // Check if the user never submitted answers OR First_LogIn is null/false
   if (!answers || answers.length === 0 || !answers[0].First_LogIn) {
  // First-time login → redirect to questions
  navigate('/UserQuestions');
  console.log(answers)
} else {
  // User already has answers → go to Home
  navigate('/Home');
}

  }

  return (
    <div className="sign-in-container">
      <div className="sign-in-card">
        <h1 className="sign-in-title">Welcome Back</h1>
        <p className="sign-in-subtitle">Sign in to your account to continue</p>
        
        <form onSubmit={handleSubmit} className="sign-in-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
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

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" className="forgot-password">Forgot password?</a>
          </div>

          <button type="submit" className="sign-in-button">
            Sign In
          </button>
        </form>

        <p className="sign-up-link">
          Don't have an account? <a href="/SignUp">Sign up</a>
        </p>
      </div>
    </div>
  )
}

export default SignIn
