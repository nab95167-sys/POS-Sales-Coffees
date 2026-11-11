import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, Tag,
  CreditCard, ArrowRightLeft, PauseCircle, Coffee, Barcode,
  Sparkles, Lock, BookOpen, AlertTriangle, Package, QrCode, Gift, Cpu,
  ShieldCheck, KeyRound, FileSpreadsheet, Wallet, Megaphone,
  History, Layers, ChevronDown, X, LayoutGrid, Rows3, FileText
} from 'lucide-react';
import { Product, CartItem, Order, OrderType, PaymentMethod, DiningTable, SplitPayment, StoreSettings } from '../types';
import { VariantToppingModal } from '../components/pos/VariantToppingModal';
import { PaymentModal } from '../components/pos/PaymentModal';
import { ThermalReceiptModal } from '../components/pos/ThermalReceiptModal';
import { HoldOrderModal, HeldOrder } from '../components/pos/HoldOrderModal';
import { SplitBillModal } from '../components/pos/SplitBillModal';
import { CashDrawerModal } from '../components/pos/CashDrawerModal';
import { AiForecastModal } from '../components/analytics/AiForecastModal';
import { RecipeModal } from '../components/products/RecipeModal';
import { QrSelfOrderModal } from '../components/pos/QrSelfOrderModal';
import { GiftCardWalletModal } from '../components/pos/GiftCardWalletModal';
import { AiBaristaModal } from '../components/analytics/AiBaristaModal';
import { ManagerPinModal } from '../components/pos/ManagerPinModal';
import { PosScreenLockModal } from '../components/pos/PosScreenLockModal';
import { SecurityAuditModal } from '../components/pos/SecurityAuditModal';
import { ZReportModal } from '../components/pos/ZReportModal';
import { XReportModal } from '../components/pos/XReportModal';
import { CupLabelModal } from '../components/pos/CupLabelModal';
import { OrderHistoryModal } from '../components/pos/OrderHistoryModal';
import { TablePickerModal } from '../components/tables/TablePickerModal';
import { PettyCashModal } from '../components/finance/PettyCashModal';
import { PromotionManagerModal } from '../components/promotions/PromotionManagerModal';
import { BroadcastModal } from '../components/ui/BroadcastModal';
import { BroadcastBanner } from '../components/ui/BroadcastBanner';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';
import { createOrderApi } from '../services/orderService';
import { showToastNotification } from '../services/telegramBotService';
import { soundEffects } from '../services/soundService';
import { logSecurityEvent } from '../services/securityAuditService';
import { apiFetch } from '../services/api';

export const PosPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { products, categories } = useProducts();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>('cat-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [compactGrid, setCompactGrid] = useState<boolean>(false);
  const [mobileCartOpen, setMobileCartOpen] = useState<boolean>(false);

  // Store authoritative tax & KHR rate
  const [taxRate, setTaxRate] = useState<number>(10);
  const [khrExchangeRate, setKhrExchangeRate] = useState<number>(4100);

  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedPromotionId, setAppliedPromotionId] = useState<string | undefined>(undefined);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [lastScannedItem, setLastScannedItem] = useState<string | null>(null);

  // Security & Lock State
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [showSecurityAuditModal, setShowSecurityAuditModal] = useState(false);
  const [managerPinAction, setManagerPinAction] = useState<{
    title: string;
    details: string;
    onApproved: (overrideToken?: string) => void;
  } | null>(null);

  // Table & Handover & Orders State
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [showTablePickerModal, setShowTablePickerModal] = useState(false);
  const [showOrderHistoryModal, setShowOrderHistoryModal] = useState(false);
  const [showXReportModal, setShowXReportModal] = useState(false);
  const [cupLabelOrder, setCupLabelOrder] = useState<Order | null>(null);

  // Modals State
  const [customizeProduct, setCustomizeProduct] = useState<Product | null>(null);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);
  const [outOfStockProduct, setOutOfStockProduct] = useState<Product | null>(null);
  const [activePaymentOrder, setActivePaymentOrder] = useState<Order | null>(null);
  const [completedReceiptOrder, setCompletedReceiptOrder] = useState<Order | null>(null);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showCashDrawerModal, setShowCashDrawerModal] = useState(false);
  const [showAiForecastModal, setShowAiForecastModal] = useState(false);
  const [showQrSelfOrderModal, setShowQrSelfOrderModal] = useState(false);
  const [showGiftCardWalletModal, setShowGiftCardWalletModal] = useState(false);
  const [showAiBaristaModal, setShowAiBaristaModal] = useState(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [showZReportModal, setShowZReportModal] = useState(false);
  const [showPettyCashModal, setShowPettyCashModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showTerminalMenu, setShowTerminalMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  const terminalMenuRef = useRef<HTMLDivElement | null>(null);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    apiFetch<{ settings: StoreSettings }>('/api/v1/settings')
      .then((res) => {
        setTaxRate(res.settings.taxRate);
        setKhrExchangeRate(res.settings.khrExchangeRate);
      })
      .catch(() => {});
  }, []);

  // Pre-select Dining Table when navigated from FloorPlan
  useEffect(() => {
    const navState = location.state as { selectedTable?: DiningTable } | null;
    if (navState?.selectedTable) {
      setOrderType('DINE_IN');
      setSelectedTable(navState.selectedTable);
      showToastNotification(`Attached ${navState.selectedTable.name} to ticket`, 'info');
      navigate('/pos', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  // Close dropdown menus cleanly on outside click or Escape
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (terminalMenuRef.current && !terminalMenuRef.current.contains(target)) {
        setShowTerminalMenu(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setShowToolsMenu(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTerminalMenu(false);
        setShowToolsMenu(false);
        setMobileCartOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'cat-1' || p.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const handleProductClick = (product: Product) => {
    if (!product.isAvailable) {
      setOutOfStockProduct(product);
      return;
    }

    if (product.variants.length > 0 || product.toppings.length > 0) {
      setCustomizeProduct(product);
    } else {
      const item: CartItem = {
        cartItemId: `${product.id}-default-${Date.now()}`,
        productId: product.id,
        name: product.name,
        image: product.image,
        selectedToppings: [],
        unitPrice: Number(product.sellingPrice),
        quantity: 1,
        itemSubtotal: Number(product.sellingPrice),
      };
      addToCart(item);
    }
  };

  // Global USB Barcode Scanner Listener
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 150) {
        barcodeBuffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.trim().length >= 3) {
          const scannedCode = barcodeBuffer.trim();
          const matched = products.find(
            (p) =>
              p.barcode.toLowerCase() === scannedCode.toLowerCase() ||
              p.sku.toLowerCase() === scannedCode.toLowerCase()
          );

          if (matched) {
            handleProductClick(matched);
            soundEffects.playBeep();
            setLastScannedItem(`${matched.name} (${scannedCode})`);
            setTimeout(() => setLastScannedItem(null), 3200);
          } else {
            showToastNotification(`Barcode / SKU "${scannedCode}" not found in catalog.`, 'warning');
          }
          barcodeBuffer = '';
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  const addToCart = (item: CartItem) => {
    soundEffects.playBeep();
    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.cartItemId === item.cartItemId);
      if (existingIdx > -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = existing.quantity + item.quantity;
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          itemSubtotal: existing.unitPrice * newQty,
        };
        return updated;
      }
      return [...prev, item];
    });
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    soundEffects.playBeep();
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              itemSubtotal: item.unitPrice * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const toggleItemNote = (cartItemId: string, noteText: string) => {
    soundEffects.playBeep();
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const currentNotes = item.notes ? item.notes.split(', ') : [];
          const exists = currentNotes.includes(noteText);
          const newNotes = exists
            ? currentNotes.filter((n) => n !== noteText)
            : [...currentNotes, noteText];
          return {
            ...item,
            notes: newNotes.length > 0 ? newNotes.join(', ') : undefined,
          };
        }
        return item;
      })
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.itemSubtotal, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableSubtotal * (taxRate / 100);
  const totalAmount = taxableSubtotal + taxAmount;
  const totalUnitCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleRequestVoidCart = () => {
    if (cart.length === 0) return;
    setManagerPinAction({
      title: 'Void Entire Cart',
      details: `Clear all ${cart.length} items from register (Subtotal: $${subtotal.toFixed(2)})`,
      onApproved: (overrideToken) => {
        setCart([]);
        setDiscountPercent(0);
        setCouponCode('');
        setAppliedPromotionId(undefined);
        soundEffects.playBeep();
        void logSecurityEvent(
          'CART_VOID',
          'Cart Voided',
          `Cleared ${cart.length} items ($${subtotal.toFixed(2)})`,
          user?.name || 'Cashier',
          overrideToken
        );
        showToastNotification('Cart voided by manager authorization.', 'success');
      },
    });
  };

  const handleOpenCashDrawerNoSale = () => {
    setManagerPinAction({
      title: 'Open Cash Drawer (No Sale)',
      details: 'Manual drawer kick for physical cash count or change exchange',
      onApproved: (overrideToken) => {
        soundEffects.playCashRegister();
        void logSecurityEvent(
          'DRAWER_KICK',
          'Cash Drawer Opened (No Sale)',
          'Manual drawer kick approved via Manager PIN',
          user?.name || 'Cashier',
          overrideToken
        );
        showToastNotification('Cash drawer solenoid triggered & logged.', 'success');
      },
    });
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    setAppliedPromotionId(undefined);
    if (code === 'COFFEE20') {
      setDiscountPercent(20);
      soundEffects.playBeep();
      showToastNotification('Coupon COFFEE20 applied (20% OFF).', 'success');
    } else if (code === 'VIP10') {
      setDiscountPercent(10);
      soundEffects.playBeep();
      showToastNotification('Coupon VIP10 applied (10% OFF).', 'success');
    } else {
      showToastNotification('Invalid coupon code. Try COFFEE20 or VIP10.', 'warning');
    }
  };

  const handleHoldCurrentCart = (holdName: string) => {
    if (cart.length === 0) return;
    const newHeld: HeldOrder = {
      id: `held-${Date.now()}`,
      holdName,
      cart: [...cart],
      orderType,
      totalAmount,
      heldAt: new Date().toISOString(),
    };
    setHeldOrders([newHeld, ...heldOrders]);
    setCart([]);
    setShowHoldModal(false);
    showToastNotification(`Bill "${holdName}" placed on hold.`, 'info');
  };

  const handleResumeHeldOrder = (held: HeldOrder) => {
    setCart(held.cart);
    setOrderType(held.orderType);
    setHeldOrders(heldOrders.filter((h) => h.id !== held.id));
    setShowHoldModal(false);
    showToastNotification(`Resumed held bill "${held.holdName}".`, 'info');
  };

  const handleDeleteHeldOrder = (id: string) => {
    setHeldOrders(heldOrders.filter((h) => h.id !== id));
  };

  const handleInitiateCheckout = () => {
    if (cart.length === 0) return;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      type: orderType,
      status: 'PENDING',
      tableId: selectedTable?.id,
      tableName: selectedTable?.name,
      cashierName: user?.name || 'Cashier',
      items: cart,
      subtotal,
      discountAmount,
      couponCode: discountPercent > 0 ? couponCode : undefined,
      taxAmount,
      serviceCharge: 0,
      totalAmount,
      createdAt: new Date().toISOString(),
    };

    setMobileCartOpen(false);
    setActivePaymentOrder(newOrder);
  };

  const handlePaymentCompleted = async (
    method: PaymentMethod,
    amountPaid: number,
    _changeAmount: number,
    transactionId?: string,
    splitPayments?: SplitPayment[]
  ) => {
    if (!activePaymentOrder) return;

    try {
      const serverOrder = await createOrderApi({
        type: activePaymentOrder.type,
        tableId: activePaymentOrder.tableId,
        customerId: activePaymentOrder.customerId,
        items: activePaymentOrder.items.map((item) => ({
          cartItemId: item.cartItemId,
          productId: item.productId,
          variantId: item.selectedVariant?.id,
          selectedToppingIds: item.selectedToppings.map((tp) => tp.id),
          quantity: item.quantity,
          notes: item.notes,
        })),
        couponCode: activePaymentOrder.couponCode,
        promotionId: appliedPromotionId,
        discountPercent,
        paymentMethod: method,
        splitPayments,
        amountPaid,
        transactionId,
        notes: activePaymentOrder.notes,
      });

      soundEffects.playCashRegister();
      showToastNotification(`Order ${serverOrder.orderNumber} completed & synced!`, 'success');

      setActivePaymentOrder(null);
      setCart([]);
      setDiscountPercent(0);
      setCouponCode('');
      setAppliedPromotionId(undefined);
      setSelectedTable(null);
      setCompletedReceiptOrder(serverOrder);
    } catch (err) {
      showToastNotification(err instanceof Error ? err.message : 'Checkout failed on server', 'error');
      setActivePaymentOrder(null);
    }
  };

  const renderCartWorkspace = (isMobileDrawer = false) => (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-full min-h-0 shadow-2xl overflow-hidden border border-white/10">
      {/* Order Header & Service Mode */}
      <div className="space-y-3.5 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShoppingCart className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <h3 className="text-sm sm:text-base font-extrabold text-zinc-100 truncate">{t('currentOrder')}</h3>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleRequestVoidCart}
                className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900/60 text-[10px] font-bold flex items-center gap-1 transition-colors"
                title="Void Cart (Manager PIN required)"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
                <span>Void</span>
              </button>
            )}
            <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/30">
              {totalUnitCount} {t('items')}
            </span>
            {isMobileDrawer && (
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                aria-label="Close Ticket Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Service Mode Switcher */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#0b0c10] rounded-xl border border-white/10">
          {(['DINE_IN', 'TAKE_AWAY', 'DELIVERY', 'DRIVE_THROUGH'] as OrderType[]).map((tType) => (
            <button
              key={tType}
              type="button"
              onClick={() => setOrderType(tType)}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-extrabold transition-all truncate ${
                orderType === tType
                  ? 'gold-gradient-bg text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tType === 'DINE_IN'
                ? t('dineIn')
                : tType === 'TAKE_AWAY'
                ? t('takeAway')
                : tType === 'DELIVERY'
                ? t('delivery')
                : t('driveThrough')}
            </button>
          ))}
        </div>

        {/* Dine-In Table Selector */}
        {orderType === 'DINE_IN' && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0b0c10] border border-amber-500/30 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Table:</span>
            </span>
            <button
              type="button"
              onClick={() => setShowTablePickerModal(true)}
              className="px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 hover:text-zinc-950 border border-amber-500/40 text-amber-300 font-bold text-xs transition-colors"
            >
              {selectedTable ? `${selectedTable.name} (${selectedTable.tableNumber})` : 'Assign Table +'}
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Ticket Items */}
      <div className="flex-1 min-h-0 overflow-y-auto my-3 space-y-2 pr-0.5 scrollbar-thin">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8 px-4 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-amber-500/50" />
            </div>
            <p className="text-xs font-bold text-zinc-300">Ticket is empty</p>
            <p className="text-[11px] text-zinc-500 max-w-[220px]">
              Tap any coffee or pastry card on the menu to begin adding items.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.cartItemId} className="p-3 rounded-xl bg-[#0b0c10] border border-white/10 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={item.image} alt={item.name} className="w-9 h-9 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-zinc-100 truncate">{item.name}</h5>
                    <span className="text-[11px] text-amber-400 font-mono font-bold">${item.unitPrice.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateCartQuantity(item.cartItemId, -99)}
                  className="text-zinc-500 hover:text-red-400 p-1 transition-colors flex-shrink-0"
                  title="Remove Item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {(item.selectedVariant || item.selectedToppings.length > 0 || item.notes) && (
                <div className="text-[10px] text-zinc-400 pl-2 border-l-2 border-amber-500/45 space-y-0.5">
                  {item.selectedVariant && <div>Size: {item.selectedVariant.name}</div>}
                  {item.selectedToppings.length > 0 && (
                    <div>+ {item.selectedToppings.map((tp) => tp.name).join(', ')}</div>
                  )}
                  {item.notes && (
                    <div className="inline-flex items-center gap-1 text-amber-300 font-semibold bg-amber-500/15 px-1.5 py-0.5 rounded text-[9px] border border-amber-500/25 mt-0.5">
                      <FileText className="w-2.5 h-2.5" />
                      <span>{item.notes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Preparation Tags */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {['ផ្អែម 50%', 'ផ្អែម 0%', 'ទឹកកកតិច', 'ក្ដៅខ្លាំង'].map((tag) => {
                  const active = item.notes?.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleItemNote(item.cartItemId, tag)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                        active
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                <div className="flex items-center gap-1.5 bg-zinc-900 px-1.5 py-1 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(item.cartItemId, -1)}
                    className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-xs"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-black text-amber-300 w-5 text-center font-mono">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(item.cartItemId, 1)}
                    className="w-6 h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center font-bold text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-xs font-black text-zinc-100 font-mono tabular-nums">${item.itemSubtotal.toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Totals & Checkout */}
      <div className="pt-3 border-t border-white/10 space-y-2.5 flex-shrink-0">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPromotionModal(true)}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              <Gift className="w-3.5 h-3.5 text-purple-400" />
              <span>{discountPercent > 0 ? `${discountPercent}% ${t('discount')}` : 'Promotions'}</span>
            </button>
            <span className="text-zinc-600">•</span>
            <button
              type="button"
              onClick={() => setShowDiscountInput(!showDiscountInput)}
              className="text-zinc-400 hover:text-zinc-200 hover:underline text-[11px] flex items-center gap-1"
            >
              <Tag className="w-3 h-3" />
              <span>Code</span>
            </button>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSplitModal(true)}
              className="text-amber-300 hover:text-amber-200 flex items-center gap-1 font-bold"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Split Bill</span>
            </button>
          )}
        </div>

        {showDiscountInput && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="COFFEE20 or VIP10"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl glass-input text-xs uppercase focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
            >
              Apply
            </button>
          </div>
        )}

        <div className="space-y-1 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>{t('subtotal')}</span>
            <span className="font-mono text-zinc-200 font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-400 font-semibold">
              <span>{t('discount')} ({discountPercent}%)</span>
              <span className="font-mono">-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{t('tax')} ({taxRate}%)</span>
            <span className="font-mono text-zinc-200 font-semibold">${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-white/10 text-zinc-100">
            <div>
              <span className="text-sm font-extrabold">{t('totalPayable')}</span>
              <span className="text-[11px] text-zinc-400 block font-mono">
                ៛{(Math.round((totalAmount * khrExchangeRate) / 100) * 100).toLocaleString()} KHR
              </span>
            </div>
            <span className="text-2xl font-mono font-black tabular-nums gold-gradient-text">${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={cart.length === 0}
          onClick={handleInitiateCheckout}
          className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
            cart.length === 0
              ? 'bg-zinc-800/80 text-zinc-500 cursor-not-allowed'
              : 'gold-gradient-bg hover:brightness-110 active:scale-[0.99] text-zinc-950 shadow-amber-500/20'
          }`}
        >
          <CreditCard className="w-4 h-4 stroke-[2.5]" />
          <span>{t('payButton')} (${totalAmount.toFixed(2)})</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden font-sans relative">
      {/* Left Area: Product Catalog Workspace */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 space-y-3 min-w-0">
        {/* Category Row + Action Dropdowns */}
        <div className="flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1 min-w-0">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'gold-gradient-bg text-zinc-950 shadow-md'
                      : 'bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <Coffee className={`w-3.5 h-3.5 ${isSelected ? 'text-zinc-950' : 'text-amber-400'}`} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setCompactGrid((prev) => !prev)}
              className="hidden sm:flex p-2 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-amber-300 transition-colors"
              title={compactGrid ? 'Switch to Comfort Cards' : 'Switch to Compact Grid'}
            >
              {compactGrid ? <LayoutGrid className="w-4 h-4" /> : <Rows3 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setShowOrderHistoryModal(true)}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-amber-500/35 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Order History, Re-print & Refunds"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Orders</span>
            </button>

            {/* Terminal Dropdown */}
            <div className="relative" ref={terminalMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowTerminalMenu((prev) => !prev);
                  setShowToolsMenu(false);
                }}
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/25 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Terminal</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {showTerminalMenu && (
                <div
                  className="absolute right-0 top-11 w-64 glass-panel border border-white/15 rounded-2xl p-2 shadow-2xl space-y-1 z-50"
                  onClick={() => setShowTerminalMenu(false)}
                >
                  <div className="text-[10px] text-zinc-400 font-bold px-2.5 py-1 uppercase border-b border-white/10 mb-1">
                    Shift & Terminal
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowXReportModal(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">X-Report Shift Handover</span>
                      <span className="text-[10px] text-zinc-400">Cash count & drawer check</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowZReportModal(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">Z-Report Closeout</span>
                      <span className="text-[10px] text-zinc-400">End-of-day reconciliation</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPettyCashModal(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold block">Petty Cash Expenses</span>
                      <span className="text-[10px] text-zinc-400">Log store expenses</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCashDrawerNoSale}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">Open Drawer (No Sale)</span>
                      <span className="text-[10px] text-zinc-400">Manager PIN kick</span>
                    </div>
                  </button>
                  {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <button
                      type="button"
                      onClick={() => setShowSecurityAuditModal(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-bold block">Security Audit Log</span>
                        <span className="text-[10px] text-zinc-400">Activity trail</span>
                      </div>
                    </button>
                  )}
                  <div className="border-t border-white/10 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      void logSecurityEvent('SCREEN_LOCK', 'Terminal Locked', 'Cashier locked register screen', user?.name || 'Staff');
                      setIsScreenLocked(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-red-300 hover:bg-red-950/40"
                  >
                    <Lock className="w-4 h-4 text-red-400" />
                    <span className="font-bold">Lock Register Screen</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tools Dropdown */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowToolsMenu((prev) => !prev);
                  setShowTerminalMenu(false);
                }}
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/25 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden md:inline">Tools</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {showToolsMenu && (
                <div
                  className="absolute right-0 top-11 w-64 glass-panel border border-white/15 rounded-2xl p-2 shadow-2xl space-y-1 z-50"
                  onClick={() => setShowToolsMenu(false)}
                >
                  <div className="text-[10px] text-zinc-400 font-bold px-2.5 py-1 uppercase border-b border-white/10 mb-1">
                    Smart Café Tools
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiBaristaModal(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">AI Barista Assistant</span>
                      <span className="text-[10px] text-zinc-400">Flavor profile & recipes</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQrSelfOrderModal(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">Customer QR Kiosk</span>
                      <span className="text-[10px] text-zinc-400">Self-ordering QR display</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPromotionModal(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="font-bold block">Promotions Engine</span>
                      <span className="text-[10px] text-zinc-400">Happy Hour & vouchers</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGiftCardWalletModal(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <Gift className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="font-bold block">Gift Card & Wallet</span>
                      <span className="text-[10px] text-zinc-400">Top-up & lookup</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCashDrawerModal(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <Lock className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">{t('shiftRegister')}</span>
                      <span className="text-[10px] text-zinc-400">Open/close cash float</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAiForecastModal(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">{t('aiForecast')}</span>
                      <span className="text-[10px] text-zinc-400">Demand prediction</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <Megaphone className="w-4 h-4 text-sky-400" />
                    <div>
                      <span className="font-bold block">Store Notice Banner</span>
                      <span className="text-[10px] text-zinc-400">Broadcast alerts</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Store Broadcast Ticker */}
        <BroadcastBanner onOpenManager={() => setShowBroadcastModal(true)} />

        {/* Search + Held Bills + Barcode Trigger */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 rounded-xl glass-input text-xs sm:text-sm focus:outline-none placeholder-zinc-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 p-0.5 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowHoldModal(true)}
            className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-500/45 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors flex-shrink-0"
          >
            <PauseCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{t('holdQueue')}</span>
            {heldOrders.length > 0 && (
              <span className="w-5 h-5 rounded-full gold-gradient-bg text-zinc-950 text-[10px] font-black flex items-center justify-center">
                {heldOrders.length}
              </span>
            )}
          </button>

          <div
            className="hidden xl:flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-mono font-bold flex-shrink-0"
            title="USB Barcode Scanner is active globally"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Scanner</span>
          </div>

          <button
            type="button"
            onClick={() => {
              const testProduct = products[0];
              if (testProduct) {
                handleProductClick(testProduct);
                soundEffects.playBeep();
                setLastScannedItem(`${testProduct.name} (${testProduct.barcode})`);
                setTimeout(() => setLastScannedItem(null), 3200);
              }
            }}
            className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-500/45 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors flex-shrink-0"
            title="Quick SKU Scan Trigger"
          >
            <Barcode className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{t('scanSku')}</span>
          </button>
        </div>

        {/* Scrollable Products Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-24 lg:pb-4 scrollbar-thin">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center glass-card rounded-2xl space-y-2">
              <Coffee className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-bold text-zinc-300">No items match your filter</p>
              <button
                type="button"
                onClick={() => { setSelectedCategory('cat-1'); setSearchQuery(''); }}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] text-amber-300 text-xs font-bold"
              >
                Show All Menu Items
              </button>
            </div>
          ) : (
            <div
              className={`grid gap-3 ${
                compactGrid
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'
                  : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'
              }`}
            >
              {filteredProducts.map((product) => {
                const cartQty = cart
                  .filter((item) => item.productId === product.id)
                  .reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <div
                    key={product.id}
                    className={`glass-card glass-card-hover rounded-2xl p-2.5 sm:p-3 text-left flex flex-col justify-between group relative overflow-hidden ${
                      !product.isAvailable
                        ? 'border-red-500/30 opacity-70'
                        : cartQty > 0
                        ? 'border-amber-500/80 ring-1 ring-amber-500/35'
                        : ''
                    }`}
                  >
                    <button type="button" onClick={() => handleProductClick(product)} className="w-full text-left">
                      <div className={`relative ${compactGrid ? 'h-24' : 'h-28 sm:h-32'} rounded-xl overflow-hidden mb-2.5 bg-zinc-950`}>
                        <img
                          src={product.image}
                          alt={product.name}
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            !product.isAvailable ? 'grayscale opacity-50' : 'group-hover:scale-105'
                          }`}
                        />

                        {cartQty > 0 && (
                          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950 font-black text-[11px] shadow-md">
                            {cartQty}x
                          </div>
                        )}

                        {!product.isAvailable ? (
                          <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                            <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider">
                              Out of Stock
                            </span>
                          </div>
                        ) : (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg gold-gradient-bg text-zinc-950 font-black font-mono text-xs shadow-md">
                            ${product.sellingPrice.toFixed(2)}
                          </div>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-extrabold text-zinc-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
                        {product.name}
                      </h4>
                      {!compactGrid && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                          {product.description}
                        </p>
                      )}

                      <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                        <span className="truncate">{product.sku}</span>
                        <span className={product.isAvailable ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                          {product.isAvailable ? 'Available' : 'Empty'}
                        </span>
                      </div>
                    </button>

                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecipeProduct(product);
                        }}
                        className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-amber-400 font-mono text-[10px] flex items-center gap-1 transition-colors"
                      >
                        <BookOpen className="w-3 h-3 text-amber-400" />
                        <span>Recipe</span>
                      </button>

                      {cartQty > 0 ? (
                        <div
                          className="flex items-center gap-1 bg-zinc-950 border border-amber-500/60 rounded-lg px-1.5 py-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const targetItem = cart.find((i) => i.productId === product.id);
                              if (targetItem) updateCartQuantity(targetItem.cartItemId, -1);
                            }}
                            className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-amber-300 font-mono px-1">{cartQty}</span>
                          <button
                            type="button"
                            onClick={() => handleProductClick(product)}
                            className="w-5 h-5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleProductClick(product)}
                          disabled={!product.isAvailable}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            !product.isAvailable
                              ? 'text-zinc-600 cursor-not-allowed'
                              : 'bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/35'
                          }`}
                        >
                          Add +
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Right Side: Order Cart Workspace */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col h-full min-h-0">
        {renderCartWorkspace(false)}
      </div>

      {/* Mobile & Tablet Floating Bottom Ticket Dock (< lg) */}
      <div className="lg:hidden fixed bottom-3 inset-x-3 z-30 safe-pb">
        <div className="glass-panel border border-amber-500/40 rounded-2xl p-2.5 px-3.5 shadow-2xl flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="flex items-center gap-3 min-w-0 text-left flex-1"
          >
            <div className="relative w-10 h-10 rounded-xl gold-gradient-bg flex items-center justify-center text-zinc-950 flex-shrink-0 shadow-md">
              <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
              {totalUnitCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-950 border border-amber-400 text-amber-300 text-[10px] font-black flex items-center justify-center">
                  {totalUnitCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-zinc-100 truncate">
                {totalUnitCount > 0 ? `${totalUnitCount} ${t('items')} • ${selectedTable?.name || orderType.replace('_', ' ')}` : t('currentOrder')}
              </div>
              <div className="text-sm font-black font-mono text-amber-400 tabular-nums">
                ${totalAmount.toFixed(2)}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setMobileCartOpen(true)}
              className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-zinc-100 text-xs font-bold"
            >
              Ticket
            </button>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleInitiateCheckout}
              className="px-4 py-2 rounded-xl gold-gradient-bg disabled:opacity-40 text-zinc-950 font-black text-xs shadow-md"
            >
              Pay
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Slide-Over Cart Sheet (< lg) */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setMobileCartOpen(false)} />
          <div className="relative w-full max-w-md h-full p-3 bg-[#08090c] z-10 flex flex-col">
            {renderCartWorkspace(true)}
          </div>
        </div>
      )}

      {/* Out of Stock Modal */}
      {outOfStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-red-500/50 rounded-2xl w-full max-w-md p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-zinc-100">Product Out of Stock</h3>
            <p className="text-xs text-zinc-400">
              <span className="text-amber-300 font-bold">{outOfStockProduct.name}</span> is currently marked unavailable or depleted.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setOutOfStockProduct(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setOutOfStockProduct(null);
                  navigate('/inventory');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold flex items-center gap-1.5"
              >
                <Package className="w-4 h-4" />
                <span>Manage Inventory</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operational Modals */}
      {showAiBaristaModal && <AiBaristaModal onClose={() => setShowAiBaristaModal(false)} />}
      {showQrSelfOrderModal && <QrSelfOrderModal onClose={() => setShowQrSelfOrderModal(false)} />}
      {showGiftCardWalletModal && <GiftCardWalletModal onClose={() => setShowGiftCardWalletModal(false)} />}
      {customizeProduct && (
        <VariantToppingModal
          product={customizeProduct}
          onClose={() => setCustomizeProduct(null)}
          onAddToCart={addToCart}
        />
      )}
      {recipeProduct && <RecipeModal product={recipeProduct} onClose={() => setRecipeProduct(null)} />}
      {showCashDrawerModal && <CashDrawerModal onClose={() => setShowCashDrawerModal(false)} />}
      {showAiForecastModal && <AiForecastModal onClose={() => setShowAiForecastModal(false)} />}
      {showHoldModal && (
        <HoldOrderModal
          activeCart={cart}
          heldOrders={heldOrders}
          onClose={() => setShowHoldModal(false)}
          onHoldCurrentCart={handleHoldCurrentCart}
          onResumeOrder={handleResumeHeldOrder}
          onDeleteHeldOrder={handleDeleteHeldOrder}
        />
      )}
      {showSplitModal && (
        <SplitBillModal
          order={{
            id: 'split-preview',
            orderNumber: 'SPLIT-PREVIEW',
            type: orderType,
            status: 'PENDING',
            cashierName: user?.name || 'Cashier',
            items: cart,
            subtotal,
            discountAmount,
            taxAmount,
            serviceCharge: 0,
            totalAmount,
            createdAt: new Date().toISOString(),
          }}
          onClose={() => setShowSplitModal(false)}
          onConfirmSplit={(parts, perPart) => {
            setShowSplitModal(false);
            showToastNotification(
              `Bill split into ${parts} shares of $${perPart.toFixed(2)} each. Launching checkout.`,
              'info'
            );
            handleInitiateCheckout();
          }}
        />
      )}
      {activePaymentOrder && (
        <PaymentModal
          order={activePaymentOrder}
          khrRate={khrExchangeRate}
          onClose={() => setActivePaymentOrder(null)}
          onPaymentComplete={handlePaymentCompleted}
        />
      )}
      {completedReceiptOrder && (
        <ThermalReceiptModal
          order={completedReceiptOrder}
          onClose={() => setCompletedReceiptOrder(null)}
          onPrintCupLabels={() => setCupLabelOrder(completedReceiptOrder)}
        />
      )}
      {isScreenLocked && <PosScreenLockModal user={user} onUnlock={() => setIsScreenLocked(false)} />}
      {managerPinAction && (
        <ManagerPinModal
          actionTitle={managerPinAction.title}
          actionDetails={managerPinAction.details}
          performedBy={user?.name || 'Cashier'}
          onSuccess={(overrideToken) => {
            const approvedCallback = managerPinAction.onApproved;
            setManagerPinAction(null);
            approvedCallback(overrideToken);
          }}
          onClose={() => setManagerPinAction(null)}
        />
      )}
      {showSecurityAuditModal && <SecurityAuditModal onClose={() => setShowSecurityAuditModal(false)} />}
      {showZReportModal && <ZReportModal onClose={() => setShowZReportModal(false)} cashierName={user?.name || 'Cashier'} />}
      {showPettyCashModal && <PettyCashModal onClose={() => setShowPettyCashModal(false)} cashierName={user?.name || 'Cashier'} />}
      {showPromotionModal && (
        <PromotionManagerModal
          onClose={() => setShowPromotionModal(false)}
          onApplyToCart={(promo) => {
            setAppliedPromotionId(promo.id);
            setCouponCode('');
            if (promo.type === 'FIXED') {
              const pct = subtotal > 0 ? Math.min(100, (promo.value / subtotal) * 100) : 0;
              setDiscountPercent(Number(pct.toFixed(2)));
            } else {
              setDiscountPercent(promo.value);
            }
            soundEffects.playSuccess();
            showToastNotification(
              `Applied promotion "${promo.name}": ${promo.type === 'FIXED' ? `$${promo.value.toFixed(2)}` : `${promo.value}%`} OFF`,
              'success'
            );
          }}
        />
      )}
      {showBroadcastModal && <BroadcastModal onClose={() => setShowBroadcastModal(false)} authorName={user?.name || 'Cashier'} />}
      {showTablePickerModal && (
        <TablePickerModal
          selectedTable={selectedTable}
          onSelectTable={(table) => setSelectedTable(table)}
          onClose={() => setShowTablePickerModal(false)}
        />
      )}
      {showOrderHistoryModal && (
        <OrderHistoryModal
          onClose={() => setShowOrderHistoryModal(false)}
          onReprintReceipt={(order) => setCompletedReceiptOrder(order)}
          onPrintCupLabels={(order) => setCupLabelOrder(order)}
          onRequestManagerPin={(action) => setManagerPinAction(action)}
        />
      )}
      {showXReportModal && <XReportModal outgoingCashier={user?.name || 'Cashier'} onClose={() => setShowXReportModal(false)} />}
      {cupLabelOrder && <CupLabelModal order={cupLabelOrder} onClose={() => setCupLabelOrder(null)} />}

      {lastScannedItem && (
        <div className="fixed bottom-20 lg:bottom-6 left-4 z-50 bg-emerald-950/95 border border-emerald-500 text-emerald-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5">
          <Barcode className="w-4 h-4 text-emerald-400 animate-pulse" />
          <div>
            <p className="text-[10px] text-emerald-400 uppercase font-bold">SKU Scanned</p>
            <p className="text-xs font-bold text-white">{lastScannedItem}</p>
          </div>
        </div>
      )}
    </div>
  );
};
