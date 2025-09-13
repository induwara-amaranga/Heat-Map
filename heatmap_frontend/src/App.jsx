import SvgHeatmap from "./components/SvgHeatmap.jsx";

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardPage from './components/Dashboard.jsx';
//import HomePage from './HomePage.jsx'; // example other page

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SvgHeatmap />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;
