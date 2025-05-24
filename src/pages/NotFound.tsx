
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScanText } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-flex items-center justify-center bg-app-blue-100 p-6 rounded-full text-app-blue-600 mb-6">
          <ScanText size={48} />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-app-blue-900">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          This page couldn't be scanned or doesn't exist
        </p>
        <Button 
          asChild
          className="bg-app-blue-500 hover:bg-app-blue-600"
        >
          <a href="/">Return to Home</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
