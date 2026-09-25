package com.moccoon.skincare.data.models;

import com.google.gson.annotations.SerializedName;

public class DashboardData {
    @SerializedName("revenue")
    private Revenue revenue;

    @SerializedName("orders")
    private OrdersStats orders;

    @SerializedName("customers")
    private CustomersStats customers;

    public Revenue getRevenue() { return revenue; }
    public OrdersStats getOrders() { return orders; }
    public CustomersStats getCustomers() { return customers; }

    public static class Revenue {
        @SerializedName("revenue_today")
        private double revenueToday;

        @SerializedName("revenue_this_month")
        private double revenueThisMonth;

        @SerializedName("total_revenue")
        private double totalRevenue;

        public double getRevenueToday() { return revenueToday; }
        public double getRevenueThisMonth() { return revenueThisMonth; }
        public double getTotalRevenue() { return totalRevenue; }
    }

    public static class OrdersStats {
        @SerializedName("total_orders")
        private int totalOrders;

        @SerializedName("pending_orders")
        private int pendingOrders;

        public int getTotalOrders() { return totalOrders; }
        public int getPendingOrders() { return pendingOrders; }
    }

    public static class CustomersStats {
        @SerializedName("total_customers")
        private int totalCustomers;

        public int getTotalCustomers() { return totalCustomers; }
    }
}
