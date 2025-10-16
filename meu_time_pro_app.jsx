import React, { useState, useRef, useEffect } from "react";

// Meu Time Pro - Single-file React component
// Dependencies (install in your project):
//  - react, react-dom
//  - tailwindcss (recommended for styling)
//  - html2canvas (for export PNG): npm i html2canvas
//  - framer-motion (optional for small animations): npm i framer-motion
// Usage: drop this file into a React app (Vite / CRA). Tailwind recommended but plain CSS works too.

export default function MeuTimePro() {
  // App state
  const [teamName, setTeamName] = useState("Meu Time Pro");
  const [primaryColor, setPrimaryColor] = useState("#00A65A"); // verde
  const [accentColor, setAccentColor] = useState("#FFFFFF"); // branco
  const [bgColor, setBgColor] = useState("#000000"); // preto

  const [gameType, setGameType] = useState("11x11");
  const [slots, setSlots] = useState(generateSlots("11x11"));
  const [players, setPlayers] = useState(defaultPlayers(generateSlots("11x11")));
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [savedFormations, setSavedFormations] = useState(loadFromLocal("mtp_formations") || []);
  const [history, setHistory] = useState(loadFromLocal("mtp_history") || []);

  const pitchRef = useRef(null);
  const exportRef = useRef(null);

  // update slots when gameType changes
  useEffect(() => {
    const newSlots = generateSlots(gameType);
    setSlots(newSlots);
    setPlayers(syncPlayersWithSlots(players, newSlots));
  }, [gameType]);

  // persist formations & history
  useEffect(() => saveToLocal("mtp_formations", savedFormations), [savedFormations]);
  useEffect(() => saveToLocal("mtp_history", history), [history]);

  // Helpers
  function saveToLocal(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { }
  }
  function loadFromLocal(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  function generateSlots(type) {
    // positions are normalized percentage coordinates (x,y)
    // examples for 11x11, 7x7, 6x6, 5x5 – simple balanced layouts
    switch (type) {
      case "11x11":
        return [
          { id: "gk", x: 50, y: 88 },
          { id: "lb", x: 15, y: 70 },
          { id: "cb1", x: 35, y: 70 },
          { id: "cb2", x: 65, y: 70 },
          { id: "rb", x: 85, y: 70 },
          { id: "lm", x: 20, y: 50 },
          { id: "cm", x: 50, y: 50 },
          { id: "rm", x: 80, y: 50 },
          { id: "lf", x: 35, y: 30 },
          { id: "st", x: 50, y: 22 },
          { id: "rf", x: 65, y: 30 },
        ];
      case "7x7":
        return [
          { id: "gk", x: 50, y: 88 },
          { id: "cb", x: 30, y: 68 },
          { id: "cb2", x: 70, y: 68 },
          { id: "cm", x: 50, y: 50 },
          { id: "lm", x: 25, y: 32 },
          { id: "rm", x: 75, y: 32 },
          { id: "st", x: 50, y: 18 },
        ];
      case "6x6":
        return [
          { id: "gk", x: 50, y: 88 },
          { id: "cb", x: 25, y: 68 },
          { id: "cb2", x: 75, y: 68 },
          { id: "cm", x: 50, y: 48 },
          { id: "lm", x: 35, y: 28 },
          { id: "st", x: 65, y: 28 },
        ];
      case "5x5":
        return [
          { id: "gk", x: 50, y: 86 },
          { id: "cb", x: 30, y: 62 },
          { id: "cb2", x: 70, y: 62 },
          { id: "mf", x: 50, y: 40 },
          { id: "st", x: 50, y: 18 },
        ];
      default:
        return [];
    }
  }

  function defaultPlayers(slots) {
    // create empty player objects for each slot
    return slots.map((s, idx) => ({
      id: `p_${s.id}`,
      name: s.id.toUpperCase(),
      number: idx + 1,
      photo: null,
      x: s.x,
      y: s.y,
      slotId: s.id,
    }));
  }

  function syncPlayersWithSlots(oldPlayers, newSlots) {
    // attempt to keep players assigned by slotId if possible, otherwise create default
    const map = {};
    oldPlayers.forEach(p => { if (p.slotId) map[p.slotId] = p; });
    return newSlots.map((s, idx) => {
      const existing = map[s.id];
      if (existing) return { ...existing, x: s.x, y: s.y, slotId: s.id };
      return { id: `p_${s.id}`, name: s.id.toUpperCase(), number: idx + 1, photo: null, x: s.x, y: s.y, slotId: s.id };
    });
  }

  // Player actions
  function handleAddPlayer() {
    const id = `p_custom_${Date.now()}`;
    const newPlayer = { id, name: "Jogador", number: players.length + 1, photo: null, x: 50, y: 50, slotId: null };
    setPlayers(prev => [...prev, newPlayer]);
  }

  function handlePlayerChange(id, changes) {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  }

  function handleRemovePlayer(id) {
    setPlayers(prev => prev.filter(p => p.id !== id));
  }

  // Dragging with pointer events (works on mobile and desktop)
  function onPointerDown(e, playerId) {
    e.preventDefault();
    setSelectedPlayerId(playerId);
    const startX = e.clientX ?? (e.touches && e.touches[0].clientX);
    const startY = e.clientY ?? (e.touches && e.touches[0].clientY);

    const pitch = pitchRef.current;
    if (!pitch) return;

    const rect = pitch.getBoundingClientRect();

    function onMove(ev) {
      const clientX = ev.clientX ?? (ev.touches && ev.touches[0].clientX);
      const clientY = ev.clientY ?? (ev.touches && ev.touches[0].clientY);
      const xPerc = ((clientX - rect.left) / rect.width) * 100;
      const yPerc = ((clientY - rect.top) / rect.height) * 100;
      handlePlayerChange(playerId, { x: clamp(xPerc, 0, 100), y: clamp(yPerc, 0, 100) });
    }

    function onUp() {
      setSelectedPlayerId(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      // add to history
      pushHistory();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Quick edit modal-like inline
  function QuickEdit({ player }) {
    if (!player) return null;
    return (
      <div className="p-2 bg-white rounded shadow">
        <label className="block text-xs">Nome</label>
        <input className="w-full border p-1 rounded text-sm" value={player.name} onChange={e => handlePlayerChange(player.id, { name: e.target.value })} />
        <label className="block text-xs mt-2">Número</label>
        <input type="number" className="w-full border p-1 rounded text-sm" value={player.number} onChange={e => handlePlayerChange(player.id, { number: e.target.value })} />
        <label className="block text-xs mt-2">Foto</label>
        <input type="file" accept="image/*" className="w-full text-sm" onChange={e => handlePhotoUpload(e, player.id)} />
        <div className="flex gap-2 mt-3">
          <button onClick={() => handleRemovePlayer(player.id)} className="flex-1 py-1 rounded bg-red-500 text-white text-sm">Remover</button>
          <button onClick={() => setSelectedPlayerId(null)} className="flex-1 py-1 rounded border text-sm">Fechar</button>
        </div>
      </div>
    );
  }

  function handlePhotoUpload(e, id) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      handlePlayerChange(id, { photo: ev.target.result });
    };
    reader.readAsDataURL(file);
  }

  // Save formation
  function saveFormation(name) {
    const formation = { id: `f_${Date.now()}`, name: name || `${teamName} - ${gameType}`, gameType, players, date: new Date().toISOString() };
    setSavedFormations(prev => [formation, ...prev]);
  }

  function loadFormation(id) {
    const f = savedFormations.find(x => x.id === id);
    if (f) {
      setGameType(f.gameType);
      setPlayers(f.players.map(p => ({ ...p }))); // clone
      // history
      setHistory(prev => [{ type: 'load', formation: f.name, date: new Date().toISOString() }, ...prev]);
    }
  }

  function deleteFormation(id) {
    setSavedFormations(prev => prev.filter(p => p.id !== id));
  }

  function pushHistory() {
    setHistory(prev => [{ type: 'edit', date: new Date().toISOString(), snapshot: players }, ...prev].slice(0, 50));
  }

  // Export as PNG using html2canvas
  async function exportPNG() {
    // lazy load html2canvas to avoid bundling if not used
    const html2canvas = (await import('html2canvas')).default;
    if (!exportRef.current) return;
    const node = exportRef.current;
    const canvas = await html2canvas(node, { scale: 2, useCORS: true });
    const data = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = data;
    a.download = `${teamName.replace(/\s+/g, '_')}_escalação.png`;
    a.click();
    // add to history
    setHistory(prev => [{ type: 'export', date: new Date().toISOString() }, ...prev].slice(0, 50));
  }

  // Quick preset formations examples
  const exampleFormations = ["4-3-3", "3-5-2", "4-4-2", "4-2-3-1"];

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-100 to-gray-50">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
        {/* Left - Controls */}
        <div className="md:col-span-1 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold" style={{ color: primaryColor }}>{teamName}</h2>
          <div className="mt-3">
            <label className="block text-sm">Nome do time</label>
            <input className="w-full border p-2 rounded mt-1" value={teamName} onChange={e => setTeamName(e.target.value)} />
          </div>

          <div className="mt-3">
            <label className="block text-sm">Cores (vibrantes)</label>
            <div className="flex gap-2 mt-2">
              <input title="Primary" type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
              <input title="Accent" type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} />
              <input title="Bg" type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm">Tipo de jogo</label>
            <select className="w-full border p-2 rounded mt-1" value={gameType} onChange={e => setGameType(e.target.value)}>
              <option>11x11</option>
              <option>7x7</option>
              <option>6x6</option>
              <option>5x5</option>
            </select>
          </div>

          <div className="mt-3">
            <label className="block text-sm">Ações rápidas</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={() => saveFormation()} className="px-3 py-2 rounded bg-green-600 text-white text-sm">Salvar formação</button>
              <button onClick={() => { exampleFormations.forEach(f => { /* placeholder for presets */ }); pushHistory(); }} className="px-3 py-2 rounded border text-sm">Aplicar preset</button>
              <button onClick={handleAddPlayer} className="px-3 py-2 rounded border text-sm">Adicionar jogador</button>
              <button onClick={exportPNG} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Exportar PNG</button>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold text-sm">Jogadores</h3>
            <div className="max-h-48 overflow-auto mt-2 space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-2 p-2 border rounded">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0" style={{ border: `2px solid ${primaryColor}` }}>
                    {p.photo ? <img src={p.photo} alt="foto" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">{p.number}</div>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">#{p.number}</div>
                  </div>
                  <div>
                    <button onClick={() => setSelectedPlayerId(p.id)} className="px-2 py-1 text-xs border rounded">Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold text-sm">Formações salvas</h3>
            <div className="max-h-40 overflow-auto mt-2 space-y-2">
              {savedFormations.length === 0 && <div className="text-xs text-gray-500">Nenhuma formação salva.</div>}
              {savedFormations.map(f => (
                <div key={f.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-gray-500">{new Date(f.date).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadFormation(f.id)} className="px-2 py-1 text-xs border rounded">Carregar</button>
                    <button onClick={() => deleteFormation(f.id)} className="px-2 py-1 text-xs border rounded">Apagar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Middle - Pitch & export (visual) */}
        <div className="md:col-span-2 bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Escalação</h2>
            <div className="text-sm text-gray-600">{gameType} • {players.length} jogadores</div>
          </div>

          <div ref={exportRef} className="mt-4 p-3 rounded" style={{ background: `linear-gradient(180deg, ${bgColor} 0%, #073b1a 100%)` }}>
            <div className="relative mx-auto" style={{ maxWidth: 900 }}>
              {/* Pitch */}
              <div ref={pitchRef} className="relative w-full h-[520px] md:h-[620px] rounded overflow-hidden shadow-inner" style={{ background: `linear-gradient(180deg, #007f3e 0%, #009a50 100%)`, border: `6px solid ${primaryColor}` }}>
                {/* Field markings - simplified */}
                <div className="absolute inset-0 opacity-20">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <rect x="0" y="0" width="100" height="100" fill="none" stroke="white" strokeWidth="0.6" />
                    <circle cx="50" cy="50" r="12" fill="none" stroke="white" strokeWidth="0.5" />
                    <rect x="0" y="80" width="100" height="16" fill="none" stroke="white" strokeWidth="0.5" />
                    <rect x="0" y="4" width="100" height="16" fill="none" stroke="white" strokeWidth="0.5" />
                    <line x1="50" y1="0" x2="50" y2="100" stroke="white" strokeWidth="0.2" />
                  </svg>
                </div>

                {/* Players rendered as absolutely positioned elements */}
                {players.map(p => (
                  <div key={p.id}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 touch-none select-none`} 
                    style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: selectedPlayerId === p.id ? 40 : 20 }}
                  >
                    <div 
                      onPointerDown={(e) => onPointerDown(e, p.id)}
                      className="w-20 md:w-24 text-center cursor-grab"
                    >
                      <div className="w-20 md:w-24 h-20 md:h-24 rounded-full overflow-hidden mx-auto border-2" style={{ borderColor: accentColor, background: '#fff' }}>
                        {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ background: primaryColor, color: accentColor }}>{p.number}</div>
                        )}
                      </div>
                      <div className="text-xs mt-1 text-white font-semibold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>{p.name}</div>
                    </div>
                  </div>
                ))}

              </div>

              {/* Export header visual with team name */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full" style={{ background: primaryColor }} />
                  <div>
                    <div className="text-lg font-bold" style={{ color: accentColor }}>{teamName}</div>
                    <div className="text-xs text-gray-200">{gameType} • {players.length} jogadores</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportPNG} className="px-3 py-2 rounded bg-white text-sm">Exportar PNG</button>
                </div>
              </div>

            </div>
          </div>

          {/* Quick edit panel */}
          <div className="mt-4">
            {selectedPlayerId && <QuickEdit player={players.find(p => p.id === selectedPlayerId)} />}
          </div>

          {/* History simple */}
          <div className="mt-4 text-sm">
            <details>
              <summary className="cursor-pointer font-semibold">Histórico (últimas ações)</summary>
              <div className="mt-2 max-h-40 overflow-auto">
                {history.length === 0 && <div className="text-xs text-gray-500">Nenhuma ação recente.</div>}
                {history.map((h, idx) => (
                  <div key={idx} className="p-2 border-b text-xs">
                    <div>{h.type} • {new Date(h.date).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </details>
          </div>

        </div>

      </div>

      <footer className="max-w-6xl mx-auto mt-6 text-xs text-gray-500">Meu Time Pro — Crie e partilhe rapidamente a sua escalação. Exporta PNG e funciona em telemóvel e computador.</footer>
    </div>
  );
}
