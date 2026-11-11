import { Category } from '@/types/database'

type CategoryKeywords = {
  keywords: string[]
}

const CATEGORY_RULES: Record<string, CategoryKeywords> = {
  'Food & Dining': {
    keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'food', 'pizza', 'burger', 'biryani', 'hotel', 'dhaba', 'eat', 'meal', 'snack', 'tea', 'juice', 'grocery', 'vegetables', 'fruits', 'supermarket', 'kirana', 'blinkit', 'zepto', 'instamart', 'dominos', 'mcdonalds', 'kfc', 'starbucks'],
  },
  'Transport': {
    keywords: ['ola', 'uber', 'rapido', 'auto', 'rickshaw', 'metro', 'bus', 'train', 'flight', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'cab', 'taxi', 'irctc', 'redbus', 'indigo', 'spicejet', 'airindia'],
  },
  'Shopping': {
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'clothing', 'shoes', 'shirt', 'jeans', 'dress', 'accessories', 'watch', 'bag', 'purse', 'electronics', 'mobile', 'laptop', 'headphone', 'earphone', 'gadget', 'appliance'],
  },
  'Housing': {
    keywords: ['rent', 'maintenance', 'electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'property', 'apartment', 'house', 'cleaning', 'furniture', 'repair', 'plumber', 'electrician'],
  },
  'Entertainment': {
    keywords: ['netflix', 'amazon prime', 'hotstar', 'disney', 'spotify', 'youtube', 'movie', 'cinema', 'pvr', 'inox', 'gaming', 'game', 'ps5', 'xbox', 'concert', 'show', 'event', 'party', 'club', 'bar', 'pub'],
  },
  'Health': {
    keywords: ['pharmacy', 'medicine', 'doctor', 'hospital', 'clinic', 'gym', 'fitness', 'yoga', 'health', 'medical', 'diagnostic', 'lab', 'test', 'dentist', 'optical', 'spectacles', 'lens', '1mg', 'netmeds', 'practo'],
  },
  'Education': {
    keywords: ['course', 'udemy', 'coursera', 'book', 'study', 'tuition', 'coaching', 'school', 'college', 'university', 'exam', 'fee', 'stationary', 'pen', 'notebook', 'skillshare', 'pluralsight'],
  },
  'Travel': {
    keywords: ['hotel', 'resort', 'vacation', 'holiday', 'trip', 'tour', 'booking.com', 'oyo', 'makemytrip', 'yatra', 'goibibo', 'airbnb', 'visa', 'passport', 'travel'],
  },
  'Investments': {
    keywords: ['sip', 'mutual fund', 'stocks', 'shares', 'zerodha', 'groww', 'upstox', 'ppf', 'fd', 'fixed deposit', 'gold', 'crypto', 'nps', 'lic', 'insurance', 'policy'],
  },
  'Utilities': {
    keywords: ['phone', 'recharge', 'airtel', 'jio', 'vi', 'bsnl', 'subscription', 'annual', 'renewal', 'bill'],
  },
  'Gifts': {
    keywords: ['gift', 'donation', 'charity', 'ngo', 'birthday', 'anniversary', 'wedding', 'present'],
  },
}

export function categorizeExpense(description: string, categories: Category[]): Category | null {
  const lowerDesc = description.toLowerCase()

  for (const [categoryName, { keywords }] of Object.entries(CATEGORY_RULES)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        const matched = categories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase()
        )
        if (matched) return matched
      }
    }
  }

  return null
}
