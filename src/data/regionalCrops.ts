export interface CropInfo {
  id: string;
  name: string;
  icon: string;
  category: 'Cereal / Grain' | 'Pulse / Legume' | 'Cash / Commercial' | 'Oilseed' | 'Fruit' | 'Vegetable' | 'Spices & Plantation';
  waterNeed: 'High' | 'Medium' | 'Low';
  spraySensitivity: 'High' | 'Medium' | 'Low';
  temperatureTolerance: string;
}

export interface RegionCropDataset {
  regionName: string;
  isExactRegion: boolean;
  crops: CropInfo[];
}

// 1. TAMIL NADU (e.g. Chennai, Thanjavur, Madurai, Coimbatore, Tiruchirappalli, Salem, etc.)
const TAMIL_NADU_CROPS: CropInfo[] = [
  { id: 'rice-paddy', name: 'Rice / Paddy (நெல்)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '22–38°C' },
  { id: 'groundnut', name: 'Groundnut / Peanut (வேர்க்கடலை)', icon: '🥜', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
  { id: 'sugarcane', name: 'Sugarcane (கரும்பு)', icon: '🌱', category: 'Cash / Commercial', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '20–38°C' },
  { id: 'maize', name: 'Maize / Corn (மக்காச்சோளம்)', icon: '🌽', category: 'Cereal / Grain', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '18–35°C' },
  { id: 'cotton', name: 'Cotton (பருத்தி)', icon: '🌿', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '21–36°C' },
  { id: 'banana', name: 'Banana (வாழை)', icon: '🍌', category: 'Fruit', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '18–38°C' },
  { id: 'blackgram', name: 'Black Gram / Urad Dal (உளுந்து)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '25–35°C' },
  { id: 'greengram', name: 'Green Gram / Moong Dal (பாசிப்பயறு)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '25–35°C' },
  { id: 'coconut', name: 'Coconut (தென்னை)', icon: '🌴', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
  { id: 'tapioca', name: 'Tapioca / Cassava (மரவள்ளிக்கிழங்கு)', icon: '🥔', category: 'Vegetable', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
  { id: 'sorghum', name: 'Sorghum / Jowar (சோளம்)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '25–35°C' },
  { id: 'pearl-millet', name: 'Pearl Millet / Bajra (கம்பு)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '25–40°C' },
  { id: 'finger-millet', name: 'Finger Millet / Ragi (கேழ்வரகு)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–34°C' },
  { id: 'sesame', name: 'Sesame / Gingelly (எள்)', icon: '🌱', category: 'Oilseed', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '25–35°C' },
  { id: 'sunflower', name: 'Sunflower (சூரியகாந்தி)', icon: '🌻', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '18–34°C' },
  { id: 'mango', name: 'Mango (மாம்பழம்)', icon: '🥭', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '24–35°C' },
  { id: 'turmeric', name: 'Turmeric (மஞ்சள்)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
  { id: 'chilli', name: 'Chilli (மிளகாய்)', icon: '🌶️', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–35°C' },
  { id: 'onion', name: 'Onion / Small Onion (வெங்காயம்)', icon: '🧅', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '13–35°C' },
  { id: 'tomato', name: 'Tomato (தக்காளி)', icon: '🍅', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–32°C' },
  { id: 'brinjal', name: 'Brinjal / Eggplant (கத்தரிக்காய்)', icon: '🍆', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
  { id: 'bhendi', name: 'Okra / Lady Finger (வெண்டை)', icon: '🌱', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '22–35°C' },
  { id: 'moringa', name: 'Moringa / Drumstick (முருங்கை)', icon: '🌿', category: 'Vegetable', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '25–40°C' },
  { id: 'tea', name: 'Tea (தேயிலை)', icon: '🍃', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '13–30°C' },
  { id: 'coffee', name: 'Coffee (காபி)', icon: '☕', category: 'Spices & Plantation', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '15–28°C' },
  { id: 'pepper', name: 'Black Pepper (கருமிளகு)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '20–32°C' },
  { id: 'cardamom', name: 'Cardamom (ஏலக்காய்)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '15–30°C' },
  { id: 'papaya', name: 'Papaya (பப்பாளி)', icon: '🍈', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '22–35°C' },
  { id: 'guava', name: 'Guava (கொய்யா)', icon: '🍈', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '20–32°C' },
  { id: 'jasmine', name: 'Jasmine / Madurai Malli (மல்லிகை)', icon: '🌸', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–35°C' },
  { id: 'cashew', name: 'Cashew (முந்திரி)', icon: '🥜', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–36°C' },
  { id: 'betel-vine', name: 'Betel Vine (வெற்றிலை)', icon: '🍃', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '20–32°C' },
  { id: 'ginger', name: 'Ginger (இஞ்சி)', icon: '🫚', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '19–30°C' },
  { id: 'coriander', name: 'Coriander (கொத்தமல்லி)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '15–25°C' },
  { id: 'bittergourd', name: 'Bitter Gourd (பாகற்காய்)', icon: '🥒', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '24–35°C' },
  { id: 'bottlegourd', name: 'Bottle Gourd (சுரைக்காய்)', icon: '🥒', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–32°C' },
  { id: 'snakegourd', name: 'Snake Gourd (புடலங்காய்)', icon: '🥒', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–32°C' },
  { id: 'ridgegourd', name: 'Ridge Gourd (பீர்க்கங்காய்)', icon: '🥒', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–32°C' },
  { id: 'cucumber', name: 'Cucumber (வெள்ளரிக்காய்)', icon: '🥒', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–30°C' },
  { id: 'watermelon', name: 'Watermelon (தர்பூசணி)', icon: '🍉', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '22–35°C' },
  { id: 'muskmelon', name: 'Muskmelon (முலாம் பழம்)', icon: '🍈', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '24–35°C' },
  { id: 'pomegranate', name: 'Pomegranate (மாதுளை)', icon: '🍎', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '20–38°C' },
  { id: 'sapota', name: 'Sapota / Chikoo (சப்போட்டா)', icon: '🥔', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–38°C' },
  { id: 'custard-apple', name: 'Custard Apple (சீத்தாப்பழம்)', icon: '🍈', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–38°C' },
  { id: 'amla', name: 'Indian Gooseberry / Amla (நெல்லி)', icon: '🍏', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '15–40°C' },
  { id: 'cowpea', name: 'Cowpea / Karamani (காராமணி)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
  { id: 'horsegram', name: 'Horse Gram / Kollu (கொள்ளு)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
  { id: 'castor', name: 'Castor (ஆமணக்கு)', icon: '🌿', category: 'Oilseed', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
  { id: 'marigold', name: 'Marigold (செவ்வந்தி)', icon: '🌼', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–30°C' },
  { id: 'rose', name: 'Country Rose (ரோஜா)', icon: '🌹', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–30°C' },
  { id: 'crossandra', name: 'Crossandra / Kanakambaram (கனகாம்பரம்)', icon: '🌸', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–35°C' },
  { id: 'chrysanthemum', name: 'Chrysanthemum / Samanthi (சாமந்தி)', icon: '🌼', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–28°C' },
  { id: 'tuberose', name: 'Tuberose / Sambangi (சம்பங்கி)', icon: '💮', category: 'Cash / Commercial', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '20–32°C' },
  { id: 'curry-leaves', name: 'Curry Leaves (கறிவேப்பிலை)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–38°C' },
  { id: 'sweet-potato', name: 'Sweet Potato (சர்க்கரைவள்ளிக்கிழங்கு)', icon: '🍠', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '21–29°C' },
  { id: 'radish', name: 'Radish (முள்ளங்கி)', icon: '🥕', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '15–25°C' },
  { id: 'carrot', name: 'Carrot (கேரட் - Nilgiris/Hills)', icon: '🥕', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '10–22°C' },
  { id: 'cabbage', name: 'Cabbage (முட்டைக்கோஸ்)', icon: '🥬', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–22°C' },
  { id: 'cauliflower', name: 'Cauliflower (காலிஃபிளவர்)', icon: '🥦', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–22°C' },
  { id: 'beans', name: 'French Beans (பீன்ஸ்)', icon: '🫘', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–25°C' },
  { id: 'garlic', name: 'Garlic (பூண்டு)', icon: '🧄', category: 'Spices & Plantation', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '12–25°C' },
  { id: 'pumpkin', name: 'Pumpkin (பரங்கிக்காய்)', icon: '🎃', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '20–32°C' },
  { id: 'ashgourd', name: 'Ash Gourd / Winter Melon (சாம்பல் பூசணி)', icon: '🍈', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '22–35°C' },
  { id: 'colocasia', name: 'Colocasia / Seppankizhangu (சேப்பங்கிழங்கு)', icon: '🥔', category: 'Vegetable', waterNeed: 'High', spraySensitivity: 'Low', temperatureTolerance: '21–30°C' },
  { id: 'elephant-foot-yam', name: 'Elephant Foot Yam (சேனைக்கிழங்கு)', icon: '🥔', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '25–35°C' },
  { id: 'spinach', name: 'Spinach / Keerai (கீரை)', icon: '🥬', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–30°C' },
  { id: 'fenugreek', name: 'Fenugreek / Methi (வெந்தயக்கீரை)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '15–25°C' },
  { id: 'lemon', name: 'Acid Lime / Lemon (எலுமிச்சை)', icon: '🍋', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
  { id: 'jackfruit', name: 'Jackfruit (பலாப்பழம்)', icon: '🍈', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
  { id: 'arecanut', name: 'Arecanut / Betel Nut (பாக்கு)', icon: '🌴', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '15–35°C' },
  { id: 'rubber', name: 'Rubber (ரப்பர் - Kanyakumari)', icon: '🌳', category: 'Cash / Commercial', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '20–34°C' },
  { id: 'clove', name: 'Clove (கிராம்பு)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '20–30°C' },
  { id: 'nutmeg', name: 'Nutmeg (ஜாதிக்காய்)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '20–30°C' },
  { id: 'bamboo', name: 'Bamboo (மூங்கில்)', icon: '🎋', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '15–38°C' },
  { id: 'eucalyptus', name: 'Eucalyptus (நீலகிரி தைலம்)', icon: '🌲', category: 'Cash / Commercial', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '10–35°C' },
  { id: 'silk-cotton', name: 'Kapok / Silk Cotton (இலவு)', icon: '🌳', category: 'Cash / Commercial', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–38°C' },
  { id: 'vanilla', name: 'Vanilla (வெண்ணிலா)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '21–32°C' },
  { id: 'fig', name: 'Fig / Anjeer (அத்திப்பழம்)', icon: '🫐', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '15–38°C' },
  { id: 'dates', name: 'Date Palm (பேரீச்சம்பழம்)', icon: '🌴', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '25–45°C' },
  { id: 'dragon-fruit', name: 'Dragon Fruit (டிராகன் பழம்)', icon: '🐉', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '20–38°C' },
  { id: 'mulberry', name: 'Mulberry / Sericulture (மல்பெரி)', icon: '🫐', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–32°C' },
  { id: 'tobacco', name: 'Chewing Tobacco (புகையிலை)', icon: '🌿', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–32°C' },
  { id: 'sunnhemp', name: 'Sunnhemp (சணப்பை)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
  { id: 'sesbania', name: 'Sesbania / Dhaincha (தக்கைப்பூண்டு)', icon: '🌱', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '20–38°C' },
  { id: 'barnyard-millet', name: 'Barnyard Millet / Kuthiraivali (குதிரைவாலி)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
  { id: 'foxtail-millet', name: 'Foxtail Millet / Thinai (தினை)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
  { id: 'kodo-millet', name: 'Kodo Millet / Varagu (வரகு)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '22–35°C' },
  { id: 'little-millet', name: 'Little Millet / Saamai (சாமை)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
  { id: 'proso-millet', name: 'Proso Millet / Panivaragu (பனிவரகு)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '18–32°C' },
  { id: 'sweet-corn', name: 'Sweet Corn (இனிப்பு மக்காச்சோளம்)', icon: '🌽', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–32°C' },
  { id: 'baby-corn', name: 'Baby Corn (பேபி கார்ன்)', icon: '🌽', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–32°C' },
  { id: 'capsicum', name: 'Capsicum / Bell Pepper (குடைமிளகாய்)', icon: '🫑', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–28°C' },
  { id: 'coriander-seed', name: 'Coriander Seeds (தானியா)', icon: '🌾', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '15–28°C' },
  { id: 'tamarind', name: 'Tamarind (புளி)', icon: '🌳', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–42°C' },
  { id: 'jamun', name: 'Black Plum / Jamun (நாவல் பழம்)', icon: '🫐', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–38°C' },
  { id: 'wood-apple', name: 'Wood Apple / Vilam Pazham (விளாம்பழம்)', icon: '🍈', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '22–40°C' },
  { id: 'palm-jaggery', name: 'Palmyra Palm (பனை மரம்)', icon: '🌴', category: 'Cash / Commercial', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '22–45°C' },
  { id: 'agathi', name: 'Sesbania Grandiflora / Agathi (அகத்திகீரை)', icon: '🌿', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '22–38°C' },
  { id: 'mint', name: 'Mint / Pudina (புதினா)', icon: '🌿', category: 'Vegetable', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '15–30°C' },
  { id: 'sorrel', name: 'Roselle / Gongura / Pulichakeerai (புளிச்சக்கீரை)', icon: '🌿', category: 'Vegetable', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
];

// Helper to generate complementary regional lists
function buildLocationSpecificCrops(state: string, country: string): RegionCropDataset {
  const normState = (state || '').toLowerCase();
  const normCountry = (country || '').toLowerCase();

  // If in Tamil Nadu or Pondicherry
  if (normState.includes('tamil') || normState.includes('pondy') || normState.includes('puducherry')) {
    return {
      regionName: 'Tamil Nadu & Cauvery Delta',
      isExactRegion: true,
      crops: TAMIL_NADU_CROPS,
    };
  }

  // Northern India (Punjab, Haryana, UP, Bihar, MP, Rajasthan)
  if (
    normState.includes('punjab') ||
    normState.includes('haryana') ||
    normState.includes('uttar pradesh') ||
    normState.includes('rajasthan') ||
    normState.includes('bihar') ||
    normState.includes('delhi') ||
    normState.includes('madhya')
  ) {
    const northCrops: CropInfo[] = [
      { id: 'wheat', name: 'Wheat (गेहूं)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '12–25°C' },
      { id: 'mustard', name: 'Mustard / Sarson (सरसों)', icon: '🌼', category: 'Oilseed', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '10–25°C' },
      { id: 'rice-basmati', name: 'Basmati Rice (बासमती चावल)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '22–35°C' },
      { id: 'sugarcane-n', name: 'Sugarcane (गन्ना)', icon: '🌱', category: 'Cash / Commercial', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '20–38°C' },
      { id: 'chickpea-chana', name: 'Chickpea / Gram (चना)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '15–25°C' },
      { id: 'cotton-bt', name: 'Cotton (कपास)', icon: '🌿', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '21–36°C' },
      { id: 'potato', name: 'Potato (आलू)', icon: '🥔', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–22°C' },
      { id: 'maize-n', name: 'Maize (मक्का)', icon: '🌽', category: 'Cereal / Grain', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '18–35°C' },
      { id: 'bajra-n', name: 'Pearl Millet / Bajra (बाजरा)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '25–40°C' },
      { id: 'barley', name: 'Barley / Jau (जौ)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '12–24°C' },
      { id: 'lentil-masoor', name: 'Lentil / Masoor (मसूर)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '15–25°C' },
      { id: 'pigeonpea-arhar', name: 'Pigeonpea / Arhar / Tur (अरहर)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'green-peas', name: 'Green Peas / Matar (मटर)', icon: '🫛', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '10–20°C' },
      { id: 'onion-n', name: 'Onion (प्याज)', icon: '🧅', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '13–32°C' },
      { id: 'garlic-n', name: 'Garlic (लहसुन)', icon: '🧄', category: 'Spices & Plantation', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '12–25°C' },
      { id: 'tomato-n', name: 'Tomato (टमाटर)', icon: '🍅', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–30°C' },
      { id: 'cauliflower-n', name: 'Cauliflower (फूलगोभी)', icon: '🥦', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–22°C' },
      { id: 'cabbage-n', name: 'Cabbage (पत्तागोभी)', icon: '🥬', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–22°C' },
      { id: 'guava-n', name: 'Guava (अमरूद)', icon: '🍈', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '15–35°C' },
      { id: 'kinnow', name: 'Kinnow / Mandarin (किन्नू)', icon: '🍊', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '10–35°C' },
      { id: 'mango-n', name: 'Mango / Dasheri / Langra (आम)', icon: '🥭', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '24–38°C' },
      { id: 'guar', name: 'Cluster Bean / Guar (ग्वार)', icon: '🌱', category: 'Cash / Commercial', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '25–40°C' },
      { id: 'cumin', name: 'Cumin / Jeera (जीरा)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '10–25°C' },
      { id: 'coriander-n', name: 'Coriander / Dhaniya (धनिया)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '15–25°C' },
      { id: 'fennel', name: 'Fennel / Saunf (सौंफ)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '15–25°C' },
      { id: 'fenugreek-n', name: 'Fenugreek / Methi (मेथी)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '15–25°C' },
      { id: 'soybean-n', name: 'Soybean (सोयाबीन)', icon: '🌱', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–32°C' },
      { id: 'groundnut-n', name: 'Groundnut (मूंगफली)', icon: '🥜', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'sunflower-n', name: 'Sunflower (सूरजमुखी)', icon: '🌻', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '18–34°C' },
      { id: 'sesame-n', name: 'Sesame / Til (तिल)', icon: '🌱', category: 'Oilseed', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '25–35°C' },
      { id: 'linseed', name: 'Linseed / Alsi (अलसी)', icon: '🌾', category: 'Oilseed', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '10–25°C' },
      { id: 'safflower', name: 'Safflower / Kusum (कुसुम)', icon: '🌼', category: 'Oilseed', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '15–30°C' },
      { id: 'moong-n', name: 'Green Gram / Moong (मूंग)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '25–35°C' },
      { id: 'urad-n', name: 'Black Gram / Urad (उड़द)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '25–35°C' },
      { id: 'mothbean', name: 'Moth Bean (मोठ)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '25–40°C' },
      { id: 'rajma', name: 'Kidney Beans / Rajma (राजमा)', icon: '🫘', category: 'Pulse / Legume', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–25°C' },
      { id: 'carrot-n', name: 'Carrot / Gajar (गाजर)', icon: '🥕', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '15–25°C' },
      { id: 'radish-n', name: 'Radish / Mooli (मूली)', icon: '🥕', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '15–25°C' },
      { id: 'spinach-n', name: 'Spinach / Palak (पालक)', icon: '🥬', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–25°C' },
      { id: 'brinjal-n', name: 'Eggplant / Baingan (बैंगन)', icon: '🍆', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'chilli-n', name: 'Chilli / Mirch (मिर्च)', icon: '🌶️', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–35°C' },
      { id: 'bottlegourd-n', name: 'Bottle Gourd / Lauki (लौकी)', icon: '🥒', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'bittergourd-n', name: 'Bitter Gourd / Karela (करेला)', icon: '🥒', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '24–35°C' },
      { id: 'pumpkin-n', name: 'Pumpkin / Kaddu (कद्दू)', icon: '🎃', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '20–32°C' },
      { id: 'cucumber-n', name: 'Cucumber / Kheera (खीरा)', icon: '🥒', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–32°C' },
      { id: 'watermelon-n', name: 'Watermelon / Tarbooj (तरबूज)', icon: '🍉', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '24–38°C' },
      { id: 'muskmelon-n', name: 'Muskmelon / Kharbooja (खरबूजा)', icon: '🍈', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '24–38°C' },
      { id: 'pomegranate-n', name: 'Pomegranate / Anar (अनार)', icon: '🍎', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '20–38°C' },
      { id: 'papaya-n', name: 'Papaya (पपीता)', icon: '🍈', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '22–35°C' },
      { id: 'ber', name: 'Indian Jujube / Ber (बेर)', icon: '🫐', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '15–42°C' },
      { id: 'amla-n', name: 'Amla (आंवला)', icon: '🍏', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '15–40°C' },
      { id: 'marigold-n', name: 'Marigold / Genda (गेंदा)', icon: '🌼', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–30°C' },
      { id: 'rose-n', name: 'Rose / Gulab (गुलाब)', icon: '🌹', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–30°C' },
      { id: 'gladiolus', name: 'Gladiolus (ग्लैडियोलस)', icon: '💐', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–25°C' },
      { id: 'mushroom', name: 'Button Mushroom (मशरूम)', icon: '🍄', category: 'Vegetable', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '14–22°C' },
      { id: 'oats', name: 'Oats / Jai (जई)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '12–25°C' },
      { id: 'sorghum-jowar', name: 'Jowar (ज्वार)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '25–35°C' },
      { id: 'sweet-potato-n', name: 'Sweet Potato / Shakarkand (शकरकंद)', icon: '🍠', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '21–29°C' },
      { id: 'ginger-n', name: 'Ginger / Adrak (अदरक)', icon: '🫚', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '19–30°C' },
      { id: 'turmeric-n', name: 'Turmeric / Haldi (हल्दी)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
    ];
    return {
      regionName: `${state || 'Northern Plains'} (Indo-Gangetic Basin)`,
      isExactRegion: true,
      crops: northCrops,
    };
  }

  // Western & Central India (Maharashtra, Gujarat, Goa)
  if (normState.includes('maharashtra') || normState.includes('gujarat') || normState.includes('goa')) {
    const westCrops: CropInfo[] = [
      { id: 'cotton-w', name: 'Cotton (कापूस / કપાસ)', icon: '🌿', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '21–36°C' },
      { id: 'sugarcane-w', name: 'Sugarcane (ऊस / શેરડી)', icon: '🌱', category: 'Cash / Commercial', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '20–38°C' },
      { id: 'soybean-w', name: 'Soybean (सोयाबीन)', icon: '🌱', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–32°C' },
      { id: 'onion-w', name: 'Onion / Nashik Pyaz (कांदा / ડુંગળી)', icon: '🧅', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '13–35°C' },
      { id: 'groundnut-w', name: 'Groundnut (भुईमूग / મગફળી)', icon: '🥜', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'grapes', name: 'Grapes / Nashik Draksh (द्राक्षे)', icon: '🍇', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–35°C' },
      { id: 'pomegranate-w', name: 'Pomegranate / Bhagwa Anar (डाळिंब)', icon: '🍎', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '20–38°C' },
      { id: 'mango-alphonso', name: 'Alphonso Mango / Hapus (हापूस)', icon: '🥭', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '22–35°C' },
      { id: 'banana-jalgaon', name: 'Jalgaon Banana (केळी / કેળા)', icon: '🍌', category: 'Fruit', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '18–38°C' },
      { id: 'orange-nagpur', name: 'Nagpur Orange / Santra (संत्रे)', icon: '🍊', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–35°C' },
      { id: 'castor-w', name: 'Castor (एरंडी / દિવેલા)', icon: '🌿', category: 'Oilseed', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
      { id: 'cumin-w', name: 'Cumin / Jeera (જીરું)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '12–25°C' },
      { id: 'sorghum-w', name: 'Jowar (ज्वारी)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '25–35°C' },
      { id: 'pearl-millet-w', name: 'Bajra (बाजरी)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '25–40°C' },
      { id: 'chickpea-w', name: 'Gram / Harbara (हरभरा / ચણા)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '15–25°C' },
      { id: 'tur-arhar-w', name: 'Pigeonpea / Tur (तूर)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'sesame-w', name: 'Sesame / Tal (तीळ / તલ)', icon: '🌱', category: 'Oilseed', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '25–35°C' },
      { id: 'tobacco-w', name: 'Tobacco (तंबाखू)', icon: '🌿', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–32°C' },
      { id: 'cashew-w', name: 'Cashew (काजू)', icon: '🥜', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–36°C' },
      { id: 'custard-apple-w', name: 'Custard Apple / Sitaphal (सीताफळ)', icon: '🍈', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–38°C' },
      { id: 'fig-w', name: 'Fig / Anjeer (अंजीर)', icon: '🫐', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '15–38°C' },
      { id: 'guava-w', name: 'Guava / Peru (पेरू)', icon: '🍈', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '18–35°C' },
      { id: 'papaya-w', name: 'Papaya (पपई)', icon: '🍈', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '22–35°C' },
      { id: 'tomato-w', name: 'Tomato (टोमॅटो)', icon: '🍅', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–32°C' },
      { id: 'brinjal-w', name: 'Brinjal / Vangi (वांगी)', icon: '🍆', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'chilli-w', name: 'Chilli (मिरची)', icon: '🌶️', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–35°C' },
      { id: 'ginger-w', name: 'Ginger / Ale (आले)', icon: '🫚', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '19–30°C' },
      { id: 'turmeric-w', name: 'Turmeric / Halad (हळद)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'sweet-potato-w', name: 'Sweet Potato / Ratalu (रताळे)', icon: '🍠', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '21–29°C' },
      { id: 'cucumber-w', name: 'Cucumber / Kakdi (काकडी)', icon: '🥒', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–32°C' },
    ];
    return {
      regionName: `${state || 'Western India'} (Deccan & Gujarat Plains)`,
      isExactRegion: true,
      crops: westCrops,
    };
  }

  // Southern India (Andhra Pradesh, Telangana, Karnataka, Kerala)
  if (
    normState.includes('andhra') ||
    normState.includes('telangana') ||
    normState.includes('karnataka') ||
    normState.includes('kerala')
  ) {
    const southCrops: CropInfo[] = [
      { id: 'rice-s', name: 'Paddy / Rice (వరి / ಭತ್ತ / നെല്ല്)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '22–38°C' },
      { id: 'cotton-s', name: 'Cotton (ప్రత్తి / ಹತ್ತಿ)', icon: '🌿', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '21–36°C' },
      { id: 'red-chilli-guntur', name: 'Guntur Red Chilli (మిరప)', icon: '🌶️', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–35°C' },
      { id: 'maize-s', name: 'Maize (మొక్కజొన్న / ಮೆಕ್ಕೆಜೋಳ)', icon: '🌽', category: 'Cereal / Grain', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '18–35°C' },
      { id: 'coffee-robusta', name: 'Coffee (కాఫీ / ಕಾಫಿ / കാപ്പി - Coorg/Wayanad)', icon: '☕', category: 'Spices & Plantation', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '15–28°C' },
      { id: 'tea-s', name: 'Tea (തേയില / ಚಹಾ - Munnar/Nilgiris)', icon: '🍃', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '13–30°C' },
      { id: 'pepper-malabar', name: 'Malabar Black Pepper (കുരുമുളക്)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '20–32°C' },
      { id: 'cardamom-s', name: 'Cardamom (ഏലം)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '15–30°C' },
      { id: 'rubber-kerala', name: 'Rubber (റബ്ബർ)', icon: '🌳', category: 'Cash / Commercial', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '20–34°C' },
      { id: 'coconut-s', name: 'Coconut (కొబ్బరి / ತೆಂಗು / തെങ്ങ്)', icon: '🌴', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
      { id: 'arecanut-s', name: 'Arecanut (పోక / ಅಡಿಕೆ / അടയ്ക്ക)', icon: '🌴', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '15–35°C' },
      { id: 'ragi-s', name: 'Finger Millet / Ragi (రాగులు / ರಾಗಿ)', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–34°C' },
      { id: 'groundnut-s', name: 'Groundnut (వేరుశనగ / ಕಡಲೆಕಾಯಿ)', icon: '🥜', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'turmeric-s', name: 'Turmeric (పసుపు / ಅರಿಶಿನ)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'sugarcane-s', name: 'Sugarcane (చెరకు / ಕಬ್ಬು)', icon: '🌱', category: 'Cash / Commercial', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '20–38°C' },
      { id: 'mango-banganapalli', name: 'Banganapalli Mango (మామిడి)', icon: '🥭', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '24–35°C' },
      { id: 'banana-nendran', name: 'Nendran Banana (నేంద్రం / ಬಾಳೆ / നേന്ത്രപ്പഴം)', icon: '🍌', category: 'Fruit', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '18–38°C' },
      { id: 'tobacco-andhra', name: 'Virginia Tobacco (పొగాకు)', icon: '🌿', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–32°C' },
      { id: 'sunflower-s', name: 'Sunflower (సూర్యకాంతి / ಸೂರ್ಯಕಾಂತಿ)', icon: '🌻', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '18–34°C' },
      { id: 'pigeonpea-s', name: 'Red Gram / Tur (కందులు / ತೊಗರಿ)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'blackgram-s', name: 'Black Gram / Urad (మినుములు / ಉದ್ದು)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '25–35°C' },
      { id: 'greengram-s', name: 'Green Gram / Moong (పెసలు / ಹೆಸರು)', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'High', temperatureTolerance: '25–35°C' },
      { id: 'onion-s', name: 'Onion (ఉల్లిపాయ / ಈರುಳ್ಳಿ)', icon: '🧅', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '13–35°C' },
      { id: 'tomato-s', name: 'Tomato (టమోటా / ಟೊಮೇಟೊ)', icon: '🍅', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–32°C' },
      { id: 'pomegranate-s', name: 'Pomegranate (దానిమ్మ / ದಾಳಿಂಬೆ)', icon: '🍎', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '20–38°C' },
      { id: 'ginger-s', name: 'Ginger (అల్లం / ಶುಂಠಿ / ഇഞ്ചി)', icon: '🫚', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '19–30°C' },
      { id: 'tapioca-s', name: 'Tapioca / Kappa (കപ്പ / ಮರಗೆಣಸು)', icon: '🥔', category: 'Vegetable', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
      { id: 'cashew-s', name: 'Cashew (జీడిమామిడి / ಗೋಡಂಬಿ / കശുവണ്ടി)', icon: '🥜', category: 'Spices & Plantation', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '20–36°C' },
      { id: 'clove-s', name: 'Clove (లవంగం / ಲವಂಗ / ഗ്രാമ്പൂ)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '20–30°C' },
      { id: 'nutmeg-s', name: 'Nutmeg (జాజికాయ / ജാതിക്ക)', icon: '🌿', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '20–30°C' },
    ];
    return {
      regionName: `${state || 'Southern Peninsula'} (Deccan & Western Ghats)`,
      isExactRegion: true,
      crops: southCrops,
    };
  }

  // Fallback / International / General Tropical & Subtropical Crops
  // Clearly labeled as cultivated crops based on regional agro-climatic zone
  return {
    regionName: `${state ? `${state}, ` : ''}${country || 'Selected Region'}`,
    isExactRegion: false,
    crops: [
      { id: 'rice-gen', name: 'Rice / Paddy', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '22–38°C' },
      { id: 'wheat-gen', name: 'Wheat', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '12–25°C' },
      { id: 'maize-gen', name: 'Maize / Corn', icon: '🌽', category: 'Cereal / Grain', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '18–35°C' },
      { id: 'sugarcane-gen', name: 'Sugarcane', icon: '🌱', category: 'Cash / Commercial', waterNeed: 'High', spraySensitivity: 'Medium', temperatureTolerance: '20–38°C' },
      { id: 'cotton-gen', name: 'Cotton', icon: '🌿', category: 'Cash / Commercial', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '21–36°C' },
      { id: 'soybean-gen', name: 'Soybean', icon: '🌱', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–32°C' },
      { id: 'groundnut-gen', name: 'Groundnut / Peanut', icon: '🥜', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '20–35°C' },
      { id: 'potato-gen', name: 'Potato', icon: '🥔', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–22°C' },
      { id: 'tomato-gen', name: 'Tomato', icon: '🍅', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '18–32°C' },
      { id: 'onion-gen', name: 'Onion', icon: '🧅', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '13–35°C' },
      { id: 'banana-gen', name: 'Banana', icon: '🍌', category: 'Fruit', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '18–38°C' },
      { id: 'mango-gen', name: 'Mango', icon: '🥭', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '24–35°C' },
      { id: 'citrus-gen', name: 'Citrus / Orange / Lemon', icon: '🍊', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–35°C' },
      { id: 'chilli-gen', name: 'Chilli / Peppers', icon: '🌶️', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–35°C' },
      { id: 'sorghum-gen', name: 'Sorghum / Millet', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '22–38°C' },
      { id: 'sunflower-gen', name: 'Sunflower', icon: '🌻', category: 'Oilseed', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '18–34°C' },
      { id: 'chickpea-gen', name: 'Chickpea / Pulses', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '15–28°C' },
      { id: 'lentil-gen', name: 'Lentils', icon: '🌱', category: 'Pulse / Legume', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '15–25°C' },
      { id: 'coffee-gen', name: 'Coffee', icon: '☕', category: 'Spices & Plantation', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '15–28°C' },
      { id: 'tea-gen', name: 'Tea', icon: '🍃', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'High', temperatureTolerance: '13–30°C' },
      { id: 'barley-gen', name: 'Barley', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Low', spraySensitivity: 'Low', temperatureTolerance: '12–24°C' },
      { id: 'oats-gen', name: 'Oats', icon: '🌾', category: 'Cereal / Grain', waterNeed: 'Medium', spraySensitivity: 'Low', temperatureTolerance: '12–25°C' },
      { id: 'cabbage-gen', name: 'Cabbage', icon: '🥬', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–22°C' },
      { id: 'cauliflower-gen', name: 'Cauliflower', icon: '🥦', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–22°C' },
      { id: 'carrot-gen', name: 'Carrot', icon: '🥕', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '15–25°C' },
      { id: 'cucumber-gen', name: 'Cucumber', icon: '🥒', category: 'Vegetable', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '20–32°C' },
      { id: 'watermelon-gen', name: 'Watermelon', icon: '🍉', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'High', temperatureTolerance: '22–35°C' },
      { id: 'pomegranate-gen', name: 'Pomegranate', icon: '🍎', category: 'Fruit', waterNeed: 'Low', spraySensitivity: 'Medium', temperatureTolerance: '20–38°C' },
      { id: 'papaya-gen', name: 'Papaya', icon: '🍈', category: 'Fruit', waterNeed: 'Medium', spraySensitivity: 'Medium', temperatureTolerance: '22–35°C' },
      { id: 'coconut-gen', name: 'Coconut', icon: '🌴', category: 'Spices & Plantation', waterNeed: 'High', spraySensitivity: 'Low', temperatureTolerance: '20–35°C' },
    ],
  };
}

export function getRegionalCrops(state?: string, country?: string): RegionCropDataset {
  return buildLocationSpecificCrops(state || '', country || '');
}
