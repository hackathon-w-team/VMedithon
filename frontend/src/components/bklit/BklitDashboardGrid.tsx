import React from 'react'
import type { Department, DepartmentPrediction, DependencyEdge } from '../../types'
import { BklitWaveChart } from './BklitWaveChart'
import { BklitDonutChart } from './BklitDonutChart'
import { BklitConcentricRings } from './BklitConcentricRings'
import { BklitBarChart } from './BklitBarChart'

interface BklitDashboardGridProps {
  departments: Department[]
  predictions: DepartmentPrediction[]
  edges: DependencyEdge[]
}

export const BklitDashboardGrid: React.FC<BklitDashboardGridProps> = ({
  departments,
  predictions,
  edges,
}) => {
  return (
    <div className="space-y-6">
      {/* 4 Quadrants Matrix matching Bklit reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top-Left: Wave Area Chart */}
        <BklitWaveChart departments={departments} predictions={predictions} />

        {/* Top-Right: Donut Breakdown Chart */}
        <BklitDonutChart departments={departments} />

        {/* Bottom-Left: Concentric Multi-Rings */}
        <BklitConcentricRings departments={departments} predictions={predictions} />

        {/* Bottom-Right: Comparative Grouped Bars */}
        <BklitBarChart departments={departments} />
      </div>
    </div>
  )
}
