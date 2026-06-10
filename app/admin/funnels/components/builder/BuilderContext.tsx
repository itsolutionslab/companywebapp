"use client";

import React, { createContext, useReducer, useContext } from 'react';

export type BlockType = 'hero' | 'text' | 'image' | 'features' | 'form' | 'video';

export interface Block {
    id: string;
    type: BlockType;
    content: any; // Dynamic properties depending on the block type
}

interface BuilderState {
    blocks: Block[];
    selectedBlockId: string | null;
}

type BuilderAction = 
    | { type: 'SET_BLOCKS'; payload: Block[] }
    | { type: 'ADD_BLOCK'; payload: { block: Block; index?: number } }
    | { type: 'UPDATE_BLOCK'; payload: { id: string; content: any } }
    | { type: 'REMOVE_BLOCK'; payload: string }
    | { type: 'MOVE_BLOCK'; payload: { fromIndex: number; toIndex: number } }
    | { type: 'SELECT_BLOCK'; payload: string | null };

const initialState: BuilderState = {
    blocks: [],
    selectedBlockId: null,
};

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
    switch (action.type) {
        case 'SET_BLOCKS':
            return { ...state, blocks: action.payload };
            
        case 'ADD_BLOCK': {
            const newBlocks = [...state.blocks];
            if (typeof action.payload.index === 'number') {
                newBlocks.splice(action.payload.index, 0, action.payload.block);
            } else {
                newBlocks.push(action.payload.block);
            }
            return { ...state, blocks: newBlocks, selectedBlockId: action.payload.block.id };
        }
            
        case 'UPDATE_BLOCK':
            return {
                ...state,
                blocks: state.blocks.map(block => 
                    block.id === action.payload.id 
                        ? { ...block, content: { ...block.content, ...action.payload.content } } 
                        : block
                )
            };
            
        case 'REMOVE_BLOCK':
            return {
                ...state,
                blocks: state.blocks.filter(block => block.id !== action.payload),
                selectedBlockId: state.selectedBlockId === action.payload ? null : state.selectedBlockId
            };
            
        case 'MOVE_BLOCK': {
            const newBlocks = [...state.blocks];
            const [movedBlock] = newBlocks.splice(action.payload.fromIndex, 1);
            newBlocks.splice(action.payload.toIndex, 0, movedBlock);
            return { ...state, blocks: newBlocks };
        }
            
        case 'SELECT_BLOCK':
            return { ...state, selectedBlockId: action.payload };
            
        default:
            return state;
    }
}

export const BuilderContext = createContext<{
    state: BuilderState;
    dispatch: React.Dispatch<BuilderAction>;
} | undefined>(undefined);

export function BuilderProvider({ children, initialBlocks = [] }: { children: React.ReactNode, initialBlocks?: Block[] }) {
    const [state, dispatch] = useReducer(builderReducer, { ...initialState, blocks: initialBlocks });

    return (
        <BuilderContext.Provider value={{ state, dispatch }}>
            {children}
        </BuilderContext.Provider>
    );
}

export function useBuilder() {
    const context = useContext(BuilderContext);
    if (context === undefined) {
        throw new Error('useBuilder must be used within a BuilderProvider');
    }
    return context;
}
