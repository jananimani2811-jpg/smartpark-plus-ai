import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Navigation, Wallet, User as UserIcon, LogOut } from "lucide-react";
import { toast } from "sonner";

interface ParkingArea {
  id: string;
  name: string;
  address: string;
  total_slots: number;
  hourly_rate: number;
  latitude: number;
  longitude: number;
  distance?: number;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [parkingAreas, setParkingAreas] = useState<ParkingArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    detectUserLocation();
    fetchParkingAreas();
  }, []);

  useEffect(() => {
    if (user) {
      fetchWalletBalance();
    }
  }, [user]);

  const detectUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast.success("Location detected");
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not detect location. Showing all areas.");
        }
      );
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    setLoading(false);
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching wallet balance:", error);
      return;
    }

    if (data) {
      setWalletBalance(data.wallet_balance || 0);
    }
  };

  const fetchParkingAreas = async () => {
    const { data, error } = await supabase
      .from("parking_areas")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load parking areas");
      return;
    }

    let areas = data || [];

    // Sort by distance if location is available
    if (userLocation) {
      areas = areas.map(area => ({
        ...area,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          Number(area.latitude),
          Number(area.longitude)
        )
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    setParkingAreas(areas);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            SmartPark+
          </h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate("/profile")}>
              <UserIcon className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h2 className="text-3xl font-bold mb-2">Find Your Parking</h2>
          <p className="text-muted-foreground">Select a parking area to view available slots</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Areas</p>
                <p className="text-2xl font-bold">{parkingAreas.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-success/10 to-success/20 border-success/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/20 rounded-full">
                <Navigation className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Bookings</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-warning/10 to-warning/20 border-warning/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/20 rounded-full">
                <Wallet className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-2xl font-bold">₹{walletBalance.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Parking Areas */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">
            {userLocation ? "Nearby Parking Areas" : "All Parking Areas"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parkingAreas.map((area, index) => (
              <Card
                key={area.id}
                className="p-6 hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer group animate-scale-in border-border hover:border-primary/50"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate(`/parking/${area.id}`)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {area.name}
                      </h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {area.address}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Slots</p>
                      <p className="font-semibold">{area.total_slots}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Hourly Rate</p>
                      <p className="font-semibold text-primary">₹{(area.hourly_rate * 83).toFixed(0)}/hr</p>
                    </div>
                  </div>
                  
                  {area.distance && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      📍 {area.distance.toFixed(1)} km away
                    </div>
                  )}

                  <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
                    View Slots
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
