
import { CharacterProfile } from './types';

/**
 * Generates a detailed, descriptive text of a character's physique based on their measurements.
 * This description is used to guide the AI in generating a visually accurate body shape.
 * @param profile - The character profile containing height, weight, and body measurements.
 * @param view - The perspective for which to generate the description, defaults to 'front'.
 * @returns A string describing the character's physique.
 */
export function getDetailedPhysiqueDescription(profile: CharacterProfile, view: 'front' | 'back' = 'front'): string {
    const { gender, height, weight, bust, waist, hips, bodyFat, muscleMass, breastShape, breastFirmness, buttockShape, buttockFirmness } = profile;

    // Return a default message if essential values are missing
    if (!height || !weight || !bust || !waist || !hips) {
        return "Physique analysis based on measurements...";
    }

    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    // 1. Determine overall build from BMI (gender-neutral)
    let bmiDescription: string;
    if (bmi < 18.5) bmiDescription = 'a very slender, underweight build';
    else if (bmi < 21) bmiDescription = 'a slim and fit build';
    else if (bmi < 25) bmiDescription = 'a healthy and proportional average build';
    else if (bmi < 30) bmiDescription = 'a soft, curvy, and full-figured build';
    else if (bmi < 35) bmiDescription = 'a noticeably thick, plus-sized build';
    else bmiDescription = 'a very thick, obese build';

    if (gender === 'Мужской') {
        // MALE PHYSIQUE LOGIC
        let chestDescription: string;
        const chestToHeightRatio = bust / height;
        if (chestToHeightRatio > 0.6) chestDescription = 'a powerful and broad chest';
        else if (chestToHeightRatio > 0.55) chestDescription = 'a well-developed chest';
        else if (chestToHeightRatio > 0.5) chestDescription = 'an average-developed chest';
        else chestDescription = 'a slender chest';

        let waistDescription: string;
        const waistToHeightRatio = waist / height;
        if (waistToHeightRatio < 0.45) waistDescription = 'a narrow, athletic waist';
        else if (waistToHeightRatio < 0.52) waistDescription = 'an average-sized waist';
        else waistDescription = 'a wide waist';

        let hipsDescription: string = 'average-width hips'; // Less variation/emphasis for men
        if (hips < 90) hipsDescription = 'narrow hips';
        
        let muscleDescription: string;
        switch (muscleMass) {
            case 'Мягкая': muscleDescription = 'with low muscle definition and a softer appearance'; break;
            case 'Тонизированная': muscleDescription = 'with a toned and defined but not bulky musculature'; break;
            case 'Атлетическая': muscleDescription = 'with a well-defined, athletic musculature'; break;
            case 'Мускулистая': muscleDescription = 'with a heavily muscled and powerful build'; break;
            default: muscleDescription = '';
        }

        let shapeDescription: string;
        const chestToWaistRatio = bust / waist;
        if (chestToWaistRatio > 1.25) {
            shapeDescription = 'This creates a classic V-shaped, athletic figure.';
        } else if (Math.abs(bust - hips) < 15 && chestToWaistRatio < 1.15) {
            shapeDescription = 'This results in a more rectangular, straight build.';
        } else {
            shapeDescription = 'This results in an average male build.';
        }
        
        return `The male character has ${bmiDescription} ${muscleDescription}, corresponding to a body fat of around ${bodyFat}%. The physique is defined by: ${chestDescription}, ${waistDescription}, and ${hipsDescription}. ${shapeDescription}`;

    } else {
        // FEMALE PHYSIQUE LOGIC
        let bustDescription: string;
        if (bust < 80) bustDescription = 'a small bust';
        else if (bust < 95) bustDescription = 'a medium-sized bust';
        else if (bust < 110) bustDescription = 'a large bust';
        else bustDescription = 'a very large and voluptuous bust';

        let waistDescription: string;
        const waistToHeightRatio = waist / height;
        if (waistToHeightRatio < 0.35) waistDescription = 'an extremely narrow, almost doll-like waist';
        else if (waistToHeightRatio < 0.42) waistDescription = 'a very slender waist';
        else if (waistToHeightRatio < 0.46) waistDescription = 'a slender waist';
        else if (waistToHeightRatio < 0.53) waistDescription = 'an average-sized waist';
        else waistDescription = 'a relatively wide waist';
        
        let hipsDescription: string;
        if (hips < 85) hipsDescription = 'narrow hips';
        else if (hips < 100) hipsDescription = 'medium-width hips';
        else if (hips < 115) hipsDescription = 'wide, rounded hips';
        else hipsDescription = 'exceptionally wide and voluptuous hips';
        
        const whr = waist / hips; // Waist-to-Hip Ratio
        
        let shapeDescription: string;
        if (whr < 0.75 && Math.abs(bust - hips) < 10) {
          shapeDescription = 'This combination creates a pronounced hourglass figure.';
        } else if (whr < 0.8 && hips > bust) {
          shapeDescription = 'This combination creates a pear-shaped figure, where the hips are the widest part.';
        } else if (bust > hips + 5) {
          shapeDescription = 'This combination creates an inverted triangle figure, with broader shoulders and bust than hips.';
        } else {
          shapeDescription = 'This results in a more rectangular or athletic figure.';
        }

        // Add more emphasis for extreme ratios to ensure the AI understands the request
        if (whr < 0.65) {
            shapeDescription = 'This results in an extreme, stylized figure with a dramatic hourglass or pear shape. The waist is incredibly small compared to the hips.'
        }
        
        let compositionDescription: string;
        switch (muscleMass) {
            case 'Мягкая': compositionDescription = `The body composition is soft with low muscle definition, corresponding to a body fat of around ${bodyFat}%.`; break;
            case 'Тонизированная': compositionDescription = `The body is toned with visible muscle definition, corresponding to a body fat of around ${bodyFat}%.`; break;
            case 'Атлетическая': compositionDescription = `The body is athletic with clear muscle separation, corresponding to a body fat of around ${bodyFat}%.`; break;
            case 'Мускулистая': compositionDescription = `The body is very muscular with significant muscle mass, corresponding to a body fat of around ${bodyFat}%.`; break;
            default: compositionDescription = `Body fat is approximately ${bodyFat}%.`;
        }
        
        const breastShapeMap: { [key: string]: string } = {
            'Круглая': 'round', 'Каплевидная': 'teardrop', 'Восточная (восток-запад)': 'east-west', 'Колокольчик': 'bell-shaped', 'Конусообразная': 'cone-shaped', 'Атлетическая': 'athletic', 'Стройная': 'slender', 'Асимметричная': 'asymmetric', 'Опущенная (птоз)': 'pendulous', 'Широко посаженная': 'wide-set', 'Близко посаженная': 'close-set'
        };
        const firmnessMap: { [key: string]: string } = { 'Мягкая': 'soft', 'Естественная': 'natural', 'Упругая': 'firm', 'Подтянутая': 'perky', 'Тонизированная': 'toned' };
        const buttockShapeMap: { [key: string]: string } = { 'А-образная (сердечко)': 'A-shaped (heart)', 'V-образная (треугольник)': 'V-shaped (inverted)', 'Круглая': 'round', 'Квадратная': 'square' };

        const breastDetails = `The breasts are ${firmnessMap[breastFirmness] || 'natural'} with a ${breastShapeMap[breastShape] || 'round'} shape.`;
        
        let finalDetails = breastDetails;
        let lowerBodyDescription = '';

        if (view === 'back') {
            const buttockDetails = `The buttocks are ${firmnessMap[buttockFirmness] || 'natural'} with a ${buttockShapeMap[buttockShape] || 'round'} shape.`;
            finalDetails += ` ${buttockDetails}`;
            if (hips >= 115) {
                lowerBodyDescription = 'The lower body is characterized by very prominent and well-developed gluteal muscles, resulting in a full, rounded posterior. The thighs are correspondingly thick and strong.';
            } else if (hips >= 100) {
                lowerBodyDescription = 'The lower body features full, rounded hips and shapely thighs.';
            }
        } else { // 'front' view
            if (hips >= 115) {
                lowerBodyDescription = 'The hips are very wide and the thighs are thick and powerful, indicating a well-developed posterior.';
            } else if (hips >= 100) {
                lowerBodyDescription = 'The thighs are full and shapely.';
            }
        }
        
        const fullDescription = `The character has ${bmiDescription}. ${compositionDescription} The physique is defined by: ${bustDescription}, ${waistDescription}, and ${hipsDescription}. ${shapeDescription} ${finalDetails} ${lowerBodyDescription}`.trim();

        return fullDescription.replace(/\s\s+/g, ' ');
    }
}

/**
 * Fetches an image from a URL and converts it to a base64 string.
 * @param url - The URL of the image to fetch.
 * @returns A promise that resolves with the base64-encoded image data.
 */
export const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Не удалось загрузить изображение с ${url}: ${response.status} ${response.statusText}. Это может быть связано с ограничениями CORS на сервере изображений.`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            // Return only the base64 part
            resolve(dataUrl.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
};

/**
 * Converts a File object to a base64 string.
 * @param file - The File object to convert.
 * @returns A promise that resolves with the base64-encoded image data.
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            // Return only the base64 part
            resolve(dataUrl.split(',')[1]);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};
