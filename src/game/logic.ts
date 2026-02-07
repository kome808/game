import type { GameState, Position, Unit, Tile, Player, UnitType } from './types';
import { UNIT_STATS } from './setup';

export const isWithinBoard = (pos: Position, map: Tile[][]): boolean => {
    return pos.y >= 0 && pos.y < map.length && pos.x >= 0 && pos.x < map[0].length;
};

export const getUnitAt = (units: Unit[], pos: Position): Unit | undefined => {
    return units.find(u => u.position.x === pos.x && u.position.y === pos.y && u.hp > 0);
};

export const findUnitById = (units: Unit[], id: string): { unit: Unit; carrierId?: string } | undefined => {
    // 1. 搜尋主要單位列表
    const unit = units.find(u => u.id === id);
    if (unit) return { unit };

    // 2. 搜尋搭載容器內部 (如航空母艦、運輸艦)
    for (const container of units) {
        if (container.transportedUnits) {
            const innerUnit = container.transportedUnits.find(u => u.id === id);
            if (innerUnit) {
                return { unit: innerUnit, carrierId: container.id };
            }
        }
    }

    return undefined;
};

export const getDistance = (pos1: Position, pos2: Position): number => {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
};

export const getReachableTiles = (unit: Unit, state: GameState, startPosOverride?: Position): Map<string, number> => {
    const reachable = new Map<string, number>();
    const startPos = startPosOverride || unit.position;
    const queue: { pos: Position; dist: number }[] = [{ pos: startPos, dist: 0 }];

    reachable.set(`${startPos.x},${startPos.y}`, 0);

    while (queue.length > 0) {
        const { pos, dist } = queue.shift()!;

        const neighbors = [
            { x: pos.x + 1, y: pos.y },
            { x: pos.x - 1, y: pos.y },
            { x: pos.x, y: pos.y + 1 },
            { x: pos.x, y: pos.y - 1 }
        ];

        for (const neighbor of neighbors) {
            if (!isWithinBoard(neighbor, state.map)) continue;

            // 檢查路徑上的單位阻擋 (碰撞機制)
            const unitAtNeighbor = getUnitAt(state.units, neighbor);
            if (unitAtNeighbor) {
                // 例外：空軍進入己方航空母艦 (不視為阻擋)
                const isFriendlyCarrier = unitAtNeighbor.type === 'CARRIER' && unitAtNeighbor.player === unit.player;
                const canEnterCarrier = unit.category === 'AIR' && isFriendlyCarrier;

                if (!canEnterCarrier) {
                    // 碰撞規則：空軍擋空軍，地面/海面擋地面/海面
                    const isAirCollision = unit.category === 'AIR' && unitAtNeighbor.category === 'AIR';
                    const isSurfaceCollision = unit.category !== 'AIR' && unitAtNeighbor.category !== 'AIR';

                    if (isAirCollision || isSurfaceCollision) {
                        continue; // 被阻擋，嘗試其他路徑
                    }
                }
            }

            const tile = state.map[neighbor.y][neighbor.x];
            const terrainCost = 1; // 簡化：目前所有格移動成本皆為 1
            const newDist = dist + terrainCost;

            if (newDist > unit.remainingMov) continue;

            // 越位檢查：陸軍不可經過深海
            if (unit.category === 'LAND' && tile.terrain === 'SEA') {
                // 允許進入海，但一進入就得停下，所以不加入 queue 繼續展開
                const key = `${neighbor.x},${neighbor.y}`;
                if (!reachable.has(key) || reachable.get(key)! > newDist) {
                    reachable.set(key, newDist);
                }
                continue;
            }

            // 海軍不可上陸
            if (unit.category === 'SEA' && tile.terrain !== 'SEA' && tile.terrain !== 'BASE') continue;

            const key = `${neighbor.x},${neighbor.y}`;
            if (!reachable.has(key) || reachable.get(key)! > newDist) {
                reachable.set(key, newDist);
                queue.push({ pos: neighbor, dist: newDist });
            }
        }
    }

    return reachable;
};

export const isUnitVisibleTo = (unit: Unit, observer: Player, state: GameState): boolean => {
    // 己方單位一律可見
    if (unit.player === observer) return true;

    // 基礎可見性：地形迷霧
    const isTileVisible = state.visibleTiles[observer].has(`${unit.position.x},${unit.position.y}`);
    if (!isTileVisible) return false;

    // 隱身邏輯：若單位處於隱身狀態且未被近距離偵測
    if (unit.isHidden) {
        // 檢查是否有任何觀察者的單位在鄰近範圍內 (距離 <= 1)
        const hasNearbyObserver = state.units.some(u =>
            u.player === observer &&
            u.hp > 0 &&
            getDistance(u.position, unit.position) <= 1
        );
        return hasNearbyObserver;
    }

    return true;
};

export const updateVision = (state: GameState): GameState => {
    const newVisibleTiles = {
        PLAYER1: new Set<string>(),
        PLAYER2: new Set<string>()
    };

    // 1. 領土視野：擁有權區域全開
    state.map.forEach((row, y) => {
        row.forEach((tile, x) => {
            if (tile.owner) {
                newVisibleTiles[tile.owner].add(`${x},${y}`);
            }
        });
    });

    // 2. 單位視野：基於單位位置與視野距離
    state.units.forEach(unit => {
        if (unit.hp <= 0) return;
        const stats = UNIT_STATS[unit.type];
        let vision = stats.vision;

        // UK Passive: Air Vision +1
        if (state.nations?.[unit.player] === 'UK' && unit.category === 'AIR') {
            vision += 1;
        }

        for (let dy = -vision; dy <= vision; dy++) {
            for (let dx = -vision; dx <= vision; dx++) {
                const checkPos = { x: unit.position.x + dx, y: unit.position.y + dy };
                if (isWithinBoard(checkPos, state.map)) {
                    const dist = getDistance(unit.position, checkPos);
                    if (dist <= vision) {
                        newVisibleTiles[unit.player].add(`${checkPos.x},${checkPos.y}`);
                    }
                }
            }
        }
    });

    return { ...state, visibleTiles: newVisibleTiles };
};

export const canMoveTo = (
    unit: Unit,
    targetPos: Position,
    state: GameState
): { canMove: boolean; reason?: string } => {
    if (!isWithinBoard(targetPos, state.map)) return { canMove: false, reason: '超出邊界' };
    if (unit.hasAttacked) return { canMove: false, reason: '攻擊後不可移動' };
    if (unit.remainingMov <= 0) return { canMove: false, reason: '行動力不足' };

    // 處理出擊 (Launch) 的情況：如果單位在載具內，需要提供載具位置作為起始點
    let startPosOverride: Position | undefined;
    const unitInfo = findUnitById(state.units, unit.id);
    if (unitInfo?.carrierId) {
        const carrier = state.units.find(u => u.id === unitInfo.carrierId);
        startPosOverride = carrier?.position;
    }

    const reachable = getReachableTiles(unit, state, startPosOverride);
    if (!reachable.has(`${targetPos.x},${targetPos.y}`)) return { canMove: false, reason: '無法到達該位置' };

    const targetUnit = getUnitAt(state.units, targetPos);
    if (targetUnit) {
        // 允許空軍進入航空母艦，陸軍進入運輸艦
        const isFriendlyCarrier = targetUnit.type === 'CARRIER' && targetUnit.player === unit.player && unit.category === 'AIR';
        const isFriendlyTransport = targetUnit.type === 'TRANSPORT' && targetUnit.player === unit.player && unit.category === 'LAND';

        if (isFriendlyCarrier || isFriendlyTransport) {
            return { canMove: true };
        }
        return { canMove: false, reason: '目標位置已有單位' };
    }

    return { canMove: true };
};

export const canAttack = (
    attacker: Unit,
    targetPos: Position,
    state: GameState
): { canAttack: boolean; targetUnit?: Unit; targetBase?: Player; reason?: string } => {
    if (attacker.hasAttacked) return { canAttack: false, reason: '本回合已攻擊' };

    // 陸軍在海上不可攻擊
    const currentTile = state.map[attacker.position.y][attacker.position.x];
    if (attacker.category === 'LAND' && currentTile.terrain === 'SEA') {
        return { canAttack: false, reason: '陸軍在海上不可攻擊' };
    }

    const dist = getDistance(attacker.position, targetPos);
    const stats = UNIT_STATS[attacker.type];

    if (dist < stats.rangeMin || dist > stats.rangeMax) return { canAttack: false, reason: '不在射程內' };

    const targetUnit = getUnitAt(state.units, targetPos);
    const targetTile = state.map[targetPos.y][targetPos.x];

    if (targetUnit) {
        if (targetUnit.player === attacker.player) return { canAttack: false, reason: '不能攻擊友軍' };

        if (!state.visibleTiles[attacker.player].has(`${targetPos.x},${targetPos.y}`)) {
            return { canAttack: false, reason: '不可見區域不能攻擊' };
        }

        if (!isUnitVisibleTo(targetUnit, attacker.player, state)) {
            return { canAttack: false, reason: '單位處於隱身狀態' };
        }

        if (targetUnit.category === 'AIR' && attacker.type !== 'ANTI_AIR' && attacker.category !== 'AIR') {
            return { canAttack: false, reason: '陸海軍無法攻擊空軍(需防空單位)' };
        }

        // 新增規則：防空炮在自身九宮格有友軍時，不可被空軍攻擊
        if (targetUnit.type === 'ANTI_AIR' && attacker.category === 'AIR') {
            const hasFriendlyNeighbor = state.units.some(u =>
                u.player === targetUnit.player &&
                u.id !== targetUnit.id &&
                u.hp > 0 &&
                Math.abs(u.position.x - targetUnit.position.x) <= 1 &&
                Math.abs(u.position.y - targetUnit.position.y) <= 1
            );
            if (hasFriendlyNeighbor) {
                return { canAttack: false, reason: '有友軍護航的防空炮不可被空軍攻擊' };
            }
        }

        return { canAttack: true, targetUnit };
    }

    if (targetTile.terrain === 'BASE') {
        const baseOwner = targetTile.owner;
        if (baseOwner && baseOwner !== attacker.player) {
            return { canAttack: true, targetBase: baseOwner };
        }
    }

    return { canAttack: false, reason: '無效目標' };
};

export const calculateDamage = (attacker: Unit, defender: Unit, state?: GameState): number => {
    const stats = UNIT_STATS[attacker.type];
    let damage = stats.atk;

    if (attacker.type === 'ANTI_TANK' && defender.type === 'TANK') {
        damage *= 2;
    }

    if (state) {
        // German Passive: Tank ATK +1
        if (state.nations?.[attacker.player] === 'GERMANY' && attacker.type === 'TANK') {
            damage += 1;
        }
        // German Active: All Units ATK +2
        if (state.activeBuffs?.[attacker.player]?.includes('BLITZKRIEG')) {
            damage += 2;
        }
    }

    return damage;
};

export const performMove = (state: GameState, unitId: string, pos: Position): GameState => {
    const unitInfo = findUnitById(state.units, unitId);
    if (!unitInfo) return state;

    const { unit: originalUnit, carrierId } = unitInfo;
    const newUnits = [...state.units];

    // 如果是從航空母艦出擊 (Launch)
    if (carrierId) {
        const carrierIndex = newUnits.findIndex(u => u.id === carrierId);
        if (carrierIndex === -1) return state;

        const carrier = { ...newUnits[carrierIndex] };

        // 從 Carrier 移除
        carrier.transportedUnits = carrier.transportedUnits?.filter(u => u.id !== unitId);
        newUnits[carrierIndex] = carrier;

        // 準備加入地圖的單位
        const unit = { ...originalUnit };

        // 更新位置與消耗
        // Launch 時，起始位置視為 Carrier 位置
        const dist = getDistance(carrier.position, pos);

        // 計算旋轉角度 (面向移動方向)
        const dx = pos.x - carrier.position.x;
        const dy = pos.y - carrier.position.y;
        if (dx !== 0 || dy !== 0) {
            unit.rotation = Math.atan2(dx, dy);
        }

        unit.remainingMov -= dist;
        unit.position = pos;
        unit.hasMoved = true;
        // Launch 後若為空軍，保持 hasAttacked = false 以允許攻擊 (Launch 算作移動)
        unit.hasAttacked = false;

        // 加入地圖
        newUnits.push(unit);

        return updateVision({ ...state, units: newUnits });
    }

    // 一般移動
    const unitIndex = state.units.findIndex(u => u.id === unitId);
    const unit = { ...newUnits[unitIndex] };
    const targetTile = state.map[pos.y][pos.x];

    // 計算消耗掉的移動力
    const dist = getDistance(unit.position, pos);

    // 計算旋轉角度 (面向移動方向)
    const dx = pos.x - unit.position.x;
    const dy = pos.y - unit.position.y;
    if (dx !== 0 || dy !== 0) {
        unit.rotation = Math.atan2(dx, dy);
    }

    unit.remainingMov -= dist;
    unit.position = pos;
    unit.hasMoved = true;

    // 特殊兵種能力：突擊兵 (ASSAULT) 或空軍 (AIR) 移動後可攻擊
    // 德國主動技能 (BLITZKRIEG)：所有單位移動後可攻擊
    const hasBlitzkrieg = state.activeBuffs?.[unit.player]?.includes('BLITZKRIEG');

    if (unit.type !== 'ASSAULT' && unit.category !== 'AIR' && !hasBlitzkrieg) {
        unit.hasAttacked = true; // 一般單位移動後視為行動結束
    }

    // 陸軍入海規則：行動力歸零且不可攻擊 (此判斷雖變為冗餘但保留作為特殊地形邏輯)
    if (unit.category === 'LAND' && targetTile.terrain === 'SEA') {
        unit.remainingMov = 0;
        unit.hasAttacked = true; // 強制結束行動
    }

    // 檢查是否進入搭載單位 (Carrier 或 Transport)
    const targetUnit = getUnitAt(state.units, pos);
    if (targetUnit && targetUnit.player === unit.player) {
        const isCarrierLoad = targetUnit.type === 'CARRIER' && unit.category === 'AIR';
        const isTransportLoad = targetUnit.type === 'TRANSPORT' && unit.category === 'LAND';

        if (isCarrierLoad || isTransportLoad) {
            // 進入搭載模式
            const containerIndex = state.units.findIndex(u => u.id === targetUnit.id);
            const container = { ...state.units[containerIndex] };

            // 檢查容量
            const maxCargo = UNIT_STATS[targetUnit.type].cargoCapacity || 0;
            if ((container.transportedUnits?.length || 0) < maxCargo) {
                // 進入容器後，強制結束該單位回合
                unit.hasMoved = true;
                unit.hasAttacked = true;
                unit.remainingMov = 0;

                // 將單位加入
                container.transportedUnits = [...(container.transportedUnits || []), unit];
                newUnits[containerIndex] = container;

                return updateVision({
                    ...state,
                    units: newUnits.filter(u => u.id !== unit.id)
                });
            }
        }
    }

    newUnits[unitIndex] = unit;
    return updateVision({ ...state, units: newUnits });
};

export const performAttack = (state: GameState, attackerId: string, targetPos: Position): GameState => {
    const attackerIndex = state.units.findIndex(u => u.id === attackerId);
    if (attackerIndex === -1) return state;

    const newUnits = [...state.units];
    const attacker = { ...newUnits[attackerIndex] };
    const attackResult = canAttack(attacker, targetPos, state);

    if (!attackResult.canAttack) return state;

    attacker.hasAttacked = true;
    attacker.isHidden = false;

    if (attackResult.targetUnit) {
        const defenderIndex = state.units.findIndex(u => u.id === attackResult.targetUnit!.id);
        const defender = { ...newUnits[defenderIndex] };

        const damage = calculateDamage(attacker, defender, state);
        defender.hp -= damage;

        newUnits[defenderIndex] = defender;

        // 新增規則：防空支援火網
        if (attacker.category === 'AIR') {
            newUnits.forEach((u) => {
                if (u.type === 'ANTI_AIR' && u.player === defender.player && u.hp > 0) {
                    const dx = Math.abs(u.position.x - targetPos.x);
                    const dy = Math.abs(u.position.y - targetPos.y);
                    if (dx <= 1 && dy <= 1) {
                        const aaDamage = UNIT_STATS['ANTI_AIR'].atk;
                        attacker.hp -= aaDamage;
                    }
                }
            });
        }

        if (attacker.type === 'BOMBER') {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const splashPos = { x: targetPos.x + dx, y: targetPos.y + dy };
                    const splashUnit = getUnitAt(newUnits, splashPos);
                    if (splashUnit && splashUnit.player !== attacker.player) {
                        const splashIndex = newUnits.findIndex(u => u.id === splashUnit.id);
                        newUnits[splashIndex] = { ...newUnits[splashIndex], hp: Math.max(0, newUnits[splashIndex].hp - Math.floor(damage / 2)) };
                    }
                }
            }
        }

        // --- Add Effect HERE ---
        const effect = {
            type: 'ATTACK' as const,
            location: targetPos,
            damage: damage,
            timestamp: Date.now()
        };

        // Kamikaze Self-Destruct
        if (attacker.isKamikaze) {
            attacker.hp = 0;
        }

        newUnits[attackerIndex] = attacker;
        return updateVision({ ...state, units: newUnits, latestEffect: effect });

    } else if (attackResult.targetBase) {
        const newBaseHp = { ...state.baseHp };
        newBaseHp[attackResult.targetBase] -= UNIT_STATS[attacker.type].atk;

        // 新增規則：防空支援火網 (保護基地)
        if (attacker.category === 'AIR') {
            newUnits.forEach((u) => {
                if (u.type === 'ANTI_AIR' && u.player === attackResult.targetBase && u.hp > 0) {
                    const dx = Math.abs(u.position.x - targetPos.x);
                    const dy = Math.abs(u.position.y - targetPos.y);
                    if (dx <= 1 && dy <= 1) {
                        const aaDamage = UNIT_STATS['ANTI_AIR'].atk;
                        attacker.hp -= aaDamage;
                    }
                }
            });
        }

        newUnits[attackerIndex] = attacker;

        // Kamikaze Self-Destruct on Base
        if (attacker.isKamikaze) {
            attacker.hp = 0;
        }

        const damage = UNIT_STATS[attacker.type].atk;
        const effect = {
            type: 'EXPLOSION' as const,
            location: targetPos,
            damage: damage,
            timestamp: Date.now()
        };
        return updateVision({ ...state, units: newUnits, baseHp: newBaseHp, latestEffect: effect });
    }

    newUnits[attackerIndex] = attacker;
    return updateVision({ ...state, units: newUnits });
};

export const deployUnit = (state: GameState, player: Player, type: UnitType, pos: Position): GameState => {
    const stats = UNIT_STATS[type];

    // USSR Passive: Infantry Cost -20%
    let cost = stats.cost;
    if (state.nations?.[player] === 'USSR' && type === 'INFANTRY') {
        cost = Math.floor(cost * 0.8);
    }

    // 1. 檢查金錢
    if (state.money[player] < cost) return state;

    // 2. 檢查邊界
    if (!isWithinBoard(pos, state.map)) return state;

    // 3. 檢查佔用
    const targetUnit = getUnitAt(state.units, pos);
    const isFriendlyCarrier = targetUnit?.type === 'CARRIER' && targetUnit?.player === player;

    if (targetUnit && !(type === 'PARATROOPER') && !(stats.category === 'AIR' && isFriendlyCarrier)) return state;

    const tile = state.map[pos.y][pos.x];

    // 4. 檢查特殊兵種與領土權
    const isParatrooper = type === 'PARATROOPER';

    // 若非傘兵且非部署於航空母艦，必須部署在己方領土
    if (!isParatrooper && !isFriendlyCarrier && tile.owner !== player) return state;

    // 5. 檢查地形限制
    if (!isFriendlyCarrier) {
        if (stats.category === 'AIR' && tile.terrain !== 'HELIPAD') return state;
        if (stats.category === 'SEA' && tile.terrain !== 'SEA') return state;
        if (stats.category === 'LAND' && tile.terrain === 'SEA') return state;
    }

    // 執行部署
    const newUnit: Unit = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        category: stats.category,
        player,
        position: pos,
        hp: stats.hp,
        maxHp: stats.hp,
        hasMoved: true,
        hasAttacked: true,
        remainingMov: 0,
        rotation: player === 'PLAYER1' ? 0 : Math.PI,
        isHidden: type === 'SNIPER' || type === 'SUBMARINE',
        transportedUnits: []
    };

    if (type === 'PARATROOPER') {
        newUnit.hasMoved = false;
        newUnit.hasAttacked = false;
        newUnit.remainingMov = stats.mov;
    }

    const newMoney = { ...state.money };
    newMoney[player] -= cost;

    // 如果是部署在航空母艦上
    if (isFriendlyCarrier && targetUnit) {
        const carrierIndex = state.units.findIndex(u => u.id === targetUnit.id);
        const carrier = { ...state.units[carrierIndex] };
        carrier.transportedUnits = [...(carrier.transportedUnits || []), newUnit];

        const newUnits = [...state.units];
        newUnits[carrierIndex] = carrier;

        return updateVision({
            ...state,
            units: newUnits,
            money: newMoney,
            isPlacementMode: false,
            pendingPlacementType: undefined
        });
    }

    return updateVision({
        ...state,
        units: [...state.units, newUnit],
        money: newMoney,
        isPlacementMode: false,
        pendingPlacementType: undefined
    });
};

export const startNewTurn = (state: GameState): GameState => {
    const resetUnit = (u: Unit): Unit => ({
        ...u,
        hasMoved: false,
        hasAttacked: false,
        remainingMov: UNIT_STATS[u.type].mov + ((state.nations?.[u.player] === 'JAPAN' && u.category === 'SEA') ? 1 : 0),
        transportedUnits: u.transportedUnits?.map(resetUnit)
    });

    const nextUnits = state.units.map(resetUnit);
    const nextPlayer = state.currentPlayer === 'PLAYER1' ? 'PLAYER2' : 'PLAYER1';

    const nextActiveBuffs = { ...state.activeBuffs };
    if (nextActiveBuffs[state.currentPlayer]) {
        nextActiveBuffs[state.currentPlayer] = [];
    }

    const nextMoney = { ...state.money };
    let income = 10;
    if (state.nations?.[nextPlayer] === 'USA') {
        income += 20;
    }
    nextMoney[nextPlayer] += income;

    if (state.mapId === 'GOLDEN_VALLEY') {
        const centerMin = 11;
        const centerMax = 12;

        let bonus = 0;
        nextUnits.forEach(u => {
            if (u.player === nextPlayer && u.hp > 0 &&
                u.position.x >= centerMin && u.position.x <= centerMax &&
                u.position.y >= centerMin && u.position.y <= centerMax) {
                bonus += 50;
            }
        });
        nextMoney[nextPlayer] += bonus;
    }

    return updateVision({
        ...state,
        units: nextUnits,
        currentPlayer: nextPlayer,
        money: nextMoney,
        turn: nextPlayer === 'PLAYER1' ? state.turn + 1 : state.turn,
        turnDeadline: Date.now() + 180000,
        activeBuffs: nextActiveBuffs
    });
};

export const performNationSkill = (state: GameState, player: Player): GameState => {
    if (state.hasUsedSkill?.[player]) return state;

    const nation = state.nations?.[player];
    if (!nation) return state;

    let newState = { ...state };
    const newUnits = [...state.units];
    let effectTriggered = false;

    newState.hasUsedSkill = {
        ...state.hasUsedSkill,
        [player]: true
    };

    switch (nation) {
        case 'GERMANY':
            newState.activeBuffs = {
                ...state.activeBuffs,
                [player]: [...(state.activeBuffs?.[player] || []), 'BLITZKRIEG']
            };
            effectTriggered = true;
            break;

        case 'USSR':
            let spawns = 0;
            const size = state.map.length;

            for (let i = 0; i < 200 && spawns < 5; i++) {
                const rx = Math.floor(Math.random() * size);
                const ry = Math.floor(Math.random() * size);
                const tile = state.map[ry][rx];

                if (tile.owner === player && tile.terrain === 'LAND' && !getUnitAt(newUnits, { x: rx, y: ry })) {
                    newUnits.push({
                        id: `conscript_${Date.now()}_${i}`,
                        type: 'INFANTRY',
                        category: 'LAND',
                        player,
                        position: { x: rx, y: ry },
                        hp: UNIT_STATS['INFANTRY'].hp,
                        maxHp: UNIT_STATS['INFANTRY'].hp,
                        remainingMov: UNIT_STATS['INFANTRY'].mov,
                        hasMoved: false,
                        hasAttacked: false,
                        isHidden: false,
                        transportedUnits: []
                    });
                    spawns++;
                }
            }

            newUnits.forEach(u => {
                if (u.player === player && u.type === 'INFANTRY') {
                    u.maxHp += 1;
                    u.hp = u.maxHp;
                }
            });
            effectTriggered = true;
            break;

        case 'USA':
            const initial = state.mapId === 'GOLDEN_VALLEY' ? 400 : (state.mapId === 'ARCHIPELAGO' ? 300 : 200);
            newState.money = {
                ...state.money,
                [player]: state.money[player] + Math.floor(initial / 2)
            };
            effectTriggered = true;
            break;

        case 'JAPAN':
            const basePos = player === 'PLAYER1' ? { x: 0, y: 0 } : { x: state.map[0].length - 1, y: state.map.length - 1 };
            const validAirSpots: { pos: Position, dist: number }[] = [];
            state.map.forEach((row, y) => {
                row.forEach((_tile, x) => {
                    if (!getUnitAt(newUnits, { x, y })) {
                        const d = Math.abs(x - basePos.x) + Math.abs(y - basePos.y);
                        validAirSpots.push({ pos: { x, y }, dist: d });
                    }
                });
            });
            validAirSpots.sort((a, b) => a.dist - b.dist);
            const selectedAir = validAirSpots.slice(0, 3);

            selectedAir.forEach((item, idx) => {
                newUnits.push({
                    id: `kamikaze_${Date.now()}_${idx}`,
                    type: 'FIGHTER',
                    category: 'AIR',
                    player,
                    position: item.pos,
                    hp: 1,
                    maxHp: 1,
                    remainingMov: UNIT_STATS['FIGHTER'].mov,
                    hasMoved: false,
                    hasAttacked: false,
                    isHidden: false,
                    isKamikaze: true,
                    transportedUnits: []
                });
            });
            effectTriggered = true;
            break;

        case 'UK':
            newUnits.forEach(u => {
                if (u.player === player && (u.category === 'AIR' || u.category === 'SEA')) {
                    u.maxHp += 1;
                    u.hp = u.maxHp;
                }
            });
            effectTriggered = true;
            break;
    }

    if (effectTriggered) {
        newState.units = newUnits;
        return updateVision(newState);
    }

    return state;
};
