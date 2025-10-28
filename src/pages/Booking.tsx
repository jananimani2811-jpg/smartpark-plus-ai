import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";

const Booking = () => {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const [slot, setSlot] = useState<any>(null);
  const [area, setArea] = useState<any>(null);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchSlotDetails();
  }, [slotId]);

  const fetchSlotDetails = async () => {
    if (!slotId) return;

    const { data: slotData, error: slotError } = await supabase
      .from("parking_slots")
      .select("*, parking_areas(*)")
      .eq("id", slotId)
      .single();

    if (slotError) {
      toast.error("Failed to load slot details");
      navigate("/dashboard");
      return;
    }

    setSlot(slotData);
    setArea(slotData.parking_areas);
    setLoading(false);
  };

  const calculateTotal = () => {
    if (!area) return 0;
    return (Number(area.hourly_rate) * hours).toFixed(2);
  };

  const handleBooking = async () => {
    if (!startDate || !startTime) {
      toast.error("Please select date and time");
      return;
    }

    setBooking(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to continue");
        navigate("/auth");
        return;
      }

      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + hours * 60 * 60 * 1000);

      const { error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          parking_slot_id: slotId!,
          parking_area_id: area.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          total_amount: Number(calculateTotal()),
          status: "active",
        });

      if (bookingError) throw bookingError;

      // Update slot status
      await supabase
        .from("parking_slots")
        .update({ status: "reserved" })
        .eq("id", slotId);

      toast.success("Booking confirmed! Redirecting to payment...");
      setTimeout(() => navigate("/active-booking"), 1500);
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking");
    } finally {
      setBooking(false);
    }
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold mt-2">Book Your Slot</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-2xl">
        <Card className="p-6 animate-fade-in bg-gradient-to-br from-card to-secondary border-primary/20">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{area?.name}</h3>
              <p className="text-sm text-muted-foreground">{area?.address}</p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground">Slot Number</p>
                <p className="font-bold text-xl text-primary">{slot?.slot_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Hourly Rate</p>
                <p className="font-bold text-xl">${area?.hourly_rate}/hr</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-6 animate-slide-up">
          <h3 className="font-semibold text-lg">Booking Details</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Start Date
              </Label>
              <Input
                id="date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Start Time
              </Label>
              <Input
                id="time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Duration (hours)</Label>
              <Input
                id="hours"
                type="number"
                min="1"
                max="24"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="bg-secondary"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-semibold">{hours} hour(s)</span>
            </div>
            <div className="flex items-center justify-between text-lg">
              <span className="font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Total Amount
              </span>
              <span className="font-bold text-2xl text-primary">${calculateTotal()}</span>
            </div>
          </div>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t border-border">
          <div className="container mx-auto max-w-2xl">
            <Button
              onClick={handleBooking}
              disabled={booking}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 h-14 text-lg"
            >
              {booking ? "Confirming..." : `Confirm Booking - $${calculateTotal()}`}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Booking;
