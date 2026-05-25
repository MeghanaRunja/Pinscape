export interface CategoryConfig {
  key: string;
  label: string;
  icon: string;        // @expo/vector-icons MaterialCommunityIcons name
  accentColor: string;
  bgColor: string;
  uploadTitle: string;
  uploadSubtitle: string;
  angles: string[];
  pinsSubtitle: string;
  analyzeTitle: string;
  analyzeSteps: string[];
}

const CATEGORIES: Record<string, CategoryConfig> = {
  bedroom: {
    key: 'bedroom', label: 'Bedroom', icon: 'bed-king-outline',
    accentColor: '#7F77DD', bgColor: '#EEEDFE',
    uploadTitle: 'Upload your bedroom',
    uploadSubtitle: 'Capture the room from multiple angles — front wall, corners, and a wide shot all help the AI understand your space.',
    angles: ['Front wall', 'Left side', 'Right side', 'Corner', 'Ceiling view'],
    pinsSubtitle: 'Select decor, furniture, and layout ideas you want applied to your room.',
    analyzeTitle: 'Analyzing your bedroom',
    analyzeSteps: ['Reading your room photos', 'Mapping dimensions & lighting', 'Parsing pin aesthetics', 'Blending ideas together', 'Generating 3 visualizations'],
  },
  nails: {
    key: 'nails', label: 'Nails', icon: 'hand-pointing-up',
    accentColor: '#D4537E', bgColor: '#FBEAF0',
    uploadTitle: 'Upload your hands',
    uploadSubtitle: 'Take clear photos from the top, side, and a close-up of your natural nail shape for the best results.',
    angles: ['Top view', 'Side profile', 'Spread fingers', 'Close-up tips'],
    pinsSubtitle: 'Choose nail art, shapes, or color palettes you want to try on.',
    analyzeTitle: 'Analyzing your nails',
    analyzeSteps: ['Reading your hand photos', 'Detecting nail shape & bed', 'Matching styles to your shape', 'Rendering color & texture', 'Generating 3 nail looks'],
  },
  outfit: {
    key: 'outfit', label: 'Outfit', icon: 'tshirt-crew-outline',
    accentColor: '#1D9E75', bgColor: '#E1F5EE',
    uploadTitle: 'Upload your full-body photo',
    uploadSubtitle: 'Stand in natural light. Front, back, and a 3/4 angle give the AI the best fit prediction.',
    angles: ['Front', 'Back', '3/4 angle', 'Side profile'],
    pinsSubtitle: 'Choose looks, pieces, or styling ideas you want to try on your body.',
    analyzeTitle: 'Analyzing your silhouette',
    analyzeSteps: ['Reading your body photos', 'Mapping proportions & fit', 'Matching styles to your shape', 'Simulating fabric drape', 'Generating 3 outfit options'],
  },
  hair: {
    key: 'hair', label: 'Hair', icon: 'content-cut',
    accentColor: '#BA7517', bgColor: '#FAEEDA',
    uploadTitle: 'Upload your hair photos',
    uploadSubtitle: 'Front, side, and back photos in natural lighting give the best analysis of your texture and shape.',
    angles: ['Front face', 'Left side', 'Right side', 'Back'],
    pinsSubtitle: 'Select styles, cuts, or color transformations to preview.',
    analyzeTitle: 'Analyzing your hair',
    analyzeSteps: ['Reading your hair photos', 'Detecting texture & density', 'Mapping face shape', 'Matching styles to face shape', 'Generating 3 hair looks'],
  },
  makeup: {
    key: 'makeup', label: 'Makeup', icon: 'face-woman-shimmer-outline',
    accentColor: '#D85A30', bgColor: '#FAECE7',
    uploadTitle: 'Upload your face photos',
    uploadSubtitle: 'Clean face, natural light, no filters. Straight-on and a 3/4 angle give the best read of your features.',
    angles: ['Straight on', '3/4 angle', 'Left side', 'Right side'],
    pinsSubtitle: 'Select looks, techniques, or products to preview on your face.',
    analyzeTitle: 'Analyzing your features',
    analyzeSteps: ['Reading your face photos', 'Mapping features & undertone', 'Selecting complementary colors', 'Layering makeup digitally', 'Generating 3 looks'],
  },
  living: {
    key: 'living', label: 'Living room', icon: 'sofa-outline',
    accentColor: '#1D9E75', bgColor: '#E1F5EE',
    uploadTitle: 'Upload your living room',
    uploadSubtitle: 'Main wall, corners, and a wide shot of the whole room give the AI full context of your space.',
    angles: ['Main wall', 'Left corner', 'Right corner', 'Wide shot'],
    pinsSubtitle: 'Choose sofa styles, plants, art, or layout ideas to apply.',
    analyzeTitle: 'Analyzing your living room',
    analyzeSteps: ['Reading your photos', 'Mapping layout & dimensions', 'Parsing furniture styles', 'Placing & scaling elements', 'Generating 3 room options'],
  },
};

export default CATEGORIES;
