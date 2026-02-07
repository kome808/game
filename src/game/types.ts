export type Player = 'PLAYER1' | 'PLAYER2';

export type NationId = 'GERMANY' | 'USSR' | 'USA' | 'JAPAN' | 'UK';

export interface NationStats {
    id: NationId;
    name: string;
    description: string;
    activeSkillName: string;
    activeSkillDesc: string;
    passiveSkillName: string;
    passiveSkillDesc: string;
}

export type GameMode = 'PvP' | 'PvE' | 'ONLINE';

export type UnitCategory = 'LAND' | 'SEA' | 'AIR';

export type UnitType =
    | 'INFANTRY' | 'SPECIAL_FORCES' | 'MORTAR' | 'ASSAULT' | 'PARATROOPER'
    | 'SNIPER' | 'ANTI_TANK' | 'ANTI_AIR' | 'TANK'
    | 'FIGHTER' | 'BOMBER'
    | 'CRUISER' | 'CARRIER' | 'SUBMARINE' | 'TRANSPORT';

export interface Position {
    x: number;
    y: number;
}

export interface Unit {
    id: string;
    type: UnitType;
    category: UnitCategory;
    player: Player;
    position: Position;
    hp: number;
    maxHp: number;
    hasMoved: boolean;
    hasAttacked: boolean;
    remainingMov: number;
    rotation?: number;
    isHidden: boolean;
    transportedUnits?: Unit[];
    isKamikaze?: boolean;
}

export type TerrainType = 'LAND' | 'SEA' | 'HELIPAD' | 'BASE';

export interface Tile {
    terrain: TerrainType;
    owner?: Player;
}

export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export interface GameState {
    map: Tile[][];
    units: Unit[];
    currentPlayer: Player;
    money: {
        [key in Player]: number;
    };
    baseHp: {
        [key in Player]: number;
    };
    turn: number;
    selectedUnitId?: string;
    isPlacementMode: boolean;
    pendingPlacementType?: UnitType;
    visibleTiles: Record<Player, Set<string>>;
    gameMode: GameMode;
    difficulty: Difficulty;
    localPlayer?: Player;
    roomCode?: string;
    turnDeadline?: number;
    mapId: MapId;
    latestEffect?: {
        type: 'ATTACK' | 'EXPLOSION';
        location: Position;
        damage?: number;
        timestamp: number;
    };
    nations: {
        [key in Player]: NationId;
    };
    hasUsedSkill: {
        [key in Player]: boolean;
    };
    activeBuffs: {
        [key in Player]: string[];
    };
    isOpponentJoined?: boolean;
    playerNicknames?: {
        [key in Player]: string;
    };
    initialRoomStatus?: 'WAITING' | 'PLAYING';
}

export type MapId = 'DEFAULT' | 'ARCHIPELAGO' | 'GOLDEN_VALLEY';

export interface UnitStats {
    type: UnitType;
    name: string;
    category: UnitCategory;
    cost: number;
    atk: number;
    hp: number;
    mov: number;
    rangeMin: number;
    rangeMax: number;
    vision: number;
    description: string;
    cargoCapacity?: number;
}
