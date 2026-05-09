// Типы для аналитики

export interface ChartDataPoint {
  seconds: number;
  flow: number;
  pressure: number;
}

export interface CirculationChartData {
  seconds: number[];
  flows: number[];
  pressures: number[];
  targetFlow: number;
  targetReachedSec: number | null;
  flowAngle: number;
  pressAngle: number;
  qualityScore: number;
  surgeZoneSeconds: number;
}

export interface DepthProgressData {
  hours: number[];
  depths_bottom: number[];
  depths_bit: number[];
  total_hours: number;
}

export interface StartupOnProgress {
  startup_number: number;
  depth_bottom: number;
  depth_bit: number;
  time_hours: number;
  quality_score: number;
}

export interface WellProgressResponse {
  progress: DepthProgressData;
  startups: StartupOnProgress[];
}

export interface FilterState {
  qualityMin: number;
  depthMin: number;
  depthMax: number;
  timeMinHours: number;
  timeMaxHours: number;
}

export interface SavedFilter {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  filter: FilterState;
}

export interface CirculationAnalysisResult {
  startup_number: number;
  timestamp: string;
  depth_bottom: number;
  depth_bit: number;
  target_reached_sec: number | null;
  delta_t_sec: number | null;
  flow_angle: number;
  press_angle: number;
  overshoot_pct: number;
  quality_score: number;
}

export interface CirculationAnalysisResponse {
  well_id: number;
  well_name: string;
  target_flow: number;
  total_startups: number;
  successful_startups: number;
  avg_quality_score: number;
  results: CirculationAnalysisResult[];
}

export interface StartupChartDataResponse {
  startup_number: number;
  timestamp: string;
  depth_bottom: number;
  depth_bit: number;
  quality_score: number;
  seconds: number[];
  flows: number[];
  pressures: number[];
  surge_seconds: number[];
  surge_flows: number[];
  surge_pressures: number[];
  flow_trend: number[];
  press_trend: number[];
  target_flow: number;
  target_reached_sec: number | null;
  flow_angle: number;
  press_angle: number;
}