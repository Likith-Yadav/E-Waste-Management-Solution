export const wasteCategories = {
  recyclable: [
    'bottle', 'cup', 'wine glass', 'fork', 'knife', 'spoon', 'bowl',
    'book', 'paper', 'cardboard', 'box', 'newspaper', 'magazine'
  ],
  electronic: [
    'laptop', 'tv', 'cell phone', 'keyboard', 'mouse', 'remote',
    'microwave', 'oven', 'toaster', 'refrigerator'
  ],
  hazardous: [
    'scissors', 'knife', 'battery', 'fire hydrant',
    'stop sign', 'traffic light'
  ],
  organic: [
    'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
    'hot dog', 'pizza', 'donut', 'cake', 'potted plant'
  ]
};

export function getWasteCategory(itemType: string): string {
  const lowerType = itemType.toLowerCase().trim();
  
  for (const [category, items] of Object.entries(wasteCategories)) {
    if (items.some(item => 
      lowerType.includes(item) || 
      item.includes(lowerType)
    )) {
      return category;
    }
  }
  
  return 'other';
} 