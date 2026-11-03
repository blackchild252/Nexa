import { authedFetch } from './api';
import { idempotencyKey } from './nexaNetworkPolicy';

export type ProductVariant = { id: string; size?: string; colour?: string; stock: number };
export type Product = {
  id: string; name: string; description?: string | null; price: number; weightKg?: number | null; currency: string;
  regularPrice?: number; saleEndsAt?: string | null; stock: number; category: string;
  vendorName?: string; imageUrl?: string | null; imageUrls?: string[]; imageEmoji?: string; imageColor?: string;
  vendorId?: string; hasVariants?: boolean; variants?: ProductVariant[]; ratingAvg?: number | null; ratingCount?: number; vendorRatingAvg?: number | null; vendorRatingCount?: number; sellerBadge?: 'reviewed_seller' | null; soldCount?: number;
};
export type Storefront = { deals: Product[]; bestSellers: Product[]; topRated: Product[]; newArrivals: Product[] };
export type ProductReview = { id: string; rating: number; comment?: string | null; createdAt: string; updatedAt?: string; sellerReply?: string | null; sellerRepliedAt?: string | null; reviewerName?: string };
export type ProductReviewPage = { reviews: ProductReview[]; summary?: { ratingAvg: number | null; ratingCount: number }; hasMore: boolean; nextCursor: string | null };
export type CartLine = { product: Product; variant?: ProductVariant | null; quantity: number };
export type Order = {
  orderId: string; id?: string; total: number; currency: string; status: string;
  paymentStatus?: string; paymentMethod?: string; deliveryAddress?: string; createdAt?: string;
  items?: Array<{id:string;name:string;price:number;quantity:number;status:string;paid?:boolean;variantLabel?:string|null}>;
};
export type Vendor = { id: string; userId: string; shopName: string; bio: string | null; createdAt: string; businessType?: string; youtubeChannelUrl?: string | null; moderationStatus?: string };
export type VendorSummary = { revenue: number; orders: number; products: number; lowStock: number; currency: string };
export type VendorOrder = { orderId:string; createdAt:string; currency:string; buyerName?:string; buyerEmail?:string; deliveryAddress?:string; note?:string; subtotal:number; status:string; paid:boolean; items:Array<{id:string;name:string;price:number;quantity:number;status:string;paid:boolean;variantLabel?:string|null}> };

export type ShopSummary = { id: string; shopName: string; bio: string | null; productCount: number; fromPrice: number | null; ratingAvg: number | null; ratingCount: number; sellerBadge: 'reviewed_seller' | null };
export type ProductSearch = { vendorId?: string; q?: string; category?: string; minPrice?: number; maxPrice?: number; currency?: string; sort?: 'newest'|'price_asc'|'price_desc'; cursor?: string; limit?: number; onSale?: boolean; inStock?: boolean; minRating?: number; ids?: string[] };
export async function listProducts(q = '', category = '', options: Omit<ProductSearch, 'q'|'category'> = {}): Promise<{products:Product[];nextCursor:string|null}> {
  const params = new URLSearchParams(); if(q) params.set('q',q); if(category) params.set('category',category);
  if(options.minPrice !== undefined) params.set('minPrice',String(options.minPrice));
  if(options.maxPrice !== undefined) params.set('maxPrice',String(options.maxPrice));
  if(options.currency) params.set('currency', options.currency.toUpperCase());
  if(options.sort) params.set('sort',options.sort); if(options.cursor) params.set('cursor',options.cursor);
  if(options.vendorId) params.set('vendorId',options.vendorId);
  if(options.onSale) params.set('onSale','1'); if(options.inStock) params.set('inStock','1');
  if(options.minRating) params.set('minRating',String(options.minRating));
  if(options.ids?.length) params.set('ids',options.ids.join(','));
  params.set('limit',String(options.limit ?? 50));
  return authedFetch(`/api/mall/products?${params.toString()}`);
}
export async function getProduct(id:string): Promise<{product:Product}> { return authedFetch(`/api/mall/products/${encodeURIComponent(id)}`); }
export async function getStorefront(limit=12): Promise<Storefront> { return authedFetch(`/api/mall/storefront?limit=${encodeURIComponent(String(limit))}`); }
export async function listProductReviews(productId:string,cursor?:string,limit=20): Promise<ProductReviewPage> { const q=new URLSearchParams(); q.set('limit',String(limit)); if(cursor)q.set('cursor',cursor); return authedFetch(`/api/mall/reviews/product/${encodeURIComponent(productId)}?${q.toString()}`); }
export async function listShops(): Promise<{vendors:ShopSummary[]}> { return authedFetch('/api/mall/vendors'); }
export async function getMallConfig(){ return authedFetch('/api/mall/config'); }
export async function getMarketplaceDiscovery(limit=8){ return authedFetch(`/api/mall/discovery?limit=${encodeURIComponent(String(limit))}`); }
export async function previewMarketplaceFee(amount:number,currency:string){ return authedFetch(`/api/subscription/fee-preview?serviceCode=marketplace_service&amount=${encodeURIComponent(String(amount))}&currency=${encodeURIComponent(currency)}`); }
export async function checkout(items:CartLine[], deliveryAddress:string, note:string, paymentMethod:'pay_seller'|'online'|'aami', email?:string, feePreviewId?:string){
  const key = idempotencyKey('POST','/api/mall/checkout');
  return authedFetch('/api/mall/checkout',{method:'POST',headers:{'Idempotency-Key':key,'X-Nexa-Retry-Mutation':'1'},body:JSON.stringify({items:items.map(x=>({productId:x.product.id,...(x.variant?{variantId:x.variant.id}:{}),quantity:x.quantity})),deliveryAddress,note,paymentMethod,email,feePreviewId})});
}
export async function listOrders(cursor?:string,limit=30,status?:string){ const q=new URLSearchParams(); q.set('limit',String(limit)); if(cursor)q.set('cursor',cursor); if(status)q.set('status',status); return authedFetch(`/api/marketplace/orders?${q.toString()}`); }
export async function cancelOrder(id:string){ return authedFetch(`/api/mall/orders/${id}/cancel`,{method:'POST',body:'{}'}); }
export async function getVendor(){ return authedFetch('/api/mall/vendor/me'); }
export async function registerVendor(shopName:string,bio:string){ return authedFetch('/api/mall/vendor/register',{method:'POST',body:JSON.stringify({shopName,bio})}); }
export async function vendorSubscription(){ return authedFetch('/api/mall/vendor/subscription'); }
export async function startVendorEntryPayment(){ return authedFetch('/api/mall/vendor/subscription/entry/payment',{method:'POST',body:'{}'}); }
export async function renewVendorSubscription(){ return authedFetch('/api/mall/vendor/subscription/renew',{method:'POST',body:'{}'}); }
export async function verifyVendorSubscriptionPayment(reference:string){ return authedFetch('/api/mall/vendor/subscription/payment/verify',{method:'POST',body:JSON.stringify({reference})}); }
export async function vendorSubscriptionHistory(){ return authedFetch('/api/mall/vendor/subscription/history'); }
export async function getVendorDeliverySettings(){ return authedFetch('/api/mall/vendor/delivery-settings'); }
export async function updateVendorDeliverySettings(mode:'flat'|'per_item',amount:number,currency:string){ return authedFetch('/api/mall/vendor/delivery-settings',{method:'PUT',body:JSON.stringify({mode,amount,currency})}); }
export async function previewMarketplaceDelivery(items:CartLine[],deliveryAddress:string){ return authedFetch('/api/mall/delivery-estimate',{method:'POST',body:JSON.stringify({items:items.map(x=>({productId:x.product.id,...(x.variant?{variantId:x.variant.id}:{}),quantity:x.quantity})),deliveryAddress})}); }
export async function vendorProducts(){ return authedFetch('/api/mall/vendor/products'); }
export async function createProduct(body:any){ return authedFetch('/api/mall/vendor/products',{method:'POST',body:JSON.stringify(body)}); }
export async function updateProduct(id:string,body:any){ return authedFetch(`/api/mall/vendor/products/${id}`,{method:'PUT',body:JSON.stringify(body)}); }
export async function deleteProduct(id:string){ return authedFetch(`/api/mall/vendor/products/${id}`,{method:'DELETE'}); }
export async function addProductImage(id:string,image:string){ return authedFetch(`/api/mall/vendor/products/${id}/images`,{method:'POST',body:JSON.stringify({image})}); }
export async function removeProductImage(id:string,n:number){ return authedFetch(`/api/mall/vendor/products/${id}/images/${n}`,{method:'DELETE'}); }
export async function makeProductCover(id:string,n:number){ return authedFetch(`/api/mall/vendor/products/${id}/images/${n}/cover`,{method:'POST',body:'{}'}); }
export async function beautifyVendorProductImage(id:string,imageIndex:number,style:string){ return authedFetch(`/api/mall/vendor/products/${encodeURIComponent(id)}/images/beautify`,{method:'POST',body:JSON.stringify({imageIndex,style})}); }
export async function approveBeautifiedVendorProductImage(id:string,previewToken:string){ return authedFetch(`/api/mall/vendor/products/${encodeURIComponent(id)}/images/beautify/approve`,{method:'POST',body:JSON.stringify({previewToken})}); }
export async function vendorOrders(){ return authedFetch('/api/mall/vendor/orders'); }
export async function updateVendorOrder(id:string,status:string){ return authedFetch(`/api/mall/vendor/orders/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}); }
export async function markVendorPayment(id:string,paid:boolean){ return authedFetch(`/api/mall/vendor/orders/${id}/payment`,{method:'PATCH',body:JSON.stringify({paid})}); }
export async function vendorSummary(){ return authedFetch('/api/mall/vendor/summary'); }
export async function vendorYaayzAdverts(){ return authedFetch('/api/mall/vendor/yaayz/adverts'); }
export async function submitVendorYaayzAdvert(body:any){ return authedFetch('/api/mall/vendor/yaayz/adverts',{method:'POST',body:JSON.stringify(body)}); }
export const categories = ['electronics','phones & tablets','computers','fashion','jewelry & accessories','beauty','home & living','groceries','health & wellness','baby & kids','sports & fitness','automotive','books & media','services','other'];


// V3.48 buyer/seller interaction API
export type MarketplaceInquiry = { id:string; productId:string; buyerId:string; sellerId:string; status:'open'|'closed'; productName?:string; shopName?:string; createdAt:string; updatedAt:string };
export type MarketplaceInquiryMessage = { id:string; inquiryId:string; senderId:string; body:string; createdAt:string };
export async function favoriteListing(productId:string){ return authedFetch(`/api/marketplace/favorites/${encodeURIComponent(productId)}`,{method:'POST',body:'{}'}); }
export async function unfavoriteListing(productId:string){ return authedFetch(`/api/marketplace/favorites/${encodeURIComponent(productId)}`,{method:'DELETE'}); }
export async function listFavoriteListings(){ return authedFetch('/api/marketplace/favorites'); }
export async function startMarketplaceInquiry(productId:string,message:string,clientRequestId:string){ return authedFetch('/api/marketplace/inquiries',{method:'POST',body:JSON.stringify({productId,message,clientRequestId})}); }
export async function listMarketplaceInquiries():Promise<{inquiries:MarketplaceInquiry[]}>{ return authedFetch('/api/marketplace/inquiries'); }
export async function getMarketplaceInquiryMessages(id:string):Promise<{inquiry:MarketplaceInquiry;messages:MarketplaceInquiryMessage[]}>{ return authedFetch(`/api/marketplace/inquiries/${encodeURIComponent(id)}/messages`); }
export async function sendMarketplaceInquiryMessage(id:string,message:string){ return authedFetch(`/api/marketplace/inquiries/${encodeURIComponent(id)}/messages`,{method:'POST',body:JSON.stringify({message})}); }
export async function setMarketplaceInquiryStatus(id:string,status:'open'|'closed'){ return authedFetch(`/api/marketplace/inquiries/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({status})}); }
export async function reportMarketplaceTarget(targetType:'listing'|'inquiry_message'|'seller',targetId:string,reason:string,details=''){ return authedFetch('/api/marketplace/reports',{method:'POST',body:JSON.stringify({targetType,targetId,reason,details})}); }

// V3.50.3 payment history, refund and dispute workflows.
export async function paymentHistory(){ return authedFetch('/api/mall/payments/history'); }
export async function verifyMallPayment(reference:string){ return authedFetch('/api/mall/payments/verify',{method:'POST',body:JSON.stringify({reference})}); }
export async function requestOrderRefund(orderId:string,reason:string){ return authedFetch(`/api/mall/orders/${encodeURIComponent(orderId)}/refunds`,{method:'POST',body:JSON.stringify({reason})}); }
export async function openOrderDispute(orderId:string,reason:string,details=''){ return authedFetch(`/api/mall/orders/${encodeURIComponent(orderId)}/disputes`,{method:'POST',body:JSON.stringify({reason,details})}); }
export async function listOrderDisputes(orderId:string){ return authedFetch(`/api/mall/orders/${encodeURIComponent(orderId)}/disputes`); }

// V3.50.7 seller dispute inbox and response actions.
export async function vendorDisputes(){ return authedFetch('/api/mall/vendor/disputes'); }
export async function respondToVendorDispute(disputeId:string,response:string){ return authedFetch(`/api/mall/vendor/disputes/${encodeURIComponent(disputeId)}/respond`,{method:'POST',body:JSON.stringify({response})}); }
export async function confirmOrderDispute(orderId:string,disputeId:string){ return authedFetch(`/api/mall/orders/${encodeURIComponent(orderId)}/disputes/${encodeURIComponent(disputeId)}/confirm`,{method:'POST',body:JSON.stringify({})}); }

// V3.50.9 administrator dispute management. Server-side authorization is required.
export async function adminStatus(){ return authedFetch('/api/mall/admin/status'); }
export async function adminDisputes(status='all'){ return authedFetch(`/api/mall/admin/disputes?status=${encodeURIComponent(status)}`); }
export async function resolveAdminDispute(disputeId:string,resolution:string){ return authedFetch(`/api/mall/admin/disputes/${encodeURIComponent(disputeId)}/resolve`,{method:'POST',body:JSON.stringify({resolution})}); }

export async function subscriptionHub(){ return authedFetch('/api/account/subscriptions'); }
