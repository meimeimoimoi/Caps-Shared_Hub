import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../src/', import.meta.url))

function load(relative, mocks) {
  const filename = path.join(root, relative)
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, {
    filename,
  })(
    (specifier) => (specifier in mocks ? mocks[specifier] : require(specifier)),
    module,
    module.exports
  )
  return module.exports
}

class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

const i18n = { t: (key) => `t:${key}` }

function billing(relative, api) {
  return load(relative, {
    '@/lib/api-client': { api, ApiError },
    '@/lib/i18n': { i18n },
    '@/lib/expert-data-source': { isExpertDemo: false },
    '../constants': { MAX_ACCOUNTS: 5 },
  })
}

test('top-up posts the amount to PayOS and polls the status by payment id', async () => {
  const calls = []
  const { createTopup, getTopupStatus } = billing(
    'features/credits/api/creditsApi.ts',
    {
      post: async (url, body) => {
        calls.push(['post', url, body])
        return { data: { paymentId: 'p 1' } }
      },
      get: async (url) => {
        calls.push(['get', url])
        return { data: { status: 'SUCCEEDED' } }
      },
    }
  )
  assert.equal((await createTopup(100_000)).paymentId, 'p 1')
  assert.equal((await getTopupStatus('p 1')).status, 'SUCCEEDED')
  assert.deepEqual(calls, [
    ['post', '/api/v1/billing/payos/create-topup', { amount: 100_000 }],
    ['get', '/api/v1/billing/payos/topups/p%201'],
  ])
})

test('top-up translates known billing errors and keeps unknown ones', async () => {
  let error = new ApiError('busy', 409, 'PAYMENT_CONFLICT')
  const { createTopup } = billing('features/credits/api/creditsApi.ts', {
    post: async () => {
      throw error
    },
  })
  await assert.rejects(createTopup(100_000), {
    message: 't:wallet.topup.conflict',
    status: 409,
    code: 'PAYMENT_CONFLICT',
  })
  error = new ApiError('server says no', 400, 'SOMETHING_ELSE')
  await assert.rejects(createTopup(100_000), { message: 'server says no' })
})

test('bank accounts list, add and remove through billing', async () => {
  const calls = []
  const reply =
    (method) =>
    async (url, body) => {
      calls.push(method === 'post' ? [method, url, body] : [method, url])
      return { data: [] }
    }
  const { listBankAccounts, addBankAccount, removeBankAccount } = billing(
    'features/bank-accounts/api/bankAccountsApi.ts',
    { get: reply('get'), post: reply('post'), del: reply('del') }
  )
  const input = { bankBin: '970422', accountNumber: '123' }
  await listBankAccounts()
  await addBankAccount(input)
  await removeBankAccount('a/1')
  assert.deepEqual(calls, [
    ['get', '/api/v1/billing/bank-accounts'],
    ['post', '/api/v1/billing/bank-accounts', input],
    ['del', '/api/v1/billing/bank-accounts/a%2F1'],
  ])
})

test('bank account errors become the form message', async () => {
  const { addBankAccount } = billing(
    'features/bank-accounts/api/bankAccountsApi.ts',
    {
      post: async () => {
        throw new ApiError('dup', 409, 'BANK_ACCOUNT_DUPLICATE')
      },
    }
  )
  await assert.rejects(addBankAccount({}), {
    message: 't:bankAccounts.duplicate',
  })
})

test('payouts send the status filter only when one is chosen', async () => {
  const params = []
  const { getPayouts } = billing('features/disputes-escrow/api/payoutsApi.ts', {
    get: async (url, options) => {
      assert.equal(url, '/api/v1/admin/billing/payouts')
      params.push(options.params)
      return { data: { items: [], total: 0 } }
    },
  })
  await getPayouts({ status: null }, 1)
  await getPayouts(
    {
      status: 'PENDING',
      recipientUserId: 'u1',
      fromDay: '2026-11-01',
      toDay: '2026-11-30',
      minAmount: 100000,
    },
    2
  )
  const none = {
    recipientUserId: undefined,
    from: undefined,
    to: undefined,
    minAmount: undefined,
    maxAmount: undefined,
  }
  assert.deepEqual(params, [
    { status: undefined, page: 1, pageSize: 20, ...none },
    {
      status: 'PENDING',
      page: 2,
      pageSize: 20,
      ...none,
      recipientUserId: 'u1',
      // Vietnam days: the "to" day is included up to its midnight
      from: '2026-11-01T00:00:00+07:00',
      to: '2026-12-01T00:00:00+07:00',
      minAmount: 100000,
    },
  ])
})

test('payout transfer and refresh post to the payout and return it', async () => {
  const calls = []
  const { transferPayout, refreshPayout } = billing(
    'features/disputes-escrow/api/payoutsApi.ts',
    {
      post: async (url) => {
        calls.push(url)
        return { data: { id: 'p/1', status: 'PROCESSING' } }
      },
    }
  )
  assert.equal((await transferPayout('p/1')).status, 'PROCESSING')
  await refreshPayout('p/1')
  assert.deepEqual(calls, [
    '/api/v1/admin/billing/payouts/p%2F1/transfer',
    '/api/v1/admin/billing/payouts/p%2F1/refresh',
  ])
})

test('payout errors become staff messages; unknown codes keep the server text', async () => {
  const failing = (code) =>
    billing('features/disputes-escrow/api/payoutsApi.ts', {
      post: async () => {
        throw new ApiError('server text', 409, code)
      },
    })
  await assert.rejects(failing('PAYOUT_NO_BANK_ACCOUNT').transferPayout('p'), {
    message: 't:payouts.errors.noAccount',
  })
  await assert.rejects(failing('PAYMENT_UNAVAILABLE').refreshPayout('p'), {
    message: 't:payouts.errors.unavailable',
  })
  await assert.rejects(failing('SOMETHING_ELSE').transferPayout('p'), {
    message: 'server text',
  })
})

test('bank review lists by status and posts verify and reject with the reason', async () => {
  const calls = []
  const { getBankAccountsForReview, verifyBankAccount, rejectBankAccount } =
    billing('features/disputes-escrow/api/bankReviewApi.ts', {
      get: async (url, options) => {
        calls.push(['get', url, options.params])
        return { data: { items: [], total: 0 } }
      },
      post: async (url, body) => {
        calls.push(['post', url, body])
        return { data: { id: 'a/1', status: 'VERIFIED' } }
      },
    })
  await getBankAccountsForReview('UNVERIFIED', 1)
  await verifyBankAccount('a/1')
  await rejectBankAccount('a/1', 'Tên không khớp')
  assert.deepEqual(calls, [
    [
      'get',
      '/api/v1/admin/billing/bank-accounts',
      { status: 'UNVERIFIED', page: 1, pageSize: 20 },
    ],
    ['post', '/api/v1/admin/billing/bank-accounts/a%2F1/verify', undefined],
    [
      'post',
      '/api/v1/admin/billing/bank-accounts/a%2F1/reject',
      { reason: 'Tên không khớp' },
    ],
  ])
})

test('expert names are keyed by account id, with their risk signals', async () => {
  const { getExpertNames } = billing(
    'features/disputes-escrow/api/bankReviewApi.ts',
    {
      get: async (url) => {
        assert.equal(url, '/api/v1/admin/experts/managed')
        return {
          data: [
            { expertUserId: 'u1', displayName: 'Nguyễn Văn A', email: 'a@x.vn', status: 'SUSPENDED', accountStatus: 'SUSPENDED', violationPoints: 6 },
            { expertUserId: 'u1', displayName: 'Nguyễn Văn A', email: 'a@x.vn', status: 'APPROVED_FOR_SERVICE', accountStatus: 'SUSPENDED', violationPoints: 6 },
            { expertUserId: 'u2', displayName: 'Trần B', email: 'b@x.vn', status: 'APPROVED_FOR_SERVICE' },
          ],
        }
      },
    }
  )
  const names = await getExpertNames()
  assert.equal(names.size, 2)
  // One suspended service is enough to flag the expert, whatever order the rows come in
  assert.deepEqual(names.get('u1'), {
    name: 'Nguyễn Văn A',
    email: 'a@x.vn',
    accountStatus: 'SUSPENDED',
    violationPoints: 6,
    serviceSuspended: true,
  })
  assert.deepEqual(names.get('u2'), {
    name: 'Trần B',
    email: 'b@x.vn',
    accountStatus: null,
    violationPoints: 0,
    serviceSuspended: false,
  })
})

test('bank review errors become staff messages', async () => {
  const { verifyBankAccount } = billing(
    'features/disputes-escrow/api/bankReviewApi.ts',
    {
      post: async () => {
        throw new ApiError('self', 403, 'BANK_ACCOUNT_SELF_REVIEW')
      },
    }
  )
  await assert.rejects(verifyBankAccount('a'), {
    message: 't:bankReview.errors.selfReview',
  })
})
