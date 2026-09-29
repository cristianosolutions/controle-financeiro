import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { removeStoredAttachment } from '../src/lib/attachments.js';

// Execute from backend: npx tsx scripts/qa-api.ts. Creates and removes only its own fixtures.
const run = randomUUID();
const ids: string[] = [];
const results: { name: string; status: string; detail?: string }[] = [];
const password = 'QaTemporary#2026';
const date = new Date().toISOString();
const month = date.slice(0, 7);
let token = '';
const api = (method: 'get'|'post'|'put'|'delete', path: string, data?: unknown, auth = token) => {
  const req = request(app)[method](path).set('Authorization', `Bearer ${auth}`).timeout(15000);
  return data === undefined ? req : req.send(data);
};
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); results.push({ name, status: 'PASS' }); }
  catch (error) { results.push({ name, status: 'FAIL', detail: error instanceof Error ? error.message : String(error) }); }
  console.log(`${results.at(-1)!.status}: ${name}${results.at(-1)!.detail ? ' — '+results.at(-1)!.detail : ''}`);
}
async function register(label: string) {
  const email = `qa-${label}-${run}@example.test`;
  const user = await request(app).post('/api/auth/register').send({ name: `QA ${label}`, email, password }).timeout(15000).expect(201);
  ids.push(user.body.id);
  const login = await request(app).post('/api/auth/login').send({ email, password }).timeout(15000).expect(200);
  return login.body.token as string;
}
try {
  token = await register('primary');
  const other = await register('isolation');
  const account = (await api('get', '/api/accounts').expect(200)).body[0];
  const reserve = (await api('post', '/api/accounts', { name: 'QA reserva', type: 'SAVINGS', initialBalance: 1000 }).expect(201)).body;
  const category = (await api('post', '/api/categories', { name: 'QA despesa', type: 'EXPENSE', color: '#123456' }).expect(201)).body;
  const incomeCategory = (await api('post', '/api/categories', { name: 'QA receita', type: 'INCOME', color: '#123456' }).expect(201)).body;
  const tx = { description: 'QA compra', amount: 125.50, type: 'EXPENSE', status: 'PAID', date, categoryId: category.id, accountId: account.id, paymentMethod: 'PIX' };
  const balance = async (id: string) => (await api('get', '/api/accounts').expect(200)).body.find((a: any) => a.id === id).balance;
  await check('Health e readiness reais', async () => { await request('http://localhost:3333').get('/health/ready').expect(200); });
  await check('Frontend HTTP disponível', async () => { const r = await fetch('http://127.0.0.1:5173'); assert.equal(r.status, 200); assert.match(await r.text(), /root/); });
  await check('Leitura de todos os módulos', async () => {
    for (const path of ['/auth/me','/auth/sessions','/accounts','/categories','/cards','/transfers','/transactions','/recurrences','/goals','/alerts',`/budgets?month=${month}`,`/dashboard/summary?month=${month}`,'/forecasts',`/reports/financial?from=${month}-01&to=${month}-28`]) await api('get', '/api'+path).expect(200);
  });
  await check('Bloqueio administrativo para usuário comum', async () => { await api('get','/api/admin/users').expect(403); await api('get','/api/admin/audit-logs').expect(403); });
  await check('CRUD de lançamento e impacto no saldo', async () => {
    const r = await api('post','/api/transactions',tx).expect(201);
    assert.equal(await balance(account.id), -125.5);
    await api('put',`/api/transactions/${r.body.id}`,{...tx,amount:100}).expect(200);
    assert.equal(await balance(account.id), -100);
    await api('delete',`/api/transactions/${r.body.id}`).expect(204);
    assert.equal(await balance(account.id), 0);
  });
  await check('Transferência conserva patrimônio e estorno restaura saldos', async () => {
    const r = await api('post','/api/transfers',{description:'QA transferência',amount:200,date,fromAccountId:reserve.id,toAccountId:account.id}).expect(201);
    assert.equal(await balance(account.id),200); assert.equal(await balance(reserve.id),800);
    await api('delete',`/api/transfers/${r.body.id}`).expect(204);
    assert.equal(await balance(account.id),0); assert.equal(await balance(reserve.id),1000);
    await api('post','/api/transfers',{description:'QA inválida',amount:10,date,fromAccountId:account.id,toAccountId:account.id}).expect(422);
  });
  await check('Isolamento de contas, categorias e lançamentos', async () => {
    await api('delete',`/api/accounts/${reserve.id}`,undefined,other).expect(404);
    await api('post','/api/transactions',tx,other).expect(404);
    const list = await api('get','/api/transactions',undefined,other).expect(200); assert.equal(list.body.pagination.total,0);
  });
  await check('Rejeição de valor negativo, categoria incompatível e status inválido', async () => {
    for(const data of [{...tx,amount:-1},{...tx,categoryId:incomeCategory.id},{...tx,status:'RECEIVED'}]) await api('post','/api/transactions',data).expect(422);
  });
  await check('Orçamento: criação, cópia e exclusão', async () => {
    const b = await api('post','/api/budgets',{month,categoryId:category.id,amount:500}).expect(201);
    const copyMonth = month.endsWith('12') ? `${Number(month.slice(0,4))+1}-01` : `${month.slice(0,4)}-${String(Number(month.slice(5))+1).padStart(2,'0')}`;
    const copy = await api('post','/api/budgets/copy',{fromMonth:month,toMonth:copyMonth}).expect(201); assert.equal(copy.body.length,1);
    await api('delete',`/api/budgets/${b.body.id}`).expect(204); await api('delete',`/api/budgets/${copy.body[0].id}`).expect(204);
  });
  await check('Meta: aporte debita conta e exclusão do aporte estorna', async () => {
    const goal = (await api('post','/api/goals',{name:'QA meta',targetAmount:500}).expect(201)).body;
    const added = (await api('post',`/api/goals/${goal.id}/contributions`,{amount:50,date,accountId:reserve.id}).expect(201)).body;
    assert.equal(await balance(reserve.id),950);
    await api('delete',`/api/goals/${goal.id}/contributions/${added.contributions[0].id}`).expect(204);
    assert.equal(await balance(reserve.id),1000); await api('delete',`/api/goals/${goal.id}`).expect(204);
  });
  const card = (await api('post','/api/cards',{name:'QA cartão',creditLimit:2000,closingDay:20,dueDay:28}).expect(201)).body;
  const purchase = {...tx,accountId:null,cardId:card.id,paymentMethod:'CREDIT_CARD',amount:100};
  await check('Parcelamento preserva total de centavos', async () => {
    const r = await api('post','/api/transactions',{...purchase,installments:3}).expect(201);
    assert.equal(r.body.items.length,3); assert.equal(r.body.items.reduce((sum:number,t:any)=>sum+Math.round(Number(t.amount)*100),0),10000);
    for(const item of r.body.items) await api('delete',`/api/transactions/${item.id}`).expect(204);
  });
  await check('Fatura: pagamento, prevenção de duplicidade e estorno', async () => {
    const item = (await api('post','/api/transactions',purchase).expect(201)).body;
    const invoices = (await api('get',`/api/cards/${card.id}/invoices`).expect(200)).body.invoices;
    const path = `/api/cards/${card.id}/invoices/${invoices[0].referenceMonth}`;
    await api('post',path+'/pay',{accountId:reserve.id,paidAt:date}).expect(201); assert.equal(await balance(reserve.id),900);
    await api('post',path+'/pay',{accountId:reserve.id,paidAt:date}).expect(422);
    await api('delete',path+'/payment').expect(204); assert.equal(await balance(reserve.id),1000);
    await api('delete',`/api/transactions/${item.id}`).expect(204);
  });
  await check('Importação: prévia, gravação e proteção contra duplicidade', async () => {
    const body = {rows:[{rowNumber:2,date:date.slice(0,10),description:'QA CSV',amount:'12,50',type:'Despesa',category:category.name,account:account.name,paymentMethod:'PIX',status:'Pago'}]};
    const preview = await api('post','/api/imports/transactions/preview',body).expect(200); assert.equal(preview.body.summary.valid,1);
    assert.equal((await api('post','/api/imports/transactions/commit',body).expect(201)).body.imported,1);
    assert.equal((await api('post','/api/imports/transactions/commit',body).expect(201)).body.imported,0);
  });
  await check('Recorrência materializa sem duplicar', async () => {
    const r = await api('post','/api/recurrences',{...tx,frequency:'MONTHLY',startDate:date,endDate:date}).expect(201);
    const before = (await api('get','/api/transactions').expect(200)).body.pagination.total;
    await api('get','/api/recurrences').expect(200); await api('get','/api/recurrences').expect(200);
    assert.equal((await api('get','/api/transactions').expect(200)).body.pagination.total,before);
    await api('delete',`/api/recurrences/${r.body.id}`).expect(204);
  });
  await check('Anexo: upload, download privado e exclusão', async () => {
    const item = (await api('post','/api/transactions',tx).expect(201)).body;
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOuoAAAAASUVORK5CYII=','base64');
    const attachment = await api('post',`/api/transactions/${item.id}/attachments`).attach('file',png,'qa.png').expect(201);
    const path = `/api/transactions/${item.id}/attachments/${attachment.body.id}`;
    await api('get',path).expect(200); await api('get',path,undefined,other).expect(404); await api('delete',path).expect(204);
    await api('delete',`/api/transactions/${item.id}`).expect(204);
  });
  await check('Observações preservam espaços informados (contrato README)', async () => {
    const notes = '  texto livre  ';
    const r = await api('post','/api/transactions',{...tx,notes}).expect(201);
    try { assert.equal(r.body.notes, notes); } finally { await api('delete',`/api/transactions/${r.body.id}`).expect(204); }
  });
  await check('Fatura paga não pode perder compras mantendo débito integral', async () => {
    const item = (await api('post','/api/transactions',purchase).expect(201)).body;
    const invoices = (await api('get',`/api/cards/${card.id}/invoices`).expect(200)).body.invoices;
    const path = `/api/cards/${card.id}/invoices/${invoices[0].referenceMonth}`;
    await api('post',path+'/pay',{accountId:reserve.id,paidAt:date}).expect(201);
    const removed = await api('delete',`/api/transactions/${item.id}`);
    const remaining = (await api('get',`/api/cards/${card.id}/invoices`).expect(200)).body.invoices;
    const currentBalance = await balance(reserve.id);
    try { assert.ok(removed.status !== 204 || remaining.length > 0 || currentBalance === 1000, `DELETE=${removed.status}; faturas=${remaining.length}; saldo=${currentBalance} (antes=1000)`); }
    finally { await api('delete',path+'/payment').expect(204); }
  });
  await check('Conta com pagamento de fatura deve retornar erro de negócio ao excluir', async () => {
    const item = (await api('post','/api/transactions',purchase).expect(201)).body;
    const invoice = (await api('get',`/api/cards/${card.id}/invoices`).expect(200)).body.invoices[0];
    const path = `/api/cards/${card.id}/invoices/${invoice.referenceMonth}`;
    await api('post',path+'/pay',{accountId:reserve.id,paidAt:date}).expect(201);
    try { await api('delete',`/api/accounts/${reserve.id}`).expect(422); }
    finally { await api('delete',path+'/payment').expect(204); await api('delete',`/api/transactions/${item.id}`).expect(204); }
  });
  await check('Foto de perfil: upload, leitura e remoção', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOuoAAAAASUVORK5CYII=','base64');
    await api('put','/api/auth/avatar').attach('file',png,'qa.png').expect(200);
    await api('get','/api/auth/avatar').expect(200); await api('delete','/api/auth/avatar').expect(204); await api('get','/api/auth/avatar').expect(404);
  });
  await check('JSON malformado deve retornar 400, não falha interna', async () => {
    await request(app).post('/api/auth/login').set('Content-Type','application/json').send('{').timeout(15000).expect(400);
  });
  await check('Administração: cadastro, edição, recuperação, auditoria e exclusão', async () => {
    // Promotion applies exclusively to a disposable fixture, never an existing account.
    await prisma.user.update({where:{id:ids[1]!},data:{role:'ADMIN'}});
    const email = `qa-managed-${run}@example.test`;
    const managed = (await api('post','/api/admin/users',{name:'QA administrado',email,password},other).expect(201)).body;
    ids.push(managed.id);
    await api('put',`/api/admin/users/${managed.id}`,{name:'QA editado'},other).expect(200);
    await api('put',`/api/admin/users/${ids[1]}`,{role:'USER'},other).expect(422);
    const recovery = (await api('post',`/api/admin/users/${managed.id}/recovery-code`,{},other).expect(201)).body;
    await request(app).post('/api/auth/reset-password').send({token:recovery.token,password:'QaRecovered#2026'}).timeout(15000).expect(204);
    await request(app).post('/api/auth/reset-password').send({token:recovery.token,password:'QaRecovered#2026'}).timeout(15000).expect(422);
    const login = (await request(app).post('/api/auth/login').send({email,password:'QaRecovered#2026'}).timeout(15000).expect(200)).body;
    await api('put',`/api/admin/users/${managed.id}`,{isActive:false},other).expect(200);
    await api('get','/api/auth/me',undefined,login.token).expect(403);
    const logs = (await api('get',`/api/admin/audit-logs?actorUserId=${ids[1]}`,undefined,other).expect(200)).body;
    assert.ok(logs.items.some((l:any)=>l.action==='RECOVERY_CODE_CREATED'));
    await api('delete',`/api/admin/users/${managed.id}`,undefined,other).expect(204);
  });
  await check('Troca de senha exige senha atual e permite novo login', async () => {
    await api('put','/api/auth/password',{currentPassword:'errada',newPassword:'QaChanged#2026'}).expect(422);
    await api('put','/api/auth/password',{currentPassword:password,newPassword:'QaChanged#2026'}).expect(204);
    const login = await request(app).post('/api/auth/login').send({email:`qa-primary-${run}@example.test`,password:'QaChanged#2026'}).timeout(15000).expect(200);
    token = login.body.token;
  });
  await check('Logout revoga sessão', async () => { await api('post','/api/auth/logout').expect(204); await api('get','/api/auth/me').expect(401); });
} finally {
  // All predicates are restricted to the exact users created by this run.
  const where = { userId: { in: ids } };
  const attachments = await prisma.transactionAttachment.findMany({ where, select: { storedName: true } });
  for(const attachment of attachments) await removeStoredAttachment(attachment.storedName);
  const users = await prisma.user.findMany({where:{id:{in:ids}},select:{avatarStoredName:true}});
  for(const user of users) if(user.avatarStoredName) await removeStoredAttachment(user.avatarStoredName);
  await prisma.$transaction(async db => {
    await db.transactionAttachment.deleteMany({where});
    await db.cardInvoicePayment.deleteMany({where:{card:{userId:{in:ids}}}});
    await db.transaction.deleteMany({where}); await db.recurringTransaction.deleteMany({where});
    await db.transfer.deleteMany({where}); await db.goalContribution.deleteMany({where});
    await db.auditLog.deleteMany({where:{OR:[{actorUserId:{in:ids}},{entityId:{in:ids}}]}});
    await db.user.deleteMany({where:{id:{in:ids}}});
  });
  assert.equal(await prisma.user.count({where:{id:{in:ids}}}),0);
  await prisma.$disconnect();
  await writeFile('../docs/QA_API_RESULTS.json',JSON.stringify({runAt:new Date().toISOString(),cleanup:'confirmed',results},null,2)+'\n');
}
process.exitCode = results.some(r=>r.status==='FAIL') ? 1 : 0;
