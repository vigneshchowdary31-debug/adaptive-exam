import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface TierSetting {
    tier: string;
    min_score: number;
}

export function AdminSettings() {
    const [settings, setSettings] = useState<TierSetting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('tier_settings' as any)
                .select('*')
                .order('tier');

            if (error) throw error;
            setSettings((data as any) || []);
        } catch (error: any) {
            console.error('Error fetching tier settings:', error);
            toast.error('Failed to load tier settings.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleScoreChange = (tier: string, value: string) => {
        const numValue = value === '' ? 0 : parseInt(value);
        if (isNaN(numValue)) return;

        setSettings(prev => {
            const exists = prev.find(s => s.tier === tier);
            if (exists) {
                return prev.map(s => s.tier === tier ? { ...s, min_score: numValue } : s);
            }
            return [...prev, { tier, min_score: numValue }];
        });
    };

    const saveSettings = async () => {
        try {
            setIsSaving(true);

            // Update each setting individually since we only have UPDATE permissions on the table
            const updatePromises = settings.map(setting =>
                supabase
                    .from('tier_settings' as any)
                    .update({ min_score: setting.min_score })
                    .eq('tier', setting.tier)
            );

            const results = await Promise.all(updatePromises);

            // Check for any errors in the parallel updates
            const error = results.find(result => result.error)?.error;
            if (error) throw error;

            // Recalculate historical tiers
            // @ts-ignore
            const { error: rpcError } = await supabase.rpc('recalculate_all_tiers');
            if (rpcError) {
                console.error('Error recalculating tiers:', rpcError);
                toast.error('Cutoffs updated, but failed to recalculate historical data.');
            } else {
                toast.success('Tier cutoffs updated. Refreshing data...');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error: any) {
            console.error('Error updating tier settings:', error);
            toast.error('Failed to update tier cutoffs.');
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to find specific tier score
    const getScore = (tier: string) => settings.find(s => s.tier === tier)?.min_score ?? 0;

    if (isLoading) {
        return <div className="text-center py-8">Loading settings...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tier Classification Settings</CardTitle>
                <CardDescription>
                    Configure the minimum score required for each performance tier. Total possible MCQ score is 30 points (5 Easy = 5, 5 Medium = 10, 5 Hard = 15).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 max-w-sm">
                    <div className="space-y-2">
                        <Label htmlFor="p1-score">P1 Minimum Score (Higher than this)</Label>
                        <Input
                            id="p1-score"
                            type="number"
                            value={getScore('P1')}
                            onChange={(e) => handleScoreChange('P1', e.target.value)}
                            min={0}
                            max={30}
                        />
                        <p className="text-xs text-muted-foreground">Example: If set to 22, score must be &gt; 22.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="p2-score">P2 Minimum Score (Higher than this)</Label>
                        <Input
                            id="p2-score"
                            type="number"
                            value={getScore('P2')}
                            onChange={(e) => handleScoreChange('P2', e.target.value)}
                            min={0}
                            max={30}
                        />
                        <p className="text-xs text-muted-foreground">Example: If set to 15, score must be &gt; 15 and &lt;= P1 cutoff.</p>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                        Scores not meeting the P2 minimum will automatically be assigned P3.
                    </div>
                </div>

                <Button onClick={saveSettings} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Cutoffs'}
                </Button>
            </CardContent>
        </Card>
    );
}
