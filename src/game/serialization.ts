import type { GameState, Player } from './types';

// 定義傳輸用的 GameState 介面，將 Set 替換為 Array
export interface SerializedGameState extends Omit<GameState, 'visibleTiles' | 'map'> {
    visibleTiles: Record<Player, string[]>;
    map?: any; // Only send when absolutely necessary or the receiver should merge
}

export const serializeGameState = (state: GameState, includeMap: boolean = false): SerializedGameState => {
    const { map, ...rest } = state;
    return {
        ...rest,
        ...(includeMap ? { map } : {}),
        visibleTiles: {
            PLAYER1: Array.from(state.visibleTiles.PLAYER1),
            PLAYER2: Array.from(state.visibleTiles.PLAYER2)
        }
    };
};

// 由於接收到的可能是 unknown 類型，這裡做一點簡單的轉型
export const deserializeGameState = (data: any, currentMap?: any): GameState => {
    // 如果 data 已經是 GameState (本地直接呼叫的情況)，雖然不該發生但防呆
    if (data.visibleTiles?.PLAYER1 instanceof Set) return data as GameState;

    const visibleTiles: Record<Player, Set<string>> = {
        PLAYER1: new Set(Array.isArray(data.visibleTiles?.PLAYER1) ? data.visibleTiles.PLAYER1 : []),
        PLAYER2: new Set(Array.isArray(data.visibleTiles?.PLAYER2) ? data.visibleTiles.PLAYER2 : [])
    };

    return {
        ...data,
        map: data.map || currentMap,
        visibleTiles
    };
};
