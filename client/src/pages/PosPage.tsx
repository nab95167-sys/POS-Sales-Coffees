import React, { useState } from 'react';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, Tag, DollarSign, 
  CreditCard, ArrowRightLeft, PauseCircle, PlayCircle, Coffee, Check, Barcode, 
  Sparkles, Lock, BookOpen, AlertTriangle, Package, QrCode, Gift, Cpu
} from 'lucide-react';
import { Product, CartItem, Order, OrderType, PaymentMethod, Category } from '../types';
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
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';
import { sendTelegramSaleAlert } from '../services/telegramBotService';
import { soundEffects } from '../services/soundService';

export const PosPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { products, categories } = useProducts(); // Real-time Global Product Sync!

  const [selectedCategory, setSelectedCategory] = useState<string>('cat-1');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>('');
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

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

  const subtotal = cart.reduce((sum, item) => sum + item.itemSubtotal, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableSubtotal * 0.10; // 10% VAT
  const totalAmount = taxableSubtotal + taxAmount;

  const handleApplyCoupon = () => {
    if (couponCode.toUpperCase() === 'COFFEE20') {
      setDiscountPercent(20);
      soundEffects.playBeep();
      alert('Coupon COFFEE20 applied! 20% discount added.');
    } else {
      alert('Invalid coupon code. Try "COFFEE20".');
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

  const handlePaymentCompleted = (
    method: PaymentMethod,
    amountPaid: number,
    changeAmount: number,
    transactionId?: string
  ) => {
    if (!activePaymentOrder) return;

    const finalizedOrder: Order = {
      ...activePaymentOrder,
      paymentMethod: method,
      amountPaid,
      changeAmount,
      status: 'PREPARING',
    };

    soundEffects.playCashRegister();
    sendTelegramSaleAlert(finalizedOrder);

    setActivePaymentOrder(null);
    setCart([]);
    setDiscountPercent(0);
    setCouponCode('');
    setCompletedReceiptOrder(finalizedOrder);
  };

  return (
    <div className="h-[calc(100vh-6rem)] grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden font-sans">
      {/* Left Area: Product Menu & Category Sidebar (8 Columns) */}
      <div className="lg:col-span-8 flex flex-col h-full space-y-4 min-w-0">
        {/* Top Control Toolbar: Categories + Enterprise Action Buttons */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
          <div className="flex items-center space-x-2">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-amber-600 text-stone-950 shadow-lg shadow-amber-900/40 border border-amber-500'
                      : 'bg-stone-900/80 border border-stone-800 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Coffee className={`w-4 h-4 ${isSelected ? 'text-stone-950' : 'text-amber-400'}`} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAiBaristaModal(true)}
              className="px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-950 to-stone-900 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-md"
              title="AI Barista Brew Assistant"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">AI Barista</span>
            </button>

            <button
              onClick={() => setShowQrSelfOrderModal(true)}
              className="px-3 py-2 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs font-bold flex items-center space-x-1.5 transition-colors"
              title="Customer Self-Service QR Kiosk"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">QR Kiosk</span>
            </button>

            <button
              onClick={() => setShowGiftCardWalletModal(true)}
              className="px-3 py-2 rounded-2xl bg-purple-950/40 border border-purple-600/40 text-purple-300 text-xs font-bold flex items-center space-x-1.5 transition-colors"
              title="Gift Card & E-Wallet"
            >
              <Gift className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden xl:inline">Gift Card</span>
            </button>

            <button
              onClick={() => setShowCashDrawerModal(true)}
              className="px-3 py-2 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-500 text-amber-300 text-xs font-bold flex items-center space-x-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">{t('shiftRegister')}</span>
            </button>

            <button
              onClick={() => setShowAiForecastModal(true)}
              className="px-3 py-2 rounded-2xl bg-gradient-to-r from-purple-900/60 to-amber-900/60 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{t('aiForecast')}</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Hold Order Barcode Simulator */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-stone-100 text-sm focus:outline-none"
            />
          </div>

          <button
            onClick={() => setShowHoldModal(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-amber-950/40 border border-amber-700/40 text-amber-300 hover:bg-amber-900/40 text-xs font-bold flex items-center space-x-2 transition-colors relative"
          >
            <PauseCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t('holdQueue')}</span>
            {heldOrders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-bold flex items-center justify-center">
                {heldOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSearchQuery('8850012301')}
            className="px-4 py-2.5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-600/50 text-stone-300 text-xs font-bold flex items-center space-x-2 transition-colors"
          >
            <Barcode className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{t('scanSku')}</span>
          </button>
        </div>

        {/* Products Touch Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`bg-stone-900/80 border rounded-3xl p-3 text-left flex flex-col justify-between transition-all duration-200 shadow-xl group glass-card relative ${
                  !product.isAvailable ? 'border-red-500/50 opacity-75' : 'border-stone-800 hover:border-amber-600/60 hover:scale-[1.02]'
                }`}
              >
                <button onClick={() => handleProductClick(product)} className="w-full text-left">
                  <div className="relative h-32 rounded-2xl overflow-hidden mb-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        !product.isAvailable ? 'grayscale opacity-60' : 'group-hover:scale-105'
                      }`}
                    />

                    {!product.isAvailable ? (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-lg animate-pulse">
                          ⚠️ OUT OF STOCK
                        </span>
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-stone-950/80 backdrop-blur-sm border border-stone-700 text-[10px] font-bold text-amber-300">
                        ${product.sellingPrice.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-stone-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
                    {product.name}
                  </h4>
                  <p className="text-[11px] text-stone-400 line-clamp-2 mt-0.5 leading-snug">
                    {product.description}
                  </p>
                </button>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-800/80 text-[11px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecipeProduct(product);
                    }}
                    className="text-stone-500 hover:text-amber-400 font-mono text-[10px] flex items-center space-x-1"
                    title="View Recipe & Ingredients"
                  >
                    <BookOpen className="w-3 h-3 text-amber-400" />
                    <span>Recipe</span>
                  </button>

                  <button
                    onClick={() => handleProductClick(product)}
                    className={`font-bold transition-transform ${
                      !product.isAvailable ? 'text-red-400' : 'text-amber-400 group-hover:translate-x-0.5'
                    }`}
                  >
                    {!product.isAvailable ? 'Unavailable' : 'Select +'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Area: Order Cart Workspace (4 Columns) */}
      <div className="lg:col-span-4 bg-stone-900/90 border border-amber-700/30 rounded-3xl p-5 flex flex-col justify-between glass-panel h-full shadow-2xl overflow-hidden">
        {/* Order Header & Type Selector */}
        <div className="space-y-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-stone-100">{t('currentOrder')}</h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-900/40">
              {cart.length} {t('items')}
            </span>
          </div>

          {/* Order Type Selector */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-stone-950 rounded-2xl border border-stone-800">
            {(['DINE_IN', 'TAKE_AWAY', 'DELIVERY', 'DRIVE_THROUGH'] as OrderType[]).map((tType) => (
              <button
                key={tType}
                onClick={() => setOrderType(tType)}
                className={`py-2 rounded-xl text-[10px] font-bold transition-all ${
                  orderType === tType
                    ? 'bg-amber-600 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {tType === 'DINE_IN' ? t('dineIn') : tType === 'TAKE_AWAY' ? t('takeAway') : tType === 'DELIVERY' ? t('delivery') : t('driveThrough')}
              </button>
            ))}
          </div>
        </div>

        {/* Cart Item Stream */}
        <div className="flex-1 overflow-y-auto my-4 space-y-2.5 pr-1">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-stone-800/60 border border-stone-700 flex items-center justify-center text-stone-500">
                <Coffee className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-stone-400">Cart is empty</p>
              <p className="text-[11px] text-stone-600">Select drinks or bakery items from the menu to start order</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartItemId} className="p-3 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-9 h-9 rounded-xl object-cover" />
                    <div className="overflow-hidden">
                      <h5 className="text-xs font-bold text-stone-200 truncate">{item.name}</h5>
                      <span className="text-[10px] text-amber-400 font-mono">${item.unitPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => updateCartQuantity(item.cartItemId, -99)}
                    className="text-stone-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Variant & Toppings info */}
                {(item.selectedVariant || item.selectedToppings.length > 0) && (
                  <div className="text-[10px] text-stone-400 pl-2 border-l border-amber-600/40 space-y-0.5">
                    {item.selectedVariant && <div>Size: {item.selectedVariant.name}</div>}
                    {item.selectedToppings.length > 0 && (
                      <div>+ {item.selectedToppings.map((tp) => tp.name).join(', ')}</div>
                    )}
                  </div>
                )}

                {/* Quantity Controller & Subtotal */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
                  <div className="flex items-center space-x-2 bg-stone-900 px-2 py-1 rounded-xl border border-stone-800">
                    <button
                      onClick={() => updateCartQuantity(item.cartItemId, -1)}
                      className="w-5 h-5 rounded-lg bg-stone-800 text-stone-300 flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-amber-300 w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.cartItemId, 1)}
                      className="w-5 h-5 rounded-lg bg-amber-600 text-stone-950 flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs font-bold text-stone-100 font-mono">${item.itemSubtotal.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Breakdown & Checkout Bar */}
        <div className="pt-4 border-t border-stone-800/80 space-y-3 flex-shrink-0">
          {/* Coupon Code & Split Bill Bar */}
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => setShowDiscountInput(!showDiscountInput)}
              className="text-amber-400 hover:underline flex items-center space-x-1"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{discountPercent > 0 ? `${discountPercent}% ${t('discount')}` : 'Promo Code'}</span>
            </button>

            {cart.length > 0 && (
              <button
                onClick={() => setShowSplitModal(true)}
                className="text-amber-300 hover:text-amber-200 flex items-center space-x-1 font-semibold"
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
                className="px-3 py-1.5 rounded-xl bg-amber-600 text-stone-950 font-bold text-xs"
              >
                Apply
              </button>
            </div>
          )}

          {/* Subtotal, Tax, Total */}
          <div className="space-y-1.5 text-xs text-stone-400 font-sans">
            <div className="flex justify-between">
              <span>{t('subtotal')}</span>
              <span className="font-mono text-stone-200">${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>{t('discount')} ({discountPercent}%)</span>
                <span className="font-mono">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{t('tax')}</span>
              <span className="font-mono text-stone-200">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-stone-800 text-base font-extrabold text-stone-100">
              <span>{t('totalPayable')}</span>
              <span className="text-2xl font-mono text-amber-400">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Pay Button */}
          <button
            disabled={cart.length === 0}
            onClick={handleInitiateCheckout}
            className={`w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center space-x-2 transition-all ${
              cart.length === 0
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 shadow-xl shadow-amber-900/40 transform active:scale-98'
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
        />
      )}
    </div>
  );
};
