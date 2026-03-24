import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Css/UserQuestions.css';
import supabase from '../SupabaseClient';

// Helper function to convert 12-hour time to 24-hour format for database
const convertTo24Hour = (time12h) => {
  if (!time12h) return null;
  
  const [time, period] = time12h.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
};

// Modern Clock Picker Component
function ModernTimePicker({ value, onChange }) {
  const [mode, setMode] = useState('hours'); // 'hours' or 'minutes'
  const [activeAmPm, setActiveAmPm] = useState('PM');
  const [selectedHour, setSelectedHour] = useState(10);
  const [selectedMinute, setSelectedMinute] = useState(0);

  useEffect(() => {
    // Sync external value if it exists (assuming "HH:MM AM/PM" format or similar)
    if (value) {
      const parts = value.match(/(\d+):(\d+)\s*(AM|PM)/);
      if (parts) {
        setSelectedHour(parseInt(parts[1]));
        setSelectedMinute(parseInt(parts[2]));
        setActiveAmPm(parts[3]);
      }
    }
  }, [value]);

  const updateParent = (h, m, ap) => {
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`);
  };

  const handleHourClick = (h) => {
    setSelectedHour(h);
    updateParent(h, selectedMinute, activeAmPm);
    setMode('minutes');
  };

  const handleMinuteClick = (m) => {
    setSelectedMinute(m);
    updateParent(selectedHour, m, activeAmPm);
  };

  const toggleAmPm = (ap) => {
    setActiveAmPm(ap);
    updateParent(selectedHour, selectedMinute, ap);
  };

  const hours = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="modern-clock-picker">
      <div className="clock-display">
        <span
          className={`display-unit ${mode === 'hours' ? 'active' : ''}`}
          onClick={() => setMode('hours')}
        >
          {String(selectedHour).padStart(2, '0')}
        </span>
        <span className="display-separator">:</span>
        <span
          className={`display-unit ${mode === 'minutes' ? 'active' : ''}`}
          onClick={() => setMode('minutes')}
        >
          {String(selectedMinute).padStart(2, '0')}
        </span>
        <div className="am-pm-toggle">
          <button
            className={`ap-btn ${activeAmPm === 'AM' ? 'active' : ''}`}
            onClick={() => toggleAmPm('AM')}
          >AM</button>
          <button
            className={`ap-btn ${activeAmPm === 'PM' ? 'active' : ''}`}
            onClick={() => toggleAmPm('PM')}
          >PM</button>
        </div>
      </div>

      <div className="clock-face-container">
        <div className="clock-face">
          <div className="clock-center"></div>
          <div className="clock-hand" style={{
            transform: `rotate(${mode === 'hours' ? (selectedHour * 30) : (selectedMinute * 6)}deg)`
          }}></div>

          {mode === 'hours' ? (
            hours.map((h, i) => {
              const angle = (i + 1) * 30;
              return (
                <div
                  key={h}
                  className={`clock-number ${selectedHour === h ? 'selected' : ''}`}
                  style={{
                    transform: `rotate(${angle}deg) translate(0, -90px) rotate(-${angle}deg)`
                  }}
                  onClick={() => handleHourClick(h)}
                >
                  {h}
                </div>
              );
            })
          ) : (
            minutes.map((m, i) => {
              const angle = i * 30;
              return (
                <div
                  key={m}
                  className={`clock-number ${selectedMinute === m ? 'selected' : ''}`}
                  style={{
                    transform: `rotate(${angle}deg) translate(0, -90px) rotate(-${angle}deg)`
                  }}
                  onClick={() => handleMinuteClick(m)}
                >
                  {String(m).padStart(2, '0')}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mode-selector">
        <button onClick={() => setMode('hours')} className={mode === 'hours' ? 'active' : ''}>Hours</button>
        <button onClick={() => setMode('minutes')} className={mode === 'minutes' ? 'active' : ''}>Minutes</button>
      </div>
    </div>
  );
}

export function UserQuestions() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null); // Logged-in user
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState({
    smoke: '',
    cigarettesPerDay: '',
    vape: '',
    heavyVape: '',
    pornAddiction: '',
    pornFrequency: '',
    sleepSchedule: '',
    overthink: '',
    lazyTasks: '',
    socialMediaHours: '',
    sleepTime: '',
    mainGoal: []
  });

  // Get the logged-in user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.error('Error getting session:', error);
      if (session?.user) setUser(session.user);
    };
    fetchUser();
  }, []);

  const questions = [
    { id: 1, question: 'Do you smoke?', field: 'smoke', choices: ['Yes', 'No'] },
    { id: 2, question: 'If yes, how many cigarettes do you smoke per day?', field: 'cigarettesPerDay', choices: ['1-5', '6-10', '11-20', '20+'], condition: (a) => a.smoke === 'Yes' },
    { id: 3, question: 'Do you vape?', field: 'vape', choices: ['Yes', 'No'] },
    { id: 4, question: 'If yes, do you consider yourself a heavy vape smoker?', field: 'heavyVape', choices: ['Yes', 'No'], condition: (a) => a.vape === 'Yes' },
    { id: 5, question: 'Do you have a porn addiction?', field: 'pornAddiction', choices: ['Yes', 'No'] },
    { id: 6, question: 'If yes, how often do you watch porn?', field: 'pornFrequency', choices: ['Daily', 'Few times a week', 'Once a week', 'Once a month'], condition: (a) => a.pornAddiction === 'Yes' },
    { id: 7, question: 'Describe your sleep schedule', field: 'sleepSchedule', choices: ['No sleep at all', 'Less than 2 hours', '2-5 hours', '5-8 hours', 'More than 8 hours'] },
    { id: 8, question: 'Do you overthink a lot?', field: 'overthink', choices: ['Yes, constantly', 'Sometimes', 'Rarely', 'No'] },
    { id: 9, question: 'Do you feel lazy to complete your daily tasks?', field: 'lazyTasks', choices: ['Always', 'Often', 'Sometimes', 'Rarely', 'Never'] },
    { id: 10, question: 'How many hours do you spend on social media per day?', field: 'socialMediaHours', choices: ['0-1 hours', '1-3 hours', '3-5 hours', '5-8 hours', 'More than 8 hours'] },
    {
      id: 11,
      question: 'What time do you usually go to sleep?',
      field: 'sleepTime',
      type: 'time'
    },
    { id: 12, question: 'What is your main goal?', field: 'mainGoal', choices: ['Fitness', 'Career', 'Learning', 'Social', 'Other'], allowMultiple: true },
  ];

  const handleInputChange = (field, value, allowMultiple = false) => {
    if (allowMultiple) {
      setAnswers(prev => {
        const currentValues = Array.isArray(prev[field]) ? prev[field] : [];
        const isSelected = currentValues.includes(value);
        return {
          ...prev,
          [field]: isSelected ? currentValues.filter(v => v !== value) : [...currentValues, value]
        };
      });
    } else {
      setAnswers(prev => ({ ...prev, [field]: value }));
    }
  };

  const visibleQuestions = questions.filter(q => !q.condition || q.condition(answers));
  const totalSteps = visibleQuestions.length;
  const currentQuestion = visibleQuestions[currentStep - 1];
  const progress = (currentStep / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps;
  const isMultipleChoice = currentQuestion.allowMultiple === true;
  const currentAnswer = answers[currentQuestion.field];
  const canProceed = isMultipleChoice
    ? Array.isArray(currentAnswer) && currentAnswer.length > 0
    : currentAnswer !== '' && currentAnswer !== null;

  const handleNext = () => { if (currentStep < totalSteps) setCurrentStep(prev => prev + 1); };
  const handlePrevious = () => { if (currentStep > 1) setCurrentStep(prev => prev - 1); };

  const handleFinish = async () => {
    if (!user) {
      console.error('No logged-in user!');
      return;
    }

    // First insert into useranswer table
    const { error } = await supabase.from('useranswer').insert([
      {
        user_id: user.id,
        Smoke: answers.smoke === 'Yes',
        cigarettes_per_day: answers.cigarettesPerDay,
        vape: answers.vape === 'Yes',
        heavy_vape: answers.heavyVape === 'Yes',
        porn_addiction: answers.pornAddiction === 'Yes',
        porn_frequency: answers.pornFrequency,
        sleep_hours: answers.sleepSchedule,
        Overthink: answers.overthink,
        Lazy_tasks: answers.lazyTasks,
        social_media_hours: answers.socialMediaHours,
        main_goal: answers.mainGoal
      }
    ]);

    if (error) {
      console.error('Error saving answers:', error);
      return;
    }

    // Convert sleep time to 24-hour format before storing
    const sleepTime24h = convertTo24Hour(answers.sleepTime);
    
    // Insert into LoggedInAnswers table with converted time
    const { error: errorSleepTime } = await supabase.from('LoggedInAnswers').insert([
      {
        user_id: user.id,
        sleep_time: sleepTime24h // Now in 24-hour format: "22:00:00"
      }
    ]);

    if (errorSleepTime) {
      console.error('Error saving sleepTime in LoggedInAnswers table:', errorSleepTime);
      return;
    }

    // Update First_LogIn to true in Profiles table
    const { error: profileUpdateError } = await supabase
      .from('Profiles')
      .update({ First_LogIn: true })
      .eq('user_id', user.id);

    if (profileUpdateError) {
      console.error('Error updating First_LogIn in Profiles:', profileUpdateError);
      return;
    }

    console.log('Answers saved successfully ✅');
    setShowCelebration(true);
  };

  // Celebration animation
  const confettiPieces = Array.from({ length: 50 }, (_, i) => i);
  const balloons = Array.from({ length: 8 }, (_, i) => i);

  if (showCelebration) {
    return (
      <div className="celebration-container">
        <div className="confetti-wrapper">
          {confettiPieces.map(piece => (
            <div key={piece} className="confetti" style={{
              left: `${(piece * 2) % 100}%`,
              animationDelay: `${piece * 0.1}s`,
              backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#FFD93D'][piece % 8]
            }} />
          ))}
        </div>

        <div className="balloons-wrapper">
          {balloons.map(balloon => (
            <div key={balloon} className="balloon" style={{
              left: `${10 + balloon * 12}%`,
              animationDelay: `${balloon * 0.3}s`,
              backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#FFD93D'][balloon]
            }}>
              <div className="balloon-string"></div>
            </div>
          ))}
        </div>

        <div className="celebration-content">
          <h1 className="celebration-text">Good Job!</h1>
          <p className="celebration-subtext">Your answers were saved!</p>
          <button
            type="button"
            onClick={() => navigate('/Home')}
            className="celebration-button"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-questions-container">
      <div className="user-questions-card">
        <h1 className="questions-title">Tell Us About Yourself</h1>

        <div className="progress-container">
          <div className="progress-bar-wrapper">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">
            Step {currentStep} of {totalSteps} ({Math.round(progress)}%)
          </p>
        </div>

        <div className="question-form">
          <div className="question-header">
            <h2 className="question-text">{currentQuestion.question}</h2>
          </div>

          <div className="input-group">
            {currentQuestion.type === 'time' ? (
              <ModernTimePicker
                value={answers[currentQuestion.field]}
                onChange={(val) => handleInputChange(currentQuestion.field, val)}
              />
            ) : (
              currentQuestion.choices.map(choice => {
                const isSelected = isMultipleChoice
                  ? Array.isArray(currentAnswer) && currentAnswer.includes(choice)
                  : currentAnswer === choice;

                return (
                  <button
                    key={choice}
                    type="button"
                    className={`question-choice ${isSelected ? 'selected' : ''}`}
                    onClick={() =>
                      handleInputChange(currentQuestion.field, choice, isMultipleChoice)
                    }
                  >
                    {choice}
                  </button>
                );
              })
            )}
          </div>

          <div className="button-group">
            {currentStep > 1 && <button type="button" onClick={handlePrevious} className="nav-button previous-button">Previous</button>}
            {!isLastStep
              ? <button type="button" onClick={handleNext} className="nav-button next-button" disabled={!canProceed}>Next</button>
              : <button type="button" onClick={handleFinish} className="nav-button finish-button" disabled={!canProceed}>Finish</button>
            }
          </div>
        </div>

        <div className="step-indicators">
          {visibleQuestions.map((q, index) => (
            <div key={q.id} className={`step-indicator ${currentStep === index + 1 ? 'active' : ''} ${currentStep > index + 1 ? 'completed' : ''}`}>
              <div className="step-number">{q.id}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserQuestions;