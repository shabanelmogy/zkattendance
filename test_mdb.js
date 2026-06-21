import fs from 'fs';
import MDBReader from 'mdb-reader';

try {
  const dbPath = JSON.parse(fs.readFileSync('./settings.json', 'utf8')).dbPath;
  const buffer = fs.readFileSync(dbPath);
  const reader = new MDBReader(buffer);

  const users = reader.getTable('USERINFO').getData({ limit: 10 });
  users.forEach(u => console.log('Name:', u.Name, '->', Buffer.from(u.Name || '', 'latin1').toString('utf8')));
  
} catch (e) {
  console.error('Error:', e);
}
