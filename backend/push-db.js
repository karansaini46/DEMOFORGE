const { execSync } = require('child_process');

try {
  console.log('Pushing schema...');
  execSync('npx prisma db push --accept-data-loss --force-reset', { stdio: 'inherit', env: { ...process.env, CI: 'true', PRISMA_HIDE_UPDATE_MESSAGE: '1' } });
  console.log('Schema pushed!');
} catch (err) {
  console.error('Failed:', err.message);
}
