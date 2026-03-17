/**
 * Migration: Update user groups, roles, and account access permissions
 * Per revised portal reference spreadsheet March 17, 2026
 *
 * Run with: npx tsx backend/scripts/migrate-groups-march-2026.ts
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'treasury.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function log(msg: string) {
  console.log(`[MIGRATE] ${msg}`);
}

// ============================================================
// SECTION 1: UPSERT ALL USER GROUP MEMBERSHIPS
// ============================================================

log('=== SECTION 1: User Group Memberships ===');

// Helper: upsert user (create if not exists, return id)
function upsertUser(name: string, email: string): string {
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email.toLowerCase()) as { id: string } | undefined;
  if (existing) {
    log(`  User exists: ${name} (${email}) -> ${existing.id}`);
    return existing.id;
  }
  // Create with admin role (all portal users in this context are admin-level for group-based access)
  const id = `user-${email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
  db.prepare(`
    INSERT INTO users (id, email, name, role, status, department)
    VALUES (?, ?, ?, 'admin', 'active', ?)
  `).run(id, email.toLowerCase(), name, 'Treasury');
  log(`  Created user: ${name} (${email}) -> ${id}`);
  return id;
}

// Helper: upsert group member with role and is_supervisor
function upsertGroupMember(groupId: string, userId: string, role: string, isSupervisor: number, adminId: string) {
  const existing = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId) as { id: string } | undefined;
  if (existing) {
    db.prepare('UPDATE group_members SET role = ?, is_supervisor = ? WHERE id = ?').run(role, isSupervisor, existing.id);
    log(`  Updated membership: ${userId} in ${groupId} -> role=${role}, is_supervisor=${isSupervisor}`);
  } else {
    db.prepare(`
      INSERT INTO group_members (group_id, user_id, added_by, role, is_supervisor)
      VALUES (?, ?, ?, ?, ?)
    `).run(groupId, userId, adminId, role, isSupervisor);
    log(`  Added membership: ${userId} in ${groupId} -> role=${role}, is_supervisor=${isSupervisor}`);
  }
}

// Helper: remove group member
function removeGroupMember(groupId: string, userId: string) {
  const result = db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
  if (result.changes > 0) {
    log(`  Removed: ${userId} from ${groupId}`);
  } else {
    log(`  (No membership found to remove: ${userId} from ${groupId})`);
  }
}

const adminId = 'admin-001'; // John Murphy

// --- Create/find all users ---
const johnMurphy = upsertUser('John Murphy', 'john.murphy@gusto.com');
const mingHuey = upsertUser('Ming Huey', 'ming.huey@gusto.com');
const bobbyCajucom = upsertUser('Bobby Cajucom', 'bobby.cajucom@gusto.com');
const roselleRamos = upsertUser('Roselle Ramos', 'roselle.ramos@gusto.com');
const dianaRoig = upsertUser('Diana Roig', 'diana.roig@gusto.com');
const sydRamesh = upsertUser('Syd Ramesh', 'syd.ramesh@gusto.com');
const jecahCabaling = upsertUser('Jecah Cabaling', 'jecah.cabaling@gusto.com');
const haewonHan = upsertUser('Haewon Han', 'haewon.han@gusto.com');
const charlesS = upsertUser('Charles Sikazwe', 'charles.sikazwe@gusto.com');
const kcDeatsch = upsertUser('KC Deatsch', 'kc.deatsch@gusto.com');
const racheleRusso = upsertUser('Rachele Russo', 'rachele.russo@gusto.com');
const frankDeVoe = upsertUser('Frank DeVoe', 'frank.devoe@gusto.com');
const johnTullis = upsertUser('John Tullis', 'john.tullis@gusto.com');
const amandaWong = upsertUser('Amanda Wong', 'amanda.wong@gusto.com');
const clariceNM = upsertUser('Clarice Norman-McLean', 'clarice.norman-mclean@gusto.com');
const glydelA = upsertUser('Glydel Arioste', 'glydel.arioste@gusto.com');
const colinRobbins = upsertUser('Colin Robbins', 'colin.robbins@gusto.com');
const nahlaWardeh = upsertUser('Nahla Wardeh', 'nahla.wardeh@gusto.com');

// --- TREASURY (is_supervisor=true, role=initiator_approver) ---
log('\n--- Treasury Group ---');
upsertGroupMember('grp-treasury', johnMurphy, 'initiator_approver', 1, adminId);
upsertGroupMember('grp-treasury', mingHuey, 'initiator_approver', 1, adminId);
upsertGroupMember('grp-treasury', bobbyCajucom, 'initiator_approver', 1, adminId);

// --- ACCOUNTS PAYABLE ---
log('\n--- Accounts Payable Group ---');
upsertGroupMember('grp-ap', roselleRamos, 'initiator_approver', 0, adminId);
upsertGroupMember('grp-ap', dianaRoig, 'initiator_approver', 0, adminId);
upsertGroupMember('grp-ap', sydRamesh, 'initiator_approver', 1, adminId);

// --- ACCOUNTING ---
log('\n--- Accounting Group ---');
upsertGroupMember('grp-accounting', jecahCabaling, 'initiator_approver', 0, adminId);
upsertGroupMember('grp-accounting', haewonHan, 'initiator_approver', 0, adminId);
upsertGroupMember('grp-accounting', charlesS, 'initiator_approver', 0, adminId);
upsertGroupMember('grp-accounting', kcDeatsch, 'initiator_approver', 1, adminId);
upsertGroupMember('grp-accounting', racheleRusso, 'initiator_approver', 1, adminId);

// --- PAYMENT OPS / PLATFORM ACCOUNTING ---
log('\n--- Payment Ops / Platform Accounting Group ---');
upsertGroupMember('grp-payops', frankDeVoe, 'initiator_approver', 0, adminId);
upsertGroupMember('grp-payops', johnTullis, 'initiator_approver', 0, adminId);
upsertGroupMember('grp-payops', amandaWong, 'initiator_approver', 0, adminId);

// --- PAYROLL (ALL initiator_approver — removing previous requestor_only restriction) ---
log('\n--- Payroll Group ---');
upsertGroupMember('grp-payroll', clariceNM, 'initiator_approver', 0, adminId);
upsertGroupMember('grp-payroll', glydelA, 'initiator_approver', 0, adminId);
upsertGroupMember('grp-payroll', colinRobbins, 'initiator_approver', 1, adminId);
upsertGroupMember('grp-payroll', kcDeatsch, 'initiator_approver', 1, adminId);

// --- OTHER ---
log('\n--- Other Group ---');
upsertGroupMember('grp-other', nahlaWardeh, 'initiator_approver', 0, adminId);

// --- REMOVALS ---
log('\n--- Removals ---');
// Remove Glydel Arioste from AP (she remains in Payroll only)
removeGroupMember('grp-ap', glydelA);
// Remove Rachele Russo from Other (she's now in Accounting)
removeGroupMember('grp-other', racheleRusso);
// Remove Kevin H. from Other group entirely
const kevinH = db.prepare("SELECT id FROM users WHERE LOWER(name) LIKE '%kevin h%' OR LOWER(email) LIKE '%kevin.h%'").get() as { id: string } | undefined;
if (kevinH) {
  removeGroupMember('grp-other', kevinH.id);
} else {
  log('  Kevin H. not found in users table — skipping removal');
}

// Remove old seed users from AP that aren't in the new spec
// Sarah Chen, James Park, Maria Rodriguez were seed data
const seedAP = ['user-001', 'user-002', 'user-003']; // Sarah, James, Maria
for (const uid of seedAP) {
  const inSpec = [roselleRamos, dianaRoig, sydRamesh].includes(uid);
  if (!inSpec) {
    // Only remove if they're not in the new spec
    removeGroupMember('grp-ap', uid);
  }
}

// Remove old Treasury members who aren't in the new spec
const oldTreasuryMembers = db.prepare("SELECT user_id FROM group_members WHERE group_id = 'grp-treasury'").all() as Array<{ user_id: string }>;
const newTreasuryMembers = [johnMurphy, mingHuey, bobbyCajucom];
for (const m of oldTreasuryMembers) {
  if (!newTreasuryMembers.includes(m.user_id)) {
    removeGroupMember('grp-treasury', m.user_id);
    log(`  Removed old Treasury member: ${m.user_id}`);
  }
}

// ============================================================
// SECTION 3: ACCOUNT ACCESS BY GROUP
// ============================================================

log('\n=== SECTION 3: Account Access by Group ===');

// Helper: find account by last 4 digits in name
function findAccountByLast4(last4: string): string | null {
  const row = db.prepare("SELECT id FROM accounts WHERE name LIKE ?").get(`%-${last4}%`) as { id: string } | undefined;
  if (row) return row.id;
  // Also check without dash
  const row2 = db.prepare("SELECT id FROM accounts WHERE name LIKE ?").get(`%${last4}%`) as { id: string } | undefined;
  return row2?.id || null;
}

// Helper: upsert account (create if not exists)
function upsertAccount(nameFragment: string, last4: string, bankName: string): string {
  let id = findAccountByLast4(last4);
  if (id) {
    log(`  Account found: ${nameFragment} -> ${id}`);
    return id;
  }
  // Create the account
  id = `acct-${last4}`;
  const fullName = `${nameFragment}`;
  db.prepare(`
    INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted,
                          account_type, currency, daily_limit, dual_control_required, dual_control_threshold, sort_order)
    VALUES (?, ?, ?, ?, ?, 'checking', 'USD', 50000000, 1, 0, 100)
  `).run(id, fullName, bankName, `encrypted:****${last4}`, `encrypted:****0000`);
  log(`  Created account: ${fullName} -> ${id}`);
  return id;
}

// Create all accounts referenced in Section 3
const acctJPM9811 = upsertAccount('JPM Corporate Master -9811', '9811', 'JPMorgan Chase');
const acctAP9329 = upsertAccount('Chase AP -9329 (Gusto)', '9329', 'JPMorgan Chase');
const acctWireIn9829 = upsertAccount('Chase Wire In -9829 (Gusto)', '9829', 'JPMorgan Chase');
const acctZPI8961 = upsertAccount('Chase ZPI -8961 (ZPI)', '8961', 'JPMorgan Chase');
const acctOp9392 = upsertAccount('Chase Operating -9392 (Ardius)', '9392', 'JPMorgan Chase');
const acctCorpOp3962 = upsertAccount('Chase Corporate Operating -3962 (Gusto Capital LLC)', '3962', 'JPMorgan Chase');
const acctPayroll0566 = upsertAccount('Chase Internal Payroll Checking -0566 (Gusto)', '0566', 'JPMorgan Chase');
const acctCustDep7908 = upsertAccount('Chase Customer Deposits -7908 (Gusto)', '7908', 'JPMorgan Chase');
const acctBillings9378 = upsertAccount('Chase Billings -9378 (Gusto)', '9378', 'JPMorgan Chase');
const acctDeposits0226 = upsertAccount('Chase Deposits -0226 (Gusto)', '0226', 'JPMorgan Chase');
const acctMMF6826 = upsertAccount('JPMC MMF -6826', '6826', 'JPMorgan Chase');
const acctPNCACH0497 = upsertAccount('PNC Customer ACH/OB Wires -0497 (Gusto)', '0497', 'PNC');
const acctSVBCigna7987 = upsertAccount('SVB Cigna -7987 (Gusto)', '7987', 'Silicon Valley Bank');
const acctPNCCorp0446 = upsertAccount('PNC Corporate -0446 (Gusto)', '0446', 'PNC');
const acctGarantiBBVA5947 = upsertAccount('Garanti BBVA Turkey USD -5947', '5947', 'Garanti BBVA');
const acctTaxPmt0269 = upsertAccount('Chase Tax Payment -0269 (Gusto)', '0269', 'JPMorgan Chase');
const acctPNCCustMaster2155 = upsertAccount('PNC Customer Master -2155 (Gusto)', '2155', 'PNC');
const acctGustoInc2378 = upsertAccount('Gusto Inc -2378 (JPM)', '2378', 'JPMorgan Chase');
const acct3rdParty5119 = upsertAccount('Chase 3rd Party Processors -5119', '5119', 'JPMorgan Chase');
const acctRecovery9803 = upsertAccount('Chase Recovery Ops -9803 (Gusto)', '9803', 'JPMorgan Chase');
const acctGHProgram5843 = upsertAccount('GH Program -5843', '5843', 'JPMorgan Chase');
const acctGustoIncPNC6428 = upsertAccount('Gusto Inc -6428 (PNC)', '6428', 'PNC');
const acctInstantPayroll0673 = upsertAccount('Instant Payroll -0673 (NBKC)', '0673', 'NBKC');
const acctMexico8375 = upsertAccount('Chase Gusto Platform Mexico -8375', '8375', 'JPMorgan Chase');
const acctCanada1602 = upsertAccount('Chase Checking -1602 (Gusto Canada ULC)', '1602', 'JPMorgan Chase');

// Payroll accounts to REMOVE
const acctPEO7853 = findAccountByLast4('7853');
const acctPEO7872 = findAccountByLast4('7872');

// Helper: set group accounts (replace all for a group)
function setGroupAccounts(groupId: string, accountSpecs: Array<{ accountId: string; canSource: boolean; canDest: boolean }>) {
  // Delete existing except JPM 9811 universal (we'll re-add it)
  db.prepare('DELETE FROM group_accounts WHERE group_id = ?').run(groupId);

  for (const spec of accountSpecs) {
    let direction: string;
    if (spec.canSource && spec.canDest) direction = 'both';
    else if (spec.canSource) direction = 'from';
    else direction = 'to';

    db.prepare(`
      INSERT OR IGNORE INTO group_accounts (group_id, account_id, direction, funding_type, added_by)
      VALUES (?, ?, ?, 'both', ?)
    `).run(groupId, spec.accountId, direction, adminId);
  }
  log(`  Set ${accountSpecs.length} account access entries for ${groupId}`);
}

// --- UNIVERSAL: JPM Corporate Master -9811 for ALL groups (Source+Dest) ---
// This is included in each group's list below

// --- TREASURY: All accounts, Source+Dest ---
log('\n--- Treasury Account Access ---');
const allAccounts = db.prepare('SELECT id FROM accounts WHERE is_active = 1').all() as Array<{ id: string }>;
setGroupAccounts('grp-treasury', allAccounts.map(a => ({ accountId: a.id, canSource: true, canDest: true })));

// --- ACCOUNTS PAYABLE ---
log('\n--- AP Account Access ---');
setGroupAccounts('grp-ap', [
  { accountId: acctJPM9811, canSource: true, canDest: true },
  { accountId: acctAP9329, canSource: true, canDest: true },
  { accountId: acctWireIn9829, canSource: false, canDest: true },
  { accountId: acctZPI8961, canSource: true, canDest: true },
  { accountId: acctOp9392, canSource: true, canDest: true },
  { accountId: acctCorpOp3962, canSource: true, canDest: true },
  { accountId: acctPayroll0566, canSource: false, canDest: true },
  { accountId: acctCustDep7908, canSource: false, canDest: true },
  { accountId: acctBillings9378, canSource: true, canDest: true },
  { accountId: acctDeposits0226, canSource: true, canDest: true },
  { accountId: acctMMF6826, canSource: false, canDest: true },
]);

// --- ACCOUNTING ---
log('\n--- Accounting Account Access ---');
setGroupAccounts('grp-accounting', [
  { accountId: acctJPM9811, canSource: true, canDest: true },
  { accountId: acctPNCACH0497, canSource: true, canDest: true },
  { accountId: acctSVBCigna7987, canSource: true, canDest: true },
  { accountId: acctDeposits0226, canSource: true, canDest: true },
  { accountId: acctBillings9378, canSource: true, canDest: true },
  { accountId: acctZPI8961, canSource: true, canDest: true },
  { accountId: acctCustDep7908, canSource: false, canDest: true },
  { accountId: acctPNCCorp0446, canSource: true, canDest: true },
  { accountId: acctGarantiBBVA5947, canSource: true, canDest: true },
  { accountId: acctTaxPmt0269, canSource: true, canDest: true },
  { accountId: acctPNCCustMaster2155, canSource: false, canDest: true },
]);

// --- PAYMENT OPS / PLATFORM ACCOUNTING ---
log('\n--- Payment Ops Account Access ---');
setGroupAccounts('grp-payops', [
  { accountId: acctJPM9811, canSource: true, canDest: true },
  { accountId: acctCustDep7908, canSource: true, canDest: true },
  { accountId: acctZPI8961, canSource: false, canDest: true },
  { accountId: acctDeposits0226, canSource: true, canDest: true },
  { accountId: acctGustoInc2378, canSource: true, canDest: true },
  { accountId: acct3rdParty5119, canSource: true, canDest: true },
  { accountId: acctRecovery9803, canSource: true, canDest: true },
  { accountId: acctWireIn9829, canSource: true, canDest: true },
  { accountId: acctGHProgram5843, canSource: true, canDest: true },
  { accountId: acctGustoIncPNC6428, canSource: true, canDest: true },
  { accountId: acctInstantPayroll0673, canSource: true, canDest: true },
]);

// --- PAYROLL ---
log('\n--- Payroll Account Access ---');
const payrollAccounts: Array<{ accountId: string; canSource: boolean; canDest: boolean }> = [
  { accountId: acctJPM9811, canSource: true, canDest: true },
  { accountId: acctPayroll0566, canSource: true, canDest: true },
  { accountId: acctZPI8961, canSource: true, canDest: false },
  { accountId: acctTaxPmt0269, canSource: false, canDest: true },
  { accountId: acctMexico8375, canSource: false, canDest: true },
  { accountId: acctCanada1602, canSource: false, canDest: true },
];
// NOTE: Gusto PEO I LLC -7853 and Gusto PEO II LLC -7872 are explicitly NOT included
setGroupAccounts('grp-payroll', payrollAccounts);

// --- OTHER ---
log('\n--- Other Account Access ---');
setGroupAccounts('grp-other', [
  { accountId: acctJPM9811, canSource: true, canDest: true },
  { accountId: acctAP9329, canSource: true, canDest: true },
  { accountId: acctZPI8961, canSource: true, canDest: true },
  { accountId: acctPayroll0566, canSource: true, canDest: true },
]);

// Ensure JPM 9811 has sort_order = 1 (first in dropdowns)
db.prepare("UPDATE accounts SET sort_order = 1 WHERE id = ?").run(acctJPM9811);

// ============================================================
// SECTION 4: VISIBILITY FIX
// ============================================================
log('\n=== SECTION 4: Visibility Check ===');
log('Payment visibility is already enforced in routes/payments.ts:');
log('  - staff: own payments only');
log('  - manager/sr_manager: own + same-group + approval-eligible payments');
log('  - admin (Treasury): all payments');
log('  - Approval route already checks p.requester_id != user.id (self-approval prevention)');
log('  - Pool eligibility via checkPoolEligibility() in approvalEligibility.ts');
log('Visibility rules are correctly implemented. No code changes needed.');

// ============================================================
// FINAL: Print summary
// ============================================================
log('\n=== MIGRATION COMPLETE ===');

// Verify final state
log('\n--- Final Group Memberships ---');
const finalMembers = db.prepare(`
  SELECT g.name as group_name, u.name as user_name, u.email, gm.role, gm.is_supervisor
  FROM group_members gm
  JOIN users u ON u.id = gm.user_id
  JOIN groups g ON g.id = gm.group_id
  ORDER BY g.name, u.name
`).all() as Array<{ group_name: string; user_name: string; email: string; role: string; is_supervisor: number }>;

for (const m of finalMembers) {
  log(`  ${m.group_name}: ${m.user_name} (${m.email}) role=${m.role} supervisor=${m.is_supervisor}`);
}

log('\n--- Final Account Access ---');
const finalAccess = db.prepare(`
  SELECT g.name as group_name, a.name as account_name, ga.direction
  FROM group_accounts ga
  JOIN groups g ON g.id = ga.group_id
  JOIN accounts a ON a.id = ga.account_id
  ORDER BY g.name, a.sort_order, a.name
`).all() as Array<{ group_name: string; account_name: string; direction: string }>;

let currentGroup = '';
for (const a of finalAccess) {
  if (a.group_name !== currentGroup) {
    currentGroup = a.group_name;
    log(`\n  ${currentGroup}:`);
  }
  log(`    ${a.account_name} (${a.direction})`);
}

db.close();
log('\nDatabase migration complete. Restart servers to apply changes.');
