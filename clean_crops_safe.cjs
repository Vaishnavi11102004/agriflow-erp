const fs = require('fs');

const replacements = [
  {
    file: 'src/pages/public/HowItWorksPage.jsx',
    replaces: [
      { p: /\[\'Soybean\', \'B\', \'₹36\/kg\'\], /g, r: '' }
    ]
  },
  {
    file: 'src/pages/public/LandingPage.jsx',
    replaces: [
      { p: /\[\'Soybean\', \'B\', \'₹36\/kg\'\], /g, r: '' },
      { p: / Soybean: '🫘',/g, r: '' },
      { p: / Soybean: 'from-lime-500 to-green-600', Jowar: 'from-rose-400 to-red-500',/g, r: '' },
      { p: /  Soybean: '\/soybean-seeds\.png',\n/g, r: '' }
    ]
  },
  {
    file: 'src/pages/public/SeedsCatalogPage.jsx',
    replaces: [
      { p: / Soybean: '🫘',/g, r: '' },
      { p: /  Soybean: '\/soybean-seeds\.png',\n/g, r: '' }
    ]
  },
  {
    file: 'src/pages/public/MarketRatesPage.jsx',
    replaces: [
      { p: / Soybean: 'from-lime-500 to-green-600', Jowar: 'from-rose-400 to-red-500',/g, r: '' }
    ]
  },
  {
    file: 'src/pages/farmer/CropManagement.jsx',
    replaces: [
      { p: /'Soybean', /g, r: '' }
    ]
  },
  {
    file: 'src/pages/farmer/BookingSlot.jsx',
    replaces: [
      { p: /'Soybean', /g, r: '' }
    ]
  },
  {
    file: 'src/pages/farmer/SeedPurchase.jsx',
    replaces: [
      { p: /  Soybean: '\/soybean-seeds\.png',\n/g, r: '' }
    ]
  },
  {
    file: 'src/pages/farmer/GrainSales.jsx',
    replaces: [
      { p: /'Soybean', /g, r: '' }
    ]
  },
  {
    file: 'src/pages/admin/Warehouse.jsx',
    replaces: [
      { p: /                  <option value="Soybean">Soybean<\/option>\n/g, r: '' },
      { p: /                  <option value="Jowar">Jowar<\/option>\n/g, r: '' }
    ]
  },
  {
    file: 'src/pages/admin/MarketRates.jsx',
    replaces: [
      { p: /'Soybean', 'Jowar', /g, r: '' }
    ]
  },
  {
    file: 'src/pages/admin/GrainSalesAdmin.jsx',
    replaces: [
      { p: /'Soybean', /g, r: '' }
    ]
  },
  {
    file: 'server/database/db.js',
    replaces: [
      { p: /, 'Soybean'/g, r: '' },
      { p: /      \['JS-335 Soybean'.*\n/g, r: '' },
      { p: /      \['Soybean'.*\n/g, r: '' },
      { p: /      \['Jowar'.*\n/g, r: '' }
    ]
  }
];

replacements.forEach(({file, replaces}) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let oldContent = content;
    replaces.forEach(({p, r}) => {
      content = content.replace(p, r);
    });
    if (content !== oldContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated', file);
    }
  }
});
