import React, { useState, useEffect } from 'react';
import GameBoard3D from './components/ThreeD/GameBoard3D';
import { createInitialState } from './game/setup';
import { startNewTurn, findUnitById } from './game/logic';
import { sfx } from './game/SoundManager';
import { processAITurn } from './game/ai';
import { UNIT_STATS } from './game/setup';
import type { Difficulty, Player, GameState, MapId, NationId } from './game/types';
import Lobby from './components/Lobby';
import ArcadeLogin from './components/ArcadeLogin';
import OnlineLobby from './components/OnlineLobby';
import Shop from './components/Shop';
import { supabase } from './lib/supabase';
import { deserializeGameState, serializeGameState } from './game/serialization';


// --- TurnOverlay ---
function TurnOverlay({ side, playerNickname }: { side: Player; playerNickname: string }) {
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [side]);

  if (!visible) return null;

  const isP1 = side === 'PLAYER1';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none animate-in fade-in duration-500">
      <div className={`w-full py-20 ${isP1 ? 'bg-blue-600/40' : 'bg-red-600/40'} backdrop-blur-xl border-y-4 ${isP1 ? 'border-blue-500' : 'border-red-500'} flex flex-col items-center justify-center transform -skew-y-3 shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
        <div className="transform skew-y-3 flex flex-col items-center">
          <span className="text-white text-2xl font-black uppercase tracking-[0.5em] mb-2 drop-shadow-lg">
            {isP1 ? '>>> 聯盟指令發布 <<<' : '<<< 敵對勢力突入 >>>'}
          </span>
          <h1 className="text-8xl font-black italic text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] uppercase">
            {playerNickname} 回合
          </h1>
          <div className={`mt-4 h-1 w-96 ${isP1 ? 'bg-blue-400' : 'bg-red-400'} animate-pulse`}></div>
        </div>
      </div>
    </div>
  );
}

// --- ErrorBoundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-900 text-white p-10 h-screen flex flex-col justify-center items-center overflow-auto z-[9999] relative">
          <h1 className="text-4xl font-bold mb-4">SYSTEM FAILURE</h1>
          <p className="text-xl mb-4 text-red-300">CRITICAL ERROR DETECTED</p>
          <div className="bg-black p-6 rounded text-sm text-red-200 font-mono whitespace-pre-wrap max-w-4xl border border-red-500">
            {this.state.error?.toString()}
          </div>
          <div className="mt-4 text-xs text-red-400">If this persists, check if Supabase is connected.</div>
          <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-red-700 hover:bg-red-600 rounded text-white font-bold">REBOOT SYSTEM</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function GameApp() {
  const [view, setView] = useState<'LOGIN' | 'LOBBY' | 'ONLINE_LOBBY' | 'GAME'>('LOGIN');
  const [gameState, setGameState] = useState<GameState>(createInitialState('DEFAULT'));
  const [identity, setIdentity] = useState<{ id: string; nickname: string } | null>(null);

  // Sync state wrapper
  const setGameStateWithSync = React.useCallback((value: React.SetStateAction<GameState>) => {
    setGameState(prev => {
      const next = typeof value === 'function' ? (value as any)(prev) : value;
      // Online Sync (Simplified Broadcast)
      if (next.gameMode === 'ONLINE' && next.roomCode && identity) {
        supabase.channel(`room_${next.roomCode}`).send({
          type: 'broadcast',
          event: 'game_state_update',
          payload: serializeGameState(next, false) // 預設不發送地圖
        });
      }
      return next;
    });
  }, [identity]);

  const handleLogin = (id: string, nickname: string) => {
    setIdentity({ id, nickname });
    setView('LOBBY');
  };

  const handleStartPvE = (difficulty: Difficulty, p1Nation: NationId, p2Nation: NationId, mapId: MapId) => {
    const initialState = createInitialState(mapId);
    setGameState({
      ...initialState,
      gameMode: 'PvE',
      difficulty,
      nations: { PLAYER1: p1Nation, PLAYER2: p2Nation },
      localPlayer: 'PLAYER1'
    });
    setView('GAME');
    sfx.startBGM('NORMAL');
  };

  const handleJoinOnlineGame = async (roomCode: string, role: Player, nations: { [key in Player]: NationId }, mapId: MapId) => {
    const initialState = createInitialState(mapId);

    // Fetch nicknames
    const { data: roomData } = await supabase.from('rooms').select('host_id, guest_id, status').eq('room_code', roomCode).single();
    if (!roomData) return;

    const p1Id = roomData.host_id;
    const p2Id = roomData.guest_id || identity?.id;

    const { data: p1Data } = await supabase.from('players').select('nickname').eq('id', p1Id).single();
    const { data: p2Data } = await supabase.from('players').select('nickname').eq('id', p2Id).single();

    const nicknames = {
      PLAYER1: p1Data?.nickname || '指揮官1',
      PLAYER2: p2Data?.nickname || '指揮官2'
    };

    setGameState({
      ...initialState,
      gameMode: 'ONLINE',
      roomCode,
      localPlayer: role,
      nations,
      isOpponentJoined: roomData.status === 'PLAYING',
      playerNicknames: nicknames,
      initialRoomStatus: roomData.status
    });
    setView('GAME');
    sfx.startBGM('NORMAL');
  };

  // Supabase Realtime Listener
  useEffect(() => {
    if (gameState.gameMode !== 'ONLINE' || !gameState.roomCode) return;
    const channel = supabase.channel(`room_${gameState.roomCode}`, {
      config: {
        broadcast: { self: false }
      }
    })
      .on('broadcast', { event: 'game_state_update' }, ({ payload }) => {
        setGameState(prev => {
          const remoteState = deserializeGameState(payload, prev.map);
          return {
            ...remoteState,
            localPlayer: prev.localPlayer,
            roomCode: prev.roomCode,
            isOpponentJoined: prev.isOpponentJoined
          };
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameState.gameMode, gameState.roomCode]);

  // Online Room Cleanup (Host)
  useEffect(() => {
    // If we were hosting a room and we enter or leave the game view unexpectedly (e.g. back to lobby)
    const isHosting = gameState.gameMode === 'ONLINE' && gameState.localPlayer === 'PLAYER1' && gameState.roomCode;
    const isOutOfGame = view === 'LOBBY' || view === 'LOGIN' || view === 'ONLINE_LOBBY';

    if (isHosting && isOutOfGame) {
      const codeToDelete = gameState.roomCode;
      const cleanup = async () => {
        console.log("Cleaning up hosted room:", codeToDelete);
        await supabase.from('rooms').delete().eq('room_code', codeToDelete);
      };
      cleanup();
    }
  }, [view, gameState.gameMode, gameState.localPlayer, gameState.roomCode]);

  // Online Room Presence Fix
  useEffect(() => {
    if (gameState.gameMode !== 'ONLINE' || !gameState.roomCode) return;

    // Check initial status
    const checkInitialStatus = async () => {
      const { data: roomData } = await supabase.from('rooms').select('status, guest_id').eq('room_code', gameState.roomCode).single();
      if (roomData?.status === 'PLAYING') {
        // If already playing, fetch guest name if possible
        if (roomData.guest_id) {
          const { data: p2Data } = await supabase.from('players').select('nickname').eq('id', roomData.guest_id).single();
          if (p2Data) {
            setGameState(prev => ({
              ...prev,
              isOpponentJoined: true,
              playerNicknames: {
                PLAYER1: prev.playerNicknames?.PLAYER1 || '指揮官1',
                PLAYER2: p2Data.nickname
              }
            }));
          }
        } else {
          setGameState(prev => ({ ...prev, isOpponentJoined: true }));
        }
      }
    };
    checkInitialStatus();

    const channel = supabase.channel(`room_status_${gameState.roomCode}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'game1',
        table: 'rooms',
        filter: `room_code=eq.${gameState.roomCode}`
      }, async (payload) => {
        if (payload.new.status === 'PLAYING') {
          // Guest joined!
          sfx.playSelect(); // Notification sound

          // Fetch Guest details
          const guestId = payload.new.guest_id;
          let guestName = '指揮官2';
          if (guestId) {
            const { data } = await supabase.from('players').select('nickname').eq('id', guestId).single();
            if (data) guestName = data.nickname;
          }

          setGameState(prev => ({
            ...prev,
            isOpponentJoined: true,
            playerNicknames: {
              PLAYER1: prev.playerNicknames?.PLAYER1 || '指揮官1',
              PLAYER2: guestName
            }
          }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameState.gameMode, gameState.roomCode]);

  // BGM Update
  useEffect(() => {
    if (view !== 'GAME') {
      sfx.stopBGM();
      return;
    }
    const myBaseHp = gameState.baseHp[gameState.localPlayer || 'PLAYER1'];
    if (gameState.baseHp.PLAYER1 <= 0 || gameState.baseHp.PLAYER2 <= 0) return;
    if (myBaseHp <= 6) sfx.startBGM('DANGER');
    else sfx.startBGM('NORMAL');
  }, [view, gameState.baseHp, gameState.localPlayer]);

  // AI Turn
  useEffect(() => {
    let isMounted = true;
    const isGameOver = gameState.baseHp.PLAYER1 <= 0 || gameState.baseHp.PLAYER2 <= 0;
    if (gameState.currentPlayer === 'PLAYER2' && gameState.gameMode === 'PvE' && !isGameOver) {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        setGameState(prev => {
          if (prev.currentPlayer !== 'PLAYER2') return prev;
          try {
            return processAITurn(prev);
          } catch (e) {
            console.error("AI failed", e);
            return prev;
          }
        });
      }, 1000);
      return () => { isMounted = false; clearTimeout(timer); };
    }
  }, [gameState.currentPlayer, gameState.gameMode, gameState.baseHp]);

  if (view === 'LOGIN') {
    return (
      <>
        <div className="fixed top-0 right-0 text-[10px] text-yellow-500 font-mono p-1">DEBUG: PHASE 4 (STABILIZED)</div>
        <ArcadeLogin onLogin={handleLogin} />
      </>
    );
  }

  if (view === 'LOBBY') {
    return <Lobby nickname={identity?.nickname || 'Unknown'} onStartPvE={handleStartPvE} onEnterOnline={() => setView('ONLINE_LOBBY')} />;
  }

  if (view === 'ONLINE_LOBBY') {
    return <OnlineLobby playerId={identity?.id || ''} onJoinGame={handleJoinOnlineGame} onBack={() => setView('LOBBY')} />;
  }

  // GAME VIEW
  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Turn Start Overlay */}
      <TurnOverlay
        key={`${gameState.currentPlayer}_${gameState.turn}`}
        side={gameState.currentPlayer}
        playerNickname={gameState.playerNicknames?.[gameState.currentPlayer] || (gameState.currentPlayer === 'PLAYER1' ? '指揮官1' : '指揮官2')}
      />

      {/* Top Bar */}
      <div className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">當前指揮官</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${gameState.currentPlayer === 'PLAYER1' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
              <span className="font-bold text-slate-200 uppercase tracking-tighter">
                {gameState.playerNicknames?.[gameState.currentPlayer] || (gameState.currentPlayer === 'PLAYER1' ? '指揮官1' : '指揮官2')}
              </span>
              {gameState.gameMode === 'ONLINE' && (
                <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 border border-slate-700 ml-1">
                  {gameState.currentPlayer === gameState.localPlayer ? 'YOU' : 'OPPONENT'}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">當前回合</span>
            <span className="font-mono text-xl text-blue-400 font-bold">ROUND {gameState.turn}</span>
          </div>
          {gameState.gameMode === 'ONLINE' && (
            <div className="flex flex-col border-l border-slate-800 pl-8">
              <span className="text-[10px] text-yellow-500 uppercase font-black tracking-[0.2em] mb-0.5">戰區頻段</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black text-white bg-blue-900/40 px-3 py-0.5 rounded border border-blue-500/30">
                  編號: {gameState.roomCode}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <button onClick={() => setGameStateWithSync(prev => startNewTurn(prev))} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold skew-x-[-12deg] transition-all">
            <span className="skew-x-[12deg] inline-block uppercase">結束回合</span>
          </button>
          <button onClick={() => setView('LOBBY')} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm font-bold skew-x-[-12deg] transition-all">
            <span className="skew-x-[12deg] inline-block uppercase italic">撤離戰場</span>
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        <GameBoard3D gameState={gameState} setGameState={setGameStateWithSync} />

        <Shop
          gameState={gameState}
          onSelectUnit={(type) => setGameStateWithSync(prev => ({ ...prev, isPlacementMode: true, pendingPlacementType: type }))}
          onCancelDeployment={() => setGameStateWithSync(prev => ({ ...prev, isPlacementMode: false, pendingPlacementType: undefined }))}
        />

        {/* Simple HUD Overlay */}
        <div className="absolute bottom-8 left-8 flex flex-col gap-4">
          <div className="p-6 bg-slate-900/80 border border-slate-700 rounded-lg backdrop-blur-md">
            <h2 className="text-xl font-bold mb-4 tracking-tighter">戰術情報面板</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-blue-400 font-bold">{gameState.playerNicknames?.PLAYER1} (P1)</span>
                <span className="text-blue-200 font-mono text-lg">{gameState.baseHp.PLAYER1} HP</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-red-400 font-bold">{gameState.playerNicknames?.PLAYER2} (P2)</span>
                <span className="text-red-200 font-mono text-lg">{gameState.baseHp.PLAYER2} HP</span>
              </div>
              <div className="pt-1 flex justify-between">
                <span className="text-slate-500">預算資金:</span>
                <span className="text-green-500 font-mono font-bold">${gameState.money[gameState.localPlayer || 'PLAYER1']}</span>
              </div>
            </div>
          </div>

          {/* Selected Unit Info */}
          {gameState.selectedUnitId && (
            <div className="p-6 bg-blue-900/80 border border-blue-500 rounded-lg backdrop-blur-md animate-in slide-in-from-left">
              {(() => {
                const info = findUnitById(gameState.units, gameState.selectedUnitId);
                const unit = info?.unit;
                if (!unit) return null;
                const stats = UNIT_STATS[unit.type];
                return (
                  <>
                    <h3 className="text-lg font-black text-blue-300 uppercase tracking-tighter">{stats.name}</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 font-mono text-xs">
                      <span className="text-slate-400">HP:</span> <span className="text-green-400">{unit.hp}/{unit.maxHp}</span>
                      <span className="text-slate-400">ATK:</span> <span className="text-red-400">{stats.atk}</span>
                      <span className="text-slate-400">MOV:</span> <span className="text-yellow-400">{unit.remainingMov}/{stats.mov}</span>
                    </div>
                    {unit.hasMoved && unit.hasAttacked && (
                      <p className="mt-3 text-[10px] text-yellow-500 font-bold uppercase tracking-widest animate-pulse">Action Exhausted</p>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Turn Hint */}
          <div className={`px-5 py-3 rounded border flex items-center gap-3 transition-colors duration-500 backdrop-blur-lg ${gameState.currentPlayer === (gameState.localPlayer || 'PLAYER1')
            ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            : 'bg-red-600/10 border-red-500/40'
            }`}>
            <div className={`w-2.5 h-2.5 rounded-full animate-ping ${gameState.currentPlayer === (gameState.localPlayer || 'PLAYER1') ? 'bg-blue-400' : 'bg-red-400'
              }`}></div>
            <span className={`text-sm font-black tracking-[0.1em] uppercase ${gameState.currentPlayer === (gameState.localPlayer || 'PLAYER1') ? 'text-blue-100' : 'text-red-200/60'
              }`}>
              {gameState.currentPlayer === (gameState.localPlayer || 'PLAYER1') ? '您的任務回合' : `${gameState.playerNicknames?.[gameState.currentPlayer]} 行動中...`}
            </span>
          </div>
          {gameState.gameMode === 'ONLINE' && !gameState.isOpponentJoined && (
            <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-[10px] text-yellow-500 font-bold animate-pulse">
              等待對手加入頻段...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() { return <ErrorBoundary><GameApp /></ErrorBoundary>; }
