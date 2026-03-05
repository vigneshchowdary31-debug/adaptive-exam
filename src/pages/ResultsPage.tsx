import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExamStore } from '@/stores/examStore';
import { useAuthStore } from '@/stores/authStore';
import { Trophy, Target, BookOpen, CheckCircle } from 'lucide-react';

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { student, logout } = useAuthStore();
  const exam = useExamStore();
  const result = location.state?.result;

  const tierInfo: Record<string, { label: string; desc: string; color: string }> = {
    P1: { label: 'P1 — Advanced', desc: 'Exceptional performance with strong proficiency', color: 'bg-tier-p1 text-tier-p1' },
    P2: { label: 'P2 — Intermediate', desc: 'Solid understanding with room for growth', color: 'bg-tier-p2 text-tier-p2' },
    P3: { label: 'P3 — Beginner', desc: 'Foundational level, needs more practice', color: 'bg-tier-p3 text-tier-p3' },
  };

  const tier = result?.assigned_tier || 'P3';
  const info = tierInfo[tier] || tierInfo.P3;

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
            <div className="text-center">
              <Badge className={`text-base px-4 py-1.5 ${info.color.split(' ')[0]}/10 text-${info.color.split(' ')[1].replace('text-', '')} border`}>
                {info.label}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">{info.desc}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{result?.mcq_score ?? 0}%</p>
                <p className="text-xs text-muted-foreground">MCQ</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <BookOpen className="w-5 h-5 mx-auto mb-1 text-info" />
                <p className="text-xl font-bold">{result?.theory_score ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Theory</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-success" />
                <p className="text-xl font-bold">{result?.total_score ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Total</p>
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
