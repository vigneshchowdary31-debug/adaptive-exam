import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTechStacks, addTechStack, removeTechStack } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface TechStack {
  id: string;
  name: string;
}

export function AdminTechStacks() {
  const [stacks, setStacks] = useState<TechStack[]>([]);
  const [newName, setNewName] = useState('');

  const loadStacks = async () => {
    const data = await getTechStacks();
    setStacks(data || []);
  };

  useEffect(() => { loadStacks(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addTechStack(newName.trim());
      setNewName('');
      toast.success('Tech stack added');
      loadStacks();
    } catch {
      toast.error('Failed to add');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeTechStack(id);
      toast.success('Removed');
      loadStacks();
    } catch {
      toast.error('Failed to remove');
    }
  };

  return (
    <Card className="glass-card max-w-lg">
      <CardHeader>
        <CardTitle>Manage Tech Stacks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New tech stack name" />
          <Button onClick={handleAdd} size="icon"><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-2">
          {stacks.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm font-medium">{s.name}</span>
              <Button variant="ghost" size="icon" onClick={() => handleRemove(s.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
