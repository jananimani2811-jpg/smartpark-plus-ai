import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ParkingSlot {
  id: string;
  slot_number: string;
  status: string;
}

interface ParkingArea {
  id: string;
  name: string;
  address: string;
  hourly_rate: number;
}

const ParkingSlots = () => {
  const { areaId } = useParams();
  const navigate = useNavigate();
  const [area, setArea] = useState<ParkingArea | null>(null);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [areaId]);

  const fetchData = async () => {
    if (!areaId) return;

    // Fetch area details
    const { data: areaData, error: areaError } = await supabase
      .from("parking_areas")
      .select("*")
      .eq("id", areaId)
      .single();

    if (areaError) {
      toast.error("Failed to load parking area");
      navigate("/dashboard");
      return;
    }

    // Fetch slots
    const { data: slotsData, error: slotsError } = await supabase
      .from("parking_slots")
      .select("*")
      .eq("parking_area_id", areaId)
      .order("slot_number");

    if (slotsError) {
      toast.error("Failed to load parking slots");
      return;
    }

    setArea(areaData);
    setSlots(slotsData || []);
    setLoading(false);
  };

  const handleSlotSelect = (slotId: string, status: string) => {
    if (status !== "available") {
      toast.error("This slot is not available");
      return;
    }
    setSelectedSlot(slotId);
  };

  const handleProceed = () => {
    if (!selectedSlot) {
      toast.error("Please select a parking slot");
      return;
    }
    navigate(`/booking/${selectedSlot}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-success/20 text-success border-success/50";
      case "occupied":
        return "bg-destructive/20 text-destructive border-destructive/50";
      case "reserved":
        return "bg-warning/20 text-warning border-warning/50";
      default:
        return "bg-muted text-muted-foreground";
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{area?.name}</h1>
          <p className="text-sm text-muted-foreground">{area?.address}</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <p className="text-sm text-muted-foreground">Hourly Rate</p>
            <p className="text-2xl font-bold text-primary">${area?.hourly_rate}/hr</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-success/10 to-success/20 border-success/20">
            <p className="text-sm text-muted-foreground">Available Slots</p>
            <p className="text-2xl font-bold text-success">
              {slots.filter(s => s.status === "available").length}
            </p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-warning/10 to-warning/20 border-warning/20">
            <p className="text-sm text-muted-foreground">Total Slots</p>
            <p className="text-2xl font-bold">{slots.length}</p>
          </Card>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 animate-slide-up">
          <Badge className={getStatusColor("available")}>● Available</Badge>
          <Badge className={getStatusColor("occupied")}>● Occupied</Badge>
          <Badge className={getStatusColor("reserved")}>● Reserved</Badge>
        </div>

        {/* Parking Grid */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Select a Parking Slot</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {slots.map((slot, index) => (
              <button
                key={slot.id}
                onClick={() => handleSlotSelect(slot.id, slot.status)}
                disabled={slot.status !== "available"}
                className={`
                  relative p-6 rounded-lg border-2 transition-all duration-300
                  ${slot.status === "available" 
                    ? "bg-success/10 border-success/50 hover:bg-success/20 hover:scale-105 cursor-pointer" 
                    : slot.status === "occupied"
                    ? "bg-destructive/10 border-destructive/50 cursor-not-allowed opacity-60"
                    : "bg-warning/10 border-warning/50 cursor-not-allowed opacity-60"
                  }
                  ${selectedSlot === slot.id ? "ring-4 ring-primary scale-105 animate-pulse-glow" : ""}
                  animate-scale-in
                `}
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <div className="text-center">
                  <p className="font-bold text-lg">{slot.slot_number}</p>
                  <p className="text-xs mt-1 capitalize">{slot.status}</p>
                </div>
                {selectedSlot === slot.id && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Proceed Button */}
        {selectedSlot && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t border-border animate-slide-up">
            <div className="container mx-auto">
              <Button
                onClick={handleProceed}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 h-14 text-lg"
              >
                Proceed to Booking
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ParkingSlots;
