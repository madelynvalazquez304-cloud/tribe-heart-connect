import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trophy, Crown, Medal, Star, Vote, Loader2, Phone, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import PaymentProcessingModal, { PaymentStatus } from './PaymentProcessingModal';

interface CreatorAwardsSectionProps {
  creatorId: string;
  creatorName: string;
  themeColor?: string;
}

const CreatorAwardsSection: React.FC<CreatorAwardsSectionProps> = ({ creatorId, creatorName, themeColor = '#E07B4C' }) => {
  const [selectedNominee, setSelectedNominee] = useState<any>(null);
  const [voteCount, setVoteCount] = useState('1');
  const [voterPhone, setVoterPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [recordId, setRecordId] = useState('');

  // Fetch nominations for this creator
  const { data: nominations, isLoading } = useQuery({
    queryKey: ['creator-nominations', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('award_nominees')
        .select(`
          *,
          award:award_categories(id, name, slug, icon, vote_fee, is_active, voting_starts_at, voting_ends_at)
        `)
        .eq('creator_id', creatorId);
      
      if (error) throw error;
      return data?.filter(n => n.award?.is_active) || [];
    },
    enabled: !!creatorId
  });

  const castVote = useMutation({
    mutationFn: async () => {
      if (!selectedNominee || !voterPhone) {
        throw new Error('Phone number is required');
      }

      const votes = parseInt(voteCount) || 1;
      const fee = selectedNominee.award?.vote_fee || 15;
      const totalAmount = votes * fee;

      const response = await supabase.functions.invoke('mpesa-stk', {
        body: {
          phone: voterPhone,
          amount: totalAmount,
          creatorId,
          type: 'vote',
          referenceId: selectedNominee.id,
          quantity: votes
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      setRecordId(data.recordId);
      setPaymentStatus('polling');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPaymentStatus('idle');
    }
  });

  const handleVote = () => {
    if (!voterPhone) {
      toast.error('Phone number is required');
      return;
    }
    setPaymentStatus('processing');
    castVote.mutate();
  };

  const resetVote = () => {
    setSelectedNominee(null);
    setVoteCount('1');
    setVoterPhone('');
    setPaymentStatus('idle');
    setRecordId('');
  };

  const getVotingStatus = (award: any) => {
    const now = new Date();
    const start = award.voting_starts_at ? new Date(award.voting_starts_at) : null;
    const end = award.voting_ends_at ? new Date(award.voting_ends_at) : null;
    if (!start || !end) return { status: 'open', label: 'Open', canVote: true };
    if (now < start) return { status: 'upcoming', label: 'Coming Soon', canVote: false };
    if (now > end) return { status: 'ended', label: 'Ended', canVote: false };
    return { status: 'live', label: '🔴 Live', canVote: true };
  };

  if (isLoading || !nominations || nominations.length === 0) return null;

  const votes = parseInt(voteCount) || 1;
  const voteFee = selectedNominee?.award?.vote_fee || 15;
  const totalAmount = votes * voteFee;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="h-1" style={{ backgroundColor: themeColor }} />
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5" style={{ color: themeColor }} />
            <h3 className="font-semibold">Awards & Nominations</h3>
            <Badge variant="secondary">{nominations.length}</Badge>
          </div>

          <div className="space-y-3">
            {nominations.map((nomination) => {
              const award = nomination.award;
              const votingStatus = getVotingStatus(award);
              const RankIcon = nomination.total_votes > 100 ? Crown : nomination.total_votes > 50 ? Medal : Star;
              
              return (
                <div 
                  key={nomination.id} 
                  className="rounded-xl border p-4 hover:shadow-md transition-all bg-gradient-to-r from-background to-secondary/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${themeColor}15` }}
                      >
                        {award?.icon || '🏆'}
                      </div>
                      <div>
                        <h4 className="font-semibold">{award?.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={votingStatus.status === 'live' ? 'default' : 'outline'}
                            className={votingStatus.status === 'live' ? 'bg-red-600 text-white' : votingStatus.status === 'ended' ? '' : 'text-amber-600 border-amber-600'}
                          >
                            {votingStatus.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Vote className="w-3 h-3" />
                            KSh {award?.vote_fee || 15}/vote
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <RankIcon className="w-4 h-4" style={{ color: themeColor }} />
                        <span className="font-bold text-lg">{nomination.total_votes || 0}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">votes</span>
                    </div>
                  </div>

                  {votingStatus.canVote && (
                    <Button
                      className="w-full mt-3 gap-2 text-white"
                      style={{ backgroundColor: themeColor }}
                      onClick={() => setSelectedNominee(nomination)}
                    >
                      <Vote className="w-4 h-4" />
                      Vote for {creatorName.split(' ')[0]}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Vote Dialog */}
      <Dialog open={!!selectedNominee && paymentStatus === 'idle'} onOpenChange={(open) => !open && resetVote()}>
        <DialogContent className="max-w-sm">
          {selectedNominee && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{selectedNominee.award?.icon || '🏆'}</span>
                  Vote for {creatorName}
                </DialogTitle>
                <DialogDescription>
                  {selectedNominee.award?.name} • KSh {voteFee} per vote
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Current votes */}
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <p className="text-sm text-muted-foreground">Current Votes</p>
                  <p className="text-2xl font-bold" style={{ color: themeColor }}>
                    {selectedNominee.total_votes || 0}
                  </p>
                </div>

                {/* Vote count */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Number of Votes</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 5, 10, 20].map((count) => (
                      <Button
                        key={count}
                        variant={voteCount === count.toString() ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVoteCount(count.toString())}
                      >
                        {count}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Custom amount"
                    value={voteCount}
                    onChange={(e) => setVoteCount(e.target.value)}
                  />
                </div>

                {/* Total */}
                <div className="p-3 rounded-lg border-2 flex justify-between items-center" style={{ borderColor: themeColor }}>
                  <div>
                    <p className="text-sm text-muted-foreground">{votes} vote{votes > 1 ? 's' : ''}</p>
                    <p className="text-xs text-muted-foreground">@ KSh {voteFee} each</p>
                  </div>
                  <span className="text-xl font-bold" style={{ color: themeColor }}>
                    KSh {totalAmount.toLocaleString()}
                  </span>
                </div>

                {/* Phone */}
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="M-PESA number (07...)"
                    value={voterPhone}
                    onChange={(e) => setVoterPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Button
                  className="w-full gap-2 text-white"
                  style={{ backgroundColor: themeColor }}
                  onClick={handleVote}
                  disabled={castVote.isPending || !voterPhone}
                >
                  {castVote.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Pay KSh {totalAmount.toLocaleString()} & Vote
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Processing */}
      <PaymentProcessingModal
        isOpen={paymentStatus !== 'idle'}
        status={paymentStatus}
        recordId={recordId}
        type="donation"
        themeColor={themeColor}
        amount={totalAmount}
        onComplete={(success) => setPaymentStatus(success ? 'success' : 'failed')}
        onClose={resetVote}
        successMessage={`Your ${votes} vote${votes > 1 ? 's' : ''} for ${creatorName} have been counted!`}
      />
    </>
  );
};

export default CreatorAwardsSection;
