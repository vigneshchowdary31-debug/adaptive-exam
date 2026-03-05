import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useExamStore } from '@/stores/examStore';
import { useAuthStore } from '@/stores/authStore';
import { Trophy, CheckCircle } from 'lucide-react';

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { student, logout } = useAuthStore();
  const exam = useExamStore();
  const result = location.state?.result;

  const handleLogout = () => {
    exam.reset();
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-slide-up">
        <div className="text-center mb-6">
          <Trophy className="w-12 h-12 mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-bold">Exam Complete</h1>
          <p className="text-muted-foreground">{student?.name} · {exam.techStackName}</p>
        </div>

        <Card className="glass-card mb-4">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="text-center p-3 rounded-lg bg-muted col-span-2">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-success" />
                <p className="text-xl font-bold">{result?.correct_mcq ?? 0} / 15</p>
                <p className="text-xs text-muted-foreground">Correct MCQs</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-xl font-bold">{result?.mcq_score ?? 0}%</p>
                <p className="text-xs text-muted-foreground">MCQ Score</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-xl font-bold">{result?.theory_score ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Theory Score</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20 col-span-2">
                <p className="text-2xl font-bold text-primary">{result?.total_score ?? 0}%</p>
                <p className="text-xs font-medium text-primary/80">Total Score</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted col-span-2">
                <p className="text-xl font-bold">{result?.assigned_tier ?? 'P3'}</p>
                <p className="text-xs text-muted-foreground">Assigned Tier</p>
              </div>
            </div>

            {result?.violations > 0 && (
              <p className="text-xs text-destructive text-center">
                Tab violations: {result.violations}
              </p>
            )}
          </CardContent>
        </Card>

        <Button onClick={handleLogout} variant="outline" className="w-full">
          Back to Home
        </Button>
      </div>
    </div>
  );
}
