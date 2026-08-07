import { characterMakerService } from '../../core/character-maker.service';
import { useEditorStore } from '../../store/editor-store';
import { PresetManager } from './PresetManager';

export function CharacterPresetPanel() {
  const state = useEditorStore((store) => store.character);
  const setState = useEditorStore((store) => store.setCharacter);
  const setActiveId = useEditorStore((store) => store.setActiveCharacterId);
  return (
    <PresetManager
      kind="character"
      label="Персона"
      loadPresets={characterMakerService.characters.list}
      loadState={characterMakerService.characters.load}
      onLoad={(value, id) => {
        setState(value);
        setActiveId(id);
      }}
      saveState={characterMakerService.characters.save}
      state={state}
    />
  );
}

export function OutfitPresetPanel() {
  const state = useEditorStore((store) => store.wardrobe);
  const setState = useEditorStore((store) => store.setWardrobe);
  const setActiveId = useEditorStore((store) => store.setActiveOutfitId);
  return (
    <PresetManager
      kind="outfit"
      label="Образ"
      loadPresets={characterMakerService.outfits.list}
      loadState={characterMakerService.outfits.load}
      onLoad={(value, id) => {
        setState(value);
        setActiveId(id);
      }}
      saveState={characterMakerService.outfits.save}
      state={state}
    />
  );
}

export function ScenePresetPanel() {
  const state = useEditorStore((store) => store.scene);
  const setState = useEditorStore((store) => store.setScene);
  const setActiveId = useEditorStore((store) => store.setActiveSceneId);
  return (
    <PresetManager
      kind="scene"
      label="Сцена"
      loadPresets={characterMakerService.scenes.list}
      loadState={characterMakerService.scenes.load}
      onLoad={(value, id) => {
        setState(value);
        setActiveId(id);
      }}
      saveState={characterMakerService.scenes.save}
      state={state}
    />
  );
}
