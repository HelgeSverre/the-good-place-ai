export const CHARACTER_COLORS: Record<string, string> = {
  Eleanor: '#FF6B6B',
  Chidi: '#4ECDC4',
  Tahani: '#9B59B6',
  Jason: '#F39C12',
  Michael: '#3498DB',
  Janet: '#1ABC9C',
  Shawn: '#E74C3C',
  'Bad Janet': '#7F8C8D',
  Mindy: '#DAA520',
  Derek: '#FF69B4',
  Director: '#95A5A6',
};

export function getCharacterColor(name: string): string {
  return CHARACTER_COLORS[name] || '#FFFFFF';
}
