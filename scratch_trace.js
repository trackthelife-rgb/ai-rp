const BODY_PARTS = [
  'face', 'eyes', 'lips', 'lip', 'neck', 'shoulder', 'shoulders',
  'waist', 'hip', 'hips', 'navel', 'belly', 'back',
  'cheeks', 'cheek', 'nose', 'expressions', 'expression', 'arms',
  'arm', 'armpits', 'armpit', 'thigh', 'thighs', 'leg', 'legs',
  'collarbone', 'cleavage', 'boobs', 'nipples', 'melons',
  'throat', 'navel', 'ass', 'panty', 'butt',
  'curves', 'curve', 'bellybutton', 'mouth', 'tongue', 'spine', 'stomach',
  'backneck', 'backhip'
];

function detectBodyParts(text) {
  if (!text) return [];
  const regex = new RegExp(`\\b(${BODY_PARTS.join('|')})\\b`, 'gi');
  const matches = text.match(regex) || [];
  const unique = [...new Set(matches.map(m => m.toLowerCase()))];
  const map = {
    hips: 'hip', lips: 'lip', eyes: 'eye', hands: 'hand',
    legs: 'leg', arms: 'arm', thighs: 'thigh', knees: 'knee',
    shoulders: 'shoulder', cheeks: 'cheek', ears: 'ear',
    fingers: 'finger', eyebrows: 'eyebrow', eyelashes: 'lashes',
    eyelash: 'lashes', dimples: 'dimple', ankles: 'ankle',
    toes: 'toe', palms: 'palm', curves: 'curves', bellybutton: 'navel',
    naabhi: 'navel', stomach: 'belly', midriff: 'navel', bosom: 'cleavage'
  };
  return [...new Set(unique.map(m => map[m] || m))];
}

function detectPartsForCharacter(text, charName, allParts) {
  if (!text || !charName || allParts.length <= 1) return allParts;
  const lower = text.toLowerCase();
  const nameIdx = lower.indexOf(charName.toLowerCase());
  if (nameIdx === -1) return allParts;

  const start = Math.max(0, nameIdx - 30);
  const end = Math.min(lower.length, nameIdx + 120);
  const windowText = lower.substring(start, end);

  const localParts = allParts.filter(p => windowText.includes(p));
  return localParts.length > 0 ? localParts : allParts;
}

const text = "I was in my room waitin for my tutor and there you comes in. I looked at you preethi and smiled and saw your small hip exposing from your saree and that hot smile and that fucking face of yours.";
const characters = [{ name: 'Preethi', actressName: 'Nayanthara', gender: 'female' }];

const allParts = detectBodyParts(text);
console.log('Detected all parts:', allParts);
const charParts = detectPartsForCharacter(text, 'Preethi', allParts);
console.log('Parts for Preethi:', charParts);
