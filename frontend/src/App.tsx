import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { PageId } from './components/Sidebar';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { Module1Collection } from './pages/Module1Collection';
import { Module2Analysis } from './pages/Module2Analysis';
import { PerformanceVisualization } from './pages/PerformanceVisualization';
import { ReportsDownloads } from './pages/ReportsDownloads';
import { apiService } from './services/api';
import { MetricRecord, ServerMetrics, BottleneckFinding } from './types/api';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [records, setRecords] = useState<MetricRecord[]>([]);
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics | null>(null);
  const [bottlenecks, setBottlenecks] = useState<BottleneckFinding[]>([]);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const isInitialLoad = useRef(true);

  // Dedicated Health Check directly hitting /api/health
  const checkHealthStatus = useCallback(async (): Promise<boolean> => {
    try {
      const health = await apiService.checkHealth();
      const isHealthy = health && health.status === 'healthy';
      setBackendConnected(Boolean(isHealthy));
      return Boolean(isHealthy);
    } catch (err) {
      setBackendConnected(false);
      return false;
    }
  }, []);

  // Fetch SQLite Records & Auto-Seed if Empty
  const fetchRecords = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const isAlive = await checkHealthStatus();
      if (!isAlive) {
        setIsRefreshing(false);
        return;
      }

      const res = await apiService.getRecords(2500);
      let loadedRecords = res.records || [];

      // Academic benchmark guarantee: auto-seed 600 records if database is empty on start
      if (loadedRecords.length === 0 && isInitialLoad.current) {
        console.info('Database empty on initial load. Auto-seeding 600 academic records...');
        await apiService.seedSampleData(600);
        const seededRes = await apiService.getRecords(2500);
        loadedRecords = seededRes.records || [];
      }
      isInitialLoad.current = false;

      setRecords(loadedRecords);

      // Evaluate bottlenecks from backend
      try {
        const bRes = await apiService.getBottlenecks({});
        setBottlenecks(bRes.findings || []);
      } catch (bErr) {
        console.warn('Bottleneck evaluation note:', bErr);
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
      setBackendConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [checkHealthStatus]);

  // Poll Server Hardware psutil Metrics
  const pollServerMetrics = useCallback(async () => {
    try {
      const data = await apiService.getServerMetrics();
      setServerMetrics(data);
      setBackendConnected(true);
    } catch (err) {
      checkHealthStatus();
    }
  }, [checkHealthStatus]);

  // Initial Boot & Recurring Interval
  useEffect(() => {
    let active = true;

    const startup = async () => {
      const isAlive = await checkHealthStatus();
      if (isAlive && active) {
        await fetchRecords();
        await pollServerMetrics();
      }
    };

    startup();

    // Health check and metrics polling every 4 seconds
    const interval = setInterval(async () => {
      if (!active) return;
      const isAlive = await checkHealthStatus();
      if (isAlive) {
        pollServerMetrics();
      }
    }, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [checkHealthStatus, fetchRecords, pollServerMetrics]);

  // Manual Seed 600-sample academic dataset
  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await apiService.seedSampleData(600, true);
      await fetchRecords();
      setToast({
        message: res.message || `Successfully loaded ${res.inserted || 600} sample academic records into SQLite database!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error seeding data:', err);
      setToast({
        message: err?.response?.data?.detail || err.message || 'Failed to seed academic dataset. Please verify FastAPI backend is running.',
        type: 'error',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // Manual Clear SQLite DB
  const handleClearData = async () => {
    try {
      await apiService.clearDatabase();
      setRecords([]);
      setBottlenecks([]);
      setToast({
        message: 'SQLite database cleared successfully.',
        type: 'info',
      });
    } catch (err: any) {
      console.error('Failed to clear database:', err);
      setToast({
        message: 'Failed to clear database.',
        type: 'error',
      });
    }
  };

  return (
    <MainLayout
      currentPage={currentPage}
      onSelectPage={setCurrentPage}
      backendConnected={backendConnected}
      onRefresh={fetchRecords}
      onSeedData={handleSeedData}
      onClearData={handleClearData}
      isSeeding={isSeeding}
      isRefreshing={isRefreshing}
      totalRecords={records.length}
      toast={toast}
      onDismissToast={() => setToast(null)}
    >
      {currentPage === 'overview' && (
        <OverviewDashboard
          records={records}
          serverMetrics={serverMetrics}
          bottlenecks={bottlenecks}
          onSeedData={handleSeedData}
          onNavigateToModule={(tab) => {
            if (tab === 'module1') setCurrentPage('module1');
            else if (tab === 'module2') setCurrentPage('module2');
          }}
        />
      )}

      {currentPage === 'module1' && (
        <Module1Collection
          records={records}
          serverMetrics={serverMetrics}
          onRefreshRecords={fetchRecords}
        />
      )}

      {currentPage === 'module2' && (
        <Module2Analysis
          records={records}
          onRefreshRecords={fetchRecords}
        />
      )}

      {currentPage === 'visualizations' && (
        <PerformanceVisualization
          records={records}
          bottlenecks={bottlenecks}
          onSeedData={handleSeedData}
        />
      )}

      {currentPage === 'reports' && (
        <ReportsDownloads
          records={records}
          bottlenecks={bottlenecks}
          onSeedData={handleSeedData}
          onClearData={handleClearData}
        />
      )}
    </MainLayout>
  );
}

export default App;
