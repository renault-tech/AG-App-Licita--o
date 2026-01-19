import { useState, useEffect } from 'react';
import Home from './pages/Home';
import ETPModule from './pages/ETPModule';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';

function App() {
    const [session, setSession] = useState(null);
    const [currentModule, setCurrentModule] = useState('home');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!session) {
        return <Auth onLogin={setSession} />;
    }

    const renderModule = () => {
        switch (currentModule) {
            case 'home':
                return <Home onSelectModule={setCurrentModule} />;
            case 'etp':
                return <ETPModule onBack={() => setCurrentModule('home')} />;
            case 'tr':
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

    return (
        <div className="relative">
            <button
                onClick={() => supabase.auth.signOut()}
                className="fixed top-4 right-4 z-50 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded-md transition-colors"
            >
                Sair
            </button>
            {renderModule()}
        </div>
    );
}

export default App;
