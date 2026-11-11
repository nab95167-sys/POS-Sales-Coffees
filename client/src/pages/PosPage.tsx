import React, { useState, useEffect } from 'react';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, Tag, DollarSign, 
  CreditCard, ArrowRightLeft, PauseCircle, PlayCircle, Coffee, Check, Barcode, 
  Sparkles, Lock, BookOpen, AlertTriangle, Package, QrCode, Gift, Cpu, CheckCircle2,
  ShieldCheck, KeyRound, ShieldAlert, FileText, Ban, FileSpreadsheet, Wallet, Megaphone,
  History, Layers, ChevronDown
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
  const { products, categories } = useProducts(); // Real-time Global Product Sync!

  const [selectedCategory, setSelectedCategory] = useState<string>('cat-1');
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    apiFetch<{ settings: StoreSettings }>('/api/v1/settings')
      .then((res) => {
        setTaxRate(res.settings.taxRate);
        setKhrExchangeRate(res.settings.khrExchangeRate);
      })
      .catch(() => {});
  }, []);

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

  // Filter Products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'cat-1' || p.categoryId === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery);
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

  // Global USB Barcode Scanner Hardware Listener (Keyboard wedge)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is intentionally typing into input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Reset buffer if time between keystrokes exceeds 150ms (human typing vs hardware gun)
      if (timeDiff > 150) {
        barcodeBuffer = '';
      }

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
            setTimeout(() => setLastScannedItem(null), 3500);
          } else {
            alert(`⚠️ Barcode / SKU "${scannedCode}" not found in current catalog.`);
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

  const handleRequestVoidCart = () => {
    if (cart.length === 0) return;
    setManagerPinAction({
      title: 'Void Entire Cart (បោះបង់ការកុម្ម៉ង់)',
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
        alert('Cart voided successfully by Manager authorization.');
      },
    });
  };

  const handleOpenCashDrawerNoSale = () => {
    setManagerPinAction({
      title: 'Open Cash Drawer (No Sale / បើកថតលុយ)',
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
        alert('Cash drawer solenoid triggered & opened!');
      },
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.itemSubtotal, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableSubtotal * (taxRate / 100);
  const totalAmount = taxableSubtotal + taxAmount;

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    setAppliedPromotionId(undefined);
    if (code === 'COFFEE20') {
      setDiscountPercent(20);
      soundEffects.playBeep();
      alert('Coupon COFFEE20 applied! 20% discount added.');
    } else if (code === 'VIP10') {
      setDiscountPercent(10);
      soundEffects.playBeep();
      alert('Coupon VIP10 applied! 10% discount added.');
    } else {
      alert('Invalid coupon code. Try "COFFEE20" or "VIP10".');
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
  };

  const handleResumeHeldOrder = (held: HeldOrder) => {
    setCart(held.cart);
    setOrderType(held.orderType);
    setHeldOrders(heldOrders.filter((h) => h.id !== held.id));
    setShowHoldModal(false);
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
      showToastNotification(`Order ${serverOrder.orderNumber} recorded & synced to server!`);

      setActivePaymentOrder(null);
      setCart([]);
      setDiscountPercent(0);
      setCouponCode('');
      setAppliedPromotionId(undefined);
      setSelectedTable(null);
      setCompletedReceiptOrder(serverOrder);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Checkout failed on server');
      setActivePaymentOrder(null);
    }
  };

  return (
    <div className="h-full flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden font-sans">
      {/* Left Area: Product Menu & Category Sidebar (8 Columns) */}
      <div className="lg:col-span-8 flex flex-col h-full min-h-0 space-y-3 min-w-0">
        {/* Top Control Toolbar: Categories + Sleek Action Dropdowns */}
        <div className="flex items-center justify-between gap-3 pb-1 flex-shrink-0">
          {/* Category Pills (Scrollable with smooth modern styling) */}
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1 flex-1 min-w-0">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all duration-150 ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-zinc-950 shadow-lg shadow-amber-500/20 border border-amber-300'
                      : 'bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60'
                  }`}
                >
                  <Coffee className={`w-3.5 h-3.5 ${isSelected ? 'text-zinc-950' : 'text-amber-400'}`} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Compact Action Controls: Orders + Terminal ▾ + Tools ▾ */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* 1. Orders History Modal */}
            <button
              onClick={() => setShowOrderHistoryModal(true)}
              className="px-3.5 py-2 rounded-2xl bg-zinc-900/90 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-sm hover:shadow-amber-500/10"
              title="Order History, Re-print Receipt & Refunds (ប្រវត្តិវិក្កយបត្រ)"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Orders</span>
            </button>

            {/* 2. Terminal Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowTerminalMenu(!showTerminalMenu);
                  setShowToolsMenu(false);
                }}
                className="px-3 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Terminal</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {showTerminalMenu && (
                <div 
                  className="absolute right-0 top-11 w-64 bg-[#121217] border border-zinc-700 rounded-2xl p-2 shadow-2xl space-y-1 z-50 animate-in fade-in zoom-in-95"
                  onClick={() => setShowTerminalMenu(false)}
                >
                  <div className="text-[10px] text-zinc-400 font-semibold px-2.5 py-1 uppercase border-b border-zinc-800 mb-1">
                    Shift & Terminal Management
                  </div>
                  <button
                    onClick={() => setShowXReportModal(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-amber-300 transition-colors"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">X-Report (ប្តូរវេន)</span>
                      <span className="text-[10px] text-zinc-400">Shift Handover & Cash Count</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowZReportModal(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-amber-300 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">Z-Report (បិទបញ្ជី)</span>
                      <span className="text-[10px] text-zinc-400">End-of-Day Closeout</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowPettyCashModal(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-emerald-400 transition-colors"
                  >
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold block">Petty Cash (កត់ចំណាយ)</span>
                      <span className="text-[10px] text-zinc-400">Daily Store Expense</span>
                    </div>
                  </button>
                  <button
                    onClick={handleOpenCashDrawerNoSale}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-amber-300 transition-colors"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">Open Drawer (No Sale)</span>
                      <span className="text-[10px] text-zinc-400">Manual Solenoid Kick</span>
                    </div>
                  </button>
                  {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <button
                      onClick={() => setShowSecurityAuditModal(true)}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-emerald-400 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-bold block">Security Audit Log</span>
                        <span className="text-[10px] text-zinc-400">Anti-Theft Activity Trail</span>
                      </div>
                    </button>
                  )}
                  <div className="border-t border-zinc-800 my-1"></div>
                  <button
                    onClick={() => {
                      logSecurityEvent('SCREEN_LOCK', 'Terminal Locked', 'Cashier manually locked register screen', user?.name || 'Staff');
                      setIsScreenLocked(true);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-red-300 hover:bg-red-950/40 transition-colors"
                  >
                    <Lock className="w-4 h-4 text-red-400" />
                    <span className="font-bold">Lock Register Screen</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Tools & Features Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowToolsMenu(!showToolsMenu);
                  setShowTerminalMenu(false);
                }}
                className="px-3 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Tools</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {showToolsMenu && (
                <div 
                  className="absolute right-0 top-11 w-64 bg-[#121217] border border-zinc-700 rounded-2xl p-2 shadow-2xl space-y-1 z-50 animate-in fade-in zoom-in-95"
                  onClick={() => setShowToolsMenu(false)}
                >
                  <div className="text-[10px] text-zinc-400 font-semibold px-2.5 py-1 uppercase border-b border-zinc-800 mb-1">
                    Smart Features & AI
                  </div>
                  <button
                    onClick={() => setShowAiBaristaModal(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-amber-300 transition-colors"
                  >
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">AI Barista Assistant</span>
                      <span className="text-[10px] text-zinc-400">Flavor profile & recipe guide</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowQrSelfOrderModal(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-amber-300 transition-colors"
                  >
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">Customer QR Kiosk</span>
                      <span className="text-[10px] text-zinc-400">Table & counter self-ordering</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowPromotionModal(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-purple-300 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="font-bold block">Promotions Engine</span>
                      <span className="text-[10px] text-zinc-400">Happy Hour & discounts</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowGiftCardWalletModal(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-purple-300 transition-colors"
                  >
                    <Gift className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="font-bold block">Gift Card & Wallet</span>
                      <span className="text-[10px] text-zinc-400">Balance top-up & lookup</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowCashDrawerModal(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-amber-300 transition-colors"
                  >
                    <Lock className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">{t('shiftRegister')}</span>
                      <span className="text-[10px] text-zinc-400">Open/close cash float</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowAiForecastModal(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-amber-300 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">{t('aiForecast')}</span>
                      <span className="text-[10px] text-zinc-400">Demand & sales prediction</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowBroadcastModal(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-800 hover:text-blue-400 transition-colors"
                  >
                    <Megaphone className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="font-bold block">Store Notice Banner</span>
                      <span className="text-[10px] text-zinc-400">Broadcast messages</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Store Broadcast Notice Banner */}
        <BroadcastBanner onOpenManager={() => setShowBroadcastModal(true)} />

        {/* Search Bar & Hold Order Barcode Simulator */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-zinc-100 text-sm focus:outline-none placeholder-zinc-500 shadow-inner"
            />
          </div>

          <button
            onClick={() => setShowHoldModal(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 hover:border-amber-500/50 text-amber-300 text-xs font-bold flex items-center space-x-2 transition-all shadow-sm relative"
          >
            <PauseCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{t('holdQueue')}</span>
            {heldOrders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 text-[10px] font-black flex items-center justify-center shadow-md">
                {heldOrders.length}
              </span>
            )}
          </button>

          <div
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-zinc-900/90 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold shadow-inner"
            title="Hardware USB Barcode Scanner is listening globally. Scan any SKU or Barcode directly!"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400"></span>
            <span className="hidden md:inline">Scanner Active</span>
          </div>

          <button
            onClick={() => {
              const testProduct = products[0];
              if (testProduct) {
                handleProductClick(testProduct);
                soundEffects.playBeep();
                setLastScannedItem(`${testProduct.name} (${testProduct.barcode})`);
                setTimeout(() => setLastScannedItem(null), 3500);
              }
            }}
            className="px-4 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/50 text-zinc-300 hover:text-white text-xs font-bold flex items-center space-x-2 transition-colors shadow-sm"
            title="Click to test barcode scan trigger"
          >
            <Barcode className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{t('scanSku')}</span>
          </button>
        </div>

        {/* Products Touch Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-20 scrollbar-thin">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredProducts.map((product) => {
              const cartQty = cart
                .filter((item) => item.productId === product.id)
                .reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={product.id}
                  className={`bg-[#121217] border rounded-3xl p-3 text-left flex flex-col justify-between transition-all duration-200 shadow-xl group relative overflow-hidden ${
                    !product.isAvailable
                      ? 'border-red-500/30 opacity-70'
                      : cartQty > 0
                      ? 'border-amber-500/90 shadow-xl shadow-amber-500/15 ring-1 ring-amber-500/50 bg-[#15151c]'
                      : 'border-zinc-800/80 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1'
                  }`}
                >
                  <button onClick={() => handleProductClick(product)} className="w-full text-left">
                    <div className="relative h-32 rounded-2xl overflow-hidden mb-3 bg-zinc-950">
                      <img
                        src={product.image}
                        alt={product.name}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          !product.isAvailable ? 'grayscale opacity-60' : 'group-hover:scale-105'
                        }`}
                      />

                      {/* Quantity in Cart Badge */}
                      {cartQty > 0 && (
                        <div className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-extrabold text-[11px] shadow-lg shadow-black/60 border border-emerald-300/50 flex items-center space-x-1 animate-in zoom-in-75">
                          <span>✓ {cartQty}</span>
                          <span className="text-[9px] font-bold">ក្នុងកន្ត្រក</span>
                        </div>
                      )}

                      {!product.isAvailable ? (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="px-3 py-1 rounded-full bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-lg">
                            ⚠️ OUT OF STOCK
                          </span>
                        </div>
                      ) : (
                        <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-black text-xs shadow-lg shadow-black/60 border border-amber-300/40">
                          ${product.sellingPrice.toFixed(2)}
                        </div>
                      )}
                    </div>

                    <h4 className="text-sm font-extrabold text-zinc-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                      {product.description}
                    </p>

                    <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>SKU: {product.sku}</span>
                      <span className={product.isAvailable ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {product.isAvailable ? '● In Stock' : '✕ Unavailable'}
                      </span>
                    </div>
                  </button>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[11px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecipeProduct(product);
                      }}
                      className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-400 hover:border-amber-500/40 font-mono text-[10px] flex items-center space-x-1 transition-colors"
                      title="View Recipe & Ingredients"
                    >
                      <BookOpen className="w-3 h-3 text-amber-400" />
                      <span>Recipe</span>
                    </button>

                    {cartQty > 0 ? (
                      <div
                        className="flex items-center space-x-1.5 bg-[#09090c] border border-amber-500/70 rounded-xl px-2 py-0.5 shadow-md"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const targetItem = cart.find((i) => i.productId === product.id);
                            if (targetItem) updateCartQuantity(targetItem.cartItemId, -1);
                          }}
                          className="w-5 h-5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-xs"
                          title="Deduct 1"
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-amber-300 font-mono px-1">
                          {cartQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleProductClick(product)}
                          className="w-5 h-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center font-bold text-xs"
                          title="Add 1 more"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleProductClick(product)}
                        disabled={!product.isAvailable}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                          !product.isAvailable
                            ? 'text-zinc-600 cursor-not-allowed'
                            : 'bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/40 hover:shadow-md'
                        }`}
                      >
                        <span>Select +</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Area: Order Cart Workspace (4 Columns) */}
      <div className="lg:col-span-4 bg-[#0d0d12]/95 border border-zinc-800/90 rounded-3xl p-5 flex flex-col justify-between glass-panel h-full min-h-0 shadow-2xl overflow-hidden">
        {/* Order Header & Type Selector */}
        <div className="space-y-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-extrabold text-zinc-100">{t('currentOrder')}</h3>
            </div>
            <div className="flex items-center space-x-2">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleRequestVoidCart}
                  className="px-2.5 py-1 rounded-xl bg-red-950/60 border border-red-700/50 text-red-300 hover:bg-red-900/60 text-[10px] font-bold flex items-center space-x-1 transition-colors"
                  title="Void Cart (Manager PIN required)"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                  <span>Void Cart</span>
                </button>
              )}
              <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
                {cart.length} {t('items')}
              </span>
            </div>
          </div>

          {/* Order Type Selector */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#121217] rounded-2xl border border-zinc-800">
            {(['DINE_IN', 'TAKE_AWAY', 'DELIVERY', 'DRIVE_THROUGH'] as OrderType[]).map((tType) => (
              <button
                key={tType}
                onClick={() => setOrderType(tType)}
                className={`py-2 rounded-xl text-[10px] font-extrabold transition-all ${
                  orderType === tType
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow-md font-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tType === 'DINE_IN' ? t('dineIn') : tType === 'TAKE_AWAY' ? t('takeAway') : tType === 'DELIVERY' ? t('delivery') : t('driveThrough')}
              </button>
            ))}
          </div>

          {/* Dine-In Table Picker Pill */}
          {orderType === 'DINE_IN' && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#14141a] border border-amber-500/30 text-xs shadow-sm">
              <span className="flex items-center space-x-1.5 text-zinc-300 font-semibold">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>តុអង្គុយ (Table):</span>
              </span>
              <button
                type="button"
                onClick={() => setShowTablePickerModal(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-zinc-950 font-black text-xs shadow flex items-center space-x-1 transition-all"
              >
                <span>{selectedTable ? `${selectedTable.name} (${selectedTable.tableNumber})` : '+ ជ្រើសរើសលេខតុ'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Cart Item Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto my-3 space-y-2.5 pr-1 scrollbar-thin">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                <Coffee className="w-7 h-7 text-amber-500/40" />
              </div>
              <p className="text-xs font-bold text-zinc-300">Cart is empty</p>
              <p className="text-[11px] text-zinc-500">Select drinks or bakery items from the menu to start order</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartItemId} className="p-3 rounded-2xl bg-[#121217] border border-zinc-800/80 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-9 h-9 rounded-xl object-cover border border-zinc-700/50" />
                    <div className="overflow-hidden">
                      <h5 className="text-xs font-extrabold text-zinc-200 truncate">{item.name}</h5>
                      <span className="text-[10px] text-amber-400 font-mono font-bold">${item.unitPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => updateCartQuantity(item.cartItemId, -99)}
                    className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Variant & Toppings info */}
                {(item.selectedVariant || item.selectedToppings.length > 0 || item.notes) && (
                  <div className="text-[10px] text-zinc-400 pl-2 border-l-2 border-amber-500/50 space-y-0.5">
                    {item.selectedVariant && <div>Size: {item.selectedVariant.name}</div>}
                    {item.selectedToppings.length > 0 && (
                      <div>+ {item.selectedToppings.map((tp) => tp.name).join(', ')}</div>
                    )}
                    {item.notes && (
                      <div className="text-amber-300 font-bold bg-amber-500/15 px-1.5 py-0.5 rounded text-[9px] inline-block border border-amber-500/30">
                        📝 {item.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* 1-Click Fast Modifier Chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    'ផ្អែម 50%',
                    'ផ្អែម 0%',
                    'ទឹកកកតិច',
                    'ក្ដៅខ្លាំង',
                    'កែវផ្ទាល់ខ្លួន',
                  ].map((tag) => {
                    const active = item.notes?.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleItemNote(item.cartItemId, tag)}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all ${
                          active
                            ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Quantity Controller & Subtotal */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                  <div className="flex items-center space-x-2 bg-[#09090c] px-2 py-1 rounded-xl border border-zinc-800">
                    <button
                      onClick={() => updateCartQuantity(item.cartItemId, -1)}
                      className="w-5 h-5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="text-xs font-black text-amber-300 w-5 text-center font-mono">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.cartItemId, 1)}
                      className="w-5 h-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs font-black text-zinc-100 font-mono">${item.itemSubtotal.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Breakdown & Checkout Bar */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-3 flex-shrink-0">
          {/* Coupon Code & Split Bill Bar */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowPromotionModal(true)}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1"
                title="Open Promotions & Happy Hour Engine"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{discountPercent > 0 ? `${discountPercent}% ${t('discount')}` : '🎁 Promos & Deals'}</span>
              </button>
              <span className="text-zinc-600">•</span>
              <button
                onClick={() => setShowDiscountInput(!showDiscountInput)}
                className="text-zinc-400 hover:text-zinc-200 hover:underline text-[11px]"
              >
                Code
              </button>
            </div>

            {cart.length > 0 && (
              <button
                onClick={() => setShowSplitModal(true)}
                className="text-amber-300 hover:text-amber-200 flex items-center space-x-1 font-bold"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Split Bill</span>
              </button>
            )}
          </div>

          {showDiscountInput && (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Try COFFEE20"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl glass-input text-xs uppercase"
              />
              <button
                onClick={handleApplyCoupon}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
              >
                Apply
              </button>
            </div>
          )}

          {/* Subtotal, Tax, Total with Dual Currency (USD & KHR) */}
          <div className="space-y-1.5 text-xs text-zinc-400 font-sans">
            <div className="flex justify-between">
              <span>{t('subtotal')}</span>
              <span className="font-mono text-zinc-200 font-bold">${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>{t('discount')} ({discountPercent}%)</span>
                <span className="font-mono font-bold">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{t('tax')} ({taxRate}% VAT)</span>
              <span className="font-mono text-zinc-200 font-bold">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-zinc-800 text-base font-extrabold text-zinc-100">
              <div>
                <span>{t('totalPayable')}</span>
                <span className="text-[11px] font-normal text-zinc-400 block font-mono">
                  ៛{(Math.round(totalAmount * khrExchangeRate / 100) * 100).toLocaleString()} KHR
                </span>
              </div>
              <span className="text-2xl font-mono font-black text-amber-400 gold-gradient-text">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Pay Button */}
          <button
            disabled={cart.length === 0}
            onClick={handleInitiateCheckout}
            className={`w-full py-3.5 rounded-2xl font-black text-base flex items-center justify-center space-x-2.5 transition-all shadow-xl ${
              cart.length === 0
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:brightness-110 active:scale-[0.99] text-zinc-950 shadow-amber-500/25 cursor-pointer'
            }`}
          >
            <CreditCard className="w-5 h-5 stroke-[2.5]" />
            <span>{t('payButton')} (${totalAmount.toFixed(2)})</span>
          </button>
        </div>
      </div>

      {/* Out of Stock Warning Modal */}
      {outOfStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-stone-900 border border-red-500/60 rounded-3xl w-full max-w-md p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-100">Product Out of Stock!</h3>
            <p className="text-xs text-stone-400">
              <span className="text-amber-300 font-bold">{outOfStockProduct.name}</span> is currently unavailable or raw ingredients are depleted.
            </p>
            <div className="pt-2 flex items-center justify-center space-x-3">
              <button
                onClick={() => setOutOfStockProduct(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold"
              >
                Close Notice
              </button>
              <button
                onClick={() => {
                  setOutOfStockProduct(null);
                  window.location.href = '/inventory';
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold flex items-center space-x-1.5"
              >
                <Package className="w-4 h-4" />
                <span>Go to Inventory & Restock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAiBaristaModal && (
        <AiBaristaModal
          onClose={() => setShowAiBaristaModal(false)}
        />
      )}

      {showQrSelfOrderModal && (
        <QrSelfOrderModal
          onClose={() => setShowQrSelfOrderModal(false)}
        />
      )}

      {showGiftCardWalletModal && (
        <GiftCardWalletModal
          onClose={() => setShowGiftCardWalletModal(false)}
        />
      )}

      {customizeProduct && (
        <VariantToppingModal
          product={customizeProduct}
          onClose={() => setCustomizeProduct(null)}
          onAddToCart={addToCart}
        />
      )}

      {recipeProduct && (
        <RecipeModal
          product={recipeProduct}
          onClose={() => setRecipeProduct(null)}
        />
      )}

      {showCashDrawerModal && (
        <CashDrawerModal
          onClose={() => setShowCashDrawerModal(false)}
        />
      )}

      {showAiForecastModal && (
        <AiForecastModal
          onClose={() => setShowAiForecastModal(false)}
        />
      )}

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
            alert(`Bill split into ${parts} shares of $${perPart.toFixed(2)} each. Launching checkout for share #1.`);
            handleInitiateCheckout();
          }}
        />
      )}

      {activePaymentOrder && (
        <PaymentModal
          order={activePaymentOrder}
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

      {/* Quick Screen Lock Modal */}
      {isScreenLocked && (
        <PosScreenLockModal
          user={user}
          onUnlock={() => setIsScreenLocked(false)}
        />
      )}

      {/* Manager Authorization PIN Modal */}
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

      {/* Security Audit Trail & Anti-Theft Log Modal */}
      {showSecurityAuditModal && (
        <SecurityAuditModal
          onClose={() => setShowSecurityAuditModal(false)}
        />
      )}

      {/* End-of-Day Z-Report Closeout Modal */}
      {showZReportModal && (
        <ZReportModal
          onClose={() => setShowZReportModal(false)}
          cashierName={user?.name || 'Cashier'}
        />
      )}

      {/* Petty Cash Out-of-Pocket Expense Modal */}
      {showPettyCashModal && (
        <PettyCashModal
          onClose={() => setShowPettyCashModal(false)}
          cashierName={user?.name || 'Cashier'}
        />
      )}

      {/* Automated Promotions & Happy Hour Engine Modal */}
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
            alert(`បានអនុវត្តប្រូម៉ូសិន: ${promo.nameKh} (${promo.type === 'FIXED' ? `$${promo.value.toFixed(2)}` : `${promo.value}%`} OFF)`);
          }}
        />
      )}

      {/* Store Broadcast Notice Modal */}
      {showBroadcastModal && (
        <BroadcastModal
          onClose={() => setShowBroadcastModal(false)}
          authorName={user?.name || 'Cashier'}
        />
      )}

      {/* Dine-In Table Picker Modal */}
      {showTablePickerModal && (
        <TablePickerModal
          selectedTable={selectedTable}
          onSelectTable={(table) => setSelectedTable(table)}
          onClose={() => setShowTablePickerModal(false)}
        />
      )}

      {/* Order History, Re-print Receipt & Refunds Modal */}
      {showOrderHistoryModal && (
        <OrderHistoryModal
          onClose={() => setShowOrderHistoryModal(false)}
          onReprintReceipt={(order) => {
            setCompletedReceiptOrder(order);
          }}
          onPrintCupLabels={(order) => {
            setCupLabelOrder(order);
          }}
          onRequestManagerPin={(action) => {
            setManagerPinAction(action);
          }}
        />
      )}

      {/* Mid-Day Shift Handover X-Report Modal */}
      {showXReportModal && (
        <XReportModal
          outgoingCashier={user?.name || 'Cashier'}
          onClose={() => setShowXReportModal(false)}
        />
      )}

      {/* Cup Sticker Label Printer Modal (40x30mm) */}
      {cupLabelOrder && (
        <CupLabelModal
          order={cupLabelOrder}
          onClose={() => setCupLabelOrder(null)}
        />
      )}

      {/* Floating Hardware Barcode Scan Toast */}
      {lastScannedItem && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-950/95 border border-emerald-500 text-emerald-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Barcode className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">USB Barcode Scanned</p>
            <p className="text-xs font-bold text-white">{lastScannedItem}</p>
          </div>
        </div>
      )}
    </div>
  );
};
