import type { GameState, Position, Unit, Player, UnitType } from './types';
import { canAttack, performMove, performAttack, deployUnit, getDistance, getReachableTiles } from './logic';
import { UNIT_STATS } from './setup';

// AI 專屬邏輯：處理電腦回合的操作
export const processAITurn = (state: GameState): GameState => {
    let currentState = { ...state };
    const aiPlayer: Player = 'PLAYER2';
    const humanPlayer: Player = 'PLAYER1';

    // 1. 部署階段 (Deployment)
    currentState = aiDeploymentPhase(currentState, aiPlayer);

    // 2. 行動階段 (Action Phase: Move & Attack)
    // 取得所有己方單位 (深拷貝以避免副作用)
    let aiUnits = currentState.units.filter(u => u.player === aiPlayer && u.hp > 0);

    // 對每個單位進行決策
    for (const unit of aiUnits) {
        // 多次更新狀態，確保最新
        const updatedUnit = currentState.units.find(u => u.id === unit.id);
        if (!updatedUnit || updatedUnit.hp <= 0) continue;

        // 執行行動
        currentState = aiUnitAction(currentState, updatedUnit, humanPlayer);
    }

    return currentState;
};

// 取得反制兵種 (適應性核心)
const getCounterUnit = (enemyUnits: Unit[]): UnitType | null => {
    const landCount = enemyUnits.filter(u => u.category === 'LAND').length;
    const airCount = enemyUnits.filter(u => u.category === 'AIR').length;
    const seaCount = enemyUnits.filter(u => u.category === 'SEA').length;
    const tankCount = enemyUnits.filter(u => u.type === 'TANK').length;

    // 簡單的權重隨機
    const counters: UnitType[] = [];

    if (airCount > 0) {
        counters.push('ANTI_AIR', 'FIGHTER');
        if (airCount > 2) counters.push('ANTI_AIR', 'FIGHTER'); // 加權
    }
    if (tankCount > 0) {
        counters.push('ANTI_TANK', 'BOMBER');
        if (tankCount > 2) counters.push('ANTI_TANK');
    }
    if (seaCount > 0) {
        counters.push('SUBMARINE', 'CRUISER', 'BOMBER');
    }
    if (landCount > 0) {
        counters.push('TANK', 'ASSAULT', 'MORTAR');
    }

    if (counters.length === 0) return null;
    return counters[Math.floor(Math.random() * counters.length)];
};

// AI 部署策略
const aiDeploymentPhase = (state: GameState, aiPlayer: Player): GameState => {
    let tempState = { ...state };
    const difficulty = state.difficulty;
    const humanPlayer: Player = 'PLAYER1';

    // 簡單難度：有 20% 機率直接跳過部署 (模擬資源不足或失誤)
    if (difficulty === 'EASY' && Math.random() < 0.2) return tempState;

    // 找到所有合法的部署點
    const deploymentPoints: Position[] = [];
    tempState.map.forEach((row, y) => {
        row.forEach((tile, x) => {
            if (tile.owner === aiPlayer) {
                deploymentPoints.push({ x, y });
            }
        });
    });

    if (deploymentPoints.length === 0) return tempState;

    // 決定要購買的單位列表
    let priorityList: UnitType[] = ['TANK', 'INFANTRY', 'ASSAULT']; // 預設列表

    if (difficulty === 'HARD') {
        const enemyUnits = tempState.units.filter(u => u.player === humanPlayer && u.hp > 0);
        const counter = getCounterUnit(enemyUnits);

        // 困難模式：如果需要反制，將反制單位排在最優先
        if (counter) {
            priorityList = [counter, ...priorityList];
        }
        // 補充高階單位
        priorityList.push('SPECIAL_FORCES' as UnitType, 'BOMBER');
    } else if (difficulty === 'NORMAL') {
        priorityList = ['TANK', 'ANTI_AIR', 'INFANTRY', 'ASSAULT'];
    } else {
        // EASY: 較多基礎步兵
        priorityList = ['INFANTRY', 'ASSAULT', 'TANK'];
    }

    // 嘗試購買單位 (使用 maxAttempts 防止無窮迴圈)
    let maxAttempts = 10;
    while (tempState.money[aiPlayer] >= 10 && maxAttempts > 0 && deploymentPoints.length > 0) {
        maxAttempts--;

        let deployed = false;
        for (const type of priorityList) {
            if (tempState.money[aiPlayer] < UNIT_STATS[type].cost) continue;

            const stats = UNIT_STATS[type];
            // 尋找適合該單位的空閒部署點
            const validSpots = deploymentPoints.filter(p => {
                const tile = tempState.map[p.y][p.x];
                const hasUnit = tempState.units.some(u => u.position.x === p.x && u.position.y === p.y && u.hp > 0);
                if (hasUnit) return false;

                if (stats.category === 'AIR') return tile.terrain === 'HELIPAD';
                if (stats.category === 'SEA') return tile.terrain === 'SEA';
                return tile.terrain !== 'SEA';
            });

            if (validSpots.length > 0) {
                // 隨機選一個合法的點
                const spot = validSpots[Math.floor(Math.random() * validSpots.length)];
                tempState = deployUnit(tempState, aiPlayer, type, spot);
                deployed = true;
                break; // 買了一隻後重新評估預算 (或繼續買下一隻)
            }
        }

        // 如果一輪下來都沒買成 (可能是錢夠但沒地，或錢不夠買列表中的單位)，就直接結束
        if (!deployed) break;
    }

    return tempState;
};

// AI 單位個別行動決策
const aiUnitAction = (state: GameState, unit: Unit, humanPlayer: Player): GameState => {
    let tempState = { ...state };
    const difficulty = state.difficulty;
    const humanHQ: Position = { x: 0, y: 0 }; // 假設玩家基地

    // --- Helper: 嘗試攻擊邏輯 ---
    const tryAttack = (currentState: GameState, currentUnit: Unit): { state: GameState, attacked: boolean } => {
        // 1. 優先攻擊 HQ
        const attackHQ = canAttack(currentUnit, humanHQ, currentState);
        if (attackHQ.canAttack) {
            return { state: performAttack(currentState, currentUnit.id, humanHQ), attacked: true };
        }

        // 2. 尋找射程內可攻擊的敵軍
        let targets = currentState.units
            .filter(u => u.player === humanPlayer && u.hp > 0)
            .map(u => ({ unit: u, dist: getDistance(currentUnit.position, u.position) }))
            .filter(t => t.dist >= UNIT_STATS[currentUnit.type].rangeMin && t.dist <= UNIT_STATS[currentUnit.type].rangeMax);

        if (targets.length > 0) {
            // 排序策略
            if (difficulty === 'HARD') {
                targets.sort((a, b) => a.unit.hp - b.unit.hp); // 斬殺優先
            } else {
                targets.sort((a, b) => a.dist - b.dist); // 最近優先
            }

            // 簡單模式隨機猶豫
            if (difficulty === 'EASY' && Math.random() < 0.3) {
                return { state: currentState, attacked: false };
            }

            return { state: performAttack(currentState, currentUnit.id, targets[0].unit.position), attacked: true };
        }
        return { state: currentState, attacked: false };
    };

    // Phase 1: 嘗試原地攻擊
    if (!unit.hasAttacked) {
        const result = tryAttack(tempState, unit);
        if (result.attacked) return result.state;
    }

    // Phase 2: 移動 (如果沒攻擊過，或雖沒攻擊但沒移動過且規則允許移動)
    // 注意：目前的規則通常是 "移動 -> 攻擊" 或 "原地攻擊"。
    // 如果 "原地攻擊" 失敗 (無目標)，則嘗試 "移動"。

    if (!unit.hasMoved) {
        // 尋找移動目標：最近的敵人或主堡
        const enemyUnits = tempState.units.filter(u => u.player === humanPlayer && u.hp > 0);

        let moveGoal = humanHQ;
        let minGoalDist = getDistance(unit.position, humanHQ);

        // 在 NORMAL/HARD 模式下，AI 會主動尋找最近敵人，而不是只衝主堡
        if (difficulty !== 'EASY') {
            for (const enemy of enemyUnits) {
                const d = getDistance(unit.position, enemy.position);
                // 稍微偏好攻擊單位 (距離 - 1 的權重)，讓 AI 更具侵略性
                if (d - 1 < minGoalDist) {
                    minGoalDist = d - 1;
                    moveGoal = enemy.position;
                }
            }
        }

        // 特殊：HARD 模式若有弱血敵人，優先鎖定
        if (difficulty === 'HARD') {
            const weakEnemy = enemyUnits.filter(u => u.hp <= 2).sort((a, b) => getDistance(unit.position, a.position) - getDistance(unit.position, b.position))[0];
            if (weakEnemy) moveGoal = weakEnemy.position;
        }

        // 計算最佳移動位置
        const reachableTiles = getReachableTiles(unit, tempState);
        let bestMove: Position | null = null;
        let minBonusDist = Infinity;

        // 簡單模式隨機性
        const randomness = difficulty === 'EASY' ? 2 : 0;

        for (const [key, _dist] of reachableTiles) {
            const [tx, ty] = key.split(',').map(Number);
            const testPos = { x: tx, y: ty };

            // Optimization: getReachableTiles already filters most invalid moves.

            // Skip current position
            if (testPos.x === unit.position.x && testPos.y === unit.position.y) continue;

            let d = getDistance(testPos, moveGoal);

            // 嘗試保持最佳射程 (Kiting logic - simple)
            const myRange = UNIT_STATS[unit.type].rangeMax;
            if (myRange > 1 && getDistance(testPos, moveGoal) < myRange - 1) {
                d += 1;
            }

            if (randomness > 0) d += (Math.random() * randomness) - (randomness / 2);

            if (d < minBonusDist) {
                minBonusDist = d;
                bestMove = testPos;
            }
        }

        if (bestMove && (bestMove.x !== unit.position.x || bestMove.y !== unit.position.y)) {
            tempState = performMove(tempState, unit.id, bestMove);

            // Phase 3: 移動後攻擊 (Move & Attack)
            // 只有當單位仍可攻擊時 (例如 ASSAULT)
            const movedUnit = tempState.units.find(u => u.id === unit.id);
            if (movedUnit && !movedUnit.hasAttacked) {
                const attackAfterMove = tryAttack(tempState, movedUnit);
                if (attackAfterMove.attacked) return attackAfterMove.state;
            }
        }
    }

    return tempState;
};
