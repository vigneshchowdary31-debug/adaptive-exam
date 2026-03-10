import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getTechStacks, addTechStack, removeTechStack, scheduleExam, getExamSchedule, addStudents } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Calendar, Users, Layers, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TechStack {
    id: string;
    name: string;
}

export function AdminCreateTest() {
    // Schedule State
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [currentSchedule, setCurrentSchedule] = useState<{ start_time: string; end_time: string } | null>(null);
    const [scheduling, setScheduling] = useState(false);

    // Stacks State
    const [stacks, setStacks] = useState<TechStack[]>([]);
    const [newStackName, setNewStackName] = useState('');

    // Students State
    const [studentInput, setStudentInput] = useState('');
    const [addingStudents, setAddingStudents] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [scheduleData, stacksData] = await Promise.all([
                getExamSchedule(),
                getTechStacks()
            ]);
            if (scheduleData) setCurrentSchedule(scheduleData);
            setStacks(stacksData || []);
        } catch (error) {
            console.error("Failed to load initial data", error);
        }
    };

    const loadStacks = async () => {
        const data = await getTechStacks();
        setStacks(data || []);
    };

    // --- Handlers ---

    const handleSchedule = async () => {
        if (!startTime || !endTime) {
            toast.error('Please fill both start and end times');
            return;
        }
        setScheduling(true);
        try {
            await scheduleExam(new Date(startTime).toISOString(), new Date(endTime).toISOString());
            toast.success('Exam scheduled successfully');
            setCurrentSchedule({ start_time: new Date(startTime).toISOString(), end_time: new Date(endTime).toISOString() });
        } catch {
            toast.error('Failed to schedule exam');
        } finally {
            setScheduling(false);
        }
    };

    const handleAddStack = async () => {
        if (!newStackName.trim()) return;
        try {
            await addTechStack(newStackName.trim());
            setNewStackName('');
            toast.success('Tech stack added');
            loadStacks();
        } catch {
            toast.error('Failed to add tech stack');
        }
    };

    const handleRemoveStack = async (id: string) => {
        try {
            await removeTechStack(id);
            toast.success('Tech stack removed');
            loadStacks();
        } catch {
            toast.error('Failed to remove tech stack');
        }
    };

    const handleAddStudents = async () => {
        if (!studentInput.trim()) {
            toast.error('Please enter student details');
            return;
        }

        setAddingStudents(true);
        try {
            // Parse input: format expected is "studentId,Student Name" per line
            const lines = studentInput.split('\n').filter(line => line.trim() !== '');
            const parsedStudents = lines.map(line => {
                // Split by comma or tab
                const parts = line.split(/[,|\t]+/).map(p => p.trim());
                if (parts.length >= 2) {
                    return { student_id: parts[0], name: parts.slice(1).join(' ') };
                }
                return null;
            }).filter((s): s is { student_id: string; name: string } => s !== null && s.student_id !== '' && s.name !== '');

            if (parsedStudents.length === 0) {
                toast.error('No valid students found. Ensure format is "ID, Name" per line.');
                setAddingStudents(false);
                return;
            }

            await addStudents(parsedStudents);
            toast.success(`Successfully added ${parsedStudents.length} students`);
            setStudentInput(''); // Clear input on success
        } catch (error: any) {
            // Handle unique constraint violations gracefully
            if (error?.code === '23505') {
                toast.error('One or more students already exist in the database with that ID.');
            } else {
                toast.error('Failed to add students. Check for invalid format or duplicates.');
            }
            console.error(error);
        } finally {
            setAddingStudents(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Schedule Section */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Schedule Test Window</CardTitle>
                    <CardDescription>Define the time window during which students can take the exam.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {currentSchedule && (
                        <Alert className="bg-primary/5 border-primary/20 text-primary">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Current Schedule:</strong> {new Date(currentSchedule.start_time).toLocaleString()} → {new Date(currentSchedule.end_time).toLocaleString()}
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                        </div>
                    </div>
                    <Button onClick={handleSchedule} disabled={scheduling} className="w-full md:w-auto">
                        {scheduling ? 'Scheduling...' : 'Set Schedule'}
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tech Stacks Section */}
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5 text-primary" /> Manage Tech Stacks</CardTitle>
                        <CardDescription>Add or remove available tech stacks for the exam.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input value={newStackName} onChange={(e) => setNewStackName(e.target.value)} placeholder="New tech stack name" onKeyDown={(e) => e.key === 'Enter' && handleAddStack()} />
                            <Button onClick={handleAddStack} size="icon"><Plus className="w-4 h-4" /></Button>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {stacks.length > 0 ? stacks.map((s) => (
                                <div key={s.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
                                    <span className="text-sm font-medium">{s.name}</span>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveStack(s.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No tech stacks added yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Add Students Section */}
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Add Students</CardTitle>
                        <CardDescription>Bulk add eligible students for the test.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="students">Enter students (1 per line)</Label>
                            <p className="text-xs text-muted-foreground mb-2">Format: <code>Student ID, Student Name</code></p>
                            <Textarea
                                id="students"
                                placeholder={`24CS01, John Doe\n24CS02, Jane Smith`}
                                className="min-h-[220px] font-mono text-sm resize-none"
                                value={studentInput}
                                onChange={(e) => setStudentInput(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleAddStudents} disabled={addingStudents || !studentInput.trim()} className="w-full">
                            {addingStudents ? 'Adding Students...' : 'Add Students'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
