import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Percent,
  Receipt,
  Users,
  Shield,
  Calendar,
  Building2,
  AlertCircle,
  Info,
  FileSpreadsheet,
  PieChart,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TaxReport {
  id: string;
  vendorId: string;
  restaurantId?: string;
  periodStart: string;
  periodEnd: string;
  reportType: string;
  reportNumber?: string;
  grossSales: string;
  vatableSales: string;
  vatExemptSales: string;
  zeroRatedSales: string;
  vatCollected: string;
  vatPayable: string;
  withholdingCollected: string;
  withholdingPaid: string;
  totalOrders: number;
  totalInvoices: number;
  seniorTransactions: number;
  pwdTransactions: number;
  status: string;
  exportedAt?: string;
  generatedAt: string;
}

interface TaxReportsResponse {
  success: boolean;
  reports: TaxReport[];
  summary: {
    totalGrossSales: number;
    totalVatCollected: number;
    totalSeniorTransactions: number;
    totalPwdTransactions: number;
    reportCount: number;
  };
}

const statusBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  generated: "secondary",
  submitted: "default",
  filed: "default"
};

export default function VendorTaxReports() {
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [selectedReport, setSelectedReport] = useState<TaxReport | null>(null);
  const { toast } = useToast();

  // Fetch tax reports
  const { data, isLoading, error } = useQuery<TaxReportsResponse>({
    queryKey: ["/api/vendor/tax-reports"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/vendor/tax-reports");
      return res.json();
    }
  });

  // Export report
  const exportReport = async (reportId: string, reportNumber: string) => {
    try {
      const res = await fetch(`/api/vendor/tax-reports/${reportId}/export`, {
        credentials: "include"
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tax-report-${reportNumber}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "Tax report downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to download report",
        variant: "destructive"
      });
    }
  };

  // Filter reports by year
  const filteredReports = (data?.reports || []).filter((report) => {
    const reportYear = new Date(report.periodStart).getFullYear().toString();
    return yearFilter === "all" || reportYear === yearFilter;
  });

  // Get available years
  const availableYears = Array.from(new Set(
    (data?.reports || []).map(r => new Date(r.periodStart).getFullYear().toString())
  )).sort().reverse();

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load tax reports. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const summary = data?.summary || {
    totalGrossSales: 0,
    totalVatCollected: 0,
    totalSeniorTransactions: 0,
    totalPwdTransactions: 0,
    reportCount: 0
  };

  // Calculate filtered summary
  const filteredSummary = filteredReports.reduce(
    (acc, report) => ({
      grossSales: acc.grossSales + parseFloat(report.grossSales || "0"),
      vatCollected: acc.vatCollected + parseFloat(report.vatCollected || "0"),
      vatExempt: acc.vatExempt + parseFloat(report.vatExemptSales || "0"),
      totalOrders: acc.totalOrders + (report.totalOrders || 0),
      seniorTransactions: acc.seniorTransactions + (report.seniorTransactions || 0),
      pwdTransactions: acc.pwdTransactions + (report.pwdTransactions || 0)
    }),
    { grossSales: 0, vatCollected: 0, vatExempt: 0, totalOrders: 0, seniorTransactions: 0, pwdTransactions: 0 }
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Tax Reports
          </h1>
          <p className="text-muted-foreground">
            BIR-compliant tax reports and VAT summary
          </p>
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PHP {filteredSummary.grossSales.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""} in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VAT Collected</CardTitle>
            <Percent className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PHP {filteredSummary.vatCollected.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              12% VAT on vatable sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VAT Exempt Sales</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PHP {filteredSummary.vatExempt.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Senior/PWD exempt transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <BarChart3 className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredSummary.totalOrders.toLocaleString()}
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {filteredSummary.seniorTransactions} Senior
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {filteredSummary.pwdTransactions} PWD
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VAT Breakdown Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            VAT Breakdown
          </CardTitle>
          <CardDescription>
            Summary of VAT collected and exempt sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Vatable Sales</span>
                <span className="font-medium">
                  PHP {(filteredSummary.grossSales - filteredSummary.vatExempt).toLocaleString("en-PH", {
                    minimumFractionDigits: 2
                  })}
                </span>
              </div>
              <Progress
                value={filteredSummary.grossSales > 0
                  ? ((filteredSummary.grossSales - filteredSummary.vatExempt) / filteredSummary.grossSales) * 100
                  : 0
                }
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>VAT Exempt Sales</span>
                <span className="font-medium">
                  PHP {filteredSummary.vatExempt.toLocaleString("en-PH", {
                    minimumFractionDigits: 2
                  })}
                </span>
              </div>
              <Progress
                value={filteredSummary.grossSales > 0
                  ? (filteredSummary.vatExempt / filteredSummary.grossSales) * 100
                  : 0
                }
                className="h-2 [&>div]:bg-purple-500"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">Output VAT (12%)</p>
                <p className="text-xl font-bold text-green-800">
                  PHP {filteredSummary.vatCollected.toLocaleString("en-PH", {
                    minimumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">Net VAT Payable</p>
                <p className="text-xl font-bold text-blue-800">
                  PHP {filteredSummary.vatCollected.toLocaleString("en-PH", {
                    minimumFractionDigits: 2
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tax Reports
          </CardTitle>
          <CardDescription>
            Monthly and quarterly tax reports ready for BIR filing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No Reports Available</p>
              <p className="text-muted-foreground">
                Tax reports will appear here once generated by the admin.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Number</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Gross Sales</TableHead>
                  <TableHead className="text-right">VAT Collected</TableHead>
                  <TableHead className="text-right">VAT Exempt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow
                    key={report.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedReport(
                      selectedReport?.id === report.id ? null : report
                    )}
                  >
                    <TableCell className="font-mono text-sm">
                      {report.reportNumber || "-"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {format(new Date(report.periodStart), "MMM dd")} -{" "}
                          {format(new Date(report.periodEnd), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      PHP {parseFloat(report.grossSales).toLocaleString("en-PH", {
                        minimumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      PHP {parseFloat(report.vatCollected).toLocaleString("en-PH", {
                        minimumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      PHP {parseFloat(report.vatExemptSales || "0").toLocaleString("en-PH", {
                        minimumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[report.status]}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportReport(report.id, report.reportNumber || report.id);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Selected Report Details */}
      {selectedReport && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Report Details</CardTitle>
                <CardDescription>
                  {selectedReport.reportNumber || "Report"} - {format(new Date(selectedReport.periodStart), "MMMM yyyy")}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => exportReport(selectedReport.id, selectedReport.reportNumber || selectedReport.id)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Sales Breakdown */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Sales Breakdown
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                    <span>Gross Sales</span>
                    <span className="font-mono font-medium">
                      PHP {parseFloat(selectedReport.grossSales).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                    <span>Vatable Sales</span>
                    <span className="font-mono font-medium">
                      PHP {parseFloat(selectedReport.vatableSales || "0").toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                    <span>VAT Exempt Sales</span>
                    <span className="font-mono font-medium text-purple-700">
                      PHP {parseFloat(selectedReport.vatExemptSales || "0").toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                    <span>Zero-Rated Sales</span>
                    <span className="font-mono font-medium">
                      PHP {parseFloat(selectedReport.zeroRatedSales || "0").toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tax Summary */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Tax Summary
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                    <span>VAT Collected (Output VAT)</span>
                    <span className="font-mono font-medium text-green-700">
                      PHP {parseFloat(selectedReport.vatCollected).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                    <span>VAT Payable</span>
                    <span className="font-mono font-medium text-blue-700">
                      PHP {parseFloat(selectedReport.vatPayable || "0").toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                    <span>Withholding Tax Collected</span>
                    <span className="font-mono font-medium">
                      PHP {parseFloat(selectedReport.withholdingCollected || "0").toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Transaction Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{selectedReport.totalOrders}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{selectedReport.totalInvoices}</p>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{selectedReport.seniorTransactions}</p>
                <p className="text-sm text-blue-600">Senior Citizen</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-700">{selectedReport.pwdTransactions}</p>
                <p className="text-sm text-purple-600">PWD Transactions</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            Generated on {format(new Date(selectedReport.generatedAt), "MMMM dd, yyyy 'at' h:mm a")}
            {selectedReport.exportedAt && (
              <span> | Last exported on {format(new Date(selectedReport.exportedAt), "MMMM dd, yyyy")}</span>
            )}
          </CardFooter>
        </Card>
      )}

      {/* BIR Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>BIR Compliance</AlertTitle>
        <AlertDescription>
          These reports are formatted for BIR filing requirements. Export the CSV files and use them as reference
          when filing your VAT returns (BIR Form 2550M for monthly, 2550Q for quarterly).
          Always consult with your accountant for proper tax filing procedures.
        </AlertDescription>
      </Alert>
    </div>
  );
}
