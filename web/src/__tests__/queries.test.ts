import { getActiveModules, getCasesByModule, getQuizzesByCase } from '@/lib/queries'

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      upsert: jest.fn(),
    }),
  },
}))

import { supabase } from '@/lib/supabase'

const mockFrom = supabase.from as jest.Mock

function getChain() {
  return mockFrom.mock.results[mockFrom.mock.results.length - 1].value
}

beforeEach(() => {
  jest.clearAllMocks()
  // Reset chain methods to return this by default (for chaining)
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    upsert: jest.fn(),
  }
  mockFrom.mockReturnValue(chain)
})

describe('getActiveModules', () => {
  it('calls supabase.from(modules).select().eq(active, true).order(sort_order)', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)

    await getActiveModules()

    expect(mockFrom).toHaveBeenCalledWith('modules')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('active', true)
    expect(chain.order).toHaveBeenCalledWith('sort_order')
  })

  it('returns empty array when data is null', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockFrom.mockReturnValue(chain)

    const result = await getActiveModules()
    expect(result).toEqual([])
  })

  it('throws when supabase returns an error', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
    }
    mockFrom.mockReturnValue(chain)

    await expect(getActiveModules()).rejects.toThrow('fail')
  })
})

describe('getCasesByModule', () => {
  it('calls supabase.from(cases).select().eq(module_id, moduleId)', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)

    const moduleId = 'module-123'
    await getCasesByModule(moduleId)

    expect(mockFrom).toHaveBeenCalledWith('cases')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('module_id', moduleId)
    expect(chain.order).toHaveBeenCalledWith('case_number')
  })

  it('throws when supabase returns an error', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
    }
    mockFrom.mockReturnValue(chain)

    await expect(getCasesByModule('module-1')).rejects.toThrow('fail')
  })
})

describe('getQuizzesByCase', () => {
  it('calls supabase.from(quizzes).select().eq(case_id, caseId).order(step)', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)

    const caseId = 'case-456'
    await getQuizzesByCase(caseId)

    expect(mockFrom).toHaveBeenCalledWith('quizzes')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('case_id', caseId)
    expect(chain.order).toHaveBeenCalledWith('step')
  })

  it('throws when supabase returns an error', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
    }
    mockFrom.mockReturnValue(chain)

    await expect(getQuizzesByCase('case-1')).rejects.toThrow('fail')
  })
})
