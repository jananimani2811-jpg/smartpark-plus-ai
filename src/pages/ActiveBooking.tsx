import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Navigation2, CreditCard } from "lucide-react";
import { toast } from "sonner";

const ActiveBooking = () => {
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveBooking();
  }, []);

  const fetchActiveBooking = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        parking_slots(*),
        parking_areas(*)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        toast.error("No active booking found");
        navigate("/dashboard");
        return;
      }
      toast.error("Failed to load booking");
      return;
    }

    setBooking(data);
    setLoading(false);
  };

  const handleNavigate = () => {
    if (booking?.parking_areas) {
      const { latitude, longitude } = booking.parking_areas;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, "_blank");
    }
  };

  const handlePayment = () => {
    navigate(`/payment/${booking.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Active Booking
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-2xl">
        <Card className="p-6 animate-scale-in bg-gradient-to-br from-success/10 to-primary/10 border-success/30">
          <div className="text-center space-y-2 mb-6">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto animate-pulse-glow">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-success">Booking Confirmed!</h2>
            <p className="text-muted-foreground">Your parking spot is reserved</p>
          </div>

          <div className="space-y-4 pt-6 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-semibold text-lg">{booking?.parking_areas?.name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {booking?.parking_areas?.address}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Slot Number</p>
                <p className="font-bold text-2xl text-primary">{booking?.parking_slots?.slot_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-bold text-2xl">${booking?.total_amount}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Booking Time
              </p>
              <p className="font-semibold">
                {new Date(booking?.start_time).toLocaleString()} - {new Date(booking?.end_time).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={handleNavigate}
            className="h-14 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Navigation2 className="w-5 h-5 mr-2" />
            Navigate to Spot
          </Button>
          <Button
            onClick={handlePayment}
            className="h-14 bg-gradient-to-r from-success to-success/80 hover:opacity-90"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Complete Payment
          </Button>
        </div>

        <Card className="p-6 bg-warning/10 border-warning/30">
          <h3 className="font-semibold mb-2 text-warning">Important Notes</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Navigate to your parking spot using the button above</li>
            <li>• IoT sensors will automatically detect when you park</li>
            <li>• Complete payment before leaving to avoid fines</li>
            <li>• Overstay charges apply after your booked time</li>
          </ul>
        </Card>

        <Button
          variant="outline"
          onClick={() => navigate("/dashboard")}
          className="w-full"
        >
          Return to Dashboard
        </Button>
      </main>
    </div>
  );
};

export default ActiveBooking;
