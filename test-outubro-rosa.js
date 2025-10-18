// Teste simples para verificar se as mensagens do Outubro Rosa estão funcionando
const prompts = require('./src/prompts');

console.log('=== TESTE DAS MENSAGENS OUTUBRO ROSA ===\n');

// Teste da mensagem de consentimento
console.log('1. Mensagem de Consentimento:');
console.log(prompts.prompts.consent.request);
console.log('\n' + '='.repeat(50) + '\n');

// Teste da mensagem de consentimento concedido
console.log('2. Mensagem de Consentimento Concedido:');
console.log(prompts.prompts.consent.granted);
console.log('\n' + '='.repeat(50) + '\n');

// Teste da mensagem de inicialização
console.log('3. Mensagem de Inicialização:');
console.log(prompts.prompts.status.initializing);
console.log('\n' + '='.repeat(50) + '\n');

// Teste do prompt do sistema (primeiras linhas)
console.log('4. Prompt do Sistema (início):');
console.log(prompts.systemPrompt.substring(0, 100) + '...');
console.log('\n' + '='.repeat(50) + '\n');

// Verificar se contém "Outubro Rosa"
const containsOutubroRosa = prompts.systemPrompt.includes('Outubro Rosa') &&
                          prompts.prompts.consent.request.includes('Outubro Rosa') &&
                          prompts.prompts.status.initializing.includes('Outubro Rosa');

console.log('5. Verificação de Outubro Rosa:');
console.log(containsOutubroRosa ? '✅ PASSOU - Todas as mensagens contêm "Outubro Rosa"' : '❌ FALHOU - Algumas mensagens ainda contêm referências antigas');

console.log('\n=== FIM DO TESTE ===');