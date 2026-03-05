import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { studentLogin } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { GraduationCap, ArrowRight } from 'lucide-react';

export default function StudentLogin() {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setStudent, setSessionToken } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      toast.error('Please enter your Student ID');
      return;
    }

    setLoading(true);
    try {
      const data = await studentLogin(studentId.trim());
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setStudent(data.student);
      setSessionToken(data.token);
      
      if (data.student.attempted) {
        toast.error('You have already attempted this exam.');
        return;
      }
      
      navigate('/select-stack');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Adaptive</span> Assessment
          </h1>
          <p className="text-muted-foreground mt-2">
            Technical skill evaluation platform
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-xl">Student Login</CardTitle>
            <CardDescription>Enter your Student ID to begin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  placeholder="e.g. KL20241001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="h-12 text-base font-mono"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? 'Verifying...' : 'Continue'}
                {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <button
            onClick={() => navigate('/admin/login')}
            className="underline hover:text-foreground transition-colors"
          >
            Admin Login
          </button>
        </p>
      </div>
    </div>
  );
}
