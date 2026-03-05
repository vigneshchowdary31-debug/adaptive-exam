import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useExamStore } from '@/stores/examStore';
import { useAuthStore } from '@/stores/authStore';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { useExamTimer } from '@/hooks/useExamTimer';
import { getNextBatch, submitAnswer, submitTheory, finishExam } from '@/lib/api';
import { toast } from 'sonner';
import { Clock, Shield, Zap, ChevronRight } from 'lucide-react';

export default function ExamPage() {
  const navigate = useNavigate();
  const { student } = useAuthStore();
  const exam = useExamStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [theoryModalOpen, setTheoryModalOpen] = useState(false);
  const [activeTheoryIndex, setActiveTheoryIndex] = useState<number | null>(null);
  const [theoryText, setTheoryText] = useState('');
  const [theoryTimerSec, setTheoryTimerSec] = useState(60);
  const theoryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const theory1ShownRef = useRef(false);
  const theory2ShownRef = useRef(false);

  const handleAutoSubmit = useCallback(async () => {
    if (exam.isFinished || !exam.sessionId) return;
    exam.setFinished();
    try {
      const result = await finishExam(exam.sessionId);
      navigate('/results', { state: { result } });
    } catch {
      navigate('/results');
    }
  }, [exam, navigate]);

  useAntiCheat(handleAutoSubmit);
  const timeRemaining = useExamTimer(handleAutoSubmit);

  // Redirect if no session
  useEffect(() => {
    if (!student || !exam.sessionId) {
      navigate('/');
    }
  }, [student, exam.sessionId, navigate]);

  // Fetch initial batch
  useEffect(() => {
    if (exam.sessionId && exam.currentBatch.length === 0 && !exam.isFinished) {
      fetchBatch();
    }
  }, [exam.sessionId]);

  // Theory question triggers after 15 MCQs answered
  useEffect(() => {
    if (exam.questionsAnswered >= 15 && !theory1ShownRef.current && exam.theoryQuestions.length > 0) {
      theory1ShownRef.current = true;
      showTheory(0);
    }
  }, [exam.questionsAnswered, exam.theoryQuestions]);

  const showTheory = (index: number) => {
    setActiveTheoryIndex(index);
    setTheoryText('');
    setTheoryTimerSec(60);
    setTheoryModalOpen(true);

    if (theoryTimerRef.current) clearInterval(theoryTimerRef.current);
    theoryTimerRef.current = setInterval(() => {
      setTheoryTimerSec((prev) => {
        if (prev <= 1) {
          if (theoryTimerRef.current) clearInterval(theoryTimerRef.current);
          handleSubmitTheory(index, '');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmitTheory = async (index: number, text?: string) => {
    if (theoryTimerRef.current) clearInterval(theoryTimerRef.current);
    setTheoryModalOpen(false);
    const answer = text !== undefined ? text : theoryText;
    const q = exam.theoryQuestions[index];
    if (q && exam.sessionId) {
      exam.setTheoryAnswer(q.id, answer);
      try {
        await submitTheory(exam.sessionId, q.id, answer);
        
        // If first theory is done and there's a second one, show it
        if (index === 0 && exam.theoryQuestions.length > 1 && !theory2ShownRef.current) {
          theory2ShownRef.current = true;
          setTimeout(() => showTheory(1), 500);
          return;
        }
        // If all theories answered, finish exam
        if (index === 1 || exam.theoryQuestions.length === 1) {
          handleAutoSubmit();
          return;
        }
      } catch {
        // silent fail, answer saved locally
      }
    }
  };

  const fetchBatch = async () => {
    if (!exam.sessionId) return;
    try {
      const data = await getNextBatch(exam.sessionId);
      if (data.finished) {
        handleAutoSubmit();
        return;
      }
      exam.setCurrentBatch(data.questions || [], data.difficulty || 'Easy');
    } catch (err: any) {
      toast.error('Failed to fetch questions');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption || !exam.sessionId) return;
    const question = exam.currentBatch[exam.currentQuestionIndex];
    if (!question) return;

    setSubmitting(true);
    try {
      const data = await submitAnswer(exam.sessionId, question.id, selectedOption);
      exam.addMcqResponse({
        questionId: question.id,
        selectedOption,
        isCorrect: data.is_correct,
      });
      exam.addAnsweredQuestionId(question.id);
      exam.incrementQuestionsAnswered();
      setSelectedOption(null);

      if (exam.questionsAnswered >= 15) {
        // All MCQs answered, show theory questions instead of finishing
        return;
      }

      // Move to next question in batch or fetch new batch
      if (exam.currentQuestionIndex + 1 < exam.currentBatch.length) {
        exam.setCurrentQuestionIndex(exam.currentQuestionIndex + 1);
      } else {
        await fetchBatch();
      }
    } catch {
      toast.error('Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishExam = async () => {
    handleAutoSubmit();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const difficultyColor = (d: string) => {
    if (d === 'Easy') return 'bg-difficulty-easy/10 text-difficulty-easy border-difficulty-easy/30';
    if (d === 'Medium') return 'bg-difficulty-medium/10 text-difficulty-medium border-difficulty-medium/30';
    return 'bg-difficulty-hard/10 text-difficulty-hard border-difficulty-hard/30';
  };

  const currentQuestion = exam.currentBatch[exam.currentQuestionIndex];
  const progress = (exam.questionsAnswered / exam.totalMcqQuestions) * 100;

  if (!currentQuestion && !exam.isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background no-select">
      {/* Header bar */}
      <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`font-mono text-xs ${difficultyColor(exam.currentDifficulty)}`}>
              <Zap className="w-3 h-3 mr-1" />
              {exam.currentDifficulty}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {exam.techStackName}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="text-muted-foreground">ID: <span className="font-mono font-semibold text-foreground">{student?.student_id}</span></p>
              <p className="text-foreground font-semibold">{student?.name}</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-mono">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className={exam.violations > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                {exam.violations}/3
              </span>
            </div>
            <div className={`flex items-center gap-1.5 font-mono text-sm font-semibold ${
              timeRemaining < 60 ? 'text-destructive animate-pulse-glow' : 'text-foreground'
            }`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">
            Question {exam.questionsAnswered + 1} of {exam.totalMcqQuestions}
          </p>
        </div>
      </div>

      {/* Question */}
      <div className="exam-container animate-slide-up">
        {currentQuestion && (
          <Card className="glass-card mt-6">
            <CardContent className="pt-6">
              <p className="text-lg font-medium mb-6 leading-relaxed">{currentQuestion.question}</p>

              <div className="space-y-3">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(opt)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedOption === opt
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30 bg-card'
                    }`}
                  >
                    <span className="font-mono text-xs text-muted-foreground mr-3">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleFinishExam}>
                  Finish Exam
                </Button>
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOption || submitting}
                >
                  {submitting ? 'Submitting...' : 'Next'}
                  {!submitting && <ChevronRight className="ml-1 w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Theory Modal */}
      <Dialog open={theoryModalOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Theory Question</DialogTitle>
            <DialogDescription>
              Time remaining: {theoryTimerSec}s — Answer will auto-submit when time runs out.
            </DialogDescription>
          </DialogHeader>
          {activeTheoryIndex !== null && exam.theoryQuestions[activeTheoryIndex] && (
            <div className="space-y-4">
              <p className="text-sm font-medium leading-relaxed">
                {exam.theoryQuestions[activeTheoryIndex].question}
              </p>
              <Textarea
                value={theoryText}
                onChange={(e) => setTheoryText(e.target.value)}
                placeholder="Type your answer here..."
                rows={6}
                className="resize-none"
              />
              <Button
                onClick={() => handleSubmitTheory(activeTheoryIndex, theoryText)}
                className="w-full"
              >
                Submit Answer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
