import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  ClipboardList, 
  History, 
  BarChart3, 
  Plus, 
  ChevronRight, 
  Dribbble,
  User as UserIcon,
  Calendar,
  Shield,
  ArrowLeft,
  Save,
  Trash2,
  Moon,
  Sun,
  Download,
  Trophy
} from 'lucide-react';
import { Player, Match, Averages } from './types';
import { cn } from './lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type View = 'home' | 'players' | 'register' | 'tracking' | 'matches' | 'stats';

export default function App() {
  const [currentView, setCurrentView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('currentView') as View) || 'home';
    }
    return 'home';
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [liveStats, setLiveStats] = useState<Match | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('liveStats');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  
  // Registration form state
  const [regForm, setRegForm] = useState({
    player_id: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    rival: '',
    season: '2024-25',
    is_home: 1
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [pwaStatus, setPwaStatus] = useState<string>('Iniciant...');
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    if (liveStats) {
      localStorage.setItem('liveStats', JSON.stringify(liveStats));
    } else {
      localStorage.removeItem('liveStats');
    }
  }, [liveStats]);

  useEffect(() => {
    fetchPlayers();
    fetchMatches();
    
    // Detectar si estem dins d'un iframe (AI Studio editor)
    setIsInIframe(window.self !== window.top);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        setPwaStatus('Sistema a punt');
      }).catch(err => {
        setPwaStatus('Error SW: ' + err.message);
      });
    } else {
      setPwaStatus('Navegador no compatible');
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaStatus('App llista per instal·lar!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("L'app encara no està llista per instal·lar. Prova de refrescar la pàgina.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const copyToClipboard = () => {
    const url = "https://ais-pre-teuuyqc7dknzyvc75qkj6m-491183799467.europe-west2.run.app";
    navigator.clipboard.writeText(url).then(() => {
      alert("Enllaç copiat! Ara enganxa'l en una pestanya nova de Chrome.");
    });
  };

  const fetchPlayers = async () => {
    const res = await fetch('/api/players');
    const data = await res.json();
    setPlayers(data);
  };

  const fetchMatches = async (playerId?: number) => {
    const url = playerId ? `/api/matches?player_id=${playerId}` : '/api/matches';
    const res = await fetch(url);
    const data = await res.json();
    setMatches(data);
  };

  const exportToPDF = (player: Player, matches: Match[], averages: Averages) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(234, 88, 12); // Orange 600
    doc.text('S7A7S - Informe de Jugador', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Jugador: ${player.name}`, 14, 32);
    doc.text(`Data: ${new Date().toLocaleDateString('ca-ES')}`, 14, 38);
    
    // Summary Table
    autoTable(doc, {
      startY: 45,
      head: [['Mètrica', 'Valor']],
      body: [
        ['Partits Jugats', averages.games_played.toString()],
        ['Mitjana Punts', averages.avg_points.toFixed(1)],
        ['Mitjana Valoració', averages.avg_pir.toFixed(1)],
        ['Mitjana Rebots', averages.avg_rebounds.toFixed(1)],
        ['Mitjana Assistències', averages.avg_assists.toFixed(1)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [234, 88, 12] }
    });
    
    // Matches Table
    doc.text('Historial de Partits', 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Data', 'Rival', 'Punts', 'Reb', 'Ast', 'Val']],
      body: matches.map(m => [
        new Date(m.date).toLocaleDateString('ca-ES'),
        m.rival,
        m.points,
        (m.off_reb || 0) + (m.def_reb || 0),
        m.assists,
        m.pir
      ]),
      headStyles: { fillColor: [75, 85, 99] }
    });
    
    doc.save(`S7A7S_${player.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleStartMatch = async () => {
    if (!regForm.player_id) return;
    
    const initialStats: Match = {
      player_id: parseInt(regForm.player_id),
      date: regForm.date,
      category: regForm.category,
      rival: regForm.rival,
      season: regForm.season,
      is_home: regForm.is_home,
      team_score: 0,
      rival_score: 0,
      points: 0,
      pir: 0,
      two_made: 0,
      two_missed: 0,
      three_made: 0,
      three_missed: 0,
      ft_made: 0,
      ft_missed: 0,
      off_reb: 0,
      def_reb: 0,
      assists: 0,
      steals: 0,
      turnovers: 0,
      blocks: 0
    };

    // Create match in DB immediately
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialStats)
      });
      const data = await res.json();
      setLiveStats({ ...initialStats, id: data.id });
      setCurrentView('tracking');
    } catch (error) {
      console.error("Error creating match:", error);
      alert("Error al crear el partit. Revisa la teva connexió.");
    }
  };

  const updateStat = (key: keyof Match, delta: number) => {
    if (!liveStats) return;
    
    const newStats = { ...liveStats, [key]: (liveStats[key] as number) + delta };
    
    // Calculate points
    newStats.points = (newStats.two_made * 2) + (newStats.three_made * 3) + (newStats.ft_made * 1);
    
    // Calculate PIR
    const positive = newStats.points + newStats.off_reb + newStats.def_reb + newStats.assists + newStats.steals + newStats.blocks;
    const negative = newStats.two_missed + newStats.three_missed + newStats.ft_missed + newStats.turnovers;
    newStats.pir = positive - negative;
    
    setLiveStats(newStats);

    // Auto-save to DB
    if (newStats.id) {
      fetch(`/api/matches/${newStats.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStats)
      }).catch(err => console.error("Auto-save error:", err));
    }
  };

  const handleSaveMatch = () => {
    setLiveStats(null);
    localStorage.removeItem('liveStats');
    fetchMatches();
    setCurrentView('matches');
  };

  const handleEditMatch = (match: Match) => {
    setLiveStats(match);
    setCurrentView('tracking');
  };

  const handleDeleteMatch = async (id: number) => {
    if (confirm('Segur que vols esborrar aquest partit?')) {
      try {
        await fetch(`/api/matches/${id}`, { method: 'DELETE' });
        fetchMatches();
      } catch (error) {
        console.error("Error deleting match:", error);
      }
    }
  };

  const handleCancelMatch = async () => {
    if (!liveStats) return;
    if (confirm('Segur que vols cancel·lar el registre? Es perdran les dades.')) {
      if (liveStats.id) {
        try {
          await fetch(`/api/matches/${liveStats.id}`, { method: 'DELETE' });
        } catch (error) {
          console.error("Error deleting match:", error);
        }
      }
      setLiveStats(null);
      localStorage.removeItem('liveStats');
      setCurrentView('home');
    }
  };

  return (
    <div className={cn(
      "min-h-screen pb-20 md:pb-0 md:pl-64 transition-colors duration-300",
      darkMode ? "bg-neutral-950 text-white" : "bg-neutral-50 text-neutral-900"
    )}>
      {/* Sidebar for Desktop */}
      <aside className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 border-r p-6 z-50",
        darkMode ? "bg-neutral-900 border-neutral-800 text-white" : "bg-white border-neutral-200 text-neutral-900"
      )}>
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
            <Dribbble size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight">S7A7S</h1>
        </div>
        
        <nav className="space-y-2 flex-grow">
          <NavItem active={currentView === 'home'} onClick={() => setCurrentView('home')} icon={<Trophy size={20} />} label="Inici" darkMode={darkMode} />
          <NavItem active={currentView === 'players'} onClick={() => setCurrentView('players')} icon={<Users size={20} />} label="Jugadors" darkMode={darkMode} />
          <NavItem active={currentView === 'register' || currentView === 'tracking'} onClick={() => setCurrentView('register')} icon={<ClipboardList size={20} />} label="Registre" darkMode={darkMode} />
          <NavItem active={currentView === 'matches'} onClick={() => setCurrentView('matches')} icon={<History size={20} />} label="Partits" darkMode={darkMode} />
          <NavItem active={currentView === 'stats'} onClick={() => setCurrentView('stats')} icon={<BarChart3 size={20} />} label="Estadístiques" darkMode={darkMode} />
        </nav>

        <button 
          onClick={() => setDarkMode(!darkMode)}
          className={cn(
            "mt-auto flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
            darkMode ? "text-yellow-400 hover:bg-neutral-800" : "text-neutral-500 hover:bg-neutral-50"
          )}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span>{darkMode ? 'Mode Clar' : 'Mode Fosc'}</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <header className="mb-8 flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Benvingut a S7A7S</h2>
                  <p className="text-neutral-500 font-medium">Gestió professional d'estadístiques de bàsquet.</p>
                </div>
                {deferredPrompt && (
                  <button 
                    onClick={handleInstallClick}
                    className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-colors animate-pulse"
                  >
                    Instal·lar App
                  </button>
                )}
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <QuickAction 
                  title="Nou Partit" 
                  desc="Comença a registrar dades en temps real." 
                  icon={<Plus className="text-orange-600" />} 
                  onClick={() => setCurrentView('register')}
                  darkMode={darkMode}
                />
                <QuickAction 
                  title="Afegir Jugador" 
                  desc="Crea perfils per als teus jugadors." 
                  icon={<Users className="text-blue-600" />} 
                  onClick={() => setCurrentView('players')}
                  darkMode={darkMode}
                />
              </div>

              <section className="mt-12">
                <h3 className="text-xl font-bold mb-4">Últims Partits</h3>
                <div className="space-y-4">
                  {matches.slice(0, 3).map(match => (
                    <MatchCard key={match.id} match={match} darkMode={darkMode} />
                  ))}
                  {matches.length === 0 && (
                    <div className={cn(
                      "text-center py-12 rounded-2xl border border-dashed",
                      darkMode ? "bg-neutral-900 border-neutral-800 text-neutral-500" : "bg-white border-neutral-300 text-neutral-400"
                    )}>
                      <p>Encara no hi ha partits registrats.</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {currentView === 'players' && (
            <PlayersView players={players} onPlayerAdded={fetchPlayers} />
          )}

          {currentView === 'register' && (
            <RegisterView 
              players={players} 
              formData={regForm} 
              onChange={setRegForm} 
              onStart={handleStartMatch} 
              darkMode={darkMode}
            />
          )}

          {currentView === 'tracking' && liveStats && (
            <TrackingView 
              stats={liveStats} 
              onUpdate={updateStat} 
              onSave={handleSaveMatch}
              darkMode={darkMode}
              onCancel={handleCancelMatch}
            />
          )}

          {currentView === 'matches' && (
            <MatchesView 
              matches={matches} 
              players={players}
              onFilter={fetchMatches}
              darkMode={darkMode}
              onEdit={handleEditMatch}
              onDelete={handleDeleteMatch}
            />
          )}

          {currentView === 'stats' && (
            <StatsView players={players} matches={matches} darkMode={darkMode} exportToPDF={exportToPDF} />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around p-3 z-50",
        darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
      )}>
        <MobileNavItem active={currentView === 'home'} onClick={() => setCurrentView('home')} icon={<Trophy size={20} />} darkMode={darkMode} />
        <MobileNavItem active={currentView === 'players'} onClick={() => setCurrentView('players')} icon={<Users size={20} />} darkMode={darkMode} />
        <MobileNavItem active={currentView === 'register' || currentView === 'tracking'} onClick={() => setCurrentView('register')} icon={<Plus size={24} />} isCenter />
        <MobileNavItem active={currentView === 'matches'} onClick={() => setCurrentView('matches')} icon={<History size={20} />} darkMode={darkMode} />
        <MobileNavItem active={currentView === 'stats'} onClick={() => setCurrentView('stats')} icon={<BarChart3 size={20} />} darkMode={darkMode} />
      </nav>
    </div>
  );
}

// --- Sub-views ---

function PlayersView({ players, onPlayerAdded }: { players: Player[], onPlayerAdded: () => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    club_name: '',
    club_logo: '',
    player_image: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    setIsAdding(false);
    setFormData({ name: '', number: '', club_name: '', club_logo: '', player_image: '' });
    onPlayerAdded();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'club_logo' | 'player_image') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Jugadors</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="btn-primary flex items-center gap-2">
          {isAdding ? <ArrowLeft size={18} /> : <Plus size={18} />}
          {isAdding ? 'Tornar' : 'Nou Jugador'}
        </button>
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4 max-w-lg mx-auto">
          <div>
            <label className="block text-sm font-medium mb-1">Nom Complet</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="Pau Gasol" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Dorsal</label>
              <input value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="input-field" placeholder="16" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Club</label>
              <input value={formData.club_name} onChange={e => setFormData({...formData, club_name: e.target.value})} className="input-field" placeholder="FC Barcelona" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Logo Club</label>
              <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'club_logo')} className="text-xs" />
              {formData.club_logo && <img src={formData.club_logo} className="mt-2 w-12 h-12 object-contain" referrerPolicy="no-referrer" />}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Imatge Jugador</label>
              <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'player_image')} className="text-xs" />
              {formData.player_image && <img src={formData.player_image} className="mt-2 w-12 h-12 object-cover rounded-full" referrerPolicy="no-referrer" />}
            </div>
          </div>
          <button type="submit" className="btn-primary w-full mt-4">Guardar Jugador</button>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map(player => (
            <div key={player.id} className="stat-card flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-neutral-100 overflow-hidden border-4 border-white shadow-md">
                  {player.player_image ? (
                    <img src={player.player_image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <UserIcon size={40} />
                    </div>
                  )}
                </div>
                {player.club_logo && (
                  <img src={player.club_logo} className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full p-1 shadow-sm border border-neutral-100" referrerPolicy="no-referrer" />
                )}
              </div>
              <h4 className="font-bold text-lg">{player.name}</h4>
              <p className="text-orange-600 font-mono font-bold">#{player.number}</p>
              <p className="text-neutral-500 text-sm">{player.club_name}</p>
            </div>
          ))}
          {players.length === 0 && (
            <div className="col-span-full text-center py-20">
              <p className="text-neutral-400">No hi ha jugadors registrats.</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function RegisterView({ players, formData, onChange, onStart, darkMode }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-8">Nou Registre de Partit</h2>
      <div className={cn(
        "p-6 rounded-2xl border space-y-4",
        darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
      )}>
        <div>
          <label className="block text-sm font-medium mb-1">Jugador</label>
          <select 
            value={formData.player_id} 
            onChange={e => onChange({...formData, player_id: e.target.value})} 
            className={cn("input-field", darkMode && "bg-neutral-800 border-neutral-700 text-white")}
          >
            <option value="">Selecciona un jugador</option>
            {players.map((p: Player) => (
              <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data</label>
          <input 
            type="date" 
            value={formData.date} 
            onChange={e => onChange({...formData, date: e.target.value})} 
            className={cn("input-field", darkMode && "bg-neutral-800 border-neutral-700 text-white")} 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Categoria</label>
            <input 
              value={formData.category} 
              onChange={e => onChange({...formData, category: e.target.value})} 
              className={cn("input-field", darkMode && "bg-neutral-800 border-neutral-700 text-white")} 
              placeholder="Sènior A" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Temporada</label>
            <input 
              value={formData.season} 
              onChange={e => onChange({...formData, season: e.target.value})} 
              className={cn("input-field", darkMode && "bg-neutral-800 border-neutral-700 text-white")} 
              placeholder="2024-25" 
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Rival</label>
            <input 
              value={formData.rival} 
              onChange={e => onChange({...formData, rival: e.target.value})} 
              className={cn("input-field", darkMode && "bg-neutral-800 border-neutral-700 text-white")} 
              placeholder="CB Granollers" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Local / Visitant</label>
            <select 
              value={formData.is_home} 
              onChange={e => onChange({...formData, is_home: parseInt(e.target.value)})} 
              className={cn("input-field", darkMode && "bg-neutral-800 border-neutral-700 text-white")}
            >
              <option value={1}>Local</option>
              <option value={0}>Visitant</option>
            </select>
          </div>
        </div>
        <button 
          onClick={onStart} 
          disabled={!formData.player_id}
          className="btn-primary w-full mt-4 py-3 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          Començar Partit <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
}

function TrackingView({ stats, onUpdate, onSave, onCancel, darkMode }: { stats: Match, onUpdate: any, onSave: any, onCancel: any, darkMode: boolean }) {
  const isWinning = stats.team_score > stats.rival_score;
  const isLosing = stats.team_score < stats.rival_score;
  const isDraw = stats.team_score === stats.rival_score;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pb-10">
      <div className={cn(
        "sticky top-0 z-40 backdrop-blur-md py-4 mb-6 border-b",
        darkMode ? "bg-neutral-950/80 border-neutral-800" : "bg-neutral-50/80 border-neutral-200"
      )}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={onCancel} className="text-neutral-500 hover:text-red-600 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Punts</p>
              <p className="text-3xl font-black text-orange-600 leading-none">{stats.points}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Val</p>
              <p className="text-3xl font-black text-blue-600 leading-none">{stats.pir}</p>
            </div>
          </div>
          <button onClick={onSave} className="btn-primary flex items-center gap-2">
            <Save size={18} /> Guardar
          </button>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-500">{stats.rival} • {stats.category} ({stats.is_home ? 'Local' : 'Visitant'})</p>
        </div>
      </div>

      {/* Resultado del partido */}
      <div className={cn(
        "mb-6 p-4 rounded-2xl border transition-colors flex items-center justify-between",
        isWinning ? (darkMode ? "bg-green-900/20 border-green-800 text-green-400" : "bg-green-50 border-green-200 text-green-800") : 
        isLosing ? (darkMode ? "bg-red-900/20 border-red-800 text-red-400" : "bg-red-50 border-red-200 text-red-800") : 
        (darkMode ? "bg-neutral-900 border-neutral-800 text-neutral-400" : "bg-white border-neutral-200 text-neutral-800")
      )}>
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider opacity-60">Resultat Partit</span>
          <span className="font-bold">
            {isWinning ? 'Guanyant' : isLosing ? 'Perdent' : 'Empat'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold opacity-60">Nosaltres</span>
            <div className="flex items-center gap-2">
              <button onClick={() => onUpdate('team_score', -1)} className={cn("w-6 h-6 rounded flex items-center justify-center", darkMode ? "bg-white/5" : "bg-black/5")}>-</button>
              <span className="text-2xl font-black min-w-[2rem] text-center">{stats.team_score}</span>
              <button onClick={() => onUpdate('team_score', 1)} className={cn("w-8 h-8 rounded flex items-center justify-center font-bold", darkMode ? "bg-white/10" : "bg-black/10")}>+</button>
            </div>
          </div>
          <span className="text-xl font-bold opacity-20 mt-4">-</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold opacity-60">Rival</span>
            <div className="flex items-center gap-2">
              <button onClick={() => onUpdate('rival_score', -1)} className={cn("w-6 h-6 rounded flex items-center justify-center", darkMode ? "bg-white/5" : "bg-black/5")}>-</button>
              <span className="text-2xl font-black min-w-[2rem] text-center">{stats.rival_score}</span>
              <button onClick={() => onUpdate('rival_score', 1)} className={cn("w-8 h-8 rounded flex items-center justify-center font-bold", darkMode ? "bg-white/10" : "bg-black/10")}>+</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatGroup title="Tirs de 2" darkMode={darkMode}>
          <StatCounter label="Anotats" value={stats.two_made} onInc={() => onUpdate('two_made', 1)} onDec={() => onUpdate('two_made', -1)} darkMode={darkMode} />
          <StatCounter label="Fallats" value={stats.two_missed} onInc={() => onUpdate('two_missed', 1)} onDec={() => onUpdate('two_missed', -1)} darkMode={darkMode} />
        </StatGroup>

        <StatGroup title="Tirs de 3" darkMode={darkMode}>
          <StatCounter label="Anotats" value={stats.three_made} onInc={() => onUpdate('three_made', 1)} onDec={() => onUpdate('three_made', -1)} darkMode={darkMode} />
          <StatCounter label="Fallats" value={stats.three_missed} onInc={() => onUpdate('three_missed', 1)} onDec={() => onUpdate('three_missed', -1)} darkMode={darkMode} />
        </StatGroup>

        <StatGroup title="Tirs Lliures" darkMode={darkMode}>
          <StatCounter label="Anotats" value={stats.ft_made} onInc={() => onUpdate('ft_made', 1)} onDec={() => onUpdate('ft_made', -1)} darkMode={darkMode} />
          <StatCounter label="Fallats" value={stats.ft_missed} onInc={() => onUpdate('ft_missed', 1)} onDec={() => onUpdate('ft_missed', -1)} darkMode={darkMode} />
        </StatGroup>

        <StatGroup title="Rebots" darkMode={darkMode}>
          <StatCounter label="Ofensius" value={stats.off_reb} onInc={() => onUpdate('off_reb', 1)} onDec={() => onUpdate('off_reb', -1)} darkMode={darkMode} />
          <StatCounter label="Defensius" value={stats.def_reb} onInc={() => onUpdate('def_reb', 1)} onDec={() => onUpdate('def_reb', -1)} darkMode={darkMode} />
        </StatGroup>

        <StatGroup title="Altres" darkMode={darkMode}>
          <StatCounter label="Assistències" value={stats.assists} onInc={() => onUpdate('assists', 1)} onDec={() => onUpdate('assists', -1)} darkMode={darkMode} />
          <StatCounter label="Recuperades" value={stats.steals} onInc={() => onUpdate('steals', 1)} onDec={() => onUpdate('steals', -1)} darkMode={darkMode} />
          <StatCounter label="Perdudes" value={stats.turnovers} onInc={() => onUpdate('turnovers', 1)} onDec={() => onUpdate('turnovers', -1)} darkMode={darkMode} />
          <StatCounter label="Taps" value={stats.blocks} onInc={() => onUpdate('blocks', 1)} onDec={() => onUpdate('blocks', -1)} darkMode={darkMode} />
        </StatGroup>
      </div>
    </motion.div>
  );
}

function MatchesView({ matches, players, onFilter, darkMode, onEdit, onDelete }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold">Historial de Partits</h2>
        <select 
          onChange={e => onFilter(e.target.value ? parseInt(e.target.value) : undefined)} 
          className={cn("input-field md:w-64", darkMode && "bg-neutral-800 border-neutral-700 text-white")}
        >
          <option value="">Tots els jugadors</option>
          {players.map((p: Player) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {matches.map((match: Match) => (
          <MatchCard 
            key={match.id} 
            match={match} 
            darkMode={darkMode} 
            onEdit={() => onEdit(match)}
            onDelete={() => onDelete(match.id)}
          />
        ))}
        {matches.length === 0 && (
          <div className={cn(
            "text-center py-20 rounded-2xl border",
            darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
          )}>
            <p className="text-neutral-400">No s'han trobat partits.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatsView({ players, matches, darkMode, exportToPDF }: { players: Player[], matches: Match[], darkMode: boolean, exportToPDF: any }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState('2024-25');
  const [selectedMetric, setSelectedMetric] = useState<keyof Match>('points');
  const [displayMode, setDisplayMode] = useState<'data' | 'charts'>('data');

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const playerMatches = matches.filter(m => m.player_id === selectedPlayerId && m.season === selectedSeason);

  const averages = playerMatches.length > 0 ? {
    games_played: playerMatches.length,
    avg_points: playerMatches.reduce((acc, m) => acc + m.points, 0) / playerMatches.length,
    avg_rebounds: playerMatches.reduce((acc, m) => (acc + (m.off_reb || 0) + (m.def_reb || 0)), 0) / playerMatches.length,
    avg_assists: playerMatches.reduce((acc, m) => acc + (m.assists || 0), 0) / playerMatches.length,
    avg_steals: playerMatches.reduce((acc, m) => acc + (m.steals || 0), 0) / playerMatches.length,
    avg_turnovers: playerMatches.reduce((acc, m) => acc + (m.turnovers || 0), 0) / playerMatches.length,
    avg_blocks: playerMatches.reduce((acc, m) => acc + (m.blocks || 0), 0) / playerMatches.length,
    avg_pir: playerMatches.reduce((acc, m) => acc + (m.pir || 0), 0) / playerMatches.length,
    total_ft_made: playerMatches.reduce((acc, m) => acc + (m.ft_made || 0), 0),
    total_ft_attempts: playerMatches.reduce((acc, m) => acc + (m.ft_made || 0) + (m.ft_missed || 0), 0),
    total_2p_made: playerMatches.reduce((acc, m) => acc + (m.two_made || 0), 0),
    total_2p_attempts: playerMatches.reduce((acc, m) => acc + (m.two_made || 0) + (m.two_missed || 0), 0),
    total_3p_made: playerMatches.reduce((acc, m) => acc + (m.three_made || 0), 0),
    total_3p_attempts: playerMatches.reduce((acc, m) => acc + (m.three_made || 0) + (m.three_missed || 0), 0),
  } : null;

  const metrics = [
    { id: 'points', name: 'Punts' },
    { id: 'pir', name: 'Valoració' },
    { id: 'assists', name: 'Assistències' },
    { id: 'steals', name: 'Recuperades' },
  ];

  const calculatePct = (made: number, att: number) => {
    if (att === 0) return '0%';
    return `${((made / att) * 100).toFixed(1)}%`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Estadístiques</h2>
        {selectedPlayer && averages && (
          <button 
            onClick={() => exportToPDF(selectedPlayer, playerMatches, averages)}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-orange-600/20"
          >
            <Download size={18} />
            Exportar PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Jugador</label>
          <select 
            value={selectedPlayerId || ''} 
            onChange={e => setSelectedPlayerId(Number(e.target.value))} 
            className={cn("input-field", darkMode && "bg-neutral-800 border-neutral-700 text-white")}
          >
            <option value="">Selecciona un jugador</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Temporada</label>
          <input 
            value={selectedSeason} 
            onChange={e => setSelectedSeason(e.target.value)} 
            className={cn("input-field", darkMode && "bg-neutral-800 border-neutral-700 text-white")}
            placeholder="Ex: 2024-25" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mode de Visualització</label>
          <div className={cn(
            "flex p-1 rounded-xl",
            darkMode ? "bg-neutral-800" : "bg-neutral-100"
          )}>
            <button 
              onClick={() => setDisplayMode('data')}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                displayMode === 'data' 
                  ? (darkMode ? "bg-neutral-700 text-white shadow-sm" : "bg-white text-neutral-900 shadow-sm")
                  : "text-neutral-500"
              )}
            >
              Dades
            </button>
            <button 
              onClick={() => setDisplayMode('charts')}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                displayMode === 'charts'
                  ? (darkMode ? "bg-neutral-700 text-white shadow-sm" : "bg-white text-neutral-900 shadow-sm")
                  : "text-neutral-500"
              )}
            >
              Gràfiques
            </button>
          </div>
        </div>
      </div>

      {averages && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBox label="Partits" value={averages.games_played} darkMode={darkMode} />
            <StatBox label="Mitjana Punts" value={averages.avg_points?.toFixed(1)} darkMode={darkMode} />
            <StatBox label="Mitjana Val" value={averages.avg_pir?.toFixed(1)} darkMode={darkMode} />
            <StatBox label="Mitjana Reb" value={averages.avg_rebounds?.toFixed(1)} darkMode={darkMode} />
          </div>

          {displayMode === 'data' ? (
            <div className={cn(
              "p-6 rounded-2xl border overflow-x-auto",
              darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
            )}>
              <h3 className="text-lg font-bold mb-6">Resum de Percentatges</h3>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                    <th className="pb-4">Tipus de Tir</th>
                    <th className="pb-4">Anotats</th>
                    <th className="pb-4">Intentats</th>
                    <th className="pb-4">Percentatge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                  <tr>
                    <td className="py-4 font-medium">Tirs Lliures (1pt)</td>
                    <td className="py-4 font-mono">{averages.total_ft_made}</td>
                    <td className="py-4 font-mono">{averages.total_ft_attempts}</td>
                    <td className="py-4 font-bold text-orange-600">{calculatePct(averages.total_ft_made, averages.total_ft_attempts)}</td>
                  </tr>
                  <tr>
                    <td className="py-4 font-medium">Tirs de 2 (2pt)</td>
                    <td className="py-4 font-mono">{averages.total_2p_made}</td>
                    <td className="py-4 font-mono">{averages.total_2p_attempts}</td>
                    <td className="py-4 font-bold text-orange-600">{calculatePct(averages.total_2p_made, averages.total_2p_attempts)}</td>
                  </tr>
                  <tr>
                    <td className="py-4 font-medium">Triples (3pt)</td>
                    <td className="py-4 font-mono">{averages.total_3p_made}</td>
                    <td className="py-4 font-mono">{averages.total_3p_attempts}</td>
                    <td className="py-4 font-bold text-orange-600">{calculatePct(averages.total_3p_made, averages.total_3p_attempts)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-6">
              <div className={cn(
                "p-6 rounded-2xl border",
                darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
              )}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="text-lg font-bold">Evolució Temporal</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase">Mètrica:</label>
                    <select 
                      value={selectedMetric} 
                      onChange={e => setSelectedMetric(e.target.value as keyof Match)}
                      className={cn("input-field py-1 text-sm w-40", darkMode && "bg-neutral-800 border-neutral-700")}
                    >
                      {metrics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={playerMatches}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#333" : "#f0f0f0"} />
                      <XAxis dataKey="date" hide />
                      <YAxis stroke={darkMode ? "#666" : "#999"} />
                      <Tooltip contentStyle={darkMode ? { backgroundColor: '#171717', borderColor: '#262626', color: '#fff' } : {}} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey={selectedMetric} 
                        name={metrics.find(m => m.id === selectedMetric)?.name} 
                        stroke="#ea580c" 
                        strokeWidth={3} 
                        dot={{ r: 4 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={cn(
                "p-6 rounded-2xl border",
                darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
              )}>
                <h3 className="text-lg font-bold mb-6">Distribució Mitjana</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Assist', val: averages.avg_assists },
                      { name: 'Recup', val: averages.avg_steals },
                      { name: 'Perd', val: averages.avg_turnovers },
                      { name: 'Taps', val: averages.avg_blocks },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#333" : "#f0f0f0"} />
                      <XAxis dataKey="name" stroke={darkMode ? "#666" : "#999"} />
                      <YAxis stroke={darkMode ? "#666" : "#999"} />
                      <Tooltip contentStyle={darkMode ? { backgroundColor: '#171717', borderColor: '#262626', color: '#fff' } : {}} />
                      <Bar dataKey="val" name="Mitjana" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedPlayer && (
        <div className={cn(
          "text-center py-20 rounded-2xl border",
          darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
        )}>
          <p className="text-neutral-400">Selecciona un jugador per veure les seves estadístiques.</p>
        </div>
      )}
    </motion.div>
  );
}

// --- UI Components ---

function NavItem({ active, onClick, icon, label, darkMode }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
        active 
          ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" 
          : (darkMode ? "text-neutral-400 hover:bg-neutral-800 hover:text-white" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900")
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MobileNavItem({ active, onClick, icon, isCenter, darkMode }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-xl transition-all",
        isCenter 
          ? "bg-orange-600 text-white -mt-8 w-14 h-14 shadow-lg shadow-orange-600/30" 
          : (active ? "text-orange-600" : (darkMode ? "text-neutral-500" : "text-neutral-400"))
      )}
    >
      {icon}
    </button>
  );
}

function QuickAction({ title, desc, icon, onClick, darkMode }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-start gap-4 p-6 rounded-2xl border text-left transition-all group",
        darkMode 
          ? "bg-neutral-900 border-neutral-800 hover:border-orange-500/50" 
          : "bg-white border-neutral-200 hover:border-orange-500/50"
      )}
    >
      <div className={cn(
        "p-3 rounded-xl transition-colors",
        darkMode ? "bg-neutral-800 group-hover:bg-orange-900/30" : "bg-neutral-50 group-hover:bg-orange-50"
      )}>
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-lg">{title}</h4>
        <p className="text-neutral-500 text-sm">{desc}</p>
      </div>
    </button>
  );
}

function MatchCard({ match, darkMode, onEdit, onDelete }: { match: Match, darkMode?: boolean, onEdit?: () => void, onDelete?: () => void, key?: any }) {
  const isWinning = match.team_score > match.rival_score;
  const isLosing = match.team_score < match.rival_score;

  return (
    <div className={cn(
      "p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors group",
      darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center border-2",
          isWinning ? (darkMode ? "bg-green-900/20 border-green-800 text-green-400" : "bg-green-50 border-green-200 text-green-600") : 
          isLosing ? (darkMode ? "bg-red-900/20 border-red-800 text-red-400" : "bg-red-50 border-red-200 text-red-600") : 
          (darkMode ? "bg-neutral-800 border-neutral-700 text-neutral-500" : "bg-neutral-100 border-neutral-200 text-neutral-400")
        )}>
          {isWinning ? <Trophy size={20} /> : <Calendar size={20} />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold">{match.player_name}</h4>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
              darkMode ? "bg-neutral-800 text-neutral-400" : "bg-neutral-100 text-neutral-500"
            )}>
              {match.is_home ? 'Local' : 'Visitant'}
            </span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              darkMode ? "bg-neutral-800 text-neutral-400" : "bg-neutral-100 text-neutral-500"
            )}>{match.season}</span>
          </div>
          <p className="text-sm text-neutral-500">vs {match.rival} • {new Date(match.date).toLocaleDateString('ca-ES')}</p>
          <p className={cn(
            "text-xs font-bold",
            isWinning ? "text-green-600" : isLosing ? "text-red-600" : "text-neutral-400"
          )}>
            {match.team_score} - {match.rival_score} ({isWinning ? 'Victòria' : isLosing ? 'Derrota' : 'Empat'})
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-[10px] uppercase font-bold text-neutral-400">Punts</p>
            <p className="font-black text-orange-600">{match.points}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-neutral-400">Val</p>
            <p className="font-black text-blue-600">{match.pir}</p>
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  darkMode ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-300" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                )}
                title="Editar"
              >
                <ClipboardList size={18} />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  darkMode ? "bg-red-900/20 hover:bg-red-900/40 text-red-400" : "bg-red-50 hover:bg-red-100 text-red-600"
                )}
                title="Esborrar"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatGroup({ title, children, darkMode }: any) {
  return (
    <div className={cn(
      "p-4 rounded-2xl border",
      darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
    )}>
      <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">{title}</h5>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function StatCounter({ label, value, onInc, onDec, darkMode }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("font-medium", darkMode ? "text-neutral-300" : "text-neutral-700")}>{label}</span>
      <div className="flex items-center gap-3">
        <button 
          onClick={onDec} 
          className={cn(
            "w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
            darkMode ? "border-neutral-700 hover:bg-neutral-800" : "border-neutral-200 hover:bg-neutral-50"
          )}
        >
          -
        </button>
        <span className="w-8 text-center font-mono font-bold text-lg">{value}</span>
        <button 
          onClick={onInc} 
          className="w-10 h-10 rounded-lg bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 shadow-sm"
        >
          +1
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value, darkMode }: any) {
  return (
    <div className={cn(
      "p-4 rounded-2xl border text-center transition-colors",
      darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
    )}>
      <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">{label}</p>
      <p className={cn(
        "text-2xl font-black",
        darkMode ? "text-white" : "text-neutral-900"
      )}>{value}</p>
    </div>
  );
}
