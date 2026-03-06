import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useExamStore } from '@/stores/examStore';
import { useAuthStore } from '@/stores/authStore';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { useExamTimer } from '@/hooks/useExamTimer';
import { getNextBatch, submitAnswer, submitTheory, finishExam } from '@/lib/api';
import { toast } from 'sonner';
import { Clock, Shield, Zap, ChevronRight, BookOpen } from 'lucide-react';

export default function ExamPage() {
  const navigate = useNavigate();
  const { student } = useAuthStore();
  const exam = useExamStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isTheoryPhase, setIsTheoryPhase] = useState(false);
  const [activeTheoryIndex, setActiveTheoryIndex] = useState<number>(0);
  const [theoryText, setTheoryText] = useState('');

  const totalQuestions = exam.totalMcqQuestions + (exam.theoryQuestions.length || 2);
  const displayQuestionNumber = isTheoryPhase ? exam.totalMcqQuestions + activeTheoryIndex + 1 : exam.questionsAnswered + 1;
  const displayProgress = (displayQuestionNumber / totalQuestions) * 100;

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

  // Transition to theory phase after finishing MCQs
  useEffect(() => {
    if (exam.questionsAnswered >= exam.totalMcqQuestions) {
      if (exam.theoryQuestions.length > 0) {
        setIsTheoryPhase(true);
      } else {
        handleAutoSubmit();
      }
    }
  }, [exam.questionsAnswered, exam.totalMcqQuestions, exam.theoryQuestions, handleAutoSubmit]);

  // Force theory phase when 2.5 minutes are remaining
  useEffect(() => {
    if (timeRemaining <= 150 && !isTheoryPhase && exam.theoryQuestions.length > 0 && !exam.isFinished) {
      setIsTheoryPhase(true);
      toast.info('MCQ time is up. Moving to Theory Section.');
    }
  }, [timeRemaining, isTheoryPhase, exam.theoryQuestions.length, exam.isFinished]);

  const handleSubmitTheory = async () => {
    if (!exam.sessionId) return;

    setSubmitting(true);
    const q = exam.theoryQuestions[activeTheoryIndex];
    if (q) {
      exam.setTheoryAnswer(q.id, theoryText);
      try {
        await submitTheory(exam.sessionId, q.id, theoryText);

        if (activeTheoryIndex + 1 < exam.theoryQuestions.length) {
          setActiveTheoryIndex(activeTheoryIndex + 1);
          setTheoryText('');
        } else {
          handleAutoSubmit();
        }
      } catch {
        toast.error('Failed to submit theory answer');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const fetchBatch = async () => {
    if (!exam.sessionId) return;
    try {
      const data = await getNextBatch(exam.sessionId);
      if (data.finished || (data.questions && data.questions.length === 0)) {
        if (exam.theoryQuestions.length > 0) {
          setIsTheoryPhase(true);
        } else {
          handleAutoSubmit();
        }
        return;
      }
      exam.setCurrentBatch(data.questions || [], data.difficulty || 'Easy');

      if (exam.questionsAnswered > 0) {
        toast.success(`Batch Completed! Score so far: ${data.current_score || 0}. Next Difficulty: ${data.difficulty || 'Easy'}`);
      }
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

      // We check if it triggers theory in the useEffect, but we also can handle moving here
      if (exam.questionsAnswered + 1 >= exam.totalMcqQuestions) {
        if (exam.theoryQuestions.length > 0) {
          setIsTheoryPhase(true);
        }
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

  if (!isTheoryPhase && !currentQuestion && !exam.isFinished) {
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
            {!isTheoryPhase ? (
              <Badge variant="outline" className={`font-mono text-xs ${difficultyColor(exam.currentDifficulty)}`}>
                <Zap className="w-3 h-3 mr-1" />
                {exam.currentDifficulty}
              </Badge>
            ) : (
              <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/30">
                <BookOpen className="w-3 h-3 mr-1" />
                Theory
              </Badge>
            )}

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
            <div className={`flex items-center gap-1.5 font-mono text-sm font-semibold ${timeRemaining < 60 ? 'text-destructive animate-pulse-glow' : 'text-foreground'
              }`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-2">
          <Progress value={displayProgress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">
            Question {displayQuestionNumber} of {totalQuestions}
          </p>
        </div>
      </div>

      {/* Question Area */}
      <div className="exam-container animate-slide-up">
        {isTheoryPhase && exam.theoryQuestions[activeTheoryIndex] ? (
          <Card className="glass-card mt-6">
            <CardContent className="pt-6">
              <p className="text-lg font-medium mb-6 leading-relaxed">
                {exam.theoryQuestions[activeTheoryIndex].question}
              </p>

              <div className="space-y-4">
                <Textarea
                  value={theoryText}
                  onChange={(e) => setTheoryText(e.target.value)}
                  placeholder="Type your detailed answer here..."
                  rows={8}
                  className="resize-none text-base p-4"
                />
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleFinishExam}>
                  Finish Exam
                </Button>
                <Button
                  onClick={handleSubmitTheory}
                  disabled={submitting || theoryText.trim().length === 0}
                >
                  {submitting ? 'Submitting...' : activeTheoryIndex === exam.theoryQuestions.length - 1 ? 'Finish' : 'Next'}
                  {!submitting && <ChevronRight className="ml-1 w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : currentQuestion ? (
          <Card className="glass-card mt-6">
            <CardContent className="pt-6">
              <p className="text-lg font-medium mb-6 leading-relaxed">{currentQuestion.question}</p>

              <div className="space-y-3">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => !submitting && setSelectedOption(opt)}
                    disabled={submitting}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedOption === opt
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30 bg-card'
                      } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        ) : null}
      </div>
    </div>
  );
}
