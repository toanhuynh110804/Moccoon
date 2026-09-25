package com.moccoon.skincare.data.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class AdminOrdersData {
    @SerializedName("orders")
    private List<Order> orders;

    @SerializedName("total")
    private int total;

    public List<Order> getOrders() {
        return orders;
    }

    public int getTotal() {
        return total;
    }
}
