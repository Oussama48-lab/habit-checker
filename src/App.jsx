import './App.css'
import SignIn from './Components/SignIn'
import SignUp from './Components/SignUp'
import Home from './Components/Home'
import { Routes, Route } from 'react-router-dom'
import { UserQuestions } from './Components/UserQuestions'
import PrivateRoute from './Components/PrivateRoute'

function App() {
  return (
    <Routes>
      {/* Public routes - accessible without authentication */}
      <Route path="/" element={<SignIn />} />
      <Route path="/Signup" element={<SignUp />} />

      {/* Protected routes - require authentication */}
      <Route
        path="/Home"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route
        path="/UserQuestions"
        element={
          <PrivateRoute>
            <UserQuestions />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default App
