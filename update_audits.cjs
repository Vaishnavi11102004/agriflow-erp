const fs = require('fs');

function processAdmin() {
    let content = fs.readFileSync('server/routes/admin.js', 'utf-8');
    
    // Pattern: `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, '...', $3, $4)`
    const regex = /(`INSERT INTO audit_logs \(user_id, action, entity_type, entity_id, details\) VALUES \(\$1, \$2, '([^']+)', \$3, \$4\)`\s*,\s*\[)([\s\S]*?)(\]\s*\);)/g;
    
    content = content.replace(regex, (match, p1, p2, p3, p4) => {
        // p1 is the string up to the opening bracket of the array
        // p2 is the entity type matched inside p1
        // p3 is the contents of the array
        // p4 is the closing bracket and parenthesis
        
        let newP1 = p1.replace('details)', 'details, ip_address)').replace('$3, $4)', '$3, $4, $5)');
        return newP1 + p3 + ', req.ip || req.connection?.remoteAddress' + p4;
    });
    
    fs.writeFileSync('server/routes/admin.js', content);
}

function processAuth() {
    let content = fs.readFileSync('server/routes/auth.js', 'utf-8');
    
    // First query: LOGIN
    let regex1 = /(`INSERT INTO audit_logs \(user_id, action, details\) VALUES \(\$1, 'LOGIN', \$2\)`\s*,\s*\[)([\s\S]*?)(\]\s*\);)/g;
    content = content.replace(regex1, (match, p1, p2, p3) => {
        let newP1 = p1.replace('details)', 'entity_type, entity_id, details, ip_address)').replace('$1, \'LOGIN\', $2', '$1, \'LOGIN\', \'user\', $1, $2, $3');
        return newP1 + p2 + ', req.ip || req.connection?.remoteAddress' + p3;
    });

    // Second query: PROFILE_UPDATE
    let regex2 = /(`INSERT INTO audit_logs \(user_id, action, details\) VALUES \(\$1, 'PROFILE_UPDATE', \$2\)`\s*,\s*\[)([\s\S]*?)(\]\s*\);)/g;
    content = content.replace(regex2, (match, p1, p2, p3) => {
        let newP1 = p1.replace('details)', 'entity_type, entity_id, details, ip_address)').replace('$1, \'PROFILE_UPDATE\', $2', '$1, \'PROFILE_UPDATE\', \'user\', $1, $2, $3');
        return newP1 + p2 + ', req.ip || req.connection?.remoteAddress' + p3;
    });

    fs.writeFileSync('server/routes/auth.js', content);
}

processAdmin();
processAuth();
