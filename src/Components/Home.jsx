import React, { useState, useEffect } from 'react';
import '../Css/Home.css';
import supabase from '../SupabaseClient';
import PornRecoveryModal from './PornRecoveryModal';
import {
    LayoutDashboard,
    ListTodo,
    BarChart2,
    Users,
    Settings,
    Flame,
    Play,
    Cigarette,
    Moon,
    Heart
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

function Home() {
    const [user, setUser] = useState(null);
    const [cigarettesPerDay, setCigarettesPerDay] = useState(null);
    const [cigarettesLogged, setCigarettesLogged] = useState(0);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [isSmoker, setIsSmoker] = useState(false);
    const [userName, setUserName] = useState('');
    const [showSmokingModal, setShowSmokingModal] = useState(false);
    const [showPornRecoveryModal, setShowPornRecoveryModal] = useState(false);
    const [pornRecoveryData, setPornRecoveryData] = useState({
        currentStreak: 0,
        bestStreak: 0,
        lastRelapse: '0 days ago'
    });
    const [dayJourney, setDayJourney] = useState(null);
    const [userPoints, setUserPoints] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);

    // Timer state
    const [timerDisplay, setTimerDisplay] = useState('00:00:00'); // HH:MM:SS
    const [awakeDurationMs, setAwakeDurationMs] = useState(null);
    const [nextCigaretteTime, setNextCigaretteTime] = useState(null); // Timestamp when next cig is allowed

    // Helper: convert TIME string (HH:MM:SS) to Date object with today's date
    const timeStringToDate = (timeString, baseDate = new Date()) => {
        const [hours, minutes, seconds] = timeString.split(':').map(Number);
        const date = new Date(baseDate);
        date.setHours(hours, minutes, seconds || 0, 0);
        return date;
    };

    const getAwakeDurationMs = (firstCigTime, sleepTime) => {
        // Both are now TIME format (HH:MM:SS)
        const today = new Date();
        const firstCig = timeStringToDate(firstCigTime, today);
        const sleep = timeStringToDate(sleepTime, today);

        if (isNaN(firstCig) || isNaN(sleep)) return 0;

        // If sleep time is before first cig time, assume it's the next day
        if (sleep <= firstCig) sleep.setDate(sleep.getDate() + 1);

        return sleep - firstCig; // ms
    };

    // Format ms → HH:MM:SS
    const formatMsToHMS = (ms) => {
        if (ms <= 0) return '00:00:00';
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error.message);
        } else {
            window.location.href = '/SignUp';
        }
    };

    // Clear next_cigarette_time in DB helper
    const clearNextCigaretteTimeInDB = async () => {
        if (!user?.id) return;
        try {
            await supabase
                .from('LoggedInAnswers')
                .update({ next_cigarette_time: null })
                .eq('user_id', user.id);
            console.log('Cleared next_cigarette_time in DB');
        } catch (err) {
            console.error('Error clearing next_cigarette_time:', err);
        }
    };

    // Countdown effect - updates every second
    useEffect(() => {
        if (!nextCigaretteTime) {
            setTimerDisplay('00:00:00');
            return;
        }

        const updateTimer = () => {
            const now = new Date().getTime();
            const remaining = nextCigaretteTime - now;

            if (remaining <= 0) {
                setTimerDisplay('00:00:00');
                setNextCigaretteTime(null);
                clearNextCigaretteTimeInDB();
                return;
            }

            setTimerDisplay(formatMsToHMS(remaining));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [nextCigaretteTime]);

    const fetchAwakeDuration = async () => {
        if (!user || !cigarettesPerDay) return;

        try {
            const { data, error } = await supabase
                .from('LoggedInAnswers')
                .select('first_cig_time, sleep_time, next_cigarette_time')
                .eq('user_id', user.id)
                .limit(1)
                .single();

            if (error) {
                console.error('Error fetching times:', error);
                return;
            }

            if (!data?.first_cig_time || !data?.sleep_time) {
                console.log('Missing first_cig_time or sleep_time');
                return;
            }

            const awakeDuration = getAwakeDurationMs(data.first_cig_time, data.sleep_time);
               console.log('Calculated awake duration (ms):', awakeDuration);
            setAwakeDurationMs(awakeDuration);
         

            // If there's a next_cigarette_time stored, use it
            // AFTER
            if (data.next_cigarette_time) {
                const nextTime = new Date(data.next_cigarette_time).getTime();
                const now = new Date().getTime();

                if (nextTime > now) {
                    // Timer is still in the future — load it
                    setNextCigaretteTime(nextTime);
                    console.log('Loaded next cigarette time from DB:', new Date(nextTime).toLocaleTimeString());
                } else {
                    // Timer already expired — clear from DB and show 00:00:00
                    setNextCigaretteTime(null);
                    clearNextCigaretteTimeInDB();
                    console.log('Next cigarette time already passed — cleared from DB');
                }
            } else {
                // No saved time at all — don't start a countdown yet
                setNextCigaretteTime(null);
            }
        } catch (err) {
            console.error('Unexpected error fetching awake duration:', err);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            // 1. Get Session
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
                return;
            }

            if (session?.user) {
                setUser(session.user);

                // Fetch user name from profiles
                try {
                    const { data: profileData, error: profileError } = await supabase
                        .from('Profiles')
                        .select('Name, Day_journey, User_points, Current_Streak, best_streak')
                        .eq('user_id', session.user.id)
                        .single();

                    if (profileError) {
                        console.error('Error fetching profile:', profileError);
                    } else if (profileData) {
                        setUserName(profileData.Name);
                        setDayJourney(profileData.Day_journey || 1);
                        setUserPoints(profileData.User_points || 0);
                        const streak = profileData.Current_Streak || 0;
                        const bestStreak = profileData.best_streak || 0;
                        setCurrentStreak(streak);
                        setPornRecoveryData(prev => ({
                            ...prev,
                            currentStreak: streak,
                            bestStreak: bestStreak
                        }));
                    }
                } catch (err) {
                    console.error('Unexpected error fetching profile:', err);
                }

                // 2. Get Smoking Data
                try {
                    const { data, error: dbError } = await supabase
                        .from('useranswer')
                        .select('cigarettes_per_day, Smoke')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    if (dbError) {
                        console.error('Error fetching smoking data:', dbError);
                    } else if (data) {
                        if (data.cigarettes_per_day) {
                            const numberValue = mapCigarettesTextToNumber(data.cigarettes_per_day);
                            setCigarettesPerDay(numberValue);
                        }
                        setIsSmoker(data.Smoke === true);
                    }
                } catch (err) {
                    console.error('Unexpected error fetching user data:', err);
                }

                // 3. Get logged cigarettes
                try {
                    const { data, error: logError } = await supabase
                        .from('LoggedInAnswers')
                        .select('cigarettes_logged')
                        .eq('user_id', session.user.id)
                        .limit(1);

                    if (logError) {
                        console.error('Error fetching logged cigarettes data:', logError);
                    } else if (data && data.length > 0) {
                        setCigarettesLogged(data[0].cigarettes_logged);
                    }
                } catch (err) {
                    console.error('Unexpected error fetching logged cigarettes data:', err);
                }
            }
        };

        fetchData();
    }, []);

    // Fetch awake duration when user and cigarettesPerDay are available
    useEffect(() => {
        if (user && cigarettesPerDay) {
            fetchAwakeDuration();
        }
    }, [user, cigarettesPerDay]);

    const mapCigarettesTextToNumber = (text) => {
        switch (text) {
            case '1-5': return 3;
            case '6-10': return 5;
            case '11-20': return 12;
            case '20+': return 16;
            default: return 0;
        }
    };

    const handleLogCigarette = async () => {
        if (!cigarettesPerDay || !user) return;

        if (cigarettesLogged + 1 >= cigarettesPerDay) {
            setShowLimitModal(true);
        }

        const newCount = (cigarettesLogged || 0) + 1;
        setCigarettesLogged(newCount);

        try {
            const { data: existingRows, error: fetchError } = await supabase
                .from('LoggedInAnswers')
                .select('user_id, id, first_cig_time, sleep_time')
                .eq('user_id', user.id);

            if (fetchError) throw fetchError;

            let error;
            const now = new Date();
            const timeString = now.toTimeString().split(' ')[0]; // "HH:MM:SS"

            // Calculate next cigarette time
            let nextCigTime = null;
            let currentAwakeDuration = awakeDurationMs;

            // If awakeDurationMs is not set yet, calculate it from existing data
            if (!currentAwakeDuration && existingRows && existingRows.length > 0) {
                const row = existingRows[0];
                if (row.first_cig_time && row.sleep_time) {
                    currentAwakeDuration = getAwakeDurationMs(row.first_cig_time, row.sleep_time);
                    setAwakeDurationMs(currentAwakeDuration);
                }
            }

            if (currentAwakeDuration && cigarettesPerDay) {
                const msBetweenCigs = currentAwakeDuration / cigarettesPerDay;
                const nextTimestamp = new Date().getTime() + msBetweenCigs;
                nextCigTime = new Date(nextTimestamp).toISOString();

                setNextCigaretteTime(nextTimestamp);
                console.log('Timer set for:', formatMsToHMS(msBetweenCigs));
                console.log('Next cigarette at:', new Date(nextTimestamp).toLocaleTimeString());
            } else {
                console.log('Cannot calculate next cigarette time - missing awake duration or cigarettes per day');
            }

            if (existingRows && existingRows.length > 0) {
                const targetId = existingRows[0].id;

                const updateData = { cigarettes_logged: newCount };
                if (newCount === 1) {
                    updateData.first_cig_time = timeString;
                }
                if (nextCigTime) {
                    updateData.next_cigarette_time = nextCigTime;
                }

                const { error: updateError } = await supabase
                    .from('LoggedInAnswers')
                    .update(updateData)
                    .eq('id', targetId);

                error = updateError;

                if (existingRows.length > 1) {
                    const idsToDelete = existingRows.slice(1).map(r => r.id);
                    await supabase.from('LoggedInAnswers').delete().in('id', idsToDelete);
                }

            } else {
                const insertData = { user_id: user.id, cigarettes_logged: newCount };
                if (newCount === 1) insertData.first_cig_time = timeString;
                if (nextCigTime) insertData.next_cigarette_time = nextCigTime;

                const { error: insertError } = await supabase
                    .from('LoggedInAnswers')
                    .insert([insertData]);

                error = insertError;
            }

            if (error) {
                console.error('Error saving to Supabase:', error);
                setCigarettesLogged(cigarettesLogged);
            } else {
                console.log('Cigarette logged successfully:', newCount);
            }
        } catch (err) {
            console.error('Unexpected error logging cigarette:', err);
            setCigarettesLogged(cigarettesLogged);
        }
    };

    const progress = cigarettesPerDay ? (cigarettesLogged / cigarettesPerDay) * 100 : 0;
    const cigarettesLeft = cigarettesPerDay ? cigarettesPerDay - cigarettesLogged : 0;

    // Porn Recovery Handlers
    const handleLogRelapse = async (trigger) => {
        console.log('Logged relapse with trigger:', trigger);

        // Fetch updated data from database
        if (user?.id) {
            const { data: profileData, error } = await supabase
                .from('Profiles')
                .select('Current_Streak, best_streak, User_points')
                .eq('user_id', user.id)
                .single();

            if (!error && profileData) {
                setCurrentStreak(profileData.Current_Streak || 0);
                setUserPoints(profileData.User_points || 0);
                setPornRecoveryData(prev => ({
                    ...prev,
                    currentStreak: profileData.Current_Streak || 0,
                    bestStreak: profileData.best_streak || 0,
                    lastRelapse: 'Just now'
                }));
            }
        }

        setShowPornRecoveryModal(false);
    };

    const handleLogWin = async (trigger) => {
        console.log('Logged win with trigger:', trigger);

        // Fetch updated streak data from database
        if (user?.id) {
            const { data: profileData, error } = await supabase
                .from('Profiles')
                .select('Current_Streak, best_streak, User_points')
                .eq('user_id', user.id)
                .single();

            if (!error && profileData) {
                setCurrentStreak(profileData.Current_Streak || 0);
                setUserPoints(profileData.User_points || 0);
                setPornRecoveryData(prev => ({
                    ...prev,
                    currentStreak: profileData.Current_Streak || 0,
                    bestStreak: profileData.best_streak || 0
                }));
            }
        }

        setShowPornRecoveryModal(false);
    };

    // Mock Data for Charts
    const habitTrendData = [
        { day: 'Mon', completion: 60 },
        { day: 'Tue', completion: 75 },
        { day: 'Wed', completion: 65 },
        { day: 'Thu', completion: 85 },
        { day: 'Fri', completion: 80 },
        { day: 'Sat', completion: 90 },
        { day: 'Sun', completion: 95 },
    ];

    const sleepData = [
        { time: '22:00', deep: 10 },
        { time: '23:00', deep: 30 },
        { time: '00:00', deep: 60 },
        { time: '01:00', deep: 50 },
        { time: '02:00', deep: 80 },
        { time: '03:00', deep: 70 },
        { time: '04:00', deep: 40 },
        { time: '05:00', deep: 20 },
        { time: '06:00', deep: 10 },
    ];

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="brand-logo">
                    <div style={{ width: 20, height: 20, background: '#4f46e5', borderRadius: 4 }}></div>
                    FocusApp
                </div>

                <nav className="nav-menu">
                    <div className="nav-item active">
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </div>
                    <div className="nav-item">
                        <ListTodo size={20} />
                        <span>My Habits</span>
                    </div>
                    <div className="nav-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>
                        <Flame size={20} />
                        <span>Logout</span>
                    </div>
                    <div className="nav-item">
                        <BarChart2 size={20} />
                        <span>Progress Reports</span>
                    </div>
                    <div className="nav-item">
                        <Users size={20} />
                        <span>Community</span>
                    </div>
                    <div style={{ marginTop: 'auto' }}>
                        <div className="nav-item">
                            <Settings size={20} />
                            <span>Settings</span>
                        </div>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="dashboard-header">
                    <div className="welcome-text">
                        <p className="welcome-greeting">Welcome, {userName || user?.user_metadata?.first_name || 'Alex'}</p>
                        <h1 className="welcome-headline">
                            Day <span className="welcome-day">{dayJourney}</span> in your journey
                        </h1>
                        <p className="welcome-quote">"Excellence is not an act, but a habit." — Aristotle</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        {/* Points Display */}
                        <div className="points-display" style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '0.5rem 1rem',
                            borderRadius: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(8px)'
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>🏆</span>
                            <span style={{
                                fontWeight: '700',
                                color: '#ce4db4', // Amber-400 for dark theme visibility
                                fontSize: '1.1rem'
                            }}>
                                {userPoints}
                            </span>
                            <span style={{
                                fontSize: '0.85rem',
                                color: '#94a3b8', // Slate-400
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                PTS
                            </span>
                        </div>

                        <div className="user-profile">
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '600',
                                color: '#ffffff',
                                fontSize: '1.125rem'
                            }}>
                                {user?.email?.charAt(0).toUpperCase() || 'A'}
                            </div>
                        </div>
                    </div>
                </header >

                <div className="dashboard-grid">
                    {isSmoker && (
                        <div className="glass-card stat-card" onClick={() => setShowSmokingModal(true)} style={{ cursor: 'pointer' }}>
                            <div className="section-title">
                                <span>Smoking Reduction</span>
                                <Cigarette size={18} className="text-muted" />
                            </div>
                            <div className="smoking-tracker-content">
                                <div className="circular-progress-container">
                                    <svg viewBox="0 0 36 36" className="circular-chart">
                                        <path className="circle-bg"
                                            d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <path className="circle-progress"
                                            strokeDasharray={`${progress}, 100`}
                                            d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                    <div className="circle-text">
                                        <div>{cigarettesLeft} left</div>
                                    </div>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#64748b' }}>
                                        Daily Limit: {cigarettesPerDay || 0}
                                    </p>
                                    <button className="log-btn" onClick={(e) => {
                                        e.stopPropagation();
                                        handleLogCigarette();
                                    }} style={{
                                        backgroundColor: cigarettesLogged >= cigarettesPerDay ? 'red' : '#4f46e5',
                                        cursor: 'pointer'
                                    }}>
                                        Log Cigarette {cigarettesLogged >= cigarettesPerDay && '⚠️'}
                                    </button>
                                </div>
                            </div>
                        </div>)}

                    {/* Porn Recovery */}
                    <div className="glass-card stat-card" onClick={() => setShowPornRecoveryModal(true)} style={{ cursor: 'pointer' }}>
                        <div className="section-title">
                            <span>Porn Recovery</span>
                            <Heart size={18} className="text-muted" />
                        </div>
                        <div className="streak-container">
                            <div style={{
                                width: '64px',
                                height: '64px',
                                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1rem',
                                boxShadow: '0 8px 16px rgba(236, 72, 153, 0.3)'
                            }}>
                                <Heart size={32} color="white" fill="white" />
                            </div>
                            <div className="clean-days">{pornRecoveryData.currentStreak}</div>
                            <div className="streak-label">Days Strong</div>
                        </div>
                    </div>

                    {/* Sleep Monitor */}
                    <div className="glass-card stat-card">
                        <div className="section-title">
                            <span>Sleep Monitor</span>
                            <Moon size={18} className="text-muted" />
                        </div>
                        <div style={{ height: '120px', width: '100%', marginTop: 'auto' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sleepData}>
                                    <Area type="monotone" dataKey="deep" stroke="#4f46e5" fill="#e0e7ff" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                            <span style={{ color: '#64748b' }}>Goal: 8h</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>6h 45m</span>
                        </div>
                    </div>

                    {/* Habit Trend Chart */}
                    <div className="glass-card large-card">
                        <div className="section-title">
                            <span>Weekly Habit Trend</span>
                            <BarChart2 size={18} className="text-muted" />
                        </div>
                        <div style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={habitTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            borderRadius: '8px',
                                            border: '1px solid #334155',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
                                            color: '#f1f5f9'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="completion"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#1e293b' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Mental Health / Guided Meditation */}
                    <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div className="section-title">
                            <span>Guided Meditation</span>
                        </div>
                        <div className="meditation-grid">
                            <div className="media-thumbnail">
                                <img src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="Meditation" />
                                <div className="play-overlay"><Play size={24} fill="currentColor" /></div>
                                <div className="media-title">Morning Calm</div>
                            </div>
                            <div className="media-thumbnail">
                                <img src="https://images.unsplash.com/photo-1499209974431-276138d35922?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="Meditation" />
                                <div className="play-overlay"><Play size={24} fill="currentColor" /></div>
                                <div className="media-title">Anxiety Relief</div>
                            </div>
                        </div>
                    </div>

                </div>
            </main >

            {/* Limit Modal */}
            {
                showLimitModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        backdropFilter: 'blur(5px)'
                    }}>
                        <div className="glass-card" style={{
                            width: '90%',
                            maxWidth: '500px',
                            padding: '2rem',
                            textAlign: 'center',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1rem auto'
                                }}>
                                    <span style={{ fontSize: '30px' }}>⚠️</span>
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-dark)' }}>Daily Limit Reached</h3>
                                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    You have reached the limits of cigarettes today. Try to not smoke another one for a better self control.
                                </p>
                                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginTop: '1rem', fontStyle: 'italic' }}>
                                    If you fail, don't lie and log how many cigarettes you smoked on top of the limits.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowLimitModal(false)}
                                style={{
                                    backgroundColor: 'var(--indigo-blue)',
                                    color: 'white',
                                    padding: '0.75rem 2rem',
                                    borderRadius: '0.5rem',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer',
                                    width: '100%',
                                    transition: 'transform 0.1s'
                                }}
                            >
                                I Understand
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Porn Recovery Modal */}
            <PornRecoveryModal
                isOpen={showPornRecoveryModal}
                onClose={() => setShowPornRecoveryModal(false)}
                recoveryData={pornRecoveryData}
                onLogRelapse={handleLogRelapse}
                onLogWin={handleLogWin}
                userId={user?.id}
            />

            {/* Smoking Details Modal */}
            {
                showSmokingModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(5px)'
                    }} onClick={() => setShowSmokingModal(false)}>
                        <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{
                            width: '90%',
                            maxWidth: '500px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '2rem',
                            textAlign: 'center',
                            position: 'relative'
                        }}>
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Smoking Tracker</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Daily Progress</p>
                                <div style={{ marginTop: '1.5rem' }}>
                                    <img src="/images/Inhale.png" alt="Inhale" style={{ width: '120px', height: 'auto', marginBottom: '1rem', borderRadius: '8px' }} />
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                                        padding: '1.25rem',
                                        borderRadius: '16px',
                                        borderLeft: '4px solid var(--indigo-blue)',
                                        textAlign: 'left',
                                        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)'
                                    }}>
                                        <p style={{
                                            color: 'var(--text-dark)',
                                            fontWeight: '500',
                                            lineHeight: '1.6',
                                            fontSize: '0.95rem',
                                            margin: 0
                                        }}>
                                            Take a moment to inhale slowly and deeply. Breathe in gently through your nose, feeling your lungs expand as you count to four. Hold the breath for a brief moment, then exhale slowly through your mouth, letting your body relax. Focusing on slow, mindful breaths helps you stay calm and aware, making each cigarette less automatic and giving you control over your habit.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Timer Display */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                padding: '1.5rem',
                                borderRadius: '16px',
                                marginBottom: '2rem',
                                border: '1px solid rgba(79, 70, 229, 0.2)',
                                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.1)'
                            }}>
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '0.75rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    fontWeight: '600'
                                }}>
                                    ⏱️ Time Until Next Cigarette
                                </div>
                                <div style={{
                                    fontSize: '3rem',
                                    fontWeight: 'bold',
                                    color: timerDisplay === '00:00:00' ? '#10b981' : 'var(--indigo-blue)',
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.1em'
                                }}>
                                    {timerDisplay}
                                </div>
                                {timerDisplay === '00:00:00' && (
                                    <div style={{
                                        marginTop: '0.5rem',
                                        color: '#10b981',
                                        fontSize: '0.9rem',
                                        fontWeight: '600'
                                    }}>
                                        ✓ Ready for next cigarette
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                                <div className="circular-progress-container" style={{ width: '180px', height: '180px' }}>
                                    <svg viewBox="0 0 36 36" className="circular-chart">
                                        <path className="circle-bg"
                                            d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <path className="circle-progress"
                                            strokeDasharray={`${progress}, 100`}
                                            d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                    <div className="circle-text">
                                        <div style={{ fontSize: '2rem' }}>{cigarettesLeft}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Cigarettes Left</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Logged</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-dark)' }}>{cigarettesLogged}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Limit</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-dark)' }}>{cigarettesPerDay}</div>
                                </div>
                            </div>

                            <button className="log-btn" onClick={handleLogCigarette} style={{
                                backgroundColor: cigarettesLogged >= cigarettesPerDay ? 'var(--danger)' : 'var(--indigo-blue)',
                                fontSize: '1.1rem',
                                padding: '1rem'
                            }}>
                                Log a Cigarette {cigarettesLogged >= cigarettesPerDay && '⚠️'}
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default Home;