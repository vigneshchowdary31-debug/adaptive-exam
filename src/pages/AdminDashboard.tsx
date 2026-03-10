import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { AdminCreateTest } from '@/components/admin/AdminCreateTest';
import { AdminQuestions } from '@/components/admin/AdminQuestions';
import { AdminResults } from '@/components/admin/AdminResults';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { Button } from '@/components/ui/button';
import { LogOut, FilePlus, FileQuestion, BarChart3, PieChart } from 'lucide-react';

export default function AdminDashboard() {
  const { admin, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!admin) navigate('/admin/login');
  }, [admin, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/95 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <h1 className="text-lg font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{admin?.username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <Tabs defaultValue="create-test" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="create-test" className="gap-1.5">
              <FilePlus className="w-4 h-4" /> Create Test
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-1.5">
              <FileQuestion className="w-4 h-4" /> Questions
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-1.5">
              <BarChart3 className="w-4 h-4" /> Results
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <PieChart className="w-4 h-4" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create-test"><AdminCreateTest /></TabsContent>
          <TabsContent value="questions"><AdminQuestions /></TabsContent>
          <TabsContent value="results"><AdminResults /></TabsContent>
          <TabsContent value="analytics"><AdminAnalytics /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
