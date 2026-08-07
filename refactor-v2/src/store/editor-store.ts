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
  activeCharacterId: string | null;
  activeOutfitId: string | null;
  activeSceneId: string | null;
  savedAt: string | null;
  setCharacter: (value: CharacterState) => void;
  setWardrobe: (value: WardrobeState) => void;
  setScene: (value: SceneState) => void;
  setActiveCharacterId: (id: string | null) => void;
  setActiveOutfitId: (id: string | null) => void;
  setActiveSceneId: (id: string | null) => void;
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
      activeCharacterId: null,
      activeOutfitId: null,
      activeSceneId: null,
      savedAt: null,
      setCharacter: (character) => set({ character }),
      setWardrobe: (wardrobe) => set({ wardrobe }),
      setScene: (scene) => set({ scene }),
      setActiveCharacterId: (activeCharacterId) => set({ activeCharacterId }),
      setActiveOutfitId: (activeOutfitId) => set({ activeOutfitId }),
      setActiveSceneId: (activeSceneId) => set({ activeSceneId }),
      resetCharacter: () => set({ character: clone(CHARACTER_DEFAULTS), activeCharacterId: null }),
      resetWardrobe: () => set({ wardrobe: clone(WARDROBE_DEFAULTS), activeOutfitId: null }),
      resetScene: () => set({ scene: clone(SCENE_DEFAULTS), activeSceneId: null }),
      saveDraft: () => set({ savedAt: new Date().toISOString() }),
    }),
    {
      name: 'charactermaker-refactor-v2',
      version: 2,
      partialize: (state) => ({
        character: state.character,
        wardrobe: state.wardrobe,
        scene: {
          ...state.scene,
          reference: {
            ...state.scene.reference,
            image: null,
          },
        },
        activeCharacterId: state.activeCharacterId,
        activeOutfitId: state.activeOutfitId,
        activeSceneId: state.activeSceneId,
        savedAt: state.savedAt,
      }),
    },
  ),
);
