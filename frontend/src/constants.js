import { CupSoda, Coffee, Cookie, Sandwich } from 'lucide-react'

// Same products and prices as vending_machine.v
export const PRODUCTS = [
  { code: 'A', name: 'Cola', price: 10, Icon: CupSoda },
  { code: 'B', name: 'Coffee', price: 15, Icon: Coffee },
  { code: 'C', name: 'Cookies', price: 20, Icon: Cookie },
  { code: 'D', name: 'Sandwich', price: 25, Icon: Sandwich },
]

// coin value -> 2-bit code used in Verilog
export const COINS = [
  { value: 5, code: '01' },
  { value: 10, code: '10' },
  { value: 20, code: '11' },
]

// State encoding from vending_machine.v
export const STATES = ['IDLE', 'WAIT_COIN', 'DISPENSE', 'CHANGE', 'REFUND']
export const S = { IDLE: 0, WAIT_COIN: 1, DISPENSE: 2, CHANGE: 3, REFUND: 4 }

// Outputs right after reset (before any action)
export const RESET_ROW = {
  cycle: -1,
  inputs: { selValid: 0, sel: 0, coin: 0, cancel: 0 },
  state: 0, amount: 0, price: 0, item: 0, dispense: 0, change: 0, refund: 0,
  soldOut: 0, totalSales: 0, stock: [3, 3, 3, 3],
}

export const COIN_VALUE = [0, 5, 10, 20]
