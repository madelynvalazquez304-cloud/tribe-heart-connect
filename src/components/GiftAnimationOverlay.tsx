import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FloatingGift {
  id: string;
  icon: string;
  x: number;
  delay: number;
}

interface GiftAnimationOverlayProps {
  creatorId: string;
}

// Celebration sound using Web Audio API
const playSound = (type: 'gift' | 'celebration') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'gift') {
      // Bright sparkle sound
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } else {
      // Celebration chime
      const frequencies = [523.25, 659.25, 783.99, 1046.50];
      frequencies.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.1, audioContext.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.5);
        osc.start(audioContext.currentTime + i * 0.1);
        osc.stop(audioContext.currentTime + i * 0.1 + 0.5);
      });
    }
  } catch (error) {
    console.log('Audio not supported');
  }
};

const GiftAnimationOverlay: React.FC<GiftAnimationOverlayProps> = ({ creatorId }) => {
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  const triggerAnimation = useCallback((icon: string, quantity: number = 1) => {
    // Play sound
    playSound(quantity >= 5 ? 'celebration' : 'gift');
    
    // Create floating gifts
    const newGifts: FloatingGift[] = [];
    const giftCount = Math.min(quantity * 3, 30); // Max 30 icons
    
    for (let i = 0; i < giftCount; i++) {
      newGifts.push({
        id: `${Date.now()}-${i}`,
        icon,
        x: 10 + Math.random() * 80,
        delay: i * 0.08
      });
    }
    
    setFloatingGifts(prev => [...prev, ...newGifts]);
    
    // Show celebration for big gifts
    if (quantity >= 5) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
    
    // Remove gifts after animation
    setTimeout(() => {
      setFloatingGifts(prev => prev.filter(g => !newGifts.find(ng => ng.id === g.id)));
    }, 4000);
  }, []);

  useEffect(() => {
    // Subscribe to real-time gift events
    const channel = supabase
      .channel(`gifts-${creatorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gifts',
          filter: `creator_id=eq.${creatorId}`
        },
        async (payload) => {
          if (payload.new.status === 'completed') {
            // Fetch gift type to get icon
            const { data: giftType } = await supabase
              .from('gift_types')
              .select('icon')
              .eq('id', payload.new.gift_type_id)
              .single();
            
            if (giftType) {
              triggerAnimation(giftType.icon, payload.new.quantity || 1);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gifts',
          filter: `creator_id=eq.${creatorId}`
        },
        async (payload) => {
          if (payload.new.status === 'completed' && payload.old?.status !== 'completed') {
            const { data: giftType } = await supabase
              .from('gift_types')
              .select('icon')
              .eq('id', payload.new.gift_type_id)
              .single();
            
            if (giftType) {
              triggerAnimation(giftType.icon, payload.new.quantity || 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [creatorId, triggerAnimation]);

  if (floatingGifts.length === 0 && !showCelebration) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Floating gifts */}
      {floatingGifts.map((gift) => (
        <div
          key={gift.id}
          className="absolute text-4xl md:text-5xl"
          style={{
            left: `${gift.x}%`,
            bottom: '-60px',
            animation: `giftFloat 3s ease-out forwards`,
            animationDelay: `${gift.delay}s`,
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))'
          }}
        >
          {gift.icon}
        </div>
      ))}
      
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center animate-fade-in">
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white px-8 py-4 rounded-2xl shadow-2xl animate-scale-in">
            <div className="text-center">
              <div className="text-4xl mb-2">🎉✨🎊</div>
              <div className="text-xl font-bold">Amazing Gift!</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Sparkle particles */}
      {floatingGifts.length > 0 && (
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${30 + Math.random() * 50}%`,
                animation: `sparkle 1.5s ease-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes giftFloat {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          20% {
            transform: translateY(-20vh) scale(1.2) rotate(15deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-120vh) scale(1.5) rotate(-30deg);
            opacity: 0;
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default GiftAnimationOverlay;
