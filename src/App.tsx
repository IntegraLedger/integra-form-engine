import { lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const GeneralHomePage = lazy(() => import('@/pages/GeneralHomePage'));
const DemoPage = lazy(() => import('@/pages/DemoPage'));
const InstallPage = lazy(() => import('@/pages/InstallPage'));
const PluginGuidePage = lazy(() => import('@/pages/PluginGuidePage'));

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<GeneralHomePage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/install" element={<InstallPage />} />
          <Route path="/guide" element={<PluginGuidePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
