package com.moccoon.skincare.data.api;

import com.moccoon.skincare.data.models.*;
import java.util.List;
import java.util.Map;
import retrofit2.Call;
import retrofit2.http.*;

public interface ApiService {

    // --- XÁC THỰC (AUTH) ---
    @POST("auth/login")
    Call<ApiResponse<AuthData>> login(@Body Map<String, Object> body);

    @POST("auth/register")
    Call<ApiResponse<AuthData>> register(@Body Map<String, Object> body);

    @GET("auth/me")
    Call<ApiResponse<User>> getMe();

    // --- TRANG CHỦ & DANH MỤC ---
    @GET("home")
    Call<ApiResponse<HomeData>> getHomeData();

    @GET("categories")
    Call<ApiResponse<List<Category>>> getCategories();

    // --- SẢN PHẨM ---
    @GET("products")
    Call<ApiResponse<ProductListData>> getProducts(
            @Query("category_id") Integer categoryId,
            @Query("search") String search,
            @Query("is_featured") Boolean isFeatured
    );

    @GET("products/{identifier}")
    Call<ApiResponse<Product>> getProductDetail(@Path("identifier") String identifier);

    // --- GIỎ HÀNG ---
    @GET("cart")
    Call<ApiResponse<CartData>> getCart();

    @POST("cart/add")
    Call<ApiResponse<Void>> addToCart(@Body Map<String, Object> body);

    @PUT("cart/item/{itemId}")
    Call<ApiResponse<Void>> updateCartQuantity(@Path("itemId") int itemId, @Body Map<String, Object> body);

    @DELETE("cart/item/{itemId}")
    Call<ApiResponse<Void>> removeCartItem(@Path("itemId") int itemId);

    // --- ĐƠN HÀNG ---
    @POST("orders/checkout")
    Call<ApiResponse<Order>> checkout(@Body Map<String, Object> body);

    @GET("orders/my-orders")
    Call<ApiResponse<List<Order>>> getMyOrders();

    @GET("orders/{identifier}")
    Call<ApiResponse<Order>> getOrderDetail(@Path("identifier") String identifier);

    @PUT("orders/{id}/cancel")
    Call<ApiResponse<Void>> cancelOrder(@Path("id") int id);

    // --- TƯ VẤN CHAT 1:1 ---
    @GET("chat/conversation")
    Call<ApiResponse<ConversationData>> getConversation();

    @GET("chat/messages/{conversationId}")
    Call<ApiResponse<List<ChatMessage>>> getMessages(@Path("conversationId") int conversationId);

    @POST("chat/send")
    Call<ApiResponse<ChatMessage>> sendMessage(@Body Map<String, Object> body);

    // --- QUẢN TRỊ VIÊN (ADMIN) ---
    @GET("admin/dashboard")
    Call<ApiResponse<DashboardData>> getAdminDashboard();

    @GET("orders/admin/all")
    Call<ApiResponse<AdminOrdersData>> getAdminOrders();
}
