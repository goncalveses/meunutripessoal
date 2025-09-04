const bcrypt = require('bcryptjs');

/**
 * Utilitário para gerar senhas hash para administradores
 * Use este script para gerar senhas seguras para novos administradores
 */

async function generatePasswordHash(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function generateAdminPasswords() {
  console.log('🔐 Gerando senhas hash para administradores...\n');
  
  const passwords = {
    'admin123': await generatePasswordHash('admin123'),
    'mod123': await generatePasswordHash('mod123'),
    'superadmin2024': await generatePasswordHash('superadmin2024'),
    'dietabot2024': await generatePasswordHash('dietabot2024')
  };
  
  console.log('📋 Senhas geradas:');
  console.log('==================');
  
  Object.entries(passwords).forEach(([password, hash]) => {
    console.log(`Senha: ${password}`);
    console.log(`Hash:  ${hash}`);
    console.log('---');
  });
  
  console.log('\n💡 Copie o hash correspondente para o arquivo auth.js');
  console.log('⚠️  IMPORTANTE: Altere essas senhas em produção!');
}

// Executar se chamado diretamente
if (require.main === module) {
  generateAdminPasswords().catch(console.error);
}

module.exports = {
  generatePasswordHash,
  generateAdminPasswords
};
