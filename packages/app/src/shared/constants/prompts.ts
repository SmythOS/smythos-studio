/*
 * Function to generate the LinkedIn avatar prompt
 */
export function generateLinkedInAvatarPrompt(): string {
  const ethnicities = [
    'latin',
    'african',
    'dutch',
    'american',
    'chinese',
    'philippine',
    'cuban',
    'mexican',
    'brazilian',
    'samoan',
    'japanese',
    'swedish',
    'irish',
    'italian',
    'lebanese',
    'tunisian',
    'pakistani',
    'indian',
    'mongolian',
  ];
  const ageGroups = ['young', 'twenties', 'thirties', 'middle-aged', 'senior'];
  const genders = ['female', 'male'];

  const randomElement = (array: string[]) => array[Math.floor(Math.random() * array.length)];

  const gender = randomElement(genders);
  const ageGroup = randomElement(ageGroups);
  const ethnicity = randomElement(ethnicities);

  // added a comment to not let OpenAI modify the prompt
  return `I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS: headshot photo for linkedin, attractive, diverse, High-Key Lighting 85mm, square, ${ethnicity}, ${ageGroup}, ${gender}`;
}
