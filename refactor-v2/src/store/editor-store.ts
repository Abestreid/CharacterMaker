import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CHARACTER_DEFAULTS,
  SCENE_DEFAULTS,
  WARDROBE_DEFAULTS,
  type CharacterState,
  type SceneState,
  type WardrobeState,
} from '../domain';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type EditorStore = {
  character: CharacterState;
  wardrobe: WardrobeState;
  scene: SceneState;
  savedAt: string | null;
  setCharacter: (value: CharacterState) => void;
  setWardrobe: (value: WardrobeState) => void;
  setScene: (value: SceneState) => void;
  resetCharacter: () => void;
  resetWardrobe: () => void;
  resetScene: () => void;
  saveDraft: () => void;
};

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      character: clone(CHARACTER_DEFAULTS),
      wardrobe: clone(WARDROBE_DEFAULTS),
      scene: clone(SCENE_DEFAULTS),
      savedAt: null,
      setCharacter: (character) => set({ character }),
      setWardrobe: (wardrobe) => set({ wardrobe }),
      setScene: (scene) => set({ scene }),
      resetCharacter: () => set({ character: clone(CHARACTER_DEFAULTS) }),
      resetWardrobe: () => set({ wardrobe: clone(WARDROBE_DEFAULTS) }),
      resetScene: () => set({ scene: clone(SCENE_DEFAULTS) }),
      saveDraft: () => set({ savedAt: new Date().toISOString() }),
    }),
    {
      name: 'charactermaker-refactor-v2',
      version: 1,
    },
  ),
);
