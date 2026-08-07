import { characterMakerService } from '../../core/character-maker.service';
import { useEditorStore } from '../../store/editor-store';
import { PresetManager } from './PresetManager';

export function CharacterPresetPanel() {
  const state = useEditorStore((store) => store.character);
  const activeId = useEditorStore((store) => store.activeCharacterId);
  const setState = useEditorStore((store) => store.setCharacter);
  const setActiveId = useEditorStore((store) => store.setActiveCharacterId);
  return (
    <PresetManager
      activeId={activeId}
      kind="character"
      label="Персона"
      loadPresets={characterMakerService.characters.list}
      loadState={characterMakerService.characters.load}
      onActiveChange={setActiveId}
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
  const activeId = useEditorStore((store) => store.activeOutfitId);
  const setState = useEditorStore((store) => store.setWardrobe);
  const setActiveId = useEditorStore((store) => store.setActiveOutfitId);
  return (
    <PresetManager
      activeId={activeId}
      kind="outfit"
      label="Образ"
      loadPresets={characterMakerService.outfits.list}
      loadState={characterMakerService.outfits.load}
      onActiveChange={setActiveId}
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
  const activeId = useEditorStore((store) => store.activeSceneId);
  const setState = useEditorStore((store) => store.setScene);
  const setActiveId = useEditorStore((store) => store.setActiveSceneId);
  return (
    <PresetManager
      activeId={activeId}
      kind="scene"
      label="Сцена"
      loadPresets={characterMakerService.scenes.list}
      loadState={characterMakerService.scenes.load}
      onActiveChange={setActiveId}
      onLoad={(value, id) => {
        setState(value);
        setActiveId(id);
      }}
      saveState={characterMakerService.scenes.save}
      state={state}
    />
  );
}
