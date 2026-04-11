import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PollCard from '../../components/PollCard'
import type { Poll } from '../../types/poll'

// ─── Mocks ────────────────────────────────────────────────────
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))
vi.mock('../../hooks/usePolls', () => ({
  useVote: vi.fn(),
}))

import { useAuthStore } from '../../stores/authStore'
import { useVote } from '../../hooks/usePolls'

const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseVote = vi.mocked(useVote)

// ─── Helpers ──────────────────────────────────────────────────
function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderCard(poll: Poll) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <PollCard poll={poll} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const future = new Date(Date.now() + 60_000).toISOString()
const past = new Date(Date.now() - 60_000).toISOString()

const basePoll: Poll = {
  id: 1,
  question: 'Pizza or Burger?',
  durationSeconds: 300,
  createdAt: past,
  expiresAt: future,
  status: 'Active',
  aiStatus: 'Pending',
  creatorId: 1,
  creatorEmail: 'alice@test.com',
  isCreator: false,
  hasVoted: false,
  votedOptionId: null,
  totalVotes: 0,
  options: [
    { id: 1, text: 'Pizza', displayOrder: 0, voteCount: 0 },
    { id: 2, text: 'Burger', displayOrder: 1, voteCount: 0 },
  ],
  aiChoiceOptionId: null,
  aiExplanation: null,
}

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockUseVote.mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as any)
})

// ─── Tests ────────────────────────────────────────────────────

describe('PollCard — collapsed state', () => {
  it('shows the poll question', () => {
    mockUseAuthStore.mockReturnValue(null)
    renderCard(basePoll)
    expect(screen.getByText('Pizza or Burger?')).toBeInTheDocument()
  })

  it('shows both option chips', () => {
    mockUseAuthStore.mockReturnValue(null)
    renderCard(basePoll)
    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(screen.getByText('Burger')).toBeInTheDocument()
  })

  it('shows vote count', () => {
    mockUseAuthStore.mockReturnValue(null)
    renderCard(basePoll)
    expect(screen.getByText('0 votes')).toBeInTheDocument()
  })

  it('shows creator email', () => {
    mockUseAuthStore.mockReturnValue(null)
    renderCard(basePoll)
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
  })
})

describe('PollCard — expanded: guest (not logged in)', () => {
  it('shows login prompt when expanded', async () => {
    mockUseAuthStore.mockReturnValue(null)
    renderCard(basePoll)
    await userEvent.click(screen.getByRole('button', { name: /more/i }))
    expect(screen.getByText(/log in/i)).toBeInTheDocument()
    expect(screen.getByText(/to vote on this poll/i)).toBeInTheDocument()
  })

  it('does not show vote buttons for guests', async () => {
    mockUseAuthStore.mockReturnValue(null)
    renderCard(basePoll)
    await userEvent.click(screen.getByRole('button', { name: /more/i }))
    expect(screen.queryByRole('button', { name: 'Pizza' })).not.toBeInTheDocument()
  })
})

describe('PollCard — expanded: logged-in, not voted', () => {
  it('shows vote buttons', async () => {
    mockUseAuthStore.mockReturnValue({ id: 2, email: 'bob@test.com' })
    renderCard(basePoll)
    await userEvent.click(screen.getByRole('button', { name: /more/i }))
    expect(screen.getByRole('button', { name: 'Pizza' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Burger' })).toBeInTheDocument()
  })

  it('calls vote.mutate with the correct optionId', async () => {
    const mutate = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseVote.mockReturnValue({ mutate, isPending: false, isError: false } as any)
    mockUseAuthStore.mockReturnValue({ id: 2, email: 'bob@test.com' })
    renderCard(basePoll)
    await userEvent.click(screen.getByRole('button', { name: /more/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Pizza' }))
    expect(mutate).toHaveBeenCalledWith(1) // optionId of Pizza
  })
})

describe('PollCard — expanded: creator', () => {
  it('shows "you created this" message instead of vote buttons', async () => {
    mockUseAuthStore.mockReturnValue({ id: 1, email: 'alice@test.com' })
    renderCard({ ...basePoll, isCreator: true })
    await userEvent.click(screen.getByRole('button', { name: /more/i }))
    expect(screen.getByText(/you created this poll/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pizza' })).not.toBeInTheDocument()
  })
})

describe('PollCard — expanded: already voted', () => {
  it('shows voted confirmation message', async () => {
    mockUseAuthStore.mockReturnValue({ id: 2, email: 'bob@test.com' })
    renderCard({
      ...basePoll,
      hasVoted: true,
      votedOptionId: 1,
      totalVotes: 1,
      options: [
        { id: 1, text: 'Pizza', displayOrder: 0, voteCount: 1 },
        { id: 2, text: 'Burger', displayOrder: 1, voteCount: 0 },
      ],
    })
    await userEvent.click(screen.getByRole('button', { name: /more/i }))
    expect(screen.getByText(/you voted for/i)).toBeInTheDocument()
    expect(screen.getAllByText('Pizza').length).toBeGreaterThan(0)
  })
})

describe('PollCard — expired + AI Complete', () => {
  it('shows Human vs AI panel', async () => {
    mockUseAuthStore.mockReturnValue(null)
    renderCard({
      ...basePoll,
      status: 'Expired',
      expiresAt: past,
      aiStatus: 'Complete',
      aiChoiceOptionId: 1,
      aiExplanation: 'Pizza is universally loved and versatile.',
      totalVotes: 3,
      options: [
        { id: 1, text: 'Pizza', displayOrder: 0, voteCount: 2 },
        { id: 2, text: 'Burger', displayOrder: 1, voteCount: 1 },
      ],
    })
    await userEvent.click(screen.getByRole('button', { name: /more/i }))
    expect(screen.getByText('👥 Human votes')).toBeInTheDocument()
    expect(screen.getByText("🤖 AI's take")).toBeInTheDocument()
    expect(screen.getByText(/pizza is universally loved/i)).toBeInTheDocument()
  })

  it('shows "Expired" badge when poll is expired', () => {
    mockUseAuthStore.mockReturnValue(null)
    renderCard({ ...basePoll, status: 'Expired', expiresAt: past })
    expect(screen.getByText('Ended')).toBeInTheDocument()
  })
})

describe('PollCard — expired + AI Pending', () => {
  it('shows waiting message', async () => {
    mockUseAuthStore.mockReturnValue(null)
    renderCard({ ...basePoll, status: 'Expired', expiresAt: past, aiStatus: 'Pending' })
    await userEvent.click(screen.getByRole('button', { name: /more/i }))
    expect(screen.getByText(/waiting for ai/i)).toBeInTheDocument()
  })
})

describe('PollCard — expired + AI Failed', () => {
  it('shows error message', async () => {
    mockUseAuthStore.mockReturnValue(null)
    renderCard({ ...basePoll, status: 'Expired', expiresAt: past, aiStatus: 'Failed' })
    await userEvent.click(screen.getByRole('button', { name: /more/i }))
    expect(screen.getByText(/ai couldn't give an opinion/i)).toBeInTheDocument()
  })
})
