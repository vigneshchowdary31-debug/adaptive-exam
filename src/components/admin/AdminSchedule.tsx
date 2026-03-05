import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { scheduleExam, getExamSchedule } from '@/lib/api';
import { toast } from 'sonner';

export function AdminSchedule() {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [current, setCurrent] = useState<{ start_time: string; end_time: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getExamSchedule().then((data) => {
      if (data) setCurrent(data);
    });
  }, []);

  const handleSchedule = async () => {
    if (!startTime || !endTime) {
      toast.error('Please fill both fields');
      return;
    }
    setLoading(true);
    try {
      await scheduleExam(new Date(startTime).toISOString(), new Date(endTime).toISOString());
      toast.success('Exam scheduled successfully');
      setCurrent({ start_time: new Date(startTime).toISOString(), end_time: new Date(endTime).toISOString() });
    } catch {
      toast.error('Failed to schedule exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card max-w-lg">
      <CardHeader>
        <CardTitle>Schedule Exam Window</CardTitle>
        <CardDescription>Students can only start exams within this window.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {current && (
          <div className="p-3 rounded-lg bg-muted text-sm">
            <p>Current: {new Date(current.start_time).toLocaleString()} → {new Date(current.end_time).toLocaleString()}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSchedule} disabled={loading} className="w-full">
          {loading ? 'Scheduling...' : 'Set Schedule'}
        </Button>
      </CardContent>
    </Card>
  );
}
