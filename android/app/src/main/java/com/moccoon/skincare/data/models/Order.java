package com.moccoon.skincare.data.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;
import java.util.List;

public class Order implements Serializable {
    @SerializedName("id")
    private int id;

    @SerializedName("order_code")
    private String orderCode;

    @SerializedName("user_id")
    private int userId;

    @SerializedName("total_amount")
    private double totalAmount;

    @SerializedName("shipping_fee")
    private double shippingFee;

    @SerializedName("final_amount")
    private double finalAmount;

    @SerializedName("payment_method")
    private String paymentMethod;

    @SerializedName("payment_status")
    private String paymentStatus;

    @SerializedName("order_status")
    private String orderStatus;

    @SerializedName("receiver_name")
    private String receiverName;

    @SerializedName("receiver_phone")
    private String receiverPhone;

    @SerializedName("shipping_address")
    private String shippingAddress;

    @SerializedName("note")
    private String note;

    @SerializedName("created_at")
    private String createdAt;

    @SerializedName("items")
    private List<OrderItem> items;

    public int getId() { return id; }
    public String getOrderCode() { return orderCode; }
    public double getTotalAmount() { return totalAmount; }
    public double getShippingFee() { return shippingFee; }
    public double getFinalAmount() { return finalAmount; }
    public String getPaymentMethod() { return paymentMethod; }
    public String getPaymentStatus() { return paymentStatus; }
    public String getOrderStatus() { return orderStatus; }
    public String getReceiverName() { return receiverName; }
    public String getReceiverPhone() { return receiverPhone; }
    public String getShippingAddress() { return shippingAddress; }
    public String getNote() { return note; }
    public String getCreatedAt() { return createdAt; }
    public List<OrderItem> getItems() { return items; }

    public static class OrderItem implements Serializable {
        @SerializedName("id")
        private int id;

        @SerializedName("product_id")
        private int productId;

        @SerializedName("product_name")
        private String productName;

        @SerializedName("product_image")
        private String productImage;

        @SerializedName("price")
        private double price;

        @SerializedName("quantity")
        private int quantity;

        @SerializedName("total_price")
        private double totalPrice;

        public int getId() { return id; }
        public int getProductId() { return productId; }
        public String getProductName() { return productName; }
        public String getProductImage() { return productImage; }
        public double getPrice() { return price; }
        public int getQuantity() { return quantity; }
        public double getTotalPrice() { return totalPrice; }
    }
}
