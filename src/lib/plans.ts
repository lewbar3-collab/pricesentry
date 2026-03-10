export type Plan = 'starter' | 'growth' | 'unlimited'

export const PLAN_LIMITS: Record<Plan, {
  label: string
  competitors: number | null
  products: number | null
  seats: number  // total including owner
  colour: string
  colourDim: string
  colourBorder: string
}> = {
  starter: {
    label: 'Starter',
    competitors: 2,
    products: 10,
    seats: 1,
    colour: 'var(--text-dim)',
    colourDim: 'rgba(140,149,168,0.1)',
    colourBorder: 'rgba(140,149,168,0.2)',
  },
  growth: {
    label: 'Growth',
    competitors: 5,
    products: 50,
    seats: 3,
    colour: 'var(--accent)',
    colourDim: 'var(--accent-dim)',
    colourBorder: 'rgba(0,229,160,0.25)',
  },
  unlimited: {
    label: 'Unlimited',
    competitors: null,
    products: null,
    seats: 999,
    colour: 'var(--purple)',
    colourDim: 'rgba(167,139,250,0.12)',
    colourBorder: 'rgba(167,139,250,0.25)',
  },
}

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[(plan as Plan)] ?? PLAN_LIMITS.starter
}
