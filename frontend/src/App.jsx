import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import StageLearning from './pages/StageLearning';
import RandomPractice from './pages/RandomPractice';
import RandomPicker from './pages/RandomPicker';
import SpeakingPractice from './pages/SpeakingPractice';
import AdminImport from './pages/AdminImport';
import Vocabulary from './pages/Vocabulary';
import ParagraphListening from './pages/ParagraphListening';
import './styles/index.css';

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stages" element={<StageLearning />} />
        <Route path="/random" element={<RandomPractice />} />
        <Route path="/picker" element={<RandomPicker />} />
        <Route path="/speaking" element={<SpeakingPractice />} />
        <Route path="/import" element={<AdminImport />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
        <Route path="/paragraph-listening" element={<ParagraphListening />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
