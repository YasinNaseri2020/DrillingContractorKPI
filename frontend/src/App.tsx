import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppBar, Toolbar, Typography, IconButton, Container } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Sidebar } from './components/Layout/Sidebar';
import CompaniesPage from './pages/Companies/CompaniesPage';
import ContractorsPage from './pages/Contractors/ContractorsPage';
import OilfieldsPage from './pages/Oilfields/OilfieldsPage';
import PadsPage from './pages/Pads/PadsPage';
import WellsPage from './pages/Wells/WellsPage';
import GTIUploadPage from './pages/GTIUpload/GTIUploadPage';
import CirculationDetail from './pages/Analytics/CirculationDetail/CirculationDetail';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import WellsComparison from './pages/Comparison/WellsComparison';
import TrippingDetail from './pages/Analytics/TrippingDetail/TrippingDetail';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <AppBar position="static" sx={{ bgcolor: '#1a73e8' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => setSidebarOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2 }}>
            🛢️ Drilling Company KPI
          </Typography>
        </Toolbar>
      </AppBar>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/contractors" element={<ContractorsPage />} />
          <Route path="/oilfields" element={<OilfieldsPage />} />
          <Route path="/pads" element={<PadsPage />} />
          <Route path="/wells" element={<WellsPage />} />
          <Route path="/gti" element={<GTIUploadPage />} />
          <Route path='/analytics' element={<AnalyticsPage />} />
          <Route path='/analytics/circulation/:wellId' element={<CirculationDetail />} />
          <Route path="/comparison" element={<WellsComparison />} />
          <Route path="/" element={<CompaniesPage />} />
          <Route path='/analytics/tripping/:wellId' element={<TrippingDetail />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
};

export default App;

