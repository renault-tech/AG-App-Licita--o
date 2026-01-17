import { useState } from 'react';
import Home from './pages/Home';
import ETPModule from './pages/ETPModule';

function App() {
    const [currentModule, setCurrentModule] = useState('home');

    const renderModule = () => {
        switch (currentModule) {
            case 'home':
                return <Home onSelectModule={setCurrentModule} />;
            case 'etp':
                return <ETPModule onBack={() => setCurrentModule('home')} />;
            case 'tr':
                // TR Module - Placeholder para futura implementação
                return (
                    <div className="min-h-screen flex items-center justify-center bg-gray-100">
                        <div className="card max-w-md text-center">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Módulo TR
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Em desenvolvimento...
                            </p>
                            <button
                                onClick={() => setCurrentModule('home')}
                                className="btn-primary"
                            >
                                Voltar
                            </button>
                        </div>
                    </div>
                );
            default:
                return <Home onSelectModule={setCurrentModule} />;
        }
    };

    return <>{renderModule()}</>;
}

export default App;
