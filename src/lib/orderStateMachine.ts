export type OrderStatus = 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export interface OrderState {
  status: OrderStatus;
  label: string;
  colorClass: string;
  availableActions: { label: string; action: string; nextStatus: OrderStatus; style: string }[];
}

export const OrderStateMachine: Record<OrderStatus, OrderState> = {
  pending: {
    status: 'pending',
    label: 'Pending',
    colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    availableActions: [
      { label: 'Approve', action: 'approve', nextStatus: 'approved', style: 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' },
      { label: 'Cancel', action: 'cancel', nextStatus: 'cancelled', style: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' }
    ]
  },
  approved: {
    status: 'approved',
    label: 'Approved',
    colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    availableActions: [
      { label: 'Ship', action: 'ship', nextStatus: 'shipped', style: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20' }
    ]
  },
  shipped: {
    status: 'shipped',
    label: 'Shipped',
    colorClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    availableActions: [
      { label: 'Deliver', action: 'deliver', nextStatus: 'delivered', style: 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' },
      { label: 'Return', action: 'return', nextStatus: 'returned', style: 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20' }
    ]
  },
  delivered: {
    status: 'delivered',
    label: 'Delivered',
    colorClass: 'bg-green-500/10 text-green-400 border-green-500/20',
    availableActions: [
      { label: 'Return', action: 'return', nextStatus: 'returned', style: 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20' }
    ]
  },
  cancelled: {
    status: 'cancelled',
    label: 'Cancelled',
    colorClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    availableActions: []
  },
  returned: {
    status: 'returned',
    label: 'Returned',
    colorClass: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    availableActions: []
  }
};
