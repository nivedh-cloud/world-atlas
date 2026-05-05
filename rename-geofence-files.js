import fs from 'fs';
import path from 'path';

const topojsonDir = './public/topojson';

// File rename mappings
const renameMap = {
  'the bahamas.json': 'bahamas.json',
  'republic of serbia.json': 'serbia.json',
  'united republic of tanzania.json': 'tanzania.json',
  'united states of america.json': 'united states.json',
  'guinea bissau.json': 'guinea-bissau.json',
  'macedonia.json': 'north macedonia.json',
};

console.log('🔄 Renaming TopoJSON files to match countries-info.json...\n');

Object.entries(renameMap).forEach(([oldName, newName]) => {
  const oldPath = path.join(topojsonDir, oldName);
  const newPath = path.join(topojsonDir, newName);

  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`✅ ${oldName} → ${newName}`);
  } else {
    console.log(`⚠️  ${oldName} not found`);
  }
});

console.log('\n✨ File renaming complete!');
