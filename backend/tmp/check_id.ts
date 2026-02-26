
import mongoose from 'mongoose';
import Category from '../src/models/Category';
import SubCategory from '../src/models/SubCategory';
import HeaderCategory from '../src/models/HeaderCategory';

const ID = '69999170f4c9410caafcdb2d';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/ApnaSabjiWala');
  console.log('Checking ID:', ID);

  const cat = await Category.findById(ID);
  console.log('In Category:', cat ? 'FOUND' : 'NOT FOUND');

  const sub = await SubCategory.findById(ID);
  console.log('In SubCategory:', sub ? 'FOUND' : 'NOT FOUND');

  const header = await HeaderCategory.findById(ID);
  console.log('In HeaderCategory:', header ? 'FOUND' : 'NOT FOUND');

  if (cat) console.log('Category Details:', JSON.stringify(cat, null, 2));
  if (sub) console.log('SubCategory Details:', JSON.stringify(sub, null, 2));
  if (header) console.log('HeaderCategory Details:', JSON.stringify(header, null, 2));

  process.exit();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
