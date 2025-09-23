import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, Gift, Star, TrendingUp, Clock, 
  Zap, Crown, Award, Sparkles, Target
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface LoyaltyRewardsProps {
  userId: string;
}

export default function LoyaltyRewards({ userId }: LoyaltyRewardsProps) {
  const { toast } = useToast();
  const [selectedReward, setSelectedReward] = useState<any>(null);

  // Fetch user points
  const { data: loyaltyData } = useQuery({
    queryKey: [`/api/users/${userId}/loyalty`],
  });

  // Fetch available rewards
  const { data: rewards = [] } = useQuery({
    queryKey: ["/api/rewards"],
  });

  // Fetch points history
  const { data: transactions = [] } = useQuery({
    queryKey: [`/api/users/${userId}/points-history`],
  });

  // Redeem reward mutation
  const redeemMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return await apiRequest("POST", `/api/rewards/${rewardId}/redeem`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/loyalty`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/points-history`] });
      toast({
        title: "Reward Redeemed!",
        description: "Check your rewards section for the voucher code",
      });
      setSelectedReward(null);
    },
    onError: () => {
      toast({
        title: "Redemption Failed",
        description: "You don't have enough points or this reward is unavailable",
        variant: "destructive",
      });
    }
  });

  const points = loyaltyData?.points || 0;
  const lifetimePoints = loyaltyData?.lifetimePoints || 0;
  const tier = loyaltyData?.tier || "Bronze";
  
  // Calculate progress to next tier
  const tierThresholds = {
    Bronze: { min: 0, max: 1000, next: "Silver" },
    Silver: { min: 1000, max: 5000, next: "Gold" },
    Gold: { min: 5000, max: 15000, next: "Platinum" },
    Platinum: { min: 15000, max: Infinity, next: null }
  };

  const currentTier = tierThresholds[tier as keyof typeof tierThresholds];
  const progressToNext = currentTier.next 
    ? Math.min(100, ((lifetimePoints - currentTier.min) / (currentTier.max - currentTier.min)) * 100)
    : 100;

  const getTierIcon = (tierName: string) => {
    switch(tierName) {
      case "Bronze": return <Award className="h-6 w-6 text-orange-600" />;
      case "Silver": return <Star className="h-6 w-6 text-gray-400" />;
      case "Gold": return <Trophy className="h-6 w-6 text-yellow-500" />;
      case "Platinum": return <Crown className="h-6 w-6 text-purple-600" />;
      default: return <Award className="h-6 w-6" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case "discount": return <TrendingUp className="h-4 w-4" />;
      case "freebie": return <Gift className="h-4 w-4" />;
      case "voucher": return <Zap className="h-4 w-4" />;
      case "exclusive": return <Sparkles className="h-4 w-4" />;
      default: return <Gift className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6" data-testid="loyalty-rewards">
      {/* Points Overview Card */}
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getTierIcon(tier)}
              <div>
                <CardTitle className="text-2xl">{points} Points</CardTitle>
                <p className="text-sm text-muted-foreground">{tier} Member</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Lifetime Points</p>
              <p className="text-xl font-bold">{lifetimePoints}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentTier.next && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to {currentTier.next}</span>
                <span>{lifetimePoints} / {currentTier.max}</span>
              </div>
              <Progress value={progressToNext} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Earn {currentTier.max - lifetimePoints} more points to reach {currentTier.next} tier!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Rewards and History */}
      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rewards">Available Rewards</TabsTrigger>
          <TabsTrigger value="history">Points History</TabsTrigger>
          <TabsTrigger value="benefits">Tier Benefits</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward: any) => (
              <Card 
                key={reward.id}
                className={`relative ${points < reward.pointsCost ? 'opacity-60' : ''}`}
              >
                {reward.category === "exclusive" && (
                  <Badge className="absolute -top-2 -right-2 bg-purple-600">
                    Exclusive
                  </Badge>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(reward.category)}
                      <CardTitle className="text-lg">{reward.name}</CardTitle>
                    </div>
                    <Badge variant="secondary">{reward.pointsCost} pts</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {reward.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-green-600">
                      {reward.value}
                    </span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm"
                          disabled={points < reward.pointsCost}
                          onClick={() => setSelectedReward(reward)}
                          data-testid={`redeem-${reward.id}`}
                        >
                          Redeem
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Redemption</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to redeem {reward.name} for {reward.pointsCost} points?
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 justify-end mt-4">
                          <Button variant="outline" onClick={() => setSelectedReward(null)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => redeemMutation.mutate(reward.id)}
                            disabled={redeemMutation.isPending}
                          >
                            {redeemMutation.isPending ? "Redeeming..." : "Confirm"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your points earning and redemption history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No transactions yet. Start ordering to earn points!
                  </p>
                ) : (
                  transactions.map((transaction: any) => (
                    <div 
                      key={transaction.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {transaction.type === "earned" ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <Gift className="h-5 w-5 text-orange-600" />
                        )}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold ${
                        transaction.type === "earned" ? "text-green-600" : "text-red-600"
                      }`}>
                        {transaction.type === "earned" ? "+" : "-"}{transaction.points} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(tierThresholds).map(([tierName, tierInfo]) => (
              <Card key={tierName} className={tier === tierName ? "border-orange-500" : ""}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getTierIcon(tierName)}
                    <CardTitle>{tierName} Tier</CardTitle>
                  </div>
                  <CardDescription>
                    {tierInfo.min} - {tierInfo.max === Infinity ? "∞" : tierInfo.max} lifetime points
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {tierName === "Bronze" && (
                      <>
                        <li className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-orange-600" />
                          Earn 1 point per ₱20 spent
                        </li>
                        <li className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-orange-600" />
                          Access to basic rewards
                        </li>
                      </>
                    )}
                    {tierName === "Silver" && (
                      <>
                        <li className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-gray-600" />
                          Earn 1.5 points per ₱20 spent
                        </li>
                        <li className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-gray-600" />
                          10% birthday discount
                        </li>
                        <li className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-gray-600" />
                          Early access to promotions
                        </li>
                      </>
                    )}
                    {tierName === "Gold" && (
                      <>
                        <li className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-yellow-600" />
                          Earn 2 points per ₱20 spent
                        </li>
                        <li className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-yellow-600" />
                          15% birthday discount
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-yellow-600" />
                          Free delivery once a month
                        </li>
                      </>
                    )}
                    {tierName === "Platinum" && (
                      <>
                        <li className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-purple-600" />
                          Earn 3 points per ₱20 spent
                        </li>
                        <li className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-purple-600" />
                          20% birthday discount
                        </li>
                        <li className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-purple-600" />
                          Priority customer support
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          Free delivery always
                        </li>
                      </>
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}