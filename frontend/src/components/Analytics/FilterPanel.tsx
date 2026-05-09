import React from 'react';
import { Paper, Box, Typography, Slider, Stack, Button, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

interface FilterState {
  qualityMin: number;
  depthMin: number;
  depthMax: number;
  timeMinDays: number;
  timeMaxDays: number;
}

interface SavedFilter {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  filter: FilterState;
}

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onSaveFilter: () => void;
  onClearFilters: () => void;
  savedFilters: SavedFilter[];
  onApplyFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (id: number) => void;
  depthRange: [number, number];
  timeRange: [number, number];
  totalStartups: number;
  filteredCount: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  onSaveFilter,
  onClearFilters,
  savedFilters,
  onApplyFilter,
  onDeleteFilter,
  depthRange,
  timeRange,
  totalStartups,
  filteredCount
}) => {
  const [showHistory, setShowHistory] = React.useState(false);

  const handleQualityChange = (_: Event, value: number | number[]) => {
    onFilterChange({ ...filters, qualityMin: value as number });
  };

  const handleDepthChange = (_: Event, value: number | number[]) => {
    const [min, max] = value as number[];
    onFilterChange({ ...filters, depthMin: min, depthMax: max });
  };

  const handleTimeChange = (_: Event, value: number | number[]) => {
    const [min, max] = value as number[];
    onFilterChange({ ...filters, timeMinDays: min, timeMaxDays: max });
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          <FilterAltIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Фильтры
        </Typography>
        <Box>
          <Button size="small" startIcon={<HistoryIcon />} onClick={() => setShowHistory(!showHistory)}>
            История ({savedFilters.length})
          </Button>
          <Button size="small" onClick={onClearFilters} color="error">
            Сбросить всё
          </Button>
        </Box>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="textSecondary">
            Качество (%)
          </Typography>
          <Slider
            value={filters.qualityMin}
            onChange={handleQualityChange}
            min={0}
            max={100}
            step={5}
            valueLabelDisplay="auto"
            sx={{ mt: 1 }}
          />
        </Box>
        <Box sx={{ flex: 2 }}>
          <Typography variant="caption" color="textSecondary">
            Глубина забоя (м)
          </Typography>
          <Slider
            value={[filters.depthMin, filters.depthMax]}
            onChange={handleDepthChange}
            min={depthRange[0]}
            max={depthRange[1]}
            step={10}
            valueLabelDisplay="auto"
            sx={{ mt: 1 }}
          />
        </Box>
        <Box sx={{ flex: 2 }}>
          <Typography variant="caption" color="textSecondary">
            Время (сутки от начала бурения)
          </Typography>
          <Slider
            value={[filters.timeMinDays, filters.timeMaxDays]}
            onChange={handleTimeChange}
            min={timeRange[0]}
            max={timeRange[1]}
            step={0.5}
            valueLabelDisplay="auto"
            disabled={timeRange[1] === 0}
            sx={{ mt: 1 }}
          />
        </Box>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" size="small" onClick={onSaveFilter}>
          💾 Сохранить фильтр
        </Button>
        <Typography variant="caption" color="textSecondary">
          Найдено: {filteredCount} из {totalStartups} запусков
        </Typography>
      </Box>

      {showHistory && savedFilters.length > 0 && (
        <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
          {savedFilters.map((filter) => (
            <Paper
              key={filter.id}
              sx={{
                p: 1.5,
                mb: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => onApplyFilter(filter)}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  {filter.createdAt}
                </Typography>
                <Typography variant="body2">{filter.description}</Typography>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFilter(filter.id);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Paper>
          ))}
        </Box>
      )}
    </Paper>
  );
};
