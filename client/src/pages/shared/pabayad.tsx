import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Zap, Droplets, Phone, Wifi, Home, FileText, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const billTypes = [
  { id: "electricity", name: "Kuryente (Meralco/BATELEC)", icon: Zap, color: "text-yellow-500" },
  { id: "water", name: "Tubig (Water District)", icon: Droplets, color: "text-blue-500" },
  { id: "internet", name: "Internet (PLDT/Globe/Converge)", icon: Wifi, color: "text-purple-500" },
  { id: "phone", name: "Postpaid Phone", icon: Phone, color: "text-green-500" },
  { id: "credit", name: "Credit Card", icon: CreditCard, color: "text-red-500" },
  { id: "government", name: "Government (SSS/PhilHealth/Pag-IBIG)", icon: FileText, color: "text-indigo-500" },
  { id: "loan", name: "Loan Payment", icon: DollarSign, color: "text-orange-500" },
  { id: "insurance", name: "Insurance", icon: Home, color: "text-gray-500" }
];

export default function Pabayad() {
  const { toast } = useToast();
  const [selectedBillType, setSelectedBillType] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmitPayment = async () => {
    if (!selectedBillType || !accountNumber || !accountName || !amount || !contactNumber) {
      toast({
        title: "Kulang ang impormasyon",
        description: "Pakipuno lahat ng required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/pabayad", {
        billType: selectedBillType,
        accountNumber,
        accountName,
        amount: parseFloat(amount),
        dueDate,
        contactNumber,
        email,
        serviceFee: 25
      });

      toast({
        title: "Payment request submitted!",
        description: "Babayaran namin ang inyong bill ngayong araw",
      });

      // Reset form
      setSelectedBillType("");
      setAccountNumber("");
      setAccountName("");
      setAmount("");
      setDueDate("");
      setContactNumber("");
      setEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: "May problema sa pag-submit. Subukan ulit.",
        variant: "destructive",
      });
    }
  };

  const selectedBill = billTypes.find(b => b.id === selectedBillType);

  return (
    <div className="container mx-auto px-4 py-8" data-testid="page-pabayad">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-green-700 mb-2" data-testid="text-title">
            Pabayad Service
          </h1>
          <p className="text-gray-600" data-testid="text-subtitle">
            Bayaran ang bills nang walang pila! Service fee: ₱25 only
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Piliin ang Uri ng Bill</CardTitle>
              <CardDescription>
                Anong bill ang gusto mong bayaran?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {billTypes.map((bill) => {
                  const Icon = bill.icon;
                  return (
                    <Button
                      key={bill.id}
                      variant={selectedBillType === bill.id ? "default" : "outline"}
                      className="h-24 flex-col gap-2 p-2"
                      onClick={() => setSelectedBillType(bill.id)}
                      data-testid={`button-bill-${bill.id}`}
                    >
                      <Icon className={`h-8 w-8 ${bill.color}`} />
                      <span className="text-xs text-center leading-tight">{bill.name}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedBillType && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedBill && <selectedBill.icon className={`h-5 w-5 ${selectedBill.color}`} />}
                  Bill Details
                </CardTitle>
                <CardDescription>
                  Pakipuno ang detalye ng inyong bill
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account-number">Account/Reference Number *</Label>
                    <Input
                      id="account-number"
                      placeholder="Enter account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      data-testid="input-account-number"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="account-name">Account Name *</Label>
                    <Input
                      id="account-name"
                      placeholder="Name on the bill"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      data-testid="input-account-name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount to Pay (₱) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      data-testid="input-amount"
                    />
                  </div>

                  <div>
                    <Label htmlFor="due-date">Due Date</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      data-testid="input-due-date"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact">Contact Number *</Label>
                    <Input
                      id="contact"
                      placeholder="09XX XXX XXXX"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      data-testid="input-contact"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email (for receipt)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedBillType && amount && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Bill Amount:</span>
                    <span>₱{amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Fee:</span>
                    <span>₱25.00</span>
                  </div>
                  <div className="border-t pt-2 font-bold">
                    <div className="flex justify-between">
                      <span>Total to Pay:</span>
                      <span className="text-green-700" data-testid="text-total">
                        ₱{(parseFloat(amount) + 25).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedBillType && (
            <Button 
              size="lg" 
              className="w-full bg-green-700 hover:bg-green-800"
              onClick={handleSubmitPayment}
              disabled={!accountNumber || !accountName || !amount || !contactNumber}
              data-testid="button-submit"
            >
              Bayaran ang Bill
            </Button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-orange-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">⏱️</div>
                <h3 className="font-semibold">Same Day Payment</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Babayaran namin within the day
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">📱</div>
                <h3 className="font-semibold">SMS Updates</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Real-time updates sa payment status
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">📄</div>
                <h3 className="font-semibold">Digital Receipt</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Padadalhan kayo ng proof of payment
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}