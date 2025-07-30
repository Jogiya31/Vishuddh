import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Navbar from "./components/Navbar";
import Home from "./pages/HomePage";
import DistrictSummaryReport from "./pages/DistrictSummaryReport";
import ErrorBoundary from "./components/ErrorBoundary";
import HistoricalNationalReport from "./pages/HistoricalNational";
import HistoricalStateReport from "./pages/HistoricalState";
import HistoricalDistrictReport from "./pages/HistoricalDistrict";
import { ReportTypeProvider, useReportType } from "./pages/ReportType";
import LoginPage from "./pages/LoginPage";
import AiReport from "./pages/AiReport";
import DataInput from "./pages/DataInput";
import ScrapingExtraction from "./pages/ScrapingExtraction";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import LogReport from "./pages/LogReport";
import Footer from "./components/Footer";
import OverallSummaryReport from "./pages/National";
import StateSummaryReport from "./pages/State";
import ManualScraping from "./pages/manualScrapping";
import Layout from "./components/layout";

function AppContent() {
  // 🔹 Now it's inside the Provider, so it will work!
  const { loggedIn } = useReportType();

  return (
    <>
      <Router>
        <ToastContainer />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <Layout>
                <Home />
              </Layout>
            }
          />
          <Route
            path="/current/national"
            element={
              <ErrorBoundary>
                <Layout>
                  <OverallSummaryReport />
                </Layout>
              </ErrorBoundary>
            }
          />
          <Route
            path="/current/state"
            element={
              <ErrorBoundary>
                <Layout>
                  <StateSummaryReport />
                </Layout>
              </ErrorBoundary>
            }
          />
          <Route
            path="/current/district"
            element={
              <ErrorBoundary>
                <Layout>
                  <DistrictSummaryReport />
                </Layout>
              </ErrorBoundary>
            }
          />
          <Route
            path="/historical/national"
            element={
              <ErrorBoundary>
                <Layout>
                  <HistoricalNationalReport />
                </Layout>
              </ErrorBoundary>
            }
          />
          <Route
            path="/historical/state"
            element={
              <ErrorBoundary>
                <Layout>
                  <HistoricalStateReport />
                </Layout>
              </ErrorBoundary>
            }
          />
          <Route
            path="/historical/district"
            element={
              <ErrorBoundary>
                <Layout>
                  <HistoricalDistrictReport />
                </Layout>
              </ErrorBoundary>
            }
          />
          <Route
            path="/manual-scraping"
            element={
              <ErrorBoundary>
                <Layout>
                  <ManualScraping />
                </Layout>
              </ErrorBoundary>
            }
          />
          <Route
            path="/scraping/data-input"
            element={
              <ErrorBoundary>
                <Layout>
                  <DataInput />
                </Layout>
              </ErrorBoundary>
            }
          />
          <Route
            path="/scraping/exception-report"
            element={
              <ErrorBoundary>
                <Layout>
                  <ScrapingExtraction />
                </Layout>
              </ErrorBoundary>
            }
          />
          <Route
            path="/aireport"
            element={
              <ErrorBoundary>
                <Layout>
                  <AiReport />
                </Layout>
              </ErrorBoundary>
            }
          />
          <Route
            path="/log-report"
            element={
              <ErrorBoundary>
                <Layout>
                  <LogReport />
                </Layout>
              </ErrorBoundary>
            }
          />
        </Routes>
      </Router>
    </>
  );
}

function App() {
  return (
    <ReportTypeProvider>
      <AppContent />
    </ReportTypeProvider>
  );
}

export default App;
