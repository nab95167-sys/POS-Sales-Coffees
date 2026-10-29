import React, { createContext, useContext, useState } from 'react';

export type Language = 'EN' | 'KH' | 'TH' | 'ZH';

export const translations = {
  EN: {
    appName: 'AURA COFFEE ENTERPRISE',
    appSub: 'MULTI-BRANCH POS & CAFE SUITE',
    posScreen: 'POS Register',
    kitchenKds: 'Kitchen KDS',
    tables: 'Tables',
    dashboard: 'Dashboard',
    products: 'Products',
    inventory: 'Inventory',
    customers: 'Customers',
    staff: 'Staff & Roles',
    reports: 'Reports',
    settings: 'Settings',
    currentOrder: 'Current Order',
    dineIn: 'DINE IN',
    takeAway: 'TAKE AWAY',
    delivery: 'DELIVERY',
    driveThrough: 'DRIVE THRU',
    items: 'Items',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'VAT Tax (10%)',
    totalPayable: 'Total Payable',
    payButton: 'Pay & Complete Order',
    holdQueue: 'Hold Queue',
    scanSku: 'Scan SKU',
    shiftRegister: 'Shift Drawer',
    aiForecast: 'AI Forecast',
    recipes: 'Recipes',
    searchPlaceholder: 'Search coffee, tea, bakery or scan SKU barcode...',
  },
  KH: {
    appName: 'អូរ៉ា កាហ្វេ អ៊ិនធើប្រាយ',
    appSub: 'ប្រព័ន្ធគ្រប់គ្រងការលក់សាខាច្រើន',
    posScreen: 'អេក្រង់លក់ (POS)',
    kitchenKds: 'ផ្ទះបាយ (KDS)',
    tables: 'តុអាហារ (Tables)',
    dashboard: 'ផ្ទាំងគ្រប់គ្រង (Dashboard)',
    products: 'ទំនិញ (Products)',
    inventory: 'ស្ដុកទំនិញ (Inventory)',
    customers: 'អតិថិជន (Customers)',
    staff: 'បុគ្គលិក (Staff)',
    reports: 'របាយការណ៍ (Reports)',
    settings: 'ការកំណត់ (Settings)',
    currentOrder: 'បញ្ជាទិញបច្ចុប្បន្ន',
    dineIn: 'ញ៉ាំនៅទីនេះ',
    takeAway: 'ខ្ចប់ទៅផ្ទះ',
    delivery: 'ដឹកជញ្ជូន',
    driveThrough: 'ទិញតាមឡាន',
    items: 'មុខ',
    subtotal: 'សរុបរង',
    discount: 'បញ្ចុះតម្លៃ',
    tax: 'ពន្ធអាករ (10%)',
    totalPayable: 'សរុបត្រូវទូទាត់',
    payButton: 'ទូទាត់ & បញ្ចប់ការទិញ',
    holdQueue: 'បញ្ជីរង់ចាំ',
    scanSku: 'ស្កែនបារកូដ',
    shiftRegister: 'កាត់វេនលុយ',
    aiForecast: 'ព្យាករណ៍ AI',
    recipes: 'រូបមន្ត',
    searchPlaceholder: 'ស្វែងរកភេសជ្ជៈ នំ ឬស្កែនបារកូដ...',
  },
  TH: {
    appName: 'ออร่า คอฟฟี่ เอ็นเตอร์ไพรส์',
    appSub: 'ระบบจัดการร้านกาแฟหลายสาขา',
    posScreen: 'เครื่องคิดเงิน (POS)',
    kitchenKds: 'จอห้องครัว (KDS)',
    tables: 'ผังโต๊ะ (Tables)',
    dashboard: 'แดชบอร์ด (Dashboard)',
    products: 'สินค้า (Products)',
    inventory: 'คลังสินค้า (Inventory)',
    customers: 'ลูกค้า (Customers)',
    staff: 'พนักงาน (Staff)',
    reports: 'รายงาน (Reports)',
    settings: 'ตั้งค่า (Settings)',
    currentOrder: 'รายการสั่งซื้อปัจจุบัน',
    dineIn: 'ทานที่ร้าน',
    takeAway: 'สั่งกลับบ้าน',
    delivery: 'เดลิเวอรี่',
    driveThrough: 'ไดร์ฟทรู',
    items: 'รายการ',
    subtotal: 'ยอดรวมย่อย',
    discount: 'ส่วนลด',
    tax: 'ภาษีมูลค่าเพิ่ม (10%)',
    totalPayable: 'ยอดชำระทั้งสิ้น',
    payButton: 'ชำระเงินและเสร็จสิ้น',
    holdQueue: 'พักบิล',
    scanSku: 'สแกนบาร์โค้ด',
    shiftRegister: 'รอบกะเงินสด',
    aiForecast: 'พยากรณ์ AI',
    recipes: 'สูตรเครื่องดื่ม',
    searchPlaceholder: 'ค้นหากาแฟ ขนม หรือสแกนบาร์โค้ด...',
  },
  ZH: {
    appName: '光环咖啡企业版',
    appSub: '多门店咖啡收银管理系统',
    posScreen: '收银点 (POS)',
    kitchenKds: '厨房显示 (KDS)',
    tables: '餐桌管理 (Tables)',
    dashboard: '控制台 (Dashboard)',
    products: '商品管理 (Products)',
    inventory: '库存管理 (Inventory)',
    customers: '客户会员 (Customers)',
    staff: '员工权限 (Staff)',
    reports: '财务报表 (Reports)',
    settings: '系统设置 (Settings)',
    currentOrder: '当前订单',
    dineIn: '堂食',
    takeAway: '外带',
    delivery: '外卖',
    driveThrough: '得来速',
    items: '项',
    subtotal: '小计',
    discount: '折扣',
    tax: '增值税 (10%)',
    totalPayable: '应付总额',
    payButton: '结账并完成',
    holdQueue: '挂单队列',
    scanSku: '扫条形码',
    shiftRegister: '班次交接',
    aiForecast: 'AI预测',
    recipes: '配方配比',
    searchPlaceholder: '搜索咖啡、甜点或扫描条形码...',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['EN']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('coffee_pos_lang') as Language) || 'EN';
  });

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('coffee_pos_lang', lang);
  };

  const t = (key: keyof typeof translations['EN']) => {
    return translations[language][key] || translations['EN'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
