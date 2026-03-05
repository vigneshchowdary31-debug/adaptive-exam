import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTechStacks, getExamSchedule, startExam } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useExamStore } from '@/stores/examStore';
import { toast } from 'sonner';
import { Code2, ArrowRight, Clock } from 'lucide-react';

interface TechStack {
  id: string;
  name: string;
}

export default function SelectStack() {
  const [stacks, setStacks] = useState<TechStack[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [examAvailable, setExamAvailable] = useState(true);
  const [scheduleMessage, setScheduleMessage] = useState('');
  const navigate = useNavigate();
  const { student } = useAuthStore();
  const { setSession, setTimeRemaining, setStartTime, setTheoryQuestions } = useExamStore();

  useEffect(() => {
    if (!student) {
      navigate('/');
      return;
    }
    if (student.attempted) {
      toast.error('You have already attempted this exam.');
      navigate('/');
      return;
    }

    const load = async () => {
      try {
        const [stackData, schedule] = await Promise.all([getTechStacks(), getExamSchedule()]);
        setStacks(stackData || []);

        if (schedule) {
          const now = new Date();
          const start = new Date(schedule.start_time);
          const end = new Date(schedule.end_time);
          if (now < start || now > end) {
            setExamAvailable(false);
            setScheduleMessage(
              now < start
                ? `Exam starts at ${start.toLocaleString()}`
                : 'Exam window has ended.'
            );
          }
        }
      } catch {
        toast.error('Failed to load data');
      }
    };
    load();
  }, [student, navigate]);

  const handleStart = async () => {
    if (!selected || !student) return;
    setLoading(true);
    try {
      const data = await startExam(student.id, selected);
      if (data.error) {
        toast.error(data.error);
        return;
      }
      const stackName = stacks.find((s) => s.id === selected)?.name || '';
      setSession(data.session_id, selected, stackName);
      setTimeRemaining(data.time_remaining || 10 * 60);
      setStartTime(Date.now());
      if (data.theory_questions) {
        setTheoryQuestions(data.theory_questions);
      }
      navigate('/exam');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start exam');
    } finally {
      setLoading(false);
    }
  };

  if (!examAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="glass-card max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Exam Not Available</h2>
            <p className="text-muted-foreground">{scheduleMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-3xl mx-auto animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Select Your Tech Stack</h1>
          <p className="text-muted-foreground mt-1">
            Welcome, <span className="font-medium text-foreground">{student?.name}</span>. Choose your area of expertise.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {stacks.map((stack) => (
            <button
              key={stack.id}
              onClick={() => setSelected(stack.id)}
              className={`p-4 rounded-lg border-2 transition-all text-sm font-medium text-left ${selected === stack.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-card hover:border-primary/40'
                }`}
            >
              <Code2 className={`w-5 h-5 mb-2 ${selected === stack.id ? 'text-primary' : 'text-muted-foreground'}`} />
              {stack.name}
            </button>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={handleStart}
            disabled={!selected || loading}
            size="lg"
            className="min-w-48"
          >
            {loading ? 'Starting...' : 'Start Exam'}
            {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Duration: 10 minutes · 15 MCQs + 2 Theory · Adaptive difficulty
          </p>
        </div>
      </div>
    </div>
  );
}
