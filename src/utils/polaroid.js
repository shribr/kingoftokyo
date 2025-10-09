/**
 * Shared polaroid card HTML generator
 * Used by splash screen and monster selection components
 * 
 * @param {Object} monster - Monster object with id, name, image, color
 * @param {number} index - Card index for unique class
 * @param {boolean} useTransform - Whether to apply rotation transform (default: true)
 * @returns {string} HTML string for polaroid card
 */
export function polaroidHTML(monster, index, useTransform = true) {
  const tint = monster.color || '#444444';
  const rotations = [-15, 12, -8, 18, -12, 9]; // Rotation values for indices 1-6
  const rotation = useTransform && index > 0 && index <= rotations.length 
    ? rotations[index - 1] 
    : 0;
  
  return `<div class="polaroid polaroid-${index}" style="--monster-tint: ${tint}; --rotation: ${rotation}deg;">
      ${monster.image ? `<img src="${monster.image}" alt="${monster.name}"/>` : `<div class="polaroid-fallback">${monster.name}</div>`}
      <div class="polaroid-caption">${monster.name}</div>
    </div>`;
}
