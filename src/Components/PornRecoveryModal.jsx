import React, { useState, useEffect } from 'react';
import { Heart, Zap, Wind, Dumbbell, Focus, X } from 'lucide-react';
import supabase from '../SupabaseClient';

function PornRecoveryModal({ isOpen, onClose, recoveryData, onLogRelapse, onLogWin, userId }) {
    const [selectedTrigger, setSelectedTrigger] = useState(null);
    const [showBreathingExercise, setShowBreathingExercise] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bestStreak, setBestStreak] = useState(recoveryData.bestStreak);

    // Sync bestStreak with parent prop when modal opens
    useEffect(() => {
        if (isOpen) {
            setBestStreak(recoveryData.bestStreak);
        }
    }, [isOpen, recoveryData.bestStreak]);

    // Log recovery action to database
    const RecoveryLogs = async (type) => {
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;

            const { data, error } = await supabase
                .from('RecoveryLogs')
                .insert([
                    {
                        UID: userData.user.id,
                        TriggerID: selectedTrigger || null,
                        Resisted_Urge: type
                    }
                ]);

            if (error) {
                console.error('Error logging recovery action:', error.message);
            } else {
                console.log('Recovery action logged successfully:', data);
            }
        } catch (err) {
            console.error('Unexpected error logging recovery action:', err);
        }
    };

    if (!isOpen) return null;

    const triggers = [
        { id: 'stress', label: 'Stress', icon: '😰' },
        { id: 'boredom', label: 'Boredom', icon: '😑' },
        { id: 'late-night', label: 'Late night', icon: '🌙' },
        { id: 'social-media', label: 'Social media', icon: '📱' },
        { id: 'loneliness', label: 'Loneliness', icon: '😔' }
    ];

    const handleBreakStreak = async () => {
        const today = new Date().toISOString().split('T')[0];

        // Check if already logged a loss today
        const { data: existingLoss, error } = await supabase
            .from('RecoveryLogs')
            .select('id')
            .eq('UID', userId)
            .eq('Resisted_Urge', 'loss')
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`)
            .maybeSingle();

        if (error) {
            console.error('Error checking existing loss:', error);
            return;
        }

        if (existingLoss) {
            alert("You already logged a streak break today");
            return;
        }

        // No loss logged today → allow
        RecoveryLogs('loss');
        // 2️⃣ Decrease points safely using RPC
        const { error: decrementError } = await supabase.rpc(
            'decrement_user_points',
            {
                user_id_input: userId,
                points_to_remove: 10
            }
        );

        if (decrementError) {
            console.error("Error decreasing points:", decrementError);
            return;
        }
        onLogRelapse(selectedTrigger);
        setSelectedTrigger(null);
    };

    const handleResistUrge = async () => {
        if (isSubmitting) return;

        const confirmed = window.confirm(
            "You can only log a win once per day.\n\nAre you sure you kept the streak today?"
        );

        if (!confirmed) return;

        setIsSubmitting(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // Check if already logged a win today
            const { data: existingWin, error } = await supabase
                .from('RecoveryLogs')
                .select('id')
                .eq('UID', userId)
                .eq('Resisted_Urge', 'win')
                .gte('created_at', `${today}T00:00:00`)
                .lte('created_at', `${today}T23:59:59`)
                .maybeSingle();

            if (error) {
                console.error('Error checking existing win:', error);
                // Optional: Show toast
                return;
            }

            // If existingWin is not null, it means a win was already logged
            if (existingWin) {
                alert("You already logged a win today 💪");
                return;
            }

            // 1. Log recovery action
            await RecoveryLogs('win');

            // 2. Increment points safely using RPC
            const { error: incrementError } = await supabase
                .rpc('increment_user_points', {
                    user_id_input: userId,
                    points_to_add: 10
                });

            if (incrementError) {
                console.error("Error updating points:", incrementError);
            }

            // 3. Increment current streak via RPC
            const { error: streakError } = await supabase
                .rpc('increment_current_streak', {
                    p_user_id: userId
                });

            if (streakError) {
                console.error("Error incrementing streak:", streakError);
            }
            const { error: bestStreakError } = await supabase.rpc('update_best_streak', {
                p_user_id: userId
            });
            if (bestStreakError) {
                console.error("Error updating best streak:", bestStreakError);
            }
            const { data: updatedUser, error: fetchError } = await supabase
                .from('Profiles')
                .select('current_streak, best_streak')
                .eq('user_id', userId)
                .single();
            if (!fetchError && updatedUser) {

                setBestStreak(updatedUser.best_streak);
            }
            console.log(bestStreak);

            // 4. Update parent state (streak + points)
            onLogWin(selectedTrigger);
            setSelectedTrigger(null);

        } catch (err) {
            console.error("Unexpected error in handleResistUrge:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBreathingReset = () => {
        setShowBreathingExercise(true);
        setTimeout(() => setShowBreathingExercise(false), 30000); // Auto-close after 30 seconds
    };

    return (
        <div
            style={{
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
                backdropFilter: 'blur(8px)',
                animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={onClose}
        >
            <div
                className="glass-card"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '90%',
                    maxWidth: '550px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '2.5rem',
                    position: 'relative',
                    animation: 'slideUp 0.3s ease-out'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem',
                        background: 'rgba(0,0,0,0.05)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        color: 'var(--text-muted)'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(0,0,0,0.1)';
                        e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(0,0,0,0.05)';
                        e.target.style.transform = 'scale(1)';
                    }}
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto',
                        boxShadow: '0 8px 16px rgba(236, 72, 153, 0.3)'
                    }}>
                        <Heart size={32} color="white" fill="white" />
                    </div>
                    <h3 style={{
                        fontSize: '1.75rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        color: 'var(--text-dark)'
                    }}>
                        Porn Recovery
                    </h3>
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.95rem',
                        lineHeight: '1.5'
                    }}>
                        Every moment is a chance to choose yourself
                    </p>
                </div>

                {/* User Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                        padding: '1.25rem',
                        borderRadius: '16px',
                        textAlign: 'center',
                        border: '1px solid rgba(236, 72, 153, 0.15)'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            Current Streak
                        </div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#ec4899' }}>
                            {recoveryData.currentStreak}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>days</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
                        padding: '1.25rem',
                        borderRadius: '16px',
                        textAlign: 'center',
                        border: '1px solid rgba(139, 92, 246, 0.15)'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            Best Streak
                        </div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                            {bestStreak}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>days</div>
                    </div>
                </div>

                {/* Time Since Last */}
                {recoveryData.lastRelapse && (
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        padding: '1rem',
                        borderRadius: '12px',
                        marginBottom: '2rem',
                        textAlign: 'center',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Time since last reset: <strong style={{ color: '#10b981' }}>{recoveryData.lastRelapse}</strong>
                        </div>
                    </div>
                )}

                {/* Main Actions */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <button
                        onClick={handleBreakStreak}
                        style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '1rem 1.5rem',
                            borderRadius: '12px',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                        }}
                    >
                        I broke the streak
                    </button>
                    <button
                        onClick={handleResistUrge}
                        style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '1rem 1.5rem',
                            borderRadius: '12px',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                        }}
                    >
                        I resisted the urge
                    </button>
                </div>

                {/* Trigger Reflection */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: 'var(--text-dark)',
                        marginBottom: '1rem'
                    }}>
                        What triggered the urge?
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {triggers.map((trigger) => (
                            <button
                                key={trigger.id}
                                onClick={() => setSelectedTrigger(trigger.id)}
                                style={{
                                    background: selectedTrigger === trigger.id
                                        ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'
                                        : 'rgba(0,0,0,0.03)',
                                    color: selectedTrigger === trigger.id ? 'white' : 'var(--text-dark)',
                                    border: selectedTrigger === trigger.id
                                        ? '2px solid transparent'
                                        : '2px solid rgba(0,0,0,0.08)',
                                    padding: '0.75rem 1.25rem',
                                    borderRadius: '10px',
                                    fontWeight: '500',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedTrigger !== trigger.id) {
                                        e.target.style.background = 'rgba(0,0,0,0.06)';
                                        e.target.style.transform = 'translateY(-2px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedTrigger !== trigger.id) {
                                        e.target.style.background = 'rgba(0,0,0,0.03)';
                                        e.target.style.transform = 'translateY(0)';
                                    }
                                }}
                            >
                                <span>{trigger.icon}</span>
                                <span>{trigger.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Support Section */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: 'var(--text-dark)',
                        marginBottom: '1rem'
                    }}>
                        Quick Support
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <button
                            onClick={handleBreathingReset}
                            style={{
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                padding: '1rem',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-4px)';
                                e.target.style.boxShadow = '0 8px 16px rgba(99, 102, 241, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <Wind size={24} color="#6366f1" />
                            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-dark)', textAlign: 'center' }}>
                                30s Breathing
                            </span>
                        </button>
                        <button
                            style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                padding: '1rem',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-4px)';
                                e.target.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <Dumbbell size={24} color="#10b981" />
                            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-dark)', textAlign: 'center' }}>
                                Physical Reset
                            </span>
                        </button>
                        <button
                            style={{
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                padding: '1rem',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-4px)';
                                e.target.style.boxShadow = '0 8px 16px rgba(245, 158, 11, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <Zap size={24} color="#f59e0b" />
                            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-dark)', textAlign: 'center' }}>
                                Focus Block
                            </span>
                        </button>
                    </div>
                </div>

                {/* Breathing Exercise Overlay */}
                {showBreathingExercise && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%)',
                        borderRadius: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        padding: '2rem',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <Wind size={64} style={{ marginBottom: '2rem', animation: 'pulse 2s ease-in-out infinite' }} />
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Breathe with me</h3>
                        <p style={{ fontSize: '1rem', textAlign: 'center', lineHeight: '1.6', maxWidth: '400px' }}>
                            Inhale slowly for 4 seconds... Hold for 4 seconds... Exhale for 4 seconds... You've got this.
                        </p>
                        <button
                            onClick={() => setShowBreathingExercise(false)}
                            style={{
                                marginTop: '2rem',
                                background: 'rgba(255,255,255,0.2)',
                                border: '2px solid white',
                                color: 'white',
                                padding: '0.75rem 2rem',
                                borderRadius: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.2)';
                            }}
                        >
                            Close
                        </button>
                    </div>
                )}

                {/* Motivational Message */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: '1px solid rgba(236, 72, 153, 0.15)'
                }}>
                    <p style={{
                        margin: 0,
                        color: 'var(--text-dark)',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        lineHeight: '1.6'
                    }}>
                        💪 Progress isn't perfect, it's persistent. Keep going.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default PornRecoveryModal;