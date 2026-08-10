import { characterMakerService } from '../../core/character-maker.service';
import { useEditorStore } from '../../store/editor-store';
import { PresetManager } from './PresetManager';

export function CharacterPresetPanel() {
  const state = useEditorStore((store) => store.character);
  const activeId = useEditorStore((store) => store.activeCharacterId);
  const dirty = useEditorStore((store) => store.characterDirty);
  const loadState = useEditorStore((store) => store.loadCharacter);
  const setActiveId = useEditorStore((store) => store.setActiveCharacterId);
  return (
    <PresetManager
      activeId={activeId}
      dirty={dirty}
      kind="character"
      label="Персона"
      loadPresets={characterMakerService.characters.list}
      loadState={characterMakerService.characters.load}
      onActiveChange={setActiveId}
      onLoad={(value, id) => loadState(value, id)}
      saveState={characterMakerService.characters.save}
      state={state}
    />
  );
}

export function OutfitPresetPanel() {
  const state = useEditorStore((store) => store.wardrobe);
  const activeId = useEditorStore((store) => store.activeOutfitId);
  const dirty = useEditorStore((store) => store.wardrobeDirty);
  const loadState = useEditorStore((store) => store.loadWardrobe);
  const setActiveId = useEditorStore((store) => store.setActiveOutfitId);
  return (
    <PresetManager
      activeId={activeId}
      dirty={dirty}
      kind="outfit"
      label="Образ"
      loadPresets={characterMakerService.outfits.list}
      loadState={characterMakerService.outfits.load}
      onActiveChange={setActiveId}
      onLoad={(value, id) => loadState(value, id)}
      saveState={characterMakerService.outfits.save}
      state={state}
    />
  );
}

export function ScenePresetPanel() {
  const state = useEditorStore((store) => store.scene);
  const activeId = useEditorStore((store) => store.activeSceneId);
  const dirty = useEditorStore((store) => store.sceneDirty);
  const loadState = useEditorStore((store) => store.loadScene);
  const setActiveId = useEditorStore((store) => store.setActiveSceneId);
  return (
    <PresetManager
      activeId={activeId}
      dirty={dirty}
      kind="scene"
      label="Сцена"
      loadPresets={characterMakerService.scenes.list}
      loadState={characterMakerService.scenes.load}
      onActiveChange={setActiveId}
      onLoad={(value, id) => loadState(value, id)}
      saveState={characterMakerService.scenes.save}
      state={state}
    />
  );
}
