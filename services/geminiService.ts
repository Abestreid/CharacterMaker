
import { GoogleGenAI, Type } from "@google/genai";
import { CharacterProfile, PhotoshootPreset } from '../types';
import { getDetailedPhysiqueDescription } from "../utils";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const translationMap: { [key: string]: string } = {
    'Женский': 'female', 'Мужской': 'male',
    'Бледная': 'pale', 'Светлая': 'fair', 'Загорелая': 'tanned', 'Оливковая': 'olive', 'Смуглая': 'dark', 'Темная': 'deep dark', 'Эбеновая': 'ebony',
    'Европеоид': 'Caucasian', 'Восточноазиатский': 'East Asian', 'Южноазиатский': 'South Asian', 'Африканский': 'African', 'Испанский': 'Hispanic', 'Ближневосточный': 'Middle Eastern', 'Коренной американец': 'Native American',
    'Рассвет': 'sunrise', 'Утро': 'morning', 'День': 'midday', 'Вечер': 'evening', 'Закат': 'sunset', 'Ночь': 'night',
};

function translate(value: string): string {
    return translationMap[value] || value;
}

function normalizeAspectRatio(ratio: string): string {
    const supported = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    if (supported.includes(ratio)) return ratio;
    if (ratio === '2:3') return '3:4';
    if (ratio === '3:2') return '4:3';
    return '1:1';
}

function getClothingDescription(profile: CharacterProfile): string {
    const parts: string[] = [];
    // Если есть кастомное описание (из пресета), оно идет первым
    if (profile.accessoriesCustom) parts.push(profile.accessoriesCustom);
    
    if (profile.topType && profile.topType !== 'Нет одежды') parts.push(`${translate(profile.topColor)} ${translate(profile.topType)}`);
    if (profile.bottomType && profile.bottomType !== 'Нет одежды') parts.push(`${translate(profile.bottomColor)} ${translate(profile.bottomType)}`);
    if (profile.outerwearType && profile.outerwearType !== 'Нет одежды') parts.push(`${translate(profile.outerwearColor)} ${translate(profile.outerwearType)}`);
    if (profile.footwearType && profile.footwearType !== 'Нет одежды') parts.push(`${translate(profile.footwearColor)} ${translate(profile.footwearType)}`);
    
    return parts.length > 0 ? `Wearing: ${parts.join(', ')}.` : 'Nude artistic reference pose.';
}

function buildPortraitPrompt(profile: CharacterProfile): string {
    const genderedTerm = profile.gender === 'Женский' ? 'woman' : 'man';
    return `
      Professional high-detail portrait of a ${profile.age}yo ${translate(profile.ethnicity)} ${genderedTerm}.
      Style: ${profile.imageStyle}. Tight face shot. Pure white background.
      Features: ${translate(profile.hairLength)} ${translate(profile.hairColor)} hair, ${translate(profile.eyeColor)} eyes.
    `;
}

function buildEditPrompt(profile: CharacterProfile, type: 'full-body' | 'back-view', hasRef: boolean): string {
    const view = type === 'full-body' ? 'front view' : 'back view';
    const bodyInst = type === 'full-body' 
        ? "FULL BODY SHOT. Head to toe framing. Entire body and shoes must be visible. Do not crop feet." 
        : "BACK VIEW. Character standing with back to camera. Entire body visible.";

    return `
      Task: Generate ${view} of the character. 
      Framing: ${bodyInst}
      Character Identity: MUST match face and hair from the original portrait.
      Physique: ${getDetailedPhysiqueDescription(profile, type === 'full-body' ? 'front' : 'back')}.
      Style: ${profile.imageStyle} on white background.
      Clothing: ${hasRef ? "Strictly replicate clothing from reference image." : getClothingDescription(profile)}
    `;
}

function buildScenePrompt(pose: string, anim: string, shot: string, bg: string, style: string, aspect: string, v: string, h: string, orient: string, emo: string, lType: string, nL: string, sS: string, mC: string, aC: string, temp: number, filt: string, isNude: boolean, hasSceneRef: boolean, useClothingRef: boolean, useExpressionRef: boolean): string {
    return `
      Cinematic scene. Style: ${style}. 
      Character in ${bg}. Framing: ${shot}. Camera: ${v}, ${h}.
      Action: ${anim || pose}. Expression: ${emo}.
      Lighting: ${lType === 'natural' ? translate(nL) : sS}, ${temp}K.
      ${isNude ? "Artistic nude pose." : "Maintain character's current clothing."}
      High quality, consistent character identity.
    `;
}

async function handleResponse(response: any): Promise<string> {
    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    
    // Если произошла ошибка контента (Hate speech, Harassment и т.д.)
    if (candidate?.finishReason === 'SAFETY') {
        throw new Error("Генерация заблокирована фильтром безопасности. Попробуйте изменить описание одежды или позу.");
    }
    
    const textPart = candidate?.content?.parts?.find((p: any) => p.text);
    throw new Error(textPart?.text || "Ошибка API: Модель не вернула изображение.");
}

export const generatePortrait = async (profile: CharacterProfile): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: buildPortraitPrompt(profile) }] },
        config: { imageConfig: { aspectRatio: '1:1' } },
    });
    return handleResponse(response);
};

export const editImage = async (profile: CharacterProfile, base64: string, type: 'full-body' | 'back-view', refs: string[] | null, aspectRatio: string = '1:1'): Promise<string> => {
    const parts: any[] = [{ inlineData: { data: base64, mimeType: 'image/png' } }];
    if (refs) refs.forEach(r => parts.push({ inlineData: { data: r, mimeType: 'image/jpeg' } }));
    parts.push({ text: buildEditPrompt(profile, type, !!refs) });
    const response = await ai.models.generateContent({ 
        model: 'gemini-2.5-flash-image', 
        contents: { parts },
        config: { imageConfig: { aspectRatio: normalizeAspectRatio(aspectRatio) } }
    });
    return handleResponse(response);
};

export const replaceClothing = async (profile: CharacterProfile, base64: string, refs: string[] | null, aspectRatio: string = '1:1'): Promise<string> => {
    const parts: any[] = [{ inlineData: { data: base64, mimeType: 'image/png' } }];
    if (refs) refs.forEach(r => parts.push({ inlineData: { data: r, mimeType: 'image/jpeg' } }));
    parts.push({ text: `REPLACE CLOTHING. Use this style: ${getClothingDescription(profile)}. Keep face and body pose exactly the same. Full body shot.` });
    const response = await ai.models.generateContent({ 
        model: 'gemini-2.5-flash-image', 
        contents: { parts },
        config: { imageConfig: { aspectRatio: normalizeAspectRatio(aspectRatio) } }
    });
    return handleResponse(response);
};

export const generateScene = async (body: string, port: string | null, pose: string, anim: string, shot: string, bg: string, aspect: string, v: string, h: string, orient: string, emo: string, style: string, refs: string[] | null, lType: 'natural' | 'studio', nL: string, sS: string, mC: string, aC: string, temp: number, filt: string, isNude: boolean, sceneRef: string | null, useClothingRef: boolean, useExpressionRef: boolean): Promise<string> => {
    const parts: any[] = [{ inlineData: { data: body, mimeType: 'image/png' } }];
    if (port) parts.push({ inlineData: { data: port, mimeType: 'image/png' } });
    if (sceneRef) parts.push({ inlineData: { data: sceneRef, mimeType: 'image/jpeg' } });
    parts.push({ text: buildScenePrompt(pose, anim, shot, bg, style, aspect, v, h, orient, emo, lType, nL, sS, mC, aC, temp, filt, isNude, !!sceneRef, useClothingRef, useExpressionRef) });
    const response = await ai.models.generateContent({ 
        model: 'gemini-2.5-flash-image', 
        contents: { parts },
        config: { imageConfig: { aspectRatio: normalizeAspectRatio(aspect) } }
    });
    return handleResponse(response);
};

export const analyzeSceneReference = async (base64: string): Promise<PhotoshootPreset> => {
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING }, pose: { type: Type.STRING }, shotType: { type: Type.STRING },
            background: { type: Type.STRING }, aspectRatio: { type: Type.STRING }, cameraVertical: { type: Type.STRING },
            cameraHorizontal: { type: Type.STRING }, characterOrientation: { type: Type.STRING }, emotion: { type: Type.STRING },
            imageStyle: { type: Type.STRING }, lightingType: { type: Type.STRING }, naturalLight: { type: Type.STRING },
            studioLightSetup: { type: Type.STRING }, studioMainLightColor: { type: Type.STRING }, studioAccentLightColor: { type: Type.STRING },
            colorTemperature: { type: Type.INTEGER }, filter: { type: Type.STRING }
        },
        required: ["pose", "shotType", "background", "imageStyle"]
    };
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: [{ inlineData: { data: base64, mimeType: 'image/jpeg' } }, { text: "Analyze this image and return scene settings as JSON." }] },
        config: { responseMimeType: "application/json", responseSchema: responseSchema },
    });
    return JSON.parse(response.text.trim()) as PhotoshootPreset;
};

export const upscaleImage = async (base64: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: { data: base64, mimeType: 'image/png' } }, { text: "High quality upscale, photorealistic details." }] }
    });
    return handleResponse(response);
};

export const processUploadedPortrait = async (base64: string, options: any): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: { data: base64, mimeType: 'image/png' } }, { text: "Cleanup portrait, enhance face, pure white background." }] },
        config: { imageConfig: { aspectRatio: '1:1' } }
    });
    return handleResponse(response);
};

export const performTextualImageEdit = async (base64: string, prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: { data: base64, mimeType: 'image/png' } }, { text: prompt }] }
    });
    return handleResponse(response);
};

export const editCharacterAppearance = async (base64: string, profile: CharacterProfile, ref: string | null): Promise<string> => {
    const parts: any[] = [{ inlineData: { data: base64, mimeType: 'image/png' } }];
    if (ref) parts.push({ inlineData: { data: ref, mimeType: 'image/png' } });
    parts.push({ text: `Update appearance based on this description: ${profile.physiqueDescription}. Keep face identity.` });
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts } });
    return handleResponse(response);
};
