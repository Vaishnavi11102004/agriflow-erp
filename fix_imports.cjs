const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/admin/Dashboard.jsx',
  'src/pages/admin/Reports.jsx',
  'src/pages/farmer/BookingSlot.jsx',
  'src/pages/farmer/CropManagement.jsx',
  'src/pages/farmer/GrainSales.jsx',
  'src/pages/farmer/Profile.jsx',
  'src/pages/farmer/SeedPurchase.jsx',
  'src/pages/farmer/TransactionHistory.jsx',
  'src/pages/superadmin/Dashboard.jsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('import LoadingSpinner')) {
    let relativePath = path.relative(path.dirname(f), 'src/components/shared/LoadingSpinner').replace(/\\/g, '/');
    content = `import LoadingSpinner from '${relativePath}';\n` + content;
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed import in ' + f);
  }
});
