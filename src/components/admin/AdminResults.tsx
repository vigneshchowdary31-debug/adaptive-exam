import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getResults, getTechStacks } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { Download } from 'lucide-react';

interface ResultRow {
  id: string;
  mcq_score: number;
  theory_score: number;
  total_score: number;
  assigned_tier: string;
  students: { student_id: string; name: string };
  tech_stacks: { name: string };
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
    setResults((data as any) || []);
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
    // Fetch violations from exam_sessions
    const studentIds = results.map(r => r.students.student_id);
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('student_id, violations, students!inner(student_id)')
      .in('student_id', results.map(r => {
        // need the UUID, get from a join - simplify by using result data
        return r.id; // placeholder
      }));

    const headers = ['Student ID', 'Name', 'Tech Stack', 'MCQ Score', 'Theory Score', 'Total Score', 'Tier'];
    const rows = results.map((r) => [
      r.students.student_id,
      r.students.name,
      r.tech_stacks.name,
      r.mcq_score,
      r.theory_score,
      r.total_score,
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
              <TableHead>MCQ</TableHead>
              <TableHead>Theory</TableHead>
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
                <TableCell>{r.mcq_score}%</TableCell>
                <TableCell>{r.theory_score}%</TableCell>
                <TableCell className="font-semibold">{r.total_score}%</TableCell>
                <TableCell>
                  <Badge variant="outline" className={tierBadge(r.assigned_tier)}>
                    {r.assigned_tier}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {results.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
