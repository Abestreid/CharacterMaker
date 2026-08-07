import { useEditorStore } from '../../store/editor-store';
import { fetchPublicCharacters, fetchPublicOutfits, fetchPublicScenes } from '../../infrastructure/supabase/library.repository';
import { characterStateToPreset, sceneStateToPreset, wardrobeStateToOutfitPreset } from '../../infrastructure/supabase/preset-mappers';
import { PresetManager } from './PresetManager';

export function CharacterPresetPanel() {
  const state = useEditorStore((store) => store.character);
  const onLoad = useEditorStore((store) => store.setCharacter);
  return <PresetManager kind="character" label="Персона" loadPresets={fetchPublicCharacters} onLoad={onLoad} state={state} toPayload={characterStateToPreset} />;
}

export function OutfitPresetPanel() {
  const state = useEditorStore((store) => store.wardrobe);
  const onLoad = useEditorStore((store) => store.setWardrobe);
  return <PresetManager kind="outfit" label="Образ" loadPresets={fetchPublicOutfits} onLoad={onLoad} state={state} toPayload={wardrobeStateToOutfitPreset} />;
}

export function ScenePresetPanel() {
  const state = useEditorStore((store) => store.scene);
  const onLoad = useEditorStore((store) => store.setScene);
  return <PresetManager kind="scene" label="Сцена" loadPresets={fetchPublicScenes} onLoad={onLoad} state={state} toPayload={sceneStateToPreset} />;
}
