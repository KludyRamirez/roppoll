import { test, expect } from '@playwright/test'

// Shared state — set once in beforeAll, used by all tests
const s = {
  suffix: 0,
  aliceEmail: '',
  bobEmail: '',
  password: 'Test123!',
  pollQuestion: '',
}

test.describe('Propl', () => {
  test.beforeAll(async ({ request }) => {
    s.suffix = Date.now()
    s.aliceEmail = `alice.e2e.${s.suffix}@test.com`
    s.bobEmail = `bob.e2e.${s.suffix}@test.com`
    s.pollQuestion = `E2E ${s.suffix}: Cats or Dogs?`

    // Register both users via API upfront — faster than browser-based setup
    await request.post('http://localhost:5001/api/auth/register', {
      data: { email: s.aliceEmail, password: s.password },
    })
    await request.post('http://localhost:5001/api/auth/register', {
      data: { email: s.bobEmail, password: s.password },
    })

    // Create the poll via API so voting/feed tests have it regardless of test order
    const loginResp = await request.post('http://localhost:5001/api/auth/login', {
      data: { email: s.aliceEmail, password: s.password },
    })
    const { accessToken } = await loginResp.json()
    await request.post('http://localhost:5001/api/polls', {
      data: { question: s.pollQuestion, optionA: 'Cats', optionB: 'Dogs', durationSeconds: 300 },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  })

  // ─── Auth ───────────────────────────────────────────────────

  test('login with correct credentials redirects to feed', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(s.aliceEmail)
    await page.getByLabel('Password').fill(s.password)
    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page).toHaveURL('/', { timeout: 10_000 })
    await expect(page.getByText(s.aliceEmail)).toBeVisible()
  })

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(s.aliceEmail)
    await page.getByLabel('Password').fill('WrongPass!')
    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL('/login')
  })

  test('session persists after page reload', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(s.aliceEmail)
    await page.getByLabel('Password').fill(s.password)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL('/', { timeout: 10_000 })

    await page.reload()
    await expect(page.getByText(s.aliceEmail)).toBeVisible({ timeout: 10_000 })
  })

  test('unauthenticated user is redirected from /polls/new to /login', async ({ page }) => {
    await page.goto('/polls/new')
    await expect(page).toHaveURL('/login', { timeout: 10_000 })
  })

  // ─── Poll creation ──────────────────────────────────────────

  test('alice can create a poll', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(s.aliceEmail)
    await page.getByLabel('Password').fill(s.password)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL('/', { timeout: 10_000 })

    // Expand the inline composer and create a second poll to test the UI
    const uiQuestion = `${s.pollQuestion} (UI)`
    await page.getByText('Ask a question...').click()
    await page.getByPlaceholder('Ask a question...').fill(uiQuestion)
    await page.getByPlaceholder('Option A').fill('Cats')
    await page.getByPlaceholder('Option B').fill('Dogs')
    await page.getByRole('button', { name: 'Post' }).click()

    await expect(page.getByText(uiQuestion)).toBeVisible({ timeout: 10_000 })
  })

  // ─── Voting ─────────────────────────────────────────────────

  test('creator cannot vote on their own poll', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(s.aliceEmail)
    await page.getByLabel('Password').fill(s.password)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL('/', { timeout: 10_000 })

    await page.getByText(s.pollQuestion).click()
    await expect(page.getByText(/you created this poll/i)).toBeVisible()
  })

  test('guest sees login prompt instead of vote buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(s.pollQuestion)).toBeVisible({ timeout: 10_000 })
    await page.getByText(s.pollQuestion).click()
    await expect(page.getByText(/to vote on this poll/i)).toBeVisible()
  })

  test('bob can vote on the poll', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(s.bobEmail)
    await page.getByLabel('Password').fill(s.password)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL('/', { timeout: 10_000 })

    await page.getByText(s.pollQuestion).click()
    await page.getByRole('button', { name: 'Cats' }).click()

    await expect(page.getByText(/you voted for/i)).toBeVisible({ timeout: 10_000 })
  })

  test('bob cannot vote twice', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(s.bobEmail)
    await page.getByLabel('Password').fill(s.password)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL('/', { timeout: 10_000 })

    await page.getByText(s.pollQuestion).click()
    // Already voted — buttons should not appear
    await expect(page.getByText(/you voted for/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cats' })).not.toBeVisible()
  })

  // ─── Feed ───────────────────────────────────────────────────

  test('feed shows polls to unauthenticated users', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(s.pollQuestion)).toBeVisible({ timeout: 10_000 })
  })

  test('feed shows vote counts', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(s.pollQuestion)).toBeVisible({ timeout: 10_000 })
    // Bob voted, total is 1
    await expect(page.getByText('1 vote').first()).toBeVisible()
  })
})
