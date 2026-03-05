import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTechStacks, uploadQuestions } from '@/lib/api';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

export function AdminQuestions() {
  const [stacks, setStacks] = useState<{ id: string; name: string }[]>([]);
  const [selectedStack, setSelectedStack] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTechStacks().then((d) => setStacks(d || []));
  }, []);

  const handleUpload = async () => {
    if (!selectedStack || !jsonInput.trim()) {
      toast.error('Select a tech stack and provide JSON');
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      const mcqs = parsed.mcq || parsed.questions || parsed.mcqs || [];
      const theories = parsed.theory || parsed.theory_questions || [];
      setLoading(true);
      await uploadQuestions(selectedStack, mcqs, theories);
      toast.success('Questions uploaded');
      setJsonInput('');
    } catch (err: any) {
      toast.error(err.message || 'Invalid JSON');
    } finally {
      setLoading(false);
    }
  };

  const sampleJson = `{
  "mcq": [
    {
      "question": "What is React?",
      "options": ["Library", "Framework", "Language", "Database"],
      "correct_option": "Library",
      "difficulty": "Easy"
    }
  ],
  "theory": [
    { "question": "Explain virtual DOM." }
  ]
}`;

  return (
    <Card className="glass-card max-w-2xl">
      <CardHeader>
        <CardTitle>Upload Questions</CardTitle>
        <CardDescription>Upload MCQ and theory questions as JSON for a tech stack.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tech Stack</Label>
          <Select value={selectedStack} onValueChange={setSelectedStack}>
            <SelectTrigger><SelectValue placeholder="Select tech stack" /></SelectTrigger>
            <SelectContent>
              {stacks.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Questions JSON</Label>
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={sampleJson}
            rows={12}
            className="font-mono text-xs"
          />
        </div>

        <Button onClick={handleUpload} disabled={loading} className="w-full">
          <Upload className="w-4 h-4 mr-2" />
          {loading ? 'Uploading...' : 'Upload Questions'}
        </Button>
      </CardContent>
    </Card>
  );
}
