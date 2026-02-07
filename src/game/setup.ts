import type { UnitStats, TerrainType, Tile, GameState, MapId, NationStats, NationId } from './types';

export const NATIONS: Record<NationId, NationStats> = {
    GERMANY: {
        id: 'GERMANY',
        name: '德國',
        description: '以裝甲部隊聞名的鋼鐵軍團。',
        activeSkillName: '閃電戰',
        activeSkillDesc: '本回合所有單位攻擊力+2，且移動後可立即攻擊。',
        passiveSkillName: '鐵十字勳章',
        passiveSkillDesc: '所有坦克單位攻擊力 +1。'
    },
    USSR: {
        id: 'USSR',
        name: '蘇聯',
        description: '擁有強大動員能力的人海戰術。',
        activeSkillName: '偉大衛國戰爭',
        activeSkillDesc: '隨機召喚 5 個步兵單位，並使所有友方步兵 HP +1。',
        passiveSkillName: '大動員',
        passiveSkillDesc: '步兵造價減少 20% (8元)。'
    },
    USA: {
        id: 'USA',
        name: '美國',
        description: '擁有強大工業與經濟實力的超級大國。',
        activeSkillName: '戰爭債券',
        activeSkillDesc: '立即獲得初始資金的一半。',
        passiveSkillName: '工業巨人',
        passiveSkillDesc: '每回合收入額外 +20。'
    },
    JAPAN: {
        id: 'JAPAN',
        name: '日本',
        description: '強調制海權與特殊空中戰術的島國。',
        activeSkillName: '神風特攻',
        activeSkillDesc: '召喚 3 架神風戰機 (HP 1, 攻擊後自毀)。',
        passiveSkillName: '聯合艦隊',
        passiveSkillDesc: '所有海軍單位移動力 +1。'
    },
    UK: {
        id: 'UK',
        name: '英國',
        description: '擁有皇家海軍與空軍的堅韌防守者。',
        activeSkillName: '最輝煌時刻',
        activeSkillDesc: '所有友方空軍與海軍單位 HP +1 並完全回復生命值。',
        passiveSkillName: '雷達網',
        passiveSkillDesc: '所有空軍單位視野 +1。'
    }
};

export const UNIT_STATS: Record<string, UnitStats> = {
    INFANTRY: {
        type: 'INFANTRY',
        name: '步兵',
        category: 'LAND',
        cost: 10,
        atk: 1,
        hp: 2,
        mov: 1,
        rangeMin: 1,
        rangeMax: 1,
        vision: 2,
        description: '步兵：基本的陸軍單位。'
    },
    SPECIAL_FORCES: {
        type: 'SPECIAL_FORCES',
        name: '特種部隊',
        category: 'LAND',
        cost: 20,
        atk: 2,
        hp: 3,
        mov: 2,
        rangeMin: 1,
        rangeMax: 1,
        vision: 2,
        description: '特種兵：移動力與攻擊力較高的精銳單位。'
    },
    MORTAR: {
        type: 'MORTAR',
        name: '迫擊砲',
        category: 'LAND',
        cost: 40,
        atk: 3,
        hp: 2,
        mov: 2,
        rangeMin: 3,
        rangeMax: 5,
        vision: 2,
        description: '迫擊砲：遠距離曲射火力。'
    },
    ASSAULT: {
        type: 'ASSAULT',
        name: '突擊兵',
        category: 'LAND',
        cost: 40,
        atk: 3,
        hp: 2,
        mov: 4,
        rangeMin: 1,
        rangeMax: 1,
        vision: 2,
        description: '突擊兵：多動後可攻擊，攻擊後可多動。'
    },
    PARATROOPER: {
        type: 'PARATROOPER',
        name: '傘兵',
        category: 'LAND',
        cost: 40,
        atk: 2,
        hp: 3,
        mov: 2,
        rangeMin: 1,
        rangeMax: 1,
        vision: 2,
        description: '傘兵：可部署於任意位置，部署當回合可行動。'
    },
    SNIPER: {
        type: 'SNIPER',
        name: '狙擊手',
        category: 'LAND',
        cost: 60,
        atk: 5,
        hp: 1,
        mov: 1,
        rangeMin: 1,
        rangeMax: 5,
        vision: 2,
        description: '狙擊手：攻擊後下回合不可行動。攻擊前處於隱身狀態。'
    },

    ANTI_TANK: {
        type: 'ANTI_TANK',
        name: '反坦克砲',
        category: 'LAND',
        cost: 60,
        atk: 3,
        hp: 2,
        mov: 2,
        rangeMin: 1,
        rangeMax: 2,
        vision: 2,
        description: '反坦克砲：對坦克造成雙倍傷害。'
    },
    ANTI_AIR: {
        type: 'ANTI_AIR',
        name: '防空砲',
        category: 'LAND',
        cost: 60,
        atk: 3,
        hp: 2,
        mov: 2,
        rangeMin: 1,
        rangeMax: 2,
        vision: 2,
        description: '防空砲：九宮格內有友軍時不可被空軍攻擊。九宮格內友軍遭空軍攻擊時自動反擊輸出傷害。'
    },
    TANK: {
        type: 'TANK',
        name: '坦克',
        category: 'LAND',
        cost: 80,
        atk: 4,
        hp: 10,
        mov: 3,
        rangeMin: 1,
        rangeMax: 2,
        vision: 2,
        description: '坦克：高血量、高攻擊的陸戰之王。'
    },
    FIGHTER: {
        type: 'FIGHTER',
        name: '戰鬥機',
        category: 'AIR',
        cost: 80,
        atk: 3,
        hp: 5,
        mov: 4,
        rangeMin: 1,
        rangeMax: 2,
        vision: 2,
        description: '戰鬥機：強大的空中制權單位。'
    },
    BOMBER: {
        type: 'BOMBER',
        name: '轟炸機',
        category: 'AIR',
        cost: 80,
        atk: 2,
        hp: 5,
        mov: 2,
        rangeMin: 1,
        rangeMax: 2,
        vision: 2,
        description: '轟炸機：對目標周圍九宮格額外造成一半傷害。'
    },
    CRUISER: {
        type: 'CRUISER',
        name: '巡洋艦',
        category: 'SEA',
        cost: 80,
        atk: 3,
        hp: 10,
        mov: 4,
        rangeMin: 1,
        rangeMax: 3,
        vision: 2,
        description: '巡洋艦：多功能水面作戰艦艇。'
    },
    CARRIER: {
        type: 'CARRIER',
        name: '航空母艦',
        category: 'SEA',
        cost: 90,
        atk: 1,
        hp: 8,
        mov: 3,
        rangeMin: 1,
        rangeMax: 2,
        vision: 2,
        description: '航空母艦：可搭載最多 2 架空軍單位。',
        cargoCapacity: 2
    },
    SUBMARINE: {
        type: 'SUBMARINE',
        name: '潛艇',
        category: 'SEA',
        cost: 80,
        atk: 4,
        hp: 5,
        mov: 4,
        rangeMin: 1,
        rangeMax: 1,
        vision: 2,
        description: '潛艇：攻擊前處於隱身狀態。'
    },
    TRANSPORT: {
        type: 'TRANSPORT',
        name: '運輸艦',
        category: 'SEA',
        cost: 50,
        atk: 1,
        hp: 6,
        mov: 4,
        rangeMin: 1,
        rangeMax: 1,
        vision: 2,
        description: '運輸船：可搭載最多 4 陸軍單位。',
        cargoCapacity: 4
    }
};

const DEFAULT_MAP: TerrainType[][] = [
    ['BASE', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA'],
    ['HELIPAD', 'LAND', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA'],
    ['LAND', 'LAND', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'SEA'],
    ['LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA'],
    ['SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND'],
    ['SEA', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'LAND', 'LAND'],
    ['SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'LAND', 'HELIPAD'],
    ['SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'BASE']
];

// Helper to create symmetric maps (Mirror over X axis - Top vs Bottom)
const createSymmetricMap = (topHalf: TerrainType[][]): TerrainType[][] => {
    const bottomHalf = topHalf.slice().reverse().map(row => row.slice().reverse()); // Rotate 180 degrees for point symmetry which is often fairer
    // Or just mirror vertically? P1 is Top, P2 is Bottom.
    // If we simply reverse the rows (vertical flip) and preserve column order?
    // Let's do Point Symmetry (Rotate 180) - if P1 has a base at top-left, P2 has base at bottom-right.
    // The current DEFAULT map has BASE at (0,0) and (7,7). This is point symmetry (0,0 -> 7,7).

    // Top Half: rows 0 to H/2 - 1
    // Bottom Half: The reverse of Top Half, where each row is also reversed.
    return [...topHalf, ...bottomHalf];
};

const ARCHIPELAGO_HALF: TerrainType[][] = [
    // Row 0 (Top Edge)
    ['BASE', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA'],
    // Row 1
    ['LAND', 'HELIPAD', 'LAND', 'SEA', 'SEA', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA'],
    // Row 2
    ['LAND', 'LAND', 'LAND', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA'],
    // Row 3 (Island Chain Start)
    ['SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA'],
    // Row 4
    ['SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'HELIPAD', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA'],
    // Row 5
    ['SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA'],
    // Row 6
    ['SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND'],
    // Row 7 (Center Line approach)
    ['SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND'],
];

const GOLDEN_VALLEY_HALF: TerrainType[][] = [
    // 24 width. 
    // Left/Right mountains (using 'SEA' as obstacle for LAND units, but visually it might look weird if we don't have MOUNTAIN type. 
    // The user didn't ask for new terrain types, just maps.
    // I will use 'SEA' to represent "Water/Obstacle" on sides, effectively narrowing the path.
    // Or I can just leave it as LAND but make it a bottleneck.
    // The prompt says "High mountains on sides... forcing battle to center". 
    // Since we don't have MOUNTAIN, I'll use SEA to block land units (logic says LAND cannot enter SEA).

    // Rows 0-11
    // Row 0
    ['BASE', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'HELIPAD'],
    // Row 1
    ['LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND'],
    // Row 2
    ['LAND', 'HELIPAD', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND'],
    // Row 3
    ['SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA'],
    // Row 4
    ['SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA'],
    // Row 5
    ['SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA'],
    // Row 6
    ['SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA'],
    // Row 7
    ['SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA'],
    // Row 8
    ['SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA'],
    // Row 9
    ['SEA', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'SEA'],
    // Row 10
    ['LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND'],
    // Row 11 (Center approaches)
    ['LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'LAND', 'SEA', 'SEA', 'SEA', 'SEA', 'SEA', 'LAND', 'LAND'],
];

const getMapLayout = (mapId: MapId): TerrainType[][] => {
    switch (mapId) {
        case 'ARCHIPELAGO':
            return createSymmetricMap(ARCHIPELAGO_HALF);
        case 'GOLDEN_VALLEY':
            return createSymmetricMap(GOLDEN_VALLEY_HALF);
        case 'DEFAULT':
        default:
            return DEFAULT_MAP;
    }
};

export const createInitialState = (mapId: MapId = 'DEFAULT'): GameState => {
    const layout = getMapLayout(mapId);
    const mapHeight = layout.length;

    const map: Tile[][] = layout.map((row, y) =>
        row.map((terrain) => ({
            terrain,
            owner: y < mapHeight / 2 ? 'PLAYER1' : 'PLAYER2'
        }))
    );

    const initialMoney = mapId === 'GOLDEN_VALLEY' ? 400 : (mapId === 'ARCHIPELAGO' ? 300 : 200);

    return {
        map,
        units: [],
        currentPlayer: 'PLAYER1',
        money: {
            PLAYER1: initialMoney,
            PLAYER2: initialMoney
        },
        baseHp: {
            PLAYER1: 20,
            PLAYER2: 20
        },
        turn: 1,
        isPlacementMode: false,
        visibleTiles: {
            PLAYER1: new Set<string>(),
            PLAYER2: new Set<string>()
        },
        gameMode: 'PvE',
        difficulty: 'NORMAL',
        turnDeadline: Date.now() + 180000, // 初始回合 3 分鐘
        mapId,
        nations: {
            PLAYER1: 'GERMANY', // Default fallback
            PLAYER2: 'USSR'
        },
        hasUsedSkill: {
            PLAYER1: false,
            PLAYER2: false
        },
        activeBuffs: {
            PLAYER1: [],
            PLAYER2: []
        },
        isOpponentJoined: false,
        playerNicknames: {
            PLAYER1: '指揮官1',
            PLAYER2: '指揮官2'
        },
        initialRoomStatus: 'WAITING'
    };
};
