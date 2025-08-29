import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  DollarSign, 
  Clock, 
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Bike,
  FileText
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface BtsRider {
  id: number;
  riderName: string;
  riderCode: string;
  phoneNumber?: string;
  email?: string;
  status: string;
  vehicleType?: string;
  commissionRate: number;
  baseSalary?: number;
  isActive: boolean;
}

interface BtsSalesRemittance {
  id: number;
  riderId: number;
  riderName: string;
  remitDate: string;
  dailySales: number;
  commissionAmount: number;
  remittedAmount: number;
  balance: number;
  weekPeriod?: string;
  referenceNumber?: string;
  isLate: boolean;
}

interface BtsAttendance {
  id: number;
  employeeId: number;
  riderName: string;
  attendanceDate: string;
  shiftType?: string;
  hoursWorked: number;
  overtimeHours: number;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
}

interface BtsIncentive {
  id: number;
  riderId: number;
  riderName: string;
  incentivePeriod: string;
  salesTarget: number;
  salesAchieved: number;
  targetPercentage: number;
  incentiveAmount: number;
  raffleEntries: number;
  raffleWon: boolean;
  rafflePrize?: string;
  paymentStatus: string;
}

function RiderOverviewCard() {
  const { data: riders, isLoading } = useQuery<BtsRider[]>({
    queryKey: ['/api/bts/riders']
  });

  const activeRiders = riders?.filter(r => r.isActive).length || 0;
  const totalRiders = riders?.length || 0;

  return (
    <Card data-testid="card-rider-overview">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" data-testid="text-card-title">Active Riders</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#FF6B35]" data-testid="text-active-riders">
          {isLoading ? '...' : activeRiders}
        </div>
        <p className="text-xs text-muted-foreground" data-testid="text-total-riders">
          of {totalRiders} total riders
        </p>
      </CardContent>
    </Card>
  );
}

function SalesOverviewCard() {
  const { data: sales, isLoading } = useQuery<BtsSalesRemittance[]>({
    queryKey: ['/api/bts/sales-remittance']
  });

  const totalSales = sales?.reduce((sum, sale) => sum + Number(sale.dailySales), 0) || 0;
  const totalCommission = sales?.reduce((sum, sale) => sum + Number(sale.commissionAmount), 0) || 0;

  return (
    <Card data-testid="card-sales-overview">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" data-testid="text-sales-title">Total Sales</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#004225]" data-testid="text-total-sales">
          {isLoading ? '...' : `₱${totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
        </div>
        <p className="text-xs text-muted-foreground" data-testid="text-total-commission">
          Commission: ₱{totalCommission.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </p>
      </CardContent>
    </Card>
  );
}

function AttendanceOverviewCard() {
  const { data: attendance, isLoading } = useQuery<BtsAttendance[]>({
    queryKey: ['/api/bts/attendance']
  });

  const totalHours = attendance?.reduce((sum, att) => sum + Number(att.hoursWorked), 0) || 0;
  const overtimeHours = attendance?.reduce((sum, att) => sum + Number(att.overtimeHours), 0) || 0;

  return (
    <Card data-testid="card-attendance-overview">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" data-testid="text-attendance-title">Hours Worked</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#FFD23F]" data-testid="text-total-hours">
          {isLoading ? '...' : totalHours}h
        </div>
        <p className="text-xs text-muted-foreground" data-testid="text-overtime-hours">
          Overtime: {overtimeHours}h
        </p>
      </CardContent>
    </Card>
  );
}

function IncentivesOverviewCard() {
  const { data: incentives, isLoading } = useQuery<BtsIncentive[]>({
    queryKey: ['/api/bts/incentives']
  });

  const totalIncentives = incentives?.reduce((sum, inc) => sum + Number(inc.incentiveAmount), 0) || 0;
  const raffleWinners = incentives?.filter(inc => inc.raffleWon).length || 0;

  return (
    <Card data-testid="card-incentives-overview">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" data-testid="text-incentives-title">Total Incentives</CardTitle>
        <Award className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#FF6B35]" data-testid="text-total-incentives">
          {isLoading ? '...' : `₱${totalIncentives.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
        </div>
        <p className="text-xs text-muted-foreground" data-testid="text-raffle-winners">
          Raffle winners: {raffleWinners}
        </p>
      </CardContent>
    </Card>
  );
}

function RidersTab() {
  const { data: riders, isLoading } = useQuery<BtsRider[]>({
    queryKey: ['/api/bts/riders']
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading riders...</div>;
  }

  return (
    <div className="space-y-4" data-testid="tab-riders">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#004225]" data-testid="text-riders-header">BTS Riders</h3>
        <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90" data-testid="button-add-rider">
          <Users className="w-4 h-4 mr-2" />
          Add Rider
        </Button>
      </div>
      
      <div className="grid gap-4">
        {riders?.map((rider) => (
          <Card key={rider.id} data-testid={`card-rider-${rider.id}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-[#004225]" data-testid={`text-rider-name-${rider.id}`}>
                    {rider.riderName}
                  </CardTitle>
                  <CardDescription data-testid={`text-rider-code-${rider.id}`}>
                    Code: {rider.riderCode} • {rider.vehicleType}
                  </CardDescription>
                </div>
                <Badge 
                  variant={rider.isActive ? "default" : "secondary"}
                  className={rider.isActive ? "bg-[#004225]" : ""}
                  data-testid={`badge-rider-status-${rider.id}`}
                >
                  {rider.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Phone:</span> {rider.phoneNumber || 'N/A'}
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span> {rider.email || 'N/A'}
                </div>
                <div>
                  <span className="text-muted-foreground">Commission:</span> {(rider.commissionRate * 100).toFixed(2)}%
                </div>
                <div>
                  <span className="text-muted-foreground">Base Salary:</span> ₱{rider.baseSalary?.toLocaleString('en-PH') || 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SalesTab() {
  const { data: sales, isLoading } = useQuery<BtsSalesRemittance[]>({
    queryKey: ['/api/bts/sales-remittance']
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading sales data...</div>;
  }

  return (
    <div className="space-y-4" data-testid="tab-sales">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#004225]" data-testid="text-sales-header">Sales Remittance</h3>
        <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90" data-testid="button-add-remittance">
          <DollarSign className="w-4 h-4 mr-2" />
          Add Remittance
        </Button>
      </div>

      <div className="grid gap-4">
        {sales?.map((sale) => (
          <Card key={sale.id} data-testid={`card-sale-${sale.id}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-[#004225]" data-testid={`text-sale-rider-${sale.id}`}>
                    {sale.riderName}
                  </CardTitle>
                  <CardDescription data-testid={`text-sale-date-${sale.id}`}>
                    {new Date(sale.remitDate).toLocaleDateString('en-PH')} • {sale.weekPeriod}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {sale.isLate && (
                    <Badge variant="destructive" data-testid={`badge-late-${sale.id}`}>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Late
                    </Badge>
                  )}
                  <Badge variant="outline" data-testid={`badge-ref-${sale.id}`}>
                    {sale.referenceNumber}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-[#FF6B35]/10 rounded">
                  <div className="text-xs text-muted-foreground">Daily Sales</div>
                  <div className="font-bold text-[#FF6B35]" data-testid={`text-daily-sales-${sale.id}`}>
                    ₱{Number(sale.dailySales).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-center p-3 bg-[#004225]/10 rounded">
                  <div className="text-xs text-muted-foreground">Commission</div>
                  <div className="font-bold text-[#004225]" data-testid={`text-commission-${sale.id}`}>
                    ₱{Number(sale.commissionAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-center p-3 bg-[#FFD23F]/10 rounded">
                  <div className="text-xs text-muted-foreground">Remitted</div>
                  <div className="font-bold text-[#FFD23F]" data-testid={`text-remitted-${sale.id}`}>
                    ₱{Number(sale.remittedAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-100 rounded">
                  <div className="text-xs text-muted-foreground">Balance</div>
                  <div className="font-bold" data-testid={`text-balance-${sale.id}`}>
                    ₱{Number(sale.balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AttendanceTab() {
  const { data: attendance, isLoading } = useQuery<BtsAttendance[]>({
    queryKey: ['/api/bts/attendance']
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading attendance data...</div>;
  }

  return (
    <div className="space-y-4" data-testid="tab-attendance">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#004225]" data-testid="text-attendance-header">Attendance Records</h3>
        <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90" data-testid="button-add-attendance">
          <Clock className="w-4 h-4 mr-2" />
          Log Attendance
        </Button>
      </div>

      <div className="grid gap-4">
        {attendance?.map((att) => (
          <Card key={att.id} data-testid={`card-attendance-${att.id}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-[#004225]" data-testid={`text-att-rider-${att.id}`}>
                    {att.riderName}
                  </CardTitle>
                  <CardDescription data-testid={`text-att-date-${att.id}`}>
                    {new Date(att.attendanceDate).toLocaleDateString('en-PH')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={att.status === 'present' ? 'default' : 'secondary'}
                    className={att.status === 'present' ? 'bg-[#004225]' : ''}
                    data-testid={`badge-att-status-${att.id}`}
                  >
                    {att.status}
                  </Badge>
                  {att.shiftType && (
                    <Badge variant="outline" data-testid={`badge-shift-${att.id}`}>
                      {att.shiftType}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-[#FF6B35]/10 rounded">
                  <div className="text-xs text-muted-foreground">Hours Worked</div>
                  <div className="font-bold text-[#FF6B35]" data-testid={`text-hours-worked-${att.id}`}>
                    {Number(att.hoursWorked)}h
                  </div>
                </div>
                <div className="text-center p-3 bg-[#FFD23F]/10 rounded">
                  <div className="text-xs text-muted-foreground">Overtime</div>
                  <div className="font-bold text-[#FFD23F]" data-testid={`text-overtime-${att.id}`}>
                    {Number(att.overtimeHours)}h
                  </div>
                </div>
                <div className="text-center p-3 bg-[#004225]/10 rounded">
                  <div className="text-xs text-muted-foreground">Check In</div>
                  <div className="font-bold text-[#004225]" data-testid={`text-check-in-${att.id}`}>
                    {att.checkInTime || 'N/A'}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-100 rounded">
                  <div className="text-xs text-muted-foreground">Check Out</div>
                  <div className="font-bold" data-testid={`text-check-out-${att.id}`}>
                    {att.checkOutTime || 'N/A'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function IncentivesTab() {
  const { data: incentives, isLoading } = useQuery<BtsIncentive[]>({
    queryKey: ['/api/bts/incentives']
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading incentives data...</div>;
  }

  return (
    <div className="space-y-4" data-testid="tab-incentives">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#004225]" data-testid="text-incentives-header">Performance Incentives</h3>
        <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90" data-testid="button-add-incentive">
          <Award className="w-4 h-4 mr-2" />
          Calculate Incentives
        </Button>
      </div>

      <div className="grid gap-4">
        {incentives?.map((incentive) => (
          <Card key={incentive.id} data-testid={`card-incentive-${incentive.id}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-[#004225]" data-testid={`text-inc-rider-${incentive.id}`}>
                    {incentive.riderName}
                  </CardTitle>
                  <CardDescription data-testid={`text-inc-period-${incentive.id}`}>
                    {incentive.incentivePeriod}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={incentive.targetPercentage >= 100 ? 'default' : 'secondary'}
                    className={incentive.targetPercentage >= 100 ? 'bg-[#004225]' : ''}
                    data-testid={`badge-target-${incentive.id}`}
                  >
                    {Number(incentive.targetPercentage).toFixed(1)}%
                  </Badge>
                  {incentive.raffleWon && (
                    <Badge className="bg-[#FFD23F] text-black" data-testid={`badge-raffle-${incentive.id}`}>
                      🎉 Raffle Winner
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-[#FF6B35]/10 rounded">
                    <div className="text-xs text-muted-foreground">Target</div>
                    <div className="font-bold text-[#FF6B35]" data-testid={`text-target-${incentive.id}`}>
                      ₱{Number(incentive.salesTarget).toLocaleString('en-PH')}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-[#004225]/10 rounded">
                    <div className="text-xs text-muted-foreground">Achieved</div>
                    <div className="font-bold text-[#004225]" data-testid={`text-achieved-${incentive.id}`}>
                      ₱{Number(incentive.salesAchieved).toLocaleString('en-PH')}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-[#FFD23F]/10 rounded">
                    <div className="text-xs text-muted-foreground">Incentive</div>
                    <div className="font-bold text-[#FFD23F]" data-testid={`text-incentive-amount-${incentive.id}`}>
                      ₱{Number(incentive.incentiveAmount).toLocaleString('en-PH')}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-100 rounded">
                    <div className="text-xs text-muted-foreground">Raffle Entries</div>
                    <div className="font-bold" data-testid={`text-raffle-entries-${incentive.id}`}>
                      {incentive.raffleEntries}
                    </div>
                  </div>
                </div>
                {incentive.rafflePrize && (
                  <div className="p-3 bg-[#FFD23F]/20 rounded-lg border border-[#FFD23F]">
                    <div className="text-sm font-medium text-[#004225]" data-testid={`text-raffle-prize-${incentive.id}`}>
                      🏆 Raffle Prize: {incentive.rafflePrize}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function BtsDashboard() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto" data-testid="page-bts-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#004225]" data-testid="text-page-title">
            BTS Operations Dashboard
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Manage riders, sales, attendance, and incentives
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bike className="h-8 w-8 text-[#FF6B35]" />
          <span className="text-xl font-bold text-[#004225]">BTS</span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="overview-cards">
        <RiderOverviewCard />
        <SalesOverviewCard />
        <AttendanceOverviewCard />
        <IncentivesOverviewCard />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="riders" className="space-y-4" data-testid="main-tabs">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="riders" data-testid="tab-trigger-riders">
            <Users className="w-4 h-4 mr-2" />
            Riders
          </TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-trigger-sales">
            <DollarSign className="w-4 h-4 mr-2" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-trigger-attendance">
            <Clock className="w-4 h-4 mr-2" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="incentives" data-testid="tab-trigger-incentives">
            <Award className="w-4 h-4 mr-2" />
            Incentives
          </TabsTrigger>
        </TabsList>

        <TabsContent value="riders">
          <RidersTab />
        </TabsContent>

        <TabsContent value="sales">
          <SalesTab />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab />
        </TabsContent>

        <TabsContent value="incentives">
          <IncentivesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}