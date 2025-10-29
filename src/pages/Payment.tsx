import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wallet, CreditCard, QrCode, Banknote, Check } from "lucide-react";
import { toast } from "sonner";

const Payment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!error && data) {
      setBooking(data);
    }
  };

  const paymentMethods = [
    { id: "wallet", name: "Wallet", icon: Wallet, color: "from-primary to-accent" },
    { id: "card", name: "Credit/Debit Card", icon: CreditCard, color: "from-success to-success/80" },
    { id: "qr", name: "UPI/QR Code", icon: QrCode, color: "from-warning to-warning/80" },
    { id: "cash", name: "Cash", icon: Banknote, color: "from-destructive to-destructive/80" },
  ];

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          booking_id: bookingId,
          user_id: user.id,
          amount: booking.total_amount,
          payment_method: selectedMethod,
          status: "completed",
        });

      if (paymentError) throw paymentError;

      // Update booking status
      await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", bookingId);

      // Update slot status
      await supabase
        .from("parking_slots")
        .update({ status: "available" })
        .eq("id", booking.parking_slot_id);

      toast.success("Payment successful! Thank you for using SmartPark+");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Complete Payment</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-2xl">
        <Card className="p-6 animate-fade-in">
          <h2 className="font-semibold text-lg mb-4">Select Payment Method</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`
                    relative p-6 rounded-lg border-2 transition-all duration-300
                    ${isSelected 
                      ? `bg-gradient-to-br ${method.color} border-transparent scale-105 shadow-lg` 
                      : "bg-card border-border hover:border-primary/50 hover:scale-102"
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Icon className={`w-8 h-8 ${isSelected ? "text-white" : "text-primary"}`} />
                    <span className={`font-semibold ${isSelected ? "text-white" : "text-foreground"}`}>
                      {method.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-success rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {selectedMethod && (
          <Card className="p-6 animate-slide-up">
            <h3 className="font-semibold mb-4">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-semibold capitalize">{selectedMethod}</span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-bold text-2xl text-primary">₹{booking?.total_amount || 0}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t border-border">
          <div className="container mx-auto max-w-2xl">
            <Button
              onClick={handlePayment}
              disabled={!selectedMethod || processing}
              className="w-full bg-gradient-to-r from-success to-success/80 hover:opacity-90 h-14 text-lg"
            >
              {processing ? "Processing..." : "Complete Payment"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Payment;
