'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { InsightOut } from '@/types';

interface RecommendationListProps {
  insights: InsightOut[];
}

export function RecommendationList({ insights }: RecommendationListProps) {
  const recommendations = insights
    .filter((i) => i.type === 'recommendation')
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.slice(0, 5).map((insight, i) => (
            <div key={insight.id} className="flex gap-3">
              <span className="tabular-nums flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {insight.description}
                </p>
                <div className="mt-1 flex gap-1">
                  {insight.impact && (
                    <Badge variant="outline" className="text-[10px]">
                      Impact: {insight.impact}
                    </Badge>
                  )}
                  {insight.effort && (
                    <Badge variant="outline" className="text-[10px]">
                      Effort: {insight.effort}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
