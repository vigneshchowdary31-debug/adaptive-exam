import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getResults, getTechStacks } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface StackTierData {
    stackName: string;
    P1: number;
    P2: number;
    P3: number;
    total: number;
}

export function AdminAnalytics() {
    const [chartData, setChartData] = useState<StackTierData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            const [resultsData, stacksData] = await Promise.all([
                getResults(),
                getTechStacks()
            ]);

            const results = (resultsData as any) || [];
            const stacks = stacksData || [];

            // Initialize counts for each stack
            const groupedData: Record<string, StackTierData> = {};
            stacks.forEach(stack => {
                groupedData[stack.id] = {
                    stackName: stack.name,
                    P1: 0,
                    P2: 0,
                    P3: 0,
                    total: 0
                };
            });

            // Populate counts from results
            results.forEach((r: any) => {
                const stackId = r.tech_stack_id;
                const tier = r.assigned_tier as 'P1' | 'P2' | 'P3';

                if (groupedData[stackId] && (tier === 'P1' || tier === 'P2' || tier === 'P3')) {
                    groupedData[stackId][tier] += 1;
                    groupedData[stackId].total += 1;
                }
            });

            // Convert to array for Recharts
            const formattedData = Object.values(groupedData).sort((a, b) => a.stackName.localeCompare(b.stackName));
            setChartData(formattedData);
        } catch (error) {
            console.error("Error fetching analytics data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Analytics</CardTitle>
                    <CardDescription>Loading tier distribution data...</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </CardContent>
            </Card>
        );
    }

    const grandTotalP1 = chartData.reduce((acc, curr) => acc + curr.P1, 0);
    const grandTotalP2 = chartData.reduce((acc, curr) => acc + curr.P2, 0);
    const grandTotalP3 = chartData.reduce((acc, curr) => acc + curr.P3, 0);
    const grandTotal = chartData.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle>Tier Distribution Analytics</CardTitle>
                <CardDescription>Number of P1, P2, and P3 students per Tech Stack</CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length > 0 ? (
                    <div className="w-full mt-4 border rounded-md overflow-hidden shadow-sm">
                        <Table className="border-collapse">
                            <TableHeader className="bg-[#8ea4c8] hover:bg-[#8ea4c8] dark:bg-slate-700">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="font-semibold text-white dark:text-slate-200 italic border-r border-[#9fb3d4] dark:border-slate-600 h-10">Tech Stack</TableHead>
                                    <TableHead className="text-right font-semibold text-white dark:text-slate-200 border-r border-[#9fb3d4] dark:border-slate-600 h-10 w-24">P1</TableHead>
                                    <TableHead className="text-right font-semibold text-white dark:text-slate-200 border-r border-[#9fb3d4] dark:border-slate-600 h-10 w-24">P2</TableHead>
                                    <TableHead className="text-right font-semibold text-white dark:text-slate-200 border-r border-[#9fb3d4] dark:border-slate-600 h-10 w-24">P3</TableHead>
                                    <TableHead className="text-right font-semibold text-white dark:text-slate-200 h-10 w-32">Grand Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {chartData.map((data, index) => (
                                    <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium border-r bg-muted/10 py-2">{data.stackName}</TableCell>
                                        <TableCell className="text-right border-r py-2">{data.P1 || ''}</TableCell>
                                        <TableCell className="text-right border-r py-2">{data.P2 || ''}</TableCell>
                                        <TableCell className="text-right border-r py-2">{data.P3 || ''}</TableCell>
                                        <TableCell className="text-right bg-muted/5 font-medium py-2">{data.total || ''}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-muted/30 border-t-[3px] border-double border-border font-bold hover:bg-muted/30">
                                    <TableCell className="border-r py-3">Grand Total</TableCell>
                                    <TableCell className="text-right border-r py-3">{grandTotalP1 || ''}</TableCell>
                                    <TableCell className="text-right border-r py-3">{grandTotalP2 || ''}</TableCell>
                                    <TableCell className="text-right border-r py-3">{grandTotalP3 || ''}</TableCell>
                                    <TableCell className="text-right bg-muted/10 py-3">{grandTotal || ''}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        No data available to display analytics.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
