const fs = require('fs');
const files = [
  'src/pages/public/LandingPage.jsx',
  'src/pages/public/SeedsCatalogPage.jsx',
  'src/pages/public/MarketRatesPage.jsx',
  'src/pages/public/HowItWorksPage.jsx',
  'src/pages/farmer/GrainSales.jsx',
  'src/pages/farmer/SeedPurchase.jsx',
  'src/pages/farmer/CropManagement.jsx',
  'src/pages/farmer/BookingSlot.jsx',
  'src/pages/admin/GrainSalesAdmin.jsx',
  'src/pages/admin/MarketRates.jsx',
  'src/pages/admin/Warehouse.jsx',
  'server/database/db.js'
];

const replacements = [
  { p: /'Soybean',?\s*/gi, r: '' },
  { p: /"Soybean",?\s*/gi, r: '' },
  { p: /Soybean:.*?,/gi, r: '' },
  { p: /Jowar:.*?,/gi, r: '' },
  { p: /'Jowar',?\s*/gi, r: '' },
  { p: /"Jowar",?\s*/gi, r: '' },
  { p: /'abcd',?\s*/gi, r: '' },
  { p: /"abcd",?\s*/gi, r: '' },
  { p: /'soyabean',?\s*/gi, r: '' },
  { p: /"soyabean",?\s*/gi, r: '' },
  { p: /\[\s*'Soybean'.*?\],?\s*/gi, r: '' },
  { p: /\[\s*'Jowar'.*?\],?\s*/gi, r: '' }
];

files.forEach(f => {
  if(fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    let newContent = content;
    replacements.forEach(({p, r}) => {
      newContent = newContent.replace(p, r);
    });
    if(newContent !== content) {
      fs.writeFileSync(f, newContent);
      console.log('Updated ' + f);
    }
  }
});
