import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getResults, getTechStacks } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { Download, Eye } from 'lucide-react';

interface ResultRow {
  id: string;
  mcq_score: number;
  theory_score: number;
  total_score: number;
  assigned_tier: string;
  students: { student_id: string; name: string };
  tech_stacks: { name: string };
  correct_easy: number;
  correct_medium: number;
  correct_hard: number;
  mcq_answers: { question: string; selected_option: string | null; correct_option: string; is_correct: boolean; difficulty: string }[];
  theory_answers: { question: string; answer: string }[];
  violations: number;
}

export function AdminResults() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [stacks, setStacks] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getTechStacks().then((d) => setStacks(d || []));
    loadResults();
  }, []);

  const loadResults = async (stackId?: string) => {
    const data = await getResults(stackId === 'all' ? undefined : stackId);
    const basicResults = (data as any) || [];

    // Fetch detailed data for each result
    const detailedResults = await Promise.all(
      basicResults.map(async (result: any) => {
        const studentId = result.student_id;

        // Fetch responses with question difficulties and details
        const { data: responses } = await supabase
          .from('responses')
          .select(`
            is_correct,
            selected_option,
            questions!inner(question, correct_option, difficulty)
          `)
          .eq('student_id', studentId);

        // Count correct by difficulty and map MCQ answers
        const correctCounts = { easy: 0, medium: 0, hard: 0 };
        const mcqAnswers = (responses || []).map((r: any) => {
          const diff = r.questions.difficulty.toLowerCase();
          if (r.is_correct && correctCounts.hasOwnProperty(diff)) {
            correctCounts[diff as keyof typeof correctCounts]++;
          }
          return {
            question: r.questions.question,
            selected_option: r.selected_option,
            correct_option: r.questions.correct_option,
            is_correct: r.is_correct,
            difficulty: r.questions.difficulty,
          };
        });

        // Fetch theory answers
        const { data: theoryData } = await supabase
          .from('theory_responses')
          .select(`
            answer_text,
            theory_questions!inner(question)
          `)
          .eq('student_id', studentId);

        const theoryAnswers = theoryData?.map((t: any) => ({
          question: t.theory_questions.question,
          answer: t.answer_text || 'No answer provided',
        })) || [];

        // Fetch violations
        const { data: session } = await supabase
          .from('exam_sessions')
          .select('violations')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...result,
          correct_easy: correctCounts.easy,
          correct_medium: correctCounts.medium,
          correct_hard: correctCounts.hard,
          mcq_answers: mcqAnswers,
          theory_answers: theoryAnswers,
          violations: session?.violations || 0,
        };
      })
    );

    setResults(detailedResults);
  };

  const handleFilterChange = (val: string) => {
    setFilter(val);
    loadResults(val);
  };

  const tierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      P1: 'bg-tier-p1/10 text-tier-p1 border-tier-p1/30',
      P2: 'bg-tier-p2/10 text-tier-p2 border-tier-p2/30',
      P3: 'bg-tier-p3/10 text-tier-p3 border-tier-p3/30',
    };
    return colors[tier] || '';
  };

  const exportCSV = async () => {
    const headers = ['Student ID', 'Name', 'Tech Stack', 'Easy', 'Medium', 'Hard', 'Theory Score', 'Total Score', 'Tab Switch Count', 'Tier'];
    const rows = results.map((r) => [
      r.students.student_id,
      r.students.name,
      r.tech_stacks.name,
      r.correct_easy,
      r.correct_medium,
      r.correct_hard,
      r.theory_score,
      r.total_score,
      r.violations,
      r.assigned_tier,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Student Results</CardTitle>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by stack" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tech Stacks</SelectItem>
              {stacks.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Tech Stack</TableHead>
              <TableHead>Easy</TableHead>
              <TableHead>Medium</TableHead>
              <TableHead>Hard</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Tab Switch Count</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.students.student_id}</TableCell>
                <TableCell>{r.students.name}</TableCell>
                <TableCell>{r.tech_stacks.name}</TableCell>
                <TableCell>{r.correct_easy}</TableCell>
                <TableCell>{r.correct_medium}</TableCell>
                <TableCell>{r.correct_hard}</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Details - {r.students.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        {r.mcq_answers.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              MCQ Responses
                              <Badge variant="secondary">{r.mcq_score} points</Badge>
                            </h3>
                            {r.mcq_answers.map((mcq, idx) => (
                              <div key={idx} className={`p-4 rounded-lg border \${mcq.is_correct ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                <p className="font-medium mb-2">Q: {mcq.question} <Badge variant="outline" className="ml-2">{mcq.difficulty}</Badge></p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground block">Selected Option:</span>
                                    <span className={`font-semibold \${mcq.is_correct ? 'text-green-500' : 'text-red-500'}`}>
                                      {mcq.selected_option || 'Not answered'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground block">Correct Option:</span>
                                    <span className="font-semibold text-green-500">{mcq.correct_option}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {r.theory_answers.length > 0 && (
                          <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              Theory Responses
                              <Badge variant="secondary">{r.theory_score} points</Badge>
                            </h3>
                            {r.theory_answers.map((ta, idx) => (
                              <div key={idx} className="bg-muted/50 p-4 rounded-lg">
                                <p className="font-medium mb-3">Q: {ta.question}</p>
                                <Textarea
                                  value={ta.answer}
                                  readOnly
                                  rows={4}
                                  className="resize-none bg-background"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        {r.mcq_answers.length === 0 && r.theory_answers.length === 0 && (
                          <p className="text-muted-foreground text-center py-4">No responses found for this student.</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
                <TableCell>{r.violations}</TableCell>
                <TableCell className="font-semibold">{r.total_score}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={tierBadge(r.assigned_tier)}>
                    {r.assigned_tier}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {results.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No results yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
