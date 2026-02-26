const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in .env');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const HeaderCategory = mongoose.model('HeaderCategory', new mongoose.Schema({}, { strict: false }));
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));

    const headers = await HeaderCategory.find().lean();
    console.log('HEADERS_START');
    console.log(JSON.stringify(headers, null, 2));
    console.log('HEADERS_END');

    const categories = await Category.find({ parentId: null }).lean();
    console.log('ROOT_CATEGORIES_START');
    console.log(JSON.stringify(categories, null, 2));
    console.log('ROOT_CATEGORIES_END');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
