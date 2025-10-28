import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Car } from "lucide-react";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/auth");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse-glow"></div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Car animation */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-glow"></div>
          <div className="relative bg-card border-2 border-primary rounded-full p-8 animate-drive-in">
            <Car className="w-16 h-16 text-primary" />
          </div>
        </div>

        {/* Logo and text */}
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent">
            SmartPark+
          </h1>
          <p className="text-muted-foreground text-lg">Your Intelligent Parking Solution</p>
        </div>

        {/* Loading indicator */}
        <div className="flex gap-2 animate-slide-up">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default Splash;
