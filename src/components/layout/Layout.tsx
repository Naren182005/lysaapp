
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanText, User, LogOut, History, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from '@/contexts/UserContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from '@/components/ui/sonner';
import ClearHistoryDialog from '@/components/ui/ClearHistoryDialog';
import OfflineModeButton from '@/components/navigation/OfflineModeButton';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useUser();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      <header className="border-b px-4 py-3 bg-white shadow-sm sticky top-0 z-10" role="banner">
        <div className="container flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="GradeScan Home">
            <div className="bg-app-teal-50 p-1.5 rounded-md">
              <ScanText size={24} className="text-app-teal-600" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-xl text-app-blue-900">GradeScan</h1>
              <span className="text-xs bg-app-teal-100 text-app-teal-800 px-2 py-0.5 rounded-full inline-block">
                AI Powered
              </span>
            </div>
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <OfflineModeButton />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/history')}
                className="text-muted-foreground hover:text-app-blue-900"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>

              <ClearHistoryDialog />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    {user?.name?.split(' ')[0] || 'Account'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/history')}>
                    <History className="mr-2 h-4 w-4" />
                    <span>Evaluation History</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => document.getElementById('clear-history-button')?.click()}>
                    <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                    <span>Clear History</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <OfflineModeButton />

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/login')}
              >
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </div>
          )}
        </div>
      </header>
      <main id="main-content" className="flex-1 container py-8 animate-fade-in" role="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="border-t py-4 bg-white" role="contentinfo">
        <div className="container text-center text-sm text-muted-foreground">
          GradeScan - AI-Powered Exam Evaluation Tool
        </div>
      </footer>
    </div>
  );
};

export default Layout;
