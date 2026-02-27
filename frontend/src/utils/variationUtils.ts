export const getVariationColor = (value: string) => {
  const val = value.toLowerCase().trim();
  if (val.includes('1kg') || val.includes('1 kg') || val.includes('1 liter') || val.includes('1l'))
    return 'bg-orange-50 text-orange-700 border-orange-200';
  if (val.includes('500g') || val.includes('500 gm') || val.includes('500 ml') || val.includes('half'))
    return 'bg-red-50 text-red-700 border-red-200';
  if (val.includes('250g') || val.includes('250 gm') || val.includes('250 ml') || val.includes('quarter'))
    return 'bg-blue-50 text-blue-700 border-blue-200';
  if (val.includes('100g') || val.includes('100 gm') || val.includes('100 ml'))
    return 'bg-green-50 text-green-700 border-green-200';
  if (val.includes('pc') || val.includes('unit') || val.includes('dozen'))
    return 'bg-purple-50 text-purple-700 border-purple-200';
  return 'bg-neutral-50 text-neutral-600 border-neutral-200';
};
