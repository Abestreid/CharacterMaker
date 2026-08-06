
import React, { useState, useCallback, useEffect } from 'react';
import { CharacterProfile, ImageResult, SceneResult, PhotoshootPreset } from './types';
import { INITIAL_PROFILE } from './src/constants/character/initialProfile';
import { POSES, ANIMATIONS, CHARACTER_EMOTIONS, CHARACTER_ORIENTATIONS } from './src/constants/scene/composition';
import { BACKGROUND_PRESETS, NATURAL_LIGHT_OPTIONS, STUDIO_LIGHT_PRESETS, STUDIO_LAMP_COLORS } from './src/constants/scene/environment';
import { ASPECT_RATIOS, CAMERA_HORIZONTAL_POSITIONS, CAMERA_VERTICAL_POSITIONS, SCENE_SHOT_TYPES } from './src/constants/scene/camera';
import { IMAGE_STYLES, SCENE_FILTERS } from './src/constants/scene/style';
import { CLOTHING_PRESETS } from './src/constants/clothing/presets';
import CharacterForm from './components/CharacterForm';
import SceneGenerator from './components/SceneGenerator';
import ImageDisplay from './components/ImageDisplay';
import { generatePortrait, editImage, generateScene, processUploadedPortrait, replaceClothing, upscaleImage, performTextualImageEdit, editCharacterAppearance, analyzeSceneReference } from './services/geminiService';
import { getDetailedPhysiqueDescription, urlToBase64, fileToBase64 } from './utils';
import Spinner from './components/Spinner';
import EditImageModal from './components/EditImageModal';

const App: React.FC = () => {
  const [profile, setProfile] = useState<CharacterProfile>(INITIAL_PROFILE);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [portraitImage, setPortraitImage] = useState<string | null>(null);
  const [clothingReferenceImages, setClothingReferenceImages] = useState<string[] | null>(null);
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [isGeneratingFullBody, setIsGeneratingFullBody] = useState(false);
  const [isGeneratingBackView, setIsGeneratingBackView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // State for Scene Generator
  const [sceneImages, setSceneImages] = useState<SceneResult[]>([]);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [isAnalyzingScene, setIsAnalyzingScene] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [scenePose, setScenePose] = useState<string>(POSES[0]);
  const [sceneAnimation, setSceneAnimation] = useState<string>('');
  const [sceneShotType, setSceneShotType] = useState<string>(SCENE_SHOT_TYPES[6].value); // Default to Full Body
  const [sceneBackground, setSceneBackground] = useState<string>(BACKGROUND_PRESETS[0]);
  const [sceneAspectRatio, setSceneAspectRatio] = useState<string>(ASPECT_RATIOS[1]); // Default 3:4
  const [sceneCameraVertical, setSceneCameraVertical] = useState<string>(CAMERA_VERTICAL_POSITIONS[2].value);
  const [sceneCameraHorizontal, setSceneCameraHorizontal] = useState<string>(CAMERA_HORIZONTAL_POSITIONS[1].value);
  const [sceneCharacterOrientation, setSceneCharacterOrientation] = useState<string>(CHARACTER_ORIENTATIONS[0].value);
  const [sceneEmotion, setSceneEmotion] = useState<string>(CHARACTER_EMOTIONS[0]);
  const [sceneImageStyle, setSceneImageStyle] = useState<string>(profile.imageStyle);
  const [sceneFilter, setSceneFilter] = useState<string>(SCENE_FILTERS[0]);
  const [lightingType, setLightingType] = useState<'natural' | 'studio'>('natural');
  const [naturalLight, setNaturalLight] = useState<string>(NATURAL_LIGHT_OPTIONS[2]); // Default to Day
  const [studioLightSetup, setStudioLightSetup] = useState<string>(STUDIO_LIGHT_PRESETS[0]);
  const [studioMainLightColor, setStudioMainLightColor] = useState<string>(STUDIO_LAMP_COLORS[0]); // Default to Neutral White
  const [studioAccentLightColor, setStudioAccentLightColor] = useState<string>(STUDIO_LAMP_COLORS[STUDIO_LAMP_COLORS.length - 1]); // Default to None
  const [colorTemperature, setColorTemperature] = useState<number>(5500); // Default to neutral daylight white
  const [sceneReferenceImage, setSceneReferenceImage] = useState<string | null>(null);
  const [useClothingFromReference, setUseClothingFromReference] = useState<boolean>(true);
  const [useExpressionFromReference, setUseExpressionFromReference] = useState<boolean>(true);

  // State for uploaded image processing
  const [processingOptions, setProcessingOptions] = useState({ cropAndStraighten: true, enhance: true, removeBg: true, removeAccessories: false });
  const [isApplyingEnhancements, setIsApplyingEnhancements] = useState(false);
  
  // State for image editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<ImageResult | null>(null);
  const [isEditingImage, setIsEditingImage] = useState(false);

  // State for user reference library
  const [userImageLibrary, setUserImageLibrary] = useState<string[]>([]);

  const isLoading = isGeneratingPortrait || isGeneratingFullBody || isGeneratingBackView || isGeneratingScene || isApplyingEnhancements || isEditingImage || isAnalyzingScene;
  const isFullBodyGenerated = images.some(img => img.type === 'Полный Рост');

  useEffect(() => {
    const description = getDetailedPhysiqueDescription(profile);
    if (description !== profile.physiqueDescription) {
        setProfile(p => ({ ...p, physiqueDescription: description }));
    }
  }, [profile.height, profile.weight, profile.bust, profile.waist, profile.hips]);
  
  useEffect(() => {
    setSceneImageStyle(profile.imageStyle);
  }, [profile.imageStyle]);

  const handleOpenEditModal = (image: ImageResult) => {
    setEditingTarget(image);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (isEditingImage) return;
    setIsEditModalOpen(false);
    setEditingTarget(null);
  };

  const handleApplyTextualEdit = async (prompt: string) => {
      if (!editingTarget || !prompt) return;
      setIsEditingImage(true);
      setError(null);
      setStatusMessage('Редактирование изображения...');
      try {
          const base64Data = editingTarget.src.split(',')[1];
          const editedB64 = await performTextualImageEdit(base64Data, prompt);
          const newSrc = `data:image/png;base64,${editedB64}`;
          setImages(prevImages => prevImages.map(img => 
              img.type === editingTarget.type ? { ...img, src: newSrc, origin: 'generated' } : img
          ));
          if (editingTarget.type === 'Портрет') setPortraitImage(editedB64);
          setStatusMessage('Изображение успешно отредактировано.');
          handleCloseEditModal();
      } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'Ошибка при редактировании.');
          setStatusMessage('Ошибка редактирования.');
      } finally {
          setIsEditingImage(false);
      }
  };
  
  const handleApplyAppearanceEdit = async (modifiedProfile: CharacterProfile) => {
    if (!editingTarget) return;
    setIsEditingImage(true);
    setError(null);
    setStatusMessage('Обновление персонажа...');
    try {
        const imageToEditB64 = editingTarget.src.split(',')[1];
        let frontViewRefB64: string | null = null;
        if (editingTarget.type === 'Вид Сзади') {
            const frontViewImage = images.find(img => img.type === 'Полный Рост');
            if (!frontViewImage) throw new Error("Сначала отредактируйте вид спереди.");
            frontViewRefB64 = frontViewImage.src.split(',')[1];
        }
        const editedB64 = await editCharacterAppearance(imageToEditB64, modifiedProfile, frontViewRefB64);
        const newSrc = `data:image/png;base64,${editedB64}`;
        setImages(prevImages => prevImages.map(img => 
            img.type === editingTarget.type ? { ...img, src: newSrc, origin: 'generated' } : img
        ));
        if (editingTarget.type === 'Полный Рост') setProfile(modifiedProfile);
        setStatusMessage('Внешность успешно обновлена.');
        handleCloseEditModal();
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Ошибка при обновлении.');
        setStatusMessage('Ошибка обновления.');
    } finally {
        setIsEditingImage(false);
    }
  };

  const handleImageUpload = useCallback((file: File) => {
    setStatusMessage('Загрузка портрета...');
    setError(null);
    fileToBase64(file).then(b64 => {
        setImages([{ type: 'Портрет', src: `data:image/png;base64,${b64}`, origin: 'uploaded' }]);
        setPortraitImage(b64);
        setSceneImages([]);
        setStatusMessage('Портрет загружен.');
    });
  }, []);

  const handleFullBodyUpload = useCallback((file: File) => {
    setStatusMessage('Загрузка тела...');
    setError(null);
    fileToBase64(file).then(b64 => {
        const portrait = images.find(img => img.type === 'Портрет');
        if(portrait) {
            setImages([portrait, { type: 'Полный Рост', src: `data:image/png;base64,${b64}`, origin: 'uploaded' }]);
            setSceneImages([]);
            setStatusMessage('Тело загружено.');
        } else {
             setError("Сначала необходимо загрузить портрет.");
        }
    });
  }, [images]);

  const handleBackViewUpload = useCallback((file: File) => {
    setStatusMessage('Загрузка вида сзади...');
    setError(null);
    fileToBase64(file).then(b64 => {
        setImages(prev => [...prev.filter(img => img.type !== 'Вид Сзади'), { type: 'Вид Сзади', src: `data:image/png;base64,${b64}`, origin: 'uploaded' }]);
        setStatusMessage('Вид сзади загружен.');
    });
  }, []);

  const handleApplyImageProcessing = async () => {
    if (!portraitImage) return;
    setIsApplyingEnhancements(true);
    setStatusMessage('ИИ-улучшение портрета...');
    setError(null);
    try {
        const processedB64 = await processUploadedPortrait(portraitImage, processingOptions);
        setPortraitImage(processedB64);
        const newSrc = `data:image/png;base64,${processedB64}`;
        setImages(prevImages => prevImages.map(img => img.type === 'Портрет' ? { ...img, src: newSrc, origin: 'generated' } : img));
        setStatusMessage('Портрет успешно улучшен.');
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Ошибка при обработке.');
        setStatusMessage('Ошибка обработки.');
    } finally {
        setIsApplyingEnhancements(false);
    }
  };
  
  const handleClothingImageUpload = useCallback((file: File) => {
    setStatusMessage('Обработка референса одежды...');
    fileToBase64(file).then(b64 => {
        setClothingReferenceImages([b64]);
        setProfile(p => ({ ...p, clothingPreset: 'Свой (из файла)' }));
        setStatusMessage('Референс одежды загружен.');
    });
  }, []);

  const handleSelectClothingLibraryItem = useCallback(async (urls: string[]) => {
    setStatusMessage('Загрузка референсов из библиотеки...');
    try {
        const base64Images = await Promise.all(urls.map(urlToBase64));
        setClothingReferenceImages(base64Images);
        setProfile(p => ({ ...p, clothingPreset: 'Свой (из библиотеки)' }));
        setStatusMessage('Референсы из библиотеки загружены.');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при загрузке из библиотеки.');
        setClothingReferenceImages(null);
    }
  }, []);
  
  const handleSetClothingFromUserLibrary = useCallback((images: string[]) => {
      setClothingReferenceImages(images);
      setProfile(p => ({...p, clothingPreset: 'Свой (из референса)'}));
      setStatusMessage(`${images.length} референс(ов) применены.`);
  }, []);

  const handleClearClothingImage = useCallback(() => {
    setClothingReferenceImages(null);
    const defaultPreset = CLOTHING_PRESETS[0];
    if (profile.clothingPreset.startsWith('Свой')) {
        setProfile(p => ({ ...p, clothingPreset: defaultPreset.name, topType: defaultPreset.topType, bottomType: defaultPreset.bottomType }));
    }
  }, [profile.clothingPreset]);
  
  const handleUserImageLibraryUpload = async (files: FileList) => {
      setStatusMessage('Загрузка в библиотеку...');
      try {
          const base64Promises = Array.from(files).map(fileToBase64);
          const base64Images = await Promise.all(base64Promises);
          setUserImageLibrary(prev => [...prev, ...base64Images]);
          setStatusMessage(`${files.length} изображений добавлено.`);
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Ошибка при загрузке в библиотеку.');
      }
  };

  const handleDeleteUserImage = (index: number) => setUserImageLibrary(prev => prev.filter((_, i) => i !== index));

  const handleGeneratePortrait = useCallback(async () => {
    setIsGeneratingPortrait(true);
    setError(null);
    setImages([]);
    setPortraitImage(null);
    setSceneImages([]);
    setStatusMessage('Генерация портрета...');
    try {
      const portraitB64 = await generatePortrait(profile);
      setImages([{ type: 'Портрет', src: `data:image/png;base64,${portraitB64}`, origin: 'generated' }]);
      setPortraitImage(portraitB64);
      setStatusMessage('Портрет создан.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при генерации портрета.');
    } finally {
      setIsGeneratingPortrait(false);
    }
  }, [profile]);

  const handleGenerateFullBody = useCallback(async () => {
    const portraitResult = images.find(img => img.type === 'Портрет');
    if (!portraitResult) return;
    setIsGeneratingFullBody(true);
    setError(null);
    setSceneImages([]);
    setImages(prev => prev.slice(0, 1));
    try {
      let fullBodyB64: string;
      const existingFullBody = images.find(img => img.type === 'Полный Рост');
      if (existingFullBody && existingFullBody.origin === 'uploaded') {
        setStatusMessage('Замена одежды (3:4)...');
        const uploadedB64 = existingFullBody.src.split(',')[1];
        fullBodyB64 = await replaceClothing(profile, uploadedB64, clothingReferenceImages, '3:4');
      } else {
        setStatusMessage('Генерация вида в полный рост (3:4)...');
        const portraitB64 = portraitResult.src.split(',')[1];
        fullBodyB64 = await editImage(profile, portraitB64, 'full-body', clothingReferenceImages, '3:4');
      }
      setImages([portraitResult, { type: 'Полный Рост', src: `data:image/png;base64,${fullBodyB64}`, origin: 'generated' }]);
      setStatusMessage('Вид в полный рост (3:4) создан.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при генерации тела.');
    } finally {
      setIsGeneratingFullBody(false);
    }
  }, [profile, images, clothingReferenceImages]);

  const handleGenerateBackView = useCallback(async () => {
    const fullBodyImage = images.find(img => img.type === 'Полный Рост');
    if (!fullBodyImage) return;
    setIsGeneratingBackView(true);
    setError(null);
    setImages(prev => prev.slice(0, 2));
    try {
      let backViewB64: string;
      const existingBackView = images.find(img => img.type === 'Вид Сзади');
      if (existingBackView && existingBackView.origin === 'uploaded') {
          backViewB64 = await replaceClothing(profile, existingBackView.src.split(',')[1], clothingReferenceImages, '3:4');
      } else {
          backViewB64 = await editImage(profile, fullBodyImage.src.split(',')[1], 'back-view', clothingReferenceImages, '3:4');
      }
      setImages(prev => [...prev, { type: 'Вид Сзади', src: `data:image/png;base64,${backViewB64}`, origin: 'generated' }]);
      setStatusMessage('Вид сзади (3:4) создан.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при генерации вида сзади.');
    } finally {
      setIsGeneratingBackView(false);
    }
  }, [profile, images, clothingReferenceImages]);

  const handleSceneReferenceUpload = useCallback((file: File) => {
    fileToBase64(file).then(b64 => setSceneReferenceImage(b64));
  }, []);

  const handleClearSceneReference = useCallback(() => setSceneReferenceImage(null), []);

  const handleAnalyzeSceneReference = async () => {
      if (!sceneReferenceImage) return;
      setIsAnalyzingScene(true);
      setStatusMessage('Анализ референса сцены...');
      try {
          const p = await analyzeSceneReference(sceneReferenceImage);
          setScenePose(p.pose || scenePose);
          setSceneShotType(p.shotType || sceneShotType);
          setSceneBackground(p.background || sceneBackground);
          setSceneAspectRatio(p.aspectRatio || sceneAspectRatio);
          setSceneCameraVertical(p.cameraVertical || sceneCameraVertical);
          setSceneCameraHorizontal(p.cameraHorizontal || sceneCameraHorizontal);
          setSceneCharacterOrientation(p.characterOrientation || sceneCharacterOrientation);
          setSceneEmotion(p.emotion || sceneEmotion);
          setSceneImageStyle(p.imageStyle || sceneImageStyle);
          setLightingType(p.lightingType || lightingType);
          setNaturalLight(p.naturalLight || naturalLight);
          setStudioLightSetup(p.studioLightSetup || studioLightSetup);
          setStudioMainLightColor(p.studioMainLightColor || studioMainLightColor);
          setStudioAccentLightColor(p.studioAccentLightColor || studioAccentLightColor);
          setColorTemperature(p.colorTemperature || colorTemperature);
          setSceneFilter(p.filter || sceneFilter);
          setStatusMessage('Настройки обновлены из референса.');
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Ошибка при анализе.');
      } finally {
          setIsAnalyzingScene(false);
      }
  };

  const handleGenerateScene = useCallback(async (options?: { useReferenceDirectly?: boolean }) => {
    const fullBodyImage = images.find(img => img.type === 'Полный Рост');
    const portraitImageRef = images.find(img => img.type === 'Портрет');
    if (!fullBodyImage?.src) return;
    const base64FullBody = fullBodyImage.src.split(',')[1];
    const base64Portrait = portraitImageRef ? portraitImageRef.src.split(',')[1] : null;
    setIsGeneratingScene(true);
    setSceneError(null);
    setStatusMessage("Генерация сцены...");
    try {
        const sceneB64 = await generateScene(base64FullBody, base64Portrait, scenePose, sceneAnimation, sceneShotType, sceneBackground, sceneAspectRatio, sceneCameraVertical, sceneCameraHorizontal, sceneCharacterOrientation, sceneEmotion, sceneImageStyle, clothingReferenceImages, lightingType, naturalLight, studioLightSetup, studioMainLightColor, studioAccentLightColor, colorTemperature, sceneFilter, profile.clothingPreset === 'Без одежды', options?.useReferenceDirectly ? sceneReferenceImage : null, useClothingFromReference, useExpressionFromReference);
        setSceneImages(prev => [...prev, { id: Date.now().toString(), src: `data:image/png;base64,${sceneB64}`, isUpscaling: false, error: null }]);
        setStatusMessage("Сцена создана!");
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при генерации сцены.');
    } finally {
        setIsGeneratingScene(false);
    }
  }, [images, scenePose, sceneAnimation, sceneShotType, sceneBackground, sceneAspectRatio, sceneCameraVertical, sceneCameraHorizontal, sceneCharacterOrientation, sceneEmotion, sceneImageStyle, clothingReferenceImages, lightingType, naturalLight, studioLightSetup, studioMainLightColor, studioAccentLightColor, colorTemperature, sceneFilter, profile, sceneReferenceImage, useClothingFromReference, useExpressionFromReference]);

  const handleUpscaleScene = async (sceneId: string) => {
    const s = sceneImages.find(s => s.id === sceneId);
    if (!s?.src) return;
    setSceneImages(prev => prev.map(si => si.id === sceneId ? { ...si, isUpscaling: true, error: null } : si));
    try {
        const b64 = await upscaleImage(s.src.split(',')[1]);
        setSceneImages(prev => prev.map(si => si.id === sceneId ? { ...si, src: `data:image/png;base64,${b64}`, isUpscaling: false } : si));
    } catch (err) {
        setSceneImages(prev => prev.map(si => si.id === sceneId ? { ...si, error: err instanceof Error ? err.message : 'Ошибка улучшения', isUpscaling: false } : si));
    }
  };
  
  const handleDeleteScene = (id: string) => setSceneImages(prev => prev.filter(s => s.id !== id));
  
  const genericFileHandler = (e: React.ChangeEvent<HTMLInputElement>, cb: (file: File) => void) => {
    if (e.target.files?.[0]) cb(e.target.files[0]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-7xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            AI Character Sheet Generator
          </h1>
          <p className="text-gray-400 mt-2">Генерация персонажей с использованием Gemini Flash.</p>
        </header>

        <main className="flex flex-col gap-12">
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg shadow-lg">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-indigo-400">Шаг 1: Описание Персонажа</h2>
                </div>
                <CharacterForm 
                  profile={profile} setProfile={setProfile} isLoading={isLoading}
                  onClothingImageUpload={handleClothingImageUpload} onSelectClothingLibraryItem={handleSelectClothingLibraryItem}
                  onSetClothingFromUserLibrary={handleSetClothingFromUserLibrary} onClearClothingImage={handleClearClothingImage}
                  clothingReferenceImages={clothingReferenceImages} setSceneBackground={setSceneBackground}
                  userImageLibrary={userImageLibrary} onUserImageLibraryUpload={handleUserImageLibraryUpload} onDeleteUserImage={handleDeleteUserImage}
                />
            </div>
            
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-indigo-400 mb-4">Шаг 2: Генерация Листа Персонажа</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col space-y-3 p-4 bg-gray-900/50 rounded-lg">
                        <h3 className="font-semibold text-center text-gray-300">1. Портрет</h3>
                        <button onClick={handleGeneratePortrait} disabled={isLoading} className="w-full bg-indigo-600 py-2 rounded-lg font-bold text-sm">Сгенерировать</button>
                        <label className="block w-full text-center bg-gray-700 py-2 rounded-lg cursor-pointer text-sm">Загрузить<input type="file" className="hidden" accept="image/*" onChange={(e) => genericFileHandler(e, handleImageUpload)}/></label>
                    </div>
                    <div className="flex flex-col space-y-3 p-4 bg-gray-900/50 rounded-lg">
                        <h3 className="font-semibold text-center text-gray-300">2. Полный Рост (3:4)</h3>
                        <button onClick={handleGenerateFullBody} disabled={isLoading || !portraitImage} className="w-full bg-blue-600 py-2 rounded-lg font-bold text-sm">Сгенерировать</button>
                        <label className="block w-full text-center bg-gray-700 py-2 rounded-lg cursor-pointer text-sm">Загрузить<input type="file" className="hidden" accept="image/*" onChange={(e) => genericFileHandler(e, handleFullBodyUpload)}/></label>
                    </div>
                    <div className="flex flex-col space-y-3 p-4 bg-gray-900/50 rounded-lg">
                        <h3 className="font-semibold text-center text-gray-300">3. Вид Сзади (3:4)</h3>
                        <button onClick={handleGenerateBackView} disabled={isLoading || !isFullBodyGenerated} className="w-full bg-sky-600 py-2 rounded-lg font-bold text-sm">Сгенерировать</button>
                        <label className="block w-full text-center bg-gray-700 py-2 rounded-lg cursor-pointer text-sm">Загрузить<input type="file" className="hidden" accept="image/*" onChange={(e) => genericFileHandler(e, handleBackViewUpload)}/></label>
                    </div>
                </div>
                {statusMessage && <div className="mt-4 text-center text-sm text-gray-400">{statusMessage}</div>}
            </div>
            
            {isFullBodyGenerated && (
                <div className="bg-gray-800 rounded-lg shadow-lg">
                    <div className="p-6 border-b border-gray-700">
                      <h2 className="text-2xl font-bold text-teal-400">Шаг 3: Генерация Сцен</h2>
                    </div>
                    <SceneGenerator
                        pose={scenePose} setPose={setScenePose} animation={sceneAnimation} setAnimation={setSceneAnimation}
                        shotType={sceneShotType} setShotType={setSceneShotType} background={sceneBackground} setBackground={setSceneBackground}
                        aspectRatio={sceneAspectRatio} setAspectRatio={setSceneAspectRatio} cameraVertical={sceneCameraVertical} setCameraVertical={setSceneCameraVertical}
                        cameraHorizontal={sceneCameraHorizontal} setCameraHorizontal={setSceneCameraHorizontal} characterOrientation={sceneCharacterOrientation} setCharacterOrientation={setSceneCharacterOrientation}
                        emotion={sceneEmotion} setEmotion={setSceneEmotion} imageStyle={sceneImageStyle} setImageStyle={setSceneImageStyle}
                        filter={sceneFilter} setFilter={setSceneFilter} onGenerate={handleGenerateScene} isLoading={isGeneratingScene}
                        isAnalyzing={isAnalyzingScene} onAnalyze={handleAnalyzeSceneReference} lightingType={lightingType} setLightingType={setLightingType}
                        naturalLight={naturalLight} setNaturalLight={setNaturalLight} studioLightSetup={studioLightSetup} setStudioLightSetup={setStudioLightSetup}
                        studioMainLightColor={studioMainLightColor} setStudioMainLightColor={setStudioMainLightColor} studioAccentLightColor={studioAccentLightColor} setStudioAccentLightColor={setStudioAccentLightColor}
                        colorTemperature={colorTemperature} setColorTemperature={setColorTemperature} sceneReferenceImage={sceneReferenceImage}
                        onSceneReferenceUpload={handleSceneReferenceUpload} onClearSceneReference={handleClearSceneReference} useClothingFromReference={useClothingFromReference}
                        setUseClothingFromReference={setUseClothingFromReference} useExpressionFromReference={useExpressionFromReference} setUseExpressionFromReference={setUseExpressionFromReference}
                    />
              </div>
            )}
          </div>
          
          {(images.length > 0 || isLoading) && (
            <div className="space-y-8">
              <ImageDisplay 
                images={images} isGeneratingPortrait={isGeneratingPortrait} isGeneratingFullBody={isGeneratingFullBody} isGeneratingBackView={isGeneratingBackView}
                error={error} isApplyingEnhancements={isApplyingEnhancements} onApplyImageProcessing={handleApplyImageProcessing}
                processingOptions={processingOptions} setProcessingOptions={setProcessingOptions} onEdit={handleOpenEditModal}
              />
               {sceneImages.length > 0 && (
                  <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-teal-400 mb-4">Сгенерированные Сцены</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {sceneImages.map((scene) => (
                        <div key={scene.id} className="bg-gray-900 rounded-lg overflow-hidden flex flex-col relative border border-gray-700">
                          <div className="aspect-square flex items-center justify-center bg-black/20">
                            {(scene.isUpscaling || (!scene.src && !scene.error)) && <Spinner />}
                            {scene.src && <img src={scene.src} alt="Scene" className="object-contain w-full h-full" />}
                            {scene.error && <div className="p-4 text-center text-red-400 text-sm">{scene.error}</div>}
                          </div>
                          <div className="bg-gray-700/50 p-3 flex justify-end space-x-2">
                            {scene.src && (
                                <>
                                    <button onClick={() => handleUpscaleScene(scene.id)} disabled={scene.isUpscaling} className="text-indigo-400 hover:text-white p-2 bg-gray-800 rounded-md">Upscale</button>
                                    <a href={scene.src} download={`scene-${scene.id}.png`} className="text-teal-400 hover:text-white p-2 bg-gray-800 rounded-md">Save</a>
                                </>
                            )}
                            <button onClick={() => handleDeleteScene(scene.id)} className="text-red-400 hover:text-white p-2 bg-gray-800 rounded-md">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </main>
      </div>
      <EditImageModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onConfirmTextualEdit={handleApplyTextualEdit} onConfirmAppearanceEdit={handleApplyAppearanceEdit} targetImage={editingTarget} initialProfile={profile} isEditing={isEditingImage} />
    </div>
  );
};

export default App;
