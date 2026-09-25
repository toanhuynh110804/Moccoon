package com.moccoon.skincare.data.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class CartData {
    @SerializedName("cart_id")
    private int cartId;

    @SerializedName("items")
    private List<CartItem> items;

    @SerializedName("total_quantity")
    private int totalQuantity;

    @SerializedName("total_amount")
    private double totalAmount;

    public int getCartId() { return cartId; }
    public List<CartItem> getItems() { return items; }
    public int getTotalQuantity() { return totalQuantity; }
    public double getTotalAmount() { return totalAmount; }

    public static class CartItem {
        @SerializedName("item_id")
        private int itemId;

        @SerializedName("product_id")
        private int productId;

        @SerializedName("product_name")
        private String productName;

        @SerializedName("product_slug")
        private String productSlug;

        @SerializedName("price")
        private double price;

        @SerializedName("original_price")
        private Double originalPrice;

        @SerializedName("product_image")
        private String productImage;

        @SerializedName("quantity")
        private int quantity;

        @SerializedName("item_total")
        private double itemTotal;

        public int getItemId() { return itemId; }
        public int getProductId() { return productId; }
        public String getProductName() { return productName; }
        public String getProductSlug() { return productSlug; }
        public double getPrice() { return price; }
        public Double getOriginalPrice() { return originalPrice; }
        public String getProductImage() { return productImage; }
        public int getQuantity() { return quantity; }
        public double getItemTotal() { return itemTotal; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
    }
}
