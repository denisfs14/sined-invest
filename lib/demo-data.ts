import { Asset, AssetClass, DividendEvent, Portfolio, StrategySettings } from '@/types';
import { uid } from '@/utils/format';

export const DEMO_PORTFOLIO: Portfolio = {
  id: 'demo-portfolio',
  user_id: 'demo-user',
  name: 'Carteira Principal',
  created_at: new Date().toISOString(),
};

export const DEMO_CLASSES: AssetClass[] = [
  { id: 'cls-acoes',  portfolio_id: 'demo-portfolio', name: 'Ações BR',       target_percentage: 40, contribution_percentage: 40, top_n: 2 },
  { id: 'cls-fiis',   portfolio_id: 'demo-portfolio', name: 'FIIs',           target_percentage: 30, contribution_percentage: 30, top_n: 2 },
  { id: 'cls-inter',  portfolio_id: 'demo-portfolio', name: 'Internacional',  target_percentage: 20, contribution_percentage: 20, top_n: 1 },
  { id: 'cls-rf',     portfolio_id: 'demo-portfolio', name: 'Renda Fixa',     target_percentage: 10, contribution_percentage: 10, top_n: 1 },
];

export const DEMO_ASSETS: Asset[] = [
  { id: 'a1',  portfolio_id: 'demo-portfolio', asset_class_id: 'cls-acoes', ticker: 'PETR4',  name: 'Petrobras PN',         target_percentage: 10, max_percentage: 15, current_price: 38.50,  is_red: true,  active: true },
  { id: 'a2',  portfolio_id: 'demo-portfolio', asset_class_id: 'cls-acoes', ticker: 'VALE3',  name: 'Vale ON',              target_percentage: 10, max_percentage: 15, current_price: 62.30,  is_red: false, active: true },
  { id: 'a3',  portfolio_id: 'demo-portfolio', asset_class_id: 'cls-acoes', ticker: 'ITUB4',  name: 'Itaú Unibanco PN',    target_percentage: 10, max_percentage: 15, current_price: 33.80,  is_red: false, active: true },
  { id: 'a4',  portfolio_id: 'demo-portfolio', asset_class_id: 'cls-acoes', ticker: 'BBAS3',  name: 'Banco do Brasil ON',   target_percentage: 10, max_percentage: 15, current_price: 25.60,  is_red: true,  active: true },
  { id: 'a5',  portfolio_id: 'demo-portfolio', asset_class_id: 'cls-fiis',  ticker: 'MXRF11', name: 'Maxi Renda FII',      target_percentage: 10, max_percentage: 15, current_price: 10.20,  is_red: false, active: true },
  { id: 'a6',  portfolio_id: 'demo-portfolio', asset_class_id: 'cls-fiis',  ticker: 'XPLG11', name: 'XP Log FII',          target_percentage: 10, max_percentage: 15, current_price: 96.50,  is_red: true,  active: true },
  { id: 'a7',  portfolio_id: 'demo-portfolio', asset_class_id: 'cls-fiis',  ticker: 'KNRI11', name: 'Kinea Renda Imob.',   target_percentage: 10, max_percentage: 15, current_price: 142.30, is_red: false, active: true },
  { id: 'a8',  portfolio_id: 'demo-portfolio', asset_class_id: 'cls-inter', ticker: 'IVVB11', name: 'iShares S&P 500',     target_percentage: 10, max_percentage: 20, current_price: 285.40, is_red: false, active: true },
  { id: 'a9',  portfolio_id: 'demo-portfolio', asset_class_id: 'cls-inter', ticker: 'BOVA11', name: 'iShares Ibovespa',    target_percentage: 10, max_percentage: 20, current_price: 112.80, is_red: false, active: true },
  { id: 'a10', portfolio_id: 'demo-portfolio', asset_class_id: 'cls-rf',    ticker: 'FIXA11', name: 'Tesouro IPCA+ ETF',  target_percentage: 10, max_percentage: 20, current_price: 98.40,  is_red: false, active: true },
];

export const DEMO_HOLDINGS: Record<string, { quantity: number; avg_price: number }> = {
  a1:  { quantity: 200, avg_price: 35.20  },
  a2:  { quantity: 150, avg_price: 68.10  },
  a3:  { quantity: 300, avg_price: 30.50  },
  a4:  { quantity: 180, avg_price: 23.80  },
  a5:  { quantity: 500, avg_price: 9.95   },
  a6:  { quantity: 50,  avg_price: 102.00 },
  a7:  { quantity: 30,  avg_price: 148.50 },
  a8:  { quantity: 20,  avg_price: 270.00 },
  a9:  { quantity: 40,  avg_price: 118.20 },
  a10: { quantity: 50,  avg_price: 95.10  },
};

export const DEMO_STRATEGY: StrategySettings = {
  id: 'strat-demo',
  portfolio_id: 'demo-portfolio',
  top_n: 3,
  max_percentage: 15,
  prioritize_red: true,
  fallback_to_lowest: true,
  round_shares: true,
  contribution_timing_mode: 'after_last_payment',
};

// Demo dividend events — this month
const now = new Date();
const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

export const DEMO_DIVIDENDS: DividendEvent[] = [
  {
    id: 'd1', asset_id: 'a5', portfolio_id: 'demo-portfolio',
    ex_date:       `${thisMonthStr}-08`,
    payment_date:  `${thisMonthStr}-12`,
    expected_amount: 250.00, received_amount: 250.00, status: 'received',
    asset: DEMO_ASSETS.find(a => a.id === 'a5'),
  },
  {
    id: 'd2', asset_id: 'a6', portfolio_id: 'demo-portfolio',
    ex_date:       `${thisMonthStr}-14`,
    payment_date:  `${thisMonthStr}-18`,
    expected_amount: 180.00, received_amount: 180.00, status: 'received',
    asset: DEMO_ASSETS.find(a => a.id === 'a6'),
  },
  {
    id: 'd3', asset_id: 'a7', portfolio_id: 'demo-portfolio',
    ex_date:       `${thisMonthStr}-20`,
    payment_date:  `${thisMonthStr}-${String(Math.min(25, lastDay)).padStart(2, '0')}`,
    expected_amount: 320.00, received_amount: 0, status: 'expected',
    asset: DEMO_ASSETS.find(a => a.id === 'a7'),
  },
  {
    id: 'd4', asset_id: 'a1', portfolio_id: 'demo-portfolio',
    ex_date:       `${thisMonthStr}-22`,
    payment_date:  `${thisMonthStr}-${String(Math.min(28, lastDay)).padStart(2, '0')}`,
    expected_amount: 560.00, received_amount: 0, status: 'pending',
    asset: DEMO_ASSETS.find(a => a.id === 'a1'),
  },
];
