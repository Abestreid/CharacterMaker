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
  characterDirty: boolean;
  wardrobeDirty: boolean;
  sceneDirty: boolean;
  savedAt: string | null;
  setCharacter: (value: CharacterState) => void;
  setWardrobe: (value: WardrobeState) => void;
  setScene: (value: SceneState) => void;
  loadCharacter: (value: CharacterState, id: string) => void;
  loadWardrobe: (value: WardrobeState, id: string) => void;
  loadScene: (value: SceneState, id: string) => void;
  setActiveCharacterId: (id: string | null) => void;
  setActiveOutfitId: (id: string | null) => void;
  setActiveSceneId: (id: string | null) => void;
  resetCharacter: () => void;
  resetWardrobe: () => void;
  resetScene: () => void;
  saveDraft: () => void;
};

type PersistedEditorState = Partial<Pick<
  EditorStore,
  | 'character'
  | 'wardrobe'
  | 'scene'
  | 'activeCharacterId'
  | 'activeOutfitId'
  | 'activeSceneId'
  | 'characterDirty'
  | 'wardrobeDirty'
  | 'sceneDirty'
  | 'savedAt'
>>;

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      character: clone(CHARACTER_DEFAULTS),
      wardrobe: clone(WARDROBE_DEFAULTS),
      scene: clone(SCENE_DEFAULTS),
      activeCharacterId: null,
      activeOutfitId: null,
      activeSceneId: null,
      characterDirty: false,
      wardrobeDirty: false,
      sceneDirty: false,
      savedAt: null,
      setCharacter: (character) => set({ character, characterDirty: true }),
      setWardrobe: (wardrobe) => set({ wardrobe, wardrobeDirty: true }),
      setScene: (scene) => set({ scene, sceneDirty: true }),
      loadCharacter: (character, activeCharacterId) => set({ character, activeCharacterId, characterDirty: false }),
      loadWardrobe: (wardrobe, activeOutfitId) => set({ wardrobe, activeOutfitId, wardrobeDirty: false }),
      loadScene: (scene, activeSceneId) => set({ scene, activeSceneId, sceneDirty: false }),
      setActiveCharacterId: (activeCharacterId) => set({ activeCharacterId }),
      setActiveOutfitId: (activeOutfitId) => set({ activeOutfitId }),
      setActiveSceneId: (activeSceneId) => set({ activeSceneId }),
      resetCharacter: () => set({ character: clone(CHARACTER_DEFAULTS), activeCharacterId: null, characterDirty: false }),
      resetWardrobe: () => set({ wardrobe: clone(WARDROBE_DEFAULTS), activeOutfitId: null, wardrobeDirty: false }),
      resetScene: () => set({ scene: clone(SCENE_DEFAULTS), activeSceneId: null, sceneDirty: false }),
      saveDraft: () => set({ savedAt: new Date().toISOString() }),
    }),
    {
      name: 'charactermaker-refactor-v2',
      version: 3,
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
        // A dirty local draft must never survive a reload while still claiming to be
        // the saved Supabase preset. Keep the draft values, but detach the preset id.
        activeCharacterId: state.characterDirty ? null : state.activeCharacterId,
        activeOutfitId: state.wardrobeDirty ? null : state.activeOutfitId,
        activeSceneId: state.sceneDirty ? null : state.activeSceneId,
        characterDirty: state.characterDirty,
        wardrobeDirty: state.wardrobeDirty,
        sceneDirty: state.sceneDirty,
        savedAt: state.savedAt,
      }),
      migrate: (persistedState, version) => {
        const previous = (persistedState ?? {}) as PersistedEditorState;
        if (version >= 3) return previous as EditorStore;

        // V2 persisted an active preset id together with an independently editable local draft.
        // After a reload the UI could therefore label stale local values as a loaded Supabase preset.
        // Preserve the draft, but detach it from the saved preset once during migration.
        return {
          ...previous,
          activeCharacterId: null,
          activeOutfitId: null,
          activeSceneId: null,
          characterDirty: Boolean(previous.activeCharacterId),
          wardrobeDirty: Boolean(previous.activeOutfitId),
          sceneDirty: Boolean(previous.activeSceneId),
        } as EditorStore;
      },
    },
  ),
);
